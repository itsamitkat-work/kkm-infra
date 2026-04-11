/**
 * Edge Function: ensure-schedule-sources
 *
 * Creates or updates schedule_sources + schedule_source_versions from manifest-driven seed.
 * Idempotent by (source.name) and (version.schedule_source_id, version.name).
 *
 * Auth: service role JWT or system-admin user JWT (same as ingest-schedule).
 *
 * POST body:
 *   {
 *     schedule_source: { name, display_name, type, id? },
 *     schedule_source_version: { name, display_name, year?, region?, metadata?, id?, sort_order? } — sort_order is float64 (fractional values OK for reorder gaps)
 *   }
 *
 * Returns: { schedule_source_id, schedule_source_version_id }
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

interface ScheduleSourceInput {
  name: string;
  display_name: string;
  type: "govt" | "private";
  id?: string;
}

interface ScheduleSourceVersionInput {
  name: string;
  display_name: string;
  year?: number | null;
  region?: string | null;
  metadata?: Record<string, unknown> | null;
  id?: string;
  sort_order?: number | null;
}

interface EnsureBody {
  schedule_source?: ScheduleSourceInput;
  schedule_source_version?: ScheduleSourceVersionInput;
}

async function upsertScheduleSource(
  svc: SupabaseClient,
  input: ScheduleSourceInput,
): Promise<string> {
  const { data: existing, error: selErr } = await svc
    .from("schedule_sources")
    .select("id")
    .eq("name", input.name)
    .maybeSingle();

  if (selErr) throw selErr;

  if (existing) {
    const { error: updErr } = await svc
      .from("schedule_sources")
      .update({
        display_name: input.display_name,
        type: input.type,
      })
      .eq("id", existing.id);

    if (updErr) throw updErr;
    return existing.id;
  }

  const insertRow: Record<string, unknown> = {
    name: input.name,
    display_name: input.display_name,
    type: input.type,
    status: "active",
  };
  if (input.id) insertRow.id = input.id;

  const { data: inserted, error: insErr } = await svc
    .from("schedule_sources")
    .insert(insertRow)
    .select("id")
    .single();

  if (insErr) throw insErr;
  return inserted.id as string;
}

async function upsertScheduleSourceVersion(
  svc: SupabaseClient,
  scheduleSourceId: string,
  input: ScheduleSourceVersionInput,
): Promise<string> {
  const { data: existing, error: selErr } = await svc
    .from("schedule_source_versions")
    .select("id")
    .eq("schedule_source_id", scheduleSourceId)
    .eq("name", input.name)
    .maybeSingle();

  if (selErr) throw selErr;

  if (existing) {
    const { error: updErr } = await svc
      .from("schedule_source_versions")
      .update({
        display_name: input.display_name,
        year: input.year ?? null,
        region: input.region ?? null,
        metadata: input.metadata ?? null,
        sort_order: input.sort_order ?? null,
      })
      .eq("id", existing.id);

    if (updErr) throw updErr;
    return existing.id;
  }

  const insertRow: Record<string, unknown> = {
    schedule_source_id: scheduleSourceId,
    name: input.name,
    display_name: input.display_name,
    year: input.year ?? null,
    region: input.region ?? null,
    metadata: input.metadata ?? null,
    sort_order: input.sort_order ?? null,
    status: "active",
  };
  if (input.id) insertRow.id = input.id;

  const { data: inserted, error: insErr } = await svc
    .from("schedule_source_versions")
    .insert(insertRow)
    .select("id")
    .single();

  if (insErr) throw insErr;
  return inserted.id as string;
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

    const body = await requireJsonBody<EnsureBody>(req);
    const src = body.schedule_source;
    const ver = body.schedule_source_version;

    if (!src?.name || !src.display_name || !src.type) {
      throw new HttpError(
        400,
        "schedule_source requires name, display_name, and type",
      );
    }
    if (!ver?.name || !ver.display_name) {
      throw new HttpError(
        400,
        "schedule_source_version requires name and display_name",
      );
    }

    const scheduleSourceId = await upsertScheduleSource(svc, src);
    const scheduleSourceVersionId = await upsertScheduleSourceVersion(
      svc,
      scheduleSourceId,
      ver,
    );

    return jsonResponse(
      {
        schedule_source_id: scheduleSourceId,
        schedule_source_version_id: scheduleSourceVersionId,
      },
      200,
      req,
    );
  } catch (error) {
    return handleError(error);
  }
});
