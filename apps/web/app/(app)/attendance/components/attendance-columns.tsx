'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AttendanceRow, AttendanceStatus } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  IconChevronDown,
  IconCheck,
  IconX,
  IconLock,
} from '@tabler/icons-react';
import { TableColumnHeader } from '@/components/tables/table-column-header';
import { cn } from '@/lib/utils';
import {
  calculateOvertime,
  calculateDuration,
  AttendanceConfig,
} from '../config/attendance-config';
import { useAttendanceConfig } from '../hooks/use-attendance-config';
import { IncentiveDialog } from './incentive-dialog';
import {
  AssignedProjectType,
  useAssignedProjectsQuery,
} from '../../../../hooks/projects/use-assigned-projects-query';
import { type HeadOption } from '../hooks/use-project-heads-query';
import { useProjectHeadsQuery } from '../hooks/use-project-heads-query';
import type { AppAbility } from '@/lib/authz/define-ability';
import { useAuth } from '@/hooks/auth';
import {
  STATUS_CONFIG,
  PRESENT_STATUS_OPTIONS,
  NOT_PRESENT_STATUS_OPTIONS,
} from '../config/status-config';

// Re-export for backward compatibility
export { STATUS_CONFIG, PRESENT_STATUS_OPTIONS, NOT_PRESENT_STATUS_OPTIONS };

// Half day options grouped - derived from STATUS_CONFIG for consistency
export const HALF_DAY_OPTIONS: { status: AttendanceStatus; label: string }[] = [
  {
    status: 'first_half',
    label: STATUS_CONFIG.first_half.label,
  },
  {
    status: 'second_half',
    label: STATUS_CONFIG.second_half.label,
  },
];

// Overtime options - dynamically generated based on calculateAttendanceValue logic
// P = 1 shift, P1-P7 = 1 shift + 1-7 extra hours
// PP = 2 shifts, PP1-PP7 = 2 shifts + 1-7 extra hours
// PPP = 3+ shifts
export interface OvertimeOption {
  value: string; // The attendance value (P, P1, PP, etc.)
  label: string; // Display label
  shifts: number; // Number of full shifts
  extraHours: number; // Extra hours beyond full shifts
}

export function generateOvertimeOptions(): OvertimeOption[] {
  const options: OvertimeOption[] = [];

  // P1-P7 - One shift + extra hours (P is shown as "Present" in main status list)
  for (let extra = 1; extra <= 7; extra++) {
    options.push({
      value: `P${extra}`,
      label: `P${extra} (1 shift + ${extra}h)`,
      shifts: 1,
      extraHours: extra,
    });
  }

  // PP - Two full shifts
  options.push({
    value: 'PP',
    label: 'PP (2 shifts)',
    shifts: 2,
    extraHours: 0,
  });

  // PP1-PP7 - Two shifts + extra hours
  for (let extra = 1; extra <= 7; extra++) {
    options.push({
      value: `PP${extra}`,
      label: `PP${extra} (2 shifts + ${extra}h)`,
      shifts: 2,
      extraHours: extra,
    });
  }

  // PPP - Three full shifts
  options.push({
    value: 'PPP',
    label: 'PPP (3 shifts)',
    shifts: 3,
    extraHours: 0,
  });

  return options;
}

export const OVERTIME_OPTIONS = generateOvertimeOptions();

// Undertime options - hours worked less than one full shift
export interface UndertimeOption {
  value: string; // The attendance value (U1, U2, etc.)
  label: string; // Display label
  hours: number; // Hours worked
}

export function generateUndertimeOptions(): UndertimeOption[] {
  const options: UndertimeOption[] = [];

  // U1-U7 - Hours worked (less than one full shift)
  for (let hours = 1; hours <= 7; hours++) {
    options.push({
      value: `U${hours}`,
      label: `U${hours} (${hours} ${hours === 1 ? 'hour' : 'hours'})`,
      hours,
    });
  }

  return options;
}

export const UNDERTIME_OPTIONS = generateUndertimeOptions();

// Editable status dropdown
interface EditableStatusCellProps {
  status: AttendanceStatus | null;
  onChange: (status: AttendanceStatus | null) => void;
  disabled?: boolean;
  showOvertime?: boolean;
  error?: string;
}

