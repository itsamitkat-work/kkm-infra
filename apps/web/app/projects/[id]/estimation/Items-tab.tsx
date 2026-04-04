'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import {
  EstimationReportsFilters,
  useEstimationReportsFilters,
} from './filters';
import { Filter } from '@/components/ui/filters';
import { useProjectItemsQuery } from '@/app/(app)/projects/hooks/use-project-items-query';
import { ProjectItemRowType as HookProjectRowData } from '@/types/project-item';
import { EstimationRowData, ProjectItemType } from './types';
import { EstimationReportsKPICards } from './components/kpi-cards';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import { Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEstimationStore } from './hooks/use-estimation-store';
import { ExportButtons } from './components/export-buttons';
import { ItemsDataTable } from './components/items-data-table';
import { getMainColumns } from './components/main-table-columns';
import {
  ExtraItemsTable,
  ExtraItemsTableRef,
} from './components/extra-items-table';
import { useExtraItemsStore } from './hooks/use-extra-items-store';
import { useDeleteProjectItem } from '@/hooks/projects/use-project-items-mutations';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useEstimationShare } from './hooks/use-estimation-share';
import { useEstimationUrlSync } from './hooks/use-estimation-url-sync';
import { useProjectSegments } from '../hooks/use-project-segments';
import { useProjectSegmentsFilter } from '../hooks/use-project-segments-filter';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { ItemMeasurmentTable } from './item-measurment-table';
import { UnitDisplay } from '@/components/ui/unit-display';
import { Row } from '@tanstack/react-table';

