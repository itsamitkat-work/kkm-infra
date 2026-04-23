import type { ScheduleTreeRow } from './types';

/**
 * Labels for reference-schedule annotations on a tree row (same shape as the
 * Reference Schedule column in `ScheduleItemsTree`).
 */
export function getReferenceScheduleLabelList(row: ScheduleTreeRow): string[] {
  const referenceLabels = row.annotations
    .filter((annotation) => annotation.type === 'reference')
    .map((annotation) => {
      const sourceName = annotation.metadata.reference_schedule_source_name;
      const code = annotation.raw_text.trim();
      if (
        typeof sourceName === 'string' &&
        sourceName.trim() !== '' &&
        code !== ''
      ) {
        return `${sourceName.trim()} - ${code}`;
      }
      return code;
    })
    .filter(
      (referenceLabel): referenceLabel is string =>
        typeof referenceLabel === 'string' && referenceLabel.trim() !== ''
    );

  return [...new Set(referenceLabels)];
}

export function getReferenceScheduleLabelString(row: ScheduleTreeRow): string {
  return getReferenceScheduleLabelList(row).join(', ');
}
