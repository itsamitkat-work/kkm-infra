import { PageAction } from '@/hooks/use-page-actions-query';
import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';

// Fetch all page actions
export async function fetchAllPageActions(): Promise<PageAction[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', '1');
  queryParams.append('pageSize', '10000');
  const queryString = queryParams.toString();

  const response = await apiFetch<PaginationResponse<PageAction>>(
    `v2/pageactions?${queryString}`
  );

  return response.data || [];
}

export interface SavePageActionsResult {
  insertedCount: number;
  insertFailedCount: number;
  deletedCount: number;
  deleteFailedCount: number;
}

// Save page actions changes - inserts and deletes in parallel, track success/failure
export async function savePageActionsChanges(
  toInsert: Array<{ pageId: string; actionId: string }>,
  toDelete: string[]
): Promise<SavePageActionsResult> {
  const result: SavePageActionsResult = {
    insertedCount: 0,
    insertFailedCount: 0,
    deletedCount: 0,
    deleteFailedCount: 0,
  };

  // Process inserts with individual error handling
  const insertResults = await Promise.allSettled(
    toInsert.map((item) =>
      apiFetch<PageAction>('v2/pageactions', {
        method: 'POST',
        data: {
          pageId: item.pageId,
          actionId: item.actionId,
        },
      })
    )
  );

  insertResults.forEach((res) => {
    if (res.status === 'fulfilled') {
      result.insertedCount++;
    } else {
      result.insertFailedCount++;
    }
  });

  // Process deletes with individual error handling
  const deleteResults = await Promise.allSettled(
    toDelete.map((id) =>
      apiFetch(`v2/pageactions/${id}`, {
        method: 'DELETE',
      })
    )
  );

  deleteResults.forEach((res) => {
    if (res.status === 'fulfilled') {
      result.deletedCount++;
    } else {
      result.deleteFailedCount++;
    }
  });

  return result;
}

