import type { Database } from '@kkm/db';
import type { PaginationResponse } from '@/types/common';
import type {
  ProjectCreateSegmentData,
  ProjectSegment,
  ProjectSegmentFormData,
  ProjectSegmentStatus,
} from '@/types/projects';
import type { Filter } from '@/components/ui/filters';
import type { SortingState } from '@tanstack/react-table';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type ProjectSegmentRow = Database['public']['Tables']['project_segments']['Row'];
type ProjectSegmentInsert =
  Database['public']['Tables']['project_segments']['Insert'];

const SORT_TO_DB: Record<string, keyof ProjectSegmentRow> = {
  displayOrder: 'display_order',
  segmentName: 'segment_name',
  segmentType: 'segment_type',
  startDate: 'start_date',
  endDate: 'end_date',
  status: 'status',
};

export function mapRowToProjectSegment(row: ProjectSegmentRow): ProjectSegment {
  return {
    hashId: row.id,
    projectId: row.project_id,
    segmentName: row.segment_name,
    segmentType: row.segment_type,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as ProjectSegmentStatus,
    displayOrder: row.display_order,
  };
}

function normalizeDateForDb(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const s = value.trim();
  if (!s) {
    return null;
  }
  const head = s.split('T')[0];
  return head ?? null;
}

export interface FetchProjectSegmentsParams {
  projectId: string;
  search?: string;
  page?: number;
  filters?: Record<string, Filter>;
  sorting?: SortingState;
  signal?: AbortSignal;
  pageSize?: number;
}

/** Loads every segment for the project in one Supabase request (no range / lazy pages). */
export async function fetchAllProjectSegmentsForProject({
  projectId,
  search = '',
  sorting,
  signal,
}: Pick<
  FetchProjectSegmentsParams,
  'projectId' | 'search' | 'sorting' | 'signal'
>): Promise<ProjectSegment[]> {
  const supabase = createSupabaseBrowserClient();
  const sort = sorting?.[0];
  const sortCol = sort?.id
    ? (SORT_TO_DB[sort.id] ?? 'display_order')
    : 'display_order';
  const ascending = sort ? !sort.desc : true;

  let q = supabase
    .from('project_segments')
    .select('*')
    .eq('project_id', projectId)
    .order(sortCol, { ascending });

  const trimmed = search?.trim();
  if (trimmed) {
    q = q.ilike('segment_name', `%${trimmed}%`);
  }

  if (signal) {
    q = q.abortSignal(signal);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectSegmentRow[]).map(mapRowToProjectSegment);
}

/** Single-page shape for callers that still expect pagination metadata. */
export async function fetchProjectSegmentsAsSinglePage(
  params: Pick<
    FetchProjectSegmentsParams,
    'projectId' | 'search' | 'sorting' | 'signal'
  >
): Promise<PaginationResponse<ProjectSegment>> {
  const items = await fetchAllProjectSegmentsForProject(params);
  const n = items.length;
  return {
    data: items,
    totalCount: n,
    page: 1,
    pageSize: Math.max(n, 1),
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
    isSuccess: true,
    statusCode: 200,
    message: 'Success',
  };
}

export async function createProjectSegment(
  segment: ProjectCreateSegmentData
): Promise<ProjectSegment> {
  const supabase = createSupabaseBrowserClient();
  const insert: ProjectSegmentInsert = {
    project_id: segment.projectId,
    segment_name: segment.segmentName,
    segment_type: segment.segmentType,
    description: segment.description?.trim() || null,
    start_date: normalizeDateForDb(segment.startDate ?? null),
    end_date: normalizeDateForDb(segment.endDate ?? null),
    status: segment.status,
    display_order: segment.displayOrder,
  };

  const { data, error } = await supabase
    .from('project_segments')
    .insert(insert)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return mapRowToProjectSegment(data as ProjectSegmentRow);
}

export async function updateProjectSegment(
  segment: ProjectSegmentFormData
): Promise<ProjectSegment> {
  if (!segment.id) {
    throw new Error('Segment ID is required for update');
  }
  const supabase = createSupabaseBrowserClient();
  const patch: Database['public']['Tables']['project_segments']['Update'] = {
    segment_name: segment.segmentName,
    segment_type: segment.segmentType,
    description: segment.description?.trim() || null,
    start_date: normalizeDateForDb(segment.startDate ?? null),
    end_date: normalizeDateForDb(segment.endDate ?? null),
    status: segment.status,
    display_order: segment.displayOrder,
  };

  const { data, error } = await supabase
    .from('project_segments')
    .update(patch)
    .eq('id', segment.id)
    .eq('project_id', segment.projectId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return mapRowToProjectSegment(data as ProjectSegmentRow);
}

export async function deleteProjectSegment(
  projectId: string,
  segmentId: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from('project_segments')
    .delete()
    .eq('id', segmentId)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(error.message);
  }
}
