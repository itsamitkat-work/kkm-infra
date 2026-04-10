'use client';

import * as React from 'react';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IconDownload, IconLoader2 } from '@tabler/icons-react';
import { useAttendanceConfig } from '../hooks/use-attendance-config';
import {
  getAttendanceColumns,
  AttendanceRowActions,
} from './attendance-columns';
import { AttendanceRow, AttendanceStatus } from '../types';
import {
  bulkCreateAttendance,
  bulkUpdateAttendance,
} from '../api/attendance-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHeadsSubheads } from '@/hooks/use-heads-subheads';
import { getConfigForProject } from '../config/attendance-config';
import { useQueryState } from 'nuqs';
import type { SortingState } from '@tanstack/react-table';
import { useAuth } from '@/hooks/auth';
import { usePoolMutations } from '../../pool/hooks/use-pool-mutations';
import type { AttendanceDataHook } from '../data/attendance-collection';
import { useAttendanceLockMutations } from '../hooks/use-attendance-lock-mutations';
import { useHotkeys } from 'react-hotkeys-hook';
import { exportAttendanceToPDF } from '../utils/export-utils';
import { BulkIncentiveDialog } from './bulk-incentive-dialog';
import { ReleaseToPoolDialog } from './release-to-pool-dialog';
import { AttendanceBulkActions } from './attendance-bulk-actions';
import { AssignFromPoolDialog } from './assign-from-pool-dialog';
import { User } from 'lucide-react';

interface AttendanceTableProps {
  search: string;
  attendanceData: AttendanceDataHook;
  userId: string;
  workingHoursPerDay: number;
  date: string;
  userName?: string;
  isAssignFromPoolDialogOpen?: boolean;
  onAssignFromPoolDialogChange?: (open: boolean) => void;
  onAssignFromPoolComplete?: () => void;
}

function validateRow(row: AttendanceRow): {
  statusError?: string;
  headError?: string;
} | null {
  // Status is only required in production, not in local environment
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const statusError =
    isLocalEnv || row.status ? undefined : 'Status is required';
  const headError = row.head ? undefined : 'Head is required';

  if (statusError || headError) {
    return { statusError, headError };
  }
  return null;
}

const DEFAULT_SORTING: SortingState = [{ id: 'selectAndName', desc: false }];

