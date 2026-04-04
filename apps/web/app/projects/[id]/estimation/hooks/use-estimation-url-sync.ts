import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from '@/components/ui/filters';

interface UseEstimationUrlSyncProps {
  projectId: string;
  type: string;
  filters: Filter[];
  query: string;
  segmentId?: string | null;
}

/**
 * Hook to sync filters, query, and segment with URL
 * and restore state from URL on mount
 */
export function useEstimationUrlSync({
  projectId,
  type,
  filters,
  query,
  segmentId,
}: UseEstimationUrlSyncProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const isUpdatingFromUrl = useRef(false);

  // Update URL when filters, query, or segment changes
  useEffect(() => {
    // Skip on initial mount (we'll restore from URL instead)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip if we're updating from URL to avoid loops
    if (isUpdatingFromUrl.current) {
      return;
    }

    const newSearchParams = new URLSearchParams(searchParams.toString());

    // Update tab (type)
    newSearchParams.set('tab', type.toLowerCase());

    // Update filters
    if (filters.length > 0) {
      newSearchParams.set('filters', JSON.stringify(filters));
    } else {
      newSearchParams.delete('filters');
    }

    // Update segment
    if (segmentId) {
      newSearchParams.set('segment', segmentId);
    } else {
      newSearchParams.delete('segment');
    }

    // Update query
    if (query.trim()) {
      newSearchParams.set('query', query.trim());
    } else {
      newSearchParams.delete('query');
    }

    // Update URL without scrolling
    const newUrl = `/projects/${projectId}?${newSearchParams.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [projectId, type, filters, query, segmentId, router, searchParams]);
}
