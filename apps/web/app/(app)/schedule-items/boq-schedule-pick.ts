import type { ProjectItemRowType } from '@/types/project-item';
import type { ScheduleTreeRow } from '@/app/(app)/schedule-items/types';
import { getReferenceScheduleLabelString } from '@/app/(app)/schedule-items/reference-schedule-labels';
import type { ItemDescriptionDoc } from './item-description-doc';
import { flattenItemDescription } from './item-description-doc';

/** What we store when a BOQ row picks a schedule leaf (tree dialog or catalog row). */
export type BoqSchedulePick = {
  treeRow: ScheduleTreeRow;
  itemDescriptionDoc: ItemDescriptionDoc;
  scheduleVersionLabel: string;
};

export function boqSchedulePickFromTreeLeaf(args: {
  row: ScheduleTreeRow;
  scheduleVersionLabel: string;
  hierarchyDescriptionDoc: ItemDescriptionDoc;
}): BoqSchedulePick {
  return {
    treeRow: args.row,
    itemDescriptionDoc: args.hierarchyDescriptionDoc,
    scheduleVersionLabel: args.scheduleVersionLabel,
  };
}

/** Reconstruct a leaf-shaped row from the BOQ sheet so pickers stay on `ScheduleTreeRow`. */
export function scheduleTreeRowFromProjectBoqRow(
  row: Pick<
    ProjectItemRowType,
    | 'schedule_item_id'
    | 'item_code'
    | 'item_description'
    | 'unit_display'
    | 'rate_amount'
    | 'reference_schedule_text'
  >
): ScheduleTreeRow {
  const ref = (row.reference_schedule_text ?? '').trim();
  return {
    id: String(row.schedule_item_id ?? ''),
    parent_item_id: null,
    code: row.item_code ?? '',
    description: flattenItemDescription(row.item_description),
    node_type: 'item',
    depth: 0,
    order_index: null,
    path_slug: null,
    rate: parseFloat(String(row.rate_amount ?? '0')) || 0,
    unit_symbol: row.unit_display || null,
    has_children: false,
    annotations: ref
      ? [
          {
            id: '__stub_ref',
            type: 'reference',
            raw_text: ref,
            order_index: null,
            metadata: {},
          },
        ]
      : [],
    rates: [],
  };
}

export function boqSchedulePickFromProjectBoqRow(
  row: ProjectItemRowType
): BoqSchedulePick {
  const treeRow = scheduleTreeRowFromProjectBoqRow(row);
  return {
    treeRow,
    itemDescriptionDoc: row.item_description,
    scheduleVersionLabel: String(row.schedule_name ?? '').trim(),
  };
}

export function buildPatchFromSchedulePick(
  pick: BoqSchedulePick
): Partial<ProjectItemRowType> {
  const treeRow = pick.treeRow;
  const referenceScheduleText = getReferenceScheduleLabelString(treeRow);
  const rate =
    typeof treeRow.rate === 'number' && Number.isFinite(treeRow.rate)
      ? treeRow.rate
      : 0;
  return {
    item_code: treeRow.code ?? '',
    reference_schedule_text: referenceScheduleText,
    schedule_name: pick.scheduleVersionLabel || null,
    item_description: pick.itemDescriptionDoc,
    unit_display: treeRow.unit_symbol ?? '',
    rate_amount: String(rate),
    schedule_item_id: treeRow.id,
  };
}
