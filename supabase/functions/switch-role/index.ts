/**
 * Edge Function: switch-role
 *
 * Switches the user's active role within their current tenant.
 * The role must be one that is already assigned to the user's
 * tenant membership. Updates tenant_members.active_role_id, then
 * optionally refreshes the token so claims reflect the new role.
 *
 * Security:
 *   - Requires a valid Bearer token (via requireUserContext)
 *   - Requires an active tenant set on the session
 *   - The role must be assigned to the user (enforced by DB RPC)
 *   - Rate-limited: 30 req/min per user+tenant
 *
 * POST body:
 *   { role_slug, refresh_token? }
 *
 * Returns:
 *   { active_role, session_refresh_required, session? }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  HttpError,
  applyRateLimit,
  getCurrentTenantId,
  handleError,
  handleOptions,
  jsonResponse,
  maybeRefreshSession,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

interface SwitchRoleBody {
  role_slug?: string;
  refresh_token?: string;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const context = await requireUserContext(req);
    const body = await requireJsonBody<SwitchRoleBody>(req);
    const roleSlug = body.role_slug;
    const refreshToken = body.refresh_token ?? null;
    const tenantId = getCurrentTenantId(context.claims);

    if (!tenantId) {
      throw new HttpError(400, "No active tenant is set on the session");
    }

    if (!roleSlug) {
      throw new HttpError(400, "role_slug is required");
    }

    const rateLimit = await applyRateLimit(
      `switch-role:${context.user.id}:${tenantId}`,
      30,
      60,
      "strict",
    );
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded", retry_after: rateLimit.retryAfter },
        429,
      );
    }

    const { error } = await context.serviceClient.rpc("switch_active_role", {
      p_user_id: context.user.id,
      p_tenant_id: tenantId,
      p_role_slug: roleSlug,
    });

    if (error) {
      throw new HttpError(403, error.message);
    }

    const refreshedSession = await maybeRefreshSession(refreshToken);

    return jsonResponse({
      active_role: roleSlug,
      session_refresh_required: !refreshedSession,
      session: refreshedSession,
    });
  } catch (error) {
    return handleError(error);
  }
});
