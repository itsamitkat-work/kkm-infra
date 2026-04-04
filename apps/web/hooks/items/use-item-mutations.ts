'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import { ITEMS_TABLE_ID } from './use-items-query';

interface ItemPayloadBase {
  parentId: string | undefined;
  head: string;
  subHead: string;
  name: string;
  unit: string;
  nickName: string;
  rate: number;
  scheduleRate: string;
  clientHashId: string;
  dsrCode: string;
  types: 'FinishedItem' | null;
}

export interface CreateItemData extends ItemPayloadBase {
  code: string;
}

export interface UpdateItemData extends ItemPayloadBase {
  hashId: string;
  code: string; // BE expect it however it should not as we can not update code
}

const createItem = async (data: CreateItemData): Promise<unknown> => {
  return apiFetch<unknown>('v2/items/add', {
    method: 'POST',
    data,
  });
};

const updateItem = async (data: UpdateItemData): Promise<unknown> => {
  return apiFetch<unknown>('v2/items/edit', {
    method: 'PUT',
    data,
  });
};

const deleteItem = async (hashId: string): Promise<unknown> => {
  return apiFetch<unknown>(`v2/items/${encodeURIComponent(hashId)}`, {
    method: 'DELETE',
  });
};

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createItem,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_TABLE_ID] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItem,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_TABLE_ID] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItem,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_TABLE_ID] });
    },
  });
}
