import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { fetchClients } from '@/app/(app)/clients/api/client-api';

type ClientComboboxOption = {
  value: string;
  label: string;
};

type ClientOptionsResponse = {
  options: ClientComboboxOption[];
  hasNextPage: boolean;
};

async function fetchClientOptions(
  search: string,
  page = 1
): Promise<ClientOptionsResponse> {
  const pageSize = 20;
  const response = await fetchClients(createSupabaseBrowserClient(), {
    search: search.trim(),
    page,
    pageSize,
    sortBy: 'display_name',
    order: 'asc',
  });

  return {
    options: response.data.map((row) => ({
      value: row.id,
      label: row.display_name?.trim() || row.full_name?.trim() || 'Client',
    })),
    hasNextPage: response.hasNext,
  };
}

export { fetchClientOptions };

export type { ClientComboboxOption, ClientOptionsResponse };
