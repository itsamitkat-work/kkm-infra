import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import React from 'react';

export interface Client {
  hashId: string;
  name: string;
  scheduleName: string;
  address: string;
  fullName: string;
  mdcontact: string;
  cpcontact: string;
  gstn?: string; // gstn is not in the API response, so it's optional
}

export type ClientApiResponse = PaginationResponse<Client>;

export interface ClientListParams {
  search?: string;
  searchField?: string;
}

export interface ClientOption {
  hashId: string;
  name: string;
  scheduleName: string;
  address: string;
  fullName: string;
  mdcontact: string;
  cpcontact: string;
  gstn?: string;
  value: string;
  label: string;
}

export interface ClientOptionsResponse {
  options: ClientOption[];
  hasNextPage: boolean;
}

/**
 * Fetches clients from the API with pagination support
 */
export const fetchClients = async (
  params: ClientListParams & { page?: number } = {}
): Promise<ClientApiResponse> => {
  const { search = '', searchField = '', page = 1 } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
  });

  if (search) {
    queryParams.append('Name', search);
  }

  if (searchField) {
    queryParams.append('searchBy', searchField);
  }

  return apiFetch<ClientApiResponse>(`/v2/client?${queryParams.toString()}`);
};

export const useClients = (params: ClientListParams = {}) => {
  const { search, searchField } = params;

  const queryResult = useInfiniteQuery({
    queryKey: ['clients', search, searchField],
    queryFn: ({ pageParam = 1 }) =>
      fetchClients({ search, searchField, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNext) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    ...rest
  } = queryResult;

  // Automatically fetch all pages for the current query
  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  const clients = React.useMemo(() => {
    return (
      (data as InfiniteData<ClientApiResponse> | undefined)?.pages.flatMap(
        (page: ClientApiResponse) => page.data
      ) ?? []
    );
  }, [data]);

  return {
    data: clients,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    ...rest,
  };
};

/**
 * Helper function to fetch client options for FormSearchableComboboxField
 * Transforms client data into the format expected by form components
 */
export const fetchClientOptions = async (
  search: string,
  page: number = 1
): Promise<ClientOptionsResponse> => {
  try {
    const response = await fetchClients({ search, searchField: 'name', page });

    const options: ClientOption[] = response.data.map((client) => ({
      ...client,
      value: client.hashId,
      label: client.scheduleName,
    }));

    return {
      options,
      hasNextPage: response.hasNext,
    };
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw new Error('Failed to fetch clients');
  }
};
