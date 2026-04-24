'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { ProjectItemRowType } from '@/types/project-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  exportProjectItemsToExcel,
  exportProjectItemsToPDF,
} from '../utils/export-utils';
import { toast } from 'sonner';

interface ProjectItemsExportButtonsProps {
  projectId: string;
  items: ProjectItemRowType[];
  totalAmount: number;
  disabled?: boolean;
  buttonClassName?: string;
}

export function ProjectItemsExportButtons({
  projectId,
  items,
  totalAmount,
  disabled = false,
  buttonClassName,
}: ProjectItemsExportButtonsProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportToExcel = React.useCallback(() => {
    try {
      setIsExporting(true);
      toast.loading('Generating Excel file...', { id: 'export-toast' });

      exportProjectItemsToExcel({
        projectId,
        items,
        totalAmount,
      });

      toast.success('Excel file downloaded successfully!', {
        id: 'export-toast',
      });
    } catch (error) {
      console.error('Export to Excel failed:', error);
      toast.error('Failed to export to Excel. Please try again.', {
        id: 'export-toast',
      });
    } finally {
      setIsExporting(false);
    }
  }, [projectId, items, totalAmount]);

  const handleExportToPDF = React.useCallback(() => {
    try {
      setIsExporting(true);
      toast.loading('Generating PDF file...', { id: 'export-toast' });

      exportProjectItemsToPDF({
        projectId,
        items,
        totalAmount,
      });

      toast.success('PDF file downloaded successfully!', {
        id: 'export-toast',
      });
    } catch (error) {
      console.error('Export to PDF failed:', error);
      toast.error('Failed to export to PDF. Please try again.', {
        id: 'export-toast',
      });
    } finally {
      setIsExporting(false);
    }
  }, [projectId, items, totalAmount]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          disabled={disabled || isExporting || items.length === 0}
          className={buttonClassName}
        >
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
