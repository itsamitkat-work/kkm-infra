export type ScheduleTreeRow = {
  id: string;
  parent_item_id: string | null;
  code: string;
  description: string;
  node_type: string;
  depth: number | null;
  order_index: number | null;
  path_text: string | null;
  schedule_source_version_id: string;
  source_version_display_name: string | null;
  rate: number | null;
  unit_symbol: string | null;
};

export type ScheduleSourceVersionOption = {
  id: string;
  display_name: string | null;
  year: number | null;
};
