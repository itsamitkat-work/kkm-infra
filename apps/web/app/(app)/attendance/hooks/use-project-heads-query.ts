'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

export const PROJECT_HEADS_QUERY_ID = 'project-heads';

interface ProjectHeadApiResponse {
  head: string;
}

type ProjectHeadsApiResponse = PaginationResponse<ProjectHeadApiResponse>;

export interface HeadOption {
  head: string;
  label: string;
}

// Transform head string to a readable label
function formatHeadLabel(head: string): string {
  // Convert to title case: "EARTH WORK" -> "Earth Work", "NEW TECHNOLOGIES" -> "New Technologies"
  return head
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const fetchProjectHeads = async (
  projectHashId: string,
  signal?: AbortSignal
): Promise<HeadOption[]> => {
  const params = new URLSearchParams({
    ProjectHashId: projectHashId,
  });

  const response = await apiFetch<ProjectHeadsApiResponse>(
    `v2/project/head?${params.toString()}`,
    {
      signal,
    }
  );

  // Transform API response to HeadOption format
  return response.data
    .filter(
      (item) =>
        item.head !== null && item.head !== undefined && item.head !== ''
    )
    .map((item) => ({
      head: item.head,
      label: formatHeadLabel(item.head),
    }));
};

export const useProjectHeadsQuery = (projectHashId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [PROJECT_HEADS_QUERY_ID, projectHashId],
    queryFn: ({ signal }) => fetchProjectHeads(projectHashId!, signal),
    enabled: !!projectHashId,
    staleTime: Infinity,
  });

  const heads = React.useMemo(() => {
    return query.data ?? [];
  }, [query.data]);

  return {
    query,
    heads,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [PROJECT_HEADS_QUERY_ID] }),
  };
};
