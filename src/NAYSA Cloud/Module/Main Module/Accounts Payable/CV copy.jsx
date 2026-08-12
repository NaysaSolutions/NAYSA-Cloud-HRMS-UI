import React, { useState, useEffect, useRef, useCallback  } from "react";
import Swal from 'sweetalert2';
import { useNavigate, useLocation } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt, faFolderOpen, faSpinner } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import CheckPrintPreviewModal from "../../../Lookup/SearchCheckPrinting.jsx";


// Configuration
import { fetchData , postRequest, fetchDataJsonLookup } from '../../../Configuration/BaseURL.jsx'
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
  useTopVatRow,
  useTopATCRow,
  useTopRCRow,
  useTopAccountRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopVatAmount,
  useTopATCAmount,
  useTopBankRow,
  useTopBankMastRow,
} from '@/NAYSA Cloud/Global/top1RefTable';

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';


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
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from '@/NAYSA Cloud/Global/behavior.jsx';


import {
  useSelectedOpenAPBalance,
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from '@/NAYSA Cloud/Components/Header';


const CV = () => {
   const loadedFromUrlRef = useRef(false);
   const navigate = useNavigate();
   const location = useLocation(); 
   const { companyInfo, currentUserRow,getAllDropDown,refsLoaded ,getAllTopATCRow, getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
   const [isViewDocument, setIsViewDocument] = useState(false);
   const [showCheckPreview, setShowCheckPreview] = useState(false);
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
   const docType = docTypes.CV; 
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
    documentDate:useGetCurrentDayV2(),   
    documentNo: "",
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
    vendCode: "",
    vendName: "",
    
    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    tblFieldArray :[],
    cvWithApvDd :[],
    cvTranTypeDd:[],
    cvPayTypeDd:[],
    refDocNo1: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
    remarks: "",
    bankCode: "",
    bankAcctName: "",
    bankAcctNo: "",
    checkNo: "",
    amtInWords: "",
    checkDate: useGetCurrentDayV2(), 
    selectedWithAPV : "Y",
    selectedCvType : "APV01",
    selectedPayType : "CV01",
    userCode: currentUserRow?.userCode||"", 

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    apTypeDd:[],
    
    globalLookupRow:[],
    globalLookupHeader:[],

    selectedApType : "APV01",

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
    showAccountVATModal:false,
    showRcModal:false,
    showVatModal:false,
    showAtcModal:false,
    showBillCodeModal:false,
    showSlModal:false,
    showBilltermModal:false,
    showAPBalanceModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    payeeModalOpen:false,
    billtermModalOpen:false,
    paytermModalOpen:false,
    bankModalOpen:false,
    showCancelModal:false,
    showPostModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
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
  vendCode,
  vendName,
  currCode,
  currName,
  currRate,
  refDocNo1,
  refDocNo2,
  remarks,
  bankCode,
  bankAcctName,
  bankAcctNo,
  checkNo,
  checkDate,
  amtInWords,
  currAmount,

  selectedWithAPV,
  selectedPayType,
  selectedCvType,

  withAPV,
  paymentType,
  cvType,

  tblFieldArray,
  cvWithApvDd,
  cvTranTypeDd,
  cvPayTypeDd,

  // Transaction details
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

  selectedApType,
  apType,
  cvApTypeDd,


  // Contexts
  modalContext,
  selectionContext,
  selectedRowIndex,
  accountModalSource,

  // Modals
  showAccountModal,
  showAccountVATModal,
  showRcModal,
  showVatModal,
  showAtcModal,
  showSlModal,
  currencyModalOpen,
  branchModalOpen,
  payeeModalOpen,
  bankModalOpen,
  showCancelModal,
  showPostModal,
  showAttachModal,
  showSignatoryModal,
  showAPBalanceModal,
  showAllTranDocNo


} = state;







  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled =
  isViewDocumentUrl ||
  ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  const FIELD_CONFIG = {
    apType: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    apvNo: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    rrNo: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    poNo: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    appliedAmount: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    unappliedAmount: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    balance: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    apAcct: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
    siNo: { requireWithAPV: "ANY", hideOnCvTypes: ["APV02"] },
    siDate: { requireWithAPV: "ANY", hideOnCvTypes: ["APV02"] },
    origAmount: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    currCode: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    currRate: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    siAmount: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    debitAcct: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    rcCode: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    rcName: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    slCode: { requireWithAPV: "ANY", hideOnCvTypes: [] },
    vatCode: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    vatName: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    vatAmount: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    atcCode: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    atcName: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    atcAmount: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    vatAcct: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
    amountDue: { requireWithAPV: "ANY", hideOnCvTypes: [] },
  };

  const isVisible_Dtl1 = (field, cvType, withAPV) => {
    const cfg = FIELD_CONFIG[field];
    if (!cfg) return true;
    if (cfg.requireWithAPV === "Y" && withAPV !== "Y") return false;
    if (cfg.requireWithAPV === "N" && withAPV !== "N") return false;
    if (cfg.hideOnCvTypes?.includes(cvType)) return false;
    return true;
  };

  const allCvDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "apType", label: "AP Type", width: 120 },
    { key: "apvNo", label: "APV No.", width: 120 },
    { key: "rrNo", label: "RR No.", width: 120 },
    { key: "poNo", label: "PO/JO No.", width: 120 },
    { key: "siNo", label: "Invoice No.", width: 130 },
    { key: "siDate", label: "Invoice Date", width: 130 },
    { key: "origAmount", label: "Original Amount", width: 140 },
    { key: "currCode", label: "Currency", width: 110 },
    { key: "currRate", label: "Currency Rate", width: 130 },
    { key: "siAmount", label: "Invoice Amount", width: 140 },
    { key: "appliedAmount", label: "Applied", width: 130 },
    { key: "unappliedAmount", label: "Unapplied", width: 130 },
    { key: "balance", label: "Balance", width: 130 },
    { key: "debitAcct", label: "DR Account", width: 120 },
    { key: "apAcct", label: "AP Account", width: 120 },
    { key: "vatAcct", label: "VAT Account", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 220 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "atcAmount", label: "ATC Amount", width: 130 },
    { key: "amountDue", label: "Amount Due", width: 130 },
  ];
  const cvDetailColumnDefs = allCvDetailColumnDefs.filter(
    (column) => column.key === "ln" || isVisible_Dtl1(column.key, selectedCvType, selectedWithAPV)
  );
  const {
    getColumnStyle: getCvDetailColumnStyle,
    getFrozenColumnStyle: getCvDetailFrozenStyle,
    getOrderedColumns: getOrderedCvDetailColumns,
    getSortedRows: getSortedCvDetailRows,
    clearZeroValueOnFocus: clearCvDetailZeroOnFocus,
    focusNextRowInput: focusNextCvDetailRowInput,
    renderHeaderContextMenu: renderCvDetailHeaderContextMenu,
    renderResizableHeader: renderCvDetailHeader,
  } = useResizableTableColumns(cvDetailColumnDefs);
  const orderedCvDetailColumns = getOrderedCvDetailColumns(cvDetailColumnDefs);
  const getCvDetailFallbackWidth = (key) =>
    cvDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCvDetailCellStyle = (key, fallbackWidth) => ({
    ...getCvDetailColumnStyle(key, fallbackWidth),
    ...getCvDetailFrozenStyle(key, orderedCvDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedCvDetailRows = getSortedCvDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );

  const cvGlColumnDefs = [
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
    { key: "slRefDate", label: "SL Ref. Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 140 },
  ];
  const {
    getColumnStyle: getCvGlColumnStyle,
    getFrozenColumnStyle: getCvGlFrozenStyle,
    getOrderedColumns: getOrderedCvGlColumns,
    getSortedRows: getSortedCvGlRows,
    setColumnOrder: setCvGlColumnOrder,
    clearZeroValueOnFocus: clearCvGlZeroOnFocus,
    focusNextRowInput: focusNextCvGlRowInput,
    renderHeaderContextMenu: renderCvGlHeaderContextMenu,
    renderResizableHeader: renderCvGlHeader,
  } = useResizableTableColumns(cvGlColumnDefs);
  const orderedCvGlColumns = getOrderedCvGlColumns(cvGlColumnDefs);
  const getCvGlFallbackWidth = (key) =>
    cvGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCvGlCellStyle = (key, fallbackWidth) => ({
    ...getCvGlColumnStyle(key, fallbackWidth),
    ...getCvGlFrozenStyle(key, orderedCvGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setCvGlColumnOrder(cvGlColumnDefs.map((column) => column.key));
  }, [setCvGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedCvGlRows = getSortedCvGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const cvDetailEnterNextRowZeroClearFields = [
    "origAmount",
    "currRate",
    "appliedAmount",
    "unappliedAmount",
    "atcAmount",
    "amountDue",
  ];
  const cvGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];



  //Variables


  const [totals, setTotals] = useState({
  totalOriginalAmount: '0.00',
  totalInvoiceAmount: '0.00',
  totalAppliedAmount: '0.00',
  totalUnappliedAmount: '0.00',
  TotalBalanceAmount: '0.00',
  totalVatAmount: '0.00',
  totalAtcAmount: '0.00',
  totalAmountDue: '0.00',

  totalFxOriginalAmount: '0.00',
  totalFxInvoiceAmount: '0.00',
  totalFxAppliedAmount: '0.00',
  totalFxUnappliedAmount: '0.00',
  TotalFxBalanceAmount: '0.00',
  totalFxVatAmount: '0.00',
  totalFxAtcAmount: '0.00',
  totalFxAmountDue: '0.00',

  });

  const customParamMap = {
        debitAcct: glAccountFilter.ActiveAll,
        apAcct: glAccountFilter.ActiveAll,
        vatAcct: glAccountFilter.VATInputAcct
  };
  const customParam = customParamMap[accountModalSource] || null;



  const updateTotalsDisplay = (originalAmt, invoiceAmt, appliedAmt, unappliedAmt, balanceAmt, vat, atc, amtDue) => {
  //console.log("updateTotalsDisplay received RAW totals:", { InvoiceAmt, discAmt, netDisc, vat, atc, amtDue });
    setTotals({
          totalOriginalAmount: formatNumber(originalAmt),
          totalInvoiceAmount: formatNumber(invoiceAmt),
          totalAppliedAmount: formatNumber(appliedAmt),
          totalUnappliedAmount: formatNumber(unappliedAmt),
          TotalBalance: formatNumber(balanceAmt),
          totalVatAmount: formatNumber(vat),
          totalAtcAmount: formatNumber(atc),
          totalAmountDue: formatNumber(amtDue),

          totalFxOriginalAmount: formatNumber(originalAmt),
          totalFxInvoiceAmount: formatNumber(invoiceAmt / currRate),
          totalFxAppliedAmount: formatNumber(appliedAmt / currRate),
          totalFxUnappliedAmount: formatNumber(unappliedAmt / currRate),
          TotalFxBalance: formatNumber(balanceAmt / currRate),
          totalFxVatAmount: formatNumber(vat / currRate),
          totalFxAtcAmount: formatNumber(atc / currRate),
          totalFxAmountDue: formatNumber(amtDue / currRate),

      });
  };



  useEffect(() => {
    const debitSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
    const debitFx2Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
    const creditFx2Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);
  updateState({
    totalDebit: formatNumber(debitSum),
    totalCredit: formatNumber(creditSum),
    totalDebitFx1: formatNumber(debitFx1Sum),
    totalCreditFx1: formatNumber(creditFx1Sum),
    totalDebitFx2: formatNumber(debitFx2Sum),
    totalCreditFx2: formatNumber(creditFx2Sum)
  })
  }, [detailRowsGL]);




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
  }, [vendCode]);

 
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
    if (vendName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map(row => ({
        ...row,
        currency: vendName.currCode
      }));
       updateState({ detailRows: updatedRows });
    }
  }, [vendName?.currCode]);


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



 useEffect(() => {
  if (!refsLoaded) return;

  const cvPayType = getAllDropDown("PAY_TYPE", docType);
  const cvTranType = getAllDropDown("CVTRAN_TYPE", docType);
  const cvWithApv = getAllDropDown("WITH_APV", docType);
  const cvApType = getAllDropDown("APVTRAN_TYPE", "APV");

  const newState = {};

  if (cvPayType?.length > 0) {
    newState.cvPayTypeDd = cvPayType;
    newState.selectedPayType = "CV01";
  }
  if (cvTranType?.length > 0) {
    newState.cvTranTypeDd = cvTranType;
    newState.selectedCvType = "APV01";
  }
  if (cvWithApv?.length > 0) {
    newState.cvWithApvDd = cvWithApv;
    newState.selectedWithAPV = "Y";
  }
  if (cvApType?.length > 0) {
    newState.cvApTypeDd = cvApType;
    newState.selectedApType = "APV01";
  }

  if (Object.keys(newState).length > 0) {
    updateState(newState);
  }

}, [docType, refsLoaded]); // Re-run when docType changes or refs finish loading



  const handleReset = () => {
    

    // Correct way to update the state with a single header object
    updateState({
        branchCode: currentUserRow?.branchCode||"",
        branchName: currentUserRow?.branchName||"",
        userCode:currentUserRow?.userCode||"",
        documentDate:useGetCurrentDayV2(),
        withAPV: "Y",

        bankCode: state.defaultBankCode || "",
        bankAcctName: state.defaultBankAcctName || "",
        bankAcctNo: state.defaultBankAcctNo || "",
        checkNo: state.defaultCheckNo || "",
        checkDate:useGetCurrentDayV2(),

        paymentType: "Y",
        cvType: "APV01",
        refDocNo1: "",
        refDocNo2:"",
        fromDate:null,
        toDate:null,
        remarks:"",
        vendName:"",
        vendCode:"",
        documentNo: "",
        documentID: "",
        detailRows: [],
        detailRowsGL:[],
        documentStatus:"",
        
        // UI state
        activeTab: "basic",
        GLactiveTab: "invoice",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
        status:"Open"
    });

    updateTotalsDisplay(0, 0, 0, 0, 0, 0, 0, 0);

};

