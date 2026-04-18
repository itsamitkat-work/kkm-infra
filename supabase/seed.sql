-- Post-migration seeds (see config.toml `db.seed.sql_paths`).
-- Auth + authz: `seed/auth_authz_seed.sql` (permissions, tenants, roles, users).
-- App data (units, schedules, basic rates): run `pnpm seed:app` after `db reset`.

select 1;
