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
import { BasicRate } from '@/hooks/use-basic-rates';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import {
  useCreateBasicRate,
  useUpdateBasicRate,
} from '@/hooks/use-basic-rates-mutations';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Control } from 'react-hook-form';
import { useMasterTypesList } from '@/hooks/use-master-types';
import { BASIC_RATE_TYPE_OPTIONS } from './basic-rates-filters';

const FORM_SCHEMA = z.object({
  code: z.string().min(1, 'Code is required'),
  unit: z.string().min(1, 'Unit is required'),
  name: z.string().min(1, 'Name is required'),
  nickName: z.string(),
  rate: z
    .string()
    .min(1, 'Rate is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      'Rate must be a valid number'
    ),
  stateSchedule: z.string().min(1, 'State Schedule is required'),
  types: z.string().min(1, 'Type is required'),
  status: z.string().min(1, 'Status is required'),
  autodate: z.string(),
  userId: z.string(),
  materialTypeHashId: z.string(),
  materialGroupHashId: z.string(),
  materialCategoryHashId: z.string(),
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

  const getDefaultValues = React.useCallback((): BasicRateFormValues => {
    if (mode === 'create' || !basicRate) {
      return {
        code: '',
        unit: '',
        name: '',
        nickName: '',
        rate: '',
        stateSchedule: '',
        types: 'Material',
        status: 'Active',
        autodate: new Date().toISOString(),
        userId: '',
        materialTypeHashId: '',
        materialGroupHashId: '',
        materialCategoryHashId: '',
      };
    }

    return {
      code: basicRate.code || '',
      unit: basicRate.unit || '',
      name: basicRate.name || '',
      nickName: basicRate.nickName || '',
      rate: basicRate.rate?.toString() || '',
      stateSchedule: basicRate.stateSchedule || '',
      types: basicRate.types || 'Material',
      status: basicRate.status || 'Active',
      autodate: basicRate.autodate || new Date().toISOString(),
      userId: basicRate.userId || '',
      materialTypeHashId: basicRate.materialTypeHashId || '',
      materialGroupHashId: basicRate.materialGroupHashId || '',
      materialCategoryHashId: basicRate.materialCategoryHashId || '',
    };
  }, [mode, basicRate]);

  const form = useForm<BasicRateFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [basicRate?.hashID, mode, getDefaultValues, form]);

  const handleSubmit = async (values: BasicRateFormValues) => {
    try {
      const data = {
        code: values.code,
        unit: values.unit,
        name: values.name,
        nickName: values.nickName || '',
        rate: Number(values.rate),
        stateSchedule: values.stateSchedule,
        types: values.types,
        status: values.status,
        autodate: values.autodate || new Date().toISOString(),
        userId: values.userId || '',
        materialTypeHashId: values.materialTypeHashId || '',
        materialGroupHashId: values.materialGroupHashId || '',
        materialCategoryHashId: values.materialCategoryHashId || '',
      };

      if (isEdit) {
        await updateBasicRateMutation.mutateAsync({
          ...data,
          hashID: basicRate?.hashID || '',
        });
      } else {
        await createBasicRateMutation.mutateAsync(data);
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

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
            <BasicInformationSection control={form.control} readOnly={isRead} />
            <RateInformationSection control={form.control} readOnly={isRead} />
            <MaterialInformationSection
              control={form.control}
              readOnly={isRead}
            />
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
  }: {
    control: Control<BasicRateFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Basic Information' showSeparator={false}>
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
        name='name'
        label='Name'
        placeholder='Enter name'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='nickName'
        label='Nick Name'
        placeholder='Enter nick name'
        readOnly={readOnly}
      />

      <FormSelectField
        control={control}
        name='types'
        label='Type'
        placeholder='Select type'
        options={[...BASIC_RATE_TYPE_OPTIONS]}
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='status'
        label='Status'
        placeholder='Enter status'
        required
        readOnly={readOnly}
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
  const units = useMasterTypesList('Unit');
  const unitOptions = React.useMemo(
    () =>
      units.items.map((item) => ({
        value: item.hashid,
        label: item.name,
      })),
    [units.items]
  );

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

      <FormSelectField
        control={control}
        name='unit'
        label='Unit'
        placeholder='Select unit'
        options={unitOptions}
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='stateSchedule'
        label='State Schedule'
        placeholder='Enter state schedule'
        required
        readOnly={readOnly}
      />
    </FormSection>
  );
}

function MaterialInformationSection({
  control,
  readOnly,
}: {
  control: Control<BasicRateFormValues>;
  readOnly: boolean;
}) {
  const materialTypes = useMasterTypesList('MaterialType');
  const materialGroups = useMasterTypesList('MaterialGroup');
  const materialCategories = useMasterTypesList('MaterialCategory');

  const materialTypeOptions = React.useMemo(
    () =>
      materialTypes.items.map((item) => ({
        value: item.hashid,
        label: item.name,
      })),
    [materialTypes.items]
  );
  const materialGroupOptions = React.useMemo(
    () =>
      materialGroups.items.map((item) => ({
        value: item.hashid,
        label: item.name,
      })),
    [materialGroups.items]
  );
  const materialCategoryOptions = React.useMemo(
    () =>
      materialCategories.items.map((item) => ({
        value: item.hashid,
        label: item.name,
      })),
    [materialCategories.items]
  );

  return (
    <FormSection title='Material Information' showSeparator>
      <FormSelectField
        control={control}
        name='materialTypeHashId'
        label='Material Type'
        placeholder='Select material type'
        options={materialTypeOptions}
        readOnly={readOnly}
      />

      <FormSelectField
        control={control}
        name='materialGroupHashId'
        label='Material Group'
        placeholder='Select material group'
        options={materialGroupOptions}
        readOnly={readOnly}
      />

      <FormSelectField
        control={control}
        name='materialCategoryHashId'
        label='Material Category'
        placeholder='Select material category'
        options={materialCategoryOptions}
        readOnly={readOnly}
      />
    </FormSection>
  );
}

BasicInformationSection.displayName = 'BasicInformationSection';
RateInformationSection.displayName = 'RateInformationSection';
MaterialInformationSection.displayName = 'MaterialInformationSection';
