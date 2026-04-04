import { Loader2 } from 'lucide-react';
import * as React from 'react';

type LoadingStateProps = {
  message?: React.ReactNode;
  showSpinner?: boolean;
};

export const TableLoadingState = ({
  message = 'Loading...',
  showSpinner = true,
}: LoadingStateProps) => {
  return (
    <div
      className='flex items-center justify-center'
      style={{ height: '450px' }}
    >
      <div className='text-center'>
        {showSpinner && (
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4 text-primary' />
        )}
        <div className='text-muted-foreground'>{message}</div>
      </div>
    </div>
  );
};
