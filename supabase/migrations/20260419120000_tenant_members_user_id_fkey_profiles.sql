-- PostgREST nested selects (e.g. tenant_members?select=*,profiles(...)) require a
-- foreign key between the two tables in the exposed schema. tenant_members.user_id
-- referenced auth.users only; add an equivalent FK to public.profiles (id = auth user id).

insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', u.email, u.id::text)
from auth.users u
where exists (
    select 1
    from public.tenant_members tm
    where tm.user_id = u.id
  )
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  )
on conflict (id) do nothing;

alter table public.tenant_members
  drop constraint if exists tenant_members_user_id_fkey;

alter table public.tenant_members
  add constraint tenant_members_user_id_fkey
  foreign key (user_id)
  references public.profiles (id)
  on delete cascade;