export function StatusDropdownContent({
  currentStatus,
  onChange,
  showClear = false,
  showOvertime = false,
}: {
  currentStatus: AttendanceStatus | null;
  onChange: (status: AttendanceStatus | null) => void;
  showClear?: boolean;
  showOvertime?: boolean;
}) {
  function renderStatusItem(opt: AttendanceStatus) {
    const optConfig = STATUS_CONFIG[opt];
    return (
      <DropdownMenuItem
        key={opt}
        onClick={() => onChange(opt)}
        className='gap-2'
      >
        <span
          className={cn('size-2 rounded-full', optConfig.dotClass)}
          aria-hidden
        />
        <span className={cn('text-xs', currentStatus === opt && 'font-medium')}>
          {optConfig.label}
        </span>
      </DropdownMenuItem>
    );
  }

  return (
    <>
      {/* Present */}
      <DropdownMenuLabel className='text-[10px] text-muted-foreground font-normal'>
        Status
      </DropdownMenuLabel>
      {PRESENT_STATUS_OPTIONS.map(renderStatusItem)}
      {NOT_PRESENT_STATUS_OPTIONS.map(renderStatusItem)}

      {/* Overtime submenu */}
      {showOvertime && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className='gap-2'>
            <span className='size-2 rounded-full bg-purple-500' aria-hidden />
            <span className='text-xs'>Overtime</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='w-56 max-h-[300px] overflow-y-auto'>
            {OVERTIME_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onChange(opt.value as AttendanceStatus)}
                className='gap-2'
              >
                <span
                  className='size-2 rounded-full bg-purple-500'
                  aria-hidden
                />
                <span className='text-xs'>{opt.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}

      {/* Undertime submenu */}
      {showOvertime && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className='gap-2'>
            <span className='size-2 rounded-full bg-amber-500' aria-hidden />
            <span className='text-xs'>Undertime</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='w-48 max-h-[300px] overflow-y-auto'>
            {UNDERTIME_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onChange(opt.value as AttendanceStatus)}
                className='gap-2'
              >
                <span
                  className='size-2 rounded-full bg-amber-500'
                  aria-hidden
                />
                <span className='text-xs'>{opt.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}

      <DropdownMenuSub>
        <DropdownMenuSubTrigger className='gap-2'>
          <span className='size-2 rounded-full bg-blue-500' aria-hidden />
          <span
            className={cn(
              'text-xs',
              (currentStatus === 'first_half' ||
                currentStatus === 'second_half') &&
                'font-medium'
            )}
          >
            Half Day
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className='w-48'>
          {HALF_DAY_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.status}
              onClick={() => onChange(opt.status)}
              className='gap-2'
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  STATUS_CONFIG[opt.status].dotClass
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'text-xs',
                  currentStatus === opt.status && 'font-medium'
                )}
              >
                {opt.label}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* Clear option */}
      {showClear && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onChange(null)}
            className='gap-2 text-muted-foreground'
          >
            <IconX className='size-3' />
            <span className='text-xs'>Clear status</span>
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

function EditableStatusCell({
  status,
  onChange,
  disabled,
  showOvertime = true,
  error,
}: EditableStatusCellProps) {
  // If disabled, just show a static badge
  if (disabled) {
    if (status === null)
      return <span className='text-[10px] text-muted-foreground'>—</span>;
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.A;
    const displayLabel = config.shortLabel || config.label;
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-muted/30 px-2 py-0.5 border border-muted opacity-80'
        )}
      >
        <span className={cn('size-1.5 rounded-full', config.dotClass)} />
        <span className={cn('text-[10px] font-medium', config.textClass)}>
          {displayLabel}
        </span>
      </div>
    );
  }

  // Handle null status (not set yet)
  if (status === null) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            title={error}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5',
              'hover:bg-muted transition-colors cursor-pointer outline-none',
              'focus:ring-1 focus:ring-ring border border-dashed border-muted-foreground/30',
              error && 'border-destructive border-solid bg-destructive/10'
            )}
          >
            <span
              className={cn(
                'text-xs text-muted-foreground',
                error && 'text-destructive'
              )}
            >
              Set status
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-48'>
          <StatusDropdownContent
            currentStatus={status}
            onChange={onChange}
            showOvertime={showOvertime}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.A;
  const displayLabel = config.shortLabel || config.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-2 py-0.5',
            'hover:bg-secondary/80 transition-colors cursor-pointer outline-none',
            'focus:ring-1 focus:ring-ring'
          )}
        >
          <span
            className={cn('size-1.5 rounded-full', config.dotClass)}
            aria-hidden
          />
          <span className={cn('text-xs font-medium', config.textClass)}>
            {displayLabel}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-48'>
        <StatusDropdownContent
          currentStatus={status}
          onChange={onChange}
          showOvertime={showOvertime}
          showClear={process.env.NODE_ENV === 'development'}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Editable head cell component
