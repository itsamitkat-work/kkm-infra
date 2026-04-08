-- Allow service_role JWT (Edge Functions, PostgREST) to set profiles.is_system_admin
-- so dev user seeding does not require disabling triggers.

create or replace function public.protect_system_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  if new.is_system_admin is distinct from old.is_system_admin then
    if coalesce((auth.jwt()->>'role'), '') = 'service_role' then
      return new;
    end if;

    caller_is_admin := coalesce(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'is_system_admin')::boolean,
      false
    );

    if not caller_is_admin then
      raise exception 'Only system admins can modify is_system_admin'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;
