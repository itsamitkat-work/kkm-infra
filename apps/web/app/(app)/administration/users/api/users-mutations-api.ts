import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

type TenantMemberRolesInsert =
  Database['authz']['Tables']['tenant_member_roles']['Insert'];

export type AssignRoleInput = Pick<
  TenantMemberRolesInsert,
  'tenant_member_id' | 'tenant_role_id'
>;

export type RemoveRoleInput = AssignRoleInput;

type TenantMembersUpdate = Database['public']['Tables']['tenant_members']['Update'];
type ProfilesUpdate = Database['public']['Tables']['profiles']['Update'];

export type UpdateTenantMemberDirectoryInput = {
  tenant_member_id: string;
  user_id: string;
} & Required<
  Pick<TenantMembersUpdate, 'display_name' | 'status' | 'avatar_url'>
> & {
  /**
   * When set, also updates `public.profiles` (requires system admin or self per RLS).
   * Use the same display name / avatar you persist on the member row when syncing.
   */
  profilesSync?: Required<
    Pick<ProfilesUpdate, 'display_name' | 'username' | 'avatar_url'>
  >;
};

async function assignTenantMemberRole(
  supabase: SupabaseClient<Database>,
  request: AssignRoleInput,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.schema('authz').from('tenant_member_roles').insert({
    tenant_member_id: request.tenant_member_id,
    tenant_role_id: request.tenant_role_id,
  });
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function removeTenantMemberRole(
  supabase: SupabaseClient<Database>,
  request: RemoveRoleInput,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase
    .schema('authz')
    .from('tenant_member_roles')
    .delete()
    .eq('tenant_member_id', request.tenant_member_id)
    .eq('tenant_role_id', request.tenant_role_id);
  if (signal) {
    q = q.abortSignal(signal);
  }
  const { error } = await q;
  if (error) {
    throw normalizeError(error);
  }
}

async function updateTenantMemberDirectory(
  supabase: SupabaseClient<Database>,
  input: UpdateTenantMemberDirectoryInput,
  signal?: AbortSignal
): Promise<void> {
  let tmUpdate = supabase
    .from('tenant_members')
    .update({
      display_name: input.display_name,
      status: input.status,
      avatar_url: input.avatar_url,
    })
    .eq('id', input.tenant_member_id);
  if (signal) {
    tmUpdate = tmUpdate.abortSignal(signal);
  }
  const { error: tmError } = await tmUpdate;

  if (tmError) {
    throw normalizeError(tmError);
  }

  if (input.profilesSync) {
    let profUpdate = supabase
      .from('profiles')
      .update({
        display_name: input.profilesSync.display_name,
        username: input.profilesSync.username,
        avatar_url: input.profilesSync.avatar_url,
      })
      .eq('id', input.user_id);
    if (signal) {
      profUpdate = profUpdate.abortSignal(signal);
    }
    const { error: profileError } = await profUpdate;

    if (profileError) {
      throw normalizeError(profileError);
    }
  }
}

export {
  assignTenantMemberRole,
  removeTenantMemberRole,
  updateTenantMemberDirectory,
};
