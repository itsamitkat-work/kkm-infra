import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  EstimationRowData,
  ProjectItemType,
  ItemMeasurmentRowData,
} from '../types';

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

/**
 * Get config based on item type
 */
function getTypeConfig(type: ProjectItemType) {
  switch (type) {
    case 'MSR':
      return {
        summaryTitle: 'Measurement Report Summary',
        dataSheetName: 'Measurement Data',
        amount1Title: 'Estimated Amount',
        amount2Title: 'Measured Amount',
        quantity1Label: 'Estimated Qty',
        quantity2Label: 'Measured Qty',
      };
    case 'BLG':
      return {
        summaryTitle: 'Billing Report Summary',
        dataSheetName: 'Billing Data',
        amount1Title: 'Estimated Amount',
        amount2Title: 'Measured Amount',
        quantity1Label: 'Estimated Qty',
        quantity2Label: 'Measured Qty',
      };
    case 'EST':
      return {
        summaryTitle: 'Estimation Report Summary',
        dataSheetName: 'Estimation Data',
        amount1Title: 'Planned Amount',
        amount2Title: 'Estimated Amount',
        quantity1Label: 'Planned Qty',
        quantity2Label: 'Estimated Qty',
      };
    default:
      return {
        summaryTitle: 'Report Summary',
        dataSheetName: 'Data',
        amount1Title: 'Amount 1',
        amount2Title: 'Amount 2',
        quantity1Label: 'Quantity 1',
        quantity2Label: 'Quantity 2',
      };
  }
}

/**
 * Calculate item quantities and costs
 */
function calculateItemMetrics(item: ExportParentItem, type: ProjectItemType) {
  let quantity1: number;
  let quantity2: number;

  switch (type) {
    case 'EST':
      quantity1 = parseFloat(item.quantity || '0');
      quantity2 = parseFloat(item.estimate_quantity || '0');
      break;
    case 'MSR':
    case 'BLG':
      quantity1 = parseFloat(item.estimate_quantity || '0');
      quantity2 = parseFloat(item.measurment_quantity || '0');
      break;
    default:
      quantity1 = parseFloat(item.quantity || '0');
      quantity2 = parseFloat(item.estimate_quantity || '0');
  }

  const rate = parseFloat(item.rate || '0');
  const cost1 = quantity1 * rate;
  const cost2 = quantity2 * rate;
  const costDeviation = cost2 - cost1;

  return { quantity1, quantity2, rate, cost1, cost2, costDeviation };
}

/**
 * Calculate grand totals across all items
 */
function calculateGrandTotals(
  items: ExportParentItem[],
  type: ProjectItemType
) {
  const totalAmount1 = items.reduce((sum, item) => {
    let qty: number;
    switch (type) {
      case 'EST':
        qty = parseFloat(item.quantity || '0');
        break;
      case 'MSR':
      case 'BLG':
        qty = parseFloat(item.estimate_quantity || '0');
        break;
      default:
        qty = parseFloat(item.quantity || '0');
    }
    const rate = parseFloat(item.rate || '0');
    return sum + qty * rate;
  }, 0);

  const totalAmount2 = items.reduce((sum, item) => {
    let qty: number;
    switch (type) {
      case 'EST':
        qty = parseFloat(item.estimate_quantity || '0');
        break;
      case 'MSR':
      case 'BLG':
        qty = parseFloat(item.measurment_quantity || '0');
        break;
      default:
        qty = parseFloat(item.estimate_quantity || '0');
    }
    const rate = parseFloat(item.rate || '0');
    return sum + qty * rate;
  }, 0);

  const totalDeviation = totalAmount2 - totalAmount1;

  return { totalAmount1, totalAmount2, totalDeviation };
}

export interface ExportParentItem extends EstimationRowData {
  subItems?: ItemMeasurmentRowData[];
}

export interface ExportData {
  projectId: string;
  type: ProjectItemType;
  kpiData: {
    amount1: number;
    amount2: number;
    costImpact: number;
    overrunItemsCount: number;
    costEffectiveItemsCount: number;
  };
  items: ExportParentItem[];
}

/**
 * Export estimation data to Excel
 */
