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
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { validDateFormat } from '@/lib/validations';
import { fetchScheduleSourceOptions } from '@/hooks/schedules/use-schedule-sources';
import { projectStatusDisplayLabel, getStatusConfig } from '@/hooks/projects/use-project-status';
import { StatusLabel } from '@/components/ui/status-label';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { UserRoleType } from '../../user/types';
import { InputAddon } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { useProject } from '@/hooks/projects/use-project';
import { fetchUserOptions } from '../hooks/use-user';
import {
  parseProjectMeta,
  type ProjectsListRow,
  type ProjectDetail,
  type ProjectDetailMember,
  type ProjectScheduleDetail,
  projectMembersToSelection,
  useCreateProject,
  useUpdateProject,
} from '@/hooks/useProjects';
import type { ProjectMemberSelection } from '@/lib/projects/persist-project';
import { useAuth } from '@/hooks/auth';
import { getDirtyValues } from '@/lib/get-dirty-values';
import { toast } from 'sonner';
import { PROJECT_DB_STATUS } from '@/types/projects';

interface SearchableOption {
  value: string;
  label: string;
  id?: string | number;
}

const userPickSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const schedulePickSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Project name is required'),
  code: z.string().min(1, 'Project code is required'),
  status: z.enum(
    [PROJECT_DB_STATUS.ACTIVE, PROJECT_DB_STATUS.ON_HOLD, PROJECT_DB_STATUS.CLOSED],
    { message: 'Status is required' }
  ),
  short_name: z.string().min(1, 'Short name is required'),
  sanction_amount: z
    .string()
    .min(1, 'Sanction amount is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      'Sanction amount must be a valid number'
    ),
  sanction_dos: z
    .string()
    .min(1, 'Sanction DOS is required')
    .refine(validDateFormat, {
      message: 'Invalid date. Use dd/MM/yyyy format or select from calendar.',
    }),
  sanction_doc: z
    .string()
    .min(1, 'Sanction DOC is required')
    .refine(validDateFormat, {
      message: 'Invalid date. Use dd/MM/yyyy format or select from calendar.',
    }),
  location: z.string().min(1, 'Project location is required'),
  city: z.string().min(1, 'Project city is required'),
  schedule_source: schedulePickSchema,
  client_address: z.string().min(1, 'Client address is required'),
  client_gstn: z
    .string()
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        val.length === 0 ||
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      'Invalid GSTIN format. E.g., 22AAAAA0000A1Z5'
    ),
  verifier: userPickSchema,
  checker: userPickSchema,
  maker: userPickSchema,
  project_head: userPickSchema,
  project_engineer: userPickSchema,
  supervisor: userPickSchema,
});

type ProjectFormValues = z.infer<typeof FORM_SCHEMA>;

const EMPTY_USER = { id: '', name: '' };

const STATUS_OPTIONS = [
  { value: PROJECT_DB_STATUS.ACTIVE, label: 'Active' },
  { value: PROJECT_DB_STATUS.ON_HOLD, label: 'On Hold' },
  { value: PROJECT_DB_STATUS.CLOSED, label: 'Closed' },
];

interface Props {
  mode: OpenCloseMode;
  project?: ProjectsListRow | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function formatDateToForm(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const datePart = dateString.split('T')[0];
    if (!datePart) return '';
    const date = parseISO(datePart);
    return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
  } catch {
    return '';
  }
}

function detailToFormValues(d: ProjectDetail): ProjectFormValues {
  const meta = parseProjectMeta(d.meta);
  const members = projectMembersToSelection(d.project_members);
  const pick = (r: UserRoleType) => {
    const id = members[r] ?? '';
    const name =
      d.members_detail.find((m: ProjectDetailMember) => m.role === r)
        ?.display_name ?? '';
    return { id, name };
  };

  const def = d.project_schedules.find(
    (s: ProjectScheduleDetail) => s.is_default && s.is_active
  );
  const sid = def?.schedule_source_id ?? d.default_schedule_source_id ?? '';
  const sname =
    def?.schedule_sources?.display_name ??
    def?.schedule_sources?.name ??
    d.default_schedule_display_name ??
    '';

  return {
    name: d.name,
    code: d.code ?? '',
    status: d.status as ProjectFormValues['status'],
    short_name: meta.short_name ?? '',
    sanction_amount:
      meta.sanction_amount !== null && meta.sanction_amount !== undefined
        ? String(meta.sanction_amount)
        : '',
    sanction_dos: formatDateToForm(meta.sanction_dos),
    sanction_doc: formatDateToForm(meta.sanction_doc),
    location: meta.location ?? '',
    city: meta.city ?? '',
    schedule_source: { id: sid, name: sname },
    client_address: meta.client_address ?? '',
    client_gstn: meta.client_gstn ?? '',
    verifier: pick(UserRoleType.Verifier),
    checker: pick(UserRoleType.Checker),
    maker: pick(UserRoleType.Maker),
    project_head: pick(UserRoleType.ProjectHead),
    project_engineer: pick(UserRoleType.Engineer),
    supervisor: pick(UserRoleType.Superviser),
  };
}

