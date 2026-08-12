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
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import GlobalCombinedLookup from "../../../Lookup/SearchGlobalCombinedLookup.jsx";
import PostCR from "../../../Module/Main Module/Accounts Receivable/PostCR.jsx";
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
  useTopAccountRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopBankMastRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


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



import {
  useSelectedOpenARBalance,
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';


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
  useSwalvalidateRequiredFields,
  useSwalErrorAlert,
  useSwalSuccessAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";


const CR = () => {
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const pendingAddAfterCustomerRef = useRef(false);
  const selectedHSColConfig = useSelectedHSColConfig;
  const swalValidateRequiredFields = useSwalvalidateRequiredFields;
  const swalErrorAlert = useSwalErrorAlert;
  const navigate = useNavigate();
  const location = useLocation();
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded ,getAllTopATCRow, getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
  const isViewDocument = new URLSearchParams(location.search).get("viewDocument") === "true";
  const isViewDocumentUrl = isViewDocument;



  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const { resetFlag } = useReset();
  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
  const docType = docTypes.CR;
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
    documentStatus:"",
    documentDate:useGetCurrentDayV2(),
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
    crTypes :[],
    paymentTypes:[],
    checkTypes:[],
    depBankCode:companyInfo?.depBankcode||"",
    depAcctName:companyInfo?.depositBankName||"",
    depAcctNo:companyInfo?.depositBankAcctNo||"",
    currAmount:"0.00",
    checkAmount:"0.00",
    checkNo:"",
    checkDate:null,
    bank:"",
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",

    selectedCRType : "REG",
    selectedPayType : "CR01",
    selectedCheckType:"CR21",

    userCode: currentUserRow?.userCode||"",

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    globalLookupRow:[],
    globalLookupHeader:[],
    openPRCCR_Data_Summary: [],
    openPRCCR_Col_Summary: [],
    openPRCCR_Col_Detail: [],


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
    showOpenPRCModal:false,
    showPostingModal:false,
    custModalParams:"ActiveAll",
    custModalSource:null,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showBankMastModal:false,
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
  chainCode,
  chainName,
  currCode,
  currName,
  currRate,
  selectedCRType,
  selectedPayType,
  selectedCheckType,
  userCode,

  prcNo,
  crTypes,
  paymentTypes,
  checkTypes,
  depBankCode,
  depAcctName,
  depAcctNo,
  currAmount,
  checkAmount,
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
  openPRCCR_Data_Summary,
  openPRCCR_Col_Summary,
  openPRCCR_Col_Detail,
  totalDebit,
  totalCredit,
  totalDebitFx1,
  totalCreditFx1,
  totalDebitFx2,
  totalCreditFx2,


  // Contexts
  modalContext,
  selectionContext,
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
  custModalParams,
  custModalSource,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showARBalanceModal,
  showOpenPRCModal,
  showPostingModal,
  showAllTranDocNo


} = state;

  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);



  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const normalizedDisplayStatus = String(displayStatus).trim().toUpperCase();
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[normalizedDisplayStatus] || "";
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedDisplayStatus);
  const crFieldLengths = {
    siNo: useGetFieldLength(tblFieldArray, "si_no"),
    checkNo: useGetFieldLength(tblFieldArray, "check_no"),
    slRefNo: useGetFieldLength(tblFieldArray, "slref_no"),
    remarks: useGetFieldLength(tblFieldArray, "remarks"),
  };
  const isAdvanceDetailHidden = handleFieldBehavior("hiddenDetailAdvaces");
  const isSingleCheckDetailHidden = handleFieldBehavior("hiddenDetailSingleCheck");
  const crDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    ...(!isAdvanceDetailHidden ? [{ key: "w2307", label: "With 2307?", width: 100 }] : []),
    { key: "siNo", label: handleColumnLabel("SINo"), width: 120 },
    { key: "siDate", label: handleColumnLabel("SIDate"), width: 120 },
    ...(!isAdvanceDetailHidden ? [{ key: "siAmount", label: "SI Amount", width: 130 }] : []),
    { key: "appliedAmount", label: handleColumnLabel("Applied"), width: 130 },
    { key: "unappliedAmount", label: "UnApplied", width: 130 },
    ...(!isAdvanceDetailHidden ? [{ key: "balance", label: "Balance", width: 130 }] : []),
    { key: "arAcct", label: handleColumnLabel("ARAcct"), width: 120 },
    { key: "currCode", label: "Curr Code", width: 110 },
    { key: "currRate", label: "Curr Rate", width: 120 },
    ...(!isSingleCheckDetailHidden
      ? [
          { key: "bank", label: "Bank", width: 120 },
          { key: "checkNo", label: "Check No", width: 120 },
          { key: "checkDate", label: "Check Date", width: 120 },
          { key: "checkAmount", label: "Check Amount", width: 130 },
        ]
      : []),
    { key: "custCode", label: "Customer Code", width: 130 },
    { key: "custName", label: "Customer Name", width: 260 },
  ];
  const {
    getColumnStyle: getCrDetailColumnStyle,
    getFrozenColumnStyle: getCrDetailFrozenStyle,
    getOrderedColumns: getOrderedCrDetailColumns,
    getSortedRows: getSortedCrDetailRows,
    setColumnOrder: setCrDetailColumnOrder,
    clearAllSorting: clearCrDetailSorting,
    clearZeroValueOnFocus: clearCrDetailZeroOnFocus,
    focusNextRowInput: focusNextCrDetailRowInput,
    renderHeaderContextMenu: renderCrDetailHeaderContextMenu,
    renderResizableHeader: renderCrDetailHeader,
  } = useResizableTableColumns(crDetailColumnDefs);
  const orderedCrDetailColumns = getOrderedCrDetailColumns(crDetailColumnDefs);
  const getCrDetailFallbackWidth = (key) =>
    crDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCrDetailCellStyle = (key, fallbackWidth) => ({
    ...getCrDetailColumnStyle(key, fallbackWidth),
    ...getCrDetailFrozenStyle(key, orderedCrDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setCrDetailColumnOrder(crDetailColumnDefs.map((column) => column.key));
  }, [setCrDetailColumnOrder, selectedCRType, selectedPayType, selectedCheckType]);
  const sortedCrDetailRows = getSortedCrDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );

  const crGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC Code", width: 120 },
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
    getColumnStyle: getCrGlColumnStyle,
    getFrozenColumnStyle: getCrGlFrozenStyle,
    getOrderedColumns: getOrderedCrGlColumns,
    getSortedRows: getSortedCrGlRows,
    setColumnOrder: setCrGlColumnOrder,
    clearAllSorting: clearCrGlSorting,
    clearZeroValueOnFocus: clearCrGlZeroOnFocus,
    focusNextRowInput: focusNextCrGlRowInput,
    renderHeaderContextMenu: renderCrGlHeaderContextMenu,
    renderResizableHeader: renderCrGlHeader,
  } = useResizableTableColumns(crGlColumnDefs);
  const orderedCrGlColumns = getOrderedCrGlColumns(crGlColumnDefs);
  const getCrGlFallbackWidth = (key) =>
    crGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getCrGlCellStyle = (key, fallbackWidth) => ({
    ...getCrGlColumnStyle(key, fallbackWidth),
    ...getCrGlFrozenStyle(key, orderedCrGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setCrGlColumnOrder(crGlColumnDefs.map((column) => column.key));
  }, [setCrGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedCrGlRows = getSortedCrGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const crDetailEnterNextRowZeroClearFields = ["appliedAmount", "unappliedAmount"];
  const crGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];


  //Variables


  const [totals, setTotals] = useState({
  totalSIAmount: '0.00',
  totalAppliedAmount: '0.00',
  totalBalanceAmount: '0.00',
  totalUnappliedAmount: '0.00',
  currAmount:"0.00"
  });




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







  const updateTotalsDisplay = (siAmt, applied, balance, unapplied) => {
    setTotals({
          totalSIAmount: formatNumber(siAmt),
          totalAppliedAmount: formatNumber(applied),
          totalBalanceAmount: formatNumber(balance),
          totalUnappliedAmount: formatNumber(unapplied),
          currAmount:formatNumber(applied+unapplied),
      });


      updateState({checkAmount:formatNumber((applied+unapplied) * currRate)})
  };




  useEffect(() => {
  if (!refsLoaded) return;

    // 1. Fetch data synchronously using the dropdown utility
    const crTran = getAllDropDown("CRTRAN_TYPE", docType);
    const crType = getAllDropDown("CR_TYPE", docType);
    const crCheck = getAllDropDown("CRCHECK_TYPE", docType);

    // 2. Build a single update object to avoid multiple re-renders
    const updates = {};

    if (crTran.length > 0) {
      updates.crTypes = crTran;
      updates.selectedCRType = "CR11";
    }

    if (crType.length > 0) {
      updates.paymentTypes = crType;
      updates.selectedPayType = "CR01";
    }

    if (crCheck.length > 0) {
      updates.checkTypes = crCheck;
      updates.selectedCheckType = "CR21";
    }

    // 3. Batch the update if any data was found
    if (Object.keys(updates).length > 0) {
      updateState(updates);
    }
  }, [docType, refsLoaded]);


  const handleReset = () => {
      clearCrDetailSorting();
      clearCrGlSorting();
      updateState({

      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode ||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      selectedCRType:"CR11",
      selectedCheckType: "CR21",
      selectedPayType:"CR01",
      noReprints:"0",

      refDocNo1: "",
      refDocNo2:"",
      checkDate:null,
      remarks:"",
      checkNo:"",
      bank:"",

      depBankCode:companyInfo?.depBankcode||"",
      depAcctName:companyInfo?.depositBankName||"",
      depAcctNo:companyInfo?.depositBankAcctNo||"",

      custName:"",
      custCode:"",
      chainCode:"",
      chainName:"",
      prcNo:"",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL:[],
      openPRCCR_Data_Summary: [],
      openPRCCR_Col_Summary: [],
      openPRCCR_Col_Detail: [],
      totalDebit:"0.00",
      totalCredit:"0.00",
      totalDebitFx1:"0.00",
      totalCreditFx1:"0.00",
      totalDebitFx2:"0.00",
      totalCreditFx2:"0.00",
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
      updateTotalsDisplay (0, 0, 0, 0)

  };



      const loadCompanyData = async () => {
                updateState({ isLoading: true });

                try {
                  const hdtblcol_result = await useFieldLenghtCheck(
                    "cr_hd,cr_dt1,cr_dt2"
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




const fetchTranData = async (documentNo, branchCode,direction="") => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"crNo",direction);
    console.log(data)

    if (!data?.crId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format header date
    let crDateForHeader = '';
    if (data.crDate) {
      const d = new Date(data.crDate);
      crDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
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
      documentStatus: data.crStatus,
      status: data.docStatus,
      documentID: data.crId,
      documentNo: data.crNo,
      branchCode: data.branchCode,
      branchName: data.branchName,
      documentDate: useformatToDatev2(data.crDate),
      selectedCRType: data.crtranType,
      selectedPayType:data.paymentType,
      selectedCheckType:data.ckType,
      depBankCode:data.depBankCode,
      depAcctName:data.depAcctName,
      depAcctNo:data.depAcctNo,
      chainCode: data.chainCode,
      chainName: data.chainName,
      custCode: data.custCode,
      custName: data.custName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      checkNo:data.checkNo,
      checkDate:useformatToDatev2(data.checkDate),
      bank:data.bank,
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      prcNo: data.prcNo,
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









const handleActivityOption = async (action) => {
    if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
    return;
  }

  if (documentStatus !== "") return;

  updateState({ isLoading: true });

  try {
    const {
      branchCode,
      documentNo,
      documentID,
      selectedCRType,
      selectedPayType,
      selectedCheckType,
      chainCode,
      chainName,
      custCode,
      custName,
      depBankCode,
      depAcctName,
      depAcctNo,
      currAmount,
      checkAmount,
      refDocNo1,
      refDocNo2,
      bank,
      checkNo,
      checkDate,
      prcNo,
      currCode,
      currName,
      currRate,
      remarks,
      userCode,
      detailRows,
      detailRowsGL,
    } = state;

    let finalDetailRowsGL = [...detailRowsGL];

    const buildGlData = (glRows) => ({
      branchCode: branchCode,
      crNo: documentNo || "",
      crId: documentID || "",
      crDate: documentDate,
      crtranType: selectedCRType,
      paymentType: selectedPayType,
      ckType: selectedCheckType,
      chainCode: chainCode || "",
      chainName: chainName || "",
      custCode: custCode || "",
      custName: custName || "",
      refDocNo1: refDocNo1 || "",
      refDocNo2: refDocNo2 || "",
      depBankCode: depBankCode || "",
      depAcctName: depAcctName || "",
      depAcctNo: depAcctNo || "",
      prcNo: prcNo || "",
      bank: bank || "",
      checkNo: checkNo || "",
      checkDate: checkDate || null,
      currAmount: parseFormattedNumber(totals.currAmount || currAmount || 0),
      amount: parseFormattedNumber(checkAmount || 0),
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        siNo: row.siNo || "",
        siDate: row.siDate || "",
        siAmount: parseFormattedNumber(row.siAmount || 0),
        appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
        balance: parseFormattedNumber(row.balance || 0),
        unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
        currCode: row.currCode || "",
        currRate: parseFormattedNumber(row.currRate || 0),
        bank: row.bank || "",
        checkNo: row.checkNo || "",
        checkDate: row.checkDate || "",
        checkAmount: parseFormattedNumber(row.checkAmount || 0),
        refBranchcode: row.refBranchcode || "",
        refDocCode: row.refDocCode || "",
        arAcct: row.arAcct || "",
        w2307: row.w2307 || "",
        custCode: row.custCode || "",
        custName: row.custName || "",
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
        slRefDate: entry.slRefDate || null,
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

         const formattedGlEntries = newGlEntries.map((entry) => ({
              ...entry,
              slRefDate: useformatToDatev2(entry.slRefDate),
            }));


        finalDetailRowsGL = newGlEntries;
        updateState({ detailRowsGL: formattedGlEntries });
      }




      const response = await useTransactionUpsert(
        docType,
        buildGlData(finalDetailRowsGL),
        updateState,
        "crId",
        "crNo"
      );

      if (response) {
        const responseDocNo =  response.data[0].crNo;
        const responseDocId =  response.data[0].crId;

        await fetchTranData(responseDocNo,branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

        updateState({
          documentNo: response?.data?.[0]?.crNo || "",
          documentID: response?.data?.[0]?.crId || "",
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


  const performAddRow = async ({
  nextCustCode = custCode,
  nextCustName = custName,
  nextChainCode = chainCode,
  nextCurrCode = currCode,
  nextCurrRate = currRate,
} = {}) => {
    if(selectedCRType ==="CR11" ) {
      await handleOpenARBalance({ custCode: nextCustCode, chainCode: nextChainCode, branchCode });
      return;
    }

  try {
    const items = await handleFetchDetail(nextCustCode);
    const itemList = Array.isArray(items) ? items : [items];
    const newRows = await Promise.all(itemList.map(async (item) => {

      return {
        lnNo: "",
        w2307: "",
        siNo: "00000000",
        siDate: documentDate,
        siAmount:"0.00",
        appliedAmount: "0.00",
        unappliedAmount: "0.00",
        balance: "0.00",
        arAcct: "",
        currCode: nextCurrCode,
        currRate: formatNumber(nextCurrRate,6) ,
        checkAmount: "0.00",
        custCode: nextCustCode,
        custName: nextCustName,
        refBranchcode: branchCode,
        refDocCode:  "CR",
        groupId: "",
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


  const handleAddRow = async () => {
  const hasCustomerOrChain = Boolean(String(custCode || "").trim() || String(chainCode || "").trim());

  if (!hasCustomerOrChain) {
    pendingAddAfterCustomerRef.current = true;
    updateState({
      custModalOpen: true,
      custModalParams: selectedCRType === "CR11" ? "OpenAR" : "ActiveAll",
      custModalSource: "customer",
    });
    return;
  }

  await performAddRow();
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
    ...getGLTotalsState(updatedRows),
  });
};




  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
        detailRows: updatedRows,
        detailRowsGL:[] });
    updateTotals(updatedRows);

  };




  const handleDeleteRowGL =  (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({
      detailRowsGL: updatedRows,
      ...getGLTotalsState(updatedRows),
    });
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
 if (!detailRows || selectedCRType === "CR11" ) {
      return;
      }


  if (documentID ) {
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
                  documentDate:useGetCurrentDayV2(),
                  noReprints:"0",
                  detailRowsGL:[]
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
  const docNo = params.get("crNo");
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
        pendingAddAfterCustomerRef.current = false;
        updateState({ custModalOpen: false, custModalSource: null });
        return;
    }

    if (custModalSource === "chain") {
        pendingAddAfterCustomerRef.current = false;
        updateState({
            custModalOpen: false,
            custModalSource: null,
            chainCode: selectedData?.custCode || "",
            chainName: selectedData?.custName || "",
            custCode: "",
            custName: "",
        });
        return;
    }

    const shouldContinueAdd = pendingAddAfterCustomerRef.current && custModalSource === "customer";
    pendingAddAfterCustomerRef.current = false;
    updateState({ custModalOpen: false, custModalSource: null });
    updateState({ isLoading: true });

    try {
        const custDetails = {
            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            currCode: selectedData?.currCode || '',
        };

        updateState({
            custName: selectedData.custName,
            custCode: selectedData.custCode,
            chainCode: "",
            chainName: "",
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



          // Replace Customer Info in Invoice Details on Change of Customer
        const responseCurrRate = await handleSelectCurrency(custDetails.currCode)
        const nextCurrRate = responseCurrRate || currRate;
        if (responseCurrRate) {
          if (detailRows && selectedCRType !== "CR11" ) {
          const updatedRows = detailRows.map((row) => ({
            ...row,
            custCode: custDetails.custCode,
            custName: custDetails.custName,
            currCode: custDetails.currCode,
            currRate: responseCurrRate
          }));

          updateState({ detailRows: updatedRows , detailRowsGL: [] });
        }
        }

        if (shouldContinueAdd) {
          await performAddRow({
            nextCustCode: custDetails.custCode,
            nextCustName: custDetails.custName,
            nextChainCode: "",
            nextCurrCode: custDetails.currCode || currCode,
            nextCurrRate,
          });
        }

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
  let totalUnApplied = 0;
  let totalBalance = 0;


  rows.forEach(row => {

    const perSIAmt = parseFormattedNumber(row.siAmount || 0) || 0;
    const perApplied = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const perUnApplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;
    const perBalance = parseFormattedNumber(row.balance  || 0) || 0;


    totalSIAmt+= perSIAmt;
    totalApplied+= perApplied;
    totalUnApplied+= perUnApplied;
    totalBalance += perBalance;
  });


    updateTotalsDisplay (totalSIAmt,totalApplied, totalBalance,totalUnApplied);

};





const handleDetailChange = async (index, field, value, runCalculations = true) => {
  const updatedRows = [...(detailRowsRef.current || [])];
  const originalRow = { ...updatedRows[index] };

  const numericFields = [
    "appliedAmount",
    "unappliedAmount",
    "siAmount",
    "checkAmount",
    "balance",
  ];

  const lookupFields = ["arAcct"];

  const normalizeValue = (fld, val) => {
    if (lookupFields.includes(fld)) {
      return val?.acctCode ?? val ?? "";
    }

    if (numericFields.includes(fld)) {
      return parseFormattedNumber(val) || 0;
    }

    return val ?? "";
  };

  const originalFieldValue = normalizeValue(field, originalRow?.[field]);
  const incomingFieldValue = normalizeValue(field, value);

  const glTriggerFields = ["appliedAmount", "unappliedAmount", "arAcct"];
  const shouldClearGL =
    glTriggerFields.includes(field) && originalFieldValue !== incomingFieldValue;

  updatedRows[index] = {
    ...updatedRows[index],
    [field]: value,
  };

  const row = updatedRows[index];

  if (field === "arAcct") {
    row[field] = value?.acctCode ?? "";
  }

  if (runCalculations) {
    const origSIAmt = parseFormattedNumber(row.siAmount) || 0;
    const origUnApplied = parseFormattedNumber(row.unappliedAmount) || 0;
    const origApplied = parseFormattedNumber(row.appliedAmount) || 0;
    const newCheckAmt = origApplied + origUnApplied;

    if (field === "appliedAmount") {
      if (selectedCRType === "CR11") {
        const newBalance = origSIAmt - origApplied;
        row.checkAmount = formatNumber(newCheckAmt);
        row.balance = formatNumber(origApplied > origSIAmt ? 0 : newBalance);

        const applied =
          origSIAmt < 0
            ? Math.abs(origApplied) <= Math.abs(origSIAmt)
              ? origApplied
              : origSIAmt
            : Math.min(origApplied, origSIAmt);

        row.appliedAmount = formatNumber(applied);
      }

      if (selectedCRType === "CR13" || selectedCRType === "CR12") {
        row.checkAmount = formatNumber(newCheckAmt);
        row.balance = formatNumber(0);
        row.siAmount = formatNumber(newCheckAmt);
        row.appliedAmount = formatNumber(origApplied);
      }
    }

    if (field === "unappliedAmount") {
      row.checkAmount = formatNumber(newCheckAmt);
      row.balance = formatNumber(
        selectedCRType === "CR11" ? origSIAmt - origApplied : 0
      );
      row.unappliedAmount = formatNumber(origUnApplied);
    }
  }

  updatedRows[index] = row;

  updateState({
    detailRows: updatedRows,
    ...(shouldClearGL ? { detailRowsGL: [] } : {}),
  });

  updateTotals(updatedRows);
};





function handleFieldBehavior(option) {
  switch (option) {

    case "disableOnNonCheckPay":
      return (
        isFormDisabled ||
        selectedPayType !== "CR01" ||
        selectedCheckType === "CR22"
      );

    case "hiddenDetailSingleCheck":
     return (
        selectedCheckType !== "CR22" || selectedPayType !== "CR01"
      );


    case "hiddenDetailAdvaces":
     return (
        selectedCRType === "CR13" ||  selectedCRType === "CR12"
      );


    case "disableOnSaved":
     return (
        isFormDisabled ||
        (selectedCRType === "CR11" && state.documentNo !== "" )
      );



    default:
      return false;
  }
};




function handleColumnLabel(columnName) {
  switch (columnName) {

     case "SINo":
      if(selectedCRType === "CR13"  ||  selectedCRType === "CR12") {
        return "Reference No"
      }
      return "SI/SVI No."


      case "SIDate":
      if(selectedCRType === "CR13"||  selectedCRType === "CR12") {
        return "Reference Date"
      }
      return "SI/SVI Date"

      case "Applied":
      if(selectedCRType === "CR13") {
        return "Advances Amount"
      }

      else if(selectedCRType === "CR12") {
        return "Amount"
      }
      return "Applied Amount"



       case "ARAcct":
      if(selectedCRType === "CR13") {
        return "Advances Account"
      }
      return "AR Account"



       default:
      return "";
  }
}




  const handlePaymentTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({selectedPayType:selectedType})

  };


  const handleCheckTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({selectedCheckType:selectedType})

  };



  const handleCRTypeChange = (e) => {
   const selectedType = e.target.value;
    updateState({selectedCRType:selectedType})

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
}




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

        const specialAccounts = ['arAcct'];
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

      const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.password,confirmation.reason,updateState);
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
    await useHandlePrint(documentID, docType, mode , userCode);

    updateState({
      showSpinner: false
    });

};





const handleCloseBankMast = async (selectedBankCode) => {
    if (selectedBankCode && selectedBankCode !== null) {
     const result = await useTopAccountRow(selectedBankCode.acctCode);
     if (result) {
      updateState({ depBankCode: selectedBankCode.bankCode,
                    depAcctName:result.acctName,
                    depAcctNo:selectedBankCode.bankAcctNo,
                    detailRowsGL: []
             });
    }
  }
  updateState({ showBankMastModal: false});
};


const normalizeLookupDate = (value) => {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDateMatch) {
    const month = slashDateMatch[1].padStart(2, "0");
    const day = slashDateMatch[2].padStart(2, "0");
    return `${slashDateMatch[3]}-${month}-${day}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isAfterLookupDate = (left, right) => {
  const leftDate = normalizeLookupDate(left);
  const rightDate = normalizeLookupDate(right);
  return !!leftDate && !!rightDate && leftDate > rightDate;
};

const getApiErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unexpected error.";

const hasSameInvoiceWithDifferentChecks = (rows = []) => {
  const checksByInvoice = new Map();

  rows.forEach((row) => {
    const siNo = String(row?.siNo || "").trim();
    if (!siNo) return;

    const checkSignature = [
      row?.bank || "",
      row?.checkNo || "",
      normalizeLookupDate(row?.checkDate),
      row?.checkAmount || "",
    ].join("|");

    if (!checksByInvoice.has(siNo)) {
      checksByInvoice.set(siNo, new Set());
    }

    checksByInvoice.get(siNo).add(checkSignature);
  });

  return [...checksByInvoice.values()].some((checks) => checks.size > 1);
};

const handleOpenPRCLookup = async () => {
  const fieldsToCheck = {
    "Header : Branch": branchCode,
    "Header : CR Date": documentDate,
  };

  const isValid = await swalValidateRequiredFields(fieldsToCheck, "Open Provisional Receipt Lookup");
  if (!isValid) return;

  try {
    updateState({ isLoading: true, showSpinner: true });

    const endpoint = "getPRCCR_OpenSummary";
    const response = await fetchDataJson(endpoint, {
      branchCode,
      prcNo: "",
      custCode,
      chainCode,
    });

    const prcRows = response?.data?.[0]?.result
      ? JSON.parse(response.data[0].result)
      : [];

    if (prcRows.length === 0) {
      swalErrorAlert(
        "Open Provisional Receipt",
        "There are no open Provisional Receipt records for the selected branch/customer."
      );
      return;
    }

    const summaryColumns = await selectedHSColConfig(endpoint);
    const detailColumns = await selectedHSColConfig("getPRCCR_OpenDetail");

    updateState({
      openPRCCR_Data_Summary: prcRows,
      openPRCCR_Col_Summary: summaryColumns,
      openPRCCR_Col_Detail: detailColumns,
      showOpenPRCModal: true,
    });
  } catch (error) {
    console.error("Failed to fetch Open Provisional Receipt:", error);
    swalErrorAlert("Open Provisional Receipt", getApiErrorMessage(error));
    updateState({
      openPRCCR_Data_Summary: [],
      openPRCCR_Col_Summary: [],
      openPRCCR_Col_Detail: [],
    });
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};

const handleClosePRCLookup = async (payload) => {
  const selectedDetails = Array.isArray(payload?.details) ? payload.details : [];
  const selectedSummaries = Array.isArray(payload?.summary) ? payload.summary : [];

  if (selectedDetails.length === 0) {
    swalErrorAlert("Open Provisional Receipt", "Please select at least one invoice detail.");
    return;
  }

  const postDatedRows = selectedDetails.filter((row) =>
    isAfterLookupDate(row?.checkDate, documentDate)
  );

  if (postDatedRows.length > 0) {
    const firstPostDated = postDatedRows[0];
    swalErrorAlert(
      "Open Provisional Receipt",
      `Cannot select post-dated checks. Check Date ${normalizeLookupDate(firstPostDated.checkDate)} is later than CR Date ${normalizeLookupDate(documentDate)}.`
    );
    return;
  }

  const firstSummary = selectedSummaries[0] || {};
  const prcNumbers = [
    ...new Set(selectedSummaries.map((row) => row?.prcNo).filter(Boolean)),
  ].join(",");

  const newRows = selectedDetails.map((entry, idx) => ({
    lnNo: detailRows.length + idx + 1,
    w2307: "",
    siNo: entry.siNo || "",
    siDate: normalizeLookupDate(entry.siDate),
    siAmount: formatNumber(entry.siAmount || 0, 2),
    appliedAmount: formatNumber(entry.appliedAmount || 0, 2),
    unappliedAmount: formatNumber(entry.unappliedAmount || 0, 2),
    balance: formatNumber(entry.balance || 0, 2),
    arAcct: entry.arAcct || "",
    currCode: entry.currCode || firstSummary.currCode || currCode,
    currRate: formatNumber(entry.currRate || firstSummary.currRate || currRate || 1, 6),
    bank: entry.bank || "",
    checkNo: entry.checkNo || "",
    checkDate: normalizeLookupDate(entry.checkDate),
    checkAmount: formatNumber(entry.checkAmount || entry.appliedAmount || 0, 2),
    custCode: entry.custCode || firstSummary.custCode || custCode,
    custName: entry.custName || firstSummary.custName || custName,
    refBranchcode: entry.refBranchCode || entry.refBranchcode || firstSummary.branchCode || branchCode,
    refDocCode: entry.refDocCode || "PRC",
    groupId: entry.groupId || "",
  }));

  const updatedRows = [...detailRows, ...newRows];
  const shouldUseMultipleChecks = hasSameInvoiceWithDifferentChecks(selectedDetails);
  updateState({
    prcNo: prcNumbers || firstSummary.prcNo || "",
    selectedCheckType: shouldUseMultipleChecks ? "CR22" : selectedCheckType,
    chainCode: firstSummary.chainCode || chainCode,
    chainName: firstSummary.chainName || chainName,
    custCode: firstSummary.custCode || custCode,
    custName: firstSummary.custName || custName,
    depBankCode: firstSummary.depBankCode || depBankCode,
    depAcctName: firstSummary.depAcctName || depAcctName,
    depAcctNo: firstSummary.depAcctNo || depAcctNo,
    currCode: firstSummary.currCode || currCode,
    currName: firstSummary.currName || currName,
    currRate: formatNumber(firstSummary.currRate || currRate || 1, 6),
    detailRows: updatedRows,
    detailRowsGL: [],
    showOpenPRCModal: false,
    openPRCCR_Data_Summary: [],
    openPRCCR_Col_Summary: [],
    openPRCCR_Col_Detail: [],
  });
  updateTotals(updatedRows);
};




const handleOpenARBalance = async (overrides = {}) => {
  try {
    updateState({ isLoading: true });


    const endpoint ="getOpenARBalance"
    const lookupCustCode = overrides.custCode ?? custCode;
    const lookupBranchCode = overrides.branchCode ?? branchCode;
    const response = await fetchDataJson(endpoint, { custCode: lookupCustCode, branchCode: lookupBranchCode });
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

      const result = await useSelectedOpenARBalance(payload);
      if (result) {
      const newRows = result.map((entry, idx) => ({
        lnNo: idx + 1,
        w2307: "",
        siNo: entry.siNo,
        siDate: entry.siDate,
        siAmount: formatNumber(entry.balance,2),
        appliedAmount: formatNumber(entry.balance,2),
        unappliedAmount: "0.00",
        balance: "0.00",
        arAcct: entry.arAcct,
        currCode: entry.currCode,
        currRate: formatNumber(entry.currRate,6) ,
        bank:bank,
        checkNo:checkNo,
        checkDate:checkDate,
        checkAmount: formatNumber(entry.balance,2),
        custCode: entry.custCode,
        custName: entry.custName,
        refBranchcode: branchCode,
        refDocCode: entry.refDocCode,
        groupId: entry.groupId,

      }));


      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows});
      updateTotals(updatedRows);
    }
  }
  updateState({ showARBalanceModal: false,
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

const renderCrDetailCell = (columnKey, row, index) => {
  const columnWidth = getCrDetailFallbackWidth(columnKey);
  const style = getCrDetailCellStyle(columnKey, columnWidth);
  const isLockedSourceRow = (row.groupId !== null && row.groupId !== "") || isFormDisabled;

  const focusNextDetailCell = (field) => {
    focusNextCrDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: crDetailEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
    });
  };

  const textInput = (field, options = {}) => (
    <input
      type={options.type || "text"}
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      disabled={options.disabled ?? false}
      readOnly={options.readOnly ?? isFormDisabled}
      maxLength={options.maxLength}
      onChange={(e) => handleDetailChange(index, field, e.target.value, options.runCalculations ?? true)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || options.disabled || isFormDisabled) return;
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
      value={options.displayValue ?? row[field] ?? ""}
      disabled={options.disabled ?? isFormDisabled}
      readOnly={isFormDisabled || options.readOnly}
      onChange={(e) => {
        const raw = e.target.value;
        const allowNegative = options.allowNegative ?? false;
        let sanitizedValue = raw.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, "");
        if (allowNegative) {
          const hasMinus = sanitizedValue.includes("-");
          sanitizedValue = sanitizedValue.replace(/-/g, "");
          if (hasMinus) sanitizedValue = `-${sanitizedValue}`;
        }
        const regex = allowNegative ? /^-?\d*(\.\d{0,2})?$/ : /^\d*(\.\d{0,2})?$/;
        const isIntermediate = sanitizedValue === "" || (allowNegative && sanitizedValue === "-");
        if (regex.test(sanitizedValue) || isIntermediate) {
          handleDetailChange(index, field, sanitizedValue, false);
        }
      }}
      onFocus={(e) => clearCrDetailZeroOnFocus(e, { isEditable: !(options.disabled ?? isFormDisabled), onClear: (value) => handleDetailChange(index, field, value, false) })}
      onBlur={async (e) => {
        const num = parseFormattedNumber(e.target.value);
        if (!isNaN(num)) await handleDetailChange(index, field, num, true);
        setFocusedCell(null);
      }}
      onKeyDown={async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const num = parseFormattedNumber(e.target.value);
          if (!isNaN(num)) await handleDetailChange(index, field, num, true);
          focusNextDetailCell(field);
        }
      }}
    />
  );

  const renderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    w2307: () => <td key={columnKey} className="global-tran-td-ui" style={style}><select id={`w2307-${index}`} className="w-full global-tran-td-inputclass-ui" value={row.w2307 || ""} disabled={isFormDisabled} onChange={(e) => handleDetailChange(index, "w2307", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("w2307"); } }}><option value=""></option><option value="Y">Yes</option></select></td>,
    siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("siNo", { maxLength: crFieldLengths.siNo, readOnly: isLockedSourceRow })}</td>,
    siDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("siDate", { type: "date", readOnly: isLockedSourceRow })}</td>,
    siAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.siAmount)) || ""} readOnly /></td>,
    appliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("appliedAmount", { allowNegative: parseFormattedNumber(row.siAmount) < 0 })}</td>,
    unappliedAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("unappliedAmount", { allowNegative: true })}</td>,
    balance: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.balance)) || ""} readOnly /></td>,
    arAcct: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center">{textInput("arAcct", { className: "text-center pr-6 cursor-pointer", readOnly: true })}{(!isFormDisabled && (row.groupId == null || row.groupId === "")) && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" })} />}</div></td>,
    currCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("currCode", { readOnly: true })}</td>,
    currRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.currRate), 6) || ""} readOnly /></td>,
    bank: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("bank", { disabled: isFormDisabled })}</td>,
    checkNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("checkNo", { disabled: isFormDisabled, maxLength: crFieldLengths.checkNo })}</td>,
    checkDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("checkDate", { type: "date", disabled: isFormDisabled })}</td>,
    checkAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.checkAmount)) || ""} readOnly /></td>,
    custCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custCode", { readOnly: true })}</td>,
    custName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("custName", { readOnly: true })}</td>,
    refBranchcode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("refBranchcode", { readOnly: true })}</td>,
    refDocCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("refDocCode", { readOnly: true })}</td>,
    groupId: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("groupId", { readOnly: true })}</td>,
  };

  return renderers[columnKey]?.() ?? null;
};

const renderCrGlCell = (columnKey, row, index) => {
  const columnWidth = getCrGlFallbackWidth(columnKey);
  const style = getCrGlCellStyle(columnKey, columnWidth);
  const glModalHandlers = { acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }), slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }), vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true }) };

  const focusNextGlCell = (field) => {
    focusNextCrGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: crGlEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value),
    });
  };

  const glTextInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly={options.readOnly ?? isFormDisabled}
      maxLength={options.maxLength}
      onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
        e.preventDefault();
        focusNextGlCell(field);
      }}
    />
  );

  const glLookupInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()}
      value={row[field] || ""}
      readOnly={isFormDisabled || options.readOnly}
      onChange={(e) => handleDetailChangeGL(index, field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || isFormDisabled) return;
        e.preventDefault();
        focusNextGlCell(field);
      }}
    />
  );

  const glAmountInput = (field) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className="w-full global-tran-td-inputclass-ui text-right"
      value={row[field] || ""}
      readOnly={isFormDisabled}
      onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChangeGL(index, field, sanitizedValue); }}
      onKeyDown={(e) => { if (e.key === "Enter" && !isFormDisabled) { e.preventDefault(); handleBlurGL(index, field, e.target.value, true); focusNextCrGlRowInput(index, field, { rows: detailRowsGL, zeroClearFields: crGlEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value) }); } }}
      onFocus={(e) => clearCrGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
      onBlur={(e) => { if (isFormDisabled) return; handleBlurGL(index, field, e.target.value); }}
    />
  );

  const renderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    acctCode: () => { const readOnly = false; const showLookupIcon = !isFormDisabled; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    rcCode: () => { const readOnly = true; const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    slCode: () => { const readOnly = true; const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    vatCode: () => { const readOnly = true; const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    atcCode: () => { const readOnly = true; const hasLookupValue = Boolean(String(row[columnKey] || "").trim()); const showLookupIcon = !isFormDisabled && hasLookupValue; return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full">{glLookupInput(columnKey, { readOnly })}{showLookupIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={glModalHandlers[columnKey]} />}</div></td>; },
    sltypeCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey)}</td>,
    slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput(columnKey, { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
    particular: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("particular")}</td>,
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{glTextInput("atcName")}</td>,
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly /></td>,
    debit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    credit: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    debitFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    creditFx1: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    debitFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    creditFx2: () => <td key={columnKey} className="global-tran-td-ui text-right" style={style}>{glAmountInput(columnKey)}</td>,
    slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><DateFormatInput id={`slRefDate${index}`} value={row.slRefDate || ""} disabled={isFormDisabled} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`slRefDate${index}`] !== undefined) handleDetailChangeGL(index, "slRefDate", updates[`slRefDate${index}`], false); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell("slRefDate"); }} /></td>,
  };

  return renderers[columnKey]?.() ?? null;
};



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


        // Replace Currency on Change of Currecy
        if (detailRows && selectedCRType !== "CR11" ) {
          const updatedRows = detailRows.map((row) => ({
            ...row,
            currCode: currCode,
            currRate: formatNumber(parseFormattedNumber(rate),6)
          }));

          updateState({ detailRows: updatedRows , detailRowsGL:[]});
        }




        return formatNumber(parseFormattedNumber(rate),6)
      }
    }
   return formatNumber(1,6)
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
              detailsRoute="/page/CR"

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
            onClick={() => updateState({ activeTab: "basic" })}
          >
            Basic Information
          </button>
          {/* Provision for Other Tabs */}
        </div>




        {/* SVI Header Form Section - Main Grid Container */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="cr_hd">
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
                      onLookup={() => updateState({ branchModalOpen: true })}
                    />

                    <FieldRenderer
                      id="crNo"
                      label="CR No."
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
                        CR Date
                      </label>
                    </div>

                    <FieldRenderer
                      id="selectedCRType"
                      label="CR Type"
                      type="select"
                      value={selectedCRType || ""}
                      disabled={handleFieldBehavior("disableOnSaved")}
                      onChange={(val) => handleCRTypeChange({ target: { value: val } })}
                      options={crTypes.map((t) => ({
                        label: t.DROPDOWN_NAME,
                        value: t.DROPDOWN_CODE,
                      }))}
                    />
                  </div>

                  {/* Column 2 */}
                  <div className="global-tran-textbox-group-div-ui">
                    <FieldRenderer
                      id="chainCode"
                      label="Chain Code"
                      required
                      type="lookup"
                      value={chainCode || ""}
                      disabled={handleFieldBehavior("disableOnSaved")}
                      readOnly
                      lookupDisabled={isFetchDisabled}
                      onLookup={() => updateState({ custModalOpen: true, custModalParams: "ActiveChain", custModalSource: "chain" })}
                    />

                    <FieldRenderer
                      id="chainName"
                      label="Chain Name"
                      required
                      type="text"
                      value={chainName || ""}
                      disabled
                      readOnly
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
                      onLookup={() => updateState({ custModalOpen: true,
                                                    custModalParams : selectedCRType==="CR11"?"OpenAR":"ActiveAll",
                                                    custModalSource: "customer" })}
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
                    <FieldRenderer
                      id="depAcctName"
                      label="Bank Name"
                      type="lookup"
                      value={depAcctName || ""}
                      disabled={isFormDisabled}
                      readOnly
                      lookupDisabled={isFetchDisabled}
                      onLookup={() => updateState({ showBankMastModal: true })}
                    />

                    <FieldRenderer
                      id="depAcctNo"
                      label="Bank Account No."
                      type="text"
                      value={depAcctNo || ""}
                      disabled
                      readOnly
                    />

                    <FieldRenderer
                      id="currAmount"
                      label="Original Amount"
                      type="amount"
                      value={totals.currAmount || ""}
                      disabled={isFormDisabled}
                      readOnly
                    />

                    <div className="flex gap-4">
                      <input type="hidden" id="currCode" value={currCode || ""} readOnly />

                      <div className="flex-grow w-2/3">
                        <FieldRenderer
                          id="currName"
                          label="Currency"
                          type="lookup"
                          value={
                              currCode
                                ? `${currCode}${currName ? ` - ${currName}` : ""}`
                                : ""
                            }
                          disabled={isFormDisabled}
                          onLookup={() => updateState({ currencyModalOpen: true })}
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

                    <FieldRenderer
                      id="checkAmount"
                      label="Check Amount"
                      type="amount"
                      value={checkAmount || ""}
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Remarks */}
                  <div className="col-span-full">
                    <div className="relative p-2">
                      <textarea
                        id="remarks"
                        placeholder=""
                        rows={6}
                        className="peer global-tran-textbox-remarks-ui pt-2"
                        value={remarks}
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
                    id="prcNo"
                    label="Prov. Receipt No."
                    type="lookup"
                    value={prcNo || ""}
                    disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                    readOnly
                    lookupDisabled={isFetchDisabled}
                    onLookup={handleOpenPRCLookup}
                  />

                  <FieldRenderer
                    id="payType"
                    label="Payment Type"
                    type="select"
                    value={selectedPayType || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => handlePaymentTypeChange({ target: { value: val } })}
                    options={paymentTypes.map((t) => ({
                      label: t.DROPDOWN_NAME,
                      value: t.DROPDOWN_CODE,
                    }))}
                  />

                  <FieldRenderer
                    id="checkType"
                    label="Check Type"
                    type="select"
                    value={selectedCheckType || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => handleCheckTypeChange({ target: { value: val } })}
                    options={checkTypes.map((t) => ({
                      label: t.DROPDOWN_NAME,
                      value: t.DROPDOWN_CODE,
                    }))}
                  />

                  <FieldRenderer
                    id="checkNo"
                    label="Check No"
                    type="text"
                    value={checkNo || ""}
                    disabled={handleFieldBehavior("disableOnNonCheckPay")}
                    onChange={(val) => updateState({ checkNo: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "check_no")}
                  />

                  <div className="relative w-full">
                    <div
                      className={`flex items-stretch global-ref-textbox-ui ${
                        !handleFieldBehavior("disableOnNonCheckPay")
                          ? "global-ref-textbox-enabled"
                          : "global-ref-textbox-disabled"
                      }`}
                    >
                      <DateFormatInput
                        id="checkDate"
                        className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                        value={checkDate}
                        disabled={handleFieldBehavior("disableOnNonCheckPay")}
                        updateState={updateState}
                      />
                    </div>
                    <label
                      htmlFor="checkDate"
                      className={`global-ref-floating-label ${
                        !handleFieldBehavior("disableOnNonCheckPay")
                          ? "global-ref-label-enabled"
                          : "global-ref-label-disabled"
                      }`}
                    >
                      Check Date
                    </label>
                  </div>

                  <FieldRenderer
                    id="bank"
                    label="Bank"
                    type="text"
                    value={bank || ""}
                    disabled={handleFieldBehavior("disableOnNonCheckPay")}
                    onChange={(val) => updateState({ bank: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "bank")}
                  />

                  <FieldRenderer
                    id="refDocNo1"
                    label="Ref Doc No. 1"
                    type="text"
                    value={refDocNo1 || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ refDocNo1: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "refcr_no1")}
                  />

                  <FieldRenderer
                    id="refDocNo2"
                    label="Ref Doc No. 2"
                    type="text"
                    value={refDocNo2 || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ refDocNo2: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "refcr_no2")}
                  />
                </div>
       </div>


    </div>

      {/* APV Detail Section */}
      <div id="apv_dtl" className="global-tran-tab-div-ui" >

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
              // onClick={() => setGLActiveTab('invoice')}
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
              {orderedCrDetailColumns.map((column) =>
                renderCrDetailHeader(column.label, column.key, column.width, {
                  orderedColumns: orderedCrDetailColumns,
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



          <tbody className="relative">{sortedCrDetailRows.map(({ row, originalIndex }) => (
            <tr key={originalIndex} className="global-tran-tr-ui">
              {orderedCrDetailColumns.map((column) =>
                renderCrDetailCell(column.key, row, originalIndex)
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
        {renderCrDetailHeaderContextMenu()}
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

      {!handleFieldBehavior("hiddenDetailAdvaces") && (
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Invoice Amount:
        </label>
        <label id="totalSIAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalSIAmount}
        </label>
      </div>
      )}
      {/* Total VAT Amount */}
      <div className="global-tran-tab-footer-total-div-ui" >
        <label className="global-tran-tab-footer-total-label-ui">
          {handleFieldBehavior("hiddenDetailAdvaces")? "Total Advances Amount:" : "Total Applied Amount:"}
        </label>
        <label id="totalAppliedAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalAppliedAmount}
        </label>
      </div>

      {/* Total ATC Amount */}
      <div className="global-tran-tab-footer-total-div-ui" >
        <label className="global-tran-tab-footer-total-label-ui">
          Total UnApplied Amount:
        </label>
        <label id="totalUnappliedAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalUnappliedAmount}
        </label>
      </div>

      {/* Total Payable Amount (Invoice + VAT - ATC) */}
      {!handleFieldBehavior("hiddenDetailAdvaces") && (
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Balance:
        </label>
        <label id="totalBalanceAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalBalanceAmount}
        </label>
      </div>
      )}
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
                {orderedCrGlColumns.map((column) =>
                  renderCrGlHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedCrGlColumns,
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
              {sortedCrGlRows.map(({ row, originalIndex }) => (
                <tr key={originalIndex} className="global-tran-tr-ui">
                  {orderedCrGlColumns.map((column) =>
                    renderCrGlCell(column.key, row, originalIndex)
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
          {renderCrGlHeaderContextMenu()}
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
        customParam={custModalParams}
      />
    )}



    {showBankMastModal && (
      <BankMastLookupModal
        isOpen={showBankMastModal}
        onClose={handleCloseBankMast}
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


    {showOpenPRCModal && (
      <GlobalCombinedLookup
        isOpen={showOpenPRCModal}
        title="Open Provisional Receipt"
        summarySelectionMode="multiple"
        detailSelectionMode="multiple"
        summaryColumns={openPRCCR_Col_Summary}
        detailColumns={openPRCCR_Col_Detail}
        summaryData={openPRCCR_Data_Summary}
        tabTitles={["Open PRC Summary", "Open PRC Detail"]}
        fetchDetailApi={async (selectedIds) => {
          const idString = Array.isArray(selectedIds)
            ? selectedIds.join(",")
            : selectedIds;

          const payload = {
            json_data: JSON.stringify({
              json_data: {
                selectedId: idString,
                selectedIds: idString,
              },
            }),
          };

          const response = await postRequest("getPRCCR_OpenDetail", payload);
          const rawData = response?.data?.[0]?.result
            ? JSON.parse(response.data[0].result)
            : response?.data || response;

          return { data: Array.isArray(rawData) ? rawData : [] };
        }}
        onClose={handleClosePRCLookup}
        onCancel={() =>
          updateState({
            showOpenPRCModal: false,
            openPRCCR_Data_Summary: [],
            openPRCCR_Col_Summary: [],
            openPRCCR_Col_Detail: [],
          })
        }
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


    {showPostingModal && (
      <PostCR
        isOpen={showPostingModal}
        onClose={() => updateState({ showPostingModal: false })}
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
        params={{noReprints,documentID,docType}}
        onClose={handleCloseSignatory}
        onCancel={() => updateState({ showSignatoryModal: false })}
      />
    )}



      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{branchCode,branchName,docType,documentTitle,fieldNo : "crNo"}}
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
    endpoint="/getCRHistory"
    cacheKey={`CR:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
    activeTabKey="CR_Summary"
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

export default CR;
