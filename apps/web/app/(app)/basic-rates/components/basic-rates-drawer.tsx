'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormSelectField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import type { BasicRate } from '@/hooks/useBasicRates';
import {
  useCreateBasicRate,
  useUpdateBasicRate,
  useBasicRateTypeOptions,
  formStatusLabelToDb,
} from '@/hooks/useBasicRates';
import { useScheduleVersionOptions } from '@/hooks/use-schedule-source-versions';
import {
  RECORD_STATUS_OPTIONS,
  RECORD_STATUS_FORM_VALUES,
  RecordStatusBadge,
  formStatusLabelToRecordStatus,
} from '@/components/ui/record-status-badge';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Control } from 'react-hook-form';

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

function recordStatusSelectOption(option: { value: string; label: string }) {
  return (
    <RecordStatusBadge status={formStatusLabelToRecordStatus(option.value)} />
  );
}

function recordStatusSelectValue(value: string) {
  return <RecordStatusBadge status={formStatusLabelToRecordStatus(value)} />;
}

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
  const typeOptionsQuery = useBasicRateTypeOptions();
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
        schedule_source_version_id: scheduleSelectOptions[0]?.value ?? '',
        code: '',
        unit: '',
        description: '',
        rate: '',
        basic_rate_type_id: typeSelectOptions[0]?.value ?? '',
        status: 'Active',
      };
    }

    const status: BasicRateFormValues['status'] =
      basicRate.status === 'inactive'
        ? 'Inactive'
        : basicRate.status === 'deprecated'
          ? 'Deprecated'
          : 'Active';

    return {
      schedule_source_version_id: basicRate.schedule_source_version_id,
      code: basicRate.code,
      unit: basicRate.unit,
      description: basicRate.description,
      rate: String(basicRate.rate),
      basic_rate_type_id: basicRate.basic_rate_type_id,
      status,
    };
  }, [mode, basicRate, typeSelectOptions, scheduleSelectOptions]);

  const form = useForm<BasicRateFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [basicRate?.id, mode, getDefaultValues, form]);

  React.useEffect(() => {
    if (mode !== 'create' || typeSelectOptions.length === 0) return;
    const current = form.getValues('basic_rate_type_id');
    if (!current) {
      form.setValue('basic_rate_type_id', typeSelectOptions[0].value);
    }
  }, [mode, typeSelectOptions, form]);

  React.useEffect(() => {
    if (mode !== 'create' || scheduleSelectOptions.length === 0) return;
    const current = form.getValues('schedule_source_version_id');
    if (!current) {
      form.setValue(
        'schedule_source_version_id',
        scheduleSelectOptions[0].value
      );
    }
  }, [mode, scheduleSelectOptions, form]);

  const handleSubmit = async (values: BasicRateFormValues) => {
    try {
      const status = formStatusLabelToDb(values.status);
      const rate = Number(values.rate);

      if (isEdit && basicRate) {
        await updateBasicRateMutation.mutateAsync({
          id: basicRate.id,
          basic_rate_type_id: values.basic_rate_type_id,
          code: values.code,
          description: values.description,
          unit: values.unit,
          rate,
          status,
        });
      } else {
        await createBasicRateMutation.mutateAsync({
          schedule_source_version_id: values.schedule_source_version_id,
          basic_rate_type_id: values.basic_rate_type_id,
          code: values.code,
          description: values.description,
          unit: values.unit,
          rate,
          status,
        });
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const scheduleNote =
    basicRate?.schedule_source_versions?.display_name ??
    basicRate?.schedule_source_versions?.name ??
    '—';

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
        <Form {...form}>
          <form
            id='basic-rate-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <BasicInformationSection
              control={form.control}
              readOnly={isRead}
              isCreate={mode === 'create'}
              typeOptions={typeSelectOptions}
              scheduleOptions={scheduleSelectOptions}
              scheduleLabel={scheduleNote}
            />
            <RateInformationSection control={form.control} readOnly={isRead} />
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const BasicInformationSection = React.memo(
  ({
    control,
    readOnly,
    isCreate,
    typeOptions,
    scheduleOptions,
    scheduleLabel,
  }: {
    control: Control<BasicRateFormValues>;
    readOnly: boolean;
    isCreate: boolean;
    typeOptions: Array<{ value: string; label: string }>;
    scheduleOptions: Array<{ value: string; label: string }>;
    scheduleLabel: string;
  }) => (
    <FormSection title='Basic Information' showSeparator={false}>
      {isCreate ? (
        <FormSelectField
          control={control}
          name='schedule_source_version_id'
          label='Schedule'
          placeholder='Select schedule'
          options={scheduleOptions}
          required
          readOnly={readOnly}
        />
      ) : (
        <p className='text-muted-foreground text-sm'>
          Schedule: {scheduleLabel}
        </p>
      )}

      <FormInputField
        control={control}
        name='code'
        label='Code'
        placeholder='Enter code'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='description'
        label='Description'
        placeholder='Enter description'
        required
        readOnly={readOnly}
      />

      <FormSelectField
        control={control}
        name='basic_rate_type_id'
        label='Type'
        placeholder='Select type'
        options={typeOptions}
        required
        readOnly={readOnly}
      />

      <FormSelectField
        control={control}
        name='status'
        label='Status'
        placeholder='Select status'
        options={RECORD_STATUS_OPTIONS}
        required
        readOnly={readOnly}
        renderOption={recordStatusSelectOption}
        renderValue={recordStatusSelectValue}
      />
    </FormSection>
  )
);

function RateInformationSection({
  control,
  readOnly,
}: {
  control: Control<BasicRateFormValues>;
  readOnly: boolean;
}) {
  return (
    <FormSection title='Rate Information'>
      <FormInputField
        control={control}
        name='rate'
        label='Rate'
        placeholder='Enter rate'
        required
        type='number'
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='unit'
        label='Unit'
        placeholder='e.g. day, cum, sqm'
        required
        readOnly={readOnly}
      />
    </FormSection>
  );
}

BasicInformationSection.displayName = 'BasicInformationSection';
RateInformationSection.displayName = 'RateInformationSection';
