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
  FormSearchableComboboxField,
  FormSelectField,
} from '@/components/form';
import { Designation } from '../hooks/use-designations-query';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import {
  useCreateDesignation,
  useUpdateDesignation,
} from '@/hooks/use-designations-mutations';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Control } from 'react-hook-form';
import { fetchEmployeeTypes } from '@/app/(app)/administration/employee-types/hooks/use-employee-types-query';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const FORM_SCHEMA = z.object({
  employeeTypeHashID: z.object({
    id: z.string().min(1, 'Employee Type is required'),
    name: z.string().min(1, 'Employee Type name is required'),
  }),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  basicRate: z.string().min(1, 'Basic rate is required'),
  remarks: z.string(),
  status: z.string().min(1, 'Status is required'),
});

type DesignationFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  designation?: Designation | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function DesignationsDrawer({
  mode,
  designation,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createDesignationMutation = useCreateDesignation();
  const updateDesignationMutation = useUpdateDesignation();

  const getDefaultValues = React.useCallback((): DesignationFormValues => {
    if (mode === 'create' || !designation) {
      return {
        employeeTypeHashID: { id: '', name: '' },
        code: '',
        name: '',
        basicRate: '',
        remarks: '',
        status: 'Active',
      };
    }

    return {
      employeeTypeHashID: {
        id: designation.employeeTypeHashID || '',
        name: designation.employeeTypeName || '',
      },
      code: designation.code || '',
      name: designation.name || '',
      basicRate: designation.basicRate || '',
      remarks: designation.remarks || '',
      status: designation.status || 'Active',
    };
  }, [mode, designation]);

  const form = useForm<DesignationFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [designation?.hashId, mode, getDefaultValues, form]);

  const handleSubmit = async (values: DesignationFormValues) => {
    try {
      const data = {
        employeeTypeHashID: values.employeeTypeHashID.id,
        code: values.code,
        name: values.name,
        basicRate: values.basicRate,
        remarks: values.remarks || '',
        status: values.status,
      };

      if (isEdit) {
        await updateDesignationMutation.mutateAsync({
          ...data,
          hashId: designation?.hashId || '',
          userId: 0, // This might need to come from auth context
        });
      } else {
        await createDesignationMutation.mutateAsync(data);
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
            ? 'View Designation'
            : isEdit
              ? 'Edit Designation'
              : 'Create Designation'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='designation-form'
        control={form.control}
        readOnly={isRead}
        isLoading={
          createDesignationMutation.isPending ||
          updateDesignationMutation.isPending
        }
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='designation-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <BasicInformationSection
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
    control: Control<DesignationFormValues>;
    readOnly: boolean;
  }) => {
    const fetchEmployeeTypeOptions = React.useCallback(
      async (search: string, page: number = 1) => {
        const response = await fetchEmployeeTypes(search, page);
        return {
          options: response.data.map((item) => ({
            value: item.hashId,
            label: item.name,
          })),
          hasNextPage: response.hasNext,
        };
      },
      []
    );

    return (
      <FormSection title='Basic Information' showSeparator={false}>
        <FormSearchableComboboxField
          control={control}
          name='employeeTypeHashID'
          label='Employee Type'
          placeholder='Select employee type'
          fetchOptions={fetchEmployeeTypeOptions}
          required
          readOnly={readOnly}
          searchPlaceholder='Search employee types...'
          emptyMessage='No employee types found'
          getValue={(option) => ({
            id: option.value,
            name: option.label,
          })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />

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
          name='basicRate'
          label='Basic Rate'
          placeholder='Enter basic rate'
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
    );
  }
);

const AdditionalInformationSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<DesignationFormValues>;
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
AdditionalInformationSection.displayName = 'AdditionalInformationSection';
