'use client';

import { useQuery } from '@tanstack/react-query';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const MY_PROFILE_QUERY_KEY = ['my-profile'] as const;

export type MyProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  updated_at: string;
};

export function useMyProfileQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: async (): Promise<MyProfileRow | null> => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return null;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, updated_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data as MyProfileRow | null;
    },
    enabled,
  });
}
