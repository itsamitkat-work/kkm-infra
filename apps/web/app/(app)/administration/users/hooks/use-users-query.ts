'use client';

import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { useAuth } from '@/hooks/auth';
import { useDebounce } from '@/hooks/use-debounce';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Filter } from '@/components/ui/filters';
import type { PaginationResponse } from '@/types/common';
import type { User, UserRole } from '@/types/users';

export const USERS_TABLE_ID = 'users';

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function getSupabase() {
  return createSupabaseBrowserClient();
}

type MemberWithProfile = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type RoleEmbed = { id: string; name: string; slug: string };

type TmrRow = {
  tenant_member_id: string;
  tenant_roles: RoleEmbed | RoleEmbed[] | null;
};

function mapRowsToUsers(
  members: MemberWithProfile[],
  roleMap: Map<string, UserRole[]>,
): User[] {
  return members.map((m) => {
    const prof = m.profiles;
    const roles = roleMap.get(m.id) ?? [];
    const tmDisplay = m.display_name?.trim() ?? '';
    const profDisplay = prof?.display_name?.trim() ?? '';
    const tmAvatar = m.avatar_url?.trim() ?? '';
    const profAvatar = prof?.avatar_url?.trim() ?? '';

    return {
      id: m.user_id,
      tenantMemberId: m.id,
      userName: prof?.username ?? '',
      fullName:
        tmDisplay ||
        profDisplay ||
        prof?.username ||
        m.user_id.slice(0, 8),
      avatarUrl: tmAvatar || profAvatar || null,
      email: '',
      isActive: m.status === 'active',
      roles,
    };
  });
}

export type FetchTenantUsersParams = {
  tenantId: string;
  search: string;
  page: number;
  pageSize: number;
  sorting: SortingState;
};

export async function fetchTenantUsers(
  params: FetchTenantUsersParams,
  signal?: AbortSignal,
): Promise<PaginationResponse<User>> {
  const supabase = getSupabase();
  const pageSize = params.pageSize;
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tenant_members')
    .select(
      `
      id,
      user_id,
      status,
      created_at,
      display_name,
      avatar_url,
      profiles(username, display_name, avatar_url)
    `,
      { count: 'exact' },
    )
    .eq('tenant_id', params.tenantId);

  const search = params.search.trim();
  if (search.length > 0) {
    const s = escapeIlike(search);
    query = query.or(
      `username.ilike.%${s}%,display_name.ilike.%${s}%`,
      { foreignTable: 'profiles' },
    );
  }

  const sort = params.sorting[0];
  if (sort) {
    if (sort.id === 'fullName') {
      query = query.order('display_name', {
        ascending: !sort.desc,
        foreignTable: 'profiles',
        nullsFirst: false,
      });
    } else if (sort.id === 'userName') {
      query = query.order('username', {
        ascending: !sort.desc,
        foreignTable: 'profiles',
        nullsFirst: false,
      });
    } else if (sort.id === 'isActive' || sort.id === 'status') {
      query = query.order('status', { ascending: !sort.desc });
    } else {
      query = query.order('created_at', { ascending: false });
    }
  } else {
    query = query.order('created_at', { ascending: false });
  }

  let ranged = query.range(from, to);
  if (signal) {
    ranged = ranged.abortSignal(signal);
  }

  const { data, error, count } = await ranged;
  if (error) {
    throw error;
  }

  // Embed `profiles` is valid at runtime (FK user_id → auth.users = profiles.id) but
  // generated `Database` relationships omit it, so narrow here.
  const members = (data ?? []) as unknown as MemberWithProfile[];
  const roleMap = new Map<string, UserRole[]>();

  if (members.length > 0) {
    const memberIds = members.map((m) => m.id);
    const { data: tmrData, error: tmrError } = await supabase
      .schema('authz')
      .from('tenant_member_roles')
      .select('tenant_member_id, tenant_roles(id, name, slug)')
      .in('tenant_member_id', memberIds);
    if (tmrError) {
      throw tmrError;
    }
    for (const row of (tmrData ?? []) as TmrRow[]) {
      const roleObj = Array.isArray(row.tenant_roles)
        ? row.tenant_roles[0]
        : row.tenant_roles;
      if (!roleObj) {
        continue;
      }
      const ur: UserRole = { name: roleObj.name, hashId: roleObj.id };
      const list = roleMap.get(row.tenant_member_id) ?? [];
      list.push(ur);
      roleMap.set(row.tenant_member_id, list);
    }
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    data: mapRowsToUsers(members, roleMap),
    totalCount,
    page,
    pageSize,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page * pageSize < totalCount,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
}

type UseUsersQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export function useUsersQuery({ search, filters, sorting }: UseUsersQueryParams) {
  void filters;
  const queryClient = useQueryClient();
  const { claims } = useAuth();
  const tenantId = claims?.tid ?? null;
  const debouncedSearch = useDebounce(search, 400);

  const listParams = React.useMemo(
    () => ({
      tenantId: tenantId ?? '',
      search: debouncedSearch,
      sorting,
    }),
    [tenantId, debouncedSearch, sorting],
  );

  const query = useInfiniteQuery({
    queryKey: [USERS_TABLE_ID, listParams],
    queryFn: ({ pageParam = 1, signal }) => {
      if (!tenantId) {
        return Promise.resolve({
          data: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
          isSuccess: true,
          statusCode: 200,
          message: '',
        });
      }
      return fetchTenantUsers(
        {
          tenantId,
          search: debouncedSearch,
          page: pageParam as number,
          pageSize: 20,
          sorting,
        },
        signal,
      );
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasNext) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: 30_000,
    enabled: Boolean(tenantId),
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [USERS_TABLE_ID] }),
  };
}
