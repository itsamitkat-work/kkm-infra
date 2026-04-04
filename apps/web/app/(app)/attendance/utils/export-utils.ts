import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRow } from '../types';
import {
  calculateDuration,
  calculateOvertime,
  getConfigForProject,
} from '../config/attendance-config';
import type { AttendanceConfig } from '../config/attendance-config';

export interface AttendanceExportData {
  date: string;
  workers: AttendanceRow[];
  config?: AttendanceConfig;
}

/**
 * Format currency for export
 */
function formatCurrencyForExport(amount: number | null): string {
  if (!amount || amount === 0) return 'Rs. 0.00';
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format time for display (removes date part if present)
 */
function formatTimeForDisplay(time: string | null): string {
  if (!time) return '—';
  // If it's an ISO string, extract just the time part
  if (time.includes('T')) {
    const timePart = time.split('T')[1];
    return timePart.split('.')[0].substring(0, 5); // "09:30"
  }
  return time.substring(0, 5); // "09:30"
}

/**
 * Format status for display - show status codes as-is
 */
function formatStatusForDisplay(status: string | null): string {
  if (!status) return '—';
  // Return status code as-is (A, P, U1, P1, PP, etc.)
  // Handle special cases that might be stored differently
  if (status === 'first_half' || status === 'second_half') {
    return 'U4'; // These are converted to U4 in backend
  }
  return status;
}

/**
 * Export attendance data to PDF
 */
export function exportAttendanceToPDF(data: AttendanceExportData) {
  const { date, workers, config } = data;

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

  // Add date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Date: ${formattedDate}`, pageWidth / 2, yPosition, {
    align: 'center',
  });
  yPosition += 8;

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
  const present = workers.filter(
    (row) => row.status !== null && row.status !== 'A'
  ).length;
  const absent = workers.filter((row) => row.status === 'A').length;
  const totalIncentive = workers.reduce(
    (sum, row) => sum + (row.incentive || 0),
    0
  );

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPosition);
  yPosition += 7;

  // Summary Table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      ['Total Employees', workers.length.toString()],
      ['Present', present.toString()],
      ['Absent', absent.toString()],
      ['Total Incentive', formatCurrencyForExport(totalIncentive)],
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
  doc.text('Attendance Details', 14, yPosition);
  yPosition += 5;

  // Prepare table data
  const tableData: (string | number)[][] = [];

  workers.forEach((row, index) => {
    const timeConfig = config
      ? getConfigForProject(config, row.projectId)
      : null;

    const duration = calculateDuration(row.inTime, row.outTime, row.dates);
    const overtime = timeConfig
      ? calculateOvertime(row.inTime, row.outTime, timeConfig, row.dates)
      : null;

    const durationDisplay = duration
      ? overtime
        ? `${duration} (${overtime.startsWith('-') ? `${overtime} UT` : `${overtime} OT`})`
        : duration
      : '—';

    tableData.push([
      (index + 1).toString(),
      row.empName || '',
      row.empCode || '',
      formatStatusForDisplay(row.status),
      row.head || '—',
      formatTimeForDisplay(row.inTime),
      formatTimeForDisplay(row.outTime),
      durationDisplay,
      row.projectName || '—',
      row.remarks || '—',
      formatCurrencyForExport(row.incentive),
      row.isChecked ? '✓' : '',
      row.isVerified ? '✓' : '',
    ]);
  });

  // Create main data table
  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        'Sr No',
        'Employee Name',
        'Code',
        'Status',
        'Activity',
        'In Time',
        'Out Time',
        'Duration',
        'Project',
        'Remark',
        'Incentive',
        'Checked',
        'Verified',
      ],
    ],
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
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // Sr No
      1: { cellWidth: 30 }, // Employee Name
      2: { cellWidth: 15, halign: 'center' }, // Code
      3: { cellWidth: 15, halign: 'center' }, // Status
      4: { cellWidth: 20 }, // Activity
      5: { cellWidth: 12, halign: 'center' }, // In Time
      6: { cellWidth: 12, halign: 'center' }, // Out Time
      7: { cellWidth: 20, halign: 'center' }, // Duration
      8: { cellWidth: 25 }, // Project
      9: { cellWidth: 20 }, // Remark
      10: { cellWidth: 18, halign: 'right' }, // Incentive
      11: { cellWidth: 12, halign: 'center' }, // Checked
      12: { cellWidth: 12, halign: 'center' }, // Verified
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
  const dateStr = date.replace(/-/g, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `attendance-${dateStr}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
