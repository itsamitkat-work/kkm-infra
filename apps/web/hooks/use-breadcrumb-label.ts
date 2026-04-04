import { useEffect } from 'react';
import { useBreadcrumbStore } from './use-breadcrumb-store';

export function useBreadcrumbLabel(path: string, label: string | undefined) {
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const clearLabel = useBreadcrumbStore((s) => s.clearLabel);

  useEffect(() => {
    if (label) setLabel(path, label);
    return () => clearLabel(path);
  }, [path, label, setLabel, clearLabel]);
}