function listRowToFormValues(row: ProjectsListRow): ProjectFormValues {
  const meta = parseProjectMeta(row.meta);
  return {
    name: row.name,
    code: row.code ?? '',
    status: row.status as ProjectFormValues['status'],
    short_name: meta.short_name ?? '',
    sanction_amount:
      meta.sanction_amount !== null && meta.sanction_amount !== undefined
        ? String(meta.sanction_amount)
        : '',
    sanction_dos: formatDateToForm(meta.sanction_dos),
    sanction_doc: formatDateToForm(meta.sanction_doc),
    location: meta.location ?? '',
    city: meta.city ?? '',
    schedule_source: {
      id: row.default_schedule_source_id ?? '',
      name: row.default_schedule_display_name ?? '',
    },
    client_address: meta.client_address ?? '',
    client_gstn: meta.client_gstn ?? '',
    verifier: EMPTY_USER,
    checker: EMPTY_USER,
    maker: EMPTY_USER,
    project_head: EMPTY_USER,
    project_engineer: EMPTY_USER,
    supervisor: EMPTY_USER,
  };
}

function emptyFormValues(): ProjectFormValues {
  return {
    name: '',
    code: '',
    status: PROJECT_DB_STATUS.ACTIVE,
    short_name: '',
    sanction_amount: '',
    sanction_dos: '',
    sanction_doc: '',
    location: '',
    city: '',
    schedule_source: { id: '', name: '' },
    client_address: '',
    client_gstn: '',
    verifier: EMPTY_USER,
    checker: EMPTY_USER,
    maker: EMPTY_USER,
    project_head: EMPTY_USER,
    project_engineer: EMPTY_USER,
    supervisor: EMPTY_USER,
  };
}

function valuesToMeta(
  v: ProjectFormValues,
  forDirty: boolean
): import('@/types/projects').ProjectMeta {
  const base = {
    short_name: v.short_name,
    location: v.location,
    city: v.city,
    sanction_amount: Number(v.sanction_amount),
    sanction_dos: v.sanction_dos || null,
    sanction_doc: v.sanction_doc || null,
    client_address: v.client_address,
    client_gstn: v.client_gstn || null,
  };
  if (forDirty) return base;
  return { ...base, client_label: v.schedule_source.name || null };
}

