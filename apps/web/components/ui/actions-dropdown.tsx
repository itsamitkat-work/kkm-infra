'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVerticalIcon } from 'lucide-react';

export interface ActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  disabled?: boolean;
  show?: boolean;
}

export interface ActionsDropdownProps {
  actions: ActionItem[];
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
  modal?: boolean;
}

export function ActionsDropdown({
  actions,
  triggerClassName = '',
  contentClassName = '',
  align = 'end',
  side = 'bottom',
  disabled = false,
  modal = true,
}: ActionsDropdownProps) {
  // Filter actions based on show property
  const visibleActions = actions.filter((action) => action.show !== false);

  // Group actions by variant for separators
  const groupedActions = visibleActions.reduce(
    (groups, action) => {
      const variant = action.variant || 'default';
      if (!groups[variant]) {
        groups[variant] = [];
      }
      groups[variant].push(action);
      return groups;
    },
    {} as Record<string, ActionItem[]>
  );

  const getVariantClassName = (variant: ActionItem['variant']) => {
    switch (variant) {
      case 'destructive':
        return 'text-red-600 focus:text-red-700 focus:bg-red-50';
      case 'warning':
        return 'text-orange-600 focus:text-orange-700 focus:bg-orange-50';
      default:
        return '';
    }
  };

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu modal={modal}>
      <DropdownMenuTrigger asChild>
        <Button
          size='icon'
          variant='ghost'
          disabled={disabled}
          className={`${triggerClassName}`}
        >
          <MoreVerticalIcon className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className={`w-48 ${contentClassName}`}
      >
        {Object.entries(groupedActions).map(
          ([variant, variantActions], groupIndex) => (
            <React.Fragment key={variant}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              {variantActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={getVariantClassName(action.variant)}
                >
                  <action.icon className='h-4 w-4 mr-2' />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
