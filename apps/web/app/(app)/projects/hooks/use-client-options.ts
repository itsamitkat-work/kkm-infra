'use client';

import { fetchClients } from '@/hooks/useClients';

export interface ClientComboboxOption {
  value: string;
  label: string;
}

export interface ClientOptionsResponse {
  options: ClientComboboxOption[];
  hasNextPage: boolean;
}

export async function fetchClientOptions(
  search: string,
  page: number = 1
): Promise<ClientOptionsResponse> {
  const pageSize = 20;
  const res = await fetchClients({
    search: search.trim(),
    page,
    pageSize,
    sortBy: 'display_name',
    order: 'asc',
  });
  return {
    options: res.data.map((r) => ({
      value: r.id,
      label: r.display_name?.trim() || r.full_name?.trim() || 'Client',
    })),
    hasNextPage: res.hasNext,
  };
}
