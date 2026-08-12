// utils/reportExcel.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* ------------------------- Shared helpers ------------------------- */
const cleanStr = (s) => (s == null ? "" : String(s).trim());

/** Accepts "5", "5%", 5, 0.05 → returns decimal fraction (0.05) */
const percentFromAny = (r) => {
  if (r == null || r === "") return null;
  const txt = String(r).trim();
  const hasPct = txt.includes("%");
  const n = Number(txt.replace(/%/g, ""));
  if (!isFinite(n)) return null;

  if (hasPct) return n / 100;
  if (n >= 1) return n / 100;   // <- key change: includes 1
  return n;                     // already decimal fraction (0..1)
};



/** Convert column index → Excel letter (1→A, 15→O, etc.) */
const colLetter = (n) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = ((n - 1) / 26) | 0;
  }
  return s;
};

/* -------------------- Named mappers per report -------------------- */
/**
 * 1601EQ - Schedule 4 row mapper
 * API row expected keys (adjust if your API differs):
 * - tin, corpName|name, individualName, atcCode, natureOfPayment
 * - amountMonth1/2/3, taxRate1/2/3, taxWithheld1/2/3
 */
export const map1601EQSched4Row = (r, idx) => {
  const seq = idx + 1;
  const tin = cleanStr(r?.tin);
  const corpName = cleanStr(r?.corpName ?? r?.name);
  const individualName = cleanStr(r?.individualName);
  const atc = cleanStr(r?.atcCode);
  const nature = cleanStr(r?.natureOfPayment);

  const amt1 = Number(r?.amountMonth1) || 0;
  const rate1 = percentFromAny(r?.taxRate1);
  const tax1 = Number(r?.taxWithheld1) || 0;

  const amt2 = Number(r?.amountMonth2) || 0;
  const rate2 = percentFromAny(r?.taxRate2);
  const tax2 = Number(r?.taxWithheld2) || 0;

  const amt3 = Number(r?.amountMonth3) || 0;
  const rate3 = percentFromAny(r?.taxRate3);
  const tax3 = Number(r?.taxWithheld3) || 0;

  const totalBase = Number(r?.totalBase) || 0;
  const totalTax = Number(r?.totalTax) || 0;


  return [
    seq,        // A: SEQ NO
    tin,        // B: TIN
    corpName,   // C: CORPORATION (Registered Name)
    individualName, // D: INDIVIDUAL (Last,First,Middle)
    atc,        // E: ATC CODES
    nature,     // F: NATURE OF PAYMENT
    amt1,       // G: 1st Month Amount
    rate1 ?? "",// H: 1st Rate (decimal)
    tax1,       // I: 1st Tax
    amt2,       // J: 2nd Month Amount
    rate2 ?? "",// K: 2nd Rate
    tax2,       // L: 2nd Tax
    amt3,       // M: 3rd Month Amount
    rate3 ?? "",// N: 3rd Rate
    tax3,       // O: 3rd Tax
    totalBase,// N: 3rd Rate
    totalTax,       // O: 3rd Tax
  ];
};



export const map1604ESched4Row = (r, idx) => {
  const seq = idx + 1;
  const tin = cleanStr(r?.tin);
  const corpName = cleanStr(r?.corpName ?? r?.name);
  const individualName = cleanStr(r?.individualName);
  const atc = cleanStr(r?.atcCode);
  const nature = cleanStr(r?.natureOfPayment);
  const amt = Number(r?.amountMonth) || 0;
  const rate = percentFromAny(r?.taxRate);
  const tax = Number(r?.taxWithheld) || 0;

  return [
    seq,        // A: SEQ NO
    tin,        // B: TIN
    corpName,   // C: CORPORATION (Registered Name)
    individualName, // D: INDIVIDUAL (Last,First,Middle)
    atc,        // E: ATC CODES
    nature,     // F: NATURE OF PAYMENT
    amt,       // G: 1st Month Amount
    rate ?? "",// H: 1st Rate (decimal)
    tax     // I: 1st Tax 
  ];
};




export const map1702QSched4Row = (r, idx) => {
  const seq = idx + 1;
  const tin = cleanStr(r?.tin);
  const corpName = cleanStr(r?.corpName ?? r?.name);
  const individualName = cleanStr(r?.individualName);
  const atc = cleanStr(r?.atcCode);
  const nature = cleanStr(r?.natureOfPayment);
  const amt = Number(r?.totalBase) || 0;
  const rate = percentFromAny(r?.taxRate);
  const tax = Number(r?.totalTax) || 0;

  return [
    seq,        // A: SEQ NO
    tin,        // B: TIN
    corpName,   // C: CORPORATION (Registered Name)
    individualName, // D: INDIVIDUAL (Last,First,Middle)
    atc,        // E: ATC CODES
    nature,     // F: NATURE OF PAYMENT
    amt,       // G: 1st Month Amount
    rate ?? "",// H: 1st Rate (decimal)
    tax     // I: 1st Tax 
  ];
};





export const map1702Sched4Row = (r, idx) => {
  const seq = idx + 1;
  const tin = cleanStr(r?.tin);
  const corpName = cleanStr(r?.corpName ?? r?.name);
  const individualName = cleanStr(r?.individualName);
  const atc = cleanStr(r?.atcCode);
  const nature = cleanStr(r?.natureOfPayment);
  const amt = Number(r?.totalBase) || 0;
  const rate = percentFromAny(r?.taxRate);
  const tax = Number(r?.totalTax) || 0;

  return [
    seq,        // A: SEQ NO
    tin,        // B: TIN
    corpName,   // C: CORPORATION (Registered Name)
    individualName, // D: INDIVIDUAL (Last,First,Middle)
    atc,        // E: ATC CODES
    nature,     // F: NATURE OF PAYMENT
    amt,       // G: 1st Month Amount
    rate ?? "",// H: 1st Rate (decimal)
    tax     // I: 1st Tax 
  ];
};




