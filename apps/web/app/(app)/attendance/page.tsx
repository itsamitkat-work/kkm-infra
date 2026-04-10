'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { format, startOfToday } from 'date-fns';
import { useQueryState, parseAsString, parseAsIsoDate } from 'nuqs';
import { SearchInput } from '@/components/ui/search-input';
import { KpiCard } from './components/attendance-kpi';
import { useAuth } from '@/hooks/auth';
import { useAttendanceConfig } from './hooks/use-attendance-config';
import { useAttendanceData } from './data/attendance-collection';
import { calculateAttendanceSummary } from './utils/calculate-summary';
import { Button } from '@/components/ui/button';
import { IconUserPlus } from '@tabler/icons-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AttendanceTable = dynamic(
  () =>
    import('./components/attendance-table').then((mod) => mod.AttendanceTable),
  { ssr: false }
);

const AttendanceConfigDialog = dynamic(
  () =>
    import('./components/attendance-config-dialog').then(
      (mod) => mod.AttendanceConfigDialog
    ),
  { ssr: false }
);

const DateSelector = dynamic(
  () => import('./components/date-selector').then((mod) => mod.DateSelector),
  { ssr: false }
);

function AttendancePageContent() {
  const { user } = useAuth();
  const { config } = useAttendanceConfig();

  // Use nuqs for userId from query params, fallback to user's hashId
  const [makerIdFromQuery] = useQueryState(
    'userId',
    parseAsString.withDefault('')
  );

  const [makerNameFromQuery] = useQueryState(
    'userName',
    parseAsString.withDefault('')
  );

  const userId = makerIdFromQuery || user?.hashId;
  // Use userName from query params if available, otherwise fall back to current user's userName
  const userName =
    makerNameFromQuery ||
    (userId === user?.hashId ? user?.userName : undefined);
  // Use nuqs for search state
  const [search, setSearch] = useQueryState(
    'search',
    parseAsString.withDefault('')
  );

  // Use nuqs for date state
  const [date, setDate] = useQueryState(
    'date',
    parseAsIsoDate.withDefault(startOfToday())
  );

  const selectedDateString = format(date, 'yyyy-MM-dd');
  const workingHoursPerDay = config?.global.workingHoursPerDay ?? 8;

  // Fetch attendance data
  const attendanceData = useAttendanceData(selectedDateString, userId);

  // Track dirty rows count
  const dirtyCount = attendanceData.dirtyRows.length;

  // Confirmation dialog state
  const [showLeaveConfirmation, setShowLeaveConfirmation] =
    React.useState(false);
  const [pendingDateChange, setPendingDateChange] = React.useState<Date | null>(
    null
  );

  // Assign from pool dialog state
  const [isAssignFromPoolDialogOpen, setIsAssignFromPoolDialogOpen] =
    React.useState(false);

  // Calculate summary from workers data
  const summary = React.useMemo(
    () => calculateAttendanceSummary(attendanceData.workers),
    [attendanceData.workers]
  );

  // Handle browser navigation (back/forward, page close, etc.)
  React.useEffect(() => {
    if (dirtyCount === 0) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dirtyCount]);

  function handleDateChange(newDate: Date) {
    // Check if there are unsaved changes
    if (dirtyCount > 0) {
      setPendingDateChange(newDate);
      setShowLeaveConfirmation(true);
    } else {
      setDate(newDate);
    }
  }

  function handleConfirmLeave() {
    if (pendingDateChange) {
      setDate(pendingDateChange);
      setPendingDateChange(null);
    }
    setShowLeaveConfirmation(false);
  }

  function handleCancelLeave() {
    setPendingDateChange(null);
    setShowLeaveConfirmation(false);
  }

  if (!userId) {
    return (
      <div className='flex items-center justify-center h-full p-4 lg:p-6'>
        <p className='text-muted-foreground'>No maker ID available.</p>
      </div>
    );
  }

  return (
    <>
      <AlertDialog
        open={showLeaveConfirmation}
        onOpenChange={setShowLeaveConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have {dirtyCount} unsaved change{dirtyCount > 1 ? 's' : ''}.
              Are you sure you want to leave? All unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLeave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='flex flex-col gap-4 p-4 lg:p-6'>
        <div className='flex flex-row flex-wrap items-center gap-2 sm:flex-nowrap'>
          <KpiCard
            title='Total Records'
            value={summary.total}
            variant='default'
            className='flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0'
          />
          <KpiCard
            title='Present'
            value={summary.present}
            variant='emerald'
            className='flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0'
          />
          <KpiCard
            title='Absent'
            value={summary.absent}
            variant='red'
            className='flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0'
          />
          <KpiCard
            title='Overtime'
            value={summary.overtime}
            variant='purple'
            className='flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0'
          />
          <KpiCard
            title='Undertime'
            value={summary.undertime}
            variant='amber'
            className='flex-1 min-w-[calc(50%-0.25rem)] sm:min-w-0'
          />
        </div>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
            <DateSelector date={date} onDateChange={handleDateChange} />
            <div className='w-full sm:w-auto'>
              <SearchInput
                placeholder='Search by name or code'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                className='w-full'
              />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 gap-1.5 px-2.5 font-medium transition-all hover:bg-muted/80'
              onClick={() => setIsAssignFromPoolDialogOpen(true)}
            >
              <IconUserPlus className='size-3.5' />
              Pool
            </Button>
            <AttendanceConfigDialog />
          </div>
        </div>

        {userId && (
          <AttendanceTable
            search={search}
            attendanceData={attendanceData}
            userId={userId}
            workingHoursPerDay={workingHoursPerDay}
            date={selectedDateString}
            userName={userName}
            key={selectedDateString}
            isAssignFromPoolDialogOpen={isAssignFromPoolDialogOpen}
            onAssignFromPoolDialogChange={setIsAssignFromPoolDialogOpen}
            onAssignFromPoolComplete={() => {
              attendanceData.refetch();
            }}
          />
        )}
      </div>
    </>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className='flex flex-col gap-4 p-4 lg:p-6'>Loading...</div>
      }
    >
      <AttendancePageContent />
    </Suspense>
  );
}