const loadCompanyData = async () => {

    updateState({isLoading:true})

    try {
      
      // 🔹 Default Disbursement Bank
      const company = await useTopCompanyRow();
      if (company) {
        updateState({ bankCode: company.disbBankcode });

        const bank = await useTopBankMastRow(company.disbBankcode);
        if (bank) {
          updateState({
            bankCode: bank.bankCode,
            bankAcctName: bank.acctName,
            bankAcctNo: bank.bankAcctNo,
            checkNo: bank.checkNo,
            
            defaultBankCode: bank.bankCode,
            defaultBankAcctName: bank.acctName,
            defaultBankAcctNo: bank.bankAcctNo,
            defaultCheckNo: bank.checkNo,
          });
        }
      }

      // 🔹 Field Lengths
      const hdtblcol_result = await useFieldLenghtCheck(
            "cv_hd,cv_dt1,cv_dt2"
          );
      
          if (hdtblcol_result) {
            updateState({ tblFieldArray: hdtblcol_result });
          }

    } catch (err) {
      console.error("Error fetching data:", err);
    }
     updateState({isLoading:false})
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

  const loadDocControl = async () => {
      const data = await useTopDocControlRow(docType);
      if(data){
      updateState({
        documentName: data.docName,
        documentSeries: data.docName,
        tdocumentDocLen: data.docName,
        });
      };
  };




const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"cvNo",direction);


    if (!data?.cvId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }



    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      
      ...item,
      siDate: item.siDate ? useformatToDatev2(item.siDate): "",
      origAmount: formatNumber(item.origAmount),
      currRate: formatNumber(item.currRate),
      siAmount: formatNumber(item.siAmount),
      appliedAmount: formatNumber(item.appliedAmount),
      unappliedAmount: formatNumber(item.unappliedAmount),
      balance: formatNumber(item.balance),
      vatAmount: formatNumber(item.vatAmount),
      atcAmount: formatNumber(item.atcAmount),
      amountDue: formatNumber(item.amountDue),

      
    }));

    const formattedGLRows = (data.dt2 || []).map(glRow => ({
      ...glRow,
      debit: formatNumber(glRow.debit),
      credit: formatNumber(glRow.credit),
      debitFx1: formatNumber(glRow.debitFx1),
      creditFx1: formatNumber(glRow.creditFx1),
      debitFx2: formatNumber(glRow.debitFx2),
      creditFx2: formatNumber(glRow.creditFx2),
      // slRefDate: useformatToDatev2(glRow.slRefDate),
    }));

  
    console.log(data)
    // Update state with fetched data
    updateState({
      documentStatus: data.cvStatus,
      status: data.docStatus,
      noReprints: data.noReprints,
      documentID: data.cvId,
      documentNo: data.cvNo,
      branchCode: data.branchCode,
      branchName: data.branchName,
      amtInWords: data.amtInWords,
      documentDate: useformatToDatev2(data.cvDate),
      selectedCvType: data.cvtranType,
      selectedWithAPV: data.withAPV,
      selectedPayType: data.payType,
      vendCode: data.vendCode,
      vendName: data.vendName,
      bankCode: data.bankCode,
      bankAcctName: data.bankAcctName,
      bankAcctNo: data.bankAcctNo,
      checkNo: data.checkNo,
      checkDate:useformatToDatev2(data.checkDate),
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      currAmount: formatNumber(data.currAmount, 2),
      currRate: formatNumber(data.currRate, 6),
      currCode: data.currCode,
      currName: data.currName,
      amount: formatNumber(data.amount, 2),
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


const handleCvNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};

const handleWithAPVChange = (e) => {
  const selectedWithAPV = e.target.value; 
  updateState({ selectedWithAPV: selectedWithAPV }); 
};

const handlePayTypeChange = (e) => {
  const selectedPayType = e.target.value; 
  updateState({ selectedPayType: selectedPayType }); 
};

const handleCvTypeChange = (e) => {
  const selectedCvType = e.target.value;
  updateState({ selectedCvType: selectedCvType });
};




const handleCurrRateNoBlur = (e) => {
  
  const num = formatNumber(e.target.value, 6);
  updateState({ 
        currRate: isNaN(num) ? "0.000000" : num,  
        withCurr2:((glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D"),
        withCurr3:glCurrMode === "T"
        })

};




 const handleActivityOption = async (action) => {
   
  if (action === "Upsert" && detailRowsGL.length === 0) {
    updateState({ triggerGLEntries: true });
    return;
  }

  if (documentStatus === '') {
   
  updateState({ isLoading: true });

    const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedWithAPV,
        selectedCvType,
        selectedPayType,
        vendCode,
        vendName,
        bankCode,
        bankAcctName,
        bankAcctNo,
        checkNo,
        checkDate,
        refDocNo1,
        refDocNo2,
        OrigAmt,
        currCode,
        currName,
        currRate,
        CheckAmt,
        remarks,
        detailRows,
        detailRowsGL
    } = state;


    if (action === "Upsert") {
      const payTypeObj = cvPayTypeDd.find(opt => opt.DROPDOWN_CODE === selectedPayType);
      const isCheckPayment = payTypeObj && payTypeObj.DROPDOWN_CODE.toUpperCase().includes("CV01");

      if (isCheckPayment && (!checkNo || checkNo.trim() === "")) {
        updateState({ isLoading: false });
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Check No. is required when the Payment Type is Check.',
        });
        return; // Stop the save process
      }
    }


    const glData = {
      branchCode: branchCode,
      cvNo: documentNo || "",
      cvId: documentID || "",
      cvDate: documentDate,
      checkDate: checkDate,
      withAPV: selectedWithAPV,
      vendCode: vendCode,
      vendName: vendName,
      cvtranType: selectedCvType,
      payType: selectedPayType,
      bankCode: bankCode,
      bankAcctName: bankAcctName,
      bankAcctNo: bankAcctNo,
      checkNo: checkNo,
      refDocNo1: refDocNo1,
      refDocNo2: refDocNo2,
      currAmount: parseFormattedNumber(totals.totalAmountDue),
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      checkAmt: parseFormattedNumber(totals.totalFxAmountDue),
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),       
        apvNo: row.apvNo,
        apvDate: row.apvDate,
        rrNo: row.rrNo || "",
        poNo: row.poNo || "",
        siNo: row.siNo || "",
        // siDate: useformatToDatev2(row.siDate) || useformatToDatev2(documentDate),
        siDate: row.siDate,
        origAmount: parseFormattedNumber(row.origAmount || 0),
        currCode: row.currCode || "",
        currRate: parseFormattedNumber(row.currRate),
        siAmount: parseFormattedNumber(row.siAmount || 0),
        appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
        appliedFx: parseFormattedNumber(row.appliedFx || 0),
        unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
        balance: parseFormattedNumber(row.balance || 0),
        apAcct: row.apAcct,
        debitAcct: row.debitAcct,
        vatAcct: row.vatAcct,
        rcCode: row.rcCode,
        rcName: row.rcName,
        slCode: row.slCode,
        vatCode: row.vatCode,
        vatName: row.vatName,
        vatAmount: parseFormattedNumber(row.vatAmount || 0),
        atcCode: row.atcCode || "",
        atcName: row.atcName || "",
        atcAmount: parseFormattedNumber(row.atcAmount),
        amountDue: parseFormattedNumber(row.amountDue || 0),
        groupId: row.groupId || ""
      })),
       dt2: detailRowsGL.map((entry, index) => ({
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
          // slRefDate: entry.slRefDate && !isNaN(new Date(entry.slRefDate).getTime())
          //   ? new Date(entry.slRefDate).toISOString().split("T")[0]
          //   : null,
          // slRefDate: entry.slRefDate && !isNaN(new Date(entry.slRefDate).getTime())
          //   ? new Date(entry.slRefDate).toISOString().split("T")[0]
          //   : null,
          // slRefDate: useformatToDatev2(entry.slRefDate),
          slrefDate: entry.slrefDate,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || ""
        }))
    };

    if (action === "GenerateGL") {
        try {
            const newGlEntries = await useGenerateGLEntries(docType, glData);

            if (newGlEntries) {
                updateState({ detailRowsGL: newGlEntries });
            } else {
                console.warn("GL entries generation failed or returned no data.");
            }
        } catch (error) {
            console.error("Error during GL generation:", error);
        } finally {
            updateState({ isLoading: false });
        }
    }




    if (action === "Upsert") {
        try {

          const response = await useTransactionUpsert(docType, glData, updateState, 'cvId', 'cvNo');
          if (response) {

            const isZero = Number(noReprints) === 0;
            const onSaveAndPrint =
              isZero
                ? () => updateState({ showSignatoryModal: true })                  
                : () => handleSaveAndPrint(response.data[0].cvId); 
            useSwalshowSaveSuccessDialog(
              handleReset,
              onSaveAndPrint
            );
          }

         
           
        } catch (error) {
            console.error("Error during transaction upsert:", error);
        } finally {
            updateState({ isLoading: false});
        }

        updateState({isDocNoDisabled: true,isFetchDisabled: true,});
    }
  }

};


  const handleAddRow = async (insertIndex = null) => {

 if(selectedWithAPV ==="Y" ) {
      await handleOpenAPBalance();
      return;
    }

  try {
    const items = await handleFetchDetail(vendCode);
    const itemList = Array.isArray(items) ? items : [items];
        const newRows = await Promise.all(
      itemList.map(async (item) => {
        console.log(insertIndex !== null ? "insert below" : "add");

      return {
        lnNo: "",
        // siDate: documentDate,
        siDate: useGetCurrentDayV2(),
        origAmount:"0.00",
        uomCode: "",
        siAmount: "0.00",
        appliedAmount: "0.00",
        unappliedAmount: "0.00",
        balance: "0.00",
        currCode: currCode,
        currRate: formatNumber(currRate,6) ,
        vatCode: selectedCvType === "APV02" ? "" : (item.vatCode || ""),
        vatName: selectedCvType === "APV02" ? "" : (item.vatName || ""),
        vatAmount: selectedCvType === "APV02"
          ? "0.00"
          : (formatNumber(parseFormattedNumber(item.vatAmount)) || "0.00"),

        atcCode: selectedCvType === "APV02" ? "" : (item.atcCode || ""),
        atcName: selectedCvType === "APV02" ? "" :  (item.atcName || ""),
        atcAmount: selectedCvType === "APV02"
          ? "0.00"
          : (formatNumber(parseFormattedNumber(item.atcAmount)) || "0.00"),

        sviAmount: "0.00",
        amountDue: "0.00",
        apAcct: "",
        debitAcct: "",       
        vatAcct: item.vatAcct || "",
        discAcct: "",
        rcCode: "",
        rcName: "",
        slCode: vendCode
        
      };
    }));

    let updatedRows = [...detailRows];

    if (insertIndex !== null && insertIndex >= 0) {
      updatedRows.splice(insertIndex + 1, 0, ...newRows);
    } else {
      updatedRows = [...updatedRows, ...newRows];
    }

    updatedRows = updatedRows.map((row, index) => ({
      ...row,
      lnNo: String(index + 1),
    }));

    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
    });

    updateTotals(updatedRows);

    setTimeout(() => {
      const tableContainer = document.querySelector(".max-h-\\[430px\\]");
      if (!tableContainer) return;

      if (insertIndex === null) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  } catch (error) {
    console.error("Error adding new row:", error);
    alert("Failed to add new row. Please select a Payee first.");
  }
};






