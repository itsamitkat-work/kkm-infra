'use client';

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveSupabaseUserMessage } from '@/lib/supabase/errors';
import {
  scheduleSourceMutationMessages,
  scheduleSourceVersionMutationMessages,
} from '@/lib/schedules/schedule-mutation-messages';
import { toast } from 'sonner';
import type { Database } from '@kkm/db';
import { SCHEDULE_SOURCES_TABLE_ID } from '@/hooks/schedules/use-schedule-sources';
import { SCHEDULE_SOURCE_VERSIONS_QUERY_KEY } from '@/hooks/use-schedule-source-versions';

type ScheduleSourcesInsert =
  Database['public']['Tables']['schedule_sources']['Insert'];
type ScheduleSourcesUpdate =
  Database['public']['Tables']['schedule_sources']['Update'];
type ScheduleSourceVersionsInsert =
  Database['public']['Tables']['schedule_source_versions']['Insert'];
type ScheduleSourceVersionsUpdate =
  Database['public']['Tables']['schedule_source_versions']['Update'];

function getSupabase() {
  return createSupabaseBrowserClient();
}

function toastMutationError(message: string) {
  toast.error(message, { duration: Infinity });
}

function toastScheduleSourceMutationError(err: unknown, fallback: string) {
  toastMutationError(
    resolveSupabaseUserMessage(err, scheduleSourceMutationMessages, fallback)
  );
}

function toastScheduleSourceVersionMutationError(
  err: unknown,
  fallback: string
) {
  toastMutationError(
    resolveSupabaseUserMessage(
      err,
      scheduleSourceVersionMutationMessages,
      fallback
    )
  );
}

function invalidateScheduleSourcesQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: [SCHEDULE_SOURCES_TABLE_ID] });
  queryClient.invalidateQueries({
    queryKey: SCHEDULE_SOURCE_VERSIONS_QUERY_KEY,
  });
}

async function insertScheduleSource(
  input: ScheduleSourcesInsert
): Promise<void> {
  const { error } = await getSupabase().from('schedule_sources').insert(input);
  if (error) throw error;
}

async function updateScheduleSource(
  id: string,
  patch: ScheduleSourcesUpdate
): Promise<void> {
  const { error } = await getSupabase()
    .from('schedule_sources')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

async function deleteScheduleSource(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('schedule_sources')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function insertScheduleSourceVersion(
  input: ScheduleSourceVersionsInsert
): Promise<void> {
  const { error } = await getSupabase()
    .from('schedule_source_versions')
    .insert(input);
  if (error) throw error;
}

async function updateScheduleSourceVersion(
  id: string,
  patch: ScheduleSourceVersionsUpdate
): Promise<void> {
  const { error } = await getSupabase()
    .from('schedule_source_versions')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

async function deleteScheduleSourceVersion(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('schedule_source_versions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export function useCreateScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: insertScheduleSource,
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to create schedule.'),
    onSuccess: () => toast.success('Schedule created.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export function useUpdateScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ScheduleSourcesUpdate }) =>
      updateScheduleSource(id, patch),
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to update schedule.'),
    onSuccess: () => toast.success('Schedule updated.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export function useDeleteScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteScheduleSource,
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to delete schedule.'),
    onSuccess: () => toast.success('Schedule deleted.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export function useCreateScheduleSourceVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: insertScheduleSourceVersion,
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) => {
      toastScheduleSourceVersionMutationError(
        err,
        'Failed to create edition.'
      );
    },
    onSuccess: () => toast.success('Edition created.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export function useUpdateScheduleSourceVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: ScheduleSourceVersionsUpdate;
    }) => updateScheduleSourceVersion(id, patch),
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) => {
      toastScheduleSourceVersionMutationError(
        err,
        'Failed to update edition.'
      );
    },
    onSuccess: () => toast.success('Edition updated.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export function useDeleteScheduleSourceVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteScheduleSourceVersion,
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to delete edition.'),
    onSuccess: () => toast.success('Edition deleted.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}
