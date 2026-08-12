import { useState, useEffect,useRef,useCallback, Fragment } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faUpload } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostRMAJ from "./PostRMAJ.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";


// Configuration
import { postRequest,fetchDataJson} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext.jsx";
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
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
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
  useGetCurrentDay,
  useFormatToDate,
  useGetCurrentDayV2,
  useformatToDatev2,
} from '@/NAYSA Cloud/Global/dates';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';
import {
  extractSingleUploadValidationResult,
  getSingleUploadTemplateColumns as getGlobalSingleUploadTemplateColumns,
  handleDownloadSingleUploadTemplate as downloadGlobalSingleUploadTemplate,
  handleSingleUploadExcelFile,
  showSingleUploadErrorList,
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  toSingleUploadDateValue,
  toSingleUploadExcelDate,
  useResizableTableColumns,
} from '@/NAYSA Cloud/Global/datatable.jsx';

import {
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';


import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalHandleOpenSpecsModal,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalvalidateRequiredFields
} from '@/NAYSA Cloud/Global/behavior.jsx';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";



// Header
import Header from '@/NAYSA Cloud/Components/Header';
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


const RMAJ = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const singleUploadDropdownRef = useRef(null);
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation(); 
  const [isViewDocument, setIsViewDocument] = useState(false);
  const { companyInfo, currentUserRow, getAllDropDown, refsLoaded, getAllTopHSDocRow } = useAuth();
  const decQty = companyInfo?.itemDecqtyRM ?? 2;
  const decUcost = companyInfo?.itemDecUcostRM ?? 6;


  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
    }, []); 
  const isViewDocumentUrl = isViewDocument;



  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const [showSingleUploadDropdown, setShowSingleUploadDropdown] = useState(false);
  const [pendingHeaderLocationWH, setPendingHeaderLocationWH] = useState("");
  const { user } = useAuth();
  const { resetFlag } = useReset();
  const docType = docTypes.RMAJ;
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc?.docName + " Transaction";
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
    documentDate:useGetCurrentDay(),   
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
    bbUploadExists: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,



    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",
    WHCode:"",
    WHName:"",
    LocCode:"",
    LocName:"",
    itemSingleSelect:false,
    selectedWH:"",

    
     // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    tblFieldArray :[],
    ajTypes :[],
    refDocNo1: "",
    refDocNo2: "", 
    remarks: "",
    selectedAJType : "BB",
    userCode: currentUserRow?.userCode||user?.USER_CODE||"", 

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
    showSlModal:false,
    msLookupModalOpen:false,
    itemMastLookupOpen:false,
    warehouseLookupOpen:false,

    branchModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showPostingModal:false,
    showAllTranDocNo:false,
    showQstatModal:false,
    locationLookupOpen:false
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
  itemSingleSelect,
  bbUploadExists,



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
  currCode,
  currName,
  currRate,
  ajTypes,
  refDocNo1,
  refDocNo2,
  remarks,
  selectedAJType,
  WHCode,
  WHName,
  LocCode,
  LocName,


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
  modalContext,
  selectionContext,
  selectedRowIndex,
  accountModalSource,
  selectedWH,

  // Modals
  showAccountModal,
  showRcModal,
  showSlModal,
  branchModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showPostingModal,
  showAllTranDocNo,
  showQstatModal,
  msLookupModalOpen,
  itemMastLookupOpen,
  warehouseLookupOpen,
  locationLookupOpen

} = state;


  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }

  useEffect(() => {
    if (!showSingleUploadDropdown) return;

    const handleClickOutside = (event) => {
      if (singleUploadDropdownRef.current?.contains(event.target)) return;
      setShowSingleUploadDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSingleUploadDropdown]);


  //Status Global Setup
  const displayStatus = status || 'OPEN';
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
  const canUseSingleUploadOptions =
    String(hsDoc?.docUpload || "").toUpperCase() === "S" &&
    (
      selectedAJType === "IG" ||
      (selectedAJType === "BB" && !bbUploadExists)
    );

  //Variables


  const [totals, setTotals] = useState({
  totalQuantity: '0.00',
  totalItemAmount: '0.00',
  });

  const customParamMap = {
        invAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;
  


  const updateTotalsDisplay = (quantity, amount) => {
    setTotals({
          totalQuantity: formatNumber(quantity,decQty),
          totalItemAmount: formatNumber(amount),
      });
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
  if (triggerGLEntries) {
    handleActivityOption("GenerateGL").then(() => {
      updateState({ triggerGLEntries: false });
    });
  }
}, [triggerGLEntries]);







  useEffect(() => {
      updateState({isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);
  




  useEffect(() => {
    loadCompanyData();
    handleReset();
  }, []);





  useEffect(() => {
    if (!refsLoaded) return;
    const ajDrop = getAllDropDown("AJTRAN_TYPE", docType);
    if (ajDrop.length > 0) {
      updateState({ ajTypes: ajDrop, selectedAJType: "BB" });
    }
  }, [docType, refsLoaded]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!canUseSingleUploadOptions) {
      setShowSingleUploadDropdown(false);
    }
  }, [canUseSingleUploadOptions]);

  useEffect(() => {
    if (!pendingHeaderLocationWH || isFormDisabled) return;
    if (WHCode !== pendingHeaderLocationWH || !WHName) return;

    updateState({
      locationLookupOpen: true,
      selectedWH: pendingHeaderLocationWH,
    });
    setPendingHeaderLocationWH("");
  }, [pendingHeaderLocationWH, WHCode, WHName, isFormDisabled]);



const handleCheckBBUploaded = useCallback(async (targetBranchCode) => {
  if (!targetBranchCode) return false;

  try {
    const payload = {
      PARAMS: JSON.stringify({
        branchCode: targetBranchCode,
      }),
    };

    const response = await postRequest("checkRMAJBBUploaded", payload);
    const result =
      response?.result ||
      response?.data?.result ||
      response?.Data?.result ||
      response?.data?.Data?.result ||
      {};

    return Boolean(result?.bbUploaded);
  } catch (error) {
    console.error("Error checking BB upload status:", error);
    return false;
  }
}, []);



useEffect(() => {
  let isMounted = true;

  const checkBBStatus = async () => {
    if (selectedAJType !== "BB" || !branchCode) {
      if (isMounted) {
        updateState({ bbUploadExists: false });
      }
      return;
    }

    const exists = await handleCheckBBUploaded(branchCode);

    if (isMounted) {
      updateState({ bbUploadExists: exists });
    }
  };

  checkBBStatus();

  return () => {
    isMounted = false;
  };
}, [selectedAJType, branchCode, handleCheckBBUploaded]);



const handleReset = () => {
      clearFgajDetailSorting();
      clearFgajGlSorting();

      updateState({
        
      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),

      refDocNo1: "",
      refDocNo2:"", 
      remarks:"",
      noReprints:"0",   
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL:[],
      documentStatus:"",
      itemSingleSelect:false,
      selectedAJType:"BB",
      WHCode:"",
      WHName:"",
      LocCode:"",
      LocName:"",

      
      
      // UI state
      activeTab: "basic",
      GLactiveTab: "invoice",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status:"Open"

    });
      updateTotalsDisplay (0, 0)
  };



   const loadCompanyData = async () => {
    updateState({isLoading:true})
    try {     
     const tbls = 'rmaj_hd,rmaj_dt1,rmaj_dt2'
     const hdtblcol_result = await useFieldLenghtCheck(tbls);
     if (hdtblcol_result){
       updateState({tblFieldArray :hdtblcol_result })
     }


    } catch (err) {
      console.error("Error fetching data:", err);
    }
     updateState({isLoading:false})
  };



  



const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"rmajNo",direction);
    if (!data?.rmajId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      quantity: formatNumber(item.quantity,decQty),
      unitCost: formatNumber(item.unitCost,decUcost),
      itemAmount: formatNumber(item.itemAmount,2),
      qtyHand: formatNumber(item.qtyHand,decQty),
    }));

    const formattedGLRows = (data.dt2 || []).map(glRow => ({
      ...glRow,
      debit: formatNumber(glRow.debit),
      credit: formatNumber(glRow.credit),
      debitFx1: formatNumber(glRow.debitFx1),
      creditFx1: formatNumber(glRow.creditFx1),
      debitFx2: formatNumber(glRow.debitFx2),
      creditFx2: formatNumber(glRow.creditFx2),
    }));

  
    // Update state with fetched data
    updateState({
      documentStatus: data.rmajStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.rmajId,
      documentNo: data.rmajNo,
      branchCode: data.branchCode,
      WHCode:data.whCode,
      WHName:data.whName,
      LocCode:data.locCode,
      LocName:data.locName,
      documentDate: useformatToDatev2(data.rmajDate),
      selectedAJType: data.ajtranType,
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
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false });
  }
};











const handleDocNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};


const handleActivityOption = async (action) => {
  if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
    return;
  }


  updateState({ isLoading: true });

  try {
    const {
      branchCode,
      documentNo,
      documentID,
      documentDate,
      selectedAJType,
      refDocNo1,
      refDocNo2,
      remarks,
      userCode,
      detailRows,
      detailRowsGL,
    } = state;

    let finalDetailRowsGL = [...detailRowsGL];

    const buildGlData = (glRows) => ({
      branchCode,
      rmajNo: documentNo || "",
      rmajId: documentID || "",
      rmajDate: documentDate,
      ajtranType: selectedAJType,
      refDocNo1,
      refDocNo2,
      remarks: remarks || "",
      whCode: WHCode || "",
      locCode: LocCode || "",
      userCode,

      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        categCode: row.categCode || "",
        oldValue: row.oldValue || "",
        quantity: parseFormattedNumber(row.quantity || 0),
        uomCode: row.uomCode || "",
        unitCost: parseFormattedNumber(row.unitCost || 0),
        itemAmount: parseFormattedNumber(row.itemAmount || 0),
        lotNo: row.lotNo || "",
        qstatCode: row.qstatCode || "",
        bbDate: row.bbDate || null,
        qtyHand: parseFormattedNumber(row.qtyHand || 0),
        whouseCode: row.whouseCode || "",
        locCode: row.locCode || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        slTypeCode: row.sltypeCode || "",
        slCode: row.slCode || "",
        uniqueKey: row.uniqueKey || "",
        operation: row.operation || "",
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
      if (finalDetailRowsGL.length === 0 && selectedAJType !== "BB") {
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
        "rmajId",
        "rmajNo"
      );

      if (response) {
        const responseDocNo = response.data?.[0]?.rmajNo || "";
        const responseDocId = response.data?.[0]?.rmajId || "";

        if (responseDocNo) {
          await fetchTranData(responseDocNo, branchCode);
        }

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
      }

      updateState({
        documentNo: response?.data?.[0]?.rmajNo || "",
        documentID: response?.data?.[0]?.rmajId || "",
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    }
  } catch (error) {
    console.error(`Error during ${action}:`, error);
  } finally {
    updateState({ isLoading: false });
  }
};


// const handleActivityOption = async (action) => {
//   // Prevent execution if document is already processed
//   console.log(documentStatus)
//   if (documentStatus !== '') return;

//   // 1. Helper function for formatting payload 
//   // This is synchronous to prevent Babel 'await' errors during mapping
//   const getFormattedPayload = (targetGLRows) => {
//     const {
//       branchCode,
//       documentNo,
//       documentID,
//       documentDate,
//       selectedAJType,
//       refDocNo1,
//       refDocNo2,
//       remarks,
//       userCode,
//       detailRows
//     } = state;

//     return {
//       branchCode: branchCode,
//       rmajNo: documentNo || "",
//       rmajId: documentID || "",
//       rmajDate: documentDate,
//       ajtranType: selectedAJType,
//       refDocNo1: refDocNo1,
//       refDocNo2: refDocNo2,
//       remarks: remarks || "",
//       whCode:WHCode||"",
//       locCode:LocCode || "",
//       userCode: userCode,
//       dt1: detailRows.map((row, index) => ({
//         lnNo: String(index + 1),
//         itemCode: row.itemCode || "",
//         itemName: row.itemName || "",
//         categCode: row.categCode || "",
//         oldValue:row.oldValue || "",
//         quantity: parseFormattedNumber(row.quantity || 0),
//         uomCode: row.uomCode || "",
//         unitCost: parseFormattedNumber(row.unitCost || 0),
//         itemAmount: parseFormattedNumber(row.itemAmount || 0),
//         lotNo: row.lotNo || "",
//         qstatCode: row.qstatCode || "",
//         bbDate: row.bbDate ? new Date(row.bbDate).toISOString().split("T")[0] : null,
//         qtyHand: parseFormattedNumber(row.qtyHand || 0),
//         whouseCode: row.whouseCode || "",
//         locCode: row.locCode || "",
//         acctCode: row.acctCode || "",
//         rcCode: row.rcCode || "",
//         slTypeCode: row.sltypeCode || "",
//         slCode: row.slCode || "",
//         uniqueKey: row.uniqueKey || "",
//         operation: row.operation || ""
//       })),
//       dt2: targetGLRows.map((entry, index) => ({
//         recNo: String(index + 1),
//         acctCode: entry.acctCode || "",
//         rcCode: entry.rcCode || "",
//         sltypeCode: entry.sltypeCode || "",
//         slCode: entry.slCode || "",
//         particular: entry.particular || "",
//         vatCode: entry.vatCode || "",
//         vatName: entry.vatName || "",
//         atcCode: entry.atcCode || "",
//         atcName: entry.atcName || "",
//         debit: parseFormattedNumber(entry.debit || 0),
//         credit: parseFormattedNumber(entry.credit || 0),
//         debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
//         creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
//         debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
//         creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
//         slRefNo: entry.slRefNo || "",
//         slRefDate: entry.slRefDate ? new Date(entry.slRefDate).toISOString().split("T")[0] : null,
//         remarks: entry.remarks || ""
//       }))
//     };
//   };

//   updateState({ isLoading: true });

//   try {
//     let currentGL = state.detailRowsGL;

//     // --- STEP 1: AUTO-GENERATE IF UPSERTING WITH EMPTY GL ---
//     // This allows "Generate then Save" in one click
//     if (action === "Upsert" && currentGL.length === 0 && selectedAJType !== "BB") {
//       const genPayload = getFormattedPayload([]);
//       const newGlEntries = await useGenerateGLEntries(docType, genPayload);

//       if (newGlEntries && newGlEntries.length > 0) {
//         currentGL = newGlEntries;
//         updateState({ detailRowsGL: newGlEntries });
//       } else {
//         updateState({ isLoading: false });
//         console.warn("GL Generation failed. Upsert cancelled.");
//         return; 
//       }

//     }

//     // --- STEP 2: MANUAL GENERATE GL ---
//     if (action === "GenerateGL") {
//       const genPayload = getFormattedPayload(currentGL);
//       const newGlEntries = await useGenerateGLEntries(docType, genPayload);
//       if (newGlEntries) {
//         updateState({ detailRowsGL: newGlEntries });
//       }
//     }

//     // --- STEP 3: UPSERT (SAVE) ---
//     if (action === "Upsert") {
//       // We use currentGL variable because state updates are async 
//       // and wouldn't be available yet if we just generated them.
//       const savePayload = getFormattedPayload(currentGL);
//       const response = await useTransactionUpsert(docType, savePayload, updateState, 'rmajId', 'rmajNo');

//       if (response) {
//         const isZero = Number(noReprints) === 0;
//         const onSaveAndPrint = isZero
//           ? () => updateState({ showSignatoryModal: true })
//           : () => handleSaveAndPrint(response.data[0].rmajId);

//         useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
//         updateState({ isDocNoDisabled: true, isFetchDisabled: true });
//       }
//     }
//   } catch (error) {
//     console.error("Error in transaction flow:", error);
//   } finally {
//     updateState({ isLoading: false });
//   }
// };





const createEmptyDetailRow = () => ({
  lnNo: "",
  itemCode: "",
  itemName: "",
  categCode: "",
  oldValue: "",
  quantity: formatNumber(1, decQty),
  uomCode: "",
  unitCost: formatNumber(0, decUcost),
  itemAmount: "0.00",
  lotNo: "",
  qstatCode: "",
  bbDate: "",
  qtyHand: formatNumber(0, decQty),
  whouseCode: "",
  locCode: "",
  acctCode: "",
  rcCode: "",
  sltypeCode: "",
  slCode: "",
  uniqueKey: "",
  operation: "",
});

const handleGetItem = async (index = null) => {
  if (!selectedAJType) return;

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
      "Header : Warehouse": WHCode,
      "Header : Adjustment Type": selectedAJType,
    };
    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
    if (!isValid) return;


    if (["BB", "IG"].includes(selectedAJType)) {
      updateState({
        itemSingleSelect: false,
        itemMastLookupOpen: true,
      });
      return;
    }

    await handleOpenMSLookup(false);
    return;
};




  const handleAddItem = async (index) => {
  if (!selectedAJType) return;

  if (["BB", "IG"].includes(selectedAJType)) {
    updateState({
      selectedRowIndex: index,
      itemSingleSelect: true,
      itemMastLookupOpen: true,
    });
    return;
  }

    updateState({ selectedRowIndex: index}); 
    await handleOpenMSLookup(true);
    return;
};



const createEmptyGlRow = () => ({
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
});

const handleAddRowGL = (index = null) => {
  if (!selectedAJType) return;

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
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
                  documentDate:useGetCurrentDay(), 
                  noReprints:"0",
     });
  }
};





