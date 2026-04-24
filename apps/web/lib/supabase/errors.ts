/**
 * Supabase browser client errors: PostgREST wraps Postgres failures in objects
 * with `code`, `message`, `details`, `hint`. Some runtimes also chain `cause`.
 *
 * This module is transport-only: parse and classify errors, resolve copy from
 * declarative maps. Call sites (hooks) own toasts and domain-specific message tables.
 */

export const PostgresErrorCode = {
  UniqueViolation: '23505',
  ForeignKeyViolation: '23503',
  CheckViolation: '23514',
  NotNullViolation: '23502',
} as const;

export type PostgresErrorCodeValue =
  (typeof PostgresErrorCode)[keyof typeof PostgresErrorCode];

/** Normalized shape after walking `cause` (bounded depth). */
export interface ParsedSupabaseClientError {
  /** Postgres SQLSTATE when PostgREST surfaces a DB error (e.g. 23505). */
  postgresCode: string | undefined;
  /** PostgREST API / HTTP layer codes (e.g. PGRST116). */
  postgrestApiCode: string | undefined;
  message: string;
  details: string | undefined;
  hint: string | undefined;
}

function readString(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function readCode(o: Record<string, unknown>): string | undefined {
  if (!('code' in o) || o.code == null || o.code === '') return undefined;
  return String(o.code);
}

function isLikelyPostgresSqlState(code: string): boolean {
  return /^[0-9]{5}$/.test(code);
}

function isLikelyPostgrestApiCode(code: string): boolean {
  return code.startsWith('PGRST');
}

/**
 * Walks `cause` up to `maxDepth` and merges fields from each link. Prefer the
 * first Postgres SQLSTATE and first PostgREST API code encountered.
 */
/**
 * Converts PostgREST / Supabase client errors (and other `unknown` values) into
 * a plain {@link Error} whose `message` comes from {@link parseSupabaseClientError}.
 * Preserves the original value on `cause` for diagnostics and code helpers.
 */
export function normalizeError(error: unknown): Error {
  if (typeof error === 'string') {
    return new Error(error);
  }
  const parsed = parseSupabaseClientError(error);
  const normalized = new Error(parsed.message);
  normalized.cause = error;
  return normalized;
}

export function parseSupabaseClientError(
  error: unknown,
  maxDepth = 8
): ParsedSupabaseClientError {
  let postgresCode: string | undefined;
  let postgrestApiCode: string | undefined;
  let message = 'Something went wrong.';
  let details: string | undefined;
  let hint: string | undefined;

  let current: unknown = error;
  const seen = new Set<unknown>();

  for (let depth = 0; depth < maxDepth && current != null; depth += 1) {
    if (typeof current !== 'object') break;
    if (seen.has(current)) break;
    seen.add(current);

    const o = current as Record<string, unknown>;
    const m = readString(o, 'message');
    if (m) message = m;
    details = details ?? readString(o, 'details');
    hint = hint ?? readString(o, 'hint');

    const code = readCode(o);
    if (code) {
      if (isLikelyPostgresSqlState(code)) {
        postgresCode = postgresCode ?? code;
      } else if (isLikelyPostgrestApiCode(code)) {
        postgrestApiCode = postgrestApiCode ?? code;
      }
    }

    current =
      'cause' in o && o.cause !== undefined && o.cause !== o
        ? o.cause
        : undefined;
  }

  return {
    postgresCode,
    postgrestApiCode,
    message,
    details,
    hint,
  };
}

export function getPostgresErrorCode(error: unknown): string | undefined {
  return parseSupabaseClientError(error).postgresCode;
}

export function isPostgresError(
  error: unknown,
  code: PostgresErrorCodeValue | string
): boolean {
  return getPostgresErrorCode(error) === code;
}

/**
 * Maps for user-visible strings. Keys must match `parseSupabaseClientError` outputs
 * (`postgresCode` / `postgrestApiCode`). First match wins: postgres, then postgrest.
 */
export type SupabaseErrorMessageMap = {
  postgres?: Readonly<Partial<Record<string, string>>>;
  postgrest?: Readonly<Partial<Record<string, string>>>;
};

/**
 * Returns a mapped user message when the error matches a known code; otherwise `fallback`.
 * Never leaks raw `message` for unknown errors (avoid exposing internal DB text).
 */
export function resolveSupabaseUserMessage(
  error: unknown,
  map: SupabaseErrorMessageMap,
  fallback: string
): string {
  const parsed = parseSupabaseClientError(error);
  const fromPostgres =
    parsed.postgresCode && map.postgres?.[parsed.postgresCode];
  if (fromPostgres) return fromPostgres;
  const fromPostgrest =
    parsed.postgrestApiCode && map.postgrest?.[parsed.postgrestApiCode];
  if (fromPostgrest) return fromPostgrest;
  return fallback;
}
