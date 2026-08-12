import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner } from "@fortawesome/free-solid-svg-icons";

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
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import {fetchData , postRequest,fetchDataJson} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  docTypeNames,
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from '@/NAYSA Cloud/Global/doctype';


import {
  useTopRCRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopDocControlRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  useSelectedOpenARBalance,
  useSelectedHSColConfig,
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


import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';


import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalErrorAlert,
  useSwalSuccessAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';



import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";



// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";

const normalizeGlRefDate = (value, fallback = "") => {
  const raw = String(value || "").trim();
  const fallbackValue = String(fallback || "").trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const converted = useformatToDatev2(raw);
  if (converted && !converted.endsWith("/0001")) return converted;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fallbackValue)) return fallbackValue;

  const convertedFallback = useformatToDatev2(fallbackValue);
  return convertedFallback && !convertedFallback.endsWith("/0001") ? convertedFallback : "";
};

const normalizeGlRefNo = (value, fallback = "") => {
  const raw = String(value || "").trim();
  return raw || String(fallback || "").trim();
};


const ARDM = () => {

    // View Document Const
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation(); 
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded ,getAllTopATCRow, getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
  const [isViewDocument, setIsViewDocument] = useState(false);
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
  
  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
  const docType = docTypes.ARDM; 
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';
 


  const [state, setState] = useState({

    // HS Option
    glCurrMode:companyInfo?.glCurrMode||"",
    glCurrDefault:companyInfo?.currCode||"",
    withCurr2:false,
    withCurr3:false,
    glCurrGlobal1:companyInfo?.glCurrGlobal1||"",
    glCurrGlobal2:companyInfo?.glCurrGlobal2||"",
    glCurrGlobal3:companyInfo?.glCurrGlobal3||"",


    
    // Document information
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentNo: "",
    documentDate:useGetCurrentDayV2(),    
    documentStatus:"",
    status: "OPEN",
    noReprints:"0",


    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    triggerGLEntries:false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,


    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",
    
    // Vendor information
    custCode: "",
    custName: "",
    chainCode:"",
    chainName:"",

    
    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    prcNo:"",
    ardmTypes :[],
    depBankCode:"",
    depAcctName:"",
    depAcctNo:"",
    currAmount:"0.00",
    checkAmount:"0.00",
    checkNo:"",
    checkDate:null,
    bank:"",
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",

    selectedARDMType : "ARDM01",
    userCode: currentUserRow?.userCode||"", 


    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    globalLookupRow:[],
    globalLookupHeader:[],

    totalDebit:"0.00",
    totalCredit:"0.00",
    totalDebitFx1:"0.00",
    totalCreditFx1:"0.00",
    totalDebitFx2:"0.00",
    totalCreditFx2:"0.00",

 
    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal:false,
    showRcModal:false,
    showVatModal:false,
    showAtcModal:false,
    showSlModal:false,
    showARBalanceModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showBankMastModal:false,
    showPostingModal:false,
    showAllTranDocNo:false,
   });

  const updateState = (updates) => {
      setState(prev => ({ ...prev, ...updates }));
    };

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
  userCode,




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
  custCode,
  custName,
  currCode,
  currName,
  currRate,
  selectedARDMType,
  ardmTypes,
  checkNo,
  checkDate,
  bank,
  refDocNo1,
  refDocNo2,
  remarks,



  // Transaction details
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


  // Contexts
  selectedRowIndex,
  accountModalSource,


  // Modals
  showAccountModal,
  showRcModal,
  showVatModal,
  showAtcModal,
  showSlModal,
  showBankMastModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showARBalanceModal,
  showPostingModal,
  showAllTranDocNo

} = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);


  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const isFormDisabled = isViewDocumentUrl|| ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  const ardmDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "siNo", label: "SI/SVI No.", width: 120 },
    { key: "siDate", label: "SI/SVI Date", width: 130 },
    { key: "siAmount", label: "SI/SVI Amount", width: 140 },
    { key: "appliedAmount", label: "Applied Amount", width: 140 },
    { key: "vatCode", label: "VAT Code", width: 100 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "atcCode", label: "ATC", width: 100 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "atcAmount", label: "ATC Amount", width: 130 },
    { key: "currCode", label: "Curr Code", width: 110 },
    { key: "currRate", label: "Curr Rate", width: 120 },
    { key: "arAcct", label: "AR Account", width: 130 },
    { key: "drAcct", label: "DR Account", width: 130 },
    { key: "rcCode", label: "RC Code", width: 120 },
  ];

  const {
    getColumnStyle: getArdmDetailColumnStyle,
    getFrozenColumnStyle: getArdmDetailFrozenStyle,
    getOrderedColumns: getOrderedArdmDetailColumns,
    getSortedRows: getSortedArdmDetailRows,
    clearAllSorting: clearArdmDetailSorting,
    clearZeroValueOnFocus: clearArdmDetailZeroOnFocus,
    focusNextRowInput: focusNextArdmDetailRowInput,
    renderHeaderContextMenu: renderArdmDetailHeaderContextMenu,
    renderResizableHeader: renderArdmDetailHeader,
  } = useResizableTableColumns(ardmDetailColumnDefs);

  const orderedArdmDetailColumns = getOrderedArdmDetailColumns(ardmDetailColumnDefs);
  const getArdmDetailFallbackWidth = (key) => ardmDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getArdmDetailCellStyle = (key, fallbackWidth) => ({
    ...getArdmDetailColumnStyle(key, fallbackWidth),
    ...getArdmDetailFrozenStyle(key, orderedArdmDetailColumns, fallbackWidth, { isHeader: false }),
  });

  const sortedArdmDetailRows = getSortedArdmDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const ardmGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
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
    getColumnStyle: getArdmGlColumnStyle,
    getFrozenColumnStyle: getArdmGlFrozenStyle,
    getOrderedColumns: getOrderedArdmGlColumns,
    getSortedRows: getSortedArdmGlRows,
    setColumnOrder: setArdmGlColumnOrder,
    clearAllSorting: clearArdmGlSorting,
    clearZeroValueOnFocus: clearArdmGlZeroOnFocus,
    focusNextRowInput: focusNextArdmGlRowInput,
    renderHeaderContextMenu: renderArdmGlHeaderContextMenu,
    renderResizableHeader: renderArdmGlHeader,
  } = useResizableTableColumns(ardmGlColumnDefs);

  const orderedArdmGlColumns = getOrderedArdmGlColumns(ardmGlColumnDefs);
  const getArdmGlFallbackWidth = (key) => ardmGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getArdmGlCellStyle = (key, fallbackWidth) => ({
    ...getArdmGlColumnStyle(key, fallbackWidth),
    ...getArdmGlFrozenStyle(key, orderedArdmGlColumns, fallbackWidth, { isHeader: false }),
  });

  useEffect(() => {
    setArdmGlColumnOrder(ardmGlColumnDefs.map((column) => column.key));
  }, [setArdmGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);

  const sortedArdmGlRows = getSortedArdmGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const ardmDetailEnterNextRowZeroClearFields = ["appliedAmount"];
  const ardmGlEnterNextRowZeroClearFields = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"];

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

  useEffect(() => {
    updateState(getGLTotalsState(detailRowsGL));
  }, [detailRowsGL]);
  

  //Variables



  const [totals, setTotals] = useState({
  totalSIAmount: '0.00',
  totalAppliedAmount: '0.00',
  totalVATAmount: '0.00',
  totalATCAmount: '0.00'
  });





 useEffect(() => {
  if (resetFlag) handleReset();

  const timer = isLoading
    ? setTimeout(() => updateState({ showSpinner: true }), 200)
    : (updateState({ showSpinner: false }), null);

  return () => timer && clearTimeout(timer);
}, [resetFlag, isLoading]);




  useEffect(() => {
  }, [custCode]);




useEffect(() => {
  if (triggerGLEntries) {
    handleActivityOption("GenerateGL").then(() => {
      updateState({ triggerGLEntries: false });
    });
  }
}, [triggerGLEntries]);







  useEffect(() => {
  if (glCurrMode && glCurrDefault && currCode) {
    loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
  }
}, [glCurrMode, glCurrDefault, currCode]);



  useEffect(() => {
    if (custName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map(row => ({
        ...row,
        currency: custName.currCode
      }));
       updateState({ detailRows: updatedRows });
    }
  }, [custName?.currCode]);



  useEffect(() => {
      updateState({isDocNoDisabled: !!state.documentID });
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
      const onKey = (e) => {
        if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
  
  
  


  const updateTotalsDisplay = (siAmt, applied, vat, atc) => {
    setTotals({
          totalSIAmount: formatNumber(siAmt),
          totalAppliedAmount: formatNumber(applied),
          totalVATAmount: formatNumber(vat),
          totalATCAmount: formatNumber(atc)
      });
  };


  useEffect(() => {
  if (!refsLoaded) return;
  const ardmType = getAllDropDown("ARDMTRAN_TYPE", docType);
  if (ardmType.length > 0) {
    updateState({
      ardmTypes: ardmType,
      selectedARDMType: "ARDM01",
    });
  }
}, [docType, refsLoaded]);






  const handleReset = () => { 
      clearArdmDetailSorting();
      clearArdmGlSorting();

      updateState({

      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      selectedARDMType : "ARDM01",
      noReprints:"0",


      refDocNo1: "",
      refDocNo2:"",
      checkDate:null,
      remarks:"",

      custName:"",
      custCode:"",
      chainCode:"",
      chainName:"",
      prcNo:"",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL:[],
      documentStatus:"",
      totalDebit:"0.00",
      totalCredit:"0.00",
      totalDebitFx1:"0.00",
      totalCreditFx1:"0.00",
      totalDebitFx2:"0.00",
      totalCreditFx2:"0.00",
      
      
      // UI state
      activeTab: "basic",
      GLactiveTab: "invoice",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status:"Open"

    });
      updateTotalsDisplay (0, 0, 0, 0)

  };


  const loadCompanyData = async () => {
  updateState({ isLoading: true });

  try {
    const hdtblcol_result = await useFieldLenghtCheck(
      "ardm_hd,ardm_dt1,ardm_dt2"
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





const loadCurrencyMode = (

      mode = glCurrMode,
      defaultCurr = glCurrDefault,
      curr = currCode
    ) => {

    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 = (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

      updateState({
        glCurrMode: mode,
        withCurr2: calcWithCurr2,
        withCurr3: calcWithCurr3,
      });

};




const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"ardmNo",direction);


    if (!data?.ardmId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }



    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      siAmount: formatNumber(item.siAmount),
      appliedAmount: formatNumber(item.appliedAmount),
      balance: formatNumber(item.balance),
      unappliedAmount: formatNumber(item.unappliedAmount),
    }));

    const formattedGLRows = (data.dt2 || []).map(glRow => ({
      ...glRow,
      debit: formatNumber(glRow.debit),
      credit: formatNumber(glRow.credit),
      debitFx1: formatNumber(glRow.debitFx1),
      creditFx1: formatNumber(glRow.creditFx1),
      debitFx2: formatNumber(glRow.debitFx2),
      creditFx2: formatNumber(glRow.creditFx2),
      slRefDate:useformatToDatev2(glRow.slRefDate),
    }));

  
    // Update state with fetched data

   
    updateState({
      documentStatus: data.ardmStatus,
      status: data.docStatus,
      documentID: data.ardmId,
      documentNo: data.ardmNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.ardmDate),
      selectedARDMType: data.ardmtranType,
      custCode: data.custCode,
      custName: data.custName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      detailRows: retrievedDetailRows,
      detailRowsGL: formattedGLRows,
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


const handleCrNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};




const handleCurrRateNoBlur = (e) => {
  
  const num = formatNumber(e.target.value, 6);
  updateState({ 
        currRate: isNaN(num) ? "0.000000" : num,  
        withCurr2:((glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D"),
        withCurr3:glCurrMode === "T",
        })

   const checkAmount = formatNumber(
      parseFormattedNumber(totals.currAmount) * parseFormattedNumber(currRate)
      );
  updateState({ checkAmount });

};





 
const moveFocusBeforeSave = () => {
  const remarksEl = document.getElementById("remarks");
  if (remarksEl) {
    remarksEl.focus();
    return true;
  }
  return false;
};



const handleActivityOption = async (action) => {
  if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
    return;
  }



  if (action === "Upsert") {
    moveFocusBeforeSave();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (documentStatus !== "") return;

  updateState({ isLoading: true });

  try {
    const {
      branchCode,
      documentNo,
      documentID,
      custCode,
      custName,
      refDocNo1,
      refDocNo2,
      currCode,
      currRate,
      remarks,
      detailRows,
      detailRowsGL,
    } = state;

    let finalDetailRowsGL = [...detailRowsGL];

    const buildGlData = (glRows) => ({
      branchCode: branchCode,
      ardmNo: documentNo || "",
      ardmId: documentID || "",
      ardmDate: documentDate,
      ardmtranType: selectedARDMType,
      custCode: custCode || "",
      custName: custName || "",
      refDocNo1: refDocNo1 || "",
      refDocNo2: refDocNo2 || "",
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        siNo: row.siNo || "",
        siDate: row.siDate || null,
        siAmount: parseFormattedNumber(row.siAmount || 0),
        appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
        vatCode: row.vatCode || "",
        vatName: row.vatName || "",
        vatRate: row.vatRate || 0,
        vatAmount: parseFormattedNumber(row.vatAmount || 0, 2),
        atcCode: row.atcCode || "",
        atcName: row.atcName || "",
        atcRate: row.atcRate || 0,
        atcAmount: parseFormattedNumber(row.atcAmount || 0, 2),
        arAcct: row.arAcct || "",
        drAcct: row.drAcct || "",
        rcCode: row.rcCode || "",
        currCode: row.currCode || "",
        currRate: parseFormattedNumber(row.currRate || 0, 6),
        refBranchcode: row.refBranchcode || "",
        refDocCode: row.refDocCode || "",
        groupId: row.groupId || "",
      })),
      dt2: glRows.map((entry, index) => ({
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
        slRefDate: normalizeGlRefDate(entry.slRefDate, documentDate) || null,
        remarks: entry.remarks || "",
        dt1Lineno: entry.dt1Lineno || "",
      })),
    });

    if (action === "GenerateGL") {
      try {
        updateState({ detailRowsGL: [], isGeneratingGL: true });

        const newGlEntries = await useGenerateGLEntries(
          docType,
          buildGlData(finalDetailRowsGL)
        );

        updateState({
          detailRowsGL: newGlEntries && newGlEntries.length > 0 ? newGlEntries : [],
          isGeneratingGL: false,
        });
      } catch (error) {
        updateState({ detailRowsGL: [], isGeneratingGL: false });
        console.error(error);
      }
      return;
    }

    if (action === "Upsert") {
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
        updateState({ detailRowsGL: newGlEntries });
      }

      const response = await useTransactionUpsert(
        docType,
        buildGlData(finalDetailRowsGL),
        updateState,
        "ardmId",
        "ardmNo"
      );

      if (response) {


        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint =
          isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(response.data[0].ardmId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

        updateState({
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
};


  const handleAddRow = async () => {
   
    if (!custCode) {
      return;
    }


    if (['ARDM01'].includes(selectedARDMType)) {
      await handleOpenARBalance();
      return;
    }
   


  try {
    const items = await handleFetchDetail(custCode);
    const itemList = Array.isArray(items) ? items : [items];
    const newRows = await Promise.all(itemList.map(async (item) => {

      return {
        lnNo: "",
        siNo: "00000000",
        siDate: documentDate,
        siAmount:"0.00",
        appliedAmount: "0.00",
        vatCode: item.vatCode || "",
        vatName: item.vatName || "",
        vatAmount:"0.00",
        atcCode: item.atcCode || "",
        atcName: item.atcName || "",
        atcAmount:"0.00",
        currCode: currCode,
        currRate: formatNumber(currRate,6) ,
        arAcct:"",
        drAcct:"",
        rcCode:"",
        refBranchcode: branchCode,
        refDocCode:  "ARDM",
        groupId: "",
        atcRate:"0.00",
        vatRate:"0.00"
      };
    }));

      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows,
                    detailRowsGL: []
       });
      updateTotals(updatedRows);


    setTimeout(() => {
      const tableContainer = document.querySelector('.max-h-\\[430px\\]');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);

  } catch (error) {
    console.error("Error adding new row:", error);
    alert("Failed to add new row. Please select a Payee first.");
  }
};




const handleAddRowGL = (index = null) => {
  if (handleFieldBehavior("reversalInvoice")) {
    return;
  }

  const newRow = {
    acctCode: "",
    rcCode: "",
    sltypeCode: "CU",
    slCode: "",
    particulars: "",
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
    remarks: "",
  };

  const updatedRows = [...detailRowsGL];

  if (index !== null && index >= 0) {
    updatedRows.splice(index + 1, 0, newRow);
  } else {
    updatedRows.push(newRow);
  }

  updateState({
    detailRowsGL: updatedRows,
  });
};


  

  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
        detailRows: updatedRows,
        triggerGLEntries:true });
    updateTotals(updatedRows);

  };



  
  const handleDeleteRowGL =  (index) => {
    if(handleFieldBehavior("reversalInvoice")){
      return;
    }

    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows }); 
  };




  const handleFetchDetail = async (custCode) => {
    if (!custCode) return [];
  
    try {
      const custPayload = {
        json_data: {
          custCode: custCode,
        },
      };
      const vendResponse = await postRequest("addCustomerDetail", JSON.stringify(custPayload));
      const rawResult = vendResponse.data[0]?.result;
  
      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
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

  if (documentID && (documentStatus === '')) {
    updateState({ showPostingModal: true });
  }
};





const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }

  if (documentID && (documentStatus === '')) {
    updateState({ showCancelModal: true });
  }
};




const handleAttach = async () => {
  if(documentID){
    updateState({ showAttachModal: true });
  }
};




const handleCopy = async () => {
if (selectedARDMType !== "ARDM02" || !detailRows?.length) {
  return;
  }

  if (documentID ) {
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
                  documentDate:useGetCurrentDayV2(),  
                  noReprints:"0",  
     });
  }
};


  
 
