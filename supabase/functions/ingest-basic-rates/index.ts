/**
 * Edge Function: ingest-basic-rates
 *
 * Ingests basic rates JSON into normalized tables:
 *   - public.basic_rate_types (distinct "type")
 *   - public.basic_rates (rows scoped by schedule_source_version_id)
 *
 * Auth: service role JWT or system-admin user JWT.
 *
 * POST body:
 *   {
 *     schedule_source_version_id: uuid,
 *     data: [{ code, description, unit, rate, type, attributes?: [{ type, note }] }]
 *   }
 *
 * Returns:
 *   {
 *     schedule_source_version_id,
 *     inserted_count,
 *     updated_count,
 *     annotations_inserted,
 *     processed_count,
 *     invalid_rows
 *   }
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

type ScheduleAnnotationType = "note" | "remark" | "condition" | "reference";

interface BasicRateAttributeInput {
  type?: string;
  note?: string;
}

interface BasicRateInput {
  code?: string;
  description?: string;
  unit?: string;
  rate?: number | string;
  type?: string;
  attributes?: BasicRateAttributeInput[];
}

interface IngestBasicRatesBody {
  schedule_source_version_id?: string;
  data?: BasicRateInput[];
}

interface NormalizedBasicRateRow {
  code: string;
  description: string;
  unit: string;
  rate: number;
  type: string;
  attributes: Array<{
    annotationType: ScheduleAnnotationType;
    rawText: string;
    orderIndex: number;
  }>;
}

interface InvalidRow {
  index: number;
  reason: string;
}

const REST_IN_CHUNK_SIZE = 50;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function resolveAnnotationType(value: string | undefined): ScheduleAnnotationType {
  const v = value?.trim().toLowerCase();
  if (v === "remark" || v === "condition" || v === "reference" || v === "note") {
    return v;
  }
  return "note";
}

function normalizeAttributes(
  row: BasicRateInput,
): NormalizedBasicRateRow["attributes"] {
  const attrs = row.attributes;
  if (!Array.isArray(attrs) || attrs.length === 0) return [];

  const out: NormalizedBasicRateRow["attributes"] = [];
  for (let i = 0; i < attrs.length; i += 1) {
    const a = attrs[i];
    const rawText = typeof a.note === "string" ? a.note.trim() : "";
    if (!rawText) continue;
    out.push({
      annotationType: resolveAnnotationType(a.type),
      rawText,
      orderIndex: i,
    });
  }
  return out;
}

function normalizeRow(row: BasicRateInput, index: number): {
  normalized: NormalizedBasicRateRow | null;
  invalid: InvalidRow | null;
} {
  const code = row.code?.trim() ?? "";
  const description = row.description?.trim() ?? "";
  const unit = row.unit?.trim() ?? "";
  const type = row.type?.trim() ?? "";
  const numericRate = typeof row.rate === "string" ? Number(row.rate) : row.rate;

  if (!code) return { normalized: null, invalid: { index, reason: "missing code" } };
  if (!description) {
    return { normalized: null, invalid: { index, reason: `missing description for code ${code}` } };
  }
  if (!unit) return { normalized: null, invalid: { index, reason: `missing unit for code ${code}` } };
  if (!type) return { normalized: null, invalid: { index, reason: `missing type for code ${code}` } };
  if (numericRate === undefined || numericRate === null || Number.isNaN(numericRate)) {
    return { normalized: null, invalid: { index, reason: `invalid rate for code ${code}` } };
  }

  return {
    normalized: {
      code,
      description,
      unit,
      rate: Number(numericRate),
      type,
      attributes: normalizeAttributes(row),
    },
    invalid: null,
  };
}

async function loadTypeMap(svc: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await svc.from("basic_rate_types").select("id, name");
  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.name, row.id);
  }
  return map;
}

async function ensureTypeIds(
  svc: SupabaseClient,
  typeNames: string[],
): Promise<Map<string, string>> {
  if (typeNames.length === 0) return new Map();

  const existingTypeMap = await loadTypeMap(svc);
  const missingTypeNames = typeNames.filter((name) => !existingTypeMap.has(name));

  if (missingTypeNames.length > 0) {
    const rows = missingTypeNames.map((name) => ({ name }));
    const { error } = await svc
      .from("basic_rate_types")
      .upsert(rows, { onConflict: "name" });
    if (error) throw error;
  }

  return await loadTypeMap(svc);
}

async function validateScheduleSourceVersion(
  svc: SupabaseClient,
  scheduleSourceVersionId: string,
) {
  const { data, error } = await svc
    .from("schedule_source_versions")
    .select("id")
    .eq("id", scheduleSourceVersionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new HttpError(404, "schedule_source_version_id not found");
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

    const body = await requireJsonBody<IngestBasicRatesBody>(req);
    const scheduleSourceVersionId = body.schedule_source_version_id;
    const data = body.data;

    if (!scheduleSourceVersionId) {
      throw new HttpError(400, "schedule_source_version_id is required");
    }
    if (!Array.isArray(data)) {
      throw new HttpError(400, "data must be an array");
    }

    await validateScheduleSourceVersion(svc, scheduleSourceVersionId);

    const invalidRows: InvalidRow[] = [];
    const normalizedRows: NormalizedBasicRateRow[] = [];
    for (let i = 0; i < data.length; i += 1) {
      const { normalized, invalid } = normalizeRow(data[i], i);
      if (invalid) invalidRows.push(invalid);
      if (normalized) normalizedRows.push(normalized);
    }

    const distinctTypeNames = [...new Set(normalizedRows.map((row) => row.type))];
    const typeMap = await ensureTypeIds(svc, distinctTypeNames);

    const upsertRows = normalizedRows.map((row) => {
      const typeId = typeMap.get(row.type);
      if (!typeId) {
        throw new HttpError(500, `failed to resolve type id for '${row.type}'`);
      }

      return {
        schedule_source_version_id: scheduleSourceVersionId,
        basic_rate_type_id: typeId,
        code: row.code,
        description: row.description,
        unit: row.unit,
        rate: row.rate,
        status: "active",
      };
    });

    let beforeCount = 0;
    if (upsertRows.length > 0) {
      const { count: beforeCountResult, error: beforeCountError } = await svc
        .from("basic_rates")
        .select("*", { count: "exact", head: true })
        .eq("schedule_source_version_id", scheduleSourceVersionId);
      if (beforeCountError) throw beforeCountError;
      beforeCount = beforeCountResult ?? 0;
    }

    if (upsertRows.length > 0) {
      const { error } = await svc
        .from("basic_rates")
        .upsert(upsertRows, { onConflict: "schedule_source_version_id,code" });
      if (error) throw error;
    }

    let annotationsInserted = 0;
    if (upsertRows.length > 0) {
      const codes = [...new Set(normalizedRows.map((r) => r.code))];
      const codeToId = new Map<string, string>();
      for (const codeChunk of chunkArray(codes, REST_IN_CHUNK_SIZE)) {
        const { data: idRows, error: idErr } = await svc
          .from("basic_rates")
          .select("id, code")
          .eq("schedule_source_version_id", scheduleSourceVersionId)
          .in("code", codeChunk);
        if (idErr) throw idErr;
        for (const r of idRows ?? []) {
          codeToId.set(r.code, r.id);
        }
      }

      const basicRateIds = codes
        .map((c) => codeToId.get(c))
        .filter((id): id is string => Boolean(id));

      if (basicRateIds.length > 0) {
        for (const idChunk of chunkArray(basicRateIds, REST_IN_CHUNK_SIZE)) {
          const { error: delErr } = await svc
            .from("basic_rate_annotations")
            .delete()
            .in("basic_rate_id", idChunk);
          if (delErr) throw delErr;
        }
      }

      const pendingAnnotations: Array<{
        basic_rate_id: string;
        type: ScheduleAnnotationType;
        raw_text: string;
        order_index: number;
      }> = [];

      for (const row of normalizedRows) {
        if (row.attributes.length === 0) continue;
        const basicRateId = codeToId.get(row.code);
        if (!basicRateId) continue;
        for (const ann of row.attributes) {
          pendingAnnotations.push({
            basic_rate_id: basicRateId,
            type: ann.annotationType,
            raw_text: ann.rawText,
            order_index: ann.orderIndex,
          });
        }
      }

      if (pendingAnnotations.length > 0) {
        const { error: annErr } = await svc
          .from("basic_rate_annotations")
          .insert(pendingAnnotations);
        if (annErr) throw annErr;
        annotationsInserted = pendingAnnotations.length;
      }
    }

    let afterCount = beforeCount;
    if (upsertRows.length > 0) {
      const { count: afterCountResult, error: afterCountError } = await svc
        .from("basic_rates")
        .select("*", { count: "exact", head: true })
        .eq("schedule_source_version_id", scheduleSourceVersionId);
      if (afterCountError) throw afterCountError;
      afterCount = afterCountResult ?? beforeCount;
    }

    const insertedCount = Math.max(0, afterCount - beforeCount);
    const updatedCount = Math.max(0, upsertRows.length - insertedCount);

    return jsonResponse(
      {
        schedule_source_version_id: scheduleSourceVersionId,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        annotations_inserted: annotationsInserted,
        processed_count: upsertRows.length,
        invalid_rows: invalidRows,
      },
      200,
      req,
    );
  } catch (error) {
    return handleError(error);
  }
});
