'use client';

import * as React from 'react';
import {
  Employee,
  CreateEmployeeData,
  UpdateEmployeeData,
} from '../types/employee';
import { PaginationResponse } from '@/types/common';
import { SortingState } from '@tanstack/react-table';
import { Filter } from '@/components/ui/filters';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export const EMPLOYEES_TABLE_ID = 'employees';

// API response wrapper type (matches API response structure)
interface EmployeesApiResponse {
  isSuccess: boolean;
  data: Array<{
    empCode: number;
    designationName: string | null;
    subDesignationName: string | null;
    employeeTypeName: string | null;
    id: string;
    name: string;
    gender: string;
    dob: string | null;
    phone: string;
    email: string | null;
    address: string | null;
    emergencyContact: string | null;
    department: string | null;
    joiningDate: string | null;
    employmentType: string | null;
    basicSalary: number | null;
    allowances: number | null;
    deductions: number | null;
    paymentMode: string | null;
    upiNo: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsccode: string | null;
    education: string | null;
    technicalSkills: string | null;
    experienceInMonths: number | null;
    experienceInWords: string | null;
    resumePath: string | null;
    adharNo: string | null;
    idProofDocument: string | null;
    designationHashId: string | null;
    subDesignationHashId: string | null;
    employeeTypeHashId: string | null;
  }>;
  message: string;
  statusCode: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// API function to fetch employees
export async function fetchEmployees(
  search: string,
  page: number = 1,
  filters?: Record<string, Filter>,
  sorting?: SortingState,
  signal?: AbortSignal
): Promise<PaginationResponse<Employee>> {
  const params = new URLSearchParams();

  // Add search parameter
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.append('Search', trimmedSearch);
  }

  // Add sorting parameters
  if (sorting && sorting.length > 0) {
    const sort = sorting[0];
    params.append('SortBy', sort.id);
    params.append('Order', sort.desc ? 'desc' : 'asc');
  }

  // Add pagination parameters
  params.append('Page', page.toString());
  params.append('PageSize', '20');

  // Add filter parameters
  if (filters) {
    if (filters.designation?.values && filters.designation.values.length > 0) {
      const value = filters.designation.values[0];
      if (typeof value === 'string') {
        params.append('designation', value);
      }
    }
    if (
      filters.subdesignation?.values &&
      filters.subdesignation.values.length > 0
    ) {
      const value = filters.subdesignation.values[0];
      if (typeof value === 'string') {
        params.append('subdesignation', value);
      }
    }
    if (filters.employeeType?.values && filters.employeeType.values.length > 0) {
      const value = filters.employeeType.values[0];
      if (typeof value === 'string') {
        params.append('employeeType', value);
      }
    }
  }

  // Build final URL
  const queryString = params.toString();
  const url = queryString ? `v2/employee?${queryString}` : 'v2/employee';

  const response = await apiFetch<EmployeesApiResponse>(url, { signal });

