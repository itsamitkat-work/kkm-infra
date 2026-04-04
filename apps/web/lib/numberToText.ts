import { ToWords } from 'to-words';

const toWords = new ToWords({
  localeCode: 'en-IN', // Indian English locale
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
  },
});

/**
 * Converts a number to its text representation in Indian number system
 * @param num - The number to convert
 * @returns The text representation of the number
 */
export function numberToText(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  if (num < 0) return 'Negative ' + toWords.convert(-num);

  return toWords.convert(num);
}

/**
 * Formats a number with Indian number system separators
 * @param num - The number to format
 * @returns Formatted number string with .00 decimal places
 */
export function formatIndianNumber(num: number): string {
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
