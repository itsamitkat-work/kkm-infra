'use client';

import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { RolePermissionPage } from '@/types/role-permissions';

export const fetchRolePermissions = async (
  roleId: string,
  signal?: AbortSignal
): Promise<PaginationResponse<RolePermissionPage>> => {
  const response = await apiFetch<PaginationResponse<RolePermissionPage>>(
    `v2/permissionsbyrole/${roleId}`,
    { signal }
  );

  return response;
};
