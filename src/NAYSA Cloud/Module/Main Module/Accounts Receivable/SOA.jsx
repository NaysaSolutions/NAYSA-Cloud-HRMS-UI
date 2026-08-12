import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import BillCodeLookupModal from "../../../Lookup/SearchBillCodeRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { postRequest} from '../../../Configuration/BaseURL.jsx'
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
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopBillCodeRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
import {
  transactionActionsCellStyle,
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
  useSwalHandleOpenSpecsModal,
  useSwalSuccessAlert,
} from '@/NAYSA Cloud/Global/behavior.jsx';



import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";


const SOA = () => {

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
  const { resetFlag } = useReset();

  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
  const docType = docTypes.SOA; 
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';
 
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);
  
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
    attention: "",
    
    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),



    //Other Header Info
    tblFieldArray :[],
    soaTypes :[],
    refDocNo1: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
    remarks: "",
    billtermCode: "",
    billtermName: "",
    selectedSOAType : "REG",
    userCode: currentUserRow?.userCode||"", 

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],

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
    showBillCodeModal:false,
    showSlModal:false,
    showBilltermModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    billtermModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
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
  tblFieldArray,
  branchCode,
  branchName,
  custCode,
  custName,
  attention,
  currCode,
  currName,
  currRate,
  soaTypes,
  refDocNo1,
  refDocNo2,
  fromDate,
  toDate,
  remarks,
  billtermCode,
  billtermName,
  selectedSOAType,


  // Transaction details
  detailRows,
  detailRowsGL,
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
  showBillCodeModal,
  showSlModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  billtermModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showPostingModal,
  showAllTranDocNo

} = state;



  
  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const normalizedStatus = String(displayStatus).trim().toUpperCase();
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[normalizedStatus] || "";
  const isFormDisabled = isViewDocumentUrl || ["POSTED", "FINALIZED", "CANCELLED", "CLOSED"].includes(normalizedStatus);

  const soaDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "billCode", label: "Bill Code", width: 120 },
    { key: "billName", label: "Description", width: 260 },
    { key: "soaSpecs", label: "Specification", width: 260 },
    { key: "quantity", label: "Quantity", width: 120 },
    { key: "uomCode", label: "Unit", width: 100 },
    { key: "unitPrice", label: "Unit Price", width: 120 },
    { key: "grossAmount", label: "Gross Amount", width: 120 },
    { key: "discRate", label: "Discount Rate", width: 120 },
    { key: "discAmount", label: "Discount Amount", width: 120 },
    { key: "netDisc", label: "Net Amount", width: 120 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "vatAmount", label: "VAT Amount", width: 120 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "atcAmount", label: "ATC Amount", width: 120 },
    { key: "soaAmount", label: "Amount Due", width: 120 },
    { key: "salesAcct", label: "Sales Account", width: 120 },
    { key: "arAcct", label: "AR Account", width: 120 },
    { key: "vatAcct", label: "VAT Account", width: 120 },
    { key: "discAcct", label: "Discount Account", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
  ];
  const {
    getColumnStyle: getSoaDetailColumnStyle,
    getFrozenColumnStyle: getSoaDetailFrozenStyle,
    getOrderedColumns: getOrderedSoaDetailColumns,
    getSortedRows: getSortedSoaDetailRows,
    clearAllSorting: clearSoaDetailSorting,
    clearZeroValueOnFocus: clearSoaDetailZeroOnFocus,
    focusNextRowInput: focusNextSoaDetailRowInput,
    renderHeaderContextMenu: renderSoaDetailHeaderContextMenu,
    renderResizableHeader: renderSoaDetailHeader,
  } = useResizableTableColumns(soaDetailColumnDefs);
  const orderedSoaDetailColumns = getOrderedSoaDetailColumns(soaDetailColumnDefs);
  const getSoaDetailFallbackWidth = (key) =>
    soaDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getSoaDetailCellStyle = (key, fallbackWidth) => ({
    ...getSoaDetailColumnStyle(key, fallbackWidth),
    ...getSoaDetailFrozenStyle(key, orderedSoaDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedSoaDetailRows = getSortedSoaDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const soaGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "vatCode", label: "VAT Code", width: 80 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "atcCode", label: "ATC", width: 80 },
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
    getColumnStyle: getSoaGlColumnStyle,
    getFrozenColumnStyle: getSoaGlFrozenStyle,
    getOrderedColumns: getOrderedSoaGlColumns,
    getSortedRows: getSortedSoaGlRows,
    setColumnOrder: setSoaGlColumnOrder,
    clearAllSorting: clearSoaGlSorting,
    clearZeroValueOnFocus: clearSoaGlZeroOnFocus,
    focusNextRowInput: focusNextSoaGlRowInput,
    renderHeaderContextMenu: renderSoaGlHeaderContextMenu,
    renderResizableHeader: renderSoaGlHeader,
  } = useResizableTableColumns(soaGlColumnDefs);
  const orderedSoaGlColumns = getOrderedSoaGlColumns(soaGlColumnDefs);
  const getSoaGlFallbackWidth = (key) =>
    soaGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getSoaGlCellStyle = (key, fallbackWidth) => ({
    ...getSoaGlColumnStyle(key, fallbackWidth),
    ...getSoaGlFrozenStyle(key, orderedSoaGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setSoaGlColumnOrder(soaGlColumnDefs.map((column) => column.key));
  }, [setSoaGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedSoaGlRows = getSortedSoaGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const soaDetailEnterNextRowZeroClearFields = ["quantity", "unitPrice", "discRate", "discAmount"];
  const soaGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];
  

  //Variables


  const [totals, setTotals] = useState({
  totalGrossAmount: '0.00',
  totalDiscountAmount: '0.00',
  totalNetAmount: '0.00',
  totalVatAmount: '0.00',
  totalSalesAmount: '0.00',
  totalAtcAmount: '0.00',
  totalAmountDue: '0.00',
  });

  const customParamMap = {
        arAct: glAccountFilter.ActiveAll,
        salesAcct: glAccountFilter.ActiveAll,
        vatAcct: glAccountFilter.VATOutputAcct,
        discAcct:glAccountFilter.ActiveAll
  };
  const customParam = customParamMap[accountModalSource] || null;



  const updateTotalsDisplay = (grossAmt, discAmt, netDisc, vat, atc, amtDue) => {
  //console.log("updateTotalsDisplay received RAW totals:", { grossAmt, discAmt, netDisc, vat, atc, amtDue });
    setTotals({
          totalGrossAmount: formatNumber(grossAmt),
          totalDiscountAmount: formatNumber(discAmt),
          totalNetAmount: formatNumber(netDisc),
          totalVatAmount: formatNumber(vat),
          totalSalesAmount: formatNumber(netDisc - vat),
          totalAtcAmount: formatNumber(atc),
          totalAmountDue: formatNumber(amtDue),
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



  useEffect(() => {
    updateState(getGLTotalsState(detailRowsGL));
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


  
  useEffect(() => {
      if (!refsLoaded) return; 
      const filteredTypes = getAllDropDown("SOATRAN_TYPE", docType); 
      if (filteredTypes.length > 0) {
        updateState({
          soaTypes: filteredTypes,
          selectedSOAType: "REG",
        });
      }
  }, [docType, refsLoaded]);
  
  

  const handleReset = () => {
      clearSoaDetailSorting();
      clearSoaGlSorting();

      updateState({

      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,

      refDocNo1: "",
      refDocNo2:"",
      fromDate:null,
      toDate:null,
      remarks:"",
      noReprints:"0",

      custName:"",
      custCode:"",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL:[],
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
      updateTotalsDisplay (0, 0, 0, 0, 0, 0)
  };





  
    
      const loadCompanyData = async () => {
      updateState({ isLoading: true });
    
      try {
        const hdtblcol_result = await useFieldLenghtCheck(
          "soa_hd,soa_dt1,soa_dt2"
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
    const data = await useFetchTranData(documentNo, branchCode,docType,"soaNo",direction);

    if (!data?.soaId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }



    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      quantity: formatNumber(item.quantity),
      unitPrice: formatNumber(item.unitPrice),
      grossAmount: formatNumber(item.grossAmount),
      discRate: formatNumber(item.discRate),
      discAmount: formatNumber(item.discAmount),
      netDisc: formatNumber(item.netDisc),
      vatAmount: formatNumber(item.vatAmount),
      atcAmount: formatNumber(item.atcAmount),
      soaAmount: formatNumber(item.soaAmount),
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
      documentStatus: data.soaStatus,
      status: data.docStatus,
      documentID: data.soaId,
      documentNo: data.soaNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.soaDate), 
      selectedSOAType: data.soatranType,
      custCode: data.custCode,
      custName: data.custName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      fromDate:useformatToDatev2(data.fromDate),
      toDate:useformatToDatev2(data.toDate),
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      billtermCode: data.billtermCode,
      billtermName: data.billtermName,
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


const handleSviNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};




const handleCurrRateNoBlur = (e) => {
  
  const num = formatNumber(e.target.value, 6);
  updateState({ 
        currRate: isNaN(num) ? "0.000000" : num,  
        withCurr2:((glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D"),
        withCurr3:glCurrMode === "T"
        })

};




 
const moveFocusBeforeSave = async () => {
  document.activeElement?.blur?.();

  await Promise.resolve();

  for (let i = 0; i < detailRows.length; i++) {
    const row = detailRows[i];
    await handleDetailChange(i, "quantity", row.quantity, true);
  }

  await Promise.resolve();
  return true;
};





const handleActivityOption = async (action) => {
    if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
        return;
      }



  if (action === "Upsert") {
   await moveFocusBeforeSave();
  }


  if (documentStatus !== "") return;

  updateState({ isLoading: true });

  try {
    const {
      branchCode,
      documentNo,
      documentID,
      selectedSOAType,
      billtermCode,
      custCode,
      custName,
      refDocNo1,
      refDocNo2,
      fromDate,
      toDate,
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
      soaNo: documentNo || "",
      soaId: documentID || "",
      soaDate: documentDate,
      soatranType: selectedSOAType,
      billtermCode: billtermCode,
      custCode: custCode,
      custName: custName,
      refDocNo1: refDocNo1,
      refDocNo2: refDocNo2,
      fromDate: fromDate,
      toDate: toDate,
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        billCode: row.billCode || "",
        billName: row.billName || "",
        soaSpecs: row.soaSpecs || "",
        quantity: parseFormattedNumber(row.quantity || 0),
        uomCode: row.uomCode || "",
        unitPrice: parseFormattedNumber(row.unitPrice || 0),
        grossAmount: parseFormattedNumber(row.grossAmount || 0),
        discRate: parseFormattedNumber(row.discRate || 0),
        discAmount: parseFormattedNumber(row.discAmount || 0),
        netDisc: parseFormattedNumber(row.netDisc || 0),
        vatCode: row.vatCode || "",
        vatName: row.vatName || "",
        vatAmount: parseFormattedNumber(row.vatAmount || 0),
        atcCode: row.atcCode || "",
        atcName: row.atcName || "",
        atcAmount: parseFormattedNumber(row.atcAmount || 0),
        soaAmount: parseFormattedNumber(row.soaAmount || 0),
        salesAcct: row.salesAcct || "",
        arAcct: row.arAcct || "",
        vatAcct: row.vatAcct || "",
        discAcct: row.discAcct || "",
        rcCode: row.rcCode || "",
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
        slRefDate: entry.slRefDate
          ? new Date(entry.slRefDate).toISOString().split("T")[0]
          : null,
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
        "soaId",
        "soaNo"
      );

      if (response) {
        const responseDocNo =  response.data[0].soaNo;
        const responseDocId =  response.data[0].soaId;

        await fetchTranData(responseDocNo,branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint =
          isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(response.data[0].soaId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        
        updateState({
          documentNo: response?.data?.[0]?.soaNo || "",
          documentID: response?.data?.[0]?.soaId || "",
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


  const handleAddRow = async (insertIndex = null) => {
  try {
    const items = await handleFetchDetail(custCode);
    const itemList = Array.isArray(items) ? items : [items];

    const newRows = await Promise.all(
      itemList.map(async (item) => {
        return {
          lnNo: "",
          billCode: "",
          billName: "",
          soaSpecs: "",
          quantity: "1.00",
          uomCode: "",
          unitPrice: "0.00",
          grossAmount: "0.00",
          discRate: "0.00",
          discAmount: "0.00",
          netDisc: "0.00",
          vatCode: "",
          vatName: "",
          vatAmount: "0.00",
          atcCode: "",
          atcName: "",
          atcAmount: "0.00",
          soaAmount: "0.00",
          salesAcct: "",
          arAcct: "",
          vatAcct: item.vatAcctCode || "",
          discAcct: "",
          rcCode: "",
        };
      })
    );

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
  if (documentID ) {
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
      documentDate: useGetCurrentDayV2(),
      noReprints: "0",
    });

    updateState({
      detailRowsGL: Array.isArray(state.detailRowsGL)
        ? state.detailRowsGL.map((row) => ({
            ...row,
            slRefNo: "",
            slRefDate: "",
          }))
        : [],
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
  const docNo = params.get("soaNo");
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
            attention: selectedData?.attention || '',
            billtermCode: selectedData?.billtermCode || '',
            billtermName: selectedData?.billtermName || ''
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
                custDetails.attention = data[0]?.custContact;
                custDetails.billtermCode = data[0]?.billtermCode;
                custDetails.billtermName = data[0]?.billtermName;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        await Promise.all([
            handleSelectCurrency(custDetails.currCode),
            handleSelectBillTerm(custDetails.billtermCode),
            updateState({ attention: custDetails.attention })
        ]);

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({
            isLoading: false,
            triggerGLEntries: parseFormattedNumber(totalDebit)>0
          });
    }
};



  const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalNetDiscount = 0;
  let totalVAT = 0;
  let totalATC = 0;
  let totalAmtDue = 0;
  let totalGrossAmt =0;
  let totalDiscAmt=0;

  rows.forEach(row => {

    const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
    const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
    const invoiceGross = parseFormattedNumber(row.grossAmount || 0) || 0;
    const invoiceNetDisc = parseFormattedNumber(row.netDisc || row.netDisc || 0) || 0;
    const invoiceDiscount = parseFormattedNumber(row.discAmount || 0) || 0;


    totalGrossAmt+= invoiceGross;
    totalDiscAmt+= invoiceDiscount;
    totalNetDiscount+= invoiceNetDisc;
    totalVAT += vatAmount;
    totalATC += atcAmount;
  });

  totalAmtDue = totalNetDiscount - totalATC; 
    updateTotalsDisplay (totalGrossAmt,totalDiscAmt,totalNetDiscount, totalVAT, totalATC, totalAmtDue);

};




const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...(detailRowsRef.current || [])];

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


      if (field === 'billCode'){
          row.billCode= value.billCode,
          row.billName= value.billName,
          row.uomCode=value.uomCode,
          row.arAcct = value.arAcct,
          row.salesAcct= value.salesAcct,
          row.discAcct= value.sDiscAcct,
          row.rcCode= value.rcCode,
          row.quantity= "1.00",
          row.grossAmount= "0.00",
          row.unitPrice= "0.00",
          row.vatAmount= "0.00",
          row.atcAmount= "0.00",
          row.amountDue= "0.00",
          row.discRate= "0.00",
          row.discAmount= "0.00",
          row.soaAmount ="0.00"
    };


    if (['salesAcct', 'arAcct', 'vatAcct', 'discAcct'].includes(field)) {
      row[field] = value.acctCode;
    }



    if (field === 'rcCode' ){
          row.rcCode = value.rcCode   
    };





    if (runCalculations) {  
      const origQuantity = parseFormattedNumber(row.quantity) || 0;
      const origUnitPrice = parseFormattedNumber(row.unitPrice) || 0;
      const origDiscAmount = parseFormattedNumber(row.discAmount) || 0;
      const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

  
      // shared calculation logic
      async function recalcRow(newGrossAmt, newDiscAmount) {
        const newNetDiscount = +(newGrossAmt - newDiscAmount).toFixed(2);
        const newVatAmount = origVatCode ?  getAllTopVatAmount(origVatCode, newNetDiscount) : 0;
        const newNetOfVat = +(newNetDiscount - newVatAmount).toFixed(2);
        const newATCAmount = origAtcCode ?  getAllTopATCAmount(origAtcCode, newNetOfVat) : 0;
        const newAmountDue = +(newNetDiscount - newATCAmount).toFixed(2);


        row.grossAmount = formatNumber(newGrossAmt);
        row.netDisc = formatNumber(newNetDiscount);
        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
        row.soaAmount = formatNumber(newAmountDue);
        row.discAmount = formatNumber(newDiscAmount);
        row.quantity = formatNumber(parseFormattedNumber (row.quantity));
        row.unitPrice = formatNumber(parseFormattedNumber (row.unitPrice));
      }

      if (field === 'quantity') {
        const newQuantity = parseFormattedNumber(row.quantity) || 0;
        const newGrossAmt = +(newQuantity * origUnitPrice).toFixed(2);
        const discountRate = parseFormattedNumber(row.discRate) || 0;
        const newDiscAmount = +(discountRate * newGrossAmt * 0.01).toFixed(2);
        row.discAmount = newDiscAmount.toFixed(2);
        await recalcRow(newGrossAmt, newDiscAmount);
      }

      if (field === 'unitPrice') {
        const newPrice = parseFormattedNumber(row.unitPrice) || 0;
        const newGrossAmt = +(origQuantity * newPrice).toFixed(2);
        const discountRate = parseFormattedNumber(row.discRate) || 0;
        const newDiscAmount = +(discountRate * newGrossAmt * 0.01).toFixed(2);
        row.discAmount = newDiscAmount.toFixed(2);
        await recalcRow(newGrossAmt, newDiscAmount);
      }

      if (field === 'discRate') {
        const newDiscRate = parseFormattedNumber(row.discRate) || 0;
        const newGrossAmt = +(origQuantity * origUnitPrice).toFixed(2);
        const newDiscAmount = +(newDiscRate * newGrossAmt * 0.01).toFixed(2);
        row.discAmount = newDiscAmount.toFixed(2);
        await recalcRow(newGrossAmt, newDiscAmount);
      }

      if (field === 'discAmount') {
        const newDiscAmt = parseFormattedNumber(row.discAmount) || 0;
        const newGrossAmt = +(origQuantity * origUnitPrice).toFixed(2);
        const newDiscRate = +((newDiscAmt / newGrossAmt) * 100).toFixed(2);
        row.discRate = newDiscRate.toFixed(2);
        await recalcRow(newGrossAmt, newDiscAmt);
      }


    if (field === 'vatCode' || field === 'atcCode') {
      async function updateVatAndAtc() {
        const newNetDiscount = +(parseFormattedNumber(row.grossAmount) - parseFormattedNumber(row.discAmount)).toFixed(2);
        let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

        if (field === 'vatCode') {
          newVatAmount = row.vatCode ?  getAllTopVatAmount(row.vatCode, newNetDiscount) : 0;
          row.vatAmount = newVatAmount.toFixed(2);
        }

        const newNetOfVat = +(newNetDiscount - newVatAmount).toFixed(2);
        const newATCAmount = row.atcCode ?  getAllTopATCAmount(row.atcCode, newNetOfVat) : 0;

        row.atcAmount = newATCAmount.toFixed(2);
        row.soaAmount = +(newNetDiscount - newATCAmount).toFixed(2);
      }

      await updateVatAndAtc();
    }


  }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);

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

        const specialAccounts = ['salesAcct', 'arAcct', 'discAcct', 'vatAcct'];
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
    await useHandlePrint(documentID, docType, mode ,userCode);

    updateState({
      showSpinner: false 
    });

};






const handleSaveAndPrint = async (documentID) => {

    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};









const handleCloseBillCodeModal = async (selectedBillCode) => {  
  if (selectedBillCode && selectedRowIndex !== null) {
    const result = await useTopBillCodeRow(selectedBillCode.billCode);
     if (result) {
       handleDetailChange(selectedRowIndex, 'billCode', result);
    }  
  }
  updateState({ showBillCodeModal: false,
                selectedRowIndex: null
             });
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
      }
    }
  };




const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
    handleSelectBillTerm(selectedBillTerm.billtermCode);
  };
    updateState({ billtermModalOpen: false });
}



  const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {

     const result = await useTopBillTermRow(billtermCode);
      if (result) {
      updateState({
        billtermCode:result.billtermCode,
        billtermName:result.billtermName,
        daysDue: result.daysDue 
        })     
      }
    }
  };

  const renderSoaDetailCell = (columnKey, row, index) => {
    const columnWidth = getSoaDetailFallbackWidth(columnKey);
    const style = getSoaDetailCellStyle(columnKey, columnWidth);

    const focusNextDetailCell = (field) => {
      focusNextSoaDetailRowInput(index, field, {
        rows: detailRows,
        zeroClearFields: soaDetailEnterNextRowZeroClearFields,
        parseValue: parseFormattedNumber,
        onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
      });
    };

    const detailTextInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        onChange={(e) => handleDetailChange(index, field, e.target.value, false)}
        readOnly={options.readOnly ?? isFormDisabled}
        maxLength={options.maxLength}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || options.readOnly || isFormDisabled) return;
          e.preventDefault();
          focusNextDetailCell(field);
        }}
      />
    );

    const detailLookupInput = (field, options = {}) => (
      <input
        type="text"
        id={`${field}-${index}`}
        className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
        value={row[field] || ""}
        readOnly
        onKeyDown={(e) => {
          if (e.key !== "Enter" || isFormDisabled) return;
          e.preventDefault();
          focusNextDetailCell(field);
        }}
      />
    );

    const detailColumnRenderers = {
      ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
      billCode: () => <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center">{detailLookupInput("billCode", { className: "text-center pr-6 cursor-pointer" })}{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => updateState({ selectedRowIndex: index, showBillCodeModal: true })} />}</div></td>,
      billName: () => { return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative flex items-center">{detailTextInput("billName", { className: "pr-8" })}{!isFormDisabled && <FontAwesomeIcon icon={faSearch} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => useSwalHandleOpenSpecsModal(index, detailRows, (rowIndex, field, value) => handleDetailChange(rowIndex, field, value, false), row.billName, "Description", "billName", `Enter description for ${row.billCode || "this item"}...`)} />}</div></td>;},
      soaSpecs: () => { return <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative flex items-center">{detailTextInput("soaSpecs", { className: "pr-8" })}{!isFormDisabled && <FontAwesomeIcon icon={faSearch} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={() => useSwalHandleOpenSpecsModal(index, detailRows, (rowIndex, field, value) => handleDetailChange(rowIndex, field, value, false), row.soaSpecs, "Specification", "soaSpecs", `Enter specification for ${row.billCode || "this item"}...`)} />}</div></td>;},
      quantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" id={`${columnKey}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row[columnKey] || ""} readOnly={isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChange(index, columnKey, sanitizedValue, false); }} onFocus={(e) => clearSoaDetailZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChange(index, columnKey, value, false) })} onBlur={async (e) => { const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num, true); setFocusedCell(null); }} onKeyDown={async (e) => { if (e.key === "Enter") { e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num, true); focusNextSoaDetailRowInput(index, columnKey, { rows: detailRows, zeroClearFields: soaDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); } }} /></td>,
      unitPrice: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" id={`${columnKey}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row[columnKey] || ""} readOnly={isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChange(index, columnKey, sanitizedValue, false); }} onFocus={(e) => clearSoaDetailZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChange(index, columnKey, value, false) })} onBlur={async (e) => { const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num, true); setFocusedCell(null); }} onKeyDown={async (e) => { if (e.key === "Enter") { e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num, true); focusNextSoaDetailRowInput(index, columnKey, { rows: detailRows, zeroClearFields: soaDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); } }} /></td>,
      uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{detailTextInput("uomCode", { className: "text-center" })}</td>,
      grossAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row[columnKey])) || ""} readOnly /></td>,
      netDisc: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row[columnKey])) || ""} readOnly /></td>,
      vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row[columnKey])) || ""} readOnly /></td>,
      atcAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row[columnKey])) || ""} readOnly /></td>,
      soaAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row[columnKey])) || ""} readOnly /></td>,
      discRate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" id={`${columnKey}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row[columnKey] || ""} readOnly={isFormDisabled} onChange={(e) => { const value = e.target.value; if (/^\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") handleDetailChange(index, columnKey, value, false); }} onKeyDown={async (e) => { if (e.key === "Enter") { e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num.toFixed(2), true); focusNextSoaDetailRowInput(index, columnKey, { rows: detailRows, zeroClearFields: soaDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); } }} onFocus={(e) => clearSoaDetailZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChange(index, columnKey, value, false) })} onBlur={async (e) => { const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num.toFixed(2), true); }} /></td>,
      discAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" id={`${columnKey}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row[columnKey] || ""} readOnly={isFormDisabled} onChange={(e) => { const value = e.target.value; if (/^\d{0,12}(\.\d{0,2})?$/.test(value) || value === "") handleDetailChange(index, columnKey, value, false); }} onKeyDown={async (e) => { if (e.key === "Enter") { e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num.toFixed(2), true); focusNextSoaDetailRowInput(index, columnKey, { rows: detailRows, zeroClearFields: soaDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); } }} onFocus={(e) => clearSoaDetailZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChange(index, columnKey, value, false) })} onBlur={async (e) => { const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, columnKey, num.toFixed(2), true); }} /></td>,
      vatCode: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      atcCode: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      salesAcct: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      arAcct: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      vatAcct: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      discAcct: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      rcCode: () => { const modalHandlers = { vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }), salesAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "salesAcct" }), arAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "arAcct" }), vatAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "vatAcct" }), discAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "discAcct" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }) }; return <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />{!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[columnKey]} />}</div></td>; },
      vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row[columnKey] || ""} readOnly /></td>,
      atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row[columnKey] || ""} readOnly /></td>,
    };

    return detailColumnRenderers[columnKey]?.() ?? null;
  };

  const renderSoaGlCell = (columnKey, row, index) => {
    const columnWidth = getSoaGlFallbackWidth(columnKey);
    const style = getSoaGlCellStyle(columnKey, columnWidth);
    const glModalHandlers = { acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }), slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }), vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true }) };

    const focusNextGlCell = (field) => {
      focusNextSoaGlRowInput(index, field, {
        rows: detailRowsGL,
        zeroClearFields: soaGlEnterNextRowZeroClearFields,
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
        readOnly={options.readOnly}
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
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBlurGL(index, field, e.target.value, true); focusNextSoaGlRowInput(index, field, { rows: detailRowsGL, zeroClearFields: soaGlEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value) }); } }}
        onFocus={(e) => clearSoaGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
        onBlur={(e) => handleBlurGL(index, field, e.target.value)}
      />
    );

    const glColumnRenderers = {
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

    return glColumnRenderers[columnKey]?.() ?? null;
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
          detailsRoute="/page/SOA"


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
                

        {/* SOA Header Form Section - Main Grid Container */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="soa_hd">
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
                id="soaNo"
                label="SOA No."
                type="lookup"
                value={state.documentNo || ""}
                disabled={state.isDocNoDisabled}
                onChange={(val) => updateState({ documentNo: val })}
                onLookup={() => updateState({ showAllTranDocNo: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSviNoBlur();
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
                  SOA Date
                </label>
              </div>

              <FieldRenderer
                id="custCode"
                label="Customer Code"
                required
                type="lookup"
                value={custCode || ""}
                disabled={isFormDisabled}
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

            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="selectedSOAType"
                  label="SOA Type"
                  type="select"
                  value={selectedSOAType}
                  disabled={isFormDisabled}
                  // onChange={(val) => handleAPTypeChange({ target: { value: val } })}
                  options={soaTypes.map((t) => ({
                      label: t.DROPDOWN_NAME,
                      value: t.DROPDOWN_CODE,
                  }))}
                />

              <>
                <input type="hidden" id="billtermCode" value={billtermCode || ""} readOnly />
                <FieldRenderer
                  id="billtermName"
                  label="Billing Term"
                  required
                  type="lookup"
                  value={billtermName || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => updateState({ billtermModalOpen: true })}
                />
              </>

              <FieldRenderer
                id="attention"
                label="Attention"
                type="text"
                value={attention || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ attention: val })}
                maxLength={useGetFieldLength(tblFieldArray, "attention")}
              />

              <div className="flex gap-4">
                <input type="hidden" id="currCode" value={currCode || ""} readOnly />

                <div className="flex-grow w-2/3">
                  <FieldRenderer
                    id="currName"
                    label="Currency"
                    type="text"
                    value={currName || ""}
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
                  />
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="refDocNo1"
                label="Ref Doc No. 1"
                type="text"
                value={refDocNo1 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo1: val })}
                maxLength={useGetFieldLength(tblFieldArray, "refsoa_no2")}
              />

              <FieldRenderer
                id="refDocNo2"
                label="Ref Doc No. 2"
                type="text"
                value={refDocNo2 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo2: val })}
                maxLength={useGetFieldLength(tblFieldArray, "refsoa_no2")}
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
                    id="fromDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={fromDate}
                    disabled={isFormDisabled}
                    updateState={updateState}
                  />
                </div>
                <label htmlFor="fromDate" className="global-ref-floating-label">
                  From Date
                </label>
              </div>

              <div className="relative w-full">
                <div
                  className={`flex items-stretch global-ref-textbox-ui ${
                    !isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                  }`}
                >
                  <DateFormatInput
                    id="toDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={toDate}
                    disabled={isFormDisabled}
                    updateState={updateState}
                  />
                </div>
                <label htmlFor="toDate" className="global-ref-floating-label">
                  To Date
                </label>
              </div>
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

          {/* Column 4 - Totals */}
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="totalGrossAmount"
              label="Gross Amount"
              type="amount"
              value={totals.totalGrossAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalDiscountAmount"
              label="Discount Amount"
              type="amount"
              value={totals.totalDiscountAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalNetAmount"
              label="Net Amount"
              type="amount"
              value={totals.totalNetAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalVatAmount"
              label="VAT Amount"
              type="amount"
              value={totals.totalVatAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalSalesAmount"
              label="Sales Amount"
              type="amount"
              value={totals.totalSalesAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalAtcAmount"
              label="ATC Amount"
              type="amount"
              value={totals.totalAtcAmount || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="totalAmountDue"
              label="Amount Due"
              type="amount"
              value={totals.totalAmountDue || ""}
              disabled
              readOnly
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
              {orderedSoaDetailColumns.map((column) =>
                renderSoaDetailHeader(column.label, column.key, column.width, {
                  orderedColumns: orderedSoaDetailColumns,
                })
              )}
              {!isFormDisabled && (
                <th
                  className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                  style={{
                    width: "110px",
                    minWidth: "110px",
                    maxWidth: "110px",
                    zIndex: 25,
                    backgroundClip: "padding-box",
                    borderLeft: "1px solid rgba(148, 163, 184, 0.45)",
                    boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.35)",
                    backgroundImage:
                      "linear-gradient(to left, rgba(255,255,255,0.10), rgba(255,255,255,0.00))",
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="relative">
            {sortedSoaDetailRows.map(({ row, originalIndex }) => (
              <tr
                key={`${row.lnNo || originalIndex}-${originalIndex}`}
                className="global-tran-tr-ui"
              >
                {orderedSoaDetailColumns.map((column) =>
                  renderSoaDetailCell(column.key, row, originalIndex)
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
        {renderSoaDetailHeaderContextMenu()}
      </div>
      </div>

    {/* Invoice Details Footer */}
    <div className="global-tran-tab-footer-main-div-ui">


    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <button
        onClick={() =>handleAddRow()}
        className="global-tran-tab-footer-button-add-ui"
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>



    {/* Totals Section */}
   
  
        <div
      className={`global-tran-tab-footer-total-main-div-ui grid gap-1 ${
        currRate > 1 ? "grid-cols-3" : "grid-cols-2"
      }`}
        >
          {/* Header Row */}
          <div></div>
          <div className="global-tran-tab-footer-total-label-ui text-right">
            Currency ({glCurrDefault})
          </div>
          {currRate > 1 && (
            <div className="global-tran-tab-footer-total-label-ui text-right">
              Currency ({currCode})
            </div>
          )}
  
          {/* Total Invoice Amount */}
          <div className="global-tran-tab-footer-total-label-ui">
            Total Invoice Amount:
          </div>
          <div id="totInvoiceAmount" className="global-tran-tab-footer-total-value-ui">
            {currRate === 1
              ? totals.totalNetAmount
              : formatNumber( parseFormattedNumber(totals.totalNetAmount)  * currRate)}
          </div>
          {currRate > 1 && (
            <div className="global-tran-tab-footer-total-value-ui">
              {totals.totalNetAmount}
            </div>
          )}
  
          {/* Total VAT Amount */}
          <div className="global-tran-tab-footer-total-label-ui">
            Total VAT Amount:
          </div>
          <div id="totVATAmount" className="global-tran-tab-footer-total-value-ui">
            {currRate === 1
              ? totals.totalVatAmount
            : formatNumber( parseFormattedNumber(totals.totalVatAmount)  * currRate)}
          </div>
          {currRate > 1 && (
            <div className="global-tran-tab-footer-total-value-ui">
              {totals.totalVatAmount}
            </div>
          )}
  
          {/* Total ATC Amount */}
          <div className="global-tran-tab-footer-total-label-ui">
            Total ATC Amount:
          </div>
          <div id="totATCAmount" className="global-tran-tab-footer-total-value-ui">
            {currRate === 1
              ? totals.totalAtcAmount
              : formatNumber( parseFormattedNumber(totals.totalAtcAmount)  * currRate)}
          </div>
          {currRate > 1 && (
            <div className="global-tran-tab-footer-total-value-ui">
              {totals.totalAtcAmount}
            </div>
          )}
  
          {/* Total Amount Due */}
          <div className="global-tran-tab-footer-total-label-ui">
            Total Amount Due:
          </div>
          <div id="totAmountDue" className="global-tran-tab-footer-total-value-ui">
            {currRate === 1
              ? totals.totalAmountDue
              : formatNumber( parseFormattedNumber(totals.totalAmountDue)  * currRate)}
          </div>
          {currRate > 1 && (
            <div className="global-tran-tab-footer-total-value-ui">
              {totals.totalAmountDue}
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
                {orderedSoaGlColumns.map((column) =>
                  renderSoaGlHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedSoaGlColumns,
                  })
                )}
                {!isFormDisabled && (
                  <th
                    className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900"
                    style={{
                      width: "110px",
                      minWidth: "110px",
                      maxWidth: "110px",
                      zIndex: 25,
                      backgroundClip: "padding-box",
                      borderLeft: "1px solid rgba(148, 163, 184, 0.45)",
                      boxShadow: "-8px 0 14px -12px rgba(15, 23, 42, 0.35)",
                      backgroundImage:
                        "linear-gradient(to left, rgba(255,255,255,0.10), rgba(255,255,255,0.00))",
                    }}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {sortedSoaGlRows.map(({ row, originalIndex }) => (
                <tr
                  key={`${row.acctCode || originalIndex}-${originalIndex}`}
                  className="global-tran-tr-ui"
                >
                  {orderedSoaGlColumns.map((column) =>
                    renderSoaGlCell(column.key, row, originalIndex)
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
          {renderSoaGlHeaderContextMenu()}
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


    {/* Billing Codes Modal  Invoice Detail */}
    {showBillCodeModal && (
      <BillCodeLookupModal  
        isOpen={showBillCodeModal}
        onClose={handleCloseBillCodeModal}
      />
    )}



    {/* VAT Code Modal */}
    {showVatModal && (
      <VATLookupModal  
        isOpen={showVatModal}
        onClose={handleCloseVatModal}
        customParam="OutputServiceSOA"
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "soaNo"}}
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
      endpoint="/getSOAHistory"
      cacheKey={`SOA:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
      activeTabKey="SOA_Summary"
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


export default SOA;
