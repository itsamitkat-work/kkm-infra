'use client';

import * as React from 'react';
import { useController, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  FormDrawerHeader,
  FormInputField,
} from '@/components/form';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { FieldGroupDense } from '@/components/field-group-dense';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { CheckboxGrid } from '@/components/tables/checkbox-grid';
import { TableErrorState } from '@/components/tables/table-error';
import { useAuth } from '@/hooks/auth';
import { useAppForm } from '@/hooks/use-app-form';
import type { OpenCloseMode } from '@/hooks/use-open-close';
import { toast } from 'sonner';

import type {
  PermissionCatalogRow,
  TenantRole,
  TenantRoleDetail,
} from '../api/tenant-roles-api';
import { useTenantRoleDetailQuery } from '../hooks/use-tenant-role-detail-query';
import { useTenantPermissionsCatalogQuery } from '../hooks/use-tenant-permissions-catalog-query';
import {
  useCreateTenantRole,
  useReplaceTenantRolePermissions,
  useUpdateTenantRole,
} from '../hooks/use-tenant-roles-mutations';
import { usePermissionMatrixField } from '../hooks/use-permission-matrix-field';

/** Large screens: wide panel for the permission matrix (right drawer only). */
const ROLES_DRAWER_CONTENT_CLASSNAME =
  'lg:data-[vaul-drawer-direction=right]:w-[50vw] lg:data-[vaul-drawer-direction=right]:max-w-[50vw]';

const FORM_SCHEMA = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(64)
    .regex(
      /^[a-z0-9_]+$/,
      'Use lowercase letters, numbers, and underscores only'
    ),
  permission_ids: z.array(z.string().uuid()),
});

type RoleFormValues = z.infer<typeof FORM_SCHEMA>;

function PermissionsField({
  control,
  catalogRows,
  readOnly,
}: {
  control: Control<RoleFormValues>;
  catalogRows: PermissionCatalogRow[];
  readOnly: boolean;
}) {
  const { field } = useController({ control, name: 'permission_ids' });

  const { rows, columns, cellExists, gridState } = usePermissionMatrixField(
    catalogRows,
    field.value,
    field.onChange,
    readOnly
  );

  return (
    <FieldSet>
      <FieldLegend variant='label'>Permissions</FieldLegend>
      <p className='text-muted-foreground text-xs'>
        Rows are permission areas (e.g. clients); columns are actions (e.g. read,
        manage). Use the header checkboxes to toggle a whole column for rows
        that have that permission. Members may need to refresh the app after
        changes.
      </p>
      <ScrollArea className='mt-2 h-[min(32rem,60vh)] w-full max-w-full pr-2'>
        <CheckboxGrid
          rows={rows}
          columns={columns}
          gridState={gridState}
          cellExists={cellExists}
          rowHeaderLabel='Area'
          rowHeaderMinWidth='11rem'
          columnMinWidth='5.5rem'
          readOnly={readOnly}
          emptyMessage='No permissions available.'
        />
      </ScrollArea>
    </FieldSet>
  );
}

