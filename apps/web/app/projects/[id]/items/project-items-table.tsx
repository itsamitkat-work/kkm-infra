'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  flexRender,
  type CellContext,
  type Row,
  type Table as TanStackTable,
} from '@tanstack/react-table';
import { useStore } from 'zustand';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FunctionSquare, GripVertical, Plus, Trash2, X } from 'lucide-react';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Field } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { SearchInput } from '@/components/ui/search-input';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import type { ZodTypeAny } from 'zod';
import { useProjectItemsQuery } from '@/app/(app)/projects/hooks/use-project-items-query';
import { ProjectItemsExportButtons } from './components/export-buttons';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { ActionsDropdown, ActionItem } from '@/components/ui/actions-dropdown';
import { SaveButton } from '@/components/ui/save-button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { FullscreenWrapper } from '@/components/fullscreen-wrapper';
import {
  MasterItemEditorConfig,
  type MasterItemEditorConfigType,
} from './MasterItemEditorConfig';
import type { ScheduleItemPickerOption } from '@/app/(app)/schedule-items/schedule-item-picker-option';
import {
  getSelectedSchedulePick,
  migrateSchedulePickSelection,
} from './use-schedule-pick-selection';
import { buildPatchFromSchedulePick } from '../utils';
import { TableErrorState } from '@/components/tables/table-error';
import {
  useDeleteConfirmation,
  type DeleteConfirmationData,
} from '@/hooks/use-delete-confirmation';
import {
  useCreateProjectItem,
  useDeleteProjectItem,
  useUpdateProjectItem,
} from '@/hooks/projects/use-project-items-mutations';
import { buildDirtyProjectBoqLineUpdateInput } from '@/lib/projects/project-boq-repo';
import { midpointOrderKey, ORDER_KEY_STEP } from '@/lib/projects/order-key';
import { cn, getPlatformSpecificKbd, parseNumber } from '@/lib/utils';
import { ProjectItemRowType, projectItemZodSchema } from '@/types/project-item';
import type { ItemDescriptionDoc } from '@/app/(app)/schedule-items/item-description-doc';
import {
  emptyItemDescriptionDoc,
  flattenItemDescription,
  itemDescriptionFromPlainText,
} from '@/app/(app)/schedule-items/item-description-doc';
import {
  HIERARCHY_BODY_CLASS,
  ItemDescriptionHierarchy,
} from '@/app/(app)/schedule-items/item-description-hierarchy';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import {
  createProjectItemsTableStore,
  useProjectItemsTable,
  PROJECT_ITEMS_ACTIONS_COLUMN_ID,
  PROJECT_ITEMS_REORDER_COLUMN_ID,
  type ExtendedColumnDef,
  type ItemsTableStore,
  type ProjectItemsTableApi,
} from './use-project-items-table';

function createMasterItemOnChangeUpdateRow() {
  return ({ draftRow }: { draftRow: ProjectItemRowType }) => {
    const rowId = String(draftRow.id);
    const selectedPick = getSelectedSchedulePick(rowId);
    if (!selectedPick) {
      return;
    }
    return buildPatchFromSchedulePick(selectedPick);
  };
}

const masterItemOnChangeUpdateRow = createMasterItemOnChangeUpdateRow();

const codeColumnConfig: MasterItemEditorConfigType = {
  placeholder: 'Code',
  searchPlaceholder: 'Search by code',
  searchField: 'code',
  getOptionLabel: (option: ScheduleItemPickerOption) => option.code,
  renderSelectedValue: (option, placeholder, rowValue) =>
    option?.code || String(rowValue ?? '') || placeholder,
  getOnChangeValue: (option: ScheduleItemPickerOption | null) =>
    option?.code ?? '',
  getRowValue: (row) => row.item_code ?? '',
  triggerClassName: 'justify-center gap-1 px-1',
  labelClassName: cn(
    'max-w-[min(100%,5.5rem)] flex-none truncate text-center tabular-nums',
    HIERARCHY_BODY_CLASS
  ),
};

const nameColumnConfig: MasterItemEditorConfigType = {
  placeholder: 'Item',
  searchPlaceholder: 'Search by name',
  searchField: 'name',
  renderSelectedValue: (
    option: ScheduleItemPickerOption | null,
    placeholder: string,
    rowValue?: unknown
  ) => {
    const doc =
      option?.itemDescriptionDoc ??
      (rowValue != null && typeof rowValue === 'object'
        ? (rowValue as ItemDescriptionDoc)
        : itemDescriptionFromPlainText(String(rowValue ?? '')));
    if (flattenItemDescription(doc).trim() === '') {
      return placeholder;
    }
    return <ItemDescriptionHierarchy doc={doc} />;
  },
  getOnChangeValue: (option: ScheduleItemPickerOption | null) =>
    option?.itemDescriptionDoc ??
    itemDescriptionFromPlainText(option?.name ?? ''),
  getOptionLabel: (option: ScheduleItemPickerOption) => option.name,
  getRowValue: (row) => row.item_description,
  triggerClassName: 'items-start py-1.5',
  labelClassName: cn(
    'min-w-0 flex-1 whitespace-normal break-words text-left text-foreground',
    HIERARCHY_BODY_CLASS
  ),
};

function columnIdFromCell(cell: { column: { id: string } }): string {
  return cell.column.id;
}

const PROJECT_ITEMS_SELECT_COL_WIDTH_PCT = 3;
const PROJECT_ITEMS_REORDER_COL_WIDTH_PCT = 3.5;
const PROJECT_ITEMS_INDEX_COL_WIDTH_PCT = 4;
const PROJECT_ITEMS_ITEM_NAME_COL_WIDTH_PCT = 26;
/**
 * Equal-width data columns (WO, Code, Reference Schedule, Schedule, Qty+unit, Rate, Total, Remark, Actions).
 * Select, reorder/#, and Item Name use fixed % widths.
 */
const PROJECT_ITEMS_EQUAL_COL_COUNT = 9;
const PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT =
  (100 -
    PROJECT_ITEMS_SELECT_COL_WIDTH_PCT -
    PROJECT_ITEMS_REORDER_COL_WIDTH_PCT -
    PROJECT_ITEMS_INDEX_COL_WIDTH_PCT -
    PROJECT_ITEMS_ITEM_NAME_COL_WIDTH_PCT) /
  PROJECT_ITEMS_EQUAL_COL_COUNT;

function stitchVisibleOrderIntoFullOrder(
  fullIdsBefore: string[],
  visibleIds: string[],
  visibleIdsNew: string[]
): string[] {
  const visibleSet = new Set(visibleIds);
  let v = 0;
  return fullIdsBefore.map((id) => {
    if (visibleSet.has(id)) {
      const nextId = visibleIdsNew[v];
      v += 1;
      return nextId ?? id;
    }
    return id;
  });
}

function computeOrderKeyForMovedRow(
  orderedRows: ProjectItemRowType[],
  movedId: string
): number {
  const idx = orderedRows.findIndex((r) => String(r.id) === movedId);
  if (idx === -1) {
    return ORDER_KEY_STEP;
  }

  let prevKey: number | null = null;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const r = orderedRows[i];
    if (
      !r.is_new &&
      r.order_key != null &&
      typeof r.order_key === 'number' &&
      !Number.isNaN(r.order_key)
    ) {
      prevKey = r.order_key;
      break;
    }
  }

  let nextKey: number | null = null;
  for (let i = idx + 1; i < orderedRows.length; i += 1) {
    const r = orderedRows[i];
    if (
      !r.is_new &&
      r.order_key != null &&
      typeof r.order_key === 'number' &&
      !Number.isNaN(r.order_key)
    ) {
      nextKey = r.order_key;
      break;
    }
  }

  if (prevKey === null && nextKey === null) {
    return ORDER_KEY_STEP;
  }
  if (prevKey === null) {
    return nextKey! - ORDER_KEY_STEP;
  }
  if (nextKey === null) {
    return prevKey + ORDER_KEY_STEP;
  }
  if (prevKey >= nextKey) {
    return prevKey + ORDER_KEY_STEP;
  }
  return midpointOrderKey(prevKey, nextKey);
}

