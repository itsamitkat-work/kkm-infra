'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export type SubDesignation = {
  id: string;
  designationHashID: string;
  designationName: string | null;
  name: string;
  code: string;
  basicRate: number;
  newRate: number | null;
  revisedDate: string | null;
  remarks: string | null;
  status: string;
};

// API response wrapper type
interface SubDesignationsApiResponse {
  isSuccess: boolean;
  data: Array<{
    id: string;
    designationHashID: string;
    designationName: string | null;
    code: string;
    name: string;
    basicRate: number;
    newRate: number | null;
    revisedDate: string | null;
    remarks: string | null;
    status: string;
  }>;
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// API function to fetch sub-designations
export const fetchSubDesignations = async (
  designationHashId: string,
  signal?: AbortSignal
): Promise<SubDesignation[]> => {
  const url = `v2/sub-designations?designationHashId=${designationHashId}`;

  const response = await apiFetch<SubDesignationsApiResponse>(url, { signal });

  // Map API response to SubDesignation type
  return response.data.map((item) => ({
    id: item.id,
    designationHashID: item.designationHashID,
    designationName: item.designationName,
    name: item.name,
    code: item.code,
    basicRate: item.basicRate,
    newRate: item.newRate,
    revisedDate: item.revisedDate,
    remarks: item.remarks,
    status: item.status,
  }));
};

export const useSubDesignationsQuery = (designationHashId: string | null) => {
  return useQuery({
    queryKey: ['sub-designations', designationHashId],
    queryFn: ({ signal }) =>
      designationHashId
        ? fetchSubDesignations(designationHashId, signal)
        : Promise.resolve([]),
    enabled: !!designationHashId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