function toMemberSelection(v: ProjectFormValues): ProjectMemberSelection {
  return {
    [UserRoleType.Verifier]: v.verifier.id,
    [UserRoleType.Checker]: v.checker.id,
    [UserRoleType.Maker]: v.maker.id,
    [UserRoleType.ProjectHead]: v.project_head.id,
    [UserRoleType.Engineer]: v.project_engineer.id,
    [UserRoleType.Superviser]: v.supervisor.id,
  };
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
  const isCopy =
    mode === 'create' && Boolean(project?.name?.includes('(Copy)'));

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? '';
  const isSystemAdmin = claims?.is_system_admin === true;

  const needsDetail =
    mode === 'edit' ||
    mode === 'read' ||
    (mode === 'create' && Boolean(isCopy));

  const detailId = needsDetail ? project?.id : undefined;

  const {
    project: projectDetail,
    isLoading,
    isError,
  } = useProject(detailId);

  const effectiveMemberTenantId =
    projectDetail?.tenant_id ?? (tenantId || null);

  const getDefaultValues = React.useCallback((): ProjectFormValues => {
    if (mode === 'create' && !isCopy) {
      return emptyFormValues();
    }
    if (projectDetail) {
      return detailToFormValues(projectDetail);
    }
    if (project) {
      return listRowToFormValues(project);
    }
    return emptyFormValues();
  }, [mode, isCopy, projectDetail, project]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [projectDetail?.id, mode, getDefaultValues, form]);

  const memberFetcher = React.useCallback(
    (role: UserRoleType) => (query: string, page: number = 1) =>
      fetchUserOptions(query, role, page, 50, effectiveMemberTenantId),
    [effectiveMemberTenantId]
  );

  const statusOptions = React.useMemo(() => {
    return STATUS_OPTIONS.map((o) => {
      const config = getStatusConfig(
        o.value === PROJECT_DB_STATUS.ACTIVE
          ? 'Active'
          : o.value === PROJECT_DB_STATUS.CLOSED
            ? 'Closed'
            : 'On Hold'
      );
      return {
        value: o.value,
        label: o.label,
        icon: (
          <span
            className={`size-1 rounded-full border border-transparent ${config.dotClass}`}
            aria-hidden
          />
        ),
      };
    });
  }, []);

  const handleSubmit = async (values: ProjectFormValues) => {
    if (!isEdit && !isSystemAdmin && !tenantId) {
      toast.error('Missing tenant context.');
      return;
    }

    const members = toMemberSelection(values);
    const memberRoles = [
      UserRoleType.Verifier,
      UserRoleType.Checker,
      UserRoleType.Maker,
      UserRoleType.ProjectHead,
      UserRoleType.Engineer,
      UserRoleType.Superviser,
    ];
    for (const r of memberRoles) {
      if (!members[r]) {
        toast.error('Please select all project team members.');
        return;
      }
    }

    try {
      if (isEdit && projectDetail) {
        const dirty = getDirtyValues(values, form.formState.dirtyFields);
        if (Object.keys(dirty).length === 0) {
          toast.message('No changes to save');
          return;
        }

        const metaDirty =
          Boolean(dirty.short_name) ||
          Boolean(dirty.location) ||
          Boolean(dirty.city) ||
          Boolean(dirty.sanction_amount) ||
          Boolean(dirty.sanction_dos) ||
          Boolean(dirty.sanction_doc) ||
          Boolean(dirty.client_address) ||
          Boolean(dirty.client_gstn);

        const teamDirty =
          Boolean(dirty.verifier) ||
          Boolean(dirty.checker) ||
          Boolean(dirty.maker) ||
          Boolean(dirty.project_head) ||
          Boolean(dirty.project_engineer) ||
          Boolean(dirty.supervisor);

        await updateProjectMutation.mutateAsync({
          tenantId: projectDetail.tenant_id,
          projectId: projectDetail.id,
          ...('name' in dirty ? { name: values.name } : {}),
          ...('code' in dirty ? { code: values.code || null } : {}),
          ...('status' in dirty ? { status: values.status } : {}),
          baseMeta: projectDetail.meta,
          metaPatch: metaDirty ? valuesToMeta(values, false) : undefined,
          ...('schedule_source' in dirty
            ? { schedule_source_id: values.schedule_source.id }
            : {}),
          members: teamDirty ? members : undefined,
        });
      } else {
        await createProjectMutation.mutateAsync({
          name: values.name,
          code: values.code || null,
          status: values.status,
          meta: {
            ...valuesToMeta(values, false),
          },
          schedule_source_id: values.schedule_source.id,
          members,
        });
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (project && needsDetail && isLoading) {
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

  if (project && needsDetail && isError) {
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
        allowSubmitWhenNotDirty={isCopy}
        isLoading={
          createProjectMutation.isPending || updateProjectMutation.isPending
        }
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='project-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <BasicInformationSection
              control={form.control}
              readOnly={isRead}
              projectStatusLabel={
                projectDetail
                  ? projectStatusDisplayLabel(projectDetail.status)
                  : project
                    ? projectStatusDisplayLabel(project.status)
                    : undefined
              }
              statusOptions={statusOptions}
            />
            <LocationDetailsSection control={form.control} readOnly={isRead} />
            <ScheduleSourceInformationSection
              control={form.control}
              readOnly={isRead}
              form={form}
            />
            <ProjectTeamsSection
              control={form.control}
              readOnly={isRead}
              fetchUser={memberFetcher}
            />
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const SanctionAmountField = React.memo(function SanctionAmountField({
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
}) {
  const fieldValue = useWatch({
    control,
    name: name as keyof ProjectFormValues,
  });

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
        name='sanction_amount'
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
});

const BasicInformationSection = React.memo(function BasicInformationSection({
  control,
  readOnly,
  projectStatusLabel,
  statusOptions,
}: {
  control: Control<ProjectFormValues>;
  readOnly: boolean;
  projectStatusLabel?: string;
  statusOptions: { value: string; label: string }[];
}) {
  return (
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
        name='code'
        label='Project Code'
        placeholder='Enter project code'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='short_name'
        label='Short Name'
        placeholder='Enter project short name'
        required
        readOnly={readOnly}
      />

      <SanctionAmountField
        control={control}
        name='sanction_amount'
        label='Sanction Amount (Rupees)'
        placeholder='Enter amount'
        required
        readOnly={readOnly}
      />

      <div className='grid grid-cols-2 gap-4'>
        <FormDateField
          control={control}
          name='sanction_dos'
          label='Sanction DOS'
          required
          readOnly={readOnly}
        />

        <FormDateField
          control={control}
          name='sanction_doc'
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
          <StatusLabel status={projectStatusLabel} fallback='Not specified' />
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
          getValue={(option) => option.value}
          getDisplayValue={(fieldValue) =>
            projectStatusDisplayLabel(String(fieldValue ?? ''))
          }
          getOptionValue={(fieldValue) => String(fieldValue ?? '')}
        />
      )}
    </FormSection>
  );
});

const LocationDetailsSection = React.memo(function LocationDetailsSection({
  control,
  readOnly,
}: {
  control: Control<ProjectFormValues>;
  readOnly: boolean;
}) {
  return (
    <FormSection title='Location Details'>
      <FormInputField
        control={control}
        name='location'
        label='Project Location'
        placeholder='Enter project location'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='city'
        label='Project City'
        placeholder='Enter project city'
        required
        readOnly={readOnly}
      />
    </FormSection>
  );
});

const ScheduleSourceInformationSection = React.memo(
  function ScheduleSourceInformationSection({
    control,
    readOnly,
    form,
  }: {
    control: Control<ProjectFormValues>;
    readOnly: boolean;
    form: ReturnType<typeof useForm<ProjectFormValues>>;
  }) {
    return (
      <FormSection title='Schedule source'>
        <FormSearchableComboboxField
          control={control}
          name='schedule_source'
          label='Schedule'
          placeholder='Select schedule source'
          fetchOptions={fetchScheduleSourceOptions}
          required
          readOnly={readOnly}
          searchPlaceholder='Search schedules…'
          emptyMessage='No schedules found'
          onSelect={(option) => {
            if (!readOnly) {
              const optionWithExtras = option as SearchableOption & {
                address?: string;
                gstn?: string;
              };
              form.setValue('client_address', optionWithExtras.address || '', {
                shouldValidate: true,
              });
              form.setValue('client_gstn', optionWithExtras.gstn || '', {
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
          name='client_address'
          label='Client Address'
          placeholder='Enter client address'
          required
          readOnly={readOnly}
        />

        <FormInputField
          control={control}
          name='client_gstn'
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

const ProjectTeamsSection = React.memo(function ProjectTeamsSection({
  control,
  readOnly,
  fetchUser,
}: {
  control: Control<ProjectFormValues>;
  readOnly: boolean;
  fetchUser: (
    role: UserRoleType
  ) => (query: string, page?: number) => ReturnType<typeof fetchUserOptions>;
}) {
  return (
    <FormSection title='Project Teams' showSeparator>
      <FormSearchableComboboxField
        control={control}
        name='verifier'
        label='Measurement Verifier'
        placeholder='Select measurement verifier'
        fetchOptions={fetchUser(UserRoleType.Verifier)}
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
        fetchOptions={fetchUser(UserRoleType.Checker)}
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
        fetchOptions={fetchUser(UserRoleType.Maker)}
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
        name='project_head'
        label='Project Head'
        placeholder='Select project head'
        fetchOptions={fetchUser(UserRoleType.ProjectHead)}
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
        name='project_engineer'
        label='Project Engineer'
        placeholder='Select project engineer'
        fetchOptions={fetchUser(UserRoleType.Engineer)}
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
        fetchOptions={fetchUser(UserRoleType.Superviser)}
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
});

SanctionAmountField.displayName = 'SanctionAmountField';
BasicInformationSection.displayName = 'BasicInformationSection';
LocationDetailsSection.displayName = 'LocationDetailsSection';
ScheduleSourceInformationSection.displayName =
  'ScheduleSourceInformationSection';
ProjectTeamsSection.displayName = 'ProjectTeamsSection';
