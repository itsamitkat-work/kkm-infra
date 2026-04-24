'use client';

import * as React from 'react';
import { useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  FormInputField,
  FormSelectField,
  FormDrawerHeader,
} from '@/components/form';
import type { BasicRate } from '@/app/(app)/basic-rates/api/basic-rate-api';
import { useBasicRateTypesQuery } from '@/app/(app)/basic-rates/hooks/use-basic-rate-types-query';
import {
  useCreateBasicRate,
  useUpdateBasicRate,
} from '@/app/(app)/basic-rates/hooks/use-basic-rates-mutations';
import { useBasicRateDistinctUnits } from '@/hooks/use-basic-rate-distinct-units';
import { toast } from 'sonner';
import { useAppForm } from '@/hooks/use-app-form';
import { useScheduleVersionOptions } from '@/hooks/use-schedule-source-versions';
import {
  RECORD_STATUS_OPTIONS,
  RECORD_STATUS_FORM_VALUES,
  RecordStatusBadge,
  isRecordStatus,
  type RecordStatusValue,
} from '@/components/ui/record-status-badge';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { OpenCloseMode } from '@/hooks/use-open-close';
import type { Control } from 'react-hook-form';
import { Field, FieldLabel, FieldError, FieldSet } from '@/components/ui/field';
import { FieldGroupDense } from '@/components/field-group-dense';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { ChevronDownIcon, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

const FORM_SCHEMA = z.object({
  schedule_source_version_id: z.string().uuid('Schedule is required'),
  code: z.string().min(1, 'Code is required'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().min(1, 'Description is required'),
  rate: z
    .string()
    .min(1, 'Rate is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      'Rate must be a valid number'
    ),
  basic_rate_type_id: z.string().min(1, 'Type is required'),
  status: z.enum(RECORD_STATUS_FORM_VALUES),
});

type BasicRateFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  basicRate?: BasicRate | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function BasicRatesDrawer({
  mode,
  basicRate,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createBasicRateMutation = useCreateBasicRate();
  const updateBasicRateMutation = useUpdateBasicRate();
  const typeOptionsQuery = useBasicRateTypesQuery();
  const scheduleOptionsQuery = useScheduleVersionOptions();

  const typeSelectOptions = React.useMemo(
    () =>
      (typeOptionsQuery.data ?? []).map((t) => ({
        value: t.id,
        label: t.name,
      })),
    [typeOptionsQuery.data]
  );

  const scheduleSelectOptions = React.useMemo(
    () =>
      (scheduleOptionsQuery.data ?? []).map((s) => ({
        value: s.id,
        label:
          s.year != null ? `${s.display_name} (${s.year})` : s.display_name,
      })),
    [scheduleOptionsQuery.data]
  );

  const getDefaultValues = React.useCallback((): BasicRateFormValues => {
    if (mode === 'create' || !basicRate) {
      return {
        schedule_source_version_id: '',
        code: '',
        unit: '',
        description: '',
        rate: '',
        basic_rate_type_id: '',
        status: 'active',
      };
    }

    return {
      schedule_source_version_id: basicRate.schedule_source_version_id,
      code: basicRate.code,
      unit: basicRate.unit,
      description: basicRate.description,
      rate: String(basicRate.rate),
      basic_rate_type_id: basicRate.basic_rate_type_id,
      status: basicRate.status ?? 'active',
    };
  }, [mode, basicRate]);

  const form = useAppForm<BasicRateFormValues>({
    submitMode: isEdit ? 'edit' : 'create',
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
    onEmptyPatch: isEdit
      ? () => toast.message('No changes to save')
      : undefined,
    onCreate: async (values) => {
      try {
        await createBasicRateMutation.mutateAsync({
          schedule_source_version_id: values.schedule_source_version_id,
          basic_rate_type_id: values.basic_rate_type_id,
          code: values.code,
          description: values.description,
          unit: values.unit,
          rate: Number(values.rate),
          status: values.status,
        });
        onSubmit();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
    onPatch: async (patch) => {
      try {
        if (!basicRate) {
          return;
        }
        const patchRecord: Record<string, unknown> = { ...patch };
        if (patchRecord.rate != null) {
          patchRecord.rate = Number(patchRecord.rate);
        }
        if (patchRecord.status != null) {
          const statusStr = String(patchRecord.status);
          if (!isRecordStatus(statusStr)) {
            toast.error('Invalid status.');
            return;
          }
          patchRecord.status = statusStr;
        }
        await updateBasicRateMutation.mutateAsync({
          id: basicRate.id,
          ...patchRecord,
        });
        onSubmit();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [basicRate?.id, mode, getDefaultValues, form]);

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead
            ? 'View Basic Rate'
            : isEdit
              ? 'Edit Basic Rate'
              : 'Create Basic Rate'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='basic-rate-form'
        control={form.control}
        readOnly={isRead}
        isLoading={
          createBasicRateMutation.isPending || updateBasicRateMutation.isPending
        }
      />

      <DrawerContentContainer>
        <form id='basic-rate-form' onSubmit={form.submit}>
          <FieldGroupDense>
            <FieldSet>
              <FormSelectField
                control={form.control}
                name='schedule_source_version_id'
                label='Schedule'
                placeholder='Select schedule'
                options={scheduleSelectOptions}
                required
                readOnly={isRead}
              />

              <FormInputField
                control={form.control}
                name='code'
                label='Code'
                placeholder='Enter code'
                required
                readOnly={isRead}
              />

              <FormInputField
                control={form.control}
                name='description'
                label='Description'
                placeholder='Enter description'
                required
                readOnly={isRead}
              />

              <FormSelectField
                control={form.control}
                name='basic_rate_type_id'
                label='Type'
                placeholder='Select type'
                options={typeSelectOptions}
                required
                readOnly={isRead}
              />

              <FormSelectField
                control={form.control}
                name='status'
                label='Status'
                placeholder='Select status'
                options={RECORD_STATUS_OPTIONS}
                required
                readOnly={isRead}
                renderOption={(option) => (
                  <RecordStatusBadge
                    status={option.value as RecordStatusValue}
                  />
                )}
                renderValue={(value) => (
                  <RecordStatusBadge status={value as RecordStatusValue} />
                )}
              />
            </FieldSet>

            <FieldSet>
              <FormInputField
                control={form.control}
                name='rate'
                label='Rate'
                placeholder='Enter rate'
                required
                type='number'
                readOnly={isRead}
              />

              <UnitField control={form.control} readOnly={isRead} />
            </FieldSet>
          </FieldGroupDense>
        </form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

function UnitField({
  control,
  readOnly,
}: {
  control: Control<BasicRateFormValues>;
  readOnly: boolean;
}) {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: 'unit' });

  const unitsQuery = useBasicRateDistinctUnits();
  const units = unitsQuery.isError ? [] : (unitsQuery.data ?? []);

  function handleUnitSelect(unit: string) {
    field.onChange(unit);
  }

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor='unit'>Unit *</FieldLabel>
      <InputGroup data-disabled={readOnly ? true : undefined}>
        <InputGroupInput
          id='unit'
          placeholder='e.g. day, cum, sqm'
          {...field}
          readOnly={readOnly}
          aria-invalid={!!error}
        />
        {!readOnly && (
          <InputGroupAddon align='inline-end' className='gap-1'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='gap-1.5'
                  disabled={unitsQuery.isPending}
                  aria-label='Select unit'
                >
                  {unitsQuery.isPending ? (
                    <Loader2
                      className='size-3.5 animate-spin'
                      aria-hidden='true'
                    />
                  ) : (
                    <ChevronDownIcon
                      className='size-3.5 opacity-60'
                      aria-hidden='true'
                    />
                  )}
                  Units
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='w-48 max-h-72 overflow-y-auto'
              >
                {units.length > 0 ? (
                  <>
                    <DropdownMenuLabel>Units</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {units.map((unit) => (
                        <DropdownMenuItem
                          key={unit}
                          onSelect={() => handleUnitSelect(unit)}
                        >
                          {unit}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                ) : (
                  <DropdownMenuLabel className='max-w-[12rem] font-normal text-muted-foreground'>
                    {unitsQuery.isPending ? (
                      <Spinner />
                    ) : (
                      'No units yet. Type a unit or save a basic rate first.'
                    )}
                  </DropdownMenuLabel>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </InputGroupAddon>
        )}
      </InputGroup>
      <FieldError>{error?.message}</FieldError>
    </Field>
  );
}
