import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faCircleInfo,
  faClipboardList,
  faListCheck,
  faMagnifyingGlass,
  faPaperclip,
  faPlus,
  faSearch,
  faTrashAlt,
  faTrophy,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast.jsx";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import GlobalApprovalStatus from "@/NAYSA Cloud/Approval/GlobalApprovalStatus.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";
import { Maximize2, Minimize2 } from "lucide-react";

import { apiClient } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypePDFGuide, docTypeVideoGuide } from "@/NAYSA Cloud/Global/doctype";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert,
  useSwalvalidateRequiredFields,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import { useTopPayeeRow, useTopPayTermRow } from "@/NAYSA Cloud/Global/top1RefTable.js";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useHandleCancel, useTransactionUpsert } from "@/NAYSA Cloud/Global/procedure";
import {
  useFetchTranAtt,
  useHandleFileDelete,
} from "@/NAYSA Cloud/Global/fileManagement";
import Header from "@/NAYSA Cloud/Components/Header";

/* ============================================================================
   CAN.jsx - Canvass Transaction
   ----------------------------------------------------------------------------
   Main flow:
   1. Load open PR records from sproc_PHP_CAN GetOpenPR.
   2. User selects PR(s), then loads consolidated canvass item rows.
   3. User creates supplier offers and enters prices per canvass item.
   4. User awards one supplier after validation.
   5. Awarded supplier lines can generate Purchase Orders.
   6. Generated PO references are tracked per line to prevent duplicate PO creation.

   Important field rule:
   - Use only the exact camelCase fields returned by sproc_PHP_CAN.
   - Avoid fallback aliases like group_id, groupID, po_no, can_id, etc.
   ============================================================================ */

const docType = "CAN";

/* -----------------------------------------------------------------------------
   Shared helpers
   -----------------------------------------------------------------------------
   These helpers keep parsing/formatting consistent across API responses, table
   rendering, and payload building. normalizeRows is intentionally kept because
   SQL JSON fields may arrive either as arrays or JSON strings.
----------------------------------------------------------------------------- */
const normalizeRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!parsed) return [];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return [value];
};

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

const safeDate = (value) => {
  if (!value) return "";
  try {
    return useformatToDatev2(value);
  } catch {
    return value;
  }
};