const handleFieldBehavior = (option) => {
  switch (option) {

    case "hiddenBBMode":
     return (
        selectedAJType === "BB" || currentUserRow?.viewCostamt ==='N'
      );


  case "noViewCostamt":
     return ( currentUserRow?.viewCostamt ==='N'
      );


  case "allowInsert":
      return ["BB", "IG", "IR"].includes(selectedAJType);


      case "hiddenCAMode":
     return (
        selectedAJType === "CA" 
      );


    default:
      return false; 
  }
};



const handleColumnLabel = (columnName) =>{
  switch (columnName) {

     case "UnitCost":
      if(selectedAJType === "CA") {
        return "Amount"
      }
      return "Unit Cost"

       default:
      return ""; 
  }
}
  






  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

  const rmajDetailColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Name", width: 260 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "quantity", label: "Quantity", width: 120 },
    { key: "unitCost", label: handleColumnLabel("UnitCost"), width: 130 },
    { key: "itemAmount", label: "Amount", width: 130 },
    { key: "lotNo", label: "Lot No", width: 130 },
    { key: "bbDate", label: "BB Date", width: 130 },
    { key: "qstatCode", label: "Quality Status", width: 130 },
    { key: "whouseCode", label: "Warehouse", width: 120 },
    { key: "locCode", label: "Location", width: 120 },
    { key: "acctCode", label: "Account Code", width: 130 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "qtyHand", label: "Qty On Hand", width: 130 },
    { key: "categCode", label: "Category", width: 120 },
    { key: "oldValue", label: "Old Value", width: 120 },
    { key: "uniqueKey", label: "Unique Key", width: 120 },
    { key: "operation", label: "Operation", width: 120 },
  ];

  const {
    getColumnStyle: getFgajDetailColumnStyle,
    getFrozenColumnStyle: getFgajDetailFrozenStyle,
    getOrderedColumns: getOrderedFgajDetailColumns,
    getSortedRows: getSortedFgajDetailRows,
    clearAllSorting: clearFgajDetailSorting,
    clearZeroValueOnFocus: clearFgajDetailZeroOnFocus,
    focusNextRowInput: focusNextFgajDetailRowInput,
    renderHeaderContextMenu: renderFgajDetailHeaderContextMenu,
    renderResizableHeader: renderFgajDetailHeader,
  } = useResizableTableColumns(rmajDetailColumnDefs);

  const orderedFgajDetailColumns = getOrderedFgajDetailColumns(rmajDetailColumnDefs);
  const visibleFgajDetailColumns = orderedFgajDetailColumns.filter((column) => {
    if (["categCode", "oldValue", "uniqueKey", "operation", "sltypeCode"].includes(column.key)) return false;
    if (column.key === "quantity") return !handleFieldBehavior("hiddenCAMode");
    if (column.key === "unitCost") return !handleFieldBehavior("noViewCostamt");
    if (column.key === "itemAmount") return !handleFieldBehavior("hiddenCAMode") && !handleFieldBehavior("noViewCostamt");
    if (["acctCode", "rcCode", "slCode"].includes(column.key)) return !handleFieldBehavior("hiddenBBMode");
    return true;
  });
  const getFgajDetailFallbackWidth = (key) => rmajDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getFgajDetailCellStyle = (key, fallbackWidth) => ({
    ...getFgajDetailColumnStyle(key, fallbackWidth),
    ...getFgajDetailFrozenStyle(key, visibleFgajDetailColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedFgajDetailRows = getSortedFgajDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const getSingleUploadTemplateColumns = () =>
    getGlobalSingleUploadTemplateColumns(visibleFgajDetailColumns, { excludeKeys: ["qtyHand"] });

  const handleDownloadSingleUploadTemplate = async () => {
    await downloadGlobalSingleUploadTemplate({
      columns: getSingleUploadTemplateColumns(),
      rows: sortedFgajDetailRows,
      fileName: "RM Adjustment Single Transaction Uploading Template.xlsx",
      sheetName: "Item Details",
      decimalColumnFormats: {
        quantity: decQty,
        unitCost: decUcost,
        itemAmount: 2,
      },
      dateColumns: ["bbDate"],
      rightAlignedColumns: ["quantity", "unitCost", "itemAmount"],
      centerAlignedColumns: [
        "ln",
        "itemCode",
        "uomCode",
        "bbDate",
        "qstatCode",
        "whouseCode",
        "locCode",
        "acctCode",
        "rcCode",
        "slCode",
      ],
      getCellValue: ({ rowEntry, column }) => {
        const { row, originalIndex } = rowEntry;
        switch (column.key) {
          case "ln":
            return originalIndex + 1;
          case "quantity":
          case "unitCost":
          case "itemAmount":
            return parseFormattedNumber(row[column.key] || 0);
          case "bbDate":
            return toSingleUploadExcelDate(row.bbDate, toDateInputValue);
          default:
            return String(row[column.key] ?? "");
        }
      },
    });
  };

  const buildUploadValidationPayload = (rows) => ({
    json_data: {
      branchCode,
      rmajDate: documentDate,
      ajtranType: selectedAJType,
      whCode: WHCode || "",
      locCode: LocCode || "",
      userCode,
      dt1: rows.map((row, index) => ({
        lnNo: index + 1,
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        categCode: row.categCode || "",
        quantity: parseFormattedNumber(row.quantity || 0) || 0,
        uomCode: row.uomCode || "",
        unitCost: parseFormattedNumber(row.unitCost || 0) || 0,
        itemAmount: parseFormattedNumber(row.itemAmount || 0) || 0,
        lotNo: row.lotNo || "",
        qstatCode: row.qstatCode || "",
        bbDate: row.bbDate || null,
        qtyHand: 0,
        whouseCode: row.whouseCode || WHCode || "",
        locCode: row.locCode || LocCode || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        slTypeCode: row.sltypeCode || row.slTypeCode || "",
        slCode: row.slCode || "",
        uniqueKey: "",
        operation: row.operation || "A",
        oldValue: row.oldValue || row.itemCode || "",
      })),
    },
  });

  const parseSingleUploadRow = ({ rawValuesByKey }) => {
    const rowData = createEmptyDetailRow();

    getSingleUploadTemplateColumns().forEach((column) => {
      const rawCell = rawValuesByKey[column.key];
      const rawValue = rawCell?.value;

      switch (column.key) {
        case "ln":
          break;
        case "quantity":
        case "unitCost":
        case "itemAmount":
          rowData[column.key] = parseFormattedNumber(rawValue || 0) || 0;
          break;
        case "bbDate":
          rowData.bbDate = toSingleUploadDateValue(rawCell?.cell?.value || rawValue, toDateInputValue);
          break;
        default:
          rowData[column.key] = String(rawValue ?? "").trim();
          break;
      }
    });

    const quantity = parseFormattedNumber(rowData.quantity || 0) || 0;
    const unitCost = parseFormattedNumber(rowData.unitCost || 0) || 0;
    rowData.quantity = quantity;
    rowData.unitCost = unitCost;
    rowData.itemAmount = +(quantity * unitCost).toFixed(2);
    rowData.whouseCode = rowData.whouseCode || WHCode || "";
    rowData.locCode = rowData.locCode || LocCode || "";
    rowData.operation = "A";
    rowData.qtyHand = 0;
    rowData.uniqueKey = "";

    return rowData;
  };

  const handleUploadExcelFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const fieldsToCheck = {
      "Header : Warehouse": WHCode,
      "Header : Adjustment Type": selectedAJType,
    };
    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Upload Transaction");
    if (!isValid) return;

    updateState({ isLoading: true, showSpinner: true });

    try {
      const uploadResult = await handleSingleUploadExcelFile({
        file,
        columns: getSingleUploadTemplateColumns(),
        createEmptyRow: createEmptyDetailRow,
        parseRow: parseSingleUploadRow,
        validateRows: async (uploadedRows) => {
          const response = await postRequest("validateRMAJUpload", buildUploadValidationPayload(uploadedRows));
          const result = extractSingleUploadValidationResult(response);
          if (!result) {
            console.error("Unable to read upload validation response:", response);
          }
          return result;
        },
      });

      if (uploadResult?.cancelled) return;

      if (!uploadResult?.ok) {
        showSingleUploadErrorList(uploadResult?.title || "Upload Error", uploadResult?.errors || []);
        return;
      }

      const uploadedRows = uploadResult.rows || [];
      const result = uploadResult.validationResult;
      const errorRows = result?.errors || [];
      const validRows = result?.rows || [];

      if (!result) {
        showSingleUploadErrorList("Upload Validation Error", ["Unable to read validation response from the server."]);
        return;
      }

      if (Number(result.errorCount || 0) > 0 || errorRows.length > 0) {
        showSingleUploadErrorList("Upload Rejected", errorRows.map((row) => row.errorMsg || row.message || JSON.stringify(row)));
        return;
      }

      if (validRows.length === 0) {
        showSingleUploadErrorList("Upload Validation Error", [
          "The server returned no validated rows.",
          "Please check the Laravel validateRMAJUpload response and the SQL ValidateUpload block.",
          "Uploaded rows read from Excel: " + uploadedRows.length,
        ]);
        console.error("ValidateUpload returned zero rows:", { result, uploadedRows });
        return;
      }

      const finalRows = validRows.map((row, index) => ({
        lnNo: index + 1,
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        categCode: row.categCode || "",
        oldValue: row.oldValue || row.itemCode || "",
        quantity: formatNumber(parseFormattedNumber(row.quantity || 0), decQty),
        uomCode: row.uomCode || "",
        unitCost: formatNumber(parseFormattedNumber(row.unitCost || 0), decUcost),
        itemAmount: formatNumber(parseFormattedNumber(row.itemAmount || 0), 2),
        lotNo: row.lotNo || "",
        qstatCode: row.qstatCode || "",
        bbDate: toDateInputValue(row.bbDate),
        qtyHand: formatNumber(parseFormattedNumber(row.qtyHand || 0), decQty),
        whouseCode: row.whouseCode || "",
        locCode: row.locCode || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        sltypeCode: row.sltypeCode || row.slTypeCode || "",
        slCode: row.slCode || "",
        uniqueKey: row.uniqueKey || "",
        operation: row.operation || "A",
      }));

      updateState({ detailRows: finalRows, detailRowsGL: [] });
      updateTotals(finalRows);

      Swal.fire({
        icon: "success",
        title: "Upload Completed",
        text: `${finalRows.length} row(s) uploaded and validated successfully.`,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Upload transaction error:", error);
      showSingleUploadErrorList("Upload Error", [error?.message || "Unable to process the uploaded Excel file."]);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleUploadSingleTransaction = () => {
    uploadInputRef.current?.click();
  };

  const rmajGlColumnDefs = [
    { key: "ln", label: "LN", width: 56 },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type", width: 120 },
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
    getColumnStyle: getFgajGlColumnStyle,
    getFrozenColumnStyle: getFgajGlFrozenStyle,
    getOrderedColumns: getOrderedFgajGlColumns,
    getSortedRows: getSortedFgajGlRows,
    setColumnOrder: setFgajGlColumnOrder,
    clearAllSorting: clearFgajGlSorting,
    clearZeroValueOnFocus: clearFgajGlZeroOnFocus,
    focusNextRowInput: focusNextFgajGlRowInput,
    renderHeaderContextMenu: renderFgajGlHeaderContextMenu,
    renderResizableHeader: renderFgajGlHeader,
  } = useResizableTableColumns(rmajGlColumnDefs);
  const orderedFgajGlColumns = getOrderedFgajGlColumns(rmajGlColumnDefs);
  const getFgajGlFallbackWidth = (key) => rmajGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getFgajGlCellStyle = (key, fallbackWidth) => ({
    ...getFgajGlColumnStyle(key, fallbackWidth),
    ...getFgajGlFrozenStyle(key, orderedFgajGlColumns, fallbackWidth, { isHeader: false }),
  });
  useEffect(() => {
    setFgajGlColumnOrder(rmajGlColumnDefs.map((column) => column.key));
  }, [setFgajGlColumnOrder, withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const sortedFgajGlRows = getSortedFgajGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const rmajDetailEnterNextRowZeroClearFields = ["quantity", "unitCost"];
  const rmajGlEnterNextRowZeroClearFields = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"];

  const getGLTotalsState = (rows) => {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const debitSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
    const debitFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx2) || 0), 0);
    const creditFx2Sum = sourceRows.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx2) || 0), 0);
    return { totalDebit: formatNumber(debitSum), totalCredit: formatNumber(creditSum), totalDebitFx1: formatNumber(debitFx1Sum), totalCreditFx1: formatNumber(creditFx1Sum), totalDebitFx2: formatNumber(debitFx2Sum), totalCreditFx2: formatNumber(creditFx2Sum) };
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
  const docNo = params.get("rmajNo");
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

 

  const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalQuantity = 0;
  let totalItemAmount = 0;

  rows.forEach(row => {
    const item_Quantity = parseFormattedNumber(row.quantity || 0) || 0;
    const item_ItemAmount = parseFormattedNumber(row.itemAmount || 0) || 0;

    totalQuantity+= item_Quantity;
    totalItemAmount+= item_ItemAmount;
  });
    updateTotalsDisplay (totalQuantity,totalItemAmount);
};



// const handleDetailChange = async (index, field, value, runCalculations = true) => {
//   const updatedRows = [...detailRows];

//   updatedRows[index] = {
//     ...updatedRows[index],
//     [field]: value,
//   };

//   const row = updatedRows[index];

//   const autoFillBlanks = (fieldName, newValue, extraData = {}) => {
//     if (index === 0) {
//       updatedRows.forEach((r, i) => {
//         if (i !== 0 && (!r[fieldName] || r[fieldName].toString().trim() === "")) {
//           updatedRows[i] = {
//             ...r,
//             [fieldName]: newValue,
//             ...extraData
//           };
//         }
//       });
//     }
//   };

//   if (field === 'acctCode') {
//     row.acctCode = value.acctCode;
//     autoFillBlanks('acctCode', value.acctCode);
//   }

//   if (field === 'rcCode') {
//     row.rcCode = value.rcCode;
//     autoFillBlanks('rcCode', value.rcCode);
//   }

//   if (field === 'slCode') {
//     row.slCode = value.slCode;
//     row.sltypeCode = value.sltypeCode;
//     autoFillBlanks('slCode', value.slCode, { sltypeCode: value.sltypeCode });
//   }

//     if (field === 'whouseCode') {
//     row.whouseCode = value.whCode;
//     autoFillBlanks('whouseCode', value.whCode);
//   }

//   if (field === 'locCode') {
//     row.locCode = value.locCode;
//     autoFillBlanks('locCode', value.locCode);
//   }

  
//   if (field === 'qstatCode') {
//     row.qstatCode = value.qstatCode;
//     autoFillBlanks('qstatCode', value.qstatCode);
//   }



  
//    if (['bbDate'].includes(field)) {
//         row[field] = value;
//     }

//   if (runCalculations) {
//     const origQuantity = parseFormattedNumber(row.quantity) || 0;
//     const origUnitCost = parseFormattedNumber(row.unitCost) || 0;
//     const origQtyHand = parseFormattedNumber(row.qtyHand) || 0;
//     const origOperation = row.operation;

//     const recalcRow = async () => {
//       let processedQty = Math.abs(origQuantity);

//       if (origOperation === "S" && (selectedAJType === "IL" || selectedAJType === "IR")) {
//         if (processedQty > origQtyHand) {
//           useSwalErrorAlert('Exceeds Stock', `Quantity (${processedQty}) exceeds Quantity on Hand (${origQtyHand}). Value has been adjusted.`);
//           processedQty = origQtyHand;
//         }
//         processedQty = processedQty * -1;
//       } else {
//         processedQty = Math.abs(processedQty);
//       }

//       const finalQtyForMath = (selectedAJType === "CA") ? 1 : processedQty;
//       const calculatedAmount = +(finalQtyForMath * origUnitCost).toFixed(2);

//       row.itemAmount = formatNumber(calculatedAmount);
//       row.quantity = formatNumber(selectedAJType === "CA" ? 0 : processedQty, decQty);
//       row.unitCost = formatNumber(origUnitCost, decUcost);
//     };

//     if (field === 'quantity' || field === 'unitCost') {
//       await recalcRow();
//     }
//   }

//   updatedRows[index] = row;
//   updateState({ detailRows: updatedRows,
//                 detailRowsGL :[],
//    });
//   updateTotals(updatedRows);
// };



const handleDetailChange = async (index, field, value, runCalculations = true) => {
  const updatedRows = [...(detailRowsRef.current || [])];

  updatedRows[index] = {
    ...updatedRows[index],
    [field]: value,
  };


  const row = updatedRows[index];
  const autoFillBlanks = async (fieldName, newValue, extraData = {}) => {
    if (index === 0) {
      const hasBlanks = updatedRows.some((r, i) => i !== 0 && (!r[fieldName] || r[fieldName].toString().trim() === ""));

     const fieldLabels = {
          acctCode: 'Account Code',
          rcCode: 'RC Code',
          slCode: 'SL Code',
          whouseCode: 'Warehouse',
          locCode: 'Location',
          qstatCode: 'Quality Status'
        };
      
      if (hasBlanks) {
        const result = await Swal.fire({
          title: 'Replicate Data?',
          text: `Do you want to copy this ${fieldLabels[field] } to all blank rows?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, copy it!',
          cancelButtonText: 'No'
        });

        if (result.isConfirmed) {
          updatedRows.forEach((r, i) => {
            if (i !== 0 && (!r[fieldName] || r[fieldName].toString().trim() === "")) {
              updatedRows[i] = {
                ...r,
                [fieldName]: newValue,
                ...extraData
              };
            }
          });
          updateState({ detailRows: [...updatedRows] });
        }
      }
    }
  };


  // --- MODIFIED autoFillBlanks END ---

  if (field === 'acctCode') {
    row.acctCode = value.acctCode;
    await autoFillBlanks('acctCode', value.acctCode);
  }

  if (field === 'rcCode') {
    row.rcCode = value.rcCode;
    await autoFillBlanks('rcCode', value.rcCode);
  }

  if (field === 'slCode') {
    row.slCode = value.slCode;
    row.sltypeCode = value.sltypeCode;
    await autoFillBlanks('slCode', value.slCode, { sltypeCode: value.sltypeCode });
  }

  if (field === 'whouseCode') {
    row.whouseCode = value.whCode;
    row.locCode = "";
    await autoFillBlanks('whouseCode', value.whCode);
  }

  if (field === 'locCode') {
    row.locCode = value.locCode;
    await autoFillBlanks('locCode', value.locCode);
  }

  if (field === 'qstatCode') {
    row.qstatCode = value.qstatCode;
    await autoFillBlanks('qstatCode', value.qstatCode);
  }

  if (['bbDate'].includes(field)) {
    row[field] = value;
  }


 if (field === 'itemCode') {
    row["itemCode"] = value.itemCode;
    row["itemName"] = value.itemName;
    row["uomCode"] = value.uomCode;
    row["categCode"] = value.categCode;   
  }



  if (runCalculations) {
    const origQuantity = parseFormattedNumber(row.quantity) || 0;
    const origUnitCost = parseFormattedNumber(row.unitCost) || 0;
    const origQtyHand = parseFormattedNumber(row.qtyHand) || 0;
    const origOperation = row.operation;

    const recalcRow = async () => {
      let processedQty = Math.abs(origQuantity);

      if (origOperation === "S" && (selectedAJType === "IL" || selectedAJType === "IR")) {
        if (processedQty > origQtyHand) {
          useSwalErrorAlert('Exceeds Stock', `Quantity (${processedQty}) exceeds Quantity on Hand (${origQtyHand}). Value has been adjusted.`);
          processedQty = origQtyHand;
        }
        processedQty = processedQty * -1;
      } else {
        processedQty = Math.abs(processedQty);
      }

      const finalQtyForMath = (selectedAJType === "CA") ? 1 : processedQty;
      const calculatedAmount = +(finalQtyForMath * origUnitCost).toFixed(2);

      row.itemAmount = formatNumber(calculatedAmount);
      row.quantity = formatNumber(selectedAJType === "CA" ? 0 : processedQty, decQty);
      row.unitCost = formatNumber(origUnitCost, decUcost);
    };

    if (field === 'quantity' || field === 'unitCost') {
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


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,"",docType);
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
    updateState({ detailRowsGL: updatedRowsGL, ...getGLTotalsState(updatedRowsGL) });
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
  updateState({ detailRowsGL: updatedRowsGL, ...getGLTotalsState(updatedRowsGL) });
};












const handleCloseAccountModal = (selectedAccount) => {

    if (selectedAccount && selectedRowIndex !== null) {

        const specialAccounts = ['invAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, "acctCode", selectedAccount,false);
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

      const updateFn = accountModalSource !== null ? handleDetailChange : handleDetailChangeGL;
      updateFn(selectedRowIndex, 'slCode', selectedSl, false);

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



const handleCloseSignatory = async (mode) => {
  
    updateState({ 
        showSpinner: true,
        showSignatoryModal: false,
        noReprints: mode === "Final" ? 1 : 0, });
    await useHandlePrint(documentID, docType, mode,userCode);

    updateState({
      showSpinner: false 
    });

};






const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};







const handleCloseWarehouseLookup = (row) => {
  const isHeaderBBIGWarehouse =
    row &&
    !accountModalSource &&
    (selectedAJType === "IG" || selectedAJType === "BB");

  const queueHeaderLocationLookup = () => {
    if (!isHeaderBBIGWarehouse) return;
    setPendingHeaderLocationWH(row.whCode);
  };

  if (row) {
    accountModalSource
      ? handleDetailChange(selectedRowIndex, 'whouseCode', row, false)
      : updateState({
          WHCode: row.whCode,
          WHName: row.whName,
          LocCode: "", 
          LocName: ""
        });


    const hasDetails = detailRows && detailRows.length > 0;
    if (!accountModalSource && (selectedAJType === "IG" || selectedAJType === "BB") && hasDetails) {
      
      Swal.fire({
        title: 'Apply to Details?',
        text: "Do you want to apply this Warehouse to all detail items?",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Yes, update all',
        cancelButtonText: 'No, header only'
      }).then((result) => {
        if (result.isConfirmed) {
          const updatedDetails = detailRows.map((item) => ({
            ...item,
            whouseCode: row.whCode,
            locCode: "",
          }));
          updateState({ detailRows: updatedDetails });
        }

        queueHeaderLocationLookup();
      });
    } else {
      queueHeaderLocationLookup();
    }
  }
  
  updateState({
    warehouseLookupOpen: false,
    accountModalSource: "",
  });
};






const handleCloseLocationLookup = (row) => {
  if (row) {
    accountModalSource
      ? handleDetailChange(selectedRowIndex, 'locCode', row, false)
      : updateState({ LocCode: row.locCode, LocName: row.locName });

     const hasDetails = detailRows && detailRows.length > 0;
      if (!accountModalSource && (selectedAJType === "IG" || selectedAJType === "BB") && hasDetails) {
        
        Swal.fire({
          title: 'Apply to Details?',
          text: "Do you want to apply this Location to all detail items?",
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Yes, update all',
          cancelButtonText: 'No, header only'
        }).then((result) => {
          if (result.isConfirmed) {
            const updatedDetails = detailRows.map((item) => ({
              ...item,
              locCode: row.locCode,
            }));
            updateState({ detailRows: updatedDetails });
        }
      });
    }
  }
  updateState({ locationLookupOpen: false, selectedWH:"" ,accountModalSource:"" });
};



const handleCloseQStatLookup = (row) => {
  if (row) {
   handleDetailChange(selectedRowIndex, 'qstatCode', row, false)
  }
  updateState({ showQstatModal: false });
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




  
  const handleOpenMSLookup = async (itemSingleSelect) => {
    try {

      
      updateState({ isLoading: true,
                    itemSingleSelect : itemSingleSelect });
  
      const endpoint ="getInvLookupRM"
      const response = await fetchDataJson(endpoint, { userCode, whouseCode :WHCode || "", locCode: LocCode || "", docType:"RMAJ" ,tranType :itemSingleSelect? "IRR" :selectedAJType });
      const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
  

      const lookupTypes = ["BB", "IG"];  
      const colConfig = await useSelectedHSColConfig((lookupTypes.includes(selectedAJType) || itemSingleSelect) ? "AllMastItemLookup" : "getInvLookupRM");


     if (custData.length === 0) {
        useSwalInfoAlert(lookupTypes.includes(selectedAJType) ? "RM Master Data" : "RM Location Balance","No records found")
         updateState({ isLoading: false });
        return; 
      }
  
      updateState({ globalLookupRow: custData,
                    globalLookupHeader:colConfig,
                    msLookupModalOpen: true,
                    isLoading: false
        });
  

    } catch (error) {
      useSwalErrorAlert(lookupTypes.includes(selectedAJType) ? "RM Master Data" : "RM Location Balance","No records found")
      updateState({ 
          globalLookupRow: [] ,
          globalLookupHeader: [],
          isLoading: false  });
    }
  };
  
  








//   const handleCloseMSLookup = (selectedItems) => {
//   updateState({ msLookupModalOpen: false });

//   if (!selectedItems) return;

//   const itemsArray = Array.isArray(selectedItems.records) ? selectedItems.records : [selectedItems.records];
//   if (itemsArray.length === 0) return;

//   const newRows = itemsArray.map((item) => ({
//     itemCode: item?.itemCode ?? "",
//     itemName: item?.itemName ?? "",
//     categCode: item?.categCode ?? "",
//     uomCode: item?.uomCode ?? "",
//     quantity: formatNumber(0, decQty),
//     unitCost: formatNumber(parseFormattedNumber(item?.unitCost ?? 0), decUcost),
//     amount: formatNumber(0, 2),
//     lotNo: item?.lotNo ?? "",
//     bbDate: item?.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : "",
//     qstatCode: item?.qstatCode ?? "",
//     whouseCode: item?.whouseCode ?? WHCode ?? "",
//     locCode: item?.locCode ?? LocCode ?? "",
//     qtyHand: formatNumber(parseFormattedNumber(item?.qtyHand ?? 0), decQty),
//     uniqueKey: item?.uniqueKey ?? "",
//     operation:  (selectedAJType === "IL" || selectedAJType === "IR") ? "S" : "A",
//     acctCode: "",
//     sltypeCode: "",
//     rcCode: "",
//     slCode: ""
//   }));


// setState((prev) => {
//     const updated = [...(prev.detailRows || []), ...newRows];
//     updateTotalsDisplay(0,0);
//     return { ...prev, detailRows: updated };
//   });
// };


const handleAddBlankRow = (index) => {
  const blankRow = {
    itemCode: "",
    oldValue: "",
    itemName: "",
    categCode: "",
    uomCode: "",
    unitCost: formatNumber(0, decUcost),
    lotNo: "",
    bbDate: "",
    qstatCode: "",
    whouseCode: WHCode ?? "",
    locCode: LocCode ?? "",
    acctCode: "",
    sltypeCode: "",
    rcCode: "",
    slCode: "",
    uniqueKey: "",
    quantity: formatNumber(0, decQty),
    qtyHand: formatNumber(0, decQty),
    itemAmount: formatNumber(0, 2),
    operation: "A"
  };

  setState((prev) => {
    const updatedRows = [...(prev.detailRows || [])];
    // Inserts the blankRow at the index + 1 position (immediately below)
    updatedRows.splice(index + 1, 0, blankRow);
    
    return { ...prev, detailRows: updatedRows };
  });
};




const handleCloseMSLookup = (selectedItems) => {
  

  if (!selectedItems) return;

  const itemsArray = Array.isArray(selectedItems.records) ? selectedItems.records : [selectedItems.records];
  if (itemsArray.length === 0) return;

  const newRows = itemsArray.flatMap((item) => {
  const rawQtyHand = parseFormattedNumber(item?.qtyHand ?? 0);
  const rawUnitCost = parseFormattedNumber(item?.unitCost ?? 0);
  const originalKey = item?.uniqueKey ?? "";




  if(itemSingleSelect && selectedAJType ==="IR"){
    
      handleDetailChange(selectedRowIndex, 'itemCode', item, false)
      updateState({itemSingleSelect: false,msLookupModalOpen: false });
      return[];
  }


  


    // Base configuration shared by both rows
    const baseRow = {
      itemCode: item?.itemCode ?? "",
      oldValue: item?.itemCode ?? "",
      itemName: item?.itemName ?? "",
      categCode: item?.categCode ?? "",
      uomCode: item?.uomCode ?? "",
      unitCost: formatNumber(rawUnitCost, decUcost),     
      lotNo: item?.lotNo ?? "",
      bbDate: item?.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : "",
      qstatCode: item?.qstatCode ?? "",
      whouseCode: item?.whouseCode ?? WHCode ?? "",
      locCode: item?.locCode ?? LocCode ?? "",
      acctCode: "",
      sltypeCode: "",
      rcCode: "",
      slCode: ""
    };

    if (selectedAJType === "IR") {
      return [
        // 1st Record: Has uniqueKey, Quantity is negative qtyHand
        {
          ...baseRow,
          uniqueKey: originalKey,
          quantity: formatNumber(rawQtyHand * -1, decQty),
          qtyHand: formatNumber(rawQtyHand, decQty),
          itemAmount: formatNumber((rawQtyHand * rawUnitCost)*-1, 2),
          operation:"S"
        },
        // 2nd Record: No uniqueKey, Quantity is positive qtyHand
        {
          ...baseRow,
          uniqueKey: "", // No value as requested
          quantity: formatNumber(rawQtyHand, decQty),
          qtyHand: formatNumber(0, decQty),
          itemAmount: formatNumber((rawQtyHand), 2),
          operation:"A"
        }
      ];
    }

    // Default logic for other types (Single row, original key)
    return [
      {
        ...baseRow,
        uniqueKey: originalKey,
        qtyHand: formatNumber(rawQtyHand, decQty),
        quantity: formatNumber(0, decQty),
        itemAmount: formatNumber(0, 2),
        operation: (selectedAJType === "IL") ? "S" : "A"
      }
    ];
  });

  setState((prev) => {
    const updated = [...(prev.detailRows || []), ...newRows];
    updateTotalsDisplay(0, 0);
    return { ...prev, detailRows: updated };
  });


   updateState({itemSingleSelect: false ,msLookupModalOpen: false });
};

const handleCloseItemMastLookup = (selectedItems) => {
  if (!selectedItems) {
    updateState({ itemMastLookupOpen: false, itemSingleSelect: false });
    return;
  }

  const itemsArray = Array.isArray(selectedItems.records)
    ? selectedItems.records
    : selectedItems.records ? [selectedItems.records] : [];

  if (itemSingleSelect) {
    if (itemsArray.length > 0 && selectedRowIndex !== null) {
      handleDetailChange(selectedRowIndex, "itemCode", itemsArray[0], false);
    }
    updateState({
      itemMastLookupOpen: false,
      itemSingleSelect: false,
      selectedRowIndex: null,
    });
    return;
  }

  handleCloseMSLookup(selectedItems);
  updateState({ itemMastLookupOpen: false });
};






const renderFgajDetailColumn = (columnKey, row, index) => {
  const columnWidth = getFgajDetailFallbackWidth(columnKey);
  const style = getFgajDetailCellStyle(columnKey, columnWidth);
  const isNegative = parseFormattedNumber(row.quantity) < 0;
  const textColorClass = isNegative ? "text-red-600" : "";
  const canLookupStock = ["BB", "IG", "IR"].includes(selectedAJType) && !isFormDisabled && row.operation !== "S";

  const focusNextDetailCell = (field) => {
    focusNextFgajDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: rmajDetailEnterNextRowZeroClearFields,
      parseValue: parseFormattedNumber,
      onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false),
    });
  };

  const textInput = (field, options = {}) => (
    <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${textColorClass} ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e) => handleDetailChange(index, field, e.target.value, false)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || isFormDisabled) return; e.preventDefault(); focusNextDetailCell(field); }} />
  );

  const lookupCell = (field, onClick, options = {}) => (
    <td key={columnKey} className="global-tran-td-ui relative" style={style}><div className="flex items-center"><input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui text-center pr-6 cursor-pointer ${textColorClass}`.trim()} value={row[field] || ""} readOnly onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextDetailCell(field); }} />{!isFormDisabled && !options.hideIcon && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={onClick} />}</div></td>
  );

  const amountInput = (field, options = {}) => {
    const decimalPlaces = options.decimals ?? 2;
    const pattern = options.allowNegative
      ? new RegExp(`^-?\\d*\\.?\\d{0,${decimalPlaces}}$`)
      : new RegExp(`^\\d*\\.?\\d{0,${decimalPlaces}}$`);

    return (
      <input type="text" id={`${field}-${index}`} className={`w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 ${textColorClass}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(options.allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, ""); if (pattern.test(sanitizedValue) || sanitizedValue === "") handleDetailChange(index, field, sanitizedValue, false); }} onFocus={(e) => clearFgajDetailZeroOnFocus(e, { isEditable: !(options.readOnly ?? isFormDisabled), onClear: (value) => handleDetailChange(index, field, value, false) })} onBlur={async (e) => { if (options.readOnly ?? isFormDisabled) return; const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, field, num, true); setFocusedCell(null); }} onKeyDown={async (e) => { if (e.key !== "Enter" || (options.readOnly ?? isFormDisabled)) return; e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, field, num, true); focusNextFgajDetailRowInput(index, field, { rows: detailRows, zeroClearFields: rmajDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); }} />
    );
  };

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className={`global-tran-td-ui text-center ${textColorClass}`} style={style}>{index + 1}</td>,
    itemCode: () => lookupCell("itemCode", () => handleAddItem(index), { hideIcon: !(["BB", "IG"].includes(selectedAJType) || (row.operation === "A" && selectedAJType === "IR")) }),
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { readOnly: true })}</td>,
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: true, className: "text-center" })}</td>,
    quantity: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("quantity", { allowNegative: true, decimals: decQty })}</td>,
    unitCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("unitCost", { decimals: decUcost, readOnly: isFormDisabled || selectedAJType === "IL" || (selectedAJType === "IR" && row.operation === "S") })}</td>,
    itemAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className={`w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 ${textColorClass}`.trim()} value={formatNumber(parseFormattedNumber(row.itemAmount)) || ""} readOnly /></td>,
    lotNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("lotNo", { readOnly: isFormDisabled || selectedAJType === "IL" || selectedAJType === "CA" || (selectedAJType === "IR" && row.operation === "S"), maxLength: useGetFieldLength(tblFieldArray, "lot_no") })}</td>,
    bbDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`bbDate-${index}`} className={`w-full global-tran-td-inputclass-ui text-center ${textColorClass}`.trim()} value={toDateInputValue(row.bbDate)} readOnly={isFormDisabled || selectedAJType === "IL" || selectedAJType === "CA" || (selectedAJType === "IR" && row.operation === "S")} onChange={(e) => handleDetailChange(index, "bbDate", e.target.value, false)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("bbDate"); } }} /></td>,
    qstatCode: () => lookupCell("qstatCode", () => updateState({ selectedRowIndex: index, showQstatModal: true }), { hideIcon: !canLookupStock }),
    whouseCode: () => lookupCell("whouseCode", () => updateState({ selectedRowIndex: index, warehouseLookupOpen: true, accountModalSource: "whouseCode" }), { hideIcon: !canLookupStock }),
    locCode: () => lookupCell("locCode", () => updateState({ selectedRowIndex: index, locationLookupOpen: true, selectedWH: row.whouseCode, accountModalSource: "locCode" }), { hideIcon: !canLookupStock }),
    acctCode: () => lookupCell("acctCode", () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "invAcct" })),
    rcCode: () => lookupCell("rcCode", () => updateState({ selectedRowIndex: index, showRcModal: true, accountModalSource: "rcCode" })),
    sltypeCode: () => <td key={columnKey} className="hidden" style={style}>{textInput("sltypeCode", { readOnly: true })}</td>,
    slCode: () => lookupCell("slCode", () => updateState({ selectedRowIndex: index, showSlModal: true, accountModalSource: "slCode" })),
    qtyHand: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className={`w-full global-tran-td-inputclass-ui text-right ${textColorClass}`.trim()} value={row.qtyHand || ""} readOnly /></td>,
    categCode: () => <td key={columnKey} className="hidden" style={style}>{String(row.categCode || "")}</td>,
    oldValue: () => <td key={columnKey} className="hidden" style={style}>{String(row.oldValue || "")}</td>,
    uniqueKey: () => <td key={columnKey} className="hidden" style={style}>{String(row.uniqueKey || "")}</td>,
    operation: () => <td key={columnKey} className="hidden" style={style}>{String(row.operation || "")}</td>,
  };

  return detailColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
};

const renderFgajGlColumn = (columnKey, row, index) => {
  const columnWidth = getFgajGlFallbackWidth(columnKey);
  const style = getFgajGlCellStyle(columnKey, columnWidth);
  const focusNextGlCell = (field) => focusNextFgajGlRowInput(index, field, { rows: detailRowsGL, zeroClearFields: rmajGlEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value) });
  const modalHandlers = { acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }), slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }) };
  const textInput = (field, options = {}) => <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />;
  const lookupCell = (field, options = {}) => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full"><input type="text" id={`${field}-${index}`} className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? true} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />{!isFormDisabled && (options.alwaysShowIcon || String(row[field] || "").trim()) && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[field]} />}</div></td>;
  const amountInput = (field) => <input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChangeGL(index, field, sanitizedValue); }} onFocus={(e) => clearFgajGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })} onBlur={(e) => { if (isFormDisabled) return; handleBlurGL(index, field, e.target.value); }} onKeyDown={async (e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); await handleBlurGL(index, field, e.target.value, true); focusNextGlCell(field); }} />;
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
    slRefNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("slRefNo", { maxLength: useGetFieldLength(tblFieldArray, "slref_no") })}</td>,
    slRefDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`slRefDate-${index}`} className="w-full global-tran-td-inputclass-ui text-center" value={toDateInputValue(row.slRefDate)} readOnly={isFormDisabled} onChange={(e) => handleDetailChangeGL(index, "slRefDate", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextGlCell("slRefDate"); } }} /></td>,
    remarks: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("remarks", { maxLength: useGetFieldLength(tblFieldArray, "remarks") })}</td>,
  };
  return glColumnRenderers[columnKey]?.() ?? <td key={columnKey} className="global-tran-td-ui" style={style}>{String(row[columnKey] ?? "")}</td>;
};

return (
<>
<div className="global-tran-main-div-ui">

      {showSpinner && <LoadingSpinner />}

      <input
        ref={uploadInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleUploadExcelFile}
      />

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
        showCopyForm ={false} 
        isViewDocument={isViewDocument}  
        onDetails={() => setTopTab("details")}
        onHistory={() => setTopTab("history")}
        disableRouteNavigation={true}         
        isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)}
        isResetDisabled={state.isResetDisabled}
        isAttachDisabled={!documentID}
        isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
        isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
        isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
        detailsRoute="/page/RMAJ"
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
                <p className="global-tran-headerstat-text-ui">Transaction Status</p>
                <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>{displayStatus}</h1>
              </div>
            </div>

          </div>


    {/* Form Layout with Tabs */}
    <div className="global-tran-header-div-ui">

        {/* Tab Navigation */}
        <div className="global-tran-header-tab-div-ui">
            <button
                className={`global-tran-tab-padding-ui ${
                    activeTab === 'basic'
                    ? 'global-tran-tab-text_active-ui'
                    : 'global-tran-tab-text_inactive-ui'
                }`}
                onClick={() => updateState({ activeTab: "basic" })}
            >
                Basic Information
            </button>
            {/* Provision for Other Tabs */}
        </div>

        {/* RMAJ Header Form Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative" id="rmaj_hd">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                readOnly
                lookupDisabled={isFetchDisabled}
                onLookup={() => !isFormDisabled && uypepdateState({ branchModalOpen: true })}
              />

              <FieldRenderer
                id="rmajNo"
                label="RMAJ No."
                type="lookup"
                value={state.documentNo || ""}
                disabled={state.isDocNoDisabled}
                onChange={(val) => updateState({ documentNo: val })}
                onLookup={() => updateState({ showAllTranDocNo: true })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDocNoBlur();
                    e.preventDefault();
                    document.getElementById("rmajDate")?.focus();
                  }
                }}
              />

              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput
                    id="rmajDate"
                    className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                    value={documentDate}
                    disabled={isFormDisabled}
                    updateState={(updates) => {
                      if (updates.rmajDate !== undefined) updateState({ documentDate: updates.rmajDate });
                      else updateState(updates);
                    }}
                  />
                </div>
                <label htmlFor="rmajDate" className="global-ref-floating-label">RMAJ Date</label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="ajType"
                label="Adj Type"
                type="select"
                value={selectedAJType || ""}
                disabled={isFormDisabled || detailRows.length > 0}
                onChange={(val) => updateState({ selectedAJType: val })}
                options={ajTypes
                  .filter((type) => type?.DROPDOWN_CODE && !(type.DROPDOWN_CODE === "CA" && handleFieldBehavior("noViewCostamt")))
                  .map((type) => ({ label: type.DROPDOWN_NAME, value: type.DROPDOWN_CODE }))}
              />

              <FieldRenderer
                id="refDocNo1"
                label="Ref Doc No. 1"
                type="text"
                value={refDocNo1 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo1: val })}
                maxLength={useGetFieldLength(tblFieldArray, "refaj_no1")}
              />

              <FieldRenderer
                id="refDocNo2"
                label="Ref Doc No. 2"
                type="text"
                value={refDocNo2 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo2: val })}
                maxLength={useGetFieldLength(tblFieldArray, "refaj_no2")}
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="WHcode"
                label="Warehouse"
                type="lookup"
                required
                value={WHName || WHCode || ""}
                disabled={isFormDisabled}
                readOnly
                lookupDisabled={isFormDisabled}
                onLookup={() => !isFormDisabled && updateState({ warehouseLookupOpen: true })}
              />

              <FieldRenderer
                id="locName"
                label="Location"
                type="lookup"
                value={LocName || ""}
                disabled={isFormDisabled || WHName === ""}
                readOnly
                lookupDisabled={isFormDisabled || WHName === ""}
                onLookup={() => !isFormDisabled && WHName !== "" && updateState({ locationLookupOpen: true, selectedWH: WHCode })}
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
                  maxLength={useGetFieldLength(tblFieldArray, "remarks")}
                />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
              </div>
            </div>
          </div>
        </div>
    </div>


          {/* Item Details Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui">

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
              // onClick={() => updateState({ GLactiveTab: "invoice" })}
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
                {visibleFgajDetailColumns.map((column) => (
                  <Fragment key={`detail-header-${column.key}`}>
                    {renderFgajDetailHeader(column.label, column.key, column.width, {
                      orderedColumns: visibleFgajDetailColumns,
                    })}
                  </Fragment>
                ))}
                {!isFormDisabled && (
                  <th key="detail-actions" className="global-tran-th-ui sticky top-0 right-0 bg-blue-300 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>
                )}
              </tr>
              {renderFgajDetailHeaderContextMenu()}
            </thead>
            <tbody className="relative">
              {sortedFgajDetailRows.map(({ row, originalIndex }) => (
                <tr key={`${row.uniqueKey || row.itemCode || "row"}-${originalIndex}`} className="global-tran-tr-ui">
                  {visibleFgajDetailColumns.map((column) => renderFgajDetailColumn(column.key, row, originalIndex))}
                  {!isFormDisabled && (
                    <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                      <div className="flex items-center justify-center gap-1">
                        {handleFieldBehavior("allowInsert") && (
                          <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleGetItem(originalIndex)}>
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        )}
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
        </div>
      </div>


    <div className="global-tran-tab-footer-main-div-ui">


    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <div ref={singleUploadDropdownRef} className="relative inline-block">
        {canUseSingleUploadOptions && showSingleUploadDropdown && !isFormDisabled && (
          <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
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
                  setShowSingleUploadDropdown(false);
                  handleAddRow();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <FontAwesomeIcon icon={faFolderOpen} />
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Add Item</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      Select item details
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                onClick={() => {
                  setShowSingleUploadDropdown(false);
                  handleDownloadSingleUploadTemplate();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                    <FontAwesomeIcon icon={faDownload} />
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Download Template</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      Excel item columns
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                onClick={() => {
                  setShowSingleUploadDropdown(false);
                  handleUploadSingleTransaction();
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                    <FontAwesomeIcon icon={faUpload} />
                  </span>
                  <div className="flex flex-col items-start">
                    <span>Upload Transaction</span>
                    <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                      Import Excel file
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (canUseSingleUploadOptions) {
              setShowSingleUploadDropdown((prev) => !prev);
              return;
            }

            handleAddRow();
          }}
          className="global-tran-tab-footer-button-add-ui"
          style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
        </button>
      </div>
    </div>



    {/* Totals Section */}
    <div className="global-tran-tab-footer-total-main-div-ui">

      {/* Total Invoice Amount */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Quantity:
        </label>
        <label id="totalQuantity" className="global-tran-tab-footer-total-value-ui">
          {totals.totalQuantity}
        </label>
      </div>

      {/* Total VAT Amount */}
      { !handleFieldBehavior("noViewCostamt") && (
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Amount:
        </label>
        <label id="totalItemAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalItemAmount}
        </label>
      </div>
    )}
     
    </div>
    </div>

    </div>


    
        {/* General Ledger Button */}
        <div className="global-tran-tab-div-ui" hidden={handleFieldBehavior("hiddenBBMode")}>

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
              onClick={() => updateState({ GLactiveTab: "invoice" })}
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
                  {orderedFgajGlColumns.map((column) => (
                    <Fragment key={`gl-header-${column.key}`}>
                      {renderFgajGlHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedFgajGlColumns,
                      })}
                    </Fragment>
                  ))}
                </tr>
                {renderFgajGlHeaderContextMenu()}
              </thead>
              <tbody className="relative">
                {sortedFgajGlRows.map(({ row, originalIndex }) => (
                  <tr key={`${row.acctCode || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
                    {orderedFgajGlColumns.map((column) => renderFgajGlColumn(column.key, row, originalIndex))}
                  </tr>
                ))}
              </tbody>
            </table>
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

    </div>

        

      </div>

      

    </div>





    {branchModalOpen && (
            <BranchLookupModal 
              isOpen={branchModalOpen}
              onClose={handleCloseBranchModal}
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

    {showSignatoryModal && (
      <DocumentSignatories
        isOpen={showSignatoryModal}
        params={{noReprints,documentID,docType}}
        onClose={handleCloseSignatory}
        onCancel={() => updateState({ showSignatoryModal: false })}
      />
    )}



    {showPostingModal && (
      <PostRMAJ
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "rmajNo"}}
        onRetrieve={handleTranDocNoRetrieval}
        onResponse={{documentNo}}
        onSelected={handleTranDocNoSelection}
        onClose={() => updateState({ showAllTranDocNo: false })}
      />
    )} 



      {msLookupModalOpen && (
              <GlobalLookupModalv1
                isOpen={msLookupModalOpen}
                data={globalLookupRow}
                btnCaption="Get Selected Items"
                title="RM Location Balance"
                endpoint={globalLookupHeader}
                onClose={handleCloseMSLookup}
                onCancel={() => updateState({ msLookupModalOpen: false })}
                singleSelect={itemSingleSelect}
              />
        )}

      {itemMastLookupOpen && (
        <ItemMastLookupModal
          isOpen={itemMastLookupOpen}
          endpoint="getInvLookupRM"
          onClose={handleCloseItemMastLookup}
          onCancel={() => updateState({ itemMastLookupOpen: false, itemSingleSelect: false })}
          enableMultiSelect={!itemSingleSelect}
          docType="PRRM"
        />
      )}
        


        {warehouseLookupOpen && (
            <WarehouseLookupModal
              isOpen={warehouseLookupOpen}
              onClose={handleCloseWarehouseLookup}
              filter={"ByBC" + branchCode}
              branchCode={branchCode || ""}
              source={accountModalSource}
            invType="RM"
            />
          )}  
   
      {locationLookupOpen && (
        <LocationLookupModal
          isOpen={locationLookupOpen}
          onClose={handleCloseLocationLookup}
          source={accountModalSource}
          filter={"ByWH" + selectedWH}
          autoSelectSingle={!accountModalSource && (selectedAJType === "BB" || selectedAJType === "IG")}
        />
      )}


      {showQstatModal && (
        <QstatLookupModal
          isOpen={showQstatModal}
          onClose={handleCloseQStatLookup}
          filter="ActiveAll"
        />
      )}

      
    </div>


    <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        endpoint="/getRMAJHistory"
        cacheKey={`RMAJ:${state.branchCode || ""}:${state.docNo || ""}`}  // âœ… per-transaction
        activeTabKey="RMAJ_Summary"
        branchCode={state.branchCode}
        startDate={state.fromDate}
        endDate={state.toDate}
        status="All"
        onRowDoubleClick={handleHistoryRowPick}
        historyExportName={`${documentTitle} History`} 
    />
  </div>


</div>

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
</>
);
// End of Return



};

export default RMAJ;
