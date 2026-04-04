'use client';

import React, { ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { cn } from '@/lib/utils';

interface FullscreenWrapperProps {
  children: ReactNode;
  title?: string;
  className?: string;
  buttonClassName?: string;
  showFullscreenButton?: boolean;
  fullscreenButtonPosition?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left';
}

export function FullscreenWrapper({
  children,
  className,
  buttonClassName,
  showFullscreenButton = true,
  fullscreenButtonPosition = 'top-right',
}: FullscreenWrapperProps) {
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();

  // Handle keyboard events for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFullscreen && event.key === 'Escape') {
        exitFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when in fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen, exitFullscreen]);

  const buttonPositionClasses = {
    'top-right': 'top-2.5 right-4',
    'top-left': 'top-2.5 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (isFullscreen) {
    return (
      <div
        className='fixed inset-0 z-50  relative'
        onClick={(e) => {
          // Only exit if clicking on the backdrop (not the content)
          if (e.target === e.currentTarget) {
            exitFullscreen();
          }
        }}
      >
        {/* Fullscreen Content */}
        <div className='h-full overflow-auto p-4'>
          <div
            className={cn(
              'h-full rounded-none border-0 shadow-none relative',
              className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click
          >
            {children}

            {/* Exit Fullscreen Button (same position as trigger) */}
            {showFullscreenButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={exitFullscreen}
                    className={cn(
                      'absolute h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background border-0 shadow-sm',
                      buttonPositionClasses[fullscreenButtonPosition],
                      buttonClassName
                    )}
                  >
                    <Minimize2 className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exit Fullscreen</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative'>
      {/* Regular Content */}
      <div className={cn('relative', className)}>{children}</div>

      {/* Fullscreen Button */}
      {showFullscreenButton && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              onClick={enterFullscreen}
              className={cn(
                'absolute h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background border shadow-sm',
                buttonPositionClasses[fullscreenButtonPosition]
              )}
            >
              <Maximize2 className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Fullscreen</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
