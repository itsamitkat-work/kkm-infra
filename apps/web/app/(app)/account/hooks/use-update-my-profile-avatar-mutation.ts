'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { readImageFileAsDataUrl } from '@/lib/read-image-data-url';

import { MY_PROFILE_QUERY_KEY } from '@/hooks/use-my-profile-query';

export function useUpdateMyProfileAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File | null) => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not signed in');
      }
      const avatar_url = file ? await readImageFileAsDataUrl(file) : null;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url })
        .eq('id', user.id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      toast.success('Profile photo updated');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Could not update photo.';
      toast.error(message);
    },
  });
}