export const mapFSLPSched4Row = (r, idx) => {
  const taxableMonth =cleanStr(r?.taxableMonth);
  const tin = cleanStr(r?.tin);
  const corpName = cleanStr(r?.corpName);
  const individualName = cleanStr(r?.individualName);
  const regAdd = cleanStr(r?.regAdd);
  const grossPurchase = Number(r?.grossPurchase) || 0;
  const exemptPurchase = Number(r?.exemptPurchase) || 0;
  const zeroPurchase = Number(r?.zeroPurchase) || 0;
  const taxablePuchase = Number(r?.taxablePuchase) || 0;
  const servicePurchase = Number(r?.servicePurchase) || 0;
  const capitalPurchase = Number(r?.capitalPurchase) || 0;
  const otherCapitalPurchase = Number(r?.otherCapitalPurchase) || 0;
  const vatAmt = Number(r?.vatAmt) || 0;
 const amountGrossTaxablePurchase = Number(r?.amountGrossTaxablePurchase) || 0;

  return [
    taxableMonth,        // A: SEQ NO
    tin,        // B: TIN
    corpName,   // C: CORPORATION (Registered Name)
    individualName, // D: INDIVIDUAL (Last,First,Middle)
    regAdd,        // E: ATC CODES
    grossPurchase,     // F: NATURE OF PAYMENT
    exemptPurchase, 
    zeroPurchase,
    taxablePuchase,
    servicePurchase,
    capitalPurchase,
    otherCapitalPurchase,
    vatAmt,
    amountGrossTaxablePurchase,      // G: 1st Month Amount   
  ];
};





export const mapFSLSSched4Row = (r, idx) => {
  const taxableMonth =cleanStr(r?.taxableMonth);
  const tin = cleanStr(r?.tin);
  const corpName = cleanStr(r?.corpName);
  const individualName = cleanStr(r?.individualName);
  const regAdd = cleanStr(r?.regAdd);
  const grossSales = Number(r?.grossSales) || 0;
  const exemptSales = Number(r?.exemptSales) || 0;
  const zeroSales = Number(r?.zeroSales) || 0;
  const taxableSales = Number(r?.taxableSales) || 0;
  const vatAmt = Number(r?.vatAmt) || 0;
 const amountGrossTaxableSales = Number(r?.amountGrossTaxableSales) || 0;

  return [
    taxableMonth,        // A: SEQ NO
    tin,        // B: TIN
    corpName,   // C: CORPORATION (Registered Name)
    individualName, // D: INDIVIDUAL (Last,First,Middle)
    regAdd,        // E: ATC CODES
    grossSales,     // F: NATURE OF PAYMENT
    exemptSales, 
    zeroSales,
    taxableSales,  
    vatAmt,
    amountGrossTaxableSales,      // G: 1st Month Amount   
  ];
};





/**
 * Example second report mapper (template for future use).
 * Replace to match your 1604E (or other) structure when needed.
 */
export const map1604EAttachmentRow = (r, idx) => {
  const seq = idx + 1;
  return [
    seq,
    cleanStr(r?.tin),
    cleanStr(r?.payeeName),
    cleanStr(r?.atcCode),
    Number(r?.grossAmount) || 0,
    percentFromAny(r?.rate) ?? "",
    // computeTax(r?.grossAmount, r?.rate, r?.withheld),
  ];
};

/* ----------------------- Report definitions ----------------------- */
const reportDefs = {
  "1601EQ": {
    title: "ALPHABETICAL LIST OF PAYEES FROM WHOM TAXES WERE WITHHELD",
    headers: [
      "SEQ NO (1)",
      "TAXPAYER IDENTIFICATION NUMBER (2)",
      "CORPORATION (Registered Name) (3)",
      "INDIVIDUAL (Last Name,First Name, Middle Name) (4)",
      "ATC CODES (5)",
      "NATURE OF PAYMENT",
      "1ST MONTH OF THE QUARTER AMOUNT OF INCOME PAYMENT (6)",
      "TAX RATE (7)",
      "AMOUNT OF TAX WITHHELD (8)",
      "2ND MONTH OF THE QUARTER AMOUNT OF INCOME PAYMENT (9)",
      "TAX RATE (12)",
      "AMOUNT OF TAX WITHHELD (11)",
      "3RD MONTH OF THE QUARTER AMOUNT OF INCOME PAYMENT (12)",
      "TAX RATE (13)",
      "AMOUNT OF TAX WITHHELD (14)",
      "TOTAL FOR THE QUARTER TOTAL INCOME PAYMENT (15)",
      "TOTAL TAX WITHHELD (16)",
    ],
    mapper: map1601EQSched4Row,
    widths: [8, 18, 50, 50, 12, 50, 18, 10, 18, 18, 10, 18, 18, 10, 18, 18, 18], // A..O
  },

  // Example second report (keep as template; adjust/extend later)
  "1604E": {
    title: "BIR FORM 1604E - ATTACHMENT",
    headers: [
      "SEQ NO (1)",
      "TAXPAYER IDENTIFICATION NUMBER (2)",
      "CORPORATION (Registered Name) (3)",
      "INDIVIDUAL (Last Name,First Name, Middle Name) (4)",
      "ATC CODES (5)",
      "NATURE OF PAYMENT",
      "AMOUNT OF INCOME PAYMENT (6)",
      "TAX RATE (7)",
      "AMOUNT OF TAX WITHHELD (8)",
    ],
    mapper: map1604ESched4Row,
    widths: [8, 18, 50, 50, 12, 50, 18, 10, 18],
  },



   "1702Q": {
    title: "BIR FORM 1702Q - ATTACHMENT",
    headers: [
      "SEQ NO (1)",
      "TAXPAYER IDENTIFICATION NUMBER (2)",
      "CORPORATION (Registered Name) (3)",
      "INDIVIDUAL (Last Name,First Name, Middle Name) (4)",
      "ATC CODES (5)",
      "NATURE OF PAYMENT",
      "AMOUNT OF INCOME PAYMENT (6)",
      "TAX RATE (7)",
      "AMOUNT OF TAX WITHHELD (8)",
    ],
    mapper: map1702QSched4Row,
    widths: [8, 18, 50, 50, 12, 50, 18, 10, 18],
  },



  
   "1702": {
    title: "BIR FORM 1702 - ATTACHMENT",
    headers: [
      "SEQ NO (1)",
      "TAXPAYER IDENTIFICATION NUMBER (2)",
      "CORPORATION (Registered Name) (3)",
      "INDIVIDUAL (Last Name,First Name, Middle Name) (4)",
      "ATC CODES (5)",
      "NATURE OF PAYMENT",
      "AMOUNT OF INCOME PAYMENT (6)",
      "TAX RATE (7)",
      "AMOUNT OF TAX WITHHELD (8)",
    ],
    mapper: map1702Sched4Row,
    widths: [8, 18, 50, 50, 12, 50, 18, 10, 18],
  },




 "FSLP": {
    title: "SLP - ATTACHMENT",
    headers: [
      "TAXABLE MONTH (1)",
      "TAXPAYER IDENTIFICATION NUMBER (2)",
      "REGISTERED NAME (3)",
      "NAME OF SUPPLIER (Last Name,First Name, Middle Name) (4)",
      "SUPPLIER'S ADDRESS (5)",
      "AMOUNT OF GROSS PURCHASE (6)",
      "AMOUNT OF EXEMPT PURCHASE (7)",
      "AMOUNT OF ZERO-RATED PURCHASE (8)",
      "AMOUNT OF TAXABLE PURCHASE (9)",
      "AMOUNT OF PURCHASE OF SERVICES (10)",
      "AMOUNT OF PURCHASE OF CAPITAL GOODS (11)",
      "PURCHASE OF GOODS OTHER THAN CAPITAL GOODS (12)",
      "AMOUNT OF INPUT TAX (13)",
      "AMOUNT OF GROSS TAXABLE PURCHASE (14)",
    ],
    mapper: mapFSLPSched4Row,
    widths: [10, 18, 50, 50, 50, 18, 18, 18, 18, 18, 18, 18 ,18, 18],
  },



  "FSLS": {
    title: "SLS - ATTACHMENT",
    headers: [
      "TAXABLE MONTH (1)",
      "TAXPAYER IDENTIFICATION NUMBER (2)",
      "REGISTERED NAME (3)",
      "NAME OF CUSTOMER (Last Name,First Name, Middle Name) (4)",
      "CUSTOMER'S ADDRESS (5)",
      "AMOUNT OF GROSS SALES (6)",
      "AMOUNT OF EXEMPT SALES (7)",
      "AMOUNT OF ZERO-RATED SALES (8)",
      "AMOUNT OF TAXABLE SALES (9)",
      "AMOUNT OF OUTPUT TAX (10)",
      "AMOUNT OF GROSS TAXABLE SALES (11)",
    ],
    mapper: mapFSLSSched4Row,
    widths: [10, 18, 50, 50, 50, 18, 18, 18, 18, 18, 18],
  },


};






