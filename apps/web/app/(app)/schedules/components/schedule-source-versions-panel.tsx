'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ScheduleSourceRow } from '@/app/(app)/schedules/api/schedule-sources-api';
import type { ScheduleSourceVersionRow } from '@/app/(app)/schedules/api/schedule-source-versions-api';
import { useScheduleSourceVersionsBySourceId } from '@/app/(app)/schedules/hooks/use-schedule-source-versions-by-source-query';
import { RecordStatusBadge } from '@/components/ui/record-status-badge';
import { ScheduleSourceVersionDialog } from './schedule-source-version-dialog';
import { useDeleteScheduleSourceVersion } from '@/app/(app)/schedules/hooks/use-schedule-source-mutations';
import { useConfirmationDialog } from '@/hooks/use-confirmation-dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { IconPlus } from '@tabler/icons-react';
import { Layers } from 'lucide-react';

interface ScheduleSourceVersionsPanelProps {
  source: ScheduleSourceRow;
  isExpanded: boolean;
  canManage: boolean;
}

export function ScheduleSourceVersionsPanel({
  source,
  isExpanded,
  canManage,
}: ScheduleSourceVersionsPanelProps) {
  const {
    data: versions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useScheduleSourceVersionsBySourceId(source.id, isExpanded);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>(
    'create'
  );
  const [editingVersion, setEditingVersion] =
    React.useState<ScheduleSourceVersionRow | null>(null);

  const confirmation = useConfirmationDialog();
  const deleteMutation = useDeleteScheduleSourceVersion();

  function openCreateDialog() {
    setDialogMode('create');
    setEditingVersion(null);
    setDialogOpen(true);
  }

  function openEditDialog(version: ScheduleSourceVersionRow) {
    setDialogMode('edit');
    setEditingVersion(version);
    setDialogOpen(true);
  }

  function requestDeleteVersion(version: ScheduleSourceVersionRow) {
    confirmation.openConfirmation({
      itemName: 'edition',
      onConfirm: () => {
        void deleteMutation.mutateAsync(version.id).then(() => refetch());
      },
    });
  }

  return (
    <div className='bg-muted/20 border-border/80 border-t px-4 py-3'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='text-sm font-medium'>
            Editions{' '}
            <span className='text-muted-foreground text-xs'>
              ({versions.length})
            </span>
          </p>
          <p className='text-muted-foreground text-xs'>
            {source.display_name || source.name}
          </p>
        </div>
        {canManage ? (
          <Button type='button' onClick={openCreateDialog}>
            <IconPlus className='size-4' />
            Add edition
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className='space-y-2 py-2'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      ) : isError ? (
        <p className='text-destructive text-sm'>
          {error?.message ?? 'Failed to load editions.'}
        </p>
      ) : versions.length === 0 ? (
        <Empty className='border-border/80 my-1 border border-dashed py-6 md:py-8'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Layers className='size-6' aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No editions yet</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? 'Add an edition so this schedule appears in schedule items and basic rates.'
                : 'Editions will appear here when added by a user with manage access.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display name</TableHead>
                <TableHead className='w-20'>Year</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className='w-28'>Status</TableHead>
                <TableHead className='w-36 text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className='font-medium'>
                    {v.display_name}
                  </TableCell>
                  <TableCell className='text-muted-foreground'>
                    {v.year ?? '—'}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-sm'>
                    {v.name}
                  </TableCell>
                  <TableCell>
                    <RecordStatusBadge status={v.status ?? undefined} />
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      {canManage ? (
                        <Button
                          type='button'
                          variant='ghost'
                          className='h-8'
                          onClick={() => openEditDialog(v)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          type='button'
                          variant='ghost'
                          className='text-destructive h-8'
                          onClick={() => requestDeleteVersion(v)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ScheduleSourceVersionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        scheduleSourceId={source.id}
        version={editingVersion}
        onSuccess={() => {
          void refetch();
        }}
      />

      {confirmation.isOpen && confirmation.data && (
        <DeleteConfirmationDialog
          open={confirmation.isOpen}
          onOpenChange={(open) =>
            open
              ? confirmation.openConfirmation(
                  confirmation.data!
                )
              : confirmation.closeConfirmation()
          }
          onConfirm={confirmation.data.onConfirm}
          isLoading={
            confirmation.data.isLoading || deleteMutation.isPending
          }
          itemName='edition'
          itemCount={confirmation.data.itemCount}
        />
      )}
    </div>
  );
}
