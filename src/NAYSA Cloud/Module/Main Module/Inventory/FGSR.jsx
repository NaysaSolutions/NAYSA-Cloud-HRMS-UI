import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import Swal from 'sweetalert2';
import { useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faUpload } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostFGSR from "./PostFGSR.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";


// Configuration
import { postRequest, fetchDataJson } from '../../../Configuration/BaseURL.jsx'
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
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
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
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalvalidateRequiredFields
} from '@/NAYSA Cloud/Global/behavior.jsx';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";



// Header
import Header from '@/NAYSA Cloud/Components/Header';

/*
================================================================================
FGSR TRANSACTION WORKFLOW
================================================================================
1. User prepares header values:
   - Branch
   - FGSR Date / FGSR No
   - Customer
   - Warehouse / Location
   - Ref SI No / Ref CM No

2. User adds finished goods detail rows from FG item lookup.

3. Save workflow:
   - Detail uses Qty In only.
   - Generate Entries debits FG Inventory and credits Sales Return Account.
   - Save stores header, detail and GL rows.

4. Posting workflow:
   - Posting increases FG inventory using Qty In.
   - No negative quantity logic is used.
================================================================================
*/

/* --------------------------------------------------------------------------
 * Date helpers
 * -------------------------------------------------------------------------- */
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


/* --------------------------------------------------------------------------
 * Main Component
 * -------------------------------------------------------------------------- */
