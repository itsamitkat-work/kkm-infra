"use client"

import * as React from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

/**
 * Ensures Radix `Tooltip` is available during static generation and on routes
 * that do not use the authenticated `(app)` shell.
 */
function AppTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
}

export { AppTooltipProvider }