export async function export1601EQReportExcel(reportKey, apiPayload, opts = {}) {
    const def = reportDefs[reportKey];
    if (!def) throw new Error(`Unknown reportKey: ${reportKey}`);

    const {
        title = def.title,
        periodText = "",
        tin = "",
        agentName = "",
        fileName,
        data = [],
    } = apiPayload || {};

    const { slice8to11 = false } = opts;

    const workbook = new ExcelJS.Workbook();
    workbook.properties.defaultFont = {
        name: "Aptos",
        size: 10,
    };
    const ws = workbook.addWorksheet("Sheet1", {
        // Freeze pane is set after the header row (Row 7)
        views: [{ state: "frozen", ySplit: 10 }],
    });

    // Column widths
    const widths = def.widths || new Array(def.headers.length).fill(16);
    ws.columns = widths.map((w) => ({ width: w }));

    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };

    const lastCol = def.headers.length;

    // --- START HEADER SETUP (Rows 1 to 7) ---

    // Row 1: Title
    ws.getCell(1, 1).value = cleanStr(title);
    ws.getCell(1, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(1, 1).font = { name: "Aptos", size: 10};


    // Row 2: ALPHABETICAL LIST...
    ws.getCell(2, 1).value = cleanStr("ALPHABETICAL LIST OF PAYEES FROM WHOM TAXES WERE WITHHELD");
    ws.getCell(2, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(2, 1).font = { size: 12, bold: true };
    ws.getCell(2, 1).font = { name: "Aptos", size: 10, bold: true };

    // Row 3: Period
    ws.getCell(3, 1).value = periodText
        ? `For the Quarter Ending ${cleanStr(periodText)}`
        : "";
    ws.getCell(3, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(3, 1).font = { name: "Aptos"};
    // Row 4: TIN

    ws.getCell(6, 1).value = tin ? `TIN: ${cleanStr(tin)}` : "";
    ws.getCell(6, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(6, 1).font = { name: "Aptos"};

    ws.getCell(7, 1).value = agentName
        ? `WITHHOLDING AGENT'S NAME : ${cleanStr(agentName)}`
        : "";
    ws.getCell(7, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(7, 1).font = { name: "Aptos" , size: 10};
  



    // Column headers (Previously Row 6, now Row 7)
    ws.getRow(10).values = def.headers;
    ws.getRow(10).font = { name: "Aptos",bold: true , size: 10};
    ws.getRow(10).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    
    for (let c = 1; c <= lastCol; c++) { 
        const cell = ws.getCell(10, c); // Index updated to 7
        cell.border = borderThin;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
    ws.getRow(10).height = 60;
    
    // --- END HEADER SETUP ---

    // Body rows (Data starts on Row 8)
    const mapper = def.mapper;
    let body = Array.isArray(data) ? data : [];
    if (slice8to11) body = body.slice(7, 11); // optional 1-based rows 8..11

    let r = 11; // Data starts at Row 8
    body.forEach((row, idx) => {
        const arr = mapper(row, idx);
        ws.getRow(r).values = arr;
        ws.getRow(r).font = { name: "Aptos", size: 10};

        // Heuristic formatting by header keywords (exclude TAXPAYER)
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol   = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("INCOME PAYMENT");
            const isTaxCol    = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            if (isRateCol) {
                cell.numFmt = "0.00%";
            } else if (isAmountCol || isTaxCol) {
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }

            cell.border = borderThin;
        });

        r++;
    });

    /* --------------------------- Totals row --------------------------- */
    const firstDataRow = 11; // Starts at Row 8
    const lastDataRow = r - 1;
    ws.getRow(lastDataRow+1).font = { name: "Aptos", size: 10};

    if (lastDataRow >= firstDataRow) {
        // Find first numeric column by header (Amount/Tax); skip Rates and TAXPAYER
        let firstNumericColIndex = def.headers.findIndex((h) => {
            const H = (h || "").toUpperCase();
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol    = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");
            return isAmountCol || isTaxCol;
        });

        const firstNumericCol = firstNumericColIndex + 1; 
        const mergeStartCol = 1;
        const mergeEndCol = firstNumericCol > 1 ? firstNumericCol - 1 : lastCol; 

        // Merge TOTAL label
        if (mergeEndCol >= mergeStartCol) {
            ws.mergeCells(r, mergeStartCol, r, mergeEndCol);
        }
        
        const totalLabelCell = ws.getCell(r, mergeStartCol);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { bold: true, name: "Aptos"};
        totalLabelCell.alignment = { horizontal: "right", vertical: "middle" }; 

        // Formulas / styles on total row
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol   = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("INCOME PAYMENT") ;
            const isTaxCol    = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            // Medium top border for totals row
            cell.border = {
                top: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
            };

            // Skip cells that are part of the merged TOTAL label
            if (col > mergeStartCol && col <= mergeEndCol) return; 
            if (col === mergeStartCol && mergeEndCol >= mergeStartCol && !isAmountCol && !isTaxCol) return; 

            if (isRateCol) {
                cell.value = "";
                cell.numFmt = "0.00%";
                return;
            }

            if (isAmountCol || isTaxCol) {
                const L = colLetter(col);
                cell.value = { formula: `SUM(${L}${firstDataRow}:${L}${lastDataRow})` };
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                return;
            }

            if (col > mergeEndCol) cell.value = "";
        });

        // Optional: light fill for totals row
        ws.getRow(r).eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
    }

    const outName = cleanStr(fileName) || `${reportKey}.xlsx`;

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        outName
    );
}





