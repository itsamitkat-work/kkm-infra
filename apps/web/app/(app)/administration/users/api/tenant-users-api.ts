import type { SupabaseClient } from '@supabase/supabase-js';
import type { SortingState } from '@tanstack/react-table';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';
import type { PaginationResponse } from '@/types/common';
import type { User, UserRole } from '@/types/users';

export type FetchTenantUsersParams = {
  tenantId: string;
  search: string;
  page: number;
  pageSize: number;
  sorting: SortingState;
};

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

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function mapRowsToUsers(
  members: MemberWithProfile[],
  roleMap: Map<string, UserRole[]>
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

async function fetchTenantUsers(
  supabase: SupabaseClient<Database>,
  params: FetchTenantUsersParams,
  signal?: AbortSignal
): Promise<PaginationResponse<User>> {
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
      { count: 'exact' }
    )
    .eq('tenant_id', params.tenantId);

  const search = params.search.trim();
  if (search.length > 0) {
    const s = escapeIlike(search);
    query = query.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`, {
      foreignTable: 'profiles',
    });
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
    throw normalizeError(error);
  }

  const members = (data ?? []) as unknown as MemberWithProfile[];
  const roleMap = new Map<string, UserRole[]>();

  if (members.length > 0) {
    const memberIds = members.map((m) => m.id);
    let roleQuery = supabase
      .schema('authz')
      .from('tenant_member_roles')
      .select('tenant_member_id, tenant_roles(id, name, slug)')
      .in('tenant_member_id', memberIds);
    if (signal) {
      roleQuery = roleQuery.abortSignal(signal);
    }
    const { data: tmrData, error: tmrError } = await roleQuery;
    if (tmrError) {
      throw normalizeError(tmrError);
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

export { fetchTenantUsers };
