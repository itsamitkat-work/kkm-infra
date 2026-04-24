import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, SaveAll, Trash2, Download, RotateCcw } from 'lucide-react';
import { CopyPasteButtonGroup } from '@/components/ui/copy-paste-button-group';
import type { ProjectBoqDomainLinesType } from '../types';

interface ItemMeasurementActionsProps {
  type: ProjectBoqDomainLinesType;
  editedRowsCount: number;
  isSavingAll: boolean;
  handleSaveAll: () => void;
  handleDiscardAll: () => void;
  selectedRowsCount: number;
  isDeleting: boolean;
  handleBulkDeleteClick: () => void;
  totalQuantity: number;
  totalAmount: number;
  onImportClick: () => void;
  onCopyClick: () => void;
  onPasteClick: () => void;
  onClearCopyClick: () => void;
  hasCopiedRows: boolean;
  isFromSameItem: boolean;
}

export function ItemMeasurementActions({
  type,
  editedRowsCount,
  isSavingAll,
  handleSaveAll,
  handleDiscardAll,
  selectedRowsCount,
  isDeleting,
  handleBulkDeleteClick,
  totalQuantity,
  totalAmount,
  onImportClick,
  onCopyClick,
  onPasteClick,
  onClearCopyClick,
  hasCopiedRows,
  isFromSameItem,
}: ItemMeasurementActionsProps) {
  return (
    <div className='flex items-center gap-2'>
      {type === 'billing' && (
        <Button
          variant='outline'
          onClick={onImportClick}
          className='gap-1.5 h-7 px-2.5 text-xs'
        >
          <Download className='h-3.5 w-3.5' />
          <span className='hidden sm:inline'>Import from Measurement</span>
          <span className='sm:hidden'>Import</span>
        </Button>
      )}
      {editedRowsCount > 0 && (
        <>
          <Button
            variant='default'
            onClick={handleSaveAll}
            disabled={isSavingAll}
            className='gap-1.5 h-7 px-2.5 text-xs'
          >
            {isSavingAll ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                <span className='hidden sm:inline'>Saving...</span>
                <span className='sm:hidden'>Saving...</span>
              </>
            ) : (
              <>
                <SaveAll className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>
                  Save ({editedRowsCount})
                </span>
                <span className='sm:hidden'>Save ({editedRowsCount})</span>
              </>
            )}
          </Button>
          <Button
            variant='outline'
            onClick={handleDiscardAll}
            className='gap-1.5 h-7 px-2.5 text-xs'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>
              Discard ({editedRowsCount})
            </span>
            <span className='sm:hidden'>Discard</span>
          </Button>
        </>
      )}
      {selectedRowsCount > 0 && (
        <>
          <CopyPasteButtonGroup
            selectedCount={selectedRowsCount}
            hasCopiedItems={hasCopiedRows}
            highlightPaste={isFromSameItem}
            onCopy={onCopyClick}
            onPaste={onPasteClick}
            onClear={onClearCopyClick}
            pasteLabel={(highlighted) =>
              `Paste${highlighted ? ' (same item)' : ''}`
            }
          />
          <Button
            variant='destructive'
            onClick={handleBulkDeleteClick}
            disabled={isDeleting}
            className='gap-1.5 h-7 px-2.5 text-xs text-white disabled:opacity-50'
          >
            {isDeleting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                <span className='hidden sm:inline'>Deleting...</span>
                <span className='sm:hidden'>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>
                  Delete ({selectedRowsCount})
                </span>
                <span className='sm:hidden'>Delete ({selectedRowsCount})</span>
              </>
            )}
          </Button>
        </>
      )}
      {hasCopiedRows && selectedRowsCount === 0 && (
        <CopyPasteButtonGroup
          selectedCount={0}
          hasCopiedItems={hasCopiedRows}
          highlightPaste={isFromSameItem}
          onCopy={onCopyClick}
          onPaste={onPasteClick}
          onClear={onClearCopyClick}
          pasteLabel={(highlighted) =>
            `Paste${highlighted ? ' (same item)' : ''}`
          }
        />
      )}
      {totalQuantity !== undefined && (
        <div className='flex items-center gap-1.5 rounded-md bg-slate-100 px-2 h-7 dark:bg-slate-800'>
          <span className='text-[10px] font-medium text-slate-500 dark:text-slate-400'>
            Total Quantity
          </span>
          <span className='text-[10px] font-semibold text-slate-900 dark:text-slate-50'>
            {new Intl.NumberFormat('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalQuantity)}
          </span>
        </div>
      )}
      {totalAmount !== undefined && (
        <div className='flex items-center gap-1.5 rounded-md bg-slate-100 px-2 h-7 dark:bg-slate-800'>
          <span className='text-[10px] font-medium text-slate-500 dark:text-slate-400'>
            Total Amount
          </span>
          <span className='text-[10px] font-semibold text-slate-900 dark:text-slate-50'>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalAmount)}
          </span>
        </div>
      )}
    </div>
  );
}
