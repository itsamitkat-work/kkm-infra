'use client';

import * as React from 'react';
import { useWatch, type FieldPath } from 'react-hook-form';
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
  FormSelectField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { validDateFormat } from '@/lib/validations';
import { fetchClientOptions } from '../api/project-client-api';
import {
  fetchClientDetail,
  parseClientAddresses,
  useClient,
} from '@/hooks/useClients';
import {
  billingAddressSelectOptions,
  billingSummaryForIndex,
} from '@/lib/clients/address-display';
import {
  projectStatusDisplayLabel,
  getStatusConfig,
} from '@/hooks/projects/use-project-status';
import { StatusLabel } from '@/components/ui/status-label';
import { OpenCloseMode } from '@/hooks/use-open-close';
import {
  PROJECT_MEMBER_ROLE_SLUGS,
  PROJECT_TEAM_DRAWER_ESTIMATION_FIELDS,
  PROJECT_TEAM_DRAWER_OPERATIONS_FIELDS,
  type ProjectMemberRoleSlug,
} from '@/hooks/projects/use-project-member';
import { InputGroupAddon } from '@/components/ui/input-group';
import { Loader } from 'lucide-react';
import { useProject } from '../hooks/use-project-query';
import { fetchUserOptions } from '../api/project-user-api';
import {
  projectMembersToSelection,
  type ProjectsListRow,
  type ProjectDetail,
  type ProjectDetailMember,
  type ProjectScheduleDetail,
} from '../api/project-api';
import { parseProjectMeta } from '@/lib/projects/project-meta';
import {
  useCreateProject,
  useUpdateProject,
} from '../hooks/use-projects-mutations';
import type { ProjectMemberSelection } from '@/lib/projects/persist-project';
import { useAuth } from '@/hooks/auth';
import { useAppForm } from '@/hooks/use-app-form';
import { toast } from 'sonner';
import { PROJECT_DB_STATUS } from '@/types/projects';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FieldLegend } from '@/components/ui/field';

const userPickSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const clientPickSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const projectScheduleRowSchema = z.object({
  schedule_source_id: z.string(),
  display_name: z.string(),
  selected: z.boolean(),
  is_default: z.boolean(),
});

const schedulePickSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const optionalNonNegativeAmount = z
  .string()
  .refine(
    (val) => val.trim() === '' || (!isNaN(Number(val)) && Number(val) >= 0),
    { message: 'Sanction amount must be a valid number' }
  );

const optionalFormDate = z.string().refine(validDateFormat, {
  message: 'Invalid date. Use dd/MM/yyyy format or select from calendar.',
});

const FORM_SCHEMA_BASE = z.object({
  name: z.string().min(1, 'Project name is required'),
  code: z.string(),
  status: z.enum(
    [
      PROJECT_DB_STATUS.ACTIVE,
      PROJECT_DB_STATUS.ON_HOLD,
      PROJECT_DB_STATUS.CLOSED,
    ],
    { message: 'Status is required' }
  ),
  short_name: z.string(),
  sanction_amount: optionalNonNegativeAmount,
  sanction_dos: optionalFormDate,
  sanction_doc: optionalFormDate,
  location: z.string(),
  city: z.string(),
  client: clientPickSchema,
  project_schedule_rows: z.array(projectScheduleRowSchema),
  schedule_source: schedulePickSchema,
  billing_address_index: z.string(),
  project_verifier: userPickSchema,
  project_checker: userPickSchema,
  project_maker: userPickSchema,
  project_head: userPickSchema,
  project_engineer: userPickSchema,
  project_supervisor: userPickSchema,
});

function addDuplicatePersonIssues<T extends string>(
  ctx: z.RefinementCtx,
  entries: { path: T; id: string }[],
  message: string
) {
  const byId = new Map<string, T[]>();
  for (const { path, id } of entries) {
    if (!id) {
      continue;
    }
    const list = byId.get(id) ?? [];
    list.push(path);
    byId.set(id, list);
  }
  for (const paths of byId.values()) {
    if (paths.length > 1) {
      for (const p of paths) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: [p],
        });
      }
    }
  }
}

