import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export async function logoutFromSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
  window.location.href = '/login';
}
