/**
 * Edge Function: bind-session
 *
 * Binds (or rebinds) a Supabase Auth session to the application's
 * private.auth_sessions table. This links the JWT session_id to a
 * tenant, stores the hashed refresh token, and records device metadata.
 *
 * Called by the client immediately after sign-in or token refresh.
 *
 * Security:
 *   - Requires a valid Bearer token (via requireUserContext)
 *   - Validates tenant membership before binding
 *   - Revoked sessions cannot be rebound (enforced at DB level)
 *   - Rate-limited: 30 req/min per user
 *
 * POST body:
 *   { refresh_token, expires_at, tenant_id?, device_fingerprint? }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  HttpError,
  applyRateLimit,
  getCurrentSessionId,
  getCurrentTenantId,
  handleError,
  handleOptions,
  hashValue,
  jsonResponse,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

interface BindSessionBody {
  refresh_token?: string;
  expires_at?: string;
  tenant_id?: string | null;
  device_fingerprint?: string | null;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const context = await requireUserContext(req);
    const body = await requireJsonBody<BindSessionBody>(req);
    const sessionId = getCurrentSessionId(context.claims);

    if (!sessionId) {
      throw new HttpError(400, "Session id claim is missing");
    }

    if (!body.refresh_token || !body.expires_at) {
      throw new HttpError(400, "refresh_token and expires_at are required");
    }

    const rateLimit = await applyRateLimit(
      `bind-session:${context.user.id}`,
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

    // Use the explicitly provided tenant_id or fall back to the JWT claim
    const targetTenantId = body.tenant_id ?? getCurrentTenantId(context.claims);

    // Verify the user is an active member of the target tenant
    if (targetTenantId) {
      const { data: membership, error: membershipError } = await context.serviceClient
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", targetTenantId)
        .eq("user_id", context.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new HttpError(403, "You are not an active member of that tenant");
      }
    }

    const refreshTokenHash = await hashValue(body.refresh_token);
    const { data, error } = await context.serviceClient.rpc(
      "bind_auth_session_service",
      {
        p_session_id: sessionId,
        p_user_id: context.user.id,
        p_tenant_id: targetTenantId,
        p_refresh_token_hash: refreshTokenHash,
        p_expires_at: body.expires_at,
        p_ip_address: context.ipAddress,
        p_user_agent: context.userAgent,
        p_device_fingerprint: body.device_fingerprint ?? null,
      },
    );

    if (error) throw error;

    return jsonResponse({ session: data });
  } catch (error) {
    return handleError(error);
  }
});
