"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type ComposedTableProps = React.ComponentProps<"table"> & {
  /** Classes for the scroll wrapper around `<table>` (default includes horizontal scroll). */
  containerClassName?: string
}

/**
 * Table + scroll shell with a customizable wrapper, mirroring the old `Table` API
 * without extending `components/ui/table`.
 */
const ComposedTable = React.forwardRef<HTMLTableElement, ComposedTableProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div
        data-slot="table-container"
        className={cn("relative w-full overflow-x-auto", containerClassName)}
      >
        <table
          ref={ref}
          data-slot="table"
          className={cn("w-full caption-bottom text-xs", className)}
          {...props}
        />
      </div>
    )
  }
)

ComposedTable.displayName = "ComposedTable"

export { ComposedTable }
