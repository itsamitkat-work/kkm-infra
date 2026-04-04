"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import * as React from "react";
import { type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { Input, inputVariants } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "variant"> {
  onClear?: () => void;
  kbd?: string;
  variant?: VariantProps<typeof inputVariants>["variant"];
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, kbd, variant, ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);
    const isSmall = variant === "sm";

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Escape') return;

      e.preventDefault();
      if (hasValue) {
        onClear?.();
      } else {
        e.currentTarget.blur();
      }
    }, [hasValue, onClear]);

    return (
      <div className="relative">
        <IconSearch
          className={cn(
            "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
            isSmall ? "h-3.5 w-3.5" : "h-4 w-4",
            isSmall && "left-2"
          )}
        />
        <Input
          ref={ref}
          value={value}
          variant={variant}
          className={cn(
            isSmall ? "pl-8" : "pl-9",
            hasValue
              ? (isSmall ? "pr-8" : "pr-9")
              : kbd
              ? (isSmall ? "pr-10" : "pr-12")
              : "",
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <div className="absolute right-1 top-0 bottom-0 flex items-center justify-center">
          {hasValue ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("rounded-full", isSmall ? "h-5 w-5" : "h-6 w-6")}
              onClick={onClear}
            >
              <IconX className={isSmall ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </Button>
          ) : kbd ? (
            <Kbd>{kbd}</Kbd>
          ) : null}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