const handleAddRowGL = (index = null) => {
    if (!Array.isArray(detailRows) || detailRows.length === 0) {
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


  

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });
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
  
      const vendResponse = await postRequest("addPayeeDetail", JSON.stringify(vendPayload));
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
    setShowCheckPreview(true);
    // updateState({ showSignatoryModal: true });
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


const handlePost = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID && (documentStatus === '')) {
    updateState({ showPostModal: true });
  }
};





const handleAttach = async () => {
    updateState({ showAttachModal: true });
};




const handleCopy = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID ) {
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
                  documentDate:useGetCurrentDayV2(), 
                  noReprints:"0",

                  bankCode: state.defaultBankCode || "",
                  bankAcctName: state.defaultBankAcctName || "",
                  bankAcctNo: state.defaultBankAcctNo || "",
                  checkNo: state.defaultCheckNo || "",
                  checkDate:useGetCurrentDayV2(),

      detailRows: detailRows.map((row) => ({
        ...row,
        siNo: "",
        poNo: "",
      })),
     });
  }
};



 //  ** View Document and Transaction History Retrieval ***
  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
   }, []);
 
 
   const handleHistoryRowPick = useCallback(async (row) => {
     const docNo = row?.docNo;
     const branchCode = row?.branchCode;
     if (!docNo || !branchCode) return;
     await fetchTranData(docNo, branchCode);
     setTopTab("details");
     cleanUrl();
   }, [fetchTranData, cleanUrl]);
 
 
   useEffect(() => {
     const params = new URLSearchParams(location.search);
     const docNo = params.get("cvNo");         
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


  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
        updateState({ payeeModalOpen: false });
        return;
    }

    updateState({ payeeModalOpen: false });

    try {
        const payeeDetails = {
            vendCode: selectedData?.vendCode || '',
            vendName: selectedData?.vendName || '',
            currCode: selectedData?.currCode || '',
        };

        updateState({
            vendName: selectedData.vendName,
            vendCode: selectedData.vendCode
        });
        
        if (!selectedData.currCode) {
            const payload = { VEND_CODE: selectedData.vendCode };
            const response = await postRequest("getPayee", JSON.stringify(payload));

            if (response.success) {
                const data = JSON.parse(response.data[0].result);
                payeeDetails.currCode = data[0]?.currCode;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        await Promise.all([
            handleSelectCurrency(payeeDetails.currCode)
        ]);

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({ isLoading: false });
    }
};


  const updateTotals = (rows) => {

  let totalOriginal = 0;
  let totalInvoice = 0;
  let totalApplied = 0;
  let totalUnpplied = 0;
  let totalBalance = 0;
  let totalVAT = 0;
  let totalATC = 0;
  let totalAmtDue = 0;

  rows.forEach(row => {

    const originalAmount = parseFormattedNumber(row.origAmount || 0) || 0;
    const invoiceAmount = parseFormattedNumber(row.siAmount || 0) || 0;
    const appliedAmount = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const unappliedAmount = parseFormattedNumber(row.unappliedAmount || 0) || 0;
    const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
    const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
    const balanceAmount = parseFormattedNumber(row.amountDue || 0) || 0;

    totalOriginal+= originalAmount;
    totalInvoice+= invoiceAmount;
    totalApplied+= appliedAmount;
    totalUnpplied+= unappliedAmount;
    totalBalance+= balanceAmount;
    totalVAT += vatAmount;
    totalATC += atcAmount;
  });

  if (selectedWithAPV === "Y") {
  totalAmtDue = totalBalance; 
};
  if (selectedWithAPV === "N") {
  totalAmtDue = totalBalance; 
};

    updateTotalsDisplay (totalOriginal, totalInvoice, totalApplied, totalUnpplied, totalBalance, totalVAT, totalATC, totalAmtDue);

  };



const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    }
   
     const row = updatedRows[index];

      if (field === 'vatCode') {
          row.vatCode = value.vatCode,
          row.vatAcct = value.acctCode,
          row.vatName = value.vatName;     
        };

      if (field === 'atcCode' ){
          row.atcCode = value.atcCode,
          row.atcName = value.atcName;     
        };

      if (['debitAcct', 'apAcct', 'vatAcct'].includes(field)) {
        row[field] = value.acctCode;
      
      // NEW: If it's a DR account and requires an RC, set to REQ RC
      if (field === 'debitAcct' && (value.rcReq === 'Y')) {
          row.rcCode = "REQ RC";
          row.rcName = "REQ RC";
      }
    };
  



    if (field === 'rcCode' ){
          row.rcCode = value.rcCode   
          row.rcName = value.rcName  
          
    };


    if (field === 'slCode' ){
          row.slCode = value.slCode   
          
    };

  if (runCalculations) {  
  const origAmount = parseFormattedNumber(row.origAmount) || 0;
  const origCurrRate = formatNumber(parseFormattedNumber(row.currRate),6) || 0;
  
  const origInvoiceAmount = parseFormattedNumber(row.siAmount) || 0;
  const origApplied = parseFormattedNumber(row.appliedAmount) || 0;
  const origUnapplied = parseFormattedNumber(row.unappliedAmount) || 0;
  const origBalance = parseFormattedNumber(row.balanceAmount) || 0;
  const origAmtDue = parseFormattedNumber(row.amountDue) || 0;
  const origVatCode = row.vatCode || "";
  const origAtcCode = row.atcCode || "";
  const cvType = row.cvType || "APV01"; 
  const withAPV = row.withAPV || "Y";

    const applied = parseFormattedNumber(row.appliedAmount) || 0;
    const unapplied = parseFormattedNumber(row.unappliedAmount) || 0;

  // Shared calculation logic
  async function recalcRow(newAppliedAmount, newUnapplied) {
    const newInvoiceAmount = (origAmount * origCurrRate).toFixed(2);
    const finalAppliedAmount = cvType === "APV01" && withAPV === "Y" ? newInvoiceAmount : newAppliedAmount; 
    const newBalance = +(finalAppliedAmount - newUnapplied).toFixed(2);
    const newVatAmount = origVatCode ? await useTopVatAmount(origVatCode, newBalance) : 0;
    const newNetOfVat = +(newBalance - newVatAmount).toFixed(2);
    const newATCAmount = origAtcCode ? await useTopATCAmount(origAtcCode, newNetOfVat) : 0;

    row.siAmount = formatNumber(newInvoiceAmount);
    row.balanceAmount = formatNumber(newBalance);
    row.vatAmount = formatNumber(newVatAmount);
    row.atcAmount = formatNumber(newATCAmount);
    row.appliedAmount = formatNumber(applied);
    row.unappliedAmount = formatNumber(unapplied);
    row.balance = +(applied - unapplied).toFixed(2);
    row.origAmount = formatNumber(parseFormattedNumber(row.origAmount));
    row.currRate = formatNumber(parseFormattedNumber(row.currRate),6);

    
  if (selectedWithAPV === "Y") {
      row.amountDue = +(applied - unapplied).toFixed(2);
  };
  if (selectedWithAPV === "N") {
      row.amountDue = +(newInvoiceAmount - newATCAmount).toFixed(2);
  } 

  }

  if (field === 'origAmount' || field === 'currRate' || field === 'appliedAmount' || field === 'unappliedAmount') {
    const newAppliedAmount = cvType === "APV01" && withAPV === "Y" ? row.appliedAmount : origInvoiceAmount; 
    const newUnapplied = parseFormattedNumber(row.unappliedAmount) || 0;
    const newATCAmount = parseFormattedNumber(row.atcAmount) || 0;
    const newInvoiceAmount = +(origAmount * origCurrRate).toFixed(2);
    const newBalance = +(newInvoiceAmount - newAppliedAmount - newUnapplied).toFixed(2);

    row.siAmount = newInvoiceAmount.toFixed(2);
    row.balanceAmount = newBalance.toFixed(2);

  if (selectedWithAPV === "Y") {
      row.amountDue = +(applied - unapplied).toFixed(2);
  };
  if (selectedWithAPV === "N") {
      row.amountDue = +(newBalance - newATCAmount).toFixed(2);
  } 

    await recalcRow(newAppliedAmount, newUnapplied);
  }

  // Handling VAT and ATC code updates
  if (field === 'vatCode' || field === 'atcCode') {
    async function updateVatAndAtc() {
      const newInvoiceBal = +(parseFormattedNumber(row.siAmount) - parseFormattedNumber(row.unappliedAmount)).toFixed(2);
      let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

      if (field === 'vatCode') {
        newVatAmount = row.vatCode ? await useTopVatAmount(row.vatCode, newInvoiceBal) : 0;
        row.vatAmount = newVatAmount.toFixed(2);
      }

      const newNetOfVat = +(newInvoiceBal - newVatAmount).toFixed(2);
      const newATCAmount = row.atcCode ? await useTopATCAmount(row.atcCode, newNetOfVat) : 0;

      row.atcAmount = newATCAmount.toFixed(2);

      if (selectedWithAPV === "Y") {
          row.amountDue = +(newInvoiceBal).toFixed(2)
      }

      if (selectedWithAPV === "N") {
          row.amountDue = +(newInvoiceBal - newATCAmount).toFixed(2);
      } 

    }

    await updateVatAndAtc();
  }
}



    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);

};


