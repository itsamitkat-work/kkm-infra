'use client';

import * as React from 'react';
import { Employee } from '@/app/(app)/hr/employees/types/employee';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Building,
  Edit,
  Hash,
} from 'lucide-react';
import { formatDateSlash } from '@/lib/utils';
import {
  DEPARTMENT_OPTIONS,
  DESIGNATION_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
} from '@/app/(app)/hr/employees/types/employee';

interface EmployeeOverviewProps {
  employee: Employee;
  onEdit: () => void;
}

function getLabelFromValue(
  options: readonly { value: string; label: string }[],
  value: string
): string {
  return options.find((opt) => opt.value === value)?.label || value;
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getEmploymentTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'full_time':
      return 'default';
    case 'part_time':
      return 'secondary';
    case 'contract':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function EmployeeOverview({ employee, onEdit }: EmployeeOverviewProps) {
  return (
    <div className='space-y-6'>
      {/* Header with Avatar and Basic Info */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-4'>
          <Avatar className='h-20 w-20'>
            <AvatarFallback className='bg-primary/10 text-primary text-xl font-semibold'>
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className='space-y-1'>
            <h2 className='text-2xl font-bold text-foreground'>
              {employee.name}
            </h2>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <Hash className='h-4 w-4' />
              <span className='text-sm font-medium'>
                {employee.employeeCode}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant={getEmploymentTypeBadgeVariant(employee.employmentType)}
              >
                {getLabelFromValue(
                  EMPLOYMENT_TYPE_OPTIONS,
                  employee.employmentType
                )}
              </Badge>
              <Badge variant='outline'>
                {getLabelFromValue(
                  EMPLOYEE_TYPE_OPTIONS,
                  employee.employeeType
                )}
              </Badge>
            </div>
          </div>
        </div>
        <Button size='sm' onClick={onEdit}>
          <Edit className='mr-2 h-4 w-4' />
          Edit Employee
        </Button>
      </div>

      {/* Single Consolidated Info Box */}
      <div className='border rounded-lg p-4 sm:p-6 space-y-6'>
        {/* Personal Information */}
        <div className='space-y-3'>
          <h3 className='text-base font-semibold text-foreground'>
            Personal Information
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3'>
            <InfoItem icon={User} label='Gender'>
              {employee.gender.charAt(0).toUpperCase() +
                employee.gender.slice(1)}
            </InfoItem>
            <InfoItem icon={Phone} label='Phone'>
              {employee.phone}
            </InfoItem>
            {employee.emergencyContact && (
              <InfoItem icon={Phone} label='Emergency Contact'>
                {employee.emergencyContact}
              </InfoItem>
            )}
            {employee.email && (
              <InfoItem icon={Mail} label='Email'>
                {employee.email}
              </InfoItem>
            )}
            {employee.dateOfBirth && (
              <InfoItem icon={Calendar} label='Date of Birth'>
                {formatDateSlash(employee.dateOfBirth)}
              </InfoItem>
            )}
            <InfoItem
              icon={MapPin}
              label='Address'
              className='sm:col-span-2 lg:col-span-4'
            >
              {employee.address}
            </InfoItem>
          </div>
        </div>

        {/* Work Information */}
        <div className='space-y-3'>
          <h3 className='text-base font-semibold text-foreground'>
            Work Information
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3'>
            <InfoItem icon={Building} label='Department'>
              {getLabelFromValue(DEPARTMENT_OPTIONS, employee.department)}
            </InfoItem>
            <InfoItem icon={Briefcase} label='Designation'>
              {getLabelFromValue(DESIGNATION_OPTIONS, employee.designation)}
            </InfoItem>
            {employee.subDesignation && (
              <InfoItem icon={Briefcase} label='Sub-Designation'>
                {employee.subDesignation}
              </InfoItem>
            )}
            <InfoItem icon={Calendar} label='Joining Date'>
              {formatDateSlash(employee.joiningDate)}
            </InfoItem>
          </div>
        </div>

        {/* Educational Information */}
        <div className='space-y-3'>
          <h3 className='text-base font-semibold text-foreground'>
            Educational Details
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3'>
            {employee.education && (
              <InfoItem label='Education'>{employee.education}</InfoItem>
            )}
            <InfoItem label='Experience'>
              {employee.experienceMonths} months
            </InfoItem>
            {employee.technicalSkills && (
              <InfoItem
                label='Technical Skills'
                className='sm:col-span-2 lg:col-span-4'
              >
                {employee.technicalSkills}
              </InfoItem>
            )}
            {employee.experienceDetails && (
              <InfoItem
                label='Experience Details'
                className='sm:col-span-2 lg:col-span-4'
              >
                {employee.experienceDetails}
              </InfoItem>
            )}
          </div>
        </div>

        {/* ID Information */}
        <div className='space-y-3'>
          <h3 className='text-base font-semibold text-foreground'>
            Identification
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3'>
            <InfoItem label='Aadhaar Number'>
              {employee.aadhaarNumber.replace(
                /(\d{4})(\d{4})(\d{4})/,
                '$1 $2 $3'
              )}
            </InfoItem>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon?: React.ElementType;
  label: string;
  children: React.ReactNode;
  className?: string;
}

function InfoItem({ icon: Icon, label, children, className }: InfoItemProps) {
  return (
    <div className={`space-y-0.5 ${className || ''}`}>
      <label className='text-xs font-medium text-muted-foreground flex items-center gap-1.5'>
        {Icon && <Icon className='h-3.5 w-3.5' />}
        {label}
      </label>
      <div className='text-sm text-foreground'>{children}</div>
    </div>
  );
}
