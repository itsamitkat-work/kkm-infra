'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { Plus, Trash2, X } from 'lucide-react';
import { useProjectItemsQuery } from '@/app/(app)/projects/hooks/use-project-items-query';
import { ProjectItemsExportButtons } from './components/export-buttons';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { ActionsDropdown, ActionItem } from '@/components/ui/actions-dropdown';
import { SaveButton } from '@/components/ui/save-button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { FullscreenWrapper } from '@/components/fullscreen-wrapper';
import SheetTable from '@/components/tables/sheet-table/sheet-table';
import {
  useSheetTable,
  type UseSheetTableReturn,
} from '@/components/tables/sheet-table/hooks/use-sheet-table';
import { type ExtendedColumnDef } from '@/components/tables/sheet-table/utils';
import { TableLoadingState } from '@/components/tables/table-loading';
import { TableErrorState } from '@/components/tables/table-error';
import {
  useDeleteConfirmation,
  type DeleteConfirmationData,
} from '@/hooks/use-delete-confirmation';
import {
  useCreateProjectItem,
  useDeleteProjectItem,
  useUpdateProjectItem,
} from '@/hooks/projects/use-project-items-mutations';
import { getPlatformSpecificKbd, parseNumber } from '@/lib/utils';
import { projectItemZodSchema } from '@/types/project-item';
import { ProjectItemRowType } from '@/types/project-item';
import { useHotkeys } from 'react-hotkeys-hook';
import { getColumns } from './project-items-columns';
import { getProjectItemsFilters } from './project-items-filters';
import { useClients } from '@/hooks/clients/use-clients';
import { toast } from 'sonner';

interface ApiError {
  errorMessage?: string;
  message?: string;
}

const projectItemsSearchKeys: string[] = ['name', 'code'];

interface ProjectItemsProps {
  projectId: string;
}

