import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import SearchFALoc from "../../../Lookup/SearchFALoc.jsx";
import SearchFACateg from "../../../Lookup/SearchFACateg.jsx";
import SearchFAClass from "../../../Lookup/SearchFAClass.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalProceedConfirm,
  useSwalHandleOpenSpecsModal,
  useSwalvalidateRequiredFields as validateRequiredFields,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { docTypePDFGuide, docTypeVideoGuide } from "@/NAYSA Cloud/Global/doctype";
import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import {
  useFetchTranData,
  useFieldLenghtCheck as fieldLenghtCheck,
  useGenerateGLEntries,
  useHandleCancel,
  useTransactionUpsert,
  useUpdateRowEditEntries,
  useUpdateRowGLEntries,
} from "@/NAYSA Cloud/Global/procedure";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// FADS Disposal Generation detail fields.
const detailColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "faCode", label: "Asset No.", width: 140 },
  { key: "tagNo", label: "Property Tag", width: 200 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "acqCost", label: "Acq. Cost", width: 120, align: "text-right" },
  { key: "accumDepr", label: "Accum. Depr", width: 120, align: "text-right" },
  { key: "salvageValue", label: "Salvage Value", width: 120, align: "text-right" },
  { key: "nbValue", label: "Net Book Value", width: 120, align: "text-right" },
  { key: "deprAmount", label: "Disposal Amount", width: 120, align: "text-right" },
  { key: "receivableAmount", label: "Receivable Amount", width: 140, align: "text-right" },
  { key: "tradeInValue", label: "Trade In Amount", width: 140, align: "text-right" },
  { key: "gainLossAmount", label: "Gain/Loss Amount", width: 140, align: "text-right" },
  { key: "flocCode", label: "Location Code", width: 100 },
  { key: "flocName", label: "Location", width: 250 },
  { key: "rcCode", label: "Department Code", width: 100 },
  { key: "rcName", label: "Department", width: 200 },
  { key: "empNo", label: "Employee Code", width: 150 },
  { key: "empName", label: "Employee", width: 150 },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category Name", width: 200 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 250 },
  { key: "remarks", label: "Remarks", width: 180 },
];

const areDropdownListsEqual = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  return left.every((item, index) =>
    item?.DROPDOWN_CODE === right[index]?.DROPDOWN_CODE &&
    item?.DROPDOWN_NAME === right[index]?.DROPDOWN_NAME
  );
};