type ProjectItemsRowSortableContextValue = {
  listeners: ReturnType<typeof useSortable>['listeners'];
  attributes: ReturnType<typeof useSortable>['attributes'];
  isDragDisabled: boolean;
};

const ProjectItemsRowSortableContext =
  React.createContext<ProjectItemsRowSortableContextValue | null>(null);

function useProjectItemsRowSortableContext(): ProjectItemsRowSortableContextValue | null {
  return React.useContext(ProjectItemsRowSortableContext);
}

function ProjectItemsReorderGrab({ row }: { row: ProjectItemRowType }) {
  const ctx = useProjectItemsRowSortableContext();
  if (!ctx) {
    return null;
  }
  const { listeners, attributes, isDragDisabled } = ctx;
  return (
    <button
      type='button'
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground touch-none',
        isDragDisabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-grab active:cursor-grabbing hover:bg-muted/60'
      )}
      aria-label={
        isDragDisabled ? 'Save row to enable reorder' : 'Drag to reorder'
      }
      disabled={isDragDisabled}
      {...(isDragDisabled ? {} : listeners)}
      {...(isDragDisabled ? {} : attributes)}
    >
      <GripVertical className='size-4 shrink-0' aria-hidden />
    </button>
  );
}

function projectItemsColumnLayoutStyle(
  colDef: ExtendedColumnDef<ProjectItemRowType>
): React.CSSProperties {
  const base = colDef.style ? { ...colDef.style } : {};
  if (colDef.tableWidthPercent != null) {
    return {
      ...base,
      width: `${colDef.tableWidthPercent}%`,
      boxSizing: 'border-box',
    };
  }
  const out: React.CSSProperties = { ...base };
  if (colDef.minSize) {
    out.minWidth = `${colDef.minSize}px`;
  }
  if (colDef.maxSize) {
    out.maxWidth = `${colDef.maxSize}px`;
  }
  return out;
}

function parseFieldValue(
  columnId: string,
  rawValue: unknown,
  schema: ZodTypeAny | undefined
): { parsedValue: unknown; errorMessage: string | null } {
  if (!schema) {
    return { parsedValue: rawValue, errorMessage: null };
  }

  let parsedValue: unknown = rawValue;
  let errorMessage: string | null = null;

  const schemaType = (schema as { _def?: { typeName?: string } })?._def
    ?.typeName;
  if (schemaType === 'ZodNumber') {
    if (rawValue === null || rawValue === undefined) {
      parsedValue = undefined;
    } else if (typeof rawValue === 'number') {
      parsedValue = rawValue;
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed === '') {
        parsedValue = undefined;
      } else {
        const maybeNum = parseFloat(trimmed);
        parsedValue = Number.isNaN(maybeNum) ? rawValue : maybeNum;
      }
    } else {
      const maybeNum = Number(rawValue);
      parsedValue = Number.isNaN(maybeNum) ? rawValue : maybeNum;
    }
  } else if (typeof rawValue === 'string') {
    parsedValue = rawValue;
  }

  const result = schema.safeParse(parsedValue);
  if (!result.success) {
    errorMessage = result.error.issues[0]?.message ?? 'Invalid value';
  } else {
    parsedValue = result.data;
  }

  return { parsedValue, errorMessage };
}

function isRowDisabled(
  rows: number[] | Record<string, number[]> | undefined,
  groupKey: string,
  rowIndex: number
): boolean {
  if (!rows) {
    return false;
  }
  if (Array.isArray(rows)) {
    return rows.includes(rowIndex);
  }
  return rows[groupKey]?.includes(rowIndex) ?? false;
}

const NUMERIC_COMPARE_IDS = new Set([
  'contract_quantity',
  'rate_amount',
  'total',
]);

/** Columns whose body uses text/combobox editors — outline the `TableCell`, not inner controls. */
const PROJECT_ITEMS_EDITOR_CELL_IDS = new Set([
  'work_order_number',
  'item_code',
  'item_description',
  'contract_quantity',
  'rate_amount',
  'remark',
]);

function ProjectItemsQuantityWithUnitCell({
  cellContext,
}: {
  cellContext: CellContext<ProjectItemRowType, unknown>;
}) {
  const { row, column, getValue } = cellContext;
  const tableCtx = useProjectItemsTableCellsContext();
  const colDef = column.columnDef as ExtendedColumnDef<ProjectItemRowType>;
  const columnId = column.id;
  const disabled = isProjectItemsColumnDisabled(row, columnId, tableCtx);
  const displayValue = projectItemsDisplayString(getValue());
  const [local, setLocal] = React.useState(displayValue);

  useEffect(() => {
    setLocal(displayValue);
  }, [displayValue]);

  const debouncedCommit = useDebouncedCallback((next: string) => {
    if (!disabled) {
      tableCtx.commitCell(row.original, colDef, next);
    }
  }, 300);

  const unitRaw = String(row.original.unit_display ?? '').trim();
  const unitLabel = unitRaw.length > 0 ? unitRaw : '—';

  if (disabled) {
    return (
      <div className='flex min-h-8 w-full min-w-0 items-center justify-end gap-2 px-0'>
        <span className={cn('text-end tabular-nums', HIERARCHY_BODY_CLASS)}>
          {String(row.original.contract_quantity ?? '')}
        </span>
        <span
          className='max-w-[4.5rem] shrink-0 truncate text-end text-xs font-medium tabular-nums text-muted-foreground'
          title={unitRaw || undefined}
        >
          {unitLabel}
        </span>
      </div>
    );
  }

  return (
    <div className='flex h-auto w-full min-w-0 items-stretch'>
      <Field className='w-full min-w-0 gap-0'>
        <InputGroup
          variant='ghost'
          className='w-full rounded-none has-[>[data-align=inline-end]]:[&>input]:!pr-0'
        >
          <InputGroupInput
            value={local}
            disabled={disabled}
            placeholder='Qty'
            aria-label='Contract quantity'
            onChange={(e) => {
              const next = e.target.value;
              setLocal(next);
              debouncedCommit(next);
            }}
            className={cn(
              '!m-0 !h-auto min-h-0 w-full !rounded-none !border-0 !px-1 !py-0 text-end tabular-nums !shadow-none !ring-0 focus-visible:!border-transparent focus-visible:!outline-none focus-visible:!ring-0',
              HIERARCHY_BODY_CLASS
            )}
          />
          <InputGroupAddon
            align='inline-end'
            className='h-auto max-w-[4.5rem] shrink-0 self-stretch border-l border-border/20 !px-1 !py-0 dark:border-border/25'
          >
            <InputGroupText
              className='truncate text-xs font-medium tabular-nums text-muted-foreground'
              title={unitRaw || undefined}
            >
              {unitLabel}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </div>
  );
}

