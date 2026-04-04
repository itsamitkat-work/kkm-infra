'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { TableLoadingState } from '@/components/tables/table-loading';
import { TableErrorState } from '@/components/tables/table-error';
import {
  CheckboxGrid,
  CheckboxGridRow,
  CheckboxGridColumn,
} from '@/components/tables/checkbox-grid';
import { useCheckboxGrid } from '@/hooks/use-checkbox-grid';
import {
  fetchAllPageActions,
  savePageActionsChanges,
} from '../data/page-actions-api';
import { usePagesQuery } from './hooks/use-pages-query';
import { useActionsQuery } from './hooks/use-actions-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PageActionMatrix() {
  const queryClient = useQueryClient();

  // Fetch page actions
  const pageActionsQuery = useQuery({
    queryKey: ['page-actions-matrix'],
    queryFn: fetchAllPageActions,
  });

  const pageActions = React.useMemo(
    () => pageActionsQuery.data ?? [],
    [pageActionsQuery.data]
  );

  // Fetch pages (rows)
  const { query: pagesQuery } = usePagesQuery({
    search: '',
    filters: [],
    sorting: [],
  });

  const rows: CheckboxGridRow[] = React.useMemo(() => {
    if (!pagesQuery.data?.pages) return [];
    return pagesQuery.data.pages
      .flatMap((page) => page.data)
      .map((page) => ({ id: page.id, label: page.name }));
  }, [pagesQuery.data]);

  // Fetch actions (columns)
  const { query: actionsQuery } = useActionsQuery({
    search: '',
    filters: [],
    sorting: [],
  });

  const columns: CheckboxGridColumn[] = React.useMemo(() => {
    if (!actionsQuery.data?.pages) return [];
    return actionsQuery.data.pages
      .flatMap((page) => page.data)
      .map((action) => ({ id: action.id, label: action.code }));
  }, [actionsQuery.data]);

  // Use the reusable checkbox grid hook
  const gridState = useCheckboxGrid({
    serverData: pageActions,
    getRowId: (item) => item.pageId,
    getColumnId: (item) => item.actionId,
    getId: (item) => item.id,
  });

  // Saving state
  const [isSaving, setIsSaving] = React.useState(false);

  // Save changes to server
  async function handleSave() {
    if (!gridState.hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      const { toInsert, toDelete } = gridState.getDiff();

      // Map to API format
      const insertPayload = toInsert.map(({ rowId, columnId }) => ({
        pageId: rowId,
        actionId: columnId,
      }));

      const result = await savePageActionsChanges(insertPayload, toDelete);

      // Show toast with results
      const totalSuccess = result.insertedCount + result.deletedCount;
      const totalFailed = result.insertFailedCount + result.deleteFailedCount;

      if (totalFailed === 0 && totalSuccess > 0) {
        toast.success(`Successfully saved ${totalSuccess} changes`, {
          description: `${result.insertedCount} added, ${result.deletedCount} removed`,
        });
      } else if (totalFailed > 0 && totalSuccess > 0) {
        toast.warning(`Partially saved`, {
          description: `${totalSuccess} succeeded, ${totalFailed} failed`,
        });
      } else if (totalFailed > 0 && totalSuccess === 0) {
        toast.error(`Failed to save changes`, {
          description: `${totalFailed} operations failed`,
        });
      }

      // Refetch to get fresh data from server
      await queryClient.invalidateQueries({
        queryKey: ['page-actions-matrix'],
      });
    } catch (error) {
      console.error('Failed to save page actions:', error);
      toast.error('Failed to save changes', {
        description: 'An unexpected error occurred',
      });
      await queryClient.invalidateQueries({
        queryKey: ['page-actions-matrix'],
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Loading and error states
  const isLoading =
    pagesQuery.isLoading ||
    actionsQuery.isLoading ||
    pageActionsQuery.isLoading;

  const isError =
    pagesQuery.isError || actionsQuery.isError || pageActionsQuery.isError;

  const errorMessage =
    pagesQuery.error?.message ||
    actionsQuery.error?.message ||
    'Failed to load data';

  if (isLoading) {
    return <TableLoadingState />;
  }

  if (isError) {
    return (
      <TableErrorState
        title='Failed to load page actions matrix'
        message={errorMessage}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button
          variant='primary'
          size='sm'
          onClick={handleSave}
          disabled={!gridState.hasChanges || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              Saving...
            </>
          ) : (
            <>Save Changes</>
          )}
        </Button>
      </div>

      <CheckboxGrid
        rows={rows}
        columns={columns}
        gridState={gridState}
        rowHeaderLabel='Page'
        emptyMessage='No pages found'
      />
    </div>
  );
}
