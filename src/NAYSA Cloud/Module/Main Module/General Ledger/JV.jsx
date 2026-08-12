import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faMinus,
  faTrashAlt,
  faFolderOpen,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

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
import PostJV from "./PostJV.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { fetchData, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

import {
  docTypeNames,
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopVatRow,
  useTopATCRow,
  useTopRCRow,
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopVatAmount,
  useTopATCAmount,
  useTopBillCodeRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useFetchTranDataReversal,
  useHandleCancel,
  useHandlePost,
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior";

// Header
import Header from "@/NAYSA Cloud/Components/Header";
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";

const JV = () => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [topTab, setTopTab] = useState("details");

  const { user, getAllTopHSDocRow, getAllDropDown, refsLoaded } = useAuth();
  const { resetFlag } = useReset();
  const [isViewDocument, setIsViewDocument] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
  }, []);

  const [state, setState] = useState({
    // HS Option
    glCurrMode: "M",
    glCurrDefault: "PHP",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: "",
    glCurrGlobal2: "",
    glCurrGlobal3: "",

    // Document information
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

    // UI state
    activeTab: "basic",
    GLactiveTab: "entries",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    tblFieldArray: [],

    // Header information
    header: {
      jv_date: useGetCurrentDayV2(),
    },

    branchCode: "HO",
    branchName: "Head Office",

    // Vendor information
    custCode: "",
    custName: "",
    attention: "",

    // Currency information
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info
    jvTypes: [],
    refdocTypes: [],
    refDocNo: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
    remarks: "",
    billtermCode: "",
    billtermName: "",
    selectedJVType: "",
    selectedRefDocType: "",
    noReprints: "0",

    userCode: user.USER_CODE,

    // Detail 1-2
    detailRows: [],
    detailRowsGL: [],

    totalDebit: "0.00",
    totalCredit: "0.00",

    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showBillCodeModal: false,
    showSlModal: false,
    showPostModal: false,
    showAllTranDocNo: false,
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
    activeTab,
    GLactiveTab,
    isLoading,
    showSpinner,
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    tblFieldArray,
    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    header,
    branchCode,
    branchName,
    custCode,
    custName,
    currCode,
    currName,
    currRate,
    jvTypes,
    refdocTypes,
    refDocNo,
    refDocNo2,
    fromDate,
    toDate,
    remarks,
    billtermCode,
    billtermName,
    selectedJVType,
    selectedRefDocType,
    noReprints,
    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,
    modalContext,
    selectionContext,
    selectedRowIndex,
    accountModalSource,
    showAccountModal,
    showRcModal,
    showVatModal,
    showAtcModal,
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showBillCodeModal,
    showSlModal,
    showPostModal,
    showAllTranDocNo,
  } = state;

  const [focusedCell, setFocusedCell] = useState(null);

  // Document Global Setup & Updated Transaction Name Logic
  const docType = docTypes.JV;
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];

  const hsDoc = getAllTopHSDocRow ? getAllTopHSDocRow(docType) : null;
  const documentTitle = hsDoc.docName + " Transaction";

  // Status Global Setup
  const displayStatus = status || "OPEN";
  const statusMap = {
    OPEN: "global-tran-stat-text-open-ui",
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-finalized-ui",
  };
  const statusColor = statusMap[String(displayStatus).trim().toUpperCase()] || "";
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(
    displayStatus,
  );

  const [totals, setTotals] = useState({
    totalGrossAmount: "0.00",
    totalDiscountAmount: "0.00",
    totalNetAmount: "0.00",
    totalVatAmount: "0.00",
    totalSalesAmount: "0.00",
    totalAtcAmount: "0.00",
    totalAmountDue: "0.00",
  });

  const customParamMap = {
    arAct: glAccountFilter.ActiveAll,
    salesAcct: glAccountFilter.ActiveAll,
    vatAcct: glAccountFilter.VATOutputAcct,
    discAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;

  const updateTotalsDisplay = (
    grossAmt,
    discAmt,
    netDisc,
    vat,
    atc,
    amtDue,
  ) => {
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

  useEffect(() => {
    const debitSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0,
    );
    const creditSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0,
    );
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
    });
  }, [detailRowsGL]);

  useEffect(() => {
    if (resetFlag) {
      handleReset();
    }
    let timer;
    if (isLoading) {
      updateState({ showSpinner: true });
    } else {
      updateState({ showSpinner: false });
    }
  }, [resetFlag, isLoading]);

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  useEffect(() => {
    if (custName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map((row) => ({
        ...row,
        currency: custName.currCode,
      }));
      updateState({ detailRows: updatedRows });
    }
  }, [custName?.currCode]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    handleReset();
  }, []);

  // NEW Dropdown Fetching Logic (Adopted from CR.jsx)
  useEffect(() => {
    if (!refsLoaded) return;

    // 1. Fetch data synchronously using the dropdown utility
    const jvTran = getAllDropDown("JVTRAN_TYPE", docType);
    const refDoc = getAllDropDown("JVDOC_TYPE", docType);

    // 2. Build a single update object to avoid multiple re-renders
    const updates = {};

    if (jvTran.length > 0) {
      updates.jvTypes = jvTran;
      updates.selectedJVType = "JV01";
    }

    if (refDoc.length > 0) {
      updates.refdocTypes = refDoc;
      updates.selectedRefDocType = "JV";
    }

    // 3. Batch the update if any data was found
    if (Object.keys(updates).length > 0) {
      updateState(updates);
    }
  }, [docType, refsLoaded]);

  // OPTIMIZED: Parallel data loading for speed (Removed dropdown calls)
  const loadInitialData = async () => {
    updateState({ isLoading: true, showSpinner: true });
    try {
      const [hsOptionReq, fieldLengthsReq, docControlReq] = await Promise.all([
        useTopHSOption(),
        useFieldLenghtCheck("jv_hd,jv_dt1,jv_dt2"),
        useTopDocControlRow(docType),
      ]);

      let currReq = null;
      if (hsOptionReq?.glCurrDefault) {
        currReq = await useTopCurrencyRow(hsOptionReq.glCurrDefault);
      }

      const stateUpdates = {
        isLoading: false,
        showSpinner: false,
      };

      if (docControlReq) {
        stateUpdates.documentName = docControlReq.docName;
        stateUpdates.documentSeries = docControlReq.docName;
        stateUpdates.documentDocLen = docControlReq.docName;
      }
      if (hsOptionReq) {
        stateUpdates.glCurrMode = hsOptionReq.glCurrMode;
        stateUpdates.glCurrDefault = hsOptionReq.glCurrDefault;
        stateUpdates.currCode = hsOptionReq.glCurrDefault;
        stateUpdates.glCurrGlobal1 = hsOptionReq.glCurrGlobal1;
        stateUpdates.glCurrGlobal2 = hsOptionReq.glCurrGlobal2;
        stateUpdates.glCurrGlobal3 = hsOptionReq.glCurrGlobal3;
      }
      if (currReq) {
        stateUpdates.currName = currReq.currName;
        stateUpdates.currRate = formatNumber(1, 6);
      }
      if (fieldLengthsReq) {
        stateUpdates.tblFieldArray = fieldLengthsReq;
      }

      updateState(stateUpdates);
    } catch (err) {
      console.error("Error fetching initial data:", err);
      updateState({ isLoading: false, showSpinner: false });
    }
  };

  const handleReset = () => {
    loadInitialData();
    updateState({
      header: { jv_date: useGetCurrentDayV2() },
      branchCode: "HO",
      branchName: "Head Office",
      refDocNo: "",
      refDocNo2: "",
      fromDate: null,
      toDate: null,
      remarks: "",
      custName: "",
      custCode: "",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      activeTab: "basic",
      GLactiveTab: "entries",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "Open",
    });
    updateTotalsDisplay(0, 0, 0, 0, 0, 0);
  };

  const loadCurrencyMode = (
    mode = glCurrMode,
    defaultCurr = glCurrDefault,
    curr = currCode,
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

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay(0, 0, 0, 0, 0, 0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "jvNo",
        direction,
      );

      if (!data?.jvId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      const jvDateForHeader = data.jvDate ? useformatToDatev2(data.jvDate) : "";

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        jvAmount: formatNumber(item.jvAmount),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
        slRefDate: glRow.slRefDate ? useformatToDatev2(glRow.slRefDate) : "",
      }));

      updateState({
        documentStatus: data.jvStatus,
        status: data.docStatus,
        documentID: data.jvId,
        documentNo: data.jvNo,
        branchCode: data.branchCode,
        header: { ...state.header, jv_date: jvDateForHeader },
        selectedJVType: data.jvtranType,
        noReprints: data.noReprints,
        selectedRefDocType: data.refDocType,
        custCode: data.slCode,
        custName: data.slName,
        refDocNo: data.refDocNo,
        refDocNo2: data.refDocNo1,
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
      Swal.fire({ icon: "error", title: "Fetch Error", text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const fetchTranDataReversal = async (documentNo, branchCode, docType) => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay(0, 0, 0, 0, 0, 0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranDataReversal(
        documentNo,
        branchCode,
        docType,
        selectedRefDocType,
        "refDocNo",
      );

      if (!data?.jvId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => ({
        ...item,
        jvAmount: formatNumber(item.jvAmount),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
      }));

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
        slRefDate: glRow.slRefDate ? useformatToDatev2(glRow.slRefDate) : "",
      }));

      updateState({
        custCode: data.slCode,
        custName: data.slName,
        refDocNo2: data.refDocNo1,
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
      Swal.fire({ icon: "error", title: "Fetch Error", text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleSviNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };

  const handleActivityOption = async (action) => {
    if (action === "Upsert" && detailRowsGL.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please add at least one GL Entry before saving.",
      });
      return;
    }

    if (documentStatus === "") {
      updateState({ isLoading: true });

      const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedJVType,
        selectedRefDocType,
        custCode,
        custName,
        refDocNo,
        refDocNo2,
        fromDate,
        toDate,
        currCode,
        currName,
        currRate,
        remarks,
        detailRows,
        detailRowsGL,
      } = state;

      const glData = {
        branchCode: branchCode,
        jvNo: documentNo || "",
        jvId: documentID || "",
        jvDate: header.jv_date.includes("/")
          ? new Date(header.jv_date).toISOString().split("T")[0]
          : header.jv_date,
        jvtranType: selectedJVType,
        refDocType: selectedRefDocType,
        slCode: custCode,
        slName: custName,
        refDocNo: refDocNo,
        refDocNo2: refDocNo2,
        docAmt: parseFormattedNumber(totals.totalGrossAmount) || 0,
        fromDate: fromDate,
        toDate: toDate,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        remarks: remarks || "",
        userCode: user.USER_CODE,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          jvSpecs: row.jvSpecs || "",
          jvAmount: parseFormattedNumber(row.jvAmount || 0),
          vatCode: row.vatCode,
          vatName: row.vatName,
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          atcCode: row.atcCode || "",
          atcName: row.atcName || "",
          atcAmount: parseFormattedNumber(row.atcAmount),
          vatAcct: row.vatAcct,
          rcCode: row.rcCode,
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
          slRefDate: entry.slRefDate
            ? new Date(entry.slRefDate).toISOString().split("T")[0]
            : null,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || "",
        })),
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
          const response = await useTransactionUpsert(
            docType,
            glData,
            updateState,
            "jvId",
            "jvNo",
          );
          if (response) {
            useSwalshowSaveSuccessDialog(
              () => {
                handleReset();
                setTopTab("history");
              },
              () => handleSaveAndPrint(response.data[0].jvId),
            );
          }
        } catch (error) {
          console.error("Error during transaction upsert:", error);
        } finally {
          updateState({ isLoading: false });
        }

        updateState({ isDocNoDisabled: true, isFetchDisabled: true });
      }
    }
  };

  const handleAddRow = async () => {
    try {
      const items = await handleFetchDetail(custCode);
      const itemList = Array.isArray(items) ? items : [items];
      const newRows = await Promise.all(
        itemList.map(async (item) => {
          return {
            lnNo: "",
            atcCode: item.atcCode || "",
            atcName: item.atcName || "",
            atcAmount: "0.00",
            jvAmount: "0.00",
            vatAcct: item.vatAcctCode,
            rcCode: "",
          };
        }),
      );

      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);

      setTimeout(() => {
        const tableContainer = document.querySelector(".max-h-\\[430px\\]");
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
    const newRow = {
      acctCode: "",
      rcCode: "",
      sltypeCode: "",
      slCode: "",
      particular: "",
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
      slRefDate: "",
      remarks: "",
    };

    const updatedRowsGL = [...detailRowsGL];

    if (index !== null && index >= 0) {
      updatedRowsGL.splice(index + 1, 0, newRow);
    } else {
      updatedRowsGL.push(newRow);
    }

    updateState({
      detailRowsGL: updatedRowsGL,
    });
  };

  const handleDeleteRowGL = (index) => {
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

      const vendResponse = await postRequest(
        "addCustomerDetail",
        JSON.stringify(custPayload),
      );
      const rawResult = vendResponse.data[0]?.result;

      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const handlePrint = async () => {
    if (!detailRowsGL) {
      return;
    }
    updateState({ showSignatoryModal: true });
  };

  const handleCancel = async () => {
    if (documentID && documentStatus === "") {
      updateState({ showCancelModal: true });
    }
  };

  const handlePost = async () => {
    if (documentID && documentStatus === "") {
      updateState({ showPostModal: true });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (!detailRowsGL || detailRowsGL.length === 0) {
      return;
    }

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        isDocNoDisabled: false,
        isFetchDisabled: false,
        noReprints: "0",
      });
    }
    Swal.fire({
      icon: "success",
      title: "Transaction Copied",
      text: "Identifiers cleared. You can now modify and save this as a new JV.",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const cleanUrl = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  const handleHistoryRowPick = useCallback((row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;
    fetchTranData(docNo, branchCode);
    setTopTab("details");
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("jvNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
      cleanUrl();
    }
  }, [location.search, handleHistoryRowPick, cleanUrl]);

  const printData = {
    jv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
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
        custCode: selectedData?.custCode || "",
        custName: selectedData?.custName || "",
        currCode: selectedData?.currCode || "",
      };

      updateState({
        custName: selectedData.custName,
        custCode: selectedData.custCode,
      });

      if (!selectedData.currCode) {
        const payload = { CUST_CODE: selectedData.custCode };
        const response = await postRequest(
          "getCustomer",
          JSON.stringify(payload),
        );

        if (response.success) {
          const data = JSON.parse(response.data[0].result);
          custDetails.currCode = data[0]?.currCode;
        } else {
          console.warn(
            "API call for getCustomer returned success: false",
            response.message,
          );
        }
      }

      await Promise.all([
        handleSelectCurrency(custDetails.currCode),
        updateState({ attention: custDetails.attention }),
      ]);
    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const updateTotals = (rows) => {
    let totalVAT = 0;
    let totalATC = 0;
    let totalJvAmt = 0;

    rows.forEach((row) => {
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
      const jvAmount = parseFormattedNumber(row.jvAmount || 0) || 0;

      totalJvAmt += jvAmount;
      totalVAT += vatAmount;
      totalATC += atcAmount;
    });

    updateTotalsDisplay(
      totalJvAmt + totalVAT + totalATC,
      0,
      totalJvAmt,
      totalVAT,
      totalATC,
      totalJvAmt,
    );
  };

  const handleDetailChange = async (
    index,
    field,
    value,
    runCalculations = true,
  ) => {
    const updatedRows = [...detailRows];
    let row = { ...updatedRows[index] };

    if (field === "vatCode") {
      row.vatCode = value.vatCode;
      row.vatAcct = value.acctCode;
      row.vatName = value.vatName;
    }

    if (field === "atcCode") {
      row.atcCode = value.atcCode;
      row.atcName = value.atcName;
    }

    if (field === "billCode") {
      row.jvAmount = "0.00";
      row.vatAmount = "0.00";
      row.atcAmount = "0.00";
    }

    if (["glAcct", "discAcct"].includes(field)) {
      row[field] = value.acctCode;
    }

    if (field === "rcCode") {
      row.rcCode = value.rcCode;
    }

    if (runCalculations) {
      const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

      if (field === "vatCode" || field === "atcCode") {
        async function updateVatAndAtc() {
          const currentJvAmt = parseFormattedNumber(row.jvAmount) || 0;
          let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

          if (field === "vatCode") {
            newVatAmount = row.vatCode
              ? await useTopVatAmount(row.vatCode, currentJvAmt)
              : 0;
            row.vatAmount = newVatAmount.toFixed(2);
          }

          const newNetOfVat = +(currentJvAmt - newVatAmount).toFixed(2);
          const newATCAmount = row.atcCode
            ? await useTopATCAmount(row.atcCode, newNetOfVat)
            : 0;

          row.atcAmount = newATCAmount.toFixed(2);
          row.jvAmount = +(currentJvAmt - newATCAmount).toFixed(2);
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

    if (
      [
        "acctCode",
        "slCode",
        "rcCode",
        "sltypeCode",
        "vatCode",
        "atcCode",
      ].includes(field)
    ) {
      const data = await useUpdateRowGLEntries(
        row,
        field,
        value,
        custCode,
        docType,
      );
      if (data) {
        row.acctCode = data.acctCode;
        row.sltypeCode = data.sltypeCode;
        row.slCode = data.slCode;
        row.rcCode = data.rcCode;
        row.vatCode = data.vatCode;
        row.vatName = data.vatName;
        row.atcCode = data.atcCode;
        row.atcName = data.atcName;
        row.particular = data.particular;
      }
    }

    if (
      [
        "debit",
        "credit",
        "debitFx1",
        "creditFx1",
        "debitFx2",
        "creditFx2",
      ].includes(field)
    ) {
      row[field] = value;
      const parsedValue = parseFormattedNumber(value);
      const pairs = {
        debit: "credit",
        credit: "debit",
        debitFx1: "creditFx1",
        creditFx1: "debitFx1",
        debitFx2: "creditFx2",
        creditFx2: "debitFx2",
      };

      if (parsedValue > 0 && pairs[field]) {
        row[pairs[field]] = "0.00";
      }
    }

    if (["slRefNo", "slRefDate", "remarks"].includes(field)) {
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

    if (
      autoCompute &&
      ((withCurr2 && currCode !== glCurrDefault) || withCurr3)
    ) {
      if (
        [
          "debit",
          "credit",
          "debitFx1",
          "creditFx1",
          "debitFx2",
          "creditFx2",
        ].includes(field)
      ) {
        const data = await useUpdateRowEditEntries(
          row,
          field,
          value,
          currCode,
          currRate,
          header.jv_date,
        );
        if (data) {
          row.debit = formatNumber(data.debit);
          row.credit = formatNumber(data.credit);
          row.debitFx1 = formatNumber(data.debitFx1);
          row.creditFx1 = formatNumber(data.creditFx1);
          row.debitFx2 = formatNumber(data.debitFx2);
          row.creditFx2 = formatNumber(data.creditFx2);
        }
      }
    } else {
      const pairs = [
        ["debit", "credit"],
        ["debitFx1", "creditFx1"],
        ["debitFx2", "creditFx2"],
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
      const specialAccounts = ["salesAcct", "arAcct", "discAcct", "vatAcct"];
      if (specialAccounts.includes(accountModalSource)) {
        handleDetailChange(
          selectedRowIndex,
          accountModalSource,
          selectedAccount,
          false,
        );
      } else {
        handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
      }
    }
    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, "rcCode", selectedRc, false);
      } else {
        const result = await useTopRCRow(selectedRc.rcCode);
        if (result) {
          handleDetailChangeGL(selectedRowIndex, "rcCode", result);
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
        handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
      }
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
    });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && documentID !== null) {
      const result = await useHandleCancel(
        docType,
        documentID,
        user.USER_CODE,
        confirmation.password,
        confirmation.reason,
        updateState,
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
    updateState({ showCancelModal: false });
  };

  const handleClosePost = async (confirmation) => {
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(
        docType,
        documentID,
        "NSI",
        updateState,
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

  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);
    updateState({ showSpinner: false });
  };

  const handleCloseBillCodeModal = async (selectedBillCode) => {
    if (selectedBillCode && selectedRowIndex !== null) {
      const result = await useTopBillCodeRow(selectedBillCode.billCode);
      if (result) {
        handleDetailChange(selectedRowIndex, "billCode", result);
      }
    }
    updateState({
      showBillCodeModal: false,
      selectedRowIndex: null,
    });
  };

  const handleCloseVatModal = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, "vatCode", result, true)
        : handleDetailChangeGL(selectedRowIndex, "vatCode", result);
    }
    updateState({
      showVatModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseAtcModal = async (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, "atcCode", result, true)
        : handleDetailChangeGL(selectedRowIndex, "atcCode", result);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
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

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      handleSelectCurrency(selectedCurrency.currCode);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (currCode) => {
    if (currCode) {
      const result = await useTopCurrencyRow(currCode);
      if (result) {
        const rate =
          currCode === glCurrDefault
            ? defaultCurrRate
            : await useTopForexRate(currCode, header.jv_date);

        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate), 6),
        });
      }
    }
  };

  const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
      handleSelectBillTerm(selectedBillTerm.billtermCode);
    }
    updateState({ billtermModalOpen: false });
  };

  const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {
      const result = await useTopBillTermRow(billtermCode);
      if (result) {
        updateState({
          billtermCode: result.billtermCode,
          billtermName: result.billtermName,
          daysDue: result.daysDue,
        });
      }
    }
  };

