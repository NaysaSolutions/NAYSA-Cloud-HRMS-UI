
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import bir2307Page1 from "./bir-2307-page1.svg";
import { postRequest } from "../../../Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 936;
const ROWS_PER_SECTION = 10;

const FORM_NATIVE_WIDTH_IN = 8.5;
const FORM_NATIVE_HEIGHT_IN = 13;
const PRINT_MARGIN_IN = 0.05;
const FILL_PAGE_MARGIN_IN = 0.08;
const PDF_RENDER_DPI = 200;

const PAPER_SIZE_OPTIONS = Object.freeze({
  long: {
    key: "long",
    label: "Long / Folio",
    shortLabel: "Long",
    widthIn: 8.5,
    heightIn: 13,
  },
  a4: {
    key: "a4",
    label: "A4",
    shortLabel: "A4",
    widthIn: 210 / 25.4,
    heightIn: 297 / 25.4,
  },
  short: {
    key: "short",
    label: "Short / Letter",
    shortLabel: "Short",
    widthIn: 8.5,
    heightIn: 11,
  },
});

const getPaperLayout = (paperKey, fitMode = "fit") => {
  const paper = PAPER_SIZE_OPTIONS[paperKey] || PAPER_SIZE_OPTIONS.long;
  const isFillPage = fitMode === "stretch";
  const marginIn = isFillPage ? FILL_PAGE_MARGIN_IN : PRINT_MARGIN_IN;
  const availableWidthIn = Math.max(0.1, paper.widthIn - marginIn * 2);
  const availableHeightIn = Math.max(0.1, paper.heightIn - marginIn * 2);
  const scale = Math.min(
    availableWidthIn / FORM_NATIVE_WIDTH_IN,
    availableHeightIn / FORM_NATIVE_HEIGHT_IN,
  );
  const fittedWidthIn = FORM_NATIVE_WIDTH_IN * scale;
  const fittedHeightIn = FORM_NATIVE_HEIGHT_IN * scale;

  // Fit preserves the official 8.5 x 13 proportion. Fill Page intentionally
  // uses nearly the full selected paper size. This removes the large side
  // margins on A4 and Short/Letter while retaining a small printable margin.
  const formWidthIn = isFillPage ? availableWidthIn : fittedWidthIn;
  const formHeightIn = isFillPage ? availableHeightIn : fittedHeightIn;

  return {
    ...paper,
    widthPt: paper.widthIn * 72,
    heightPt: paper.heightIn * 72,
    formWidthIn,
    formHeightIn,
    formLeftIn: (paper.widthIn - formWidthIn) / 2,
    formTopIn: (paper.heightIn - formHeightIn) / 2,
    formWidthPercent: (formWidthIn / paper.widthIn) * 100,
    formHeightPercent: (formHeightIn / paper.heightIn) * 100,
    aspectRatio: paper.widthIn / paper.heightIn,
    isFillPage,
  };
};

const DATE_FROM_X = [157.94, 171.14, 184.75, 197.86, 210.58, 223.78, 237.38, 250.5];
const DATE_TO_X = [405.5, 418.73, 432.35, 445.48, 458.2, 471.42, 485.05, 498.17];

const PAYEE_TIN_X = [
  213.79,
  226.98,
  240.16,
  265.44,
  278.63,
  291.81,
  316.79,
  329.98,
  343.16,
  368.7,
  383.46,
  399.02,
  414.43,
  428.64,
];
const PAYOR_TIN_X = PAYEE_TIN_X.map((value) => value + 0.81);

const PAYEE_ZIP_X = [548.07, 560.57, 573.07, 585.57];
const PAYOR_ZIP_X = PAYEE_ZIP_X;

const EXPANDED_ROW_Y = Array.from(
  { length: ROWS_PER_SECTION },
  (_, index) => 372.15 + index * 13.68,
);
const BUSINESS_ROW_Y = Array.from(
  { length: ROWS_PER_SECTION },
  (_, index) => 541.63 + index * 13.68,
);

const PAYOR_ISSUE_DATE_X = [
  323.62,
  336.74,
  349.86,
  362.98,
  376.06,
  389.18,
  402.3,
  415.42,
];
const PAYOR_EXPIRY_DATE_X = [
  493.86,
  507.02,
  520.18,
  533.34,
  546.48,
  559.64,
  572.8,
  585.96,
];
const PAYEE_ISSUE_DATE_X = PAYOR_ISSUE_DATE_X.map((value) => value + 0.08);
const PAYEE_EXPIRY_DATE_X = PAYOR_EXPIRY_DATE_X.map((value) => value + 0.09);

const EMPTY_TOTALS = Object.freeze({
  month1Amount: 0,
  month2Amount: 0,
  month3Amount: 0,
  totalAmount: 0,
  taxWithheld: 0,
});

export const SAMPLE_2307_DATA = {
  formKey: "HO|SAMPLE|202601",
  sourceTranId: "SAMPLE-TRANSACTION",
  periodFrom: "2026-01-01",
  periodTo: "2026-03-31",
  payee: {
    tin: "123-456-789-00000",
    registeredName: "SAMPLE SUPPLIER CORPORATION",
    registeredAddress: "123 SAMPLE STREET, BARANGAY SAMPLE, MAKATI CITY",
    zipCode: "1200",
    foreignAddress: "",
  },
  payor: {
    tin: "987-654-321-00000",
    registeredName: "NAYSA SAMPLE COMPANY",
    registeredAddress: "456 BUSINESS AVENUE, QUEZON CITY",
    zipCode: "1100",
  },
  expandedWithholdingDetails: [
    {
      incomeDescription: "PROFESSIONAL FEES",
      atcCode: "WC010",
      month1Amount: 100000,
      month2Amount: 120000,
      month3Amount: 80000,
      taxWithheld: 30000,
    },
  ],
  businessTaxDetails: [],
  payorSignatory: {
    printedName: "",
    title: "",
    tin: "",
    accreditationNo: "",
    dateIssued: "",
    dateExpiry: "",
  },
  payeeSignatory: {
    printedName: "",
    title: "",
    tin: "",
    accreditationNo: "",
    dateIssued: "",
    dateExpiry: "",
  },
};

const toNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanUpper = (value) => String(value ?? "").trim().toUpperCase();

const normalizeTin = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";

  return [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 14),
  ]
    .filter(Boolean)
    .join("-");
};

const normalizeDate = (value) => {
  if (!value) return "";

  const source = String(value).trim();
  const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;

  const slashDate = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDate) return source;

  const digits = source.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  return source;
};

const parseJsonValue = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeSignatory = (value) => {
  if (typeof value === "string") {
    const displayText = cleanUpper(value);
    const [printedName = "", title = "", tin = ""] = displayText
      .split("/")
      .map((part) => part.trim());

    return {
      displayText,
      printedName,
      title,
      tin: normalizeTin(tin),
      accreditationNo: "",
      dateIssued: "",
      dateExpiry: "",
    };
  }

  const source = value && typeof value === "object" ? value : {};
  const printedName = cleanUpper(source?.printedName ?? source?.name);
  const title = cleanUpper(source?.title ?? source?.position);
  const tin = normalizeTin(source?.tin);
  const displayText = cleanUpper(
    source?.displayText ??
      source?.value ??
      [printedName, title, tin].filter(Boolean).join(" / "),
  );

  return {
    displayText,
    printedName,
    title,
    tin,
    accreditationNo: cleanUpper(source?.accreditationNo),
    dateIssued: source?.dateIssued ?? "",
    dateExpiry: source?.dateExpiry ?? "",
  };
};

const normalizeRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    incomeDescription: cleanUpper(
      row?.incomeDescription ??
        row?.incomePaymentDescription ??
        row?.atcName ??
        row?.description,
    ),
    atcCode: cleanUpper(row?.atcCode ?? row?.atc),
    month1Amount: toNumber(row?.month1Amount ?? row?.firstMonthAmount),
    month2Amount: toNumber(row?.month2Amount ?? row?.secondMonthAmount),
    month3Amount: toNumber(row?.month3Amount ?? row?.thirdMonthAmount),
    taxWithheld: toNumber(row?.taxWithheld ?? row?.withholdingTax),
  }));

export const normalize2307Data = (value = {}) => ({
  formKey:
    value?.formKey ||
    [value?.branchCode, value?.payeeCode, value?.startingCutoff]
      .filter(Boolean)
      .join("|") ||
    `FORM-${Date.now()}`,
  sourceTranId: value?.sourceTranId ?? "",
  sourceTransactionCount: toNumber(value?.sourceTransactionCount),
  branchCode: value?.branchCode ?? "",
  periodFrom: value?.periodFrom ?? "",
  periodTo: value?.periodTo ?? "",
  payee: {
    code: value?.payee?.code ?? value?.payeeCode ?? "",
    tin: normalizeTin(value?.payee?.tin ?? value?.payeeTin),
    registeredName: cleanUpper(
      value?.payee?.registeredName ?? value?.payee?.name ?? value?.payeeName,
    ),
    registeredAddress: cleanUpper(
      value?.payee?.registeredAddress ?? value?.payee?.address ?? value?.payeeAddress,
    ),
    zipCode: String(value?.payee?.zipCode ?? value?.payeeZipCode ?? "")
      .replace(/\D/g, "")
      .slice(0, 4),
    foreignAddress: cleanUpper(value?.payee?.foreignAddress),
  },
  payor: {
    code: value?.payor?.code ?? value?.payorCode ?? "",
    tin: normalizeTin(value?.payor?.tin ?? value?.payorTin),
    registeredName: cleanUpper(
      value?.payor?.registeredName ?? value?.payor?.name ?? value?.payorName,
    ),
    registeredAddress: cleanUpper(
      value?.payor?.registeredAddress ?? value?.payor?.address ?? value?.payorAddress,
    ),
    zipCode: String(value?.payor?.zipCode ?? value?.payorZipCode ?? "")
      .replace(/\D/g, "")
      .slice(0, 4),
  },
  expandedWithholdingDetails: normalizeRows(
    value?.expandedWithholdingDetails ?? value?.details,
  ),
  businessTaxDetails: normalizeRows(value?.businessTaxDetails),
  payorSignatory: normalizeSignatory(value?.payorSignatory),
  payeeSignatory: {
    printedName: cleanUpper(value?.payeeSignatory?.printedName),
    title: cleanUpper(value?.payeeSignatory?.title),
    tin: normalizeTin(value?.payeeSignatory?.tin),
    accreditationNo: cleanUpper(value?.payeeSignatory?.accreditationNo),
    dateIssued: value?.payeeSignatory?.dateIssued ?? "",
    dateExpiry: value?.payeeSignatory?.dateExpiry ?? "",
  },
});

/**
 * Converts one AP_2307 dt1 record returned by sproc_PHP_AP_Inq into the exact
 * form model. Only this mapping needs adjustment if the API field names change.
 */
export const mapApiRecordTo2307 = (source = {}) => {
  const rawDetails = parseJsonValue(source?.details, source?.details);
  const details = Array.isArray(rawDetails) ? rawDetails : [];

  const expandedWithholdingDetails = details.filter((row) => {
    const sectionCode = cleanUpper(row?.sectionCode);
    const classCode = cleanUpper(row?.classCode);
    return sectionCode === "EXPANDED_WITHHOLDING_TAX" || classCode === "EWT";
  });

  const businessTaxDetails = details.filter((row) => {
    const sectionCode = cleanUpper(row?.sectionCode);
    const classCode = cleanUpper(row?.classCode);
    return sectionCode === "BUSINESS_TAX" || classCode === "FTAX";
  });

  return normalize2307Data({
    ...source,
    payee: {
      code: source?.payeeCode,
      tin: source?.payeeTin,
      registeredName: source?.payeeName,
      registeredAddress: source?.payeeAddress,
      zipCode: source?.payeeZipCode,
      foreignAddress: "",
    },
    payor: {
      code: source?.payorCode,
      tin: source?.payorTin,
      registeredName: source?.payorName,
      registeredAddress: source?.payorAddress,
      zipCode: source?.payorZipCode,
    },
    expandedWithholdingDetails,
    businessTaxDetails,
    payorSignatory: source?.payorSignatory,
    payeeSignatory: source?.payeeSignatory,
  });
};

