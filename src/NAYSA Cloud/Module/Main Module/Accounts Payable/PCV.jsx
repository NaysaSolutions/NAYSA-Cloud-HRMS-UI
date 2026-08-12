import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faSpinner,faTrashAlt } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostPCV from "../../../Module/Main Module/Accounts Payable/PostPCV.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";


// Configuration
import { fetchData, fetchDataJson, postRequest} from '../../../Configuration/BaseURL.jsx'
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
  useTopDocControlRow,
  useTopDocDropDown,
} from '@/NAYSA Cloud/Global/top1RefTable';

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
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalProceedConfirm,
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";

const normalizeGlRefDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [month, day, year] = raw.split("/").map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


const PCV = () => {
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
  const { resetFlag } = useReset();
  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
  const docType = docTypes.PCV;
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
    employee: "",

    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    pcvTypes :[],
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",
    noReprints:"0",
    selectedPCVType : "REG",
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
    showSlModal:false,


    currencyModalOpen:false,
    branchModalOpen:false,
    vendModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showPostingModal:false,
    showAllTranDocNo:false,
    showRRRefModal:false,
    globalLookupRow:[],
   });

  const updateState = (updates) => {
      setState(prev => ({ ...prev, ...updates }));
    };



  const {
  // Document info
  documentName,
  documentSeries,
  documentDocLen,
  documentDate,
  documentID,
  documentStatus,
  documentNo,
  status,
  userCode,

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
  employee,
  currCode,
  currName,
  currRate,
  pcvTypes,
  refDocNo1,
  refDocNo2,
  remarks,
  noReprints,
  selectedPCVType,


  // Transaction details
  tblFieldArray,
  detailRows,
  detailRowsGL,
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
  currencyModalOpen,
  branchModalOpen,
  vendModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showPostingModal,
  showAllTranDocNo,
  showRRRefModal,
  globalLookupRow

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
  const pcvFieldLengths = {
    vendCode: useGetFieldLength(tblFieldArray, "vend_code"),
    vendName: useGetFieldLength(tblFieldArray, "vend_name"),
    siNo: useGetFieldLength(tblFieldArray, "si_no"),
    debitAcct: useGetFieldLength(tblFieldArray, "debit_acct"),
    rcCode: useGetFieldLength(tblFieldArray, "rc_code"),
    address1: useGetFieldLength(tblFieldArray, "vend_addr1"),
    address2: useGetFieldLength(tblFieldArray, "vend_addr2"),
    address3: useGetFieldLength(tblFieldArray, "vend_addr3"),
    tin: useGetFieldLength(tblFieldArray, "vend_tin"),
    remarks: useGetFieldLength(tblFieldArray, "remarks"),
    slRefNo: useGetFieldLength(tblFieldArray, "slref_no"),
  };

  const pcvDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "vendCode", label: "Payee Code", width: 120 },
    { key: "vendName", label: "Payee Name", width: 300 },
    { key: "siNo", label: "Invoice No.", width: 120 },
    { key: "siDate", label: "Invoice Date", width: 120 },
    { key: "origAmount", label: "Original Amount", width: 130 },
    { key: "drAcct", label: "DR Account", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "rcName", label: "RC Name", width: 160 },
    { key: "vatCode", label: "VAT Code", width: 120 },
    { key: "vatName", label: "VAT Name", width: 220 },
    { key: "vatAmount", label: "VAT Amount", width: 130 },
    { key: "atcCode", label: "ATC", width: 120 },
    { key: "atcName", label: "ATC Name", width: 220 },
    { key: "atcAmount", label: "ATC Amount", width: 130 },
    { key: "netAmount", label: "Net Amount", width: 130 },
    { key: "address1", label: "Address 1", width: 300 },
    { key: "address2", label: "Address 2", width: 300 },
    { key: "address3", label: "Address 3", width: 300 },
    { key: "tin", label: "TIN", width: 130 },
    { key: "remarks", label: "Remarks", width: 400 },
  ];
  const {
    getColumnStyle: getPcvDetailColumnStyle,
    getFrozenColumnStyle: getPcvDetailFrozenStyle,
    getOrderedColumns: getOrderedPcvDetailColumns,
    getSortedRows: getSortedPcvDetailRows,
    clearAllSorting: clearPcvDetailSorting,
    clearZeroValueOnFocus: clearPcvDetailZeroOnFocus,
    focusNextRowInput: focusNextPcvDetailRowInput,
    renderHeaderContextMenu: renderPcvDetailHeaderContextMenu,
    renderResizableHeader: renderPcvDetailHeader,
  } = useResizableTableColumns(pcvDetailColumnDefs);
  const orderedPcvDetailColumns = getOrderedPcvDetailColumns(pcvDetailColumnDefs);
  const getPcvDetailFallbackWidth = (key) =>
    pcvDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getPcvDetailCellStyle = (key, fallbackWidth) => ({
    ...getPcvDetailColumnStyle(key, fallbackWidth),
    ...getPcvDetailFrozenStyle(key, orderedPcvDetailColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  const sortedPcvDetailRows = getSortedPcvDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );

  const pcvGlColumnDefs = [
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
    getColumnStyle: getPcvGlColumnStyle,
    getFrozenColumnStyle: getPcvGlFrozenStyle,
    getOrderedColumns: getOrderedPcvGlColumns,
    getSortedRows: getSortedPcvGlRows,
    setColumnOrder: setPcvGlColumnOrder,
    clearAllSorting: clearPcvGlSorting,
    clearZeroValueOnFocus: clearPcvGlZeroOnFocus,
    focusNextRowInput: focusNextPcvGlRowInput,
    renderHeaderContextMenu: renderPcvGlHeaderContextMenu,
    renderResizableHeader: renderPcvGlHeader,
  } = useResizableTableColumns(pcvGlColumnDefs);
  const orderedPcvGlColumns = getOrderedPcvGlColumns(pcvGlColumnDefs);
  const getPcvGlFallbackWidth = (key) =>
    pcvGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getPcvGlCellStyle = (key, fallbackWidth) => ({
    ...getPcvGlColumnStyle(key, fallbackWidth),
    ...getPcvGlFrozenStyle(key, orderedPcvGlColumns, fallbackWidth, {
      isHeader: false,
    }),
  });
  useEffect(() => {
    setPcvGlColumnOrder(pcvGlColumnDefs.map((column) => column.key));
  }, [setPcvGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedPcvGlRows = getSortedPcvGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => {
      if (sortKey === "ln") return entry.originalIndex + 1;
      return entry.row?.[sortKey] ?? "";
    }
  );
  const pcvDetailEnterNextRowZeroClearFields = ["origAmount"];
  const pcvGlEnterNextRowZeroClearFields = [
    "debit",
    "credit",
    "debitFx1",
    "creditFx1",
    "debitFx2",
    "creditFx2",
  ];

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


  //Variables


  const [totals, setTotals] = useState({
  totalOrigAmount: '0.00',
  totalVatAmount: '0.00',
  totalAtcAmount: '0.00',
  totalNetAmount: '0.00',
  });

  const customParamMap = {
        drAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;




  const updateTotalsDisplay = (origAmount, vat, atc, netAmount) => {
    setTotals({
          totalOrigAmount: formatNumber(origAmount),
          totalVatAmount: formatNumber(vat),
          totalAtcAmount: formatNumber(atc),
          totalNetAmount: formatNumber(netAmount),
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
    if (!refsLoaded) return;
    const pcvTran = getAllDropDown("PCVTRAN_TYPE", docType);
    if (pcvTran.length > 0) {
      updateState({
        pcvTypes: pcvTran,
        selectedPCVType: "REG",
      });
    }
}, [docType, refsLoaded]);





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



  const handleReset = () => {
      clearPcvDetailSorting();
      clearPcvGlSorting();

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
      remarks:"",
      vendName:"",
      vendCode:"",
      employee:"",
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
      updateTotalsDisplay (0, 0, 0, 0)
  };






  const loadCompanyData = async () => {
          updateState({ isLoading: true });

          try {
            const hdtblcol_result = await useFieldLenghtCheck(
              "pcv_hd,pcv_dt1,pcv_dt2"
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
    const data = await useFetchTranData(documentNo, branchCode,docType,"pcvNo",direction);


    if (!data?.pcvId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      origAmount: formatNumber(item.origAmount),
      vatAmount: formatNumber(item.vatAmount),
      atcAmount: formatNumber(item.atcAmount),
      netAmount: formatNumber(item.netAmount),
      siDate:useformatToDatev2(item.siDate),
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
      documentStatus: data.pcvStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.pcvId,
      documentNo: data.pcvNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.pcvDate),
      selectedPCVType: data.pcvtranType,
      vendCode: data.vendCode,
      vendName: data.vendName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      employee:data.employee,
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


const handlePcvNoBlur = () => {

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
    await handleDetailChange(i, "origAmount", row.origAmount, true);
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
      selectedPCVType,
      vendCode,
      vendName,
      employee,
      refDocNo1,
      refDocNo2,
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
      pcvNo: documentNo || "",
      pcvId: documentID || "",
      pcvDate: documentDate,
      pcvtranType: selectedPCVType,
      vendCode: vendCode || "",
      vendName: vendName || "",
      employee: employee || "",
      refDocNo1: refDocNo1 || "",
      refDocNo2: refDocNo2 || "",
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        vendCode: row.vendCode || "",
        vendName: row.vendName || "",
        siNo: row.siNo || "",
        siDate: row.siDate || null,
        origAmount: parseFormattedNumber(row.origAmount || 0),
        drAcct: row.drAcct || "",
        rcCode: row.rcCode || "",
        rcName: row.rcName || row.rcname || "",
        vatCode: row.vatCode || "",
        vatName: row.vatName || "",
        vatAmount: parseFormattedNumber(row.vatAmount || 0),
        atcCode: row.atcCode || "",
        atcName: row.atcName || "",
        atcAmount: parseFormattedNumber(row.atcAmount || 0),
        netAmount: parseFormattedNumber(row.netAmount || 0),
        address1: row.address1 || "",
        address2: row.address2 || "",
        address3: row.address3 || "",
        remarks: row.remarks || "",
        tin: row.tin || "",
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
        slRefDate: normalizeGlRefDate(entry.slRefDate),
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
        "pcvId",
        "pcvNo"
      );

      if (response) {
        const responseDocNo =  response.data[0].pcvNo;
        const responseDocId =  response.data[0].pcvId;

        await fetchTranData(responseDocNo,branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint =
          isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(response.data[0].pcvId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

        updateState({
          documentNo: response?.data?.[0]?.pcvNo || "",
          documentID: response?.data?.[0]?.pcvId || "",
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




const handleAddRow = async (index = null) => {
  try {
    const updatedRows = [...detailRows];
    let newRows = [];

    if (updatedRows.length > 0) {
      const sourceRow =
        index !== null && index >= 0
          ? updatedRows[index]
          : updatedRows[updatedRows.length - 1];

      newRows = [
        {
          lnNo: "",
          vendCode: "",
          vendName: "",
          siDate: documentDate || "",
          origAmount: "0.00",
          drAcct: sourceRow?.drAcct || sourceRow?.acctCode || "",
          acctCode: sourceRow?.acctCode || sourceRow?.drAcct || "",
          rcCode: sourceRow?.rcCode || "",
          rcName: sourceRow?.rcName || "",
          slCode: sourceRow?.slCode || "",
          slName: sourceRow?.slName || "",
          vatCode: sourceRow?.vatCode || "",
          vatName: sourceRow?.vatName || "",
          vatAmount: "0.00",
          atcCode: sourceRow?.atcCode || "",
          atcName: sourceRow?.atcName || "",
          netAmount: "0.00",
          address1: "",
          address2: "",
          address3: "",
          tin: "",
          remarks: "",
        },
      ];
    } else {
      const items = await handleFetchDetail(vendCode);
      const itemList = Array.isArray(items) ? items : [items];

      newRows = itemList.map((item) => ({
        lnNo: "",
        vendCode: "",
        vendName: "",
        siDate: documentDate || "",
        origAmount: "0.00",
        acctCode: item.acctCode || item.drAcct || "",
        rcCode: item.rcCode || "",
        rcName: item.rcName || "",
        slCode: item.slCode || "",
        slName: item.slName || "",
        vatCode: item.vatCode || "",
        vatName: item.vatName || "",
        vatAmount: "0.00",
        atcCode: item.atcCode || "",
        atcName: item.atcName || "",
        netAmount: "0.00",
        address1: "",
        address2: "",
        address3: "",
        tin: "",
        remarks: "",
      }));
    }

    if (index !== null && index >= 0) {
      updatedRows.splice(index + 1, 0, ...newRows);
    } else {
      updatedRows.push(...newRows);
    }

    updateState({
      detailRows: updatedRows,
      detailRowsGL: [],
    });

    updateTotals(updatedRows);
  } catch (error) {
    console.error("Error adding new row:", error);
    alert("Failed to add new row. Please select a Payee first.");
  }
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

  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.dt1)) return value.dt1;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (value?.result) return extractOpenRRRows(value.result);
  if (typeof value === "object" && Object.keys(value).length > 0) return [value];

  return [];
};


const extractOpenRRResponseRows = (response) => {
  const resultValue =
    response?.data?.[0]?.result ??
    response?.data?.[0]?.RESULT ??
    response?.data?.[0]?.JsonResult ??
    response?.data?.result ??
    response?.data?.RESULT ??
    response?.result ??
    response?.RESULT ??
    response?.JsonResult ??
    response?.data ??
    response;

  return extractOpenRRRows(resultValue);
};


const addLookupGroupId = (row, index) => ({
  ...row,
  groupId:
    row?.groupId ||
    row?.GROUP_ID ||
    row?.rrId ||
    row?.rrNo ||
    row?.RR_NO ||
    row?.poNo ||
    row?.PO_NO ||
    String(index + 1),
});


const handleOpenReferenceRR = async () => {
  if (isFormDisabled) return;

  const lookupVendCode = String(vendCode || "").trim();
  const lookupBranchCode = String(branchCode || "").trim();

  if (!lookupVendCode) {
    useSwalErrorAlert("Open RR", "Please select a Payee first.");
    return;
  }

  try {
    updateState({ isLoading: true, showSpinner: true });

    const lookupPayload = {
      branchCode: lookupBranchCode,
      vendCode: "",
    };

    const requestAttempts = [
      async () => fetchDataJson("getAPVRR_OpenSummary", lookupPayload),
      async () =>
        fetchData("getAPVRR_OpenSummary", {
          PARAMS: JSON.stringify({ json_data: lookupPayload }),
        }),
      async () =>
        fetchData("getAPVRR_OpenSummary", {
          PARAMS: JSON.stringify(lookupPayload),
        }),
    ];

    let rawRows = [];

    for (const requestOpenReference of requestAttempts) {
      try {
        rawRows = extractOpenRRResponseRows(await requestOpenReference());
        if (rawRows.length > 0) break;
      } catch (requestError) {
        console.warn("Open RR lookup attempt failed:", requestError);
      }
    }

    if (rawRows.length === 0) {
      useSwalErrorAlert("Open RR", "No open RR found for this payee.");
      return;
    }

    updateState({
      globalLookupRow: rawRows.map(addLookupGroupId),
      showRRRefModal: true,
    });
  } catch (error) {
    console.error("Failed to fetch Open RR:", error);
    useSwalErrorAlert("Open RR", "Unable to load open RR references.");
  } finally {
    updateState({ isLoading: false, showSpinner: false });
  }
};


const handleInvoiceDetailAddClick = async () => {
  if (String(selectedPCVType || "").toUpperCase() === "RR") {
    await handleOpenReferenceRR();
    return;
  }

  await handleAddRow();
};


const handleCloseRRRefModal = async (selectedItems) => {
  if (!selectedItems || !selectedItems.records) {
    updateState({ showRRRefModal: false });
    return;
  }

  const itemsArray = Array.isArray(selectedItems.records)
    ? selectedItems.records
    : [selectedItems.records];

  const mappedRows = itemsArray.map((item) => {
    const origAmount = parseFormattedNumber(item.siAmount || item.amount || 0);
    const vatAmount = parseFormattedNumber(item.vatAmount || 0);
    const atcAmount = parseFormattedNumber(item.atcAmount || 0);
    const netAmount = +(origAmount - atcAmount).toFixed(2);

    return {
      lnNo: "",
      vendCode: item.vendCode || "",
      vendName: item.vendName || "",
      siNo: item.siNo || "",
      siDate: item.siDate || item.rrDate || "",
      origAmount: formatNumber(origAmount),
      drAcct: item.drAcct || item.debitAcct || "",
      acctCode: item.acctCode || item.drAcct || item.debitAcct || "",
      rcCode: item.rcCode || "",
      rcName: item.rcName || "",
      slCode: item.slCode || "",
      slName: item.slName || "",
      vatCode: item.vatCode || "",
      vatName: item.vatName || item.vatDesc || "",
      vatAmount: formatNumber(vatAmount),
      atcCode: item.atcCode || "",
      atcName: item.atcName || "",
      atcAmount: formatNumber(atcAmount),
      netAmount: formatNumber(netAmount),
      address1: item.address1 || "",
      address2: item.address2 || "",
      address3: item.address3 || "",
      tin: item.tin || "",
      remarks: item.rrNo || item.poNo ? `RR: ${item.rrNo || ""} PO: ${item.poNo || ""}`.trim() : "",
      groupId: item.groupId || "",
    };
  });

  const updatedRows = [...detailRows, ...mappedRows];

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
    showRRRefModal: false,
  });

  updateTotals(updatedRows);
};


const handleCopyDetailRow = (index) => {
  const updatedRows = [...(detailRowsRef.current || [])];
  const sourceRow = updatedRows[index];

  if (!sourceRow) return;

  updatedRows.splice(index + 1, 0, { ...sourceRow });

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
  });

  updateTotals(updatedRows);
};


const handleInsertDetailRowClick = async (index) => {
  const result = await useSwalProceedConfirm(
    "Insert Detail Row",
    "Do you want to copy the selected record or insert a new record?",
    "Copy Record",
    "Insert New Record"
  );

  if (result.isConfirmed) {
    handleCopyDetailRow(index);
    return;
  }

  if (result.dismiss === Swal.DismissReason.cancel) {
    await handleAddRow(index);
  }
};



const handleAddRowGL = (index = null) => {
   if (!Array.isArray(detailRows) || detailRows.length === 0) {
    return;
  }
  const newRow = {
    acctCode: "",
    rcCode: "",
    sltypeCode: "SU",
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




  const handleFetchDetail = async (vendCode) => {
    if (!vendCode) return [];

    try {

      const vendResponse = await postRequest("addPayeeDetail", JSON.stringify({json_data: {vendCode: vendCode}}));
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
    docCode: docType || "PCV",
    tranId: documentID || "",
    documentNo: documentNo || "",
  });

  const baseUrl = import.meta.env.BASE_URL || "/";
  const previewUrl = `${baseUrl.replace(/\/?$/, "/")}page/APV2307?${query.toString()}`;
  window.open(previewUrl, "_blank", "noopener,noreferrer");
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
  if (documentID ) {
     const copyDate = useGetCurrentDayV2();

     const updatedRows = detailRows.map((row) => ({
            ...row,
            siNo: "",
            siDate: copyDate
          }));

    detailRowsRef.current = updatedRows;

    updateState({ documentNo:"",
                  documentID:"",
                   documentStatus:"",
                   status:"OPEN",
                   detailRows: updatedRows,
                   documentDate:copyDate,
                   noReprints:"0",
                   detailRowsGL:[],
                   isFetchDisabled:false,

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
  const docNo = params.get("pcvNo");
  const branchCode = params.get("branchCode");

  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);




  const printData = {
    pcv_no: documentNo,
    branch: branchCode,
    doc_id: docType
  };


  const handleCloseVendModal = async (selectedData) => {
    if (!selectedData) {
        updateState({ vendModalOpen: false });
        return;
    }


     updateState({
        vendModalOpen: false,
        isLoading: true });


    if (accountModalSource==="vendCodeDetail" && selectedRowIndex !== null ){
      handleDetailChange(selectedRowIndex, "vendCode", selectedData,false);

      updateState({vendModalOpen: false});
      return;
    }


    try {
        const returnDetails = {
            vendCode: selectedData?.vendCode || '',
            vendName: selectedData?.vendName || '',
            currCode: selectedData?.currCode || '',
        };

        updateState({
            vendName: selectedData.vendName,
            vendCode: selectedData.vendCode,
            employee: selectedData.vendName
        });

        if (!selectedData.currCode) {
            const payload = { VEND_CODE: selectedData.vendCode };
            const response = await postRequest("getPayee", JSON.stringify(payload));

            if (response.success) {
                const data = JSON.parse(response.data[0].result);
                returnDetails.currCode = data[0]?.currCode;
            } else {
                console.warn("API call for getPayee returned success: false", response.message);
            }
        }

        await Promise.all([
            handleSelectCurrency(returnDetails.currCode),
        ]);

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({ isLoading: false });
    }
};



  const updateTotals = (rows) => {

  let totalOrigAmount = 0;
  let totalVAT = 0;
  let totalATC = 0;
  let totalNetAmount = 0;


  rows.forEach(row => {

    const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
    const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
    const origAmount = parseFormattedNumber(row.origAmount || 0) || 0;
    const netAmount = parseFormattedNumber(row.netAmount  || 0) || 0;

    totalOrigAmount+= origAmount;
    totalVAT += vatAmount;
    totalATC += atcAmount;
    totalNetAmount+= netAmount;
  });

  updateTotalsDisplay (totalOrigAmount, totalVAT, totalATC, totalNetAmount);
};




// const handleDetailChange = async (
//   index,
//   field,
//   value,
//   runCalculations = true,
//   validateLookup = false
// ) => {
//   const updatedRows = [...detailRows];

//   updatedRows[index] = {
//     ...updatedRows[index],
//     [field]: value,
//   };

//   const row = updatedRows[index];

//   if (field === "vatCode") {
//     row.vatCode = value?.vatCode || "";
//     row.vatName = value?.vatName || "";
//   }

//   if (field === "vatName") {
//     row.vatCode = "";
//     row.vatName = "";
//   }

//   if (field === "atcCode") {
//     row.atcCode = value?.atcCode || "";
//     row.atcName = value?.atcName || "";
//   }

//   if (field === "atcName") {
//     row.atcCode = "";
//     row.atcName = "";
//   }

//   if (field === "vendCode") {
//     const isManualInput = typeof value === "string";

//     if (isManualInput) {
//       row.vendCode = value;
//     } else if (value?.vendCode) {
//       const vendResponse = await postRequest(
//         "addPayeeDetail",
//         JSON.stringify({ json_data: { vendCode: value.vendCode } })
//       );

//       const parsedResult = JSON.parse(vendResponse?.data?.[0]?.result || "[]");
//       const vendRow = Array.isArray(parsedResult) ? parsedResult[0] : null;

//       if (vendRow) {
//         const {
//           vendCode,
//           vendName,
//           atcCode,
//           atcName,
//           vatCode,
//           vatName,
//           address1,
//           address2,
//           address3,
//           tin,
//         } = vendRow;

//         Object.assign(row, {
//           vendCode: vendCode || "",
//           vendName: vendName || "",
//           atcCode: atcCode || "",
//           atcName: atcName || "",
//           vatCode: vatCode || "",
//           vatName: vatName || "",
//           address1: address1 || "",
//           address2: address2 || "",
//           address3: address3 || "",
//           tin: tin || "",
//         });

//         row.origAmount = "0.00";
//         row.vatAmount = "0.00";
//         row.atcAmount = "0.00";
//         row.netAmount = "0.00";
//       }
//     }
//   }


//   if (field === "drAcct") {
//   const acctCode = typeof value === "string" ? value : value?.acctCode || "";
//   const currentDrAcct = row.drAcct || "";

//   if (!validateLookup) {
//     row.drAcct = acctCode;
//   } else {
//     if (!acctCode) {
//       // already blank, do nothing to avoid duplicate validation/message
//       if (currentDrAcct) {
//         row.drAcct = "";
//       }
//     } else {
//       const acctResult = await useTopAccountRow(acctCode);

//       if (acctResult) {
//         row.drAcct = acctResult.acctCode || acctCode;
//       } else {
//         const shouldAlert = !!currentDrAcct || !!acctCode;

//         row.drAcct = "";

//         if (shouldAlert) {
//           useSwalErrorAlert("Validation", "Account Code does not exist.");
//         }
//       }
//     }
//   }
// }

// if (field === "rcCode") {
//   const rcCode = typeof value === "string" ? value : value?.rcCode || "";
//   const currentRcCode = row.rcCode || "";

//   if (!validateLookup) {
//     row.rcCode = rcCode;
//     if (typeof value !== "string") {
//       row.rcName = value?.rcName || "";
//     }
//   } else {
//     if (!rcCode) {
//       // already blank, do nothing to avoid duplicate validation/message
//       if (currentRcCode) {
//         row.rcCode = "";
//         row.rcName = "";
//       }
//     } else {
//       const rcResult = await useTopRCRow(rcCode);

//       if (rcResult) {
//         row.rcCode = rcResult.rcCode || "";
//         row.rcName = rcResult.rcName || "";
//       } else {
//         const shouldAlert = !!currentRcCode || !!rcCode;

//         row.rcCode = "";
//         row.rcName = "";

//         if (shouldAlert) {
//           useSwalErrorAlert("Validation", "RC Code does not exist.");
//         }
//       }
//     }
//   }
// }


//   if (runCalculations) {
//     const origVatCode = row.vatCode || "";
//     const origAtcCode = row.atcCode || "";

//     async function recalcRow(newOrigAmount) {
//       const newVatAmount = origVatCode ? getAllTopVatAmount(origVatCode, newOrigAmount) : 0;
//       const newNetOfVat = +(newOrigAmount - newVatAmount).toFixed(2);
//       const newATCAmount = origAtcCode ? getAllTopATCAmount(origAtcCode, newNetOfVat) : 0;
//       const newNetAmount = +(newOrigAmount - newATCAmount).toFixed(2);

//       row.vatAmount = formatNumber(newVatAmount);
//       row.atcAmount = formatNumber(newATCAmount);
//       row.netAmount = formatNumber(newNetAmount);
//       row.origAmount = formatNumber(newOrigAmount);
//     }

//     if (field === "origAmount") {
//       const newOrigAmount = parseFormattedNumber(row.origAmount) || 0;
//       await recalcRow(newOrigAmount);
//     }

//     if (
//       field === "vatCode" ||
//       field === "atcCode" ||
//       field === "atcName" ||
//       field === "vatName"
//     ) {
//       async function updateVatAndAtc() {
//         const origAmount = +(parseFormattedNumber(row.origAmount) || 0).toFixed(2);
//         let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

//         if (field === "vatCode" || field === "vatName") {
//           newVatAmount = row.vatCode ? getAllTopVatAmount(row.vatCode, origAmount) : 0;
//           row.vatAmount = newVatAmount.toFixed(2);
//         }

//         const newNetOfVat = +(origAmount - newVatAmount).toFixed(2);
//         const newATCAmount = row.atcCode ? getAllTopATCAmount(row.atcCode, newNetOfVat) : 0;

//         row.atcAmount = newATCAmount.toFixed(2);
//         row.netAmount = +(origAmount - newATCAmount).toFixed(2);
//       }

//       await updateVatAndAtc();
//     }
//   }

//   updatedRows[index] = row;

//   updateState({
//     detailRows: updatedRows,
//     isLoading: false,
//     detailRowsGL: [],
//   });

//   updateTotals(updatedRows);
// };




const handleDetailChange = async (
  index,
  field,
  value,
  runCalculations = true,
  validateLookup = false
) => {
  const updatedRows = [...(detailRowsRef.current || [])];

  const originalRow = { ...updatedRows[index] };

  updatedRows[index] = {
    ...updatedRows[index],
    [field]: value,
  };

  const row = updatedRows[index];

  if (field === "vatCode") {
    row.vatCode = value?.vatCode || "";
    row.vatName = value?.vatName || "";
  }

  if (field === "vatName") {
    row.vatCode = "";
    row.vatName = "";
  }

  if (field === "atcCode") {
    row.atcCode = value?.atcCode || "";
    row.atcName = value?.atcName || "";
  }

  if (field === "atcName") {
    row.atcCode = "";
    row.atcName = "";
  }

  if (field === "vendCode") {
    const isManualInput = typeof value === "string";

    if (isManualInput) {
      row.vendCode = value;
    } else if (value?.vendCode) {
      const vendResponse = await postRequest(
        "addPayeeDetail",
        JSON.stringify({ json_data: { vendCode: value.vendCode } })
      );

      const parsedResult = JSON.parse(vendResponse?.data?.[0]?.result || "[]");
      const vendRow = Array.isArray(parsedResult) ? parsedResult[0] : null;

      if (vendRow) {
        const {
          vendCode,
          vendName,
          atcCode,
          atcName,
          vatCode,
          vatName,
          address1,
          address2,
          address3,
          tin,
        } = vendRow;

        Object.assign(row, {
          vendCode: vendCode || "",
          vendName: vendName || "",
          atcCode: atcCode || "",
          atcName: atcName || "",
          vatCode: vatCode || "",
          vatName: vatName || "",
          address1: address1 || "",
          address2: address2 || "",
          address3: address3 || "",
          tin: tin || "",
        });

        row.origAmount = "0.00";
        row.vatAmount = "0.00";
        row.atcAmount = "0.00";
        row.netAmount = "0.00";
      }
    }
  }

  if (field === "drAcct") {
    const acctCode = typeof value === "string" ? value : value?.acctCode || "";
    const currentDrAcct = row.drAcct || "";

    if (!validateLookup) {
      row.drAcct = acctCode;
    } else {
      if (!acctCode) {
        if (currentDrAcct) {
          row.drAcct = "";
        }
      } else {
        const acctResult = await useTopAccountRow(acctCode);

        if (acctResult) {
          row.drAcct = acctResult.acctCode || acctCode;
        } else {
          const shouldAlert = !!currentDrAcct || !!acctCode;

          row.drAcct = "";

          if (shouldAlert) {
            useSwalErrorAlert("Validation", "Account Code does not exist.");
          }
        }
      }
    }
  }

  if (field === "rcCode") {
    const rcCode = typeof value === "string" ? value : value?.rcCode || "";
    const currentRcCode = row.rcCode || "";

    if (!validateLookup) {
      row.rcCode = rcCode;
      if (typeof value !== "string") {
        row.rcName = value?.rcName || "";
      }
    } else {
      if (!rcCode) {
        if (currentRcCode) {
          row.rcCode = "";
          row.rcName = "";
        }
      } else {
        const rcResult = await useTopRCRow(rcCode);

        if (rcResult) {
          row.rcCode = rcResult.rcCode || "";
          row.rcName = rcResult.rcName || "";
        } else {
          const shouldAlert = !!currentRcCode || !!rcCode;

          row.rcCode = "";
          row.rcName = "";

          if (shouldAlert) {
            useSwalErrorAlert("Validation", "RC Code does not exist.");
          }
        }
      }
    }
  }

  if (runCalculations) {
    const origVatCode = row.vatCode || "";
    const origAtcCode = row.atcCode || "";

    async function recalcRow(newOrigAmount) {
      const newVatAmount = origVatCode
        ? getAllTopVatAmount(origVatCode, newOrigAmount)
        : 0;
      const newNetOfVat = +(newOrigAmount - newVatAmount).toFixed(2);
      const newATCAmount = origAtcCode
        ? getAllTopATCAmount(origAtcCode, newNetOfVat)
        : 0;
      const newNetAmount = +(newOrigAmount - newATCAmount).toFixed(2);

      row.vatAmount = formatNumber(newVatAmount);
      row.atcAmount = formatNumber(newATCAmount);
      row.netAmount = formatNumber(newNetAmount);
      row.origAmount = formatNumber(newOrigAmount);
    }

    if (field === "origAmount") {
      const newOrigAmount = parseFormattedNumber(row.origAmount) || 0;
      await recalcRow(newOrigAmount);
    }

    if (
      field === "vatCode" ||
      field === "atcCode" ||
      field === "atcName" ||
      field === "vatName"
    ) {
      async function updateVatAndAtc() {
        const origAmount = +(parseFormattedNumber(row.origAmount) || 0).toFixed(2);
        let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

        if (field === "vatCode" || field === "vatName") {
          newVatAmount = row.vatCode
            ? getAllTopVatAmount(row.vatCode, origAmount)
            : 0;
          row.vatAmount = newVatAmount.toFixed(2);
        }

        const newNetOfVat = +(origAmount - newVatAmount).toFixed(2);
        const newATCAmount = row.atcCode
          ? getAllTopATCAmount(row.atcCode, newNetOfVat)
          : 0;

        row.atcAmount = newATCAmount.toFixed(2);
        row.netAmount = +(origAmount - newATCAmount).toFixed(2);
      }

      await updateVatAndAtc();
    }
  }

  updatedRows[index] = row;

  const hasChanges = JSON.stringify(originalRow) !== JSON.stringify(row);

  updateState({
    detailRows: updatedRows,
    isLoading: false,
    ...(hasChanges ? { detailRowsGL: [] } : {}),
  });

  updateTotals(updatedRows);
};




const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...(detailRowsGLRef.current || [])];
    let row = { ...updatedRowsGL[index] };


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,vendCode,docType);
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


const handleInvoiceNoCommit = (index, value) => {
  const updatedRows = [...(detailRowsRef.current || [])];
  const sourceRow = updatedRows[index];

  if (!sourceRow) return;

  const row = { ...sourceRow };
  const originalRow = { ...sourceRow };

  row.siNo = value;

  if (!String(value || "").trim()) {
    row.siDate = "";
  } else if (!row.siDate) {
    row.siDate = documentDate;
  }

  updatedRows[index] = row;

  const hasChanges = JSON.stringify(originalRow) !== JSON.stringify(row);

  if (!hasChanges) return;

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
  });

  updateTotals(updatedRows);
};

const handleVatNameDoubleClick = (index) => {
  if (isFormDisabled) return;

  const updatedRows = [...(detailRowsRef.current || [])];
  updatedRows[index] = {
    ...updatedRows[index],
    vatCode: "",
    vatName: "",
    vatAmount: "0.00",
  };

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
  });
  updateTotals(updatedRows);
};

const handleAtcNameDoubleClick = (index) => {
  if (isFormDisabled) return;

  const updatedRows = [...(detailRowsRef.current || [])];
  updatedRows[index] = {
    ...updatedRows[index],
    atcCode: "",
    atcName: "",
    atcAmount: "0.00",
  };

  updateState({
    detailRows: updatedRows,
    detailRowsGL: [],
  });
  updateTotals(updatedRows);
};

// Detail table cell renderers.
// Keep each key aligned with pcvDetailColumnDefs.
const renderPcvDetailCell = (columnKey, row, index) => {
  const columnWidth = getPcvDetailFallbackWidth(columnKey);
  const style = getPcvDetailCellStyle(columnKey, columnWidth);
  const detailModalHandlers = {
    vendCode: () => updateState({ selectedRowIndex: index, vendModalOpen: true, accountModalSource: "vendCodeDetail" }),
    drAcct: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "drAcct" }),
    rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" }),
    vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true, accountModalSource: "vatCode" }),
    atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true, accountModalSource: "atcCode" }),
  };

  // Shared text input used by plain detail columns.
  const textInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      disabled={options.disabled ?? isFormDisabled}
      readOnly={options.readOnly}
      maxLength={options.maxLength}
      onChange={(e) => handleDetailChange(index, field, e.target.value)}
      onBlur={(e) => {
        if (options.onCommit && !options.readOnly && !options.disabled && !isFormDisabled) {
          options.onCommit(e.target.value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || options.readOnly || options.disabled || isFormDisabled) return;
        e.preventDefault();
        if (options.onCommit) {
          options.onCommit(e.currentTarget.value);
        }
        focusNextPcvDetailRowInput(index, field, {
          rows: detailRows,
          zeroClearFields: pcvDetailEnterNextRowZeroClearFields,
          parseValue: parseFormattedNumber,
          onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
        });
      }}
    />
  );

  const detailLookupInput = (field, options = {}) => (
    <input
      type="text"
      id={`${field}-${index}`}
      maxLength={options.maxLength}
      className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()}
      value={row[field] || ""}
      disabled={isFormDisabled}
      readOnly={options.readOnly}
      onChange={(e) => handleDetailChange(index, field, e.target.value, false, false)}
      onBlur={(e) => {
        if (options.validateOnCommit && e.target.value?.trim()) {
          handleDetailChange(index, field, e.target.value, false, true);
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || isFormDisabled) return;
        e.preventDefault();
        if (options.validateOnCommit && e.currentTarget.value?.trim()) {
          handleDetailChange(index, field, e.currentTarget.value, false, true);
        }
        focusNextPcvDetailRowInput(index, field, {
          rows: detailRows,
          zeroClearFields: pcvDetailEnterNextRowZeroClearFields,
          parseValue: parseFormattedNumber,
          onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
        });
      }}
    />
  );

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className="global-tran-td-ui text-center" style={style}>{index + 1}</td>,
    vendCode: () => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          {detailLookupInput(columnKey, { className: "pr-6 cursor-pointer", maxLength: pcvFieldLengths.vendCode })}
          {!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={detailModalHandlers[columnKey]} />}
        </div>
      </td>
    ),
    vendName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("vendName", { maxLength: pcvFieldLengths.vendName })}</td>,
    siNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("siNo", { maxLength: pcvFieldLengths.siNo, onCommit: (value) => handleInvoiceNoCommit(index, value) })}</td>,
    siDate: () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <DateFormatInput id={`siDate${index}`} value={row.siDate || ""} disabled={isFormDisabled} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(updates) => { if (updates[`siDate${index}`] !== undefined) handleDetailChange(index, "siDate", updates[`siDate${index}`], false); }} onKeyDownCustom={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextPcvDetailRowInput(index, "siDate", { rows: detailRows, zeroClearFields: pcvDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); }} />
      </td>
    ),
    origAmount: () => (
      <td key={columnKey} className="global-tran-td-ui" style={style}>
        <input type="text" id={`${columnKey}-${index}`} className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={row.origAmount || ""} disabled={isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChange(index, "origAmount", sanitizedValue, false); }} onFocus={(e) => clearPcvDetailZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChange(index, "origAmount", value, false) })} onBlur={async (e) => { const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, "origAmount", num, true); setFocusedCell(null); }} onKeyDown={async (e) => { if (e.key === "Enter") { e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, "origAmount", num, true); focusNextPcvDetailRowInput(index, "origAmount", { rows: detailRows, zeroClearFields: pcvDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); } }} />
      </td>
    ),
    drAcct: () => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          {detailLookupInput(columnKey, { className: "text-center pr-6 cursor-pointer", maxLength: pcvFieldLengths.debitAcct, validateOnCommit: true })}
          {!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={detailModalHandlers[columnKey]} />}
        </div>
      </td>
    ),
    rcCode: () => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          {detailLookupInput(columnKey, { className: "text-center pr-6 cursor-pointer", maxLength: pcvFieldLengths.rcCode, validateOnCommit: true })}
          {!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={detailModalHandlers[columnKey]} />}
        </div>
      </td>
    ),
    rcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("rcName", { className: "text-left", readOnly: true, disabled: false })}</td>,
    vatCode: () => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />
          {!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={detailModalHandlers[columnKey]} />}
        </div>
      </td>
    ),
    vatName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.vatName || ""} readOnly onDoubleClick={!isFormDisabled ? () => handleVatNameDoubleClick(index) : undefined} /></td>,
    vatAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.vatAmount)) || ""} readOnly /></td>,
    atcCode: () => (
      <td key={columnKey} className="global-tran-td-ui relative" style={style}>
        <div className="flex items-center">
          <input type="text" className="w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer" value={row[columnKey] || ""} readOnly />
          {!isFormDisabled && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={detailModalHandlers[columnKey]} />}
        </div>
      </td>
    ),
    atcName: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full global-tran-td-inputclass-ui" value={row.atcName || ""} readOnly onDoubleClick={!isFormDisabled ? () => handleAtcNameDoubleClick(index) : undefined} /></td>,
    atcAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.atcAmount)) || ""} onChange={(e) => handleDetailChange(index, "atcAmount", e.target.value)} /></td>,
    netAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className="w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" value={formatNumber(parseFormattedNumber(row.netAmount)) || ""} readOnly /></td>,
    address1: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("address1", { className: "text-left", maxLength: pcvFieldLengths.address1 })}</td>,
    address2: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("address2", { className: "text-left", maxLength: pcvFieldLengths.address2 })}</td>,
    address3: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("address3", { className: "text-left", maxLength: pcvFieldLengths.address3 })}</td>,
    tin: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("tin", { className: "text-left", maxLength: pcvFieldLengths.tin })}</td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { className: "text-left", maxLength: pcvFieldLengths.remarks })}</td>,
  };

  return detailColumnRenderers[columnKey]?.() ?? null;
};

