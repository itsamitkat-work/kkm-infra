'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchItemBasicRates } from '../api/item-basic-rates-api';

export function useItemBasicRatesQuery(
  projectId: string,
  projectItemId: string,
  type: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['item-basic-rates', projectId, projectItemId, type],
    queryFn: ({ signal }) =>
      fetchItemBasicRates(projectId, projectItemId, type, signal),
    enabled: !!projectId && !!projectItemId && !!type && enabled,
  });
}
