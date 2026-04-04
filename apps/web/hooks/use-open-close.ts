import { useState, useCallback } from 'react';

export type OpenCloseMode = 'create' | 'edit' | 'read' | 'copy';

interface UseOpenCloseOptions<T> {
  onOpen?: (data?: T, mode?: OpenCloseMode) => void;
  onClose?: () => void;
}

interface OpenCloseState<T> {
  isOpen: boolean;
  data: T | null;
  mode: OpenCloseMode | null;
}

interface UseOpenCloseReturn<T> extends OpenCloseState<T> {
  open: (data?: T, mode?: OpenCloseMode) => void;
  close: () => void;
  toggle: (data?: T, mode?: OpenCloseMode) => void;
}

const initialState: OpenCloseState<unknown> = {
  isOpen: false,
  data: null,
  mode: null,
};

/**
 * A reusable hook for managing open/close state (e.g., modals, drawers), data, and mode
 * @param options - Optional callbacks for open/close events
 * @returns Object with open/close state, mode, and control functions
 */
export function useOpenClose<T = unknown>(
  options?: UseOpenCloseOptions<T>
): UseOpenCloseReturn<T> {
  const [state, setState] = useState<OpenCloseState<T>>(
    initialState as OpenCloseState<T>
  );

  const open = useCallback(
    (data?: T, mode?: OpenCloseMode) => {
      setState({
        isOpen: true,
        data: data || null,
        mode: mode || null,
      });
      options?.onOpen?.(data, mode);
    },
    [options]
  );

  const close = useCallback(() => {
    setState(initialState as OpenCloseState<T>);
    options?.onClose?.();
  }, [options]);

  const toggle = useCallback(
    (data?: T, mode?: OpenCloseMode) => {
      if (state.isOpen) {
        close();
      } else {
        open(data, mode);
      }
    },
    [state.isOpen, open, close]
  );

  return {
    ...state,
    open,
    close,
    toggle,
  };
}
