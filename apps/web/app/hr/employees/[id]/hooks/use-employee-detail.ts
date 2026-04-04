'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Employee } from '@/app/(app)/hr/employees/types/employee';
import {
  SalaryStructure,
  SalaryComponent,
  SalarySummary,
  BankAccount,
} from '../types';

// Mock salary structures
const mockSalaryStructures: SalaryStructure[] = [
  {
    id: 'sal-1',
    employeeId: '1',
    basicSalary: 50000,
    components: [
      {
        id: 'comp-1',
        type: 'allowance',
        name: 'House Rent Allowance (HRA)',
        amount: 20000,
        isPercentage: false,
        effectiveFrom: '2022-01-15',
        isActive: true,
      },
      {
        id: 'comp-2',
        type: 'allowance',
        name: 'Dearness Allowance (DA)',
        amount: 5000,
        isPercentage: false,
        effectiveFrom: '2022-01-15',
        isActive: true,
      },
      {
        id: 'comp-3',
        type: 'allowance',
        name: 'Travel Allowance (TA)',
        amount: 3000,
        isPercentage: false,
        effectiveFrom: '2022-01-15',
        isActive: true,
      },
      {
        id: 'comp-4',
        type: 'deduction',
        name: 'Provident Fund (PF)',
        amount: 6000,
        isPercentage: false,
        effectiveFrom: '2022-01-15',
        isActive: true,
      },
      {
        id: 'comp-5',
        type: 'deduction',
        name: 'Income Tax (IT)',
        amount: 200,
        isPercentage: false,
        effectiveFrom: '2022-01-15',
        isActive: true,
      },
    ],
    effectiveFrom: '2022-01-15',
    isActive: true,
    createdAt: '2022-01-15T00:00:00',
    updatedAt: '2024-01-15T00:00:00',
  },
];

// Mock bank accounts
let mockBankAccounts: BankAccount[] = [
  {
    id: 'bank-1',
    employeeId: '1',
    accountHolderName: 'Rahul Sharma',
    accountNumber: '1234567890',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank',
    branchName: 'Connaught Place',
    accountType: 'salary',
    isPrimary: true,
    isActive: true,
    createdAt: '2022-01-15T00:00:00',
    updatedAt: '2024-01-15T00:00:00',
  },
  {
    id: 'bank-2',
    employeeId: '1',
    accountHolderName: 'Rahul Sharma',
    accountNumber: '9876543210',
    ifscCode: 'SBIN0005678',
    bankName: 'State Bank of India',
    branchName: 'Rajouri Garden',
    accountType: 'savings',
    isPrimary: false,
    isActive: true,
    upiId: 'rahul@sbi',
    createdAt: '2023-06-01T00:00:00',
    updatedAt: '2023-06-01T00:00:00',
  },
];

// Simulated delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch single employee
async function fetchEmployee(id: string): Promise<Employee | null> {
  await delay(300);

  // Import mock data dynamically to avoid circular dependency
  const { fetchEmployees } =
    await import('@/app/(app)/hr/employees/hooks/use-employees-query');
  const result = await fetchEmployees('', 1, {}, []);
  const employee = result.data.find((emp) => emp.id === id);
  return employee || null;
}

// Fetch salary structure for employee
async function fetchSalaryStructure(
  employeeId: string
): Promise<SalaryStructure | null> {
  await delay(200);
  return (
    mockSalaryStructures.find(
      (s) => s.employeeId === employeeId && s.isActive
    ) || null
  );
}

// Fetch bank accounts for employee
async function fetchBankAccounts(employeeId: string): Promise<BankAccount[]> {
  await delay(200);
  return mockBankAccounts.filter(
    (b) => b.employeeId === employeeId && b.isActive
  );
}

// Calculate salary summary
export function calculateSalarySummary(
  structure: SalaryStructure | null
): SalarySummary {
  if (!structure) {
    return {
      basicSalary: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      grossSalary: 0,
      netSalary: 0,
    };
  }

  const totalAllowances = structure.components
    .filter((c) => c.type === 'allowance' && c.isActive)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalDeductions = structure.components
    .filter((c) => c.type === 'deduction' && c.isActive)
    .reduce((sum, c) => sum + c.amount, 0);

  const grossSalary = structure.basicSalary + totalAllowances;
  const netSalary = grossSalary - totalDeductions;

  return {
    basicSalary: structure.basicSalary,
    totalAllowances,
    totalDeductions,
    grossSalary,
    netSalary,
  };
}

