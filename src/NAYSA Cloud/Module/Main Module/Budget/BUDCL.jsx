import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

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
import { postRequest } from "../../../Configuration/BaseURL.jsx";
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
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
  useFetchTranData,
  useTransactionUpsert,
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
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const DEC_AMT = 2;

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
    "": "PENDING",
    P: "PENDING",
    PENDING: "PENDING",
    O: "OPEN",
    OPEN: "OPEN",
    C: "CLOSED",
    CLOSED: "CLOSED",
    X: "CANCELLED",
    CANCELLED: "CANCELLED",
    POSTED: "OPEN",
    FINALIZED: "OPEN",
  };

  return map[raw] || raw || "PENDING";
};

const getStatusCode = (status) => {
  const raw = String(status ?? "").trim().toUpperCase();

  const map = {
    "": "P",
    P: "P",
    PENDING: "P",
    OPEN: "O",
    CLOSED: "C",
    CANCELLED: "X",
    FINALIZED: "O",
    POSTED: "O",
  };

  return map[raw] ?? raw;
};

const getCurrentYear = () => String(new Date().getFullYear());

const isLockedStatus = (status) =>
  ["OPEN", "CLOSED", "CANCELLED"].includes(getFullStatus(status));

const toDateValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const normalized = raw.includes("T") ? raw.split("T")[0] : raw;
  let parsed = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (parsed) {
    const [, year, month, day] = parsed;
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }

  parsed = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parsed) {
    const [, month, day, year] = parsed;
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  const year = local.getFullYear();
  return `${month}/${day}/${year}`;
};

