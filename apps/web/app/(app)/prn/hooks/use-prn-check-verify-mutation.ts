'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth';
import { postPrn, type PrnItemPayload } from '../api/prn-api';
import { PRN_DETAILS_QUERY_KEY } from './use-prn-details-query';

export type PrnCheckPayload = {
  hashId: string;
  currentIsVerified: number;
  projectId?: string;
  projectItemId?: string;
  basicRateId?: string;
  quantity: number;
};

export type PrnVerifyPayload = {
  hashId: string;
  currentIsChecked: number;
  projectId?: string;
  projectItemId?: string;
  basicRateId?: string;
  quantity: number;
};

function buildCheckPayload(
  payload: PrnCheckPayload,
  checkerId: string
): PrnItemPayload[] {
  return [
    {
      hashId: payload.hashId,
      checkerHashID: checkerId,
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
  payload: PrnVerifyPayload,
  verifierId: string
): PrnItemPayload[] {
  return [
    {
      hashId: payload.hashId,
      verifierHashID: verifierId,
      isChecked: payload.currentIsChecked,
      isVerified: 1,
      quantity: payload.quantity,
      projectId: payload.projectId,
      projectItemId: payload.projectItemId,
      basicRateId: payload.basicRateId,
    },
  ];
}

export function usePrnCheckMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: PrnCheckPayload) => {
      const userHashId = user?.hashId;
      if (!userHashId) throw new Error('User not found');
      return postPrn(buildCheckPayload(payload, userHashId));
    },
    onSuccess: () => {
      toast.success('Marked as checked.');
      queryClient.invalidateQueries({ queryKey: [PRN_DETAILS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to mark as checked.');
    },
  });
}

export function usePrnVerifyMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: PrnVerifyPayload) => {
      const userHashId = user?.hashId;
      if (!userHashId) throw new Error('User not found');
      return postPrn(buildVerifyPayload(payload, userHashId));
    },
    onSuccess: () => {
      toast.success('Marked as verified.');
      queryClient.invalidateQueries({ queryKey: [PRN_DETAILS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to mark as verified.');
    },
  });
}
