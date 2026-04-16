import type { Json } from '@kkm/db';
import type { ProjectMeta } from '@/types/projects';

export function parseProjectMeta(meta: Json | null | undefined): ProjectMeta {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {};
  }
  const o = meta as Record<string, unknown>;
  return {
    short_name: readString(o.short_name),
    location: readString(o.location),
    city: readString(o.city),
    sanction_amount: readNumber(o.sanction_amount),
    sanction_dos: readString(o.sanction_dos),
    sanction_doc: readString(o.sanction_doc),
    client_address: readString(o.client_address),
    client_gstn: readString(o.client_gstn),
    client_label: readString(o.client_label),
  };
}

function readString(v: unknown): string | null | undefined {
  if (v === null || v === undefined) return v ?? undefined;
  if (typeof v === 'string') return v;
  return String(v);
}

function readNumber(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return v ?? undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

export function buildProjectMetaPatch(base: Json | null, patch: ProjectMeta): Json {
  const prev = parseProjectMeta(base);
  const next: ProjectMeta = { ...prev, ...patch };
  const json: Record<string, unknown> = { ...(base && typeof base === 'object' && !Array.isArray(base) ? (base as object) : {}) };
  for (const [k, val] of Object.entries(next)) {
    if (val === undefined) continue;
    json[k] = val;
  }
  return json as Json;
}