function DebouncedTextCell({
  value,
  disabled,
  dense,
  autoFocus = false,
  placeholder,
  className,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  dense: boolean;
  autoFocus?: boolean;
  placeholder: string;
  className?: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = React.useState(value ?? '');

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  const debounced = useDebouncedCallback(onCommit, 300);

  const commit = (next: string) => {
    if (disabled) {
      return;
    }
    setLocal(next);
    debounced(next);
  };

  return (
    <input
      type='text'
      value={local}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={cn(
        'h-auto min-h-8 w-full border-none bg-transparent outline-none ring-0 !px-2 transition-colors',
        HIERARCHY_BODY_CLASS,
        'hover:bg-muted/30 focus:bg-transparent focus:outline-none focus-visible:ring-0',
        dense ? '!py-0' : '!py-1',
        className,
        disabled && 'cursor-not-allowed bg-transparent text-muted-foreground'
      )}
      onChange={(e) => {
        commit(e.target.value);
      }}
    />
  );
}

type CellErrorsMap = Record<
  string,
  Record<string, Record<string, string | null>>
>;

type ProjectItemsTableCellsContextValue = {
  groupKey: string;
  cellErrors: CellErrorsMap;
  disabledColumns: (rowData: ProjectItemRowType) => string[];
  commitCell: (
    rowData: ProjectItemRowType,
    colDef: ExtendedColumnDef<ProjectItemRowType>,
    raw: unknown
  ) => void;
  handleSaveRow: (
    rowData: ProjectItemRowType,
    tableApi: ProjectItemsTableApi,
    options?: { suppressToast?: boolean }
  ) => Promise<void>;
  handleDeleteRow: (
    rowData: ProjectItemRowType,
    tableApi: ProjectItemsTableApi
  ) => void;
  itemsTableApi: ProjectItemsTableApi;
  openDeleteConfirmation: (data: DeleteConfirmationData) => void;
  savingRowId: string | null;
  saveErrors: Record<string, string | null>;
  isSaving: boolean;
  dense: boolean;
};

const ProjectItemsTableCellsContext =
  React.createContext<ProjectItemsTableCellsContextValue | null>(null);

function useProjectItemsTableCellsContext(): ProjectItemsTableCellsContextValue {
  const v = React.useContext(ProjectItemsTableCellsContext);
  if (!v) {
    throw new Error('ProjectItemsTableCellsContext is required');
  }
  return v;
}

function isProjectItemsColumnDisabled(
  row: Row<ProjectItemRowType>,
  columnId: string,
  tableCtx: ProjectItemsTableCellsContextValue
): boolean {
  return (
    isRowDisabled([], tableCtx.groupKey, row.index) ||
    tableCtx.disabledColumns(row.original).includes(columnId)
  );
}

function projectItemsDisplayString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function getProjectItemsColumns(): ExtendedColumnDef<ProjectItemRowType>[] {
  return [
    {
      id: PROJECT_ITEMS_REORDER_COLUMN_ID,
      header: () => <div className='text-muted-foreground text-sm'>#</div>,
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const ctx = useProjectItemsRowSortableContext();
        if (!ctx) {
          return null;
        }
        const { listeners, attributes, isDragDisabled } = ctx;

        return (
          <div className='flex w-full items-center justify-center gap-1'>
            <Button
              variant='ghost'
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground touch-none',
                isDragDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-grab active:cursor-grabbing hover:bg-muted/60'
              )}
              aria-label={
                isDragDisabled
                  ? 'Save row to enable reorder'
                  : 'Drag to reorder'
              }
              disabled={isDragDisabled}
              {...(isDragDisabled ? {} : listeners)}
              {...(isDragDisabled ? {} : attributes)}
            >
              <GripVertical
                className='size-4 shrink-0 fill-muted-foreground'
                aria-hidden
              />
              {cellContext.row.index + 1}
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      tableWidthPercent: PROJECT_ITEMS_REORDER_COL_WIDTH_PCT,
    },
    {
      id: 'select',
      header: ({ table }) => {
        const allRows = table.getRowModel().rows;
        const selectableRows = allRows.filter((row) => {
          return row.getCanSelect?.() ?? true;
        });
        const selectedSelectableRows = selectableRows.filter((row) =>
          row.getIsSelected()
        );
        const isAllSelected =
          selectableRows.length > 0 &&
          selectedSelectableRows.length === selectableRows.length;
        const isSomeSelected =
          selectedSelectableRows.length > 0 &&
          selectedSelectableRows.length < selectableRows.length;

        return (
          <div className='flex min-h-8 w-full items-center justify-center px-0.5 py-0.5'>
            <Checkbox
              checked={
                isAllSelected ? true : isSomeSelected ? 'indeterminate' : false
              }
              onCheckedChange={(value) => {
                selectableRows.forEach((row) => {
                  if (value) {
                    row.toggleSelected(true);
                  } else {
                    row.toggleSelected(false);
                  }
                });
              }}
              aria-label='Select all'
              disabled={selectableRows.length === 0}
            />
          </div>
        );
      },
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row } = cellContext;
        const canSelect = row.getCanSelect?.() ?? true;
        return (
          <div className='flex min-h-8 w-full items-center justify-center px-0.5 py-0.5'>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                if (canSelect) {
                  row.toggleSelected(!!value);
                }
              }}
              aria-label='Select row'
              disabled={!canSelect}
            />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      tableWidthPercent: PROJECT_ITEMS_SELECT_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'work_order_number',
      header: () => (
        <div className='flex min-h-8 w-full items-center justify-center px-1 py-2 text-center text-xs font-medium leading-tight'>
          Work Order No.
        </div>
      ),
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row, column, getValue } = cellContext;
        const tableCtx = useProjectItemsTableCellsContext();
        const colDef =
          column.columnDef as ExtendedColumnDef<ProjectItemRowType>;
        const columnId = column.id;
        const disabled = isProjectItemsColumnDisabled(row, columnId, tableCtx);
        const displayValue = projectItemsDisplayString(getValue());
        if (disabled) {
          return (
            <div className='flex min-h-8 w-full min-w-0 items-center justify-center px-1'>
              <span
                className={cn(
                  'text-center tabular-nums whitespace-nowrap',
                  HIERARCHY_BODY_CLASS
                )}
              >
                {String(row.original.work_order_number ?? '')}
              </span>
            </div>
          );
        }
        return (
          <div className='flex min-h-8 w-full min-w-0 items-center justify-center px-1'>
            <DebouncedTextCell
              value={displayValue}
              disabled={disabled}
              dense={tableCtx.dense}
              placeholder='Work Order No.'
              className='text-center tabular-nums'
              onCommit={(v) => {
                tableCtx.commitCell(row.original, colDef, v);
              }}
            />
          </div>
        );
      },
      validationSchema: projectItemZodSchema.shape.work_order_number,
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'item_code',
      header: () => 'Code',
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row, column } = cellContext;
        const tableCtx = useProjectItemsTableCellsContext();
        const colDef =
          column.columnDef as ExtendedColumnDef<ProjectItemRowType>;
        const columnId = column.id;
        const disabled = isProjectItemsColumnDisabled(row, columnId, tableCtx);
        if (disabled) {
          return (
            <div className='flex min-h-8 w-full min-w-0 items-center justify-center px-1'>
              <span
                className={cn(
                  'text-center tabular-nums whitespace-nowrap',
                  HIERARCHY_BODY_CLASS
                )}
              >
                {String(row.original.item_code ?? '')}
              </span>
            </div>
          );
        }
        return (
          <div className='flex min-h-8 w-full min-w-0 items-center justify-center px-1'>
            <MasterItemEditorConfig
              row={row.original}
              onChange={(v) => {
                tableCtx.commitCell(row.original, colDef, v);
              }}
              config={codeColumnConfig}
            />
          </div>
        );
      },
      validationSchema: projectItemZodSchema.shape.item_code,
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
      onChangeUpdateRow: masterItemOnChangeUpdateRow,
    },
    {
      accessorKey: 'reference_schedule_text',
      header: 'Sub Code',
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        return (
          <span className={cn('px-2 text-center', HIERARCHY_BODY_CLASS)}>
            {String(cellContext.row.original.reference_schedule_text ?? '')}
          </span>
        );
      },
      validationSchema: projectItemZodSchema.shape.reference_schedule_text,
      className: 'text-center',
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'schedule_name',
      header: 'Schedule',
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        return (
          <div className='flex min-h-8 w-full min-w-0 items-center justify-center px-1'>
            <span
              className={cn(
                'text-center tabular-nums whitespace-nowrap',
                HIERARCHY_BODY_CLASS
              )}
            >
              {String(cellContext.row.original.schedule_name ?? '')}
            </span>
          </div>
        );
      },

      validationSchema: projectItemZodSchema.shape.schedule_name,
      className:
        'truncate bg-slate-100/80 text-center text-muted-foreground dark:bg-slate-900/50',
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'item_description',
      header: () => (
        <div className='flex min-h-8 w-full min-w-0 items-center justify-center truncate px-2 py-2 text-center text-xs font-medium leading-tight'>
          Item Name
        </div>
      ),
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row, column } = cellContext;
        const tableCtx = useProjectItemsTableCellsContext();
        const colDef =
          column.columnDef as ExtendedColumnDef<ProjectItemRowType>;
        const columnId = column.id;
        const disabled = isProjectItemsColumnDisabled(row, columnId, tableCtx);
        const doc = row.original.item_description;
        const flat = flattenItemDescription(doc);
        if (disabled) {
          return (
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'min-w-0 max-w-full cursor-help px-2 text-left',
                    HIERARCHY_BODY_CLASS
                  )}
                >
                  <span className='block whitespace-normal break-words'>
                    <ItemDescriptionHierarchy doc={doc} />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className={cn('max-w-xs', HIERARCHY_BODY_CLASS)}>{flat}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return (
          <div className='min-w-0 w-full max-w-full overflow-x-hidden'>
            <MasterItemEditorConfig
              row={row.original}
              onChange={(v) => {
                tableCtx.commitCell(row.original, colDef, v);
              }}
              config={nameColumnConfig}
            />
          </div>
        );
      },
      validationSchema: projectItemZodSchema.shape.item_description,
      className: 'min-w-0 overflow-x-hidden bg-muted/20 align-top',
      tableWidthPercent: PROJECT_ITEMS_ITEM_NAME_COL_WIDTH_PCT,
      onChangeUpdateRow: masterItemOnChangeUpdateRow,
    },
    {
      accessorKey: 'contract_quantity',
      header: () => (
        <div
          className='flex min-h-8 w-full items-center justify-end px-2 py-2 text-end text-xs font-medium tabular-nums'
          title='Quantity and unit of measure'
        >
          Quantity
        </div>
      ),
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        return <ProjectItemsQuantityWithUnitCell cellContext={cellContext} />;
      },
      validationSchema: projectItemZodSchema.shape.contract_quantity,
      className: 'text-start',
      isNumeric: true,
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'rate_amount',
      header: () => (
        <div className='flex min-h-8 w-full items-center justify-end px-2 py-2 text-end text-xs font-medium tabular-nums'>
          Rate
        </div>
      ),
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row, column, getValue } = cellContext;
        const tableCtx = useProjectItemsTableCellsContext();
        const colDef =
          column.columnDef as ExtendedColumnDef<ProjectItemRowType>;
        const columnId = column.id;
        const disabled = isProjectItemsColumnDisabled(row, columnId, tableCtx);
        const displayValue = projectItemsDisplayString(getValue());
        if (disabled) {
          return (
            <div className='flex min-h-8 w-full min-w-0 items-center justify-end px-2'>
              <span
                className={cn('text-end tabular-nums', HIERARCHY_BODY_CLASS)}
              >
                {String(row.original.rate_amount ?? '')}
              </span>
            </div>
          );
        }
        return (
          <div className='flex min-h-8 w-full min-w-0 items-center justify-end px-2'>
            <DebouncedTextCell
              value={displayValue}
              disabled={disabled}
              dense={tableCtx.dense}
              placeholder='rate'
              className='text-end tabular-nums'
              onCommit={(v) => {
                tableCtx.commitCell(row.original, colDef, v);
              }}
            />
          </div>
        );
      },
      validationSchema: projectItemZodSchema.shape.rate_amount,
      className: 'text-end',
      isNumeric: true,
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'total',
      header: () => (
        <div className='flex min-h-8 w-full items-center justify-end gap-1 px-2 py-2 text-end text-xs font-medium tabular-nums'>
          <span className='inline-flex' title='Quantity × rate'>
            <FunctionSquare
              className='size-3.5 shrink-0 text-muted-foreground'
              aria-hidden
            />
          </span>
          <span>Total</span>
        </div>
      ),
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row, getValue } = cellContext;
        const v = row.original.total ?? getValue();
        return (
          <div className='flex min-h-8 w-full min-w-0 items-center justify-end px-2'>
            <span
              className={cn(
                'text-end font-semibold tabular-nums',
                HIERARCHY_BODY_CLASS
              )}
            >
              {v === null || v === undefined ? '' : String(v)}
            </span>
          </div>
        );
      },
      validationSchema: projectItemZodSchema.shape.total,
      className: 'text-end dark:bg-emerald-950/25',
      isNumeric: true,
      computeValue: (row: ProjectItemRowType) => {
        const quantity = parseNumber(row.contract_quantity);
        const rate = parseNumber(row.rate_amount);
        if (isNaN(quantity) || isNaN(rate)) {
          return '0.00';
        }
        return (quantity * rate).toFixed(2);
      },
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      accessorKey: 'remark',
      header: 'Remark',
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const { row, column, getValue } = cellContext;
        const tableCtx = useProjectItemsTableCellsContext();
        const colDef =
          column.columnDef as ExtendedColumnDef<ProjectItemRowType>;
        const columnId = column.id;
        const disabled = isProjectItemsColumnDisabled(row, columnId, tableCtx);
        const displayValue = projectItemsDisplayString(getValue());
        if (disabled) {
          return (
            <span className={cn('px-2', HIERARCHY_BODY_CLASS)}>
              {String(row.original.remark ?? '')}
            </span>
          );
        }
        return (
          <DebouncedTextCell
            value={displayValue}
            disabled={disabled}
            dense={tableCtx.dense}
            placeholder='remark'
            className='text-center'
            onCommit={(v) => {
              tableCtx.commitCell(row.original, colDef, v);
            }}
          />
        );
      },
      validationSchema: projectItemZodSchema.shape.remark,
      className: 'text-center',
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
    {
      id: PROJECT_ITEMS_ACTIONS_COLUMN_ID,
      header: () => (
        <div className='flex min-h-8 w-full items-center justify-end px-2 py-2 text-end text-xs font-medium leading-tight'>
          Actions
        </div>
      ),
      cell: (cellContext: CellContext<ProjectItemRowType, unknown>) => {
        const tableCtx = useProjectItemsTableCellsContext();
        const rowData = cellContext.row.original;
        const isCurrentRowSaving = tableCtx.savingRowId === rowData.id;
        const isSaveDisabled =
          (!rowData.is_edited && !rowData.is_new) || tableCtx.isSaving;

        const actions: ActionItem[] = [
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            onClick: () =>
              tableCtx.openDeleteConfirmation({
                onConfirm: () =>
                  tableCtx.handleDeleteRow(rowData, tableCtx.itemsTableApi),
                itemName: 'project item',
              }),
            variant: 'destructive',
          },
        ];

        if (!rowData.is_new) {
          actions.unshift({
            id: 'discard',
            label: 'Discard Changes',
            icon: X,
            onClick: () =>
              tableCtx.itemsTableApi.cancelUpdate(String(rowData.id)),
            disabled: !rowData.is_edited,
          });
        }

        return (
          <div className='flex min-h-8 w-full min-w-0 items-center justify-end gap-1 px-2'>
            <SaveButton
              onClick={() => {
                void tableCtx.handleSaveRow(rowData, tableCtx.itemsTableApi);
              }}
              disabled={isSaveDisabled}
              isLoading={isCurrentRowSaving}
              errorMessage={tableCtx.saveErrors[rowData.id] ?? null}
              isNew={rowData.is_new}
              isEdited={rowData.is_edited}
            />
            <ActionsDropdown actions={actions} />
          </div>
        );
      },
      className: 'text-end',
      tableWidthPercent: PROJECT_ITEMS_EQUAL_COL_WIDTH_PCT,
    },
  ];
}

