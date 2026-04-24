'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';

import {
  FormDrawerHeader,
  FormInputField,
  FormSelectField,
} from '@/components/form';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLegend, FieldSet } from '@/components/ui/field';
import { FieldGroupDense } from '@/components/field-group-dense';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/auth';
import { resolveProfileAvatarSrc } from '@/lib/profile-avatar';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadProfileAvatarToStorage } from '@/lib/supabase/profile-avatar-storage';
import type { FileWithPreview } from '@/hooks/use-file-upload';
import type { User } from '@/types/users';

import { useAssignRole } from '../hooks/use-assign-role-mutation';
import { useRemoveRole } from '../hooks/use-remove-role-mutation';
import type { TenantRolesAdminRow } from '../hooks/use-tenant-roles-admin-query';
import { useTenantRolesAdminQuery } from '../hooks/use-tenant-roles-admin-query';
import { useUpdateTenantMemberDirectoryMutation } from '../hooks/use-update-tenant-member-directory-mutation';
import { useUserRolesQuery } from '../hooks/use-user-roles-query';

import { UserDrawerAvatar } from './user-drawer-avatar';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
] as const;

function buildUserDrawerSchema(canEditProfiles: boolean) {
  return z
    .object({
      displayName: z
        .string()
        .trim()
        .min(1, 'Display name is required')
        .max(200),
      username: z.string().trim().max(64),
      status: z.enum(['active', 'suspended']),
    })
    .superRefine((val, ctx) => {
      if (!canEditProfiles) {
        return;
      }
      const u = val.username.trim();
      if (u.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Username is required',
          path: ['username'],
        });
        return;
      }
      if (!/^[a-z0-9][a-z0-9_-]*$/i.test(u)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Username may contain letters, numbers, underscores, and hyphens',
          path: ['username'],
        });
      }
    });
}

type UserDrawerFormValues = z.infer<ReturnType<typeof buildUserDrawerSchema>>;

function getDefaultFormValues(user: User): UserDrawerFormValues {
  return {
    displayName: user.fullName?.trim() || '',
    username: user.userName?.trim() || '',
    status: user.isActive ? 'active' : 'suspended',
  };
}

interface UserDrawerRoleRowProps {
  role: TenantRolesAdminRow;
  checked: boolean;
  readOnly: boolean;
  saving: boolean;
  onToggle: (roleId: string, checked: boolean) => void;
}

function UserDrawerRoleRow({
  role,
  checked,
  readOnly,
  saving,
  onToggle,
}: UserDrawerRoleRowProps) {
  const disabled = readOnly || saving;

  function handleCheckboxChange(next: boolean | 'indeterminate') {
    if (next === 'indeterminate') {
      return;
    }
    onToggle(role.id, next);
  }

  return (
    <Field orientation='horizontal' className='items-center gap-3'>
      <Checkbox
        id={`role-${role.id}`}
        checked={checked}
        disabled={disabled}
        onCheckedChange={handleCheckboxChange}
      />
      <label
        htmlFor={`role-${role.id}`}
        className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
      >
        {role.name}
        {role.is_system ? (
          <span className='text-muted-foreground ml-2 text-xs font-normal'>
            (system)
          </span>
        ) : null}
      </label>
    </Field>
  );
}

function areRoleSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const id of a) {
    if (!b.has(id)) {
      return false;
    }
  }
  return true;
}

interface UserDrawerProps {
  open: boolean;
  user: User | null;
  tenantId: string | null;
  onClose: () => void;
}

