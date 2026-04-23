'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';
import { ProjectItemRowType } from '@/types/project-item';
import { ProjectItem } from '@/types/project-item';
import React from 'react';
import type { ProjectBoqLinesQueryScope } from '@/app/projects/[id]/estimation/types';
import { fetchAllProjectBoqLines } from '@/lib/projects/project-boq-repo';

export const fetchProjectItems = async (
  projectId: string,
  scope: ProjectBoqLinesQueryScope,
  signal?: AbortSignal
): Promise<PaginationResponse<ProjectItem>> => {
  return fetchAllProjectBoqLines(projectId, scope, signal);
};

function mapProjectItemToRow(item: ProjectItem): ProjectItemRowType {
  const quantity = Number(item.contract_quantity) || 0;
  const rate = Number(item.rate_amount) || 0;
  const total = (quantity * rate).toFixed(2);
  return {
    id: item.id,
    work_order_number: item.work_order_number?.toString() || '',
    item_code: item.item_code,
    item_description: item.item_description,
    unit_display: item.unit_display || '',
    contract_quantity: quantity.toString(),
    rate_amount: rate.toString(),
    total,
    schedule_name: item.schedule_name || '',
    project_segment_ids: item.project_segment_ids || [],
    estimate_quantity: item.estimate_quantity?.toString() || '0',
    measurment_quantity: item.measurment_quantity?.toString() || '0',
    remark: item.remark || '',
    reference_schedule_text: item.reference_schedule_text || '',
    schedule_item_id: item.schedule_item_id,
    is_edited: false,
    is_new: false,
    _original: null,
    order_key: item.order_key ?? null,
    project_boq_lines_type: item.project_boq_lines_type,
  };
}

/** Full list as rows for DataTable (single network request). */
export async function fetchProjectItemsAsRows(
  projectId: string,
  scope: ProjectBoqLinesQueryScope,
  signal?: AbortSignal
): Promise<PaginationResponse<ProjectItemRowType>> {
  const raw = await fetchProjectItems(projectId, scope, signal);
  return {
    ...raw,
    data: (raw.data || []).map((item) => mapProjectItemToRow(item)),
  };
}

/**
 * Infinite-query shape for DataTable; loads the full BOQ list in one request
 * (`getNextPageParam` is always undefined).
 */
export function useProjectItemsInfiniteQuery({
  projectId,
  scope,
  enabled = true,
}: {
  projectId: string;
  scope: ProjectBoqLinesQueryScope;
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ['project-items-infinite', projectId, scope],
    queryFn: ({ signal }) =>
      fetchProjectItemsAsRows(projectId, scope, signal),
    getNextPageParam: () => undefined,
    initialPageParam: 1,
    enabled: !!projectId && enabled,
  });
}

export type UseProjectItemsInfiniteQueryResult = ReturnType<
  typeof useProjectItemsInfiniteQuery
>;

export const useProjectItemsQuery = ({
  projectId,
  scope,
}: {
  projectId: string;
  scope: ProjectBoqLinesQueryScope;
}) => {
  const { data, isPending, isLoading, isFetching, isError, error, refetch } =
    useQuery({
      queryKey: ['project-items', projectId, scope],
      queryFn: ({ signal }) => fetchProjectItems(projectId, scope, signal),
      enabled: !!projectId,
      refetchOnWindowFocus: 'always',
    });

  const projectItemRows: ProjectItemRowType[] = React.useMemo(() => {
    return (data?.data ?? []).map((item: ProjectItem) =>
      mapProjectItemToRow(item)
    );
  }, [data]);

  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  return {
    data: projectItemRows,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasPrevious: data?.hasPrevious ?? false,
    hasNext: data?.hasNext ?? false,
    isPending,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    fetchNextPage: async () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
  };
};
