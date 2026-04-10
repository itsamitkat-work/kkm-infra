'use client';

import { useEffect, useMemo, useState } from 'react';
import { hotkeysCoreFeature, syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Tree, TreeItem, TreeItemLabel } from '@/components/reui/tree';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildScheduleTreeItems,
  SCHEDULE_TREE_ROOT_ID,
  type ScheduleTreeNode,
} from './build-schedule-tree';
import type { ScheduleTreeRow } from './types';
import {
  useScheduleSourceVersions,
  useScheduleTreeRows,
} from './use-schedule-items-tree-data';

const indent = 24;

const MAX_INITIAL_EXPANDED = 48;

const ROW_GRID_CLASS =
  'grid w-full min-w-0 flex-1 grid-cols-[minmax(5rem,7.5rem)_minmax(0,1fr)_minmax(5.5rem,8rem)_minmax(4.5rem,6.5rem)] items-center gap-x-3';

const TOGGLE_GAP_CLASS = 'w-7 shrink-0';

function formatRate(rate: number | null, unit: string | null): string {
  if (rate == null) return '—';
  const n = Number(rate);
  const formatted = Number.isFinite(n)
    ? n % 1 === 0
      ? String(n)
      : n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : String(rate);
  return unit ? `${formatted} ${unit}` : formatted;
}

function ScheduleTreeColumnHeader() {
  return (
    <div
      className="border-border bg-muted/80 supports-[backdrop-filter]:bg-muted/60 sticky top-0 z-10 flex w-full min-w-0 items-center gap-1 border-b px-2 py-2 backdrop-blur-sm"
      aria-hidden
    >
      <div className={TOGGLE_GAP_CLASS} />
      <div
        className={`${ROW_GRID_CLASS} text-muted-foreground text-xs font-medium uppercase tracking-wide`}
      >
        <span>Code</span>
        <span>Name</span>
        <span className="text-end">Rate</span>
        <span>Type</span>
      </div>
    </div>
  );
}

function versionLabel(v: { display_name: string | null; year: number | null }) {
  const name = v.display_name?.trim() || 'Unnamed version';
  if (v.year != null) return `${name} (${v.year})`;
  return name;
}

function ScheduleTreeBody({ rows }: { rows: ScheduleTreeRow[] }) {
  const { items, initialExpanded } = useMemo(() => {
    const label = rows[0]?.source_version_display_name ?? 'Schedule';
    const built = buildScheduleTreeItems(rows, label);
    const roots = built[SCHEDULE_TREE_ROOT_ID]?.children ?? [];
    return {
      items: built,
      initialExpanded: roots.slice(0, MAX_INITIAL_EXPANDED),
    };
  }, [rows]);

  const tree = useTree<ScheduleTreeNode>({
    initialState: {
      expandedItems: initialExpanded,
    },
    indent,
    rootItemId: SCHEDULE_TREE_ROOT_ID,
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) =>
        items[itemId] ?? {
          name: '…',
          children: [],
          row: null,
        },
      getChildren: (itemId) => items[itemId]?.children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
  });

  return (
    <div className="border-border bg-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto px-2 py-0 md:px-4 md:py-0">
        <ScheduleTreeColumnHeader />
        <Tree
          indent={indent}
          tree={tree}
          toggleIconType="plus-minus"
          className="w-full min-w-0 pb-3 pt-1 md:pb-4 md:pt-2"
        >
          {tree.getItems().map((item) => {
            const id = item.getId();
            const data = item.getItemData();
            const isRoot = id === SCHEDULE_TREE_ROOT_ID;
            const row = data.row;

            const rowContent =
              isRoot || !row ? (
                <div className={ROW_GRID_CLASS}>
                  <span className="text-foreground col-span-4 truncate text-sm font-semibold">
                    {data.name}
                  </span>
                </div>
              ) : (
                <div className={ROW_GRID_CLASS}>
                  <span
                    className="text-muted-foreground font-mono text-xs tabular-nums"
                    title={row.code}
                  >
                    {row.code || '—'}
                  </span>
                  <span
                    className="text-foreground min-w-0 text-sm leading-snug"
                    title={row.description}
                  >
                    <span className="line-clamp-2 break-words">
                      {row.description || '—'}
                    </span>
                  </span>
                  <span className="text-end font-mono text-sm tabular-nums">
                    {formatRate(row.rate, row.unit_symbol)}
                  </span>
                  <span className="text-muted-foreground truncate text-xs capitalize">
                    {row.node_type}
                  </span>
                </div>
              );

            return (
              <TreeItem key={id} item={item} asChild>
                <div className="w-full min-w-0">
                  <TreeItemLabel className="w-full min-w-0 items-center gap-1 py-1">
                    {rowContent}
                  </TreeItemLabel>
                </div>
              </TreeItem>
            );
          })}
        </Tree>
      </div>
    </div>
  );
}

export function ScheduleItemsTree() {
  const { data: versions, isLoading: versionsLoading, error: versionsError } =
    useScheduleSourceVersions();
  const [versionId, setVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (versionId !== null || !versions?.length) return;
    setVersionId(versions[0]!.id);
  }, [versions, versionId]);

  const {
    data: rows = [],
    isLoading: rowsLoading,
    error: rowsError,
  } = useScheduleTreeRows(versionId);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
      <div className="border-border bg-muted/40 flex w-full min-w-0 flex-col gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between sm:py-3.5">
        <label
          className="text-muted-foreground shrink-0 text-xs font-medium uppercase tracking-wide sm:pt-1"
          htmlFor="schedule-version"
        >
          Schedule version
        </label>
        <div className="flex min-w-0 flex-1 sm:max-w-md sm:flex-none lg:max-w-lg">
          {versionsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : versionsError ? (
            <p className="text-destructive text-sm">{versionsError.message}</p>
          ) : !versions?.length ? (
            <p className="text-muted-foreground text-sm">
              No schedule versions yet. Ingest schedule data to populate the
              tree.
            </p>
          ) : (
            <Select
              value={versionId ?? undefined}
              onValueChange={(v) => setVersionId(v)}
            >
              <SelectTrigger id="schedule-version" className="h-10 w-full">
                <SelectValue placeholder="Choose version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {versionLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col md:mt-5">
        {!versionId ? null : rowsLoading ? (
          <Skeleton className="min-h-[50vh] w-full flex-1 rounded-lg" />
        ) : rowsError ? (
          <p className="text-destructive text-sm">{rowsError.message}</p>
        ) : rows.length === 0 ? (
          <div className="border-border bg-muted/20 text-muted-foreground flex min-h-[40vh] w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm">
            No items in this version.
          </div>
        ) : (
          <ScheduleTreeBody key={versionId} rows={rows} />
        )}
      </div>
    </div>
  );
}
