import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectItemRowType } from '@/types/project-item';

/**
 * Format currency for export (without special characters)
 */
function formatCurrencyForExport(amount: number): string {
  if (!amount || amount === 0) return 'Rs. 0.00';
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface ProjectItemsExportData {
  projectId: string;
  items: ProjectItemRowType[];
  totalAmount: number;
}

/**
 * Export project items data to Excel
 */
export function exportProjectItemsToExcel(data: ProjectItemsExportData) {
  const { items, totalAmount } = data;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create summary data
  const summaryData = [
    ['Project Items Summary'],
    [''],
    ['Metric', 'Value'],
    ['Total Items', items.length],
    ['Total Amount', formatCurrencyForExport(totalAmount)],
    [''],
    [`Generated on: ${new Date().toLocaleString('en-IN')}`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Create main data sheet
  const headers = [
    'Sr No',
    'Wo. No.',
    'Code',
    'Reference Schedule',
    'Schedule',
    'Item Name',
    'Unit',
    'Quantity',
    'Rate (Rs.)',
    'Total (Rs.)',
    'Remark',
  ];

  const rows: (string | number)[][] = [headers];

  items.forEach((item, index) => {
    const quantity = parseFloat(item.contract_quantity || '0');
    const rate = parseFloat(item.rate_amount || '0');
    const total = quantity * rate;

    rows.push([
      index + 1,
      item.work_order_number || '',
      item.item_code || '',
      item.reference_schedule_text || '',
      item.schedule_name || '',
      item.item_description || '',
      item.unit_display || '',
      quantity,
      rate,
      total,
      item.remark || '',
    ]);
  });

  // Add grand total row
  rows.push([]);
  rows.push(['', '', '', '', '', '', 'GRAND TOTAL', '', '', totalAmount, '']);

  const mainSheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  mainSheet['!cols'] = [
    { wch: 8 }, // Sr No
    { wch: 12 }, // Wo. No.
    { wch: 15 }, // Code
    { wch: 28 }, // Reference Schedule
    { wch: 15 }, // Schedule
    { wch: 40 }, // Item Name
    { wch: 10 }, // Unit
    { wch: 12 }, // Quantity
    { wch: 12 }, // Rate
    { wch: 15 }, // Total
    { wch: 20 }, // Remark
  ];

  // Freeze first row (header)
  mainSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Project Items');

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `project-items-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export project items data to PDF
 */
export function exportProjectItemsToPDF(data: ProjectItemsExportData) {
  const { items, totalAmount } = data;

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
  doc.text('Project Items Report', pageWidth / 2, yPosition, {
    align: 'center',
  });
  yPosition += 10;

  // Add generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
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
      ['Total Items', items.length.toString()],
      ['Total Amount', formatCurrencyForExport(totalAmount)],
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
  doc.text('Project Items', 14, yPosition);
  yPosition += 5;

  // Prepare table data
  const tableData: (string | number)[][] = [];

  items.forEach((item, index) => {
    const quantity = parseFloat(item.contract_quantity || '0');
    const rate = parseFloat(item.rate_amount || '0');
    const total = quantity * rate;

    tableData.push([
      (index + 1).toString(),
      item.work_order_number || '',
      item.item_code || '',
      item.reference_schedule_text || '',
      item.schedule_name || '',
      item.item_description || '',
      item.unit_display || '',
      quantity.toFixed(2),
      rate.toFixed(2),
      total.toFixed(2),
      item.remark || '',
    ]);
  });

  // Add grand total row
  tableData.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'GRAND TOTAL',
    '',
    '',
    totalAmount.toFixed(2),
    '',
  ]);

  // Create main data table
  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        'Sr No',
        'Wo. No.',
        'Code',
        'Reference Schedule',
        'Schedule',
        'Name',
        'Unit',
        'Quantity',
        'Rate (Rs.)',
        'Total (Rs.)',
        'Remark',
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
      1: { cellWidth: 15, halign: 'center' }, // Wo. No.
      2: { cellWidth: 15, halign: 'center' }, // Code
      3: { cellWidth: 22, halign: 'center' }, // Reference Schedule
      4: { cellWidth: 20, halign: 'center' }, // Schedule
      5: { cellWidth: 50 }, // Name
      6: { cellWidth: 12, halign: 'center' }, // Unit
      7: { cellWidth: 15, halign: 'right' }, // Quantity
      8: { cellWidth: 15, halign: 'right' }, // Rate
      9: { cellWidth: 18, halign: 'right' }, // Total
      10: { cellWidth: 25 }, // Remark
    },
    margin: { left: 14, right: 14 },
    didParseCell: function (cellData) {
      const rowData = cellData.row.raw as (string | number)[];
      // Style grand total row
      if (cellData.row.section === 'body' && rowData[6] === 'GRAND TOTAL') {
        cellData.cell.styles.fillColor = [241, 245, 249];
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fontSize = 9;
      }
    },
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
  const filename = `project-items-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
