'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { SubDesignation } from '../hooks/use-sub-designations-query';
import { TableErrorState } from '@/components/tables/table-error';
import { getSubDesignationsColumns } from './sub-designations-columns';
import { useSubDesignationsQuery } from '../hooks/use-sub-designations-query';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { useDeleteSubDesignation } from '@/hooks/use-sub-designations-mutations';
import { SubDesignationsDrawer } from './sub-designations-drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Designation } from '../hooks/use-designations-query';

interface SubDesignationsTableProps {
  designation: Designation;
}

export function SubDesignationsTable({ designation }: SubDesignationsTableProps) {
  const drawer = useOpenClose<SubDesignation | null>();
  const deleteConfirmation = useDeleteConfirmation();

  const { data: subDesignations, isLoading, error, refetch } =
    useSubDesignationsQuery(designation.hashId);

  const handleCreateSubDesignation = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (subDesignation: SubDesignation, mode: 'edit' | 'read') => {
      drawer.open(subDesignation, mode);
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(hashId: string) => void>(() => {});

  const deleteSubDesignationMutation = useDeleteSubDesignation();

  const onClickDelete = React.useCallback(
    (hashId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteSubDesignationMutation.mutateAsync({
            hashId,
            designationHashID: designation.hashId,
          });
          refetch();
        },
        itemName: 'sub-designation',
      });
    },
    [deleteConfirmation, deleteSubDesignationMutation, refetch, designation.hashId]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  const columns = React.useMemo(
    () =>
      getSubDesignationsColumns(
        onClickEditOrRead,
        (hashId) => onClickDeleteRef.current(hashId)
      ),
    [onClickEditOrRead]
  );

  if (isLoading) {
    return (
      <div className='p-4 flex items-center justify-center gap-2'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
        <span className='text-sm text-muted-foreground'>
          Loading sub-designations...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <TableErrorState
        title='Failed to load sub-designations'
        message={error.message || 'An error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      <div className='p-4 border-t bg-muted/30'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='text-sm font-semibold text-foreground'>
            Sub-Designations ({subDesignations?.length || 0})
          </h4>
          <Button size='sm' onClick={handleCreateSubDesignation}>
            <IconPlus />
            <span className='hidden lg:inline'>Create Sub-Designation</span>
          </Button>
        </div>
        {!subDesignations || subDesignations.length === 0 ? (
          <div className='text-sm text-muted-foreground p-4 text-center'>
            No sub-designations found for this designation.
          </div>
        ) : (
          <div className='rounded-md border overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  {columns.map((column, index) => {
                    const columnId = column.id || ('accessorKey' in column ? String(column.accessorKey) : `col-${index}`);
                    return (
                      <TableHead
                        key={columnId}
                        style={{ width: column.size }}
                      >
                        {column.header ? (
                          typeof column.header === 'function' ? (
                            column.header({
                              column: {
                                id: columnId,
                                getCanSort: () => false,
                                getIsSorted: () => false,
                                toggleSorting: () => {},
                                clearSorting: () => {},
                              } as never,
                            } as never)
                          ) : (
                            column.header
                          )
                        ) : null}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {subDesignations.map((subDesignation) => (
                  <TableRow key={subDesignation.id}>
                    {columns.map((column, colIndex) => {
                      const columnId = column.id || ('accessorKey' in column ? String(column.accessorKey) : `col-${colIndex}`);
                      return (
                        <TableCell key={columnId}>
                          {column.cell
                            ? typeof column.cell === 'function'
                              ? column.cell({
                                  row: {
                                    original: subDesignation,
                                    getValue: (key: string) =>
                                      (subDesignation as Record<string, unknown>)[key],
                                  },
                                  column: {
                                    id: columnId,
                                  },
                                } as never)
                              : column.cell
                            : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {drawer.isOpen && drawer.mode && (
        <SubDesignationsDrawer
          mode={drawer.mode}
          subDesignation={drawer.data}
          designationHashID={designation.hashId}
          designationName={designation.name}
          employeeTypeHashID={designation.employeeTypeHashID}
          employeeTypeName={designation.employeeTypeName}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            refetch();
          }}
          onCancel={drawer.close}
        />
      )}

      {deleteConfirmation.isOpen && deleteConfirmation.data && (
        <DeleteConfirmationDialog
          open={deleteConfirmation.isOpen}
          onOpenChange={(open) =>
            open
              ? deleteConfirmation.openDeleteConfirmation(
                  deleteConfirmation.data!
                )
              : deleteConfirmation.closeDeleteConfirmation()
          }
          onConfirm={deleteConfirmation.data.onConfirm}
          isLoading={
            deleteConfirmation.data.isLoading ||
            deleteSubDesignationMutation.isPending
          }
          itemName='sub-designation'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
