// Salary Component Types
export interface SalaryComponent {
  id: string;
  type: 'allowance' | 'deduction';
  name: string;
  amount: number;
  isPercentage: boolean;
  percentageOf?: 'basic' | 'gross';
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: number;
  components: SalaryComponent[];
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalarySummary {
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
}

// Bank Account Types
export interface BankAccount {
  id: string;
  employeeId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'savings' | 'current' | 'salary';
  isPrimary: boolean;
  isActive: boolean;
  upiId?: string;
  createdAt: string;
  updatedAt: string;
}

// Predefined salary component types
export const ALLOWANCE_TYPES = [
  { value: 'hra', label: 'House Rent Allowance (HRA)' },
  { value: 'da', label: 'Dearness Allowance (DA)' },
  { value: 'ta', label: 'Travel Allowance (TA)' },
  { value: 'medical', label: 'Medical Allowance' },
  { value: 'special', label: 'Special Allowance' },
  { value: 'conveyance', label: 'Conveyance Allowance' },
  { value: 'lta', label: 'Leave Travel Allowance (LTA)' },
  { value: 'food', label: 'Food Allowance' },
  { value: 'mobile', label: 'Mobile Allowance' },
  { value: 'other', label: 'Other Allowance' },
] as const;

export const DEDUCTION_TYPES = [
  { value: 'pf', label: 'Provident Fund (PF)' },
  { value: 'esi', label: 'Employee State Insurance (ESI)' },
  { value: 'tds', label: 'Tax Deducted at Source (TDS)' },
  { value: 'pt', label: 'Income Tax (IT)' },
  { value: 'loan', label: 'Loan Recovery' },
  { value: 'advance', label: 'Advance Recovery' },
  { value: 'insurance', label: 'Insurance Premium' },
  { value: 'other', label: 'Other Deduction' },
] as const;

export const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'salary', label: 'Salary Account' },
] as const;
