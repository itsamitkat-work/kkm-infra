import { Suspense } from 'react';
import { EmployeesTable } from './components/employees-table';

export default function HRPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployeesTable />
    </Suspense>
  );
}
