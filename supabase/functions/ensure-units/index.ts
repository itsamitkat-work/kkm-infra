/**
 * Edge Function: ensure-units
 *
 * Inserts or updates public.units from manifest-driven seed. Idempotent by symbol:
 * existing row (same symbol) is updated; otherwise inserted (optional stable id).
 *
 * Auth: service role JWT or system-admin user JWT (same as ingest-schedule).
 *
 * POST body:
 *   { units: [{ name, display_name, symbol, dimension, is_base, conversion_factor, id? }] }
 *
 * Returns: { count: number }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  createServiceClient,
  handleError,
  handleOptions,
  HttpError,
  jsonResponse,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface UnitInput {
  name: string;
  display_name: string;
  symbol: string;
  dimension: string;
  is_base: boolean;
  conversion_factor: number;
  id?: string;
}

interface EnsureUnitsBody {
  units?: UnitInput[];
}

async function upsertUnit(
  svc: SupabaseClient,
  input: UnitInput,
): Promise<void> {
  const { data: existing, error: selErr } = await svc
    .from("units")
    .select("id")
    .eq("symbol", input.symbol)
    .maybeSingle();

  if (selErr) throw selErr;

  const payload = {
    name: input.name,
    display_name: input.display_name,
    symbol: input.symbol,
    dimension: input.dimension,
    is_base: input.is_base,
    conversion_factor: input.conversion_factor,
  };

  if (existing) {
    const { error: updErr } = await svc
      .from("units")
      .update(payload)
      .eq("id", existing.id);
    if (updErr) throw updErr;
    return;
  }

  const insertRow: Record<string, unknown> = { ...payload };
  if (input.id) insertRow.id = input.id;

  const { error: insErr } = await svc.from("units").insert(insertRow);
  if (insErr) throw insErr;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let svc: SupabaseClient;

    if (token === supabaseServiceRoleKey) {
      svc = createServiceClient();
    } else {
      const context = await requireUserContext(req);
      if (!context.claims.is_system_admin) {
        throw new HttpError(403, "System admin access required");
      }
      svc = context.serviceClient;
    }

    const body = await requireJsonBody<EnsureUnitsBody>(req);
    const units = body.units;

    if (!Array.isArray(units)) {
      throw new HttpError(400, "units must be an array");
    }

    for (const u of units) {
      if (
        !u.name ||
        !u.display_name ||
        !u.symbol ||
        !u.dimension ||
        typeof u.is_base !== "boolean" ||
        u.conversion_factor === undefined ||
        u.conversion_factor === null
      ) {
        throw new HttpError(
          400,
          "each unit requires name, display_name, symbol, dimension, is_base, conversion_factor",
        );
      }
      await upsertUnit(svc, u);
    }

    return jsonResponse({ count: units.length }, 200, req);
  } catch (error) {
    return handleError(error);
  }
});
