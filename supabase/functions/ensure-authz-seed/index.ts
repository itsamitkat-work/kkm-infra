/**
 * Edge Function: ensure-authz-seed
 *
 * Seeds authz.permissions, authz.system_roles, public.tenants, and authz.role_permissions
 * from supabase/seed/authz.json (POST the same JSON body).
 *
 * Auth: service role JWT or system-admin user JWT.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  createServiceClient,
  handleError,
  handleOptions,
  HttpError,
  jsonResponse,
  requireJsonBody,
  requireUserContext,
} from "../_shared/runtime.ts";

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface PermissionRow {
  key: string;
  description: string;
}

interface SystemRoleRow {
  key: string;
  name: string;
  description: string;
}

interface TenantRow {
  id: string;
  name: string;
  display_name: string;
  slug: string;
}

interface RoleGrantBlock {
  role_slugs: string[];
  permission_keys: string[];
}

interface AuthzSeedBody {
  permissions?: PermissionRow[];
  system_roles?: SystemRoleRow[];
  tenant?: TenantRow;
  tenant_role_permission_grants?: RoleGrantBlock[];
}

async function upsertPermissions(
  svc: SupabaseClient,
  rows: PermissionRow[],
): Promise<void> {
  const authz = svc.schema("authz");
  const { error } = await authz.from("permissions").upsert(rows, {
    onConflict: "key",
  });
  if (error) throw error;
}

async function upsertSystemRoles(
  svc: SupabaseClient,
  rows: SystemRoleRow[],
): Promise<void> {
  const authz = svc.schema("authz");
  const { error } = await authz.from("system_roles").upsert(rows, {
    onConflict: "key",
  });
  if (error) throw error;
}

async function ensureTenant(
  svc: SupabaseClient,
  tenant: TenantRow,
): Promise<string> {
  const { data: existing, error: selErr } = await svc
    .from("tenants")
    .select("id")
    .eq("slug", tenant.slug)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data: inserted, error: insErr } = await svc
    .from("tenants")
    .insert({
      id: tenant.id,
      name: tenant.name,
      display_name: tenant.display_name,
      slug: tenant.slug,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return inserted.id as string;
}

async function grantTenantAdminAllPermissions(
  svc: SupabaseClient,
  tenantId: string,
): Promise<void> {
  const authz = svc.schema("authz");
  const { data: role, error: rErr } = await authz
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", "tenant_admin")
    .maybeSingle();

  if (rErr) throw rErr;
  if (!role) {
    throw new HttpError(500, "tenant_admin role not found after tenant insert");
  }

  const { data: perms, error: pErr } = await authz
    .from("permissions")
    .select("id");

  if (pErr) throw pErr;

  const rows = (perms ?? []).map((p: { id: string }) => ({
    role_id: role.id,
    permission_id: p.id,
  }));

  if (rows.length === 0) return;

  const { error: rpErr } = await authz.from("role_permissions").upsert(rows, {
    onConflict: "role_id,permission_id",
  });
  if (rpErr) throw rpErr;
}

async function applyTenantRoleGrants(
  svc: SupabaseClient,
  tenantId: string,
  blocks: RoleGrantBlock[],
): Promise<void> {
  const authz = svc.schema("authz");

  for (const block of blocks) {
    for (const slug of block.role_slugs) {
      const { data: role, error: rErr } = await authz
        .from("roles")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("slug", slug)
        .maybeSingle();

      if (rErr) throw rErr;
      if (!role) {
        throw new HttpError(500, `role slug not found for tenant: ${slug}`);
      }

      for (const key of block.permission_keys) {
        const { data: perm, error: pErr } = await authz
          .from("permissions")
          .select("id")
          .eq("key", key)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!perm) {
          throw new HttpError(500, `permission key not found: ${key}`);
        }

        const { error: insErr } = await authz.from("role_permissions").upsert(
          { role_id: role.id, permission_id: perm.id },
          { onConflict: "role_id,permission_id" },
        );
        if (insErr) throw insErr;
      }
    }
  }
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let svc: SupabaseClient;

    if (token === supabaseServiceRoleKey) {
      svc = createServiceClient();
    } else {
      const context = await requireUserContext(req);
      if (!context.claims.is_system_admin) {
        throw new HttpError(403, "System admin access required");
      }
      svc = context.serviceClient;
    }

    const body = await requireJsonBody<AuthzSeedBody>(req);

    if (!body.permissions?.length || !body.system_roles?.length || !body.tenant) {
      throw new HttpError(
        400,
        "Body must include permissions[], system_roles[], and tenant",
      );
    }

    await upsertPermissions(svc, body.permissions);
    await upsertSystemRoles(svc, body.system_roles);

    const tenantId = await ensureTenant(svc, body.tenant);
    await grantTenantAdminAllPermissions(svc, tenantId);

    if (body.tenant_role_permission_grants?.length) {
      await applyTenantRoleGrants(
        svc,
        tenantId,
        body.tenant_role_permission_grants,
      );
    }

    return jsonResponse({ tenant_id: tenantId, ok: true }, 200, req);
  } catch (error) {
    return handleError(error);
  }
});
