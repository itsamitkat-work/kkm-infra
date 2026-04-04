'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchEmployeeTypes } from '@/app/(app)/administration/employee-types/hooks/use-employee-types-query';
import { fetchDesignations } from '@/app/(app)/administration/designations/hooks/use-designations-query';

// Fetch all employee types for filter options
function useEmployeeTypesOptions() {
  const query = useInfiniteQuery({
    queryKey: ['employee-types-options'],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchEmployeeTypes('', pageParam as number, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-fetch all pages
  const { hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = query;
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const allOptions = React.useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data]);

  return {
    options: allOptions.map((item) => ({
      value: item.hashId,
      label: item.name,
    })),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

// Fetch all designations for filter options
function useDesignationsOptions() {
  const query = useInfiniteQuery({
    queryKey: ['designations-options'],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchDesignations('', pageParam as number, [], {}, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-fetch all pages
  const { hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = query;
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const allOptions = React.useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data]);

  return {
    options: allOptions.map((item) => ({
      value: item.hashId,
      label: item.name,
    })),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

export function useEmployeeFilterOptions() {
  const employeeTypes = useEmployeeTypesOptions();
  const designations = useDesignationsOptions();

  return {
    employeeTypes: employeeTypes.options,
    designations: designations.options,
    isLoading: employeeTypes.isLoading || designations.isLoading,
    isFetching: employeeTypes.isFetching || designations.isFetching,
  };
}
