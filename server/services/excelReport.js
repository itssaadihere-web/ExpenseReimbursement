const ExcelJS = require('exceljs');

/**
 * Builds an Expense Report Excel workbook matching the exact template format.
 * 
 * @param {Object} data 
 *   - timeFrame: { from: '10.07.2026', to: '10.07.2026' }
 *   - employee: {
 *       name: 'Sarah Jenkins',
 *       id: 'EMP-1049',
 *       designation: 'Senior Field Representative',
 *       bankAccount: '•••• •••• 4829',
 *       bankRouting: '071000288',
 *       homeLocation: 'Naperville, Chicago, IL',
 *       homeStore: 'STR-CHI-102',
 *       homeMarket: 'Illinois / Midwest',
 *       coveredLocation: 'Milwaukee Downtown Branch, WI',
 *       coveredStore: 'STR-MKE-405',
 *       coveredMarket: 'Wisconsin Metro'
 *     }
 *   - items: Array of expense row items:
 *       [{ date, vendor, description, market, fuel, meals, supplies, parking, misc, tip, total, adjustedAmount, receiptVerification, miles, gallonsPer22Miles, ratePerGallon }]
 *   - approval: { approvedBy: 'Johnathan Davis (Director of Operations)', date: '11/10/2026' }
 *   - config: { mpg: 22, gasRate: 3.50 }
 */
