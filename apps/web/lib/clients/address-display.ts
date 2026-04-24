import type { ClientAddress } from '@/types/clients';

export function formatClientAddressOneLine(a: ClientAddress): string {
  const parts = [
    a.line1,
    a.line2,
    a.city,
    a.state,
    a.pincode,
    a.country,
  ].filter((x) => typeof x === 'string' && x.trim().length > 0);
  return parts.join(', ');
}

export function billingAddressSelectOptions(
  addresses: ClientAddress[]
): Array<{ value: string; label: string }> {
  return addresses.map((addr, index) => {
    const line = formatClientAddressOneLine(addr);
    const type = addr.type?.trim();
    const label =
      [type, line].filter((s) => s && s.length > 0).join(' — ') ||
      `Address ${index + 1}`;
    return { value: String(index), label };
  });
}

export function billingSummaryForIndex(
  addresses: ClientAddress[],
  indexStr: string
): { addressLine: string; gstin: string } {
  if (addresses.length === 0) {
    return { addressLine: '—', gstin: '—' };
  }
  const parsed = Number.parseInt(indexStr || '0', 10);
  const raw = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  const idx = Math.min(raw, addresses.length - 1);
  const row = addresses[idx]!;
  const addressLine = formatClientAddressOneLine(row) || '—';
  const gstin = row.gstin?.trim() || '—';
  return { addressLine, gstin };
}
