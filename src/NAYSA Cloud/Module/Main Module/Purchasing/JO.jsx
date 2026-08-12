import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate,useLocation } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
 faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
  faMinus,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import JobCodeLookupModal from "../../../Lookup/SearchJobCodesRef.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import GlobalApprovalStatus from "@/NAYSA Cloud/Approval/GlobalApprovalStatus.jsx";

// Configuration
import { postRequest,fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";


import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopForexRate,
  useTopCurrencyRow,
  useTopDocControlRow,
  useTopPayTermRow,
  useTopPayeeRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";


import {
  useGetCurrentDayV2,
  useFormatToDate,
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
  useSelectedHSColConfig
} from '@/NAYSA Cloud/Global/selectedData';

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalvalidateRequiredFields,
  useSwalInfoAlert,
  useSwalProceedConfirm,
  useSwalHandleOpenSpecsModal,
  useSwalSuccessAlert,
  useSwalErrorAlert
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

const firstTextValue = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null);
  return value === undefined ? "" : String(value);
};

const JO = () => {
   const loadedFromUrlRef = useRef(false);
   const detailRowsRef = useRef([]);
    const navigate = useNavigate();
    const location = useLocation(); 
    const [isViewDocument, setIsViewDocument] = useState(false);
    const { companyInfo, currentUserRow,getAllDropDown,refsLoaded ,getAllTopATCRow, getAllTopVatRow,getReplacementVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
    const decUPrice = companyInfo?.pur_decuprice ?? 2;
  
  
        
    useEffect(() => {
    const p = new URLSearchParams(location.search);
            if (p.get("viewDocument") === "true") {
              setIsViewDocument(true);
            }
            }, []); 
    const isViewDocumentUrl = isViewDocument;
                
    const [topTab, setTopTab] = useState("details"); 
    const { resetFlag } = useReset();
    const docType = docTypes?.JO || "JO";
    const hsDoc = getAllTopHSDocRow(docType);
    const pdfLink = docTypePDFGuide[docType];
    const videoLink = docTypeVideoGuide[docType];
    const documentTitle = hsDoc.docName + ' Transaction';


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
    documentNo: "",
    documentStatus: "",
    status: "",
    appLevel:0,
    originalDocStatus:"O",
    documentDate:useGetCurrentDayV2(),  
    dateNeeded:useGetCurrentDayV2(),  

   
    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.BranchName||"",
    currCode: "",
    currName: "",
    attention: "",

    payeeName:  "",
    payeeCode:  "",
    paytermCode: "",
    paytermName: "",

    // Currency information (not used by sproc_PHP_PR but kept for UI consistency)
    currCode:companyInfo?.currCode||"",
    currName:companyInfo?.currName||"",
    currRate:formatNumber(companyInfo?.currRate||1,6) ,
    defaultCurrRate: "1.000000",

    tblFieldArray :[],
    prTranTypes: [],
    prTypes: [],
    openPRJO_Data_Summary: [],
    openPRJO_Data_Detail: [],
    openPRJO_Col_Summary: [],
    openPRJO_Col_Detail: [],
    selectedPrTranType: "",
    selectedPrType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "", // responsibility center name for display
    requestDept: "",
    refPrNo1: "",
    refPrNo2: "",
    remarks: "",
    noReprints: "0",
    prCancelled: "",
    userCode: "NSI",
    prNo: "",
    prId: "",

    // Detail lines (PR dt1)
    detailRows: [],
    detailRowsApp: [],

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
    showPaytermModal: false,
    payeeModalOpen: false,
    prLookupModalOpen: false,
    showApprovalStatusModal: false,
    showJobCodesModal:false,
    showAllTranDocNo:false,
    showOpenPRModal:false,


    rcLookupModalOpen: false,
    vatLookupModalOpen: false,
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
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,


    // Header
    branchCode,
    branchName,

    payeeName,
    payeeCode,

    // Responsibility Center
    rcCode,
    rcName,
    currRate,
    currCode,
    currName,
    attention,
    tblFieldArray,
    remarks,
    noReprints,
    userCode,
    showPaytermModal,
    selectedRowIndex,
    prNo,
    prId,
    showJobCodesModal,
    openPRJO_Data_Summary,
    openPRJO_Data_Detail,
    openPRJO_Col_Summary,
    openPRJO_Col_Detail,

    detailRows,
    detailRowsApp,

   
    currencyModalOpen,
    branchModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    payeeModalOpen,
    prLookupModalOpen,
    showApprovalStatusModal,
    paytermCode,
    paytermName,
    vatLookupModalOpen,
    showAllTranDocNo,
    showOpenPRModal,
    rcLookupModalOpen,
  } = state;

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
  }, [detailRows]);


  const [totals, setTotals] = useState({
    totalGross: "0.00",
    totalVat: "0.00",
    totalNet: "0.00",
  });



  const displayStatus = status || "OPEN";
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const maxApprovalLevel = Number(currentUserRow?.joMaxAppLevel || 0);
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



  const joDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "jobCode", label: "Job Code", width: 120 },
    { key: "scopeOfWork", label: "Scope of Work", width: 320 },
    { key: "specification", label: "Specification", width: 320 },
    { key: "quantity", label: "Quantity", width: 130 },
    { key: "unitPrice", label: "Unit Price", width: 130 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "grossAmt", label: "Gross Amount", width: 140 },
    { key: "discRate", label: "Disc Rate", width: 120 },
    { key: "discAmt", label: "Disc Amount", width: 140 },
    { key: "totalAmt", label: "Total Amount", width: 140 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "vatAmt", label: "VAT Amount", width: 140 },
    { key: "netAmt", label: "Net Amount", width: 140 },
    { key: "deliveryDate", label: "Delivery Date", width: 140 },
  ];

  const {
    autoResizeRows: autoResizeJoDetailRows,
    getColumnStyle: getJoDetailColumnStyle,
    getFrozenColumnStyle: getJoDetailFrozenStyle,
    getOrderedColumns: getOrderedJoDetailColumns,
    getSortedRows: getSortedJoDetailRows,
    clearAllSorting: clearJoDetailSorting,
    clearZeroValueOnFocus: clearJoDetailZeroOnFocus,
    focusNextRowInput: focusNextJoDetailRowInput,
    renderHeaderContextMenu: renderJoDetailHeaderContextMenu,
    renderResizableHeader: renderJoDetailHeader,
  } = useResizableTableColumns(joDetailColumnDefs);

  const orderedJoDetailColumns = getOrderedJoDetailColumns(joDetailColumnDefs);
  const getJoDetailFallbackWidth = (key) => joDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getJoDetailCellStyle = (key, fallbackWidth) => ({
    ...getJoDetailColumnStyle(key, fallbackWidth),
    ...getJoDetailFrozenStyle(key, orderedJoDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedJoDetailRows = getSortedJoDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const joDetailEnterNextRowZeroClearFields = ["quantity", "unitPrice", "discRate", "discAmt"];

  const updateTotalsDisplay = (rows) => {
    const arr = Array.isArray(rows) ? rows : [];

    let gross = 0;
    let vat = 0;
    let net = 0;

    arr.forEach((r) => {
      gross += parseFormattedNumber(r.grossAmt || 0);
      vat += parseFormattedNumber(r.vatAmt || 0);
      net += parseFormattedNumber(r.netAmt || 0);
    });

    setTotals({
      totalGross: formatNumber(gross||0),
      totalVat: formatNumber(vat||0),
      totalNet: formatNumber(net||0),
    });
  };



  const handleCurrencyRateBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currencyRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
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
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);




const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    handleReset();
    loadCompanyData();
    isInitialMount.current = false;
  }
}, []);


  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);




  // ==========================
  // INITIAL LOAD / RESET
  // ==========================

  const handleReset = () => {
    clearJoDetailSorting();

    updateState({
      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      currCode:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      documentDate:useGetCurrentDayV2(),
      prNo: "", 
      rcCode: "",
      rcName: "",
      remarks: "",
      payeeCode:"",
      payeeName:"",
      paytermName:"",
      paytermCode:"",
      attention:"",
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
      status: "",
      appLevel: 0,
      originalDocStatus:"O",
      noReprints: "",
      joCancelled: "",
      detailRows: [],
      detailRowsApp: [],
      rcLookupModalOpen: false,
      selectedRowIndex: null,
      showApprovalStatusModal: false,
    });

    updateTotalsDisplay([]);
  };






  
    const loadCompanyData = async () => {
            updateState({ isLoading: true });
          
            try {
              const hdtblcol_result = await useFieldLenghtCheck(
                "jo_hd,jo_dt1"
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
  
  




const handleClosePayeeModal = async (selectedData) => {
  if (!selectedData) {
    updateState({ payeeModalOpen: false });
    return;
  }

  updateState({ payeeModalOpen: false, isLoading: true });

  try {
    const { vendCode = "", vendName = "" } = selectedData;

    const payeeData = await useTopPayeeRow(vendCode);
    const payTermData = await useTopPayTermRow(payeeData?.paytermCode);

    const payeeDetails = await handleFetchDetail(vendCode);
    const defaultVat = Array.isArray(payeeDetails) ? payeeDetails[0] : payeeDetails;
    const replacementVat = getReplacementVatRow(defaultVat?.vatCode || "", "I", "G", "S");
    const newVatCode = replacementVat?.vatCode || defaultVat?.vatCode || "";
    const newVatName = replacementVat?.vatName || defaultVat?.vatName || "";

    const updatedRows = await Promise.all(
      detailRows.map(async (row) => {
        const total = parseFormattedNumber(row.totalAmt) || 0;
        const vAmt = newVatCode ? getAllTopVatAmount(newVatCode, total) : 0;
        const net = +(total - vAmt).toFixed(2);

        return {
          ...row,
          vatCode: newVatCode,
          vatName: newVatName,
          vatAmt: formatNumber(vAmt),
          netAmt: formatNumber(net),
        };
      })
    );

    updateState({
      payeeCode: vendCode,
      payeeName: vendName,
      attention: payeeData?.vendContact || "",
      paytermCode: payTermData?.paytermCode || "",
      paytermName: payTermData?.paytermName || "",
      detailRows: updatedRows,
    });

    await handleSelectCurrency(payeeData?.currCode || "PHP");
    updateTotalsDisplay(updatedRows);
  } catch (error) {
    console.error("Error updating payee and details:", error);
  } finally {
    updateState({ isLoading: false });
  }
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
        JSON.stringify(vendPayload)
      );
      const rawResult = vendResponse.data[0]?.result;

      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
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



  const handleClosePaytermModal = (selectedPayterm) => {
  if (!selectedPayterm) {
    updateState({ showPaytermModal: false });
    return;
  }

  updateState({
    paytermCode: selectedPayterm.paytermCode,
    paytermName: selectedPayterm.paytermName,
    showPaytermModal: false,
  });
};
  



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
    updateTotalsDisplay([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"joNo",direction);
  
   
    if (!data?.joId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      scopeOfWork: firstTextValue(item.scopeOfWork, item.scope_of_work, item.serviceName, item.jobName),
      specification: firstTextValue(item.specification, item.Specification, item.SPECIFICATION, item.itemSpecs, item.item_specs, item.specs),
      quantity: formatNumber(item.quantity,2),
      unitPrice: formatNumber(item.unitPrice,decUPrice),
      grossAmt: formatNumber(item.grossAmt,2),
      discRate: formatNumber(item.discRate,2),
      discAmt: formatNumber(item.discAmt,2),
      vatAmt: formatNumber(item.vatAmt,2),
      netAmt: formatNumber(item.netAmt,2),
      totalAmt:formatNumber(item.totalAmt,2),
    }));
    const retrievedApprovalRows = Array.isArray(data.dtApp)
      ? data.dtApp
      : data.dtApp
        ? [data.dtApp]
        : [];

    let fetchedCurrName = data.currName || "";

    if (data.currCode && !fetchedCurrName) {
      try {
        const currRow = await useTopCurrencyRow(data.currCode);
        fetchedCurrName = currRow?.currName || "";
      } catch (err) {
        console.error("Error fetching currency name:", err);
      }
    }

    // Update state with fetched data
    updateState({

      documentStatus: data.joHStatus,
      status: data.joStatus,
      appLevel: data.appLevel,
      originalDocStatus:data.joHStatus,
      documentID: data.joId,
      documentNo: data.joNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.joDate),
      rcCode: data.rcCode,
      rcName: data.rcName,
      payeeCode: data.payeeCode,
      payeeName: data.payeeName,
      attention:data.attention,
      currCode: data.currCode || "",
      currName: fetchedCurrName,
      currRate: formatNumber(data.currRate || 1, 6),
      paytermCode: data.paytermCode,
      paytermName: data.paytermName,
      prNo: data.prNo,   
      prId: data.prId,
      remarks: data.remarks,
      joCancelled: data.joCancelled ,
      noReprints: data.noReprints,
      detailRows: retrievedDetailRows,
      detailRowsApp: retrievedApprovalRows,
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

   
    updateTotalsDisplay(retrievedDetailRows);

  } catch (error) {
    console.error("Error fetching transaction data:", error);
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false });
  }
};










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
      fetchTranData(state.documentNo, state.branchCode);
    }
  };