async function generateExpenseReportWorkbook(data = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mobily Expense Reimbursement Automation';
  workbook.lastModifiedBy = 'Automated Audit Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Expense Report', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [{ showGridLines: true }]
  });

  // Color constants
  const COLOR_HEADER_BG = '993300';      // Burnt orange / terracotta
  const COLOR_WHITE = 'FFFFFF';
  const COLOR_LIGHT_YELLOW = 'FFFF99';   // Yellow date boxes
  const COLOR_ADJUSTED_BG = 'F2F2EB';    // Adjusted Amount column background
  const COLOR_LAVENDER = 'D9D2E9';       // Bottom Total lavender boxes
  const COLOR_OFFICE_BG = 'FCE4D6';      // For Office Use Only soft salmon
  const COLOR_GREEN_TITLE = '1E5631';    // Employee Info title green
  const COLOR_TITLE_RUST = 'A03B0D';     // Title rust reddish-brown
  const COLOR_BORDER = 'CCCCCC';

  // Standard Border styles
  const thinBorder = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } }
  };

  const bottomUnderline = {
    bottom: { style: 'thin', color: { argb: '000000' } }
  };

  const boxBorder = {
    top: { style: 'thin', color: { argb: '000000' } },
    left: { style: 'thin', color: { argb: '000000' } },
    bottom: { style: 'thin', color: { argb: '000000' } },
    right: { style: 'thin', color: { argb: '000000' } }
  };

  // Define 16 Columns (A through P)
  sheet.columns = [
    { key: 'colA', width: 14 }, // Date
    { key: 'colB', width: 20 }, // Vendor
    { key: 'colC', width: 32 }, // Description
    { key: 'colD', width: 18 }, // Market
    { key: 'colE', width: 12 }, // Fuel
    { key: 'colF', width: 12 }, // Meals
    { key: 'colG', width: 12 }, // Supplies
    { key: 'colH', width: 12 }, // Parking
    { key: 'colI', width: 12 }, // Misc.
    { key: 'colJ', width: 10 }, // TIP
    { key: 'colK', width: 13 }, // Total
    { key: 'colL', width: 16 }, // Adjusted Amount to Pay
    { key: 'colM', width: 16 }, // Receipt Verification
    { key: 'colN', width: 12 }, // Miles
    { key: 'colO', width: 15 }, // Gallons Per 22 Miles
    { key: 'colP', width: 15 }  // $3.5 Per Gallon
  ];

  // Helper defaults
  const emp = data.employee || {};
  const timeFrame = data.timeFrame || {};
  const approval = data.approval || {};
  const gasRate = Number(data.config?.gasRate || 3.50);
  const mpg = Number(data.config?.mpg || 22);

  // Format dates: DD.MM.YYYY or MM/DD/YYYY
  const fromDate = timeFrame.from || '10.07.2026';
  const toDate = timeFrame.to || '10.07.2026';

  // ROW 1: "For Office Use Only"
  const row1 = sheet.getRow(1);
  row1.getCell(1).value = 'For Office Use Only';
  row1.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: '7F6000' } };
  row1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OFFICE_BG } };

  // ROW 2: "Time Frame:"
  const row2 = sheet.getRow(2);
  row2.getCell(1).value = 'Time Frame:';
  row2.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: '000000' } };

  // ROW 3: "From", yellow date box & Main Title "Expense report"
  const row3 = sheet.getRow(3);
  row3.getCell(1).value = 'From';
  row3.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
  row3.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  // Merge B3:C3 for yellow 'From' date box
  sheet.mergeCells('B3:C3');
  const fromCell = sheet.getCell('B3');
  fromCell.value = fromDate;
  fromCell.font = { name: 'Calibri', size: 10, bold: true };
  fromCell.alignment = { horizontal: 'center', vertical: 'middle' };
  fromCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_YELLOW } };
  sheet.getCell('C3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_YELLOW } };
  sheet.getCell('B3').border = boxBorder;
  sheet.getCell('C3').border = boxBorder;

  // Title: Merged across E3:I3
  sheet.mergeCells('E3:I3');
  const titleCell = sheet.getCell('E3');
  titleCell.value = 'Expense report';
  titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: COLOR_TITLE_RUST } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // ROW 4: "To", yellow date box
  const row4 = sheet.getRow(4);
  row4.getCell(1).value = 'To';
  row4.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
  row4.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  // Merge B4:C4 for yellow 'To' date box
  sheet.mergeCells('B4:C4');
  const toCell = sheet.getCell('B4');
  toCell.value = toDate;
  toCell.font = { name: 'Calibri', size: 10, bold: true };
  toCell.alignment = { horizontal: 'center', vertical: 'middle' };
  toCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_YELLOW } };
  sheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_YELLOW } };
  sheet.getCell('B4').border = boxBorder;
  sheet.getCell('C4').border = boxBorder;

  // ROW 6: EMPLOYEE INFORMATION:
  const row6 = sheet.getRow(6);
  row6.getCell(1).value = 'EMPLOYEE INFORMATION:';
  row6.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_GREEN_TITLE } };

  // ROW 7:
  // Name / Employee ID | Home Location | Covered Location
  const row7 = sheet.getRow(7);
  row7.getCell(1).value = 'Name / Employee ID';
  row7.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
  
  sheet.mergeCells('B7:D7');
  const nameValCell = sheet.getCell('B7');
  nameValCell.value = `${emp.name || 'Sarah Jenkins'} / ${emp.id || 'EMP-1049'}`;
  nameValCell.font = { name: 'Calibri', size: 9, bold: true };
  nameValCell.border = bottomUnderline;
  sheet.getCell('C7').border = bottomUnderline;
  sheet.getCell('D7').border = bottomUnderline;

  row7.getCell(5).value = 'Home Location';
  row7.getCell(5).font = { name: 'Calibri', size: 9 };
  
  sheet.mergeCells('F7:H7');
  const homeValCell = sheet.getCell('F7');
  homeValCell.value = emp.homeLocation || 'Naperville, Chicago, IL';
  homeValCell.font = { name: 'Calibri', size: 9 };
  homeValCell.border = bottomUnderline;
  sheet.getCell('G7').border = bottomUnderline;
  sheet.getCell('H7').border = bottomUnderline;

  row7.getCell(9).value = 'Covered Location';
  row7.getCell(9).font = { name: 'Calibri', size: 9 };

  sheet.mergeCells('J7:L7');
  const coveredValCell = sheet.getCell('J7');
  coveredValCell.value = emp.coveredLocation || 'Milwaukee Downtown Branch, WI';
  coveredValCell.font = { name: 'Calibri', size: 9 };
  coveredValCell.border = bottomUnderline;
  sheet.getCell('K7').border = bottomUnderline;
  sheet.getCell('L7').border = bottomUnderline;

  // ROW 8:
  // Designation | Home Store/UID | Covered Store/UID
  const row8 = sheet.getRow(8);
  row8.getCell(1).value = 'Designation';
  row8.getCell(1).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('B8:D8');
  const desigValCell = sheet.getCell('B8');
  desigValCell.value = emp.designation || 'Senior Territory Sales Representative';
  desigValCell.font = { name: 'Calibri', size: 9 };
  desigValCell.border = bottomUnderline;
  sheet.getCell('C8').border = bottomUnderline;
  sheet.getCell('D8').border = bottomUnderline;

  row8.getCell(5).value = 'Home Store/UID';
  row8.getCell(5).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('F8:H8');
  const homeStoreCell = sheet.getCell('F8');
  homeStoreCell.value = emp.homeStore || 'STR-CHI-102';
  homeStoreCell.font = { name: 'Calibri', size: 9 };
  homeStoreCell.border = bottomUnderline;
  sheet.getCell('G8').border = bottomUnderline;
  sheet.getCell('H8').border = bottomUnderline;

  row8.getCell(9).value = 'Covered Store/UID';
  row8.getCell(9).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('J8:L8');
  const coveredStoreCell = sheet.getCell('J8');
  coveredStoreCell.value = emp.coveredStore || 'STR-MKE-405';
  coveredStoreCell.font = { name: 'Calibri', size: 9 };
  coveredStoreCell.border = bottomUnderline;
  sheet.getCell('K8').border = bottomUnderline;
  sheet.getCell('L8').border = bottomUnderline;

  // ROW 9:
  // Bank Account # | Home Market | Covered Market
  const row9 = sheet.getRow(9);
  row9.getCell(1).value = 'Bank Account #';
  row9.getCell(1).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('B9:D9');
  const bankAccCell = sheet.getCell('B9');
  bankAccCell.value = emp.bankAccount || '•••• •••• 4829';
  bankAccCell.font = { name: 'Calibri', size: 9 };
  bankAccCell.border = bottomUnderline;
  sheet.getCell('C9').border = bottomUnderline;
  sheet.getCell('D9').border = bottomUnderline;

  row9.getCell(5).value = 'Home Market';
  row9.getCell(5).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('F9:H9');
  const homeMktCell = sheet.getCell('F9');
  homeMktCell.value = emp.homeMarket || 'Illinois / Chicago North';
  homeMktCell.font = { name: 'Calibri', size: 9 };
  homeMktCell.border = bottomUnderline;
  sheet.getCell('G9').border = bottomUnderline;
  sheet.getCell('H9').border = bottomUnderline;

  row9.getCell(9).value = 'Covered Market';
  row9.getCell(9).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('J9:L9');
  const covMktCell = sheet.getCell('J9');
  covMktCell.value = emp.coveredMarket || 'Wisconsin Metro';
  covMktCell.font = { name: 'Calibri', size: 9 };
  covMktCell.border = bottomUnderline;
  sheet.getCell('K9').border = bottomUnderline;
  sheet.getCell('L9').border = bottomUnderline;

  // ROW 10:
  // Bank Routing # | Underline spacer | Underline spacer
  const row10 = sheet.getRow(10);
  row10.getCell(1).value = 'Bank Routing #';
  row10.getCell(1).font = { name: 'Calibri', size: 9 };
  sheet.mergeCells('B10:D10');
  const routingCell = sheet.getCell('B10');
  routingCell.value = emp.bankRouting || '071000288';
  routingCell.font = { name: 'Calibri', size: 9 };
  routingCell.border = bottomUnderline;
  sheet.getCell('C10').border = bottomUnderline;
  sheet.getCell('D10').border = bottomUnderline;

  sheet.mergeCells('F10:H10');
  sheet.getCell('F10').border = bottomUnderline;
  sheet.getCell('G10').border = bottomUnderline;
  sheet.getCell('H10').border = bottomUnderline;

  sheet.mergeCells('J10:L10');
  sheet.getCell('J10').border = bottomUnderline;
  sheet.getCell('K10').border = bottomUnderline;
  sheet.getCell('L10').border = bottomUnderline;

  // ROW 12: TABLE HEADERS
  const tableHeaders = [
    'Date',
    'Vendor',
    'Description',
    'Market',
    'Fuel',
    'Meals',
    'Supplies',
    'Parking',
    'Misc.',
    'TIP',
    'Total',
    'Adjusted Amount to Pay',
    'Receipt Verification',
    'Miles',
    `Gallons Per ${mpg} Miles`,
    `$${gasRate.toFixed(1)} Per Gallon`
  ];

  const headerRow = sheet.getRow(12);
  headerRow.height = 30;

  tableHeaders.forEach((text, idx) => {
    const colIdx = idx + 1;
    const cell = headerRow.getCell(colIdx);
    cell.value = text;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = boxBorder;
  });

  // Prepare Data Rows
  let items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];

  // If no items passed, create at least 6 standard rows to match the image template
  if (items.length === 0) {
    items = [
      { date: '10/11/2026', vendor: 'Shell Oil', description: 'Store Visit - Chicago to Milwaukee', market: 'Milwaukee Central', fuel: 18.45, meals: 15.00, supplies: 0, parking: 12.00, misc: 0, tip: 0, adjustedAmount: 45.45, receiptVerification: 'Verified', miles: 116.0 },
      { date: '10/11/2026', vendor: 'Mobil Gas', description: 'Client Meeting - Madison Route', market: 'Madison West', fuel: 22.10, meals: 0, supplies: 0, parking: 0, misc: 0, tip: 0, adjustedAmount: 22.10, receiptVerification: 'Verified', miles: 139.0 },
      { date: '10/11/2026', vendor: 'Office Depot', description: 'Field POS Forms & Printer Paper', market: 'Milwaukee North', fuel: 0, meals: 0, supplies: 24.50, parking: 0, misc: 0, tip: 0, adjustedAmount: 24.50, receiptVerification: 'Verified', miles: 0 },
      { date: '10/09/2026', vendor: 'BP Fuel', description: 'Weekly Regional Route Leg 1', market: 'Racine South', fuel: 16.50, meals: 0, supplies: 0, parking: 5.00, misc: 0, tip: 0, adjustedAmount: 21.50, receiptVerification: 'Verified', miles: 103.5 },
      { date: '10/07/2026', vendor: 'Chevron', description: 'Territory Audit Inspection', market: 'Kenosha Branch', fuel: 14.80, meals: 12.50, supplies: 0, parking: 0, misc: 0, tip: 0, adjustedAmount: 27.30, receiptVerification: 'Verified', miles: 93.0 },
      { date: '10/06/2026', vendor: 'Speedway', description: 'Inventory Delivery Support', market: 'Rockford Center', fuel: 19.20, meals: 0, supplies: 0, parking: 0, misc: 0, tip: 0, adjustedAmount: 19.20, receiptVerification: 'Verified', miles: 120.5 }
    ];
  }

  const startRow = 13;
  let currentRow = startRow;

  // Accounting / Currency format string
  const currencyFormat = '$#,##0.00;($#,##0.00);"$ - "';
  const numberFormat = '#,##0.00;(#,##0.00);"$ - "';

  items.forEach((item, index) => {
    const row = sheet.getRow(currentRow);
    row.height = 20;

    const rNum = currentRow;
    const miles = Number(item.miles || 0);

    // Columns:
    // A: Date
    const cellA = row.getCell(1);
    cellA.value = item.date || '10/11/2026';
    cellA.alignment = { horizontal: 'center', vertical: 'middle' };
    cellA.border = thinBorder;

    // B: Vendor
    const cellB = row.getCell(2);
    cellB.value = item.vendor || '';
    cellB.alignment = { horizontal: 'left', vertical: 'middle' };
    cellB.border = thinBorder;

    // C: Description
    const cellC = row.getCell(3);
    cellC.value = item.description || '';
    cellC.alignment = { horizontal: 'left', vertical: 'middle' };
    cellC.border = thinBorder;

    // D: Market
    const cellD = row.getCell(4);
    cellD.value = item.market || '';
    cellD.alignment = { horizontal: 'left', vertical: 'middle' };
    cellD.border = thinBorder;

    // E: Fuel
    const cellE = row.getCell(5);
    // If fuel not explicitly provided, calculate via column P
    if (item.fuel !== undefined && item.fuel !== null) {
      cellE.value = Number(item.fuel);
    } else if (miles > 0) {
      cellE.value = { formula: `P${rNum}`, result: Number(((miles / mpg) * gasRate).toFixed(2)) };
    } else {
      cellE.value = 0;
    }
    cellE.numFmt = currencyFormat;
    cellE.alignment = { horizontal: 'right', vertical: 'middle' };
    cellE.border = thinBorder;

    // F: Meals
    const cellF = row.getCell(6);
    cellF.value = Number(item.meals || 0);
    cellF.numFmt = currencyFormat;
    cellF.alignment = { horizontal: 'right', vertical: 'middle' };
    cellF.border = thinBorder;

    // G: Supplies
    const cellG = row.getCell(7);
    cellG.value = Number(item.supplies || 0);
    cellG.numFmt = currencyFormat;
    cellG.alignment = { horizontal: 'right', vertical: 'middle' };
    cellG.border = thinBorder;

    // H: Parking
    const cellH = row.getCell(8);
    cellH.value = Number(item.parking || 0);
    cellH.numFmt = currencyFormat;
    cellH.alignment = { horizontal: 'right', vertical: 'middle' };
    cellH.border = thinBorder;

    // I: Misc.
    const cellI = row.getCell(9);
    cellI.value = Number(item.misc || 0);
    cellI.numFmt = currencyFormat;
    cellI.alignment = { horizontal: 'right', vertical: 'middle' };
    cellI.border = thinBorder;

    // J: TIP
    const cellJ = row.getCell(10);
    cellJ.value = Number(item.tip || 0);
    cellJ.numFmt = currencyFormat;
    cellJ.alignment = { horizontal: 'right', vertical: 'middle' };
    cellJ.border = thinBorder;

    // K: Total = SUM(E:J)
    const cellK = row.getCell(11);
    const calculatedSum = (Number(cellE.value?.result ?? cellE.value ?? 0)) +
      Number(item.meals || 0) + Number(item.supplies || 0) +
      Number(item.parking || 0) + Number(item.misc || 0) + Number(item.tip || 0);
    cellK.value = { formula: `SUM(E${rNum}:J${rNum})`, result: calculatedSum };
    cellK.numFmt = currencyFormat;
    cellK.alignment = { horizontal: 'right', vertical: 'middle' };
    cellK.border = thinBorder;

    // L: Adjusted Amount to Pay (light cream fill)
    const cellL = row.getCell(12);
    const adjAmt = item.adjustedAmount !== undefined ? Number(item.adjustedAmount) : calculatedSum;
    cellL.value = adjAmt;
    cellL.numFmt = currencyFormat;
    cellL.alignment = { horizontal: 'right', vertical: 'middle' };
    cellL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ADJUSTED_BG } };
    cellL.border = thinBorder;

    // M: Receipt Verification
    const cellM = row.getCell(13);
    cellM.value = item.receiptVerification || 'Verified';
    cellM.alignment = { horizontal: 'center', vertical: 'middle' };
    cellM.border = thinBorder;

    // N: Miles
    const cellN = row.getCell(14);
    cellN.value = miles;
    cellN.numFmt = numberFormat;
    cellN.alignment = { horizontal: 'right', vertical: 'middle' };
    cellN.border = thinBorder;

    // O: Gallons Per 22 Miles = N{rNum} / 22
    const cellO = row.getCell(15);
    const gallonsResult = Number((miles / mpg).toFixed(2));
    cellO.value = { formula: `N${rNum}/${mpg}`, result: gallonsResult };
    cellO.numFmt = numberFormat;
    cellO.alignment = { horizontal: 'right', vertical: 'middle' };
    cellO.border = thinBorder;

    // P: $3.5 Per Gallon = O{rNum} * 3.5
    const cellP = row.getCell(16);
    const costResult = Number((gallonsResult * gasRate).toFixed(2));
    cellP.value = { formula: `O${rNum}*${gasRate}`, result: costResult };
    cellP.numFmt = currencyFormat;
    cellP.alignment = { horizontal: 'right', vertical: 'middle' };
    cellP.border = thinBorder;

    currentRow++;
  });

  const lastDataRow = currentRow - 1;
  const totalRowIndex = currentRow;

  // ROW: TOTAL
  const totalRow = sheet.getRow(totalRowIndex);
  totalRow.height = 22;

  // Total label in Column D
  totalRow.getCell(4).value = 'TOTAL';
  totalRow.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
  totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };

  // Double underline border for accounting totals
  const totalDoubleBorder = {
    top: { style: 'thin', color: { argb: '000000' } },
    bottom: { style: 'double', color: { argb: '000000' } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } }
  };

  // Columns E through P totals
  const totalColumns = [
    { col: 5, letter: 'E', fmt: currencyFormat },
    { col: 6, letter: 'F', fmt: currencyFormat },
    { col: 7, letter: 'G', fmt: currencyFormat },
    { col: 8, letter: 'H', fmt: currencyFormat },
    { col: 9, letter: 'I', fmt: currencyFormat },
    { col: 10, letter: 'J', fmt: currencyFormat },
    { col: 11, letter: 'K', fmt: currencyFormat },
    { col: 12, letter: 'L', fmt: currencyFormat },
    { col: 13, letter: 'M', fmt: '@', isText: true },
    { col: 14, letter: 'N', fmt: numberFormat },
    { col: 15, letter: 'O', fmt: numberFormat },
    { col: 16, letter: 'P', fmt: currencyFormat }
  ];

  totalColumns.forEach(c => {
    const cell = totalRow.getCell(c.col);
    if (!c.isText) {
      cell.value = { formula: `SUM(${c.letter}${startRow}:${c.letter}${lastDataRow})` };
      cell.numFmt = c.fmt;
    } else {
      cell.value = '-';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = totalDoubleBorder;
  });

  // Borders for A-D total row
  for (let c = 1; c <= 4; c++) {
    totalRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'double', color: { argb: '000000' } }
    };
  }

  // ROW 21: APPROVED BY
  const approvalRow1 = totalRowIndex + 2;
  const rowApp1 = sheet.getRow(approvalRow1);
  rowApp1.getCell(1).value = 'APPROVED BY:';
  rowApp1.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
  sheet.mergeCells(`B${approvalRow1}:F${approvalRow1}`);
  const appByCell = sheet.getCell(`B${approvalRow1}`);
  appByCell.value = approval.approvedBy || '';
  appByCell.font = { name: 'Calibri', size: 9, bold: true };
  appByCell.border = bottomUnderline;
  for (let c = 2; c <= 6; c++) {
    rowApp1.getCell(c).border = bottomUnderline;
  }

  // ROW 22: DATE & SUMMARY TOTALS (Lavender boxes)
  const approvalRow2 = approvalRow1 + 1;
  const rowApp2 = sheet.getRow(approvalRow2);
  rowApp2.getCell(1).value = 'DATE';
  rowApp2.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
  sheet.mergeCells(`B${approvalRow2}:F${approvalRow2}`);
  const appDateCell = sheet.getCell(`B${approvalRow2}`);
  appDateCell.value = approval.date || new Date().toLocaleDateString('en-US');
  appDateCell.font = { name: 'Calibri', size: 9 };
  appDateCell.border = bottomUnderline;
  for (let c = 2; c <= 6; c++) {
    rowApp2.getCell(c).border = bottomUnderline;
  }

  // Label: "Total" right aligned at Column J (Col 10)
  const totalLabelCell = rowApp2.getCell(10);
  totalLabelCell.value = 'Total';
  totalLabelCell.font = { name: 'Calibri', size: 11, bold: true };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Lavender Box 1 (Col 11 - K): Total Claimed Sum
  const lavBox1 = rowApp2.getCell(11);
  lavBox1.value = { formula: `K${totalRowIndex}` };
  lavBox1.font = { name: 'Calibri', size: 10, bold: true };
  lavBox1.numFmt = currencyFormat;
  lavBox1.alignment = { horizontal: 'right', vertical: 'middle' };
  lavBox1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LAVENDER } };
  lavBox1.border = boxBorder;

  // Lavender Box 2 (Col 12 - L): Total Adjusted / Approved Sum
  const lavBox2 = rowApp2.getCell(12);
  lavBox2.value = { formula: `L${totalRowIndex}` };
  lavBox2.font = { name: 'Calibri', size: 10, bold: true };
  lavBox2.numFmt = currencyFormat;
  lavBox2.alignment = { horizontal: 'right', vertical: 'middle' };
  lavBox2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LAVENDER } };
  lavBox2.border = boxBorder;

  return workbook;
}