const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,vendCode,docType);
        if(data) {
            row.acctCode = data.acctCode
            row.sltypeCode = data.sltypeCode
            row.slCode = data.slCode
            row.rcCode = data.rcCode
            row.rcName= data.rcName
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

    if (['slRefDate','slRefNo', 'remarks'].includes(field)) {
        row[field] = value;
    }
    
    updatedRowsGL[index] = row;
    updateState({ detailRowsGL: updatedRowsGL });
};




const handleBlurGL = async (index, field, value, autoCompute = false) => {
  
  const updatedRowsGL = [...state.detailRowsGL];
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
  updateState({ detailRowsGL: updatedRowsGL });
};


const handleCloseAccountModal = (selectedAccount) => {

    if (selectedAccount && selectedRowIndex !== null) {

        const specialAccounts = ['debitAcct', 'apAcct', 'vatAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, accountModalSource, selectedAccount,false);
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


const handleCloseVATAccountModal = (selectedAccount) => {

    if (selectedAccount && selectedRowIndex !== null) {

        const specialAccounts = ['debitAcct', 'apAcct', 'vatAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, accountModalSource, selectedAccount,false);
        } else {
          handleDetailChangeGL(selectedRowIndex, 'acctCode', selectedAccount);
        }      
    }
    updateState({
        showAccountVATModal: false,
        selectedRowIndex: null,
        accountModalSource: null
    });
};





  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, 'rcCode', selectedRc, false);
     
     
      } else {
           const result = await useTopRCRow(selectedRc.rcCode);
            if (result) {
              handleDetailChangeGL(selectedRowIndex, 'rcCode', result);
            }
    }
    updateState({
        showRcModal: false,
        selectedRowIndex: null,
        accountModalSource: null
    })};
};

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, 'slCode', selectedSl, false);
     
     
      } else {

        handleDetailChangeGL(selectedRowIndex, 'slCode', selectedSl);
    }
    updateState({
        showSlModal: false,
        selectedRowIndex: null,
        accountModalSource: null
    })};
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

      const result = await useHandleCancel(docType,documentID,userCode,confirmation.password,confirmation.reason,updateState);
      if (result.success) 
      {
       Swal.fire({
          icon: "success",
          title: "Success",
          text: "Cancellation Completed",
          timer: 5000, 
          timerProgressBar: true,
          showConfirmButton: false,
        });    
      }    
     await fetchTranData(documentNo,branchCode);
    }
    updateState({showCancelModal: false});
};

