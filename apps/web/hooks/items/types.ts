export interface MasterItem {
  hashId: string;
  code: string;
  dsrCode: string | null;
  dsrId: string | null;
  name: string;
  unit: string;
  rate: number;
  scheduleName: string | null; // not available in the response
  scheduleRate: string | null;
  /** Present when item is loaded for edit (e.g. from detail API) */
  parentId?: string;
  head?: string;
  subhead?: string; // name mismatch
  subHead?: string;
  nickName?: string;
  types?: string;
  clientHashId?: string;
  clientName?: string;
}
