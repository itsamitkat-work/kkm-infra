import type { Database } from '@kkm/db';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PaginationResponse } from '@/types/common';
import type {
  ProjectBoqLineSegmentId,
  ProjectItem,
  ProjectItemRowType,
  ProjectItemScheduleName,
} from '@/types/project-item';
import { appendOrderKey } from '@/lib/projects/order-key';
import { parseNumber } from '@/lib/utils';
import type { ItemDescriptionDoc } from '@/app/(app)/schedule-items/item-description-doc';
import {
  itemDescriptionDocsEqual,
  parseItemDescriptionFromDb,
  serializeItemDescriptionToDb,
} from '@/app/(app)/schedule-items/item-description-doc';

type BoqRow = Database['public']['Tables']['project_boq_lines']['Row'];
type BoqInsert = Database['public']['Tables']['project_boq_lines']['Insert'];
type BoqUpdate = Database['public']['Tables']['project_boq_lines']['Update'];

async function fetchMaxOrderKeyForProject(
  projectId: string,
  signal?: AbortSignal
): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_lines')
    .select('order_key')
    .eq('project_id', projectId)
    .order('order_key', { ascending: false })
    .limit(1);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.order_key ?? 0;
}

async function fetchScheduleDisplayNames(
  scheduleItemIds: string[],
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (scheduleItemIds.length === 0) {
    return out;
  }
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('schedule_items')
    .select(
      `
      id,
      schedule_source_versions (
        schedule_sources ( display_name, name )
      )
    `
    )
    .in('id', scheduleItemIds);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  type Nested = {
    id: string;
    schedule_source_versions:
      | {
          schedule_sources: {
            display_name: string | null;
            name: string | null;
          } | null;
        }
      | {
          schedule_sources: {
            display_name: string | null;
            name: string | null;
          } | null;
        }[]
      | null;
  };
  for (const row of (data ?? []) as Nested[]) {
    const ssv = row.schedule_source_versions;
    const version = Array.isArray(ssv) ? ssv[0] : ssv;
    const ss = version?.schedule_sources;
    const label =
      (ss?.display_name?.trim() || ss?.name?.trim() || '') ?? '';
    out.set(row.id, label);
  }
  return out;
}

async function fetchAggregatesForBoqIds(
  boqIds: string[],
  signal?: AbortSignal
): Promise<{
  estimation: Map<string, number>;
  measurement: Map<string, number>;
}> {
  const estimation = new Map<string, number>();
  const measurement = new Map<string, number>();
  if (boqIds.length === 0) {
    return { estimation, measurement };
  }
  const supabase = createSupabaseBrowserClient();

  let eq = supabase
    .from('project_estimation_lines')
    .select('project_boq_line_id, quantity')
    .in('project_boq_line_id', boqIds);
  if (signal) {
    eq = eq.abortSignal(signal);
  }
  const { data: estRows, error: e1 } = await eq;
  if (e1) {
    throw new Error(e1.message);
  }
  for (const r of estRows ?? []) {
    if (!r.project_boq_line_id) {
      continue;
    }
    const prev = estimation.get(r.project_boq_line_id) ?? 0;
    estimation.set(
      r.project_boq_line_id,
      prev + (Number(r.quantity) || 0)
    );
  }

  let mq = supabase
    .from('project_measurement_lines')
    .select('project_boq_line_id, quantity')
    .in('project_boq_line_id', boqIds);
  if (signal) {
    mq = mq.abortSignal(signal);
  }
  const { data: msrRows, error: e2 } = await mq;
  if (e2) {
    throw new Error(e2.message);
  }
  for (const r of msrRows ?? []) {
    if (!r.project_boq_line_id) {
      continue;
    }
    const prev = measurement.get(r.project_boq_line_id) ?? 0;
    measurement.set(
      r.project_boq_line_id,
      prev + (Number(r.quantity) || 0)
    );
  }

  return { estimation, measurement };
}

