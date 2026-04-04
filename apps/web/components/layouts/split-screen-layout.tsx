import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SplitScreenLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  leftRatio?: string;
  rightRatio?: string;
  className?: string;
  mobileStacked?: boolean;
}

export function SplitScreenLayout({
  leftContent,
  rightContent,
  leftRatio = 'w-1/2',
  rightRatio = 'w-1/2',
  className,
  mobileStacked = true,
}: SplitScreenLayoutProps) {
  return (
    <div className={cn('min-h-svh w-full', className)}>
      {/* Mobile: Stacked layout */}
      {mobileStacked && (
        <div className='md:hidden min-h-svh flex flex-col'>
          <div className='h-1/2 min-h-[280px] max-h-[400px]'>{leftContent}</div>
          <div className='flex-1 flex items-center justify-center p-4 sm:p-6 bg-background min-h-0'>
            {rightContent}
          </div>
        </div>
      )}

      {/* Desktop: Split layout */}
      <div className='hidden md:flex min-h-svh w-full'>
        <div className={cn('relative min-h-svh bg-muted', leftRatio)}>
          {leftContent}
        </div>
        <div
          className={cn(
            'flex items-center justify-center p-6 md:p-10',
            rightRatio
          )}
        >
          {rightContent}
        </div>
      </div>
    </div>
  );
}
