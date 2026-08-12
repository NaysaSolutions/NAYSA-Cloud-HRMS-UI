import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate,useLocation  } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
  faMinus,
  faTrashAlt,
  faBoxOpen,
  faWarehouse,
  faQrcode,
  faTableCellsLarge,
} from "@fortawesome/free-solid-svg-icons";


// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import JobCodeLookupModal from "../../../Lookup/SearchJobCodesRef.jsx";
import ExcelBatchUploadModal from "../../../Lookup/SearchGlobalExcelBatchUpload.jsx";
import BarcodeQrReaderModal from "../../../Lookup/SearchGlobalQRBarCodeReader.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import GlobalApprovalStatus from "@/NAYSA Cloud/Approval/GlobalApprovalStatus.jsx";

// Configuration
import {  apiClient,fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import { useTopHSOption } from "@/NAYSA Cloud/Global/top1RefTable";



import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import {
  useSelectedHSColConfig,
  useSelectedIteBranchBalance
} from '@/NAYSA Cloud/Global/selectedData';

import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from '@/NAYSA Cloud/Global/datatable.jsx';


import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalvalidateRequiredFields,
  useSwalInfoAlert,
  useSwalProceedConfirm,
  useSwalHandleOpenSpecsModal,
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from "@/NAYSA Cloud/Components/Header";


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

const addDaysToDateValue = (value, days) => {
  const normalized = toDateInputValue(value);
  if (!normalized) return "";

  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  parsed.setDate(parsed.getDate() + days);

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");

  return `${mm}/${dd}/${yyyy}`;
};

const isDateBeforeDate = (value, baseValue) => {
  const normalizedValue = toDateInputValue(value);
  const normalizedBase = toDateInputValue(baseValue);

  return Boolean(normalizedValue && normalizedBase && normalizedValue < normalizedBase);
};

const resolveDecimalPlaces = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};



  const PR = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const headerDateNeededRef = useRef("");
  const suppressHeaderDateNeededPromptRef = useRef(true);
  const addTypeDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation(); 
  const [isViewDocument, setIsViewDocument] = useState(false);
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopHSDocRow } = useAuth();
  const [hsOptionRow, setHsOptionRow] = useState(null);
  const decQty = resolveDecimalPlaces(
    hsOptionRow?.itemDecqtyPur,
    hsOptionRow?.itemDecQtyPur,
    hsOptionRow?.item_decqty_pur,
    hsOptionRow?.ITEM_DECQTY_PUR,
    companyInfo?.itemDecqtyPur
  ) ?? 2;


      
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true" || p.get("viewOnly") === "Y") {
      setIsViewDocument(true);
    }
  }, []); 
  const isViewDocumentUrl = isViewDocument;
      
      
      
  const [topTab, setTopTab] = useState("details"); 
  const { resetFlag } = useReset();
  const docType = docTypes?.PR || "PR";
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';
  const defaultHeaderDateNeeded = addDaysToDateValue(useGetCurrentDayV2(), 1);

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
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentDate:useGetCurrentDayV2(),  
    dateNeeded:defaultHeaderDateNeeded,  
    headerDateNeeded:defaultHeaderDateNeeded,  
    documentNo: "",
    documentStatus: "",
    status: "",
    appLevel:0,
    originalDocStatus:"O",

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,
    showAllTranDocNo:false,
    itemSingleSelect:false,
    itemLookupEndPoint:"",
    selectedDocType:"",
    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.BranchName||"",
    reqRcCode: "",
    reqRcName: "",
    currCode: "",
    currName: "",
    attention: "",

    // Currency information (not used by sproc_PHP_PR but kept for UI consistency)
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info (aligned to PR header fields)
    tblFieldArray :[],
    sviTypes :[],
    prTranTypes: [],
    prTypes: [],
    selectedPrTranType: "",
    selectedPrType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "", // responsibility center name for display
    requestDept: "",
    refPrNo1: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    prCancelled: "",
    userCode:currentUserRow?.userCode||"",
    showScannerOpen:false,

    // Detail lines (PR dt1)
    detailRows: [],
    detailRowsApp: [],
    globalLookupRow:[],
    globalLookupHeader:[],


    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showUploadModal:false,
    showSignatoryModal: false,
    showPostModal: false,
    showApprovalStatusModal: false,
    showJobCodesModal:false,
    rcLookupModalOpen: false,
    rcLookupContext: "", 
    itemLookupModalOpen: false,
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

    glCurrMode,
    glCurrDefault,


    // Header
    branchCode,
    branchName,
    rcCode,
    rcName,
    reqRcCode,
    reqRcName,

    currCode,
    userCode,
    tblFieldArray,
    prTranTypes,
    prTypes,
    selectedPrTranType,
    selectedPrType,
    documentDate,
    headerDateNeeded,
    refPrNo1,
    refPrNo2,
    remarks,
    noReprints,
    showAllTranDocNo,
    showJobCodesModal,
    itemSingleSelect,
    selectedDocType,
    selectedRowIndex,
    itemLookupEndPoint,

    
    detailRows,
    detailRowsApp,
    globalLookupRow,
    globalLookupHeader,

    branchModalOpen,
    custModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    showUploadModal,
    showApprovalStatusModal,
    showScannerOpen,

    rcLookupModalOpen,
    rcLookupContext,
    itemLookupModalOpen,
  } = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);

  const isJobOrder = selectedPrTranType === "PR02";
  const [focusedCell, setFocusedCell] = useState(null);
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
  const [totals, setTotals] = useState({
    totalQtyNeeded: "",
  });


  const displayStatus = status || "OPEN";
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const maxApprovalLevel = Number(currentUserRow?.prMaxAppLevel || 0);
  const currentApprovalLevel = Number(appLevel ?? 0);
  const approvalStatusHiddenStatuses = ["CANCELLED", "POSTED", "FINALIZED" ];
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



  const prDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "prStatus", label: "PR Status", width: 100 },
    { key: "invType", label: "Type", width: 80 },
    { key: "serviceCode", label: "Job Code", width: 120 },
    { key: "serviceName", label: "Scope of Work", width: 300 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Name", width: 300 },
    { key: "itemSpecs", label: "Specification", width: 300 },
    { key: "uomCode", label: "UOM", width: 80 },
    { key: "qtyOnHand", label: "Qty on Hand", width: 130 },
    { key: "qtyNeeded", label: "Qty Needed", width: 130 },
    { key: "dateNeeded", label: "Date Needed", width: 140 },
    { key: "poQty", label: "PO Qty", width: 120 },
    { key: "rrQty", label: "RR Qty", width: 120 },
    { key: "joNo", label: "JO No.", width: 120 },
  ];

  const {
    autoResizeRows: autoResizePrDetailRows,
    getColumnStyle: getPrDetailColumnStyle,
    getFrozenColumnStyle: getPrDetailFrozenStyle,
    getOrderedColumns: getOrderedPrDetailColumns,
    getSortedRows: getSortedPrDetailRows,
    clearAllSorting: clearPrDetailSorting,
    clearZeroValueOnFocus: clearPrDetailZeroOnFocus,
    focusNextRowInput: focusNextPrDetailRowInput,
    renderHeaderContextMenu: renderPrDetailHeaderContextMenu,
    renderResizableHeader: renderPrDetailHeader,
  } = useResizableTableColumns(prDetailColumnDefs);

  const orderedPrDetailColumns = getOrderedPrDetailColumns(prDetailColumnDefs);
  const visiblePrDetailColumns = orderedPrDetailColumns.filter((column) => {
    if (["serviceCode", "serviceName", "joNo"].includes(column.key)) return isJobOrder;
    if (["itemCode", "itemName", "qtyOnHand", "poQty", "rrQty"].includes(column.key)) return !isJobOrder;
    return true;
  });
  const getPrDetailFallbackWidth = (key) => prDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getPrDetailCellStyle = (key, fallbackWidth) => ({
    ...getPrDetailColumnStyle(key, fallbackWidth),
    ...getPrDetailFrozenStyle(key, visiblePrDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedPrDetailRows = getSortedPrDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const prDetailEnterNextRowZeroClearFields = ["qtyNeeded", "uomQty2"];

 const updateTotalsDisplay = (qtyNeeded) => {
  setTotals({ totalQtyNeeded: formatNumber(qtyNeeded, decQty) });
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

  

const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    handleReset();
    loadCompanyData();
    isInitialMount.current = false;
  }
}, []);



  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  useEffect(() => {
    if (suppressHeaderDateNeededPromptRef.current) {
      suppressHeaderDateNeededPromptRef.current = false;

      if ((headerDateNeeded || "") === headerDateNeededRef.current) {
        return;
      }
    }

    const currentValue = headerDateNeeded || "";

    if (currentValue === headerDateNeededRef.current) return;

    const isCompleteOrCleared =
      currentValue === "" || /^\d{2}\/\d{2}\/\d{4}$/.test(currentValue);

    if (!isCompleteOrCleared) return;

    if (currentValue && isDateBeforeDate(currentValue, documentDate)) {
      const fallbackDate = documentDate || useGetCurrentDayV2();
      const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;
      const updatedRows = (sourceRows || []).map((row) => ({
        ...row,
        dateNeeded: fallbackDate,
      }));

      detailRowsRef.current = updatedRows;
      headerDateNeededRef.current = fallbackDate;
      suppressHeaderDateNeededPromptRef.current = true;
      updateState({
        headerDateNeeded: fallbackDate,
        dateNeeded: fallbackDate,
        detailRows: updatedRows,
      });
      useSwalErrorAlert(
        "Invalid Date Needed",
        "Date Needed cannot be earlier than the PR Date."
      );
      return;
    }

    const run = async () => {
      const nextState = { dateNeeded: currentValue };
      const sourceRows = detailRowsRef.current?.length ? detailRowsRef.current : detailRows;

      if ((sourceRows?.length || 0) > 0) {
        const result = await useSwalProceedConfirm(
          "Apply Date Needed changes?",
          "This will copy the header Delivery Date to all item details. Do you want to continue?",
          "Yes"
        );

        if (result?.isConfirmed) {
          const updatedRows = (sourceRows || []).map((row) => ({
            ...row,
            dateNeeded: currentValue,
          }));

          detailRowsRef.current = updatedRows;
          nextState.detailRows = updatedRows;
        }
      }

      headerDateNeededRef.current = currentValue;
      updateState(nextState);
    };

    run();
  }, [headerDateNeeded]);

  useEffect(() => {
    if (!documentDate) return;

    if (headerDateNeeded && !isDateBeforeDate(headerDateNeeded, documentDate)) return;

    const nextDateNeeded = addDaysToDateValue(documentDate, 1) || documentDate;
    headerDateNeededRef.current = nextDateNeeded;
    suppressHeaderDateNeededPromptRef.current = true;

    updateState({
      headerDateNeeded: nextDateNeeded,
      dateNeeded: nextDateNeeded,
    });
  }, [documentDate]);



  
  useEffect(() => {
  if (!refsLoaded) return;

  // 1. Fetch PR dropdown data synchronously
  const prTranDrop = getAllDropDown("PRTRAN_TYPE", docType);
  const prTypeDrop = getAllDropDown("PR_TYPE", docType);

  // 2. Prepare a single update object
  const updates = {};

  if (prTranDrop.length > 0) {
    updates.prTranTypes = prTranDrop;
    updates.selectedPrTranType = prTranDrop[0]?.DROPDOWN_CODE ?? "";
  }

  if (prTypeDrop.length > 0) {
    updates.prTypes = prTypeDrop;
    updates.selectedPrType = prTypeDrop[0]?.DROPDOWN_CODE ?? "";
  }

  // 3. Batch update the state
  if (Object.keys(updates).length > 0) {
    updateState(updates);
  }
}, [docType, refsLoaded]);


  // ==========================
  // INITIAL LOAD / RESET
  // ==========================

  const handleReset = () => {

    clearPrDetailSorting();
    loadCompanyData();
    const today = useGetCurrentDayV2();
    const nextDateNeeded = addDaysToDateValue(today, 1);
    headerDateNeededRef.current = nextDateNeeded;
    suppressHeaderDateNeededPromptRef.current = true;

    
    updateState({
      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      headerDateNeeded:nextDateNeeded,
      documentDate:today,
      documentStatus:"O",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      dateNeeded: nextDateNeeded,
      selectedPrTranType:"PR01",
      selectedPrType:"PR11",
      
      refPrNo1: "",
      refPrNo2: "",
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
      status: "",
      originalDocStatus:"O",
      noReprints: "",
      prCancelled: "",
      detailRows: [],
      detailRowsApp: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      itemLookupModalOpen: false,
      showApprovalStatusModal: false,
    });

    updateTotalsDisplay(0);
  };




  
    const loadCompanyData = async () => {
            updateState({ isLoading: true });
          
            try {
              const hdtblcol_result = await useFieldLenghtCheck(
                "pr_hd,pr_dt1"
              );
          
              if (hdtblcol_result) {
                updateState({ tblFieldArray: hdtblcol_result });
              }

              const hsOption = await useTopHSOption();
              if (hsOption) {
                setHsOptionRow(hsOption);
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
    curr = currCode
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

  // ==========================
  // FETCH (GET) – PR HEADER + DT1
  // ==========================



const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({
      documentNo:'',
      documentID: '',
      detailRowsApp: [],
      showApprovalStatusModal: false,
      isDocNoDisabled: false,
      isFetchDisabled: false
    });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"prNo",direction);

   
    if (!data?.prId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      qtyOnHand: formatNumber(item.qtyOnHand,decQty),
      qtyAlloc: formatNumber(item.qtyAlloc,decQty),
      qtyNeeded: formatNumber(item.qtyNeeded,decQty),
      poQty: formatNumber(item.poQty,decQty),
      rrQty: formatNumber(item.rrQty,decQty),
      dateNeeded: item.dateNeeded ? useformatToDatev2(item.dateNeeded) : "",
    }));
    const retrievedApprovalRows = Array.isArray(data.dtApp)
      ? data.dtApp
      : data.dtApp
        ? [data.dtApp]
        : [];

   

  
    // Update state with fetched data

    const fetchedDateNeeded = useformatToDatev2(data.dateNeeded);
    headerDateNeededRef.current = fetchedDateNeeded;
    suppressHeaderDateNeededPromptRef.current = true;

    updateState({

      documentStatus: data.prHStatus,
      status: data.prStatus,
      appLevel: data.appLevel,
      originalDocStatus:data.prHStatus,
      documentID: data.prId,
      documentNo: data.prNo,
      branchCode: data.branchCode,
      BranchName:data.branchName,
      documentDate: useformatToDatev2(data.prDate),
      headerDateNeeded:fetchedDateNeeded,
      dateNeeded:fetchedDateNeeded,
      rcCode: data.rcCode,
      rcName: data.rcName,
      reqRcCode: data.reqRcCode,
      reqRcName: data.reqRcName,
      selectedPrTranType: data.prTranType,
      selectedPrType: data.prType,
      refPrNo1: data.refPrNo1,
      refPrNo2: data.refPrNo2,
      remarks: data.remarks,
      prCancelled: data.prCancelled ,
      noReprints: data.noReprints,
      detailRows: retrievedDetailRows,
      detailRowsApp: retrievedApprovalRows,

      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

   
    updateTotals(retrievedDetailRows);

  } catch (error) {
    console.error("Error fetching transaction data:", error);
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false });
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
  const docNo = params.get("prNo");
  const branchCode = params.get("branchCode");

  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);