type ProjectFormValues = z.infer<typeof FORM_SCHEMA_BASE>;

function metaBillingIndex(values: ProjectFormValues): number {
  const n = Number.parseInt(values.billing_address_index || '0', 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

const FORM_SCHEMA = FORM_SCHEMA_BASE.superRefine((val, ctx) => {
  const headId = val.project_head.id.trim();
  const engineerId = val.project_engineer.id.trim();
  const supervisorId = val.project_supervisor.id.trim();
  const makerId = val.project_maker.id.trim();
  const checkerId = val.project_checker.id.trim();
  const verifierId = val.project_verifier.id.trim();

  if (!headId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a project head.',
      path: ['project_head'],
    });
  }
  if (!engineerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a project engineer.',
      path: ['project_engineer'],
    });
  }
  if (!supervisorId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a supervisor.',
      path: ['project_supervisor'],
    });
  }

  addDuplicatePersonIssues(
    ctx,
    [
      { path: 'project_head', id: headId },
      { path: 'project_engineer', id: engineerId },
      { path: 'project_supervisor', id: supervisorId },
    ],
    'Team Operations: Project Head, Project Engineer, and Supervisor must be three different people.'
  );

  if (!makerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a project maker.',
      path: ['project_maker'],
    });
  }
  if (!checkerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a project checker.',
      path: ['project_checker'],
    });
  }
  if (!verifierId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a project verifier.',
      path: ['project_verifier'],
    });
  }

  addDuplicatePersonIssues(
    ctx,
    [
      { path: 'project_maker', id: makerId },
      { path: 'project_checker', id: checkerId },
      { path: 'project_verifier', id: verifierId },
    ],
    'Team Estimation: Project Maker, Checker, and Verifier must be three different people.'
  );
});

const EMPTY_USER = { id: '', name: '' };

const EMPTY_CLIENT = { id: '', name: '' };

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
  const pick = (slug: ProjectMemberRoleSlug) => {
    const id = members[slug] ?? '';
    const name =
      d.members_detail.find((m: ProjectDetailMember) => m.role === slug)
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

  const projectScheduleRows = d.project_schedules
    .filter((s: ProjectScheduleDetail) => s.is_active)
    .map((s: ProjectScheduleDetail) => ({
      schedule_source_id: s.schedule_source_id,
      display_name:
        s.schedule_sources?.display_name ??
        s.schedule_sources?.name ??
        'Schedule',
      selected: true,
      is_default: Boolean(s.is_default),
    }));

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
    client: {
      id: d.client_id ?? meta.client_id ?? '',
      name: d.client_display_name ?? meta.client_display_name ?? '',
    },
    project_schedule_rows: projectScheduleRows,
    schedule_source: { id: sid, name: sname },
    billing_address_index: String(meta.client_billing_address_index ?? 0),
    project_verifier: pick('project_verifier'),
    project_checker: pick('project_checker'),
    project_maker: pick('project_maker'),
    project_head: pick('project_head'),
    project_engineer: pick('project_engineer'),
    project_supervisor: pick('project_supervisor'),
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
    client: {
      id: row.client_id ?? meta.client_id ?? '',
      name: row.client_display_name ?? meta.client_display_name ?? '',
    },
    project_schedule_rows: [],
    schedule_source: {
      id: row.default_schedule_source_id ?? '',
      name: row.default_schedule_display_name ?? '',
    },
    billing_address_index: String(meta.client_billing_address_index ?? 0),
    project_verifier: EMPTY_USER,
    project_checker: EMPTY_USER,
    project_maker: EMPTY_USER,
    project_head: EMPTY_USER,
    project_engineer: EMPTY_USER,
    project_supervisor: EMPTY_USER,
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
    client: { ...EMPTY_CLIENT },
    project_schedule_rows: [],
    schedule_source: { id: '', name: '' },
    billing_address_index: '',
    project_verifier: EMPTY_USER,
    project_checker: EMPTY_USER,
    project_maker: EMPTY_USER,
    project_head: EMPTY_USER,
    project_engineer: EMPTY_USER,
    project_supervisor: EMPTY_USER,
  };
}

