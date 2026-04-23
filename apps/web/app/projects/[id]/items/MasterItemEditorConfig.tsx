import { ProjectItemRowType } from '@/types/project-item';
import {
  type MasterItemOption,
  mapMasterItemToOption,
} from '../components/master-item-options';
import type { MasterItem } from '@/hooks/items/types';
import type { ScheduleTreeRow } from '@/app/(app)/schedule-items/types';
import { getReferenceScheduleLabelString } from '@/app/(app)/schedule-items/reference-schedule-labels';
import { ScheduleItemsTree } from '@/app/(app)/schedule-items/schedule-items-tree';
import React from 'react';
import { useMasterItemSelection } from './use-master-item-selection';
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
  getOptionLabel?: (option: MasterItemOption) => string;
  renderSelectedValue: (
    option: MasterItemOption | null,
    placeholder: string,
    rowValue?: string
  ) => React.ReactNode;
  getOnChangeValue: (option: MasterItemOption | null) => string;
  getRowValue: (row: ProjectItemRowType) => string;
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

function mapScheduleTreeRowToMasterItem(
  treeRow: ScheduleTreeRow,
  scheduleVersionLabel: string
): MasterItem {
  const rate = treeRow.rate;
  const referenceScheduleText = getReferenceScheduleLabelString(treeRow);
  return {
    hashId: treeRow.id,
    code: treeRow.code ?? '',
    referenceScheduleLabel:
      referenceScheduleText !== '' ? referenceScheduleText : null,
    name: treeRow.description ?? '',
    unit: treeRow.unit_symbol ?? '',
    rate: typeof rate === 'number' && Number.isFinite(rate) ? rate : 0,
    scheduleName: scheduleVersionLabel || null,
    scheduleRate: scheduleVersionLabel || null,
  };
}

/**
 * MasterItemEditorConfig — pick a schedule leaf item via the same tree as
 * Schedule Items, opened in a dialog. Cross-column sync uses
 * `useMasterItemSelection` + `buildPatchFromSelection` as before.
 */
export const MasterItemEditorConfig = ({
  config,
  row,
  onChange,
  autoFocus = false,
}: MasterItemEditorProps) => {
  const [open, setOpen] = React.useState(false);
  const { setSelection, getSelection } = useMasterItemSelection(row.id);

  const storedMasterItem = getSelection();

  const matchedOption = React.useMemo(() => {
    if (!row.schedule_item_id) {
      return null;
    }
    if (storedMasterItem && storedMasterItem.hashId === row.schedule_item_id) {
      return mapMasterItemToOption(storedMasterItem);
    }
    return mapMasterItemToOption({
      hashId: row.schedule_item_id,
      code: row.item_code ?? '',
      referenceScheduleLabel: row.reference_schedule_text ?? null,
      name: row.item_description ?? '',
      unit: row.unit_display ?? '',
      rate: parseFloat(row.rate_amount || '0') || 0,
      scheduleName: row.schedule_name ?? null,
      scheduleRate: row.schedule_name ?? null,
    } satisfies MasterItem);
  }, [row, storedMasterItem]);

  const effectiveOption = React.useMemo(() => {
    if (matchedOption) {
      return matchedOption;
    }
    if (storedMasterItem) {
      return mapMasterItemToOption(storedMasterItem);
    }
    return null;
  }, [matchedOption, storedMasterItem]);

  const handleSelectLeaf = React.useCallback(
    ({
      row: treeRow,
      scheduleVersionLabel,
    }: {
      row: ScheduleTreeRow;
      scheduleVersionLabel: string;
    }) => {
      const masterItem = mapScheduleTreeRowToMasterItem(
        treeRow,
        scheduleVersionLabel
      );
      const option = mapMasterItemToOption(masterItem);
      setSelection(masterItem);
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

  return (
    <div className='w-full min-w-0 max-w-full overflow-hidden'>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            autoFocus={autoFocus}
            className={cn(
              'flex h-auto min-h-8 w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-none border-0 bg-transparent px-2 py-1 text-left text-sm font-normal text-muted-foreground shadow-none ring-offset-0',
              'hover:bg-muted/40 hover:text-foreground',
              'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
              config.triggerClassName
            )}
            aria-label={`${config.searchField === 'code' ? 'Choose item by code' : 'Choose item by name'}. Opens schedule tree.`}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-foreground',
                config.labelClassName
              )}
            >
              {displayLabel}
            </span>
            <ChevronsUpDown
              className='text-muted-foreground size-4 shrink-0 opacity-60'
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
            <p className='text-muted-foreground text-sm font-normal'>
              Expand folders, then use{' '}
              <span className='text-foreground font-medium'>Select</span> on a
              line item (leaf).
            </p>
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
