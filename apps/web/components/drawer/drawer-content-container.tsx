'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';

/**
 * A reusable FormContainer component that provides consistent layout
 * for form content within drawers, including mobile-responsive separators
 * and proper spacing.
 *
 * This component automatically handles:
 * - Mobile detection for responsive behavior
 * - Conditional separator rendering (hidden on mobile)
 * - Consistent padding and overflow handling
 * - Proper gap spacing for form sections
 *
 */

interface Props {
  children: React.ReactNode;
  className?: string;
  showTopSeparator?: boolean;
}

export const DrawerContentContainer = React.memo<Props>(
  ({ children, className = '', showTopSeparator = true }) => {
    const isMobile = useIsMobile();

    return (
      <div
        className={`flex flex-col gap-4 overflow-y-auto px-4 pb-6 text-sm ${className}`}
      >
        {showTopSeparator && !isMobile && <Separator />}
        {children}
      </div>
    );
  }
);

DrawerContentContainer.displayName = 'DrawerContentContainer';