export async function export1604EReportExcel(reportKey, apiPayload, opts = {}) {
    const def = reportDefs[reportKey];
    if (!def) throw new Error(`Unknown reportKey: ${reportKey}`);

    const {
        title = def.title,
        periodText = "",
        tin = "",
        agentName = "",
        fileName,
        data = [],
    } = apiPayload || {};

    const { slice8to11 = false } = opts;

    const workbook = new ExcelJS.Workbook();
    workbook.properties.defaultFont = {
        name: "Aptos",
        size: 10,
    };
    const ws = workbook.addWorksheet("Sheet1", {
        // Freeze pane below the header row (Row 8)
        views: [{ state: "frozen", ySplit: 8 }],
    });

    // Column widths
    const widths = def.widths || new Array(def.headers.length).fill(16);
    ws.columns = widths.map((w) => ({ width: w }));

    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };

    // Calculate the last column index for merging the main header text
    const lastCol = def.headers.length;

    // --- START HEADER SETUP (Rows 1 to 8) ---

    // Row 1: Title
    ws.getCell(1, 1).value = cleanStr(title);
    ws.getCell(1, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(1,1).font = { name: "Aptos" , size: 10};
    

    // Row 2: ALPHABETICAL LIST...
    ws.getCell(2, 1).value = cleanStr("ALPHABETICAL LIST OF PAYEES FROM WHOM TAXES WERE WITHHELD ");
    ws.getCell(2, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(2, 1).font = { name: "Aptos" ,size: 10, bold: true };

    // Row 3: Period
    ws.getCell(3, 1).value = periodText
        ? `FOR THE MONTH OF ${cleanStr(periodText)}`
        : "";
    ws.getCell(3, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(3,1).font = { name: "Aptos" , size: 10};
    // Row 4: TIN
    ws.getCell(6, 1).value = tin ? `TIN: ${cleanStr(tin)}` : "";
    ws.getCell(6, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(6, 1).font = { name: "Aptos" , size: 10};
    // Row 5: Withholding Agent
    ws.getCell(7, 1).value = agentName
        ? `WITHHOLDING AGENT'S NAME : ${cleanStr(agentName)}`
        : "";
    ws.getCell(7, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(7, 1).font = { name: "Aptos" , size: 10};
    // --- NEW BLANK SPACE (Row 6) ---


    // Column headers (Previously Row 7, now Row 8)
    ws.getRow(9).values = def.headers;
    ws.getRow(9).font = { name: "Aptos" , size: 10, bold: true };
    ws.getRow(9).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Apply formatting to Row 8 cells (headers)
    for (let c = 1; c <= lastCol; c++) {
        const cell = ws.getCell(9, c);
        cell.border = borderThin;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
    ws.getRow(9).height = 60;

    // --- END HEADER SETUP ---

    // Body rows (Data starts on Row 9)
    const mapper = def.mapper;
    let body = Array.isArray(data) ? data : [];
    if (slice8to11) body = body.slice(7, 11); // optional 1-based rows 8..11

    let r = 10; // Starts at Row 9
    body.forEach((row, idx) => {
        const arr = mapper(row, idx);
        ws.getRow(r).values = arr;
        ws.getRow(r).font = { name: "Aptos" , size: 10};

        // Heuristic formatting by header keywords (exclude TAXPAYER)
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            if (isRateCol) {
                cell.numFmt = "0.00%";
            } else if (isAmountCol || isTaxCol) {
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }

            cell.border = borderThin;
            if (col === 1) cell.alignment = { horizontal: "right", vertical: "middle" };
        });

        r++;
    });

    /* --------------------------- Totals row --------------------------- */
    const firstDataRow = 10; // Starts at Row 9
    const lastDataRow = r - 1; // r is the next available row
    ws.getRow(lastDataRow+1).font = { name: "Aptos", size: 10,bold: true };


    if (lastDataRow >= firstDataRow) {
        // Find first numeric column by header (Amount/Tax); skip Rates and TAXPAYER
        let firstNumericColIndex = def.headers.findIndex((h) => {
            const H = (h || "").toUpperCase();
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");
            return isAmountCol || isTaxCol;
        });

        const firstNumericCol = firstNumericColIndex + 1; // 1-based column number      
        // The merge end column should be *before* the first numeric column
        const mergeStartCol = 1;
        const mergeEndCol = firstNumericCol > 1 ? firstNumericCol - 1 : lastCol; 

        // Merge TOTAL label (Optional merging logic)
        if (mergeEndCol > mergeStartCol) {
            ws.mergeCells(r, mergeStartCol, r, mergeEndCol);
        }

        const totalLabelCell = ws.getCell(r, mergeStartCol);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { name: "Aptos", size: 10,bold: true };
        totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };


        // Formulas / styles on total row
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            // Medium top border for totals row
            cell.border = {
                top: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
            };

            // Skip the merged columns after the label start cell
            if (col > mergeStartCol && col <= mergeEndCol) return;

            // Skip the TOTAL label cell itself if merged
            if (col === mergeStartCol && mergeEndCol > mergeStartCol) return;


            if (isRateCol) {
                cell.value = "";
                cell.numFmt = "0.00%";
                return;
            }

            if (isAmountCol || isTaxCol) {
                const L = colLetter(col);
                cell.value = { formula: `SUM(${L}${firstDataRow}:${L}${lastDataRow})` };
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                return;
            }

            // Fill remaining non-numeric columns with empty string after the merge range
            if (col > mergeEndCol) cell.value = "";
        });

        // Optional: light fill for totals row
        ws.getRow(r).eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
    }

    // Filename: use API-provided fileName or default to reportKey.xlsx
    const outName = cleanStr(fileName) || `${reportKey}.xlsx`;

    // Write & download
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        outName
    );
}










