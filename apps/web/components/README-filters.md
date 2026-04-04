# DataTable Filtering System

A comprehensive and reusable filtering system for the DataTable component that supports multiple filter types and is easily configurable for different data tables.

## Features

- **Multiple Filter Types**: Text, Select, Multi-select, Number range, and Date range filters
- **Reusable Components**: Easy to use across different data tables
- **Active Filter Display**: Visual representation of applied filters with clear options
- **Responsive Design**: Works well on mobile and desktop
- **TypeScript Support**: Fully typed for better development experience

## Filter Types

### 1. Text Filter

```typescript
{
  id: "name",
  label: "Name",
  type: "text",
  placeholder: "Search by name...",
}
```

- Provides a search input with clear button
- Performs case-insensitive text matching
- Ideal for string fields like names, descriptions, etc.

### 2. Select Filter

```typescript
{
  id: "status",
  label: "Status",
  type: "select",
  placeholder: "Select status",
  options: [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ],
}
```

- Single selection dropdown
- Perfect for enum-like fields
- Shows clear button when value is selected

### 3. Multi-select Filter

```typescript
{
  id: "tags",
  label: "Tags",
  type: "multiselect",
  placeholder: "Select tags",
  options: [
    { label: "React", value: "react" },
    { label: "TypeScript", value: "typescript" },
  ],
}
```

- Multiple selection with checkboxes
- Shows count of selected items
- Ideal for array fields or multiple categories

### 4. Number Filter

```typescript
{
  id: "amount",
  label: "Amount",
  type: "number",
  placeholder: "Filter by amount",
}
```

- Min/Max range input
- Perfect for numeric fields like prices, quantities, etc.
- Supports partial ranges (min only, max only, or both)

### 5. Date Filter

```typescript
{
  id: "createdAt",
  label: "Created Date",
  type: "date",
  placeholder: "Filter by creation date",
}
```

- Date range picker (from/to)
- Ideal for date fields
- Supports partial ranges

## Usage

### Basic Setup

```typescript
import { DataTable } from "@/components/data-table";
import { BaseFilter } from "@/components/ui/filter-components";

const filters: BaseFilter[] = [
  {
    id: "name",
    label: "Name",
    type: "text",
    placeholder: "Search by name...",
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

function MyTable() {
  return (
    <DataTable
      data={myData}
      columns={myColumns}
      tabs={myTabs}
      filters={filters}
      searchPlaceholder="Search items..."
      searchColumn="name"
    />
  );
}
```

### Advanced Configuration

```typescript
const advancedFilters: BaseFilter[] = [
  // Text search
  {
    id: 'description',
    label: 'Description',
    type: 'text',
    placeholder: 'Search descriptions...',
  },

  // Single select
  {
    id: 'category',
    label: 'Category',
    type: 'select',
    placeholder: 'Select category',
    options: categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
    })),
  },

  // Multi-select
  {
    id: 'tags',
    label: 'Tags',
    type: 'multiselect',
    placeholder: 'Select tags',
    options: availableTags.map((tag) => ({
      label: tag.name,
      value: tag.id,
    })),
  },

  // Number range
  {
    id: 'price',
    label: 'Price',
    type: 'number',
    placeholder: 'Filter by price',
  },

  // Date range
  {
    id: 'createdAt',
    label: 'Created Date',
    type: 'date',
    placeholder: 'Filter by creation date',
  },
];
```

## DataTable Props

| Prop                | Type           | Default               | Description                                                              |
| ------------------- | -------------- | --------------------- | ------------------------------------------------------------------------ |
| `filters`           | `BaseFilter[]` | `undefined`           | Array of filter configurations                                           |
| `searchPlaceholder` | `string`       | `"Filter by name..."` | Placeholder text for search input                                        |
| `searchColumn`      | `string`       | `"name"`              | Column to search in                                                      |
| `showFiltersInline` | `boolean`      | `false`               | Show filters inline next to search bar instead of in collapsible section |

## Filter Configuration

### BaseFilter Interface

```typescript
interface BaseFilter {
  id: string; // Unique identifier (should match data field)
  label: string; // Display label
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
  placeholder?: string; // Placeholder text
  options?: Array<{
    // Required for select/multiselect
    label: string;
    value: string;
  }>;
  multiple?: boolean; // For multiselect (auto-detected from type)
}
```

## Data Requirements

Your data items should have properties that match the filter `id` values. For example:

```typescript
interface MyData {
  id: string;
  name: string; // matches filter id "name"
  status: string; // matches filter id "status"
  tags: string[]; // matches filter id "tags"
  price: number; // matches filter id "price"
  createdAt: string; // matches filter id "createdAt"
}
```

## Styling

The filter components use Tailwind CSS classes and follow the design system. They automatically adapt to light/dark themes and are responsive.

## Inline Filters

When you have a small number of filters and want to display them directly next to the search bar, you can use the `showFiltersInline` prop:

```typescript
<DataTable
  dataTable={dataTable}
  filters={filters}
  showFiltersInline={true}
  searchPlaceholder="Search items..."
  searchColumn="name"
/>
```

### Inline Filter Behavior

- **Desktop (lg and up)**: Filters are displayed inline next to the search bar
- **Mobile**: Traditional filter button is shown instead (filters remain collapsible)
- **Responsive**: Automatically switches between inline and collapsible modes based on screen size
- **Space Efficient**: Perfect for tables with 2-4 filters that don't take up too much horizontal space

### When to Use Inline Filters

- ✅ **Good for**: 2-4 simple filters (text, select)
- ✅ **Good for**: Tables where filters are frequently used
- ✅ **Good for**: Desktop-focused applications
- ❌ **Avoid for**: Complex filters (date ranges, multi-select with many options)
- ❌ **Avoid for**: Tables with many filters (5+ filters)

## Examples

See the DataTable component usage in the application for examples of both traditional and inline filter modes.

## Performance

- Filters are applied client-side using React.useMemo for optimal performance
- Large datasets should consider implementing server-side filtering
- The filtering system is designed to be efficient with typical table sizes (hundreds to low thousands of rows)

## Accessibility

- All filter components include proper ARIA labels
- Keyboard navigation is supported
- Screen reader friendly
- Clear visual indicators for active filters
