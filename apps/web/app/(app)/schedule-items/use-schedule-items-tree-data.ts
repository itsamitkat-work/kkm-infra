'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  ScheduleAnnotationMetadata,
  ScheduleAnnotationType,
  ScheduleItemAnnotation,
  ScheduleItemContextRate,
  ScheduleTreeRow,
  ScheduleTreeSearchRow,
} from './types';

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
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  const out: ScheduleItemAnnotation[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
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
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  const out: ScheduleItemContextRate[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
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

export {
  useScheduleSourceVersions,
  SCHEDULE_SOURCE_VERSIONS_QUERY_KEY as SCHEDULE_VERSIONS_QUERY_KEY,
} from '@/hooks/use-schedule-source-versions';

export const SCHEDULE_TREE_ROOTS_QUERY_KEY = ['schedule_tree_roots'] as const;

export function scheduleTreeRootsQueryKey(versionId: string | null) {
  return [...SCHEDULE_TREE_ROOTS_QUERY_KEY, versionId] as const;
}

export function scheduleTreeChildrenQueryKey(
  versionId: string | null,
  parentId: string,
) {
  return ['schedule_tree_children', versionId, parentId] as const;
}

export function scheduleTreeSearchQueryKey(versionId: string | null, q: string) {
  return ['schedule_tree_search', versionId, q] as const;
}

export async function fetchScheduleTreeRoots(
  versionId: string,
): Promise<ScheduleTreeRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_schedule_tree_roots', {
    p_schedule_source_version_id: versionId,
  });
  if (error) throw error;
  return ((data ?? []) as ScheduleTreeRow[]).map(normalizeScheduleTreeRow);
}

export async function fetchScheduleTreeChildren(
  versionId: string,
  parentId: string,
): Promise<ScheduleTreeRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_schedule_tree_children', {
    p_schedule_source_version_id: versionId,
    p_parent_item_id: parentId,
  });
  if (error) throw error;
  return ((data ?? []) as ScheduleTreeRow[]).map(normalizeScheduleTreeRow);
}

export function useScheduleTreeRoots(versionId: string | null) {
  return useQuery({
    queryKey: scheduleTreeRootsQueryKey(versionId),
    queryFn: () => fetchScheduleTreeRoots(versionId as string),
    enabled: Boolean(versionId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useScheduleTreeSearch(
  versionId: string | null,
  q: string,
  limit = 50,
) {
  const normalized = q.trim();
  return useQuery({
    queryKey: scheduleTreeSearchQueryKey(versionId, normalized),
    queryFn: async (): Promise<ScheduleTreeSearchRow[]> => {
      if (!versionId || normalized.length < 2) return [];
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('search_schedule_tree', {
        p_schedule_source_version_id: versionId,
        p_query: normalized,
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw error;
      return ((data ?? []) as ScheduleTreeSearchRow[]).map((row) => {
        const base = normalizeScheduleTreeRow(row);
        return {
          ...base,
          ancestor_ids: Array.isArray(row.ancestor_ids)
            ? row.ancestor_ids.map(String)
            : [],
        };
      });
    },
    enabled: Boolean(versionId && normalized.length >= 2),
    staleTime: 1000 * 30,
  });
}
