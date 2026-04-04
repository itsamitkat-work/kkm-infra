import { apiFetch } from '@/lib/apiClient';
import { UserRoleType } from '../../user/types';

interface UserApiResponse {
  data: {
    HashId: string;
    Name: string;
    EmpCode: number;
  }[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const fetchUserOptions = async (
  query: string,
  userRole: UserRoleType,
  page = 1,
  pageSize = 50
): Promise<{
  options: { value: string; label: string }[];
  hasNextPage: boolean;
}> => {
  try {
    const response = await apiFetch<UserApiResponse>(
      `/v2/getusers/${userRole}?name=${query}&page=${page}&pageSize=${pageSize}`
    );
    const options = response.data.map((user) => ({
      value: user.HashId,
      label: `${user.EmpCode}- ${user.Name}`,
    }));
    return {
      options,
      hasNextPage: response.hasNext,
    };
  } catch (error) {
    console.error(`Error fetching ${userRole}s:`, error);
    throw new Error(`Failed to fetch ${userRole}s`);
  }
};
