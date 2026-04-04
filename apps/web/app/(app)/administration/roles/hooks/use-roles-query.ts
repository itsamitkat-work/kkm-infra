'use client';

import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { Role } from '@/types/roles';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import { useLocalQuery } from '@/hooks/use-local-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const ROLES_TABLE_ID = 'roles';

export type CreateRoleData = {
  code: string;
  name: string;
  isSystemRole: boolean;
};

export type UpdateRoleData = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export const fetchRoles = async (
  page?: number,
  signal?: AbortSignal
): Promise<PaginationResponse<Role>> => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append('page', page.toString());
  params.append('pageSize', '20');

  const queryString = params.toString();
  const url = queryString ? `/v2/roles?${queryString}` : '/v2/roles';

  const response = await apiFetch<PaginationResponse<Role>>(url, { signal });

  return response;
};

type UseRolesQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

const filterRoles = (
  roles: Role[],
  search: string,
  filters: Record<string, Filter>
): Role[] => {
  let filtered = [...roles];

  const trimmedSearch = search?.trim().toLowerCase();
  if (trimmedSearch) {
    filtered = filtered.filter(
      (role) =>
        role.name?.toLowerCase().includes(trimmedSearch) ||
        role.code?.toLowerCase().includes(trimmedSearch)
    );
  }

  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, filter]) => {
      if (!filter.values || filter.values.length === 0) return;

      switch (key) {
        case 'isActive':
          const activeValues = filter.values.map((v) =>
            String(v).toLowerCase()
          );
          filtered = filtered.filter((role) =>
            activeValues.includes(String(role.isActive).toLowerCase())
          );
          break;
        case 'isSystemRole':
          const systemRoleValues = filter.values.map((v) =>
            String(v).toLowerCase()
          );
          filtered = filtered.filter((role) =>
            systemRoleValues.includes(String(role.isSystemRole).toLowerCase())
          );
          break;
        default:
          break;
      }
    });
  }

  return filtered;
};

export const useRolesQuery = ({
  search,
  filters,
  sorting,
}: UseRolesQueryParams) => {
  const queryClient = useQueryClient();
  const query = useLocalQuery<Role>({
    queryKey: [ROLES_TABLE_ID, 'all'],
    fetchFn: fetchRoles,
    search,
    filters,
    sorting,
    filterFn: filterRoles,
  });

  return {
    ...query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [ROLES_TABLE_ID] }),
  };
};

// Create role API function
export async function createRole(
  data: CreateRoleData
): Promise<Role> {
  const response = await apiFetch<Role>('v2/roles', {
    method: 'POST',
    data: {
      code: data.code,
      name: data.name,
      isSystemRole: data.isSystemRole,
    },
  });

  return response;
}

// Create role mutation hook
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_TABLE_ID] });
    },
  });
}

// Delete role API function
export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`v2/roles/${id}`, {
    method: 'DELETE',
  });
}

// Delete role mutation hook
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_TABLE_ID] });
    },
  });
}

// Update role API function
export async function updateRole(data: UpdateRoleData): Promise<Role> {
  const response = await apiFetch<Role>(`v2/roles`, {
    method: 'PUT',
    data: {
      id: data.id,
      code: data.code,
      name: data.name,
      isActive: data.isActive,
    },
  });

  return response;
}

// Update role mutation hook
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_TABLE_ID] });
    },
  });
}
