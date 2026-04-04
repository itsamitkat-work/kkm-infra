import { MasterItem } from '@/hooks/items/types';
import { ProjectItemRowType } from '@/types/project-item';

export const buildPatchFromSelection = (
  masterProjectItem?: MasterItem
): Partial<ProjectItemRowType> | void => {
  const matched: MasterItem | undefined = masterProjectItem;

  if (!matched) return;

  return {
    code: matched.code ?? '',
    dsrCode: matched.dsrCode ?? matched.dsrId ?? '',
    scheduleName: matched.scheduleName || matched.scheduleRate || null,
    name: matched.name ?? '',
    unit: matched.unit ?? '',
    rate: matched.rate?.toString() ?? '',
    masterItemHashId: matched.hashId ?? '',
  } as Partial<ProjectItemRowType>;
};
