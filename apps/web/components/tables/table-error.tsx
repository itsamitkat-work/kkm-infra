import { IconCircleX } from '@tabler/icons-react';
import { Button } from '../ui/button';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export const TableErrorState = ({
  title = 'An error occurred',
  message,
  onRetry,
}: ErrorStateProps) => {
  return (
    <div
      style={{ height: `450px` }}
      className='flex h-64  flex-col items-center justify-center space-y-4 rounded-md text-center'
    >
      <div className='rounded-full bg-destructive/10 p-3'>
        <IconCircleX className='h-8 w-8 text-destructive' />
      </div>
      <div className='space-y-2'>
        <h3 className='text-xl font-semibold tracking-tight'>{title}</h3>
        {message && <p className='text-sm text-muted-foreground'>{message}</p>}
      </div>
      {onRetry && <Button onClick={onRetry}>Try Again</Button>}
    </div>
  );
};
