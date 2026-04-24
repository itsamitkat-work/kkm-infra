import { Suspense } from 'react';

import { Spinner } from '@/components/ui/spinner';

import { SelectActiveRoleScreen } from './select-active-role-screen';

function SelectRoleFallback() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center'>
      <Spinner className='size-8' />
    </div>
  );
}

export default function SelectActiveRolePage() {
  return (
    <Suspense fallback={<SelectRoleFallback />}>
      <SelectActiveRoleScreen />
    </Suspense>
  );
}
