'use client';

import { DataTable } from '@/components/tables/data-table/data-table';
import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/projects';
import { ProjectDrawer } from './project-drawer';
import { TableErrorState } from '@/components/tables/table-error';
import { useRouter } from 'next/navigation';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { useDeleteProject } from '@/hooks/projects/use-project-mutations';
import { getColumns } from './projects-columns';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import { filterFields } from './project-filters';
import {
  PROJECTS_TABLE_ID,
  useProjectsQuery,
} from '../hooks/use-projects-query';
import { useAuth } from '@/hooks/auth/use-auth';

export function ProjectsTable() {
  const router = useRouter();
  const drawer = useOpenClose<Project | null>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteProjectMutation = useDeleteProject();
  const { getUserPermissions } = useAuth();
  const { permissions } = getUserPermissions();

  const permissionFlags = React.useMemo(
    () => ({
      canRead: permissions.includes('kkm.project.read'),
      canUpdate: permissions.includes('kkm.project.update'),
      canDelete: permissions.includes('kkm.project.delete'),
      canCreate: permissions.includes('kkm.project.create'),
    }),
    [permissions]
  );

  const handleCreateProject = React.useCallback(() => {
    drawer.open(null, 'create');
  }, [drawer]);

  const onClickEditOrRead = React.useCallback(
    (project: Project, mode: 'edit' | 'read') => {
      drawer.open(project, mode);
    },
    [drawer]
  );

  const onClickNavigateToProjectDetail = React.useCallback(
    (project: Project) => {
      router.push(`/projects/${project.hashId}`);
    },
    [router]
  );

  const onClickCopy = React.useCallback(
    (project: Project) => {
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

  const controls = useDataTableControls(PROJECTS_TABLE_ID);

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
      <DataTable<Project>
        query={projectsQuery}
        controls={controls}
        filterFields={filterFields}
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
            <Button size='sm' onClick={handleCreateProject}>
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