const num = (value) => {
  const parsed = parseFormattedNumber(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => formatNumber(num(value), 2);
const qty = (value, dec = 2) => formatNumber(num(value), dec);
const sanitizeNumeric = (value) => {
  const raw = String(value ?? "");
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
};

const errorMessage = (error, fallback = "Unable to complete the request.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const cleanDisplayText = (value) =>
  String(value ?? "")
    .replace(/Ã¢â‚¬Â¢|â€¢|ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢/g, "•")
    .replace(/Ã¢â‚¬â€œ|â€“|ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“/g, "–")
    .replace(/Ã¢â‚¬â„¢|â€™|ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢/g, "'")
    .replace(/Ã¢â‚¬Å“|â€œ|ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ/g, '"')
    .replace(/Ã¢â‚¬Â|â€|ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â/g, '"')
    .trim();


const statusText = (code, fallback = "") => {
  const value = String(code || "").trim().toUpperCase();
  const fallbackValue = String(fallback || "").trim().toUpperCase();
  const map = {
    D: "DRAFT",
    F: "FOR APPROVAL",
    A: "APPROVED",
    W: "AWARDED",
    C: "CANCELLED",
    X: "CANCELLED",
  };
  return map[value] || map[fallbackValue] || fallbackValue || "DRAFT";
};



/* -----------------------------------------------------------------------------
   API endpoint map
   -----------------------------------------------------------------------------
   callCAN() uses this map to try the legacy route first, then the clean route.
   The payload always goes as { json_data: ... } to match the CAN controller.
----------------------------------------------------------------------------- */
const canEndpointMap = {
  history: ["/getCANHistory", "/can/history"],
  openPR: ["/getCANOpenPR", "/can/open-pr"],
  openPRDetail: ["/getCANOpenPRDetail", "/can/open-pr-detail"],
  get: ["/getCAN", "/can/get"],
  upsert: ["/upsertCAN", "/can/upsert"],
  cancel: ["/cancelCAN", "/can/cancel"],
  submit: ["/submitCAN", "/can/submit"],
  approve: ["/approveCAN", "/can/approve"],
  award: ["/awardCAN", "/can/award"],
  markPOGenerated: ["/markCANPOGenerated", "/can/mark-po-generated"],
  markPOLinesGenerated: ["/markCANPOLinesGenerated", "/can/mark-po-lines-generated"],
  find: ["/findCAN", "/can/find"],
};




const DEC_AMT = 2;
/* -----------------------------------------------------------------------------
   Supplier offer calculation helpers
   -----------------------------------------------------------------------------
   makeSupplierDetail creates one supplier quote line from one consolidated
   canvass item. calcDetail recalculates amounts, and calcSupplier recalculates
   header totals from all quote lines.
----------------------------------------------------------------------------- */
const makeSupplierDetail = (item, decQty = 2, decUPrice = 2, vatCode = "") => ({
  canLn: item.canLn,
  invType: item.invType || "",
  itemCode: item.itemCode || "",
  itemName: item.itemName || "",
  itemSpecs: item.itemSpecs || "",
  uomCode: item.uomCode || "",
  quantity: qty(item.selectedQty || item.totalQtyNeeded || 0, decQty),
  vatCode,
  unitPrice: qty(0, decUPrice),
  grossAmount: "0.00",
  discountAmount: "0.00",
  vatAmount: "0.00",
  netAmount: "0.00",
  isAwardedLine: false,
  remarks: "",
});

const calcDetail = (row, options = {}) => {
  const {
    decQty = 2,
    decUPrice = 2,
    getVatAmount = () => 0,
    changedField = "",
  } = options;
  const grossAmount = num(row.quantity) * num(row.unitPrice);
  const discountAmount = Math.min(num(row.discountAmount), grossAmount);
  const amountAfterDiscount = grossAmount - discountAmount;
  const vatAmount = changedField === "vatAmount"
    ? num(row.vatAmount)
    : row.vatCode
      ? getVatAmount(row.vatCode, amountAfterDiscount)
      : 0;
  const netAmount = amountAfterDiscount - vatAmount;

  return {
    ...row,
    quantity: qty(row.quantity, decQty),
    unitPrice: qty(row.unitPrice, decUPrice),
    grossAmount: formatNumber(grossAmount || 0, DEC_AMT),
    discountAmount: formatNumber(discountAmount || 0, DEC_AMT),
    vatAmount: formatNumber(vatAmount || 0, DEC_AMT),
    netAmount: formatNumber(netAmount || 0, DEC_AMT),
  };
};

const calcSupplier = (supplier) => {
  const detailRows = normalizeRows(supplier.detailRows);
  const offerAmount = detailRows.reduce((sum, row) => sum + num(row.grossAmount), 0);
  const discountAmount = detailRows.reduce((sum, row) => sum + num(row.discountAmount), 0);
  const vatAmount = detailRows.reduce((sum, row) => sum + num(row.vatAmount), 0);
  const netAmount = detailRows.reduce((sum, row) => sum + num(row.netAmount), 0);
  return {
    ...supplier,
    detailRows,
    offerAmount: money(offerAmount),
    discountAmount: money(discountAmount),
    vatAmount: money(vatAmount),
    netAmount: money(netAmount),
  };
};




/* =============================================================================
   Main component
============================================================================= */
export const CAN = () => {
  const loadedFromUrlRef = useRef(false);
  const location = useLocation();
  const { resetFlag } = useReset();
  const { companyInfo, currentUserRow, getAllTopHSDocRow, getAllTopVatAmount, getReplacementVatRow } = useAuth();

  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const decQty = companyInfo?.itemDecqtyPur ?? 2;
  const decUPrice = companyInfo?.pur_decuprice ?? 2;
  const documentTitle = `${hsDoc?.docName || "Canvass"} Transaction`;

  /* ---------------------------------------------------------------------------
     Local UI state outside the main transaction state
     ---------------------------------------------------------------------------
     These values control tabs, selection, generated PO behavior, and modal UI.
     They are kept separate from state because they are screen-only concerns.
  --------------------------------------------------------------------------- */
  const [topTab, setTopTab] = useState("details");
  const [openPrRows, setOpenPrRows] = useState([]);
  const [selectedPrIds, setSelectedPrIds] = useState([]);
  const [expandedItemLn, setExpandedItemLn] = useState(null);
  const [activeSupplierForAttachment, setActiveSupplierForAttachment] = useState(null);
  const [poSelectionTouched, setPoSelectionTouched] = useState(false);
  const [selectedPOItemKeys, setSelectedPOItemKeys] = useState([]);
  const [generatePOGroupBy, setGeneratePOGroupBy] = useState("supplier");
  const [generatePOActiveTab, setGeneratePOActiveTab] = useState("details");
  const [generatedPOInfo, setGeneratedPOInfo] = useState(null);
  const [showSupplierCompareModal, setShowSupplierCompareModal] = useState(false);
  const [isSupplierCompareMaximized, setIsSupplierCompareMaximized] = useState(false);

  /* ---------------------------------------------------------------------------
     Main transaction state
     ---------------------------------------------------------------------------
     This state mirrors the CAN transaction returned by sproc_PHP_CAN GetCAN.
     Keep field names aligned with the stored procedure JSON aliases.
  --------------------------------------------------------------------------- */
  const [state, setState] = useState({
    canId: "",
    canNo: "",
    canDate: useGetCurrentDayV2(),
    canStatus: "D",
    canStatusName: "Draft",
    canCancelled: false,

    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",

    selectedSupplierCode: "",
    selectedSupplierName: "",
    selectedOfferAmount: "0.00",

    remarks: "",
    userCode: currentUserRow?.userCode || "",
    userName: currentUserRow?.userName || "",

    prRows: [],
    detailRows: [],
    supplierRows: [],
    statusHistory: [],

    historyRows: [],
    historyFilter: {
      canNo: "",
      prNo: "",
      supplier: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    },

    activeTab: "pr",
    activeSupplierIndex: 0,
    supplierActiveTabs: {},
    showPrBreakdown: true,
    isLoading: false,
    showSpinner: false,
    showBranchModal: false,
    showAllTranDocNo: false,
    showAttachModal: false,
    showCancelModal: false,
    showApprovalStatusModal: false,
    showPayeeLookupModal: false,
    activeSupplierIndexForLookup: null,
    showPaytermModal: false,
    activeSupplierIndexForPayterm: null,
  });

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

  const {
    canId,
    canNo,
    canDate,
    canStatus,
    canStatusName,
    canCancelled,
    branchCode,
    branchName,
    selectedSupplierCode,
    selectedSupplierName,
    selectedOfferAmount,
    remarks,
    userCode,
    userName,
    prRows,
    detailRows,
    supplierRows,
    statusHistory,
    historyRows,
    historyFilter,
    activeTab,
    activeSupplierIndex,
    supplierActiveTabs,
    showPrBreakdown,
    isLoading,
    showSpinner,
    showBranchModal,
    showAllTranDocNo,
    showAttachModal,
    showCancelModal,
    showApprovalStatusModal,
    showPayeeLookupModal,
    activeSupplierIndexForLookup,
    showPaytermModal,
    activeSupplierIndexForPayterm,
  } = state;

  const displayStatus = statusText(canStatus, canStatusName);
  const normalizedCanStatus = String(canStatus || "").toUpperCase();
  const normalizedDisplayStatus = String(displayStatus || canStatusName || "").toUpperCase();
  const isAwardedOrCancelled =
    ["W", "X",  "AWARDED", "CANCELLED"].includes(normalizedCanStatus) ||
    [ "AWARDED", "CANCELLED"].includes(normalizedDisplayStatus) ||
    canCancelled;
  const isLocked = ["A", "APPROVED"].includes(normalizedCanStatus) || normalizedDisplayStatus === "APPROVED" || isAwardedOrCancelled;
  const isFormDisabled = isLocked;
  const isDraft = normalizedCanStatus === "D" || normalizedDisplayStatus === "DRAFT";
  const hasDocument = Boolean(canId);
  const hasPrBreakdownRows = detailRows.some((row) => normalizeRows(row.prBreakdown).length > 0);
  const statusTextColor =
    normalizedDisplayStatus === "CANCELLED"
      ? "text-red-600"
      : ["AWARDED", "CLOSED"].includes(normalizedDisplayStatus)
        ? "text-blue-700"
        : "text-slate-900";
  
  const compactActionButtonClass =  "inline-flex h-9 w-36 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
  const getCanVatAmount = (vatCode, amount) => typeof getAllTopVatAmount === "function" ? getAllTopVatAmount(vatCode, amount) : 0;
  const getCanGoodsVatRow = (vatCode) => typeof getReplacementVatRow === "function" ? getReplacementVatRow(vatCode || "", "I", "S", "G") : null;
  const getStatusHistoryActionName = useCallback(
    (row) => {
      const actionBy = cleanDisplayText(row?.actionBy);
      const currentUserCode = cleanDisplayText(currentUserRow?.userCode);
      const currentUserName = cleanDisplayText(currentUserRow?.userName);

      return (
        cleanDisplayText(row?.actionName) ||
        cleanDisplayText(row?.actionByName) ||
        cleanDisplayText(row?.userName) ||
        (actionBy && currentUserCode && actionBy.toUpperCase() === currentUserCode.toUpperCase()
          ? currentUserName
          : actionBy) ||
        ""
      );
    },
    [currentUserRow?.userCode, currentUserRow?.userName]
  );

  /* ---------------------------------------------------------------------------
     Dashboard / summary values
     ---------------------------------------------------------------------------
     Used by Transaction Summary cards and quick validation display.
  --------------------------------------------------------------------------- */
  const totals = useMemo(() => {
    const totalQty = detailRows.reduce((sum, row) => sum + num(row.totalQtyNeeded), 0);
    const selectedQty = detailRows.reduce((sum, row) => sum + num(row.selectedQty), 0);
    const offers = supplierRows.map((row) => num(row.netAmount)).filter((value) => value > 0);
    return {
      prCount: prRows.length,
      itemCount: detailRows.length,
      supplierCount: supplierRows.length,
      totalQty: qty(totalQty, decQty),
      selectedQty: qty(selectedQty, decQty),
      bestOffer: money(offers.length ? Math.min(...offers) : 0),
    };
  }, [prRows, detailRows, supplierRows, decQty]);

  const rankedSuppliers = useMemo(
    () =>
      supplierRows
        .map((supplier, index) => ({ ...supplier, originalIndex: index }))
        .filter((supplier) => supplier.supplierCode || supplier.supplierName || num(supplier.netAmount) > 0)
        .sort((a, b) => num(a.netAmount) - num(b.netAmount)),
    [supplierRows]
  );

  const lowestSupplierKey = rankedSuppliers[0]
    ? `${rankedSuppliers[0].supplierCode || ""}-${rankedSuppliers[0].originalIndex}`
    : "";

  /* ---------------------------------------------------------------------------
     Awarded supplier resolver
     ---------------------------------------------------------------------------
     A supplier is considered awarded when isAwarded is true, or when its code
     matches the selected supplier saved in CAN_HD.
  --------------------------------------------------------------------------- */
  const awardedSupplier = useMemo(() => {
    const selectedCode = String(selectedSupplierCode || "").trim().toUpperCase();
    return (supplierRows || []).find((supplier) => {
      const supplierCode = String(supplier?.supplierCode || "").trim().toUpperCase();
      return Boolean(supplier?.isAwarded) || (selectedCode && supplierCode === selectedCode);
    }) || null;
  }, [supplierRows, selectedSupplierCode]);

  /* ---------------------------------------------------------------------------
     Generate PO: detail line preparation
     ---------------------------------------------------------------------------
     Converts the awarded supplier item rows into PR-level PO detail rows.
     Each row carries prId/prGroupId information from the canvass breakdown so
     PO references can be tracked per original PR line.
  --------------------------------------------------------------------------- */
  const poAllDetailRows = useMemo(() => {
    if (!awardedSupplier) return [];

    const canvasDetailByLn = new Map(
      normalizeRows(detailRows).map((row) => [String(row?.canLn || ""), row])
    );

    let runningLn = 0;

    return normalizeRows(awardedSupplier.detailRows)
      .filter((row) => String(row?.itemCode || "").trim())
      .flatMap((row, supplierDetailIndex) => {
        const canvasDetail = canvasDetailByLn.get(String(row?.canLn || "")) || {};
        const breakdownRows = normalizeRows(canvasDetail.prBreakdown);
        const poReferences = normalizeRows(row.poReferences || row.poReferenceRows || row.poRows);
        const sourceBreakdownRows = breakdownRows.length > 0
          ? breakdownRows
          : [
              {
                prId: row?.prId || canId || "",
                prNo: row?.prNo || canNo || "",
                prGroupId: row?.canDt1Id || row?.canLn || "",
                rcCode: row?.rcCode || "",
                rcName: row?.rcName || "",
                includedQty: row?.quantity || canvasDetail?.selectedQty || 0,
                qtyInPr: row?.quantity || canvasDetail?.selectedQty || 0,
                dateNeeded: row?.dateNeeded || "",
              },
            ];

        const totalBreakdownQty = sourceBreakdownRows.reduce(
          (sum, item) => sum + num(item?.includedQty || item?.qtyInPr || 0),
          0
        );
        const supplierQty = num(row.quantity || canvasDetail?.selectedQty || 0);
        const unitPrice = num(row.unitPrice);
        const supplierGross = num(row.grossAmount) || supplierQty * unitPrice;
        const supplierDiscount = num(row.discountAmount);
        const supplierVat = num(row.vatAmount);
        const discountRatio = supplierGross ? supplierDiscount / supplierGross : 0;
        const vatRatio = supplierGross ? supplierVat / supplierGross : 0;

        return sourceBreakdownRows.map((breakdown, breakdownIndex) => {
          runningLn += 1;

          const rawQty = num(breakdown?.includedQty || breakdown?.qtyInPr || 0);
          const lineQty = totalBreakdownQty > 0 && supplierQty > 0
            ? (rawQty / totalBreakdownQty) * supplierQty
            : rawQty || supplierQty;
          const grossAmount = lineQty * unitPrice;
          const discountAmount = grossAmount * discountRatio;
          const amountAfterDiscount = Math.max(grossAmount - discountAmount, 0);
          const vatAmount = row.vatCode
            ? getCanVatAmount(row.vatCode, amountAfterDiscount)
            : grossAmount * vatRatio;
          const netAmount = amountAfterDiscount - vatAmount;

          const rowKey = String(
            [
              row?.canSupplierDt1Id || row?.canDt1Id || row?.canLn || supplierDetailIndex,
              breakdown?.prId || "",
              breakdown?.prGroupId || "",
              breakdownIndex,
            ].join("|")
          );

          const matchingPOReference = poReferences.find((ref) => {
            const sameLineKey = String(ref?.poLineKey || ref?.lineKey || "") === rowKey;
            const samePr = String(ref?.prId || "").toUpperCase() === String(breakdown?.prId || "").toUpperCase();
            const sameGroup = String(ref?.groupId || "").toUpperCase() === String(breakdown?.prGroupId || "").toUpperCase();
            return sameLineKey || (samePr && sameGroup);
          }) || {};

          const linePoNo =
            matchingPOReference.poNo ||
            row.poNo ||
            "";
          const linePoId =
            matchingPOReference.poId ||
            row.poId ||
            "";

          return {
            ...row,
            poKey: rowKey,
            poLn: runningLn,
            poLineKey: rowKey,
            prNo: breakdown?.prNo || row?.prNo || canNo || "",
            prId: breakdown?.prId || row?.prId || canId || "",
            groupId: breakdown?.prGroupId || row?.canDt1Id || row?.canLn || "",
            rcCode: breakdown?.rcCode || row?.rcCode || "",
            rcName: breakdown?.rcName || row?.rcName || "",
            dateNeeded: breakdown?.dateNeeded || row?.dateNeeded || "",
            supplierCode: awardedSupplier.supplierCode || selectedSupplierCode || "",
            supplierName: awardedSupplier.supplierName || selectedSupplierName || "",
            poNo: linePoNo,
            poId: linePoId,
            poGenerated: Boolean(linePoNo || linePoId || matchingPOReference.poGenerated),
            quantity: qty(lineQty, decQty),
            unitPrice: qty(unitPrice, decUPrice),
            grossAmount: money(grossAmount),
            discountAmount: money(discountAmount),
            vatAmount: money(vatAmount),
            netAmount: money(netAmount),
          };
        });
      });
  }, [awardedSupplier, detailRows, selectedSupplierCode, selectedSupplierName, canId, canNo, decQty, decUPrice, getCanVatAmount]);

  const poCandidateRows = useMemo(
    () => poAllDetailRows.filter((row) => !(row.poNo || row.poId || row.poGenerated)),
    [poAllDetailRows]
  );

  const generatedPODetailRows = useMemo(
    () => poAllDetailRows.filter((row) => row.poNo || row.poId || row.poGenerated),
    [poAllDetailRows]
  );

  const hasGeneratedPOLines = generatedPODetailRows.length > 0;
  const allPOLinesGenerated = poAllDetailRows.length > 0 && poCandidateRows.length === 0;

  const activePOSelectedKeys = poSelectionTouched
    ? selectedPOItemKeys
    : poCandidateRows.map((row) => row.poKey);

  const selectedPORows = useMemo(
    () => poCandidateRows.filter((row) => activePOSelectedKeys.includes(row.poKey)),
    [poCandidateRows, activePOSelectedKeys]
  );

  /* ---------------------------------------------------------------------------
     Generate PO: summary preparation
     ---------------------------------------------------------------------------
     Groups selected PO detail rows by invType + itemCode + itemSpecs. This
     matches the PO.jsx Item Summary behavior.
  --------------------------------------------------------------------------- */
  const poSummaryRows = useMemo(() => {
    const summaryMap = new Map();
    const summarySourceRows = selectedPORows.length > 0 ? selectedPORows : poAllDetailRows;

    summarySourceRows.forEach((row) => {
      const summaryKey = [
        String(row.itemCode || "").trim().toUpperCase(),
        String(row.invType || "").trim().toUpperCase(),
        String(row.itemSpecs || "").trim().toUpperCase(),
      ].join("||");

      if (!summaryMap.has(summaryKey)) {
        summaryMap.set(summaryKey, {
          poKey: summaryKey,
          invType: row.invType || "",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          quantity: 0,
          unitPrice: num(row.unitPrice),
          grossAmount: 0,
          discountAmount: 0,
          vatCode: row.vatCode || "",
          vatName: row.vatName || "",
          vatAmount: 0,
          netAmount: 0,
        });
      }

      const summary = summaryMap.get(summaryKey);
      summary.quantity += num(row.quantity);
      summary.grossAmount += num(row.grossAmount);
      summary.discountAmount += num(row.discountAmount);
      summary.vatAmount += num(row.vatAmount);
      summary.netAmount += num(row.netAmount);
      summary.unitPrice = summary.quantity ? summary.grossAmount / summary.quantity : summary.unitPrice;
    });

    return Array.from(summaryMap.values()).map((row, index) => ({
      ...row,
      poLn: index + 1,
      quantity: qty(row.quantity, decQty),
      unitPrice: qty(row.unitPrice, decUPrice),
      grossAmount: money(row.grossAmount),
      discountAmount: money(row.discountAmount),
      vatAmount: money(row.vatAmount),
      netAmount: money(row.netAmount),
    }));
  }, [selectedPORows, poAllDetailRows, decQty, decUPrice]);

  const uniqueGeneratePOPrNos = useMemo(
    () => [...new Set(poAllDetailRows.map((row) => String(row.prNo || "").trim()).filter(Boolean))],
    [poAllDetailRows]
  );

  const hasCommonGeneratePOItems = useMemo(() => {
    const groupCount = new Map();
    poAllDetailRows.forEach((row) => {
      const key = [
        String(row.itemCode || "").trim().toUpperCase(),
        String(row.invType || "").trim().toUpperCase(),
        String(row.itemSpecs || "").trim().toUpperCase(),
      ].join("||");
      groupCount.set(key, (groupCount.get(key) || 0) + 1);
    });
    return Array.from(groupCount.values()).some((count) => count > 1);
  }, [poAllDetailRows]);

  const showGeneratePOSummary = uniqueGeneratePOPrNos.length > 1 || hasCommonGeneratePOItems;

  useEffect(() => {
    if (!showGeneratePOSummary && generatePOActiveTab === "summary") {
      setGeneratePOActiveTab("details");
    }
  }, [showGeneratePOSummary, generatePOActiveTab]);

  const generatedPOCount = useMemo(() => selectedPORows.length > 0 ? 1 : 0, [selectedPORows]);

  const existingGeneratedPOInfo = useMemo(() => {
    if (generatedPOInfo?.poNo || generatedPOInfo?.poId) {
      return generatedPOInfo;
    }

    const supplier = awardedSupplier || {};
    const poNo =
      supplier.poNo ||
      "";
    const poId =
      supplier.poId ||
      "";

    if (!poNo && !poId) return null;

    return {
      poNo,
      poId,
      branchCode: supplier.branchCode || branchCode || "",
    };
  }, [generatedPOInfo, awardedSupplier, branchCode]);

  const generatedPONoList = useMemo(() => {
    const poNos = [
      ...generatedPODetailRows.map((row) => row?.poNo || ""),
      existingGeneratedPOInfo?.poNo || "",
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return [...new Set(poNos)];
  }, [generatedPODetailRows, existingGeneratedPOInfo]);

  const hasGeneratedPO = allPOLinesGenerated;

  const togglePOItemSelection = (rowKey) => {
    if (hasGeneratedPO) return;
    setPoSelectionTouched(true);
    setSelectedPOItemKeys((prev) => {
      const currentKeys = poSelectionTouched ? prev : poCandidateRows.map((row) => row.poKey);
      return currentKeys.includes(rowKey)
        ? currentKeys.filter((key) => key !== rowKey)
        : [...currentKeys, rowKey];
    });
  };

  const toggleAllPOItemSelection = () => {
    if (hasGeneratedPO) return;
    setPoSelectionTouched(true);
    setSelectedPOItemKeys((prev) => {
      const currentKeys = poSelectionTouched ? prev : poCandidateRows.map((row) => row.poKey);
      return currentKeys.length === poCandidateRows.length ? [] : poCandidateRows.map((row) => row.poKey);
    });
  };

  const viewGeneratedPO = (poRow = existingGeneratedPOInfo) => {
    const poNo = poRow?.poNo || "";
    const poBranchCode = poRow?.branchCode || branchCode || "";

    if (!poNo) {
      useSwalInfoAlert("View Purchase Order", "No generated Purchase Order is available yet.");
      return;
    }

    window.open(`/tran/PO?poNo=${encodeURIComponent(poNo)}&branchCode=${encodeURIComponent(poBranchCode)}`, "_blank");
  };

  /* ---------------------------------------------------------------------------
     CAN API caller
     ---------------------------------------------------------------------------
     Attempts each mapped endpoint until one succeeds. This keeps compatibility
     with both current legacy routes and newer /can/* routes.
  --------------------------------------------------------------------------- */
  const callCAN = async (endpointKey, jsonData = {}) => {
    const endpoints = Array.isArray(endpointKey)
      ? endpointKey
      : canEndpointMap[endpointKey] || [endpointKey];
    let lastError;

    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.post(endpoint, { json_data: jsonData });
        return response?.data?.data ?? response?.data;
      } catch (error) {
        lastError = error;
        if (error?.response?.status !== 404 || endpoint === endpoints[endpoints.length - 1]) {
          throw error;
        }
      }
    }

    throw lastError;
  };

  useEffect(() => {
    let timer;
    if (isLoading) timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (resetFlag) handleReset();
  }, [resetFlag]);

  /* ---------------------------------------------------------------------------
     Reset transaction screen
     ---------------------------------------------------------------------------
     Returns the component to a new Draft Canvass state and clears temporary
     selections, generated PO UI state, and comparison modal state.
  --------------------------------------------------------------------------- */
  const handleReset = () => {
    setOpenPrRows([]);
    setSelectedPrIds([]);
    setExpandedItemLn(null);
    setActiveSupplierForAttachment(null);
    setPoSelectionTouched(false);
    setSelectedPOItemKeys([]);
    setGeneratePOGroupBy("supplier");
    setGeneratePOActiveTab("details");
    setGeneratedPOInfo(null);
    setShowSupplierCompareModal(false);

    updateState({
      canId: "",
      canNo: "",
      canDate: useGetCurrentDayV2(),
      canStatus: "D",
      canStatusName: "Draft",
      canCancelled: false,
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || currentUserRow?.BranchName || "",
      selectedSupplierCode: "",
      selectedSupplierName: "",
      selectedOfferAmount: "0.00",
      remarks: "",
      userCode: currentUserRow?.userCode || "",
      userName: currentUserRow?.userName || "",
      prRows: [],
      detailRows: [],
      supplierRows: [],
      statusHistory: [],
      activeTab: "pr",
      activeSupplierIndex: 0,
      supplierActiveTabs: {},
      showPrBreakdown: true,
      isLoading: false,
      showSpinner: false,
      showBranchModal: false,
      showAllTranDocNo: false,
      showAttachModal: false,
      showCancelModal: false,
      showApprovalStatusModal: false,
      showPayeeLookupModal: false,
      activeSupplierIndexForLookup: null,
      showPaytermModal: false,
      activeSupplierIndexForPayterm: null,
    });
  };

  /* ---------------------------------------------------------------------------
     Open PR loading
     ---------------------------------------------------------------------------
     Loads available PRs from GetOpenPR. The stored procedure already applies
     branch, approval, and remaining quantity rules.
  --------------------------------------------------------------------------- */
  const loadOpenPR = async () => {
    if (!branchCode) return;
    updateState({ isLoading: true });
    try {
      const data = await callCAN("openPR", { branchCode });
      setOpenPrRows(normalizeRows(data));
    } catch (error) {
      console.error(error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const loadHistory = async () => {
    updateState({ isLoading: true });
    try {
      const data = await callCAN("history", { branchCode, ...historyFilter });
      updateState({ historyRows: normalizeRows(data) });
    } catch (error) {
      useSwalErrorAlert("Canvass History", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };




  /* ---------------------------------------------------------------------------
     Retrieve existing Canvass
     ---------------------------------------------------------------------------
     Reads the CAN header, selected PRs, consolidated detail rows, supplier
     offers, status history, and generated PO references.
  --------------------------------------------------------------------------- */
  const fetchCAN = async ({ canId: fetchCanId = "", canNo: fetchCanNo = "", branchCode: fetchBranchCode = branchCode, direction = "" }) => {
    updateState({ isLoading: true });
    try {
      const data = await callCAN("get", {
        canId: fetchCanId,
        canNo: fetchCanNo,
        branchCode: fetchBranchCode,
        direction,
      });

      if (!data || data?.result === null) {
        useSwalInfoAlert("Canvass Transaction", "Transaction does not exist.");
        return;
      }

      const nextDetailRows = normalizeRows(data.detailRows).map((row) => ({
        ...row,
        totalQtyNeeded: qty(row.totalQtyNeeded, decQty),
        selectedQty: qty(row.selectedQty, decQty),
        prBreakdown: normalizeRows(row.prBreakdown),
      }));

      const nextSuppliers = normalizeRows(data.supplierRows).map((supplier) =>
        calcSupplier({
          ...supplier,
          detailRows: normalizeRows(supplier.detailRows).map((row) => ({
            ...row,
            quantity: qty(row.quantity, 6),
            unitPrice: qty(row.unitPrice, 6),
            grossAmount: money(row.grossAmount),
            discountAmount: money(row.discountAmount),
            vatAmount: money(row.vatAmount),
            netAmount: money(row.netAmount),
          })),
          attachments: normalizeRows(supplier.attachments),
        })
      );

      const awarded = nextSuppliers.find(
        (supplier) => supplier.isAwarded || supplier.supplierCode === data.selectedSupplierCode
      );

      const fetchedPoNo =
        awarded?.poNo ||
        data.poNo ||
        "";
      const fetchedPoId =
        awarded?.poId ||
        data.poId ||
        "";

      setGeneratedPOInfo(
        fetchedPoNo || fetchedPoId
          ? { poNo: fetchedPoNo, poId: fetchedPoId, branchCode: data.branchCode || fetchBranchCode }
          : null
      );
      setPoSelectionTouched(false);
      setSelectedPOItemKeys([]);

      updateState({
        canId: data.canId || "",
        canNo: data.canNo || "",
        canDate: safeDate(data.canDate) || useGetCurrentDayV2(),
        canStatus: data.canStatus || "D",
        canStatusName: data.canStatusName || statusText(data.canStatus),
        canCancelled: Boolean(data.canCancelled),
        branchCode: data.branchCode || fetchBranchCode,
        selectedSupplierCode: awarded?.supplierCode || data.selectedSupplierCode || "",
        selectedSupplierName: awarded?.supplierName || data.selectedSupplierName || "",
        selectedOfferAmount: money(awarded?.netAmount || data.selectedOfferAmount || 0),
        remarks: data.remarks || "",
        userCode: data.userCode || currentUserRow?.userCode || "",
        prRows: normalizeRows(data.prRows),
        detailRows: nextDetailRows,
        supplierRows: nextSuppliers,
        statusHistory: normalizeRows(data.statusHistory),
        activeTab: "review",
      });

      setSelectedPrIds(normalizeRows(data.prRows).map((row) => String(row.prId)));
      setTopTab("details");
    } catch (error) {
      useSwalErrorAlert("Fetch Canvass", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", `${window.location.origin}${window.location.pathname}`);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const selectedCanId = row?.canId || row?.tranId || "";
      const selectedCanNo = row?.canNo || row?.docNo || "";
      const selectedBranchCode = row?.branchCode || branchCode;

      if (!selectedCanId && !selectedCanNo) return;

      await fetchCAN({
        canId: selectedCanId,
        canNo: selectedCanNo,
        branchCode: selectedBranchCode,
      });

      setTopTab("details");
      cleanUrl();
    },
    [branchCode, cleanUrl]
  );

  useEffect(() => {
    if (loadedFromUrlRef.current) return;

    const params = new URLSearchParams(location.search);
    const urlCanId = params.get("canId") || params.get("documentID") || "";
    const urlCanNo = params.get("canNo") || params.get("docNo") || "";
    const urlBranchCode = params.get("branchCode") || branchCode;

    if (urlCanId || (urlCanNo && urlBranchCode)) {
      loadedFromUrlRef.current = true;
      fetchCAN({
        canId: urlCanId,
        canNo: urlCanNo,
        branchCode: urlBranchCode,
      });
      setTopTab("details");
    }
    // Run once on mount to match the PR URL-load behavior and avoid repeated state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDocNoBlur = () => {
    if (!canId && canNo && branchCode) fetchCAN({ canNo, branchCode });
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchCAN({
      canNo: data.docNo,
      branchCode: data.branchCode || branchCode,
      direction: data.key,
    });
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, canNo: data.docNo });
  };


  const getCanvassItemSignature = (row = {}) =>
    [
      String(row?.invType || "").trim().toUpperCase(),
      String(row?.itemCode || "").trim().toUpperCase(),
      String(row?.itemName || "").trim().toUpperCase(),
      String(row?.itemSpecs || "").trim().toUpperCase(),
      String(row?.uomCode || "").trim().toUpperCase(),
    ].join("||");

  /* ---------------------------------------------------------------------------
     Sync supplier offer lines with consolidated canvass details
     ---------------------------------------------------------------------------
     Called when PR selection or Canvass Quantity changes. It keeps existing
     supplier prices/discounts/remarks where possible, adds new item rows, drops
     removed rows, updates quantity, and recalculates supplier totals.
  --------------------------------------------------------------------------- */
  const syncSupplierRowsWithCanvassDetails = (sourceSupplierRows = [], sourceDetailRows = []) => {
    const normalizedDetails = normalizeRows(sourceDetailRows);

    return normalizeRows(sourceSupplierRows).map((supplier) => {
      const existingDetails = normalizeRows(supplier.detailRows);
      const existingByLn = new Map();
      const existingBySignature = new Map();

      existingDetails.forEach((detail) => {
        const lnKey = String(detail?.canLn || "");
        if (lnKey) existingByLn.set(lnKey, detail);

        const signatureKey = getCanvassItemSignature(detail);
        if (signatureKey && !existingBySignature.has(signatureKey)) {
          existingBySignature.set(signatureKey, detail);
        }
      });

      const nextSupplierDetails = normalizedDetails.map((item) => {
        const lnKey = String(item?.canLn || "");
        const signatureKey = getCanvassItemSignature(item);
        const existing = existingByLn.get(lnKey) || existingBySignature.get(signatureKey);

        const baseDetail = existing
          ? {
              ...existing,
              canLn: item.canLn,
              invType: item.invType || existing.invType || "",
              itemCode: item.itemCode || existing.itemCode || "",
              itemName: item.itemName || existing.itemName || "",
              itemSpecs: item.itemSpecs || existing.itemSpecs || "",
              uomCode: item.uomCode || existing.uomCode || "",
              quantity: item.selectedQty || item.totalQtyNeeded || existing.quantity || 0,
            }
          : makeSupplierDetail(item, decQty, decUPrice, supplier.vatCode || "");

        return calcDetail(
          {
            ...baseDetail,
            quantity: item.selectedQty || item.totalQtyNeeded || 0,
            vatCode: baseDetail.vatCode || supplier.vatCode || "",
            vatName: baseDetail.vatName || supplier.vatName || "",
          },
          { decQty, decUPrice, getVatAmount: getCanVatAmount },
        );
      });

      return calcSupplier({
        ...supplier,
        detailRows: nextSupplierDetails,
      });
    });
  };

  /* ---------------------------------------------------------------------------
     Load selected PR details
     ---------------------------------------------------------------------------
     Consolidates selected PR detail rows into canvass items and immediately
     re-syncs supplier offer lines if suppliers already exist.
  --------------------------------------------------------------------------- */
  const handleLoadSelectedPR = async () => {
    if (selectedPrIds.length === 0) {
      useSwalInfoAlert("Select PR", "Please select at least one PR.");
      return;
    }

    updateState({ isLoading: true });

    try {
      const data = await callCAN("openPRDetail", { branchCode, prIds: selectedPrIds });
      const nextDetailRows = normalizeRows(data).map((row, index) => ({
        ...row,
        canLn: row.canLn || index + 1,
        totalQtyNeeded: qty(row.totalQtyNeeded, decQty),
        selectedQty: qty(row.selectedQty, decQty),
        prBreakdown: normalizeRows(row.prBreakdown),
      }));

      updateState({
        prRows: openPrRows.filter((row) => selectedPrIds.includes(String(row.prId))),
        detailRows: nextDetailRows,
        supplierRows: syncSupplierRowsWithCanvassDetails(supplierRows, nextDetailRows),
        activeTab: "review",
      });
    } catch (error) {
      useSwalErrorAlert("Load PR Detail", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  /* ---------------------------------------------------------------------------
     Supplier offer management
     ---------------------------------------------------------------------------
     Supplier cards are based on the current consolidated canvass detail rows.
     Each supplier has its own quote header and item detail pricing.
  --------------------------------------------------------------------------- */
  const addSupplier = () => {
    if (isLocked) return;
    if (detailRows.length === 0) {
      useSwalInfoAlert("Supplier Offer", "Please select PR items first.");
      return;
    }

    updateState({
      activeTab: "suppliers",
      activeSupplierIndex: supplierRows.length,
      supplierRows: [
        ...supplierRows,
        calcSupplier({
          supplierCode: "",
          supplierName: "",
          quoteNo: "",
          quoteDate: "",
          offerDate: "",
          paymentTerms: "",
          deliveryTerms: "",
          deliveryDate: "",
          remarks: "",
          isAwarded: false,
          isLowestOffer: false,
          detailRows: detailRows.map((item) => makeSupplierDetail(item, decQty, decUPrice)),
          attachments: [],
        }),
      ],
    });
  };

  const getSupplierAttachmentDocumentNo = useCallback(
    (supplier) => `${canNo || "CAN"}-${supplier?.supplierCode || "SUPPLIER"}`,
    [canNo]
  );

  const deleteSupplierAttachments = async (supplier) => {
    const lookupKeys = [
      getSupplierAttachmentDocumentNo(supplier),
      supplier?.canSupplierId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const uniqueLookupKeys = [...new Set(lookupKeys)];
    const deletedFileIds = new Set();

    for (const lookupKey of uniqueLookupKeys) {
      const attachmentRows = normalizeRows(await useFetchTranAtt(lookupKey));

      for (const attachment of attachmentRows) {
        const fileId =
          attachment?.id ||
          attachment?.fileID ||
          attachment?.fileId ||
          attachment?.attachmentId ||
          "";

        if (!fileId || deletedFileIds.has(String(fileId))) continue;

        await useHandleFileDelete(fileId);
        deletedFileIds.add(String(fileId));
      }
    }

    return deletedFileIds.size;
  };

  const removeSupplier = async (index) => {
    if (isLocked) return;

    const removed = supplierRows[index];
    const hasSavedSupplier = Boolean(removed?.canSupplierId);
    const nextSupplierRows = supplierRows.filter((_, i) => i !== index);
    const supplierWasSelected = removed?.supplierCode === selectedSupplierCode;
    const nextSelectedSupplierCode = supplierWasSelected ? "" : selectedSupplierCode;
    const nextSelectedSupplierName = supplierWasSelected ? "" : selectedSupplierName;
    const nextSelectedOfferAmount = supplierWasSelected ? "0.00" : selectedOfferAmount;

    const result = await useSwalProceedConfirm(
      "Remove Supplier Offer?",
      hasSavedSupplier
        ? "This will also delete supplier quotation attachments linked to this supplier and re-save the Canvass transaction. Continue?"
        : "Remove this supplier offer?",
      "Yes"
    );

    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });

    try {
      if (hasSavedSupplier) {
        await deleteSupplierAttachments(removed);
      }

      updateState({
        supplierRows: nextSupplierRows,
        activeSupplierIndex: Math.max(0, Math.min(activeSupplierIndex, nextSupplierRows.length - 1)),
        selectedSupplierCode: nextSelectedSupplierCode,
        selectedSupplierName: nextSelectedSupplierName,
        selectedOfferAmount: nextSelectedOfferAmount,
      });

      if (canId) {
        const data = await callCAN(
          "upsert",
          buildPayload({
            supplierRows: nextSupplierRows,
            selectedSupplierCode: nextSelectedSupplierCode,
            selectedSupplierName: nextSelectedSupplierName,
            selectedOfferAmount: nextSelectedOfferAmount,
          })
        );

        const responseRow = Array.isArray(data) ? data[0] : data;
        const savedCanId = responseRow?.canId || canId;
        const savedCanNo = responseRow?.canNo || canNo;

        await fetchCAN({
          canId: savedCanId,
          canNo: savedCanNo,
          branchCode,
        });
      }

      await useSwalSuccessAlert(
        "Supplier Removed",
        hasSavedSupplier
          ? "Supplier offer and its quotation attachments were removed. Canvass was re-saved successfully."
          : "Supplier offer was removed."
      );
    } catch (error) {
      useSwalErrorAlert(
        "Remove Supplier",
        errorMessage(error, "Unable to remove supplier offer and quotation attachments.")
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const updateSupplier = (index, field, value) => {
    if (isLocked) return;
    const rows = [...supplierRows];
    const normalizedValue = field === "supplierCode" ? String(value || "").toUpperCase() : value;

    const updates = { [field]: normalizedValue };
    if (field === "supplierCode" && !normalizedValue) {
      updates.supplierName = "";
    }

    rows[index] = { ...rows[index], ...updates };
    updateState({ supplierRows: rows });
  };

  const updateSupplierDetail = (supplierIndex, detailIndex, field, value, commit = false) => {
    if (isLocked) return;

    const suppliers = [...supplierRows];
    const supplier = { ...suppliers[supplierIndex] };
    const rows = [...normalizeRows(supplier.detailRows)];

    rows[detailIndex] = { ...rows[detailIndex], [field]: value };
    if (commit) {
      rows[detailIndex] = calcDetail(rows[detailIndex], {
        decQty,
        decUPrice,
        getVatAmount: getCanVatAmount,
        changedField: field,
      });
    }

    suppliers[supplierIndex] = calcSupplier({ ...supplier, detailRows: rows });
    updateState({ supplierRows: suppliers });
  };

  const setSupplierTab = (supplierIndex, tab) => {
    updateState({
      supplierActiveTabs: {
        ...supplierActiveTabs,
        [supplierIndex]: tab,
      },
    });
  };

  const openSupplierLookup = (supplierIndex) => {
    if (isLocked) return;
    updateState({
      showPayeeLookupModal: true,
      activeSupplierIndexForLookup: supplierIndex,
    });
  };

  const handleSupplierLookupClose = async (selectedPayee) => {
    updateState({ showPayeeLookupModal: false });

    if (!selectedPayee || activeSupplierIndexForLookup === null) {
      updateState({ activeSupplierIndexForLookup: null });
      return;
    }

    updateState({ isLoading: true });

    try {
      const selectedVendCode = String(selectedPayee?.vendCode || "").trim();
      let payeeRow = null;
      if (selectedVendCode) {
        try {
          payeeRow = await useTopPayeeRow(selectedVendCode);
        } catch (error) {
          console.error("Error fetching selected supplier:", error);
        }
      }

      const suppliers = [...supplierRows];
      const supplier = { ...suppliers[activeSupplierIndexForLookup] };
      const nextSupplierCode = String(payeeRow?.vendCode || selectedPayee.vendCode || "").trim().toUpperCase();

      if (
        nextSupplierCode &&
        suppliers.some((row, index) =>
          index !== activeSupplierIndexForLookup &&
          String(row?.supplierCode || "").trim().toUpperCase() === nextSupplierCode
        )
      ) {
        updateState({ activeSupplierIndexForLookup: null });
        useSwalInfoAlert("Supplier Offer", "This supplier is already selected in another supplier card.");
        return;
      }

      const replacementVat = getCanGoodsVatRow(payeeRow?.vatCode || selectedPayee.vatCode || "");
      const nextVatCode = replacementVat?.vatCode || payeeRow?.vatCode || selectedPayee.vatCode || "";
      const nextVatName = replacementVat?.vatName || payeeRow?.vatName || selectedPayee.vatName || "";
      let nextPaymentTerms =
        payeeRow?.paytermName ||
        payeeRow?.paytermCode ||
        selectedPayee.paytermName ||
        selectedPayee.paytermCode ||
        selectedPayee.paymentTerms ||
        selectedPayee.payTerms ||
        supplier.paymentTerms ||
        "";
      const nextPaytermCode = payeeRow?.paytermCode || selectedPayee.paytermCode || "";
      if (nextPaytermCode) {
        try {
          const paytermRow = await useTopPayTermRow(nextPaytermCode);
          nextPaymentTerms = paytermRow?.paytermName || paytermRow?.paytermCode || nextPaymentTerms;
        } catch (error) {
          console.error("Error fetching selected payment term:", error);
        }
      }

      supplier.supplierCode = nextSupplierCode;
      supplier.supplierName = selectedPayee.vendName || payeeRow?.vendName || "";
      supplier.paymentTerms = nextPaymentTerms;
      supplier.vatCode = nextVatCode;
      supplier.vatName = nextVatName;
      supplier.detailRows = normalizeRows(supplier.detailRows).map((detail) =>
        calcDetail(
          {
            ...detail,
            vatCode: nextVatCode,
            vatName: nextVatName,
          },
          { decQty, decUPrice, getVatAmount: getCanVatAmount },
        )
      );

      suppliers[activeSupplierIndexForLookup] = calcSupplier(supplier);
      updateState({
        supplierRows: suppliers,
        activeSupplierIndexForLookup: null,
      });
    } catch (error) {
      console.error("Error selecting supplier:", error);
      useSwalErrorAlert("Supplier Offer", errorMessage(error, "Unable to update selected supplier."));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const openPaytermLookup = (supplierIndex) => {
    if (isLocked) return;
    updateState({
      showPaytermModal: true,
      activeSupplierIndexForPayterm: supplierIndex,
    });
  };

  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm) {
      await handleSelectPayTerm(selectedPayterm.paytermCode);
    }
    updateState({ showPaytermModal: false });
  };

  const handleSelectPayTerm = async (code) => {
    if (!code || activeSupplierIndexForPayterm === null) return;

    const result = await useTopPayTermRow(code);
    if (!result) return;

    const suppliers = [...supplierRows];
    const supplier = { ...suppliers[activeSupplierIndexForPayterm] };

    supplier.paymentTerms = result.paytermName || result.paytermCode || "";

    suppliers[activeSupplierIndexForPayterm] = supplier;
    updateState({
      supplierRows: suppliers,
      activeSupplierIndexForPayterm: null,
    });
  };

  const distributeIncludedQty = (breakdownRows, selectedQtyValue) => {
    let remaining = num(selectedQtyValue);

    return normalizeRows(breakdownRows).map((row) => {
      const availableQty = num(row.qtyInPr);
      const includedQty = Math.max(0, Math.min(availableQty, remaining));
      remaining -= includedQty;

      return {
        ...row,
        includedQty: qty(includedQty, decQty),
      };
    });
  };

  /* ---------------------------------------------------------------------------
     Canvass Quantity edit
     ---------------------------------------------------------------------------
     Updates selected quantity, redistributes quantity to the PR breakdown, and
     re-syncs every supplier item row to keep supplier quantities consistent.
  --------------------------------------------------------------------------- */
  const updateItemSelectedQty = (index, value, commit = false) => {
    if (isLocked) return;

    const rows = [...detailRows];
    const row = rows[index];
    const clampedQty = Math.max(0, Math.min(num(value), num(row.totalQtyNeeded)));
    const selectedQtyValue = commit ? qty(clampedQty, decQty) : value;

    rows[index] = {
      ...row,
      selectedQty: selectedQtyValue,
      prBreakdown: commit ? distributeIncludedQty(row.prBreakdown, clampedQty) : row.prBreakdown,
    };

    const suppliers = syncSupplierRowsWithCanvassDetails(supplierRows, rows);

    updateState({ detailRows: rows, supplierRows: suppliers });
  };

  const toggleSelectedPrId = (prId) => {
    if (isLocked) return;

    const id = String(prId);
    setSelectedPrIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  /* ---------------------------------------------------------------------------
     PR selector displayed rows
     ---------------------------------------------------------------------------
     Merges open PR rows with saved PR rows from the retrieved transaction so
     existing Canvass records still show their PRs after they are no longer open.
  --------------------------------------------------------------------------- */
  const displayedPrRows = useMemo(() => {
    const rowsByPrId = new Map();

    const addOrMergePr = (row = {}, source = "open") => {
      const prId = String(row?.prId || "").trim();
      const prNo = String(row?.prNo || "").trim();
      const key = prId || prNo;
      if (!key) return;

      const existing = rowsByPrId.get(key) || {};
      rowsByPrId.set(key, {
        ...existing,
        ...row,
        prId: prId || existing.prId || "",
        prNo: prNo || existing.prNo || "",
        branchCode: row.branchCode || existing.branchCode || branchCode || "",
        prDate: row.prDate || existing.prDate || "",
        rcCode: row.rcCode || existing.rcCode || "",
        rcName: row.rcName || existing.rcName || "",
        requestedBy: row.requestedBy || existing.requestedBy || "",
        dateNeeded: row.dateNeeded || existing.dateNeeded || "",
        totalItems: row.totalItems ?? existing.totalItems ?? 0,
        totalQty: row.totalQty ?? existing.totalQty ?? 0,
        remarks: row.remarks || existing.remarks || "",
        isSavedPr: source === "saved" || existing.isSavedPr || false,
      });
    };

    normalizeRows(openPrRows).forEach((row) => addOrMergePr(row, "open"));
    normalizeRows(prRows).forEach((row) => addOrMergePr(row, "saved"));

    const detailByPr = new Map();
    normalizeRows(detailRows).forEach((detail) => {
      normalizeRows(detail?.prBreakdown).forEach((breakdown) => {
        const prId = String(breakdown?.prId || "").trim();
        const prNo = String(breakdown?.prNo || "").trim();
        const key = prId || prNo;
        if (!key) return;

        const current = detailByPr.get(key) || {
          totalItems: 0,
          totalQty: 0,
          prId,
          prNo,
          branchCode: breakdown.branchCode || branchCode || "",
          rcCode: breakdown.rcCode || "",
          rcName: breakdown.rcName || "",
          requestedBy: breakdown.requestedBy || "",
          dateNeeded: breakdown.dateNeeded || "",
        };

        current.totalItems += 1;
        current.totalQty += num(breakdown?.includedQty || breakdown?.qtyInPr || detail?.selectedQty || 0);
        current.prId = current.prId || prId;
        current.prNo = current.prNo || prNo;
        current.branchCode = current.branchCode || breakdown.branchCode || branchCode || "";
        current.rcCode = current.rcCode || breakdown.rcCode || "";
        current.rcName = current.rcName || breakdown.rcName || "";
        current.requestedBy = current.requestedBy || breakdown.requestedBy || "";
        current.dateNeeded = current.dateNeeded || breakdown.dateNeeded || "";
        detailByPr.set(key, current);
      });
    });

    detailByPr.forEach((computed, key) => {
      const existing = rowsByPrId.get(key) || {};
      rowsByPrId.set(key, {
        ...computed,
        ...existing,
        totalItems: num(existing.totalItems) > 0 ? existing.totalItems : computed.totalItems,
        totalQty: num(existing.totalQty) > 0 ? existing.totalQty : computed.totalQty,
        isSavedPr: existing.isSavedPr ?? true,
      });
    });

    return Array.from(rowsByPrId.values());
  }, [openPrRows, prRows, detailRows, branchCode]);

  /* ---------------------------------------------------------------------------
     Table column definitions
     ---------------------------------------------------------------------------
     Each table uses useResizableTableColumns so resizing, sorting, and frozen
     columns behave consistently across the Canvass screen.
  --------------------------------------------------------------------------- */
  const canPrColumnDefs = useMemo(() => [
    { key: "selected", label: "Select", width: 72 },
    { key: "branchCode", label: "Branch", width: 110 },
    { key: "prNo", label: "PR No.", width: 130 },
    { key: "prDate", label: "PR Date", width: 120 },
    { key: "rcName", label: "Department", width: 180 },
    { key: "requestedBy", label: "Requested By", width: 160 },
    { key: "dateNeeded", label: "Date Needed", width: 130 },
    { key: "totalItems", label: "Items", width: 90 },
    { key: "totalQty", label: "Quantity Needed", width: 150 },
    { key: "remarks", label: "Remarks", width: 260 },
  ], []);

  const {
    getColumnStyle: getCanPrColumnStyle,
    getFrozenColumnStyle: getCanPrFrozenStyle,
    getOrderedColumns: getOrderedCanPrColumns,
    getSortedRows: getSortedCanPrRows,
    renderHeaderContextMenu: renderCanPrHeaderContextMenu,
    renderResizableHeader: renderCanPrHeader,
    setFrozenColumnKeys: setCanPrFrozenColumnKeys,
  } = useResizableTableColumns(canPrColumnDefs);
  const orderedCanPrColumns = getOrderedCanPrColumns(canPrColumnDefs);
  useEffect(() => {
    const stickyPrColumns = ["selected", "prNo"];
    setCanPrFrozenColumnKeys((prev) => {
      const availableKeys = new Set(canPrColumnDefs.map((column) => column.key));
      const next = [
        ...stickyPrColumns.filter((key) => availableKeys.has(key)),
        ...prev.filter((key) => availableKeys.has(key) && !stickyPrColumns.includes(key)),
      ];

      return next.length === prev.length && next.every((key, index) => key === prev[index]) ? prev : next;
    });
  }, [canPrColumnDefs, setCanPrFrozenColumnKeys]);
  const sortedCanPrRows = getSortedCanPrRows(
    displayedPrRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "selected") return selectedPrIds.includes(String(entry.row?.prId)) ? 1 : 0;
      return entry.row?.[sortKey] ?? "";
    },
  );
  const canPrTotals = useMemo(() => ({
    totalItems: displayedPrRows.reduce((sum, row) => sum + num(row.totalItems), 0),
    totalQty: qty(displayedPrRows.reduce((sum, row) => sum + num(row.totalQty), 0), decQty),
  }), [displayedPrRows, decQty]);
  const getCanPrFallbackWidth = (key) => canPrColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCanPrCellStyle = (key, fallbackWidth) => ({
    ...getCanPrColumnStyle(key, fallbackWidth),
    ...getCanPrFrozenStyle(key, orderedCanPrColumns, fallbackWidth, { isHeader: false }),
  });

  const canCanvassColumnDefs = useMemo(() => [
    { key: "expand", label: "", width: 56 },
    { key: "ln", label: "LN", width: 64 },
    { key: "invType", label: "Type", width: 80 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "itemSpecs", label: "Specification", width: 200 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "totalQtyNeeded", label: "Total Qty Needed", width: 130 },
    { key: "selectedQty", label: "Canvass Quantity", width: 150 },
    { key: "sourcePrs", label: "Source PRs", width: 180 },
    { key: "prCount", label: "PR Count", width: 110 },
    { key: "availableQty", label: "Actual / Original", width: 170 },
  ], []);

  const {
    getColumnStyle: getCanCanvassColumnStyle,
    getFrozenColumnStyle: getCanCanvassFrozenStyle,
    getOrderedColumns: getOrderedCanCanvassColumns,
    getSortedRows: getSortedCanCanvassRows,
    renderHeaderContextMenu: renderCanCanvassHeaderContextMenu,
    renderResizableHeader: renderCanCanvassHeader,
    setFrozenColumnKeys: setCanCanvassFrozenColumnKeys,
  } = useResizableTableColumns(canCanvassColumnDefs);
  const orderedCanCanvassColumns = getOrderedCanCanvassColumns(canCanvassColumnDefs);
  useEffect(() => {
    const stickyCanvassColumns = ["expand", "ln", "invType", "itemCode", "itemName"];
    setCanCanvassFrozenColumnKeys((prev) => {
      const availableKeys = new Set(canCanvassColumnDefs.map((column) => column.key));
      const next = [
        ...stickyCanvassColumns.filter((key) => availableKeys.has(key)),
        ...prev.filter((key) => availableKeys.has(key) && !stickyCanvassColumns.includes(key)),
      ];

      return next.length === prev.length && next.every((key, index) => key === prev[index]) ? prev : next;
    });
  }, [canCanvassColumnDefs, setCanCanvassFrozenColumnKeys]);
  const sortedCanCanvassRows = getSortedCanCanvassRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "expand") return "";
      if (sortKey === "ln") return entry.originalIndex + 1;
      if (sortKey === "sourcePrs") {
        return normalizeRows(entry.row?.prBreakdown).map((item) => item.prNo).join(", ");
      }
      if (sortKey === "prCount") return normalizeRows(entry.row?.prBreakdown).length;
      if (sortKey === "availableQty") return num(entry.row?.selectedQty);
      return entry.row?.[sortKey] ?? "";
    },
  );
  const getCanCanvassFallbackWidth = (key) => canCanvassColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCanCanvassCellStyle = (key, fallbackWidth) => ({
    ...getCanCanvassColumnStyle(key, fallbackWidth),
    ...getCanCanvassFrozenStyle(key, orderedCanCanvassColumns, fallbackWidth, { isHeader: false }),
  });
  const getCanCanvassFooterCellStyle = (key, fallbackWidth) => ({
    ...getCanCanvassColumnStyle(key, fallbackWidth),
    ...getCanCanvassFrozenStyle(key, orderedCanCanvassColumns, fallbackWidth, {
      isHeader: false,
      backgroundColor: "#f1f5f9",
    }),
  });

  const canSupplierItemColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 80 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "itemSpecs", label: "Specification", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 130 },
    { key: "unitPrice", label: "Unit Price", width: 130 },
    { key: "grossAmount", label: "Gross Amount", width: 140 },
    { key: "discountAmount", label: "Discount Amount", width: 150 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatAmount", label: "VAT Amount", width: 140 },
    { key: "netAmount", label: "Net Amount", width: 140 },
  ], []);

  const {
    getColumnStyle: getCanSupplierItemColumnStyle,
    getFrozenColumnStyle: getCanSupplierItemFrozenStyle,
    getOrderedColumns: getOrderedCanSupplierItemColumns,
    getSortedRows: getSortedCanSupplierItemRows,
    renderHeaderContextMenu: renderCanSupplierItemHeaderContextMenu,
    renderResizableHeader: renderCanSupplierItemHeader,
  } = useResizableTableColumns(canSupplierItemColumnDefs);
  const orderedCanSupplierItemColumns = getOrderedCanSupplierItemColumns(canSupplierItemColumnDefs);
  const getCanSupplierItemFallbackWidth = (key) =>
    canSupplierItemColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCanSupplierItemCellStyle = (key, fallbackWidth) => ({
    ...getCanSupplierItemColumnStyle(key, fallbackWidth),
    ...getCanSupplierItemFrozenStyle(key, orderedCanSupplierItemColumns, fallbackWidth, { isHeader: false }),
  });

  const generatePODetailColumnDefs = useMemo(() => [
    { key: "viewPO", label: "View", width: 56 },
    { key: "poNo", label: "PO No.", width: 140 },
    { key: "prNo", label: "PR No.", width: 130 },
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 80 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "itemSpecs", label: "Specification", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 130 },
    { key: "unitPrice", label: "Unit Price", width: 130 },
    { key: "grossAmount", label: "Gross Amount", width: 140 },
    { key: "discountAmount", label: "Discount Amount", width: 150 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatAmount", label: "VAT Amount", width: 140 },
    { key: "netAmount", label: "Net Amount", width: 140 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 220 },
  ], []);

  const {
    getColumnStyle: getGeneratePODetailColumnStyle,
    getFrozenColumnStyle: getGeneratePODetailFrozenStyle,
    getOrderedColumns: getOrderedGeneratePODetailColumns,
    getSortedRows: getSortedGeneratePODetailRows,
    renderHeaderContextMenu: renderGeneratePODetailHeaderContextMenu,
    renderResizableHeader: renderGeneratePODetailHeader,
  } = useResizableTableColumns(generatePODetailColumnDefs);
  const orderedGeneratePODetailColumns = getOrderedGeneratePODetailColumns(generatePODetailColumnDefs);
  const sortedGeneratePODetailRows = getSortedGeneratePODetailRows(
    poAllDetailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "viewPO") return entry.row?.poNo || entry.row?.poId || "";
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const getGeneratePODetailFallbackWidth = (key) =>
    generatePODetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getGeneratePODetailCellStyle = (key, fallbackWidth) => ({
    ...getGeneratePODetailColumnStyle(key, fallbackWidth),
    ...getGeneratePODetailFrozenStyle(key, orderedGeneratePODetailColumns, fallbackWidth, { isHeader: false }),
  });

  const generatePOSummaryColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 80 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "itemSpecs", label: "Specification", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 130 },
    { key: "unitPrice", label: "Unit Price", width: 130 },
    { key: "grossAmount", label: "Gross Amount", width: 140 },
    { key: "discountAmount", label: "Discount Amount", width: 150 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatAmount", label: "VAT Amount", width: 140 },
    { key: "netAmount", label: "Net Amount", width: 140 },
  ], []);

  const {
    getColumnStyle: getGeneratePOSummaryColumnStyle,
    getFrozenColumnStyle: getGeneratePOSummaryFrozenStyle,
    getOrderedColumns: getOrderedGeneratePOSummaryColumns,
    getSortedRows: getSortedGeneratePOSummaryRows,
    renderHeaderContextMenu: renderGeneratePOSummaryHeaderContextMenu,
    renderResizableHeader: renderGeneratePOSummaryHeader,
  } = useResizableTableColumns(generatePOSummaryColumnDefs);
  const orderedGeneratePOSummaryColumns = getOrderedGeneratePOSummaryColumns(generatePOSummaryColumnDefs);
  const sortedGeneratePOSummaryRows = getSortedGeneratePOSummaryRows(
    poSummaryRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );
  const getGeneratePOSummaryFallbackWidth = (key) =>
    generatePOSummaryColumnDefs.find((column) => column.key === key)?.width || 120;
  const getGeneratePOSummaryCellStyle = (key, fallbackWidth) => ({
    ...getGeneratePOSummaryColumnStyle(key, fallbackWidth),
    ...getGeneratePOSummaryFrozenStyle(key, orderedGeneratePOSummaryColumns, fallbackWidth, { isHeader: false }),
  });

  /* ---------------------------------------------------------------------------
     Cell renderers
     ---------------------------------------------------------------------------
     Renderers keep JSX table rows readable and ensure formatting is centralized
     per table/column group.
  --------------------------------------------------------------------------- */
  const renderCanPrCell = (columnKey, row) => {
    const style = getCanPrCellStyle(columnKey, getCanPrFallbackWidth(columnKey));
    const checked = selectedPrIds.includes(String(row.prId));
    const textValue = (value, className = "") => (
      <td key={columnKey} className={`global-tran-td-ui h-8 ${className}`.trim()} style={style}>
        <input
          className={`w-full min-h-[25px] global-tran-td-inputclass-ui ${className.includes("text-right") ? "text-right" : ""}`.trim()}
          value={value || ""}
          readOnly
        />
      </td>
    );

    const renderers = {
      selected: () => (
        <td key={columnKey} className="global-tran-td-ui h-8 text-center" style={style}>
          <input
            type="checkbox"
            checked={checked}
            disabled={isLocked}
            onChange={() => toggleSelectedPrId(row.prId)}
            className="h-4 w-4"
          />
        </td>
      ),
      branchCode: () => textValue(row.branchCode || row.branchName || ""),
      prNo: () => textValue(row.prNo),
      prDate: () => textValue(safeDate(row.prDate)),
      rcName: () => textValue(row.rcName || row.rcCode || "No Department"),
      requestedBy: () => textValue(row.requestedBy),
      dateNeeded: () => textValue(safeDate(row.dateNeeded)),
      totalItems: () => textValue(row.totalItems, "text-right"),
      totalQty: () => textValue(qty(row.totalQty, decQty), "text-right"),
      remarks: () => textValue(row.remarks),
    };

    return renderers[columnKey]?.() || textValue(row[columnKey]);
  };

  const renderCanCanvassCell = (columnKey, row, originalIndex) => {
    const style = getCanCanvassCellStyle(columnKey, getCanCanvassFallbackWidth(columnKey));
    const breakdown = normalizeRows(row.prBreakdown);
    const textValue = (value, className = "") => (
      <td key={columnKey} className={`global-tran-td-ui ${className}`.trim()} style={style}>
        <input
          className={`w-full global-tran-td-inputclass-ui ${className.includes("text-right") ? "text-right" : ""}`.trim()}
          value={value || ""}
          readOnly
        />
      </td>
    );

    const renderers = {
      expand: () => (
        <td key={columnKey} className="global-tran-td-ui text-center" style={style}>
          <button
            type="button"
            onClick={() => setExpandedItemLn(expandedItemLn === row.canLn ? null : row.canLn)}
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
          >
            <FontAwesomeIcon icon={expandedItemLn === row.canLn ? faChevronDown : faChevronRight} />
          </button>
        </td>
      ),
      ln: () => textValue(originalIndex + 1, "text-center"),
      invType: () => textValue(row.invType),
      itemCode: () => textValue(row.itemCode),
      itemName: () => textValue(row.itemName),
      itemSpecs: () => textValue(row.itemSpecs),
      uomCode: () => textValue(row.uomCode),
      totalQtyNeeded: () => textValue(qty(row.totalQtyNeeded, decQty), "text-right"),
      sourcePrs: () => textValue(breakdown.map((item) => item.prNo).filter(Boolean).join(", ")),
      prCount: () => textValue(breakdown.length, "text-center"),
      availableQty: () => textValue(`${qty(row.selectedQty, decQty)} / ${qty(row.totalQtyNeeded, decQty)}`, "text-right"),
      selectedQty: () => (
        <td key={columnKey} className="global-tran-td-ui text-right" style={style}>
          <input
            data-can-canvass-selected-qty-input="true"
            className="w-full global-tran-td-inputclass-ui text-right"
            value={row.selectedQty || ""}
            onChange={(e) => updateItemSelectedQty(originalIndex, e.target.value)}
            onBlur={(e) => updateItemSelectedQty(originalIndex, e.target.value, true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || isLocked) return;
              e.preventDefault();
              const inputs = Array.from(document.querySelectorAll('[data-can-canvass-selected-qty-input="true"]'));
              const currentIndex = inputs.indexOf(e.currentTarget);
              updateItemSelectedQty(originalIndex, e.currentTarget.value, true);
              window.setTimeout(() => {
                const nextInputs = Array.from(document.querySelectorAll('[data-can-canvass-selected-qty-input="true"]'));
                const nextInput = nextInputs[currentIndex + 1];
                if (nextInput) {
                  nextInput.focus();
                  if (typeof nextInput.select === "function") nextInput.select();
                }
              }, 0);
            }}
            readOnly={isLocked}
          />
        </td>
      ),
    };

    return renderers[columnKey]?.() || textValue(row[columnKey]);
  };

  const renderCanSupplierItemCell = (columnKey, row, originalIndex, supplierIndex) => {
    const style = getCanSupplierItemCellStyle(columnKey, getCanSupplierItemFallbackWidth(columnKey));
    const supplierRowsForNavigation = normalizeRows(supplierRows?.[supplierIndex]?.detailRows);
    const supplierEditableFields = ["unitPrice", "discountAmount"];
    const focusSupplierItemCell = (field, rowIndex) => {
      const nextEl = document.getElementById(`can-supplier-${supplierIndex}-${field}-${rowIndex}`);
      if (nextEl) {
        nextEl.focus();
        if (typeof nextEl.select === "function") nextEl.select();
      }
    };
    const commitSupplierItemNumber = (field, value) => {
      const decimals = field === "unitPrice" ? decUPrice : DEC_AMT;
      const sanitizedValue = sanitizeNumeric(value);
      updateSupplierDetail(
        supplierIndex,
        originalIndex,
        field,
        formatNumber(parseFormattedNumber(sanitizedValue || 0) || 0, decimals),
        true,
      );
    };
    const handleSupplierItemKeyDown = (e, field) => {
      if (isLocked) return;

      if (e.key === "Enter") {
        e.preventDefault();
        commitSupplierItemNumber(field, e.currentTarget.value);
        window.setTimeout(() => {
          focusSupplierItemCell(field, Math.min(supplierRowsForNavigation.length - 1, originalIndex + 1));
        }, 0);
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        commitSupplierItemNumber(field, e.currentTarget.value);
        const currentFieldIndex = supplierEditableFields.indexOf(field);
        const nextFieldIndex = e.shiftKey
          ? Math.max(0, currentFieldIndex - 1)
          : Math.min(supplierEditableFields.length - 1, currentFieldIndex + 1);
        window.setTimeout(() => focusSupplierItemCell(supplierEditableFields[nextFieldIndex], originalIndex), 0);
      }
    };
    const textValue = (value, className = "") => (
      <td key={columnKey} className={`global-tran-td-ui h-8 ${className}`.trim()} style={style}>
        <input
          className={`w-full min-h-[28px] global-tran-td-inputclass-ui ${className.includes("text-right") ? "text-right" : ""} `.trim()}
          value={value || ""}
          readOnly
        />
      </td>
    );
    const editableNumber = (field, decimals = DEC_AMT, options = {}) => (
      <td key={columnKey} className="global-tran-td-ui h-8 text-right" style={style}>
        <input
          id={`can-supplier-${supplierIndex}-${field}-${originalIndex}`}
          className="w-full min-h-[28px] global-tran-td-inputclass-ui text-right"
          value={row[field] || ""}
          onChange={(e) => updateSupplierDetail(supplierIndex, originalIndex, field, sanitizeNumeric(e.target.value))}
          onFocus={(e) => {
            if (isLocked || !options.clearZeroOnFocus) return;
            if (parseFormattedNumber(e.target.value || 0) === 0) {
              updateSupplierDetail(supplierIndex, originalIndex, field, "");
            }
          }}
          onBlur={(e) => {
            if (isLocked) return;
            updateSupplierDetail(
              supplierIndex,
              originalIndex,
              field,
              formatNumber(parseFormattedNumber(sanitizeNumeric(e.target.value) || 0) || 0, decimals),
              true,
            );
          }}
          onKeyDown={(e) => options.gridNavigation ? handleSupplierItemKeyDown(e, field) : undefined}
          readOnly={isLocked}
        />
      </td>
    );

    const renderers = {
      ln: () => textValue(originalIndex + 1, "text-center"),
      invType: () => textValue(row.invType),
      itemCode: () => textValue(row.itemCode),
      itemName: () => textValue(row.itemName),
      itemSpecs: () => textValue(row.itemSpecs),
      uomCode: () => textValue(row.uomCode),
      quantity: () => editableNumber("quantity", decQty),
      unitPrice: () => editableNumber("unitPrice", decUPrice, { clearZeroOnFocus: true, gridNavigation: true }),
      grossAmount: () => textValue(money(row.grossAmount), "text-right"),
      discountAmount: () => editableNumber("discountAmount", DEC_AMT, { clearZeroOnFocus: true, gridNavigation: true }),
      vatCode: () => (
        <td key={columnKey} className="global-tran-td-ui h-8" style={style}>
          <input
            className="w-full min-h-[28px] global-tran-td-inputclass-ui"
            value={row.vatCode || ""}
            onChange={(e) => updateSupplierDetail(supplierIndex, originalIndex, "vatCode", e.target.value.toUpperCase())}
            onBlur={(e) => updateSupplierDetail(supplierIndex, originalIndex, "vatCode", e.target.value.toUpperCase(), true)}
            readOnly={isLocked}
          />
        </td>
      ),
      vatAmount: () => textValue(money(row.vatAmount), "text-right"),
      netAmount: () => textValue(money(row.netAmount), "text-right font-bold"),
    };

    return renderers[columnKey]?.() || textValue(row[columnKey]);
  };

  /* ---------------------------------------------------------------------------
     Award supplier
     ---------------------------------------------------------------------------
     Validates supplier offer totals, saves the awarded supplier in CAN, and
     refreshes the transaction to display the latest status and selected offer.
  --------------------------------------------------------------------------- */
  const awardSupplier = async (supplier) => {
    if (!supplier?.supplierCode) {
      useSwalInfoAlert("Award Supplier", "Please enter Supplier Code first.");
      return;
    }

    if (num(supplier?.netAmount) <= 0) {
      useSwalInfoAlert(
        "Award Supplier",
        "Supplier offer cannot be awarded because Total Net Amount is zero."
      );
      return;
    }

    if (!canId) {
      updateState({
        selectedSupplierCode: supplier.supplierCode,
        selectedSupplierName: supplier.supplierName,
        selectedOfferAmount: money(supplier.netAmount),
        supplierRows: supplierRows.map((row) => ({
          ...row,
          isAwarded: row.supplierCode === supplier.supplierCode,
        })),
      });

      useSwalInfoAlert(
        "Supplier Selected",
        "Please save the Canvass first before final awarding."
      );
      return;
    }

    if (!supplier?.canSupplierId) {
      useSwalInfoAlert(
        "Award Supplier",
        "Please save the Canvass transaction first before awarding this supplier offer."
      );
      return;
    }

    const result = await useSwalProceedConfirm(
      "Award Supplier?",
      `Award this Canvass transaction to ${supplier.supplierName || supplier.supplierCode}?`,
      "Yes, Award"
    );

    if (!result?.isConfirmed) return;

    const currentCanId = canId;
    const currentCanNo = canNo;
    const currentBranchCode = branchCode;

    updateState({ isLoading: true });

    try {
      const data = await callCAN("award", {
        canId: currentCanId,
        userCode,
        selectedSupplierCode: supplier.supplierCode,
        selectedSupplierName: supplier.supplierName,
        selectedOfferAmount: num(supplier.netAmount),
        remarks,
      });

      const responseRow = Array.isArray(data) ? data[0] : data;
      const responseCanId = responseRow?.canId || currentCanId;
      const responseCanNo = responseRow?.canNo || currentCanNo;

      /*
        Update the visible fields immediately, then retrieve the transaction
        again from SQL so status, selected supplier, awarded flag, attachments,
        and status history are all synchronized with the database.
      */
      updateState({
        canId: responseCanId,
        canNo: responseCanNo,
        canStatus: responseRow?.canStatus || "W",
        canStatusName: responseRow?.canStatusName || "Awarded",
        selectedSupplierCode: supplier.supplierCode,
        selectedSupplierName: supplier.supplierName,
        selectedOfferAmount: money(supplier.netAmount),
        supplierRows: supplierRows.map((row) => ({
          ...row,
          isAwarded:
            String(row?.supplierCode || "").trim().toUpperCase() ===
            String(supplier.supplierCode || "").trim().toUpperCase(),
        })),
      });

      await fetchCAN({
        canId: responseCanId,
        canNo: responseCanNo,
        branchCode: currentBranchCode,
      });

      await useSwalSuccessAlert(
        "Awarded",
        "Supplier offer has been awarded."
      );
    } catch (error) {
      useSwalErrorAlert("Award Supplier", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const buildPurchaseOrderPayload = (rows = []) => {
    const supplier = awardedSupplier || {};
    const paytermValue = supplier.paytermCode || supplier.paymentTerms || supplier.paytermName || "";
    const today = useGetCurrentDayV2();

    const detailForPO = normalizeRows(rows).map((row, index) => {
      const grossAmount = num(row.grossAmount);
      const discountAmount = num(row.discountAmount);
      const itemAmount = Math.max(grossAmount - discountAmount, 0);

      return {
        poId: "",
        prId: row.prId || canId || "",
        groupId: row.groupId || row.canDt1Id || row.canLn || "",
        prNo: row.prNo || canNo || "",
        prStatus: row.prStatus || "",
        poStatus: "O",
        invType: row.invType || "",
        lnNo: index + 1,
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        uomCode: row.uomCode || "",
        qtyOnHand: 0,
        prBalance: num(row.quantity),
        poQty: num(row.quantity),
        unitCost: num(row.unitPrice),
        grossAmount,
        discRate: grossAmount ? (discountAmount / grossAmount) * 100 : 0,
        discAmount: discountAmount,
        netAmount: num(row.netAmount),
        vatCode: row.vatCode || supplier.vatCode || "",
        vatName: row.vatName || supplier.vatName || "",
        vatAmount: num(row.vatAmount),
        itemAmount,
        rcCode: row.rcCode || "",
        rcName: row.rcName || "",
        dateNeeded: today,
        itemSpecs: row.itemSpecs || "",
        rrQty: 0,
        canSupplierId: awardedSupplier?.canSupplierId || "",
        canSupplierDt1Id: row.canSupplierDt1Id || "",
        poLineKey: row.poLineKey || row.poKey || "",
      };
    });

    const summaryMap = new Map();
    detailForPO.forEach((row) => {
      const summaryKey = [
        String(row.itemCode || "").trim().toUpperCase(),
        String(row.invType || "").trim().toUpperCase(),
        String(row.itemSpecs || "").trim().toUpperCase(),
      ].join("||");

      if (!summaryMap.has(summaryKey)) {
        summaryMap.set(summaryKey, {
          summaryKey,
          invType: row.invType || "",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          poQty: 0,
          unitCost: row.unitCost || 0,
          grossAmount: 0,
          discRate: 0,
          discAmount: 0,
          netAmount: 0,
          vatCode: row.vatCode || "",
          vatName: row.vatName || "",
          vatAmount: 0,
          itemAmount: 0,
        });
      }

      const summary = summaryMap.get(summaryKey);
      summary.poQty += num(row.poQty);
      summary.grossAmount += num(row.grossAmount);
      summary.discAmount += num(row.discAmount);
      summary.netAmount += num(row.netAmount);
      summary.vatAmount += num(row.vatAmount);
      summary.itemAmount += num(row.itemAmount);
      summary.unitCost = summary.poQty ? summary.grossAmount / summary.poQty : summary.unitCost;
      summary.discRate = summary.grossAmount ? (summary.discAmount / summary.grossAmount) * 100 : 0;
    });

    const grossTotal = detailForPO.reduce((sum, row) => sum + num(row.grossAmount), 0);
    const discountTotal = detailForPO.reduce((sum, row) => sum + num(row.discAmount), 0);
    const vatTotal = detailForPO.reduce((sum, row) => sum + num(row.vatAmount), 0);
    const poAmount = grossTotal - discountTotal;

    return {
      branchCode: branchCode || "",
      poNo: "",
      poId: "",
      poDate: today,
      rcCode: "",
      vendCode: supplier.supplierCode || selectedSupplierCode || "",
      vendName: supplier.supplierName || selectedSupplierName || "",
      whCode: "",
      whName: "",
      delAddress: "",
      address1: "",
      address2: "",
      address3: "",
      vendContact: "",
      paytermCode: paytermValue,
      poType: "",
      delDate: today,
      currCode: companyInfo?.currCode || "PHP",
      currRate: parseFormattedNumber(companyInfo?.currRate || 1) || 1,
      refPoNo1: "",
      refPoNo2: "",
      refPrNo2: canNo || "",
      poAmount,
      vatAmount: vatTotal,
      discAmount: discountTotal,
      advAmount: 0,
      remarks: [
        `Generated from Canvass ${canNo || ""}`.trim(),
        remarks || "",
      ].filter(Boolean).join("\n"),
      poStatus: "O",
      userCode: currentUserRow?.userCode || userCode || "",
      dt1: detailForPO,
      dt3: Array.from(summaryMap.values()).map((row, index) => ({
        poId: "",
        summaryKey: row.summaryKey || "",
        invType: row.invType || "",
        lnNo: index + 1,
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        itemSpecs: row.itemSpecs || "",
        uomCode: row.uomCode || "",
        poQty: num(row.poQty),
        unitCost: num(row.unitCost),
        grossAmount: num(row.grossAmount),
        discRate: num(row.discRate),
        discAmount: num(row.discAmount),
        netAmount: num(row.netAmount),
        vatCode: row.vatCode || "",
        vatName: row.vatName || "",
        vatAmount: num(row.vatAmount),
        itemAmount: num(row.itemAmount),
      })),
    };
  };

  const extractPOResponseRow = (response) => {
    const unwrapResult = (value) => {
      if (!value) return value;

      if (Array.isArray(value)) return value[0];

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return unwrapResult(parsed);
        } catch {
          return { result: value };
        }
      }

      if (value?.result) return unwrapResult(value.result);
      if (Array.isArray(value?.data)) return value.data[0];
      if (Array.isArray(value?.data?.data)) return value.data.data[0];
      if (value?.data && typeof value.data === "object") return unwrapResult(value.data);

      return value;
    };

    return unwrapResult(response);
  };

  /* ---------------------------------------------------------------------------
     Generate Purchase Order
     ---------------------------------------------------------------------------
     Builds a PO payload from selected, ungenerated awarded-supplier lines and
     calls the existing PO upsert endpoint. After success, each generated line is
     marked back in CAN to prevent duplicate PO generation.
  --------------------------------------------------------------------------- */
  const handleGeneratePO = async () => {
    if (!canId) {
      useSwalInfoAlert("Generate Purchase Order", "Please save the Canvass transaction first.");
      return;
    }

    if (hasGeneratedPO) {
      useSwalInfoAlert(
        "Generate Purchase Order",
        `All available lines already have Purchase Order reference${existingGeneratedPOInfo?.poNo ? ` (${existingGeneratedPOInfo.poNo})` : ""}.`
      );
      return;
    }

    if (String(canStatus || "").toUpperCase() !== "W") {
      useSwalInfoAlert("Generate Purchase Order", "Only awarded Canvass transactions can generate Purchase Order.");
      return;
    }

    if (!awardedSupplier?.canSupplierId) {
      useSwalInfoAlert("Generate Purchase Order", "Awarded supplier must be saved before generating Purchase Order.");
      return;
    }

    if (selectedPORows.length === 0) {
      useSwalInfoAlert("Generate Purchase Order", "Please select at least one awarded item to generate Purchase Order.");
      return;
    }

    const result = await useSwalProceedConfirm(
      "Generate Purchase Order?",
      `Create ${generatedPOCount} Purchase Order${generatedPOCount > 1 ? "s" : ""} using the existing PO save endpoint?`,
      "Generate PO"
    );

    if (!result?.isConfirmed) return;

    updateState({ isLoading: true, showSpinner: true });

    try {
      const rowGroups = [selectedPORows];

      const createdPOs = [];

      for (const rows of rowGroups) {
        const poPayload = buildPurchaseOrderPayload(rows);

        const response = await useTransactionUpsert(
          "PO",
          poPayload,
          () => {},
          "poId",
          "poNo"
        );

        const responseRow = extractPOResponseRow(response);
        const responsePoNo = responseRow?.poNo || "";
        const responsePoId = responseRow?.poId || "";

        if (!responsePoNo && !responsePoId) {
          console.warn("PO upsert completed but no PO number/ID was returned.", response);
        }

        createdPOs.push({
          poNo: responsePoNo,
          poId: responsePoId,
          branchCode: responseRow?.branchCode || branchCode || "",
        });
      }

      const firstPO = createdPOs.find((row) => row?.poNo || row?.poId) || createdPOs[0] || null;
      setGeneratedPOInfo(firstPO);

      if (!firstPO?.poNo && !firstPO?.poId) {
        useSwalErrorAlert(
          "Generate Purchase Order",
          "PO save was called, but the PO endpoint did not return poNo or poId. Please check the PO upsert response in the console/network tab."
        );
        return;
      }

      await callCAN("markPOLinesGenerated", {
        canId,
        canSupplierId: awardedSupplier.canSupplierId,
        poId: firstPO?.poId || "",
        poNo: firstPO?.poNo || "",
        userCode: currentUserRow?.userCode || userCode || "",
        lineRows: selectedPORows.map((row) => ({
          canSupplierDt1Id: row.canSupplierDt1Id || "",
          canDt1Id: row.canDt1Id || "",
          canLn: row.canLn || "",
          poLineKey: row.poLineKey || row.poKey || "",
          prId: row.prId || "",
          prNo: row.prNo || "",
          groupId: row.groupId || "",
          rcCode: row.rcCode || "",
          rcName: row.rcName || "",
          itemCode: row.itemCode || "",
          invType: row.invType || "",
          itemSpecs: row.itemSpecs || "",
          quantity: num(row.quantity),
        })),
      });

      setGeneratedPOInfo(firstPO);

      await fetchCAN({
        canId,
        canNo,
        branchCode,
      });

      await useSwalSuccessAlert(
        "Purchase Order Generated",
        `${createdPOs.length} Purchase Order${createdPOs.length > 1 ? "s" : ""} generated successfully.`
      );
    } catch (error) {
      useSwalErrorAlert(
        "Generate Purchase Order",
        errorMessage(error, "Unable to generate Purchase Order using the existing PO endpoint.")
      );
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  /* ---------------------------------------------------------------------------
     Build CAN upsert payload
     ---------------------------------------------------------------------------
     Converts current screen state into the exact JSON structure expected by
     sproc_PHP_CAN Upsert. Keep field names aligned with the stored procedure.
  --------------------------------------------------------------------------- */
  const buildPayload = (overrides = {}) => {
    const sourceSupplierRows = overrides.supplierRows || supplierRows;
    const sourceSelectedSupplierCode = overrides.selectedSupplierCode ?? selectedSupplierCode;
    const sourceSelectedSupplierName = overrides.selectedSupplierName ?? selectedSupplierName;
    const sourceSelectedOfferAmount = overrides.selectedOfferAmount ?? selectedOfferAmount;

    const sourceRankedSuppliers = sourceSupplierRows
      .map((supplier, index) => ({ ...supplier, originalIndex: index }))
      .filter((supplier) => supplier.supplierCode || supplier.supplierName || num(supplier.netAmount) > 0)
      .sort((a, b) => num(a.netAmount) - num(b.netAmount));

    const sourceLowestSupplierKey = sourceRankedSuppliers[0]
      ? `${sourceRankedSuppliers[0].supplierCode || ""}-${sourceRankedSuppliers[0].originalIndex}`
      : "";

    return {
      canId,
      canNo,
      canDate: toDateInputValue(canDate) || canDate,
      branchCode,
      remarks,
      userCode,
      selectedSupplierCode: sourceSelectedSupplierCode,
      selectedSupplierName: sourceSelectedSupplierName,
      selectedOfferAmount: num(sourceSelectedOfferAmount),

      prRows: prRows.map((row) => ({
        prId: row.prId,
        branchCode: row.branchCode || branchCode,
        prNo: row.prNo,
        prDate: toDateInputValue(row.prDate) || row.prDate || null,
        rcCode: row.rcCode || "",
        rcName: row.rcName || "",
        requestedBy: row.requestedBy || "",
        dateNeeded: toDateInputValue(row.dateNeeded) || row.dateNeeded || null,
      })),

      detailRows: detailRows.map((row, index) => ({
        canLn: index + 1,
        invType: row.invType || "",
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        itemSpecs: row.itemSpecs || "",
        uomCode: row.uomCode || "",
        totalQtyNeeded: num(row.totalQtyNeeded),
        selectedQty: num(row.selectedQty),
        remarks: row.remarks || "",
        prBreakdown: normalizeRows(row.prBreakdown).map((b) => ({
          prId: b.prId,
          prNo: b.prNo,
          prLn: b.prLn,
          prGroupId: b.prGroupId || "",
          branchCode: b.branchCode || branchCode,
          rcCode: b.rcCode || "",
          rcName: b.rcName || "",
          qtyInPr: num(b.qtyInPr),
          includedQty: num(b.includedQty),
          dateNeeded: toDateInputValue(b.dateNeeded) || b.dateNeeded || null,
        })),
      })),

      supplierRows: sourceSupplierRows.map((supplier, supplierIndex) => ({
        supplierCode: supplier.supplierCode || "",
        supplierName: supplier.supplierName || "",
        quoteNo: supplier.quoteNo || "",
        quoteDate: toDateInputValue(supplier.quoteDate) || supplier.quoteDate || null,
        offerDate: toDateInputValue(supplier.offerDate) || supplier.offerDate || null,
        vatCode: supplier.vatCode || "",
        vatName: supplier.vatName || "",
        offerAmount: num(supplier.offerAmount),
        discountAmount: num(supplier.discountAmount),
        vatAmount: num(supplier.vatAmount),
        netAmount: num(supplier.netAmount),
        paymentTerms: supplier.paymentTerms || "",
        deliveryTerms: supplier.deliveryTerms || "",
        deliveryDate: toDateInputValue(supplier.deliveryDate) || supplier.deliveryDate || null,
        isLowestOffer:
          `${supplier.supplierCode || ""}-${supplierIndex}` === sourceLowestSupplierKey &&
          num(supplier.netAmount) > 0,
        isAwarded: Boolean(supplier.isAwarded),
        remarks: supplier.remarks || "",
        poId: supplier.poId || "",
        poNo: supplier.poNo || "",
        poGenerated: Boolean(supplier.poGenerated),
        poGeneratedBy: supplier.poGeneratedBy || "",
        poGeneratedDate: supplier.poGeneratedDate || null,
        detailRows: normalizeRows(supplier.detailRows).map((detail) => ({
          canLn: detail.canLn,
          invType: detail.invType || "",
          itemCode: detail.itemCode || "",
          itemName: detail.itemName || "",
          itemSpecs: detail.itemSpecs || "",
          uomCode: detail.uomCode || "",
          quantity: num(detail.quantity),
          unitPrice: num(detail.unitPrice),
          grossAmount: num(detail.grossAmount),
          discountAmount: num(detail.discountAmount),
          vatCode: detail.vatCode || "",
          vatName: detail.vatName || "",
          vatAmount: num(detail.vatAmount),
          netAmount: num(detail.netAmount),
          isAwardedLine: Boolean(detail.isAwardedLine),
          remarks: detail.remarks || "",
          poId: detail.poId || "",
          poNo: detail.poNo || "",
          poGenerated: Boolean(detail.poGenerated),
          poReferences: normalizeRows(detail.poReferences || detail.poReferenceRows || detail.poRows),
        })),
      })),
    };
  };

  /* ---------------------------------------------------------------------------
     Save Canvass
     ---------------------------------------------------------------------------
     Performs required field validation, upserts CAN, then reloads the saved
     transaction so IDs and computed values come from the database.
  --------------------------------------------------------------------------- */
 const save = async () => {
  const fieldsToCheck = {
    "Header : Branch": branchCode,
    "Header : Canvass Date": canDate,
    "Header : User Code": userCode,
  };

  const isValid = await useSwalvalidateRequiredFields(
    fieldsToCheck,
    "Canvass Validation"
  );

  if (!isValid) return;
  if (isFormDisabled) return;

  if (detailRows.length === 0) {
    return useSwalErrorAlert(
      "Canvass Validation",
      "Please select at least one PR item."
    );
  }

  if (supplierRows.some((s) => !s.supplierCode || !s.supplierName)) {
    return useSwalErrorAlert(
      "Canvass Validation",
      "Supplier Code and Supplier Name are required."
    );
  }

  updateState({ isLoading: true });

  try {
    const data = await callCAN("upsert", buildPayload());
    const responseRow = Array.isArray(data) ? data[0] : data;
    const savedCanId =responseRow?.canId ||  "";
    const savedCanNo = responseRow?.canNo ||  "";

    
    if (!savedCanId && !savedCanNo) {
      useSwalErrorAlert( "Save Canvass", "Canvass was saved but no Canvass ID or Canvass No. was returned." );
      return;
    }

    updateState({
      canId: savedCanId,
      canNo: savedCanNo,
      isLoading: true,
    });

    if (savedCanId) {
      await fetchCAN({ canId: savedCanId });
    } else if (savedCanNo) {
      await fetchCAN({
        canNo: savedCanNo,
        branchCode,
      });
    }

    useSwalshowSaveSuccessDialog(
      handleReset,
      async () => {
        if (savedCanId) {
          await fetchCAN({ canId: savedCanId });
        } else if (savedCanNo) {
          await fetchCAN({
            canNo: savedCanNo,
            branchCode,
          });
        }
      }
    );
  } catch (error) {
    useSwalErrorAlert("Save Canvass", errorMessage(error));
  } finally {
    updateState({ isLoading: false });
  }
};



  const cancel = () => {
    if (!canId || isAwardedOrCancelled) return;
    updateState({ showCancelModal: true });
  };




  const closeCancel = async (confirmation) => {
    if (!confirmation) {
      updateState({ showCancelModal: false });
      return;
    }

    try {
      const result = await useHandleCancel(
        docType,
        canId,
        userCode,
        confirmation.password,
        confirmation.reason,
        updateState
      );

      if (result.success) {
        await useSwalSuccessAlert("Success", "Cancellation Completed");
        await fetchCAN({ canId });
      }
    } catch (error) {
      useSwalErrorAlert("Cancel Canvass", errorMessage(error));
    } finally {
      updateState({ showCancelModal: false });
    }
  };





  const submit = async () => {
    if (!canId) return useSwalInfoAlert("Submit Canvass", "Please save the Canvass transaction first.");

    const result = await useSwalProceedConfirm("Submit Canvass?", "Submit this Canvass transaction for approval?", "Submit");
    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });

    try {
      await callCAN("submit", { canId, userCode, remarks });
      await useSwalSuccessAlert("Submitted", "Canvass transaction has been submitted.");
      await fetchCAN({ canId });
    } catch (error) {
      useSwalErrorAlert("Submit Canvass", errorMessage(error));
    } finally {
      updateState({ isLoading: false });
    }
  };

  const openCanvassAttachment = () => {
    if (!canId) {
      useSwalInfoAlert(
        "Canvass Attachment",
        "Please save the Canvass transaction first before attaching files."
      );
      return;
    }

    setActiveSupplierForAttachment(null);
    updateState({ showAttachModal: true });
  };

  const openAttachment = (supplier) => {
    if (!canId) {
      useSwalInfoAlert(
        "Supplier Attachment",
        "Please save the Canvass transaction first before attaching supplier quotation files."
      );
      return;
    }

    if (!supplier?.canSupplierId) {
      useSwalInfoAlert(
        "Supplier Attachment",
        "Please save this supplier offer first before attaching quotation files."
      );
      return;
    }

    setActiveSupplierForAttachment(supplier);
    updateState({ showAttachModal: true });
  };

  const renderStatusPill = () => {
    const className =
      normalizedDisplayStatus === "CANCELLED"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : normalizedDisplayStatus === "AWARDED"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : normalizedDisplayStatus === "APPROVED"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

    return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{displayStatus}</span>;
  };

  const renderHeader = () => (
    <div className="global-tran-header-ui">
      <div className="global-tran-headertext-div-ui">
        <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
      </div>
      <div className="global-tran-headerstat-div-ui">
        <button
          type="button"
          onClick={() => hasDocument && updateState({ showApprovalStatusModal: true })}
          className="rounded px-1 text-center transition-colors hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
          title="View Approval Status"
          aria-label="View Approval Status"
        >
          <p className="global-tran-headerstat-text-ui">Transaction Status</p>
          <h1 className={`global-tran-stat-text-ui uppercase ${statusTextColor}`}>{displayStatus}</h1>
        </button>
      </div>
    </div>
  );

  const renderCanvassInfoCard = () => (
    <div className="global-tran-header-div-ui">
      <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3" id="can_hd">
        <div className="global-tran-textbox-group-div-ui">
          <FieldRenderer
            id="canBranch"
            label="Branch"
            type="lookup"
            value={branchName || branchCode || ""}
            disabled={isLocked}
            readOnly
            onLookup={() => !isLocked && updateState({ showBranchModal: true })}
          />

          <FieldRenderer
            id="canNo"
            label="Canvass No."
            type="lookup"
            value={canNo || ""}
            disabled={Boolean(canId)}
            onChange={(val) => updateState({ canNo: val })}
            onBlur={handleDocNoBlur}
            onLookup={() => updateState({ showAllTranDocNo: true })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleDocNoBlur();
                e.preventDefault();
              }
            }}
          />

          <FieldRenderer
            id="canDate"
            label="Canvass Date"
            type="date"
            value={toDateInputValue(canDate)}
            disabled={isLocked}
            onChange={(val) => updateState({ canDate: val })}
          />
        </div>

       

        <div className="global-tran-textbox-group-div-ui">
          <FieldRenderer
            id="preparedBy"
            label="Prepared By"
            type="text"
            value={userName || currentUserRow?.userName || userCode || ""}
            disabled
            readOnly
          />

          <FieldRenderer
            id="selectedSupplier"
            label="Selected Supplier"
            type="text"
            value={selectedSupplierName || ""}
            disabled
            readOnly
          />

          <FieldRenderer
            id="selectedOfferAmount"
            label="Selected Offer Amount"
            type="amount"
            value={selectedOfferAmount || "0.00"}
            disabled
            readOnly
          />
        </div>

        <div className="global-tran-textbox-group-div-ui">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["PR Count", totals.prCount],
              ["Items", totals.itemCount],
              ["Suppliers", totals.supplierCount],
              ["Total Quantity", totals.totalQty],
              ["Best Offer", totals.bestOffer],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                <div className="text-[9px] font-semibold tracking-wide text-slate-500">{label}</div>
                <div className="mt-1 text-sm text-right text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-full">
          <div className="relative">
            <textarea
              id="canRemarks"
              placeholder=""
              rows={4}
              className="peer global-tran-textbox-remarks-ui pt-2"
              value={remarks || ""}
              onChange={(e) => updateState({ remarks: e.target.value })}
              disabled={isLocked}
            />
            <label htmlFor="canRemarks" className="global-tran-floating-label-remarks">
              Remarks
            </label>
          </div>
        </div>

      </div>
    </div>
  );

  const tabButton = (key, label, count) => (
    <button
      type="button"
      onClick={() => updateState({ activeTab: key })}
      className={`rounded-t-xl border px-4 py-2 text-xs font-semibold ${
        activeTab === key
          ? "border-blue-200 bg-white text-blue-700 shadow-sm"
          : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {label} <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5">{count}</span>
    </button>
  );

  const renderPrSelection = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">Select Approved PR</h2>
          <p className="text-xs text-slate-500">Select multiple PRs. Common items will be consolidated automatically.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadOpenPR}
            disabled={isLocked}
            className={compactActionButtonClass}
          >
            <FontAwesomeIcon icon={faListCheck} />
            <span>Load Open PR</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSelectedPR}
            disabled={isLocked || selectedPrIds.length === 0}
            className={compactActionButtonClass}
          >
            <FontAwesomeIcon icon={faClipboardList} />
            <span>Load Selected PR</span>
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-xl border">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th className="w-12 px-2 py-2 text-center">Select</th>
              <th className="px-2 py-2 text-left">PR No.</th>
              <th className="px-2 py-2 text-left">PR Date</th>
              <th className="px-2 py-2 text-left">RC</th>
              <th className="px-2 py-2 text-left">Requested By</th>
              <th className="px-2 py-2 text-right">Items</th>
              <th className="px-2 py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {openPrRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">No open PR records found.</td>
              </tr>
            ) : (
              openPrRows.map((row) => (
                <tr key={row.prId} className="border-t hover:bg-blue-50/40">
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedPrIds.includes(String(row.prId))}
                      onChange={() =>
                        setSelectedPrIds((prev) =>
                          prev.includes(String(row.prId))
                            ? prev.filter((id) => id !== String(row.prId))
                            : [...prev, String(row.prId)]
                        )
                      }
                      disabled={isLocked}
                    />
                  </td>
                  <td className="px-2 py-2 font-semibold text-blue-700">{row.prNo}</td>
                  <td className="px-2 py-2">{safeDate(row.prDate)}</td>
                  <td className="px-2 py-2">{row.rcName || row.rcCode}</td>
                  <td className="px-2 py-2">{row.requestedBy}</td>
                  <td className="px-2 py-2 text-right">{row.totalItems}</td>
                  <td className="px-2 py-2 text-right">{qty(row.totalQty, decQty)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderItems = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-slate-700">Consolidated Items</h2>
      <p className="mb-3 text-xs text-slate-500">Click the arrow to view PR breakdown per item.</p>

      <div className="overflow-auto rounded-xl border">
        <table className="min-w-[980px] w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="w-10 px-2 py-2"></th>
              <th className="w-16 px-2 py-2 text-center">LN</th>
              <th className="px-2 py-2 text-left">Item Code</th>
              <th className="px-2 py-2 text-left">Item Name</th>
              <th className="px-2 py-2 text-left">Specification</th>
              <th className="w-24 px-2 py-2 text-left">UOM</th>
              <th className="w-32 px-2 py-2 text-right">Total Qty</th>
              <th className="w-32 px-2 py-2 text-right">Selected Qty</th>
              <th className="w-24 px-2 py-2 text-center">PR Count</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">No items loaded. Select PR first.</td>
              </tr>
            ) : (
              detailRows.map((row, index) => (
                <Fragment key={row.canLn || index}>
                  <tr key={row.canLn} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => setExpandedItemLn(expandedItemLn === row.canLn ? null : row.canLn)}>
                        <FontAwesomeIcon icon={expandedItemLn === row.canLn ? faChevronDown : faChevronRight} />
                      </button>
                    </td>
                    <td className="px-2 py-2 text-center">{index + 1}</td>
                    <td className="px-2 py-2 font-semibold">{row.itemCode}</td>
                    <td className="px-2 py-2">{row.itemName}</td>
                    <td className="px-2 py-2">{row.itemSpecs}</td>
                    <td className="px-2 py-2">{row.uomCode}</td>
                    <td className="px-2 py-2 text-right">{qty(row.totalQtyNeeded, decQty)}</td>
                    <td className="px-2 py-2">
                      <input
                        className="w-full rounded border px-2 py-1 text-right"
                        value={row.selectedQty || ""}
                        onChange={(e) => {
                          const rows = [...detailRows];
                          rows[index] = { ...rows[index], selectedQty: e.target.value };
                          updateState({ detailRows: rows });
                        }}
                        onBlur={(e) => {
                          const rows = [...detailRows];
                          rows[index] = { ...rows[index], selectedQty: qty(e.target.value, decQty) };
                          updateState({ detailRows: rows });
                        }}
                        readOnly={isLocked}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">{normalizeRows(row.prBreakdown).length}</td>
                  </tr>

                  {expandedItemLn === row.canLn && (
                    <tr className="bg-slate-50">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="rounded-xl border bg-white p-3">
                          <div className="mb-2 text-xs font-bold">PR Breakdown</div>
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-2 py-1 text-left">PR No.</th>
                                <th className="px-2 py-1 text-left">RC</th>
                                <th className="px-2 py-1 text-right">PR Qty</th>
                                <th className="px-2 py-1 text-right">Included Qty</th>
                                <th className="px-2 py-1 text-left">Date Needed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {normalizeRows(row.prBreakdown).map((b, bIndex) => (
                                <tr key={`${b.prId}-${bIndex}`} className="border-t">
                                  <td className="px-2 py-1">{b.prNo}</td>
                                  <td className="px-2 py-1">{b.rcName || b.rcCode}</td>
                                  <td className="px-2 py-1 text-right">{qty(b.qtyInPr, decQty)}</td>
                                  <td className="px-2 py-1 text-right">{qty(b.includedQty, decQty)}</td>
                                  <td className="px-2 py-1">{safeDate(b.dateNeeded)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSuppliers = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">Supplier Offers</h2>
          <p className="text-xs text-slate-500">Attach files per supplier after saving the Canvass.</p>
        </div>
        <button
          type="button"
          onClick={addSupplier}
          disabled={isLocked || detailRows.length === 0}
          className={compactActionButtonClass}
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Add Supplier</span>
        </button>
      </div>

      {supplierRows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No supplier offer added yet.</div>
      ) : (
        <div className="space-y-4">
          {supplierRows.map((supplier, supplierIndex) => {
            const isAwarded = supplier.isAwarded || (supplier.supplierCode && supplier.supplierCode === selectedSupplierCode); // Check if this supplier is the awarded one
            const isLowest = `${supplier.supplierCode || ""}-${supplierIndex}` === lowestSupplierKey && num(supplier.netAmount) > 0; // Check if this supplier has the lowest offer
            return (
              <div key={`${supplier.supplierCode}-${supplierIndex}`} className={`rounded-2xl border ${isAwarded ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"}`}> {/* Outer container for each supplier's card */}
                <div className="flex flex-wrap items-start justify-between gap-3 p-4"> {/* Header of the supplier card */}
                  <button type="button" onClick={() => updateState({ activeSupplierIndex: supplierIndex })} className="flex items-center gap-2 text-left">
                    <FontAwesomeIcon icon={activeSupplierIndex === supplierIndex ? faChevronDown : faChevronRight} />
                    <div>
                      <div className="text-sm font-bold">
                        {supplier.supplierName || "New Supplier Offer"}
                        {isAwarded && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">AWARDED</span>}
                      </div>
                      <div className="text-xs text-slate-500">Net Amount: <span className="font-bold">{money(supplier.netAmount)}</span></div>
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openAttachment(supplier)} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"> {/* Attachments button */}
                      <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                      Attachments ({normalizeRows(supplier.attachments).length})
                    </button>
                    <button type="button" onClick={() => awardSupplier(supplier)} disabled={isAwardedOrCancelled || isLocked || !supplier?.canSupplierId} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50" title="Award Transaction"> {/* Award button */}
                      <FontAwesomeIcon icon={faTrophy} className="mr-1" />
                    </button>
                    {!isLocked && (
                      <button type="button" onClick={() => removeSupplier(supplierIndex)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-50" title="Remove Offer"> {/* Remove button */}
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    )}
                  </div>
                </div>

                {activeSupplierIndex === supplierIndex && ( /* This is the expanded content for the active supplier */
                  <div className="border-t border-slate-200 p-4">
                    {/* Offer Info Section */}
                    <div className="mb-6 rounded-lg bg-slate-50 p-4 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Offer Information</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Supplier Lookup Field */}
                        <FieldRenderer
                          id={`supplier-code-${supplierIndex}`}
                          name={`supplierCode-${supplierIndex}`}
                          label="Supplier Code"
                          type="lookup"
                          value={supplier.supplierCode || ""}
                          onLookup={() => openSupplierLookup(supplierIndex)}
                          onClear={() => updateSupplier(supplierIndex, "supplierCode", "")}
                          disabled={isLocked}
                          placeholder="Search supplier..."
                        />

                        {/* Supplier Name - Read Only Display */}
                        <FieldRenderer
                          id={`supplier-name-${supplierIndex}`}
                          label="Supplier Name"
                          type="text"
                          value={supplier.supplierName || ""}
                          disabled={true}
                        />

                        {/* Quote No */}
                        <FieldRenderer
                          id={`quote-no-${supplierIndex}`}
                          name={`quoteNo-${supplierIndex}`}
                          label="Quote No."
                          type="text"
                          value={supplier.quoteNo || ""}
                          onChange={(val) => updateSupplier(supplierIndex, "quoteNo", val)}
                          disabled={isLocked}
                        />

                        <FieldRenderer
                          id={`quote-date-${supplierIndex}`}
                          label="Quote Date"
                          type="date"
                          value={toDateInputValue(supplier.quoteDate)}
                          disabled={isLocked}
                          onChange={(val) => updateSupplier(supplierIndex, "quoteDate", val)}
                        />

                        <FieldRenderer
                          id={`offer-date-${supplierIndex}`}
                          label="Offer Date"
                          type="date"
                          value={toDateInputValue(supplier.offerDate)}
                          disabled={isLocked}
                          onChange={(val) => updateSupplier(supplierIndex, "offerDate", val)}
                        />

                        <FieldRenderer
                          id={`delivery-date-${supplierIndex}`}
                          label="Delivery Date"
                          type="date"
                          value={toDateInputValue(supplier.deliveryDate)}
                          disabled={isLocked}
                          onChange={(val) => updateSupplier(supplierIndex, "deliveryDate", val)}
                        />

                        {/* Payment Terms Lookup */}
                        <FieldRenderer
                          id={`payment-terms-${supplierIndex}`}
                          label="Payment Terms"
                          type="lookup"
                          value={supplier.paymentTerms || ""}
                          onLookup={() => openPaytermLookup(supplierIndex)}
                          onClear={() => updateSupplier(supplierIndex, "paymentTerms", "")}
                          disabled={isLocked}
                        />

                        <FieldRenderer
                          id={`delivery-terms-${supplierIndex}`}
                          name={`deliveryTerms-${supplierIndex}`}
                          label="Delivery Terms"
                          type="text"
                          value={supplier.deliveryTerms || ""}
                          onChange={(val) => updateSupplier(supplierIndex, "deliveryTerms", val)}
                          disabled={isLocked}
                        />

                        <div />
                        <div />
                        <div />
                        <FieldRenderer
                          id={`total-amount-display-${supplierIndex}`}
                          label="Total Offer Amount"
                          type="amount"
                          value={`PHP ${money(supplier.netAmount)}`}
                          disabled={true}
                          readOnly
                        />

                        <div className="col-span-full mt-2">
                          <div className="relative">
                            <textarea
                              id={`supplier-remarks-${supplierIndex}`}
                              placeholder=""
                              rows={3}
                              className="peer global-tran-textbox-remarks-ui pt-2"
                              value={supplier.remarks || ""}
                              onChange={(e) => updateSupplier(supplierIndex, "remarks", e.target.value)}
                              disabled={isLocked}
                            />
                            <label htmlFor={`supplier-remarks-${supplierIndex}`} className="global-tran-floating-label-remarks">
                              Supplier Remarks
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                {activeSupplierIndex === supplierIndex && (
                  <div className="global-tran-table-main-div-ui mt-4">
                    <div className="global-tran-table-main-sub-div-ui">
                      <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                        <thead className="global-tran-thead-div-ui">
                          <tr>
                            <th className="global-tran-th-ui text-center w-[50px]">LN</th>
                            <th className="global-tran-th-ui text-left w-[250px]">Item</th>
                            <th className="global-tran-th-ui text-left w-[80px]">UOM</th>
                            <th className="global-tran-th-ui text-right w-[100px]">Qty</th>
                            <th className="global-tran-th-ui text-right w-[120px]">Unit Price</th>
                            <th className="global-tran-th-ui text-left w-[100px]">VAT Code</th>
                            <th className="global-tran-th-ui text-right w-[130px]">Gross Amount</th>
                            <th className="global-tran-th-ui text-right w-[130px]">Discount Amount</th>
                            <th className="global-tran-th-ui text-right w-[130px]">VAT Amount</th>
                            <th className="global-tran-th-ui text-right w-[130px]">Net Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {normalizeRows(supplier.detailRows).map((row, detailIndex) => (
                            <tr key={`${supplierIndex}-${row.canLn}`} className="global-tran-tr-ui">
                              <td className="global-tran-td-ui text-center">{detailIndex + 1}</td>
                              <td className="global-tran-td-ui">
                                <div className="font-semibold">{row.itemCode}</div>
                                <div className="text-slate-500">{row.itemName}</div>
                              </td>
                              <td className="global-tran-td-ui">{row.uomCode}</td>
                              {["quantity", "unitPrice", "discountAmount", "vatAmount"].map((field) => (
                                <td key={field} className="global-tran-td-ui text-right">
                                  <input
                                    className="w-full global-tran-td-inputclass-ui text-right"
                                    value={row[field] || ""}
                                    onChange={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, e.target.value)}
                                    onBlur={(e) => updateSupplierDetail(supplierIndex, detailIndex, field, field === "quantity" || field === "unitPrice" ? qty(e.target.value, 6) : money(e.target.value), true)}
                                    readOnly={isLocked}
                                  />
                                </td>
                              ))}
                              <td className="global-tran-td-ui">
                                <input
                                  className="w-full global-tran-td-inputclass-ui"
                                  value={row.vatCode || ""}
                                  onChange={(e) => updateSupplierDetail(supplierIndex, detailIndex, "vatCode", e.target.value)}
                                  readOnly={isLocked}
                                />
                              </td>
                              <td className="global-tran-td-ui text-right">{money(row.grossAmount)}</td>
                              <td className="global-tran-td-ui text-right font-bold">{money(row.netAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold">
                          <tr>
                            <td colSpan={6} className="global-tran-td-ui text-right border-l">Total</td>
                            <td className="global-tran-td-ui text-right">{money(supplier.offerAmount)}</td>
                            <td className="global-tran-td-ui text-right">{money(supplier.discountAmount)}</td>
                            <td className="global-tran-td-ui text-right">{money(supplier.vatAmount)}</td>
                            <td className="global-tran-td-ui text-right">{money(supplier.netAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {normalizeRows(supplier.attachments).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {normalizeRows(supplier.attachments).map((file) => (
                      <span key={file.fileId} className="rounded-full border bg-slate-50 px-3 py-1 text-xs">
                        <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                        {file.fileName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderGeneratePOSection = () => {
    const canGeneratePO =
      Boolean(canId) &&
      String(canStatus || "").toUpperCase() === "W" &&
      Boolean(awardedSupplier?.canSupplierId) &&
      poCandidateRows.length > 0;
    const selectedKeys = activePOSelectedKeys;
    const poStatusText = generatedPONoList.length > 0
      ? `Generated - ${generatedPONoList.join(", ")}`
      : "Ready to Generate";
    const detailTotals = selectedPORows.reduce(
      (total, row) => ({
        quantity: total.quantity + num(row.quantity),
        grossAmount: total.grossAmount + num(row.grossAmount),
        discountAmount: total.discountAmount + num(row.discountAmount),
        vatAmount: total.vatAmount + num(row.vatAmount),
        netAmount: total.netAmount + num(row.netAmount),
      }),
      { quantity: 0, grossAmount: 0, discountAmount: 0, vatAmount: 0, netAmount: 0 }
    );
    const summaryTotals = poSummaryRows.reduce(
      (total, row) => ({
        quantity: total.quantity + num(row.quantity),
        grossAmount: total.grossAmount + num(row.grossAmount),
        discountAmount: total.discountAmount + num(row.discountAmount),
        vatAmount: total.vatAmount + num(row.vatAmount),
        netAmount: total.netAmount + num(row.netAmount),
      }),
      { quantity: 0, grossAmount: 0, discountAmount: 0, vatAmount: 0, netAmount: 0 }
    );
    const generatePODetailViewColumn = orderedGeneratePODetailColumns.find((column) => column.key === "viewPO");
    const generatePODetailDataColumns = orderedGeneratePODetailColumns.filter((column) => column.key !== "viewPO");

    const renderGeneratePODetailValue = (row, key, index) => {
      if (key === "poNo") return row.poNo || row.poId || "For PO";
      if (key === "ln") return index + 1;
      if (["quantity"].includes(key)) return qty(row[key], decQty);
      if (["unitPrice"].includes(key)) return qty(row[key], decUPrice);
      if (["grossAmount", "discountAmount", "vatAmount", "netAmount"].includes(key)) return money(row[key]);
      return row[key] || "";
    };

    const renderGeneratePOSummaryValue = (row, key, index) => {
      if (key === "ln") return index + 1;
      if (["quantity"].includes(key)) return qty(row[key], decQty);
      if (["unitPrice"].includes(key)) return qty(row[key], decUPrice);
      if (["grossAmount", "discountAmount", "vatAmount", "netAmount"].includes(key)) return money(row[key]);
      return row[key] || "";
    };

    const renderGeneratePODetailCell = (columnKey, row, originalIndex) => {
      const fallbackWidth = getGeneratePODetailFallbackWidth(columnKey);
      const style = getGeneratePODetailCellStyle(columnKey, fallbackWidth);
      const textValue = (value, className = "") => (
        <td key={columnKey} className={`global-tran-td-ui h-8 ${className}`.trim()} style={style}>
          <input
            className={`w-full min-h-[28px] global-tran-td-inputclass-ui ${className.includes("text-right") ? "text-right" : ""}`.trim()}
            value={value || ""}
            readOnly
          />
        </td>
      );

      if (columnKey === "viewPO") {
        const hasReference = Boolean(row.poNo || row.poId);
        return (
          <td key={columnKey} className="global-tran-td-ui h-8 text-center" style={style}>
            {hasReference && (
              <button
                type="button"
                onClick={() => viewGeneratedPO({ poNo: row.poNo, poId: row.poId, branchCode })}
                className="inline-flex h-5 w-8 items-center justify-center rounded bg-blue-500 text-white shadow-sm hover:bg-blue-600"
                title="View generated Purchase Order"
              >
                <FontAwesomeIcon icon={faEye} className="text-[10px]" />
              </button>
            )}
          </td>
        );
      }

      const rightColumns = ["quantity", "unitPrice", "grossAmount", "discountAmount", "vatAmount", "netAmount"];
      const centerColumns = ["ln"];
      const className = rightColumns.includes(columnKey) ? "text-right" : centerColumns.includes(columnKey) ? "text-center" : "";
      return textValue(renderGeneratePODetailValue(row, columnKey, originalIndex), className);
    };

    const renderGeneratePOSummaryCell = (columnKey, row, originalIndex) => {
      const fallbackWidth = getGeneratePOSummaryFallbackWidth(columnKey);
      const style = getGeneratePOSummaryCellStyle(columnKey, fallbackWidth);
      const rightColumns = ["quantity", "unitPrice", "grossAmount", "discountAmount", "vatAmount", "netAmount"];
      const centerColumns = ["ln"];
      const className = rightColumns.includes(columnKey) ? "text-right" : centerColumns.includes(columnKey) ? "text-center" : "";

      return (
        <td key={columnKey} className={`global-tran-td-ui h-8 ${className}`.trim()} style={style}>
          <input
            className={`w-full min-h-[28px] global-tran-td-inputclass-ui ${className.includes("text-right") ? "text-right" : ""}`.trim()}
            value={renderGeneratePOSummaryValue(row, columnKey, originalIndex) || ""}
            readOnly
          />
        </td>
      );
    };

    return (
      <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Generate Purchase Order</h2>
            <p className="text-xs text-slate-500">Item Details are split per PR No.; Item Summary appears only when grouping is needed.</p>
          </div>
        </div>

        {!canId ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">Save the Canvass before generating Purchase Order.</div>
        ) : String(canStatus || "").toUpperCase() !== "W" ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">Award a supplier first before generating Purchase Order.</div>
        ) : !awardedSupplier ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">No awarded supplier found.</div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Awarded Supplier</div>
                <div className="mt-1 truncate text-slate-800" title={awardedSupplier.supplierName || awardedSupplier.supplierCode}>
                  {awardedSupplier.supplierName || awardedSupplier.supplierCode || "-"}
                </div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Selected Offer Amount</div>
                <div className="mt-1 text-right text-slate-800">{money(selectedOfferAmount || awardedSupplier.netAmount)}</div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">PO Status</div>
                <div className={`mt-1 rounded px-2 py-1 text-center ${generatedPONoList.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  {poStatusText}
                </div>
              </div>
            </div>

            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setGeneratePOActiveTab("details")}
                className={`rounded-t-xl border px-4 py-2 text-xs font-semibold ${generatePOActiveTab === "details" ? "border-blue-200 bg-white text-blue-700" : "border-transparent bg-slate-100 text-slate-500"}`}
              >
                Item Details <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5">{poAllDetailRows.length}</span>
              </button>
              {showGeneratePOSummary && (
                <button
                  type="button"
                  onClick={() => setGeneratePOActiveTab("summary")}
                  className={`rounded-t-xl border px-4 py-2 text-xs font-semibold ${generatePOActiveTab === "summary" ? "border-blue-200 bg-white text-blue-700" : "border-transparent bg-slate-100 text-slate-500"}`}
                >
                  Item Summary <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5">{poSummaryRows.length}</span>
                </button>
              )}
            </div>

            {generatePOActiveTab === "details" || !showGeneratePOSummary ? (
              <div className="global-tran-table-main-div-ui max-h-[460px]">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui sticky top-0 z-10">
                      <tr>
                        {generatePODetailViewColumn && renderGeneratePODetailHeader(
                          generatePODetailViewColumn.label,
                          generatePODetailViewColumn.key,
                          generatePODetailViewColumn.width,
                          { orderedColumns: orderedGeneratePODetailColumns }
                        )}
                        <th className="global-tran-th-ui text-center" style={{ width: 54, minWidth: 54 }}>
                          <input
                            type="checkbox"
                            checked={poCandidateRows.length > 0 && selectedKeys.length === poCandidateRows.length}
                            onChange={toggleAllPOItemSelection}
                            disabled={!canGeneratePO || isLoading || poCandidateRows.length === 0}
                          />
                        </th>
                        {generatePODetailDataColumns.map((column) =>
                          renderGeneratePODetailHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedGeneratePODetailColumns,
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {poAllDetailRows.length === 0 ? (
                        <tr className="global-tran-tr-ui">
                          <td colSpan={orderedGeneratePODetailColumns.length + 1} className="global-tran-td-ui text-center text-slate-500">
                            No awarded item lines available.
                          </td>
                        </tr>
                      ) : (
                        sortedGeneratePODetailRows.map(({ row, originalIndex }) => (
                          <tr key={`generate-po-detail-${row.poKey || originalIndex}`} className="global-tran-tr-ui">
                            {generatePODetailViewColumn && renderGeneratePODetailCell(generatePODetailViewColumn.key, row, originalIndex)}
                            <td className="global-tran-td-ui text-center" style={{ width: 54, minWidth: 54 }}>
                              <input
                                type="checkbox"
                                checked={!row.poNo && !row.poId && selectedKeys.includes(row.poKey)}
                                onChange={() => togglePOItemSelection(row.poKey)}
                                disabled={!canGeneratePO || isLoading || Boolean(row.poNo || row.poId || row.poGenerated)}
                              />
                            </td>
                            {generatePODetailDataColumns.map((column) => renderGeneratePODetailCell(column.key, row, originalIndex))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-slate-50 font-bold z-10">
                      <tr className="h-8 bg-slate-100">
                        <td colSpan={10} className="global-tran-td-ui text-right border-l py-1">Total</td>
                        <td className="global-tran-td-ui text-right py-1">{qty(detailTotals.quantity, decQty)}</td>
                        <td className="global-tran-td-ui py-1" />
                        <td className="global-tran-td-ui text-right py-1">{money(detailTotals.grossAmount)}</td>
                        <td className="global-tran-td-ui text-right py-1">{money(detailTotals.discountAmount)}</td>
                        <td className="global-tran-td-ui py-1" />
                        <td className="global-tran-td-ui text-right py-1">{money(detailTotals.vatAmount)}</td>
                        <td className="global-tran-td-ui text-right py-1">{money(detailTotals.netAmount)}</td>
                        <td className="global-tran-td-ui py-1" />
                        <td className="global-tran-td-ui py-1" />
                      </tr>
                    </tfoot>
                  </table>
                  {renderGeneratePODetailHeaderContextMenu?.()}
                </div>
              </div>
            ) : (
              <div className="global-tran-table-main-div-ui max-h-[460px]">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui sticky top-0 z-10">
                      <tr>
                        {orderedGeneratePOSummaryColumns.map((column) =>
                          renderGeneratePOSummaryHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedGeneratePOSummaryColumns,
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {poSummaryRows.length === 0 ? (
                        <tr className="global-tran-tr-ui">
                          <td colSpan={orderedGeneratePOSummaryColumns.length} className="global-tran-td-ui text-center text-slate-500">
                            No summary lines available.
                          </td>
                        </tr>
                      ) : (
                        sortedGeneratePOSummaryRows.map(({ row, originalIndex }) => (
                          <tr key={`generate-po-summary-${row.poKey || originalIndex}`} className="global-tran-tr-ui">
                            {orderedGeneratePOSummaryColumns.map((column) => renderGeneratePOSummaryCell(column.key, row, originalIndex))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-slate-50 font-bold z-10">
                      <tr className="h-8 bg-slate-100">
                        <td colSpan={6} className="global-tran-td-ui text-right border-l py-1">Total</td>
                        <td className="global-tran-td-ui text-right py-1">{qty(summaryTotals.quantity, decQty)}</td>
                        <td className="global-tran-td-ui py-1" />
                        <td className="global-tran-td-ui text-right py-1">{money(summaryTotals.grossAmount)}</td>
                        <td className="global-tran-td-ui text-right py-1">{money(summaryTotals.discountAmount)}</td>
                        <td className="global-tran-td-ui py-1" />
                        <td className="global-tran-td-ui text-right py-1">{money(summaryTotals.vatAmount)}</td>
                        <td className="global-tran-td-ui text-right py-1">{money(summaryTotals.netAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {renderGeneratePOSummaryHeaderContextMenu?.()}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-slate-50 px-4 py-2 text-center">
                  <div className="text-lg font-bold text-slate-800">{hasGeneratedPO ? 0 : generatedPOCount}</div>
                  <div className="text-slate-500">PO(s) to create</div>
                </div>
                <div className="rounded-lg border bg-slate-50 px-4 py-2 text-center">
                  <div className="text-lg font-bold text-slate-800">{selectedPORows.length}</div>
                  <div className="text-slate-500">Detail line(s)</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePO}
                disabled={!canGeneratePO || selectedPORows.length === 0 || poCandidateRows.length === 0 || isLoading}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {poCandidateRows.length === 0 && poAllDetailRows.length > 0 ? "All Lines Generated" : hasGeneratedPO ? "PO Generated" : "Generate PO"}
              </button>
            </div>
          </>
        )}
      </section>
    );
  };

  const renderStatusHistory = () => (
    <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-700">Status History</h2>
      {statusHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No status history yet.</div>
      ) : (
        <div className="space-y-3">
          {statusHistory.map((row, index) => (
            <div key={row.canStatusHistId || index} className="flex gap-3 rounded-xl border p-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</div>
              <div>
                <div className="text-sm font-bold">{cleanDisplayText(row.statusName)}</div>
                <div className="text-xs text-slate-500">
                  {getStatusHistoryActionName(row)} • {safeDate(row.actionDate)}
                </div>
                {row.remarks && <div className="mt-1 whitespace-pre-wrap text-xs">{cleanDisplayText(row.remarks)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );


  /* ---------------------------------------------------------------------------
     Supplier comparison modal data
     ---------------------------------------------------------------------------
     Pivots canvass items into rows and suppliers into columns so users can
     compare offers per item. Lowest cost is identified in blue.
  --------------------------------------------------------------------------- */
  const supplierCompareRows = useMemo(() => {
    return normalizeRows(detailRows).map((item, index) => {
      const itemKey = [
        String(item?.canLn || index + 1),
        String(item?.invType || "").trim().toUpperCase(),
        String(item?.itemCode || "").trim().toUpperCase(),
        String(item?.itemSpecs || "").trim().toUpperCase(),
      ].join("||");

      const offers = normalizeRows(supplierRows).map((supplier) => {
        const supplierDetails = normalizeRows(supplier?.detailRows);
        const matchedDetail =
          supplierDetails.find((detail) => String(detail?.canLn || "") === String(item?.canLn || "")) ||
          supplierDetails.find(
            (detail) =>
              String(detail?.invType || "").trim().toUpperCase() === String(item?.invType || "").trim().toUpperCase() &&
              String(detail?.itemCode || "").trim().toUpperCase() === String(item?.itemCode || "").trim().toUpperCase() &&
              String(detail?.itemSpecs || "").trim().toUpperCase() === String(item?.itemSpecs || "").trim().toUpperCase()
          );

        return {
          supplierCode: supplier?.supplierCode || "",
          supplierName: supplier?.supplierName || supplier?.supplierCode || "Unnamed Supplier",
          isAwarded: Boolean(supplier?.isAwarded),
          unitPrice: num(matchedDetail?.unitPrice),
          netAmount: num(matchedDetail?.netAmount),
          grossAmount: num(matchedDetail?.grossAmount),
          hasOffer: Boolean(matchedDetail) && (num(matchedDetail?.unitPrice) > 0 || num(matchedDetail?.netAmount) > 0),
        };
      });

      const validOffers = offers.filter((offer) => offer.hasOffer && offer.unitPrice > 0);
      const lowestUnitPrice = validOffers.length ? Math.min(...validOffers.map((offer) => offer.unitPrice)) : 0;

      return {
        itemKey,
        ln: index + 1,
        invType: item?.invType || "",
        itemCode: item?.itemCode || "",
        itemName: item?.itemName || "",
        itemSpecs: item?.itemSpecs || "",
        uomCode: item?.uomCode || "",
        quantity: num(item?.selectedQty || item?.totalQtyNeeded),
        offers,
        lowestUnitPrice,
      };
    });
  }, [detailRows, supplierRows]);

  const supplierCompareTotals = useMemo(() => {
    return normalizeRows(supplierRows).map((supplier) => {
      const supplierName = supplier?.supplierName || supplier?.supplierCode || "Unnamed Supplier";
      const totalNet = supplierCompareRows.reduce((sum, row) => {
        const offer = row.offers.find((x) => x.supplierName === supplierName);
        return sum + num(offer?.netAmount);
      }, 0);

      return {
        supplierCode: supplier?.supplierCode || "",
        supplierName,
        isAwarded: Boolean(supplier?.isAwarded),
        totalNet,
      };
    });
  }, [supplierRows, supplierCompareRows]);

  const supplierCompareDisplaySuppliers = useMemo(
    () =>
      normalizeRows(supplierRows).filter(
        (supplier) => supplier?.supplierCode || supplier?.supplierName || normalizeRows(supplier?.detailRows).length > 0
      ),
    [supplierRows]
  );

  const supplierCompareColumnDefs = useMemo(() => {
    const baseColumns = [
      { key: "ln", label: "LN", width: 54 },
      { key: "invType", label: "Type", width: 78 },
      { key: "itemCode", label: "Item Code", width: 130 },
      { key: "itemName", label: "Item Name", width: 250 },
      { key: "itemSpecs", label: "Specification", width: 220 },
      { key: "uomCode", label: "UOM", width: 68 },
      { key: "quantity", label: "Quantity", width: 98 },
    ];

    const supplierColumns = supplierCompareDisplaySuppliers
      .flatMap((_supplier, index) => {
        const supplierKey = index + 1;
        const supplierLabel = `S${index + 1}`;
        return [
          { key: `supplier-${supplierKey}-offer`, label: `${supplierLabel} Offer`, width: 92 },
          { key: `supplier-${supplierKey}-net`, label: `${supplierLabel} Net`, width: 108 },
        ];
      });

    return [...baseColumns, ...supplierColumns];
  }, [supplierCompareDisplaySuppliers]);

  const {
    getColumnStyle: getSupplierCompareColumnStyle,
    getFrozenColumnStyle: getSupplierCompareFrozenStyle,
    getOrderedColumns: getOrderedSupplierCompareColumns,
    getSortedRows: getSortedSupplierCompareRows,
    renderHeaderContextMenu: renderSupplierCompareHeaderContextMenu,
    renderResizableHeader: renderSupplierCompareHeader,
    handleBodyContextMenu: handleSupplierCompareBodyContextMenu,
    setFrozenColumnKeys: setSupplierCompareFrozenColumnKeys,
  } = useResizableTableColumns(supplierCompareColumnDefs);
  const orderedSupplierCompareColumns = getOrderedSupplierCompareColumns(supplierCompareColumnDefs);
  useEffect(() => {
    const stickyCompareColumns = ["ln", "invType", "itemCode", "itemName"];
    setSupplierCompareFrozenColumnKeys((prev) => {
      const availableKeys = new Set(supplierCompareColumnDefs.map((column) => column.key));
      const next = [
        ...stickyCompareColumns.filter((key) => availableKeys.has(key)),
        ...prev.filter((key) => availableKeys.has(key) && !stickyCompareColumns.includes(key)),
      ];

      return next.length === prev.length && next.every((key, index) => key === prev[index]) ? prev : next;
    });
  }, [setSupplierCompareFrozenColumnKeys, supplierCompareColumnDefs]);
  const getSupplierCompareFallbackWidth = (key) =>
    supplierCompareColumnDefs.find((column) => column.key === key)?.width || 110;
  const getSupplierCompareCellStyle = (key, fallbackWidth) => ({
    ...getSupplierCompareColumnStyle(key, fallbackWidth),
    ...getSupplierCompareFrozenStyle(key, orderedSupplierCompareColumns, fallbackWidth, { isHeader: false }),
  });
  const getSupplierCompareOfferByColumn = (row, columnKey) => {
    const match = String(columnKey || "").match(/^supplier-(\d+)-(offer|net)$/);
    if (!match) return {};

    const supplier = supplierCompareDisplaySuppliers[Number(match[1]) - 1];
    const supplierName = supplier?.supplierName || supplier?.supplierCode || "Unnamed Supplier";
    return row.offers.find((offer) => offer.supplierName === supplierName || offer.supplierCode === supplier?.supplierCode) || {};
  };
  const getSupplierCompareTotalByColumn = (columnKey) => {
    const match = String(columnKey || "").match(/^supplier-(\d+)-net$/);
    if (!match) return {};

    const supplier = supplierCompareDisplaySuppliers[Number(match[1]) - 1];
    const supplierName = supplier?.supplierName || supplier?.supplierCode || "Unnamed Supplier";
    return supplierCompareTotals.find((total) => total.supplierName === supplierName || total.supplierCode === supplier?.supplierCode) || {};
  };
  const sortedSupplierCompareRows = getSortedSupplierCompareRows(
    supplierCompareRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "quantity") return num(entry.row?.quantity);
      if (sortKey.endsWith("-offer")) return num(getSupplierCompareOfferByColumn(entry.row, sortKey)?.unitPrice);
      if (sortKey.endsWith("-net")) return num(getSupplierCompareOfferByColumn(entry.row, sortKey)?.netAmount);
      return entry.row?.[sortKey] ?? "";
    },
  );

  /* ---------------------------------------------------------------------------
     Supplier comparison modal renderer
     ---------------------------------------------------------------------------
     Read-only modal for side-by-side supplier offer analysis. Uses the same
     table styling direction as Consolidated Item Canvass.
  --------------------------------------------------------------------------- */
  const renderSupplierCompareModal = () => {
    if (!showSupplierCompareModal) return null;

    const getBaseValue = (row, key) => {
      switch (key) {
        case "ln":
          return row.ln;
        case "quantity":
          return qty(row.quantity, decQty);
        default:
          return row?.[key] || "";
      }
    };

    const handleCloseCompareModal = () => {
      setIsSupplierCompareMaximized(false);
      setShowSupplierCompareModal(false);
    };

    const renderCompareCell = (columnKey, row) => {
      const style = getSupplierCompareCellStyle(columnKey, getSupplierCompareFallbackWidth(columnKey));
      const isRightAligned = ["quantity"].includes(columnKey) || columnKey.endsWith("-offer") || columnKey.endsWith("-net");
      const isCenterAligned = columnKey === "ln";
      const alignClass = isRightAligned ? "text-right" : isCenterAligned ? "text-center" : "text-left";
      const isSupplierOfferColumn = columnKey.endsWith("-offer");
      const isSupplierNetColumn = columnKey.endsWith("-net");
      const offer = isSupplierOfferColumn || isSupplierNetColumn ? getSupplierCompareOfferByColumn(row, columnKey) : {};
      const isLowest = isSupplierOfferColumn && offer.hasOffer && row.lowestUnitPrice > 0 && num(offer.unitPrice) === num(row.lowestUnitPrice);
      const value = isSupplierOfferColumn
        ? offer.hasOffer ? money(offer.unitPrice) : "-"
        : isSupplierNetColumn
          ? offer.hasOffer ? money(offer.netAmount) : "-"
          : getBaseValue(row, columnKey);

      return (
        <td
          key={`compare-cell-${row.itemKey}-${columnKey}`}
          className={`global-tran-td-ui bg-inherit py-0.5 ${alignClass} ${isLowest ? "bg-blue-50 text-blue-700" : ""}`}
          style={style}
        >
          <input
            className={`w-full min-h-[22px] global-tran-td-inputclass-ui ${alignClass} ${isLowest ? "bg-blue-50 font-semibold text-blue-700" : ""}`}
            value={value || ""}
            readOnly
          />
        </td>
      );
    };

    return (
      <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 ${isSupplierCompareMaximized ? "p-0" : "p-2 sm:p-4"}`}>
        <div className={`relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl ${
          isSupplierCompareMaximized
            ? "h-screen w-screen rounded-none"
            : "h-[78vh] w-[95vw] max-w-[1480px] rounded-xl"
        }`}
          style={
            isSupplierCompareMaximized
              ? undefined
              : {
                  resize: "both",
                  minWidth: "min(980px, calc(100vw - 16px))",
                  minHeight: "520px",
                  maxWidth: "calc(100vw - 16px)",
                  maxHeight: "calc(100dvh - 16px)",
                }
          }
        >
          <div className="sticky top-0 z-30">
            <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200 px-3 sm:px-5 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="global-lookup-headertext-ui text-[19px] truncate">Supplier Offer Comparison</h2>
                </div>
                <p className="text-[9px] sm:text-xs text-slate-700 mt-0.5 truncate">
                  Compare supplier offer by item. Lowest non-zero offer per item is highlighted in blue.
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSupplierCompareMaximized((prev) => !prev)}
                  className="p-2 text-slate-400 transition-colors hover:text-blue-600"
                  title={isSupplierCompareMaximized ? "Restore" : "Maximize"}
                >
                  {isSupplierCompareMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <button
                  type="button"
                  onClick={handleCloseCompareModal}
                  className="p-2 text-slate-400 transition-colors hover:text-red-600"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-b bg-slate-50 px-5 py-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-slate-500">Canvass No.</div>
              <div className="mt-1 font-semibold text-slate-800">{canNo || "Draft"}</div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-slate-500">Items</div>
              <div className="mt-1 font-semibold text-slate-800">{supplierCompareRows.length}</div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-slate-500">Suppliers</div>
              <div className="mt-1 font-semibold text-slate-800">{supplierCompareDisplaySuppliers.length}</div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-slate-500">Status</div>
              <div className="mt-1 font-semibold text-slate-800">{displayStatus}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm">
              <div className="text-blue-600">Identifier</div>
              <div className="mt-1 font-semibold text-blue-700">Blue = Lowest Cost</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-white p-4">
            {supplierCompareDisplaySuppliers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                No supplier offers available to compare.
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-2">
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                  {supplierCompareDisplaySuppliers.map((supplier, index) => (
                    <span key={`compare-supplier-legend-${supplier?.canSupplierId || supplier?.supplierCode || index}`} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                      <span className="font-bold text-slate-800">{`S${index + 1}`}</span>
                      {` - ${supplier?.supplierName || supplier?.supplierCode || `Supplier ${index + 1}`}`}
                    </span>
                  ))}
                </div>

                <div className={`global-tran-table-main-div-ui min-h-0 flex-1 rounded-lg border border-slate-200 bg-white ${isSupplierCompareMaximized ? "overflow-hidden" : ""}`}>
                <div className={`global-tran-table-main-sub-div-ui h-full ${isSupplierCompareMaximized ? "max-h-none overflow-auto" : ""}`} onContextMenu={handleSupplierCompareBodyContextMenu}>
                  <table className="min-w-max border-separate border-spacing-0 text-[11px] [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                    <thead className="global-tran-thead-div-ui sticky top-0 z-[80] bg-blue-100">
                      <tr className="whitespace-nowrap">
                        {orderedSupplierCompareColumns.map((column) =>
                          renderSupplierCompareHeader(column.label, column.key, column.width, {
                            orderedColumns: orderedSupplierCompareColumns,
                            extraClassName: column.key.endsWith("-offer") || column.key.endsWith("-net") ? "text-right" : "",
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody className="relative bg-white">
                      {supplierCompareRows.length === 0 ? (
                        <tr className="global-tran-tr-ui">
                          <td colSpan={orderedSupplierCompareColumns.length} className="global-tran-td-ui py-8 text-center text-slate-500">
                            No item rows available.
                          </td>
                        </tr>
                      ) : (
                        sortedSupplierCompareRows.map(({ row }, rowIndex) => (
                          <tr key={`compare-row-${row.itemKey}`} className={`global-tran-tr-ui h-8 hover:bg-blue-50 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                            {orderedSupplierCompareColumns.map((column) => renderCompareCell(column.key, row))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-[70] bg-slate-100 font-bold">
                      <tr className="h-8 bg-slate-100">
                        {orderedSupplierCompareColumns.map((column, index) => {
                          const style = getSupplierCompareCellStyle(column.key, getSupplierCompareFallbackWidth(column.key));
                          const isNetColumn = column.key.endsWith("-net");
                          const total = isNetColumn ? getSupplierCompareTotalByColumn(column.key) : {};
                          const value = column.key === "itemName" ? "Supplier Total Net Amount" : isNetColumn ? money(total?.totalNet || 0) : "";
                          return (
                            <td
                              key={`compare-total-${column.key}`}
                              className={`global-tran-td-ui border-t bg-slate-100 py-1 font-bold ${isNetColumn ? "text-right text-slate-800" : column.key === "itemName" ? "text-left text-slate-800" : ""}`}
                              style={style}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                  {renderSupplierCompareHeaderContextMenu()}
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryPanel = () => (
    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-slate-800">Transaction Summary</h2>
        <div className="mt-3 space-y-3 text-xs">
          {[
            ["Selected PRs", totals.prCount],
            ["Consolidated Items", totals.itemCount],
            ["Common Items", detailRows.filter((row) => normalizeRows(row.prBreakdown).length > 1).length],
            ["Total Quantity", `${totals.selectedQty} Units`],
          ].map(([label, value], index) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 text-[10px] text-blue-600">
                  {index + 1}
                </span>
                {label}
              </span>
              <span className="font-bold text-slate-900">{value}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowSupplierCompareModal(true)}
          disabled={supplierRows.length === 0 || detailRows.length === 0}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Compare Supplier Offers"
        >
          <FontAwesomeIcon icon={faClipboardList} />
          Compare Supplier Offers
        </button>
      </div>

      <div className="border-t pt-4">
        <h2 className="text-sm font-bold text-slate-800">PR Coverage</h2>
        <div className="mt-3 space-y-2 text-xs">
          {prRows.length === 0 ? (
            <div className="text-slate-500">No PR selected.</div>
          ) : (
            prRows.map((row) => {
              const itemCount = detailRows.filter((item) =>
                normalizeRows(item.prBreakdown).some((b) => String(b.prId) === String(row.prId))
              ).length;
              const coveredQty = detailRows.reduce(
                (sum, item) =>
                  sum +
                  normalizeRows(item.prBreakdown)
                    .filter((b) => String(b.prId) === String(row.prId))
                    .reduce((lineSum, b) => lineSum + num(b.includedQty), 0),
                0
              );

              return (
                <div key={row.prId} className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">{row.prNo}</span>
                  <span className="text-slate-500">{itemCount} items</span>
                  <span className="font-bold text-slate-800">{qty(coveredQty, decQty)} Units</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h2 className="text-sm font-bold text-slate-800">Best Offer Snapshot</h2>
        <div className="mt-3 space-y-2">
          {rankedSuppliers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">No supplier offers yet.</div>
          ) : (
            rankedSuppliers.slice(0, 3).map((supplier, index) => {
              const isLowest = index === 0 && num(supplier.netAmount) > 0;
              return (
                <button
                  type="button"
                  key={`${supplier.supplierCode}-${supplier.originalIndex}`}
                  onClick={() => updateState({ activeTab: "suppliers" })}
                  className={`w-full rounded-lg border p-3 text-left text-xs ${
                    isLowest ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${
                        isLowest ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-800">
                        {supplier.supplierName || supplier.supplierCode || "Unnamed Supplier"}
                      </span>
                      <span className="block font-bold text-slate-950">PHP {money(supplier.netAmount)}</span>
                      <span className="block text-[11px] text-slate-500">
                        Delivery Date: {supplier.deliveryDate ? safeDate(supplier.deliveryDate) : "Not set"}
                      </span>
                    </span>
                    {isLowest && <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Lowest</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <FontAwesomeIcon icon={faCircleInfo} className="mr-2" />
        Common items are merged into one canvass line while preserving PR-level breakdown.
      </div>
    </aside>
  );

  const renderPrSelectorCard = () => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">1. Select Purchase Requisitions</h2>
          <p className="text-xs text-slate-500">Approved open PRs are loaded by branch.</p>
        </div>
        <button
          type="button"
          onClick={loadOpenPR}
          disabled={isLocked}
          className={compactActionButtonClass}
        >
          <FontAwesomeIcon icon={faListCheck} />
          <span>Load Open PR</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Select PRs</div>
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedCanPrColumns.map((column) =>
                      renderCanPrHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedCanPrColumns,
                      })
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedCanPrRows.length === 0 ? (
                    <tr className="global-tran-tr-ui">
                      <td colSpan={orderedCanPrColumns.length} className="global-tran-td-ui text-center text-slate-500">
                        No PR records found for this Canvass.
                      </td>
                    </tr>
                  ) : (
                    sortedCanPrRows.map(({ row, originalIndex }) => (
                      <tr
                        key={row.prId || originalIndex}
                        className={`global-tran-tr-ui ${selectedPrIds.includes(String(row.prId)) ? "bg-blue-50" : ""}`}
                        onDoubleClick={() => toggleSelectedPrId(row.prId)}
                      >
                        {orderedCanPrColumns.map((column) => renderCanPrCell(column.key, row))}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-bold">
                  <tr className="h-8 bg-slate-100">
                    {orderedCanPrColumns.map((column) => {
                      const style = getCanPrCellStyle(column.key, getCanPrFallbackWidth(column.key));
                      const valueByColumn = {
                        dateNeeded: "Total",
                        totalItems: canPrTotals.totalItems,
                        totalQty: canPrTotals.totalQty,
                      };
                      const isNumeric = ["totalItems", "totalQty"].includes(column.key);
                      return (
                        <td
                          key={`pr-total-${column.key}`}
                          className={`global-tran-td-ui py-1 ${isNumeric || column.key === "dateNeeded" ? "text-right" : ""}`.trim()}
                          style={style}
                        >
                          {valueByColumn[column.key] || ""}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
              {renderCanPrHeaderContextMenu()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleLoadSelectedPR}
          disabled={isLocked || selectedPrIds.length === 0}
          className={compactActionButtonClass}
        >
          <FontAwesomeIcon icon={faClipboardList} />
          <span>Load Selected PR</span>
        </button>
        <span className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
          {detailRows.filter((row) => normalizeRows(row.prBreakdown).length > 1).length} Common Items Found
        </span>
        <span className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
          {detailRows.length} Total Unique Items
        </span>
      </div>
    </section>
  );

  const renderConsolidatedCanvassCard = () => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">2. Consolidated Item Canvass</h2>
          <p className="text-xs text-slate-500">Set the quantity to include in this transaction.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateState({ showPrBreakdown: !showPrBreakdown })}
            disabled={!hasPrBreakdownRows}
            className={compactActionButtonClass}
          >
            <FontAwesomeIcon icon={faListCheck} />
            <span>{showPrBreakdown ? "Hide Breakdown" : "Show Breakdown"}</span>
          </button>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui">
        <div className="global-tran-table-main-sub-div-ui">
          <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
            <thead className="global-tran-thead-div-ui">
              <tr>
                {orderedCanCanvassColumns.map((column) =>
                  renderCanCanvassHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedCanCanvassColumns,
                  })
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {sortedCanCanvassRows.length === 0 ? (
                <tr className="global-tran-tr-ui">
                  <td colSpan={orderedCanCanvassColumns.length} className="global-tran-td-ui text-center text-slate-500">
                    No consolidated items yet.
                  </td>
                </tr>
              ) : (
                sortedCanCanvassRows.map(({ row, originalIndex }) => {
                  const breakdown = normalizeRows(row.prBreakdown);
                  return (
                    <Fragment key={row.canLn || originalIndex}>
                      <tr
                        className="global-tran-tr-ui"
                      >
                        {orderedCanCanvassColumns.map((column) =>
                          renderCanCanvassCell(column.key, row, originalIndex)
                        )}
                      </tr>
                      {showPrBreakdown && breakdown.length > 0 && (
                        <tr className="bg-slate-50">
                          <td colSpan={orderedCanCanvassColumns.length} className="px-8 py-2">
                            <table className="w-full border-separate border-spacing-0 bg-white text-xs [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                              <thead className="global-tran-thead-div-ui">
                                <tr>
                                  <th className="global-tran-th-ui">Source PR</th>
                                  <th className="global-tran-th-ui">Department</th>
                                  <th className="global-tran-th-ui">Requested By</th>
                                  <th className="global-tran-th-ui">Required Date</th>
                                  <th className="global-tran-th-ui text-right">Qty in PR</th>
                                  <th className="global-tran-th-ui text-right">Included Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {breakdown.map((b, bIndex) => (
                                  <tr key={`${b.prId}-${b.prLn}-${bIndex}`} className="global-tran-tr-ui">
                                    <td className="global-tran-td-ui">{b.prNo}</td>
                                    <td className="global-tran-td-ui">{b.rcName || b.rcCode}</td>
                                    <td className="global-tran-td-ui">{b.requestedBy}</td>
                                    <td className="global-tran-td-ui">{safeDate(b.dateNeeded)}</td>
                                    <td className="global-tran-td-ui text-right">{qty(b.qtyInPr, decQty)}</td>
                                    <td className="global-tran-td-ui text-right font-bold">{qty(b.includedQty, decQty)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-bold">
              <tr className="h-8 bg-slate-100">
                {orderedCanCanvassColumns.map((column, index) => {
                  const style = getCanCanvassFooterCellStyle(column.key, getCanCanvassFallbackWidth(column.key));
                  const valueByColumn = {
                    totalQtyNeeded: totals.totalQty,
                    availableQty: `${totals.selectedQty} / ${totals.totalQty}`,
                    selectedQty: totals.selectedQty,
                  };
                  const isNumeric = ["totalQtyNeeded", "availableQty", "selectedQty"].includes(column.key);

                  return (
                    <td
                      key={`canvass-total-${column.key}`}
                      className={`global-tran-td-ui py-1 ${index === 0 ? "border-l" : ""} ${isNumeric ? "text-right" : ""}`}
                      style={style}
                    >
                      {valueByColumn[column.key] || ""}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
          {renderCanCanvassHeaderContextMenu()}
        </div>
      </div>
    </section>
  );

  const renderSupplierOffersCard = () => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">3. Supplier Offers</h2>
          <p className="text-xs text-slate-500">Add and compare supplier offers for the consolidated items.</p>
        </div>
        <button
          type="button"
          onClick={addSupplier}
          disabled={isLocked || detailRows.length === 0}
          className={compactActionButtonClass}
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Add Supplier</span>
        </button>
      </div>

      {supplierRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No supplier offer added yet.</div>
      ) : (
        (() => {
          const supplierIndex = Math.min(activeSupplierIndex, supplierRows.length - 1);
          const supplier = supplierRows[supplierIndex];
          const isAwarded = supplier.isAwarded || supplier.supplierCode === selectedSupplierCode;
          const isLowest = `${supplier.supplierCode || ""}-${supplierIndex}` === lowestSupplierKey && num(supplier.netAmount) > 0;
          const activeSupplierTab = supplierActiveTabs[supplierIndex] || "offer";
          const sortedSupplierItemRows = getSortedCanSupplierItemRows(
            normalizeRows(supplier.detailRows).map((row, originalIndex) => ({ row, originalIndex })),
            (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""),
          );

          return (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 pt-3">
                {supplierRows.map((row, index) => {
                  const selected = index === supplierIndex;
                  const tabLabel = row.supplierName || row.supplierCode || `Supplier ${index + 1}`;
                  return (
                    <button
                      key={`${row.supplierCode}-${index}`}
                      type="button"
                      onClick={() => updateState({ activeSupplierIndex: index })}
                      className={`max-w-[220px] truncate rounded-t-lg border px-4 py-2 text-xs font-bold ${
                        selected
                          ? "border-blue-200 border-b-white bg-white text-blue-700"
                          : "border-transparent text-slate-500 hover:bg-white"
                      }`}
                      title={tabLabel}
                    >
                      Supplier {index + 1}
                      {(row.supplierName || row.supplierCode) && (
                        <span className="ml-2 font-semibold text-slate-500">{tabLabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={`p-3 ${isAwarded ? "bg-emerald-50/40" : ""}`}>
                <div className="mb-2 grid grid-cols-1 items-center gap-2 lg:grid-cols-[1fr_auto_1fr]">
                  <div className="text-sm font-bold text-slate-800">
                    Supplier {supplierIndex + 1}
                    {isLowest && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">Lowest Offer</span>}
                    {isAwarded && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">Awarded</span>}
                  </div>

                  <div className="flex justify-start lg:justify-center">
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
                      {[
                        ["offer", "Offer"],
                        ["items", "Item Details"],
                        ["attachments", `Attachments (${normalizeRows(supplier.attachments).length})`],
                      ].map(([tab, label]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSupplierTab(supplierIndex, tab)}
                          className={`min-w-[82px] truncate rounded-full px-3 py-1.5 text-center text-[10px] font-bold transition-colors lg:text-xs ${
                            activeSupplierTab === tab
                              ? "bg-white text-blue-700 shadow-sm"
                              : "text-slate-500 hover:bg-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <button type="button" onClick={() => awardSupplier(supplier)} disabled={isAwardedOrCancelled || isLocked || !supplier?.canSupplierId} className="inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 rounded-md bg-blue-600 px-2 py-1.5 text-[10px] font-medium text-white transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65 lg:flex-row lg:px-3 lg:py-2 lg:text-xs" title="Award Transaction">
                      <FontAwesomeIcon icon={faTrophy} />
                      Award
                    </button>
                    {!isLocked && (
                      <button type="button" onClick={() => removeSupplier(supplierIndex)} className="inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 rounded-md bg-red-600 px-2 py-1.5 text-[10px] font-medium text-white transition-all duration-200 hover:bg-red-700 lg:flex-row lg:px-3 lg:py-2 lg:text-xs" title="Remove Offer">
                        <FontAwesomeIcon icon={faTrashAlt} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {activeSupplierTab === "offer" && (
                  <div className="space-y-4">
                    {/* Offer Info Section */}
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Offer Information</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Supplier Lookup Field */}
                        <FieldRenderer
                          id={`supplier-code-review-${supplierIndex}`}
                          name={`supplierCode-review-${supplierIndex}`}
                          label="Supplier Code"
                          type="lookup"
                          value={supplier.supplierCode || ""}
                          onLookup={() => openSupplierLookup(supplierIndex)}
                          onClear={() => updateSupplier(supplierIndex, "supplierCode", "")}
                          disabled={isLocked}
                          placeholder="Search supplier..."
                        />

                        {/* Supplier Name - Read Only Display */}
                        <FieldRenderer
                          id={`supplier-name-review-${supplierIndex}`}
                          label="Supplier Name"
                          type="text"
                          value={supplier.supplierName || ""}
                          disabled={true}
                        />

                        {/* Quote No */}
                        <FieldRenderer
                          id={`quote-no-review-${supplierIndex}`}
                          name={`quoteNo-review-${supplierIndex}`}
                          label="Quote No."
                          type="text"
                          value={supplier.quoteNo || ""}
                          onChange={(val) => updateSupplier(supplierIndex, "quoteNo", val)}
                          disabled={isLocked}
                        />

                        <FieldRenderer
                          id={`quote-date-review-${supplierIndex}`}
                          label="Quote Date"
                          type="date"
                          value={toDateInputValue(supplier.quoteDate)}
                          disabled={isLocked}
                          onChange={(val) => updateSupplier(supplierIndex, "quoteDate", val)}
                        />

                        <FieldRenderer
                          id={`offer-date-review-${supplierIndex}`}
                          label="Offer Date"
                          type="date"
                          value={toDateInputValue(supplier.offerDate)}
                          disabled={isLocked}
                          onChange={(val) => updateSupplier(supplierIndex, "offerDate", val)}
                        />

                        <FieldRenderer
                          id={`delivery-date-review-${supplierIndex}`}
                          label="Delivery Date"
                          type="date"
                          value={toDateInputValue(supplier.deliveryDate)}
                          disabled={isLocked}
                          onChange={(val) => updateSupplier(supplierIndex, "deliveryDate", val)}
                        />

                        {/* Payment Terms Lookup */}
                        <FieldRenderer
                          id={`payment-terms-review-${supplierIndex}`}
                          label="Payment Terms"
                          type="lookup"
                          value={supplier.paymentTerms || ""}
                          onLookup={() => openPaytermLookup(supplierIndex)}
                          onClear={() => updateSupplier(supplierIndex, "paymentTerms", "")}
                          disabled={isLocked}
                        />

                        <FieldRenderer
                          id={`delivery-terms-review-${supplierIndex}`}
                          name={`deliveryTerms-review-${supplierIndex}`}
                          label="Delivery Terms"
                          type="text"
                          value={supplier.deliveryTerms || ""}
                          onChange={(val) => updateSupplier(supplierIndex, "deliveryTerms", val)}
                          disabled={isLocked}
                        />

                        <div />
                        <div />
                        <div />
                        <FieldRenderer
                          id={`total-amount-review-${supplierIndex}`}
                          name={`totalAmount-review-${supplierIndex}`}
                          label="Total Offer Amount"
                          type="amount"
                          value={`PHP ${money(supplier.netAmount)}`}
                          disabled={true}
                        />

                        <div className="col-span-full mt-2">
                          <div className="relative">
                            <textarea
                              id={`supplier-remarks-review-${supplierIndex}`}
                              placeholder=""
                              rows={3}
                              className="peer global-tran-textbox-remarks-ui pt-2"
                              value={supplier.remarks || ""}
                              onChange={(e) => updateSupplier(supplierIndex, "remarks", e.target.value)}
                              disabled={isLocked}
                            />
                            <label htmlFor={`supplier-remarks-review-${supplierIndex}`} className="global-tran-floating-label-remarks">
                              Supplier Remarks
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSupplierTab === "items" && (
                  <div className="global-tran-table-main-div-ui max-h-[460px]">
                    <div className="global-tran-table-main-sub-div-ui">
                      <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                        <thead className="global-tran-thead-div-ui sticky top-0 z-10">
                          <tr>
                            {orderedCanSupplierItemColumns.map((column) =>
                              renderCanSupplierItemHeader(column.label, column.key, column.width, {
                                orderedColumns: orderedCanSupplierItemColumns,
                              })
                            )}
                          </tr>
                        </thead>
                        <tbody className="relative">
                          {sortedSupplierItemRows.length === 0 ? (
                            <tr className="global-tran-tr-ui">
                              <td colSpan={orderedCanSupplierItemColumns.length} className="global-tran-td-ui text-center text-slate-500">
                                No item details yet.
                              </td>
                            </tr>
                          ) : (
                            sortedSupplierItemRows.map(({ row, originalIndex }) => (
                              <tr key={`${supplierIndex}-${row.canLn || originalIndex}`} className="global-tran-tr-ui">
                                {orderedCanSupplierItemColumns.map((column) =>
                                  renderCanSupplierItemCell(column.key, row, originalIndex, supplierIndex)
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-slate-50 font-bold z-10">
                          <tr className="h-8 bg-slate-100">
                            <td colSpan={8} className="global-tran-td-ui text-right border-l py-1">Total</td>
                            <td className="global-tran-td-ui text-right py-1">{money(supplier.offerAmount)}</td>
                            <td className="global-tran-td-ui text-right py-1">{money(supplier.discountAmount)}</td>
                            <td className="global-tran-td-ui py-1" />
                            <td className="global-tran-td-ui text-right py-1">{money(supplier.vatAmount)}</td>
                            <td className="global-tran-td-ui text-right py-1">{money(supplier.netAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                      {renderCanSupplierItemHeaderContextMenu()}
                    </div>
                  </div>
                )}

                {activeSupplierTab === "attachments" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <button type="button" onClick={() => openAttachment(supplier)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">
                      <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                      Attach Files
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {normalizeRows(supplier.attachments).length === 0 ? (
                        <span className="text-xs text-slate-500">No attachments uploaded.</span>
                      ) : (
                        normalizeRows(supplier.attachments).map((file) => (
                          <span key={file.fileId} className="rounded-full border bg-white px-3 py-1 text-xs">
                            <FontAwesomeIcon icon={faPaperclip} className="mr-1" />
                            {file.fileName}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

    </section>
  );

  const renderDetails = () => (
    <>
      {renderHeader()}
      {renderCanvassInfoCard()}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="space-y-4">
          {renderPrSelectorCard()}
          {renderConsolidatedCanvassCard()}
          {renderSupplierOffersCard()}
          {statusHistory.length > 0 && renderStatusHistory()}
        </div>
        {renderSummaryPanel()}
      </div>
      <div className="mt-4">{renderGeneratePOSection()}</div>
    </>
  );

  const renderHistory = () => (
    <AllTranHistory
      showHeader={false}
      isActive={topTab === "history"}
      endpoint="/getCANHistory"
      cacheKey={`CAN:${branchCode || ""}:${historyFilter.dateFrom || ""}:${historyFilter.dateTo || ""}`}
      activeTabKey="CAN_Summary"
      branchCode={branchCode}
      startDate={historyFilter.dateFrom}
      endDate={historyFilter.dateTo}
      status="All"
      onRowDoubleClick={handleHistoryRowPick}
      historyExportName={`${documentTitle} History`}
    />
  );

  /* ---------------------------------------------------------------------------
     Main JSX layout
     ---------------------------------------------------------------------------
     Header, transaction tabs, PR selector, consolidated canvass items, supplier
     offers, transaction summary, Generate PO, history, and modals.
  --------------------------------------------------------------------------- */
  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={() => {
            if (!canId) {
              useSwalInfoAlert("Print", "Please save the Canvass transaction first before printing.");
              return;
            }
            useSwalInfoAlert("Print", "Canvass print form is ready to be connected to the CAN report endpoint.");
          }}
          onPost={submit}
          printData={{ can_no: canNo, branch: branchCode, doc_id: docType }}
          onReset={handleReset}
          onSave={save}
          onCancel={cancel}
          onAttach={openCanvassAttachment}
          onUpload={() => useSwalInfoAlert("Upload", "Use Attach for Canvass-level files or Supplier Attachments inside Supplier Offers.")}
          onNotify={submit}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showNotify={hasDocument && isDraft}
          showBIRForm={false}
          showCopyForm={false}
          showUpload={false}
          isViewDocument={false}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/CAN"
          isSaveDisabled={isFormDisabled || detailRows.length === 0}
          isResetDisabled={false}
          isAttachDisabled={!hasDocument}
          isNotifyDisabled={!hasDocument || !isDraft}
          isPrintDisabled={!hasDocument || canCancelled}
          isCopyDisabled={true}
          isCancelDisabled={!hasDocument || isAwardedOrCancelled}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>{renderDetails()}</div>
      <div className={topTab === "history" ? "" : "hidden"}>{renderHistory()}</div>

      {renderSupplierCompareModal()}

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{ branchCode, branchName, docType, documentTitle, fieldNo: "canNo" }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: canNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          onClose={async () => {
            const wasSupplierAttachment = Boolean(activeSupplierForAttachment);
            setActiveSupplierForAttachment(null);
            updateState({ showAttachModal: false });
            if (canId && wasSupplierAttachment) {
              await fetchCAN({ canId });
            }
          }}
          params={{
            DocumentID: activeSupplierForAttachment?.canSupplierId || canId,
            DocumentName: activeSupplierForAttachment
              ? `${canNo || "CAN"} - ${activeSupplierForAttachment.supplierName || activeSupplierForAttachment.supplierCode}`
              : `${canNo || "CAN"} - Canvass Transaction`,
            BranchName: branchName || branchCode,
            BranchCode: branchCode,
            DocumentNo: activeSupplierForAttachment
              ? `${canNo || "CAN"}-${activeSupplierForAttachment.supplierCode || "SUPPLIER"}`
              : canNo,
            DocumentType: activeSupplierForAttachment ? "CAN_SUPPLIER" : "CAN",
          }}
        />
      )}

      {showCancelModal && (
        <CancelTranModal
          isOpen={showCancelModal}
          onClose={closeCancel}
        />
      )}

      {showApprovalStatusModal && (
        <GlobalApprovalStatus
          open={showApprovalStatusModal}
          onClose={() => updateState({ showApprovalStatusModal: false })}
          tranId={canId}
          docCode={docType}
          docNo={canNo}
        />
      )}

      {showPayeeLookupModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeLookupModal}
          onClose={handleSupplierLookupClose}
          customParam="ActiveAll"
        />
      )}

      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}
    </div>
  );
};

export default CAN;
