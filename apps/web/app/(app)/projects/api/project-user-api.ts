import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { composeAccessTokenContext } from '@/lib/auth';
import { normalizeError } from '@/lib/supabase/errors';
import type { ProjectMemberRoleSlug } from '@/hooks/projects/use-project-member';

type UserOptionsResponse = {
  options: { value: string; label: string }[];
  hasNextPage: boolean;
};

async function resolveRoleIdForUserSearch(
  tenantId: string,
  roleSlug: ProjectMemberRoleSlug
): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema('authz')
    .from('tenant_roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('slug', roleSlug)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  return data?.id ?? null;
}

async function fetchUserOptions(
  query: string,
  roleSlug: ProjectMemberRoleSlug,
  page = 1,
  pageSize = 50,
  tenantId?: string | null
): Promise<UserOptionsResponse> {
  const supabase = createSupabaseBrowserClient();

  let resolvedTenantId = tenantId ?? null;
  if (!resolvedTenantId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { claims } = composeAccessTokenContext(
      sessionData.session?.access_token
    );
    if (claims?.is_system_admin === true) {
      const { data: defaultTenantId, error } = await supabase.rpc(
        'default_platform_tenant_id'
      );
      if (error) {
        throw normalizeError(error);
      }
      resolvedTenantId = defaultTenantId ?? null;
    }
  }

  if (!resolvedTenantId) {
    return { options: [], hasNextPage: false };
  }

  const roleId = await resolveRoleIdForUserSearch(resolvedTenantId, roleSlug);
  if (!roleId) {
    return { options: [], hasNextPage: false };
  }

  const { data: tenantMemberRoles, error: tenantMemberRolesError } = await supabase
    .schema('authz')
    .from('tenant_member_roles')
    .select('tenant_member_id')
    .eq('tenant_role_id', roleId);
  if (tenantMemberRolesError) {
    throw normalizeError(tenantMemberRolesError);
  }

  const memberIds = (tenantMemberRoles ?? []).map(
    (row: { tenant_member_id: string }) => row.tenant_member_id
  );
  if (memberIds.length === 0) {
    return { options: [], hasNextPage: false };
  }

  const { data: rows, error: rowsError } = await supabase
    .from('tenant_members')
    .select('id, user_id, profiles(display_name, username)')
    .eq('tenant_id', resolvedTenantId)
    .in('id', memberIds);
  if (rowsError) {
    throw normalizeError(rowsError);
  }

  type Profile = { display_name: string | null; username: string | null };
  type Row = { id: string; user_id: string; profiles: Profile | null };

  let list = (rows ?? []) as unknown as Row[];
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery) {
    list = list.filter((row) => {
      const displayName = (row.profiles?.display_name ?? '').toLowerCase();
      const username = (row.profiles?.username ?? '').toLowerCase();
      return (
        displayName.includes(normalizedQuery) ||
        username.includes(normalizedQuery)
      );
    });
  }

  list.sort((a, b) =>
    (a.profiles?.display_name ?? a.user_id).localeCompare(
      b.profiles?.display_name ?? b.user_id
    )
  );

  const total = list.length;
  const from = (page - 1) * pageSize;
  const slice = list.slice(from, from + pageSize);

  return {
    options: slice.map((row) => ({
      value: row.user_id,
      label:
        row.profiles?.display_name?.trim() ||
        row.profiles?.username ||
        'User',
    })),
    hasNextPage: page * pageSize < total,
  };
}

export { fetchUserOptions };

export type { UserOptionsResponse };
