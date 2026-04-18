import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { composeAccessTokenContext } from '@/lib/auth';
import { UserRoleType } from '../../user/types';
import { USER_ROLE_SLUG } from '@/lib/projects/persist-project';

async function resolveRoleIdForUserSearch(
  tenantId: string,
  userRole: UserRoleType
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const slug = USER_ROLE_SLUG[userRole];
  const firstResult = await supabase
    .schema('authz')
    .from('tenant_roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .maybeSingle();
  if (firstResult.error) {
    throw firstResult.error;
  }
  let data = firstResult.data;
  if (!data && userRole === UserRoleType.Superviser) {
    const alt = await supabase
      .schema('authz')
      .from('tenant_roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', 'superviser')
      .maybeSingle();
    if (alt.error) {
      throw alt.error;
    }
    data = alt.data;
  }
  return data?.id ?? null;
}

export async function fetchUserOptions(
  query: string,
  userRole: UserRoleType,
  page: number = 1,
  pageSize: number = 50,
  tenantId?: string | null
): Promise<{
  options: { value: string; label: string }[];
  hasNextPage: boolean;
}> {
  const supabase = createSupabaseBrowserClient();

  let resolvedTenantId = tenantId ?? null;
  if (!resolvedTenantId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { claims } = composeAccessTokenContext(
      sessionData.session?.access_token
    );
    if (claims?.is_system_admin === true) {
      const { data: defaultTid, error: rpcError } = await supabase.rpc(
        'default_platform_tenant_id'
      );
      if (rpcError) throw rpcError;
      resolvedTenantId = defaultTid ?? null;
    }
  }

  if (!resolvedTenantId) {
    return { options: [], hasNextPage: false };
  }

  const roleId = await resolveRoleIdForUserSearch(resolvedTenantId, userRole);
  if (!roleId) {
    return { options: [], hasNextPage: false };
  }

  const { data: tmr, error: tmrError } = await supabase
    .schema('authz')
    .from('tenant_member_roles')
    .select('tenant_member_id')
    .eq('tenant_role_id', roleId);
  if (tmrError) throw tmrError;

  const memberIds = (tmr ?? []).map(
    (r: { tenant_member_id: string }) => r.tenant_member_id
  );
  if (memberIds.length === 0) {
    return { options: [], hasNextPage: false };
  }

  const { data: rows, error: rowsError } = await supabase
    .from('tenant_members')
    .select('id, user_id, profiles(display_name, username)')
    .eq('tenant_id', resolvedTenantId)
    .in('id', memberIds);
  if (rowsError) throw rowsError;

  type Profile = { display_name: string | null; username: string | null };
  type Row = { id: string; user_id: string; profiles: Profile | null };

  let list = (rows ?? []) as unknown as Row[];

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((row) => {
      const dn = (row.profiles?.display_name ?? '').toLowerCase();
      const un = (row.profiles?.username ?? '').toLowerCase();
      return dn.includes(q) || un.includes(q);
    });
  }

  list.sort((a, b) => {
    const an = (a.profiles?.display_name ?? a.user_id).localeCompare(
      b.profiles?.display_name ?? b.user_id
    );
    return an;
  });

  const total = list.length;
  const from = (page - 1) * pageSize;
  const slice = list.slice(from, from + pageSize);

  const options = slice.map((row) => {
    const name =
      row.profiles?.display_name?.trim() || row.profiles?.username || 'User';
    return {
      value: row.user_id,
      label: name,
    };
  });

  return {
    options,
    hasNextPage: page * pageSize < total,
  };
}
