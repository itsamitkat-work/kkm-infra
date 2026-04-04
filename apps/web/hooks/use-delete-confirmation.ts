import { useState, useCallback } from 'react';

export interface DeleteConfirmationData {
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  itemCount?: number;
  itemName?: string;
}

interface UseDeleteConfirmationOptions {
  onOpen?: (data: DeleteConfirmationData) => void;
  onClose?: () => void;
}

interface UseDeleteConfirmationReturn {
  isOpen: boolean;
  data: DeleteConfirmationData | null;
  openDeleteConfirmation: (data: DeleteConfirmationData) => void;
  closeDeleteConfirmation: () => void;
  toggleDeleteConfirmation: (data: DeleteConfirmationData) => void;
}

/**
 * A reusable hook for managing delete confirmation dialog state and data
 * @param options - Optional callbacks for open/close events
 * @returns Object with dialog state, data, and control functions
 */
export function useDeleteConfirmation(
  options?: UseDeleteConfirmationOptions
): UseDeleteConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<DeleteConfirmationData | null>(null);

  const openDeleteConfirmation = useCallback(
    (newData: DeleteConfirmationData) => {
      setData(newData);
      setIsOpen(true);
      options?.onOpen?.(newData);
    },
    [options]
  );

  const closeDeleteConfirmation = useCallback(() => {
    setIsOpen(false);
    setData(null);
    options?.onClose?.();
  }, [options]);

  const toggleDeleteConfirmation = useCallback(
    (newData: DeleteConfirmationData) => {
      if (isOpen) {
        closeDeleteConfirmation();
      } else {
        openDeleteConfirmation(newData);
      }
    },
    [isOpen, openDeleteConfirmation, closeDeleteConfirmation]
  );

  return {
    isOpen,
    data,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    toggleDeleteConfirmation,
  };
}
