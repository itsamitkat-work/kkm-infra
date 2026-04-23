'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useEstimationExport } from '../hooks/use-estimation-export';
import { EstimationRowData, type ProjectBoqDomainLinesType } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonsProps {
  projectId: string;
  type: ProjectBoqDomainLinesType;
  items: EstimationRowData[];
  kpiData: {
    amount1: number;
    amount2: number;
    costImpact: number;
    overrunItemsCount: number;
    costEffectiveItemsCount: number;
  };
  disabled?: boolean;
}

export function ExportButtons({
  projectId,
  type,
  items,
  kpiData,
  disabled = false,
}: ExportButtonsProps) {
  const {
    isExporting,
    exportProgress,
    handleExportToExcel,
    handleExportToPDF,
  } = useEstimationExport({
    projectId,
    type,
    items,
    kpiData,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={disabled || isExporting || items.length === 0}
        >
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
              <span className='hidden lg:inline'>Export</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={handleExportToExcel} disabled={isExporting}>
          <FileSpreadsheet className='mr-2 h-4 w-4' />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportToPDF} disabled={isExporting}>
          <FileText className='mr-2 h-4 w-4' />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
