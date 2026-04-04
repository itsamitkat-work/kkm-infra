import { cn } from '@/lib/utils';
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';

// KPI Card component
interface KpiCardProps {
  title: string;
  value: number | string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueClassName?: string;
  variant?: 'default' | 'emerald' | 'red' | 'purple' | 'amber';
}

export function KpiCard({
  title,
  value,
  trend,
  className,
  valueClassName,
  variant = 'default',
}: KpiCardProps) {
  const variantStyles = {
    default: {
      bg: 'bg-muted/50',
      indicator: 'bg-muted-foreground/30',
      text: 'text-foreground',
      border: 'border-border/50',
    },
    emerald: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      indicator: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/50',
    },
    red: {
      bg: 'bg-red-50/50 dark:bg-red-950/20',
      indicator: 'bg-red-500',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-100 dark:border-red-900/50',
    },
    purple: {
      bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      indicator: 'bg-purple-500',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-900/50',
    },
    amber: {
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      indicator: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/50',
    },
  };

  const styles = variantStyles[variant];
  const numericValue =
    typeof value === 'number' ? value : parseFloat(value as string) || 0;
  const isZero = numericValue === 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden px-3 py-1.5 flex flex-row items-center gap-2 rounded-sm rounded-l-sm border transition-all duration-200 hover:shadow-sm',
        styles.bg,
        styles.border,
        className
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 transition-opacity',
          styles.indicator,
          isZero && 'opacity-30'
        )}
      />
      <span className='text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 whitespace-nowrap'>
        {title}
      </span>
      <span
        className={cn(
          'text-sm font-bold tracking-tight flex-shrink-0 transition-opacity',
          styles.text,
          isZero && 'opacity-50',
          valueClassName
        )}
      >
        {typeof value === 'number' ? value.toString().padStart(2, '0') : value}
      </span>
      {trend && (
        <div className='flex items-center gap-1 text-xs shrink-0'>
          {trend.isPositive ? (
            <IconTrendingUp className='size-3 text-emerald-500' />
          ) : (
            <IconTrendingDown className='size-3 text-red-500' />
          )}
          <span
            className={cn(
              'font-medium',
              trend.isPositive ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {trend.value.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
