import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faSpinner,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import MSLookupModal from "../../../Lookup/SearchMSMast.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import SearchPROpenModal from "../../../Lookup/SearchOpenPRBalance.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";

// Configuration
import { postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";

import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopPayTermRow,
  useTopVatRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useHandlePost,
} from "@/NAYSA Cloud/Global/procedure";

import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";

// Header
import Header from "@/NAYSA Cloud/Components/Header";

const PO = () => {
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();

  const { resetFlag } = useReset();

  const [topTab, setTopTab] = useState("details"); // "details" | "history"

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
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "OPEN",
    currRate: "",

    WHcode: "",
    WHname: "",
    warehouseLookupOpen: false,

    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: true,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: true,

    // Header information
    header: {
      po_date: new Date().toISOString().split("T")[0], // PO Date
      dateNeeded: new Date().toISOString().split("T")[0],
      delDate: new Date().toISOString().split("T")[0],
    },

    dateNeeded: new Date().toISOString().split("T")[0],

    branchCode: "HO",
    branchName: "Head Office",
    delAddress: "",

    // Responsibility Center / Requesting Dept
    reqRcCode: "",
    reqRcName: "",
    currCode: "",
    currName: "",
    attention: "",

    // legacy fields – keep but we’ll actually use vendCode / vendName
    vendCOde: "",
    vendName: "",

    // Currency information
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info
    poTranTypes: [],
    poTypes: [],
    selectedPoTranType: "",
    selectedPoType: "",
    cutoffCode: "",
    rcCode: "",
    rcName: "", // responsibility center name for display
    requestDept: "",
    vendCode: "",
    vendNameHeader: "", // internal holder if needed
    refPoNo1: "",
    refPrNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    noReprints: "0",
    poCancelled: "",
    poNo: "",
    payTerm: "",
    userCode: "NSI",
    selectedPOStatus: "",
    vendVatCode: "",
    groupId: "",


    // New for JO-like functions
    paytermCode: "",
    paytermName: "",
    payeeModalOpen: false,
    showPaytermModal: false,
    vatLookupModalOpen: false,
    payeeLookupOpen: false,
    showAllTranDocNo:false,

    // Detail lines
    detailRows: [],

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
    sourcePrNo: "", // selected PR No from modal
    prLookupModalOpen: false,

    // RC Lookup modal (table)
    rcLookupModalOpen: false,
    rcLookupContext: "", // "rc" or "reqDept"

    msLookupModalOpen: false,
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
    isLoading,
    showSpinner,

    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    poNo,
    selectedPOType,

    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,
    poStatus,
    showAllTranDocNo,

    // Header
    branchCode,
    branchName,
    payTerm,
    delAddress,

    // Responsibility Center
    rcCode,
    rcName,

    // Requesting Dept
    reqRcCode,
    reqRcName,

    currCode,
    currName,
    attention,
    poDate,
    cutoffFrom,
    cutoffTo,

    vendCode,
    vendNameHeader,

    poTranTypes,
    poTypes,
    selectedPoTranType,
    selectedPoType,
    cutoffCode,
    requestDept,
    dateNeeded,
    refPoNo1,
    refPrNo2,
    remarks,
    billtermCode,
    billtermName,
    noReprints,
    poCancelled,
    userCode,
    currRate,
    sourcePrNo,
    selectedRowIndex,

    paytermCode,
    paytermName,
    payeeModalOpen,
    showPaytermModal,

    detailRows,

    // Modals
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostModal,
    vatLookupModalOpen,

    // RC Lookup
    rcLookupModalOpen,
    rcLookupContext,

    msLookupModalOpen,
  } = state;

  const [header, setHeader] = useState({
    po_date: new Date().toISOString().split("T")[0],
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [totals, setTotals] = useState({
    totalQtyNeeded: "0.000000",
    totalGross: "0.000000",
    totalVat: "0.000000",
    totalNet: "0.000000",
  });

  // PO.jsx
  const docType = docTypes?.PO || "PO";

  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Purchase Order";

  const displayStatus = status || "OPEN";
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(
    displayStatus,
  );

    const DEC_QTY = 2;
const DEC_PRICE = 2;
const DEC_AMT = 2;

  // ===== Amount / VAT helpers (JO-style, adapted for PO) =====
  const computeVatFromInclusive = (vatRate, grossAmt) => {
    const rate = parseFormattedNumber(vatRate || 0); // % (e.g. 12)
    const gross = parseFormattedNumber(grossAmt || 0); // VAT-inclusive

    if (!rate || !gross) return 0;

    const r = rate * 0.01; // to decimal
    return (gross * r) / (1 + r);
  };

  const recalcDetailRow = (row) => {
    const qty = parseFormattedNumber(row.poQty || row.qtyNeeded || 0);
    const unitPrice = parseFormattedNumber(row.unitPrice || 0);
    const vatRate = row.vatRate ?? 0;

    // 1) Gross = Quantity × Unit Price
    const gross = qty * unitPrice;

    // 2) Discount
    const discRate = parseFormattedNumber(row.discRate || 0); // %
    const discAmt = gross * (discRate / 100);

    const baseAfterDisc = gross - discAmt; // still VAT-inclusive

    // 3) VAT amount using inclusive price method
    const vatAmt = computeVatFromInclusive(vatRate, baseAfterDisc);

    // 4) Net = base - VAT
    const net = baseAfterDisc - vatAmt;

    row.qtyOnHand = formatNumber(parseFormattedNumber(row.qtyOnHand) || 0, DEC_QTY);
row.qtyNeeded = formatNumber(parseFormattedNumber(row.qtyNeeded) || 0, DEC_QTY);
row.poQty     = formatNumber(parseFormattedNumber(row.poQty) || 0, DEC_QTY);

row.unitPrice = formatNumber(parseFormattedNumber(row.unitPrice) || 0, DEC_PRICE);

row.grossAmt  = formatNumber(parseFormattedNumber(row.grossAmt) || 0, DEC_AMT);
row.totalAmt  = formatNumber(parseFormattedNumber(row.totalAmt) || 0, DEC_AMT);
row.vatAmt    = formatNumber(parseFormattedNumber(row.vatAmt) || 0, DEC_AMT);
row.netAmt    = formatNumber(parseFormattedNumber(row.netAmt) || 0, DEC_AMT);


    return {
      ...row,
      grossAmt: formatNumber(gross || 0, DEC_AMT),
      discAmt: formatNumber(discAmt || 0, DEC_AMT),
      totalAmt: formatNumber(baseAfterDisc || 0, DEC_AMT),
      vatAmt: formatNumber(vatAmt || 0, DEC_AMT),
      netAmt: formatNumber(net || 0, DEC_AMT),
    };
  };

  const updateTotalsDisplay = (rows) => {
    const arr = rows || [];

    let qtyNeeded = 0;
    let gross = 0;
    let vat = 0;
    let net = 0;

    arr.forEach((r) => {
      qtyNeeded += parseFormattedNumber(r.qtyNeeded || 0);
      gross += parseFormattedNumber(r.grossAmt || 0);
      vat += parseFormattedNumber(r.vatAmt || 0);
      net += parseFormattedNumber(r.netAmt || 0);
    });

    setTotals({
      totalQtyNeeded: formatNumber(qtyNeeded || 0, 6),
      totalGross: formatNumber(gross || 0, 6),
      totalVat: formatNumber(vat || 0, 6),
      totalNet: formatNumber(net || 0, 6),
    });
  };

  const openSpecsModal = (rowIndex) => {
    if (isFormDisabled) return;

    const current = detailRows?.[rowIndex]?.itemSpecs ?? "";
    updateState({
      specsModalOpen: true,
      specsRowIndex: rowIndex,
      specsTempText: current,
    });
  };

  const closeSpecsModal = () => {
    updateState({
      specsModalOpen: false,
      specsRowIndex: null,
      specsTempText: "",
    });
  };

  const saveSpecsModal = () => {
    const idx = state.specsRowIndex;
    if (idx === null || idx === undefined) return closeSpecsModal();

    const updated = [...detailRows];
    updated[idx] = {
      ...updated[idx],
      itemSpecs: state.specsTempText ?? "",
    };

    updateState({ detailRows: updated });
    closeSpecsModal();
  };

  const handleCloseWarehouseLookup = (row) => {
    if (!row) {
      updateState({ warehouseLookupOpen: false });
      return;
    }

    updateState({
      warehouseLookupOpen: false,
      WHcode: row?.whCode ?? "",
      WHname: row?.whName ?? "",
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
    handleReset();
  }, []);

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size="2x"
          className="text-blue-500 mb-2"
        />
        <p>Please wait...</p>
      </div>
    </div>
  );

  // ==========================
  // INITIAL LOAD / RESET
  // ==========================

  const handleReset = () => {
    loadDocDropDown();
    loadDocControl();
    loadCompanyData();

    const today = new Date().toISOString().split("T")[0];

    updateState({
      header: {
  po_date: today,
  dateNeeded: today,
  delDate: today,
},
dateNeeded: today,
      branchCode: "HO",
      branchName: "Head Office",
      cutoffCode: "",
      rcCode: "",
      rcName: "",
      reqRcCode: "",
      reqRcName: "",
      vendCode: "",
      vendNameHeader: "",
      dateNeeded: today,
      delDate: today,
      sourcePrNo: "",
      refPoNo1: "",
      refPrNo2: "",
      remarks: "",
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
      status: "OPEN",
      noReprints: "0",
      poCancelled: "",
      detailRows: [],
      rcLookupModalOpen: false,
      rcLookupContext: "",
      msLookupModalOpen: false,
      paytermCode: "",
      paytermName: "",
    });

    updateTotalsDisplay([]);
  };

  const loadCompanyData = async () => {
    updateState({ isLoading: true });
    try {
      const [poTranDrop, poTypeDrop] = await Promise.all([
        useTopDocDropDown(docType, "POTRAN_TYPE"),
        useTopDocDropDown(docType, "PO_TYPE"),
      ]);

      if (poTranDrop) {
        updateState({
          poTranTypes: poTranDrop,
          selectedPoTranType: poTranDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }
      if (poTypeDrop) {
        updateState({
          poTypes: poTypeDrop,
          selectedPoType: poTypeDrop[0]?.DROPDOWN_CODE ?? "",
        });
      }

      const hsOption = await useTopHSOption();
      if (hsOption) {
        updateState({
          glCurrMode: hsOption.glCurrMode,
          glCurrDefault: hsOption.glCurrDefault,
          currCode: hsOption.glCurrDefault,
          glCurrGlobal1: hsOption.glCurrGlobal1,
          glCurrGlobal2: hsOption.glCurrGlobal2,
          glCurrGlobal3: hsOption.glCurrGlobal3,
        });

        const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
        if (curr) {
          updateState({
            currName: curr.currName,
            currRate: formatNumber(1, 6),
          });
        }
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

  const loadDocDropDown = async () => {
    const data = await useTopDocDropDown(docType, "POTRAN_TYPE");
    if (data) {
      updateState({
        poTranTypes: data,
        selectedPoTranType: data[0]?.DROPDOWN_CODE ?? "",
      });
    }
  };


  // ==========================
  // FETCH (GET) – PO HEADER + DT1
  // ==========================

  const fetchTranData = async (poNoParam, _branchCode) => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotalsDisplay([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(
        poNoParam,
        _branchCode,
        docType,
        "poNo",
      );

      const today = new Date().toISOString().split("T")[0];

const delDateForHeader = data.delDate
  ? new Date(data.delDate).toISOString().split("T")[0]
  : today;



      console.log("📄 PO PARSED DATA:", data);

      if (!data?.poId) {
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      let poDateForHeader = "";
      if (data.poDate) {
        const d = new Date(data.poDate);
        poDateForHeader = isNaN(d) ? "" : d.toISOString().split("T")[0];
      }

      // normalize header-level dateNeeded
      let dateNeededForHeader = "";
      if (data.dateNeeded) {
        const dn = new Date(data.dateNeeded);
        dateNeededForHeader = isNaN(dn) ? "" : dn.toISOString().split("T")[0];
      }

      const retrievedDetailRows = (data.dt1 || []).map((item) => {
        // ✅ Qty comes from poQuantity; if null, derive from grossAmount / unitCost
        const unitCost = Number(item.unitCost ?? 0) || 0;
        const grossAmt = Number(item.grossAmount ?? 0) || 0;

        const qty =
          Number(item.poQuantity ?? 0) ||
          0 ||
          (unitCost > 0 ? grossAmt / unitCost : 0);

        const dateNeeded =
          item.delDate || data.delDate
            ? new Date(item.delDate || data.delDate).toISOString().split("T")[0]
            : "";

        return {
          ...item,
          lN: item.lN,
          invType: item.invType || "",
          groupId: item.groupId || "",
          poStatus: item.poStatus || "",
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
          uomCode: item.uomCode || "",
          qtyOnHand: formatNumber(item.qtyOnHand ?? 0, 6),
          qtyAlloc: formatNumber(item.qtyAlloc ?? 0, 6),
          qtyNeeded: formatNumber(item.qtyNeeded ?? 0, 6),
          uomCode2: item.uomCode2 || "",
          uomQty2: formatNumber(item.uomQty2 ?? 0, 6),
          dateNeeded: item.dateNeeded
            ? new Date(item.dateNeeded).toISOString().split("T")[0]
            : "",
          itemSpecs: item.itemSpecs || "",
          serviceCode: item.serviceCode || "",
          serviceName: item.serviceName || "",
          // ✅ Qty Needed + PO Qty should match
          qtyNeeded: formatNumber(qty, 6),
          poQty: formatNumber(qty, 6),
          rrQty: formatNumber(item.rrQty ?? 0, 6),

          // NEW amount fields (default to 0 if not present)
          unitPrice: formatNumber(item.unitCost ?? 0, 6),
          // ✅ Amount fields (use the API’s names)
          grossAmt: formatNumber(item.grossAmount ?? 0, 6),
          totalAmt: formatNumber(item.itemAmount ?? 0, 6),
          vatAmt: formatNumber(item.vatAmount ?? 0, 6),
          netAmt: formatNumber(item.netAmount ?? 0, 6),
          vatCode: item.vatCode || ""
        };
      });

      const totalQty = retrievedDetailRows.reduce(
        (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
        0,
      );
      updateTotalsDisplay(retrievedDetailRows);

      const firstPrNo = data?.dt1?.[0]?.prNo || "";

      updateState({
        documentStatus: data.status,
        status: data.status,
        documentID: data.poId,
        groupId: data.groupId || "",
        documentNo: data.poNo,
        branchCode: data.branchCode,
        header: {
  po_date: poDateForHeader,
  dateNeeded: dateNeededForHeader,
  delDate: delDateForHeader || dateNeededForHeader || new Date().toISOString().split("T")[0],
},

        cutoffCode: data.cutoffCode || "",
        rcCode: data.rcCode || "",
        rcName: data.rcName || "",
        selectedPoTranType: data.poTranType || "",
        selectedPoType: data.poType || "",
        dateNeeded: dateNeededForHeader,
        refPoNo1: data.refPoNo1 || "",
        refPrNo2: data.refPrNo2 || "",
        remarks: data.remarks || "",
        poCancelled: data.poCancelled || "",
        noReprints: data.noReprints ?? "0",
        detailRows: retrievedDetailRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,

        vendCode: data.vendCode || "",
        vendNameHeader: data.vendName || "",

        // ✅ Payterm
        paytermCode: data.paytermCode || "",

        // ✅ PR No in header (comes from dt1)
        sourcePrNo: firstPrNo,

        // ✅ Department (you already have rcCode; if your UI shows dept name, your API currently returns rcCode only)
        rcCode: data.rcCode || "",

        // ✅ Correct ref keys (your API uses refpoNo1/refpoNo2)
        refPoNo1: data.refpoNo1 || "",
        refPrNo2: data.refpoNo2 || "",

        // ✅ Correct PO keys (you’re currently using PR keys)
        selectedPoTranType: data.poTranType || "",
        selectedPoType: data.poType || "",

        // ✅ Date needed for header is delDate in your API
        dateNeeded: data.delDate
          ? new Date(data.delDate).toISOString().split("T")[0]
          : "",
          WHcode: data.whCode || "",
WHname: data.whName || "",
      });
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.message,
      });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseMSLookup = (selectedItem) => {
    if (!selectedItem) {
      updateState({ msLookupModalOpen: false });
      return;
    }

    const today = header.po_date || new Date().toISOString().split("T")[0];

    const newRow = {
      invType: "MS",
      groupId: state.groupId || "",
      poStatus: status || "",
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName || "",
      uomCode: selectedItem.uom || "",
      qtyOnHand: formatNumber(selectedItem.qtyHand ?? 0, 6),
      qtyAlloc: "0.000000",
      qtyNeeded: "0.000000",
      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded: today,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",

      // NEW
      unitPrice: "0.000000",
      grossAmt: "0.000000",
      discRate: "0.000000",
      discAmt: "0.000000",
      totalAmt: "0.000000",
      vatCode: "",
      vatAmt: "0.000000",
      netAmt: "0.000000",
      vatRate: 0,
    };

    const updatedRows = [...detailRows, newRow];
    updateState({
      detailRows: updatedRows,
      msLookupModalOpen: false,
    });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0,
    );
    updateTotalsDisplay(updatedRows);
  };

  const handlePrNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) {
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  // ==========================
  // HEADER EVENTS
  // ==========================

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

  const handlePrTranTypeChange = (e) => {
    updateState({ selectedPoTranType: e.target.value });
  };

  const handlePrTypeChange = (e) => {
    updateState({ selectedPoType: e.target.value });
  };

  // ==========================
  // DETAIL HANDLERS
  // ==========================

  const handleAddRowClick = () => {
    // Block if RC or Requesting Dept is blank
    if (!rcCode || !reqRcCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Header Fields",
        text: "Please select both Responsibility Center and Requesting Dept before adding PO lines.",
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    if (isFormDisabled) return;

    // Toggle dropdown
    setShowTypeDropdown((prev) => !prev);
  };

  const handleSelectTypeAndAddRow = (typeCode) => {
    const today = header.po_date || new Date().toISOString().split("T")[0];

    const newRow = {
      invType: typeCode,
      groupId: "",
      poStatus: status || "",
      itemCode: "",
      itemName: "",
      uomCode: "",
      qtyOnHand: "0.000000",
      qtyAlloc: "0.000000",
      qtyNeeded: "0.000000",
      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded: today,
      itemSpecs: "",
      serviceCode: "",
      serviceName: "",
      poQty: "0.000000",
      rrQty: "0.000000",

      // NEW
      unitPrice: "0.000000",
      grossAmt: "0.000000",
      discRate: "0.000000",
      discAmt: "0.000000",
      totalAmt: "0.000000",
      vatCode: "",
      vatAmt: "0.000000",
      netAmt: "0.000000",
      vatRate: 0,
    };

    const updatedRows = [...detailRows, newRow];
    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0,
    );
    updateTotalsDisplay(updatedRows);

    setShowTypeDropdown(false);
  };

  const handleClosePROpenModal = (selection) => {
  // Always close the modal
  if (!selection) {
    updateState({ prLookupModalOpen: false });
    return;
  }

  const header = selection?.header || {};
  const details = Array.isArray(selection?.details) ? selection.details : [];

  const prNo =
    header?.PRNo ||
    header?.prNo ||
    header?.DocNo ||
    header?.docNo ||
    "";

  const prId =
    header?.PrId ||
    header?.prId ||
    "";

  const refBC =
    header?.BC ||
    header?.branchCode ||
    branchCode;

  // Prefer groupId coming from DETAILS (once you add d.group_id AS GroupId in sproc_PHP_PR_Open Detail)
  const pickedGroupId =
    header?.groupId ||
    header?.GroupId ||
    details.find((d) => d?.groupId || d?.GroupId || d?.GROUP_ID)?.groupId ||
    details.find((d) => d?.groupId || d?.GroupId || d?.GROUP_ID)?.GroupId ||
    details.find((d) => d?.groupId || d?.GroupId || d?.GROUP_ID)?.GROUP_ID ||
    state?.groupId ||
    "";

  const headerDateNeeded = header?.DateNeeded
    ? String(header.DateNeeded).substring(0, 10)
    : "";

  const newDetailRows = details.map((d, i) => {
    const qty = parseFloat(d?.QtyNeeded ?? 0) || 0;
    const formattedQty = formatNumber(qty, 6);

    const dateNeeded =
      d?.DateNeeded
        ? String(d.DateNeeded).substring(0, 10)
        : headerDateNeeded;

    const rowGroupId =
      d?.groupId ||
      d?.GroupId ||
      d?.GROUP_ID ||
      pickedGroupId ||
      "";

    return {
      lN: i + 1,

      // references
      prNo: prNo || "",
      prId: prId || "",
      refBranchCode: refBC || branchCode,

      invType: d?.Type || "",
      groupId: rowGroupId, // ✅ THIS WILL FLOW INTO PO_DT1.GROUP_ID
      poStatus: status || "",

      itemCode: d?.JobCode || "",
      itemName: d?.ScopeOfWork || "",
      uomCode: d?.UOM || "",

      qtyOnHand: formatNumber(d?.qtyOnHand ?? 0, 6),
      qtyAlloc: "0.000000",
      qtyNeeded: formattedQty,
      poQty: formattedQty,
      rrQty: "0.000000",

      uomCode2: "",
      uomQty2: "0.000000",
      dateNeeded,

      itemSpecs: "",
      serviceCode: "",
      serviceName: "",

      // monetary defaults
      unitPrice: "0.000000",
      grossAmt: "0.000000",
      discRate: "0.000000",
      discAmt: "0.000000",
      totalAmt: "0.000000",
      vatCode: "",
      vatAmt: "0.000000",
      netAmt: "0.000000",
      vatRate: 0,

      // optional (if you use PR balance column later)
      prBalance: formattedQty,
    };
  });

  updateTotalsDisplay(newDetailRows);

  updateState({
    prLookupModalOpen: false,

    // PR reference
    sourcePrNo: prNo,
    sourcePrId: prId,
    groupId: pickedGroupId, // ✅ keep in header state too

    branchCode: refBC || branchCode,

    // dept
    rcCode: header?.rcCode || rcCode,
    rcName: header?.rcName || rcName,

    // requesting RC
    reqRcCode: header?.ReqRcCode || reqRcCode,
    reqRcName: header?.ReqRcName || reqRcName,

    detailRows: newDetailRows,
  });
};



  const handleOpenMSLookup = () => {
    if (isFormDisabled) return;
    setShowTypeDropdown(false);
    updateState({ msLookupModalOpen: true });
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });

    const totalQty = updatedRows.reduce(
      (acc, r) => acc + (parseFormattedNumber(r.qtyNeeded) || 0),
      0,
    );
    updateTotalsDisplay(updatedRows);
  };



const sanitizeNumeric = (v) => {
  const raw = String(v ?? "");
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
};

const formatByField = (field, num) => {
  if (!Number.isFinite(num)) return "";
  if (["unitPrice"].includes(field)) return formatNumber(num, DEC_PRICE);
  if (["qtyOnHand", "qtyNeeded", "poQty"].includes(field)) return formatNumber(num, DEC_QTY);
  if (["grossAmt", "totalAmt", "vatAmt", "netAmt"].includes(field)) return formatNumber(num, DEC_AMT);
  return formatNumber(num, 6); // fallback for other numerics
};

const handleDetailChange = (index, field, value, commit = false) => {
  const updatedRows = [...detailRows];
  const row = { ...(updatedRows[index] || {}) };

  // fields you allow user to type into
  const editableFields = ["unitPrice"]; // add others if needed later

  // If field is not editable, ignore changes (extra safety)
  if (!editableFields.includes(field)) return;

  const sanitized = sanitizeNumeric(value);

  if (commit) {
    const num = parseFormattedNumber(sanitized);
    row[field] = formatByField(field, num);
  } else {
    row[field] = sanitized; // typing mode: don’t force decimals yet
  }

  // IMPORTANT: your computed fields must be recalculated here
  const recalculatedRow = recalcDetailRow(row); // keep your existing function
  updatedRows[index] = recalculatedRow;

  updateState({ detailRows: updatedRows });
  updateTotalsDisplay(updatedRows);
};


  const handleCloseVATLookup = async (selectedVAT) => {
    // Closed the modal without choosing anything
    if (!selectedVAT || selectedRowIndex == null) {
      updateState({
        vatLookupModalOpen: false,
        selectedRowIndex: null,
      });
      return;
    }

    // Clone rows & target row
    const updatedRows = [...detailRows];
    const row = { ...updatedRows[selectedRowIndex] };

    // 1) Set VAT code (and acct code if your PO rows also have acctCode)
    row.vatCode = selectedVAT.vatCode || "";
    row.acctCode = selectedVAT.acctCode || row.acctCode || "";

    // 2) Fetch VAT row to get vatRate from reference table
    let vatRate = 0;
    try {
      const vatRow = await useTopVatRow(row.vatCode);
      vatRate = vatRow?.vatRate ?? 0;
      row.vatRate = vatRate;
    } catch (err) {
      console.error("Error fetching VAT row:", err);
      row.vatRate = row.vatRate ?? 0;
    }

    // 3) Recompute this row’s gross / VAT / net
    const recalculated = recalcDetailRow(row);

    // 4) Save the row back
    updatedRows[selectedRowIndex] = recalculated;

    // 5) Recompute footer totals
    updateTotalsDisplay(updatedRows);

    // 6) Close modal
    updateState({
      vatLookupModalOpen: false,
      selectedRowIndex: null,
      detailRows: updatedRows,
    });
  };

  // ==========================
  // SAVE / UPSERT
  // ==========================
  // ==========================
  // SAVE / UPSERT
  // ==========================
  const handleActivityOption = async (action) => {
    // If already posted/cancelled/finalized, do not allow save
    const stat = String(state.status || "").toUpperCase(); // this holds "O" from API
    const locked = ["FINALIZED", "CANCELLED", "CLOSED", "F", "X", "C"].includes(
      stat,
    );
    if (locked) return;

    if (action !== "Upsert") return;

    updateState({ isLoading: true });

    try {
      const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedPoTranType, // UI only, sproc doesn’t use this
        selectedPoType,
        refPoNo1,
        refPrNo2,
        cutoffCode,
        rcCode,
        reqRcCode,
        reqRcName,
        dateNeeded,
        vendCode,
        vendNameHeader,
        remarks,
        noReprints,
        poCancelled,
        detailRows,
        sourcePrNo,
      } = state;

      const isNew = !documentID;

      // Optionally, pull totals from state.totals if you’re computing them
      const poAmount = parseFormattedNumber(totals.totalGross || 0);
      const vatAmount = parseFormattedNumber(totals.totalVat || 0);
      const discAmount = 0; // or your own discount total
      const advAmount = 0;

      // === PO HEADER (must match sproc_PHP_PO JSON names) ===
      const poData = {
        branchCode: branchCode,

        // 🔹 NEW vs EDIT – same pattern as JO.jsx
        // poNo: isNew ? "" : documentNo || "",
        // poId: isNew ? "" : documentID || "",

        poNo: isNew ? "" : documentNo || "",
        poId: documentID || "",
        groupId: state.groupId || "",

        poDate: header?.po_date, // maps to @_poDate
        cutoffCode: cutoffCode || "", // @_cutoffCode

        rcCode: rcCode || "", // @_rcCode

        vendCode: vendCode || "", // @_vendCode
        vendName: vendNameHeader || "", // @_vendName
        // Optional warehouse / address fields if you have them in state:
        whCode: state.WHcode || "", // @_whCode
        whName: state.WHname || "", // @_whName
        address1: state.address1 || "", // @_address1
        address2: state.address2 || "", // @_address2
        address3: state.address3 || "", // @_address3
        vendContact: state.vendContact || "", // @_vendContact
        paytermCode: state.paytermCode || "", // @_paytermCode

        poType: selectedPoType || "", // 🔹 @_poType
        delDate: state.header?.delDate || state.dateNeeded || null,

        currCode: state.currCode || "PHP", // @_currCode
        currRate: parseFormattedNumber(state.currRate || "1"), // @_currRate

        // 🔹 sproc expects refpoNo1 / refpoNo2 (lowercase p)
        refpoNo1: refPoNo1 || "", // @_refpoNo1
        refpoNo2: refPrNo2 || "", // @_refpoNo2

        poAmount, // @_poAmount
        vatAmount, // @_vatAmount
        discAmount, // @_discAmount
        advAmount, // @_advAmount

        remarks: remarks || "", // @_remarks
        status: status || "", // @_poStatus
        poCancelled: poCancelled || "", // @_poCancelled
        noReprints: Number(noReprints || 0), // @_noReprints
        userCode: userCode || user?.USER_CODE || "NSI", // @_userCode

        // Detail rows
        dt1: detailRows.map((row, index) => {
          const poQty = parseFormattedNumber(row.poQty || row.qtyNeeded || 0);
          const unitCost = parseFormattedNumber(row.unitPrice || 0);

          return {
            LINE_NO: row.lN || index + 1,
            PR_NO: row.prNo || sourcePrNo || null, // if you have per-line prNo, use it
            PO_STATUS: row.poStatus || status || "",
            INV_TYPE: row.invType || "",
            GROUP_ID: row.groupId || state.groupId || "",

            ITEM_CODE: row.itemCode || "",
            ITEM_NAME: row.itemName || "",
            UOM_CODE: row.uomCode || "",

            // ✅ REQUIRED BY SPROC:
            PO_QUANTITY: poQty, // <-- was PO_QTY
            CURR_CODE: state.currCode || "PHP", // <-- add this (or row.currCode if per line)
            DEL_DATE: row.dateNeeded || state.dateNeeded || null, // <-- was DATE_NEEDED

            UOM_CODE2: row.uomCode2 || "",
            UOM_QTY2: parseFormattedNumber(row.uomQty2 || 0),

            UNIT_COST: unitCost,
            FX_AMOUNT: null, // optional

            GROSS_AMOUNT: parseFormattedNumber(row.grossAmt || 0),
            DISC_RATE: parseFormattedNumber(row.discRate || 0),
            DISC_AMOUNT: parseFormattedNumber(row.discAmt || 0),
            NET_AMOUNT: parseFormattedNumber(row.netAmt || 0),

            VAT_CODE: row.vatCode || "",
            VAT_AMOUNT: parseFormattedNumber(row.vatAmt || 0),
            ITEM_AMOUNT: parseFormattedNumber(row.totalAmt || 0),

            ITEM_SPECS: row.itemSpecs || "",
            RR_QTY: parseFormattedNumber(row.rrQty || 0),

            // optional:
            PR_BALANCE: null,
            REF_BRANCHCODE: state.branchCode || null,
            CATEG_CODE: row.groupId || null,
          };
        }),
      };

      // Only send poNo / poId when EDITING existing PO
      if (!isNew) {
        poData.poNo = documentNo || "";
        poData.poId = documentID || "";
      }

      console.log("PO Payload", poData);

      // 1) SAVE / UPSERT
      const response = await useTransactionUpsert(
        docType,
        poData,
        updateState,
        "poId",
        "poNo",
      );

      if (response) {
        const savedPoId = response.data[0]?.poId;
        const savedBranch = branchCode;

        // 3) SUCCESS DIALOG + (optional) PRINT – same as before
        useSwalshowSaveSuccessDialog(handleReset, () =>
          handleSaveAndPrint(savedPoId),
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
    if (detailRows.length === 0) return;

    if (documentID) {
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "Open",
      });
    }
  };

  // ==========================
  // HISTORY – URL PARAM HANDLING
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
  const docNo = params.get("msajNo");
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
    if (confirmation && documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandleCancel(
        docType,
        documentID,
        userCode || "NSI",
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

  const handleClosePost = async () => {
    if (documentStatus !== "OPEN" && documentID !== null) {
      const result = await useHandlePost(
        docType,
        documentID,
        userCode,
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

  const handleSaveAndPrint = async (poId) => {
    updateState({ showSpinner: true });
    await useHandlePrint(poId, docType);
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
    if (!selectedRC) {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
      return;
    }

    const { rcCode: selectedCode, rcName: selectedName } = selectedRC;

    if (rcLookupContext === "rc") {
      updateState({
        rcCode: selectedCode,
        rcName: selectedName,
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else if (rcLookupContext === "reqDept") {
      updateState({
        reqRcCode: selectedCode,
        reqRcName: selectedName,
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    } else {
      updateState({
        rcLookupModalOpen: false,
        rcLookupContext: "",
      });
    }
  };

  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ payeeModalOpen: false });
      return;
    }

    updateState({ payeeModalOpen: false, isLoading: true });

    try {
      let newVendCode = selectedData?.vendCode || "";
      let newVendName = selectedData?.vendName || "";

      // ✅ vendor vat code from lookup row
      let vendVatCodeToUse = selectedData?.vatCode || "";

      // currency: from row → current currCode → default
      let currCodeToUse = selectedData?.currCode || currCode || glCurrDefault;

      // payterm: start from lookup row if it has one
      let paytermCodeToUse = selectedData?.paytermCode || "";

      // If vendor has no currency/payterm/vatCode in lookup row, query getVendMast
      if (
        (!selectedData.currCode || !paytermCodeToUse || !vendVatCodeToUse) &&
        newVendCode
      ) {
        try {
          const vendResponse = await postRequest("getVendMast", {
            VEND_CODE: newVendCode,
          });

          if (vendResponse.success && vendResponse.data?.[0]?.result) {
            const vendData = JSON.parse(vendResponse.data[0].result);
            const vendRow = vendData[0] || {};

            if (!selectedData.currCode && vendRow.currCode)
              currCodeToUse = vendRow.currCode;
            if (!paytermCodeToUse && vendRow.paytermCode)
              paytermCodeToUse = vendRow.paytermCode;

            // ✅ grab vatCode from vendor master if missing
            if (!vendVatCodeToUse && vendRow.vatCode)
              vendVatCodeToUse = vendRow.vatCode;
          }
        } catch (err) {
          console.error("Error getting vendor master:", err);
        }
      }

      // ✅ Apply payee in header
      updateState({
        vendCode: newVendCode,
        vendNameHeader: newVendName,
        vendVatCode: vendVatCodeToUse || "", // ✅ store vendor VAT in state
      });

      // ✅ Apply currency
      await handleSelectCurrency(currCodeToUse);

      // ✅ Auto-apply payterm
      if (paytermCodeToUse) {
        await handleSelectPayTerm(paytermCodeToUse);
      }

      // ✅ If vendor has VAT code: apply to ALL existing detail rows + compute VAT
      if (vendVatCodeToUse) {
        let vatRate = 0;

        try {
          const vatRow = await useTopVatRow(vendVatCodeToUse);
          vatRate = vatRow?.vatRate ?? 0;
        } catch (err) {
          console.error("Error fetching VAT row:", err);
        }

        // apply + recalc rows
        const updatedRows = (detailRows || []).map((r) => {
          const row = {
            ...r,
            vatCode: vendVatCodeToUse,
            vatRate: vatRate,
          };
          return recalcDetailRow(row);
        });

        updateState({ detailRows: updatedRows });
        updateTotalsDisplay(updatedRows);
      }
    } catch (error) {
      console.error("Error in handleClosePayeeModal:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handlePOStatChange = (e) => {
    const selectedType = e.target.value;
    updateState({ selectedJVType: selectedType });
  };

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      await handleSelectCurrency(selectedCurrency.currCode);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (code) => {
    if (code) {
      const result = await useTopCurrencyRow(code);
      if (result) {
        const rate =
          code === glCurrDefault
            ? defaultCurrRate
            : await useTopForexRate(code, header.po_date);

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
      await handleSelectBillTerm(selectedBillTerm.billtermCode);
    }
    updateState({ billtermModalOpen: false });
  };

  const handleSelectBillTerm = async (billtermCodeParam) => {
    if (billtermCodeParam) {
      const result = await useTopBillTermRow(billtermCodeParam);
      if (result) {
        updateState({
          billtermCode: result.billtermCode,
          billtermName: result.billtermName,
          daysDue: result.daysDue,
        });
      }
    }
  };

  // NEW: Payterm handlers (JO-style, header only)
  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm) {
      await handleSelectPayTerm(selectedPayterm.paytermCode);
    }
    updateState({ showPaytermModal: false });
  };

  const handleSelectPayTerm = async (code) => {
    if (!code) return;

    const result = await useTopPayTermRow(code);
    if (!result) return;

    updateState({
      paytermCode: result.paytermCode,
      paytermName: result.paytermName,
    });
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
        fetchTranData(state.documentNo,state.branchCode);
    }
};

  // ==========================
  // RENDER
  // ==========================

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
          onHistory={() => setTopTab("history")}
          isSaveDisabled={isSaveDisabled}
          isResetDisabled={isResetDisabled}
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
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>
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

          {/* PO Header Form Section */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols- gap-4 rounded-lg relative"
            id="pr_hd"
          >
            {/* Columns 1–3 (Header fields) */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Column 1: Branch / PO No / PO Date */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Branch */}
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
                  <label
                    htmlFor="branchName"
                    className="global-tran-floating-label"
                  >
                    Branch
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={
                      state.isFetchDisabled ||
                      state.isDocNoDisabled ||
                      isFormDisabled
                    }
                    onClick={() =>
                      !isFormDisabled && updateState({ branchModalOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* PO No */}
                <div className="relative">
                        <input
                            type="text"
                            id="poNo"
                            value={state.documentNo}
                            onChange={(e) => updateState({ documentNo: e.target.value })}
                            // onBlur={handleDocNoBlur}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleDocNoBlur();
                                e.preventDefault(); 
                                document.getElementById("poDate")?.focus();
                              }}}
                            placeholder=" "
                            className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                            disabled={state.isDocNoDisabled}
                        />
                        <label htmlFor="poNo" className="global-tran-floating-label">
                    PO No.
                  </label>
                  <button
                            className={`global-tran-textbox-button-search-padding-ui ${
                                (state.isFetchDisabled || state.isDocNoDisabled)
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            // disabled={state.isFetchDisabled || state.isDocNoDisabled}
                            onClick={() => {updateState({showAllTranDocNo:true})}}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                </div>

                {/* PO Date */}
                <div className="relative">
                  <input
                    type="date"
                    id="PRDate"
                    className="peer global-tran-textbox-ui"
                    value={header.po_date}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHeader((prev) => ({ ...prev, po_date: v })); // keep if you still use local header
                      updateState({
                        header: { ...(state.header || {}), po_date: v },
                      });
                    }}
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="PRDate"
                    className="global-tran-floating-label"
                  >
                    PO Date
                  </label>
                </div>
                {/* PR No. (Source PR for PO) */}
                <div className="relative">
                  <input
                    type="text"
                    id="sourcePrNo"
                    value={sourcePrNo}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui cursor-pointer select-none"
                    onFocus={(e) => e.target.blur()}
                  />
                  <label
                    htmlFor="sourcePrNo"
                    className="global-tran-floating-label"
                  >
                    Reference PR No.
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFormDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() => updateState({ prLookupModalOpen: true })}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Column 2: Department / Payee / Attention */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Department */}
                <div className="relative">
                  <input
                    type="text"
                    id="rcName"
                    value={rcCode}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="rcName"
                    className="global-tran-floating-label"
                  >
                    Department
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        rcLookupModalOpen: true,
                        rcLookupContext: "rc",
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Payee Code */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="vendCode"
                    value={vendCode}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="vendCode"
                    className="global-tran-floating-label"
                  >
                    Payee Code <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        payeeModalOpen: true,
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Payee Name */}
                <div className="relative">
                  <input
                    type="text"
                    id="vendName"
                    value={vendNameHeader}
                    placeholder=" "
                    onChange={(e) =>
                      updateState({ vendNameHeader: e.target.value })
                    }
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="vendName"
                    className="global-tran-floating-label"
                  >
                    Payee Name <span className="text-red-500">*</span>
                  </label>
                </div>

                {/* Attention */}
                <div className="relative">
                  <input
                    type="text"
                    id="attention"
                    value={attention}
                    placeholder=" "
                    onChange={(e) => updateState({ attention: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="attention"
                    className="global-tran-floating-label"
                  >
                    Attention
                  </label>
                </div>
              </div>

              {/* Column 3: Currency / Rate / Payterm / Status */}
              <div className="global-tran-textbox-group-div-ui">
                {/* Currency + Rate */}
                <div className="flex space-x-4">
                  {/* Currency */}
                  <div className="relative flex-grow w-2/3">
                    <input
                      type="text"
                      id="currCode"
                      value={currCode}
                      className="peer global-tran-textbox-ui hidden"
                      readOnly
                    />
                    <input
                      type="text"
                      id="currName"
                      value={currName}
                      className="peer global-tran-textbox-ui"
                      readOnly
                    />

                    <label
                      htmlFor="currCode"
                      className="global-tran-floating-label"
                    >
                      Currency
                    </label>
                    <button
                      onClick={() => {
                        updateState({ currencyModalOpen: true });
                      }}
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

                {/* Currency Rate */}
                <div className="relative flex-grow">
                  <input
                    type="text"
                    id="currRate"
                    value={currRate}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                      if (
                        /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
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
                    placeholder=" "
                    className="peer global-tran-textbox-ui text-right"
                    disabled={isFormDisabled || glCurrDefault === currCode}
                  />

                  <label
                    htmlFor="currName"
                    className="global-tran-floating-label"
                  >
                    Currency Rate
                  </label>
                </div>

                {/* Payterm */}
                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="payTerm"
                    // show description first, fall back to code if no name
                    value={paytermName || paytermCode}
                    readOnly
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="payTerm"
                    className="global-tran-floating-label"
                  >
                    Payterm <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({
                        showPaytermModal: true,
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* PO Status (just select UI) */}
                <div className="relative">
                  <select
                    id="poStatus"
                    className="peer global-tran-textbox-ui"
                    value={selectedPoType}
                    onChange={handlePrTypeChange}
                    disabled={isFormDisabled}
                  >
                    <option value="">Open</option>
                    <option value="">Closed</option>
                    <option value="">Cancelled</option>
                  </select>
                  <label
                    htmlFor="poStatus"
                    className="global-tran-floating-label"
                  >
                    PO Status
                  </label>
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Column 4*/}
              <div className="global-tran-textbox-group-div-ui">
                {/* Currency + Rate */}
                <div className="flex space-x-4">
                  {/* Currency */}
                  <div className="relative flex-grow w-2/3">
                    <select
                      id="poTypes"
                      className="peer global-tran-textbox-ui"
                      value={selectedPoType}
                      onChange={handlePrTypeChange}
                      disabled={isFormDisabled}
                    >
                      <option value="">Local</option>
                      <option value="">Foreign</option>
                    </select>
                    <label
                      htmlFor="poTypes"
                      className="global-tran-floating-label"
                    >
                      PO Type
                    </label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <svg
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* WareHouse  */}

                <div className="relative group flex-[1.3]">
                  <input
                    type="text"
                    id="WHcode"
                    value={state.WHname || state.WHcode || ""}
                    readOnly
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="WHcode"
                    className="global-tran-floating-label"
                  >
                    Warehouse
                  </label>
                  <button
                    type="button"
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled
                        ? "global-tran-textbox-button-search-disabled-ui"
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    disabled={isFormDisabled}
                    onClick={() =>
                      !isFormDisabled &&
                      updateState({ warehouseLookupOpen: true })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                  <div></div>
                </div>

                {/* Delivery Address */}
                <div className="relative">
                  <input
                    type="text"
                    id="attention"
                    value={delAddress}
                    placeholder=" "
                    onChange={(e) =>
                      updateState({ delAddress: e.target.value })
                    }
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="delAddress"
                    className="global-tran-floating-label"
                  >
                    Delivery Address
                  </label>
                </div>

                <div className="relative group flex-[1.3]">
                  <input
                    type="date"
                    id="delDate"
                    value={state.header?.delDate || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateState({
                        header: { ...(state.header || {}), delDate: v },
                        dateNeeded: v, // keep your existing usage consistent
                      });
                    }}
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                    disabled={isFormDisabled}
                  />
                  <label
                    htmlFor="delDate"
                    className="global-tran-floating-label"
                  >
                    Delivery Date
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
            PO DETAIL TABLE
           ===================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Item Detail
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-collapse">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    <th className="global-tran-th-ui">LN</th>
                    <th className="global-tran-th-ui">PR Status</th>
                    <th className="global-tran-th-ui">Type</th>
                    <th className="global-tran-th-ui">Item Code</th>
                    <th className="global-tran-th-ui">Item Description</th>
                    <th className="global-tran-th-ui">Specification</th>
                    <th className="global-tran-th-ui">UOM</th>
                    <th className="global-tran-th-ui">Qty on Hand</th>
                    <th className="global-tran-th-ui">Qty Needed</th>
                    <th className="global-tran-th-ui">PO Qty</th>
                    <th className="global-tran-th-ui">Unit Price</th>
                    <th className="global-tran-th-ui">Gross Amt</th>
                    <th className="global-tran-th-ui">Disc Rate</th>
                    <th className="global-tran-th-ui">Disc Amt</th>
                    <th className="global-tran-th-ui">Total Amt</th>
                    <th className="global-tran-th-ui">VAT Code</th>
                    <th className="global-tran-th-ui">VAT Amt</th>
                    <th className="global-tran-th-ui">Net Amt</th>
                    <th className="global-tran-th-ui">Date Needed</th>
                    <th className="global-tran-th-ui">RR Qty</th>
                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Delete
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {detailRows.map((row, index) => (
                    <tr key={index} className="global-tran-tr-ui">
                      {/* LN */}
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      {/* PR Status */}
                      <td className="global-tran-td-ui">
                        <select
                          className="w-[120px] global-tran-td-inputclass-ui"
                          value={row.prStatus || "OPEN"}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "prStatus",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        >
                          <option value="OPEN">Open</option>
                          <option value="CLOSED">Closed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>

                      {/* Type */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui"
                          value={row.invType || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "invType", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Item Code */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui"
                          value={row.itemCode || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "itemCode",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Item Description */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[220px] global-tran-td-inputclass-ui"
                          value={row.itemName || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "itemName",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                     {/* Specification */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[220px] global-tran-td-inputclass-ui cursor-pointer"
                          value={row.itemSpecs || ""}
                          readOnly
                          onDoubleClick={() => openSpecsModal(index)}
                          title="Double-click to edit specification"
                        />
                      </td>

                      {/* UOM */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[80px] global-tran-td-inputclass-ui"
                          value={row.uomCode || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "uomCode", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Qty on Hand */}
                      <td className="global-tran-td-ui text-right">
                        <input
  type="text"
  className="global-tran-td-inputclass-ui text-right bg-gray-100 cursor-not-allowed"
  value={row.qtyOnHand || ""}
  readOnly
  tabIndex={-1}
/>

                      </td>

                      {/* Qty Needed */}
                      <td className="global-tran-td-ui text-right">
                        <input
  type="text"
  className="global-tran-td-inputclass-ui text-right bg-gray-100 cursor-not-allowed"
  value={row.qtyNeeded || ""}
  readOnly
  tabIndex={-1}
/>

                      </td>

                      {/* PO Qty */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.poQty || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "poQty", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Unit Price */}
                       <td className="global-tran-td-ui text-right">
                      <input
  type="text"
  className="w-[120px] global-tran-td-inputclass-ui text-right"
  value={row.unitPrice || ""}
  onChange={(e) => handleDetailChange(index, "unitPrice", e.target.value, false)}
  onBlur={(e) => handleDetailChange(index, "unitPrice", e.target.value, true)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleDetailChange(index, "unitPrice", e.target.value, true);
    }
  }}
  disabled={isFormDisabled}
/>
                      </td>

                      {/* Gross Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.grossAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "grossAmt",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Disc Rate */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[100px] global-tran-td-inputclass-ui text-right"
                          value={row.discRate || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "discRate",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Disc Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.discAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "discAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Total Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.totalAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "totalAmt",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* VAT Code */}
                      <td className="global-tran-td-ui">
                        <input
                          type="text"
                          className="w-[80px] global-tran-td-inputclass-ui"
                          value={row.vatCode || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "vatCode", e.target.value)
                          }
                          onDoubleClick={() => {
                            if (isFormDisabled) return;
                            updateState({
                              vatLookupModalOpen: true,
                              selectedRowIndex: index,
                            });
                          }}
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* VAT Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.vatAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "vatAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      

                      {/* Net Amt */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.netAmt || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "netAmt", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* Date Needed (only once, here) */}
                      <td className="global-tran-td-ui">
                        <input
                          type="date"
                          className="w-[130px] global-tran-td-inputclass-ui"
                          value={row.dateNeeded || ""}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              "dateNeeded",
                              e.target.value,
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {/* RR Qty (only once) */}
                      <td className="global-tran-td-ui text-right">
                        <input
                          type="text"
                          className="w-[120px] global-tran-td-inputclass-ui text-right"
                          value={row.rrQty || ""}
                          onChange={(e) =>
                            handleDetailChange(index, "rrQty", e.target.value)
                          }
                          disabled={isFormDisabled}
                        />
                      </td>

                      {showAllTranDocNo && (
                                        <AllTranDocNo
                                          isOpen={showAllTranDocNo}
                                          params={{branchCode,branchName,docType,documentTitle,fieldNo : "msajNo"}}
                                          onRetrieve={handleTranDocNoRetrieval}
                                          onResponse={{documentNo}}
                                          onSelected={handleTranDocNoSelection}
                                          onClose={() => updateState({ showAllTranDocNo: false })}
                                        />
                                      )} 

                      {/* Delete */}
                      {!isFormDisabled && (
                        <td className="global-tran-td-ui text-center sticky right-0">
                          <button
                            className="global-tran-td-button-delete-ui"
                            onClick={() => handleDeleteRow(index)}
                          >
                            -
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Footer: Add Button + Total */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <div className="inline-block">
                {showTypeDropdown && (
                  <div className="mb-2 bg-white dark:bg-slate-800 border rounded-md shadow-lg z-50 min-w-[140px]">
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={() => handleSelectTypeAndAddRow("FG")}
                    >
                      FG
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={handleOpenMSLookup}
                    >
                      MS
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={() => handleSelectTypeAndAddRow("RM")}
                    >
                      RM
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAddRowClick}
                  disabled={isFormDisabled || !rcCode || !reqRcCode}
                  className={`global-tran-tab-footer-button-add-ui ${
                    isFormDisabled || !rcCode || !reqRcCode
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  style={{
                    visibility: isFormDisabled ? "hidden" : "visible",
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Total Qty Needed:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalQtyNeeded}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Gross Amount:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalGross}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  VAT Amount:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalVat}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  Net Amount:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totals.totalNet}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORY TAB */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getPOHistory"
          cacheKey={`PO:${state.branchCode || ""}:${state.documentNo || ""}`}
          activeTabKey="PO_Summary"
          branchCode={state.branchCode}
          startDate={null}
          endDate={null}
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

      {/* MODALS */}
      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {state.prLookupModalOpen && (
        <SearchPROpenModal
          isOpen={state.prLookupModalOpen}
          onClose={handleClosePROpenModal}
          branchCode={branchCode}
          prTranType="PR01"
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

      {billtermModalOpen && (
        <BillTermLookupModal
          isOpen={billtermModalOpen}
          onClose={handleCloseBillTermModal}
        />
      )}

      {custModalOpen && (
        <CustomerMastLookupModal
          isOpen={custModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
        />
      )}

      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}

      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          onClose={handleCloseWarehouseLookup}
          filter="ActiveAll"
          branchCode={branchCode || ""}
        />
      )}

      {showCancelModal && (
        <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />
      )}

      {showPostModal && (
        <PostTranModal isOpen={showPostModal} onClose={handleClosePost} />
      )}

      {state.specsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Specification
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter complete specification / scope of work.
              </p>
            </div>

            <div className="p-4">
              <textarea
                className="w-full h-48 resize-none rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-100 p-3 outline-none focus:ring-2 focus:ring-blue-400"
                value={state.specsTempText || ""}
                onChange={(e) => updateState({ specsTempText: e.target.value })}
                autoFocus
              />
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-xs font-medium rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                onClick={closeSpecsModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={saveSpecsModal}
              >
                Save
              </button>
            </div>
          </div>
        </div>
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

      {msLookupModalOpen && (
        <MSLookupModal
          isOpen={msLookupModalOpen}
          onClose={handleCloseMSLookup}
          customParam={null}
        />
      )}

      {vatLookupModalOpen && (
        <VATLookupModal
          isOpen={vatLookupModalOpen}
          onClose={handleCloseVATLookup}
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>
  );
};

export default PO;
