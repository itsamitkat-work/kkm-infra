import type { Json } from '@kkm/db';
import type {
  ClientAddress,
  ClientContact,
  ClientMeta,
} from '@/types/clients';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseClientMeta(meta: Json | null | undefined): ClientMeta {
  if (!isPlainObject(meta)) return {};
  const out: ClientMeta = {};
  if ('notes' in meta) out.notes = asTrimmedString(meta.notes);
  for (const [key, value] of Object.entries(meta)) {
    if (key === 'notes') continue;
    out[key] = value;
  }
  return out;
}

export function buildClientMetaPatch(
  base: Json | null | undefined,
  patch: ClientMeta
): Json {
  const baseObj = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null || value === '') {
      delete baseObj[key];
      continue;
    }
    baseObj[key] = value as Json;
  }
  return baseObj as Json;
}

export function parseClientAddresses(value: Json | null | undefined): ClientAddress[] {
  if (!Array.isArray(value)) return [];
  const out: ClientAddress[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    out.push({
      line1: asTrimmedString(entry.line1),
      line2: asTrimmedString(entry.line2),
      city: asTrimmedString(entry.city),
      state: asTrimmedString(entry.state),
      pincode: asTrimmedString(entry.pincode),
      country: asTrimmedString(entry.country),
      type: asTrimmedString(entry.type),
    });
  }
  return out;
}

export function parseClientContacts(value: Json | null | undefined): ClientContact[] {
  if (!Array.isArray(value)) return [];
  const out: ClientContact[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    out.push({
      position: asTrimmedString(entry.position),
      name: asTrimmedString(entry.name),
      mobile: asTrimmedString(entry.mobile),
      email: asTrimmedString(entry.email),
    });
  }
  return out;
}

export function serializeClientAddresses(rows: ClientAddress[]): Json {
  return rows
    .map((row) => ({
      line1: asTrimmedString(row.line1),
      line2: asTrimmedString(row.line2),
      city: asTrimmedString(row.city),
      state: asTrimmedString(row.state),
      pincode: asTrimmedString(row.pincode),
      country: asTrimmedString(row.country),
      type: asTrimmedString(row.type),
    }))
    .filter(
      (row) =>
        row.line1 ||
        row.line2 ||
        row.city ||
        row.state ||
        row.pincode ||
        row.country ||
        row.type
    ) as Json;
}

export function serializeClientContacts(rows: ClientContact[]): Json {
  return rows
    .map((row) => ({
      position: asTrimmedString(row.position),
      name: asTrimmedString(row.name),
      mobile: asTrimmedString(row.mobile),
      email: asTrimmedString(row.email),
    }))
    .filter(
      (row) => row.position || row.name || row.mobile || row.email
    ) as Json;
}
