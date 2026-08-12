import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
  faTrashAlt,
  faBoxOpen,
  faWarehouse,
  faTableCellsLarge,
  faFileLines,
  faPlus as faPlusIcon,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import GlobalApprovalStatus from "@/NAYSA Cloud/Approval/GlobalApprovalStatus.jsx";

// Configuration
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
  useFormatToDate
} from '@/NAYSA Cloud/Global/dates';

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopPayTermRow,
  useTopPayeeRow,
  useTopVatRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useTransactionUpsert,
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
  useSwalHandleOpenSpecsModal,
  useSwalvalidateRequiredFields,
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useSelectedHSColConfig,
  useSelectedIteBranchBalance
} from '@/NAYSA Cloud/Global/selectedData';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from '@/NAYSA Cloud/Global/datatable.jsx';

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';

const toDateInputValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, mm, dd, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

const PO = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const deliveryDateRef = useRef("");
  const suppressDeliveryDatePromptRef = useRef(true);
  const addTypeDropdownRef = useRef(null);
  const navigate = useNavigate();
  const { companyInfo, currentUserRow, getAllDropDown, refsLoaded, getAllTopHSDocRow, getReplacementVatRow, getAllTopVatAmount } = useAuth();
  const { resetFlag } = useReset();
  const location = useLocation();
  const [isViewDocument, setIsViewDocument] = useState(false);
  const decQty = companyInfo?.itemDecqtyPur ?? 2;
  const decUPrice = companyInfo?.pur_decuprice ?? 2;
  const docType = docTypes?.PO || "PO";
  const hsDoc = getAllTopHSDocRow(docType) || {};

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);

  const isViewDocumentUrl = isViewDocument;

  const [topTab, setTopTab] = useState("details"); // "details" | "history"

  const [state, setState] = useState({
    // HS Option / Currency
    glCurrMode: companyInfo?.glCurrMode || "",
    glCurrDefault: companyInfo?.currCode || "",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: companyInfo?.glCurrGlobal1 || "",
    glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",

    // Document information
    documentName: hsDoc?.docName || "",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "O",
    originalDocStatus: "O",
    appLevel: 0,
    currRate: "",

    WHcode: "",
    WHname: "",
    warehouseLookupOpen: false,

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    // PR Style Lookup Logic Variables
    itemSingleSelect: false,
    itemLookupEndPoint: "",
    selectedDocType: "",

    poDate: useGetCurrentDayV2(),
    delDate: "",
    dateNeeded: "",

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    delAddress: "",

    // Responsibility Center / Requesting Dept
    reqRcCode: "",
    reqRcName: "",
    attention: "",

    // legacy fields
    vendCOde: "",
    vendName: "",

    // Currency information

    currCode: companyInfo?.currCode || "",
    currName: companyInfo?.currName || "",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),

    // Other Header Info
    tblFieldArray: [],
    poTranTypes: [],
    poTypes: [],
    selectedPoTranType: "",
    selectedPoType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "",
    requestDept: "",
    vendCode: "",
    vendNameHeader: "",
    refPoNo1: "",
    refPoNo2: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    poCancelled: "",
    poNo: "",
    payTerm: "",
    userCode: "",
    selectedPOStatus: "",
    vendVatCode: "",
    vendVatName: "",
    groupId: "",

    // New for JO-like functions
    paytermCode: "",
    paytermName: "",
    daysDue: "",
    payeeModalOpen: false,
    showPaytermModal: false,
    vatLookupModalOpen: false,
    payeeLookupOpen: false,
    showAllTranDocNo: false,

    // Detail lines
    detailRows: [],
    detailRowsApp: [],
    detailRowsSummary: [],

    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostModal: false,
    sourcePrNo: "",
    showApprovalStatusModal: false,
    showOpenPRModal: false,
    openPR_Data_Summary: [],
    openPR_Col_Summary: [],
    openPR_Col_Detail: [],

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    msLookupModalOpen: false,
  });

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    documentName,
    documentSeries,
    documentDocLen,
    documentID,
    documentStatus,
    documentNo,
    status,
    appLevel,
    originalDocStatus,

    activeTab,
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    poNo,
    selectedPOType,

    itemSingleSelect,
    itemLookupEndPoint,
    selectedDocType,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    poStatus,
    showAllTranDocNo,

    // Header
    branchCode,
    branchName,
    payTerm,
    delAddress,

    // Responsibility Center
    rcCode,
    rcName,

    // Requesting Dept
    reqRcCode,
    reqRcName,

    currCode,
    currName,
    attention,
    poDate,
    cutoffFrom,
    cutoffTo,

    vendCode,
    vendNameHeader,
    vendVatCode,
    vendVatName,

    tblFieldArray,
    poTranTypes,
    poTypes,
    selectedPoTranType,
    selectedPoType,
    cutoffCode,
    requestDept,
    dateNeeded,
    delDate,
    refPoNo1,
    refPoNo2,
    refPrNo2,
    remarks,
    billtermCode,
    billtermName,
    noReprints,
    poCancelled,
    userCode,
    currRate,
    sourcePrNo,
    selectedRowIndex,

    paytermCode,
    paytermName,
    daysDue,
    payeeModalOpen,
    showPaytermModal,

    detailRows,

    // Modals
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    vatLookupModalOpen,
    showApprovalStatusModal,
    showOpenPRModal,
    openPR_Data_Summary,
    openPR_Col_Summary,
    openPR_Col_Detail,
    detailRowsApp,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    msLookupModalOpen,
  } = state;


  const [header, setHeader] = useState({
    delDate: "",
    dateNeeded: "",
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (!showTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTypeDropdown]);
  const [poDetailActiveTab, setPoDetailActiveTab] = useState("detailed");
  const [summaryEditValues, setSummaryEditValues] = useState({});
  const [totals, setTotals] = useState({
    totalDiscount: "0.00",
    totalGross: "0.00",
    totalVat: "0.00",
    totalNet: "0.00",
  });

  const DEC_QTY = 2;
  const DEC_PRICE = 2;
  const DEC_AMT = 2;

  const getOpenPRDisplayColumns = (columns = []) =>
    (Array.isArray(columns) ? columns : []).map((column) => {
      const columnKey = String(column?.key || "").trim().toLowerCase();
      const columnLabel = String(column?.label || "").trim().toLowerCase();
      const isBranchColumn =
        columnKey === "branchcode" ||
        (columnLabel === "branch" && columnKey.includes("branch"));

      return isBranchColumn
        ? { ...column, key: "branchName", label: column?.label || "Branch" }
        : column;
    });

  const ensureOpenPRDetailHiddenColumns = (columns = []) => {
    const normalizedColumns = Array.isArray(columns) ? columns : [];
    const hiddenColumns = [
      { id: -2, endpoint: "getPRPO_OpenDetail", key: "prId", label: "PR ID", classNames: "text-left", hidden: 1, renderType: "text", renderFormat: "" },
      { id: -1, endpoint: "getPRPO_OpenDetail", key: "groupId", label: "Group ID", classNames: "text-left", hidden: 1, renderType: "text", renderFormat: "" },
    ];

    return [
      ...hiddenColumns.filter(
        (hiddenColumn) => !normalizedColumns.some((column) => column?.key === hiddenColumn.key)
      ),
      ...normalizedColumns,
    ];
  };


  const poDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "poStatus", label: "PO Status", width: 110 },
    { key: "prNo", label: "PR No.", width: 120 },
    { key: "invType", label: "Type", width: 80 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "itemSpecs", label: "Specification", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "poQty", label: "PO Quantity", width: 130 },
    { key: "unitPrice", label: "Unit Price", width: 130 },
    { key: "grossAmt", label: "Gross Amount", width: 140 },
    { key: "discRate", label: "Discount Rate", width: 130 },
    { key: "discAmt", label: "Discount Amount", width: 150 },
    { key: "totalAmt", label: "Total Amount", width: 140 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatAmt", label: "VAT Amount", width: 140 },
    { key: "netAmt", label: "Net Amount", width: 140 },
    { key: "dateNeeded", label: "Delivery Date", width: 140 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 220 },
    { key: "prBalance", label: "PR Balance", width: 130 },
    { key: "rrQty", label: "RR Quantity", width: 130 },
  ];

  const {
    getColumnStyle: getPoDetailColumnStyle,
    getFrozenColumnStyle: getPoDetailFrozenStyle,
    getOrderedColumns: getOrderedPoDetailColumns,
    getSortedRows: getSortedPoDetailRows,
    clearAllSorting: clearPoDetailSorting,
    clearZeroValueOnFocus: clearPoDetailZeroOnFocus,
    focusNextRowInput: focusNextPoDetailRowInput,
    renderHeaderContextMenu: renderPoDetailHeaderContextMenu,
    renderResizableHeader: renderPoDetailHeader,
  } = useResizableTableColumns(poDetailColumnDefs);

  const orderedPoDetailColumns = getOrderedPoDetailColumns(poDetailColumnDefs);
  const getPoDetailFallbackWidth = (key) => poDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getPoDetailCellStyle = (key, fallbackWidth) => ({
    ...getPoDetailColumnStyle(key, fallbackWidth),
    ...getPoDetailFrozenStyle(key, orderedPoDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedPoDetailRows = getSortedPoDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const poSummaryColumnDefs = poDetailColumnDefs.filter(
    (column) =>
      ![
        "poStatus",
        "prNo",
        "groupId",
        "prId",
        "dateNeeded",
        "rcCode",
        "rcName",
        "prBalance",
        "rrQty",
      ].includes(column.key)
  );

  const {
    getColumnStyle: getPoSummaryColumnStyle,
    getFrozenColumnStyle: getPoSummaryFrozenStyle,
    getOrderedColumns: getOrderedPoSummaryColumns,
    getSortedRows: getSortedPoSummaryRows,
    renderHeaderContextMenu: renderPoSummaryHeaderContextMenu,
    renderResizableHeader: renderPoSummaryHeader,
  } = useResizableTableColumns(poSummaryColumnDefs);

  const orderedPoSummaryColumns = getOrderedPoSummaryColumns(poSummaryColumnDefs);
  const getPoSummaryFallbackWidth = (key) => poSummaryColumnDefs.find((column) => column.key === key)?.width || 120;
  const getPoSummaryCellStyle = (key, fallbackWidth) => ({
    ...getPoSummaryColumnStyle(key, fallbackWidth),
    ...getPoSummaryFrozenStyle(key, orderedPoSummaryColumns, fallbackWidth, { isHeader: false }),
  });

  const getPoSummaryGroupKey = (row = {}) =>
    [
      String(row.itemCode || "").trim().toUpperCase(),
      String(row.invType || "").trim().toUpperCase(),
      String(row.itemSpecs || "").trim().toUpperCase(),
    ].join("||");

  const hasDuplicatePoSummaryKey = useMemo(() => {
    const groupCount = new Map();

    (detailRows || []).forEach((row) => {
      if (!String(row?.itemCode || "").trim()) return;

      const key = getPoSummaryGroupKey(row);
      groupCount.set(key, (groupCount.get(key) || 0) + 1);
    });

    return Array.from(groupCount.values()).some((count) => count > 1);
  }, [detailRows]);

  const poSummaryRows = useMemo(() => {
    const summaryMap = new Map();

    (detailRows || []).forEach((row) => {
      if (!String(row?.itemCode || "").trim()) return;

      const key = getPoSummaryGroupKey(row);
      const existing = summaryMap.get(key);

      const poQty = parseFormattedNumber(row.poQty || 0) || 0;
      const grossAmt = parseFormattedNumber(row.grossAmt || 0) || 0;
      const discAmt = parseFormattedNumber(row.discAmt || 0) || 0;
      const totalAmt = parseFormattedNumber(row.totalAmt || 0) || 0;
      const vatAmt = parseFormattedNumber(row.vatAmt || 0) || 0;
      const netAmt = parseFormattedNumber(row.netAmt || 0) || 0;

      if (!existing) {
        summaryMap.set(key, {
          _summaryKey: key,
          invType: row.invType || "",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          item_specs:
            row.item_specs ??
            row.itemSpecs ??
            "",
          uomCode: row.uomCode || "",
          poQty,
          unitPrice: parseFormattedNumber(row.unitPrice || 0) || 0,
          grossAmt,
          discRate: parseFormattedNumber(row.discRate || 0) || 0,
          discAmt,
          totalAmt,
          vatCode: row.vatCode || "",
          vatName: row.vatName || "",
          vatAmt,
          netAmt,
        });
        return;
      }

      existing.poQty += poQty;
      existing.grossAmt += grossAmt;
      existing.discAmt += discAmt;
      existing.totalAmt += totalAmt;
      existing.vatAmt += vatAmt;
      existing.netAmt += netAmt;

      if (!existing.vatCode && row.vatCode) existing.vatCode = row.vatCode;
      if (!existing.vatName && row.vatName) existing.vatName = row.vatName;
    });

    return Array.from(summaryMap.values()).map((row) => {
      const computedUnitPrice = row.poQty ? row.grossAmt / row.poQty : row.unitPrice;
      const computedDiscRate = row.grossAmt ? (row.discAmt / row.grossAmt) * 100 : row.discRate;

      return {
        ...row,
        poQty: formatNumber(row.poQty || 0, decQty),
        unitPrice: formatNumber(computedUnitPrice || 0, decUPrice),
        grossAmt: formatNumber(row.grossAmt || 0, DEC_AMT),
        discRate: formatNumber(computedDiscRate || 0, DEC_AMT),
        discAmt: formatNumber(row.discAmt || 0, DEC_AMT),
        totalAmt: formatNumber(row.totalAmt || 0, DEC_AMT),
        vatAmt: formatNumber(row.vatAmt || 0, DEC_AMT),
        netAmt: formatNumber(row.netAmt || 0, DEC_AMT),
      };
    });
  }, [detailRows, decQty, decUPrice]);

  const poSummaryTotals = useMemo(() => {
    const summarySourceRows = Array.isArray(poSummaryRows) ? poSummaryRows : [];
    let gross = 0, discount = 0, vat = 0, net = 0;

    summarySourceRows.forEach((row) => {
      gross += parseFormattedNumber(row.grossAmt || 0);
      discount += parseFormattedNumber(row.discAmt || 0);
      vat += parseFormattedNumber(row.vatAmt || 0);
      net += parseFormattedNumber(row.netAmt || 0);
    });

    return {
      totalGross: formatNumber(gross || 0, DEC_AMT),
      totalDiscount: formatNumber(discount || 0, DEC_AMT),
      totalVat: formatNumber(vat || 0, DEC_AMT),
      totalNet: formatNumber(net || 0, DEC_AMT),
    };
  }, [poSummaryRows]);

  const sortedPoSummaryRows = getSortedPoSummaryRows(
    poSummaryRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const poDetailEnterNextRowZeroClearFields = ["poQty", "unitPrice", "discRate", "discAmt"];

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Purchase Order";
  // Helper to map single characters to full words
  const getFullStatus = (s) => {
    const map = {
      O: "OPEN",
      C: "CLOSED",
      X: "CANCELLED",
      F: "FINALIZED",
    };
    return map[s?.toUpperCase()] || s || "OPEN";
  };

  const getStatusCode = (s) => {
    const map = {
      OPEN: "O",
      CLOSED: "C",
      CANCELLED: "X",
      FINALIZED: "F",
      POSTED: "P",
    };
    const raw = String(s || "O").toUpperCase();
    return map[raw] || raw;
  };

  const displayStatus = getFullStatus(status);

  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = statusMap[displayStatus] || "";
  const maxApprovalLevel = Number(currentUserRow?.poMaxAppLevel || 0);
  const currentApprovalLevel = Number(appLevel ?? 0);
  const approvalStatusHiddenStatuses = ["CANCELLED", "POSTED", "FINALIZED"];
  const showApprovalStatus =
    !!documentID &&
    maxApprovalLevel > 0 &&
    !approvalStatusHiddenStatuses.includes(String(displayStatus || "").toUpperCase());
  const approvalStatus = (() => {
    if (!showApprovalStatus) return "";
    if (currentApprovalLevel === -1) return "Disapproved Transaction";
    if (currentApprovalLevel >= maxApprovalLevel) return "Approved Transaction";
    return `Awaiting for L${currentApprovalLevel + 1} Approval`;
  })();
  const approvalStatusColor =
    currentApprovalLevel === -1
      ? "text-rose-500 dark:text-rose-400 animate-pulse"
      : statusColor;
  const isDocumentLocked = isViewDocumentUrl || ["FINALIZED", "CANCELLED", "CLOSED"].includes(
    displayStatus
  );
  const isApprovalLocked =
    currentApprovalLevel > 0 &&
    currentApprovalLevel <= maxApprovalLevel;
  const isFormDisabled = isDocumentLocked || isApprovalLocked;

  const computeVatFromInclusive = (vatRate, grossAmt) => {
    const rate = parseFormattedNumber(vatRate || 0);
    const gross = parseFormattedNumber(grossAmt || 0);

    if (!rate || !gross) return 0;

    const r = rate * 0.01;
    return (gross * r) / (1 + r);
  };

  const isDateBeforePoDate = (value) => {
    const detailDate = toDateInputValue(value);
    const baseDate = toDateInputValue(poDate);
    return Boolean(detailDate && baseDate && detailDate < baseDate);
  };

  const currentDeliveryFallbackDate = useGetCurrentDayV2();
  const getDefaultDeliveryDate = () => poDate || currentDeliveryFallbackDate;

  const getInvTypeFromDocType = (lookupDocType) => {
    const normalized = String(lookupDocType || "").toUpperCase();
    if (normalized.endsWith("FG")) return "FG";
    if (normalized.endsWith("RM")) return "RM";
    return "MS";
  };

  const getPoGoodsVatRow = useCallback(
    (vatCode) => getReplacementVatRow(vatCode || "", "I", "S", "G"),
    [getReplacementVatRow]
  );

  const getDefaultLineVat = useCallback(() => {
    const currentRows = detailRowsRef.current || detailRows || [];

    const existingVatRow = currentRows.find((row) =>
      String(row?.vatCode || "").trim()
    );

    const sourceVatCode = String(
      vendVatCode || existingVatRow?.vatCode || ""
    ).trim();

    const replacementVatRow = sourceVatCode
      ? getPoGoodsVatRow(sourceVatCode)
      : null;

    return {
      vatCode: replacementVatRow?.vatCode || sourceVatCode || "",
      vatName:
        replacementVatRow?.vatName ||
        vendVatName ||
        existingVatRow?.vatName ||
        "",
      vatRate: parseFormattedNumber(
        replacementVatRow?.vatRate ??
        existingVatRow?.vatRate ??
        0
      ),
    };
  }, [detailRows, vendVatCode, vendVatName, getPoGoodsVatRow]);


  const recalcDetailRow = (row, changedField = "") => {
    const qty = parseFormattedNumber(row.poQty || row.prBalance || 0);
    const unitPrice = parseFormattedNumber(row.unitPrice || 0);


    const gross = qty * unitPrice;
    let discRate = parseFormattedNumber(row.discRate || 0);
    let discAmt = parseFormattedNumber(row.discAmt || 0);

    if (changedField === "discAmt") {
      if (discAmt > gross) discAmt = gross;
      discRate = gross !== 0 ? (discAmt / gross) * 100 : 0;
    } else {
      if (discRate > 99.99) discRate = 99.99;
      discAmt = gross * (discRate / 100);
    }

    const baseAfterDisc = gross - discAmt;
    const vCode = row.vatCode || "";
    const vatAmt = vCode ? getAllTopVatAmount(vCode, baseAfterDisc) : 0;
    const net = baseAfterDisc - vatAmt;

    row.qtyOnHand = formatNumber(parseFormattedNumber(row.qtyOnHand) || 0, decQty);
    row.prBalance = formatNumber(parseFormattedNumber(row.prBalance) || 0, decQty);
    row.poQty = formatNumber(parseFormattedNumber(row.poQty) || 0, decQty);
    row.unitPrice = formatNumber(parseFormattedNumber(row.unitPrice) || 0, decUPrice);

    row.grossAmt = formatNumber(gross || 0, DEC_AMT);
    row.totalAmt = formatNumber(baseAfterDisc || 0, DEC_AMT);
    row.vatAmt = formatNumber(vatAmt || 0, DEC_AMT);
    row.netAmt = formatNumber(net || 0, DEC_AMT);

    return {
      ...row,
      grossAmt: formatNumber(gross || 0, DEC_AMT),
      discRate: formatNumber(discRate || 0, DEC_AMT),
      discAmt: formatNumber(discAmt || 0, DEC_AMT),
      totalAmt: formatNumber(baseAfterDisc || 0, DEC_AMT),
      vatAmt: formatNumber(vatAmt || 0, DEC_AMT),
      netAmt: formatNumber(net || 0, DEC_AMT),
    };
  };

  const updateTotalsDisplay = (rows) => {
    const arr = rows || [];
    let gross = 0, discount = 0, vat = 0, net = 0;

    arr.forEach((r) => {
      gross += parseFormattedNumber(r.grossAmt || 0);
      discount += parseFormattedNumber(r.discAmt || 0);
      vat += parseFormattedNumber(r.vatAmt || 0);
      net += parseFormattedNumber(r.netAmt || 0);
    });

    setTotals({
      totalDiscount: formatNumber(discount || 0, DEC_AMT),
      totalGross: formatNumber(gross || 0, DEC_AMT),
      totalVat: formatNumber(vat || 0, DEC_AMT),
      totalNet: formatNumber(net || 0, DEC_AMT),
    });
  };

  const handleAddBlankRow = (index) => {
    if (isFormDisabled) return;

    const today = getDefaultDeliveryDate();
    const defaultVat = getDefaultLineVat();

    const blankRow = {
      invType: "",
      groupId: "",
      poStatus: "O",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: formatNumber(0, decQty),
      qtyAlloc: formatNumber(0, decQty),
      prBalance: formatNumber(0, decQty),
      uomCode2: "",
      uomQty2: formatNumber(0, decQty),
      dateNeeded: state.header?.delDate || today,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: formatNumber(0, decQty),
      rrQty: formatNumber(0, decQty),
      unitPrice: formatNumber(0, decUPrice),
      grossAmt: formatNumber(0),
      discRate: formatNumber(0),
      discAmt: formatNumber(0),
      totalAmt: formatNumber(0),

      vatCode: defaultVat.vatCode,
      vatName: defaultVat.vatName,
      vatAmt: formatNumber(0),
      netAmt: formatNumber(0),
      vatRate: defaultVat.vatRate,

      rcCode: rcCode || "",
      rcName: rcName || "",
    };

    const updatedRows = [...detailRows];
    updatedRows.splice(index + 1, 0, blankRow);

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const openSpecsModal = (rowIndex) => {
    if (isFormDisabled) return;

    useSwalHandleOpenSpecsModal(
      rowIndex,
      detailRows,
      handleDetailChange,
      detailRows?.[rowIndex]?.itemSpecs || "",
      "Specification",
      "itemSpecs",
      "Enter specification for this item..."
    );
  };

  const handleCloseWarehouseLookup = (row) => {
    if (!row) {
      updateState({ warehouseLookupOpen: false });
      return;
    }
    updateState({
      warehouseLookupOpen: false,
      WHcode: row?.whCode ?? "",
      WHname: row?.whName ?? "",
    });
  };

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
    handleReset();
  }, []);

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  useEffect(() => {
    const currentValue = delDate || "";

    if (suppressDeliveryDatePromptRef.current) {
      suppressDeliveryDatePromptRef.current = false;

      if (!currentValue || currentValue === deliveryDateRef.current) {
        deliveryDateRef.current = currentValue;
        return;
      }
    }

    if (currentValue === deliveryDateRef.current) return;

    const isCompleteOrCleared =
      currentValue === "" || /^\d{2}\/\d{2}\/\d{4}$/.test(currentValue);

    if (!isCompleteOrCleared) return;

    if (!currentValue) {
      applyHeaderAndDetailDeliveryDate(getDefaultDeliveryDate(), {
        showAlert: true,
        updateAllDetails: true,
        alertMessage:
          "Delivery Date is required. Delivery Date has been adjusted to match the PO Date.",
      });
      return;
    }

    if (isDeliveryDateEarlierThanPoDate(currentValue)) {
      applyHeaderAndDetailDeliveryDate(getDefaultDeliveryDate(), {
        showAlert: true,
      });
      return;
    }

    const run = async () => {
      const nextState = {
        dateNeeded: currentValue,
        header: { ...(state.header || {}), delDate: currentValue },
      };

      if ((detailRows?.length || 0) > 0) {
        const result = await useSwalProceedConfirm(
          "Apply Delivery Date changes?",
          "PO Detail already has record(s).\nDo you want to apply the updated Delivery Date to all PO Detail rows?",
          "Yes"
        );

        if (result?.isConfirmed) {
          const updatedRows = (detailRows || []).map((row) => ({
            ...row,
            dateNeeded: currentValue,
          }));

          detailRowsRef.current = updatedRows;
          nextState.detailRows = updatedRows;
        }
      }

      deliveryDateRef.current = currentValue;
      updateState(nextState);
    };

    run();
  }, [delDate]);

  useEffect(() => {
    const newPoDate = getDefaultDeliveryDate();
    const shouldUpdateHeaderDeliveryDate =
      delDate && isDeliveryDateEarlierThanPoDate(delDate);

    const hasEarlyDetailDeliveryDate = (detailRows || []).some((row) =>
      row?.dateNeeded && isDeliveryDateEarlierThanPoDate(row.dateNeeded)
    );

    if (shouldUpdateHeaderDeliveryDate || hasEarlyDetailDeliveryDate) {
      applyHeaderAndDetailDeliveryDate(newPoDate, {
        showAlert: true,
      });
    }
  }, [poDate]);

  useEffect(() => {
    if (hasDuplicatePoSummaryKey) {
      setPoDetailActiveTab("summary");
      return;
    }

    setPoDetailActiveTab("detailed");
  }, [hasDuplicatePoSummaryKey]);


  const handleReset = () => {
    clearPoDetailSorting();
    loadCompanyData();

    const today = useGetCurrentDayV2();
    const defaultBranchCode = currentUserRow?.branchCode || "";
    const defaultBranchName = currentUserRow?.branchName || "";
    const defaultCurrCode = companyInfo?.currCode || glCurrDefault || "PHP";
    const defaultCurrName = companyInfo?.currName || "";
    const defaultCurrRate = formatNumber(companyInfo?.currRate || 1, 6);

    deliveryDateRef.current = "";
    suppressDeliveryDatePromptRef.current = true;
    setPoDetailActiveTab("detailed");

    setHeader({
      dateNeeded: "",
      delDate: "",
    });

    updateState({
      header: {
        dateNeeded: "",
        delDate: "",
      },
      poDate: today,
      dateNeeded: "",
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      delAddress: "",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      vendCode: "",
      vendNameHeader: "",
      vendVatCode: "",
      vendVatName: "",
      dateNeeded: "",
      delDate: "",
      sourcePrNo: "",
      refPoNo1: "",
      refPoNo2: "",
      refPrNo2: "",
      remarks: "",
      documentNo: "",
      documentID: "",
      attention: "",
      documentStatus: "O",
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "O",
      originalDocStatus: "O",
      noReprints: "0",
      appLevel: 0,
      poCancelled: "",
      detailRows: [],
      detailRowsApp: [],
      detailRowsSummary: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
      itemSingleSelect: false,
      itemLookupEndPoint: "",
      selectedDocType: "",
      currCode: defaultCurrCode,
      currName: defaultCurrName,
      currRate: defaultCurrRate,
      paytermCode: "",
      paytermName: "",
      daysDue: "",
      payeeModalOpen: false,
      showPaytermModal: false,
      vatLookupModalOpen: false,
      payeeLookupOpen: false,
      showApprovalStatusModal: false,
      showOpenPRModal: false,
      showAllTranDocNo: false,
      selectedRowIndex: null,
    });

    updateTotalsDisplay([]);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const [poTranDrop, poTypeDrop] = await Promise.all([
        useTopDocDropDown(docType, "POTRAN_TYPE"),
        useTopDocDropDown(docType, "PO_TYPE"),
      ]);

      if (poTranDrop) {
        updateState({
          poTranTypes: poTranDrop,
          selectedPoTranType: poTranDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }
      if (poTypeDrop) {
        updateState({
          poTypes: poTypeDrop,
          selectedPoType: poTypeDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }

      try {
        const hdtblcol_result = await useFieldLenghtCheck(
          "po_hd,po_dt1"
        );
        if (hdtblcol_result) {
          updateState({ tblFieldArray: hdtblcol_result });
        }
      } catch (err) {
        console.error("Error field length check:", err);
      }

      const hsOption = await useTopHSOption();
      if (hsOption) {
        setState((prev) => ({
          ...prev,
          glCurrMode: hsOption.glCurrMode,
          glCurrDefault: hsOption.glCurrDefault,
          currCode:
            prev.documentID || prev.documentNo
              ? prev.currCode
              : prev.currCode || hsOption.glCurrDefault,
          glCurrGlobal1: hsOption.glCurrGlobal1,
          glCurrGlobal2: hsOption.glCurrGlobal2,
          glCurrGlobal3: hsOption.glCurrGlobal3,
        }));

        const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
        if (curr) {
          setState((prev) => ({
            ...prev,
            currName:
              prev.documentID || prev.documentNo
                ? prev.currName
                : prev.currName || curr.currName,
            currRate:
              prev.documentID || prev.documentNo
                ? prev.currRate
                : prev.currRate || formatNumber(1, 6),
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const loadCurrencyMode = (mode = glCurrMode, defaultCurr = glCurrDefault, curr = currCode) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 = (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

    updateState({
      glCurrMode: mode,
      withCurr2: calcWithCurr2,
      withCurr3: calcWithCurr3,
    });
  };


  const fetchTranData = async (poNoParam, _branchCode, key = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay([]);
    };

    updateState({ isLoading: true });

    try {
      let formattedPoNo = poNoParam?.toString().trim() || "";
      if (formattedPoNo && /^\d+$/.test(formattedPoNo)) {
        formattedPoNo = formattedPoNo.padStart(8, '0');
      }

      const data = await useFetchTranData(
        formattedPoNo,
        _branchCode || branchCode,
        docType,
        "poNo",
        key || ""
      );



      if (!data?.poId && !data?.poNo) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      let poDateForHeader = "";
      if (data.poDate) {
        poDateForHeader = useformatToDatev2(data.poDate) || "";
      }

      let dateNeededForHeader = "";
      if (data.dateNeeded) {
        dateNeededForHeader = useformatToDatev2(data.dateNeeded) || "";
      }

      let delDateForHeader = "";
      if (data.delDate) {
        delDateForHeader = useformatToDatev2(data.delDate) || "";
      }

      const fetchedSummaryRows = Array.isArray(data.dt3)
        ? data.dt3
        : data.dt3
          ? [data.dt3]
          : [];

      const retrievedSummaryRows = fetchedSummaryRows.map((item, index) => ({
        ...item,
        lN: item.lN || item.lnNo || index + 1,
        summaryKey: item.summaryKey || "",
        invType: item.invType || "",
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        itemSpecs: item.itemSpecs || "",
        uomCode: item.uomCode || "",
        poQty: formatNumber(item.poQty ?? item.poQuantity ?? 0, decQty),
        unitPrice: formatNumber(item.unitCost ?? item.unitPrice ?? 0, decUPrice),
        grossAmt: formatNumber(item.grossAmount ?? item.grossAmt ?? 0, DEC_AMT),
        discRate: formatNumber(item.discRate ?? 0, DEC_AMT),
        discAmt: formatNumber(item.discAmount ?? item.discAmt ?? 0, DEC_AMT),
        totalAmt: formatNumber(item.itemAmount ?? item.totalAmt ?? 0, DEC_AMT),
        vatCode: item.vatCode || "",
        vatName: item.vatName || "",
        rcCode: item.rcCode || "",
        rcName: item.rcName || "",
        vatAmt: formatNumber(item.vatAmount ?? item.vatAmt ?? 0, DEC_AMT),
        netAmt: formatNumber(item.netAmount ?? item.netAmt ?? 0, DEC_AMT),
      }));

      const summaryByKey = new Map();
      retrievedSummaryRows.forEach((summaryRow) => {
        const key = summaryRow.summaryKey || getPoSummaryGroupKey(summaryRow);
        if (key && key !== "||||") {
          summaryByKey.set(key, summaryRow);
        }
      });

      const retrievedDetailRowsRaw = (data.dt1 || []).map((item) => {
        const poQty = Number(item.poQuantity ?? item.poQty ?? 0) || 0;

        return {
          ...item,
          lN: item.lN || item.lnNo,
          prId: item.prId || "",
          invType: item.invType || "",
          groupId: item.groupId || "",
          poStatus: item.poStatus || "",
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
          uomCode: item.uomCode || "",
          qtyOnHand: formatNumber(item.qtyOnHand ?? 0, decQty),
          qtyAlloc: formatNumber(item.qtyAlloc ?? 0, decQty),
          prBalance: formatNumber(item.prBalance ?? 0, decQty),
          uomCode2: item.uomCode2 || "",
          uomQty2: formatNumber(item.uomQty2 ?? 0, decQty),
          dateNeeded: item.dateNeeded ? useformatToDatev2(item.dateNeeded) : "",
          itemSpecs: item.itemSpecs || "",
          serviceCode: item.serviceCode || "",
          serviceName: item.serviceName || "",
          poQty: formatNumber(poQty, decQty),
          rrQty: formatNumber(item.rrQty ?? 0, decQty),
          unitPrice: formatNumber(item.unitCost ?? item.unitPrice ?? 0, decUPrice),
          grossAmt: formatNumber(item.grossAmount ?? item.grossAmt ?? 0, DEC_AMT),
          discRate: formatNumber(item.discRate ?? 0, DEC_AMT),
          discAmt: formatNumber(item.discAmount ?? item.discAmt ?? 0, DEC_AMT),
          totalAmt: formatNumber(item.itemAmount ?? item.totalAmt ?? 0, DEC_AMT),
          vatAmt: formatNumber(item.vatAmount ?? item.vatAmt ?? 0, DEC_AMT),
          netAmt: formatNumber(item.netAmount ?? item.netAmt ?? 0, DEC_AMT),
          vatCode: item.vatCode || "",
          vatName: item.vatName || "",
          rcCode: item.rcCode || "",
          rcName: item.rcName || ""
        };
      });

      const applyFetchedSummaryToDetails = (rows) => {
        if (summaryByKey.size === 0) return rows;

        let nextRows = rows.map((row) => {
          const summaryRow = summaryByKey.get(getPoSummaryGroupKey(row));
          if (!summaryRow) return row;

          return recalcDetailRow(
            {
              ...row,
              unitPrice: summaryRow.unitPrice || row.unitPrice,
              discRate: summaryRow.discRate || row.discRate,
              vatCode: summaryRow.vatCode || row.vatCode,
              vatName: summaryRow.vatName || row.vatName,
              rcCode: summaryRow.rcCode || row.rcCode,
              rcName: summaryRow.rcName || row.rcName,
            },
            "discRate"
          );
        });

        summaryByKey.forEach((summaryRow, summaryKey) => {
          const targetTotalDiscount = parseFormattedNumber(summaryRow.discAmt || 0) || 0;
          if (!targetTotalDiscount) return;

          const groupRows = nextRows.filter((row) => getPoSummaryGroupKey(row) === summaryKey);
          if (groupRows.length === 0) return;

          const groupGrossTotal = groupRows.reduce(
            (sum, row) => sum + (parseFormattedNumber(row.grossAmt || 0) || 0),
            0
          );
          let runningDiscount = 0;
          let groupIndex = 0;

          nextRows = nextRows.map((row) => {
            if (getPoSummaryGroupKey(row) !== summaryKey) return row;

            const isLast = groupIndex === groupRows.length - 1;
            const rowGross = parseFormattedNumber(row.grossAmt || 0) || 0;
            const rowDiscount = isLast
              ? targetTotalDiscount - runningDiscount
              : groupGrossTotal > 0
                ? targetTotalDiscount * (rowGross / groupGrossTotal)
                : targetTotalDiscount / Math.max(groupRows.length, 1);

            runningDiscount += rowDiscount;
            groupIndex += 1;

            return recalcDetailRow(
              {
                ...row,
                discAmt: formatNumber(Math.max(rowDiscount, 0), DEC_AMT),
              },
              "discAmt"
            );
          });
        });

        return nextRows;
      };

      const retrievedDetailRows = applyFetchedSummaryToDetails(retrievedDetailRowsRaw);
      updateTotalsDisplay(retrievedDetailRows);

      let fetchedCurrName = data.currName || "";

      if (data.currCode && !fetchedCurrName) {
        try {
          const currRow = await useTopCurrencyRow(data.currCode);
          fetchedCurrName = currRow?.currName || "";
        } catch (err) {
          console.error("Error fetching currency name:", err);
        }
      }

      const firstPrNo = data?.dt1?.[0]?.prNo || "";
      const normalizedHeaderDelDate = delDateForHeader || dateNeededForHeader || "";

      setHeader({
        dateNeeded: dateNeededForHeader,
        delDate: normalizedHeaderDelDate,
      });

      deliveryDateRef.current = formatFetchedHeaderDate(normalizedHeaderDelDate) || "";
      suppressDeliveryDatePromptRef.current = true;

      setSummaryEditValues({});

      updateState({
        documentStatus: getStatusCode(data.status),
        status: getStatusCode(data.status),
        originalDocStatus: getStatusCode(data.status),
        appLevel: data.appLevel || 0,

        documentID: data.poId || "",
        groupId: data.groupId || "",
        documentNo: data.poNo || "",
        branchCode: data.branchCode || branchCode,

        header: {
          dateNeeded: dateNeededForHeader || "",
          delDate: normalizedHeaderDelDate,
        },
        poDate: poDateForHeader || "",
        delDate: normalizedHeaderDelDate,
        dateNeeded: normalizedHeaderDelDate,

        cutoffCode: data.cutoffCode || "",
        rcCode: data.rcCode || "",
        rcName: data.rcName || "",

        selectedPoTranType: data.poTranType || "",
        selectedPoType: data.poType || "",

        delAddress: data.delAddress || data.delivAddress || data.deliv_address || "",
        refPoNo1: data.refPoNo1 || data.refpoNo1 || "",
        refPoNo2: data.refPoNo2 || data.refpoNo2 || "",
        refPrNo2: data.refPrNo2 || "",
        remarks: data.remarks || "",
        poCancelled: data.poCancelled || "",
        noReprints: data.noReprints ?? "0",

        detailRows: retrievedDetailRows,
        detailRowsSummary: retrievedSummaryRows,
        detailRowsApp: Array.isArray(data.dtApp)
          ? data.dtApp
          : data.dtApp
            ? [data.dtApp]
            : [],

        isDocNoDisabled: true,
        isFetchDisabled: true,

        vendCode: data.vendCode || "",
        vendNameHeader: data.vendName || "",

        // Payterm
        paytermCode: data.paytermCode || "",
        paytermName: data.paytermName || data.paytermCode || "",
        daysDue: data.daysDue ?? "",

        // Warehouse
        WHcode: data.whCode || "",
        WHname: data.whName || "",

        // Currency
        currCode: data.currCode || "",
        currName: fetchedCurrName,
        currRate: formatNumber(data.currRate || 1, 6),
        sourcePrNo: firstPrNo,
      });
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.message,
      });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2: (glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };


  const handlePrTypeChange = (e) => updateState({ selectedPoType: e.target.value });

  const formatFetchedHeaderDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [month, day, year] = raw.split("/").map(Number);
      const isValidMonth = month >= 1 && month <= 12;
      const isValidDay = day >= 1 && day <= 31;
      const isValidYear = year >= 1900 && year <= 2999;

      if (isValidMonth && isValidDay && isValidYear) return raw;
    }

    if (/^(19|20)\d{2}-\d{2}-\d{2}(T.*)?$/.test(raw)) {
      return useformatToDatev2(raw);
    }

    const digits = raw.replace(/\D/g, "");
    if (digits.length === 8) {
      const first4 = digits.slice(0, 4);
      const middle2 = digits.slice(4, 6);
      const last2 = digits.slice(6, 8);

      if (/^(19|20)\d{2}$/.test(first4)) {
        return `${middle2}/${last2}/${first4}`;
      }

      const month = digits.slice(0, 2);
      const day = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      return `${month}/${day}/${year}`;
    }

    return "";
  };

  const parseComparableDate = (value) => {
    const formattedValue = formatFetchedHeaderDate(value);

    if (!formattedValue || !/^\d{2}\/\d{2}\/\d{4}$/.test(formattedValue)) {
      return null;
    }

    const [month, day, year] = formattedValue.split("/").map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return parsedDate;
  };

  const isDeliveryDateEarlierThanPoDate = (value) => {
    const candidateDate = parseComparableDate(value);
    const basePoDate = parseComparableDate(poDate);

    if (!candidateDate || !basePoDate) return false;

    return candidateDate < basePoDate;
  };

  const applyHeaderAndDetailDeliveryDate = (
    nextDeliveryDate,
    {
      showAlert = false,
      updateAllDetails = false,
      alertMessage = "Delivery Date cannot be earlier than the PO Date. Delivery Date has been adjusted to match the PO Date.",
    } = {}
  ) => {
    const normalizedDeliveryDate =
      formatFetchedHeaderDate(nextDeliveryDate) ||
      nextDeliveryDate ||
      "";

    if (showAlert) {
      useSwalErrorAlert(
        "Invalid Delivery Date",
        alertMessage
      );
    }

    const updatedRows = (detailRows || []).map((row) => ({
      ...row,
      dateNeeded:
        updateAllDetails || !row?.dateNeeded || isDeliveryDateEarlierThanPoDate(row.dateNeeded)
          ? normalizedDeliveryDate
          : row.dateNeeded,
    }));

    detailRowsRef.current = updatedRows;
    deliveryDateRef.current = normalizedDeliveryDate;
    suppressDeliveryDatePromptRef.current = true;

    updateState({
      delDate: normalizedDeliveryDate,
      dateNeeded: normalizedDeliveryDate,
      header: { ...(state.header || {}), delDate: normalizedDeliveryDate },
      detailRows: updatedRows,
    });
  };


  const handleAddItemByPR = async () => {
    await handleOpenPRLookup();
  };



  const handleHeaderStatusChange = (value) => {
    if (value === "X" || value === "C") {
      const isCancel = value === "X";
      const actionWord = isCancel ? "CANCEL" : "CLOSE";

      useSwalProceedConfirm(
        `Confirm Full Document ${isCancel ? "Cancellation" : "Closing"}?`,
        `Are you sure you want to ${actionWord} this entire PO? This action is permanent and will affect all open line items.`,
        isCancel ? "Yes, Cancel PO" : "Yes, Close PO"
      ).then((result) => {
        if (result.isConfirmed) {
          if (isCancel) {
            handleCancel();
          } else {
            const updatedRows = detailRows.map((row) => ({
              ...row,
              poStatus: "C",
            }));

            updateState({
              documentStatus: "C",
              status: "C",
              detailRows: updatedRows,
            });
          }
        } else {
          updateState({
            documentStatus: "O",
            status: "O",
          });
        }
      });
    } else {
      updateState({ documentStatus: value, status: value });
    }
  };

  const handleAddRowClick = () => {
    if (isFormDisabled) return;
    setShowTypeDropdown((prev) => !prev);
  };

  const handleSelectTypeAndAddRow = (typeCode) => {
    const today = getDefaultDeliveryDate();
    const newRow = {
      invType: typeCode,
      groupId: "",
      poStatus: status || "O",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: formatNumber(0, decQty),
      qtyAlloc: formatNumber(0, decQty),
      prBalance: formatNumber(0, decQty),
      uomCode2: "",
      uomQty2: formatNumber(0, decQty),
      dateNeeded: delDate || today,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",
      unitPrice: "0.000000",
      grossAmt: "0.000000",
      discRate: "0.000000",
      discAmt: "0.000000",
      totalAmt: "0.000000",
      vatCode: vendVatCode || "",
      vatName: vendVatName || "",
      vatAmt: "0.000000",
      netAmt: "0.000000",
      vatRate: parseFormattedNumber(getPoGoodsVatRow(vendVatCode)?.vatRate ?? 0),
      rcCode: rcCode || "",
      rcName: rcName || "",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
    setShowTypeDropdown(false);
  };

  const handleOpenPRLookup = async () => {
    const lookupBranchCode = String(branchCode || "").trim();
    const lookupDepartmentCode = String(rcCode || "").trim().toUpperCase();

    if (!lookupBranchCode) {
      useSwalErrorAlert(
        "Open Purchase Requisition",
        "Branch is required before selecting Reference PR."
      );
      return;
    }

    updateState({ isLoading: true, showSpinner: true });

    try {
      const endpoint = "getPRPO_OpenSummary";

      const response = await fetchDataJson(endpoint, {
        branchCode: lookupBranchCode,
      });



      const rawData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : response?.data || [];

      const allSummaryRows = Array.isArray(rawData)
        ? rawData.map((row) => ({
          ...row,
          groupId: row.groupId || "",
          branchCode: row.branchCode || "",
          branchName: row.branchName || branchName || row.branchCode || "",
          prNo: row.prNo || "",
          prDate: row.prDate || "",
          rcCode: row.rcCode || "",
          rcName: row.rcName || "",
          dateNeeded: row.dateNeeded || "",
          remarks: row.remarks || "",
        }))
        : [];

      // Department is optional. When selected in the PO header, only PRs
      // assigned to that department are displayed. When blank, show all PRs.
      const summaryRows = lookupDepartmentCode
        ? allSummaryRows.filter(
          (row) =>
            String(row?.rcCode || "").trim().toUpperCase() ===
            lookupDepartmentCode
        )
        : allSummaryRows;

      if (summaryRows.length === 0) {
        useSwalInfoAlert(
          "Open Purchase Requisition",
          lookupDepartmentCode
            ? `There are no open Purchase Requisition records for department ${rcName || rcCode}.`
            : "There are no open Purchase Requisition records for the selected branch."
        );
        return;
      }

      let availableSummaryRows = summaryRows;

      const summaryIds = [
        ...new Set(
          summaryRows
            .map((row) =>
              String(
                row?.groupId ||
                row?.prId ||
                row?.pr_id ||
                row?.prNo ||
                row?.pr_no ||
                ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ];

      if (summaryIds.length > 0) {
        const detailPayload = {
          json_data: JSON.stringify({
            json_data: {
              selectedIds: summaryIds.join(","),
            },
          }),
        };

        const detailResponse = await postRequest(
          "getPRPO_OpenDetail",
          detailPayload
        );

        const rawDetailData = detailResponse?.data?.[0]?.result
          ? JSON.parse(detailResponse.data[0].result)
          : detailResponse?.data || detailResponse;

        const allOpenDetailRows = Array.isArray(rawDetailData)
          ? rawDetailData.map((row) => ({
            ...row,
            groupId: row.groupId || "",
            prId: row.prId || row.pr_id || row.prID || "",
            prNo: row.prNo || row.pr_no || "",
            itemCode: row.itemCode || row.item_code || "",
            item_code: row.item_code || row.itemCode || "",
          }))
          : [];

        const selectedPRItemKeys = new Set(
          (detailRowsRef.current || detailRows || [])
            .filter((row) =>
              String(row?.prId || row?.prNo || "").trim() &&
              String(row?.itemCode || "").trim()
            )
            .map(getOpenPRItemSelectionKey)
        );

        const remainingOpenDetailRows = allOpenDetailRows.filter(
          (row) => !selectedPRItemKeys.has(getOpenPRItemSelectionKey(row))
        );

        const availablePRIdentityValues = new Set(
          remainingOpenDetailRows.flatMap(getOpenPRDocumentIdentityValues)
        );

        availableSummaryRows = summaryRows.filter((summaryRow) =>
          getOpenPRDocumentIdentityValues(summaryRow).some((identity) =>
            availablePRIdentityValues.has(identity)
          )
        );
      }

      if (availableSummaryRows.length === 0) {
        useSwalInfoAlert(
          "Open Purchase Requisition",
          "All open PR items for the selected branch are already included in this PO."
        );
        return;
      }

      const colConfig = await useSelectedHSColConfig("getPRPO_OpenSummary", userCode);
      const colConfig_detail = await useSelectedHSColConfig("getPRPO_OpenDetail", userCode);

      updateState({
        openPR_Data_Summary: availableSummaryRows,
        openPR_Col_Summary: getOpenPRDisplayColumns(colConfig),
        openPR_Col_Detail: getOpenPRDisplayColumns(colConfig_detail),
        showOpenPRModal: true,
      });
    } catch (error) {
      console.error("PRPO Open Summary Fetch Error:", {
        status: error?.response?.status,
        data: error?.response?.data,
        error,
      });

      useSwalErrorAlert(
        "Open Purchase Requisition",
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error in fetching record."
      );

      updateState({
        openPR_Data_Summary: [],
        openPR_Col_Summary: [],
        openPR_Col_Detail: [],
      });
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const getUniqueOpenPRRemarks = (records = []) => {
    const seen = new Set();

    return (records || []).reduce((acc, record) => {
      const value = String(record?.remarks || "").trim();
      if (!value) return acc;

      const key = value.replace(/\s+/g, " ").toLowerCase();
      if (seen.has(key)) return acc;

      seen.add(key);
      acc.push(value);
      return acc;
    }, []);
  };

  const appendMissingRemarks = (currentRemarks = "", newRemarks = []) => {
    const current = String(currentRemarks || "").trim();
    const currentKey = current.replace(/\s+/g, " ").toLowerCase();
    const missingRemarks = newRemarks.filter((remark) => {
      const key = String(remark || "").trim().replace(/\s+/g, " ").toLowerCase();
      return key && !currentKey.includes(key);
    });

    if (missingRemarks.length === 0) return currentRemarks || "";
    return [current, ...missingRemarks].filter(Boolean).join("\n");
  };


  const getOpenPRItemSelectionKey = (row = {}) => {
    const prIdentity = String(
      row?.prId ||
      row?.pr_id ||
      row?.prID ||
      row?.prNo ||
      row?.pr_no ||
      ""
    ).trim().toUpperCase();

    const groupIdentity = String(
      row?.groupId ||
      row?.group_id ||
      ""
    ).trim().toUpperCase();

    const itemIdentity = String(
      row?.itemCode ||
      row?.item_code ||
      ""
    ).trim().toUpperCase();

    return `${prIdentity}||${groupIdentity}||${itemIdentity}`;
  };

  const getOpenPRDocumentIdentityValues = (row = {}) =>
    [
      row?.prId,
      row?.pr_id,
      row?.prID,
      row?.groupId,
      row?.group_id,
      row?.prNo,
      row?.pr_no,
    ]
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean);

  const getLatestDeliveryDate = (values = []) => {
    let latestDate = null;
    let latestFormattedValue = "";

    (Array.isArray(values) ? values : []).forEach((value) => {
      const formattedValue = formatFetchedHeaderDate(value);
      const parsedDate = parseComparableDate(formattedValue);

      if (!parsedDate) return;

      if (!latestDate || parsedDate > latestDate) {
        latestDate = parsedDate;
        latestFormattedValue = formattedValue;
      }
    });

    return latestFormattedValue;
  };

  const handleClosePROpenModal = async (selection) => {
    const selectedDetails = Array.isArray(selection?.details)
      ? selection.details
      : [];

    if (selectedDetails.length === 0) {
      updateState({ showOpenPRModal: false });
      return;
    }

    updateState({ isLoading: true, showSpinner: true, showOpenPRModal: false });

    try {
      const selectedSummary = Array.isArray(selection?.summary)
        ? selection.summary
        : [];

      const summaryByGroupId = selectedSummary.reduce((acc, row) => {
        const key = String(row?.groupId || row?.prId || row?.pr_id || "").trim();
        if (key) acc[key] = row;
        return acc;
      }, {});

      const summaryByPrNo = selectedSummary.reduce((acc, row) => {
        const key = String(row?.prNo || row?.pr_no || "").trim();
        if (key) acc[key] = row;
        return acc;
      }, {});

      const payeeVatRow = getPoGoodsVatRow(state.vendVatCode || "");
      const payeeDefaultVatCode = payeeVatRow?.vatCode || state.vendVatCode || "";
      const payeeDefaultVatName = payeeVatRow?.vatName || state.vendVatName || "";
      let payeeVatRate = parseFormattedNumber(payeeVatRow?.vatRate ?? 0);

      if (payeeDefaultVatCode && !payeeVatRate) {
        try {
          const vatRow = await useTopVatRow(payeeDefaultVatCode);
          payeeVatRate = parseFormattedNumber(vatRow?.vatRate ?? 0);
        } catch { }
      }

      const selectedPrNos = [
        ...new Set(
          selectedDetails
            .map((row) => String(row.prNo || "").trim())
            .filter(Boolean)
        ),
      ];

      const firstSummaryRow =
        selectedSummary?.[0] ||
        summaryByGroupId[String(selectedDetails?.[0]?.groupId || "").trim()] ||
        {};

      const remarksSourceRows = selectedSummary.length > 0 ? selectedSummary : selectedDetails;
      const nextRemarks = appendMissingRemarks(
        remarks,
        getUniqueOpenPRRemarks(remarksSourceRows)
      );

      const newDetailRows = selectedDetails.map((d, i) => {
        const relatedSummary =
          summaryByPrNo[String(d?.prNo || d?.pr_no || "").trim()] ||
          summaryByGroupId[String(d?.prId || d?.pr_id || d?.prID || "").trim()] ||
          summaryByGroupId[String(d?.groupId || "").trim()] ||
          firstSummaryRow ||
          {};

        const qty = parseFormattedNumber(d?.quantity || 0) || 0;
        const formattedQty = formatNumber(qty, decQty);

        const prDeliveryDate =
          d?.dateNeeded ||
          d?.delDate ||
          relatedSummary?.dateNeeded ||
          relatedSummary?.delDate ||
          "";

        const rowDateNeeded =
          formatFetchedHeaderDate(prDeliveryDate) ||
          delDate ||
          dateNeeded ||
          getDefaultDeliveryDate();

        const row = {
          lN: (detailRows?.length || 0) + i + 1,
          prNo: d?.prNo || d?.pr_no || "",
          prId: d?.prId || d?.pr_id || d?.prID || relatedSummary?.prId || relatedSummary?.pr_id || relatedSummary?.groupId || "",
          refBranchCode: d?.branchCode || relatedSummary?.branchCode || branchCode,

          invType: d?.invType || "",
          groupId: d?.groupId || "",
          poStatus: "O",

          itemCode: d?.item_code || "",
          itemName: d?.item_name || "",
          itemSpecs:
            d?.item_specs ??
            d?.itemSpecs ??
            "",
          uomCode: d?.uomCode || "",

          qtyOnHand: formatNumber(0, decQty),
          qtyAlloc: formatNumber(0, decQty),
          prBalance: formattedQty,
          poQty: formattedQty,
          rrQty: formatNumber(0, decQty),

          uomCode2: "",
          uomQty2: formatNumber(0, decQty),
          dateNeeded: rowDateNeeded,
          rcCode: relatedSummary?.rcCode || "",
          rcName: relatedSummary?.rcName || "",

          serviceCode: "",
          serviceName: "",

          unitPrice: formatNumber(0, DEC_PRICE),
          grossAmt: formatNumber(0, DEC_AMT),
          discRate: formatNumber(0, DEC_AMT),
          discAmt: formatNumber(0, DEC_AMT),
          totalAmt: formatNumber(0, DEC_AMT),

          vatCode: payeeDefaultVatCode || "",
          vatName: payeeDefaultVatName || "",
          vatRate: payeeVatRate || 0,
          vatAmt: formatNumber(0, DEC_AMT),
          netAmt: formatNumber(0, DEC_AMT),
        };

        return recalcDetailRow(row);
      });

      const updatedRows = [...(detailRows || []), ...newDetailRows];

      const selectedPrDeliveryDates = [
        ...selectedSummary.flatMap((row) => [
          row?.dateNeeded,
          row?.delDate,
        ]),
        ...selectedDetails.flatMap((row) => [
          row?.dateNeeded,
          row?.delDate,
        ]),
      ];

      const maximumSelectedPrDeliveryDate = getLatestDeliveryDate(
        selectedPrDeliveryDates
      );

      // Keep the latest date when PRs are added in separate batches.
      const nextHeaderDeliveryDate =
        getLatestDeliveryDate([
          delDate,
          dateNeeded,
          maximumSelectedPrDeliveryDate,
        ]) ||
        maximumSelectedPrDeliveryDate ||
        delDate ||
        dateNeeded ||
        "";

      // Prevent the Delivery Date effect from asking to overwrite each PR line.
      // Detail rows retain their own PR Delivery Dates; only the PO header gets
      // the maximum Delivery Date.
      deliveryDateRef.current = nextHeaderDeliveryDate;
      suppressDeliveryDatePromptRef.current = true;

      setHeader({
        dateNeeded: nextHeaderDeliveryDate,
        delDate: nextHeaderDeliveryDate,
      });

      updateState({
        detailRows: updatedRows,
        sourcePrNo: selectedPrNos.join(", "),
        showOpenPRModal: false,
        isLoading: false,
        showSpinner: false,
        rcCode: firstSummaryRow?.rcCode || rcCode,
        rcName: firstSummaryRow?.rcName || rcName,
        remarks: nextRemarks,
        dateNeeded: nextHeaderDeliveryDate,
        delDate: nextHeaderDeliveryDate,
        header: {
          ...(state.header || {}),
          dateNeeded: nextHeaderDeliveryDate,
          delDate: nextHeaderDeliveryDate,
        },
        openPR_Data_Summary: [],
        openPR_Col_Summary: [],
        openPR_Col_Detail: [],
      });

      updateTotalsDisplay(updatedRows);
    } catch (error) {
      console.error("Failed to apply selected PR details:", error);

      useSwalErrorAlert(
        "Open Purchase Requisition",
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error while applying selected PR details."
      );

      updateState({ isLoading: false, showSpinner: false });
    }
  };


  const handleOpenMSLookup = async (itemSingleSelectParam, docTypeParam) => {


    try {
      const invType = getInvTypeFromDocType(docTypeParam);
      setShowTypeDropdown(false);
      updateState({
        isLoading: true,
        itemSingleSelect: itemSingleSelectParam,
        itemLookupEndPoint: `getInvLookup${invType}`,
        selectedDocType: docTypeParam
      });
      updateState({ msLookupModalOpen: true, isLoading: false });
    } catch (error) {
      updateState({ isLoading: false });
    }
  };

  const handleAddItem = async (index, type) => {

    updateState({ selectedRowIndex: index, itemSingleSelect: true });
    await handleOpenMSLookup(true, type);
  };

  const handleCloseMSLookup = (selectedItems) => {
    if (!selectedItems) {
      updateState({ msLookupModalOpen: false });
      return;
    }

    const itemsArray = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : selectedItems.records ? [selectedItems.records] : [];

    if (itemsArray.length === 0) {
      updateState({ msLookupModalOpen: false });
      return;
    }

    const lookupInvType = getInvTypeFromDocType(state.selectedDocType);
    const isDuplicateLookupItem = (newItem) =>
      detailRows.some(
        (existingRow) =>
          existingRow.itemCode === newItem.itemCode &&
          existingRow.invType === lookupInvType
      );

    if (state.itemSingleSelect && state.selectedRowIndex !== null) {
      const singleItem = itemsArray[0];
      const isDuplicate = isDuplicateLookupItem(singleItem);

      const applySingleItem = () => {
        const updatedRows = [...detailRows];
        updatedRows[state.selectedRowIndex] = {
          ...updatedRows[state.selectedRowIndex],
          itemCode: singleItem.itemCode || "",
          itemName: singleItem.itemName || "",
          uomCode: singleItem.uomCode || singleItem.uom || "",
          qtyOnHand: formatNumber(singleItem.qtyHand ?? 0, decQty),
          unitPrice: formatNumber(singleItem.unitCost ?? 0, DEC_PRICE)
        };
        updatedRows[state.selectedRowIndex] = recalcDetailRow(updatedRows[state.selectedRowIndex]);
        updateState({ detailRows: updatedRows, itemSingleSelect: false, msLookupModalOpen: false });
        updateTotalsDisplay(updatedRows);
      };

      if (isDuplicate) {
        useSwalProceedConfirm(
          "Duplicate Item Detected",
          "This item is already in the list. Do you want to select it anyway?"
        ).then((result) => {
          if (result.isConfirmed) applySingleItem();
        });
      } else {
        applySingleItem();
      }
      return;
    }

    // Multiple Item Selection
    const duplicateItems = itemsArray.filter(newItem =>
      isDuplicateLookupItem(newItem)
    );

    const processAddition = (itemsToAdd) => {
      const today = getDefaultDeliveryDate();
      const defaultVat = getDefaultLineVat();
      const defaultVatCode = defaultVat.vatCode;
      const defaultVatName = defaultVat.vatName;
      const defaultVatRate = defaultVat.vatRate;
      const newRows = itemsToAdd.map((item) => recalcDetailRow({
        invType: lookupInvType,
        groupId: state.groupId || "",
        poStatus: "O",
        itemCode: item?.itemCode || "",
        itemName: item?.itemName || "",
        uomCode: item?.uomCode || item?.uom || "",
        qtyOnHand: formatNumber(item?.qtyHand ?? 0, decQty),
        qtyAlloc: formatNumber(0, decQty),
        prBalance: formatNumber(0, decQty),
        uomCode2: "",
        uomQty2: formatNumber(0, decQty),
        dateNeeded: delDate || today,
        itemSpecs: "",
        serviceCode: "",
        serviceName: "",
        poQty: formatNumber(0, decQty),
        rrQty: formatNumber(0, decQty),
        unitPrice: formatNumber(item?.unitCost ?? 0, DEC_PRICE),
        grossAmt: formatNumber(0, DEC_AMT),
        discRate: formatNumber(0, DEC_AMT),
        discAmt: formatNumber(0, DEC_AMT),
        totalAmt: formatNumber(0, DEC_AMT),
        vatCode: defaultVatCode,
        vatName: defaultVatName,
        vatAmt: formatNumber(0, DEC_AMT),
        netAmt: formatNumber(0, DEC_AMT),
        vatRate: defaultVatRate,
        rcCode: rcCode || "",
        rcName: rcName || "",
      }));

      const updatedRows = [...detailRows, ...newRows];
      updateState({
        detailRows: updatedRows,
        msLookupModalOpen: false,
        itemSingleSelect: false
      });
      updateTotalsDisplay(updatedRows);
    };

    if (duplicateItems.length > 0) {
      useSwalProceedConfirm(
        "Duplicate Items Detected",
        "Some items are already in the list. Do you want to add them anyway?"
      ).then((result) => {
        if (result.isConfirmed) {
          processAddition(itemsArray);
        } else {
          const uniqueOnly = itemsArray.filter(newItem =>
            !isDuplicateLookupItem(newItem)
          );
          if (uniqueOnly.length > 0) {
            processAddition(uniqueOnly);
          } else {
            updateState({ msLookupModalOpen: false });
          }
        }
      });
    } else {
      processAddition(itemsArray);
    }
  };

  const handleOpenVATLookup = (rowIndex) => {
    if (isFormDisabled) return;

    updateState({
      vatLookupModalOpen: true,
      selectedRowIndex: rowIndex,
      vatLookupContext: "detail",
      selectedSummaryKey: "",
    });
  };

  const handleCloseVATLookup = async (selectedVAT) => {
    const vatContext = state.vatLookupContext || "detail";

    if (!selectedVAT) {
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
        vatLookupContext: "",
        selectedSummaryKey: "",
      });
      return;
    }

    let vatRate = 0;
    try {
      const vatRow = await useTopVatRow(selectedVAT.vatCode || "");
      vatRate = vatRow?.vatRate ?? 0;
    } catch (err) {
      console.error("Error fetching VAT row:", err);
    }

    if (vatContext === "summary") {
      const summaryKey = state.selectedSummaryKey || "";
      const updatedRows = [...(detailRowsRef.current || detailRows || [])].map((detailRow) => {
        if (getPoSummaryGroupKey(detailRow) !== summaryKey) return detailRow;

        const nextRow = {
          ...detailRow,
          vatCode: selectedVAT.vatCode || "",
          vatName: selectedVAT.vatName || "",
          acctCode: selectedVAT.acctCode || detailRow.acctCode || "",
          vatRate,
        };

        return recalcDetailRow(nextRow);
      });

      detailRowsRef.current = updatedRows;
      updateTotalsDisplay(updatedRows);
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
        vatLookupContext: "",
        selectedSummaryKey: "",
        detailRows: updatedRows,
      });
      return;
    }

    if (selectedRowIndex == null) {
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
        vatLookupContext: "",
        selectedSummaryKey: "",
      });
      return;
    }

    const updatedRows = [...detailRows];
    const row = { ...updatedRows[selectedRowIndex] };
    row.vatCode = selectedVAT.vatCode || "";
    row.vatName = selectedVAT.vatName || "";
    row.acctCode = selectedVAT.acctCode || row.acctCode || "";
    row.vatRate = vatRate;

    const recalculated = recalcDetailRow(row);
    updatedRows[selectedRowIndex] = recalculated;
    updateTotalsDisplay(updatedRows);
    updateState({
      vatLookupModalOpen: false,
      selectedRowIndex: null,
      vatLookupContext: "",
      selectedSummaryKey: "",
      detailRows: updatedRows,
    });
  };





  const handleNotify = async () => {
    if (!documentID) return;

    const confirm = await useSwalProceedConfirm(
      "Notify Approver?",
      `Do you want to notify the 1st Level Approver for PO ${documentNo || documentID}?`,
      "Yes, notify",
    );

    if (!confirm?.isConfirmed) return;
    updateState({ showSpinner: true });

    try {
      const payload = {
        json_data: {
          tranIds: String(documentID),
          userCode: userCode || currentUserRow?.userCode,
          userName: currentUserRow?.userName || "",
          appLevel: currentUserRow?.poAppLevel || "",
          mode: "Notify",
          reason: "",
          url: `${window.location.origin}/?page=POApprovalModal`,
        },
      };

      await postRequest("approvePO", payload);
      await useSwalSuccessAlert("PO Notified", `PO ${documentNo || documentID} has been notified.`);

      if (Number(appLevel) === -1 && documentNo && branchCode) {
        await fetchTranData(documentNo, branchCode);
      }
    } catch (error) {
      useSwalErrorAlert("Notify Error", error?.message || "Unable to notify.");
    } finally {
      updateState({ showSpinner: false });
    }
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const sanitizeNumeric = (v) => {
    const raw = String(v ?? "");
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
  };

  const formatByField = (field, num) => {
    if (!Number.isFinite(num)) return "";
    if (["unitPrice"].includes(field)) return formatNumber(num, DEC_PRICE);
    if (["qtyOnHand", "prBalance", "poQty"].includes(field)) return formatNumber(num, DEC_QTY);
    if (["grossAmt", "discRate", "discAmt", "totalAmt", "vatAmt", "netAmt"].includes(field)) return formatNumber(num, DEC_AMT);
    return formatNumber(num);
  };




  const handleDetailChange = (index, field, value, commit = false) => {
    const updatedRows = [...(detailRowsRef.current || detailRows || [])];
    const row = { ...(updatedRows[index] || {}) };
    const editableFields = ["unitPrice", "poQty", "discRate", "discAmt"];

    const nonNumericFields = ["invType", "prStatus", "poStatus", "itemName", "uomCode", "vatCode", "dateNeeded", "itemSpecs", "serviceCode", "serviceName"];

    if (field === "poStatus") {
      if (value === "X" || value === "C") {
        const isCancel = value === "X";
        const actionText = isCancel ? "CANCEL" : "CLOSE";

        useSwalProceedConfirm(
          `Confirm Line ${isCancel ? "Cancellation" : "Closing"}?`,
          `Are you sure you want to ${actionText} this specific item? This action is permanent for this line and cannot be undone. You will need to add the item again if it is still required.`,
          isCancel ? "Yes, Cancel Line" : "Yes, Close Line"
        ).then((result) => {
          const nextRows = [...detailRowsRef.current];
          const nextRow = { ...(nextRows[index] || row) };

          if (result.isConfirmed) {
            if (isCancel) {
              nextRow.prBalance = formatNumber(0, decQty);
              nextRow.poQty = formatNumber(0, decQty);
              nextRow.poStatus = "X";
            } else {
              nextRow.poStatus = "C";
            }
          } else {
            nextRow.poStatus = "O";
          }

          nextRows[index] = recalcDetailRow(nextRow);
          detailRowsRef.current = nextRows;

          updateState({ detailRows: nextRows });
          updateTotalsDisplay(nextRows);
        });
        return;
      }

      row.poStatus = value || "O";
    } else if (field === "dateNeeded") {
      if (!value) {
        useSwalErrorAlert("Invalid Delivery Date", "Delivery Date is required. Delivery Date has been adjusted to match the PO Date.");
        row.dateNeeded = getDefaultDeliveryDate();
      } else if (isDateBeforePoDate(value)) {
        useSwalErrorAlert("Invalid Delivery Date", "Delivery Date cannot be before the PO Date.");
        row.dateNeeded = getDefaultDeliveryDate();
      } else {
        row.dateNeeded = value;
      }
    } else if (field === 'itemCode' && typeof value === 'object' && value !== null) {
      row["itemCode"] = value.itemCode || "";
      row["itemName"] = value.itemName || "";
      row["uomCode"] = value.uomCode || value.uom || "";
      row["qtyOnHand"] = formatNumber(value.qtyHand ?? 0, decQty);
      row["unitPrice"] = formatNumber(value.unitCost ?? 0, DEC_PRICE);
    } else if (nonNumericFields.includes(field)) {
      row[field] = value;
    } else {
      if (!editableFields.includes(field)) return;

      const sanitized = sanitizeNumeric(value);

      if (commit) {
        let num = parseFormattedNumber(sanitized);
        num = Number.isFinite(num) && num > 0 ? num : 0;

        // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ NEW: Inline Validation & Auto-Revert on input blur/enter
        if (field === "poQty" && row.prNo) {
          const maxPrBalance = parseFormattedNumber(row.prBalance || 0);

          if (num > maxPrBalance) {
            useSwalErrorAlert(
              "Invalid Quantity",
              `PO Quantity cannot exceed PR Balance.`
            );
            // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ FIX: Force the number back to the maximum allowed value
            num = maxPrBalance;
          }
        }

        if (field === "discRate" && num > 99.99) {
          useSwalErrorAlert("Invalid Discount Rate", "Discount Rate cannot exceed 99.99.");
          num = 99.99;
        }

        if (field === "discAmt") {
          const gross = parseFormattedNumber(row.grossAmt || 0);
          if (num > gross) {
            useSwalErrorAlert("Invalid Discount Amount", "Discount Amount cannot exceed Gross Amount.");
            num = gross;
          }
        }

        row[field] = formatByField(field, num);
      } else {
        row[field] = sanitized;
      }
    }

    const activeInputValue = row[field];
    const recalculatedRow = recalcDetailRow(row, field);
    if (!commit && editableFields.includes(field)) {
      recalculatedRow[field] = activeInputValue;
    }
    updatedRows[index] = recalculatedRow;
    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };






  const handleActivityOption = async (action) => {
    if (originalDocStatus !== "O" || detailRows.length === 0) {
      return;
    }

    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        selectedPoType,
        refPoNo1,
        refPoNo2,
        refPrNo2,
        rcCode,
        vendCode,
        vendNameHeader,
        remarks,
        noReprints,
        detailRows,
      } = state;

      /*
       * Delivery Date is optional.
       * Preserve blank dates as null.
       */
      const normalizedDeliveryDate = state.delDate || null;

      const rowsForSave = (detailRows || []).map((row) => ({
        ...row,
        dateNeeded: row.dateNeeded || null,
      }));

      /*
       * Validate header Delivery Date only when it has a value.
       */
      if (
        normalizedDeliveryDate &&
        isDeliveryDateEarlierThanPoDate(normalizedDeliveryDate)
      ) {
        useSwalErrorAlert(
          "Invalid Delivery Date",
          "Header Delivery Date cannot be earlier than the PO Date."
        );
        return;
      }

      /*
       * Validate detail Delivery Dates only when they have a value.
       */
      const invalidDetailIndex = rowsForSave.findIndex(
        (row) =>
          row.dateNeeded &&
          isDeliveryDateEarlierThanPoDate(row.dateNeeded)
      );

      if (invalidDetailIndex >= 0) {
        useSwalErrorAlert(
          "Invalid Delivery Date",
          `Item Detail LN # ${invalidDetailIndex + 1} Delivery Date cannot be earlier than the PO Date.`
        );
        return;
      }

      const poGrossAmount = rowsForSave.reduce(
        (sum, row) =>
          sum + (parseFormattedNumber(row.grossAmt || 0) || 0),
        0
      );

      const poDiscountAmount = rowsForSave.reduce(
        (sum, row) =>
          sum + (parseFormattedNumber(row.discAmt || 0) || 0),
        0
      );

      const poVatAmount = rowsForSave.reduce(
        (sum, row) =>
          sum + (parseFormattedNumber(row.vatAmt || 0) || 0),
        0
      );

      const poAmount = poGrossAmount - poDiscountAmount;

      const normalizedDetailRows = rowsForSave.map((row) => ({
        ...row,
        status: row.poStatus || "O",
      }));

      const hasOpenDetail = normalizedDetailRows.some(
        (row) =>
          String(row.poStatus || "O").toUpperCase() === "O"
      );

      const finalHeaderPOStatus = hasOpenDetail ? "O" : "C";

      const poData = {
        branchCode: branchCode,
        poNo: documentNo || "",
        poId: documentID || "",
        poDate: state.poDate || useGetCurrentDayV2(),
        rcCode: rcCode || "",
        vendCode: vendCode || "",
        vendName: vendNameHeader || "",
        whCode: state.WHcode || "",
        whName: state.WHname || "",
        delAddress: state.delAddress || "",
        address1: state.address1 || "",
        address2: state.address2 || "",
        address3: state.address3 || "",
        vendContact: state.vendContact || "",
        paytermCode: state.paytermCode || "",
        poType: selectedPoType || "",
        delDate: normalizedDeliveryDate,
        currCode: state.currCode || "PHP",
        currRate: parseFormattedNumber(state.currRate || "1"),
        refPoNo1: refPoNo1 || "",
        refPoNo2: refPoNo2 || "",
        refPrNo2: refPrNo2 || "",
        poAmount: parseFormattedNumber(poAmount || 0),
        vatAmount: parseFormattedNumber(poVatAmount || 0),
        discAmount: parseFormattedNumber(poDiscountAmount || 0),
        advAmount: 0,
        remarks: remarks || "",
        poStatus: finalHeaderPOStatus,
        userCode: currentUserRow?.userCode,

        dt1: rowsForSave.map((row, index) => ({
          poId: documentID || "",
          prId: row.prId || "",
          groupId: row.groupId || "",
          prNo: row.prNo || "",
          prStatus: row.prStatus || "",
          poStatus: row.poStatus || "O",
          invType: row.invType || "",
          lnNo: index + 1,
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          uomCode: row.uomCode || "",
          qtyOnHand: parseFormattedNumber(row.qtyOnHand || 0),
          prBalance: parseFormattedNumber(row.prBalance || 0),
          poQty: parseFormattedNumber(row.poQty || 0),
          unitCost: parseFormattedNumber(row.unitPrice || 0),
          grossAmount: parseFormattedNumber(row.grossAmt || 0),
          discRate: parseFormattedNumber(row.discRate || 0),
          discAmount: parseFormattedNumber(row.discAmt || 0),
          netAmount: parseFormattedNumber(row.netAmt || 0),
          vatCode: row.vatCode || "",
          vatName: row.vatName || "",
          vatAmount: parseFormattedNumber(row.vatAmt || 0),
          itemAmount: parseFormattedNumber(row.totalAmt || 0),
          rcCode: row.rcCode || "",
          rcName: row.rcName || "",
          dateNeeded: row.dateNeeded || null,
          itemSpecs: row.itemSpecs || "",
          rrQty: parseFormattedNumber(row.rrQty || 0),
        })),

        dt3: poSummaryRows.map((row, index) => ({
          poId: documentID || "",
          summaryKey: row._summaryKey || "",
          invType: row.invType || "",
          lnNo: index + 1,
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          poQty: parseFormattedNumber(row.poQty || 0),
          unitCost: parseFormattedNumber(row.unitPrice || 0),
          grossAmount: parseFormattedNumber(row.grossAmt || 0),
          discRate: parseFormattedNumber(row.discRate || 0),
          discAmount: parseFormattedNumber(row.discAmt || 0),
          netAmount: parseFormattedNumber(row.netAmt || 0),
          vatCode: row.vatCode || "",
          vatName: row.vatName || "",
          vatAmount: parseFormattedNumber(row.vatAmt || 0),
          itemAmount: parseFormattedNumber(row.totalAmt || 0),
        })),
      };


      const response = await useTransactionUpsert(docType, poData, updateState, "poId", "poNo");


      if (response) {
        const responseDocNo = response.data[0]?.poNo;
        const responseDocId = response.data[0]?.poId;

        await fetchTranData(responseDocNo, branchCode);
        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(
          handleReset,
          onSaveAndPrint
        );
      }

      updateState({
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("Error during transaction upsert:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };



  const handlePrint = async () => {
    if (!documentID) return;
    updateState({ showSignatoryModal: true });
  };


  const handleCancel = async () => {

    if (documentID && (documentStatus === "O" || documentStatus === "")) {
      updateState({ showCancelModal: true });
    }
  };


  const handlePost = async () => {
    if (documentID && documentStatus === "") {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (detailRows.length === 0) return;

    if (documentID) {
      const currentDate = useGetCurrentDayV2();

      const copiedDetailRows = (detailRows || []).map((row) => ({
        ...row,
        prNo: "",
        prId: "",
        groupId: "",
        prStatus: "",
        prBalance: formatNumber(0, decQty),
        dateNeeded: "",
        rrQty: formatNumber(0, decQty),
        poStatus: "O",
      }));

      detailRowsRef.current = copiedDetailRows;
      deliveryDateRef.current = "";
      suppressDeliveryDatePromptRef.current = true;

      setHeader({
        dateNeeded: "",
        delDate: "",
      });

      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "O",
        status: "O",
        originalDocStatus: "O",
        poDate: currentDate,
        delDate: "",
        dateNeeded: "",
        header: {
          dateNeeded: "",
          delDate: "",
        },
        poCancelled: "",
        noReprints: "0",
        appLevel: 0,
        sourcePrNo: "",
        detailRows: copiedDetailRows,
        detailRowsSummary: [],
        isDocNoDisabled: false,
        isFetchDisabled: false,
        appLevel: 0,
      });

      updateTotalsDisplay(copiedDetailRows);
    }
  };



  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);
  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const branchCode = row?.branchCode;
      if (!docNo || !branchCode) return;

      await fetchTranData(docNo, branchCode);
      setTopTab("details");
      cleanUrl(); // 
    },
    [fetchTranData, cleanUrl]
  );



  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("poNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);




  const printData = {
    pr_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && state.originalDocStatus === "O" && documentID !== null) {
      const pwd = confirmation?.password || confirmation?.userPassword || "";
      const rsn = confirmation?.reason || "";

      if (!pwd) {
        useSwalInfoAlert("Required", "Password was not captured. Please try again.");
        return;
      }

      const activeUserCode = currentUserRow?.userCode || state.userCode;

      const result = await useHandleCancel(
        docType,
        documentID,
        activeUserCode, // Dynamic user
        pwd,            // Extracted password
        rsn,            // Extracted reason
        updateState
      );

      if (result && result.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
        await fetchTranData(documentNo, branchCode);
      }
    }
    updateState({ showCancelModal: false });
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

  const handleSaveAndPrint = async (poId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(poId, docType);
    updateState({ showSpinner: false });
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

  const handleCloseRCModal = (selectedRC) => {
    if (!selectedRC) {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
      return;
    }

    const { rcCode: selectedCode, rcName: selectedName } = selectedRC;

    if (rcLookupContext === "rc") {
      const updatedRows = (detailRows || []).map((row) =>
        String(row?.prNo || "").trim()
          ? row
          : {
            ...row,
            rcCode: selectedCode,
            rcName: selectedName,
          }
      );

      detailRowsRef.current = updatedRows;
      updateState({
        rcCode: selectedCode,
        rcName: selectedName,
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        detailRows: updatedRows,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else if (rcLookupContext === "reqDept") {
      updateState({
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    }
  };

  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ payeeModalOpen: false });
      return;
    }

    updateState({ payeeModalOpen: false, isLoading: true });

    try {
      const selectedVendCode = String(selectedData?.vendCode || "").trim();

      if (!selectedVendCode) {
        updateState({ isLoading: false });
        return;
      }

      const payeeRow = await useTopPayeeRow(selectedVendCode);

      const nextVendCode = payeeRow?.vendCode || selectedVendCode;
      const nextVendName = selectedData?.vendName || payeeRow?.vendName || "";
      const nextAttention = payeeRow?.vendContact || "";
      const nextPaytermCode = payeeRow?.paytermCode || "";
      const nextCurrCode = payeeRow?.currCode || currCode || glCurrDefault || "";
      const replacementVat = getPoGoodsVatRow(payeeRow?.vatCode || "");
      const nextVatCode = replacementVat?.vatCode || payeeRow?.vatCode || "";
      const nextVatName = replacementVat?.vatName || payeeRow?.vatName || "";

      updateState({
        vendCode: nextVendCode,
        vendNameHeader: nextVendName,
        vendContact: nextAttention,
        attention: nextAttention,
        vendVatCode: nextVatCode,
        vendVatName: nextVatName,
      });

      if (nextCurrCode) {
        await handleSelectCurrency(nextCurrCode);
      }

      if (nextPaytermCode) {
        await handleSelectPayTerm(nextPaytermCode);
      } else {
        updateState({
          paytermCode: "",
          paytermName: "",
          daysDue: "",
        });
      }

      const vatRate = parseFormattedNumber(replacementVat?.vatRate ?? 0);

      if ((detailRows || []).length > 0) {
        const updatedRows = (detailRows || []).map((currentRow) =>
          recalcDetailRow({
            ...currentRow,
            vatCode: nextVatCode,
            vatName: nextVatName,
            vatRate,
          })
        );

        detailRowsRef.current = updatedRows;
        updateState({ detailRows: updatedRows });
        updateTotalsDisplay(updatedRows);
      }
    } catch (error) {
      console.error("Error in handleClosePayeeModal:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      await handleSelectCurrency(selectedCurrency.currCode);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (code) => {
    if (code) {
      const result = await useTopCurrencyRow(code);

      if (result) {
        const rate =
          code === glCurrDefault
            ? defaultCurrRate
            : await useTopForexRate(code, poDate);

        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate), 6),
        });
      }
    }
  };

  const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
      await handleSelectBillTerm(selectedBillTerm.billtermCode);
    }
    updateState({ billtermModalOpen: false });
  };

  const handleSelectBillTerm = async (billtermCodeParam) => {
    if (billtermCodeParam) {
      const result = await useTopBillTermRow(billtermCodeParam);
      if (result) {
        updateState({
          billtermCode: result.billtermCode,
          billtermName: result.billtermName,
          daysDue: result.daysDue,
        });
      }
    }
  };

  // NEW: Payterm handlers (JO-style, header only)
  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm) {
      await handleSelectPayTerm(selectedPayterm.paytermCode);
    }
    updateState({ showPaytermModal: false });
  };

  const handleSelectPayTerm = async (code) => {
    if (!code) return;

    const result = await useTopPayTermRow(code);
    if (!result) return;

    updateState({
      paytermCode: result.paytermCode,
      paytermName: result.paytermName,
      daysDue: result.daysDue,
    });
  };


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
      branchCode ||
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
    const selectedBranchCode = data.branchCode || state.branchCode || branchCode || "";

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
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const getSummaryEditKey = (summaryKey, field) => `${summaryKey || ""}||${field || ""}`;
  const summaryEditableFields = ["unitPrice", "discRate", "discAmt"];

  const getSummaryDecimalPlaces = (field) => {
    if (field === "unitPrice") return decUPrice;
    if (["discRate", "discAmt"].includes(field)) return DEC_AMT;
    return DEC_AMT;
  };

  const focusSummaryCell = (field, rowIndex) => {
    const nextEl = document.getElementById(`summary-${field}-${rowIndex}`);
    if (nextEl) {
      nextEl.focus();
      if (typeof nextEl.select === "function") nextEl.select();
    }
  };

  const focusNextSummaryCell = (field, rowIndex) => {
    if (!summaryEditableFields.includes(field)) return;

    const maxRowIndex = Math.max((poSummaryRows?.length || 1) - 1, 0);
    const nextRowIndex = Math.min(maxRowIndex, rowIndex + 1);
    focusSummaryCell(field, nextRowIndex);
  };

  const applySummaryFieldToDetailRows = async (summaryKey, field, value, changedField = field) => {
    if (!summaryKey) return;

    const sourceRows = detailRowsRef.current || detailRows || [];
    let groupRows = sourceRows.filter((detailRow) => getPoSummaryGroupKey(detailRow) === summaryKey);

    if (field === "discAmt") {
      const targetTotalDiscount = parseFormattedNumber(value || 0) || 0;
      const groupGrossTotal = groupRows.reduce(
        (sum, detailRow) => sum + (parseFormattedNumber(detailRow.grossAmt || 0) || 0),
        0
      );
      let runningDiscount = 0;
      let groupIndex = 0;

      const updatedRows = sourceRows.map((detailRow) => {
        if (getPoSummaryGroupKey(detailRow) !== summaryKey) return detailRow;

        const isLast = groupIndex === groupRows.length - 1;
        const rowGross = parseFormattedNumber(detailRow.grossAmt || 0) || 0;
        const rowDiscount = isLast
          ? targetTotalDiscount - runningDiscount
          : groupGrossTotal > 0
            ? targetTotalDiscount * (rowGross / groupGrossTotal)
            : targetTotalDiscount / Math.max(groupRows.length, 1);

        runningDiscount += rowDiscount;
        groupIndex += 1;

        const nextRow = {
          ...detailRow,
          discAmt: formatNumber(Math.max(rowDiscount, 0), DEC_AMT),
        };

        return recalcDetailRow(nextRow, "discAmt");
      });

      detailRowsRef.current = updatedRows;
      updateState({ detailRows: updatedRows });
      updateTotalsDisplay(updatedRows);
      return;
    }

    const updatedRows = sourceRows.map((detailRow) => {
      if (getPoSummaryGroupKey(detailRow) !== summaryKey) return detailRow;

      const nextRow = {
        ...detailRow,
        [field]: value,
      };

      return recalcDetailRow(nextRow, changedField);
    });

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
  };

  const commitSummaryNumericField = async (summaryKey, field, rawValue) => {
    const num = parseFormattedNumber(rawValue);
    let safeValue = Number.isFinite(num) && num > 0 ? num : 0;

    if (field === "discRate" && safeValue > 99.99) {
      useSwalErrorAlert("Invalid Discount Rate", "Discount Rate cannot exceed 99.99.");
      safeValue = 99.99;
    }

    if (field === "discAmt") {
      const summaryRow = (poSummaryRows || []).find((row) => row._summaryKey === summaryKey);
      const maxGross = parseFormattedNumber(summaryRow?.grossAmt || 0) || 0;
      if (safeValue > maxGross) {
        useSwalErrorAlert("Invalid Discount Amount", "Discount Amount cannot exceed Gross Amount.");
        safeValue = maxGross;
      }
    }

    const formattedValue = formatNumber(safeValue, getSummaryDecimalPlaces(field));
    await applySummaryFieldToDetailRows(summaryKey, field, formattedValue, field);

    setSummaryEditValues((prev) => {
      const next = { ...prev };
      delete next[getSummaryEditKey(summaryKey, field)];
      return next;
    });
  };

  const handleSummaryNumericChange = (summaryKey, field, value) => {
    const sanitizedValue = String(value ?? "").replace(/[^0-9.]/g, "");
    if (!/^\d*\.?\d*$/.test(sanitizedValue) && sanitizedValue !== "") return;

    setSummaryEditValues((prev) => ({
      ...prev,
      [getSummaryEditKey(summaryKey, field)]: sanitizedValue,
    }));
  };

  const handleOpenSummaryVATLookup = (summaryKey) => {
    if (isFormDisabled || !summaryKey) return;

    updateState({
      vatLookupModalOpen: true,
      selectedRowIndex: null,
      vatLookupContext: "summary",
      selectedSummaryKey: summaryKey,
    });
  };

  const renderPOSummaryCell = (columnKey, row, index) => {
    const columnWidth = getPoSummaryFallbackWidth(columnKey);
    const style = getPoSummaryCellStyle(columnKey, columnWidth);
    const numericColumns = [
      "poQty",
      "unitPrice",
      "grossAmt",
      "discRate",
      "discAmt",
      "totalAmt",
      "vatAmt",
      "netAmt",
    ];

    if (columnKey === "ln") {
      return (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          <div className="h-7 min-h-7 flex items-center justify-center text-xs">
            {index + 1}
          </div>
        </td>
      );
    }

    if (summaryEditableFields.includes(columnKey)) {
      const editKey = getSummaryEditKey(row._summaryKey, columnKey);
      const displayValue = Object.prototype.hasOwnProperty.call(summaryEditValues, editKey)
        ? summaryEditValues[editKey]
        : row[columnKey] || "";

      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <input
            type="text"
            id={`summary-${columnKey}-${index}`}
            className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
            value={displayValue}
            readOnly={isFormDisabled}
            disabled={isFormDisabled}
            onChange={(e) => handleSummaryNumericChange(row._summaryKey, columnKey, e.target.value)}
            onFocus={(e) => {
              if (isFormDisabled) return;
              if (parseFormattedNumber(e.target.value || 0) === 0) {
                handleSummaryNumericChange(row._summaryKey, columnKey, "");
              }
            }}
            onBlur={(e) => {
              if (isFormDisabled) return;
              commitSummaryNumericField(row._summaryKey, columnKey, e.target.value);
            }}
            onKeyDown={async (e) => {
              if (isFormDisabled || e.key !== "Enter") return;
              e.preventDefault();
              await commitSummaryNumericField(row._summaryKey, columnKey, e.currentTarget.value);
              window.setTimeout(() => focusNextSummaryCell(columnKey, index), 0);
            }}
          />
        </td>
      );
    }

    if (columnKey === "vatCode") {
      return (
        <td key={columnKey} className="global-tran-td-ui relative" style={style}>
          <div className="flex items-center">
            <input
              type="text"
              id={`summary-vatCode-${index}`}
              className="w-full global-tran-td-inputclass-ui pr-6"
              value={row.vatCode || ""}
              readOnly
              disabled={isFormDisabled}
            />
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 cursor-pointer hover:text-blue-900"
                onClick={() => handleOpenSummaryVATLookup(row._summaryKey)}
              />
            )}
          </div>
        </td>
      );
    }

    if (columnKey === "itemSpecs") {
      return (
        <td
          key={columnKey}
          className="global-tran-td-ui align-top"
          style={style}
        >
          <div className="whitespace-pre-wrap break-words py-1 text-xs leading-4">
            {row.itemSpecs || ""}
          </div>
        </td>
      );
    }

    return (
      <td
        key={columnKey}
        className={`global-tran-td-ui ${numericColumns.includes(columnKey) ? "text-right" : ""}`.trim()}
        style={style}
      >
        <div
          className={`h-7 min-h-7 flex items-center text-xs ${numericColumns.includes(columnKey) ? "justify-end" : "justify-start"
            }`}
        >
          {String(row[columnKey] ?? "")}
        </div>
      </td>
    );
  };

  const renderPODetailCell = (columnKey, row, index) => {
    const columnWidth = getPoDetailFallbackWidth(columnKey);
    const style = getPoDetailCellStyle(columnKey, columnWidth);
    const rrQty = parseFormattedNumber(row.rrQty || 0);
    const poQty = parseFormattedNumber(row.poQty || 0);
    const rowLocked = isFormDisabled || row.poStatus !== "O";
    const statusDisabled = isDocumentLocked || !documentID || row.poStatus !== "O";
    const showCancelStatusOption = !(rrQty > 0);
    const hasPartialRR = rrQty > 0 && rrQty < poQty;

    const focusNextDetailCell = (field) => {
      focusNextPoDetailRowInput(index, field, {
        rows: detailRowsRef.current || detailRows,
        zeroClearFields: poDetailEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, val) => handleDetailChange(nextIndex, nextField, val, false),
      });
    };

    const focusDetailCell = (field, nextIndex) => {
      const nextEl = document.getElementById(`${field}-${nextIndex}`);
      if (nextEl) {
        nextEl.focus();
        if (typeof nextEl.select === "function") nextEl.select();
      }
    };

    const handleGridKeyDown = (e, field, options = {}) => {
      if (options.readOnly || options.disabled || isFormDisabled) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (options.commitOnEnter) handleDetailChange(index, field, e.target.value, true);
        focusNextDetailCell(field);
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();
      if (e.key === "ArrowUp") focusDetailCell(field, Math.max(0, index - 1));
      if (e.key === "ArrowDown") focusDetailCell(field, Math.min((detailRowsRef.current || detailRows).length - 1, index + 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const editableColumns = orderedPoDetailColumns
          .map((column) => column.key)
          .filter((key) => !["ln", "prNo", "itemName", "uomCode", "grossAmt", "totalAmt", "vatAmt", "netAmt", "prBalance", "rrQty"].includes(key));
        const currentColIndex = editableColumns.indexOf(field);
        const nextColIndex = e.key === "ArrowLeft"
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
        onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
        onKeyDown={(e) => handleGridKeyDown(e, field, options)}
      />
    );

    const numericInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={row[field] || ""}
        readOnly={options.readOnly ?? isFormDisabled}
        disabled={options.disabled ?? false}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d*$/.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChange(index, field, sanitizedValue, false);
          }
        }}
        onFocus={(e) =>
          clearPoDetailZeroOnFocus(e, {
            isEditable: !(options.readOnly ?? isFormDisabled) && !(options.disabled ?? false),
            onClear: (val) => handleDetailChange(index, field, val, false),
          })
        }
        onBlur={(e) => {
          if (isFormDisabled || options.readOnly || options.disabled) return;
          handleDetailChange(index, field, e.target.value, true);
        }}
        onKeyDown={(e) => handleGridKeyDown(e, field, { ...options, commitOnEnter: true })}
      />
    );

    const detailColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      poStatus: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`poStatus-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.poStatus || "O"} onChange={(e) => handleDetailChange(index, "poStatus", e.target.value)} disabled={statusDisabled} onKeyDown={(e) => handleGridKeyDown(e, "poStatus", { disabled: statusDisabled })}><option value="O">Open</option><option value="C">Closed</option>{showCancelStatusOption && !hasPartialRR && <option value="X">Cancelled</option>}</select></td>,
      prNo: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{textInput("prNo", { readOnly: true })}</td>,
      invType: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`invType-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.invType || ""} onChange={(e) => handleDetailChange(index, "invType", e.target.value)} disabled={rowLocked || !!row.itemCode} onKeyDown={(e) => handleGridKeyDown(e, "invType", { disabled: rowLocked || !!row.itemCode })}><option value="">Select</option><option value="MS">MS</option><option value="RM">RM</option><option value="FG">FG</option></select></td>,
      itemCode: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`itemCode-${index}`} className="w-full global-tran-td-inputclass-ui pr-6" value={row.itemCode || ""} readOnly disabled={rowLocked} />{!rowLocked && row.invType && !String(row.prNo || "").trim() && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 cursor-pointer hover:text-blue-900" onClick={() => handleAddItem(index, "PO" + row.invType)} />}</div></td>,
      itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { readOnly: true })}</td>,
      itemSpecs: () => {
        const specification = String(row.itemSpecs ?? "");
        const lineCount = Math.max(
          1,
          specification.split(/\r\n|\r|\n/).length
        );

        return (
          <td
            key={columnKey}
            className="global-tran-td-ui relative align-top"
            style={style}
          >
            <div className="relative flex items-start">
              <textarea
                id={`itemSpecs-${index}`}
                className="
            w-full
            min-h-[28px]
            resize-none
            overflow-hidden
            bg-transparent
            py-1
            pr-8
            text-xs
            leading-4
            whitespace-pre-wrap
            break-words
            focus:outline-none
            focus:ring-0
          "
                value={specification}
                rows={lineCount}
                readOnly={rowLocked}
                disabled={isFormDisabled}
                onChange={(e) =>
                  handleDetailChange(
                    index,
                    "itemSpecs",
                    e.target.value,
                    false
                  )
                }
              />

              {!rowLocked && (
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute right-2 top-1.5 cursor-pointer text-blue-600 hover:text-blue-900"
                  onClick={() => openSpecsModal(index)}
                />
              )}
            </div>
          </td>
        );
      },
      uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: true })}</td>,
      poQty: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("poQty", { readOnly: rowLocked })}</td>,
      unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("unitPrice", { readOnly: rowLocked || hasDuplicatePoSummaryKey })}</td>,
      grossAmt: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("grossAmt", { readOnly: true })}</td>,
      discRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("discRate", { readOnly: rowLocked || hasDuplicatePoSummaryKey })}</td>,
      discAmt: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("discAmt", { readOnly: rowLocked || hasDuplicatePoSummaryKey })}</td>,
      totalAmt: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("totalAmt", { readOnly: true })}</td>,
      vatCode: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`vatCode-${index}`} className="w-full global-tran-td-inputclass-ui pr-6" value={row.vatCode || ""} readOnly disabled={rowLocked} />{!rowLocked && !hasDuplicatePoSummaryKey && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 cursor-pointer hover:text-blue-900" onClick={() => handleOpenVATLookup(index)} />}</div></td>,
      vatAmt: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("vatAmt", { readOnly: true })}</td>,
      netAmt: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("netAmt", { readOnly: true })}</td>,
      dateNeeded: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`dateNeeded-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={toDateInputValue(row.dateNeeded)} readOnly={rowLocked} disabled={isFormDisabled} min={toDateInputValue(poDate)} onChange={(e) => handleDetailChange(index, "dateNeeded", e.target.value, false)} onKeyDown={(e) => handleGridKeyDown(e, "dateNeeded", { readOnly: rowLocked })} /></td>,
      rcCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcCode", { readOnly: true })}</td>,
      rcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcName", { readOnly: true })}</td>,
      prBalance: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("prBalance", { readOnly: true })}</td>,
      rrQty: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("rrQty", { readOnly: true })}</td>,
    };

    return detailColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
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
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onPost={handlePost}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          onNotify={handleNotify}
          onHistory={() => setTopTab("history")}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showNotify={(hsDoc?.docApp === "Y" || maxApprovalLevel > 0) && approvalStatus !== "Approved Transaction"}
          showBIRForm={false}
          showCopyForm={true}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          disableRouteNavigation={true}
          detailsRoute="/page/PO"
          isSaveDisabled={isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) === 0)}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
          isNotifyDisabled={!documentID || displayStatus === "CANCELLED" || approvalStatus === "Approved Transaction"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        {/* Header Section */}
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div
            className={`global-tran-headerstat-div-ui ${showApprovalStatus ? "max-sm:!flex-row max-sm:!items-start max-sm:!justify-center max-sm:!gap-x-6" : ""
              } ${isViewDocument ? "max-md:!mt-0" : ""}`}
          >
            {showApprovalStatus && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => updateState({ showApprovalStatusModal: true })}
                  className="global-tran-headerstat-text-ui mx-auto block cursor-pointer rounded px-1 text-center transition-colors hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  title="View Approval Status"
                  aria-label="View Approval Status"
                >
                  Approval Status
                </button>
                <h1 className={`global-tran-stat-text-ui text-center ${approvalStatusColor}`}>{approvalStatus}</h1>
              </div>
            )}
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

        {/* Form Layout with Tabs */}
        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          {/* Tab Navigation */}
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button
              className={`global-tran-tab-padding-ui ${activeTab === "basic"
                ? "global-tran-tab-text_active-ui"
                : "global-tran-tab-text_inactive-ui"
                }`}
              onClick={() => updateState({ activeTab: "basic" })}
            >
              Basic Information
            </button>
          </div>

          {/* PO Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols- gap-4 rounded-lg relative"
            id="pr_hd"
          >
            {/* Columns 1ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“3 (Header fields) */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Branch / PO No / PO Date / Department */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Branch */}
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  readOnly
                  lookupDisabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  onLookup={() =>
                    !(state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled) &&
                    updateState({ branchModalOpen: true })
                  }
                />

                {/* PO No */}
                <FieldRenderer
                  id="poNo"
                  label="PO No."
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
                      document.getElementById("poDate")?.focus();
                    }
                  }}
                />

                {/* PO Date */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                      }`}
                  >
                    <DateFormatInput
                      id="poDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={poDate}
                      disabled={isFormDisabled}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="poDate" className="global-ref-floating-label">
                    PO Date
                  </label>
                </div>

                {/* Department */}
                <FieldRenderer
                  id="rcName"
                  label="Department"
                  type="lookup"
                  value={rcName || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "rc",
                    })
                  }
                />
              </div>

              {/* Column 2: PO Type / Payee Code / Payee Name / Payterm */}
              <div className="global-tran-textbox-group-div-ui">
                {/* PO Type */}
                <FieldRenderer
                  id="poTypes"
                  label="PO Type"
                  type="select"
                  value={selectedPoType || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => handlePrTypeChange({ target: { value: val } })}
                  options={poTypes.map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />

                {/* Payee Code */}
                <FieldRenderer
                  id="vendCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={vendCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled && updateState({ payeeModalOpen: true })
                  }
                />

                {/* Payee Name */}
                <FieldRenderer
                  id="vendName"
                  label="Payee Name"
                  required
                  type="text"
                  value={vendNameHeader || ""}
                  disabled
                />

                {/* Payterm */}
                <FieldRenderer
                  id="payTerm"
                  label="Payterm *"
                  type="lookup"
                  value={
                    paytermCode
                      ? `${paytermCode}${paytermName ? ` - ${paytermName}` : ""}`
                      : ""
                  }
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ showPaytermModal: true })}
                />

              </div>

              {/* Column 3: Currency / Rate / Attention / Warehouse / Delivery Date */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="flex gap-4">
                  <input type="hidden" id="currCode" value={currCode || ""} readOnly />

                  <div className="flex-grow w-2/3">
                    <FieldRenderer
                      id="currName"
                      label="Currency"
                      type="text"
                      value={
                        currCode
                          ? `${currCode}${currName ? ` - ${currName}` : ""}`
                          : ""
                      }
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="flex-grow">
                    <FieldRenderer
                      id="currRate"
                      label="Currency Rate"
                      type="amount"
                      value={currRate || ""}
                      disabled={isFormDisabled || glCurrDefault === currCode}
                      onChange={(val) => {
                        const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
                        if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                          updateState({ currRate: sanitizedValue });
                        }
                      }}
                      onBlur={handleCurrRateNoBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          document.getElementById("refPoNo1")?.focus();
                        }
                      }}
                      onFocus={(e) => {
                        if (!isFormDisabled && parseFormattedNumber(e.target.value) === 0) {
                          updateState({ currRate: "" });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Attention */}
                <FieldRenderer
                  id="attention"
                  label="Attention"
                  type="text"
                  value={attention || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ attention: val })}
                />

                {/* Warehouse */}
                <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  type="lookup"
                  value={state.WHname || state.WHcode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ warehouseLookupOpen: true })}
                />

                {/* Delivery Date */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                      }`}
                  >
                    <DateFormatInput
                      id="delDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={delDate || ""}
                      disabled={isFormDisabled}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="delDate" className="global-ref-floating-label">
                    Delivery Date
                  </label>
                </div>
              </div>

              {/* Column 4: Delivery Address / References / Status */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Delivery Address */}
                <FieldRenderer
                  id="delAddress"
                  label="Delivery Address"
                  type="text"
                  value={delAddress || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ delAddress: val })}
                />

                <FieldRenderer
                  id="refPoNo1"
                  label="Ref PO No. 1"
                  type="text"
                  value={refPoNo1 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refPoNo1: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refpo_no1")}
                />

                <FieldRenderer
                  id="refPoNo2"
                  label="Ref PO No. 2"
                  type="text"
                  value={refPoNo2 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refPoNo2: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refpo_no2")}
                />

                {/* PO Status */}
                <FieldRenderer
                  id="poStatus"
                  label="PO Status"
                  type="select"
                  value={getStatusCode(status)}
                  disabled={isDocumentLocked || !documentID || getStatusCode(status) !== "O"}
                  onChange={(val) => handleHeaderStatusChange(val)}
                  options={[
                    { label: "Open", value: "O" },
                    { label: "Closed", value: "C" },
                    { label: "Cancelled", value: "X" },
                  ]}
                />
              </div>

              {/* Remarks */}
              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea
                    id="remarks"
                    placeholder=""
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2"
                    value={remarks}
                    onChange={(e) => updateState({ remarks: e.target.value })}
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="remarks"
                    className="global-tran-floating-label-remarks"
                  >
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            PO DETAIL TABLE
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                type="button"
                className={`global-tran-tab-padding-ui w-32 !text-left text-left ${poDetailActiveTab === "detailed"
                  ? "global-tran-tab-text_active-ui"
                  : "global-tran-tab-text_inactive-ui"
                  }`}
                onClick={() => setPoDetailActiveTab("detailed")}
              >
                Detailed
              </button>

              {hasDuplicatePoSummaryKey && (
                <button
                  type="button"
                  className={`global-tran-tab-padding-ui w-32 !text-left text-left ${poDetailActiveTab === "summary"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                    }`}
                  onClick={() => setPoDetailActiveTab("summary")}
                >
                  Summary
                </button>
              )}
            </div>

            <div className="flex justify-end" />
          </div>

          {poDetailActiveTab === "summary" && hasDuplicatePoSummaryKey ? (
            <>
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {orderedPoSummaryColumns.map((column) =>
                          renderPoSummaryHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedPoSummaryColumns,
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {sortedPoSummaryRows.map(({ row, originalIndex }) => (
                        <tr key={originalIndex} className="global-tran-tr-ui">
                          {orderedPoSummaryColumns.map((column) => renderPOSummaryCell(column.key, row, originalIndex))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {renderPoSummaryHeaderContextMenu?.()}
                </div>
              </div>

              <div className="global-tran-tab-footer-main-div-ui">
                <div className="global-tran-tab-footer-button-div-ui" />
                <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
                  <div className="global-tran-tab-footer-total-label-ui">Total Gross Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{poSummaryTotals.totalGross}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Discount Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{poSummaryTotals.totalDiscount}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total VAT Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{poSummaryTotals.totalVat}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Net Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{poSummaryTotals.totalNet}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {orderedPoDetailColumns.map((column) =>
                          renderPoDetailHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedPoDetailColumns,
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
                      {sortedPoDetailRows.map(({ row, originalIndex }) => (
                        <tr key={originalIndex} className="global-tran-tr-ui">
                          {orderedPoDetailColumns.map((column) => renderPODetailCell(column.key, row, originalIndex))}
                          {!isFormDisabled && (
                            <td
                              className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                              style={transactionActionsCellStyle}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddBlankRow(originalIndex)}><FontAwesomeIcon icon={faPlus} /></button>
                                <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(originalIndex)}><FontAwesomeIcon icon={faTrashAlt} /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {renderPoDetailHeaderContextMenu?.()}
                </div>
              </div>

              {/* Detail Footer: Add Button + Total */}
              <div className="global-tran-tab-footer-main-div-ui">
                <div className="global-tran-tab-footer-button-div-ui">
                  <div ref={addTypeDropdownRef} className="relative inline-block">

                    {/* Polished dropdown overlay */}
                    {showTypeDropdown && (
                      <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                            Add Item
                          </div>
                        </div>

                        <div className="p-2">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                            onClick={() => {
                              setShowTypeDropdown(false);
                              handleOpenMSLookup(false, "POFG");
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <FontAwesomeIcon icon={faBoxOpen} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>Finished Goods</span>
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                  Add FG item
                                </span>
                              </div>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              FG
                            </span>
                          </button>

                          <button
                            type="button"
                            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                            onClick={() => {
                              setShowTypeDropdown(false);
                              handleOpenMSLookup(false, "POMS");
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <FontAwesomeIcon icon={faTableCellsLarge} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>Material Supplies</span>
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                  Add MS Item
                                </span>
                              </div>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              MS
                            </span>
                          </button>

                          <button
                            type="button"
                            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                            onClick={() => {
                              setShowTypeDropdown(false);
                              handleOpenMSLookup(false, "PORM");
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <FontAwesomeIcon icon={faWarehouse} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>Raw Material</span>
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                  Add RM Item
                                </span>
                              </div>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              RM
                            </span>
                          </button>

                          <div className="my-2 border-t border-slate-100 dark:border-slate-700" />

                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                            onClick={() => {
                              setShowTypeDropdown(false);
                              handleOpenPRLookup();
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                <FontAwesomeIcon icon={faFileLines} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>Open Reference PR</span>
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                  Pull items from reference PR
                                </span>
                              </div>
                            </div>
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                              PR
                            </span>
                          </button>

                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAddRowClick}
                      disabled={isFormDisabled}
                      className={`global-tran-tab-footer-button-add-ui ${isFormDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                        }`}
                      style={{
                        visibility: isFormDisabled ? "hidden" : "visible",
                      }}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
                  <div className="global-tran-tab-footer-total-label-ui">Total Gross Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalGross}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Discount Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalDiscount}</div>
                  <div className="global-tran-tab-footer-total-label-ui">VAT Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalVat}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Net Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalNet}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* HISTORY TAB */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getPOHistory"
          cacheKey={`PO:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="PO_Summary"
          branchCode={state.branchCode}
          startDate={null}
          endDate={null}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {/* MODALS */}
      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {showOpenPRModal && (
        <GlobalCombinedLookup
          isOpen={showOpenPRModal}
          title="Open Purchase Requisition"
          summarySelectionMode="multiple"
          detailSelectionMode="multiple"
          summaryColumns={openPR_Col_Summary}
          detailColumns={openPR_Col_Detail}
          summaryData={openPR_Data_Summary}
          tabTitles={["Open PR Summary", "Open PR Detail"]}
          summaryPersistKey="PRPO_OpenSummary"
          detailPersistKey="PRPO_OpenDetail"
          fetchDetailApi={async (selectedIds) => {
            const idString = Array.isArray(selectedIds)
              ? selectedIds.join(",")
              : selectedIds;

            const payload = {
              json_data: JSON.stringify({
                json_data: {
                  selectedIds: idString,
                },
              }),
            };

            updateState({ isLoading: true, showSpinner: true });

            try {
              console.log("Fetching Open PR Detail with payload:", payload);
              const response = await postRequest("getPRPO_OpenDetail", payload);

              const rawData = response?.data?.[0]?.result
                ? JSON.parse(response.data[0].result)
                : response?.data || response;

              const detailData = Array.isArray(rawData)
                ? rawData.map((row) => ({
                  ...row,
                  groupId: row.groupId || "",
                  prId: row.prId || row.pr_id || row.prID || "",
                  branchCode: row.branchCode || "",
                  branchName: row.branchName || branchName || row.branchCode || "",
                  prNo: row.prNo || row.pr_no || "",
                  ln: row.ln || "",
                  invType: row.invType || "",
                  item_code: row.item_code || "",
                  item_name: row.item_name || "",
                  item_specs: row.item_specs || "",
                  uomCode: row.uomCode || "",
                  quantity: row.quantity ?? 0,
                  dateNeeded: row.dateNeeded || row.delDate || "",
                  rcCode: row.rcCode || "",
                  rcName: row.rcName || "",
                }))
                : [];


              const selectedPRItemKeys = new Set(
                (detailRowsRef.current || detailRows || [])
                  .filter((row) =>
                    String(row?.prId || row?.prNo || "").trim() &&
                    String(row?.itemCode || "").trim()
                  )
                  .map(getOpenPRItemSelectionKey)
              );

              const availableDetailData = detailData.filter(
                (row) => !selectedPRItemKeys.has(getOpenPRItemSelectionKey(row))
              );

              return { success: true, data: availableDetailData };
            } catch (error) {
              console.error("getPRPO_OpenDetail failed:", {
                payload,
                status: error?.response?.status,
                data: error?.response?.data,
                error,
              });

              return { success: false, data: [] };
            } finally {
              updateState({ isLoading: false, showSpinner: false });
            }
          }}
          onCancel={() =>
            updateState({
              showOpenPRModal: false,
              showSpinner: false,
              isLoading: false,
              openPR_Data_Summary: [],
              openPR_Col_Summary: [],
              openPR_Col_Detail: [],
            })
          }
          onClose={handleClosePROpenModal}
        />
      )}


      {rcLookupModalOpen && (
        <RCLookupModal
          isOpen={rcLookupModalOpen}
          onClose={handleCloseRCModal}
          customParam="ActiveDept"
        />
      )}

      {currencyModalOpen && (
        <CurrLookupModal
          isOpen={currencyModalOpen}
          onClose={handleCloseCurrencyModal}
        />
      )}

      {billtermModalOpen && (
        <BillTermLookupModal
          isOpen={billtermModalOpen}
          onClose={handleCloseBillTermModal}
        />
      )}

      {custModalOpen && (
        <CustomerMastLookupModal
          isOpen={custModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
        />
      )}

      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}

      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          onClose={handleCloseWarehouseLookup}
          filter="ActiveAll"
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

      {msLookupModalOpen && (
        <ItemMastLookupModal
          isOpen={msLookupModalOpen}
          endpoint={itemLookupEndPoint}
          onClose={handleCloseMSLookup}
          onCancel={() => updateState({ msLookupModalOpen: false })}
          enableMultiSelect={!itemSingleSelect}
          docType={selectedDocType}
        />
      )}

      {vatLookupModalOpen && (
        <VATLookupModal
          isOpen={vatLookupModalOpen}
          onClose={handleCloseVATLookup}
        />
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{ branchCode, branchName, docType, documentTitle, fieldNo: "poNo" }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      <GlobalApprovalStatus
        isOpen={showApprovalStatusModal}
        onClose={() => updateState({ showApprovalStatusModal: false })}
        docType={docType}
        docNo={documentNo}
        docDate={poDate}
        status={approvalStatus}
        remarks={remarks}
        maxAppLevel={maxApprovalLevel}
        data={detailRowsApp?.[0] || {}}
      />

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default PO;