const extract2307Records = (response) => {
  // postRequest normally returns the response body directly. The additional
  // body resolution also supports an Axios-style { data: responseBody } value.
  const responseBody =
    response?.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data) &&
    (Object.prototype.hasOwnProperty.call(response.data, "success") ||
      Object.prototype.hasOwnProperty.call(response.data, "data"))
      ? response.data
      : response;

  const storedProcedureResult =
    responseBody?.data?.[0]?.result ??
    responseBody?.data?.[0]?.RESULT ??
    responseBody?.data?.[0]?.JsonResult ??
    responseBody?.data?.result ??
    responseBody?.result ??
    responseBody?.RESULT ??
    responseBody?.JsonResult ??
    responseBody?.data ??
    responseBody;

  const parsedResult = parseJsonValue(storedProcedureResult, storedProcedureResult);
  const resultContainer = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;
  const dt1 = parseJsonValue(resultContainer?.dt1, resultContainer?.dt1);

  if (Array.isArray(dt1)) return dt1;
  if (Array.isArray(resultContainer)) return resultContainer;

  return [];
};

const DESCRIPTION_COLUMN_X = 20.4;
// Keep a deliberate right-side allowance before the ATC code column.
// The official cell is wider, but this conservative writing width prevents
// wide uppercase glyphs from visually touching/overlapping the ATC code.
const DESCRIPTION_COLUMN_WIDTH = 143.5;
const DESCRIPTION_COLUMN_CLIP_X = 18.8;
const DESCRIPTION_COLUMN_CLIP_RIGHT = 173.5;
const DESCRIPTION_AVERAGE_GLYPH_FACTOR = 0.64;
const DESCRIPTION_PREFERRED_FONT_SIZE = 5.6;
const DESCRIPTION_MINIMUM_FONT_SIZE = 4.6;
const DESCRIPTION_TARGET_MAX_LINES = 4;

