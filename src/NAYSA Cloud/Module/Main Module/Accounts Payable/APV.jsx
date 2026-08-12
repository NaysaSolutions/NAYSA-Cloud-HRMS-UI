import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import { useSwalSuccessAlert, useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faMinus,
  faTrashAlt,
  faFolderOpen,
  faSpinner,
  faEdit,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostAPV from "./PostAPV.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";

// Configuration
import { apiClient, fetchData, fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Global
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
  useTopPayTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopVatAmount,
  useTopATCAmount,
  useTopPayeeRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalHandleOpenSpecsModal,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";

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
  useSelectedHSColConfig as selectedHSColConfig
} from "@/NAYSA Cloud/Global/selectedData";


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from "@/NAYSA Cloud/Components/Header";

const formatSlrefDateInput = (value) => {
  const cleaned = String(value || "").replace(/\D/g, "").slice(0, 8);

  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;

  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
};

const normalizeSlrefDate = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  let month = "";
  let day = "";
  let year = "";

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(datePart)) {
    [year, month, day] = datePart.split("-");
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    [month, day, year] = raw.split("/");
  } else {
    const formatted = formatSlrefDateInput(raw);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(formatted)) {
      [month, day, year] = formatted.split("/");
    }
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const yyyy = String(year);

  if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd) || !/^\d{4}$/.test(yyyy)) {
    return "";
  }

  const m = Number(mm);
  const d = Number(dd);
  const y = Number(yyyy);
  const parsed = new Date(y, m - 1, d);

  if (
    m < 1 ||
    m > 12 ||
    d < 1 ||
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return "";
  }

  return `${mm}/${dd}/${yyyy}`;
};

const getAssignedUserBranch = (userRow) => {
  const branchCode = String(
    userRow?.branchCode ?? userRow?.BRANCH_CODE ?? "",
  ).trim();

  return {
    branchCode,
    branchName: branchCode
      ? String(
          userRow?.branchName ??
            userRow?.BranchName ??
            userRow?.BRANCH_NAME ??
            "",
        ).trim()
      : "",
  };
};

const isNonPurchasesApType = (value) =>
  ["APV02", "APV002"].includes(String(value || "").trim().toUpperCase());