//  ** View Document and Transaction History Retrieval ***
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
  const docNo = params.get("ardmNo");
  const branchCode = params.get("branchCode");

  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);
  



  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType
  };


  const handleCloseCustModal = async (selectedData) => {
    if (!selectedData) {
        updateState({ custModalOpen: false });
        return;
    }

    updateState({ custModalOpen: false });
    updateState({ isLoading: true });

    try {
        const custDetails = {
            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            currCode: selectedData?.currCode || '',
        };

        updateState({
            custName: selectedData.custName,
            custCode: selectedData.custCode
        });
        

        if (!selectedData.currCode) {
            const payload = { CUST_CODE: selectedData.custCode };
            const response = await postRequest("getCustomer", JSON.stringify(payload));

            if (response.success) {
                const data = JSON.parse(response.data[0].result);
                custDetails.currCode = data[0]?.currCode;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }
 

     updateState({
          detailRowsGL: [],
          ...(selectedARDMType !== "ARDM02" && { detailRows: [] }),
          ...updateTotalsDisplay (0, 0, 0, 0),
        });

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({ isLoading: false });
    }
};



  const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalSIAmt = 0;
  let totalApplied = 0;
  let totalVAT = 0;
  let totalATC = 0;


  rows.forEach(row => {

    const perSIAmt = parseFormattedNumber(row.siAmount || 0) || 0;
    const perApplied = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const perVAT = parseFormattedNumber(row.vatAmount || 0) || 0;
    const perATC = parseFormattedNumber(row.atcAmount  || 0) || 0;


    totalSIAmt+= perSIAmt;
    totalApplied+= perApplied;
    totalVAT+= perVAT;
    totalATC += perATC;
  });


    updateTotalsDisplay (totalSIAmt,totalApplied, totalVAT,totalATC);

};




