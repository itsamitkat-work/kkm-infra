'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';

import type { Database } from '@kkm/db';

/** Thrown after a 429 rate-limit toast so callers can skip duplicate error toasts. */
export class EdgeFunctionRateLimitedError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super('Rate limit exceeded');
    this.name = 'EdgeFunctionRateLimitedError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isEdgeFunctionRateLimitedError(
  error: unknown,
): error is EdgeFunctionRateLimitedError {
  return error instanceof EdgeFunctionRateLimitedError;
}

type InvokeOptions = NonNullable<
  Parameters<SupabaseClient<Database>['functions']['invoke']>[1]
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRetryAfterSeconds(body: unknown): number | null {
  if (!isRecord(body)) {
    return null;
  }
  const raw = body['retry_after'];
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

export function toastEdgeFunctionRateLimited(
  retryAfterSeconds: number | null,
): void {
  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    toast.error(
      `Rate limit exceeded (429). Try again in ${retryAfterSeconds}s.`,
    );
    return;
  }
  toast.error('Rate limit exceeded (429). Please try again shortly.');
}

async function readJsonBodyFromResponse(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

/**
 * Wraps {@link SupabaseClient.functions.invoke}: on HTTP 429 from the Edge
 * runtime, shows a toast (including `retry_after` when present) and returns
 * {@link EdgeFunctionRateLimitedError} so call sites avoid a second generic toast.
 */
export async function invokeEdgeFunction<Data = unknown>(
  supabase: SupabaseClient<Database>,
  functionName: string,
  options?: InvokeOptions,
): Promise<Awaited<ReturnType<SupabaseClient<Database>['functions']['invoke']>>> {
  const result = await supabase.functions.invoke<Data>(functionName, options);

  if (!(result.error instanceof FunctionsHttpError)) {
    return result;
  }

  const response = result.error.context;
  if (!(response instanceof Response) || response.status !== 429) {
    return result;
  }

  const body = await readJsonBodyFromResponse(response);
  const retryAfter = parseRetryAfterSeconds(body);
  toastEdgeFunctionRateLimited(retryAfter);

  return {
    ...result,
    data: null,
    error: new EdgeFunctionRateLimitedError(retryAfter),
  } as Awaited<ReturnType<SupabaseClient<Database>['functions']['invoke']>>;
}