export async function export1702QReportExcel(reportKey, apiPayload, opts = {}) {
    const def = reportDefs[reportKey];
    if (!def) throw new Error(`Unknown reportKey: ${reportKey}`);

    const {
        title = def.title,
        periodText = "",
        tin = "",
        agentName = "",
        fileName,
        data = [],
    } = apiPayload || {};

    const { slice8to11 = false } = opts;

    const workbook = new ExcelJS.Workbook();
    workbook.properties.defaultFont = {
        name: "Aptos",
        size: 10,
    };
    const ws = workbook.addWorksheet("Sheet1", {
        // Freeze pane below the header row (Row 8)
        views: [{ state: "frozen", ySplit: 9 }],
    });

    // Column widths
    const widths = def.widths || new Array(def.headers.length).fill(16);
    ws.columns = widths.map((w) => ({ width: w }));

    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };

    // Calculate the last column index for merging the main header text
    const lastCol = def.headers.length;

    // --- START HEADER SETUP (Rows 1 to 8) ---

    // Row 1: Title
    ws.getCell(1, 1).value = cleanStr(title);
    ws.getCell(1, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(1,1).font = { name: "Aptos" , size: 10};
    

    // Row 2: ALPHABETICAL LIST...
    ws.getCell(2, 1).value = cleanStr("SUMMARY ALPHALIST OF WITHHOLDING TAXES (SAWT)");
    ws.getCell(2, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(2, 1).font = { name: "Aptos" ,size: 10, bold: true };

    // Row 3: Period
    ws.getCell(3, 1).value = periodText
        ? `FOR THE MONTH OF ${cleanStr(periodText)}`
        : "";
    ws.getCell(3, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(3,1).font = { name: "Aptos" , size: 10};
    // Row 4: TIN
    ws.getCell(6, 1).value = tin ? `TIN: ${cleanStr(tin)}` : "";
    ws.getCell(6, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(6, 1).font = { name: "Aptos" , size: 10};
    // Row 5: Withholding Agent
    ws.getCell(7, 1).value = agentName
        ? `PAYEE'S NAME : ${cleanStr(agentName)}`
        : "";
    ws.getCell(7, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(7, 1).font = { name: "Aptos" , size: 10};
    // --- NEW BLANK SPACE (Row 6) ---


    // Column headers (Previously Row 7, now Row 8)
    ws.getRow(9).values = def.headers;
    ws.getRow(9).font = { name: "Aptos" , size: 10, bold: true };
    ws.getRow(9).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Apply formatting to Row 8 cells (headers)
    for (let c = 1; c <= lastCol; c++) {
        const cell = ws.getCell(9, c);
        cell.border = borderThin;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
    ws.getRow(9).height = 60;

    // --- END HEADER SETUP ---

    // Body rows (Data starts on Row 9)
    const mapper = def.mapper;
    let body = Array.isArray(data) ? data : [];
    if (slice8to11) body = body.slice(7, 11); // optional 1-based rows 8..11

    let r = 10; // Starts at Row 9
    body.forEach((row, idx) => {
        const arr = mapper(row, idx);
        ws.getRow(r).values = arr;
        ws.getRow(r).font = { name: "Aptos" , size: 10};

        // Heuristic formatting by header keywords (exclude TAXPAYER)
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            if (isRateCol) {
                cell.numFmt = "0.00%";
            } else if (isAmountCol || isTaxCol) {
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }

            cell.border = borderThin;
            if (col === 1) cell.alignment = { horizontal: "right", vertical: "middle" };
        });

        r++;
    });

    /* --------------------------- Totals row --------------------------- */
    const firstDataRow = 10; // Starts at Row 9
    const lastDataRow = r - 1; // r is the next available row
    ws.getRow(lastDataRow+1).font = { name: "Aptos", size: 10,bold: true };


    if (lastDataRow >= firstDataRow) {
        // Find first numeric column by header (Amount/Tax); skip Rates and TAXPAYER
        let firstNumericColIndex = def.headers.findIndex((h) => {
            const H = (h || "").toUpperCase();
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");
            return isAmountCol || isTaxCol;
        });

        const firstNumericCol = firstNumericColIndex + 1; // 1-based column number      
        // The merge end column should be *before* the first numeric column
        const mergeStartCol = 1;
        const mergeEndCol = firstNumericCol > 1 ? firstNumericCol - 1 : lastCol; 

        // Merge TOTAL label (Optional merging logic)
        if (mergeEndCol > mergeStartCol) {
            ws.mergeCells(r, mergeStartCol, r, mergeEndCol);
        }

        const totalLabelCell = ws.getCell(r, mergeStartCol);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { name: "Aptos", size: 10,bold: true };
        totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };


        // Formulas / styles on total row
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            // Medium top border for totals row
            cell.border = {
                top: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
            };

            // Skip the merged columns after the label start cell
            if (col > mergeStartCol && col <= mergeEndCol) return;

            // Skip the TOTAL label cell itself if merged
            if (col === mergeStartCol && mergeEndCol > mergeStartCol) return;


            if (isRateCol) {
                cell.value = "";
                cell.numFmt = "0.00%";
                return;
            }

            if (isAmountCol || isTaxCol) {
                const L = colLetter(col);
                cell.value = { formula: `SUM(${L}${firstDataRow}:${L}${lastDataRow})` };
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                return;
            }

            // Fill remaining non-numeric columns with empty string after the merge range
            if (col > mergeEndCol) cell.value = "";
        });

        // Optional: light fill for totals row
        ws.getRow(r).eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
    }

    // Filename: use API-provided fileName or default to reportKey.xlsx
    const outName = cleanStr(fileName) || `${reportKey}.xlsx`;

    // Write & download
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        outName
    );
}










