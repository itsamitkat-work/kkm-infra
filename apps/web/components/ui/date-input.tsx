"use client";

import React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isValid, parse, parseISO } from "date-fns";

export type DateInputProps = {
  value: string;
  disabled: boolean;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
};

function parseDateFromString(
  dateString: string,
  formatType: string = "DD/MM/YYYY"
): Date | null {
  if (!dateString || !dateString.trim()) return null;

  // Handle YYYY-MM-DD format (ISO format) which is used as the internal value
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  }

  // Handle user-typed formats like DD/MM/YYYY
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;

  const parseFormat =
    formatType === "DD/MM/YYYY"
      ? "dd/MM/yyyy"
      : formatType === "MM/DD/YYYY"
      ? "MM/dd/yyyy"
      : "yyyy-MM-dd";

  const parsedDate = parse(dateString, parseFormat, new Date());
  return isValid(parsedDate) ? parsedDate : null;
}

function formatDateForDisplay(
  date: Date | undefined,
  formatType: string = "DD/MM/YYYY"
): string {
  if (!date || !isValid(date)) return "";
  const formatString =
    formatType === "YYYY-MM-DD"
      ? "yyyy-MM-dd"
      : formatType === "MM/DD/YYYY"
      ? "MM/dd/yyyy"
      : "dd/MM/yyyy";
  return format(date, formatString);
}

export function DateInput({
  value,
  disabled,
  className,
  autoFocus,
  placeholder = "DD/MM/YYYY",
  onValueChange,
  onKeyDown,
  onPaste,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(new Date());
  const [inputValue, setInputValue] = React.useState<string>("");

  React.useEffect(() => {
    const currentValue = value ?? "";

    if (!currentValue || currentValue.trim() === "") {
      setInputValue("");
      return;
    }

    const isISODate = /^\d{4}-\d{2}-\d{2}$/.test(currentValue);
    if (isISODate) {
      const date = parseISO(currentValue);
      if (isValid(date)) {
        setInputValue(formatDateForDisplay(date));
        setMonth(date);
        return;
      }
    }

    setInputValue(currentValue);
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    onValueChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Pass the raw, unformatted value to allow for partial typing
    onValueChange(value);

    // If the typed value is a parsable date, update the calendar's month view
    const parsedDate = parseDateFromString(value);
    if (parsedDate) {
      setMonth(parsedDate);
    }
  };

  // The date value to be passed to the Calendar component for highlighting.
  // Try to parse the current input value as a date, regardless of format
  const currentDateValue = React.useMemo(() => {
    if (!inputValue || inputValue.trim() === "") return undefined;

    // First try ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
      const date = parseISO(inputValue);
      return isValid(date) ? date : undefined;
    }

    // Then try to parse as DD/MM/YYYY or other formats
    const parsedDate = parseDateFromString(inputValue);
    return parsedDate || undefined;
  }, [inputValue]);

  return (
    <div className="relative">
      <Input
        value={inputValue}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={() => !disabled && setOpen(true)}
      />
      <Popover
        open={open && !disabled}
        onOpenChange={(o) => !disabled && setOpen(o)}
      >
        <PopoverTrigger asChild>
          <div className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDateValue}
            month={month}
            onMonthChange={setMonth}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateInput;
