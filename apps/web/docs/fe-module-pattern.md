# Frontend feature module pattern

Generic blueprint for new or refactored areas under `apps/web/app/(app)/`.  
**Reference implementation:** `app/(app)/basic-rates/` (API, hooks, table, drawer, filters, mutations).

Align with workspace rules in `.cursor/rules/code-guide-rules.mdc` (TanStack Query, Shadcn, Zustand where needed, RHF, no inline JSX logic, loading via `Spinner`, etc.).

---

## 1. Folder layout

Place everything for one domain in one route segment:

```text
app/(app)/{feature}/
  page.tsx                 # Thin: Suspense + shell, delegates to main component
  api/
    {entity}-api.ts        # Supabase fetchers + domain types + list params
    {related}-api.ts       # Optional: small related tables (e.g. type options)
  hooks/
    use-{entity}-query.ts  # List/infinite query + query keys + invalidation helper
    use-{entity}-mutations.ts
    use-{related}-query.ts # Optional: separate hook file per concern
  components/
    {feature}-table.tsx
    {feature}-columns.tsx
    {feature}-filters.tsx
    {feature}-drawer.tsx   # Or modal; same principles
```

- **Do not** put React hooks inside `api/` — API files are plain async functions + types.
- **Prefer** several small hooks over one “god” hook file once the domain grows.

---

## 2. API layer (`api/*.ts`)

### Responsibilities

- Import `SupabaseClient<Database>` and `@kkm/db` types.
- Export **fetchers** (e.g. `fetchX`, `createX`, `updateX`, `deleteX`) and **types** used by hooks and UI (`X`, `XListParams`, `CreateXInput`, `UpdateXInput`).
- Accept optional `AbortSignal` and pass it to the query builder (`abortSignal(signal)`).

### Errors

After every Supabase call, normalize errors so callers always get a standard `Error` with a useful message and `cause` preserved for code-based handling:

```ts
import { normalizeError } from '@/lib/supabase/errors';

const { data, error } = await query;
if (error) {
  throw normalizeError(error);
}
```

### Pagination / list response

- Today’s list modules may use **offset pages** or **`useInfiniteQuery`** with `page` / `hasNext` from the API. Prefer returning a **stable shape** (`data`, `totalCount`, `page`, `pageSize`, `hasNext`, …) from the fetcher.
- For **new** high-volume lists, prefer **cursor-based** pagination and deterministic sort keys (workspace standard); document the chosen strategy in the fetcher’s JSDoc.

---

## 3. TanStack Query (`hooks/`)

### Query key prefix

Define a **readonly tuple prefix** shared by all queries for that feature, e.g. `['widgets'] as const`, and build keys from list params:

```ts
function widgetsQueryKey(params: WidgetsListParams) {
  return [...WIDGET_QUERY_KEY_PREFIX, 'list', params] as const;
}
```

Export the prefix and any **table id** constants (`WIDGETS_TABLE_ID`) used by `useDataTableControls`.

### List query hook

- `useQuery` or `useInfiniteQuery` with `queryFn` that calls the API with `createSupabaseBrowserClient()` and `signal` from the query context.
- Map **filters / sorting / search** from the table controls into a **serializable** `*ListParams` object in `useMemo` (stable query keys).
- Export **`invalidateWidgetQueryCache(queryClient)`** (or equivalent) that invalidates every query key under the prefix that must refresh after writes, plus any **cross-feature** invalidations (e.g. distinct-units elsewhere).

### Mutations hook file

- One `useMutation` per verb (`useCreateX`, `useUpdateX`, `useDeleteX`).
- `mutationFn` calls API with the browser Supabase client.
- **`onSettled`**: call the shared invalidation helper so list + options stay in sync.
- Use **`toast`** for success/error in mutations (or centralize in a shared helper if you add one later).

### Auxiliary queries

Separate files/hooks for option lists (`useWidgetCategoriesQuery`) with their own keys under the same prefix or a dedicated sub-key, and **staleTime** appropriate to freshness (e.g. long for rare-changing enums).

---

## 4. Page shell (`page.tsx`)

- Keep **minimal**: layout wrapper, `Suspense` with a table loading fallback, render the main table/container component.
- Heavy data and interactions live in **client** child components (`'use client'`).

---

## 5. Table UI

- **`DataTable`** + **`useDataTableControls(TABLE_ID, defaultFilters)`** for search, filters, sorting, persisted UI state.
- **`getColumns`** in `*-columns.tsx`: pure function returning column defs; inject callbacks via closure or refs if you must avoid unstable columns (see basic-rates delete ref pattern).
- **`get*FilterFields`** in `*-filters.tsx`: map filter definitions to options loaded from hooks.
- **Auth / CASL**: gate actions in the table (e.g. hide create, force read-only drawer) with `useAuth` / `ability.can(...)`.
- **Errors**: render **`TableErrorState`** with retry when the list query fails.
- **Loading**: prefer shared table loading / skeleton patterns; avoid raw `"Loading..."` text where the design system specifies `Spinner` or skeletons.

---

## 6. Destructive or irreversible actions

Use **`useConfirmationDialog`** from `@/hooks/use-confirmation-dialog` (not delete-specific naming in new code). Pass payload with `onConfirm`, optional `title` / `description` / `confirmText` / `variant` / `itemName` / `itemCount`, and wire **`DeleteConfirmationDialog`** or a future generic dialog component.

---

## 7. Create / edit drawer (forms)

- **`useAppForm`** with `submitMode: 'edit' | 'create'`, `zodResolver`, and **Zod** schema colocated with the drawer.
- Rely on **`useAppForm` defaults**: React Hook Form **`mode: 'all'`** and, in edit mode, **empty patch →** `toast.message('No changes to save')` unless you override `onEmptyPatch`.
- **`onCreate`**: full payload to create mutation.
- **`onPatch`**: receive dirty patch from `useAppForm`; coerce types (e.g. string → number) before calling update mutation; guard missing parent id.
- **Select fields**: store **foreign key ids** in the form (`value` = id, `label` for display). Do not duplicate display names as the persisted value unless the schema has a denormalized text column.
- Reuse **`FormInputField`**, **`FormSelectField`**, drawer shell components (`DrawerWrapper`, `FormDrawerHeader`, etc.).
- **`useOpenClose`** (or equivalent) for drawer open state and `create | edit | read` mode.

---

## 8. Imports and boundaries

- Hooks import from **`../api/...`** within the same feature.
- Shared utilities: `@/lib/...`, `@/hooks/...`, `@/components/...`.
- Do **not** circular-import `api` from `hooks` that re-export into `api`.

---

## 9. Checklist for a new module

1. [ ] `api/{entity}-api.ts` — types, CRUD/list fetchers, `normalizeError`, `AbortSignal`.
2. [ ] `hooks/use-{entity}-query.ts` — key prefix, list hook, `invalidate*QueryCache`.
3. [ ] `hooks/use-{entity}-mutations.ts` — create / update / delete + invalidation.
4. [ ] `page.tsx` — Suspense + main component.
5. [ ] `components/*-table.tsx` — DataTable, controls, errors, optional confirmation dialog.
6. [ ] `components/*-columns.tsx` / `*-filters.tsx` — keep presentational logic thin.
7. [ ] `components/*-drawer.tsx` — Zod + `useAppForm`, mutations, read-only mode if needed.
8. [ ] Wire **ability** checks and empty states consistent with the rest of the app.

---

## 10. Optional: Cursor / team visibility

Project rule reference: `.cursor/rules/fe-module-pattern.mdc` points agents at this document when working on feature modules under `apps/web`.