const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    }
   
     const row = updatedRows[index];

     
    if (['arAcct','drAcct'].includes(field)) {
      row[field] = value.acctCode;
    }


    if (field === 'vatCode') {
          row.vatCode = value.vatCode,
          row.vatName = value.vatName;     
      };

    
    if (field === 'atcCode' ){
          row.atcCode = value.atcCode,
          row.atcName = value.atcName;     
        };


    if (field === 'rcCode' ){
          row.rcCode = value.rcCode;
        };





if (runCalculations) {
let vatRate      = parseFormattedNumber(row.vatRate)      || 0;
let atcRate      = parseFormattedNumber(row.atcRate)      || 0;
let origApplied  = parseFormattedNumber(row.appliedAmount) || 0;
let siAmount     = parseFormattedNumber(row.siAmount)     || 0;

const isARDM02 = selectedARDMType === "ARDM02";
const isAllTypes = isARDM02 || selectedARDMType === "ARDM01";


if (field === "appliedAmount") {
  if (isARDM02) {
    siAmount = parseFormattedNumber(row.appliedAmount);
    row.siAmount = formatNumber(siAmount);
  }

  if (isAllTypes) {
    const baseAmount = isARDM02 ? siAmount : origApplied;
    origApplied = Math.min(origApplied, baseAmount);

    row.vatAmount      = formatNumber(origApplied * vatRate);
    row.atcAmount      = formatNumber(origApplied * atcRate);
    row.appliedAmount  = formatNumber(origApplied);
  }
}



if ((field === "vatCode" || field === "atcCode") || field === "appliedAmount") {
  const appliedAmt = parseFormattedNumber(row.appliedAmount);

  const vatAmt = row.vatCode
    ?  getAllTopVatAmount(row.vatCode, appliedAmt)
    : 0;
  row.vatAmount = formatNumber(vatAmt);

  const netOfVat = +(appliedAmt - vatAmt).toFixed(2);
  const atcAmt = row.atcCode
    ?  getAllTopATCAmount(row.atcCode, netOfVat)
    : 0;
  row.atcAmount = formatNumber(atcAmt);
}



}


    updatedRows[index] = row;
    updateState({ detailRows: updatedRows});
    updateTotals(updatedRows);
};





