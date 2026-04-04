export interface RolePermission {
  permissionId: string;
  action: string;
  code: string;
  isChecked: boolean;
}

export interface RolePermissionPage {
  pageId: string;
  pageName: string;
  permissions: RolePermission[];
}
