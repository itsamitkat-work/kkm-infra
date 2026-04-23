'use client';

import { useQuery } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { DeviationReportType, DeviationResponse } from '../types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@kkm/db';

type DeviationComparison =
  Database['public']['Enums']['project_deviation_comparison'];

function applyClientFilters(
  rows: DeviationResponse[],
  filters?: Record<string, Filter>
): DeviationResponse[] {
  if (!filters || Object.keys(filters).length === 0) {
    return rows;
  }
  return rows.filter((row) => {
    for (const key of Object.keys(filters)) {
      const filter = filters[key];
      if (!filter?.values?.length) {
        continue;
      }
      const v = filter.values[0];
      if (key === 'name' && typeof v === 'string') {
        if (!String(row.name).toLowerCase().includes(v.toLowerCase())) {
          return false;
        }
      }
    }
    return true;
  });
}

function applyClientSort(
  rows: DeviationResponse[],
  sorting?: SortingState
): DeviationResponse[] {
  if (!sorting?.length) {
    return [...rows].sort((a, b) => {
      const sa = String(a.srNo);
      const sb = String(b.srNo);
      return sa.localeCompare(sb, undefined, { numeric: true });
    });
  }
  const s = sorting[0];
  const dir = s.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[s.id];
    const bv = (b as unknown as Record<string, unknown>)[s.id];
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * dir;
    }
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

/**
 * Fetches all deviation rows for the project in one RPC call (no paging).
 */
export const fetchDeviationReportItems = async (
  id: string,
  _page?: number,
  _pageSize?: number,
  filters?: Record<string, Filter>,
  sorting?: SortingState,
  type?: DeviationReportType
): Promise<PaginationResponse<DeviationResponse>> => {
  if (!id) {
    throw new Error('Project ID is required');
  }
  if (!type) {
    throw new Error('Deviation comparison type is required');
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('rpc_project_deviation_rows', {
    p_project_id: id,
    p_comparison: type as DeviationComparison,
  });

  if (error) {
    console.error('Failed to fetch deviation rows:', error);
    throw error;
  }

  const rawRows = (data ?? []) as {
    work_order_number: string;
    item_description: string;
    rate_amount: number | null;
    quantity_reference: number | null;
    quantity_compare: number | null;
  }[];

  let mapped: DeviationResponse[] = rawRows.map((r) => ({
    srNo: r.work_order_number,
    type,
    name: r.item_description,
    rate: Number(r.rate_amount ?? 0),
    quantity1: Number(r.quantity_reference ?? 0),
    quantity2: Number(r.quantity_compare ?? 0),
  }));

  mapped = applyClientFilters(mapped, filters);
  mapped = applyClientSort(mapped, sorting);

  const totalCount = mapped.length;
  const pageSize = Math.max(totalCount, 1);

  return {
    data: mapped,
    totalCount,
    page: 1,
    pageSize,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
};

export const useDeviationReportItemsList = ({
  id,
  filters,
  sorting,
  type,
}: {
  id: string;
  pageSize?: number;
  filters?: Record<string, Filter>;
  sorting?: SortingState;
  type: DeviationReportType;
}) => {
  const { data, isLoading, isError, error, refetch, isFetching, isPending } =
    useQuery({
      queryKey: ['deviations', id, { filters, sorting, type }],
      queryFn: () =>
        fetchDeviationReportItems(
          id,
          undefined,
          undefined,
          filters,
          sorting,
          type
        ),
      enabled: !!id && !!type,
    });

  return {
    data: data?.data ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    currentPage: data?.page ?? 1,
    pageSize: data?.pageSize ?? 0,
    hasPrevious: data?.hasPrevious ?? false,
    hasNext: data?.hasNext ?? false,
    isLoading,
    isFetching,
    isPending,
    isError,
    error,
    refetch,
  };
};
