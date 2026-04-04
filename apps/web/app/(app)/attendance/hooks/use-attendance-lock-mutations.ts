'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ATTENDANCE_TABLE_ID, lockAttendance, unlockAttendance } from '../api/attendance-api';

export function useAttendanceLockMutations() {
  const queryClient = useQueryClient();

  const invalidateAttendance = () => {
    // Invalidate all attendance queries
    queryClient.invalidateQueries({ queryKey: [ATTENDANCE_TABLE_ID] });
  };

  const lockMutation = useMutation({
    mutationFn: (ids: string[]) => lockAttendance(ids),
    onSuccess: () => {
      toast.success('Successfully locked attendance records');
      invalidateAttendance();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to lock attendance records');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (ids: string[]) => unlockAttendance(ids),
    onSuccess: () => {
      toast.success('Successfully unlocked attendance records');
      invalidateAttendance();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unlock attendance records');
    },
  });

  return {
    lockAttendance: lockMutation.mutateAsync,
    unlockAttendance: unlockMutation.mutateAsync,
    isLocking: lockMutation.isPending,
    isUnlocking: unlockMutation.isPending,
  };
}
