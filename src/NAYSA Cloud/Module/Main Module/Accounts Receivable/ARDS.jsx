import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { postRequest,fetchDataJson } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// Configuration
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopAccountRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import {
  useSelectedHSColConfig,
} from "@/NAYSA Cloud/Global/selectedData";

import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalvalidateRequiredFields,
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalInfoAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import Header from "@/NAYSA Cloud/Components/Header";

const ARDS = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const location = useLocation();
  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth();
  const { resetFlag } = useReset();
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [topTab, setTopTab] = useState("details");

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") setIsViewDocument(true);
  }, [location.search]);

  const docType = docTypes?.ARDS || "ARDS";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const documentTitle = hsDoc?.docName
    ? `${hsDoc.docName} Transaction`
    : docTypeNames?.[docType] || "AR DS Transaction";

  const [state, setState] = useState({
    documentName: hsDoc?.docName || "AR DS",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    documentDate: useGetCurrentDayV2(),
    status: "OPEN",
    noReprints: "0",

    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    userCode: currentUserRow?.userCode || "",

    tblFieldArray: [],
    bankCode: companyInfo?.depBankcode || "",
    bankName: companyInfo?.depositBankName || "",
    bankAcctNo: companyInfo?.depositBankAcctNo || "",
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",

    detailRows: [],
    globalLookupRow: [],
    globalLookupHeader: [],

    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    branchModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showBankMastModal: false,
    showAllTranDocNo: false,
    showCRDSOpenDetailModal: false,
  });

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));
  const toDateInputValue = (value) => {
    if (!value) return "";
    const raw = String(value).trim();
    return raw.split(/[T\s]/)[0];
  };

  const {
    documentName,
    documentID,
    documentStatus,
    documentNo,
    documentDate,
    status,
    noReprints,
    activeTab,
    isLoading,
    showSpinner,
    isDocNoDisabled,
    isFetchDisabled,
    branchCode,
    branchName,
    userCode,
    tblFieldArray,
    bankCode,
    bankName,
    bankAcctNo,
    refDocNo1,
    refDocNo2,
    remarks,
    detailRows,
    globalLookupRow,
    globalLookupHeader,
    selectedRowIndex,
    branchModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showBankMastModal,
    showAllTranDocNo,
    showCRDSOpenDetailModal,
  } = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  const displayStatus = status || "OPEN";
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[String(displayStatus || "").toUpperCase()] || "";
  const isFormDisabled =
    isViewDocument || ["FINALIZED", "CANCELLED", "CLOSED"].includes(String(displayStatus || "").toUpperCase());

  const ardsFieldLengths = {
    docNo: useGetFieldLength(tblFieldArray, "doc_no"),
    remarks: useGetFieldLength(tblFieldArray, "remarks"),
  };

  const ardsDetailColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "docCode", label: "Receipt Type", width: 130 },
    { key: "docNo", label: "Receipt No", width: 140 },
    { key: "docDate", label: "Receipt Date", width: 130 },
    { key: "custCode", label: "Customer Code", width: 130 },
    { key: "custName", label: "Customer Name", width: 260 },
    { key: "amount", label: "Amount", width: 130 },
    { key: "appliedAmount", label: "Applied", width: 150 },
    { key: "balance", label: "Balance", width: 130 },
    { key: "remarks", label: "Remarks", width: 260 },
    { key: "crId", label: "CR ID", width: 120 },
  ], []);

  // crId is kept in detailRows payload but hidden from the table.
  const visibleArdsDetailColumns = useMemo(
    () => ardsDetailColumnDefs.filter((column) => column.key !== "crId"),
    [ardsDetailColumnDefs]
  );

  const {
    getColumnStyle: getArdsDetailColumnStyle,
    getFrozenColumnStyle: getArdsDetailFrozenStyle,
    getOrderedColumns: getOrderedArdsDetailColumns,
    getSortedRows: getSortedArdsDetailRows,
    clearAllSorting: clearArdsDetailSorting,
    clearZeroValueOnFocus: clearArdsDetailZeroOnFocus,
    focusNextRowInput: focusNextArdsDetailRowInput,
    renderHeaderContextMenu: renderArdsDetailHeaderContextMenu,
    renderResizableHeader: renderArdsDetailHeader,
  } = useResizableTableColumns(visibleArdsDetailColumns);

  const orderedArdsDetailColumns = getOrderedArdsDetailColumns(visibleArdsDetailColumns);
  const getArdsDetailFallbackWidth = (key) =>
    visibleArdsDetailColumns.find((column) => column.key === key)?.width || 120;
  const getArdsDetailCellStyle = (key, fallbackWidth) => ({
    ...getArdsDetailColumnStyle(key, fallbackWidth),
    ...getArdsDetailFrozenStyle(key, orderedArdsDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedArdsDetailRows = getSortedArdsDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "")
  );

  const ardsDetailEnterNextRowZeroClearFields = ["amount", "appliedAmount", "balance"];

  const [totals, setTotals] = useState({
    totalAmount: "0.00",
    totalApplied: "0.00",
    totalBalance: "0.00",
  });

  const updateTotalsDisplay = (rows = []) => {
    let totalAmount = 0;
    let totalApplied = 0;
    let totalBalance = 0;

    rows.forEach((row) => {
      totalAmount += parseFormattedNumber(row.amount || 0) || 0;
      totalApplied += parseFormattedNumber(row.appliedAmount || 0) || 0;
      totalBalance += parseFormattedNumber(row.balance || 0) || 0;
    });

    setTotals({
      totalAmount: formatNumber(totalAmount),
      totalApplied: formatNumber(totalApplied),
      totalBalance: formatNumber(totalBalance),
    });
  };

  useEffect(() => {
    if (resetFlag) handleReset();
    const timer = isLoading
      ? setTimeout(() => updateState({ showSpinner: true }), 200)
      : (updateState({ showSpinner: false }), null);
    return () => timer && clearTimeout(timer);
  }, [resetFlag, isLoading]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    handleReset();
    loadCompanyData();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleReset = () => {
    clearArdsDetailSorting();
    updateState({
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",
      userCode: currentUserRow?.userCode || "",
      documentDate: useGetCurrentDayV2(),
      documentNo: "",
      documentID: "",
      documentStatus: "",
      status: "OPEN",
      noReprints: "0",
      bankCode: companyInfo?.depBankcode || "",
      bankName: companyInfo?.depositBankName || "",
      bankAcctNo: companyInfo?.depositBankAcctNo || "",
      refDocNo1: "",
      refDocNo2: "",
      remarks: "",
      detailRows: [],
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      selectedRowIndex: null,
      });
    updateTotalsDisplay([]);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const hdtblcol_result = await useFieldLenghtCheck("ards_hd,ards_dt1");
      if (hdtblcol_result) updateState({ tblFieldArray: hdtblcol_result });
    } catch (err) {
      console.error("Error fetching ARDS field lengths:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({ documentNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
      updateTotalsDisplay([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "ardsNo",
        direction
      );

      if (!data?.ardsId) {
        Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
        return resetState();
      }

      const retrievedDetailRows = (data.dt1 || []).map((item, index) => ({
        ...item,
        lnNo: item.lnNo || index + 1,
        docCode: item.docCode || item.receiptType || "",
        docNo: item.docNo || item.receiptNo || "",
        docDate: toDateInputValue(item.docDate),
        custCode: item.custCode || "",
        custName: item.custName || "",
        amount: formatNumber(item.amount ?? item.receiptAmount ?? 0),
        appliedAmount: formatNumber(item.appliedAmount ?? 0),
        balance: formatNumber(item.balance ?? 0),
        remarks: item.remarks || "",
        crId: item.cr_id || item.crId || item.crID || "",
      }));

      updateState({
        documentStatus: data.ardsStatus || data.status || "",
        status: data.docStatus || data.status || "OPEN",
        documentID: data.ardsId || "",
        documentNo: data.ardsNo || "",
        branchCode: data.branchCode || branchCode || "",
        branchName: data.branchName || branchName || "",
        documentDate: data.ardsDate ? useformatToDatev2(data.ardsDate) : "",
        bankCode: data.bankCode || data.depBankCode || "",
        bankName: data.bankName || data.depAcctName || "",
        bankAcctNo: data.bankAcctNo || data.depAcctNo || "",
        refDocNo1: data.refDocNo1 || "",
        refDocNo2: data.refDocNo2 || "",
        remarks: data.remarks || "",
        detailRows: retrievedDetailRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      updateTotalsDisplay(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching ARDS transaction data:", error);
      Swal.fire({ icon: "error", title: "Fetch Error", text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleDocNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleActivityOption = async (action) => {
    if ((detailRows?.length || 0) === 0) return;
    if (documentStatus !== "") return;

    updateState({ isLoading: true });

    try {
      const buildData = () => ({
        branchCode,
        ardsNo: documentNo || "",
        ardsId: documentID || "",
        ardsDate: documentDate,
        bankCode: bankCode || "",
        bankName: bankName || "",
        bankAcctNo: bankAcctNo || "",
        refDocNo1: refDocNo1 || "",
        refDocNo2: refDocNo2 || "",
        remarks: remarks || "",
        userCode,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          docCode: row.docCode || "",
          docNo: row.docNo || "",
          docDate: row.docDate || null,
          custCode: row.custCode || "",
          custName: row.custName || "",
          amount: parseFormattedNumber(row.amount || 0),
          appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
          balance: parseFormattedNumber(row.balance || 0),
          remarks: row.remarks || "",
          crId: row.crId || "",
        })),
      });

      if (action === "Upsert") {
        const response = await useTransactionUpsert(
          docType,
          buildData(),
          updateState,
          "ardsId",
          "ardsNo"
        );

        if (response) {
          const responseDocNo = response.data?.[0]?.ardsNo || "";
          const responseDocId = response.data?.[0]?.ardsId || "";

          if (responseDocNo) await fetchTranData(responseDocNo, branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

          updateState({
            documentNo: responseDocNo,
            documentID: responseDocId,
            isDocNoDisabled: true,
            isFetchDisabled: true,
          });
        }
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleAddRow = async () => {
    const fieldsToCheck = {
      "Header : Bank Name": bankName,
      "Header : Bank Account No": bankAcctNo,
    };
    const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Add Receipt Detail");
    if (!isValid) return;

    await handleOpenCRDSDetail();
  };

  const handleOpenCRDSDetail = async () => {
    try {
      updateState({ isLoading: true });

      
      const endpoint = "getCRDS_OpenDetail";
      const response = await fetchDataJson(endpoint, {
              bankCode: bankCode,
              branchCode: branchCode,
            });
      



      const resultText = response?.data?.[0]?.result || response?.data?.data?.[0]?.result || "[]";
      const openDetails = resultText ? JSON.parse(resultText) : [];
      const colConfig = await useSelectedHSColConfig(endpoint, userCode);

      if (!Array.isArray(openDetails) || openDetails.length === 0) {
        useSwalErrorAlert("Open CR DS Detail", "There are no open CR records for the selected bank.");
        updateState({ globalLookupRow: [], globalLookupHeader: [] });
        return;
      }

      updateState({
        globalLookupRow: openDetails,
        globalLookupHeader: colConfig || [],
        showCRDSOpenDetailModal: true,
      });
    } catch (error) {
      console.error("Failed to fetch Open CR DS Detail:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch Open CR DS Detail.",
      });
      updateState({ globalLookupRow: [], globalLookupHeader: [] });
    } finally {
      updateState({ isLoading: false });
    }
  };


  const handleCloseCRDSDetail = (payload) => {
  if (payload?.records?.length) {
    const existingCrIds = new Set(
      (detailRows || [])
        .map((row) => String(row.crId || "").trim().toUpperCase())
        .filter(Boolean)
    );

    const selectedCrIds = new Set();
    const duplicateReceipts = [];

    const selectedRows = payload.records.filter((entry) => {
      const crId = String(entry.crId || "").trim();
      const normalizedCrId = crId.toUpperCase();

      if (!normalizedCrId) return true;

      if (existingCrIds.has(normalizedCrId) || selectedCrIds.has(normalizedCrId)) {
        duplicateReceipts.push(
          `Receipt Type: ${entry.docType || "-"} | Receipt No: ${entry.docNo || "-"}`
        );
        return false;
      }

      selectedCrIds.add(normalizedCrId);
      return true;
    });

    if (duplicateReceipts.length) {
      useSwalErrorAlert(
        "Duplicate Receipt Detail",
        `Duplicate receipt detail is not allowed:\n${[...new Set(duplicateReceipts)].join("\n")}`
      );
    }

    const newRows = selectedRows.map((entry) => ({
      lnNo: "",
      docCode: entry.docType || "",
      docNo: entry.docNo || "",
      docDate: toDateInputValue(entry.docDate),
      custCode: entry.custCode || "",
      custName: entry.custName || "",
      amount: formatNumber(entry.amount || 0),
      appliedAmount: formatNumber(entry.appliedAmount || entry.amount || 0),
      balance: formatNumber(entry.balance || 0),
      remarks: entry.remarks || "",
      crId: entry.crId || "",
    }));

    if (newRows.length) {
      const updatedRows = [...(detailRows || []), ...newRows];
      updateState({ detailRows: updatedRows });
      updateTotalsDisplay(updatedRows);
    }
  }

  updateState({ showCRDSOpenDetailModal: false });
};




  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (documentID) updateState({ showSignatoryModal: true });
  };

  const handlePost = async () => {};

  const handleCancel = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (documentID && documentStatus === "") updateState({ showCancelModal: true });
  };

  const handleAttach = async () => {
    if (documentID) updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        documentDate: useGetCurrentDayV2(),
        noReprints: "0",
      });
    }
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const rowBranchCode = row?.branchCode;
      if (!docNo || !rowBranchCode) return;

      await fetchTranData(docNo, rowBranchCode);
      setTopTab("details");
      cleanUrl();
    },
    [fetchTranData, cleanUrl]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("ardsNo");
    const rowBranchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && rowBranchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode: rowBranchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandleCancel(docType, documentID, userCode, confirmation.password, confirmation.reason, updateState);
      if (result.success) useSwalSuccessAlert("Success", "Cancellation Completed");
      await fetchTranData(documentNo, branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleCloseSignatory = async (mode) => {
    updateState({ showSpinner: true, showSignatoryModal: false, noReprints: mode === "Final" ? 1 : 0 });
    await useHandlePrint(documentID, docType, mode, userCode);
    updateState({ showSpinner: false });
  };

  const handleSaveAndPrint = async (targetDocumentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(targetDocumentID, docType);
    updateState({ showSpinner: false });
  };

  const handleCloseBankMast = async (selectedBank) => {
    if (selectedBank) {
      const result = selectedBank?.acctCode ? await useTopAccountRow(selectedBank.acctCode) : null;
      updateState({
        bankCode: selectedBank.bankCode || "",
        bankName: result?.acctName || selectedBank.bankName || selectedBank.bankCode || "",
        bankAcctNo: selectedBank.bankAcctNo || "",
      });
    }
    updateState({ showBankMastModal: false });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode,
        branchName: selectedBranch.branchName,
      });
    }
    updateState({ branchModalOpen: false });
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
  };

  const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...(detailRowsRef.current || [])];
    const currentRow = updatedRows[index] || {};

    if (field === "appliedAmount") {
      const amount = parseFormattedNumber(currentRow.amount || 0) || 0;
      const applied = parseFormattedNumber(value || 0);

      if (!Number.isNaN(applied)) {
        if (applied < 0) {
          useSwalErrorAlert("Invalid Applied Amount", "Applied amount must not be negative.");
          return;
        }

        if (applied > amount) {
          useSwalErrorAlert("Invalid Applied Amount", "Applied amount must not exceed Amount.");
          return;
        }
      }
    }

    updatedRows[index] = {
      ...currentRow,
      [field]: value,
    };

    const row = updatedRows[index];

    if (["amount", "appliedAmount", "balance"].includes(field) && runCalculations) {
      row[field] = formatNumber(parseFormattedNumber(value || 0));
    }

    if (field === "appliedAmount") {
      const amount = parseFormattedNumber(row.amount || 0) || 0;
      const applied = parseFormattedNumber(row.appliedAmount || 0) || 0;
      row.balance = formatNumber(amount - applied);
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const renderArdsDetailCell = (columnKey, row, index) => {
    const columnWidth = getArdsDetailFallbackWidth(columnKey);
    const style = getArdsDetailCellStyle(columnKey, columnWidth);

    const focusNextDetailCell = (field) => {
      focusNextArdsDetailRowInput(index, field, {
        rows: detailRows,
        zeroClearFields: ardsDetailEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
      });
    };

    const textInput = (field, options = {}) => (
      <input
        type={options.type || "text"}
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        disabled={options.disabled ?? false}
        readOnly={options.readOnly ?? isFormDisabled}
        maxLength={options.maxLength}
        onChange={(e) => handleDetailChange(index, field, e.target.value, options.runCalculations ?? true)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || options.disabled || isFormDisabled) return;
          e.preventDefault();
          focusNextDetailCell(field);
        }}
      />
    );

    const amountInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={row[field] ?? ""}
        disabled={options.disabled ?? isFormDisabled}
        readOnly={options.readOnly ?? isFormDisabled}
        onChange={(e) => {
          if (options.readOnly ?? isFormDisabled) return;
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*(\.\d{0,2})?$/.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChange(index, field, sanitizedValue, false);
          }
        }}
        onFocus={(e) =>
          clearArdsDetailZeroOnFocus(e, {
            isEditable: !(options.disabled ?? isFormDisabled) && !(options.readOnly ?? isFormDisabled),
            onClear: (value) => handleDetailChange(index, field, value, false),
          })
        }
        onBlur={async (e) => {
          if (options.readOnly ?? isFormDisabled) return;
          const num = parseFormattedNumber(e.target.value);
          if (!isNaN(num)) await handleDetailChange(index, field, num, true);
        }}
        onKeyDown={async (e) => {
          if (options.readOnly ?? isFormDisabled) return;
          if (e.key === "Enter") {
            e.preventDefault();
            const num = parseFormattedNumber(e.target.value);
            if (!isNaN(num)) await handleDetailChange(index, field, num, true);
            focusNextDetailCell(field);
          }
        }}
      />
    );

    const renderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      docCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("docCode", { readOnly: true })}</td>,
      docNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("docNo", { maxLength: ardsFieldLengths.docNo, readOnly: true })}</td>,
      docDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("docDate", { type: "date", readOnly: true })}</td>,
      custCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custCode", { readOnly: true })}</td>,
      custName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custName", { readOnly: true })}</td>,
      amount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("amount", { readOnly: true })}</td>,
      appliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("appliedAmount")}</td>,
      balance: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("balance", { readOnly: true })}</td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { maxLength: ardsFieldLengths.remarks, readOnly: true })}</td>,
    };

    return renderers[columnKey]?.() ?? null;
  };

  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          onPost={handlePost}
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/ARDS"
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
          <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>
          <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
            </div>
          </div>
        </div>

        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button
              className={`global-tran-tab-padding-ui ${activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
              onClick={() => updateState({ activeTab: "basic" })}
            >
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative items-stretch" id="ards_hd">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                readOnly
                lookupDisabled={isFetchDisabled}
                onLookup={() => updateState({ branchModalOpen: true })}
              />

              <FieldRenderer
                id="ardsNo"
                label="AR DS No"
                type="lookup"
                value={documentNo || ""}
                disabled={isDocNoDisabled}
                onChange={(val) => updateState({ documentNo: val })}
                onLookup={() => updateState({ showAllTranDocNo: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDocNoBlur();
                    e.preventDefault();
                    document.getElementById("documentDate")?.focus();
                  }
                }}
              />

              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput
                    id="documentDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={documentDate}
                    disabled={isFormDisabled}
                    updateState={updateState}
                  />
                </div>
                <label htmlFor="documentDate" className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}>
                  AR DS Date
                </label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="bankName"
                label="Bank Name"
                type="lookup"
                value={bankName || ""}
                disabled={isFormDisabled}
                readOnly
                lookupDisabled={isFetchDisabled}
                onLookup={() => updateState({ showBankMastModal: true })}
              />

              <FieldRenderer
                id="bankAcctNo"
                label="Bank Account No"
                type="text"
                value={bankAcctNo || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ bankAcctNo: val })}
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="refDocNo1"
                label="Ref ARDS No1"
                type="text"
                value={refDocNo1 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo1: val })}
              />

              <FieldRenderer
                id="refDocNo2"
                label="Ref ARDS No2"
                type="text"
                value={refDocNo2 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo2: val })}
              />
            </div>

            <div className="col-span-full">
              <div className="relative p-2">
                <textarea
                  id="remarks"
                  placeholder=""
                  rows={5}
                  className="peer global-tran-textbox-remarks-ui pt-2"
                  value={remarks}
                  onChange={(e) => updateState({ remarks: e.target.value })}
                  maxLength={ardsFieldLengths.remarks}
                  disabled={isFormDisabled}
                />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                  Remarks
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Receipt Details
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedArdsDetailColumns.map((column) =>
                      renderArdsDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedArdsDetailColumns,
                      })
                    )}
                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedArdsDetailRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedArdsDetailColumns.map((column) => renderArdsDetailCell(column.key, row, originalIndex))}
                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(originalIndex)}>
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderArdsDetailHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={handleAddRow}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalAmount" className="global-tran-tab-footer-total-label-ui">
                  Total Amount:
                </label>
                <label htmlFor="TotalAmount" className="global-tran-tab-footer-total-value-ui">
                  {totals.totalAmount}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalApplied" className="global-tran-tab-footer-total-label-ui">
                  Total Applied:
                </label>
                <label htmlFor="TotalApplied" className="global-tran-tab-footer-total-value-ui">
                  {totals.totalApplied}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalBalance" className="global-tran-tab-footer-total-label-ui">
                  Total Balance:
                </label>
                <label htmlFor="TotalBalance" className="global-tran-tab-footer-total-value-ui">
                  {totals.totalBalance}
                </label>
              </div>
            </div>
          </div>
        </div>

      {branchModalOpen && <BranchLookupModal isOpen={branchModalOpen} onClose={handleCloseBranchModal} />}

      {showBankMastModal && <BankMastLookupModal isOpen={showBankMastModal} onClose={handleCloseBankMast} />}

      {showCRDSOpenDetailModal && (
        <GlobalLookupModalv1
          isOpen={showCRDSOpenDetailModal}
          data={globalLookupRow}
          btnCaption="Get Selected Receipts"
          title="Open CR/AR DS Detail"
          endpoint={globalLookupHeader}
          onClose={handleCloseCRDSDetail}
          onCancel={() => updateState({ showCRDSOpenDetailModal: false })}
        />
      )}



      {showCancelModal && <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />}

      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: documentID,
            DocumentName: documentName,
            BranchName: branchName,
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
          params={{ branchCode, branchName, docType, documentTitle, fieldNo: "ardsNo" }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {showSpinner && <LoadingSpinner />}

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
         endpoint="/getARDSHistory"
         cacheKey={`ARDS:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
         activeTabKey="ARDS_Summary"
         branchCode={state.branchCode}
         startDate={state.fromDate}
         endDate={state.toDate}
         status="All"
         onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>
      </div>
     </div>
   );
};

export default ARDS;
