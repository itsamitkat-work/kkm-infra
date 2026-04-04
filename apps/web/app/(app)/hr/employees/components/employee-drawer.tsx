'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormSelectField,
  FormSearchableComboboxField,
  FormDateField,
  FormTextareaField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import {
  Employee,
  GENDER_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
} from '../types/employee';
import { useEmployeeFilterOptions } from '../hooks/use-employee-filter-options';
import { useSubDesignationsQuery } from '@/app/(app)/administration/designations/hooks/use-sub-designations-query';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { validDateFormat } from '@/lib/validations';
import {
  useCreateEmployee,
  useUpdateEmployee,
} from '../hooks/use-employees-query';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { InfoIcon } from 'lucide-react';

const FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone is too long'),
  emergencyContact: z.string().optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  department: z.string().min(1, 'Department is required'),
  employeeType: z.string().min(1, 'Employee type is required'),
  designation: z.string().min(1, 'Designation is required'),
  subDesignation: z.string().optional(),
  joiningDate: z
    .string()
    .min(1, 'Joining date is required')
    .refine(validDateFormat, {
      message: 'Invalid date. Use yyyy-MM-dd format or select from calendar.',
    }),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  aadhaarNumber: z
    .string()
    .min(12, 'Aadhaar must be 12 digits')
    .max(12, 'Aadhaar must be 12 digits')
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
  education: z.string().optional(),
  technicalSkills: z.string().optional(),
  experienceMonths: z.number().min(0, 'Experience must be positive'),
  experienceDetails: z.string().optional(),
  password: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  employee?: Employee | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function EmployeeDrawer({
  mode,
  employee,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();

  // Fetch filter options for designations and employee types
  const filterOptions = useEmployeeFilterOptions();

  const defaultValues: EmployeeFormValues = React.useMemo(() => {
    if (employee && (isEdit || isRead)) {
      return {
        name: employee.name,
        gender: employee.gender,
        phone: employee.phone,
        emergencyContact: employee.emergencyContact || '',
        dateOfBirth: employee.dateOfBirth || '',
        email: employee.email || '',
        address: employee.address,
        department: employee.department,
        employeeType: employee.employeeTypeHashId || employee.employeeType,
        designation: employee.designationHashId || employee.designation,
        subDesignation: employee.subDesignationHashId || employee.subDesignation || '',
        joiningDate: employee.joiningDate,
        employmentType: employee.employmentType,
        aadhaarNumber: employee.aadhaarNumber,
        education: employee.education || '',
        technicalSkills: employee.technicalSkills || '',
        experienceMonths: employee.experienceMonths,
        experienceDetails: employee.experienceDetails || '',
        password: '',
      };
    }

    return {
      name: '',
      gender: 'male' as const,
      phone: '',
      emergencyContact: '',
      dateOfBirth: '',
      email: '',
      address: '',
      department: '',
      employeeType: '',
      designation: '',
      subDesignation: '',
      joiningDate: '',
      employmentType: 'full_time' as const,
      aadhaarNumber: '',
      education: '',
      technicalSkills: '',
      experienceMonths: 0,
      experienceDetails: '',
      password: '',
    };
  }, [employee, isEdit, isRead]);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues,
    mode: 'all',
  });

  const selectedDesignationHashId = form.watch('designation');
  const { data: subDesignationsList } = useSubDesignationsQuery(
    selectedDesignationHashId || null
  );

  const subDesignationOptions = React.useMemo(
    () =>
      (subDesignationsList ?? []).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [subDesignationsList]
  );

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  async function handleSubmit(values: EmployeeFormValues) {
    try {
      // Add default values for salary/bank fields that are now managed separately
      const submitData = {
        ...values,
        basicSalary: employee?.basicSalary || 0,
        allowances: employee?.allowances || 0,
        deductions: employee?.deductions || 0,
        paymentMode: employee?.paymentMode || ('bank_transfer' as const),
        upiNo: employee?.upiNo || '',
        accountNumber: employee?.accountNumber || '',
        ifscCode: employee?.ifscCode || '',
        bankName: employee?.bankName || '',
      };

      if (isEdit && employee) {
        await updateEmployeeMutation.mutateAsync({
          id: employee.id,
          ...submitData,
        });
      } else {
        await createEmployeeMutation.mutateAsync(submitData);
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }

  const isPending =
    createEmployeeMutation.isPending || updateEmployeeMutation.isPending;

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead
            ? 'View Employee'
            : isEdit
              ? 'Edit Employee'
              : 'Create Employee'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='employee-form'
        control={form.control}
        readOnly={isRead}
        isLoading={isPending}
      />

      <DrawerContentContainer>
        {employee && isRead && (
          <div className='text-sm text-muted-foreground italic'>
            Employee Code: {employee.employeeCode}
          </div>
        )}

        <Form {...form}>
          <form
            id='employee-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <PersonalDetailsSection control={form.control} readOnly={isRead} />
            <WorkDetailsSection
              control={form.control}
              readOnly={isRead}
              designations={filterOptions.designations}
              employeeTypes={filterOptions.employeeTypes}
              subDesignations={subDesignationOptions}
            />
            <EducationalDetailsSection
              control={form.control}
              readOnly={isRead}
            />

            {!isRead && !isEdit && (
              <div className='flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'>
                <InfoIcon className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                <p className='text-sm text-blue-800 dark:text-blue-200'>
                  Salary details and bank accounts can be added after creating
                  the employee from the employee detail page.
                </p>
              </div>
            )}

            {!isRead && <PasswordSection control={form.control} />}
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const PersonalDetailsSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: ReturnType<typeof useForm<EmployeeFormValues>>['control'];
    readOnly: boolean;
  }) => (
    <FormSection title='Personal Details' showSeparator={false}>
      <FormInputField
        control={control}
        name='name'
        label='Name'
        placeholder='Enter full name'
        required
        readOnly={readOnly}
      />

      <div className='grid grid-cols-2 gap-4'>
        <FormSelectField
          control={control}
          name='gender'
          label='Gender'
          placeholder='Select gender'
          options={[...GENDER_OPTIONS]}
          required
          readOnly={readOnly}
        />

        <FormInputField
          control={control}
          name='phone'
          label='Phone'
          placeholder='Enter phone number'
          required
          readOnly={readOnly}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <FormInputField
          control={control}
          name='emergencyContact'
          label='Emergency Contact'
          placeholder='Enter emergency contact'
          readOnly={readOnly}
        />

        <FormDateField
          control={control}
          name='dateOfBirth'
          label='Date of Birth'
          readOnly={readOnly}
        />
      </div>

      <FormInputField
        control={control}
        name='email'
        label='Email'
        placeholder='Enter email address'
        type='email'
        readOnly={readOnly}
      />

      <FormTextareaField
        control={control}
        name='address'
        label='Address'
        placeholder='Enter full address'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='aadhaarNumber'
        label='Aadhaar Number'
        placeholder='Enter 12-digit Aadhaar'
        required
        readOnly={readOnly}
      />
    </FormSection>
  )
);