const renderPcvGlCell = (columnKey, row, index) => {
  const columnWidth = getPcvGlFallbackWidth(columnKey);
  const style = getPcvGlCellStyle(columnKey, columnWidth);
  const glModalHandlers = { acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }), slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }), vatCode: () => updateState({ selectedRowIndex: index, showVatModal: true }), atcCode: () => updateState({ selectedRowIndex: index, showAtcModal: true }) };

  const focusNextGlCell = (field) => {
    focusNextPcvGlRowInput(index, field, {
      rows: detailRowsGL,
      zeroClearFields: pcvGlEnterNextRowZeroClearFields,
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
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBlurGL(index, field, e.target.value, true); focusNextPcvGlRowInput(index, field, { rows: detailRowsGL, zeroClearFields: pcvGlEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value) }); } }}
      onFocus={(e) => clearPcvGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })}
      onBlur={(e) => { if (isFormDisabled) return; handleBlurGL(index, field, e.target.value); }}
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












const handleCloseAccountModal = (selectedAccount) => {

    if (selectedAccount && selectedRowIndex !== null) {

        const specialAccounts = ['drAcct'];
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
    await useHandlePrint(documentID, docType, mode,userCode );

    updateState({
      showSpinner: false
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
      }
    }
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
        onPrintBIR={handlePrint2307}
        birFormLabel="BIR Form"
        onPost={handlePost}
        printData={printData}
        onReset={handleReset}
        onSave={() => handleActivityOption("Upsert")}
        onCancel={handleCancel}
        onCopy={handleCopy}
        onAttach={handleAttach}
        isViewDocument={isViewDocument}
        activeTopTab={topTab}
        showActions={topTab === "details"}
        onDetails={() => setTopTab("details")}
        onHistory={() => setTopTab("history")}
        disableRouteNavigation={true}
        detailsRoute="/page/PCV"

        isSaveDisabled={state.isSaveDisabled || isFormDisabled ||  ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)}
        isResetDisabled={state.isResetDisabled}
        isAttachDisabled={!documentID}
        isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
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
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="svi_hd">
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
        id="sviNo"
        label="PCV No."
        type="lookup"
        value={state.documentNo || ""}
        disabled={state.isDocNoDisabled}
        onChange={(val) => updateState({ documentNo: val })}
        onLookup={() => updateState({ showAllTranDocNo: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handlePcvNoBlur();
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
          PCV Date
        </label>
      </div>
    </div>

    {/* Column 2 */}
    <div className="global-tran-textbox-group-div-ui">
      <FieldRenderer
        id="vendCode"
        label="Payee Code"
        required
        type="lookup"
        value={vendCode || ""}
        disabled={isFormDisabled}
        readOnly
        lookupDisabled={isFetchDisabled}
        onLookup={() =>
          updateState({
            vendModalOpen: true,
            accountModalSource: "vendCodeHeader",
          })
        }
      />

      <FieldRenderer
        id="vendName"
        label="Payee Name"
        required
        type="text"
        value={vendName || ""}
        disabled
        readOnly
      />

      <FieldRenderer
        id="employee"
        label="Employee"
        type="text"
        value={employee || ""}
        disabled={isFormDisabled}
        onChange={(val) => updateState({ employee: val })}
        maxLength={useGetFieldLength(tblFieldArray, "employee")}
      />
    </div>

    {/* Column 3 */}
    <div className="global-tran-textbox-group-div-ui">
      <FieldRenderer
        id="pcvtranType"
        label="PCV Type"
        type="select"
        value={selectedPCVType}
        disabled={isFormDisabled}
        onChange={(val) => updateState({ selectedPCVType: val })}
        options={pcvTypes.map((t) => ({
                      label: t.DROPDOWN_NAME,
                      value: t.DROPDOWN_CODE,
                 }))}
      />

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
          rows={4}
          className="peer global-tran-textbox-remarks-ui pt-2"
          value={remarks}
          maxLength={useGetFieldLength(tblFieldArray, "remarks")}
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

  {/* Column 4 */}
  <div className="global-tran-textbox-group-div-ui">
    <FieldRenderer
      id="refDocNo1"
      label="Ref Doc No. 1"
      type="text"
      value={refDocNo1 || ""}
      disabled={isFormDisabled}
      onChange={(val) => updateState({ refDocNo1: val })}
      maxLength={useGetFieldLength(tblFieldArray, "refpcv_no1")}
    />

    <FieldRenderer
      id="refDocNo2"
      label="Ref Doc No. 2"
      type="text"
      value={refDocNo2 || ""}
      disabled={isFormDisabled}
      onChange={(val) => updateState({ refDocNo2: val })}
      maxLength={useGetFieldLength(tblFieldArray, "refpcv_no2")}
    />
  </div>
</div>


</div>

      {/* APV Detail Section */}
      <div id="pcv_dtl" className="global-tran-tab-div-ui" >

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
          {orderedPcvDetailColumns.map((column) =>
            renderPcvDetailHeader(column.label, column.key, column.width, {
              orderedColumns: orderedPcvDetailColumns,
            })
          )}
          {!isFormDisabled && (
            <th
              className="global-tran-th-ui sticky top-0 right-0 bg-blue-300 dark:bg-blue-900"
              style={transactionActionsHeaderStyle}
            >
              Actions
            </th>
          )}

        </tr>
      </thead>



      <tbody className="relative">{sortedPcvDetailRows.map(({ row, originalIndex }) => (
        <tr key={originalIndex} className="global-tran-tr-ui">
          {orderedPcvDetailColumns.map((column) => renderPcvDetailCell(column.key, row, originalIndex))}
          {!isFormDisabled && (
            <td
              className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
              style={transactionActionsCellStyle}
            >
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  className="global-tran-td-button-add-ui"
                  onClick={() => handleInsertDetailRowClick(originalIndex)}
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
    {renderPcvDetailHeaderContextMenu()}
  </div>
  </div>

 {/* Invoice Details Footer */}
 <div className="global-tran-tab-footer-main-div-ui">


{/* Add Button */}
<div className="global-tran-tab-footer-button-div-ui">
  <button
     onClick={handleInvoiceDetailAddClick}
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

    {/* Total Original Amount */}
    <div className="global-tran-tab-footer-total-label-ui">
      Total Original Amount:
    </div>
    <div
      id="totInvoiceAmount"
      className="global-tran-tab-footer-total-value-ui"
    >
      {currRate === 1
        ? totals.totalOrigAmount
        : formatNumber(
            parseFormattedNumber(totals.totalOrigAmount) * currRate
          )}
    </div>
    {currRate > 1 && (
      <div className="global-tran-tab-footer-total-value-ui">
        {totals.totalOrigAmount}
      </div>
    )}

    {/* Total VAT Amount */}
    <div className="global-tran-tab-footer-total-label-ui">
      Total VAT Amount:
    </div>
    <div
      id="totVATAmount"
      className="global-tran-tab-footer-total-value-ui"
    >
      {currRate === 1
        ? totals.totalVatAmount
        : formatNumber(
            parseFormattedNumber(totals.totalVatAmount) * currRate
          )}
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
    <div
      id="totATCAmount"
      className="global-tran-tab-footer-total-value-ui"
    >
      {currRate === 1
        ? totals.totalAtcAmount
        : formatNumber(
            parseFormattedNumber(totals.totalAtcAmount) * currRate
          )}
    </div>
    {currRate > 1 && (
      <div className="global-tran-tab-footer-total-value-ui">
        {totals.totalAtcAmount}
      </div>
    )}

    {/* Total Net Amount */}
    <div className="global-tran-tab-footer-total-label-ui">
      Total Net Amount:
    </div>
    <div
      id="totAmountDue"
      className="global-tran-tab-footer-total-value-ui"
    >
      {currRate === 1
        ? totals.totalNetAmount
        : formatNumber(
            parseFormattedNumber(totals.totalNetAmount) * currRate
          )}
    </div>
    {currRate > 1 && (
      <div className="global-tran-tab-footer-total-value-ui">
        {totals.totalNetAmount}
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
            {orderedPcvGlColumns.map((column) =>
              renderPcvGlHeader(column.label, column.key, column.width, {
                orderedColumns: orderedPcvGlColumns,
              })
            )}
            {!isFormDisabled && (
              <th
                className="global-tran-th-ui sticky top-0 right-0 bg-blue-300 dark:bg-blue-900"
                style={transactionActionsHeaderStyle}
              >
                Actions
              </th>
            )}

          </tr>
        </thead>
        <tbody className="relative">
          {sortedPcvGlRows.map(({ row, originalIndex }) => (
            <tr key={originalIndex} className="global-tran-tr-ui">
              {orderedPcvGlColumns.map((column) =>
                renderPcvGlCell(column.key, row, originalIndex)
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
      {renderPcvGlHeaderContextMenu()}
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
      </>

      {/* Totals in second currency */}
      {withCurr2 && (
        <div className="global-tran-tab-footer-total-main-div-ui">
          <div className="global-tran-tab-footer-total-div-ui">
            <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
              Total Debit ({withCurr3 ? glCurrGlobal2 : currCode}):
            </label>
            <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
              {totalDebitFx1}
            </label>
          </div>

          <div className="global-tran-tab-footer-total-div-ui">
            <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
              Total Credit ({withCurr3 ? glCurrGlobal2 : currCode}):
            </label>
            <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
              {totalCreditFx1}
            </label>
          </div>
        </div>
      )}

      {/* Totals in third currency */}
      {withCurr3 && (
        <div className="global-tran-tab-footer-total-main-div-ui">
          <div className="global-tran-tab-footer-total-div-ui">
            <label htmlFor="TotalDebitFx2" className="global-tran-tab-footer-total-label-ui">
              Total Debit ({glCurrGlobal3}):
            </label>
            <label htmlFor="TotalDebitFx2" className="global-tran-tab-footer-total-value-ui">
              {totalDebitFx2}
            </label>
          </div>

          <div className="global-tran-tab-footer-total-div-ui">
            <label htmlFor="TotalCreditFx2" className="global-tran-tab-footer-total-label-ui">
              Total Credit ({glCurrGlobal3}):
            </label>
            <label htmlFor="TotalCreditFx2" className="global-tran-tab-footer-total-value-ui">
              {totalCreditFx2}
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




{vendModalOpen && (
  <PayeeMastLookupModal
    isOpen={vendModalOpen}
    onClose={handleCloseVendModal}
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

{showRRRefModal && (
  <GlobalLookupModalv1
    isOpen={showRRRefModal}
    title="Open Purchases from Posted Receiving"
    data={globalLookupRow}
    endpoint={openRRLookupColumns}
    btnCaption="Get Selected RR"
    idKey="groupId"
    onClose={handleCloseRRRefModal}
    onCancel={() => updateState({ showRRRefModal: false })}
    singleSelect={false}
  />
)}




{/* VAT Code Modal */}
{showVatModal && (
  <VATLookupModal
    isOpen={showVatModal}
    onClose={handleCloseVatModal}
    customParam="InputAll"
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



{showPostingModal && (
  <PostPCV
    isOpen={showPostingModal}
    onClose={() => updateState({ showPostingModal: false })}
  />
)}



{showAllTranDocNo && (
      <AllTranDocNo
        isOpen={showAllTranDocNo}
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "pcvNo"}}
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
    endpoint="/getPCVHistory"
    cacheKey={`PCV:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
    activeTabKey="PCV_Summary"
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

export default PCV;
