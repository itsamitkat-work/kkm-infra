'use client';

import { Input, InputAddon, InputGroup } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TableLoadingState } from '@/components/tables/table-loading';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  IconDotsVertical,
  IconMathFunction,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconTrash,
} from '@tabler/icons-react';
import { MasterItem } from '@/hooks/items/types';
import { ItemJustification } from '@/types/item-justification';
import { BasicRate } from '@/hooks/use-basic-rates';
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useItemJustificationQuery,
  ITEM_JUSTIFICATION_TABLE_ID,
} from '../hooks/use-item-justification-query';
import {
  type ChargeOption,
  useJustificationDefaultValues,
} from '../hooks/use-justification-default-values';
import { ItemSelectDialog } from './item-select-dialog';
import { MaterialSelectDialog } from './material-select-dialog';
import { formatIndianNumber } from '@/lib/numberToText';
import { apiFetch } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type ItemJustificationPayload = {
  id: string;
  srNo: number;
  itemId: string;
  basicRateId: string | null;
  dsrid: string | undefined;
  itemCode: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
  amount: number;
  calcFor: number;
};

type DialogMode =
  | { type: 'row-item'; rowIndex: number }
  | { type: 'row-material'; rowIndex: number }
  | null;

function formatDetail(value: string | number | null | undefined): string {
  return value != null && value !== '' ? String(value) : '—';
}

function toPayloadRow(
  row: ItemJustification,
  calcForNum: number
): ItemJustificationPayload {
  return {
    id: row.id,
    srNo: row.srNo,
    itemId: row.itemId ?? '',
    basicRateId: row.basicRateId,
    dsrid: row.dsrid ?? '',
    itemCode: row.itemCode ?? row.code ?? '',
    code: row.code ?? '',
    description: row.description ?? '',
    unit: row.unit ?? '',
    rate: Number(row.rate) ?? 0,
    quantity: Number(row.quantity) ?? 0,
    amount: Number(row.amount) ?? 0,
    calcFor: calcForNum,
  };
}

function parseFormulaReferences(description: string): number[] | null {
  if (!description) return null;

  const match = description.match(/TOTAL\s*\(([^)]+)\)/i);
  if (!match) return null;

  const content = match[1];
  const rowIndices: number[] = [];

  const rangeMatch = content.match(/R(\d+)\.\.\.\s*\+\s*R(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    for (let i = start; i <= end; i++) {
      rowIndices.push(i - 1);
    }
    return rowIndices;
  }

  const rowMatches = content.matchAll(/R(\d+)/gi);
  for (const m of rowMatches) {
    rowIndices.push(parseInt(m[1], 10) - 1);
  }

  return rowIndices.length > 0 ? rowIndices : null;
}

