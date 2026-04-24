import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  addMonths,
  addYears,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
  isValid,
  parseISO,
} from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (!amount || amount === 0) {
    return "₹0.00"
  }
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return ""
  }

  try {
    const date = parseISO(dateString)

    if (!isValid(date)) {
      return ""
    }

    return format(date, "dd-MM-yyyy")
  } catch {
    return ""
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return ""
  }

  try {
    const date = parseISO(dateString)

    if (!isValid(date)) {
      return ""
    }

    return format(date, "dd-MM-yyyy HH:mm")
  } catch {
    return ""
  }
}

export function formatDateSlash(dateString: string | null | undefined): string {
  if (!dateString) {
    return ""
  }

  try {
    const date = parseISO(dateString)

    if (!isValid(date)) {
      return ""
    }

    return format(date, "dd/MM/yyyy")
  } catch {
    return ""
  }
}

export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) {
    return ""
  }

  try {
    const date = parseISO(dateString)

    if (!isValid(date)) {
      return ""
    }

    return format(date, "dd MMMM yyyy")
  } catch {
    return ""
  }
}

export const parseNumber = (value: string): number => {
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const getPlatformSpecificKbd = (key: string) => {
  if (typeof navigator === "undefined") {
    return `Ctrl+${key}`
  }

  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
  return isMac ? `⌘ ${key}` : `Ctrl ${key}`
}

export function calculateDuration(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate || !endDate) {
    return "N/A"
  }

  try {
    const start = parseISO(startDate)
    const end = parseISO(endDate)

    if (!isValid(start) || !isValid(end)) {
      return "N/A"
    }

    const years = differenceInYears(end, start)
    const afterYears = addYears(start, years)
    const months = differenceInMonths(end, afterYears)
    const afterMonths = addMonths(afterYears, months)
    const days = differenceInDays(end, afterMonths)

    const parts: string[] = []
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? "year" : "years"}`)
    }
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? "month" : "months"}`)
    }
    if (days > 0) {
      parts.push(`${days} ${days === 1 ? "day" : "days"}`)
    }

    return parts.length > 0 ? parts.join(", ") : "0 days"
  } catch {
    return "N/A"
  }
}

export function calculateDaysRemaining(endDate: string | null): string {
  if (!endDate) {
    return "N/A"
  }

  try {
    const end = parseISO(endDate)
    const today = new Date()

    if (!isValid(end)) {
      return "N/A"
    }

    const daysRemaining = differenceInDays(end, today)

    if (daysRemaining > 0) {
      return `${daysRemaining} ${
        daysRemaining === 1 ? "day" : "days"
      } remaining`
    }
    if (daysRemaining === 0) {
      return "Due today"
    }
    return `${Math.abs(daysRemaining)} ${
      Math.abs(daysRemaining) === 1 ? "day" : "days"
    } overdue`
  } catch {
    return "N/A"
  }
}