export async function export1702ReportExcel(reportKey, apiPayload, opts = {}) {
    const def = reportDefs[reportKey];
    if (!def) throw new Error(`Unknown reportKey: ${reportKey}`);

    const {
        title = def.title,
        periodText = "",
        tin = "",
        agentName = "",
        fileName,
        data = [],
    } = apiPayload || {};

    const { slice8to11 = false } = opts;

    const workbook = new ExcelJS.Workbook();
    workbook.properties.defaultFont = {
        name: "Aptos",
        size: 10,
    };
    const ws = workbook.addWorksheet("Sheet1", {
        // Freeze pane below the header row (Row 8)
        views: [{ state: "frozen", ySplit: 9 }],
    });

    // Column widths
    const widths = def.widths || new Array(def.headers.length).fill(16);
    ws.columns = widths.map((w) => ({ width: w }));

    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };

    // Calculate the last column index for merging the main header text
    const lastCol = def.headers.length;

    // --- START HEADER SETUP (Rows 1 to 8) ---

    // Row 1: Title
    ws.getCell(1, 1).value = cleanStr(title);
    ws.getCell(1, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(1,1).font = { name: "Aptos" , size: 10};
    

    // Row 2: ALPHABETICAL LIST...
    ws.getCell(2, 1).value = cleanStr("SUMMARY ALPHALIST OF WITHHOLDING TAXES (SAWT)");
    ws.getCell(2, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(2, 1).font = { name: "Aptos" ,size: 10, bold: true };

    // Row 3: Period
    ws.getCell(3, 1).value = periodText
        ? `FOR THE MONTH OF ${cleanStr(periodText)}`
        : "";
    ws.getCell(3, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(3,1).font = { name: "Aptos" , size: 10};
    // Row 4: TIN
    ws.getCell(6, 1).value = tin ? `TIN: ${cleanStr(tin)}` : "";
    ws.getCell(6, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(6, 1).font = { name: "Aptos" , size: 10};
    // Row 5: Withholding Agent
    ws.getCell(7, 1).value = agentName
        ? `PAYEE'S NAME : ${cleanStr(agentName)}`
        : "";
    ws.getCell(7, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(7, 1).font = { name: "Aptos" , size: 10};
    // --- NEW BLANK SPACE (Row 6) ---


    // Column headers (Previously Row 7, now Row 8)
    ws.getRow(9).values = def.headers;
    ws.getRow(9).font = { name: "Aptos" , size: 10, bold: true };
    ws.getRow(9).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Apply formatting to Row 8 cells (headers)
    for (let c = 1; c <= lastCol; c++) {
        const cell = ws.getCell(9, c);
        cell.border = borderThin;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
    ws.getRow(9).height = 60;

    // --- END HEADER SETUP ---

    // Body rows (Data starts on Row 9)
    const mapper = def.mapper;
    let body = Array.isArray(data) ? data : [];
    if (slice8to11) body = body.slice(7, 11); // optional 1-based rows 8..11

    let r = 10; // Starts at Row 9
    body.forEach((row, idx) => {
        const arr = mapper(row, idx);
        ws.getRow(r).values = arr;
        ws.getRow(r).font = { name: "Aptos" , size: 10};

        // Heuristic formatting by header keywords (exclude TAXPAYER)
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            if (isRateCol) {
                cell.numFmt = "0.00%";
            } else if (isAmountCol || isTaxCol) {
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }

            cell.border = borderThin;
            if (col === 1) cell.alignment = { horizontal: "right", vertical: "middle" };
        });

        r++;
    });

    /* --------------------------- Totals row --------------------------- */
    const firstDataRow = 10; // Starts at Row 9
    const lastDataRow = r - 1; // r is the next available row
    ws.getRow(lastDataRow+1).font = { name: "Aptos", size: 10,bold: true };


    if (lastDataRow >= firstDataRow) {
        // Find first numeric column by header (Amount/Tax); skip Rates and TAXPAYER
        let firstNumericColIndex = def.headers.findIndex((h) => {
            const H = (h || "").toUpperCase();
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");
            return isAmountCol || isTaxCol;
        });

        const firstNumericCol = firstNumericColIndex + 1; // 1-based column number      
        // The merge end column should be *before* the first numeric column
        const mergeStartCol = 1;
        const mergeEndCol = firstNumericCol > 1 ? firstNumericCol - 1 : lastCol; 

        // Merge TOTAL label (Optional merging logic)
        if (mergeEndCol > mergeStartCol) {
            ws.mergeCells(r, mergeStartCol, r, mergeEndCol);
        }

        const totalLabelCell = ws.getCell(r, mergeStartCol);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { name: "Aptos", size: 10,bold: true };
        totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };


        // Formulas / styles on total row
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);

            const isRateCol = H.includes("RATE");
            const isAmountCol = /\bAMOUNT\b/.test(H);
            const isTaxCol = /\bTAX\b/.test(H) && !H.includes("TAXPAYER") && !H.includes("RATE");

            // Medium top border for totals row
            cell.border = {
                top: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
            };

            // Skip the merged columns after the label start cell
            if (col > mergeStartCol && col <= mergeEndCol) return;

            // Skip the TOTAL label cell itself if merged
            if (col === mergeStartCol && mergeEndCol > mergeStartCol) return;


            if (isRateCol) {
                cell.value = "";
                cell.numFmt = "0.00%";
                return;
            }

            if (isAmountCol || isTaxCol) {
                const L = colLetter(col);
                cell.value = { formula: `SUM(${L}${firstDataRow}:${L}${lastDataRow})` };
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                return;
            }

            // Fill remaining non-numeric columns with empty string after the merge range
            if (col > mergeEndCol) cell.value = "";
        });

        // Optional: light fill for totals row
        ws.getRow(r).eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
    }

    // Filename: use API-provided fileName or default to reportKey.xlsx
    const outName = cleanStr(fileName) || `${reportKey}.xlsx`;

    // Write & download
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        outName
    );
}







