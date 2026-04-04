import { Filter } from '@/components/ui/filters';
import { AttendanceRow } from '../../types';
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';

// Extended type for report data that includes additional fields
type AttendanceRowWithExtendedFields = AttendanceRow & {
  projectEngineerId?: string;
  supervisorId?: string;
};

export function applyFiltersToAttendanceData(
  data: AttendanceRow[],
  filters: Filter[]
): AttendanceRow[] {
  let filteredData = [...data];

  // Apply each filter
  filters.forEach((filter) => {
    if (!filter.field || !filter.values || filter.values.length === 0) {
      return;
    }

    const field = filter.field;
    const values = filter.values;

    switch (field) {
      case 'reportType':
        // Report type doesn't filter data, it's just for display grouping
        break;

      case 'projectHead':
        if (values[0]) {
          filteredData = filteredData.filter(
            (row) => row.projectHeadId === values[0]
          );
        }
        break;

      case 'engineer':
        if (values[0]) {
          filteredData = filteredData.filter(
            (row) =>
              (row as AttendanceRowWithExtendedFields).projectEngineerId ===
              values[0]
          );
        }
        break;

      case 'supervisor':
        if (values[0]) {
          filteredData = filteredData.filter(
            (row) =>
              (row as AttendanceRowWithExtendedFields).supervisorId === values[0]
          );
        }
        break;

      case 'project':
        if (values[0]) {
          filteredData = filteredData.filter(
            (row) => row.projectId === values[0]
          );
        }
        break;

      case 'worker':
        if (values[0]) {
          filteredData = filteredData.filter((row) => row.empId === values[0]);
        }
        break;

      case 'attendanceStatus':
        if (values[0]) {
          filteredData = filteredData.filter(
            (row) => row.status === values[0]
          );
        }
        break;

      case 'dateRange':
        if (values.length >= 2 && values[0] && values[1]) {
          const fromDate = parseISO(values[0] as string);
          const toDate = parseISO(values[1] as string);
          filteredData = filteredData.filter((row) => {
            const rowDate = parseISO(row.dates);
            return (
              (isAfter(rowDate, fromDate) || isEqual(rowDate, fromDate)) &&
              (isBefore(rowDate, toDate) || isEqual(rowDate, toDate))
            );
          });
        }
        break;

      case 'verificationStatus':
        if (values[0]) {
          const status = values[0] as string;
          if (status === 'checked') {
            filteredData = filteredData.filter((row) => row.isChecked);
          } else if (status === 'verified') {
            filteredData = filteredData.filter((row) => row.isVerified);
          }
          // 'all' doesn't filter
        }
        break;
    }
  });

  return filteredData;
}