/**
 * Builds an Expense Report buffer for a specific claim from the database.
 */
async function buildClaimExpenseReportWorkbook(claim, settings = {}) {
  const gasRate = Number(claim.petrol_rate_pkr || settings.gas_rate || settings.petrol_rate || 3.50);
  const mpg = Number(settings.mpg || 22);

  const legs = Array.isArray(claim.route_legs) ? claim.route_legs : [];
  const stops = Array.isArray(claim.stops) ? claim.stops : [];

  let items = [];

  if (legs.length > 0) {
    // Break down legs into individual trip expense rows
    items = legs.map((leg, i) => {
      const distanceMiles = Number((Number(leg.distanceKm || 0) * 0.621371).toFixed(1));
      const gallons = Number((distanceMiles / mpg).toFixed(2));
      const fuelCost = Number((gallons * gasRate).toFixed(2));
      
      const destinationName = leg.toName || (stops[i]?.name) || `Stop ${i + 1}`;
      const marketName = destinationName.includes(',') ? destinationName.split(',')[1].trim() : 'Metro Area';

      return {
        date: claim.travel_date ? formatDateToUS(claim.travel_date) : '10/11/2026',
        vendor: i === 0 ? 'Shell Oil / Company Fleet' : (i === 1 ? 'Mobil Fuel' : 'Mileage Allowance'),
        description: leg.description || `Leg ${i + 1}: Transit to ${destinationName}`,
        market: marketName,
        fuel: fuelCost,
        meals: 0,
        supplies: 0,
        parking: 0,
        misc: 0,
        tip: 0,
        adjustedAmount: fuelCost,
        receiptVerification: claim.status === 'approved' ? 'Verified' : 'Pending',
        miles: distanceMiles,
        gallonsPer22Miles: gallons,
        ratePerGallon: gasRate
      };
    });
  } else {
    // Single consolidated claim row
    const totalKm = Number(claim.total_distance_km || 0);
    const distanceMiles = Number((totalKm * 0.621371).toFixed(1)) || 116.0;
    const gallons = Number((distanceMiles / mpg).toFixed(2));
    const fuelCost = Number((gallons * gasRate).toFixed(2));

    items = [
      {
        date: claim.travel_date ? formatDateToUS(claim.travel_date) : '10/11/2026',
        vendor: 'Shell Oil / Fleet',
        description: `Round-trip Business Travel: ${claim.home_location} Route`,
        market: 'Commercial District',
        fuel: fuelCost,
        meals: 0,
        supplies: 0,
        parking: 0,
        misc: 0,
        tip: 0,
        adjustedAmount: claim.approved_amount || fuelCost,
        receiptVerification: claim.status === 'approved' ? 'Verified' : 'Pending',
        miles: distanceMiles,
        gallonsPer22Miles: gallons,
        ratePerGallon: gasRate
      }
    ];
  }

  // Pad with empty/placeholder rows up to 6 if needed to mirror the template
  while (items.length < 6) {
    items.push({
      date: claim.travel_date ? formatDateToUS(claim.travel_date) : '10/11/2026',
      vendor: '',
      description: '',
      market: '',
      fuel: 0,
      meals: 0,
      supplies: 0,
      parking: 0,
      misc: 0,
      tip: 0,
      adjustedAmount: 0,
      receiptVerification: '-',
      miles: 0,
      gallonsPer22Miles: 0,
      ratePerGallon: gasRate
    });
  }

  const coveredLoc = stops.length > 0 ? (stops[0].name || stops[0].displayName) : 'Milwaukee Downtown Branch, WI';
  const coveredMkt = coveredLoc.includes(',') ? coveredLoc.split(',')[1].trim() : 'Wisconsin Metro';

  const reportData = {
    timeFrame: {
      from: claim.travel_date ? formatDotDate(claim.travel_date) : '10.07.2026',
      to: claim.travel_date ? formatDotDate(claim.travel_date) : '10.07.2026'
    },
    employee: {
      name: claim.employee_name || 'Sarah Jenkins',
      id: claim.employee_id || 'EMP-1049',
      designation: claim.designation || 'Territory Sales Representative',
      bankAccount: claim.bank_account || '•••• •••• 4829',
      bankRouting: claim.bank_routing || '071000288',
      homeLocation: claim.home_location || 'Naperville, Chicago, IL',
      homeStore: claim.home_store || 'STR-CHI-102',
      homeMarket: claim.home_market || 'Illinois / Chicago North',
      coveredLocation: claim.covered_location || coveredLoc,
      coveredStore: claim.covered_store || 'STR-MKE-405',
      coveredMarket: claim.covered_market || coveredMkt
    },
    items,
    approval: {
      approvedBy: claim.status === 'approved' ? 'System Administrator / Approver' : '',
      date: claim.reviewed_at ? formatDateToUS(claim.reviewed_at.split('T')[0]) : ''
    },
    config: {
      mpg,
      gasRate
    }
  };

  return generateExpenseReportWorkbook(reportData);
}

function formatDateToUS(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDotDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}.${parts[2]}.${parts[0]}`;
  }
  return dateStr;
}

module.exports = {
  generateExpenseReportWorkbook,
  buildClaimExpenseReportWorkbook,
  formatDateToUS,
  formatDotDate
};