const APV = () => {
  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const defaultAdvancesAccountRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopATCRow,
    getAllTopVatRow,
    getAllTopVatAmount,
    getAllTopATCAmount,
  } = useAuth();
  const assignedUserBranch = getAssignedUserBranch(currentUserRow);
  const [isViewDocument, setIsViewDocument] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);

  const isViewDocumentUrl = isViewDocument;

  const { resetFlag } = useReset();
  const { user } = useAuth();
  const [topTab, setTopTab] = useState("details");
  const [state, setState] = useState({
    // HS Option
    glCurrMode: companyInfo?.glCurrMode || "",
    glCurrDefault: companyInfo?.currCode || "",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: companyInfo?.glCurrGlobal1 || "",
    glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",

    // Document information
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    triggerGLEntries: false,
    showAllTranDocNo: false,

    // Header information
    header: {
      apv_date: useGetCurrentDayV2(),
      remarks: "",
      refDocNo1: "",
      refDocNo2: "",
      fromDate: null,
      toDate: null,
    },
    // Branch information
    branchCode: assignedUserBranch.branchCode,
    branchName: assignedUserBranch.branchName,

    // Vendor information
    vendName: null,
    vendCode: null,

    // Currency information
    currCode: companyInfo?.currCode || "",
    currName: companyInfo?.currName || "",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),

    // AP information
    apTypes: [],
    selectedApType: "APV01",
    apAccountName: "",
    apAccountCode: "",
    userCode: currentUserRow?.userCode || "",

    // Detail rows
    detailRows: [],
    detailRowsGL: [],

    // Totals
    totalDebit: "0.00",
    totalCredit: "0.00",

    // Field visibility
    fieldVisibility: {
      sltypeCode: true,
      slName: true,
      address: true,
      tin: true,
      invType: true,
      rrNo: true,
      poNo: true,
      siNo: true,
      siDate: true,
    },

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
    showPaytermModal: false,
    currencyModalOpen: false,
    branchModalOpen: false,
    payeeModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostingModal: false,


    showRRRefModal: false,
    openRRDataSummary: [],
    openRRColSummary: [],
    openRRColDetail: [],
  });
  const [showInvoiceAddDropdown, setShowInvoiceAddDropdown] = useState(false);

  // Helper function to update state
  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const getDefaultAdvancesAccount = async () => {
    if (defaultAdvancesAccountRef.current) {
      return defaultAdvancesAccountRef.current;
    }

    try {
      const { data: result } = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({
          search: "ADGL",
          page: 1,
          pageSize: 1,
        }),
      });

      const rawData = result?.data?.[0]?.result || "[]";
      const accounts = Array.isArray(rawData) ? rawData : JSON.parse(rawData);
      const firstAccount = Array.isArray(accounts) ? accounts[0] : accounts;

      const defaultAccount = {
        acctCode:
          firstAccount?.acctCode ||
          firstAccount?.accountCode ||
          firstAccount?.ACCT_CODE ||
          "",
        acctName:
          firstAccount?.acctName ||
          firstAccount?.accountName ||
          firstAccount?.ACCT_NAME ||
          "",
      };

      defaultAdvancesAccountRef.current = defaultAccount;
      return defaultAccount;
    } catch (error) {
      console.error("Could not fetch default advances account:", error);
      return { acctCode: "", acctName: "" };
    }
  };

  const getDefaultAdvancesAcctCode = async () => {
    const defaultAccount = await getDefaultAdvancesAccount();
    return defaultAccount?.acctCode || "";
  };

  // Destructure state for easier access
  const {
    // Document info
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

    // Tabs & loading
    activeTab,
    GLactiveTab,
    isLoading,
    showSpinner,

    // UI states / disable flags
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    triggerGLEntries,

    // Currency
    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,

    // Transaction Header
    branchCode,
    branchName,
    vendName,
    vendCode,
    currencyCode,
    currencyName,
    currencyRate,
    apTypes,
    selectedApType,
    apAccountName,
    apAccountCode,
    header,
    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,
    fieldVisibility,

    // Contexts
    modalContext,
    selectionContext,
    selectedRowIndex,
    accountModalSource,
    showAllTranDocNo,

    // Modals
    showAccountModal,
    showRcModal,
    showVatModal,
    showAtcModal,
    showSlModal,
    showPaytermModal,
    currencyModalOpen,
    branchModalOpen,
    payeeModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostingModal,
  } = state;

  const amountRefs = useRef([]);

  useEffect(() => {
    if (!refsLoaded || documentID || documentNo) return;

    updateState({
      branchCode: assignedUserBranch.branchCode,
      branchName: assignedUserBranch.branchName,
      userCode: currentUserRow?.userCode || "",
    });
  }, [
    refsLoaded,
    currentUserRow?.userCode,
    assignedUserBranch.branchCode,
    assignedUserBranch.branchName,
    documentID,
    documentNo,
  ]);

  // Document type constants
  const docType = docTypes.APV;
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Transaction";

  // Status Global Setup
  const displayStatus = status || "OPEN";
  const normalizedStatus = String(displayStatus).trim().toUpperCase();
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[normalizedStatus] || "";
  const isFormDisabled =
    isViewDocumentUrl ||
    ["POSTED", "FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedStatus);

  // Field visibility based on AP type
  useEffect(() => {
    const shouldHideInvoiceDetails = isNonPurchasesApType(selectedApType);
    updateState({
      fieldVisibility: {
        ...fieldVisibility,
        invoiceDetails: !shouldHideInvoiceDetails,
      },
    });
  }, [selectedApType]);

  // useEffect(() => {
  //   const onKey = (e) => {
  //     if (e.key === "F1") {
  //       e.preventDefault();

  //       if (!isDocNoDisabled && !isFormDisabled) {
  //         updateState({ showAllTranDocNo: true });
  //       }
  //     }
  //   };

  //   window.addEventListener("keydown", onKey);
  //   return () => window.removeEventListener("keydown", onKey);
  // }, [isDocNoDisabled, isFormDisabled]);


    useEffect(() => {
      const onKey = (e) => {
        if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

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

const openPOAPVLookupColumns = [
  { key: "branchCode", label: "Branch", width: 80 },
  { key: "docType", label: "Document Type", width: 110 },
  { key: "poJoNo", label: "PO/JO No", width: 120 },
  { key: "poJoDate", label: "PO/JO Date", width: 110 },
  { key: "vendCode", label: "Payee Code", width: 110 },
  { key: "vendName", label: "Payee Name", width: 220 },
  { key: "payterm", label: "Payterm", width: 180 },
  { key: "currCode", label: "Currency", width: 90 },
  { key: "poAmount", label: "PO Amount", width: 130, type: "amount" },
  { key: "vatCode", label: "VAT Code", width: 100 },
  { key: "vatAmount", label: "VAT Amount", width: 130, type: "amount" },
];



const resolveGlobalLookupColumns = async (endpointKey) => {
  const result = await selectedHSColConfig(endpointKey);
  const rawResult = result?.data?.[0]?.result ?? result?.[0]?.result ?? result?.result ?? result;

  return typeof rawResult === "string"
    ? JSON.parse(rawResult || "[]")
    : rawResult;
};


const handleOpenReferencePOAdvance = async (overrides = {}) => {
  setShowInvoiceAddDropdown(false);

  const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
  const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();

  if (!lookupVendCode) {
    updateState({
      payeeModalOpen: true,
      modalContext: "openPOAdvance",
    });
    return;
  }

  try {
    updateState({ isLoading: true, showSpinner: true });

    const lookupPayload = {
      branchCode: lookupBranchCode,
      vendCode: lookupVendCode,
    };

    // Keep both payload shapes for compatibility with PO procedure versions
    // that read either $.branchCode/$.vendCode or $.json_data.*.
    const response = await fetchData("getPOAPV_Summary", {
      PARAMS: JSON.stringify({
        ...lookupPayload,
        json_data: lookupPayload,
      }),
    });

    const rawRows = extractOpenRRResponseRows(response).filter((row) => {
      const rowBranchCode = String(row.branchCode ??  "").trim();
      const rowVendCode = String( row.vendCode ??  "").trim();

      return (
        (!lookupBranchCode || rowBranchCode === lookupBranchCode) &&
        (!lookupVendCode || rowVendCode === lookupVendCode)
      );
    });

    const normalizedRows = rawRows.map((row, index) => ({
      ...row,
      groupId:
        row.groupId ||
        [row.branchCode, row.docType, row.poJoNo, index + 1].filter(Boolean).join("-"),
      type: row.docType || "PO",
      poNo: row.poJoNo || "",
      poDate: row.poJoDate || "",
      siAmount: row.poAmount || 0,
      amount: row.poAmount || 0,
      vatAmount: row.vatAmount || 0,
      vatCode: row.vatCode || "",
    }));

    if (normalizedRows.length === 0) {
      useSwalErrorAlert(
        "APV Advances Reference",
        "No PO with advance payment terms found for this supplier."
      );
      return;
    }

    updateState({
      globalLookupRow: normalizedRows,
      globalLookupHeader: openPOAPVLookupColumns,
      globalLookupTitle: "Open PO / JO References",
      globalLookupBtnCaption: "Get Selected PO/JO",
      showRRRefModal: true,
      modalContext: "openPOAdvance",
    });
  } catch (error) {
    console.error("Failed to fetch PO APV Advances:", error);
    useSwalErrorAlert(
      "APV Advances Reference",
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error in fetching PO advances reference."
    );
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};


const handleOpenReferenceLCImportation = async (overrides = {}) => {
  setShowInvoiceAddDropdown(false);

  const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
  const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();
  const lcSummaryEndpoint = "getAPVLC_OpenSummary";

  try {
    updateState({ isLoading: true, showSpinner: true });

    const lookupPayload = {
      branchCode: lookupBranchCode,
      ...(lookupVendCode ? { vendCode: lookupVendCode } : {}),
    };

    const requestAttempts = [
      async () => fetchDataJson(lcSummaryEndpoint, lookupPayload),
      async () => fetchData(lcSummaryEndpoint, {
        PARAMS: JSON.stringify({ json_data: lookupPayload }),
      }),
      async () => postRequest(
        lcSummaryEndpoint,
        JSON.stringify({ json_data: lookupPayload }),
      ),
    ];

    let rawRows = [];
    let lastError = null;

    for (const requestOpenLCReference of requestAttempts) {
      try {
        const response = await requestOpenLCReference();
        rawRows = extractOpenRRResponseRows(response);
        if (rawRows.length > 0) break;
      } catch (requestError) {
        lastError = requestError;
        console.warn("Open LC Importation lookup attempt failed:", requestError);
      }
    }

    if (lastError && rawRows.length === 0) {
      throw lastError;
    }

    if (rawRows.length === 0) {
      useSwalErrorAlert(
        "LC Importation Reference",
        "No open LC Importation reference found."
      );
      return;
    }

    const lcSummaryColumns = await resolveGlobalLookupColumns(lcSummaryEndpoint);

    updateState({
      globalLookupRow: rawRows,
      globalLookupHeader: lcSummaryColumns,
      globalLookupConfigEndpoint: lcSummaryEndpoint,
      globalLookupTitle: "Open LC Importation References",
      globalLookupBtnCaption: "Get Selected LC",
      showRRRefModal: true,
      modalContext: "openLCImportation",
    });
  } catch (error) {
    console.error("Failed to fetch LC Importation reference:", error);
    useSwalErrorAlert(
      "LC Importation Reference",
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error in fetching LC Importation reference."
    );
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

  const getLookupValue = (row, ...keys) => {
    if (!row || typeof row !== "object") return "";

    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }

    const normalizeKey = (key) =>
      String(key || "")
        .replace(/[_\s-]/g, "")
        .toLowerCase();
    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
      acc[normalizeKey(key)] = value;
      return acc;
    }, {});

    for (const key of keys) {
      const value = normalized[normalizeKey(key)];
      if (value !== undefined && value !== null && value !== "") return value;
    }

    return "";
  };

  const rrAmountKeys = [
    "siAmount",
    "si_amount",
    "SI_AMOUNT",
    "amount",
    "AMOUNT",
    "rrAmount",
    "RR_AMOUNT",
    "joAmount",
    "JO_AMOUNT",
    "itemAmount",
    "item_amount",
    "ITEM_AMOUNT",
    "grossAmount",
    "gross_amount",
    "GROSS_AMOUNT",
    "netAmount",
    "net_amount",
    "NET_AMOUNT",
    "totalAmount",
    "total_amount",
    "TOTAL_AMOUNT",
    "extendedAmount",
    "extended_amount",
    "EXTENDED_AMOUNT",
  ];

  const rrVatAmountKeys = [
    "vatAmount",
    "vat_amount",
    "VAT_AMOUNT",
    "vatAmt",
    "vat_amt",
    "VAT_AMT",
  ];

  const rrQuantityKeys = ["qty", "QTY", "quantity", "QUANTITY", "recQty", "rec_qty", "REC_QTY"];

  const rrUnitCostKeys = [
    "unitCost",
    "unit_cost",
    "UNIT_COST",
    "cost",
    "COST",
    "price",
    "PRICE",
  ];

  const getLookupNumber = (row, keys) => {
    const value = getLookupValue(row, ...keys);
    const parsed = parseFormattedNumber(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getRRLineAmount = (row) => {
    const explicitAmount = getLookupNumber(row, rrAmountKeys);
    if (explicitAmount) return explicitAmount;

    const quantity = getLookupNumber(row, rrQuantityKeys);
    const unitCost = getLookupNumber(row, rrUnitCostKeys);

    return quantity && unitCost ? quantity * unitCost : 0;
  };

  const fetchRRReferenceDetails = async (item) => {
    const referenceType = String(item.type || item.invType || item.rrSource || "").toUpperCase();

    if (referenceType === "JO") {
      return [];
    }

    const selectedIds = [item.rrId, item.groupId, item.id]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(",");

    const detailPayload = {
      json_data: {
        selectedIds,
        selectedId: selectedIds,
        rrId: item.rrId || "",
        rrHdId: item.rrId || "",
        rrNo: item.rrNo || "",
        poNo: item.poNo || "",
        branchCode: item.branchCode || branchCode || "",
        vendCode: item.vendCode || vendCode || "",
        invType: item.type || item.invType || "MS",
        type: item.type || item.invType || "MS",
        rrSource: item.rrSource || item.type || item.invType || "",
      },
    };

    try {
      const response = await postRequest("getAPVRR_OpenDetail", detailPayload);
      return extractOpenRRResponseRows(response).map((row, index) =>
        normalizeOpenRRRow(row, index),
      );
    } catch (error) {
      console.warn("Unable to fetch RR reference details; using summary row.", error);
      return [];
    }
  };

  const enrichRRReferenceItem = async (item) => {
    const detailRows = await fetchRRReferenceDetails(item);

    if (detailRows.length === 0) {
      return item;
    }

    const detailAmount = detailRows.reduce(
      (total, detailRow) => total + getRRLineAmount(detailRow),
      0,
    );
    const detailVatAmount = detailRows.reduce(
      (total, detailRow) => total + getLookupNumber(detailRow, rrVatAmountKeys),
      0,
    );
    const firstDetail = detailRows[0] || {};

    return {
      ...item,
      ...Object.fromEntries(
        Object.entries({
          drAcct: item.drAcct || item.debitAcct || firstDetail.drAcct || firstDetail.debitAcct,
          debitAcct: item.debitAcct || item.drAcct || firstDetail.debitAcct || firstDetail.drAcct,
          rcCode: item.rcCode || firstDetail.rcCode,
          rcName: item.rcName || firstDetail.rcName,
          vatCode: item.vatCode || firstDetail.vatCode,
          vatDesc: item.vatDesc || firstDetail.vatDesc,
          categCode: item.categCode || firstDetail.categCode,
          siNo: item.siNo || firstDetail.siNo,
          siDate: item.siDate || firstDetail.siDate,
          paytermCode: item.paytermCode || firstDetail.paytermCode,
          terms: item.terms || firstDetail.terms,
          dueDate: item.dueDate || firstDetail.dueDate,
          remarks: item.remarks || firstDetail.remarks,
        }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
      ),
      siAmount: detailAmount || getRRLineAmount(item),
      amount: detailAmount || getRRLineAmount(item),
      vatAmount: detailVatAmount || getLookupNumber(item, rrVatAmountKeys),
      rrDetailRows: detailRows,
    };
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

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractOpenRRRows(item));
  }

  if (value?.result) return extractOpenRRRows(value.result);
  if (value?.RESULT) return extractOpenRRRows(value.RESULT);
  if (value?.JsonResult) return extractOpenRRRows(value.JsonResult);

  if (Array.isArray(value?.data)) {
    return value.data.flatMap((item) => extractOpenRRRows(item));
  }

  if (value?.data) return extractOpenRRRows(value.data);
  if (value?.rows) return extractOpenRRRows(value.rows);
  if (value?.dt1) return extractOpenRRRows(value.dt1);

  if (typeof value === "object" && Object.keys(value).length > 0) {
    return [value];
  }

  return [];
};

const extractOpenRRResponseRows = (response) => {
  return extractOpenRRRows(response);
};

  const normalizeOpenRRRow = (row, index) => {
  const type = getLookupValue(row, "type", "Type", "TYPE", "invType", "INV_TYPE");

  const rrNo = getLookupValue(
    row,
    "rrNo",
    "rr_no",
    "RR_NO",
    "msrrNo",
    "MSRR_NO",
    "joNo",
    "jo_no",
    "JO_NO",
    "docNo",
    "DOC_NO",
    "tranNo",
    "TRAN_NO",
  );

  const rrId = getLookupValue(
    row,
    "rrId",
    "rr_id",
    "RR_ID",
    "rrHdId",
    "RR_HD_ID",
    "msrrId",
    "MSRR_ID",
    "joId",
    "jo_id",
    "JO_ID",
  );

  const poNo = getLookupValue(
    row,
    "poNo",
    "po_no",
    "PO_NO",
    "joNo",
    "jo_no",
    "JO_NO",
  );

  return {
    ...row,
    groupId:
      getLookupValue(row, "groupId", "GROUP_ID", "id", "ID") ||
      [rrId, rrNo, poNo, index + 1].filter(Boolean).join("-") ||
      String(index + 1),

    type,
    branchCode: getLookupValue(
      row,
      "branchCode",
      "BranchCode",
      "BRANCH_CODE",
      "bc",
      "BC",
    ),

    rrNo,
    rrDate: getLookupValue(
      row,
      "rrDate",
      "rr_date",
      "RR_DATE",
      "joDate",
      "jo_date",
      "JO_DATE",
    ),
    rrId,

    poNo,

    vendCode: getLookupValue(row, "vendCode", "vend_code", "VEND_CODE"),
    vendName: getLookupValue(row, "vendName", "vend_name", "VEND_NAME"),

    siNo: getLookupValue(row, "siNo", "si_no", "SI_NO", "drNo", "DR_NO"),
    siDate: getLookupValue(
      row,
      "siDate",
      "si_date",
      "SI_DATE",
      "rrDate",
      "RR_DATE",
      "joDate",
      "JO_DATE",
    ),

    siAmount: getLookupValue(
      row,
      "siAmount",
      "si_amount",
      "SI_AMOUNT",
      "amount",
      "AMOUNT",
      "rrAmount",
      "RR_AMOUNT",
      "joAmount",
      "JO_AMOUNT",
    ),

    drAcct: getLookupValue(
      row,
      "drAcct",
      "dr_acct",
      "DR_ACCT",
      "debitAcct",
      "DEBIT_ACCT",
    ),

    rcCode: getLookupValue(row, "rcCode", "rc_code", "RC_CODE"),
    rcName: getLookupValue(row, "rcName", "rc_name", "RC_NAME"),

    vatCode: getLookupValue(row, "vatCode", "vat_code", "VAT_CODE"),
    vatDesc: getLookupValue(
      row,
      "vatDesc",
      "vat_desc",
      "VAT_DESC",
      "vatName",
      "VAT_NAME",
    ),
    vatAmount: getLookupValue(row, "vatAmount", "vat_amount", "VAT_AMOUNT"),

    categCode: getLookupValue(
      row,
      "categCode",
      "categ_code",
      "CATEG_CODE",
      "categoryCode",
      "CATEGORY_CODE",
    ),
  };
};

  // Loading spinner component
  // const LoadingSpinner = () => (
  //   <div className="global-tran-spinner-main-div-ui">
  //     <div className="global-tran-spinner-sub-div-ui">
  //       <FontAwesomeIcon
  //         icon={faSpinner}
  //         spin
  //         size="2x"
  //         className="text-blue-500 mb-2"
  //       />
  //       <p>Please wait...</p>
  //     </div>
  //   </div>
  // );

  useEffect(() => {
    if (triggerGLEntries) {
      handleActivityOption("GenerateGL").then(() => {
        updateState({ triggerGLEntries: false });
      });
    }
  }, [triggerGLEntries]);

  // Effect for currency updates in detail rows
  useEffect(() => {
    if (vendName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map((row) => ({
        ...row,
        currency: vendName.currCode,
      }));
      updateState({ detailRows: updatedRows });
    }
  }, [vendName?.currCode]);

  // Effect for GL totals calculation
  useEffect(() => {
    const debitSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0,
    );
    const creditSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0,
    );
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
    });
  }, [detailRowsGL]);

  // Effect for document number disable state
  useEffect(() => {
    updateState({ isDocNoDisabled: !!documentID });
  }, [documentID]);

  // Initialize component
  useEffect(() => {
    handleReset();
  }, []);

  // Currency mode effect
  useEffect(() => {
    if (glCurrMode && glCurrDefault && currencyCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currencyCode);
    }
  }, [glCurrMode, glCurrDefault, currencyCode]);

  // Helper functions
  const updateTotalsDisplay = (invoice, vat, atc, payable) => {
    const totalInvoiceElement = document.getElementById("totalInvoiceAmount");
    const totalVATElement = document.getElementById("totalVATAmount");
    const totalATCElement = document.getElementById("totalATCAmount");
    const totalPayableElement = document.getElementById("totalPayableAmount");

    if (totalInvoiceElement)
      totalInvoiceElement.textContent = formatNumber(invoice);
    if (totalVATElement) totalVATElement.textContent = formatNumber(vat);
    if (totalATCElement) totalATCElement.textContent = formatNumber(atc);
    if (totalPayableElement)
      totalPayableElement.textContent = formatNumber(payable);
  };

  const updateTotals = (rows) => {
    let totalInvoice = 0;
    let totalVAT = 0;
    let totalATC = 0;
    let totalPayable = 0;

    rows.forEach((row) => {
      const invoiceAmount =
        parseFormattedNumber(row.siAmount || row.amount || 0) || 0;
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;

      totalInvoice += invoiceAmount;
      totalVAT += vatAmount;
      totalATC += atcAmount;
    });

    totalPayable = totalInvoice + totalVAT - totalATC;
    updateTotalsDisplay(totalInvoice, totalVAT, totalATC, totalPayable);
  };

  const calculateDueDate = (startDate, daysDue) => {
    const parsedDaysDue = Number.parseInt(daysDue, 10);
    if (!startDate || Number.isNaN(parsedDaysDue)) return "";

    try {
      const rawDate = String(startDate).trim();
      let year;
      let month;
      let day;

      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(rawDate)) {
        [year, month, day] = rawDate.split("-").map(Number);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const parts = rawDate.split("/").map(Number);
        [month, day, year] = parts;
      } else {
        const fallbackDate = new Date(rawDate);
        if (Number.isNaN(fallbackDate.getTime())) return "";
        year = fallbackDate.getFullYear();
        month = fallbackDate.getMonth() + 1;
        day = fallbackDate.getDate();
      }

      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + parsedDaysDue);

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch (error) {
      console.error("Error calculating due date:", error);
      return "";
    }
  };

  const getPaytermDaysDue = (paytermData) =>
    paytermData?.daysDue ??
    paytermData?.days_due ??
    paytermData?.DAYS_DUE ??
    paytermData?.dueDays ??
    paytermData?.due_days ??
    "";

  const getPaytermCode = (paytermData) =>
    paytermData?.paytermCode ??
    paytermData?.payterm_code ??
    paytermData?.PAYTERM_CODE ??
    "";

  const getPaytermName = (paytermData) =>
    paytermData?.paytermName ??
    paytermData?.payterm_name ??
    paytermData?.PAYTERM_NAME ??
    "";

  const recalculateDueDatesByApvDate = async (apvDate) => {
    const updatedRows = await Promise.all(
      detailRows.map(async (row) => {
        if (!row.paytermCode) return row;

        const paytermData = await useTopPayTermRow(row.paytermCode);
        const daysDue = getPaytermDaysDue(paytermData);

        return {
          ...row,
          dueDate: calculateDueDate(apvDate, daysDue),
        };
      }),
    );

    updateState({
      header: {
        ...header,
        apv_date: apvDate,
      },
      detailRows: updatedRows,
    });
  };

  // API call functions
  const loadCompanyData = async () => {
    const hsOption = await useTopHSOption();
    if (hsOption) {
      updateState({
        glCurrMode: hsOption.glCurrMode,
        glCurrDefault: hsOption.glCurrDefault,
        currencyCode: hsOption.glCurrDefault,
        glCurrGlobal1: hsOption.glCurrGlobal1,
        glCurrGlobal2: hsOption.glCurrGlobal2,
        glCurrGlobal3: hsOption.glCurrGlobal3,
      });

      const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
      if (curr) {
        updateState({
          currencyName: curr.currName,
          currencyRate: formatNumber(1, 6),
        });
      }
    }
  };

  const loadCurrencyMode = (
    mode = glCurrMode,
    defaultCurr = glCurrDefault,
    curr = currencyCode,
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

  const loadDocControl = async () => {
    const data = await useTopDocControlRow(docType);
    if (data) {
      updateState({
        documentName: data.docName,
        documentSeries: data.docName,
        documentDocLen: data.docName,
      });
    }
  };

  // API call functions
  const getDocumentControl = async () => {
    try {
      const response = await fetchData("getHSDoc", { DOC_ID: "APV" });
      if (response.success) {
        const result = JSON.parse(response.data[0].result);
        updateState({
          documentName: result[0]?.docName,
          documentSeries: result[0]?.docName,
          documentDocLen: result[0]?.docName,
        });
        await fetchApTypes();
      }
    } catch (err) {
      console.error("Document Control API error:", err);
    }
  };

  const fetchApTypes = async () => {
    try {
      const payload = {
        json_data: {
          dropdownColumn: "APVTRAN_TYPE",
          docCode: "APV",
        },
      };

      const response = await postRequest(
        "getHSDropdown",
        JSON.stringify(payload),
      );

      if (response.success) {
        const result = JSON.parse(response.data[0].result);
        const updates = { apTypes: result };

        if (result.length > 0) {
          updates.selectedApType = result[0].DROPDOWN_CODE;
        }

        updateState(updates);
      }
    } catch (error) {
      console.error("Error fetching AP Types:", error);
    }
  };

  const handleReset = () => {
    loadDocControl();
    loadCompanyData();
    fetchApTypes();

    updateState({
      header: {
        apv_date: useGetCurrentDayV2(),
        remarks: "",
        refDocNo1: "",
        refDocNo2: "",
        fromDate: null,
        toDate: null,
      },
      branchCode: assignedUserBranch.branchCode,
      branchName: assignedUserBranch.branchName,
      currCode:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      apAccountName: "",
      apAccountCode: "",
      vendName: null,
      vendCode: null,
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      status: "OPEN",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
    });

    updateTotalsDisplay(0, 0, 0, 0);
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
        "apvNo",
        direction,
      );

      console.log("Fetched data:", data);

      if (!data?.apvId) {
        console.warn("No apvId found in data:", data);
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      // Format header date
      const apvDateForHeader = data.apvDate
        ? useformatToDatev2(data.apvDate)
        : "";

      console.log("Formatted APV date:", apvDateForHeader);

      const retrievedApType = data.apvtranType || data.apvType || "APV01";
      const defaultAdvancesAcctCode = ["APV01", "APV03"].includes(retrievedApType)
        ? await getDefaultAdvancesAcctCode()
        : "";

      // Format detail rows with proper date handling
      const retrievedDetailRows = (data.dt1 || []).map((item, index) => {
        console.log(`Processing detail row ${index}:`, item);

        // Format invoice date (siDate)
        const formattedSiDate = item.siDate
          ? useformatToDatev2(item.siDate)
          : "";
        const formattedDueDate = item.dueDate
          ? useformatToDatev2(item.dueDate)
          : "";

        return {
          ...item,
          rrNo: item.rrNo || item.rr_no || item.RR_NO || item.msrrNo || item.MSRR_NO || "",
          poNo:
            item.poNo ||
            item.po_no ||
            item.PO_NO ||
            item.joNo ||
            item.jo_no ||
            item.JO_NO ||
            "",
          origAmount: formatNumber(item.origAmount),
          currRate: formatNumber(item.currRate),
          siAmount: formatNumber(item.siAmount),
          discRate: formatNumber(item.discRate),
          unappliedAmount: formatNumber(item.unappliedAmount),
          netDisc: formatNumber(item.netDisc),
          vatAmount: formatNumber(item.vatAmount),
          atcAmount: formatNumber(item.atcAmount),
          apvAmount: formatNumber(item.apvAmount),
          advAcct:
            item.advAcct ||
            item.adv_acct ||
            item.ADV_ACCT ||
            item.advanceAcct ||
            item.ADVANCE_ACCT ||
            defaultAdvancesAcctCode,
          advpoNo:
            item.advpoNo ||
            item.advpo_no ||
            item.ADVPO_NO ||
            item.appliedAdvancesPo ||
            item.APPLIED_ADVANCES_PO ||
            "",
          advpoAmount: formatNumber(
            item.advpoAmount ||
              item.advpo_amount ||
              item.ADVPO_AMOUNT ||
              item.appliedAdvancesAmt ||
              item.APPLIED_ADVANCES_AMT ||
              0,
          ),
          advpoVatAmount: formatNumber(
            item.advpoVatAmount ||
              item.advpoVATAmount ||
              item.advVatAmount ||
              item.advpoAtcAmount ||
              item.advpo_atc_amount ||
              item.ADVPO_ATC_AMOUNT ||
              item.appliedAdvancesVat ||
              item.APPLIED_ADVANCES_VAT ||
              0,
          ),
          // Backend column is currently advpo_atc_amount; keep this alias for save/retrieve compatibility.
          advpoAtcAmount: formatNumber(
            item.advpoAtcAmount ||
              item.advpo_atc_amount ||
              item.ADVPO_ATC_AMOUNT ||
              item.advpoVatAmount ||
              item.appliedAdvancesVat ||
              0,
          ),
          siDate: formattedSiDate,
          dueDate: formattedDueDate,
          REC_RC: item.REC_RC || "N",
          REC_SL: item.REC_SL || "N",
        };
      });

      console.log("Processed detail rows:", retrievedDetailRows);

      const formattedGLRows = (data.dt2 || []).map((glRow, index) => {
        console.log(`Processing GL row ${index}:`, glRow);
        return {
          ...glRow,
          debit: formatNumber(glRow.debit),
          credit: formatNumber(glRow.credit),
          debitFx1: formatNumber(glRow.debitFx1),
          creditFx1: formatNumber(glRow.creditFx1),
          debitFx2: formatNumber(glRow.debitFx2),
          creditFx2: formatNumber(glRow.creditFx2),
          slrefDate: normalizeSlrefDate(glRow.slrefDate),
        };
      });

      console.log("Processed GL rows:", formattedGLRows);

      // Create vendor object with all necessary properties
      const vendorData = {
        vendCode: data.vendCode || "",
        vendName: data.vendName || "",
        currCode: data.currCode || "",
        tin: data.tin || "",
      };

      console.log("Vendor data:", vendorData);

      // Extract AP account information
      let apAccountCode = "";
      let apAccountName = "";

      // Check various possible field names for AP account data
      if (data.apAcct) {
        apAccountCode = data.apAcct;
      } else if (data.acctCode) {
        apAccountCode = data.acctCode;
      } else if (data.apAccountCode) {
        apAccountCode = data.apAccountCode;
      }

      // Try to get account name from different possible field names
      if (data.apAccountName) {
        apAccountName = data.apAccountName;
      } else if (data.acctName) {
        apAccountName = data.acctName;
      }

      console.log("AP Account info:", { apAccountCode, apAccountName });

      // If we have account code but no name, try to fetch the account name
      if (apAccountCode && !apAccountName) {
        try {
          console.log("Fetching AP account name for code:", apAccountCode);
          const accountResponse = await fetchData("getCOA", {
            ACCT_CODE: apAccountCode,
          });
          if (accountResponse?.success) {
            const accountData = JSON.parse(
              accountResponse.data[0]?.result || "[]",
            );
            if (accountData.length > 0) {
              apAccountName =
                accountData[0]?.acctName || accountData[0]?.ACCT_NAME || "";
              console.log("Fetched AP account name:", apAccountName);
            }
          }
        } catch (error) {
          console.warn("Could not fetch AP account name:", error);
        }
      }

      // const resolvedStatus =
      //   data.docStatus ||
      //   (data.apvCancelled === "Y"
      //     ? "CANCELLED"
      //     : data.apvStatus === "F"
      //       ? "FINALIZED"
      //       : data.apvStatus === "C"
      //         ? "CLOSED"
      //         : "OPEN");

      // Align with CV:
      // documentStatus keeps the raw DB status for validations/posting/cancel.
      // status keeps the display status from dbo.fnGetDocumentStatus.
      const stateUpdates = {
        documentStatus: data.apvStatus || "",
        status: data.docStatus,
        documentID: data.apvId,
        documentNo: data.apvNo,
        branchCode: data.branchCode,
        header: {
          ...header,
          apv_date: apvDateForHeader,
          remarks: data.remarks || "",
          refDocNo1: data.refapvNo1 || data.refDocNo1 || "",
          refDocNo2: data.refapvNo2 || data.refDocNo2 || "",
        },
        selectedApType: retrievedApType,
        vendCode: data.vendCode,
        vendName: vendorData,
        currencyCode: data.currCode,
        currencyName: data.currName,
        currencyRate: formatNumber(data.currRate || 1, 6),
        apAccountCode: apAccountCode,
        apAccountName: apAccountName,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      };

      console.log("Final state updates:", stateUpdates);
      updateState(stateUpdates);

      updateTotals(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.message || "Failed to fetch transaction data",
      });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  // const handleHistoryRowPick = useCallback(
  //   async (row) => {
  //     const docNo = row?.docNo;
  //     const branchCode = row?.branchCode;
  //     if (!docNo || !branchCode) return;

  //     await fetchTranData(docNo, branchCode);
  //     setTopTab("details");
  //   },
  //   [fetchTranData],
  // );

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
    const docNo = params.get("apvNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  const fetchRCNameByCode = async (rcCode) => {
    if (!rcCode) return "";

    try {
      const response = await fetchData("getRCMast", {
        RC_CODE: rcCode,
      });

      if (!response?.success) return "";

      let rcData = response.data || [];

      if (rcData?.[0]?.result) {
        rcData = JSON.parse(rcData[0].result || "[]");
      }

      const row = Array.isArray(rcData) ? rcData[0] : rcData;

      return row?.rcName || row?.rc_name || row?.RC_NAME || "";
    } catch (error) {
      console.error("Could not fetch RC name:", error);
      return "";
    }
  };

  const handleDocumentNoBlur = () => {
    console.log("Document No blur:", documentNo, "Branch:", branchCode);

    if (!documentID && documentNo && branchCode) {
      console.log("Attempting to fetch data...");
      fetchTranData(documentNo, branchCode);
    } else {
      console.log("Skipped fetch because:", {
        hasDocumentID: !!documentID,
        hasDocumentNo: !!documentNo,
        hasBranchCode: !!branchCode,
      });
    }
  };

  const fetchRCDetails = async (rcCode) => {
    if (!rcCode) return null;

    try {
      const response = await fetchData("getRCMast", {
        RC_CODE: rcCode,
      });

      if (response?.success) {
        let rcData = response.data || [];

        if (rcData?.[0]?.result) {
          rcData = JSON.parse(rcData[0].result || "[]");
        }

        const row = Array.isArray(rcData) ? rcData[0] : rcData;

        if (!row) return null;

        return {
          rcCode: row.rcCode || row.RC_CODE || rcCode,
          rcName: row.rcName || row.rc_name || row.RC_NAME || "",
        };
      }
    } catch (error) {
      console.error("Could not fetch RC details:", error);
    }

    return null;
  };

  const handleCurrencyRateBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currencyRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currencyCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };

  // Add this validation function near the other helper functions
  const validateDebitCreditBalance = () => {
    const debitTotal = parseFormattedNumber(totalDebit);
    const creditTotal = parseFormattedNumber(totalCredit);

    // Check if totals are balanced (allowing for small rounding differences)
    return Math.abs(debitTotal - creditTotal) < 0.01;
  };

  const normalizeInvoiceNo = (value) =>
    String(value || "").trim().toUpperCase();

  const findDuplicateInvoiceInRows = (rows) => {
    const seen = new Map();

    for (const [index, row] of rows.entries()) {
      const invoiceNo = normalizeInvoiceNo(row.siNo);
      if (!invoiceNo) continue;

      if (seen.has(invoiceNo)) {
        return {
          invoiceNo: row.siNo,
          firstRow: seen.get(invoiceNo) + 1,
          duplicateRow: index + 1,
        };
      }

      seen.set(invoiceNo, index);
    }

    return null;
  };

  const parseApiResultRows = (response) => {
    const rawResult = response?.data?.[0]?.result;
    if (!rawResult) return [];

    try {
      const parsed = JSON.parse(rawResult);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error("Failed to parse APV duplicate invoice result:", error);
      return [];
    }
  };

  const getTransactionId = (record) =>
    String(
      record?.apvId ||
        record?.APV_ID ||
        record?.documentID ||
        record?.documentId ||
        "",
    );

  const recordHasInvoiceNo = (record, invoiceNo) => {
    const normalizedInvoiceNo = normalizeInvoiceNo(invoiceNo);
    const detailRows =
      (Array.isArray(record?.dt1) && record.dt1) ||
      (Array.isArray(record?.DT1) && record.DT1) ||
      (Array.isArray(record?.details) && record.details) ||
      [];

    return (
      normalizeInvoiceNo(record?.siNo) === normalizedInvoiceNo ||
      normalizeInvoiceNo(record?.SI_NO) === normalizedInvoiceNo ||
      normalizeInvoiceNo(record?.si_no) === normalizedInvoiceNo ||
      detailRows.some(
        (detailRow) =>
          normalizeInvoiceNo(detailRow?.siNo) === normalizedInvoiceNo ||
          normalizeInvoiceNo(detailRow?.SI_NO) === normalizedInvoiceNo ||
          normalizeInvoiceNo(detailRow?.si_no) === normalizedInvoiceNo,
      )
    );
  };

  const validateInvoiceNoAvailability = async () => {
    if (!fieldVisibility.invoiceDetails) return true;

    const duplicateInRows = findDuplicateInvoiceInRows(detailRows);
    if (duplicateInRows) {
      await Swal.fire({
        icon: "warning",
        title: "Duplicate Invoice No.",
        text: `Invoice No. ${duplicateInRows.invoiceNo} is repeated in rows ${duplicateInRows.firstRow} and ${duplicateInRows.duplicateRow}.`,
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
      return false;
    }

    const invoiceRows = detailRows
      .map((row) => normalizeInvoiceNo(row.siNo))
      .filter(Boolean);
    const uniqueInvoiceNos = [...new Set(invoiceRows)];

    for (const invoiceNo of uniqueInvoiceNos) {
      try {
        const response = await fetchData(`get${docType}`, {
          siNo: invoiceNo,
          vendCode: vendCode || "",
          branchCode: branchCode || "",
        });

        if (!response?.success) continue;

        const matchedRecord = parseApiResultRows(response).find((record) => {
          const isCurrentDocument =
            documentID && getTransactionId(record) === String(documentID);
          return !isCurrentDocument && recordHasInvoiceNo(record, invoiceNo);
        });

        if (matchedRecord) {
          await Swal.fire({
            icon: "warning",
            title: "Invoice No. Already Used",
            text: `Invoice No. ${invoiceNo} is already used in APV No. ${matchedRecord.apvNo || matchedRecord.APV_NO || "another transaction"}.`,
            confirmButtonText: "OK",
            confirmButtonColor: "#3085d6",
          });
          return false;
        }
      } catch (error) {
        console.error("Error validating duplicate invoice number:", error);
        await Swal.fire({
          icon: "error",
          title: "Invoice Validation Error",
          text: "Could not validate the Invoice No. Please try saving again.",
          confirmButtonText: "OK",
          confirmButtonColor: "#3085d6",
        });
        return false;
      }
    }

    return true;
  };

  // Add this function to show the unbalanced warning
  const showUnbalancedWarning = () => {
    Swal.fire({
      icon: "error",
      title: "Cannot Save Transaction",
      html: `
      <div class="text-left">
        <p class="mb-2">Debit and Credit amounts are not balanced.</p>
        <p class="font-semibold">Total Debit: ${totalDebit}</p>
        <p class="font-semibold">Total Credit: ${totalCredit}</p>
      </div>
    `,
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
      Q,
    });
  };

  const handleActivityOption = async (action) => {
  const remarksEl = document.getElementById("remarks");
  if (remarksEl) remarksEl.focus();

  if (action === "Upsert" && detailRowsGL.length === 0) {
    updateState({ triggerGLEntries: true });
    return;
  }

  if (action === "Upsert") {
    const invalidSlrefDateRow = detailRowsGL.findIndex((entry) => {
      const value = String(entry?.slrefDate || "").trim();
      return value && !normalizeSlrefDate(value);
    });

    if (invalidSlrefDateRow >= 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid SL Reference Date",
        text: `GL row ${invalidSlrefDateRow + 1} must use a valid date in MM/DD/YYYY format.`,
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
      return;
    }
  }

  if (action === "Upsert") {
    const canSaveInvoiceNos = await validateInvoiceNoAvailability();
    if (!canSaveInvoiceNos) return;
  }

  if (documentStatus === "" || documentStatus === "OPEN") {
    updateState({ isLoading: true });

    const glData = {
      branchCode: branchCode,
      apvNo: documentNo || "",
      apvId: documentID || "",
      apvDate: header.apv_date,
      apvtranType: selectedApType,
      tranMode: "M",
      acctCode: apAccountCode,
      vendCode: vendCode,
      vendName: vendName?.vendName || "",
      refapvNo1: header.refDocNo1 || "",
      refapvNo2: header.refDocNo2 || "",
      currCode: currencyCode,
      currRate: parseFormattedNumber(currencyRate) || 1,
      remarks: header.remarks || "",
      userCode: user?.USER_CODE ,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        invType: row.invType,
        rrNo: row.rrNo || "",
        poNo: row.poNo || "",
        siNo: row.siNo,
        siDate: row.siDate,
        amount: parseFormattedNumber(row.amount),
        siAmount: parseFormattedNumber(row.siAmount),
        debitAcct: row.debitAcct,
        vatAcct: row.vatAcct,
        advAcct: row.advAcct || "",
        sltypeCode: row.sltypeCode,
        slCode: row.slCode,
        slName: row.slName,
        rcCode: row.rcCode,
        vatCode: row.vatCode,
        vatAmount: parseFormattedNumber(row.vatAmount),
        atcCode: row.atcCode,
        atcAmount: parseFormattedNumber(row.atcAmount),
        paytermCode: row.paytermCode,
        dueDate: row.dueDate,
        advpoNo: row.advpoNo || "",
        advpoAmount: parseFormattedNumber(row.advpoAmount || 0),
        // sproc_PHP_APV currently reads this as advAtcAmount / advpo_atc_amount.
        // UI label is Applied Advances VAT.
        advAtcAmount: parseFormattedNumber(
          row.advpoVatAmount ?? row.advpoAtcAmount ?? 0,
        ),
      })),
      dt2: detailRowsGL.map((entry, index) => ({
        recNo: String(index + 1),
        acctCode: entry.acctCode,
        rcCode: entry.rcCode,
        sltypeCode: entry.sltypeCode,
        slCode: entry.slCode,
        atcCode: entry.atcCode,
        particular: entry.particular,
        debit: parseFormattedNumber(entry.debit),
        credit: parseFormattedNumber(entry.credit),
        debitFx1: parseFormattedNumber(entry.debitFx1),
        creditFx1: parseFormattedNumber(entry.creditFx1),
        slrefNo: entry.slRefNo,
        slrefDate: normalizeSlrefDate(entry.slrefDate),
        dt1Lineno: entry.dt1Lineno || "",
      })),
    };

    try {
      if (action === "GenerateGL") {
        let finalGlEntries = [];

        if (isNonPurchasesApType(selectedApType)) {
          // --- NON-PURCHASES GENERATION ---
          
          // 1. Blank Row for Expense side
          const blankRow = {
            acctCode: "",
            rcCode: "",
            rcName: "",
            sltypeCode: "",
            slCode: "",
            slName: "",
            particular: "",
            debit: "0.00",
            credit: "0.00",
            slRefNo: "",
            slrefDate: "",
            remarks: header.remarks || "",
            REQ_RC: "N",
            REQ_SL: "N",
          };

          // 2. Pre-filled AP Account Row (Matching your Invoice Details logic)
          const vName = vendName?.vendName || "";
          const selectedApAccountDisplay =
            apAccountName || apAccountCode || "Accounts Payable";
          
          // standardizing requirement check for AP Account
          // AP accounts usually require SL (Vendor)
          const apRow = {
            acctCode: apAccountCode || "",
            rcCode: "", 
            rcName: "",
            sltypeCode: "VE",
            // If vendor is missing in header, show "REQ SL" immediately
            slCode: vendCode || "REQ SL", 
            slName: vName,
            particular: `${selectedApAccountDisplay}${vName ? ' / ' + vName : ''}`,
            debit: "0.00",
            credit: "0.00",
            slRefNo: "",
            slrefDate: "",
            remarks: header.remarks || "",
            REQ_RC: "N",
            REQ_SL: "Y", // Force requirement for AP line
          };

          finalGlEntries = [blankRow, apRow];
        } else {
          // Standard Generation from SPROC
          const generatedEntries = await useGenerateGLEntries(docType, glData);
          if (generatedEntries) {
            finalGlEntries = generatedEntries.map(entry => {
              // Standardizing flags (Logic from your handleDetailChange)
              const rawRc = entry.rcReq || entry.REQ_RC || entry.REQRC || "N";
              const rawSl = entry.slReq || entry.REQ_SL || entry.REQSL || "N";
              
              const isRcRequired = rawRc === "Y" || rawRc === "Yes";
              const isSlRequired = rawSl === "Y" || rawSl === "Yes";

              return {
                ...entry,
                REQ_RC: isRcRequired ? "Y" : "N",
                REQ_SL: isSlRequired ? "Y" : "N",
                slrefDate: normalizeSlrefDate(entry.slrefDate),
                // Set the placeholder text if required but code is empty
                rcCode: (isRcRequired && (!entry.rcCode || entry.rcCode === "")) ? "REQ RC" : entry.rcCode,
                slCode: (isSlRequired && (!entry.slCode || entry.slCode === "")) ? "REQ SL" : entry.slCode,
              };
            });
          }
        }

        updateState({ detailRowsGL: finalGlEntries });
      }

      if (action === "Upsert") {
        const response = await useTransactionUpsert(docType, glData, updateState, "apvId", "apvNo");
        if (response?.status === "success" && !response.data[0].errorMsg) {
          useSwalshowSaveSuccessDialog(handleReset, () => handleSaveAndPrint(response.data[0].apvId));
          updateState({ 
            isDocNoDisabled: true, 
            isFetchDisabled: true, 
            documentStatus: response.data[0].apvStatus || "",
            status: response.data[0].docStatus || "OPEN",
          });
        }
      }
    } catch (error) {
      console.error(`APV ${action} Error:`, error);
    } finally {
      updateState({ isLoading: false });
    }
  }
};

  //   const syncGLReferenceFromInvoiceDetails = useCallback(
  //     (invoiceRows, glRows) => {
  //       if (!Array.isArray(invoiceRows) || !Array.isArray(glRows))
  //         return glRows || [];

  //       return glRows.map((glRow, glIndex) => {
  //         let sourceRow = null;

  //         // Primary link: dt1Lineno from generated GL entry
  //         if (
  //           glRow?.dt1Lineno !== undefined &&
  //           glRow?.dt1Lineno !== null &&
  //           glRow?.dt1Lineno !== ""
  //         ) {
  //           const targetLn = String(glRow.dt1Lineno);
  //           sourceRow =
  //             invoiceRows.find((invRow, invIndex) => {
  //               const invLn = String(invRow?.lnNo || invIndex + 1);
  //               return invLn === targetLn;
  //             }) || null;
  //         }

  //         // Fallback: same index
  //         if (!sourceRow && invoiceRows[glIndex]) {
  //           sourceRow = invoiceRows[glIndex];
  //         }

  //         return {
  //           ...glRow,
  //           slRefNo: sourceRow?.siNo || "",
  //           slrefDate: sourceRow?.siDate || "",
  //           // FIX: explicitly map the SL fields from the Invoice row to the GL row
  //           slCode: sourceRow?.slCode || glRow.slCode || "",
  //           slName: sourceRow?.slName || glRow.slName || "",
  //           sltypeCode: sourceRow?.sltypeCode || glRow.sltypeCode || "",
  //         };
  //       });
  //     },
  //     [],
  //   );

  //  useEffect(() => {
  //     if (!detailRowsGL.length) return;

  //     const syncedRows = syncGLReferenceFromInvoiceDetails(
  //       detailRows,
  //       detailRowsGL,
  //     );

  //     const hasChanges = syncedRows.some((row, index) => {
  //       return (
  //         (row.slRefNo || "") !== (detailRowsGL[index]?.slRefNo || "") ||
  //         (row.slrefDate || "") !== (detailRowsGL[index]?.slrefDate || "") ||
  //         // FIX: Tell the effect to trigger a state update if the SL Code changes
  //         (row.slCode || "") !== (detailRowsGL[index]?.slCode || "")
  //       );
  //     });

  //     if (hasChanges) {
  //       updateState({ detailRowsGL: syncedRows });
  //     }
  //   }, [detailRows, syncGLReferenceFromInvoiceDetails]);

  const handleAddRow = async (insertIndex = null, useReferenceRR = false) => {
    try {
      const items = await handleFetchDetail(vendCode);
      const itemList = Array.isArray(items) ? items : [items];
      const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();

      const newRows = await Promise.all(
        itemList.map(async (item) => {
          const amount = parseFormattedNumber(item.origAmount || 0);
          
          // 1. Resolve VAT Code: check item details first, fall back to selected Payee master default
          const defaultVatCode = item.vatCode || vendName?.vatCode || "";
          const vatRate = await getVatRate(defaultVatCode);
          const vatData = defaultVatCode ? await useTopVatRow(defaultVatCode) : null;

          // Compute VAT-inclusive amount breakdown
          const computedVatAmount = vatRate > 0 ? (amount / (1 + vatRate)) * vatRate : 0;

          // 2. Resolve ATC Code: check item details first, fall back to selected Payee master default
          const defaultAtcCode = item.atcCode || vendName?.atcCode || "";
          const atcData = defaultAtcCode ? await useTopATCRow(defaultAtcCode) : null;

          return {
            lnNo: "",
            invType: "",
            rrNo: useReferenceRR
              ? item.rrNo ||
                item.rr_no ||
                item.RR_NO ||
                item.msrrNo ||
                item.MSRR_NO ||
                ""
              : "",
            poNo: useReferenceRR
              ? item.poNo ||
                item.po_no ||
                item.PO_NO ||
                item.joNo ||
                item.jo_no ||
                item.JO_NO ||
                ""
              : "",
            siNo: "",
            siDate: useGetCurrentDayV2(),
            amount: formatNumber(amount),
            siAmount: formatNumber(amount),
            debitAcct: "",
            sltypeCode: item.sltypeCode || "VE", // Falls back to Vendor ledger type
            slCode: vendCode || "",
            slName: vendName?.vendName || "",
            
            // Reflected VAT Configurations
            vatCode: defaultVatCode,
            vatName: vatData?.vatName || item.vatName || "",
            vatAmount: formatNumber(computedVatAmount),
            
            // Reflected ATC Configurations
            atcCode: defaultAtcCode,
            atcName: atcData?.atcName || item.atcName || "",
            atcAmount: "0.00",

            advpoNo: "",
            advpoAmount: "0.00",
            advpoVatAmount: "0.00",
            advpoAtcAmount: "0.00",
            advAcct:
              item.advAcct ||
              item.adv_acct ||
              item.ADV_ACCT ||
              item.advanceAcct ||
              item.advancesAcct ||
              defaultAdvancesAcctCode,
            
            paytermCode: item.paytermCode || "",
            dueDate: useGetCurrentDayV2(),
            remarks: "",
            REC_RC: item.REC_RC || "N",
            REC_SL: item.REC_SL || "N",
          };
        }),
      );

      let updatedRows = [...detailRows];

      // Positional Logic
      if (insertIndex !== null && insertIndex >= 0) {
        updatedRows.splice(insertIndex + 1, 0, ...newRows);
      } else {
        updatedRows = [...updatedRows, ...newRows];
      }

      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);
    } catch (error) {
      console.error("Error adding row:", error);
    }
  };

  const handleInvoiceAddClick = () => {
    if (isFormDisabled) return;

    if (String(selectedApType || "").toUpperCase() === "APV07") {
      setShowInvoiceAddDropdown(false);
      handleOpenReferenceLCImportation();
      return;
    }

    setShowInvoiceAddDropdown((prev) => !prev);
  };

  const handleAddInvoiceRow = async () => {
    setShowInvoiceAddDropdown(false);

    if (String(selectedApType || "").toUpperCase() === "APV07") {
      await handleOpenReferenceLCImportation();
      return;
    }

    await handleAddRow();
  };

  const handleOpenReferenceRR = async (overrides = {}) => {
  setShowInvoiceAddDropdown(false);
  
  // 1. Determine which vendor code to use
  const lookupVendCode = String(overrides.vendCode ?? vendCode ?? "").trim();
  const lookupBranchCode = String(overrides.branchCode ?? branchCode ?? "").trim();

  if (!lookupVendCode) {
    updateState({
      payeeModalOpen: true,
      modalContext: "openRR", 
    });
    return;
  }

  try {
    updateState({ isLoading: true, showSpinner: true });

    const lookupPayload = {
      branchCode: lookupBranchCode,
      vendCode: lookupVendCode,
      includeClosed: true,
      includeClosedRR: true,
    };

    // Match the advances lookup payload: support procedure versions that read
    // either the top-level values or the nested $.json_data values.
    const requestParams = {
      PARAMS: JSON.stringify({
        ...lookupPayload,
        json_data: lookupPayload,
      }),
    };

    const [rrResponse, joResponse] = await Promise.all([
      fetchData("getAPVRR_OpenSummary", requestParams),
      fetchData("getAPVJO_OpenSummary", requestParams),
    ]);

    const rawRows = [
      ...extractOpenRRResponseRows(rrResponse),
      ...extractOpenRRResponseRows(joResponse),
    ];

    const normalizedRows = rawRows.map((row, index) =>
      normalizeOpenRRRow(row, index),
    );

    if (normalizedRows.length === 0) {
      useSwalErrorAlert("Open Reference", "No open RR/JO found for this supplier.");
      return;
    }

    updateState({
      globalLookupRow: normalizedRows,
      globalLookupHeader: openRRLookupColumns,
      globalLookupTitle: "Open RR / JO References",
      globalLookupBtnCaption: "Get Selected RR/JO",
      showRRRefModal: true,
      modalContext: "openRR",
    });
  } catch (error) {
    console.error("Failed to fetch Open RR:", error);
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

const handleCloseRRRefModal = async (selectedItems) => {
  if (!selectedItems || !selectedItems.records) {
    updateState({
      showRRRefModal: false,
      modalContext: "",
      globalLookupTitle: "",
      globalLookupBtnCaption: "",
    });
    return;
  }

  const isPOAdvanceFlow = modalContext === "openPOAdvance";
  const isLCImportationFlow = modalContext === "openLCImportation";

  const itemsArray = Array.isArray(selectedItems.records)
    ? selectedItems.records
    : [selectedItems.records];

  updateState({ isLoading: true, showSpinner: true });

  try {
    if (isLCImportationFlow) {
      const selectedLC = itemsArray[0] || {};
      const selectedIds = itemsArray
        .map((row) => row.groupId || row.lcId || "")
        .filter(Boolean)
        .join(",");

      const detailPayload = {
        json_data: {
          selectedIds,
          lcId: itemsArray.length === 1 ? selectedLC.lcId || "" : "",
          branchCode: selectedLC.branchCode || branchCode || "",
        },
      };

      const detailResponse = await postRequest(
        "getAPVLC_OpenDetail",
        JSON.stringify(detailPayload),
      );

      const lcDetailRows = extractOpenRRResponseRows(detailResponse);

      if (lcDetailRows.length === 0) {
        useSwalErrorAlert(
          "LC Importation Reference",
          "No invoice details found for the selected LC reference."
        );
        return;
      }

      const firstDetail = lcDetailRows[0] || {};

      // APV07 LC selection should not overwrite the APV header payee.
      // Keep the current header payee/account/currency and use LC broker/forwarder only as row reference info.
      const foundVendCode = vendName?.vendCode || vendCode || "";
      const foundVendName = vendName?.vendName || "";
      const foundAcctCode = apAccountCode || "";
      const foundAcctName = apAccountName || "";
      const foundCurrCode = vendName?.currCode || currencyCode || "";
      const foundCurrName = vendName?.currName || currencyName || "";
      const foundVatCode = vendName?.vatCode || "";
      const foundAtcCode = vendName?.atcCode || "";
      const lcBrokerCode = firstDetail.vendCode || selectedLC.vendCode || "";
      const lcBrokerName = firstDetail.vendName || selectedLC.vendName || "";
      const lcForwarderCode = firstDetail.forwarderCode || selectedLC.forwarderCode || "";
      const lcForwarderName = firstDetail.forwarderName || selectedLC.forwarderName || "";
      const masterAtcRow = foundAtcCode ? await useTopATCRow(foundAtcCode) : null;
      const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();

      const mappedRows = await Promise.all(
        lcDetailRows.map(async (item) => {
          const amount = parseFormattedNumber(item.siAmount || item.amount || item.billAmt || 0);
          const vatAmount = parseFormattedNumber(item.vatAmount || item.vatAmt || 0);
          const netAmount = parseFormattedNumber(item.netAmount || item.netAmt || 0);
          const rawSiDate = item.siDate || item.lcDate || "";
          const formattedSiDate = rawSiDate
            ? useformatToDatev2(rawSiDate) || normalizeSlrefDate(rawSiDate) || useGetCurrentDayV2()
            : useGetCurrentDayV2();
          const calculatedAtcAmount = foundAtcCode
            ? await useTopATCAmount(foundAtcCode, netAmount)
            : 0;

          return {
            lnNo: "",
            invType: item.invType || "LC",
            rrNo: "",
            poNo: item.poNo || item.lcNo || "",
            siNo: item.siNo || "",
            siDate: formattedSiDate,
            amount: formatNumber(amount),
            siAmount: formatNumber(amount),
            debitAcct: item.debitAcct || item.drAcct || "",
            rcCode: item.rcCode || "",
            rcName: item.rcName || "",
            sltypeCode: "SU",
            slCode:  item.vendCode,
            slName:  item.vendCode,
            brokerCode: item.vendCode || lcBrokerCode,
            brokerName: item.vendName || lcBrokerName,
            forwarderCode: item.forwarderCode || lcForwarderCode,
            forwarderName: item.forwarderName || lcForwarderName,
            vatCode: item.vatCode || foundVatCode,
            vatName: item.vatName || "",
            vatAmount: formatNumber(vatAmount),
            atcCode: foundAtcCode,
            atcName: masterAtcRow?.atcName || "",
            atcAmount: formatNumber(calculatedAtcAmount),
            advpoNo: "",
            advpoAmount: "0.00",
            advpoVatAmount: "0.00",
            advpoAtcAmount: "0.00",
            advAcct: item.advAcct || item.adv_acct || item.ADV_ACCT || defaultAdvancesAcctCode,
            paytermCode: "",
            dueDate: useGetCurrentDayV2(),
            remarks: item.remarks || "",
            REC_RC: item.rcCode ? "Y" : "N",
            REC_SL: "Y",
            lcId: item.lcId || selectedLC.lcId || "",
            lcNo: item.lcNo || selectedLC.lcNo || "",
          };
        }),
      );

      const updatedRows = [...detailRows, ...mappedRows];

      updateState({
        // Preserve APV header values after selecting LC reference.
        vendCode,
        vendName,
        apAccountCode,
        apAccountName,
        currencyCode,
        currencyName,
        currencyRate,
        detailRows: updatedRows,
        showRRRefModal: false,
        triggerGLEntries: true,
        modalContext: "",
        globalLookupTitle: "",
        globalLookupBtnCaption: "",
        globalLookupConfigEndpoint: "",
      });
      updateTotals(updatedRows);
      return;
    }

    const referenceItems = isPOAdvanceFlow
      ? itemsArray
      : await Promise.all(itemsArray.map((item) => enrichRRReferenceItem(item)));

    const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();

    const mappedRows = await Promise.all(
      referenceItems.map(async (item) => {
        // 1. Resolve DR Account: Use the record's drAcct value, fallback to dynamic category lookup if missing
        let resolvedDebitAcct = item.drAcct || item.debitAcct || "";
        const itemCategoryCode = item.categCode || item.CATEG_CODE || item.categoryCode || item.category || "";

        if (!resolvedDebitAcct && itemCategoryCode) {
          try {
            const categResponse = await fetchData("getCategoryDetails", { code: itemCategoryCode });
            if (categResponse?.success && categResponse?.data?.[0]?.result) {
              const categData = JSON.parse(categResponse.data[0].result);
              const categRow = Array.isArray(categData) ? categData[0] : categData;
              if (categRow?.invAcct || categRow?.inv_acct || categRow?.INV_ACCT) {
                resolvedDebitAcct = categRow.invAcct || categRow.inv_acct || categRow.INV_ACCT;
              }
            }
          } catch (categoryLookupError) {
            console.warn(`Could not resolve category mapping fallback for: ${itemCategoryCode}`, categoryLookupError);
          }
        }

        if (isPOAdvanceFlow) {
  const amount = parseFormattedNumber(item.poAmount || item.amount || item.siAmount || 0);
  const vatAmount = parseFormattedNumber(item.vatAmount || 0);

  const vCode = item.vatCode || vendName?.vatCode || "";
  const vatData = vCode ? await useTopVatRow(vCode) : null;

  return {
    lnNo: "",
    invType: item.docType || "PO",

    rrNo: "",
    poNo: item.poJoNo || item.poNo || "",

    siNo: item.poJoNo || item.poNo || "",
    siDate: item.poJoDate || item.poDate || useGetCurrentDayV2(),

    amount: formatNumber(amount),
    siAmount: formatNumber(amount),

    debitAcct: item.debitAcct || "",

    rcCode: "",
    rcName: "",

    sltypeCode: "SU",
    slCode: item.vendCode || vendCode,
    slName: item.vendName || vendName?.vendName || "",

    vatCode: vCode,
    vatName: vatData?.vatName || item.vatName || "",
    vatAmount: formatNumber(vatAmount),

    atcCode: vendName?.atcCode || "",
    atcName: "",
    atcAmount: "0.00",

    advpoNo: item.poJoNo || item.poNo || "",
    advpoAmount: formatNumber(amount),
    advpoVatAmount: formatNumber(vatAmount),
    // Backend column is currently advpo_atc_amount; this mirrors Applied Advances VAT for compatibility.
    advpoAtcAmount: formatNumber(vatAmount),
    advAcct:
      item.advAcct ||
      item.adv_acct ||
      item.ADV_ACCT ||
      item.advanceAcct ||
      item.advancesAcct ||
      defaultAdvancesAcctCode,

    paytermCode: item.paytermCode || "",
    dueDate: useGetCurrentDayV2(),


    REC_RC: "N",
    REC_SL: "Y",
  };
}

        // 2. Resolve VAT Data: Extract from reference item, fallback to supplier configuration rules
        const vCode = item.vatCode || vendName?.vatCode || "";
        const vatData = vCode ? await useTopVatRow(vCode) : null;

        // 3. Resolve RC Data: Extract directly from the source RR reference row and fetch descriptive metadata
        const targetRcCode = item.rcCode || "";
        const targetRcName = targetRcCode ? await fetchRCNameByCode(targetRcCode) : "";

        // 4. Resolve ATC Data: Pull from supplier profile configurations
        const aCode = vendName?.atcCode || ""; 
        const atcData = aCode ? await useTopATCRow(aCode) : null;

        // 5. Calculations, Taxes & Financial Math Elements
const amount = parseFormattedNumber(item.siAmount || item.amount || 0);
const dynamicVatRate = vCode ? await getVatRate(vCode) : 0;

// Auto-assign existing VAT amount value if present,
// otherwise recalculate based on VAT-inclusive rules
const inputVatAmount = parseFormattedNumber(item.vatAmount);
const vatAmount =
  inputVatAmount > 0
    ? inputVatAmount
    : dynamicVatRate > 0
      ? (amount / (1 + dynamicVatRate)) * dynamicVatRate
      : 0;

const netOfVat = +(amount - vatAmount).toFixed(2);

const calculatedAtcAmount = aCode
  ? await useTopATCAmount(aCode, netOfVat)
  : 0;

        return {
  lnNo: "",
  invType: item.type || item.invType || "MS",

  rrNo:
    String(item.type || "").toUpperCase() === "JO"
      ? item.joNo || item.rrNo || ""
      : item.rrNo || "",

  poNo:
    String(item.type || "").toUpperCase() === "JO"
      ? item.joNo || item.poNo || ""
      : item.poNo || "",

  siNo: item.siNo || "",
  siDate: item.siDate || item.rrDate || useGetCurrentDayV2(),
  amount: formatNumber(amount),
  siAmount: formatNumber(amount),

  debitAcct: resolvedDebitAcct,
  rcCode: targetRcCode,
  rcName: targetRcName,

  sltypeCode: "SU",
  slCode: vendCode,
  slName: vendName?.vendName,

  vatCode: vCode,
  vatName: vatData?.vatName || item.vatDesc || "",
  vatAmount: formatNumber(vatAmount),

  atcCode: aCode,
  atcName: atcData?.atcName || "",
  atcAmount: formatNumber(calculatedAtcAmount),

  advpoNo: "",
  advpoAmount: "0.00",
  advpoVatAmount: "0.00",
  advpoAtcAmount: "0.00",
  advAcct:
    item.advAcct ||
    item.adv_acct ||
    item.ADV_ACCT ||
    item.advanceAcct ||
    item.advancesAcct ||
    defaultAdvancesAcctCode,

  paytermCode: item.terms || item.paytermCode || "",
  dueDate: item.dueDate || useGetCurrentDayV2(),

  REC_RC: targetRcCode ? "Y" : "N",
  REC_SL: "Y",

  rrId: item.rrId || item.joId || "",
};
      })
    );

    const updatedRows = [...detailRows, ...mappedRows];
    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
      showRRRefModal: false,
      triggerGLEntries: false,
      modalContext: "",
      globalLookupTitle: "",
      globalLookupBtnCaption: "",
    });
    updateTotals(updatedRows);

  } catch (error) {
    console.error("APV processing error inside handleCloseRRRefModal wrapper structure:", error);
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

  const handleAddRowGL = (index = null) => {
    const newRow = {
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
      slrefDate: "",
      remarks: header.remarks || "",
    };

    const updatedRows = [...detailRowsGL];

    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, newRow);
    } else {
      updatedRows.push(newRow);
    }

    updateState({ detailRowsGL: updatedRows });
  };

  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
      detailRows: updatedRows,
      triggerGLEntries: true,
    });
    updateTotals(updatedRows);
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows });
  };

  const handleFetchDetail = async (vendCode) => {
    if (!vendCode) return [];

    try {
      const vendPayload = {
        json_data: {
          vendCode: vendCode,
        },
      };

      const vendResponse = await postRequest(
        "addPayeeDetail",
        JSON.stringify(vendPayload),
      );
      const rawResult = vendResponse.data[0]?.result;

      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const handleSelectAPAccount = async (accountData) => {
    if (!accountData) return;

    // Safely extract the code and name whether it's a string or an object
    let rawCode =
      typeof accountData === "string"
        ? accountData
        : accountData.acctCode ||
          accountData.accountCode ||
          accountData.apAcct ||
          accountData.ACCT_CODE ||
          "";

    let rawName =
      typeof accountData === "object"
        ? accountData.acctName ||
          accountData.accountName ||
          accountData.ACCT_NAME ||
          ""
        : "";

    if (!rawCode) return; // Stop if no AP Account is linked to this vendor

    // 🚀 Instant UI Update for the code so it doesn't freeze while fetching
    updateState({ apAccountCode: rawCode });

    // If we only have the code, we MUST fetch the name from the COA server
    if (!rawName) {
      try {
        const coaResponse = await fetchData("getCOA", {
          ACCT_CODE: rawCode,
        });

        if (coaResponse?.success) {
          const coaData = JSON.parse(coaResponse.data[0].result);
          rawName = coaData[0]?.acctName || coaData[0]?.ACCT_NAME || "";

          // Add REC_RC to the row data if available (for GL details)
          setState((prev) => {
            if (prev.selectedRowIndex !== null) {
              const updatedRows = [...prev.detailRows];
              updatedRows[prev.selectedRowIndex] = {
                ...updatedRows[prev.selectedRowIndex],
                REC_RC: coaData[0]?.REC_RC || "N",
              };
              return { ...prev, detailRows: updatedRows };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("COA API error:", error);
      }
    }

    // Final UI Update with combined format "Code - Name"
    const combinedDisplay =
      rawCode && rawName ? `${rawCode} - ${rawName}` : rawCode;

    updateState({
      apAccountName: combinedDisplay,
      apAccountCode: rawCode,
    });
  };

  const handlePost = async () => {
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (documentID && documentStatus === "") {
      updateState({ showPostingModal: true });
    }
  };

  const handlePrint = async () => {
    if (detailRowsGL.length === 0) {
      return;
    }
    if (documentID) {
      updateState({ showSignatoryModal: true });
    }
  };

  const handlePrint2307 = () => {
    const hasPrintable2307Entry = (detailRowsGL || []).some(
      (row) =>
        String(row.atcCode || "").trim() !== "" &&
        (
          (parseFormattedNumber(row.debit) || 0) !== 0 ||
          (parseFormattedNumber(row.credit) || 0) !== 0
        ),
    );

    if (
      !documentID ||
      String(displayStatus || "").trim().toUpperCase() !== "FINALIZED" ||
      !hasPrintable2307Entry
    ) {
      return;
    }

    const query = new URLSearchParams({
      viewDocument: "true",
      branchCode: branchCode || "",
      docCode: docType || "APV",
      tranId: documentID || "",
      documentNo: documentNo || "",
    });
    const baseUrl = import.meta.env.BASE_URL || "/";
    const previewUrl = `${baseUrl.replace(/\/?$/, "/")}page/APV2307?${query.toString()}`;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const handleCancel = async () => {
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (
      documentID &&
      ["", "OPEN"].includes((documentStatus || "").toUpperCase())
    ) {
      updateState({ showCancelModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        documentDate: useGetCurrentDayV2(),
        noReprints: "0",


      detailRows: detailRows.map((row) => ({
        ...row,
        siNo: "",
        poNo: "",
        rrNo: "",
        siDate: useGetCurrentDayV2(),
      })),

      });
    }
  };

  const handleClosePost = async (confirmation) => {
    if (confirmation && documentID !== null) {
      try {
        const result = await handlePost(
          docType,
          documentID,
          "NSI",
          updateState,
        );
        if (result && result.success) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: result.message,
          });
          await fetchTranData(documentNo, branchCode);
        }
      } catch (error) {
        console.error("Error during posting:", error);
      }
    }
    updateState({ showPostingModal: false });
  };

  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  const fetchPayeeByCode = async (vendCode) => {
    if (!vendCode) return null;

    try {
      const response = await postRequest(
        "getPayee",
        JSON.stringify({
          VEND_CODE: vendCode,
        }),
      );

      if (!response?.success) return null;

      const parsed = JSON.parse(response?.data?.[0]?.result || "[]");
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch (error) {
      console.error("Error fetching payee details:", error);
      return null;
    }
  };

  const handleClosePayeeModal = async (selectedData) => {
  if (!selectedData) {
    updateState({ payeeModalOpen: false, modalContext: "" });
    return;
  }

  // 1. Isolate the specific context
  const isRRFlow = modalContext === "openRR";
  const isPOAdvanceFlow = modalContext === "openPOAdvance";

  // 2. Start Loading
  updateState({ payeeModalOpen: false, isLoading: true, showSpinner: true });

  try {
    const selectedVendCode = selectedData.vendCode || selectedData.VEND_CODE || "";
    
    // 3. Fetch Full Payee Details (Auto-fill Logic)
    const payeeRow = await fetchPayeeByCode(selectedVendCode);
    const finalPayee = payeeRow || selectedData;

    const foundVendCode = finalPayee?.vendCode || finalPayee?.VEND_CODE || "";
    const foundVendName = finalPayee?.vendName || finalPayee?.VEND_NAME || "";
    const foundAcctCode = finalPayee?.apAccountCode || finalPayee?.acctCode || finalPayee?.AP_ACCT || "";
    const foundAcctName = finalPayee?.apAccountName || finalPayee?.acctName || "";
    const foundCurrCode = finalPayee?.currCode || finalPayee?.currencyCode || "";
    const foundCurrName = finalPayee?.currName || finalPayee?.currencyName || "";
    const foundVatCode = finalPayee?.vatCode || finalPayee?.VAT_CODE || "";
    const foundAtcCode = finalPayee?.atcCode || finalPayee?.ATC_CODE || "";

    // 🌟 REACTIVE BRIDGE: Pull master records for description layouts instantly
    const masterVatRow = foundVatCode ? await useTopVatRow(foundVatCode) : null;
    const masterVatRate = foundVatCode ? await getVatRate(foundVatCode) : 0;
    const masterAtcRow = foundAtcCode ? await useTopATCRow(foundAtcCode) : null;

    // 4. Update Header States
    const headerUpdates = {
      vendCode: foundVendCode,
      vendName: {
        vendCode: foundVendCode,
        vendName: foundVendName,
        currCode: foundCurrCode,
        currName: foundCurrName,
        vatCode: foundVatCode, 
        atcCode: foundAtcCode,
      },
      apAccountCode: foundAcctCode,
      apAccountName: foundAcctCode && foundAcctName ? `${foundAcctCode} - ${foundAcctName}` : foundAcctCode,
      currencyCode: foundCurrCode,
      currencyName: foundCurrName,
    };

    // 5. Apply cascade down updates to existing rows in Invoice Details if present
    if (detailRows.length > 0) {
      headerUpdates.detailRows = detailRows.map((row) => {
        const rowVatCode = row.vatCode && row.vatCode !== "" ? row.vatCode : (foundVatCode || "");
        const rowVatName = row.vatCode && row.vatCode !== "" ? row.vatName : (masterVatRow?.vatName || "");
        const rowAtcCode = row.atcCode && row.atcCode !== "" ? row.atcCode : (foundAtcCode || "");
        const rowAtcName = row.atcCode && row.atcCode !== "" ? row.atcName : (masterAtcRow?.atcName || "");
        
        const currentAmount = parseFormattedNumber(row.amount) || 0;
        const lineVatRate = rowVatCode === foundVatCode ? masterVatRate : 0; 
        
        // Correct inclusive formula deployment on master update change events
        const calculatedVatAmount = row.vatCode && row.vatCode !== "" 
          ? parseFormattedNumber(row.vatAmount) 
          : lineVatRate > 0 ? (currentAmount / (1 + lineVatRate)) * lineVatRate : 0;

        return {
          ...row,
          slCode: foundVendCode,
          slName: foundVendName,
          vatCode: rowVatCode,
          vatName: rowVatName,
          vatAmount: formatNumber(calculatedVatAmount),
          atcCode: rowAtcCode,
          atcName: rowAtcName,
        };
      });
    }

    // Apply the updates to state
    updateState(headerUpdates);

    // 6. Handle Currency Rate (Forex) based on the auto-filled currency
    if (foundCurrCode) {
      let rate = defaultCurrRate;
      if (foundCurrCode !== glCurrDefault) {
        rate = await useTopForexRate(foundCurrCode, header.apv_date);
      }
      updateState({ currencyRate: formatNumber(parseFormattedNumber(rate || 1), 6) });
    }

    // Trigger total calculation recalculation step safely
    if (headerUpdates.detailRows) {
      updateTotals(headerUpdates.detailRows);
    }

    // 7. THE BRIDGE: If this was for an RR/JO or PO/JO Advances lookup, trigger Step 2 now
    if (isRRFlow) {
      setTimeout(() => {
        handleOpenReferenceRR({
          vendCode: foundVendCode,
          branchCode: branchCode,
        });
      }, 100);
    } else if (isPOAdvanceFlow) {
      setTimeout(() => {
        handleOpenReferencePOAdvance({
          vendCode: foundVendCode,
          branchCode: branchCode,
        });
      }, 100);
    }

  } catch (error) {
    console.error("Error auto-filling payee details:", error);
    useSwalErrorAlert("Error", "Failed to fetch vendor details.");
  } finally {
    updateState({ isLoading: false, showSpinner: false, modalContext: "" });
  }
};



  const getVatRate = async (vatCode) => {
  if (!vatCode) return 0;

  try {
    const response = await fetchData("getVat", { VAT_CODE: vatCode });

    if (response.success) {
      const vatData = JSON.parse(response.data[0].result);
      
      // Look for the rate field mapping variation safely
      const rawRate = vatData[0]?.vatRate ?? vatData[0]?.VatRate ?? vatData[0]?.vat_rate ?? 0;
      const parsedRate = parseFloat(rawRate);

      if (!isNaN(parsedRate)) {
        // If your database stores 12% as 12 or 12.00, convert it to 0.12 for decimals
        return parsedRate > 1 ? parsedRate / 100 : parsedRate;
      }

      return 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching VAT rate:", error);
    return 0;
  }
};

  const handleDetailChange = async (
    index,
    field,
    value,
    runCalculations = true,
  ) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    const row = updatedRows[index];

    if (["debitAcct", "vatAcct", "advAcct"].includes(field) && typeof value === "object") {
      const selectedAcctCode = value.acctCode || value.accountCode || value.ACCT_CODE || "";
      row[field] = selectedAcctCode;

      // Only the regular DR Account drives the row RC/SL requirements.
      if (field === "debitAcct") {
        // 1. Capture the flags from the modal keys (rcReq/slReq)
        const rawRc = value.rcReq || value.REQ_RC || "N";
        const rawSl = value.slReq || value.REQ_SL || "N";

        // 2. Standardize to a boolean or 'Y'/'N' check
        const isRcRequired = rawRc === "Y" || rawRc === "Yes";
        const isSlRequired = rawSl === "Y" || rawSl === "Yes";

        row.REC_RC = isRcRequired ? "Y" : "N"; // Store as 'Y' for internal logic
        row.REC_SL = isSlRequired ? "Y" : "N";

        // 3. Set the placeholders based on the check
        if (isRcRequired) {
          row.rcCode = "REQ RC";
          row.rcName = "";
        } else {
          row.rcCode = "";
          row.rcName = "";
        }

        if (isSlRequired) {
          row.slCode = "REQ SL";
          row.slName = "";
        } else {
          row.slCode = vendCode || "";
          row.slName = vendName?.vendName || "";
        }

        console.log("Standardized Flags - RC:", row.REC_RC, "SL:", row.REC_SL);
      }
    }

    // RC code selection from modal
    if (field === "rcCode") {
      row.rcCode = value?.rcCode || value?.rc_code || row.rcCode || "";
      row.rcName = value?.rcName || value?.rc_name || "";
    }

    // SL code selection from modal
    if (field === "slCode") {
      row.slCode = value?.slCode || value?.sl_code || "";
      row.slName = value?.slName || value?.sl_name || "";
    }

    // VAT code selection from modal
    if (field === "vatCode" && typeof value === "object") {
      row.vatCode = value.vatCode;
      row.vatName = value.vatName;
      row.vatAcct = value.acctCode;
    }

    // ATC code selection from modal
    if (field === "atcCode" && typeof value === "object") {
      row.atcCode = value.atcCode;
      row.atcName = value.atcName;
    }

    if (field === "amount") {
      row.siAmount = value;
    }

    if (runCalculations) {
      const origAmount = parseFormattedNumber(row.amount) || 0;
      const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

      async function recalcRow(newAmount) {
        // Fetch structural configuration details for calculation formulas
        const rate = await getVatRate(origVatCode);
        
        // Calculate VAT component from VAT-inclusive amount: (Amount / 1.12) * 0.12
        const newVatAmount = rate > 0 ? (newAmount / (1 + rate)) * rate : 0;
        const newNetOfVat = +(newAmount - newVatAmount).toFixed(2);
        const newATCAmount = origAtcCode
          ? await useTopATCAmount(origAtcCode, newNetOfVat)
          : 0;

        row.siAmount = formatNumber(newAmount);
        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
        row.amount = formatNumber(newAmount);
      }

      if (field === "amount") {
        const newAmount = parseFormattedNumber(row.amount) || 0;
        await recalcRow(newAmount);
      }

      if (field === "vatCode") {
        const currentAmount = parseFormattedNumber(row.amount) || 0;
        const rate = await getVatRate(row.vatCode);
        
        // Compute VAT-inclusive formula breakdown
        const newVatAmount = rate > 0 ? (currentAmount / (1 + rate)) * rate : 0;
        const newNetOfVat = +(currentAmount - newVatAmount).toFixed(2);
        const newATCAmount = row.atcCode
          ? await useTopATCAmount(row.atcCode, newNetOfVat)
          : 0;

        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
      }

      if (field === "atcCode") {
        const currentAmount = parseFormattedNumber(row.amount) || 0;
        const currentVatAmount = parseFormattedNumber(row.vatAmount) || 0;
        const newNetOfVat = +(currentAmount - currentVatAmount).toFixed(2);
        const newATCAmount = row.atcCode
          ? await useTopATCAmount(row.atcCode, newNetOfVat)
          : 0;

        row.atcAmount = formatNumber(newATCAmount);
      }

      if (field === "paytermCode") {
        const paytermData = await useTopPayTermRow(value);
        const daysDue = getPaytermDaysDue(paytermData);

        if (paytermData) {
          row.paytermCode = getPaytermCode(paytermData) || value;
          row.paytermName = getPaytermName(paytermData);
        }

        if (paytermData && daysDue !== "" && header.apv_date) {
          row.dueDate = calculateDueDate(header.apv_date, daysDue);
        } else {
          row.dueDate = "";
        }
      }

      if (field === "amount") {
        const num = parseFormattedNumber(value);
        if (!isNaN(num)) {
          row.amount = formatNumber(num);
          row.siAmount = formatNumber(num);
        }
      }
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...detailRowsGL];
    const row = { ...updatedRowsGL[index] };

    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (
      autoCompute &&
      ((withCurr2 && currencyCode !== glCurrDefault) || withCurr3)
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
          currencyCode,
          currencyRate,
          header.apv_date,
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
    updateState({ detailRowsGL: updatedRowsGL });
  };

  const handleDetailChangeGL = async (index, field, value) => {
    // 1. Create a deep clone of the current rows to prevent reference bleeding
    const currentRows = [...state.detailRowsGL];

    // 2. Isolate the specific row being edited
    let row = { ...currentRows[index] };

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
      // Fetch fresh data for THIS specific row only
      const data = await useUpdateRowGLEntries(
        row,
        field,
        value,
        vendCode,
        docType,
      );

      if (data) {
        // Standardize flags for THIS data result
        const isRcReq =
          data.REQ_RC === "Y" || data.rcReq === "Yes" || data.REQRC === "Y";
        const isSlReq =
          data.REQ_SL === "Y" || data.slReq === "Yes" || data.REQSL === "Y";

        // Map data specifically to this row index
        row.acctCode = data.acctCode;
        row.sltypeCode = data.sltypeCode;

        // --- Strict RC Isolation ---
        if (isRcReq) {
          // Only set REQ RC if it's actually empty or needs the placeholder
          row.rcCode =
            data.rcCode && data.rcCode !== "" ? data.rcCode : "REQ RC";
          row.rcName = data.rcName || "";
        } else {
          // EXPLICITLY WIPE for this specific row if flag is N
          row.rcCode = "";
          row.rcName = "";
        }

        // --- Strict SL Isolation ---
        if (isSlReq) {
          row.slCode =
            data.slCode && data.slCode !== "" ? data.slCode : "REQ SL";
        } else {
          // EXPLICITLY WIPE for this specific row if flag is N
          row.slCode = "";
          row.slName = "";
        }

        // Standard assignments
        row.vatCode = data.vatCode || "";
        row.vatName = data.vatName || "";
        row.atcCode = data.atcCode || "";
        row.atcName = data.atcName || "";
        row.particular = data.particular || "";

        // Update the required flags for this row only (used by JSX magnifying glass)
        row.REQ_RC = isRcReq ? "Y" : "N";
        row.REQ_SL = isSlReq ? "Y" : "N";
      }
    }

    // Amount logic - ensures we only touch index [index]
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

    if (["slRefNo", "slrefDate", "remarks"].includes(field)) {
      row[field] = value;
    }

    // 3. Final Step: Put the isolated row back into the array at its specific index
    currentRows[index] = row;

    // Update state with the modified array
    updateState({ detailRowsGL: currentRows });
  };

  const handleSlrefDateChange = (index, value) => {
    handleDetailChangeGL(index, "slrefDate", formatSlrefDateInput(value));
  };

  const handleSlrefDateBlur = (index, value) => {
    const trimmed = String(value || "").trim();

    if (!trimmed) {
      handleDetailChangeGL(index, "slrefDate", "");
      return;
    }

    const normalized = normalizeSlrefDate(trimmed);

    if (!normalized) {
      handleDetailChangeGL(index, "slrefDate", "");
      Swal.fire({
        icon: "error",
        title: "Invalid SL Reference Date",
        text: "Please enter a valid date in MM/DD/YYYY format.",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    handleDetailChangeGL(index, "slrefDate", normalized);
  };

  const openGLRemarksModal = (index) => {
    if (isFormDisabled) return;

    useSwalHandleOpenSpecsModal(
      index,
      detailRowsGL,
      handleDetailChangeGL,
      detailRowsGL?.[index]?.remarks || header.remarks || "",
      "Remarks",
      "remarks",
      "Enter remarks for this GL entry..."
    );
  };

  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount) {
      // 1. Handle Header-Level AP Account
      if (accountModalSource === "apAccount") {
        const rawCode =
          selectedAccount.accountCode || selectedAccount.acctCode || "";
        const rawName =
          selectedAccount.accountName || selectedAccount.acctName || "";
        const combinedDisplay =
          rawCode && rawName ? `${rawCode} - ${rawName}` : rawName;

        updateState({
          apAccountCode: rawCode,
          apAccountName: combinedDisplay, // Save "Code - Name" to the visible field
        });
      }
      // 2. Handle Detail Row Accounts
      else if (selectedRowIndex !== null) {
        const specialAccounts = ["debitAcct", "vatAcct", "advAcct"];

        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(
            selectedRowIndex,
            accountModalSource,
            {
              ...selectedAccount,
              acctCode: selectedAccount.accountCode || selectedAccount.acctCode,
              REQ_RC: selectedAccount.REQ_RC || selectedAccount.reqRC || "N",
              REQ_SL: selectedAccount.REQ_SL || selectedAccount.reqSL || "N",
            },
            false,
          );
        } else {
          handleDetailChangeGL(selectedRowIndex, "acctCode", {
            ...selectedAccount,
            acctCode: selectedAccount.accountCode || selectedAccount.acctCode,
          });
        }
      }
    }

    // Always close and reset context
    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModal = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      const rcCode = selectedRc.rcCode || selectedRc.rc_code || "";

      const result = await fetchRCDetails(rcCode);
      if (result) {
        handleDetailChange(selectedRowIndex, "rcCode", result, false);
      }
    }

    updateState({
      showRcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      const rcCode = selectedRc.rcCode || selectedRc.rc_code || "";
      const result = await fetchRCDetails(rcCode);

      if (result) {
        if (accountModalSource !== null) {
          handleDetailChange(selectedRowIndex, "rcCode", result, false);
        } else {
          handleDetailChangeGL(selectedRowIndex, "rcCode", result);
        }
      }
    }

    updateState({
      showRcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseSlModal = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      handleDetailChange(selectedRowIndex, "slCode", selectedSl, false);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseCancel = async (confirmation) => {
  if (!confirmation) {
    updateState({ showCancelModal: false });
    return;
  }

  if (
    documentID !== null &&
    ["", "OPEN"].includes((documentStatus || "").toUpperCase())
  ) {
    const result = await useHandleCancel(
      docType,
      documentID,
      userCode,
      confirmation.password,
      confirmation.reason,
      updateState,
    );

    if (result?.success) {
      useSwalSuccessAlert("Success", "Document cancelled successfully.");
      await fetchTranData(documentNo, branchCode);
      updateState({ showCancelModal: false });
    } else {
      updateState({
        resetCancelPasswordTrigger: Date.now(),
      });
    }
  }
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

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };
  
  const handleTranDocNoSelection = async (data) => {
    
    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};

  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);
    updateState({ showSpinner: false });
  };

  const handleCloseVatModal = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChange(selectedRowIndex, "vatCode", result, true);
    }
    updateState({
      showVatModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseVatModalGL = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, "vatCode", result);
    }
    updateState({
      showVatModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseAtcModal = async (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      handleDetailChange(selectedRowIndex, "atcCode", result, true);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseAtcModalGL = async (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, "atcCode", result);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
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

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      // Pass the WHOLE object to skip the redundant server fetch
      handleSelectCurrency(selectedCurrency);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (currencyData) => {
    if (!currencyData) return;

    let currCode =
      typeof currencyData === "string" ? currencyData : currencyData.currCode;
    let currName =
      typeof currencyData === "object" ? currencyData.currName : null;

    // 🚀 Update the code immediately so the UI feels instantly responsive
    updateState({ currencyCode: currCode });

    if (!currName) {
      const result = await useTopCurrencyRow(currCode);
      if (result) {
        currName = result.currName;
      } else {
        return;
      }
    }

    if (currCode && currName) {
      let rate = defaultCurrRate;
      if (currCode !== glCurrDefault) {
        rate = await useTopForexRate(currCode, header.apv_date);
      }

      const formattedRate = formatNumber(parseFormattedNumber(rate || 1), 6);

      updateState({
        currencyCode: currCode,
        currencyName: currName,
        currencyRate: formattedRate,
      });
    }
  };

  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm && selectedRowIndex !== null) {
      await handleSelectPayTerm(getPaytermCode(selectedPayterm));
    }
    updateState({ showPaytermModal: false });
  };

  const handleSelectPayTerm = async (paytermCode) => {
    if (paytermCode) {
      const result = await useTopPayTermRow(paytermCode);
      if (result) {
        const daysDue = getPaytermDaysDue(result);
        const updatedRows = [...detailRows];
        if (selectedRowIndex !== null) {
          updatedRows[selectedRowIndex] = {
            ...updatedRows[selectedRowIndex],
            paytermCode: getPaytermCode(result) || paytermCode,
            paytermName: getPaytermName(result),
            dueDate: calculateDueDate(header.apv_date, daysDue),
          };
          updateState({ detailRows: updatedRows });
        }
      }
    }
  };

  const getAtcRate = async (atcCode) => {
    if (!atcCode) return 0;

    try {
      const response = await fetchData("getATC", { ATC_CODE: atcCode });

      if (response.success) {
        const atcData = JSON.parse(response.data[0].result);
        const rate = atcData[0]?.atcRate;

        const parsedRate = parseFloat(rate);
        if (!isNaN(parsedRate)) {
          return parsedRate;
        }

        console.warn("Unrecognized ATC rate format, defaulting to 0");
        return 0;
      }

      console.warn("getATC API failed, defaulting to 0");
      return 0;
    } catch (error) {
      console.error("Error fetching ATC rate:", error);
      return 0;
    }
  };

  // SL Code double-click handler
  const handleSlDoubleClick = (index) => {
    const currentValue = detailRows[index]?.slCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        slCode: vendCode || "",
        slName: vendName?.vendName || "",
      };
      updateState({ detailRows: updatedRows });
    } else {
      updateState({
        selectedRowIndex: index,
        showSlModal: true,
      });
    }
  };

  // DR Account double-click handler
  const handleAccountDoubleDtl1Click = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      debitAcct: "",
      debitAcctName: "",
    };
    updateState({ detailRows: updatedRows });
  };

  // RC Code double-click handler
  const handleRcDoubleDtl1Click = (index) => {
    const currentValue = detailRows[index]?.rcCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        rcCode: "",
        rcName: "",
      };
      updateState({ detailRows: updatedRows });
    } else {
      updateState({
        selectedRowIndex: index,
        showRcModal: true,
      });
    }
  };

  // VAT Code double-click handler
  const handleVatDoubleDtl1Click = (index) => {
    const currentValue = detailRows[index]?.vatCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        vatCode: "",
        vatName: "",
        vatAmount: "0.00",
      };
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);
    } else {
      updateState({
        selectedRowIndex: index,
        showVatModal: true,
      });
    }
  };

  // ATC double-click handler
  const handleAtcDoubleDtl1Click = (index) => {
    const currentValue = detailRows[index]?.atcCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        atcCode: "",
        atcName: "",
        atcAmount: "0.00",
      };
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);
    } else {
      updateState({
        selectedRowIndex: index,
        showAtcModal: true,
      });
    }
  };

  // Payment Terms double-click handler
  const handlePaytermDoubleClick = (index) => {
    const currentValue = detailRows[index]?.paytermCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        paytermCode: "",
        paytermName: "",
        dueDate: new Date().toISOString().split("T")[0],
      };
      updateState({ detailRows: updatedRows });
    } else {
      updateState({
        selectedRowIndex: index,
        showPaytermModal: true,
      });
    }
  };

  // VAT Name double-click handler to clear selection
