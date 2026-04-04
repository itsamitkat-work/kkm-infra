import { ReactNode } from 'react';
import { IconSearch, IconFolderX, IconDatabaseOff } from '@tabler/icons-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';

export interface NoResultsProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'search' | 'empty' | 'error' | 'custom';
  className?: string;
}

const defaultConfigs = {
  search: {
    icon: <IconSearch className='h-6 w-6' />,
    title: 'No results found',
    description:
      "Try adjusting your search criteria or filters to find what you're looking for.",
  },
  empty: {
    icon: <IconFolderX className='h-6 w-6' />,
    title: 'No data available',
    description:
      "There's nothing to show here yet. Create your first item to get started.",
  },
  error: {
    icon: <IconDatabaseOff className='h-6 w-6' />,
    title: 'Unable to load data',
    description:
      'Something went wrong while loading the data. Please try again.',
  },
};

export function NoResults({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = 'empty',
  className,
}: NoResultsProps) {
  const config = variant === 'custom' ? null : defaultConfigs[variant];

  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{icon || config?.icon}</EmptyMedia>
        <EmptyTitle>{title || config?.title}</EmptyTitle>
        <EmptyDescription>
          {description || config?.description}
        </EmptyDescription>
      </EmptyHeader>

      {(action || secondaryAction) && (
        <EmptyContent>
          <div className='flex gap-2'>
            {action && <Button onClick={action.onClick}>{action.label}</Button>}
            {secondaryAction && (
              <Button variant='outline' onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </EmptyContent>
      )}
    </Empty>
  );
}

// Convenience components for common use cases
export function NoSearchResults({
  searchTerm,
  onClearSearch,
  onRefresh,
  className,
}: {
  searchTerm?: string;
  onClearSearch?: () => void;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <NoResults
      variant='search'
      title='No results found'
      description={
        searchTerm
          ? `No results found for "${searchTerm}". Try a different search term.`
          : 'No results match your current search criteria.'
      }
      action={
        onClearSearch
          ? { label: 'Clear Search', onClick: onClearSearch }
          : undefined
      }
      secondaryAction={
        onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined
      }
      className={className}
    />
  );
}

export function NoDataAvailable({
  onCreateNew,
  onImport,
  itemType = 'item',
  className,
}: {
  onCreateNew?: () => void;
  onImport?: () => void;
  itemType?: string;
  className?: string;
}) {
  return (
    <NoResults
      variant='empty'
      title={`No ${itemType}s yet`}
      description={`You haven't created any ${itemType}s yet. Get started by creating your first ${itemType}.`}
      action={
        onCreateNew
          ? { label: `Create ${itemType}`, onClick: onCreateNew }
          : undefined
      }
      secondaryAction={
        onImport ? { label: 'Import', onClick: onImport } : undefined
      }
      className={className}
    />
  );
}

export function NoDataError({
  onRetry,
  onRefresh,
  className,
}: {
  onRetry?: () => void;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <NoResults
      variant='error'
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
      secondaryAction={
        onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined
      }
      className={className}
    />
  );
}