export function exportToExcel(data: ExportData) {
  const { type, kpiData, items } = data;

  // Get type-specific config
  const config = getTypeConfig(type);

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create KPI Summary Sheet
  const summaryData = createSummarySheet(type, kpiData);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths for summary sheet
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Create Main Data Sheet with parent items and sub-items
  const mainData = createMainDataSheet(type, items);
  const mainSheet = XLSX.utils.aoa_to_sheet(mainData);

  // Set column widths for main sheet
  mainSheet['!cols'] = [
    { wch: 8 }, // Sr No
    { wch: 12 }, // Wo. No.
    { wch: 15 }, // Code
    { wch: 15 }, // DSR Code
    { wch: 40 }, // Name
    { wch: 10 }, // Unit
    { wch: 12 }, // Rate
    { wch: 12 }, // Quantity 1
    { wch: 15 }, // Cost 1
    { wch: 12 }, // Quantity 2
    { wch: 15 }, // Cost 2
    { wch: 15 }, // Cost Deviation
  ];

  // Freeze first row (header)
  mainSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, mainSheet, config.dataSheetName);

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `estimation-report-${type}-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

/**
 * Create summary sheet data
 */
function createSummarySheet(
  type: ProjectItemType,
  kpiData: ExportData['kpiData']
): (string | number)[][] {
  const config = getTypeConfig(type);

  return [
    [config.summaryTitle],
    [''],
    ['Metric', 'Value'],
    [config.amount1Title, formatCurrencyForExport(kpiData.amount1)],
    [config.amount2Title, formatCurrencyForExport(kpiData.amount2)],
    ['Cost Impact', formatCurrencyForExport(kpiData.costImpact)],
    ['Overrun Items Count', kpiData.overrunItemsCount],
    ['Cost-Effective Items Count', kpiData.costEffectiveItemsCount],
    [''],
    [`Generated on: ${new Date().toLocaleString('en-IN')}`],
  ];
}

/**
 * Create main data sheet with parent items and sub-items
 */
function createMainDataSheet(
  type: ProjectItemType,
  items: ExportParentItem[]
): (string | number)[][] {
  const config = getTypeConfig(type);

  const headers = [
    'Sr No',
    'Wo. No.',
    'Code',
    'DSR Code',
    'Name',
    'Unit',
    'Rate (Rs.)',
    config.quantity1Label,
    `${config.amount1Title} (Rs.)`,
    config.quantity2Label,
    `${config.amount2Title} (Rs.)`,
    'Cost Deviation (Rs.)',
  ];

  const rows: (string | number)[][] = [headers];

  items.forEach((item, index) => {
    const { quantity1, quantity2, rate, cost1, cost2, costDeviation } =
      calculateItemMetrics(item, type);

    // Add parent item row
    rows.push([
      index + 1,
      item.srNo || '',
      item.code || '',
      item.dsrCode || '',
      item.name || '',
      item.unit || '',
      rate,
      quantity1,
      cost1,
      quantity2,
      cost2,
      costDeviation,
    ]);

    // Add sub-items if present
    if (item.subItems && item.subItems.length > 0) {
      // Add sub-items header (after parent columns)
      rows.push([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Date',
        'Description',
        'No1',
        'No2',
        'Length',
        'Width',
        'Height',
        'Quantity',
        'Checked',
        'Verified',
      ]);

      // Add sub-item rows
      item.subItems.forEach((subItem) => {
        rows.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          subItem.date || '',
          subItem.description || '',
          subItem.no1 || 0,
          subItem.no2 || 0,
          subItem.length || 0,
          subItem.width || 0,
          subItem.height || 0,
          subItem.quantity || 0,
          subItem.checked === 'true' ? 'Yes' : 'No',
          subItem.verified === 'true' ? 'Yes' : 'No',
        ]);
      });

      // Add sub-items total row
      const totalQty = item.subItems.reduce(
        (sum, subItem) => sum + (subItem.quantity || 0),
        0
      );
      rows.push([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Sub-Total',
        '',
        '',
        '',
        '',
        '',
        totalQty,
        '',
        '',
      ]);

      // Add empty row for separation
      rows.push([]);
    }
  });

  // Add grand totals
  const { totalAmount1, totalAmount2, totalDeviation } = calculateGrandTotals(
    items,
    type
  );

  rows.push([]);
  rows.push([
    '',
    '',
    '',
    '',
    'GRAND TOTAL',
    '',
    '',
    '',
    totalAmount1,
    '',
    totalAmount2,
    totalDeviation,
  ]);

  return rows;
}

/**
 * Export estimation data to PDF
 */
export function exportToPDF(data: ExportData) {
  const { type, kpiData, items } = data;

  // Get type-specific config
  const config = getTypeConfig(type);

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
  doc.text(config.summaryTitle, pageWidth / 2, yPosition, { align: 'center' });
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

  // Add KPI Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPosition);
  yPosition += 7;

  // KPI Summary Table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value']],
    body: [
      [config.amount1Title, formatCurrencyForExport(kpiData.amount1)],
      [config.amount2Title, formatCurrencyForExport(kpiData.amount2)],
      ['Cost Impact', formatCurrencyForExport(kpiData.costImpact)],
      ['Overrun Items', kpiData.overrunItemsCount.toString()],
      ['Cost-Effective Items', kpiData.costEffectiveItemsCount.toString()],
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
  doc.text(config.dataSheetName, 14, yPosition);
  yPosition += 5;

  // Prepare table data
  const tableData: (string | number)[][] = [];

  items.forEach((item, index) => {
    const { quantity1, quantity2, rate, cost1, cost2, costDeviation } =
      calculateItemMetrics(item, type);

    // Add parent item row
    tableData.push([
      (index + 1).toString(),
      item.srNo || '',
      item.name || '',
      item.unit || '',
      rate.toFixed(2),
      quantity1.toFixed(2),
      cost1.toFixed(2),
      quantity2.toFixed(2),
      cost2.toFixed(2),
      costDeviation.toFixed(2),
    ]);

    // Add sub-items if present
    if (item.subItems && item.subItems.length > 0) {
      // Add sub-items header row
      tableData.push([
        '',
        '',
        'Description',
        'LxWxH',
        'No1xNo2',
        'Quantity',
        'Checked',
        'Verified',
        '',
        '',
      ]);

      // Add sub-item rows
      item.subItems.forEach((subItem) => {
        const dimensions =
          subItem.length || subItem.width || subItem.height
            ? `${subItem.length || 0}x${subItem.width || 0}x${
                subItem.height || 0
              }`
            : '-';
        const numbers =
          subItem.no1 || subItem.no2
            ? `${subItem.no1 || 0}x${subItem.no2 || 0}`
            : '-';

        tableData.push([
          '',
          '',
          subItem.description || '',
          dimensions,
          numbers,
          (subItem.quantity || 0).toFixed(2),
          subItem.checked === 'true' ? 'Yes' : 'No',
          subItem.verified === 'true' ? 'Yes' : 'No',
          '',
          '',
        ]);
      });

      // Add sub-items total row
      const totalQty = item.subItems.reduce(
        (sum, subItem) => sum + (subItem.quantity || 0),
        0
      );
      tableData.push([
        '',
        '',
        'Sub-Total',
        '',
        '',
        totalQty.toFixed(2),
        '',
        '',
        '',
        '',
      ]);

      // Add empty row for separation
      tableData.push(['', '', '', '', '', '', '', '', '', '']);
    }
  });

  // Add grand totals
  const { totalAmount1, totalAmount2, totalDeviation } = calculateGrandTotals(
    items,
    type
  );

  tableData.push([
    '',
    '',
    'GRAND TOTAL',
    '',
    '',
    '',
    totalAmount1.toFixed(2),
    '',
    totalAmount2.toFixed(2),
    totalDeviation.toFixed(2),
  ]);

  // Create main data table
  const pdfConfig = getTypeConfig(type);
  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        'Sr No',
        'Wo. No.',
        'Name',
        'Unit',
        'Rate (Rs.)',
        pdfConfig.quantity1Label,
        `${pdfConfig.amount1Title} (Rs.)`,
        pdfConfig.quantity2Label,
        `${pdfConfig.amount2Title} (Rs.)`,
        'Cost Dev. (Rs.)',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 55 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 20, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: function (cellData) {
      const rowData = cellData.row.raw as (string | number)[];
      // Style sub-item rows
      if (cellData.row.index > 0 && rowData[0] === '') {
        cellData.cell.styles.fillColor = [248, 250, 252];
        cellData.cell.styles.textColor = [100, 116, 139];
        cellData.cell.styles.fontSize = 7;
      }
      // Style grand total row
      if (cellData.row.section === 'body' && rowData[2] === 'GRAND TOTAL') {
        cellData.cell.styles.fillColor = [241, 245, 249];
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fontSize = 9;
      }
      // Style sub-total rows
      if (cellData.row.section === 'body' && rowData[2] === 'Sub-Total') {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [241, 245, 249];
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
  const filename = `estimation-report-${type}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
