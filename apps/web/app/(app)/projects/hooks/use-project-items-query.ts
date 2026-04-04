'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { ProjectItemRowType } from '@/types/project-item';
import { ProjectItem } from '@/types/project-item';
import React from 'react';
import { ProjectItemType } from '@/app/projects/[id]/estimation/types';

export const fetchProjectItems = async (
  projectId: string,
  page: number,
  type: ProjectItemType
): Promise<PaginationResponse<ProjectItem>> => {
  const params = new URLSearchParams();

  params.append('type', type);
  params.append('page', page.toString());
  params.append('pageSize', '200');
  params.append('sortBy', 'srNo');
  params.append('order', 'asc');

  const queryString = params.toString();

  const data = await apiFetch<PaginationResponse<ProjectItem>>(
    `/v2/project/items/${projectId}?${queryString}`
  );

  if (!data?.isSuccess || data?.statusCode !== 200) {
    throw new Error('Failed to fetch project items');
  }

  return data;
};

function mapProjectItemToRow(item: ProjectItem): ProjectItemRowType {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const total = (quantity * rate).toFixed(2);
  return {
    id: item.hashId,
    hashId: item.hashId,
    srNo: item.srNo?.toString() || '',
    code: item.code,
    name: item.name,
    unit: item.unit || '',
    quantity: quantity.toString(),
    rate: rate.toString(),
    total,
    scheduleName: item.scheduleName || '',
    segmentHashIds: item.segmentHashIds || [],
    estimate_quantity: item.estimate_quantity?.toString() || '0',
    measurment_quantity: item.measurment_quantity?.toString() || '0',
    remark: item.remarks || '',
    dsrCode: item.dsrCode || '',
    isEdited: false,
    isNew: false,
    _original: null,
  };
}

/** Fetches one page and returns PaginationResponse<ProjectItemRowType> for use with DataTable (infinite query shape). */
export async function fetchProjectItemsAsRows(
  projectId: string,
  page: number,
  type: ProjectItemType
): Promise<PaginationResponse<ProjectItemRowType>> {
  const raw = await fetchProjectItems(projectId, page, type);
  return {
    ...raw,
    data: (raw.data || []).map(mapProjectItemToRow),
  };
}

/** Infinite query for project items compatible with DataTable (pages of ProjectItemRowType). */
export function useProjectItemsInfiniteQuery({
  projectId,
  type,
  enabled = true,
}: {
  projectId: string;
  type: ProjectItemType;
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ['project-items-infinite', projectId, type],
    queryFn: ({ pageParam }) =>
      fetchProjectItemsAsRows(projectId, pageParam as number, type),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!projectId && !!type && enabled,
  });
}

export type UseProjectItemsInfiniteQueryResult = ReturnType<
  typeof useProjectItemsInfiniteQuery
>;

export const useProjectItemsQuery = ({
  projectId,
  type,
  fetchAll = true,
}: {
  projectId: string;
  type: ProjectItemType;
  fetchAll?: boolean;
}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['project-items', projectId, type],
    queryFn: ({ pageParam }) => fetchProjectItems(projectId, pageParam, type),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!projectId && !!type,
    refetchOnWindowFocus: 'always',
  });

  React.useEffect(() => {
    if (fetchAll && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchAll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const projectItemRows: ProjectItemRowType[] = React.useMemo(() => {
    if (!data?.pages) return [];

    return data.pages.flatMap((page) =>
      (page.data || []).map((item: ProjectItem) => {
        // Calculate total with proper number handling
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const total = (quantity * rate).toFixed(2);

        return {
          id: item.hashId,
          hashId: item.hashId,
          srNo: item.srNo?.toString() || '',
          code: item.code,
          name: item.name,
          unit: item.unit || '',
          quantity: quantity.toString(),
          rate: rate.toString(),
          total,
          scheduleName: item.scheduleName || '',
          segmentHashIds: item.segmentHashIds || [],
          estimate_quantity: item.estimate_quantity?.toString() || '0',
          measurment_quantity: item.measurment_quantity?.toString() || '0',
          remark: item.remarks || '',
          dsrCode: item.dsrCode || '',

          isEdited: false,
          isNew: false,
          _original: null,
        };
      })
    );
  }, [data]);

  return {
    data: projectItemRows,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount: data?.pages[0]?.totalCount ?? 0,
    totalPages: data?.pages[0]?.totalPages ?? 0,
    currentPage: data?.pages[0]?.page ?? 1,
    pageSize: data?.pages[0]?.pageSize ?? 500,
    hasPrevious: data?.pages[0]?.hasPrevious ?? false,
    hasNext: data?.pages[0]?.hasNext ?? false,
    isPending,
    isLoading,
    isError,
    error,
    refetch,
  };
};
