
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faFolderOpen, faMagnifyingGlass, faPenToSquare, faPlus, faSave, faTag, faTags, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import SearchFACateg from "../../../Lookup/SearchFACateg.jsx";
import SearchFAClass from "../../../Lookup/SearchFAClass.jsx";
import SearchFALoc from "../../../Lookup/SearchFALoc.jsx";
import SearchCutoffRef from "../../../Lookup/SearchCutoffRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import SearchPPETag from "../../../Lookup/SearchPPETag.jsx";
import { apiClient, fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";

// Global / NAYSA components
import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalHandleOpenSpecsModal,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalvalidateRequiredFields as validateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypePDFGuide, docTypeVideoGuide, glAccountFilter } from "@/NAYSA Cloud/Global/doctype";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { useTopCutOffRow, useTopPayeeRow } from "@/NAYSA Cloud/Global/top1RefTable";
import {
  useFetchTranData,
  useFieldLenghtCheck as fieldLenghtCheck,
  useGetFieldLength,
  useGenerateGLEntries,
  useHandleCancel,
  useTransactionUpsert,
} from "@/NAYSA Cloud/Global/procedure";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const assetDetailColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "poId", label: "PO ID", width: 120 },
  { key: "groupId", label: "Group ID", width: 140 },
  { key: "poNo", label: "PO No.", width: 120 },
  { key: "itemCode", label: "Item Code", width: 120 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "remarks", label: "Asset Other Specification", width: 180 },
  { key: "receivedQty", label: "RR Quantity", width: 105, align: "text-right" },
  { key: "unit", label: "UOM", width: 70, align: "text-center" },
  { key: "unitCost", label: "Unit Cost", width: 105, align: "text-right" },
  { key: "amount", label: "Amount", width: 120, align: "text-right" },
  { key: "vat", label: "VAT", width: 90 },
  { key: "vatAmount", label: "VAT Amount", width: 120, align: "text-right" },
  { key: "netAmount", label: "Net Amount", width: 120, align: "text-right" },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category", width: 200 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 200 },
  { key: "eul", label: "EUL (Month)", width: 105, align: "text-center" },
  { key: "depStartCutoff", label: "Depreciation Start Code", width: 145, align: "text-center" },
  { key: "depStartCutoffName", label: "Depreciation Start", width: 180, align: "text-center" },
  { key: "acqCost", label: "Acq. Cost (per Unit)", width: 150, align: "text-right" },
  { key: "salvagePercent", label: "Salvage Value %", width: 125, align: "text-right" },
  { key: "salvageValue", label: "Salvage Val (per Unit)", width: 155, align: "text-right" },
  { key: "serialNo", label: "Serial No.", width: 145 },
  { key: "brandModel", label: "Brand / Model", width: 155 },
  { key: "location", label: "Location", width: 150, align: "text-center" },
  { key: "warrantyExpiry", label: "Warranty Expiry", width: 120, align: "text-center" },
  { key: "poQty", label: "PO Balance", width: 100, align: "text-right" },
  { key: "rcCode", label: "RC Code", width: 100, align: "text-center" },
];

const serialBreakdownColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "acqCost", label: "Acq. Cost (per Unit)", width: 150, align: "text-right" },
  { key: "groupId", label: "Group ID", width: 140 },
  { key: "serialGroupId", label: "Serial Group ID", width: 150 },
  { key: "empNo", label: "Emp No.", width: 120 },
  { key: "serialNo", label: "Serial No.", width: 132 },
  { key: "assetTag", label: "Property Tag", width: 150 },
  { key: "assignedTo", label: "Assigned To", width: 180 },
  { key: "rcCode", label: "Department", width: 118, align: "text-center" },
  { key: "location", label: "Location", width: 105, align: "text-center" },
  { key: "tagPreview", label: "Tag", width: 48, align: "text-center" },
];

const calculateAcqCost = (row, overrides = {}) => {
  const nextRow = { ...row, ...overrides };
  const netAmount = parseFormattedNumber(nextRow.netAmount || 0);
  const rrQuantity = parseFormattedNumber(nextRow.receivedQty || 0);
  if (!rrQuantity) return "0.00";
  return formatNumber(netAmount / rrQuantity);
};

const capSalvageValue = (salvageValue, acqCost) =>
  Math.min(Math.max(parseFormattedNumber(salvageValue || 0), 0), Math.max(parseFormattedNumber(acqCost || 0), 0));

const extractLookupRows = (value) => {
  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed?.[0]?.dt1)) return parsed[0].dt1;
    if (Array.isArray(parsed?.dt1)) return parsed.dt1;
    if (Array.isArray(parsed?.data?.[0]?.dt1)) return parsed.data[0].dt1;
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.error("Open PO lookup parse error:", error);
  }

  return [];
};

const getNextMonthCutoff = (dateValue) => {
  const fallbackDate = new Date();
  let sourceDate = fallbackDate;

  if (dateValue) {
    const value = String(dateValue).trim();
    const displayParts = value.split("/");

    if (displayParts.length === 3) {
      const [month, day, year] = displayParts.map((part) => Number(part));
      const parsedDate = new Date(year, month - 1, day);

      if (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      ) {
        sourceDate = parsedDate;
      }
    } else {
      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) sourceDate = parsedDate;
    }
  }

  const nextMonthIndex = sourceDate.getMonth() + 1;
  const nextMonthDate = new Date(sourceDate.getFullYear(), nextMonthIndex, 1);
  const year = nextMonthDate.getFullYear();
  const month = String(nextMonthDate.getMonth() + 1).padStart(2, "0");

  return `${year}${month}`;
};

const getCutoffFromDate = (dateValue) => {
  const fallbackDate = new Date();
  let sourceDate = fallbackDate;

  if (dateValue) {
    const value = String(dateValue).trim();
    const displayParts = value.split("/");

    if (displayParts.length === 3) {
      const [month, day, year] = displayParts.map((part) => Number(part));
      const parsedDate = new Date(year, month - 1, day);

      if (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      ) {
        sourceDate = parsedDate;
      }
    } else {
      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) sourceDate = parsedDate;
    }
  }

  const year = sourceDate.getFullYear();
  const month = String(sourceDate.getMonth() + 1).padStart(2, "0");

  return `${year}${month}`;
};



