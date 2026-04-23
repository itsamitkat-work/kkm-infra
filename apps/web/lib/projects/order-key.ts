/** Step used when appending rows (floating order technique). */
export const ORDER_KEY_STEP = 1000;

export function appendOrderKey(maxExisting: number | null | undefined): number {
  const base = maxExisting ?? 0;
  return base + ORDER_KEY_STEP;
}

export function midpointOrderKey(prev: number, next: number): number {
  return (prev + next) / 2;
}
