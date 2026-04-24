import type { Database, Json } from '@kkm/db';
import type { SupabaseClient } from '@supabase/supabase-js';

import { composeAccessTokenContext } from '@/lib/auth';
import { normalizeError } from '@/lib/supabase/errors';
import type { PaginationResponse } from '@/types/common';
import type {
  ClientAddress,
  ClientContact,
  ClientMeta,
} from '@/types/clients';

import {
  buildClientMetaPatch,
  serializeClientAddresses,
  serializeClientContacts,
} from './client-meta';

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

export type ClientsListParams = {
  search?: string;
  status?: string[] | null;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type ClientScheduleAssignment = {
  schedule_source_id: string;
  is_default: boolean;
};

export type CreateClientInput = {
  display_name: string;
  full_name: string | null;
  status: string;
  meta: ClientMeta;
  addresses: ClientAddress[];
  contacts: ClientContact[];
  schedules: ClientScheduleAssignment[];
};

export type UpdateClientInput = {
  clientId: string;
  display_name?: string;
  full_name?: string | null;
  status?: string;
  metaPatch?: ClientMeta;
  baseMeta?: Json | null;
  addresses?: ClientAddress[];
  contacts?: ClientContact[];
  schedules?: ClientScheduleAssignment[];
};

type ExistingScheduleRow = {
  id: string;
  schedule_source_id: string;
  is_default: boolean;
};

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

async function syncClientSchedules(
  supabase: SupabaseClient<Database>,
  clientId: string,
  schedules: ClientScheduleAssignment[]
): Promise<void> {
  const defaults = schedules.filter((s) => s.is_default);
  if (defaults.length > 1) {
    throw new Error('Only one schedule can be marked as default.');
  }

  const { data: existingData, error: fetchError } = await supabase
    .from('client_schedules')
    .select('id, schedule_source_id, is_default')
    .eq('client_id', clientId);
  if (fetchError) {
    throw normalizeError(fetchError);
  }

  const existing = (existingData ?? []) as ExistingScheduleRow[];
  const existingBySsid = new Map<string, ExistingScheduleRow>();
  for (const row of existing) {
    existingBySsid.set(row.schedule_source_id, row);
  }

  const desiredIds = new Set(schedules.map((s) => s.schedule_source_id));

  const idsToDelete = existing
    .filter((row) => !desiredIds.has(row.schedule_source_id))
    .map((row) => row.id);
  if (idsToDelete.length > 0) {
    const { error: delError } = await supabase
      .from('client_schedules')
      .delete()
      .in('id', idsToDelete);
    if (delError) {
      throw normalizeError(delError);
    }
  }

  const inserts = schedules
    .filter((s) => !existingBySsid.has(s.schedule_source_id))
    .map((s) => ({
      client_id: clientId,
      schedule_source_id: s.schedule_source_id,
      is_active: true,
      is_default: false,
    }));
  if (inserts.length > 0) {
    const { error: insError } = await supabase
      .from('client_schedules')
      .insert(inserts);
    if (insError) {
      throw normalizeError(insError);
    }
  }

  const defaultAssignment = defaults[0];
  if (defaultAssignment) {
    const { error: rpcError } = await supabase.rpc(
      'set_default_client_schedule',
      {
        p_client_id: clientId,
        p_schedule_source_id: defaultAssignment.schedule_source_id,
      }
    );
    if (rpcError) {
      throw normalizeError(rpcError);
    }
  } else if (existing.some((row) => row.is_default)) {
    const { error: clearError } = await supabase
      .from('client_schedules')
      .update({ is_default: false })
      .eq('client_id', clientId);
    if (clearError) {
      throw normalizeError(clearError);
    }
  }
}

async function fetchClients(
  supabase: SupabaseClient<Database>,
  params: ClientsListParams,
  signal?: AbortSignal
): Promise<PaginationResponse<ClientsListRow>> {
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
  if (signal) {
    rpc = rpc.abortSignal(signal);
  }
  const { data, error } = await rpc;
  if (error) {
    throw normalizeError(error);
  }

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

async function fetchClientDetail(
  supabase: SupabaseClient<Database>,
  clientId: string,
  signal?: AbortSignal
): Promise<ClientDetail> {
  let clientQuery = supabase.from('clients').select('*').eq('id', clientId);
  if (signal) {
    clientQuery = clientQuery.abortSignal(signal);
  }
  const { data: client, error: ce } = await clientQuery.single();
  if (ce) {
    throw normalizeError(ce);
  }
  if (!client) {
    throw new Error('Client not found');
  }

  let schedQuery = supabase
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
  if (signal) {
    schedQuery = schedQuery.abortSignal(signal);
  }
  const { data: schedules, error: se } = await schedQuery;
  if (se) {
    throw normalizeError(se);
  }

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

async function createClient(
  supabase: SupabaseClient<Database>,
  input: CreateClientInput,
  signal?: AbortSignal
): Promise<ClientsRow> {
  const { data: sessionData } = await supabase.auth.getSession();
  const tenantId = composeAccessTokenContext(
    sessionData.session?.access_token
  ).claims?.tid;
  if (!tenantId) {
    throw new Error('Missing tenant in session');
  }

  const metaJson = buildClientMetaPatch({}, input.meta);
  const addressesJson = serializeClientAddresses(input.addresses);
  const contactsJson = serializeClientContacts(input.contacts);
  const clientId = crypto.randomUUID();

  const insertRow = {
    id: clientId,
    display_name: input.display_name,
    full_name: input.full_name,
    status: input.status,
    meta: metaJson,
    addresses: addressesJson,
    contacts: contactsJson,
  } as ClientsInsert;

  let ins = supabase.from('clients').insert(insertRow);
  if (signal) {
    ins = ins.abortSignal(signal);
  }
  const { error: clientError } = await ins;
  if (clientError) {
    throw normalizeError(clientError);
  }

  const nowIso = new Date().toISOString();
  const clientRow: ClientsRow = {
    id: clientId,
    tenant_id: tenantId,
    display_name: input.display_name,
    full_name: input.full_name,
    status: input.status,
    meta: metaJson,
    addresses: addressesJson,
    contacts: contactsJson,
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (input.schedules.length > 0) {
    try {
      await syncClientSchedules(supabase, clientRow.id, input.schedules);
    } catch (e) {
      await supabase.from('clients').delete().eq('id', clientRow.id);
      throw e;
    }
  }

  return clientRow;
}

async function updateClient(
  supabase: SupabaseClient<Database>,
  input: UpdateClientInput,
  signal?: AbortSignal
): Promise<void> {
  const patch: ClientsUpdate = {};

  if (input.display_name !== undefined) {
    patch.display_name = input.display_name;
  }
  if (input.full_name !== undefined) {
    patch.full_name = input.full_name;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.addresses !== undefined) {
    patch.addresses = serializeClientAddresses(input.addresses);
  }
  if (input.contacts !== undefined) {
    patch.contacts = serializeClientContacts(input.contacts);
  }
  if (input.metaPatch && Object.keys(input.metaPatch).length > 0) {
    patch.meta = buildClientMetaPatch(input.baseMeta ?? {}, input.metaPatch);
  }

  if (Object.keys(patch).length > 0) {
    let q = supabase.from('clients').update(patch).eq('id', input.clientId);
    if (signal) {
      q = q.abortSignal(signal);
    }
    const { error } = await q;
    if (error) {
      throw normalizeError(error);
    }
  }

  if (input.schedules !== undefined) {
    await syncClientSchedules(supabase, input.clientId, input.schedules);
  }
}

async function deleteClient(
  supabase: SupabaseClient<Database>,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('clients').delete().eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

export {
  createClient,
  deleteClient,
  fetchClientDetail,
  fetchClients,
  updateClient,
};