const wrapWordsForWidth = (text, width, fontSize) => {
  const value = cleanUpper(text);
  if (!value) return [];

  const maxChars = Math.max(1, Math.floor(width / (fontSize * DESCRIPTION_AVERAGE_GLYPH_FACTOR)));
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    // Protect against an unusually long unbroken word/code.
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }

      let remainingWord = word;
      while (remainingWord.length > maxChars) {
        lines.push(remainingWord.slice(0, maxChars));
        remainingWord = remainingWord.slice(maxChars);
      }
      current = remainingWord;
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (!current || candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const buildDescriptionLayout = (text) => {
  for (
    let fontSize = DESCRIPTION_PREFERRED_FONT_SIZE;
    fontSize >= DESCRIPTION_MINIMUM_FONT_SIZE;
    fontSize -= 0.2
  ) {
    const lines = wrapWordsForWidth(text, DESCRIPTION_COLUMN_WIDTH, fontSize);
    if (lines.length <= DESCRIPTION_TARGET_MAX_LINES) {
      return {
        lines: lines.length > 0 ? lines : [""],
        fontSize: Number(fontSize.toFixed(1)),
      };
    }
  }

  const lines = wrapWordsForWidth(
    text,
    DESCRIPTION_COLUMN_WIDTH,
    DESCRIPTION_MINIMUM_FONT_SIZE,
  );

  return {
    lines: lines.length > 0 ? lines : [""],
    fontSize: DESCRIPTION_MINIMUM_FONT_SIZE,
  };
};

/**
 * A long ATC description consumes the next physical BIR detail line(s).
 * Example: a two-line description occupies slots 1 and 2, so the following
 * ATC starts at slot 3. This also controls pagination by available form lines,
 * not merely by the number of ATC records.
 */
const paginateRowsByOccupiedLines = (rows, capacity = ROWS_PER_SECTION) => {
  const source = Array.isArray(rows) ? rows : [];
  if (source.length === 0) return [[]];

  const pages = [];
  let page = [];
  let occupiedLines = 0;

  source.forEach((row, rowIndex) => {
    const description = buildDescriptionLayout(row?.incomeDescription);
    const lineCount = Math.max(1, Math.min(description.lines.length, capacity));

    if (page.length > 0 && occupiedLines + lineCount > capacity) {
      pages.push(page);
      page = [];
      occupiedLines = 0;
    }

    page.push({
      row,
      rowIndex,
      startSlot: occupiedLines,
      lineCount,
      descriptionLines: description.lines.slice(0, capacity),
      descriptionFontSize: description.fontSize,
    });

    occupiedLines += lineCount;
  });

  if (page.length > 0) pages.push(page);
  return pages.length > 0 ? pages : [[]];
};

const expandFormPages = (forms) =>
  (Array.isArray(forms) ? forms : []).flatMap((form) => {
    const expandedPages = paginateRowsByOccupiedLines(form.expandedWithholdingDetails);
    const businessPages = paginateRowsByOccupiedLines(form.businessTaxDetails);
    const pageCount = Math.max(expandedPages.length, businessPages.length, 1);

    return Array.from({ length: pageCount }, (_, pageIndex) => {
      const expandedLayout = expandedPages[pageIndex] || [];
      const businessLayout = businessPages[pageIndex] || [];

      return {
        ...form,
        pageKey: `${form.formKey || "FORM"}|PAGE-${pageIndex + 1}`,
        pageNumber: pageIndex + 1,
        pageCount,
        expandedWithholdingDetails: expandedLayout.map((entry) => entry.row),
        businessTaxDetails: businessLayout.map((entry) => entry.row),
        expandedWithholdingLayout: expandedLayout,
        businessTaxLayout: businessLayout,
      };
    });
  });

const rowTotal = (row) =>
  toNumber(row?.month1Amount) +
  toNumber(row?.month2Amount) +
  toNumber(row?.month3Amount);

const sumRows = (rows) =>
  (Array.isArray(rows) ? rows : []).reduce(
    (total, row) => ({
      month1Amount: total.month1Amount + toNumber(row?.month1Amount),
      month2Amount: total.month2Amount + toNumber(row?.month2Amount),
      month3Amount: total.month3Amount + toNumber(row?.month3Amount),
      totalAmount: total.totalAmount + rowTotal(row),
      taxWithheld: total.taxWithheld + toNumber(row?.taxWithheld),
    }),
    { ...EMPTY_TOTALS },
  );

const formatAmount = (value) => {
  const amount = toNumber(value);
  if (!amount) return "";

  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fitFontSize = (text, width, preferred, minimum = 4.2) => {
  const length = Math.max(String(text ?? "").length, 1);
  const estimated = width / (length * 0.57);
  return Math.max(minimum, Math.min(preferred, estimated));
};

function SvgText({
  x,
  y,
  width,
  text,
  align = "left",
  fontSize = 7.2,
  minFontSize = 4.2,
  fontWeight = 600,
  italic = false,
}) {
  if (text === null || text === undefined || String(text).trim() === "") return null;

  const value = String(text);
  const resolvedSize = fitFontSize(value, width, fontSize, minFontSize);
  const anchor = align === "right" ? "end" : align === "center" ? "middle" : "start";
  const textX =
    align === "right" ? x + width - 1 : align === "center" ? x + width / 2 : x + 1;

  return (
    <text
      x={textX}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={resolvedSize}
      fontWeight={fontWeight}
      fontStyle={italic ? "italic" : "normal"}
      fill="#000"
    >
      {value}
    </text>
  );
}

function DigitBoxes({ value, xPositions, y, fontSize = 8.2 }) {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, xPositions.length);

  return digits.split("").map((digit, index) => (
    <text
      key={`${y}-${index}`}
      x={xPositions[index]}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={fontSize}
      fontWeight="600"
      fill="#000"
    >
      {digit}
    </text>
  ));
}

function DescriptionLine({ x, y, text, fontSize, clipId }) {
  if (!String(text || "").trim()) return null;

  return (
    <g clipPath={clipId ? `url(#${clipId})` : undefined}>
      <text
        x={x + 1}
        y={y}
        textAnchor="start"
        dominantBaseline="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={fontSize}
        fontWeight="600"
        fill="#000"
      >
        {text}
      </text>
    </g>
  );
}

function DetailRows({ layoutRows, yPositions, descriptionClipId }) {
  return (Array.isArray(layoutRows) ? layoutRows : []).map((entry, index) => {
    const row = entry?.row;
    const startSlot = Number(entry?.startSlot) || 0;
    const valueY = yPositions[startSlot];

    if (!row || valueY === undefined) return null;

    return (
      <g key={`detail-${entry?.rowIndex ?? index}-${startSlot}`}>
        {(entry?.descriptionLines || [row.incomeDescription]).map((line, lineIndex) => {
          const lineY = yPositions[startSlot + lineIndex];
          if (lineY === undefined) return null;

          return (
            <DescriptionLine
              key={`description-${lineIndex}`}
              x={DESCRIPTION_COLUMN_X}
              y={lineY}
              text={line}
              fontSize={entry?.descriptionFontSize || DESCRIPTION_PREFERRED_FONT_SIZE}
              clipId={descriptionClipId}
            />
          );
        })}

        <SvgText
          x={177.4}
          y={valueY}
          width={41.2}
          text={row.atcCode}
          align="center"
          fontSize={6.8}
          minFontSize={5.2}
          fontWeight={700}
        />
        <SvgText
          x={220.6}
          y={valueY}
          width={70.1}
          text={formatAmount(row.month1Amount)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={292.6}
          y={valueY}
          width={72.4}
          text={formatAmount(row.month2Amount)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={366.9}
          y={valueY}
          width={70.1}
          text={formatAmount(row.month3Amount)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={438.9}
          y={valueY}
          width={70.1}
          text={formatAmount(rowTotal(row))}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={510.9}
          y={valueY}
          width={84.2}
          text={formatAmount(row.taxWithheld)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
      </g>
    );
  });
}

function SignatureValue({ text, y }) {
  return (
    <SvgText
      x={24}
      y={y}
      width={568}
      text={text}
      align="center"
      fontSize={8.2}
      minFontSize={5.8}
      fontWeight={600}
    />
  );
}

function DateField({ value, xPositions, y }) {
  return <DigitBoxes value={normalizeDate(value)} xPositions={xPositions} y={y} fontSize={7.2} />;
}

const assetDataUrlCache = new Map();

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read PDF asset."));
    reader.readAsDataURL(blob);
  });

const resolveAssetDataUrl = async (source) => {
  const value = String(source || "").trim();
  if (!value || value.startsWith("data:")) return value;

  const absoluteUrl = new URL(value, document.baseURI).href;
  if (assetDataUrlCache.has(absoluteUrl)) return assetDataUrlCache.get(absoluteUrl);

  const response = await fetch(absoluteUrl, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Unable to load the BIR 2307 background (${response.status}).`);
  }

  const dataUrl = await blobToDataUrl(await response.blob());
  assetDataUrlCache.set(absoluteUrl, dataUrl);
  return dataUrl;
};

const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to render the BIR 2307 page."));
    image.src = source;
  });

const renderSvgElementToImage = async (svgElement, widthPx, heightPx) => {
  const clone = svgElement.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(widthPx));
  clone.setAttribute("height", String(heightPx));

  const imageNodes = Array.from(clone.querySelectorAll("image"));
  for (const imageNode of imageNodes) {
    const href =
      imageNode.getAttribute("href") ||
      imageNode.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!href) continue;

    const dataUrl = await resolveAssetDataUrl(href);
    imageNode.setAttribute("href", dataUrl);
    imageNode.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", dataUrl);
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    return await loadImage(objectUrl);
  } finally {
    // The image has already decoded when loadImage resolves.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
};

const canvasToJpegBytes = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Unable to create the PDF page image."));
          return;
        }

        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      0.97,
    );
  });

const encodePdfText = (value) => new TextEncoder().encode(value);

const joinByteArrays = (parts) => {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
};

/**
 * Creates a compact multi-page PDF without adding a new npm dependency.
 * Every generated page is rendered at PDF_RENDER_DPI before being embedded.
 */
const buildPdfFromJpegPages = (pages, paperLayout) => {
  const pageCount = pages.length;
  const maxObjectId = 2 + pageCount * 3;
  const offsets = Array(maxObjectId + 1).fill(0);
  const chunks = [];
  let byteLength = 0;

  const append = (bytes) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const appendText = (value) => append(encodePdfText(value));
  const beginObject = (objectId) => {
    offsets[objectId] = byteLength;
    appendText(`${objectId} 0 obj\n`);
  };
  const endObject = () => appendText("endobj\n");

  append(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]));

  beginObject(1);
  appendText("<< /Type /Catalog /Pages 2 0 R >>\n");
  endObject();

  const pageObjectIds = pages.map((_, index) => 5 + index * 3);
  beginObject(2);
  appendText(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>\n`,
  );
  endObject();

  pages.forEach((page, index) => {
    const imageObjectId = 3 + index * 3;
    const contentObjectId = 4 + index * 3;
    const pageObjectId = 5 + index * 3;

    beginObject(imageObjectId);
    appendText(
      `<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\nstream\n`,
    );
    append(page.jpegBytes);
    appendText("\nendstream\n");
    endObject();

    const content = [
      "q",
      `${paperLayout.widthPt.toFixed(4)} 0 0 ${paperLayout.heightPt.toFixed(4)} 0 0 cm`,
      "/Im0 Do",
      "Q",
      "",
    ].join("\n");
    const contentBytes = encodePdfText(content);

    beginObject(contentObjectId);
    appendText(`<< /Length ${contentBytes.length} >>\nstream\n`);
    append(contentBytes);
    appendText("endstream\n");
    endObject();

    beginObject(pageObjectId);
    appendText(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paperLayout.widthPt.toFixed(4)} ${paperLayout.heightPt.toFixed(4)}] ` +
        `/Resources << /XObject << /Im0 ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\n`,
    );
    endObject();
  });

  const xrefOffset = byteLength;
  appendText(`xref\n0 ${maxObjectId + 1}\n`);
  appendText("0000000000 65535 f \n");
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    appendText(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`);
  }

  appendText(
    `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return joinByteArrays(chunks);
};

function BIR2307Page({ form, backgroundSrc, stretchMode = false }) {
  const descriptionClipId = `ap2307-description-clip-${String(
    form?.pageKey || "page",
  ).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const expandedTotals = useMemo(
    () => sumRows(form.expandedWithholdingDetails),
    [form.expandedWithholdingDetails],
  );
  const businessTotals = useMemo(
    () => sumRows(form.businessTaxDetails),
    [form.businessTaxDetails],
  );

  return (
    <div className="ap2307-paper-wrap">
      <svg
        className="ap2307-paper"
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
        preserveAspectRatio={stretchMode ? "none" : "xMidYMid meet"}
        role="img"
        aria-label={`Completed BIR Form 2307 for ${form.payee.registeredName || "payee"}`}
      >
        <defs>
          <clipPath id={descriptionClipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={DESCRIPTION_COLUMN_CLIP_X}
              y="0"
              width={DESCRIPTION_COLUMN_CLIP_RIGHT - DESCRIPTION_COLUMN_CLIP_X}
              height={PAGE_HEIGHT}
            />
          </clipPath>
        </defs>

        <g>
          <image href={backgroundSrc} x="0" y="0" width={PAGE_WIDTH} height={PAGE_HEIGHT} />

          <g id={`ap2307-values-${form.pageKey}`}>
          <DigitBoxes value={normalizeDate(form.periodFrom)} xPositions={DATE_FROM_X} y={114.3} />
          <DigitBoxes value={normalizeDate(form.periodTo)} xPositions={DATE_TO_X} y={113.6} />

          <DigitBoxes value={form.payee.tin} xPositions={PAYEE_TIN_X} y={146.1} />
          <SvgText
            x={34.9}
            y={173.2}
            width={556.5}
            text={form.payee.registeredName}
            fontSize={8.2}
            minFontSize={5.2}
          />
          <SvgText
            x={35.4}
            y={201.7}
            width={499.9}
            text={form.payee.registeredAddress}
            fontSize={7.9}
            minFontSize={4.8}
          />
          <DigitBoxes value={form.payee.zipCode} xPositions={PAYEE_ZIP_X} y={201.8} fontSize={7.8} />
          <SvgText
            x={35.4}
            y={230.1}
            width={554.9}
            text={form.payee.foreignAddress}
            fontSize={7.7}
            minFontSize={4.8}
          />

          <DigitBoxes value={form.payor.tin} xPositions={PAYOR_TIN_X} y={261.3} />
          <SvgText
            x={34.9}
            y={288.4}
            width={556.5}
            text={form.payor.registeredName}
            fontSize={8.2}
            minFontSize={5.2}
          />
          <SvgText
            x={35.4}
            y={316.9}
            width={499.9}
            text={form.payor.registeredAddress}
            fontSize={7.9}
            minFontSize={4.8}
          />
          <DigitBoxes value={form.payor.zipCode} xPositions={PAYOR_ZIP_X} y={317.0} fontSize={7.8} />

          <DetailRows
            layoutRows={form.expandedWithholdingLayout}
            yPositions={EXPANDED_ROW_Y}
            descriptionClipId={descriptionClipId}
          />
          <SvgText
            x={220.6}
            y={508.9}
            width={70.1}
            text={formatAmount(expandedTotals.month1Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={292.6}
            y={508.9}
            width={72.4}
            text={formatAmount(expandedTotals.month2Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={366.9}
            y={508.9}
            width={70.1}
            text={formatAmount(expandedTotals.month3Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={438.9}
            y={508.9}
            width={70.1}
            text={formatAmount(expandedTotals.totalAmount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={510.9}
            y={508.9}
            width={84.2}
            text={formatAmount(expandedTotals.taxWithheld)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />

          <DetailRows
            layoutRows={form.businessTaxLayout}
            yPositions={BUSINESS_ROW_Y}
            descriptionClipId={descriptionClipId}
          />
          <SvgText
            x={220.6}
            y={678.5}
            width={70.1}
            text={formatAmount(businessTotals.month1Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={292.6}
            y={678.5}
            width={72.4}
            text={formatAmount(businessTotals.month2Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={366.9}
            y={678.5}
            width={70.1}
            text={formatAmount(businessTotals.month3Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={438.9}
            y={678.5}
            width={70.1}
            text={formatAmount(businessTotals.totalAmount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={510.9}
            y={678.5}
            width={84.2}
            text={formatAmount(businessTotals.taxWithheld)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />

          <SignatureValue
            text={form.payorSignatory?.displayText || form.payor.registeredName}
            y={744.0}
          />
          <SvgText
            x={136.2}
            y={780.1}
            width={120.6}
            text={form.payorSignatory.accreditationNo}
            align="center"
            fontSize={6.5}
          />
          <DateField
            value={form.payorSignatory.dateIssued}
            xPositions={PAYOR_ISSUE_DATE_X}
            y={780.7}
          />
          <DateField
            value={form.payorSignatory.dateExpiry}
            xPositions={PAYOR_EXPIRY_DATE_X}
            y={780.7}
          />

          <SignatureValue
            text={form.payee.registeredName || form.payeeSignatory?.printedName}
            y={821.3}
          />
          <SvgText
            x={136.2}
            y={857.4}
            width={120.6}
            text={form.payeeSignatory.accreditationNo}
            align="center"
            fontSize={6.5}
          />
          <DateField
            value={form.payeeSignatory.dateIssued}
            xPositions={PAYEE_ISSUE_DATE_X}
            y={858.0}
          />
          <DateField
            value={form.payeeSignatory.dateExpiry}
            xPositions={PAYEE_EXPIRY_DATE_X}
            y={858.0}
          />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function APV2307({
  data = null,
  backgroundSrc = bir2307Page1,
  showToolbar = true,
  className = "",
}) {
  const location = useLocation();
  const printRootRef = useRef(null);
  const [apiForms, setApiForms] = useState([]);
  const [isLoading, setIsLoading] = useState(!data);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paperSize, setPaperSize] = useState("long");
  const [fitMode, setFitMode] = useState("fit");
  const [outputMode, setOutputMode] = useState("print");

  const requestParams = useMemo(() => {
    const query = new URLSearchParams(location.search);

    return {
      viewDocument: query.get("viewDocument") === "true",
      branchCode: String(query.get("branchCode") || "").trim(),
      docCode: String(query.get("docCode") || "").trim().toUpperCase(),
      tranId: String(query.get("tranId") || "").trim(),
      documentNo: String(query.get("documentNo") || "").trim(),
    };
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    const load2307 = async () => {
      if (data) {
        setApiForms([]);
        setErrorMessage("");
        setIsLoading(false);
        return;
      }

      if (!requestParams.branchCode || !requestParams.docCode || !requestParams.tranId) {
        setApiForms([]);
        setErrorMessage(
          "Missing BIR 2307 request information. Branch, document type, and transaction ID are required.",
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await postRequest(
          "getAP2307",
          JSON.stringify({
            json_data: {
              branchCode: requestParams.branchCode,
              docCode: requestParams.docCode,
              tranId: requestParams.tranId,
              vendCode: null,
              startingCutoff: null,
              endingCutoff: null,
            },
          }),
        );

        const responseBody =
          response?.data &&
          typeof response.data === "object" &&
          !Array.isArray(response.data) &&
          Object.prototype.hasOwnProperty.call(response.data, "success")
            ? response.data
            : response;

        if (responseBody?.success === false) {
          throw new Error(responseBody?.message || "Unable to retrieve BIR 2307 data.");
        }

        const records = extract2307Records(response);
        const mappedForms = records.map(mapApiRecordTo2307);

        if (!isMounted) return;

        setApiForms(mappedForms);
        if (mappedForms.length === 0) {
          setErrorMessage("No BIR 2307 data was found for this transaction.");
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Failed to load BIR 2307:", error);
        setApiForms([]);
        setErrorMessage(error?.message || "Unable to retrieve BIR 2307 data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load2307();

    return () => {
      isMounted = false;
    };
  }, [data, requestParams]);

  useEffect(() => {
    if (isLoading || typeof window === "undefined") return;

    const baseUrl = import.meta.env.BASE_URL || "/";
    window.history.replaceState(window.history.state, "", baseUrl);
  }, [isLoading]);

  const normalizedForms = useMemo(() => {
    if (data) {
      const source = Array.isArray(data) ? data : [data];
      return source.map((item) => normalize2307Data(item));
    }

    return apiForms;
  }, [apiForms, data]);

  const printPages = useMemo(() => expandFormPages(normalizedForms), [normalizedForms]);
  const paperLayout = useMemo(
    () => getPaperLayout(paperSize, fitMode),
    [paperSize, fitMode],
  );

  const outputFileName = useMemo(() => {
    const docLabel = requestParams.documentNo || requestParams.tranId || "TRANSACTION";
    return `BIR_2307_${requestParams.docCode || "AP"}_${docLabel}`.replace(
      /[^A-Z0-9_-]+/gi,
      "_",
    );
  }, [requestParams]);

  const handlePrint = () => {
    if (printPages.length === 0 || !printRootRef.current) return;

    const pageElements = Array.from(
      printRootRef.current.querySelectorAll(".ap2307-paper-wrap"),
    );
    if (pageElements.length === 0) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "BIR 2307 Print");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${paperLayout.widthIn}in`;
    iframe.style.height = `${paperLayout.heightIn}in`;
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!printDocument) {
      iframe.remove();
      return;
    }

    const pagesHtml = pageElements.map((element) => element.outerHTML).join("");

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${document.baseURI}" />
          <title>${outputFileName}</title>
          <style>
            @page { size: ${paperLayout.widthIn}in ${paperLayout.heightIn}in; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              width: ${paperLayout.widthIn}in;
              min-width: ${paperLayout.widthIn}in;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .ap2307-paper-wrap {
              display: flex;
              position: relative;
              width: ${paperLayout.widthIn}in;
              height: ${paperLayout.heightIn}in;
              margin: 0;
              padding: 0;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
              break-after: page;
              page-break-after: always;
              background: #fff;
            }
            .ap2307-paper-wrap:last-child {
              break-after: auto;
              page-break-after: auto;
            }
            .ap2307-paper {
              display: block;
              flex: 0 0 auto;
              width: ${paperLayout.formWidthIn}in;
              height: ${paperLayout.formHeightIn}in;
              max-width: none;
              max-height: none;
              margin: 0;
              padding: 0;
              background: #fff;
              box-shadow: none;
            }
          </style>
        </head>
        <body>${pagesHtml}</body>
      </html>`);
    printDocument.close();

    const cleanup = () => window.setTimeout(() => iframe.remove(), 1000);

    const printAllPages = async () => {
      try {
        if (printDocument.fonts?.ready) await printDocument.fonts.ready;
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        cleanup();
      }
    };

    if (printDocument.readyState === "complete") {
      printAllPages();
    } else {
      iframe.onload = printAllPages;
    }
  };

  const handleDownloadPdf = async () => {
    if (printPages.length === 0 || !printRootRef.current || isGeneratingPdf) return;

    const svgElements = Array.from(
      printRootRef.current.querySelectorAll(".ap2307-paper"),
    );
    if (svgElements.length === 0) return;

    setIsGeneratingPdf(true);

    try {
      const pageWidthPx = Math.max(1, Math.round(paperLayout.widthIn * PDF_RENDER_DPI));
      const pageHeightPx = Math.max(1, Math.round(paperLayout.heightIn * PDF_RENDER_DPI));
      const formWidthPx = Math.max(1, Math.round(paperLayout.formWidthIn * PDF_RENDER_DPI));
      const formHeightPx = Math.max(1, Math.round(paperLayout.formHeightIn * PDF_RENDER_DPI));
      const formLeftPx = Math.round(paperLayout.formLeftIn * PDF_RENDER_DPI);
      const formTopPx = Math.round(paperLayout.formTopIn * PDF_RENDER_DPI);
      const pdfPages = [];

      for (const svgElement of svgElements) {
        const canvas = document.createElement("canvas");
        canvas.width = pageWidthPx;
        canvas.height = pageHeightPx;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Your browser cannot create the PDF canvas.");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageWidthPx, pageHeightPx);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        const formImage = await renderSvgElementToImage(
          svgElement,
          formWidthPx,
          formHeightPx,
        );
        context.drawImage(formImage, formLeftPx, formTopPx, formWidthPx, formHeightPx);

        pdfPages.push({
          jpegBytes: await canvasToJpegBytes(canvas),
          widthPx: pageWidthPx,
          heightPx: pageHeightPx,
        });
      }

      const pdfBytes = buildPdfFromJpegPages(pdfPages, paperLayout);
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = pdfUrl;
      downloadLink.download = `${outputFileName}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1500);
    } catch (error) {
      console.error("Failed to generate BIR 2307 PDF:", error);
      window.alert(error?.message || "Unable to generate the BIR 2307 PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrimaryOutput = () => {
    if (outputMode === "pdf") {
      handleDownloadPdf();
      return;
    }

    handlePrint();
  };

  const rootStyle = {
    "--ap2307-paper-width": `${paperLayout.widthIn}in`,
    "--ap2307-paper-height": `${paperLayout.heightIn}in`,
    "--ap2307-paper-aspect": String(paperLayout.aspectRatio),
    "--ap2307-form-width-percent": `${paperLayout.formWidthPercent}%`,
    "--ap2307-form-height-percent": `${paperLayout.formHeightPercent}%`,
  };

  return (
    <div
      ref={printRootRef}
      className={`ap2307-root ${className}`.trim()}
      style={rootStyle}
    >
      <style>{`
        .ap2307-root {
          box-sizing: border-box;
          min-height: 100vh;
          padding: 16px;
          background: #eef1f5;
          font-family: Arial, Helvetica, sans-serif;
        }

        .ap2307-toolbar {
          position: fixed;
          top: 56px;
          left: 12px;
          right: 12px;
          z-index: 40;
          width: auto;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px 14px;
          padding: 6px 10px;
          border: 1px solid #d4d8de;
          border-radius: 8px;
          background: linear-gradient(to right, #bfdbfe, #dbeafe);
          box-shadow: 0 3px 14px rgba(16, 24, 40, 0.08);
        }

        .ap2307-toolbar-placeholder {
          height: 88px;
        }

        .ap2307-toolbar-title {
          display: flex;
          flex: 1 1 auto;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .ap2307-toolbar-title strong {
          color: #1e3a8a;
          font-size: 14px;
        }

        .ap2307-toolbar-title span {
          color: #475569;
          font-size: 12px;
        }

        .ap2307-toolbar-controls {
          display: flex;
          flex: 0 0 auto;
          align-items: flex-end;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ap2307-option-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .ap2307-option-label {
          color: #667085;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .ap2307-segmented {
          display: inline-flex;
          height: 32px;
          padding: 2px;
          border: 1px solid #d0d5dd;
          border-radius: 7px;
          background: #f8fafc;
        }

        .ap2307-segment-button {
          display: inline-flex;
          height: 26px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 5px;
          padding: 0 10px;
          background: transparent;
          color: #475467;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
        }

        .ap2307-segment-button:hover {
          background: #eef2ff;
          color: #1d4ed8;
        }

        .ap2307-segment-button.is-active {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 1px 3px rgba(29, 78, 216, 0.22);
        }

        .ap2307-output-button {
          flex: 0 0 auto;
          height: 32px;
          min-width: 126px;
          border: 1px solid #2563eb;
          border-radius: 6px;
          padding: 0 12px;
          background: #2563eb;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .ap2307-output-button:hover:not(:disabled) {
          background: #1e40af;
        }

        .ap2307-output-button:disabled {
          border-color: #9ca3af;
          background: #9ca3af;
          cursor: not-allowed;
        }

        .ap2307-preview-scroll {
          width: 100%;
          overflow: auto;
          padding-top: 10px;
          padding-bottom: 12px;
        }

        .ap2307-paper-wrap {
          display: flex;
          width: min(100%, var(--ap2307-paper-width));
          aspect-ratio: var(--ap2307-paper-aspect);
          margin: 0 auto 18px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 5px 24px rgba(16, 24, 40, 0.18);
        }

        .ap2307-paper {
          display: block;
          flex: 0 0 auto;
          width: var(--ap2307-form-width-percent);
          height: var(--ap2307-form-height-percent);
          background: #fff;
          box-shadow: none;
        }

        .ap2307-message {
          width: min(100%, var(--ap2307-paper-width));
          margin: 20px auto;
          padding: 18px;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          color: #344054;
          font-size: 13px;
          text-align: center;
        }

        .ap2307-message-error {
          border-color: #f1aeb5;
          background: #fff5f5;
          color: #b42318;
        }

        @page {
          size: ${paperLayout.widthIn}in ${paperLayout.heightIn}in;
          margin: 0;
        }

        @media (max-width: 1050px) {
          .ap2307-toolbar {
            top: 64px;
            display: flex;
            align-items: stretch;
            flex-direction: column;
          }

          .ap2307-toolbar-controls {
            width: 100%;
            justify-content: flex-end;
          }

          .ap2307-toolbar-placeholder {
            height: 190px;
          }
        }

        @media (max-width: 540px) {
          .ap2307-toolbar {
            top: 72px;
          }

          .ap2307-option-group,
          .ap2307-output-button {
            width: 100%;
          }

          .ap2307-segmented {
            display: flex;
            width: 100%;
          }

          .ap2307-segment-button {
            flex: 1 1 0;
          }

          .ap2307-toolbar-placeholder {
            height: 320px;
          }
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .ap2307-root,
          .ap2307-root * {
            visibility: visible !important;
          }

          .ap2307-root {
            position: static;
            width: ${paperLayout.widthIn}in;
            min-height: 0;
            padding: 0;
            margin: 0;
            background: #fff;
            overflow: visible;
          }

          .ap2307-toolbar,
          .ap2307-toolbar-placeholder,
          .ap2307-message {
            display: none !important;
          }

          .ap2307-preview-scroll {
            width: ${paperLayout.widthIn}in;
            padding: 0;
            margin: 0;
            overflow: visible;
          }

          .ap2307-paper-wrap {
            width: ${paperLayout.widthIn}in;
            height: ${paperLayout.heightIn}in;
            margin: 0;
            padding: 0;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page;
            page-break-after: always;
            overflow: hidden;
            box-shadow: none;
          }

          .ap2307-paper-wrap:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .ap2307-paper {
            width: ${paperLayout.formWidthIn}in;
            height: ${paperLayout.formHeightIn}in;
            margin: 0;
            box-shadow: none;
          }
        }
      `}</style>

      {isLoading || isGeneratingPdf ? <LoadingSpinner /> : null}

      {showToolbar ? (
        <div className="ap2307-toolbar">
          <div className="ap2307-toolbar-title">
            <strong>BIR Form 2307 - January 2018 (ENCS)</strong>
            <span>
              {requestParams.docCode || "AP"}
              {requestParams.documentNo ? ` No. ${requestParams.documentNo}` : ""}
              {normalizedForms.length > 0
                ? ` | ${normalizedForms.length} payee form${normalizedForms.length === 1 ? "" : "s"}`
                : ""}
              {printPages.length > normalizedForms.length
                ? ` | ${printPages.length} printable pages`
                : ""}
              {` | ${paperLayout.label} | ${fitMode === "stretch" ? "fill page" : "fit"}`}
            </span>
          </div>

          <div className="ap2307-toolbar-controls">
            <div className="ap2307-option-group">
              <span className="ap2307-option-label">Paper size</span>
              <div className="ap2307-segmented">
                {Object.values(PAPER_SIZE_OPTIONS).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`ap2307-segment-button ${paperSize === option.key ? "is-active" : ""}`}
                    aria-pressed={paperSize === option.key}
                    onClick={() => setPaperSize(option.key)}
                  >
                    {option.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="ap2307-option-group">
              <span className="ap2307-option-label">Page fit</span>
              <div className="ap2307-segmented">
                <button
                  type="button"
                  className={`ap2307-segment-button ${fitMode === "fit" ? "is-active" : ""}`}
                  aria-pressed={fitMode === "fit"}
                  onClick={() => setFitMode("fit")}
                >
                  Fit
                </button>
                <button
                  type="button"
                  className={`ap2307-segment-button ${fitMode === "stretch" ? "is-active" : ""}`}
                  aria-pressed={fitMode === "stretch"}
                  onClick={() => setFitMode("stretch")}
                >
                  Fill Page
                </button>
              </div>
            </div>

            <div className="ap2307-option-group">
              <span className="ap2307-option-label">Output</span>
              <div className="ap2307-segmented">
                <button
                  type="button"
                  className={`ap2307-segment-button ${outputMode === "print" ? "is-active" : ""}`}
                  aria-pressed={outputMode === "print"}
                  onClick={() => setOutputMode("print")}
                >
                  Print
                </button>
                <button
                  type="button"
                  className={`ap2307-segment-button ${outputMode === "pdf" ? "is-active" : ""}`}
                  aria-pressed={outputMode === "pdf"}
                  onClick={() => setOutputMode("pdf")}
                >
                  Download PDF
                </button>
              </div>
            </div>

            <button
              type="button"
              className="ap2307-output-button"
              onClick={handlePrimaryOutput}
              disabled={isLoading || isGeneratingPdf || printPages.length === 0}
            >
              {isGeneratingPdf
                ? "Generating PDF..."
                : outputMode === "pdf"
                  ? "Download PDF"
                  : "Print All Pages"}
            </button>
          </div>
        </div>
      ) : null}
      {showToolbar ? <div className="ap2307-toolbar-placeholder" aria-hidden="true" /> : null}

      {!isLoading && errorMessage ? (
        <div className="ap2307-message ap2307-message-error">{errorMessage}</div>
      ) : null}

      {!isLoading && !errorMessage && printPages.length === 0 ? (
        <div className="ap2307-message">No BIR 2307 form is available.</div>
      ) : null}

      <div className="ap2307-preview-scroll">
        {printPages.map((form) => (
          <BIR2307Page
            key={form.pageKey}
            form={form}
            backgroundSrc={backgroundSrc}
            stretchMode={fitMode === "stretch"}
          />
        ))}
      </div>
    </div>
  );
}
