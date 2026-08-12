 import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostMSST from "./PostMSST.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";

// Configuration
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  docTypeNames,
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopVatRow,
  useTopATCRow,
  useTopRCRow,
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopVatAmount,
  useTopATCAmount,
  useTopBillCodeRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import {
  useGetCurrentDay,
  useFormatToDate,
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalvalidateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior.jsx";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";
import { User, Warehouse } from "lucide-react";


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

const getResponseValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
};

const getMSSTSaveResult = (response) => {
  const row = response?.data?.[0] || {};

  const documentNo = getResponseValue(row, [
    "msstNo",
    "MSSTNo",
    "msst_no",
    "MSST_NO",
    "docNo",
    "DOC_NO",
    "documentNo",
    "DOCUMENT_NO",
  ]);
  const documentID = getResponseValue(row, [
    "msstId",
    "MSSTId",
    "msst_id",
    "MSST_ID",
    "docId",
    "DOC_ID",
    "documentID",
    "DOCUMENT_ID",
  ]);

  return { documentNo, documentID };
};

const normalizeCode = (value) => String(value ?? "").trim().toUpperCase();

const isIntransitWarehouse = (warehouse) => {
  const whCode = normalizeCode(
    typeof warehouse === "string"
      ? warehouse
      : warehouse?.whCode || warehouse?.WH_CODE || warehouse?.warehouseCode,
  );
  const whName = normalizeCode(
    typeof warehouse === "string"
      ? ""
      : warehouse?.whName || warehouse?.WH_NAME || warehouse?.warehouseName,
  );

  return (
    whCode === "INTRANSIT" ||
    whCode === "IN-TRANSIT" ||
    whCode === "TRANSIT" ||
    whCode === "INT" ||
    whName === "INTRANSIT" ||
    whName === "IN-TRANSIT" ||
    whName === "IN TRANSIT" ||
    whName.includes("INTRANSIT") ||
    whName.includes("IN TRANSIT")
  );
};

const getWarehouseDefaultLocCode = (warehouse) => {
  if (!warehouse || typeof warehouse === "string") return "";

  return (
    warehouse?.locCode ||
    warehouse?.LOC_CODE ||
    warehouse?.loc_code ||
    warehouse?.locationCode ||
    warehouse?.LOCATION_CODE ||
    warehouse?.defaultLocCode ||
    warehouse?.DEFAULT_LOC_CODE ||
    warehouse?.default_location_code ||
    warehouse?.firstLocCode ||
    warehouse?.FIRST_LOC_CODE ||
    warehouse?.tagLocCode ||
    warehouse?.TAG_LOC_CODE ||
    ""
  );
};

const getWarehouseBranchCode = (warehouse) =>
  String(
    warehouse?.branchCode ??
      warehouse?.BRANCH_CODE ??
      warehouse?.branch_code ??
      warehouse?.BranchCode ??
      "",
  ).trim();

const MSST = () => {
  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const defaultLocationCacheRef = useRef({});
  const navigate = useNavigate();
  const location = useLocation();
  const [isViewDocument, setIsViewDocument] = useState(false);
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
  } = useAuth();
  const decQty = companyInfo?.itemDecqtyMS ?? 2;
  const decUcost = companyInfo?.itemDecUcostMS ?? 6;

  const getCurrentUserBranchCode = () =>
    String(
      currentUserRow?.branchCode ??
        currentUserRow?.BRANCH_CODE ??
        currentUserRow?.branch_code ??
        currentUserRow?.BranchCode ??
        "",
    ).trim();

  const getCurrentUserBranchName = () =>
    String(
      currentUserRow?.branchName ??
        currentUserRow?.BRANCH_NAME ??
        currentUserRow?.branch_name ??
        currentUserRow?.BranchName ??
        "",
    ).trim();

  const getCurrentUserCode = () =>
    String(
      currentUserRow?.userCode ??
        currentUserRow?.USER_CODE ??
        currentUserRow?.user_code ??
        user?.USER_CODE ??
        user?.userCode ??
        "",
    ).trim();

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);
  const isViewDocumentUrl = isViewDocument;

  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const { user } = useAuth();
  const { resetFlag } = useReset();
  const docType = docTypes.MSST;
  const hsDoc = getAllTopHSDocRow?.(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc?.docName
    ? `${hsDoc.docName} Transaction`
    : docTypeNames[docType] || "Transaction";
  const [state, setState] = useState({
    // HS Option
    glCurrMode: companyInfo?.glCurrMode || "M",
    glCurrDefault: companyInfo?.currCode || "PHP",
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
    documentDate: useGetCurrentDay(),
    documentNo: "",
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",

    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    triggerGLEntries: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    branchCode: getCurrentUserBranchCode(),
    branchName: getCurrentUserBranchName(),
    toBranchCode: "",
    toBranchName: "",
    itemSingleSelect: false,

    // Currency information
    currCode: companyInfo?.currCode || "PHP",
    currName: companyInfo?.currName || "Philippine Peso",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),

    //Other Header Info
    tblFieldArray: [],
    tranTypes: [],
    refDocNo1: "",
    refDocNo2: "",
    fromWhCode: "",
    fromWhName: "",
    fromWhDefaultLocCode: "",
    toWhCode: "",
    toWhName: "",
    toWhDefaultLocCode: "",
    remarks: "",
    selectedTranType: "",
    userCode: getCurrentUserCode(),

    //Detail 1-2
    detailRows: [],
    detailRowsGL: [],
    globalLookupRow: [],
    globalLookupHeader: [],

    totalDebit: "0.00",
    totalCredit: "0.00",
    totalDebitFx1: "0.00",
    totalCreditFx1: "0.00",
    totalDebitFx2: "0.00",
    totalCreditFx2: "0.00",

    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    showSlModal: false,
    msLookupModalOpen: false,
    warehouseLookupOpen: false,
    fromwarehouseLookupOpen: false,
    towarehouseLookupOpen: false,

    currencyModalOpen: false,
    branchModalOpen: false,
    toBranchModalOpen: false,
    custModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostingModal: false,
    showAllTranDocNo: false,
    showQstatModal: false,
    locationLookupOpen: false,
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
    documentDate,
    status,
    userCode,
    noReprints,

    activeTab,
    GLactiveTab,
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    triggerGLEntries,
    itemSingleSelect,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,

    branchCode,
    branchName,
    toBranchCode,
    toBranchName,
    currCode,
    currName,
    currRate,
    tranTypes,
    refDocNo1,
    refDocNo2,
    fromWhCode,
    fromWhName,
    fromWhDefaultLocCode,
    toWhCode,
    toWhName,
    toWhDefaultLocCode,
    remarks,
    selectedTranType,

    tblFieldArray,
    detailRows,
    detailRowsGL,
    globalLookupRow,
    globalLookupHeader,
    totalDebit,
    totalCredit,
    totalDebitFx1,
    totalCreditFx1,
    totalDebitFx2,
    totalCreditFx2,

    modalContext,
    selectionContext,
    selectedRowIndex,
    accountModalSource,

    showAccountModal,
    showRcModal,
    showVatModal,
    showAtcModal,
    showSlModal,
    currencyModalOpen,
    branchModalOpen,
    toBranchModalOpen,
    custModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostingModal,
    showAllTranDocNo,
    showQstatModal,
    msLookupModalOpen,
    warehouseLookupOpen,
    fromwarehouseLookupOpen,
    towarehouseLookupOpen,
    locationLookupOpen,
  } = state;

  const [focusedCell, setFocusedCell] = useState(null);

  const displayStatus = status || "OPEN";

  const getLocationCodeFromRow = (row) =>
    String(
      row?.locCode ??
        row?.LOC_CODE ??
        row?.locationCode ??
        row?.LOCATION_CODE ??
        row?.code ??
        row?.CODE ??
        "",
    ).trim();

  const normalizeLookupRows = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.flatMap((item) => normalizeLookupRows(item));
    }

    if (typeof value === "string") {
      try {
        return normalizeLookupRows(JSON.parse(value));
      } catch {
        return [];
      }
    }

    const resultValue =
      value?.result ??
      value?.RESULT ??
      value?.data?.[0]?.result ??
      value?.data?.[0]?.RESULT ??
      value?.data?.result ??
      value?.data?.RESULT;

    if (resultValue) {
      return normalizeLookupRows(resultValue);
    }

    if (Array.isArray(value?.data)) {
      return value.data.flatMap((item) => normalizeLookupRows(item));
    }

    return [value];
  };

  const getFirstLocationCodeByWarehouse = async (whCode) => {
    const warehouseCode = String(whCode || "").trim();
    if (!warehouseCode) return "";
    if (isIntransitWarehouse(warehouseCode)) return "INTRANSIT";

    const cacheKey = normalizeCode(warehouseCode);
    if (defaultLocationCacheRef.current[cacheKey] !== undefined) {
      return defaultLocationCacheRef.current[cacheKey];
    }

    const requestPayload = {
      userCode,
      branchCode,
      filter: "ActiveAll",
      whCode: warehouseCode,
      whouseCode: warehouseCode,
      warehouseCode,
    };

    const endpoints = ["getLocation", "getLocationRef", "getLocRef", "getWarehouseLocation"];

    for (const endpoint of endpoints) {
      try {
        const response = await fetchDataJson(endpoint, requestPayload);
        const rows = normalizeLookupRows(response).filter((item) => {
          const locCode = getLocationCodeFromRow(item);
          const itemWhCode = String(
            item?.whCode ??
              item?.WH_CODE ??
              item?.whouseCode ??
              item?.WHOUSE_CODE ??
              item?.warehouseCode ??
              item?.WAREHOUSE_CODE ??
              "",
          ).trim();

          return locCode && (!itemWhCode || normalizeCode(itemWhCode) === cacheKey);
        });

        const firstLocCode = getLocationCodeFromRow(rows[0]);
        if (firstLocCode) {
          defaultLocationCacheRef.current[cacheKey] = firstLocCode;
          return firstLocCode;
        }
      } catch {
        // Try the next possible location endpoint.
      }
    }

    defaultLocationCacheRef.current[cacheKey] = "";
    return "";
  };

  const getDropdownValue = (row, keys) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  };

  const getTranTypeCode = (row) =>
    String(
      getDropdownValue(row, [
        "DROPDOWN_CODE",
        "dropdownCode",
        "dropdown_code",
        "code",
        "value",
      ]),
    ).trim();

  const getTranTypeName = (row) =>
    String(
      getDropdownValue(row, [
        "DROPDOWN_NAME",
        "dropdownName",
        "dropdown_name",
        "name",
        "label",
      ]),
    ).trim();

  const getTranTypeColumn = (tranTypeCode = selectedTranType, list = tranTypes) => {
    const row = (list || []).find(
      (x) => normalizeCode(getTranTypeCode(x)) === normalizeCode(tranTypeCode),
    );

    return normalizeCode(
      getDropdownValue(row, [
        "DROPDOWN_COLUMN",
        "dropdownColumn",
        "dropdown_column",
        "column",
      ]),
    );
  };

  // Helper Functions for strict Branch Flow identification
