import { ProjectItemRowType as HookProjectRowData } from '@/types/project-item';
import z from 'zod';

export type ProjectItemType = 'GEN' | 'EST' | 'MSR' | 'BLG';

// Extended type for estimation reports that includes estimatedQty
export type EstimationRowData = HookProjectRowData & {
  estimate_quantity?: string; // From backend API
  measurment_quantity?: string;
  deviationQty?: number;
  deviationPercent?: number;
  costDeviation?: number;
};

export const rowDataZodSchema = z.object({
  id: z.string(),
  date: z.string().optional(),
  description: z.string().min(1, 'Description cannot be empty.'),
  no1: z.coerce.number().default(0),
  no2: z.coerce.number().default(0),
  length: z.coerce.number().default(0),
  width: z.coerce.number().default(0),
  height: z.coerce.number().default(0),
  quantity: z.coerce.number().default(0), // This is site_quantity
  rate: z.coerce.number().default(0),
  schedule_quantity: z.coerce.number().default(0),
  isEdited: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  checked: z.string().optional().default('false'),
  verified: z.string().optional().default('false'),
  orderKey: z.coerce.number().optional(),
});

export type ItemMeasurmentRowData = z.infer<typeof rowDataZodSchema> & {
  id: string;
  _original?: ItemMeasurmentRowData | null;
  isEdited?: boolean;
  isNew?: boolean;
  headerKey?: string;
  orderKey?: number;
};
