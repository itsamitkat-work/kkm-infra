import { MasterItem } from '@/hooks/items/types';
import { ProjectItemRowType } from '@/types/project-item';

export const buildPatchFromSelection = (
  masterProjectItem?: MasterItem
): Partial<ProjectItemRowType> | void => {
  const matched: MasterItem | undefined = masterProjectItem;

  if (!matched) return;

  return {
    item_code: matched.code ?? '',
    reference_schedule_text: matched.referenceScheduleLabel ?? '',
    schedule_name: matched.scheduleName || matched.scheduleRate || null,
    item_description: matched.name ?? '',
    unit_display: matched.unit ?? '',
    rate_amount: matched.rate?.toString() ?? '',
    schedule_item_id: matched.hashId ?? '',
  } as Partial<ProjectItemRowType>;
};
