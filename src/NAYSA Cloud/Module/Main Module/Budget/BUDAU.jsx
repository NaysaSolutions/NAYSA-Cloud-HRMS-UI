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

const sanitizePositiveNumeric = (value) => {
  const raw = String(value ?? "");
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
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

const isLockedStatus = (status) =>
  ["FINALIZED", "CANCELLED", "CLOSED", "POSTED"].includes(getFullStatus(status));

const toDateValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};


const deriveCutoffCode = (dateValue = "") => {
  const normalizedDate = toDateValue(dateValue);
  if (!normalizedDate) return "";

  const match = normalizedDate.match(/^(\d{4})-(\d{2})-/);
  if (!match) return "";

  return `${match[1]}${match[2]}`;
};


const BUDAU = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const location = useLocation();

  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth();
  const { resetFlag } = useReset();

  const docType = docTypes?.BUDAU || "BUDAU";
  const hsDoc = getAllTopHSDocRow(docType) || {};
  const decAmt = companyInfo?.amtDec || companyInfo?.amountDec || DEC_AMT;

  const [isViewDocument, setIsViewDocument] = useState(false);
  const [topTab, setTopTab] = useState("details");

  const [state, setState] = useState({
    documentName: hsDoc?.docName || "Budget Augmentation",
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
    budauDate: useGetCurrentDayV2(),
    cutoffCode: deriveCutoffCode(useGetCurrentDayV2()),
    refNo: "",
    totalBudgetBalance: "0.00",
    totalAdjustmentAmount: "0.00",
    totalNewBudgetBalance: "0.00",

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
    budauDate,
    cutoffCode,
    refNo,
    totalBudgetBalance,
    totalAdjustmentAmount,
    totalNewBudgetBalance,
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
  const documentTitle = `${hsDoc?.docName || "Budget Augmentation"} Transaction`;
  const displayStatus = getFullStatus(status || documentStatus);

  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = statusMap[displayStatus] || "";
  const isDocumentLocked = isViewDocument || isLockedStatus(displayStatus);
  const isFormDisabled = isDocumentLocked;

  useEffect(() => {
    const nextCutoffCode = deriveCutoffCode(budauDate);
    if (nextCutoffCode !== cutoffCode) {
      updateState({ cutoffCode: nextCutoffCode });
    }
  }, [budauDate, cutoffCode]);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col) || 100;

  const detailColumnDefs = [
    { key: "ln", label: "LN", width: 56, type: "ln" },
    { key: "rcCode", label: "RC Code", width: 120, type: "lookup", lookupType: "rc" },
    { key: "rcName", label: "RC Name", width: 220, readOnly: true },
    { key: "acctCode", label: "Account Code", width: 140, type: "lookup", lookupType: "acct" },
    { key: "acctName", label: "Account Name", width: 260, readOnly: true },
    { key: "budgetCode", label: "Budget Code", width: 140, type: "lookup", lookupType: "budgetItem" },
    { key: "budgetName", label: "Budget Name", width: 260, readOnly: true },
    { key: "budgetBalance", label: "Budget Balance", width: 150, type: "amount" },
    { key: "adjustmentAmount", label: "Adjustment Amount", width: 170, type: "amount" },
    { key: "newBudgetBalance", label: "New Budget Balance", width: 170, type: "amount", readOnly: true },
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
    const budgetBalance = parseFormattedNumber(row.budgetBalance || 0) || 0;
    const adjustmentAmount = parseFormattedNumber(row.adjustmentAmount || 0) || 0;
    const newBudgetBalance = budgetBalance + adjustmentAmount;

    return {
      ...row,
      budgetBalance: formatNumber(budgetBalance, decAmt),
      adjustmentAmount: formatNumber(adjustmentAmount, decAmt),
      newBudgetBalance: formatNumber(newBudgetBalance, decAmt),
    };
  };

  const recalcTotals = (rows = []) => {
    let totalBalance = 0;
    let totalAdjustment = 0;
    let totalNewBalance = 0;

    (rows || []).forEach((row) => {
      totalBalance += parseFormattedNumber(row.budgetBalance || 0) || 0;
      totalAdjustment += parseFormattedNumber(row.adjustmentAmount || 0) || 0;
      totalNewBalance += parseFormattedNumber(row.newBudgetBalance || 0) || 0;
    });

    updateState({
      totalBudgetBalance: formatNumber(totalBalance, decAmt),
      totalAdjustmentAmount: formatNumber(totalAdjustment, decAmt),
      totalNewBudgetBalance: formatNumber(totalNewBalance, decAmt),
    });
  };

  const createBlankRow = () =>
    recalcRow({
      rcCode: "",
      rcName: "",
      acctCode: "",
      acctName: "",
      budgetCode: "",
      budgetName: "",
      budgetBalance: "0.00",
      adjustmentAmount: "0.00",
      newBudgetBalance: "0.00",
      remarks: "",
    });

  const mapFetchedRow = (item = {}) => ({
    rcCode: item.rcCode || "",
    rcName: item.rcName || "",
    acctCode: item.acctCode || "",
    acctName: item.acctName || "",
    budgetCode: item.budgetCode || "",
    budgetName: item.budgetName || "",
    budgetBalance: formatNumber(item.budgetBalance ?? 0, decAmt),
    adjustmentAmount: formatNumber(item.adjustmentAmount ?? 0, decAmt),
    newBudgetBalance: formatNumber(item.newBudgetBalance ?? 0, decAmt),
    remarks: item.remarks || "",
  });

  const buildPayload = (rowsForSave = []) => {
    const totalBudgetBalance = rowsForSave.reduce(
      (sum, row) => sum + (parseFormattedNumber(row.budgetBalance || 0) || 0),
      0
    );

    const totalAdjustmentAmount = rowsForSave.reduce(
      (sum, row) => sum + (parseFormattedNumber(row.adjustmentAmount || 0) || 0),
      0
    );

    const totalNewBudgetBalance = rowsForSave.reduce(
      (sum, row) => sum + (parseFormattedNumber(row.newBudgetBalance || 0) || 0),
      0
    );

    return {
      branchCode: branchCode || "",
      budauNo: documentNo || "",
      budauId: documentID || "",
      budauDate: budauDate || useGetCurrentDayV2(),
      cutoffCode: cutoffCode || "",
      refNo: refNo || "",
      totalBudgetBalance,
      totalAdjustmentAmount,
      totalNewBudgetBalance,
      remarks: remarks || "",
      status: documentStatus || status || "",
      userCode: currentUserRow?.userCode || "",

      dt1: rowsForSave.map((row, index) => ({
        lnNo: index + 1,
        branchCode: branchCode || "",
        cutoffCode: cutoffCode || "",
        rcCode: row.rcCode || "",
        rcName: row.rcName || "",
        acctCode: row.acctCode || "",
        acctName: row.acctName || "",
        budgetCode: row.budgetCode || "",
        budgetName: row.budgetName || "",
        budgetBalance: parseFormattedNumber(row.budgetBalance || 0) || 0,
        adjustmentAmount: parseFormattedNumber(row.adjustmentAmount || 0) || 0,
        newBudgetBalance: parseFormattedNumber(row.newBudgetBalance || 0) || 0,
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

  const handleInsertBlankRow = (index = null) => {
    if (isFormDisabled) return;

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
      if (field === "cutoffCode") {
        return {
          ...row,
          cutoffCode: String(value || "").replace(/[^0-9]/g, "").slice(0, 6),
        };
      }

      if (["budgetBalance", "adjustmentAmount", "newBudgetBalance"].includes(field)) {
        if (commit) {
          const nextValue = Math.max(parseFormattedNumber(value || 0) || 0, 0);
          return recalcRow({ ...row, [field]: nextValue });
        }

        const nextValue = sanitizePositiveNumeric(value);
        if (field === "adjustmentAmount") {
          return {
            ...row,
            adjustmentAmount: nextValue,
            newBudgetBalance:
              nextValue === ""
                ? row.newBudgetBalance
                : formatNumber(
                    (parseFormattedNumber(row.budgetBalance || 0) || 0) +
                      (parseFormattedNumber(nextValue || 0) || 0),
                    decAmt
                  ),
          };
        }

        return { ...row, [field]: nextValue };
      }

      return { ...row, [field]: value };
    }, commit);
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

  const handleCloseRCModal = (selectedRC) => {
    if (selectedRC && lookupContext === "rc" && selectedRowIndex != null) {
      updateDetailRow(selectedRowIndex, {
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
      updateDetailRow(selectedRowIndex, {
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
        updateState({
          budgetCode: selectedBudget.code || "",
          budgetName: selectedBudget.description || "",
        });
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
        zeroClearFields: ["budgetBalance", "adjustmentAmount"],
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
          const nextValue = sanitizePositiveNumeric(e.target.value);
          if (/^\d*\.?\d*$/.test(nextValue) || nextValue === "") {
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
          [`Line ${lineNo}: Budget Code`]: row.budgetCode,
        },
        "Budget Augmentation Details"
      );

      if (!isValid) return false;
    }


    return true;
  };

  const handleActivityOption = async () => {
    if (isFormDisabled) return;

    const rowsForSave = (detailRowsRef.current || detailRows || []).map((row) => recalcRow(row));

    const headerValid = await useSwalvalidateRequiredFields(
      {
        "Branch Code": branchCode,
        "Budget Augmentation Date": budauDate,
        "Cutoff": cutoffCode,
      },
      "Budget Augmentation"
    );

    if (!headerValid) return;

    if (!/^\d{6}$/.test(String(cutoffCode || ""))) {
      useSwalErrorAlert("Validation Error", "Cutoff must be in YYYYMM format.");
      return;
    }

    const detailValid = await validateRows(rowsForSave);
    if (!detailValid) return;

    if (documentStatus === "") {
      updateState({ isLoading: true, showSpinner: true });

      try {
        const budauData = buildPayload(rowsForSave);

        const response = await useTransactionUpsert(
          docType,
          budauData,
          updateState,
          "budauId",
          "budauNo"
        );

        if (response) {
          const responseDocNo = response.data[0].budauNo;
          const responseDocId = response.data[0].budauId;

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
    }
  };

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetFetchState = () => {
      updateState({
        documentNo: "",
        documentID: "",
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
        "budauNo",
        direction
      );

      if (!data?.budauId && !data?.budauNo) {
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

      const documentStatus = getStatusCode(data.status || data.budauStatus);

      updateState({
        documentStatus,
        status: documentStatus,
        originalDocStatus: documentStatus,
        appLevel: data.appLevel || 0,

        documentID: data.budauId || "",
        documentNo: data.budauNo || "",

        branchCode: data.branchCode || "",
        branchName: data.branchName || "",
        budauDate: useformatToDatev2(data.budauDate || data.docDate) || toDateValue(data.budauDate || data.docDate),
        cutoffCode: data.cutoffCode || "",
        refNo: data.refNo || "",
        totalBudgetBalance: formatNumber(data.totalBudgetBalance ?? 0, decAmt),
        totalAdjustmentAmount: formatNumber(data.totalAdjustmentAmount ?? 0, decAmt),
        totalNewBudgetBalance: formatNumber(data.totalNewBudgetBalance ?? 0, decAmt),

        remarks: data.remarks || "",
        noReprints: data.noReprints ?? "0",
        detailRowsApp: Array.isArray(data.dtApp) ? data.dtApp : data.dtApp ? [data.dtApp] : [],

        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("Error fetching Budget Augmentation:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error?.message || "Unable to fetch Budget Augmentation.",
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

      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      budauDate: today,
      cutoffCode: deriveCutoffCode(today),
      refNo: "",
      totalBudgetBalance: "0.00",
      totalAdjustmentAmount: "0.00",
      totalNewBudgetBalance: "0.00",

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
      const hdtblcolResult = await useFieldLenghtCheck("budau_hd,budau_dt1");

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

    const copiedRows = (detailRows || []).map((row) => recalcRow({ ...row }));
    detailRowsRef.current = copiedRows;

    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "",
      status: "",
      originalDocStatus: "",
      budauDate: useGetCurrentDayV2(),
      cutoffCode: deriveCutoffCode(useGetCurrentDayV2()),
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
          useSwalSuccessAlert("Success", "Finalize Completed");
          await fetchTranData(documentNo, state.branchCode);
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
      const docNo = row?.docNo || row?.documentNo || row?.budauNo;
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
          docType={BUDAU}
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
          detailsRoute="/page/BUDAU"
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

          <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
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
            className="grid grid-cols-1 gap-4 rounded-lg relative px-2"
            id="budau_hd"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 rounded-lg relative items-start">
              {/* Row 1: Branch | Reference No. | Blank */}
              <div className="w-full">
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
              </div>

              <div className="w-full">
                <FieldRenderer
                  id="refNo"
                  label="Reference No."
                  type="text"
                  value={refNo || ""}
                  disabled={isFormDisabled}
                  maxLength={getMax("REF_NO")}
                  onChange={(val) => updateState({ refNo: val })}
                />
              </div>

              <div className="hidden xl:block" />

              {/* Row 2: Doc No | Tran Type | Blank */}
              <div className="w-full">
                <FieldRenderer
                  id="docNo"
                  label="BUDAU No."
                  placeholder="BUDAU No."
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
                      document.getElementById("budauDate")?.focus();
                    }}
                  }
                />
              </div>

              <div className="w-full">
                <FieldRenderer
                  id="tranType"
                  label="Tran Type"
                  placeholder="Tran Type"
                  type="text"
                  value="Budget Augmentation"
                  disabled
                  readOnly
                />
              </div>

              <div className="hidden xl:block" />

              {/* Row 3: Doc Date | Blank | Blank */}
              <div className="relative w-full">
                <input type="hidden" id="cutoffCode" value={cutoffCode || ""} readOnly />
                <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput
                    id="budauDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={budauDate || ""}
                    disabled={isFormDisabled}
                    updateState={(next) => updateState({ budauDate: next.budauDate ?? next.value ?? next })}
                  />
                </div>
                <label htmlFor="budauDate" className="global-ref-floating-label global-ref-label-enabled">
                  BUDAU Date
                </label>
              </div>

              <div className="hidden md:block" />
              <div className="hidden xl:block" />

              <div className="md:col-span-2 xl:col-span-3 w-full">
                <div className="relative">
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
                Budget Augmentation Details
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
              <div className="global-tran-tab-footer-total-label-ui">Total Budget Balance:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totalBudgetBalance}</div>
              <div className="global-tran-tab-footer-total-label-ui">Total Adjustment Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totalAdjustmentAmount}</div>
              <div className="global-tran-tab-footer-total-label-ui">Total New Budget Balance:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totalNewBudgetBalance}</div>
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
          endpoint="/getBUDAUHistory"
          cacheKey={`BUDAU:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="BUDAU_Summary"
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
          customParam="NonGroup"
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

export default BUDAU;
