/**
 * Edge Function: ingest-schedule
 *
 * Ingests a parsed schedule-of-rates JSON file into the schedule_items
 * hierarchy. Walks the tree depth-first, inserting parents before children
 * so the ltree trigger can compute paths. Resolves unit symbols to unit IDs
 * and inserts annotations into schedule_item_annotations. When a node
 * carries a `rates` array, inserts matching rows into schedule_item_rates.
 *
 * Auth: system admin only.
 *
 * POST body:
 *   { schedule_source_version_id: uuid, data: ParsedRoot }
 *
 * Returns:
 *   { batch_id, items_inserted, annotations_inserted, rates_inserted, unresolved_units }
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

// ---------------------------------------------------------------------------
// Types mirroring the parsed JSON structure
// ---------------------------------------------------------------------------

interface ParsedAnnotation {
  type: string;
  text: string;
  source_page?: number;
  order_index?: number;
}

interface ParsedContextRate {
  context: string;
  rate: number;
  label?: string;
  order_index?: number;
  rate_display?: string;
}

interface ParsedNode {
  node_type: string;
  title?: string;
  code?: string;
  children?: ParsedNode[];
  children_count?: number;
  order_index?: number;
  source_page?: number;
  unit?: string;
  rate?: number;
  rate_kind?: string;
  rates?: ParsedContextRate[];
  annotations?: ParsedAnnotation[];
}

interface IngestBody {
  schedule_source_version_id?: string;
  data?: ParsedNode;
}

// ---------------------------------------------------------------------------
// Node type mapping
// ---------------------------------------------------------------------------

type ScheduleNodeType = "section" | "group" | "item";

function resolveNodeType(node: ParsedNode): ScheduleNodeType {
  if (node.node_type === "subhead") return "section";
  if (node.node_type === "group") return "group";
  if (node.node_type === "item") {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    if (!hasChildren) return "item";
    const hasPrimaryRate =
      node.rate != null ||
      (Array.isArray(node.rates) && node.rates.length > 0);
    return hasPrimaryRate ? "item" : "group";
  }
  const hasChildren = Boolean(node.children && node.children.length > 0);
  return hasChildren ? "group" : "item";
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    // Auth: accept either service_role key or system admin JWT
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

    const body = await requireJsonBody<IngestBody>(req);
    const versionId = body.schedule_source_version_id;
    const data = body.data;

    if (!versionId) {
      throw new HttpError(400, "schedule_source_version_id is required");
    }
    if (!data || !data.children || data.children.length === 0) {
      throw new HttpError(400, "data must contain a root node with children");
    }

    const { data: version, error: versionError } = await svc
      .from("schedule_source_versions")
      .select("id")
      .eq("id", versionId)
      .maybeSingle();

    if (versionError) throw versionError;
    if (!version) {
      throw new HttpError(404, "Schedule source version not found");
    }

    const unitMap = await loadUnitMap(svc);
    const batchId = crypto.randomUUID();

    let itemsInserted = 0;
    let annotationsInserted = 0;
    let ratesInserted = 0;
    const unresolvedUnits = new Set<string>();
    const pendingAnnotations: Array<{
      schedule_item_id: string;
      type: string;
      raw_text: string;
      order_index: number | null;
    }> = [];
    const pendingItemRates: Array<{
      schedule_item_id: string;
      context: string;
      rate: number;
      label: string | null;
      order_index: number | null;
      rate_display: string | null;
    }> = [];

    function resolvePrimaryRate(node: ParsedNode): number | null {
      if (node.rate != null) return node.rate;
      const first = node.rates?.[0]?.rate;
      return first ?? null;
    }

    async function insertNode(
      node: ParsedNode,
      parentId: string | null,
    ): Promise<void> {
      if (!node.code) return;

      const nodeType = resolveNodeType(node);
      let unitId: string | null = null;

      if (node.unit) {
        unitId = unitMap.get(node.unit) ?? null;
        if (!unitId) unresolvedUnits.add(node.unit);
      }

      const itemType = node.rate_kind === "percentage" ? "percentage" : "base";
      const primaryRate = resolvePrimaryRate(node);

      const { data: inserted, error: insertError } = await svc
        .from("schedule_items")
        .insert({
          schedule_source_version_id: versionId,
          parent_item_id: parentId,
          code: node.code,
          description: node.title ?? node.code,
          node_type: nodeType,
          unit_id: unitId,
          rate: primaryRate,
          item_type: itemType,
          order_index: node.order_index ?? null,
          source_page_number: node.source_page ?? null,
          ingestion_batch_id: batchId,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new HttpError(
          500,
          `Failed to insert item ${node.code}: ${insertError.message}`,
        );
      }

      itemsInserted++;

      if (node.annotations) {
        for (const ann of node.annotations) {
          pendingAnnotations.push({
            schedule_item_id: inserted.id,
            type: ann.type,
            raw_text: ann.text,
            order_index: ann.order_index ?? null,
          });
        }
      }

      if (node.rates && node.rates.length > 0) {
        for (const row of node.rates) {
          if (!row.context || row.rate == null) continue;
          pendingItemRates.push({
            schedule_item_id: inserted.id,
            context: row.context,
            rate: row.rate,
            label: row.label ?? null,
            order_index: row.order_index ?? null,
            rate_display: row.rate_display ?? null,
          });
        }
      }

      if (node.children) {
        for (const child of node.children) {
          await insertNode(child, inserted.id);
        }
      }
    }

    // The root node has node_type "root" — iterate its children (sections)
    for (const section of data.children) {
      await insertNode(section, null);
    }

    // Bulk insert annotations
    if (pendingAnnotations.length > 0) {
      const { error: annError } = await svc
        .from("schedule_item_annotations")
        .insert(pendingAnnotations);

      if (annError) {
        throw new HttpError(
          500,
          `Failed to insert annotations: ${annError.message}`,
        );
      }
      annotationsInserted = pendingAnnotations.length;
    }

    if (pendingItemRates.length > 0) {
      const { error: ratesError } = await svc
        .from("schedule_item_rates")
        .insert(pendingItemRates);

      if (ratesError) {
        throw new HttpError(
          500,
          `Failed to insert schedule item rates: ${ratesError.message}`,
        );
      }
      ratesInserted = pendingItemRates.length;
    }

    return jsonResponse(
      {
        batch_id: batchId,
        items_inserted: itemsInserted,
        annotations_inserted: annotationsInserted,
        rates_inserted: ratesInserted,
        unresolved_units: [...unresolvedUnits],
      },
      200,
      req,
    );
  } catch (error) {
    return handleError(error);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadUnitMap(
  svc: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await svc
    .from("units")
    .select("id, symbol");

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.symbol, row.id);
  }
  return map;
}
