'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryState, parseAsString } from 'nuqs';
import { cn } from '@/lib/utils';
import { BillTable } from './components/bill-table';

const TAB_CONFIG = [
  { id: 'bom', label: 'Bill of Materials', mobileLabel: 'BOM' },
  { id: 'bol', label: 'Bill of Labour', mobileLabel: 'BOL' },
  { id: 'tp', label: 'Bill of Tools and Plants', mobileLabel: 'T&P' },
] as const;

export default function BillsPage() {
  return (
    <div className='h-full w-full bg-background'>
      <React.Suspense
        fallback={
          <div className='p-4 space-y-4'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-8 w-32' />
            </div>
            <Skeleton className='h-[300px] w-full' />
          </div>
        }
      >
        <BillsDashboard />
      </React.Suspense>
    </div>
  );
}

function BillsDashboard() {
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('bom'));

  return (
    <div className='flex h-full w-full flex-col gap-4 p-4 lg:max-w-7xl mx-auto'>
      <div className='bg-muted/20 px-0 py-2'>
        <div className='flex items-center justify-start'>
          <div className='flex items-center rounded-md bg-muted p-1'>
            {TAB_CONFIG.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative px-3 py-1 text-[12px] font-medium transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-primary',
                  tab === t.id
                    ? 'bg-background text-foreground shadow-sm rounded'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className='hidden sm:inline'>{t.label}</span>
                <span className='sm:hidden'>{t.mobileLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='flex-1 min-h-0'>
        <BillTable tab={tab} />
      </div>
    </div>
  );
}
