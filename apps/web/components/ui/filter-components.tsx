"use client";

import * as React from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "./date-range-filter";

// Base filter interface
export interface BaseFilter {
  id: string;
  label: string;
  type: "text" | "select" | "multiselect" | "date" | "daterange" | "number";
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  multiple?: boolean;
}

// Text filter component
export const TextFilter = React.memo(
  ({
    filter,
    value,
    onChange,
    onClear,
  }: {
    filter: BaseFilter;
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
  }) => {
    return (
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={
            filter.placeholder || `Filter by ${filter.label.toLowerCase()}...`
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-8"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={onClear}
          >
            <IconX className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }
);

TextFilter.displayName = "TextFilter";

// Select filter component
export const SelectFilter = React.memo(
  ({
    filter,
    value,
    onChange,
    onClear,
  }: {
    filter: BaseFilter;
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
  }) => {
    return (
      <div className="relative">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            className={`w-[160px] transition-all duration-200 ${
              value ? "pr-8" : ""
            }`}
          >
            <SelectValue
              placeholder={
                filter.placeholder || `Select ${filter.label.toLowerCase()}`
              }
            />
          </SelectTrigger>
          <SelectContent>
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center transition-all duration-200 ${
            value ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClear}
          >
            <IconX className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
);

SelectFilter.displayName = "SelectFilter";

// Multi-select filter component
export const MultiSelectFilter = React.memo(
  ({
    filter,
    value,
    onChange,
    onClear,
  }: {
    filter: BaseFilter;
    value: string[];
    onChange: (value: string[]) => void;
    onClear: () => void;
  }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleToggleOption = (optionValue: string) => {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    };

    const selectedOptions =
      filter.options?.filter((option) => value.includes(option.value)) || [];

    return (
      <div className="relative">
        <Button
          variant="outline"
          className="w-[180px] justify-start"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOptions.length === 0
            ? filter.placeholder || `Select ${filter.label.toLowerCase()}`
            : `${selectedOptions.length} selected`}
        </Button>

        {isOpen && (
          <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
            <div className="max-h-60 overflow-auto p-1">
              {filter.options?.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => handleToggleOption(option.value)}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    onChange={() => {}}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
            {value.length > 0 && (
              <div className="border-t p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onClear}
                >
                  <IconX className="mr-2 h-3 w-3" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}

        {value.length > 0 && (
          <div className="absolute -top-2 -right-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-5 w-5 rounded-full p-0"
              onClick={onClear}
            >
              <IconX className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

MultiSelectFilter.displayName = "MultiSelectFilter";

// Number filter component
export const NumberFilter = React.memo(
  ({
    value,
    onChange,
    onClear,
  }: {
    filter: BaseFilter;
    value: { min?: number; max?: number };
    onChange: (value: { min?: number; max?: number }) => void;
    onClear: () => void;
  }) => {
    const hasValue = value.min !== undefined || value.max !== undefined;

    return (
      <div
        className={`relative flex items-center gap-2 ${hasValue ? "pr-8" : ""}`}
      >
        <Input
          type="number"
          placeholder="Min"
          value={value.min || ""}
          onChange={(e) =>
            onChange({
              ...value,
              min: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-16"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max"
          value={value.max || ""}
          onChange={(e) =>
            onChange({
              ...value,
              max: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-16"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 transition-all duration-200 ${
              hasValue
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75 pointer-events-none"
            }`}
            onClick={onClear}
          >
            <IconX className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
);

NumberFilter.displayName = "NumberFilter";

// Date filter component
export const DateFilter = React.memo(
  ({
    value,
    onChange,
    onClear,
  }: {
    filter: BaseFilter;
    value: { from?: string; to?: string };
    onChange: (value: { from?: string; to?: string }) => void;
    onClear: () => void;
  }) => {
    const hasValue = value.from || value.to;

    return (
      <div
        className={`relative flex items-center gap-2 ${hasValue ? "pr-8" : ""}`}
      >
        <Input
          type="date"
          placeholder="From"
          value={value.from || ""}
          onChange={(e) =>
            onChange({
              ...value,
              from: e.target.value || undefined,
            })
          }
          className="w-28"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="date"
          placeholder="To"
          value={value.to || ""}
          onChange={(e) =>
            onChange({
              ...value,
              to: e.target.value || undefined,
            })
          }
          className="w-28"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 transition-all duration-200 ${
              hasValue
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75 pointer-events-none"
            }`}
            onClick={onClear}
          >
            <IconX className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
);

DateFilter.displayName = "DateFilter";

// Date range filter component
export const DateRangeFilterComponent = React.memo(
  ({
    filter,
    value,
    onChange,
    onClear,
  }: {
    filter: BaseFilter;
    value: { from?: string; to?: string };
    onChange: (value: { from?: string; to?: string }) => void;
    onClear: () => void;
  }) => {
    return (
      <DateRangeFilter
        value={value}
        onChange={onChange}
        onClear={onClear}
        placeholder={
          filter.placeholder || `Select ${filter.label.toLowerCase()} range`
        }
      />
    );
  }
);

DateRangeFilterComponent.displayName = "DateRangeFilterComponent";

// Active filters display component
export const ActiveFilters = React.memo(
  ({
    filters,
    onClearFilter,
    onClearAll,
  }: {
    filters: Array<{
      id: string;
      label: string;
      value:
        | string
        | string[]
        | { min?: number; max?: number }
        | { from?: string; to?: string };
      type: string;
    }>;
    onClearFilter: (filterId: string) => void;
    onClearAll: () => void;
  }) => {
    if (filters.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Active filters:</span>
        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant="secondary"
            className="flex items-center gap-1"
          >
            <span className="text-xs">
              {filter.label}: {getFilterDisplayValue(filter.value, filter.type)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter(filter.id)}
            >
              <IconX className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      </div>
    );
  }
);

ActiveFilters.displayName = "ActiveFilters";

// Helper function to display filter values
function getFilterDisplayValue(
  value:
    | string
    | string[]
    | { min?: number; max?: number }
    | { from?: string; to?: string },
  type: string
): string {
  switch (type) {
    case "multiselect":
      return Array.isArray(value) ? value.join(", ") : "";
    case "number":
      if (typeof value === "object" && value !== null && "min" in value) {
        const { min, max } = value as { min?: number; max?: number };
        if (min !== undefined && max !== undefined) {
          return `${min} - ${max}`;
        }
        if (min !== undefined) return `≥ ${min}`;
        if (max !== undefined) return `≤ ${max}`;
      }
      return "";
    case "date":
    case "daterange":
      if (typeof value === "object" && value !== null && "from" in value) {
        const { from, to } = value as { from?: string; to?: string };
        if (from && to) {
          return `${from} - ${to}`;
        }
        if (from) return `≥ ${from}`;
        if (to) return `≤ ${to}`;
      }
      return "";
    default:
      return String(value || "");
  }
}
