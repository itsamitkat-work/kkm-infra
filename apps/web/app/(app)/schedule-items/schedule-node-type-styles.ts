import type { ScheduleNodeType } from './types';

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
        code: 'text-foreground font-mono text-[12px] tabular-nums tracking-tight',
        name: 'text-foreground text-sm leading-tight',
        rate: 'text-end font-mono text-[12px] tabular-nums',
      };
    case 'group':
      return {
        code: 'text-foreground font-mono text-[12px] tabular-nums tracking-tight',
        name: 'text-foreground text-sm leading-tight',
        rate: 'text-end font-mono text-[12px] tabular-nums',
      };
    case 'item':
    default:
      return {
        code: 'text-primary/80 font-mono text-[12px] font-semibold tabular-nums tracking-tight',
        name: 'italic text-primary/80 text-sm leading-tight',
        rate: 'text-end font-mono text-[12px] tabular-nums',
      };
  }
}
