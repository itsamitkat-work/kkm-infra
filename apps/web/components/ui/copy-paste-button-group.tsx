import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, ClipboardPaste, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyPasteButtonGroupProps {
  /** Number of selected items. If 0, Copy button won't show */
  selectedCount: number;
  /** Whether there are copied items available to paste */
  hasCopiedItems: boolean;
  /** Optional highlight variant for paste button (e.g., when pasting to same source) */
  highlightPaste?: boolean;
  /** Callback when copy button is clicked */
  onCopy: () => void;
  /** Callback when paste button is clicked */
  onPaste: () => void;
  /** Callback when clear button is clicked */
  onClear: () => void;
  /** Custom label for copy button. Receives selected count */
  copyLabel?: (count: number) => string;
  /** Custom label for paste button. Receives highlight state */
  pasteLabel?: (highlighted: boolean) => string;
  /** Additional className for the container */
  className?: string;
  /** Size variant for buttons */
  size?: "sm" | "md" | "lg" | "xs" | "icon";
  /** Show clear button */
  showClear?: boolean;
  /** Tooltip text for clear button */
  clearTooltip?: string;
}

export function CopyPasteButtonGroup({
  selectedCount,
  hasCopiedItems,
  highlightPaste = false,
  onCopy,
  onPaste,
  onClear,
  copyLabel = (count) => `Copy (${count})`,
  pasteLabel = (highlighted) => `Paste${highlighted ? " (same source)" : ""}`,
  className,
  size = "sm",
  showClear = true,
  clearTooltip = "Clear copied items",
}: CopyPasteButtonGroupProps) {
  // Don't render if nothing to show
  if (selectedCount === 0 && !hasCopiedItems) {
    return null;
  }

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    xs: "h-7 px-2 text-xs gap-1",
    md: "h-9 px-3 text-sm gap-1.5",
    lg: "h-10 px-4 text-sm gap-1.5",
    icon: "h-9 w-9 p-0",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    xs: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4",
    icon: "h-4 w-4",
  };

  return (
    <div className={cn("flex items-center", className)}>
      {selectedCount > 0 && (
        <Button
          variant="outline"
          size={size}
          onClick={onCopy}
          className={cn(
            sizeClasses[size],
            hasCopiedItems && "rounded-r-none border-r-0"
          )}
        >
          <Copy className={iconSizes[size]} />
          <span className="hidden sm:inline">{copyLabel(selectedCount)}</span>
          <span className="sm:hidden">Copy</span>
        </Button>
      )}
      {hasCopiedItems && (
        <div
          className={cn(
            "flex items-center border overflow-hidden",
            selectedCount > 0 ? "border-l-0 rounded-r-md" : "rounded-md"
          )}
        >
          <Button
            variant="outline"
            size={size}
            onClick={onPaste}
            className={cn(
              sizeClasses[size],
              "border-r-0",
              selectedCount > 0
                ? "rounded-none"
                : "rounded-l-md rounded-r-none",
              highlightPaste && "border-primary text-primary"
            )}
          >
            <ClipboardPaste className={iconSizes[size]} />
            <span className="hidden sm:inline">
              {pasteLabel(highlightPaste)}
            </span>
            <span className="sm:hidden">Paste</span>
          </Button>
          {showClear && (
            <Button
              variant="outline"
              size={size}
              onClick={onClear}
              className={cn(
                size === "sm" || size === "xs"
                  ? "h-7 px-1.5 text-xs"
                  : size === "md"
                  ? "h-9 px-2 text-sm"
                  : "h-10 px-2.5 text-sm",
                "rounded-l-none border-l border-l-input/50 text-muted-foreground hover:text-foreground hover:bg-accent",
                selectedCount > 0 ? "rounded-r-md" : "rounded-r-md",
                highlightPaste && "border-l-primary/50"
              )}
              title={clearTooltip}
            >
              <X className={iconSizes[size]} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
