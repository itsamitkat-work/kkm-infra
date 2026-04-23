'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ComboboxRenderOptionProps } from '@/components/ui/combobox';
import type { BoqSchedulePick } from '@/app/(app)/schedule-items/boq-schedule-pick';
import { getReferenceScheduleLabelString } from '@/app/(app)/schedule-items/reference-schedule-labels';
import { flattenItemDescription } from './item-description-doc';

export type ScheduleItemPickerOption = BoqSchedulePick & {
  hashId: string;
  code: string;
  name: string;
  scheduleName: string;
  referenceScheduleLabel: string;
  unit: string;
  rate: number | null;
};

export function schedulePickerOptionFromPick(
  pick: BoqSchedulePick
): ScheduleItemPickerOption {
  const row = pick.treeRow;
  const referenceScheduleLabel = getReferenceScheduleLabelString(row);
  const rate =
    typeof row.rate === 'number' && Number.isFinite(row.rate) ? row.rate : null;
  return {
    ...pick,
    hashId: row.id,
    code: row.code ?? '',
    name: flattenItemDescription(pick.itemDescriptionDoc),
    scheduleName: pick.scheduleVersionLabel,
    referenceScheduleLabel,
    unit: row.unit_symbol ?? '',
    rate,
  };
}

export function useScheduleItemPickerOptions(
  picks: BoqSchedulePick[]
): ScheduleItemPickerOption[] {
  return React.useMemo(
    () => picks.map((p) => schedulePickerOptionFromPick(p)),
    [picks]
  );
}

export function renderScheduleItemPickerOption(
  props: ComboboxRenderOptionProps<ScheduleItemPickerOption>
) {
  const { option } = props;
  return (
    <div className='flex flex-col gap-1 py-1'>
      <div className='flex items-center justify-between text-sm'>
        <Tooltip delayDuration={800}>
          <TooltipTrigger asChild>
            <span className='max-w-[320px] font-medium truncate'>
              {option.name || '—'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <span className='max-w-xs break-words'>{option.name || '—'}</span>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
        {option.scheduleName ? (
          <span>Schedule: {option.scheduleName}</span>
        ) : null}
        <span>Code: {option.code || '--'}</span>
        <span>
          Reference schedule: {option.referenceScheduleLabel || '--'}
        </span>
      </div>
    </div>
  );
}
