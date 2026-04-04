'use client';

import * as React from 'react';
import { useForm, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, isValid } from 'date-fns';
import { Form } from '@/components/ui/form';
import { FormMessage } from '@/components/ui/form';
import { numberToText } from '@/lib/numberToText';
import {
  FormInputField,
  FormDateField,
  FormSearchableComboboxField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import { ProjectFormData, CreateProjectData, Project } from '@/types/projects';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { validDateFormat } from '@/lib/validations';
import {
  useCreateProject,
  useUpdateProject,
} from '@/hooks/projects/use-project-mutations';
import { fetchClientOptions } from '@/hooks/clients/use-clients';
import { useProjectStatus } from '../hooks/use-project-status';
import { getStatusConfig } from '@/hooks/projects/use-project-status';
import { StatusLabel } from '@/components/ui/status-label';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { UserRoleType } from '../../user/types';
import { InputAddon } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { useProject } from '@/hooks/projects/use-project';
import { fetchUserOptions } from '../hooks/use-user';

interface SearchableOption {
  value: string;
  label: string;
  id?: string | number;
}

const FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Project name is required'),
  projectCode: z.string().min(1, 'Project code is required'),
  shortName: z.string().min(1, 'Short name is required'),
  sanctionAmount: z
    .string()
    .min(1, 'Sanction amount is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      'Sanction amount must be a valid number'
    ),
  status: z
    .object({
      id: z.string().min(1, 'Status is required'),
      name: z.string().min(1, 'Status name is required'),
    })
    .nullable(),
  sanctionDos: z
    .string()
    .min(1, 'Sanction DOS is required')
    .refine(validDateFormat, {
      message: 'Invalid date. Use dd/MM/yyyy format or select from calendar.',
    }),
  sanctionDoc: z
    .string()
    .min(1, 'Sanction DOC is required')
    .refine(validDateFormat, {
      message: 'Invalid date. Use dd/MM/yyyy format or select from calendar.',
    }),
  projectLocation: z.string().min(1, 'Project location is required'),
  projectCity: z.string().min(1, 'Project city is required'),
  client: z.object({
    id: z.string().min(1, 'Client is required'),
    name: z.string().min(1, 'Client name is required'),
  }),
  clientAddress: z.string().min(1, 'Client address is required'),
  clientGstn: z
    .string()
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        val.length === 0 ||
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      'Invalid GSTIN format. E.g., 22AAAAA0000A1Z5'
    ),
  verifier: z.object({
    id: z.string().min(1, 'Measurement verifier is required'),
    name: z.string().min(1, 'Measurement verifier name is required'),
  }),
  checker: z.object({
    id: z.string().min(1, 'Measurement checker is required'),
    name: z.string().min(1, 'Measurement checker name is required'),
  }),
  maker: z.object({
    id: z.string().min(1, 'Measurement maker is required'),
    name: z.string().min(1, 'Measurement maker name is required'),
  }),
  projectHead: z.object({
    id: z.string().min(1, 'Project head is required'),
    name: z.string().min(1, 'Project head name is required'),
  }),
  projectEngineer: z.object({
    id: z.string().min(1, 'Project engineer is required'),
    name: z.string().min(1, 'Project engineer name is required'),
  }),
  supervisor: z.object({
    id: z.string().min(1, 'Supervisor is required'),
    name: z.string().min(1, 'Supervisor name is required'),
  }),
});

type ProjectFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  project?: Project | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ProjectDrawer({
  mode,
  project,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';
  const isCopy = mode === 'create' && project?.name.includes('(Copy)');

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const projectStatusQuery = useProjectStatus();

  const statusOptions = React.useMemo(() => {
    return (
      projectStatusQuery.data?.data.map((status) => {
        const config = getStatusConfig(status.name || '');

        return {
          value: status.hashid,
          label: status.name,
          icon: (
            <span
              className={`size-1 rounded-full border border-transparent ${config.dotClass}`}
              aria-hidden
            />
          ),
        };
      }) || []
    );
  }, [projectStatusQuery.data]);

  const {
    project: projectDetail,
    isLoading,
    isError,
  } = useProject(project?.hashId || undefined);

  // Helper function to format date string from API to form format
  // FormDateField expects YYYY-MM-DD format
  const formatDateString = React.useCallback(
    (dateString?: string | null): string => {
      if (!dateString) return '';
      try {
        // Extract date part from ISO string (e.g., "2025-07-31T00:00:00" -> "2025-07-31")
        const datePart = dateString.split('T')[0];
        if (!datePart) return '';

        const date = parseISO(datePart);
        return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
      } catch {
        return '';
      }
    },
    []
  );

  // Single function to get initial form values based on mode
  const getInitialFormValues = React.useCallback(
    (
      mode: OpenCloseMode,
      fetchedProjectData: Project | undefined
    ): ProjectFormValues => {
      // For create mode, return empty form values
      if (mode === 'create') {
        return {
          name: '',
          projectCode: '',
          shortName: '',
          verifier: { id: '', name: '' },
          checker: { id: '', name: '' },
          maker: { id: '', name: '' },
          projectHead: { id: '', name: '' },
          projectEngineer: { id: '', name: '' },
          supervisor: { id: '', name: '' },
          clientAddress: '',
          clientGstn: '',
          projectCity: '',
          client: { id: '', name: '' },
          sanctionAmount: '',
          sanctionDos: '',
          sanctionDoc: '',
          projectLocation: '',
          status: null,
        };
      }

      // For edit/read mode, transform fetched project data to form values
      if (fetchedProjectData) {
        return {
          name: fetchedProjectData.name || '',
          projectCode: fetchedProjectData.code || '',
          shortName: fetchedProjectData.shortname || '',
          verifier: {
            id: fetchedProjectData.verifierHashId || '',
            name: fetchedProjectData.verifier || '',
          },
          checker: {
            id: fetchedProjectData.checkerHashId || '',
            name: fetchedProjectData.checker || '',
          },
          maker: {
            id: fetchedProjectData.makerHashId || '',
            name: fetchedProjectData.maker || '',
          },
          projectHead: {
            id: fetchedProjectData.projectHeadHashId || '',
            name: fetchedProjectData.projectHead || '',
          },
          projectEngineer: {
            id: fetchedProjectData.projectEngineerHashId || '',
            name: fetchedProjectData.engineer || '',
          },
          supervisor: {
            id: fetchedProjectData.supervisorHashId || '',
            name: fetchedProjectData.supervisor || '',
          },
          clientAddress: fetchedProjectData.clientName || '',
          clientGstn: fetchedProjectData.clientgstn || '',
          projectCity: fetchedProjectData.projectCity || '',
          client: {
            id: fetchedProjectData.clientHashId || '',
            name: fetchedProjectData.clientName || '',
          },
          sanctionAmount: fetchedProjectData.sanctionAmount?.toString() || '',
          sanctionDos: formatDateString(fetchedProjectData.sanctionDos),
          sanctionDoc: formatDateString(fetchedProjectData.sanctionDoc),
          projectLocation: fetchedProjectData.projectLocation || '',
          status: {
            id: fetchedProjectData.statusHashId || '',
            name: fetchedProjectData.status || '',
          },
        };
      }

      // Fallback: return empty form values if no data available
      return {
        name: '',
        projectCode: '',
        shortName: '',
        verifier: { id: '', name: '' },
        checker: { id: '', name: '' },
        maker: { id: '', name: '' },
        projectHead: { id: '', name: '' },
        projectEngineer: { id: '', name: '' },
        supervisor: { id: '', name: '' },
        clientAddress: '',
        clientGstn: '',
        projectCity: '',
        client: { id: '', name: '' },
        sanctionAmount: '',
        sanctionDos: '',
        sanctionDoc: '',
        projectLocation: '',
        status: null,
      };
    },
    [formatDateString]
  );

  const defaultValues: ProjectFormValues = React.useMemo(() => {
    return getInitialFormValues(mode, projectDetail);
  }, [mode, projectDetail, getInitialFormValues]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues,
    mode: 'all',
  });

  // Track the last project hashId we've reset for to prevent infinite loops
  const lastResetHashIdRef = React.useRef<string | undefined>(undefined);

  // Reset form when fetched data becomes available (for edit/view mode)
  React.useEffect(() => {
    const currentHashId = project?.hashId;

    // Reset ref when switching to create mode (no project)
    if (!project) {
      lastResetHashIdRef.current = undefined;
      return;
    }

    if (
      projectDetail &&
      !isLoading &&
      currentHashId &&
      currentHashId !== lastResetHashIdRef.current
    ) {
      const formValues = getInitialFormValues(mode, projectDetail);
      form.reset(formValues);
      lastResetHashIdRef.current = currentHashId;
    }
    // Note: projectFormData is checked inside the effect but not in dependencies since it's
    // derived from the query which is tied to the hashId. We track hashId changes to prevent
    // resetting multiple times for the same project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.hashId, isLoading, mode, getInitialFormValues]);

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      // Transform form values to API format
      const transformedData = {
        id: projectDetail?.hashId || undefined,
        hashId: projectDetail?.hashId || undefined,
        name: values.name,
        code: values.projectCode,
        shortName: values.shortName || '',
        sanctionAmount: Number(values.sanctionAmount),
        sanctionDos: values.sanctionDos || null,
        sanctionDoc: values.sanctionDoc || null,
        projectLocation: values.projectLocation || '',
        projectCity: values.projectCity,
        clientHashId: values.client.id,
        gst: values.clientGstn || undefined,
        makerHashId: values.maker.id,
        checkerHashId: values.checker.id,
        verifierHashId: values.verifier.id,
        projectHeadHashId: values.projectHead.id,
        projectEngineerHashId: values.projectEngineer.id,
        superviserHashId: values.supervisor.id,
        statusHashId: values.status?.id || '',
      };

      if (isEdit) {
        await updateProjectMutation.mutateAsync(
          transformedData as ProjectFormData
        );
      } else {
        await createProjectMutation.mutateAsync(
          transformedData as CreateProjectData
        );
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
      // Error handling is done in the mutation hooks, so we don't need to show another toast here
    }
  };

  // Show loading state in drawer content
  if (project && isLoading) {
    return (
      <DrawerWrapper open={open} onClose={onCancel}>
        <DrawerHeader>
          <DrawerTitle>
            {isRead
              ? 'View Project'
              : isEdit
                ? 'Edit Project'
                : 'Create Project'}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerContentContainer>
          <div className='flex items-center justify-center py-12'>
            <Loader className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        </DrawerContentContainer>
      </DrawerWrapper>
    );
  }

  // Show error state in drawer content
  if (project && isError) {
    return (
      <DrawerWrapper open={open} onClose={onCancel}>
        <DrawerHeader>
          <DrawerTitle>
            {isRead
              ? 'View Project'
              : isEdit
                ? 'Edit Project'
                : 'Create Project'}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerContentContainer>
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <p className='text-sm text-destructive'>Error loading project</p>
              <p className='text-xs text-muted-foreground mt-2'>
                Please try again later
              </p>
            </div>
          </div>
        </DrawerContentContainer>
      </DrawerWrapper>
    );
  }

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead ? 'View Project' : isEdit ? 'Edit Project' : 'Create Project'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='project-form'
        control={form.control}
        readOnly={isRead}
        allowSubmitWhenNotDirty={isCopy || false}
        isLoading={
          createProjectMutation.isPending || updateProjectMutation.isPending
        }
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='project-form'
            onSubmit={form.handleSubmit(handleSubmit!)}
            className='flex flex-col gap-6'
          >
            <BasicInformationSection
              control={form.control}
              readOnly={isRead}
              project={projectDetail}
              statusOptions={statusOptions}
            />
            <LocationDetailsSection control={form.control} readOnly={isRead} />
            <ClientInformationSection
              control={form.control}
              readOnly={isRead}
              form={form}
            />
            <ProjectTeamsSection control={form.control} readOnly={isRead} />
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const SanctionAmountField = React.memo(
  ({
    control,
    name,
    readOnly,
  }: {
    control: Control<ProjectFormValues>;
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
  }) => {
    const fieldValue = useWatch({
      control,
      name: name as keyof ProjectFormValues,
    });

    // Use useMemo to compute the text representation
    const amountText = React.useMemo(() => {
      const numValue = Number(fieldValue);
      if (!fieldValue || isNaN(numValue) || numValue <= 0) {
        return '';
      }
      return numberToText(numValue);
    }, [fieldValue]);

    return (
      <div>
        <FormInputField
          control={control}
          name='sanctionAmount'
          label='Sanction Amount (Rupees)'
          placeholder='Enter amount'
          required
          type='number'
          readOnly={readOnly}
          inputAddon={<InputAddon>₹</InputAddon>}
        />
        {amountText && !readOnly && (
          <div className='text-sm text-muted-foreground mt-1 italic'>
            {amountText}
          </div>
        )}
        <FormMessage />
      </div>
    );
  }
);

const BasicInformationSection = React.memo(
  ({
    control,
    readOnly,
    project,
    statusOptions,
  }: {
    control: Control<ProjectFormValues>;
    readOnly: boolean;
    project?: Project | undefined;
    statusOptions: { value: string; label: string }[];
  }) => (
    <FormSection title='Basic Information' showSeparator={false}>
      <FormInputField
        control={control}
        name='name'
        label='Project Name'
        placeholder='Enter project name'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='projectCode'
        label='Project Code'
        placeholder='Enter project code'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='shortName'
        label='Short Name'
        placeholder='Enter project short name'
        required
        readOnly={readOnly}
      />

      <SanctionAmountField
        control={control}
        name='sanctionAmount'
        label='Sanction Amount (Rupees)'
        placeholder='Enter amount'
        required
        readOnly={readOnly}
      />

      <div className='grid grid-cols-2 gap-4'>
        <FormDateField
          control={control}
          name='sanctionDos'
          label='Sanction DOS'
          required
          readOnly={readOnly}
        />

        <FormDateField
          control={control}
          name='sanctionDoc'
          label='Sanction DOC'
          required
          readOnly={readOnly}
        />
      </div>

      {readOnly ? (
        <div className='space-y-2'>
          <label className='text-sm font-medium text-muted-foreground'>
            Project Status
          </label>
          <StatusLabel status={project?.status} fallback='Not specified' />
        </div>
      ) : (
        <FormSearchableComboboxField
          control={control}
          name='status'
          label='Status'
          placeholder='Select status'
          options={statusOptions}
          required
          readOnly={readOnly}
          searchPlaceholder='Search statuses...'
          emptyMessage='No statuses found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />
      )}
    </FormSection>
  )
);

const LocationDetailsSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<ProjectFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Location Details'>
      <FormInputField
        control={control}
        name='projectLocation'
        label='Project Location'
        placeholder='Enter project location'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='projectCity'
        label='Project City'
        placeholder='Enter project city'
        required
        readOnly={readOnly}
      />
    </FormSection>
  )
);

