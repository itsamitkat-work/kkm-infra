'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useProject } from '@/hooks/projects/use-project';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { BillTableMaterial } from './components/bill-table-material';

function CreateIndentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // projectId is passed from parent (e.g. indents list) via URL query when navigating to create
  const projectId = searchParams.get('projectId');
  const { project } = useProject(projectId ?? undefined);
  useBreadcrumbLabel(
    'indents/create',
    project?.name ? `Create Indent - ${project.name}` : undefined
  );

  useEffect(() => {
    if (!projectId) {
      router.replace('/indents');
    }
  }, [projectId, router]);

  if (!projectId) {
    return null;
  }

  return (
    <div className='flex h-full w-full flex-col lg:max-w-7xl mx-auto min-h-0'>
      <BillTableMaterial projectId={projectId} />
    </div>
  );
}

export default function CreateIndentPage() {
  return (
    <Suspense
      fallback={
        <div className='flex h-full w-full flex-col lg:max-w-7xl mx-auto min-h-0 animate-pulse bg-muted/20' />
      }
    >
      <CreateIndentContent />
    </Suspense>
  );
}
