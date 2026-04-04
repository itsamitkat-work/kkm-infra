"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  IconWeight,
  IconRuler,
  IconCube,
  IconDroplet,
  IconHash,
  IconCalendar,
  IconPackage,
  IconRulerMeasure,
  IconBox,
  IconCircle,
} from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define unit categories and their corresponding icons
const unitIcons = {
  weight: IconWeight,
  length: IconRuler,
  volume: IconCube,
  liquid: IconDroplet,
  count: IconHash,
  time: IconCalendar,
  package: IconPackage,
  area: IconRulerMeasure,
  container: IconBox,
  default: IconCircle,
} as const;

const normalizeUnitCode = (unitCode: string) =>
  unitCode
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .toUpperCase();

const stripNumericPrefix = (value: string) => value.replace(/^\d+\s*/, "");

// Map unit codes to their categories
const unitCategoryMap: Record<string, keyof typeof unitIcons> = {
  // Weight units
  KG: "weight",
  KILOGRAM: "weight",
  G: "weight",
  T: "weight",
  QTL: "weight",
  QUINTAL: "weight",
  TONNE: "weight",

  // Length units
  M: "length",
  METRE: "length",
  KM: "length",
  CM: "length",
  MM: "length",
  MTRSEC: "length",

  // Area units
  SQM: "area",
  "SQM OF DOOR AREA": "area",
  SQCM: "area",
  SQMM: "area",

  // Volume units
  CUM: "volume",
  CUCM: "volume",
  CUMM: "volume",
  CUDM: "volume",

  // Liquid units
  L: "liquid",
  LITRE: "liquid",
  ML: "liquid",
  "PER LITRE": "liquid",
  PERLITRE: "liquid",

  // Count units
  NOS: "count",
  SET: "count",
  SETS: "count",
  EACH: "count",
  "EACH ROLL": "count",
  "EACH SET": "count",
  PAIR: "count",
  SCORE: "count",
  CARTRIDGE: "count",
  "PER TEST": "count",
  PERTEST: "count",

  // Package units
  ROLL: "package",
  BDL: "package",
  BUNDLE: "package",

  // Time units
  DAY: "time",

  // Default / miscellaneous
  LS: "default",
};

export interface UnitDisplayProps {
  unit: string;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}

export function UnitDisplay({
  unit,
  showIcon = true,
  showLabel = true,
  size = "md",
  className,
  iconClassName,
  labelClassName,
}: UnitDisplayProps) {
  // Determine the appropriate icon based on unit code
  const getUnitIcon = (unitCode: string) => {
    const normalized = normalizeUnitCode(unitCode);
    const stripped = stripNumericPrefix(normalized);
    const lookupKeys =
      stripped && stripped !== normalized
        ? [normalized, stripped]
        : [normalized];
    const category =
      lookupKeys
        .map((key) => unitCategoryMap[key])
        .find((value) => value !== undefined) ?? "default";
    return unitIcons[category];
  };

  const IconComponent = getUnitIcon(unit);

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: "h-3 w-3",
      text: "text-xs",
      gap: "gap-1",
    },
    md: {
      icon: "h-4 w-4",
      text: "text-sm",
      gap: "gap-1.5",
    },
    lg: {
      icon: "h-5 w-5",
      text: "text-base",
      gap: "gap-2",
    },
  };

  const config = sizeConfig[size];

  const content = (
    <div
      className={cn(
        "inline-flex items-center min-w-0 max-w-full",
        config.gap,
        className
      )}
    >
      {showIcon && (
        <IconComponent
          className={cn(
            "text-muted-foreground flex-shrink-0",
            config.icon,
            iconClassName
          )}
        />
      )}
      {showLabel && (
        <span
          className={cn(
            "font-medium text-muted-foreground truncate",
            config.text,
            labelClassName
          )}
        >
          {unit}
        </span>
      )}
    </div>
  );

  if (showLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>{unit}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// Convenience components for common use cases
export function UnitBadge({
  unit,
  size = "sm",
  className,
}: Omit<UnitDisplayProps, "showIcon" | "showLabel">) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border",
        className
      )}
    >
      <UnitDisplay unit={unit} size={size} />
    </div>
  );
}

export function UnitIcon({
  unit,
  className,
}: {
  unit: string;
  className?: string;
}) {
  return <UnitDisplay unit={unit} showLabel={false} className={className} />;
}

export function UnitLabel({
  unit,
  className,
}: {
  unit: string;
  className?: string;
}) {
  return <UnitDisplay unit={unit} showIcon={false} className={className} />;
}
