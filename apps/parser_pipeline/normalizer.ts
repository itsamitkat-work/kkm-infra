export function normalizeUnit(unit?: string): string | null {
  if (!unit) return null

  const map: Record<string, string> = {
    sqm: 'square_meter',
    cum: 'cubic_meter',
    metre: 'meter',
    each: 'each'
  }

  return map[unit.toLowerCase()] || unit
}
