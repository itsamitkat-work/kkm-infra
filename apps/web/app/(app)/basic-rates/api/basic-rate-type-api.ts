import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

type BasicRateTypeOptionRow = { id: string; name: string };

async function fetchBasicRateTypeOptions(
  supabase: SupabaseClient<Database>,
  signal?: AbortSignal
): Promise<BasicRateTypeOptionRow[]> {
  let query = supabase.from('basic_rate_types').select('id, name').order('name');
  if (signal) {
    query = query.abortSignal(signal);
  }
  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }
  return (data ?? []) as BasicRateTypeOptionRow[];
}

async function fetchBasicRateTypeIdByName(
  supabase: SupabaseClient<Database>,
  name: string,
  signal?: AbortSignal
): Promise<string> {
  let query = supabase.from('basic_rate_types').select('id').eq('name', name);
  if (signal) {
    query = query.abortSignal(signal);
  }
  const { data, error } = await query.single();
  if (error) {
    throw normalizeError(error);
  }
  return data.id;
}

export { fetchBasicRateTypeOptions, fetchBasicRateTypeIdByName };

export type { BasicRateTypeOptionRow };
