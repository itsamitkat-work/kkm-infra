import type { Json } from '@kkm/db';
import z from 'zod';

/** Stored in `project_boq_lines.item_description` (jsonb). */
export const ITEM_DESCRIPTION_DOC_VERSION = 1 as const;

const hierarchySegmentSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const itemDescriptionDocSchema = z.object({
  v: z.literal(ITEM_DESCRIPTION_DOC_VERSION),
  leafScheduleItemId: z.string(),
  segments: z.array(hierarchySegmentSchema),
});

export type ItemDescriptionDoc = z.infer<typeof itemDescriptionDocSchema>;

export function emptyItemDescriptionDoc(): ItemDescriptionDoc {
  return {
    v: ITEM_DESCRIPTION_DOC_VERSION,
    leafScheduleItemId: '',
    segments: [],
  };
}

/** Free-text or single-line label as a one-segment v1 doc (no schedule leaf id). */
export function itemDescriptionFromPlainText(text: string): ItemDescriptionDoc {
  const label = (text ?? '').trim();
  if (!label) {
    return emptyItemDescriptionDoc();
  }
  return {
    v: ITEM_DESCRIPTION_DOC_VERSION,
    leafScheduleItemId: '',
    segments: [{ id: '', label }],
  };
}

export function getItemDescriptionSegments(doc: ItemDescriptionDoc): {
  id: string;
  label: string;
}[] {
  return doc.segments;
}

export function flattenItemDescription(
  doc: ItemDescriptionDoc | null | undefined
): string {
  if (doc == null) {
    return '';
  }
  return doc.segments
    .map((s) => (s.label ?? '').trim())
    .filter(Boolean)
    .join(' > ');
}

function parseItemDescriptionLenient(value: unknown): ItemDescriptionDoc | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, unknown>;
  const v = o.v;
  if (v !== 1 && v !== '1') {
    return null;
  }
  const rawSegs = o.segments;
  if (!Array.isArray(rawSegs)) {
    return null;
  }
  const segments = rawSegs
    .map((entry) => {
      if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }
      const s = entry as Record<string, unknown>;
      const id = String(s.id ?? '');
      const label =
        s.label == null || typeof s.label === 'undefined'
          ? ''
          : String(s.label);
      return { id, label };
    })
    .filter((s): s is { id: string; label: string } => s !== null);
  return {
    v: ITEM_DESCRIPTION_DOC_VERSION,
    leafScheduleItemId: String(o.leafScheduleItemId ?? ''),
    segments,
  };
}

export function parseItemDescriptionFromDb(
  value: Json | null | undefined
): ItemDescriptionDoc {
  if (value == null) {
    return emptyItemDescriptionDoc();
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) {
      return emptyItemDescriptionDoc();
    }
    try {
      const parsedJson: unknown = JSON.parse(t);
      return parseItemDescriptionFromDb(parsedJson as Json);
    } catch {
      return itemDescriptionFromPlainText(value);
    }
  }
  const parsed = itemDescriptionDocSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const lenient = parseItemDescriptionLenient(value);
  if (lenient && lenient.segments.length > 0) {
    return lenient;
  }
  return emptyItemDescriptionDoc();
}

export function serializeItemDescriptionToDb(doc: ItemDescriptionDoc): Json {
  return doc as unknown as Json;
}

export function itemDescriptionDocsEqual(
  a: ItemDescriptionDoc | Json | null | undefined,
  b: ItemDescriptionDoc | Json | null | undefined
): boolean {
  const da = parseItemDescriptionFromDb(a as Json);
  const db = parseItemDescriptionFromDb(b as Json);
  return JSON.stringify(da) === JSON.stringify(db);
}

export const projectItemItemDescriptionFieldSchema = z
  .union([itemDescriptionDocSchema, z.string()])
  .transform((v): ItemDescriptionDoc => {
    if (typeof v === 'string') {
      return itemDescriptionFromPlainText(v);
    }
    return v;
  })
  .superRefine((doc, ctx) => {
    if (flattenItemDescription(doc).trim().length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Item name cannot be empty.',
      });
    }
  });
