import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeviationResponse, DeviationReportType } from '../types';

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
 * Get config based on deviation type
 */
function getTypeConfig(type: DeviationReportType) {
  const typeLabels = {
    GENvsEST: {
      summaryTitle: 'Deviation Report: Planned vs Estimated',
      dataSheetName: 'Planned vs Estimated',
      quantity1Label: 'Planned Qty',
      quantity2Label: 'Estimated Qty',
      amount1Label: 'Planned Amount',
      amount2Label: 'Estimated Amount',
    },
    GENvsMSR: {
      summaryTitle: 'Deviation Report: Planned vs Measured',
      dataSheetName: 'Planned vs Measured',
      quantity1Label: 'Planned Qty',
      quantity2Label: 'Measured Qty',
      amount1Label: 'Planned Amount',
      amount2Label: 'Measured Amount',
    },
    ESTvsMSR: {
      summaryTitle: 'Deviation Report: Estimated vs Measured',
      dataSheetName: 'Estimated vs Measured',
      quantity1Label: 'Estimated Qty',
      quantity2Label: 'Measured Qty',
      amount1Label: 'Estimated Amount',
      amount2Label: 'Measured Amount',
    },
  };

  return typeLabels[type];
}

/**
 * Calculate item metrics
 */
function calculateItemMetrics(item: DeviationResponse) {
  const quantity1 = item.quantity1 || 0;
  const quantity2 = item.quantity2 || 0;
  const rate = item.rate || 0;
  const amount1 = quantity1 * rate;
  const amount2 = quantity2 * rate;
  const deviationQty = quantity2 - quantity1;
  const deviationAmount = deviationQty * rate;

  return {
    quantity1,
    quantity2,
    rate,
    amount1,
    amount2,
    deviationQty,
    deviationAmount,
  };
}

export interface DeviationExportData {
  projectId: string;
  type: DeviationReportType;
  kpiData: {
    totalItems: number;
    overrunItemsCount: number;
    costEffectiveItemsCount: number;
    netDeviationAmount: number;
    totalAmount1: number;
    totalAmount2: number;
  };
  items: DeviationResponse[];
}

export interface AllDeviationsExportData {
  projectId: string;
  data: {
    [K in DeviationReportType]: {
      kpiData: DeviationExportData['kpiData'];
      items: DeviationResponse[];
    };
  };
}

/**
 * Export deviation data to Excel
 */
