import { useState, useCallback } from 'react';

export interface ConfirmationDialogData {
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

interface UseConfirmationDialogOptions {
  onOpen?: (data: ConfirmationDialogData) => void;
  onClose?: () => void;
}

interface UseConfirmationDialogReturn {
  isOpen: boolean;
  data: ConfirmationDialogData | null;
  openConfirmation: (data: ConfirmationDialogData) => void;
  closeConfirmation: () => void;
  toggleConfirmation: (data: ConfirmationDialogData) => void;
}

/**
 * Reusable confirmation dialog state (delete, discard, archive, etc.).
 */
export function useConfirmationDialog(
  options?: UseConfirmationDialogOptions
): UseConfirmationDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ConfirmationDialogData | null>(null);

  const openConfirmation = useCallback(
    (newData: ConfirmationDialogData) => {
      setData(newData);
      setIsOpen(true);
      options?.onOpen?.(newData);
    },
    [options]
  );

  const closeConfirmation = useCallback(() => {
    setIsOpen(false);
    setData(null);
    options?.onClose?.();
  }, [options]);

  const toggleConfirmation = useCallback(
    (newData: ConfirmationDialogData) => {
      if (isOpen) {
        closeConfirmation();
      } else {
        openConfirmation(newData);
      }
    },
    [isOpen, openConfirmation, closeConfirmation]
  );

  return {
    isOpen,
    data,
    openConfirmation,
    closeConfirmation,
    toggleConfirmation,
  };
}