// Mutations
async function updateBasicSalary(data: {
  employeeId: string;
  basicSalary: number;
}): Promise<SalaryStructure> {
  await delay(300);

  const index = mockSalaryStructures.findIndex(
    (s) => s.employeeId === data.employeeId && s.isActive
  );

  if (index === -1) {
    // Create new salary structure
    const newStructure: SalaryStructure = {
      id: `sal-${Date.now()}`,
      employeeId: data.employeeId,
      basicSalary: data.basicSalary,
      components: [],
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockSalaryStructures.push(newStructure);
    return newStructure;
  }

  mockSalaryStructures[index] = {
    ...mockSalaryStructures[index],
    basicSalary: data.basicSalary,
    updatedAt: new Date().toISOString(),
  };

  return mockSalaryStructures[index];
}

async function addSalaryComponent(data: {
  employeeId: string;
  component: Omit<SalaryComponent, 'id'>;
}): Promise<SalaryComponent> {
  await delay(300);

  const structureIndex = mockSalaryStructures.findIndex(
    (s) => s.employeeId === data.employeeId && s.isActive
  );

  if (structureIndex === -1) {
    throw new Error('Salary structure not found');
  }

  const newComponent: SalaryComponent = {
    ...data.component,
    id: `comp-${Date.now()}`,
  };

  mockSalaryStructures[structureIndex].components.push(newComponent);
  mockSalaryStructures[structureIndex].updatedAt = new Date().toISOString();

  return newComponent;
}

async function updateSalaryComponent(data: {
  employeeId: string;
  component: SalaryComponent;
}): Promise<SalaryComponent> {
  await delay(300);

  const structureIndex = mockSalaryStructures.findIndex(
    (s) => s.employeeId === data.employeeId && s.isActive
  );

  if (structureIndex === -1) {
    throw new Error('Salary structure not found');
  }

  const componentIndex = mockSalaryStructures[
    structureIndex
  ].components.findIndex((c) => c.id === data.component.id);

  if (componentIndex === -1) {
    throw new Error('Component not found');
  }

  mockSalaryStructures[structureIndex].components[componentIndex] =
    data.component;
  mockSalaryStructures[structureIndex].updatedAt = new Date().toISOString();

  return data.component;
}

async function deleteSalaryComponent(data: {
  employeeId: string;
  componentId: string;
}): Promise<void> {
  await delay(300);

  const structureIndex = mockSalaryStructures.findIndex(
    (s) => s.employeeId === data.employeeId && s.isActive
  );

  if (structureIndex === -1) {
    throw new Error('Salary structure not found');
  }

  mockSalaryStructures[structureIndex].components = mockSalaryStructures[
    structureIndex
  ].components.filter((c) => c.id !== data.componentId);
  mockSalaryStructures[structureIndex].updatedAt = new Date().toISOString();
}

async function addBankAccount(
  data: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BankAccount> {
  await delay(300);

  // If this is primary, make others non-primary
  if (data.isPrimary) {
    mockBankAccounts = mockBankAccounts.map((b) =>
      b.employeeId === data.employeeId ? { ...b, isPrimary: false } : b
    );
  }

  const newAccount: BankAccount = {
    ...data,
    id: `bank-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockBankAccounts.push(newAccount);
  return newAccount;
}

async function updateBankAccount(data: BankAccount): Promise<BankAccount> {
  await delay(300);

  const index = mockBankAccounts.findIndex((b) => b.id === data.id);
  if (index === -1) {
    throw new Error('Bank account not found');
  }

  // If this is primary, make others non-primary
  if (data.isPrimary) {
    mockBankAccounts = mockBankAccounts.map((b) =>
      b.employeeId === data.employeeId && b.id !== data.id
        ? { ...b, isPrimary: false }
        : b
    );
  }

  mockBankAccounts[index] = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  return mockBankAccounts[index];
}

async function deleteBankAccount(id: string): Promise<void> {
  await delay(300);
  mockBankAccounts = mockBankAccounts.filter((b) => b.id !== id);
}

// React Query Hooks
export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
    enabled: !!id,
  });
}

export function useSalaryStructure(employeeId: string) {
  return useQuery({
    queryKey: ['salary-structure', employeeId],
    queryFn: () => fetchSalaryStructure(employeeId),
    enabled: !!employeeId,
  });
}

export function useBankAccounts(employeeId: string) {
  return useQuery({
    queryKey: ['bank-accounts', employeeId],
    queryFn: () => fetchBankAccounts(employeeId),
    enabled: !!employeeId,
  });
}

export function useUpdateBasicSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBasicSalary,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['salary-structure', variables.employeeId],
      });
    },
  });
}

export function useAddSalaryComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addSalaryComponent,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['salary-structure', variables.employeeId],
      });
    },
  });
}

export function useUpdateSalaryComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSalaryComponent,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['salary-structure', variables.employeeId],
      });
    },
  });
}

export function useDeleteSalaryComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSalaryComponent,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['salary-structure', variables.employeeId],
      });
    },
  });
}

export function useAddBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addBankAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['bank-accounts', data.employeeId],
      });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBankAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['bank-accounts', data.employeeId],
      });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['bank-accounts'],
      });
    },
  });
}
