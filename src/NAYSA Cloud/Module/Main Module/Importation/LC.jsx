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
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import SearchLCRef from "../../../Lookup/SearchLCRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import GlobalApprovalStatus from "@/NAYSA Cloud/Approval/GlobalApprovalStatus.jsx";

// Configuration
import { fetchData, fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
  useFormatToDate
} from '@/NAYSA Cloud/Global/dates';
import {
  useSelectedHSColConfig
} from '@/NAYSA Cloud/Global/selectedData.js';

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopPayeeRow,
  useTopVatRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

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

const LC = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const navigate = useNavigate();
  const { companyInfo, currentUserRow, getAllTopHSDocRow, getAllTopVatAmount } = useAuth();
  const { resetFlag } = useReset();
  const location = useLocation();
  const [isViewDocument, setIsViewDocument] = useState(false);
  const decQty = companyInfo?.itemDecqtyPur ?? 2;
  const decUPrice = companyInfo?.pur_decuprice ?? 2;
  const docType = docTypes?.LC || "LC";
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
    // Document information
    documentName: hsDoc?.docName || "",
    documentSeries: hsDoc?.docSeries || "Auto",
    documentDocLen: hsDoc?.docLength || 8,
    documentID: null,
    apvId:"",
    documentNo: "",
    documentStatus: "",
    status: "O",
    originalDocStatus: "O",
    appLevel: 0,

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",

    // Importation / Landed Cost header fields from desktop VB form
    brokerCode: "",
    brokerName: "",
    forwarderCode: "",
    forwarderName: "",
    shipmentMode: "Sea",
    importationDate: useGetCurrentDayV2(),
    countryOrigin: "",
    refLcNo1: "",
    refLcNo2: "",
    importEntryNo: "",
    releaseDate: useGetCurrentDayV2(),
    awbBlNo: "",
    allocationType: "Amount",
    totalQuantity: "0.00",
    totalRRAmt: "0.00",
    totalShippingCost: "0.00",
    totalLandedCost: "0.00",

    // Other Header Info
    tblFieldArray: [],
    rcCode: "",
    rcName: "",
    vendCode: "",
    vendNameHeader: "",
    remarks: "",
    noReprints: "0",
    userCode: "",
    groupId: "",

    payeeLookupContext: "payee",
    payeeModalOpen: false,
    vatLookupModalOpen: false,
    showOpenRRModal: false,
    showAllTranDocNo: false,
    showRRRefModal: false,
    globalLookupRow: [],
    globalLookupHeader: [],
    openRR_Data_Summary: [],
    openRR_Col_Summary: [],

    // Detail lines
    detailRows: [],
    detailRowsApp: [],

    // Modal states
    selectedRowIndex: null,
    branchModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostModal: false,
    showApprovalStatusModal: false,

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"
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
    apvId,
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

    showAllTranDocNo,

    // Header
    branchCode,
    branchName,
    brokerCode,
    brokerName,
    forwarderCode,
    forwarderName,
    shipmentMode,
    importationDate,
    countryOrigin,
    refLcNo1,
    refLcNo2,
    importEntryNo,
    releaseDate,
    awbBlNo,
    allocationType,
    totalQuantity,
    totalRRAmt,
    totalShippingCost,
    totalLandedCost,

    // Responsibility Center
    rcCode,
    rcName,

    vendCode,
    vendNameHeader,

    tblFieldArray,
    remarks,
    noReprints,
    userCode,
    selectedRowIndex,

    payeeLookupContext,
    payeeModalOpen,

    detailRows,

    // Modals
    branchModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    vatLookupModalOpen,
    showOpenRRModal,
    showApprovalStatusModal,
    detailRowsApp,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,
    openRR_Data_Summary,
    openRR_Col_Summary,

  } = state;


  const [shipmentCostRows, setShipmentCostRows] = useState([]);
  const [shipmentCostLookup, setShipmentCostLookup] = useState({ type: "", rowIndex: null });
  const [totals, setTotals] = useState({
    totalDiscount: "0.00",
    totalGross: "0.00",
    totalVat: "0.00",
    totalNet: "0.00",
  });

  const DEC_QTY = 2;
  const DEC_AMT = 2;

  const shipmentItemColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 80 },
    { key: "rrNo", label: "RR No.", width: 120 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 120 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
    { key: "itemCost", label: "Amount", width: 140 },
    { key: "allocRate", label: "Alloc Rate", width: 120 },
    { key: "shippingCost", label: "Shipping Cost", width: 140 },
    { key: "landedCost", label: "Landed Cost", width: 140 },
    { key: "unitShipCost", label: "Unit Ship Cost", width: 150 },
    { key: "unitLandedCost", label: "Unit Landed Cost", width: 160 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rrLineNo", label: "RR LN", width: 90 },
    { key: "acctCode", label: "Account Code", width: 140 },
  ];

  const openRRLookupColumns = [
    { key: "type", label: "Type", width: 60 },
    { key: "branchCode", label: "BC", width: 60 },
    { key: "rrNo", label: "RR No", width: 110 },
    { key: "rrDate", label: "RR Date", width: 100 },
    { key: "poNo", label: "PO No", width: 110 },
    { key: "vendCode", label: "Payee Code", width: 100 },
    { key: "vendName", label: "Payee Name", width: 200 },
    { key: "siNo", label: "SI No", width: 110 },
    { key: "siDate", label: "SI Date", width: 100 },
    { key: "siAmount", label: "SI Amt", width: 110, type: "amount" },
    { key: "drAcct", label: "DR Account", width: 90 },
    { key: "rcCode", label: "Responsibility Code", width: 90 },
    { key: "vatCode", label: "VAT Code", width: 90 },
    { key: "vatDesc", label: "VAT Desc", width: 200 },
    { key: "vatAmount", label: "VAT Amount", width: 110, type: "amount" },
  ];

  const shipmentCostColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "billCode", label: "SC Code", width: 90 },
    { key: "billDesc", label: "Shipment Cost Description", width: 220 },
    { key: "vendCode", label: "Payee Code", width: 120 },
    { key: "vendName", label: "Payee Name", width: 260 },
    { key: "billAmt", label: "SC Amount", width: 130 },
    { key: "vatCode", label: "VAT Code", width: 110 },
    { key: "vatName", label: "VAT Description", width: 160 },
    { key: "vatAmt", label: "VAT Amt", width: 130 },
    { key: "netAmt", label: "Net Amount", width: 130 },
    { key: "siNo", label: "SI No.", width: 120 },
    { key: "siDate", label: "SI Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 200 },
    { key: "acctCode", label: "Account Code", width: 140 },
    { key: "rcCode", label: "RC Code", width: 120 },
  ];

  const {
    getColumnStyle: getShipmentItemColumnStyle,
    getFrozenColumnStyle: getShipmentItemFrozenStyle,
    getOrderedColumns: getOrderedShipmentItemColumns,
    getSortedRows: getSortedShipmentItemRows,
    clearAllSorting: clearShipmentItemSorting,
    clearZeroValueOnFocus: clearShipmentItemZeroOnFocus,
    focusNextRowInput: focusNextShipmentItemRowInput,
    renderHeaderContextMenu: renderShipmentItemHeaderContextMenu,
    renderResizableHeader: renderShipmentItemHeader,
  } = useResizableTableColumns(shipmentItemColumnDefs);

  const orderedShipmentItemColumns = getOrderedShipmentItemColumns(shipmentItemColumnDefs);
  const getShipmentItemFallbackWidth = (key) => shipmentItemColumnDefs.find((column) => column.key === key)?.width || 120;
  const getShipmentItemCellStyle = (key, fallbackWidth) => ({
    ...getShipmentItemColumnStyle(key, fallbackWidth),
    ...getShipmentItemFrozenStyle(key, orderedShipmentItemColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedShipmentItemRows = getSortedShipmentItemRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const {
    getColumnStyle: getShipmentCostColumnStyle,
    getFrozenColumnStyle: getShipmentCostFrozenStyle,
    getOrderedColumns: getOrderedShipmentCostColumns,
    getSortedRows: getSortedShipmentCostRows,
    renderHeaderContextMenu: renderShipmentCostHeaderContextMenu,
    renderResizableHeader: renderShipmentCostHeader,
  } = useResizableTableColumns(shipmentCostColumnDefs);

  const orderedShipmentCostColumns = getOrderedShipmentCostColumns(shipmentCostColumnDefs);
  const getShipmentCostFallbackWidth = (key) => shipmentCostColumnDefs.find((column) => column.key === key)?.width || 120;
  const getShipmentCostCellStyle = (key, fallbackWidth) => ({
    ...getShipmentCostColumnStyle(key, fallbackWidth),
    ...getShipmentCostFrozenStyle(key, orderedShipmentCostColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedShipmentCostRows = getSortedShipmentCostRows(
    shipmentCostRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const shipmentCostTotals = useMemo(() => {
    const rows = Array.isArray(shipmentCostRows) ? shipmentCostRows : [];
    let billAmt = 0, vatAmt = 0, netAmt = 0;

    rows.forEach((row) => {
      billAmt += parseFormattedNumber(row.billAmt || 0);
      vatAmt += parseFormattedNumber(row.vatAmt || 0);
      netAmt += parseFormattedNumber(row.netAmt || 0);
    });

    return {
      billAmt: formatNumber(billAmt || 0, DEC_AMT),
      vatAmt: formatNumber(vatAmt || 0, DEC_AMT),
      netAmt: formatNumber(netAmt || 0, DEC_AMT),
    };
  }, [shipmentCostRows]);

  const appliedShipmentItemAllocationSignatureRef = useRef("");

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = "Landed Cost Transaction";
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

  const isApvLocked = String(apvId || "").trim() !== "";
  const displayStatus = isApvLocked ? "Locked Transaction" : getFullStatus(status);

  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };

  const statusColor = isApvLocked ? "global-tran-stat-text-finalized-ui" : statusMap[displayStatus] || "";
  const maxApprovalLevel = Number(currentUserRow?.lcMaxAppLevel || currentUserRow?.maxAppLevel || 0);
  const currentApprovalLevel = Number(appLevel ?? 0);
  const approvalStatusHiddenStatuses = ["CANCELLED", "POSTED", "FINALIZED", "LOCKED TRANSACTION"];
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
  const isDocumentLocked =
    isViewDocumentUrl ||
    isApvLocked ||
    ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);
  const isApprovalLocked =
    currentApprovalLevel > 0 &&
    currentApprovalLevel <= maxApprovalLevel;
  const isFormDisabled = isDocumentLocked || isApprovalLocked;

  const recalcShipmentItemRow = (row = {}) => {
    const quantityValue = parseFormattedNumber(row.quantity || 0);
    const unitCostValue = parseFormattedNumber(row.unitCost || 0);
    const itemCostValue = quantityValue * unitCostValue;
    const shippingCostValue = parseFormattedNumber(row.shippingCost || 0);
    const landedCostValue = itemCostValue + shippingCostValue;

    return {
      ...row,
      quantity: formatNumber(quantityValue || 0, decQty),
      unitCost: formatNumber(unitCostValue || 0, decUPrice),
      itemCost: formatNumber(itemCostValue || 0, DEC_AMT),
      landedCost: formatNumber(landedCostValue || 0, DEC_AMT),
      unitShipCost: formatNumber(quantityValue ? shippingCostValue / quantityValue : 0, 6),
      unitLandedCost: formatNumber(quantityValue ? landedCostValue / quantityValue : 0, 6),
    };
  };

  const updateTotalsDisplay = (rows) => {
    const arr = rows || [];
    let quantity = 0, rrAmount = 0, shipCost = 0, landed = 0;

    arr.forEach((r) => {
      quantity += parseFormattedNumber(r.quantity || 0);
      rrAmount += parseFormattedNumber(r.itemCost || 0);
      shipCost += parseFormattedNumber(r.shippingCost || 0);
      landed += parseFormattedNumber(r.landedCost || 0);
    });

    setTotals({
      totalDiscount: formatNumber(quantity || 0, DEC_QTY),
      totalGross: formatNumber(rrAmount || 0, DEC_AMT),
      totalVat: formatNumber(shipCost || 0, DEC_AMT),
      totalNet: formatNumber(landed || 0, DEC_AMT),
    });

    updateState({
      totalQuantity: formatNumber(quantity || 0, DEC_QTY),
      totalRRAmt: formatNumber(rrAmount || 0, DEC_AMT),
      totalShippingCost: formatNumber(shipCost || 0, DEC_AMT),
      totalLandedCost: formatNumber(landed || 0, DEC_AMT),
    });
  };

  const getShipmentItemAllocationSignature = (rows = []) =>
    [
      allocationType || "Amount",
      shipmentCostTotals.netAmt || "0.00",
      (rows || [])
        .map((row, index) =>
          [
            index,
            row?.groupId || "",
            row?.rrId || "",
            row?.itemCode || "",
            parseFormattedNumber(row?.quantity || 0),
            parseFormattedNumber(row?.itemCost || 0),
          ].join(":")
        )
        .join("|"),
    ].join("::");

  const recalculateShipmentItemAllocations = (sourceRows = []) => {
    const rows = Array.isArray(sourceRows) ? sourceRows : [];

    if (!rows.length) {
      return rows;
    }

    const totalShippingCost = parseFormattedNumber(shipmentCostTotals.netAmt || 0);
    const allocationMode = String(allocationType || "Amount").trim();
    const baseTotal =
      allocationMode === "Quantity"
        ? rows.reduce((sum, row) => sum + parseFormattedNumber(row.quantity || 0), 0)
        : rows.reduce((sum, row) => sum + parseFormattedNumber(row.itemCost || 0), 0);

    if (baseTotal <= 0 || totalShippingCost <= 0) {
      return rows.map((row) =>
        recalcShipmentItemRow({
          ...row,
          allocRate: formatNumber(0, 5),
          shippingCost: formatNumber(0, DEC_AMT),
        })
      );
    }

    const allocRate = totalShippingCost / baseTotal;
    let allocatedShipping = 0;

    return rows.map((row, index) => {
      const itemAmount =
        allocationMode === "Quantity"
          ? parseFormattedNumber(row.quantity || 0)
          : parseFormattedNumber(row.itemCost || 0);
      let shippingCostValue = index === rows.length - 1
        ? totalShippingCost - allocatedShipping
        : Math.round((itemAmount * allocRate) * 100) / 100;

      if (index !== rows.length - 1) {
        allocatedShipping += shippingCostValue;
      }

      return recalcShipmentItemRow({
        ...row,
        allocRate: formatNumber(allocRate, 5),
        shippingCost: formatNumber(shippingCostValue, DEC_AMT),
      });
    });
  };

  const syncShipmentItemAllocations = (sourceRows = detailRows || []) => {
    const allocationSignature = getShipmentItemAllocationSignature(sourceRows);
    if (appliedShipmentItemAllocationSignatureRef.current === allocationSignature) {
      return sourceRows;
    }

    const updatedRows = recalculateShipmentItemAllocations(sourceRows);
    const updatedSignature = getShipmentItemAllocationSignature(updatedRows);

    if (updatedSignature === appliedShipmentItemAllocationSignatureRef.current) {
      return sourceRows;
    }

    appliedShipmentItemAllocationSignatureRef.current = updatedSignature;
    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
    return updatedRows;
  };

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  useEffect(() => {
    syncShipmentItemAllocations(detailRows || []);
  }, [shipmentCostTotals.netAmt, allocationType]);

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

  const handleReset = () => {
    clearShipmentItemSorting();
    loadCompanyData();

    const today = useGetCurrentDayV2();
    const defaultBranchCode = currentUserRow?.branchCode || "";
    const defaultBranchName = currentUserRow?.branchName || "";

    updateState({
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      rcCode: "",
      rcName: "",
      vendCode: "",
      apvId:"",
      vendNameHeader: "",
      brokerCode: "",
      brokerName: "",
      forwarderCode: "",
      forwarderName: "",
      shipmentMode: "Sea",
      importationDate: today,
      countryOrigin: "",
      refLcNo1: "",
      refLcNo2: "",
      importEntryNo: "",
      releaseDate: today,
      awbBlNo: "",
      allocationType: "Amount",
      totalQuantity: "0.00",
      totalRRAmt: "0.00",
      totalShippingCost: "0.00",
      totalLandedCost: "0.00",
      remarks: "",
      documentNo: "",
      documentID: "",
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
      detailRows: [],
      detailRowsApp: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      payeeModalOpen: false,
      vatLookupModalOpen: false,
      showOpenRRModal: false,
      showApprovalStatusModal: false,
      showAllTranDocNo: false,
      showRRRefModal: false,
      globalLookupRow: [],
      globalLookupHeader: [],
      openRR_Data_Summary: [],
      openRR_Col_Summary: [],
      selectedRowIndex: null,
    });
    setShipmentCostRows([]);
    setShipmentCostLookup({ type: "", rowIndex: null });
    appliedShipmentItemAllocationSignatureRef.current = "";

    updateTotalsDisplay([]);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      try {
        const hdtblcol_result = await useFieldLenghtCheck(
          "lc_hd,lc_dt1,lc_dt2"
        );
        if (hdtblcol_result) {
          updateState({ tblFieldArray: hdtblcol_result });
        }
      } catch (err) {
        console.error("Error field length check:", err);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };


  const fetchTranData = async (docNoParam, _branchCode, key = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay([]);
      setShipmentCostRows([]);
      appliedShipmentItemAllocationSignatureRef.current = "";
    };

    updateState({ isLoading: true });

    try {
      let formattedDocNo = docNoParam?.toString().trim() || "";
      if (formattedDocNo && /^\d+$/.test(formattedDocNo)) {
        formattedDocNo = formattedDocNo.padStart(8, '0');
      }

      const data = await useFetchTranData(
        formattedDocNo,
        _branchCode || branchCode,
        docType,
        "documentNo",
        key || ""
      );

      

      const fetchedDocumentID = data?.documentID || data?.docId || "";
      const fetchedDocumentNo = data?.documentNo || data?.docNo || "";

      if (!fetchedDocumentID && !fetchedDocumentNo) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      const detailRowsFromFetch = (data.dt1 || []).map((item) =>
        recalcShipmentItemRow({
          lN: item.lN || item.lnNo,
          invType: item.invType || "",
          groupId: item.groupId || "",
          rrId: item.rrId || "",
          rrNo: item.rrNo || "",
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
          uomCode: item.uomCode || "",
          quantity: formatNumber(item.quantity ?? 0, decQty),
          unitCost: formatNumber(item.unitCost ?? 0, decUPrice),
          itemCost: formatNumber(item.itemCost ?? 0, DEC_AMT),
          allocRate: formatNumber(item.allocRate ?? 0, 5),
          shippingCost: formatNumber(item.shippingCost ?? 0, 6),
          landedCost: formatNumber(item.landedCost ?? 0, DEC_AMT),
          unitShipCost: formatNumber(item.unitShipCost ?? 0, 6),
          unitLandedCost: formatNumber(item.unitLandedCost ?? 0, 6),
          itemSpecs: item.itemSpecs || "",
          vatCode: item.vatCode || "",
          vatName: item.vatName || "",
          rcCode: item.rcCode || "",
          rcName: item.rcName || "",
          rrLineNo: item.rrLineNo || "",
          acctCode: item.acctCode || "",
        })
      );

      const shipmentCostRowsFromFetch = (data.dt2 || data.shipmentCostRows || []).map((item) =>
        recalcShipmentCostRow({
          lN: item.lN || item.lnNo || item.lineNo || "",
          billCode: item.billCode || item.scCode || "",
          billDesc: item.billDesc || item.billName || item.scDesc || item.description || "",
          vendCode: item.vendCode || item.payeeCode || "",
          vendName: item.vendName || item.payeeName || "",
          billAmt: formatNumber(item.billAmt ?? item.scAmt ?? item.amount ?? 0, DEC_AMT),
          vatCode: item.vatCode || "",
          vatName: item.vatName || item.vatDesc || "",
          vatAmt: formatNumber(item.vatAmt ?? item.vatAmount ?? 0, DEC_AMT),
          netAmt: formatNumber(item.netAmt ?? item.netAmount ?? 0, DEC_AMT),
          siNo: item.siNo || "",
          siDate: useformatToDatev2(item.siDate) || item.siDate || "",
          remarks: item.remarks || "",
          acctCode: item.acctCode || "",
          acctName: item.acctName || "",
          rcCode: item.rcCode || "",
          rcName: item.rcName || "",
        })
      );
      updateTotalsDisplay(detailRowsFromFetch);
      setShipmentCostRows(shipmentCostRowsFromFetch);
      appliedShipmentItemAllocationSignatureRef.current = "";

      updateState({
        documentStatus: getStatusCode(data.status),
        status: getStatusCode(data.status),
        originalDocStatus: getStatusCode(data.status),
        appLevel: data.appLevel || 0,

        documentID: fetchedDocumentID,
        groupId: data.groupId || "",
        documentNo: fetchedDocumentNo,
        branchCode: data.branchCode || branchCode,
        branchName: data.branchName || branchName,
        apvId: data.apvId || "",
        importationDate: useformatToDatev2(data.importationDate) || data.importationDate || "",
        brokerCode: data.brokerCode || "",
        brokerName: data.brokerName || "",
        forwarderCode: data.forwarderCode || "",
        forwarderName: data.forwarderName || "",
        shipmentMode: data.shipmentMode || "",
        countryOrigin: data.countryOrigin || "",
        refLcNo1: data.refLcNo1 || data.lcNo || "",
        refLcNo2: data.refLcNo2 || "",
        importEntryNo: data.importEntryNo || "",
        releaseDate: useformatToDatev2(data.releaseDate) || data.releaseDate || "",
        awbBlNo: data.awbBlNo || "",
        allocationType: data.allocationType || "Amount",
        totalQuantity: formatNumber(data.totalQuantity ?? 0, DEC_QTY),
        totalRRAmt: formatNumber(data.totalRRAmt ?? data.amount ?? 0, DEC_AMT),
        totalShippingCost: formatNumber(data.totalShippingCost ?? 0, DEC_AMT),
        totalLandedCost: formatNumber(data.totalLandedCost ?? 0, DEC_AMT),
        remarks: data.remarks || data.particular || "",
        noReprints: data.noReprints ?? "0",

        detailRows: detailRowsFromFetch,
        detailRowsApp: Array.isArray(data.dtApp)
          ? data.dtApp
          : data.dtApp
            ? [data.dtApp]
            : [],

        isDocNoDisabled: true,
        isFetchDisabled: true,

        vendCode: data.vendCode || "",
        vendNameHeader: data.vendName || "",

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

  const getLookupValue = (row, ...keys) => {
    if (!row || typeof row !== "object") return "";

    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }

    const normalizeKey = (keyName) => String(keyName || "").replace(/[_\s-]/g, "").toLowerCase();
    const normalized = Object.entries(row).reduce((acc, [keyName, value]) => {
      acc[normalizeKey(keyName)] = value;
      return acc;
    }, {});

    for (const key of keys) {
      const value = normalized[normalizeKey(key)];
      if (value !== undefined && value !== null && value !== "") return value;
    }

    return "";
  };

  const extractOpenRRRows = (value) => {
    if (!value) return [];
    if (typeof value === "string") {
      try {
        return extractOpenRRRows(JSON.parse(value));
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.dt1)) return value.dt1;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.rows)) return value.rows;
    if (value?.result) return extractOpenRRRows(value.result);
    if (typeof value === "object" && Object.keys(value).length > 0) return [value];
    return [];
  };

  const extractOpenRRResponseRows = (response) => {
    const resultValue =
      response?.data?.[0]?.result ??
      response?.data?.[0]?.RESULT ??
      response?.data?.[0]?.JsonResult ??
      response?.data?.result ??
      response?.data?.RESULT ??
      response?.result ??
      response?.RESULT ??
      response?.JsonResult ??
      response?.data ??
      response;

    return extractOpenRRRows(resultValue);
  };

  const buildShipmentItemRowFromRR = (item = {}, summary = {}) => {
    const quantityValue = parseFormattedNumber(item.quantity || 0);
    const unitCostValue = parseFormattedNumber(item.unitCost || 0);
    const amountValue = quantityValue * unitCostValue;

    return recalcShipmentItemRow({
      lN: "",
      invType: item.invType || "",
      groupId: item.groupId || summary.groupId || "",
      rrId: item.rrId || "",
      rrNo: item.rrNo || "",
      rrDate: item.rrDate || "",
      vendCode: summary.vendCode || "",
      vendname: summary.vendname || "",
      rrRefNo: summary.rrRefNo || "",
      poNo: item.poNo || "",
      remarks: summary.remarks || "",
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      uomCode: item.uomCode || "",
      quantity: formatNumber(quantityValue || 0, decQty),
      unitCost: formatNumber(unitCostValue || 0, decUPrice),
      itemCost: formatNumber(amountValue || 0, DEC_AMT),
      allocRate: formatNumber(0, 5),
      shippingCost: formatNumber(0, 6),
      landedCost: formatNumber(amountValue || 0, DEC_AMT),
      unitShipCost: formatNumber(0, 6),
      unitLandedCost: formatNumber(0, 6),
      rcCode: item.rcCode || "",
      rrLineNo: item.rrLineNo || "",
      acctCode: item.acctCode || "",
    });
  };

  const handleOpenRRLookup = async () => {
    if (isFormDisabled) return;

    const lookupVendCode = String(vendCode || "").trim();
    const lookupBranchCode = String(branchCode || "").trim();

    const isValid = await useSwalvalidateRequiredFields(
      {
        "Header : Branch Code": lookupBranchCode,
        "Header : Payee Code": lookupVendCode,
      },
      "Open RR Lookup"
    );

    if (!isValid) return;

    try {
      updateState({ isLoading: true, showSpinner: true });

      const response = await fetchDataJson("getRRLC_OpenSummary", {
        branchCode: lookupBranchCode,
        vendCode: lookupVendCode,
      });

      const rrRows = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];

      if (!rrRows.length) {
        useSwalErrorAlert(
          "Open RR",
          "There are no open RR records for the selected payee and branch."
        );
        return;
      }

      const summaryColumns = await useSelectedHSColConfig("getRRLC_OpenSummary", currentUserRow?.userCode || "");

      updateState({
        openRR_Data_Summary: rrRows,
        openRR_Col_Summary: summaryColumns || [],
        showOpenRRModal: true,
      });
    } catch (error) {
      console.error("Failed to fetch Open RR:", error);
      useSwalErrorAlert("Open RR", error?.message || "Unable to load open RR records.");
      updateState({
        openRR_Data_Summary: [],
        openRR_Col_Summary: [],
      });
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleInsertSelectedOpenRR = async (payload) => {
    const selectedIds = Array.isArray(payload?.data) ? payload.data : [];
    const selectedSummaryRecords = Array.isArray(payload?.records) ? payload.records : [];

    if (!selectedIds.length) {
      updateState({
        showOpenRRModal: false,
        openRR_Data_Summary: [],
        openRR_Col_Summary: [],
      });
      return;
    }

    const idString = selectedIds.join(",");
    const requestPayload = {
      json_data: {
        tranIds: idString,
        selectedIds: idString,
      },
    };

    try {
      updateState({ isLoading: true, showSpinner: true });


      const response = await postRequest("getRRLC_Selected", JSON.stringify(requestPayload));
      const rawRows = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : response?.data || response;
      const selectedRecords = Array.isArray(rawRows) ? rawRows : [];

      if (!selectedRecords.length) {
        useSwalErrorAlert("Open RR", "No RR detail rows were returned for the selected record(s).");
        return;
      }

      const summaryByGroupId = new Map(
        selectedSummaryRecords
          .filter((summary) => String(summary?.groupId || "").trim())
          .map((summary) => [String(summary.groupId), summary])
      );

      const mappedRows = selectedRecords.map((item) => {
        const summary = summaryByGroupId.get(String(item.groupId || "")) || selectedSummaryRecords[0] || {};
        return buildShipmentItemRowFromRR(item, summary);
      });

      const updatedRows = [...(detailRowsRef.current || detailRows || []), ...mappedRows];
      detailRowsRef.current = updatedRows;
      appliedShipmentItemAllocationSignatureRef.current = "";
      updateState({
        detailRows: updatedRows,
        showOpenRRModal: false,
        openRR_Data_Summary: [],
        openRR_Col_Summary: [],
      });
      updateTotalsDisplay(updatedRows);
      syncShipmentItemAllocations(updatedRows);
    } catch (error) {
      console.error("getRRLC_Selected failed:", error);
      useSwalErrorAlert("Open RR", error?.message || "Unable to insert the selected RR rows.");
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

 



  const handleCloseVATLookup = async (selectedVAT) => {
    if (!selectedVAT) {
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
      });
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    let vatRate = 0;
    try {
      const vatRow = await useTopVatRow(selectedVAT.vatCode || "");
      vatRate = vatRow?.vatRate ?? 0;
    } catch (err) {
      console.error("Error fetching VAT row:", err);
    }

    if (shipmentCostLookup.type === "vat" && shipmentCostLookup.rowIndex != null) {
      updateShipmentCostRow(shipmentCostLookup.rowIndex, (row) =>
        recalcShipmentCostRow({
          ...row,
          vatCode: selectedVAT.vatCode || "",
          vatName: selectedVAT.vatName || "",
          vatRate,
          acctCode: selectedVAT.acctCode || row.acctCode || "",
        })
      );
      updateState({ vatLookupModalOpen: false });
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    if (selectedRowIndex == null) {
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
      });
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    const updatedRows = [...detailRows];
    const row = { ...updatedRows[selectedRowIndex] };
    row.vatCode = selectedVAT.vatCode || "";
    row.vatName = selectedVAT.vatName || "";
    row.acctCode = selectedVAT.acctCode || row.acctCode || "";
    row.vatRate = vatRate;

    const recalculated = recalcShipmentItemRow(row);
    updatedRows[selectedRowIndex] = recalculated;
    updateTotalsDisplay(updatedRows);
    updateState({
      vatLookupModalOpen: false,
      selectedRowIndex: null,
      detailRows: updatedRows,
    });
    setShipmentCostLookup({ type: "", rowIndex: null });
  };





  const handleNotify = async () => {
    if (!documentID) return;

    const confirm = await useSwalProceedConfirm(
      "Notify Approver?",
      `Do you want to notify the 1st Level Approver for ${documentTitle} ${documentNo || documentID}?`,
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
          appLevel: currentUserRow?.lcAppLevel || currentUserRow?.appLevel || "",
          mode: "Notify",
          reason: "",
          url: `${window.location.origin}/?page=${docType}ApprovalModal`,
        },
      };

      await postRequest(`approve${docType}`, payload);
      await useSwalSuccessAlert(`${documentTitle} Notified`, `${documentTitle} ${documentNo || documentID} has been notified.`);

      if (Number(appLevel) === -1 && documentNo && branchCode) {
        await fetchTranData(documentNo, branchCode);
      }
    } catch (error) {
      useSwalErrorAlert("Notify Error", error?.message || "Unable to notify.");
    } finally {
      updateState({ showSpinner: false });
    }
  };

  const handleDeleteRow = async (index) => {
    if (isFormDisabled) return;

    const currentRows = detailRowsRef.current || detailRows || [];
    const targetRow = currentRows[index] || {};
    const targetRrId = String(targetRow.rrId || "").trim();

    const message = targetRrId
      ? `This will delete the entire selected RR (${String(targetRow.rrNo||"").trim()}).\nAll item rows under this RR will be removed.`
      : "This will delete the selected item row.";

    const confirm = await useSwalProceedConfirm(
      "Delete Shipment Item?",
      message,
      "Yes",
      "No"
    );

    if (!confirm?.isConfirmed) {
      return;
    }

    const updatedRows = targetRrId
      ? currentRows.filter((row) => String(row?.rrId || "").trim() !== targetRrId)
      : currentRows.filter((_, rowIndex) => rowIndex !== index);

    detailRowsRef.current = updatedRows;
    appliedShipmentItemAllocationSignatureRef.current = "";
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
    syncShipmentItemAllocations(updatedRows);
  };

  const recalcShipmentCostRow = (row = {}) => {
    const billAmt = parseFormattedNumber(row.billAmt || 0);
    const vatAmt = row.vatCode ? getAllTopVatAmount(row.vatCode, billAmt) : 0;
    const netAmt = billAmt - vatAmt;

    return {
      ...row,
      billAmt: formatNumber(billAmt || 0, DEC_AMT),
      vatAmt: formatNumber(vatAmt || 0, DEC_AMT),
      netAmt: formatNumber(netAmt || 0, DEC_AMT),
    };
  };

  const createBlankShipmentCostRow = () => ({
      billCode: "",
      billDesc: "",
      vendCode: "",
      vendName: "",
      billAmt: formatNumber(0, DEC_AMT),
      vatCode: "",
      vatName: "",
      vatAmt: formatNumber(0, DEC_AMT),
      netAmt: formatNumber(0, DEC_AMT),
      siNo: "",
      siDate: "",
      remarks: "",
      acctCode: "",
      rcCode: rcCode || "",
    });

  const handleInsertShipmentCostBlankRow = (index) => {
    if (isFormDisabled) return;
    setShipmentCostRows((prevRows) => {
      const nextRows = [...(prevRows || [])];
      const insertIndex = Number.isInteger(index) ? index + 1 : nextRows.length;
      nextRows.splice(insertIndex, 0, createBlankShipmentCostRow());
      return nextRows;
    });
  };

  const handleDeleteShipmentCostRow = (index) => {
    if (isFormDisabled) return;
    setShipmentCostRows((prevRows) => {
      const nextRows = [...(prevRows || [])];
      nextRows.splice(index, 1);
      return nextRows;
    });
  };

  const handleShipmentCostChange = (index, field, value, commit = false) => {
    if (isFormDisabled) return;

    setShipmentCostRows((prevRows) => {
      const nextRows = [...(prevRows || [])];
      const row = { ...(nextRows[index] || {}) };
      const amountFields = ["billAmt", "vatAmt", "netAmt"];
      const nextValue = amountFields.includes(field)
        ? commit
          ? formatNumber(parseFormattedNumber(value || 0), DEC_AMT)
          : sanitizeNumeric(value)
        : value;

      const updatedRow = { ...row, [field]: nextValue };
      nextRows[index] = field === "billAmt" && commit
        ? recalcShipmentCostRow(updatedRow)
        : updatedRow;
      return nextRows;
    });
  };

  const openShipmentCostLookup = (type, rowIndex) => {
    if (isFormDisabled) return;
    setShipmentCostLookup({ type, rowIndex });

    if (type === "scCode") return;
    if (type === "payee") {
      updateState({ payeeLookupContext: "shipmentCost", payeeModalOpen: true });
      return;
    }
    if (type === "vat") {
      updateState({ vatLookupModalOpen: true });
      return;
    }
    if (type === "acct") return;
    if (type === "rc") {
      updateState({ rcLookupModalOpen: true, rcLookupContext: "shipmentCost" });
    }
  };

  const openShipmentCostAddLookup = () => {
    if (isFormDisabled) return;
    setShipmentCostLookup({ type: "scCodeMulti", rowIndex: null });
  };

  const updateShipmentCostRow = (rowIndex, updater) => {
    setShipmentCostRows((prevRows) => {
      const nextRows = [...(prevRows || [])];
      const currentRow = { ...(nextRows[rowIndex] || {}) };
      nextRows[rowIndex] = typeof updater === "function" ? updater(currentRow) : { ...currentRow, ...updater };
      return nextRows;
    });
  };

  const applyShipmentCostPatchToAllRows = (patch) => {
    setShipmentCostRows((prevRows) =>
      (prevRows || []).map((row) => ({
        ...row,
        ...patch,
      }))
    );
  };

  const confirmApplyShipmentCostChangesToAllRows = async ({
    headerLabel,
    patch,
  }) => {
    if ((shipmentCostRows?.length || 0) === 0) {
      return false;
    }

    const result = await useSwalProceedConfirm(
      `Apply ${headerLabel} changes?`,
      `Shipment Cost Details already has record(s).\nDo you want to apply the updated ${headerLabel} to all records?`,
      "Yes"
    );

    if (result?.isConfirmed) {
      applyShipmentCostPatchToAllRows(patch);
      return true;
    }

    return false;
  };

  const handleShipmentCostRemarksChange = (index, _field, value) => {
    handleShipmentCostChange(index, "remarks", value, false);
  };

  const focusShipmentCostInput = (rowIndex, field) => {
    setTimeout(() => {
      const nextEl = document.getElementById(`shipmentCost-${field}-${rowIndex}`);
      if (nextEl) {
        nextEl.focus();
        if (typeof nextEl.select === "function") nextEl.select();
      }
    }, 0);
  };

  const moveToNextShipmentCostRow = (index, field) => {
    const rows = shipmentCostRows || [];
    if (index >= rows.length - 1) return;

    focusShipmentCostInput(index + 1, field);
  };

  const handleShipmentCostKeyDown = (e, index, field, options = {}) => {
    if (isFormDisabled || options.readOnly) return;
    if (e.key !== "Enter") return;

    e.preventDefault();
    if (options.commitOnEnter) {
      handleShipmentCostChange(index, field, e.target.value, true);
    }
    moveToNextShipmentCostRow(index, field);
  };

  const buildShipmentCostRowFromRef = (selectedRef = {}) => ({
    ...createBlankShipmentCostRow(),
    billCode:
      selectedRef.billCode ||
      selectedRef.code ||
      selectedRef.lcCode ||
      "",
    billDesc:
      selectedRef.billDesc ||
      selectedRef.billName ||
      selectedRef.description ||
      selectedRef.name ||
      "",
    acctCode: selectedRef.acctCode || "",
  });

  const handleCloseShipmentCostRefLookup = async (selectedRef) => {
    if (!selectedRef) {
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    if (Array.isArray(selectedRef)) {
      if (selectedRef.length > 0) {
        const rowsToAdd = selectedRef.map((row) => buildShipmentCostRowFromRef(row));
        setShipmentCostRows((prevRows) => [...(prevRows || []), ...rowsToAdd]);
      }
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    if (shipmentCostLookup.rowIndex == null) {
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    const nextRow = buildShipmentCostRowFromRef(selectedRef);
    updateShipmentCostRow(shipmentCostLookup.rowIndex, nextRow);
    setShipmentCostLookup({ type: "", rowIndex: null });
  };

  const handleCloseShipmentCostAccountLookup = async (selectedAccount) => {
    if (!selectedAccount || shipmentCostLookup.rowIndex == null) {
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    const nextAccountPatch = {
      acctCode: selectedAccount.acctCode || "",
      acctName: selectedAccount.acctName || "",
    };

    updateShipmentCostRow(shipmentCostLookup.rowIndex, nextAccountPatch);

    if (shipmentCostLookup.rowIndex === 0 && (shipmentCostRows?.length || 0) > 1) {
      const applied = await confirmApplyShipmentCostChangesToAllRows({
        headerLabel: "Account Code",
        patch: nextAccountPatch,
      });
      if (!applied) {
        setShipmentCostLookup({ type: "", rowIndex: null });
        return;
      }
    }

    setShipmentCostLookup({ type: "", rowIndex: null });
  };

  const sanitizeNumeric = (v) => {
    const raw = String(v ?? "");
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
  };

  const formatByField = (field, num) => {
    if (!Number.isFinite(num)) return "";
    if (field === "quantity") return formatNumber(num, DEC_QTY);
    if (field === "unitCost") return formatNumber(num, decUPrice);
    if (["itemCost", "allocRate", "shippingCost", "landedCost", "unitShipCost", "unitLandedCost"].includes(field)) return formatNumber(num, DEC_AMT);
    return formatNumber(num);
  };




  const handleShipmentItemChange = (index, field, value, commit = false) => {
    if (isFormDisabled) return;

    const updatedRows = [...(detailRowsRef.current || detailRows || [])];
    const row = { ...(updatedRows[index] || {}) };
    const editableFields = ["quantity", "unitCost"];

    const nonNumericFields = ["invType", "rrNo", "itemCode", "itemName", "uomCode", "itemSpecs", "rcCode", "rcName", "rrLineNo", "acctCode"];

    if (nonNumericFields.includes(field)) {
      row[field] = value;
    } else {
      if (!editableFields.includes(field)) return;

      const sanitized = sanitizeNumeric(value);

      if (commit) {
        let num = parseFormattedNumber(sanitized);
        num = Number.isFinite(num) && num > 0 ? num : 0;

        // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ NEW: Inline Validation & Auto-Revert on input blur/enter
        row[field] = formatByField(field, num);
      } else {
        row[field] = sanitized;
      }
    }

    const activeInputValue = row[field];
    const recalculatedRow = recalcShipmentItemRow(row);
    if (!commit && editableFields.includes(field)) {
      recalculatedRow[field] = activeInputValue;
    }
    updatedRows[index] = recalculatedRow;
    detailRowsRef.current = updatedRows;
    appliedShipmentItemAllocationSignatureRef.current = "";
    updateState({ detailRows: updatedRows });
    updateTotalsDisplay(updatedRows);
    syncShipmentItemAllocations(updatedRows);
  };




  

const handleActivityOption = async (action) => {
  if (isFormDisabled) {
    return;
  }

  if (originalDocStatus !== "O" || detailRows.length === 0) {
    return;
  }

  updateState({ isLoading: true });

  try {
    const {
      branchCode,
      documentNo,
      documentID,
      rcCode,
      vendCode,
      vendNameHeader,
      remarks,
      noReprints,
      detailRows,
    } = state;

    const rowsForSave = (detailRows || []).map((row) => recalcShipmentItemRow(row));
    const shipmentCostRowsForSave = (shipmentCostRows || []).map((row) => recalcShipmentCostRow(row));

    const totalRrAmount = rowsForSave.reduce(
      (sum, row) =>
        sum + (parseFormattedNumber(row.itemCost || 0) || 0),
      0
    );

    const totalQuantity = rowsForSave.reduce(
      (sum, row) =>
        sum + (parseFormattedNumber(row.quantity || 0) || 0),
      0
    );

    const totalItemShippingCost = rowsForSave.reduce(
      (sum, row) =>
        sum + (parseFormattedNumber(row.shippingCost || 0) || 0),
      0
    );

    const totalLandedCost = rowsForSave.reduce(
      (sum, row) =>
        sum + (parseFormattedNumber(row.landedCost || 0) || 0),
      0
    );

    const totalVatAmount = shipmentCostRowsForSave.reduce(
      (sum, row) =>
        sum + (parseFormattedNumber(row.vatAmt || 0) || 0),
      0
    );

    const lcData = {
      branchCode: branchCode,
      branchName: branchName || "",
      documentNo: documentNo || "",
      documentID: documentID || "",
      importationDate: state.importationDate || useGetCurrentDayV2(),
      vendCode: vendCode || "",
      vendName: vendNameHeader || "",
      allocationType: state.allocationType || "Amount",
      brokerCode: state.brokerCode || "",
      brokerName: state.brokerName || "",
      forwarderCode: state.forwarderCode || "",
      forwarderName: state.forwarderName || "",
      shipmentMode: state.shipmentMode || "",
      countryOrigin: state.countryOrigin || "",
      refLcNo1: state.refLcNo1 || "",
      refLcNo2: state.refLcNo2 || "",
      importEntryNo: state.importEntryNo || "",
      releaseDate: state.releaseDate || null,
      awbBlNo: state.awbBlNo || "",
      totalQuantity: parseFormattedNumber(totalQuantity || 0),
      totalRRAmt: parseFormattedNumber(totalRrAmount || 0),
      totalShippingCost: parseFormattedNumber(totalItemShippingCost || 0),
      totalLandedCost: parseFormattedNumber(totalLandedCost || 0),
      amount: parseFormattedNumber(totalRrAmount || 0),
      vatAmount: parseFormattedNumber(totalVatAmount || 0),
      remarks: remarks || "",
      status: state.status || "O",
      userCode: currentUserRow?.userCode,

      dt1: rowsForSave.map((row, index) => ({
        documentID: documentID || "",
        groupId: row.groupId || "",
        invType: row.invType || "",
        lnNo: index + 1,
        rrNo: row.rrNo || "",
        rrId: row.rrId || "",
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        uomCode: row.uomCode || "",
        quantity: parseFormattedNumber(row.quantity || 0),
        unitCost: parseFormattedNumber(row.unitCost || 0),
        itemCost: parseFormattedNumber(row.itemCost || 0),
        allocRate: parseFormattedNumber(row.allocRate || 0),
        shippingCost: parseFormattedNumber(row.shippingCost || 0),
        landedCost: parseFormattedNumber(row.landedCost || 0),
        unitShipCost: parseFormattedNumber(row.unitShipCost || 0),
        unitLandedCost: parseFormattedNumber(row.unitLandedCost || 0),
        vatCode: row.vatCode || "",
        vatName: row.vatName || "",
        rcCode: row.rcCode || "",
        rcName: row.rcName || "",
        itemSpecs: row.itemSpecs || "",
        rrLineNo: row.rrLineNo || "",
        acctCode: row.acctCode || "",
      })),
      dt2: shipmentCostRowsForSave.map((row, index) => ({
        documentID: documentID || "",
        lnNo: index + 1,
        billCode: row.billCode || "",
        billDesc: row.billDesc || "",
        vendCode: row.vendCode || "",
        vendName: row.vendName || "",
        billAmt: parseFormattedNumber(row.billAmt || 0),
        vatCode: row.vatCode || "",
        vatName: row.vatName || "",
        vatAmt: parseFormattedNumber(row.vatAmt || 0),
        netAmt: parseFormattedNumber(row.netAmt || 0),
        siNo: row.siNo || "",
        siDate: row.siDate || null,
        remarks: row.remarks || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
      })),
    };


    const response = await postRequest(
      `upsert${docType}`,
      JSON.stringify({ json_data: lcData })
    );

    const responseData = response?.data?.[0] || {};
    const returnedErrorMsg = String(responseData.errorMsg || responseData.message || "").trim();
    const returnedErrorCount = Number(responseData.errorCount ?? 0);

    if (returnedErrorMsg || returnedErrorCount > 0) {
      useSwalErrorAlert("Validation Failed", returnedErrorMsg || "Unable to save transaction.");
      return;
    }

    if (!responseData.documentNo && !responseData.docNo && !responseData.documentID && !responseData.docId) {
      useSwalErrorAlert("Save Error", "Unexpected save response.");
      return;
    }

    const responseDocNo = responseData.documentNo || responseData.docNo || documentNo;
    const responseDocId = responseData.documentID || responseData.docId || documentID;

    if (responseDocNo || responseDocId) {
      await fetchTranData(responseDocNo, branchCode);
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
    updateState({ isLoading: false });
  }
};



  const handlePrint = async () => {
    if (!documentID) return;
    updateState({ showSignatoryModal: true });
  };

  
  const handleCancel = async () => {

    if (documentID && (documentStatus === "O" || documentStatus === "" )) {
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
      groupId: "",
    }));

    detailRowsRef.current = copiedDetailRows;
    appliedShipmentItemAllocationSignatureRef.current = "";

    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "O",
      status: "O",
      originalDocStatus: "O",
      importationDate: currentDate,
      releaseDate: currentDate,
      noReprints: "0",
      appLevel: 0,
      detailRows: copiedDetailRows,
      isDocNoDisabled: false,
      isFetchDisabled: false,
    });

    updateTotalsDisplay(copiedDetailRows);
    syncShipmentItemAllocations(copiedDetailRows);
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
     const docNo = params.get("docNo") || params.get("documentNo");
     const branchCode = params.get("branchCode");
   
     if (!loadedFromUrlRef.current && docNo && branchCode) {
       loadedFromUrlRef.current = true;
       handleHistoryRowPick({ docNo, branchCode });
     }
   }, [location.search, handleHistoryRowPick]);
   
    


  const printData = {
    doc_no: documentNo,
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

  const handleSaveAndPrint = async (docId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(docId, docType);
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

  const handleCloseRCModal = async (selectedRC) => {
    if (!selectedRC) {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    const { rcCode: selectedCode, rcName: selectedName } = selectedRC;

    if (rcLookupContext === "shipmentCost" && shipmentCostLookup.rowIndex != null) {
      const nextRcPatch = {
        rcCode: selectedCode,
        rcName: selectedName,
      };

      updateShipmentCostRow(shipmentCostLookup.rowIndex, nextRcPatch);

      if (shipmentCostLookup.rowIndex === 0 && (shipmentCostRows?.length || 0) > 1) {
        const applied = await confirmApplyShipmentCostChangesToAllRows({
          headerLabel: "RC Code",
          patch: nextRcPatch,
        });
        if (!applied) {
          setShipmentCostLookup({ type: "", rowIndex: null });
          updateState({
            rcLookupModalOpen: false,
            rcLookupContext: "",
          });
          return;
        }
      }

      setShipmentCostLookup({ type: "", rowIndex: null });
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else if (rcLookupContext === "rc") {
      const updatedRows = (detailRows || []).map((row) => ({
        ...row,
        rcCode: selectedCode,
        rcName: selectedName,
      }));

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
      updateState({ payeeModalOpen: false, payeeLookupContext: "payee" });
      setShipmentCostLookup({ type: "", rowIndex: null });
      return;
    }

    updateState({ payeeModalOpen: false, isLoading: true });

    try {
      const selectedVendCode = String(selectedData?.vendCode || "").trim();

      if (!selectedVendCode) {
        updateState({ isLoading: false, payeeLookupContext: "payee" });
        return;
      }

      const payeeRow = await useTopPayeeRow(selectedVendCode);

      const nextVendCode = payeeRow?.vendCode || selectedVendCode;
      const nextVendName = selectedData?.vendName || payeeRow?.vendName || "";
      const currentVendCode = String(vendCode || "").trim();
      const currentBrokerCode = String(brokerCode || "").trim();
      const currentForwarderCode = String(forwarderCode || "").trim();

      const isDuplicateSelection =
        (payeeLookupContext === "payee" &&
          (nextVendCode === currentBrokerCode || nextVendCode === currentForwarderCode)) ||
        (payeeLookupContext === "broker" &&
          (nextVendCode === currentVendCode || nextVendCode === currentForwarderCode)) ||
        (payeeLookupContext === "forwarder" &&
          (nextVendCode === currentVendCode || nextVendCode === currentBrokerCode));

      if (isDuplicateSelection) {
        useSwalErrorAlert(
          "Invalid Payee",
          "Payee Code, Broker, and Forwarder must all be different."
        );
        return;
      }

      if (payeeLookupContext === "shipmentCost" && shipmentCostLookup.rowIndex != null) {
        const nextVatCode = payeeRow?.vatCode || selectedData?.vatCode || "";
        let nextVatName = payeeRow?.vatName || selectedData?.vatName || "";
        let vatRate = parseFormattedNumber(payeeRow?.vatRate ?? selectedData?.vatRate ?? 0);

        if (nextVatCode && (!nextVatName || !vatRate)) {
          try {
            const vatRow = await useTopVatRow(nextVatCode);
            nextVatName = nextVatName || vatRow?.vatName || "";
            vatRate = vatRate || parseFormattedNumber(vatRow?.vatRate ?? 0);
          } catch (error) {
            console.error("Error fetching payee VAT row:", error);
          }
        }

        updateShipmentCostRow(shipmentCostLookup.rowIndex, (row) =>
          recalcShipmentCostRow({
            ...row,
            vendCode: nextVendCode,
            vendName: nextVendName,
            vatCode: nextVatCode,
            vatName: nextVatName,
            vatRate,
          })
        );
        setShipmentCostLookup({ type: "", rowIndex: null });
        updateState({ payeeLookupContext: "payee" });
        return;
      }

      if (payeeLookupContext === "broker") {
        updateState({
          brokerCode: nextVendCode,
          brokerName: nextVendName,
          payeeLookupContext: "payee",
        });
        return;
      }

      if (payeeLookupContext === "forwarder") {
        updateState({
          forwarderCode: nextVendCode,
          forwarderName: nextVendName,
          payeeLookupContext: "payee",
        });
        return;
      }

      updateState({
        vendCode: nextVendCode,
        vendNameHeader: nextVendName,
      });
    } catch (error) {
      console.error("Error in handleClosePayeeModal:", error);
    } finally {
      updateState({ isLoading: false, payeeLookupContext: "payee" });
    }
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

  const renderShipmentItemCell = (columnKey, row, index) => {
    const columnWidth = getShipmentItemFallbackWidth(columnKey);
    const style = getShipmentItemCellStyle(columnKey, columnWidth);
    const rowLocked = isFormDisabled;

    const focusNextDetailCell = (field) => {
      focusNextShipmentItemRowInput(index, field, {
        rows: detailRowsRef.current || detailRows,
        zeroClearFields: [],
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, val) => handleShipmentItemChange(nextIndex, nextField, val, false),
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
        if (options.commitOnEnter) handleShipmentItemChange(index, field, e.target.value, true);
        focusNextDetailCell(field);
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();
      if (e.key === "ArrowUp") focusDetailCell(field, Math.max(0, index - 1));
      if (e.key === "ArrowDown") focusDetailCell(field, Math.min((detailRowsRef.current || detailRows).length - 1, index + 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const editableColumns = orderedShipmentItemColumns
          .map((column) => column.key)
          .filter((key) => !["ln", "itemName", "uomCode", "itemCost", "allocRate", "shippingCost", "landedCost", "unitShipCost", "unitLandedCost"].includes(key));
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
        onChange={(e) => handleShipmentItemChange(index, field, e.target.value, false)}
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
            handleShipmentItemChange(index, field, sanitizedValue, false);
          }
        }}
        onFocus={(e) =>
          clearShipmentItemZeroOnFocus(e, {
            isEditable: !(options.readOnly ?? isFormDisabled) && !(options.disabled ?? false),
            onClear: (val) => handleShipmentItemChange(index, field, val, false),
          })
        }
        onBlur={(e) => {
          if (isFormDisabled || options.readOnly || options.disabled) return;
          handleShipmentItemChange(index, field, e.target.value, true);
        }}
        onKeyDown={(e) => handleGridKeyDown(e, field, { ...options, commitOnEnter: true })}
      />
    );

    const detailColumnRenderers = {
      ln: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          <input type="hidden" id={`groupId-${index}`} value={row.groupId || ""} readOnly />
          <input type="hidden" id={`rrId-${index}`} value={row.rrId || ""} readOnly />
          {index + 1}
        </td>
      ),
      invType: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`invType-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.invType || ""} onChange={(e) => handleShipmentItemChange(index, "invType", e.target.value)} disabled={rowLocked || !!row.itemCode} onKeyDown={(e) => handleGridKeyDown(e, "invType", { disabled: rowLocked || !!row.itemCode })}><option value="">Select</option><option value="MS">MS</option><option value="RM">RM</option><option value="FG">FG</option></select></td>,
      itemCode: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`itemCode-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.itemCode || ""} readOnly disabled={rowLocked} /></div></td>,
      itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { readOnly: true })}</td>,
      uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: true })}</td>,
      rcCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcCode", { readOnly: true })}</td>,

      rrNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rrNo", { readOnly: true })}</td>,
      quantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("quantity", { readOnly: rowLocked })}</td>,
      unitCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("unitCost", { readOnly: rowLocked })}</td>,
      itemCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("itemCost", { readOnly: true })}</td>,
      allocRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("allocRate", { readOnly: true })}</td>,
      shippingCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("shippingCost", { readOnly: true })}</td>,
      landedCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("landedCost", { readOnly: true })}</td>,
      unitShipCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("unitShipCost", { readOnly: true })}</td>,
      unitLandedCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("unitLandedCost", { readOnly: true })}</td>,
      rrLineNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rrLineNo", { readOnly: true })}</td>,
      acctCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("acctCode", { readOnly: true })}</td>,
      refNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("refNo", { readOnly: true })}</td>,
    };

    return detailColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
  };

  const renderShipmentCostCell = (columnKey, row, index) => {
    const columnWidth = getShipmentCostFallbackWidth(columnKey);
    const style = getShipmentCostCellStyle(columnKey, columnWidth);
    const amountFields = ["billAmt", "vatAmt", "netAmt"];
    const readOnlyFields = [
      "billCode",
      "billDesc",
      "vendCode",
      "vendName",
      "vatCode",
      "vatName",
      "vatAmt",
      "netAmt",
      "acctCode",
      "rcCode",
    ];

    if (columnKey === "ln") {
      return <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>;
    }

    const lookupInput = (field, lookupType) => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input
            type="text"
            id={`shipmentCost-${field}-${index}`}
            className="w-full global-tran-td-inputclass-ui pr-6"
            value={row[field] || ""}
            readOnly
            disabled={isFormDisabled}
          />
          {!isFormDisabled && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() => openShipmentCostLookup(lookupType, index)}
            />
          )}
        </div>
      </td>
    );

    if (columnKey === "billCode") return lookupInput("billCode", "scCode");
    if (columnKey === "vendCode") return lookupInput("vendCode", "payee");
    if (columnKey === "vatCode") return lookupInput("vatCode", "vat");
    if (columnKey === "acctCode") return lookupInput("acctCode", "acct");
    if (columnKey === "rcCode") return lookupInput("rcCode", "rc");
    if (columnKey === "remarks") {
      return (
        <td key={columnKey} className="global-tran-td-ui relative" style={style}>
          <div className="relative flex items-center">
            <input
              type="text"
              id={`shipmentCost-${columnKey}-${index}`}
              className="w-full global-tran-td-inputclass-ui pr-8"
              value={row.remarks || ""}
              readOnly
              disabled={isFormDisabled}
            />
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() =>
                  useSwalHandleOpenSpecsModal(
                    index,
                    shipmentCostRows,
                    handleShipmentCostRemarksChange,
                    row.remarks,
                    "Remarks",
                    "remarks",
                    `Enter remarks for ${row.billCode || "this shipment cost"}...`
                  )
                }
              />
            )}
          </div>
        </td>
      );
    }

    if (columnKey === "siDate") {
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <input
            type="date"
            id={`shipmentCost-${columnKey}-${index}`}
            className="w-full global-tran-td-inputclass-ui text-center"
            value={toDateInputValue(row[columnKey])}
            disabled={isFormDisabled}
            onChange={(e) => handleShipmentCostChange(index, columnKey, e.target.value)}
            onKeyDown={(e) => handleShipmentCostKeyDown(e, index, columnKey)}
          />
        </td>
      );
    }

    return (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <input
          type="text"
          id={`shipmentCost-${columnKey}-${index}`}
          className={`w-full global-tran-td-inputclass-ui ${amountFields.includes(columnKey) ? "text-right" : ""}`}
          value={row[columnKey] || ""}
          readOnly={readOnlyFields.includes(columnKey)}
          disabled={isFormDisabled}
          onChange={(e) => {
            if (readOnlyFields.includes(columnKey)) return;
            const nextValue = amountFields.includes(columnKey)
              ? sanitizeNumeric(e.target.value)
              : e.target.value;
            handleShipmentCostChange(index, columnKey, nextValue, false);
          }}
          onFocus={(e) => {
            if (columnKey === "billAmt" && parseFormattedNumber(e.target.value || 0) === 0) {
              handleShipmentCostChange(index, columnKey, "", false);
              setTimeout(() => e.target.select?.(), 0);
            }
          }}
          onBlur={(e) => {
            if (readOnlyFields.includes(columnKey)) return;
            if (amountFields.includes(columnKey)) handleShipmentCostChange(index, columnKey, e.target.value, true);
          }}
          onKeyDown={(e) =>
            handleShipmentCostKeyDown(e, index, columnKey, {
              readOnly: readOnlyFields.includes(columnKey),
              commitOnEnter: amountFields.includes(columnKey),
            })
          }
        />
      </td>
    );
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
          showCopyForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          disableRouteNavigation={true}
          detailsRoute="/page/LC"
          isSaveDisabled={isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) === 0)}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || isApvLocked || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
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

          {/* Importation / Landed Cost Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols- gap-4 rounded-lg relative"
            id="lc_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Document */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch Code"
                  type="lookup"
                  value={branchName || branchCode || ""}
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  readOnly
                  lookupDisabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  onLookup={() =>
                    !(state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled) &&
                    updateState({ branchModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="docNo"
                  label="LC No."
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
                      document.getElementById("docDate")?.focus();
                    }
                  }}
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="importationDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={importationDate}
                      disabled={isFormDisabled}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="docDate" className="global-ref-floating-label global-ref-label-enabled">
                    LC Date
                  </label>
                </div>

                <FieldRenderer
                  id="payeeCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={vendCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({ payeeLookupContext: "payee", payeeModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="payeeName"
                  label="Payee Name"
                  required
                  type="text"
                  value={vendNameHeader || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ vendNameHeader: val })}
                />
              </div>

              {/* Column 2: Allocation / Broker */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="allocationType"
                  label="Allocation Type"
                  type="select"
                  value={allocationType || "Amount"}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ allocationType: val })}
                  options={[
                    { label: "Amount", value: "Amount" },
                    { label: "Quantity", value: "Quantity" },
                  ]}
                />

                <FieldRenderer
                  id="brokerCode"
                  label="Broker Code"
                  required
                  type="lookup"
                  value={brokerCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({ payeeLookupContext: "broker", payeeModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="brokerName"
                  label="Broker Name"
                  required
                  type="text"
                  value={brokerName || ""}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="forwarderCode"
                  label="Forwarder Code"
                  required
                  type="lookup"
                  value={forwarderCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({ payeeLookupContext: "forwarder", payeeModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="forwarderName"
                  label="Forwarder Name"
                  required
                  type="text"
                  value={forwarderName || ""}
                  disabled
                  readOnly
                />
              </div>

              {/* Column 3: Importation */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="shipmentMode"
                  label="Shipment Mode"
                  required
                  type="select"
                  value={shipmentMode || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ shipmentMode: val })}
                  options={[
                    { label: "Air", value: "Air" },
                    { label: "Sea", value: "Sea" },
                    { label: "Land", value: "Land" },
                  ]}
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="importationDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={importationDate || ""}
                      disabled={isFormDisabled}
                      updateState={(next) => updateState({ importationDate: next.importationDate ?? next.value ?? next })}
                    />
                  </div>
                  <label htmlFor="importationDate" className="global-ref-floating-label global-ref-label-enabled">
                    Importation Date
                  </label>
                </div>

                <FieldRenderer
                  id="countryOrigin"
                  label="Country of Origin"
                  type="text"
                  value={countryOrigin || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ countryOrigin: val })}
                />

                <FieldRenderer
                  id="importEntryNo"
                  label="Import Entry No."
                  type="text"
                  value={importEntryNo || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ importEntryNo: val })}
                />

                <div className="relative w-full">
                  <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                    <DateFormatInput
                      id="releaseDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={releaseDate || ""}
                      disabled={isFormDisabled}
                      updateState={(next) => updateState({ releaseDate: next.releaseDate ?? next.value ?? next })}
                    />
                  </div>
                  <label htmlFor="releaseDate" className="global-ref-floating-label global-ref-label-enabled">
                    Release Date
                  </label>
                </div>
              </div>

              {/* Column 4: Import references */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="refLcNo1"
                  label="Ref LC No 1"
                  type="text"
                  value={refLcNo1 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refLcNo1: val })}
                />

                <FieldRenderer
                  id="refLcNo2"
                  label="Ref LC No 2"
                  type="text"
                  value={refLcNo2 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refLcNo2: val })}
                />

                <FieldRenderer
                  id="awbBlNo"
                  label="AWB/BL No."
                  type="text"
                  value={awbBlNo || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ awbBlNo: val })}
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
                  />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            LANDED COST DETAIL TABLE
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                type="button"
                className="global-tran-tab-padding-ui min-w-max whitespace-nowrap !text-left text-left global-tran-tab-text_active-ui"
              >
                Shipment Item Details
              </button>
            </div>

            <div className="flex justify-end" />
          </div>

            <>
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {orderedShipmentItemColumns.map((column) =>
                          renderShipmentItemHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedShipmentItemColumns,
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
                      {sortedShipmentItemRows.map(({ row, originalIndex }) => (
                        <tr key={originalIndex} className="global-tran-tr-ui">
                          {orderedShipmentItemColumns.map((column) => renderShipmentItemCell(column.key, row, originalIndex))}
                          {!isFormDisabled && (
                            <td
                              className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                              style={transactionActionsCellStyle}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(originalIndex)}><FontAwesomeIcon icon={faTrashAlt} /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {renderShipmentItemHeaderContextMenu?.()}
                </div>
              </div>

              <div className="global-tran-tab-footer-main-div-ui">
                <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                onClick={handleOpenRRLookup}
                disabled={isFormDisabled}
                className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add
                  </button>
                </div>

                <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
                  <div className="global-tran-tab-footer-total-label-ui">Total RR. Amt:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalGross}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Quantity:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalDiscount}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Shipping Cost:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalVat}</div>
                  <div className="global-tran-tab-footer-total-label-ui">Total Landed Cost:</div>
                  <div className="global-tran-tab-footer-total-value-ui">{totals.totalNet}</div>
                </div>
              </div>
            </>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                type="button"
                className="global-tran-tab-padding-ui min-w-max whitespace-nowrap !text-left text-left global-tran-tab-text_active-ui"
              >
                Shipment Cost Details
              </button>
            </div>
            <div className="flex justify-end" />
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedShipmentCostColumns.map((column) =>
                      renderShipmentCostHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedShipmentCostColumns,
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
                  {sortedShipmentCostRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedShipmentCostColumns.map((column) => renderShipmentCostCell(column.key, row, originalIndex))}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleInsertShipmentCostBlankRow(originalIndex)}><FontAwesomeIcon icon={faPlus} /></button>
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteShipmentCostRow(originalIndex)}><FontAwesomeIcon icon={faTrashAlt} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderShipmentCostHeaderContextMenu?.()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                onClick={openShipmentCostAddLookup}
                disabled={isFormDisabled}
                className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
              <div className="global-tran-tab-footer-total-label-ui">Total SC Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{shipmentCostTotals.billAmt}</div>
              <div className="global-tran-tab-footer-total-label-ui">Total VAT Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{shipmentCostTotals.vatAmt}</div>
              <div className="global-tran-tab-footer-total-label-ui">Total Net Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{shipmentCostTotals.netAmt}</div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY TAB */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getLCHistory"
          cacheKey={`LC:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="LC_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
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

{rcLookupModalOpen && (
        <RCLookupModal
          isOpen={rcLookupModalOpen}
          onClose={handleCloseRCModal}
          customParam="ActiveDept"
        />
      )}

      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
          customParam={payeeLookupContext === "payee" ? "OpenIMP" : "ActiveAll"}
        />
      )}

      {showOpenRRModal && (
        <GlobalLookupModalv1
          isOpen={showOpenRRModal}
          title="Open RR Summary"
          endpoint={openRR_Col_Summary}
          data={openRR_Data_Summary}
          btnCaption="Get Selected RR"
          onClose={handleInsertSelectedOpenRR}
          onCancel={() =>
            updateState({
              showOpenRRModal: false,
              openRR_Data_Summary: [],
              openRR_Col_Summary: [],
            })
          }
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

      {vatLookupModalOpen && (
        <VATLookupModal
          isOpen={vatLookupModalOpen}
          onClose={handleCloseVATLookup}
        />
      )}

      {state.showRRRefModal && (
        <GlobalLookupModalv1
          isOpen={state.showRRRefModal}
          title="Open RR References"
          data={state.globalLookupRow}
          endpoint={openRRLookupColumns}
          btnCaption="Get Selected RR"
          idKey="groupId"
          onClose={handleCloseRRRefModal}
          onCancel={() => updateState({ showRRRefModal: false })}
          singleSelect={false}
        />
      )}

      {(shipmentCostLookup.type === "scCode" || shipmentCostLookup.type === "scCodeMulti") && (
        <SearchLCRef
          isOpen={shipmentCostLookup.type === "scCode" || shipmentCostLookup.type === "scCodeMulti"}
          title="Search Shipment Cost"
          enableMultiSelect={shipmentCostLookup.type === "scCodeMulti"}
          onClose={handleCloseShipmentCostRefLookup}
        />
      )}

      {shipmentCostLookup.type === "acct" && (
        <COAMastLookupModal
          isOpen={shipmentCostLookup.type === "acct"}
          title="Select Account Code"
          customParam="ActiveAll"
          onClose={handleCloseShipmentCostAccountLookup}
        />
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{ branchCode, branchName, docType, documentTitle, fieldNo: "documentNo" }}
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
        docDate={importationDate}
        status={approvalStatus}
        remarks={remarks}
        maxAppLevel={maxApprovalLevel}
        data={detailRowsApp?.[0] || {}}
      />

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default LC;
