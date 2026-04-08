/**
 * Edge Function: add-member
 *
 * Adds a user to the caller's active tenant with specified roles.
 * If the user doesn't exist in Supabase Auth, creates a new account
 * (requires a password). Upserts the user's profile and syncs
 * tenant membership roles via the sync_tenant_member_roles RPC.
 *
 * Security:
 *   - Requires a valid Bearer token (via requireUserContext)
 *   - Requires `members.manage` permission in the active tenant
 *   - Only system admins can assign the `tenant_admin` role
 *   - Rate-limited: 20 req/min per tenant
 *
 * POST body:
 *   { email, password?, display_name?, avatar_url?, role_slugs, active_role_slug? }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  HttpError,
  applyRateLimit,
  findUserByEmail,
  getCurrentTenantId,
  handleError,
  handleOptions,
  jsonResponse,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

interface AddMemberBody {
  email?: string;
  password?: string;
  display_name?: string;
  avatar_url?: string;
  role_slugs?: string[];
  active_role_slug?: string;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const context = await requireUserContext(req);
    const body = await requireJsonBody<AddMemberBody>(req);
    const tenantId = getCurrentTenantId(context.claims);
    const requestedRoles = body.role_slugs ?? [];

    if (!tenantId) {
      throw new HttpError(400, "No active tenant in session");
    }

    if (!body.email || requestedRoles.length === 0) {
      throw new HttpError(400, "email and role_slugs are required");
    }

    // Permission check via DB (single source of truth — no JWT perms)
    const { data: hasPerm } = await context.serviceClient.rpc(
      "check_user_permission",
      { p_user_id: context.user.id, p_tenant_id: tenantId, p_permission_key: "members.manage" },
    );
    if (hasPerm !== true && context.claims.is_system_admin !== true) {
      throw new HttpError(403, "Missing members.manage permission");
    }

    const rateLimit = await applyRateLimit(
      `add-member:${tenantId}`,
      20,
      60,
      "moderate",
    );
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded", retry_after: rateLimit.retryAfter },
        429,
      );
    }

    if (
      requestedRoles.includes("tenant_admin") &&
      context.claims.is_system_admin !== true
    ) {
      throw new HttpError(
        403,
        "Only system admins can assign the tenant_admin role",
      );
    }

    // Find or create the user in Supabase Auth
    let user = await findUserByEmail(context.serviceClient, body.email);
    if (!user) {
      if (!body.password) {
        throw new HttpError(400, "password is required for new users");
      }

      const { data, error } = await context.serviceClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          display_name: body.display_name ?? body.email,
        },
      });

      if (error || !data.user) {
        throw error ?? new HttpError(500, "Failed to create user");
      }

      user = data.user;
    }

    // Upsert the user's profile
    const { error: profileError } = await context.serviceClient
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: body.display_name ?? user.email,
        avatar_url: body.avatar_url ?? null,
      });

    if (profileError) throw profileError;

    // Sync tenant membership and assign roles
    const { error: roleSyncError } = await context.serviceClient.rpc(
      "sync_tenant_member_roles",
      {
        p_tenant_id: tenantId,
        p_user_id: user.id,
        p_role_slugs: requestedRoles,
        p_active_role_slug: body.active_role_slug ?? requestedRoles[0],
        p_display_name: body.display_name ?? user.email,
        p_avatar_url: body.avatar_url ?? null,
      },
    );

    if (roleSyncError) throw roleSyncError;

    return jsonResponse({
      tenant_id: tenantId,
      user_id: user.id,
      email: user.email,
      role_slugs: requestedRoles,
      active_role_slug: body.active_role_slug ?? requestedRoles[0],
    });
  } catch (error) {
    return handleError(error);
  }
});