function ProjectItemsTableRowView({ row }: { row: Row<ProjectItemRowType> }) {
  const tableCtx = useProjectItemsTableCellsContext();
  const groupKey = tableCtx.groupKey;
  const cellErrors = tableCtx.cellErrors;
  const rowId = row.id;
  const rowIndex = row.index;
  const rowData = row.original;
  const visibleCells = row.getVisibleCells();

  const rowBulkDisabled = isRowDisabled(undefined, groupKey, rowIndex);
  const disabledColumnsForRow = tableCtx.disabledColumns(rowData);

  const isDragDisabled = !!rowData.is_new;
  const sortable = useSortable({
    id: row.id,
    disabled: isDragDisabled,
  });

  const sortableRowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    ...(sortable.isDragging ? { opacity: 0.88, zIndex: 2 } : {}),
  };

  const sortableCtxValue = React.useMemo(
    () => ({
      listeners: sortable.listeners,
      attributes: sortable.attributes,
      isDragDisabled,
    }),
    [sortable.listeners, sortable.attributes, isDragDisabled]
  );

  return (
    <ProjectItemsRowSortableContext.Provider value={sortableCtxValue}>
      <TableRow
        ref={sortable.setNodeRef}
        style={sortableRowStyle}
        data-row-id={rowId}
        className={cn(
          'relative border-none !h-auto',
          rowBulkDisabled
            ? 'bg-muted/50'
            : 'bg-background hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
        )}
      >
        {visibleCells.map((cell, cellIndex) => {
          const columnId = columnIdFromCell(cell);
          const colDef = cell.column
            .columnDef as ExtendedColumnDef<ProjectItemRowType>;
          const isDisabled =
            rowBulkDisabled || disabledColumnsForRow.includes(columnId);
          const errorMsg = cellErrors[groupKey]?.[rowId]?.[columnId] || null;
          const isSelectColumn = columnId === 'select';
          const isLastVisibleCell = cellIndex === visibleCells.length - 1;

          const currentValue = cell.getValue();
          let isDirty = false;
          let originalValueForTooltip = '';

          if (rowData._original && columnId) {
            const originalCellValue = (
              rowData._original as Record<string, unknown>
            )[columnId];
            originalValueForTooltip = String(originalCellValue ?? '');

            const numericCompare = NUMERIC_COMPARE_IDS.has(columnId);
            if (numericCompare) {
              const currentNum = parseFloat(String(currentValue ?? ''));
              const originalNum = parseFloat(String(originalCellValue ?? ''));
              isDirty = currentNum !== originalNum;
            } else {
              isDirty = String(currentValue ?? '') !== originalValueForTooltip;
            }
          }

          const style = projectItemsColumnLayoutStyle(colDef);

          const inner =
            colDef.cell != null
              ? flexRender(colDef.cell, cell.getContext())
              : null;

          const rawCellClass = colDef?.className as
            | string
            | ((row: ProjectItemRowType) => string)
            | undefined;
          const resolvedClass =
            typeof rawCellClass === 'function'
              ? rawCellClass(rowData)
              : rawCellClass;

          const frameEditorCell =
            !isDisabled && PROJECT_ITEMS_EDITOR_CELL_IDS.has(columnId);

          const showFocusWithinStyle =
            frameEditorCell && columnId !== 'contract_quantity';

          const isNewRowPlainCell = rowData.is_new && !isDisabled && !errorMsg;

          return (
            <Tooltip
              key={`${rowId}-${cellIndex}-${columnId}`}
              open={errorMsg ? undefined : false}
            >
              <TooltipTrigger asChild>
                <TableCell
                  data-row-id={row.id}
                  data-cell-id={cell.id}
                  className={cn(
                    'relative !border !p-0 align-middle transition-[background-color,box-shadow,border-color] duration-150',
                    !isLastVisibleCell &&
                      rowData.is_new &&
                      "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-[2] after:block after:w-px after:bg-border/75 after:content-['']",
                    frameEditorCell &&
                      'rounded-none border-input bg-background shadow-xs',
                    !frameEditorCell &&
                      (isNewRowPlainCell
                        ? 'border-border/70 shadow-none'
                        : 'border-border/70'),
                    !isDisabled &&
                      !errorMsg &&
                      !(isDirty && !rowData.is_new) &&
                      !rowData.is_new &&
                      !frameEditorCell &&
                      'bg-card hover:bg-muted/35 dark:bg-card dark:hover:bg-muted/25',
                    !isDisabled &&
                      !errorMsg &&
                      !(isDirty && !rowData.is_new) &&
                      !rowData.is_new &&
                      frameEditorCell &&
                      'hover:border-input/80',
                    resolvedClass,
                    errorMsg &&
                      'bg-destructive/15 shadow-[inset_0_0_0_1px] shadow-destructive/35 dark:bg-destructive/20',
                    isDirty &&
                      !isDisabled &&
                      !errorMsg &&
                      !rowData.is_new &&
                      'bg-amber-50/95 shadow-[inset_0_0_0_1px] shadow-amber-300/70 dark:bg-amber-950/45 dark:shadow-amber-700/40',
                    isNewRowPlainCell && !frameEditorCell && 'bg-muted/25',
                    isNewRowPlainCell && frameEditorCell && 'bg-muted/20',
                    isDisabled &&
                      '!bg-muted/90 !text-muted-foreground dark:!bg-muted/30',
                    showFocusWithinStyle &&
                      'focus-within:z-[1] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25'
                  )}
                  style={style}
                >
                  <div
                    className={cn(
                      'flex w-full min-w-0',
                      isSelectColumn ||
                        columnId === PROJECT_ITEMS_REORDER_COLUMN_ID
                        ? 'items-center justify-center'
                        : columnId === 'actions'
                          ? 'items-center'
                          : 'items-stretch'
                    )}
                  >
                    {inner}
                  </div>
                </TableCell>
              </TooltipTrigger>
              {errorMsg ? (
                <TooltipContent
                  side='top'
                  className='bg-destructive text-destructive-foreground border border-destructive-foreground/20'
                  sideOffset={-10}
                  align='start'
                >
                  <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 rounded-full bg-destructive-foreground' />
                    <p className='text-sm font-medium'>{errorMsg}</p>
                  </div>
                </TooltipContent>
              ) : isDirty ? (
                <TooltipContent
                  side='top'
                  className='border border-blue-500 bg-blue-600 text-white'
                  sideOffset={-10}
                  align='start'
                >
                  <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 rounded-full bg-white' />
                    <p className='text-sm font-medium'>
                      Original: {originalValueForTooltip}
                    </p>
                  </div>
                </TooltipContent>
              ) : null}
            </Tooltip>
          );
        })}
      </TableRow>
    </ProjectItemsRowSortableContext.Provider>
  );
}

