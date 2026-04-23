import type { Database } from '@kkm/db';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProjectBoqLinesType } from '@/app/projects/[id]/estimation/types';

type EstimationRow = Database['public']['Tables']['project_estimation_lines']['Row'];

export type DomainLineInsert = {
  project_id: string;
  project_boq_line_id?: string | null;
  schedule_item_id: string;
  project_segment_id?: string | null;
  line_description?: string;
  length?: number;
  width?: number;
  height?: number;
  no1?: number;
  no2?: number;
  quantity?: number;
  is_checked?: boolean;
  is_verified?: boolean;
  order_key?: number;
  remark?: string | null;
  rate_amount?: number | null;
};

export type DomainLineUpdate = Partial<
  Omit<DomainLineInsert, 'project_id' | 'schedule_item_id'>
> & {
  line_description?: string;
};

function tableForType(
  type: ProjectBoqLinesType
): 'project_estimation_lines' | 'project_measurement_lines' | 'project_billing_lines' {
  if (type === 'estimation') {
    return 'project_estimation_lines';
  }
  if (type === 'measurement') {
    return 'project_measurement_lines';
  }
  if (type === 'billing') {
    return 'project_billing_lines';
  }
  throw new Error(`Unsupported domain type: ${type}`);
}

export async function fetchDomainLinesForBoqLine(
  projectBoqLineId: string,
  type: ProjectBoqLinesType,
  signal?: AbortSignal
): Promise<EstimationRow[]> {
  const supabase = createSupabaseBrowserClient();
  const table = tableForType(type);
  let q = supabase
    .from(table)
    .select('*')
    .eq('project_boq_line_id', projectBoqLineId)
    .order('order_key', { ascending: true })
    .order('id', { ascending: true });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as EstimationRow[];
}

export async function fetchMaxOrderKeyForDomainLines(
  projectBoqLineId: string,
  type: ProjectBoqLinesType,
  signal?: AbortSignal
): Promise<number> {
  const supabase = createSupabaseBrowserClient();
  const table = tableForType(type);
  let q = supabase
    .from(table)
    .select('order_key')
    .eq('project_boq_line_id', projectBoqLineId)
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

export async function fetchScheduleItemIdForBoqLine(
  projectBoqLineId: string,
  signal?: AbortSignal
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase
    .from('project_boq_lines')
    .select('schedule_item_id')
    .eq('id', projectBoqLineId);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q.single();
  if (error) {
    throw new Error(error.message);
  }
  if (!data?.schedule_item_id) {
    throw new Error('BOQ line not found or missing schedule_item_id');
  }
  return data.schedule_item_id;
}

export async function insertDomainLine(
  type: ProjectBoqLinesType,
  row: DomainLineInsert,
  signal?: AbortSignal
): Promise<EstimationRow> {
  const supabase = createSupabaseBrowserClient();
  const table = tableForType(type);
  let q = supabase.from(table).insert(row);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q.select().single();
  if (error) {
    throw new Error(error.message);
  }
  return data as EstimationRow;
}

export async function updateDomainLine(
  type: ProjectBoqLinesType,
  id: string,
  patch: DomainLineUpdate,
  signal?: AbortSignal
): Promise<EstimationRow> {
  const supabase = createSupabaseBrowserClient();
  const table = tableForType(type);
  let q = supabase.from(table).update(patch).eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q.select().single();
  if (error) {
    throw new Error(error.message);
  }
  return data as EstimationRow;
}

export async function deleteDomainLine(
  type: ProjectBoqLinesType,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const table = tableForType(type);
  let q = supabase.from(table).delete().eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw new Error(error.message);
  }
}
