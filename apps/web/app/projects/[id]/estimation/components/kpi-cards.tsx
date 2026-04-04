'use client';

import React from 'react';
import {
  Target,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionCard } from '@/components/ui/section-card';
import { ProjectItemType } from '../types';

interface EstimationReportsKPICardsProps {
  compact?: boolean;
  isLoading?: boolean;
  type: ProjectItemType;
  kpiData?: {
    amount1: number;
    amount2: number;
    costImpact: number;
    overrunItemsCount?: number;
    costEffectiveItemsCount?: number;
  };
}

export function EstimationReportsKPICards({
  compact = false,
  isLoading = false,
  type,
  kpiData,
}: EstimationReportsKPICardsProps) {
  const config = React.useMemo(() => {
    switch (type) {
      case 'MSR':
        return {
          amount1Title: 'Estimated Amount',
          amount1Description: 'Total Estimated amount',
          amount2Title: 'Measured Amount',
          amount2Description: 'Total measured amount',
        };
      case 'EST':
        return {
          amount1Title: 'Planned Amount',
          amount1Description: 'Total Planned amount',
          amount2Title: 'Estimated Amount',
          amount2Description: 'Estimated amount',
        };
      default:
        return {
          amount1Title: 'Planned Amount',
          amount1Description: 'Total Planned amount',
          amount2Title: 'Estimated Amount',
          amount2Description: 'Estimated amount',
        };
    }
  }, [type]);

  // Determine cost deviation icon and type based on value
  const getCostDeviationConfig = (value: number) => {
    if (value > 0) {
      return { icon: TrendingUp, type: 'error' as const }; // Cost overrun is bad
    } else if (value < 0) {
      return { icon: TrendingDown, type: 'success' as const }; // Cost savings is good
    }
    return { icon: Minus, type: 'default' as const }; // Neutral
  };

  const costDeviationConfig = getCostDeviationConfig(kpiData?.costImpact ?? 0);

  if (type === 'BLG') {
    return null;
  }

  return (
    <div className={`@container ${compact ? 'space-y-1' : 'space-y-4'}`}>
      <div
        className={`grid grid-cols-1 gap-3 @sm:grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-4 ${
          compact ? 'gap-1.5' : ''
        }`}
      >
        <SectionCard
          title={config.amount1Title}
          value={
            isLoading
              ? '--'
              : `₹${(kpiData?.amount1 ?? 0).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}`
          }
          icon={Target}
          type='default'
          compact={'extra-compact'}
          description={compact ? undefined : config.amount1Description}
        />
        <SectionCard
          title={config.amount2Title}
          value={
            isLoading
              ? '--'
              : `₹${(kpiData?.amount2 ?? 0).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}`
          }
          icon={ClipboardCheck}
          type='info'
          compact={'extra-compact'}
          description={compact ? undefined : config.amount2Description}
        />
        <SectionCard
          title='Cost Impact'
          value={
            isLoading
              ? '--'
              : `₹${Math.abs(kpiData?.costImpact ?? 0).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}`
          }
          icon={costDeviationConfig.icon}
          type={costDeviationConfig.type}
          compact={'extra-compact'}
          description={compact ? undefined : 'Cost impact of qty deviation'}
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
                <TrendingUp className='h-4 w-4 mr-2 text-red-500' />
                <span className='font-bold mr-1'>
                  {kpiData?.overrunItemsCount ?? 0}
                </span>
                Overrun
              </div>
              <div className='flex items-center'>
                <TrendingDown className='h-4 w-4 mr-2 text-green-500' />
                <span className='font-bold mr-1'>
                  {kpiData?.costEffectiveItemsCount ?? 0}
                </span>
                Cost-Effective
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
