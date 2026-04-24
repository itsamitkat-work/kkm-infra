'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import type { ProjectsListRow } from '@/hooks/useProjects';
import { ProjectDrawer } from './project-drawer';
import { TableErrorState } from '@/components/tables/table-error';
import { useRouter } from 'next/navigation';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { useDeleteProject } from '@/hooks/projects/use-project-mutations';
import { getColumns } from './projects-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { defaultProjectTableFilters, filterFields } from './project-filters';
import {
  PROJECTS_TABLE_ID,
  useProjectsQuery,
} from '../hooks/use-projects-query';
import { useAuth } from '@/hooks/auth';

export function ProjectsTable() {
  const router = useRouter();
  const drawer = useOpenClose<ProjectsListRow | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteProjectMutation = useDeleteProject();
  const { ability } = useAuth();

  const permissionFlags = React.useMemo(
    () => ({
      canRead: ability.can('read', 'projects'),
      canUpdate: ability.can('update', 'projects'),
      canDelete: ability.can('delete', 'projects'),
      canCreate: ability.can('create', 'projects'),
    }),
    [ability]
  );

  const handleCreateProject = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (project: ProjectsListRow, mode: 'edit' | 'read') => {
      drawer.open(project, mode);
    },
    [drawer]
  );

  const onClickNavigateToProjectDetail = React.useCallback(
    (project: ProjectsListRow) => {
      router.push(`/projects/${project.id}`);
    },
    [router]
  );

  const onClickCopy = React.useCallback(
    (project: ProjectsListRow) => {
      const copy = {
        ...project,
        name: `${project.name} (Copy)`,
      };
      drawer.open(copy, 'create');
    },
    [drawer]
  );

  const onClickDeleteRef = React.useRef<(projectId: string) => void>(() => {});

  const columns = React.useMemo(
    () =>
      getColumns(
        onClickEditOrRead,
        (projectId) => onClickDeleteRef.current(projectId),
        onClickCopy,
        onClickNavigateToProjectDetail,
        permissionFlags
      ),
    [
      onClickEditOrRead,
      onClickCopy,
      onClickNavigateToProjectDetail,
      permissionFlags,
    ]
  );

  const controls = useDataTableControls(
    PROJECTS_TABLE_ID,
    defaultProjectTableFilters
  );

  const { query: projectsQuery, invalidate: invalidateProjectsQuery } =
    useProjectsQuery({
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const onClickDelete = React.useCallback(
    (projectId: string) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteProjectMutation.mutateAsync(projectId);
          invalidateProjectsQuery();
        },
        itemName: 'project',
      });
    },
    [deleteConfirmation, deleteProjectMutation, invalidateProjectsQuery]
  );

  React.useEffect(() => {
    onClickDeleteRef.current = onClickDelete;
  }, [onClickDelete]);

  return (
    <>
      <DataTable<ProjectsListRow>
        query={projectsQuery}
        controls={controls}
        filterFields={filterFields}
        filtersInlineWithSearch
        showFilterAddButton
        showFilterClearButton={false}
        columns={columns}
        searchPlaceholder='Search by Project Name...'
        emptyState={{
          itemType: 'project',
          onCreateNew: permissionFlags.canCreate
            ? handleCreateProject
            : undefined,
        }}
        loadingMessage='Loading projects...'
        errorState={
          <TableErrorState
            title='Failed to load projects'
            message={projectsQuery.error?.message || 'An error occurred'}
            onRetry={() => window.location.reload()}
          />
        }
        actions={{
          end: permissionFlags.canCreate ? (
            <Button onClick={handleCreateProject}>
              <IconPlus />
              <span className='hidden lg:inline'>Create Project</span>
            </Button>
          ) : undefined,
        }}
      />

      {drawer.isOpen && drawer.mode && (
        <ProjectDrawer
          mode={drawer.mode}
          project={drawer.data}
          open={drawer.isOpen}
          onSubmit={() => {
            drawer.close();
            invalidateProjectsQuery();
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
            deleteConfirmation.data.isLoading || deleteProjectMutation.isPending
          }
          itemName='project'
          itemCount={deleteConfirmation.data.itemCount}
        />
      )}
    </>
  );
}
