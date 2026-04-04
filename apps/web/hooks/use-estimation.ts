'use client';

import { useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { ProjectItemType } from '@/app/projects/[id]/estimation/types';
import React from 'react';

// Types for estimation API response
export interface EstimationItem {
  hashId: string;
  hashid?: string; // wrong fieldname in BE
  description: string;
  no1: number;
  no2: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  createdOn: string; // ISO date string
  checked?: boolean;
  verified?: boolean;
  orderKey?: number; // floating sort order key
}

export type EstimationResponse = PaginationResponse<EstimationItem>;

// Type for mutation payload
export interface EstimationItemPayload {
  hashId?: string; // for updates
  description: string;
  projectItemHashId: string;
  projectHashId: string;
  segmentHashId?: string; // optional, provided when #segment_name is in description
  no1: number;
  no2: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  checked?: boolean;
  verified?: boolean;
  orderKey?: number; // floating sort order key: index * 1000.0
}

type EndpointOperation = 'create' | 'update' | 'delete' | 'fetch';

/**
 * Gets the API endpoint based on the item type and operation
 */
const getEndpoint = (
  type: ProjectItemType,
  operation: EndpointOperation,
  id?: string,
  page?: number
): string => {
  switch (type) {
    case 'EST': {
      switch (operation) {
        case 'create':
        case 'update':
          return '/v2/estimation';
        case 'delete':
          return `/v2/estimation/${id}`;
        case 'fetch': {
          const baseUrl = `/v2/estimation/${id}?status=Active&sortBy=orderKey&order=asc`;
          if (page !== undefined) {
            return `${baseUrl}&page=${page}&pageSize=500`;
          }
          return baseUrl;
        }
      }
    }
    case 'BLG': {
      switch (operation) {
        case 'create':
        case 'update':
          return '/v2/project/billing';
        case 'delete':
          return `/v2/project/billing/${id}`;
        case 'fetch': {
          const baseUrl = `/v2/project/billing/${id}`;
          if (page !== undefined) {
            return `${baseUrl}?page=${page}&pageSize=500`;
          }
          return baseUrl;
        }
      }
    }
    case 'MSR': {
      switch (operation) {
        case 'create':
        case 'update':
          return '/v2/measurement';
        case 'delete':
          return `/v2/measurement/${id}`;
        case 'fetch': {
          const baseUrl = `/v2/measurement/${id}?status=Active&sortBy=orderKey&order=asc`;
          if (page !== undefined) {
            return `${baseUrl}&page=${page}&pageSize=500`;
          }
          return baseUrl;
        }
      }
    }
    case 'GEN':
    default: {
      throw new Error(`Unsupported item type: ${type}`);
    }
  }
};

/**
 * Creates a new estimation item
 */
export const createEstimationItem = async (
  item: Omit<EstimationItemPayload, 'hashId'>,
  type: ProjectItemType
): Promise<{ data: EstimationItem }> => {
  const endpoint = getEndpoint(type, 'create');
  return await apiFetch<{ data: EstimationItem }>(endpoint, {
    method: 'POST',
    data: item,
  });
};

/**
 * Updates an existing estimation item
 */
export const updateEstimationItem = async (
  item: EstimationItemPayload,
  type: ProjectItemType
): Promise<{ data: EstimationItem }> => {
  if (!item.hashId) {
    throw new Error('hashId is required for updating an estimation item.');
  }
  const endpoint = getEndpoint(type, 'update');
  return await apiFetch<{ data: EstimationItem }>(endpoint, {
    method: 'PUT',
    data: item,
  });
};

/**
 * Deletes an estimation item by its ID
 */
export const deleteEstimationItem = async (
  itemId: string,
  type: ProjectItemType
): Promise<{ message: string }> => {
  if (!itemId) {
    throw new Error('Item ID is required for deleting an estimation item.');
  }
  const endpoint = getEndpoint(type, 'delete', itemId);
  return await apiFetch<{ message: string }>(endpoint, {
    method: 'DELETE',
  });
};

export const fetchEstimationData = async (
  estimationId: string,
  type: ProjectItemType,
  page?: number
): Promise<EstimationResponse> => {
  if (!estimationId) {
    throw new Error('Estimation ID is required');
  }

  try {
    const endpoint = getEndpoint(type, 'fetch', estimationId, page);
    return await apiFetch<EstimationResponse>(endpoint);
  } catch (error) {
    console.error('Failed to fetch estimation data:', error);
    throw error;
  }
};

export const useEstimation = (
  estimationId: string,
  type: ProjectItemType,
  enabled?: boolean
) => {
  if (!estimationId) {
    throw new Error('Estimation ID is required for useEstimation');
  }

  const isEnabled =
    enabled !== undefined ? enabled && !!estimationId : !!estimationId;

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['estimation', estimationId, type],
    queryFn: ({ pageParam }) =>
      fetchEstimationData(estimationId, type, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isEnabled,
  });

  // Always automatically fetch all pages
  React.useEffect(() => {
    if (
      isEnabled &&
      infiniteQuery.hasNextPage &&
      !infiniteQuery.isFetchingNextPage &&
      !infiniteQuery.isLoading
    ) {
      infiniteQuery.fetchNextPage();
    }
  }, [isEnabled, infiniteQuery]);

  // Flatten all pages into a single data array for backward compatibility
  const flattenedData = React.useMemo(() => {
    if (!infiniteQuery.data?.pages) {
      return undefined;
    }

    const allItems = infiniteQuery.data.pages.flatMap(
      (page) => page.data || []
    );
    const firstPage = infiniteQuery.data.pages[0];

    return {
      ...firstPage,
      data: allItems,
    };
  }, [infiniteQuery.data]);

  return {
    data: flattenedData,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    refetch: infiniteQuery.refetch,
    // Expose infinite query methods for advanced usage
    fetchNextPage: infiniteQuery.fetchNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
  };
};

/**
 * React hook for managing estimation mutations
 */
export const useEstimationMutations = (
  estimationId: string,
  type: ProjectItemType
) => {
  const createMutation = useMutation({
    mutationFn: (item: Omit<EstimationItemPayload, 'hashId'>) =>
      createEstimationItem(item, type),
  });

  const updateMutation = useMutation({
    mutationFn: (item: EstimationItemPayload) =>
      updateEstimationItem(item, type),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteEstimationItem(itemId, type),
  });

  return { createMutation, updateMutation, deleteMutation };
};
