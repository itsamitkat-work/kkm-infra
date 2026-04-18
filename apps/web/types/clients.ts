export interface ClientAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  type?: string | null;
}

export interface ClientContact {
  position?: string | null;
  name?: string | null;
  mobile?: string | null;
  email?: string | null;
}

export interface ClientMeta {
  notes?: string | null;
  [key: string]: unknown;
}

export const CLIENT_DB_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type ClientDbStatus =
  (typeof CLIENT_DB_STATUS)[keyof typeof CLIENT_DB_STATUS];

export const CLIENT_STATUS_VALUES = [
  CLIENT_DB_STATUS.ACTIVE,
  CLIENT_DB_STATUS.INACTIVE,
] as const;
