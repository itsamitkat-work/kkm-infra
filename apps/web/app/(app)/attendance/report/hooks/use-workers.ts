'use client';

/**
 * Stub until employee types and workers are backed by Supabase (the old
 * `use-employee-types-query` module and `v2/employee` API are removed).
 */
export function useWorkers() {
  return {
    options: [] as { value: string; label: string }[],
    isLoading: false,
    isFetching: false,
  };
}
