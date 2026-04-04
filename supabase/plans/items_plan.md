# Schedule of Rates Architecture & Schema

## Overview

This schema is designed to:

- Store schedule of rates (CPWD, PWD, private)
- Preserve raw data exactly as source (no parsing assumptions)
- Support hierarchical structure (section → group → item)
- Enable future intelligence (attributes, BOQ, AI)
- Remain extensible (ltree, analytics, multi-source support)

---

## Architecture

```
schedule_sources
  ↓
schedule_source_versions
  ↓
schedule_items (hierarchy)
  ↓
schedule_item_rates
schedule_item_conditions

units / derived_units

attributes / attribute_values / schedule_item_attributes
```

---

## ENUM: record_status

```sql
-- Lifecycle state used across core entities
create type record_status as enum (
  'active',      -- Default usable state; included in UI and queries
  'inactive',    -- Temporarily disabled; hidden but retained
  'deprecated'   -- Obsolete; retained for audit/reference but not for new usage
);
```

---

## schedule_sources

```sql
-- Represents a publisher of schedule of rates (e.g., CPWD, State PWD)
create table schedule_sources (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for each source

  name text not null,
  -- Stable internal identifier (e.g., "cpwd")
  -- Used in APIs, integrations, and should remain immutable

  display_name text not null,
  -- Human-readable name (e.g., "Central Public Works Department")
  -- Used in UI and reports

  type text,
  -- Classification such as 'govt' or 'private'
  -- Enables filtering and grouping of sources

  status record_status default 'active',
  -- Controls availability of entire source
  -- If inactive, all versions/items under it should be treated as unusable

  created_at timestamptz default now(),
  -- Timestamp for audit/logging

  unique(name)
  -- Ensures no duplicate internal identifiers
);
```

---

## schedule_source_versions

```sql
-- Represents a specific version of a schedule (e.g., DSR 2023)
create table schedule_source_versions (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for version

  schedule_source_id uuid not null references schedule_sources(id) on delete cascade,
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

  status record_status default 'active',
  -- Controls which version is currently usable
  -- Typically only one active version per source

  created_at timestamptz default now(),

  unique(schedule_source_id, name)
  -- Prevents duplicate versions under same source
);
```

---

## schedule_items

```sql
-- Core table representing hierarchical schedule entries
create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for each node

  schedule_source_version_id uuid not null references schedule_source_versions(id) on delete cascade,
  -- Associates item with a specific schedule version

  parent_item_id uuid references schedule_items(id) on delete cascade,
  -- Self-referencing key to build tree hierarchy
  -- Enables parent-child relationships

  code text not null,
  -- Original code from schedule (e.g., "13.24.1")
  -- Stored as-is for traceability and debugging

  description text not null,
  -- Full raw description from source document
  -- No parsing or transformation to avoid data loss

  node_type text not null,
  -- Structural role of node:
  -- 'section' → top-level category
  -- 'group'   → intermediate grouping node
  -- 'item'    → leaf node with actual rate

  unit_id uuid references units(id),
  -- Reference to base unit (sqm, cum, etc.)
  -- Null for non-leaf/group nodes

  is_derived_unit boolean default false,
  -- Indicates whether unit comes from derived_units

  derived_unit_id uuid references derived_units(id),
  -- Used for composite units (e.g., litre/sqm)

  rate numeric,
  -- Monetary value of item
  -- Null for non-leaf nodes

  item_type text default 'base',
  -- Reserved for future semantic classification (e.g., extra, modifier)
  -- Not used during ingestion to avoid assumptions

  order_index int,
  -- Maintains original ordering from source document
  -- Important for UI rendering consistency

  depth int,
  -- Hierarchy level (1 = root, increasing downwards)
  -- Helps with querying and future ltree migration

  status record_status default 'active',
  -- Controls visibility and usability of item
  -- Enables soft deletion and corrections

  created_at timestamptz default now(),

  unique(schedule_source_version_id, code)
  -- Prevents duplicate codes within same version
);
```

---

## schedule_item_rates

```sql
-- Stores multiple contextual rates for a single item
create table schedule_item_rates (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for rate entry

  schedule_item_id uuid not null references schedule_items(id) on delete cascade,
  -- Associated item

  context text not null,
  -- Context defining rate variation (e.g., "1km", "above plinth")

  rate numeric not null,
  -- Rate applicable under given context

  created_at timestamptz default now()
);
```

---

## schedule_item_conditions

```sql
-- Stores textual conditions associated with items
create table schedule_item_conditions (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for condition

  schedule_item_id uuid not null references schedule_items(id) on delete cascade,
  -- Associated item

  raw_condition text not null,
  -- Condition text exactly as written in source
  -- No parsing to preserve accuracy

  created_at timestamptz default now()
);
```

---

## units

```sql
-- Defines measurement units and conversion rules
create table units (
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

  unique(symbol),
  unique(name)
);
```

---

## derived_units

```sql
-- Represents composite/derived units
create table derived_units (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier for derived unit

  name text not null,
  -- Internal identifier (e.g., "litre_per_sqm")

  display_name text not null,
  -- Human-readable name

  numerator_unit_id uuid references units(id),
  -- Unit in numerator

  denominator_unit_id uuid references units(id),
  -- Unit in denominator

  multiplier numeric default 1,
  -- Scaling factor (e.g., litre per 10 sqm)

  created_at timestamptz default now(),

  unique(name)
);
```

---

## attributes

```sql
-- Defines attribute types attachable to items
create table attributes (
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

  unique(name)
);
```

---

## attribute_values

```sql
-- Stores actual attribute values
create table attribute_values (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier

  attribute_id uuid not null references attributes(id) on delete cascade,
  -- Associated attribute definition

  value_text text,
  -- Used for textual values

  value_number numeric,
  -- Used for numeric values

  unit_id uuid references units(id),
  -- Unit for numeric values

  normalized_value numeric,
  -- Value converted into base unit

  normalized_unit_id uuid references units(id),
  -- Base unit reference

  created_at timestamptz default now()
);
```

---

## schedule_item_attributes

```sql
-- Maps attributes to schedule items
create table schedule_item_attributes (
  id uuid primary key default gen_random_uuid(),
  -- Unique identifier

  schedule_item_id uuid not null references schedule_items(id) on delete cascade,
  -- Target item

  attribute_value_id uuid not null references attribute_values(id) on delete cascade,
  -- Associated attribute value

  source text default 'manual',
  -- Origin of data (manual, ai, import)

  confidence numeric default 1.0,
  -- Confidence score for value

  created_by uuid,
  -- User who created entry

  created_at timestamptz default now(),

  is_active boolean default true
  -- Allows versioning and soft deactivation
);
```

---

## Indexes

```sql
-- Optimizes hierarchy traversal
create index idx_schedule_items_parent on schedule_items(parent_item_id);

-- Optimizes filtering by version
create index idx_schedule_items_version on schedule_items(schedule_source_version_id);

-- Optimizes rate lookup
create index idx_schedule_item_rates_item on schedule_item_rates(schedule_item_id);

-- Optimizes condition lookup
create index idx_schedule_item_conditions_item on schedule_item_conditions(schedule_item_id);

-- Optimizes attribute joins
create index idx_schedule_item_attributes_item on schedule_item_attributes(schedule_item_id);
```

---

## Final Principle

> Store structure now, derive intelligence later.
