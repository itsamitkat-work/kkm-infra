'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaginationResponse } from '@/types/common';
import { ProjectItemType } from '@/app/projects/[id]/estimation/types';
import React from 'react';
import type { Database } from '@kkm/db';
import { appendOrderKey } from '@/lib/projects/order-key';
import {
  deleteDomainLine,
  fetchDomainLinesForBoqLine,
  fetchMaxOrderKeyForDomainLines,
  fetchScheduleItemIdForBoqLine,
  insertDomainLine,
  updateDomainLine,
  type DomainLineInsert,
  type DomainLineUpdate,
} from '@/lib/projects/project-domain-lines-repo';

type DomainRow = Database['public']['Tables']['project_estimation_lines']['Row'];

export interface EstimationItem {
  hashId: string;
  hashid?: string;
  description: string;
  no1: number;
  no2: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  createdOn: string;
  checked?: boolean;
  verified?: boolean;
  orderKey?: number;
}

export type EstimationResponse = PaginationResponse<EstimationItem>;

export interface EstimationItemPayload {
  hashId?: string;
  description: string;
  projectItemHashId: string;
  projectHashId: string;
  segmentHashId?: string;
  /** Billing (BLG) API used `segmentId` in the legacy payload. */
  segmentId?: string;
  no1: number;
  no2: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  checked?: boolean;
  verified?: boolean;
  orderKey?: number;
}

function mapRowToEstimationItem(row: DomainRow): EstimationItem {
  return {
    hashId: row.id,
    description: row.line_description,
    no1: Number(row.no1),
    no2: Number(row.no2),
    length: Number(row.length),
    width: Number(row.width),
    height: Number(row.height),
    quantity: Number(row.quantity),
    createdOn: row.created_at,
    checked: row.is_checked,
    verified: row.is_verified,
    orderKey: row.order_key,
  };
}

function segmentIdFromPayload(item: EstimationItemPayload): string | undefined {
  return item.segmentId ?? item.segmentHashId;
}

export const createEstimationItem = async (
  item: Omit<EstimationItemPayload, 'hashId'>,
  type: ProjectItemType
): Promise<{ data: EstimationItem }> => {
  const schedule_item_id = await fetchScheduleItemIdForBoqLine(
    item.projectItemHashId
  );
  const maxKey = await fetchMaxOrderKeyForDomainLines(
    item.projectItemHashId,
    type
  );
  const orderKey =
    item.orderKey !== undefined && item.orderKey !== null
      ? item.orderKey
      : appendOrderKey(maxKey);

  const segmentId = segmentIdFromPayload(item);

  const insert: DomainLineInsert = {
    project_id: item.projectHashId,
    project_boq_line_id: item.projectItemHashId,
    schedule_item_id,
    project_segment_id: segmentId ?? null,
    line_description: item.description,
    length: item.length,
    width: item.width,
    height: item.height,
    no1: item.no1,
    no2: item.no2,
    quantity: item.quantity,
    is_checked: item.checked ?? false,
    is_verified: item.verified ?? false,
    order_key: orderKey,
  };

  const row = await insertDomainLine(type, insert);
  return { data: mapRowToEstimationItem(row) };
};

export const updateEstimationItem = async (
  item: EstimationItemPayload,
  type: ProjectItemType
): Promise<{ data: EstimationItem }> => {
  if (!item.hashId) {
    throw new Error('hashId is required for updating an estimation item.');
  }
  const segmentId = segmentIdFromPayload(item);
  const patch: DomainLineUpdate = {
    line_description: item.description,
    length: item.length,
    width: item.width,
    height: item.height,
    no1: item.no1,
    no2: item.no2,
    quantity: item.quantity,
    project_segment_id: segmentId ?? null,
    is_checked: item.checked ?? false,
    is_verified: item.verified ?? false,
  };
  if (item.orderKey !== undefined && item.orderKey !== null) {
    patch.order_key = item.orderKey;
  }
  const row = await updateDomainLine(type, item.hashId, patch);
  return { data: mapRowToEstimationItem(row) };
};

export const deleteEstimationItem = async (
  itemId: string,
  type: ProjectItemType
): Promise<{ message: string }> => {
  await deleteDomainLine(type, itemId);
  return { message: 'ok' };
};

export const fetchEstimationData = async (
  estimationId: string,
  type: ProjectItemType,
  signal?: AbortSignal
): Promise<EstimationResponse> => {
  if (!estimationId) {
    throw new Error('Estimation ID is required');
  }
  const rows = await fetchDomainLinesForBoqLine(estimationId, type, signal);
  const data = rows.map(mapRowToEstimationItem);
  return {
    data,
    totalCount: data.length,
    page: 1,
    pageSize: Math.max(data.length, 1),
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
    isSuccess: true,
    statusCode: 200,
    message: '',
  };
};

export const useEstimation = (
  estimationId: string,
  type: ProjectItemType,
  enabled?: boolean
) => {
  if (!estimationId) {
    throw new Error('Estimation ID is required for useEstimation');
  }

  const isEnabled =
    enabled !== undefined ? enabled && !!estimationId : !!estimationId;

  const query = useQuery({
    queryKey: ['estimation', estimationId, type],
    queryFn: ({ signal }) => fetchEstimationData(estimationId, type, signal),
    enabled: isEnabled,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: async () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
  };
};

export const useEstimationMutations = (
  estimationId: string,
  type: ProjectItemType
) => {
  const queryClient = useQueryClient();

  const invalidate = React.useCallback(
    (projectHashId?: string) => {
      queryClient.invalidateQueries({
        queryKey: ['estimation', estimationId, type],
      });
      if (projectHashId) {
        queryClient.invalidateQueries({
          queryKey: ['project-items', projectHashId],
        });
      }
    },
    [queryClient, estimationId, type]
  );

  const createMutation = useMutation({
    mutationFn: (item: Omit<EstimationItemPayload, 'hashId'>) =>
      createEstimationItem(item, type),
    onSuccess: (_data, variables) => {
      invalidate(variables.projectHashId);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (item: EstimationItemPayload) =>
      updateEstimationItem(item, type),
    onSuccess: (_data, variables) => {
      invalidate(variables.projectHashId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteEstimationItem(itemId, type),
    onSuccess: () => {
      invalidate();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
};
