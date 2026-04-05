# Schedule of Rates Architecture & Schema

## Overview

This schema is designed to:

- Store schedule of rates (CPWD, PWD, private schedules)
- Preserve raw data exactly as source (no parsing assumptions)
- Support hierarchical structure via ltree (section > group > item)
- Attribute tables are created upfront but populated later (via AI/manual, not during PDF ingestion)
- Enable full-text search on item descriptions and codes
- Global read-only reference data shared across all tenants

---

## Architecture

```
public.schedule_sources
  ↓
public.schedule_source_versions
  ↓
public.schedule_items (ltree hierarchy)
  ↓
public.schedule_item_rates (contextual overrides)
public.schedule_item_conditions

public.units / public.derived_units

public.attributes / public.attribute_values / public.schedule_item_attributes
```

---

## Access Model

Schedule data is **global reference data** managed by system admins. All authenticated users get read-only access. Write operations require the `schedules.manage` permission.

---

## Extensions

```sql
create extension if not exists ltree;
```

---

## ENUMs

```sql
-- Lifecycle state used across core entities
create type public.record_status as enum (
  'active',      -- Default usable state; included in UI and queries
  'inactive',    -- Temporarily disabled; hidden but retained
  'deprecated'   -- Obsolete; retained for audit/reference but not for new usage
);

-- Structural role of a node in the schedule hierarchy
create type public.schedule_node_type as enum (
  'section',     -- Top-level category
  'group',       -- Intermediate grouping node
  'item'         -- Leaf node with actual rate
);

-- Classification of schedule publisher
create type public.schedule_source_type as enum (
  'govt',        -- Government published (CPWD, State PWD)
  'private'      -- Private/proprietary schedule
);
```

---

## public.schedule_sources

```sql
-- Represents a publisher of schedule of rates (e.g., CPWD, State PWD)
create table public.schedule_sources (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for each source

  name text not null,
  -- Stable internal identifier (e.g., "cpwd")
  -- Used in APIs, integrations, and should remain immutable

  display_name text not null,
  -- Human-readable name (e.g., "Central Public Works Department")
  -- Used in UI and reports

  type public.schedule_source_type,
  -- Classification such as 'govt' or 'private'
  -- Enables filtering and grouping of sources

  status public.record_status default 'active',
  -- Controls availability of entire source
  -- If inactive, all versions/items under it should be treated as unusable

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(name)
  -- Ensures no duplicate internal identifiers
);
```

---

## public.schedule_source_versions

```sql
-- Represents a specific version of a schedule (e.g., DSR 2023)
create table public.schedule_source_versions (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for version

  schedule_source_id uuid not null references public.schedule_sources(id) on delete cascade,
  -- Links version to its parent source

  name text not null,
  -- Internal identifier (e.g., "dsr_2023")
  -- Used in APIs and logic

  display_name text not null,
  -- User-facing label (e.g., "DSR 2023")

  year int,
  -- Numeric year for sorting and comparisons

  region text,
  -- Geographic applicability (e.g., Delhi, UP)
  -- Enables region-specific filtering

  metadata jsonb,
  -- Flexible storage for extra data like PDF references, notes, import logs
  -- Prevents frequent schema changes

  status public.record_status default 'active',
  -- Controls which version is currently usable
  -- Typically only one active version per source

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(schedule_source_id, name)
  -- Prevents duplicate versions under same source
);
```

---

## public.schedule_items

