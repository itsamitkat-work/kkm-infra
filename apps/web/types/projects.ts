/** JSONB `projects.meta` — keys mirror persisted JSON. */
export interface ProjectMeta {
  short_name?: string | null;
  location?: string | null;
  city?: string | null;
  sanction_amount?: number | null;
  sanction_dos?: string | null;
  sanction_doc?: string | null;
  client_address?: string | null;
  client_gstn?: string | null;
  client_label?: string | null;
}

export const PROJECT_DB_STATUS = {
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  CLOSED: 'closed',
} as const;

export type ProjectDbStatus =
  (typeof PROJECT_DB_STATUS)[keyof typeof PROJECT_DB_STATUS];

export function projectDbStatusLabel(status: string): string {
  if (status === PROJECT_DB_STATUS.ON_HOLD) return 'On Hold';
  if (status === PROJECT_DB_STATUS.CLOSED) return 'Closed';
  if (status === PROJECT_DB_STATUS.ACTIVE) return 'Active';
  return status;
}

/** @deprecated Segments API — kept for REST-backed segment flows. */
export const PROJECT_SEGMENT_TYPE_PRESETS = [
  'Phase',
  'Tower',
  'Floor',
  'Area',
  'Activity',
] as const;

export type ProjectSegmentType = string;

export type ProjectSegmentStatus =
  | 'Draft'
  | 'Active'
  | 'Completed'
  | 'Archived';

export interface ProjectSegment {
  hashId: string;
  projectId: string;
  segmentName: string;
  segmentType: ProjectSegmentType;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectSegmentStatus;
  displayOrder: number;
}

export interface ProjectSegmentFormData {
  id?: string;
  projectId: string;
  segmentName: string;
  segmentType: ProjectSegmentType;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectSegmentStatus;
  displayOrder: number;
}

export type ProjectCreateSegmentData = Omit<ProjectSegmentFormData, 'id'>;

export interface SegmentApiRequest {
  id?: string;
  segmentId?: string;
  projectId: string;
  segmentName: string;
  segmentType: ProjectSegmentType;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectSegmentStatus;
  displayOrder: number;
}

export interface SegmentApiResponse {
  data: ProjectSegment;
  isSuccess: boolean;
  statusCode: number;
  message: string;
}