const createEmptyDetailRow = (vatCode = "", vatName = "") => ({
  jobCode: "",
  scopeOfWork: "",
  specification: "",
  quantity: formatNumber(1, 2),
  unitPrice: formatNumber(0, decUPrice),
  uomCode: "",
  grossAmt: formatNumber(0, 2),
  discRate: formatNumber(0, 2),
  discAmt: formatNumber(0, 2),
  totalAmt: formatNumber(0, 2),
  vatCode: vatCode,
  vatName: vatName,
  vatAmt: formatNumber(0, 2),
  netAmt: formatNumber(0, 2),
  deliveryDate: documentDate,
  prNo: "",
  prLn: ""
});


const handleAddRow = async (index) => {
  await insertNewRow(index);
};


const handleAddRowClick = async () => {
  const fields = { "Header : Payee": payeeCode };
  if (! await useSwalvalidateRequiredFields(fields, "Add Item") || isFormDisabled) return;

  try {
    const updatedRows = await insertNewRow();
    
    updateTotalsDisplay(updatedRows);
    setShowTypeDropdown(false);
  } catch (error) {
    console.error(error);
  }
};


const insertNewRow = async (index = -1) => {
  let vatCode = "";
  let vatName = "";


  if (detailRows.length > 0) {
    vatCode = detailRows[0].vatCode || "";
    vatName = detailRows[0].vatName || "";
  } else {
    const data = await handleFetchDetail(payeeCode);
    const item = Array.isArray(data) ? data[0] : data;
    vatCode = item?.vatCode || "";
    vatName = item?.vatName || "";
  }

  const replacementVat = getReplacementVatRow(vatCode, "I", "G", "S");
  vatCode = replacementVat?.vatCode || vatCode;
  vatName = replacementVat?.vatName || vatName;

  const newRow = createEmptyDetailRow(vatCode, vatName);
  const updatedRows = [...detailRows];

  if (index === -1 || documentNo) {
    updatedRows.push(newRow);
  } else {
    updatedRows.splice(index + 1, 0, newRow);
  }

  updateState({ detailRows: updatedRows });
  return updatedRows;
};






