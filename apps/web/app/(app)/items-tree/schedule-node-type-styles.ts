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
  badgeVariant: 'default' | 'secondary' | 'outline';
  badgeClassName: string;
};

export function scheduleNodeTypeRowClasses(
  kind: ScheduleNodeType
): ScheduleNodeTypeRowClasses {
  switch (kind) {
    case 'section':
      return {
        code: 'text-foreground font-mono text-[13px] font-semibold tabular-nums tracking-tight',
        name: 'text-foreground text-sm font-semibold leading-tight',
        rate: 'text-foreground/90 text-end font-mono text-[12px] tabular-nums',
        badgeVariant: 'secondary',
        badgeClassName: 'h-4 px-1 py-0 text-[9px] uppercase tracking-wider',
      };
    case 'group':
      return {
        code: 'text-foreground/85 font-mono text-[12px] font-semibold tabular-nums tracking-tight',
        name: 'text-foreground/95 text-sm font-medium leading-tight',
        rate: 'text-foreground/80 text-end font-mono text-[12px] font-medium tabular-nums',
        badgeVariant: 'secondary',
        badgeClassName: 'h-4 px-1 py-0 text-[9px] uppercase tracking-wider',
      };
    case 'item':
    default:
      return {
        code: 'text-muted-foreground/80 font-mono text-[11px] font-medium tabular-nums tracking-tight',
        name: 'text-muted-foreground text-[13px] font-normal leading-tight',
        rate: 'text-muted-foreground/70 text-end font-mono text-[11px] tabular-nums',
        badgeVariant: 'secondary',
        badgeClassName: 'h-4 px-1 py-0 text-[9px] uppercase tracking-wider',
      };
  }
}
