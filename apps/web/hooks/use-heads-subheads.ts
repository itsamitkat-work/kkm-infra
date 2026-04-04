'use client';

import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

export const HEADS_SUBHEADS_QUERY_ID = 'heads-subheads';
const PAGE_SIZE = 50;

interface HeadItem {
  head: string;
}

interface SubheadItem {
  subhead: string;
  head: string;
}

type HeadsApiResponse = PaginationResponse<HeadItem>;
type SubheadsApiResponse = PaginationResponse<SubheadItem>;

export interface HeadOption {
  head: string;
  label: string;
}

export interface SubheadOption {
  value: string;
  label: string;
}

export interface HeadWithSubheads {
  head: string;
  subheads: SubheadItem[];
}

function formatHeadLabel(head: string): string {
  return head
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function fetchHeadsPage(
  page: number,
  signal?: AbortSignal
): Promise<HeadsApiResponse> {
  const url = `v2/items/heads?page=${page}&pageSize=${PAGE_SIZE}`;
  return apiFetch<HeadsApiResponse>(url, { signal });
}

async function fetchSubheadsPage(
  page: number,
  signal?: AbortSignal
): Promise<SubheadsApiResponse> {
  const url = `v2/items/subheads?page=${page}&pageSize=${PAGE_SIZE}`;
  return apiFetch<SubheadsApiResponse>(url, { signal });
}

export function useHeadsSubheads() {
  const queryClient = useQueryClient();

  const headsQuery = useInfiniteQuery({
    queryKey: [HEADS_SUBHEADS_QUERY_ID, 'heads'],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchHeadsPage(pageParam as number, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNext && lastPage.page < lastPage.totalPages) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  const subheadsQuery = useInfiniteQuery({
    queryKey: [HEADS_SUBHEADS_QUERY_ID, 'subheads'],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchSubheadsPage(pageParam as number, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNext && lastPage.page < lastPage.totalPages) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  React.useEffect(() => {
    if (
      headsQuery.hasNextPage &&
      !headsQuery.isFetchingNextPage &&
      !headsQuery.isLoading
    ) {
      headsQuery.fetchNextPage();
    }
  }, [
    headsQuery.hasNextPage,
    headsQuery.isFetchingNextPage,
    headsQuery.isLoading,
    headsQuery.fetchNextPage,
  ]);

  React.useEffect(() => {
    if (
      subheadsQuery.hasNextPage &&
      !subheadsQuery.isFetchingNextPage &&
      !subheadsQuery.isLoading
    ) {
      subheadsQuery.fetchNextPage();
    }
  }, [
    subheadsQuery.hasNextPage,
    subheadsQuery.isFetchingNextPage,
    subheadsQuery.isLoading,
    subheadsQuery.fetchNextPage,
  ]);

  const heads = React.useMemo(() => {
    if (!headsQuery.data?.pages) return [];
    return headsQuery.data.pages.flatMap((page) => page.data);
  }, [headsQuery.data]);

  const subheads = React.useMemo(() => {
    if (!subheadsQuery.data?.pages) return [];
    return subheadsQuery.data.pages.flatMap((page) => page.data);
  }, [subheadsQuery.data]);

  const headOptions: HeadOption[] = React.useMemo(
    () => heads.map(({ head }) => ({ head, label: formatHeadLabel(head) })),
    [heads]
  );

  const subheadOptions: SubheadOption[] = React.useMemo(
    () =>
      subheads.map(({ subhead, head }) => ({
        value: subhead,
        label: `${subhead} · Head: ${head}`,
      })),
    [subheads]
  );

  const headsWithSubheads: HeadWithSubheads[] = React.useMemo(() => {
    return heads.map(({ head }) => ({
      head,
      subheads: subheads.filter((s) => s.head === head),
    }));
  }, [heads, subheads]);

  const isLoading = headsQuery.isLoading || subheadsQuery.isLoading;
  const isFetching = headsQuery.isFetching || subheadsQuery.isFetching;
  const isError = headsQuery.isError || subheadsQuery.isError;

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [HEADS_SUBHEADS_QUERY_ID] });
  }, [queryClient]);

  return {
    heads,
    subheads,
    headOptions,
    subheadOptions,
    headsWithSubheads,
    query: { heads: headsQuery, subheads: subheadsQuery },
    isLoading,
    isFetching,
    isError,
    invalidate,
  };
}
