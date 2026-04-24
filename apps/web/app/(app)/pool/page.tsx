'use client';

import * as React from 'react';
import { PoolUserList } from './components/pool-user-list';
import { ProjectUsersSection } from './components/project-users-section';
import {
  AssignedProjectType,
  useAssignedProjectsQuery,
} from '../../../hooks/projects/use-assigned-projects-query';
import { useAuth } from '@/hooks/auth';
import { Card } from '@/components/ui/card';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

export default function AttendancePoolPage() {
  const { user } = useAuth();

  const [activeProjectId, setActiveProjectId] = React.useState<string>('all');

  const { projects } = useAssignedProjectsQuery(
    user?.hashId ?? null,
    AssignedProjectType.ForAttendance
  );

  return (
    <div className='flex flex-col h-full p-4 lg:p-6 gap-4'>
      <Card className='flex-1 flex flex-col overflow-hidden p-0'>
        <ResizablePanelGroup orientation='horizontal' className='h-full'>
          <ResizablePanel defaultSize={40} minSize={30} className='min-w-0'>
            <PoolUserList
              projects={projects}
              onAssignToProject={setActiveProjectId}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className='hidden lg:flex' />

          <ResizablePanel defaultSize={60} minSize={40} className='min-w-0'>
            <ProjectUsersSection
              projects={projects}
              activeProjectId={activeProjectId}
              onProjectChange={setActiveProjectId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </div>
  );
}