const handleFieldBehavior = (option) => {
  switch (option) {

 case "withoutInvoice":
      return (
        !isFormDisabled ||
        selectedARDMType === "ARDM02" 
      );


 case "wInvoice":
      return (
        !isFormDisabled ||
        selectedARDMType !== "ARDM02" 
      );


 case "disableOnSaved" :
   return (
        isFormDisabled ||
        (selectedARDMType !== "ARDM02" && state.documentID !== "" )
      );



  case "reversalInvoice" :
  case "CWTReversal" :
    return (
      isFormDisabled ||
      ["ARDM03"].includes(selectedARDMType)
      );



    default:
      return false; 
  }
};




  
  const handleARDMTypeChange = (e) => {
   const selectedType = e.target.value;

   updateState({
      detailRowsGL: [],
      selectedARDMType:selectedType,
      ...(selectedARDMType !== "ARDM02" && { detailRows: [] }),
      ...updateTotalsDisplay (0, 0, 0, 0),
    });
  };

  









const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
    let row = { ...updatedRowsGL[index] };


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,custCode,docType);
        if(data) {
            row.acctCode = data.acctCode
            row.sltypeCode = data.sltypeCode
            row.slCode = data.slCode
            row.rcCode = data.rcCode
            row.vatCode = data.vatCode
            row.vatName = data.vatName
            row.atcCode = data.atcCode
            row.atcName = data.atcName
            row.particular = data.particular
        }
    }
    
    if (['debit', 'credit', 'debitFx1', 'creditFx1', 'debitFx2', 'creditFx2'].includes(field)) {
        row[field] = value;
        const parsedValue = parseFormattedNumber(value);
        const pairs = {
          debit: "credit",
          credit: "debit",
          debitFx1: "creditFx1",
          creditFx1: "debitFx1",
          debitFx2: "creditFx2",
          creditFx2: "debitFx2"
        };

    if (parsedValue > 0 && pairs[field]) {
      row[pairs[field]] = "0.00";
    }
  }

    if (['slRefNo', 'slRefDate', 'remarks'].includes(field)) {
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

  if(autoCompute && ((withCurr2 && currCode !== glCurrDefault) || (withCurr3))){
  if (['debit', 'credit', 'debitFx1', 'creditFx1', 'debitFx2', 'creditFx2'].includes(field)) {
    const data = await useUpdateRowEditEntries(row,field,value,currCode,currRate,documentDate); 
        if(data) {
           row.debit = formatNumber(data.debit)
           row.credit = formatNumber(data.credit)
           row.debitFx1 = formatNumber(data.debitFx1)
           row.creditFx1 = formatNumber(data.creditFx1)
           row.debitFx2 = formatNumber(data.debitFx2)
           row.creditFx2 = formatNumber(data.creditFx2)
        }
    }
  }
  else{
    const pairs = [
      ["debit", "credit"],
      ["debitFx1", "creditFx1"],
      ["debitFx2", "creditFx2"]
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

        const specialAccounts = ['arAcct','drAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, accountModalSource, selectedAccount,false);
          updateState({detailRowsGL: []})
        } else {
          handleDetailChangeGL(selectedRowIndex, 'acctCode', selectedAccount);
        }      
    }
    updateState({
        showAccountModal: false,
        selectedRowIndex: null,
        accountModalSource: null
    });
};




const handleCloseRcModalGL = async (selectedRc) => {
  const rowIndex = selectedRowIndex;
  const modalSource = accountModalSource;

  if (selectedRc && rowIndex !== null) {
    if (modalSource !== null) {
      handleDetailChange(rowIndex, "rcCode", selectedRc, false);
    } else {
      const result = await useTopRCRow(selectedRc.rcCode);
      if (result) {
        handleDetailChangeGL(rowIndex, "rcCode", result);
      }
    }
  }

  updateState({
    showRcModal: false,
    selectedRowIndex: null,
    accountModalSource: null,
  });
};



  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {

        if (selectedSl) {
          handleDetailChangeGL(selectedRowIndex, 'slCode', selectedSl);
        }
    }
    updateState({
        showSlModal: false,
        selectedRowIndex: null
    });
};



