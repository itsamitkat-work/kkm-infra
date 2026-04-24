import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ButtonProps = React.ComponentProps<typeof Button>

const dashedIconButtonClassName =
  "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-muted-foreground hover:bg-muted/40 hover:text-foreground"

export type DashedIconButtonProps = Omit<ButtonProps, "variant">

/**
 * Compact dashed-border trigger (e.g. “add” / chevron) without extending the shared Button variant map.
 */
function DashedIconButton({ className, ...props }: DashedIconButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(dashedIconButtonClassName, className)}
      {...props}
    />
  )
}

export { DashedIconButton }
