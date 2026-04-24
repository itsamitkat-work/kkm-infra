import { ProjectItemRowType } from '@/types/project-item';
import {
  type ScheduleItemPickerOption,
  schedulePickerOptionFromPick,
} from '@/app/(app)/schedule-items/schedule-item-picker-option';
import type { ScheduleTreeRow } from '@/app/(app)/schedule-items/types';
import { ScheduleItemsTree } from '@/app/(app)/schedule-items/schedule-items-tree';
import {
  type ItemDescriptionDoc,
  flattenItemDescription,
} from '@/app/(app)/schedule-items/item-description-doc';
import {
  boqSchedulePickFromProjectBoqRow,
  boqSchedulePickFromTreeLeaf,
} from '@/app/(app)/schedule-items/boq-schedule-pick';
import React from 'react';
import { useSchedulePickSelection } from './use-schedule-pick-selection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ChevronsUpDown } from 'lucide-react';

/**
 * Configuration for a master item editor column
 */
export interface MasterItemEditorConfigType {
  placeholder: string;
  searchPlaceholder: string;
  searchField: 'code' | 'name';
  getOptionLabel?: (option: ScheduleItemPickerOption) => string;
  renderSelectedValue: (
    option: ScheduleItemPickerOption | null,
    placeholder: string,
    rowValue?: unknown
  ) => React.ReactNode;
  getOnChangeValue: (option: ScheduleItemPickerOption | null) => unknown;
  getRowValue: (row: ProjectItemRowType) => unknown;
  /** Merged into the schedule-picker trigger `Button` (e.g. `justify-center` for narrow columns). */
  triggerClassName?: string;
  /** Merged into the label `span` inside the trigger (overrides default `flex-1` growth when set). */
  labelClassName?: string;
}

interface MasterItemEditorProps {
  row: ProjectItemRowType;
  config: MasterItemEditorConfigType;
  onChange?: (value: unknown) => void;
  autoFocus?: boolean;
}

/**
 * MasterItemEditorConfig — pick a schedule leaf item via the same tree as
 * Schedule Items, opened in a dialog. Cross-column sync uses
 * `useSchedulePickSelection` + `buildPatchFromSchedulePick` from `../utils`.
 */
export const MasterItemEditorConfig = ({
  config,
  row,
  onChange,
  autoFocus = false,
}: MasterItemEditorProps) => {
  const [open, setOpen] = React.useState(false);
  const { setSelection, getSelection } = useSchedulePickSelection(row.id);

  const storedPick = getSelection();

  const matchedOption = React.useMemo(() => {
    if (!row.schedule_item_id) {
      return null;
    }
    if (storedPick && storedPick.treeRow.id === row.schedule_item_id) {
      return schedulePickerOptionFromPick(storedPick);
    }
    return schedulePickerOptionFromPick(boqSchedulePickFromProjectBoqRow(row));
  }, [row, storedPick]);

  const effectiveOption = React.useMemo(() => {
    if (matchedOption) {
      return matchedOption;
    }
    if (storedPick) {
      return schedulePickerOptionFromPick(storedPick);
    }
    return null;
  }, [matchedOption, storedPick]);

  const handleSelectLeaf = React.useCallback(
    ({
      row: treeRow,
      scheduleVersionLabel,
      hierarchyDescriptionDoc,
    }: {
      row: ScheduleTreeRow;
      scheduleVersionLabel: string;
      hierarchyDescriptionDoc: ItemDescriptionDoc;
    }) => {
      const pick = boqSchedulePickFromTreeLeaf({
        row: treeRow,
        scheduleVersionLabel,
        hierarchyDescriptionDoc,
      });
      const option = schedulePickerOptionFromPick(pick);
      setSelection(pick);
      onChange?.(config.getOnChangeValue(option));
      setOpen(false);
    },
    [setSelection, config, onChange]
  );

  const displayLabel = React.useMemo(() => {
    const rowValue = config.getRowValue(row);
    return config.renderSelectedValue(
      effectiveOption,
      config.placeholder,
      rowValue
    );
  }, [effectiveOption, config, row]);

  const hasPickedOrRowValue = React.useMemo(() => {
    if (effectiveOption) {
      return true;
    }
    const rowValue = config.getRowValue(row);
    if (rowValue == null) {
      return false;
    }
    if (typeof rowValue === 'object') {
      return (
        flattenItemDescription(rowValue as ItemDescriptionDoc).trim() !== ''
      );
    }
    return String(rowValue).trim() !== '';
  }, [effectiveOption, config, row]);

  return (
    <div className='flex h-full min-h-8 w-full min-w-0 max-w-full flex-col overflow-x-hidden'>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            autoFocus={autoFocus}
            className={cn(
              'flex h-full min-h-8 w-full min-w-0 max-w-full items-center justify-between gap-0.5 overflow-x-hidden rounded-none border-0 bg-transparent px-0 py-0 text-left text-sm font-normal text-foreground/90 shadow-none ring-0 ring-offset-0',
              'hover:bg-transparent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-0',
              'active:bg-transparent',
              config.triggerClassName
            )}
            aria-label={`${config.searchField === 'code' ? 'Choose item by code' : 'Choose item by name'}. Opens schedule tree.`}
          >
            <span
              className={cn(
                'min-w-0 flex-1',
                hasPickedOrRowValue ? 'text-foreground' : 'text-muted-foreground',
                config.labelClassName === undefined ? 'truncate' : undefined,
                config.labelClassName
              )}
            >
              {displayLabel}
            </span>
            <ChevronsUpDown
              className='size-3.5 shrink-0 text-muted-foreground opacity-35'
              aria-hidden
            />
          </Button>
        </DialogTrigger>
        <DialogContent
          showCloseButton
          className='flex max-h-[min(90vh,880px)] w-[min(96vw,56rem)] max-w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,56rem)]'
        >
          <DialogHeader className='border-border shrink-0 border-b px-4 py-3 text-left'>
            <DialogTitle>Select schedule item</DialogTitle>
          </DialogHeader>
          <div className='flex min-h-0 min-h-[50vh] flex-1 flex-col px-2 pb-3 pt-0 sm:min-h-[55vh]'>
            <ScheduleItemsTree
              embedded
              className='min-h-0 flex-1'
              onSelectLeaf={handleSelectLeaf}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
