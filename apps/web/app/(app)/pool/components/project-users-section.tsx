'use client';

import * as React from 'react';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import {
  IconUserMinus,
  IconLoader2,
  IconArrowRight,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
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
import { cn } from '@/lib/utils';
import { IconCheck } from '@tabler/icons-react';
import { AssignedUser } from '../types';
import {
  useProjectUsersQuery,
  AssignedUserWithProject,
} from '../hooks/use-project-users-query';
import { usePoolMutations } from '../hooks/use-pool-mutations';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useAuth } from '@/hooks/auth';
import { AssignedProject } from '@/hooks/projects/use-assigned-projects-query';
import { TableColumnHeader } from '@/components/tables/table-column-header';

interface ProjectUsersSectionProps {
  projects: AssignedProject[];
  activeProjectId: string;
  onProjectChange: (projectId: string) => void;
}

const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }];

export function ProjectUsersSection({
  projects,
  activeProjectId,
  onProjectChange,
}: ProjectUsersSectionProps) {
  const [changeProjectOpen, setChangeProjectOpen] = React.useState(false);
  const { user: currentUser, ability } = useAuth();
  const canUpdate = ability.can('update', 'resource_pool');

  const { releaseUsers, changeProject, isReleasing } = usePoolMutations();

  const { searchTerm, debouncedSearchTerm, setSearchTerm } =
    useDebouncedSearch(300);
  const { query, users: allUsers } = useProjectUsersQuery({
    projectId: activeProjectId,
    userHashId: currentUser?.hashId ?? null,
  });

  // Define columns
  const columns = React.useMemo<
    ColumnDef<AssignedUser | AssignedUserWithProject>[]
  >(() => {
    const baseColumns: ColumnDef<AssignedUser | AssignedUserWithProject>[] = [
      {
        id: 'select',
        header: ({ table }) => (
          <div className='flex items-center justify-center'>
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(checked) => {
                table.toggleAllPageRowsSelected(!!checked);
              }}
              aria-label='Select all'
              disabled={allUsers.length === 0 || query.isLoading}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div
            className='flex items-center justify-center'
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => {
                row.toggleSelected(!!checked);
              }}
              aria-label={`Select ${row.original.name}`}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 48,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <TableColumnHeader column={column} title='Name' />
        ),
        cell: ({ row }) => (
          <div className='font-medium'>{row.original.name}</div>
        ),
      },
      {
        accessorKey: 'empCode',
        header: ({ column }) => (
          <TableColumnHeader column={column} title='Employee Code' />
        ),
        cell: ({ row }) => (
          <div className='text-muted-foreground'>{row.original.empCode}</div>
        ),
      },
    ];

    // Add project column only when viewing 'all' projects
    if (activeProjectId === 'all') {
      baseColumns.push({
        accessorKey: 'projectName',
        header: 'Project',
        cell: ({ row }) => {
          const userWithProject = row.original as AssignedUserWithProject;
          return (
            <div className='text-muted-foreground'>
              {'projectName' in userWithProject
                ? userWithProject.projectName
                : '-'}
            </div>
          );
        },
      });
    }

    // Add assigned date column
    baseColumns.push({
      accessorKey: 'assignedAt',
      header: 'Assigned Date',
      cell: ({ row }) => {
        const assignedAt = row.original.assignedAt;

        if (!assignedAt) {
          return '--';
        }

        const days = Math.abs(
          Math.floor(
            (new Date().getTime() - assignedAt.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const timeAgo =
          days >= 365
            ? `${(days / 365.25).toFixed(1)} years`
            : days >= 30
              ? `${(days / 30.44).toFixed(1)} months`
              : `${days} ${days === 1 ? 'day' : 'days'}`;

        return (
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <span className='whitespace-nowrap'>
              {assignedAt
                .toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
                .replace(/\//g, '/')}
            </span>
            <span className='text-xs text-muted-foreground/70'>
              ({timeAgo})
            </span>
          </div>
        );
      },
    });

    return baseColumns;
  }, [activeProjectId, allUsers.length, query.isLoading]);

  const table = useReactTable({
    data: allUsers,
    columns,
    state: {
      globalFilter: debouncedSearchTerm, // Use debounced value for filtering
      sorting: DEFAULT_SORTING,
    },
    onGlobalFilterChange: setSearchTerm, // Update searchTerm (will be debounced by useDebouncedSearch)
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.hashId,
    enableRowSelection: true,
    manualPagination: true,
    // Custom global filter function to search across name, empCode, and projectName
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue || '')
        .toLowerCase()
        .trim();
      if (!search) return true;

      const user = row.original;
      const name = user.name.toLowerCase();
      const empCode = user.empCode.toString();
      const projectName =
        'projectName' in user && user.projectName
          ? user.projectName.toLowerCase()
          : '';

      return (
        name.includes(search) ||
        empCode.includes(search) ||
        projectName.includes(search)
      );
    },
  });

  const selectedCount = table.getSelectedRowModel().rows.length;

  // Calculate total users across all projects for "All Resources" badge
  const totalUsersAcrossAllProjects = projects.reduce(
    (sum, project) => sum + project.assignedWorkersCount,
    0
  );

  return (
    <div className='flex flex-col h-full p-6'>
      <div className='pb-3'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold leading-none tracking-tight'>
            My Projects
          </h3>
          <div className='flex items-center gap-2'>
            {selectedCount > 0 && (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    table.resetRowSelection();
                  }}
                >
                  Clear
                </Button>
              </>
            )}
            <Popover
              open={changeProjectOpen}
              onOpenChange={setChangeProjectOpen}
            >
              <PopoverTrigger asChild>
                {canUpdate && (
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={selectedCount === 0}
                    role='combobox'
                    aria-expanded={changeProjectOpen}
                  >
                    <IconArrowRight className='h-4 w-4' />
                    <span className='hidden lg:inline'>
                      Change Project
                      {selectedCount > 0 && ` (${selectedCount})`}
                    </span>
                    {selectedCount > 0 && (
                      <span className='lg:hidden'>({selectedCount})</span>
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
                      {projects
                        .filter((project) => project.hashId !== activeProjectId)
                        .map((project) => (
                          <CommandItem
                            key={project.hashId}
                            value={project.name}
                            onSelect={async () => {
                              const selectedUserIds = table
                                .getSelectedRowModel()
                                .rows.map((row) => row.id);
                              await changeProject({
                                targetProjectId: project.hashId,
                                userIds: selectedUserIds,
                              });
                              table.resetRowSelection();
                              setChangeProjectOpen(false);
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
            {canUpdate && (
              <Button
                size='sm'
                variant='primary'
                onClick={async () => {
                  const selectedUserIds = table
                    .getSelectedRowModel()
                    .rows.map((row) => row.id);
                  await releaseUsers(selectedUserIds);
                  table.resetRowSelection();
                }}
                disabled={selectedCount === 0 || isReleasing}
              >
                {isReleasing ? (
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <IconUserMinus className='h-4 w-4' />
                )}
                <span className='hidden lg:inline'>
                  Release to Pool
                  {selectedCount > 0 && ` (${selectedCount})`}
                </span>
                {selectedCount > 0 && (
                  <span className='lg:hidden'>({selectedCount})</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className='flex-1 flex flex-col gap-3 overflow-hidden'>
        {/* Project Tabs */}
        <Tabs value={activeProjectId} onValueChange={onProjectChange}>
          <ScrollableTabs activeValue={activeProjectId}>
            <TabsList className='flex h-auto p-1 bg-muted w-fit'>
              {/* All Resources Tab */}
              <TabsTrigger
                value='all'
                className='px-3 py-1.5 text-xs data-[state=active]:bg-background'
              >
                All Resources
                <Badge
                  variant='secondary'
                  className={`ml-1.5 h-4 px-1.5 text-[10px] font-medium ${
                    activeProjectId === 'all'
                      ? 'bg-secondary/80'
                      : 'bg-white/50 dark:bg-white/10'
                  }`}
                >
                  {totalUsersAcrossAllProjects}
                </Badge>
              </TabsTrigger>
              {projects.map((project) => (
                <TabsTrigger
                  key={project.hashId}
                  value={project.hashId}
                  className='px-3 py-1.5 text-xs data-[state=active]:bg-background'
                >
                  {project.name}
                  <Badge
                    variant='secondary'
                    className={`ml-1.5 h-4 px-1.5 text-[10px] font-medium ${
                      activeProjectId === project.hashId
                        ? 'bg-secondary/80'
                        : 'bg-white/50 dark:bg-white/10'
                    }`}
                  >
                    {project.assignedWorkersCount}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollableTabs>
        </Tabs>

        {/* Search Input */}
        <SearchInput
          placeholder='Search by name or employee code...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
        />

        {/* Assigned Users List */}
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
                        className={header.id === 'select' ? 'w-12' : ''}
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
                      colSpan={columns.length}
                      className='text-center py-8'
                    >
                      <div
                        className='flex items-center justify-center gap-2 text-muted-foreground'
                        suppressHydrationWarning
                      >
                        <IconLoader2 className='h-4 w-4 animate-spin' />
                        <span>Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : query.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className='text-center py-8 text-destructive'
                    >
                      <div className='flex items-center justify-center text-destructive'>
                        Error loading users. Please try again.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className='text-center py-8 text-muted-foreground'
                    >
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        {debouncedSearchTerm
                          ? 'No users found'
                          : activeProjectId === 'all'
                            ? 'No users assigned to any project'
                            : 'No users assigned to this project'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className='cursor-pointer'
                        data-state={row.getIsSelected() && 'selected'}
                        onClick={() => row.toggleSelected()}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            onClick={(e) => {
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
                    ))}
                    {/* Show loading indicator at bottom when fetching more pages */}
                    {query.isFetchingNextPage && (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className='text-center py-4'
                        >
                          <div
                            suppressHydrationWarning
                            className='flex items-center justify-center gap-2 text-muted-foreground'
                          >
                            <IconLoader2 className='h-4 w-4 animate-spin' />
                            <span className='text-sm'>
                              Loading more users...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