const handleClosePost = async (confirmation) => {
    if(documentStatus !== "OPEN" && documentID !== null ) {

      const result = await useHandlePost(docType,documentID,userCode,updateState);
      if (result.success) 
      {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.message,
        });       
      } 
     await fetchTranData(documentNo,branchCode);
    }
    updateState({showPostModal: false});
};



const handleCloseSignatory = async (mode) => {
  
    updateState({ 
        showSpinner: true,
        showSignatoryModal: false,
        noReprints: mode === "Final" ? 1 : 0, });
        console.log("handleCloseSignatory", { documentID, docType, mode });
    await useHandlePrint(documentID, docType, mode, userCode );

    updateState({
      showSpinner: false 
    });

};

const handleOpenAPBalance = async () => {
  console.log('[APBAL] handler fired');

  updateState({ isLoading: true });

  const endpoint = 'getOpenAPBalance';
  console.log('[APBAL] params', { vendCode, branchCode, endpoint });

  try {
    console.log('[APBAL] before fetchDataJson');
    const response = await fetchDataJsonLookup(endpoint, { vendCode, branchCode });
    // Log a safe snapshot so DevTools doesn’t “live mutate” objects
    console.log('[APBAL] response(raw)', response);
    try {
      console.log('[APBAL] response(safe)', JSON.parse(JSON.stringify(response)));
    } catch {
      console.log('[APBAL] response not JSON-serializable (circular/BigInt)');
    }

    const rawResult = response?.data?.[0]?.result;
    console.log('[APBAL] rawResult', rawResult);

    let payeeData = [];
    try {
      payeeData = rawResult ? JSON.parse(rawResult) : [];
    } catch (e) {
      console.warn('[APBAL] JSON.parse failed on result:', e);
      payeeData = [];
    }

    // NEW: Filter out invoices that are already in the CV details using groupId
    const existingGroupIds = new Set(detailRows.map(row => row.groupId).filter(Boolean));
    payeeData = payeeData.filter(item => !existingGroupIds.has(item.groupId));

    console.log('[APBAL] parsed payeeData length', payeeData.length);

    console.log('[APBAL] fetching colConfig');
    const colConfig = await useSelectedHSColConfig(endpoint);
    console.log('[APBAL] colConfig', colConfig);

    if (!Array.isArray(payeeData) || payeeData.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Open AP Balance',
        text: 'There are no AP balance records for the selected payee/branch.',
      });
      return;
    }

    updateState({
      globalLookupRow: payeeData,
      globalLookupHeader: colConfig ?? [],
      showAPBalanceModal: true,
    });
  } catch (error) {
    console.error('[APBAL] Failed to fetch Open AP Balance:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to fetch Open AP Balance.',
    });
    updateState({
      globalLookupRow: [],
      globalLookupHeader: [],
    });
  } finally {
    updateState({ isLoading: false });
    console.log('[APBAL] done');
  }
};




const handleCloseAPBalance = async (payload) => {
    if (payload && payload !== null) {
      
       updateState({ isLoading: true });

      const result = await useSelectedOpenAPBalance(payload);
      if (result) {   
      const newRows = result.map((entry, idx) => ({    
        lnNo: idx + 1,
        apvNo: entry.apvNo,
        apvDate: entry.apvDate,
        siNo: entry.siNo,
        siDate: entry.siDate,
        poNo: entry.poNo,
        rrNo: entry.rrNo,
        siAmount: formatNumber(entry.balance,2),
        origAmount: formatNumber(entry.balance,2),
        appliedAmount: formatNumber(entry.balance,2),
        appliedFx: formatNumber(entry.balance,2),
        unappliedAmount: "0.00",
        balance: formatNumber(entry.balance,2),
        amountDue: formatNumber(entry.balance,2),
        vatCode: entry.vatCode,
        vatName: entry.vatName,
        vatAmount: formatNumber(entry.vatAmount,2),
        atcCode: entry.atcCode,
        atcName: entry.atcName,
        atcAmount: formatNumber(entry.atcAmount,2),
        rcCode: entry.rcCode,
        rcName: entry.rcName,
        slCode: entry.slCode,
        debitAcct: entry.drAccount,
        apAcct: entry.apAccount,
        vatAcct: entry.vatAccount,
        currCode: entry.currCode,
        currRate: formatNumber(entry.currRate,6) ,
        vendCode: entry.vendCode,
        vendName: entry.vendName,
        refBranchcode: branchCode,
        refDocCode: entry.refDocCode,
        groupId: entry.groupId,
      
      }));

      
      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows});
      updateTotals(updatedRows);
    }  
  }
  updateState({ showAPBalanceModal: false,
                isLoading:false
  });  
};



const handleSaveAndPrint = async (documentID) => {

    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};




const handleCloseVatModal = async (selectedVat) => { 
  if (selectedVat && selectedRowIndex !== null) {
    
     const result = await useTopVatRow(selectedVat.vatCode);
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

    const result = await useTopATCRow(selectedAtc.atcCode);
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
        console.log("Currency Select",glCurrDefault)
        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate),6)
        });
      }
    }
  };



const handleCloseBankModal = async (selectedBank) => {

    if (selectedBank && selectedBank !== null) {
     const result = await useTopAccountRow(selectedBank.acctCode);
     if (result) {   
      updateState({ bankCode: selectedBank.bankCode,
                    bankAcctName:result.acctName,
                    bankAcctNo:selectedBank.bankAcctNo,
                    checkNo: selectedBank.checkNo
             });
    }  
  }
  updateState({ bankModalOpen: false});  

}

  
const handleCheckNoChange = async (e) => {
    const newCheckNo = e.target.value;
    const docId = documentID; // Use a correctly scoped variable

    // Immediately update state to reflect user input
    updateState({ checkNo: newCheckNo });

    // Wait a brief moment to avoid API calls on every keystroke
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const isDuplicate = await checkDuplicateCheckNo(newCheckNo, docId);

        if (isDuplicate) {
            Swal.fire({
                icon: 'error',
                text: 'Duplicate Check Number is not allowed!',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
            // Clear the input only if it's a duplicate
            updateState({ checkNo: "" });
            return;
        }

    } catch (error) {
        console.error('Error in handleCheckNoChange:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while checking the duplicate check number. Please try again later.',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
        });
    }
};


const checkDuplicateCheckNo = async (checkNo, docId) => {
    const selectedBankCode = bankCode; 
    
    try {
        const params = {
            json_data: {
                bankCode: selectedBankCode,
                checkNo: checkNo,
                docId: docId || null 
            }
        };

        const response = await fetchData('/validateDuplicateCheck', params);

        // 1. Check if the API call was successful and has data
        if (response.success && response.data && response.data.length > 0) {
            
            // 2. Check for '1' (string) or 1 (number)
            const isDuplicate = response.data[0].result == 1; 

            if (isDuplicate) {
                // 3. Trigger the alert if a duplicate is found
                Swal.fire({
                    icon: 'warning', // Use warning for duplicates
                    title: 'Duplicate Check Number',
                    text: `Check No. ${checkNo} has already been used.`,
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'OK'
                });
                return true; // Yes, it is a duplicate
            }
        }
        
        return false; // No duplicate found
        
    } catch (error) {
        console.error('Error fetching data from API:', error);
        Swal.fire({
            icon: 'error',
            title: 'API Error',
            text: 'Could not validate the Check Number. Please try again.',
            confirmButtonColor: '#d33',
            confirmButtonText: 'OK'
        });
        return true; // Block submission on error to be safe
    }
};

