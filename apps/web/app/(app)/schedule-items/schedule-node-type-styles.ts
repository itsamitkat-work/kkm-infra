import type { ScheduleNodeType } from './types';
import { HIERARCHY_BODY_CLASS } from './item-description-hierarchy';

export function normalizeScheduleNodeType(raw: string): ScheduleNodeType {
  const v = raw.trim().toLowerCase();
  if (v === 'section' || v === 'group' || v === 'item') return v;
  return 'item';
}

export type ScheduleNodeTypeRowClasses = {
  code: string;
  name: string;
  rate: string;
};

export function scheduleNodeTypeRowClasses(
  kind: ScheduleNodeType
): ScheduleNodeTypeRowClasses {
  switch (kind) {
    case 'section':
      return {
        code: `text-foreground font-mono text-[12px] tabular-nums tracking-tight leading-relaxed`,
        name: `text-foreground ${HIERARCHY_BODY_CLASS}`,
        rate: 'text-end font-mono text-[12px] tabular-nums leading-relaxed',
      };
    case 'group':
      return {
        code: `text-foreground font-mono text-[12px] tabular-nums tracking-tight leading-relaxed`,
        name: `text-foreground ${HIERARCHY_BODY_CLASS}`,
        rate: 'text-end font-mono text-[12px] tabular-nums leading-relaxed',
      };
    case 'item':
    default:
      return {
        code: 'text-primary/80 font-mono text-[12px] font-semibold tabular-nums tracking-tight leading-relaxed',
        name: `text-primary/80 ${HIERARCHY_BODY_CLASS}`,
        rate: 'text-end font-mono text-[12px] tabular-nums leading-relaxed',
      };
  }
}
