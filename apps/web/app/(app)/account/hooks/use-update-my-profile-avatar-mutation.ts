'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  removeProfileAvatarFromStorage,
  uploadProfileAvatarToStorage,
} from '@/lib/supabase/profile-avatar-storage';

import { MY_PROFILE_QUERY_KEY } from '@/hooks/use-my-profile-query';

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

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
      const avatar_url = file
        ? await uploadProfileAvatarToStorage(supabase, user.id, file)
        : null;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url })
        .eq('id', user.id);
      if (error) {
        throw error;
      }
      if (!file) {
        await removeProfileAvatarFromStorage(supabase, user.id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      toast.success('Profile photo updated');
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, 'Could not update photo.'),
      );
    },
  });
}
