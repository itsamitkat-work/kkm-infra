'use client';

import * as React from 'react';
import { IconClock, IconCurrencyRupee } from '@tabler/icons-react';
import { AttendanceTimeConfig } from '../config/attendance-config';
import { TimeInput, NumberInput } from '@/components/inputs';

interface GlobalConfigTabProps {
  config: AttendanceTimeConfig;
  onConfigChange: (config: AttendanceTimeConfig) => void;
}

export function GlobalConfigTab({
  config,
  onConfigChange,
}: GlobalConfigTabProps) {
  return (
    <div className='flex flex-col gap-6'>
      <div className='space-y-4'>
        <div className='flex items-center gap-2 px-1'>
          <IconClock className='size-3.5 text-muted-foreground' />
          <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
            Shift & Timing
          </h4>
        </div>

        <div className='bg-muted/30 p-3 rounded-lg border border-border/50'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3'>
            <TimeInput
              id='global-in'
              label='Ideal In Time'
              value={config.idealInTime}
              onChange={(v) => onConfigChange({ ...config, idealInTime: v })}
            />
            <TimeInput
              id='global-out'
              label='Ideal Out Time'
              value={config.idealOutTime}
              onChange={(v) => onConfigChange({ ...config, idealOutTime: v })}
            />
            <TimeInput
              id='global-split'
              label='Half Day Split'
              value={config.halfDaySplitTime || '13:00'}
              onChange={(v) =>
                onConfigChange({ ...config, halfDaySplitTime: v })
              }
            />
            <NumberInput
              id='global-grace'
              label='Grace Period'
              suffix='min'
              value={config.gracePeriodMinutes}
              onChange={(v) =>
                onConfigChange({ ...config, gracePeriodMinutes: v })
              }
              min={0}
              max={60}
            />
            <NumberInput
              id='global-hours'
              label='Work Hours'
              suffix='hrs'
              value={config.workingHoursPerDay}
              onChange={(v) =>
                onConfigChange({ ...config, workingHoursPerDay: v })
              }
              className='col-span-1 sm:col-span-2'
              min={1}
              max={24}
            />
          </div>
        </div>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center gap-2 px-1'>
          <IconCurrencyRupee className='size-3.5 text-muted-foreground' />
          <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
            Incentive Rates
          </h4>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
          <NumberInput
            id='rate-overtime'
            label='Overtime'
            prefix='₹'
            suffix='/hr'
            value={config.incentiveRatePerHour.overtime}
            onChange={(v) =>
              onConfigChange({
                ...config,
                incentiveRatePerHour: {
                  ...config.incentiveRatePerHour,
                  overtime: v,
                },
              })
            }
          />
          <NumberInput
            id='rate-undertime'
            label='Undertime'
            prefix='₹'
            suffix='/hr'
            value={config.incentiveRatePerHour.undertime}
            onChange={(v) =>
              onConfigChange({
                ...config,
                incentiveRatePerHour: {
                  ...config.incentiveRatePerHour,
                  undertime: v,
                },
              })
            }
          />
          <NumberInput
            id='rate-night'
            label='Night Shift'
            prefix='₹'
            suffix='/hr'
            value={config.incentiveRatePerHour.nightShift}
            onChange={(v) =>
              onConfigChange({
                ...config,
                incentiveRatePerHour: {
                  ...config.incentiveRatePerHour,
                  nightShift: v,
                },
              })
            }
          />
          <NumberInput
            id='rate-weekend'
            label='Weekend'
            prefix='₹'
            suffix='/hr'
            value={config.incentiveRatePerHour.weekend}
            onChange={(v) =>
              onConfigChange({
                ...config,
                incentiveRatePerHour: {
                  ...config.incentiveRatePerHour,
                  weekend: v,
                },
              })
            }
          />
          <NumberInput
            id='rate-holiday'
            label='Holiday'
            prefix='₹'
            suffix='/hr'
            value={config.incentiveRatePerHour.holiday}
            onChange={(v) =>
              onConfigChange({
                ...config,
                incentiveRatePerHour: {
                  ...config.incentiveRatePerHour,
                  holiday: v,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
