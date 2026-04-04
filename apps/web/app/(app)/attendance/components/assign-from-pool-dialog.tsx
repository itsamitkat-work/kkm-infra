'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PoolUserList } from '../../pool/components/pool-user-list';
import {
  useAssignedProjectsQuery,
  AssignedProjectType,
} from '@/hooks/projects/use-assigned-projects-query';
import { useAuth } from '@/hooks/auth/use-auth';

interface AssignFromPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignComplete?: () => void;
}

export function AssignFromPoolDialog({
  open,
  onOpenChange,
  onAssignComplete,
}: AssignFromPoolDialogProps) {
  const { getUser } = useAuth();
  const user = getUser();
  const { projects } = useAssignedProjectsQuery(
    user?.hashId ?? null,
    AssignedProjectType.ForAttendance
  );

  const handleAssignComplete = React.useCallback(() => {
    // Wait a bit for the assignment to complete (it's awaited in PoolUserList)
    // The assignment mutation will invalidate queries, so we wait for that
    setTimeout(() => {
      onAssignComplete?.();
      onOpenChange(false);
    }, 500);
  }, [onAssignComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl h-[90vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='px-6 pt-6 pb-0 m-0 shrink-0'>
          <DialogTitle>Assign Users from Pool</DialogTitle>
        </DialogHeader>

        <div className='flex-1 min-h-0 overflow-hidden'>
          <div className='h-full'>
            <PoolUserList
              projects={projects}
              onAssignToProject={(projectId) => {
                // Callback after assignment completes
                handleAssignComplete();
              }}
              insideDialog={true}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