function valuesToMeta(
  v: ProjectFormValues,
  forDirty: boolean
): import('@/types/projects').ProjectMeta {
  const sanctionTrim = v.sanction_amount.trim();
  const parsedSanction = sanctionTrim === '' ? null : Number(sanctionTrim);
  const sanction_amount =
    sanctionTrim === '' ||
    parsedSanction === null ||
    Number.isNaN(parsedSanction)
      ? null
      : parsedSanction;

  const base = {
    short_name: v.short_name.trim() || null,
    location: v.location.trim() || null,
    city: v.city.trim() || null,
    sanction_amount,
    sanction_dos: v.sanction_dos?.trim() ? v.sanction_dos : null,
    sanction_doc: v.sanction_doc?.trim() ? v.sanction_doc : null,
    client_billing_address_index: metaBillingIndex(v),
  };
  const clientLink =
    v.client && typeof v.client.id === 'string' && v.client.id.trim().length > 0
      ? {
          client_id: v.client.id.trim(),
          client_display_name: v.client.name.trim() || null,
        }
      : {};
  if (forDirty) {
    return { ...base, ...clientLink };
  }
  return {
    ...base,
    ...clientLink,
    client_label: v.schedule_source.name || null,
  };
}

function toMemberSelection(v: ProjectFormValues): ProjectMemberSelection {
  const out = {} as ProjectMemberSelection;
  for (const slug of PROJECT_MEMBER_ROLE_SLUGS) {
    out[slug] = v[slug].id;
  }
  return out;
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
  const isNewCreate = mode === 'create' && !isCopy;
  const allowClientHydration =
    (isNewCreate || isCopy) && !isEdit && !isRead;

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

  const { project: projectDetail, isLoading, isError } = useProject(detailId);

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

  const form = useAppForm<ProjectFormValues>({
    submitMode: isEdit ? 'edit' : 'create',
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    beforeSubmit: async (values) => {
      if (!isEdit && !isSystemAdmin && !tenantId) {
        toast.error('Missing tenant context.');
        return false;
      }
      if (isNewCreate) {
        const cid = values.client.id?.trim();
        if (!cid) {
          toast.error('Select a client.');
          return false;
        }
        const rows = values.project_schedule_rows ?? [];
        const selected = rows.filter((r) => r.selected);
        if (selected.length === 0) {
          toast.error(
            'Select at least one schedule from the client. Add schedules on the client first.'
          );
          return false;
        }
        if (!selected.some((r) => r.is_default)) {
          toast.error('Choose a default schedule among the selected ones.');
          return false;
        }
      }
      return true;
    },
    onCreate: async (values) => {
      try {
        const cid = values.client.id?.trim();
        if (cid) {
          const clientRow = await fetchClientDetail(cid);
          const addrCount = parseClientAddresses(clientRow.addresses).length;
          if (addrCount === 0) {
            toast.error(
              'The selected client has no addresses. Add at least one address on the client before creating a project.'
            );
            return;
          }
        }
        const members = toMemberSelection(values);
        const rows = values.project_schedule_rows ?? [];
        const selected = rows.filter((r) => r.selected);
        const defaultRow = selected.find((r) => r.is_default) ?? selected[0];
        const defaultScheduleId =
          defaultRow?.schedule_source_id ?? values.schedule_source.id.trim();
        const additionalScheduleIds = selected
          .map((r) => r.schedule_source_id)
          .filter((id) => id && id !== defaultScheduleId);

        await createProjectMutation.mutateAsync({
          name: values.name,
          code: values.code.trim() || null,
          status: values.status,
          meta: {
            ...valuesToMeta(values, false),
          },
          ...(defaultScheduleId
            ? { schedule_source_id: defaultScheduleId }
            : {}),
          ...(additionalScheduleIds.length > 0
            ? { additional_schedule_source_ids: additionalScheduleIds }
            : {}),
          members,
        });
        onSubmit();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
    onPatch: async (dirty, values) => {
      try {
        if (!projectDetail) {
          return;
        }
        const members = toMemberSelection(values);
        const metaDirty =
          Boolean(dirty.short_name) ||
          Boolean(dirty.location) ||
          Boolean(dirty.city) ||
          Boolean(dirty.sanction_amount) ||
          Boolean(dirty.sanction_dos) ||
          Boolean(dirty.sanction_doc) ||
          Boolean(dirty.billing_address_index);

        const teamDirty = PROJECT_MEMBER_ROLE_SLUGS.some(
          (slug) => Boolean(dirty[slug])
        );

        const scheduleDirty =
          'schedule_source' in dirty ||
          'project_schedule_rows' in dirty;
        const defaultScheduleId =
          values.schedule_source.id?.trim() ?? '';

        await updateProjectMutation.mutateAsync({
          tenantId: projectDetail.tenant_id,
          projectId: projectDetail.id,
          ...('name' in dirty ? { name: values.name } : {}),
          ...('code' in dirty ? { code: values.code || null } : {}),
          ...('status' in dirty ? { status: values.status } : {}),
          baseMeta: projectDetail.meta,
          metaPatch: metaDirty ? valuesToMeta(values, false) : undefined,
          ...(scheduleDirty && defaultScheduleId
            ? { schedule_source_id: defaultScheduleId }
            : {}),
          members: teamDirty ? members : undefined,
        });
        onSubmit();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [projectDetail?.id, mode, getDefaultValues, form]);

  const watchClientId = useWatch({
    control: form.control,
    name: 'client.id',
  });

  const {
    client: linkedClientDetail,
    isLoading: isLinkedClientLoading,
  } = useClient(watchClientId?.trim() ? watchClientId : undefined);

  const lastHydratedClientIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!allowClientHydration) {
      return;
    }
    if (!watchClientId?.trim()) {
      lastHydratedClientIdRef.current = null;
      form.setValue('project_schedule_rows', []);
      form.setValue('billing_address_index', '');
      form.setValue('schedule_source', { id: '', name: '' });
      return;
    }
    if (!linkedClientDetail || linkedClientDetail.id !== watchClientId) {
      return;
    }
    if (lastHydratedClientIdRef.current === watchClientId) {
      return;
    }
    lastHydratedClientIdRef.current = watchClientId;
    form.setValue('billing_address_index', '0', {
      shouldValidate: true,
    });
    const rows = (linkedClientDetail.client_schedules ?? [])
      .filter((s) => s.is_active)
      .map((s) => ({
        schedule_source_id: s.schedule_source_id,
        display_name:
          s.schedule_sources?.display_name ??
          s.schedule_sources?.name ??
          'Schedule',
        selected: true,
        is_default: Boolean(s.is_default),
      }));
    form.setValue('project_schedule_rows', rows, { shouldValidate: true });
    const def = rows.find((r) => r.is_default) ?? rows[0];
    if (def) {
      form.setValue(
        'schedule_source',
        { id: def.schedule_source_id, name: def.display_name },
        { shouldValidate: true }
      );
    }
  }, [allowClientHydration, watchClientId, linkedClientDetail, form]);

  const watchBillingIndex = useWatch({
    control: form.control,
    name: 'billing_address_index',
  });

  const clientAddresses = React.useMemo(() => {
    if (!linkedClientDetail || linkedClientDetail.id !== watchClientId?.trim()) {
      return [];
    }
    return parseClientAddresses(linkedClientDetail.addresses);
  }, [linkedClientDetail, watchClientId]);

  const billingAddressOptionsList = React.useMemo(
    () => billingAddressSelectOptions(clientAddresses),
    [clientAddresses]
  );

  React.useEffect(() => {
    if (!watchClientId?.trim() || !linkedClientDetail) {
      return;
    }
    if (linkedClientDetail.id !== watchClientId.trim()) {
      return;
    }
    const n = clientAddresses.length;
    const cur = form.getValues('billing_address_index');
    if (n === 0) {
      if (cur !== '') {
        form.setValue('billing_address_index', '', { shouldValidate: true });
      }
      return;
    }
    const idx = Number.parseInt(cur || '0', 10);
    if (cur === '' || Number.isNaN(idx) || idx < 0 || idx >= n) {
      form.setValue('billing_address_index', '0', { shouldValidate: true });
    }
  }, [watchClientId, linkedClientDetail, clientAddresses, form]);

  const billingDisplay = React.useMemo(
    () =>
      billingSummaryForIndex(
        clientAddresses,
        String(watchBillingIndex ?? '')
      ),
    [clientAddresses, watchBillingIndex]
  );

  const memberFetcher = React.useCallback(
    (roleSlug: ProjectMemberRoleSlug) =>
      (query: string, page: number = 1) =>
        fetchUserOptions(
          query,
          roleSlug,
          page,
          50,
          effectiveMemberTenantId
        ),
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

  const watchSanctionAmount = useWatch({
    control: form.control,
    name: 'sanction_amount',
  });

  const sanctionAmountWords = React.useMemo(() => {
    const n = Number(watchSanctionAmount);
    if (!Number.isFinite(n) || n <= 0) {
      return '';
    }
    return numberToText(n);
  }, [watchSanctionAmount]);

  const watchedScheduleRows = useWatch({
    control: form.control,
    name: 'project_schedule_rows',
  });

  const scheduleRows = React.useMemo(
    () => watchedScheduleRows ?? [],
    [watchedScheduleRows]
  );

  const updateProjectScheduleRows = React.useCallback(
    (next: ProjectFormValues['project_schedule_rows']) => {
      form.setValue('project_schedule_rows', next, {
        shouldDirty: true,
        shouldValidate: true,
      });
      const defaultRow =
        next.find((r) => r.selected && r.is_default) ??
        next.find((r) => r.selected);
      if (defaultRow) {
        form.setValue(
          'schedule_source',
          {
            id: defaultRow.schedule_source_id,
            name: defaultRow.display_name,
          },
          { shouldValidate: true },
        );
      }
    },
    [form],
  );

  const handleToggleProjectScheduleSelected = React.useCallback(
    (index: number, checked: boolean) => {
      const rows = form.getValues('project_schedule_rows') ?? [];
      const prev = rows[index];
      if (!prev) {
        return;
      }
      let next = rows.map((r, i) =>
        i === index ? { ...r, selected: Boolean(checked) } : { ...r },
      );
      if (!checked && prev.is_default) {
        next = next.map((r) => ({ ...r, is_default: false }));
        const first = next.find((r) => r.selected);
        if (first) {
          const fi = next.findIndex(
            (r) => r.schedule_source_id === first.schedule_source_id,
          );
          if (fi >= 0) {
            next = next.map((r, i) =>
              i === fi ? { ...r, is_default: true } : r,
            );
          }
        }
      }
      if (checked && !next.some((r) => r.selected && r.is_default)) {
        const toggled = next[index];
        if (toggled) {
          next = next.map((r) => ({
            ...r,
            is_default: r.schedule_source_id === toggled.schedule_source_id,
          }));
        }
      }
      updateProjectScheduleRows(next);
    },
    [form, updateProjectScheduleRows],
  );

  const handleSetDefaultProjectSchedule = React.useCallback(
    (scheduleSourceId: string) => {
      const rows = form.getValues('project_schedule_rows') ?? [];
      const next = rows.map((r) => ({
        ...r,
        is_default: r.selected && r.schedule_source_id === scheduleSourceId,
      }));
      updateProjectScheduleRows(next);
    },
    [form, updateProjectScheduleRows],
  );

  const selectedDefaultScheduleSourceId = React.useMemo(() => {
    const row = scheduleRows.find((r) => r.selected && r.is_default);
    return row?.schedule_source_id ?? '';
  }, [scheduleRows]);

  const projectStatusLabel =
    projectDetail != null
      ? projectStatusDisplayLabel(projectDetail.status)
      : project != null
        ? projectStatusDisplayLabel(project.status)
        : undefined;

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
            onSubmit={form.submit}
            className='flex flex-col gap-6'
          >
            <FormSection title='Basic Information' showSeparator={false}>
              <FormInputField
                control={form.control}
                name='name'
                label='Project Name'
                placeholder='Enter project name'
                required
                readOnly={isRead}
              />
              <FormInputField
                control={form.control}
                name='code'
                label='Project Code'
                placeholder='Enter project code'
                readOnly={isRead || isEdit}
              />
              <FormInputField
                control={form.control}
                name='short_name'
                label='Short Name'
                placeholder='Enter project short name'
                readOnly={isRead}
              />
              <div>
                <FormInputField
                  control={form.control}
                  name='sanction_amount'
                  label='Sanction Amount (Rupees)'
                  placeholder='Enter amount'
                  type='number'
                  readOnly={isRead}
                  inputAddon={<InputGroupAddon>₹</InputGroupAddon>}
                />
                {sanctionAmountWords && !isRead && (
                  <div className='text-sm text-muted-foreground mt-1 italic'>
                    {sanctionAmountWords}
                  </div>
                )}
                <FormMessage />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormDateField
                  control={form.control}
                  name='sanction_dos'
                  label='Sanction DOS'
                  readOnly={isRead}
                />
                <FormDateField
                  control={form.control}
                  name='sanction_doc'
                  label='Sanction DOC'
                  readOnly={isRead}
                />
              </div>
              {isRead ? (
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Project Status
                  </label>
                  <StatusLabel
                    status={projectStatusLabel}
                    fallback='Not specified'
                  />
                </div>
              ) : (
                <FormSearchableComboboxField
                  control={form.control}
                  name='status'
                  label='Status'
                  placeholder='Select status'
                  options={statusOptions}
                  readOnly={isRead}
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

            <FormSection title='Location Details'>
              <FormInputField
                control={form.control}
                name='location'
                label='Project Location'
                placeholder='Enter project location'
                readOnly={isRead}
              />
              <FormInputField
                control={form.control}
                name='city'
                label='Project City'
                placeholder='Enter project city'
                readOnly={isRead}
              />
            </FormSection>

            <FormSection title='Client and schedules'>
              <FormSearchableComboboxField
                control={form.control}
                name='client'
                label='Client'
                placeholder='Search and select a client'
                fetchOptions={fetchClientOptions}
                readOnly={isRead || isEdit}
                required
                searchPlaceholder='Search clients…'
                emptyMessage='No clients found'
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
              {Boolean(watchClientId?.trim()) &&
                isLinkedClientLoading &&
                !linkedClientDetail && (
                  <p className='text-sm text-muted-foreground flex items-center gap-2'>
                    <Loader className='h-4 w-4 animate-spin' aria-hidden />
                    Loading client…
                  </p>
                )}
              {!isRead && scheduleRows.length > 0 && (
                <div className='space-y-2'>
                  <Label className='text-sm font-medium'>
                    Schedules for this project
                  </Label>
                  <p className='text-xs text-muted-foreground'>
                    Only schedules linked to the client are listed. Uncheck any
                    you do not need; choose one default for pricing and tree
                    data.
                  </p>
                  <RadioGroup
                    value={selectedDefaultScheduleSourceId}
                    onValueChange={handleSetDefaultProjectSchedule}
                    className='flex flex-col gap-2'
                  >
                    {scheduleRows.map((row, index) => (
                      <div
                        key={row.schedule_source_id}
                        className='flex items-center gap-3 rounded-md border px-3 py-2'
                      >
                        <Checkbox
                          checked={row.selected}
                          disabled={isRead}
                          onCheckedChange={(v) => {
                            handleToggleProjectScheduleSelected(
                              index,
                              v === true,
                            );
                          }}
                          aria-label={`Include ${row.display_name}`}
                        />
                        <RadioGroupItem
                          value={row.schedule_source_id}
                          id={`proj-sched-${row.schedule_source_id}`}
                          disabled={!row.selected || isRead}
                        />
                        <Label
                          htmlFor={`proj-sched-${row.schedule_source_id}`}
                          className='flex-1 truncate font-normal'
                        >
                          {row.display_name}
                          {row.selected && row.is_default && (
                            <span className='ml-2 text-xs text-muted-foreground'>
                              (default)
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
              {isRead && scheduleRows.length > 0 && (
                <ul className='list-disc pl-5 text-sm text-muted-foreground'>
                  {scheduleRows
                    .filter((r) => r.selected)
                    .map((r) => (
                      <li key={r.schedule_source_id}>
                        {r.display_name}
                        {r.is_default ? ' (default)' : ''}
                      </li>
                    ))}
                </ul>
              )}
              <FormSelectField
                control={form.control}
                name='billing_address_index'
                label='Billing address'
                placeholder={
                  billingAddressOptionsList.length === 0
                    ? 'Add addresses on the client first'
                    : 'Select billing address'
                }
                options={billingAddressOptionsList}
                readOnly={
                  isRead ||
                  !watchClientId?.trim() ||
                  billingAddressOptionsList.length === 0
                }
              />
              <div className='space-y-2 rounded-md border bg-muted/30 p-3'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Billing details (from client)
                </p>
                <p className='text-sm whitespace-pre-wrap'>
                  {billingDisplay.addressLine}
                </p>
                <p className='text-sm font-mono text-muted-foreground'>
                  GSTIN: {billingDisplay.gstin}
                </p>
              </div>
            </FormSection>

            <FormSection title='Project Team' showSeparator={false}>
              <div className='space-y-4 rounded-lg border bg-muted/30 p-4'>
                <FieldLegend variant='legend'>Estimation</FieldLegend>
                <div className='space-y-4'>
                  {PROJECT_TEAM_DRAWER_ESTIMATION_FIELDS.map((field) => (
                    <FormSearchableComboboxField
                      key={field.roleSlug}
                      control={form.control}
                      name={
                        field.roleSlug as FieldPath<ProjectFormValues>
                      }
                      label={field.label}
                      placeholder={field.placeholder}
                      fetchOptions={memberFetcher(field.roleSlug)}
                      readOnly={isRead}
                      required
                      searchPlaceholder='Search users…'
                      emptyMessage='No users found'
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
                  ))}
                </div>
              </div>
              <div className='space-y-4 rounded-lg border bg-muted/30 p-4'>
                <FieldLegend variant='legend'>Operations</FieldLegend>
                <div className='space-y-4'>
                  {PROJECT_TEAM_DRAWER_OPERATIONS_FIELDS.map((field) => (
                    <FormSearchableComboboxField
                      key={field.roleSlug}
                      control={form.control}
                      name={
                        field.roleSlug as FieldPath<ProjectFormValues>
                      }
                      label={field.label}
                      placeholder={field.placeholder}
                      fetchOptions={memberFetcher(field.roleSlug)}
                      readOnly={isRead}
                      required
                      searchPlaceholder='Search users…'
                      emptyMessage='No users found'
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
                  ))}
                </div>
              </div>
            </FormSection>
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}
