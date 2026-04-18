'use client';

import type { Database } from '@kkm/db';
import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser Supabase client typed with generated `Database` from `@kkm/db`. */
export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('createSupabaseBrowserClient is client-only');
  }
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
    );
  }
  return browserClient;
}