const handleCloseJobCodesLookup = (selectedItems) => {
  if (selectedItems) {
   handleDetailChange(selectedRowIndex, 'serviceCode', selectedItems, false)
  }
  updateState({ showJobCodesModal: false });
};


const getItemLookupConfig = (lookupDocType) => {
  const normalizedDocType = String(lookupDocType || "").toUpperCase();
  const invType = normalizedDocType.endsWith("FG")
    ? "FG"
    : normalizedDocType.endsWith("RM")
      ? "RM"
      : "MS";

  return {
    invType,
    endpoint: `getInvLookup${invType}`,
  };
};

const applyBranchBalanceToItems = async (items, invType) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const balancePayload = {
    branchCode,
    prNo: documentNo || "",
    prId: documentID || "",
    userCode,
    dt1: items.map((item, index) => ({
      lnNo: index + 1,
      invType,
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      uomCode: item?.uomCode || "",
    })),
  };

  const balanceRows = await useSelectedIteBranchBalance(balancePayload);
  if (!Array.isArray(balanceRows)) {
    return items.map((item) => ({ ...item, qtyHand: 0 }));
  }

  return items.map((item) => {
    const match = balanceRows.find(
      (balance) =>
        balance?.itemCode === item?.itemCode &&
        balance?.invType === invType
    );

    return {
      ...item,
      qtyHand: match ? match.quantity : 0,
    };
  });
};