```sql
-- Core table representing hierarchical schedule entries
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for each node

  schedule_source_version_id uuid not null
    references public.schedule_source_versions(id) on delete cascade,
  -- Associates item with a specific schedule version

  parent_item_id uuid references public.schedule_items(id) on delete cascade,
  -- Self-referencing key to build tree hierarchy
  -- Kept alongside ltree path for referential integrity

  path ltree not null,
  -- Materialized hierarchy path for efficient subtree queries
  -- Built from short hex IDs derived from each node's UUID
  -- Auto-computed via trigger from parent_item_id and id
  -- Example: 'a1b2c3d4e5f6.d7e8f9a0b1c2.f3a4b5c6d7e8'
  -- Use nlevel(path) instead of a depth column

  slug text not null,
  -- Human-readable, ltree-safe label derived from code at ingestion
  -- Used for display, breadcrumbs, and API responses
  -- Example: code "13.24.1(a)" → slug "13_24_1_a"
  -- Not used in ltree path to avoid collision from sanitization

  code text not null,
  -- Original code from schedule (e.g., "13.24.1")
  -- Stored as-is for traceability and debugging

  description text not null,
  -- Full raw description from source document
  -- No parsing or transformation to avoid data loss

  node_type public.schedule_node_type not null,
  -- Structural role of node (section, group, item)

  unit_id uuid references public.units(id),
  -- Reference to base unit (sqm, cum, etc.)
  -- Null for non-leaf/group nodes

  derived_unit_id uuid references public.derived_units(id),
  -- Used for composite units (e.g., litre/sqm)
  -- Mutually exclusive with unit_id

  check (
    (unit_id is null and derived_unit_id is null) or
    (unit_id is not null and derived_unit_id is null) or
    (unit_id is null and derived_unit_id is not null)
  ),
  -- Enforces: at most one of unit_id or derived_unit_id can be set

  rate numeric,
  -- Base monetary rate for leaf items; null for section/group nodes
  -- Contextual rate overrides live in schedule_item_rates

  check (
    (node_type = 'item' and rate is not null)
    or (node_type != 'item')
  ),
  -- Enforces: leaf items must have a rate; non-leaf nodes may have null rate

  check (
    (parent_item_id is null and node_type = 'section')
    or (parent_item_id is not null)
  ),
  -- Enforces: root-level nodes must be sections; prevents accidental items/groups at root

  item_type text default 'base',
  -- Semantic classification (e.g., base, extra, modifier)
  -- Kept as text, not enum — classification semantics vary across sources
  -- and will evolve; populated later, not during ingestion

  order_index int,
  -- Maintains original ordering from source document
  -- Important for UI rendering consistency

  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(description, '') || ' ' || coalesce(code, ''))
  ) stored,
  -- Auto-generated full-text search index on description and code
  -- Uses 'simple' config: no stemming, handles mixed technical terms (RCC, PCC, etc.)

  ingestion_batch_id uuid,
  -- Links item to the ingestion run that created it
  -- Useful for debugging, rollback, and tracing data lineage

  source_page_number int,
  -- Page number in the source PDF where this item appears
  -- Helps with verification and debugging

  status public.record_status default 'active',
  -- Controls visibility and usability of item
  -- Enables soft deletion and corrections

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(schedule_source_version_id, parent_item_id, code)
  -- Prevents duplicate codes within same parent
  -- Scoped to parent because DSRs can reuse codes across sections/annexures
);
```

---

## public.schedule_item_rates

```sql
-- Stores multiple contextual rate overrides for a single item
-- The base rate lives on schedule_items.rate; this table holds variations
create table public.schedule_item_rates (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for rate entry

  schedule_item_id uuid not null
    references public.schedule_items(id) on delete cascade,
  -- Associated item

  context text not null,
  -- Context defining rate variation (e.g., "1km lead", "above plinth")

  rate numeric not null,
  -- Rate applicable under given context

  created_at timestamptz default now(),

  unique(schedule_item_id, context)
  -- Prevents duplicate contexts per item
);
```

---

## public.schedule_item_conditions

```sql
-- Stores textual conditions associated with items
create table public.schedule_item_conditions (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for condition

  schedule_item_id uuid not null
    references public.schedule_items(id) on delete cascade,
  -- Associated item

  raw_condition text not null,
  -- Condition text exactly as written in source
  -- No parsing to preserve accuracy

  order_index int,
  -- Preserves original document ordering

  created_at timestamptz default now()
);
```

---

## public.units

```sql
-- Defines measurement units and conversion rules
create table public.units (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for unit

  name text not null,
  -- Internal identifier (e.g., "square_meter")

  display_name text not null,
  -- Human-readable label (e.g., "Square Meter")

  symbol text not null,
  -- Standard symbol (sqm, m, kg)

  dimension text not null,
  -- Physical dimension (length, area, volume, mass)
  -- Used for validation and compatibility

  is_base boolean default false,
  -- Indicates base unit of dimension

  conversion_factor numeric not null,
  -- Multiplier to convert value into base unit

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(symbol),
  unique(name)
);
```

---

## public.derived_units

```sql
-- Represents composite/derived units (e.g., litre per sqm)
create table public.derived_units (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for derived unit

  name text not null,
  -- Internal identifier (e.g., "litre_per_sqm")

  display_name text not null,
  -- Human-readable name

  numerator_unit_id uuid references public.units(id),
  -- Unit in numerator

  denominator_unit_id uuid references public.units(id),
  -- Unit in denominator

  multiplier numeric default 1,
  -- Scaling factor (e.g., litre per 10 sqm)

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(name)
);
```

---

## public.attributes

