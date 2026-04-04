export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  email?: string;
  address: string;
  department: string;
  employeeType: string;
  employeeTypeHashId?: string;
  designation: string;
  designationHashId?: string;
  subDesignation?: string;
  subDesignationHashId?: string;
  joiningDate: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentMode: 'bank_transfer' | 'cash' | 'upi';
  upiNo?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  aadhaarNumber: string;
  education?: string;
  technicalSkills?: string;
  experienceMonths: number;
  experienceDetails?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateEmployeeData = Omit<
  Employee,
  'id' | 'employeeCode' | 'createdAt' | 'updatedAt' | 'netSalary'
>;

export type UpdateEmployeeData = Partial<CreateEmployeeData> & { id: string };

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
] as const;

export const PAYMENT_MODE_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
] as const;

export const DEPARTMENT_OPTIONS = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'admin', label: 'Administration' },
  { value: 'marketing', label: 'Marketing' },
] as const;

export const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'probation', label: 'Probation' },
] as const;

export const DESIGNATION_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'senior_engineer', label: 'Senior Engineer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'junior_engineer', label: 'Junior Engineer' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'technician', label: 'Technician' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'executive', label: 'Executive' },
] as const;