// Helper Functions for strict Branch Flow identification
  const isInterBranch = (tranTypeCode = selectedTranType, list = tranTypes) => {
    const row = (list || []).find(
      (x) => normalizeCode(getTranTypeCode(x)) === normalizeCode(tranTypeCode),
    );
    if (!row) return false;
    const name = getTranTypeName(row);
    const code = getTranTypeCode(row);
    return normalizeCode(name).includes("INTER BRANCH") || normalizeCode(code) === "MSST04" || normalizeCode(code) === "IB";
  };

  const isIntransitToBranch = (tranTypeCode = selectedTranType, list = tranTypes) => {
    const row = (list || []).find(
      (x) => normalizeCode(getTranTypeCode(x)) === normalizeCode(tranTypeCode),
    );
    if (!row) return false;
    const name = getTranTypeName(row);
    const code = getTranTypeCode(row);
    // INW/MSST01 is Intransit to Warehouse only, so it should not require Branch selection.
    return normalizeCode(name).includes("INTRANSIT TO BRANCH") || normalizeCode(code) === "MSST03" || normalizeCode(code) === "INB";
  };

  const isIntransitToWarehouse = (tranTypeCode = selectedTranType, list = tranTypes) => {
    const row = (list || []).find(
      (x) => normalizeCode(getTranTypeCode(x)) === normalizeCode(tranTypeCode),
    );
    if (!row) return false;
    const name = normalizeCode(getTranTypeName(row));
    const code = normalizeCode(getTranTypeCode(row));
    return (
      name.includes("INTRANSIT TO WAREHOUSE") ||
      name.includes("INTRANSIT TO WARE HOUSE") ||
      code === "MSST01" ||
      code === "INW"
    );
  };

  const isIntransitTransfer = (tranTypeCode = selectedTranType, list = tranTypes) =>
    isIntransitToWarehouse(tranTypeCode, list) || isIntransitToBranch(tranTypeCode, list);

  const isBranchTransfer = (tranTypeCode = selectedTranType, list = tranTypes) =>
    isInterBranch(tranTypeCode, list) || isIntransitToBranch(tranTypeCode, list);

  const requiresBranchSelection = (tranTypeCode = selectedTranType, list = tranTypes) => {
    return isInterBranch(tranTypeCode, list) || isIntransitToBranch(tranTypeCode, list);
  };

  const isWarehouseTransfer = (tranTypeCode = selectedTranType, list = tranTypes) =>
    getTranTypeColumn(tranTypeCode, list) === "WH_TRANSFER" || 
    getTranTypeColumn(tranTypeCode, list) === "BRANCH_TRANSFER";

  // Disable detail lookup/search buttons for Inter Warehouse and Inter Branch flows.
  // Uses code, name, and dropdown_column so it still works even if the setup code changes.
  const isInterWarehouseOrInterBranch = (tranTypeCode = selectedTranType, list = tranTypes) => {
    const normalizedCode = normalizeCode(tranTypeCode);
    const column = getTranTypeColumn(tranTypeCode, list);
    const row = (list || []).find(
      (x) => normalizeCode(getTranTypeCode(x)) === normalizedCode,
    );
    const name = normalizeCode(getTranTypeName(row));

    return (
      ["IW", "IB", "MSST02", "MSST04"].includes(normalizedCode) ||
      ["WH_TRANSFER", "BRANCH_TRANSFER"].includes(column) ||
      name.includes("INTER WAREHOUSE") ||
      name.includes("INTER WARE HOUSE") ||
      name.includes("INTER BRANCH")
    );
  };

  const hideFromWarehouseAndLocationSearch = (tranTypeCode = selectedTranType, list = tranTypes) =>
    isInterWarehouseOrInterBranch(tranTypeCode, list) || isIntransitTransfer(tranTypeCode, list);


  const normalizeTranDropDownResponse = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.flatMap((x) => normalizeTranDropDownResponse(x));
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return normalizeTranDropDownResponse(parsed);
      } catch {
        return [];
      }
    }

    const resultValue =
      value?.result ??
      value?.RESULT ??
      value?.data?.[0]?.result ??
      value?.data?.[0]?.RESULT ??
      value?.data?.result ??
      value?.data?.RESULT;

    if (resultValue) {
      return normalizeTranDropDownResponse(resultValue);
    }

    if (Array.isArray(value?.data)) {
      return value.data.flatMap((x) => normalizeTranDropDownResponse(x));
    }

    return [value];
  };

  const getTranTypeUserCode = (row) =>
    normalizeCode(
      getDropdownValue(row, [
        "USER_CODE",
        "userCode",
        "user_code",
        "USERID",
        "userId",
      ]),
    );

  const getTranTypeBranchCode = (row) =>
    normalizeCode(
      getDropdownValue(row, [
        "BRANCH_CODE",
        "branchCode",
        "branch_code",
        "BRANCH",
        "branch",
      ]),
    );

  const isTranTypeAllowedForUser = (row) => {
    const rowUserCode = getTranTypeUserCode(row);
    const rowBranchCode = getTranTypeBranchCode(row);
    const currentUserCode = normalizeCode(getCurrentUserCode());
    const currentBranchCode = normalizeCode(getCurrentUserBranchCode());

    const isUserMatched = !rowUserCode || !currentUserCode || rowUserCode === currentUserCode;
    const isBranchMatched = !rowBranchCode || !currentBranchCode || rowBranchCode === currentBranchCode;

    return isUserMatched && isBranchMatched;
  };

  const mergeTranTypes = (...sources) => {
    const merged = [];
    const seen = new Set();

    sources
      .flatMap((source) => normalizeTranDropDownResponse(source))
      .forEach((row) => {
        const code = getTranTypeCode(row);
        const name = getTranTypeName(row);
        if (!code || !name) return;

        const docCode = normalizeCode(
          getDropdownValue(row, [
            "DOC_CODE",
            "docCode",
            "doc_code",
            "DOCUMENT_CODE",
            "documentCode",
            "document_code",
          ]),
        );

        const type = normalizeCode(
          getDropdownValue(row, [
            "DROPDOWN_TYPE",
            "dropdownType",
            "dropdown_type",
            "TYPE",
            "type",
          ]),
        );

        if (docCode && docCode !== normalizeCode(docType)) return;
        if (type && type !== "TRAN_TYPE") return;
        if (!isTranTypeAllowedForUser(row)) return;

        const key = normalizeCode(code);
        if (seen.has(key)) return;

        seen.add(key);
        merged.push(row);
      });

    return merged;
  };

  const getDefaultTranType = (list = tranTypes) => {
    const rows = list || [];
    return (
      getTranTypeCode(
        rows.find(
          (x) =>
            normalizeCode(
              getDropdownValue(x, [
                "DROPDOWN_COLUMN",
                "dropdownColumn",
                "dropdown_column",
                "column",
              ]),
            ) === "WH_TRANSFER",
        ),
      ) ||
      getTranTypeCode(rows[0]) ||
      ""
    );
  };

  const applyTranTypes = (rows) => {
    updateState({
      tranTypes: rows,
      selectedTranType:
        selectedTranType && rows.some((x) => getTranTypeCode(x) === selectedTranType)
          ? selectedTranType
          : getDefaultTranType(rows),
    });
  };

  const loadTranTypes = async ({ allowDbFallback = true } = {}) => {
    const cached1 = getAllDropDown?.("TRAN_TYPE", docType) || [];
    const cached2 = getAllDropDown?.(docType, "TRAN_TYPE") || [];
    const cachedRows = mergeTranTypes(cached1, cached2);

    // Use the AuthContext cached dropdown first so transaction page loading is shorter.
    if (cachedRows.length > 0) {
      applyTranTypes(cachedRows);
      return cachedRows;
    }

    if (!allowDbFallback) {
      updateState({ tranTypes: [], selectedTranType: "" });
      return [];
    }

    const [dbRows1, dbRows2] = await Promise.all([
      useTopDocDropDown(docType, "TRAN_TYPE").catch((error) => {
        console.warn("Unable to load MSST TRAN_TYPE using docType/type order.", error);
        return [];
      }),
      useTopDocDropDown("TRAN_TYPE", docType).catch((error) => {
        console.warn("Unable to load MSST TRAN_TYPE using type/docType order.", error);
        return [];
      }),
    ]);

    const rows = mergeTranTypes(dbRows1, dbRows2);

    if (rows.length > 0) {
      applyTranTypes(rows);
    } else {
      updateState({ tranTypes: [], selectedTranType: "" });
    }

    return rows;
  };

  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const isFormDisabled =
    isViewDocumentUrl ||
    ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  const [totals, setTotals] = useState({
    totalQuantity: "0.00",
    totalItemAmount: "0.00",
  });

  const customParamMap = {
    invAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;

  const updateTotalsDisplay = (quantity, amount) => {
    setTotals({
      totalQuantity: formatNumber(quantity, decQty),
      totalItemAmount: formatNumber(amount),
    });
  };

  useEffect(() => {
    const debitSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0,
    );
    const creditSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0,
    );
    const debitFx1Sum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0),
      0,
    );
    const creditFx1Sum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0),
      0,
    );
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
    });
  }, [detailRowsGL]);

  useEffect(() => {
    if (resetFlag) {
      handleReset();
    }
    let timer;
    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 600);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(timer);
  }, [resetFlag, isLoading]);

  useEffect(() => {
    if (triggerGLEntries) {
      handleActivityOption("GenerateGL").then(() => {
        updateState({ triggerGLEntries: false });
      });
    }
  }, [triggerGLEntries]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    if (!currentUserRow && !user) return;
    loadCompanyData();
    handleReset();
  }, [currentUserRow, user]);

  useEffect(() => {
    const userBranchCode = getCurrentUserBranchCode();
    const userBranchName = getCurrentUserBranchName();

    if (!state.documentID && !state.branchCode && userBranchCode) {
      updateState({
        branchCode: userBranchCode,
        branchName: userBranchName,
        userCode: getCurrentUserCode(),
      });
    }
  }, [currentUserRow]);

  useEffect(() => {
    if (!refsLoaded) return;
    loadTranTypes({ allowDbFallback: false });
  }, [docType, refsLoaded, currentUserRow]);

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
    clearMsstDetailSorting();
    clearMsstGlSorting();

    updateState({
      branchCode: getCurrentUserBranchCode(),
      branchName: getCurrentUserBranchName(),
      userCode: getCurrentUserCode(),
      documentDate: useGetCurrentDayV2(),

      fromWhCode: "",
      fromWhName: "",
      fromWhDefaultLocCode: "",
      toWhCode: "",
      toWhName: "",
      toWhDefaultLocCode: "",
      toBranchCode: "",
      toBranchName: "",
      refDocNo1: "",
      refDocNo2: "",
      remarks: "",
      noReprints: "0",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      itemSingleSelect: false,
      selectedTranType: getDefaultTranType(),

      activeTab: "basic",
      GLactiveTab: "invoice",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "Open",
    });

    updateTotalsDisplay(0, 0);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const tbls = "msst_hd,msst_dt1,msst_dt2";
      const [loadedTranTypes, docRow, hsOption, hdtblcol_result] = await Promise.all([
        loadTranTypes(),
        useTopDocControlRow(docType),
        useTopHSOption(),
        useFieldLenghtCheck(tbls),
      ]);

      const updates = {
        userCode: getCurrentUserCode(),
        branchCode: getCurrentUserBranchCode() || branchCode,
        branchName: getCurrentUserBranchName() || branchName,
      };

      if (docRow) {
        updates.documentName = docRow.docName;
        updates.documentSeries = docRow.docSeries;
        updates.documentDocLen = docRow.docLength;
      }

      if (hsOption) {
        updates.glCurrMode = hsOption.glCurrMode;
        updates.glCurrDefault = hsOption.glCurrDefault;
        updates.currCode = hsOption.glCurrDefault;
        updates.glCurrGlobal1 = hsOption.glCurrGlobal1;
        updates.glCurrGlobal2 = hsOption.glCurrGlobal2;
        updates.glCurrGlobal3 = hsOption.glCurrGlobal3;

        const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
        if (curr) {
          updates.currName = curr.currName;
          updates.currRate = formatNumber(1, 6);
        }
      }

      if (hdtblcol_result) {
        updates.tblFieldArray = hdtblcol_result;
      }

      if (!selectedTranType && loadedTranTypes.length > 0) {
        updates.selectedTranType = getDefaultTranType(loadedTranTypes);
      }

      updateState(updates);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const loadCurrencyMode = (
    mode = glCurrMode,
    defaultCurr = glCurrDefault,
    curr = currCode,
  ) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 =
      (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

    updateState({
      glCurrMode: mode,
      withCurr2: calcWithCurr2,
      withCurr3: calcWithCurr3,
    });
  };

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotals([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "msstNo",
        direction,
      );

      if (!data?.msstId) {
        useSwalInfoAlert("No Records Found", "Transaction does not exist.");
        return resetState();
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        quantity: formatNumber(item.quantity, decQty),
        unitCost: formatNumber(item.unitCost, decUcost),
        itemAmount: formatNumber(item.itemAmount, 2),
        qtyHand: formatNumber(item.qtyHand, decQty),
        whouseCode: item.frmwhouseCode || item.whouseCode || "",
        toWHcode: item.towhouseCode || item.toWHcode || "",
        locCode: item.frmlocCode || item.locCode || "",
        tolocCode: item.tolocCode || "",
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
      }));

      updateState({
        documentStatus: data.msstStatus,
        status: data.docStatus,
        noReprints: data.noReprints,
        documentID: data.msstId,
        documentNo: data.msstNo,
        branchCode: data.branchCode,
        documentDate: useformatToDatev2(data.msstDate),
        selectedTranType: data.tranType || data.tran_type || getDefaultTranType(),
        toBranchCode: data.toBranchCode || data.to_branch_code || "",
        toBranchName: data.toBranchName || data.to_branch_name || "",
        fromWhCode: data.frmwhouseCode || data.fromWhCode || data.from_wh || "",
        fromWhName: data.frmwhouseName || data.fromWhName || data.from_wh_name || "",
        fromWhDefaultLocCode: "",
        toWhCode: data.towhouseCode || data.toWhCode || data.to_wh || "",
        toWhName: data.towhouseName || data.toWhName || data.to_wh_name || "",
        toWhDefaultLocCode: "",
        refDocNo1: data.refDocNo1,
        refDocNo2: data.refDocNo2,
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      updateTotals(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      useSwalErrorAlert(
        "Fetch Error",
        error?.message || "Unable to fetch transaction data.",
      );
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
    if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
      return;
    }

    if (!validateInterWarehouseFlow()) {
      return;
    }

    if (action === "Upsert") {
      for (let i = 0; i < detailRows.length; i++) {
        const row = detailRows[i];
        if (row.whouseCode && !row.locCode?.trim()) {
          useSwalErrorAlert("Validation Error", `Row ${i + 1}: From Location code is required for the selected From Warehouse.`);
          updateState({ isLoading: false });
          return;
        }
        if (row.toWHcode && !row.tolocCode?.trim()) {
          useSwalErrorAlert("Validation Error", `Row ${i + 1}: To Location code is required for the selected To Warehouse.`);
          updateState({ isLoading: false });
          return;
        }
      }
    }

    const getFormattedPayload = (targetGLRows) => {
      const {
        branchCode,
        toBranchCode,
        toBranchName,
        documentNo,
        documentID,
        documentDate,
        selectedTranType,
        fromWhCode,
        toWhCode,
        refDocNo1,
        refDocNo2,
        remarks,
        userCode,
        detailRows,
      } = state;

      return {
        branchCode: branchCode,
        toBranchCode: requiresBranchSelection() ? toBranchCode || "" : "",
        toBranchName: requiresBranchSelection() ? toBranchName || "" : "",
        msstNo: documentNo || "",
        msstId: documentID || "",
        msstDate: documentDate,
        tranType: selectedTranType || getDefaultTranType(),
        fromWhCode: fromWhCode || "",
        toWhCode: toWhCode || "",
        refDocNo1: refDocNo1,
        refDocNo2: refDocNo2,
        remarks: remarks || "",
        userCode: userCode,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          categCode: row.categCode || "",
          quantity: parseFormattedNumber(row.quantity || 0),
          uomCode: row.uomCode || "",
          unitCost: parseFormattedNumber(row.unitCost || 0),
          itemAmount: parseFormattedNumber(row.itemAmount || 0),
          lotNo: row.lotNo || "",
          qstatCode: row.qstatCode || "",
          bbDate: row.bbDate || null,
          qtyHand: parseFormattedNumber(row.qtyHand || 0),
          trantype: selectedTranType || getDefaultTranType(),
          whouseCode: row.whouseCode || row.frmwhouseCode || fromWhCode || "",
          toWHcode: row.toWHcode || row.towhouseCode || toWhCode || "",
          locCode: row.locCode || row.frmlocCode || "",
          frmwhouseCode: row.frmwhouseCode || row.whouseCode || fromWhCode || "",
          towhouseCode: row.towhouseCode || row.toWHcode || toWhCode || "",
          frmlocCode: row.frmlocCode || row.locCode || "",
          tolocCode: row.tolocCode || "",
          acctCode: row.acctCode || "",
          rcCode: row.rcCode || "",
          slTypeCode: row.sltypeCode || "",
          slCode: row.slCode || "",
          uniqueKey: row.uniqueKey || "",
          operation: row.operation || "",
        })),
        dt2: targetGLRows.map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || "",
          vatCode: entry.vatCode || "",
          vatName: entry.vatName || "",
          atcCode: entry.atcCode || "",
          atcName: entry.atcName || "",
          debit: parseFormattedNumber(entry.debit || 0),
          credit: parseFormattedNumber(entry.credit || 0),
          debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
          creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
          debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
          creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
          slRefNo: entry.slRefNo || "",
          slRefDate: entry.slRefDate || null,
          remarks: entry.remarks || "",
        })),
      };
    };

    updateState({ isLoading: true });

    try {
      let currentGL = [...state.detailRowsGL];

      if (
        action === "Upsert" &&
        currentGL.length === 0 &&
        selectedTranType !== "BB"
      ) {
        const genPayload = getFormattedPayload([]);
        const newGlEntries = await useGenerateGLEntries(docType, genPayload);

        if (newGlEntries && newGlEntries.length > 0) {
          currentGL = newGlEntries;
          updateState({ detailRowsGL: newGlEntries });
        } else {
          updateState({ isLoading: false });
          console.warn("GL Generation failed. Upsert cancelled.");
          return;
        }
      }

      if (action === "GenerateGL") {
        try {
          updateState({ detailRowsGL: [], isGeneratingGL: true });
          const genPayload = getFormattedPayload(currentGL);
          const newGlEntries = await useGenerateGLEntries(docType, genPayload);
          updateState({
            detailRowsGL:
              newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
            isGeneratingGL: false,
          });
        } catch (error) {
          updateState({ detailRowsGL: [], isGeneratingGL: false });
          console.error(error);
        }
        return;
      }

      if (action === "Upsert") {
        const savePayload = getFormattedPayload(currentGL);

        const response = await useTransactionUpsert(
          docType,
          savePayload,
          updateState,
          "msstId",
          "msstNo",
        );

        if (response) {
          const { documentNo: responseDocNo, documentID: responseDocId } =
            getMSSTSaveResult(response);

          if (responseDocNo) {
            await fetchTranData(responseDocNo, branchCode);
          }

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        }

        const { documentNo: savedDocumentNo, documentID: savedDocumentID } =
          getMSSTSaveResult(response);

        updateState({
          ...(savedDocumentNo ? { documentNo: savedDocumentNo } : {}),
          ...(savedDocumentID ? { documentID: savedDocumentID } : {}),
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    } catch (error) {
      console.error("Error in transaction flow:", error);
      useSwalErrorAlert(
        "Transaction Error",
        error?.message || `Unable to complete ${action}.`,
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const createEmptyDetailRow = () => ({
    lnNo: "",
    itemCode: "",
    itemName: "",
    categCode: "",
    quantity: "1.00",
    uomCode: "",
    unitCost: "0.00",
    itemAmount: "0.00",
    lotNo: "",
    qstatCode: "",
    bbDate: "",
    qtyHand: "0.00",
    whouseCode: fromWhCode || "",
    toWHcode: toWhCode || "",
    locCode: isIntransitWarehouse(fromWhCode || "") ? "INTRANSIT" : (fromWhDefaultLocCode || ""), 
    tolocCode: isIntransitWarehouse(toWhCode || "") ? "INTRANSIT" : (toWhDefaultLocCode || ""), 
    acctCode: "",
    rcCode: "",
    sltypeCode: "",
    slCode: "",
    uniqueKey: "",
    operation: "",
  });

  const handleGetItem = async (index = null) => {
    if (!selectedTranType) return;

    const updatedRows = [...detailRows];
    const newRow = createEmptyDetailRow();

    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, newRow);
    } else {
      updatedRows.push(newRow);
    }

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleAddRow = async () => {
    const fieldsToCheck = {
      "Header : From Warehouse": fromWhCode,
      "Header : To Warehouse": toWhCode,
      "Header : Tran Type": selectedTranType,
    };

    if (isInterBranch()) fieldsToCheck["Header : To Branch"] = toBranchCode;
    if (isIntransitToBranch()) fieldsToCheck["Header : From Branch"] = toBranchCode;

    const isValid = await useSwalvalidateRequiredFields(
      fieldsToCheck,
      "Add Item",
    );
    if (!isValid) return;

    await handleOpenMSLookup(false);
    return;
  };

  const handleItem = async (index) => {
    if (!selectedTranType) return;

    const fieldsToCheck = {
      "Header : From Warehouse": fromWhCode,
      "Header : Tran Type": selectedTranType,
    };
    const isValid = await useSwalvalidateRequiredFields(
      fieldsToCheck,
      "Item Lookup",
    );
    if (!isValid) return;

    updateState({ selectedRowIndex: index });
    await handleOpenMSLookup(true);
    return;
  };

  const createEmptyGlRow = () => ({
    acctCode: "",
    rcCode: "",
    sltypeCode: "SU",
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
  });

  const handleAddRowGL = (index = null) => {
    if (!selectedTranType) return;

    const updatedRows = [...detailRowsGL];
    const newRow = createEmptyGlRow();

    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, newRow);
    } else {
      updatedRows.push(newRow);
    }

    updateState({
      detailRowsGL: updatedRows,
      ...getGLTotalsState(updatedRows),
    });
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
    });
    updateTotals(updatedRows);
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows });
  };

  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }
    if (documentID) {
      updateState({ showSignatoryModal: true });
    }
  };

  const handlePost = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }

    if (documentID && documentStatus === "") {
      updateState({ showPostingModal: true });
    }
  };

  const handleCancel = async () => {
    if (!documentID) {
      useSwalInfoAlert(
        "Cancel Transaction",
        "Please retrieve or save a transaction before cancelling.",
      );
      return;
    }

    if (["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus)) {
      useSwalInfoAlert(
        "Cancel Transaction",
        `This transaction is already ${displayStatus.toLowerCase()}.`,
      );
      return;
    }

    if (!detailRows || detailRows.length === 0) {
      useSwalInfoAlert("Cancel Transaction", "No item details found to cancel.");
      return;
    }

    if (documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handleAttach = async () => {
    if (documentID) {
      updateState({ showAttachModal: true });
    }
  };

  const handleCopy = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        documentDate: useGetCurrentDay(),
        noReprints: "0",
      });
    }
  };

  const handleFieldBehavior = (option) => {
    switch (option) {
      case "hiddenBBMode":
        return selectedTranType === "BB";

      case "hiddenCAMode":
        return selectedTranType === "CA";

      default:
        return false;
    }
  };

  const handleColumnLabel = (columnName) => {
    switch (columnName) {
      case "UnitCost":
        if (selectedTranType === "CA") {
          return "Amount";
        }
        return "Unit Cost";

      default:
        return "";
    }
  };

  const msstDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Description", width: 260 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 120 },
    { key: "unitCost", label: handleColumnLabel("UnitCost"), width: 130 },
    { key: "itemAmount", label: "Amount", width: 130 },
    { key: "lotNo", label: "Lot No", width: 130 },
    { key: "bbDate", label: "BB Date", width: 130 },
    { key: "qstatCode", label: "Quality Status", width: 130 },
    { key: "whouseCode", label: "From Warehouse", width: 140 },
    { key: "toWHcode", label: "To Warehouse", width: 140 },
    { key: "locCode", label: "From Location", width: 130 },
    { key: "tolocCode", label: "To Location", width: 130 },
    { key: "acctCode", label: "Account Code", width: 130 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "qtyHand", label: "Qty On Hand", width: 130 },
    { key: "categCode", label: "Category", width: 120 },
    { key: "uniqueKey", label: "Unique Key", width: 120 },
    { key: "operation", label: "Operation", width: 120 },
  ];
  const visibleMsstDetailColumns = msstDetailColumnDefs.filter((column) => {
    if (["categCode", "uniqueKey", "operation", "sltypeCode"].includes(column.key)) return false;
    if (["quantity", "itemAmount"].includes(column.key)) return !handleFieldBehavior("hiddenCAMode");
    if (["acctCode", "rcCode", "slCode"].includes(column.key)) return !handleFieldBehavior("hiddenBBMode");
    return true;
  });
  const {
    getSortedRows: getSortedMsstDetailRows,
    clearAllSorting: clearMsstDetailSorting,
    renderHeaderContextMenu: renderMsstDetailHeaderContextMenu,
    renderResizableHeader: renderMsstDetailHeader,
  } = useResizableTableColumns(visibleMsstDetailColumns);
  const sortedMsstDetailRows = getSortedMsstDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const msstGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
    { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
    ...(withCurr2 ? [
      { key: "debitFx1", label: `Debit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
      { key: "creditFx1", label: `Credit (${withCurr3 ? glCurrGlobal2 : currCode})`, width: 140 },
    ] : []),
    ...(withCurr3 ? [
      { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
      { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
    ] : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 130 },
    { key: "remarks", label: "Remarks", width: 160 },
  ];
  const {
    getSortedRows: getSortedMsstGlRows,
    clearAllSorting: clearMsstGlSorting,
    renderHeaderContextMenu: renderMsstGlHeaderContextMenu,
    renderResizableHeader: renderMsstGlHeader,
  } = useResizableTableColumns(msstGlColumnDefs);
  const sortedMsstGlRows = getSortedMsstGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0,
    );
    const creditSum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0,
    );
    const debitFx1Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0),
      0,
    );
    const creditFx1Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0),
      0,
    );
    const debitFx2Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0),
      0,
    );
    const creditFx2Sum = sourceRows.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0),
      0,
    );
    return {
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
      totalDebitFx2: formatNumber(debitFx2Sum),
      totalCreditFx2: formatNumber(creditFx2Sum),
    };
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
      cleanUrl();
    },
    [fetchTranData, cleanUrl],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("msstNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  const updateTotals = (rows) => {
    let totalQuantity = 0;
    let totalItemAmount = 0;

    rows.forEach((row) => {
      const item_Quantity = parseFormattedNumber(row.quantity || 0) || 0;
      const item_ItemAmount = parseFormattedNumber(row.itemAmount || 0) || 0;

      totalQuantity += item_Quantity;
      totalItemAmount += item_ItemAmount;
    });
    updateTotalsDisplay(totalQuantity, totalItemAmount);
  };

  const handleDetailChange = async (
    index,
    field,
    value,
    runCalculations = true,
  ) => {
    const updatedRows = [...(detailRowsRef.current || [])];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    };

    const row = updatedRows[index];
    const autoFillBlanks = async (fieldName, newValue, extraData = {}) => {
      if (index === 0) {
        const hasBlanks = updatedRows.some(
          (r, i) =>
            i !== 0 && (!r[fieldName] || r[fieldName].toString().trim() === ""),
        );

        const fieldLabels = {
          acctCode: "Account Code",
          rcCode: "RC Code",
          slCode: "SL Code",
          whouseCode: "Warehouse",
          locCode: "Location",
          toWHcode: "To Warehouse",
          tolocCode: "To Location",
          qstatCode: "Quality Status",
        };

        if (hasBlanks) {
          const result = await Swal.fire({
            title: "Replicate Data?",
            text: `Do you want to copy this ${fieldLabels[field]} to all blank rows?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, copy it!",
            cancelButtonText: "No",
          });

          if (result.isConfirmed) {
            updatedRows.forEach((r, i) => {
              if (
                i !== 0 &&
                (!r[fieldName] || r[fieldName].toString().trim() === "")
              ) {
                updatedRows[i] = {
                  ...r,
                  [fieldName]: newValue,
                  ...extraData,
                };
              }
            });
            updateState({ detailRows: [...updatedRows] });
          }
        }
      }
    };

    if (field === "acctCode") {
      row.acctCode = value.acctCode;
      await autoFillBlanks("acctCode", value.acctCode);
    }

    if (field === "rcCode") {
      row.rcCode = value.rcCode;
      await autoFillBlanks("rcCode", value.rcCode);
    }

    if (field === "slCode") {
      row.slCode = value.slCode;
      row.sltypeCode = value.sltypeCode;
      await autoFillBlanks("slCode", value.slCode, {
        sltypeCode: value.sltypeCode,
      });
    }

    if (field === "whouseCode") {
      const defaultLocCode = isIntransitWarehouse(value)
        ? "INTRANSIT"
        : getWarehouseDefaultLocCode(value) || await getFirstLocationCodeByWarehouse(value.whCode);

      row.whouseCode = value.whCode;
      row.frmwhouseCode = value.whCode;
      row.locCode = defaultLocCode || "";
      row.frmlocCode = defaultLocCode || "";

      await autoFillBlanks("whouseCode", value.whCode);
      await autoFillBlanks("locCode", defaultLocCode || "", {
        frmlocCode: defaultLocCode || "",
      });
    }

    if (field === "toWHcode") {
      const defaultLocCode = isIntransitWarehouse(value)
        ? "INTRANSIT"
        : getWarehouseDefaultLocCode(value) || await getFirstLocationCodeByWarehouse(value.whCode);

      row.toWHcode = value.whCode;
      row.towhouseCode = value.whCode;
      row.tolocCode = defaultLocCode || "";

      await autoFillBlanks("toWHcode", value.whCode);
      await autoFillBlanks("tolocCode", defaultLocCode || "");
    }

    if (field === "locCode") {
      row.locCode = value.locCode;
      await autoFillBlanks("locCode", value.locCode);
    }

    if (field === "tolocCode") {
      row.tolocCode = value.locCode;
      await autoFillBlanks("tolocCode", value.locCode);
    }

    if (field === "qstatCode") {
      row.qstatCode = value.qstatCode;
      await autoFillBlanks("qstatCode", value.qstatCode);
    }

    if (["bbDate"].includes(field)) {
      row[field] = value;
    }

