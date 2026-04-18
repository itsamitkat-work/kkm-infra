import type { Database, Json } from '@kkm/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClientAddress,
  ClientContact,
  ClientMeta,
} from '@/types/clients';
import {
  buildClientMetaPatch,
  serializeClientAddresses,
  serializeClientContacts,
} from '@/lib/clients/client-meta';

type ClientsRow = Database['public']['Tables']['clients']['Row'];
type ClientsInsert = Database['public']['Tables']['clients']['Insert'];
type ClientsUpdate = Database['public']['Tables']['clients']['Update'];

export type ClientScheduleAssignment = {
  schedule_source_id: string;
  is_default: boolean;
};

export type CreateClientPersistInput = {
  display_name: string;
  full_name: string | null;
  gstin: string | null;
  status: string;
  meta: ClientMeta;
  addresses: ClientAddress[];
  contacts: ClientContact[];
  schedules: ClientScheduleAssignment[];
};

export type UpdateClientPersistInput = {
  clientId: string;
  display_name?: string;
  full_name?: string | null;
  gstin?: string | null;
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
  if (fetchError) throw fetchError;

  const existing = (existingData ?? []) as ExistingScheduleRow[];
  const existingBySsid = new Map<string, ExistingScheduleRow>();
  for (const row of existing) existingBySsid.set(row.schedule_source_id, row);

  const desiredIds = new Set(schedules.map((s) => s.schedule_source_id));

  const idsToDelete = existing
    .filter((row) => !desiredIds.has(row.schedule_source_id))
    .map((row) => row.id);
  if (idsToDelete.length > 0) {
    const { error: delError } = await supabase
      .from('client_schedules')
      .delete()
      .in('id', idsToDelete);
    if (delError) throw delError;
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
    if (insError) throw insError;
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
    if (rpcError) throw rpcError;
  } else if (existing.some((row) => row.is_default)) {
    const { error: clearError } = await supabase
      .from('client_schedules')
      .update({ is_default: false })
      .eq('client_id', clientId);
    if (clearError) throw clearError;
  }
}

export async function createClientWithRelations(
  supabase: SupabaseClient<Database>,
  input: CreateClientPersistInput
): Promise<ClientsRow> {
  const metaJson = buildClientMetaPatch({}, input.meta);
  const insertRow = {
    display_name: input.display_name,
    full_name: input.full_name,
    gstin: input.gstin,
    status: input.status,
    meta: metaJson,
    addresses: serializeClientAddresses(input.addresses),
    contacts: serializeClientContacts(input.contacts),
  } as ClientsInsert;

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert(insertRow)
    .select()
    .single();
  if (clientError) throw clientError;
  if (!client) throw new Error('Client create returned no row');

  if (input.schedules.length > 0) {
    try {
      await syncClientSchedules(supabase, client.id, input.schedules);
    } catch (e) {
      await supabase.from('clients').delete().eq('id', client.id);
      throw e;
    }
  }

  return client;
}

export async function updateClientWithRelations(
  supabase: SupabaseClient<Database>,
  input: UpdateClientPersistInput
): Promise<void> {
  const patch: ClientsUpdate = {};

  if (input.display_name !== undefined) patch.display_name = input.display_name;
  if (input.full_name !== undefined) patch.full_name = input.full_name;
  if (input.gstin !== undefined) patch.gstin = input.gstin;
  if (input.status !== undefined) patch.status = input.status;
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
    const { error } = await supabase
      .from('clients')
      .update(patch)
      .eq('id', input.clientId);
    if (error) throw error;
  }

  if (input.schedules !== undefined) {
    await syncClientSchedules(supabase, input.clientId, input.schedules);
  }
}
