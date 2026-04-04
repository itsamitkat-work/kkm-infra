import React, { useState, useMemo, useCallback } from 'react';
import { z, ZodTypeAny } from 'zod';
import { ExtendedColumnDef } from '@/components/tables/sheet-table/utils';

export type RowFocusTarget = number;

export type RowData<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
  // Add any additional properties here.
  subRows?: RowData<T>[]; // Add subRows for nested rows
  id: string; // Ensure id is always present
  isEdited?: boolean; // Ensure isEdited is always present
  isNew?: boolean; // Track whether the row was newly created
  isDuplicated?: boolean; // Track whether the row was duplicated
  focusIndex?: RowFocusTarget;
};

export const useEditSheetTable = <T extends { id: string }>(
  columns: ExtendedColumnDef<T>[],
  initialData: RowData<T>[],
  rowDataZodSchema?: ZodTypeAny
) => {
  const [data, setData] = useState<RowData<T>[]>([]);
  const columnKeys = useMemo(
    () =>
      columns
        .map((col) => col.accessorKey as string)
        .filter((key) => key && !['isEdited', '_original'].includes(key)),
    [columns]
  );

  const isRowEdited = useCallback(
    (row: RowData<T>): boolean => {
      const original = (row as RowData<T> & { _original: T })._original;
      if (!original) return false;

      return columnKeys.some((key) => {
        const currentValue = (row as Record<string, unknown>)[key];
        const originalValue = (original as Record<string, unknown>)[key];

        const colDef = columns.find((col) => col.accessorKey === key);
        const isNumeric = colDef?.isNumeric;

        if (isNumeric) {
          return (
            parseFloat(String(currentValue ?? '')) !==
            parseFloat(String(originalValue ?? ''))
          );
        }
        return String(currentValue ?? '') !== String(originalValue ?? '');
      });
    },
    [columnKeys, columns]
  );

  React.useEffect(() => {
    const dataWithOriginal = initialData.map((row) => ({
      ...row,
      _original: { ...row },
    }));
    setData(dataWithOriginal);
  }, [initialData]);

  // Calculate edited rows count
  const editedRowsCount = React.useMemo(() => {
    return data.filter((row) => row.isEdited).length;
  }, [data]);

  /**
   * Handle delete action for a row
   */
  const deleteRow = React.useCallback(
    (rowId: string) => {
      setData((prevData) => prevData.filter((row) => String(row.id) !== rowId));
      console.log(`Row deleted: ${rowId}`);
    },
    [setData]
  );

  /**
   * Handle adding a new row
   */
  const addRow = React.useCallback(
    (
      newRow: T,
      insertAtIndex?: number,
      options?: { original?: T | null; focusIndex?: RowFocusTarget }
    ) => {
      setData((prevData) => {
        const rowData = newRow as RowData<T>;
        const rowWithOriginal: RowData<T> = {
          ...rowData,
          focusIndex: options?.focusIndex,
          _original:
            options && options.original !== undefined
              ? (options.original as RowData<T>)
              : ({ ...rowData } as RowData<T>),
        };

        if (
          insertAtIndex !== undefined &&
          insertAtIndex >= 0 &&
          insertAtIndex < prevData.length
        ) {
          // Insert at specific index
          const newData = [...prevData];
          newData.splice(insertAtIndex + 1, 0, rowWithOriginal as RowData<T>);

          return newData;
        } else {
          // Add at the end
          return [...prevData, rowWithOriginal as RowData<T>];
        }
      });
    },
    [setData]
  );

  /**
   * Handle update action for a row
   */
  const updateRow = React.useCallback(
    (rowId: string, rowData: Partial<T>) => {
      setData((prevData) =>
        prevData.map((r) => {
          if (String(r.id) !== rowId) {
            return r;
          }

          const updatedRow = { ...r, ...rowData };

          return {
            ...updatedRow,
            _original: { ...updatedRow },
            isEdited: false,
            isNew: false,
          };
        })
      );
    },
    [setData]
  );

  /**
   * Handle cancel action for a row - restore to original values
   */
  const cancelUpdate = React.useCallback(
    (rowId: string, onClearErrors?: (rowId: string) => void) => {
      setData((prevData) =>
        prevData.map((row) => {
          if (String(row.id) === rowId) {
            const original = (row as RowData<T> & { _original: T })._original;
            if (original) {
              // Restore all values from _original, keeping _original itself and ensuring id is present
              return {
                ...original,
                id: row.id,
                _original: original,
                isEdited: false,
              } as RowData<T>;
            }
          }
          return row;
        })
      );

      // Clear error states for this row
      if (onClearErrors) {
        onClearErrors(rowId);
      }

      console.log(`Row changes cancelled: ${rowId}`);
    },
    [setData]
  );

  /**
   * onEdit callback: updates local state if the new value is valid.
   * SheetTable handles the isEdited state and computed columns automatically
   */
  const editCell = (
    rowId: string,
    columnId: string,
    value: unknown // New value for the cell
  ) => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.id) === rowId) {
          const updatedRow: RowData<T> = {
            ...row,
            [columnId]: value,
          };

          const colDef = columns.find(
            (col) =>
              (col.accessorKey as string) === columnId || col.id === columnId
          );

          if (colDef && typeof colDef.onChangeUpdateRow === 'function') {
            const patch = colDef.onChangeUpdateRow({
              newValue: value,
              prevRow: row,
              draftRow: updatedRow as T,
            });
            if (patch && typeof patch === 'object') {
              Object.assign(updatedRow, patch);
            }
          }

          // Re-calculate computed columns
          columns.forEach((col) => {
            if (col.computeValue && col.accessorKey) {
              (updatedRow as Record<string, unknown>)[col.accessorKey] =
                col.computeValue(updatedRow as T);
            }
          });

          // Check if the row is edited after all updates
          const isEdited = isRowEdited(updatedRow as RowData<T>);

          return { ...updatedRow, isEdited };
        }
        return row;
      })
    );

    console.log(
      `State updated [row id=${rowId}, column=${String(
        columnId
      )}, value=${value}]`,
      value
    );
  };

  /**
   * Bulk save all edited rows.
   * Validates and saves only the rows that have been edited.
   */
  const bulkSave = React.useCallback(() => {
    const editedRows = data.filter((row) => row.isEdited);

    if (editedRows.length === 0) {
      console.log('No edited rows to save');
      return;
    }

    // Validate only edited rows if schema is provided
    if (rowDataZodSchema) {
      const arraySchema = z.array(rowDataZodSchema);
      const result = arraySchema.safeParse(editedRows);

      if (!result.success) {
        console.error('Edited rows validation failed:', result.error.issues);
        return;
      }
    }

    // Here you would typically make API calls to save each edited row
    console.log(`Saving ${editedRows.length} edited rows:`, editedRows);

    // After successful save, update the _original property and reset isEdited
    setData((prevData) =>
      prevData.map((row) => {
        if (row.isEdited) {
          const nextRow = {
            ...row,
            _original: { ...row },
            isEdited: false,
            isNew: false,
          };
          return nextRow;
        }
        return row;
      })
    );

    console.log(`Successfully saved ${editedRows.length} rows`);
  }, [data, rowDataZodSchema]);

  /**
   * Discard all changes and revert edited rows to their original values.
   */
  const discardAll = React.useCallback(() => {
    const editedRows = data.filter((row) => row.isEdited);

    if (editedRows.length === 0) {
      console.log('No edited rows to discard');
      return;
    }

    // Revert all edited rows to their original values
    setData((prevData) =>
      prevData.map((row) => {
        if (row.isEdited) {
          const original = (row as RowData<T> & { _original: T })._original;
          if (original) {
            // Restore all values from _original, keeping _original itself and ensuring id is present
            return {
              ...original,
              id: row.id,
              _original: original,
              isEdited: false,
            } as RowData<T>;
          }
        }
        return row;
      })
    );

    console.log(`Successfully discarded changes for ${editedRows.length} rows`);
  }, [data]);

  /**
   * Reorder rows by moving an item from one index to another
   */
  const reorderRows = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      setData((prevData) => {
        const newData = [...prevData];
        const [movedItem] = newData.splice(fromIndex, 1);
        newData.splice(toIndex, 0, movedItem);
        return newData;
      });
    },
    [setData]
  );

  return {
    data,
    editedRowsCount,
    deleteRow,
    addRow,
    updateRow,
    cancelUpdate,
    editCell,
    bulkSave,
    discardAll,
    reorderRows,
  };
};
