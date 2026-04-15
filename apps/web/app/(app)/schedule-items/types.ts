export type ScheduleNodeType = 'section' | 'group' | 'item';

export type ScheduleAnnotationType =
  | 'note'
  | 'remark'
  | 'condition'
  | 'reference';

export type ScheduleItemAnnotation = {
  id: string;
  type: ScheduleAnnotationType;
  raw_text: string;
  order_index: number | null;
};

export type ScheduleItemContextRate = {
  id: string;
  context: string;
  label: string | null;
  rate: number;
  rate_display: string | null;
  order_index: number | null;
};

export type ScheduleTreeRow = {
  id: string;
  parent_item_id: string | null;
  code: string;
  description: string;
  node_type: ScheduleNodeType;
  depth: number | null;
  order_index: number | null;
  path_slug: string | null;
  rate: number | null;
  unit_symbol: string | null;
  has_children: boolean;
  annotations: ScheduleItemAnnotation[];
  rates: ScheduleItemContextRate[];
};

export type ScheduleSourceVersionOption = {
  id: string;
  display_name: string | null;
  year: number | null;
  sort_order: number | null;
};

export type ScheduleTreeSearchRow = ScheduleTreeRow & {
  ancestor_ids: string[];
};
