"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { Popover, PopoverContent, PopoverAnchor } from "./popover";

interface TextareaWithAutocompleteProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  suggestions: string[];
  triggerChar?: string;
  maxSuggestions?: number;
  autoSize?: boolean;
  minRows?: number;
  maxRows?: number;
  disableFocusRing?: boolean;
  /**
   * Optional function to format the selected value before inserting it.
   * Receives the selected suggestion and returns the formatted string to insert.
   * Default behavior: inserts the suggestion as-is with a space after it.
   */
  formatSelectedValue?: (suggestion: string) => string;
}

export function TextareaWithAutocomplete({
  value,
  onChange,
  onKeyDown,
  onBlur,
  suggestions,
  triggerChar = "#",
  maxSuggestions = 5,
  autoSize = false,
  minRows,
  maxRows,
  disableFocusRing = false,
  formatSelectedValue,
  className,
  ...props
}: TextareaWithAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const cursorPositionRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync cursor position when value changes (for external updates)
  useEffect(() => {
    if (textareaRef.current) {
      const currentPos = textareaRef.current.selectionStart ?? 0;
      cursorPositionRef.current = currentPos;
      if (currentPos !== cursorPosition) {
        setCursorPosition(currentPos);
      }
    }
  }, [value, cursorPosition]);

  // Find the current word being typed after the trigger character
  const { currentQuery, hasTrigger } = useMemo(() => {
    if (typeof value !== "string" || !value)
      return { currentQuery: "", hasTrigger: false };

    const text = value;
    // Get cursor position from ref (synchronous) or textarea directly, fallback to state
    let cursorPos =
      textareaRef.current?.selectionStart ??
      cursorPositionRef.current ??
      cursorPosition;

    // Ensure cursor position is within valid range
    cursorPos = Math.max(0, Math.min(cursorPos, text.length));

    // Find the last occurrence of triggerChar before cursor
    const beforeCursor = text.substring(0, cursorPos);
    const lastTriggerIndex = beforeCursor.lastIndexOf(triggerChar);

    if (lastTriggerIndex === -1) return { currentQuery: "", hasTrigger: false };

    // Check if there's a space or newline after the trigger (if so, not in a query)
    const afterTrigger = text.substring(lastTriggerIndex + 1, cursorPos);
    if (afterTrigger.includes(" ") || afterTrigger.includes("\n")) {
      return { currentQuery: "", hasTrigger: false };
    }

    return { currentQuery: afterTrigger, hasTrigger: true };
  }, [value, cursorPosition, triggerChar]);

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    if (!hasTrigger) return [];

    // If query is empty, show all suggestions. Otherwise filter by query
    if (!currentQuery) {
      return suggestions.slice(0, maxSuggestions);
    }

    return suggestions
      .filter((suggestion) =>
        suggestion.toLowerCase().includes(currentQuery.toLowerCase())
      )
      .slice(0, maxSuggestions);
  }, [suggestions, currentQuery, hasTrigger, maxSuggestions]);

  // Calculate and update dropdown position
  const updateDropdownPosition = React.useCallback(() => {
    if (!textareaRef.current) {
      setDropdownPosition({ top: 0, left: 0 });
      return;
    }

    const textarea = textareaRef.current;
    const text = typeof value === "string" ? value : "";
    const cursorPos =
      textareaRef.current?.selectionStart ??
      cursorPositionRef.current ??
      cursorPosition;

    // Calculate approximate position based on cursor line
    const lines = text.substring(0, cursorPos).split("\n");
    const currentLine = lines.length - 1;
    const lineHeight =
      parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;

    // Position relative to textarea container (PopoverAnchor will handle absolute positioning)
    setDropdownPosition({
      top: (currentLine + 1) * lineHeight + 4,
      left: 8,
    });
  }, [value, cursorPosition]);

  // Update open state based on whether we have a trigger and suggestions
  useEffect(() => {
    setIsOpen(hasTrigger && filteredSuggestions.length > 0);
    setHighlightedIndex(-1);
  }, [hasTrigger, filteredSuggestions.length]);

  // Update dropdown position when open, value, or cursor position changes
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, value, cursorPosition, updateDropdownPosition]);

  // Update dropdown position on scroll/resize when open
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      updateDropdownPosition();
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, updateDropdownPosition]);

  // Handle textarea change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCursorPos = e.target.selectionStart ?? e.target.value.length;

    // Update cursor position immediately in both ref and state
    cursorPositionRef.current = newCursorPos;
    setCursorPosition(newCursorPos);
    onChange?.(e);
  };

  // Handle textarea focus to update cursor position
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const pos = e.target.selectionStart ?? 0;
    cursorPositionRef.current = pos;
    setCursorPosition(pos);
    props.onFocus?.(e);
  };

  // Handle textarea click to update cursor position
  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const pos = e.currentTarget.selectionStart ?? 0;
    cursorPositionRef.current = pos;
    setCursorPosition(pos);
  };

  // Handle textarea selection change
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const pos = e.currentTarget.selectionStart ?? 0;
    cursorPositionRef.current = pos;
    setCursorPosition(pos);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    if (!textareaRef.current || typeof value !== "string") return;

    const text = value;
    const cursorPos = cursorPosition;
    const beforeCursor = text.substring(0, cursorPos);
    const lastTriggerIndex = beforeCursor.lastIndexOf(triggerChar);

    if (lastTriggerIndex === -1) return;

    // Format the selected value if a formatter is provided
    const formattedValue = formatSelectedValue
      ? formatSelectedValue(suggestion)
      : `${suggestion} `;

    // Replace the query with the selected suggestion
    const beforeTrigger = text.substring(0, lastTriggerIndex);
    const afterCursor = text.substring(cursorPos);
    const newText = `${beforeTrigger}${triggerChar}${formattedValue}${afterCursor}`;
    const newCursorPos =
      beforeTrigger.length + triggerChar.length + formattedValue.length;

    // Create synthetic event
    const syntheticEvent = {
      target: { value: newText },
      currentTarget: { value: newText },
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange?.(syntheticEvent);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // Set cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // When dropdown is open, prevent navigation keys from bubbling to parent table handlers
    if (isOpen) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation(); // Prevent event from bubbling to parent table handlers
          setHighlightedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          return;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation(); // Prevent event from bubbling to parent table handlers
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          return;
        case "Enter":
        case "Tab":
          if (highlightedIndex >= 0) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to parent table handlers
            handleSuggestionClick(filteredSuggestions[highlightedIndex]);
            return;
          }
          // If no suggestion is highlighted, allow Enter to work normally
          // but still prevent Tab from navigating cells
          if (e.key === "Tab") {
            e.stopPropagation();
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation(); // Prevent event from bubbling to parent table handlers
          setIsOpen(false);
          setHighlightedIndex(-1);
          return;
        case "ArrowLeft":
        case "ArrowRight":
          // Allow left/right arrows to work in textarea but prevent cell navigation
          e.stopPropagation();
          break;
        default:
          // For other keys when dropdown is open, stop propagation to prevent cell navigation
          // but still allow the key to work in the textarea
          e.stopPropagation();
          break;
      }
    }

    // Call parent handler for keys that should bubble
    onKeyDown?.(e);
  };

  // Handle blur with delay to allow clicking suggestions
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
    onBlur?.(e);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <Popover
      open={isOpen && filteredSuggestions.length > 0}
      onOpenChange={setIsOpen}
    >
      <div className="relative w-full">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onSelect={handleSelect}
          autoSize={autoSize}
          minRows={minRows}
          maxRows={maxRows}
          disableFocusRing={disableFocusRing}
          className={className}
          {...props}
        />
        {/* Invisible anchor positioned at cursor location */}
        {isOpen && (
          <PopoverAnchor
            asChild
            style={{
              position: "absolute",
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: "1px",
              height: "1px",
              pointerEvents: "none",
              opacity: 0,
            }}
          >
            <div />
          </PopoverAnchor>
        )}
      </div>
      <PopoverContent
        className="w-auto p-0 min-w-[200px] max-w-[300px]"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <ul ref={listRef} className="max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm",
                index === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseDown={(e) => e.preventDefault()} // Prevent textarea blur
            >
              {suggestion}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
