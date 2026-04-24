'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAttendanceReport } from '../api/report-api';
import {
  exportAttendanceReportToExcel,
  exportAttendanceReportToPDF,
} from '../utils/export-utils';
import { AttendanceReportParams, AttendanceReportRecord } from '../types';

interface ReportExportButtonProps {
  apiParams: AttendanceReportParams;
  reportName: string;
  disabled?: boolean;
}

export function ReportExportButton({
  apiParams,
  reportName,
  disabled = false,
}: ReportExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);

  const fetchAllData = React.useCallback(async (): Promise<
    AttendanceReportRecord[]
  > => {
    const allRecords: AttendanceReportRecord[] = [];
    let currentPage = 1;
    let hasMore = true;

    // Fetch with larger page size for export
    const exportParams: AttendanceReportParams = {
      ...apiParams,
      pageSize: 200,
    };

    while (hasMore) {
      const response = await fetchAttendanceReport({
        ...exportParams,
        page: currentPage,
      });

      allRecords.push(...response.data);

      // Update progress
      const progress = Math.min(
        Math.round((allRecords.length / response.totalCount) * 100),
        99
      );
      setExportProgress(progress);

      hasMore = response.hasNext;
      currentPage++;
    }

    setExportProgress(100);
    return allRecords;
  }, [apiParams]);

  const handleExport = React.useCallback(
    async (format: 'excel' | 'pdf') => {
      try {
        setIsExporting(true);
        setExportProgress(0);

        toast.loading('Fetching all data...', { id: 'export-toast' });

        // Fetch all data
        const allRecords = await fetchAllData();

        toast.loading(`Generating ${format.toUpperCase()} file...`, {
          id: 'export-toast',
        });

        // Export based on format
        const exportData = {
          reportName,
          records: allRecords,
          dateRange: {
            start: apiParams.StartDate,
            end: apiParams.EndDate,
          },
        };

        if (format === 'excel') {
          exportAttendanceReportToExcel(exportData);
        } else {
          exportAttendanceReportToPDF(exportData);
        }

        toast.success(`${format.toUpperCase()} file downloaded successfully!`, {
          id: 'export-toast',
        });
      } catch (error) {
        console.error(`Export to ${format} failed:`, error);
        toast.error(`Failed to export to ${format}. Please try again.`, {
          id: 'export-toast',
        });
      } finally {
        setIsExporting(false);
        setExportProgress(0);
      }
    },
    [fetchAllData, reportName, apiParams]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' disabled={disabled || isExporting}>
          {isExporting ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='hidden lg:inline'>
                Exporting... {exportProgress}%
              </span>
            </>
          ) : (
            <>
              <Download className='h-4 w-4' />
              <span className='hidden lg:inline'>Download</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={isExporting}
        >
          <FileSpreadsheet className='mr-2 h-4 w-4' />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          <FileText className='mr-2 h-4 w-4' />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
