'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { TableLoadingState } from '@/components/tables/table-loading';
import { TableErrorState } from '@/components/tables/table-error';
import {
  CheckboxGrid,
  CheckboxGridRow,
  CheckboxGridColumn,
} from '@/components/tables/checkbox-grid';
import { useCheckboxGrid } from '@/hooks/use-checkbox-grid';
import {
  fetchRolePermissions,
  saveRolePermissions,
  RolePermissionItem,
} from '../data/role-permissions-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RolePermissionsGridProps {
  roleId: string;
}

export function RolePermissionsGrid({ roleId }: RolePermissionsGridProps) {
  const queryClient = useQueryClient();

  // Fetch role permissions
  const permissionsQuery = useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: () => fetchRolePermissions(roleId),
  });

  const permissions = React.useMemo(
    () => permissionsQuery.data ?? [],
    [permissionsQuery.data]
  );

  // Build rows (pages) from permissions data
  const rows: CheckboxGridRow[] = React.useMemo(() => {
    const pageMap = new Map<string, string>();
    permissions.forEach((p) => {
      if (!pageMap.has(p.pageId)) {
        pageMap.set(p.pageId, p.pageName);
      }
    });
    return Array.from(pageMap.entries()).map(([id, label]) => ({ id, label }));
  }, [permissions]);

  // Build columns (actions) from permissions data
  const columns: CheckboxGridColumn[] = React.useMemo(() => {
    const actionSet = new Set<string>();
    permissions.forEach((p) => actionSet.add(p.action));
    return Array.from(actionSet)
      .sort()
      .map((action) => ({ id: action, label: action }));
  }, [permissions]);

  // Build a lookup for which cells exist (not all page+action combinations exist)
  const cellExistsMap = React.useMemo(() => {
    const map = new Set<string>();
    permissions.forEach((p) => {
      map.add(`${p.pageId}::${p.action}`);
    });
    return map;
  }, [permissions]);

  const cellExists = React.useCallback(
    (rowId: string, columnId: string) => {
      return cellExistsMap.has(`${rowId}::${columnId}`);
    },
    [cellExistsMap]
  );

  // Use the checkbox grid hook with getIsChecked for toggle pattern
  const gridState = useCheckboxGrid({
    serverData: permissions,
    getRowId: (item: RolePermissionItem) => item.pageId,
    getColumnId: (item: RolePermissionItem) => item.action,
    getId: (item: RolePermissionItem) => item.permissionId,
    getIsChecked: (item: RolePermissionItem) => item.isChecked,
  });

  // Saving state
  const [isSaving, setIsSaving] = React.useState(false);

  // Save changes to server
  async function handleSave() {
    if (!gridState.hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      // Get all checked permission IDs
      const checkedPermissionIds = gridState.getCheckedIds();

      await saveRolePermissions(roleId, checkedPermissionIds);

      toast.success('Permissions saved successfully');

      // Refetch to get fresh data from server
      await queryClient.invalidateQueries({
        queryKey: ['role-permissions', roleId],
      });
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast.error('Failed to save permissions', {
        description: 'An unexpected error occurred',
      });
      await queryClient.invalidateQueries({
        queryKey: ['role-permissions', roleId],
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (permissionsQuery.isLoading) {
    return <TableLoadingState />;
  }

  if (permissionsQuery.isError) {
    return (
      <TableErrorState
        title='Failed to load role permissions'
        message='An error occurred while loading permissions'
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button
          variant='primary'
          size='sm'
          onClick={handleSave}
          disabled={!gridState.hasChanges || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              Saving...
            </>
          ) : (
            <>Save Changes</>
          )}
        </Button>
      </div>

      <CheckboxGrid
        rows={rows}
        columns={columns}
        gridState={gridState}
        cellExists={cellExists}
        rowHeaderLabel='Page'
        emptyMessage='No pages found'
      />
    </div>
  );
}
