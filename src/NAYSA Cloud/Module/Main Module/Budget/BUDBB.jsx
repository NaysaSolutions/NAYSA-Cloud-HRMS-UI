import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faChevronDown,
  faPlus,
  faTrashAlt,
  faUpload,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";

// Lookup / Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import SearchBudItemRef from "../../../Lookup/SearchBudItemRef.jsx";

// Global UI / Config
import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

import {
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalInfoAlert,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalvalidateRequiredFields,
  useSwalProceedConfirm,
  useSwalHandleOpenSpecsModal,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  handleDownloadSingleUploadTemplate as downloadGlobalSingleUploadTemplate,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const DEC_AMT = 2;

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .replace(/[\s_./#-]/g, "")
    .toLowerCase();

const getFirstValue = (row = {}, keys = []) => {
  const normalizedRow = Object.entries(row || {}).reduce((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  for (const key of keys) {
    const value = normalizedRow[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
};

const sanitizeNumeric = (value) => {
  const raw = String(value ?? "");
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const parts = cleaned.split(".");
  const normalized = parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
  return normalized.replace(/(?!^)-/g, "");
};

const getFullStatus = (status) => {
  const raw = String(status ?? "").trim().toUpperCase();

  const map = {
    "": "OPEN",
    O: "OPEN",
    C: "CLOSED",
    X: "CANCELLED",
    F: "FINALIZED",
    P: "POSTED",
  };

  return map[raw] || raw || "OPEN";
};

const getStatusCode = (status) => {
  const raw = String(status ?? "").trim().toUpperCase();

  const map = {
    OPEN: "",
    CLOSED: "C",
    CANCELLED: "X",
    FINALIZED: "F",
    POSTED: "P",
  };

  return map[raw] ?? raw;
};

const getCurrentYear = () => String(new Date().getFullYear());

const BUDBB = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const uploadDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const location = useLocation();

  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth();
  const { resetFlag } = useReset();

  const docType = docTypes?.BUDBB || "BUDBB";
  const hsDoc = getAllTopHSDocRow(docType) || {};
  const decAmt = companyInfo?.amtDec || companyInfo?.amountDec || DEC_AMT;

  const [isViewDocument, setIsViewDocument] = useState(false);
  const [topTab, setTopTab] = useState("details");

  const [state, setState] = useState({
    // Document information
    documentName: hsDoc?.docName || "Budget Beginning",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
    documentID: "",
    documentNo: "",
    documentStatus: "",
    status: "",
    originalDocStatus: "",
    appLevel: 0,
    branchCode:"",
    branchName:"",

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    // Budget Beginning header
    bbDate: useGetCurrentDayV2(),
    budgetYear: getCurrentYear(),
    refNo: "",
    uploaded: "N",
    sourceFileName: "",
    totalBudgetAmount: "0.00",
    remarks: "",
    noReprints: "0",
    userCode: "",

    // Detail lines
    detailRows: [],
    detailRowsApp: [],

    // Misc
    tblFieldArray: [],
    selectedRowIndex: null,
    lookupContext: "",
    showAllTranDocNo: false,
    showUploadDropdown: false,

    // Modals
    branchModalOpen: false,
    rcLookupModalOpen: false,
    acctLookupModalOpen: false,
    budgetItemLookupModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostModal: false,
  });

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    documentName,
    documentID,
    documentStatus,
    documentNo,
    branchCode,
    branchName,
    status,
    activeTab,
    isLoading,
    showSpinner,
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    bbDate,
    budgetYear,
    refNo,
    uploaded,
    sourceFileName,
    totalBudgetAmount,
    remarks,
    noReprints,
    detailRows,
    detailRowsApp,
    tblFieldArray,
    selectedRowIndex,
    lookupContext,
    showAllTranDocNo,
    branchModalOpen,
    rcLookupModalOpen,
    acctLookupModalOpen,
    budgetItemLookupModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    showUploadDropdown,
  } = state;

  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle = "Budget Beginning Upload";
  const displayStatus = getFullStatus(status || documentStatus);

  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = statusMap[displayStatus] || "";
  const isViewDocumentUrl = isViewDocument;
  const isDocumentLocked =
    isViewDocumentUrl ||
    ["FINALIZED", "CANCELLED", "CLOSED", "POSTED"].includes(displayStatus);

  const isFormDisabled = isDocumentLocked;

  const getMax = (col) => useGetFieldLength(tblFieldArray, col) || 100;

  const budgetColumnDefs = useMemo(
    () => [
      { key: "ln", label: "LN", width: 56 },
      { key: "cutoffCode", label: "Cutoff", width: 100 },
      { key: "branchCode", label: "Branch", width: 110 },
      { key: "rcCode", label: "RC Code", width: 120 },
      { key: "rcName", label: "RC Name", width: 220 },
      { key: "acctCode", label: "Account Code", width: 140 },
      { key: "acctName", label: "Account Name", width: 260 },
      { key: "budgetCode", label: "Budget Code", width: 140 },
      { key: "budgetName", label: "Budget Name", width: 260 },
      { key: "budgetAmount", label: "Budget Amount", width: 150 },
      { key: "remarks", label: "Remarks", width: 240 },
    ],
    []
  );

  const templateColumnLabelMap = useMemo(
    () => ({
      cutoffCode: "Cutoff Code",
      branchCode: "Branch Code",
      rcCode: "RC Code",
      acctCode: "Account Code",
      budgetCode: "Budget Code",
      budgetAmount: "Budget Amount",
      remarks: "Remarks",
    }),
    []
  );

  const getBudgetTemplateYear = () => {
    const rawYear = String(budgetYear || "").trim();
    if (/^\d{4}$/.test(rawYear)) return rawYear;
    return String(new Date().getFullYear());
  };

  const getBudgetMonthColumns = (year = getBudgetTemplateYear()) =>
    Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return `${year}${month}`;
    });

  const getBudgetLineTemplateColumns = () =>
    [
      { key: "cutoffCode", label: templateColumnLabelMap.cutoffCode, width: 110 },
      { key: "branchCode", label: templateColumnLabelMap.branchCode, width: 130 },
      { key: "rcCode", label: templateColumnLabelMap.rcCode, width: 130 },
      { key: "acctCode", label: templateColumnLabelMap.acctCode, width: 150 },
      { key: "budgetCode", label: templateColumnLabelMap.budgetCode, width: 150 },
      { key: "budgetAmount", label: templateColumnLabelMap.budgetAmount, width: 150 },
      { key: "remarks", label: templateColumnLabelMap.remarks, width: 240 },
    ];

  const getBudgetMonthTemplateColumns = () => [
    { key: "branchCode", label: templateColumnLabelMap.branchCode, width: 130 },
    { key: "rcCode", label: templateColumnLabelMap.rcCode, width: 130 },
    { key: "acctCode", label: templateColumnLabelMap.acctCode, width: 150 },
    { key: "budgetCode", label: templateColumnLabelMap.budgetCode, width: 150 },
    ...getBudgetMonthColumns().map((monthKey) => ({
      key: monthKey,
      label: monthKey,
      width: 105,
    })),
    { key: "remarks", label: templateColumnLabelMap.remarks, width: 240 },
  ];

  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    clearAllSorting,
    clearZeroValueOnFocus,
    focusNextRowInput,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(budgetColumnDefs);

  const orderedBudgetColumns = getOrderedColumns(budgetColumnDefs);
  const getBudgetFallbackWidth = (key) =>
    budgetColumnDefs.find((column) => column.key === key)?.width || 120;

  const getBudgetCellStyle = (key, fallbackWidth) => ({
    ...getColumnStyle(key, fallbackWidth),
    ...getFrozenColumnStyle(key, orderedBudgetColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedBudgetRows = getSortedRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "")
  );

  useEffect(() => {
    if (!showUploadDropdown) return;

    const handleClickOutside = (event) => {
      if (uploadDropdownRef.current?.contains(event.target)) return;
      updateState({ showUploadDropdown: false });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUploadDropdown]);

  useEffect(() => {
    if (isFormDisabled && showUploadDropdown) {
      updateState({ showUploadDropdown: false });
    }
  }, [isFormDisabled, showUploadDropdown]);

  const recalcTotals = (rows = []) => {
    const totalAmount = (rows || []).reduce(
      (sum, row) => sum + (parseFormattedNumber(row.budgetAmount || 0) || 0),
      0
    );

    updateState({
      totalBudgetAmount: formatNumber(totalAmount || 0, decAmt),
    });
  };

  const createBlankBudgetRow = () => ({
    cutoffCode: "",
    branchCode: "",
    branchName: "",
    rcCode: "",
    rcName: "",
    acctCode: "",
    acctName: "",
    budgetCode: "",
    budgetName: "",
    budgetAmount: formatNumber(0, decAmt),
    remarks: "",
  });

  const setDetailRows = (rows = []) => {
    detailRowsRef.current = rows;
    updateState({ detailRows: rows });
    recalcTotals(rows);
  };

  const updateBudgetRow = (rowIndex, updater) => {
    const nextRows = [...(detailRowsRef.current || detailRows || [])];
    const currentRow = { ...(nextRows[rowIndex] || {}) };
    nextRows[rowIndex] =
      typeof updater === "function" ? updater(currentRow) : { ...currentRow, ...updater };

    setDetailRows(nextRows);
  };

  const handleInsertBlankRow = (index = null) => {
    if (isFormDisabled) return;

    const currentRows = [...(detailRowsRef.current || detailRows || [])];
    const insertIndex = Number.isInteger(index) ? index + 1 : currentRows.length;

    currentRows.splice(insertIndex, 0, createBlankBudgetRow());
    setDetailRows(currentRows);
  };

  const handleDeleteRow = async (index) => {
    if (isFormDisabled) return;

    const confirm = await useSwalProceedConfirm(
      "Delete Budget Row?",
      "This will delete the selected budget detail row.",
      "Yes",
      "No"
    );

    if (!confirm?.isConfirmed) return;

    const nextRows = (detailRowsRef.current || detailRows || []).filter(
      (_, rowIndex) => rowIndex !== index
    );

    setDetailRows(nextRows);
  };

  const handleBudgetRowChange = (index, field, value, commit = false) => {
    updateBudgetRow(index, (row) => {
      if (field === "budgetAmount") {
        const nextValue = commit
          ? formatNumber(parseFormattedNumber(value || 0) || 0, decAmt)
          : sanitizeNumeric(value);

        return { ...row, [field]: nextValue };
      }

      if (field === "cutoffCode") {
        const cleanCutoff = String(value || "").replace(/[^0-9]/g, "").slice(0, 6);
        return { ...row, cutoffCode: cleanCutoff };
      }

      return { ...row, [field]: value };
    });
  };

  const openRowLookup = (type, rowIndex) => {
    if (isFormDisabled) return;

    updateState({
      lookupContext: type,
      selectedRowIndex: rowIndex,
      branchModalOpen: type === "branch",
      rcLookupModalOpen: type === "rc",
      acctLookupModalOpen: type === "acct",
      budgetItemLookupModalOpen: type === "budgetItem",
    });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch && lookupContext === "branch" && selectedRowIndex != null) {
      updateBudgetRow(selectedRowIndex, {
        branchCode: selectedBranch.branchCode || selectedBranch.code || "",
        branchName: selectedBranch.branchName || selectedBranch.description || "",
      });
    }

    updateState({
      branchModalOpen: false,
      selectedRowIndex: null,
      lookupContext: "",
    });
  };

  const handleCloseRCModal = (selectedRC) => {
    if (selectedRC && lookupContext === "rc" && selectedRowIndex != null) {
      updateBudgetRow(selectedRowIndex, {
        rcCode: selectedRC.rcCode || selectedRC.code || "",
        rcName: selectedRC.rcName || selectedRC.description || "",
      });
    }

    updateState({
      rcLookupModalOpen: false,
      selectedRowIndex: null,
      lookupContext: "",
    });
  };

  const handleCloseAccountLookup = (selectedAccount) => {
    if (selectedAccount && lookupContext === "acct" && selectedRowIndex != null) {
      updateBudgetRow(selectedRowIndex, {
        acctCode: selectedAccount.acctCode || selectedAccount.code || "",
        acctName: selectedAccount.acctName || selectedAccount.description || "",
      });
    }

    updateState({
      acctLookupModalOpen: false,
      selectedRowIndex: null,
      lookupContext: "",
    });
  };

  const handleCloseBudgetItemLookup = (selectedBudget) => {
    if (selectedBudget && lookupContext === "budgetItem" && selectedRowIndex != null) {
      updateBudgetRow(selectedRowIndex, {
        budgetCode: selectedBudget.code || "",
        budgetName: selectedBudget.description || "",
      });
    }

    updateState({
      budgetItemLookupModalOpen: false,
      selectedRowIndex: null,
      lookupContext: "",
    });
  };

  const handleRemarksCell = (index, _field, value) => {
    handleBudgetRowChange(index, "remarks", value);
  };

  const focusBudgetCell = (field, nextIndex) => {
    const nextEl = document.getElementById(`${field}-${nextIndex}`);

    if (nextEl) {
      nextEl.focus();
      if (typeof nextEl.select === "function") nextEl.select();
    }
  };

  const renderBudgetDetailCell = (columnKey, row, index) => {
    const columnWidth = getBudgetFallbackWidth(columnKey);
    const style = getBudgetCellStyle(columnKey, columnWidth);

    const focusNextDetailCell = (field) => {
      focusNextRowInput(index, field, {
        rows: detailRowsRef.current || detailRows,
        zeroClearFields: ["budgetAmount"],
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, val) =>
          handleBudgetRowChange(nextIndex, nextField, val, false),
      });
    };

    const handleGridKeyDown = (e, field, options = {}) => {
      if (options.readOnly || options.disabled || isFormDisabled) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (options.commitOnEnter) {
          handleBudgetRowChange(index, field, e.target.value, true);
        }
        focusNextDetailCell(field);
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();

      if (e.key === "ArrowUp") focusBudgetCell(field, Math.max(0, index - 1));
      if (e.key === "ArrowDown") {
        focusBudgetCell(field, Math.min((detailRowsRef.current || detailRows).length - 1, index + 1));
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const editableColumns = orderedBudgetColumns
          .map((column) => column.key)
          .filter((key) => !["ln", "branchCode", "rcCode", "rcName", "acctCode", "acctName", "budgetCode", "budgetName"].includes(key));

        const currentColIndex = editableColumns.indexOf(field);
        const nextColIndex =
          e.key === "ArrowLeft"
            ? Math.max(0, currentColIndex - 1)
            : Math.min(editableColumns.length - 1, currentColIndex + 1);

        if (nextColIndex >= 0) focusBudgetCell(editableColumns[nextColIndex], index);
      }
    };

    const textInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={options.readOnly ?? isFormDisabled}
        disabled={options.disabled ?? false}
        maxLength={options.maxLength}
        onChange={(e) => handleBudgetRowChange(index, field, e.target.value, false)}
        onKeyDown={(e) => handleGridKeyDown(e, field, options)}
      />
    );

    const lookupInput = (field, lookupType) => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input
            type="text"
            id={`${field}-${index}`}
            className="w-full global-tran-td-inputclass-ui pr-6"
            value={row[field] || ""}
            readOnly
            disabled={isFormDisabled}
          />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => openRowLookup(lookupType, index)}
            />
          )}
        </div>
      </td>
    );

    const amountInput = (field) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={row[field] || ""}
        readOnly={isFormDisabled}
        disabled={false}
        onChange={(e) => {
          const nextValue = sanitizeNumeric(e.target.value);
          if (/^-?\d*\.?\d*$/.test(nextValue) || nextValue === "") {
            handleBudgetRowChange(index, field, nextValue, false);
          }
        }}
        onFocus={(e) =>
          clearZeroValueOnFocus(e, {
            isEditable: !isFormDisabled,
            onClear: (val) => handleBudgetRowChange(index, field, val, false),
          })
        }
        onBlur={(e) => {
          if (isFormDisabled) return;
          handleBudgetRowChange(index, field, e.target.value, true);
        }}
        onKeyDown={(e) => handleGridKeyDown(e, field, { commitOnEnter: true })}
      />
    );

    const detailColumnRenderers = {
      ln: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          {index + 1}
        </td>
      ),
      cutoffCode: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {textInput("cutoffCode", { maxLength: 6 })}
        </td>
      ),
      branchCode: () => lookupInput("branchCode", "branch"),
      rcCode: () => lookupInput("rcCode", "rc"),
      rcName: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {textInput("rcName", { readOnly: true })}
        </td>
      ),
      acctCode: () => lookupInput("acctCode", "acct"),
      acctName: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {textInput("acctName", { readOnly: true })}
        </td>
      ),
      budgetCode: () => lookupInput("budgetCode", "budgetItem"),
      budgetName: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {textInput("budgetName", { readOnly: true })}
        </td>
      ),
      budgetAmount: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {amountInput("budgetAmount")}
        </td>
      ),
      remarks: () => (
        <td key={columnKey} className="global-tran-td-ui relative" style={style}>
          <div className="relative flex items-center">
            <input
              type="text"
              id={`remarks-${index}`}
              className="w-full global-tran-td-inputclass-ui pr-8"
              value={row.remarks || ""}
              readOnly
              disabled={isFormDisabled}
            />
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() =>
                  useSwalHandleOpenSpecsModal(
                    index,
                    detailRows,
                    handleRemarksCell,
                    row.remarks,
                    "Remarks",
                    "remarks",
                    "Enter budget detail remarks..."
                  )
                }
              />
            )}
          </div>
        </td>
      ),
    };

    return (
      detailColumnRenderers[columnKey]?.() ?? (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {String(row[columnKey] ?? "")}
        </td>
      )
    );
  };

  const mapUploadRowsToBudgetRows = (rawRows = []) => {
    const monthColumns = new Set(getBudgetMonthColumns());
    const mappedRows = [];

    (rawRows || []).forEach((row) => {
      const cutoffCode = String(getFirstValue(row, ["cutoffCode", "cutoff", "cutoff_code"]) || "")
        .replace(/[^0-9]/g, "")
        .slice(0, 6);
      const branchCode = String(getFirstValue(row, ["branchCode", "branch", "branch_code"]) || "").trim();
      const branchName = String(getFirstValue(row, ["branchName", "branch_name", "branchDescription", "branchDesc"]) || "").trim();
      const rcCode = String(getFirstValue(row, ["rcCode", "departmentCode", "rc_code"]) || "").trim();
      const rcName = String(getFirstValue(row, ["rcName", "departmentName", "rc_name"]) || "").trim();
      const acctCode = String(getFirstValue(row, ["acctCode", "accountCode", "acct_code"]) || "").trim();
      const acctName = String(getFirstValue(row, ["acctName", "accountName", "acct_name"]) || "").trim();
      const budgetCode = String(getFirstValue(row, ["budgetCode", "budget_code"]) || "").trim();
      const budgetName = String(getFirstValue(row, ["budgetName", "budgetItemName", "budget_name"]) || "").trim();
      const remarks = String(getFirstValue(row, ["remarks", "particular", "notes"]) || "").trim();
      const existingAmount = parseFormattedNumber(
        getFirstValue(row, ["budgetAmount", "budget_amount", "amount", "budget"])
      );

      const hasMonthColumns = Array.from(monthColumns).some((monthKey) => {
        const rawValue = getFirstValue(row, [monthKey]);
        return String(rawValue || "").trim() !== "";
      });

      if (hasMonthColumns) {
        Array.from(monthColumns).forEach((monthKey) => {
          const monthAmount = parseFormattedNumber(getFirstValue(row, [monthKey]) || 0);
          if (!monthAmount) return;

          mappedRows.push({
            cutoffCode: monthKey,
            branchCode,
            branchName,
            rcCode,
            rcName,
            acctCode,
            acctName,
            budgetCode,
            budgetName,
            budgetAmount: formatNumber(monthAmount || 0, decAmt),
            remarks,
          });
        });
        return;
      }

      mappedRows.push({
        cutoffCode,
        branchCode,
        branchName,
        rcCode,
        rcName,
        acctCode,
        acctName,
        budgetCode,
        budgetName,
        budgetAmount: formatNumber(existingAmount || 0, decAmt),
        remarks,
      });
    });

    return mappedRows.filter(
      (row) =>
        row.cutoffCode ||
        row.branchCode ||
        row.rcCode ||
        row.acctCode ||
        row.budgetCode ||
        parseFormattedNumber(row.budgetAmount || 0) !== 0
    );
  };

  const detectUploadMode = (rows = []) => {
    const monthColumns = new Set(getBudgetMonthColumns());

    for (const row of rows || []) {
      for (const monthKey of monthColumns) {
        const value = getFirstValue(row, [monthKey]);
        if (String(value || "").trim() !== "") {
          return "UploadByColumn";
        }
      }
    }

    return "UploadByRow";
  };

  const readExcelRows = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      raw: false,
    });

    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[firstSheetName];

    return XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });
  };

  const normalizeUploadRowsForApi = (rawRows = [], uploadMode = "UploadByRow") => {
    const monthColumns = getBudgetMonthColumns();

    return (rawRows || [])
      .map((row, index) => {
        const baseRow = {
          lineNo: index + 1,
          sourceRowNo: index + 2,
          branchCode: String(getFirstValue(row, ["branchCode", "branch", "branch_code"]) || "").trim(),
          branchName: String(getFirstValue(row, ["branchName", "branch_name", "branchDescription", "branchDesc"]) || "").trim(),
          rcCode: String(getFirstValue(row, ["rcCode", "departmentCode", "rc_code"]) || "").trim(),
          rcName: String(getFirstValue(row, ["rcName", "departmentName", "rc_name"]) || "").trim(),
          acctCode: String(getFirstValue(row, ["acctCode", "accountCode", "acct_code"]) || "").trim(),
          acctName: String(getFirstValue(row, ["acctName", "accountName", "acct_name"]) || "").trim(),
          budgetCode: String(getFirstValue(row, ["budgetCode", "budget_code"]) || "").trim(),
          budgetName: String(getFirstValue(row, ["budgetName", "budgetItemName", "budget_name"]) || "").trim(),
          remarks: String(getFirstValue(row, ["remarks", "particular", "notes"]) || "").trim(),
        };

        if (uploadMode === "UploadByColumn") {
          monthColumns.forEach((monthKey) => {
            const monthValue = getFirstValue(row, [monthKey]);
            baseRow[monthKey] = monthValue === "" || monthValue == null ? "" : monthValue;
          });

          return baseRow;
        }

        return {
          ...baseRow,
          cutoffCode: String(getFirstValue(row, ["cutoffCode", "cutoff", "cutoff_code"]) || "")
            .replace(/[^0-9]/g, "")
            .slice(0, 6),
          budgetAmount: getFirstValue(row, ["budgetAmount", "budget_amount", "amount", "budget"]) || 0,
        };
      })
      .filter((row) => {
        if (uploadMode === "UploadByColumn") {
          return (
            row.branchCode ||
            row.rcCode ||
            row.acctCode ||
            row.budgetCode ||
            monthColumns.some((monthKey) => String(row[monthKey] || "").trim() !== "")
          );
        }

        return (
          row.cutoffCode ||
          row.branchCode ||
          row.rcCode ||
          row.acctCode ||
          row.budgetCode ||
          parseFormattedNumber(row.budgetAmount || 0) !== 0
        );
      });
  };

  const extractValidatedUploadRows = (responsePayload = {}) => {
    const parseResultRows = (rawResult) => {
      if (typeof rawResult !== "string" || !rawResult.trim()) {
        return [];
      }

      try {
        const parsed = JSON.parse(rawResult);
        return Array.isArray(parsed?.rows) ? parsed.rows : [];
      } catch {
        return [];
      }
    };

    if (Array.isArray(responsePayload?.rows)) {
      return responsePayload.rows;
    }

    if (Array.isArray(responsePayload?.data?.rows)) {
      return responsePayload.data.rows;
    }

    if (Array.isArray(responsePayload?.data?.[0]?.rows)) {
      return responsePayload.data[0].rows;
    }

    if (Array.isArray(responsePayload)) {
      if (Array.isArray(responsePayload?.[0]?.rows)) {
        return responsePayload[0].rows;
      }

      return (
        parseResultRows(responsePayload?.[0]?.result) ||
        parseResultRows(responsePayload?.[0]?.RESULT)
      );
    }

    return (
      parseResultRows(responsePayload?.result) ||
      parseResultRows(responsePayload?.RESULT) ||
      parseResultRows(responsePayload?.data?.result) ||
      parseResultRows(responsePayload?.data?.RESULT) ||
      parseResultRows(responsePayload?.data?.[0]?.result) ||
      parseResultRows(responsePayload?.data?.[0]?.RESULT)
    );
  };

  const normalizeApiResponse = (response) => {
    const isDirectResponse =
      response?.success !== undefined ||
      response?.rows !== undefined ||
      response?.errorCount !== undefined ||
      response?.errorcount !== undefined;

    return isDirectResponse ? response : response?.data || response || {};
  };

  const extractUploadErrors = (responsePayload = {}) => {
    const parseResultErrors = (rawResult) => {
      if (typeof rawResult !== "string" || !rawResult.trim()) {
        return [];
      }

      try {
        const parsed = JSON.parse(rawResult);
        return Array.isArray(parsed?.errors) ? parsed.errors : [];
      } catch {
        return [];
      }
    };

    if (Array.isArray(responsePayload?.errors)) {
      return responsePayload.errors;
    }

    if (Array.isArray(responsePayload?.data?.errors)) {
      return responsePayload.data.errors;
    }

    if (Array.isArray(responsePayload?.data?.[0]?.errors)) {
      return responsePayload.data[0].errors;
    }

    if (Array.isArray(responsePayload)) {
      if (Array.isArray(responsePayload?.[0]?.errors)) {
        return responsePayload[0].errors;
      }

      return (
        parseResultErrors(responsePayload?.[0]?.result) ||
        parseResultErrors(responsePayload?.[0]?.RESULT)
      );
    }

    return (
      parseResultErrors(responsePayload?.result) ||
      parseResultErrors(responsePayload?.RESULT) ||
      parseResultErrors(responsePayload?.data?.result) ||
      parseResultErrors(responsePayload?.data?.RESULT) ||
      parseResultErrors(responsePayload?.data?.[0]?.result) ||
      parseResultErrors(responsePayload?.data?.[0]?.RESULT)
    );
  };

  const downloadUploadErrorLog = ({ responsePayload = {}, apiRows = [], uploadMode = "UploadByRow", fileName = "" }) => {
    const validatedRows = extractValidatedUploadRows(responsePayload);
    const errors = extractUploadErrors(responsePayload);
    const rowsForExport = Array.isArray(validatedRows) && validatedRows.length ? validatedRows : apiRows;
    const errorByLine = new Map();

    (errors || []).forEach((error) => {
      const lineNo = Number(error?.ln || error?.lineNo || error?.line_no || 0);
      const message = String(error?.errorMsg || error?.error_msg || error?.message || "").trim();

      if (!lineNo || !message) return;

      const existing = errorByLine.get(lineNo);
      errorByLine.set(lineNo, existing ? `${existing}; ${message}` : message);
    });

    const mappedRows = mapUploadRowsToBudgetRows(rowsForExport);
    const rowsWithErrors = mappedRows.map((row, index) => ({
      "Line No.": index + 1,
      "Cutoff Code": row.cutoffCode || "",
      "Branch Code": row.branchCode || "",
      "Branch Name": row.branchName || "",
      "RC Code": row.rcCode || "",
      "RC Name": row.rcName || "",
      "Account Code": row.acctCode || "",
      "Account Name": row.acctName || "",
      "Budget Code": row.budgetCode || "",
      "Budget Name": row.budgetName || "",
      "Budget Amount": parseFormattedNumber(row.budgetAmount || 0) || 0,
      "Remarks": row.remarks || "",
      "Error Log": errorByLine.get(index + 1) || "",
    }));

    const extraErrors = (errors || [])
      .filter((error) => {
        const lineNo = Number(error?.ln || error?.lineNo || error?.line_no || 0);
        return !lineNo || lineNo > rowsWithErrors.length;
      })
      .map((error) => ({
        "Line No.": error?.ln || "",
        "Cutoff Code": "",
        "Branch Code": "",
        "Branch Name": "",
        "RC Code": "",
        "RC Name": "",
        "Account Code": "",
        "Account Name": "",
        "Budget Code": "",
        "Budget Name": "",
        "Budget Amount": "",
        "Remarks": "",
        "Error Log": String(error?.errorMsg || error?.error_msg || error?.message || "").trim(),
      }));

    const exportRows = [...rowsWithErrors, ...extraErrors];

    if (!exportRows.length) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Error Log");

    const safeOriginalName = String(fileName || "BUDBB_Upload")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]/g, "_");

    const dateKey = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);

    XLSX.writeFile(workbook, `${safeOriginalName}_Error_Log_${dateKey}.xlsx`);
  };

  const handleUploadFile = async (event) => {
    const file = event?.target?.files?.[0];

    if (!file) return;

    const extension = String(file?.name || "").split(".").pop()?.toLowerCase() || "";

    try {
      updateState({ showSpinner: true });

      if (!["xlsx", "xls"].includes(extension)) {
        useSwalErrorAlert("Invalid File", "Please upload an Excel .xlsx or .xls file.");
        return;
      }

      const excelRows = await readExcelRows(file);
      const uploadMode = detectUploadMode(excelRows);
      const apiRows = normalizeUploadRowsForApi(excelRows, uploadMode);
      const localMappedRows = mapUploadRowsToBudgetRows(apiRows);

      if (!apiRows.length || !localMappedRows.length) {
        useSwalErrorAlert("Upload Error", "No valid budget rows found in the uploaded Excel file.");
        return;
      }

      const response = await postRequest(
        "uploadBUDBBExcel",
        JSON.stringify({
          json_data: {
            budgetYear: budgetYear || getCurrentYear(),
            uploadMode,
            userCode: currentUserRow?.userCode || "",
            dt1: apiRows,
          },
        })
      );

      const res = normalizeApiResponse(response);


      if (res?.success === false || Number(res?.errorCount || res?.errorcount || 0) > 0) {
        const message =
          res?.errorMsg ||
          res?.errormsg ||
          res?.message ||
          "Excel rows have validation error(s).";

        const errors = extractUploadErrors(res);
        const firstError = Array.isArray(errors) && errors.length
          ? `

${errors[0]?.errorMsg || errors[0]?.error_msg || ""}`
          : "";

        downloadUploadErrorLog({
          responsePayload: res,
          apiRows,
          uploadMode,
          fileName: file.name,
        });

        useSwalErrorAlert(
          "Upload Validation",
          `${message}${firstError}

The file was not imported. An Excel error log has been downloaded.`
        );
        return;
      }

      const normalizedRows = extractValidatedUploadRows(res);

      const mappedRows = mapUploadRowsToBudgetRows(
        Array.isArray(normalizedRows) && normalizedRows.length ? normalizedRows : apiRows
      );

      if (!mappedRows.length) {
        useSwalErrorAlert("Upload Error", "No valid budget rows found in the uploaded Excel file.");
        return;
      }

      setDetailRows(mappedRows);
      updateState({
        uploaded: "Y",
        sourceFileName: file.name,
      });

      useSwalSuccessAlert("Upload Completed", `${mappedRows.length} budget row(s) loaded.`);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to process the uploaded Excel file.";

      useSwalErrorAlert("Upload Error", message);
    } finally {
      updateState({ showSpinner: false });

      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  const handleDownloadTemplate = () => {
    return downloadGlobalSingleUploadTemplate({
      columns: getBudgetLineTemplateColumns(),
      rows: [],
      fileName: `BUDBB_Upload_Template_${budgetYear || getCurrentYear()}.xlsx`,
      sheetName: "Template",
    });
  };

  const handleDownloadMonthTemplate = () => {
    return downloadGlobalSingleUploadTemplate({
      columns: getBudgetMonthTemplateColumns(),
      rows: [],
      fileName: `BUDBB_Month_Template_${budgetYear || getCurrentYear()}.xlsx`,
      sheetName: "Month Template",
    });
  };

  const validateBudgetRows = async (rows = []) => {
    if (!rows.length) {
      useSwalErrorAlert("Validation Error", "Please add or upload at least one Budget Beginning detail row.");
      return false;
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const lineNo = index + 1;

      const isValid = await useSwalvalidateRequiredFields(
        {
          [`Line ${lineNo}: Cutoff`]: row.cutoffCode,
          [`Line ${lineNo}: Branch Code`]: row.branchCode,
          [`Line ${lineNo}: RC Code`]: row.rcCode,
          [`Line ${lineNo}: Account Code`]: row.acctCode,
          [`Line ${lineNo}: Budget Code`]: row.budgetCode,
        },
        "Budget Beginning Details"
      );

      if (!isValid) return false;

      if (!/^\d{6}$/.test(String(row.cutoffCode || ""))) {
        useSwalErrorAlert("Validation Error", `Line ${lineNo}: Cutoff must be in YYYYMM format.`);
        return false;
      }

      if ((parseFormattedNumber(row.budgetAmount || 0) || 0) <= 0) {
        useSwalErrorAlert("Validation Error", `Line ${lineNo}: Budget Amount must be greater than zero.`);
        return false;
      }
    }

    return true;
  };

  const handleActivityOption = async () => {
    if (isFormDisabled) return;

    const cleanBudgetYear = String(budgetYear || "").trim();
    const rowsForSave = (detailRowsRef.current || detailRows || []).map((row) => ({
      ...row,
      budgetAmount: formatNumber(parseFormattedNumber(row.budgetAmount || 0) || 0, decAmt),
    }));

    const headerValid = await useSwalvalidateRequiredFields(
      {
        "Budget Beginning Date": bbDate,
        "Budget Year": cleanBudgetYear,
      },
      "Budget Beginning"
    );

    if (!headerValid) return;

    if (!/^\d{4}$/.test(cleanBudgetYear)) {
      useSwalErrorAlert("Validation Error", "Budget Year must be in YYYY format.");
      return;
    }

    const detailValid = await validateBudgetRows(rowsForSave);
    if (!detailValid) return;

    updateState({ isLoading: true, showSpinner: true });

    try {
      const totalAmount = rowsForSave.reduce(
        (sum, row) => sum + (parseFormattedNumber(row.budgetAmount || 0) || 0),
        0
      );

      const bbData = {
        documentNo: documentNo || "",
        documentID: documentID || "",
        bbNo: documentNo || "",
        bbDate: bbDate || useGetCurrentDayV2(),
        budgetYear: cleanBudgetYear,
        refNo: refNo || "",
        uploaded: uploaded || "N",
        sourceFileName: sourceFileName || "",
        totalBudgetAmount: totalAmount,
        remarks: remarks || "",
        status: documentStatus || status || "",
        userCode: currentUserRow?.userCode || "",

        dt1: rowsForSave.map((row, index) => ({
          documentID: documentID || "",
          bbNo: documentNo || "",
          lnNo: index + 1,
          lineNo: index + 1,
          budgetYear: cleanBudgetYear,
          cutoffCode: row.cutoffCode || "",
          branchCode: row.branchCode || "",
          rcCode: row.rcCode || "",
          rcName: row.rcName || "",
          acctCode: row.acctCode || "",
          acctName: row.acctName || "",
          budgetCode: row.budgetCode || "",
          budgetName: row.budgetName || "",
          budgetAmount: parseFormattedNumber(row.budgetAmount || 0) || 0,
          remarks: row.remarks || "",
        })),
      };

      const response = await postRequest(
        `upsert${docType}`,
        JSON.stringify({ json_data: bbData })
      );

      const responseData = response?.data?.[0] || response?.data?.data?.[0] || response?.data || {};
      const returnedErrorMsg = String(
        responseData.errorMsg ||
          responseData.errormsg ||
          responseData.message ||
          ""
      ).trim();
      const returnedErrorCount = Number(responseData.errorCount ?? responseData.errorcount ?? 0);

      if (returnedErrorMsg || returnedErrorCount > 0) {
        useSwalErrorAlert("Validation Failed", returnedErrorMsg || "Unable to save transaction.");
        return;
      }

      const responseDocNo =
        responseData.documentNo ||
        responseData.docNo ||
        responseData.bbNo ||
        documentNo;

      const responseDocId =
        responseData.documentID ||
        responseData.docId ||
        responseData.bbId ||
        documentID;

      if (!responseDocNo && !responseDocId) {
        useSwalErrorAlert("Save Error", "Unexpected save response.");
        return;
      }

      if (responseDocNo || responseDocId) {
        await fetchTranData(responseDocNo, "", responseDocId);
        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
      }

      updateState({
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      const errorMessage =
        error?.response?.data?.[0]?.errorMsg ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to save transaction.";

      useSwalErrorAlert("Save Error", errorMessage);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const fetchTranData = async (docNoParam = "", _branchCode = "", direction = "") => {
    const resetFetchState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        detailRowsApp: [],
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });

      setDetailRows([]);
    };

    updateState({ isLoading: true });

    try {
      let formattedDocNo = String(docNoParam || "").trim();

      if (formattedDocNo && /^\d+$/.test(formattedDocNo)) {
        formattedDocNo = formattedDocNo.padStart(Number(state.documentDocLen || 8), "0");
      }

      const data = await useFetchTranData(
        formattedDocNo,
        "",
        "BUDBB",
        "documentNo",
        direction
      );


      if (!data?.bbId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        resetFetchState();
        return;
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        budgetYear: item.budgetYear || "",
        cutoffCode: item.cutoffCode || "",
        branchCode: item.branchCode || "",
        branchName: item.branchName || "",
        rcCode: item.rcCode || "",
        rcName: item.rcName || "",
        acctCode: item.acctCode || "",
        acctName: item.acctName || "",
        budgetCode: item.budgetCode || "",
        budgetName: item.budgetName || "",
        budgetAmount: formatNumber(item.budgetAmount || 0, decAmt),
        remarks: item.remarks || "",
      }));

      const retrievedApprovalRows = Array.isArray(data.dtApp)
        ? data.dtApp
        : data.dtApp
          ? [data.dtApp]
          : [];

      setDetailRows(retrievedDetailRows);

      updateState({
        documentStatus: data.bbStatus || "",
        status: data.status || "",
        originalDocStatus: data.bbStatus || "",
        appLevel: data.appLevel || 0,

        documentID: data.bbId,
        documentNo: data.bbNo,
        bbDate: useformatToDatev2(data.bbDate),
        budgetYear: String(data.budgetYear || getCurrentYear()),
        refNo: data.refNo || "",
        uploaded: data.uploaded || "N",
        sourceFileName: data.sourceFileName || "",
        totalBudgetAmount: formatNumber(data.totalBudgetAmount || 0, decAmt),
        remarks: data.remarks || "",
        noReprints: data.noReprints ?? "0",
        bbCancelled: data.bbCancelled || "",
        detailRowsApp: retrievedApprovalRows,

        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("Error fetching Budget Beginning:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error?.message || "Unable to fetch Budget Beginning.",
      });
      resetFetchState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleReset = () => {
    clearAllSorting();

    const today = useGetCurrentDayV2();

    updateState({
      documentID: "",
      documentNo: "",
      documentStatus: "",
      status: "",
      originalDocStatus: "",
      appLevel: 0,
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,

      bbDate: today,
      budgetYear: getCurrentYear(),
      refNo: "",
      uploaded: "N",
      sourceFileName: "",
      totalBudgetAmount: "0.00",
      remarks: "",
      noReprints: "0",

      detailRows: [],
      detailRowsApp: [],
      selectedRowIndex: null,
      lookupContext: "",
      showAllTranDocNo: false,

      branchModalOpen: false,
      rcLookupModalOpen: false,
      acctLookupModalOpen: false,
      budgetItemLookupModalOpen: false,
      showCancelModal: false,
      showAttachModal: false,
      showSignatoryModal: false,
      showPostModal: false,
    });

    detailRowsRef.current = [];
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const hdtblcolResult = await useFieldLenghtCheck("budbb_hd,budbb_dt1");

      if (hdtblcolResult) {
        updateState({ tblFieldArray: hdtblcolResult });
      }
    } catch (err) {
      console.error("Error field length check:", err);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handlePrint = async () => {
    if (!documentID) return;
    updateState({ showSignatoryModal: true });
  };

  const handleCancel = async () => {
    if (documentID && !["X", "F", "C", "P"].includes(String(documentStatus || "").toUpperCase())) {
      updateState({ showCancelModal: true });
    }
  };

  const handlePost = async () => {
    if (documentID && !["X", "F", "C", "P"].includes(String(documentStatus || "").toUpperCase())) {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (!detailRows.length) return;

    const copiedRows = (detailRows || []).map((row) => ({ ...row }));
    detailRowsRef.current = copiedRows;

    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "",
      status: "",
      originalDocStatus: "",
      bbDate: useGetCurrentDayV2(),
      noReprints: "0",
      appLevel: 0,
      detailRows: copiedRows,
      isDocNoDisabled: false,
      isFetchDisabled: false,
    });

    recalcTotals(copiedRows);
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentID !== null) {
      const pwd = confirmation?.password || confirmation?.userPassword || "";
      const rsn = confirmation?.reason || "";

      if (!pwd) {
        useSwalInfoAlert("Required", "Password was not captured. Please try again.");
        return;
      }

      const result = await useHandleCancel(
        docType,
        documentID,
        currentUserRow?.userCode,
        pwd,
        rsn,
        updateState
      );

      if (result && result.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
        await fetchTranData(documentNo);
      }
    }

    updateState({ showCancelModal: false });
  };

  
  const handleClosePost = async (confirmation) => {
    if (confirmation && documentID !== null) {
      try {
        updateState({ showSpinner: true });

        const result = await useHandlePost(
          docType,
          documentID,
          currentUserRow?.userCode,
          updateState
        );

        if (result && result.success) {
          useSwalSuccessAlert("Success", "Finalize Completed");
          await fetchTranData(documentNo);
        }
      } catch (error) {
        useSwalErrorAlert("Finalize Error", error?.message || "Unable to finalize transaction.");
      } finally {
        updateState({ showSpinner: false });
      }
    }

    updateState({ showPostModal: false });
  };



  const handleCloseSignatory = async (mode) => {
    updateState({
      showSpinner: true,
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });

    await useHandlePrint(documentID, docType, mode);

    updateState({
      showSpinner: false,
    });
  };

  const handleSaveAndPrint = async (docId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(docId, docType);
    updateState({ showSpinner: false });
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);


  


const handleHistoryRowPick = useCallback(
  async (row) => {
    const docNo = row?.docNo;
    if (!docNo) return;

  
    await fetchTranData(docNo, ""); 
    setTopTab("details");
    cleanUrl(); // 
  },
  [fetchTranData, cleanUrl]
);




  // const handleHistoryRowPick = useCallback(
  //   async (row) => {
  //     const docNo = row?.docNo 
  //     if (!docNo) return;

  //     await fetchTranData(docNo);
  //     setTopTab("details");
  //     cleanUrl();
  //   },
  //   [cleanUrl]
  // );

  // const handleTranDocNoRetrieval = async (data = {}) => {
  //   const selectedDocNo =
  //     data.docNo ||
  //     data.documentNo ||
  //     state.documentNo ||
  //     documentNo ||
  //     "";

  //   const direction =
  //     data.key ||
  //     data.direction ||
  //     data.action ||
  //     "";

  //   await fetchTranData(selectedDocNo, "", direction);

  //   updateState({
  //     showAllTranDocNo: data.modalClose ?? false,
  //   });
  // };


  
// const handleTranDocNoRetrieval = async (data) => {


//   await fetchTranData(data.docNo, "", data.key);
//   updateState({ showAllTranDocNo: data.modalClose });
// };




//   const handleTranDocNoSelection = async (data = {}) => {
//     const selectedDocNo = data.docNo || data.documentNo || "";

//     handleReset();

//     updateState({
//       showAllTranDocNo: false,
//       documentNo: selectedDocNo,
//     });



//     if (selectedDocNo) {
//       await fetchTranData(selectedDocNo,"");
//     }
//   };




const handleTranDocNoRetrieval = async (data) => {

    console.log(data)
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({showAllTranDocNo: data.modalClose});
};


const handleTranDocNoSelection = async (data) => {
    
    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};




  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo) {
      fetchTranData(state.documentNo);
    }
  };

  const printData = {
    doc_no: documentNo,
    doc_id: docType,
  };

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, [location.search]);

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  useEffect(() => {
    if (resetFlag) {
      handleReset();
    }

    let timer;

    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }

    return () => clearTimeout(timer);
  }, [resetFlag, isLoading]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    loadCompanyData();
    handleReset();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("docNo") || params.get("documentNo");

    if (!loadedFromUrlRef.current && docNo) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo });
    }
  }, [location.search, handleHistoryRowPick]);

  useEffect(() => {
    const handleF1Lookup = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        if (state.isDocNoDisabled || isFormDisabled) return;
        updateState({ showAllTranDocNo: true });
      }
    };

    window.addEventListener("keydown", handleF1Lookup);
    return () => window.removeEventListener("keydown", handleF1Lookup);
  }, [state.isDocNoDisabled, isFormDisabled]);

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={handleUploadFile}
      />

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onPost={handlePost}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          onHistory={() => setTopTab("history")}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showNotify={false}
          showBIRForm={false}
          showCopyForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          disableRouteNavigation={true}
          detailsRoute="/page/BUDBB"
          isSaveDisabled={isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) === 0)}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
          isNotifyDisabled
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div
            className={`global-tran-headerstat-div-ui ${
              isViewDocument ? "max-md:!mt-0" : ""
            }`}
          >
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button
              className={`global-tran-tab-padding-ui ${
                activeTab === "basic"
                  ? "global-tran-tab-text_active-ui"
                  : "global-tran-tab-text_inactive-ui"
              }`}
              onClick={() => updateState({ activeTab: "basic" })}
            >
              Basic Information
            </button>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative"
            id="budbb_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="docNo"
                  label="BUDBB No."
                  placeholder="BUDBB No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled || isFormDisabled}
                  lookupDisabled={state.isDocNoDisabled || isFormDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onLookup={() =>
                    !(state.isDocNoDisabled || isFormDisabled) &&
                    updateState({ showAllTranDocNo: true })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (!(state.isDocNoDisabled || isFormDisabled)) {
                        handleDocNoBlur();
                      }

                      e.preventDefault();
                      document.getElementById("bbDate")?.focus();
                    }
                  }}
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="bbDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={bbDate || ""}
                      disabled={isFormDisabled}
                      updateState={(next) =>
                        updateState({
                          bbDate: next.bbDate ?? next.value ?? next,
                        })
                      }
                    />
                  </div>
                  <label htmlFor="bbDate" className="global-ref-floating-label global-ref-label-enabled">
                    BUDBB Date
                  </label>
                </div>
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="budgetYear"
                  label="Budget Year"
                  required
                  type="text"
                  value={budgetYear || ""}
                  disabled={isFormDisabled}
                  maxLength={4}
                  onChange={(val) =>
                    updateState({
                      budgetYear: String(val || "").replace(/[^0-9]/g, "").slice(0, 4),
                    })
                  }
                />

                <FieldRenderer
                  id="refNo"
                  label="Reference No."
                  type="text"
                  value={refNo || ""}
                  disabled={isFormDisabled}
                  maxLength={getMax("REF_NO")}
                  onChange={(val) => updateState({ refNo: val })}
                />

                <FieldRenderer
                  id="tranType"
                  label="Tran Type"
                  placeholder="Tran Type"
                  type="text"
                  value="Budget Beginning"
                  disabled
                  readOnly
                />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="sourceFileName"
                  label="Source File Name"
                  type="text"
                  value={sourceFileName || ""}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="uploaded"
                  label="Uploaded"
                  type="text"
                  value={uploaded === "Y" ? "Yes" : "No"}
                  disabled
                  readOnly
                />
              </div>

              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea
                    id="remarks"
                    placeholder=""
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2"
                    value={remarks || ""}
                    onChange={(e) => updateState({ remarks: e.target.value })}
                    disabled={isFormDisabled}
                    maxLength={getMax("REMARKS")}
                  />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                type="button"
                className="global-tran-tab-padding-ui min-w-max whitespace-nowrap !text-left text-left global-tran-tab-text_active-ui"
              >
                Budget Beginning Details
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedBudgetColumns.map((column) =>
                      renderResizableHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedBudgetColumns,
                      })
                    )}
                    {!isFormDisabled && (
                      <th
                        className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                        style={transactionActionsHeaderStyle}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="relative">
                  {sortedBudgetRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedBudgetColumns.map((column) =>
                        renderBudgetDetailCell(column.key, row, originalIndex)
                      )}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() => handleInsertBlankRow(originalIndex)}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRow(originalIndex)}
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {renderHeaderContextMenu?.()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              {!isFormDisabled && (
                <div ref={uploadDropdownRef} className="relative inline-block">
                  {showUploadDropdown && (
                    <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Templates and Entry
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => {
                            updateState({ showUploadDropdown: false });
                            handleInsertBlankRow();
                          }}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <FontAwesomeIcon icon={faPlus} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate leading-5">Add Row</div>
                            <div className="truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Insert a blank line
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                          onClick={() => {
                            updateState({ showUploadDropdown: false });
                            handleDownloadTemplate();
                          }}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faDownload} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate leading-5 whitespace-nowrap">Download Template</div>
                            <div className="truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Line-by-line Excel layout
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                          onClick={() => {
                            updateState({ showUploadDropdown: false });
                            handleDownloadMonthTemplate();
                          }}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faDownload} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate leading-5 whitespace-nowrap">Month Template</div>
                            <div className="truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              202601, 202602, 202603...
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                          onClick={() => {
                            updateState({ showUploadDropdown: false });
                            fileInputRef.current?.click();
                          }}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                            <FontAwesomeIcon icon={faUpload} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate leading-5 whitespace-nowrap">Upload</div>
                            <div className="truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              Import Excel file
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => updateState({ showUploadDropdown: !showUploadDropdown })}
                    className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add
                    <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
                  </button>
                </div>
              )}
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
              <div className="global-tran-tab-footer-total-label-ui">Total Budget Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totalBudgetAmount}</div>
              <div className="global-tran-tab-footer-total-label-ui">Total Rows:</div>
              <div className="global-tran-tab-footer-total-value-ui">{detailRows.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getBUDBBHistory"
          cacheKey={`BUDBB:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="BUDBB_Summary"
          startDate={state.fromDate}
          endDate={state.toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {rcLookupModalOpen && (
        <RCLookupModal
          isOpen={rcLookupModalOpen}
          onClose={handleCloseRCModal}
          customParam="ActiveDept"
        />
      )}

      {acctLookupModalOpen && (
        <COAMastLookupModal
          isOpen={acctLookupModalOpen}
          title="Select Account Code"
          customParam="REQ_BUDGET"
          onClose={handleCloseAccountLookup}
        />
      )}

      {budgetItemLookupModalOpen && (
        <SearchBudItemRef
          isOpen={budgetItemLookupModalOpen}
          title="Search Budget Codes"
          activeOnly={true}
          groupOnly={false}
          onClose={handleCloseBudgetItemLookup}
        />
      )}

      {showCancelModal && (
        <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />
      )}

      {showPostModal && (
        <PostTranModal isOpen={showPostModal} onClose={handleClosePost} />
      )}

      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: documentID,
            DocumentName: documentName,
            DocumentNo: documentNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}

      {showSignatoryModal && (
        <DocumentSignatories
          isOpen={showSignatoryModal}
          params={{ noReprints, documentID, docType }}
          onClose={handleCloseSignatory}
          onCancel={() => updateState({ showSignatoryModal: false })}
        />
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{branchCode,branchName,docType,documentTitle,fieldNo : "documentNo"}}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      
    </div>
  );
};

export default BUDBB;
