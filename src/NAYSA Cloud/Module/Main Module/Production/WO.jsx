import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import Header from "@/NAYSA Cloud/Components/Header";
import DateFormatInput, {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "@/NAYSA Cloud/Components/ResetContext.jsx";
import BOMReferenceLookupModal from "@/NAYSA Cloud/Lookup/SearchBOMRef.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import DocumentSignatories from "@/NAYSA Cloud/Lookup/SearchSignatory.jsx";
import { useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";
import { useTransactionUpsert } from "@/NAYSA Cloud/Global/procedure.js";
import { useGetCurrentDayV2 } from "@/NAYSA Cloud/Global/dates.js";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report.js";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import {
  docTypeNames,
  docTypes,
  docTypePDFGuide,
  docTypeVideoGuide,
} from "@/NAYSA Cloud/Global/doctype";

const ENDPOINTS = {
  get: "getWO",
  loadBOM: "loadWOBOM",
  cancel: "cancelWO",
};

const normalizeResponse = (data) => {
  if (Array.isArray(data)) {
    return { success: true, rows: data };
  }

  if (data?.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return {
      ...data,
      ...data.data,
      success: data.success ?? data.status ?? true,
    };
  }

  return {
    success: data?.success ?? data?.status ?? true,
    rows: data?.rows || data?.data || [],
    ...data,
  };
};

const request = async (endpoint, payload = {}) => {
  const data = await postRequest(endpoint, payload);
  return normalizeResponse(data);
};

const woApi = {
  get: (payload) => request(ENDPOINTS.get, payload),
  loadBOM: (payload) => request(ENDPOINTS.loadBOM, payload),
  cancel: (payload) => request(ENDPOINTS.cancel, payload),
};

const STATUS = {
  O: "OPEN",
  C: "CLOSED",
  X: "CANCELLED",
  R: "RELEASED",
  AC: "ACCOUNTING CLOSED",
  A: "ACCOUNTING CLOSED",
  F: "CLOSED",
  P: "CLOSED",
};

const EMPTY_HD = {
  branchCode: "",
  branchName: "",
  woNo: "",
  woId: "",
  woDate: useGetCurrentDayV2(),
  refNo1: "",
  refNo2: "",
  invType: "FG",
  itemCode: "",
  itemName: "",
  uomCode: "",
  bomCode: "",
  bomDate: "",
  bomQty: 0,
  batchQty: 1,
  woQty: 0,
  worQty: 0,
  worAmt: 0,
  totalMatcost: 0,
  woAmt: 0,
  woUnitcost: 0,
  remarks: "",
  vendCode: "",
  vendName: "",
  wcCode: "",
  wcName: "",
  routeCode: "",
  estRunTime: 0,
  actualRuntime: 0,
  acctCode: "",
  acctName: "",
  tranType: "JV",
  varQty: 0,
  stdLabor: 0,
  stdOverhead: 0,
  stdLaborRate: 0,
  stdOverheadRate: 0,
  woStatus: "O",
  cancelled: "",
  noReprints: "0",
};

const WO_DETAIL_COLUMNS = [
  { key: "lineNo", label: "LN", width: 60 },
  { key: "invType", label: "Type", width: 80 },
  { key: "itemCode", label: "Item Code", width: 130 },
  { key: "itemName", label: "Item Description", width: 280 },
  { key: "uomCode", label: "UOM", width: 90 },
  { key: "qtyNeeded", label: "BOM Qty Needed", width: 140 },
  { key: "scrapQty", label: "Scrap Qty", width: 140 },
  { key: "requiredQty", label: "Required Qty", width: 130 },
  { key: "issuedQty", label: "Issued Qty", width: 140 },
  { key: "unservedQty", label: "Unserved Qty", width: 130 },
  { key: "qtyHand", label: "Qty on Hand", width: 130 },
  { key: "issuedAmt", label: "Issued Amt", width: 130 },
  { key: "requiredAmt", label: "Required Amt", width: 130 },
  { key: "issuedWac", label: "Issued Ave. Cost", width: 150 },
  { key: "varianceAmt", label: "Variance Amt", width: 130 },
];

const n = (value) => {
  const num = parseFormattedNumber(value);
  return Number.isFinite(num) ? num : 0;
};

const money = (value, digits = 2) => formatNumber(n(value), digits);

const qty = (value, digits = 6) => formatNumber(n(value), digits);

const FormattedNumberField = ({ value, decimals, onChange, ...props }) => {
  const [focused, setFocused] = useState(false);
  const formatter = decimals === 6 ? qty : money;

  return (
    <FieldRenderer
      {...props}
      type="amount"
      value={focused ? String(value ?? "") : formatter(value, decimals)}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const currentUser = () => {
  const keys = ["auth", "user", "authUser", "naysaUser"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      return obj?.userCode || obj?.user_code || obj?.userId || obj?.userid || obj?.name || "";
    } catch (_) {
      // ignore invalid storage values
    }
  }
  return "";
};

const currentBranch = () => {
  const keys = ["auth", "user", "authUser", "naysaUser"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      return obj?.branchCode || obj?.branch_code || obj?.branchcode || obj?.branch || "HO";
    } catch (_) {
      // ignore invalid storage values
    }
  }
  return "HO";
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

const getUserCode = (currentUserRow) =>
  pickFirst(
    currentUserRow?.userCode,
    currentUserRow?.USER_CODE,
    currentUserRow?.user_code,
    currentUserRow?.userId,
    currentUserRow?.USER_ID,
    currentUser()
  );

const getDefaultBranch = (currentUserRow, companyInfo) =>
  pickFirst(
    currentUserRow?.branchCode,
    currentUserRow?.BRANCH_CODE,
    currentUserRow?.branch_code,
    companyInfo?.branchCode,
    companyInfo?.BRANCH_CODE,
    companyInfo?.branch_code,
    currentBranch()
  );

const getDefaultBranchName = (currentUserRow, companyInfo) =>
  pickFirst(
    currentUserRow?.branchName,
    currentUserRow?.BRANCH_NAME,
    currentUserRow?.branch_name,
    companyInfo?.branchName,
    companyInfo?.BRANCH_NAME,
    companyInfo?.branch_name,
    getDefaultBranch(currentUserRow, companyInfo)
  );

function normalizeHd(hd = {}) {
  const rawWoStatus = hd.woStatus ?? hd.WO_STATUS ?? "O";
  const normalizedStatus = STATUS[String(rawWoStatus).toUpperCase()]
    ? String(rawWoStatus).toUpperCase()
    : rawWoStatus === 1
      ? "C"
      : rawWoStatus === 9
        ? "X"
        : "O";

  return {
    ...EMPTY_HD,
    ...hd,
    woDate: formatDateToMMDDYYYY(toDateInput(hd.woDate || hd.WO_DATE)) || hd.woDate || EMPTY_HD.woDate,
    bomDate: toDateInput(hd.bomDate || hd.BOM_DATE),
    branchCode: hd.branchCode || hd.BRANCH_CODE || currentBranch(),
    branchName: hd.branchName || hd.BRANCH_NAME || hd.branchCode || hd.BRANCH_CODE || currentBranch(),
    woNo: hd.woNo || hd.WO_NO || "",
    woId: hd.woId || hd.WO_ID || "",
    refNo1: hd.refNo1 || hd.REF_NO1 || hd.refNo || hd.REF_NO || "",
    refNo2: hd.refNo2 || hd.REF_NO2 || "",
    invType: hd.invType || hd.INV_TYPE || "FG",
    itemCode: hd.itemCode || hd.ITEM_CODE || "",
    itemName: hd.itemName || hd.ITEM_NAME || "",
    uomCode: hd.uomCode || hd.UOM_CODE || "",
    bomCode: hd.bomCode || hd.BOM_CODE || "",
    bomQty: n(hd.bomQty ?? hd.BOM_QTY),
    batchQty: n(hd.batchQty ?? hd.BATCH_QTY) || 1,
    woQty: n(hd.woQty ?? hd.WO_QTY),
    worQty: n(hd.worQty ?? hd.WOR_QTY),
    worAmt: n(hd.worAmt ?? hd.WOR_AMT),
    totalMatcost: n(hd.totalMatcost ?? hd.TOTAL_MATCOST),
    woAmt: n(hd.woAmt ?? hd.WO_AMT),
    woUnitcost: n(hd.woUnitcost ?? hd.WO_UNITCOST),
    stdLabor: n(hd.stdLabor ?? hd.STD_LABOR),
    stdOverhead: n(hd.stdOverhead ?? hd.STD_OVERHEAD),
    stdLaborRate: n(hd.stdLaborRate ?? hd.STD_LABOR_RATE),
    stdOverheadRate: n(hd.stdOverheadRate ?? hd.STD_OVERHEAD_RATE),
    vendCode: hd.vendCode || hd.VEND_CODE || "",
    vendName: hd.vendName || hd.VEND_NAME || "",
    wcCode: hd.wcCode || hd.WC_CODE || "",
    wcName: hd.wcName || hd.WC_NAME || "",
    routeCode: hd.routeCode || hd.ROUTE_CODE || "",
    estRunTime: n(hd.estRunTime ?? hd.EST_RUNTIME ?? hd.EST_RUN_TIME),
    actualRuntime: n(hd.actualRuntime ?? hd.ACTUAL_RUNTIME),
    acctCode: hd.acctCode || hd.ACCT_CODE || "",
    acctName: hd.acctName || hd.ACCT_NAME || "",
    tranType: hd.tranType || hd.TRAN_TYPE || "JV",
    remarks: hd.remarks || hd.REMARKS || "",
    woStatus: normalizedStatus,
    cancelled: hd.cancelled || hd.CANCELLED || "",
    noReprints: String(hd.noReprints ?? hd.NO_REPRINTS ?? "0"),
  };
}

function normalizeRow(row = {}, index = 0) {
  const qtyNeeded = n(row.qtyNeeded ?? row.QTY_NEEDED);
  const scrapQty = n(row.scrapQty ?? row.SCRAP_QTY ?? row.scrapRate ?? row.SCRAP_RATE);
  const requiredQty = n(row.requiredQty ?? row.REQUIRED_QTY);
  const issuedQty = n(row.issuedQty ?? row.ISSUED_QTY);
  const issuedWac = n(row.issuedWac ?? row.ISSUED_WAC);
  const issuedAmt = n(row.issuedAmt ?? row.ISSUED_AMT) || issuedQty * issuedWac;
  const requiredAmt = n(row.requiredAmt ?? row.REQUIRED_AMT) || requiredQty * issuedWac;

  return {
    lineNo: n(row.lnNo ?? row.lineNo ?? row.LINE_NO) || index + 1,
    invType: row.invType || row.INV_TYPE || "RM",
    itemCode: row.itemCode || row.ITEM_CODE || "",
    itemName: row.itemName || row.ITEM_NAME || "",
    uomCode: row.uomCode || row.UOM_CODE || "",
    qtyNeeded,
    scrapQty,
    requiredQty,
    issuedQty,
    unservedQty: n(row.unservedQty ?? row.UNSERVED_QTY),
    qtyHand: n(row.qtyHand ?? row.QTY_HAND),
    issuedAmt,
    requiredAmt,
    issuedWac,
    varianceAmt: n(row.varianceAmt ?? row.VARIANCE_AMT),
    pickedQty: n(row.pickedQty ?? row.PICKED_QTY),
    pcCode: row.pcCode || row.PC_CODE || "",
    pcDesc: row.pcDesc || row.PC_DESC || "",
    ouDoctype: row.ouDoctype || row.OU_DOCTYPE || "",
  };
}

function recalcRows(rows, batchQty) {
  return rows.map((row, index) => {
    const requiredQty = (n(row.qtyNeeded) + n(row.scrapQty)) * n(batchQty);
    const issuedQty = n(row.issuedQty);
    const requiredAmt = requiredQty * n(row.issuedWac);
    const issuedAmt = issuedQty * n(row.issuedWac);

    return {
      ...row,
      lineNo: index + 1,
      requiredQty,
      issuedQty,
      unservedQty: requiredQty - issuedQty,
      requiredAmt,
      issuedAmt,
      varianceAmt: issuedAmt - requiredAmt,
    };
  });
}

function recalcHeader(hd, rows) {
  const woQty = n(hd.bomQty) * n(hd.batchQty);
  const totalMatcost = rows.reduce((sum, row) => sum + n(row.issuedAmt), 0);
  const stdLabor = woQty * n(hd.stdLaborRate);
  const stdOverhead = woQty * n(hd.stdOverheadRate);
  const woAmt = totalMatcost + stdLabor + stdOverhead;

  return {
    ...hd,
    woQty,
    totalMatcost,
    stdLabor,
    stdOverhead,
    woAmt,
    woUnitcost: woQty ? woAmt / woQty : 0,
    varQty: woQty - n(hd.worQty),
  };
}

export default function WO() {
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth() || {};
  const { setOnSave, setOnReset } = useReset() || {};
  const docType = docTypes.WO;
  const hsDoc = getAllTopHSDocRow?.(docType);
  const documentTitle = hsDoc?.docName ? `${hsDoc.docName} Transaction` : docTypeNames[docType];
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const userCode = getUserCode(currentUserRow);
  const defaultBranch = getDefaultBranch(currentUserRow, companyInfo);
  const defaultBranchName = getDefaultBranchName(currentUserRow, companyInfo);
  const [isViewDocument, setIsViewDocument] = useState(false);

  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canAdd,
    canSave,
    canCancel,
  } = usePagePermission({
    componentKey: "WO",
    menuName: documentTitle,
    debug: false,
  });

  const showReadOnlyAlert = useCallback((action = "perform this action") => {
    Swal.fire({
      icon: "warning",
      title: "Read Only",
      text: `You only have read access. You are not allowed to ${action}.`,
    });
  }, []);

  const [activeTab, setActiveTab] = useState("details");
  const [infoTab, setInfoTab] = useState("bom");
  const [hd, setHd] = useState(() => ({
    ...EMPTY_HD,
    branchCode: defaultBranch,
    branchName: defaultBranchName,
  }));
  const [dt1, setDt1] = useState([]);
  const [lookupOpen, setLookupOpen] = useState({
    branch: false,
    bom: false,
    account: false,
    vendor: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRetrieved, setIsRetrieved] = useState(false);
  const [savedWoStatus, setSavedWoStatus] = useState("O");
  const [showAllTranDocNo, setShowAllTranDocNo] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showSignatoryModal, setShowSignatoryModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsViewDocument(params.get("viewDocument") === "true");
  }, [location.search]);

  useEffect(() => {
    const handleFunctionKey = (event) => {
      if (event.key !== "F1" || isViewDocument) return;
      event.preventDefault();
      setShowAllTranDocNo(true);
    };

    window.addEventListener("keydown", handleFunctionKey);
    return () => window.removeEventListener("keydown", handleFunctionKey);
  }, [isViewDocument]);

  const statusText = String(savedWoStatus || "O").toUpperCase();
  const isClosed = ["1", "9", "C", "X", "A", "AC", "F", "P", "POSTED", "CLOSED", "CANCELLED"].includes(statusText);

  const totals = useMemo(
    () => ({
      requiredAmt: dt1.reduce((sum, row) => sum + n(row.requiredAmt), 0),
      issuedAmt: dt1.reduce((sum, row) => sum + n(row.issuedAmt), 0),
      varianceAmt: dt1.reduce((sum, row) => sum + n(row.varianceAmt), 0),
    }),
    [dt1]
  );

  const {
    getColumnStyle: getDetailColumnStyle,
    getFrozenColumnStyle: getDetailFrozenStyle,
    getOrderedColumns: getOrderedDetailColumns,
    getSortedRows: getSortedDetailRows,
    renderHeaderContextMenu: renderDetailHeaderContextMenu,
    renderResizableHeader: renderDetailHeader,
  } = useResizableTableColumns(WO_DETAIL_COLUMNS);
  const orderedDetailColumns = getOrderedDetailColumns(WO_DETAIL_COLUMNS);
  const getDetailCellStyle = (key, fallbackWidth) => ({
    ...getDetailColumnStyle(key, fallbackWidth),
    ...getDetailFrozenStyle(key, orderedDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedDetailRows = getSortedDetailRows(
    dt1.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => entry.row?.[sortKey] ?? ""
  );

  const setCalculatedState = useCallback((nextHd, nextRows) => {
    const rows = recalcRows(nextRows, nextHd.batchQty);
    setDt1(rows);
    setHd(recalcHeader(nextHd, rows));
  }, []);

  const reset = useCallback(() => {
    setMessage("");
    setHd({
      ...EMPTY_HD,
      branchCode: defaultBranch,
      branchName: defaultBranchName,
      woDate: useGetCurrentDayV2(),
    });
    setDt1([]);
    setActiveTab("details");
    setInfoTab("bom");
    setIsRetrieved(false);
    setSavedWoStatus("O");
    setShowAllTranDocNo(false);
    setShowAttachModal(false);
    setShowSignatoryModal(false);
  }, [defaultBranch, defaultBranchName]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("woNo") || params.get("docNo")) return;
    reset();
  }, [location.search, reset]);

  const loadBOM = async (bomCode = hd.bomCode, baseHd = hd) => {
    if (!bomCode) {
      setMessage("Please enter or select BOM Code first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await woApi.loadBOM({
        branchCode: baseHd.branchCode || defaultBranch,
        bomCode,
        batchQty: baseHd.batchQty || 1,
        userCode,
        userId: userCode,
      });

      if (!res.success) {
        setMessage(res.message || "Unable to load BOM.");
        return;
      }

      const loadedBomHd = normalizeHd({ ...baseHd, ...(res.hd || {}), bomCode });
      const nextHd = {
        ...loadedBomHd,
        branchCode: baseHd.branchCode,
        branchName: baseHd.branchName,
        woNo: baseHd.woNo || "",
        woId: baseHd.woId || "",
        woDate: baseHd.woDate,
        refNo1: baseHd.refNo1 || "",
        refNo2: baseHd.refNo2 || "",
        remarks: baseHd.remarks || "",
        woStatus: baseHd.woStatus || "O",
        cancelled: baseHd.cancelled || "",
      };
      const rawRows = res.dt1 || res.hd?.dt1 || res.rows || res.data?.dt1 || [];
      const nextRows = rawRows.map((row, index) =>
        normalizeRow({ ...row, issuedQty: 0, issuedAmt: 0 }, index)
      );
      setCalculatedState(nextHd, nextRows);
      setActiveTab("details");
      setInfoTab("bom");
      setMessage(res.message || "BOM loaded.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWO = async (
    woNo,
    woId = "",
    branchCode = hd.branchCode || defaultBranch,
    direction = ""
  ) => {
    try {
      setLoading(true);
      setMessage("");
      const res = await woApi.get( {
        branchCode,
        woNo,
        woId,
        key: direction,
        direction,
      });

      if (!res.success) {
        setMessage(res.message || "Work Order not found.");
        return;
      }

      const nextHd = normalizeHd(res.hd || {});
      const nextRows = (res.dt1 || []).map(normalizeRow);
      setHd(nextHd);
      setDt1(nextRows);
      setIsRetrieved(true);
      setSavedWoStatus(nextHd.woStatus || "O");
      setActiveTab("details");
      setInfoTab("bom");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const woNo = params.get("woNo") || params.get("docNo");
    const branchCode = params.get("branchCode") || defaultBranch;
    if (loadedFromUrlRef.current || !woNo || !branchCode) return;

    loadedFromUrlRef.current = true;
    loadWO(woNo, params.get("woId") || "", branchCode);
  }, [defaultBranch, location.search]);

  const handleHistoryRowPick = async (row) => {
    const woNo = row?.docNo || row?.woNo || row?.WO_NO || "";
    const branchCode = row?.branchCode || row?.BRANCH_CODE || hd.branchCode || defaultBranch;
    const woId = row?.woId || row?.WO_ID || "";
    if (!woNo) return;

    await loadWO(woNo, woId, branchCode);
    setActiveTab("details");
  };

  const updateTransactionState = useCallback((updates = {}) => {
    if (Object.prototype.hasOwnProperty.call(updates, "isLoading")) {
      setLoading(Boolean(updates.isLoading));
    }
    if (updates.documentNo || updates.documentID) {
      setHd((prev) => ({
        ...prev,
        woNo: updates.documentNo || prev.woNo,
        woId: updates.documentID || prev.woId,
      }));
    }
    if (updates.isDocNoDisabled || updates.isFetchDisabled) {
      setIsRetrieved(true);
    }
  }, []);

  const handleSaveAndPrint = useCallback(async (woId) => {
    if (!woId) return;
    setLoading(true);
    try {
      await useHandlePrint(woId, docType, "Inline", userCode);
    } catch (error) {
      console.error("WO print error:", error?.response?.data || error);
    } finally {
      setLoading(false);
    }
  }, [docType, userCode]);

  const save = useCallback(async () => {
    if (isClosed) {
      setMessage("Closed/Cancelled Work Order cannot be edited.");
      return;
    }
    if (!hd.bomCode || !hd.itemCode || !n(hd.batchQty)) {
      setMessage("BOM Code, Item Code, and Batch Qty are required.");
      return;
    }
    if (!dt1.length) {
      setMessage("Item details are required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const rows = recalcRows(dt1, hd.batchQty);
      const payloadHd = recalcHeader(hd, rows);
      const payloadWithoutGeneratedFields = { ...payloadHd };
      delete payloadWithoutGeneratedFields[["cutoff", "Code"].join("")];
      const payload = {
        ...payloadWithoutGeneratedFields,
        woDate: formatDateToYYYYMMDD(payloadWithoutGeneratedFields.woDate) || payloadWithoutGeneratedFields.woDate,
        branchCode: payloadHd.branchCode || defaultBranch,
        userCode,
        userId: userCode,
        dt1: rows,
      };
      const res = await useTransactionUpsert(
        docType,
        payload,
        updateTransactionState,
        "woId",
        "woNo"
      );

      if (!res) {
        return;
      }

      const result = res.data?.[0] || res;
      const responseDocNo = result.woNo || hd.woNo || "";
      const responseDocId = result.woId || hd.woId || "";

      setHd((prev) => ({
        ...prev,
        woNo: responseDocNo || prev.woNo,
        woId: responseDocId || prev.woId,
      }));
      setDt1(rows);
      setIsRetrieved(true);
      setSavedWoStatus(payloadHd.woStatus || "O");
      setMessage("");

      if (responseDocNo) {
        await loadWO(responseDocNo, responseDocId, payloadHd.branchCode || defaultBranch);
      }

      const isZero = Number(payloadHd.noReprints || 0) === 0;
      const onSaveAndPrint = isZero
        ? () => setShowSignatoryModal(true)
        : () => handleSaveAndPrint(responseDocId);

      useSwalshowSaveSuccessDialog(reset, onSaveAndPrint);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [defaultBranch, docType, dt1, handleSaveAndPrint, hd, isClosed, reset, updateTransactionState, userCode]);

  const handleActivityOption = useCallback(async (action) => {
    if (action !== "Upsert") return;

    if (!canSave || isViewDocument) {
      showReadOnlyAlert("save this transaction");
      return;
    }

    if (!dt1.length) {
      setMessage("Item details are required.");
      return;
    }

    document.activeElement?.blur?.();
    await Promise.resolve();
    await save();
  }, [canSave, dt1.length, isViewDocument, save, showReadOnlyAlert]);

  useEffect(() => {
    if (!defaultBranch) return;
    setHd((prev) => ({
      ...prev,
      branchCode: prev.branchCode || defaultBranch,
      branchName: prev.branchName || defaultBranchName,
    }));
  }, [defaultBranch, defaultBranchName]);

  useEffect(() => {
    setOnSave?.(() => () => handleActivityOption("Upsert"));
    setOnReset?.(() => reset);

    return () => {
      setOnSave?.(null);
      setOnReset?.(null);
    };
  }, [handleActivityOption, reset, setOnReset, setOnSave]);

  const cancelWO = async () => {
    if (!canCancel || isViewDocument) {
      showReadOnlyAlert("cancel this transaction");
      return;
    }
    if (!hd.woId && !hd.woNo) {
      setMessage("Save or retrieve a Work Order first.");
      return;
    }
    if (!window.confirm("Do you want to cancel this Work Order?")) return;

    try {
      setLoading(true);
      const res = await woApi.cancel( {
        branchCode: hd.branchCode || defaultBranch,
        woNo: hd.woNo,
        woId: hd.woId,
        userId: userCode,
      });

      if (!res.success) {
        setMessage(res.message || "Unable to cancel Work Order.");
        return;
      }

      setHd((prev) => ({ ...prev, woStatus: 9, cancelled: "Y" }));
      setSavedWoStatus("X");
      setMessage(res.message || "Cancelled.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateHd = (field, value) => {
    const nextHd = { ...hd, [field]: value };
    if (["batchQty", "bomQty", "stdLaborRate", "stdOverheadRate"].includes(field)) {
      setCalculatedState(nextHd, dt1);
    } else {
      setHd(nextHd);
    }
  };

  const handleDateState = (patch) => {
    const [field, value] = Object.entries(patch || {})[0] || [];
    if (!field) return;
    updateHd(field, value);
  };

  const handleBOMSelect = (bom) => {
    setLookupOpen((prev) => ({ ...prev, bom: false }));
    if (!bom) return;

    const nextHd = {
      ...hd,
      invType: bom.invType || bom.INV_TYPE || hd.invType,
      itemCode: bom.itemCode || bom.ITEM_CODE || "",
      itemName: bom.itemName || bom.ITEM_NAME || "",
      uomCode: bom.uomCode || bom.UOM_CODE || "",
      bomCode: bom.bomCode || bom.BOM_CODE || "",
      bomDate: toDateInput(bom.bomDate || bom.BOM_DATE),
      bomQty: n(bom.bomQty ?? bom.BOM_QTY),
      wcCode: bom.wcCode || bom.WC_CODE || "",
      wcName: bom.wcName || bom.WC_NAME || "",
      routeCode: bom.routeCode || bom.ROUTE_CODE || "",
      estRunTime: n(bom.estRunTime ?? bom.EST_RUNTIME ?? bom.EST_RUN_TIME),
      stdLaborRate: n(bom.stdLaborRate ?? bom.STD_LABOR_RATE),
      stdOverheadRate: n(bom.stdOverheadRate ?? bom.STD_OVERHEAD_RATE),
      acctCode: bom.acctCode || bom.ACCT_CODE || hd.acctCode,
      acctName: bom.acctName || bom.ACCT_NAME || hd.acctName,
      woStatus: hd.woStatus || "O",
    };

    setHd(recalcHeader(nextHd, dt1));
    loadBOM(nextHd.bomCode, nextHd);
  };

  const handleBranchSelect = (branch) => {
    setLookupOpen((prev) => ({ ...prev, branch: false }));
    if (!branch) return;

    setHd((prev) => ({
      ...prev,
      branchCode: branch.branchCode || "",
      branchName: branch.branchName || branch.branchCode || "",
    }));
  };

  const handleAccountSelect = (account) => {
    setLookupOpen((prev) => ({ ...prev, account: false }));
    if (!account) return;

    updateHd("acctCode", account.acctCode || "");
    setHd((prev) => ({
      ...prev,
      acctCode: account.acctCode || "",
      acctName: account.acctName || "",
    }));
  };

  const handleVendorSelect = (vendor) => {
    setLookupOpen((prev) => ({ ...prev, vendor: false }));
    if (!vendor) return;

    setHd((prev) => ({
      ...prev,
      vendCode: vendor.vendCode || "",
      vendName: vendor.vendName || "",
    }));
  };

  const displayStatus = STATUS[savedWoStatus] || "OPEN";
  const statusColor =
    displayStatus === "CANCELLED" || displayStatus === "CLOSED"
      ? "global-tran-stat-text-closed-ui"
      : displayStatus === "OPEN"
        ? "global-tran-stat-text-open-ui"
        : "global-tran-stat-text-finalized-ui";
  const documentID = hd.woId || hd.woNo;
  const isFormDisabled = isReadOnly || isViewDocument || isClosed || loading;
  const infoTabClass = (tab) =>
    `global-tran-tab-padding-ui ${
      infoTab === tab ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
    }`;
  const overUnderQty = n(hd.woQty) - n(hd.worQty);
  const overUnderAmt = n(hd.worAmt) - n(hd.woAmt);
  const woStatusOptions = [
    { value: "O", label: "O - Open" },
    { value: "C", label: "C - Closed" },
    { value: "X", label: "X - Cancelled" },
    { value: "R", label: "R - Released" },
    { value: "AC", label: "AC - Accounting Closed" },
  ];
  const tranTypeOptions = [
    { value: "JV", label: "Journal Voucher" },
    { value: "ADJ", label: "Adjustment" },
  ];

  const renderDetailCell = (column, row) => {
    const style = getDetailCellStyle(column.key, column.width);
    const baseClass = "global-tran-td-ui";
    const numberCell = (value, formatter = qty, extraClass = "") => (
      <td key={column.key} className={`${baseClass} text-right ${extraClass}`} style={style}>
        {formatter(value)}
      </td>
    );

    switch (column.key) {
      case "lineNo":
        return <td key={column.key} className={`${baseClass}`} style={style}>{String(row.lineNo).padStart(3, "0")}</td>;
      case "invType":
        return <td key={column.key} className={`${baseClass}`} style={style}>{row.invType}</td>;
      case "itemCode":
        return <td key={column.key} className={`${baseClass}`} style={style}>{row.itemCode}</td>;
      case "itemName":
      case "uomCode":
        return <td key={column.key} className={baseClass} style={style}>{row[column.key]}</td>;
      case "scrapQty":
      case "issuedQty":
        return numberCell(row[column.key], qty);
      case "issuedWac":
        return numberCell(row.issuedWac, money);
      case "issuedAmt":
      case "requiredAmt":
      case "varianceAmt":
        return numberCell(row[column.key], money);
      case "unservedQty":
        return numberCell(row.unservedQty, qty, n(row.unservedQty) > 0 ? "font-bold text-red-600" : "");
      default:
        return numberCell(row[column.key]);
    }
  };

  const handleCopy = () => {
    if (!canAdd || isViewDocument) {
      showReadOnlyAlert("copy this transaction");
      return;
    }
    if (!documentID) {
      setMessage("Retrieve or save a Work Order before copying.");
      return;
    }

    setHd((prev) => ({
      ...prev,
      woNo: "",
      woId: "",
      woDate: useGetCurrentDayV2(),
      woStatus: "O",
      cancelled: "",
      refNo1: prev.woNo || prev.refNo1 || "",
    }));
    setIsRetrieved(false);
    setSavedWoStatus("O");
    setMessage("Copied Work Order details. Save to create a new transaction.");
    setActiveTab("details");
  };

  const handleAttach = () => {
    if (!isFullAccess || isViewDocument) {
      showReadOnlyAlert("attach documents");
      return;
    }
    if (documentID) setShowAttachModal(true);
  };

  const handlePrint = () => {
    if (!documentID || !dt1.length) return;
    setShowSignatoryModal(true);
  };

  const handleCloseSignatory = async (mode = "Inline") => {
    const printMode =
      typeof mode === "string"
        ? mode
        : mode?.mode || mode?.printMode || "Inline";

    setShowSignatoryModal(false);
    setHd((prev) => ({
      ...prev,
      noReprints: printMode === "Final" ? "1" : prev.noReprints || "0",
    }));
    setLoading(true);

    try {
      await useHandlePrint(documentID, docType, printMode, userCode);
    } catch (error) {
      console.error("WO print error:", error?.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  const handleTranDocNoRetrieval = async ({ docNo, key, modalClose }) => {
    if (!docNo && !key) return;
    await loadWO(docNo, "", hd.branchCode || defaultBranch, key || "");
    setShowAllTranDocNo(Boolean(modalClose));
  };

  const handleTranDocNoSelection = ({ docNo }) => {
    reset();
    setHd((prev) => ({ ...prev, woNo: docNo || "" }));
    setShowAllTranDocNo(false);
  };

  return (
    <div className="global-tran-main-div-ui">
      {loading && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          activeTopTab={activeTab}
          showActions={activeTab === "details"}
          showBIRForm={false}
          showCopyForm={true}
          showPost={false}
          isViewDocument={isViewDocument}
          disableRouteNavigation={true}
          detailsRoute="/page/WO"
          onDetails={() => setActiveTab("details")}
          onHistory={() => setActiveTab("history")}
          onReset={reset}
          onSave={() => handleActivityOption("Upsert")}
          onCancel={cancelWO}
          onCopy={handleCopy}
          onAttach={handleAttach}
          onPrint={handlePrint}
          isSaveDisabled={!canSave || loading || isFormDisabled || !dt1.length}
          isResetDisabled={loading}
          isAttachDisabled={!isFullAccess || !documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!canAdd || !documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!canCancel || !documentID || loading || isClosed}
        />
      </div>

      {message && (
        <div className="mx-4 mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
          {message}
        </div>
      )}

      <div className={activeTab === "details" ? "" : "hidden"}>
        <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
          <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
            <h1 className="global-tran-headertext-ui">{documentTitle || "Work Order Transaction File"}</h1>
          </div>
          <div className={`global-tran-headerstat-div-ui flex items-center gap-6 ${isViewDocument ? "max-md:!mt-0" : ""}`}>
            <PermissionBadge
              permission={pagePermission}
              isReadOnly={isReadOnly}
              isFullAccess={isFullAccess}
              variant="transaction"
            />
            <div className="text-center">
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
            </div>
          </div>
        </div>

        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3" id="wo_hd">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={hd.branchName || hd.branchCode || ""}
                readOnly
                disabled={isFormDisabled || isRetrieved}
                lookupDisabled={isFormDisabled || isRetrieved}
                onLookup={() => !isFormDisabled && setLookupOpen((prev) => ({ ...prev, branch: true }))}
              />
              <FieldRenderer
                id="woNo"
                label="WO No."
                type="lookup"
                value={hd.woNo}
                allowLookupInput
                disabled={isFormDisabled || isRetrieved}
                lookupDisabled={isFormDisabled || isRetrieved}
                onChange={(val) => updateHd("woNo", val)}
                onLookup={() => setShowAllTranDocNo(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hd.woNo) {
                    e.preventDefault();
                    loadWO(hd.woNo);
                  }
                }}
              />
              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput id="woDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={hd.woDate || ""} disabled={isFormDisabled} updateState={handleDateState} />
                </div>
                <label htmlFor="woDate" className="global-ref-floating-label">WO Date</label>
              </div>
              <FieldRenderer id="refNo1" label="Ref No" type="text" value={hd.refNo1 || ""} disabled={isFormDisabled} onChange={(val) => updateHd("refNo1", val)} />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="invType" label="Inv Type" type="text" value={hd.invType || ""} disabled readOnly />
              <FieldRenderer
                id="itemCode"
                label="Item Code"
                type="lookup"
                value={hd.itemCode || ""}
                readOnly
                disabled={isFormDisabled || isRetrieved}
                lookupDisabled={isFormDisabled || isRetrieved}
                onLookup={() => !(isFormDisabled || isRetrieved) && setLookupOpen((prev) => ({ ...prev, bom: true }))}
              />
              <FieldRenderer id="itemName" label="Item Description" type="text" value={hd.itemName || ""} disabled readOnly />
              <FieldRenderer id="uomCode" label="UOM Code" type="text" value={hd.uomCode || ""} disabled readOnly />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="woStatus" label="WO Status" type="select" value={hd.woStatus || "O"} disabled={isFormDisabled} options={woStatusOptions} onChange={(val) => updateHd("woStatus", val)} />
            </div>

            <div className="col-span-full">
              <div className="relative p-2">
                <textarea id="remarks" rows={4} className="peer global-tran-textbox-remarks-ui pt-2" value={hd.remarks || ""} onChange={(e) => updateHd("remarks", e.target.value)} disabled={isFormDisabled} />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
              </div>
            </div>
          </div>
        </div>

        <div className="global-tran-subheader-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button type="button" className={infoTabClass("bom")} onClick={() => setInfoTab("bom")}>BOM Information</button>
            <button type="button" className={infoTabClass("other")} onClick={() => setInfoTab("other")}>Other Information</button>
            <button type="button" className={infoTabClass("run")} onClick={() => setInfoTab("run")}>Over/(Under) Run</button>
          </div>

          {infoTab === "bom" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 xl:grid-cols-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="bomCode" label="BOM Code" type="text" value={hd.bomCode || ""} disabled readOnly />
                <FieldRenderer id="bomDate" label="BOM Date" type="text" value={hd.bomDate || ""} disabled readOnly />
                <FieldRenderer id="bomQty" label="BOM Qty" type="amount" value={qty(hd.bomQty)} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FormattedNumberField id="batchQty" label="Batch Qty" value={hd.batchQty} decimals={6} disabled={isFormDisabled} onChange={(val) => updateHd("batchQty", val)} />
                <FieldRenderer id="woQty" label="Qty to Produce" type="amount" value={qty(hd.woQty)} disabled readOnly />
                <FieldRenderer id="worQty" label="WO Receipt Qty" type="amount" value={qty(hd.worQty)} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="totalMatcost" label="Direct Material Cost" type="amount" value={money(hd.totalMatcost)} disabled readOnly />
                <FieldRenderer id="stdLabor" label="STD Labor Cost" type="amount" value={money(hd.stdLabor)} disabled readOnly />
                <FieldRenderer id="stdOverhead" label="STD Overhead Cost" type="amount" value={money(hd.stdOverhead)} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="woAmt" label="WO Amount" type="amount" value={money(hd.woAmt)} disabled readOnly />
                <FieldRenderer id="woUnitcost" label="WO Unit Cost" type="amount" value={money(hd.woUnitcost)} disabled readOnly />
                <FieldRenderer id="worAmt" label="WOR Receipt Amount" type="amount" value={money(hd.worAmt)} disabled readOnly />
              </div>
            </div>
          )}

          {infoTab === "other" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3">
              <div className="global-tran-textbox-group-div-ui">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldRenderer id="otherRouteCode" label="Route Code" type="text" value={hd.routeCode || ""} disabled readOnly />
                  <FieldRenderer id="wcCode" label="Work Center Code" type="text" value={hd.wcCode || ""} disabled readOnly />
                </div>
                <FieldRenderer id="wcName" label="Work Center Name" type="text" value={hd.wcName || ""} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="otherVendCode"
                  label="Payee Code"
                  type="lookup"
                  value={hd.vendCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && setLookupOpen((prev) => ({ ...prev, vendor: true }))}
                />
                <FieldRenderer id="otherVendName" label="Payee Name" type="text" value={hd.vendName || ""} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="estRunTime" label="Est. Run Time" type="number" value={hd.estRunTime || 0} disabled readOnly />
                <FieldRenderer id="otherActualRuntime" label="Actual Run Time" type="number" value={hd.actualRuntime || 0} disabled={isFormDisabled} onChange={(val) => updateHd("actualRuntime", val)} />
              </div>
            </div>
          )}

          {infoTab === "run" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="runTranType" label="Transaction" type="select" value={hd.tranType || "JV"} disabled={isFormDisabled} options={tranTypeOptions} onChange={(val) => updateHd("tranType", val)} />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="runAcctCode"
                  label="Account Code"
                  type="lookup"
                  value={hd.acctCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && setLookupOpen((prev) => ({ ...prev, account: true }))}
                />
                <FieldRenderer id="runAcctName" label="Account Name" type="text" value={hd.acctName || ""} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="varQty" label="Over/Under Run Qty" type="amount" value={qty(overUnderQty)} disabled readOnly />
                <FieldRenderer id="overUnderAmt" label="Over/Under Amount" type="amount" value={money(overUnderAmt)} disabled readOnly />
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Item Details</span>
            </div>
          </div>
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_tr>td:first-child]:border-l [&_th]:border-b [&_th]:border-slate-200">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedDetailColumns.map((column) =>
                      renderDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedDetailColumns,
                      })
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {dt1.length === 0 ? (
                    <tr className="global-tran-tr-ui">
                      <td colSpan={orderedDetailColumns.length} className="global-tran-td-ui py-8 text-center text-slate-500">
                        Load a BOM to generate Work Order item details.
                      </td>
                    </tr>
                  ) : (
                    sortedDetailRows.map(({ row, originalIndex }) => (
                      <tr key={`${row.itemCode}-${originalIndex}`} className="global-tran-tr-ui">
                        {orderedDetailColumns.map((column) =>
                          renderDetailCell(column, row, originalIndex)
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {renderDetailHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui" />
            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Required Amt:</label>
                <label className="global-tran-tab-footer-total-value-ui">{money(totals.requiredAmt)}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Issued Amt:</label>
                <label className="global-tran-tab-footer-total-value-ui">{money(totals.issuedAmt)}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Variance Amt:</label>
                <label className="global-tran-tab-footer-total-value-ui">{money(totals.varianceAmt)}</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={activeTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={activeTab === "history"}
          endpoint="/getWOHistory"
          cacheKey={`WO:${hd.branchCode || ""}`}
          activeTabKey="WO_Summary"
          branchCode={hd.branchCode}
          startDate={null}
          endDate={null}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle || "Work Order"} History`}
          quantityDecimals={6}
          amountDecimals={2}
        />
      </div>

      <BranchLookupModal
        isOpen={lookupOpen.branch}
        onClose={handleBranchSelect}
      />

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{
            branchCode: hd.branchCode,
            branchName: hd.branchName,
            docType,
            documentTitle,
            fieldNo: "woNo",
          }}
          docNo={hd.woNo}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: hd.woNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => setShowAllTranDocNo(false)}
        />
      )}

      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: documentID,
            DocumentName: hsDoc?.docName || "Work Order",
            BranchName: hd.branchName,
            DocumentNo: hd.woNo,
          }}
          onClose={() => setShowAttachModal(false)}
        />
      )}

      {showSignatoryModal && (
        <DocumentSignatories
          isOpen={showSignatoryModal}
          params={{
            noReprints: hd.noReprints || "0",
            documentID,
            docType,
            docNo: hd.woNo,
          }}
          onClose={handleCloseSignatory}
          onCancel={() => setShowSignatoryModal(false)}
        />
      )}

      <BOMReferenceLookupModal
        isOpen={lookupOpen.bom}
        onClose={handleBOMSelect}
      />

      <COAMastLookupModal
        isOpen={lookupOpen.account}
        onClose={handleAccountSelect}
        title="Select Account"
      />

      <PayeeMastLookupModal
        isOpen={lookupOpen.vendor}
        onClose={handleVendorSelect}
        customParam="ActiveAll"
      />
    </div>
  );
}
