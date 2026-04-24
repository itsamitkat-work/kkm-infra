-- Allow tenant directory SELECT for users with tenant_members.read (viewers) as well as manage (admins).

drop policy if exists "tenant_members_select" on "public"."tenant_members";

create policy "tenant_members_select" on "public"."tenant_members" for select to "authenticated" using (
  (
    select authz.is_session_valid()
  )
  and (
    not (
      select authz.is_account_locked()
    )
  )
  and (
    (
      select authz.is_system_admin()
    )
    or (
      (
        select authz.check_permission_version()
      )
      and (
        (
          (
            "user_id" = (
              select auth.uid()
            )
          )
          and (
            "tenant_id" = (
              select authz.current_tenant_id()
            )
          )
        )
        or (
          (
            "tenant_id" = (
              select authz.current_tenant_id()
            )
          )
          and (
            (
              select authz.has_permission('tenant_members.manage'::text)
            )
            or (
              select authz.has_permission('tenant_members.read'::text)
            )
          )
        )
      )
    )
  )
);
