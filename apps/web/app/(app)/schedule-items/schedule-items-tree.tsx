'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  FolderOpen,
  InfoIcon,
  Layers,
  List,
  SquareMinus,
  SquarePlus,
  SearchX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useScheduleSourceVersions } from '@/app/(app)/schedules/hooks/use-schedule-source-versions-query';
import { fetchScheduleTreeChildren } from './api/schedule-tree-api';
import { useScheduleTreeRoots } from './hooks/use-schedule-tree-query';
import { useScheduleTreeSearch } from './hooks/use-schedule-tree-search-query';
import {
  normalizeScheduleNodeType,
  scheduleNodeTypeRowClasses,
} from './schedule-node-type-styles';
import type {
  ScheduleItemAnnotation,
  ScheduleItemContextRate,
  ScheduleNodeType,
  ScheduleTreeRow,
} from './types';
import { getReferenceScheduleLabelList } from './reference-schedule-labels';
import {
  ITEM_DESCRIPTION_DOC_VERSION,
  type ItemDescriptionDoc,
} from './item-description-doc';
import { HIERARCHY_BODY_CLASS } from './item-description-hierarchy';

const ROOT_PARENT_KEY = '__root__';
const INDENT_PX = 20;
const ROW_PAD_LEFT_BASE_PX = 6;

/** Root → leaf labels for persisting as project item description (walks `parent_item_id`). */
export function buildScheduleItemHierarchyPathLabel(
  leaf: ScheduleTreeRow,
  nodesById: Record<string, ScheduleTreeRow>
): string {
  const chainFromLeaf: ScheduleTreeRow[] = [];
  let cur: ScheduleTreeRow | undefined = leaf;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur.id)) {
      break;
    }
    seen.add(cur.id);
    chainFromLeaf.push(cur);
    const p: string | null = cur.parent_item_id;
    if (p == null || p.trim() === '') {
      break;
    }
    const nextId = p.trim();
    const next: ScheduleTreeRow | undefined = nodesById[nextId];
    if (!next) {
      break;
    }
    cur = next;
  }
  chainFromLeaf.reverse();
  return chainFromLeaf
    .map((r) => {
      const d = (r.description ?? '').trim();
      if (d) {
        return d;
      }
      return (r.code ?? '').trim();
    })
    .filter(Boolean)
    .join(' › ');
}

/** Root → leaf ids and labels for persisting structured BOQ item description (jsonb). */
export function buildScheduleItemHierarchyDescriptionDoc(
  leaf: ScheduleTreeRow,
  nodesById: Record<string, ScheduleTreeRow>
): ItemDescriptionDoc {
  const chainFromLeaf: ScheduleTreeRow[] = [];
  let cur: ScheduleTreeRow | undefined = leaf;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur.id)) {
      break;
    }
    seen.add(cur.id);
    chainFromLeaf.push(cur);
    const p: string | null = cur.parent_item_id;
    if (p == null || p.trim() === '') {
      break;
    }
    const nextId = p.trim();
    const next: ScheduleTreeRow | undefined = nodesById[nextId];
    if (!next) {
      break;
    }
    cur = next;
  }
  chainFromLeaf.reverse();
  const segments = chainFromLeaf.map((r) => {
    const d = (r.description ?? '').trim();
    const c = (r.code ?? '').trim();
    const label = d || c || r.id;
    return { id: r.id, label };
  });
  return {
    v: ITEM_DESCRIPTION_DOC_VERSION,
    leafScheduleItemId: leaf.id,
    segments,
  };
}

async function collectIdsToExpandUnderParent(
  rootId: string,
  loadRows: (parentId: string) => Promise<ScheduleTreeRow[]>
): Promise<Set<string>> {
  const ids = new Set<string>();
  ids.add(rootId);
  const frontier: string[] = [rootId];
  while (frontier.length > 0) {
    const pid = frontier.shift()!;
    const rows = await loadRows(pid);
    for (const r of rows) {
      if (r.has_children) {
        ids.add(r.id);
        frontier.push(r.id);
      }
    }
  }
  return ids;
}

