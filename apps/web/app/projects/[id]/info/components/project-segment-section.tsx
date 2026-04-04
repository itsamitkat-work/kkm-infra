'use client';

import { Button } from '@/components/ui/button';
import { Project, ProjectSegment } from '@/types/projects';
import { Plus } from 'lucide-react';
import React from 'react';
import { useOpenClose } from '@/hooks/use-open-close';
import { useDeleteSegment } from '../../hooks/use-segment-mutations';
import { ProjectSegmentDrawer } from './project-segment-drawer';
import { DataTable } from '@/components/tables/data-table/data-table';
import { useDataTableControls } from '@/components/tables/data-table/use-data-table-controls';
import {
  useProjectSegmentsQuery,
  PROJECT_SEGMENTS_TABLE_ID,
} from '../../hooks/use-project-segments-query';
import { getSegmentColumns } from './project-segment-columns';
import { useDeleteConfirmation } from '@/hooks/use-delete-confirmation';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { TableErrorState } from '@/components/tables/table-error';

export const ProjectSegmentSection = ({ project }: { project: Project }) => {
  const segmentDrawer = useOpenClose<ProjectSegment>();
  const deleteConfirmation = useDeleteConfirmation();
  const deleteSegmentMutation = useDeleteSegment(project?.hashId || '');

  const controls = useDataTableControls(PROJECT_SEGMENTS_TABLE_ID);

  React.useEffect(() => {
    if (controls.state.columnVisibility.displayOrder === undefined) {
      controls.onColumnVisibilityChange({
        ...controls.state.columnVisibility,
        displayOrder: false,
      });
    }
  }, [controls]);

  const { query: segmentsQuery, invalidate: invalidateSegmentsQuery } =
    useProjectSegmentsQuery({
      projectId: project?.hashId || '',
      search: controls.search,
      filters: controls.filters,
      sorting: controls.state.sorting,
    });

  const handleCreateSegment = React.useCallback(() => {
    segmentDrawer.open(undefined, 'create');
  }, [segmentDrawer]);

  const handleEditSegment = React.useCallback(
    (segment: ProjectSegment) => {
      segmentDrawer.open(segment, 'edit');
    },
    [segmentDrawer]
  );

  const handleViewSegment = React.useCallback(
    (segment: ProjectSegment) => {
      segmentDrawer.open(segment, 'read');
    },
    [segmentDrawer]
  );

  const handleDeleteSegment = React.useCallback(
    (segment: ProjectSegment) => {
      deleteConfirmation.openDeleteConfirmation({
        onConfirm: async () => {
          await deleteSegmentMutation.mutateAsync(segment.hashId);
          invalidateSegmentsQuery();
        },
        itemName: 'segment',
      });
    },
    [deleteConfirmation, deleteSegmentMutation, invalidateSegmentsQuery]
  );

  const columns = React.useMemo(
    () =>
      getSegmentColumns(
        handleEditSegment,
        handleViewSegment,
        handleDeleteSegment
      ),
    [handleEditSegment, handleViewSegment, handleDeleteSegment]
  );

  return (
    <section className='border rounded-lg p-6'>
      <div className='-mx-3 lg:-mx-4'>
        <DataTable<ProjectSegment>
          query={segmentsQuery}
          controls={controls}
          filterFields={[]}
          columns={columns}
          searchPlaceholder='Search by segment name...'
          emptyState={{
            itemType: 'segment',
            onCreateNew: handleCreateSegment,
          }}
          loadingMessage='Loading segments...'
          errorState={
            <TableErrorState
              title='Failed to load segments'
              message={segmentsQuery.error?.message || 'An error occurred'}
              onRetry={() => window.location.reload()}
            />
          }
          actions={{
            end: (
              <Button size='sm' onClick={handleCreateSegment}>
                <Plus className='mr-2 h-4 w-4' />
                Add Segment
              </Button>
            ),
          }}
          showIndexColumn={false}
          showSearch={false}
          showFilters={false}
          showTotalBadge={false}
          tableName='Segments'
        />
      </div>
      {project?.hashId && (
        <>
          {segmentDrawer.isOpen && segmentDrawer.mode && (
            <ProjectSegmentDrawer
              mode={segmentDrawer.mode}
              segment={segmentDrawer.data || null}
              projectId={project.hashId}
              project={project}
              open={segmentDrawer.isOpen}
              onSubmit={() => {
                segmentDrawer.close();
                invalidateSegmentsQuery();
              }}
              onCancel={() => segmentDrawer.close()}
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
                deleteSegmentMutation.isPending
              }
              itemName='segment'
              itemCount={deleteConfirmation.data.itemCount}
            />
          )}
        </>
      )}
    </section>
  );
};
