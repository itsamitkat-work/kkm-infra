import * as React from "react"

import { FieldGroup } from "@/components/ui/field"
import { cn } from "@/lib/utils"

type FieldGroupProps = React.ComponentProps<typeof FieldGroup>

/**
 * Tighter vertical rhythm for long forms, without extending the shared `FieldGroup` API in `components/ui`.
 */
function FieldGroupDense({ className, ...props }: FieldGroupProps) {
  return (
    <FieldGroup
      className={cn(
        "gap-2 has-[>[data-slot=checkbox-group]]:gap-2 has-[>[data-slot=radio-group]]:gap-2 *:data-[slot=field-group]:gap-2",
        className
      )}
      {...props}
    />
  )
}

export { FieldGroupDense }
