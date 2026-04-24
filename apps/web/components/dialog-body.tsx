import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Scrollable / padded region inside a dialog, separate from the shadcn dialog primitive export surface.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-1 overflow-auto px-4 pb-4", className)}
      {...props}
    />
  )
}

export { DialogBody }
