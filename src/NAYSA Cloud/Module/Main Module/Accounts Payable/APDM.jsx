import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner } from "@fortawesome/free-solid-svg-icons";

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
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { postRequest, fetchDataJson} from '../../../Configuration/BaseURL.jsx'
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
} from '@/NAYSA Cloud/Global/top1RefTable';

import {
  useSelectedOpenAPBalance,
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';

import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';

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
  useSwalInfoAlert,
  useSwalshowSaveSuccessDialog,
} from '@/NAYSA Cloud/Global/behavior.jsx';

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from '@/NAYSA Cloud/Components/Header';

const APDM = () => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation(); 
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded ,getAllTopATCRow, getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount ,getAllTopHSDocRow} = useAuth();
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
  const docType = docTypes.APDM; 
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc?.docName + ' Transaction';
 
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
    vendCode: "",
    vendName: "",
    
    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),

    //Other Header Info
    apdmTypes :[],
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

    selectedAPDMType : "APDM01",
    userCode: currentUserRow?.userCode||"", 

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    globalLookupRow:[],
    globalLookupHeader:[],

    totalDebit:"0.00",
    totalCredit:"0.00",
    totalDebitFX1:"0.00",
    totalCreditFX1:"0.00",

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
    showAPBalanceModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    payeeModalOpen:false,
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
  vendCode,
  vendName,
  currCode,
  currName,
  currRate,
  selectedAPDMType,
  apdmTypes,
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
  totalDebitFX1,
  totalCreditFX1,

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
  payeeModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAPBalanceModal,
  showPostingModal,
  showAllTranDocNo,

} = state;

  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);
  
  //Variables
  const [totals, setTotals] = useState({
  totalSIAmount: '0.00',
  totalAppliedAmount: '0.00',
  totalVATAmount: '0.00',
  totalATCAmount: '0.00'
  });

  useEffect(() => {
    const debitSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
  updateState({
    totalDebit: formatNumber(debitSum),
    totalCredit: formatNumber(creditSum),
    totalDebitFx1: formatNumber(debitFx1Sum),
    totalCreditFx1: formatNumber(creditFx1Sum)
  })
  }, [detailRowsGL]);

 useEffect(() => {
  if (resetFlag) handleReset();

  const timer = isLoading
    ? setTimeout(() => updateState({ showSpinner: true }), 200)
    : (updateState({ showSpinner: false }), null);

  return () => timer && clearTimeout(timer);
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
  const apdmType = getAllDropDown("APDMTRAN_TYPE", docType);
  if (apdmType.length > 0) {
    updateState({
      apdmTypes: apdmType,
      selectedAPDMType: "APDM01",
    });
  }
}, [docType, refsLoaded]);

  const handleReset = () => { 
      updateState({
      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      selectedAPDMType : "APDM01",
      noReprints:"0",

      refDocNo1: "",
      refDocNo2:"",
      checkDate:null,
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
      updateTotalsDisplay (0, 0, 0, 0)
  };

    const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const hdtblcol_result = await useFieldLenghtCheck(
        "apdm_hd,apdm_dt1,apdm_dt2"
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

const fetchTranData = async (documentNo, branchCode, direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"apdmNo",direction);


    if (!data?.apdmId) {
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
      documentStatus: data.apdmStatus,
      status: data.docStatus,
      documentID: data.apdmId,
      documentNo: data.apdmNo,
      branchCode: data.branchCode,
      branchName: data.branchName,
      documentDate: useformatToDatev2(data.apdmDate),
      selectedAPDMType: data.apdmtranType,
      vendCode: data.vendCode,
      vendName: data.vendName,
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

  if (documentStatus !== '') return;
   
  updateState({ isLoading: true });

  try {
    const {
        branchCode,
        documentNo,
        documentID,
        vendCode,
        vendName,
        refDocNo1,
        refDocNo2,  
        currCode,
        currRate,
        remarks,
        detailRows,
        detailRowsGL
    } = state;

    if (!validateAppliedAmounts(detailRows)) {
      return;
    }

    let finalDetailRowsGL = [...detailRowsGL];

    const buildGlData = (glRows) => ({
      branchCode: branchCode,
      apdmNo: documentNo || "",
      apdmId: documentID || "",
      apdmDate: documentDate,
      apdmtranType: selectedAPDMType,   
      vendCode: vendCode || "",
      vendName: vendName || "",
      refDocNo1: refDocNo1 || "",
      refDocNo2: refDocNo2 || "",
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks|| "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          apvNo: row.apvNo || "",
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
          apAcct: row.apAcct || "",
          crAcct:row.crAcct || "",
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
          slRefDate: entry.slRefDate ? new Date(entry.slRefDate).toISOString().split("T")[0] : null,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || ""
        }))
    });

    if (action === "GenerateGL") {
        const newGlEntries = await useGenerateGLEntries(docType, buildGlData(finalDetailRowsGL));
        if (newGlEntries && newGlEntries.length > 0) {
          
            const normalizedEntries = newGlEntries.map(entry => ({
                ...entry,
                slRefDate: useformatToDatev2(entry.slRefDate) 
            }));

            updateState({ detailRowsGL: normalizedEntries });
        } else {
            console.warn("GL entries generation failed or returned no data.");
        }
        return;
    }

    if (action === "Upsert") {
        if (finalDetailRowsGL.length === 0) {
            const newGlEntries = await useGenerateGLEntries(docType, buildGlData([]));
            if (!newGlEntries || newGlEntries.length === 0) {
                console.warn("GL entries generation failed or returned no data.");
                return;
            }
            finalDetailRowsGL = newGlEntries;
            updateState({ detailRowsGL: newGlEntries });
        }

        const response = await useTransactionUpsert(docType, buildGlData(finalDetailRowsGL), updateState, 'apdmId', 'apdmNo');
        if (response) {
            const isZero = Number(noReprints) === 0;
            const onSaveAndPrint = isZero
              ? () => updateState({ showSignatoryModal: true })
              : () => handleSaveAndPrint(response.data[0].apdmId);

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
      updateState({ isLoading: false});
  }
};

  const handleAddRow = async (index = null) => { // Added index parameter
  if (!vendCode) {
    return;
  }

  if (['APDM01'].includes(selectedAPDMType)) {
    await handleOpenAPBalance();
    return;
  }
 
  try {
    const items = await handleFetchDetail(vendCode);
    const itemList = Array.isArray(items) ? items : [items];
    const newRows = await Promise.all(itemList.map(async (item) => {
      return {
        lnNo: "",
        apvNo: "00000000",
        siNo: "00000000",
        siDate: documentDate,
        siAmount: "0.00",
        appliedAmount: "0.00",
        vatCode: item.vatCode || "",
        vatName: item.vatName || "",
        vatAmount: "0.00",
        atcCode: item.atcCode || "",
        atcName: item.atcName || "",
        atcAmount: "0.00",
        currCode: currCode,
        currRate: formatNumber(currRate, 6),
        apAcct: "",
        crAcct: "",
        rcCode: "",
        refBranchcode: branchCode,
        refDocCode: "APDM",
        groupId: "",
        atcRate: "0.00",
        vatRate: "0.00"
      };
    }));

    // Insert logic
    const updatedRows = [...detailRows];
    if (index !== null) {
      updatedRows.splice(index + 1, 0, ...newRows); // Insert after current index
    } else {
      updatedRows.push(...newRows); // Add to end if no index (footer button)
    }

    updateState({ 
      detailRows: updatedRows,
      detailRowsGL: [] 
    });
    updateTotals(updatedRows);

  } catch (error) {
    console.error("Error adding new row:", error);
  }
};

const handleAddRowGL = (index = null) => { // Added index parameter
  if (handleFieldBehavior("CWTReversal")) {
    return;
  }

  const newRow = {
    acctCode: "",
    rcCode: "",
    sltypeCode: "",
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
    slRefDate: documentDate,
  };

  const updatedRowsGL = [...detailRowsGL];
  if (index !== null) {
    updatedRowsGL.splice(index + 1, 0, newRow); // Insert after current index
  } else {
    updatedRowsGL.push(newRow); // Add to end
  }

  updateState({
    detailRowsGL: updatedRowsGL
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
    if(handleFieldBehavior("CWTReversal")){
      return;
    }

    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows }); 
  };

  const handleFetchDetail = async (vendCode) => {
    if (!vendCode) return [];
  
    try {
      const custPayload = {
        json_data: {
          vendCode: vendCode,
        },
      };
      const vendResponse = await postRequest("addPayeeDetail", JSON.stringify(custPayload));
      const rawResult = vendResponse.data[0]?.result;
  
      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

const handlePrint = async () => {
  if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
      }
  updateState({ showSignatoryModal: true });
};

const handlePost = async () => {
  if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
      }

  if (documentID && (documentStatus === '')) {
    updateState({ showPostingModal: true });
  }
};

const handleCancel = async () => {
  if (!detailRowsGL || detailRowsGL.length === 0) {
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

  if (!detailRowsGL || detailRowsGL.length === 0) {
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
    cleanUrl(); 
  },
  [fetchTranData, cleanUrl]
);

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const docNo = params.get("apdmNo");         
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
    updateState({ isLoading: true });

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
                console.warn("API call for getPayee returned success: false", response.message);
            }
        }
 
     updateState({
          detailRowsGL: [],
          ...(selectedAPDMType !== "APDM02" && { detailRows: [] }),
        });
     updateTotalsDisplay (0, 0, 0, 0);

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({ isLoading: false });
    }
};

