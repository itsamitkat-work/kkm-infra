import { FilterFieldsConfig } from '@/components/ui/filters';

export function getEmployeeFilterFields(
  designations: Array<{ value: string; label: string }>,
  employeeTypes: Array<{ value: string; label: string }>
): FilterFieldsConfig {
  return [
    {
      key: 'employeeType',
      label: 'Employee Type',
      type: 'select',
      options: employeeTypes,
    },
    {
      key: 'designation',
      label: 'Designation',
      type: 'select',
      options: designations,
    }
  ];
}