export function ItemsTab({
  projectId,
  type,
}: {
  projectId: string;
  type: ProjectItemType;
}) {
  const searchParams = useSearchParams();
  const searchInputRef = useSearchShortcut();

  // Table State
  const [isAllExpanded, setIsAllExpanded] = React.useState(false);

  const { updatedAmounts, clearAmounts } = useEstimationStore();
  const { clearExtraItems } = useExtraItemsStore();
  const extraItemsTableRef = React.useRef<ExtraItemsTableRef>(null);
  const { extraItems } = useExtraItemsStore();

  const { segments } = useProjectSegments(projectId);

  const { mutateAsync: deleteItem, isPending: isDeleting } =
    useDeleteProjectItem(projectId);

  const {
    isOpen: isDeleteConfirmationOpen,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    data: deleteConfirmationData,
  } = useDeleteConfirmation();

  // Control dialog open state to keep it open during deletion
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const pendingDeleteRef = React.useRef<EstimationRowData | null>(null);

  React.useEffect(() => {
    if (isDeleteConfirmationOpen) {
      setIsDialogOpen(true);
    }
  }, [isDeleteConfirmationOpen]);

  React.useEffect(() => {
    if (!isDeleting && pendingDeleteRef.current && isDialogOpen) {
      // Deletion completed, close dialog
      setIsDialogOpen(false);
      closeDeleteConfirmation();
      pendingDeleteRef.current = null;
    }
  }, [isDeleting, isDialogOpen, closeDeleteConfirmation]);

  React.useEffect(() => {
    return () => {
      clearAmounts();
      clearExtraItems();
    };
  }, [clearAmounts, clearExtraItems]);

  // Fetch estimation data using the hook
  const {
    data: projectItemsData,
    isLoading,
    isError,
    refetch,
  } = useProjectItemsQuery({
    projectId: projectId,
    type,
  });

  // Transform hook data to match the expected structure for estimation reports
  const dataWithComputed = React.useMemo(() => {
    if (!projectItemsData) return [];

    return projectItemsData.map(
      (item: HookProjectRowData): EstimationRowData => {
        const plannedQtyValue = parseFloat(item.quantity || '0');
        const rate = parseFloat(item.rate || '0');

        // Use estimatedQty directly from backend API
        const estimatedQtyString = item.estimate_quantity || '0';
        const estimatedQtyValue = parseFloat(estimatedQtyString);

        const deviationQty = estimatedQtyValue - plannedQtyValue;
        const deviationPercent =
          plannedQtyValue > 0
            ? ((estimatedQtyValue - plannedQtyValue) / plannedQtyValue) * 100
            : 0;
        const costDeviation = (estimatedQtyValue - plannedQtyValue) * rate;

        return {
          ...item,
          estimate_quantity: estimatedQtyString, // From backend API
          deviationQty,
          deviationPercent,
          costDeviation,
        };
      }
    );
  }, [projectItemsData]);

  // Restore state from URL on mount
  const getInitialFilters = React.useCallback((): Filter[] => {
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        return JSON.parse(filtersParam) as Filter[];
      } catch (error) {
        console.error('Failed to parse filters from URL:', error);
        return [];
      }
    }
    return [];
  }, [searchParams]);

  const getInitialQuery = React.useCallback((): string => {
    return searchParams.get('query') || '';
  }, [searchParams]);

  const getInitialSegment = React.useCallback((): string | null => {
    return searchParams.get('segment') || null;
  }, [searchParams]);

  const handleAddExtraRow = () => {
    extraItemsTableRef.current?.addNewItem();
  };

  // Use segment hook for filtering
  const {
    processedData,
    segmentToggleOptions,
    handleSegmentSelectionChange,
    selectedSegmentId,
  } = useProjectSegmentsFilter({
    segments,
    data: dataWithComputed,
    initialSegmentId: getInitialSegment(),
  });

  // Use the extracted filter hook with initial values from URL
  const {
    filters,
    onFiltersChange,
    query: search,
    onQueryChange: onSearchChange,
    filteredItems,
  } = useEstimationReportsFilters(
    processedData,
    getInitialFilters(),
    getInitialQuery()
  );

  // Sync state with URL
  useEstimationUrlSync({
    projectId,
    type,
    filters,
    query: search,
    segmentId: selectedSegmentId,
  });

  // Share functionality - just copy current URL
  const { handleShareLink } = useEstimationShare();

  const handleAutoExpandToggle = (checked: boolean) => {
    setIsAllExpanded(checked);
  };

  const kpiData = React.useMemo(() => {
    if (!dataWithComputed)
      return {
        amount1: 0,
        amount2: 0,
        costImpact: 0,
        overrunItemsCount: 0,
        costEffectiveItemsCount: 0,
      };

    const totals = dataWithComputed.reduce(
      (acc, item) => {
        const rate = parseFloat(item.rate || '0');
        let costDeviation = 0;

        if (type === 'EST') {
          const plannedQty = parseFloat(item.quantity || '0');
          const estimatedQty = parseFloat(item.estimate_quantity || '0');
          const plannedAmount = plannedQty * rate;
          const estimatedAmount = estimatedQty * rate;

          acc.amount1 += plannedAmount;

          const finalEstimatedAmount =
            updatedAmounts[item.id] ?? estimatedAmount;
          acc.amount2 += finalEstimatedAmount;
          costDeviation = finalEstimatedAmount - plannedAmount;
        } else {
          // MSR
          const estimatedQty = parseFloat(item.estimate_quantity || '0');
          const measuredQty = parseFloat(item.measurment_quantity || '0');
          const estimatedAmount = estimatedQty * rate;
          const measuredAmount = measuredQty * rate;

          acc.amount1 += estimatedAmount;

          const finalMeasuredAmount = updatedAmounts[item.id] ?? measuredAmount;
          acc.amount2 += finalMeasuredAmount;
          costDeviation = finalMeasuredAmount - estimatedAmount;
        }

        if (costDeviation > 0) {
          acc.overrunItemsCount++;
        } else if (costDeviation < 0) {
          acc.costEffectiveItemsCount++;
        }

        return acc;
      },
      {
        amount1: 0,
        amount2: 0,
        overrunItemsCount: 0,
        costEffectiveItemsCount: 0,
      }
    );

    return {
      amount1: totals.amount1,
      amount2: totals.amount2,
      costImpact: totals.amount2 - totals.amount1,
      overrunItemsCount: totals.overrunItemsCount,
      costEffectiveItemsCount: totals.costEffectiveItemsCount,
    };
  }, [dataWithComputed, type, updatedAmounts]);

  const handleDeleteItem = React.useCallback(
    async (row: EstimationRowData) => {
      pendingDeleteRef.current = row;
      try {
        await deleteItem({ itemId: row.id });
        refetch();
      } catch {
        // Error handling is done in the mutation hook
        setIsDialogOpen(false);
        closeDeleteConfirmation();
        pendingDeleteRef.current = null;
      }
    },
    [deleteItem, refetch, closeDeleteConfirmation]
  );

  const columns = React.useMemo(
    () =>
      getMainColumns({
        type,
        onDelete: handleDeleteItem,
        openDeleteConfirmation,
      }),
    [type, handleDeleteItem, openDeleteConfirmation]
  );

  const getColumnBackground = (columnId: string) => {
    if (['group1', 'quantity1', 'amount1'].includes(columnId)) {
      return 'bg-blue-50/30 dark:bg-blue-900/10';
    }
    if (['group2', 'quantity2', 'amount2'].includes(columnId)) {
      return 'bg-amber-50/30 dark:bg-amber-900/10';
    }
    return '';
  };

  const renderSubComponent = React.useCallback(
    ({ row }: { row: Row<EstimationRowData> }) => {
      const original = row.original;
      return (
        <div className='overflow-hidden transition-all duration-300 ease-in-out animate-in slide-in-from-top-2 fade-in-0 border-b-2 border-primary/10'>
          <div className='border-t bg-muted/20 transition-colors duration-200'>
            {/* Rate and Unit Information */}
            <div className='px-4 py-3 border-b bg-muted/30'>
              <div className='flex items-center gap-6 text-sm'>
                <div className='flex items-center gap-2'>
                  <span className='text-muted-foreground font-medium'>
                    Rate:
                  </span>
                  <span className='font-semibold tabular-nums'>
                    {/* Assuming rate is in user's currency, prefixing with ₹ as in original code */}
                    ₹{original.rate}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-muted-foreground font-medium'>
                    Unit:
                  </span>
                  <UnitDisplay
                    unit={original.unit || ''}
                    size='sm'
                    labelClassName='font-semibold text-foreground'
                  />
                </div>
              </div>
            </div>
            <ItemMeasurmentTable
              selectedSegmentId={selectedSegmentId}
              projectItemHashId={original.id}
              rate={parseFloat(original.rate || '0')}
              scheduleQuantity={parseFloat(original.quantity || '0')}
              type={type}
            />
          </div>
        </div>
      );
    },
    [selectedSegmentId, type]
  );

  return (
    <TooltipProvider>
      <div className='relative'>
        {/* Sticky KPI cards header */}
        <div className='sticky top-0 z-10 bg-background'>
          <div
            className='transition-all duration-500 ease-in-out'
            style={{
              paddingTop: `${16 - 0 * 4}px`,
              paddingBottom: `${16 - 0 * 4}px`,
            }}
          >
            <div className='px-4 lg:px-6'>
              {/* Sticky KPI cards - always visible, just change compact mode */}
              <div className='transition-all duration-500 ease-in-out'>
                <EstimationReportsKPICards
                  compact={true}
                  isLoading={isLoading}
                  type={type}
                  kpiData={kpiData}
                />
              </div>
            </div>
          </div>
        </div>

        <div className='overflow-hidden'>
          <div className='p-3 pb-2'>
            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-4'>
                <EstimationReportsFilters
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  query={search}
                  onQueryChange={onSearchChange}
                  searchInputRef={searchInputRef}
                />
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <Switch
                      id='auto-expand-switch'
                      checked={isAllExpanded}
                      onCheckedChange={handleAutoExpandToggle}
                    />
                    <Label
                      htmlFor='auto-expand-switch'
                      className='text-sm font-medium cursor-pointer'
                    >
                      Expanded
                    </Label>
                  </div>

                  <ExportButtons
                    projectId={projectId}
                    type={type}
                    items={dataWithComputed}
                    kpiData={kpiData}
                    disabled={isLoading}
                  />

                  <Button
                    disabled={isLoading}
                    size='sm'
                    variant='outline'
                    onClick={handleShareLink}
                  >
                    <Share2 className='h-4 w-4' />
                    <span className='hidden lg:inline'>Share</span>
                  </Button>

                  <Button
                    disabled={isLoading}
                    size='sm'
                    className='mr-0'
                    onClick={handleAddExtraRow}
                  >
                    <Plus className='h-4 w-4' />
                    <span className='hidden lg:inline'>Extra Item</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Table */}
          <div className='px-3 pb-3'>
            {/* Always mount component for ref access, but conditionally show wrapper */}
            <div
              className={
                extraItems.length > 0
                  ? 'mt-4 border rounded-lg overflow-hidden mb-4'
                  : 'hidden'
              }
            >
              {extraItems.length > 0 && (
                <div className='flex items-center justify-between p-3 bg-muted/30 border-b'>
                  <h3 className='text-lg font-semibold'>Add Extra Items</h3>
                </div>
              )}
              <ExtraItemsTable
                ref={extraItemsTableRef}
                projectId={projectId}
                type={type}
                onItemSaved={refetch}
              />
            </div>

            {segments.length > 0 && (
              <div className='flex flex-col gap-2 min-w-0 flex-1 max-w-full'>
                <Tabs
                  value={selectedSegmentId}
                  onValueChange={(value) => {
                    if (value) {
                      handleSegmentSelectionChange(value);
                    }
                  }}
                >
                  <ScrollableTabs>
                    <TabsList className='flex h-auto p-1 bg-muted w-fit'>
                      {segmentToggleOptions.map((option) => (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          className='px-3 py-1 text-xs data-[state=active]:bg-background'
                        >
                          {option.label}
                          {typeof option.count === 'number' && (
                            <Badge
                              variant='secondary'
                              className={`ml-1.5 h-4 px-1.5 text-[10px] font-medium ${
                                selectedSegmentId === option.id
                                  ? 'bg-secondary/80'
                                  : 'bg-white/50 dark:bg-white/10'
                              }`}
                            >
                              {option.count}
                            </Badge>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </ScrollableTabs>
                </Tabs>
              </div>
            )}

            <div className='border rounded-lg overflow-hidden mt-2'>
              <div className='overflow-x-auto'>
                <ItemsDataTable
                  data={filteredItems}
                  columns={columns}
                  isLoading={isLoading}
                  isError={isError}
                  defaultExpandAll={isAllExpanded}
                  renderSubComponent={renderSubComponent}
                  getRowId={(row) => row.id}
                  getColumnBackground={getColumnBackground}
                  fluidColumnId='name'
                />
              </div>
            </div>
          </div>
        </div>
        {deleteConfirmationData && (
          <DeleteConfirmationDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open && !isDeleting) {
                setIsDialogOpen(false);
                closeDeleteConfirmation();
              } else if (open) {
                setIsDialogOpen(true);
              }
            }}
            onConfirm={deleteConfirmationData.onConfirm}
            itemName={deleteConfirmationData.itemName}
            isLoading={isDeleting}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
