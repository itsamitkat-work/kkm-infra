'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  IconChevronDown,
  IconDownload,
  IconLock,
  IconLockOpen,
  IconLoader2,
  IconPlus,
  IconUserMinus,
} from '@tabler/icons-react';
import { StatusDropdownContent } from './attendance-columns';
import { AttendanceStatus } from '../types';

interface AttendanceBulkActionsProps {
  selectedCount: number;
  canUpdateResourcePool: boolean;
  canLockAttendance: boolean;
  isReleasing: boolean;
  isLocking: boolean;
  isUnlocking: boolean;
  isExporting: boolean;
  workersCount: number;
  hasUnlockedRows: boolean;
  onClearSelection: () => void;
  onStatusChange: (status: AttendanceStatus | null) => void;
  onIncentiveClick: () => void;
  onReleaseClick: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onExportPDF: () => void;
}

export function AttendanceBulkActions({
  selectedCount,
  canUpdateResourcePool,
  canLockAttendance,
  isReleasing,
  isLocking,
  isUnlocking,
  isExporting,
  workersCount,
  hasUnlockedRows,
  onClearSelection,
  onStatusChange,
  onIncentiveClick,
  onReleaseClick,
  onLock,
  onUnlock,
  onExportPDF,
}: AttendanceBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <>
      <span className='text-sm text-muted-foreground hidden sm:inline'>
        <span className='font-medium text-foreground'>{selectedCount}</span>{' '}
        selected
      </span>

      {/* Mobile: Icon-only buttons */}
      <div className='sm:hidden flex items-center gap-1'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-7 gap-1.5'
              disabled={!hasUnlockedRows}
            >
              Status
              <IconChevronDown className='h-3.5 w-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <StatusDropdownContent
              currentStatus={null}
              onChange={onStatusChange}
              showClear
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant='outline'
          size='sm'
          className='h-7 w-7 p-0'
          onClick={onIncentiveClick}
          disabled={!hasUnlockedRows}
          title='Add Incentive'
        >
          <IconPlus className='h-4 w-4' />
        </Button>
        {canUpdateResourcePool && (
          <Button
            variant='outline'
            size='sm'
            className='h-7 w-7 p-0'
            onClick={onReleaseClick}
            disabled={isReleasing}
            title='Release to Pool'
          >
            {isReleasing ? (
              <IconLoader2 className='h-4 w-4 animate-spin' />
            ) : (
              <IconUserMinus className='h-4 w-4' />
            )}
          </Button>
        )}
        {canLockAttendance && (
          <div className='flex items-center rounded-md border border-input overflow-hidden'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 w-7 p-0 rounded-none border-0 border-r border-input'
              onClick={onLock}
              disabled={isLocking}
              title='Lock'
            >
              {isLocking ? (
                <IconLoader2 className='h-4 w-4 animate-spin' />
              ) : (
                <IconLock className='h-4 w-4' />
              )}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 w-7 p-0 rounded-none border-0'
              onClick={onUnlock}
              disabled={isUnlocking}
              title='Unlock'
            >
              {isUnlocking ? (
                <IconLoader2 className='h-4 w-4 animate-spin' />
              ) : (
                <IconLockOpen className='h-4 w-4' />
              )}
            </Button>
          </div>
        )}
        <Button
          variant='outline'
          size='sm'
          className='h-7 w-7 p-0'
          onClick={onExportPDF}
          disabled={isExporting || workersCount === 0}
          title='Download PDF'
        >
          {isExporting ? (
            <IconLoader2 className='h-4 w-4 animate-spin' />
          ) : (
            <IconDownload className='h-4 w-4' />
          )}
        </Button>
      </div>

      {/* Desktop: Individual buttons */}
      <div className='hidden sm:flex items-center gap-2'>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 text-xs text-muted-foreground'
          onClick={onClearSelection}
        >
          Clear
        </Button>
        <div className='h-4 w-px bg-border' />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-7 gap-1.5'
              disabled={!hasUnlockedRows}
            >
              <span className='hidden md:inline'>Change Status</span>
              <span className='md:hidden'>Status</span>
              <IconChevronDown className='size-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <StatusDropdownContent
              currentStatus={null}
              onChange={onStatusChange}
              showClear
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant='outline'
          size='sm'
          className='h-7 gap-1.5'
          onClick={onIncentiveClick}
          disabled={!hasUnlockedRows}
        >
          <span className='hidden md:inline'>₹ Add Incentive</span>
          <span className='md:hidden'>
            <IconPlus className='size-3.5' />
          </span>
        </Button>
        {canUpdateResourcePool && (
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1.5'
            onClick={onReleaseClick}
            disabled={isReleasing}
          >
            {isReleasing ? (
              <IconLoader2 className='h-4 w-4 animate-spin' />
            ) : (
              <IconUserMinus className='h-4 w-4' />
            )}
            <span className='hidden md:inline'>Release to Pool</span>
            <span className='md:hidden'>Release</span>
          </Button>
        )}
        {canLockAttendance && (
          <>
            <div className='h-4 w-px bg-border' />
            <div className='flex items-center rounded-md border border-input overflow-hidden'>
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 rounded-none border-0 border-r border-input last:border-r-0'
                onClick={onLock}
                disabled={isLocking}
              >
                {isLocking ? (
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <IconLock className='h-4 w-4' />
                )}
                <span className='hidden lg:inline'>Lock</span>
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 rounded-none border-0 border-r border-input last:border-r-0'
                onClick={onUnlock}
                disabled={isUnlocking}
              >
                {isUnlocking ? (
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <IconLockOpen className='h-4 w-4' />
                )}
                <span className='hidden lg:inline'>Unlock</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
