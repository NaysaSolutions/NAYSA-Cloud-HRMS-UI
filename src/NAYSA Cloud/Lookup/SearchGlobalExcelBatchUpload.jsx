


import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Upload,
  FolderOpen,
  Trash2,
  RefreshCcw,
  Send,
  FileSpreadsheet,
  Files,
  Table2,
  Download,
} from "lucide-react";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import SearchGlobalReportTable from "../Lookup/SearchGlobalReportTable.jsx";

export default function ExcelFileUploadDesktopModal({
  isOpen,
  onClose,
  uploadedDocType,
  companyInfo,
  validateApiUrl = "excelFileUpload",
  uploadApiUrl = "excelFileUpload",
  title = "Excel / CSV File Uploading",
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const tableRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [rejectedFiles, setRejectedFiles] = useState([]);
  const [headerCheck, setHeaderCheck] = useState({
    passed: false,
    referenceFileName: "",
    referenceHeaders: [],
    mismatches: [],
    reason: "",
  });

  const [excelHeaderLabels, setExcelHeaderLabels] = useState({});
  const [rawRows, setRawRows] = useState([]);
  const [validatedRows, setValidatedRows] = useState([]);
  const [validationOrderedKeys, setValidationOrderedKeys] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  const [isPreparing, setIsPreparing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [uploadCompleted, setUploadCompleted] = useState(false);

  const [selectedFileName, setSelectedFileName] = useState("");
  const [directoryLabel, setDirectoryLabel] = useState("");
  const [mobileActiveTab, setMobileActiveTab] = useState("files");
  const [recordViewMode, setRecordViewMode] = useState("selected");

  const HEADER_SCAN_LIMIT = 10;
  const WIDTH_SAMPLE_LIMIT = 200;
  const PREVIEW_ROW_LIMIT = 1000;

  useEffect(() => {
    if (!isOpen) {
      resetAll();
    }
  }, [isOpen]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
      folderInputRef.current.setAttribute("multiple", "");
      folderInputRef.current.setAttribute("accept", ".xlsx,.csv");
    }
  }, [isOpen]);

  const normalizeHeader = (value) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");

  const normalizeHeaderKey = (value) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");

  const normalizeHeaderForComparison = (headers = []) => {
    return headers.map((header) => normalizeHeader(header));
  };

  const getFileExtension = (file) => {
    const name = String(file?.name || "").toLowerCase().trim();
    if (name.endsWith(".xlsx")) return "xlsx";
    if (name.endsWith(".csv")) return "csv";
    return "";
  };

  const getBatchFileType = (files = []) => {
    const distinctTypes = Array.from(
      new Set(files.map((file) => getFileExtension(file)).filter(Boolean))
    );

    if (distinctTypes.length === 1) return distinctTypes[0];
    if (distinctTypes.length > 1) return "mixed";
    return "";
  };

  const filterValidImportFiles = (files) => {
    const valid = [];
    const rejected = [];

    for (const file of files) {
      const ext = getFileExtension(file);

      if (ext === "xlsx" || ext === "csv") {
        valid.push(file);
      } else {
        rejected.push({
          fileName: file.name,
          reason: "Only .xlsx and .csv files are allowed.",
        });
      }
    }

    return { valid, rejected };
  };

  const dedupeByFileName = (files) => {
    const seen = new Set();
    const valid = [];
    const rejected = [];

    for (const file of files) {
      const lowerName = String(file?.name || "").toLowerCase();
      if (seen.has(lowerName)) {
        rejected.push({
          fileName: file.name,
          reason: "Duplicate file name is not allowed.",
        });
      } else {
        seen.add(lowerName);
        valid.push(file);
      }
    }

    return { valid, rejected };
  };

  const readWorkbook = async (file) => {
    const extension = getFileExtension(file);

    if (extension === "csv") {
      const text = await file.text();
      return XLSX.read(text, {
        type: "string",
        raw: false,
      });
    }

    const buffer = await file.arrayBuffer();
    return XLSX.read(buffer, { type: "array" });
  };

  const getFirstSheetName = (workbook) => workbook?.SheetNames?.[0] || "";

  const headersAreExactMatch = (referenceHeaders, currentHeaders) => {
    if (referenceHeaders.length !== currentHeaders.length) return false;

    const referenceNormalized = normalizeHeaderForComparison(referenceHeaders);
    const currentNormalized = normalizeHeaderForComparison(currentHeaders);

    for (let i = 0; i < referenceNormalized.length; i += 1) {
      if (referenceNormalized[i] !== currentNormalized[i]) return false;
    }

    return true;
  };

  const buildMismatchReason = (expected, actual) => {
    if (expected.length !== actual.length) {
      return `Column count mismatch. Expected ${expected.length} but found ${actual.length}.`;
    }

    const expectedNormalized = normalizeHeaderForComparison(expected);
    const actualNormalized = normalizeHeaderForComparison(actual);

    for (let i = 0; i < expectedNormalized.length; i += 1) {
      if (expectedNormalized[i] !== actualNormalized[i]) {
        return `Column ${i + 1} mismatch. Expected "${expected[i]}" but found "${actual[i]}".`;
      }
    }

    return "Header mismatch detected.";
  };

  const AMOUNT_COLUMN_KEYWORDS = ["amount", "balance", "debit", "credit"];
  const PRICE_COLUMN_KEYWORDS = ["price", "cost", "rate"];
  const QUANTITY_COLUMN_KEYWORDS = ["qty", "quantity"];
  const DATE_COLUMN_KEYWORDS = ["date"];

  const columnContainsKeyword = (key, keywords = []) => {
    const normalizedKey = String(key || "").trim().toLowerCase();
    return keywords.some((keyword) => normalizedKey.includes(keyword));
  };

  const isAmountColumn = (key) =>
    columnContainsKeyword(key, AMOUNT_COLUMN_KEYWORDS);

  const isPriceColumn = (key) =>
    columnContainsKeyword(key, PRICE_COLUMN_KEYWORDS);

  const isQuantityColumn = (key) =>
    columnContainsKeyword(key, QUANTITY_COLUMN_KEYWORDS);

  const isNumericColumnKey = (key) =>
    isAmountColumn(key) || isPriceColumn(key) || isQuantityColumn(key);


  const isDateColumn = (key) =>
    columnContainsKeyword(key, DATE_COLUMN_KEYWORDS);

  const getSafeDecimalValue = (value, fallback = 2) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  };

  const DOC_DECIMAL_CONFIG = {
    PR: {
      quantity: "itemDecqtyPur",
      price: "pur_decuprice",
      amount: "decAmount",
    },

    // PO: {
    //   quantity: "itemDecqtyPo",
    //   price: "po_decuprice",
    //   amount: "decAmount",
    // },

    // SI: {
    //   quantity: "itemDecqtySi",
    //   price: "si_decuprice",
    //   amount: "decAmount",
    // },

    // ARC_SI: {
    //   quantity: "itemDecqtySi",
    //   price: "si_decuprice",
    //   amount: "decAmount",
    // },

    // APV: {
    //   quantity: "itemDecqtyAp",
    //   price: "ap_decuprice",
    //   amount: "decAmount",
    // },
  };

  const getDecimalPlacesByType = (type) => {
    const normalizedDocType = String(uploadedDocType || "").trim().toUpperCase();
    const docConfig = DOC_DECIMAL_CONFIG[normalizedDocType];
    const fieldName = docConfig?.[type];

 
    return getSafeDecimalValue(
      fieldName ? companyInfo?.[fieldName] : undefined,
      2
    );
  };

  const getDecimalPlacesByColumn = (key) => {
    if (isQuantityColumn(key)) return getDecimalPlacesByType("quantity");
    if (isPriceColumn(key)) return getDecimalPlacesByType("price");
    if (isAmountColumn(key)) return getDecimalPlacesByType("amount");
    return 2;
  };

  const normalizeNumericCellValue = (key, value) => {
    if (!isNumericColumnKey(key)) return value;
    if (value === null || value === undefined || value === "") return "";

    const cleaned = String(value).replace(/,/g, "").trim();
    if (cleaned === "") return "";

    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? value : parsed;
  };

  const formatNumericValue = (key, value) => {
    if (value === null || value === undefined || value === "") return "";

    const cleaned = String(value).replace(/,/g, "").trim();
    if (cleaned === "") return "";

    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) return String(value);

    return parsed.toFixed(getDecimalPlacesByColumn(key));
  };


  const getWorksheetMatrix = (worksheet) => {
    return XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });
  };

  const cleanRowValues = (row = []) => {
    return row.map((cell) => String(cell ?? "").trim());
  };

  const isMeaningfulCellValue = (value) => {
    if (value === null || value === undefined) return false;
    return String(value).trim() !== "";
  };

  const isLikelyDataValue = (value) => {
    if (!isMeaningfulCellValue(value)) return false;

    const text = String(value).trim();

    if (/^\d+(\.\d+)?$/.test(text)) return true;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text)) return true;
    if (/^[A-Z0-9\-_/.]+$/i.test(text) && text.length <= 40) return true;
    if (text.length > 1) return true;

    return false;
  };

  const hasDuplicateHeaders = (headers = []) => {
    const filtered = headers.filter(Boolean);
    return new Set(filtered).size !== filtered.length;
  };

  const scoreHeaderRowCandidate = (matrix, rowIndex) => {
    const currentRow = cleanRowValues(matrix[rowIndex] || []);
    const nextRow = cleanRowValues(matrix[rowIndex + 1] || []);
    const nextNextRow = cleanRowValues(matrix[rowIndex + 2] || []);

    const nonEmptyCells = currentRow.filter((value) => value !== "");
    const nonEmptyCount = nonEmptyCells.length;

    if (nonEmptyCount < 2) return -9999;

    const normalizedHeaders = nonEmptyCells.map((value) =>
      normalizeHeader(value)
    );

    if (!normalizedHeaders.length) return -9999;
    if (hasDuplicateHeaders(normalizedHeaders)) return -9999;

    let score = 0;

    score += nonEmptyCount * 10;

    currentRow.forEach((cell) => {
      if (!cell) return;

      if (/^[A-Za-z0-9 _\-\/().%#]+$/.test(cell) && cell.length <= 40) {
        score += 4;
      }

      if (normalizeHeader(cell)) {
        score += 2;
      }

      if (
        /^(tel no|telephone|address|extracted by|date\/time|prepared by|printed by|page\b|company|corporation|inc\.?)/i.test(
          cell
        )
      ) {
        score -= 20;
      }
    });

    const nextRowNonEmpty = nextRow.filter((value) => value !== "").length;
    const nextRowLikelyData = nextRow.filter((value) =>
      isLikelyDataValue(value)
    ).length;
    const nextNextRowLikelyData = nextNextRow.filter((value) =>
      isLikelyDataValue(value)
    ).length;

    score += nextRowNonEmpty * 3;
    score += nextRowLikelyData * 5;
    score += nextNextRowLikelyData * 2;

    if (nonEmptyCount === 1) {
      score -= 50;
    }

    return score;
  };

  const detectHeaderRowIndex = (worksheet) => {
    const matrix = getWorksheetMatrix(worksheet);

    if (!matrix.length) {
      return {
        headerRowIndex: -1,
        matrix,
      };
    }

    let bestIndex = -1;
    let bestScore = -9999;

    const scanLimit = Math.min(matrix.length, HEADER_SCAN_LIMIT);

    for (let i = 0; i < scanLimit; i += 1) {
      const score = scoreHeaderRowCandidate(matrix, i);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return {
      headerRowIndex: bestIndex,
      matrix,
    };
  };

  const buildDisplayLabelsFromHeaderRow = (headerRow = []) => {
    const labels = {};
    const usedKeys = new Set();

    headerRow.forEach((cell, index) => {
      const rawLabel = String(cell ?? "").trim();
      if (!rawLabel) return;

      let normalizedKey = normalizeHeader(rawLabel);

      if (!normalizedKey) {
        normalizedKey = `column_${index + 1}`;
      }

      if (usedKeys.has(normalizedKey)) {
        let counter = 2;
        let candidate = `${normalizedKey}_${counter}`;

        while (usedKeys.has(candidate)) {
          counter += 1;
          candidate = `${normalizedKey}_${counter}`;
        }

        normalizedKey = candidate;
      }

      usedKeys.add(normalizedKey);
      labels[normalizedKey] = rawLabel;
    });

    return labels;
  };

  const worksheetToNormalizedJson = (worksheet) => {
    const { headerRowIndex, matrix } = detectHeaderRowIndex(worksheet);

    if (headerRowIndex < 0 || !matrix.length) {
      return {
        headers: [],
        displayLabels: {},
        rows: [],
      };
    }

    const headerRow = cleanRowValues(matrix[headerRowIndex] || []);
    const displayLabels = buildDisplayLabelsFromHeaderRow(headerRow);
    const normalizedHeaders = Object.keys(displayLabels);

    if (!normalizedHeaders.length) {
      return {
        headers: [],
        displayLabels: {},
        rows: [],
      };
    }

    const rows = [];

    for (
      let rowIndex = headerRowIndex + 1;
      rowIndex < matrix.length;
      rowIndex += 1
    ) {
      const rawRow = matrix[rowIndex] || [];
      const cleanedRow = cleanRowValues(rawRow);

      const hasAnyValue = cleanedRow.some((value) => value !== "");
      if (!hasAnyValue) continue;

      const newRow = {};
      let hasMappedValue = false;

      normalizedHeaders.forEach((key, columnIndex) => {
        const rawValue = cleanedRow[columnIndex] ?? "";
        newRow[key] = normalizeNumericCellValue(key, rawValue);

        if (String(rawValue).trim() !== "") {
          hasMappedValue = true;
        }
      });

      if (hasMappedValue) {
        rows.push(newRow);
      }
    }

    return {
      headers: normalizedHeaders,
      displayLabels,
      rows,
    };
  };

  const resetAll = () => {
    setSelectedFiles([]);
    setRejectedFiles([]);
    setHeaderCheck({
      passed: false,
      referenceFileName: "",
      referenceHeaders: [],
      mismatches: [],
      reason: "",
    });
    setExcelHeaderLabels({});
    setRawRows([]);
    setValidatedRows([]);
    setValidationOrderedKeys([]);
    setSelectedRow(null);
    setIsPreparing(false);
    setIsValidating(false);
    setIsUploading(false);
    setHasValidated(false);
    setUploadCompleted(false);
    setSelectedFileName("");
    setDirectoryLabel("");
    setMobileActiveTab("files");
    setRecordViewMode("selected");

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const prepareSelectedFiles = async (incomingFiles, sourceType = "files") => {
    if (!incomingFiles?.length) return;

    setIsPreparing(true);
    setHasValidated(false);
    setValidatedRows([]);
    setValidationOrderedKeys([]);
    setUploadCompleted(false);
    setSelectedRow(null);
    setRecordViewMode("selected");

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const incomingArray = Array.from(incomingFiles);

      const { valid: validImportFiles, rejected: invalidFiles } =
        filterValidImportFiles(incomingArray);

      const { valid: uniqueFiles, rejected: duplicateFiles } =
        dedupeByFileName(validImportFiles);

      const combinedRejected = [...invalidFiles, ...duplicateFiles];
      const batchType = getBatchFileType(uniqueFiles);

      if (batchType === "mixed") {
        const mixedRejected = uniqueFiles.map((file) => ({
          fileName: file.name,
          reason:
            "Cannot combine CSV and Excel files in the same upload. Please upload only one file type per batch.",
        }));

        setRejectedFiles([...combinedRejected, ...mixedRejected]);
        setSelectedFiles([]);
        setHeaderCheck({
          passed: false,
          referenceFileName: "",
          referenceHeaders: [],
          mismatches: [],
          reason:
            "Mixed file types detected. CSV and Excel cannot be uploaded together in one batch.",
        });
        setExcelHeaderLabels({});
        setRawRows([]);
        setSelectedFileName("");
        setDirectoryLabel("");

        useSwalErrorAlert(
          "Mixed file types not allowed",
          "CSV and Excel files cannot be uploaded together in one batch. Please upload only CSV files or only Excel files."
        );
        return;
      }

      setRejectedFiles(combinedRejected);
      setSelectedFiles(uniqueFiles);

      if (sourceType === "folder" && uniqueFiles.length > 0) {
        const relativePath =
          uniqueFiles[0]?.webkitRelativePath || uniqueFiles[0]?.path || "";
        const folderName = relativePath.includes("/")
          ? relativePath.split("/")[0]
          : "Selected Folder";
        setDirectoryLabel(folderName);
      } else {
        setDirectoryLabel("Selected Files");
      }

      if (!uniqueFiles.length) {
        setHeaderCheck({
          passed: false,
          referenceFileName: "",
          referenceHeaders: [],
          mismatches: [],
          reason: "No valid Excel or CSV files selected.",
        });
        setExcelHeaderLabels({});
        setRawRows([]);
        useSwalErrorAlert(
          "No valid files selected",
          "Please select .xlsx or .csv files with unique file names."
        );
        return;
      }

      const parsedFiles = await Promise.all(
        uniqueFiles.map(async (file, index) => {
          const workbook = await readWorkbook(file);
          const sheetName = getFirstSheetName(workbook);

          if (!sheetName) {
            return {
              fileName: file.name,
              index,
              error: "No worksheet found.",
            };
          }

          const worksheet = workbook.Sheets[sheetName];
          const { headers, displayLabels, rows } =
            worksheetToNormalizedJson(worksheet);

          if (!headers.length) {
            return {
              fileName: file.name,
              index,
              error: `No valid header row detected within the first ${HEADER_SCAN_LIMIT} rows.`,
            };
          }

          return {
            fileName: file.name,
            index,
            headers,
            displayLabels,
            rows,
          };
        })
      );

      parsedFiles.sort((a, b) => a.index - b.index);

      const mismatches = [];
      const fileMeta = [];
      let referenceHeaders = [];
      let referenceDisplayLabels = {};
      let referenceFileName = "";

      parsedFiles.forEach((parsed, index) => {
        if (parsed.error) {
          mismatches.push({
            fileName: parsed.fileName,
            reason: parsed.error,
            expectedHeaders: referenceHeaders,
            actualHeaders: [],
          });
          return;
        }

        if (index === 0) {
          referenceHeaders = parsed.headers;
          referenceDisplayLabels = parsed.displayLabels;
          referenceFileName = parsed.fileName;
          fileMeta.push(parsed);
          return;
        }

        if (!headersAreExactMatch(referenceHeaders, parsed.headers)) {
          mismatches.push({
            fileName: parsed.fileName,
            reason: buildMismatchReason(referenceHeaders, parsed.headers),
            expectedHeaders: referenceHeaders,
            actualHeaders: parsed.headers,
          });
          return;
        }

        fileMeta.push(parsed);
      });

      if (mismatches.length > 0) {
        setHeaderCheck({
          passed: false,
          referenceFileName,
          referenceHeaders,
          mismatches,
          reason:
            "One or more selected files have different columns. Entire batch was ignored.",
        });
        setExcelHeaderLabels({});
        setRawRows([]);
        useSwalErrorAlert(
          "Column mismatch detected",
          "One or more files have different columns, or no valid header was detected within the first 10 rows. Entire selected batch was ignored."
        );
        return;
      }

      const consolidatedRows = [];
      fileMeta.forEach((meta) => {
        meta.rows.forEach((row, index) => {
          consolidatedRows.push({
            ...row,
            filename: meta.fileName,
            row_no: index + 1,
          });
        });
      });

      setHeaderCheck({
        passed: true,
        referenceFileName,
        referenceHeaders,
        mismatches: [],
        reason: "",
      });

      setExcelHeaderLabels(referenceDisplayLabels);
      setRawRows(consolidatedRows);

      if (uniqueFiles.length > 0) {
        setSelectedFileName(uniqueFiles[0].name);
      }

      if (consolidatedRows.length) {
        setMobileActiveTab("preview");
      } else {
        setMobileActiveTab("files");
        useSwalErrorAlert(
          "No data found",
          "The selected files do not contain data rows."
        );
      }
    } catch (error) {
      console.error(error);
      useSwalErrorAlert(
        "Preparation Error",
        error?.message || "Failed to read selected Excel / CSV files."
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const handleChooseFiles = async (event) => {
    const files = event.target.files;
    await prepareSelectedFiles(files, "files");
    event.target.value = "";
  };

  const handleChooseFolder = async (event) => {
    const files = event.target.files;
    await prepareSelectedFiles(files, "folder");
    event.target.value = "";
  };

  const handleDropFiles = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) return;

    await prepareSelectedFiles(files, "files");
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const parseValidationJsonArray = (value) => {
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse validation result JSON:", error);
      return [];
    }
  };

  const getValidationSourceRows = (responseData) => {
    if (
      Array.isArray(responseData?.data) &&
      typeof responseData.data[0]?.result === "string"
    ) {
      return parseValidationJsonArray(responseData.data[0].result);
    }

    if (
      Array.isArray(responseData) &&
      typeof responseData[0]?.result === "string"
    ) {
      return parseValidationJsonArray(responseData[0].result);
    }

    if (typeof responseData?.result === "string") {
      return parseValidationJsonArray(responseData.result);
    }

    if (Array.isArray(responseData?.data)) {
      return responseData.data;
    }

    if (Array.isArray(responseData)) {
      return responseData;
    }

    return [];
  };

  const normalizeValidateResponse = (responseData, fallbackRows = []) => {
    const apiRows = getValidationSourceRows(responseData);

    if (!apiRows.length) {
      const fallbackKeys = Object.keys(fallbackRows?.[0] || {});
      return {
        rows: fallbackRows.map((row) => ({
          ...row,
          status: "PASSED",
          error_log: "",
        })),
        headerLabels: {
          ...excelHeaderLabels,
          status: "Status",
          error_log: "Error Log",
        },
        orderedKeys: [
          ...fallbackKeys.filter(
            (key) =>
              key !== "status" &&
              key !== "validationstatus" &&
              key !== "validation_status" &&
              key !== "errorlog" &&
              key !== "error_log"
          ),
          "status",
          "error_log",
        ],
      };
    }

    const normalizedRows = [];
    const orderedKeys = [];
    const headerLabels = {};
    const seenKeys = new Set();

    const statusAliases = new Set([
      "status",
      "validationstatus",
      "validation_status",
    ]);
    const errorAliases = new Set([
      "error_log",
      "errorlog",
      "errormsg",
      "error_msg",
      "errormessage",
    ]);

    const registerOrderedKey = (key, label) => {
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      orderedKeys.push(key);
      headerLabels[key] = label;
    };

    apiRows.forEach((apiRow) => {
      const newRow = {};
      let resolvedStatus = "";
      let resolvedErrorLog = "";

      Object.entries(apiRow || {}).forEach(([rawKey, rawValue]) => {
        const normalizedKey = normalizeHeaderKey(rawKey);

        if (statusAliases.has(normalizedKey)) {
          if (!resolvedStatus && String(rawValue ?? "").trim() !== "") {
            resolvedStatus = String(rawValue ?? "");
          }
          registerOrderedKey("status", "Status");
          return;
        }

        if (errorAliases.has(normalizedKey)) {
          if (!resolvedErrorLog && String(rawValue ?? "").trim() !== "") {
            resolvedErrorLog = String(rawValue ?? "");
          }
          registerOrderedKey("error_log", "Error Log");
          return;
        }

        registerOrderedKey(normalizedKey, rawKey);
        newRow[normalizedKey] = rawValue ?? "";
      });

      newRow.status = String(resolvedStatus || "PASSED").toUpperCase();
      newRow.error_log = String(resolvedErrorLog || "");

      if (!seenKeys.has("status")) {
        registerOrderedKey("status", "Status");
      }

      if (!seenKeys.has("error_log")) {
        registerOrderedKey("error_log", "Error Log");
      }

      normalizedRows.push(newRow);
    });

    return {
      rows: normalizedRows,
      headerLabels,
      orderedKeys,
    };
  };

  const handleValidate = async () => {
    if (!selectedFiles.length) {
      useSwalErrorAlert(
        "No files selected",
        "Please select .xlsx or .csv files first."
      );
      return;
    }

    if (!headerCheck.passed) {
      useSwalErrorAlert(
        "Header mismatch",
        "All selected files must have the same exact columns."
      );
      return;
    }

    if (!rawRows.length) {
      useSwalErrorAlert(
        "No records found",
        "No data rows were found in the selected files."
      );
      return;
    }

    setIsValidating(true);

    setHasValidated(false);
    setValidatedRows([]);
    setValidationOrderedKeys([]);
    setExcelHeaderLabels({});
    setSelectedRow(null);
    setMobileActiveTab("preview");
    setRecordViewMode("selected");

    try {
      const glData = {
        dt1: rawRows,
        mode: "validate",
        compCode: companyInfo?.compCode||"",
        docCode: uploadedDocType,
      };

      const payload = { json_data: glData };
      const response = await postRequest(validateApiUrl, JSON.stringify(payload));

      const normalizedResult = normalizeValidateResponse(response.data, rawRows);
      console.log(normalizedResult)

      setValidatedRows(normalizedResult.rows);
      setValidationOrderedKeys(normalizedResult.orderedKeys);
      setExcelHeaderLabels(normalizedResult.headerLabels);
      setHasValidated(true);

      const failedCount = normalizedResult.rows.filter(
        (row) => String(row.status || "").toUpperCase() !== "PASSED"
      ).length;

      if (failedCount > 0) {
        useSwalErrorAlert(
          "Validation completed with errors",
          `${failedCount} record(s) failed validation.`
        );
      } else {
        useSwalSuccessAlert(
          "Validation successful",
          "All records passed validation. You can now upload."
        );
      }
    } catch (error) {
      console.error(error);

      setHasValidated(false);
      setValidatedRows([]);
      setValidationOrderedKeys([]);
      setExcelHeaderLabels({});

      useSwalErrorAlert(
        "Validation Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to validate imported records."
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!hasValidated || !validatedRows.length) {
      useSwalErrorAlert(
        "Upload not allowed",
        "Please validate the records first."
      );
      return;
    }

    const failedCount = validatedRows.filter(
      (row) => String(row.status || "").toUpperCase() !== "PASSED"
    ).length;

    if (failedCount > 0) {
      useSwalErrorAlert(
        "Upload blocked",
        "There are failed validation records. Upload cannot continue."
      );
      return;
    }

    setIsUploading(true);

    try {
      const payload = {
        json_data: validatedRows,
      };

      const response = await axios.post(uploadApiUrl, payload);
      setUploadCompleted(true);

      useSwalSuccessAlert(
        "Upload Successful",
        response?.data?.message || "Records were uploaded successfully."
      );
    } catch (error) {
      console.error(error);
      setUploadCompleted(false);

      useSwalErrorAlert(
        "Upload Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to upload records."
      );
    } finally {
      setIsUploading(false);
    }
  };

 const handleDownloadTemplate = async () => {
  try {
    const glData = {
      mode: "template",
      compCode: companyInfo?.compCode || "",
      docCode: uploadedDocType,
    };

    const payload = { json_data: glData };
    const response = await postRequest(validateApiUrl, JSON.stringify(payload));

    const responseData = response?.data;

    let templateRows = [];

    if (
      Array.isArray(responseData?.data) &&
      typeof responseData.data[0]?.result === "string"
    ) {
      try {
        templateRows = JSON.parse(responseData.data[0].result);
      } catch {
        templateRows = [];
      }
    } else if (
      Array.isArray(responseData) &&
      typeof responseData[0]?.result === "string"
    ) {
      try {
        templateRows = JSON.parse(responseData[0].result);
      } catch {
        templateRows = [];
      }
    } else if (typeof responseData?.result === "string") {
      try {
        templateRows = JSON.parse(responseData.result);
      } catch {
        templateRows = [];
      }
    } else if (Array.isArray(responseData?.data)) {
      templateRows = responseData.data;
    } else if (Array.isArray(responseData)) {
      templateRows = responseData;
    }

    const firstRow = templateRows?.[0] || {};
    const rawColList = firstRow?.colList || firstRow?.collist || "";

    if (!rawColList || typeof rawColList !== "string") {
      useSwalErrorAlert(
        "Template Download Failed",
        "No template column list was returned by the API."
      );
      return;
    }

    const headers = rawColList
      .split(",")
      .map((col) => String(col || "").trim())
      .filter(Boolean);

    if (!headers.length) {
      useSwalErrorAlert(
        "Template Download Failed",
        "Template column list is empty."
      );
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    const safeDocType = String(uploadedDocType || "Upload")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "_");

    XLSX.writeFile(workbook, `${safeDocType}_Template.xlsx`);

    useSwalSuccessAlert(
      "Template Downloaded",
      "Excel template downloaded successfully."
    );
  } catch (error) {
    console.error(error);

    useSwalErrorAlert(
      "Template Download Failed",
      error?.response?.data?.message ||
        error?.message ||
        "Failed to download template."
    );
  }
};


  const displayRows = useMemo(() => {
    if (isValidating) return [];
    return hasValidated ? validatedRows : rawRows;
  }, [isValidating, hasValidated, validatedRows, rawRows]);

  const totalFiles = selectedFiles.length;
  const totalRecordsAllFiles = displayRows.length;
  const passedCountAllFiles = hasValidated
    ? validatedRows.filter(
        (row) => String(row.status || "").toUpperCase() === "PASSED"
      ).length
    : 0;
  const failedCountAllFiles = hasValidated
    ? validatedRows.length - passedCountAllFiles
    : 0;

  const activeDisplayRows = useMemo(() => {
    if (isValidating) return [];

    const hasFilenameColumn = displayRows.some((row) =>
      Object.prototype.hasOwnProperty.call(row || {}, "filename")
    );

    let rows = displayRows;

    if (recordViewMode === "all") {
      rows = displayRows;
    } else if (recordViewMode === "passed") {
      rows = displayRows.filter(
        (row) => String(row.status || "").toUpperCase() === "PASSED"
      );
    } else if (recordViewMode === "failed") {
      rows = displayRows.filter(
        (row) => String(row.status || "").toUpperCase() !== "PASSED"
      );
    } else {
      rows =
        selectedFileName && hasFilenameColumn
          ? displayRows.filter((row) => row.filename === selectedFileName)
          : displayRows;
    }

    return rows.slice(0, PREVIEW_ROW_LIMIT);
  }, [displayRows, selectedFileName, isValidating, recordViewMode]);

  const totalRecords = activeDisplayRows.length;
  const passedCount = activeDisplayRows.filter(
    (row) => String(row.status || "").toUpperCase() === "PASSED"
  ).length;
  const failedCount = activeDisplayRows.filter(
    (row) => String(row.status || "").toUpperCase() !== "PASSED"
  ).length;

  const getTextLength = (value) => {
    if (value === null || value === undefined) return 0;
    return String(value).trim().length;
  };

  const getDynamicColumnWidth = (key, label, rows) => {
    const MIN_WIDTH = 100;
    const MAX_WIDTH = 360;
    const PIXELS_PER_CHAR = 8;
    const CELL_PADDING = 36;

    const fixedWidths = {
      filename: 220,
      row_no: 90,
      status: 120,
      error_log: 260,
    };

    if (fixedWidths[key]) {
      return fixedWidths[key];
    }

    let maxLength = getTextLength(label);
    const sampleRows = rows.slice(0, WIDTH_SAMPLE_LIMIT);

    sampleRows.forEach((row) => {
      const cellValue = row?.[key];
      const cellLength = getTextLength(cellValue);
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });

    const computedWidth = maxLength * PIXELS_PER_CHAR + CELL_PADDING;

    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, computedWidth));
  };

  const tableColumns = useMemo(() => {
    if (isValidating) return [];
    if (!displayRows.length) return [];

    const allKeys = new Set();
    displayRows.forEach((row) => {
      Object.keys(row || {}).forEach((key) => allKeys.add(key));
    });

    const orderedBase = hasValidated
      ? validationOrderedKeys
      : [...(headerCheck.referenceHeaders || []), "filename", "row_no"];

    const tail = hasValidated ? [] : ["status", "error_log"];

    const remaining = Array.from(allKeys).filter(
      (key) => !orderedBase.includes(key) && !tail.includes(key)
    );

    const finalKeys = [
      ...orderedBase.filter((key) => allKeys.has(key)),
      ...remaining,
      ...tail.filter((key) => allKeys.has(key)),
    ].filter(
      (key, index, arr) =>
        arr.indexOf(key) === index &&
        key !== "validationstatus" &&
        key !== "validation_status" &&
        key !== "errorlog"
    );

    return finalKeys.map((key) => {
      const displayLabel =
        excelHeaderLabels[key] ||
        (key === "filename"
          ? "File Name"
          : key === "row_no"
          ? "Row No"
          : key === "status"
          ? "Status"
          : key === "error_log"
          ? "Error Log"
          : key);

      const isNumericColumn = isNumericColumnKey(key);
      
      const column = {
            key,
            label: displayLabel,
            sortable: true,
            filterable: true,
            width: getDynamicColumnWidth(key, displayLabel, displayRows),
            renderType: isDateColumn(key)
              ? "date"
              : isNumericColumn
              ? "number"
              : undefined,
            roundingOff: isNumericColumn ? getDecimalPlacesByColumn(key) : undefined,
            className:
              key === "status"
                ? "text-center"
                : isNumericColumn
                ? "text-right"
                : "",
          };

      if (isNumericColumn) {
        column.render = (row) => {
          console.log(row)
          const failed =
            String(row?.status || "").toUpperCase() !== "PASSED" &&
            String(row?.status || "").trim() !== "";

          return (
            <span className={failed ? "text-red-600" : ""}>
              {formatNumericValue(key, row[key])}
            </span>
          );
        };
        return column;
      }

      column.render = (row) => {
        const failed =
          String(row?.status || "").toUpperCase() !== "PASSED" &&
          String(row?.status || "").trim() !== "";

        if (key === "status") {
          const value = String(row[key] ?? "").toUpperCase();

          if (value === "PASSED") {
            return (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                PASSED
              </span>
            );
          }

          if (value === "FAILED" || value === "ERROR") {
            return (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                {value}
              </span>
            );
          }

          return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {value || "PENDING"}
            </span>
          );
        }

        if (key === "error_log") {
          return (
            <span className={failed ? "text-red-600" : "text-slate-500"}>
              {String(row[key] ?? "")}
            </span>
          );
        }

        return (
          <span className={failed ? "text-red-600" : ""}>
            {String(row[key] ?? "")}
          </span>
        );
      };

      return column;
    });
  }, [
    isValidating,
    displayRows,
    hasValidated,
    headerCheck.referenceHeaders,
    excelHeaderLabels,
    validationOrderedKeys,
  ]);

  const fileListRows = useMemo(() => {
    return selectedFiles.map((file) => {
      const fileRows = displayRows.filter((row) => row.filename === file.name);
      const filePassed = fileRows.filter(
        (row) => String(row.status || "").toUpperCase() === "PASSED"
      ).length;
      const fileFailed = fileRows.filter(
        (row) => String(row.status || "").toUpperCase() !== "PASSED"
      ).length;

      return {
        fileName: file.name,
        recordCount: fileRows.length,
        passed: filePassed,
        failed: fileFailed,
      };
    });
  }, [selectedFiles, displayRows]);

  const hasTableColumns = tableColumns.length > 0;
  const showFooterBusy = isPreparing || isValidating || isUploading;

  const summaryButtonClass = (mode) =>
    `rounded-md px-2 py-1 transition ${
      recordViewMode === mode
        ? "bg-blue-500 text-white"
        : "bg-white text-slate-600 hover:bg-slate-100"
    }`;

  if (!isOpen) return null;

  const renderFilesPanel = () => (
    <div className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-slate-50 sm:w-[310px] sm:border-b-0 sm:border-r">
      <div className="border-b border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">
        <div className="grid grid-cols-[1fr_60px] gap-2">
          <div className="truncate">Name</div>
          <div className="text-center">Count</div>
        </div>
      </div>

      <div className="max-h-[180px] min-h-0 overflow-auto bg-white text-slate-700 sm:max-h-none sm:flex-1">
        {fileListRows.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-400">No file selected</div>
        ) : (
          fileListRows.map((item) => {
            const isActive =
              selectedFileName === item.fileName && recordViewMode === "selected";

            return (
              <button
                key={item.fileName}
                type="button"
                onClick={() => {
                  setSelectedFileName(item.fileName);
                  setRecordViewMode("selected");
                }}
                className={`grid w-full grid-cols-[1fr_60px] gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs transition ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{item.fileName}</span>
                <span className="text-center">{item.recordCount}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparing || isValidating || isUploading}
            className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            <Upload size={14} />
            Search File
          </button>

          <button
            type="button"
            onClick={handleValidate}
            disabled={
              isPreparing ||
              isValidating ||
              !selectedFiles.length ||
              !headerCheck.passed ||
              !rawRows.length
            }
            className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            <RefreshCcw size={14} />
            Validate
          </button>

          <button
            type="button"
            onClick={resetAll}
            disabled={isPreparing || isValidating || isUploading}
            className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            <Trash2 size={14} />
            Clear
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={
              isUploading ||
              !hasValidated ||
              !validatedRows.length ||
              failedCountAllFiles > 0
            }
            className="flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            <Send size={14} />
            Upload
          </button>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={isPreparing || isValidating || isUploading}
            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2.5 font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            <span className="inline-flex items-center gap-1">
              <FolderOpen size={14} />
              Search Folder
            </span>
          </button>
        </div>


      <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
         <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={isPreparing || isValidating || isUploading}
          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2.5 font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
        >
          <span className="inline-flex items-center gap-1">
            <Download size={14} />
            Download Template
          </span>
        </button>
        </div>


      </div>
    </div>
  );

  const renderPreviewPanel = () => (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        {isPreparing ? (
          <div className="flex h-full items-start justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 pt-16">
            <div className="flex flex-col items-center gap-3 text-center">
              <LoadingSpinner />
              <div className="text-sm font-medium text-slate-700">
                Loading imported file(s)...
              </div>
              <div className="text-xs text-slate-500">
                Please wait while the file data is being prepared
              </div>
            </div>
          </div>
        ) : isValidating ? (
          <div className="flex h-full items-start justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 pt-16">
            <div className="flex flex-col items-center gap-3 text-center">
              <LoadingSpinner />
              <div className="text-sm font-medium text-slate-700">
                Validating records...
              </div>
              <div className="text-xs text-slate-500">
                Please wait while the table is being reloaded
              </div>
            </div>
          </div>
        ) : !hasTableColumns ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileSpreadsheet size={22} className="text-blue-600" />
              </div>
              <div className="text-sm font-medium text-slate-700">
                No data loaded yet
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Select Excel / CSV file(s) or a folder to preview records
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-x-auto">
            <SearchGlobalReportTable
              ref={tableRef}
              columns={tableColumns}
              data={activeDisplayRows}
              showFilters={true}
              showGlobalSearch={true}
              showGroupBy={true}
              isLoading={isPreparing}
              isFetching={isUploading}
              autoFit={false}
              autoFillGrid={false}
              pagination={false}
              docType="Excel / CSV Upload Preview"
              onRowDoubleClick={(row) => setSelectedRow(row)}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/55 p-0 sm:p-3 backdrop-blur-[1px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onDragOver={handleDragOver}
        onDrop={handleDropFiles}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.99 }}
          transition={{ duration: 0.18 }}
          className="flex h-[100dvh] w-screen flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:h-[74vh] sm:w-[98vw] sm:max-w-[1680px] sm:rounded-xl sm:border sm:border-slate-300"
          onDragOver={handleDragOver}
          onDrop={handleDropFiles}
        >
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <FileSpreadsheet size={16} className="text-blue-600" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{title}</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Upload, validate, review, and submit Excel or CSV records
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 sm:px-3 sm:py-1.5"
            >
              <X size={14} />
              Close
            </button>
          </div>

          <div className="border-b border-slate-200 bg-white px-3 py-2 sm:hidden">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMobileActiveTab("files")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  mobileActiveTab === "files"
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                <Files size={14} />
                Files
              </button>

              <button
                type="button"
                onClick={() => setMobileActiveTab("preview")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  mobileActiveTab === "preview"
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                <Table2 size={14} />
                Preview
              </button>
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 overflow-hidden bg-white sm:flex">
            {renderFilesPanel()}
            {renderPreviewPanel()}
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden bg-white sm:hidden">
            {mobileActiveTab === "files" ? renderFilesPanel() : renderPreviewPanel()}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span>Total File/s : {totalFiles}</span>

              <button
                type="button"
                onClick={() => setRecordViewMode("all")}
                className={summaryButtonClass("all")}
              >
                Total Record/s : {totalRecordsAllFiles}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!hasValidated) return;
                  setRecordViewMode("passed");
                }}
                disabled={!hasValidated}
                className={`${summaryButtonClass("passed")} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Total Record/s (Passed) : {passedCountAllFiles}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!hasValidated) return;
                  setRecordViewMode("failed");
                }}
                disabled={!hasValidated}
                className={`${summaryButtonClass("failed")} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Total Record/s (Failed) : {failedCountAllFiles}
              </button>

              {recordViewMode === "selected" && selectedFileName ? (
                <span className="rounded-md bg-white px-2 py-1 text-slate-500">
                  Viewing file: {selectedFileName} ({totalRecords})
                </span>
              ) : recordViewMode === "all" ? (
                <span className="rounded-md bg-white px-2 py-1 text-slate-500">
                  Viewing: All records from all Excel / CSV files
                </span>
              ) : recordViewMode === "passed" ? (
                <span className="rounded-md bg-white px-2 py-1 text-slate-500">
                  Viewing: Passed records only from all Excel / CSV files
                </span>
              ) : recordViewMode === "failed" ? (
                <span className="rounded-md bg-white px-2 py-1 text-slate-500">
                  Viewing: Failed records only from all Excel / CSV files
                </span>
              ) : null}
            </div>

            <div className="flex min-w-[28px] items-center justify-end">
              {showFooterBusy ? (
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                </div>
              ) : uploadCompleted ? (
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              ) : selectedFileName ? (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-slate-300" />
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.csv"
            onChange={handleChooseFiles}
            className="hidden"
          />

          <input
            ref={folderInputRef}
            type="file"
            onChange={handleChooseFolder}
            className="hidden"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}