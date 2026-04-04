import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export type SectionCardType =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info";

export type SectionCardCompactMode = "none" | "compact" | "extra-compact";

export interface SectionCardProps {
  title: string;
  value: string | number;
  type?: SectionCardType;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  compact?: SectionCardCompactMode;
  onClick?: () => void;
  clickable?: boolean;
}

const getCardBackgroundClasses = (type: SectionCardType): string => {
  switch (type) {
    case "success":
      return "bg-gradient-to-t from-green-50 to-card dark:from-green-950/20 dark:to-card";
    case "warning":
      return "bg-gradient-to-t from-yellow-50 to-card dark:from-yellow-950/20 dark:to-card";
    case "error":
      return "bg-gradient-to-t from-red-50 to-card dark:from-red-950/20 dark:to-card";
    case "info":
      return "bg-gradient-to-t from-blue-50 to-card dark:from-blue-950/20 dark:to-card";
    case "default":
    default:
      return "bg-gradient-to-t from-primary/5 to-card dark:bg-card";
  }
};

export function SectionCard({
  title,
  value,
  type = "default",
  icon: Icon,
  description,
  className,
  compact = "none",
  onClick,
  clickable = false,
}: SectionCardProps) {
  const backgroundClasses = getCardBackgroundClasses(type);

  // Dynamic classes based on compact mode
  const getCardClasses = () => {
    const baseClasses = `@container/card ${backgroundClasses} transition-all duration-300 ease-in-out hover:shadow-md will-change-transform rounded-xl`;
    const clickableClasses = clickable
      ? "cursor-pointer hover:scale-[1.02] text-left"
      : "";

    if (compact === "extra-compact") {
      return `${baseClasses} border-0 shadow-sm ${clickableClasses}`;
    }

    if (compact === "compact") {
      return `${baseClasses} ${clickableClasses}`;
    }

    return `${baseClasses} hover:scale-[1.02] ${clickableClasses}`;
  };

  const getHeaderClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "px-3 py-0 transition-all duration-300";
      case "compact":
        return "p-3 pb-2 transition-all duration-300";
      default:
        return "transition-all duration-300";
    }
  };

  const getTitleClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "text-sm font-medium text-muted-foreground/80 mb-0 -mt-1 transition-all duration-300";
      case "compact":
        return "text-xs mb-1 transition-all duration-300";
      default:
        return "transition-all duration-300";
    }
  };

  const getValueClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "text-2xl font-semibold tabular-nums truncate @[250px]/card:text-3xl -mb-1 transition-all duration-300";
      case "compact":
        return "text-lg font-semibold tabular-nums truncate transition-all duration-300";
      default:
        return "text-2xl font-semibold tabular-nums @[250px]/card:text-3xl transition-all duration-300";
    }
  };

  const getIconClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "h-8 w-8 transition-all duration-300";
      case "compact":
        return "h-5 w-5 transition-all duration-300";
      default:
        return "h-8 w-8 transition-all duration-300";
    }
  };

  const getIconContainerClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "flex-shrink-0 transition-all duration-300";
      case "compact":
        return "flex-shrink-0 transition-all duration-300";
      default:
        return "ml-4 flex-shrink-0 transition-all duration-300";
    }
  };

  const getDescriptionClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "text-xs text-muted-foreground mt-1 truncate transition-all duration-300";
      case "compact":
        return "text-xs text-muted-foreground mt-1 truncate transition-all duration-300";
      default:
        return "text-sm text-muted-foreground transition-all duration-300";
    }
  };

  const getGapClasses = () => {
    switch (compact) {
      case "extra-compact":
        return "gap-3 transition-all duration-300";
      case "compact":
        return "gap-2 transition-all duration-300";
      default:
        return "transition-all duration-300";
    }
  };

  const CardComponent = clickable ? "button" : Card;
  const cardProps = clickable
    ? { onClick, className: `${getCardClasses()} ${className || ""}` }
    : { className: `${getCardClasses()} ${className || ""}` };

  return (
    <CardComponent {...cardProps}>
      <CardHeader className={getHeaderClasses()}>
        <div className={`flex items-center justify-between ${getGapClasses()}`}>
          <div className="flex-1 min-w-0">
            <CardDescription className={getTitleClasses()}>
              {title}
            </CardDescription>
            <CardTitle className={getValueClasses()}>{value}</CardTitle>
            {description && compact !== "none" && (
              <p className={getDescriptionClasses()}>{description}</p>
            )}
          </div>
          {Icon && (
            <div className={getIconContainerClasses()}>
              <Icon className={`${getIconClasses()} text-muted-foreground`} />
            </div>
          )}
        </div>
      </CardHeader>
      {description && compact === "none" && (
        <CardFooter className="pt-0">
          <p className={getDescriptionClasses()}>{description}</p>
        </CardFooter>
      )}
    </CardComponent>
  );
}
