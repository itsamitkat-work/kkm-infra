import type {
  AccessTokenClaims,
  ComposedAccessTokenContext,
} from '@/types/jwt-claims';

function base64UrlToJson(payloadSegment: string): unknown {
  const pad = '=='.slice(0, (4 - (payloadSegment.length % 4)) % 4);
  const b64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return JSON.parse(atob(b64));
}

export function decodeAccessToken(accessToken: string): AccessTokenClaims | null {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return null;
    return base64UrlToJson(segment) as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function composeAccessTokenContext(
  accessToken: string | null | undefined,
): ComposedAccessTokenContext {
  if (!accessToken) {
    return { claims: null, permissions: [], roles: [] };
  }
  const claims = decodeAccessToken(accessToken);
  if (!claims) {
    return { claims: null, permissions: [], roles: [] };
  }
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  const permissions = Array.isArray(claims.permissions)
    ? claims.permissions
    : [];
  return { claims, permissions, roles };
}