const renderCvDetailCell = (columnKey, row, index) => {
  const columnWidth = getCvDetailFallbackWidth(columnKey);
  const style = getCvDetailCellStyle(columnKey, columnWidth);
  const apvLocked = isFormDisabled || selectedWithAPV === "Y";
  const lookupHandlers = {
    debitAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "debitAcct" }),
    apAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "apAcct" }),
    vatAcct: () => updateState({ selectedRowIndex: index, showAccountVATModal: true, accountModalSource: "vatAcct" }),
    rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }),
    slCode: () => updateState({ selectedRowIndex: index, showSlModal: true, accountModalSource: "slCode" }),
    vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }),
    atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }),
  };
  const focusNextDetailCell = (field) => {
    focusNextCvDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: cvDetailEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
    });
  };
  const textInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={field === "currCode" ? (row.currCode || currCode) : (row[field] || "")}
      maxLength={options.maxLength}
      readOnly={options.readOnly}
      disabled={options.disabled}
      onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || options.disabled) return;
        e.preventDefault();
        focusNextDetailCell(field);
      }}
    />
  );
  const amountInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
      value={options.readOnly ? (formatNumber(parseFormattedNumber(row[field])) || "") : (row[field] || "")}
      readOnly={options.readOnly}
      disabled={options.disabled}
      onChange={(e) => {
        const sanitizedValue = e.target.value.replace(options.allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, "");
        const pattern = options.allowNegative ? /^-?\d*\.?\d{0,6}$/ : /^\d*\.?\d{0,6}$/;
        if (pattern.test(sanitizedValue) || sanitizedValue === "" || (options.allowNegative && sanitizedValue === "-")) {
          handleDetailChange(index, field, sanitizedValue, false);
        }
      }}
      onFocus={(e) => clearCvDetailZeroOnFocus(e, {
        isEditable: !options.readOnly && !options.disabled,
        onClear: (value) => handleDetailChange(index, field, value, false),
      })}
      onBlur={async (e) => {
        if (options.readOnly || options.disabled) return;
        if (options.allowNegative && e.target.value === "-") {
          await handleDetailChange(index, field, 0, true);
          return;
        }
        const num = parseFormattedNumber(e.target.value);
        if (!isNaN(num)) {
          if (field === "appliedAmount") {
            const invoiceAmt = parseFormattedNumber(row.siAmount) || 0;
            if (num > invoiceAmt) {
              Swal.fire({ icon: "info", text: "Applied amount exceeded invoice amount." });
              await handleDetailChange(index, field, invoiceAmt, true);
            } else {
              await handleDetailChange(index, field, num, true);
            }
          } else {
            await handleDetailChange(index, field, num, true);
          }
        }
        setFocusedCell(null);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.currentTarget.blur();
        focusNextDetailCell(field);
      }}
    />
  );
  const lookupInput = (field, options = {}) => (
    <td key={columnKey} className="global-tran-td-ui relative" style={style}>
      <div className="flex items-center">
        <input
          type="text"
          id={`${field}-${index}`}
          className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
          value={row[field] || ""}
          readOnly
          onKeyDown={(e) => {
            if (e.key !== "Enter" || isFormDisabled) return;
            e.preventDefault();
            focusNextDetailCell(field);
          }}
        />
        {!isFormDisabled && !options.hideIcon && (
          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={lookupHandlers[field]} />
        )}
      </div>
    </td>
  );
  const renderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    apType: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select className="w-full global-tran-td-inputclass-ui" value={row.apType || ""} onChange={(e) => handleDetailChange(index, "apType", e.target.value)} disabled={apvLocked}>{cvApTypeDd.length > 0 ? cvApTypeDd.map((type) => <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>{type.DROPDOWN_NAME}</option>) : <option value="">Loading...</option>}</select></td>,
    apvNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("apvNo", { disabled: apvLocked })}</td>,
    rrNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rrNo", { disabled: apvLocked })}</td>,
    poNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("poNo", { disabled: apvLocked })}</td>,
    siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("siNo", { disabled: apvLocked, maxLength: useGetFieldLength(tblFieldArray, "si_no") })}</td>,
    siDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`siDate_${index}`} value={row.siDate || ""} disabled={apvLocked} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`siDate_${index}`] !== undefined) handleDetailChange(index, "siDate", updates[`siDate_${index}`], false); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || apvLocked) return; e.preventDefault(); focusNextDetailCell("siDate"); }} /></td>,
    origAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("origAmount", { disabled: apvLocked })}</td>,
    currCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("currCode", { className: "text-center", disabled: apvLocked })}</td>,
    currRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("currRate", { disabled: apvLocked })}</td>,
    siAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("siAmount", { readOnly: true })}</td>,
    appliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("appliedAmount", { disabled: isFormDisabled })}</td>,
    unappliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("unappliedAmount", { disabled: isFormDisabled, allowNegative: true })}</td>,
    balance: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("balance", { readOnly: true })}</td>,
    debitAcct: () => lookupInput("debitAcct", { hideIcon: selectedWithAPV === "Y" }),
    apAcct: () => lookupInput("apAcct", { hideIcon: selectedWithAPV === "Y" }),
    vatAcct: () => lookupInput("vatAcct"),
    rcCode: () => lookupInput("rcCode", { hideIcon: selectedWithAPV === "Y" }),
    slCode: () => lookupInput("slCode"),
    vatCode: () => lookupInput("vatCode"),
    atcCode: () => lookupInput("atcCode"),
    rcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcName", { readOnly: true })}</td>,
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("vatName", { readOnly: true })}</td>,
    vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("vatAmount", { readOnly: true })}</td>,
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("atcName", { readOnly: true })}</td>,
    atcAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("atcAmount", { disabled: isFormDisabled })}</td>,
    amountDue: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("amountDue", { disabled: isFormDisabled })}</td>,
  };
  return renderers[columnKey]?.() ?? null;
};

