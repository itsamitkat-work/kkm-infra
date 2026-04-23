import type { Database } from '@kkm/db';
import z from 'zod';

type BoqRow = Database['public']['Tables']['project_boq_lines']['Row'];

type ProjectBoqLineSegmentLinkRow =
  Database['public']['Tables']['project_boq_line_segments']['Row'];

/** `project_boq_line_segments.project_segment_id` → `project_segments.id`. */
export type ProjectBoqLineSegmentId = ProjectBoqLineSegmentLinkRow['project_segment_id'];

type ScheduleSourcesRow = Database['public']['Tables']['schedule_sources']['Row'];

/**
 * Schedule label for the sheet row: same text family as `schedule_sources.display_name` /
 * `schedule_sources.name`, resolved via `schedule_items` (`fetchScheduleDisplayNames` in project-boq-repo).
 * Not a column on `project_boq_lines`.
 */
export type ProjectItemScheduleName =
  ScheduleSourcesRow['display_name'] | ScheduleSourcesRow['name'];

/**
 * BOQ line as returned from list/detail APIs (`mapBoqToProjectItem`). Field names follow
 * `project_boq_lines` / junctions where applicable; `rate_amount` / `contract_quantity` are numbers here.
 */
export interface ProjectItem {
  id: BoqRow['id'];
  schedule_item_id: BoqRow['schedule_item_id'];
  project_id: BoqRow['project_id'];
  work_order_number: BoqRow['work_order_number'] | number;
  item_code: BoqRow['item_code'];
  /** Denormalized snapshot of schedule reference annotations (see `reference_schedule_text` on BOQ). */
  reference_schedule_text: string;
  item_description: BoqRow['item_description'];
  unit_display: BoqRow['unit_display'];
  rate_amount: NonNullable<BoqRow['rate_amount']> | null;
  contract_quantity: BoqRow['contract_quantity'];
  estimate_quantity?: number;
  measurment_quantity?: number;
  schedule_name: ProjectItemScheduleName;
  project_segment_ids: ProjectBoqLineSegmentId[];
  remark: NonNullable<BoqRow['remark']> | null;
  /** `project_boq_lines.order_key` — used for row ordering. */
  order_key: BoqRow['order_key'];
}

/**
 * Editable BOQ sheet row: DB-aligned keys from `project_boq_lines` where the cell stores the same meaning;
 * `rate_amount` / `contract_quantity` are strings in the grid; FE-only flags use snake_case.
 */
export const projectItemZodSchema = z.object({
  id: z.string(),
  work_order_number: z
    .string()
    .min(1, 'Wo. No. is required and cannot be empty.'),
  schedule_item_id: z.string().nullable().optional(),
  item_code: z.string().min(1, 'Code cannot be empty.'),
  reference_schedule_text: z.string().nullable().optional(),
  item_description: z.string().min(1, 'Item name cannot be empty.'),
  unit_display: z.string().min(1, 'Unit cannot be empty.'),
  rate_amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Rate must be a valid number >= 0'),
  schedule_name: z.string().nullable().optional(),
  contract_quantity: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Quantity must be a valid number >= 0'),
  project_segment_ids: z.array(z.string()).optional().default([]),
  estimate_quantity: z.string().optional(),
  measurment_quantity: z.string().optional(),
  remark: z.string().nullable().optional(),
  total: z.string().optional(),
  is_edited: z.boolean().optional().default(false),
  is_new: z.boolean().optional().default(false),
  header_key: z.string().nullable().optional(),
  order_key: z.number().nullable().optional(),
});

export type ProjectItemRowType = z.infer<typeof projectItemZodSchema> & {
  _original?: ProjectItemRowType | null;
};
