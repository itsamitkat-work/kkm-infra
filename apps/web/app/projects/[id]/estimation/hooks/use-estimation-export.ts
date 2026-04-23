'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EstimationRowData, type ProjectBoqDomainLinesType } from '../types';
import { fetchEstimationData } from '@/hooks/use-estimation';
import {
  exportToExcel,
  exportToPDF,
  ExportData,
  ExportParentItem,
} from '../utils/export-utils';

interface UseEstimationExportProps {
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
}

export function useEstimationExport({
  projectId,
  type,
  items,
  kpiData,
}: UseEstimationExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  /**
   * Fetch all sub-items for all parent items
   */
  const fetchAllSubItems = async (): Promise<ExportParentItem[]> => {
    const totalItems = items.length;
    const itemsWithSubItems: ExportParentItem[] = [];

    // Fetch sub-items for all items in parallel with batching
    const batchSize = 10; // Fetch 10 items at a time to avoid overwhelming the API

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, totalItems));

      const batchPromises = batch.map(async (item) => {
        try {
          // Fetch sub-items for this item
          const response = await fetchEstimationData(item.id, type);

          // Transform EstimationItem[] to ItemEstimationRowData[]
          const transformedSubItems = (response.data || []).map((subItem) => ({
            id: subItem.hashId || subItem.hashid || '',
            date: subItem.createdOn
              ? new Date(subItem.createdOn).toLocaleDateString()
              : '',
            description: subItem.description,
            no1: subItem.no1,
            no2: subItem.no2,
            length: subItem.length,
            width: subItem.width,
            height: subItem.height,
            quantity: subItem.quantity,
            rate: 0,
            schedule_quantity: 0,
            isEdited: false,
            isNew: false,
            checked: subItem.checked?.toString() || 'false',
            verified: subItem.verified?.toString() || 'false',
          }));

          return {
            ...item,
            subItems: transformedSubItems,
          };
        } catch (error) {
          console.error(
            `Failed to fetch sub-items for item ${item.id}:`,
            error
          );
          // Return item without sub-items if fetch fails
          return {
            ...item,
            subItems: [],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      itemsWithSubItems.push(...batchResults);

      // Update progress
      const progress = Math.round(((i + batch.length) / totalItems) * 100);
      setExportProgress(progress);
    }

    return itemsWithSubItems;
  };

  /**
   * Export to Excel
   */
  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      toast.loading('Fetching estimation data...', { id: 'export-toast' });

      // Fetch all sub-items for all parent items
      const itemsWithSubItems = await fetchAllSubItems();

      toast.loading('Generating Excel file...', { id: 'export-toast' });

      // Prepare export data
      const exportData: ExportData = {
        projectId,
        type,
        kpiData,
        items: itemsWithSubItems,
      };

      // Export to Excel
      exportToExcel(exportData);

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
      setExportProgress(0);
    }
  };

  /**
   * Export to PDF
   */
  const handleExportToPDF = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      toast.loading('Fetching estimation data...', { id: 'export-toast' });

      // Fetch all sub-items for all parent items
      const itemsWithSubItems = await fetchAllSubItems();

      toast.loading('Generating PDF file...', { id: 'export-toast' });

      // Prepare export data
      const exportData: ExportData = {
        projectId,
        type,
        kpiData,
        items: itemsWithSubItems,
      };

      // Export to PDF
      exportToPDF(exportData);

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
      setExportProgress(0);
    }
  };

  return {
    isExporting,
    exportProgress,
    handleExportToExcel,
    handleExportToPDF,
  };
}