const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({showAllTranDocNo: data.modalClose});
};


const handleTranDocNoSelection = async (data) => {

    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};




const handleCloseCancel = async (confirmation) => {
    if(confirmation && documentStatus !== "OPEN" && documentID !== null ) {

      const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.reason,updateState);
      if (result.success) 
      {
       useSwalSuccessAlert("Success","Cancellation Completed")  
      }  
     await fetchTranData(documentNo,branchCode);
    }
    updateState({showCancelModal: false});
};



const handleCloseSignatory = async (mode) => {
  
    updateState({ 
        showSpinner: true,
        showSignatoryModal: false,
        noReprints: mode === "Final" ? 1 : 0, });
    await useHandlePrint(documentID, docType, mode, userCode );

    updateState({
      showSpinner: false 
    });

};






const handleOpenARBalance = async () => {
  try {
    updateState({ isLoading: true });

    const groupIdSelected = {
         dt1: detailRows.map((row, index) => ({
          groupId:row.groupId
         }))
    }


    const endpoint ="getOpenARBalance"
    const response = await fetchDataJson(endpoint, { custCode, branchCode, tranType:selectedARDMType, groupIdSelected });
    const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];

    const colConfig = await useSelectedHSColConfig(endpoint);

   if (custData.length === 0) {
      useSwalErrorAlert("Open AR Balance", "There are no AR balance records for the selected customer/branch.")
       updateState({ isLoading: false });
      return; 
    }

    updateState({ globalLookupRow: custData,
                  globalLookupHeader:colConfig,
                  showARBalanceModal: true
      });

  } catch (error) {
    console.error("Failed to fetch Open AR Balance:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to fetch Open AR Balance.",
    });
    updateState({ 
        globalLookupRow: [] ,
        globalLookupHeader: [] });
  }

   updateState({ isLoading: false });
};




const handleCloseARBalance = async (payload) => {


  if (payload && payload !== null) {
    updateState({ isLoading: true });

      const result = await useSelectedOpenARBalance(payload,selectedARDMType);
      if (result) {
        const newRows = result.map((entry, idx) => {
        const netDisc = parseFormattedNumber(entry.netDiscAmt);
        const vatRate = parseFormattedNumber(entry.vatCalcRate);
        const atcRate = parseFormattedNumber(entry.atcCalcRate);

        const vatAmount = netDisc * vatRate;   
        const atcAmount = netDisc * atcRate;   

        return {
          lnNo: idx + 1,
          siNo: entry.siNo,
          siDate: entry.siDate,
          siAmount: formatNumber(netDisc), 
          appliedAmount: formatNumber(netDisc), 
          vatCode: entry.vatCode,
          vatName: entry.vatName,
          vatRate: entry.vatCalcRate,
          vatAmount: formatNumber(vatAmount, 2),
          atcCode: entry.atcCode,
          atcName: entry.atcName,
          atcRate: entry.atcCalcRate,
          atcAmount: formatNumber(atcAmount, 2),
          arAcct: entry.arAcct,
          drAcct:entry.drAcct,
          rcCode: entry.rcCode,
          currCode: entry.currCode,
          currRate: formatNumber(entry.currRate, 6),
          refBranchcode: branchCode,
          refDocCode: entry.refDocCode,
          groupId: entry.groupId,
          };
        });

        const updatedRows = [...detailRows, ...newRows];
        updateState({ detailRows: updatedRows });
        updateTotals(updatedRows);
        
      }  
  }

  updateState({ 
    showARBalanceModal: false,
    isLoading: false
  });
};




const handleSaveAndPrint = async (documentID) => {

    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};












const handleCloseVatModal = async (selectedVat) => { 
  if (selectedVat && selectedRowIndex !== null) {
    
     const result =  getAllTopVatRow(selectedVat.vatCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, 'vatCode', result, true)
        : handleDetailChangeGL(selectedRowIndex, 'vatCode', result);   
  }
  updateState({ showVatModal: false ,
                selectedRowIndex: null,
                accountModalSource: null });
};






const handleCloseAtcModal = async (selectedAtc) => {
  if (selectedAtc && selectedRowIndex !== null) {  

    const result =  getAllTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, 'atcCode', result, true)
        : handleDetailChangeGL(selectedRowIndex, 'atcCode', result);   
  }
  updateState({ showAtcModal: false ,
                selectedRowIndex: null,
                accountModalSource: null });
};



  