const FADS = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
  } = useAuth();

  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const customerNameBeforeEditRef = useRef("");
  const docType = "FADS";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide[docType] || "";
  const videoLink = docTypeVideoGuide[docType] || "";
  const documentTitle = `${hsDoc?.docName || "FA Disposal"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [glRows, setGlRows] = useState([]);

  const [state, setState] = useState({
    branchCode: currentUserRow?.branchCode || "HO",
    branchName: currentUserRow?.branchName || "HO - Head Office",
    fadsNo: "",
    fadsDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",
    userCode: currentUserRow?.userCode || "",
    documentID: "",
    disposalType: "FSDP06",
    originalDisposalType: "FSDP06",
    disposalTypeList: [],
    custCode: "",
    custName: "",
    vatCode: "",
    vatName: "",
    salesType: "CASH",
    recipientName: "",
    incidentDate: "",
    payeeCode: "",
    payeeName: "",
    damageDate: "",
    insuranceClaimNo: "",
    currCode: companyInfo?.currCode || "",
    currName: companyInfo?.currName || "",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
    glCurrMode: companyInfo?.glCurrMode || "",
    glCurrDefault: companyInfo?.currCode || "",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: companyInfo?.glCurrGlobal1 || "",
    glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",
    assetLocationCode: "",
    assetLocationName: "",
    assetDepartmentCode: "",
    assetDepartmentName: "",
    categCode: "",
    categName: "",
    classCode: "",
    className: "",
    referenceNo: "",
    remarks: "",
    accountModalSource: null,
    branchModalOpen: false,
    custModalOpen: false,
    payeeModalOpen: false,
    showVatModal: false,
    showFAMastLookup: false,
    faLookupRows: [],
    faLookupColumns: [],
    faLookupInsertIndex: null,
    showAccountModal: false,
    showRcModal: false,
    showSlModal: false,
    showFaLocModal: false,
    showFaCategoryModal: false,
    showFaClassModal: false,
    faClassLookupCategCode: "",
    showCancelModal: false,
    showAttachModal: false,
    showAllTranDocNo: false,
    showSignatoryModal: false,
    isLoading: false,
    isGeneratingGL: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    tblFieldArray: [],
  });

  const displayStatus = (state.status || "OPEN").toUpperCase();
  const isPostedOrCancelled = ["FINALIZED", "POSTED", "CANCELLED", "CLOSED"].includes(displayStatus);
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    POSTED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = isViewDocument || isPostedOrCancelled;
  const isCashSalesType = String(state.salesType || "CASH").toUpperCase() === "CASH";
  const isHeaderVatLookupDisabled = isFormDisabled || isCashSalesType;
  const withCostAmount = currentUserRow?.viewCostamt !== "N";
  const selectedDisposalType = String(state.disposalType || "FSDP06").toUpperCase();
  const referenceNoLabel = {
    FSDP03: "Donation Reference No.",
    FSDP04: "Incident Reference No.",
    FSDP05: "Trade In Reference No.",
    FSDP07: "Damage Report No.",
  }[selectedDisposalType] || "Reference No.";
  const disposalAmountLabel = selectedDisposalType === "FSDP01"
    ? "Proceeds Amount"
    : selectedDisposalType === "FSDP05"
      ? "Trade In Amount"
      : "Disposal Amount";

  const updateState = useCallback((updates) => {
    setState((prev) => {
      const nextUpdates = typeof updates === "function" ? updates(prev) : updates;
      if (!nextUpdates || Object.keys(nextUpdates).length === 0) return prev;
      return { ...prev, ...nextUpdates };
    });
  }, []);

  const loadCurrencyMode = useCallback((mode = state.glCurrMode, defaultCurr = state.glCurrDefault, curr = state.currCode) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 = (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

    updateState({
      glCurrMode: mode,
      withCurr2: calcWithCurr2,
      withCurr3: calcWithCurr3,
    });
  }, [state.currCode, state.glCurrDefault, state.glCurrMode, updateState]);

  const visibleDetailColumns = useMemo(() => {
    const amountKeys = withCostAmount
      ? [
          "acqCost",
          "accumDepr",
          "salvageValue",
          "nbValue",
          ...(selectedDisposalType === "FSDP07" ? ["receivableAmount"] : []),
          ...(selectedDisposalType === "FSDP05" ? ["tradeInValue"] : []),
          ...(selectedDisposalType === "FSDP05" ? [] : ["deprAmount"]),
          ...(["FSDP01", "FSDP05", "FSDP07"].includes(selectedDisposalType) ? ["gainLossAmount"] : []),
        ]
      : [];

    const finalKeys = [
      "ln",
      "faCode",
      "tagNo",
      "assetDescription",
      ...amountKeys,
      "flocName",
      "rcName",
      "empName",
      "categName",
      "className",
      "remarks",
    ];

    return finalKeys
      .map((key) => detailColumns.find((column) => column.key === key))
      .map((column) =>
        column?.key === "deprAmount"
          ? { ...column, label: disposalAmountLabel }
          : column
      )
      .filter(Boolean);
  }, [disposalAmountLabel, selectedDisposalType, withCostAmount]);

  const glColumns = useMemo(() => [
    { key: "ln", label: "LN", width: 56, align: "text-center" },
    { key: "acctCode", label: "Account Code", width: 120 },
    { key: "rcCode", label: "RC Code", width: 120 },
    { key: "sltypeCode", label: "SL Type Code", width: 120 },
    { key: "slCode", label: "SL Code", width: 120 },
    { key: "particular", label: "Particulars", width: 320 },
    { key: "debit", label: `Debit (${state.glCurrDefault})`, width: 140, align: "text-right" },
    { key: "credit", label: `Credit (${state.glCurrDefault})`, width: 140, align: "text-right" },
    ...(state.withCurr2
      ? [
          { key: "debitFx1", label: `Debit (${state.withCurr3 ? state.glCurrGlobal2 : state.currCode})`, width: 140, align: "text-right" },
          { key: "creditFx1", label: `Credit (${state.withCurr3 ? state.glCurrGlobal2 : state.currCode})`, width: 140, align: "text-right" },
        ]
      : []),
    ...(state.withCurr3
      ? [
          { key: "debitFx2", label: `Debit (${state.glCurrGlobal3})`, width: 140, align: "text-right" },
          { key: "creditFx2", label: `Credit (${state.glCurrGlobal3})`, width: 140, align: "text-right" },
        ]
      : []),
    { key: "slRefNo", label: "SL Ref. No.", width: 120 },
    { key: "slRefDate", label: "SL Ref. Date", width: 120 },
    { key: "remarks", label: "Remarks", width: 140 },
  ], [
    state.currCode,
    state.glCurrDefault,
    state.glCurrGlobal2,
    state.glCurrGlobal3,
    state.withCurr2,
    state.withCurr3,
  ]);

  const {
    getColumnStyle: getDetailColumnStyle,
    getFrozenColumnStyle: getDetailFrozenStyle,
    getOrderedColumns: getOrderedDetailColumns,
    getSortedRows: getSortedDetailRows,
    setColumnOrder: setDetailColumnOrder,
    clearAllSorting: clearDetailSorting,
    renderResizableHeader: renderDetailHeader,
    renderHeaderContextMenu: renderDetailHeaderContextMenu,
  } = useResizableTableColumns(visibleDetailColumns);

  const {
    getColumnStyle: getGlColumnStyle,
    getFrozenColumnStyle: getGlFrozenStyle,
    getOrderedColumns: getOrderedGlColumns,
    getSortedRows: getSortedGlRows,
    setColumnOrder: setGlColumnOrder,
    clearAllSorting: clearGlSorting,
    renderResizableHeader: renderGlHeader,
    renderHeaderContextMenu: renderGlHeaderContextMenu,
  } = useResizableTableColumns(glColumns);

  const orderedDetailColumns = getOrderedDetailColumns(visibleDetailColumns);
  const orderedGlColumns = getOrderedGlColumns(glColumns);

  useEffect(() => {
    setDetailColumnOrder(visibleDetailColumns.map((column) => column.key));
  }, [setDetailColumnOrder, visibleDetailColumns]);

  useEffect(() => {
    setGlColumnOrder(glColumns.map((column) => column.key));
  }, [glColumns, setGlColumnOrder]);

  useEffect(() => {
    if (state.glCurrMode && state.glCurrDefault && state.currCode) {
      loadCurrencyMode(state.glCurrMode, state.glCurrDefault, state.currCode);
    }

    if (
      state.glCurrDefault &&
      state.currCode &&
      state.glCurrDefault === state.currCode &&
      parseFormattedNumber(state.currRate || 0) !== 1
    ) {
      updateState({ currRate: formatNumber(1, 6) });
    }
  }, [
    loadCurrencyMode,
    state.currCode,
    state.currRate,
    state.glCurrDefault,
    state.glCurrMode,
    updateState,
  ]);

  const sortedDetailRows = getSortedDetailRows(
    detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const sortedGlRows = getSortedGlRows(
    glRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const detailTotals = useMemo(() => ({
    totalDisposalAmount: formatNumber(
      detailRows.reduce((sum, row) => sum + (parseFormattedNumber(row.deprAmount) || 0), 0)
    ),
  }), [detailRows]);

  const glTotals = useMemo(() => {
    const sumField = (field) =>
      glRows.reduce((sum, row) => sum + (parseFormattedNumber(row[field]) || 0), 0);

    return {
      totalDebit: formatNumber(sumField("debit")),
      totalCredit: formatNumber(sumField("credit")),
      totalDebitFx1: formatNumber(sumField("debitFx1")),
      totalCreditFx1: formatNumber(sumField("creditFx1")),
      totalDebitFx2: formatNumber(sumField("debitFx2")),
      totalCreditFx2: formatNumber(sumField("creditFx2")),
    };
  }, [glRows]);

  useEffect(() => {
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown?.("FADSTRAN_TYPE", docType) || [];
    updateState((prev) => {
      const nextDisposalType = prev.disposalType || "FSDP06";
      if (
        prev.disposalType === nextDisposalType &&
        areDropdownListsEqual(prev.disposalTypeList || [], filteredTypes)
      ) {
        return null;
      }

      return {
        disposalTypeList: filteredTypes,
        disposalType: nextDisposalType,
      };
    });
  }, [getAllDropDown, refsLoaded, updateState]);

  useEffect(() => {
    if (!isCashSalesType || (!state.vatCode && !state.vatName)) return;
    updateState({ vatCode: "", vatName: "", showVatModal: false });
  }, [isCashSalesType, state.vatCode, state.vatName, updateState]);

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const hdtblcol_result = await fieldLenghtCheck("fads_hd,fads_dt1,fads_dt2");
      if (hdtblcol_result) updateState({ tblFieldArray: hdtblcol_result });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const getDisposalAmounts = (item = {}, options = {}) => {
    const { disposalType = state.disposalType, recomputeDisposal = false } = options;
    const acqCost = parseFormattedNumber(item.acqCost || 0);
    const accumDepr = parseFormattedNumber(item.accumDepr || 0);
    const salvageValue = parseFormattedNumber(item.salvageValue || 0);
    const nbValue = parseFormattedNumber(item.nbValue || 0);
    let deprAmount = parseFormattedNumber(item.deprAmount ?? item.deprMonth ?? 0);

    if (["FSDP03", "FSDP04", "FSDP06", "FSDP07"].includes(String(disposalType || "").toUpperCase())) {
      deprAmount = nbValue;
    } else if (recomputeDisposal) {
      const depreciableBalance = nbValue - salvageValue;

      if (deprAmount > depreciableBalance) {
        deprAmount = nbValue - salvageValue - accumDepr;
      }

      deprAmount = Math.max(deprAmount, 0);
    }

    return {
      acqCost,
      deprAmount,
      accumDepr,
      salvageValue,
      nbValue,
    };
  };

  const buildDisposalDetailRow = (item = {}, options = {}) => {
    const amounts = getDisposalAmounts(item, options);
    const disposalType = String(options.disposalType || state.disposalType || "").toUpperCase();
    const tradeInValue = parseFormattedNumber(item.tradeInValue || 0);
    const proceedsAmount = disposalType === "FSDP01" && options.isNewAsset
      ? 0
      : disposalType === "FSDP05"
        ? tradeInValue
        : amounts.deprAmount;
    const receivableAmount = Math.max(parseFormattedNumber(item.receivableAmount || 0) || 0, 0);
    const gainLossAmount = disposalType === "FSDP07"
      ? amounts.nbValue - receivableAmount
      : ["FSDP01", "FSDP05"].includes(disposalType)
        ? proceedsAmount - amounts.nbValue
        : parseFormattedNumber(item.gainLossAmount || 0);

    return {
      ...item,
      faCode: item.faCode || "",
      tagNo: item.tagNo || "",
      assetDescription: item.assetDescription || item.faName || "",
      flocCode: item.flocCode || "",
      flocName: item.flocName || "",
      rcCode: item.rcCode || "",
      rcName: item.rcName || "",
      empNo: item.empNo || "",
      empName: item.empName || "",
      categCode: item.categCode || "",
      categName: item.categName || "",
      classCode: item.classCode || "",
      className: item.className || "",
      acqCost: formatNumber(amounts.acqCost),
      deprAmount: formatNumber(proceedsAmount),
      accumDepr: formatNumber(amounts.accumDepr),
      salvageValue: formatNumber(amounts.salvageValue),
      nbValue: formatNumber(amounts.nbValue),
      receivableAmount: formatNumber(receivableAmount),
      tradeInValue: formatNumber(tradeInValue),
      gainLossAmount: formatNumber(gainLossAmount),
      remarks: item.remarks || "",
    };
  };

  const buildDisposalGLRow = (item = {}) => ({
    ...item,
    acctCode: item.acctCode || "",
    rcCode: item.rcCode || "",
    sltypeCode: item.sltypeCode || "",
    slCode: item.slCode || "",
    particular: item.particular || "",
    debit: formatNumber(parseFormattedNumber(item.debit || 0)),
    credit: formatNumber(parseFormattedNumber(item.credit || 0)),
    debitFx1: formatNumber(parseFormattedNumber(item.debitFx1 || 0)),
    creditFx1: formatNumber(parseFormattedNumber(item.creditFx1 || 0)),
    debitFx2: formatNumber(parseFormattedNumber(item.debitFx2 || 0)),
    creditFx2: formatNumber(parseFormattedNumber(item.creditFx2 || 0)),
    slRefNo: item.slRefNo || "",
    slRefDate: useformatToDatev2(item.slRefDate || ""),
    remarks: item.remarks || "",
  });

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({ fadsNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
      setDetailRows([]);
      setGlRows([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(documentNo, branchCode, docType, "fadsNo", direction);

      if (!data?.fadsId) {
        useSwalErrorAlert("No Records Found", "Transaction does not exist.");
        return resetState();
      }

      const fetchedDisposalType = data.disposalType || "FSDP06";
      const retrievedDetailRows = (data.dt1 || []).map((item) =>
        buildDisposalDetailRow(item, { disposalType: fetchedDisposalType })
      );

      const formattedGLRows = (data.dt2 || []).map((glRow) => buildDisposalGLRow(glRow));

      updateState({
        documentStatus: data.fadsHStatus || "",
        status: data.status || "OPEN",
        noReprints: data.noReprints || "0",
        documentID: data.fadsId || "",
        fadsNo: data.fadsNo || "",
        branchCode: data.branchCode || "",
        branchName: data.branchName || "",
        fadsDate: useformatToDatev2(data.fadsDate || ""),
        disposalType: fetchedDisposalType,
        originalDisposalType: fetchedDisposalType,
        custCode: data.custCode || "",
        custName: data.custName || "",
        vatCode: data.vatCode || "",
        vatName: data.vatName || "",
        salesType: data.salesType || "CASH",
        recipientName: data.recipientName || "",
        incidentDate: useformatToDatev2(data.incidentDate || ""),
        payeeCode: data.payeeCode || "",
        payeeName: data.payeeName || "",
        damageDate: useformatToDatev2(data.damageDate || ""),
        insuranceClaimNo: data.insuranceClaimNo || "",
        assetLocationCode: data.assetLocationCode || data.flocCode || "",
        assetLocationName: data.assetLocationName || data.flocName || "",
        assetDepartmentCode: data.assetDepartmentCode || data.rcCode || "",
        assetDepartmentName: data.assetDepartmentName || data.rcName || "",
        categCode: data.categCode || "",
        categName: data.categName || "",
        classCode: data.classCode || "",
        className: data.className || "",
        currCode: data.currCode || companyInfo?.currCode || "",
        currName: data.currName || companyInfo?.currName || "",
        currRate: formatNumber(data.currRate || companyInfo?.currRate || 1, 6),
        referenceNo: data.referenceNo || "",
        remarks: data.remarks || "",
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      setDetailRows(retrievedDetailRows);
      setGlRows(formattedGLRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      useSwalErrorAlert("Fetch Error", error.message);
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const validateDisposalRows = async () => {
    if ((detailRows?.length || 0) === 0) {
      useSwalErrorAlert("Save FADS", "Please add disposal details before saving.");
      return false;
    }

    const requiredFields = {
      Branch: state.branchCode,
      "FADS Date": state.fadsDate,
      "Disposal Type": state.disposalType,
    };

    const isValid = await validateRequiredFields(requiredFields, "Save FADS");
    if (!isValid) return false;

    const missingAssetIndex = detailRows.findIndex((row) => !String(row.faCode || "").trim());
    if (missingAssetIndex >= 0) {
      useSwalErrorAlert("Save FADS", `Asset No. is required on line ${missingAssetIndex + 1}.`);
      return false;
    }

    return true;
  };

  const handleActivityOption = async (action) => {
    if (isFormDisabled) {
      return;
    }

    if ((detailRows?.length || 0) + (glRows?.length || 0) === 0) {
      return;
    }

    if (state.documentStatus === "") {
      updateState({ isLoading: true });

      try {
        const {
          branchCode,
          branchName,
          fadsNo,
          documentID,
          fadsDate,
          disposalType,
          custCode,
          custName,
          vatCode,
          vatName,
          salesType,
          recipientName,
          incidentDate,
          payeeCode,
          payeeName,
          damageDate,
          insuranceClaimNo,
          assetLocationCode,
          assetLocationName,
          assetDepartmentCode,
          assetDepartmentName,
          categCode,
          categName,
          classCode,
          className,
          currCode,
          currName,
          currRate,
          referenceNo,
          remarks,
          noReprints,
          userCode,
        } = state;

        let finalDetailRowsGL = [...glRows];
        const finalDetailRows = [...detailRows];

        const buildGlData = (glRows) => ({
          branchCode: branchCode,
          branchName: branchName || "",
          fadsNo: fadsNo || "",
          fadsId: documentID || "",
          documentID: documentID || "",
          fadsDate: fadsDate,
          disposalType: disposalType || "FSDP06",
          custCode: custCode || "",
          custName: custName || "",
          vatCode: vatCode || "",
          vatName: vatName || "",
          salesType: salesType || "",
          recipientName: recipientName || "",
          incidentDate: incidentDate || "",
          payeeCode: payeeCode || "",
          payeeName: payeeName || "",
          damageDate: damageDate || "",
          insuranceClaimNo: insuranceClaimNo || "",
          assetLocationCode: assetLocationCode || "",
          assetLocationName: assetLocationName || "",
          assetDepartmentCode: assetDepartmentCode || "",
          assetDepartmentName: assetDepartmentName || "",
          categCode: categCode || "",
          categName: categName || "",
          classCode: classCode || "",
          className: className || "",
          currCode: currCode || companyInfo?.currCode || "",
          currName: currName || companyInfo?.currName || "",
          currRate: parseFormattedNumber(currRate || 1),
          referenceNo: referenceNo || "",
          remarks: remarks || "",
          noReprints: parseFormattedNumber(noReprints || 0),
          userCode: userCode || currentUserRow?.userCode || "",
          userName: currentUserRow?.userName || "",

          dt1: finalDetailRows.map((row, index) => ({
            ...row,
            lnNo: String(index + 1),
            faCode: row.faCode || "",
            tagNo: row.tagNo || "",
            assetDescription: row.assetDescription || row.faName || "",
            flocCode: row.flocCode || "",
            flocName: row.flocName || "",
            rcCode: row.rcCode || "",
            rcName: row.rcName || "",
            empNo: row.empNo || "",
            empName: row.empName || "",
            categCode: row.categCode || "",
            categName: row.categName || "",
            classCode: row.classCode || "",
            className: row.className || "",
            acqCost: parseFormattedNumber(row.acqCost || 0),
            deprAmount: String(disposalType || "").toUpperCase() === "FSDP05"
              ? Math.max(parseFormattedNumber(row.tradeInValue || 0) || 0, 0)
              : ["FSDP03", "FSDP04", "FSDP06", "FSDP07", "FSDP02"].includes(
                  String(disposalType || "").toUpperCase()
                )
                ? parseFormattedNumber(row.nbValue || 0)
                : Math.max(parseFormattedNumber(row.deprAmount || 0) || 0, 0),
            accumDepr: parseFormattedNumber(row.accumDepr || 0),
            salvageValue: parseFormattedNumber(row.salvageValue || 0),
            nbValue: parseFormattedNumber(row.nbValue || 0),
            receivableAmount:
              String(disposalType || "").toUpperCase() === "FSDP01"
                ? Math.max(parseFormattedNumber(row.deprAmount || 0) || 0, 0)
                : Math.max(parseFormattedNumber(row.receivableAmount || 0) || 0, 0),
            tradeInValue: Math.max(parseFormattedNumber(row.tradeInValue || 0) || 0, 0),
            gainLossAmount: ["FSDP01", "FSDP05", "FSDP07"].includes(
              String(disposalType || "").toUpperCase()
            )
              ? String(disposalType || "").toUpperCase() === "FSDP07"
                ? parseFormattedNumber(row.nbValue || 0) -
                  Math.max(parseFormattedNumber(row.receivableAmount || 0) || 0, 0)
                : (
                    String(disposalType || "").toUpperCase() === "FSDP05"
                      ? Math.max(parseFormattedNumber(row.tradeInValue || 0) || 0, 0)
                      : Math.max(parseFormattedNumber(row.deprAmount || 0) || 0, 0)
                  ) - parseFormattedNumber(row.nbValue || 0)
              : parseFormattedNumber(row.gainLossAmount || 0),
            remarks: row.remarks || "",
          })),

          dt2: glRows.map((entry, index) => ({
            ...entry,
            recNo: String(index + 1),
            acctCode: entry.acctCode || "",
            rcCode: entry.rcCode || "",
            sltypeCode: entry.sltypeCode || "",
            slCode: entry.slCode || "",
            particular: entry.particular || "",
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
            setGlRows([]);
            updateState({ isGeneratingGL: true });

            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildGlData(finalDetailRowsGL)
            );

            setGlRows(newGlEntries && newGlEntries.length > 0
              ? newGlEntries.map((entry) => buildDisposalGLRow(entry))
              : []);
            updateState({ isGeneratingGL: false });
          } catch (error) {
            setGlRows([]);
            updateState({ isGeneratingGL: false });
            console.error(error);
          }
          return;
        }

        if (action === "Upsert") {
          const isValid = await validateDisposalRows();
          if (!isValid) return;

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
            setGlRows(newGlEntries.map((entry) => buildDisposalGLRow(entry)));
          }

          const response = await useTransactionUpsert(
            docType,
            buildGlData(finalDetailRowsGL),
            updateState,
            "fadsId",
            "fadsNo"
          );

          if (response) {
            const responseDocNo = response.data[0].fadsNo;
            const responseDocId = response.data[0].fadsId;

            await fetchTranData(responseDocNo, branchCode);

            const isZero = Number(state.noReprints) === 0;
            const onSaveAndPrint = isZero
              ? () => updateState({ showSignatoryModal: true })
              : () => handleSaveAndPrint(responseDocId);

            useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
            updateState({
              fadsNo: responseDocNo,
              documentID: responseDocId,
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
    }
  };

  const handleSave = () => handleActivityOption("Upsert");
  const handleGenerateGL = () => handleActivityOption("GenerateGL");




  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) return;
    if (state.documentID) {
      updateState({ showSignatoryModal: true });
    }
  };




  const handleSaveAndPrint = async (documentID) => {
    setShowSpinner(true);
    await useHandlePrint(documentID, docType);
    setShowSpinner(false);
  };




  const handleCloseSignatory = async (mode) => {
    updateState({
      showSignatoryModal: false,
      noReprints: mode === "Final" ? 1 : 0,
    });

    setShowSpinner(true);
    await useHandlePrint(state.documentID, docType, mode, state.userCode || currentUserRow?.userCode || "");
    setShowSpinner(false);
  };



  const handlePost = () => {
    useSwalErrorAlert("Post FADS", "Posting procedure is not yet connected for FA Disposal.");
  };



  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    const calcWithCurr3 = state.glCurrMode === "T";
    updateState({
      currRate: isNaN(num) ? "0.000000" : num,
      withCurr2: (state.glCurrMode === "M" && state.glCurrDefault !== state.currCode) || state.glCurrMode === "D" || calcWithCurr3,
      withCurr3: calcWithCurr3,
    });
  };



  const handleReset = () => {
    clearDetailSorting();
    clearGlSorting();
    setShowSpinner(true);
    setTimeout(() => {
      setDetailRows([]);
      setGlRows([]);
      setSelectedRowIndex(0);
      updateState({
        branchCode: currentUserRow?.branchCode || "HO",
        branchName: currentUserRow?.branchName || "HO - Head Office",
        userCode: currentUserRow?.userCode || "",
        fadsNo: "",
        fadsDate: useGetCurrentDayV2(),
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        noReprints: "0",
        disposalType: "FSDP06",
        originalDisposalType: "FSDP06",
        custCode: "",
        custName: "",
        vatCode: "",
        vatName: "",
        salesType: "CASH",
        recipientName: "",
        incidentDate: "",
        payeeCode: "",
        payeeName: "",
        damageDate: "",
        insuranceClaimNo: "",
        assetLocationCode: "",
        assetLocationName: "",
        assetDepartmentCode: "",
        assetDepartmentName: "",
        categCode: "",
        categName: "",
        classCode: "",
        className: "",
        currCode: companyInfo?.currCode || "",
        currName: companyInfo?.currName || "",
        currRate: formatNumber(companyInfo?.currRate || 1, 6),
        defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
        glCurrMode: companyInfo?.glCurrMode || "",
        glCurrDefault: companyInfo?.currCode || "",
        withCurr2: false,
        withCurr3: false,
        glCurrGlobal1: companyInfo?.glCurrGlobal1 || "",
        glCurrGlobal2: companyInfo?.glCurrGlobal2 || "",
        glCurrGlobal3: companyInfo?.glCurrGlobal3 || "",
        referenceNo: "",
        remarks: "",
        accountModalSource: null,
        showFAMastLookup: false,
        faLookupRows: [],
        faLookupColumns: [],
        faLookupInsertIndex: null,
        showFaCategoryModal: false,
        showFaClassModal: false,
        faClassLookupCategCode: "",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
      });
      setShowSpinner(false);
    }, 250);
  };

  const clearGeneratedGLEntries = () => {
    if ((glRows?.length || 0) > 0) {
      setGlRows([]);
    }
  };

  const handleSalesTypeChange = (value) => {
    const nextSalesType = value || "CASH";
    const currentSalesType = state.salesType || "CASH";

    if (nextSalesType === currentSalesType) return;

    updateState({
      salesType: nextSalesType,
      ...(String(nextSalesType).toUpperCase() === "CASH"
        ? { vatCode: "", vatName: "", showVatModal: false }
        : {}),
    });

    if (selectedDisposalType === "FSDP01") {
      clearGeneratedGLEntries();
    }
  };

  const handleCustomerNameFocus = () => {
    customerNameBeforeEditRef.current = state.custName || "";
  };

  const handleCustomerNameBlur = (event) => {
    if (isFormDisabled) return;

    const nextCustomerName = String(event.target.value || "").trim();
    const previousCustomerName = String(customerNameBeforeEditRef.current || "").trim();

    if (nextCustomerName === previousCustomerName) {
      if (nextCustomerName !== state.custName) {
        updateState({ custName: nextCustomerName });
      }
      return;
    }

    updateState({ custName: nextCustomerName });
    clearGeneratedGLEntries();
  };

  const getAssetCode = (row = {}) => String(row.faCode || "").trim().toUpperCase();

  const hasDuplicateAssetCode = (rows = []) => {
    const seen = new Set();
    return rows.some((row) => {
      const assetCode = getAssetCode(row);
      if (!assetCode) return false;
      if (seen.has(assetCode)) return true;
      seen.add(assetCode);
      return false;
    });
  };

  const handleDisposalTypeChange = async (value) => {
    const nextDisposalType = value || "FSDP06";
    const currentDisposalType = state.disposalType || "FSDP06";
    const originalDisposalType = state.originalDisposalType || currentDisposalType;

    if (nextDisposalType === currentDisposalType) return;

    if (state.documentID && nextDisposalType !== originalDisposalType) {
      const confirm = await useSwalProceedConfirm(
        "Change Disposal Type?",
        "Changing the disposal type will delete the General Ledger entries.",
        "Yes",
        "No"
      );

      if (!confirm?.isConfirmed) return;
    }

    updateState({
      disposalType: nextDisposalType,
    });
    if (["FSDP03", "FSDP04", "FSDP06", "FSDP07"].includes(String(nextDisposalType).toUpperCase())) {
      setDetailRows((prev) =>
        prev.map((row) => ({
          ...row,
          deprAmount: formatNumber(parseFormattedNumber(row.nbValue || 0)),
          ...(String(nextDisposalType).toUpperCase() === "FSDP07"
            ? {
                gainLossAmount: formatNumber(
                  (parseFormattedNumber(row.nbValue || 0) || 0) -
                  Math.max(parseFormattedNumber(row.receivableAmount || 0) || 0, 0)
                ),
              }
            : {}),
        }))
      );
    } else if (["FSDP01", "FSDP05"].includes(String(nextDisposalType).toUpperCase())) {
      setDetailRows((prev) =>
        prev.map((row) => {
          const proceedsAmount = String(nextDisposalType).toUpperCase() === "FSDP05"
            ? Math.max(parseFormattedNumber(row.tradeInValue || 0) || 0, 0)
            : Math.max(parseFormattedNumber(row.deprAmount || 0) || 0, 0);
          const nbValue = parseFormattedNumber(row.nbValue || 0) || 0;
          return {
            ...row,
            ...(String(nextDisposalType).toUpperCase() === "FSDP05"
              ? { tradeInValue: formatNumber(proceedsAmount) }
              : {}),
            deprAmount: formatNumber(proceedsAmount),
            gainLossAmount: formatNumber(proceedsAmount - nbValue),
          };
        })
      );
    }
    clearGeneratedGLEntries();
  };

  const parseLookupRows = (value) => {
    if (!value) return [];

    if (typeof value === "string") {
      try {
        return parseLookupRows(JSON.parse(value));
      } catch {
        return [];
      }
    }

    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.rows)) return value.rows;
    if (Array.isArray(value?.dt1)) return value.dt1;
    if (value?.result) return parseLookupRows(value.result);
    if (typeof value === "object" && Object.keys(value).length > 0) return [value];

    return [];
  };

  const extractLookupRows = (response) => {
    const resultValue =
      response?.data?.[0]?.result ??
      response?.data?.[0]?.RESULT ??
      response?.data?.result ??
      response?.data?.RESULT ??
      response?.result ??
      response?.RESULT ??
      response?.data ??
      response;

    return parseLookupRows(resultValue);
  };

  const buildFaLookupParams = () => ({
    branchCode: state.branchCode || "",
    flocCode: state.assetLocationCode || "",
    rcCode: state.assetDepartmentCode || "",
    categCode: state.categCode || "",
    classCode: state.classCode || "",
     filter:  "OpenDisposal",
  });

  const getApiErrorMessage = (error) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.result ||
    error?.response?.data?.RESULT ||
    error?.message ||
    "Unable to load fixed asset records.";

  const fetchFAMastLookupRows = async () => {
    const response = await postRequest("lookupFAMast", {
      PARAMS: JSON.stringify({
        json_data: buildFaLookupParams(),
      }),
    });

    return extractLookupRows(response).map((row, index) => ({
      ...row,
      groupId: row.groupId || row.faCode || row.FA_CODE || String(index + 1),
    }));
  };

  const loadFAMastLookupData = async () => {
    const [lookupRows, colConfig] = await Promise.all([
      fetchFAMastLookupRows(),
      useSelectedHSColConfig("lookupFAMast", state.userCode || currentUserRow?.userCode || ""),
    ]);

    return {
      lookupRows,
      lookupColumns: Array.isArray(colConfig) ? colConfig : [],
    };
  };

  const addSelectedAssets = (selectedAssets = [], insertIndex = null) => {
    const selectedRows = selectedAssets.map((asset) =>
      buildDisposalDetailRow(asset, {
        disposalType: state.disposalType,
        isNewAsset: true,
        recomputeDisposal: true,
      })
    );

    if (hasDuplicateAssetCode([...detailRows, ...selectedRows])) {
      useSwalErrorAlert("Duplicate Asset", "Duplicate asset code is not allowed in Disposal Details.");
      return false;
    }

    setDetailRows((prev) => {
      const updatedRows = [...prev];

      if (insertIndex !== null && insertIndex >= 0) {
        updatedRows.splice(insertIndex + 1, 0, ...selectedRows);
      } else {
        updatedRows.push(...selectedRows);
      }

      return updatedRows;
    });

    clearGeneratedGLEntries();
    setSelectedRowIndex(
      insertIndex !== null && insertIndex >= 0
        ? insertIndex + 1
        : detailRows.length
    );

    return true;
  };

  const handleOpenFAMastLookup = async (insertIndex = null) => {
    if (isFormDisabled) return;

    try {
      updateState({ isLoading: true });
      setShowSpinner(true);

      const { lookupRows, lookupColumns } = await loadFAMastLookupData();

      if (lookupRows.length === 0) {
        useSwalErrorAlert("Fixed Asset Lookup", "No fixed assets found for the selected filters.");
        return;
      }

      updateState({
        faLookupRows: lookupRows,
        faLookupColumns: lookupColumns,
        faLookupInsertIndex: insertIndex,
        showFAMastLookup: true,
      });
    } catch (error) {
      console.error("Failed to load fixed asset lookup:", error);
      useSwalErrorAlert("Fixed Asset Lookup", getApiErrorMessage(error));
    } finally {
      updateState({ isLoading: false });
      setShowSpinner(false);
    }
  };

  const handleCloseFAMastLookup = (selectedItems) => {
    if (!selectedItems?.records) {
      updateState({ showFAMastLookup: false, faLookupInsertIndex: null });
      return;
    }

    const selectedAssets = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : [selectedItems.records];

    const didAddAssets = addSelectedAssets(selectedAssets, state.faLookupInsertIndex);
    if (!didAddAssets) {
      return;
    }

    updateState({
      showFAMastLookup: false,
      faLookupInsertIndex: null,
    });
  };

  const handleDeleteRow = (index) => {
    if (isFormDisabled) return;
    setDetailRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    clearGeneratedGLEntries();
    setSelectedRowIndex((prev) => Math.max(0, Math.min(prev, detailRows.length - 2)));
  };

  const handleAddRowGL = (index = null) => {
    if (isFormDisabled) return;
    if ((detailRows?.length || 0) === 0) {
      useSwalErrorAlert("General Ledger", "Please add asset details before adding General Ledger entries.");
      return;
    }

    const newRow = {
      acctCode: "",
      rcCode: "",
      sltypeCode: "",
      slCode: "",
      particular: "",
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

    setGlRows((prev) => {
      const updatedRows = [...prev];
      if (index !== null && index >= 0) updatedRows.splice(index + 1, 0, newRow);
      else updatedRows.push(newRow);
      return updatedRows;
    });
  };

  const handleDeleteRowGL = (index) => {
    if (isFormDisabled) return;
    setGlRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const updateGlRow = (index, updates) => {
    setGlRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, ...updates } : item));
  };

  const handleGlChange = (index, field, value) => {
    updateGlRow(index, { [field]: value });
  };

  const applyGlLookupChange = async (index, field, value) => {
    const row = glRows[index] || {};
    const data = await useUpdateRowGLEntries(row, field, value, "", docType);

    updateGlRow(index, {
      acctCode: data?.acctCode ?? (field === "acctCode" ? value?.acctCode : row.acctCode) ?? "",
      rcCode: data?.rcCode ?? (field === "rcCode" ? value?.rcCode : row.rcCode) ?? "",
      sltypeCode: data?.sltypeCode ?? value?.sltypeCode ?? row.sltypeCode ?? "",
      slCode: data?.slCode ?? (field === "slCode" ? value?.slCode : row.slCode) ?? "",
      particular: data?.particular ?? value?.particular ?? row.particular ?? "",
    });
  };

  const handleGlAmountBlur = async (index, field, value, autoCompute = false) => {
    const row = { ...(glRows[index] || {}), [field]: value };
    const amount = parseFormattedNumber(value || 0);
    const pairedFields = {
      debit: "credit",
      credit: "debit",
      debitFx1: "creditFx1",
      creditFx1: "debitFx1",
      debitFx2: "creditFx2",
      creditFx2: "debitFx2",
    };
    const formattedRow = {
      ...row,
      [field]: formatNumber(Number.isFinite(amount) ? amount : 0),
      ...(amount > 0 ? { [pairedFields[field]]: formatNumber(0) } : {}),
    };

    if (autoCompute && ((state.withCurr2 && state.currCode !== state.glCurrDefault) || state.withCurr3)) {
      const data = await useUpdateRowEditEntries(
        formattedRow,
        field,
        value,
        state.currCode,
        state.currRate,
        state.fadsDate
      );

      if (data) {
        updateGlRow(index, {
          debit: formatNumber(parseFormattedNumber(data.debit || 0)),
          credit: formatNumber(parseFormattedNumber(data.credit || 0)),
          debitFx1: formatNumber(parseFormattedNumber(data.debitFx1 || 0)),
          creditFx1: formatNumber(parseFormattedNumber(data.creditFx1 || 0)),
          debitFx2: formatNumber(parseFormattedNumber(data.debitFx2 || 0)),
          creditFx2: formatNumber(parseFormattedNumber(data.creditFx2 || 0)),
        });
        return;
      }
    }

    updateGlRow(index, formattedRow);
  };

  const handleCancel = async () => {
    if (!state.documentID || isFormDisabled) return;
    updateState({ showCancelModal: true });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && state.documentStatus !== "OPEN" && state.documentID !== null) {
      const result = await useHandleCancel(
        docType,
        state.documentID,
        currentUserRow?.userCode,
        confirmation.password,
        confirmation.reason,
        updateState
      );
      if (result.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
      }
      await fetchTranData(state.fadsNo, state.branchCode);
    }
    updateState({ showCancelModal: false });
  };

  const handleAttach = () => {
    if (!state.documentID) return;
    updateState({ showAttachModal: true });
  };

  const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, state.branchCode, data.key);
    updateState({ showAllTranDocNo: data.modalClose });
  };

  const handleTranDocNoSelection = async (data) => {
    handleReset();
    updateState({ showAllTranDocNo: false, fadsNo: data.docNo });
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const pickedBranchCode = row?.branchCode;
      if (!docNo || !pickedBranchCode) return;

      await fetchTranData(docNo, pickedBranchCode);
      setTopTab("details");
      const params = new URLSearchParams(location.search);
      if (params.get("viewDocument") !== "true") {
        cleanUrl();
      }
    },
    [fetchTranData, cleanUrl, location.search]
  );

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setIsViewDocument(p.get("viewDocument") === "true");
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("fadsNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

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

  const handleOpenHeaderLocationLookup = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerFlocCode", showFaLocModal: true });
  };

  const handleOpenHeaderDepartmentLookup = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerRcCode", showRcModal: true });
  };

  const handleOpenFaCategoryModal = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerFaCategory", showFaCategoryModal: true });
  };

  const handleOpenFaClassModal = () => {
    if (isFormDisabled) return;

    if (!String(state.categCode || "").trim()) {
      useSwalErrorAlert("Asset Sub Category", "Please select an Asset Category first.");
      return;
    }

    updateState({
      accountModalSource: "headerFaClass",
      showFaClassModal: true,
      faClassLookupCategCode: state.categCode || "",
    });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode || "",
        branchName: selectedBranch.branchName || "",
      });
    }
    updateState({ branchModalOpen: false, accountModalSource: null });
  };

  const handleCloseCustModal = (selectedCustomer) => {
    if (selectedCustomer) {
      const shouldKeepVatBlank = String(state.salesType || "CASH").toUpperCase() === "CASH";
      updateState({
        custCode: selectedCustomer.custCode || selectedCustomer.cust_code || "",
        custName: selectedCustomer.custName || selectedCustomer.cust_name || "",
        vatCode: shouldKeepVatBlank ? "" : selectedCustomer.vatCode || selectedCustomer.vat_code || state.vatCode || "",
        vatName: shouldKeepVatBlank ? "" : selectedCustomer.vatName || selectedCustomer.vat_name || state.vatName || "",
      });
    }
    updateState({ custModalOpen: false });
  };

  const handleClosePayeeModal = (selectedPayee) => {
    if (selectedPayee) {
      updateState({
        payeeCode: selectedPayee.vendCode || selectedPayee.vend_code || "",
        payeeName: selectedPayee.vendName || selectedPayee.vend_name || "",
      });
    }
    updateState({ payeeModalOpen: false });
  };

  const handleCloseVatModal = (selectedVat) => {
    if (isHeaderVatLookupDisabled) {
      updateState({ showVatModal: false });
      return;
    }

    if (selectedVat) {
      updateState({
        vatCode: selectedVat.vatCode || selectedVat.vat_code || selectedVat.code || "",
        vatName: selectedVat.vatName || selectedVat.vat_name || selectedVat.vatDesc || selectedVat.description || "",
      });
    }
    updateState({ showVatModal: false });
  };

  const handleCloseFaLocModal = (selectedLocation) => {
    if (selectedLocation) {
      updateState({
        assetLocationCode: selectedLocation.code || selectedLocation.flocCode || selectedLocation.floc_code || "",
        assetLocationName: selectedLocation.description || selectedLocation.name || selectedLocation.flocName || "",
      });
    }
    updateState({ showFaLocModal: false, accountModalSource: null });
  };

  const handleCloseRcModal = async (selectedRc) => {
    if (selectedRc && state.accountModalSource === "glRcCode" && selectedRowIndex !== null) {
      await applyGlLookupChange(selectedRowIndex, "rcCode", selectedRc);
    } else if (selectedRc && state.accountModalSource === "headerRcCode") {
      updateState({
        assetDepartmentCode: selectedRc.rcCode || selectedRc.rc_code || "",
        assetDepartmentName: selectedRc.rcName || selectedRc.rc_name || selectedRc.description || "",
      });
    }
    updateState({ showRcModal: false, accountModalSource: null });
  };

  const handleCloseFaCategoryModal = (selectedCategory) => {
    if (selectedCategory) {
      const selectedCategCode = selectedCategory.code || selectedCategory.categCode || "";
      const selectedCategName = selectedCategory.description || selectedCategory.categName || selectedCategory.code || "";

      updateState({
        categCode: selectedCategCode,
        categName: selectedCategName,
        classCode: "",
        className: "",
        showFaCategoryModal: false,
        showFaClassModal: true,
        faClassLookupCategCode: selectedCategCode,
        accountModalSource: "headerFaClass",
      });
      return;
    }

    updateState({ showFaCategoryModal: false, accountModalSource: null });
  };

  const handleCloseFaClassModal = (selectedClass) => {
    if (selectedClass) {
      updateState({
        classCode: selectedClass.code || selectedClass.classCode || "",
        className: selectedClass.description || selectedClass.className || selectedClass.code || "",
        categCode: selectedClass.categCode || state.categCode || "",
      });
    }
    updateState({ showFaClassModal: false, faClassLookupCategCode: "", accountModalSource: null });
  };

  const handleCloseAccountModal = async (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      await applyGlLookupChange(selectedRowIndex, "acctCode", selectedAccount);
    }
    updateState({ showAccountModal: false, accountModalSource: null });
  };

  const handleCloseSlModal = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      await applyGlLookupChange(selectedRowIndex, "slCode", selectedSl);
    }
    updateState({ showSlModal: false, accountModalSource: null });
  };

  const printData = {
    fads_no: state.fadsNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const getDetailCellDisplayValue = (columnKey, row) => row[columnKey] || "";
  const editableAmountField = selectedDisposalType === "FSDP05" ? "tradeInValue" : "deprAmount";

  const handleProceedsAmountChange = (index, value) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;

    setDetailRows((prev) =>
      prev.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        const proceedsAmount = Math.max(parseFormattedNumber(value || 0) || 0, 0);
        const nbValue = parseFormattedNumber(item.nbValue || 0) || 0;
        return {
          ...item,
          [editableAmountField]: value,
          deprAmount: value,
          gainLossAmount: formatNumber(proceedsAmount - nbValue),
        };
      })
    );
    clearGeneratedGLEntries();
  };

  const handleProceedsAmountBlur = (index, value) => {
    const amount = Math.max(parseFormattedNumber(value || 0) || 0, 0);
    setDetailRows((prev) =>
      prev.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        return {
          ...item,
          [editableAmountField]: formatNumber(amount),
          deprAmount: formatNumber(amount),
          gainLossAmount: formatNumber(amount - (parseFormattedNumber(item.nbValue || 0) || 0)),
        };
      })
    );
  };

  const handleProceedsAmountEnter = (event, index) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    handleProceedsAmountBlur(index, event.currentTarget.value);

    const currentPosition = sortedDetailRows.findIndex((entry) => entry.originalIndex === index);
    const nextRowIndex = sortedDetailRows[currentPosition + 1]?.originalIndex;
    if (nextRowIndex === undefined) {
      event.currentTarget.blur();
      return;
    }

    requestAnimationFrame(() => {
      const nextInput = document.getElementById(`editableDisposalAmount-${nextRowIndex}`);
      nextInput?.focus();
      nextInput?.select();
    });
  };

  const handleReceivableAmountChange = (index, value) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;

    setDetailRows((prev) =>
      prev.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        const receivableAmount = Math.max(parseFormattedNumber(value || 0) || 0, 0);
        const nbValue = parseFormattedNumber(item.nbValue || 0) || 0;
        return {
          ...item,
          receivableAmount: value,
          deprAmount: formatNumber(nbValue),
          gainLossAmount: formatNumber(nbValue - receivableAmount),
        };
      })
    );
    clearGeneratedGLEntries();
  };

  const handleReceivableAmountBlur = (index, value) => {
    const amount = Math.max(parseFormattedNumber(value || 0) || 0, 0);
    setDetailRows((prev) =>
      prev.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        return {
          ...item,
          receivableAmount: formatNumber(amount),
          deprAmount: formatNumber(parseFormattedNumber(item.nbValue || 0) || 0),
          gainLossAmount: formatNumber((parseFormattedNumber(item.nbValue || 0) || 0) - amount),
        };
      })
    );
  };

  const handleReceivableAmountEnter = (event, index) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    handleReceivableAmountBlur(index, event.currentTarget.value);

    const currentPosition = sortedDetailRows.findIndex((entry) => entry.originalIndex === index);
    const nextRowIndex = sortedDetailRows[currentPosition + 1]?.originalIndex;
    if (nextRowIndex === undefined) {
      event.currentTarget.blur();
      return;
    }

    requestAnimationFrame(() => {
      const nextInput = document.getElementById(`receivableAmount-${nextRowIndex}`);
      nextInput?.focus();
      nextInput?.select();
    });
  };

  const readOnlyDetailColumns = [
    "faCode",
    "tagNo",
    "assetDescription",
    "flocCode",
    "flocName",
    "rcCode",
    "rcName",
    "empNo",
    "empName",
    "categCode",
    "categName",
    "classCode",
    "className",
    "acqCost",
    "deprAmount",
    "accumDepr",
    "salvageValue",
    "nbValue",
    "receivableAmount",
    "tradeInValue",
    "gainLossAmount",
  ];

  const renderDetailCell = (columnKey, row, index) => {
    const columnMeta = visibleDetailColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getDetailColumnStyle(columnKey, columnMeta.width || 120),
      ...getDetailFrozenStyle(columnKey, orderedDetailColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";
    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    if (
      (columnKey === "deprAmount" && selectedDisposalType === "FSDP01") ||
      (columnKey === "tradeInValue" && selectedDisposalType === "FSDP05")
    ) {
      return (
        <td key={columnKey} style={style} className="global-tran-td-ui text-right">
          <input
            id={`editableDisposalAmount-${index}`}
            type="text"
            inputMode="decimal"
            className="w-full global-tran-td-inputclass-ui text-right"
            value={row[editableAmountField] || ""}
            disabled={isFormDisabled}
            onChange={(e) => handleProceedsAmountChange(index, e.target.value)}
            onFocus={(e) => {
              if (!isFormDisabled && parseFormattedNumber(e.target.value || 0) === 0) {
                handleProceedsAmountChange(index, "");
              }
            }}
            onBlur={(e) => {
              if (isFormDisabled) return;
              handleProceedsAmountBlur(index, e.target.value);
            }}
            onKeyDown={(e) => handleProceedsAmountEnter(e, index)}
          />
        </td>
      );
    }

    if (columnKey === "receivableAmount" && selectedDisposalType === "FSDP07") {
      return (
        <td key={columnKey} style={style} className="global-tran-td-ui text-right">
          <input
            id={`receivableAmount-${index}`}
            type="text"
            inputMode="decimal"
            className="w-full global-tran-td-inputclass-ui text-right"
            value={row.receivableAmount || ""}
            disabled={isFormDisabled}
            onChange={(e) => handleReceivableAmountChange(index, e.target.value)}
            onFocus={(e) => {
              if (!isFormDisabled && parseFormattedNumber(e.target.value || 0) === 0) {
                handleReceivableAmountChange(index, "");
              }
            }}
            onBlur={(e) => {
              if (isFormDisabled) return;
              handleReceivableAmountBlur(index, e.target.value);
            }}
            onKeyDown={(e) => handleReceivableAmountEnter(e, index)}
          />
        </td>
      );
    }

    if (columnKey === "remarks") {
      return (
        <td key={columnKey} style={style} className={`global-tran-td-ui relative ${alignClass}`}>
          <div className="relative flex items-center">
            <input
              type="text"
              className={`w-full global-tran-td-inputclass-ui pr-8 ${alignClass}`}
              value={getDetailCellDisplayValue(columnKey, row)}
              readOnly
              disabled={isFormDisabled}
            />
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() =>
                  useSwalHandleOpenSpecsModal(
                    index,
                    detailRows,
                    (rowIndex, field, value) =>
                      setDetailRows((prev) =>
                        prev.map((item, i) => (i === rowIndex ? { ...item, [field]: value } : item))
                      ),
                    row.remarks,
                    "Disposal Details Remarks",
                    "remarks",
                    "Enter disposal detail remarks..."
                  )
                }
              />
            )}
          </div>
        </td>
      );
    }

    return (
      <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>
        <input
          className={`w-full global-tran-td-inputclass-ui ${alignClass}`}
          value={getDetailCellDisplayValue(columnKey, row)}
          disabled={isFormDisabled || readOnlyDetailColumns.includes(columnKey)}
          onChange={(e) => setDetailRows((prev) => prev.map((item, i) => i === index ? { ...item, [columnKey]: e.target.value } : item))}
        />
      </td>
    );
  };

  const renderGlCell = (columnKey, row, index) => {
    const columnMeta = glColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getGlColumnStyle(columnKey, columnMeta.width || 120),
      ...getGlFrozenStyle(columnKey, orderedGlColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";
    const glModalHandlers = {
      acctCode: () => {
        setSelectedRowIndex(index);
        updateState({ showAccountModal: true, accountModalSource: "glAcctCode" });
      },
      rcCode: () => {
        setSelectedRowIndex(index);
        updateState({ showRcModal: true, accountModalSource: "glRcCode" });
      },
      slCode: () => {
        setSelectedRowIndex(index);
        updateState({ showSlModal: true, accountModalSource: "glSlCode" });
      },
    };
    const amountFields = ["debit", "credit", "debitFx1", "creditFx1", "debitFx2", "creditFx2"];

    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    if (["acctCode", "rcCode", "slCode"].includes(columnKey)) {
      const readOnly = columnKey !== "acctCode";
      const hasLookupValue = Boolean(String(row[columnKey] || "").trim());
      const showLookupIcon = !isFormDisabled && (columnKey === "acctCode" || hasLookupValue);
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <div className="relative w-full">
            <input
              type="text"
              id={`${columnKey}-${index}`}
              className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${alignClass}`}
              value={row[columnKey] || ""}
              readOnly={readOnly || isFormDisabled}
              onChange={(e) => handleGlChange(index, columnKey, e.target.value)}
            />
            {showLookupIcon && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={glModalHandlers[columnKey]}
              />
            )}
          </div>
        </td>
      );
    }

    if (amountFields.includes(columnKey)) {
      return (
        <td key={columnKey} style={style} className="global-tran-td-ui text-right">
          <input
            type="text"
            id={`${columnKey}-${index}`}
            className="w-full global-tran-td-inputclass-ui text-right"
            value={row[columnKey] || ""}
            readOnly={isFormDisabled}
            onChange={(e) => {
              const sanitizedValue = e.target.value.replace(/[^0-9.]/g, "");
              if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                handleGlChange(index, columnKey, sanitizedValue);
              }
            }}
            onFocus={(e) => {
              if (!isFormDisabled && parseFormattedNumber(e.target.value || 0) === 0) {
                handleGlChange(index, columnKey, "");
              }
            }}
            onBlur={(e) => {
              if (isFormDisabled) return;
              handleGlAmountBlur(index, columnKey, e.target.value, true);
            }}
          />
        </td>
      );
    }

    if (columnKey === "slRefDate") {
      return (
        <td key={columnKey} style={style} className="global-tran-td-ui">
          <DateFormatInput
            id={`slRefDate${index}`}
            value={row.slRefDate || ""}
            disabled={isFormDisabled}
            className="w-full global-tran-td-inputclass-ui text-center pr-7"
            updateState={(updates) => {
              if (updates[`slRefDate${index}`] !== undefined) {
                handleGlChange(index, "slRefDate", updates[`slRefDate${index}`]);
              }
            }}
          />
        </td>
      );
    }

    return (
      <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>
        <input
          type="text"
          className={`w-full global-tran-td-inputclass-ui ${alignClass}`}
          value={row[columnKey] || ""}
          readOnly={isFormDisabled}
          onChange={(e) => handleGlChange(index, columnKey, e.target.value)}
        />
      </td>
    );
  };

  return (
    <div className="global-tran-main-div-ui">
      {(state.isLoading || showSpinner) && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          printData={printData}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={handleCancel}
          onAttach={handleAttach}
          onPost={handlePost}
          showPost={false}
          showCopyForm={false}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          detailsRoute={`/page/${docType}`}
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0}
          isResetDisabled={state.isResetDisabled}
          isAttachDisabled={!state.documentID}
          isPrintDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!state.documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED" || displayStatus === "CLOSED"}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
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

        <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
          <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
            <button
              className={`global-tran-tab-padding-ui ${activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Information
            </button>
          </div>

          {activeTab === "basic" && (
            <div className="global-tran-tabcontent-div-ui">
              <div className="global-tran-textbox-grid-ui grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <div className="global-tran-textbox-group-div-ui min-w-0">
                  <FieldRenderer
                    id="branchName"
                    label="Branch"
                    type="lookup"
                    value={state.branchName}
                    disabled={isFormDisabled}
                    readOnly
                    onLookup={() => updateState({ branchModalOpen: true, accountModalSource: null })}
                  />
                  <FieldRenderer
                    id="fadsNo"
                    label="FADS No."
                    type="lookup"
                    value={state.fadsNo}
                    disabled={state.isDocNoDisabled || isFormDisabled}
                    readOnly
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                  />
                  <div className="relative w-full">
                    <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                      <DateFormatInput
                        id="fadsDate"
                        className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                        value={state.fadsDate}
                        disabled={isFormDisabled}
                        updateState={(updates) => {
                          if (isFormDisabled) return;
                          updateState({ fadsDate: updates.fadsDate });
                        }}
                      />
                    </div>
                    <label htmlFor="fadsDate" className="global-ref-floating-label global-ref-label-enabled">FADS Date</label>
                  </div>
                  <FieldRenderer
                    id="disposalType"
                    label="Disposal Type"
                    required
                    type="select"
                    value={state.disposalType || "FSDP06"}
                    disabled={isFormDisabled || detailRows.length > 0}
                    onChange={handleDisposalTypeChange}
                    options={(state.disposalTypeList || []).map((type) => ({
                      label: type.DROPDOWN_NAME,
                      value: type.DROPDOWN_CODE,
                    }))}
                  />
                </div>

                <div className="global-tran-textbox-group-div-ui min-w-0">
                  <FieldRenderer
                    id="assetLocation"
                    label="Asset Location"
                    type="lookup"
                    value={
                      state.assetLocationCode
                        ? `${state.assetLocationCode}${state.assetLocationName ? ` - ${state.assetLocationName}` : ""}`
                        : ""
                    }
                    disabled={isFormDisabled}
                    readOnly
                    editableLookup
                    onLookup={handleOpenHeaderLocationLookup}
                    onClear={() => updateState({ assetLocationCode: "", assetLocationName: "" })}
                  />
                  <FieldRenderer
                    id="assetDepartment"
                    label="Asset Department"
                    type="lookup"
                    value={
                      state.assetDepartmentCode
                        ? `${state.assetDepartmentCode}${state.assetDepartmentName ? ` - ${state.assetDepartmentName}` : ""}`
                        : ""
                    }
                    disabled={isFormDisabled}
                    readOnly
                    editableLookup
                    onLookup={handleOpenHeaderDepartmentLookup}
                    onClear={() => updateState({ assetDepartmentCode: "", assetDepartmentName: "" })}
                  />
                  <input type="hidden" id="categCode" value={state.categCode || ""} readOnly />
                  <FieldRenderer
                    id="categName"
                    label="Asset Category"
                    type="lookup"
                    value={state.categName}
                    disabled={isFormDisabled}
                    readOnly
                    editableLookup
                    onLookup={handleOpenFaCategoryModal}
                    onClear={() => updateState({ categCode: "", categName: "", classCode: "", className: "" })}
                  />
                  <input type="hidden" id="classCode" value={state.classCode || ""} readOnly />
                  <FieldRenderer
                    id="className"
                    label="Asset Sub Category"
                    type="lookup"
                    value={state.className}
                    disabled={isFormDisabled}
                    readOnly
                    editableLookup
                    onLookup={handleOpenFaClassModal}
                    onClear={() => updateState({ classCode: "", className: "" })}
                  />
                </div>

                <div className="global-tran-textbox-group-div-ui min-w-0">
                  {selectedDisposalType === "FSDP01" && (
                    <>
                      <div className="relative w-full">
                        <div className="relative flex w-full items-center">
                          <input type="hidden" id="custCode" value={state.custCode || ""} readOnly />
                          <input
                            id="custName"
                            type="text"
                            className={`peer h-8 w-full rounded-lg border global-ref-textbox-ui !px-2 !pr-12 !font-normal shadow-none transition-all focus:outline-none ${
                              isFormDisabled
                                ? "global-ref-textbox-disabled cursor-not-allowed"
                                : "global-ref-textbox-enabled"
                            }`}
                            value={state.custName}
                            disabled={isFormDisabled}
                            onChange={(e) => updateState({ custName: e.target.value })}
                            onFocus={handleCustomerNameFocus}
                            onBlur={handleCustomerNameBlur}
                          />
                          <button
                            type="button"
                            title="Search"
                            disabled={isFormDisabled}
                            className={`absolute right-0 top-0 flex h-8 w-10 items-center justify-center rounded-r-lg border border-l-0 transition-colors ${
                              isFormDisabled
                                ? "bg-gray-100 text-gray-400"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                            }`}
                            onClick={() => updateState({ custModalOpen: true })}
                          >
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
                          </button>
                        </div>
                        <label htmlFor="custName" className="global-ref-floating-label global-ref-label-enabled">Customer Name</label>
                      </div>

                      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                        <div className="min-w-0">
                          <input type="hidden" id="vatCode" value={state.vatCode || ""} readOnly />
                          <FieldRenderer
                            id="vatName"
                            label="VAT Code"
                            type="lookup"
                            value={state.vatName}
                            disabled={isHeaderVatLookupDisabled}
                            readOnly
                            onLookup={() => {
                              if (isHeaderVatLookupDisabled) return;
                              updateState({ showVatModal: true });
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <FieldRenderer
                            id="salesType"
                            label="Sales Type"
                            type="select"
                            value={state.salesType || "CASH"}
                            disabled={isFormDisabled}
                            onChange={handleSalesTypeChange}
                            options={[
                              { label: "CASH", value: "CASH" },
                              { label: "CHARGE", value: "CHARGE" },
                            ]}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {selectedDisposalType === "FSDP05" && (
                    <div className="relative w-full">
                      <div className="relative flex w-full items-center">
                        <input type="hidden" id="payeeCode" value={state.payeeCode || ""} readOnly />
                        <input
                          id="payeeName"
                          type="text"
                          className={`peer h-8 w-full rounded-lg border global-ref-textbox-ui !px-2 !pr-12 !font-normal shadow-none transition-all focus:outline-none ${
                            isFormDisabled
                              ? "global-ref-textbox-disabled cursor-not-allowed"
                              : "global-ref-textbox-enabled"
                          }`}
                          value={state.payeeName}
                          disabled={isFormDisabled}
                          onChange={(e) => updateState({ payeeName: e.target.value })}
                        />
                        <button
                          type="button"
                          title="Search"
                          disabled={isFormDisabled}
                          className={`absolute right-0 top-0 flex h-8 w-10 items-center justify-center rounded-r-lg border border-l-0 transition-colors ${
                            isFormDisabled
                              ? "bg-gray-100 text-gray-400"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                          }`}
                          onClick={() => updateState({ payeeModalOpen: true })}
                        >
                          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
                        </button>
                      </div>
                      <label htmlFor="payeeName" className="global-ref-floating-label global-ref-label-enabled">Payee Name</label>
                    </div>
                  )}
                  <FieldRenderer
                    id="referenceNo"
                    label={referenceNoLabel}
                    type="text"
                    value={state.referenceNo}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ referenceNo: val })}
                  />
                  {selectedDisposalType === "FSDP03" && (
                    <FieldRenderer
                      id="recipientName"
                      label="Recipient Name"
                      type="text"
                      value={state.recipientName}
                      disabled={isFormDisabled}
                      onChange={(val) => updateState({ recipientName: val })}
                    />
                  )}
                  {selectedDisposalType === "FSDP04" && (
                    <div className="relative w-full">
                      <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                        <DateFormatInput
                          id="incidentDate"
                          className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                          value={state.incidentDate}
                          disabled={isFormDisabled}
                          updateState={(updates) => updateState({ incidentDate: updates.incidentDate })}
                        />
                      </div>
                      <label htmlFor="incidentDate" className="global-ref-floating-label global-ref-label-enabled">Incident Date</label>
                    </div>
                  )}
                  {selectedDisposalType === "FSDP07" && (
                    <>
                      <div className="relative w-full">
                        <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                          <DateFormatInput
                            id="damageDate"
                            className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                            value={state.damageDate}
                            disabled={isFormDisabled}
                            updateState={(updates) => updateState({ damageDate: updates.damageDate })}
                          />
                        </div>
                        <label htmlFor="damageDate" className="global-ref-floating-label global-ref-label-enabled">Damage Date</label>
                      </div>
                      <FieldRenderer
                        id="insuranceClaimNo"
                        label="Insurance Claim No."
                        type="text"
                        value={state.insuranceClaimNo}
                        disabled={isFormDisabled}
                        onChange={(val) => updateState({ insuranceClaimNo: val })}
                      />
                    </>
                  )}
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                    <div className="min-w-0">
                      <input type="hidden" id="currCode" value={state.currCode || ""} readOnly />
                      <FieldRenderer
                        id="currName"
                        label="Currency"
                        value={
                          state.currCode
                            ? `${state.currCode}${state.currName ? ` - ${state.currName}` : ""}`
                            : ""
                        }
                        disabled
                      />
                    </div>

                    <div className="min-w-0">
                      <FieldRenderer
                        id="currRate"
                        label="Currency Rate"
                        type="amount"
                        value={state.currRate || ""}
                        disabled={isFormDisabled || state.glCurrDefault === state.currCode}
                        onChange={(val) => {
                          const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
                          if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                            updateState({ currRate: sanitizedValue });
                          }
                        }}
                        onBlur={handleCurrRateNoBlur}
                        onFocus={(e) => {
                          if (parseFormattedNumber(e.target.value) === 0) {
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-full">
                <div className="relative p-2">
                  <textarea
                    id="remarks"
                    rows={4}
                    className="peer global-tran-textbox-remarks-ui pt-2"
                    value={state.remarks}
                    disabled={isFormDisabled}
                    readOnly={isFormDisabled}
                    onChange={(e) => {
                      if (isFormDisabled) return;
                      updateState({ remarks: e.target.value });
                    }}
                  />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div id="fads_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Disposal Details</button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedDetailColumns.map((column) =>
                      renderDetailHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedDetailColumns,
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
                  {sortedDetailRows.map((entry) => {
                    const row = entry.row;
                    const originalIndex = entry.originalIndex;
                    return (
                      <tr key={originalIndex} className="global-tran-tr-ui">
                        {orderedDetailColumns.map((column) => renderDetailCell(column.key, row, originalIndex))}
                        {!isFormDisabled && (
                          <td
                            style={transactionActionsCellStyle}
                            className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => handleOpenFAMastLookup(originalIndex)}
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
                    );
                  })}
                </tbody>
              </table>
              {renderDetailHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                className="global-tran-tab-footer-button-add-ui"
                onClick={() => handleOpenFAMastLookup()}
                disabled={isFormDisabled}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
              </button>
            </div>

            {withCostAmount && (
              <div className="global-tran-tab-footer-total-main-div-ui">
                <div className="global-tran-tab-footer-total-div-ui">
                  <label htmlFor="TotalDisposalAmount" className="global-tran-tab-footer-total-label-ui">
                    Total {disposalAmountLabel}:
                  </label>
                  <label htmlFor="TotalDisposalAmount" className="global-tran-tab-footer-total-value-ui">
                    {detailTotals.totalDisposalAmount}
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">General Ledger</button>
            </div>
            <button
              type="button"
              onClick={handleGenerateGL}
              className="global-tran-button-generateGL"
              disabled={isFormDisabled || state.isGeneratingGL}
              style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
            >
              {state.isGeneratingGL ? "Generating..." : "Generate GL Entries"}
            </button>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedGlColumns.map((column) =>
                      renderGlHeader(column.label, column.key, column.width, {
                        orderedColumns: orderedGlColumns,
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
                  {sortedGlRows.map((entry) => {
                    const row = entry.row;
                    const originalIndex = entry.originalIndex;
                    return (
                      <tr key={originalIndex} className="global-tran-tr-ui">
                        {orderedGlColumns.map((column) => renderGlCell(column.key, row, originalIndex))}
                        {!isFormDisabled && (
                          <td
                            style={transactionActionsCellStyle}
                            className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => handleAddRowGL(originalIndex)}
                                title="Add"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button
                                type="button"
                                className="global-tran-td-button-delete-ui"
                                onClick={() => handleDeleteRowGL(originalIndex)}
                                title="Delete"
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {renderGlHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                className="global-tran-tab-footer-button-add-ui"
                onClick={() => handleAddRowGL()}
                disabled={isFormDisabled}
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
                  Total Debit ({state.glCurrDefault}):
                </label>
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
                  {glTotals.totalDebit}
                </label>
              </div>

              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
                  Total Credit ({state.glCurrDefault}):
                </label>
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
                  {glTotals.totalCredit}
                </label>
              </div>

              {state.glCurrDefault !== state.currCode && (
                <div className="global-tran-tab-footer-total-main-div-ui">
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
                      Total Debit ({state.currCode}):
                    </label>
                    <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
                      {glTotals.totalDebitFx1}
                    </label>
                  </div>

                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
                      Total Credit ({state.currCode}):
                    </label>
                    <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
                      {glTotals.totalCreditFx1}
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getFADSHistory"
          cacheKey={`FADS:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="FADS_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {state.custModalOpen && (
        <CustomerMastLookupModal
          isOpen={state.custModalOpen}
          onClose={handleCloseCustModal}
        />
      )}

      {state.payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeModalOpen}
          onClose={handleClosePayeeModal}
          customParam="ActiveAll"
        />
      )}

      {state.showVatModal && (
        <VATLookupModal
          isOpen={state.showVatModal}
          onClose={handleCloseVatModal}
          customParam="OutputGoods"
        />
      )}

      {state.showFaLocModal && (
        <SearchFALoc
          isOpen={state.showFaLocModal}
          onClose={handleCloseFaLocModal}
          branchCode={state.branchCode}
        />
      )}

      {state.showFAMastLookup && (
        <GlobalLookupModalv1
          isOpen={state.showFAMastLookup}
          title="Fixed Asset Master"
          data={state.faLookupRows}
          endpoint={state.faLookupColumns}
          btnCaption="Get Selected Assets"
          idKey="groupId"
          onClose={handleCloseFAMastLookup}
          onCancel={() => updateState({ showFAMastLookup: false, faLookupInsertIndex: null })}
          singleSelect={false}
        />
      )}

      {state.showFaCategoryModal && (
        <SearchFACateg
          isOpen={state.showFaCategoryModal}
          onClose={handleCloseFaCategoryModal}
        />
      )}

      {state.showFaClassModal && (
        <SearchFAClass
          isOpen={state.showFaClassModal}
          onClose={handleCloseFaClassModal}
          categCode={state.faClassLookupCategCode || state.categCode || ""}
        />
      )}

      {state.showRcModal && (
        <RCLookupModal
          isOpen={state.showRcModal}
          onClose={handleCloseRcModal}
          source={state.accountModalSource}
        />
      )}

      {state.showAccountModal && (
        <COAMastLookupModal
          isOpen={state.showAccountModal}
          onClose={handleCloseAccountModal}
          source={state.accountModalSource}
        />
      )}

      {state.showSlModal && (
        <SLMastLookupModal
          isOpen={state.showSlModal}
          onClose={handleCloseSlModal}
          customParam={glRows[selectedRowIndex]?.sltypeCode || ""}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType,
            documentTitle,
            fieldNo: "fadsNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: state.fadsNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {state.showAttachModal && (
        <AttachDocumentModal
          isOpen={state.showAttachModal}
          onClose={() => updateState({ showAttachModal: false })}
          transaction={documentTitle}
          documentNo={state.documentID}
          branch={state.branchCode}
        />
      )}

      {state.showSignatoryModal && (
        <DocumentSignatories
          isOpen={state.showSignatoryModal}
          onClose={handleCloseSignatory}
          onCancel={() => updateState({ showSignatoryModal: false })}
          params={{
            documentID: state.documentID,
            noReprints: state.noReprints,
            docType,
            docNo: state.fadsNo,
          }}
        />
      )}

      {state.showCancelModal && (
        <CancelTranModal
          isOpen={state.showCancelModal}
          onClose={handleCloseCancel}
        />
      )}
    </div>
  );
};

export default FADS;
