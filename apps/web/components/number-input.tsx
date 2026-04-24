import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const hideNumberSpinnersClassName =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

export type NumberInputProps = React.ComponentProps<typeof Input> & {
  /** Hides native increment/decrement controls without changing the shared `Input` component. */
  disableStepArrows?: boolean
}

function NumberInput({
  className,
  disableStepArrows,
  ...props
}: NumberInputProps) {
  return (
    <Input
      className={cn(disableStepArrows && hideNumberSpinnersClassName, className)}
      {...props}
    />
  )
}

export { NumberInput }
