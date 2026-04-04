import z from 'zod';

// from BE
export interface ProjectItem {
  hashId: string;
  projectId: string;
  srNo: string | number;
  code: string;
  dsrCode: string;
  name: string;
  unit: string;
  rate: number;
  quantity: number;
  estimate_quantity?: number;
  measurment_quantity?: number;
  scheduleName: string;
  segmentHashIds: string[];
  remarks: string;
}

export const projectItemZodSchema = z.object({
  id: z.string(), // NOTE: Unique ID for each row. it's mandatory.
  hashId: z.string().nullable().optional(), // BE item ID
  srNo: z.string().min(1, 'Wo. No. is required and cannot be empty.'),
  masterItemHashId: z.string().nullable().optional(),
  code: z.string().min(1, 'Code cannot be empty.'),
  dsrCode: z.string().nullable().optional(),
  name: z.string().min(1, 'Item name cannot be empty.'),
  unit: z.string().min(1, 'Unit cannot be empty.'),
  rate: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Rate must be a valid number >= 0'),
  scheduleName: z.string().nullable().optional(),
  quantity: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Quantity must be a valid number >= 0'),
  segmentHashIds: z.array(z.string()).optional().default([]),
  estimate_quantity: z.string().optional(), // Added for estimation reports
  measurment_quantity: z.string().optional(), // Added for estimation reports
  remark: z.string().nullable().optional(),
  total: z.string().optional(),
  isEdited: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  headerKey: z.string().nullable().optional(),
});

export type ProjectItemRowType = z.infer<typeof projectItemZodSchema> & {
  _original?: ProjectItemRowType | null;
};
