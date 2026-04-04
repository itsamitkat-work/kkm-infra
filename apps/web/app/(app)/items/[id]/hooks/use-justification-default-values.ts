'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export interface ChargeOption {
  id: string;
  label: string;
  checked: boolean;
  value: number;
}

type JustificationDefaultValuesPayload = {
  gst: number;
  waterCharge: number;
  electricityCharge: number;
  cpoh: number;
  cess: number;
};

interface JustificationDefaultValuesResponse {
  isSuccess: boolean;
  data: JustificationDefaultValuesPayload[];
  message: string;
  statusCode: number;
}

const CHARGE_LABELS: Record<string, string> = {
  water: 'Water Charges',
  electricity: 'Electricity Charges',
  gst: 'GST',
  cpoh: 'CPOH',
  cess: 'Cess',
};

function payloadToChargeOptions(
  payload: JustificationDefaultValuesPayload
): ChargeOption[] {
  return [
    {
      id: 'water',
      label: CHARGE_LABELS.water,
      checked: false,
      value: payload.waterCharge,
    },
    {
      id: 'electricity',
      label: CHARGE_LABELS.electricity,
      checked: false,
      value: payload.electricityCharge,
    },
    { id: 'gst', label: CHARGE_LABELS.gst, checked: false, value: payload.gst },
    {
      id: 'cpoh',
      label: CHARGE_LABELS.cpoh,
      checked: false,
      value: payload.cpoh,
    },
    {
      id: 'cess',
      label: CHARGE_LABELS.cess,
      checked: false,
      value: payload.cess,
    },
  ];
}

async function fetchJustificationDefaultValues(
  signal?: AbortSignal
): Promise<ChargeOption[]> {
  const response = await apiFetch<JustificationDefaultValuesResponse>(
    'v2/justification/defaultvalues',
    { signal }
  );
  if (!response.isSuccess || !response.data?.length) {
    throw new Error(
      response.message ?? 'Failed to load justification default values'
    );
  }
  return payloadToChargeOptions(response.data[0]);
}

const JUSTIFICATION_DEFAULT_VALUES_KEY = 'justification-default-values';

export function useJustificationDefaultValues() {
  return useQuery({
    queryKey: [JUSTIFICATION_DEFAULT_VALUES_KEY],
    queryFn: ({ signal }) => fetchJustificationDefaultValues(signal),
    staleTime: Infinity,
  });
}