if (field === "itemCode") {
      row["itemCode"] = value.itemCode;
      row["itemName"] = value.itemName;
      row["uomCode"] = value.uomCode;
      row["categCode"] = value.categCode;
      

      const invAccountCode = value.invAcct ?? value.invAcctCode ?? value.INV_ACCT ?? value.acctCode ?? value.ACCT_CODE ?? "";
      if (invAccountCode) {
        row["acctCode"] = invAccountCode;

        autoFillBlanks("acctCode", invAccountCode);
      }

      row["unitCost"] = formatNumber(
        parseFormattedNumber(value.unitCost || row.unitCost || 0),
        decUcost,
      );
    }

    if (runCalculations) {
      const origQuantity = parseFormattedNumber(row.quantity) || 0;
      const origUnitCost = parseFormattedNumber(row.unitCost) || 0;
      const origQtyHand = parseFormattedNumber(row.qtyHand) || 0;

      const recalcRow = async () => {
        let processedQty = Math.abs(origQuantity);

        if (processedQty > origQtyHand) {
          useSwalErrorAlert(
            "Exceeds Stock",
            `Quantity (${processedQty}) exceeds Quantity on Hand (${origQtyHand}). Value has been adjusted.`,
          );
          processedQty = origQtyHand;
        }

        processedQty = Math.abs(processedQty);

        const finalQtyForMath = processedQty;
        const calculatedAmount = +(finalQtyForMath * origUnitCost).toFixed(2);

        row.itemAmount = formatNumber(calculatedAmount);
        row.quantity = formatNumber(processedQty, decQty);
        row.unitCost = formatNumber(origUnitCost, decUcost);
      };

      if (field === "quantity" || field === "unitCost") {
        await recalcRow();
      }
    }

    updatedRows[index] = row;
    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
    });
    updateTotals(updatedRows);
  };

  const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
    let row = { ...updatedRowsGL[index] };

    if (
      [
        "acctCode",
        "slCode",
        "rcCode",
        "sltypeCode",
        "vatCode",
        "atcCode",
      ].includes(field)
    ) {
      const data = await useUpdateRowGLEntries(row, field, value, "", docType);
      if (data) {
        row.acctCode = data.acctCode;
        row.sltypeCode = data.sltypeCode;
        row.slCode = data.slCode;
        row.rcCode = data.rcCode;
        row.vatCode = data.vatCode;
        row.vatName = data.vatName;
        row.atcCode = data.atcCode;
        row.atcName = data.atcName;
        row.particular = data.particular;
      }
    }

    if (
      [
        "debit",
        "credit",
        "debitFx1",
        "creditFx1",
        "debitFx2",
        "creditFx2",
      ].includes(field)
    ) {
      row[field] = value;
      const parsedValue = parseFormattedNumber(value);
      const pairs = {
        debit: "credit",
        credit: "debit",
        debitFx1: "creditFx1",
        creditFx1: "debitFx1",
        debitFx2: "creditFx2",
        creditFx2: "debitFx2",
      };

      if (parsedValue > 0 && pairs[field]) {
        row[pairs[field]] = "0.00";
      }
    }

    if (["slRefNo", "slRefDate", "remarks"].includes(field)) {
      row[field] = value;
    }

    updatedRowsGL[index] = row;
    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
    const row = { ...updatedRowsGL[index] };

    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (
      autoCompute &&
      ((withCurr2 && currCode !== glCurrDefault) || withCurr3)
    ) {
      if (
        [
          "debit",
          "credit",
          "debitFx1",
          "creditFx1",
          "debitFx2",
          "creditFx2",
        ].includes(field)
      ) {
        const data = await useUpdateRowEditEntries(
          row,
          field,
          value,
          currCode,
          currRate,
          documentDate,
        );
        if (data) {
          row.debit = formatNumber(data.debit);
          row.credit = formatNumber(data.credit);
          row.debitFx1 = formatNumber(data.debitFx1);
          row.creditFx1 = formatNumber(data.creditFx1);
          row.debitFx2 = formatNumber(data.debitFx2);
          row.creditFx2 = formatNumber(data.creditFx2);
        }
      }
    } else {
      const pairs = [
        ["debit", "credit"],
        ["debitFx1", "creditFx1"],
        ["debitFx2", "creditFx2"],
      ];

      pairs.forEach(([a, b]) => {
        if (field === a && parsedValue > 0) {
          row[b] = formatNumber(0);
        } else if (field === b && parsedValue > 0) {
          row[a] = formatNumber(0);
        }
      });
    }

    updatedRowsGL[index] = row;
    updateState({
      detailRowsGL: updatedRowsGL,
      ...getGLTotalsState(updatedRowsGL),
    });
  };

  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      const specialAccounts = ["invAcct"];
      if (specialAccounts.includes(accountModalSource)) {
        handleDetailChange(
          selectedRowIndex,
          "acctCode",
          selectedAccount,
          false,
        );
      } else {
        handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
      }
    }
    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, "rcCode", selectedRc, false);
      } else {
        const result = await useTopRCRow(selectedRc.rcCode);
        if (result) {
          handleDetailChangeGL(selectedRowIndex, "rcCode", result);
        }
      }
      updateState({
        showRcModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
    }
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      const updateFn =
        accountModalSource !== null ? handleDetailChange : handleDetailChangeGL;
      updateFn(selectedRowIndex, "slCode", selectedSl, false);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
    });
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandleCancel(
        docType,
        documentID,
        userCode,
        confirmation.password,
        confirmation.reason,
        updateState,
      );
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Cancellation Completed",
          timer: 5000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
      await fetchTranData(documentNo, branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleCloseSignatory = async (mode) => {
    updateState({
      showSpinner: true,
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });
    await useHandlePrint(documentID, docType, mode, userCode);

    updateState({
      showSpinner: false,
    });
  };

  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({ showSpinner: false });
  };

  const handleTranTypeChange = (newTranType) => {
    let autoFromWhCode = "";
    let autoFromWhName = "";
    let autoToWhCode = "";
    let autoToWhName = "";

    if (isIntransitTransfer(newTranType)) {
      autoFromWhCode = "INT";
      autoFromWhName = "INT - INTRANSIT";
    } else if (isInterWarehouseOrInterBranch(newTranType)) {
      autoToWhCode = "INT";
      autoToWhName = "INT - INTRANSIT";
    }

    updateState({
      selectedTranType: newTranType,
      toBranchCode: "",
      toBranchName: "",
      fromWhCode: autoFromWhCode,
      fromWhName: autoFromWhName,
      fromWhDefaultLocCode: autoFromWhCode === "INT" ? "INTRANSIT" : "",
      toWhCode: autoToWhCode,
      toWhName: autoToWhName,
      toWhDefaultLocCode: autoToWhCode === "INT" ? "INTRANSIT" : "",
      detailRows: [],
      detailRowsGL: [],
    });
    updateTotalsDisplay(0, 0);
  };

  const handleCloseToBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      if (normalizeCode(selectedBranch.branchCode) === normalizeCode(branchCode)) {
        useSwalInfoAlert(
          "Invalid Branch Selection",
          `The ${isIntransitToBranch() ? "From Branch" : "To Branch"} must not be the same as your current branch.`
        );
        updateState({ toBranchModalOpen: false });
        return;
      }

      let autoFromWhCode = "";
      let autoFromWhName = "";
      let autoToWhCode = "";
      let autoToWhName = "";

      if (isIntransitTransfer()) {
        autoFromWhCode = "INT";
        autoFromWhName = "INT - INTRANSIT";
      } else if (isInterWarehouseOrInterBranch()) {
        autoToWhCode = "INT";
        autoToWhName = "INT - INTRANSIT";
      }

      updateState({
        toBranchCode: selectedBranch.branchCode,
        toBranchName: selectedBranch.branchName,
        toWhCode: autoToWhCode,
        toWhName: autoToWhName,
        fromWhCode: autoFromWhCode,
        fromWhName: autoFromWhName,
        detailRows: (detailRows || []).map((item) => ({
          ...item,
          toWHcode: autoToWhCode,
          towhouseCode: autoToWhCode,
          whouseCode: autoFromWhCode,
          frmwhouseCode: autoFromWhCode,
          tolocCode: autoToWhCode === "INT" ? "INTRANSIT" : "",
          locCode: autoFromWhCode === "INT" ? "INTRANSIT" : "",
        })),
        detailRowsGL: [],
      });
    }
    updateState({ toBranchModalOpen: false });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      let autoFromWhCode = "";
      let autoFromWhName = "";
      let autoToWhCode = "";
      let autoToWhName = "";

      if (isIntransitTransfer()) {
        autoFromWhCode = "INT";
        autoFromWhName = "INT - INTRANSIT";
      } else if (isInterWarehouseOrInterBranch()) {
        autoToWhCode = "INT";
        autoToWhName = "INT - INTRANSIT";
      }

      updateState({
        branchCode: selectedBranch.branchCode,
        branchName: selectedBranch.branchName,
        fromWhCode: autoFromWhCode,
        fromWhName: autoFromWhName,
        toWhCode: autoToWhCode,
        toWhName: autoToWhName,
        toBranchCode: "",
        toBranchName: "",
        detailRows: [],
        detailRowsGL: [],
      });
      updateTotalsDisplay(0, 0);
    }
    updateState({ branchModalOpen: false });
  };

  const getToWarehouseBranchCode = () =>
    isBranchTransfer() ? toBranchCode || "" : branchCode || "";

  const isHeaderFromIntransit = () =>
    isIntransitWarehouse({ whCode: fromWhCode, whName: fromWhName });

  const isHeaderToIntransit = () =>
    isIntransitWarehouse({ whCode: toWhCode, whName: toWhName });

  const getFromWarehouseLookupProps = () => {
    const targetBranchCode = isIntransitToBranch() ? (toBranchCode || "") : (branchCode || "");
    let filterStr = "ActiveOnly";

    if (targetBranchCode) {
      if (isInterWarehouseOrInterBranch()) {
        filterStr = `ByBC${targetBranchCode}`;
      } else if (isIntransitTransfer()) {
        filterStr = `IntransitOnly`; 
      }
    }
    
    if (toWhCode) {
      filterStr += `|ExcludeWh:${toWhCode}`;
    }
    
    return {
      filter: filterStr,
      branchCode: targetBranchCode,
    };
  };

  const getToWarehouseLookupProps = () => {
    const targetBranchCode = isInterBranch() ? (toBranchCode || "") : (branchCode || "");
    let filterStr = "ActiveOnly";

    if (targetBranchCode) {
      if (isIntransitTransfer()) {
        filterStr = `ByBC${targetBranchCode}`;
      } else if (isInterWarehouseOrInterBranch()) {
        filterStr = `IntransitOnly`;
      }
    }
    
    if (fromWhCode) {
      filterStr += `|ExcludeWh:${fromWhCode}`;
    }
    
    return {
      filter: filterStr,
      branchCode: targetBranchCode,
    };
  };

  const validateInterWarehouseFlow = () => {
    if (!isWarehouseTransfer()) return true;

    const fromIsTransit = isHeaderFromIntransit();
    const toIsTransit = isHeaderToIntransit();

    if (normalizeCode(fromWhCode) === normalizeCode(toWhCode)) {
      useSwalInfoAlert(
        "Invalid Warehouse Setup",
        "From Warehouse and To Warehouse must not be the same.",
      );
      return false;
    }

    if (fromIsTransit && toIsTransit) {
      useSwalInfoAlert(
        "Invalid Inter Warehouse Transfer",
        "Intransit cannot be both the From Warehouse and To Warehouse.",
      );
      return false;
    }

    if (!fromIsTransit && !toIsTransit) {
      useSwalInfoAlert(
        "Intransit Warehouse Required",
        "For Inter Warehouse transfer, use one Intransit virtual warehouse. Sender flow is Branch Warehouse to Intransit. Receiver flow is Intransit to Branch Warehouse.",
      );
      return false;
    }

    return true;
  };

  const handleOpenToWarehouseLookup = () => {
    if (isFormDisabled) return;

    if (isInterBranch() && !toBranchCode) {
      useSwalInfoAlert(
        "To Branch Required",
        "Please select To Branch first before selecting To Warehouse.",
      );
      return;
    }

    if (isInterWarehouseOrInterBranch() && !fromWhCode) {
       useSwalInfoAlert(
         "From Warehouse Required", 
         "Please select From Warehouse first."
       );
       return;
    }

    updateState({ towarehouseLookupOpen: true });
  };

  const handleCloseWarehouseLookup = (row) => {
    if (row) {
      if (accountModalSource) {
        handleDetailChange(selectedRowIndex, accountModalSource, row, false);
      }
    }
    updateState({ warehouseLookupOpen: false, accountModalSource: null });
  };

 const handleCloseFromWarehouseLookup = async (row) => {
    if (row) {
      const selectedIsTransit = isIntransitWarehouse(row);
      const selectedBranchCode = getWarehouseBranchCode(row);
      const targetBranchCode = isIntransitToBranch() ? toBranchCode : branchCode;
      const defaultLocCode = selectedIsTransit ? "INTRANSIT" : getWarehouseDefaultLocCode(row) || await getFirstLocationCodeByWarehouse(row.whCode);

      if (isIntransitTransfer() && !selectedIsTransit) {
        useSwalInfoAlert("Invalid From Warehouse", "Kapag Intransit to Branch/Warehouse ang transaction, dapat INTRANSIT ang From Warehouse.");
        updateState({ fromwarehouseLookupOpen: false });
        return;
      }

      if (isInterWarehouseOrInterBranch() && selectedIsTransit) {
        useSwalInfoAlert("Invalid From Warehouse", "Kapag Inter Branch/Warehouse ang transaction, dapat physical warehouse ang From Warehouse, hindi Intransit.");
        updateState({ fromwarehouseLookupOpen: false });
        return;
      }

      // 🌟 FIX: I-preserve o i-auto-fill ulit ang INT kung Sender (Inter Branch/Warehouse)
      let newToWhCode = toWhCode;
      let newToWhName = toWhName;

      if (isInterWarehouseOrInterBranch()) {
        newToWhCode = "INT";
        newToWhName = "INT - INTRANSIT";
      } else {
        // Kung hindi Sender, i-clear ang To Warehouse para pumili ulit ang user
        newToWhCode = "";
        newToWhName = "";
      }

      const defaultToLocCode = isIntransitWarehouse(newToWhCode)
        ? "INTRANSIT"
        : await getFirstLocationCodeByWarehouse(newToWhCode);

      updateState({
        fromWhCode: row.whCode,
        fromWhName: row.whName,
        fromWhDefaultLocCode: defaultLocCode,
        toWhCode: newToWhCode, // Ginamit ang preserved logic
        toWhName: newToWhName,
        toWhDefaultLocCode: defaultToLocCode,
        detailRows: (detailRows || []).map((item) => ({
          ...item,
          whouseCode: row.whCode,
          frmwhouseCode: row.whCode,
          locCode: defaultLocCode || "",
          toWHcode: newToWhCode, // Panatilihin din sa mga item rows
          towhouseCode: newToWhCode,
          tolocCode: defaultToLocCode, 
        })),
        detailRowsGL: [],
      });
    }
    updateState({ fromwarehouseLookupOpen: false });
  };

  const handleCloseToWarehouseLookup = async (row) => {
    if (row) {
      const selectedIsTransit = isIntransitWarehouse(row);
      const selectedBranchCode = getWarehouseBranchCode(row);
      const targetBranchCode = isInterBranch() ? toBranchCode : branchCode;
      const defaultLocCode = selectedIsTransit ? "INTRANSIT" : getWarehouseDefaultLocCode(row) || await getFirstLocationCodeByWarehouse(row.whCode);

      if (normalizeCode(fromWhCode) === normalizeCode(row.whCode)) {
        useSwalInfoAlert(
          "Invalid To Warehouse",
          "From Warehouse and To Warehouse must not be the same.",
        );
        updateState({ towarehouseLookupOpen: false });
        return;
      }

      if (isInterWarehouseOrInterBranch() && !selectedIsTransit) {
        useSwalInfoAlert("Invalid To Warehouse", "Kapag Inter Branch/Warehouse ang transaction, dapat INTRANSIT ang To Warehouse.");
        updateState({ towarehouseLookupOpen: false });
        return;
      }

      if (isIntransitTransfer() && selectedIsTransit) {
        useSwalInfoAlert("Invalid To Warehouse", "Kapag Intransit to Branch/Warehouse ang transaction, dapat physical warehouse ang To Warehouse, hindi Intransit.");
        updateState({ towarehouseLookupOpen: false });
        return;
      }

      updateState({
        toWhCode: row.whCode,
        toWhName: row.whName,
        toWhDefaultLocCode: defaultLocCode,
        detailRows: (detailRows || []).map((item) => ({
          ...item,
          toWHcode: row.whCode,
          towhouseCode: row.whCode,
          tolocCode: defaultLocCode || "",
        })),
        detailRowsGL: [],
      });
    }
    updateState({ towarehouseLookupOpen: false });
  };

  const handleOpenMSLookup = async (itemSingleSelect) => {
    try {
      updateState({ isLoading: true, itemSingleSelect: itemSingleSelect });

      // Match MS_INT SOURCE_BRANCH and TO_BRANCH exactly for Intransit receiver lookup.
      let apiSourceBranch = branchCode || "";
      let apiToBranch = isInterBranch() ? (toBranchCode || "") : (branchCode || "");

      // Intransit to Branch: selected branch field is treated as From/Source Branch,
      // while the current login branch is the receiving/target branch.
      if (isIntransitToBranch()) {
        apiSourceBranch = toBranchCode || "";
        apiToBranch = branchCode || "";
      }

      // Intransit to Warehouse: source and target branch are the current branch.
      if (isIntransitToWarehouse()) {
        apiSourceBranch = branchCode || "";
        apiToBranch = branchCode || "";
      }

      const endpoint = "getInvLookupMS";
      const response = await fetchDataJson(endpoint, {
        userCode,
        branchCode: apiSourceBranch,
        sourceBranchCode: apiSourceBranch,
        toBranchCode: apiToBranch,
        whouseCode: fromWhCode || "",
        toWHcode: toWhCode || "",
        locCode: "",
        docType: "MSST",
        tranType: itemSingleSelect ? "IRR" : selectedTranType,
        
        // 🌟 BAGO: Ipasa ang Ref Doc No 1 para magamit ng backend na filter sa WT_NO (optional but recommended)
        refDocNo: refDocNo1 || "",        
        wtNo: refDocNo1 || ""
      });

      const rawCustData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];

      // Make every lookup row key unique.
      // Intransit rows can share the same Transfer Ref No / WT_NO, and the global lookup
      // checkbox selection can treat rows with the same groupId as one selection.
      const custData = rawCustData.map((row, index) => {
        const transferRefNo = row?.transferRefNo || row?.wtNo || row?.groupId || "";
        const rowUniqueKey = row?.uniqueKey || row?.controlNo || row?.CONTROL_NO || "";
        const itemCodeKey = row?.itemCode || row?.ITEM_NO || "";
        const lotKey = row?.lotNo || row?.LOT_NO || "";
        const locKey = row?.locCode || row?.LOC_CODE || "";

        return {
          ...row,
          transferRefNo,
          groupId: [transferRefNo, rowUniqueKey, itemCodeKey, lotKey, locKey, index]
            .filter((value) => value !== undefined && value !== null && value !== "")
            .join("|"),
        };
      });

      const colConfig = await useSelectedHSColConfig("getInvLookupMS");

      if (custData.length === 0) {
        useSwalInfoAlert("MS Location Balance", "No records found");
        updateState({ isLoading: false });
        return;
      }

      updateState({
        globalLookupRow: custData,
        globalLookupHeader: colConfig,
        msLookupModalOpen: true,
        isLoading: false,
      });
    } catch (error) {
      useSwalErrorAlert("MS Location Balance", "No records found");
      updateState({
        globalLookupRow: [],
        globalLookupHeader: [],
        isLoading: false,
      });
    }
  };

  const handleCloseMSLookup = async (selectedItems) => {
    if (!selectedItems) return;

    const itemsArray = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : [selectedItems.records];
    if (itemsArray.length === 0) return;

const firstValue = (...values) =>
      values.find((value) => value !== undefined && value !== null && value !== "");


    const defaultToLocCode = isIntransitWarehouse(toWhCode ?? "")
      ? "INTRANSIT"
      : await getFirstLocationCodeByWarehouse(toWhCode);

    const newRows = itemsArray.flatMap((item) => {
      const rawQtyHand = parseFormattedNumber(item?.qtyHand ?? 0);
      const rawUnitCost = parseFormattedNumber(item?.unitCost ?? 0);
      const originalKey = item?.uniqueKey ?? "";

      if (itemSingleSelect && selectedTranType === "IR") {
        handleDetailChange(selectedRowIndex, "itemCode", item, false);
        updateState({ itemSingleSelect: false, msLookupModalOpen: false });
        return [];
      }
const invAccountCode = firstValue(
        item?.invAcct,
        item?.invAcctCode,
        item?.INV_ACCT,
        item?.INV_ACCT_CODE,
        item?.acctCode,
        item?.ACCT_CODE,
        ""
      );

      if (itemSingleSelect && selectedTranType === "IR") {
        handleDetailChange(selectedRowIndex, "itemCode", item, false);
        // Ensure account code is populated on single select as well
        if (invAccountCode) {
          handleDetailChange(selectedRowIndex, "acctCode", { acctCode: invAccountCode }, false);
        }
        updateState({ itemSingleSelect: false, msLookupModalOpen: false });
        return [];
      }
      const baseRow = {
        itemCode: item?.itemCode ?? "",
        itemName: item?.itemName ?? "",
        categCode: item?.categCode ?? "",
        uomCode: item?.uomCode ?? "",
        unitCost: formatNumber(rawUnitCost, decUcost),
        amount: formatNumber(0, 2),
        lotNo: item?.lotNo ?? "",
        bbDate: item?.bbDate
          ? new Date(item.bbDate).toISOString().split("T")[0]
          : "",
        qstatCode: item?.qstatCode ?? "",
        whouseCode: item?.whouseCode ?? fromWhCode ?? "",
        toWHcode: toWhCode ?? "",
        locCode: item?.locCode ?? (isIntransitWarehouse(item?.whouseCode ?? fromWhCode ?? "") ? "INTRANSIT" : (fromWhDefaultLocCode || "")), 
        tolocCode: defaultToLocCode || toWhDefaultLocCode || "", 
        acctCode: invAccountCode,
        sltypeCode: "",
        rcCode: "",
        slCode: "",
      };

      if (selectedTranType === "IR") {
        return [
          {
            ...baseRow,
            uniqueKey: originalKey,
            quantity: formatNumber(rawQtyHand * -1, decQty),
            qtyHand: formatNumber(rawQtyHand, decQty),
            itemAmount: formatNumber(rawQtyHand * rawUnitCost * -1, 2),
            operation: "S",
          },
          {
            ...baseRow,
            uniqueKey: "",
            quantity: formatNumber(rawQtyHand, decQty),
            qtyHand: formatNumber(0, decQty),
            itemAmount: formatNumber(rawQtyHand * rawUnitCost, 2),
            operation: "A",
          },
        ];
      }

      return [
        {
          ...baseRow,
          uniqueKey: originalKey,
          qtyHand: formatNumber(rawQtyHand, decQty),
          quantity: formatNumber(0, decQty),
          itemAmount: formatNumber(0, 2),
          operation: selectedTranType === "IL" ? "S" : "A",
        },
      ];
    });

    setState((prev) => {
      const updated = [...(prev.detailRows || []), ...newRows];
      updateTotals(updated);
      return { ...prev, detailRows: updated };
    });

    updateState({ itemSingleSelect: false, msLookupModalOpen: false });
  };

  const handleCloseLocationLookup = (row) => {
    if (row) {
      if (accountModalSource) {
        handleDetailChange(selectedRowIndex, accountModalSource, row, false);
      }
    }
    updateState({ locationLookupOpen: false, accountModalSource: null });
  };

  const handleCloseQStatLookup = (row) => {
    if (row) {
      handleDetailChange(selectedRowIndex, "qstatCode", row, false);
    }
    updateState({ showQstatModal: false });
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
          
          // --- UPDATED FEATURES FROM MSRTV ---
          isSaveDisabled={isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)}
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
          
          detailsRoute="/page/MSST"
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        <div className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="pr_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1: Branch, MSST No., MSST Date */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <FieldRenderer
                    id="branchName" 
                    label="Branch"
                    type="lookup"
                    value={branchName || ""}
                    readOnly
                    disabled={
                      state.isFetchDisabled ||
                      state.isDocNoDisabled ||
                      isFormDisabled
                    }
                    lookupDisabled={isFetchDisabled}
                    onLookup={() => !isFormDisabled && updateState({ branchModalOpen: true })}
                    placeholder=" "
                  />
                </div>

                <div className="relative">
                  <FieldRenderer
                    id="msstNo"
                    label="MSST No."
                    type="lookup"
                    value={state.documentNo || ""}
                    onChange={(value) => updateState({ documentNo: value })}
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDocNoBlur();
                        e.preventDefault();
                        document.getElementById("msstDate")?.focus();
                      }
                    }}
                    placeholder=" "
                    disabled={state.isDocNoDisabled}
                  />
                </div>

                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <DateFormatInput
                      id="msstDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={documentDate}
                      disabled={isFormDisabled}
                      updateState={(updates) => {
                        if (updates.msstDate !== undefined) {
                          updateState({ documentDate: updates.msstDate });
                        } else if (updates.documentDate !== undefined) {
                          updateState({ documentDate: updates.documentDate });
                        } else {
                          updateState(updates);
                        }
                      }}
                    />
                  </div>
                  <label htmlFor="msstDate" className="global-ref-floating-label">
                    MSST Date
                  </label>
                </div>
              </div>

              {/* Column 2: Tran Type, From Warehouse, To Warehouse */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <FieldRenderer
                    id="tranType"
                    label="Tran Type"
                    type="select"
                    value={selectedTranType}
                    onChange={handleTranTypeChange}
                    disabled={isFormDisabled}
                    options={tranTypes.map((type) => ({
                      value: getTranTypeCode(type),
                      label: getTranTypeName(type),
                    }))}
                    placeholder={tranTypes.length > 0 ? "Select Tran Type" : "Loading Tran Types..."}
                  />
                </div>

                <div className="relative group">
                  <FieldRenderer
                    id="fromWhCode"
                    label="From Warehouse"
                    type={isIntransitTransfer() ? "text" : "lookup"}
                    required
                    value={fromWhName ? fromWhName : fromWhCode || ""}
                    readOnly
                    placeholder=" "
                    disabled={isFormDisabled || isIntransitTransfer()}
                    lookupDisabled={isFetchDisabled || isIntransitTransfer()}
                    onLookup={() => {
                        if (isFormDisabled || isIntransitTransfer()) return;
                        if (isIntransitToBranch() && !toBranchCode) {
                            useSwalInfoAlert("From Branch Required", "Please select From Branch first before selecting From Warehouse.");
                            return;
                        }
                        updateState({ fromwarehouseLookupOpen: true })
                    }}
                  />
                </div>

                <div className="relative group">
                  <FieldRenderer
                    id="toWHCode"
                    label="To Warehouse"
                    type="lookup"
                    required
                    value={toWhName ? toWhName : toWhCode || ""}
                    readOnly
                    placeholder=" "
                    disabled={isFormDisabled || isInterWarehouseOrInterBranch()}
                    lookupDisabled={isFetchDisabled || isInterWarehouseOrInterBranch()}
                    onLookup={() => {
                      if (isFormDisabled || isInterWarehouseOrInterBranch()) return;
                      handleOpenToWarehouseLookup();
                    }}
                  />
                </div>
              </div>

              {/* Column 3: Ref Doc No. 1, Ref Doc No. 2, Conditional To/From Branch */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <FieldRenderer
                    id="refDocNo1"
                    label="Ref Doc No. 1"
                    type="text"
                    value={refDocNo1 || ""}
                    placeholder=" "
                    onChange={(value) => updateState({ refDocNo1: value })}
                    disabled={isFormDisabled}
                    maxLength={
                      useGetFieldLength(tblFieldArray, "refdoc_no1") || 50
                    }
                  />
                </div>

                <div className="relative">
                  <FieldRenderer
                    id="refDocNo2"
                    label="Ref Doc No. 2"
                    type="text"
                    value={refDocNo2 || ""}
                    placeholder=" "
                    onChange={(value) => updateState({ refDocNo2: value })}
                    disabled={isFormDisabled}
                    maxLength={
                      useGetFieldLength(tblFieldArray, "refdoc_no2") || 50
                    }
                  />
                </div>

                {requiresBranchSelection() && (
                  <div className="relative group">
                    <FieldRenderer
                      id="toBranchName"
                      label={isIntransitToBranch() ? "From Branch" : "To Branch"}
                      type="lookup"
                      required
                      value={toBranchName || ""}
                      readOnly
                      placeholder=" "
                      disabled={isFormDisabled}
                      lookupDisabled={isFetchDisabled}
                      onLookup={() =>
                        !isFormDisabled &&
                        updateState({ toBranchModalOpen: true })
                      }
                    />
                  </div>
                )}
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
                    maxLength={
                      useGetFieldLength(tblFieldArray, "remarks") || 200
                    }
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
            <div className="global-tran-textbox-group-div-ui"></div>
          </div>
        </div>

        <div id="apv_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                className={`global-tran-tab-padding-ui ${
                  GLactiveTab === "invoice"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                }`}
              >
                Item Details
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {visibleMsstDetailColumns.map((column) => (
                      <Fragment key={`detail-header-${column.key}`}>
                        {renderMsstDetailHeader(column.label, column.key, column.width, {
                          orderedColumns: visibleMsstDetailColumns,
                        })}
                      </Fragment>
                    ))}
                    {!isFormDisabled && (
                      <th key="detail-actions" className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>
                    )}
                  </tr>
                  <tr className="hidden">
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">Item Code</th>
                    <th className="global-tran-th-ui">Item Description</th>
                    <th className="global-tran-th-ui">UOM</th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenCAMode")}
                    >
                      Quantity
                    </th>
                    <th className="global-tran-th-ui">
                      {handleColumnLabel("UnitCost")}
                    </th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenCAMode")}
                    >
                      Amount
                    </th>
                    <th className="global-tran-th-ui">Lot No</th>
                    <th className="global-tran-th-ui">BB Date</th>
                    <th className="global-tran-th-ui">Quality Status</th>
                    <th className="global-tran-th-ui">From Warehouse</th>
                    <th className="global-tran-th-ui">To Warehouse</th>
                    <th className="global-tran-th-ui">From Location</th>
                    <th className="global-tran-th-ui">To Location</th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenBBMode")}
                    >
                      Account Code
                    </th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenBBMode")}
                    >
                      RC Code
                    </th>
                    <th className="global-tran-th-ui hidden">SL Type Code</th>
                    <th
                      className="global-tran-th-ui"
                      hidden={handleFieldBehavior("hiddenBBMode")}
                    >
                      SL Code
                    </th>
                    <th className="global-tran-th-ui">Qty On Hand</th>
                    <th className="global-tran-th-ui hidden">Category</th>
                    <th className="global-tran-th-ui hidden">Unique Key</th>
                    <th className="global-tran-th-ui hidden">Operation</th>
                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Actions
                      </th>
                    )}
                  </tr>
                  {renderMsstDetailHeaderContextMenu()}
                </thead>

                <tbody className="relative">
                  {sortedMsstDetailRows.map(({ row, originalIndex: index }) => (
                    <tr key={`${row.uniqueKey || row.itemCode || "row"}-${index}`} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.itemCode || ""}
                            readOnly
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "itemCode",
                                e.target.value,
                              )
                            }
                          />
                          {!isFormDisabled &&
                            row.operation === "A" &&
                            selectedTranType === "IR" && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => handleItem(index)}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[300px] global-tran-td-inputclass-ui"
                          value={row.itemName || ""}
                          readOnly
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "itemName",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[50px] text-center global-tran-td-inputclass-ui"
                          value={row.uomCode || ""}
                          readOnly
                          onChange={(e) =>
                            handleDetailChange(index, "uomCode", e.target.value)
                          }
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        hidden={handleFieldBehavior("hiddenCAMode")}
                      >
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                          value={row.quantity || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.-]/g,
                              "",
                            );
                            if (
                              /^-?\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChange(
                                index,
                                "quantity",
                                sanitizedValue,
                                false,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              parseFormattedNumber(e.target.value) === 0
                            ) {
                              e.target.value = "";
                            }
                          }}
                          onBlur={async (e) => {
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                              await handleDetailChange(
                                index,
                                "quantity",
                                num,
                                true,
                              );
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                await handleDetailChange(
                                  index,
                                  "quantity",
                                  num,
                                  true,
                                );
                              }
                              e.target.blur();
                            }
                          }}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                          value={row.unitCost || ""}
                          readOnly={true}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChange(
                                index,
                                "unitCost",
                                sanitizedValue,
                                false,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              parseFormattedNumber(e.target.value) === 0
                            ) {
                              e.target.value = "";
                            }
                          }}
                          onBlur={async (e) => {
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                              await handleDetailChange(
                                index,
                                "unitCost",
                                num,
                                true,
                              );
                            }
                            setFocusedCell(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num)) {
                                await handleDetailChange(
                                  index,
                                  "unitCost",
                                  num,
                                  true,
                                );
                              }
                              e.target.blur();
                            }
                          }}
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        hidden={handleFieldBehavior("hiddenCAMode")}
                      >
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                          value={
                            formatNumber(
                              parseFormattedNumber(row.itemAmount),
                            ) || ""
                          }
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.lotNo || ""}
                          readOnly={true}
                          onChange={(e) =>
                            handleDetailChange(index, "lotNo", e.target.value)
                          }
                          maxLength={useGetFieldLength(tblFieldArray, "lot_no")}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={toDateInputValue(row.bbDate)}
                          readOnly={true}
                          onChange={(e) =>
                            handleDetailChange(index, "bbDate", e.target.value)
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.qstatCode || ""}
                            readOnly={true}
                          />
                        </div>
                      </td>

<td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.whouseCode || ""}
                            readOnly
                          />
                          {/* FOOLPROOF CHECK: IW = Inter-Warehouse, IB = Inter-Branch */}
                          {!isFormDisabled && row.operation !== "S" && !hideFromWarehouseAndLocationSearch() && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  warehouseLookupOpen: true,
                                  accountModalSource: "whouseCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

<td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.toWHcode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && !isInterWarehouseOrInterBranch() && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  warehouseLookupOpen: true,
                                  accountModalSource: "toWHcode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

<td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.locCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && row.operation !== "S" && !hideFromWarehouseAndLocationSearch() && !isIntransitWarehouse(row.whouseCode) && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  locationLookupOpen: true,
                                  accountModalSource: "locCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.tolocCode || ""}
                            readOnly
                          />
                         {!isFormDisabled && row.operation !== "S" && !isIntransitWarehouse(row.toWHcode) && !isWarehouseTransfer(selectedTranType, tranTypes) && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  locationLookupOpen: true,
                                  accountModalSource: "tolocCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td
                        className="global-tran-td-ui relative "
                        hidden={handleFieldBehavior("hiddenBBMode")}
                      >
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.acctCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showAccountModal: true,
                                  accountModalSource: "invAcct",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td
                        className="global-tran-td-ui relative"
                        hidden={handleFieldBehavior("hiddenBBMode")}
                      >
                        <div className="flex items-center">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                            value={row.rcCode || ""}
                            readOnly
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showRcModal: true,
                                  accountModalSource: "rcCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.sltypeCode || ""}
                          readOnly
                        />
                      </td>

                      <td
                        className="global-tran-td-ui"
                        hidden={handleFieldBehavior("hiddenBBMode")}
                      >
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "slCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showSlModal: true,
                                  accountModalSource: "slCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                          value={row.qtyHand || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.categCode || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.uniqueKey || ""}
                          readOnly
                        />
                      </td>

                      <td className="global-tran-td-ui hidden">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.operation || ""}
                          readOnly
                        />
                      </td>

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddRow(index)}>
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(index)}>
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() => handleAddRow()}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Total Quantity:
                </label>
                <label
                  id="totalQuantity"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalQuantity}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Total Amount:
                </label>
                <label
                  id="totalItemAmount"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalItemAmount}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div
          className="global-tran-tab-div-ui"
          hidden={handleFieldBehavior("hiddenBBMode")}
        >
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                className={`global-tran-tab-padding-ui ${
                  GLactiveTab === "invoice"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                }`}
                onClick={() => updateState({ GLactiveTab: "invoice" })}
              >
                General Ledger
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className="global-tran-button-generateGL"
                disabled={isLoading}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                {isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {msstGlColumnDefs.map((column) => (
                      <Fragment key={`gl-header-${column.key}`}>
                        {renderMsstGlHeader(column.label, column.key, column.width, {
                          orderedColumns: msstGlColumnDefs,
                        })}
                      </Fragment>
                    ))}
                  </tr>
                  <tr className="hidden">
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">Account Code</th>
                    <th className="global-tran-th-ui">RC Code</th>
                    <th className="global-tran-th-ui">SL Type Code</th>
                    <th className="global-tran-th-ui">SL Code</th>
                    <th className="global-tran-th-ui w-[2000px]">
                      Particulars
                    </th>
                    <th className="global-tran-th-ui">
                      Debit ({glCurrDefault})
                    </th>
                    <th className="global-tran-th-ui">
                      Credit ({glCurrDefault})
                    </th>

                    <th
                      className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                    >
                      Debit ({withCurr3 ? glCurrGlobal2 : currCode})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                    >
                      Credit ({withCurr3 ? glCurrGlobal2 : currCode})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                    >
                      Debit ({glCurrGlobal3})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                    >
                      Credit ({glCurrGlobal3})
                    </th>

                    <th className="global-tran-th-ui">SL Ref. No.</th>
                    <th className="global-tran-th-ui">SL Ref. Date</th>
                    <th className="global-tran-th-ui">Remarks</th>

                  </tr>
                  {renderMsstGlHeaderContextMenu()}
                </thead>
                <tbody className="relative">
                  {sortedMsstGlRows.map(({ row, originalIndex: index }) => (
                    <tr key={`${row.acctCode || "gl"}-${index}`} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.acctCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "acctCode",
                                e.target.value,
                              )
                            }
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showAccountModal: true,
                                  accountModalSource: "acctCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.rcCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "rcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />
                          {!isFormDisabled &&
                            (row.rcCode === "REQ RC" ||
                              (row.rcCode && row.rcCode !== "REQ RC")) && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showRcModal: true,
                                  });
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.sltypeCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "sltypeCode",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "slCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            (row.slCode === "REQ SL" || row.slCode) && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  if (row.slCode === "REQ SL" || row.slCode) {
                                    updateState({
                                      selectedRowIndex: index,
                                      showSlModal: true,
                                    });
                                  }
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[300px] global-tran-td-inputclass-ui"
                          value={row.particular || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "particular",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debit || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debit",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debit",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "debit", e.target.value);
                          }}
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.credit || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "credit",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "credit",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "credit", e.target.value);
                          }}
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx1 || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debitFx1",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debitFx1",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "debitFx1", e.target.value);
                          }}
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx1 || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "creditFx1",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "creditFx1",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "creditFx1", e.target.value);
                          }}
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx2 || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debitFx2",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debitFx2",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "debitFx2", e.target.value);
                          }}
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx2 || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "creditFx2",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "creditFx2",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (isFormDisabled) return;
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                          onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, "creditFx2", e.target.value);
                          }}
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefNo || ""}
                          readOnly={isFormDisabled}
                          maxLength={useGetFieldLength(
                            tblFieldArray,
                            "slref_no",
                          )}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slRefNo",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefDate || ""}
                          readOnly={isFormDisabled}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slRefDate",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.remarks || ""}
                          readOnly={isFormDisabled}
                          maxLength={useGetFieldLength(
                            tblFieldArray,
                            "remarks",
                          )}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "remarks",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={handleAddRowGL}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Debit ({glCurrDefault}):
                </label>
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totalDebit}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Credit ({glCurrDefault}):
                </label>
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totalCredit}
                </label>
              </div>
            </div>
          </div>
        </div>

        {branchModalOpen && (
          <BranchLookupModal
            isOpen={branchModalOpen}
            onClose={handleCloseBranchModal}
          />
        )}

        {toBranchModalOpen && (
          <BranchLookupModal
            isOpen={toBranchModalOpen}
            onClose={handleCloseToBranchModal}
          />
        )}

        {currencyModalOpen && (
          <CurrLookupModal
            isOpen={currencyModalOpen}
            onClose={handleCloseCurrencyModal}
          />
        )}

        {custModalOpen && (
          <CustomerMastLookupModal
            isOpen={custModalOpen}
            onClose={handleCloseCustModal}
          />
        )}

        {showAccountModal && (
          <COAMastLookupModal
            isOpen={showAccountModal}
            onClose={handleCloseAccountModal}
            source={accountModalSource}
          />
        )}

        {showRcModal && (
          <RCLookupModal
            isOpen={showRcModal}
            onClose={handleCloseRcModalGL}
            source={accountModalSource}
          />
        )}

        {showVatModal && (
          <VATLookupModal
            isOpen={showVatModal}
            onClose={handleCloseVatModal}
            customParam="OutputService"
          />
        )}

        {showAtcModal && (
          <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />
        )}

        {showSlModal && (
          <SLMastLookupModal
            isOpen={showSlModal}
            onClose={handleCloseSlModalGL}
          />
        )}

        {showCancelModal && (
          <CancelTranModal
            isOpen={showCancelModal}
            onClose={handleCloseCancel}
          />
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

        {showPostingModal && (
          <PostMSST
            isOpen={showPostingModal}
            userCode={userCode}
            docType={docType}
            branchCode={branchCode}
            onClose={() => updateState({ showPostingModal: false })}
          />
        )}

        {showAllTranDocNo && (
          <AllTranDocNo
            isOpen={showAllTranDocNo}
            params={{
              branchCode,
              branchName,
              docType,
              documentTitle,
              fieldNo: "msstNo",
            }}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{ documentNo }}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
          />
        )}

        {msLookupModalOpen && (
          <GlobalLookupModalv1
            isOpen={msLookupModalOpen}
            data={globalLookupRow}
            btnCaption="Get Selected Items"
            title="MS Location Balance"
            endpoint={globalLookupHeader}
            onClose={handleCloseMSLookup}
            onCancel={() => updateState({ msLookupModalOpen: false })}
            singleSelect={itemSingleSelect}
          />
        )}

        {warehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={warehouseLookupOpen}
            onClose={handleCloseWarehouseLookup}
            filter={"ByBC" + branchCode}
            source={accountModalSource}
            branchCode={branchCode}
            itemCode={
              selectedRowIndex !== null
                ? detailRows[selectedRowIndex]?.itemCode
                : null
            }
          invType="MS"
          />
        )}

        {fromwarehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={fromwarehouseLookupOpen}
            onClose={handleCloseFromWarehouseLookup}
            filter={getFromWarehouseLookupProps().filter}
            source={accountModalSource}
            branchCode={getFromWarehouseLookupProps().branchCode}
          invType="MS"
          />
        )}

        {towarehouseLookupOpen && (
          <WarehouseLookupModal
            isOpen={towarehouseLookupOpen}
            onClose={handleCloseToWarehouseLookup}
            filter={getToWarehouseLookupProps().filter}
            source={accountModalSource}
            branchCode={getToWarehouseLookupProps().branchCode}
          invType="MS"
          />
        )}

        {locationLookupOpen && (
          <LocationLookupModal
            isOpen={locationLookupOpen}
            onClose={handleCloseLocationLookup}
            source={accountModalSource}
            filter="ActiveAll"
            whCode={
              selectedRowIndex !== null
                ? accountModalSource === "tolocCode"
                  ? detailRows[selectedRowIndex]?.toWHcode || toWhCode || ""
                  : detailRows[selectedRowIndex]?.whouseCode || fromWhCode || ""
                : ""
            }
          />
        )}

        {showQstatModal && (
          <QstatLookupModal
            isOpen={showQstatModal}
            onClose={handleCloseQStatLookup}
            filter="ActiveAll"
          />
        )}

        {showSpinner && <LoadingSpinner />}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getMSSTHistory"
          cacheKey={`MSST:${state.branchCode || ""}:${state.docNo || ""}`}
          activeTabKey="MSST_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status={(() => {
            const s = (state.status || "").toUpperCase();
            if (s === "FINALIZED") return "F";
            if (s === "CANCELLED") return "X";
            if (s === "CLOSED") return "C";
            if (s === "OPEN") return "";
            return "All";
          })()}
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>
    </div>
  );
};

export default MSST;
