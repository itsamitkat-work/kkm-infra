import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kkm/db';
import { normalizeError } from '@/lib/supabase/errors';

export type AssignRoleInput = {
  roleId: string;
  tenantMemberId: string;
};

export type RemoveRoleInput = {
  roleId: string;
  tenantMemberId: string;
};

export type UpdateTenantMemberDirectoryInput = {
  tenantMemberId: string;
  userId: string;
  displayName: string;
  status: 'active' | 'suspended';
  /** Stored on `tenant_members.avatar_url` (e.g. public storage URL or HTTPS). */
  avatarUrl: string | null;
  /**
   * When set, also updates `public.profiles` (requires system admin or self per RLS).
   * Use the same display name / avatar you persist on the member row when syncing.
   */
  profilesSync?: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
};

async function assignTenantMemberRole(
  supabase: SupabaseClient<Database>,
  request: AssignRoleInput,
  signal?: AbortSignal
): Promise<void> {
  let q = supabase.schema('authz').from('tenant_member_roles').insert({
    tenant_member_id: request.tenantMemberId,
    tenant_role_id: request.roleId,
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
    .eq('tenant_member_id', request.tenantMemberId)
    .eq('tenant_role_id', request.roleId);
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
      display_name: input.displayName,
      status: input.status,
      avatar_url: input.avatarUrl,
    })
    .eq('id', input.tenantMemberId);
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
        display_name: input.profilesSync.displayName,
        username: input.profilesSync.username,
        avatar_url: input.profilesSync.avatarUrl,
      })
      .eq('id', input.userId);
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