type ProjectItemsDataTableProps = {
  itemsTableStore: ItemsTableStore;
  table: TanStackTable<ProjectItemRowType>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchPlaceholder: string;
  /** Shown before the search field (e.g. section title). */
  toolbarTitle?: React.ReactNode;
  /** Shown after primary actions (e.g. export), typically rightmost. */
  toolbarTrailing?: React.ReactNode;
  actions: React.ReactNode;
  onEdit: (rowId: string, columnId: string, value: unknown) => void;
  disabledColumns: (rowData: ProjectItemRowType) => string[];
  handleAddNewRow?: (tableApi: ProjectItemsTableApi) => void;
  autoAddRowIf?: (args: {
    data: ProjectItemRowType[];
    table: TanStackTable<ProjectItemRowType>;
  }) => boolean;
  onSaveShortcut?: (rowData: ProjectItemRowType) => void;
  emptyState?: React.ReactNode;
  isTableLoading: boolean;
  allRows: ProjectItemRowType[];
  handleSaveRow: (
    rowData: ProjectItemRowType,
    tableApi: ProjectItemsTableApi,
    options?: { suppressToast?: boolean }
  ) => Promise<void>;
  handleDeleteRow: (
    rowData: ProjectItemRowType,
    tableApi: ProjectItemsTableApi
  ) => void;
  itemsTableApi: ProjectItemsTableApi;
  openDeleteConfirmation: (data: DeleteConfirmationData) => void;
  savingRowId: string | null;
  saveErrors: Record<string, string | null>;
  isSaving: boolean;
  onPersistRowOrder?: (args: {
    movedRowId: string;
    newOrderKey: number;
  }) => Promise<void>;
};

