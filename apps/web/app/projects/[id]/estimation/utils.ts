import { ItemMeasurmentRowData } from './types';

export const calculateQuantity = (
  row: Partial<ItemMeasurmentRowData>
): number | undefined => {
  const { no1, no2, length, width, height } = row;
  const numNo1 = Number(no1) || 0;
  const numNo2 = Number(no2) || 0;
  const numLength = Number(length) || 0;
  const numWidth = Number(width) || 0;
  const numHeight = Number(height) || 0;

  // Collect all valid (non-zero) values
  const validValues: number[] = [];

  // Add No1 and No2 if they have valid values
  if (numNo1 !== 0) validValues.push(numNo1);
  if (numNo2 > 0) validValues.push(numNo2);

  // Add dimensions if they have valid values
  if (numLength > 0) validValues.push(numLength);
  if (numWidth > 0) validValues.push(numWidth);
  if (numHeight > 0) validValues.push(numHeight);

  // If no valid values are provided, return zero
  if (validValues.length === 0) {
    return 0;
  }

  // Calculate quantity by multiplying all valid values
  const quantity = validValues.reduce((acc, value) => acc * value, 1);

  // Round to 3 decimal places for consistency
  return Math.round(quantity * 1000) / 1000;
};
