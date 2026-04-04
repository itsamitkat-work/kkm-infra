'use client';

import * as React from 'react';
import { useProjectsQuery } from '@/app/(app)/projects/hooks/use-projects-query';

/**
 * Fetches all project pages and returns a flattened list. Use for dropdowns,
 * filters, and any UI that needs the full project list without pagination.
 */
export function useProjects() {
  const { query } = useProjectsQuery({
    search: '',
    filters: [],
    sorting: [],
  });

  React.useEffect(() => {
    if (
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      !query.isLoading &&
      !query.isError
    ) {
      query.fetchNextPage();
    }
  }, [
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isLoading,
    query.isError,
    query.fetchNextPage,
    query,
  ]);

  const projects = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  return {
    projects,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}
