'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollableTabsProps {
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
}

export function ScrollableTabs({
  children,
  className,
  activeValue,
}: ScrollableTabsProps) {
  const [showLeftScrollIndicator, setShowLeftScrollIndicator] =
    React.useState(false);
  const [showRightScrollIndicator, setShowRightScrollIndicator] =
    React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Check scroll position for indicators
  const checkScrollPosition = React.useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement;
    if (viewport) {
      const { scrollLeft, scrollWidth, clientWidth } = viewport;
      setShowLeftScrollIndicator(scrollLeft > 0);
      setShowRightScrollIndicator(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // Set up scroll listener and initial check
  React.useEffect(() => {
    let viewport: HTMLElement | null = null;
    let handleScroll: (() => void) | null = null;
    let handleResize: (() => void) | null = null;

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      viewport = scrollAreaRef.current?.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (!viewport) return;

      // Initial check
      checkScrollPosition();

      // Listen for scroll events
      handleScroll = () => {
        checkScrollPosition();
      };
      viewport.addEventListener('scroll', handleScroll, { passive: true });

      // Also check on resize
      handleResize = () => {
        checkScrollPosition();
      };
      window.addEventListener('resize', handleResize);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (viewport && handleScroll) {
        viewport.removeEventListener('scroll', handleScroll);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [checkScrollPosition]);

  const scroll = React.useCallback((direction: 'left' | 'right') => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement;
    if (viewport) {
      const scrollAmount = 200;
      viewport.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  // Scroll to active tab when activeValue changes
  React.useEffect(() => {
    if (!activeValue) return;

    // Use requestAnimationFrame to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      const viewport = scrollAreaRef.current?.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (!viewport) return;

      // Find the active tab trigger element
      const activeTab = viewport.querySelector(
        `[data-slot="tabs-trigger"][data-state="active"]`
      ) as HTMLElement;

      if (activeTab) {
        // Calculate scroll position to center the tab
        const viewportRect = viewport.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        const scrollLeft = viewport.scrollLeft;
        const tabLeft = tabRect.left - viewportRect.left + scrollLeft;
        const tabWidth = tabRect.width;
        const viewportWidth = viewportRect.width;
        
        // Center the tab in the viewport
        const targetScroll = tabLeft - (viewportWidth / 2) + (tabWidth / 2);
        
        viewport.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth',
        });

        // Update scroll indicators after scrolling
        setTimeout(() => {
          checkScrollPosition();
        }, 100);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [activeValue, checkScrollPosition]);

  return (
    <div className={cn('relative', className)} ref={scrollAreaRef}>
      <ScrollArea className='w-full rounded-lg'>
        {children}
        <ScrollBar orientation='horizontal' className='hidden' />
      </ScrollArea>
      {showLeftScrollIndicator && (
        <Button
          size='icon'
          variant='ghost'
          className='absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-l-lg rounded-r-none bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm'
          onClick={() => scroll('left')}
          aria-label='Scroll left'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>
      )}
      {showRightScrollIndicator && (
        <Button
          size='icon'
          variant='ghost'
          className='absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-r-lg rounded-l-none bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm'
          onClick={() => scroll('right')}
          aria-label='Scroll right'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}

