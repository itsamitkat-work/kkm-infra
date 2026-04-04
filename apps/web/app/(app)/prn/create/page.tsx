'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useProject } from '@/hooks/projects/use-project';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { BillTableMaterial } from './components/bill-table-material';

function CreatePrnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  const { project } = useProject(projectId ?? undefined);
  useBreadcrumbLabel(
    'prn/create',
    project?.name ? `Create PRN - ${project.name}` : undefined
  );

  useEffect(() => {
    if (!projectId) {
      router.replace('/prn');
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

export default function CreatePrnPage() {
  return (
    <Suspense
      fallback={
        <div className='flex h-full w-full flex-col lg:max-w-7xl mx-auto min-h-0 animate-pulse bg-muted/20' />
      }
    >
      <CreatePrnContent />
    </Suspense>
  );
}