const updateTotals = (rows) => {
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

const showAppliedAmountValidation = (rowNo, invoiceAmount, appliedAmount) => {
  useSwalInfoAlert(
    "Validation",
    `Line ${rowNo}: Applied Amount (${formatNumber(appliedAmount)}) cannot exceed Invoice Amount (${formatNumber(invoiceAmount)}).`
  );
};

const validateAppliedAmounts = (rows) => {
  if (selectedAPDMType === "APDM02") return true;

  const invalidIndex = rows.findIndex((row) => {
    const invoiceAmount = parseFormattedNumber(row.siAmount || 0) || 0;
    const appliedAmount = parseFormattedNumber(row.appliedAmount || 0) || 0;
    return +(appliedAmount - invoiceAmount).toFixed(2) > 0;
  });

  if (invalidIndex === -1) return true;

  const invalidRow = rows[invalidIndex];
  showAppliedAmountValidation(
    invalidIndex + 1,
    parseFormattedNumber(invalidRow.siAmount || 0) || 0,
    parseFormattedNumber(invalidRow.appliedAmount || 0) || 0
  );
  return false;
};

const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    }
   
     const row = updatedRows[index];

    if (['apAcct','crAcct'].includes(field)) {
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

const isAPDM02 = selectedAPDMType === "APDM02";
const isAllTypes = isAPDM02 || selectedAPDMType === "APDM01";

if (field === "appliedAmount") {
  if (!isAPDM02 && +(origApplied - siAmount).toFixed(2) > 0) {
    showAppliedAmountValidation(index + 1, siAmount, origApplied);
    origApplied = siAmount;
    row.appliedAmount = formatNumber(siAmount);
  }

  if (isAPDM02) {
    siAmount = parseFormattedNumber(row.appliedAmount);
    row.siAmount = formatNumber(siAmount);
  }

  if (isAllTypes) {
    row.vatAmount      = formatNumber(origApplied * vatRate);
    row.atcAmount      = formatNumber(origApplied * atcRate);
    row.appliedAmount  = formatNumber(origApplied);
  }
}

if ((field === "vatCode" || field === "atcCode") || field === "appliedAmount") {
  const appliedAmt = parseFormattedNumber(row.appliedAmount);

  const vatAmt = row.vatCode
    ? getAllTopVatAmount(row.vatCode, appliedAmt)
    : 0;
  row.vatAmount = formatNumber(vatAmt);

  const netOfVat = +(appliedAmt - vatAmt).toFixed(2);
  const atcAmt = row.atcCode
    ? getAllTopATCAmount(row.atcCode, netOfVat)
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
        selectedAPDMType === "APDM02" 
      );
 case "wInvoice":
      return (
        !isFormDisabled ||
        selectedAPDMType !== "APDM02" 
      );
 case "disableOnSaved" :
   return (
        isFormDisabled ||
        (selectedAPDMType !== "APDM02" && state.documentID !== "" )
      );
  case "CWTReversal" :
    return (
      isFormDisabled ||
      ["APDM03"].includes(selectedAPDMType)
      );
    default:
      return false; 
  }
};

  const handleAPDMTypeChange = (e) => {
   const selectedType = e.target.value;

   updateState({
      detailRowsGL: [],
      selectedAPDMType:selectedType,
      detailRows: [],
    });
   updateTotalsDisplay(0, 0, 0, 0);
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
        const specialAccounts = ['apAcct','crAcct'];
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
        handleDetailChange(rowIndex, 'rcCode', selectedRc, false);
      } else {
           const result = await useTopRCRow(selectedRc.rcCode);
            if (result) {
              handleDetailChangeGL(rowIndex, 'rcCode', result);
            }
      }
    }
    updateState({
        showRcModal: false,
        selectedRowIndex: null,
        accountModalSource: null
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
    updateState({ showSpinner: true,
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
     });
    await useHandlePrint(documentID, docType, mode, userCode);

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

const handleOpenAPBalance = async () => {
  try {
    updateState({ isLoading: true });

    const groupIdSelected = {
         dt1: detailRows.map((row, index) => ({
          groupId:row.groupId
         }))
    }

    const endpoint ="getOpenAPBalance"
    const response = await fetchDataJson(endpoint, { vendCode, branchCode, tranType:selectedAPDMType, groupIdSelected });
    const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];

    const colConfig = await useSelectedHSColConfig(endpoint);
    const displayRows = custData.map((row) => ({
      ...row,
      branchCode:
        row.branchName ||
        row.brName ||
        row.branch_name ||
        row.BRANCH_NAME ||
        branchName ||
        row.branchCode,
    }));

   if (custData.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Open AP Balance",
        text: "There are no AR balance records for the selected customer/branch.",
      });
       updateState({ isLoading: false });
      return; 
    }

    updateState({ globalLookupRow: displayRows,
                  globalLookupHeader:colConfig,
                  showAPBalanceModal: true
      });

  } catch (error) {
    console.error("Failed to fetch Open AP Balance:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to fetch Open AP Balance.",
    });
    updateState({ 
        globalLookupRow: [] ,
        globalLookupHeader: [] });
  }

   updateState({ isLoading: false });
};

