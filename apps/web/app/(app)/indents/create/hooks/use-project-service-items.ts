'use client';

import * as React from 'react';
import {
  useProjectItemsQuery,
} from '@/app/(app)/projects/hooks/use-project-items-query';
import type { ProjectItemRowType } from '@/types/project-item';

const SERVICE_ITEMS_SCHEDULE_NAME = 'Service Items';

/**
 * Returns project items for the given project that are service items
 * (scheduleName === "Service Items").
 */
export function useProjectServiceItems(projectId: string) {
  const result = useProjectItemsQuery({
    projectId,
    scope: 'planned',
  });

  const serviceItems = React.useMemo(() => {
    if (!result.data) return [];
    return result.data.filter(
      (item) =>
        (item.schedule_name?.trim() ?? '').toLowerCase() ===
        SERVICE_ITEMS_SCHEDULE_NAME.toLowerCase()
    );
  }, [result.data]);

  return {
    ...result,
    data: serviceItems,
  };
}
