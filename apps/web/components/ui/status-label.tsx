 "use client";

import * as React from "react";

import { useProjectStatus } from "@/hooks/projects/use-project-status";

export function StatusLabel({
  status,
  className,
  fallback = "—",
}: {
  status?: string | null;
  className?: string;
  fallback?: string;
}) {
  const config = useProjectStatus(status || "");

  return (
    <div
      className={className ? `inline-flex items-center gap-2 ${className}` : "inline-flex items-center gap-2"}
    >
      <span
        className={`size-1.5 rounded-full border border-transparent ${config.dotClass}`}
        aria-hidden
      />
      <span className="text-sm font-semibold text-muted-foreground">
        {status || fallback}
      </span>
    </div>
  );
}