const FARR = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
    getReplacementVatRow,
    getAllTopVatAmount,
  } = useAuth();
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const docType = "FARR";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide[docType] || "";
  const videoLink = docTypeVideoGuide[docType] || "";
  const documentTitle = `${hsDoc?.docName || "Fixed Assets Receiving"} Transaction`;
  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [detailTab, setDetailTab] = useState("itemDetails");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedSerialRowIndex, setSelectedSerialRowIndex] = useState(null);
  const [selectedPpeTagRow, setSelectedPpeTagRow] = useState(null);
  const [showAddTypeDropdown, setShowAddTypeDropdown] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [glRows, setGlRows] = useState([]);
  const [serialRows, setSerialRows] = useState([]);
  const [assetDetailRows, setAssetDetailRows] = useState([]);
  const [editingSupplementIndex, setEditingSupplementIndex] = useState(null);
  const itemDetailsRef = useRef(null);
  const addTypeDropdownRef = useRef(null);

  const [state, setState] = useState({
    branchCode: currentUserRow?.branchCode || "HO",
    branchName: currentUserRow?.branchName || "HO - Head Office",
    farrNo: "",
    farrDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",
    userCode: currentUserRow?.userCode || "",
    documentID: "",
    PayeeCode: "",
    PayeeName: "",
    PayeeVatCode: "",
    PayeeVatName: "",
    rrType: "FARR01",
    farrTypes: [],
    referenceNo: "",
    siNo: "",
    siDate: "",
    currCode: companyInfo?.currCode || "USD",
    currName: companyInfo?.currName || "",
    currRate: "1.000000",
    glCurrMode: companyInfo?.glCurrMode || "",
    glCurrDefault: companyInfo?.currCode || "USD",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",
    remarks: "",
    warrantyStartDate: "",
    warrantyExpiryDate: "",
    warrantyMonths: "",
    warrantyNotes: "",
    accountModalSource: null,
    branchModalOpen: false,
    payeeModalOpen: false,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    showSlModal: false,
    showFaCategoryModal: false,
    showFaClassModal: false,
    faClassLookupCategCode: "",
    showFaLocModal: false,
    showCutoffModal: false,
    itemLookupModalOpen: false,
    itemLookupEndPoint: "getInvLookupMS",
    selectedDocType: "FARR",
    poLookupModalOpen: false,
    openPODataSummary: [],
    openPORRColSummary: [],
    openPORRColDetail: [],
    tblFieldArray: [],
    showCancelModal: false,
    showAttachModal: false,
    showAllTranDocNo: false,
    showSignatoryModal: false,
    isLoading: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
  });

  const selectedRow = detailRows[selectedRowIndex] || detailRows[0] || {};
  const isSupplementEditing = editingSupplementIndex === selectedRowIndex;
  const displayStatus = (state.status || "OPEN").toUpperCase();
  const isPostedOrCancelled = ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(displayStatus);
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isViewDocumentUrl = isViewDocument;
  const isFormDisabled = isViewDocumentUrl || isPostedOrCancelled;
  const canEditSupplementDetails = isSupplementEditing && !isFormDisabled;
  const isRegularReceiving = String(state.rrType || "").toUpperCase() === "FARR01";
  const hasReceivingDetails = (detailRows?.length || 0) > 0;
  const isPayeeLookupDisabled = isFormDisabled || (isRegularReceiving && hasReceivingDetails);
  const isCurrRateDisabled = isFormDisabled || state.glCurrDefault === state.currCode;
  const withCostAmount = currentUserRow?.viewCostamt !== "N";

  const glColumns = [
    { key: "ln", label: "LN", width: 56, align: "text-center" },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "debit", label: `Debit (${state.glCurrDefault})`, width: 140, align: "text-right" },
    { key: "credit", label: `Credit (${state.glCurrDefault})`, width: 140, align: "text-right" },
    ...(state.withCurr2
      ? [
          { key: "debitFx1", label: `Debit (${state.withCurr3 ? state.glCurrGlobal2 : state.currCode})`, width: 140, align: "text-right" },
          { key: "creditFx1", label: `Credit (${state.withCurr3 ? state.glCurrGlobal2 : state.currCode})`, width: 140, align: "text-right" },
        ]
      : []),
    ...(state.withCurr3
      ? [
          { key: "debitFx2", label: `Debit (${state.glCurrGlobal3})`, width: 140, align: "text-right" },
          { key: "creditFx2", label: `Credit (${state.glCurrGlobal3})`, width: 140, align: "text-right" },
        ]
      : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 140 },
  ];

  const {
    getColumnStyle: getFarrDetailColumnStyle,
    getFrozenColumnStyle: getFarrDetailFrozenStyle,
    getOrderedColumns: getOrderedFarrDetailColumns,
    getSortedRows: getSortedFarrDetailRows,
    setHiddenColumnKeys: setFarrDetailHiddenColumnKeys,
    clearAllSorting: clearFarrDetailSorting,
    clearZeroValueOnFocus: clearFarrDetailZeroOnFocus,
    focusNextRowInput: focusNextFarrDetailRowInput,
    renderHeaderContextMenu: renderFarrDetailHeaderContextMenu,
    renderResizableHeader: renderFarrDetailHeader,
  } = useResizableTableColumns(assetDetailColumns);
  const orderedFarrDetailColumns = getOrderedFarrDetailColumns(assetDetailColumns);
  const getFarrDetailFallbackWidth = (key) =>
    assetDetailColumns.find((column) => column.key === key)?.width || 120;
  const getFarrDetailCellStyle = (key, fallbackWidth) => ({
    ...getFarrDetailColumnStyle(key, fallbackWidth),
    ...getFarrDetailFrozenStyle(key, orderedFarrDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedFarrDetailRows = getSortedFarrDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  useEffect(() => {
    const hiddenColumns = ["poId", "groupId", "categCode", "classCode", "depStartCutoff", "salvagePercent"];

    if (!withCostAmount) {
      hiddenColumns.push("unitCost", "amount", "vatAmount", "netAmount", "acqCost", "salvageValue");
    }

    if (String(state.rrType || "").toUpperCase() === "FARR02") {
      hiddenColumns.push("poNo", "poQty");
    }

    setFarrDetailHiddenColumnKeys([...new Set(hiddenColumns)]);
  }, [setFarrDetailHiddenColumnKeys, state.rrType, withCostAmount]);

  const {
    getColumnStyle: getFarrSerialColumnStyle,
    getFrozenColumnStyle: getFarrSerialFrozenStyle,
    getOrderedColumns: getOrderedFarrSerialColumns,
    getSortedRows: getSortedFarrSerialRows,
    setHiddenColumnKeys: setFarrSerialHiddenColumnKeys,
    clearZeroValueOnFocus: clearFarrSerialZeroOnFocus,
    focusNextRowInput: focusNextFarrSerialRowInput,
    renderHeaderContextMenu: renderFarrSerialHeaderContextMenu,
    renderResizableHeader: renderFarrSerialHeader,
  } = useResizableTableColumns(serialBreakdownColumns);
  const orderedFarrSerialColumns = getOrderedFarrSerialColumns(serialBreakdownColumns);
  const getFarrSerialFallbackWidth = (key) =>
    serialBreakdownColumns.find((column) => column.key === key)?.width || 120;
  const getFarrSerialCellStyle = (key, fallbackWidth) => ({
    ...getFarrSerialColumnStyle(key, fallbackWidth),
    ...getFarrSerialFrozenStyle(key, orderedFarrSerialColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedFarrSerialRows = getSortedFarrSerialRows(
    serialRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  useEffect(() => {
    const hiddenColumns = ["acqCost", "groupId", "serialGroupId", "empNo"];

    if (!withCostAmount) {
      hiddenColumns.push("acqCost");
    }

    setFarrSerialHiddenColumnKeys([...new Set(hiddenColumns)]);
  }, [setFarrSerialHiddenColumnKeys, withCostAmount]);

  const getPreviewableSerialRows = (rows = serialRows) =>
    (Array.isArray(rows) ? rows : []).filter((row) => row?.assetTag || row?.serialNo);

  const handlePreviewAllPpeTags = () => {
    const previewRows = getPreviewableSerialRows();

    if (previewRows.length === 0) {
      useSwalErrorAlert("Property Tag", "No serial rows available for tag preview.");
      return;
    }

    setSelectedPpeTagRow({
      detailRow: selectedRow,
      serialRows: previewRows,
    });
  };

  useEffect(() => {
    if (!withCostAmount && detailTab === "glEntries") {
      setDetailTab("itemDetails");
    }
  }, [detailTab, withCostAmount]);

  const {
    getColumnStyle: getFarrGlColumnStyle,
    getFrozenColumnStyle: getFarrGlFrozenStyle,
    getOrderedColumns: getOrderedFarrGlColumns,
    getSortedRows: getSortedFarrGlRows,
    setColumnOrder: setFarrGlColumnOrder,
    clearAllSorting: clearFarrGlSorting,
    clearZeroValueOnFocus: clearFarrGlZeroOnFocus,
    focusNextRowInput: focusNextFarrGlRowInput,
    renderHeaderContextMenu: renderFarrGlHeaderContextMenu,
    renderResizableHeader: renderFarrGlHeader,
  } = useResizableTableColumns(glColumns);
  const orderedFarrGlColumns = getOrderedFarrGlColumns(glColumns);
  const getFarrGlFallbackWidth = (key) =>
    glColumns.find((column) => column.key === key)?.width || 120;
  const getFarrGlCellStyle = (key, fallbackWidth) => ({
    ...getFarrGlColumnStyle(key, fallbackWidth),
    ...getFarrGlFrozenStyle(key, orderedFarrGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setFarrGlColumnOrder(glColumns.map((column) => column.key));
  }, [
    setFarrGlColumnOrder,
    state.withCurr2,
    state.withCurr3,
    state.glCurrDefault,
    state.currCode,
    state.glCurrGlobal2,
    state.glCurrGlobal3,
  ]);
  const sortedFarrGlRows = getSortedFarrGlRows(
    glRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const farrDetailEnterNextRowZeroClearFields = [
    "receivedQty",
    "unitCost",
    "amount",
    "vatAmount",
    "netAmount",
    "salvagePercent",
    "salvageValue",
    "poQty",
  ];
  const farrGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];

  const totals = useMemo(() => {
    const totalQty = detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.receivedQty || 0), 0);
    const totalAmount = detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.amount || 0), 0);
    const totalVatAmount = detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.vatAmount || 0), 0);
    const totalNetAmount = detailRows.reduce((sum, row) => sum + parseFormattedNumber(row.netAmount || 0), 0);
    return {
      totalQty,
      totalAmount: formatNumber(totalAmount),
      totalVatAmount: formatNumber(totalVatAmount),
      totalNetAmount: formatNumber(totalNetAmount),
    };
  }, [detailRows]);

  const glTotals = useMemo(() => {
    const sumField = (field) =>
      glRows.reduce((sum, row) => sum + (parseFormattedNumber(row[field]) || 0), 0);
    return {
      totalDebit: formatNumber(sumField("debit")),
      totalCredit: formatNumber(sumField("credit")),
      totalDebitFx1: formatNumber(sumField("debitFx1")),
      totalCreditFx1: formatNumber(sumField("creditFx1")),
      totalDebitFx2: formatNumber(sumField("debitFx2")),
      totalCreditFx2: formatNumber(sumField("creditFx2")),
    };
  }, [glRows]);

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));
  const tblFieldArray = state.tblFieldArray || [];
  const referenceNoMaxLength = useGetFieldLength(tblFieldArray, "reference_no");
  const siNoMaxLength = useGetFieldLength(tblFieldArray, "si_no");
  const serialNoMaxLength = useGetFieldLength(tblFieldArray, "serial_no");
  const tagNoMaxLength = useGetFieldLength(tblFieldArray, "tag_no");

  const loadCurrencyMode = (mode = state.glCurrMode, defaultCurr = state.glCurrDefault, curr = state.currCode) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 = (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

    updateState({
      glCurrMode: mode,
      withCurr2: calcWithCurr2,
      withCurr3: calcWithCurr3,
    });
  };

  useEffect(() => {
    if (state.glCurrMode && state.glCurrDefault && state.currCode) {
      loadCurrencyMode(state.glCurrMode, state.glCurrDefault, state.currCode);
    }

    if (state.glCurrDefault && state.currCode && state.glCurrDefault === state.currCode && parseFormattedNumber(state.currRate || 0) !== 1) {
      updateState({ currRate: formatNumber(1, 6) });
    }
  }, [state.glCurrMode, state.glCurrDefault, state.currCode, state.currRate]);

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const hdtblcol_result = await fieldLenghtCheck(
        "farr_hd,farr_dt1,farr_dt2,farr_dt3"
      );

      if (hdtblcol_result) {
        updateState({ tblFieldArray: hdtblcol_result });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  useEffect(() => {
    if (!showAddTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowAddTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddTypeDropdown]);

  useEffect(() => {
    loadCompanyData();
  }, []);



  useEffect(() => {
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown?.("FARRTRAN_TYPE", docType) || [];
    updateState({
      farrTypes: filteredTypes,
      rrType: state.rrType || filteredTypes[0]?.DROPDOWN_CODE || "FARR01",
    });
  }, [docType, getAllDropDown, refsLoaded]);



const fetchTranData = async (documentNo, branchCode, direction = "") => {
  const resetState = () => {
    updateState({ farrNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
    setDetailRows([]);
    setGlRows([]);
    setSerialRows([]);
    setAssetDetailRows([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode, docType, "farrNo", direction);

    if (!data?.farrId) {
      useSwalErrorAlert("No Records Found", "Transaction does not exist.");
      return resetState();
    }

    const retrievedDetailRows = await Promise.all((data.dt1 || []).map(async (item) => {
      const rrQuantity = parseFormattedNumber(item.rrQuantity || 0);
      const netAmount = parseFormattedNumber(item.netAmount || 0);
      const cutoffRow = await useTopCutOffRow(item.depStartCutoff || "");

      return {
        ...item,
        poId: item.poId || "",
        groupId: item.groupId || "",
        poNo: item.poNo || "",
        itemCode: item.itemCode || "",
        assetDescription: item.assetDescription || "",
        remarks: item.remarks || "",
        rcCode: item.rcCode || "",
        rcName: item.rcName || "",
        poQty: formatNumber(item.poQuantity || 0),
        receivedQty: formatNumber(item.rrQuantity || 0),
        unit: item.uomCode || "",
        unitCost: formatNumber(item.unitCost || 0),
        amount: formatNumber(item.amount || 0),
        vat: item.vatCode || "",
        vatRate: formatNumber(item.vatRate || 0),
        vatAmount: formatNumber(item.vatAmount || 0),
        netAmount: formatNumber(item.netAmount || 0),
        acqCost: formatNumber(item.acqCost ?? (rrQuantity ? netAmount / rrQuantity : 0)),
        categCode: item.categCode || "",
        categName: item.categName || "",
        classCode: item.classCode || "",
        className: item.className || "",
        eul: item.eul || "0",
        depStartCutoff: item.depStartCutoff || "",
        depStartCutoffName: cutoffRow?.cutoffName || "",
        salvagePercent: formatNumber(item.salvagePercent || 0),
        salvageValue: formatNumber(item.salvageValue || 0),
        serialNo: item.serialNo || "",
        brandModel: item.brandModel || "",
        location: item.flocCode || "",
        warrantyStartDate: useformatToDatev2(item.warrantyStartDate || ""),
        warrantyExpiry: useformatToDatev2(item.warrantyExpiryDate || ""),
        warrantyMonths: item.warrantyMonths || "",
        warrantyNotes: item.warrantyNotes || "",
      };
    }));

    const formattedGLRows = (data.dt2 || []).map((glRow) => ({
      ...glRow,
      debit: formatNumber(glRow.debit || 0),
      credit: formatNumber(glRow.credit || 0),
      debitFx1: formatNumber(glRow.debitFx1 || 0),
      creditFx1: formatNumber(glRow.creditFx1 || 0),
      debitFx2: formatNumber(glRow.debitFx2 || 0),
      creditFx2: formatNumber(glRow.creditFx2 || 0),
      slRefDate: useformatToDatev2(glRow.slRefDate || ""),
    }));

    const retrievedSerialRows = (data.dt3 || []).map((row) => ({
      ...row,
      empNo: row.empCode || "",
      empCode: row.empCode || "",
      groupId: row.groupId || "",
      serialGroupId: row.serialGroupId || "",
      acqCost: formatNumber(row.acqCost || 0),
      serialNo: row.serialNo || "",
      assetTag: row.assetTag || "",
      assignedTo: row.empName || "",
      location: row.flocCode || "",
    }));

    updateState({
      documentStatus: data.farrHStatus || "",
      status: data.status || "OPEN",
      noReprints: data.noReprints || "0",
      documentID: data.farrId || "",
      farrNo: data.farrNo || "",
      branchCode: data.branchCode || "",
      branchName: data.branchName || "",
      farrDate: useformatToDatev2(data.farrDate || ""),
      rrType: data.farrTranType || "FARR01",
      PayeeCode: data.vendCode || "",
      PayeeName: data.vendName || "",
      referenceNo: data.referenceNo || "",
      siNo: data.siNo || "",
      siDate: useformatToDatev2(data.siDate || ""),
      currCode: data.currCode || companyInfo?.currCode || "PHP",
      currName: data.currName || companyInfo?.currName || "",
      currRate: formatNumber(data.currRate || 1, 6),
      remarks: data.remarks || "",
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

    setDetailRows(retrievedDetailRows);
    setGlRows(formattedGLRows);
    setAssetDetailRows(retrievedSerialRows);
    setSerialRows([]);
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    useSwalErrorAlert("Fetch Error", error.message);
    resetState();
  } finally {
    updateState({ isLoading: false });
  }
};

  const sampleAlert = (title) => {
    useSwalErrorAlert(title, "Sample data only for Fixed Assets Receiving screen design.");
  };

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    const calcWithCurr3 = state.glCurrMode === "T";
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2: (state.glCurrMode === "M" && state.glCurrDefault !== state.currCode) || state.glCurrMode === "D" || calcWithCurr3,
      withCurr3: calcWithCurr3,
    });
  };



  const createTempGroupId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const randomValue = Math.floor(Math.random() * 16);
      const value = char === "x" ? randomValue : (randomValue & 0x3) | 0x8;
      return value.toString(16);
    });
  };

  const getDetailRowGroupId = (row = {}) =>
    String(row.groupId || "").trim();

  const getDepStartCutoffFields = async (dateValue = state.farrDate) => {
    const depStartCutoff = getNextMonthCutoff(dateValue);
    const cutoffRow = await useTopCutOffRow(depStartCutoff);

    return {
      depStartCutoff,
      depStartCutoffName: cutoffRow?.cutoffName || "",
    };
  };

  const syncAssetDetailRowsForSave = () => {
    const finalDetailRows = detailRows.map((row) => {
      const groupId = getDetailRowGroupId(row) || createTempGroupId();
      return { ...row, groupId };
    });

    let workingAssetRows = [...assetDetailRows];

    if (isSupplementEditing && selectedRowIndex !== null) {
      const selectedGroupId = finalDetailRows[selectedRowIndex]?.groupId || "";
      if (selectedGroupId) {
        workingAssetRows = [
          ...workingAssetRows.filter((row) => row.groupId !== selectedGroupId),
          ...serialRows.map((row) => ({ ...row, groupId: selectedGroupId })),
        ];
      }
    }

    const finalAssetDetailRows = finalDetailRows.flatMap((detailRow) =>
      buildSerialRowsFromDetail(detailRow, workingAssetRows)
    );

    setDetailRows(finalDetailRows);
    setAssetDetailRows(finalAssetDetailRows);

    return { finalDetailRows, finalAssetDetailRows };
  };

  const handleActivityOption = async (action) => {
   if (isFormDisabled) {
    return;
  }

   if ((detailRows?.length || 0) + (glRows?.length || 0) === 0) {
    return;
  }

  if (state.documentStatus === "") {
    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        farrNo,
        documentID,
        farrDate,
        rrType,
        PayeeCode,
        PayeeName,
        referenceNo,
        siNo,
        siDate,
        currCode,
        currRate,
        remarks,
        userCode,
      } = state;

      let finalDetailRowsGL = [...glRows];
      const { finalDetailRows, finalAssetDetailRows } = syncAssetDetailRowsForSave();

      const buildGlData = (glRows) => ({
        branchCode: branchCode,
        farrNo: farrNo || "",
        farrId: documentID || "",
        farrDate: farrDate,
        farrTranType: rrType || "FARR01",
        vendCode: PayeeCode || "",
        vendName: PayeeName || "",
        referenceNo: referenceNo || "",
        siNo: siNo || "",
        siDate: siDate || "",
        currCode: currCode || companyInfo?.currCode || "PHP",
        currRate: parseFormattedNumber(currRate || 1),
        remarks: remarks || "",
        userCode: userCode || currentUserRow?.userCode || "",

        dt1: finalDetailRows.map((row, index) => ({
          lnNo: String(index + 1),
          poId: row.poId || "",
          poNo: row.poNo || "",
          groupId: row.groupId || "",
          itemCode: row.itemCode || "",
          assetDescription: row.assetDescription || "",
          categCode: row.categCode || "",
          classCode: row.classCode || "",
          remarks: row.remarks || "",
          rcCode: row.rcCode || "",
          poQuantity: parseFormattedNumber(row.poQty || 0),
          rrQuantity: parseFormattedNumber(row.receivedQty || 0),
          uomCode: row.unit || "",
          unitCost: parseFormattedNumber(row.unitCost || 0),
          amount: parseFormattedNumber(row.amount || 0),
          vatCode: row.vat || row.vatCode || "",
          vatRate: parseFormattedNumber(row.vatRate || 0),
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          netAmount: parseFormattedNumber(row.netAmount || 0),
          serialNo: row.serialNo || "",
          brandModel: row.brandModel || "",
          eul: parseFormattedNumber(row.eul || 0),
          depStartCutoff: row.depStartCutoff || "",
          salvagePercent: parseFormattedNumber(row.salvagePercent || 0),
          salvageValue: parseFormattedNumber(row.salvageValue || 0),
          flocCode: row.location || "",
          warrantyStartDate: row.warrantyStartDate || "",
          warrantyExpiryDate: row.warrantyExpiry || "",
          warrantyMonths: parseFormattedNumber(row.warrantyMonths || 0),
          warrantyNotes: row.warrantyNotes || "",
        })),

        dt2: glRows.map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          acctName: entry.acctName || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || "",
          vatCode: entry.vatCode || "",
          atcCode: entry.atcCode || "",
          debit: parseFormattedNumber(entry.debit || 0),
          credit: parseFormattedNumber(entry.credit || 0),
          debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
          creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
          debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
          creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
          slRefNo: entry.slRefNo || "",
          slRefDate: entry.slRefDate || null,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || "",
        })),

        dt3: finalAssetDetailRows.map((row, index) => ({
          lnNo: String(index + 1),
          groupId: row.groupId || "",
          serialGroupId: row.serialGroupId || "",
          serialNo: row.serialNo || "",
          assetTag: row.assetTag || "",
          empCode: row.empCode || row.empNo || "",
          empName: row.assignedTo || row.empName || "",
          flocCode: row.location || "",
          acqCost: parseFormattedNumber(row.acqCost || 0),
        })),
      });

     if (action === "GenerateGL") {
          try {
            setGlRows([]);
            updateState({ isGeneratingGL: true });
    
            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildGlData(finalDetailRowsGL)
            );

          
            setGlRows(newGlEntries && newGlEntries.length > 0 ? newGlEntries : []);
            updateState({ isGeneratingGL: false });
          } catch (error) {
            setGlRows([]);
            updateState({ isGeneratingGL: false });
            console.error(error);
          }
          return;
        }

      if (action === "Upsert") {
        const eulRequiredFields = Array.isArray(detailRows)
          ? detailRows.reduce((fields, row, index) => {
              fields[`Receiving Details Line ${index + 1}: EUL`] = row?.eul;
              fields[`Receiving Details Line ${index + 1}: Depreciation Start`] = row?.depStartCutoff;
              return fields;
            }, {})
          : {};

        const eulIsValid = await validateRequiredFields(eulRequiredFields, "Save FARR");
        if (!eulIsValid) return;

        const invalidSalvageIndex = detailRows.findIndex(
          (row) => parseFormattedNumber(row.salvageValue || 0) > parseFormattedNumber(row.acqCost || 0)
        );

        if (invalidSalvageIndex >= 0) {
          useSwalErrorAlert(
            "Invalid Salvage Value",
            `Salvage Val (per Unit) must not exceed Acq. Cost (per Unit) on line ${invalidSalvageIndex + 1}.`
          );
          return;
        }

        if (finalDetailRowsGL.length === 0) {
          const newGlEntries = await useGenerateGLEntries(
            docType,
            buildGlData([])
          );

          if (!newGlEntries || newGlEntries.length === 0) {
            console.warn("GL entries generation failed or returned no data.");
            return;
          }

          finalDetailRowsGL = newGlEntries;
          setGlRows(newGlEntries);
        }

        const response = await useTransactionUpsert(
          docType,
          buildGlData(finalDetailRowsGL),
          updateState,
          "farrId",
          "farrNo"
        );

  
          if (response) {
                  const responseDocNo =  response.data[0].farrNo;
                  const responseDocId =  response.data[0].farrId;
        
                  await fetchTranData(responseDocNo,branchCode);
        
                  const isZero = Number(state.noReprints) === 0;
                  const onSaveAndPrint = isZero
                    ? () => updateState({ showSignatoryModal: true })
                    : () => handleSaveAndPrint(responseDocId);
        
                  useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
                  updateState({
                    farrNo: responseDocNo,
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
  }
};


  const handleSave = () => handleActivityOption("Upsert");
  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (state.documentID) {
      updateState({ showSignatoryModal: true });
    }
  };
  const handlePost = () => sampleAlert("Post FARR");
  const handleReset = () => {
    clearFarrDetailSorting();
    clearFarrGlSorting();
    setShowSpinner(true);
    setTimeout(() => {
      setDetailRows([]);
      setGlRows([]);
      setSerialRows([]);
      setAssetDetailRows([]);
      setSelectedRowIndex(0);
      updateState({
        branchCode: currentUserRow?.branchCode || "HO",
        branchName: currentUserRow?.branchName || "HO - Head Office",
        userCode: currentUserRow?.userCode || "",
        farrNo: "",
        farrDate: useGetCurrentDayV2(),
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        noReprints: "0",
        rrType: "FARR01",
        PayeeCode: "",
        PayeeName: "",
        PayeeVatCode: "",
        PayeeVatName: "",
        referenceNo: "",
        siNo: "",
        siDate: "",
        currCode: companyInfo?.currCode || "",
        currName: companyInfo?.currName || "",
        currRate: formatNumber(companyInfo?.currRate || 1, 6),
        remarks: "",
        warrantyStartDate: "",
        warrantyExpiryDate: "",
        warrantyMonths: "",
        warrantyNotes: "",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
      });
      setShowSpinner(false);
    }, 250);
  };

  const createAssetDetailRow = (overrides = {}) => {
    const row = {
      poId: "",
      groupId: createTempGroupId(overrides.itemCode || "FARR"),
      poNo: "",
      itemCode: "",
      assetDescription: "",
      remarks: "",
      rcCode: "",
      poQty: "0.00",
      receivedQty: "0.00",
      unit: "",
      unitCost: "0.00",
      amount: "0.00",
      vat: "",
      vatRate: "0.00",
      vatAmount: "0.00",
      netAmount: "0.00",
      acqCost: "0.00",
      categCode: "",
      categName: "",
      classCode: "",
      className: "",
      assetCategory: "",
      assetSubCategory: "",
      serialNo: "",
      brandModel: "",
      eul: "0",
      depStartCutoff: getNextMonthCutoff(state.farrDate),
      depStartCutoffName: "",
      salvagePercent: "0.00",
      salvageValue: "0.00",
      location: "",
      warrantyStartDate: "",
      warrantyExpiry: "",
      warrantyMonths: "",
      warrantyNotes: "",
      ...overrides,
    };

    return {
      ...row,
      groupId: row.groupId || createTempGroupId(row.itemCode || "FARR"),
      acqCost: row.acqCost || calculateAcqCost(row),
    };
  };

  const getItemLookupConfig = () => ({
    invType: "MS",
    endpoint: "getInvLookupMS",
    docType: "PRMS",
  });

  const payeeLookupCustomParam =
  state.accountModalSource === "serialAssignedTo"
    ? "Employee"
    : String(state.rrType || "").toUpperCase() === "FARR02"
      ? "ActiveAll"
    : "OpenFARR";

  const getPayeeVatDefaults = async (payeeCode) => {
    const selectedPayeeCode = String(payeeCode || state.PayeeCode || "").trim();
    if (!selectedPayeeCode) {
      return {
        vatCode: state.PayeeVatCode || "",
        vatName: state.PayeeVatName || "",
        vatRate: 0,
      };
    }

    const payeeRow = await useTopPayeeRow(selectedPayeeCode);
    const replacementVat = getReplacementVatRow?.(payeeRow?.vatCode || "", "I", "S", "G");

    return {
      vatCode: replacementVat?.vatCode || payeeRow?.vatCode || state.PayeeVatCode || "",
      vatName: replacementVat?.vatName || payeeRow?.vatName || state.PayeeVatName || "",
      vatRate: parseFormattedNumber(replacementVat?.vatRate ?? 0),
    };
  };

  const handleOpenItemLookup = () => {
    if (isFormDisabled) return;
    const { endpoint } = getItemLookupConfig();
    updateState({
      itemLookupEndPoint: endpoint,
      selectedDocType: "FARR",
      itemLookupModalOpen: true,
    });
  };

  const handleOpenAddItemLookup = () => {
    setShowAddTypeDropdown(false);
    if (isFormDisabled) return;
    if (String(state.rrType || "").toUpperCase() !== "FARR02") return;

    if (!String(state.PayeeCode || "").trim()) {
      updateState({ payeeModalOpen: true, accountModalSource: "addItemAfterPayee" });
      return;
    }

    handleOpenItemLookup();
  };

  const handleCloseItemLookup = async (selectedItems) => {
    if (!selectedItems) {
      updateState({ itemLookupModalOpen: false });
      return;
    }

    const itemsArray = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : selectedItems.records
        ? [selectedItems.records]
        : [];

    if (itemsArray.length === 0) {
      updateState({ itemLookupModalOpen: false });
      return;
    }

    const payeeVat = await getPayeeVatDefaults();
    const depStartCutoffFields = await getDepStartCutoffFields();
    const newRows = itemsArray.map((item) => {
      const unitCost = parseFormattedNumber(item.unitCost || 0);

      return recalcAssetDetailRow(createAssetDetailRow({
        ...depStartCutoffFields,
        itemCode: item.itemCode || "",
        assetDescription: item.itemName || "",
        unit: item.uomCode || "",
        unitCost: formatNumber(unitCost),
        amount: "0.00",
        vat: payeeVat.vatCode,
        vatName: payeeVat.vatName,
        vatRate: formatNumber(payeeVat.vatRate),
        vatAmount: "0.00",
        netAmount: "0.00",
        categCode: "",
        categName: "",
        classCode: "",
        className: "",
        assetCategory: "",
        assetSubCategory: "",
        salvagePercent: "0.00",
        salvageValue: "0.00",
      }));
    });

    setDetailRows((prev) => [...prev, ...newRows]);
    updateState({ itemLookupModalOpen: false });
  };

  const getOpenPOVendorCode = (row = {}) =>
    String(row.vendCode || "")
      .trim()
      .toUpperCase();

  const getOpenPOVendorName = (row = {}) =>
    String(row.vendName || "").trim();

  const validateOpenPOSameSupplier = async (records = []) => {
    const supplierMap = new Map();

    records.forEach((record) => {
      const code = getOpenPOVendorCode(record);
      const name = getOpenPOVendorName(record);
      const key = code || name.toUpperCase();
      if (key && !supplierMap.has(key)) supplierMap.set(key, { code, name });
    });

    if (supplierMap.size <= 1) return true;

    useSwalErrorAlert("Open Purchase Order", "Please select PO records from the same payee or supplier only.");

    return false;
  };

  const handleOpenPOLookup = async () => {
    setShowAddTypeDropdown(false);
    if (isFormDisabled) return;
    if (String(state.rrType || "").toUpperCase() !== "FARR01") return;

    try {
      updateState({ isLoading: true });

      const endpoint = "getPORR_OpenSummary";
      const detailEndpoint = "getPORR_OpenDetail";
      const response = await fetchDataJson(endpoint, { branchCode: state.branchCode,vendCode: state.PayeeCode,invType :"FA" });
      const rawRows = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      const openRows = Array.isArray(rawRows) ? rawRows : [];
      const [colConfigSummary, colConfigDetail] = await Promise.all([
        useSelectedHSColConfig(endpoint, state.userCode || currentUserRow?.userCode || ""),
        useSelectedHSColConfig(detailEndpoint, state.userCode || currentUserRow?.userCode || ""),
      ]);

      if (openRows.length === 0) {
        useSwalErrorAlert("Open Purchase Order", "No open PO records found.");
        updateState({
          isLoading: false,
          openPODataSummary: [],
          openPORRColSummary: [],
          openPORRColDetail: [],
        });
        return;
      }

      updateState({
        openPODataSummary: openRows,
        openPORRColSummary: Array.isArray(colConfigSummary) ? colConfigSummary : [],
        openPORRColDetail: Array.isArray(colConfigDetail) ? colConfigDetail : [],
        poLookupModalOpen: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Open PO lookup error:", error);
      useSwalErrorAlert("Open Purchase Order", "Error in fetching record.");
      updateState({
        openPODataSummary: [],
        openPORRColSummary: [],
        openPORRColDetail: [],
        poLookupModalOpen: false,
        isLoading: false,
      });
    }
  };

  const handleClosePOOpenModal = async (selection) => {
    if (!selection || !Array.isArray(selection.details) || selection.details.length === 0) {
      updateState({ poLookupModalOpen: false });
      return;
    }

    const summaries = Array.isArray(selection.summary) ? selection.summary : [];
    const header = summaries[0] || selection.header || {};
    const details = selection.details || [];

    if (!(await validateOpenPOSameSupplier(summaries.length > 0 ? summaries : details))) {
      return;
    }

    const depStartCutoffFields = await getDepStartCutoffFields();
    const newRows = selection.details.map((item) => {
      const poQty = parseFormattedNumber(item.qtyBalance || 0);
      const receivedQty = poQty > 0 ? poQty : parseFormattedNumber(item.rrQty || 0);
      const unitCost = parseFormattedNumber(item.unitCost || 0);
      const amount = receivedQty * unitCost;

      return recalcAssetDetailRow(createAssetDetailRow({
        ...depStartCutoffFields,
        poId: header.groupId || "",
        groupId: item.groupId || "",
        poNo: item.poNo || header.poNo || "",
        itemCode: item.itemCode || "",
        assetDescription: item.itemName || "",
        remarks: item.remarks || "",
        rcCode: item.rcCode || "",
        poQty: formatNumber(poQty),
        receivedQty: formatNumber(receivedQty),
        unit: item.uomCode || "",
        unitCost: formatNumber(unitCost),
        amount: formatNumber(amount),
        vat: item.vatCode || "",
        vatAmount: formatNumber(item.vatAmount || 0),
        netAmount: formatNumber(item.netAmount || 0),
        categCode: item.categCode || "",
        categName: item.categName || "",
        classCode: item.classCode || "",
        className: item.className || "",
        eul: String(item.eul || "0"),
        salvagePercent: formatNumber(item.salvagePercent || 0),
        salvageValue: formatNumber(item.salvageValue || 0),
      }));
    });

    setDetailRows((prev) => [...prev, ...newRows]);
    updateState({
      poLookupModalOpen: false,
      PayeeCode: state.PayeeCode || header.vendCode || "",
      PayeeName: state.PayeeName || header.vendName || "",
    });
  };

  const handleAddRow = () => {
    if (isFormDisabled) return;
    setShowAddTypeDropdown((prev) => !prev);
  };

  const handleDeleteRow = (index) => {
    if (isFormDisabled) return;
    const deletedGroupId = detailRows[index]?.groupId || "";

    setDetailRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setAssetDetailRows((prev) => prev.filter((row) => row.groupId !== deletedGroupId));

    if (editingSupplementIndex === index) {
      setSerialRows([]);
      setEditingSupplementIndex(null);
    }

    setSelectedRowIndex((prev) => Math.max(0, Math.min(prev, detailRows.length - 2)));
  };

  const handleAddRowGL = (index = null) => {
    if (isFormDisabled) return;
    if (!hasReceivingDetails) {
      useSwalErrorAlert("General Ledger", "Please add Receiving Details before adding General Ledger entries.");
      return;
    }

    const newRow = {
      acctCode: "",
      acctName: "",
      rcCode: "",
      sltypeCode: "VE",
      slCode: "",
      particular: "",
      vatCode: "",
      vatName: "",
      atcCode: "",
      atcName: "",
      debit: "0.00",
      credit: "0.00",
      debitFx1: "0.00",
      creditFx1: "0.00",
      debitFx2: "0.00",
      creditFx2: "0.00",
      slRefNo: "",
      slRefDate: "",
      remarks: "",
    };

    setGlRows((prev) => {
      const updatedRows = [...prev];
      if (index !== null && index >= 0) {
        updatedRows.splice(index + 1, 0, newRow);
      } else {
        updatedRows.push(newRow);
      }
      return updatedRows;
    });
  };

  const handleDeleteRowGL = (index) => {
    if (isFormDisabled) return;
    setGlRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const buildSerialRowsFromDetail = (detailRow, existingRows = []) => {
    const receivedQty = Math.max(0, Math.floor(parseFormattedNumber(detailRow?.receivedQty || 0)));
    const netAmount = parseFormattedNumber(detailRow?.netAmount || 0);
    const baseAcqCost = parseFormattedNumber(detailRow?.acqCost || calculateAcqCost(detailRow));
    const groupId = detailRow?.groupId || `${detailRow?.itemCode || "ASSET"}-${Date.now()}`;
    const existingGroupRows = existingRows.filter((row) => row.groupId === groupId);
    const generatedAssetTag = !state.documentID ? "System-Generated" : "";
    const assetTagBase = String(detailRow?.itemCode || "ASSET")
      .split("~")[0]
      .split(",")[0]
      .trim();

    return Array.from({ length: receivedQty }, (_, rowIndex) => {
      const existingRow = existingGroupRows[rowIndex] || {};
      const lineNo = String(rowIndex + 1).padStart(3, "0");
      const rowAcqCost =
        rowIndex === receivedQty - 1
          ? netAmount - baseAcqCost * Math.max(receivedQty - 1, 0)
          : baseAcqCost;
      return {
        empNo: existingRow.empNo || "",
        empCode: existingRow.empCode || existingRow.empNo || "",
        groupId,
        serialGroupId:"",
        acqCost: formatNumber(rowAcqCost),
        serialNo: existingRow.serialNo || "",
        assetTag: existingRow.assetTag || generatedAssetTag || (assetTagBase ? `${assetTagBase}-${lineNo}` : ""),
        assignedTo: existingRow.assignedTo || "",
        rcCode: existingRow.rcCode || detailRow?.rcCode || "",
        location: existingRow.location || detailRow?.location || "",
      };
    });
  };

  const canEditAssetDetails = (detailRow = {}) =>
    parseFormattedNumber(detailRow.receivedQty || 0) > 0 &&
    parseFormattedNumber(detailRow.unitCost || 0) > 0;

  const handleEditSupplement = (index) => {
    const detailRow = detailRows[index] || {};
    const groupId = getDetailRowGroupId(detailRow) || createTempGroupId(detailRow.itemCode || "FARR");
    const detailRowWithGroupId = { ...detailRow, groupId };

    if (!isFormDisabled && !canEditAssetDetails(detailRowWithGroupId)) {
      useSwalErrorAlert("Asset Details", "Quantity and Unit Cost must be greater than zero before editing asset details.");
      return;
    }

    if (!isFormDisabled) {
      updateDetailRow(index, { groupId });
    }

    updateState({
      warrantyStartDate: detailRowWithGroupId.warrantyStartDate || "",
      warrantyExpiryDate: detailRowWithGroupId.warrantyExpiry || "",
      warrantyMonths: detailRowWithGroupId.warrantyMonths || "",
      warrantyNotes: detailRowWithGroupId.warrantyNotes || "",
    });
    setSelectedRowIndex(index);
    setEditingSupplementIndex(isFormDisabled ? null : index);
    setDetailTab("itemDetails");
    setSerialRows(buildSerialRowsFromDetail(detailRowWithGroupId, assetDetailRows));
    setTimeout(() => {
      itemDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const parseDisplayDate = (value) => {
    if (!value) return null;
    const parts = String(value).split("/");
    if (parts.length !== 3) return null;
    const [month, day, year] = parts.map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const formatDisplayDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${date.getFullYear()}`;
  };

  const addWarrantyMonths = (startDate, months) => {
    const start = parseDisplayDate(startDate);
    const monthCount = Number(months);
    if (!start || !Number.isFinite(monthCount) || monthCount <= 0) return "";

    const targetMonthIndex = start.getMonth() + Math.trunc(monthCount);
    const targetYear = start.getFullYear() + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(start.getDate(), lastDayOfTargetMonth);

    return formatDisplayDate(new Date(targetYear, targetMonth, targetDay));
  };

  const isWarrantyExpiryValid = (startDate, expiryDate) => {
    const start = parseDisplayDate(startDate);
    const expiry = parseDisplayDate(expiryDate);
    if (!start || !expiry) return true;
    return expiry >= start;
  };

  const handleWarrantyExpiryChange = (updates) => {
    if (!canEditSupplementDetails) return;
    const nextExpiryDate = updates.warrantyExpiryDate || "";
    if (!isWarrantyExpiryValid(state.warrantyStartDate, nextExpiryDate)) {
      updateState({ warrantyExpiryDate: "" });
      updateDetailRow(selectedRowIndex, { warrantyExpiry: "" });
      useSwalErrorAlert("Invalid Warranty Expiry", "Warranty Expiry must not be earlier than Warranty Start Date.");
      return;
    }
    updateState({ warrantyExpiryDate: nextExpiryDate });
    updateDetailRow(selectedRowIndex, { warrantyExpiry: nextExpiryDate });
  };

  const handleWarrantyStartDateChange = (updates) => {
    if (!canEditSupplementDetails) return;
    updateState({ warrantyStartDate: updates.warrantyStartDate || "" });
  };

  const handleWarrantyMonthsChange = (value) => {
    if (!canEditSupplementDetails) return;
    const numericValue = String(value || "").replace(/\D/g, "");
    updateState({ warrantyMonths: numericValue });
  };

  const handleWarrantyMonthsKeyDown = (event) => {
    if (event.key !== "Enter" || !canEditSupplementDetails) return;
    event.preventDefault();

    if (String(state.warrantyExpiryDate || "").trim() || !String(state.warrantyStartDate || "").trim()) return;

    const nextExpiryDate = addWarrantyMonths(state.warrantyStartDate, event.currentTarget?.value || state.warrantyMonths);
    if (nextExpiryDate) {
      updateState({ warrantyExpiryDate: nextExpiryDate });
      updateDetailRow(selectedRowIndex, { warrantyExpiry: nextExpiryDate });
    }
  };

  const handleApplySupplementChanges = () => {
    if (!canEditSupplementDetails) return;

    if (!isWarrantyExpiryValid(state.warrantyStartDate, state.warrantyExpiryDate)) {
      useSwalErrorAlert("Invalid Warranty Expiry", "Warranty Expiry must not be earlier than Warranty Start Date.");
      return;
    }

    const selectedGroupId = detailRows[selectedRowIndex]?.groupId || "";
    const serialNo = serialRows.map((row) => row.serialNo).filter(Boolean).join(", ");
    const location = [...new Set(serialRows.map((row) => row.location).filter(Boolean))].join(", ");

    if (selectedGroupId) {
      setAssetDetailRows((prev) => [
        ...prev.filter((row) => row.groupId !== selectedGroupId),
        ...serialRows.map((row) => ({ ...row, groupId: selectedGroupId })),
      ]);
    }

    setDetailRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === selectedRowIndex
          ? {
              ...row,
              serialNo,
              location,
              warrantyStartDate: state.warrantyStartDate,
              warrantyExpiry: state.warrantyExpiryDate,
              warrantyMonths: state.warrantyMonths,
              warrantyNotes: state.warrantyNotes,
            }
          : row
      )
    );
    setEditingSupplementIndex(null);

    useSwalSuccessAlert(
      "Asset Details Updated",
      "Serial breakdown and warranty information were applied to the selected asset detail. Click the Save button to save these changes to the FARR transaction."
    );
  };

  const updateDetailRow = (index, updates) => {
    setDetailRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
  };

  const handleFarrDateChange = async (updates) => {
    if (isFormDisabled) return;
    const nextFarrDate = updates.farrDate || "";
    const depStartCutoffFields = await getDepStartCutoffFields(nextFarrDate);

    updateState({ farrDate: nextFarrDate });
    setDetailRows((prev) =>
      prev.map((row) => ({
        ...row,
        ...depStartCutoffFields,
      }))
    );
  };

  const recalcAssetDetailRow = (row, overrides = {}) => {
    const nextRow = { ...row, ...overrides };
    const quantity = parseFormattedNumber(nextRow.receivedQty || 0);
    const unitCost = parseFormattedNumber(nextRow.unitCost || 0);
    const amount = quantity * unitCost;
    const vatAmount = nextRow.vat ? getAllTopVatAmount?.(nextRow.vat, amount) || 0 : 0;
    const netAmount = amount - vatAmount;
    const acqCost = calculateAcqCost(nextRow, { netAmount });
    const salvageValue = capSalvageValue(nextRow.salvageValue, acqCost);

    return {
      ...nextRow,
      amount: formatNumber(amount),
      vatAmount: formatNumber(vatAmount),
      netAmount: formatNumber(netAmount),
      acqCost,
      salvageValue: formatNumber(salvageValue),
    };
  };

  const handleDetailModalChange = (index, field, value) => {
    updateDetailRow(index, { [field]: value });
  };

  const updateSerialRow = (index, updates) => {
    setSerialRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
  };

  const updateGlRow = (index, updates) => {
    setGlRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
  };

  const openDetailLookup = (index, source) => {
    if (source === "detailFaClass") {
      const row = detailRows[index] || {};
      if (!String(row.categCode || row.categName || row.assetCategory || "").trim()) {
        useSwalErrorAlert("Sub Category", "Please select a Category first.");
        return;
      }
    }

    setSelectedRowIndex(index);
    const modalMap = {
      detailVat: "showVatModal",
      detailAtc: "showAtcModal",
      detailRcCode: "showRcModal",
      detailFaCategory: "showFaCategoryModal",
      detailFaClass: "showFaClassModal",
      detailFaLoc: "showFaLocModal",
      detailDepStartCutoff: "showCutoffModal",
    };
    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const openSerialLookup = (index, source) => {
    setSelectedSerialRowIndex(index);
    const modalMap = {
      serialAssignedTo: "payeeModalOpen",
      serialRcCode: "showRcModal",
      serialFaLoc: "showFaLocModal",
    };
    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const openGlLookup = (index, source) => {
    setSelectedRowIndex(index);
    const modalMap = {
      acctCode: "showAccountModal",
      rcCode: "showRcModal",
      slCode: "showSlModal",
      vatCode: "showVatModal",
      atcCode: "showAtcModal",
    };
    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode || "",
        branchName: selectedBranch.branchName || "",
      });
    }
    updateState({ branchModalOpen: false });
  };


  const handleOpenPayeeLookup = async () => {
  if (isPayeeLookupDisabled) return;

  if (String(state.rrType || "").toUpperCase() === "FARR02") {
    updateState({ payeeModalOpen: true });
    return;
  }

  try {
    updateState({ isLoading: true });

    const payload = {
      json_data: {
        search: null,
        filter: "OpenFARR",
        searchMode: "part",
      },
    };

    const { data: response } = await apiClient.get("/lookupVendMast", {
      params: { json_data: JSON.stringify(payload) },
    });

    const rows = response?.data?.[0]?.result
      ? JSON.parse(response.data[0].result)
      : [];

    if (!Array.isArray(rows) || rows.length === 0) {
      useSwalErrorAlert(
        "Open Fixed Asset PO",
        "No open Fixed Asset PO found for receiving."
      );
      return;
    }

    updateState({ payeeModalOpen: true });
  } catch (error) {
    console.error("Open FARR Payee lookup error:", error);
    useSwalErrorAlert(
      "Open Fixed Asset PO",
      "Error checking open Fixed Asset PO records."
    );
  } finally {
    updateState({ isLoading: false });
  }
};





  const handleClosePayeeModal = async (selectedPayee) => {
    const modalSource = state.accountModalSource;
    const serialRowIndex = selectedSerialRowIndex;
    const shouldOpenItemAfterPayee = modalSource === "addItemAfterPayee" && selectedPayee;

    updateState({ payeeModalOpen: false, accountModalSource: null });

    if (!selectedPayee) {
      setSelectedSerialRowIndex(null);
      return;
    }

    await new Promise((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });

    try {
      updateState({ isLoading: true });

      if (modalSource === "serialAssignedTo" && serialRowIndex !== null) {
        updateSerialRow(serialRowIndex, {
          empNo: selectedPayee.vendCode || selectedPayee.vend_code || "",
          empCode: selectedPayee.vendCode || selectedPayee.vend_code || "",
          assignedTo: selectedPayee.vendName || selectedPayee.vend_name || "",
        });
      } else {
        const selectedPayeeCode = selectedPayee.vendCode || selectedPayee.vend_code || "";
        const payeeVat = await getPayeeVatDefaults(selectedPayeeCode);
        updateState({
          PayeeCode: selectedPayeeCode,
          PayeeName: selectedPayee.vendName || selectedPayee.vend_name || "",
          PayeeVatCode: payeeVat.vatCode,
          PayeeVatName: payeeVat.vatName,
        });
        setDetailRows((prev) =>
          prev.map((row) =>
            recalcAssetDetailRow(row, {
              vat: payeeVat.vatCode,
              vatName: payeeVat.vatName,
              vatRate: formatNumber(payeeVat.vatRate),
            })
          )
        );
      }
    } finally {
      updateState({ isLoading: false });
      setSelectedSerialRowIndex(null);
    }

    if (shouldOpenItemAfterPayee) {
      setTimeout(() => handleOpenItemLookup(), 0);
    }
  };



  
  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      updateGlRow(selectedRowIndex, {
        acctCode: selectedAccount.acctCode || "",
        acctName: selectedAccount.acctName || "",
      });
    }
    updateState({ showAccountModal: false, accountModalSource: null });
  };

  const handleCloseRcModal = (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (state.accountModalSource === "serialRcCode" && selectedSerialRowIndex !== null) {
        updateSerialRow(selectedSerialRowIndex, { rcCode: selectedRc.rcCode || "" });
      } else if (state.accountModalSource === "detailRcCode") {
        updateDetailRow(selectedRowIndex, { rcCode: selectedRc.rcCode || "" });
      } else {
        updateGlRow(selectedRowIndex, { rcCode: selectedRc.rcCode || "" });
      }
    }
    updateState({ showRcModal: false, accountModalSource: null });
    if (state.accountModalSource === "serialRcCode") setSelectedSerialRowIndex(null);
  };

  const handleCloseVatModal = (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const vatUpdates = {
        vatCode: selectedVat.vatCode || "",
        vatName: selectedVat.vatName || "",
      };
      if (state.accountModalSource === "detailVat") {
        const row = detailRows[selectedRowIndex] || {};
        updateDetailRow(selectedRowIndex, recalcAssetDetailRow(row, { vat: vatUpdates.vatCode, vatName: vatUpdates.vatName }));
      } else {
        updateGlRow(selectedRowIndex, vatUpdates);
      }
    }
    updateState({ showVatModal: false, accountModalSource: null });
  };

  const handleCloseAtcModal = (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const atcUpdates = {
        atcCode: selectedAtc.atcCode || "",
        atcName: selectedAtc.atcName || selectedAtc.atcDesc || "",
      };
      if (state.accountModalSource === "detailAtc") {
        updateDetailRow(selectedRowIndex, atcUpdates);
      } else {
        updateGlRow(selectedRowIndex, atcUpdates);
      }
    }
    updateState({ showAtcModal: false, accountModalSource: null });
  };

  const handleCloseSlModal = (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      updateGlRow(selectedRowIndex, {
        sltypeCode: selectedSl.sltypeCode || selectedSl.slTypeCode || selectedSl.sltype_code || "",
        slCode: selectedSl.slCode || selectedSl.sl_code || "",
      });
    }
    updateState({ showSlModal: false, accountModalSource: null });
  };

  const handleCloseFaCategoryModal = (selectedCategory) => {
    if (selectedCategory && selectedRowIndex !== null) {
      const selectedCategCode = selectedCategory.code || "";
      const selectedCategName = selectedCategory.description || selectedCategory.code || "";

      updateDetailRow(selectedRowIndex, {
        categCode: selectedCategCode,
        categName: selectedCategName,
        assetCategory: selectedCategName,
        classCode: "",
        className: "",
        assetSubCategory: "",
        salvagePercent: "0.00",
      });

      updateState({
        showFaCategoryModal: false,
        showFaClassModal: true,
        faClassLookupCategCode: selectedCategCode,
        accountModalSource: "detailFaClass",
      });
      return;
    }

    updateState({ showFaCategoryModal: false, accountModalSource: null });
  };

  const handleCloseFaClassModal = (selectedClass) => {
    if (selectedClass && selectedRowIndex !== null) {
      const salvagePercent = parseFormattedNumber(selectedClass.salvagePercent || 0);
      const acqCost = parseFormattedNumber(detailRows[selectedRowIndex]?.acqCost || 0);
      const computedSalvageValue = capSalvageValue(acqCost * (salvagePercent / 100), acqCost);

      updateDetailRow(selectedRowIndex, {
        classCode: selectedClass.code || "",
        className: selectedClass.description || selectedClass.code || "",
        categCode: selectedClass.categCode || detailRows[selectedRowIndex]?.categCode || "",
        assetSubCategory: selectedClass.description || selectedClass.code || "",
        eul: String(selectedClass.eul ?? "0"),
        salvagePercent: formatNumber(salvagePercent),
        salvageValue: formatNumber(computedSalvageValue),
      });
    }
    updateState({ showFaClassModal: false, faClassLookupCategCode: "", accountModalSource: null });
  };

  const handleCloseFaLocModal = (selectedLocation) => {
    const isSerialLookup = state.accountModalSource === "serialFaLoc";
    const targetRowIndex = isSerialLookup ? selectedSerialRowIndex : selectedRowIndex;

    if (selectedLocation && targetRowIndex !== null) {
      const locCode = selectedLocation.code || selectedLocation.description || "";
      if (isSerialLookup) {
        updateSerialRow(targetRowIndex, { location: locCode });
      } else {
        updateDetailRow(targetRowIndex, { location: locCode });
      }
    }
    updateState({ showFaLocModal: false, accountModalSource: null });
    if (isSerialLookup) setSelectedSerialRowIndex(null);
  };

  const handleCloseCutoffModal = (selectedCutoff) => {
    if (selectedCutoff && selectedRowIndex !== null && state.accountModalSource === "detailDepStartCutoff") {
      const selectedCutoffCode = selectedCutoff.cutoffCode || "";
      const rrCutoffCode = getCutoffFromDate(state.farrDate);

      if (selectedCutoffCode && rrCutoffCode && selectedCutoffCode < rrCutoffCode) {
        useSwalErrorAlert(
          "Invalid Depreciation Start Cut Off",
          "Dep. Start Cut Off must not be earlier than RR Date."
        );
        updateState({ showCutoffModal: false, accountModalSource: null });
        return;
      }

      updateDetailRow(selectedRowIndex, {
        depStartCutoff: selectedCutoffCode,
        depStartCutoffName: selectedCutoff.cutoffName || "",
      });
    }
    updateState({ showCutoffModal: false, accountModalSource: null });
  };

  const handleCancel = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (state.documentID && state.documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handleAttach = async () => {
    if (state.documentID) {
      updateState({ showAttachModal: true });
    }
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, state.branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, farrNo: data.docNo });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && state.documentStatus !== "OPEN" && state.documentID !== null) {
      const result = await useHandleCancel(
        docType,
        state.documentID,
        currentUserRow?.userCode,
        confirmation.password,
        confirmation.reason,
        updateState
      );
      if (result.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
      }
      await fetchTranData(state.farrNo, state.branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleSaveAndPrint = async (documentID) => {
    setShowSpinner(true);
    await useHandlePrint(documentID, docType);
    setShowSpinner(false);
  };

  const handleCloseSignatory = async (mode) => {
    updateState({
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });

    setShowSpinner(true);
    await useHandlePrint(state.documentID, docType, mode, state.userCode || currentUserRow?.userCode || "");
    setShowSpinner(false);
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const pickedBranchCode = row?.branchCode;
      if (!docNo || !pickedBranchCode) return;

      await fetchTranData(docNo, pickedBranchCode);
      setTopTab("details");
      cleanUrl();
    },
    [fetchTranData, cleanUrl]
  );

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("farrNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

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

  const printData = {
    farr_no: state.farrNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const renderAssetCell = (columnKey, row, index) => {
    const columnWidth = getFarrDetailFallbackWidth(columnKey);
    const columnMeta = assetDetailColumns.find((column) => column.key === columnKey) || {};
    const style = getFarrDetailCellStyle(columnKey, columnWidth);
    const alignClass = columnMeta.align || "text-left";

    const focusNextDetailCell = (field) => {
      focusNextFarrDetailRowInput(index, field, {
        rows: detailRows,
        zeroClearFields: farrDetailEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => updateDetailRow(nextIndex, { [nextField]: value }),
      });
    };

    const handleDetailInputChange = (field, value) => {
      if (field === "receivedQty") {
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        if (!/^\d*\.?\d{0,2}$/.test(sanitizedValue) && sanitizedValue !== "") return;

        const hasPoNo = String(row.poNo || "").trim() !== "";
        const poBalance = parseFormattedNumber(row.poQty || 0);
        const receivedQty = parseFormattedNumber(sanitizedValue || 0);
        const boundedQty = hasPoNo
          ? Math.min(Math.max(receivedQty, 0), Math.max(poBalance, 0))
          : Math.max(receivedQty, 0);
        const nextReceivedQty =
          sanitizedValue === "" ? "" : hasPoNo && receivedQty > poBalance ? formatNumber(boundedQty) : sanitizedValue;
        updateDetailRow(index, recalcAssetDetailRow(row, { receivedQty: nextReceivedQty }));
        return;
      }

      if (field === "unitCost") {
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        if (!/^\d*\.?\d{0,2}$/.test(sanitizedValue) && sanitizedValue !== "") return;
        updateDetailRow(index, recalcAssetDetailRow(row, { unitCost: sanitizedValue }));
        return;
      }

      if (field === "salvageValue") {
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        if (!/^\d*\.?\d{0,2}$/.test(sanitizedValue) && sanitizedValue !== "") return;

        const acqCost = parseFormattedNumber(row.acqCost || 0);
        const salvageValue = parseFormattedNumber(sanitizedValue || 0);

        if (salvageValue > acqCost) {
          updateDetailRow(index, { salvageValue: formatNumber(acqCost) });
          return;
        }

        updateDetailRow(index, { salvageValue: sanitizedValue });
        return;
      }

      if (field === "salvagePercent") {
        const sanitizedValue = value.replace(/[^0-9.]/g, "");
        if (!/^\d*\.?\d{0,2}$/.test(sanitizedValue) && sanitizedValue !== "") return;
        updateDetailRow(index, { salvagePercent: sanitizedValue });
        return;
      }

      if (field === "eul") {
        const sanitizedValue = value.replace(/[^0-9]/g, "");
        updateDetailRow(index, { eul: sanitizedValue });
        return;
      }

      updateDetailRow(index, { [field]: value });
    };

    const formatDetailInputValue = (field, value) => {
      if (field === "unitCost") {
        updateDetailRow(index, recalcAssetDetailRow(row, { unitCost: formatNumber(parseFormattedNumber(value || 0)) }));
        return true;
      }

      if (field === "receivedQty") {
        const hasPoNo = String(row.poNo || "").trim() !== "";
        const poBalance = parseFormattedNumber(row.poQty || 0);
        const receivedQty = parseFormattedNumber(value || 0);
        const nextReceivedQty = formatNumber(
          hasPoNo ? Math.min(Math.max(receivedQty, 0), Math.max(poBalance, 0)) : Math.max(receivedQty, 0)
        );
        updateDetailRow(index, recalcAssetDetailRow(row, { receivedQty: nextReceivedQty }));
        return true;
      }

      if (field === "salvageValue") {
        const acqCost = parseFormattedNumber(row.acqCost || 0);
        const salvageValue = parseFormattedNumber(value || 0);
        const cappedSalvageValue = capSalvageValue(salvageValue, acqCost);

        updateDetailRow(index, { salvageValue: formatNumber(cappedSalvageValue) });
        return true;
      }

      if (field === "salvagePercent") {
        updateDetailRow(index, { salvagePercent: formatNumber(parseFormattedNumber(value || 0)) });
        return true;
      }

      if (field === "eul") {
        updateDetailRow(index, { eul: String(value || "").trim() === "" ? "0" : value });
        return true;
      }

      return false;
    };

    const detailInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || alignClass}`.trim()}
        value={row[field] || ""}
        maxLength={options.maxLength}
        readOnly={options.readOnly ?? isFormDisabled}
        onClick={options.onClick}
        onChange={(e) => handleDetailInputChange(field, e.target.value)}
        onBlur={(e) => {
          if (isFormDisabled || options.readOnly) return;
          formatDetailInputValue(field, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
          e.preventDefault();
          formatDetailInputValue(field, e.target.value);
          focusNextDetailCell(field);
        }}
        onFocus={(e) =>
          clearFarrDetailZeroOnFocus(e, {
            isEditable: !isFormDisabled && !options.readOnly,
            onClear: (value) =>
              updateDetailRow(
                index,
                ["receivedQty", "unitCost"].includes(field)
                  ? recalcAssetDetailRow(row, { [field]: value })
                  : { [field]: value }
              ),
          })
        }
      />
    );

    const detailLookupInput = (field, source, options = {}) => {
      const showLookupIcon =
        !isFormDisabled &&
        (!["vat", "rcCode"].includes(field) || !String(row.poNo || "").trim());
      return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          {detailInput(field, {
            readOnly: true,
            className: `${options.className || alignClass} pr-6 cursor-pointer`,
          })}
          {showLookupIcon && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-0 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => openDetailLookup(index, source)}
            />
          )}
        </div>
      </td>
    );
    };

    const detailDisplayLookupInput = (field, displayValue, source, options = {}) => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          <input
            type="text"
            id={`${field}-${index}`}
            className={`w-full global-tran-td-inputclass-ui ${options.className || alignClass} pr-6 cursor-pointer`.trim()}
            value={displayValue || ""}
            readOnly
          />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-0 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => openDetailLookup(index, source)}
            />
          )}
        </div>
      </td>
    );

    const detailSpecsInput = (field, title, placeholder) => {
      const openSpecsModal = () => {
        if (isFormDisabled) return;
        useSwalHandleOpenSpecsModal(
          index,
          detailRows,
          handleDetailModalChange,
          row[field] || "",
          title,
          field,
          placeholder
        );
      };

      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <div className="relative w-full">
            {detailInput(field, {
              readOnly: true,
              className: `${alignClass} pr-6 cursor-pointer`,
              onClick: openSpecsModal,
            })}
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute top-1/2 right-0 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={openSpecsModal}
              />
            )}
          </div>
        </td>
      );
    };

    const detailColumnRenderers = {
      ln: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          {index + 1}
        </td>
      ),
      poNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("poNo", { readOnly: true })}</td>,
      itemCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("itemCode", { readOnly: true })}</td>,
      unit: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("unit", { readOnly: true, className: "text-center" })}</td>,
      unitCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("unitCost", { readOnly: isFormDisabled || String(row.poNo || "").trim() !== "" })}</td>,
      rcCode: () => detailLookupInput("rcCode", "detailRcCode", { className: "text-center" }),
      vat: () => detailLookupInput("vat", "detailVat", { className: "text-center" }),
      assetDescription: () =>
        detailSpecsInput("assetDescription", "Asset Description", "Enter asset description..."),
      remarks: () =>
        detailSpecsInput("remarks", "Asset Other Specification", "Enter asset specification..."),
      amount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("amount", { readOnly: true })}</td>,
      vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("vatAmount", { readOnly: true })}</td>,
      netAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("netAmount", { readOnly: true })}</td>,
      acqCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("acqCost", { readOnly: true })}</td>,
      salvagePercent: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("salvagePercent")}</td>,
      salvageValue: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("salvageValue")}</td>,
      serialNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("serialNo", { readOnly: true, maxLength: serialNoMaxLength })}</td>,
      categName: () => detailLookupInput("categName", "detailFaCategory"),
      className: () => detailLookupInput("className", "detailFaClass"),
      eul: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("eul", { className: "text-center" })}</td>,
      depStartCutoffName: () =>
        detailDisplayLookupInput(
          "depStartCutoffName",
          row.depStartCutoffName || "",
          "detailDepStartCutoff",
          { className: "text-center" }
        ),
      location: () => detailLookupInput("location", "detailFaLoc", { className: "text-left" }),
      warrantyExpiry: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailInput("warrantyExpiry", { readOnly: true, className: "text-center" })}</td>,
    };

    return (
      detailColumnRenderers[columnKey]?.() || (
        <td key={columnKey} className={`global-tran-td-ui ${alignClass}`} style={style}>
          {detailInput(columnKey)}
        </td>
      )
    );
  };

  const renderSerialCell = (columnKey, row, index) => {
    const columnWidth = getFarrSerialFallbackWidth(columnKey);
    const columnMeta = serialBreakdownColumns.find((column) => column.key === columnKey) || {};
    const style = getFarrSerialCellStyle(columnKey, columnWidth);
    const alignClass = columnMeta.align || "text-left";

    const updateSerialRow = (updates) => {
      setSerialRows((prev) => prev.map((item, rowIndex) => (rowIndex === index ? { ...item, ...updates } : item)));
    };

    const focusNextSerialCell = (field) => {
      focusNextFarrSerialRowInput(index, field, {
        rows: serialRows,
        zeroClearFields: [],
        parseValue: (value) => value,
        onClearNextValue: (nextIndex, nextField, value) =>
          setSerialRows((prev) => prev.map((item, rowIndex) => (rowIndex === nextIndex ? { ...item, [nextField]: value } : item))),
      });
    };

    if (columnKey === "ln") {
      return (
        <td key={columnKey} className={`global-tran-td-ui ${alignClass}`} style={style}>
          <div className="flex h-7 items-center justify-center">{index + 1}</div>
        </td>
      );
    }

    if (columnKey === "tagPreview") {
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <button
            type="button"
            className="flex h-7 w-full items-center justify-center text-blue-600 hover:text-blue-800 disabled:text-slate-300"
            title="View Property Tag"
            disabled={!row?.assetTag && !row?.serialNo}
            onClick={() => setSelectedPpeTagRow({ serialRow: row, detailRow: selectedRow })}
          >
            <FontAwesomeIcon icon={faTag} />
          </button>
        </td>
      );
    }

    if (columnKey === "assignedTo" || columnKey === "rcCode" || columnKey === "location") {
      const serialLookupSourceMap = {
        assignedTo: "serialAssignedTo",
        rcCode: "serialRcCode",
        location: "serialFaLoc",
      };
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <div className="relative w-full">
            <input
              type="text"
              id={`${columnKey}-${index}`}
              className={`w-full h-7 global-tran-td-inputclass-ui ${alignClass} pr-6 cursor-pointer`.trim()}
              value={row[columnKey] || ""}
              readOnly
            />
            {canEditSupplementDetails && (
              <button
                type="button"
                className="absolute inset-y-0 right-1 flex items-center px-1 text-blue-600 hover:text-blue-800"
                onClick={() => openSerialLookup(index, serialLookupSourceMap[columnKey])}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            )}
          </div>
        </td>
      );
    }

    const isEditable = columnKey === "serialNo" && canEditSupplementDetails;
    return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <input
          type="text"
          id={`${columnKey}-${index}`}
          className={`w-full h-7 global-tran-td-inputclass-ui ${alignClass}`.trim()}
          value={row[columnKey] || ""}
          maxLength={
            columnKey === "serialNo"
              ? serialNoMaxLength
              : columnKey === "assetTag"
                ? tagNoMaxLength
                : undefined
          }
          readOnly={!isEditable}
          onChange={(e) => updateSerialRow({ [columnKey]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !isEditable) return;
            e.preventDefault();
            focusNextSerialCell(columnKey);
          }}
          onFocus={(e) =>
            clearFarrSerialZeroOnFocus(e, {
              isEditable,
              onClear: (value) => updateSerialRow({ [columnKey]: value }),
            })
          }
        />
      </td>
    );
  };

  const renderGlCell = (columnKey, row, index) => {
    const columnWidth = getFarrGlFallbackWidth(columnKey);
    const style = getFarrGlCellStyle(columnKey, columnWidth);
    const glModalHandlers = {
      acctCode: () => openGlLookup(index, "acctCode"),
      rcCode: () => openGlLookup(index, "rcCode"),
      slCode: () => openGlLookup(index, "slCode"),
      vatCode: () => openGlLookup(index, "vatCode"),
      atcCode: () => openGlLookup(index, "atcCode"),
    };

    const focusNextGlCell = (field) => {
      focusNextFarrGlRowInput(index, field, {
        rows: glRows,
        zeroClearFields: farrGlEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => updateGlRow(nextIndex, { [nextField]: value }),
      });
    };

    const glTextInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={options.readOnly ?? isFormDisabled}
        maxLength={options.maxLength}
        onChange={(e) => updateGlRow(index, { [field]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
          e.preventDefault();
          focusNextGlCell(field);
        }}
      />
    );

    const glLookupInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={isFormDisabled || options.readOnly}
        onChange={(e) => updateGlRow(index, { [field]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || isFormDisabled) return;
          e.preventDefault();
          focusNextGlCell(field);
        }}
      />
    );

    const glAmountInput = (field) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        readOnly={isFormDisabled}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
            updateGlRow(index, { [field]: sanitizedValue });
          }
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          updateGlRow(index, { [field]: formatNumber(e.target.value || 0) });
          focusNextGlCell(field);
        }}
        onFocus={(e) =>
          clearFarrGlZeroOnFocus(e, {
            isEditable: !isFormDisabled,
            onClear: (value) => updateGlRow(index, { [field]: value }),
          })
        }
        onBlur={(e) => {
          if (isFormDisabled) return;
          updateGlRow(index, { [field]: formatNumber(e.target.value || 0) });
        }}
      />
    );

    const glLookupCell = (readOnly = true, showOnlyWhenValue = true) => {
      const showLookupIcon = !isFormDisabled && (!showOnlyWhenValue || Boolean(String(row[columnKey] || "").trim()));
      return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>;
    };

    const glColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      acctCode: () => glLookupCell(false, false),
      rcCode: () => glLookupCell(true),
      slCode: () => glLookupCell(true),
      vatCode: () => glLookupCell(true),
      atcCode: () => glLookupCell(true),
      sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
      slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
      particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular")}</td>,
      atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName")}</td>,
      vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
      debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
      slRefDate: () => (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <DateFormatInput
            id={`slRefDate${index}`}
            value={row.slRefDate || ""}
            disabled={isFormDisabled}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            updateState={(updates) => {
              if (updates[`slRefDate${index}`] !== undefined) {
                updateGlRow(index, { slRefDate: updates[`slRefDate${index}`] });
              }
            }}
            onKeyDownCustom={(e) => {
              if (e.key !== "Enter" || isFormDisabled) return;
              e.preventDefault();
              focusNextGlCell("slRefDate");
            }}
          />
        </td>
      ),
    };

    return glColumnRenderers[columnKey]?.() ?? null;
  };

  return (
    <div className="global-tran-main-div-ui">
      {(showSpinner || state.isLoading) && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          onPost={handlePost}
          printData={printData}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={handleCancel}
          onAttach={handleAttach}
          showCopyForm={false}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/FARR"
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (glRows?.length || 0) === 0)}
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!state.documentID}
          isPrintDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!state.documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
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
              className={`global-tran-tab-padding-ui ${
                activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
              }`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative" id="farr_hd">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={state.branchName}
                  disabled={isFormDisabled}
                  onLookup={() => {
                    if (isFormDisabled) return;
                    updateState({ branchModalOpen: true });
                  }}
                />
                <FieldRenderer
                  id="farrNo"
                  label="FARR No."
                  type="lookup"
                  value={state.farrNo}
                  disabled={state.isDocNoDisabled || isFormDisabled}
                  onChange={(val) => {
                    if (isFormDisabled) return;
                    updateState({ farrNo: val });
                  }}
                  onBlur={() => !isFormDisabled && state.farrNo && fetchTranData(state.farrNo, state.branchCode)}
                  onLookup={() => {
                    if (isFormDisabled) return;
                    updateState({ showAllTranDocNo: true });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!isFormDisabled && state.farrNo) fetchTranData(state.farrNo, state.branchCode);
                      document.getElementById("farrDate")?.focus();
                    }
                  }}
                />
                <div className="relative w-full">
                  <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                    <DateFormatInput
                      id="farrDate"
                      className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                      value={state.farrDate}
                      disabled={isFormDisabled}
                      updateState={handleFarrDateChange}
                    />
                  </div>
                  <label htmlFor="farrDate" className="global-ref-floating-label global-ref-label-enabled">FARR Date</label>
                </div>
                <FieldRenderer
                  id="rrType"
                  label="RR Type"
                  required
                  type="select"
                  value={state.rrType || "FARR01"}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ rrType: val })}
                  options={(state.farrTypes || []).map((type) => ({
                    label: type.DROPDOWN_NAME,
                    value: type.DROPDOWN_CODE,
                  }))}
                />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="PayeeCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={state.PayeeCode}
                  disabled={isPayeeLookupDisabled}
                  readOnly
                  onLookup={handleOpenPayeeLookup}
                />
                <FieldRenderer id="PayeeName" label="Payee Name" required type="text" value={state.PayeeName} disabled readOnly />
                <FieldRenderer
                  id="siNo"
                  label="SI No."
                  type="text"
                  value={state.siNo}
                  disabled={isFormDisabled}
                  onChange={(val) => {
                    if (isFormDisabled) return;
                    updateState({
                      siNo: val,
                      ...(String(val || "").trim() === "" ? { siDate: "" } : {}),
                    });
                  }}
                  maxLength={siNoMaxLength}
                />
                <div className="relative w-full">
                  <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                    <DateFormatInput
                      id="siDate"
                      className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                      value={state.siDate}
                      disabled={isFormDisabled}
                      updateState={(updates) => {
                        if (isFormDisabled) return;
                        updateState({ siDate: updates.siDate });
                      }}
                    />
                  </div>
                  <label htmlFor="siDate" className="global-ref-floating-label global-ref-label-enabled">SI Date</label>
                </div>
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <div className="flex gap-4">
                  <input type="hidden" id="currCode" value={state.currCode || ""} readOnly />
                  <div className="flex-grow w-2/3">
                    <FieldRenderer
                      id="currName"
                      label="Currency"
                      type="text"
                      value={
                        state.currCode
                          ? `${state.currCode}${state.currName ? ` - ${state.currName}` : ""}`
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
                      value={state.currRate}
                      disabled={isCurrRateDisabled}
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
                          document.getElementById("referenceNo")?.focus();
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
                <FieldRenderer
                  id="referenceNo"
                  label="Reference No."
                  required
                  type="text"
                  value={state.referenceNo}
                  disabled={isFormDisabled}
                  onChange={(val) => { if (!isFormDisabled) updateState({ referenceNo: val }); }}
                  maxLength={referenceNoMaxLength}
                />
              </div>

              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea
                    id="remarks"
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2"
                    value={state.remarks}
                    disabled={isFormDisabled}
                    readOnly={isFormDisabled}
                    onChange={(e) => {
                      if (isFormDisabled) return;
                      updateState({ remarks: e.target.value });
                    }}
                  />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
                </div>
                </div>
              </div>
          </div>
        </div>

        <div id="farr_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Receiving Details</button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedFarrDetailColumns.map((column) =>
                      renderFarrDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedFarrDetailColumns,
                      })
                    )}
                    <th
                      className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                      style={transactionActionsHeaderStyle}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedFarrDetailRows.map(({ row, originalIndex }) => (
                    <tr key={`${row.itemCode}-${originalIndex}`} className={`global-tran-tr-ui cursor-pointer ${selectedRowIndex === originalIndex ? "bg-blue-50" : ""}`} onClick={() => setSelectedRowIndex(originalIndex)}>
                      {orderedFarrDetailColumns.map((column) => renderAssetCell(column.key, row, originalIndex))}
                      <td
                        className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                        style={transactionActionsCellStyle}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="global-tran-td-button-add-ui"
                            title={isFormDisabled ? "View asset details" : "Edit asset details"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSupplement(originalIndex);
                            }}
                          >
                            <FontAwesomeIcon icon={isFormDisabled ? faEye : faPenToSquare} />
                          </button>
                          {!isFormDisabled && (
                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRow(originalIndex);
                              }}
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderFarrDetailHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div ref={addTypeDropdownRef} className="relative inline-block" style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
                {showAddTypeDropdown && (
                  <div className="absolute bottom-[110%] left-0 z-[9999] mb-3 w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Add Receiving Detail
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                          state.rrType === "FARR01"
                            ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                        }`}
                        disabled={isFormDisabled || state.rrType === "FARR01"}
                        onClick={handleOpenAddItemLookup}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          <FontAwesomeIcon icon={faPlus} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Select Item</span>
                          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">Lookup MS master data</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                          state.rrType === "FARR02"
                            ? "cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500"
                            : "text-blue-700 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                        }`}
                        disabled={isFormDisabled || state.rrType === "FARR02"}
                        onClick={handleOpenPOLookup}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                          <FontAwesomeIcon icon={faFolderOpen} />
                        </span>
                        <span className="flex flex-col items-start">
                          <span>Select Open Purchase Order</span>
                          <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">Lookup open PO items</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
                <button onClick={handleAddRow} className="global-tran-tab-footer-button-add-ui" disabled={isFormDisabled}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
                </button>
              </div>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
              <div className="global-tran-tab-footer-total-label-ui">Total Quantity Received:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totals.totalQty}</div>
              {withCostAmount && (
                <>
                  <div className="global-tran-tab-footer-total-label-ui">Total Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalAmount}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total VAT Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalVatAmount}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Net Amount:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalNetAmount}</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              {[{ key: "itemDetails", label: "Item Details" }, ...(withCostAmount ? [{ key: "glEntries", label: "General Ledger" }] : [])].map((tab) => (
                <button key={tab.key} className={`global-tran-tab-padding-ui ${detailTab === tab.key ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`} onClick={() => setDetailTab(tab.key)}>{tab.label}</button>
              ))}
            </div>
            {withCostAmount && detailTab === "glEntries" && (
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className="global-tran-button-generateGL"
                disabled={state.isLoading || !hasReceivingDetails}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                {state.isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            )}
          </div>

          {detailTab === "itemDetails" && (
            <div ref={itemDetailsRef} className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(640px,3.4fr)]">
              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-700">Selected Item Details</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                      Review the selected asset before saving changes.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-bold text-slate-500">Item Code</div>
                    <div className="mt-1 break-words text-xs font-normal leading-5 text-slate-950">
                      {selectedRow.itemCode || "-"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-bold text-slate-500">Description</div>
                    <div className="mt-1 max-h-24 overflow-auto break-words text-xs font-normal leading-5 text-slate-950">
                      {selectedRow.assetDescription || "-"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                    {[
                      ["Category", selectedRow.categName || selectedRow.assetCategory],
                      ["Sub Category", selectedRow.className || selectedRow.assetSubCategory],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] font-bold text-slate-500">{label}</div>
                        <div className="mt-1 min-h-10 break-words text-xs font-normal leading-5 text-slate-950">
                          {value || "-"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold text-slate-500">Unit</div>
                      <div className="mt-1 text-xs font-normal text-slate-900">{selectedRow.unit || "-"}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
                      <div className="text-[11px] font-semibold text-slate-500">EUL</div>
                      <div className="mt-1 text-xs font-normal text-slate-900">{selectedRow.eul || "0"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                <div className="min-w-0 rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-blue-700">Serial No. Breakdown</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="flex w-36 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={!canEditSupplementDetails}
                        onClick={handleApplySupplementChanges}
                      >
                        <FontAwesomeIcon icon={faSave} />
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className="flex w-36 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        title="Preview all property tags from the serial table"
                        disabled={getPreviewableSerialRows().length === 0}
                        onClick={handlePreviewAllPpeTags}
                      >
                        <FontAwesomeIcon icon={faTags} />
                        Preview All Tags
                      </button>
                    </div>
                  </div>
                  <div className="global-tran-table-main-div-ui">
                    <div className="global-tran-table-main-sub-div-ui">
                      <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                        <thead className="global-tran-thead-div-ui">
                          <tr>
                            {orderedFarrSerialColumns.map((column) =>
                              renderFarrSerialHeader(column.label, column.key, column.width, {
                                orderedColumns: orderedFarrSerialColumns,
                              })
                            )}
                          </tr>
                        </thead>
                        <tbody className="relative">
                          {sortedFarrSerialRows.map(({ row, originalIndex }) => (
                            <tr key={`${row.assetTag}-${originalIndex}`} className="global-tran-tr-ui">
                              {orderedFarrSerialColumns.map((column) => renderSerialCell(column.key, row, originalIndex))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {renderFarrSerialHeaderContextMenu()}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-md border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-bold text-blue-700">Warranty & Notes</p>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,0.7fr)_minmax(280px,1fr)]">
                    <div className="space-y-2">
                      <div className="relative w-full">
                        <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                          <DateFormatInput id="warrantyStartDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={state.warrantyStartDate} updateState={handleWarrantyStartDateChange} disabled={!canEditSupplementDetails} />
                        </div>
                        <label htmlFor="warrantyStartDate" className="global-ref-floating-label global-ref-label-enabled">Warranty Start Date</label>
                      </div>
                      <div className="relative w-full">
                        <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                          <DateFormatInput id="warrantyExpiryDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={state.warrantyExpiryDate} updateState={handleWarrantyExpiryChange} disabled={!canEditSupplementDetails} />
                        </div>
                        <label htmlFor="warrantyExpiryDate" className="global-ref-floating-label global-ref-label-enabled">Warranty Expiry Date</label>
                      </div>
                      <FieldRenderer id="warrantyMonths" label="Warranty (Months)" value={state.warrantyMonths} onChange={handleWarrantyMonthsChange} onKeyDown={handleWarrantyMonthsKeyDown} disabled={!canEditSupplementDetails} inputMode="numeric" />
                    </div>
                    <textarea className="min-h-[82px] w-full rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 lg:min-h-full" value={state.warrantyNotes} onChange={(e) => canEditSupplementDetails && updateState({ warrantyNotes: e.target.value })} disabled={!canEditSupplementDetails} readOnly={!canEditSupplementDetails} />
                  </div>
                </div>
              </div>

            </div>
          )}

          {withCostAmount && detailTab === "glEntries" && (
            <>
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {orderedFarrGlColumns.map((column) =>
                          renderFarrGlHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedFarrGlColumns,
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
                      {sortedFarrGlRows.map(({ row, originalIndex }) => (
                        <tr key={`${row.acctCode}-${originalIndex}`} className="global-tran-tr-ui">
                          {orderedFarrGlColumns.map((column) => renderGlCell(column.key, row, originalIndex))}
                          {!isFormDisabled && (
                            <td
                              className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                              style={transactionActionsCellStyle}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  className="global-tran-td-button-add-ui"
                                  disabled={!hasReceivingDetails}
                                  onClick={() => handleAddRowGL(originalIndex)}
                                >
                                  <FontAwesomeIcon icon={faPlus} />
                                </button>
                                <button
                                  type="button"
                                  className="global-tran-td-button-delete-ui"
                                  onClick={() => handleDeleteRowGL(originalIndex)}
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
                  {renderFarrGlHeaderContextMenu()}
                </div>
              </div>

              <div className="global-tran-tab-footer-main-div-ui">
                <div className="global-tran-tab-footer-button-div-ui">
                  <button
                    onClick={() => handleAddRowGL()}
                    className="global-tran-tab-footer-button-add-ui"
                    disabled={!hasReceivingDetails}
                    style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
                  </button>
                </div>

                <div className="global-tran-tab-footer-total-main-div-ui">
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                      Total Debit ({state.glCurrDefault}):
                    </label>
                    <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                      {glTotals.totalDebit}
                    </label>
                  </div>

                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                      Total Credit ({state.glCurrDefault}):
                    </label>
                    <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                      {glTotals.totalCredit}
                    </label>
                  </div>

                  {state.glCurrDefault !== state.currCode && (
                    <div className="global-tran-tab-footer-total-main-div-ui">
                      <div className="global-tran-tab-footer-total-div-ui">
                        <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
                          Total Debit ({state.currCode}):
                        </label>
                        <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
                          {glTotals.totalDebitFx1}
                        </label>
                      </div>

                      <div className="global-tran-tab-footer-total-div-ui">
                        <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
                          Total Credit ({state.currCode}):
                        </label>
                        <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
                          {glTotals.totalCreditFx1}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getFARRHistory"
          cacheKey={`FARR:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="FARR_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {state.payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeModalOpen}
          onClose={handleClosePayeeModal}
          customParam={payeeLookupCustomParam}
        />
      )}

      {state.showAccountModal && (
        <COAMastLookupModal
          isOpen={state.showAccountModal}
          onClose={handleCloseAccountModal}
          source={state.accountModalSource}
          customParam={glAccountFilter.ActiveAll}
        />
      )}

      {state.showRcModal && (
        <RCLookupModal
          isOpen={state.showRcModal}
          onClose={handleCloseRcModal}
          source={state.accountModalSource}
        />
      )}

      {state.showVatModal && (
        <VATLookupModal
          isOpen={state.showVatModal}
          onClose={handleCloseVatModal}
          customParam="InputGoods"
        />
      )}

      {state.showAtcModal && (
        <ATCLookupModal
          isOpen={state.showAtcModal}
          onClose={handleCloseAtcModal}
        />
      )}

      {state.showSlModal && (
        <SLMastLookupModal
          isOpen={state.showSlModal}
          onClose={handleCloseSlModal}
        />
      )}

      {state.showFaCategoryModal && (
        <SearchFACateg
          isOpen={state.showFaCategoryModal}
          onClose={handleCloseFaCategoryModal}
        />
      )}

      {state.showFaClassModal && (
        <SearchFAClass
          isOpen={state.showFaClassModal}
          onClose={handleCloseFaClassModal}
          categCode={state.faClassLookupCategCode || detailRows[selectedRowIndex]?.categCode || ""}
        />
      )}

      {state.showFaLocModal && (
        <SearchFALoc
          isOpen={state.showFaLocModal}
          onClose={handleCloseFaLocModal}
          branchCode="HO"
        />
      )}

      {state.showCutoffModal && (
        <SearchCutoffRef
          isOpen={state.showCutoffModal}
          onClose={handleCloseCutoffModal}
          source={state.accountModalSource}
        />
      )}

      {state.itemLookupModalOpen && (
        <ItemMastLookupModal
          isOpen={state.itemLookupModalOpen}
          endpoint={state.itemLookupEndPoint}
          docType="FARR"
          enableMultiSelect
          onClose={handleCloseItemLookup}
        />
      )}

      {state.poLookupModalOpen && (
        <GlobalCombinedLookup
          isOpen={state.poLookupModalOpen}
          title="Open Purchase Order"
          summarySelectionMode="multiple"
          detailSelectionMode="multiple"
          summaryColumns={state.openPORRColSummary}
          detailColumns={state.openPORRColDetail}
          summaryData={state.openPODataSummary}
          tabTitles={["Open PO Summary", "Open PO Detail"]}
          fetchDetailApi={async (selectedIds) => {
            const selectedIdList = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
            const selectedSummaries = state.openPODataSummary.filter((row) => selectedIdList.includes(row.groupId));

            if (!(await validateOpenPOSameSupplier(selectedSummaries))) {
              throw new Error("Selected PO records must have the same supplier.");
            }

            const idString = selectedIdList.join(",");
            const payload = {
              json_data: JSON.stringify({
                json_data: {
                  selectedId: idString,
                  tranIds: idString,
                },
              }),
            };

            const response = await postRequest("getPORR_OpenDetail", payload);
            const rows = response?.data?.[0]?.result
              ? extractLookupRows(response.data[0].result)
              : extractLookupRows(response?.data || response);

            return {
              data: [
                {
                  result: JSON.stringify(rows),
                },
              ],
            };
          }}
          onCancel={() => updateState({ poLookupModalOpen: false })}
          onClose={handleClosePOOpenModal}
        />
      )}

      {state.showCancelModal && (
        <CancelTranModal
          isOpen={state.showCancelModal}
          onClose={handleCloseCancel}
        />
      )}

      {state.showAttachModal && (
        <AttachDocumentModal
          isOpen={state.showAttachModal}
          params={{
            DocumentID: state.documentID,
            DocumentName: documentTitle,
            BranchName: state.branchName,
            DocumentNo: state.farrNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}

      {state.showSignatoryModal && (
        <DocumentSignatories
          isOpen={state.showSignatoryModal}
          params={{
            noReprints: state.noReprints,
            documentID: state.documentID,
            docType,
          }}
          onClose={handleCloseSignatory}
          onCancel={() => updateState({ showSignatoryModal: false })}
        />
      )}

      {selectedPpeTagRow && (
        <SearchPPETag
          isOpen={!!selectedPpeTagRow}
          companyInfo={companyInfo}
          documentInfo={{
            documentNo: state.farrNo,
            documentDate: state.farrDate,
            branchCode: state.branchCode,
            branchName: state.branchName,
          }}
          detailRow={selectedPpeTagRow.detailRow}
          serialRow={selectedPpeTagRow.serialRow}
          serialRows={selectedPpeTagRow.serialRows}
          onClose={() => setSelectedPpeTagRow(null)}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType,
            documentTitle,
            fieldNo: "farrNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: state.farrNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}
    </div>
  );
};

export default FARR;
