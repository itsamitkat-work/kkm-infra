'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

/**
 * A reusable DrawerWrapper component that provides consistent drawer behavior
 * with automatic mobile detection and responsive direction handling.
 *
 * This component automatically handles:
 * - Mobile detection for responsive drawer direction
 * - Bottom drawer on mobile, right drawer on desktop
 * - Consistent drawer content structure
 * - Proper open/close state management
 *
 * @example
 * ```tsx
 * <DrawerWrapper open={open} onOpenChange={onOpenChange}>
 *   <FormDrawerHeader ... />
 *   <FormContainer>
 *     <FormSection title="Basic Information">
 *       <FormInputField ... />
 *     </FormSection>
 *   </FormContainer>
 * </DrawerWrapper>
 * ```
 */

interface DrawerWrapperProps {
  children: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const DrawerWrapper = React.memo<DrawerWrapperProps>(
  ({ children, open, onClose, className = '' }) => {
    const isMobile = useIsMobile();

    return (
      <Drawer
        direction={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={onClose}
      >
        <DrawerContent className={className}>{children}</DrawerContent>
      </Drawer>
    );
  }
);

DrawerWrapper.displayName = 'DrawerWrapper';
