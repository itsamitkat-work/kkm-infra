import { apiFetch } from '@/lib/apiClient';
import { PaginationResponse } from '@/types/common';
import { MasterItem } from '@/hooks/items/types';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';

export const fetchItems = async (
  search: string,
  page?: number,
  pageSize?: number,
  searchField?: string,
  sorting?: SortingState,
  filters?: Record<string, Filter>,
  signal?: AbortSignal
): Promise<PaginationResponse<MasterItem>> => {
  const params = new URLSearchParams();

  // Add search parameter: if search is only numbers and dots, search by code only; otherwise by name and code
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const isCodeOnly = /^[\d.]+$/.test(trimmedSearch);
    if (isCodeOnly) {
      params.append('code', trimmedSearch);
    } else {
      params.append(searchField || 'name', trimmedSearch);
    }
  }

  // Add pagination parameters
  if (page !== undefined) params.append('page', page.toString());
  if (pageSize !== undefined) params.append('pageSize', pageSize.toString());

  // Add sorting parameters
  if (sorting && sorting.length > 0) {
    const sort = sorting[0];
    params.append('sortBy', sort.id);
    params.append('order', sort.desc ? 'desc' : 'asc');
  }

  const justificationVerificationKeys = [
    'justification-status',
    'verification-status',
  ];

  if (filters && Object.keys(filters).length > 0) {
    const justificationStatus =
      (filters['justification-status']?.values?.[0] as string) || 'ALL';
    params.append(
      'JustificationStatus',
      justificationStatus === 'WITH_JUSTIFICATION' ||
        justificationStatus === 'WITHOUT_JUSTIFICATION'
        ? justificationStatus
        : 'ALL'
    );

    const verificationStatus =
      (filters['verification-status']?.values?.[0] as string) || 'ALL';
    params.append(
      'VerificationStatus',
      verificationStatus === 'VERIFIED' || verificationStatus === 'NOT_VERIFIED'
        ? verificationStatus
        : 'ALL'
    );
  }

  // Process filters for additional query parameters
  // Supported filter fields: ScheduleRate, Rate, Unit, NickName, SubHead, Head, Code, Status
  if (filters && Object.keys(filters).length > 0) {
    for (const key in filters) {
      if (justificationVerificationKeys.includes(key)) continue;

      const filter = filters[key];
      const { operator, values } = filter;

      // Skip empty filters and searchField (handled separately)
      if (!values || values.length === 0 || key === 'searchField') continue;

      // Handle different filter operators
      switch (operator) {
        case 'between':
        case 'not_between':
          if (values.length === 2) {
            if (
              typeof values[0] === 'number' &&
              typeof values[1] === 'number'
            ) {
              params.append(`${key}_min`, values[0].toString());
              params.append(`${key}_max`, values[1].toString());
            } else {
              params.append(`${key}_from`, String(values[0]));
              params.append(`${key}_to`, String(values[1]));
            }
          }
          break;
        case 'is_any_of':
        case 'is_not_any_of':
          // Join multiple values with comma
          params.append(key, values.join(','));
          break;
        case 'greater_than':
          params.append(`${key}_gt`, String(values[0]));
          break;
        case 'less_than':
          params.append(`${key}_lt`, String(values[0]));
          break;
        case 'not_equals':
          params.append(`${key}_ne`, String(values[0]));
          break;
        case 'equals':
        case 'is':
        case 'contains':
        case 'starts_with':
        case 'ends_with':
        default:
          params.append(key, String(values[0]));
          break;
      }
    }
  }

  const queryString = params.toString();
  const url = queryString
    ? `/v2/items/search?${queryString}`
    : '/v2/items/search';

  return await apiFetch<PaginationResponse<MasterItem>>(url, {
    signal,
  });
};
