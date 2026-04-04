'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormDrawerHeader,
  FormSection,
  FormDateField,
  FormSelectField,
} from '@/components/form';
import { SubDesignation } from '../hooks/use-sub-designations-query';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import {
  useCreateSubDesignation,
  useUpdateSubDesignation,
} from '@/hooks/use-sub-designations-mutations';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const FORM_SCHEMA = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  basicRate: z.string().refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: 'Basic rate must be a valid number greater than or equal to 0' }
  ),
  newRate: z.string().refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: 'New rate must be a valid number greater than or equal to 0' }
  ),
  revisedDate: z.string().min(1, 'Revised date is required'),
  remarks: z.string(),
  status: z.string().min(1, 'Status is required'),
});

type SubDesignationFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  subDesignation?: SubDesignation | null;
  designationHashID: string;
  designationName: string;
  employeeTypeHashID: string;
  employeeTypeName: string;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SubDesignationsDrawer({
  mode,
  subDesignation,
  designationHashID,
  designationName,
  employeeTypeHashID,
  employeeTypeName,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createSubDesignationMutation = useCreateSubDesignation();
  const updateSubDesignationMutation = useUpdateSubDesignation();

  const getDefaultValues = React.useCallback((): SubDesignationFormValues => {
    if (mode === 'create' || !subDesignation) {
      return {
        code: '',
        name: '',
        basicRate: '0',
        newRate: '0',
        revisedDate: new Date().toISOString().split('T')[0],
        remarks: '',
        status: 'Active',
      };
    }

    return {
      code: subDesignation.code || '',
      name: subDesignation.name || '',
      basicRate: String(subDesignation.basicRate ?? 0),
      newRate: subDesignation.newRate !== null && subDesignation.newRate !== undefined
        ? String(subDesignation.newRate)
        : '0',
      revisedDate: subDesignation.revisedDate
        ? subDesignation.revisedDate.split('T')[0]
        : '',
      remarks: subDesignation.remarks || '',
      status: subDesignation.status || 'Active',
    };
  }, [mode, subDesignation]);

  const form = useForm<SubDesignationFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [subDesignation?.id, mode, getDefaultValues, form]);

  const handleSubmit = async (values: SubDesignationFormValues) => {
    try {
      const data = {
        designationHashID,
        employeeTypeHashID,
        code: values.code,
        name: values.name,
        basicRate: parseFloat(values.basicRate) || 0,
        newRate: values.newRate ? (parseFloat(values.newRate) || 0) : 0,
        revisedDate: values.revisedDate
          ? new Date(values.revisedDate).toISOString()
          : new Date().toISOString(),
        remarks: values.remarks || '',
        status: values.status,
        userId: 0, // This might need to come from auth context
      };

      if (isEdit) {
        await updateSubDesignationMutation.mutateAsync({
          ...data,
          hashId: subDesignation?.id || '',
        });
      } else {
        await createSubDesignationMutation.mutateAsync(data);
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
            ? 'View Sub-Designation'
            : isEdit
              ? 'Edit Sub-Designation'
              : 'Create Sub-Designation'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='sub-designation-form'
        control={form.control}
        readOnly={isRead}
        isLoading={
          createSubDesignationMutation.isPending ||
          updateSubDesignationMutation.isPending
        }
      />

      <DrawerContentContainer>
        <div className='mb-4 p-4 rounded-lg bg-muted/50 border'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-muted-foreground'>
                Designation:
              </span>
              <span className='text-sm font-semibold'>{designationName}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-muted-foreground'>
                Employee Type:
              </span>
              <span className='text-sm font-semibold'>{employeeTypeName}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            id='sub-designation-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <BasicInformationSection
              control={form.control}
              readOnly={isRead}
            />
            <RateInformationSection
              control={form.control}
              readOnly={isRead}
            />
            <AdditionalInformationSection
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
    control: Control<SubDesignationFormValues>;
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

        <FormSelectField
          control={control}
          name='status'
          label='Status'
          placeholder='Select status'
          options={STATUS_OPTIONS}
          required
          readOnly={readOnly}
        />
      </FormSection>
    )
);

const RateInformationSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<SubDesignationFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Rate Information' showSeparator>
      <FormInputField
        control={control}
        name='basicRate'
        label='Basic Rate'
        placeholder='Enter basic rate'
        type='text'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='newRate'
        label='New Rate'
        placeholder='Enter new rate'
        type='text'
        required
        readOnly={readOnly}
      />

      <FormDateField
        control={control}
        name='revisedDate'
        label='Revised Date'
        required
        readOnly={readOnly}
      />
    </FormSection>
  )
);

const AdditionalInformationSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<SubDesignationFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Additional Information' showSeparator>
      <FormInputField
        control={control}
        name='remarks'
        label='Remarks'
        placeholder='Enter remarks'
        readOnly={readOnly}
      />
    </FormSection>
  )
);

BasicInformationSection.displayName = 'BasicInformationSection';
RateInformationSection.displayName = 'RateInformationSection';
AdditionalInformationSection.displayName = 'AdditionalInformationSection';