const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
      branchCode: selectedBranch.branchCode,
      branchName:selectedBranch.branchName
      })
    }
    updateState({ branchModalOpen: false });
  };





  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
    handleSelectCurrency(selectedCurrency.currCode);
  };
    updateState({ currencyModalOpen: false });
  }



  const handleSelectCurrency = async (currCode) => {
    if (currCode) {

     const result = await useTopCurrencyRow(currCode);
      if (result) {
        const rate = currCode === glCurrDefault
          ? defaultCurrRate
          : await useTopForexRate(currCode, documentDate);

        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate),6)
        });
        

        // Recompute Check Amount on Change of Currency
        const checkAmount = formatNumber(
          parseFormattedNumber(totals.currAmount) * parseFormattedNumber(rate)
          );
        updateState({ checkAmount });  


        
      

        return formatNumber(parseFormattedNumber(rate),6)
      }  
    }
   return formatNumber(1,6)
  };






const renderArdmDetailColumn = (columnKey, row, index) => {
  const columnWidth = getArdmDetailFallbackWidth(columnKey);
  const style = getArdmDetailCellStyle(columnKey, columnWidth);
  const isReversal = handleFieldBehavior("reversalInvoice");

  const focusNextDetailCell = (field) => {
    focusNextArdmDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: ardmDetailEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
    });
  };

  const detailTextInput = (field, options = {}) => (
    <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e) => handleDetailChange(index, field, e.target.value, false)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || isFormDisabled) return; e.preventDefault(); focusNextDetailCell(field); }} />
  );

  const detailLookupCell = (field, onClick, options = {}) => (
    <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer ${options.className || ""}`.trim()} value={row[field] || ""} readOnly onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextDetailCell(field); }} />{!isReversal && !options.hideIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={onClick} />}</div></td>
  );

  const detailAmountInput = (field, options = {}) => (
    <input type="text" id={`${field}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChange(index, field, sanitizedValue, false); }} onFocus={(e) => clearArdmDetailZeroOnFocus(e, { isEditable: !(options.readOnly ?? isFormDisabled), onClear: (value) => handleDetailChange(index, field, value, false) })} onBlur={async (e) => { if (options.readOnly ?? isFormDisabled) return; const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, field, num, true); setFocusedCell(null); }} onKeyDown={async (e) => { if (e.key !== "Enter" || (options.readOnly ?? isFormDisabled)) return; e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, field, num, true); updateState({ detailRowsGL: [] }); focusNextDetailCell(field); }} />
  );

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailTextInput("siNo", { readOnly: true })}</td>,
    siDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`siDate-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.siDate || ""} readOnly={row.groupId !== null && row.groupId !== ""} onChange={(e) => handleDetailChange(index, "siDate", e.target.value, false)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("siDate"); } }} /></td>,
    siAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row.siAmount || ""} readOnly /></td>,
    appliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailAmountInput("appliedAmount", { readOnly: isReversal })}</td>,
    vatCode: () => detailLookupCell("vatCode", () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" })),
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
    vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.vatAmount)) || ""} readOnly /></td>,
    atcCode: () => detailLookupCell("atcCode", () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" })),
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailTextInput("atcName", { readOnly: isFormDisabled })}</td>,
    atcAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.atcAmount)) || ""} readOnly /></td>,
    currCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailTextInput("currCode", { readOnly: true, className: "text-center" })}</td>,
    currRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui text-right" value={row.currRate || ""} readOnly /></td>,
    arAcct: () => detailLookupCell("arAcct", () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" })),
    drAcct: () => detailLookupCell("drAcct", () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "drAcct" })),
    rcCode: () => detailLookupCell("rcCode", () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" })),
  };
  return detailColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
};

const renderArdmGlColumn = (columnKey, row, index) => {
  const columnWidth = getArdmGlFallbackWidth(columnKey);
  const style = getArdmGlCellStyle(columnKey, columnWidth);
  const isReversal = handleFieldBehavior("reversalInvoice");
  const glModalHandlers = { acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: null }), slCode: () => updateState({ selectedRowIndex: index, showSlModal: true, accountModalSource: null }), vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: null }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: null }) };
  const focusNextGlCell = (field) => { focusNextArdmGlRowInput(index, field, { rows: detailRowsGL, zeroClearFields: ardmGlEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value) }); };
  const glTextInput = (field, options = {}) => (<input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />);
  const glLookupCell = (field, options = {}) => { const hasLookupValue = options.alwaysShowIcon || Boolean(String(row[field] || "").trim()); return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full"><input type="text" id={`${field}-${index}`} className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? false} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />{!isReversal && hasLookupValue && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[field]} />}</div></td>; };
  const glAmountInput = (field) => (<input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={isFormDisabled || isReversal} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChangeGL(index, field, sanitizedValue); }} onFocus={(e) => clearArdmGlZeroOnFocus(e, { isEditable: !(isFormDisabled || isReversal), onClear: (value) => handleDetailChangeGL(index, field, value) })} onBlur={(e) => { if (isFormDisabled || isReversal) return; handleBlurGL(index, field, e.target.value); }} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled || isReversal) return; e.preventDefault(); handleBlurGL(index, field, e.target.value, true); focusNextGlCell(field); }} />);
  const glColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    acctCode: () => glLookupCell("acctCode", { alwaysShowIcon: true }),
    rcCode: () => glLookupCell("rcCode", { readOnly: true }),
    sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("sltypeCode", { readOnly: isReversal })}</td>,
    slCode: () => glLookupCell("slCode", { readOnly: true }),
    particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular", { readOnly: isReversal })}</td>,
    vatCode: () => glLookupCell("vatCode", { readOnly: true }),
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
    atcCode: () => glLookupCell("atcCode", { readOnly: true }),
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName", { readOnly: isReversal })}</td>,
    debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("debit")}</td>,
    credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("credit")}</td>,
    debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("debitFx1")}</td>,
    creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("creditFx1")}</td>,
    debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("debitFx2")}</td>,
    creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("creditFx2")}</td>,
    slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("slRefNo", { readOnly: isReversal, maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
    slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate${index}`} value={row.slRefDate || ""} disabled={isReversal} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`slRefDate${index}`] !== undefined) handleDetailChangeGL(index, "slRefDate", updates[`slRefDate${index}`]); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled || isReversal) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("remarks", { readOnly: isReversal, maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
  };
  return glColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
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
            isViewDocument={isViewDocument}  
            onDetails={() => setTopTab("details")}
            onHistory={() => setTopTab("history")}
            disableRouteNavigation={true}         
            detailsRoute="/page/ARDM"


            isSaveDisabled={state.isSaveDisabled || isFormDisabled ||  ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)} 
            isResetDisabled={state.isResetDisabled}
            isAttachDisabled={!documentID}
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
                onClick={() => setActiveTab("basic")}
              >
                Basic Information
              </button>
              {/* Provision for Other Tabs */}
            </div>

            

        {/* SVI Header Form Section - Main Grid Container */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="ardm_hd">
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
                  />

                  <FieldRenderer
                    id="ardmNo"
                    label="ARDM No."
                    type="lookup"
                    value={state.documentNo || ""}
                    disabled={state.isDocNoDisabled}
                    onChange={(val) => updateState({ documentNo: val })}
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCrNoBlur();
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
                    <label
                      htmlFor="documentDate"
                      className={`global-ref-floating-label ${
                        !isFormDisabled
                          ? "global-ref-label-enabled"
                          : "global-ref-label-disabled"
                      }`}
                    >
                      ARDM Date
                    </label>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="global-tran-textbox-group-div-ui">
                  <FieldRenderer
                    id="selectedARDMType"
                    label="ARDM Type"
                    type="select"
                    value={selectedARDMType || ""}
                    disabled={handleFieldBehavior("disableOnSaved")}
                    onChange={(val) => handleARDMTypeChange({ target: { value: val } })}
                    options={ardmTypes.map((t) => ({
                      label: t.DROPDOWN_NAME,
                      value: t.DROPDOWN_CODE,
                    }))}
                  />

                  <FieldRenderer
                    id="custCode"
                    label="Customer Code"
                    required
                    type="lookup"
                    value={custCode || ""}
                    disabled={handleFieldBehavior("disableOnSaved")}
                    readOnly
                    lookupDisabled={isFetchDisabled}
                    onLookup={() => updateState({ custModalOpen: true })}
                  />

                  <FieldRenderer
                    id="custName"
                    label="Customer Name"
                    required
                    type="text"
                    value={custName || ""}
                    disabled
                    readOnly
                  />
                </div>

                {/* Column 3 */}
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
                          if (
                            /^\d*\.?\d{0,6}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            updateState({ currRate: sanitizedValue });
                          }
                        }}
                        onBlur={handleCurrRateNoBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            document.getElementById("refDocNo1")?.focus();
                          }
                        }}
                        onFocus={(e) => {
                          if (parseFormattedNumber(e.target.value) === 0) {
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div className="col-span-full">
                  <div className="relative p-2">
                    <textarea
                      id="remarks"
                      placeholder=""
                      rows={6}
                      className="peer global-tran-textbox-remarks-ui pt-2"
                      value={remarks || ""}
                      onChange={(e) => updateState({ remarks: e.target.value })}
                      maxLength={useGetFieldLength(tblFieldArray, "remarks")}
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

              {/* Column 4 */}
              <div className="global-tran-textbox-group-div-ui flex flex-col">
                <FieldRenderer
                  id="refDocNo1"
                  label="Ref Doc No. 1"
                  type="text"
                  value={refDocNo1 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refDocNo1: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refardm_no1")}
                />

                <FieldRenderer
                  id="refDocNo2"
                  label="Ref Doc No. 2"
                  type="text"
                  value={refDocNo2 || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refDocNo2: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refardm_no2")}
                />
              </div>
       </div>


    </div>
          
          {/* APV Detail Section */}
          <div id="ardm_dtl" className="global-tran-tab-div-ui" >

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className={`global-tran-tab-padding-ui ${
                GLactiveTab === 'invoice'
                  ? 'global-tran-tab-text_active-ui'
                  : 'global-tran-tab-text_inactive-ui'
              }`}
              // onClick={() => updateState({ GLactiveTab: 'invoice' })}
            >
              Invoice Details
            </button>
          </div>
        </div>

      {/* Invoice Details Button */}
      <div className="global-tran-table-main-div-ui">
      <div className="global-tran-table-main-sub-div-ui"> 
        <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
          <thead className="global-tran-thead-div-ui">
            <tr>
              {orderedArdmDetailColumns.map((column) =>
                renderArdmDetailHeader(column.label, column.key, column.width, {
                  orderedColumns: orderedArdmDetailColumns,
                })
              )}
              {!isFormDisabled && (
                <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                    style={transactionActionsHeaderStyle}
                  >
                    Actions
                  </th>
              )}
            </tr>
          </thead>
          <tbody className="relative">
            {sortedArdmDetailRows.map(({ row, originalIndex }) => (
              <tr key={originalIndex} className="global-tran-tr-ui">
                {orderedArdmDetailColumns.map((column) => renderArdmDetailColumn(column.key, row, originalIndex))}
                {!isFormDisabled && (
                  <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
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
        {renderArdmDetailHeaderContextMenu?.()}
      </div>
      </div>

    {/* Invoice Details Footer */}
    <div className="global-tran-tab-footer-main-div-ui">


    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <button
        //  onClick={() =>handleAddRow()}
        onClick={() => handleAddRow()}
        className="global-tran-tab-footer-button-add-ui"
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>



    {/* Totals Section */}
    <div className="global-tran-tab-footer-total-main-div-ui">

    
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Invoice Amount:
        </label>
        <label id="totalSIAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalSIAmount}
        </label>
      </div>

      {/* Total VAT Amount */}
      <div className="global-tran-tab-footer-total-div-ui" >
        <label className="global-tran-tab-footer-total-label-ui">
          {"Total Applied Amount:"}
        </label>
        <label id="totalAppliedAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalAppliedAmount}
        </label>
      </div>

      {/* Total ATC Amount */}
      <div className="global-tran-tab-footer-total-div-ui" >
        <label className="global-tran-tab-footer-total-label-ui">
          Total VAT Amount:
        </label>
        <label id="totalUnappliedAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalVATAmount}
        </label>
      </div>

      {/* Total Payable Amount (Invoice + VAT - ATC) */}

      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total ATC Amount:
        </label>
        <label id="totalBalanceAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalATCAmount}
        </label>
      </div>

    </div>

    
    </div>

    </div>


    
        {/* General Ledger Button */}
        <div className="global-tran-tab-div-ui">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className={`global-tran-tab-padding-ui ${
                GLactiveTab === 'invoice'
                  ? 'global-tran-tab-text_active-ui'
                  : 'global-tran-tab-text_inactive-ui'
              }`}
              onClick={() => updateState({ GLactiveTab: 'invoice' })}
            >
              General Ledger
            </button>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={() => handleActivityOption("GenerateGL")}
              className="global-tran-button-generateGL"
              disabled={isLoading} // Optionally disable button while loading
              style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
            >
              {isLoading ? 'Generating...' : 'Generate GL Entries'}
            </button>
            
          </div>
        </div>

        {/* GL Details Table */}
        <div className="global-tran-table-main-div-ui">
        <div className="global-tran-table-main-sub-div-ui"> 
          <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
            <thead className="global-tran-thead-div-ui">
              <tr>
                {orderedArdmGlColumns.map((column) =>
                  renderArdmGlHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedArdmGlColumns,
                  })
                )}
                {!isFormDisabled && (
                  <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                    style={transactionActionsHeaderStyle}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {sortedArdmGlRows.map(({ row, originalIndex }) => (
                <tr key={originalIndex} className="global-tran-tr-ui">
                  {orderedArdmGlColumns.map((column) => renderArdmGlColumn(column.key, row, originalIndex))}
                  {!isFormDisabled && (
                    <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                      style={transactionActionsCellStyle}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddRowGL(originalIndex)}><FontAwesomeIcon icon={faPlus} /></button>
                        <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRowGL(originalIndex)}><FontAwesomeIcon icon={faTrashAlt} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {renderArdmGlHeaderContextMenu?.()}
        </div>
        </div>




        <div className="global-tran-tab-footer-main-div-ui">

          {/* Add Button */}
          <div className="global-tran-tab-footer-button-div-ui">
            <button
              onClick={handleAddRowGL}
              className="global-tran-tab-footer-button-add-ui"
              style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
            >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
            </button>
          </div>

          

        {/* Totals Section */}
        <div className="global-tran-tab-footer-total-main-div-ui">

          {/* Always show base currency totals */}
          <>
              {/* Total Debit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                  Total Debit ({glCurrDefault}):
                </label>
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                  {totalDebit}
                </label>
              </div>

              {/* Total Credit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                  Total Credit ({glCurrDefault}):
                </label>
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                  {totalCredit}
                </label>
              </div>
          </>

          {/* Totals in Foreign Currency Section */}
          {glCurrDefault !== currCode && (
            <div className="global-tran-tab-footer-total-main-div-ui">
              {/* Total Debit in Forex */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
                  Total Debit ({currCode}):
                </label>
                <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
                  {totalDebitFx1}
                </label>
              </div>

              {/* Total Credit in Forex */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
                  Total Credit ({currCode}):
                </label>
                <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
                  {totalCreditFx1}
                </label>
              </div>
            </div>
          )}
        </div>

        

      </div>



    </div>




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




    {custModalOpen && (
      <CustomerMastLookupModal
        isOpen={custModalOpen}
        onClose={handleCloseCustModal}
      />
    )}




    {showARBalanceModal && (
      <GlobalLookupModalv1
        isOpen={showARBalanceModal}
        data={globalLookupRow}
        btnCaption="Get Selected Invoice"
        title="Open AR Balance"
        endpoint={globalLookupHeader}
        onClose={handleCloseARBalance}
        onCancel={() => updateState({ showARBalanceModal: false })}
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



    {/* RC Code Modal */}
    {showRcModal && (
      <RCLookupModal 
        isOpen={showRcModal}
        onClose={handleCloseRcModalGL}
        source={accountModalSource}
      />
    )}



    {/* VAT Code Modal */}
    {showVatModal && (
      <VATLookupModal  
        isOpen={showVatModal}
        onClose={handleCloseVatModal}
        customParam="OutputService"
      />
    )}



    {/* ATC Code Modal */}
    {showAtcModal && (
      <ATCLookupModal  
        isOpen={showAtcModal}
        onClose={handleCloseAtcModal}
      />
    )}


    {/* SL Code Lookup Modal */}
    {showSlModal && (
      <SLMastLookupModal
        isOpen={showSlModal}
        onClose={handleCloseSlModalGL}
      />
    )}


    {/* Cancellation Modal */}
    {showCancelModal && (
      <CancelTranModal
        isOpen={showCancelModal}
        onClose={handleCloseCancel}
      />
    )}




    {/* {showPostingModal && (
      <PostARDM
        isOpen={showPostingModal}
        onClose={() => updateState({ showPostingModal: false })}
      />
    )}  */}


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
        params={{noReprints,documentID,docType}}
        onClose={handleCloseSignatory}
        onCancel={() => updateState({ showSignatoryModal: false })}
      />
    )}



  
      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{branchCode,branchName,docType,documentTitle,fieldNo : "ardmNo"}}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{documentNo}}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )} 

      
       
     



 {showSpinner && <LoadingSpinner />}
  </div>


 <div className={topTab === "history" ? "" : "hidden"}>
  <AllTranHistory
    showHeader={false}
    isActive={topTab === "history"}
    endpoint="/getARDMHistory"
    cacheKey={`ARDM:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
    activeTabKey="ARDM_Summary"
    branchCode={state.branchCode}
    startDate={state.fromDate}
    endDate={state.toDate}
     status="All"
    onRowDoubleClick={handleHistoryRowPick}
    historyExportName={`${documentTitle} History`}
  />
</div>


</div>
);
// End of Return



};

export default ARDM;