export function UserDrawer({ open, user, tenantId, onClose }: UserDrawerProps) {
  const { ability, claims, user: authAppUser } = useAuth();
  const canManageMembers = ability.can('manage', 'tenant_members');
  const sessionUserId = authAppUser?.hashId ?? null;
  const isSelf =
    Boolean(user?.id && sessionUserId) && user?.id === sessionUserId;
  const canEditProfiles = Boolean(claims?.is_system_admin) || isSelf;

  const updateMutation = useUpdateTenantMemberDirectoryMutation();
  const assignRoleMutation = useAssignRole({
    suppressSuccessToast: true,
    suppressErrorToast: true,
  });
  const removeRoleMutation = useRemoveRole({
    suppressSuccessToast: true,
    suppressErrorToast: true,
  });

  const rolesCatalogQuery = useTenantRolesAdminQuery(tenantId);
  const tenantMemberId = user?.tenantMemberId;
  const userRolesQuery = useUserRolesQuery(tenantMemberId, open);

  const schema = React.useMemo(
    () => buildUserDrawerSchema(canEditProfiles),
    [canEditProfiles]
  );

  const form = useForm<UserDrawerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      username: '',
      status: 'active',
    },
    mode: 'onChange',
  });

  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(
    null
  );

  const serverRoleIdsKey = React.useMemo(() => {
    const rows = userRolesQuery.data ?? [];
    return rows
      .map((r) => r.roleId)
      .sort()
      .join(',');
  }, [userRolesQuery.data]);

  const baselineRoleIdsRef = React.useRef<Set<string>>(new Set());
  const [draftRoleIds, setDraftRoleIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  React.useEffect(() => {
    if (user) {
      form.reset(getDefaultFormValues(user));
    }
    setPendingAvatarFile(null);
  }, [user?.id, form]);

  React.useEffect(() => {
    if (!open || !userRolesQuery.isSuccess) {
      return;
    }
    const next = new Set(
      (userRolesQuery.data ?? []).map((row) => row.roleId),
    );
    baselineRoleIdsRef.current = next;
    setDraftRoleIds(new Set(next));
  }, [open, user?.id, serverRoleIdsKey, userRolesQuery.isSuccess]);

  const readOnly = !canManageMembers;

  const catalogRoles = rolesCatalogQuery.data ?? [];

  function handleAvatarFileChange(file: FileWithPreview | null) {
    if (!file || !(file.file instanceof File)) {
      setPendingAvatarFile(null);
      return;
    }
    setPendingAvatarFile(file.file);
    const current = form.getValues('displayName');
    form.setValue('displayName', current, { shouldDirty: true });
  }

  const rolesDirty = !areRoleSetsEqual(
    draftRoleIds,
    baselineRoleIdsRef.current,
  );

  function handleRoleToggle(roleId: string, checked: boolean) {
    if (readOnly) {
      return;
    }
    setDraftRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
  }

  const [isSavingDrawer, setIsSavingDrawer] = React.useState(false);

  async function handleSubmitForm(values: UserDrawerFormValues) {
    if (!user || !tenantMemberId) {
      return;
    }
    let avatarUrl: string | null =
      user.avatarUrl?.trim() && user.avatarUrl.trim().length > 0
        ? user.avatarUrl.trim()
        : null;

    if (pendingAvatarFile) {
      try {
        const supabase = createSupabaseBrowserClient();
        avatarUrl = await uploadProfileAvatarToStorage(
          supabase,
          user.id,
          pendingAvatarFile,
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : 'Could not upload the image file.',
        );
        return;
      }
    }

    const profilesSync = canEditProfiles
      ? {
          displayName: values.displayName.trim(),
          username: values.username.trim(),
          avatarUrl,
        }
      : undefined;

    setIsSavingDrawer(true);
    try {
      await updateMutation.mutateAsync({
        tenantMemberId,
        userId: user.id,
        displayName: values.displayName.trim(),
        status: values.status,
        avatarUrl,
        profilesSync,
      });

      const baseline = baselineRoleIdsRef.current;
      const toAssign = [...draftRoleIds].filter((id) => !baseline.has(id));
      const toRemove = [...baseline].filter((id) => !draftRoleIds.has(id));

      try {
        for (const roleId of toAssign) {
          await assignRoleMutation.mutateAsync({
            roleId,
            tenantMemberId,
          });
        }
        for (const roleId of toRemove) {
          await removeRoleMutation.mutateAsync({
            roleId,
            tenantMemberId,
          });
        }
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Could not update role assignments.';
        toast.error(message);
        return;
      }

      baselineRoleIdsRef.current = new Set(draftRoleIds);
      setPendingAvatarFile(null);
      onClose();
    } catch {
      // Directory update: `useUpdateTenantMemberDirectoryMutation` surfaces errors via toast.
    } finally {
      setIsSavingDrawer(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <DrawerWrapper open={open} onClose={onClose}>
      <FormDrawerHeader<UserDrawerFormValues>
        title='User'
        submitButtonText='Save'
        formId='user-directory-form'
        control={form.control}
        readOnly={readOnly}
        isLoading={isSavingDrawer}
        allowSubmitWhenNotDirty={
          Boolean(pendingAvatarFile) || rolesDirty
        }
        onCancel={onClose}
      />

      <DrawerContentContainer>
        <form
          id='user-directory-form'
          onSubmit={form.handleSubmit(handleSubmitForm)}
        >
          <FieldGroupDense>
            <FieldSet>
              {!canEditProfiles && canManageMembers ? (
                <Alert>
                  <AlertTitle>Profile fields</AlertTitle>
                  <AlertDescription>
                    Display name, avatar, and status are saved for this
                    workspace. Username and global profile sync require you to
                    be this user or a system administrator (database policy).
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className='flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-8'>
                <UserDrawerAvatar
                  key={user.id}
                  disabled={readOnly}
                  defaultAvatar={resolveProfileAvatarSrc(user.avatarUrl)}
                  onFileChange={handleAvatarFileChange}
                />
                <div className='flex min-w-0 flex-1 flex-col gap-4'>
                  <FormInputField
                    control={form.control}
                    name='displayName'
                    label='Display name'
                    placeholder='Display name'
                    required
                    readOnly={readOnly}
                  />
                  <FormInputField
                    control={form.control}
                    name='username'
                    label='Username'
                    placeholder='username'
                    required={canEditProfiles}
                    readOnly={readOnly || !canEditProfiles}
                    description={
                      !canEditProfiles
                        ? 'Managed on the global profile when you are this user or a system admin.'
                        : undefined
                    }
                  />
                  <FormSelectField
                    control={form.control}
                    name='status'
                    label='Membership status'
                    placeholder='Status'
                    options={[...STATUS_OPTIONS]}
                    required
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend variant='label'>Roles</FieldLegend>
              <p className='text-muted-foreground text-xs'>
                Select roles here; assignments are saved when you click Save.
              </p>
              {rolesCatalogQuery.isLoading || userRolesQuery.isLoading ? (
                <Spinner className='size-6' />
              ) : rolesCatalogQuery.isError ? (
                <p className='text-destructive text-sm'>
                  Could not load role catalog.
                </p>
              ) : (
                <div className='flex max-h-64 flex-col gap-3 overflow-y-auto pr-1'>
                  {catalogRoles.map((role) => (
                    <UserDrawerRoleRow
                      key={role.id}
                      role={role}
                      checked={draftRoleIds.has(role.id)}
                      readOnly={readOnly}
                      saving={isSavingDrawer}
                      onToggle={handleRoleToggle}
                    />
                  ))}
                </div>
              )}
            </FieldSet>
          </FieldGroupDense>
        </form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}