const handleDeleteRow = (index) => {
  const updatedRows = detailRows.filter((_, i) => i !== index);

  updateState({ detailRows: updatedRows });
  updateTotalsDisplay(updatedRows);
};



 const handleDetailChange = async (index, field, value, runCalculations = true) => {
  const updatedRows = [...(detailRowsRef.current || detailRows || [])];
  let row = { ...(updatedRows[index] || {}), [field]: value };

  if (field === 'vatCode') {
    row.vatCode = value.vatCode;
    row.vatName = value.vatName;
  }


 if (field === 'jobCode') {
    row.jobCode = value.jobCode;
    row.scopeOfWork = value.jobName;
    row.uomCode = value.uomCode;
  }


  if (runCalculations) {
    const qty = parseFormattedNumber(row.quantity) || 0;
    const price = parseFormattedNumber(row.unitPrice) || 0;
    const gross = +(qty * price).toFixed(2);
    
    let dAmt = parseFormattedNumber(row.discAmt) || 0;
    let dRate = parseFormattedNumber(row.discRate) || 0;

    if (['quantity', 'unitPrice', 'discRate'].includes(field)) {
      dRate = field === 'discRate' ? parseFormattedNumber(value) : dRate;
      dAmt = +(dRate * gross * 0.01).toFixed(2);
    } else if (field === 'discAmt') {
      dAmt = parseFormattedNumber(value);
      dRate = gross !== 0 ? +((dAmt / gross) * 100).toFixed(2) : 0;
    }

    const total = +(gross - dAmt).toFixed(2);
    
    // Kunin ang pinakabagong vatCode para sa recalculation
    const vCode = row.vatCode || "";
    const vAmt = vCode ? getAllTopVatAmount(vCode, total)  : 0;
    const net = +(total - vAmt).toFixed(2);

    row = {
      ...row,
      grossAmt: formatNumber(gross),
      totalAmt: formatNumber(total),
      vatAmt: formatNumber(vAmt),
      netAmt: formatNumber(net),
      quantity: formatNumber(qty),
      unitPrice: formatNumber(price, decUPrice),
      discRate: formatNumber(dRate),
      discAmt: formatNumber(dAmt)
    };
  }

  updatedRows[index] = row;
  detailRowsRef.current = updatedRows;
  updateState({ detailRows: updatedRows });
  updateTotalsDisplay(updatedRows);
};


  
  // ==========================
  // SAVE / UPSERT (PR + DT1)
  // ==========================
  const handleActivityOption = async (mode) => {

    console.log(originalDocStatus)

    if (originalDocStatus !=="O" || detailRows.length===0 ) {
      return;
    }
    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        attention,
        payeeCode,
        payeeName,
        currCode,
        currRate,
        paytermCode,
        prNo,
        prId,
        documentDate,
        rcCode,
        remarks,
        detailRows,
        documentStatus,
      } = state;

 

      const joData = {
        branchCode: branchCode,
        joNo:  documentNo || "",
        joId: documentID || "",
        prNo: prNo || "",
        prId: prId || "",
        joDate: documentDate,
        rcCode: rcCode || "",
        payeeCode: payeeCode || "",
        payeeName: payeeName || "",
        attention: attention || "",
        currCode: currCode || "",
        currRate: currRate || 1,
        paytermCode: paytermCode || "",
        prNo:prNo || "",
        remarks: remarks || "",
        joStatus: documentStatus?.length ? documentStatus : "O",
        userCode: userCode,

        dt1: detailRows.map((row, index) => ({
          lnNo: index + 1,
          groupId: row.groupId || "",   
          jobCode: row.jobCode || "",
          scopeOfWork: row.scopeOfWork || "",
          specification: row.specification || "",
          quantity: parseFormattedNumber(row.quantity || 0),
          unitPrice: parseFormattedNumber(row.unitPrice || 0),
          uomCode: row.uomCode || "",
          grossAmt: parseFormattedNumber(row.grossAmt || 0),
          discRate: parseFormattedNumber(row.discRate || 0),
          discAmt: parseFormattedNumber(row.discAmt || 0),
          totalAmt: parseFormattedNumber(row.totalAmt || 0),
          vatCode: row.vatCode || "",
          vatAmt: parseFormattedNumber(row.vatAmt || 0),
          netAmt: parseFormattedNumber(row.netAmt || 0),
          deliveryDate: row.deliveryDate || null    
        })),
      };


    
       const response = await useTransactionUpsert(docType,joData,updateState,"joId","joNo");
     
           if (response) {
               const responseDocNo =  response.data[0].joNo;
               const responseDocId =  response.data[0].joId;
     
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

    if (documentID && (documentStatus === "O" || documentStatus === "" )) {
      updateState({ showCancelModal: true });
    }
  };



  const handlePost = async () => {
    if (documentID && documentStatus === "O") {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleNotify = async () => {
    if (!documentID) return;

    const confirm = await useSwalProceedConfirm(
      "Notify Approver?",
      `Do you want to notify the 1st Level Approver for JO ${documentNo || documentID}?`,
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
          appLevel: currentUserRow?.joAppLevel || "",
          mode: "Notify",
          reason: "",
          url: `${window.location.origin}/?page=JOApprovalModal`,
        },
      };

      await postRequest("approveJO", payload);

      await useSwalSuccessAlert(
        "JO Notified",
        `JO ${documentNo || documentID} has been notified to its Approver.`,
      );

      if (Number(appLevel) === -1 && documentNo && branchCode) {
        await fetchTranData(documentNo, branchCode);
      }
    } catch (error) {
      console.error("Notify JO approver failed:", error);
      useSwalErrorAlert(
        "JO Notify",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to notify the JO approver.",
      );
    } finally {
      updateState({ showSpinner: false });
    }
  };