function ProjectItemsDataTable({
  itemsTableStore,
  table,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder,
  toolbarTitle,
  toolbarTrailing,
  actions,
  onEdit,
  disabledColumns,
  handleAddNewRow,
  autoAddRowIf,
  onSaveShortcut,
  emptyState,
  isTableLoading,
  allRows,
  handleSaveRow,
  handleDeleteRow,
  itemsTableApi,
  openDeleteConfirmation,
  savingRowId,
  saveErrors,
  isSaving,
  onPersistRowOrder,
}: ProjectItemsDataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useSearchShortcut();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const cellErrors = useStore(itemsTableStore, (s) => s.cellErrors);

  const setCellErrors = useCallback(
    (
      updater: (
        prev: Record<string, Record<string, Record<string, string | null>>>
      ) => Record<string, Record<string, Record<string, string | null>>>
    ) => {
      itemsTableStore.getState().mergeCellErrors(updater);
    },
    [itemsTableStore]
  );

  const findTableRow = useCallback(
    (rowData: ProjectItemRowType): Row<ProjectItemRowType> | undefined => {
      if (!rowData.id) {
        return undefined;
      }
      return table
        .getRowModel()
        .flatRows.find((r) => r.original.id === rowData.id);
    },
    [table]
  );

  const handleCommitCell = useCallback(
    (
      nextValue: unknown,
      groupKey: string,
      rowData: ProjectItemRowType,
      colDef: ExtendedColumnDef<ProjectItemRowType>
    ) => {
      const tanStackRow = findTableRow(rowData);
      if (!tanStackRow) {
        return;
      }

      const rowId = tanStackRow.id;
      const rowIndex = tanStackRow.index;
      const columnId = colDef.id ?? colDef.accessorKey ?? '';

      const isCellDisabled =
        isRowDisabled([], groupKey, rowIndex) ||
        disabledColumns(rowData).includes(columnId);

      if (isCellDisabled) {
        return;
      }

      const { parsedValue, errorMessage } = parseFieldValue(
        columnId,
        nextValue,
        colDef.validationSchema
      );

      setCellErrors((prev) => {
        const groupErrors = prev[groupKey] || {};
        const rowErrors = {
          ...(groupErrors[rowId] || {}),
          [columnId]: errorMessage,
        };
        return { ...prev, [groupKey]: { ...groupErrors, [rowId]: rowErrors } };
      });

      onEdit(rowId, columnId, parsedValue);
    },
    [disabledColumns, findTableRow, onEdit, setCellErrors]
  );

  const tableCellsContextValue = React.useMemo(
    () => ({
      groupKey: 'ungrouped',
      cellErrors,
      disabledColumns,
      commitCell: (
        rowData: ProjectItemRowType,
        colDef: ExtendedColumnDef<ProjectItemRowType>,
        raw: unknown
      ) => {
        handleCommitCell(raw, 'ungrouped', rowData, colDef);
      },
      handleSaveRow,
      handleDeleteRow,
      itemsTableApi,
      openDeleteConfirmation,
      savingRowId,
      saveErrors,
      isSaving,
      dense: true,
    }),
    [
      cellErrors,
      disabledColumns,
      handleCommitCell,
      handleSaveRow,
      handleDeleteRow,
      itemsTableApi,
      openDeleteConfirmation,
      savingRowId,
      saveErrors,
      isSaving,
    ]
  );

  const handleSaveShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (
        !tableContainerRef.current ||
        !tableContainerRef.current.contains(document.activeElement)
      ) {
        return;
      }

      event.preventDefault();
      if (!onSaveShortcut) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement;
      const rowElement = activeElement?.closest(
        'tr[data-row-id]'
      ) as HTMLTableRowElement | null;

      if (rowElement) {
        const rowId = rowElement.getAttribute('data-row-id');
        const found = table.getRowModel().flatRows.find((r) => r.id === rowId);
        if (found) {
          onSaveShortcut(found.original);
        }
      }
    },
    [onSaveShortcut, table]
  );

  useHotkeys('ctrl+s, meta+s', handleSaveShortcut, {
    enableOnFormTags: true,
  });

  React.useEffect(() => {
    if (!autoAddRowIf || !handleAddNewRow) {
      return;
    }
    if (autoAddRowIf({ data: allRows, table })) {
      handleAddNewRow(itemsTableApi);
    }
  }, [allRows, autoAddRowIf, handleAddNewRow, itemsTableApi, table]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onPersistRowOrder) {
        return;
      }

      const store = itemsTableStore.getState();
      const fullBefore = store.rows.map((r) => String(r.id));
      const visibleRows = table.getRowModel().rows;
      const visibleIds = visibleRows.map((r) => String(r.id));
      const activeId = String(active.id);
      const overId = String(over.id);
      const activeIdx = visibleIds.indexOf(activeId);
      const overIdx = visibleIds.indexOf(overId);
      if (activeIdx === -1 || overIdx === -1) {
        return;
      }

      const activeOriginal = visibleRows[activeIdx]?.original;
      if (!activeOriginal || activeOriginal.is_new) {
        toast.error('Save the row before reordering');
        return;
      }

      const visibleNew = arrayMove(visibleIds, activeIdx, overIdx);
      const fullNew = stitchVisibleOrderIntoFullOrder(
        fullBefore,
        visibleIds,
        visibleNew
      );

      const rowsById = new Map(
        store.rows.map((r) => [String(r.id), r] as const)
      );
      const newOrderedRows = fullNew
        .map((id) => rowsById.get(id))
        .filter((r): r is ProjectItemRowType => Boolean(r));

      const newOrderKey = computeOrderKeyForMovedRow(newOrderedRows, activeId);

      itemsTableApi.reorderRowsByOrderedIds(fullNew);
      try {
        await onPersistRowOrder({
          movedRowId: activeId,
          newOrderKey,
        });
        itemsTableApi.updateRow(activeId, { order_key: newOrderKey });
      } catch {
        itemsTableApi.reorderRowsByOrderedIds(fullBefore);
        toast.error('Failed to save row order');
      }
    },
    [itemsTableApi, itemsTableStore, onPersistRowOrder, table]
  );

  const { rows } = table.getRowModel();
  const colCount = table.getAllColumns().length;

  const hasActualData = rows.some((row) => {
    const original = row.original as Record<string, unknown>;
    return !original.is_new || original.id;
  });

  let bodyContent: React.ReactNode;
  if (isTableLoading && !hasActualData) {
    bodyContent = (
      <TableBody className='bg-background'>
        <TableRow className='bg-background'>
          <TableCell colSpan={colCount} className='!p-0'>
            <div className='flex items-center justify-center gap-2 py-8 text-muted-foreground'>
              <Spinner className='size-5' />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  } else if (rows.length === 0) {
    bodyContent = (
      <TableBody className='bg-background'>
        <TableRow className='bg-background'>
          <TableCell colSpan={colCount} className='min-h-24 !p-0 text-center'>
            {emptyState || 'No results found.'}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  } else {
    const sortableRowIds = rows.map((r) => r.id);
    bodyContent = (
      <ProjectItemsTableCellsContext.Provider value={tableCellsContextValue}>
        <TableBody className='bg-background'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              void handleDragEnd(e);
            }}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={sortableRowIds}
              strategy={verticalListSortingStrategy}
            >
              {rows.map((row) => {
                if (!row) {
                  return null;
                }
                return <ProjectItemsTableRowView key={row.id} row={row} />;
              })}
            </SortableContext>
          </DndContext>
        </TableBody>
      </ProjectItemsTableCellsContext.Provider>
    );
  }

  return (
    <div className='space-y-4' ref={tableContainerRef}>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-3 pb-3'>
          {toolbarTitle != null ? (
            <div className='flex min-w-0 shrink-0 items-center gap-3'>
              {toolbarTitle}
            </div>
          ) : null}
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
            <SearchInput
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => {
                onGlobalFilterChange(e.target.value);
              }}
              className='min-w-48 max-w-sm shrink-0 sm:min-w-64'
              onClear={() => {
                onGlobalFilterChange('');
              }}
              kbd={getPlatformSpecificKbd('K')}
              variant='sm'
            />
          </div>
          {actions ? (
            <div className='flex shrink-0 flex-wrap items-center gap-2'>
              {actions}
            </div>
          ) : null}
          {toolbarTrailing != null ? (
            <div className='flex shrink-0 items-center gap-2'>
              {toolbarTrailing}
            </div>
          ) : null}
        </div>
      </div>

      <div className='overflow-hidden rounded-lg border'>
        <UITable
          className={cn('dense table-fixed w-full min-w-0 max-w-full')}
          containerClassName='max-h-[65vh] overflow-x-auto overflow-y-auto'
        >
          <TableHeader className='sticky top-[0px] z-20  bg-slate-100 shadow-sm dark:bg-slate-900'>
            <TableRow className='border-b-0 bg-transparent hover:bg-slate-200/40 dark:hover:bg-slate-800/50'>
              {table.getHeaderGroups().map((headerGroup, groupIndex) =>
                headerGroup.headers.map((header, headerIndex) => {
                  const col = header.column
                    .columnDef as ExtendedColumnDef<ProjectItemRowType>;
                  const style = projectItemsColumnLayoutStyle(col);

                  const headerColClass =
                    typeof col.className === 'string'
                      ? col.className
                      : undefined;

                  const isFirstHeader = headerIndex === 0;
                  const isLastHeader =
                    headerIndex === headerGroup.headers.length - 1;

                  return (
                    <TableHead
                      key={`header-${groupIndex}-${headerIndex}-${header.id}`}
                      className={cn(
                        'whitespace-nowrap border-r border-slate-200/90 bg-transparent text-center text-xs font-semibold text-slate-700 last:border-r-0 transition-colors dark:border-slate-700 dark:text-slate-200',
                        isFirstHeader && 'rounded-tl-lg',
                        isLastHeader && 'rounded-tr-lg',
                        '!h-auto !p-0',
                        headerColClass
                      )}
                      style={style}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  );
                })
              )}
            </TableRow>
          </TableHeader>
          {bodyContent}
        </UITable>
      </div>
    </div>
  );
}