export function exportDeviationToExcel(data: DeviationExportData) {
  const { type, kpiData, items } = data;

  // Get type-specific config
  const config = getTypeConfig(type);

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create KPI Summary Sheet
  const summaryData = createSummarySheet(type, kpiData, config);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths for summary sheet
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Create Main Data Sheet
  const mainData = createMainDataSheet(type, items, config);
  const mainSheet = XLSX.utils.aoa_to_sheet(mainData);

  // Set column widths for main sheet
  mainSheet['!cols'] = [
    { wch: 8 }, // Sr No
    { wch: 12 }, // Wo. No.
    { wch: 40 }, // Item Name
    { wch: 15 }, // Rate
    { wch: 15 }, // Quantity 1
    { wch: 18 }, // Amount 1
    { wch: 15 }, // Quantity 2
    { wch: 18 }, // Amount 2
    { wch: 15 }, // Deviation Qty
    { wch: 18 }, // Deviation Amount
  ];

  // Freeze first row (header)
  mainSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, mainSheet, config.dataSheetName);

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `deviation-report-${type}-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

/**
 * Create summary sheet data
 */
function createSummarySheet(
  type: DeviationReportType,
  kpiData: DeviationExportData['kpiData'],
  config: ReturnType<typeof getTypeConfig>
): (string | number)[][] {
  return [
    [config.summaryTitle],
    [''],
    ['Metric', 'Value'],
    [config.amount1Label, formatCurrencyForExport(kpiData.totalAmount1)],
    [config.amount2Label, formatCurrencyForExport(kpiData.totalAmount2)],
    ['Net Deviation', formatCurrencyForExport(kpiData.netDeviationAmount)],
    ['Total Items', kpiData.totalItems],
    ['Overrun Items', kpiData.overrunItemsCount],
    ['Cost-Effective Items', kpiData.costEffectiveItemsCount],
    [''],
    [`Generated on: ${new Date().toLocaleString('en-IN')}`],
  ];
}

/**
 * Create main data sheet
 */
function createMainDataSheet(
  type: DeviationReportType,
  items: DeviationResponse[],
  config: ReturnType<typeof getTypeConfig>
): (string | number)[][] {
  const headers = [
    'Sr No',
    'Wo. No.',
    'Item Name',
    'Rate (Rs.)',
    config.quantity1Label,
    `${config.amount1Label} (Rs.)`,
    config.quantity2Label,
    `${config.amount2Label} (Rs.)`,
    'Deviation Qty',
    'Deviation Amount (Rs.)',
  ];

  const rows: (string | number)[][] = [headers];

  let totalAmount1 = 0;
  let totalAmount2 = 0;
  let totalDeviationAmount = 0;

  items.forEach((item, index) => {
    const {
      quantity1,
      quantity2,
      rate,
      amount1,
      amount2,
      deviationQty,
      deviationAmount,
    } = calculateItemMetrics(item);

    totalAmount1 += amount1;
    totalAmount2 += amount2;
    totalDeviationAmount += deviationAmount;

    rows.push([
      index + 1,
      item.srNo || '',
      item.name || '',
      rate.toFixed(2),
      quantity1.toFixed(2),
      amount1.toFixed(2),
      quantity2.toFixed(2),
      amount2.toFixed(2),
      deviationQty.toFixed(2),
      deviationAmount.toFixed(2),
    ]);
  });

  // Add grand totals
  rows.push([]);
  rows.push([
    '',
    '',
    'GRAND TOTAL',
    '',
    '',
    totalAmount1.toFixed(2),
    '',
    totalAmount2.toFixed(2),
    '',
    totalDeviationAmount.toFixed(2),
  ]);

  return rows;
}

/**
 * Export deviation data to PDF
 */
export function exportDeviationToPDF(data: DeviationExportData) {
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
      [config.amount1Label, formatCurrencyForExport(kpiData.totalAmount1)],
      [config.amount2Label, formatCurrencyForExport(kpiData.totalAmount2)],
      ['Net Deviation', formatCurrencyForExport(kpiData.netDeviationAmount)],
      ['Total Items', kpiData.totalItems.toString()],
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
  let totalAmount1 = 0;
  let totalAmount2 = 0;
  let totalDeviationAmount = 0;

  items.forEach((item, index) => {
    const {
      quantity1,
      quantity2,
      rate,
      amount1,
      amount2,
      deviationQty,
      deviationAmount,
    } = calculateItemMetrics(item);

    totalAmount1 += amount1;
    totalAmount2 += amount2;
    totalDeviationAmount += deviationAmount;

    tableData.push([
      (index + 1).toString(),
      item.srNo || '',
      item.name || '',
      rate.toFixed(2),
      quantity1.toFixed(2),
      amount1.toFixed(2),
      quantity2.toFixed(2),
      amount2.toFixed(2),
      deviationQty.toFixed(2),
      deviationAmount.toFixed(2),
    ]);
  });

  // Add grand totals
  tableData.push([
    '',
    '',
    'GRAND TOTAL',
    '',
    '',
    totalAmount1.toFixed(2),
    '',
    totalAmount2.toFixed(2),
    '',
    totalDeviationAmount.toFixed(2),
  ]);

  // Create main data table
  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        'Sr No',
        'Wo. No.',
        'Item Name',
        'Rate (Rs.)',
        config.quantity1Label,
        `${config.amount1Label} (Rs.)`,
        config.quantity2Label,
        `${config.amount2Label} (Rs.)`,
        'Dev. Qty',
        'Dev. Amount (Rs.)',
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
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 70 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: function (cellData) {
      const rowData = cellData.row.raw as (string | number)[];
      // Style grand total row
      if (cellData.row.section === 'body' && rowData[2] === 'GRAND TOTAL') {
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
  const filename = `deviation-report-${type}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}

/**
 * Export all deviation types to Excel (separate sheets for each type)
 */