/** e.g. * Add 15% CPOH on "R21" -> { percent: 15, rowIndex: 20 } */
function parsePercentFormula(
  description: string
): { percent: number; rowIndex: number } | null {
  if (!description) return null;
  const match = description.match(
    /\*\s*Add\s+(\d+(?:\.\d+)?)\s*%\s+.*?["']R(\d+)\s*["']/i
  );
  if (!match) return null;
  const percent = parseFloat(match[1]);
  const rowNum = parseInt(match[2], 10);
  return { percent, rowIndex: rowNum - 1 };
}

/** e.g. Cost of 0.5, Cost of 1 sqm -> 0.5, 1 */
function parseCostOfFormula(description: string): number | null {
  if (!description) return null;
  const match = description.match(/^Cost\s+of\s+(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

function isAutoTotalFormula(description: string): boolean {
  return /^TOTAL\s*\(\s*$/i.test(description.trim());
}

function isSayRow(row: ItemJustification): boolean {
  const name = (row.description ?? '').trim().toLowerCase();
  const code = (row.code ?? '').trim().toLowerCase();
  return name === 'say' || code === 'say';
}

function getDefaultJustificationRows(
  item: MasterItem,
  calcForNum: number
): ItemJustification[] {
  const unit = '';
  return [
    {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: 1,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: undefined,
      itemCode: '',
      code: '',
      description: `Details of cost for ${calcForNum} ${unit}.`,
      unit,
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    },
    {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: 2,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: undefined,
      itemCode: '',
      code: '',
      description: 'TOTAL (R1... + R1)',
      unit,
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    },
    {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: 3,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: undefined,
      itemCode: '',
      code: '',
      description: `Cost of ${calcForNum} ${unit}`.trim(),
      unit,
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    },
    {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: 4,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: undefined,
      itemCode: '',
      code: '',
      description: 'Cost of 1 unit',
      unit,
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    },
    {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: 5,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: undefined,
      itemCode: '',
      code: '',
      description: 'Say',
      unit,
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    },
  ];
}

function calculateFormulaAmount(
  rowIndex: number,
  rows: ItemJustification[],
  calcForNum: number,
  originalRows: ItemJustification[]
): number | null {
  const row = rows[rowIndex];
  if (!row) return null;

  const desc = row.description ?? '';

  if (isAutoTotalFormula(desc)) {
    let startIndex = 0;
    for (let i = rowIndex - 1; i >= 0; i--) {
      if (isAutoTotalFormula(rows[i].description ?? '')) {
        startIndex = i;
        break;
      }
    }
    let sum = 0;
    for (let i = startIndex; i < rowIndex; i++) {
      sum += Number(rows[i].amount) || 0;
    }
    return Math.round(sum * 100) / 100;
  }

  const totalRefs = parseFormulaReferences(desc);
  if (totalRefs !== null) {
    const sum = totalRefs.reduce((acc, refIndex) => {
      if (refIndex === rowIndex) return acc;
      if (refIndex < 0 || refIndex >= rows.length) return acc;
      const refRow = rows[refIndex];
      return acc + (Number(refRow?.amount) || 0);
    }, 0);
    return Math.round(sum * 100) / 100;
  }

  const percentFormula = parsePercentFormula(desc);
  if (percentFormula !== null) {
    const { percent, rowIndex: refIndex } = percentFormula;
    if (refIndex < 0 || refIndex >= rows.length) return null;
    const refRow = rows[refIndex];
    const baseAmount = Number(refRow?.amount) || 0;
    const amount = (baseAmount * percent) / 100;
    return Math.round(amount * 100) / 100;
  }

  const costOfVal = parseCostOfFormula(desc);
  if (costOfVal !== null) {
    const originalRow = originalRows.find((r) => r.id === row.id);
    if (!originalRow) return null;
    const origCostOfVal = parseCostOfFormula(originalRow.description ?? '');
    if (!origCostOfVal || origCostOfVal === 0) return null;
    const baseRate = Number(originalRow.amount) / origCostOfVal;
    const origCalcFor = Number(originalRow.calcFor) || 0;
    const inSync =
      origCalcFor > 0 && Math.abs(origCostOfVal - origCalcFor) < 0.001;
    const multiplier = inSync ? calcForNum : costOfVal;
    return Math.round(baseRate * multiplier * 100) / 100;
  }

  return null;
}

const FALLBACK_CHARGE_OPTIONS: ChargeOption[] = [
  { id: 'water', label: 'Water Charges', checked: false, value: 1 },
  { id: 'electricity', label: 'Electricity Charges', checked: false, value: 0 },
  { id: 'gst', label: 'GST', checked: false, value: 0 },
  { id: 'cpoh', label: 'CPOH', checked: false, value: 15 },
  { id: 'cess', label: 'Cess', checked: false, value: 1 },
];

export interface ItemJustificationTableProps {
  /** Always defined; parent guarantees item is loaded. */
  item: MasterItem;
  /** Optional; table also fetches so it stays in sync when data loads after mount. */
  defaultChargeOptions?: ChargeOption[];
}

export default function ItemJustificationTable({
  item,
  defaultChargeOptions: defaultChargeOptionsProp,
}: ItemJustificationTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: fetchedChargeOptions } = useJustificationDefaultValues();
  const defaultChargeOptions = React.useMemo(() => {
    if (defaultChargeOptionsProp?.length) return defaultChargeOptionsProp;
    if (fetchedChargeOptions?.length) return fetchedChargeOptions;
    return FALLBACK_CHARGE_OPTIONS;
  }, [defaultChargeOptionsProp, fetchedChargeOptions]);
  const [calcFor, setCalcFor] = React.useState('');
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [rows, setRows] = React.useState<ItemJustification[]>([]);
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);
  const [chargeOverrides, setChargeOverrides] = React.useState<
    Record<string, Partial<Pick<ChargeOption, 'checked' | 'value'>>>
  >({});
  const [formulaHelpOpen, setFormulaHelpOpen] = React.useState(false);
  const formulaHelpCloseTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [rowFormulaPopoverIndex, setRowFormulaPopoverIndex] = React.useState<
    number | null
  >(null);
  const rowFormulaCloseTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  React.useEffect(() => {
    return () => {
      if (formulaHelpCloseTimeoutRef.current)
        clearTimeout(formulaHelpCloseTimeoutRef.current);
      if (rowFormulaCloseTimeoutRef.current)
        clearTimeout(rowFormulaCloseTimeoutRef.current);
    };
  }, []);

  const { data: justificationData, query } = useItemJustificationQuery({
    itemId: item.hashId,
  });

  const isLoading = query.isLoading;
  const mode = query.isFetched
    ? justificationData.length > 0
      ? 'edit'
      : 'add'
    : null;
  const isEditMode = mode === 'edit' || (mode === 'add' && isCreatingNew);
  const hasAutoCreateFlag = searchParams.get('createJustification') === '1';

  React.useEffect(() => {
    if (justificationData.length > 0) {
      setRows(justificationData);
      setIsCreatingNew(false);
    } else if (!isCreatingNew) {
      setRows([]);
    }
  }, [justificationData, isCreatingNew]);

  React.useEffect(() => {
    const first = justificationData[0];
    if (first != null) {
      setCalcFor(String(first.calcFor));
    } else {
      setCalcFor('');
    }
  }, [justificationData]);

  React.useEffect(() => {
    if (!hasAutoCreateFlag || mode !== 'add' || isCreatingNew) return;
    startCreateJustification();
    router.replace(`${pathname}?tab=justification`);
  }, [hasAutoCreateFlag, isCreatingNew, mode, pathname, router]);

  const chargeOptions = React.useMemo(
    () =>
      defaultChargeOptions.map((opt) => ({
        ...opt,
        ...chargeOverrides[opt.id],
      })),
    [defaultChargeOptions, chargeOverrides]
  );

  const rowsWithFormulas = React.useMemo(() => {
    const calcForNum = Number(calcFor) || 0;
    const result = rows.map((r) => ({ ...r }));
    for (let index = 0; index < result.length; index++) {
      const formulaAmount = calculateFormulaAmount(
        index,
        result,
        calcForNum,
        justificationData
      );
      if (formulaAmount !== null) {
        result[index] = { ...result[index], amount: formulaAmount };
      }
      const costOfVal = parseCostOfFormula(result[index].description ?? '');
      if (costOfVal !== null && calcForNum > 0) {
        const origRow = justificationData.find(
          (r) => r.id === result[index].id
        );
        const origCostOfVal = origRow
          ? parseCostOfFormula(origRow.description ?? '')
          : null;
        const origCalcFor = Number(origRow?.calcFor) || 0;
        const inSync =
          origCostOfVal !== null &&
          origCalcFor > 0 &&
          Math.abs(origCostOfVal - origCalcFor) < 0.001;
        if (inSync) {
          result[index] = {
            ...result[index],
            description: `Cost of ${calcForNum}`,
          };
        }
      }
    }
    return result;
  }, [rows, calcFor, justificationData]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ItemJustificationPayload[]) => {
      await apiFetch<unknown>('v2/itemjustification', {
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ITEM_JUSTIFICATION_TABLE_ID],
      });
      query.refetch();
    },
    onError: (
      error: Error & { response?: { data?: { message?: string } } }
    ) => {
      const message =
        error.response?.data?.message ??
        error.message ??
        'Save failed. Please try again.';
      toast.error(message);
    },
  });

  function handleRowItemSelect(_id: string, item: MasterItem) {
    if (dialogMode?.type !== 'row-item') return;
    const { rowIndex } = dialogMode;
    setRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      if (!row) return prev;
      const qty = Number(row.quantity) || 0;
      next[rowIndex] = {
        ...row,
        code: item.code,
        dsrid: item.dsrId ?? undefined,
        description: item.name,
        unit: item.unit,
        rate: item.rate,
        amount: item.rate * qty,
        itemId: item.hashId,
        basicRateId: null,
      };
      return next;
    });
    setDialogMode(null);
  }

  function handleRowMaterialSelect(material: BasicRate) {
    if (dialogMode?.type !== 'row-material') return;
    const { rowIndex } = dialogMode;
    setRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      if (!row) return prev;
      const qty = Number(row.quantity) || 0;
      next[rowIndex] = {
        ...row,
        code: material.code,
        description: material.name,
        unit: material.unit,
        rate: material.rate,
        amount: material.rate * qty,
        basicRateId: (material.hashID || material.hashId) ?? null,
        itemId: (material.hashID || material.hashId) ?? '',
      };
      return next;
    });
    setDialogMode(null);
  }

  function updateRow(rowIndex: number, updates: Partial<ItemJustification>) {
    setRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      if (!row) return prev;
      next[rowIndex] = { ...row, ...updates };
      if ('quantity' in updates || 'rate' in updates) {
        const qty = Number(next[rowIndex].quantity) || 0;
        const rate = Number(next[rowIndex].rate) || 0;
        next[rowIndex] = { ...next[rowIndex], amount: rate * qty };
      }
      return next;
    });
  }

  function startCreateJustification() {
    const calcForNum = 1;
    setCalcFor(String(calcForNum));
    setRows(getDefaultJustificationRows(item, calcForNum));
    setIsCreatingNew(true);
  }

  function addRow() {
    const calcForNum = Number(calcFor) || 0;
    const newRow: ItemJustification = {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: 0,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: '',
      itemCode: '',
      code: '',
      description: '',
      unit: '',
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    };
    setRows((prev) => {
      const sayIndex = prev.findIndex(isSayRow);
      const insertAt = sayIndex >= 0 ? sayIndex : prev.length;
      const next = [
        ...prev.slice(0, insertAt),
        newRow,
        ...prev.slice(insertAt),
      ];
      return next.map((row, i) => ({ ...row, srNo: i + 1 }));
    });
  }

  function deleteRow(rowIndex: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      return next.map((row, i) => ({ ...row, srNo: i + 1 }));
    });
  }

  function insertRowAt(position: number) {
    const calcForNum = Number(calcFor) || 0;
    const newRow: ItemJustification = {
      itemName: null,
      id: crypto.randomUUID(),
      srNo: position + 1,
      itemId: item.hashId,
      basicRateId: null,
      dsrid: '',
      itemCode: '',
      code: '',
      description: '',
      unit: '',
      rate: 0,
      quantity: 0,
      amount: 0,
      calcFor: calcForNum,
    };
    setRows((prev) => {
      const sayIndex = prev.findIndex(isSayRow);
      const insertAt =
        sayIndex >= 0 && position > sayIndex ? sayIndex : position;
      const next = [
        ...prev.slice(0, insertAt),
        newRow,
        ...prev.slice(insertAt),
      ];
      return next.map((row, i) => ({ ...row, srNo: i + 1 }));
    });
  }

  function handleSave() {
    const calcForNum = Number(calcFor) || 0;
    const payload = rowsWithFormulas.map((row) =>
      toPayloadRow(row, calcForNum)
    );
    saveMutation.mutate(payload);
  }

  function updateChargeOption(
    id: string,
    updates: Partial<Pick<ChargeOption, 'checked' | 'value'>>
  ) {
    setChargeOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  }

  const rateStr =
    item.rate != null ? `₹${formatIndianNumber(item.rate)}` : null;
  const originalCalcFor = justificationData[0]?.calcFor ?? null;

  const sayRowIndex = rowsWithFormulas.findIndex(isSayRow);

  return (
    <div className='flex h-full max-h-full w-full flex-col overflow-hidden p-2'>
      <div className='flex h-full max-h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-md border border-border py-0 shadow-sm'>
        {isLoading ? (
          <TableLoadingState message='Loading justifications...' />
        ) : (
          <>
            {mode === 'add' && !isCreatingNew ? (
              <Empty className='min-h-[320px] flex-1'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <IconMathFunction className='size-6' />
                  </EmptyMedia>
                  <EmptyTitle>No justification yet</EmptyTitle>
                  <EmptyDescription>
                    Create a justification to define cost breakdown and formulas
                    for this item.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={startCreateJustification}>
                    Create justification
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                  {/* Sticky toolbar */}
                  <div className='shrink-0 border-b bg-background'>
                    <div className='flex flex-wrap items-center justify-between gap-2 px-2 py-1.5'>
                      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
                        <span className='w-full break-words text-left font-medium sm:w-auto'>
                          {formatDetail(item.name)}
                        </span>
                        <span className='text-muted-foreground'>
                          <span className='text-xs'>Code:</span>{' '}
                          {formatDetail(item.code)}
                        </span>
                        <span className='text-muted-foreground'>
                          <span className='text-xs'>Schedule:</span>{' '}
                          {formatDetail(item.scheduleRate)}
                        </span>
                        <span className='text-muted-foreground'>
                          <span className='text-xs'>Rate:</span>{' '}
                          {formatDetail(rateStr)}
                        </span>
                        <label className='flex items-center gap-1'>
                          <span className='text-xs text-muted-foreground'>
                            Calc for:
                          </span>
                          <InputGroup className='w-auto'>
                            <Input
                              type='number'
                              inputMode='decimal'
                              min={0}
                              step={0.01}
                              value={calcFor}
                              onChange={(e) => setCalcFor(e.target.value)}
                              className='w-20'
                              variant='sm'
                            />
                            <InputAddon variant='sm'>{item.unit}</InputAddon>
                          </InputGroup>
                          {originalCalcFor != null &&
                            String(originalCalcFor) !== calcFor && (
                              <span className='text-[10px] text-muted-foreground/60'>
                                (orig: {originalCalcFor})
                              </span>
                            )}
                        </label>
                        <Popover
                          open={formulaHelpOpen}
                          onOpenChange={setFormulaHelpOpen}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type='button'
                              className='flex shrink-0 items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring'
                              aria-label='Formula help'
                              onMouseEnter={() => {
                                if (formulaHelpCloseTimeoutRef.current) {
                                  clearTimeout(
                                    formulaHelpCloseTimeoutRef.current
                                  );
                                  formulaHelpCloseTimeoutRef.current = null;
                                }
                                setFormulaHelpOpen(true);
                              }}
                              onMouseLeave={() => {
                                formulaHelpCloseTimeoutRef.current = setTimeout(
                                  () => setFormulaHelpOpen(false),
                                  150
                                );
                              }}
                            >
                              <IconMathFunction className='h-3.5 w-3.5' />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className='w-96 p-0'
                            align='start'
                            side='bottom'
                            onMouseEnter={() => {
                              if (formulaHelpCloseTimeoutRef.current) {
                                clearTimeout(
                                  formulaHelpCloseTimeoutRef.current
                                );
                                formulaHelpCloseTimeoutRef.current = null;
                              }
                              setFormulaHelpOpen(true);
                            }}
                            onMouseLeave={() => {
                              formulaHelpCloseTimeoutRef.current = setTimeout(
                                () => setFormulaHelpOpen(false),
                                150
                              );
                            }}
                          >
                            <div className='border-b px-3 py-2.5 text-sm font-medium'>
                              Formula modes (use in Name column)
                            </div>
                            <div className='max-h-80 overflow-auto px-3 py-3 text-xs'>
                              <p className='mb-3 text-muted-foreground'>
                                Enter one of these patterns in the Name cell.
                                Amount is calculated automatically.
                              </p>
                              <div className='space-y-4'>
                                <div>
                                  <div className='font-medium text-foreground'>
                                    1. Sum specific rows
                                  </div>
                                  <p className='mt-1 text-muted-foreground'>
                                    Adds amounts of the listed rows.
                                  </p>
                                  <code className='mt-1.5 block rounded bg-muted px-2 py-1 font-mono text-[11px]'>
                                    TOTAL (R3 + R4)
                                  </code>
                                  <p className='mt-1.5 text-muted-foreground'>
                                    R3 = 200, R4 = 100 → Amount = 300
                                  </p>
                                </div>
                                <div>
                                  <div className='font-medium text-foreground'>
                                    2. Sum range of rows
                                  </div>
                                  <p className='mt-1 text-muted-foreground'>
                                    Adds amounts from row A through row B.
                                  </p>
                                  <code className='mt-1.5 block rounded bg-muted px-2 py-1 font-mono text-[11px]'>
                                    TOTAL (R1... + R5)
                                  </code>
                                  <p className='mt-1.5 text-muted-foreground'>
                                    R1 = 10, R2 = 20, R3 = 30, R4 = 40, R5 = 50
                                    → Amount = 150
                                  </p>
                                </div>
                                <div>
                                  <div className='font-medium text-foreground'>
                                    3. Auto-range TOTAL
                                  </div>
                                  <p className='mt-1 text-muted-foreground'>
                                    Sums all rows from the previous &quot;TOTAL
                                    (&quot; row (or from the start) up to this
                                    row.
                                  </p>
                                  <code className='mt-1.5 block rounded bg-muted px-2 py-1 font-mono text-[11px]'>
                                    TOTAL (
                                  </code>
                                  <p className='mt-1.5 text-muted-foreground'>
                                    R1 = 10, R2 = 20, R3 = TOTAL ( → Amount =
                                    30. R4 = 5, R5 = 15, R6 = TOTAL ( → Amount =
                                    20
                                  </p>
                                </div>
                                <div>
                                  <div className='font-medium text-foreground'>
                                    4. Percent of a row
                                  </div>
                                  <p className='mt-1 text-muted-foreground'>
                                    X% of a row. Row ref in quotes.
                                  </p>
                                  <code className='mt-1.5 block rounded bg-muted px-2 py-1 font-mono text-[11px]'>
                                    * Add 10% CPOH on &quot;R5&quot;
                                  </code>
                                  <p className='mt-1.5 text-muted-foreground'>
                                    R5 = 200 → Amount = 20 (10% of 200)
                                  </p>
                                </div>
                                <div>
                                  <div className='font-medium text-foreground'>
                                    5. Cost of X
                                  </div>
                                  <p className='mt-1 text-muted-foreground'>
                                    Scales with &quot;Calc for&quot;. Updates
                                    when Calc for changes.
                                  </p>
                                  <code className='mt-1.5 block rounded bg-muted px-2 py-1 font-mono text-[11px]'>
                                    Cost of 0.5
                                  </code>
                                  <p className='mt-1.5 text-muted-foreground'>
                                    Amount = 50, Cost of 0.5 → per unit = 100.
                                    Calc for → 2 → Amount = 200
                                  </p>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {isEditMode && (
                        <div className='ml-auto flex shrink-0 items-center gap-2'>
                          <Button size='sm' variant='outline' onClick={addRow}>
                            Add row
                          </Button>
                          <Button
                            size='sm'
                            onClick={handleSave}
                            disabled={
                              saveMutation.isPending ||
                              rows.length === 0 ||
                              !calcFor.trim() ||
                              Number(calcFor) === 0
                            }
                          >
                            {saveMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scrollable table area - only scrollbar */}
                  <div className='min-h-0 flex-1 overflow-auto'>
                    <Table className='w-full table-fixed border-collapse text-xs'>
                      <TableHeader className='sticky top-0 z-10'>
                        <TableRow className='h-7 border-border bg-muted hover:bg-muted'>
                          <TableHead className='h-7 w-12 border-x border-b border-border bg-muted px-1 py-0.5'>
                            #
                          </TableHead>
                          <TableHead className='h-7 w-20 border-x border-b border-border bg-muted px-1 py-0.5'>
                            Code
                          </TableHead>
                          <TableHead className='h-7 border-x border-b border-border bg-muted px-1 py-0.5'>
                            Name
                          </TableHead>
                          <TableHead className='h-7 w-20 border-x border-b border-border bg-muted px-1 py-0.5'>
                            Quantity
                          </TableHead>
                          <TableHead className='h-7 w-20 border-x border-b border-border bg-muted px-1 py-0.5'>
                            Rate
                          </TableHead>
                          <TableHead className='h-7 w-20 border-x border-b border-border bg-muted px-1 py-0.5'>
                            Amount
                          </TableHead>
                          <TableHead className='h-7 w-14 border-x border-b border-border bg-muted px-1 py-0.5'>
                            Unit
                          </TableHead>
                          <TableHead className='h-7 w-14 border-x border-b border-border bg-muted px-1 py-0.5'></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rowsWithFormulas.map((row, index) => {
                          const hasRowCode = (row.code ?? '').trim().length > 0;
                          const isFormula =
                            row.code?.startsWith('*') ||
                            row.description?.startsWith('*') ||
                            isAutoTotalFormula(row.description ?? '') ||
                            parseFormulaReferences(row.description ?? '') !==
                              null ||
                            parsePercentFormula(row.description ?? '') !==
                              null ||
                            parseCostOfFormula(row.description ?? '') !== null;
                          return (
                            <TableRow
                              key={row.id}
                              className={cn(
                                'h-7 border-border',
                                isFormula &&
                                  'text-amber-700 dark:text-amber-400'
                              )}
                            >
                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  <TableCell className='w-12 cursor-context-menu border border-border bg-muted/50 px-1'>
                                    <div className='flex items-center gap-0.5'>
                                      <span>R{index + 1}</span>
                                      {isFormula && (
                                        <Popover
                                          open={
                                            rowFormulaPopoverIndex === index
                                          }
                                          onOpenChange={(open) =>
                                            setRowFormulaPopoverIndex(
                                              open ? index : null
                                            )
                                          }
                                        >
                                          <PopoverTrigger asChild>
                                            <button
                                              type='button'
                                              className='flex shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-400 dark:hover:bg-amber-900/30'
                                              aria-label='Show formula'
                                              onMouseEnter={() => {
                                                if (
                                                  rowFormulaCloseTimeoutRef.current
                                                ) {
                                                  clearTimeout(
                                                    rowFormulaCloseTimeoutRef.current
                                                  );
                                                  rowFormulaCloseTimeoutRef.current =
                                                    null;
                                                }
                                                setRowFormulaPopoverIndex(
                                                  index
                                                );
                                              }}
                                              onMouseLeave={() => {
                                                rowFormulaCloseTimeoutRef.current =
                                                  setTimeout(
                                                    () =>
                                                      setRowFormulaPopoverIndex(
                                                        null
                                                      ),
                                                    150
                                                  );
                                              }}
                                            >
                                              <IconMathFunction className='h-3.5 w-3.5' />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent
                                            className='w-72 p-0 text-xs'
                                            align='start'
                                            side='right'
                                            onMouseEnter={() => {
                                              if (
                                                rowFormulaCloseTimeoutRef.current
                                              ) {
                                                clearTimeout(
                                                  rowFormulaCloseTimeoutRef.current
                                                );
                                                rowFormulaCloseTimeoutRef.current =
                                                  null;
                                              }
                                              setRowFormulaPopoverIndex(index);
                                            }}
                                            onMouseLeave={() => {
                                              rowFormulaCloseTimeoutRef.current =
                                                setTimeout(
                                                  () =>
                                                    setRowFormulaPopoverIndex(
                                                      null
                                                    ),
                                                  150
                                                );
                                            }}
                                          >
                                            <div className='border-b px-2.5 py-2 font-medium'>
                                              Formula (R{index + 1})
                                            </div>
                                            <div className='px-2.5 py-2'>
                                              <div className='rounded bg-muted px-2 py-1.5 font-mono text-[11px]'>
                                                {row.description ?? ''}
                                              </div>
                                              <p className='mt-2 text-muted-foreground'>
                                                Amount ={' '}
                                                {Number(
                                                  row.amount ?? 0
                                                ).toFixed(2)}
                                              </p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </div>
                                  </TableCell>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    onClick={() => insertRowAt(index)}
                                  >
                                    <IconRowInsertTop className='h-4 w-4' />
                                    Insert Row Above
                                  </ContextMenuItem>
                                  {index !== sayRowIndex && (
                                    <ContextMenuItem
                                      onClick={() => insertRowAt(index + 1)}
                                    >
                                      <IconRowInsertBottom className='h-4 w-4' />
                                      Insert Row Below
                                    </ContextMenuItem>
                                  )}
                                  <ContextMenuSeparator />
                                  <ContextMenuItem
                                    variant='destructive'
                                    onClick={() => deleteRow(index)}
                                  >
                                    <IconTrash className='h-4 w-4' />
                                    Delete Row
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                              <TableCell className='w-20 border border-border p-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary'>
                                {isEditMode ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-7 w-full justify-start truncate rounded-none px-1 text-xs font-normal focus-visible:ring-0'
                                      >
                                        {row.code || ''}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className='w-40 p-1'
                                      align='start'
                                    >
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                        onClick={() =>
                                          setDialogMode({
                                            type: 'row-item',
                                            rowIndex: index,
                                          })
                                        }
                                      >
                                        Item
                                      </Button>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                        onClick={() =>
                                          setDialogMode({
                                            type: 'row-material',
                                            rowIndex: index,
                                          })
                                        }
                                      >
                                        Material
                                      </Button>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className='block truncate px-1'>
                                    {row.code ?? ''}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className='border border-border p-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary'>
                                {isEditMode ? (
                                  <Input
                                    className='h-7 w-full rounded-none border-0 bg-transparent px-1 text-xs focus-visible:ring-0 focus-visible:ring-offset-0'
                                    value={row.description ?? ''}
                                    onChange={(e) =>
                                      updateRow(index, {
                                        description: e.target.value,
                                      })
                                    }
                                    placeholder='Name'
                                  />
                                ) : (
                                  <span
                                    className='block truncate px-1'
                                    title={row.description ?? ''}
                                  >
                                    {row.description ?? ''}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className='w-20 border border-border p-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary'>
                                {isEditMode ? (
                                  <Input
                                    type='number'
                                    inputMode='decimal'
                                    min={0}
                                    step={0.01}
                                    className='h-7 w-full rounded-none border-0 bg-transparent px-1 text-xs focus-visible:ring-0 focus-visible:ring-offset-0'
                                    value={hasRowCode ? row.quantity ?? '' : ''}
                                    onChange={(e) => {
                                      if (!hasRowCode) return;
                                      const v = parseFloat(e.target.value);
                                      updateRow(index, {
                                        quantity: Number.isNaN(v) ? 0 : v,
                                      });
                                    }}
                                    disabled={!hasRowCode}
                                  />
                                ) : (
                                  <span className='block px-1'>
                                    {hasRowCode ? row.quantity ?? '' : ''}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className='w-20 border border-border bg-muted/50 px-1'>
                                {row.rate ?? ''}
                              </TableCell>
                              <TableCell className='w-20 border border-border bg-muted/50 px-1'>
                                <div className='flex items-center gap-1'>
                                  <span>{row.amount ?? ''}</span>
                                  {(() => {
                                    const originalRow = justificationData.find(
                                      (r) => r.id === row.id
                                    );
                                    const originalAmount = originalRow?.amount;
                                    if (
                                      originalAmount !== undefined &&
                                      Number(originalAmount) !==
                                        Number(row.amount)
                                    ) {
                                      return (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className='inline-flex h-4 w-4 shrink-0 cursor-default items-center justify-center rounded-full bg-amber-100 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'>
                                                !
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side='top'>
                                              Original: {originalAmount}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className='w-14 border border-border bg-muted/50 px-1'>
                                {hasRowCode ? row.unit ?? '' : ''}
                              </TableCell>
                              <TableCell className='w-10 border border-border bg-muted/50 p-0'>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant='ghost'
                                      size='sm'
                                      className='h-7 w-full rounded-none px-1'
                                    >
                                      <IconDotsVertical className='h-4 w-4' />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align='end'>
                                    <DropdownMenuItem
                                      onClick={() => insertRowAt(index)}
                                    >
                                      <IconRowInsertTop className='h-4 w-4' />
                                      Insert Row Above
                                    </DropdownMenuItem>
                                    {index !== sayRowIndex && (
                                      <DropdownMenuItem
                                        onClick={() => insertRowAt(index + 1)}
                                      >
                                        <IconRowInsertBottom className='h-4 w-4' />
                                        Insert Row Below
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant='destructive'
                                      onClick={() => deleteRow(index)}
                                    >
                                      <IconTrash className='h-4 w-4' />
                                      Delete Row
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Sticky footer for charge options - always editable */}
                <div className='shrink-0 border-t bg-background px-3 py-2'>
                  <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                    {chargeOptions.map((opt) => (
                      <label
                        key={opt.id}
                        htmlFor={`charge-${opt.id}`}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 font-normal',
                          !opt.checked && 'text-muted-foreground'
                        )}
                      >
                        <Checkbox
                          id={`charge-${opt.id}`}
                          checked={opt.checked}
                          onCheckedChange={(checked) =>
                            updateChargeOption(opt.id, {
                              checked: checked === true,
                            })
                          }
                        />
                        <span className='text-sm'>{opt.label}</span>
                        <Input
                          type='string'
                          inputMode='decimal'
                          min={0}
                          step={0.01}
                          value={opt.value}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateChargeOption(opt.id, {
                              value: Number.isNaN(v) ? 0 : v,
                            });
                          }}
                          disabled={!opt.checked}
                          className='h-7 w-12 p-1 text-center text-sm'
                        />
                        <span className='text-sm text-muted-foreground'>
                          (%)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ItemSelectDialog
        open={dialogMode?.type === 'row-item'}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSelect={handleRowItemSelect}
      />
      <MaterialSelectDialog
        open={dialogMode?.type === 'row-material'}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSelect={handleRowMaterialSelect}
      />
    </div>
  );
}