async function fetchSegmentIdsForBoqIds(
  boqIds: string[],
  signal?: AbortSignal
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (boqIds.length === 0) {
    return out;
  }
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_line_segments')
    .select('project_boq_line_id, project_segment_id')
    .in('project_boq_line_id', boqIds);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    const list = out.get(row.project_boq_line_id) ?? [];
    list.push(row.project_segment_id);
    out.set(row.project_boq_line_id, list);
  }
  return out;
}

function mapBoqToProjectItem(
  row: BoqRow,
  projectId: string,
  segmentIds: ProjectBoqLineSegmentId[],
  estimateQty: number,
  measurementQty: number,
  scheduleName: ProjectItemScheduleName
): ProjectItem {
  return {
    id: row.id,
    schedule_item_id: row.schedule_item_id,
    project_id: projectId,
    work_order_number: row.work_order_number,
    item_code: row.item_code,
    reference_schedule_text: row.reference_schedule_text ?? '',
    item_description: parseItemDescriptionFromDb(row.item_description),
    unit_display: row.unit_display,
    rate_amount: Number(row.rate_amount ?? 0),
    contract_quantity: Number(row.contract_quantity ?? 0),
    estimate_quantity: estimateQty,
    measurment_quantity: measurementQty,
    schedule_name: scheduleName,
    project_segment_ids: segmentIds,
    remark: row.remark ?? '',
    order_key: row.order_key,
  };
}

function mapBoqToProjectItemRow(
  row: BoqRow,
  projectId: string,
  segmentIds: ProjectBoqLineSegmentId[],
  estimateQty: number,
  measurementQty: number,
  scheduleName: ProjectItemScheduleName
): ProjectItemRowType {
  const item = mapBoqToProjectItem(
    row,
    projectId,
    segmentIds,
    estimateQty,
    measurementQty,
    scheduleName
  );
  const quantity = Number(item.contract_quantity) || 0;
  const rate = Number(item.rate_amount) || 0;
  const total = (quantity * rate).toFixed(2);
  return {
    id: row.id,
    work_order_number: String(item.work_order_number),
    schedule_item_id: item.schedule_item_id,
    item_code: item.item_code,
    reference_schedule_text: item.reference_schedule_text,
    item_description: item.item_description,
    unit_display: item.unit_display,
    rate_amount: rate.toString(),
    contract_quantity: quantity.toString(),
    total,
    schedule_name: item.schedule_name,
    project_segment_ids: item.project_segment_ids,
    estimate_quantity: String(estimateQty),
    measurment_quantity: String(measurementQty),
    remark: item.remark,
    is_edited: false,
    is_new: false,
    _original: null,
    order_key: row.order_key,
  };
}