  // Map API response to Employee type
  const mappedData: Employee[] = response.data.map((item) => {
    // Calculate net salary
    const basicSalary = item.basicSalary ?? 0;
    const allowances = item.allowances ?? 0;
    const deductions = item.deductions ?? 0;
    const netSalary = basicSalary + allowances - deductions;

    // Map gender
    const genderMap: Record<string, 'male' | 'female' | 'other'> = {
      Male: 'male',
      Female: 'female',
      Other: 'other',
    };

    // Map employment type
    const employmentTypeMap: Record<string, 'full_time' | 'part_time' | 'contract' | 'intern'> = {
      'Full Time': 'full_time',
      'Part Time': 'part_time',
      Contract: 'contract',
      Intern: 'intern',
    };

    // Map payment mode
    const paymentModeMap: Record<string, 'bank_transfer' | 'cash' | 'upi'> = {
      'Bank Transfer': 'bank_transfer',
      Cash: 'cash',
      UPI: 'upi',
    };

    // Format dates
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    return {
      id: item.id,
      employeeCode: String(item.empCode),
      name: item.name,
      gender: genderMap[item.gender] || 'other',
      phone: item.phone,
      emergencyContact: item.emergencyContact || undefined,
      dateOfBirth: formatDate(item.dob),
      email: item.email || undefined,
      address: item.address || '',
      department: item.department || '',
      employeeType: item.employeeTypeName || '',
      employeeTypeHashId: item.employeeTypeHashId || undefined,
      designation: item.designationName || '',
      designationHashId: item.designationHashId || undefined,
      subDesignation: item.subDesignationName || undefined,
      subDesignationHashId: item.subDesignationHashId || undefined,
      joiningDate: formatDate(item.joiningDate) || '',
      employmentType:
        (item.employmentType &&
          employmentTypeMap[item.employmentType]) ||
        'full_time',
      basicSalary: basicSalary,
      allowances: allowances,
      deductions: deductions,
      netSalary: netSalary,
      paymentMode:
        (item.paymentMode && paymentModeMap[item.paymentMode]) ||
        'bank_transfer',
      upiNo: item.upiNo || undefined,
      accountNumber: item.accountNumber || undefined,
      ifscCode: item.ifsccode || undefined,
      bankName: item.bankName || undefined,
      aadhaarNumber: item.adharNo || '',
      education: item.education || undefined,
      technicalSkills: item.technicalSkills || undefined,
      experienceMonths: item.experienceInMonths || 0,
      experienceDetails: item.experienceInWords || undefined,
      createdAt: item.joiningDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    data: mappedData,
    totalCount: response.totalCount,
    totalPages: response.totalPages,
    page: response.page,
    pageSize: response.pageSize,
    hasPrevious: response.hasPrevious,
    hasNext: response.hasNext,
    isSuccess: response.isSuccess,
    statusCode: response.statusCode,
    message: response.message,
  };
}

// API response type for create employee
interface CreateEmployeeApiResponse {
  isSuccess: boolean;
  data: {
    empCode: number;
    designationName: string | null;
    subDesignationName: string | null;
    employeeTypeName: string | null;
    id: string;
    name: string;
    gender: string;
    dob: string | null;
    phone: string;
    email: string | null;
    address: string | null;
    emergencyContact: string | null;
    department: string | null;
    joiningDate: string | null;
    employmentType: string | null;
    basicSalary: number | null;
    allowances: number | null;
    deductions: number | null;
    paymentMode: string | null;
    upiNo: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsccode: string | null;
    education: string | null;
    technicalSkills: string | null;
    experienceInMonths: number | null;
    experienceInWords: string | null;
    resumePath: string | null;
    adharNo: string | null;
    idProofDocument: string | null;
    designationHashId: string | null;
    subDesignationHashId: string | null;
    employeeTypeHashId: string | null;
  };
  message: string;
  statusCode: number;
}

// Create employee
export async function createEmployee(
  data: CreateEmployeeData
): Promise<Employee> {
  // Map gender from form to API format
  const genderMap: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  };

  // Map employment type from form to API format
  const employmentTypeMap: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    intern: 'Intern',
  };

