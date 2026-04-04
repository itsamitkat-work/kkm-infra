'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchIndentDetails } from '../api/indent-api';

export const INDENT_DETAILS_QUERY_KEY = 'indent-details';

export function useIndentDetailsQuery(indentCode: string, role: string) {
  return useQuery({
    queryKey: [INDENT_DETAILS_QUERY_KEY, indentCode, role],
    queryFn: async ({ signal }) => {
      const res = await fetchIndentDetails({ indentCode, role }, signal);
      return res.data;
    },
    enabled: !!indentCode && !!role,
  });
}
