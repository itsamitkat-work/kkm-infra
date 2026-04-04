'use client';

import React, { useMemo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useRouter, useSearchParams } from 'next/navigation';

import { useDeviationReportItemsList } from './hooks/use-deviation-items-list';
import { DeviationReportType } from './types';
import {
  TableRow,
  TableHead,
  TableCell,
  Table,
  TableHeader,
  TableBody,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { SectionCard } from '@/components/ui/section-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

import { DeviationRow } from './deviation-row';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  IconListDetails,
  IconTrendingDown,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react';
import { Loader2, Scale, FileText } from 'lucide-react';
import { DeviationExportButtons } from './components/deviation-export-buttons';

const DEVIATION_TYPES = ['GENvsEST', 'GENvsMSR', 'ESTvsMSR'];
const DEVIATION_FILTERS = ['all', 'overrun', 'cost-effective'];

const typeLabels = {
  GENvsEST: { q1: 'Planned', q2: 'Estimated' },
  GENvsMSR: { q1: 'Planned', q2: 'Measured' },
  ESTvsMSR: { q1: 'Estimated', q2: 'Measured' },
};

export function DeviationReportTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type =
    (searchParams.get('comparison') as DeviationReportType) || 'GENvsEST';
  const deviationFilter = searchParams.get('deviation') || 'all';

  // Validate params to prevent invalid values from being used
  const validatedType = DEVIATION_TYPES.includes(type) ? type : 'GENvsEST';
  const validatedDeviationFilter = DEVIATION_FILTERS.includes(deviationFilter)
    ? deviationFilter
    : 'all';

  const labels = typeLabels[validatedType];

  const handleValueChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set(key, value);
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  // Fetch estimation data using the hook
  const {
    data: hookData,
    isLoading,
    isError,
  } = useDeviationReportItemsList({
    id: projectId,
    type: validatedType,
  });

  const filteredData = useMemo(() => {
    if (validatedDeviationFilter === 'all') {
      return hookData;
    }
    return hookData.filter((item) => {
      const deviation = (item.quantity2 || 0) - (item.quantity1 || 0);
      if (validatedDeviationFilter === 'overrun') {
        return deviation > 0;
      }
      if (validatedDeviationFilter === 'cost-effective') {
        return deviation < 0;
      }
      return true;
    });
  }, [hookData, validatedDeviationFilter]);

  const kpiData = useMemo(() => {
    const stats = {
      totalItems: filteredData.length,
      overrunItemsCount: 0,
      costEffectiveItemsCount: 0,
      netDeviationAmount: 0,
      totalAmount1: 0,
      totalAmount2: 0,
    };

    for (const item of filteredData) {
      const rate = item.rate || 0;
      const quantity1 = item.quantity1 || 0;
      const quantity2 = item.quantity2 || 0;
      const amount1 = quantity1 * rate;
      const amount2 = quantity2 * rate;
      const deviationQty = quantity2 - quantity1;

      if (deviationQty > 0) {
        stats.overrunItemsCount++;
      } else if (deviationQty < 0) {
        stats.costEffectiveItemsCount++;
      }

      stats.netDeviationAmount += amount2 - amount1;
      stats.totalAmount1 += amount1;
      stats.totalAmount2 += amount2;
    }

    return stats;
  }, [filteredData]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className='relative'>
        <div className='grid gap-2 md:grid-cols-2 lg:grid-cols-4 p-4'>
          <SectionCard
            title={`${labels.q1} Amount`}
            value={formatCurrency(kpiData.totalAmount1)}
            icon={FileText}
            compact='extra-compact'
          />
          <SectionCard
            title={`${labels.q2} Amount`}
            value={formatCurrency(kpiData.totalAmount2)}
            icon={FileText}
            compact='extra-compact'
          />
          <SectionCard
            title='Net Deviation'
            value={formatCurrency(kpiData.netDeviationAmount)}
            icon={Scale}
            compact='extra-compact'
            type={
              kpiData.netDeviationAmount > 0
                ? 'error'
                : kpiData.netDeviationAmount < 0
                  ? 'success'
                  : 'default'
            }
          />

          <Card className='rounded-xl border-0 shadow-sm'>
            <CardHeader className='px-3 py-0'>
              <CardTitle className='text-sm font-medium text-muted-foreground/80 mb-0 -mt-1'>
                Item Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className='px-3'>
              <div className='flex justify-between text-sm'>
                <div className='flex items-center'>
                  <IconTrendingUp className='h-4 w-4 mr-2 text-red-500' />
                  <span className='font-bold mr-1'>
                    {kpiData.overrunItemsCount}
                  </span>
                  Overrun
                </div>
                <div className='flex items-center'>
                  <IconTrendingDown className='h-4 w-4 mr-2 text-green-500' />
                  <span className='font-bold mr-1'>
                    {kpiData.costEffectiveItemsCount}
                  </span>
                  Cost-Effective
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className='flex justify-between items-center p-4'>
          <div className='flex items-center gap-2'>
            <ToggleGroup
              type='single'
              value={validatedDeviationFilter}
              onValueChange={(value) => {
                if (value) {
                  handleValueChange('deviation', value);
                }
              }}
              variant='outline'
              size='sm'
            >
              <ToggleGroupItem value='all' className='w-38 justify-center'>
                <IconListDetails className='h-4 w-4 mr-2' />
                All
              </ToggleGroupItem>
              <ToggleGroupItem
                value='overrun'
                className='w-38 justify-center data-[state=on]:bg-red-500 data-[state=on]:text-white'
              >
                <IconTrendingUp className='h-4 w-4 mr-2' />
                Overrun
              </ToggleGroupItem>
              <ToggleGroupItem
                value='cost-effective'
                className='w-38 justify-center data-[state=on]:bg-green-500 data-[state=on]:text-white'
              >
                <IconTrendingDown className='h-4 w-4 mr-2' />
                Cost-Effective
              </ToggleGroupItem>
            </ToggleGroup>

            {validatedDeviationFilter !== 'all' && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleValueChange('deviation', 'all')}
                className='flex items-center gap-2'
              >
                <IconX className='h-4 w-4' />
                Clear
              </Button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <DeviationExportButtons
              projectId={projectId}
              disabled={isLoading || isError}
            />

            <ToggleGroup
              type='single'
              value={validatedType}
              onValueChange={(value) => {
                if (value) {
                  handleValueChange('comparison', value);
                }
              }}
              variant='outline'
              size='sm'
            >
              <ToggleGroupItem
                value='GENvsEST'
                className='data-[state=on]:bg-sky-500 data-[state=on]:text-white'
              >
                Planned vs Estimated
              </ToggleGroupItem>
              <ToggleGroupItem
                value='GENvsMSR'
                className='data-[state=on]:bg-green-500 data-[state=on]:text-white'
              >
                Planned vs Measured
              </ToggleGroupItem>
              <ToggleGroupItem
                value='ESTvsMSR'
                className='data-[state=on]:bg-amber-500 data-[state=on]:text-white'
              >
                Estimated vs Measured
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className='border rounded-lg overflow-hidden'>
          <div className='relative h-[calc(100vh-360px)] overflow-y-auto'>
            <Table className='table-fixed'>
              <TableHeader className='sticky top-0 z-10 bg-background'>
                <TableRow>
                  <TableHead className='w-12 text-center border-r py-1 px-2'>
                    #
                  </TableHead>
                  <TableHead className='w-12 text-center border-r py-1 px-2'>
                    Wo. No.
                  </TableHead>
                  <TableHead className='w-[400px] border-r py-1 px-2'>
                    Item Name
                  </TableHead>
                  <TableHead className='w-20 text-right border-r py-1 px-2'>
                    Planned Qty
                  </TableHead>
                  <TableHead className='w-24 text-right border-r py-1 px-2'>
                    Planned Amount
                  </TableHead>
                  <TableHead className='w-20 text-right border-r py-1 px-2'>
                    Estimated Qty
                  </TableHead>
                  <TableHead className='w-24 text-right border-r py-1 px-2'>
                    Estimated Amount
                  </TableHead>
                  <TableHead className='w-24 text-right py-1 px-2'>
                    Deviation
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className='py-2 text-muted-foreground'
                    >
                      <div className='flex items-center justify-center'>
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                        Loading data...
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className='text-center py-2 text-muted-foreground'
                    >
                      Error loading data. Please try again.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  !isError &&
                  filteredData.map((item, index) => {
                    return (
                      <DeviationRow key={index} item={item} index={index} />
                    );
                  })}

                {!isLoading && !isError && filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Empty>
                        <EmptyHeader>
                          <EmptyTitle>No Items Found</EmptyTitle>
                          <EmptyDescription>
                            There are no items that match your current filters.
                            Try adjusting your selection.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
