import type { ScheduleTreeRow } from './types';

export type ScheduleTreeNode = {
  name: string;
  children?: string[];
  row: ScheduleTreeRow | null;
};

export const SCHEDULE_TREE_ROOT_ID = '__schedule_root__';

function formatNodeLabel(row: ScheduleTreeRow): string {
  const title = [row.code, row.description].filter(Boolean).join(' — ');
  if (!title) return row.id;
  if (row.rate != null && row.unit_symbol) {
    return `${title} (${row.rate} ${row.unit_symbol})`;
  }
  if (row.rate != null) {
    return `${title} (${row.rate})`;
  }
  return title;
}

export function buildScheduleTreeItems(
  rows: ScheduleTreeRow[],
  rootLabel: string,
): Record<string, ScheduleTreeNode> {
  const byParent = new Map<string | null, ScheduleTreeRow[]>();
  for (const row of rows) {
    const key = row.parent_item_id;
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }
  for (const [, list] of byParent) {
    list.sort((a, b) => {
      const oa = a.order_index ?? 0;
      const ob = b.order_index ?? 0;
      if (oa !== ob) return oa - ob;
      return a.code.localeCompare(b.code);
    });
  }

  const items: Record<string, ScheduleTreeNode> = {};
  const rootIds = (byParent.get(null) ?? []).map((r) => r.id);

  items[SCHEDULE_TREE_ROOT_ID] = {
    name: rootLabel,
    children: rootIds,
    row: null,
  };

  for (const row of rows) {
    const childIds = (byParent.get(row.id) ?? []).map((c) => c.id);
    items[row.id] = {
      name: formatNodeLabel(row),
      children: childIds.length > 0 ? childIds : undefined,
      row,
    };
  }

  return items;
}
