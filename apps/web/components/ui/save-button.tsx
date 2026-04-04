"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Loader2, Save } from "lucide-react";
import { getPlatformSpecificKbd } from "@/lib/utils";

type SaveButtonProps = {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  isNew: boolean;
  isEdited: boolean;
};

export const SaveButton: React.FC<SaveButtonProps> = ({
  onClick,
  disabled,
  isLoading,
  errorMessage,
  isNew,
  isEdited,
}) => {
  const hasError = !!errorMessage;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="xs"
          variant="outline"
          onClick={onClick}
          disabled={disabled}
          className={`relative h-6 w-6 p-0 ${
            hasError
              ? "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive"
              : disabled
              ? "text-muted-foreground"
              : "text-primary hover:text-primary hover:bg-muted/30"
          }`}
        >
          {hasError && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
          )}
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {hasError ? (
          <p className="text-destructive">{errorMessage}</p>
        ) : (
          <div className="flex items-center gap-2">
            <p>
              {isLoading
                ? "Loading..."
                : isNew
                ? "Save New Item"
                : isEdited
                ? "Save Changes"
                : "No Changes to Save"}
            </p>
            {!disabled && <Kbd>{getPlatformSpecificKbd("S")}</Kbd>}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