interface ApiError {
  errorMessage?: string;
  message?: string;
}

interface ProjectItemsProps {
  projectId: string;
}

export function ProjectItems({ projectId }: ProjectItemsProps) {
  const itemsTableStore = React.useMemo(() => {
    void projectId;
    return createProjectItemsTableStore();
  }, [projectId]);

  const savingRowId = useStore(itemsTableStore, (s) => s.savingRowId);
  const saveErrors = useStore(itemsTableStore, (s) => s.saveErrors);
  const isBulkOperationInProgress = useStore(
    itemsTableStore,
    (s) => s.isBulkOperationInProgress
  );

  const {
    data: projectItemRows,
    isFetching,
    isLoading,
    isPending,
    isError,
    refetch,
  } = useProjectItemsQuery({
    projectId: projectId,
    scope: 'planned',
  });

  const { mutateAsync: createItem, isPending: isCreating } =
    useCreateProjectItem(projectId);
  const { mutateAsync: patchProjectItem, isPending: isUpdating } =
    useUpdateProjectItem(projectId);
  const { mutateAsync: deleteItem, isPending: isDeleting } =
    useDeleteProjectItem(projectId);
  const isSaving = isCreating || isUpdating;

  const {
    isOpen: isDeleteConfirmationOpen,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    data: deleteConfirmationData,
  } = useDeleteConfirmation();

  const tableData = React.useMemo(() => {
    return projectItemRows || [];
  }, [projectItemRows]);

  const handleSaveRow = React.useCallback(
    async (
      rowData: ProjectItemRowType,
      api: ProjectItemsTableApi,
      options?: { suppressToast?: boolean }
    ) => {
      const st = itemsTableStore.getState();
      st.setSavingRowId(rowData.id);
      st.clearSaveErrorForRow(rowData.id);

      const validationResult = projectItemZodSchema.safeParse(rowData);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues
          .map((issue) => issue.message)
          .join(', ');
        st.setSaveErrorForRow(rowData.id, errorMessage);
        st.setSavingRowId(null);
        return;
      }

      try {
        const validated = validationResult.data as ProjectItemRowType;

        const createRowFields = {
          rate_amount: parseNumber(validated.rate_amount),
          contract_quantity: parseNumber(validated.contract_quantity),
          remark: validated.remark ?? null,
          work_order_number: validated.work_order_number,
          item_code: validated.item_code,
          item_description: validated.item_description,
          unit_display: validated.unit_display,
          project_segment_ids: validated.project_segment_ids ?? [],
          reference_schedule_text: validated.reference_schedule_text ?? '',
        };

        let updatedRowId = rowData.id;

        if (rowData.is_new) {
          const newItem = await createItem({
            ...createRowFields,
            project_id: projectId,
            schedule_item_id: String(validated.schedule_item_id ?? ''),
            suppressToast: options?.suppressToast,
          });
          const serverRow = newItem?.data;
          updatedRowId = serverRow?.id ?? rowData.id;
          if (String(rowData.id) !== String(updatedRowId)) {
            migrateSchedulePickSelection(
              String(rowData.id),
              String(updatedRowId)
            );
          }
          api.updateRow(rowData.id, {
            ...rowData,
            ...(serverRow ?? {}),
            id: updatedRowId,
            is_new: false,
            is_edited: false,
          });
        } else {
          const dirtyPatch = buildDirtyProjectBoqLineUpdateInput({
            projectId,
            rowId: rowData.id,
            current: validated,
            baseline: rowData._original ?? undefined,
          });
          const patchResult = await patchProjectItem({
            ...dirtyPatch,
            suppressToast: options?.suppressToast,
          });
          const serverRow = patchResult?.data;
          api.updateRow(rowData.id, {
            ...rowData,
            ...(serverRow ?? {}),
            is_edited: false,
          });
        }

        const focusNextRowWoNo = () => {
          const rows = api.table.getRowModel().rows;
          const currentRowIndex = rows.findIndex(
            (row) => row.original.id === updatedRowId
          );
          if (currentRowIndex === -1 || currentRowIndex >= rows.length - 1) {
            return false;
          }

          const nextRow = rows[currentRowIndex + 1];
          if (!nextRow.original.is_new) {
            return false;
          }

          const visibleCells = nextRow.getVisibleCells();
          const workOrderCell = visibleCells.find((cell) => {
            const colDef = cell.column
              .columnDef as ExtendedColumnDef<ProjectItemRowType>;
            return (
              cell.column.id === 'work_order_number' ||
              colDef?.accessorKey === 'work_order_number'
            );
          });

          if (!workOrderCell) {
            return false;
          }

          const nextRowId = nextRow.original.id;
          const cellId = workOrderCell.id;
          const cellElement = document.querySelector<HTMLElement>(
            `[data-row-id="${nextRowId}"][data-cell-id="${cellId}"]`
          );

          if (!cellElement) {
            return false;
          }

          const input = cellElement.querySelector<HTMLInputElement>('input');

          if (input) {
            input.focus();
            if (input instanceof HTMLInputElement) {
              input.select();
            }
            return true;
          }

          return false;
        };

        let attempts = 0;
        const maxAttempts = 5;
        const tryFocus = () => {
          if (focusNextRowWoNo() || attempts >= maxAttempts) {
            return;
          }
          attempts += 1;
          setTimeout(tryFocus, 50);
        };

        setTimeout(tryFocus, 100);
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage =
          apiError.errorMessage ||
          apiError.message ||
          'An unknown error occurred.';
        itemsTableStore.getState().setSaveErrorForRow(rowData.id, errorMessage);
      } finally {
        itemsTableStore.getState().setSavingRowId(null);
      }
    },
    [createItem, projectId, patchProjectItem, itemsTableStore]
  );

  const handleDeleteRow = React.useCallback(
    (rowData: ProjectItemRowType, api: ProjectItemsTableApi) => {
      if (rowData.is_new) {
        api.deleteRow(String(rowData.id));
        closeDeleteConfirmation();
        return;
      }

      deleteItem({ itemId: rowData.id }).then(() => {
        api.deleteRow(String(rowData.id));
        closeDeleteConfirmation();
      });
    },
    [closeDeleteConfirmation, deleteItem]
  );

  const handlePersistRowOrder = React.useCallback(
    async (args: { movedRowId: string; newOrderKey: number }) => {
      await patchProjectItem({
        id: args.movedRowId,
        project_id: projectId,
        order_key: args.newOrderKey,
        suppressToast: true,
      });
    },
    [projectId, patchProjectItem]
  );

  const columns = React.useMemo(() => getProjectItemsColumns(), []);

  const getDisabledColumns = React.useCallback(
    (rowData: ProjectItemRowType) => {
      if (rowData.is_new) {
        return [
          'index',
          'reference_schedule_text',
          'schedule_name',
          'total',
          'actions',
        ];
      }
      return [
        'index',
        'work_order_number',
        'item_code',
        'reference_schedule_text',
        'schedule_name',
        'item_description',
        'total',
        'actions',
      ];
    },
    []
  );

  const {
    rows,
    table,
    globalFilter,
    setGlobalFilter,
    editCell,
    api,
    isTableLoading,
  } = useProjectItemsTable({
    store: itemsTableStore,
    serverRows: tableData,
    columns,
    isPending,
    isLoading,
    getRowCanSelect: (row) => {
      const rowData = row.original as ProjectItemRowType;
      return !rowData.is_new;
    },
  });

  const handleAddNewRow = React.useCallback(
    (tableApi: ProjectItemsTableApi) => {
      const newRow: ProjectItemRowType = {
        id: `new-row-${Date.now()}`,
        work_order_number: '',
        schedule_item_id: '',
        item_code: '',
        item_description: emptyItemDescriptionDoc(),
        unit_display: '',
        rate_amount: '',
        contract_quantity: '',
        reference_schedule_text: '',
        total: '0',
        is_edited: true,
        is_new: true,
        header_key: null,
        _original: null,
        project_segment_ids: [],
        order_key: null,
        project_boq_lines_type: 'planned',
      };

      tableApi.addRow(newRow);
    },
    []
  );

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original as ProjectItemRowType);

  const selectedRowsCount = selectedRows.length;

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedRowsCount === 0) {
      return;
    }

    itemsTableStore.getState().setIsBulkOperationInProgress(true);
    const toastId = 'bulk-delete';
    toast.loading(
      `Deleting ${selectedRowsCount} item${
        selectedRowsCount !== 1 ? 's' : ''
      }...`,
      {
        id: toastId,
      }
    );

    let successCount = 0;
    let failedCount = 0;

    try {
      const results = await Promise.allSettled(
        selectedRows.map((row) =>
          deleteItem({ itemId: row.id, suppressToast: true })
        )
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount += 1;
          api.deleteRow(String(selectedRows[index].id));
        } else {
          failedCount += 1;
        }
      });

      api.setRowSelection({});
      closeDeleteConfirmation();

      if (failedCount === 0) {
        toast.success(
          `Successfully deleted ${successCount} item${
            successCount !== 1 ? 's' : ''
          }.`,
          { id: toastId }
        );
      } else if (successCount === 0) {
        toast.error(
          `Failed to delete ${failedCount} item${
            failedCount !== 1 ? 's' : ''
          }.`,
          { id: toastId }
        );
      } else {
        toast.warning(
          `Deleted ${successCount} item${
            successCount !== 1 ? 's' : ''
          }, failed to delete ${failedCount} item${
            failedCount !== 1 ? 's' : ''
          }.`,
          { id: toastId }
        );
      }
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError.errorMessage ||
        apiError.message ||
        'An unknown error occurred while deleting items.';
      toast.error(`Failed to delete items: ${errorMessage}`, { id: toastId });
      itemsTableStore.getState().setBulkSaveError(errorMessage);
    } finally {
      itemsTableStore.getState().setIsBulkOperationInProgress(false);
    }
  }, [
    selectedRows,
    selectedRowsCount,
    deleteItem,
    closeDeleteConfirmation,
    itemsTableStore,
    api,
  ]);

  const totalAmount = React.useMemo(() => {
    return tableData.reduce((acc, row) => {
      const quantity = parseNumber(row.contract_quantity);
      const rate = parseNumber(row.rate_amount);
      if (!isNaN(quantity) && !isNaN(rate)) {
        return acc + quantity * rate;
      }
      return acc;
    }, 0);
  }, [tableData]);

  const sectionActions = React.useMemo(
    () => (
      <>
        <div className='flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-900'>
          <span className='text-xs font-medium text-slate-600 dark:text-slate-300'>
            Total
          </span>
          <span className='text-sm font-semibold text-slate-900 dark:text-white'>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalAmount)}
          </span>
        </div>
        {selectedRowsCount > 0 ? (
          <>
            <div className='flex items-center gap-2'>
              {isBulkOperationInProgress && (
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              )}
              <span className='text-sm font-medium text-muted-foreground'>
                {selectedRowsCount} row{selectedRowsCount !== 1 ? 's' : ''}{' '}
                selected
                {isBulkOperationInProgress && ' (processing...)'}
              </span>
            </div>
            <Button
              size='sm'
              variant='destructive'
              onClick={() =>
                openDeleteConfirmation({
                  onConfirm: handleBulkDelete,
                  itemName: 'project item',
                  itemCount: selectedRowsCount,
                })
              }
              disabled={isSaving || isDeleting || isBulkOperationInProgress}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete
            </Button>
          </>
        ) : (
          <Button
            disabled={isLoading || isFetching}
            size='sm'
            onClick={() => {
              handleAddNewRow(api);
            }}
          >
            <Plus className='h-4 w-4' />
            <span className='hidden lg:inline'>New item</span>
          </Button>
        )}
      </>
    ),
    [
      totalAmount,
      isLoading,
      isFetching,
      handleAddNewRow,
      api,
      selectedRowsCount,
      isBulkOperationInProgress,
      isSaving,
      isDeleting,
      openDeleteConfirmation,
      handleBulkDelete,
    ]
  );

  return (
    <TooltipProvider>
      <div className='overflow-hidden'>
        <div>
          <div className='space-y-4 p-4'>
            {isError && (
              <TableErrorState
                title='Error fetching project items'
                message='Failed to fetch project items'
                onRetry={refetch}
              />
            )}
            <div className='relative'>
              <ProjectItemsDataTable
                itemsTableStore={itemsTableStore}
                table={table}
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
                searchPlaceholder='Search by name or code'
                toolbarTitle={
                  <div className='flex min-w-0 items-center gap-3'>
                    <h2 className='text-base font-semibold text-foreground'>
                      Project Items
                    </h2>
                    <span className='text-sm text-muted-foreground'>
                      {projectItemRows?.length ?? 0} items
                    </span>
                  </div>
                }
                toolbarTrailing={
                  <ProjectItemsExportButtons
                    projectId={projectId}
                    items={projectItemRows}
                    totalAmount={totalAmount}
                    disabled={isLoading}
                  />
                }
                actions={sectionActions}
                onEdit={editCell}
                disabledColumns={getDisabledColumns}
                handleAddNewRow={handleAddNewRow}
                autoAddRowIf={({ data, table: _table }) => {
                  if (data.length === 0) {
                    return true;
                  }
                  const lastRow = data.at(-1);
                  if (
                    !!lastRow?.work_order_number ||
                    flattenItemDescription(lastRow?.item_description).trim() !==
                      ''
                  ) {
                    return true;
                  }
                  return false;
                }}
                onSaveShortcut={(rowData) => {
                  void handleSaveRow(rowData, api);
                }}
                emptyState={
                  <div className='py-4 text-sm text-muted-foreground'>
                    No project items found.
                  </div>
                }
                isTableLoading={isTableLoading}
                allRows={rows as ProjectItemRowType[]}
                handleSaveRow={handleSaveRow}
                handleDeleteRow={handleDeleteRow}
                itemsTableApi={api}
                openDeleteConfirmation={openDeleteConfirmation}
                savingRowId={savingRowId}
                saveErrors={saveErrors}
                isSaving={isSaving}
                onPersistRowOrder={handlePersistRowOrder}
              />
            </div>
          </div>
        </div>
        {deleteConfirmationData && (
          <DeleteConfirmationDialog
            open={isDeleteConfirmationOpen}
            onOpenChange={closeDeleteConfirmation}
            onConfirm={deleteConfirmationData.onConfirm}
            itemName={deleteConfirmationData.itemName}
            isLoading={isDeleting}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