export function AttendanceTable({
  search,
  attendanceData,
  userId,
  workingHoursPerDay,
  date,
  userName,
  isAssignFromPoolDialogOpen: externalIsAssignFromPoolDialogOpen,
  onAssignFromPoolDialogChange: externalOnAssignFromPoolDialogChange,
  onAssignFromPoolComplete,
}: AttendanceTableProps) {
  const isMobile = useIsMobile();
  const {
    workers,
    updateRow,
    insertRow,
    dirtyRows,
    clearDirtyFlags,
    refetch,
    isLoading,
  } = attendanceData;
  const { config } = useAttendanceConfig();

  // Use nuqs to manage sorting in URL
  const [sorting, setSorting] = useQueryState('sort', {
    defaultValue: DEFAULT_SORTING,
    parse: (value: string) => {
      try {
        return JSON.parse(value) as SortingState;
      } catch {
        return DEFAULT_SORTING;
      }
    },
    serialize: (value: SortingState) => JSON.stringify(value),
    clearOnDefault: true,
  });

  // Helper function to calculate in/out times based on status
  const calculateTimesForStatus = React.useCallback(
    (
      status: AttendanceStatus | null,
      projectId: string,
      rowDate: string
    ): { clockIn: string | null; clockOut: string | null } => {
      if (!config || !status) {
        return { clockIn: null, clockOut: null };
      }

      const timeConfig = getConfigForProject(config, projectId);

      // Helper to calculate overtime times based on shifts and extra hours
      // Handles cross-day scenarios by returning ISO datetime when outTime is next day
      function calculateOvertimeTimes(
        shifts: number,
        extraHours: number
      ): { clockIn: string; clockOut: string } {
        const totalHours = shifts * timeConfig.workingHoursPerDay + extraHours;

        // Parse ideal in time
        const [inHours, inMinutes] = timeConfig.idealInTime
          .split(':')
          .map(Number);

        // Calculate out time by adding total hours to in time
        const totalInMinutes = inHours * 60 + inMinutes;
        const totalOutMinutes = totalInMinutes + totalHours * 60;

        // Calculate how many days the out time spans
        const daysOffset = Math.floor(totalOutMinutes / (24 * 60));
        const outHours = Math.floor((totalOutMinutes % (24 * 60)) / 60);
        const outMins = totalOutMinutes % 60;

        const clockIn = `${String(inHours).padStart(2, '0')}:${String(inMinutes).padStart(2, '0')}`;

        // If out time is on the same day, return simple HH:MM format
        // If out time crosses to next day(s), return ISO datetime with correct date
        let clockOut: string;
        if (daysOffset === 0) {
          clockOut = `${String(outHours).padStart(2, '0')}:${String(outMins).padStart(2, '0')}`;
        } else {
          // Calculate the actual out date by adding days offset
          const datePart = rowDate.includes('T')
            ? rowDate.split('T')[0]
            : rowDate;
          const baseDate = new Date(datePart);
          baseDate.setDate(baseDate.getDate() + daysOffset);
          const outDateStr = baseDate.toISOString().split('T')[0];
          clockOut = `${outDateStr}T${String(outHours).padStart(2, '0')}:${String(outMins).padStart(2, '0')}:00`;
        }

        return { clockIn, clockOut };
      }

      switch (status) {
        case 'A':
          return {
            clockIn: null,
            clockOut: null,
          };

        case 'first_half':
          return {
            clockIn: timeConfig.idealInTime,
            clockOut: timeConfig.halfDaySplitTime || timeConfig.idealOutTime,
          };

        case 'second_half':
          return {
            clockIn: timeConfig.halfDaySplitTime || timeConfig.idealInTime,
            clockOut: timeConfig.idealOutTime,
          };

        // Undertime statuses - hours worked less than one full shift
        case 'U1':
          return calculateOvertimeTimes(0, 1);
        case 'U2':
          return calculateOvertimeTimes(0, 2);
        case 'U3':
          return calculateOvertimeTimes(0, 3);
        case 'U4':
          return calculateOvertimeTimes(0, 4);
        case 'U5':
          return calculateOvertimeTimes(0, 5);
        case 'U6':
          return calculateOvertimeTimes(0, 6);
        case 'U7':
          return calculateOvertimeTimes(0, 7);

        // Overtime statuses - P = 1 shift, PP = 2 shifts, PPP = 3 shifts
        // Number suffix indicates extra hours (e.g., P2 = 1 shift + 2 hours)
        case 'P':
          return calculateOvertimeTimes(1, 0);
        case 'P1':
          return calculateOvertimeTimes(1, 1);
        case 'P2':
          return calculateOvertimeTimes(1, 2);
        case 'P3':
          return calculateOvertimeTimes(1, 3);
        case 'P4':
          return calculateOvertimeTimes(1, 4);
        case 'P5':
          return calculateOvertimeTimes(1, 5);
        case 'P6':
          return calculateOvertimeTimes(1, 6);
        case 'P7':
          return calculateOvertimeTimes(1, 7);
        case 'PP':
          return calculateOvertimeTimes(2, 0);
        case 'PP1':
          return calculateOvertimeTimes(2, 1);
        case 'PP2':
          return calculateOvertimeTimes(2, 2);
        case 'PP3':
          return calculateOvertimeTimes(2, 3);
        case 'PP4':
          return calculateOvertimeTimes(2, 4);
        case 'PP5':
          return calculateOvertimeTimes(2, 5);
        case 'PP6':
          return calculateOvertimeTimes(2, 6);
        case 'PP7':
          return calculateOvertimeTimes(2, 7);
        case 'PPP':
          return calculateOvertimeTimes(3, 0);

        default:
          return { clockIn: null, clockOut: null };
      }
    },
    [config]
  );

  // Helper to update a generic field value
  const updateGenericField = (
    row: AttendanceRow,
    field: string,
    value: string | number | boolean | null | undefined
  ): AttendanceRow => {
    return {
      ...row,
      [field]: value ?? null,
      isDirty: true,
    };
  };

  // Helper to update status field with derived times
  const updateStatusField = (
    row: AttendanceRow,
    statusValue: AttendanceStatus | null
  ): AttendanceRow => {
    const expectedTimes = calculateTimesForStatus(
      statusValue,
      row.projectId,
      row.dates
    );

    // Convert UI shortcuts to U4 for backend
    const backendStatus =
      statusValue === 'first_half' || statusValue === 'second_half'
        ? 'U4'
        : statusValue;

    // Status is only required in production, not in local environment
    const isLocalEnv = process.env.NODE_ENV === 'development';
    const statusError =
      isLocalEnv || backendStatus ? undefined : 'Status is required';

    return {
      ...row,
      status: backendStatus,
      inTime: expectedTimes.clockIn,
      outTime: expectedTimes.clockOut,
      statusError,
      isDirty: true,
    };
  };

  // Helper to update head field with validation
  const updateHeadField = (
    row: AttendanceRow,
    value: string | number | boolean | null | undefined
  ): AttendanceRow => {
    const headValue = value != null ? String(value) : null;
    return {
      ...row,
      head: headValue,
      headError: headValue ? undefined : 'Head is required',
      isDirty: true,
    };
  };

  // Helper function to update row
  const updateField = React.useCallback(
    (
      row: AttendanceRow,
      field:
        | 'status'
        | 'inTime'
        | 'outTime'
        | 'head'
        | 'projectHeadId'
        | 'remarks'
        | 'incentive'
        | 'isChecked'
        | 'isVerified'
        | 'isLocked'
        | 'projectId'
        | 'projectName',
      value: string | number | boolean | null | undefined
    ) => {
      updateRow(row.uniqueId, (currentRow) => {
        if (field === 'status') {
          return updateStatusField(
            currentRow,
            value as AttendanceStatus | null
          );
        }
        if (field === 'head') {
          return updateHeadField(currentRow, value);
        }
        return updateGenericField(currentRow, field, value);
      });
    },
    [updateRow, calculateTimesForStatus]
  );

  // Bulk update handlers
  const handleBulkUpdateChecked = React.useCallback(
    (checked: boolean) => {
      workers.forEach((row) => {
        if (row.isChecked !== checked) {
          updateField(row, 'isChecked', checked);
        }
      });
    },
    [workers, updateField]
  );

  const handleBulkUpdateVerified = React.useCallback(
    (verified: boolean) => {
      workers.forEach((row) => {
        if (row.isVerified !== verified) {
          updateField(row, 'isVerified', verified);
        }
      });
    },
    [workers, updateField]
  );

  // Bulk update status for selected rows
  const handleBulkUpdateStatus = React.useCallback(
    (rowIds: string[], status: AttendanceStatus | null) => {
      workers.forEach((row) => {
        if (rowIds.includes(row.uniqueId) && !row.isLocked) {
          updateField(row, 'status', status);
        }
      });
    },
    [workers, updateField]
  );

  // Bulk update incentive for selected rows
  const handleBulkUpdateIncentive = React.useCallback(
    (rowIds: string[], incentive: number | null) => {
      workers.forEach((row) => {
        if (rowIds.includes(row.uniqueId) && !row.isLocked) {
          updateField(row, 'incentive', incentive);
        }
      });
    },
    [workers, updateField]
  );

  // Handler for project updates with shouldCreate flag
  const handleUpdateProject = React.useCallback(
    (
      row: AttendanceRow,
      projectId: string | null,
      projectName: string | null,
      shouldCreate?: boolean
    ) => {
      if (shouldCreate && projectId) {
        // Create a new row with the new projectId
        const newUniqueId = `${row.empId}#${projectId}`;
        const newRow: AttendanceRow = {
          ...row,
          uniqueId: newUniqueId,
          id: undefined, // No ID for new items - will be created on server
          projectId,
          projectName,
          isDirty: true, // Mark new rows as dirty
        };

        // Add the new row
        insertRow(newRow);
      } else {
        // Update project fields on existing row
        updateField(row, 'projectId', projectId);
        updateField(row, 'projectName', projectName);
      }
    },
    [updateField, insertRow]
  );

  const actions: AttendanceRowActions = React.useMemo(
    () => ({
      onUpdateField: (
        row: AttendanceRow,
        field:
          | 'status'
          | 'inTime'
          | 'outTime'
          | 'head'
          | 'projectHeadId'
          | 'remarks'
          | 'incentive'
          | 'isChecked'
          | 'isVerified'
          | 'isLocked'
          | 'projectId'
          | 'projectName',
        value: string | number | boolean | null | undefined
      ) => {
        updateField(row, field, value);
      },
      onUpdateProject: handleUpdateProject,
      onBulkUpdateChecked: handleBulkUpdateChecked,
      onBulkUpdateVerified: handleBulkUpdateVerified,
      onBulkUpdateStatus: handleBulkUpdateStatus,
      onBulkUpdateIncentive: handleBulkUpdateIncentive,
    }),
    [
      updateField,
      handleUpdateProject,
      handleBulkUpdateChecked,
      handleBulkUpdateVerified,
      handleBulkUpdateStatus,
      handleBulkUpdateIncentive,
    ]
  );

  const { headOptions: allHeads } = useHeadsSubheads();

  const { permissions } = useAuth();

  const { releaseUsers, isReleasing } = usePoolMutations();

  // Create a map of empId -> Set of projectIds for existing attendance records
  const existingAttendanceByEmpId = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    workers.forEach((row) => {
      if (!map.has(row.empId)) {
        map.set(row.empId, new Set());
      }
      map.get(row.empId)!.add(row.projectId);
    });
    return map;
  }, [workers]);

  const columns = React.useMemo(
    () =>
      getAttendanceColumns(
        actions,
        config,
        allHeads,
        existingAttendanceByEmpId,
        permissions
      ),
    [actions, config, allHeads, existingAttendanceByEmpId, permissions]
  );

  const table = useReactTable({
    data: workers,
    columns,
    state: {
      globalFilter: search,
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.uniqueId,
    globalFilterFn: (row, _columnId, filterValue) => {
      const searchValue = String(filterValue || '')
        .toLowerCase()
        .trim();
      if (!searchValue) return true;

      const user = row.original;
      const name = user.empName.toLowerCase();
      const empCode = user.empCode.toString();

      return name.includes(searchValue) || empCode.includes(searchValue);
    },
    enableRowSelection: true,
  });

  const selectedRowModel = table.getSelectedRowModel();
  const selectedRowIds = React.useMemo(() => {
    return selectedRowModel.rows.map((row) => row.id);
  }, [selectedRowModel]);

  const selectedCount = selectedRowIds.length;

  // Check if there are any unlocked rows in the selection
  const hasUnlockedRows = React.useMemo(() => {
    return selectedRowModel.rows.some((row) => !row.original.isLocked);
  }, [selectedRowModel]);

  // PDF export handler
  const [isExporting, setIsExporting] = React.useState(false);

  function handleExportToPDF() {
    try {
      setIsExporting(true);
      toast.loading('Generating PDF file...', { id: 'export-toast' });

      // Get filtered rows based on search
      const filteredRows = table
        .getFilteredRowModel()
        .rows.map((row) => row.original);

      exportAttendanceToPDF({
        date,
        workers: filteredRows,
        config,
      });

      toast.success('PDF file downloaded successfully!', {
        id: 'export-toast',
      });
    } catch (error) {
      console.error('Export to PDF failed:', error);
      toast.error('Failed to export to PDF. Please try again.', {
        id: 'export-toast',
      });
    } finally {
      setIsExporting(false);
    }
  }

  // Bulk incentive dialog state
  const [isBulkIncentiveDialogOpen, setIsBulkIncentiveDialogOpen] =
    React.useState(false);
  const [bulkIncentiveValue, setBulkIncentiveValue] =
    React.useState<string>('');

  // Bulk release to pool dialog state
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = React.useState(false);

  // Assign from pool dialog state - use external if provided, otherwise internal
  const [
    internalIsAssignFromPoolDialogOpen,
    setInternalIsAssignFromPoolDialogOpen,
  ] = React.useState(false);
  const isAssignFromPoolDialogOpen =
    externalIsAssignFromPoolDialogOpen ?? internalIsAssignFromPoolDialogOpen;
  const setIsAssignFromPoolDialogOpen =
    externalOnAssignFromPoolDialogChange ??
    setInternalIsAssignFromPoolDialogOpen;

  // Lock/unlock mutations
  const { lockAttendance, unlockAttendance, isLocking, isUnlocking } =
    useAttendanceLockMutations();

  // Save state
  const [isSaving, setIsSaving] = React.useState(false);

  const dirtyCount = dirtyRows.length;

  // Validate dirty rows and update error flags
  const validateDirtyRows = React.useCallback((): boolean => {
    const rowsWithErrors: string[] = [];

    dirtyRows.forEach((row) => {
      const errors = validateRow(row);
      if (errors) {
        rowsWithErrors.push(row.empName);
        updateRow(row.uniqueId, (r) => ({
          ...r,
          statusError: errors.statusError,
          headError: errors.headError,
        }));
      }
    });

    if (rowsWithErrors.length > 0) {
      toast.error(
        `${rowsWithErrors.length} row(s) have validation errors. Please fix them before saving.`
      );
      return false;
    }

    return true;
  }, [dirtyRows, updateRow]);

  // Split rows into updates and inserts
  const splitRowsForSave = React.useCallback(() => {
    const rowsToUpdate = dirtyRows.filter((row) => row.id);
    const rowsToInsert = dirtyRows.filter((row) => !row.id);
    return { rowsToUpdate, rowsToInsert };
  }, [dirtyRows]);

  // Save handler
  const handleSaveChanges = React.useCallback(async () => {
    if (dirtyCount === 0) return;

    // Validate all dirty rows
    if (!validateDirtyRows()) {
      return;
    }

    setIsSaving(true);

    try {
      const { rowsToUpdate, rowsToInsert } = splitRowsForSave();
      const promises: Promise<unknown>[] = [];

      if (rowsToUpdate.length > 0) {
        const updateRecords = rowsToUpdate.map((row) => ({
          updates: row,
          original: row,
        }));
        promises.push(
          bulkUpdateAttendance(updateRecords, userId, workingHoursPerDay)
        );
      }

      if (rowsToInsert.length > 0) {
        promises.push(
          bulkCreateAttendance(rowsToInsert, userId, workingHoursPerDay)
        );
      }

      await Promise.all(promises);

      // Lock rows that are verified and were just saved
      const savedRows = [...rowsToUpdate, ...rowsToInsert];
      const verifiedRowsToLock = savedRows.filter(
        (row) => row.isVerified && row.id && !row.isLocked
      );
      if (verifiedRowsToLock.length > 0) {
        const verifiedIds = verifiedRowsToLock
          .map((row) => row.id)
          .filter((id): id is string => !!id);

        if (verifiedIds.length > 0) {
          try {
            await lockAttendance(verifiedIds);
          } catch (error) {
            // Log error but don't fail the save operation
            console.error('Failed to lock verified rows:', error);
          }
        }
      }

      // Clear isDirty and error flags on success
      clearDirtyFlags();

      toast.success(
        `Successfully saved ${dirtyCount} record${dirtyCount > 1 ? 's' : ''}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save changes'
      );
    } finally {
      setIsSaving(false);
      // Refetch data from server after save (success or failure)
      refetch();
    }
  }, [
    dirtyCount,
    validateDirtyRows,
    splitRowsForSave,
    dirtyRows,
    userId,
    workingHoursPerDay,
    clearDirtyFlags,
    refetch,
    lockAttendance,
  ]);

  // Keyboard shortcut to save (Ctrl+S / Cmd+S)
  useHotkeys(
    'ctrl+s, meta+s',
    (event) => {
      event.preventDefault();
      if (dirtyCount > 0 && !isSaving) {
        handleSaveChanges();
      }
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    },
    [dirtyCount, isSaving, handleSaveChanges]
  );

  function handleBulkIncentiveSave() {
    const numValue =
      bulkIncentiveValue === '' || bulkIncentiveValue === '-'
        ? null
        : parseFloat(bulkIncentiveValue);
    if (
      bulkIncentiveValue === '' ||
      (!isNaN(numValue as number) && numValue !== null)
    ) {
      handleBulkUpdateIncentive(selectedRowIds, numValue);
      setIsBulkIncentiveDialogOpen(false);
      setBulkIncentiveValue('');
      table.resetRowSelection();
    }
  }

  function handleBulkIncentiveClear() {
    handleBulkUpdateIncentive(selectedRowIds, null);
    setIsBulkIncentiveDialogOpen(false);
    setBulkIncentiveValue('');
    table.resetRowSelection();
  }

  async function handleBulkReleaseToPool() {
    const selectedRows = workers.filter((row) =>
      selectedRowIds.includes(row.uniqueId)
    );
    const empIds = selectedRows.map((row) => row.empId);

    if (empIds.length === 0) return;

    try {
      await releaseUsers(empIds);
      setIsReleaseDialogOpen(false);
      table.resetRowSelection();
    } catch (error) {
      // Error is already handled by the mutation's onError callback
    }
  }

  async function handleBulkLock() {
    const selectedRows = workers.filter((row) =>
      selectedRowIds.includes(row.uniqueId)
    );
    const ids = selectedRows
      .map((row) => row.id)
      .filter((id): id is string => !!id);

    if (ids.length === 0) {
      toast.error('No valid records selected for locking');
      return;
    }

    try {
      await lockAttendance(ids);
      table.resetRowSelection();
      refetch();
    } catch (error) {
      // Error is already handled by the mutation's onError callback
    }
  }

  async function handleBulkUnlock() {
    const selectedRows = workers.filter((row) =>
      selectedRowIds.includes(row.uniqueId)
    );
    const ids = selectedRows
      .map((row) => row.id)
      .filter((id): id is string => !!id);

    if (ids.length === 0) {
      toast.error('No valid records selected for unlocking');
      return;
    }

    try {
      await unlockAttendance(ids);
      table.resetRowSelection();
      refetch();
    } catch (error) {
      // Error is already handled by the mutation's onError callback
    }
  }

  const isBulkIncentiveValid =
    bulkIncentiveValue === '' ||
    bulkIncentiveValue === '-' ||
    (!isNaN(parseFloat(bulkIncentiveValue)) && bulkIncentiveValue !== '-');

  if (isLoading && workers.length === 0) {
    return (
      <div className='rounded-lg border overflow-hidden'>
        <Table className='w-full table-fixed'>
          <TableHeader className='bg-muted'>
            <TableRow>
              {columns.map((column, i) => (
                <TableHead key={i} className='whitespace-nowrap'>
                  <Skeleton className='h-4 w-20' />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className='h-4 w-full' />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (workers.length === 0 && !isLoading) {
    return (
      <div className='rounded-lg border p-12 text-center'>
        <p className='text-muted-foreground'>No attendance records found</p>
        {search && (
          <p className='text-sm text-muted-foreground mt-1'>
            Try adjusting your search criteria
          </p>
        )}
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {/* User name - shown above on mobile, in header on desktop */}
      {userName && (
        <div className='flex items-center gap-1 text-sm text-muted-foreground sm:hidden'>
          <User className='size-4' />
          <span className='font-medium text-foreground'>{userName}</span>
        </div>
      )}

      {/* Header row with count and bulk actions */}
      <div className='flex items-center justify-between min-h-[28px]'>
        <div className='hidden items-center gap-2 text-sm text-muted-foreground sm:flex'>
          {userName && (
            <span className='flex items-center gap-1'>
              <User className='size-4' />
              <span className='font-medium text-foreground'>{userName}</span>
            </span>
          )}
        </div>

        {/* Bulk actions - shown when rows are selected */}
        <div className='flex items-center gap-2'>
          <AttendanceBulkActions
            selectedCount={selectedCount}
            permissions={permissions}
            isReleasing={isReleasing}
            isLocking={isLocking}
            isUnlocking={isUnlocking}
            isExporting={isExporting}
            workersCount={workers.length}
            hasUnlockedRows={hasUnlockedRows}
            onClearSelection={() => table.resetRowSelection()}
            onStatusChange={(status) => {
              handleBulkUpdateStatus(selectedRowIds, status);
              table.resetRowSelection();
            }}
            onIncentiveClick={() => {
              setBulkIncentiveValue('');
              setIsBulkIncentiveDialogOpen(true);
            }}
            onReleaseClick={() => setIsReleaseDialogOpen(true)}
            onLock={handleBulkLock}
            onUnlock={handleBulkUnlock}
            onExportPDF={handleExportToPDF}
          />

          <>
            {selectedCount > 0 && <div className='h-4 w-px bg-border' />}
            {/* Desktop: PDF button */}
            <div className='hidden sm:block'>
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5'
                onClick={handleExportToPDF}
                disabled={isExporting || workers.length === 0}
              >
                {isExporting ? (
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <IconDownload className='h-4 w-4' />
                )}
                Download PDF
              </Button>
            </div>
            {/* Save button - always visible */}
            <Button
              variant='primary'
              size='sm'
              className='h-7 gap-1.5'
              onClick={handleSaveChanges}
              disabled={isSaving || dirtyCount === 0}
            >
              {isSaving ? (
                <IconLoader2 className='h-4 w-4 animate-spin' />
              ) : null}
              <span className='hidden sm:inline'>
                Save Changes ({dirtyCount})
              </span>
              <span className='sm:hidden'>Save ({dirtyCount})</span>
            </Button>
          </>
        </div>
      </div>

      <BulkIncentiveDialog
        open={isBulkIncentiveDialogOpen}
        onOpenChange={setIsBulkIncentiveDialogOpen}
        selectedCount={selectedCount}
        value={bulkIncentiveValue}
        onValueChange={setBulkIncentiveValue}
        onSave={handleBulkIncentiveSave}
        onClear={handleBulkIncentiveClear}
        isValid={isBulkIncentiveValid}
      />

      <ReleaseToPoolDialog
        open={isReleaseDialogOpen}
        onOpenChange={setIsReleaseDialogOpen}
        selectedCount={selectedCount}
        onConfirm={handleBulkReleaseToPool}
        isReleasing={isReleasing}
      />

      <AssignFromPoolDialog
        open={isAssignFromPoolDialogOpen}
        onOpenChange={setIsAssignFromPoolDialogOpen}
        onAssignComplete={() => {
          // Refetch attendance data after assignment
          refetch();
          onAssignFromPoolComplete?.();
        }}
      />

      {/* Table */}
      <div className='rounded-lg border overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table className='w-full' style={{ minWidth: '885px' }}>
            <TableHeader className='bg-muted sticky top-0 z-10'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={cn(isMobile && 'h-8')}
                >
                  {headerGroup.headers.map((header, index) => {
                    const columnSize = header.column.getSize();
                    // Adjust size for merged column, status column, and head column on mobile
                    const adjustedSize =
                      isMobile && index === 0
                        ? 160 // Merged checkbox + name column
                        : isMobile && index === 1
                          ? 70 // Status column
                          : isMobile && index === 2
                            ? 70 // Head column
                            : columnSize;
                    const isStickyColumn = index === 0; // First column (merged checkbox + name) - always sticky

                    // Use min-width for all columns to let table distribute space naturally
                    const widthStyle = `${adjustedSize}px`;

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          width: widthStyle,
                          ...(isStickyColumn && {
                            position: 'sticky',
                            left: 0,
                            zIndex: 30,
                          }),
                        }}
                        className={cn(
                          'text-foreground h-8 px-1.5 text-left align-middle font-medium whitespace-nowrap',
                          isMobile && 'px-1 py-1 text-[10px]',
                          isStickyColumn && [
                            'shadow-[4px_0_6px_rgba(0,0,0,0.1)]',
                            'bg-muted',
                          ]
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const isDirty = row.original.isDirty;
                const hasErrors =
                  row.original.statusError || row.original.headError;

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    className={cn(
                      isMobile ? 'h-10' : 'h-14',
                      row.getIsSelected() && 'bg-muted',
                      isDirty && '!border-l-2 !border-l-amber-500',
                      hasErrors && '!border-l-4 !border-l-destructive'
                    )}
                    style={{
                      ...(row.getIsSelected() && {
                        backgroundColor: 'hsl(var(--muted))',
                        opacity: 1,
                      }),
                      ...(isDirty && {
                        borderLeftWidth: '2px',
                        borderLeftColor: 'rgb(245 158 11)', // amber-500
                        borderLeftStyle: 'solid',
                      }),
                      ...(hasErrors && {
                        borderLeftWidth: '4px',
                        borderLeftColor: 'hsl(var(--destructive))',
                        borderLeftStyle: 'solid',
                      }),
                    }}
                  >
                    {row.getVisibleCells().map((cell, index) => {
                      const columnSize = cell.column.getSize();
                      // Adjust size for merged column, status column, and head column on mobile
                      const adjustedSize =
                        isMobile && index === 0
                          ? 160 // Merged checkbox + name column
                          : isMobile && index === 1
                            ? 70 // Status column
                            : isMobile && index === 2
                              ? 70 // Head column
                              : columnSize;
                      const isStickyColumn = index === 0; // First column (merged checkbox + name) - always sticky

                      // Use min-width for all columns to let table distribute space naturally
                      const widthStyle = `${adjustedSize}px`;

                      // Determine background for sticky column - must be solid to cover scrolled content
                      const stickyBg = row.getIsSelected()
                        ? 'bg-muted'
                        : 'bg-background';

                      return (
                        <td
                          key={cell.id}
                          style={{
                            width: widthStyle,
                            ...(isStickyColumn && {
                              position: 'sticky',
                              left: 0,
                              zIndex: 20,
                            }),
                            ...(isStickyColumn &&
                              isDirty && {
                                borderLeftWidth: '2px',
                                borderLeftColor: 'rgb(245 158 11)', // amber-500
                                borderLeftStyle: 'solid',
                              }),
                            ...(isStickyColumn &&
                              hasErrors && {
                                borderLeftWidth: '4px',
                                borderLeftColor: 'hsl(var(--destructive))',
                                borderLeftStyle: 'solid',
                              }),
                          }}
                          className={cn(
                            'p-1.5 align-middle whitespace-nowrap',
                            isMobile && 'px-1 py-1',
                            isStickyColumn && [
                              'shadow-[4px_0_6px_rgba(0,0,0,0.1)]',
                              stickyBg,
                            ],
                            !isStickyColumn && row.getIsSelected() && 'bg-muted'
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
