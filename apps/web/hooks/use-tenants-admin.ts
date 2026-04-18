'use client';

import * as React from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SortingState } from '@tanstack/react-table';

import type { Filter } from '@/components/ui/filters';
import type { PaginationResponse } from '@/types/common';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

export type TenantAdminRow = {
  id: string;
  name: string;
  display_name: string | null;
  slug: string;
  created_at: string;
};

export const TENANTS_ADMIN_QUERY_KEY = 'tenants-admin';

export const TENANTS_ADMIN_TABLE_ID = TENANTS_ADMIN_QUERY_KEY;

function getSupabase() {
  return createSupabaseBrowserClient();
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export type TenantsAdminListParams = {
  search?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const SORTABLE_COLUMNS = new Set([
  'display_name',
  'slug',
  'name',
  'created_at',
]);

export async function fetchTenantsAdmin(
  params: TenantsAdminListParams,
): Promise<PaginationResponse<TenantAdminRow>> {
  const supabase = getSupabase();
  const pageSize = params.pageSize ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tenants')
    .select('id, name, display_name, slug, created_at', { count: 'exact' });

  if (params.search && params.search.trim().length > 0) {
    const s = escapeIlike(params.search.trim());
    query = query.or(
      `name.ilike.%${s}%,display_name.ilike.%${s}%,slug.ilike.%${s}%`,
    );
  }

  const sortKey =
    params.sortBy && SORTABLE_COLUMNS.has(params.sortBy)
      ? params.sortBy
      : 'display_name';
  const ascending = params.order !== 'desc';
  query = query.order(sortKey, { ascending, nullsFirst: false });

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as TenantAdminRow[];
  const totalCount = count ?? 0;

  return {
    data: rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    hasPrevious: page > 1,
    hasNext: page * pageSize < totalCount,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
}

export function useTenantsAdminQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(params.search, 500);

  const listParams: TenantsAdminListParams = React.useMemo(() => {
    const out: TenantsAdminListParams = { search: debouncedSearch };
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [debouncedSearch, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: [TENANTS_ADMIN_QUERY_KEY, listParams, params.filters],
    queryFn: ({ pageParam = 1 }) =>
      fetchTenantsAdmin({
        ...listParams,
        page: pageParam as number,
        pageSize: 20,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: 30_000,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [TENANTS_ADMIN_QUERY_KEY] }),
  };
}

async function deleteTenantAdminApi(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('tenants').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export function useDeleteTenantAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTenantAdminApi,
    onMutate: () => {
      toast.dismiss();
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to delete tenant.';
      toast.error(message, { duration: Infinity });
    },
    onSuccess: () => {
      toast.success('Tenant deleted.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [TENANTS_ADMIN_QUERY_KEY],
      });
    },
  });
}