const handleCopy = async () => {
  if (detailRows.length === 0) return;

  const currentDay = useGetCurrentDayV2(); 
  const cleanedRows = detailRows.map(row => ({ 
    ...row, 
    groupId: "", 
    del_date: currentDay
  }));

  updateState({
    documentNo: "",
    documentID: "",
    documentDate: currentDay,
    documentStatus: "O",
    status: "",
    originalDocStatus: "O",
    prNo:"",
    detailRows: cleanedRows,
    isFetchDisabled: false,
    isFormDisabled: false,
    appLevel: 0,
  });
};




  
  const handleHeaderStatusChange = (value) => {
    if (value === "X" || value === "C") {
      const isCancel = value === "X";
      const actionWord = isCancel ? "CANCEL" : "CLOSE";
  
      useSwalProceedConfirm(
        `Confirm Full Document ${isCancel ? "Cancellation" : "Closing"}?`,
        `Are you sure you want to ${actionWord} this entire JO? This action is permanent and will affect all open line items.`
      ).then((result) => {
        if (result.isConfirmed) {
          if (isCancel) {
            handleCancel(); 
          } else {
            const updatedRows = detailRows.map(row => {
              if (row.joStatus === "O" || !row.joStatus) {
                return { ...row, joStatus: "C" };
              }
              return row;
            });
  
            updateState({ 
              documentStatus: "C", 
              detailRows: updatedRows,
              isFormDisabled:true,
            });
          }
        } else {
          updateState({ documentStatus: "O" });
        }
      });
    } else {
      updateState({ documentStatus: value });
    }
  };
  






  // ==========================
  // HISTORY â€“ URL PARAM HANDLING
  // ==========================

   
   
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
     const docNo = params.get("joNo");
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
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(
        docType,
        documentID,
        userCode,
        updateState
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
  if (selectedRC) {
    updateState({
      ...selectedRC,
      rcLookupModalOpen: false
    });
    return;
  }

  updateState({ rcLookupModalOpen: false });
};