export function ProjectItems({ projectId }: ProjectItemsProps) {
  const [savingRowId, setSavingRowId] = React.useState<string | null>(null);
  const [saveErrors, setSaveErrors] = React.useState<
    Record<string, string | null>
  >({});
  const [isBulkOperationInProgress, setIsBulkOperationInProgress] =
    React.useState(false);

  const {
    data: projectItemRows,
    isFetchingNextPage,
    isLoading,
    isPending,
    isError,
    refetch,
  } = useProjectItemsQuery({
    projectId: projectId,
    type: 'GEN',
  });

  const { mutateAsync: createItem, isPending: isCreating } =
    useCreateProjectItem(projectId);
  const { mutateAsync: updateItem, isPending: isUpdating } =
    useUpdateProjectItem(projectId);
  const { mutateAsync: deleteItem, isPending: isDeleting } =
    useDeleteProjectItem(projectId);
  const isSaving = isCreating || isUpdating;

  const {
    isOpen: isDeleteConfirmationOpen,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    data: deleteConfirmationData,
  } = useDeleteConfirmation();

  // Use project items directly without segment filtering
  const tableData = React.useMemo(() => {
    return projectItemRows || [];
  }, [projectItemRows]);

  const handleSaveRow = React.useCallback(
    async (
      rowData: ProjectItemRowType,
      tableApi: UseSheetTableReturn<ProjectItemRowType>,
      options?: { suppressToast?: boolean }
    ) => {
      setSavingRowId(rowData.id);
      setSaveErrors((prev) => ({ ...prev, [rowData.id]: null }));

      const validationResult = projectItemZodSchema.safeParse(rowData);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => issue.message)
          .join(', ');
        setSaveErrors((prev) => ({ ...prev, [rowData.id]: errorMessage }));
        setSavingRowId(null);
        return;
      }

      try {
        const payload = {
          rate: parseNumber(rowData.rate),
          quantity: parseNumber(rowData.quantity),
          remarks: rowData.remark,
          srNo: rowData.srNo,
          dsrCode: rowData.dsrCode,
          code: rowData.code,
          itemId: rowData.masterItemHashId,
          type: 'GEN',
          segmentHashIds: [],
        };

        let updatedRowId = rowData.id;

        if (rowData.isNew) {
          const newItem = await createItem({
            ...payload,
            projectId,
            suppressToast: options?.suppressToast,
          });
          updatedRowId = newItem?.data?.hashId || rowData.id;
          tableApi.updateRow(rowData.id, {
            ...rowData,
            id: updatedRowId,
            hashId: updatedRowId,
            isNew: false,
            isEdited: false,
          });
        } else {
          await updateItem({
            ...payload,
            hashId: rowData.id,
            suppressToast: options?.suppressToast,
          });
          tableApi.updateRow(rowData.id, {
            ...rowData,
            isEdited: false,
          });
        }

        // Focus on next row's srNo column
        const focusNextRowWoNo = () => {
          const rows = tableApi.table.getRowModel().rows;
          const currentRowIndex = rows.findIndex(
            (row) => row.original.id === updatedRowId
          );
          if (currentRowIndex === -1 || currentRowIndex >= rows.length - 1) {
            return false;
          }

          const nextRow = rows[currentRowIndex + 1];
          if (!nextRow.original.isNew) {
            return false;
          }

          const visibleCells = nextRow.getVisibleCells();
          const srNoCell = visibleCells.find((cell) => {
            const colDef = cell.column
              .columnDef as ExtendedColumnDef<ProjectItemRowType>;
            return cell.column.id === 'srNo' || colDef?.accessorKey === 'srNo';
          });

          if (!srNoCell) {
            return false;
          }

          const nextRowId = nextRow.original.id;
          const cellId = srNoCell.id;
          const cellElement = document.querySelector<HTMLElement>(
            `[data-row-id="${nextRowId}"][data-cell-id="${cellId}"]`
          );

          if (!cellElement) {
            return false;
          }

          const input = cellElement.querySelector<HTMLInputElement>('input');

          if (input) {
            input.focus();
            if (input instanceof HTMLInputElement) {
              input.select();
            }
            return true;
          }

          return false;
        };

        let attempts = 0;
        const maxAttempts = 5;
        const tryFocus = () => {
          if (focusNextRowWoNo() || attempts >= maxAttempts) {
            return;
          }
          attempts++;
          setTimeout(tryFocus, 50);
        };

        setTimeout(tryFocus, 100);
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage =
          apiError.errorMessage ||
          apiError.message ||
          'An unknown error occurred.';
        setSaveErrors((prev) => ({ ...prev, [rowData.id]: errorMessage }));
      } finally {
        setSavingRowId(null);
      }
    },
    [createItem, projectId, updateItem]
  );

  const handleDeleteRow = React.useCallback(
    (
      rowData: ProjectItemRowType,
      tableApi: UseSheetTableReturn<ProjectItemRowType>
    ) => {
      if (rowData.isNew) {
        tableApi.deleteRow(String(rowData.id));
        closeDeleteConfirmation();
        return;
      }

      deleteItem({ itemId: rowData.id }).then(() => {
        tableApi.deleteRow(String(rowData.id));
        closeDeleteConfirmation();
      });
    },
    [closeDeleteConfirmation, deleteItem]
  );

  const baseColumns = React.useMemo(() => getColumns(), []);

  const { data: clients } = useClients();

  const clientOptions = React.useMemo(
    () =>
      clients.map((client) => ({
        value: client.scheduleName,
        label: client.scheduleName,
      })),
    [clients]
  );

  const filters = React.useMemo(
    () => getProjectItemsFilters(clientOptions),
    [clientOptions]
  );

  const searchConfig = React.useMemo(
    () => ({
      enabled: true,
      placeholder: 'Search by name or code',
    }),
    []
  );

  const getDisabledColumns = React.useCallback(
    (rowData: ProjectItemRowType) => {
      if (rowData.isNew) {
        return ['index', 'unit', 'dsrCode', 'scheduleName', 'total', 'actions'];
      }
      return [
        'index',
        'srNo',
        'code',
        'dsrCode',
        'scheduleName',
        'name',
        'unit',
        'total',
        'actions',
      ];
    },
    []
  );

  const handleAddNewRow = React.useCallback(
    (
      tableApi: UseSheetTableReturn<ProjectItemRowType>,
      options?: { focusIndex?: number }
    ) => {
      const newRow: ProjectItemRowType = {
        id: `new-row-${Date.now()}`,
        srNo: '',
        hashId: undefined,
        code: '',
        name: '',
        unit: '',
        rate: '',
        quantity: '',
        total: '0',
        isEdited: true,
        isNew: true,
        headerKey: null,
        _original: null,
        segmentHashIds: [],
      };

      tableApi.addRow(newRow, undefined, { focusIndex: options?.focusIndex });
    },
    []
  );

  const totalAmount = React.useMemo(() => {
    return tableData.reduce((acc, row) => {
      const quantity = parseNumber(row.quantity);
      const rate = parseNumber(row.rate);
      if (!isNaN(quantity) && !isNaN(rate)) {
        return acc + quantity * rate;
      }
      return acc;
    }, 0);
  }, [tableData]);

  // Global hotkey for new item
  useHotkeys(
    'ctrl+i, meta+i',
    (event) => {
      event.preventDefault();
      if (tableRef.current) {
        handleAddNewRow(tableRef.current, { focusIndex: 1 });
      }
    },
    {
      enableOnFormTags: true,
    }
  );

  const tableRef = React.useRef<UseSheetTableReturn<ProjectItemRowType> | null>(
    null
  );

  const saveRow = React.useCallback(
    (rowData: ProjectItemRowType) => {
      if (!tableRef.current) return;
      return handleSaveRow(rowData, tableRef.current);
    },
    [handleSaveRow]
  );

  const deleteRow = React.useCallback(
    (rowData: ProjectItemRowType) => {
      if (!tableRef.current) return;
      return handleDeleteRow(rowData, tableRef.current);
    },
    [handleDeleteRow]
  );

  const addNewRow = React.useCallback(
    (options?: { focusIndex?: number }) => {
      if (!tableRef.current) return;
      handleAddNewRow(tableRef.current, {
        focusIndex: options?.focusIndex,
      });
    },
    [handleAddNewRow]
  );

  const discardRowChanges = React.useCallback((rowId: string) => {
    tableRef.current?.cancelUpdate(String(rowId));
  }, []);

  const actionsColumn = React.useMemo(
    () =>
      createActionsColumn({
        savingRowId,
        saveErrors,
        isSaving,
        onSaveRow: saveRow,
        onDeleteRow: deleteRow,
        onDiscardRow: discardRowChanges,
        openDeleteConfirmation,
      }),
    [
      savingRowId,
      saveErrors,
      isSaving,
      saveRow,
      deleteRow,
      discardRowChanges,
      openDeleteConfirmation,
    ]
  );

  const columns = React.useMemo(
    () => [...baseColumns, actionsColumn],
    [baseColumns, actionsColumn]
  );

  const sheetTable = useSheetTable<ProjectItemRowType>({
    columns,
    data: tableData,
    enableColumnSizing: true,
    filters,
    searchKeys: projectItemsSearchKeys,
    rowDataZodSchema: projectItemZodSchema,
    isPending,
    isLoading,
    tableOptions: {
      getRowCanSelect: (row) => {
        // Only allow selecting existing rows (not new/empty rows)
        const rowData = row.original as ProjectItemRowType;
        return !rowData.isNew;
      },
    },
  });

  tableRef.current = sheetTable;

  // Get selected rows for bulk operations
  const selectedRows = React.useMemo(() => {
    return sheetTable.table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original as ProjectItemRowType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTable.table, sheetTable.rowSelection]);

  const selectedRowsCount = selectedRows.length;

  // Bulk delete handler
  const handleBulkDelete = React.useCallback(async () => {
    if (selectedRowsCount === 0 || !tableRef.current) return;

    setIsBulkOperationInProgress(true);
    const toastId = 'bulk-delete';
    toast.loading(
      `Deleting ${selectedRowsCount} item${
        selectedRowsCount !== 1 ? 's' : ''
      }...`,
      {
        id: toastId,
      }
    );

    let successCount = 0;
    let failedCount = 0;
    const failedRows: ProjectItemRowType[] = [];

    try {
      // Delete all selected rows and track results
      const results = await Promise.allSettled(
        selectedRows.map((row) =>
          deleteItem({ itemId: row.id, suppressToast: true })
        )
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
          // Remove successful rows from table
          tableRef.current?.deleteRow(String(selectedRows[index].id));
        } else {
          failedCount++;
          failedRows.push(selectedRows[index]);
        }
      });

      // Clear selection
      sheetTable.setRowSelection({});
      closeDeleteConfirmation();

      // Show final toast with results
      if (failedCount === 0) {
        toast.success(
          `Successfully deleted ${successCount} item${
            successCount !== 1 ? 's' : ''
          }.`,
          { id: toastId }
        );
      } else if (successCount === 0) {
        toast.error(
          `Failed to delete ${failedCount} item${
            failedCount !== 1 ? 's' : ''
          }.`,
          { id: toastId }
        );
      } else {
        toast.warning(
          `Deleted ${successCount} item${
            successCount !== 1 ? 's' : ''
          }, failed to delete ${failedCount} item${
            failedCount !== 1 ? 's' : ''
          }.`,
          { id: toastId }
        );
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError.errorMessage ||
        apiError.message ||
        'An unknown error occurred while deleting items.';
      toast.error(`Failed to delete items: ${errorMessage}`, { id: toastId });
      setSaveErrors((prev) => ({ ...prev, bulk: errorMessage }));
    } finally {
      setIsBulkOperationInProgress(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedRows,
    selectedRowsCount,
    deleteItem,
    closeDeleteConfirmation,
    sheetTable.setRowSelection,
  ]);

  const sectionActions = React.useMemo(
    () => (
      <>
        <div className='flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-900'>
          <span className='text-xs font-medium text-slate-600 dark:text-slate-300'>
            Total
          </span>
          <span className='text-sm font-semibold text-slate-900 dark:text-white'>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalAmount)}
          </span>
        </div>
        {selectedRowsCount > 0 ? (
          <>
            <div className='flex items-center gap-2'>
              {isBulkOperationInProgress && (
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              )}
              <span className='text-sm font-medium text-muted-foreground'>
                {selectedRowsCount} row{selectedRowsCount !== 1 ? 's' : ''}{' '}
                selected
                {isBulkOperationInProgress && ' (processing...)'}
              </span>
            </div>
            <Button
              size='sm'
              variant='destructive'
              onClick={() =>
                openDeleteConfirmation({
                  onConfirm: handleBulkDelete,
                  itemName: 'project item',
                  itemCount: selectedRowsCount,
                })
              }
              disabled={isSaving || isDeleting || isBulkOperationInProgress}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete
            </Button>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={isLoading || isFetchingNextPage}
                size='sm'
                onClick={() => addNewRow({ focusIndex: 1 })}
              >
                <Plus className='h-4 w-4' />
                <span className='hidden lg:inline'>New item</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Press <Kbd>{getPlatformSpecificKbd('I')}</Kbd> to add a new item
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </>
    ),
    [
      totalAmount,
      isLoading,
      isFetchingNextPage,
      addNewRow,
      selectedRowsCount,
      isBulkOperationInProgress,
      isSaving,
      isDeleting,
      openDeleteConfirmation,
      handleBulkDelete,
    ]
  );

  return (
    <TooltipProvider>
      <div className='overflow-hidden'>
        <FullscreenWrapper
          title='Project Items'
          className='border rounded-lg overflow-hidden'
          showFullscreenButton={true}
          fullscreenButtonPosition='top-right'
        >
          <div className='flex items-center justify-between gap-3 border-b border-border px-4 py-2'>
            <div className='flex items-center gap-3 min-w-0'>
              <h2 className='text-base font-semibold text-foreground'>
                Project Items
              </h2>
              <span className='text-sm text-muted-foreground'>
                {projectItemRows?.length ?? 0} items
              </span>
            </div>
            <ProjectItemsExportButtons
              projectId={projectId}
              items={projectItemRows}
              totalAmount={totalAmount}
              disabled={isLoading}
              buttonClassName='mr-12'
            />
          </div>

          <div className='space-y-4 p-4'>
            {isError && (
              <TableErrorState
                title='Error fetching project items'
                message='Failed to fetch project items'
                onRetry={refetch}
              />
            )}
            <div className='relative'>
              <SheetTable<ProjectItemRowType>
                id={`project-items-${projectId}`}
                columns={columns}
                sheetTable={sheetTable}
                onEdit={sheetTable.editCell}
                disabledColumns={getDisabledColumns}
                filters={filters}
                searchConfig={searchConfig}
                actions={sectionActions}
                addNewRow={addNewRow}
                enableHotkey={true}
                enableColumnSizing={true}
                totalAmount={totalAmount}
                autoAddRowIf={({ data }) => {
                  if (data.length === 0) {
                    return true;
                  }

                  // Check the last row
                  const lastRow = data.at(-1);
                  if (!!lastRow?.srNo || !!lastRow?.name) {
                    return true;
                  }
                  return false;
                }}
                loadingMessage={<TableLoadingState />}
                errorState={<TableErrorState />}
                emptyState={
                  <div className='py-4 text-sm text-muted-foreground'>
                    No project items found.
                  </div>
                }
                onSaveShortcut={(rowData) => {
                  saveRow(rowData);
                }}
              />
            </div>
          </div>
        </FullscreenWrapper>
        {deleteConfirmationData && (
          <DeleteConfirmationDialog
            open={isDeleteConfirmationOpen}
            onOpenChange={closeDeleteConfirmation}
            onConfirm={deleteConfirmationData.onConfirm}
            itemName={deleteConfirmationData.itemName}
            isLoading={isDeleting}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

interface ActionsColumnConfig {
  savingRowId: string | null;
  saveErrors: Record<string, string | null>;
  isSaving: boolean;
  onSaveRow: (row: ProjectItemRowType) => void;
  onDeleteRow: (row: ProjectItemRowType) => void;
  onDiscardRow: (rowId: string) => void;
  openDeleteConfirmation: (data: DeleteConfirmationData) => void;
}

function createActionsColumn({
  savingRowId,
  saveErrors,
  isSaving,
  onSaveRow,
  onDeleteRow,
  onDiscardRow,
  openDeleteConfirmation,
}: ActionsColumnConfig): ExtendedColumnDef<ProjectItemRowType> {
  return {
    id: 'actions',
    header: 'Actions',
    size: 120,
    maxSize: 120,
    className: 'text-center',
    cell: ({ row }: { row: Row<ProjectItemRowType> }) => {
      const rowData = row.original as ProjectItemRowType;
      const isCurrentRowSaving = savingRowId === rowData.id;
      const isSaveDisabled = (!rowData.isEdited && !rowData.isNew) || isSaving;

      const actions: ActionItem[] = [
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          onClick: () =>
            openDeleteConfirmation({
              onConfirm: () => onDeleteRow(rowData),
              itemName: 'project item',
            }),
          variant: 'destructive',
        },
      ];

      if (!rowData.isNew) {
        actions.unshift({
          id: 'discard',
          label: 'Discard Changes',
          icon: X,
          onClick: () => onDiscardRow(String(rowData.id)),
          disabled: !rowData.isEdited,
        });
      }

      return (
        <div className='flex justify-center gap-1'>
          <SaveButton
            onClick={() => onSaveRow(rowData)}
            disabled={isSaveDisabled}
            isLoading={isCurrentRowSaving}
            errorMessage={saveErrors[rowData.id]}
            isNew={rowData.isNew}
            isEdited={rowData.isEdited}
          />
          <ActionsDropdown actions={actions} />
        </div>
      );
    },
  };
}
