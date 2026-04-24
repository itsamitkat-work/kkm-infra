'use client';

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveSupabaseUserMessage } from '@/lib/supabase/errors';

import {
  scheduleSourceMutationMessages,
  scheduleSourceVersionMutationMessages,
} from '../api/schedule-mutation-messages';
import {
  deleteScheduleSource,
  deleteScheduleSourceVersion,
  insertScheduleSource,
  insertScheduleSourceVersion,
  updateScheduleSource,
  updateScheduleSourceVersion,
  type ScheduleSourcesInsert,
  type ScheduleSourcesUpdate,
  type ScheduleSourceVersionsInsert,
  type ScheduleSourceVersionsUpdate,
} from '../api/schedule-source-mutations-api';
import { SCHEDULE_SOURCE_VERSIONS_QUERY_KEY } from '../api/schedule-source-versions-api';

import { SCHEDULE_SOURCES_QUERY_KEY_PREFIX } from './use-schedule-sources-query';

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
  queryClient.invalidateQueries({
    queryKey: [...SCHEDULE_SOURCES_QUERY_KEY_PREFIX],
  });
  queryClient.invalidateQueries({
    queryKey: [...SCHEDULE_SOURCE_VERSIONS_QUERY_KEY],
  });
}

function useCreateScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleSourcesInsert) =>
      insertScheduleSource(createSupabaseBrowserClient(), input),
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to create schedule.'),
    onSuccess: () => toast.success('Schedule created.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

function useUpdateScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: ScheduleSourcesUpdate;
    }) => updateScheduleSource(createSupabaseBrowserClient(), id, patch),
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to update schedule.'),
    onSuccess: () => toast.success('Schedule updated.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

function useDeleteScheduleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteScheduleSource(createSupabaseBrowserClient(), id),
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to delete schedule.'),
    onSuccess: () => toast.success('Schedule deleted.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

function useCreateScheduleSourceVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleSourceVersionsInsert) =>
      insertScheduleSourceVersion(createSupabaseBrowserClient(), input),
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

function useUpdateScheduleSourceVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: ScheduleSourceVersionsUpdate;
    }) => updateScheduleSourceVersion(createSupabaseBrowserClient(), id, patch),
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

function useDeleteScheduleSourceVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteScheduleSourceVersion(createSupabaseBrowserClient(), id),
    onMutate: () => toast.dismiss(),
    onError: (err: unknown) =>
      toastScheduleSourceMutationError(err, 'Failed to delete edition.'),
    onSuccess: () => toast.success('Edition deleted.'),
    onSettled: () => invalidateScheduleSourcesQueries(queryClient),
  });
}

export {
  useCreateScheduleSource,
  useCreateScheduleSourceVersion,
  useDeleteScheduleSource,
  useDeleteScheduleSourceVersion,
  useUpdateScheduleSource,
  useUpdateScheduleSourceVersion,
};