const handleCloseJobCodesLookup = (selectedItems) => {
  if (selectedItems) {
   handleDetailChange(selectedRowIndex, 'jobCode', selectedItems, false)
  }
  updateState({ showJobCodesModal: false });
};


  
  const handleCloseVATLookup = async (selectedVat) => {
  if (selectedVat && selectedRowIndex !== null) {
    const result = getAllTopVatRow(selectedVat.vatCode);
    if (result) handleDetailChange(selectedRowIndex, 'vatCode', result, true);
  }

  updateState({ 
    vatLookupModalOpen: false, 
    selectedRowIndex: null 
  });
};
  



  

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
    handleSelectCurrency(selectedCurrency.currCode);
  };
    updateState({ currencyModalOpen: false });
  }




  const handleSelectCurrency = async (currCode) => {
  if (!currCode) return;

  // Start both requests immediately
  const currencyPromise = useTopCurrencyRow(currCode);
  const ratePromise = currCode === glCurrDefault
    ? Promise.resolve(defaultCurrRate)
    : useTopForexRate(currCode, documentDate);

  // Wait for both to finish in parallel
  const [result, rate] = await Promise.all([currencyPromise, ratePromise]);

  if (result) {
    updateState({
      currCode: result.currCode,
      currName: result.currName,
      currRate: formatNumber(parseFormattedNumber(rate), 6)
    });
  }
};



  


  const handleOpenPRLookup = async () => {
        try {
    
          updateState({ isLoading: true });
      
         
          const endpoint ="getPRJO_OpenSummary";
          const response = await fetchDataJson(endpoint, {branchCode});   
          const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      
          const colConfig = await useSelectedHSColConfig(endpoint);
          const colConfig_detail = await useSelectedHSColConfig("getPRJO_OpenDetail");
         
    
         if (custData.length === 0) {
            useSwalInfoAlert("Open Purchase Requisition" ,"No records found")
             updateState({ isLoading: false });
            return; 
          }
   
          updateState({ openPRJO_Data_Summary: custData,
                        openPRJO_Col_Summary:colConfig,
                        openPRJO_Col_Detail: colConfig_detail,
                        showOpenPRModal: true,
                        isLoading: false
            });
      
    
        } catch (error) {
          console.log(error)
          useSwalInfoAlert("Open Purchase Requisition" ,"Error in Fetching Record")
          updateState({ 
              openPRJO_Data_Summary: [],
              openPRJO_Col_Summary: [], 
              openPRJO_Col_Detail: [],
              isLoading: false  });
        }
      };
      