  // Map payment mode from form to API format
  const paymentModeMap: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    upi: 'UPI',
  };

  // Format date to ISO string
  const formatDateToISO = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    try {
      // If already in ISO format, return as is
      if (dateStr.includes('T')) {
        return dateStr;
      }
      // If in YYYY-MM-DD format, convert to ISO
      const date = new Date(dateStr);
      return date.toISOString();
    } catch {
      return null;
    }
  };

  // Prepare API payload
  const payload = {
    name: data.name,
    gender: genderMap[data.gender] || data.gender,
    dob: formatDateToISO(data.dateOfBirth),
    phone: data.phone,
    email: data.email || null,
    address: data.address,
    emergencyContact: data.emergencyContact || null,
    department: data.department || null,
    designation: null, // API might use this for name, but we're using hashId
    joiningDate: formatDateToISO(data.joiningDate),
    employmentType: employmentTypeMap[data.employmentType] || data.employmentType,
    basicSalary: data.basicSalary || 0,
    allowances: data.allowances || 0,
    deductions: data.deductions || 0,
    paymentMode: paymentModeMap[data.paymentMode] || null,
    upiNo: data.upiNo || null,
    bankName: data.bankName || null,
    accountNumber: data.accountNumber || null,
    ifsccode: data.ifscCode || null,
    education: data.education || null,
    technicalSkills: data.technicalSkills || null,
    experienceInMonths: data.experienceMonths || 0,
    experienceInWords: data.experienceDetails || null,
    resumePath: null,
    adharNo: data.aadhaarNumber || null,
    idProofDocument: null,
    // The form should provide hashIds from the API options
    designationHashId: data.designation || null,
    subDesignationHashId: data.subDesignation || null,
    employeeTypeHashId: data.employeeType || null,
  };

  const response = await apiFetch<CreateEmployeeApiResponse>('v2/employee', {
    method: 'POST',
    data: payload,
  });

  // Map API response back to Employee type
  const item = response.data;
  const basicSalary = item.basicSalary ?? 0;
  const allowances = item.allowances ?? 0;
  const deductions = item.deductions ?? 0;
  const netSalary = basicSalary + allowances - deductions;

  // Map gender back
  const genderMapReverse: Record<string, 'male' | 'female' | 'other'> = {
    Male: 'male',
    Female: 'female',
    Other: 'other',
  };

  // Map employment type back
  const employmentTypeMapReverse: Record<string, 'full_time' | 'part_time' | 'contract' | 'intern'> = {
    'Full Time': 'full_time',
    'Part Time': 'part_time',
    Contract: 'contract',
    Intern: 'intern',
  };

  // Map payment mode back
  const paymentModeMapReverse: Record<string, 'bank_transfer' | 'cash' | 'upi'> = {
    'Bank Transfer': 'bank_transfer',
    Cash: 'cash',
    UPI: 'upi',
  };

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return {
    id: item.id,
    employeeCode: String(item.empCode),
    name: item.name,
    gender: genderMapReverse[item.gender] || 'other',
    phone: item.phone,
    emergencyContact: item.emergencyContact || undefined,
    dateOfBirth: formatDate(item.dob),
    email: item.email || undefined,
    address: item.address || '',
    department: item.department || '',
    employeeType: item.employeeTypeName || '',
    designation: item.designationName || '',
    subDesignation: item.subDesignationName || undefined,
    joiningDate: formatDate(item.joiningDate) || '',
    employmentType:
      (item.employmentType &&
        employmentTypeMapReverse[item.employmentType]) ||
      'full_time',
    basicSalary: basicSalary,
    allowances: allowances,
    deductions: deductions,
    netSalary: netSalary,
    paymentMode:
      (item.paymentMode && paymentModeMapReverse[item.paymentMode]) ||
      'bank_transfer',
    upiNo: item.upiNo || undefined,
    accountNumber: item.accountNumber || undefined,
    ifscCode: item.ifsccode || undefined,
    bankName: item.bankName || undefined,
    aadhaarNumber: item.adharNo || '',
    education: item.education || undefined,
    technicalSkills: item.technicalSkills || undefined,
    experienceMonths: item.experienceInMonths || 0,
    experienceDetails: item.experienceInWords || undefined,
    createdAt: item.joiningDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Update employee (placeholder - implement when API is available)
export async function updateEmployee(
  data: UpdateEmployeeData
): Promise<Employee> {
  // TODO: Implement API call when endpoint is available
  throw new Error('Update employee API not implemented yet');
}

// Delete employee (placeholder - implement when API is available)
export async function deleteEmployee(id: string): Promise<void> {
  // TODO: Implement API call when endpoint is available
  throw new Error('Delete employee API not implemented yet');
}

// React Query hooks
type UseEmployeesQueryParams = {
  search: string;
  filters: Filter[];
  sorting: SortingState;
};

export function useEmployeesQuery({
  search,
  filters,
  sorting,
}: UseEmployeesQueryParams) {
  const queryClient = useQueryClient();

  const combinedFilters = React.useMemo(() => {
    const map: Record<string, Filter> = {};
    filters.forEach((filter) => {
      map[filter.field] = filter;
    });
    return map;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: [EMPLOYEES_TABLE_ID, [search, filters, sorting]],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchEmployees(search, pageParam, combinedFilters, sorting, signal),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  return {
    query,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_TABLE_ID] }),
  };
}

// Mutations
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_TABLE_ID] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_TABLE_ID] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_TABLE_ID] });
    },
  });
}
