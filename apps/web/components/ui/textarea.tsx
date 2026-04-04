"use client";

import TextareaAutosize, {
  TextareaAutosizeProps,
} from "react-textarea-autosize";
import { cn } from "@/lib/utils";
import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoSize?: boolean;
  minRows?: number;
  maxRows?: number;
  disableFocusRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      autoSize = false,
      minRows,
      maxRows,
      disableFocusRing = false,
      ...props
    },
    ref
  ) => {
    if (autoSize) {
      return (
        <TextareaAutosize
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
            disableFocusRing &&
              "focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none"
          )}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          minRows={minRows}
          maxRows={maxRows}
          {...(props as TextareaAutosizeProps)}
        />
      );
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
          disableFocusRing &&
            "focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none"
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
