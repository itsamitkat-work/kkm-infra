'use client';

import { Suspense } from 'react';
import { ReportTable } from './components/report-table';

export default function AttendanceReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportTable />
    </Suspense>
  );
}