const handleVatNameDoubleClick = (index) => {
  const updatedRows = [...detailRows];
  // Reset VAT related fields for this row
  updatedRows[index] = {
    ...updatedRows[index],
    vatCode: "",
    vatName: "",
    vatAmount: "0.00",
  };
  updateState({ detailRows: updatedRows });
  updateTotals(updatedRows); // Recalculate totals after clearing
};

// ATC Name double-click handler to clear selection
const handleAtcNameDoubleClick = (index) => {
  const updatedRows = [...detailRows];
  // Reset ATC related fields for this row
  updatedRows[index] = {
    ...updatedRows[index],
    atcCode: "",
    atcName: "",
    atcAmount: "0.00",
  };
  updateState({ detailRows: updatedRows });
  updateTotals(updatedRows); // Recalculate totals after clearing
};

  // RC Name double-click handler
  const handleRcNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      rcCode: "",
      rcName: "",
    };
    updateState({ detailRows: updatedRows });
  };

  // Payment Terms Name double-click handler
  const handlePaytermNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      paytermCode: "",
      paytermName: "",
      dueDate: new Date().toISOString().split("T")[0],
    };
    updateState({ detailRows: updatedRows });
  };

  // Handle AP Type Change
  const handleAPTypeChange = async (event) => {
    const selectedType = event.target.value;

    // Default: show all fields
    let visibility = {
      sltypeCode: true,
      slName: true,
      address: true,
      tin: true,
      invType: true,
      rrNo: true,
      poNo: true,
      siNo: true,
      siDate: true,
    };

    switch (selectedType) {
      case "APV01": // purchases
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        break;

      case "APV07": // importation
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        visibility.rrNo = false;
        visibility.poNo = true;
        break;

      case "APV02": // non purchases
      case "APV002":
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.siNo = false;
        visibility.siDate = false;
        break;

      case "APV03": // advances
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        break;

      case "APV05": // reimbursements
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.sltypeCode = true;
        visibility.slName = true;
        visibility.address = true;
        visibility.tin = true;
        break;

      case "APV06": // liquidation
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.sltypeCode = true;
        visibility.slName = true;
        visibility.address = true;
        visibility.tin = true;
        break;

      default:
        break;
    }

    const updates = {
      selectedApType: selectedType,
      fieldVisibility: visibility,
    };

    if (["APV01", "APV03"].includes(selectedType) && detailRows.length > 0) {
      const defaultAdvancesAcctCode = await getDefaultAdvancesAcctCode();
      if (defaultAdvancesAcctCode) {
        updates.detailRows = detailRows.map((row) => ({
          ...row,
          advAcct:
            row.advAcct ||
            row.adv_acct ||
            row.ADV_ACCT ||
            row.advanceAcct ||
            row.advancesAcct ||
            defaultAdvancesAcctCode,
        }));
      }
    }

    updateState(updates);
  };

  const selectedApTypeRow = apTypes.find(
    (row) =>
      row.DROPDOWN_CODE === selectedApType ||
      row.dropdownCode === selectedApType ||
      row.dropdown_code === selectedApType
  );

  const selectedApTypeName =
    selectedApTypeRow?.DROPDOWN_NAME ||
    selectedApTypeRow?.dropdownName ||
    selectedApTypeRow?.dropdown_name ||
    "";

  const isAdvancesAPType =
    selectedApType === "APV03" ||
    String(selectedApType || "").toUpperCase().includes("ADV") ||
    String(selectedApTypeName || "").toUpperCase().includes("ADVANCE");

  const isImportationAPType = selectedApType === "APV07";

  const showAppliedAdvancesColumns = selectedApType === "APV01" || isImportationAPType;

  const showAdvancesAccountColumn = selectedApType === "APV01" || isAdvancesAPType || isImportationAPType;
  const showDrAccountColumn = !isAdvancesAPType;
  const apvDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    ...(fieldVisibility.invType ? [{ key: "invType", label: "Type", width: 70 }] : []),
    ...(fieldVisibility.rrNo && !isImportationAPType
      ? [{ key: "rrNo", label: "RR No.", width: 120 }]
      : []),
    ...(fieldVisibility.poNo
      ? [{ key: "poNo", label: isImportationAPType ? "LC No" : "PO/JO No.", width: 120 }]
      : []),
    { key: "siNo", label: "Invoice No.", width: 120 },
    { key: "siDate", label: "Invoice Date", width: 130 },
    {
      key: "amount",
      label: isAdvancesAPType ? "Advances Amount" : "Original Amount",
      width: 140,
    },
    { key: "currCode", label: "Currency", width: 90 },
    { key: "siAmount", label: "Invoice Amount", width: 130 },
    ...(showDrAccountColumn ? [{ key: "debitAcct", label: "DR Account", width: 120 }] : []),
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 260 },
    ...(fieldVisibility.sltypeCode
      ? [{ key: "sltypeCode", label: "SL Type Code", width: 120 }]
      : []),
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 260 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 260 },
    { key: "atcAmount", label: "ATC Amount", width: 130 },
    { key: "paytermCode", label: "Payment Terms", width: 130 },
    { key: "dueDate", label: "Due Date", width: 130 },
    ...(showAppliedAdvancesColumns
      ? [
          { key: "advpoNo", label: "Applied Advances PO", width: 150 },
          { key: "advpoAmount", label: "Applied Advances Amt", width: 150 },
          { key: "advpoVatAmount", label: "Applied Advances VAT", width: 150 },
        ]
      : []),
    ...(showAdvancesAccountColumn
      ? [{ key: "advAcct", label: "Advances Account", width: 150 }]
      : []),
  ];
  const {
    getColumnStyle: getApvDetailColumnStyle,
    renderHeaderContextMenu: renderApvDetailHeaderContextMenu,
    renderResizableHeader: renderApvDetailHeader,
  } = useResizableTableColumns(apvDetailColumnDefs);
  const getApvDetailCellStyle = (key, fallbackWidth) =>
    getApvDetailColumnStyle(key, fallbackWidth);

  const apvGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 260 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "debit", label: `Debit (${glCurrDefault})`, width: 140 },
    { key: "credit", label: `Credit (${glCurrDefault})`, width: 140 },
    ...(withCurr2
      ? [
          { key: "debitFx1", label: `Debit (${withCurr3 ? glCurrGlobal2 : currencyCode})`, width: 140 },
          { key: "creditFx1", label: `Credit (${withCurr3 ? glCurrGlobal2 : currencyCode})`, width: 140 },
        ]
      : []),
    ...(withCurr3
      ? [
          { key: "debitFx2", label: `Debit (${glCurrGlobal3})`, width: 140 },
          { key: "creditFx2", label: `Credit (${glCurrGlobal3})`, width: 140 },
        ]
      : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slrefDate", label: "SL Ref. Date", width: 130 },
    { key: "remarks", label: "Remarks", width: 240 },
  ];
  const {
    getColumnStyle: getApvGlColumnStyle,
    renderHeaderContextMenu: renderApvGlHeaderContextMenu,
    renderResizableHeader: renderApvGlHeader,
  } = useResizableTableColumns(apvGlColumnDefs);
  const getApvGlCellStyle = (key, fallbackWidth) =>
    getApvGlColumnStyle(key, fallbackWidth);
  const hasSelectedReference = detailRows.some((row) =>
    String(
      row.advpoNo ||
        row.advpo_no ||
        row.ADVPO_NO ||
        row.rrNo ||
        row.rr_no ||
        row.RR_NO ||
        row.poNo ||
        row.po_no ||
        row.PO_NO ||
        row.joNo ||
        row.jo_no ||
        row.JO_NO ||
        row.rrId ||
        row.rr_id ||
        row.RR_ID ||
        row.lcId ||
        row.lc_id ||
        row.LC_ID ||
        row.lcNo ||
        row.lc_no ||
        row.LC_NO ||
        "",
    ).trim(),
  );

  const openReferenceLabel = isImportationAPType
    ? "Open Reference LC"
    : isAdvancesAPType
      ? "Open Reference PO/JO"
      : "Open Reference RR/JO";

  const openReferenceDescription = isImportationAPType
    ? "Pull LC Importation details"
    : isAdvancesAPType
      ? "Pull PO/JO advances"
      : "Pull RR/JO details";

  // Render the component
  return (
    <div className="global-tran-main-div-ui">
      {/* Loading spinner overlay */}
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          onPrintBIR={handlePrint2307}
          birFormLabel="BIR Form"
          onPost={handlePost}
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={true}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          // isSaveDisabled={isSaveDisabled} // Pass disabled state
          // isResetDisabled={isResetDisabled} // Pass disabled state
          detailsRoute="/page/APV"
          isSaveDisabled={
            state.isSaveDisabled || isFormDisabled
          }
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || normalizedStatus === "CANCELLED"}
          isPrintBIRDisabled={
            !documentID ||
            String(displayStatus || "").trim().toUpperCase() !== "FINALIZED" ||
            !(detailRowsGL || []).some(
              (row) =>
                String(row.atcCode || "").trim() !== "" &&
                (
                  (parseFormattedNumber(row.debit) || 0) !== 0 ||
                  (parseFormattedNumber(row.credit) || 0) !== 0
                )
            )
          }
          isCopyDisabled={!documentID || normalizedStatus === "CANCELLED"}
          isCancelDisabled={
            !documentID ||
            normalizedStatus === "CANCELLED" ||
            normalizedStatus === "FINALIZED"
          }
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        {/* Page title and subheading */}
        {/* Header Section */}
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>
                {normalizedStatus}
              </h1>
            </div>
          </div>
        </div>

        {/* Form Layout with Tabs */}
        <div className="global-tran-header-div-ui">
          {/* Tab Navigation */}
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

          {/* APV Header Form Section */}
          <div
            id="apv_hd"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative"
          >
            {/* Column 1 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                disabled={isFormDisabled}
                onLookup={() => updateState({ branchModalOpen: true })}
              />

              {/* APV Number Field */}
              <FieldRenderer
                id="apvNo"
                label="APV No."
                type="lookup"
                value={documentNo || ""}
                disabled={isDocNoDisabled}
                onChange={(val) => updateState({ documentNo: val })}
                onBlur={handleDocumentNoBlur}
                onLookup={() => updateState({ showAllTranDocNo: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDocumentNoBlur();
                  }
                }}
              />

              {/* APV Date Picker */}
              <div className="relative w-full">
                <div
                  className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                >
                  <DateFormatInput
                    id="apv_date"
                    // Apply peer class and remove default borders to let the wrapper handle the UI
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={header.apv_date}
                    disabled={isFormDisabled}
                    updateState={(updates) => {
                      if (updates.apv_date !== undefined) {
                        recalculateDueDatesByApvDate(updates.apv_date);
                      }
                    }}
                  />
                </div>

                <label
                  htmlFor="apv_date"
                  className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                >
                  APV Date
                </label>
              </div>
            </div>

            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui">
              {/* Payee Code Input with optional lookup */}
              <FieldRenderer
                id="payeeCode"
                label="Payee Code"
                required
                type="lookup"
                value={vendName?.vendCode || ""}
                disabled={isFormDisabled}
                onLookup={() => updateState({ payeeModalOpen: true })}
              />

              {/* Payee Name Display */}
              <FieldRenderer
                id="payeeName"
                label="Payee Name"
                required
                type="text"
                value={vendName?.vendName || ""}
                disabled={true}
                onChange={() => {}}
              />

              {/* AP Account Code Input */}
              <FieldRenderer
                id="apAccountName"
                label="AP Account"
                type="lookup"
                value={apAccountName || ""}
                disabled={isFormDisabled}
                onLookup={() =>
                  updateState({
                    showAccountModal: true,
                    accountModalSource: "apAccount",
                  })
                }
              />
              <input
                type="hidden"
                id="apAccountCode"
                value={apAccountCode || ""}
              />
            </div>

            {/* Column 3 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="currCode"
                label="Currency"
                type="text"
                value={
                  currencyCode
                    ? `${currencyCode}${currencyName ? ` - ${currencyName}` : ""}`
                    : ""
                }
                // Updated logic: Disable if form is finalized OR if a payee is already selected
                disabled={isFormDisabled || !!vendCode}
                // onLookup={() => updateState({ currencyModalOpen: true })}
              />

              <FieldRenderer
                id="currRate"
                label="Currency Rate"
                type="amount"
                value={currencyRate || ""}
                disabled={isFormDisabled || currencyCode === glCurrDefault}
                onChange={(val) => updateState({ currencyRate: val })}
              />

              <FieldRenderer
                id="selectedApType"
                label="AP Type"
                type="select"
                value={selectedApType}
                disabled={isFormDisabled || hasSelectedReference}
                onChange={(val) =>
                  handleAPTypeChange({ target: { value: val } })
                }
                options={apTypes.map((t) => ({
                  label: t.DROPDOWN_NAME,
                  value: t.DROPDOWN_CODE,
                }))}
              />
            </div>

            {/* Column 4 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="refDocNo1"
                label="Ref Doc No. 1"
                type="text"
                value={header.refDocNo1 || ""}
                disabled={isFormDisabled}
                maxLength={25}
                onChange={(val) =>
                  updateState({
                    header: { ...header, refDocNo1: val },
                  })
                }
              />

              <FieldRenderer
                id="refDocNo2"
                label="Ref Doc No. 2"
                type="text"
                value={header.refDocNo2 || ""}
                disabled={isFormDisabled}
                maxLength={25}
                onChange={(val) =>
                  updateState({
                    header: { ...header, refDocNo2: val },
                  })
                }
              />
            </div>

            {/* Remarks Section */}
            {/* Column 4 - Remarks */}
            <div className="col-span-full">
              <div className="relative w-full p-2">
                <textarea
                  id="remarks"
                  placeholder=" "
                  rows={5}
                  className="peer global-tran-textbox-remarks-ui pt-2"
                  value={header.remarks || ""}
                  maxLength={4000}
                  onChange={(e) =>
                    updateState({
                      header: { ...header, remarks: e.target.value },
                    })
                  }
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
        <br />

        {fieldVisibility.invoiceDetails && (
          <>
            {/* APV Detail Section */}
            <div id="apv_dtl" className="global-tran-tab-div-ui">
              {/* Tab Navigation */}
              <div className="global-tran-tab-nav-ui">
                {/* Tabs */}
                <div className="flex flex-row sm:flex-row">
                  <button
                    className={`global-tran-tab-padding-ui ${
                      GLactiveTab === "invoice"
                        ? "global-tran-tab-text_active-ui"
                        : "global-tran-tab-text_inactive-ui"
                    }`}
                    onClick={() => updateState({ GLactiveTab: "invoice" })}
                    disabled={isFormDisabled}
                  >
                    Invoice Details
                  </button>
                </div>

              </div>

              {/* Invoice Details Button */}
              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui">
                  <table className="min-w-full table-fixed border-collapse [&_input]:w-full [&_select]:w-full">
                    <colgroup>
                      {apvDetailColumnDefs.map((column) => (
                        <col
                          key={column.key}
                          style={getApvDetailCellStyle(column.key, column.width)}
                        />
                      ))}
                      {!isFormDisabled && <col style={transactionActionsCellStyle} />}
                    </colgroup>
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        {apvDetailColumnDefs.map((column) =>
                          renderApvDetailHeader(column.label, column.key, column.width)
                        )}
                        {!isFormDisabled && (
                          <th
                            className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30"
                            style={transactionActionsHeaderStyle}
                          >
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {detailRows.map((row, index) => (
                        <tr key={index} className="global-tran-tr-ui">
                          <td className="global-tran-td-ui text-center">
                            {index + 1}
                          </td>
                          {fieldVisibility.invType && (
                            <td className="global-tran-td-ui">
                              <select
                                className="w-[50px] global-tran-td-inputclass-ui"
                                value={row.invType || ""}
                                onChange={(e) =>
                                  handleDetailChange(
                                    index,
                                    "invType",
                                    e.target.value,
                                    false,
                                  )
                                }
                                disabled={isFormDisabled}
                              >
                                <option value=""></option>
                                {isImportationAPType && <option value="LC">LC</option>}
                                <option value="FG">FG</option>
                                <option value="MS">MS</option>
                                <option value="RM">RM</option>
                                {selectedApType === "APV01" && <option value="JO">JO</option>}
                                {isAdvancesAPType && <option value="PO">PO</option>}
                                {isAdvancesAPType && <option value="JO">JO</option>}
                              </select>
                            </td>
                          )}
                          {fieldVisibility.rrNo && !isImportationAPType && (
                            <td className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[100px] global-tran-td-inputclass-ui"
                                value={row.rrNo || ""}
                                maxLength={25}
                                onChange={(e) =>
                                  handleDetailChange(
                                    index,
                                    "rrNo",
                                    e.target.value,
                                    false,
                                  )
                                }
                                disabled={isFormDisabled}
                              />
                            </td>
                          )}
                          {fieldVisibility.poNo && (
                            <td className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[100px] global-tran-td-inputclass-ui"
                                value={row.poNo || ""}
                                maxLength={25}
                                onChange={(e) =>
                                  handleDetailChange(
                                    index,
                                    "poNo",
                                    e.target.value,
                                    false,
                                  )
                                }
                                disabled={isFormDisabled}
                              />
                            </td>
                          )}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui"
                              value={row.siNo || ""}
                              maxLength={25}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "siNo",
                                  e.target.value,
                                  false,
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>
                          <td className="global-tran-td-ui">
                            <div className="w-[110px]">
                              <DateFormatInput
                                id={`siDate_${index}`}
                                value={row.siDate || ""}
                                disabled={isFormDisabled}
                                className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                                updateState={(updates) => {
                                  if (
                                    updates[`siDate_${index}`] !== undefined
                                  ) {
                                    handleDetailChange(
                                      index,
                                      "siDate",
                                      updates[`siDate_${index}`],
                                      false,
                                    );
                                  }
                                }}
                              />
                            </div>
                          </td>
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              ref={(el) => (amountRefs.current[index] = el)}
                              className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                              value={row.amount}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Changed the regex here to include ^-?
                                if (
                                  /^-?\d{0,12}(\.\d{0,2})?$/.test(value) ||
                                  value === ""
                                ) {
                                  handleDetailChange(
                                    index,
                                    "amount",
                                    value,
                                    false,
                                  );
                                }
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const value = e.target.value;
                                  const num = parseFormattedNumber(value);
                                  if (!isNaN(num)) {
                                    await handleDetailChange(
                                      index,
                                      "amount",
                                      num.toFixed(2),
                                      true,
                                    );
                                  }
                                }
                              }}
                              onFocus={(e) => {
                                if (isFormDisabled) return;
                                if (
                                  e.target.value === "0.00" ||
                                  e.target.value === "0"
                                ) {
                                  handleDetailChange(index, "amount", "", false);
                                }
                                setTimeout(() => e.target.select(), 0);
                              }}
                              onBlur={async (e) => {
                                if (isFormDisabled) return;
                                const value = e.target.value;
                                const num = parseFormattedNumber(value);
                                if (!isNaN(num)) {
                                  await handleDetailChange(
                                    index,
                                    "amount",
                                    num.toFixed(2),
                                    true,
                                  );
                                }
                              }}
                            />
                          </td>
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[80px] global-tran-td-inputclass-ui text-center"
                              value={
                                vendName?.currCode
                                  ? `${vendName.currCode}`
                                  : "PHP"
                              }
                              readOnly
                              disabled={isFormDisabled}
                            />
                          </td>
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                              value={row.siAmount || row.amount || ""}
                              readOnly
                              disabled={isFormDisabled}
                            />
                          </td>
                          {showDrAccountColumn && (
                            <>
                              {/* DR Account */}
                              <td className="global-tran-td-ui relative">
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                    value={row.debitAcct || ""}
                                    readOnly
                                    disabled={isFormDisabled}
                                  />
                                  {!isFormDisabled && (
                                    <FontAwesomeIcon
                                      icon={faMagnifyingGlass}
                                      className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                      onClick={() => {
                                        updateState({
                                          selectedRowIndex: index,
                                          showAccountModal: true,
                                          accountModalSource: "debitAcct",
                                        });
                                      }}
                                    />
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                          {/* RC Code */}
                          <td className="global-tran-td-ui relative">
                            <div className="flex items-center">
                              <input
                                type="text"
                                className={`w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer ${
                                  row.rcCode === "REQ RC"
                                    ? "font-bold text-black"
                                    : ""
                                }`}
                                value={row.rcCode || ""}
                                readOnly
                                disabled={isFormDisabled}
                              />
                              {!isFormDisabled &&
                                (row.REC_RC === "Y" ||
                                  row.rcCode === "REQ RC") && (
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
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[250px] global-tran-td-inputclass-ui"
                              value={row.rcName || ""}
                              readOnly
                              disabled={isFormDisabled}
                            />
                          </td>
                          {fieldVisibility.sltypeCode && (
                            <td className="global-tran-td-ui">
                              <input
                                type="text"
                                className="w-[100px] global-tran-td-inputclass-ui"
                                value={row.sltypeCode || ""}
                                onChange={(e) =>
                                  handleDetailChange(
                                    index,
                                    "sltypeCode",
                                    e.target.value,
                                    false,
                                  )
                                }
                                disabled={isFormDisabled}
                              />
                            </td>
                          )}
                          {/* SL Code */}
                          <td className="global-tran-td-ui relative">
                            <div className="flex items-center">
                              <input
                                type="text"
                                className={`w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer ${
                                  row.slCode === "REQ SL"
                                    ? "font-bold text-black"
                                    : ""
                                }`}
                                value={row.slCode || ""}
                                readOnly
                                disabled={isFormDisabled}
                              />
                              {!isFormDisabled &&
                                (row.REC_SL === "Y" ||
                                  row.slCode === "REQ SL") && (
                                  <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
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
                          {/* VAT Code */}
                          <td className="global-tran-td-ui relative">
                            <div className="flex items-center">
                              <input
                                type="text"
                                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                value={row.vatCode || ""}
                                readOnly
                              />
                              {!isFormDisabled && (
                                <FontAwesomeIcon
                                  icon={faMagnifyingGlass}
                                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                  onClick={() => {
                                    updateState({
                                      selectedRowIndex: index,
                                      showVatModal: true,
                                      accountModalSource: "vatCode",
                                    });
                                  }}
                                />
                              )}
                            </div>
                          </td>

                          {/* VAT Name */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[250px] global-tran-td-inputclass-ui"
                              value={row.vatName || ""}
                              readOnly
                              disabled={isFormDisabled}
                              onDoubleClick={() => handleVatNameDoubleClick(index)}
                            />
                          </td>

                          {/* VAT Amount */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                              value={
                                formatNumber(
                                  parseFormattedNumber(row.vatAmount),
                                ) ||
                                formatNumber(
                                  parseFormattedNumber(row.vatAmount),
                                ) ||
                                ""
                              }
                              readOnly
                            />
                          </td>

                          {/* ATC Code */}
                          <td className="global-tran-td-ui relative">
                            <div className="flex items-center">
                              <input
                                type="text"
                                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                value={row.atcCode || ""}
                                readOnly
                              />
                              {!isFormDisabled && (
                                <FontAwesomeIcon
                                  icon={faMagnifyingGlass}
                                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                  onClick={() => {
                                    updateState({
                                      selectedRowIndex: index,
                                      showAtcModal: true,
                                      accountModalSource: "atcCode",
                                    });
                                  }}
                                />
                              )}
                            </div>
                          </td>

                          {/* ATC Name */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[250px] global-tran-td-inputclass-ui"
                              value={row.atcName || ""}
                              readOnly
                              disabled={isFormDisabled}
                              onDoubleClick={() => handleAtcNameDoubleClick(index)}
                            />
                          </td>

                          {/* ATC Amount */}
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                              value={
                                formatNumber(
                                  parseFormattedNumber(row.atcAmount),
                                ) ||
                                formatNumber(
                                  parseFormattedNumber(row.atcAmount),
                                ) ||
                                ""
                              }
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "atcAmount",
                                  e.target.value,
                                )
                              }
                              readOnly
                            />
                          </td>



                          <td className="global-tran-td-ui relative">
                            <div className="flex items-center">
                              <input
                                type="text"
                                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6"
                                value={row.paytermCode || ""}
                                readOnly
                                onDoubleClick={() =>
                                  handlePaytermDoubleClick(index)
                                }
                                disabled={isFormDisabled}
                              />
                              {!isFormDisabled && (
                                <FontAwesomeIcon
                                  icon={faMagnifyingGlass}
                                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                  onClick={() => {
                                    updateState({
                                      selectedRowIndex: index,
                                      showPaytermModal: true,
                                    });
                                  }}
                                />
                              )}
                            </div>
                          </td>
                          <td className="global-tran-td-ui">
                            <div className="w-[110px]">
                              <DateFormatInput
                                id={`dueDate_${index}`}
                                value={row.dueDate || ""}
                                disabled={isFormDisabled}
                                className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                                updateState={(updates) => {
                                  if (
                                    updates[`dueDate_${index}`] !== undefined
                                  ) {
                                    handleDetailChange(
                                      index,
                                      "dueDate",
                                      updates[`dueDate_${index}`],
                                      false,
                                    );
                                  }
                                }}
                              />
                            </div>
                          </td>


                          {showAppliedAdvancesColumns && (
                            <>
                              {/* Applied Advances PO */}
                              <td className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[120px] global-tran-td-inputclass-ui"
                                  value={row.advpoNo || ""}
                                  maxLength={50}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      index,
                                      "advpoNo",
                                      e.target.value,
                                      false,
                                    )
                                  }
                                  disabled={isFormDisabled}
                                />
                              </td>

                              {/* Applied Advances Amount */}
                              <td className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[120px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                  value={row.advpoAmount || "0.00"}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^-?\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") {
                                      handleDetailChange(index, "advpoAmount", value, false);
                                    }
                                  }}
                                  onFocus={(e) => {
                                    if (isFormDisabled) return;
                                    if (e.target.value === "0.00" || e.target.value === "0") {
                                      handleDetailChange(index, "advpoAmount", "", false);
                                    }
                                    setTimeout(() => e.target.select(), 0);
                                  }}
                                  onBlur={(e) => {
                                    if (isFormDisabled) return;
                                    const num = parseFormattedNumber(e.target.value);
                                    handleDetailChange(
                                      index,
                                      "advpoAmount",
                                      formatNumber(isNaN(num) ? 0 : num),
                                      false,
                                    );
                                  }}
                                  disabled={isFormDisabled}
                                />
                              </td>

                              {/* Applied Advances VAT */}
                              <td className="global-tran-td-ui">
                                <input
                                  type="text"
                                  className="w-[120px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                                  value={row.advpoVatAmount ?? row.advpoAtcAmount ?? "0.00"}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^-?\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") {
                                      handleDetailChange(index, "advpoVatAmount", value, false);
                                    }
                                  }}
                                  onFocus={(e) => {
                                    if (isFormDisabled) return;
                                    if (e.target.value === "0.00" || e.target.value === "0") {
                                      handleDetailChange(index, "advpoVatAmount", "", false);
                                    }
                                    setTimeout(() => e.target.select(), 0);
                                  }}
                                  onBlur={(e) => {
                                    if (isFormDisabled) return;
                                    const num = parseFormattedNumber(e.target.value);
                                    handleDetailChange(
                                      index,
                                      "advpoVatAmount",
                                      formatNumber(isNaN(num) ? 0 : num),
                                      false,
                                    );
                                  }}
                                  disabled={isFormDisabled}
                                />
                              </td>

                            </>
                          )}

                          {showAdvancesAccountColumn && (
                            <>
                              {/* Advances Account */}
                              <td className="global-tran-td-ui relative">
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    className="w-[120px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                                    value={row.advAcct || ""}
                                    readOnly
                                    disabled={isFormDisabled}
                                  />
                                  {!isFormDisabled && (
                                    <FontAwesomeIcon
                                      icon={faMagnifyingGlass}
                                      className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                      onClick={() => {
                                        updateState({
                                          selectedRowIndex: index,
                                          showAccountModal: true,
                                          accountModalSource: "advAcct",
                                        });
                                      }}
                                    />
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {!isFormDisabled && (
                            <td
                              className="global-tran-td-ui text-center sticky right-0"
                              style={transactionActionsCellStyle}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  className="global-tran-td-button-add-ui"
                                  onClick={() => {
                                    if (isImportationAPType) {
                                      handleOpenReferenceLCImportation();
                                      return;
                                    }
                                    handleAddRow(index);
                                  }}
                                >
                                  <FontAwesomeIcon icon={faPlus} />
                                </button>

                                <button
                                  type="button"
                                  className="global-tran-td-button-delete-ui"
                                  onClick={() => handleDeleteRow(index)}
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
                  {renderApvDetailHeaderContextMenu()}
                </div>
              </div>

              {/* Invoice Details Footer */}
              <div className="global-tran-tab-footer-main-div-ui">
                {/* Add Button */}
                <div className="global-tran-tab-footer-button-div-ui">
                  <div className="relative inline-block">
                    {showInvoiceAddDropdown && !isImportationAPType && (
                      <div className="absolute bottom-[110%] left-0 mb-2 z-[9999] w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                            Invoice Details
                          </div>
                        </div>

                        <div className="p-1.5">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                            onClick={handleAddInvoiceRow}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                <FontAwesomeIcon icon={faPlus} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>Add Row</span>
                                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                  Add invoice line
                                </span>
                              </div>
                            </div>
                          </button>

                          <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />

                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                            onClick={() => {
  setShowInvoiceAddDropdown(false);
  if (isImportationAPType) {
    handleOpenReferenceLCImportation();
  } else if (isAdvancesAPType) {
    handleOpenReferencePOAdvance();
  } else {
    handleOpenReferenceRR();
  }
}}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                <FontAwesomeIcon icon={faFileLines} />
                              </span>
                              <div className="flex flex-col items-start">
                                <span>{openReferenceLabel}</span>
                                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                  {openReferenceDescription}
                                </span>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleInvoiceAddClick}
                      className={`global-tran-tab-footer-button-add-ui ${
                        isFormDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={isFormDisabled}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="global-tran-tab-footer-total-main-div-ui">
                  {/* Total Invoice Amount */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total Invoice Amount:
                    </label>
                    <label
                      id="totalInvoiceAmount"
                      className="global-tran-tab-footer-total-value-ui"
                    >
                      0.00
                    </label>
                  </div>

                  {/* Total VAT Amount */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total VAT Amount:
                    </label>
                    <label
                      id="totalVATAmount"
                      className="global-tran-tab-footer-total-value-ui"
                    >
                      0.00
                    </label>
                  </div>

                  {/* Total ATC Amount */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total ATC Amount:
                    </label>
                    <label
                      id="totalATCAmount"
                      className="global-tran-tab-footer-total-value-ui"
                    >
                      0.00
                    </label>
                  </div>

                  {/* Total Payable Amount (Invoice + VAT - ATC) */}
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label className="global-tran-tab-footer-total-label-ui">
                      Total Payable Amount:
                    </label>
                    <label
                      id="totalPayableAmount"
                      className="global-tran-tab-footer-total-value-ui"
                    >
                      0.00
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* General Ledger Button */}
        <div className="global-tran-tab-div-ui">
          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">
            {/* Tabs */}
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

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className={`global-tran-tab-footer-button-add-ui ${
                        isFormDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                disabled={isLoading || isFormDisabled}
              >
                {isLoading ? "Generating..." : "Generate GL Entries"}
              </button>

            </div>
          </div>

          {/* GL Details Table */}
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full table-fixed border-collapse [&_input]:w-full [&_select]:w-full">
                <colgroup>
                  {apvGlColumnDefs.map((column) => (
                    <col
                      key={column.key}
                      style={getApvGlCellStyle(column.key, column.width)}
                    />
                  ))}
                  {!isFormDisabled && <col style={transactionActionsCellStyle} />}
                </colgroup>
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {apvGlColumnDefs.map((column) =>
                      renderApvGlHeader(column.label, column.key, column.width)
                    )}

                    {!isFormDisabled && (
                      <th
                        className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30"
                        style={transactionActionsHeaderStyle}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {detailRowsGL.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
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
                            disabled={isFormDisabled}
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
                            className={`w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer ${
                              row.rcCode === "REQ RC"
                                ? "font-bold text-black"
                                : ""
                            }`}
                            value={row.rcCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "rcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                            disabled={isFormDisabled}
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
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className={`w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer ${
                              row.slCode === "REQ SL"
                                ? "font-bold text-black"
                                : ""
                            }`}
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "slCode",
                                e.target.value,
                              )
                            }
                            readOnly
                            disabled={isFormDisabled}
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
                        <div className="relative inline-block">
                          {/* Hidden span to measure text width */}
                          <span className="invisible absolute whitespace-pre px-2">
                            {row.particular || " "}
                          </span>

                          <input
                            type="text"
                            className="global-tran-td-inputclass-ui"
                            style={{
                              width: `${(row.particular?.length || 1) * 7}px`,
                            }}
                            value={row.particular || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "particular",
                                e.target.value,
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.vatCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "vatCode",
                                e.target.value,
                              )
                            }
                            readOnly
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled &&
                            row.vatCode &&
                            row.vatCode.length > 0 && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showVatModal: true,
                                  });
                                }}
                              />
                            )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.vatName || ""}
                          readOnly
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.atcCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "atcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled &&
                            (row.atcCode !== "" || row.atcCode) && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  if (row.atcCode !== "" || row.atcCode) {
                                    updateState({
                                      selectedRowIndex: index,
                                      showAtcModal: true,
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
                          className="w-[200px] global-tran-td-inputclass-ui"
                          value={row.atcName || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "atcName",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debit || ""}
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
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debit", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.credit || ""}
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
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "credit", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${
                          withCurr2 ? "" : "hidden"
                        }`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx1 || ""}
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
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debitFx1", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${
                          withCurr2 ? "" : "hidden"
                        }`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx1 || ""}
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
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "creditFx1", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${
                          withCurr3 ? "" : "hidden"
                        }`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx2 || ""}
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
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debitFx2", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${
                          withCurr3 ? "" : "hidden"
                        }`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx2 || ""}
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
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "creditFx2", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefNo || ""}
                          maxLength={25}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slRefNo",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="w-[110px]">
                          <input
                            type="text"
                            id={`slrefDate_${index}`}
                            value={row.slrefDate || ""}
                            disabled={isFormDisabled}
                            placeholder="MM/DD/YYYY"
                            maxLength={10}
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                            onChange={(e) =>
                              handleSlrefDateChange(index, e.target.value)
                            }
                            onBlur={(e) =>
                              handleSlrefDateBlur(index, e.target.value)
                            }
                          />
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative flex w-[220px] items-center">
                          <input
                            type="text"
                            className="w-full truncate pr-8 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.remarks || header.remarks || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "remarks",
                                e.target.value,
                              )
                            }
                            onDoubleClick={() => openGLRemarksModal(index)}
                            title={row.remarks || header.remarks || "Open remarks"}
                            disabled={isFormDisabled}
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => openGLRemarksModal(index)}
                              title="Open Remarks"
                            />
                          )}
                        </div>
                      </td>

                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() => {
                                if (isImportationAPType) {
                                  handleOpenReferenceLCImportation();
                                } else {
                                  handleAddRow(index);
                                }
                              }}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRow(index)}
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
              {renderApvGlHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            {/* Add Button */}
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={handleAddRowGL}
                className={`global-tran-tab-footer-button-add-ui ${
                        isFormDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                disabled={isFormDisabled}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>

            </div>

            {/* Totals Section */}
            <div className="global-tran-tab-footer-total-main-div-ui">
              {/* Total Debit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Debit:
                </label>
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totalDebit}
                </label>
              </div>

              {/* Total Credit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Credit:
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

        {/* Modals */}
        {branchModalOpen && (
          <BranchLookupModal
            isOpen={branchModalOpen}
            onClose={handleCloseBranchModal}
          />
        )}

        {currencyModalOpen && (
          <CurrLookupModal
            isOpen={currencyModalOpen}
            onClose={handleCloseCurrencyModal}
          />
        )}

        {payeeModalOpen && (
          <PayeeMastLookupModal
            isOpen={payeeModalOpen}
            onClose={handleClosePayeeModal}
          />
        )}

        {/* COA Account Modal*/}
        {showAccountModal && (
          <COAMastLookupModal
            isOpen={showAccountModal}
            onClose={handleCloseAccountModal}
            source={accountModalSource}
            customParam={
  accountModalSource === "apAccount"
    ? "APGL"
    : accountModalSource === "advAcct"
      ? "ADGL"
      : "ActiveAll"
}
          />
        )}

        {/* RC Code Modal */}
        <RCLookupModal
          isOpen={showRcModal}
          onClose={
            accountModalSource === "rcCode"
              ? handleCloseRcModal
              : handleCloseRcModalGL
          }
          source={accountModalSource}
        />

       {state.showRRRefModal && (
  <GlobalLookupModalv1
    isOpen={state.showRRRefModal}
    title={
      state.globalLookupTitle ||
      (modalContext === "openLCImportation"
        ? "Open LC Importation References"
        : modalContext === "openPOAdvance"
          ? "Open PO / JO References"
          : "Open RR / JO References")
    }
    data={state.globalLookupRow}
    endpoint={Array.isArray(state.globalLookupHeader) ? state.globalLookupHeader : openRRLookupColumns}
    btnCaption={
      state.globalLookupBtnCaption ||
      (modalContext === "openLCImportation"
        ? "Get Selected LC"
        : modalContext === "openPOAdvance"
          ? "Get Selected PO/JO"
          : "Get Selected RR/JO")
    }
    idKey="groupId"
    onClose={handleCloseRRRefModal}
    onCancel={() =>
      updateState({
        showRRRefModal: false,
        modalContext: "",
        globalLookupTitle: "",
        globalLookupBtnCaption: "",
        globalLookupConfigEndpoint: "",
      })
    }
    singleSelect={false}
  />
)}

        {/* VAT Code Modal */}
        {showVatModal && (
          <VATLookupModal isOpen={showVatModal} customParam="InputAll" onClose={handleCloseVatModal} />
        )}

        {/* ATC Code Modal */}
        {showAtcModal && (
          <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />
        )}

        {/* SL Code Lookup Modal */}
        {/* SL Code Lookup Modal */}
        {showSlModal && (
          <SLMastLookupModal
            isOpen={showSlModal}
            onClose={
              accountModalSource === "slCode"
                ? handleCloseSlModal
                : handleCloseSlModalGL
            }
          />
        )}

        {/* Payment Terms Lookup Modal */}
        {showPaytermModal && (
          <PaytermLookupModal
            isOpen={showPaytermModal}
            onClose={handleClosePaytermModal}
          />
        )}

        {/* Cancellation Modal */}
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
            params={{
              documentID: documentID,
              noReprints: 0,
              docType: docType,
              docNo: documentNo,
            }}
            onClose={handleCloseSignatory}
            onCancel={() => updateState({ showSignatoryModal: false })}
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
              fieldNo: "apvNo",
            }}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{ documentNo }}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
          />
        )}

        {/* Post Modal */}
        {showPostingModal && (
          <PostAPV
            isOpen={showPostingModal}
            userCode={userCode} // This should now work
            onClose={() => updateState({ showPostingModal: false })}
          />
        )}

        {showSpinner && <LoadingSpinner />}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getAPVHistory"
          cacheKey={`APV:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="APV_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status={(() => {
            const s = (state.status || "").toUpperCase();
            if (s === "Finalized") return "F";
            if (s === "Cancelled") return "X";
            if (s === "Closed")    return "C";
            if (s === "Open")      return "";
            return "All";
          })()}
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>
    </div>
  );
};

export default APV;
