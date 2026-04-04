import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceReportRecord,
  AttendanceReportRecordType1,
  AttendanceReportRecordType2,
  AttendanceReportRecordType3,
  AttendanceReportRecordType4,
  AttendanceReportRecordType5,
} from '../types';

// Type guards
function isType1(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType1 {
  return 'employeeName' in record;
}

function isType2(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType2 {
  return 'months' in record && 'projectName' in record && 'employee' in record;
}

function isType3(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType3 {
  return 'years' in record && 'projectName' in record && 'hours' in record;
}

function isType4(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType4 {
  return (
    'date' in record &&
    'project' in record &&
    'employee' in record &&
    'att' in record
  );
}

function isType5(
  record: AttendanceReportRecord
): record is AttendanceReportRecordType5 {
  return (
    'months' in record &&
    'projectName' in record &&
    'designation' in record &&
    'hours' in record &&
    typeof (record as AttendanceReportRecordType5).days === 'number'
  );
}

export interface AttendanceReportExportData {
  reportName: string;
  records: AttendanceReportRecord[];
  dateRange?: { start?: string; end?: string };
}

/**
 * Format currency for export
 */
function formatCurrencyForExport(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || amount === 0)
    return 'Rs. 0.00';
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get headers based on record type
 */
function getHeaders(records: AttendanceReportRecord[]): string[] {
  if (records.length === 0) return [];

  const firstRecord = records[0];

  if (isType1(firstRecord)) {
    return [
      'Sr No',
      'Employee Name',
      'Absent',
      'Leave',
      'Present',
      'Working Hours',
      'Working Days',
      'Incentive',
      'Salary',
    ];
  }

  if (isType2(firstRecord)) {
    return [
      'Sr No',
      'Month',
      'Project Name',
      'Employee',
      'Total Worked Hours',
      'Days',
    ];
  }

  if (isType3(firstRecord)) {
    return ['Sr No', 'Year', 'Project Name', 'Designation', 'Hours', 'Days'];
  }

  if (isType4(firstRecord)) {
    return [
      'Sr No',
      'Date',
      'Project',
      'Employee',
      'In Time',
      'Out Time',
      'Total Hours',
      'Attendance',
      'Incentive',
      'Remarks',
    ];
  }

  if (isType5(firstRecord)) {
    return ['Sr No', 'Month', 'Project Name', 'Designation', 'Hours', 'Days'];
  }

  return [];
}

/**
 * Convert record to row data based on type
 */
function recordToRow(
  record: AttendanceReportRecord,
  index: number
): (string | number)[] {
  if (isType1(record)) {
    return [
      index + 1,
      record.employeeName,
      record.absent,
      record.leave,
      record.persent,
      record.workingHours,
      record.workingDays,
      record.incentive,
      record.salary,
    ];
  }

  if (isType2(record)) {
    return [
      index + 1,
      record.months,
      record.projectName,
      record.employee,
      record.totalWorkedHours,
      record.days,
    ];
  }

  if (isType3(record)) {
    return [
      index + 1,
      record.years,
      record.projectName,
      record.designation || '—',
      record.hours,
      record.days,
    ];
  }

  if (isType4(record)) {
    return [
      index + 1,
      record.date,
      record.project,
      record.employee,
      record.inTime,
      record.outTime,
      record.totalHours,
      record.att,
      record.incentive,
      record.remarks || '—',
    ];
  }

  if (isType5(record)) {
    return [
      index + 1,
      record.months,
      record.projectName,
      record.designation || '—',
      record.hours,
      record.days,
    ];
  }

  return [index + 1];
}

/**
 * Export attendance report to Excel
 */
export function exportAttendanceReportToExcel(
  data: AttendanceReportExportData
) {
  const { reportName, records, dateRange } = data;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create Summary Sheet
  const summaryData: (string | number)[][] = [
    ['Attendance Report'],
    [''],
    ['Report Type', reportName],
    ['Total Records', records.length],
  ];

  if (dateRange?.start || dateRange?.end) {
    summaryData.push([
      'Date Range',
      `${dateRange.start || 'N/A'} to ${dateRange.end || 'N/A'}`,
    ]);
  }

  summaryData.push(['Generated On', new Date().toLocaleString('en-IN')]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Create Main Data Sheet
  const headers = getHeaders(records);
  const mainData: (string | number)[][] = [headers];

  records.forEach((record, index) => {
    mainData.push(recordToRow(record, index));
  });

  const mainSheet = XLSX.utils.aoa_to_sheet(mainData);

  // Set column widths
  mainSheet['!cols'] = headers.map((_, i) => ({
    wch: i === 0 ? 8 : 20,
  }));

  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Report Data');

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const sanitizedReportName = reportName
    .replace(/[^a-zA-Z0-9]/g, '-')
    .slice(0, 30);
  const filename = `attendance-report-${sanitizedReportName}-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export attendance report to PDF
 */
export function exportAttendanceReportToPDF(data: AttendanceReportExportData) {
  const { reportName, records, dateRange } = data;

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Add report name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(reportName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  // Add date range if available
  if (dateRange?.start || dateRange?.end) {
    doc.setFontSize(10);
    doc.text(
      `Date Range: ${dateRange.start || 'N/A'} to ${dateRange.end || 'N/A'}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 6;
  }

  // Add generation date
  doc.setFontSize(10);
  doc.text(
    `Generated on: ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 10;

  // Add Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPosition);
  yPosition += 7;

  // Summary Table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Report Type', reportName],
      ['Total Records', records.length.toString()],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Add Main Data Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Data', 14, yPosition);
  yPosition += 5;

  // Prepare table data
  const headers = getHeaders(records);
  const tableData: (string | number)[][] = records.map((record, index) =>
    recordToRow(record, index)
  );

  // Create main data table
  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    margin: { left: 14, right: 14 },
    didDrawPage: function () {
      // Footer
      const pageCount = doc.getNumberOfPages();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const sanitizedReportName = reportName
    .replace(/[^a-zA-Z0-9]/g, '-')
    .slice(0, 30);
  const filename = `attendance-report-${sanitizedReportName}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
