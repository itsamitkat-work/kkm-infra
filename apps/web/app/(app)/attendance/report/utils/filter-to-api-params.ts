import { Filter } from '@/components/ui/filters';
import { AttendanceReportParams } from '../types';

export function convertFiltersToApiParams(
  filters: Filter[]
): AttendanceReportParams {
  const params: AttendanceReportParams = {};

  filters.forEach((filter) => {
    if (!filter.field || !filter.values || filter.values.length === 0) {
      return;
    }

    const field = filter.field;
    const values = filter.values;

    switch (field) {
      case 'dateRange':
        if (values.length >= 2 && values[0] && values[1]) {
          params.StartDate = values[0] as string;
          params.EndDate = values[1] as string;
        }
        break;

      case 'supervisor':
        if (values[0]) {
          params.SuperviserId = values[0] as string;
        }
        break;

      case 'worker':
        if (values[0]) {
          params.EmployeeId = values[0] as string;
        }
        break;

      case 'project':
        if (values[0]) {
          params.ProjectId = values[0] as string;
        }
        break;

      case 'projectHead':
        if (values[0]) {
          params.ProjectHeadId = values[0] as string;
        }
        break;

      case 'engineer':
        if (values[0]) {
          params.ProjectEngineerId = values[0] as string;
        }
        break;

      case 'verificationStatus':
        if (values[0]) {
          const status = values[0] as string;
          if (status === 'checked') {
            params.IsChecked = true;
          } else if (status === 'verified') {
            params.IsVerified = true;
          }
          // 'all' doesn't set any parameter
        }
        break;

      case 'reportType':
        if (values[0]) {
          // Convert string value to number for ReportNo
          const reportNo = Number(values[0]);
          if (!isNaN(reportNo)) {
            params.ReportNo = reportNo;
          }
        }
        break;

      // attendanceStatus is not in the API parameters, so we skip it
    }
  });

  return params;
}