const renderCvGlCell = (columnKey, row, index) => {
  const columnWidth = getCvGlFallbackWidth(columnKey);
  const style = getCvGlCellStyle(columnKey, columnWidth);
  const glModalHandlers = {
    acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }),
    rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }),
    slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }),
    vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true }),
    atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true }),
  };
  const focusNextGlCell = (field) => {
    focusNextCvGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: cvGlEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
    });
  };
  const glTextInput = (field, options = {}) => (
    <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />
  );
  const glLookupInput = (field, options = {}) => (
    <input type="text" id={`${field}-${index}`} className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />
  );
  const glAmountInput = (field) => (
    <input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChangeGL(index, field, sanitizedValue); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBlurGL(index, field, e.target.value, true); focusNextGlCell(field); } }} onFocus={(e) => clearCvGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })} onBlur={(e) => { if (isFormDisabled) return; handleBlurGL(index, field, e.target.value); }} />
  );
  const lookupCell = (field, options = {}) => {
    const hasLookupValue = options.alwaysShow || Boolean(String(row[field] || "").trim());
    const showLookupIcon = !isFormDisabled && hasLookupValue;
    return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(field, options)}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[field]} />}</div></td>;
  };
  const renderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    acctCode: () => lookupCell("acctCode", { readOnly: false, alwaysShow: true }),
    rcCode: () => lookupCell("rcCode", { readOnly: true }),
    slCode: () => lookupCell("slCode", { readOnly: true }),
    vatCode: () => lookupCell("vatCode", { readOnly: true }),
    atcCode: () => lookupCell("atcCode", { readOnly: true }),
    sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("sltypeCode")}</td>,
    particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular")}</td>,
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("vatName", { readOnly: true })}</td>,
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName")}</td>,
    debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("debit")}</td>,
    credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("credit")}</td>,
    debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("debitFx1")}</td>,
    creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("creditFx1")}</td>,
    debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("debitFx2")}</td>,
    creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput("creditFx2")}</td>,
    slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("slRefNo", { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
    slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate${index}`} value={row.slRefDate || ""} disabled={isFormDisabled} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`slRefDate${index}`] !== undefined) handleDetailChangeGL(index, "slRefDate", updates[`slRefDate${index}`], false); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("remarks", { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
  };
  return renderers[columnKey]?.() ?? null;
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
              detailsRoute="/page/CV"
              isSaveDisabled={state.isSaveDisabled || isFormDisabled || detailRowsGL.length === 0}
              isResetDisabled={state.isResetDisabled}
              isAttachDisabled={!documentID}
              isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
              isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
              isCancelDisabled={!documentID ||displayStatus === "CANCELLED" ||displayStatus === "FINALIZED"}
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
            <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
          </div>
        </div>
      </div>


{/* Form Layout with Tabs */}
<div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>

    {/* Tab Navigation */}
    <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
        <button
            className={`global-tran-tab-padding-ui ${
                activeTab === 'basic'
                ? 'global-tran-tab-text_active-ui'
                : 'global-tran-tab-text_inactive-ui'
            }`}
            onClick={() => setState(prevState => ({ ...prevState, activeTab: 'basic' }))}
        >
            Basic Information
        </button>
    </div>

    {/* Header Form Section - Main Grid Container */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="cv_hd">

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Nested grid for 3 columns */}

            {/* Column 1 */}
            <div className="global-tran-textbox-group-div-ui">
                {/* Branch Name Input with lookup button */}
                <div className="relative">
                    <input
                        type="text"
                        id="branchName"
                        placeholder=" "
                        value={branchName}
                        readOnly
                        onFocus={(e) => e.target.blur()}
                        className="peer global-tran-textbox-ui cursor-pointer select-none"
                    />
                    <label htmlFor="branchName" className="global-tran-floating-label">
                        Branch
                    </label>
                    <button
                        type="button"
                        className={`global-tran-textbox-button-search-padding-ui ${
                            isFetchDisabled
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* CV Number Field */}
                <div className="relative">
                    <input
                        type="text"
                        id="cvNo"
                        value={state.documentNo}
                        onChange={(e) => updateState({ documentNo: e.target.value })}
                        onBlur={handleCvNoBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCvNoBlur();
                            e.preventDefault(); 
                            document.getElementById("documentDate")?.focus();
                          }}}
                        placeholder=" "
                        className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                        disabled={state.isDocNoDisabled}
                    />
                    <label htmlFor="cvNo" className="global-tran-floating-label">
                        CV No.
                    </label>
                    <button
                        className={`global-tran-textbox-button-search-padding-ui ${
                            (state.isFetchDisabled || state.isDocNoDisabled)
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        onClick={() => {updateState({showAllTranDocNo:true})}}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* CV Date Picker */}
                <div className="relative">
                  <DateFormatInput
                      id="documentDate"
                      value={documentDate}
                      updateState={updateState}
                      disabled={isFormDisabled}
                    />
                  <label htmlFor="documentDate" className="global-tran-floating-label">CV Date</label> 
                </div>          



                {/* With APV */}
                <div className="relative">
                    <select id="withAPV"
                        className="peer global-tran-textbox-ui"
                        value={selectedWithAPV}
                        onChange={handleWithAPVChange}
                        disabled={isFormDisabled} 
                    >
                        {cvWithApvDd.length > 0 ?
                        (
                            <>
                                {cvWithApvDd.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading...</option>)}
                    </select>
                    <label htmlFor="withAPV" className="global-tran-floating-label">With APV</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>


                {/* Payee Code */}
                <div className="relative">
                    <input type="text"
                        id="vendCode"
                        value={vendCode}
                        readOnly
                        placeholder=" "
                        className="peer global-tran-textbox-ui"
                    />
                    <label htmlFor="CustCode"className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Payee Code
                    </label>
                    <button
                        type="button"
                        onClick={() => updateState({ payeeModalOpen: true })}
                        className={`global-tran-textbox-button-search-padding-ui ${
                            isFetchDisabled
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        disabled={isFormDisabled} 
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

            </div>

            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui lg:col-span-2">


                <div className="flex space-x-4"> {/* Added flex container with spacing */}

                {/* Bank Code */}
                <div className="relative flex-grow w-2/4">
                    <input type="hidden" id="bankCode" placeholder="" readOnly value={bankCode || ""}/>
                    <input type="text" id="bankAcctNo" value={bankAcctName || ""} placeholder="" readOnly className="peer global-tran-textbox-ui"/>
                    <label htmlFor="bankAcctNo" className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Bank Name
                    </label>
                    <button onClick={() => {updateState({ bankModalOpen: true })}}   
                        className={`global-tran-textbox-button-search-padding-ui ${
                            isFetchDisabled
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        disabled={isFormDisabled} 
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* Payment Type */}
                <div className="relative flex-grow w-2/4">
                    <select id="paymentType"
                        className="peer global-tran-textbox-ui"
                        value={selectedPayType}
                        onChange={handlePayTypeChange}
                        disabled={isFormDisabled} 
                    >
                        {cvPayTypeDd.length > 0 ?
                        (
                            <>
                                {cvPayTypeDd.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading...</option>)}
                    </select>
                    <label htmlFor="paymentType" className="global-tran-floating-label">Payment Type</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>                

                </div>


                <div className="flex space-x-4"> {/* Added flex container with spacing */}

                <div className="relative flex-grow w-2/4">
                    <input 
                        type="text" 
                        id="checkNo" 
                        placeholder=" " 
                        value={checkNo} 
                        onChange={(e) => handleCheckNoChange(e)}  
                        className="peer global-tran-textbox-ui" 
                        disabled={isFormDisabled} 
                        maxLength={useGetFieldLength(tblFieldArray, "check_no")}
                    />
                    <label htmlFor="checkNo" className="global-tran-floating-label">Check No.</label>
                </div>


                {/* Check Date Picker */}
                <div className="relative flex-grow w-2/4">
                  <DateFormatInput
                      id="checkDate"
                      value={checkDate}
                      updateState={updateState}
                      disabled={isFormDisabled}
                    />
                  <label htmlFor="checkDate" className="global-tran-floating-label">Check Date</label> 
                </div>  
                
                </div>


                {/* CV Type */}
                <div className="relative">
                    <select id="cvType"
                        className="peer global-tran-textbox-ui"
                        value={selectedCvType}
                        onChange={handleCvTypeChange}
                        disabled={isFormDisabled} 
                    >
                        {cvTranTypeDd.length > 0 ?
                        (
                            <>
                                {cvTranTypeDd.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading...</option>)}
                    </select>
                    <label htmlFor="cvType" className="global-tran-floating-label">CV Type</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>          

                
                <div className="flex space-x-4"> {/* Added flex container with spacing */}

                  <div className="relative flex-grow w-2/4">
                      <input type="text" id="refDocNo1"  value={refDocNo1} placeholder=" " onChange={(e) => updateState({ refDocNo1: e.target.value })} className="peer global-tran-textbox-ui " disabled={isFormDisabled} maxLength={useGetFieldLength(tblFieldArray, "refcv_no")} />
                      <label htmlFor="refDocNo1" className="global-tran-floating-label">Ref Doc No. 1</label>
                  </div>

                  <div className="relative flex-grow w-2/4">
                      <input type="text" id="refDocNo2" value={refDocNo2} placeholder=" " onChange={(e) => updateState({ refDocNo2: e.target.value })}  className="peer global-tran-textbox-ui" disabled={isFormDisabled} maxLength={useGetFieldLength(tblFieldArray, "refcv_no2")} />
                      <label htmlFor="refDocNo2" className="global-tran-floating-label">Ref Doc No. 2</label>
                  </div>

                </div>

                {/* Payee Name */}
                <div className="relative">
                    <input
                        type="text"
                        id="vendName"
                        placeholder=" "
                        value={vendName}
                        className="peer global-tran-textbox-ui w-full"
                        disabled
                    />
                    <label htmlFor="vendName" className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Payee Name
                    </label>
                </div>




            </div>

            {/* Remarks Section - Now inside the 3-column container, spanning all 3 */}
            <div className="col-span-full">
              
                <div className="relative p-2"> 
                    <textarea
                        id="remarks"
                        placeholder=""
                        rows={5}
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


        </div> {/* End of the 3-column container */}

        {/* Column 4 - Totals (remains unchanged, but its parent is now the main 4-column grid) */}
        <div className="global-tran-textbox-group-div-ui">
            <div className="relative">
                <input 
                  type="text" 
                  id="totalFxAmountDue" 
                  value={totals.totalFxAmountDue} 
                  placeholder=" " 
                  className="peer global-tran-textbox-ui text-right"
                  disabled
                />
                <label htmlFor="totalFxAmountDue" className="global-tran-floating-label">Check Amount (Orig.)</label>          
            </div>

            {/* <FieldRenderer
                id="totalFxAmountDue"
                label="Check Amount (Orig.)"
                type="amount"
                value={totals.totalFxAmountDue || ""}
                disabled
            /> */}


    
                    {/* Currency */}
                    <div className="relative"> {/* Used flex-grow to make it longer */}
                        <input type="text" 
                            id="currCode" 
                            value={currCode}  
                            className="peer global-tran-textbox-ui hidden"/>
                            
                          <input type="text" 
                            id="currName" 
                            value={currName}  
                            className="peer global-tran-textbox-ui"/>

                        <label htmlFor="currCode" className="global-tran-floating-label">Currency</label>
                        <button onClick={() => {updateState({ currencyModalOpen: true })}}                        
                            className={`global-tran-textbox-button-search-padding-ui ${
                                isFetchDisabled
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            disabled={isFormDisabled} 
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>
{/* 
                    <FieldRenderer
                        id="currCode"
                        label="Currency"
                        type="text"
                        value={currCode || ""}
                        disabled
                        
                    /> */}

 

                    {/* Currency Rate */}
                    <div className="relative">
                        <input type="text" id="currRate" value={currRate} 
                            onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                            if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                                updateState({ currRate: sanitizedValue })
                            }}}
                            onBlur={handleCurrRateNoBlur}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault(); 
                                document.getElementById("refDocNo1")?.focus();
                              }}}
                            onFocus={(e) => {
                              if (parseFormattedNumber(e.target.value) === 0) {
                                e.target.value = "";
                              }
                            }} 

                            placeholder=" "
                            className="peer global-tran-textbox-ui text-right" disabled={isFormDisabled || glCurrDefault === currCode} />
                            
                        <label htmlFor="currName" className="global-tran-floating-label"> Currency Rate
                        </label>
                    </div>
{/* 
                    <FieldRenderer
                                                  id="currRate"
                                                  label="Currency Rate"
                                                  type="amount"
                                                  value={currRate || ""}
                                                  disabled={isFormDisabled || glCurrDefault === currCode}
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
                                                      document.getElementById("refDocNo1")?.focus();
                                                    }
                                                  }}
                                                  onFocus={(e) => {
                                                    if (parseFormattedNumber(e.target.value) === 0) {
                                                      e.target.value = "";
                                                    }
                                                  }}
                                                /> */}

            <div className="relative">
                <input type="text" id="totalAmountDue" value={totals.totalAmountDue} placeholder=" " className="peer global-tran-textbox-ui text-right"/>
                <label htmlFor="totalAmountDue" className="global-tran-floating-label">Check Amount (PHP)</label>
            </div>

            
            {/* <FieldRenderer
                id="totalAmountDue"
                label="Check Amount (PHP)"
                type="amount"
                value={totals.totalAmountDue || ""}
                disabled
            /> */}
        </div>

    </div>
