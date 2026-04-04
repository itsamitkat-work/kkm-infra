'use client';

import type { FilterFieldConfig } from '@/components/ui/filters';
import type {
  HeadOption,
  SubheadOption,
  HeadWithSubheads,
} from '@/hooks/use-heads-subheads';

const STATUS_DOT = (dotClass: string) => (
  <span
    className={`inline-block size-1.5 shrink-0 rounded-full border border-transparent ${dotClass}`}
    aria-hidden
  />
);

const JUSTIFICATION_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All', dotClass: 'bg-slate-400' },
  {
    value: 'WITH_JUSTIFICATION',
    label: 'Justified',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'WITHOUT_JUSTIFICATION',
    label: 'Not Justified',
    dotClass: 'bg-amber-500',
  },
] as const;

const VERIFICATION_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All', dotClass: 'bg-slate-400' },
  { value: 'VERIFIED', label: 'Verified', dotClass: 'bg-emerald-500' },
  { value: 'NOT_VERIFIED', label: 'Not Verified', dotClass: 'bg-amber-500' },
] as const;

function getSubheadOptionsForHead(
  selectedHead: string | undefined,
  headsWithSubheads: HeadWithSubheads[],
  allSubheadOptions: SubheadOption[]
): SubheadOption[] {
  if (!selectedHead) return allSubheadOptions;
  const headEntry = headsWithSubheads.find((h) => h.head === selectedHead);
  if (!headEntry) return allSubheadOptions;
  return headEntry.subheads.map(({ subhead, head }) => ({
    value: subhead,
    label: subhead,
  }));
}

export function getItemsFilterFields(
  headOptions: HeadOption[],
  subheadOptions: SubheadOption[],
  options?: {
    selectedHead?: string;
    headsWithSubheads?: HeadWithSubheads[];
    scheduleOptions?: { value: string; label: string }[];
  }
): FilterFieldConfig[] {
  const headSelectOptions = headOptions.map((o) => ({
    value: o.head,
    label: o.label,
  }));

  const selectedHead = options?.selectedHead;
  const headsWithSubheads = options?.headsWithSubheads ?? [];
  const hasHeadSelected = Boolean(selectedHead && headsWithSubheads.length > 0);
  const subheadOptionsToUse = hasHeadSelected
    ? getSubheadOptionsForHead(selectedHead, headsWithSubheads, subheadOptions)
    : subheadOptions;

  const noSubheadsForSelectedHead =
    hasHeadSelected && subheadOptionsToUse.length === 0;
  const subHeadDisabled = !hasHeadSelected || noSubheadsForSelectedHead;
  const subheadCount = subheadOptionsToUse.length;
  const subHeadPlaceholder = !hasHeadSelected
    ? 'Select Head first'
    : noSubheadsForSelectedHead
      ? 'No subheads'
      : `(${subheadCount} available)`;

  const scheduleOptions = options?.scheduleOptions ?? [];

  return [
    {
      group: 'Filters',
      fields: [
        {
          key: 'Head',
          label: 'Head',
          type: 'select',
          popoverContentClassName:
            'w-[calc(100vw-32px)] max-w-md lg:min-w-[400px] lg:w-auto',
          options: headSelectOptions,
          placeholder: 'Select Head',
          operators: [{ value: 'is', label: 'Is' }],
          hideOperatorDropdown: true,
        },
        {
          key: 'SubHead',
          label: 'SubHead',
          type: 'select',
          popoverContentClassName:
            'w-[calc(100vw-32px)] max-w-md lg:min-w-[400px] lg:w-auto',
          options: subheadOptionsToUse,
          placeholder: subHeadPlaceholder,
          disabled: subHeadDisabled,
          operators: [{ value: 'is', label: 'Is' }],
          hideOperatorDropdown: true,
        },
        {
          key: 'ScheduleRate',
          label: 'Schedule',
          type: 'select',
          className: 'w-[180px]',
          popoverContentClassName: 'lg:min-w-[180px]',
          options: scheduleOptions,
          placeholder: 'Select schedule',
          operators: [{ value: 'is', label: 'Is' }],
          hideOperatorDropdown: true,
        },
        {
          key: 'justification-status',
          label: 'Justification',
          type: 'select',
          className: 'w-[180px]',
          selectedOptionsClassName: '-space-x-1',
          popoverContentClassName: 'lg:min-w-[100px]',
          options: JUSTIFICATION_STATUS_OPTIONS.map(
            ({ value, label, dotClass }) => ({
              value,
              label,
              icon: STATUS_DOT(dotClass),
            })
          ),
          placeholder: 'All',
          operators: [{ value: 'is', label: 'Is' }],
          hideOperatorDropdown: true,
        },
        {
          key: 'verification-status',
          label: 'Justification Verification',
          type: 'select',
          className: 'w-[180px]',
          selectedOptionsClassName: '-space-x-1',
          popoverContentClassName: 'lg:min-w-[100px]',
          options: VERIFICATION_STATUS_OPTIONS.map(
            ({ value, label, dotClass }) => ({
              value,
              label,
              icon: STATUS_DOT(dotClass),
            })
          ),
          placeholder: 'All',
          operators: [{ value: 'is', label: 'Is' }],
          hideOperatorDropdown: true,
        },
      ],
    },
  ];
}