/** Loads every BOQ line for the project in one request (no range / pagination). */
export async function fetchAllProjectBoqLines(
  projectId: string,
  signal?: AbortSignal
): Promise<PaginationResponse<ProjectItem>> {
  const supabase = createSupabaseBrowserClient();

  let dataQ = supabase
    .from('project_boq_lines')
    .select('*')
    .eq('project_id', projectId)
    .order('order_key', { ascending: true })
    .order('id', { ascending: true });
  if (signal) {
    dataQ = dataQ.abortSignal(signal);
  }
  const { data: rows, error: dataError } = await dataQ;
  if (dataError) {
    throw new Error(dataError.message);
  }

  const boqRows = (rows ?? []) as BoqRow[];
  const totalCount = boqRows.length;
  const ids = boqRows.map((r) => r.id);
  const scheduleIds = [...new Set(boqRows.map((r) => r.schedule_item_id))];

  const [scheduleNames, aggregates, segments] = await Promise.all([
    fetchScheduleDisplayNames(scheduleIds, signal),
    fetchAggregatesForBoqIds(ids, signal),
    fetchSegmentIdsForBoqIds(ids, signal),
  ]);

  const data: ProjectItem[] = boqRows.map((row) =>
    mapBoqToProjectItem(
      row,
      projectId,
      segments.get(row.id) ?? [],
      aggregates.estimation.get(row.id) ?? 0,
      aggregates.measurement.get(row.id) ?? 0,
      scheduleNames.get(row.schedule_item_id) ?? ''
    )
  );

  return {
    data,
    totalCount,
    page: 1,
    pageSize: Math.max(totalCount, 1),
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
}

/** BOQ line insert: DB column names (`project_boq_lines` + segment ids for junction rows). */
export type CreateBoqLineInput = Required<
  Pick<
    BoqInsert,
    | 'project_id'
    | 'schedule_item_id'
    | 'work_order_number'
    | 'item_code'
    | 'unit_display'
    | 'contract_quantity'
  >
> & {
  item_description: ItemDescriptionDoc;
  rate_amount: NonNullable<BoqInsert['rate_amount']> | null;
  remark: BoqInsert['remark'];
  reference_schedule_text?: BoqInsert['reference_schedule_text'];
  project_segment_ids: string[];
  signal?: AbortSignal;
};

export async function createProjectBoqLine(
  input: CreateBoqLineInput
): Promise<ProjectItemRowType> {
  const supabase = createSupabaseBrowserClient();
  const maxKey = await fetchMaxOrderKeyForProject(
    input.project_id,
    input.signal
  );
  const orderKey = appendOrderKey(maxKey);

  const insert: BoqInsert = {
    project_id: input.project_id,
    schedule_item_id: input.schedule_item_id,
    work_order_number: input.work_order_number,
    order_key: orderKey,
    item_code: input.item_code,
    item_description: serializeItemDescriptionToDb(input.item_description),
    unit_display: input.unit_display,
    rate_amount: input.rate_amount ?? null,
    contract_quantity: input.contract_quantity,
    remark: input.remark ?? null,
    reference_schedule_text: input.reference_schedule_text ?? '',
  };

  let iq = supabase.from('project_boq_lines').insert(insert);
  if (input.signal) {
    iq = iq.abortSignal(input.signal);
  }
  const { data: created, error } = await iq.select().single();
  if (error) {
    throw new Error(error.message);
  }
  const row = created as BoqRow;

  if (input.project_segment_ids.length > 0) {
    const junctionRows = input.project_segment_ids.map((project_segment_id) => ({
      project_boq_line_id: row.id,
      project_segment_id,
    }));
    let jq = supabase.from('project_boq_line_segments').insert(junctionRows);
    if (input.signal) {
      jq = jq.abortSignal(input.signal);
    }
    const { error: jErr } = await jq;
    if (jErr) {
      throw new Error(jErr.message);
    }
  }

  const scheduleNames = await fetchScheduleDisplayNames(
    [row.schedule_item_id],
    input.signal
  );
  const scheduleName = scheduleNames.get(row.schedule_item_id) ?? '';

  return mapBoqToProjectItemRow(
    row,
    input.project_id,
    input.project_segment_ids,
    0,
    0,
    scheduleName
  );
}

/** Partial row update + `project_boq_lines` identity; optional `project_segment_ids` replaces junction rows. */
export type UpdateBoqLineInput = Pick<BoqRow, 'id' | 'project_id'> & {
  project_segment_ids?: string[] | null;
  signal?: AbortSignal;
} & Partial<
  Pick<
    BoqRow,
    | 'work_order_number'
    | 'item_code'
    | 'unit_display'
    | 'rate_amount'
    | 'contract_quantity'
    | 'remark'
    | 'order_key'
    | 'schedule_item_id'
    | 'reference_schedule_text'
  >
> & {
  /** Parsed BOQ item name; serialized to jsonb in {@link patchProjectBoqLine}. */
  item_description?: ItemDescriptionDoc;
};

function sameProjectSegmentIds(
  a: string[] | undefined,
  b: string[] | undefined
): boolean {
  const xs = [...(a ?? [])].map(String).sort();
  const ys = [...(b ?? [])].map(String).sort();
  if (xs.length !== ys.length) {
    return false;
  }
  return xs.every((v, i) => v === ys[i]);
}

/**
 * Builds a minimal `UpdateBoqLineInput` from the edited row vs. `_original` / server snapshot.
 * Only fields that differ are included so {@link patchProjectBoqLine} sends a minimal PostgREST PATCH body.
 */
export function buildDirtyProjectBoqLineUpdateInput(args: {
  projectId: string;
  rowId: string;
  current: ProjectItemRowType;
  baseline: ProjectItemRowType | null | undefined;
}): UpdateBoqLineInput {
  const { projectId, rowId, current, baseline } = args;
  const identity: Pick<UpdateBoqLineInput, 'id' | 'project_id'> = {
    id: rowId,
    project_id: projectId,
  };

  if (!baseline) {
    return {
      ...identity,
      work_order_number:
        current.work_order_number as BoqRow['work_order_number'],
      item_code: current.item_code,
      item_description: current.item_description,
      unit_display: current.unit_display,
      rate_amount: parseNumber(String(current.rate_amount ?? '')),
      contract_quantity: parseNumber(
        String(current.contract_quantity ?? '')
      ),
      remark: current.remark ?? null,
      reference_schedule_text: current.reference_schedule_text ?? '',
      schedule_item_id: String(current.schedule_item_id ?? ''),
      project_segment_ids: current.project_segment_ids ?? [],
    };
  }

  const patch: UpdateBoqLineInput = { ...identity };

  if (
    String(current.work_order_number ?? '') !==
    String(baseline.work_order_number ?? '')
  ) {
    patch.work_order_number =
      current.work_order_number as BoqRow['work_order_number'];
  }
  if (String(current.item_code ?? '') !== String(baseline.item_code ?? '')) {
    patch.item_code = current.item_code;
  }
  if (!itemDescriptionDocsEqual(current.item_description, baseline.item_description)) {
    patch.item_description = current.item_description;
  }
  if (
    String(current.unit_display ?? '') !== String(baseline.unit_display ?? '')
  ) {
    patch.unit_display = current.unit_display;
  }

  const curRate = parseNumber(String(current.rate_amount ?? ''));
  const baseRate = parseNumber(String(baseline.rate_amount ?? ''));
  if (curRate !== baseRate) {
    patch.rate_amount = curRate;
  }

  const curQty = parseNumber(String(current.contract_quantity ?? ''));
  const baseQty = parseNumber(String(baseline.contract_quantity ?? ''));
  if (curQty !== baseQty) {
    patch.contract_quantity = curQty;
  }

  const curRemark = current.remark ?? null;
  const baseRemark = baseline.remark ?? null;
  if (String(curRemark ?? '') !== String(baseRemark ?? '')) {
    patch.remark = curRemark;
  }

  const curRef = String(current.reference_schedule_text ?? '');
  const baseRef = String(baseline.reference_schedule_text ?? '');
  if (curRef !== baseRef) {
    patch.reference_schedule_text = curRef;
  }

  const curScheduleItem = String(current.schedule_item_id ?? '');
  const baseScheduleItem = String(baseline.schedule_item_id ?? '');
  if (curScheduleItem !== baseScheduleItem && curScheduleItem !== '') {
    patch.schedule_item_id = curScheduleItem;
  }

  if (
    !sameProjectSegmentIds(
      current.project_segment_ids,
      baseline.project_segment_ids
    )
  ) {
    patch.project_segment_ids = current.project_segment_ids ?? [];
  }

  return patch;
}

/**
 * Applies a partial update to `project_boq_lines` (Supabase `.update()` → PostgREST `PATCH`).
 */
export async function patchProjectBoqLine(
  input: UpdateBoqLineInput
): Promise<ProjectItemRowType> {
  const supabase = createSupabaseBrowserClient();
  const {
    id,
    project_id,
    project_segment_ids,
    signal,
    work_order_number,
    item_code,
    item_description,
    unit_display,
    rate_amount,
    contract_quantity,
    remark,
    order_key,
    schedule_item_id,
    reference_schedule_text,
  } = input;

  const patch: BoqUpdate = {};
  if (work_order_number !== undefined && work_order_number !== null) {
    patch.work_order_number = work_order_number;
  }
  if (item_code !== undefined && item_code !== null) {
    patch.item_code = item_code;
  }
  if (item_description !== undefined && item_description !== null) {
    patch.item_description = serializeItemDescriptionToDb(
      item_description
    ) as BoqRow['item_description'];
  }
  if (unit_display !== undefined && unit_display !== null) {
    patch.unit_display = unit_display;
  }
  if (rate_amount !== undefined) {
    patch.rate_amount = rate_amount;
  }
  if (contract_quantity !== undefined && contract_quantity !== null) {
    patch.contract_quantity = contract_quantity;
  }
  if (remark !== undefined) {
    patch.remark = remark;
  }
  if (order_key !== undefined) {
    patch.order_key = order_key;
  }
  if (schedule_item_id !== undefined && schedule_item_id !== null) {
    patch.schedule_item_id = schedule_item_id;
  }
  if (reference_schedule_text !== undefined) {
    patch.reference_schedule_text = reference_schedule_text;
  }

  if (Object.keys(patch).length > 0) {
    let uq = supabase
      .from('project_boq_lines')
      .update(patch)
      .eq('id', id)
      .eq('project_id', project_id);
    if (signal) {
      uq = uq.abortSignal(signal);
    }
    const { error } = await uq.select().single();
    if (error) {
      throw new Error(error.message);
    }
  }

  if (project_segment_ids !== undefined && project_segment_ids !== null) {
    let dq = supabase
      .from('project_boq_line_segments')
      .delete()
      .eq('project_boq_line_id', id);
    if (signal) {
      dq = dq.abortSignal(signal);
    }
    const { error: dErr } = await dq;
    if (dErr) {
      throw new Error(dErr.message);
    }
    if (project_segment_ids.length > 0) {
      const junctionRows = project_segment_ids.map((project_segment_id) => ({
        project_boq_line_id: id,
        project_segment_id,
      }));
      let iq = supabase.from('project_boq_line_segments').insert(junctionRows);
      if (signal) {
        iq = iq.abortSignal(signal);
      }
      const { error: iErr } = await iq;
      if (iErr) {
        throw new Error(iErr.message);
      }
    }
  }

  let rq = supabase
    .from('project_boq_lines')
    .select('*')
    .eq('id', id);
  if (signal) {
    rq = rq.abortSignal(signal);
  }
  const { data: row, error: rErr } = await rq.single();
  if (rErr || !row) {
    throw new Error(rErr?.message ?? 'BOQ line not found after update');
  }
  const boq = row as BoqRow;
  const [aggregates, segments, scheduleNames] = await Promise.all([
    fetchAggregatesForBoqIds([boq.id], signal),
    fetchSegmentIdsForBoqIds([boq.id], signal),
    fetchScheduleDisplayNames([boq.schedule_item_id], signal),
  ]);

  return mapBoqToProjectItemRow(
    boq,
    project_id,
    segments.get(boq.id) ?? [],
    aggregates.estimation.get(boq.id) ?? 0,
    aggregates.measurement.get(boq.id) ?? 0,
    scheduleNames.get(boq.schedule_item_id) ?? ''
  );
}

/** @deprecated Prefer {@link patchProjectBoqLine} — same implementation. */
export const updateProjectBoqLine = patchProjectBoqLine;

export async function deleteProjectBoqLine(
  boqLineId: string,
  projectId: string,
  signal?: AbortSignal
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_lines')
    .delete()
    .eq('id', boqLineId)
    .eq('project_id', projectId);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw new Error(error.message);
  }
}
