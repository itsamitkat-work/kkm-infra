alter table public.profiles disable trigger protect_profiles_system_admin;

update public.profiles
set is_system_admin = true;

alter table public.profiles enable trigger protect_profiles_system_admin;