const handleClosePRLookup = async (selection) => {
  if (!selection || !selection.details || selection.details.length === 0) {
    updateState({ showOpenPRModal: false });
    return;
  }

  updateState({ isLoading: true, showOpenPRModal: false });

  try {
    const summary = selection.summary?.[0];
    let selVatCode = "";
    let selVatName = "";


    if (payeeCode) {
      const data = await handleFetchDetail(payeeCode);
      const vatInfo = Array.isArray(data) ? data[0] : data;
      selVatCode = vatInfo?.vatCode || "";
      selVatName = vatInfo?.vatName || "";
    }

    const newMappedRows = selection.details.map((d) => {
      const qty = parseFormattedNumber(d.qtyBalance || d.quantity || 0);
      
      return {
        jobCode: d.jobCode || d.JobCode || "",
        scopeOfWork: firstTextValue(d.scopeOfWork, d.scope_of_work, d.serviceName, d.jobName),
        specification: firstTextValue(d.specification, d.Specification, d.SPECIFICATION, d.itemSpecs, d.item_specs, d.specs),
        quantity: formatNumber(qty, 2),
        unitPrice: formatNumber(0, decUPrice),
        uomCode: d.uomCode  || "",
        grossAmt: formatNumber(0, 2),
        discRate: formatNumber(0, 2),
        discAmt: formatNumber(0, 2),
        totalAmt: formatNumber(0, 2),
        vatCode: selVatCode,
        vatName: selVatName,
        vatAmt: formatNumber(0, 2),
        netAmt: formatNumber(0, 2),
        deliveryDate: useFormatToDate(summary?.dateNeeded || documentDate),
        groupId: d.groupId || "" 
      };
    });

    updateState({ 
      prNo:  summary?.prNo || "",
      rcCode: summary?.rcCode || "",
      rcName: summary?.rcName || "",
      prId: summary?.groupId || "",
      remarks:summary?.remarks|| "",
      detailRows: newMappedRows
    });

    updateTotalsDisplay(newMappedRows);
  } catch (error) {
    console.error("PR Lookup Error:", error);
  } finally {
    updateState({ isLoading: false });
  }
};



