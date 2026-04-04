'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

export function useQueryState<T>(
  key: string,
  defaultValue: T,
  debounceMs = 0
): [T, SetValue<T>] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawValue = searchParams.get(key);

  const value = useMemo(() => {
    if (rawValue) {
      try {
        return JSON.parse(rawValue) as T;
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }, [rawValue, defaultValue]);

  const debouncedCallback = useDebouncedCallback((value: T) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== undefined && value !== null) {
      params.set(key, JSON.stringify(value));
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, debounceMs);

  const setValue: SetValue<T> = useCallback(
    (newValue) => {
      const resolvedValue =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(value)
          : newValue;
      debouncedCallback(resolvedValue);
    },
    [value, debouncedCallback]
  );

  return [value, setValue];
}
