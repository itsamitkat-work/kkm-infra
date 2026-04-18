'use client';

import * as React from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';
import type { Filter } from '@/components/ui/filters';
import type { PaginationResponse } from '@/types/common';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Database, Json } from '@kkm/db';
import type {
  ClientAddress,
  ClientContact,
  ClientMeta,
} from '@/types/clients';
import {
  parseClientAddresses,
  parseClientContacts,
  parseClientMeta,
  buildClientMetaPatch,
} from '@/lib/clients/client-meta';
import {
  createClientWithRelations,
  updateClientWithRelations,
  type ClientScheduleAssignment,
  type CreateClientPersistInput,
  type UpdateClientPersistInput,
} from '@/lib/clients/persist-client';

type ClientsTable = Database['public']['Tables']['clients'];

export type ClientsRow = ClientsTable['Row'];
export type ClientsInsert = ClientsTable['Insert'];
export type ClientsUpdate = ClientsTable['Update'];

export type ClientsListRpcRow =
  Database['public']['Functions']['list_clients']['Returns'][number];

export type ClientsListRow = ClientsListRpcRow;

export type ClientScheduleDetail = {
  id: string;
  schedule_source_id: string;
  is_default: boolean;
  is_active: boolean;
  schedule_sources: {
    id: string;
    display_name: string | null;
    name: string | null;
  } | null;
};

export type ClientDetail = ClientsRow & {
  client_schedules: ClientScheduleDetail[];
  default_schedule_source_id: string | null;
  default_schedule_display_name: string | null;
};

export const CLIENTS_QUERY_KEY = 'clients';

export const CLIENTS_TABLE_ID = CLIENTS_QUERY_KEY;

export type ClientsListParams = {
  search?: string;
  status?: string[] | null;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
};

function getSupabase() {
  return createSupabaseBrowserClient();
}

function sortColumnToRpc(sortId: string): string {
  const allowed = new Set([
    'display_name',
    'full_name',
    'status',
    'created_at',
    'updated_at',
  ]);
  return allowed.has(sortId) ? sortId : 'created_at';
}

export function buildClientsListParamsFromFilters(
  filters: Filter[]
): Pick<ClientsListParams, 'status'> {
  const out: Pick<ClientsListParams, 'status'> = {};
  for (const f of filters) {
    if (f.field === 'status' && f.values.length > 0) {
      out.status = f.values.map(String);
    }
  }
  return out;
}

export async function fetchClients(
  params: ClientsListParams
): Promise<PaginationResponse<ClientsListRow>> {
  const supabase = getSupabase();
  const pageSize = params.pageSize ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * pageSize;

  const sortCol = sortColumnToRpc(params.sortBy ?? 'created_at');
  const sortDir = params.order === 'asc' ? 'asc' : 'desc';

  let rpc = supabase.rpc('list_clients', {
    p_search: params.search?.trim() || undefined,
    p_status: params.status?.length ? params.status : undefined,
    p_sort_by: sortCol,
    p_sort_dir: sortDir,
    p_limit: pageSize,
    p_offset: offset,
  });
  if (params.signal) {
    rpc = rpc.abortSignal(params.signal);
  }
  const { data, error } = await rpc;
  if (error) throw error;

  const rows = (data ?? []) as ClientsListRow[];
  const totalCount = Number(rows[0]?.total_count ?? 0);

  return {
    data: rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    hasPrevious: page > 1,
    hasNext: offset + rows.length < totalCount,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
}

export function invalidateClientsQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] });
}

export function useClientsQuery(params: {
  search: string;
  filters: Filter[];
  sorting: SortingState;
}) {
  const queryClient = useQueryClient();

  const listParams: ClientsListParams = React.useMemo(() => {
    const fromFilters = buildClientsListParamsFromFilters(params.filters);
    const out: ClientsListParams = {
      search: params.search,
      ...fromFilters,
    };
    if (params.sorting.length > 0) {
      const sort = params.sorting[0];
      out.sortBy = sort.id;
      out.order = sort.desc ? 'desc' : 'asc';
    }
    return out;
  }, [params.search, params.filters, params.sorting]);

  const query = useInfiniteQuery({
    queryKey: [CLIENTS_QUERY_KEY, listParams],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchClients({
        ...listParams,
        page: pageParam as number,
        pageSize: 20,
        signal,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] }),
  };
}

export async function fetchClientDetail(clientId: string): Promise<ClientDetail> {
  const supabase = getSupabase();

  const { data: client, error: ce } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  if (ce) throw ce;
  if (!client) throw new Error('Client not found');

  const { data: schedules, error: se } = await supabase
    .from('client_schedules')
    .select(
      `
      id,
      schedule_source_id,
      is_default,
      is_active,
      schedule_sources ( id, display_name, name )
    `
    )
    .eq('client_id', clientId);
  if (se) throw se;

  const schedRows = (schedules ?? []) as ClientScheduleDetail[];
  const defaultSched = schedRows.find((s) => s.is_default && s.is_active);
  const default_schedule_source_id = defaultSched?.schedule_source_id ?? null;
  const default_schedule_display_name =
    defaultSched?.schedule_sources?.display_name ??
    defaultSched?.schedule_sources?.name ??
    null;

  return {
    ...client,
    client_schedules: schedRows,
    default_schedule_source_id,
    default_schedule_display_name,
  };
}

export function useClient(clientId: string | undefined) {
  const query = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => fetchClientDetail(clientId!),
    enabled: Boolean(clientId),
    staleTime: 5 * 60 * 1000,
  });

  return {
    client: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

async function createClientApi(input: CreateClientPersistInput): Promise<void> {
  const supabase = getSupabase();
  await createClientWithRelations(supabase, input);
}

async function updateClientApi(input: UpdateClientPersistInput): Promise<void> {
  const supabase = getSupabase();
  await updateClientWithRelations(supabase, input);
}

async function deleteClientApi(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClientApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to create client.', { duration: Infinity }),
    onSuccess: () => toast.success('Client created.'),
    onSettled: () => invalidateClientsQueries(queryClient),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClientApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to update client.', { duration: Infinity }),
    onSuccess: () => toast.success('Client updated.'),
    onSettled: (_data, _err, variables) => {
      invalidateClientsQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClientApi,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete client.', { duration: Infinity }),
    onSuccess: () => toast.success('Client deleted.'),
    onSettled: () => invalidateClientsQueries(queryClient),
  });
}

export type CreateClientApiInput = CreateClientPersistInput;
export type UpdateClientApiInput = UpdateClientPersistInput;
export type { ClientScheduleAssignment };

export {
  parseClientMeta,
  parseClientAddresses,
  parseClientContacts,
};

export function mergeClientMetaForUpdate(
  baseMeta: Json | null,
  partial: ClientMeta
): Json {
  return buildClientMetaPatch(baseMeta, partial);
}

export type { ClientAddress, ClientContact, ClientMeta };