const FGSR = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const detailRowsRef = useRef([]);
  const detailRowsGLRef = useRef([]);
  const singleUploadDropdownRef = useRef(null);
  const uploadInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation(); 
  const { companyInfo, currentUserRow, getAllDropDown, refsLoaded, getAllTopHSDocRow } = useAuth();
  const decQty = companyInfo?.itemDecqtyFG ?? companyInfo?.itemDecqtyMS ?? 2;
  const decUcost = companyInfo?.itemDecUcostFG ?? companyInfo?.itemDecUcostMS ?? 6;

  const isViewDocumentUrl = new URLSearchParams(location.search).get("viewDocument") === "true";



  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const [showSingleUploadDropdown, setShowSingleUploadDropdown] = useState(false);
  const [pendingHeaderLocationWH, setPendingHeaderLocationWH] = useState("");
  const { user } = useAuth();
  const { resetFlag } = useReset();
  const docType = docTypes.FGSR;
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc?.docName + " Transaction";
  /* ------------------------------------------------------------------------
   * Main transaction state
   * ------------------------------------------------------------------------ */
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
    custCode: "",
    custName: "",
    refSiNo: "",
    refCmNo: "",
    arcmId: "",
    siId: "",
    remarks: "",
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
    showCustomerModal:false,
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
  custCode,
  custName,
  refSiNo,
  refCmNo,
  arcmId,
  siId,
  remarks,
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
  showCustomerModal,
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
  const fgsrGlColumnOrderKeyRef = useRef("");

  useEffect(() => {
    if (!showSingleUploadDropdown) return;

    const handleClickOutside = (event) => {
      if (singleUploadDropdownRef.current?.contains(event.target)) return;
      setShowSingleUploadDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSingleUploadDropdown]);


  /* ------------------------------------------------------------------------
   * Status and upload availability
   * ------------------------------------------------------------------------ */
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
  // FGSR uses the same compact add menu as FGAJ, but without an adjustment-type gate.
  const canUseSingleUploadOptions = true;

  //Variables


  const [totals, setTotals] = useState({
  totalQtyIn: '0.00',
  totalItemAmount: '0.00',
  });

  const customParamMap = {
        invAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;
  


  const updateTotalsDisplay = (qtyIn, amount) => {
    setTotals({
          totalQtyIn: formatNumber(qtyIn,decQty),
          totalItemAmount: formatNumber(amount),
      });
  };



  useEffect(() => {
    const nextTotals = getGLTotalsState(detailRowsGL);

    setState((prev) => {
      const hasSameTotals =
        prev.totalDebit === nextTotals.totalDebit &&
        prev.totalCredit === nextTotals.totalCredit &&
        prev.totalDebitFx1 === nextTotals.totalDebitFx1 &&
        prev.totalCreditFx1 === nextTotals.totalCreditFx1 &&
        prev.totalDebitFx2 === nextTotals.totalDebitFx2 &&
        prev.totalCreditFx2 === nextTotals.totalCreditFx2;

      return hasSameTotals ? prev : { ...prev, ...nextTotals };
    });
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




/* --------------------------------------------------------------------------
 * Reset and initial loading
 * -------------------------------------------------------------------------- */
const handleReset = () => {
      clearFgsrDetailSorting();
      clearFgsrGlSorting();

      updateState({
        
      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),

      custCode: "",
      custName: "",
      refSiNo: "",
      refCmNo:"",
      arcmId: "",
      siId: "",
      remarks:"",
      noReprints:"0",   
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL:[],
      documentStatus:"",
      itemSingleSelect:false,
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
     const tbls = 'fgsr_hd,fgsr_dt1,fgsr_dt2'
     const hdtblcol_result = await useFieldLenghtCheck(tbls);
     if (hdtblcol_result){
       updateState({tblFieldArray :hdtblcol_result })
     }


    } catch (err) {
      console.error("Error fetching data:", err);
    }
     updateState({isLoading:false})
  };



  



/* --------------------------------------------------------------------------
 * Fetch existing transaction
 * -------------------------------------------------------------------------- */
const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"fgsrNo",direction);
    if (!data?.fgsrId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      qtyIn: formatNumber(item.qtyIn,decQty),
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
      documentStatus: data.fgsrStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.fgsrId,
      documentNo: data.fgsrNo,
      branchCode: data.branchCode,
      WHCode:data.whCode,
      WHName:data.whName,
      LocCode:data.locCode,
      LocName:data.locName,
      documentDate: useformatToDatev2(data.fgsrDate),
      custCode: data.custCode || "",
      custName: data.custName || "",
      refSiNo: data.refSiNo,
      refCmNo: data.refCmNo,
      arcmId: data.arcmId || "",
      siId: data.siId || "",
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


/* --------------------------------------------------------------------------
 * Main transaction actions
 * - GenerateGL: builds accounting entries
 * - Upsert: validates/saves transaction
 * -------------------------------------------------------------------------- */
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
      custCode,
      custName,
      refSiNo,
      refCmNo,
      arcmId,
      siId,
      remarks,
      userCode,
      detailRows,
      detailRowsGL,
    } = state;

    let finalDetailRowsGL = [...detailRowsGL];

    const buildGlData = (glRows) => ({
      branchCode,
      fgsrNo: documentNo || "",
      fgsrId: documentID || "",
      fgsrDate: documentDate,
      custCode: custCode || "",
      custName: custName || "",
      refSiNo,
      refCmNo,
      arcmId: arcmId || "",
      siId: siId || "",
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
        qtyIn: parseFormattedNumber(row.qtyIn || 0),
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
      const fieldsToCheck = {
        "Header : Branch Code": branchCode,
        "Header : FGSR Date": documentDate,
        "Header : Customer Code": custCode,
        "Header : Warehouse": WHCode,
        "Header : Location": LocCode,
      };
      const headerIsValid = await useSwalvalidateRequiredFields(fieldsToCheck, "FG Sales Return");
      if (!headerIsValid) return;

      if (!detailRows || detailRows.length === 0) {
        useSwalErrorAlert("No Item Detail", "Please add at least one finished goods item.");
        return;
      }

      const invalidDetail = detailRows.find((row) => {
        const qtyIn = parseFormattedNumber(row.qtyIn || 0) || 0;
        return !String(row.itemCode || "").trim() || qtyIn <= 0;
      });

      if (invalidDetail) {
        useSwalErrorAlert("Invalid Item Detail", "Item Code and Qty In greater than zero are required.");
        return;
      }

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
        "fgsrId",
        "fgsrNo"
      );

      if (response) {
        const responseDocNo = response.data?.[0]?.fgsrNo || "";
        const responseDocId = response.data?.[0]?.fgsrId || "";

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
        documentNo: response?.data?.[0]?.fgsrNo || "",
        documentID: response?.data?.[0]?.fgsrId || "",
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





/* --------------------------------------------------------------------------
 * Detail row helpers and item add/delete actions
 * -------------------------------------------------------------------------- */
const createEmptyDetailRow = () => ({
  lnNo: "",
  itemCode: "",
  itemName: "",
  categCode: "",
  oldValue: "",
  qtyIn: formatNumber(0, decQty),
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
      "Header : Location": LocCode,
    };
    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
    if (!isValid) return;

    updateState({
      itemSingleSelect: false,
      itemMastLookupOpen: true,
    });
  };




  const handleAddItem = async (index) => {
    updateState({
      selectedRowIndex: index,
      itemSingleSelect: true,
      itemMastLookupOpen: true,
    });
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





/* --------------------------------------------------------------------------
 * UI behavior rules based on adjustment type and user access
 * -------------------------------------------------------------------------- */
const handleFieldBehavior = (option) => {
  switch (option) {
    case "noViewCostamt":
      return currentUserRow?.viewCostamt === "N";
    case "hiddenBBMode":
      return currentUserRow?.viewCostamt === "N";
    case "allowInsert":
      return true;
    case "hiddenCAMode":
      return false;
    default:
      return false;
  }
};



const handleColumnLabel = (columnName) => {
  switch (columnName) {
    case "UnitCost":
      return "Unit Cost";
    default:
      return "";
  }
};
  






  useEffect(() => {
    detailRowsRef.current = detailRows || [];
    detailRowsGLRef.current = detailRowsGL || [];
  }, [detailRows, detailRowsGL]);

  /* ------------------------------------------------------------------------
   * Item detail table columns
   * ------------------------------------------------------------------------ */
  const fgsrDetailColumnDefs = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Name", width: 260 },
    { key: "uomCode", label: "UOM", width: 90 },
    { key: "qtyIn", label: "Quantity", width: 120 },
    { key: "unitCost", label: "Unit Cost", width: 130 },
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
  ], []);

  const {
    getColumnStyle: getFgsrDetailColumnStyle,
    getFrozenColumnStyle: getFgsrDetailFrozenStyle,
    getOrderedColumns: getOrderedFgsrDetailColumns,
    getSortedRows: getSortedFgsrDetailRows,
    clearAllSorting: clearFgsrDetailSorting,
    clearZeroValueOnFocus: clearFgsrDetailZeroOnFocus,
    focusNextRowInput: focusNextFgsrDetailRowInput,
    renderHeaderContextMenu: renderFgsrDetailHeaderContextMenu,
    renderResizableHeader: renderFgsrDetailHeader,
  } = useResizableTableColumns(fgsrDetailColumnDefs);

  const orderedFgsrDetailColumns = getOrderedFgsrDetailColumns(fgsrDetailColumnDefs);
  const hideCostAmount = handleFieldBehavior("noViewCostamt");
  const visibleFgsrDetailColumns = useMemo(() => (
    orderedFgsrDetailColumns.filter((column) => {
      if (["categCode", "oldValue", "uniqueKey", "operation", "sltypeCode", "acctCode", "rcCode", "slCode", "qtyHand"].includes(column.key)) return false;
      if (column.key === "unitCost") return !hideCostAmount;
      if (column.key === "itemAmount") return !hideCostAmount;
      return true;
    })
  ), [orderedFgsrDetailColumns, hideCostAmount]);
  const getFgsrDetailFallbackWidth = (key) => fgsrDetailColumnDefs.find((column) => column.key === key)?.width || 120;
  const getFgsrDetailCellStyle = (key, fallbackWidth) => ({
    ...getFgsrDetailColumnStyle(key, fallbackWidth),
    ...getFgsrDetailFrozenStyle(key, visibleFgsrDetailColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedFgsrDetailRows = getSortedFgsrDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  // Step 1: Download the current item-detail columns as Excel template.
  const handleDownloadSingleUploadTemplate = async () => {
    const templateColumns = visibleFgsrDetailColumns.filter((column) => column.key !== "qtyHand");
    const headers = templateColumns.map((column) => column.label);
    const decimalColumnFormats = {
      qtyIn: decQty,
      unitCost: decUcost,
      itemAmount: 2,
    };
    const getExcelDecimalFormat = (decimalPlaces) =>
      `#,##0${decimalPlaces > 0 ? "." + "0".repeat(decimalPlaces) : ""}`;
    const toExcelDate = (value) => {
      const normalizedDate = toDateInputValue(value);
      if (!normalizedDate) return "";
      const [year, month, day] = normalizedDate.split("-").map(Number);
      return new Date(year, month - 1, day);
    };
    const rows = sortedFgsrDetailRows.map(({ row, originalIndex }) =>
      templateColumns.map((column) => {
        switch (column.key) {
          case "ln":
            return originalIndex + 1;
          case "qtyIn":
            return parseFormattedNumber(row.qtyIn || 0);
          case "unitCost":
            return parseFormattedNumber(row.unitCost || 0);
          case "itemAmount":
            return parseFormattedNumber(row.itemAmount || 0);
          case "bbDate":
            return toExcelDate(row.bbDate);
          default:
            return String(row[column.key] ?? "");
        }
      })
    );

    const rightAlignedColumns = new Set(["qtyIn", "unitCost", "itemAmount"]);
    const centerAlignedColumns = new Set([
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
    ]);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Item Details");

    worksheet.columns = templateColumns.map((column) => ({
      header: column.label,
      key: column.key,
      width: Math.max(12, Math.ceil((column.width || 120) / 8)),
    }));

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    rows.forEach((rowValues) => {
      const excelRow = worksheet.addRow(rowValues);
      templateColumns.forEach((column, index) => {
        const cell = excelRow.getCell(index + 1);
        if (decimalColumnFormats[column.key] !== undefined) {
          cell.numFmt = getExcelDecimalFormat(decimalColumnFormats[column.key]);
        } else if (column.key === "bbDate") {
          cell.numFmt = "mm/dd/yyyy";
        } else if (column.key !== "ln") {
          cell.numFmt = "@";
        }
        cell.alignment = {
          horizontal: rightAlignedColumns.has(column.key)
            ? "right"
            : centerAlignedColumns.has(column.key)
              ? "center"
              : "left",
          vertical: "middle",
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "FG Sales Return Single Transaction Uploading Template.xlsx"
    );
  };

  /* ------------------------------------------------------------------------
   * Single transaction upload/download workflow
   * ------------------------------------------------------------------------ */
  const getSingleUploadTemplateColumns = () =>
    visibleFgsrDetailColumns.filter((column) => column.key !== "qtyHand");

  const normalizeExcelHeader = (value) => String(value ?? "").trim();
  const normalizeHeaderForCompare = (value) => normalizeExcelHeader(value).replace(/\s+/g, " ").toUpperCase();

  const getExcelCellValue = (cell) => {
    const value = cell?.value;
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return toDateInputValue(value);
    if (typeof value === "object") {
      if (value.text !== undefined) return String(value.text ?? "").trim();
      if (value.result !== undefined) return String(value.result ?? "").trim();
      if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").trim();
      if (value.hyperlink !== undefined && value.text !== undefined) return String(value.text ?? "").trim();
    }
    return String(value ?? "").trim();
  };

  const toExcelUploadDate = (value) => {
    if (!value) return "";
    if (value instanceof Date) return toDateInputValue(value);

    // Excel stores dates as serial numbers when the cell is not read as a Date object.
    // Example: 46167 = 05/24/2026. Convert it before sending to SQL.
    if (typeof value === "number" && Number.isFinite(value)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const utcDate = new Date(excelEpoch.getTime() + Math.floor(value) * 86400000);
      return utcDate.toISOString().slice(0, 10);
    }

    const rawText = String(value || "").trim();
    if (/^\d+(\.\d+)?$/.test(rawText)) {
      const serialValue = Number(rawText);
      if (serialValue > 25000 && serialValue < 90000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const utcDate = new Date(excelEpoch.getTime() + Math.floor(serialValue) * 86400000);
        return utcDate.toISOString().slice(0, 10);
      }
    }

    const normalized = toDateInputValue(value);
    return normalized || rawText;
  };

  const safeJsonParse = (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };

  const extractSprocJsonResult = (response) => {
    const unwrap = (value, depth = 0) => {
      if (depth > 8 || value === null || value === undefined) return null;

      const parsedValue = safeJsonParse(value);
      if (parsedValue !== value) return unwrap(parsedValue, depth + 1);

      if (Array.isArray(value)) {
        if (value.length === 0) return null;
        return unwrap(value[0], depth + 1);
      }

      if (typeof value !== "object") return null;

      if (value.rows !== undefined || value.errors !== undefined || value.errorCount !== undefined) {
        return value;
      }

      if (value.result !== undefined) return unwrap(value.result, depth + 1);
      if (value.Result !== undefined) return unwrap(value.Result, depth + 1);
      if (value.data !== undefined) return unwrap(value.data, depth + 1);
      if (value.Data !== undefined) return unwrap(value.Data, depth + 1);
      if (value.payload !== undefined) return unwrap(value.payload, depth + 1);

      return null;
    };

    const result = unwrap(response);
    if (!result) {
      console.error("Unable to read upload validation response:", response);
    }
    return result;
  };

  const showUploadErrorList = (title, errors) => {
    const list = Array.isArray(errors) ? errors : [errors].filter(Boolean);
    Swal.fire({
      icon: "error",
      title,
      html: `<div style="text-align:left;max-height:420px;overflow:auto;white-space:pre-wrap;">${list
        .map((err) => String(err || ""))
        .join("<br/>")}</div>`,
      width: 760,
    });
  };

  const validateSingleUploadHeaders = (worksheet, templateColumns) => {
    const expectedHeaders = templateColumns.map((column) => column.label);
    const headerRow = worksheet.getRow(1);
    const actualHeaders = expectedHeaders.map((_, index) => getExcelCellValue(headerRow.getCell(index + 1)));

    const extraHeaderValues = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      if (columnNumber > expectedHeaders.length && getExcelCellValue(cell)) {
        extraHeaderValues.push(`Column ${columnNumber}: "${getExcelCellValue(cell)}"`);
      }
    });

    const errors = [];
    if (extraHeaderValues.length > 0) {
      errors.push(`Excel has extra column(s): ${extraHeaderValues.join(", ")}`);
    }

    expectedHeaders.forEach((expectedHeader, index) => {
      const actualHeader = actualHeaders[index];
      if (normalizeHeaderForCompare(actualHeader) !== normalizeHeaderForCompare(expectedHeader)) {
        errors.push(`Column ${index + 1} expected "${expectedHeader}" but found "${actualHeader || "blank"}".`);
      }
    });

    return errors;
  };

  const parseSingleUploadRows = (worksheet, templateColumns) => {
    const rows = [];

    worksheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = createEmptyDetailRow();
      let hasValue = false;

      templateColumns.forEach((column, columnIndex) => {
        const rawValue = getExcelCellValue(excelRow.getCell(columnIndex + 1));
        if (String(rawValue || "").trim() !== "") hasValue = true;

        switch (column.key) {
          case "ln":
            break;
          case "qtyIn":
          case "unitCost":
          case "itemAmount":
            rowData[column.key] = parseFormattedNumber(rawValue || 0) || 0;
            break;
          case "bbDate":
            rowData.bbDate = toExcelUploadDate(excelRow.getCell(columnIndex + 1)?.value || rawValue);
            break;
          default:
            rowData[column.key] = String(rawValue ?? "").trim();
            break;
        }
      });

      if (!hasValue) return;

      const qtyIn = parseFormattedNumber(rowData.qtyIn || 0) || 0;
      const unitCost = parseFormattedNumber(rowData.unitCost || 0) || 0;
      rowData.lnNo = rows.length + 1;
      rowData.qtyIn = qtyIn;
      rowData.unitCost = unitCost;
      rowData.itemAmount = +(qtyIn * unitCost).toFixed(2);
      rowData.whouseCode = rowData.whouseCode || WHCode || "";
      rowData.locCode = rowData.locCode || LocCode || "";
      rowData.operation = "A";
      rowData.qtyHand = 0;
      rowData.uniqueKey = "";

      rows.push(rowData);
    });

    return rows;
  };

  // Step 2: Build the server validation payload.
  const buildUploadValidationPayload = (rows) => ({
    json_data: {
      branchCode,
      fgsrDate: documentDate,
      tranType: "FGSR",
      whCode: WHCode || "",
      locCode: LocCode || "",
      userCode,
      dt1: rows.map((row, index) => ({
        lnNo: index + 1,
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        categCode: row.categCode || "",
        qtyIn: parseFormattedNumber(row.qtyIn || 0) || 0,
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

  // Step 4: Read Excel, validate template, validate master data, then load rows.
  const handleUploadExcelFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      showUploadErrorList("Invalid File", ["Please upload an Excel .xlsx file generated from the latest template."]);
      return;
    }

    const fieldsToCheck = {
      "Header : Warehouse": WHCode,
    };
    const isValid = await useSwalvalidateRequiredFields(fieldsToCheck, "Upload Transaction");
    if (!isValid) return;

    updateState({ isLoading: true, showSpinner: true });

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets?.[0];

      if (!worksheet) {
        showUploadErrorList("Invalid Excel File", ["No worksheet found in the uploaded file."]);
        return;
      }

      const templateColumns = getSingleUploadTemplateColumns();
      const headerErrors = validateSingleUploadHeaders(worksheet, templateColumns);
      if (headerErrors.length > 0) {
        showUploadErrorList("Not the Same Format", [
          "Please download the latest template and upload again.",
          "",
          ...headerErrors,
        ]);
        return;
      }

      const uploadedRows = parseSingleUploadRows(worksheet, templateColumns);
      if (uploadedRows.length === 0) {
        showUploadErrorList("No Records Found", ["The uploaded Excel file has no detail rows."]);
        return;
      }

      const response = await postRequest("validateFGSRUpload", buildUploadValidationPayload(uploadedRows));
      const result = extractSprocJsonResult(response);
      const errorRows = result?.errors || [];
      const validRows = result?.rows || [];

      if (!result) {
        showUploadErrorList("Upload Validation Error", ["Unable to read validation response from the server."]);
        return;
      }

      if (Number(result.errorCount || 0) > 0 || errorRows.length > 0) {
        showUploadErrorList("Upload Rejected", errorRows.map((row) => row.errorMsg || row.message || JSON.stringify(row)));
        return;
      }

      if (validRows.length === 0) {
        showUploadErrorList("Upload Validation Error", [
          "The server returned no validated rows.",
          "Please check the Laravel validateFGSRUpload response and the SQL ValidateUpload block.",
          "Uploaded rows read from Excel: " + uploadedRows.length,
        ]);
        console.error("ValidateUpload returned zero rows:", { response, result, uploadedRows });
        return;
      }

      const finalRows = validRows.map((row, index) => ({
        lnNo: index + 1,
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        categCode: row.categCode || "",
        oldValue: row.oldValue || row.itemCode || "",
        qtyIn: formatNumber(parseFormattedNumber(row.qtyIn || 0), decQty),
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
      showUploadErrorList("Upload Error", [error?.message || "Unable to process the uploaded Excel file."]);
    } finally {
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  // Opens the hidden file input when user clicks Upload Transaction.
  const handleUploadSingleTransaction = () => {
    uploadInputRef.current?.click();
  };

  /* ------------------------------------------------------------------------
   * General ledger table columns
   * ------------------------------------------------------------------------ */
  const fgsrGlColumnDefs = useMemo(() => [
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
  ], [withCurr2, withCurr3, glCurrDefault, currCode, glCurrGlobal2, glCurrGlobal3]);
  const {
    getColumnStyle: getFgsrGlColumnStyle,
    getFrozenColumnStyle: getFgsrGlFrozenStyle,
    getOrderedColumns: getOrderedFgsrGlColumns,
    getSortedRows: getSortedFgsrGlRows,
    setColumnOrder: setFgsrGlColumnOrder,
    clearAllSorting: clearFgsrGlSorting,
    clearZeroValueOnFocus: clearFgsrGlZeroOnFocus,
    focusNextRowInput: focusNextFgsrGlRowInput,
    renderHeaderContextMenu: renderFgsrGlHeaderContextMenu,
    renderResizableHeader: renderFgsrGlHeader,
  } = useResizableTableColumns(fgsrGlColumnDefs);
  const orderedFgsrGlColumns = getOrderedFgsrGlColumns(fgsrGlColumnDefs);
  const getFgsrGlFallbackWidth = (key) => fgsrGlColumnDefs.find((column) => column.key === key)?.width || 120;
  const getFgsrGlCellStyle = (key, fallbackWidth) => ({
    ...getFgsrGlColumnStyle(key, fallbackWidth),
    ...getFgsrGlFrozenStyle(key, orderedFgsrGlColumns, fallbackWidth, { isHeader: false }),
  });
  useEffect(() => {
    const nextColumnOrder = fgsrGlColumnDefs.map((column) => column.key);
    const nextColumnOrderKey = nextColumnOrder.join("|");

    if (fgsrGlColumnOrderKeyRef.current === nextColumnOrderKey) return;

    fgsrGlColumnOrderKeyRef.current = nextColumnOrderKey;
    setFgsrGlColumnOrder(nextColumnOrder);
  }, [fgsrGlColumnDefs, setFgsrGlColumnOrder]);
  const sortedFgsrGlRows = getSortedFgsrGlRows(
    detailRowsGL.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const fgsrDetailEnterNextRowZeroClearFields = ["qtyIn", "unitCost"];
  const fgsrGlEnterNextRowZeroClearFields = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"];

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






/* --------------------------------------------------------------------------
 * View document and transaction history retrieval
 * -------------------------------------------------------------------------- */


//  ** View Document and Transaction History Retrieval ***
const cleanUrl = useCallback(() => {
  window.history.replaceState({}, "", window.location.origin);
}, []);




const handleHistoryRowPick = useCallback(
  async (selectedRow) => {
    const row = selectedRow?.row || selectedRow?.data || selectedRow || {};
    const selectedDocNo =  row?.docNo ?? "";
    const selectedBranchCode =row?.branchCode ?? "";

    if (!selectedDocNo || !selectedBranchCode) {
      console.warn("FGSR history row does not contain document/branch keys:", row);
      return;
    }

    await fetchTranData(selectedDocNo, selectedBranchCode);
    setTopTab("details");
    cleanUrl();
  },
  [fetchTranData, cleanUrl, branchCode]
);





useEffect(() => {
  const params = new URLSearchParams(location.search);
  const docNo = params.get("fgsrNo");
  const branchCode = params.get("branchCode");

  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    (async () => {
      await fetchTranData(docNo, branchCode);
      setTopTab("details");
      cleanUrl();
    })();
  }
}, [location.search]);




  const printData = {
    fgsr_no: documentNo,
    branch: branchCode,
    doc_id: docType
  };

 

  /* --------------------------------------------------------------------------
 * Totals computation
 * -------------------------------------------------------------------------- */
const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalQtyIn = 0;
  let totalItemAmount = 0;

  rows.forEach(row => {
    const itemQtyIn = parseFormattedNumber(row.qtyIn || 0) || 0;
    const item_ItemAmount = parseFormattedNumber(row.itemAmount || 0) || 0;

    totalQtyIn+= itemQtyIn;
    totalItemAmount+= item_ItemAmount;
  });
    updateTotalsDisplay (totalQtyIn,totalItemAmount);
};




/* --------------------------------------------------------------------------
 * Detail row editing
 * Recalculates amount, clears GL, and optionally copies values to blank rows.
 * -------------------------------------------------------------------------- */
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
    const origQtyIn = parseFormattedNumber(row.qtyIn) || 0;
    const origUnitCost = parseFormattedNumber(row.unitCost) || 0;

    const recalcRow = async () => {
      const processedQty = Math.abs(origQtyIn);
      const calculatedAmount = +(processedQty * origUnitCost).toFixed(2);

      row.itemAmount = formatNumber(calculatedAmount);
      row.qtyIn = formatNumber(processedQty, decQty);
      row.unitCost = formatNumber(origUnitCost, decUcost);
    };

    if (field === 'qtyIn' || field === 'unitCost') {
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



/* --------------------------------------------------------------------------
 * GL row editing
 * -------------------------------------------------------------------------- */
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












/* --------------------------------------------------------------------------
 * Modal close handlers
 * -------------------------------------------------------------------------- */
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
    if (selectedSl && accountModalSource === "customer") {
      updateState({
        custCode: selectedSl.slCode || selectedSl.custCode || selectedSl.customerCode || "",
        custName: selectedSl.slName || selectedSl.slDesc || selectedSl.custName || selectedSl.customerName || "",
        showSlModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
      return;
    }

    if (selectedSl && selectedRowIndex !== null) {
      const updateFn = accountModalSource !== null ? handleDetailChange : handleDetailChangeGL;
      updateFn(selectedRowIndex, 'slCode', selectedSl, false);
    }

    updateState({
      showSlModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
};

const handleCloseCustomerModal = (selectedCustomer) => {
  if (selectedCustomer) {
    updateState({
      custCode: selectedCustomer.custCode || selectedCustomer.customerCode || selectedCustomer.slCode || "",
      custName: selectedCustomer.custName || selectedCustomer.customerName || selectedCustomer.slName || "",
    });
  }
  updateState({ showCustomerModal: false });
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
  const isHeaderBBIGWarehouse = row && !accountModalSource;

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
    if (!accountModalSource && hasDetails) {
      
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
      if (!accountModalSource && hasDetails) {
        
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




  
  /* ------------------------------------------------------------------------
   * Inventory lookup handlers
   * ------------------------------------------------------------------------ */
  const handleOpenFGLookup = async (itemSingleSelect) => {
    try {

      
      updateState({ isLoading: true,
                    itemSingleSelect : itemSingleSelect });
  
      const endpoint ="getInvLookupFG"
      const response = await fetchDataJson(endpoint, { userCode, whouseCode :WHCode || "", locCode: LocCode || "", docType:"FGSR" ,tranType: "FGSR" });
      const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
  

      const colConfig = await useSelectedHSColConfig("AllMastItemLookup");


     if (custData.length === 0) {
        useSwalInfoAlert("FG Master Data","No records found")
         updateState({ isLoading: false });
        return; 
      }
  
      updateState({ globalLookupRow: custData,
                    globalLookupHeader:colConfig,
                    msLookupModalOpen: true,
                    isLoading: false
        });
  

    } catch (error) {
      useSwalErrorAlert("FG Master Data","No records found")
      updateState({ 
          globalLookupRow: [] ,
          globalLookupHeader: [],
          isLoading: false  });
    }
  };
  
  











const mapFgItemToDetailRow = (item, existingRow = {}) => {
  const rawQtyIn = parseFormattedNumber(existingRow.qtyIn ?? 0) || 0;
  const rawUnitCost = parseFormattedNumber(item?.unitCost ?? item?.ucost ?? item?.cost ?? existingRow.unitCost ?? 0) || 0;
  const finalQtyIn = Math.abs(rawQtyIn);

  return {
    ...createEmptyDetailRow(),
    ...existingRow,
    itemCode: item?.itemCode ?? item?.fgCode ?? existingRow.itemCode ?? "",
    oldValue: item?.itemCode ?? item?.fgCode ?? existingRow.oldValue ?? "",
    itemName: item?.itemName ?? item?.fgName ?? existingRow.itemName ?? "",
    categCode: item?.categCode ?? existingRow.categCode ?? "",
    uomCode: item?.uomCode ?? existingRow.uomCode ?? "",
    qtyIn: formatNumber(finalQtyIn, decQty),
    unitCost: formatNumber(rawUnitCost, decUcost),
    itemAmount: formatNumber(finalQtyIn * rawUnitCost, 2),
    lotNo: item?.lotNo ?? existingRow.lotNo ?? "",
    bbDate: item?.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : existingRow.bbDate ?? "",
    qstatCode: item?.qstatCode ?? existingRow.qstatCode ?? "",
    qtyHand: formatNumber(parseFormattedNumber(item?.qtyHand ?? existingRow.qtyHand ?? 0), decQty),
    whouseCode: existingRow.whouseCode || WHCode || item?.whouseCode || "",
    locCode: existingRow.locCode || LocCode || item?.locCode || "",
    acctCode: "",
    rcCode: "",
    sltypeCode: "",
    slCode: "",
    uniqueKey: "",
    operation: "A",
  };
};

const handleCloseFGLookup = (selectedItems) => {
  if (!selectedItems) return;

  const itemsArray = Array.isArray(selectedItems.records)
    ? selectedItems.records
    : selectedItems.records
      ? [selectedItems.records]
      : Array.isArray(selectedItems)
        ? selectedItems
        : [selectedItems];

  if (itemsArray.length === 0) return;

  const newRows = itemsArray.map((item) => mapFgItemToDetailRow(item));

  setState((prev) => {
    const updated = [...(prev.detailRows || []), ...newRows];
    updateTotals(updated);
    return {
      ...prev,
      detailRows: updated,
      detailRowsGL: [],
      itemSingleSelect: false,
      msLookupModalOpen: false,
    };
  });
};

const handleCloseItemMastLookup = (selectedItems) => {
  if (!selectedItems) {
    updateState({ itemMastLookupOpen: false, itemSingleSelect: false });
    return;
  }

  const itemsArray = Array.isArray(selectedItems.records)
    ? selectedItems.records
    : selectedItems.records
      ? [selectedItems.records]
      : Array.isArray(selectedItems)
        ? selectedItems
        : [selectedItems];

  if (itemSingleSelect) {
    if (itemsArray.length > 0 && selectedRowIndex !== null) {
      const updatedRows = [...(detailRowsRef.current || [])];
      updatedRows[selectedRowIndex] = mapFgItemToDetailRow(itemsArray[0], updatedRows[selectedRowIndex] || {});
      updateState({
        detailRows: updatedRows,
        detailRowsGL: [],
        itemMastLookupOpen: false,
        itemSingleSelect: false,
        selectedRowIndex: null,
      });
      updateTotals(updatedRows);
      return;
    }

    updateState({
      itemMastLookupOpen: false,
      itemSingleSelect: false,
      selectedRowIndex: null,
    });
    return;
  }

  const newRows = itemsArray.map((item) => mapFgItemToDetailRow(item));
  const updatedRows = [...(detailRowsRef.current || []), ...newRows];
  updateState({ detailRows: updatedRows, detailRowsGL: [], itemMastLookupOpen: false });
  updateTotals(updatedRows);
};




/* --------------------------------------------------------------------------
 * Render item detail table cell by column key
 * -------------------------------------------------------------------------- */
const renderFgsrDetailColumn = (columnKey, row, index) => {
  const columnWidth = getFgsrDetailFallbackWidth(columnKey);
  const style = getFgsrDetailCellStyle(columnKey, columnWidth);
  const isNegative = parseFormattedNumber(row.qtyIn) < 0;
  const textColorClass = isNegative ? "text-red-600" : "";
  const canLookupStock = !isFormDisabled;

  const focusNextDetailCell = (field) => {
    focusNextFgsrDetailRowInput(index, field, {
      rows: detailRows,
      zeroClearFields: fgsrDetailEnterNextRowZeroClearFields,
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
      <input type="text" id={`${field}-${index}`} className={`w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 ${textColorClass}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(options.allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, ""); if (pattern.test(sanitizedValue) || sanitizedValue === "") handleDetailChange(index, field, sanitizedValue, false); }} onFocus={(e) => clearFgsrDetailZeroOnFocus(e, { isEditable: !(options.readOnly ?? isFormDisabled), onClear: (value) => handleDetailChange(index, field, value, false) })} onBlur={async (e) => { if (options.readOnly ?? isFormDisabled) return; const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, field, num, true); setFocusedCell(null); }} onKeyDown={async (e) => { if (e.key !== "Enter" || (options.readOnly ?? isFormDisabled)) return; e.preventDefault(); const num = parseFormattedNumber(e.target.value); if (!isNaN(num)) await handleDetailChange(index, field, num, true); focusNextFgsrDetailRowInput(index, field, { rows: detailRows, zeroClearFields: fgsrDetailEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChange(nextIndex, nextField, value, false) }); }} />
    );
  };

  const detailColumnRenderers = {
    ln: () => <td key={columnKey} className={`global-tran-td-ui text-center ${textColorClass}`} style={style}>{index + 1}</td>,
    itemCode: () => lookupCell("itemCode", () => handleAddItem(index)),
    itemName: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("itemName", { readOnly: true })}</td>,
    uomCode: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("uomCode", { readOnly: true, className: "text-center" })}</td>,
    qtyIn: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("qtyIn", { decimals: decQty })}</td>,
    unitCost: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{amountInput("unitCost", { decimals: decUcost, readOnly: isFormDisabled })}</td>,
    itemAmount: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="text" className={`w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 ${textColorClass}`.trim()} value={formatNumber(parseFormattedNumber(row.itemAmount)) || ""} readOnly /></td>,
    lotNo: () => <td key={columnKey} className="global-tran-td-ui" style={style}>{textInput("lotNo", { readOnly: isFormDisabled, maxLength: useGetFieldLength(tblFieldArray, "lot_no") })}</td>,
    bbDate: () => <td key={columnKey} className="global-tran-td-ui" style={style}><input type="date" id={`bbDate-${index}`} className={`w-full global-tran-td-inputclass-ui text-center ${textColorClass}`.trim()} value={toDateInputValue(row.bbDate)} readOnly={isFormDisabled} onChange={(e) => handleDetailChange(index, "bbDate", e.target.value, false)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextDetailCell("bbDate"); } }} /></td>,
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

/* --------------------------------------------------------------------------
 * Render GL table cell by column key
 * -------------------------------------------------------------------------- */
const renderFgsrGlColumn = (columnKey, row, index) => {
  const columnWidth = getFgsrGlFallbackWidth(columnKey);
  const style = getFgsrGlCellStyle(columnKey, columnWidth);
  const focusNextGlCell = (field) => focusNextFgsrGlRowInput(index, field, { rows: detailRowsGL, zeroClearFields: fgsrGlEnterNextRowZeroClearFields, parseValue: parseFormattedNumber, onClearNextValue: (nextIndex, nextField, value) => handleDetailChangeGL(nextIndex, nextField, value) });
  const modalHandlers = { acctCode: () => updateState({ selectedRowIndex: index, showAccountModal: true, accountModalSource: "acctCode" }), rcCode: () => updateState({ selectedRowIndex: index, showRcModal: true }), slCode: () => updateState({ selectedRowIndex: index, showSlModal: true }) };
  const textInput = (field, options = {}) => <input type="text" id={`${field}-${index}`} className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? isFormDisabled} maxLength={options.maxLength} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || options.readOnly || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />;
  const lookupCell = (field, options = {}) => <td key={columnKey} className="global-tran-td-ui" style={style}><div className="relative w-full"><input type="text" id={`${field}-${index}`} className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${options.className || ""}`.trim()} value={row[field] || ""} readOnly={options.readOnly ?? true} onChange={(e) => handleDetailChangeGL(index, field, e.target.value)} onKeyDown={(e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); focusNextGlCell(field); }} />{!isFormDisabled && (options.alwaysShowIcon || String(row[field] || "").trim()) && <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900" onClick={modalHandlers[field]} />}</div></td>;
  const amountInput = (field) => <input type="text" id={`${field}-${index}`} className="w-full global-tran-td-inputclass-ui text-right" value={row[field] || ""} readOnly={isFormDisabled} onChange={(e) => { const sanitizedValue = e.target.value.replace(/[^0-9.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") handleDetailChangeGL(index, field, sanitizedValue); }} onFocus={(e) => clearFgsrGlZeroOnFocus(e, { isEditable: !isFormDisabled, onClear: (value) => handleDetailChangeGL(index, field, value) })} onBlur={(e) => { if (isFormDisabled) return; handleBlurGL(index, field, e.target.value); }} onKeyDown={async (e) => { if (e.key !== "Enter" || isFormDisabled) return; e.preventDefault(); await handleBlurGL(index, field, e.target.value, true); focusNextGlCell(field); }} />;
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

/* --------------------------------------------------------------------------
 * JSX Render
 * -------------------------------------------------------------------------- */
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
        isViewDocument={isViewDocumentUrl}  
        onDetails={() => setTopTab("details")}
        onHistory={() => setTopTab("history")}
        disableRouteNavigation={true}         
        isSaveDisabled={state.isSaveDisabled || isFormDisabled || ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)}
        isResetDisabled={state.isResetDisabled}
        isAttachDisabled={!documentID}
        isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
        isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
        isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
        detailsRoute="/page/FGSR"
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

        {/* FGSR Header Form Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative" id="fgsr_hd">
          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="branchName"
              label="Branch Code"
              type="lookup"
              value={branchName || ""}
              disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => !isFormDisabled && updateState({ branchModalOpen: true })}
            />

            <FieldRenderer
              id="fgsrNo"
              label="FGSR No"
              type="lookup"
              value={state.documentNo || ""}
              disabled={state.isDocNoDisabled}
              onChange={(val) => updateState({ documentNo: val })}
              onLookup={() => updateState({ showAllTranDocNo: true })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleDocNoBlur();
                  e.preventDefault();
                  document.getElementById("fgsrDate")?.focus();
                }
              }}
            />

            <div className="relative w-full">
              <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                <DateFormatInput
                  id="fgsrDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={documentDate}
                  disabled={isFormDisabled}
                  updateState={(updates) => {
                    if (updates.fgsrDate !== undefined) updateState({ documentDate: updates.fgsrDate });
                    else updateState(updates);
                  }}
                />
              </div>
              <label htmlFor="fgsrDate" className="global-ref-floating-label">FGSR Date</label>
            </div>

          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="custName"
              label="Customer Name"
              type="lookup"
              value={custName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFormDisabled}
              onLookup={() => !isFormDisabled && updateState({ showCustomerModal: true })}
            />

            <FieldRenderer
              id="custCode"
              label="Customer Code"
              type="text"
              value={custCode || ""}
              disabled
              readOnly
              maxLength={useGetFieldLength(tblFieldArray, "cust_code")}
            />

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
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="locName"
              label="Location"
              type="lookup"
              required
              value={LocName || ""}
              disabled={isFormDisabled || WHName === ""}
              readOnly
              lookupDisabled={isFormDisabled || WHName === ""}
              onLookup={() => !isFormDisabled && WHName !== "" && updateState({ locationLookupOpen: true, selectedWH: WHCode })}
            />

            <FieldRenderer
              id="refSiNo"
              label="Ref SI No"
              type="text"
              value={refSiNo || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refSiNo: val })}
              maxLength={useGetFieldLength(tblFieldArray, "ref_si_no")}
            />

            <FieldRenderer
              id="refCmNo"
              label="Ref CM No"
              type="text"
              value={refCmNo || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refCmNo: val })}
              maxLength={useGetFieldLength(tblFieldArray, "ref_cm_no")}
            />
          </div>

          {/* Remarks Section - matches FGRTV layout */}
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

          <div className="col-span-full hidden">
            <input type="hidden" id="arcmId" value={arcmId || ""} readOnly />
            <input type="hidden" id="siId" value={siId || ""} readOnly />
          </div>
        </div>
    </div>


          {/* Item Details Section */}
          <div id="fgsr_dtl" className="global-tran-tab-div-ui">

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
                {visibleFgsrDetailColumns.map((column) => (
                  <Fragment key={`detail-header-${column.key}`}>
                    {renderFgsrDetailHeader(column.label, column.key, column.width, {
                      orderedColumns: visibleFgsrDetailColumns,
                    })}
                  </Fragment>
                ))}
                {!isFormDisabled && (
                  <th key="detail-actions" className="global-tran-th-ui sticky top-0 right-0 bg-blue-300 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>
                )}
              </tr>
              {renderFgsrDetailHeaderContextMenu()}
            </thead>
            <tbody className="relative">
              {sortedFgsrDetailRows.map(({ row, originalIndex }) => (
                <tr key={`${row.uniqueKey || row.itemCode || "row"}-${originalIndex}`} className="global-tran-tr-ui">
                  {visibleFgsrDetailColumns.map((column) => renderFgsrDetailColumn(column.key, row, originalIndex))}
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


    {/*
      Add Button Workflow:
      - If upload is allowed, clicking Add opens a dropdown.
      - Dropdown options: Add Item, Download Template, Upload Transaction.
      - If upload is not allowed, clicking Add goes directly to Add Item.
    */}
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

      {/* Total Qty In */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Quantity:
        </label>
        <label id="totalQtyIn" className="global-tran-tab-footer-total-value-ui">
          {totals.totalQtyIn}
        </label>
      </div>

      {/* Total Amount */}
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
                  {orderedFgsrGlColumns.map((column) => (
                    <Fragment key={`gl-header-${column.key}`}>
                      {renderFgsrGlHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedFgsrGlColumns,
                      })}
                    </Fragment>
                  ))}
                </tr>
                {renderFgsrGlHeaderContextMenu()}
              </thead>
              <tbody className="relative">
                {sortedFgsrGlRows.map(({ row, originalIndex }) => (
                  <tr key={`${row.acctCode || "gl"}-${originalIndex}`} className="global-tran-tr-ui">
                    {orderedFgsrGlColumns.map((column) => renderFgsrGlColumn(column.key, row, originalIndex))}
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

    {/* Customer Code / Name Lookup Modal */}
    {showCustomerModal && (
      <CustomerMastLookupModal
        isOpen={showCustomerModal}
        onClose={handleCloseCustomerModal}
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
      <PostFGSR
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "fgsrNo"}}
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
                title="FG Item Lookup"
                endpoint={globalLookupHeader}
                onClose={handleCloseFGLookup}
                onCancel={() => updateState({ msLookupModalOpen: false })}
                singleSelect={itemSingleSelect}
              />
        )}

      {itemMastLookupOpen && (
        <ItemMastLookupModal
          isOpen={itemMastLookupOpen}
          endpoint="getInvLookupFG"
          onClose={handleCloseItemMastLookup}
          onCancel={() => updateState({ itemMastLookupOpen: false, itemSingleSelect: false })}
          enableMultiSelect={!itemSingleSelect}
          docType="PRFG"
        />
      )}
        


        {warehouseLookupOpen && (
            <WarehouseLookupModal
              isOpen={warehouseLookupOpen}
              onClose={handleCloseWarehouseLookup}
              filter={"ByBC" + branchCode}
              branchCode={branchCode || ""}
              source={accountModalSource}
            invType="FG"
            />
          )}  
   
      {locationLookupOpen && (
        <LocationLookupModal
          isOpen={locationLookupOpen}
          onClose={handleCloseLocationLookup}
          source={accountModalSource}
          filter={"ByWH" + selectedWH}
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
        isActive={topTab === "history"}
        endpoint="/getFGSRHistory"
        cacheKey={`FGSR:${state.branchCode || ""}:${state.documentNo || ""}`}
        activeTabKey="FGSR_Summary"
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

export default FGSR;
