import { useCallback } from 'react';

import { copyToClipboard } from '../utils/share-utils';
import { EstimationRowData } from '../types';

export function useEstimationShare() {
  /**
   * Handles sharing the table view by copying the current URL
   */
  const handleShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    await copyToClipboard(currentUrl);
  }, []);

  /**
   * Handles sharing individual item with query parameter set to item name
   */
  const handleShareItem = useCallback(async (row: EstimationRowData) => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    // Remove existing query parameter
    url.searchParams.delete('query');
    // Add new query parameter with item name
    url.searchParams.set('query', row.name || '');

    await copyToClipboard(url.toString());
  }, []);

  return {
    handleShareLink,
    handleShareItem,
  };
}
