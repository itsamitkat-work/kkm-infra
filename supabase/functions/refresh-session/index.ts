/**
 * Edge Function: refresh-session
 *
 * Validates a refresh token rotation and updates the session's
 * stored token hash. If the incoming token hash doesn't match,
 * all of the user's sessions are revoked (refresh token reuse
 * detection) and a risk event is recorded.
 *
 * Security:
 *   - Requires a valid Bearer token (via requireUserContext)
 *   - Detects refresh token replay attacks at the DB level
 *   - Rate-limited: 30 req/min per user
 *
 * POST body:
 *   { current_refresh_token, next_refresh_token }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  HttpError,
  applyRateLimit,
  getCurrentSessionId,
  handleError,
  handleOptions,
  hashValue,
  jsonResponse,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

interface RefreshSessionBody {
  current_refresh_token?: string;
  next_refresh_token?: string;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const context = await requireUserContext(req);
    const body = await requireJsonBody<RefreshSessionBody>(req);
    const sessionId = getCurrentSessionId(context.claims);

    if (!sessionId) {
      throw new HttpError(400, "Session id claim is missing");
    }

    if (!body.current_refresh_token || !body.next_refresh_token) {
      throw new HttpError(
        400,
        "current_refresh_token and next_refresh_token are required",
      );
    }

    const rateLimit = await applyRateLimit(
      `refresh-session:${context.user.id}`,
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

    const { data, error } = await context.serviceClient.rpc(
      "handle_token_refresh_service",
      {
        p_session_id: sessionId,
        p_incoming_token_hash: await hashValue(body.current_refresh_token),
        p_new_token_hash: await hashValue(body.next_refresh_token),
      },
    );

    if (error) throw error;
    if (data !== true) {
      throw new HttpError(401, "Refresh token replay detected");
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
});
