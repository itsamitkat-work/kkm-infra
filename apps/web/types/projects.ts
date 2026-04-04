// API Response types for projects (V2 API)
export interface Project {
  hashId: string;
  name: string;
  code: string | null;
  shortname: string | null; // typo by BE
  projectLocation: string | null;
  projectCity: string | null;
  sanctionDoc: string | null;
  sanctionDos: string | null;
  sanctionAmount: number | null;
  remark: string | null;
  status: ProjectStatus;
  statusHashId: string | null;
  clientName: string | null;
  clientHashId: string | null;
  gst: string | null;
  clientgstn: string | null;
  maker: string | null;
  makerHashId: string | null;
  checker: string | null;
  checkerHashId: string | null;
  verifier: string | null;
  verifierHashId: string | null;
  supervisor: string | null;
  supervisorHashId: string | null;
  engineer: string | null;
  projectEngineerHashId: string | null;
  projectHead: string | null;
  projectHeadHashId: string | null;
}

export interface ProjectFormData {
  hashId?: string;
  id?: string;
  code: string;
  name: string;
  shortName?: string;
  sanctionAmount: number;
  sanctionDos?: string | null;
  sanctionDoc?: string | null;
  clientHashId: string;
  projectLocation?: string;
  projectCity: string;
  statusHashId: string;
  makerHashId: string;
  checkerHashId: string;
  types?: string;
  gst?: string;
  verifierHashId: string;
  superviserHashId: string;
  projectEngineerHashId: string;
  projectHeadHashId: string;
}

// New project creation data (without id)
export type CreateProjectData = Omit<ProjectFormData, 'id'>;

// Status constants
export const PROJECT_STATUS = {
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  ONHOLD: 'On Hold',
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// Segment types
export type ProjectSegmentType =
  | 'Phase'
  | 'Tower'
  | 'Floor'
  | 'Area'
  | 'Activity';

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

// API request types for segment operations
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
