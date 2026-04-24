import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

import type {
  ScheduleAnnotationMetadata,
  ScheduleAnnotationType,
  ScheduleItemAnnotation,
  ScheduleItemContextRate,
  ScheduleTreeRow,
  ScheduleTreeSearchRow,
} from '../types';

const ANNOTATION_TYPES = new Set<ScheduleAnnotationType>([
  'note',
  'remark',
  'condition',
  'reference',
]);

function parseScheduleAnnotationMetadata(
  value: unknown
): ScheduleAnnotationMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function parseScheduleAnnotations(value: unknown): ScheduleItemAnnotation[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const out: ScheduleItemAnnotation[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const rawType =
      typeof o.type === 'string' ? o.type.trim().toLowerCase() : '';
    const type: ScheduleAnnotationType = ANNOTATION_TYPES.has(
      rawType as ScheduleAnnotationType
    )
      ? (rawType as ScheduleAnnotationType)
      : 'note';
    const orderRaw = o.order_index;
    let order_index: number | null = null;
    if (typeof orderRaw === 'number' && Number.isFinite(orderRaw)) {
      order_index = orderRaw;
    } else if (orderRaw != null && String(orderRaw).trim() !== '') {
      const n = Number(orderRaw);
      order_index = Number.isFinite(n) ? n : null;
    }
    out.push({
      id: typeof o.id === 'string' ? o.id : String(o.id ?? ''),
      type,
      raw_text: typeof o.raw_text === 'string' ? o.raw_text : '',
      order_index,
      metadata: parseScheduleAnnotationMetadata(o.metadata),
    });
  }
  return out;
}

function parseScheduleRates(value: unknown): ScheduleItemContextRate[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const out: ScheduleItemContextRate[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const rateRaw = o.rate;
    let rate = 0;
    if (typeof rateRaw === 'number' && Number.isFinite(rateRaw)) {
      rate = rateRaw;
    } else if (rateRaw != null && String(rateRaw).trim() !== '') {
      const n = Number(rateRaw);
      rate = Number.isFinite(n) ? n : 0;
    }
    const orderRaw = o.order_index;
    let order_index: number | null = null;
    if (typeof orderRaw === 'number' && Number.isFinite(orderRaw)) {
      order_index = orderRaw;
    } else if (orderRaw != null && String(orderRaw).trim() !== '') {
      const n = Number(orderRaw);
      order_index = Number.isFinite(n) ? n : null;
    }
    out.push({
      id: typeof o.id === 'string' ? o.id : String(o.id ?? ''),
      context:
        typeof o.context === 'string' && o.context.trim() !== ''
          ? o.context
          : 'unknown',
      label:
        typeof o.label === 'string' && o.label.trim() !== ''
          ? o.label
          : null,
      rate,
      rate_display:
        typeof o.rate_display === 'string' && o.rate_display.trim() !== ''
          ? o.rate_display
          : null,
      order_index,
    });
  }
  return out;
}

function normalizeScheduleTreeRow(row: ScheduleTreeRow): ScheduleTreeRow {
  return {
    ...row,
    has_children: Boolean(row.has_children),
    annotations: parseScheduleAnnotations(
      (row as { annotations?: unknown }).annotations
    ),
    rates: parseScheduleRates((row as { rates?: unknown }).rates),
  };
}

async function fetchScheduleTreeRoots(
  supabase: SupabaseClient<Database>,
  versionId: string,
  signal?: AbortSignal
): Promise<ScheduleTreeRow[]> {
  let rpc = supabase.rpc('get_schedule_tree_roots', {
    p_schedule_source_version_id: versionId,
  });
  if (signal) {
    rpc = rpc.abortSignal(signal);
  }
  const { data, error } = await rpc;
  if (error) {
    throw normalizeError(error);
  }
  return ((data ?? []) as ScheduleTreeRow[]).map(normalizeScheduleTreeRow);
}

async function fetchScheduleTreeChildren(
  supabase: SupabaseClient<Database>,
  versionId: string,
  parentId: string,
  signal?: AbortSignal
): Promise<ScheduleTreeRow[]> {
  let rpc = supabase.rpc('get_schedule_tree_children', {
    p_schedule_source_version_id: versionId,
    p_parent_item_id: parentId,
  });
  if (signal) {
    rpc = rpc.abortSignal(signal);
  }
  const { data, error } = await rpc;
  if (error) {
    throw normalizeError(error);
  }
  return ((data ?? []) as ScheduleTreeRow[]).map(normalizeScheduleTreeRow);
}

async function fetchScheduleTreeSearch(
  supabase: SupabaseClient<Database>,
  versionId: string,
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<ScheduleTreeSearchRow[]> {
  let rpc = supabase.rpc('search_schedule_tree', {
    p_schedule_source_version_id: versionId,
    p_query: query,
    p_limit: limit,
    p_offset: 0,
  });
  if (signal) {
    rpc = rpc.abortSignal(signal);
  }
  const { data, error } = await rpc;
  if (error) {
    throw normalizeError(error);
  }
  return ((data ?? []) as ScheduleTreeSearchRow[]).map((row) => {
    const base = normalizeScheduleTreeRow(row);
    return {
      ...base,
      ancestor_ids: Array.isArray(row.ancestor_ids)
        ? row.ancestor_ids.map(String)
        : [],
    };
  });
}

export { fetchScheduleTreeChildren, fetchScheduleTreeRoots, fetchScheduleTreeSearch };