```sql
-- Defines attribute types attachable to items
-- Schema created now; data populated later via AI extraction or manual entry, not during PDF ingestion
create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier

  name text not null,
  -- Internal identifier (e.g., "thickness")

  display_name text not null,
  -- Human-readable label

  data_type text not null,
  -- Data type (number, text)

  dimension text,
  -- Optional dimension for unit validation

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(name)
);
```

---

## public.attribute_values

```sql
-- Stores actual attribute values
create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier

  attribute_id uuid not null references public.attributes(id) on delete cascade,
  -- Associated attribute definition

  value_text text,
  -- Used for textual values

  value_number numeric,
  -- Used for numeric values

  unit_id uuid references public.units(id),
  -- Unit for numeric values

  normalized_value numeric,
  -- Value converted into base unit

  normalized_unit_id uuid references public.units(id),
  -- Base unit reference

  created_at timestamptz default now()
);
```

---

## public.schedule_item_attributes

```sql
-- Maps attributes to schedule items
-- Populated post-ingestion via AI parsing or manual tagging
create table public.schedule_item_attributes (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier

  schedule_item_id uuid not null
    references public.schedule_items(id) on delete cascade,
  -- Target item

  attribute_value_id uuid not null
    references public.attribute_values(id) on delete cascade,
  -- Associated attribute value

  source text default 'manual',
  -- Origin of data (manual, ai, import)

  confidence numeric default 1.0,
  -- Confidence score for value (1.0 = certain, lower = estimated)

  created_by uuid,
  -- User who created entry

  status public.record_status default 'active',
  -- Controls visibility; uses record_status for consistency

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## ltree Path Trigger

```sql
-- Converts a UUID to a 12-char hex string safe for ltree labels
-- 12 hex chars = 48 bits of entropy, collision-free within any realistic dataset
create or replace function public.uuid_to_short_id(uid uuid)
returns text
language sql immutable
as $$
  select substr(replace(uid::text, '-', ''), 1, 12);
$$;

-- Auto-computes the ltree path from parent chain using short hex IDs
-- Also auto-generates the slug from the code if not provided
create or replace function public.compute_schedule_item_path()
returns trigger
language plpgsql
as $$
declare
  parent_path ltree;
  short_id text;
begin
  short_id := public.uuid_to_short_id(new.id);

  -- Auto-generate slug from code if not explicitly set
  if new.slug is null or new.slug = '' then
    new.slug := regexp_replace(lower(new.code), '[^a-z0-9]+', '_', 'g');
    new.slug := trim(both '_' from new.slug);
  end if;

  if new.parent_item_id is null then
    new.path := text2ltree(short_id);
  else
    select si.path into parent_path
    from public.schedule_items si
    where si.id = new.parent_item_id;

    if parent_path is null then
      raise exception 'Parent item % not found', new.parent_item_id;
    end if;

    new.path := parent_path || text2ltree(short_id);
  end if;

  return new;
end;
$$;

create trigger trg_compute_path
  before insert or update of parent_item_id
  on public.schedule_items
  for each row execute function public.compute_schedule_item_path();
```

---

## updated_at Triggers

```sql
create trigger set_updated_at before update on public.schedule_sources
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.schedule_source_versions
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.schedule_items
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.units
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.derived_units
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.attributes
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.schedule_item_attributes
  for each row execute function public.handle_updated_at();
```

> `public.handle_updated_at()` is defined in the auth schema migration.

---

## Audit Triggers

```sql
create trigger audit_schedule_sources
  after insert or update or delete on public.schedule_sources
  for each row execute function private.capture_audit_log();

create trigger audit_schedule_source_versions
  after insert or update or delete on public.schedule_source_versions
  for each row execute function private.capture_audit_log();
```

> `private.capture_audit_log()` is defined in the auth schema migration. Only sources and versions are audited; individual items are bulk-ingested and not audit-tracked.

---

## Indexes

```sql
-- ltree hierarchy (GiST for @>, <@, ~; btree for sorting)
create index idx_schedule_items_path_gist on public.schedule_items using gist(path);
create index idx_schedule_items_path_btree on public.schedule_items using btree(path);

-- Adjacency list traversal
create index idx_schedule_items_parent on public.schedule_items(parent_item_id);

-- Version filtering
create index idx_schedule_items_version on public.schedule_items(schedule_source_version_id);

-- Full-text search
create index idx_schedule_items_search on public.schedule_items using gin(search_vector);

-- Active items only (most queries filter by active status)
create index idx_schedule_items_active
  on public.schedule_items(schedule_source_version_id)
  where status = 'active';

-- Root-level node lookup per version
create index idx_schedule_items_roots
  on public.schedule_items(schedule_source_version_id)
  where parent_item_id is null;

