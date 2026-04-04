'use client';

import * as React from 'react';
import { FolderOpen, AlertTriangle } from 'lucide-react';

import { SectionCard } from '@/components/ui/section-card';
import {
  AssignedProjectType,
  useAssignedProjectsQuery,
} from '@/hooks/projects/use-assigned-projects-query';
import { useAuth } from '@/hooks/auth/use-auth';

export function KPICards() {
  const { getUser } = useAuth();
  const currentUser = getUser();
  const userHashId = currentUser?.hashId ?? null;

  console.log('currentUser', currentUser);

  // Get assigned projects with employee counts
  const { projects, query } = useAssignedProjectsQuery(
    userHashId,
    AssignedProjectType.All
  );

  // Calculate project count and total employees
  const { projectCount, totalEmployees } = React.useMemo(() => {
    const count = projects.length;
    const employees = projects.reduce(
      (sum, project) => sum + (project.assignedWorkersCount ?? 0),
      0
    );
    return { projectCount: count, totalEmployees: employees };
  }, [projects]);

  const isLoading = query.isLoading;
  const displayValue = isLoading ? '-' : projectCount.toString();
  const description = isLoading
    ? 'Loading...'
    : totalEmployees > 0
      ? `${totalEmployees} employee${totalEmployees !== 1 ? 's' : ''} assigned`
      : 'Projects currently assigned to you';

  return (
    <div className='grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4'>
      <SectionCard
        title='Assigned Projects'
        value={displayValue}
        type='info'
        icon={FolderOpen}
        description={description}
      />
      <SectionCard
        title='Unwarranted'
        value='-'
        type='warning'
        icon={AlertTriangle}
        description='Items requiring attention'
      />
    </div>
  );
}
