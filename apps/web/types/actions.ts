export interface Action extends Record<string, unknown> {
  id: string;
  code: string;
  description: string | null;
}