const ClientInformationSection = React.memo(
  ({
    control,
    readOnly,
    form,
  }: {
    control: Control<ProjectFormValues>;
    readOnly: boolean;
    form: ReturnType<typeof useForm<ProjectFormValues>>;
  }) => {
    return (
      <FormSection title='Client Information'>
        <FormSearchableComboboxField
          control={control}
          name='client'
          label='Client'
          placeholder='Select client'
          fetchOptions={fetchClientOptions}
          required
          readOnly={readOnly}
          searchPlaceholder='Search clients...'
          emptyMessage='No clients found'
          onSelect={(option) => {
            if (!readOnly) {
              const optionWithExtras = option as SearchableOption & {
                address?: string;
                gstn?: string;
              };
              form.setValue('clientAddress', optionWithExtras.address || '', {
                shouldValidate: true,
              });
              form.setValue('clientGstn', optionWithExtras.gstn || '', {
                shouldValidate: true,
              });
            }
          }}
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
          name='clientAddress'
          label='Client Address'
          placeholder='Enter client address'
          required
          readOnly={readOnly}
        />

        <FormInputField
          control={control}
          name='clientGstn'
          label='Client GSTIN No'
          placeholder='Enter client GSTIN No'
          readOnly={readOnly}
          type='text'
          inputAddon={<InputAddon>GST</InputAddon>}
        />
      </FormSection>
    );
  }
);

const ProjectTeamsSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<ProjectFormValues>;
    readOnly: boolean;
  }) => {
    const fetcher =
      (role: UserRoleType) =>
      (query: string, page: number = 1) =>
        fetchUserOptions(query, role, page);
    return (
      <FormSection title='Project Teams' showSeparator>
        <FormSearchableComboboxField
          control={control}
          name='verifier'
          label='Measurement Verifier'
          placeholder='Select measurement verifier'
          fetchOptions={fetcher(UserRoleType.Verifier)}
          required
          readOnly={readOnly}
          searchPlaceholder='Search users...'
          emptyMessage='No users found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />

        <FormSearchableComboboxField
          control={control}
          name='checker'
          label='Measurement Checker'
          placeholder='Select measurement checker'
          fetchOptions={fetcher(UserRoleType.Checker)}
          required
          readOnly={readOnly}
          searchPlaceholder='Search users...'
          emptyMessage='No users found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />

        <FormSearchableComboboxField
          control={control}
          name='maker'
          label='Measurement Maker'
          placeholder='Select measurement maker'
          fetchOptions={fetcher(UserRoleType.Maker)}
          required
          readOnly={readOnly}
          searchPlaceholder='Search users...'
          emptyMessage='No users found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />

        <FormSearchableComboboxField
          control={control}
          name='projectHead'
          label='Project Head'
          placeholder='Select project head'
          fetchOptions={fetcher(UserRoleType.ProjectHead)}
          required
          readOnly={readOnly}
          searchPlaceholder='Search users...'
          emptyMessage='No users found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />

        <FormSearchableComboboxField
          control={control}
          name='projectEngineer'
          label='Project Engineer'
          placeholder='Select project engineer'
          fetchOptions={fetcher(UserRoleType.Engineer)}
          required
          readOnly={readOnly}
          searchPlaceholder='Search users...'
          emptyMessage='No users found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />

        <FormSearchableComboboxField
          control={control}
          name='supervisor'
          label='Supervisor'
          placeholder='Select supervisor'
          fetchOptions={fetcher(UserRoleType.Superviser)}
          required
          readOnly={readOnly}
          searchPlaceholder='Search users...'
          emptyMessage='No users found'
          getValue={(option) => ({ id: option.value, name: option.label })}
          getDisplayValue={(fieldValue) =>
            (fieldValue as { name?: string })?.name || ''
          }
          getOptionValue={(fieldValue) =>
            (fieldValue as { id?: string })?.id || ''
          }
        />
      </FormSection>
    );
  }
);

SanctionAmountField.displayName = 'SanctionAmountField';
BasicInformationSection.displayName = 'BasicInformationSection';
LocationDetailsSection.displayName = 'LocationDetailsSection';
ClientInformationSection.displayName = 'ClientInformationSection';
ProjectTeamsSection.displayName = 'ProjectTeamsSection';
