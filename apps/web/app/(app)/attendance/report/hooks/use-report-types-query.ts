'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchReportTypes,
  REPORT_TYPES_QUERY_ID,
} from '../api/report-list-api';
import * as React from 'react';

export function useReportTypesQuery() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, ...rest } =
    useInfiniteQuery({
      queryKey: [REPORT_TYPES_QUERY_ID],
      queryFn: ({ pageParam, signal }) =>
        fetchReportTypes(pageParam as number, signal),
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.totalPages > allPages.length) {
          return allPages.length + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
    });

  // Automatically fetch all pages
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array
  const reportTypes = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  return {
    reportTypes,
    ...rest,
  };
}
