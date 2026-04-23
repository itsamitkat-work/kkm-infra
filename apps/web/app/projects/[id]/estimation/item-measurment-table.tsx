'use client';

import React, { useRef } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import SheetTable from '@/components/tables/sheet-table/sheet-table';
import { Loader2 } from 'lucide-react';
import { TableMeta } from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { ItemMeasurmentRowData, type ProjectBoqDomainLinesType } from './types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImportMeasurementDialog } from './components/import-measurement-dialog';
import { ItemMeasurementActions } from './components/item-measurement-actions';
import { useItemMeasurementLogic } from './hooks/use-item-measurement-logic';

export function ItemMeasurmentTable({
  projectItemHashId,
  rate,
  scheduleQuantity,
  type,
  selectedSegmentId,
}: {
  projectItemHashId: string;
  rate: number;
  scheduleQuantity: number;
  type: ProjectBoqDomainLinesType;
  selectedSegmentId?: string;
}) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const {
    sheetTable,
    columns,
    isLoading,
    isError,
    totalAmount,
    totalQuantity,
    editedRowsCount,
    isSavingAll,
    handleSaveAll,
    handleSave,
    selectedRows,
    showBulkDeleteDialog,
    setShowBulkDeleteDialog,
    isDeleting,
    deleteError,
    handleBulkDeleteClick,
    confirmBulkDelete,
    showImportDialog,
    setShowImportDialog,
    handleImportFromMeasurement,
    createNewRow,
    getDisabledColumns,
    handleCopyRows,
    handlePasteRows,
    handleClearCopy,
    handleDiscardAll,
    hasCopiedRows,
    isFromSameItem,
    handleDragEnd,
    rowIds,
    isReordering,
  } = useItemMeasurementLogic({
    projectItemHashId,
    rate,
    scheduleQuantity,
    type,
    selectedSegmentId,
  });

  const { addRow } = sheetTable;

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle drag end event
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleDragEnd(String(active.id), String(over.id));
    }
  }

  // Memoize search config to prevent re-renders
  const searchConfig = React.useMemo(
    () => ({
      enabled: true,
      placeholder: 'Search descriptions...',
      variant: 'sm' as const,
    }),
    []
  );

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-3 text-xs text-muted-foreground bg-muted/20'>
        <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
        Loading details...
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className='p-3 text-center text-xs text-destructive'>
        Error loading data. Please try again.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        ref={tableContainerRef}
        className='transition-all duration-300 ease-in-out'
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={rowIds}
            strategy={verticalListSortingStrategy}
          >
            <SheetTable<ItemMeasurmentRowData>
              id={projectItemHashId}
              columns={columns}
              sheetTable={sheetTable}
              onEdit={sheetTable.editCell}
              disabledColumns={getDisabledColumns}
              searchConfig={searchConfig}
              enableColumnSizing={true}
              dense={true}
              containerClassName='h-full overflow-y-auto text-xs'
              excludeFromCopy={[
                'date',
                'id',
                'checked',
                'verified',
                'select',
                'drag',
              ]}
              enableFormulaMode={true}
              enableDragAndDrop={true}
              isReordering={isReordering}
              addNewRow={() => addRow(createNewRow())}
              autoAddRowIf={({ data: filteredData }) => {
                const lastRow = filteredData.at(-1);
                if (
                  filteredData.length == 0 ||
                  !!lastRow?.no1 ||
                  !!lastRow?.length ||
                  !!lastRow?.width ||
                  !!lastRow?.height ||
                  !!lastRow?.description
                ) {
                  return true;
                }
                return false;
              }}
              actions={
                <ItemMeasurementActions
                  type={type}
                  editedRowsCount={editedRowsCount}
                  isSavingAll={isSavingAll}
                  handleSaveAll={handleSaveAll}
                  handleDiscardAll={handleDiscardAll}
                  selectedRowsCount={selectedRows.length}
                  isDeleting={isDeleting}
                  handleBulkDeleteClick={handleBulkDeleteClick}
                  totalQuantity={totalQuantity}
                  totalAmount={totalAmount}
                  onImportClick={() => setShowImportDialog(true)}
                  onCopyClick={handleCopyRows}
                  onPasteClick={handlePasteRows}
                  onClearCopyClick={handleClearCopy}
                  hasCopiedRows={hasCopiedRows}
                  isFromSameItem={isFromSameItem}
                />
              }
              onSaveShortcut={(rowData, rowIndex) => {
                const isLoading =
                  sheetTable.table.options.meta?.loadingRows?.has(rowData.id) ??
                  false;
                const isSaveable = rowData.isEdited && !isLoading;

                if (isSaveable && sheetTable.table.options.meta) {
                  handleSave(
                    rowData,
                    sheetTable.table.options
                      .meta as TableMeta<ItemMeasurmentRowData>,
                    rowIndex
                  );
                }
              }}
            />
          </SortableContext>
        </DndContext>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog
          open={showBulkDeleteDialog}
          onOpenChange={(open) => {
            // Prevent closing dialog while deleting
            if (!isDeleting) {
              setShowBulkDeleteDialog(open);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Items?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedRows.length} item(s)?
                This action cannot be undone.
              </AlertDialogDescription>
              {deleteError && (
                <div className='mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {deleteError}
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                disabled={isDeleting}
                className='bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50'
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin text-white' />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import from Measurement Dialog */}
        {type === 'billing' && (
          <ImportMeasurementDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            projectItemHashId={projectItemHashId}
            rate={rate}
            scheduleQuantity={scheduleQuantity}
            existingBillingItems={sheetTable.data}
            onImport={handleImportFromMeasurement}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
