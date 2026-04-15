'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormInputField, FormSelectField } from '@/components/form';
import type { ScheduleSourceVersionRow } from '@/hooks/use-schedule-source-versions';
import {
  useCreateScheduleSourceVersion,
  useUpdateScheduleSourceVersion,
} from '@/hooks/schedules/use-schedule-source-mutations';
import type { Database } from '@kkm/db';

const RECORD_STATUS_OPTIONS: Array<{
  value: Database['public']['Enums']['record_status'];
  label: string;
}> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'deprecated', label: 'Deprecated' },
];

const VERSION_FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Internal name is required'),
  display_name: z.string().min(1, 'Display name is required'),
  yearStr: z.string().optional(),
  region: z.string().optional(),
  sortOrderStr: z.string().optional(),
  status: z.enum(['active', 'inactive', 'deprecated']),
});

export type ScheduleSourceVersionFormValues = z.infer<
  typeof VERSION_FORM_SCHEMA
>;

function parseOptionalInt(value: string | undefined): number | null {
  const t = value?.trim() ?? '';
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

interface ScheduleSourceVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  scheduleSourceId: string;
  version: ScheduleSourceVersionRow | null;
  onSuccess: () => void;
}

export function ScheduleSourceVersionDialog({
  open,
  onOpenChange,
  mode,
  scheduleSourceId,
  version,
  onSuccess,
}: ScheduleSourceVersionDialogProps) {
  const createMutation = useCreateScheduleSourceVersion();
  const updateMutation = useUpdateScheduleSourceVersion();
  const isEdit = mode === 'edit' && version != null;

  const getDefaultValues = React.useCallback(
    (): ScheduleSourceVersionFormValues => {
      if (isEdit && version) {
        return {
          name: version.name,
          display_name: version.display_name,
          yearStr:
            version.year != null && Number.isFinite(version.year)
              ? String(version.year)
              : '',
          region: version.region ?? '',
          sortOrderStr:
            version.sort_order != null && Number.isFinite(version.sort_order)
              ? String(version.sort_order)
              : '',
          status:
            (version.status as ScheduleSourceVersionFormValues['status']) ??
            'active',
        };
      }
      return {
        name: '',
        display_name: '',
        yearStr: '',
        region: '',
        sortOrderStr: '',
        status: 'active',
      };
    },
    [isEdit, version]
  );

  const form = useForm<ScheduleSourceVersionFormValues>({
    resolver: zodResolver(VERSION_FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, getDefaultValues, form]);

  async function handleSubmit(values: ScheduleSourceVersionFormValues) {
    const year = parseOptionalInt(values.yearStr);
    const sort_order = parseOptionalInt(values.sortOrderStr);
    const regionTrim = (values.region ?? '').trim();
    const region = regionTrim ? regionTrim : null;

    try {
      if (isEdit && version) {
        await updateMutation.mutateAsync({
          id: version.id,
          patch: {
            name: values.name.trim(),
            display_name: values.display_name.trim(),
            year,
            region,
            sort_order,
            status: values.status,
          },
        });
      } else {
        await createMutation.mutateAsync({
          schedule_source_id: scheduleSourceId,
          name: values.name.trim(),
          display_name: values.display_name.trim(),
          year,
          region,
          sort_order,
          status: values.status,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch {
      // Toasts handled in mutations
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[min(90vh,40rem)] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit edition' : 'Add edition'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='schedule-source-version-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-4 py-2'
          >
            <FormInputField
              control={form.control}
              name='name'
              label='Internal name'
              placeholder='Unique key within this schedule'
              required
            />
            <FormInputField
              control={form.control}
              name='display_name'
              label='Display name'
              placeholder='Shown in tabs and filters'
              required
            />
            <FormInputField
              control={form.control}
              name='yearStr'
              label='Year'
              placeholder='Optional'
              type='number'
            />
            <FormInputField
              control={form.control}
              name='region'
              label='Region'
              placeholder='Optional'
            />
            <FormInputField
              control={form.control}
              name='sortOrderStr'
              label='Sort order'
              placeholder='Optional'
              type='number'
            />
            <FormSelectField
              control={form.control}
              name='status'
              label='Status'
              placeholder='Select status'
              options={RECORD_STATUS_OPTIONS}
              required
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='schedule-source-version-form'
            disabled={pending}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
