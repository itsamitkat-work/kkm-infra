'use client';

import * as React from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  flexRender,
  Row,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getExpandedRowModel,
  ColumnDef,
  ExpandedState,
} from '@tanstack/react-table';
import { Label } from '@/components/ui/label';
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchInput } from '../../ui/search-input';
import { DataTableControls } from './use-data-table-controls';
import { ColumnFilter } from './column-filter';
import { BulkActionBar } from './bulk-action-bar';
import { DataTableFilters } from './data-table-filters';
import { DataTableBody } from './data-table-body';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import { cn, getPlatformSpecificKbd } from '@/lib/utils';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';
import { FilterFieldsConfig } from '@/components/ui/filters';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type WithId = {
  id?: string;
  hashId?: string | null;
  hashID?: string; // Support for hashID (capital ID) used in some APIs
};

export type DataTableEmptyState = {
  itemType: string;
  onCreateNew?: () => void;
};

export type DataTableTab<T> = {
  value: string;
  label: string;
  columns: ColumnDef<T>[];
};

export function DataTable<T extends WithId>({
  query,
  controls,
  filterFields,
  columns,
  tabs,
  actions,
  searchPlaceholder = 'Filter by name...',
  bulkActions,
  emptyState,
  loadingMessage,
  errorState,
  showIndexColumn = false,
  showSearch = true,
  showFilters = true,
  filtersInlineWithSearch = false,
  showFilterAddButton = true,
  showFilterClearButton = true,
  showTotalBadge = true,
  showColumnFilter = true,
  showLoaderWhenPending = true,
  tableName,
  renderExpandedRow,
  getRowCanExpand,
  stickyContext = 'page',
}: {
  query: UseInfiniteQueryResult<
    InfiniteData<PaginationResponse<T>, unknown>,
    Error
  >;
  filterFields: FilterFieldsConfig;
  controls: DataTableControls;
  columns: ColumnDef<T>[];
  /** When provided, renders tab triggers above the table and uses each tab's columns for the active tab. */
  tabs?: DataTableTab<T>[];
  actions?: {
    end?: React.ReactNode;
    start?: React.ReactNode;
  };
  searchPlaceholder?: string;
  bulkActions?: (selectedRows: Row<T>[]) => React.ReactNode;
  emptyState: DataTableEmptyState;
  loadingMessage?: React.ReactNode;
  errorState?: React.ReactNode;
  showIndexColumn?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  /** When true, filter controls render on the same row as the search input (after it). */
  filtersInlineWithSearch?: boolean;
  showFilterAddButton?: boolean;
  showFilterClearButton?: boolean;
  showTotalBadge?: boolean;
  showColumnFilter?: boolean;
  showLoaderWhenPending?: boolean;
  tableName?: string;
  renderExpandedRow?: (row: Row<T>) => React.ReactNode;
  /** When renderExpandedRow is set, rows can expand; optionally restrict which rows (default: all). */
  getRowCanExpand?: (row: Row<T>) => boolean;
  /** When 'dialog', sticky controls use top-0 and table header uses top-14 so header sticks below controls */
  stickyContext?: 'page' | 'dialog';
}) {
  const tabValues = tabs?.map((t) => t.value) ?? [];
  const defaultTabValue = tabs?.[0]?.value ?? 'tab1';
  const [activeTab, setActiveTab] = React.useState(defaultTabValue);

  const effectiveColumns = React.useMemo(() => {
    if (tabs?.length) {
      const tab = tabs.find((t) => t.value === activeTab);
      return tab?.columns ?? tabs[0].columns;
    }
    return columns;
  }, [tabs, activeTab, columns]);

  const flattenedData = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  const totalCount = React.useMemo(
    () => query.data?.pages[0].totalCount ?? undefined,
    [query.data]
  );

  const totalColumnSize = React.useMemo(() => {
    return effectiveColumns.reduce((sum, col) => sum + (col.size || 150), 0);
  }, [effectiveColumns]);

  const searchInputRef = useSearchShortcut();
  const sentinelRef = React.useRef<HTMLTableRowElement>(null);

  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const table = useReactTable({
    data: flattenedData,
    columns: effectiveColumns,
    state: {
      ...controls.state,
      expanded,
    },
    getRowId: (row) => row.id?.toString() || row.hashId?.toString() || '',
    enableRowSelection: true,
    enableExpanding: !!renderExpandedRow,
    getRowCanExpand: getRowCanExpand ?? (() => true),
    onRowSelectionChange: controls.onRowSelectionChange,
    onSortingChange: controls.onSortingChange,
    onColumnFiltersChange: controls.onColumnFiltersChange,
    onColumnVisibilityChange: controls.onColumnVisibilityChange,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
  });

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const rows = table.getRowModel().rows;
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => rows.map((row) => row.id),
    [rows]
  );

  function handleDragEnd(/* _event: DragEndEvent */) {
    // Drag and drop is disabled for server-side pagination
    // const { active, over } = event;
    // if (active && over && active.id !== over.id) {
    //   setData((data) => {
    //     const oldIndex = dataIds.indexOf(active.id);
    //     const newIndex = dataIds.indexOf(over.id);
    //     return arrayMove(data, oldIndex, newIndex);
    //   });
    // }
  }

  // Infinite scroll handler using Intersection Observer on sentinel element
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    if (query.isLoading || query.isFetchingNextPage) return;

    if (!query.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [query]);

  const stickyControlsTop = stickyContext === 'dialog' ? 'top-0' : 'top-12';

  React.useEffect(() => {
    if (tabs?.length && !tabValues.includes(activeTab)) {
      setActiveTab(tabs[0].value);
    }
  }, [tabs, tabValues, activeTab]);

  const tabsValue = tabs?.length ? activeTab : 'tab1';

  return (
    <Tabs
      value={tabsValue}
      onValueChange={tabs?.length ? setActiveTab : undefined}
      className='w-full flex-col justify-start gap-3'
    >
      <div
        className={cn('sticky z-20 bg-background pt-2 pb-1', stickyControlsTop)}
      >
        <div className='px-3 lg:px-4'>
          {tabs && tabs.length > 0 && (
            <TabsList className='w-fit shrink-0 mb-2'>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          <Label htmlFor='view-selector' className='sr-only'>
            View
          </Label>

          <div className='flex flex-col gap-3'>
            {/* Row 1: Table name + Search (left), Column Filter + Action Buttons (right). Never wraps. */}
            <div
              className={cn(
                'flex items-center gap-3',
                !(
                  showSearch ||
                  tableName ||
                  (showFilters && filtersInlineWithSearch)
                ) && 'justify-end'
              )}
            >
              {/* Left: Table name + Search */}
              {(tableName || showSearch || (showFilters && filtersInlineWithSearch)) && (
                <div
                  className={cn(
                    'flex min-w-0 items-center gap-2',
                    filtersInlineWithSearch && 'flex-1 flex-wrap'
                  )}
                >
                  {tableName && (
                    <>
                      <h3 className='text-sm font-medium text-muted-foreground'>
                        {tableName}
                      </h3>
                      <Separator orientation='vertical' className='h-4' />
                    </>
                  )}
                  {showSearch && (
                    <SearchInput
                      ref={searchInputRef}
                      placeholder={searchPlaceholder}
                      value={controls.search}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        controls.setSearch(event.target.value)
                      }
                      onClear={() => controls.setSearch('')}
                      className='min-w-48 sm:min-w-64 max-w-sm shrink-0'
                      kbd={getPlatformSpecificKbd('K')}
                      variant='sm'
                      autoFocus
                    />
                  )}
                  {showFilters && filtersInlineWithSearch && (
                    <DataTableFilters
                      controls={controls}
                      filterFields={filterFields}
                      showAddButton={showFilterAddButton}
                      showClearButton={showFilterClearButton}
                      inline
                    />
                  )}
                </div>
              )}

              {/* Right: Column Filter and Action Buttons – stays on the right of row 1 */}
              <div className='flex shrink-0 items-center gap-2 ml-auto'>
                {showTotalBadge && (
                  <div className='flex items-center gap-1 text-s'>
                    {totalCount !== undefined && (
                      <Badge
                        variant='secondary'
                        className='text-s tracking-wide'
                      >
                        <span className='text-muted-foreground'>
                          <span className='font-semibold'>
                            {flattenedData.length}
                          </span>
                          of total {totalCount}
                        </span>
                      </Badge>
                    )}
                  </div>
                )}
                {showColumnFilter && <ColumnFilter table={table} />}
                {actions?.end}
              </div>
            </div>

            {/* Row 2: Filters – full width when not inline with search */}
            {showFilters && !filtersInlineWithSearch && (
              <div className='w-full'>
                <DataTableFilters
                  controls={controls}
                  filterFields={filterFields}
                  showAddButton={showFilterAddButton}
                  showClearButton={showFilterClearButton}
                  className='w-full'
                />
              </div>
            )}
          </div>
        </div>
        <BulkActionBar<T> table={table} bulkActions={bulkActions} />
      </div>

      <TabsContent
        key={tabsValue}
        value={tabsValue}
        className='relative flex flex-col gap-3 px-3 lg:px-4'
      >
        <div className={cn('rounded-lg border overflow-visible')}>
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table
              className='w-full table-fixed'
              containerClassName='overflow-visible'
            >
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className='bg-muted [&>th:first-child]:rounded-tl-lg [&>th:last-child]:rounded-tr-lg'
                  >
                    {showIndexColumn && (
                      <TableHead className='text-center text-muted-foreground'>
                        #
                      </TableHead>
                    )}
                    {headerGroup.headers.map((header) => {
                      const columnSize = header.column.getSize();
                      const widthPercent =
                        totalColumnSize > 0
                          ? `${(columnSize / totalColumnSize) * 100}%`
                          : `${columnSize}px`;
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{ width: widthPercent }}
                          className='whitespace-nowrap'
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <DataTableBody<T>
                showIndexColumn={showIndexColumn}
                query={query}
                controls={controls}
                table={table}
                dataIds={dataIds}
                emptyState={emptyState}
                loadingMessage={loadingMessage}
                errorState={errorState}
                sentinelRef={sentinelRef}
                hasMoreData={query.hasNextPage}
                renderExpandedRow={renderExpandedRow}
                showLoaderWhenPending={showLoaderWhenPending}
              />
            </Table>
          </DndContext>
        </div>
      </TabsContent>
    </Tabs>
  );
}