const handleCloseItemLookup = async (selectedItems) => {
  if (!selectedItems) {
    updateState({ itemLookupModalOpen: false });
    return;
  }

  const itemsArray = Array.isArray(selectedItems.records)
    ? selectedItems.records
    : selectedItems.records ? [selectedItems.records] : [];

  if (itemsArray.length === 0) {
    updateState({ itemLookupModalOpen: false });
    return;
  }

  const { invType: lookupInvType } = getItemLookupConfig(selectedDocType);
  const isDuplicateLookupItem = (newItem) =>
    detailRows.some(
      (existingRow) =>
        existingRow.itemCode === newItem.itemCode &&
        existingRow.invType === lookupInvType
    );

  if (itemSingleSelect) {
    const singleItem = itemsArray[0];
    const isDuplicate = isDuplicateLookupItem(singleItem);
    const applySingleItem = async () => {
      updateState({ isLoading: true });
      const [itemWithBalance] = await applyBranchBalanceToItems([singleItem], lookupInvType);
      handleDetailChange(selectedRowIndex, 'itemCode', itemWithBalance || singleItem, false);
      updateState({
        itemSingleSelect: false,
        itemLookupModalOpen: false,
        isLoading: false,
      });
    };

    if (isDuplicate) {
      useSwalProceedConfirm(
        "Duplicate Item Detected",
        "This item is already in the list. Do you want to select it anyway?",
        "Yes, Cancel",
        "Cancel"
      ).then(async (result) => {
        if (result.isConfirmed) {
          await applySingleItem();
        }
      });
    } else {
      await applySingleItem();
    }
    return;
  }



  // Multiple Item Selection
  const duplicateItems = itemsArray.filter(newItem => 
    isDuplicateLookupItem(newItem)
  );

  const processAddition = async (itemsToAdd) => {
    updateState({ isLoading: true });
    const itemsWithBalance = await applyBranchBalanceToItems(itemsToAdd, lookupInvType);
    const newRows = itemsWithBalance.map((item) => ({
      invType: lookupInvType,
      groupId: "",
      prStatus: "O",
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      uomCode: item?.uomCode || "",
      qtyOnHand: formatNumber(item?.qtyHand ?? 0, decQty),
      qtyAlloc: formatNumber(0, decQty),
      qtyNeeded: formatNumber(0, decQty),
      uomCode2: item?.uomCode || "",
      uomQty2: formatNumber(0, decQty),
      dateNeeded: headerDateNeeded,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: formatNumber(0, decQty),
      rrQty: formatNumber(0, decQty),
    }));

    updateState({
      detailRows: [...detailRows, ...newRows],
      itemLookupModalOpen: false,
      itemSingleSelect: false,
      isLoading: false,
    });
  };

  if (duplicateItems.length > 0) {
    useSwalProceedConfirm(
      "Duplicate Items Detected",
      "Some items are already in the list. Do you want to add them anyway?",
      "Yes, Cancel",
      "Cancel"
    ).then(async (result) => {
      if (result.isConfirmed) {
        await processAddition(itemsArray);
      } else {
        const uniqueOnly = itemsArray.filter(newItem => 
          !isDuplicateLookupItem(newItem)
        );
        
        if (uniqueOnly.length > 0) {
          await processAddition(uniqueOnly);
        } else {
          updateState({ itemLookupModalOpen: false });
        }
      }
    });
  } else {
    await processAddition(itemsArray);
  }
};