</div>
      

      {/* APV Detail Section */}
      <div id="cv_dtl" className="global-tran-tab-div-ui" >


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
        >
          Invoice Details
        </button>
      </div>

      {selectedWithAPV === 'Y' && (
        <div className="flex justify-end">
          <button
            onClick={() => handleOpenAPBalance()}
            className="global-tran-button-generateGL"
            disabled={isLoading}
            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
          >
            Get Reference APV
          </button>
        </div>
      )}

    </div>

  {/* Invoice Details Button */}
  <div className="global-tran-table-main-div-ui">
  <div className="global-tran-table-main-sub-div-ui"> 
    <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
      <thead className="global-tran-thead-div-ui">
        <tr>
          {orderedCvDetailColumns.map((column) =>
            renderCvDetailHeader(column.label, column.key, column.width, {
              orderedColumns: orderedCvDetailColumns,
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
      <tbody className="relative">{sortedCvDetailRows.map(({ row, originalIndex }) => (
        <tr key={originalIndex} className="global-tran-tr-ui">
          {orderedCvDetailColumns.map((column) => renderCvDetailCell(column.key, row, originalIndex))}
          {!isFormDisabled && (
            <td
              className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
              style={transactionActionsCellStyle}
            >
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  className="global-tran-td-button-add-ui"
                  onClick={() => handleAddRow(originalIndex)}
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
    {renderCvDetailHeaderContextMenu()}
    
  </div>


  </div>


<div className="global-tran-tab-footer-main-div-ui flex flex-col sm:flex-row gap-4 sm:justify-between items-end">
    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
        <button
            onClick={() => handleAddRow()}
            className="global-tran-tab-footer-button-add-ui"
            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
        >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
        </button>
    </div>

    {/* Totals Grid */}
    <div className={`global-tran-tab-footer-total-main-div-ui grid gap-1 ${currRate > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* Header Row */}
        <div className="col-span-1 sm:col-span-1"></div>
        <div className="global-tran-tab-footer-total-label-ui text-right">Currency ({glCurrDefault})</div>
        {currRate > 1 && <div className="global-tran-tab-footer-total-label-ui text-right">Currency ({currCode})</div>}

        {!(selectedWithAPV === "N" && selectedCvType === "APV02") && selectedWithAPV !== "Y" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total Invoice Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalInvoiceAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxOriginalAmount}</div>}
            </>
        )}

        {/* Total Applied Amount */}
        {!(selectedWithAPV === "Y" && selectedCvType === "APV02") && selectedWithAPV !== "N" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total Applied Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalAppliedAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxAppliedAmount}</div>}
            </>
        )}

        {/* Total Unapplied Amount */}
        {!(selectedWithAPV === "Y" && selectedCvType === "APV02") && selectedWithAPV !== "N" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total Unapplied Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalUnappliedAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxUnappliedAmount}</div>}
            </>
        )}

        {/* Total VAT Amount */}
        {!(selectedWithAPV === "N" && selectedCvType === "APV02") && selectedWithAPV !== "Y" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total VAT Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalVatAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxVatAmount}</div>}
            </>
        )}

        {/* Total ATC Amount */}
        {!(selectedWithAPV === "N" && selectedCvType === "APV02") && selectedWithAPV !== "Y" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total ATC Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalAtcAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxAtcAmount}</div>}
            </>
        )}

        {/* Total Amount Due */}
        <div className="global-tran-tab-footer-total-label-ui">Total Amount Due:</div>
        <div className="global-tran-tab-footer-total-value-ui">{totals.totalAmountDue}</div>
        {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxAmountDue}</div>}
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
          onClick={() => setGLActiveTab('invoice')}
        >
          General Ledger
        </button>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => handleActivityOption("GenerateGL")}
          className="global-tran-button-generateGL"
          disabled={isLoading} 
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
            {orderedCvGlColumns.map((column) =>
              renderCvGlHeader(column.label, column.key, column.width, {
                orderedColumns: orderedCvGlColumns,
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
          {sortedCvGlRows.map(({ row, originalIndex }) => (
            <tr key={originalIndex} className="global-tran-tr-ui">
              {orderedCvGlColumns.map((column) => renderCvGlCell(column.key, row, originalIndex))}
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
      {renderCvGlHeaderContextMenu()}
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

  {/* Totals in Forex Section (if currRate > 1) */}
  {currRate > 1 && (
    <div className="global-tran-tab-footer-total-main-div-ui">

      {/* Total Debit in Forex */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
          Total Debit ({currCode}):
        </label>
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
          {totalDebitFx1}
        </label>
      </div>

      {/* Total Credit in Forex */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
          Total Credit ({currCode}):
        </label>
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
          {totalCreditFx1}
        </label>
      </div>

    </div>
  )}

</div>

    

  </div>

</div>




{/* Branch Modal */}
{branchModalOpen && (
        <BranchLookupModal 
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}


{/* Currency Modal */}
{currencyModalOpen && (
        <CurrLookupModal 
          isOpen={currencyModalOpen}
          onClose={handleCloseCurrencyModal}
        />
      )}


{/* Payee Masterdata Modal */}
{payeeModalOpen && (
  <PayeeMastLookupModal
    isOpen={payeeModalOpen}
    onClose={handleClosePayeeModal}
  />
)}


{/* Bank Masterdata Modal */}
{bankModalOpen && (
  <BankMastLookupModal
    isOpen={bankModalOpen}
    onClose={handleCloseBankModal}
  />
)}


{/* COA Account Modal */}
{showAccountModal && (
  <COAMastLookupModal
    isOpen={showAccountModal}
    onClose={handleCloseAccountModal}
    source={accountModalSource}
    customParam="ActiveAll"
  />
 )}


 {/* COA Account Modal VAT */}
{showAccountVATModal && (
  <COAMastLookupModal
    isOpen={showAccountVATModal}
    onClose={handleCloseVATAccountModal}
    source={accountModalSource}
    customParam="VATInputAcct"
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
    customParam="Input"
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


{/* Post Modal */}
{showPostModal && (
  <PostTranModal
    isOpen={showPostModal}
    onClose={handleClosePost}
  />
)}


{/* Attachment Modal */}
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


{/* Signatory Modal */}
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


{/* AP Balance Modal */}
{showAPBalanceModal && (
  <GlobalLookupModalv1
    isOpen={showAPBalanceModal}
    data={globalLookupRow}
    btnCaption="Get Selected APV"
    title="Open AP Balance"
    endpoint={globalLookupHeader}
    onClose={handleCloseAPBalance}
    onCancel={() => updateState({ showAPBalanceModal: false })}
  />
)}



{/* Search Doc No Modal */}
{showAllTranDocNo && (
  <AllTranDocNo
    isOpen={showAllTranDocNo}
    params={{branchCode,branchName,docType,documentTitle,fieldNo : "cvNo"}}
    onRetrieve={handleTranDocNoRetrieval}
    onResponse={{documentNo}}
    onSelected={handleTranDocNoSelection}
    onClose={() => updateState({ showAllTranDocNo: false })}
  />
)} 


<CheckPrintPreviewModal
  open={showCheckPreview}
  onClose={() => setShowCheckPreview(false)}
  bankCode={bankCode}
  checkData={{
    bankCode,
    checkDate,
    amountInWords: amtInWords,
    payeeName: vendName,
    checkAmount: currAmount,
    cvNo: documentNo,
  }}
/>


{/* Global Spinner */}
{showSpinner && <LoadingSpinner />}


    </div>
    

  {/* Transaction History */}
  <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        isActive={topTab === "history"}
        endpoint="/getCVHistory"
        cacheKey={`CV:${state.branchCode || ""}:${state.docNo || ""}`} 
        activeTabKey="CV_Summary"
        branchCode={state.branchCode}
        startDate={state.fromDate}
        endDate={state.toDate}
        status={(() => {
            const s = (state.status || "").toUpperCase();
            if (s === "FINALIZED") return "F";
            if (s === "CANCELLED") return "X";
            if (s === "CLOSED")    return "C";
            if (s === "OPEN")      return "";
            return "All";
          })()}
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`} 
    />
  </div>

    </div>
  );
};

export default CV;