const handleCloseAPBalance = async (payload) => {
  if (payload && payload !== null) {
    updateState({ isLoading: true });

      const result = await useSelectedOpenAPBalance(payload,selectedAPDMType);
      if (result) {
        const newRows = result.map((entry, idx) => {
        const netDisc = parseFormattedNumber(entry.balance);
        const vatRate = parseFormattedNumber(entry.vatCalcRate);
        const atcRate = parseFormattedNumber(entry.atcCalcRate);

        const vatAmount = parseFormattedNumber(entry.vatAmount);
        const atcAmount = parseFormattedNumber(entry.atcAmount);

        const applied = netDisc+atcAmount;

        return {
          lnNo: idx + 1,
          apvNo: entry.apvNo,
          siNo: entry.siNo,
          siDate: entry.siDate,
          siAmount: formatNumber(applied), 
          appliedAmount: formatNumber(applied), 
          vatCode: entry.vatCode,
          vatName: entry.vatName,
          vatRate: entry.vatCalcRate,
          vatAmount: formatNumber(vatAmount, 2),
          atcCode: entry.atcCode,
          atcName: entry.atcName,
          atcRate: entry.atcCalcRate,
          atcAmount: formatNumber(atcAmount, 2),
          apAcct: entry.apAccount,
          crAcct:entry.drAccount,
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
    showAPBalanceModal: false,
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
     const result = getAllTopVatRow(selectedVat.vatCode);
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
    const result = getAllTopATCRow(selectedAtc.atcCode);
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
              onAttach={handleAttach}
              activeTopTab={topTab} 
              showActions={topTab === "details"} 
              showBIRForm={false}  
              showCopyForm={false}
              isViewDocument={isViewDocument}      
              onDetails={() => setTopTab("details")}
              onHistory={() => setTopTab("history")}
              disableRouteNavigation={true}         
              detailsRoute="/page/APDM"
              isSaveDisabled={state.isSaveDisabled || isFormDisabled ||  ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)} 
              isResetDisabled={state.isResetDisabled}
              isAttachDisabled={!documentID}
              isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
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
                activeTab === 'basic'
                ? 'global-tran-tab-text_active-ui'
                : 'global-tran-tab-text_inactive-ui'
            }`}
            // onClick={() => setActiveTab('basic')}
        >
            Basic Information
        </button>
        {/* Provision for Other Tabs */}
    </div>

    {/* SVI Header Form Section - Main Grid Container */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="apdm_hd">
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
                  id="apdmNo"
                  label="APDM No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCrNoBlur();
                      e.preventDefault();
                      document.getElementById("apdmDate")?.focus();
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
                    APDM Date
                  </label>
                </div>
            </div>

            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="selectedAPDMType"
                  label="Tran Type"
                  type="select"
                  value={selectedAPDMType || ""}
                  disabled={handleFieldBehavior("disableOnSaved")}
                  onChange={(val) => handleAPDMTypeChange({ target: { value: val } })}
                  options={apdmTypes.map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />

                <FieldRenderer
                  id="vendCode"
                  label="Payee Code"
                  required
                  type="lookup"
                  value={vendCode || ""}
                  disabled={handleFieldBehavior("disableOnSaved")}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => updateState({ payeeModalOpen: true })}
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
            </div>

            {/* Column 3 */}
            <div className="global-tran-textbox-group-div-ui">
 
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

                    <input type="hidden" id="currCode" value={currCode || ""} readOnly />
                    
            </div>

             {/* Remarks Section */}
            <div className="col-span-full">
                <div className="relative p-2"> 
                    <textarea
                        id="remarks"
                        placeholder=""
                        rows={6}
                        className={`peer pt-2 ${isFormDisabled ? "global-tran-textbox-remarks-ui-disabled" : "global-tran-textbox-remarks-ui"}`}
                        value={remarks}
                        maxLength={useGetFieldLength(tblFieldArray, "remarks")}
                        onChange={(e) => updateState({ remarks: e.target.value })}
                        disabled={isFormDisabled} 
                    />
                    <label
                        htmlFor="remarks"
                        className={`${isFormDisabled ? "global-tran-floating-label-remarks-disabled" : "global-tran-floating-label-remarks"}`}
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
                maxLength={useGetFieldLength(tblFieldArray, "refapdm_no1")}
              />

              <FieldRenderer
                id="refDocNo2"
                label="Ref Doc No. 2"
                type="text"
                value={refDocNo2 || ""}
                disabled={isFormDisabled}
                onChange={(val) => updateState({ refDocNo2: val })}
                maxLength={useGetFieldLength(tblFieldArray, "refapdm_no2")}
              />
        </div>

    </div>
</div>
      
{/* Conditionally render the APV/Invoice Detail Section based on selectedAPDMType */}
{selectedAPDMType !== "APDM02" && (
      <div id="apdm_dtl" className="global-tran-tab-div-ui" >

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
    </div>

  {/* Invoice Details Table */}
  <div className="global-tran-table-main-div-ui">
  <div className="global-tran-table-main-sub-div-ui"> 
    <table className="min-w-full border-collapse">
      <thead className="global-tran-thead-div-ui">
        <tr>
          <th className="global-tran-th-ui">LN</th>
          <th className="global-tran-th-ui">APV No.</th>
          <th className="global-tran-th-ui">Invoice No.</th>
          <th className="global-tran-th-ui">Invoice Date</th>
          <th className="global-tran-th-ui">Invoice Amount</th>
          <th className="global-tran-th-ui">Applied Amount</th>
          <th className="global-tran-th-ui">VAT Code</th>
          <th className="global-tran-th-ui">VAT Name</th>
          <th className="global-tran-th-ui">VAT Amount</th>
          <th className="global-tran-th-ui">ATC</th>
          <th className="global-tran-th-ui">ATC Name</th>
          <th className="global-tran-th-ui">ATC Amount</th>
          <th className="global-tran-th-ui">Curr Code</th>
          <th className="global-tran-th-ui">Curr Rate</th>
          <th className="global-tran-th-ui">AP Account</th>
          <th className="global-tran-th-ui">CR Account</th>
          <th className="global-tran-th-ui">RC Code</th>
          <th className="global-tran-th-ui hidden">Ref Branch</th>
          <th className="global-tran-th-ui hidden">Ref Doc Code</th>
          <th className="global-tran-th-ui hidden">Group ID</th>
          <th className="global-tran-th-ui hidden">VAT Rate</th>
          <th className="global-tran-th-ui hidden">ATC Rate</th>
                 
         {!isFormDisabled && (
          <th className="global-tran-th-ui sticky right-0 bg-blue-100 dark:bg-blue-900 z-30">
            Actions
          </th>
        )}
        </tr>
      </thead>

      <tbody className="relative">{detailRows.map((row, index) => (
        <tr key={index} className="global-tran-tr-ui">
          
          {/* LN */}
          <td className="global-tran-td-ui text-center">{index + 1}</td>

         {/* APV No */}
          <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.apvNo || ""}
                onChange={(e) => handleDetailChange(index, 'apvNo', e.target.value)}
                readOnly
              />
            </td>
          
         {/* SI No */}
          <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.siNo || ""}
                onChange={(e) => handleDetailChange(index, 'siNo', e.target.value)}
                readOnly
              />
            </td>
            
            {/* SI Date */}
           <td className="global-tran-td-ui">
                <input
                  type="date"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.siDate || ""}
                  onChange={(e) => handleDetailChange(index, 'siDate', e.target.value)}
                  readOnly={row.groupId !== null && row.groupId !== ""}
                />
            </td>

            {/* SI Amount */}
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={row.siAmount || ""}
                readOnly
              />
            </td>
            
            {/* Applied */}
            <td className="global-tran-td-ui">
                <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.appliedAmount || ""}
                    readOnly={handleFieldBehavior("CWTReversal")}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChange(index, "appliedAmount", sanitizedValue, false);
                        }
                    }}                   
                     onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                        }
                      }}  

                    onBlur={async (e) => {
                         if (handleFieldBehavior("CWTReversal")) {
                                  return;
                                }
                        const value = e.target.value;
                        const num = parseFormattedNumber(value);
                        if (!isNaN(num)) {
                            await handleDetailChange(index, "appliedAmount", num, true);
                        }
                        setFocusedCell(null);
                    }}
                    onKeyDown={async (e) => {
                         if (handleFieldBehavior("CWTReversal")) {
                                  return;
                                }

                        if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "appliedAmount", num, true);
                            }
                            e.target.blur();
                            updateState({detailRowsGL: []})
                        }
                    }}
                />
            </td>

             <td className="global-tran-td-ui relative">
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.vatCode || ""}
                  readOnly
                />
                {!handleFieldBehavior("CWTReversal") && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                    updateState({ selectedRowIndex: index,
                                  showVatModal: true,
                                  accountModalSource: "vatCode" }); 
                  }}
                />)}
              </div>
            </td>

            <td className="global-tran-td-ui">
                <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.vatName || ""}
                    readOnly
                />
            </td>

            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={formatNumber(parseFormattedNumber(row.vatAmount)) || formatNumber(parseFormattedNumber(row.vatAmount)) || ""}
                readOnly
              />
            </td>

            <td className="global-tran-td-ui relative">
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.atcCode || ""}
                  readOnly
                />
                {!handleFieldBehavior("CWTReversal") && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                    updateState({ selectedRowIndex: index ,
                                  showAtcModal: true,
                                  accountModalSource: "atcCode" }); 
                  }}
                />)}
              </div>
            </td>

            
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[200px] global-tran-td-inputclass-ui"
                value={row.atcName || ""}
                readOnly
              />
            </td>

            <td className="global-tran-td-ui">
                <input
                   type="text"
                   className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                   readOnly
                    value={formatNumber(parseFormattedNumber(row.atcAmount)) || formatNumber(parseFormattedNumber(row.atcAmount)) || ""}
                   onChange={(e) => handleDetailChange(index, 'atcAmount', e.target.value)}
                />
            </td>
    
            {/* Curr Code */}
           <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.currCode || ""}
                readOnly
              />
            </td>

          
            {/* Curr Rate */}
             <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={formatNumber(parseFormattedNumber(row.currRate),6) || formatNumber(parseFormattedNumber(row.currRate),6) || ""}
                readOnly
              />
            </td>

            
            {/* AP Account */}          
            <td className="global-tran-td-ui relative">
            <div className="flex items-center">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                value={row.apAcct || ""}
                readOnly
              />
              {(handleFieldBehavior("withoutInvoice") && (row.groupId == null || row.groupId === "")) && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                    updateState({ selectedRowIndex: index ,
                                  showAccountModal: true,
                                  accountModalSource: "apAcct"  });
                  }}
                />
              )}
            </div>        
            </td>

             {/* CR Account */}          
            <td className="global-tran-td-ui relative">
            <div className="flex items-center">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                value={row.crAcct || ""}
                readOnly
              />
              {(!handleFieldBehavior("CWTReversal") && handleFieldBehavior("wInvoice")) && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                    updateState({ selectedRowIndex: index ,
                                  showAccountModal: true,
                                  accountModalSource: "crAcct"  });
                  }}
                />
              )}
            </div>        
            </td>

            {/* RC Code */}
            <td className="global-tran-td-ui relative">
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.rcCode || ""}
                  readOnly
                />
                {(handleFieldBehavior("withoutInvoice") && (row.groupId == null || row.groupId === "")) && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                  updateState({ selectedRowIndex: index,
                                showRcModal: true,
                                accountModalSource: "rcCode" }); 
                  }}
                />)}
              </div>
            </td>   
            
             {/* Ref Branch */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.refBranchcode || ""}
                readOnly
              />
            </td>

             {/* Ref Doc Code */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.refDocCode || ""}
                readOnly
              />
            </td>

              {/* Group ID */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.groupId || ""}                
                readOnly
              />
            </td>

            {/* VAT Rate */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.vatRate || ""}                
                readOnly
              />
            </td>

            {/* ATC Rate */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.atcRate || ""}                
                readOnly
              />
            </td>

            {!isFormDisabled && (
              <td className="global-tran-td-ui text-center sticky right-0">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    className="global-tran-td-button-add-ui"
                    onClick={() => handleAddRow(index)}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>

                  <button
                    type="button"
                    className="global-tran-td-button-delete-ui"
                    onClick={() => handleDeleteRow(index)}
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
  </div>
  </div>

 {/* Invoice Details Footer */}
 <div className="global-tran-tab-footer-main-div-ui">

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
)}
 
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
          // onClick={() => setGLActiveTab('invoice')}
        >
          General Ledger
        </button>
      </div>

      {/* Action Button */}
      {selectedAPDMType !== 'APDM02' && (
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
      )}

    </div>

    {/* GL Details Table */}
    <div className="global-tran-table-main-div-ui">
    <div className="global-tran-table-main-sub-div-ui"> 
      <table className="min-w-full border-collapse">

        <thead className="global-tran-thead-div-ui">
          <tr>
            <th className="global-tran-th-ui">LN</th>
            <th className="global-tran-th-ui">Account Code</th>
            <th className="global-tran-th-ui">RC Code</th>
            <th className="global-tran-th-ui">SL Type Code</th>
            <th className="global-tran-th-ui">SL Code</th>
            <th className="global-tran-th-ui w-[2000px]">Particulars</th>
            <th className="global-tran-th-ui">VAT Code</th>
            <th className="global-tran-th-ui">VAT Name</th>
            <th className="global-tran-th-ui">ATC Code</th>
            <th className="global-tran-th-ui ">ATC Name</th>

            <th className="global-tran-th-ui">Debit ({glCurrDefault})</th>
            <th className="global-tran-th-ui">Credit ({glCurrDefault})</th>
            
            <th className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}>
              Debit ({withCurr3 ? glCurrGlobal2 : currCode})
            </th>
            <th className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}>
              Credit ({withCurr3 ? glCurrGlobal2 : currCode})
            </th>
            <th className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}>
              Debit ({glCurrGlobal3})
            </th>
            <th className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}>
              Credit ({glCurrGlobal3})
            </th>

            <th className="global-tran-th-ui">SL Ref. No.</th>
            <th className="global-tran-th-ui">SL Ref. Date</th>
            <th className="global-tran-th-ui">Remarks</th>
            
            {!isFormDisabled && (
              <th className="global-tran-th-ui sticky right-0 bg-blue-100 dark:bg-blue-900 z-30">
                Actions
              </th>
            )}

          </tr>
        </thead>
        <tbody className="relative">
          {detailRowsGL.map((row, index) => (
            <tr key={index} className="global-tran-tr-ui">
              
              <td className="global-tran-td-ui text-center">{index + 1}</td>

              <td className="global-tran-td-ui">
                <div className="relative w-fit">
                  <input
                    type="text"
                    className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                    value={row.acctCode || ""}
                    onChange={(e) => handleDetailChangeGL(index, 'acctCode', e.target.value)}      
      
                  />
                  {!handleFieldBehavior("CWTReversal") && (
                  <FontAwesomeIcon 
                    icon={faMagnifyingGlass} 
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                    onClick={() => {
                        updateState({
                            selectedRowIndex: index,
                            showAccountModal: true,
                            accountModalSource: "acctCode" 
                        });
                    }}
                  />)}
                </div>
              </td>

              <td className="global-tran-td-ui">
                <div className="relative w-fit">
                    <input
                        type="text"
                        className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                        value={row.rcCode || ""}
                        onChange={(e) => handleDetailChangeGL(index, 'rcCode', e.target.value)}
                        readOnly
                    />
                   {!handleFieldBehavior("CWTReversal") && (row.rcCode === "REQ RC" || (row.rcCode && row.rcCode !== "REQ RC")) && (
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                        onClick={() => {
                          updateState({
                            selectedRowIndex: index,
                            showRcModal: true,
                          });
                        }}
                      />
                    )}

                </div>
            </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.sltypeCode || ""}
                  onChange={(e) => handleDetailChangeGL(index, 'sltypeCode', e.target.value)}
                />
              </td>

              <td className="global-tran-td-ui">
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.slCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'slCode', e.target.value)}
                          readOnly
                      />

                      {!handleFieldBehavior("CWTReversal") && (row.slCode === "REQ SL" || row.slCode) && ( 
                          <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                  if (row.slCode === "REQ SL" || row.slCode) { 
                                      updateState({
                                          selectedRowIndex: index,
                                          showSlModal: true,
                                      });
                                  }
                              }}
                          />
                      )}
                  </div>
              </td>
             
              <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[300px] global-tran-td-inputclass-ui"
                        value={row.particular || ""}
                        readOnly
                        onChange={(e) => handleDetailChange(index, 'particular', e.target.value)}
                      />
                </td>
             
               <td className="global-tran-td-ui">
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.vatCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'vatCode', e.target.value)}
                          readOnly
                      />

                      {!handleFieldBehavior("CWTReversal") && row.vatCode && row.vatCode.length > 0 && (
                          <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                            onClick={() => {
                              updateState({
                                selectedRowIndex: index,
                                showVatModal: true,
                              });
                            }}
                          />
                        )}
                    </div>
               </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[200px] global-tran-td-inputclass-ui"
                  value={row.vatName || ""}
                  readOnly
                />
              </td>
             
               <td className="global-tran-td-ui">
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.atcCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'atcCode', e.target.value)}
                          readOnly
                      />

                      {!handleFieldBehavior("CWTReversal") && (row.atcCode !== "" || row.atcCode) && ( 
                          <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                  if (row.atcCode !== "" || row.atcCode) { 
                                      updateState({
                                          selectedRowIndex: index,
                                          showAtcModal: true,
                                      });
                                  }
                              }}
                          />
                      )}
                  </div>
               </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[200px] global-tran-td-inputclass-ui"
                  value={row.atcName || ""}
                  readOnly
                  onChange={(e) => handleDetailChange(index, 'atcName', e.target.value)}
                />
              </td>

              <td className="global-tran-td-ui text-right">             
              <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debit || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debit", sanitizedValue);
                        }}}

                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debit', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "debit", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'debit', e.target.value)}
                  
                /> 
            </td>

              <td className="global-tran-td-ui text-right">
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.credit || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "credit", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                        if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'credit', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "credit", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'credit', e.target.value)}
                />
              </td>

               <td className={`global-tran-td-ui text-right ${withCurr2? "" : "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debitFx1 || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debitFx1", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debitFx1', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "debitFx1", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'debitFx1', e.target.value)}
                />
              </td>
               <td className={`global-tran-td-ui text-right ${withCurr2? "" : "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.creditFx1 || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "creditFx1", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'creditFx1', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "creditFx1", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'creditFx1', e.target.value)}
                />
              </td>

               <td className={`global-tran-td-ui text-right ${withCurr3? "": "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debitFx2 || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debitFx2", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debitFx2', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "debitFx2", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'debitFx2', e.target.value)}
                />
              </td>
              <td className={`global-tran-td-ui text-right ${withCurr3? "": "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.creditFx2 || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {   
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "creditFx2", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'creditFx2', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "creditFx2", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'creditFx2', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.slRefNo || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  maxLength={useGetFieldLength(tblFieldArray, "slRefNo")}
                  onChange={(e) => handleDetailChangeGL(index, 'slRefNo', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                 <DateFormatInput
                   id={`slRefDate${index}`}
                   value={row.slRefDate || ""}
                   disabled={isFormDisabled}
                   className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                   updateState={(updates) => {
                   if (updates[`slRefDate${index}`] !== undefined) { handleDetailChangeGL(index,"slRefDate", updates[`slRefDate${index}`], false,); }}}
                 /> 
              </td>
                <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.remarks ||  ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  maxLength={useGetFieldLength(tblFieldArray, "remarks")}
                  onChange={(e) => handleDetailChangeGL(index, 'remarks', e.target.value)}
                />
             </td>
              
             {!isFormDisabled && (
              <td className="global-tran-td-ui text-center sticky right-0">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    className="global-tran-td-button-add-ui"
                    onClick={() => handleAddRowGL(index)}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>

                  <button
                    type="button"
                    className="global-tran-td-button-delete-ui"
                    onClick={() => handleDeleteRowGL(index)}
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
          Total Debit:
        </label>
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
      {totalDebit}
      </label>
      </div>

      {/* Total Credit */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
          Total Credit:
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

{currencyModalOpen && (
        <CurrLookupModal 
          isOpen={currencyModalOpen}
          onClose={handleCloseCurrencyModal}
        />
      )}

{payeeModalOpen && (
  <PayeeMastLookupModal
    isOpen={payeeModalOpen}
    onClose={handleClosePayeeModal}
  />
)}

{showBankMastModal && (
  <BankMastLookupModal
    isOpen={showBankMastModal}
    onClose={handleCloseBankMast}
  />
)}

{showAPBalanceModal && (
  <GlobalLookupModalv1
    isOpen={showAPBalanceModal}
    data={globalLookupRow}
    btnCaption="Get Selected Invoice"
    title="Open AP Balance"
    endpoint={globalLookupHeader}
    onClose={handleCloseAPBalance}
    onCancel={() => updateState({ showAPBalanceModal: false })}
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

      {showAllTranDocNo && (
        <AllTranDocNo
          isOpen={showAllTranDocNo}
          params={{branchCode,branchName,docType,documentTitle,fieldNo : "apdmNo"}}
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
        endpoint="/getAPDMHistory"
        cacheKey={`APDM:${state.branchCode || ""}:${state.docNo || ""}`} 
        activeTabKey="APDM_Summary"
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
// End of Return

};

export default APDM;
