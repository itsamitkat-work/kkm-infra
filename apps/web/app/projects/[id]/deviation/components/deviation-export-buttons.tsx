'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  exportDeviationToExcel,
  exportDeviationToPDF,
  exportAllDeviationsToExcel,
  exportAllDeviationsToPDF,
} from '../utils/deviation-export-utils';
import { toast } from 'sonner';
import { DeviationResponse, DeviationReportType } from '../types';
import { fetchDeviationReportItems } from '../hooks/use-deviation-items-list';

interface DeviationExportButtonsProps {
  projectId: string;
  disabled?: boolean;
}

// Helper function to calculate KPI data for a set of items
function calculateKpiData(items: DeviationResponse[]) {
  const stats = {
    totalItems: items.length,
    overrunItemsCount: 0,
    costEffectiveItemsCount: 0,
    netDeviationAmount: 0,
    totalAmount1: 0,
    totalAmount2: 0,
  };

  for (const item of items) {
    const rate = item.rate || 0;
    const quantity1 = item.quantity1 || 0;
    const quantity2 = item.quantity2 || 0;
    const amount1 = quantity1 * rate;
    const amount2 = quantity2 * rate;
    const deviationQty = quantity2 - quantity1;

    if (deviationQty > 0) {
      stats.overrunItemsCount++;
    } else if (deviationQty < 0) {
      stats.costEffectiveItemsCount++;
    }

    stats.netDeviationAmount += amount2 - amount1;
    stats.totalAmount1 += amount1;
    stats.totalAmount2 += amount2;
  }

  return stats;
}

export function DeviationExportButtons({
  projectId,
  disabled = false,
}: DeviationExportButtonsProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportSpecificType = React.useCallback(
    async (exportType: DeviationReportType, format: 'excel' | 'pdf') => {
      try {
        setIsExporting(true);
        toast.loading(`Fetching ${exportType} data...`, { id: 'export-toast' });

        // Fetch data for the specific type
        const response = await fetchDeviationReportItems(
          projectId,
          undefined,
          undefined,
          undefined,
          undefined,
          exportType
        );

        const allItems: DeviationResponse[] = [];
        const totalPages = response.totalPages;

        // Fetch all pages
        allItems.push(...response.data);
        for (let page = 2; page <= totalPages; page++) {
          const pageResponse = await fetchDeviationReportItems(
            projectId,
            page,
            undefined,
            undefined,
            undefined,
            exportType
          );
          allItems.push(...pageResponse.data);
        }

        const calculatedKpiData = calculateKpiData(allItems);

        toast.loading(`Generating ${format.toUpperCase()} file...`, {
          id: 'export-toast',
        });

        if (format === 'excel') {
          exportDeviationToExcel({
            projectId,
            type: exportType,
            kpiData: calculatedKpiData,
            items: allItems,
          });
        } else {
          exportDeviationToPDF({
            projectId,
            type: exportType,
            kpiData: calculatedKpiData,
            items: allItems,
          });
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
      }
    },
    [projectId]
  );

  const handleExportAll = React.useCallback(
    async (format: 'excel' | 'pdf') => {
      try {
        setIsExporting(true);
        toast.loading('Fetching all deviation data...', {
          id: 'export-toast',
        });

        const types: DeviationReportType[] = [
          'GENvsEST',
          'GENvsMSR',
          'ESTvsMSR',
        ];
        const allData: {
          [K in DeviationReportType]: {
            kpiData: ReturnType<typeof calculateKpiData>;
            items: DeviationResponse[];
          };
        } = {} as Record<
          DeviationReportType,
          {
            kpiData: ReturnType<typeof calculateKpiData>;
            items: DeviationResponse[];
          }
        >;

        // Fetch data for all types
        for (const deviationType of types) {
          const response = await fetchDeviationReportItems(
            projectId,
            undefined,
            undefined,
            undefined,
            undefined,
            deviationType
          );

          const allItems: DeviationResponse[] = [];
          const totalPages = response.totalPages;

          allItems.push(...response.data);
          for (let page = 2; page <= totalPages; page++) {
            const pageResponse = await fetchDeviationReportItems(
              projectId,
              page,
              undefined,
              undefined,
              undefined,
              deviationType
            );
            allItems.push(...pageResponse.data);
          }

          allData[deviationType] = {
            kpiData: calculateKpiData(allItems),
            items: allItems,
          };
        }

        toast.loading(`Generating ${format.toUpperCase()} file...`, {
          id: 'export-toast',
        });

        if (format === 'excel') {
          exportAllDeviationsToExcel({
            projectId,
            data: allData,
          });
        } else {
          exportAllDeviationsToPDF({
            projectId,
            data: allData,
          });
        }

        toast.success(`${format.toUpperCase()} file downloaded successfully!`, {
          id: 'export-toast',
        });
      } catch (error) {
        console.error(`Export all to ${format} failed:`, error);
        toast.error(`Failed to export to ${format}. Please try again.`, {
          id: 'export-toast',
        });
      } finally {
        setIsExporting(false);
      }
    },
    [projectId]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' disabled={disabled || isExporting}>
          {isExporting ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='hidden lg:inline'>Exporting...</span>
            </>
          ) : (
            <>
              <Download className='h-4 w-4' />
              <span className='hidden lg:inline'>Export</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>Individual Comparisons</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isExporting}>
            <FileSpreadsheet className='mr-2 h-4 w-4' />
            <span>Planned vs Estimated</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleExportSpecificType('GENvsEST', 'excel')}
                disabled={isExporting}
              >
                <FileSpreadsheet className='mr-2 h-4 w-4' />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportSpecificType('GENvsEST', 'pdf')}
                disabled={isExporting}
              >
                <FileText className='mr-2 h-4 w-4' />
                PDF
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isExporting}>
            <FileSpreadsheet className='mr-2 h-4 w-4' />
            <span>Planned vs Measured</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleExportSpecificType('GENvsMSR', 'excel')}
                disabled={isExporting}
              >
                <FileSpreadsheet className='mr-2 h-4 w-4' />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportSpecificType('GENvsMSR', 'pdf')}
                disabled={isExporting}
              >
                <FileText className='mr-2 h-4 w-4' />
                PDF
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isExporting}>
            <FileSpreadsheet className='mr-2 h-4 w-4' />
            <span>Estimated vs Measured</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleExportSpecificType('ESTvsMSR', 'excel')}
                disabled={isExporting}
              >
                <FileSpreadsheet className='mr-2 h-4 w-4' />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportSpecificType('ESTvsMSR', 'pdf')}
                disabled={isExporting}
              >
                <FileText className='mr-2 h-4 w-4' />
                PDF
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Combined Report (All Types)</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExportAll('excel')}
          disabled={isExporting}
        >
          <FileSpreadsheet className='mr-2 h-4 w-4' />
          Export All to Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExportAll('pdf')}
          disabled={isExporting}
        >
          <FileText className='mr-2 h-4 w-4' />
          Export All to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