const ROW_GRID_CLASS =
  'grid w-full min-w-0 flex-1 grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)_minmax(7rem,10rem)_minmax(8rem,11rem)] items-start gap-x-3 gap-y-0.5';

const TREE_CONTROL_CELL_CLASS =
  'inline-flex h-5 w-8 shrink-0 items-center justify-center';

const TREE_TYPE_ICON_CELL_CLASS =
  'inline-flex h-5 w-8 shrink-0 items-center justify-center';

function formatRateNumber(rate: number | null): string {
  if (rate == null) return '';
  const n = Number(rate);
  return Number.isFinite(n)
    ? n % 1 === 0
      ? String(n)
      : n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : String(rate);
}

function formatContextRateDisplay(entry: ScheduleItemContextRate): string {
  const d = entry.rate_display?.trim();
  if (d) return d;
  return formatRateNumber(entry.rate);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;
  const normalizedText = text.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedText === normalizedQuery) {
    return (
      <mark className='bg-emerald-200/80 text-emerald-900 dark:bg-emerald-500/35 dark:text-emerald-100 rounded px-0.5 py-0'>
        {text}
      </mark>
    );
  }
  const pattern = new RegExp(`(${escapeRegExp(query)})`, 'ig');
  const parts = text.split(pattern);
  if (parts.length <= 1) return text;
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className='bg-amber-200/70 dark:bg-amber-500/35 rounded px-0.5 py-0'
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function parentKey(parentId: string | null): string {
  return parentId ?? ROOT_PARENT_KEY;
}

