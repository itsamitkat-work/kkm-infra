'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export interface UserRole {
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystemRole: boolean;
}

interface UserRolesApiResponse {
  data: UserRole[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const fetchUserRoles = async (userId: string): Promise<UserRole[]> => {
  const response = await apiFetch<UserRolesApiResponse>(
    `v2/userroles/${userId}`
  );
  return response.data || [];
};

export const useUserRolesQuery = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => fetchUserRoles(userId),
    enabled: enabled && !!userId,
    staleTime: 0, // Always fetch fresh data when dialog opens
  });
};
