import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { RolePermissionPage } from '@/types/role-permissions';

// Flattened structure for the grid
export interface RolePermissionItem {
  id: string; // Combination of pageId-permissionId
  roleId: string;
  pageId: string;
  pageName: string;
  permissionId: string;
  action: string;
  code: string;
  isChecked: boolean;
}

// Fetch role permissions and flatten for grid display
export async function fetchRolePermissions(
  roleId: string
): Promise<RolePermissionItem[]> {
  const response = await apiFetch<PaginationResponse<RolePermissionPage>>(
    `v2/permissionsbyrole/${roleId}`
  );

  if (!response.isSuccess || !response.data) {
    return [];
  }

  // Flatten the nested structure into a flat array
  const flattened: RolePermissionItem[] = [];
  response.data.forEach((page) => {
    page.permissions.forEach((permission) => {
      flattened.push({
        id: `${page.pageId}-${permission.permissionId}`,
        roleId,
        pageId: page.pageId,
        pageName: page.pageName,
        permissionId: permission.permissionId,
        action: permission.action,
        code: permission.code,
        isChecked: Boolean(permission.isChecked),
      });
    });
  });

  return flattened;
}

// Save role permissions - sends all checked permission IDs
export async function saveRolePermissions(
  roleId: string,
  checkedPermissionIds: string[]
): Promise<void> {
  await apiFetch(`v2/assignpermissions/${roleId}`, {
    method: 'POST',
    data: checkedPermissionIds,
  });
}