const WorkDetailsSection = React.memo(
  ({
    control,
    readOnly,
    designations,
    employeeTypes,
    subDesignations,
  }: {
    control: ReturnType<typeof useForm<EmployeeFormValues>>['control'];
    readOnly: boolean;
    designations: Array<{ value: string; label: string }>;
    employeeTypes: Array<{ value: string; label: string }>;
    subDesignations: Array<{ value: string; label: string }>;
  }) => (
    <FormSection title='Work Details'>
      <div className='grid grid-cols-2 gap-4'>
        <FormSelectField
          control={control}
          name='department'
          label='Department'
          placeholder='Select department'
          options={[...DEPARTMENT_OPTIONS]}
          required
          readOnly={readOnly}
        />

        <FormSearchableComboboxField
          control={control}
          name='employeeType'
          label='Employee Type'
          placeholder='Select employee type'
          options={employeeTypes}
          required
          readOnly={readOnly}
          className='max-w-sm'
          searchPlaceholder='Search employee type...'
          getDisplayValue={(v) =>
            employeeTypes.find((o) => o.value === v)?.label ?? ''
          }
          getOptionValue={(v) => (typeof v === 'string' ? v : '')}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <FormSearchableComboboxField
          control={control}
          name='designation'
          label='Designation'
          placeholder='Select designation'
          options={designations}
          required
          readOnly={readOnly}
          className='max-w-sm'
          searchPlaceholder='Search designation...'
          getDisplayValue={(v) =>
            designations.find((o) => o.value === v)?.label ?? ''
          }
          getOptionValue={(v) => (typeof v === 'string' ? v : '')}
        />

        <FormSearchableComboboxField
          control={control}
          name='subDesignation'
          label='Sub-Designation'
          placeholder={
            subDesignations.length === 0
              ? 'Select designation first'
              : 'Select sub-designation'
          }
          options={subDesignations}
          readOnly={readOnly}
          className='max-w-sm'
          searchPlaceholder='Search sub-designation...'
          getDisplayValue={(v) =>
            subDesignations.find((o) => o.value === v)?.label ?? ''
          }
          getOptionValue={(v) => (typeof v === 'string' ? v : '')}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <FormDateField
          control={control}
          name='joiningDate'
          label='Joining Date'
          required
          readOnly={readOnly}
        />

        <FormSelectField
          control={control}
          name='employmentType'
          label='Employment Type'
          placeholder='Select employment type'
          options={[...EMPLOYMENT_TYPE_OPTIONS]}
          required
          readOnly={readOnly}
        />
      </div>
    </FormSection>
  )
);

const EducationalDetailsSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: ReturnType<typeof useForm<EmployeeFormValues>>['control'];
    readOnly: boolean;
  }) => (
    <FormSection title='Educational Details'>
      <div className='grid grid-cols-2 gap-4'>
        <FormInputField
          control={control}
          name='education'
          label='Education'
          placeholder='Enter highest educational qualification'
          readOnly={readOnly}
        />

        <FormInputField
          control={control}
          name='experienceMonths'
          label='Experience (in months)'
          placeholder='0'
          type='number'
          readOnly={readOnly}
        />
      </div>

      <FormInputField
        control={control}
        name='technicalSkills'
        label='Technical Skills'
        placeholder='Enter technical skills (comma-separated)'
        readOnly={readOnly}
      />

      <FormTextareaField
        control={control}
        name='experienceDetails'
        label='Experience Details'
        placeholder='Enter experience details'
        readOnly={readOnly}
      />
    </FormSection>
  )
);

const PasswordSection = React.memo(
  ({
    control,
  }: {
    control: ReturnType<typeof useForm<EmployeeFormValues>>['control'];
  }) => (
    <FormSection title='User Account'>
      <p className='text-sm text-primary'>
        Enter Password if you want employee to be a user.
      </p>
      <FormInputField
        control={control}
        name='password'
        label='Password'
        placeholder='Enter Password'
        type='password'
      />
    </FormSection>
  )
);

PersonalDetailsSection.displayName = 'PersonalDetailsSection';
WorkDetailsSection.displayName = 'WorkDetailsSection';
EducationalDetailsSection.displayName = 'EducationalDetailsSection';
PasswordSection.displayName = 'PasswordSection';
