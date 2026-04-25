import type { SupabaseClient } from '@supabase/supabase-js';
import type { SortingState } from '@tanstack/react-table';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';
import type { PaginationResponse } from '@/types/common';

/** Row shape returned from the tenant roles list fetcher (table + infinite query pages). */
export type TenantRole = Pick<
  Database['authz']['Tables']['tenant_roles']['Row'],
  'id' | 'name' | 'slug' | 'template_key' | 'is_system'
>;

export type PermissionCatalogRow = Pick<
  Database['authz']['Tables']['permissions']['Row'],
  'id' | 'key' | 'description' | 'scope'
>;

export type TenantRolesListParams = {
  tenantId: string;
  search: string;
  page: number;
  pageSize: number;
  sorting: SortingState;
};

export type EmbeddedPermission = Pick<
  PermissionCatalogRow,
  'id' | 'key' | 'description' | 'scope'
>;

export type TenantRoleDetail = Pick<
  Database['authz']['Tables']['tenant_roles']['Row'],
  'id' | 'tenant_id' | 'name' | 'slug' | 'template_key' | 'is_system'
> & {
  tenant_role_permissions: Array<{
    permission_id: string;
    permissions: EmbeddedPermission | null;
  }>;
};

export type CreateTenantRoleInput = Pick<
  Database['authz']['Tables']['tenant_roles']['Insert'],
  'tenant_id' | 'name' | 'slug'
>;

export type UpdateTenantRoleInput = {
  id: string;
  name: string;
  slug: string;
};

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Offset pagination via `range`. Tenant role counts per workspace are small;
 * still matches the basic-rates / users list contract for `DataTable`.
 */
async function fetchTenantRoles(
  supabase: SupabaseClient<Database>,
  params: TenantRolesListParams,
  signal?: AbortSignal
): Promise<PaginationResponse<TenantRole>> {
  const pageSize = params.pageSize;
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema('authz')
    .from('tenant_roles')
    .select('id, name, slug, template_key, is_system', { count: 'exact' })
    .eq('tenant_id', params.tenantId);

  const search = params.search.trim();
  if (search.length > 0) {
    const s = escapeIlike(search);
    query = query.or(`name.ilike.%${s}%,slug.ilike.%${s}%`);
  }

  const sort = params.sorting[0];
  if (sort) {
    if (sort.id === 'name') {
      query = query.order('name', { ascending: !sort.desc });
    } else if (sort.id === 'slug') {
      query = query.order('slug', { ascending: !sort.desc });
    } else if (sort.id === 'is_system') {
      query = query.order('is_system', { ascending: !sort.desc });
    } else {
      query = query.order('name', { ascending: true });
    }
  } else {
    query = query.order('name', { ascending: true });
  }

  let ranged = query.range(from, to);
  if (signal) {
    ranged = ranged.abortSignal(signal);
  }

  const { data, error, count } = await ranged;
  if (error) {
    throw normalizeError(error);
  }

  const rows = (data ?? []) as TenantRole[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    data: rows,
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

async function fetchPermissionsCatalog(
  supabase: SupabaseClient<Database>,
  signal?: AbortSignal
): Promise<PermissionCatalogRow[]> {
  let q = supabase
    .schema('authz')
    .from('permissions')
    .select('id, key, description, scope')
    .order('key', { ascending: true });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q;
  if (error) {
    throw normalizeError(error);
  }
  return data ?? [];
}

async function fetchTenantRoleDetail(
  supabase: SupabaseClient<Database>,
  roleId: string,
  signal?: AbortSignal
): Promise<TenantRoleDetail> {
  let q = supabase
    .schema('authz')
    .from('tenant_roles')
    .select(
      `
      id,
      tenant_id,
      name,
      slug,
      template_key,
      is_system,
      tenant_role_permissions (
        permission_id,
        permissions ( id, key, description, scope )
      )
    `
    )
    .eq('id', roleId);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    throw normalizeError(error);
  }
  if (!data) {
    throw new Error('Role not found');
  }
  return data as unknown as TenantRoleDetail;
}

async function createTenantRole(
  supabase: SupabaseClient<Database>,
  input: CreateTenantRoleInput,
  signal?: AbortSignal
): Promise<{ id: string }> {
  let q = supabase
    .schema('authz')
    .from('tenant_roles')
    .insert({
      tenant_id: input.tenant_id,
      name: input.name.trim(),
      slug: input.slug.trim(),
      is_system: false,
      template_key: null,
    })
    .select('id');
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { data, error } = await q.single();
  if (error) {
    throw normalizeError(error);
  }
  if (!data?.id) {
    throw new Error('Role was not created');
  }
  return { id: data.id };
}

async function updateTenantRole(
  supabase: SupabaseClient<Database>,
  input: UpdateTenantRoleInput,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase
    .schema('authz')
    .from('tenant_roles')
    .update({
      name: input.name.trim(),
      slug: input.slug.trim(),
    })
    .eq('id', input.id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function deleteTenantRole(
  supabase: SupabaseClient<Database>,
  roleId: string,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.schema('authz').from('tenant_roles').delete().eq('id', roleId);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function replaceTenantRolePermissions(
  supabase: SupabaseClient<Database>,
  tenantRoleId: string,
  permissionIds: string[],
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.rpc('replace_tenant_role_permissions', {
    p_tenant_role_id: tenantRoleId,
    p_permission_ids: permissionIds,
  });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

export {
  createTenantRole,
  deleteTenantRole,
  fetchPermissionsCatalog,
  fetchTenantRoleDetail,
  fetchTenantRoles,
  replaceTenantRolePermissions,
  updateTenantRole,
};
