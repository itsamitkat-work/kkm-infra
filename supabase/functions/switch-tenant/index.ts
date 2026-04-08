/**
 * Edge Function: switch-tenant
 *
 * Switches the user's active tenant context. Updates the session's
 * tenant_id in private.auth_sessions, then optionally refreshes the
 * Supabase Auth token so the new tenant claims take effect immediately.
 *
 * Security:
 *   - Requires a valid Bearer token (via requireUserContext)
 *   - Verifies the user has an active membership in the target tenant
 *   - Rate-limited: 20 req/min per user+IP
 *
 * POST body:
 *   { tenant_id, refresh_token? }
 *
 * Returns:
 *   { tenant_id, session_refresh_required, session? }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  HttpError,
  applyRateLimit,
  getCurrentSessionId,
  handleError,
  handleOptions,
  jsonResponse,
  maybeRefreshSession,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

interface SwitchTenantBody {
  tenant_id?: string;
  refresh_token?: string;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const context = await requireUserContext(req);
    const body = await requireJsonBody<SwitchTenantBody>(req);
    const tenantId = body.tenant_id;
    const refreshToken = body.refresh_token ?? null;
    const sessionId = getCurrentSessionId(context.claims);

    if (!tenantId) {
      throw new HttpError(400, "tenant_id is required");
    }

    if (!sessionId) {
      throw new HttpError(400, "Session id claim is missing");
    }

    const rateLimit = await applyRateLimit(
      `switch-tenant:${context.user.id}:${context.ipAddress ?? "unknown"}`,
      20,
      60,
      "strict",
    );
    if (!rateLimit.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded", retry_after: rateLimit.retryAfter },
        429,
      );
    }

    // Verify active membership in the target tenant
    const { data: membership, error: membershipError } = await context.serviceClient
      .from("tenant_members")
      .select("id, tenant_id, status")
      .eq("tenant_id", tenantId)
      .eq("user_id", context.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      throw new HttpError(403, "You are not an active member of that tenant");
    }

    // Update the session's tenant association
    const { error: touchError } = await context.serviceClient.rpc(
      "touch_auth_session_service",
      {
        p_session_id: sessionId,
        p_tenant_id: tenantId,
      },
    );

    if (touchError) {
      throw touchError;
    }

    // Optionally refresh the token so claims reflect the new tenant
    const refreshedSession = await maybeRefreshSession(refreshToken);

    return jsonResponse({
      tenant_id: tenantId,
      session_refresh_required: !refreshedSession,
      session: refreshedSession,
    });
  } catch (error) {
    return handleError(error);
  }
});