const parseDateValue = (value) => {
  const normalized = toDateValue(value);
  if (!normalized) return null;

  const [month, day, year] = normalized.split("/").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDaysToDateValue = (value, days = 1) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "";

  const nextDate = new Date(parsed);
  nextDate.setDate(nextDate.getDate() + days);

  const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
  const dd = String(nextDate.getDate()).padStart(2, "0");
  const yyyy = nextDate.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const isBeforeDateValue = (left, right) => {
  const leftDate = parseDateValue(left);
  const rightDate = parseDateValue(right);

  if (!leftDate || !rightDate) return false;
  return leftDate.getTime() < rightDate.getTime();
};


const BUDCL = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const location = useLocation();

  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth();
  const { resetFlag } = useReset();

  const docType = docTypes?.BUDCL || "BUDCL";
  const hsDoc = getAllTopHSDocRow(docType) || {};
  const decAmt = companyInfo?.amtDec || companyInfo?.amountDec || DEC_AMT;

  const [isViewDocument, setIsViewDocument] = useState(false);
  const [topTab, setTopTab] = useState("details");

  const [state, setState] = useState({
    documentName: hsDoc?.docName || "Budget Clearance",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
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

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    budclDate: useGetCurrentDayV2(),
    budgetCode: "",
    budgetName: "",
    refDocNo: "",
    refDocDate: "",
    expiryDate: addDaysToDateValue(useGetCurrentDayV2(), 1),
    processBy: "",
    processDate: "",
    processTime: "",
    ytdBudgetAmount: "0.00",
    totalClearanceAmount: "0.00",

    remarks: "",
    noReprints: "0",
    userCode: "",

    detailRows: [],
    detailRowsApp: [],
    tblFieldArray: [],
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

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    documentName,
    documentID,
    documentStatus,
    documentNo,
    status,
    activeTab,
    isLoading,
    showSpinner,
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    branchCode,
    branchName,
    budclDate,
    budgetCode,
    budgetName,
    refDocNo,
    refDocDate,
    expiryDate,
    processBy,
    processDate,
    processTime,
    ytdBudgetAmount,
    totalClearanceAmount,
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
  } = state;

  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle = `${hsDoc?.docName || "Budget Clearance"} Transaction`;
  const displayStatus = getFullStatus(status || documentStatus);

  const statusMap = {
    OPEN: "global-tran-stat-text-finalized-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = statusMap[displayStatus] || "";
  const isDocumentLocked = isViewDocument || isLockedStatus(displayStatus);
  const isFormDisabled = isDocumentLocked;

  const getMax = (col) => useGetFieldLength(tblFieldArray, col) || 100;

  const detailColumnDefs = [
    { key: "ln", label: "LN", width: 56, type: "ln" },
    { key: "rcCode", label: "RC Code", width: 120, type: "lookup", lookupType: "rc" },
    { key: "rcName", label: "RC Name", width: 220, readOnly: true },
    { key: "acctCode", label: "Account Code", width: 140, type: "lookup", lookupType: "acct" },
    { key: "acctName", label: "Account Name", width: 260, readOnly: true },
    { key: "beginningAmount", label: "Beginning Amount", width: 160, type: "amount" },
    { key: "clearanceAmount", label: "Clearance Amount", width: 160, type: "amount" },
    { key: "endingAmount", label: "Ending Amount", width: 150, type: "amount", readOnly: true },
    { key: "remarks", label: "Remarks", width: 240, type: "remarks" },
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
  } = useResizableTableColumns(detailColumnDefs);

  const orderedDetailColumns = getOrderedColumns(detailColumnDefs);
  const getDetailFallbackWidth = (key) =>
    detailColumnDefs.find((column) => column.key === key)?.width || 120;

  const getDetailCellStyle = (key, fallbackWidth) => ({
    ...getColumnStyle(key, fallbackWidth),
    ...getFrozenColumnStyle(key, orderedDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedDetailRows = getSortedRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "")
  );

  const recalcRow = (row = {}) => {
    const beginningAmount = parseFormattedNumber(row.beginningAmount || 0) || 0;
    const clearanceAmount = parseFormattedNumber(row.clearanceAmount || 0) || 0;
    const endingAmount = beginningAmount - clearanceAmount;

    return {
      ...row,
      beginningAmount: formatNumber(beginningAmount, decAmt),
      clearanceAmount: formatNumber(clearanceAmount, decAmt),
      endingAmount: formatNumber(endingAmount, decAmt),
    };
  };

  const recalcTotals = (rows = []) => {
    let ytdAmount = 0;
    let clearanceAmount = 0;

    (rows || []).forEach((row) => {
      ytdAmount += parseFormattedNumber(row.beginningAmount || 0) || 0;
      clearanceAmount += parseFormattedNumber(row.clearanceAmount || 0) || 0;
    });

    updateState({
      ytdBudgetAmount: formatNumber(ytdAmount, decAmt),
      totalClearanceAmount: formatNumber(clearanceAmount, decAmt),
    });
  };

  const createBlankRow = () =>
    recalcRow({
      rcCode: "",
      rcName: "",
      acctCode: "",
      acctName: "",
      beginningAmount: "0.00",
      clearanceAmount: "0.00",
      endingAmount: "0.00",
      remarks: "",
    });

  const mapFetchedRow = (item = {}) => ({
    rcCode: item.rcCode || item.rc_code || "",
    rcName: item.rcName || item.rc_name || "",
    acctCode: item.acctCode || item.acct_code || "",
    acctName: item.acctName || item.acct_name || "",
    beginningAmount: formatNumber(item.beginningAmount ?? item.beginning_amount ?? 0, decAmt),
    clearanceAmount: formatNumber(item.clearanceAmount ?? item.clearance_amount ?? 0, decAmt),
    endingAmount: formatNumber(item.endingAmount ?? item.ending_amount ?? 0, decAmt),
    remarks: item.remarks || "",
  });

  const buildPayload = (rowsForSave = []) => {
    const ytdAmount = rowsForSave.reduce((sum, row) => sum + (parseFormattedNumber(row.beginningAmount || 0) || 0), 0);
    const totalClearance = rowsForSave.reduce((sum, row) => sum + (parseFormattedNumber(row.clearanceAmount || 0) || 0), 0);

    return {
      branchCode: branchCode || "",
      branchName: branchName || "",
      documentNo: documentNo || "",
      documentID: documentID || "",
      budclNo: documentNo || "",
      budclDate: budclDate || useGetCurrentDayV2(),
      budgetCode: budgetCode || "",
      budgetName: budgetName || "",
      refDocNo: refDocNo || "",
      refDocDate: refDocDate || null,
      expiryDate: expiryDate || null,
      processBy: processBy || "",
      processDate: processDate || null,
      processTime: processTime || "",
      ytdBudgetAmount: ytdAmount,
      totalClearanceAmount: totalClearance,
      remarks: remarks || "",
      status: documentStatus || status || "",
      userCode: currentUserRow?.userCode || "",

      dt1: rowsForSave.map((row, index) => ({
        documentID: documentID || "",
        budclNo: documentNo || "",
        lnNo: index + 1,
        lineNo: index + 1,
        branchCode: branchCode || "",
        rcCode: row.rcCode || "",
        rcName: row.rcName || "",
        acctCode: row.acctCode || "",
        acctName: row.acctName || "",
        beginningAmount: parseFormattedNumber(row.beginningAmount || 0) || 0,
        clearanceAmount: parseFormattedNumber(row.clearanceAmount || 0) || 0,
        endingAmount: parseFormattedNumber(row.endingAmount || 0) || 0,
        remarks: row.remarks || "",
      })),
    };
  };


  const setDetailRows = (rows = []) => {
    const normalizedRows = (rows || []).map((row) => recalcRow(row));
    detailRowsRef.current = normalizedRows;
    updateState({ detailRows: normalizedRows });
    recalcTotals(normalizedRows);
  };

  const setDetailRowsWithoutNormalize = (rows = []) => {
    detailRowsRef.current = rows;
    updateState({ detailRows: rows });
    recalcTotals(rows);
  };

  const updateDetailRow = (rowIndex, updater, normalize = true) => {
    const nextRows = [...(detailRowsRef.current || detailRows || [])];
    const currentRow = { ...(nextRows[rowIndex] || {}) };
    nextRows[rowIndex] =
      typeof updater === "function" ? updater(currentRow) : { ...currentRow, ...updater };

    if (normalize) {
      setDetailRows(nextRows);
      return;
    }

    setDetailRowsWithoutNormalize(nextRows);
  };

  const getBudgetBalanceRow = async (row = {}) => {
    const selectedBranchCode = branchCode || currentUserRow?.branchCode || "";
    const selectedBudgetCode = budgetCode || "";
    const selectedRcCode = row.rcCode || "";
    const selectedAcctCode = row.acctCode || "";

    if (!selectedBudgetCode || !selectedRcCode || !selectedAcctCode) {
      return null;
    }

    const payload = {
      branchCode: selectedBranchCode,
      rcCode: selectedRcCode,
      acctCode: selectedAcctCode,
      budgetCode: selectedBudgetCode,
      docDate: budclDate || useGetCurrentDayV2(),
      docCode: docType,
      docId: documentID || "",
      positiveOnly: "N",
    };

    const response = await postRequest("getBUDCLBudgetBalance", {
      json_data: payload,
    });

    const rawResult =
      response?.data?.data?.[0]?.result ??
      response?.data?.[0]?.result ??
      response?.data?.result ??
      response?.data?.data ??
      response?.data ??
      [];

    const parsedResult =
      typeof rawResult === "string"
        ? JSON.parse(rawResult || "[]")
        : rawResult;

    const balanceRow = Array.isArray(parsedResult)
      ? parsedResult[0] || null
      : parsedResult;

    return balanceRow || null;
  };

  const applyBudgetBalanceToRow = async (rowIndex, overrides = {}) => {
    if (isFormDisabled) return;

    const baseRows = detailRowsRef.current || detailRows || [];
    const currentRow = {
      ...(baseRows[rowIndex] || {}),
      ...overrides,
    };

    const selectedBudgetCode = budgetCode || "";
    const selectedRcCode = currentRow.rcCode || "";
    const selectedAcctCode = currentRow.acctCode || "";

    if (!selectedBudgetCode || !selectedRcCode || !selectedAcctCode) {
      updateDetailRow(rowIndex, currentRow);
      return;
    }

    updateState({ isLoading: true, showSpinner: true });

    try {
      const balanceRow = await getBudgetBalanceRow(currentRow);

      if (!balanceRow) {
        updateDetailRow(rowIndex, {
          ...currentRow,
          beginningAmount: formatNumber(0, decAmt),
          clearanceAmount: formatNumber(0, decAmt),
          endingAmount: formatNumber(0, decAmt),
        });

        useSwalInfoAlert(
          "No Budget Balance",
          "No available budget balance found for the selected Budget Code, RC, and Account."
        );
        return;
      }

      const errorMessage = String(
        balanceRow.errorMsg ||
          balanceRow.restrictionMessage ||
          balanceRow.message ||
          ""
      ).trim();

      const errorCount = Number(balanceRow.errorCount || 0);
      const isRestricted = String(balanceRow.isRestricted || "").toUpperCase() === "Y";

      if (errorCount > 0 || isRestricted) {
        updateDetailRow(rowIndex, {
          ...currentRow,
          rcName: currentRow.rcName || balanceRow.rcName || "",
          acctName: currentRow.acctName || balanceRow.acctName || "",
          beginningAmount: formatNumber(0, decAmt),
          clearanceAmount: formatNumber(0, decAmt),
          endingAmount: formatNumber(0, decAmt),
        });

        useSwalErrorAlert(
          "Budget Balance Restricted",
          errorMessage || "Selected Budget Code, RC, and Account has an open transaction that may affect the YTD balance."
        );
        return;
      }

      const beginningAmount =
        parseFormattedNumber(
          balanceRow.beginningAmount ??
            balanceRow.temporaryOpenBalance ??
            balanceRow.budgetBalance ??
            balanceRow.availableBudgetAmount ??
            0
        ) || 0;

      updateDetailRow(rowIndex, {
        ...currentRow,
        rcName: currentRow.rcName || balanceRow.rcName || "",
        acctName: currentRow.acctName || balanceRow.acctName || "",
        beginningAmount: formatNumber(beginningAmount, decAmt),
        clearanceAmount: formatNumber(0, decAmt),
        endingAmount: formatNumber(beginningAmount, decAmt),
      });
    } catch (error) {
      console.error("Error fetching BUDCL budget balance:", error);
      useSwalErrorAlert(
        "Budget Balance Error",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to fetch budget balance."
      );
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleInsertBlankRow = (index = null) => {
    if (isFormDisabled) return;

    const requiredValid = useSwalvalidateRequiredFields(
      {
        "Budget Code": budgetCode,
        "Expiry Date": expiryDate,
      },
      "Budget Clearance"
    );

    if (!requiredValid) return;

    const currentRows = [...(detailRowsRef.current || detailRows || [])];
    const insertIndex = Number.isInteger(index) ? index + 1 : currentRows.length;

    currentRows.splice(insertIndex, 0, createBlankRow());
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

  const handleDetailRowChange = (index, field, value, commit = false) => {
    updateDetailRow(index, (row) => {
      if (["beginningAmount", "clearanceAmount", "endingAmount"].includes(field)) {
        if (field === "clearanceAmount") {
          const rawValue = String(value ?? "");
          const sanitizedValue = sanitizeNumeric(rawValue).replace(/-/g, "");
          const beginningAmount = parseFormattedNumber(row.beginningAmount || 0) || 0;
          const parsedValue = parseFormattedNumber(sanitizedValue || 0) || 0;

          if (!commit) {
            return {
              ...row,
              clearanceAmount: sanitizedValue,
              endingAmount:
                sanitizedValue === "" || parsedValue <= 0
                  ? formatNumber(beginningAmount, decAmt)
                  : formatNumber(beginningAmount - parsedValue, decAmt),
            };
          }

          if (parsedValue <= 0) {
            return {
              ...row,
              clearanceAmount: "",
              endingAmount: formatNumber(beginningAmount, decAmt),
            };
          }

          if (parsedValue > beginningAmount) {
            useSwalErrorAlert(
              "Validation Error",
              "Clearance Amount cannot exceed Beginning Amount."
            );
            return recalcRow({ ...row, [field]: beginningAmount });
          }

          return recalcRow({ ...row, [field]: parsedValue });
        }

        const nextValue = commit
          ? formatNumber(parseFormattedNumber(value || 0) || 0, decAmt)
          : sanitizeNumeric(value);

        return { ...row, [field]: nextValue };
      }

      return { ...row, [field]: value };
    }, field === "clearanceAmount" ? commit : true);
  };

  const openHeaderLookup = (type) => {
    if (isFormDisabled) return;

    updateState({
      lookupContext: type,
      selectedRowIndex: null,
      branchModalOpen: type === "headerBranch",
      budgetItemLookupModalOpen: type === "headerBudgetItem",
    });
  };

  const openRowLookup = (type, rowIndex) => {
    if (isFormDisabled) return;

    updateState({
      lookupContext: type,
      selectedRowIndex: rowIndex,
      branchModalOpen: type === "branch" || type === "branchRef",
      rcLookupModalOpen: type === "rc",
      acctLookupModalOpen: type === "acct",
      budgetItemLookupModalOpen: type === "budgetItem",
    });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      const nextCode = selectedBranch.branchCode || selectedBranch.code || "";
      const nextName = selectedBranch.branchName || selectedBranch.description || "";

      if (lookupContext === "headerBranch") {
        updateState({
          branchCode: nextCode,
          branchName: nextName,
        });
      }

      if (lookupContext === "branch" && selectedRowIndex != null) {
        updateDetailRow(selectedRowIndex, {
          branchCode: nextCode,
          branchName: nextName,
        });
      }

      if (lookupContext === "branchRef" && selectedRowIndex != null) {
        updateDetailRow(selectedRowIndex, {
          branchRef: nextCode,
          branchRefName: nextName,
        });
      }
    }

    updateState({
      branchModalOpen: false,
      selectedRowIndex: null,
      lookupContext: "",
    });
  };

  const handleCloseRCModal = async (selectedRC) => {
    const rowIndex = selectedRowIndex;
    const shouldApplyBalance = selectedRC && lookupContext === "rc" && rowIndex != null;

    if (shouldApplyBalance) {
      await applyBudgetBalanceToRow(rowIndex, {
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

  const handleCloseAccountLookup = async (selectedAccount) => {
    const rowIndex = selectedRowIndex;
    const shouldApplyBalance = selectedAccount && lookupContext === "acct" && rowIndex != null;

    if (shouldApplyBalance) {
      await applyBudgetBalanceToRow(rowIndex, {
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
    if (selectedBudget) {
      if (lookupContext === "headerBudgetItem") {
        const clearedRows = (detailRowsRef.current || detailRows || []).map((row) =>
          recalcRow({
            ...row,
            beginningAmount: "0.00",
            clearanceAmount: "0.00",
            endingAmount: "0.00",
          })
        );

        detailRowsRef.current = clearedRows;

        updateState({
          budgetCode: selectedBudget.code || "",
          budgetName: selectedBudget.description || "",
          detailRows: clearedRows,
        });

        recalcTotals(clearedRows);
      }

      if (lookupContext === "budgetItem" && selectedRowIndex != null) {
        updateDetailRow(selectedRowIndex, {
          budgetCode: selectedBudget.code || "",
          budgetName: selectedBudget.description || "",
        });
      }
    }

    updateState({
      budgetItemLookupModalOpen: false,
      selectedRowIndex: null,
      lookupContext: "",
    });
  };

  const handleRemarksCell = (index, _field, value) => {
    handleDetailRowChange(index, "remarks", value);
  };

  const focusDetailCell = (field, nextIndex) => {
    const nextEl = document.getElementById(`${field}-${nextIndex}`);

    if (nextEl) {
      nextEl.focus();
      if (typeof nextEl.select === "function") nextEl.select();
    }
  };

  const renderDetailCell = (column, row, index) => {
    const columnKey = column.key;
    const columnWidth = getDetailFallbackWidth(columnKey);
    const style = getDetailCellStyle(columnKey, columnWidth);

    const focusNextDetailCell = (field) => {
      focusNextRowInput(index, field, {
        rows: detailRowsRef.current || detailRows,
        zeroClearFields: ["beginningAmount", "clearanceAmount"],
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, val) =>
          handleDetailRowChange(nextIndex, nextField, val, false),
      });
    };

    const handleGridKeyDown = (e, field, options = {}) => {
      if (options.readOnly || options.disabled || isFormDisabled) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (options.commitOnEnter) {
          handleDetailRowChange(index, field, e.target.value, true);
        }
        focusNextDetailCell(field);
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();

      if (e.key === "ArrowUp") focusDetailCell(field, Math.max(0, index - 1));
      if (e.key === "ArrowDown") {
        focusDetailCell(field, Math.min((detailRowsRef.current || detailRows).length - 1, index + 1));
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const editableColumns = orderedDetailColumns
          .map((item) => item.key)
          .filter((key) => !["ln", "branchCode", "branchRef", "rcCode", "rcName", "acctCode", "acctName", "budgetCode", "budgetName"].includes(key));

        const currentColIndex = editableColumns.indexOf(field);
        const nextColIndex =
          e.key === "ArrowLeft"
            ? Math.max(0, currentColIndex - 1)
            : Math.min(editableColumns.length - 1, currentColIndex + 1);

        if (nextColIndex >= 0) focusDetailCell(editableColumns[nextColIndex], index);
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
        onChange={(e) => handleDetailRowChange(index, field, e.target.value, false)}
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

    const amountInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={row[field] || ""}
        readOnly={isFormDisabled || options.readOnly}
        disabled={false}
        onChange={(e) => {
          const nextValue = sanitizeNumeric(e.target.value);
          if (/^-?\d*\.?\d*$/.test(nextValue) || nextValue === "") {
            handleDetailRowChange(index, field, nextValue, false);
          }
        }}
        onFocus={(e) =>
          clearZeroValueOnFocus(e, {
            isEditable: !(isFormDisabled || options.readOnly),
            onClear: (val) => handleDetailRowChange(index, field, val, false),
          })
        }
        onBlur={(e) => {
          if (isFormDisabled || options.readOnly) return;
          handleDetailRowChange(index, field, e.target.value, true);
        }}
        onKeyDown={(e) => handleGridKeyDown(e, field, { commitOnEnter: true, readOnly: options.readOnly })}
      />
    );

    if (column.type === "ln") {
      return (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          {index + 1}
        </td>
      );
    }

    if (column.type === "lookup") {
      return lookupInput(column.key, column.lookupType);
    }

    if (column.type === "amount") {
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          {amountInput(column.key, { readOnly: column.readOnly })}
        </td>
      );
    }

    if (column.type === "select") {
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <select
            id={`${column.key}-${index}`}
            className="w-full global-tran-td-inputclass-ui"
            value={row[column.key] || ""}
            disabled={isFormDisabled}
            onChange={(e) => handleDetailRowChange(index, column.key, e.target.value, true)}
            onKeyDown={(e) => handleGridKeyDown(e, column.key)}
          >
            {(column.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </td>
      );
    }

    if (column.type === "remarks") {
      return (
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
      );
    }

    return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        {textInput(column.key, { readOnly: column.readOnly, maxLength: column.maxLength })}
      </td>
    );
  };

  const validateRows = async (rows = []) => {
    if (!rows.length) {
      useSwalErrorAlert("Validation Error", "Please add at least one budget detail row.");
      return false;
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const lineNo = index + 1;

      const isValid = await useSwalvalidateRequiredFields(
        {
          [`Line ${lineNo}: RC Code`]: row.rcCode,
          [`Line ${lineNo}: Account Code`]: row.acctCode,
        },
        "Budget Clearance Details"
      );

      if (!isValid) return false;

      const beginning = parseFormattedNumber(row.beginningAmount || 0) || 0;
      const clearance = parseFormattedNumber(row.clearanceAmount || 0) || 0;

      if (clearance <= 0) {
        useSwalErrorAlert("Validation Error", `Line ${lineNo}: Clearance Amount must be greater than zero.`);
        return false;
      }

      if (clearance > beginning) {
        useSwalErrorAlert("Validation Error", `Line ${lineNo}: Clearance Amount cannot exceed Beginning Amount.`);
        return false;
      }
    }


    return true;
  };

  const handleActivityOption = async () => {
    if (isFormDisabled) return;

    const rowsForSave = (detailRowsRef.current || detailRows || []).map((row) => recalcRow(row));

    const headerValid = await useSwalvalidateRequiredFields(
      {
        "Branch Code": branchCode,
        "Budget Clearance Date": budclDate,
        "Budget Code": budgetCode,
      },
      "Budget Clearance"
    );

    if (!headerValid) return;

    const detailValid = await validateRows(rowsForSave);
    if (!detailValid) return;

    updateState({ isLoading: true, showSpinner: true });

    try {
      const budclData = buildPayload(rowsForSave);

      const response = await useTransactionUpsert(
        docType,
        budclData,
        updateState,
        "budclId",
        "budclNo"
      );

      if (response) {
        const responseDocNo = response?.data?.[0]?.budclNo || documentNo;
        const responseDocId = response?.data?.[0]?.budclId || documentID;

        await fetchTranData(responseDocNo, branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
      }

      updateState({ isDocNoDisabled: true, isFetchDisabled: true });
    } catch (error) {
      console.error("Error during transaction upsert:", error);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetFetchState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "P",
        status: "P",
        originalDocStatus: "P",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });

      setDetailRows([]);
    };

    updateState({ isLoading: true, showSpinner: true });

    try {
      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "budclNo",
        direction
      );

      if (!data?.budclId && !data?.budclNo) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        resetFetchState();
        return;
      }

      const detailRowsFromFetch = (data.dt1 || []).map((item) =>
        recalcRow(mapFetchedRow(item))
      );

      setDetailRows(detailRowsFromFetch);

      const documentStatus = getStatusCode(data.status || data.budclStatus);
      const fetchedBudclDate =
        useformatToDatev2(data.budclDate || data.docDate) ||
        toDateValue(data.budclDate || data.docDate) ||
        useGetCurrentDayV2();

      const fetchedExpiryDate =
        useformatToDatev2(data.expiryDate) ||
        toDateValue(data.expiryDate) ||
        addDaysToDateValue(fetchedBudclDate, 1);

      updateState({
        documentStatus,
        status: documentStatus,
        originalDocStatus: documentStatus,
        appLevel: data.appLevel || 0,

        documentID: data.budclId || "",
        documentNo: data.budclNo || "",

        branchCode: data.branchCode || "",
        branchName: data.branchName || "",
        budclDate: fetchedBudclDate,
        budgetCode: data.budgetCode || "",
        budgetName: data.budgetName || "",
        refDocNo: data.refDocNo || "",
        refDocDate: useformatToDatev2(data.refDocDate) || toDateValue(data.refDocDate),
        expiryDate: isBeforeDateValue(fetchedExpiryDate, fetchedBudclDate)
          ? addDaysToDateValue(fetchedBudclDate, 1)
          : fetchedExpiryDate,
        processBy: data.processBy || "",
        processDate: useformatToDatev2(data.processDate) || toDateValue(data.processDate),
        processTime: data.processTime || "",
        ytdBudgetAmount: formatNumber(data.ytdBudgetAmount ?? 0, decAmt),
        totalClearanceAmount: formatNumber(data.totalClearanceAmount ?? 0, decAmt),

        remarks: data.remarks || "",
        noReprints: data.noReprints ?? "0",
        detailRowsApp: Array.isArray(data.dtApp) ? data.dtApp : data.dtApp ? [data.dtApp] : [],

        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("Error fetching Budget Clearance:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error?.message || "Unable to fetch Budget Clearance.",
      });
      resetFetchState();
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleReset = () => {
    clearAllSorting();

    const today = useGetCurrentDayV2();
    const defaultBranchCode = currentUserRow?.branchCode || "";
    const defaultBranchName = currentUserRow?.branchName || "";

    updateState({
      documentID: "",
      documentNo: "",
      documentStatus: "P",
      status: "P",
      originalDocStatus: "P",
      appLevel: 0,
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,

      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      budclDate: today,
      budgetCode: "",
      budgetName: "",
      refDocNo: "",
      refDocDate: "",
      expiryDate: addDaysToDateValue(today, 1),
      processBy: "",
      processDate: "",
      processTime: "",
      ytdBudgetAmount: "0.00",
      totalClearanceAmount: "0.00",

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
      const hdtblcolResult = await useFieldLenghtCheck("budcl_hd,budcl_dt1");

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
    if (documentID && getStatusCode(documentStatus || status) === "P") {
      updateState({ showCancelModal: true });
    }
  };

  const handlePost = async () => {
    if (documentID && getStatusCode(documentStatus || status) === "P") {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (!detailRows.length) return;

    const copiedRows = (detailRows || []).map((row) => recalcRow({ ...row }));
    detailRowsRef.current = copiedRows;

    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "P",
      status: "P",
      originalDocStatus: "P",
      budclDate: useGetCurrentDayV2(),
      expiryDate: addDaysToDateValue(useGetCurrentDayV2(), 1),
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
        await fetchTranData(documentNo, state.branchCode);
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
          useSwalSuccessAlert("Success", "Posting Completed");
          await fetchTranData(documentNo, state.branchCode);
        }
      } catch (error) {
        useSwalErrorAlert("Posting Error", error?.message || "Unable to post transaction.");
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
      const docNo = row?.docNo || row?.documentNo || row?.budclNo;
      const branchCode = row?.branchCode || state.branchCode || "";
      if (!docNo) return;

      await fetchTranData(docNo, branchCode);
      setTopTab("details");
      cleanUrl();
    },
    [cleanUrl, state.branchCode]
  );

  const handleTranDocNoRetrieval = async (data = {}) => {
    const selectedDocNo =
      data.docNo ||
      data.documentNo ||
      state.documentNo ||
      documentNo ||
      "";

    const selectedBranchCode =
      data.branchCode ||
      state.branchCode ||
      "";

    const direction =
      data.key ||
      data.direction ||
      data.action ||
      "";

    await fetchTranData(selectedDocNo, selectedBranchCode, direction);

    updateState({
      showAllTranDocNo: data.modalClose ?? false,
    });
  };

  const handleTranDocNoSelection = async (data = {}) => {
    const selectedDocNo = data.docNo || data.documentNo || "";
    const selectedBranchCode = data.branchCode || state.branchCode || "";

    handleReset();

    updateState({
      showAllTranDocNo: false,
      documentNo: selectedDocNo,
    });

    if (selectedDocNo) {
      await fetchTranData(selectedDocNo, selectedBranchCode);
    }
  };

  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const printData = {
    doc_no: documentNo,
    branch: state.branchCode,
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
    const branchCode = params.get("branchCode") || state.branchCode || "";

    if (!loadedFromUrlRef.current && docNo) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick, state.branchCode]);

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

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={BUDCL}
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
          detailsRoute="/page/BUDCL"
          isSaveDisabled={isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) === 0)}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus !== "PENDING"}
          isNotifyDisabled
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
            <div>
              <p className="global-tran-headerstat-text-ui">
                Clearance Status
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
            className="grid grid-cols-1 gap-4 rounded-lg relative"
            id="budcl_hd"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  placeholder="Branch"
                  type="lookup"
                  value={branchName || branchCode || ""}
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  readOnly
                  lookupDisabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  onLookup={() =>
                    !(state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled) &&
                    openHeaderLookup("headerBranch")
                  }
                />

                <FieldRenderer
                  id="docNo"
                  label="BUDCL No."
                  placeholder="BUDCL No."
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
                      if (!(state.isDocNoDisabled || isFormDisabled)) handleDocNoBlur();
                      e.preventDefault();
                      document.getElementById("budclDate")?.focus();
                    }}
                  }
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="budclDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={budclDate || ""}
                      disabled={isFormDisabled}
                      updateState={(next) => {
                        const nextBudclDate = toDateValue(next.budclDate ?? next.value ?? next);
                        if (!nextBudclDate) return;

                        updateState({
                          budclDate: nextBudclDate,
                          expiryDate: addDaysToDateValue(nextBudclDate, 1),
                        });
                      }}
                    />
                  </div>
                  <label htmlFor="budclDate" className="global-ref-floating-label global-ref-label-enabled">
                    BUDCL Date
                  </label>
                </div>
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="budgetCode"
                  label="Budget Code"
                  required
                  type="lookup"
                  value={budgetCode || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && openHeaderLookup("headerBudgetItem")}
                />

                <FieldRenderer
                  id="budgetName"
                  label="Budget Name"
                  required
                  type="text"
                  value={budgetName || ""}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="tranType"
                  label="Tran Type"
                  placeholder="Tran Type"
                  type="text"
                  value="Budget Clearance"
                  disabled
                  readOnly
                />
              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="refDocNo"
                  label="Reference Document No."
                  type="text"
                  value={refDocNo || ""}
                  disabled={isFormDisabled}
                  maxLength={getMax("REF_DOC_NO")}
                  onChange={(val) => updateState({ refDocNo: val })}
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="refDocDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={refDocDate || ""}
                      disabled={isFormDisabled}
                      updateState={(next) => updateState({ refDocDate: next.refDocDate ?? next.value ?? next })}
                    />
                  </div>
                  <label htmlFor="refDocDate" className="global-ref-floating-label global-ref-label-enabled">
                    Reference Document Date
                  </label>
                </div>

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="expiryDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={expiryDate || ""}
                      disabled={isFormDisabled}
                      updateState={(next) => {
                        const nextExpiryDate = toDateValue(next.expiryDate ?? next.value ?? next);
                        if (!nextExpiryDate) return;

                        if (isBeforeDateValue(nextExpiryDate, budclDate)) {
                          updateState({ expiryDate: addDaysToDateValue(budclDate, 1) });
                          return;
                        }

                        updateState({ expiryDate: nextExpiryDate });
                      }}
                    />
                  </div>
                  <label htmlFor="expiryDate" className="global-ref-floating-label global-ref-label-enabled">
                    Expiry Date
                  </label>
                </div>
              </div>

              {/* Column 4 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="clearanceStatus"
                  label="Clearance Status"
                  type="select"
                  value={status || documentStatus || "P"}
                  disabled
                  readOnly
                  options={[
                    { value: "P", label: "Pending" },
                    { value: "O", label: "Open" },
                    { value: "C", label: "Closed" },
                    { value: "X", label: "Cancelled" },
                  ]}
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
                Budget Clearance Details
              </button>
            </div>

            <div className="flex justify-end" />
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedDetailColumns.map((column) =>
                      renderResizableHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedDetailColumns,
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
                  {sortedDetailRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedDetailColumns.map((column) =>
                        renderDetailCell(column, row, originalIndex)
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
              <button
                type="button"
                onClick={() => handleInsertBlankRow()}
                disabled={isFormDisabled}
                className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
              <div className="global-tran-tab-footer-total-label-ui">YTD Budget Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{ytdBudgetAmount}</div>
              <div className="global-tran-tab-footer-total-label-ui">Total Clearance Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totalClearanceAmount}</div>
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
          endpoint="/getBUDCLHistory"
          cacheKey={`BUDCL:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="BUDCL_Summary"
          branchCode={state.branchCode}
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
            BranchName: state.branchName,
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
          params={{ branchCode: state.branchCode, branchName: state.branchName, docType, documentTitle, fieldNo: "documentNo" }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default BUDCL;
