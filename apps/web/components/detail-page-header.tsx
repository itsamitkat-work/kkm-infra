'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconArrowLeft, IconDotsVertical } from '@tabler/icons-react';

export interface ActionMenuItem {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface DetailPageHeaderProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ActionMenuItem[];
  additionalActions?: ActionMenuItem[];
  className?: string;
}

// Action dropdown menu component
const ActionDropdownMenu = ({
  actions,
  additionalActions,
}: {
  actions?: ActionMenuItem[];
  additionalActions?: ActionMenuItem[];
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
        <IconDotsVertical className='size-4' />
        <span className='sr-only'>Open menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align='end' className='w-48'>
      {actions?.map((item, index) => (
        <DropdownMenuItem
          key={index}
          onClick={item.disabled ? undefined : item.onClick}
          disabled={item.disabled}
          className={
            item.variant === 'destructive'
              ? 'text-destructive focus:text-destructive'
              : ''
          }
        >
          <item.icon className='size-4 mr-2' />
          {item.label}
        </DropdownMenuItem>
      ))}
      {additionalActions && additionalActions.length > 0 && (
        <>
          <DropdownMenuSeparator />
          {additionalActions.map((item, index) => (
            <DropdownMenuItem
              key={`additional-${index}`}
              onClick={item.disabled ? undefined : item.onClick}
              disabled={item.disabled}
              className={
                item.variant === 'destructive'
                  ? 'text-destructive focus:text-destructive'
                  : ''
              }
            >
              <item.icon className='size-4 mr-2' />
              {item.label}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

export function DetailPageHeader({
  title,
  onBack,
  backLabel = 'Back',
  actions = [],
  additionalActions = [],
  className = '',
}: DetailPageHeaderProps) {
  return (
    <div className={`bg-background border-b sticky top-0 z-10 ${className}`}>
      <div className='flex items-center justify-between px-6 py-3'>
        {/* Left Section - Navigation & Title */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          {onBack && (
            <>
              <Button
                variant='ghost'
                size='sm'
                onClick={onBack}
                className='flex items-center gap-2 shrink-0 h-8 px-2'
              >
                <IconArrowLeft className='size-4' />
                <span className='font-medium hidden sm:inline text-sm'>
                  {backLabel}
                </span>
              </Button>
              <div className='h-4 w-px bg-border hidden sm:block' />
            </>
          )}
          <div className='flex flex-col min-w-0'>
            <h1 className='text-xl font-semibold text-foreground tracking-tight truncate'>
              {title}
            </h1>
          </div>
        </div>

        {/* Right Section - Actions */}
        {(actions.length > 0 || additionalActions.length > 0) && (
          <div className='flex items-center gap-1 shrink-0'>
            {/* Mobile: Only show dropdown menu */}
            <div className='sm:hidden'>
              <ActionDropdownMenu
                actions={actions}
                additionalActions={additionalActions}
              />
            </div>

            {/* Desktop: Show individual buttons */}
            <div className='hidden sm:flex items-center gap-1'>
              {actions.map((item, index) => (
                <Button
                  key={index}
                  variant='ghost'
                  size='sm'
                  className='flex items-center gap-2 h-8 px-3'
                  onClick={item.onClick}
                  disabled={item.disabled}
                >
                  <item.icon className='size-4' />
                  <span className='text-sm'>{item.label.split(' ')[0]}</span>
                </Button>
              ))}
              <ActionDropdownMenu
                actions={actions}
                additionalActions={additionalActions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