interface RolesDrawerFormProps {
  mode: OpenCloseMode;
  role: TenantRole | null;
  detail: TenantRoleDetail | null;
  open?: boolean;
  canManage: boolean;
  catalogRows: PermissionCatalogRow[];
  catalogLoading: boolean;
  catalogError: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function RolesDrawerForm({
  mode,
  role,
  detail,
  open,
  canManage,
  catalogRows,
  catalogLoading,
  catalogError,
  onSubmit,
  onCancel,
}: RolesDrawerFormProps) {
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? null;

  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';
  const readOnly = isRead || !canManage;
  const isEditingOwnActiveRole = Boolean(
    !isCreate &&
      detail &&
      claims?.is_system_admin !== true &&
      claims?.active_role &&
      detail.slug === claims.active_role
  );

  const createMutation = useCreateTenantRole();
  const updateMutation = useUpdateTenantRole();
  const replacePermissionsMutation = useReplaceTenantRolePermissions();

  const canEditMeta = Boolean(
    canManage && detail && !detail.is_system && !isCreate
  );

  const getDefaultValues = React.useCallback((): RoleFormValues => {
    if (isCreate || !detail) {
      return { name: '', slug: '', permission_ids: [] };
    }
    return {
      name: detail.name,
      slug: detail.slug,
      permission_ids: detail.tenant_role_permissions.map((r) => r.permission_id),
    };
  }, [isCreate, detail]);

  const form = useAppForm<RoleFormValues>({
    submitMode: isEdit ? 'edit' : 'create',
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    onCreate: async (values) => {
      if (!tenantId) {
        return;
      }
      try {
        const { id } = await createMutation.mutateAsync({
          tenant_id: tenantId,
          name: values.name,
          slug: values.slug,
        });
        await replacePermissionsMutation.mutateAsync({
          tenantRoleId: id,
          permissionIds: values.permission_ids,
        });
        onSubmit();
      } catch (error) {
        console.error('Error creating role:', error);
      }
    },
    onPatch: async (patch, full) => {
      if (!role?.id) {
        return;
      }
      try {
        if (patch.name !== undefined || patch.slug !== undefined) {
          await updateMutation.mutateAsync({
            id: role.id,
            name: full.name,
            slug: full.slug,
          });
        }
        if (patch.permission_ids !== undefined) {
          await replacePermissionsMutation.mutateAsync({
            tenantRoleId: role.id,
            permissionIds: full.permission_ids,
          });
        }
        toast.success('Role updated.');
        onSubmit();
      } catch (error) {
        console.error('Error updating role:', error);
      }
    },
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [role?.id, detail?.id, mode, getDefaultValues, form]);

  const title = isRead
    ? 'View role'
    : isEdit
      ? 'Edit role'
      : 'Create role';

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    replacePermissionsMutation.isPending;

  return (
    <DrawerWrapper
      open={open}
      onClose={onCancel}
      className={ROLES_DRAWER_CONTENT_CLASSNAME}
    >
      <FormDrawerHeader
        title={title}
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='tenant-roles-form'
        control={form.control}
        readOnly={readOnly}
        isLoading={isSaving}
        onCancel={onCancel}
      />

      <DrawerContentContainer>
        <form id='tenant-roles-form' onSubmit={form.submit}>
          <FieldGroupDense>
            {catalogError ? (
              <p className='text-destructive text-sm'>
                Could not load permission catalog.
              </p>
            ) : null}

            {isCreate ? (
              <FieldSet>
                <FormInputField
                  control={form.control}
                  name='name'
                  label='Name'
                  placeholder='Display name'
                  required
                  readOnly={readOnly}
                />
                <FormInputField
                  control={form.control}
                  name='slug'
                  label='Slug'
                  placeholder='e.g. billing_admin'
                  required
                  readOnly={readOnly}
                  description='Lowercase, numbers, and underscores. Cannot match a built-in template key.'
                />
              </FieldSet>
            ) : detail ? (
              canEditMeta ? (
                <FieldSet>
                  <FormInputField
                    control={form.control}
                    name='name'
                    label='Name'
                    placeholder='Display name'
                    required
                    readOnly={readOnly}
                  />
                  <FormInputField
                    control={form.control}
                    name='slug'
                    label='Slug'
                    placeholder='e.g. billing_admin'
                    required
                    readOnly={readOnly}
                    description='Lowercase, numbers, and underscores. Cannot match a built-in template key.'
                  />
                </FieldSet>
              ) : (
                <FieldSet>
                  <p className='text-sm font-medium'>{detail.name}</p>
                  <p className='text-muted-foreground font-mono text-xs'>
                    {detail.slug}
                  </p>
                  {detail.is_system ? (
                    <p className='text-muted-foreground text-xs'>
                      Built-in roles cannot be renamed or change slug here. You
                      can still adjust permissions if you have access.
                    </p>
                  ) : null}
                </FieldSet>
              )
            ) : null}

            {catalogLoading ? (
              <div className='flex justify-center py-8'>
                <Spinner className='size-6' />
              </div>
            ) : (
              <>
                {isEditingOwnActiveRole ? (
                  <p className='text-muted-foreground text-xs'>
                    You cannot edit permissions for your own active role.
                  </p>
                ) : null}
                <PermissionsField
                  control={form.control}
                  catalogRows={catalogRows}
                  readOnly={readOnly || isEditingOwnActiveRole}
                />
              </>
            )}
          </FieldGroupDense>
        </form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

interface RolesDrawerProps {
  mode: OpenCloseMode;
  role: TenantRole | null;
  open: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  canManage: boolean;
}

export function RolesDrawer({
  mode,
  role,
  open,
  onSubmit,
  onCancel,
  canManage,
}: RolesDrawerProps) {
  const isCreate = mode === 'create';
  const catalogQuery = useTenantPermissionsCatalogQuery(open);
  const detailQuery = useTenantRoleDetailQuery(
    role?.id,
    open && !isCreate && Boolean(role?.id)
  );

  if (!open) {
    return null;
  }

  if (!isCreate && detailQuery.isLoading) {
    return (
      <DrawerWrapper
        open={open}
        onClose={onCancel}
        className={ROLES_DRAWER_CONTENT_CLASSNAME}
      >
        <DrawerContentContainer>
          <div className='flex justify-center py-16'>
            <Spinner className='size-8' />
          </div>
        </DrawerContentContainer>
      </DrawerWrapper>
    );
  }

  if (!isCreate && detailQuery.isError) {
    return (
      <DrawerWrapper
        open={open}
        onClose={onCancel}
        className={ROLES_DRAWER_CONTENT_CLASSNAME}
      >
        <DrawerContentContainer>
          <TableErrorState
            title='Failed to load role'
            message={detailQuery.error?.message ?? 'An error occurred'}
            onRetry={() => {
              void detailQuery.refetch();
            }}
          />
        </DrawerContentContainer>
      </DrawerWrapper>
    );
  }

  if (!isCreate && !detailQuery.data) {
    return (
      <DrawerWrapper
        open={open}
        onClose={onCancel}
        className={ROLES_DRAWER_CONTENT_CLASSNAME}
      >
        <DrawerContentContainer>
          <p className='text-muted-foreground text-sm'>Role not found.</p>
        </DrawerContentContainer>
      </DrawerWrapper>
    );
  }

  return (
    <RolesDrawerForm
      mode={mode}
      role={role}
      detail={isCreate ? null : detailQuery.data!}
      open={open}
      canManage={canManage}
      catalogRows={catalogQuery.data ?? []}
      catalogLoading={catalogQuery.isLoading}
      catalogError={catalogQuery.isError}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
