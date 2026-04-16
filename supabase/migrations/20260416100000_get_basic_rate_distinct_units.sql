-- Distinct unit values from basic_rates (RLS applies via security invoker).

create or replace function public.get_basic_rate_distinct_units()
returns setof text
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct br.unit
  from public.basic_rates br
  order by 1;
$$;

comment on function public.get_basic_rate_distinct_units() is
  'Returns distinct unit strings visible to the caller under basic_rates RLS.';

grant execute on function public.get_basic_rate_distinct_units() to authenticated;
grant execute on function public.get_basic_rate_distinct_units() to service_role;
revoke execute on function public.get_basic_rate_distinct_units() from public;

create index if not exists idx_basic_rates_unit
  on public.basic_rates (unit);