export function exportAllDeviationsToExcel(data: AllDeviationsExportData) {
  const { data: allData } = data;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Create a summary sheet with all types
  const overallSummaryData: (string | number)[][] = [
    ['Deviation Analysis - All Comparisons'],
    [''],
    [
      'Comparison Type',
      'Total Items',
      'Overrun Items',
      'Cost-Effective Items',
      'Net Deviation',
    ],
  ];

  const types: DeviationReportType[] = ['GENvsEST', 'GENvsMSR', 'ESTvsMSR'];
  types.forEach((type) => {
    const typeData = allData[type];
    const config = getTypeConfig(type);
    if (typeData) {
      overallSummaryData.push([
        config.summaryTitle
          .replace(' Report Summary', '')
          .replace('Deviation Report: ', ''),
        typeData.kpiData.totalItems,
        typeData.kpiData.overrunItemsCount,
        typeData.kpiData.costEffectiveItemsCount,
        formatCurrencyForExport(typeData.kpiData.netDeviationAmount),
      ]);
    }
  });

  overallSummaryData.push([]);
  overallSummaryData.push([
    `Generated on: ${new Date().toLocaleString('en-IN')}`,
  ]);

  const overallSummarySheet = XLSX.utils.aoa_to_sheet(overallSummaryData);
  overallSummarySheet['!cols'] = [
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    overallSummarySheet,
    'Overall Summary'
  );

  // Create sheets for each deviation type
  types.forEach((type) => {
    const typeData = allData[type];
    if (!typeData) return;

    const config = getTypeConfig(type);

    // Create summary sheet for this type
    const summaryData = createSummarySheet(type, typeData.kpiData, config);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];

    const summarySheetName =
      config.summaryTitle
        .replace('Deviation Report: ', '')
        .replace(' Report Summary', '') + ' - Summary';
    XLSX.utils.book_append_sheet(workbook, summarySheet, summarySheetName);

    // Create data sheet for this type
    const mainData = createMainDataSheet(type, typeData.items, config);
    const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
    mainSheet['!cols'] = [
      { wch: 8 }, // Sr No
      { wch: 12 }, // Wo. No.
      { wch: 40 }, // Item Name
      { wch: 15 }, // Rate
      { wch: 15 }, // Quantity 1
      { wch: 18 }, // Amount 1
      { wch: 15 }, // Quantity 2
      { wch: 18 }, // Amount 2
      { wch: 15 }, // Deviation Qty
      { wch: 18 }, // Deviation Amount
    ];
    mainSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    const dataSheetName =
      config.summaryTitle
        .replace('Deviation Report: ', '')
        .replace(' Report Summary', '') + ' - Data';
    XLSX.utils.book_append_sheet(workbook, mainSheet, dataSheetName);
  });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `deviation-report-all-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export all deviation types to PDF (combined document)
 */
export function exportAllDeviationsToPDF(data: AllDeviationsExportData) {
  const { data: allData } = data;

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
  doc.text('Deviation Analysis - All Comparisons', pageWidth / 2, yPosition, {
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

  // Add overall summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Summary', 14, yPosition);
  yPosition += 7;

  const types: DeviationReportType[] = ['GENvsEST', 'GENvsMSR', 'ESTvsMSR'];
  const overallSummaryBody: (string | number)[][] = [];

  types.forEach((type) => {
    const typeData = allData[type];
    const config = getTypeConfig(type);
    if (typeData) {
      overallSummaryBody.push([
        config.summaryTitle.replace('Deviation Report: ', ''),
        typeData.kpiData.totalItems.toString(),
        typeData.kpiData.overrunItemsCount.toString(),
        typeData.kpiData.costEffectiveItemsCount.toString(),
        formatCurrencyForExport(typeData.kpiData.netDeviationAmount),
      ]);
    }
  });

  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        'Comparison',
        'Total Items',
        'Overrun',
        'Cost-Effective',
        'Net Deviation',
      ],
    ],
    body: overallSummaryBody,
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
  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Add detailed sections for each type
  types.forEach((type, index) => {
    const typeData = allData[type];
    if (!typeData) return;

    const config = getTypeConfig(type);

    // Add page break except for the first type
    if (index > 0) {
      doc.addPage();
      yPosition = 15;
    }

    // Add section title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(config.summaryTitle, pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 10;

    // Add KPI Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, yPosition);
    yPosition += 5;

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        [
          config.amount1Label,
          formatCurrencyForExport(typeData.kpiData.totalAmount1),
        ],
        [
          config.amount2Label,
          formatCurrencyForExport(typeData.kpiData.totalAmount2),
        ],
        [
          'Net Deviation',
          formatCurrencyForExport(typeData.kpiData.netDeviationAmount),
        ],
        ['Total Items', typeData.kpiData.totalItems.toString()],
        ['Overrun Items', typeData.kpiData.overrunItemsCount.toString()],
        [
          'Cost-Effective Items',
          typeData.kpiData.costEffectiveItemsCount.toString(),
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Add detailed data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Data', 14, yPosition);
    yPosition += 5;

    const tableData: (string | number)[][] = [];
    let totalAmount1 = 0;
    let totalAmount2 = 0;
    let totalDeviationAmount = 0;

    typeData.items.forEach((item, itemIndex) => {
      const {
        quantity1,
        quantity2,
        rate,
        amount1,
        amount2,
        deviationQty,
        deviationAmount,
      } = calculateItemMetrics(item);

      totalAmount1 += amount1;
      totalAmount2 += amount2;
      totalDeviationAmount += deviationAmount;

      tableData.push([
        (itemIndex + 1).toString(),
        item.srNo || '',
        item.name || '',
        rate.toFixed(2),
        quantity1.toFixed(2),
        amount1.toFixed(2),
        quantity2.toFixed(2),
        amount2.toFixed(2),
        deviationQty.toFixed(2),
        deviationAmount.toFixed(2),
      ]);
    });

    // Add grand totals
    tableData.push([
      '',
      '',
      'GRAND TOTAL',
      '',
      '',
      totalAmount1.toFixed(2),
      '',
      totalAmount2.toFixed(2),
      '',
      totalDeviationAmount.toFixed(2),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [
        [
          'Sr No',
          'Wo. No.',
          'Item Name',
          'Rate',
          config.quantity1Label,
          config.amount1Label,
          config.quantity2Label,
          config.amount2Label,
          'Dev. Qty',
          'Dev. Amount',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 70 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 18, halign: 'right' },
        9: { cellWidth: 22, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: function (cellData) {
        const rowData = cellData.row.raw as (string | number)[];
        if (cellData.row.section === 'body' && rowData[2] === 'GRAND TOTAL') {
          cellData.cell.styles.fillColor = [241, 245, 249];
          cellData.cell.styles.fontStyle = 'bold';
          cellData.cell.styles.fontSize = 8;
        }
      },
      didDrawPage: function () {
        const pageCount = doc.getNumberOfPages();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageNumber = (doc as any).internal.getCurrentPageInfo()
          .pageNumber;
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
  });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `deviation-report-all-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
}