-- Ingestion batch tracing
create index idx_schedule_items_batch on public.schedule_items(ingestion_batch_id)
  where ingestion_batch_id is not null;

-- Rate lookup
create index idx_schedule_item_rates_item on public.schedule_item_rates(schedule_item_id);

-- Condition lookup
create index idx_schedule_item_conditions_item on public.schedule_item_conditions(schedule_item_id);

-- Attribute joins
create index idx_schedule_item_attributes_item on public.schedule_item_attributes(schedule_item_id);
```

---

## RLS Policies

```sql
alter table public.schedule_sources enable row level security;
alter table public.schedule_source_versions enable row level security;
alter table public.schedule_items enable row level security;
alter table public.schedule_item_rates enable row level security;
alter table public.schedule_item_conditions enable row level security;
alter table public.units enable row level security;
alter table public.derived_units enable row level security;
alter table public.attributes enable row level security;
alter table public.attribute_values enable row level security;
alter table public.schedule_item_attributes enable row level security;

-- Read access: all authenticated users with valid session
-- Write access: system admins or users with schedules.manage permission

-- schedule_sources
create policy "schedule_sources_select" on public.schedule_sources
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_sources_insert" on public.schedule_sources
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_sources_update" on public.schedule_sources
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_sources_delete" on public.schedule_sources
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- schedule_source_versions
create policy "schedule_source_versions_select" on public.schedule_source_versions
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_source_versions_insert" on public.schedule_source_versions
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_source_versions_update" on public.schedule_source_versions
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_source_versions_delete" on public.schedule_source_versions
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- schedule_items (read-only for most users, writable by schedule managers)
create policy "schedule_items_select" on public.schedule_items
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_items_insert" on public.schedule_items
  for insert to authenticated
  with check (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_items_update" on public.schedule_items
  for update to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_items_delete" on public.schedule_items
  for delete to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- schedule_item_rates
create policy "schedule_item_rates_select" on public.schedule_item_rates
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_item_rates_modify" on public.schedule_item_rates
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

-- schedule_item_conditions
create policy "schedule_item_conditions_select" on public.schedule_item_conditions
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_item_conditions_modify" on public.schedule_item_conditions
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

-- units / derived_units (read-only for all, writable by system admin)
create policy "units_select" on public.units
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "units_modify" on public.units
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

create policy "derived_units_select" on public.derived_units
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "derived_units_modify" on public.derived_units
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and authz.is_system_admin()
  );

-- attributes / attribute_values / schedule_item_attributes
create policy "attributes_select" on public.attributes
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "attributes_modify" on public.attributes
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "attribute_values_select" on public.attribute_values
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "attribute_values_modify" on public.attribute_values
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );

create policy "schedule_item_attributes_select" on public.schedule_item_attributes
  for select to authenticated
  using (authz.is_session_valid() and not authz.is_account_locked());

create policy "schedule_item_attributes_modify" on public.schedule_item_attributes
  for all to authenticated
  using (
    authz.is_session_valid() and not authz.is_account_locked()
    and (authz.is_system_admin() or authz.has_permission('schedules.manage'))
  );
```

---

## Example Queries

### Get full subtree under a node (by its ID)

```sql
select * from public.schedule_items
where path <@ (select path from public.schedule_items where id = $1)
  and schedule_source_version_id = $2
order by path;
```

### Get all ancestors of an item (breadcrumb trail)

```sql
select id, code, slug, description, nlevel(path) as depth
from public.schedule_items
where path @> (select path from public.schedule_items where id = $1)
order by nlevel(path);
```

### Get direct children of a node

```sql
select * from public.schedule_items
where parent_item_id = $1
order by order_index;
```

### Get depth of any node

```sql
select nlevel(path) as depth from public.schedule_items where id = $1;
```

### Full-text search

```sql
select id, code, slug, description, ts_rank(search_vector, q) as rank
from public.schedule_items, to_tsquery('english', 'cement & concrete') q
where search_vector @@ q
  and schedule_source_version_id = $1
order by rank desc
limit 20;
```

---

## Permissions

The following permissions should be seeded into `authz.permissions`:

```sql
insert into authz.permissions (key, description) values
  ('schedules.read', 'View schedule of rates data'),
  ('schedules.manage', 'Create, update, and manage schedule data');
```

> `schedules.read` is implicit -- all authenticated users can read. It exists for future granularity if needed. `schedules.manage` controls write access. Delete of sources/versions is restricted to system admins.

---

## Final Principle

> Store structure now, derive intelligence later.
