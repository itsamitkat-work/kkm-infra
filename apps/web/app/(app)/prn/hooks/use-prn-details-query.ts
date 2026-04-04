'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPrnDetails } from '../api/prn-api';

export const PRN_DETAILS_QUERY_KEY = 'prn-details';

export function usePrnDetailsQuery(prnCode: string) {
  return useQuery({
    queryKey: [PRN_DETAILS_QUERY_KEY, prnCode],
    queryFn: async ({ signal }) => {
      const res = await fetchPrnDetails(prnCode, signal);
      return res.data;
    },
    enabled: !!prnCode,
  });
}
