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
import type { BasicRate } from '@/hooks/useBasicRates';
import {
  useCreateBasicRate,
  useUpdateBasicRate,
  useBasicRateTypeOptions,
  formStatusLabelToDb,
} from '@/hooks/useBasicRates';
import { useBasicRateDistinctUnits } from '@/hooks/use-basic-rate-distinct-units';
import { toast } from 'sonner';
import { useAppForm } from '@/hooks/use-app-form';
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
import type { Control } from 'react-hook-form';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
} from '@/components/ui/field';
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
        schedule_source_version_id: '',
        code: '',
        unit: '',
        description: '',
        rate: '',
        basic_rate_type_id: '',
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
  }, [mode, basicRate]);

  const form = useAppForm<BasicRateFormValues>({
    submitMode: isEdit ? 'edit' : 'create',
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
    onEmptyPatch: isEdit ? () => toast.message('No changes to save') : undefined,
    onCreate: async (values) => {
      try {
        const status = formStatusLabelToDb(values.status);
        const rate = Number(values.rate);
        await createBasicRateMutation.mutateAsync({
          schedule_source_version_id: values.schedule_source_version_id,
          basic_rate_type_id: values.basic_rate_type_id,
          code: values.code,
          description: values.description,
          unit: values.unit,
          rate,
          status,
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
          patchRecord.status = formStatusLabelToDb(patchRecord.status as string);
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
        <form id='basic-rate-form' onSubmit={form.submit}>
          <FieldGroup density='dense'>
            <BasicInformationSection
              control={form.control}
              readOnly={isRead}
              isCreate={mode === 'create'}
              typeOptions={typeSelectOptions}
              scheduleOptions={scheduleSelectOptions}
              scheduleLabel={scheduleNote}
            />
            <RateInformationSection control={form.control} readOnly={isRead} />
          </FieldGroup>
        </form>
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
    <FieldSet>
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
    </FieldSet>
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
    <FieldSet>
      <FormInputField
        control={control}
        name='rate'
        label='Rate'
        placeholder='Enter rate'
        required
        type='number'
        readOnly={readOnly}
      />

      <UnitField control={control} readOnly={readOnly} />
    </FieldSet>
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
                  size='xs'
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

BasicInformationSection.displayName = 'BasicInformationSection';
