'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { IconCheck } from '@tabler/icons-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { IconUserPlus, IconLoader2 } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { usePoolUsersQuery } from '../hooks/use-pool-users-query';
import { usePoolMutations } from '../hooks/use-pool-mutations';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { PoolUser } from '../types';
import { AssignedProject } from '@/hooks/projects/use-assigned-projects-query';
import { useAuth } from '@/hooks/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfToday, subDays, isToday, isYesterday } from 'date-fns';

// Table column definitions
const columns: ColumnDef<PoolUser>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className='flex items-center justify-center'>
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className='flex items-center justify-center'>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
        />
      </div>
    ),
    size: 48,
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ getValue }) => (
      <div className='font-medium'>{getValue<string>()}</div>
    ),
  },
  {
    accessorKey: 'empCode',
    header: 'Employee Code',
    cell: ({ getValue }) => (
      <div className='text-muted-foreground'>{getValue<number>()}</div>
    ),
  },
];

interface PoolUserListProps {
  projects: AssignedProject[];
  onAssignToProject: (projectId: string) => void;
  insideDialog?: boolean;
}

const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }];
export function PoolUserList({
  projects,
  onAssignToProject,
  insideDialog = false,
}: PoolUserListProps) {
  const [open, setOpen] = React.useState(false);
  const [assignDateDialogOpen, setAssignDateDialogOpen] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<
    string | null
  >(null);
  const [assignDate, setAssignDate] = React.useState<Date>(startOfToday());
  const { searchTerm, setSearchTerm } = useDebouncedSearch(300);
  const { query, users } = usePoolUsersQuery();
  const { assignUsers, isAssigning } = usePoolMutations();
  const { ability } = useAuth();
  const canUpdate = ability.can('update', 'ResourcePool');

  const table = useReactTable({
    data: users,
    columns,
    getRowId: (row) => row.hashId,
    state: {
      globalFilter: searchTerm,
      sorting: DEFAULT_SORTING,
    },
    onGlobalFilterChange: setSearchTerm,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = String(filterValue || '')
        .toLowerCase()
        .trim();
      if (!search) return true;

      const user = row.original;
      const name = user.name.toLowerCase();
      const empCode = user.empCode.toString();

      return name.includes(search) || empCode.includes(search);
    },
  });

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setAssignDateDialogOpen(true);
    setOpen(false);
  };

  const handleAssign = async () => {
    if (!selectedProjectId) return;

    const selectedUserIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.id);

    if (selectedUserIds.length === 0) return;

    // Format date as YYYY-MM-DD (the function will add time at start of day)
    const dateString = format(assignDate, 'yyyy-MM-dd');
    onAssignToProject(selectedProjectId);
    await assignUsers({
      projectId: selectedProjectId,
      userIds: selectedUserIds,
      assignDate: dateString,
    });
    table.resetRowSelection();
    setAssignDateDialogOpen(false);
    setSelectedProjectId(null);
    setAssignDate(startOfToday());
  };

  // Render the Assign button component
  const AssignButton = () => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {canUpdate && (
          <Button
            size='sm'
            disabled={table.getSelectedRowModel().rows.length === 0}
            role='combobox'
            aria-expanded={open}
          >
            {isAssigning ? (
              <IconLoader2 className='h-4 w-4 animate-spin' />
            ) : (
              <IconUserPlus className='h-4 w-4' />
            )}
            <span className='hidden lg:inline'>
              Assign to Project
              {table.getSelectedRowModel().rows.length > 0 &&
                ` (${table.getSelectedRowModel().rows.length})`}
            </span>
            {table.getSelectedRowModel().rows.length > 0 && (
              <span className='lg:hidden'>
                ({table.getSelectedRowModel().rows.length})
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[200px] p-0'>
        <Command>
          <CommandInput placeholder='Search project...' />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.hashId}
                  value={project.name}
                  onSelect={() => {
                    handleProjectSelect(project.hashId);
                  }}
                >
                  <IconCheck
                    className={cn(
                      'mr-2 h-4 w-4',
                      'opacity-0' // Always hidden since we just select to assign
                    )}
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className='flex flex-col h-full p-4'>
      {!insideDialog && (
        <div className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <h3 className='text-lg font-semibold leading-none tracking-tight'>
                Resource Pool
              </h3>
              {query.isLoading ? (
                <Badge variant='secondary'>
                  <IconLoader2 className='h-3 w-3 animate-spin' />
                </Badge>
              ) : (
                <Badge variant='secondary'>{users.length}</Badge>
              )}
            </div>
            <div className='flex items-center gap-2'>
              <AssignButton />
            </div>
          </div>
        </div>
      )}
      <div className='flex-1 flex flex-col gap-3 overflow-hidden p-1'>
        {/* Search Input */}
        <div
          className={cn('flex items-center gap-2', insideDialog && 'flex-row')}
        >
          <div className={insideDialog ? 'flex-1' : 'w-full'}>
            <SearchInput
              placeholder='Search by name or employee code...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          {insideDialog && (
            <div className='shrink-0'>
              <AssignButton />
            </div>
          )}
        </div>

        {/* User List */}
        <div className='flex-1 border rounded-lg overflow-hidden'>
          <div className='overflow-auto h-full'>
            <Table>
              <TableHeader className='sticky top-0 bg-muted z-10'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className='hover:bg-transparent'
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cn(
                          header.column.getCanSort() &&
                            'cursor-pointer select-none',
                          'whitespace-nowrap'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className='text-center py-8'
                    >
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <IconLoader2 className='h-4 w-4 animate-spin' />
                        <span>Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : query.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className='text-center py-8 text-destructive'
                    >
                      Error loading users. Please try again.
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className='text-center py-8 text-muted-foreground'
                    >
                      {searchTerm ? 'No users found' : 'No users in pool'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className='cursor-pointer'
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                      onClick={() => row.toggleSelected()}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          onClick={(e) => {
                            // Prevent row selection when clicking on select checkbox
                            if (cell.column.id === 'select') {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Assign Date Dialog */}
      <Dialog
        open={assignDateDialogOpen}
        onOpenChange={setAssignDateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Assignment Date</DialogTitle>
            <DialogDescription>
              Choose the date when the selected workers should be assigned to
              the project.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col items-center gap-4 py-4'>
            <Calendar
              mode='single'
              selected={assignDate}
              onSelect={(date) => date && setAssignDate(date)}
              defaultMonth={assignDate}
              className='rounded-md border'
            />
            <div className='text-sm text-muted-foreground'>
              Selected date:{' '}
              <span className='font-medium text-foreground'>
                {format(assignDate, 'EEEE, d MMMM yyyy')}
              </span>
            </div>
          </div>
          <DialogFooter>
            {/* Quick date selection buttons */}
            <div className='flex items-center gap-2 w-full justify-start'>
              <Button
                variant={isToday(assignDate) ? 'primary' : 'outline'}
                size='sm'
                className='h-8 px-3 text-xs'
                onClick={() => setAssignDate(startOfToday())}
              >
                Today
              </Button>
              <Button
                variant={isYesterday(assignDate) ? 'primary' : 'outline'}
                size='sm'
                className='h-8 px-3 text-xs'
                onClick={() => setAssignDate(subDays(startOfToday(), 1))}
              >
                Yesterday
              </Button>
            </div>
            <Button
              variant='outline'
              onClick={() => {
                setAssignDateDialogOpen(false);
                setSelectedProjectId(null);
                setAssignDate(startOfToday());
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning ? (
                <>
                  <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                  Assigning...
                </>
              ) : (
                'Assign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
