'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchEmployeeTypes } from '@/app/(app)/administration/employee-types/hooks/use-employee-types-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

// Define minimal Employee type for filter purposes
interface EmployeeForFilter {
  id: string;
  name: string;
}

// Custom fetch function for workers with larger page size
async function fetchWorkers(
  workerTypeHashId: string,
  page: number = 1,
  signal?: AbortSignal
): Promise<PaginationResponse<EmployeeForFilter>> {
  const params = new URLSearchParams();
  params.append('employeeType', workerTypeHashId);
  params.append('Page', page.toString());
  params.append('PageSize', '500'); // Fetch 500 employees per page for filters

  const queryString = params.toString();
  const url = queryString ? `v2/employee?${queryString}` : 'v2/employee';

  interface EmployeesApiResponse {
    isSuccess: boolean;
    data: Array<{
      id: string;
      name: string;
    }>;
    message: string;
    statusCode: number;
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  }

  const response = await apiFetch<EmployeesApiResponse>(url, { signal });

  // Map to simplified Employee type (only id and name needed for filters)
  const mappedData: EmployeeForFilter[] = response.data.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  return {
    data: mappedData,
    totalCount: response.totalCount,
    totalPages: response.totalPages,
    page: response.page,
    pageSize: response.pageSize,
    hasPrevious: response.hasPrevious,
    hasNext: response.hasNext,
    isSuccess: response.isSuccess,
    statusCode: response.statusCode,
    message: response.message,
  };
}

export function useWorkers() {
  // First, fetch all employee types to find "Worker"
  const employeeTypesQuery = useInfiniteQuery({
    queryKey: ['employee-types-for-workers'],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchEmployeeTypes('Worker', pageParam, signal),
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > 1) {
        return 2; // There should only be one page for "Worker" search
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  // Find the Worker employee type hashId
  const workerTypeHashId = React.useMemo(() => {
    if (!employeeTypesQuery.data?.pages) return null;
    const workerType = employeeTypesQuery.data.pages
      .flatMap((page) => page.data)
      .find((type) => type.name === 'Worker');
    return workerType?.hashId || null;
  }, [employeeTypesQuery.data]);

  // Fetch employees with Worker employee type (500 per page)
  const employeesQuery = useInfiniteQuery({
    queryKey: ['workers', workerTypeHashId],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchWorkers(workerTypeHashId as string, pageParam, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
    enabled: !!workerTypeHashId, // Only fetch employees if we have the worker type hashId
  });

  // Auto-fetch all pages
  React.useEffect(() => {
    if (
      employeesQuery.hasNextPage &&
      !employeesQuery.isFetchingNextPage &&
      !employeesQuery.isLoading
    ) {
      employeesQuery.fetchNextPage();
    }
  }, [
    employeesQuery.hasNextPage,
    employeesQuery.isFetchingNextPage,
    employeesQuery.isLoading,
    employeesQuery.fetchNextPage,
    employeesQuery,
  ]);

  // Convert to filter options
  const workerOptions = React.useMemo(() => {
    if (!employeesQuery.data?.pages) return [];
    return employeesQuery.data.pages
      .flatMap((page) => page.data)
      .map((employee) => ({
        value: employee.id,
        label: employee.name,
      }));
  }, [employeesQuery.data]);

  return {
    options: workerOptions,
    isLoading: employeeTypesQuery.isLoading || employeesQuery.isLoading,
    isFetching: employeeTypesQuery.isFetching || employeesQuery.isFetching,
  };
}
