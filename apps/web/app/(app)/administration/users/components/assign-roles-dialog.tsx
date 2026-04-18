'use client';

import * as React from 'react';
import { User } from '@/types/users';
import { Role } from '@/types/roles';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UseMutationResult } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { IconLoader2, IconPlus, IconMinus } from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AssignRoleVariables } from '../hooks/use-assign-role-mutation';
import type { RemoveRoleVariables } from '../hooks/use-remove-role-mutation';
import { useUserRolesQuery } from '../hooks/use-user-roles-query';

interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  allRoles: Role[];
  assignRoleMutation: UseMutationResult<void, Error, AssignRoleVariables>;
  removeRoleMutation: UseMutationResult<void, Error, RemoveRoleVariables>;
  isLoadingRoles?: boolean;
}

export function AssignRolesDialog({
  open,
  onOpenChange,
  user,
  allRoles,
  assignRoleMutation,
  removeRoleMutation,
  isLoadingRoles = false,
}: AssignRolesDialogProps) {
  const tenantMemberId = user.tenantMemberId;

  const { data: userRoles = [], isLoading: isLoadingUserRoles } =
    useUserRolesQuery(tenantMemberId, open);

  // Get user's current role IDs from the API response
  const userRoleIds = React.useMemo(() => {
    return new Set(userRoles.map((ur) => ur.roleId));
  }, [userRoles]);

  // Track row selection state (for adding roles)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Track roles to remove (assigned roles that are unchecked)
  const [rolesToRemove, setRolesToRemove] = React.useState<Set<string>>(
    new Set()
  );

  // Reset selections when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setRowSelection({});
      setRolesToRemove(new Set());
    }
  }, [open]);

  // Filter roles - separate assigned and unassigned
  const { assignedRoles, unassignedRoles } = React.useMemo(() => {
    const assigned: Role[] = [];
    const unassigned: Role[] = [];

    allRoles.forEach((role) => {
      if (userRoleIds.has(role.id)) {
        assigned.push(role);
      } else {
        unassigned.push(role);
      }
    });

    return { assignedRoles: assigned, unassignedRoles: unassigned };
  }, [allRoles, userRoleIds]);

  // Combine roles for table (assigned first, then unassigned)
  const tableRoles = React.useMemo(() => {
    return [...assignedRoles, ...unassignedRoles];
  }, [assignedRoles, unassignedRoles]);

  // Calculate loading state
  const isLoading =
    isLoadingRoles ||
    isLoadingUserRoles ||
    assignRoleMutation.isPending ||
    removeRoleMutation.isPending;

  // Define columns
  const columns = React.useMemo<ColumnDef<Role>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
            }
            onCheckedChange={(value) => {
              // Only select unassigned roles
              const unassignedRowIds = unassignedRoles.map((_, index) =>
                String(assignedRoles.length + index)
              );
              const currentSelection = table.getState().rowSelection;

              if (value) {
                // Select all unassigned roles
                const newSelection: RowSelectionState = { ...currentSelection };
                unassignedRowIds.forEach((id) => {
                  newSelection[id] = true;
                });
                table.setRowSelection(newSelection);
              } else {
                // Deselect all unassigned roles
                const newSelection: RowSelectionState = { ...currentSelection };
                unassignedRowIds.forEach((id) => {
                  delete newSelection[id];
                });
                table.setRowSelection(newSelection);
              }
            }}
            aria-label='Select all unassigned roles'
            disabled={unassignedRoles.length === 0 || isLoading}
          />
        ),
        cell: ({ row }) => {
          const role = row.original;
          const isAssigned = userRoleIds.has(role.id);
          const isSelected = row.getIsSelected();
          const isMarkedForRemoval = rolesToRemove.has(role.id);

          // Checkbox is checked if: assigned and not marked for removal, OR selected for addition
          const isChecked = (isAssigned && !isMarkedForRemoval) || isSelected;

          // Determine checkbox color based on state
          let checkboxClassName = '';
          if (isSelected && !isAssigned) {
            // Green for roles being added
            checkboxClassName =
              'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500';
          } else if (isMarkedForRemoval) {
            // Red for roles being removed (show red border even when unchecked)
            checkboxClassName =
              'border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive dark:data-[state=checked]:bg-destructive';
          }
          // Default primary color for assigned roles not being removed

          return (
            <Checkbox
              checked={isChecked}
              disabled={isLoading}
              className={checkboxClassName}
              onCheckedChange={(value) => {
                if (isAssigned) {
                  // Toggle removal state
                  setRolesToRemove((prev) => {
                    const next = new Set(prev);
                    if (value) {
                      next.delete(role.id);
                    } else {
                      next.add(role.id);
                    }
                    return next;
                  });
                } else {
                  // Toggle selection for addition
                  row.toggleSelected(!!value);
                }
              }}
              aria-label={`${isAssigned ? 'Remove' : 'Select'} ${role.name}`}
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: 'name',
        header: 'Role Name',
        cell: ({ row }) => {
          const role = row.original;
          const isAssigned = userRoleIds.has(role.id);

          return (
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>{role.name}</span>
              {isAssigned && (
                <Badge variant='secondary' className='text-xs'>
                  Assigned
                </Badge>
              )}
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground'>
            {row.original.code || '-'}
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: 'isSystemRole',
        header: 'Type',
        cell: ({ row }) =>
          row.original.isSystemRole ? (
            <Badge variant='outline' className='text-xs'>
              System
            </Badge>
          ) : null,
        size: 100,
      },
    ],
    [
      userRoleIds,
      assignedRoles.length,
      unassignedRoles.length,
      rolesToRemove,
      isLoading,
    ]
  );

  const table = useReactTable({
    data: tableRoles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: (row) => {
      // Only allow selection of unassigned roles (for adding)
      // Assigned roles are managed via rolesToRemove state
      return !userRoleIds.has(row.original.id);
    },
    getRowId: (row) => row.id,
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
  });

  const handleSave = React.useCallback(async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rolesToAdd = selectedRows.map((row) => row.original.id);
    const rolesToRemoveArray = Array.from(rolesToRemove);

    if (rolesToAdd.length === 0 && rolesToRemoveArray.length === 0) {
      return;
    }

    if (!tenantMemberId) {
      toast.error('Missing tenant membership for this user.');
      return;
    }

    let addSuccessCount = 0;
    let addErrorCount = 0;
    let removeSuccessCount = 0;
    let removeErrorCount = 0;

    try {
      // Remove roles first
      for (const roleId of rolesToRemoveArray) {
        try {
          await removeRoleMutation.mutateAsync({
            roleId,
            tenantMemberId,
          });
          removeSuccessCount++;
        } catch (error) {
          removeErrorCount++;
          console.error(`Failed to remove role ${roleId}:`, error);
        }
      }

      // Then assign new roles
      for (const roleId of rolesToAdd) {
        try {
          await assignRoleMutation.mutateAsync({
            roleId,
            tenantMemberId,
          });
          addSuccessCount++;
        } catch (error) {
          addErrorCount++;
          console.error(`Failed to assign role ${roleId}:`, error);
        }
      }

      // Show summary toast
      const totalSuccess = addSuccessCount + removeSuccessCount;
      const totalError = addErrorCount + removeErrorCount;

      if (totalSuccess > 0 && totalError === 0) {
        const messages: string[] = [];
        if (addSuccessCount > 0) {
          messages.push(
            `assigned ${addSuccessCount} role${addSuccessCount !== 1 ? 's' : ''}`
          );
        }
        if (removeSuccessCount > 0) {
          messages.push(
            `removed ${removeSuccessCount} role${removeSuccessCount !== 1 ? 's' : ''}`
          );
        }
        toast.success(`Successfully ${messages.join(' and ')}`);
        setRowSelection({});
        setRolesToRemove(new Set());
        onOpenChange(false);
      } else if (totalError > 0) {
        // Some failed - show error summary
        toast.error(
          `Failed to update ${totalError} of ${rolesToAdd.length + rolesToRemoveArray.length} role${rolesToAdd.length + rolesToRemoveArray.length !== 1 ? 's' : ''}. Please try again.`
        );
        // Keep dialog open so user can retry
      }
    } catch (error) {
      console.error('Failed to update roles:', error);
      // Don't close dialog on error so user can retry
    }
  }, [
    table,
    assignRoleMutation,
    removeRoleMutation,
    tenantMemberId,
    onOpenChange,
    rolesToRemove,
  ]);

  const selectedCount = table.getSelectedRowModel().rows.length;
  const removeCount = rolesToRemove.size;
  const hasChanges = selectedCount > 0 || removeCount > 0;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      // Prevent closing dialog while mutations are in progress
      if (!newOpen && isLoading) {
        return;
      }
      onOpenChange(newOpen);
    },
    [isLoading, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className='sm:max-w-[600px] max-h-[90vh] flex flex-col'
        showCloseButton={!isLoading}
      >
        <DialogHeader className='flex-shrink-0 space-y-2'>
          <DialogTitle className='flex items-center gap-2 text-lg font-semibold'>
            <span className='text-foreground'>Manage Roles</span>
          </DialogTitle>
          <DialogDescription className='text-sm'>
            {user.fullName || user.userName}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 min-h-0 overflow-auto border rounded-md bg-background'>
          <Table>
            <TableHeader className='sticky top-0 bg-background z-10 border-b'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoadingRoles || isLoadingUserRoles ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    <div className='flex items-center justify-center gap-2'>
                      <IconLoader2 className='h-4 w-4 animate-spin' />
                      <span className='text-sm text-muted-foreground'>
                        Loading roles...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={
                      userRoleIds.has(row.original.id)
                        ? 'bg-muted/30 hover:bg-muted/40'
                        : 'hover:bg-accent/50'
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className='flex-shrink-0 mt-4 border-t pt-4'>
          <div className='flex items-center justify-between w-full'>
            {hasChanges ? (
              <div className='flex items-center gap-2'>
                {selectedCount > 0 && (
                  <Badge
                    variant='default'
                    className='gap-1.5 bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                  >
                    <IconPlus className='h-3 w-3' />
                    <span>{selectedCount} added</span>
                  </Badge>
                )}
                {removeCount > 0 && (
                  <Badge variant='destructive' className='gap-1.5'>
                    <IconMinus className='h-3 w-3' />
                    <span>{removeCount} removed</span>
                  </Badge>
                )}
              </div>
            ) : (
              <div className='text-sm text-muted-foreground'>
                No changes to save
              </div>
            )}
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={handleSave}
                disabled={!hasChanges || isLoading}
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  <>Save Changes</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
