import * as React from 'react';
import { PageActionMatrix } from './components/page-action-matrix';

export default function PermissionMatrixPage() {
  return (
    <div className='h-full w-full flex flex-col p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold'>Page Actions Matrix</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Manage page actions by selecting which actions are allowed for each
          page
        </p>
      </div>
      <div className='flex-1 overflow-auto'>
        <PageActionMatrix />
      </div>
    </div>
  );
}