function isExpandSubtreeModifier(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

function ScheduleRowTreeControl({
  row,
  isExpanded,
  rowLabel,
  onToggle,
  showExpandShortcutTooltip,
}: {
  row: ScheduleTreeRow;
  isExpanded: boolean;
  rowLabel: string;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  showExpandShortcutTooltip: boolean;
}) {
  const shell = cn(
    TREE_CONTROL_CELL_CLASS,
    'rounded-md border border-transparent transition-colors'
  );
  if (!row.has_children) {
    return <span className={shell} aria-hidden />;
  }
  const expandHint =
    'Hold ⌘ (Mac) or Ctrl (Windows) and click to expand this branch fully.';
  const button = (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className={cn(
        shell,
        'text-muted-foreground h-5 min-h-5 px-0 py-0 font-normal'
      )}
      aria-expanded={isExpanded}
      aria-label={
        isExpanded
          ? `Collapse ${rowLabel}`
          : showExpandShortcutTooltip
            ? `Expand ${rowLabel}. Command- or Control-click to expand this branch fully.`
            : `Expand ${rowLabel}`
      }
      onClick={onToggle}
    >
      {isExpanded ? (
        <SquareMinus
          className='pointer-events-none size-3 shrink-0'
          aria-hidden
        />
      ) : (
        <SquarePlus
          className='pointer-events-none size-3 shrink-0'
          aria-hidden
        />
      )}
    </Button>
  );
  if (!showExpandShortcutTooltip) {
    return button;
  }
  const tooltipText = isExpanded
    ? 'Collapse this row.'
    : `Expand one level. ${expandHint}`;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span className='inline-flex'>{button}</span>
      </TooltipTrigger>
      <TooltipContent
        side='right'
        align='start'
        sideOffset={6}
        className='max-w-[16rem] text-xs leading-snug'
      >
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

function ScheduleRowNodeTypeIcon({ kind }: { kind: ScheduleNodeType }) {
  if (kind === 'section') {
    return (
      <span
        className={TREE_TYPE_ICON_CELL_CLASS}
        title='Section'
        aria-label='Section'
      >
        <Layers
          className='text-muted-foreground pointer-events-none size-3.5 shrink-0'
          aria-hidden
        />
      </span>
    );
  }
  if (kind === 'group') {
    return (
      <span
        className={TREE_TYPE_ICON_CELL_CLASS}
        title='Group'
        aria-label='Group'
      >
        <FolderOpen
          className='text-muted-foreground pointer-events-none size-3.5 shrink-0'
          aria-hidden
        />
      </span>
    );
  }
  return <span className={TREE_TYPE_ICON_CELL_CLASS} aria-hidden />;
}

function ScheduleTreeRateCell({
  row,
  rateClassName,
}: {
  row: ScheduleTreeRow;
  rateClassName: string;
}) {
  const contextualRates = row.rates ?? [];
  const hasContextualRates = contextualRates.length > 0;
  const unit = row.unit_symbol?.trim();

  if (row.rate == null && !hasContextualRates) {
    return null;
  }

  if (!hasContextualRates) {
    return (
      <span className={rateClassName}>
        {row.rate == null ? null : (
          <>
            {formatRateNumber(row.rate)}
            {unit ? (
              <span className='text-muted-foreground'> {unit}</span>
            ) : null}
          </>
        )}
      </span>
    );
  }

  const rowLabel = row.code?.trim() || row.description?.trim() || 'item';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            rateClassName,
            'inline-flex max-w-full min-w-0 items-baseline justify-end gap-1 rounded-sm text-right underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={`View ${contextualRates.length} contextual rates for ${rowLabel}`}
        >
          <List
            className='text-muted-foreground size-3 shrink-0 self-center'
            aria-hidden
          />
          {row.rate != null ? (
            <>
              {formatRateNumber(row.rate)}
              {unit ? (
                <span className='text-muted-foreground'> {unit}</span>
              ) : null}
            </>
          ) : (
            <span className='text-muted-foreground'>Rates</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='w-auto max-w-[min(24rem,calc(100vw-2rem))] p-0'
      >
        <div className='border-border text-muted-foreground border-b px-3 py-2 text-xs font-medium'>
          Various Rates by Context
        </div>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-border text-muted-foreground border-b text-left text-xs'>
              <th className='px-3 py-1.5 font-normal'>Context</th>
              <th className='px-3 py-1.5 text-right font-normal'>Rate</th>
            </tr>
          </thead>
          <tbody>
            {contextualRates.map((r, index) => (
              <tr
                key={r.id ? `${r.id}-${index}` : `${r.context}-${index}`}
                className='border-border/60 border-b last:border-0'
              >
                <td
                  className={cn(
                    'max-w-[14rem] px-3 py-1.5',
                    HIERARCHY_BODY_CLASS
                  )}
                >
                  {r.label?.trim() || r.context}
                </td>
                <td className='px-3 py-1.5 text-right tabular-nums whitespace-nowrap'>
                  {formatContextRateDisplay(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}

function ScheduleRowAnnotationsTooltip({
  annotations,
}: {
  annotations: ScheduleItemAnnotation[];
}) {
  const count = annotations.length;
  const label =
    count === 1
      ? '1 annotation — hover for details'
      : `${count} annotations — hover for details`;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          className='-my-0.5 h-5 w-5 min-h-5 min-w-5 shrink-0 p-0 text-muted-foreground'
          aria-label={label}
        >
          <InfoIcon className='h-3.5 w-3.5' />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side='right'
        align='start'
        sideOffset={8}
        className={cn(
          'max-h-[min(70vh,22rem)] max-w-md overflow-y-auto p-3 text-left',
          HIERARCHY_BODY_CLASS
        )}
      >
        <ul className='m-0 list-none space-y-3 p-0'>
          {annotations.map((ann) => (
            <li key={ann.id} className='border-background/30 border-l-2 pl-2.5'>
              <div className='text-[10px] font-semibold uppercase tracking-wide opacity-90'>
                {ann.type}
              </div>
              <div className='mt-1 whitespace-pre-wrap break-words leading-relaxed'>
                {ann.raw_text}
              </div>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function getNonReferenceAnnotations(
  annotations: ScheduleItemAnnotation[]
): ScheduleItemAnnotation[] {
  return annotations.filter((annotation) => annotation.type !== 'reference');
}

type VisibleRow =
  | { type: 'node'; id: string; level: number }
  | { type: 'loading'; parentId: string; level: number };

function ScheduleTreeColumnHeader({
  onCollapseAll,
  collapseAllDisabled,
}: {
  onCollapseAll: () => void;
  collapseAllDisabled: boolean;
}) {
  return (
    <div className='border-border bg-muted/80 supports-[backdrop-filter]:bg-muted/60 sticky top-0 z-10 flex w-full min-w-0 items-center gap-0.5 border-b px-1.5 py-1 backdrop-blur-sm'>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={cn(
              TREE_CONTROL_CELL_CLASS,
              'text-muted-foreground h-5 min-h-5 px-0 py-0 font-normal'
            )}
            aria-label='Collapse all'
            disabled={collapseAllDisabled}
            onClick={onCollapseAll}
          >
            <SquareMinus
              className='pointer-events-none size-3 shrink-0'
              aria-hidden
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' align='start' sideOffset={4}>
          Collapse all
        </TooltipContent>
      </Tooltip>
      <span className={TREE_TYPE_ICON_CELL_CLASS} aria-hidden />
      <div
        className={`${ROW_GRID_CLASS} text-muted-foreground text-[10px] font-medium uppercase tracking-wide`}
        aria-hidden
      >
        <span>Code</span>
        <span>Name</span>
        <span>Reference Schedule</span>
        <span className='text-end'>Rate</span>
      </div>
    </div>
  );
}

function versionLabel(v: { display_name: string | null; year: number | null }) {
  const name = v.display_name?.trim() || 'Unnamed version';
  if (v.year != null) return `${name} (${v.year})`;
  return name;
}

export type ScheduleItemsTreeProps = {
  /**
   * When set, leaf rows (`!has_children`) use a clickable name: choosing calls
   * this with the schedule item row (same `id` as `schedule_items` / BOQ picker).
   */
  onSelectLeaf?: (args: {
    row: ScheduleTreeRow;
    scheduleVersionLabel: string;
    /** Root → leaf path (e.g. `Section › Group › Item`) for search / legacy display. */
    hierarchyPathLabel: string;
    /** Structured path for `project_boq_lines.item_description` (jsonb). */
    hierarchyDescriptionDoc: ItemDescriptionDoc;
  }) => void;
  /** Sticky header offset for embedding in a dialog (no app shell header). */
  embedded?: boolean;
  className?: string;
};

export function ScheduleItemsTree({
  onSelectLeaf,
  embedded = false,
  className,
}: ScheduleItemsTreeProps = {}) {
  const {
    data: versions,
    isLoading: versionsLoading,
    error: versionsError,
  } = useScheduleSourceVersions();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nodesById, setNodesById] = useState<Record<string, ScheduleTreeRow>>(
    {}
  );
  const [childrenByParent, setChildrenByParent] = useState<
    Record<string, string[]>
  >({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingParentKeys, setLoadingParentKeys] = useState<Set<string>>(
    new Set()
  );
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const loadedParentKeysRef = useRef<Set<string>>(new Set());
  const parentChildrenCacheRef = useRef<Record<string, ScheduleTreeRow[]>>({});
  const loadChildrenPromisesRef = useRef<
    Record<string, Promise<ScheduleTreeRow[]>>
  >({});

  useEffect(() => {
    if (versionId !== null || !versions?.length) return;
    setVersionId(versions[0]!.id);
  }, [versions, versionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    loadedParentKeysRef.current = new Set();
    parentChildrenCacheRef.current = {};
    loadChildrenPromisesRef.current = {};
    setNodesById({});
    setChildrenByParent({});
    setExpandedIds(new Set());
    setLoadingParentKeys(new Set());
    setMatchedIds(new Set());
    setSearchText('');
    setDebouncedSearch('');
  }, [versionId]);

  const rootsQuery = useScheduleTreeRoots(versionId);

  const searchQuery = useScheduleTreeSearch(versionId, debouncedSearch, 60);

  const scheduleVersionLabelForPick = useMemo(() => {
    if (!versions?.length || !versionId) {
      return '';
    }
    const v = versions.find((x) => x.id === versionId);
    return v ? versionLabel(v) : '';
  }, [versions, versionId]);

  const upsertRows = useCallback((rows: ScheduleTreeRow[]) => {
    if (rows.length === 0) return;
    setNodesById((prev) => {
      const next = { ...prev };
      for (const row of rows) next[row.id] = row;
      return next;
    });
  }, []);

  useEffect(() => {
    const roots = rootsQuery.data ?? [];
    if (!versionId || roots.length === 0) return;
    upsertRows(roots);
    parentChildrenCacheRef.current[ROOT_PARENT_KEY] = roots;
    setChildrenByParent((prev) => ({
      ...prev,
      [ROOT_PARENT_KEY]: roots.map((r) => r.id),
    }));
    loadedParentKeysRef.current.add(ROOT_PARENT_KEY);
  }, [rootsQuery.data, upsertRows, versionId]);

  const loadChildrenRowsForParent = useCallback(
    async (parentId: string | null): Promise<ScheduleTreeRow[]> => {
      if (!versionId || parentId === null) return [];
      const key = parentKey(parentId);
      if (loadedParentKeysRef.current.has(key)) {
        return parentChildrenCacheRef.current[key] ?? [];
      }
      let pending = loadChildrenPromisesRef.current[key];
      if (!pending) {
        pending = (async (): Promise<ScheduleTreeRow[]> => {
          setLoadingParentKeys((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          try {
            const rows = await fetchScheduleTreeChildren(
              createSupabaseBrowserClient(),
              versionId,
              parentId
            );
            upsertRows(rows);
            setChildrenByParent((prev) => ({
              ...prev,
              [key]: rows.map((row) => row.id),
            }));
            loadedParentKeysRef.current.add(key);
            parentChildrenCacheRef.current[key] = rows;
            return rows;
          } finally {
            setLoadingParentKeys((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            delete loadChildrenPromisesRef.current[key];
          }
        })();
        loadChildrenPromisesRef.current[key] = pending;
      }
      return pending;
    },
    [upsertRows, versionId]
  );

  const ensureParentLoaded = useCallback(
    async (parentId: string | null) => {
      await loadChildrenRowsForParent(parentId);
    },
    [loadChildrenRowsForParent]
  );

  const handleToggle = useCallback(
    async (row: ScheduleTreeRow, event: MouseEvent<HTMLButtonElement>) => {
      if (!row.has_children) return;
      const id = row.id;
      const isExpanded = expandedIds.has(id);
      if (isExpanded) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }
      const expandSubtree = isExpandSubtreeModifier(event);
      if (expandSubtree) {
        const toExpand = await collectIdsToExpandUnderParent(
          id,
          loadChildrenRowsForParent
        );
        setExpandedIds((prev) => {
          const next = new Set(prev);
          toExpand.forEach((x) => next.add(x));
          return next;
        });
        return;
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      await loadChildrenRowsForParent(id);
    },
    [expandedIds, loadChildrenRowsForParent]
  );

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setMatchedIds(new Set());
      return;
    }
    const results = searchQuery.data ?? [];
    if (results.length === 0) {
      setMatchedIds(new Set());
      return;
    }
    let cancelled = false;
    const nextMatched = new Set(results.map((row) => row.id));
    const ancestorIds = new Set<string>();
    for (const row of results) {
      row.ancestor_ids.forEach((id) => ancestorIds.add(id));
    }
    upsertRows(
      results.map((hit) => {
        const { ancestor_ids: _ids, ...row } = hit;
        return row;
      })
    );
    setMatchedIds(nextMatched);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ancestorIds.forEach((id) => next.add(id));
      return next;
    });
    void (async () => {
      const toLoad = Array.from(ancestorIds);
      for (const id of toLoad) {
        if (cancelled) return;
        await ensureParentLoaded(id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, ensureParentLoaded, searchQuery.data, upsertRows]);

  const visibleRows = useMemo<VisibleRow[]>(() => {
    const rootIds = childrenByParent[ROOT_PARENT_KEY] ?? [];
    const rows: VisibleRow[] = [];
    const isSearchActive = debouncedSearch.length >= 2;
    const allowedIds = new Set<string>();
    if (isSearchActive) {
      for (const id of matchedIds) allowedIds.add(id);
      for (const result of searchQuery.data ?? []) {
        result.ancestor_ids.forEach((id) => allowedIds.add(id));
      }
    }

    function walk(ids: string[], level: number) {
      for (const id of ids) {
        if (isSearchActive && !allowedIds.has(id)) continue;
        rows.push({ type: 'node', id, level });
        const shouldWalkChildren = isSearchActive || expandedIds.has(id);
        if (!shouldWalkChildren) continue;
        const key = parentKey(id);
        if (loadingParentKeys.has(key)) {
          rows.push({ type: 'loading', parentId: id, level: level + 1 });
          continue;
        }
        const childIds = childrenByParent[key] ?? [];
        walk(childIds, level + 1);
      }
    }

    walk(rootIds, 0);
    return rows;
  }, [
    childrenByParent,
    debouncedSearch,
    expandedIds,
    loadingParentKeys,
    matchedIds,
    searchQuery.data,
  ]);

  const showSearchHelp =
    debouncedSearch.length > 0 && debouncedSearch.length < 2;
  const isSearchActive = debouncedSearch.length >= 2;
  const hasNoSearchMatches =
    isSearchActive && !searchQuery.isFetching && matchedIds.size === 0;
  const handleCollapseAll = useCallback(() => {
    if (isSearchActive) {
      const searchAncestors = new Set<string>();
      for (const result of searchQuery.data ?? []) {
        result.ancestor_ids.forEach((id) => searchAncestors.add(id));
      }
      setExpandedIds(searchAncestors);
      return;
    }
    setExpandedIds(new Set());
  }, [isSearchActive, searchQuery.data]);

  const handleSelectLeafRow = useCallback(
    (row: ScheduleTreeRow) => {
      if (!onSelectLeaf || row.has_children) {
        return;
      }
      onSelectLeaf({
        row,
        scheduleVersionLabel: scheduleVersionLabelForPick,
        hierarchyPathLabel: buildScheduleItemHierarchyPathLabel(row, nodesById),
        hierarchyDescriptionDoc: buildScheduleItemHierarchyDescriptionDoc(
          row,
          nodesById
        ),
      });
    },
    [nodesById, onSelectLeaf, scheduleVersionLabelForPick]
  );

  const stickyTopClass = embedded
    ? 'sticky top-0 z-20'
    : 'sticky top-[var(--header-height)] z-20';

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-0', className)}
      >
        <div
          className={cn(
            'bg-background/95 supports-[backdrop-filter]:bg-background/80 grid w-full min-w-0 gap-1.5 py-1.5 backdrop-blur sm:grid-cols-[minmax(18rem,32rem)_minmax(12rem,1fr)] sm:items-end',
            stickyTopClass
          )}
        >
          <div className='flex min-w-0 w-full flex-col gap-0'>
            <div className='flex w-full min-w-0 items-center gap-2'>
              <div className='min-w-[12rem] flex-1 sm:min-w-[18rem]'>
                <SearchInput
                  id='schedule-search'
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onClear={() => setSearchText('')}
                  placeholder='Search by code or description (min 2 chars)'
                  className='w-full'
                />
              </div>
              {showSearchHelp ? (
                <span className='text-muted-foreground shrink-0 text-xs whitespace-nowrap'>
                  Type at least 2 characters.
                </span>
              ) : debouncedSearch.length >= 2 ? (
                <span className='text-muted-foreground shrink-0 text-xs whitespace-nowrap'>
                  {searchQuery.isFetching
                    ? 'Searching…'
                    : `${matchedIds.size} matches`}
                </span>
              ) : null}
            </div>
          </div>
          <div className='flex min-w-0 flex-col gap-0 sm:justify-self-end'>
            {versionsLoading ? (
              <Skeleton className='h-7 w-full max-w-md sm:ms-auto' />
            ) : versionsError ? (
              <p className='text-destructive text-sm'>
                {versionsError.message}
              </p>
            ) : !versions?.length ? (
              <p className='text-muted-foreground text-sm'>
                No schedule versions yet. Ingest schedule data to populate the
                tree.
              </p>
            ) : (
              <Tabs
                id='schedule-version-tabs'
                value={versionId ?? versions[0]!.id}
                onValueChange={setVersionId}
                className='min-w-0 gap-0'
              >
                <ScrollableTabs
                  activeValue={versionId ?? versions[0]!.id}
                  className='min-w-0 max-w-full sm:ms-auto'
                >
                  <TabsList className='flex h-auto w-max min-w-0 bg-muted p-1'>
                    {versions.map((v) => (
                      <TabsTrigger
                        key={v.id}
                        value={v.id}
                        className='px-2 py-1 text-xs data-[state=active]:bg-background'
                      >
                        {versionLabel(v)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollableTabs>
              </Tabs>
            )}
          </div>
        </div>

        <div className='mt-1 flex min-h-0 min-w-0 flex-1 flex-col md:mt-1'>
          {!versionId ? null : rootsQuery.isLoading ? (
            <Skeleton className='min-h-[50vh] w-full flex-1 rounded-lg' />
          ) : rootsQuery.error ? (
            <p className='text-destructive text-sm'>
              {rootsQuery.error.message}
            </p>
          ) : (childrenByParent[ROOT_PARENT_KEY] ?? []).length === 0 ? (
            <div className='border-border bg-muted/10 text-muted-foreground flex min-h-[40vh] w-full flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm'>
              <FolderOpen className='h-8 w-8 text-muted-foreground/30' />
              <p>No items in this version.</p>
            </div>
          ) : (
            <div className='border-border bg-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border shadow-sm'>
              <div className='min-h-0 flex-1 overflow-auto px-0 py-0'>
                <ScheduleTreeColumnHeader
                  onCollapseAll={handleCollapseAll}
                  collapseAllDisabled={!versionId || expandedIds.size === 0}
                />
                <div className='w-full min-w-0 pb-1.5 pt-0.5 md:pb-2 md:pt-1'>
                  {hasNoSearchMatches ? (
                    <div className='text-muted-foreground flex flex-col items-center justify-center gap-1.5 px-1.5 py-8 text-sm'>
                      <SearchX className='h-6 w-6 text-muted-foreground/50' />
                      <p>
                        No matches for &quot;
                        <span className='text-foreground font-medium'>
                          {debouncedSearch}
                        </span>
                        &quot;.
                      </p>
                      <p className='text-xs'>
                        Try a shorter term or search by item code.
                      </p>
                    </div>
                  ) : (
                    visibleRows.map((entry) => {
                      if (entry.type === 'loading') {
                        return (
                          <div
                            key={`loading:${entry.parentId}`}
                            className='bg-background flex w-full min-w-0 items-start gap-0.5 px-1.5 py-0.5'
                            style={{
                              paddingLeft: `${entry.level * INDENT_PX + ROW_PAD_LEFT_BASE_PX}px`,
                            }}
                            aria-busy='true'
                          >
                            <span className='sr-only'>Loading children</span>
                            <span
                              className={cn(TREE_CONTROL_CELL_CLASS, 'px-0')}
                              aria-hidden
                            >
                              <Skeleton className='h-4 w-8 rounded' />
                            </span>
                            <span
                              className={TREE_TYPE_ICON_CELL_CLASS}
                              aria-hidden
                            />
                            <div className={ROW_GRID_CLASS}>
                              <Skeleton className='h-3 w-12' />
                              <div className='flex min-w-0 flex-col gap-0.5'>
                                <Skeleton className='h-3 w-full' />
                                <Skeleton className='h-3 w-4/5 max-w-md' />
                              </div>
                              <Skeleton className='h-3 w-16' />
                              <Skeleton className='h-3 w-14 justify-self-end' />
                            </div>
                          </div>
                        );
                      }
                      const row = nodesById[entry.id];
                      if (!row) return null;
                      const isExpanded = expandedIds.has(row.id);
                      const isMatched = matchedIds.has(row.id);
                      const highlightQuery = isSearchActive
                        ? debouncedSearch
                        : '';
                      const rowLabel =
                        row.code?.trim() || row.description?.trim() || 'item';
                      const nodeKind = normalizeScheduleNodeType(row.node_type);
                      const typeStyles = scheduleNodeTypeRowClasses(nodeKind);
                      const detailAnnotations = getNonReferenceAnnotations(
                        row.annotations
                      );
                      const referenceLabels =
                        getReferenceScheduleLabelList(row);
                      const isLeafSelectable = Boolean(
                        onSelectLeaf && !row.has_children
                      );
                      const nameBody = (
                        <span className='min-w-0 break-words [overflow-wrap:anywhere]'>
                          {row.description
                            ? highlightText(row.description, highlightQuery)
                            : '—'}
                        </span>
                      );
                      return (
                        <div
                          key={row.id}
                          className={`group flex w-full min-w-0 select-text items-start gap-0.5 rounded-sm px-1.5 py-0.5 text-left transition-colors ${
                            isMatched
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:hover:bg-amber-500/30'
                              : 'bg-background hover:bg-accent/60'
                          }`}
                          style={{
                            paddingLeft: `${entry.level * INDENT_PX + ROW_PAD_LEFT_BASE_PX}px`,
                          }}
                        >
                          <ScheduleRowTreeControl
                            row={row}
                            isExpanded={isExpanded}
                            rowLabel={rowLabel}
                            onToggle={(e) => void handleToggle(row, e)}
                            showExpandShortcutTooltip={entry.level === 0}
                          />
                          <ScheduleRowNodeTypeIcon kind={nodeKind} />
                          <div className={ROW_GRID_CLASS}>
                            <span className={typeStyles.code} title={row.code}>
                              {row.code
                                ? highlightText(row.code, highlightQuery)
                                : '—'}
                            </span>
                            <span
                              className={cn(
                                'min-w-0',
                                !isLeafSelectable ? typeStyles.name : undefined
                              )}
                              title={row.description}
                            >
                              <span className='inline-flex min-w-0 items-start gap-x-1'>
                                {detailAnnotations.length > 0 ? (
                                  <span className='shrink-0 pt-0.5'>
                                    <ScheduleRowAnnotationsTooltip
                                      annotations={detailAnnotations}
                                    />
                                  </span>
                                ) : null}
                                {isLeafSelectable ? (
                                  <button
                                    type='button'
                                    className={cn(
                                      typeStyles.name,
                                      'min-w-0 cursor-pointer rounded-sm text-left',
                                      'underline-offset-2 hover:underline',
                                      'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
                                    )}
                                    aria-label={`Select schedule item: ${rowLabel}`}
                                    title='Select this item'
                                    onClick={() => {
                                      handleSelectLeafRow(row);
                                    }}
                                  >
                                    {nameBody}
                                  </button>
                                ) : (
                                  nameBody
                                )}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'text-muted-foreground min-w-0 truncate',
                                HIERARCHY_BODY_CLASS
                              )}
                              title={
                                referenceLabels.length > 0
                                  ? referenceLabels.join(', ')
                                  : undefined
                              }
                            >
                              {referenceLabels.length > 0
                                ? referenceLabels.join(', ')
                                : '—'}
                            </span>
                            <ScheduleTreeRateCell
                              row={row}
                              rateClassName={typeStyles.rate}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