const handleTranDocNoRetrieval = async (data) => {
  await fetchTranData(data.docNo, data.branchCode || branchCode, data.key);
  updateState({ showAllTranDocNo: data.modalClose });
};

const handleTranDocNoSelection = async (data) => {
  handleReset(); 
  updateState({
    showAllTranDocNo: false,
    documentNo: data.docNo,
  });
  fetchTranData(data.docNo, data.branchCode || branchCode);
};

  const handleJVTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedJVType: selectedType });
  };

  const handleRefDocTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedRefDocType: selectedType });
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
          printData={printData}
          onReset={handleReset}
          onSave={() => handleActivityOption("Upsert")}
          onPost={handlePost}
          onCancel={handleCancel}
          onCopy={handleCopy}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/JV"
          isSaveDisabled={
            state.isSaveDisabled || isFormDisabled || detailRowsGL.length === 0
          }
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
          isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={
            !documentID ||
            displayStatus === "CANCELLED" ||
            displayStatus === "FINALIZED"
          }
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        {/* Header Section */}
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        {/* Form Layout with Tabs */}
        <div className="global-tran-header-div-ui">
          {/* Tab Navigation */}
          <div className="global-tran-header-tab-div-ui">
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
          </div>

          {/* JV Header Form Section - Main Grid Container */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative"
            id="jv_hd"
          >
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  disabled={
                    state.isFetchDisabled ||
                    state.isDocNoDisabled ||
                    isFormDisabled
                  }
                  onLookup={() => updateState({ branchModalOpen: true })}
                />

                <FieldRenderer
                  id="jvNo"
                  label="JV No."
                  type="lookup"
                  value={state.documentNo || ""}
                  disabled={state.isDocNoDisabled}
                  onChange={(val) => updateState({ documentNo: val })}
                  onBlur={handleSviNoBlur}
                  onLookup={() => updateState({ showAllTranDocNo: true })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSviNoBlur();
                      document.getElementById("jv_date")?.focus();
                    }
                  }}
                />

                {/* JV Date Picker */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <DateFormatInput
                      id="jv_date"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={header.jv_date}
                      disabled={isFormDisabled}
                      updateState={(updates) => {
                        if (updates.jv_date !== undefined) {
                          updateState({
                            header: { ...header, jv_date: updates.jv_date },
                          });
                        }
                      }}
                    />
                  </div>
                  <label
                    htmlFor="jv_date"
                    className={`global-ref-floating-label ${!isFormDisabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                  >
                    JV Date
                  </label>
                </div>
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="custCode"
                  label="Customer Code"
                  type="lookup"
                  value={custCode || ""}
                  disabled={isFormDisabled}
                  readOnly
                  lookupDisabled={isFetchDisabled}
                  onLookup={() => updateState({ custModalOpen: true })}
                />

                <div className="relative w-full md:w-6/6 lg:w-4/4">
                  <FieldRenderer
                    id="custName"
                    label="Customer Name"
                    type="text"
                    value={custName || ""}
                    disabled
                    readOnly
                  />
                </div>

                <FieldRenderer
                  id="selectedJVType"
                  label="JV Type"
                  type="select"
                  value={selectedJVType}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ selectedJVType: val })}
                  options={jvTypes.map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />
              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="selectedRefDocType"
                  label="Ref Doc Type"
                  type="select"
                  value={selectedRefDocType}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ selectedRefDocType: val })}
                  options={refdocTypes.map((t) => ({
                    label: t.DROPDOWN_NAME,
                    value: t.DROPDOWN_CODE,
                  }))}
                />

                <FieldRenderer
                  id="refDocNo"
                  label="Ref Doc No."
                  type="text"
                  value={refDocNo || ""}
                  disabled={isFormDisabled}
                  onChange={(val) => updateState({ refDocNo: val })}
                  maxLength={useGetFieldLength(tblFieldArray, "refDocNo") || 50}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchTranDataReversal(state.refDocNo, state.branchCode, state.selectedRefDocType);
                    }
                  }}
                />

                <FieldRenderer
                  id="totalGrossAmount"
                  label="Reference Amount"
                  type="amount"
                  value={totals.totalGrossAmount || ""}
                  disabled
                />
              </div>

              {/* Remarks Section */}
              <div className="lg:col-span-3">
                <div className="relative p-2 h-full">
                  <textarea
                    id="remarks"
                    placeholder=" "
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2 h-full"
                    value={remarks}
                    onChange={(e) => updateState({ remarks: e.target.value })}
                    disabled={isFormDisabled}
                    maxLength={
                      useGetFieldLength(tblFieldArray, "remarks") || 250
                    }
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
              {/* Currency */}
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
                lookupDisabled={isFetchDisabled}
              />

              {/* Currency Rate */}
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
              />
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
                  GLactiveTab === "invoice"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
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
                disabled={isLoading || selectedJVType === "JV01"}
                style={{
                  visibility: isFormDisabled ? "hidden" : "visible",
                  opacity: isLoading || selectedJVType === "JV01" ? 0.5 : 1,
                  cursor:
                    isLoading || selectedJVType === "JV01"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {isLoading ? "Generating..." : "Generate GL Entries"}
              </button>
            </div>
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
                    <th className="global-tran-th-ui w-[2000px]">
                      Particulars
                    </th>
                    <th className="global-tran-th-ui">VAT Code</th>
                    <th className="global-tran-th-ui">VAT Name</th>
                    <th className="global-tran-th-ui">ATC Code</th>
                    <th className="global-tran-th-ui ">ATC Name</th>

                    <th className="global-tran-th-ui">
                      Debit ({glCurrDefault})
                    </th>
                    <th className="global-tran-th-ui">
                      Credit ({glCurrDefault})
                    </th>

                    <th
                      className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                    >
                      Debit ({withCurr3 ? glCurrGlobal2 : currCode})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                    >
                      Credit ({withCurr3 ? glCurrGlobal2 : currCode})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                    >
                      Debit ({glCurrGlobal3})
                    </th>
                    <th
                      className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                    >
                      Credit ({glCurrGlobal3})
                    </th>

                    <th className="global-tran-th-ui">SL Ref. No.</th>
                    <th className="global-tran-th-ui">SL Ref. Date</th>
                    <th className="global-tran-th-ui">Remarks</th>

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {detailRowsGL.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.acctCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "acctCode",
                                e.target.value,
                              )
                            }
                          />
                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showAccountModal: true,
                                  accountModalSource: "acctCode",
                                });
                              }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.rcCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "rcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />
                          {!isFormDisabled &&
                            (row.rcCode === "REQ RC" ||
                              (row.rcCode && row.rcCode !== "REQ RC")) && (
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
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "sltypeCode",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.slCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "slCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            (row.slCode === "REQ SL" || row.slCode) && (
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
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "particular",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <div className="relative w-fit">
                          <input
                            type="text"
                            className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                            value={row.vatCode || ""}
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "vatCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            row.vatCode &&
                            row.vatCode.length > 0 && (
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
                            onChange={(e) =>
                              handleDetailChangeGL(
                                index,
                                "atcCode",
                                e.target.value,
                              )
                            }
                            readOnly
                          />

                          {!isFormDisabled &&
                            (row.atcCode !== "" || row.atcCode) && (
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
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "atcName",
                              e.target.value,
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debit || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debit",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debit",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debit", e.target.value)
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.credit || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "credit",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "credit",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "credit", e.target.value)
                          }
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx1 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debitFx1",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debitFx1",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debitFx1", e.target.value)
                          }
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr2 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx1 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "creditFx1",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "creditFx1",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "creditFx1", e.target.value)
                          }
                        />
                      </td>

                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.debitFx2 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "debitFx2",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "debitFx2",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "debitFx2", e.target.value)
                          }
                        />
                      </td>
                      <td
                        className={`global-tran-td-ui text-right ${withCurr3 ? "" : "hidden"}`}
                      >
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.creditFx2 || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(
                              /[^0-9.]/g,
                              "",
                            );
                            if (
                              /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              handleDetailChangeGL(
                                index,
                                "creditFx2",
                                sanitizedValue,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBlurGL(
                                index,
                                "creditFx2",
                                e.target.value,
                                true,
                              );
                            }
                          }}
                          onFocus={(e) => {
                            if (
                              e.target.value === "0.00" ||
                              e.target.value === "0"
                            ) {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                          onBlur={(e) =>
                            handleBlurGL(index, "creditFx2", e.target.value)
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.slRefNo || ""}
                          maxLength={
                            useGetFieldLength(tblFieldArray, "slRefNo") || 50
                          }
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slRefNo",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="global-tran-td-ui">
                        <div className="w-[110px]">
                          <DateFormatInput
                            id={`slRefDate_${index}`}
                            value={row.slRefDate || ""}
                            disabled={isFormDisabled}
                            className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                            updateState={(updates) => {
                              if (updates[`slRefDate_${index}`] !== undefined) {
                                handleDetailChangeGL(
                                  index,
                                  "slRefDate",
                                  updates[`slRefDate_${index}`],
                                );
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.remarks || ""}
                          maxLength={
                            useGetFieldLength(tblFieldArray, "remarks") || 250
                          }
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "remarks",
                              e.target.value,
                            )
                          }
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
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            {/* Totals Section */}
            <div className="global-tran-tab-footer-total-main-div-ui">
              {/* Total Debit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Debit:
                </label>
                <label
                  htmlFor="TotalDebit"
                  className="global-tran-tab-footer-total-value-ui"
                >
                  {totalDebit}
                </label>
              </div>

              {/* Total Credit */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-label-ui"
                >
                  Total Credit:
                </label>
                <label
                  htmlFor="TotalCredit"
                  className="global-tran-tab-footer-total-value-ui"
                >
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
            customParam="OutputService"
          />
        )}

        {/* ATC Code Modal */}
        {showAtcModal && (
          <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />
        )}

        {/* SL Code Lookup Modal */}
        {showSlModal && (
          <SLMastLookupModal
            isOpen={showSlModal}
            onClose={handleCloseSlModalGL}
          />
        )}

        {showCancelModal && (
          <CancelTranModal
            isOpen={showCancelModal}
            onClose={handleCloseCancel}
          />
        )}

        {/* Post Modal - Now uses PostJV.jsx */}
        {showPostModal && (
          <PostJV
            isOpen={showPostModal}
            userCode={user.USER_CODE}
            onClose={() => updateState({ showPostModal: false })}
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
            params={{ noReprints, documentID, docType }}
            onClose={handleCloseSignatory}
            onCancel={() => updateState({ showSignatoryModal: false })}
          />
        )}
        {showAllTranDocNo && (
          <AllTranDocNo
            isOpen={showAllTranDocNo}
            params={{
              branchCode,
              branchName,
              docType,
              documentTitle,
              fieldNo: "jvNo",
            }}
           onRetrieve={handleTranDocNoRetrieval}
    onResponse={{ documentNo: documentNo }} // Pass current docNo
    onSelected={handleTranDocNoSelection}
    onClose={() => updateState({ showAllTranDocNo: false })}
  />
        )}

        {showSpinner && <LoadingSpinner />}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getJVHistory"
          cacheKey={`JV:${state.branchCode || ""}:${state.docNo || ""}`}
          activeTabKey="JV_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status={(() => {
            const s = (state.status || "").toUpperCase();
            if (s === "FINALIZED") return "F";
            if (s === "CANCELLED") return "X";
            if (s === "CLOSED") return "C";
            if (s === "OPEN") return "";
            return "All";
          })()}
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>
    </div>
  );
};

export default JV;
