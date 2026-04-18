/**
 * Response shapes for legacy `/v2/designation` and `/v2/sub-designation` hooks
 * (administration designation pages were removed; mutations still call the API).
 */
export type Designation = Record<string, unknown>;

export type SubDesignation = Record<string, unknown>;
