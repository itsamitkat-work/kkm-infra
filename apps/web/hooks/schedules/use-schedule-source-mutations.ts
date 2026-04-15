'use client';

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
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

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    String((err as { code: unknown }).code) === '23505'
  );
}

function invalidateScheduleSourcesQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: [SCHEDULE_SOURCES_TABLE_ID] });
  queryClient.invalidateQueries({ queryKey: SCHEDULE_SOURCE_VERSIONS_QUERY_KEY });
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
    onError: () =>
      toast.error('Failed to create schedule.', { duration: Infinity }),
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
    onError: () =>
      toast.error('Failed to update schedule.', { duration: Infinity }),
    onSuccess: () => toast.success('Schedule updated.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export function useDeleteScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteScheduleSource,
    onMutate: () => toast.dismiss(),
    onError: () =>
      toast.error('Failed to delete schedule.', { duration: Infinity }),
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
      if (isPostgresUniqueViolation(err)) {
        toast.error(
          'An edition with this internal name already exists for this schedule.',
          { duration: Infinity }
        );
        return;
      }
      toast.error('Failed to create edition.', { duration: Infinity });
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
      if (isPostgresUniqueViolation(err)) {
        toast.error(
          'An edition with this internal name already exists for this schedule.',
          { duration: Infinity }
        );
        return;
      }
      toast.error('Failed to update edition.', { duration: Infinity });
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
    onError: () =>
      toast.error('Failed to delete edition.', { duration: Infinity }),
    onSuccess: () => toast.success('Edition deleted.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}