interface EditableHeadCellProps {
  allHeads: HeadOption[];
  headName: string | null;
  headId: string;
  projectId: string;
  onChange: (headName: string | null, headId: string) => void;
  disabled?: boolean;
  error?: string;
}

function EditableHeadCell({
  allHeads,
  headName,
  projectId,
  onChange,
  disabled,
  error,
}: EditableHeadCellProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const { heads: projectHeads } = useProjectHeadsQuery(projectId);

  // Find selected option from both lists
  const selectedProjectHead = projectHeads.find(
    (option: HeadOption) => option.head === headName
  );
  const selectedAllHead = allHeads.find(
    (option: HeadOption) => option.head === headName
  );
  const selectedOption = selectedProjectHead || selectedAllHead;

  // Filter out project heads from all heads to avoid duplicates
  const projectHeadIds = new Set(
    projectHeads.map((head) => head.head).filter(Boolean)
  );
  const globalHeads = allHeads.filter(
    (head) => !head.head || !projectHeadIds.has(head.head)
  );

  function handleSelectHead(selectedHead: string | null) {
    onChange(selectedHead, selectedHead || ''); // Using head string as ID for now
    setIsOpen(false);
  }

  if (disabled) {
    return (
      <span className='h-6 px-1 text-xs text-muted-foreground truncate w-full min-w-[80px]'>
        {selectedOption ? selectedOption.label : '—'}
      </span>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          title={error}
          className={cn(
            'h-6 px-1 text-xs tabular-nums justify-start w-full min-w-[80px] truncate',
            'hover:bg-muted/50',
            !selectedOption && 'text-muted-foreground font-normal',
            error &&
              'border border-destructive bg-destructive/10 text-destructive'
          )}
        >
          {selectedOption ? selectedOption.label : 'Activity'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64 p-0'>
        <Command>
          <CommandInput placeholder='Search activities...' />
          <CommandList className='max-h-60'>
            <CommandEmpty>No activities found.</CommandEmpty>
            {projectId && projectHeads.length > 0 && (
              <CommandGroup heading='Project Activities'>
                {projectHeads.map((option: HeadOption) => (
                  <CommandItem
                    key={option.head || 'null'}
                    value={option.label}
                    onSelect={() => handleSelectHead(option.head)}
                  >
                    <span className='text-xs'>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {globalHeads.length > 0 && (
              <CommandGroup heading='All Activities'>
                {globalHeads.map((option: HeadOption) => (
                  <CommandItem
                    key={option.head || 'null'}
                    value={option.label}
                    onSelect={() => handleSelectHead(option.head)}
                  >
                    <span className='text-xs'>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
// Editable project cell component
interface EditableProjectCellProps {
  projectName: string | null;
  projectId: string | null;
  onChange: (
    projectId: string | null,
    projectName: string | null,
    shouldCreate?: boolean
  ) => void;
  disabled?: boolean;
  empId: string;
  existingProjectIds: Set<string>;
}

function EditableProjectCell({
  projectName,
  projectId: currentProjectId,
  onChange,
  disabled,
  empId,
  existingProjectIds,
}: EditableProjectCellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<string>('change');
  const { user: currentUser } = useAuth();
  const userHashId = currentUser?.hashId ?? null;

  const { projects } = useAssignedProjectsQuery(
    userHashId,
    AssignedProjectType.ForAttendance
  );

  // Transform projects to match expected format
  const availableProjects = React.useMemo(() => {
    return projects.map((project) => ({
      id: project.hashId,
      name: project.name,
    }));
  }, [projects]);

  // Check if attendance already exists for a project - O(1) lookup using Set
  function attendanceExistsForProject(projectId: string): boolean {
    return existingProjectIds.has(projectId);
  }

  function handleProjectSelect(
    projectId: string | null,
    projectName: string | null
  ) {
    const shouldCreate = mode === 'create';
    onChange(projectId, projectName, shouldCreate);
    setIsOpen(false);
    setMode('change'); // Reset after selection
  }

  if (disabled) {
    return (
      <span className='h-6 px-1 text-xs text-muted-foreground truncate w-full min-w-[70px] inline-block'>
        {projectName || '—'}
      </span>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-6 px-1 text-xs justify-start w-full min-w-[80px] truncate',
            'hover:bg-muted/50',
            !projectName && 'text-muted-foreground font-normal'
          )}
        >
          {projectName || 'Project'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64 p-0'>
        <div className='px-3 py-3 border-b'>
          <RadioGroup value={mode} onValueChange={setMode}>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='change' id='change-project' />
              <Label htmlFor='change-project' className='cursor-pointer'>
                Change Project
              </Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='create' id='should-create' />
              <Label htmlFor='should-create' className='cursor-pointer'>
                Create New Attendance
              </Label>
            </div>
          </RadioGroup>
        </div>
        <Command>
          <CommandInput
            autoFocus
            className='h-10'
            placeholder='Search projects...'
          />
          <CommandList className='max-h-60'>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              {availableProjects.map((project) => {
                const isDisabled =
                  mode === 'create' && attendanceExistsForProject(project.id);
                const isSelected = currentProjectId === project.id;
                return (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => {
                      if (!isDisabled) {
                        handleProjectSelect(project.id, project.name);
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <div className='flex items-center gap-2 w-full'>
                      {isSelected ? (
                        <IconCheck className='size-4 text-primary shrink-0' />
                      ) : (
                        <span className='size-4 shrink-0' />
                      )}
                      <span className='text-xs flex-1'>{project.name}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
// Editable text cell component
// Editable text cell component
interface EditableTextCellProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function EditableTextCell({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: EditableTextCellProps & { disabled?: boolean }) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Debounce the save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 500);
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled) {
    return (
      <span
        className={cn(
          'h-6 px-1 text-xs text-muted-foreground truncate w-full min-w-[50px]',
          className
        )}
      >
        {value || '—'}
      </span>
    );
  }

  return (
    <Input
      variant='sm'
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn('h-7 w-full min-w-[80px] text-xs', className)}
    />
  );
}

// Editable number cell component
// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate time options for autocomplete (every 15 minutes) - simple HH:MM format
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h <= 24; h++) {
    for (let m = 0; m < 60; m += 60) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Extract time in HH:MM format and day offset from time string
// Returns { time: "HH:MM", dayOffset: number } where dayOffset > 0 means next day(s)
interface ExtractedTime {
  time: string;
  dayOffset: number;
}

function extractTimeWithOffset(
  time: string | null,
  baseDate?: string
): ExtractedTime {
  if (!time) return { time: '', dayOffset: 0 };

  // If it's already in HH:MM format (no date, no AM/PM), return as is
  if (/^\d{1,2}:\d{2}$/.test(time.trim())) {
    return { time: time.trim(), dayOffset: 0 };
  }

  // If it's in ISO datetime format (e.g., "2025-12-25T09:30:00.000Z" or "2025-12-25T09:30:00")
  if (time.includes('T')) {
    const [datePart, timePart] = time.split('T');
    if (timePart) {
      // Extract HH:MM from the time part (before seconds or timezone)
      const match = timePart.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[2];
        const timeStr = `${hours}:${minutes}`;

        // Calculate day offset if baseDate is provided
        let dayOffset = 0;
        if (baseDate) {
          const baseDatePart = baseDate.includes('T')
            ? baseDate.split('T')[0]
            : baseDate;
          const timeDate = new Date(datePart);
          const base = new Date(baseDatePart);
          // Calculate difference in days
          const diffTime = timeDate.getTime() - base.getTime();
          dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));
        }

        return { time: timeStr, dayOffset };
      }
    }
  }

  // Strip AM/PM if present (e.g., "10:02 AM" -> "10:02")
  return { time: time.replace(/\s*(AM|PM)\s*$/i, '').trim(), dayOffset: 0 };
}

// Simple extraction for backward compatibility
function extractTime(time: string | null): string {
  return extractTimeWithOffset(time).time;
}

// Editable time cell with autocomplete
interface EditableTimeCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  mode: 'in' | 'out';
  disabled?: boolean;
  baseDate?: string; // Base date for calculating day offset
  inTime?: string | null; // In time to filter out times before it
}

function EditableTimeCell({
  value,
  onChange,
  placeholder,
  mode,
  disabled,
  baseDate,
  inTime,
}: EditableTimeCellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { time: displayValue, dayOffset } = extractTimeWithOffset(
    value,
    baseDate
  );
  const { config } = useAttendanceConfig();

  // Show next day section expanded if current value is from next day, otherwise collapsed
  const [showNextDay, setShowNextDay] = React.useState(dayOffset > 0);

  // Update showNextDay when popover opens or when dayOffset changes
  React.useEffect(() => {
    if (isOpen) {
      setShowNextDay(dayOffset > 0);
    }
  }, [isOpen, dayOffset]);

  // Extract inTime for comparison (remove day offset if present)
  const inTimeValue = inTime
    ? extractTimeWithOffset(inTime, baseDate).time
    : null;

  function parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function getOptionTextClass(time: string): string {
    if (!config) return 'text-foreground';

    const t = parseTimeToMinutes(time);

    if (mode === 'in') {
      const ideal = parseTimeToMinutes(config.global.idealInTime);
      const threshold = ideal + config.global.gracePeriodMinutes;

      // Before ideal in time → neutral
      if (t < ideal) return 'text-foreground';
      // Ideal in to (ideal in + grace) → green
      if (t <= threshold) return 'text-emerald-600';
      // After grace period → orange (late)
      return 'text-orange-600';
    }

    // Out mode
    const idealOut = parseTimeToMinutes(config.global.idealOutTime);

    // Before ideal out time → orange (early out)
    if (t < idealOut) return 'text-orange-600';
    // At ideal out time → green
    if (t === idealOut) return 'text-emerald-600';
    // After ideal out time → neutral
    return 'text-foreground';
  }

  // Format time as next day ISO datetime
  function formatNextDayTime(time: string): string {
    if (!baseDate) return time;
    const datePart = baseDate.includes('T') ? baseDate.split('T')[0] : baseDate;
    const base = new Date(datePart);
    base.setDate(base.getDate() + 1);
    const nextDateStr = base.toISOString().split('T')[0];
    return `${nextDateStr}T${time}:00`;
  }

  function handleSelectTime(selectedTime: string) {
    onChange(selectedTime);
    setIsOpen(false);
  }

  function handleSelectNextDayTime(selectedTime: string) {
    const nextDayTime = formatNextDayTime(selectedTime);
    onChange(nextDayTime);
    setIsOpen(false);
  }

  function handleClearTime() {
    onChange(null);
    setIsOpen(false);
  }

  function renderTimeOption(time: string) {
    const isSelected = displayValue === time;
    return (
      <CommandItem
        key={time}
        value={time}
        onSelect={handleSelectTime}
        data-time-option={time}
      >
        <span className={cn('tabular-nums text-xs', getOptionTextClass(time))}>
          {time}
        </span>
        <IconCheck
          className={cn(
            'ml-auto size-3.5',
            isSelected ? 'opacity-100' : 'opacity-0'
          )}
        />
      </CommandItem>
    );
  }

  function renderNextDayTimeOption(time: string) {
    // Check if this next day time is currently selected
    const nextDayTime = formatNextDayTime(time);
    const isSelected = value === nextDayTime;
    return (
      <CommandItem
        key={`next-${time}`}
        value={`next-${time}`}
        onSelect={() => handleSelectNextDayTime(time)}
        data-time-option={time}
      >
        <span className={cn('tabular-nums text-xs', getOptionTextClass(time))}>
          {time} <span className='text-muted-foreground text-[10px]'>(+1)</span>
        </span>
        <IconCheck
          className={cn(
            'ml-auto size-3.5',
            isSelected ? 'opacity-100' : 'opacity-0'
          )}
        />
      </CommandItem>
    );
  }

  // Filter times based on inTime (don't show times before inTime)
  const filteredTimeOptions = React.useMemo(() => {
    if (!inTimeValue || mode === 'in') {
      return TIME_OPTIONS;
    }
    const inTimeMinutes = parseTimeToMinutes(inTimeValue);
    return TIME_OPTIONS.filter((time) => {
      const timeMinutes = parseTimeToMinutes(time);
      return timeMinutes >= inTimeMinutes;
    });
  }, [inTimeValue, mode]);

  // Next day should show all times since it's after the inTime day
  const nextDayTimeOptions = React.useMemo(() => {
    return TIME_OPTIONS;
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-6 px-1 text-xs tabular-nums justify-start',
            dayOffset > 0 ? 'w-[88px]' : 'w-[72px]',
            'hover:bg-muted/50',
            !displayValue && 'text-muted-foreground font-normal'
          )}
        >
          {displayValue ? (
            <span className='flex items-center gap-0.5'>
              {displayValue}
              {dayOffset > 0 && (
                <sup className='text-[9px] text-muted-foreground font-medium'>
                  +{dayOffset}
                </sup>
              )}
            </span>
          ) : (
            placeholder || '—'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-44 p-0'>
        <Command>
          <CommandInput placeholder='Search time...' />
          <CommandList className='max-h-60'>
            <CommandEmpty>No time found.</CommandEmpty>
            {value && (
              <CommandGroup heading='Actions'>
                <CommandItem value='__clear__' onSelect={handleClearTime}>
                  <span className='text-xs text-muted-foreground'>Clear</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading='Time'>
              {filteredTimeOptions.map(renderTimeOption)}
            </CommandGroup>
            {mode === 'out' && baseDate && (
              <>
                {!showNextDay ? (
                  <CommandGroup>
                    <CommandItem
                      value='__show-next-day__'
                      onSelect={() => setShowNextDay(true)}
                    >
                      <IconChevronDown className='size-3.5 mr-2' />
                      <span className='text-xs text-muted-foreground'>
                        Show Next Day
                      </span>
                    </CommandItem>
                  </CommandGroup>
                ) : (
                  <CommandGroup heading='Next Day'>
                    <CommandItem
                      value='__hide-next-day__'
                      onSelect={() => setShowNextDay(false)}
                    >
                      <IconChevronDown className='size-3.5 mr-2 rotate-180' />
                      <span className='text-xs text-muted-foreground'>
                        Hide Next Day
                      </span>
                    </CommandItem>
                    {nextDayTimeOptions.map(renderNextDayTimeOption)}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Incentive button cell with dialog
interface IncentiveButtonCellProps {
  row: AttendanceRow;
  onUpdate: (value: number | null) => void;
}

function IncentiveButtonCell({ row, onUpdate }: IncentiveButtonCellProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const disabled = row.isLocked;

  // Check if incentive is null, undefined, or NaN
  const hasIncentive =
    row.incentive !== null &&
    row.incentive !== undefined &&
    !isNaN(row.incentive);

  return (
    <>
      <Button
        type='button'
        variant={hasIncentive ? 'ghost' : 'dashed'}
        size='sm'
        className={cn(
          'h-7 px-1 md:px-2 text-[10px] md:text-xs',
          hasIncentive
            ? row.incentive! < 0
              ? 'text-red-600 font-medium'
              : 'text-foreground font-medium'
            : 'text-muted-foreground border-dashed'
        )}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
      >
        {hasIncentive
          ? row.incentive! >= 0
            ? `₹${row.incentive}`
            : `-₹${Math.abs(row.incentive!)}`
          : 'Incentive'}
      </Button>
      <IncentiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        clockIn={row.inTime}
        clockOut={row.outTime}
        currentIncentive={hasIncentive ? row.incentive : null}
        onSave={onUpdate}
      />
    </>
  );
}

export type AttendanceRowActions = {
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
  ) => void;
  onUpdateProject: (
    row: AttendanceRow,
    projectId: string | null,
    projectName: string | null,
    shouldCreate?: boolean
  ) => void;
  onBulkUpdateChecked: (checked: boolean) => void;
  onBulkUpdateVerified: (verified: boolean) => void;
  onBulkUpdateStatus: (
    rowIds: string[],
    status: AttendanceStatus | null
  ) => void;
  onBulkUpdateIncentive: (rowIds: string[], incentive: number | null) => void;
};

export function getAttendanceColumns(
  actions: AttendanceRowActions,
  config: AttendanceConfig | undefined,
  allHeads: HeadOption[],
  existingAttendanceByEmpId: Map<string, Set<string>>,
  ability: AppAbility
): ColumnDef<AttendanceRow>[] {
  return [
    // Selection checkbox + Employee name (merged, sticky column)
    {
      id: 'selectAndName',
      header: ({ table, column }) => (
        <div className='flex items-center gap-2 md:gap-3'>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='Select all'
          />
          <TableColumnHeader column={column} title='Employee name' />
        </div>
      ),
      cell: ({ row }) => {
        const employee = row.original;
        const isSelectable = row.getCanSelect();
        const isLocked = row.original.isLocked;

        function handleCellClick() {
          if (isSelectable) {
            row.toggleSelected();
          }
        }

        return (
          <div
            className={cn(
              'flex items-center gap-2 md:gap-3',
              isSelectable && 'cursor-pointer  -mx-2 px-2 py-1 rounded'
            )}
            onClick={handleCellClick}
          >
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label='Select row'
              disabled={!isSelectable}
              className='shrink-0'
              onClick={(e) => e.stopPropagation()}
            />
            <Avatar className='size-6 md:size-8 shrink-0'>
              <AvatarImage
                src={employee.employeeAvatar}
                alt={employee.empName}
              />
              <AvatarFallback className='text-[10px] md:text-xs'>
                {getInitials(employee.empName)}
              </AvatarFallback>
            </Avatar>
            <div className='flex items-center gap-1.5 min-w-0'>
              <div className='flex flex-col min-w-0'>
                <span className='text-xs md:text-sm font-medium text-foreground truncate'>
                  {employee.empName}
                </span>
                <span className='text-[10px] md:text-xs text-muted-foreground truncate'>
                  {employee.empCode}
                </span>
              </div>
              {isLocked && (
                <IconLock className='size-3.5 text-muted-foreground shrink-0' />
              )}
            </div>
          </div>
        );
      },
      size: 200,
      enableSorting: false,
      enableHiding: false,
    },
    // Status (editable - moved right after employee name)
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => (
        <EditableStatusCell
          status={row.original.status}
          onChange={(status) =>
            actions.onUpdateField(row.original, 'status', status)
          }
          disabled={row.original.isLocked}
          showOvertime
          error={row.original.statusError}
        />
      ),
      size: 80,
    },
    // Head (editable)
    {
      accessorKey: 'headName',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Activity' />
      ),
      cell: ({ row }) => (
        <EditableHeadCell
          allHeads={allHeads}
          headName={row.original.head ?? null}
          headId={row.original.projectHeadId ?? ''}
          projectId={row.original.projectId}
          onChange={(headName) => {
            actions.onUpdateField(row.original, 'head', headName);
          }}
          disabled={row.original.isLocked}
          error={row.original.headError}
        />
      ),
      size: 80,
    },
    // Clock In
    {
      accessorKey: 'clockIn',
      header: ({ column }) => <TableColumnHeader column={column} title='In' />,
      cell: ({ row }) => {
        const isDisabled =
          row.original.status === 'A' || row.original.status === null;
        return (
          <EditableTimeCell
            value={row.original.inTime}
            onChange={(value) =>
              actions.onUpdateField(row.original, 'inTime', value)
            }
            placeholder='In'
            mode='in'
            disabled={isDisabled || row.original.isLocked}
          />
        );
      },
      size: 80,
    },
    // Clock Out
    {
      accessorKey: 'clockOut',
      header: ({ column }) => <TableColumnHeader column={column} title='Out' />,
      cell: ({ row }) => {
        const isDisabled =
          row.original.status === 'A' || row.original.status === null;
        return (
          <EditableTimeCell
            value={row.original.outTime}
            onChange={(value) =>
              actions.onUpdateField(row.original, 'outTime', value)
            }
            placeholder='Out'
            mode='out'
            disabled={isDisabled || row.original.isLocked}
            baseDate={row.original.dates}
            inTime={row.original.inTime}
          />
        );
      },
      size: 80,
    },
    // Duration
    {
      accessorKey: 'duration',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Duration' />
      ),
      cell: ({ row }) => {
        const isDisabled =
          row.original.status === 'A' || row.original.status === null;
        const overtime = config?.global
          ? calculateOvertime(
              row.original.inTime,
              row.original.outTime,
              config.global,
              row.original.dates
            )
          : null;
        const duration = calculateDuration(
          row.original.inTime,
          row.original.outTime,
          row.original.dates
        );
        const hasInTime = !!row.original.inTime;
        const hasOutTime = !!row.original.outTime;

        if (isDisabled) {
          return (
            <span className='text-[10px] md:text-xs text-muted-foreground tabular-nums'>
              —
            </span>
          );
        }

        if (!hasInTime || !hasOutTime) {
          return (
            <span className='text-[10px] md:text-xs text-muted-foreground tabular-nums'>
              —
            </span>
          );
        }

        if (!duration) {
          return (
            <span className='text-[10px] md:text-xs text-muted-foreground tabular-nums'>
              —
            </span>
          );
        }

        return (
          <div className='flex flex-col items-start gap-0.5'>
            <span
              className={cn(
                'text-[10px] md:text-xs font-medium tabular-nums',
                overtime?.startsWith('-')
                  ? 'text-red-500'
                  : overtime?.startsWith('+')
                    ? 'text-emerald-600'
                    : 'text-foreground'
              )}
            >
              {duration}
            </span>
            {overtime && (
              <span
                className={cn(
                  'text-[9px] md:text-[10px] font-medium tabular-nums',
                  overtime.startsWith('-') ? 'text-red-500' : 'text-emerald-600'
                )}
              >
                (
                {overtime.startsWith('-') ? `${overtime} UT` : `${overtime} OT`}
                )
              </span>
            )}
          </div>
        );
      },
      size: 70,
    },
    // Project (editable)
    {
      accessorKey: 'projectName',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Project' />
      ),
      cell: ({ row }) => (
        <EditableProjectCell
          projectName={row.original.projectName}
          projectId={row.original.projectId}
          onChange={(projectId, projectName, shouldCreate) => {
            actions.onUpdateProject(
              row.original,
              projectId,
              projectName,
              shouldCreate
            );
          }}
          disabled={row.original.isLocked}
          empId={row.original.empId}
          existingProjectIds={
            existingAttendanceByEmpId.get(row.original.empId) ?? new Set()
          }
        />
      ),
      size: 75,
    },
    // Remark (editable)
    {
      accessorKey: 'remarks',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Remark' />
      ),
      cell: ({ row }) => (
        <EditableTextCell
          value={row.original.remarks ?? ''}
          onChange={(value) =>
            actions.onUpdateField(row.original, 'remarks', value)
          }
          placeholder='Remark'
          disabled={row.original.isLocked}
        />
      ),
      size: 55,
    },
    // Incentive (button with dialog)
    {
      accessorKey: 'incentive',
      header: ({ column }) => (
        <TableColumnHeader column={column} title='Incentive' />
      ),
      cell: ({ row }) => (
        <IncentiveButtonCell
          row={row.original}
          onUpdate={(value) =>
            actions.onUpdateField(row.original, 'incentive', value)
          }
        />
      ),
      size: 65,
    },
    // Checked (editable checkbox with bulk action dropdown)
    {
      accessorKey: 'checked',
      header: () => (
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            disabled={!ability.can('check', 'attendance')}
          >
            <button
              type='button'
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                'hover:text-foreground transition-colors cursor-pointer outline-none',
                'focus:ring-1 focus:ring-ring rounded'
              )}
            >
              <span>Checked</span>
              {ability.can('check', 'attendance') && (
                <IconChevronDown className='size-3' />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-36'>
            <DropdownMenuItem
              onClick={() => actions.onBulkUpdateChecked(true)}
              className='gap-2'
            >
              <IconCheck className='size-3.5 text-emerald-500' />
              <span className='text-xs'>Mark all checked</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => actions.onBulkUpdateChecked(false)}
              className='gap-2'
            >
              <IconX className='size-3.5 text-muted-foreground' />
              <span className='text-xs'>Uncheck all</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.isChecked}
          onCheckedChange={(value) => {
            if (value !== 'indeterminate') {
              actions.onUpdateField(row.original, 'isChecked', value);
            }
          }}
          disabled={
            !ability.can('check', 'attendance') ||
            row.original.isLocked
          }
        />
      ),
      size: 70,
      enableSorting: false,
    },
    // Verified (editable checkbox with bulk action dropdown)
    {
      accessorKey: 'verified',
      header: () => (
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            disabled={!ability.can('verify', 'attendance')}
          >
            <button
              type='button'
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                'hover:text-foreground transition-colors cursor-pointer outline-none',
                'focus:ring-1 focus:ring-ring rounded'
              )}
            >
              <span>Verified</span>
              {ability.can('verify', 'attendance') && (
                <IconChevronDown className='size-3' />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-36'>
            <DropdownMenuItem
              onClick={() => actions.onBulkUpdateVerified(true)}
              className='gap-2'
            >
              <IconCheck className='size-3.5 text-emerald-500' />
              <span className='text-xs'>Mark all verified</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => actions.onBulkUpdateVerified(false)}
              className='gap-2'
            >
              <IconX className='size-3.5 text-muted-foreground' />
              <span className='text-xs'>Unverify all</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.isVerified}
          onCheckedChange={(value) => {
            if (value !== 'indeterminate') {
              actions.onUpdateField(row.original, 'isVerified', value);
            }
          }}
          disabled={
            !ability.can('verify', 'attendance') ||
            row.original.isLocked
          }
        />
      ),
      size: 70,
      enableSorting: false,
    },
  ];
}
