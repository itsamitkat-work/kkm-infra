import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useEstimationMutations } from '@/hooks/use-estimation';
import { ItemMeasurmentRowData, ProjectItemType } from '../types';
import { TableMeta } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectSegment } from '@/types/projects';

export function useProjectItemMeasurmentMutations(
  projectItemHashId: string,
  projectHashId: string,
  type: ProjectItemType,
  segments: ProjectSegment[]
) {
  const [saveErrors, setSaveErrors] = useState<Record<string, string | null>>(
    {}
  );
  const { createMutation, updateMutation, deleteMutation } =
    useEstimationMutations(projectItemHashId, type);
  const queryClient = useQueryClient();

  // Check if description contains #segment_name pattern
  const hasSegmentName = useCallback((description: string): boolean => {
    if (!description) return false;
    return /#([^\s#:]+)/.test(description);
  }, []);

  // Extract segment name from description and find matching segmentHashId
  // Supports patterns like "#Phase 1:" where "Phase 1" is the segment name
  const getSegmentHashIdFromDescription = useCallback(
    (description: string): string | undefined => {
      if (!description || !segments.length) return undefined;

      // Match #segment_name: or #segment_name (allows spaces in segment name)
      const match = description.match(/#([^#:]+)/);
      if (!match) return undefined;

      // Extract and trim the segment name (removes trailing spaces before colon)
      const segmentName = match[1].trim();
      if (!segmentName) return undefined;

      const segment = segments.find(
        (s) => s.segmentName.toLowerCase() === segmentName.toLowerCase()
      );

      return segment?.hashId;
    },
    [segments]
  );

  // Helper function to build payload from rowData
  const buildPayload = useCallback(
    (rowData: ItemMeasurmentRowData, options: { orderKey?: number } = {}) => {
      const { orderKey } = options;

      // Extract segmentHashId from description if #segment_name is present
      const segmentHashId = getSegmentHashIdFromDescription(
        rowData.description || ''
      );

      return {
        description: rowData.description,
        projectItemHashId: projectItemHashId,
        projectHashId: projectHashId,
        projectItemId: projectItemHashId, // only in BLG
        projectId: projectHashId, // only in BLG
        ...(segmentHashId
          ? { [type === 'BLG' ? 'segmentId' : 'segmentHashId']: segmentHashId }
          : {}),
        no1: Number(rowData.no1) || 0,
        no2: Number(rowData.no2) || 0,
        length: Number(rowData.length) || 0,
        width: Number(rowData.width) || 0,
        height: Number(rowData.height) || 0,
        quantity: Number(rowData.quantity) || 0,
        ...(orderKey !== undefined ? { orderKey } : {}),
        ...(type === 'MSR'
          ? {
              checked: rowData.checked === 'true' ? true : false,
              verified: rowData.verified === 'true' ? true : false,
            }
          : {}),
      };
    },
    [projectItemHashId, projectHashId, type, getSegmentHashIdFromDescription]
  );

  // Helper function to invalidate relevant queries
  const invalidateQueries = useCallback(
    (shouldInvalidateProjectItems: boolean = false) => {
      if (shouldInvalidateProjectItems) {
        queryClient.invalidateQueries({
          queryKey: ['project-items', projectHashId, type],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['estimation', projectItemHashId, type],
      });
    },
    [queryClient, projectHashId, type, projectItemHashId]
  );

  const handleSave = useCallback(
    async (
      rowData: ItemMeasurmentRowData,
      meta: TableMeta<ItemMeasurmentRowData>,
      options?: {
        suppressToast?: boolean;
        rowIndex?: number;
        orderKeyBoundaries?: {
          lower?: number;
          upper?: number;
          lastItemOrderKey?: number;
        };
      }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!meta.updateRow || (!rowData.isEdited && !rowData.isNew)) {
        return { success: false };
      }

      meta.startLoading?.(rowData.id);

      // Calculate orderKey based on whether it's a new measurement, updated, or reordered
      let orderKey: number | undefined = undefined;

      if (rowData.isNew) {
        // For new measurements, calculate orderKey based on boundaries if available
        if (options?.orderKeyBoundaries) {
          const { lower, upper, lastItemOrderKey } = options.orderKeyBoundaries;

          if (lastItemOrderKey !== undefined) {
            // We have the last item in the segment: place new item after it
            if (upper !== undefined) {
              // Both last item and upper bound exist: place between them
              // Use smaller increment to place closer to last item but before upper bound
              const spacing = Math.max(
                1,
                Math.min(1000, (upper - lastItemOrderKey) / 2)
              );
              orderKey = lastItemOrderKey + spacing;
            } else {
              // Only last item exists (segment continues to end): place after it with standard spacing
              orderKey = lastItemOrderKey + 1000;
            }
          } else if (lower !== undefined && upper !== undefined) {
            // No items in segment yet, but we have bounds: place in the middle
            orderKey = (lower + upper) / 2;
          } else if (lower !== undefined) {
            // Only lower bound: place after it with spacing
            orderKey = lower + 1000;
          } else if (upper !== undefined) {
            // Only upper bound: place before it with spacing
            orderKey = Math.max(1, upper - 1000);
          } else {
            // No bounds: fallback to rowIndex
            orderKey =
              options?.rowIndex !== undefined
                ? options.rowIndex * 1000.0
                : undefined;
          }
        } else {
          // No boundaries: use rowIndex * 1000.0
          orderKey =
            options?.rowIndex !== undefined
              ? options.rowIndex * 1000.0
              : undefined;
        }
      } else if (rowData.isEdited) {
        // For updated measurements, preserve existing orderKey unless boundaries require adjustment
        if (options?.orderKeyBoundaries && rowData.orderKey !== undefined) {
          const { lower, upper } = options.orderKeyBoundaries;
          let currentOrderKey = rowData.orderKey;

          // Ensure orderKey stays within boundaries if they exist
          if (lower !== undefined && currentOrderKey < lower) {
            // OrderKey is below lower bound, adjust to be just after lower bound
            currentOrderKey = lower + 1000;
          }
          if (upper !== undefined && currentOrderKey > upper) {
            // OrderKey is above upper bound, adjust to be just before upper bound
            currentOrderKey = Math.max(
              lower !== undefined ? lower + 1 : 1,
              upper - 1000
            );
          }

          orderKey = currentOrderKey;
        } else {
          // Preserve existing orderKey or use undefined to let backend handle it
          orderKey = rowData.orderKey;
        }
      } else {
        // For existing measurements that aren't edited: preserve orderKey
        orderKey = rowData.orderKey;
      }

      const payload = buildPayload(rowData, { orderKey });

      try {
        let item;
        if (rowData.isNew) {
          item = await createMutation.mutateAsync(payload);
        } else if (rowData.isEdited) {
          item = await updateMutation.mutateAsync({
            ...payload,
            hashId: rowData.id,
          });
        }

        if (!options?.suppressToast) {
          toast.success('Item saved successfully!');
        }
        setSaveErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[rowData.id];
          return newErrors;
        });
        if (item?.data) {
          meta.updateRow?.(String(rowData.id), {
            ...item?.data,
            id: item?.data?.hashId || item?.data?.hashid || rowData.id,
            date: item?.data?.createdOn
              ? new Date(item?.data?.createdOn).toLocaleDateString()
              : new Date().toLocaleDateString(),
            checked: item?.data?.checked?.toString() || rowData.checked,
            verified: item?.data?.verified?.toString() || rowData.verified,
          });
        }

        // If description contains #segment_name (old or new), refetch project items
        // Check both original and new description to handle cases where segment is added or removed
        const originalDescription = rowData._original?.description || '';
        const newDescription = rowData.description || '';
        const hadSegmentName = hasSegmentName(originalDescription);
        const hasSegmentNameNow = hasSegmentName(newDescription);

        invalidateQueries(hadSegmentName || hasSegmentNameNow);

        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unknown error occurred while saving.';
        if (!options?.suppressToast) {
          toast.error(`Failed to save item: ${errorMessage}`);
        }
        setSaveErrors((prev) => ({ ...prev, [rowData.id]: errorMessage }));
        return { success: false, error: errorMessage };
      } finally {
        meta.stopLoading?.(rowData.id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      createMutation,
      updateMutation,
      type,
      hasSegmentName,
      buildPayload,
      invalidateQueries,
    ]
  );

  const handleDelete = useCallback(
    async (
      rowData: ItemMeasurmentRowData,
      meta: TableMeta<ItemMeasurmentRowData>
    ): Promise<void> => {
      if (!meta.deleteRow) return;

      if (rowData.isNew) {
        // If the row is new and not saved, just delete it from the local state
        meta.deleteRow?.(String(rowData.id));
        toast.info('Item removed.');
      } else {
        const hadSegmentName = hasSegmentName(rowData.description || '');
        meta.startLoading?.(rowData.id);
        try {
          // If the row exists on the server, call the delete mutation
          await deleteMutation.mutateAsync(rowData.id);
          toast.success('Item deleted successfully!');
          meta.deleteRow?.(String(rowData.id));

          invalidateQueries(hadSegmentName);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'An unknown error occurred while deleting the item.';
          toast.error(`Failed to delete item: ${errorMessage}`);
        } finally {
          meta.stopLoading?.(rowData.id);
        }
      }
    },
    [deleteMutation, hasSegmentName, invalidateQueries]
  );

  const handleBulkDelete = useCallback(
    async (
      rowDataArray: ItemMeasurmentRowData[],
      meta: TableMeta<ItemMeasurmentRowData>
    ): Promise<void> => {
      if (!meta.deleteRow || rowDataArray.length === 0) return;

      const newRows = rowDataArray.filter((row) => row.isNew);
      const existingRows = rowDataArray.filter((row) => !row.isNew);

      // Delete new rows immediately from local state
      newRows.forEach((row) => {
        meta.deleteRow?.(String(row.id));
      });

      // Delete existing rows from server
      if (existingRows.length > 0) {
        // Check if any deleted row had #segment_name
        const hadAnySegmentName = existingRows.some((row) =>
          hasSegmentName(row.description || '')
        );

        // Start loading for all rows
        existingRows.forEach((row) => {
          meta.startLoading?.(row.id);
        });

        const results = await Promise.allSettled(
          existingRows.map((row) => deleteMutation.mutateAsync(row.id))
        );

        const successCount = results.filter(
          (result) => result.status === 'fulfilled'
        ).length;
        const failureCount = results.filter(
          (result) => result.status === 'rejected'
        ).length;

        // Remove successfully deleted rows from table
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            meta.deleteRow?.(String(existingRows[index].id));
          }
        });

        // Invalidate queries if any deletion succeeded
        if (successCount > 0) {
          invalidateQueries(hadAnySegmentName);
        }

        // Show summary toast combining new rows and existing rows
        const totalDeleted = newRows.length + successCount;
        if (failureCount === 0) {
          // All succeeded
          toast.success(`${totalDeleted} item(s) deleted successfully!`);
        } else {
          // Some failed
          toast.error(
            `Deleted ${totalDeleted} item(s), ${failureCount} failed.`,
            {
              description:
                failureCount > 0
                  ? 'Some items could not be deleted. Please try again.'
                  : undefined,
            }
          );
        }

        // Stop loading for all rows
        existingRows.forEach((row) => {
          meta.stopLoading?.(row.id);
        });

        // If all failed, throw an error
        if (failureCount === existingRows.length) {
          throw new Error('All deletions failed');
        }
      } else if (newRows.length > 0) {
        // Only new rows were deleted
        toast.success(`${newRows.length} item(s) removed.`);
      }
    },
    [deleteMutation, hasSegmentName, invalidateQueries]
  );

  /**
   * Handle reordering a row by updating its orderKey
   * Calculates new orderKey based on surrounding items and respects boundaries
   */
  const handleReorder = useCallback(
    async (
      rowData: ItemMeasurmentRowData,
      newOrderKey: number,
      options?: {
        orderKeyBoundaries?: {
          lower?: number;
          upper?: number;
          lastItemOrderKey?: number;
        };
      }
    ): Promise<{ success: boolean; error?: string }> => {
      // Skip if row is new (not saved yet)
      if (rowData.isNew) {
        return { success: false, error: 'Cannot reorder unsaved rows' };
      }

      // Ensure newOrderKey respects boundaries if provided
      let constrainedOrderKey = newOrderKey;
      if (options?.orderKeyBoundaries) {
        const { lower, upper } = options.orderKeyBoundaries;

        if (lower !== undefined && constrainedOrderKey < lower) {
          // OrderKey is below lower bound, adjust to be just after lower bound
          constrainedOrderKey = lower + 1000;
        }
        if (upper !== undefined && constrainedOrderKey > upper) {
          // OrderKey is above upper bound, adjust to be just before upper bound
          constrainedOrderKey = Math.max(
            lower !== undefined ? lower + 1 : 1,
            upper - 1000
          );
        }
      }

      const payload = {
        ...buildPayload(rowData, { orderKey: constrainedOrderKey }),
        hashId: rowData.id,
      };

      try {
        await updateMutation.mutateAsync(payload);
        invalidateQueries();
        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unknown error occurred while reordering.';
        toast.error(`Failed to reorder item: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    },
    [updateMutation, buildPayload, invalidateQueries]
  );

  return {
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleReorder,
    saveErrors,
  };
}
