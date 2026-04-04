'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/use-auth';
import { postIndent, type IndentItemPayload } from '../api/indent-api';
import { INDENT_DETAILS_QUERY_KEY } from './use-indent-details-query';

export type IndentCheckPayload = {
  hashId: string;
  currentIsVerified: number;
  projectId?: string;
  projectItemId?: string;
  basicRateId?: string;
  quantity: number;
};

export type IndentVerifyPayload = {
  hashId: string;
  currentIsChecked: number;
  projectId?: string;
  projectItemId?: string;
  basicRateId?: string;
  quantity: number;
};

function buildCheckPayload(
  payload: IndentCheckPayload,
  checkerId: string
): IndentItemPayload[] {
  return [
    {
      hashId: payload.hashId,
      checkerId,
      isChecked: 1,
      isVerified: payload.currentIsVerified,
      quantity: payload.quantity,
      projectId: payload.projectId,
      projectItemId: payload.projectItemId,
      basicRateId: payload.basicRateId,
    },
  ];
}

function buildVerifyPayload(
  payload: IndentVerifyPayload,
  verifierId: string
): IndentItemPayload[] {
  return [
    {
      hashId: payload.hashId,
      verifierId,
      isChecked: payload.currentIsChecked,
      isVerified: 1,
      quantity: payload.quantity,
      projectId: payload.projectId,
      projectItemId: payload.projectItemId,
      basicRateId: payload.basicRateId,
    },
  ];
}

export function useIndentCheckMutation() {
  const queryClient = useQueryClient();
  const { getUser } = useAuth();

  return useMutation({
    mutationFn: (payload: IndentCheckPayload) => {
      const userHashId = getUser()?.hashId;
      if (!userHashId) throw new Error('User not found');
      return postIndent(buildCheckPayload(payload, userHashId));
    },
    onSuccess: () => {
      toast.success('Marked as checked.');
      queryClient.invalidateQueries({ queryKey: [INDENT_DETAILS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to mark as checked.');
    },
  });
}

export function useIndentVerifyMutation() {
  const queryClient = useQueryClient();
  const { getUser } = useAuth();

  return useMutation({
    mutationFn: (payload: IndentVerifyPayload) => {
      const userHashId = getUser()?.hashId;
      if (!userHashId) throw new Error('User not found');
      return postIndent(buildVerifyPayload(payload, userHashId));
    },
    onSuccess: () => {
      toast.success('Marked as verified.');
      queryClient.invalidateQueries({ queryKey: [INDENT_DETAILS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to mark as verified.');
    },
  });
}
