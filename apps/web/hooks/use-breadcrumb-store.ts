import { create } from 'zustand';

interface BreadcrumbState {
  labelOverrides: Record<string, string>;
  setLabel: (path: string, label: string) => void;
  clearLabel: (path: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labelOverrides: {},
  setLabel: (path, label) =>
    set((s) => ({ labelOverrides: { ...s.labelOverrides, [path]: label } })),
  clearLabel: (path) =>
    set((s) => {
      const { [path]: _, ...rest } = s.labelOverrides;
      return { labelOverrides: rest };
    }),
}));