const renderJoDetailColumn = (columnKey, row, index) => {
  const columnWidth = getJoDetailFallbackWidth(columnKey);
  const style = getJoDetailCellStyle(columnKey, columnWidth);

  const focusNextDetailCell = (field) => {
    focusNextJoDetailRowInput(index, field, {
      rows: detailRowsRef.current || detailRows,
      zeroClearFields: joDetailEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
    });
  };


  const isReadOnly = (field) => {
    if (isFormDisabled) return true;
    if (["totalAmt", "vatAmt", "netAmt"].includes(field)) return true;
    return false;
  };

  const textInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly={options.readOnly ?? isReadOnly(field)}
      disabled={options.disabled ?? false}
      maxLength={options.maxLength}
      onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || options.disabled || isFormDisabled) return;
        e.preventDefault();
        focusNextDetailCell(field);
      }}
    />
  );

  const amountInput = (field, options = {}) => {
    const decimalPlaces = options.decimals ?? 2;
    const readOnly = options.readOnly ?? isFormDisabled;

    return (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly={readOnly}
        onChange={(e) => {
          const sanitizedValue = e.target.value.replace(/[^0-9.-]/g, "");
          const rgx = decimalPlaces === 0 ? /^-?\d*$/ : new RegExp(`^-?\\d*\\.?\\d{0,${decimalPlaces}}$`);
          if (rgx.test(sanitizedValue) || sanitizedValue === "") {
            handleDetailChange(index, field, sanitizedValue, false);
          }
        }}
        onFocus={(e) =>
          clearJoDetailZeroOnFocus(e, {
            isEditable: !readOnly,
            onClear: (value) => handleDetailChange(index, field, value, false),
          })
        }
        onBlur={async (e) => {
          if (readOnly) return;
          const rawValue = String(e.target.value ?? "").trim();
          if (rawValue === "") {
            await handleDetailChange(index, field, "", false);
            return;
          }

          let num = parseFormattedNumber(rawValue);

          if (field === "discRate" && num > 99.99) {
            useSwalInfoAlert("Invalid Discount Rate", "Discount Rate must not be more than 99.99%");
            num = 0;
          }

          if (field === "discAmt") {
            const gross = parseFormattedNumber(row.grossAmt) || 0;
            if (num > gross) {
              useSwalInfoAlert("Invalid Discount", "Discount amount cannot be greater than the Gross Amount.");
              num = 0;
            }
          }

          if (isNaN(num) || num < 0) num = 0;
          await handleDetailChange(index, field, num, true);
        }}
        onKeyDown={async (e) => {
          if (e.key !== "Enter" || readOnly) return;
          e.preventDefault();

          let num = parseFormattedNumber(e.target.value);

          if (field === "discRate" && num > 99.99) {
            useSwalInfoAlert("Invalid Discount Rate", "Discount Rate must not be more than 99.99%");
            num = 0;
          }

          if (field === "discAmt") {
            const gross = parseFormattedNumber(row.grossAmt) || 0;
            if (num > gross) {
              useSwalInfoAlert("Invalid Discount", "Discount amount cannot be greater than the Gross Amount.");
              num = 0;
            }
          }

          if (isNaN(num) || num < 0) num = 0;

          await handleDetailChange(index, field, num, true);
          focusNextJoDetailRowInput(index, field, {
            rows: detailRowsRef.current || detailRows,
            zeroClearFields: joDetailEnterNextRowZeroClearFields,
            parseValue: parseFormattedNumber,
            onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
          });
        }}
      />
    );
  };

  const readonlyAmount = (field) => (
    <input type="text" className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly />
  );

  const modalTextCell = (field, modalTitle, placeholder) => {
    const value = row[field] || "";
    const lineCount = Math.max(1, String(value).split(/\r\n|\r|\n/).length);

    return (
      <td key={columnKey} className="global-tran-td-ui relative align-top" style={style}>
        <div className="flex items-start">
          <textarea
            id={`${field}-${index}`}
            className="w-full min-h-[28px] resize-none bg-transparent py-1 pr-8 text-xs leading-4 whitespace-pre-wrap break-words focus:outline-none focus:ring-0"
            value={value}
            rows={lineCount}
            readOnly={isFormDisabled}
            onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || isFormDisabled) return;
              e.preventDefault();
              focusNextDetailCell(field);
            }}
          />
          {!isFormDisabled && (
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

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    jobCode: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`jobCode-${index}`} className="w-full global-tran-td-inputclass-ui pr-6" value={row.jobCode || ""} readOnly onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("jobCode"); } }} />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => updateState({ showJobCodesModal: true, selectedRowIndex: index })} />}</div></td>,
    scopeOfWork: () => modalTextCell("scopeOfWork", "Scope of Work", `Enter scope of work for ${row.jobCode || "this item"}...`),
    specification: () => modalTextCell("specification", "Specification", `Enter specification for ${row.jobCode || "this item"}...`),
    quantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("quantity", { decimals: 2 })}</td>,
    unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("unitPrice", { decimals: decUPrice })}</td>,
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: isFormDisabled, maxLength: useGetFieldLength(tblFieldArray, "uom_code") })}</td>,
    grossAmt: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{readonlyAmount("grossAmt")}</td>,
    discRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("discRate", { decimals: 2, readOnly: isFormDisabled || parseFormattedNumber(row.grossAmt) === 0 })}</td>,
    discAmt: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("discAmt", { decimals: 2, readOnly: isFormDisabled || parseFormattedNumber(row.grossAmt) === 0 })}</td>,
    totalAmt: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{readonlyAmount("totalAmt")}</td>,
    vatCode: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`vatCode-${index}`} className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row.vatCode || ""} readOnly onKeyDown={(e) => { if (e.key === "Enter" && !isFormDisabled) { e.preventDefault(); focusNextDetailCell("vatCode"); } }} />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => updateState({ selectedRowIndex: index, vatLookupModalOpen: true })} />}</div></td>,
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
    vatAmt: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{readonlyAmount("vatAmt")}</td>,
    netAmt: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{readonlyAmount("netAmt")}</td>,
    deliveryDate: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}><input type="date" id={`deliveryDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={toDateInputValue(row.deliveryDate)} readOnly={isFormDisabled} onChange={(e) => handleDetailChange(index, "deliveryDate", e.target.value, false)} onKeyDown={(e) => { if (e.key === "Enter" && !isFormDisabled) { e.preventDefault(); focusNextDetailCell("deliveryDate"); } }} /></td>,
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
          onPost={handlePost} 
          printData={printData} 
          onReset={handleReset}
          onSave={() => handleActivityOption('Upsert')}
          onCancel={handleCancel} 
          onCopy={handleCopy} 
          onAttach={handleAttach}
          onNotify={handleNotify} 

          activeTopTab={topTab} 
          showActions={topTab === "details"} 
          showNotify={(hsDoc?.docApp === "Y" || maxApprovalLevel > 0) && approvalStatus !== "Approved Transaction"}

          showBIRForm={false}   
          showCopyForm ={true} 
          isViewDocument={isViewDocument}  
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}         
          detailsRoute="/page/JO"

          
          isSaveDisabled={state.isSaveDisabled || isDocumentLocked ||  ((detailRows?.length || 0)=== 0)} 
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!documentID}
          isNotifyDisabled={!documentID || displayStatus === "CANCELLED" || approvalStatus === "Approved Transaction"}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED"}



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
                      id="joNo"
                      label="JO No."
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
                        JO Date
                      </label>
                    </div>

                    <FieldRenderer
                      id="prNo"
                      label="PR No."
                      type="lookup"
                      value={prNo || ""}
                      disabled={isFormDisabled}
                      readOnly
                      onLookup={() => handleOpenPRLookup()}
                    />
                  </div>

                  {/* Column 2 */}
                  <div className="global-tran-textbox-group-div-ui">
                    <FieldRenderer
                      id="rcName"
                      label="Department"
                      type="lookup"
                      value={rcName || ""}
                      disabled={isFormDisabled}
                      readOnly
                      lookupDisabled={isFormDisabled}
                      onLookup={() =>
                        !isFormDisabled &&
                        updateState({ rcLookupModalOpen: true })
                      }
                    />

                    <FieldRenderer
                      id="payeeCode"
                      label="Payee Code"
                      required
                      type="lookup"
                      value={payeeCode || ""}
                      disabled={isFormDisabled}
                      readOnly
                      lookupDisabled={isFormDisabled}
                      onLookup={() => updateState({ payeeModalOpen: true })}
                    />

                    <FieldRenderer
                      id="payeeName"
                      label="Payee Name"
                      required
                      type="text"
                      value={payeeName || ""}
                      disabled
                      readOnly
                    />

                    <FieldRenderer
                      id="attention"
                      label="Attention"
                      type="text"
                      value={attention || ""}
                      disabled={isFormDisabled}
                      onChange={(val) => updateState({ attention: val })}
                      maxLength={useGetFieldLength(tblFieldArray, "attention")}
                    />
                  </div>

                  {/* Column 3 */}
                  <div className="global-tran-textbox-group-div-ui">
                    <FieldRenderer
                      id="currName"
                      label="Currency"
                      value={
                        currCode
                        ? `${currCode}${currName ? ` - ${currName}` : ""}`
                        : ""
                        }
                      disabled
                    />

                    <FieldRenderer
                      id="currRate"
                      label="Currency Rate"
                      type="amount"
                      value={currRate || ""}
                      disabled={isFormDisabled || glCurrDefault === currCode}
                      onChange={(val) => updateState({ currencyRate: val })}
                      onBlur={handleCurrencyRateBlur}
                    />

                    <FieldRenderer
                      id="payTerm"
                      label="Payment Term"
                      type="lookup"
                      value={paytermName || ""}
                      disabled={isFormDisabled}
                      readOnly
                      lookupDisabled={isFormDisabled}
                      onLookup={() =>
                        updateState({
                          showPaytermModal: true,
                          selectedRowIndex: null,
                        })
                      }
                    />

                    <FieldRenderer
                      id="documentStatus"
                      label="JO Status"
                      type="select"
                      value={documentStatus || "O"}
                      disabled={isDocumentLocked || !documentID?.length || documentStatus !== "O"}
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
            PR DETAIL TABLE (DT1)
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Job Detail
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedJoDetailColumns.map((column) =>
                      renderJoDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedJoDetailColumns,
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
                  {sortedJoDetailRows.map(({ row, originalIndex }) => (
                    <tr key={originalIndex} className="global-tran-tr-ui">
                      {orderedJoDetailColumns.map((column) => renderJoDetailColumn(column.key, row, originalIndex))}
                      {!isFormDisabled && (
                        <td
                          className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          style={transactionActionsCellStyle}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddRow(originalIndex)}><FontAwesomeIcon icon={faPlus} /></button>
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRow(originalIndex)}><FontAwesomeIcon icon={faTrashAlt} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderJoDetailHeaderContextMenu?.()}
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="inline-block">
                <button
                  onClick={handleAddRowClick}
                  disabled={isFormDisabled}
                  className={`global-tran-tab-footer-button-add-ui`}               
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
              <div className="global-tran-tab-footer-total-label-ui">Gross Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totals.totalGross}</div>
              <div className="global-tran-tab-footer-total-label-ui">VAT Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totals.totalVat}</div>
              <div className="global-tran-tab-footer-total-label-ui">Net Amount:</div>
              <div className="global-tran-tab-footer-total-value-ui">{totals.totalNet}</div>
            </div>
          </div>
        </div>
      </div>

        {/* HISTORY TAB */}
     <div className={topTab === "history" ? "" : "hidden"}>
  <AllTranHistory
    showHeader={false}
    isActive={topTab === "history"}
    endpoint="/getJOHistory"
    cacheKey={`JO:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
    activeTabKey="JO_Summary"
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


 
       
      {showJobCodesModal && (
         <JobCodeLookupModal
           isOpen={showJobCodesModal}
           onClose={handleCloseJobCodesLookup}
           activeOnly={true}
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

      {/* Payment Terms Lookup Modal */}
      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}



      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
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

      <GlobalApprovalStatus
        isOpen={showApprovalStatusModal}
        onClose={() => updateState({ showApprovalStatusModal: false })}
        docType={docType}
        docNo={documentNo}
        docDate={documentDate}
        status={approvalStatus}
        remarks={remarks}
        maxAppLevel={currentUserRow?.joMaxAppLevel}
        data={detailRowsApp?.[0] || {}}
      />

     

      {vatLookupModalOpen && (
        <VATLookupModal
          isOpen={vatLookupModalOpen}
          onClose={handleCloseVATLookup}
          customParam="InputService"
        />
      )}


 
       {showAllTranDocNo && (
           <AllTranDocNo
           isOpen={showAllTranDocNo}
           params={{branchCode,branchName,docType,documentTitle,fieldNo : "joNo"}}
           onRetrieve={handleTranDocNoRetrieval}
           onResponse={{documentNo}}
           onSelected={handleTranDocNoSelection}
           onClose={() => updateState({ showAllTranDocNo: false })}
           />
       )}   





    {showOpenPRModal && (
    <GlobalCombinedLookup
        isOpen={showOpenPRModal}
        title="Open Purchase Requisition"
        summarySelectionMode="single" 
        detailSelectionMode="multiple"
        summaryColumns={openPRJO_Col_Summary} 
        detailColumns={openPRJO_Col_Detail}
        summaryData={openPRJO_Data_Summary}
        tabTitles={["Open PR Summary", "Open PR Detail"]}
       
          fetchDetailApi={(selectedIds) => {
            const idString = Array.isArray(selectedIds) 
                ? selectedIds.join(',') 
                : selectedIds;

            const payload = {   
                json_data: JSON.stringify({
                    json_data: { 
                        selectedIds: idString
                    }
                })
            };
        
            return postRequest("getPRJO_OpenDetail", payload);
        }}
        onCancel={() => updateState({ showOpenPRModal: false })}
        onClose={handleClosePRLookup}
    />   
  )}
    
    
      
      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default JO;
