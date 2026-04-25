'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import {
  createTenantRole,
  deleteTenantRole,
  replaceTenantRolePermissions,
  updateTenantRole,
  type CreateTenantRoleInput,
  type UpdateTenantRoleInput,
} from '../api/tenant-roles-api';

import { invalidateTenantRolesQueryCache } from './use-tenant-roles-query';

function useCreateTenantRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTenantRoleInput) =>
      createTenantRole(createSupabaseBrowserClient(), input),
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      toast.error('Failed to create role.', { duration: Infinity });
    },
    onSuccess: () => {
      toast.success('Role created.');
    },
    onSettled: () => {
      invalidateTenantRolesQueryCache(queryClient);
    },
  });
}

function useUpdateTenantRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTenantRoleInput) =>
      updateTenantRole(createSupabaseBrowserClient(), input),
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      toast.error('Failed to update role.', { duration: Infinity });
    },
    onSettled: () => {
      invalidateTenantRolesQueryCache(queryClient);
    },
  });
}

function useDeleteTenantRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) =>
      deleteTenantRole(createSupabaseBrowserClient(), roleId),
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      toast.error('Failed to delete role.', { duration: Infinity });
    },
    onSuccess: () => {
      toast.success('Role deleted.');
    },
    onSettled: () => {
      invalidateTenantRolesQueryCache(queryClient);
    },
  });
}

function useReplaceTenantRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { tenantRoleId: string; permissionIds: string[] }) =>
      replaceTenantRolePermissions(
        createSupabaseBrowserClient(),
        input.tenantRoleId,
        input.permissionIds
      ),
    onMutate: () => {
      toast.dismiss();
    },
    onError: () => {
      toast.error('Failed to update permissions.', { duration: Infinity });
    },
    onSettled: () => {
      invalidateTenantRolesQueryCache(queryClient);
    },
  });
}

export {
  useCreateTenantRole,
  useDeleteTenantRole,
  useReplaceTenantRolePermissions,
  useUpdateTenantRole,
};
