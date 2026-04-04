import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  parseISO,
  isValid,
  differenceInDays,
  differenceInYears,
  differenceInMonths,
  addYears,
  addMonths,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (!amount || amount === 0) return '₹0.00';
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';

  try {
    // Parse the date string - handle ISO format with time
    const date = parseISO(dateString);

    // Check if the date is valid
    if (!isValid(date)) {
      return '';
    }

    // Format as DD-MM-YYYY for Indian locale
    return format(date, 'dd-MM-yyyy');
  } catch {
    return '';
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '';

  try {
    // Parse the date string - handle ISO format with time
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return '';
    }

    // Format as DD-MM-YYYY HH:mm for Indian locale
    return format(date, 'dd-MM-yyyy HH:mm');
  } catch {
    return '';
  }
}

export function formatDateSlash(dateString: string | null | undefined): string {
  if (!dateString) return '';

  try {
    // Parse the date string - handle ISO format with time
    const date = parseISO(dateString);

    // Check if the date is valid
    if (!isValid(date)) {
      return '';
    }

    // Format as DD/MM/YYYY for Indian locale
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '';
  }
}

export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return '';

  try {
    // Parse the date string - handle ISO format with time
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return '';
    }

    // Format as DD MMMM YYYY (e.g., 15 March 2024)
    return format(date, 'dd MMMM yyyy');
  } catch {
    return '';
  }
}

export const parseNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export const getPlatformSpecificKbd = (key: string) => {
  if (typeof navigator === 'undefined') return `Ctrl+${key}`;

  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  return isMac ? `⌘ ${key}` : `Ctrl ${key}`;
};

// Helper function to calculate and format duration
export function calculateDuration(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate || !endDate) {
    return 'N/A';
  }

  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (!isValid(start) || !isValid(end)) {
      return 'N/A';
    }

    // Calculate years, months, and days
    const years = differenceInYears(end, start);
    const afterYears = addYears(start, years);
    const months = differenceInMonths(end, afterYears);
    const afterMonths = addMonths(afterYears, months);
    const days = differenceInDays(end, afterMonths);

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    if (months > 0)
      parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);

    return parts.length > 0 ? parts.join(', ') : '0 days';
  } catch {
    return 'N/A';
  }
}

// Helper function to calculate days remaining from today until end date
export function calculateDaysRemaining(endDate: string | null): string {
  if (!endDate) {
    return 'N/A';
  }

  try {
    const end = parseISO(endDate);
    const today = new Date();

    if (!isValid(end)) {
      return 'N/A';
    }

    const daysRemaining = differenceInDays(end, today);

    if (daysRemaining > 0) {
      return `${daysRemaining} ${
        daysRemaining === 1 ? 'day' : 'days'
      } remaining`;
    } else if (daysRemaining === 0) {
      return 'Due today';
    } else {
      return `${Math.abs(daysRemaining)} ${
        Math.abs(daysRemaining) === 1 ? 'day' : 'days'
      } overdue`;
    }
  } catch {
    return 'N/A';
  }
}
