'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ComboboxRenderOptionProps } from '@/components/ui/combobox';
import { MasterItem } from '@/hooks/items/types';

export type MasterItemOption = {
  hashId: string;
  code: string;
  referenceScheduleLabel: string;
  name: string;
  scheduleName: string;
  unit: string;
  rate: number | null;
  raw: MasterItem;
};

export const mapMasterItemToOption = (item: MasterItem): MasterItemOption => {
  const legacy = item as MasterItem & {
    dsrCode?: string | null;
    dsrId?: string | null;
  };
  const referenceScheduleLabel =
    item.referenceScheduleLabel ??
    legacy.dsrCode ??
    legacy.dsrId ??
    '';
  return {
    hashId: item.hashId,
    code: item.code ?? '',
    referenceScheduleLabel,
    name: item.name ?? '',
    scheduleName: item.scheduleName ?? item.scheduleRate ?? '',
    unit: item.unit ?? '',
    rate: typeof item.rate === 'number' ? item.rate : null,
    raw: item,
  };
};

export const useMasterItemOptions = (
  masterProjectItems: MasterItem[]
): MasterItemOption[] => {
  return React.useMemo(
    () => masterProjectItems.map((item) => mapMasterItemToOption(item)),
    [masterProjectItems]
  );
};

export const renderMasterItemOption = ({
  option,
}: ComboboxRenderOptionProps<MasterItemOption>) => {
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
        <span>Reference schedule: {option.referenceScheduleLabel || '--'}</span>
      </div>
    </div>
  );
};
