'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export const FACTORS_TABLE_ID = 'factors';

export type FactorRow = {
  id: string;
  factorName: string | null;
  materialCount: number;
};

type UniqueFactorApiItem = {
  name: string | null;
};

type UniqueFactorsApiResponse = PaginationResponse<UniqueFactorApiItem>;

type MaterialFactorApiItem = {
  factorHashId: string;
  materialTypeId: number;
  factorName: string;
  factorValue: string;
  status: string;
  materialTypeName: string;
};

export type MaterialFactorsApiResponse =
  PaginationResponse<MaterialFactorApiItem>;

export type MaterialFactorForFactor = MaterialFactorApiItem;

const PAGE_SIZE = 50;

const fetchAllUniqueFactors = async (
  signal?: AbortSignal
): Promise<UniqueFactorApiItem[]> => {
  let page = 1;
  const all: UniqueFactorApiItem[] = [];

  // Fetch until API reports there is no next page
  // Uses server-side pagination metadata (hasNext, totalPages, etc.)
  // to avoid hardcoding page counts.
  // If the API shape changes, this loop will still terminate
  // when hasNext is false.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await apiFetch<UniqueFactorsApiResponse>(
      'v2/uniquefactorslist',
      {
        params: {
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      }
    );

    all.push(...response.data);

    if (!response.hasNext) {
      break;
    }

    page += 1;
  }

  return all;
};

const fetchAllMaterialFactors = async (
  signal?: AbortSignal
): Promise<MaterialFactorApiItem[]> => {
  let page = 1;
  const all: MaterialFactorApiItem[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await apiFetch<MaterialFactorsApiResponse>(
      'v2/materiallistfactorwise',
      {
        params: {
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      }
    );

    all.push(...response.data);

    if (!response.hasNext) {
      break;
    }

    page += 1;
  }

  return all;
};

export const fetchMergedFactors = async (
  search: string,
  signal?: AbortSignal
): Promise<{
  factorsPage: PaginationResponse<FactorRow>;
  materialsByFactor: Record<string, MaterialFactorForFactor[]>;
}> => {
  const [uniqueFactors, materialFactors] = await Promise.all([
    fetchAllUniqueFactors(signal),
    fetchAllMaterialFactors(signal),
  ]);

  // Count how many materials exist for each factor name
  const materialsByFactor = materialFactors.reduce(
    (acc, item) => {
      const key = item.factorName ?? '';
      const list = acc[key] ?? [];
      list.push(item);
      acc[key] = list;
      return acc;
    },
    {} as Record<string, MaterialFactorForFactor[]>
  );

  const rows: FactorRow[] = [];

  uniqueFactors.forEach((factor, factorIndex) => {
    const factorName = factor.name ?? '';
    const materials = materialsByFactor[factorName] ?? [];
    const materialCount = materials.length;

    rows.push({
      id: `factor-${factorIndex}`,
      factorName: factor.name,
      materialCount,
    });
  });

  const trimmedSearch = search?.trim().toLowerCase();

  const filteredRows = trimmedSearch
    ? rows.filter((row) => {
        const factor = row.factorName?.toLowerCase() ?? '';
        return factor.includes(trimmedSearch);
      })
    : rows;

  const paginationResponse: PaginationResponse<FactorRow> = {
    data: filteredRows,
    totalCount: filteredRows.length,
    page: 1,
    pageSize: filteredRows.length || 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
    isSuccess: true,
    statusCode: 200,
    message: 'Factors merged successfully.',
  };

  return {
    factorsPage: paginationResponse,
    materialsByFactor,
  };
};

type UseFactorsQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export const useFactorsQuery = ({
  search,
  filters,
  sorting,
}: UseFactorsQueryParams) => {
  const queryClient = useQueryClient();

  const materialsByFactorRef = React.useRef<
    Record<string, MaterialFactorForFactor[]>
  >({});

  // Currently, filters and sorting are not sent to the API endpoints
  // because the external APIs do not expose corresponding parameters.
  // They are included in the query key so that any future use of them
  // will correctly invalidate and refetch the data.
  const query = useInfiniteQuery({
    queryKey: [FACTORS_TABLE_ID, [search, filters, sorting]],
    queryFn: async ({ signal }) => {
      const { factorsPage, materialsByFactor } = await fetchMergedFactors(
        search,
        signal
      );
      materialsByFactorRef.current = materialsByFactor;
      return factorsPage;
    },
    getNextPageParam: () => undefined,
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    getMaterialsForFactor: (factorName: string | null) =>
      materialsByFactorRef.current[factorName ?? ''] ?? [],
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [FACTORS_TABLE_ID] }),
  };
};