export async function exportFSLPReportExcel(reportKey, apiPayload, opts = {}) {
    const def = reportDefs[reportKey];
    if (!def) throw new Error(`Unknown reportKey: ${reportKey}`);


    const {
        title = def.title,
        tin = "",
        agentName = "",
        fileName,
        addr = "",
        data = [],
    } = apiPayload || {};

    const { slice8to11 = false } = opts;

    const workbook = new ExcelJS.Workbook();
    workbook.properties.defaultFont = {
        name: "Aptos",
        size: 10,
    };
    const ws = workbook.addWorksheet("Sheet1", {
        // 🌟 REVISION 1: Freeze pane is set after the new header row (Row 11), so ySplit is 12
        views: [{ state: "frozen", ySplit: 11 }],
    });

    // Column widths
    const widths = def.widths || new Array(def.headers.length).fill(16);
    ws.columns = widths.map((w) => ({ width: w }));

    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };

    const lastCol = def.headers.length;
   
    const defaultStyle = {
        alignment: { horizontal: "left", vertical: "middle" },
        font: { name: "Aptos", size: 10 }
    };
    const setCellWithValueAndStyle = (ws, row, col, value) => {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.alignment = defaultStyle.alignment;
    cell.font = defaultStyle.font;
    };


    
    setCellWithValueAndStyle(ws, 1, 1, cleanStr("PURCHASE TRANSACTION"));
    setCellWithValueAndStyle(ws, 2, 1, cleanStr(title));

    ws.insertRow(3, []);
    ws.insertRow(4, []);
    ws.insertRow(5, []);

    const tinValue = tin ? `TIN: ${cleanStr(tin)}` : "";
    const ownerNameValue = agentName ? `OWNER'S NAME: ${cleanStr(agentName)}` : "";
    const ownerTradeNameValue = agentName ? `OWNER'S TRADE NAME: ${cleanStr(agentName)}` : "";
    const ownerAddressValue = agentName ? `OWNER'S ADDRESS: ${cleanStr(addr)}` : "";

    setCellWithValueAndStyle(ws, 6, 1, tinValue);
    setCellWithValueAndStyle(ws, 7, 1, ownerNameValue);
    setCellWithValueAndStyle(ws, 8, 1, ownerTradeNameValue);
    setCellWithValueAndStyle(ws, 9, 1, ownerAddressValue);
    ws.insertRow(10, []);
        
   
    
    // Column headers (Was Row 7, now Row 11)
    ws.getRow(11).values = def.headers;
    ws.getRow(11).font = { name: "Aptos",bold: true , size: 10};
    ws.getRow(11).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    
    for (let c = 1; c <= lastCol; c++) { 
        const cell = ws.getCell(11, c); // Index updated to 11
        cell.border = borderThin;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
    ws.getRow(11).height = 60;
    
    // --- END HEADER SETUP (Row 11 is the last header row) ---

    // Body rows (Data starts on Row 12)
    const mapper = def.mapper;
    let body = Array.isArray(data) ? data : [];
    if (slice8to11) body = body.slice(7, 11); // This logic still applies to the source data

    // 🌟 REVISION 3: Data starts at Row 12
    let r = 12; 
    body.forEach((row, idx) => {
        const arr = mapper(row, idx);
        ws.getRow(r).values = arr;
        ws.getRow(r).font = { name: "Aptos", size: 10};

        // Heuristic formatting by header keywords (exclude TAXPAYER)
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("AMOUNT") || H.includes("PURCHASE");

           if (isAmountCol ) {
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }

            cell.border = borderThin;
        });

        r++;
    });

    /* --------------------------- Totals row --------------------------- */
    // 🌟 REVISION 4: First data row is 12
    const firstDataRow = 12; 
    const lastDataRow = r - 1;
    ws.getRow(lastDataRow+1).font = { name: "Aptos", size: 10};

    if (lastDataRow >= firstDataRow) {
        // Find first numeric column by header (Amount/Tax); skip Rates and TAXPAYER
        let firstNumericColIndex = def.headers.findIndex((h) => {
            const H = (h || "").toUpperCase();
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("AMOUNT") || H.includes("PURCHASE");
            return isAmountCol;
        });

        const firstNumericCol = firstNumericColIndex + 1; 
        const mergeStartCol = 1;
        const mergeEndCol = firstNumericCol > 1 ? firstNumericCol - 1 : lastCol; 

        // Merge TOTAL label
        if (mergeEndCol >= mergeStartCol) {
            ws.mergeCells(r, mergeStartCol, r, mergeEndCol);
        }
        
        const totalLabelCell = ws.getCell(r, mergeStartCol);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { bold: true, name: "Aptos"};
        totalLabelCell.alignment = { horizontal: "right", vertical: "middle" }; 

       // Formulas / styles on total row
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("AMOUNT") || H.includes("PURCHASE") ;


            // Medium top border for totals row
            cell.border = {
                top: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
            };

            // Skip cells that are part of the merged TOTAL label
            if (col > mergeStartCol && col <= mergeEndCol) return; 
            if (col === mergeStartCol && mergeEndCol >= mergeStartCol && !isAmountCol ) return; 


            if (isAmountCol ) {
                const L = colLetter(col);
                // 🌟 Formula range updated to start at 12
                cell.value = { formula: `SUM(${L}${firstDataRow}:${L}${lastDataRow})` }; 
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                return;
            }

            if (col > mergeEndCol) cell.value = "";
        });

        // Optional: light fill for totals row
        ws.getRow(r).eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
    }

    const outName = cleanStr(fileName) || `${reportKey}.xlsx`;

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        outName
    );
}