const handleAddBlankRow = (index) => {

  if (documentStatus !=="O"){
        return;
      }
  const blankRow = {
    invType: isJobOrder ? "JO" : "",
    groupId: "", 
    prStatus: "O",
    itemCode: "",
    itemName: "",
    uomCode: isJobOrder ? "Lot" : "",
    qtyOnHand:formatNumber(0,decQty),
    qtyNeeded: formatNumber(0,decQty),
    uomCode2: "",
    uomQty2: formatNumber(0,decQty),
    dateNeeded: headerDateNeeded,
    itemSpecs: "",
    serviceCode: "",
    serviceName: "",
    poQty: formatNumber(0,decQty),
    rrQty: formatNumber(0,decQty),
    joNo: "",
  };

  const updatedRows = [...detailRows];
  updatedRows.splice(index + 1, 0, blankRow); 
  updateState({
    detailRows: updatedRows
  });
};



  // ==========================
  // HEADER EVENTS
  // ==========================

 

  const handlePrTranTypeChange = (e) => {
    updateState({ selectedPrTranType: e.target.value });
  };

  const handlePrTypeChange = (e) => {
    updateState({ selectedPrType: e.target.value });
  };

  // ==========================
  // DETAIL (PR_DT1) HANDLERS
  // ==========================

  // When user clicks the "Add Line" button
  // When user clicks the "Add Line" button
  const handleAddRowClick = async () => {

      if (documentStatus !=="O"){
        return;
      }

      const fieldsToCheck = {
          "Header : Responsibility Center": rcCode,
          "Header : Requesting Department": reqRcCode,
          "Header : Remarks": remarks,
        };
        const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
        if (!isValid) return;
        if (isFormDisabled) return;

    if (isJobOrder) {
      handleSelectTypeAndAddRow("JO"); 
      return;
    }
    setShowTypeDropdown((prev) => !prev);
  };

  // When user picks FG / MS / RM
  const handleSelectTypeAndAddRow = (typeCode) => {
 
    const newRow = {
      invType: typeCode,
      groupId: "",
      prStatus: "O",
      itemCode: "",
      serviceCode:"",
      serviceName:"",
      itemName: "",
      uomCode: isJobOrder ? "Lot" : "",
      qtyOnHand: formatNumber(0, decQty),
      qtyAlloc: formatNumber(0, decQty),
      qtyNeeded: formatNumber(0, decQty),
      uomCode2: "",
      uomQty2: formatNumber(0, decQty),
      dateNeeded: headerDateNeeded,
      itemSpecs: "",
      poQty: formatNumber(0, decQty),
      rrQty: formatNumber(0, decQty),
      joNo:"",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
  };

const handleAddByQR = () => {
  setShowTypeDropdown(false);
  updateState({showScannerOpen:true})
};



const handleScanItem = async (scannedValue) => {
  try {
    // sample only
    // replace this with your actual lookup logic / API call
    // scannedValue can be barcode, qr text, itemCode, etc.

    const matchedItem = itemList?.find(
      (x) =>
        x.itemCode === scannedValue ||
        x.barcode === scannedValue ||
        x.qrCode === scannedValue
    );

    if (!matchedItem) {
      useSwalErrorAlert(
        "Item not found",
        `No item matched the scanned value: ${scannedValue}`
      );
      return;
    }

    const newRow = {
      invType: typeCode,
      groupId: "",
      prStatus: "O",
      itemCode: matchedItem.itemCode || "",
      serviceCode: matchedItem.serviceCode || "",
      serviceName: matchedItem.serviceName || "",
      itemName: matchedItem.itemName || "",
      uomCode: matchedItem.uomCode || (isJobOrder ? "Lot" : ""),
      qtyOnHand: formatNumber(matchedItem.qtyOnHand ?? 0, decQty),
      qtyAlloc: formatNumber(matchedItem.qtyAlloc ?? 0, decQty),
      qtyNeeded: formatNumber(0, decQty),
      uomCode2: matchedItem.uomCode2 || "",
      uomQty2: formatNumber(matchedItem.uomQty2 ?? 0, decQty),
      dateNeeded: headerDateNeeded,
      itemSpecs: matchedItem.itemSpecs || "",
      poQty: formatNumber(matchedItem.poQuantity, decQty),
      rrQty: formatNumber(matchedItem.rrQuantity, decQty),
      joNo: "",
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );

    updateTotalsDisplay(totalQty);
    updateState({showScannerOpen:false})
  } catch (error) {
    console.error("Scan item error:", error);
    useSwalErrorAlert("Scan Error", "Unable to process scanned item.");
  }
};


  // const handleOpenItemLookup = () => {
  //   if (isFormDisabled) return;
  //   setShowTypeDropdown(false);
  //   updateState({ itemLookupModalOpen: true });
  // };

  
  const handleAddItem = async (index,invType) => {

      updateState({ selectedRowIndex: index,
                    itemSingleSelect:true,
      }); 
      await handleOpenItemLookup(true,invType);
      return;
  };


  
    const handleOpenItemLookup = async (itemSingleSelect, docType) => {
      try {
        const { endpoint: itemLookupEndPoint } = getItemLookupConfig(docType);
  
        setShowTypeDropdown(false);
        updateState({ isLoading: true,
                      itemSingleSelect : itemSingleSelect,
                      itemLookupEndPoint,
                      selectedDocType: docType});
    
        
    
        updateState({ 
                      // globalLookupRow: custData,
                      // globalLookupHeader:colConfig,
                      itemLookupModalOpen: true,
                      isLoading: false
          });
    
  
      } catch (error) {
        console.log(error)
        useSwalInfoAlert("MS Master Data" ,"Error in Fetching Record")
        updateState({ 
            globalLookupRow: [] ,
            globalLookupHeader: [],
            isLoading: false  });
      }
    };
    
    









const handleDeleteRow = (index) => {
  const row = detailRows[index];

  if (documentStatus !== "O") {
    return;
  }

  const poQty = parseFloat(row?.poQty) || 0;
  if (poQty > 0 || row?.prStatus !== "O") {
    Swal.fire({
      icon: "warning",
      title: "Action Restricted",
      text: "Items with a PO reference or a status other than 'Open' cannot be deleted.",
      timer: 2500,
      showConfirmButton: false,
      customClass: {
        popup: "rounded-xl shadow-2xl",
      },
    });
    return;
  }

  if ((detailRows?.length || 0) <= 1) {
    Swal.fire({
      icon: "warning",
      title: "Cannot Delete",
      text: "At least one item row must remain.",
      timer: 2200,
      showConfirmButton: false,
      customClass: {
        popup: "rounded-xl shadow-2xl",
      },
    });
    return;
  }

  const updatedRows = [...detailRows];
  updatedRows.splice(index, 1);

  updateState({ detailRows: updatedRows });

  const totalQty = updatedRows.reduce(
    (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
    0
  );
  updateTotalsDisplay(totalQty);
};



  const updateTotals = (rows) => {
  let totalQuantity = 0;
  rows.forEach(row => {
    const item_Quantity = parseFormattedNumber(row.qtyNeeded || 0) || 0
    totalQuantity+= item_Quantity;
  });
    updateTotalsDisplay (totalQuantity);
};


  


const finalizeUpdate = (index, row) => {
  const updatedRows = [...(detailRowsRef.current || detailRows || [])];
  updatedRows[index] = row;

  detailRowsRef.current = updatedRows;
  updateState({ detailRows: updatedRows });
  const totalQty = updatedRows.reduce(
    (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
    0
  );
  updateTotalsDisplay(totalQty);
};



const handleDetailChange = (index, field, value, runCalculations = false) => {
  const updatedRows = [...(detailRowsRef.current || detailRows || [])];
  const row = { ...(updatedRows[index] || {}) };
  const numericFields = ["qtyOnHand", "qtyAlloc", "qtyNeeded", "uomQty2", "poQty", "rrQty"];

  // --- 1. Handle Numeric Fields ---
  if (numericFields.includes(field)) {
    const raw = value === null || value === undefined ? "" : String(value);
    const sanitized = field === "qtyNeeded"
      ? raw.replace(/[^0-9.]/g, "")
      : raw.replace(/[^0-9.-]/g, ""); 

    if (runCalculations) {
      let num = parseFormattedNumber(sanitized);
      if (field === "qtyNeeded" && Number.isFinite(num) && num < 0) num = 0;
      row[field] = Number.isFinite(num)
        ? formatNumber(num, decQty)
        : "";
    } else {
      row[field] = sanitized;
    }
  }

  if (field === 'itemCode') {
    row["itemCode"] = value.itemCode;
    row["itemName"] = value.itemName;
    row["uomCode"] = value.uomCode;
    row["qtyOnHand"] = formatNumber(value.qtyHand, decQty);
  }



if (field === "dateNeeded") {
  if (value && isDateBeforeDate(value, documentDate)) {
    row.dateNeeded = documentDate || useGetCurrentDayV2();
    useSwalErrorAlert(
      "Invalid Date Needed",
      "Date Needed cannot be earlier than the PR Date."
    );
  } else {
    row.dateNeeded = value;
  }
} else if (field !== 'itemCode' && field !== 'serviceCode' && !numericFields.includes(field) && field !== 'prStatus') {
  row[field] = value;
}


if (field === 'serviceCode') {
  row["serviceCode"] = value?.jobCode || "";
  row["serviceName"] = value?.jobName || "";
}



if (field === 'prStatus') {
  if (value === "X" || value === "C") {
    const isCancel = value === "X";
    const actionText = isCancel ? "CANCEL" : "CLOSE";
    
   useSwalProceedConfirm(
      `Confirm Line ${isCancel ? "Cancellation" : "Closing"}?`, 
      isCancel
        ? "Are you sure you want to cancel this item? Once cancelled, it cannot be edited. You need to add the item again if needed."
        : `Are you sure you want to ${actionText} this specific item? This action is permanent for this line and cannot be undone.`,
      isCancel ? "Yes, Cancel" : undefined,
      "Cancel"
    ).then((result) => {
      if (result.isConfirmed) {
        if (isCancel) {
          row["qtyOnHand"] = formatNumber(0, decQty);
          row["qtyNeeded"] = formatNumber(0, decQty);
          row["prStatus"] = "X";
        } else {
          row["prStatus"] = "C";
        }
        finalizeUpdate(index, row);
      } else {
        row["prStatus"] = "O";
        finalizeUpdate(index, row);
      }
    });
    return; 
  } else {
    row["prStatus"] = value || "O";
  }
}
  finalizeUpdate(index, row);
};



  const handleOpenSpecsModal = (index) => {
  const row = detailRows[index];

  Swal.fire({
    title: 'Specifications',
    input: 'textarea',
    inputValue: row.itemSpecs || '',
    inputPlaceholder: `Enter remarks for ${row.itemName || 'this item'}...`,
    showCancelButton: true,
    confirmButtonText: 'Save',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#64748b',
    reverseButtons: true, // Optional: puts 'Save' on the right, 'Cancel' on the left
    inputAttributes: {
      'aria-label': 'Type your specifications here',
      'style': 'height: 150px; font-size: 0.875rem;' // Optional: consistent sizing
    },
    customClass: {
      actions: 'w-full px-6 gap-2', // Containers for buttons
      confirmButton: 'flex-1 py-2', // Forces Save to take half width
      cancelButton: 'flex-1 py-2',  // Forces Cancel to take half width
      input: 'focus:ring-blue-500'   
    },
    buttonsStyling: true, 
  }).then((result) => {
    if (result.isConfirmed) {
      handleDetailChange(index, "itemSpecs", result.value);
    }
  });
};




  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (mode) => {
    if (originalDocStatus !=="O" || detailRows.length===0 ) {
      return;
    }

 
    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        selectedPrTranType,
        selectedPrType,
        refPrNo1,
        refPrNo2,
        cutoffCode,
        rcCode,
        reqRcCode,
        reqRcName,
        headerDateNeeded,
        remarks,
        prCancelled,
        detailRows,
        documentStatus,
      } = state;

      let rowsForSave = detailRows || [];
      const headerStatusForSave = documentStatus || "O";

      if (["X", "C"].includes(headerStatusForSave)) {
        const isCancel = headerStatusForSave === "X";
        const actionWord = isCancel ? "CANCEL" : "CLOSE";

        const result = await useSwalProceedConfirm(
          `Confirm Full Document ${isCancel ? "Cancellation" : "Closing"}?`,
          `Are you sure you want to ${actionWord} this entire PR? This action is permanent and will affect all open line items.`,
          "Yes"
        );

        if (!result?.isConfirmed) {
          updateState({ documentStatus: "O" });
          return;
        }

        if (isCancel) {
          updateState({ showCancelModal: true, documentStatus: "O" });
          return;
        }

        rowsForSave = rowsForSave.map((row) =>
          row.prStatus === "O" || !row.prStatus
            ? { ...row, prStatus: "C" }
            : row
        );
        updateState({ detailRows: rowsForSave });
      }


      const normalizedDetailRows = rowsForSave.map((row) => ({
        ...row,
        prStatus: row.prStatus || "O",
      }));
      const hasOpenDetail = normalizedDetailRows.some(
        (row) => String(row.prStatus || "O").toUpperCase() === "O"
      );
      const finalHeaderPrStatus = hasOpenDetail ? "O" : "C";

      

      const prData = {
        branchCode: branchCode,
        prNo:  documentNo || "",
        prId: documentID || "",
        prDate: mode === "onCopy" ? useGetCurrentDayV2() : documentDate,
        cutoffCode: cutoffCode || "",
        rcCode: rcCode || "",
        reqRcCode: reqRcCode || "",
        reqRcName: reqRcName || "",
        prTranType: selectedPrTranType,
        dateNeeded: headerDateNeeded || null,
        prType: selectedPrType,
        refPrNo1: refPrNo1 || "",
        refPrNo2: refPrNo2 || "",
        remarks: remarks || "",
        prStatus: finalHeaderPrStatus,
        userCode: userCode,
        // ⬇️ THIS PART guarantees ALL CURRENT detailRows (including newly added) are sent
        dt1: rowsForSave.map((row, index) => ({
          prId: documentID || "",
          groupId: row.groupId || "",       
          invType: row.invType || "",
          prStatus:row.prStatus|| "O",
          lnNo: index + 1,
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          uomCode: row.uomCode || "",
          qtyOnHand: parseFormattedNumber(row.qtyOnHand || 0),
          qtyAlloc: parseFormattedNumber(row.qtyAlloc || 0),
          qtyNeeded: parseFormattedNumber(row.qtyNeeded || 0),
          uomCode2: row.uomCode2 || "",
          uomQty2: parseFormattedNumber(row.uomQty2 || 0),
          dateNeeded: row.dateNeeded || null,
          itemSpecs: row.itemSpecs || "",
          serviceCode: row.serviceCode || "",
          serviceName: row.serviceName || "",
          joNo: row.joNo || "",
          poQty: parseFormattedNumber(row.poQty || 0),
          rrQty: parseFormattedNumber(row.rrQty || 0)
        
        })),
      };


    
      if (mode === "onCopy") {
        try {
          const response = await useSelectedIteBranchBalance(prData);
          if (response) {
            return response;
          }
        } catch (error) {
          console.error(error);
        } finally {
          updateState({ isLoading: false });
        }
        return [];
      }





      const response = await useTransactionUpsert(docType,prData,updateState,"prId","prNo");

      if (response) {
          const responseDocNo =  response.data[0].prNo;
          const responseDocId =  response.data[0].prId;

          await fetchTranData(responseDocNo,branchCode);


    
        const isZero = Number(noReprints) === 0;
                        const onSaveAndPrint =
                          isZero
                            ? () => updateState({ showSignatoryModal: true })                  
                            : () => handleSaveAndPrint(responseDocId); 
                        useSwalshowSaveSuccessDialog(
                          handleReset,          
                          onSaveAndPrint       
                        );

      }

      updateState({ isDocNoDisabled: true, isFetchDisabled: true });
    } catch (error) {
      console.error("Error during transaction upsert:", error);
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
    if (documentID && documentStatus === "O") {
      updateState({ showCancelModal: true });
    }
  };

const handleHeaderStatusChange = (value) => {
  updateState({ documentStatus: value });
};




  const handlePost = async () => {
    if (documentID && documentStatus === "O") {
      updateState({ showPostModal: true });
    }
  };


  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  
  const handleUpload = async () => {
    updateState({ showUploadModal: true });
  };



  const handleNotify = async () => {
    if (!documentID) return;

    const confirm = await useSwalProceedConfirm(
      "Notify Approver?",
      `Do you want to notify the 1st Level Approver for PR ${documentNo || documentID}?`,
      "Yes, notify",
    );

    if (!confirm?.isConfirmed) return;

    updateState({ showSpinner: true });

    try {
      const payload = {
        json_data: {
          tranIds: String(documentID),
          userCode,
          userName: currentUserRow?.userName || "",
          appLevel: currentUserRow?.prAppLevel || "",
          mode: "Notify",
          reason: "",
          url: `${window.location.origin}/?page=PRApprovalModal`,
        },
      };

      await postRequest("approvePR", payload);

      await useSwalSuccessAlert(
        "PR Notified",
        `PR ${documentNo || documentID} has been notified to its Approver.`,
      );

      if (Number(appLevel) === -1 && documentNo && branchCode) {
        await fetchTranData(documentNo, branchCode);
      }
    } catch (error) {
      console.error("Notify PR approver failed:", error);
      useSwalErrorAlert(
        "PR Notify",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to notify the PR approver.",
      );
    } finally {
      updateState({ showSpinner: false });
    }
  };




  const handleCopy = async () => {
  if (detailRows.length === 0) return;

  const qtyHandDetail = !isJobOrder ? await handleActivityOption('onCopy') : [];

  const commonDate = useGetCurrentDayV2();
  const copiedDateNeeded = addDaysToDateValue(commonDate, 1);

  const updatedRows = detailRows.map((row) => {
    const match = !isJobOrder && qtyHandDetail?.find(
      (item) => item.itemCode === row.itemCode && item.invType === row.invType
    );

    return {
      ...row,
      prStatus: "O",
      poQty: formatNumber(0, decQty),
      rrQty: formatNumber(0, decQty),
      qtyOnHand: formatNumber(match ? match.quantity : 0, decQty),
      qtyAlloc: formatNumber(0, decQty),
      groupId: "",
      dateNeeded: copiedDateNeeded
    };
  });

  if (documentID) {
    headerDateNeededRef.current = copiedDateNeeded;
    suppressHeaderDateNeededPromptRef.current = true;
    
    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "O",
      status: "",
      originalDocStatus: "O",
      documentDate: commonDate,
      headerDateNeeded: copiedDateNeeded,
      dateNeeded: copiedDateNeeded,
      detailRows: updatedRows,
      isFetchDisabled: false,
      isFormDisabled: false,
      appLevel: 0,
    });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0
    );
    updateTotalsDisplay(totalQty);
  }
};



  // ==========================
  // HISTORY – URL PARAM HANDLING
  // ==========================


  const printData = {
    pr_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  // ==========================
  // MODAL CLOSE HANDLERS
  // ==========================

  const handleCloseCancel = async (confirmation) => {
      if(confirmation && originalDocStatus === "O" && documentID !== null ) {
  
        const result = await useHandleCancel(docType,documentID,userCode,confirmation.password,confirmation.reason,updateState);
        if (result.success) 
      {
       useSwalSuccessAlert("Success","Cancellation Completed")  
      }  
       await fetchTranData(documentNo,branchCode);
      }
      updateState({showCancelModal: false});
  };


  const handleClosePost = async () => {
    if (documentStatus !== "O" && documentID !== null) {
      const result = await useHandlePost(docType, documentID, updateState);
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

  const handleSaveAndPrint = async (prId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(prId, docType);


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



  useEffect(() => {
      const onKey = (e) => {
        if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);


const handleTranDocNoRetrieval = async (data) => {



  await fetchTranData(data.docNo, data.branchCode || branchCode, data.key);
  updateState({ showAllTranDocNo: data.modalClose });
};




const handleTranDocNoSelection = async (data) => {
    
    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};

const handleDocNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};


const hasExistingPO = detailRows.some(row => (parseFloat(row.poQty) || 0) > 0);

const renderPrDetailColumn = (columnKey, row, index) => {
  const columnWidth = getPrDetailFallbackWidth(columnKey);
  const style = getPrDetailCellStyle(columnKey, columnWidth);
  const rowLocked = isFormDisabled || row.prStatus !== "O" || (parseFormattedNumber(row.poQty) || 0) > 0;

  const focusNextDetailCell = (field) => {
    focusNextPrDetailRowInput(index, field, {
      rows: detailRowsRef.current || detailRows,
      zeroClearFields: prDetailEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
    });
  };

  const textInput = (field, options = {}) => (
    <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} disabled={options.disabled ?? false} tabIndex={options.tabIndex} maxLength={options.maxLength} onChange={(e) => handleDetailChange(index, field, e.target.value, false)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || options.disabled || isFormDisabled) return; e.preventDefault(); focusNextDetailCell(field); }} />
  );

  const modalTextCell = (field, modalTitle, placeholder) => {
    const value = row[field] || "";
    const lineCount = Math.max(1, String(value).split(/\r\n|\r|\n/).length);
    const canOpenModal = !isFormDisabled && row.prStatus === "O";
    const preserveEncodedText = field === "itemSpecs";

    return (
      <td key={columnKey} className="global-tran-td-ui relative align-top" style={style}>
        <div className={`flex ${autoResizePrDetailRows ? "items-start" : "items-center"}`}>
          {autoResizePrDetailRows ? (
            <textarea
              id={`${field}-${index}`}
              className={`w-full min-h-[28px] resize-none bg-transparent py-1 pr-8 text-xs leading-4 focus:outline-none focus:ring-0 ${
                preserveEncodedText ? "whitespace-pre overflow-x-auto" : "whitespace-pre-wrap break-words"
              }`}
              value={value}
              rows={lineCount}
              wrap={preserveEncodedText ? "off" : "soft"}
              readOnly={rowLocked}
              onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
            />
          ) : (
            <input
              type="text"
              id={`${field}-${index}`}
              className="w-full global-tran-td-inputclass-ui pr-8"
              value={value}
              onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
              readOnly={rowLocked}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || rowLocked) return;
                e.preventDefault();
                focusNextDetailCell(field);
              }}
            />
          )}
          {canOpenModal && (
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute right-2 top-1.5 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
              onClick={() =>
                useSwalHandleOpenSpecsModal(
                  index,
                  detailRows,
                  handleDetailChange,
                  value,
                  modalTitle,
                  field,
                  placeholder
                )
              }
            />
          )}
        </div>
      </td>
    );
  };

  const commitQtyInputValue = (field, rawValue) => {
    let num = parseFormattedNumber(rawValue);
    if (isNaN(num)) return;
    if (field === "qtyNeeded" && num < 0) num = 0;

    const formattedValue = formatNumber(num, decQty);
    const updatedRows = [...(detailRowsRef.current || detailRows || [])];
    updatedRows[index] = {
      ...(updatedRows[index] || {}),
      [field]: formattedValue,
    };

    detailRowsRef.current = updatedRows;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    return formattedValue;
  };

  const qtyInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
      value={row[field] || ""}
      readOnly={options.readOnly ?? isFormDisabled}
      disabled={options.disabled ?? false}
      onChange={(e) => {
        const sanitizedValue = field === "qtyNeeded"
          ? e.target.value.replace(/[^0-9.]/g, "")
          : e.target.value.replace(/[^0-9.-]/g, "");
        const validPattern = field === "qtyNeeded"
          ? /^\d*\.?\d{0,6}$/
          : /^-?\d*\.?\d{0,6}$/;
        if (validPattern.test(sanitizedValue) || sanitizedValue === "") {
          handleDetailChange(index, field, sanitizedValue, false);
        }
      }}
      onFocus={(e) =>
        clearPrDetailZeroOnFocus(e, {
          isEditable: !(options.readOnly ?? isFormDisabled) && !(options.disabled ?? false),
          onClear: (value) => handleDetailChange(index, field, value, false),
        })
      }
      onBlur={(e) => {
        if ((options.readOnly ?? isFormDisabled) || (options.disabled ?? false)) return;
        const formattedValue = commitQtyInputValue(field, e.currentTarget.value);
        if (formattedValue !== undefined) e.currentTarget.value = formattedValue;
        setFocusedCell(null);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || (options.readOnly ?? isFormDisabled) || (options.disabled ?? false)) return;
        e.preventDefault();
        const formattedValue = commitQtyInputValue(field, e.currentTarget.value);
        if (formattedValue !== undefined) e.currentTarget.value = formattedValue;
        window.setTimeout(() => focusNextDetailCell(field), 0);
      }}
    />
  );

  const lookupCell = (field, onClick, options = {}) => (
    <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui pr-6 ${options.className || ""}`.trim()} value={row[field] || ""} readOnly onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextDetailCell(field); }} />{!options.hideIcon && <FontAwesomeIcon icon={options.icon || faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={onClick} />}</div></td>
  );

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    prStatus: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`prStatus-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.prStatus || "O"} onChange={(e) => handleDetailChange(index, "prStatus", e.target.value)} disabled={isDocumentLocked || !documentID?.length || row.prStatus !== "O" || row.joNo?.length} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("prStatus"); } }}><option value="O">Open</option><option value="C">Closed</option>{(!row.poQty || parseFloat(row.poQty) === 0) && <option value="X">Cancelled</option>}</select></td>,
    invType: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`invType-${index}`} className="w-full global-tran-td-inputclass-ui bg-white outline-none" value={row.invType || ""} onChange={(e) => handleDetailChange(index, "invType", e.target.value)} disabled={isFormDisabled || (row.itemCode?.length > 0) || isJobOrder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("invType"); } }}><option value="" disabled>Select</option>{isJobOrder ? <option value="JO">JO</option> : <><option value="MS">MS</option><option value="RM">RM</option><option value="FG">FG</option></>}</select></td>,
    serviceCode: () => lookupCell("serviceCode", () => updateState({ showJobCodesModal: true, selectedRowIndex: index }), { hideIcon: isFormDisabled || row.prStatus !== "O" }),
    serviceName: () => modalTextCell("serviceName", "Scope of Work", "Enter scope of work..."),
    itemCode: () => lookupCell("itemCode", () => handleAddItem(index, "PR" + row.invType), { hideIcon: isFormDisabled || Number(row.poQty || 0) !== 0 || row.prStatus !== "O" || row.invType === "" || row.invType == null }),
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { disabled: isFormDisabled, className: "cursor-not-allowed" })}</td>,
    itemSpecs: () => modalTextCell("itemSpecs", "Specification", `Enter specification for ${row.itemName || "this item"}...`),
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: isFormDisabled || row.prStatus !== "O" || (parseFormattedNumber(row.poQty) || 0) > 0 || !isJobOrder })}</td>,
    qtyOnHand: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{textInput("qtyOnHand", { readOnly: true, tabIndex: -1, className: "text-right cursor-not-allowed" })}</td>,
    qtyNeeded: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{qtyInput("qtyNeeded", { readOnly: rowLocked })}</td>,
    dateNeeded: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`dateNeeded-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={toDateInputValue(row.dateNeeded)} min={toDateInputValue(documentDate)} onChange={(e) => handleDetailChange(index, "dateNeeded", e.target.value)} readOnly={rowLocked} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("dateNeeded"); } }} /></td>,
    poQty: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{qtyInput("poQty", { readOnly: true, disabled: isFormDisabled })}</td>,
    rrQty: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{qtyInput("rrQty", { readOnly: true, disabled: isFormDisabled })}</td>,
    joNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("joNo", { readOnly: true, className: "cursor-not-allowed" })}</td>,
  };

  return detailColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
};

  // ==========================
  // RENDER
  // ==========================

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
          onSave={() => handleActivityOption('Upsert')}
          onCancel={handleCancel} 
          onCopy={handleCopy} 
          onAttach={handleAttach}
          onUpload={handleUpload}
          onNotify={handleNotify} 

          activeTopTab={topTab} 
          showActions={topTab === "details"} 
          showNotify={hsDoc?.docApp === "Y" && approvalStatus !== "Approved Transaction"}

          showBIRForm={false}   
          showCopyForm ={true} 
          showUpload ={true} 
          isViewDocument={isViewDocument}  
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}         
          detailsRoute="/page/PR"

          isSaveDisabled={state.isSaveDisabled || isDocumentLocked ||  ((detailRows?.length || 0)=== 0)} 
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!documentID}
          isNotifyDisabled={!documentID || displayStatus === "CANCELLED" || approvalStatus === "Approved Transaction"}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "APPROVED" }
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED" || hasExistingPO }


        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>



      {/* Page title and subheading */} 
      <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
        <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
          <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
        </div>
        <div
          className={`global-tran-headerstat-div-ui ${
            showApprovalStatus ? "max-sm:!flex-row max-sm:!items-start max-sm:!justify-center max-sm:!gap-x-6" : ""
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
            onClick={() => setActiveTab("basic")}
          >
            Basic Information
          </button>
          {/* Provision for Other Tabs */}
        </div>


        

          {/* PR Header Form Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative" id="pr_hd">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => !isFormDisabled && updateState({ branchModalOpen: true })}
                />

                <FieldRenderer
                  id="prNo"
                  label="PR No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
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
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${
                      !isFormDisabled
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="documentDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={documentDate}
                      disabled={isFormDisabled}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="documentDate" className="global-ref-floating-label">
                    PR Date
                  </label>
                </div>

                <FieldRenderer
                  id="prTranType"
                  label="Tran Type"
                  type="select"
                  value={selectedPrTranType || ""}
                  disabled={isFormDisabled || detailRows.length > 0}
                  onChange={(val) => handlePrTranTypeChange({ target: { value: val } })}
                  options={prTranTypes.map((t) => ({
                                label: t.DROPDOWN_NAME,
                                value: t.DROPDOWN_CODE,
                            }))}
                />
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="rcName"
                  label="Responsibility Center"
                  type="lookup"
                  value={rcName || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
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
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() =>
                    !isFormDisabled &&
                    updateState({
                      rcLookupModalOpen: true,
                      rcLookupContext: "reqDept",
                    })
                  }
                />

                <FieldRenderer
                  id="prType"
                  label="PR Type"
                  type="select"
                  value={selectedPrType || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => handlePrTypeChange({ target: { value: val } })}
                  options={prTypes.map((t) => ({
                                label: t.DROPDOWN_NAME,
                                value: t.DROPDOWN_CODE,
                            }))}
                />

                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${
                      !isFormDisabled
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="headerDateNeeded"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={headerDateNeeded}
                      disabled={isFormDisabled}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="headerDateNeeded" className="global-ref-floating-label">
                    Date Needed
                  </label>
                </div>
              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="refPrNo1"
                  label="Ref Doc No1."
                  type="text"
                  value={refPrNo1 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refPrNo1: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refpr_no1")}
                />

                <FieldRenderer
                  id="refPrNo2"
                  label="Ref Doc No2."
                  type="text"
                  value={refPrNo2 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refPrNo2: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refpr_no2")}
                />

                <FieldRenderer
                  id="documentStatus"
                  label="PR Status"
                  type="select"
                  value={documentStatus || "O"}
                  disabled={isDocumentLocked || !documentID?.length || originalDocStatus !== "O"}
                  onChange={(val) => handleHeaderStatusChange(val)}
                  options={[
                    { label: "Open", value: "O" },
                    { label: "Closed", value: "C" },
                    ...( !hasExistingPO && originalDocStatus !== "C"
                      ? [{ label: "Cancelled", value: "X" }]
                      : []),
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
                    maxLength={useGetFieldLength(tblFieldArray, "remarks")}
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
            PR DETAIL TABLE (DT1)
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Item Detail
              </span>
            </div>
          </div>
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {visiblePrDetailColumns.map((column) =>
                      renderPrDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: visiblePrDetailColumns,
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
                  {sortedPrDetailRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {visiblePrDetailColumns.map((column) => renderPrDetailColumn(column.key, row, originalIndex))}
                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddBlankRow(originalIndex)}>
                              <FontAwesomeIcon icon={faPlus} />
                            </button>

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
              {renderPrDetailHeaderContextMenu?.()}
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div ref={addTypeDropdownRef} className="relative inline-block">
 
 
  {/* Dropdown overlay (absolute so it will NOT expand layout) */}
  {!isJobOrder && showTypeDropdown && (
  
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
              handleOpenItemLookup(false, "PRFG");
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
              handleOpenItemLookup(false, "PRMS");
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
              handleOpenItemLookup(false, "PRRM");
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
              handleAddByQR();
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                <FontAwesomeIcon icon={faQrcode} />
              </span>
              <div className="flex flex-col items-start">
                <span>QR Code / Barcode</span>
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                  Scan using camera
                </span>
              </div>
            </div>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-slate-700 dark:text-blue-300">
              Scan
            </span>
          </button>
        </div>
      </div>

      )}

      <button
        onClick={handleAddRowClick}
        disabled={isFormDisabled}
        className={`global-tran-tab-footer-button-add-ui ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />
        Add
      </button>


  
  </div>
      </div>
  

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalQty"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Qty Needed:
                </label>
                <label
                  htmlFor="TotalQty"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totals.totalQtyNeeded}
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
         isActive={topTab === "history"}
         endpoint="/getPRHistory"
         cacheKey={`PR:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
         activeTabKey="PR_Summary"
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


      {showAllTranDocNo && (
          <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{branchCode,branchName,docType,documentTitle,fieldNo : "prNo"}}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{documentNo}}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
          />
      )} 



      
      {showJobCodesModal && (
        <JobCodeLookupModal
          isOpen={showJobCodesModal}
          onClose={handleCloseJobCodesLookup}
          />
        )}
      


      {custModalOpen && (
        <CustomerMastLookupModal
          isOpen={custModalOpen}
          onClose={handleCloseCustModal}
        />
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <CancelTranModal
          isOpen={showCancelModal}
          onClose={handleCloseCancel}
        />
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


    {showUploadModal && (
        <ExcelBatchUploadModal 
          isOpen={showUploadModal}
          uploadedDocType={docType}
          companyInfo={companyInfo}
          onClose={() => updateState({ showUploadModal: false })}
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

      <GlobalApprovalStatus
        isOpen={showApprovalStatusModal}
        onClose={() => updateState({ showApprovalStatusModal: false })}
        docType={docType}
        docNo={documentNo}
        docDate={documentDate}
        status={approvalStatus}
        remarks={remarks}
        maxAppLevel={currentUserRow?.prMaxAppLevel}
        data={detailRowsApp?.[0] || {}}
      />



         {itemLookupModalOpen && (
        <ItemMastLookupModal
        isOpen={itemLookupModalOpen}
        endpoint={itemLookupEndPoint}
        onClose={handleCloseItemLookup}
        onCancel={() => updateState({ itemLookupModalOpen: false })}
        enableMultiSelect={!itemSingleSelect}
        docType={selectedDocType}
         />
        )}


      <BarcodeQrReaderModal
       isOpen={showScannerOpen}
        onClose={() => updateState({ showScannerOpen: false })}
        onScan={(scannedValue) => {
          handleScanItem(scannedValue);
        }}
      />      




      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default PR;
