'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { AttendanceReportRecord } from '../types';
import { getReportColumns } from './report-columns';
import { TableErrorState } from '@/components/tables/table-error';
import {
  useAttendanceReportInfiniteQuery,
  ATTENDANCE_REPORT_TABLE_ID,
} from '../hooks/use-attendance-report-infinite-query';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { useReportTypesQuery } from '../hooks/use-report-types-query';
import { getAttendanceReportFilterFields } from '../filters-config';
import { useReportFilterOptions } from '../hooks/use-report-filter-options';
import { convertFiltersToApiParams } from '../utils/filter-to-api-params';
import { createFilter, type Filter } from '@/components/ui/filters';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { IconFilter } from '@tabler/icons-react';
import { DataTableFilters } from '@/components/tables/data-table/data-table-filters';
import { ReportExportButton } from './report-export-button';

// Check if required filter (reportType) is selected
function areFiltersSelected(filters: Filter[]): boolean {
  const reportTypeFilter = filters.find((f) => f.field === 'reportType');

  const hasReportType =
    reportTypeFilter?.values && reportTypeFilter.values.length > 0;

  return Boolean(hasReportType);
}

export function ReportTable() {
  // Default filters to apply on initial load - reportType filter with empty value (user must select)
  const defaultFilters = React.useMemo(
    () => [createFilter('reportType', 'is', [])],
    []
  );

  // Use DataTableControls for filter management (filters will be sticky in DataTable)
  const controls = useDataTableControls(
    ATTENDANCE_REPORT_TABLE_ID,
    defaultFilters
  );

  // Fetch report types from API
  const { reportTypes } = useReportTypesQuery();

  // Fetch filter options (project heads, engineers, supervisors, projects)
  const filterOptions = useReportFilterOptions();

  // Convert report types to filter options
  const reportTypeOptions = React.useMemo(() => {
    return reportTypes.map((reportType) => ({
      value: reportType.code.toString(),
      label: reportType.name,
    }));
  }, [reportTypes]);

  // Create filter fields with dynamic options
  const filterFields = React.useMemo(() => {
    return getAttendanceReportFilterFields(
      reportTypeOptions,
      filterOptions.projectHeads.options,
      filterOptions.engineers.options,
      filterOptions.supervisors.options,
      filterOptions.projects.options,
      filterOptions.workers.options
    );
  }, [
    reportTypeOptions,
    filterOptions.projectHeads.options,
    filterOptions.engineers.options,
    filterOptions.supervisors.options,
    filterOptions.projects.options,
    filterOptions.workers.options,
  ]);

  // Check if required filter (reportType) is selected
  const filtersSelected = React.useMemo(() => {
    return areFiltersSelected(controls.filters);
  }, [controls.filters]);

  // Convert filters to API parameters
  const apiParams = React.useMemo(() => {
    return convertFiltersToApiParams(controls.filters);
  }, [controls.filters]);

  // Get selected report name for export
  const selectedReportName = React.useMemo(() => {
    const reportTypeFilter = controls.filters.find(
      (f) => f.field === 'reportType'
    );
    if (reportTypeFilter?.values && reportTypeFilter.values.length > 0) {
      const selectedCode = reportTypeFilter.values[0];
      const selectedType = reportTypeOptions.find(
        (rt) => rt.value === selectedCode
      );
      return selectedType?.label || 'Attendance Report';
    }
    return 'Attendance Report';
  }, [controls.filters, reportTypeOptions]);

  const { query: reportQuery, invalidate } = useAttendanceReportInfiniteQuery({
    params: apiParams,
    search: controls.search,
    filters: controls.filters,
    sorting: controls.state.sorting,
    enabled: filtersSelected, // Only fetch when reportType is selected
  });

  // Get flattened data to determine column structure
  const flattenedData = React.useMemo(
    () => reportQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [reportQuery.data]
  );

  // Determine columns based on first record structure (use default if no data)
  const columns = React.useMemo(() => {
    if (flattenedData.length > 0) {
      return getReportColumns(flattenedData);
    }
    // Return default columns when no data (for initial render)
    return getReportColumns([]);
  }, [flattenedData]);

  // Custom empty state message when filters are not selected
  const emptyStateMessage = React.useMemo(() => {
    return {
      itemType: 'attendance record',
    };
  }, []);

  // Show filters in sticky section and Empty component when filters not selected
  if (!filtersSelected) {
    return (
      <div className='flex flex-col gap-4'>
        {/* Sticky filters section */}
        <div className='sticky top-12 z-20 bg-background pt-2 pb-1'>
          <div className='px-3 lg:px-4'>
            <div className='flex flex-col gap-3'>
              <div className='flex items-start gap-3'>
                <div className='flex flex-1 flex-wrap items-center gap-2'>
                  <DataTableFilters
                    controls={controls}
                    filterFields={filterFields}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className='px-3 lg:px-4'>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <IconFilter className='h-6 w-6' />
              </EmptyMedia>
              <EmptyTitle>Select report type to view report</EmptyTitle>
              <EmptyDescription>
                Please select a Report Type to load attendance data.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  // Show DataTable when filters are selected
  return (
    <DataTable<AttendanceReportRecord>
      query={reportQuery}
      controls={controls}
      filterFields={filterFields}
      columns={columns}
      searchPlaceholder='Search attendance records...'
      emptyState={emptyStateMessage}
      loadingMessage='Loading attendance report...'
      errorState={
        <TableErrorState
          title='Failed to load attendance report'
          message={reportQuery.error?.message || 'An error occurred'}
          onRetry={() => invalidate()}
        />
      }
      showSearch={false}
      showFilters={true}
      actions={{
        end: (
          <ReportExportButton
            apiParams={apiParams}
            reportName={selectedReportName}
            disabled={flattenedData.length === 0}
          />
        ),
      }}
    />
  );
}
