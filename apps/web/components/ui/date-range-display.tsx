"use client";

import React from "react";
import { parseISO, isValid, differenceInDays } from "date-fns";
import { formatDateSlash } from "@/lib/utils";

interface DateRangeDisplayProps {
  startDate: string | null;
  endDate: string | null;
}

export const DateRangeDisplay = React.memo(
  ({ startDate, endDate }: DateRangeDisplayProps) => {
    if (!startDate || !endDate) {
      return (
        <div className="text-sm text-muted-foreground">
          {startDate ? formatDateSlash(startDate) : ""}
          {endDate ? formatDateSlash(endDate) : ""}
        </div>
      );
    }

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      if (!isValid(start) || !isValid(end)) {
        return (
          <div className="text-sm text-muted-foreground">
            {formatDateSlash(startDate)} - {formatDateSlash(endDate)}
          </div>
        );
      }

      const startDateFormatted = formatDateSlash(startDate);
      const endDateFormatted = formatDateSlash(endDate);

      // Calculate total duration in days
      const totalDays = Math.abs(differenceInDays(end, start));

      // Determine the best unit and format duration
      let duration: string;
      if (totalDays >= 365) {
        // Show in years (using 365.25 to account for leap years)
        const years = totalDays / 365.25;
        duration = `${years.toFixed(1)} years`;
      } else if (totalDays >= 30) {
        // Show in months (using average month length)
        const months = totalDays / 30.44;
        duration = `${months.toFixed(1)} months`;
      } else {
        // Show in days
        duration = `${totalDays} ${totalDays === 1 ? "day" : "days"}`;
      }

      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{startDateFormatted}</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 relative">
            <div className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <div className="h-px bg-muted-foreground/30 flex-[0.25]" />
            <span className="text-xs text-muted-foreground/70 whitespace-nowrap px-1">
              {duration}
            </span>
            <div className="h-px bg-muted-foreground/30 flex-[0.25]" />
            <div className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
          </div>
          <span className="whitespace-nowrap">{endDateFormatted}</span>
        </div>
      );
    } catch {
      return (
        <div className="text-sm text-muted-foreground">
          {formatDateSlash(startDate)} - {formatDateSlash(endDate)}
        </div>
      );
    }
  }
);

DateRangeDisplay.displayName = "DateRangeDisplay";

