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
import BranchLookupModal from "../../../Lookup/SearchBranchRef.jsx";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { postRequest, fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopBillTermRow,
  useTopRCRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopDocDropDown,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useSelectedHSColConfig,
} from "@/NAYSA Cloud/Global/selectedData";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";

const RMIS = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsGLRef = useRef([]);
  const categoryAccountCacheRef = useRef({});
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isViewDocument, setIsViewDocument] = useState(false);

useEffect(() => {
  const p = new URLSearchParams(location.search);
  setIsViewDocument(p.get("viewDocument") === "true");
}, [location.search]);

  const isViewDocumentUrl = isViewDocument;
  

  const { resetFlag } = useReset();

  const [topTab, setTopTab] = useState("details"); // "details" | "history"

  const [state, setState] = useState({
    // HS Option / Currency
    glCurrMode: "M",
    glCurrDefault: "PHP",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: "",
    glCurrGlobal2: "",
    glCurrGlobal3: "",

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
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    // Header information
    header: {
      rr_date: new Date().toISOString().split("T")[0], // PR Date
    },

    branchCode: "HO",
    branchName: "Head Office",

    // Responsibility Center / Requesting Dept
    // Responsibility Center / Requesting Dept
    reqRcCode: "",
    reqRcName: "",
    attention: "",
    vendCOde: "",
    vendName: "",

    // Currency information (not used by sproc_PHP_PR but kept for UI consistency)
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info (aligned to PR header fields)
    poTranTypes: [],
    poTypes: [],
    selectedPoTranType: "",
    selectedPoType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "", // responsibility center name for display
    requestDept: "",
    vendCode: "",
    refPoNo1: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    poCancelled: "",
    poNo: "",
    payTerm: "",
    userCode: user?.USER_CODE || user?.userCode,
    selectedPOStatus: "",
    // Warehouse / Location header values
    WHcode: "",
    WHname: "",
    locCode: "",
    locName: "",

    // Detail lines (PR dt1)
    detailRows: [],
    detailRowsGL: [],
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
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostModal: false,
    showAllTranDocNo: false,
    showAccountModal: false,
    showRcModal: false,
    showSlModal: false,
    accountModalSource: null,
    // Modal flags
    warehouseLookupOpen: false,
    locationLookupOpen: false,
    drAcctLookupOpen: false,
    drAcctRowIndex: null,

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    rmLookupModalOpen: false,
    globalLookupRow: [],
    globalLookupHeader: [],
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

    activeTab,
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    poNo,
    selectedPOType,
    selectedRowIndex,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    poStatus,
    RRDate,

    // Header
    branchCode,
    branchName,
    payTerm,
    WHcode,

    // Responsibility Center
    rcCode,
    rcName,

    // Requesting Dept
    reqRcCode,
    reqRcName,
    vendCOde,

    currCode,
    currName,
    attention,
    poDate,
    cutoffFrom,
    cutoffTo,

    vendCode,
    vendName,

    poTranTypes,
    poTypes,
    selectedPoTranType,
    selectedPoType,
    cutoffCode,
    requestDept,
    dateNeeded,
    refPoNo1,
    refPrNo2,
    remarks,
    billtermCode,
    billtermName,
    noReprints,
    poCancelled,
    userCode,
    currRate,
    drno,

    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,
    totalDebitFx1,
    totalCreditFx1,
    totalDebitFx2,
    totalCreditFx2,

    // Modals
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    showAllTranDocNo,
    showAccountModal,
    showRcModal,
    showSlModal,
    accountModalSource,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    rmLookupModalOpen,
    globalLookupRow,
    globalLookupHeader,
  } = state;

  const [header, setHeader] = useState({
    rr_date: new Date().toISOString().split("T")[0],
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [totals, setTotals] = useState({
    totalQtyNeeded: "",
  });

  // RMIS.jsx
  const docType = docTypes?.RMIS || "RMIS";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle =
    docTypeNames[docType] || "RM Issuance Slip";

  const displayStatus = status || "OPEN";
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
  const isOpenDocumentStatus = (value) =>
    ["", "O", "OPEN"].includes(String(value ?? "").trim().toUpperCase());

  const updateTotalsDisplay = (qtyNeeded) => {
    setTotals({
      totalQtyNeeded: formatNumber(qtyNeeded, 6),
    });
  };

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
    const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
    const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);
    return {
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
      totalDebitFx1: formatNumber(debitFx1Sum),
      totalCreditFx1: formatNumber(creditFx1Sum),
      totalDebitFx2: formatNumber(debitFx2Sum),
      totalCreditFx2: formatNumber(creditFx2Sum),
    };
  };

  // ==========================
  // EFFECTS
  // ==========================

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
    detailRowsGLRef.current = detailRowsGL || [];
    updateState(getGLTotalsState(detailRowsGL));
  }, [detailRowsGL]);

  useEffect(() => {
    handleReset();
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

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size="2x"
          className="text-blue-500 mb-2"
        />
        <p>Please wait...</p>
      </div>
    </div>
  );

  // ==========================
  // INITIAL LOAD / RESET
  // ==========================

  const handleReset = () => {
    loadDocDropDown();
    loadDocControl();
    loadCompanyData();

    const today = new Date().toISOString().split("T")[0];

    updateState({
      header: { rr_date: today },
      branchCode: "HO",
      branchName: "Head Office",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      vendCode: "",
      vendName: "",
      dateNeeded: today, // <-- DEFAULT TO TODAY
      refPoNo1: "",
      refPrNo2: "",
      remarks: "",
      documentNo: "",
      documentID: "",
      documentStatus: "",
      activeTab: "basic",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "OPEN",
      noReprints: "0",
      poCancelled: "",
      detailRows: [],
      detailRowsGL: [],
      totalDebit: "0.00",
      totalCredit: "0.00",
      totalDebitFx1: "0.00",
      totalCreditFx1: "0.00",
      totalDebitFx2: "0.00",
      totalCreditFx2: "0.00",
      rcLookupModalOpen: false,
      rcLookupContext: "",
      showAccountModal: false,
      showRcModal: false,
      showSlModal: false,
      showAllTranDocNo: false,
      accountModalSource: null,
      rmLookupModalOpen: false,
      globalLookupRow: [],
      globalLookupHeader: [],
      WHcode: "",
      WHname: "",
      locCode: "",
      locName: "",
      warehouseLookupOpen: false,
      locationLookupOpen: false,
      drAcctCode: "",
      drAcctName: "",
    });

    updateTotalsDisplay(0);
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

  const handleCloseLocationLookup = (row) => {
    if (!row) {
      updateState({ locationLookupOpen: false });
      return;
    }

    updateState({
      locationLookupOpen: false,
      locCode: row?.locCode ?? "",
      locName: row?.locName ?? "",
      // optional: WHcode: row?.whCode ?? state.WHcode,
    });
  };

  const replicateFirstRowValueToBlankRows = async (
    rows,
    index,
    field,
    value,
    extraData = {},
  ) => {
    if (index !== 0) return rows;

    const hasBlanks = rows.some(
      (row, rowIndex) =>
        rowIndex !== 0 &&
        (!row[field] || row[field].toString().trim() === ""),
    );

    if (!hasBlanks) return rows;

    const fieldLabels = {
      drAcctCode: "DR Account",
      rcCode: "RC Code",
      slCode: "SL Code",
      whouseCode: "Warehouse",
      locCode: "Location",
      itemStat: "Quality Status",
      lotNo: "Lot No.",
      bbDate: "BB Date",
      mrsNo: "MRS No.",
    };

    const result = await Swal.fire({
      title: "Replicate Data?",
      text: `Do you want to copy this ${fieldLabels[field] || field} to all blank rows?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, copy it!",
      cancelButtonText: "No",
    });

    if (!result.isConfirmed) return rows;

    return rows.map((row, rowIndex) => {
      if (
        rowIndex !== 0 &&
        (!row[field] || row[field].toString().trim() === "")
      ) {
        return { ...row, [field]: value, ...extraData };
      }
      return row;
    });
  };

  const handleCloseAccountModal = async (selectedAccount) => {
    console.log("🟦 COA MODAL CLOSED");
    console.log(
      "🟦 source:",
      accountModalSource,
      " rowIndex:",
      selectedRowIndex,
    );
    console.log("🟦 selectedAccount:", selectedAccount);

    // always close modal
    if (
      !selectedAccount ||
      selectedRowIndex === null ||
      selectedRowIndex === undefined
    ) {
      updateState({
        showAccountModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
      return;
    }

    const acctCode = selectedAccount?.acctCode ?? "";
    const acctName = selectedAccount?.acctName ?? "";

    if (accountModalSource === "drAcct") {
      console.log("✅ DR ACCT SELECTED:", { acctCode, acctName });

      const rows = [...(state.detailRows || [])];
      const row = { ...(rows[selectedRowIndex] || {}) };

      row.drAcctCode = acctCode;
      row.drAcctName = acctName;

      rows[selectedRowIndex] = row;

      const updatedRows = await replicateFirstRowValueToBlankRows(
        rows,
        selectedRowIndex,
        "drAcctCode",
        acctCode,
        { drAcctName: acctName },
      );

      updateState({
        detailRows: updatedRows,
        detailRowsGL: [],
        showAccountModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });

      return; // prevent the updateState below from re-closing again
    }

    if (accountModalSource === "acctCode") {
      handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
    }

    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
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

      const hsOption = await useTopHSOption();
      if (hsOption) {
        updateState({
          glCurrMode: hsOption.glCurrMode,
          glCurrDefault: hsOption.glCurrDefault,
          currCode: hsOption.glCurrDefault,
          glCurrGlobal1: hsOption.glCurrGlobal1,
          glCurrGlobal2: hsOption.glCurrGlobal2,
          glCurrGlobal3: hsOption.glCurrGlobal3,
        });

        const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
        if (curr) {
          updateState({
            currName: curr.currName,
            currRate: formatNumber(1, 6),
          });
        }
      }
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

  const loadDocDropDown = async () => {
    const data = await useTopDocDropDown(docType, "POTRAN_TYPE");
    if (data) {
      updateState({
        poTranTypes: data,
        selectedPoTranType: data[0]?.DROPDOWN_CODE ?? "",
      });
    }
  };

  // ==========================
  // FETCH (GET) – RMIS HEADER + DT1 + DT2
  // ==========================

  const formatDateOnly = (value) => {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.substring(0, 10);

    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime())
      ? text.substring(0, 10)
      : dateValue.toISOString().split("T")[0];
  };

  const parseRetrievedArray = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    if (typeof value === "string") {
      try {
        const parsedValue = JSON.parse(value);
        return parseRetrievedArray(parsedValue);
      } catch {
        return [];
      }
    }

    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.result)) return value.result;
    if (typeof value?.result === "string") return parseRetrievedArray(value.result);

    return [];
  };

  const normalizeFetchedTransaction = (value) => {
    if (!value) return {};

    if (typeof value === "string") {
      try {
        return normalizeFetchedTransaction(JSON.parse(value));
      } catch {
        return {};
      }
    }

    if (Array.isArray(value)) {
      return normalizeFetchedTransaction(value[0]);
    }

    if (typeof value?.result === "string") {
      return normalizeFetchedTransaction(value.result);
    }

    if (Array.isArray(value?.result)) {
      return normalizeFetchedTransaction(value.result[0]);
    }

    if (Array.isArray(value?.data)) {
      return normalizeFetchedTransaction(value.data[0]);
    }

    return value;
  };

  const getFirstValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  };

  const fetchTranData = async (rmisNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        isDocNoDisabled: false,
        isFetchDisabled: false,
        WHcode: "",
        WHname: "",
        locCode: "",
        locName: "",
        detailRows: [],
        detailRowsGL: [],
      });
      updateTotalsDisplay(0);
    };

    updateState({ isLoading: true });

    try {
      const rawData = await useFetchTranData(rmisNo, branchCode, docType, "rmisNo", direction);
      const data = normalizeFetchedTransaction(rawData);

      console.log("✅ RMIS Retrieved Data:", data);
      console.log("✅ RMIS Retrieved DT1:", parseRetrievedArray(data.dt1));
      console.log("✅ RMIS Retrieved DT2:", parseRetrievedArray(data.dt2));

      if (!data?.rmisId && !data?.rmisNo) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      const rmisDateForHeader = formatDateOnly(data.rmisDate || data.rmis_date || data.documentDate) || new Date().toISOString().split("T")[0];
      const dt1 = parseRetrievedArray(data.dt1);
      const dt2 = parseRetrievedArray(data.dt2);

      const retrievedDetailRows = dt1.map((item, index) => {
        const itemAmountValue = item.itemAmount ?? item.item_amount ?? item.amount ?? 0;
        const qtyValue = item.quantity ?? item.qtyIssued ?? 0;
        const qtyHandValue = item.qtyHand ?? item.qty_hand ?? item.qtyOnHand ?? qtyValue ?? 0;

        return {
          ...item,
          lnNo: item.lnNo ?? item.lineNo ?? item.line_no ?? index + 1,
          itemCode: item.itemCode || item.item_code || "",
          itemName: item.itemName || item.itemDesc || item.item_name || "",
          categCode: item.categCode || item.categ_code || "",
          uomCode: item.uomCode || item.uom_code || "",
          quantity: formatNumber(qtyValue, 6),
          unitCost: formatNumber(item.unitCost ?? item.unit_cost ?? 0, 6),
          amount: formatNumber(itemAmountValue, 2),
          itemAmount: formatNumber(itemAmountValue, 2),
          lotNo: item.lotNo || item.lot_no || "",
          qstatCode: item.qstatCode || item.qsCode || item.qstat_code || item.itemStat || "",
          itemStat: item.itemStat || item.qstatCode || item.qsCode || item.qstat_code || "",
          bbDate: formatDateOnly(item.bbDate || item.bb_date),
          qtyHand: formatNumber(qtyHandValue, 6),
          qtyOnHand: formatNumber(qtyHandValue, 6),
          whouseCode: getFirstValue(item.whouseCode, item.whCode, item.whouse_code, item.WHCode, data.whCode, data.whouseCode),
          whouseName: getFirstValue(item.whouseName, item.whName, item.whouse_name, item.WHName, data.whName, data.whouseName, data.whCode, data.whouseCode),
          locCode: getFirstValue(item.locCode, item.LocCode, item.loc_code, data.locCode, data.LocCode),
          locName: getFirstValue(item.locName, item.LocName, item.loc_name, data.locName, data.LocName, data.locCode, data.LocCode),
          acctCode: getFirstValue(item.acctCode, item.acct_code, item.drAcctCode),
          drAcctCode: getFirstValue(item.drAcctCode, item.acctCode, item.acct_code),
          drAcctName: getFirstValue(item.drAcctName, item.acctName, item.acct_name),
          rcCode: getFirstValue(item.rcCode, item.rc_code, data.rcCode, data.reqRcCode),
          slTypeCode: item.slTypeCode || item.sltypeCode || item.sltype_code || "",
          sltypeCode: item.sltypeCode || item.slTypeCode || item.sltype_code || "",
          slCode: item.slCode || item.sl_code || "",
          groupId: item.groupId || item.group_id || "",
          uniqueKey: item.uniqueKey || item.unique_key || "",
          operation: item.operation || "S",
          oldValue: item.oldValue || item.old_value || "",
        };
      });

      const formattedGLRows = dt2.map((glRow, index) => ({
        ...glRow,
        id: glRow.id || index + 1,
        recNo: glRow.recNo || glRow.rec_no || String(index + 1),
        acctCode: glRow.acctCode || glRow.acct_code || "",
        acctName: glRow.acctName || glRow.acct_name || "",
        rcCode: glRow.rcCode || glRow.rc_code || "",
        rcName: glRow.rcName || glRow.rc_name || "",
        sltypeCode: glRow.sltypeCode || glRow.slTypeCode || glRow.sltype_code || "",
        slTypeCode: glRow.slTypeCode || glRow.sltypeCode || glRow.sltype_code || "",
        slCode: glRow.slCode || glRow.sl_code || "",
        slName: glRow.slName || glRow.sl_name || "",
        particular: glRow.particular || glRow.particulars || "",
        vatCode: glRow.vatCode || glRow.vat_code || "",
        vatName: glRow.vatName || glRow.vat_name || "",
        atcCode: glRow.atcCode || glRow.atc_code || "",
        atcName: glRow.atcName || glRow.atc_name || "",
        debit: formatNumber(glRow.debit ?? 0),
        credit: formatNumber(glRow.credit ?? 0),
        debitFx1: formatNumber(glRow.debitFx1 ?? glRow.debit_fx1 ?? 0),
        creditFx1: formatNumber(glRow.creditFx1 ?? glRow.credit_fx1 ?? 0),
        debitFx2: formatNumber(glRow.debitFx2 ?? glRow.debit_fx2 ?? 0),
        creditFx2: formatNumber(glRow.creditFx2 ?? glRow.credit_fx2 ?? 0),
        slRefNo: glRow.slRefNo || glRow.slref_no || "",
        slRefDate: formatDateOnly(glRow.slRefDate || glRow.slref_date),
        remarks: glRow.remarks || "",
        dt1Lineno: glRow.dt1Lineno || glRow.dt1LineNo || "",
      }));

      const totalQty = retrievedDetailRows.reduce(
        (acc, r) => acc + (parseFormattedNumber(r.quantity ?? 0) || 0),
        0,
      );
      updateTotalsDisplay(totalQty);

      const retrievedRcCode = getFirstValue(
        data.rcCode,
        data.rc_code,
        data.reqRcCode,
        data.req_rc_code,
        retrievedDetailRows.find((row) => row.rcCode)?.rcCode,
      );

      const retrievedReqRcCode = getFirstValue(
        data.reqRcCode,
        data.req_rc_code,
        data.requestDeptCode,
        retrievedRcCode,
      );

      let retrievedRcName = getFirstValue(data.rcName, data.rc_name);
      let retrievedReqRcName = getFirstValue(data.reqRcName, data.req_rc_name, data.requestDeptName);

      if (retrievedRcCode && !retrievedRcName) {
        try {
          const rcRow = await useTopRCRow(retrievedRcCode);
          retrievedRcName = getFirstValue(rcRow?.rcName, rcRow?.RC_NAME, rcRow?.rc_name, retrievedRcCode);
        } catch (rcError) {
          console.warn("Unable to fetch RMIS RC name:", rcError);
          retrievedRcName = retrievedRcCode;
        }
      }

      if (retrievedReqRcCode && !retrievedReqRcName) {
        if (retrievedReqRcCode === retrievedRcCode && retrievedRcName) {
          retrievedReqRcName = retrievedRcName;
        } else {
          try {
            const reqRcRow = await useTopRCRow(retrievedReqRcCode);
            retrievedReqRcName = getFirstValue(reqRcRow?.rcName, reqRcRow?.RC_NAME, reqRcRow?.rc_name, retrievedReqRcCode);
          } catch (reqRcError) {
            console.warn("Unable to fetch RMIS Requesting Dept name:", reqRcError);
            retrievedReqRcName = retrievedReqRcCode;
          }
        }
      }

      const retrievedWhCode = getFirstValue(data.whCode, data.whouseCode, data.WHCode, data.whouse_code);
      const retrievedWhName = getFirstValue(data.whName, data.whouseName, data.WHName, data.whouse_name, retrievedWhCode);
      const retrievedLocCode = getFirstValue(data.locCode, data.LocCode, data.locationCode, data.loc_code);
      const retrievedLocName = getFirstValue(data.locName, data.LocName, data.locationName, data.loc_name, retrievedLocCode);

      setHeader((prev) => ({ ...prev, rr_date: rmisDateForHeader }));
      updateState({
        documentStatus: getFirstValue(data.rmisStatus, data.rmis_status),
        status: getFirstValue(data.docStatus, data.rmisStatus, data.status, "OPEN"),
        documentID: getFirstValue(data.rmisId, data.rmis_id),
        documentNo: getFirstValue(data.rmisNo, data.rmis_no, rmisNo),
        branchCode: getFirstValue(data.branchCode, data.branch_code, branchCode),
        header: { rr_date: rmisDateForHeader },
        rcCode: retrievedRcCode || "",
        rcName: retrievedRcName || retrievedRcCode || "",
        reqRcCode: retrievedReqRcCode || "",
        reqRcName: retrievedReqRcName || retrievedReqRcCode || "",
        refPoNo1: getFirstValue(data.refDocNo1, data.refNo1),
        refPrNo2: getFirstValue(data.refDocNo2, data.refNo2),
        remarks: data.remarks || "",
        WHcode: retrievedWhCode || "",
        WHname: retrievedWhName || retrievedWhCode || "",
        locCode: retrievedLocCode || "",
        locName: retrievedLocName || retrievedLocCode || "",
        noReprints: data.noReprints ?? "0",
        poCancelled: data.rmisCancelled || "",
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("Error fetching RMIS transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error?.response?.data?.message || error?.message || "Unable to fetch transaction.",
      });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const pickFirstValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  };

  const parseLookupResultRows = (response) => {
    const rawResult = response?.data?.[0]?.result;

    if (typeof rawResult === "string" && rawResult.trim() !== "") {
      try {
        const parsed = JSON.parse(rawResult);
        return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      } catch (error) {
        console.warn("Unable to parse lookup result JSON:", error);
      }
    }

    if (Array.isArray(response?.data)) return response.data;
    if (response?.data) return [response.data];
    return [];
  };

  const getItemCategoryCode = (item) =>
    pickFirstValue(
      item?.categCode,
      item?.categ_code,
      item?.CATEG_CODE,
      item?.rmcategCode,
      item?.rmCategCode,
      item?.RMCATEG_CODE,
      item?.categoryCode,
      item?.CATEGORY_CODE,
      item?.itemCategCode,
      item?.ITEM_CATEG_CODE,
      item?.rmcategCode,
      item?.rmCategCode,
      item?.RMCATEG_CODE,
    );

  const getDefaultDrAccountFromItem = (item) => ({
    // Default DR Account comes from rm_categ.EXPACCT_CODE based on the selected item's category.
    // The field remains editable in Raw Material Detail after defaulting.
    code: pickFirstValue(
      item?.drAcctCode,
      item?.DRACCT_CODE,
      item?.defaultDrAcctCode,
      item?.DEFAULT_DRACCT_CODE,
      item?.expAcctCode,
      item?.expacctCode,
      item?.EXPACCT_CODE,
      item?.expacct_code,
      item?.ExpAcctCode,
      item?.EXP_ACCT_CODE,
      item?.expenseAcctCode,
      item?.EXPENSE_ACCT_CODE,
      item?.categExpAcctCode,
      item?.CATEG_EXPACCT_CODE,
      item?.acctCode,
      item?.acct_code,
      item?.ACCT_CODE,
    ),
    name: pickFirstValue(
      item?.drAcctName,
      item?.DRACCT_NAME,
      item?.defaultDrAcctName,
      item?.DEFAULT_DRACCT_NAME,
      item?.expAcctName,
      item?.expacctName,
      item?.EXPACCT_NAME,
      item?.expacct_name,
      item?.ExpAcctName,
      item?.EXP_ACCT_NAME,
      item?.expenseAcctName,
      item?.EXPENSE_ACCT_NAME,
      item?.categExpAcctName,
      item?.CATEG_EXPACCT_NAME,
      item?.acctName,
      item?.acct_name,
      item?.ACCT_NAME,
    ),
  });

  const fetchDefaultDrAccountByCategory = async (categCode) => {
    const category = String(categCode || "").trim();
    if (!category) return { code: "", name: "" };

    if (categoryAccountCacheRef.current[category]) {
      return categoryAccountCacheRef.current[category];
    }

    try {
      // Backend should return rm_categ.expacct_code and the COA name for the selected category.
      // Suggested endpoint payload: { categCode: "OS" }
      const response = await fetchDataJson("getRMCategoryAccount", { categCode: category, rmcategCode: category });
      const rows = parseLookupResultRows(response);
      const row = rows[0] || {};
      const account = getDefaultDrAccountFromItem(row);

      categoryAccountCacheRef.current[category] = account;
      return account;
    } catch (error) {
      console.warn(`Unable to fetch default DR Account for category ${category}:`, error);
      return { code: "", name: "" };
    }
  };

  const resolveDefaultDrAccount = async (item) => {
    const accountFromLookup = getDefaultDrAccountFromItem(item);
    if (accountFromLookup.code) return accountFromLookup;

    const categoryCode = getItemCategoryCode(item);
    return fetchDefaultDrAccountByCategory(categoryCode);
  };

  const handleCloseRMLookup = async (selectedItems) => {
    updateState({ rmLookupModalOpen: false });

    if (!selectedItems) return;

    const rawRecords = Array.isArray(selectedItems?.records)
      ? selectedItems.records
      : selectedItems?.records
        ? [selectedItems.records]
        : Array.isArray(selectedItems)
          ? selectedItems
          : [selectedItems];

    const itemsArray = rawRecords.filter(
      (item) => (parseFormattedNumber(item?.qtyHand ?? item?.qtyOnHand ?? 0) || 0) > 0
    );

    if (itemsArray.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Stock Selected",
        text: "Only raw materials with Quantity on Hand can be selected.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const newRows = await Promise.all(
      itemsArray.map(async (item) => {
        const rawQtyHand = parseFormattedNumber(item?.qtyHand ?? item?.qtyOnHand ?? 0) || 0;
        const rawUnitCost = parseFormattedNumber(item?.unitCost ?? 0) || 0;
        const defaultDrAccount = await resolveDefaultDrAccount(item);

        return {
          itemCode: item?.itemCode ?? item?.rmCode ?? item?.RM_CODE ?? "",
          itemName: item?.itemName ?? item?.rmName ?? item?.RM_NAME ?? "",
          categCode: getItemCategoryCode(item),
          uomCode: item?.uomCode ?? item?.uom ?? "",

          quantity: formatNumber(0, 6),
          unitCost: formatNumber(rawUnitCost, 6),
          amount: formatNumber(0, 2),
          itemAmount: formatNumber(0, 2),

          lotNo: item?.lotNo ?? "",
          bbDate: item?.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : "",
          itemStat: item?.qstatCode ?? item?.itemStat ?? "",

          whouseCode: item?.whouseCode ?? item?.whCode ?? state.WHcode ?? "",
          whouseName: item?.whouseName ?? item?.whName ?? state.WHname ?? "",
          locCode: item?.locCode ?? state.locCode ?? "",
          locName: item?.locName ?? state.locName ?? "",

          qtyOnHand: formatNumber(rawQtyHand, 6),
          uniqueKey: item?.uniqueKey ?? "",

          // Defaulted from rm_categ.expacct_code, but still editable through the DR Acct lookup cell.
          drAcctCode: defaultDrAccount.code || "",
          drAcctName: defaultDrAccount.name || "",
          rcCode: state.rcCode || "",
          slCode: "",
          mrsNo: "",
          mrsQty: formatNumber(0, 6),
          remarks: "",
        };
      })
    );

    setState((prev) => {
      const updated = [...(prev.detailRows || []), ...newRows];
      const totalQty = updated.reduce(
        (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
        0
      );
      updateTotalsDisplay(totalQty);
      return { ...prev, detailRows: updated };
    });
  };

  const handlePrNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleOpenDrAcctLookup = (rowIndex) => {
    if (isFormDisabled) return;
    updateState({ drAcctLookupOpen: true, drAcctRowIndex: rowIndex });
  };

  const handleCloseDrAcctLookup = (acct) => {
    console.log("🔍 DR ACCT SELECTED FROM MODAL:", acct);

    const rowIndex = state.drAcctRowIndex;
    console.log("➡️ Target Row Index:", rowIndex);

    updateState({
      drAcctLookupOpen: false,
      drAcctRowIndex: null,
    });

    if (!acct || rowIndex === null || rowIndex === undefined) return;

    const updatedRows = [...state.detailRows];
    const row = { ...updatedRows[rowIndex] };

    // TEMPORARY: log row before update
    console.log("📌 Row BEFORE update:", row);

    row.drAcctCode = acct?.acctCode ?? acct?.GL_CODE ?? acct?.glCode ?? "";
    row.drAcctName = acct?.acctName ?? acct?.GL_NAME ?? acct?.glName ?? "";

    // TEMPORARY: log row after update
    console.log("✅ Row AFTER update:", row);

    updatedRows[rowIndex] = row;
    updateState({ detailRows: updatedRows, detailRowsGL: [] });
  };

  // ==========================
  // HEADER EVENTS
  // ==========================

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };

  const handlePrTranTypeChange = (e) => {
    updateState({ selectedPoTranType: e.target.value });
  };

  const handlePrTypeChange = (e) => {
    updateState({ selectedPoType: e.target.value });
  };

  // ==========================
  // DETAIL (PR_DT1) HANDLERS
  // ==========================

  // DR Account double-click handler
  const handleAccountDoubleDtl1Click = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      debitAcct: "",
      debitAcctName: "",
    };
    updateState({ detailRows: updatedRows, detailRowsGL: [] });
  };

  // When user clicks the "Add Line" button
  const handleAddRowClick = () => {
    // Block if RC or Requesting Dept is blank
    if (!rcCode || !reqRcCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Header Fields",
        text: "Please select both Responsibility Center and Requesting Dept before adding PR lines.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    if (isFormDisabled) return;

    // Toggle dropdown
    setShowTypeDropdown((prev) => !prev);
  };

  // When user picks FG / MS / RM
  const handleSelectTypeAndAddRow = () => {
    const today = header.rr_date || new Date().toISOString().split("T")[0];

    const newRow = {
      invType: typeCode,
      groupId: "",
      poStatus: status || "",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: "0.000000",
      qtyAlloc: "0.000000",
      qtyNeeded: "0.000000",
      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded: today,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",

      // ✅ add these
      drAcctCode: "",
      drAcctName: "",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);

    setShowTypeDropdown(false);
  };

  const handleOpenRMLookup = async () => {
    if (isFormDisabled) return;

    if (!state.WHcode) {
      Swal.fire({
        icon: "warning",
        title: "Required Header Field",
        text: "Please select Warehouse before adding items.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    updateState({ isLoading: true });

    try {
      const response = await fetchDataJson("getInvLookupRM", {
        userCode: state.userCode,
        whouseCode: state.WHcode || "",
        locCode: state.locCode || "",
        docType: "RMIS",
        tranType: "IL",
      });

      const rawData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : response?.data || [];

      const balanceRows = (Array.isArray(rawData) ? rawData : []).filter(
        (item) => (parseFormattedNumber(item?.qtyHand ?? item?.qtyOnHand ?? 0) || 0) > 0
      );

      if (balanceRows.length === 0) {
        Swal.fire({
          icon: "info",
          title: "RM Location Balance",
          text: "No raw materials with Quantity on Hand were found for the selected warehouse/location.",
          timer: 3000,
          showConfirmButton: false,
        });
        updateState({
          globalLookupRow: [],
          globalLookupHeader: [],
          rmLookupModalOpen: false,
        });
        return;
      }

      const colConfig = await useSelectedHSColConfig("getInvLookupRM", state.userCode || "NSI");

      updateState({
        globalLookupRow: balanceRows,
        globalLookupHeader: colConfig || [],
        rmLookupModalOpen: true,
      });
    } catch (error) {
      console.error("RMIS RM lookup error:", error);
      Swal.fire({
        icon: "error",
        title: "RM Location Balance",
        text: error?.response?.data?.message || error?.message || "No records found.",
      });
      updateState({
        globalLookupRow: [],
        globalLookupHeader: [],
        rmLookupModalOpen: false,
      });
    } finally {
      updateState({ isLoading: false });
    }
  };


  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);
  };

  const createEmptyGlRow = () => ({
    acctCode: "",
    rcCode: rcCode || "",
    sltypeCode: "",
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
    if (isFormDisabled) return;
    const updatedRows = [...(detailRowsGL || [])];
    if (index !== null && index !== undefined) {
      updatedRows.splice(index + 1, 0, createEmptyGlRow());
    } else {
      updatedRows.push(createEmptyGlRow());
    }
    updateState({ detailRowsGL: updatedRows, ...getGLTotalsState(updatedRows) });
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...(detailRowsGL || [])];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows, ...getGLTotalsState(updatedRows) });
  };

  const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
    let row = { ...(updatedRowsGL[index] || createEmptyGlRow()) };

    if (["acctCode", "slCode", "rcCode", "sltypeCode", "vatCode", "atcCode"].includes(field)) {
      const data = await useUpdateRowGLEntries(row, field, value, "", docType);
      if (data) {
        row = {
          ...row,
          acctCode: data.acctCode,
          sltypeCode: data.sltypeCode,
          slCode: data.slCode,
          rcCode: data.rcCode,
          vatCode: data.vatCode,
          vatName: data.vatName,
          atcCode: data.atcCode,
          atcName: data.atcName,
          particular: data.particular,
        };
      }
    } else {
      row[field] = value;
    }

    if (["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"].includes(field)) {
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
      if (parsedValue > 0 && pairs[field]) row[pairs[field]] = "0.00";
    }

    updatedRowsGL[index] = row;
    updateState({ detailRowsGL: updatedRowsGL, ...getGLTotalsState(updatedRowsGL) });
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
    const row = { ...(updatedRowsGL[index] || createEmptyGlRow()) };
    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (autoCompute && ((withCurr2 && currCode !== glCurrDefault) || withCurr3)) {
      const data = await useUpdateRowEditEntries(row, field, value, currCode, currRate, header?.rr_date);
      if (data) {
        row.debit = formatNumber(data.debit);
        row.credit = formatNumber(data.credit);
        row.debitFx1 = formatNumber(data.debitFx1);
        row.creditFx1 = formatNumber(data.creditFx1);
        row.debitFx2 = formatNumber(data.debitFx2);
        row.creditFx2 = formatNumber(data.creditFx2);
      }
    } else {
      const pairs = [["debit", "credit"], ["debitFx1", "creditFx1"], ["debitFx2", "creditFx2"]];
      pairs.forEach(([a, b]) => {
        if (field === a && parsedValue > 0) row[b] = formatNumber(0);
        if (field === b && parsedValue > 0) row[a] = formatNumber(0);
      });
    }

    updatedRowsGL[index] = row;
    updateState({ detailRowsGL: updatedRowsGL, ...getGLTotalsState(updatedRowsGL) });
  };

  const getRMISDetailNumericDecimals = (field) => {
    if (["quantity", "qtyOnHand", "mrsQty", "unitCost"].includes(field)) return 6;
    if (field === "amount") return 2;
    return 6;
  };

  const handleDetailChange = async (index, field, value, commit = false) => {
    const updatedRows = [...detailRows];
    const row = { ...updatedRows[index] };

    // sanitize numeric
    const isNumeric = [
      "qtyOnHand",
      "quantity",
      "unitCost",
      "amount",
      "mrsQty",
    ].includes(field);
    if (isNumeric) {
      const sanitized = String(value ?? "").replace(/[^0-9.]/g, "");
      row[field] = commit
        ? formatNumber(
            parseFormattedNumber(sanitized || 0),
            getRMISDetailNumericDecimals(field),
          )
        : sanitized;
    } else {
      row[field] = value;
    }

    // ✅ auto compute amount when quantity or unitCost changes
    if (field === "quantity" || field === "unitCost") {
      const qty = parseFormattedNumber(row.quantity || 0) || 0;
      const cost = parseFormattedNumber(row.unitCost || 0) || 0;

      // store formatted result (2 decimals for amount)
      const computedAmount = formatNumber(qty * cost, 2);
      row.amount = computedAmount;
      row.itemAmount = computedAmount;
    }

    updatedRows[index] = row;

    const replicateFields = [
      "itemStat",
      "whouseCode",
      "locCode",
      "drAcctCode",
      "rcCode",
      "slCode",
      "lotNo",
      "bbDate",
      "mrsNo",
    ];
    const finalRows = replicateFields.includes(field)
      ? await replicateFirstRowValueToBlankRows(updatedRows, index, field, row[field])
      : updatedRows;

    updateState({ detailRows: finalRows, detailRowsGL: [] });

    const totalQty = finalRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0,
    );
    updateTotalsDisplay(totalQty);
  };

  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (action) => {
    if (isFormDisabled) return;
    if (!["Upsert", "GenerateGL"].includes(action)) return;

    const formatDateForSql = (value) => {
      if (!value) return null;
      const dateValue = new Date(value);
      return Number.isNaN(dateValue.getTime())
        ? value
        : dateValue.toISOString().split("T")[0];
    };

    const formatGeneratedGLRows = (rows) =>
  (rows || []).map((glRow, index) => ({
    ...glRow,
    id: glRow.id || index + 1,
    recNo: glRow.recNo || glRow.rec_no || String(index + 1),

    acctCode: glRow.acctCode || glRow.acct_code || "",
    acctName: glRow.acctName || glRow.acct_name || "",

    rcCode: glRow.rcCode || glRow.rc_code || "",
    rcName: glRow.rcName || glRow.rc_name || "",

    sltypeCode: glRow.sltypeCode || glRow.slTypeCode || glRow.sltype_code || "",
    slTypeCode: glRow.slTypeCode || glRow.sltypeCode || glRow.sltype_code || "",

    slCode: glRow.slCode || glRow.sl_code || "",
    slName: glRow.slName || glRow.sl_name || "",

    particular: glRow.particular || glRow.particulars || "",

    vatCode: glRow.vatCode || glRow.vat_code || "",
    vatName: glRow.vatName || glRow.vat_name || "",

    atcCode: glRow.atcCode || glRow.atc_code || "",
    atcName: glRow.atcName || glRow.atc_name || "",

    debit: formatNumber(parseFormattedNumber(glRow.debit ?? 0), 2),
    credit: formatNumber(parseFormattedNumber(glRow.credit ?? 0), 2),
    debitFx1: formatNumber(parseFormattedNumber(glRow.debitFx1 ?? glRow.debit_fx1 ?? 0), 2),
    creditFx1: formatNumber(parseFormattedNumber(glRow.creditFx1 ?? glRow.credit_fx1 ?? 0), 2),
    debitFx2: formatNumber(parseFormattedNumber(glRow.debitFx2 ?? glRow.debit_fx2 ?? 0), 2),
    creditFx2: formatNumber(parseFormattedNumber(glRow.creditFx2 ?? glRow.credit_fx2 ?? 0), 2),

    slRefNo: glRow.slRefNo || glRow.slref_no || "",
    slRefDate: formatDateForSql(glRow.slRefDate || glRow.slref_date),
    remarks: glRow.remarks || "",
    dt1Lineno: glRow.dt1Lineno || glRow.dt1LineNo || glRow.dt1_lineno || "",
  }));

    // Same flow as MSRTV:
    // 1. Build one payload formatter.
    // 2. Generate GL first when saving with empty GL.
    // 3. Save using the current/generated GL rows.
    const getFormattedPayload = (targetGLRows) => {
      const {
        branchCode,
        documentNo,
        documentID,
        header,

        cutoffCode,
        rcCode,
        reqRcCode,
        reqRcName,

        WHcode,
        WHname,
        locCode,
        locName,

        attention,
        vendCode,
        vendName,

        remarks,
        noReprints,
        status,
        userCode,

        detailRows,
      } = state;

      return {
        branchCode: branchCode || "",
        rmisNo: documentID ? documentNo || "" : "",
        rmisId: documentID || "",
        rmisDate: header?.rr_date || new Date().toISOString().split("T")[0],
        cutoffCode: cutoffCode || "",

        refNo: attention || "",
        rcCode: rcCode || "",
        reqRcCode: reqRcCode || "",
        reqRcName: reqRcName || "",

        whouseCode: WHcode || "",
        whouseName: WHname || "",
        whCode: WHcode || "",
        locCode: locCode || "",
        locName: locName || "",

        empCode: vendCode || "",
        empName: vendName || "",

        remarks: remarks || "",
        status: status || "OPEN",
        noReprints: parseInt(noReprints || 0, 10),
        userCode: userCode || "NSI",

        dt1: (detailRows || []).map((row, index) => {
          const quantityValue = parseFormattedNumber(row.quantity || 0);
          const unitCostValue = parseFormattedNumber(row.unitCost || 0);
          const parsedItemAmount = parseFormattedNumber(row.itemAmount ?? row.amount ?? 0);
          const itemAmountValue = parsedItemAmount || Number((quantityValue * unitCostValue).toFixed(2));

          return {
            lnNo: String(index + 1),
            lineNo: String(index + 1),

            itemCode: row.itemCode || "",
            itemName: row.itemName || "",
            categCode: row.categCode || "",
            uomCode: row.uomCode || "",

            quantity: quantityValue,
            unitCost: unitCostValue,
            itemAmount: itemAmountValue,
            amount: itemAmountValue,

            lotNo: row.lotNo || "",
            qstatCode: row.qstatCode || row.itemStat || "",
            bbDate: formatDateForSql(row.bbDate),

            // RMIS sproc/table uses qty_hand as quantity.
            qtyHand: quantityValue,

            whouseCode: row.whouseCode || WHcode || "",
            locCode: row.locCode || locCode || "",

            acctCode: row.acctCode || row.drAcctCode || "",
            drAcctCode: row.drAcctCode || row.acctCode || "",
            rcCode: row.rcCode || rcCode || "",
            slTypeCode: row.slTypeCode || row.sltypeCode || "",
            sltypeCode: row.sltypeCode || row.slTypeCode || "",
            slCode: row.slCode || vendCode || "",

            uniqueKey: row.uniqueKey || "",
            operation: row.operation || "S",
          };
        }),

        dt2: (targetGLRows || []).map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || entry.slTypeCode || "",
          slTypeCode: entry.slTypeCode || entry.sltypeCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || entry.particulars || "",
          particulars: entry.particulars || entry.particular || "",
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
          slRefDate: formatDateForSql(entry.slRefDate),
          remarks: entry.remarks || "",
          dt1LineNo: entry.dt1LineNo || entry.dt1Lineno || entry.dt1_lineno || "",
          dt1Lineno: entry.dt1Lineno || entry.dt1LineNo || entry.dt1_lineno || "",
        })),
      };
    };

    updateState({ isLoading: true });

    try {
      let currentGL = [...(state.detailRowsGL || [])];

      // Auto-generate GL before saving when GL table is empty, same as MSRTV.
      if (action === "Upsert" && currentGL.length === 0) {
        const genPayload = getFormattedPayload([]);
        const newGlEntries = await useGenerateGLEntries(docType, genPayload);

        if (newGlEntries && newGlEntries.length > 0) {
          currentGL = formatGeneratedGLRows(newGlEntries);
          updateState({ detailRowsGL: currentGL });
        } else {
          console.warn("RMIS GL generation failed. Upsert cancelled.");
          return;
        }
      }

      // Manual Generate GL button.
      if (action === "GenerateGL") {
        const genPayload = getFormattedPayload(currentGL);
        const newGlEntries = await useGenerateGLEntries(docType, genPayload);

        if (newGlEntries) {
          updateState({ detailRowsGL: formatGeneratedGLRows(newGlEntries) });
        }
        return;
      }

      // Save / upsert.
      if (action === "Upsert") {
        const rmisData = getFormattedPayload(currentGL);
        console.log("✅ RMIS Payload", rmisData);

        const response = await useTransactionUpsert(
          docType,
          rmisData,
          updateState,
          "rmisId",
          "rmisNo",
        );

        if (response) {
          const savedRmisId = response?.data?.[0]?.rmisId || response?.data?.[0]?.poId || documentID;
          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true, documentID: savedRmisId })
            : () => handleSaveAndPrint(savedRmisId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
          updateState({ isDocNoDisabled: true, isFetchDisabled: true });
        }
      }
    } catch (error) {
      console.error("Error in RMIS transaction flow:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  // ==========================
  // PRINT / CANCEL / POST / ATTACH
  // ==========================

  const handlePrint = async () => {
    if (!documentID) return;
    updateState({ showSignatoryModal: true });
  };

  const handleCancel = async () => {
    if (documentID && isOpenDocumentStatus(documentStatus)) {
      updateState({ showCancelModal: true });
    }
  };

  const handlePost = async () => {
    if (documentID && isOpenDocumentStatus(documentStatus)) {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (detailRows.length === 0) return;

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "Open",
      });
    }
  };

  // ==========================
  // HISTORY – URL PARAM HANDLING
  // ==========================

  const cleanUrl = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  const handleHistoryRowPick = useCallback((row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;
    fetchTranData(docNo, branchCode);
    setTopTab("details");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("rmisNo");
    const brCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && brCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode: brCode });
      cleanUrl();
    }
  }, [location.search, handleHistoryRowPick, cleanUrl]);

  const printData = {
    rmis_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  // ==========================
  // MODAL CLOSE HANDLERS
  // ==========================

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, documentNo: data.docNo });
  };

  const handleCloseCancel = async (confirmation) => {
  if (confirmation && isOpenDocumentStatus(documentStatus) && documentID) {
    const currentUserCode =
      user?.USER_CODE ||
      user?.userCode ||
      state.userCode ||
      "NSI";

    console.log("RMIS Cancel Payload:", {
      docType,
      documentID,
      userCode: currentUserCode,
      password: confirmation?.password,
      reason: confirmation?.reason,
    });

    const result = await useHandleCancel(
      docType,
      documentID,
      currentUserCode,
      confirmation.password,
      confirmation.reason,
      updateState,
    );

    if (result?.success) {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Cancelled successfully.",
      });

      await fetchTranData(documentNo, branchCode);
    }
  }

  updateState({ showCancelModal: false });
};

  const handleClosePost = async () => {
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(
        docType,
        documentID,
        userCode,
        updateState,
      );
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.message,
        });
      }
      await fetchTranData(documentNo, branchCode);
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
    // Just closing
    if (!selectedRC) {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
      return;
    }

    // Common mapping from modal row
    const { rcCode: selectedCode, rcName: selectedName } = selectedRC;

    if (rcLookupContext === "rc") {
      // Selecting Responsibility Center:
      //  - RC changes
      //  - Requesting Dept follows by default
      updateState({
        rcCode: selectedCode,
        rcName: selectedName,
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else if (rcLookupContext === "reqDept") {
      // Selecting Requesting Dept:
      //  - Only Requesting Dept changes
      //  - Responsibility Center stays as-is
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

  const handleCloseRcModalGL = (selectedRC) => {
    if (selectedRC && selectedRowIndex !== null) {
      handleDetailChangeGL(selectedRowIndex, "rcCode", selectedRC);
    }
    updateState({ showRcModal: false, selectedRowIndex: null, accountModalSource: null });
  };

  const handleCloseSlModalGL = (selectedSL) => {
    if (selectedSL && selectedRowIndex !== null) {
      handleDetailChangeGL(selectedRowIndex, "slCode", selectedSL);
    }
    updateState({ showSlModal: false, selectedRowIndex: null, accountModalSource: null });
  };

  const handlePOStatChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedJVType: selectedType });
  };

  const handleCloseCustModal = (selectedCustomer) => {
    if (selectedCustomer) {
      updateState({
        custCode: selectedCustomer.custCode || selectedCustomer.customerCode || "",
        custName: selectedCustomer.custName || selectedCustomer.customerName || "",
      });
    }
    updateState({ custModalOpen: false });
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
            : await useTopForexRate(code, header.rr_date);

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

  const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {
      const result = await useTopBillTermRow(billtermCode);
      if (result) {
        updateState({
          billtermCode: result.billtermCode,
          billtermName: result.billtermName,
          daysDue: result.daysDue,
        });
      }
    }
  };


  const rmisDetailColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "itemCode", label: "Item Code", width: 130 },
    { key: "itemName", label: "Item Description", width: 300 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 130 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
    { key: "amount", label: "Amount", width: 140 },
    { key: "lotNo", label: "Lot No", width: 130 },
    { key: "bbDate", label: "BB Date", width: 140 },
    { key: "itemStat", label: "Item Stat", width: 120 },
    { key: "whouseCode", label: "Warehouse", width: 160 },
    { key: "locCode", label: "Location", width: 160 },
    { key: "drAcctCode", label: "DR Acct", width: 130 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "qtyOnHand", label: "Qty on Hand", width: 130 },
    // { key: "mrsNo", label: "MRS No.", width: 130 },
    // { key: "mrsQty", label: "MRS Qty", width: 130 },
  ], []);

  const {
    getColumnStyle: getRMISDetailColumnStyle,
    getFrozenColumnStyle: getRMISDetailFrozenStyle,
    getOrderedColumns: getOrderedRMISDetailColumns,
    getSortedRows: getSortedRMISDetailRows,
    renderHeaderContextMenu: renderRMISDetailHeaderContextMenu,
    renderResizableHeader: renderRMISDetailHeader,
  } = useResizableTableColumns(rmisDetailColumnDefs);

  const orderedRMISDetailColumns = useMemo(
    () => getOrderedRMISDetailColumns(rmisDetailColumnDefs),
    [getOrderedRMISDetailColumns, rmisDetailColumnDefs]
  );

  const getRMISDetailFallbackWidth = useCallback(
    (key) => rmisDetailColumnDefs.find((column) => column.key === key)?.width || 120,
    [rmisDetailColumnDefs]
  );

  const getRMISDetailCellStyle = useCallback(
    (key, fallbackWidth) => ({
      ...getRMISDetailColumnStyle(key, fallbackWidth),
      ...getRMISDetailFrozenStyle(key, orderedRMISDetailColumns, fallbackWidth, { isHeader: false }),
    }),
    [getRMISDetailColumnStyle, getRMISDetailFrozenStyle, orderedRMISDetailColumns]
  );

  const rmisDetailSortRows = useMemo(
    () => detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    [detailRows]
  );

  const sortedRMISDetailRows = useMemo(
    () => getSortedRMISDetailRows(
      rmisDetailSortRows,
      (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "")
    ),
    [getSortedRMISDetailRows, rmisDetailSortRows]
  );

  const rmisEnterNextRowZeroClearFields = ["quantity", "unitCost", "mrsQty"];

  const rmisGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    // { key: "vatCode", label: "VAT Code", width: 120 },
    // { key: "vatName", label: "VAT Name", width: 220 },
    // { key: "atcCode", label: "ATC Code", width: 120 },
    // { key: "atcName", label: "ATC Name", width: 220 },
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
    getColumnStyle: getRMISGlColumnStyle,
    getFrozenColumnStyle: getRMISGlFrozenStyle,
    getOrderedColumns: getOrderedRMISGlColumns,
    getSortedRows: getSortedRMISGlRows,
    clearZeroValueOnFocus: clearRMISGlZeroOnFocus,
    focusNextRowInput: focusNextRMISGlRowInput,
    renderHeaderContextMenu: renderRMISGlHeaderContextMenu,
    renderResizableHeader: renderRMISGlHeader,
  } = useResizableTableColumns(rmisGlColumnDefs);

  const orderedRMISGlColumns = useMemo(
    () => getOrderedRMISGlColumns(rmisGlColumnDefs),
    [getOrderedRMISGlColumns, rmisGlColumnDefs]
  );

  const getRMISGlFallbackWidth = useCallback(
    (key) => rmisGlColumnDefs.find((column) => column.key === key)?.width || 120,
    [rmisGlColumnDefs]
  );

  const getRMISGlCellStyle = useCallback(
    (key, fallbackWidth) => ({
      ...getRMISGlColumnStyle(key, fallbackWidth),
      ...getRMISGlFrozenStyle(key, orderedRMISGlColumns, fallbackWidth, { isHeader: false }),
    }),
    [getRMISGlColumnStyle, getRMISGlFrozenStyle, orderedRMISGlColumns]
  );

  const sortedRMISGlRows = useMemo(
    () => getSortedRMISGlRows(
      (detailRowsGL || []).map((row, originalIndex) => ({ row, originalIndex })),
      (entry, sortKey) => (sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "")
    ),
    [getSortedRMISGlRows, detailRowsGL]
  );

  const rmisGlEnterNextRowZeroClearFields = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"];

  const handleAddBlankRow = (index) => {
    if (isFormDisabled) return;

    const blankRow = {
      itemCode: "",
      itemName: "",
      uomCode: "",
      quantity: formatNumber(0, 6),
      unitCost: formatNumber(0, 6),
      amount: formatNumber(0, 2),
      lotNo: "",
      bbDate: "",
      itemStat: "",
      whouseCode: state.WHcode || "",
      whouseName: state.WHname || "",
      locCode: state.locCode || "",
      locName: state.locName || "",
      drAcctCode: "",
      drAcctName: "",
      rcCode: rcCode || "",
      slCode: "",
      qtyOnHand: formatNumber(0, 6),
      mrsNo: "",
      mrsQty: formatNumber(0, 6),
      remarks: "",
    };

    const updatedRows = [...detailRows];
    updatedRows.splice(index + 1, 0, blankRow);
    updateState({ detailRows: updatedRows });
    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.quantity ?? r.qtyNeeded ?? 0) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
  };

  const renderRMISDetailCell = (columnKey, row, index) => {
    const columnWidth = getRMISDetailFallbackWidth(columnKey);
    const style = getRMISDetailCellStyle(columnKey, columnWidth);
    const rowLocked = isFormDisabled;

    const focusDetailCell = (field, nextIndex) => {
      const nextEl = document.getElementById(`${field}-${nextIndex}`);
      if (nextEl) {
        nextEl.focus();
        if (typeof nextEl.select === "function") nextEl.select();
      }
    };

    const focusNextDetailCell = (field) => {
      const maxRowIndex = Math.max((detailRows || []).length - 1, 0);
      const nextRowIndex = Math.min(maxRowIndex, index + 1);
      focusDetailCell(field, nextRowIndex);
    };

    const handleGridKeyDown = (e, field, options = {}) => {
      if (options.readOnly || options.disabled || rowLocked) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (options.commitOnEnter) {
          const formattedValue = formatNumber(
            parseFormattedNumber(e.target.value || 0),
            getRMISDetailNumericDecimals(field),
          );
          e.target.value = formattedValue;
          handleDetailChange(index, field, formattedValue, true);
        }
        focusNextDetailCell(field);
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

      e.preventDefault();
      if (e.key === "ArrowUp") focusDetailCell(field, Math.max(0, index - 1));
      if (e.key === "ArrowDown") focusDetailCell(field, Math.min((detailRows || []).length - 1, index + 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const editableColumns = orderedRMISDetailColumns
          .map((column) => column.key)
          .filter((key) => !["ln", "itemName", "uomCode", "amount", "qtyOnHand"].includes(key));
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
        value={options.value ?? row[field] ?? ""}
        readOnly={options.readOnly ?? rowLocked}
        disabled={options.disabled ?? false}
        onChange={(e) => handleDetailChange(index, field, e.target.value)}
        onKeyDown={(e) => handleGridKeyDown(e, field, options)}
      />
    );

    const numericInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
        value={options.value ?? row[field] ?? ""}
        readOnly={options.readOnly ?? rowLocked}
        disabled={options.disabled ?? false}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d*$/.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChange(index, field, sanitizedValue);
          }
        }}
        onFocus={(e) => {
          if ((options.readOnly ?? rowLocked) || (options.disabled ?? false)) return;
          if (rmisEnterNextRowZeroClearFields.includes(field) && parseFormattedNumber(e.target.value || 0) === 0) {
            handleDetailChange(index, field, "");
          }
        }}
        onBlur={(e) => {
          if ((options.readOnly ?? rowLocked) || (options.disabled ?? false)) return;
          handleDetailChange(index, field, e.target.value, true);
        }}
        onKeyDown={(e) => handleGridKeyDown(e, field, { ...options, commitOnEnter: true })}
      />
    );

    const lookupCell = (field, displayValue, onLookup, options = {}) => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input
            type="text"
            id={`${field}-${index}`}
            className="w-full global-tran-td-inputclass-ui pr-6"
            value={displayValue || ""}
            readOnly
            disabled={options.disabled ?? rowLocked}
            onClick={() => !rowLocked && onLookup?.()}
            onKeyDown={(e) => handleGridKeyDown(e, field, { readOnly: true })}
          />
          {!rowLocked && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute right-2 text-blue-600 cursor-pointer hover:text-blue-900"
              onClick={onLookup}
            />
          )}
        </div>
      </td>
    );

    const detailColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      itemCode: () => lookupCell("itemCode", row.itemCode || "", () => handleOpenRMLookup()),
      itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { readOnly: true })}</td>,
      uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: true })}</td>,
      quantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("quantity", { value: row.quantity ?? row.qtyNeeded ?? "0.000000" })}</td>,
      unitCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("unitCost", { value: row.unitCost ?? "0.000000" })}</td>,
      amount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("amount", { readOnly: true, value: row.amount ?? "0.00" })}</td>,
      lotNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("lotNo", { readOnly: rowLocked })}</td>,
      bbDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`bbDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={row.bbDate || ""} readOnly={rowLocked} disabled={rowLocked} onChange={(e) => handleDetailChange(index, "bbDate", e.target.value)} onKeyDown={(e) => handleGridKeyDown(e, "bbDate", { readOnly: rowLocked })} /></td>,
      itemStat: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemStat", { readOnly: rowLocked })}</td>,
      whouseCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("whouseCode", { readOnly: true, value: row.whouseName ?? row.whName ?? row.whouseCode ?? row.WHname ?? row.WHcode ?? "" })}</td>,
      locCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("locCode", { readOnly: true, value: row.locName ?? row.locCode ?? "" })}</td>,
      drAcctCode: () => lookupCell("drAcctCode", row.drAcctCode || "", () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "drAcct" })),
      rcCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcCode", { readOnly: rowLocked, value: row.rcCode || rcCode || "" })}</td>,
      slCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slCode", { readOnly: rowLocked })}</td>,
      qtyOnHand: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("qtyOnHand", { readOnly: true, value: row.qtyOnHand || "0.000000" })}</td>,
      mrsNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("mrsNo", { readOnly: rowLocked })}</td>,
      mrsQty: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{numericInput("mrsQty", { value: row.mrsQty || "0.000000" })}</td>,
    };

    return detailColumnRenderers[columnKey]?.() ?? (
      <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>
    );
  };

  const renderRMISGlCell = (columnKey, row, index) => {
    const columnWidth = getRMISGlFallbackWidth(columnKey);
    const style = getRMISGlCellStyle(columnKey, columnWidth);

    const focusNextGlCell = (field) => {
      focusNextRMISGlRowInput(index, field, {
        rows: detailRowsGL,
        zeroClearFields: rmisGlEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
      });
    };

    const modalHandlers = {
      acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
      rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }),
      slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
    };

    const textInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={options.readOnly ?? isFormDisabled}
        onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
          e.preventDefault();
          focusNextGlCell(field);
        }}
      />
    );

    const lookupCell = (field, options = {}) => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <div className="relative w-full">
          <input
            type="text"
            id={`${field}-${index}`}
            className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
            value={row[field] || ""}
            readOnly={options.readOnly ?? true}
            onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || isFormDisabled) return;
              e.preventDefault();
              focusNextGlCell(field);
            }}
          />
          {!isFormDisabled && (options.alwaysShowIcon || String(row[field] || "").trim()) && (
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={modalHandlers[field]}
            />
          )}
        </div>
      </td>
    );

    const amountInput = (field) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className="w-full global-tran-td-inputclass-ui text-right"
        value={row[field] || ""}
        readOnly={isFormDisabled}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
          if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChangeGL(index, field, sanitizedValue);
          }
        }}
        onFocus={(e) => clearRMISGlZeroOnFocus(e, {
          isEditable: !isFormDisabled,
          onClear: (value) => handleDetailChangeGL(index, field, value),
        })}
        onBlur={(e) => {
          if (isFormDisabled) return;
          handleBlurGL(index, field, e.target.value);
        }}
        onKeyDown={async (e) => {
          if (e.key !== "Enter" || isFormDisabled) return;
          e.preventDefault();
          await handleBlurGL(index, field, e.target.value, true);
          focusNextGlCell(field);
        }}
      />
    );

    const glColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      acctCode: () => lookupCell("acctCode", { alwaysShowIcon: true, readOnly: false }),
      rcCode: () => lookupCell("rcCode"),
      sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("sltypeCode")}</td>,
      slCode: () => lookupCell("slCode"),
      particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("particular")}</td>,
      vatCode: () => lookupCell("vatCode"),
      vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
      atcCode: () => lookupCell("atcCode"),
      atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("atcName")}</td>,
      debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debit")}</td>,
      credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("credit")}</td>,
      debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx1")}</td>,
      creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx1")}</td>,
      debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("debitFx2")}</td>,
      creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{amountInput("creditFx2")}</td>,
      slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slRefNo")}</td>,
      slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`slRefDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={row.slRefDate || ""} readOnly={isFormDisabled} onChange={(e) => handleDetailChangeGL(index, "slRefDate", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextGlCell("slRefDate"); } }} /></td>,
      remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks")}</td>,
    };

    return glColumnRenderers[columnKey]?.() ?? (
      <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>
    );
  };

  // ==========================
  // RENDER
  // ==========================

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          activeTopTab={topTab}
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
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          detailsRoute="/page/RMIS"
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          isSaveDisabled={
            isSaveDisabled ||
            isFormDisabled ||
            ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)
          }
          isResetDisabled={isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={
            !documentID ||
            displayStatus === "CANCELLED" ||
            displayStatus === "FINALIZED" ||
            displayStatus === "CLOSED"
          }
          isViewDocument={isViewDocument}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>



      {/* Page title and subheading */} 
      <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
        <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
          <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
        </div>
        <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
          <div>
            <p className="global-tran-headerstat-text-ui">Transaction Status</p>
            <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>{displayStatus}</h1>
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
          {/* Provision for Other Tabs */}
        </div>

          {/* RMIS Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="rmis_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  readOnly
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  lookupDisabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  onLookup={() =>
                    !(state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled) &&
                    updateState({ branchModalOpen: true })
                  }
                />

                <FieldRenderer
                  id="rmisNo"
                  label="RMIS No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled || isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onChange={(val) => updateState({ documentNo: val })}
                  onBlur={handlePrNoBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!state.isDocNoDisabled && !isFormDisabled) handlePrNoBlur();
                      document.getElementById("rr_date")?.focus();
                    }
                  }}
                />

                <FieldRenderer
                  id="rr_date"
                  label="RMIS Date"
                  type="date"
                  value={state.header?.rr_date || header.rr_date || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => {
                    setHeader((prev) => ({ ...prev, rr_date: val }));
                    updateState({ header: { ...(state.header || {}), rr_date: val } });
                  }}
                />

                <FieldRenderer
                  id="rmisRefNo"
                  label="RMIS Ref No."
                  type="text"
                  value={attention || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ attention: val })}
                />
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="rcName"
                  label="Responsibility Center"
                  type="lookup"
                  value={rcName || ""}
                  required
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

                <FieldRenderer
                  id="reqRcName"
                  label="Requesting Dept."
                  type="lookup"
                  value={reqRcName || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "reqDept",
                    })
                  }
                />

                <FieldRenderer
                  id="WHcode"
                  label="Warehouse"
                  type="lookup"
                  value={state.WHname || state.WHcode || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ warehouseLookupOpen: true })}
                />

                <FieldRenderer
                  id="locName"
                  label="Location"
                  type="lookup"
                  value={state.locName || state.locCode || ""}
                  required
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ locationLookupOpen: true })}
                />
              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="vendCode"
                  label="Employee Code"
                  type="lookup"
                  value={vendCode || vendCOde || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "payeeCode",
                    })
                  }
                />

                <FieldRenderer
                  id="vendName"
                  label="Employee Name"
                  type="text"
                  value={vendName || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ vendName: val })}
                />

                <FieldRenderer
                  id="custCode"
                  label="Customer Code"
                  type="lookup"
                  value={state.custCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && updateState({ custModalOpen: true })}
                />

                <FieldRenderer
                  id="custName"
                  label="Customer Name"
                  type="text"
                  value={state.custName || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ custName: val })}
                />
              </div>

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
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                    Remarks
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================
            RMIS DETAIL TABLE (DT1)
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Raw Material Detail
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedRMISDetailColumns.map((column) =>
                      renderRMISDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedRMISDetailColumns,
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
                  {sortedRMISDetailRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedRMISDetailColumns.map((column) =>
                        renderRMISDetailCell(column.key, row, originalIndex)
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
                              onClick={() => handleAddBlankRow(originalIndex)}
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
              {renderRMISDetailHeaderContextMenu?.()}
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="inline-block">
                <button
                  onClick={handleOpenRMLookup}
                  disabled={isFormDisabled || !rcCode || !reqRcCode || !state.WHcode}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled || !rcCode || !reqRcCode || !state.WHcode
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalQty" className="global-tran-tab-footer-total-label-ui">
                  Total Quantity:
                </label>
                <label htmlFor="TotalQty" className="global-tran-tab-footer-total-value-ui">
                  {totals.totalQtyNeeded}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
                onClick={() => updateState({ activeTab: "basic" })}
              >
                General Ledger
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleActivityOption("GenerateGL")}
                className="global-tran-button-generateGL"
                disabled={isLoading || detailRows.length === 0}
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
                    {orderedRMISGlColumns.map((column) =>
                      renderRMISGlHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedRMISGlColumns,
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
                  {sortedRMISGlRows.map(({ row, originalIndex }) => (
                    <tr key={`${row.acctCode || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
                      {orderedRMISGlColumns.map((column) =>
                        renderRMISGlCell(column.key, row, originalIndex)
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
              {renderRMISGlHeaderContextMenu?.()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() => handleAddRowGL()}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                  Total Debit ({glCurrDefault}):
                </label>
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                  {totalDebit}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                  Total Credit ({glCurrDefault}):
                </label>
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                  {totalCredit}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY TAB */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getRMISHistory"
          cacheKey={`RMIS:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="RMIS_Summary"
          branchCode={state.branchCode}
          startDate={null}
          endDate={null}
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
          onClose={handleCloseCustModal}
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

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{ branchCode, branchName, docType, documentTitle, fieldNo: "rmisNo" }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {rmLookupModalOpen && (
        <GlobalLookupModalv1
          isOpen={rmLookupModalOpen}
          data={globalLookupRow}
          btnCaption="Get Selected Raw Materials"
          title="RM Location Balance"
          endpoint={globalLookupHeader}
          onClose={handleCloseRMLookup}
          onCancel={() => updateState({ rmLookupModalOpen: false })}
          singleSelect={false}
        />
      )}


      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          onClose={handleCloseWarehouseLookup}
          filter="ActiveAll"
          branchCode={branchCode || ""}
        invType="RM"
        />
      )}

      {/* COA Account Modal */}
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

      {showSlModal && (
        <SLMastLookupModal
          isOpen={showSlModal}
          onClose={handleCloseSlModalGL}
        />
      )}

      {state.locationLookupOpen && (
        <LocationLookupModal
          isOpen={state.locationLookupOpen}
          onClose={handleCloseLocationLookup}
          filter="ActiveAll"
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default RMIS;
