/**
 * Edge Function: assign-tenant-admin
 *
 * Assigns a user as tenant_admin for a specific tenant.
 * System-admin-only endpoint. If the user doesn't exist in
 * Supabase Auth, creates a new account (requires a password).
 *
 * Security:
 *   - Requires a valid Bearer token (via requireUserContext)
 *   - Restricted to system admins (is_system_admin claim)
 *   - Rate-limited: 10 req/min per user
 *
 * POST body:
 *   { tenant_id, email, password?, display_name?, avatar_url? }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  HttpError,
  applyRateLimit,
  findUserByEmail,
  handleError,
  handleOptions,
  jsonResponse,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

interface AssignTenantAdminBody {
  tenant_id?: string;
  email?: string;
  password?: string;
  display_name?: string;
  avatar_url?: string;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const context = await requireUserContext(req);
    const body = await requireJsonBody<AssignTenantAdminBody>(req);

    if (context.claims.is_system_admin !== true) {
      throw new HttpError(403, "Only system admins can assign tenant admins");
    }

    if (!body.tenant_id || !body.email) {
      throw new HttpError(400, "tenant_id and email are required");
    }

    const rateLimit = await applyRateLimit(
      `assign-tenant-admin:${context.user.id}`,
      10,
      60,
      "moderate",
    );
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded", retry_after: rateLimit.retryAfter },
        429,
      );
    }

    // Verify the tenant exists
    const { data: tenant, error: tenantError } = await context.serviceClient
      .from("tenants")
      .select("id")
      .eq("id", body.tenant_id)
      .maybeSingle();

    if (tenantError) throw tenantError;
    if (!tenant) throw new HttpError(404, "Tenant not found");

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

    // Assign the tenant_admin role
    const { error: membershipError } = await context.serviceClient.rpc(
      "sync_tenant_member_roles",
      {
        p_tenant_id: body.tenant_id,
        p_user_id: user.id,
        p_role_slugs: ["tenant_admin"],
        p_active_role_slug: "tenant_admin",
        p_display_name: body.display_name ?? user.email,
        p_avatar_url: body.avatar_url ?? null,
      },
    );

    if (membershipError) throw membershipError;

    return jsonResponse({
      tenant_id: body.tenant_id,
      user_id: user.id,
      email: user.email,
      assigned_role: "tenant_admin",
    });
  } catch (error) {
    return handleError(error);
  }
});
