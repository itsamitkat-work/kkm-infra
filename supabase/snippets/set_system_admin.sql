alter table public.profiles disable trigger protect_profiles_system_admin;

update public.profiles
set is_system_admin = true
where id = '44386784-edfc-4a68-b03b-0dbfe507ca02';

alter table public.profiles enable trigger protect_profiles_system_admin;