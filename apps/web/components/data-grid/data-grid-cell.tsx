"use client";

import * as React from "react";

import { flexRender } from "@/lib/data-grid";
import { cn } from "@/lib/utils";
import type { DataGridCellProps } from "@/types/data-grid";

export function DataGridCell<TData>({
  cell,
  isFocused,
  isEditing,
  isSelected,
  isSearchMatch,
  isActiveSearchMatch,
}: DataGridCellProps<TData>) {
  return (
    <div
      data-editing={isEditing || undefined}
      data-focused={isFocused || undefined}
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 items-stretch px-2 py-1 text-sm",
        isFocused && "z-[1] ring-2 ring-ring ring-inset ring-offset-0",
        isSelected && "bg-primary/10",
        isSearchMatch && "bg-amber-500/15",
        isActiveSearchMatch && "bg-amber-500/30",
        isEditing && "bg-background"
      )}
    >
      <div className="flex min-h-0 w-full min-w-0 items-center">
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </div>
    </div>
  );
}
