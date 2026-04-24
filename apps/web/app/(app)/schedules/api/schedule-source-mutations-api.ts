import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

type ScheduleSourcesInsert =
  Database['public']['Tables']['schedule_sources']['Insert'];
type ScheduleSourcesUpdate =
  Database['public']['Tables']['schedule_sources']['Update'];
type ScheduleSourceVersionsInsert =
  Database['public']['Tables']['schedule_source_versions']['Insert'];
type ScheduleSourceVersionsUpdate =
  Database['public']['Tables']['schedule_source_versions']['Update'];

async function insertScheduleSource(
  supabase: SupabaseClient<Database>,
  input: ScheduleSourcesInsert,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('schedule_sources').insert(input);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function updateScheduleSource(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: ScheduleSourcesUpdate,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('schedule_sources').update(patch).eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function deleteScheduleSource(
  supabase: SupabaseClient<Database>,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('schedule_sources').delete().eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function insertScheduleSourceVersion(
  supabase: SupabaseClient<Database>,
  input: ScheduleSourceVersionsInsert,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('schedule_source_versions').insert(input);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function updateScheduleSourceVersion(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: ScheduleSourceVersionsUpdate,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('schedule_source_versions').update(patch).eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function deleteScheduleSourceVersion(
  supabase: SupabaseClient<Database>,
  id: string,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.from('schedule_source_versions').delete().eq('id', id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

export {
  deleteScheduleSource,
  deleteScheduleSourceVersion,
  insertScheduleSource,
  insertScheduleSourceVersion,
  updateScheduleSource,
  updateScheduleSourceVersion,
};

export type {
  ScheduleSourcesInsert,
  ScheduleSourcesUpdate,
  ScheduleSourceVersionsInsert,
  ScheduleSourceVersionsUpdate,
};