export async function exportFSLSReportExcel(reportKey, apiPayload, opts = {}) {
    const def = reportDefs[reportKey];
    if (!def) throw new Error(`Unknown reportKey: ${reportKey}`);


    const {
        title = def.title,
        tin = "",
        agentName = "",
        fileName,
        addr = "",
        data = [],
    } = apiPayload || {};

    const { slice8to11 = false } = opts;

    const workbook = new ExcelJS.Workbook();
    workbook.properties.defaultFont = {
        name: "Aptos",
        size: 10,
    };
    const ws = workbook.addWorksheet("Sheet1", {
        // 🌟 REVISION 1: Freeze pane is set after the new header row (Row 11), so ySplit is 12
        views: [{ state: "frozen", ySplit: 11 }],
    });

    // Column widths
    const widths = def.widths || new Array(def.headers.length).fill(16);
    ws.columns = widths.map((w) => ({ width: w }));

    const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };

    const lastCol = def.headers.length;
   
    const defaultStyle = {
        alignment: { horizontal: "left", vertical: "middle" },
        font: { name: "Aptos", size: 10 }
    };
    const setCellWithValueAndStyle = (ws, row, col, value) => {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.alignment = defaultStyle.alignment;
    cell.font = defaultStyle.font;
    };


    
    setCellWithValueAndStyle(ws, 1, 1, cleanStr("SALES TRANSACTION"));
    setCellWithValueAndStyle(ws, 2, 1, cleanStr(title));

    ws.insertRow(3, []);
    ws.insertRow(4, []);
    ws.insertRow(5, []);

    const tinValue = tin ? `TIN: ${cleanStr(tin)}` : "";
    const ownerNameValue = agentName ? `OWNER'S NAME: ${cleanStr(agentName)}` : "";
    const ownerTradeNameValue = agentName ? `OWNER'S TRADE NAME: ${cleanStr(agentName)}` : "";
    const ownerAddressValue = agentName ? `OWNER'S ADDRESS: ${cleanStr(addr)}` : "";

    setCellWithValueAndStyle(ws, 6, 1, tinValue);
    setCellWithValueAndStyle(ws, 7, 1, ownerNameValue);
    setCellWithValueAndStyle(ws, 8, 1, ownerTradeNameValue);
    setCellWithValueAndStyle(ws, 9, 1, ownerAddressValue);
    ws.insertRow(10, []);
        
   
    
    // Column headers (Was Row 7, now Row 11)
    ws.getRow(11).values = def.headers;
    ws.getRow(11).font = { name: "Aptos",bold: true , size: 10};
    ws.getRow(11).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    
    for (let c = 1; c <= lastCol; c++) { 
        const cell = ws.getCell(11, c); // Index updated to 11
        cell.border = borderThin;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    }
    ws.getRow(11).height = 60;
    
    // --- END HEADER SETUP (Row 11 is the last header row) ---

    // Body rows (Data starts on Row 12)
    const mapper = def.mapper;
    let body = Array.isArray(data) ? data : [];
    if (slice8to11) body = body.slice(7, 11); // This logic still applies to the source data

    // 🌟 REVISION 3: Data starts at Row 12
    let r = 12; 
    body.forEach((row, idx) => {
        const arr = mapper(row, idx);
        ws.getRow(r).values = arr;
        ws.getRow(r).font = { name: "Aptos", size: 10};

        // Heuristic formatting by header keywords (exclude TAXPAYER)
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("AMOUNT") || H.includes("SALES");

           if (isAmountCol ) {
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
            }

            cell.border = borderThin;
        });

        r++;
    });

    /* --------------------------- Totals row --------------------------- */
    // 🌟 REVISION 4: First data row is 12
    const firstDataRow = 12; 
    const lastDataRow = r - 1;
    ws.getRow(lastDataRow+1).font = { name: "Aptos", size: 10};

    if (lastDataRow >= firstDataRow) {
        // Find first numeric column by header (Amount/Tax); skip Rates and TAXPAYER
        let firstNumericColIndex = def.headers.findIndex((h) => {
            const H = (h || "").toUpperCase();
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("AMOUNT") || H.includes("SALES");
            return isAmountCol;
        });

        const firstNumericCol = firstNumericColIndex + 1; 
        const mergeStartCol = 1;
        const mergeEndCol = firstNumericCol > 1 ? firstNumericCol - 1 : lastCol; 

        // Merge TOTAL label
        if (mergeEndCol >= mergeStartCol) {
            ws.mergeCells(r, mergeStartCol, r, mergeEndCol);
        }
        
        const totalLabelCell = ws.getCell(r, mergeStartCol);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { bold: true, name: "Aptos"};
        totalLabelCell.alignment = { horizontal: "right", vertical: "middle" }; 

       // Formulas / styles on total row
        def.headers.forEach((h, i) => {
            const col = i + 1;
            const H = (h || "").toUpperCase();
            const cell = ws.getCell(r, col);
            const isAmountCol = /\bAMOUNT\b/.test(H) || H.includes("AMOUNT") || H.includes("SALES") ;


            // Medium top border for totals row
            cell.border = {
                top: { style: "medium" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
            };

            // Skip cells that are part of the merged TOTAL label
            if (col > mergeStartCol && col <= mergeEndCol) return; 
            if (col === mergeStartCol && mergeEndCol >= mergeStartCol && !isAmountCol ) return; 


            if (isAmountCol ) {
                const L = colLetter(col);
                // 🌟 Formula range updated to start at 12
                cell.value = { formula: `SUM(${L}${firstDataRow}:${L}${lastDataRow})` }; 
                cell.numFmt = '#,##0.00;[Red]-#,##0.00;0.00';
                cell.alignment = { horizontal: "right", vertical: "middle" };
                return;
            }

            if (col > mergeEndCol) cell.value = "";
        });

        // Optional: light fill for totals row
        ws.getRow(r).eachCell((c) => {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
    }

    const outName = cleanStr(fileName) || `${reportKey}.xlsx`;

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        outName
    );
}









