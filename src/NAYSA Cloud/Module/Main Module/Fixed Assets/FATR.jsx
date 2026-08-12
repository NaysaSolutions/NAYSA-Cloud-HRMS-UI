import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
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
import {
  useTopForexRate,
  useTopCurrencyRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// FATR FROM/TO TRANSFER DESIGN
// Transfer fields are intentionally placed immediately after Asset Description
// so the user can see the movement columns without scrolling past category/cost columns.
const detailColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "faCode", label: "Asset No.", width: 140 },
  { key: "tagNo", label: "Property Tag", width: 200 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "fromBranchCode", label: "From Branch", width: 130 },
  { key: "toBranchCode", label: "To Branch", width: 130 },
  { key: "fromFlocCode", label: "From Location", width: 250 },
  { key: "toFlocCode", label: "To Location", width: 250 },
  { key: "fromRcCode", label: "From Department", width: 200 },
  { key: "toRcCode", label: "To Department", width: 200 },
  { key: "fromEmpCode", label: "From Employee", width: 150 },
  { key: "toEmpCode", label: "To Employee", width: 150 },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category", width: 200 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 250 },
  { key: "assetCost", label: "Acq. Cost", width: 120, align: "text-right" },
  { key: "accumDepr", label: "Accum. Depr", width: 120, align: "text-right" },
  { key: "nbValue", label: "Net Book Value", width: 120, align: "text-right" },
  { key: "remarks", label: "Remarks", width: 180 },
];

const glColumns = [
  { key: "ln", label: "LN", width: 56, align: "text-center" },
  { key: "acctCode", label: "Account Code", width: 120 },
  { key: "rcCode", label: "RC Code", width: 120 },
  { key: "sltypeCode", label: "SL Type Code", width: 120 },
  { key: "slCode", label: "SL Code", width: 120 },
  { key: "particular", label: "Particulars", width: 320 },
  { key: "debit", label: "Debit", width: 140, align: "text-right" },
  { key: "credit", label: "Credit", width: 140, align: "text-right" },
  { key: "debitFx1", label: "Debit Fx1", width: 140, align: "text-right" },
  { key: "creditFx1", label: "Credit Fx1", width: 140, align: "text-right" },
  { key: "debitFx2", label: "Debit Fx2", width: 140, align: "text-right" },
  { key: "creditFx2", label: "Credit Fx2", width: 140, align: "text-right" },
  { key: "slRefNo", label: "SL Ref. No.", width: 120 },
  { key: "slRefDate", label: "SL Ref. Date", width: 120 },
  { key: "remarks", label: "Remarks", width: 140 },
];

const areDropdownListsEqual = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  return left.every((item, index) =>
    item?.DROPDOWN_CODE === right[index]?.DROPDOWN_CODE &&
    item?.DROPDOWN_NAME === right[index]?.DROPDOWN_NAME
  );
};

const INTRANSIT_LOCATION_CODE = "LOC_INT";
const INTRANSIT_LOCATION_NAME = "Intransit Location";

const isIntransitTransferType = (transferType = "") =>
  String(transferType || "").toUpperCase() === "FATR04";

const getIntransitLocationFields = () => ({
  toFlocCode: INTRANSIT_LOCATION_CODE,
  toFlocName: INTRANSIT_LOCATION_NAME,
});

const getTransferColumnKeys = (transferType = "") => {
  const type = String(transferType || "").toUpperCase();

  if (type === "FATR01") return ["fromFlocCode", "toFlocCode"];
  if (type === "FATR02") return ["fromRcCode", "toRcCode"];
  if (type === "FATR03") return ["fromEmpCode", "toEmpCode"];
  if (type === "FATR04") return ["fromBranchCode", "toBranchCode", "fromFlocCode", "toFlocCode"];

  return [
    "fromBranchCode",
    "toBranchCode",
    "fromFlocCode",
    "toFlocCode",
    "fromRcCode",
    "toRcCode",
    "fromEmpCode",
    "toEmpCode",
  ];
};

const requiresGLEntries = (transferType = "", rows = []) => {
  const type = String(transferType || "").trim().toUpperCase();

  if (type === "FATR01") {
    return rows.some(
      (row) => String(row.fromFlocCode || "").trim().toUpperCase() === "LOC_INT"
    );
  }

  return true;
};

const FATR = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
  } = useAuth();

  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const docType = "FATR";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide[docType] || "";
  const videoLink = docTypeVideoGuide[docType] || "";
  const documentTitle = `${hsDoc?.docName || "FA Transfer"} Transaction`;

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
    fatrNo: "",
    fatrDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",
    userCode: currentUserRow?.userCode || "",
    documentID: "",
    transferType: "FATR01",
    originalTransferType: "FATR01",
    transferTypeList: [],
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
    showFAMastLookup: false,
    faLookupRows: [],
    faLookupColumns: [],
    faLookupInsertIndex: null,
    showAccountModal: false,
    showRcModal: false,
    showSlModal: false,
    payeeModalOpen: false,
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
  const withCostAmount = currentUserRow?.viewCostamt !== "N";

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
    const transferKeys = getTransferColumnKeys(state.transferType);
    const amountKeys = withCostAmount ? ["assetCost", "accumDepr", "nbValue"] : [];
    const finalKeys = [
      "ln",
      "faCode",
      "tagNo",
      "assetDescription",
      ...transferKeys,
      "categCode",
      "categName",
      "classCode",
      "className",
      ...amountKeys,
      "remarks",
    ];
    return finalKeys
      .map((key) => detailColumns.find((column) => column.key === key))
      .filter(Boolean);
  }, [state.transferType, withCostAmount]);

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
    const filteredTypes = getAllDropDown?.("FATRTRAN_TYPE", docType) || [];
    updateState((prev) => {
      const nextTransferType = prev.transferType || filteredTypes[0]?.DROPDOWN_CODE || "FATR01";
      if (
        prev.transferType === nextTransferType &&
        areDropdownListsEqual(prev.transferTypeList || [], filteredTypes)
      ) {
        return null;
      }

      return {
        transferTypeList: filteredTypes,
        transferType: nextTransferType,
      };
    });
  }, [getAllDropDown, refsLoaded, updateState]);

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const hdtblcol_result = await fieldLenghtCheck("fatr_hd,fatr_dt1,fatr_dt2");
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

  const buildTransferDetailRow = (item = {}) => ({
    ...item,
    faCode: item.faCode || item.assetNo || item.FA_CODE || "",
    tagNo: item.tagNo || item.assetTag || item.TAG_NO || "",
    barCode: item.barCode || "",
    faName: item.faName || item.assetDescription || "",
    assetDescription: item.assetDescription || item.faName || "",
    serialNo: item.serialNo || "",
    categCode: item.categCode || "",
    categName: item.categName || "",
    classCode: item.classCode || "",
    className: item.className || "",
    acqDate: item.acqDate || "",
    fromBranchCode: item.fromBranchCode || item.branchCode || "",
    fromBranchName: item.fromBranchName || item.branchName || "",
    toBranchCode: item.toBranchCode || "",
    toBranchName: item.toBranchName || "",
    fromFlocCode: item.fromFlocCode || item.flocCode || "",
    fromFlocName: item.fromFlocName || item.flocName || "",
    toFlocCode: item.toFlocCode || "",
    toFlocName: item.toFlocName || "",
    fromRcCode: item.fromRcCode || item.rcCode || "",
    fromRcName: item.fromRcName || item.rcName || "",
    toRcCode: item.toRcCode || "",
    toRcName: item.toRcName || "",
    fromEmpCode: item.fromEmpCode || item.empNo || "",
    fromEmpName: item.fromEmpName || item.empName || "",
    toEmpCode: item.toEmpCode || "",
    toEmpName: item.toEmpName || "",
    assetCost: formatNumber(item.acqCost || item.assetCost || 0),
    accumDepr: formatNumber(item.accumDepr || 0),
    deprMonth: formatNumber(item.deprMonth || 0),
    nbValue: formatNumber(item.nbValue || 0),
    remarks: item.remarks || "",
  });

  const applyIntransitLocationToRow = (row = {}, transferType = state.transferType) =>
    isIntransitTransferType(transferType) ? { ...row, ...getIntransitLocationFields() } : row;

  const applyIntransitLocationToRows = (rows = [], transferType = state.transferType) =>
    rows.map((row) => applyIntransitLocationToRow(row, transferType));

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({ fatrNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
      setDetailRows([]);
      setGlRows([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(documentNo, branchCode, docType, "fatrNo", direction);

      if (!data?.fatrId) {
        useSwalErrorAlert("No Records Found", "Transaction does not exist.");
        return resetState();
      }

      const fetchedTransferType = data.transferType || "FATR01";
      const retrievedDetailRows = applyIntransitLocationToRows(
        (data.dt1 || []).map((item) => buildTransferDetailRow(item)),
        fetchedTransferType
      );

      const formattedGLRows = (data.dt2 || []).map((glRow) => ({
        ...glRow,
        debit: formatNumber(glRow.debit || 0),
        credit: formatNumber(glRow.credit || 0),
        debitFx1: formatNumber(glRow.debitFx1 || 0),
        creditFx1: formatNumber(glRow.creditFx1 || 0),
        debitFx2: formatNumber(glRow.debitFx2 || 0),
        creditFx2: formatNumber(glRow.creditFx2 || 0),
        slRefDate: useformatToDatev2(glRow.slRefDate || ""),
      }));

      updateState({
        documentStatus: data.fatrHStatus || "",
        status: data.status || "OPEN",
        noReprints: data.noReprints || "0",
        documentID: data.fatrId || "",
        fatrNo: data.fatrNo || "",
        branchCode: data.branchCode || "",
        branchName: data.branchName || "",
        fatrDate: useformatToDatev2(data.fatrDate || ""),
        transferType: fetchedTransferType,
        originalTransferType: fetchedTransferType,
        assetLocationCode: isIntransitTransferType(fetchedTransferType)
          ? INTRANSIT_LOCATION_CODE
          : data.assetLocationCode || data.flocCode || "",
        assetLocationName: isIntransitTransferType(fetchedTransferType)
          ? INTRANSIT_LOCATION_NAME
          : data.assetLocationName || data.flocName || "",
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

  const hasTransferChange = (row = {}) =>
    (!!row.toBranchCode && row.toBranchCode !== row.fromBranchCode) ||
    (!!row.toFlocCode && row.toFlocCode !== row.fromFlocCode) ||
    (!!row.toRcCode && row.toRcCode !== row.fromRcCode) ||
    (!!row.toEmpCode && row.toEmpCode !== row.fromEmpCode);

  const validateTransferRows = async () => {
    if ((detailRows?.length || 0) === 0) {
      useSwalErrorAlert("Save FATR", "Please add asset details before saving.");
      return false;
    }

    const requiredFields = {
      Branch: state.branchCode,
      "FATR Date": state.fatrDate,
      "Transfer Type": state.transferType,
    };

    const isValid = await validateRequiredFields(requiredFields, "Save FATR");
    if (!isValid) return false;

    const missingAssetIndex = detailRows.findIndex((row) => !String(row.faCode || "").trim());
    if (missingAssetIndex >= 0) {
      useSwalErrorAlert("Save FATR", `Asset No. is required on line ${missingAssetIndex + 1}.`);
      return false;
    }

    const type = String(state.transferType || "").toUpperCase();
    const invalidIndex = detailRows.findIndex((row) => {
      if (type === "FATR01") return !String(row.toFlocCode || "").trim();
      if (type === "FATR02") return !String(row.toRcCode || "").trim();
      if (type === "FATR03") return !String(row.toEmpCode || "").trim();
      if (type === "FATR04") return !String(row.toBranchCode || "").trim() || !String(row.toFlocCode || "").trim();
      return !hasTransferChange(row);
    });

    if (invalidIndex >= 0) {
      const message = type === "FATR01"
        ? `To Location is required on line ${invalidIndex + 1}.`
        : type === "FATR02"
          ? `To Department is required on line ${invalidIndex + 1}.`
          : type === "FATR03"
            ? `To Employee is required on line ${invalidIndex + 1}.`
            : type === "FATR04"
              ? `To Branch and To Location are required on line ${invalidIndex + 1}.`
              : `At least one To field must be changed on line ${invalidIndex + 1}.`;

      useSwalErrorAlert("Save FATR", message);
      return false;
    }

    const noChangeIndex = detailRows.findIndex((row) => !hasTransferChange(row));
    if (noChangeIndex >= 0) {
      useSwalErrorAlert("Save FATR", `No transfer changes detected on line ${noChangeIndex + 1}.`);
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
          fatrNo,
          documentID,
          fatrDate,
          transferType,
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

        const finalDetailRows = applyIntransitLocationToRows(detailRows, transferType);
        const isGlRequired = requiresGLEntries(transferType, finalDetailRows);
        let finalDetailRowsGL = isGlRequired ? [...glRows] : [];

        const buildGlData = (glRows) => ({
          branchCode: branchCode,
          branchName: branchName || "",
          fatrNo: fatrNo || "",
          fatrId: documentID || "",
          documentID: documentID || "",
          fatrDate: fatrDate,
          transferType: transferType || "FATR01",
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
            lnNo: String(index + 1),
            faCode: row.faCode || "",
            tagNo: row.tagNo || "",
            barCode: row.barCode || "",
            faName: row.faName || row.assetDescription || "",
            assetDescription: row.assetDescription || "",
            serialNo: row.serialNo || "",
            categCode: row.categCode || "",
            categName: row.categName || "",
            classCode: row.classCode || "",
            className: row.className || "",
            acqDate: row.acqDate || "",
            acqCost: parseFormattedNumber(row.acqCost || row.assetCost || 0),
            assetCost: parseFormattedNumber(row.assetCost || row.acqCost || 0),
            accumDepr: parseFormattedNumber(row.accumDepr || 0),
            nbValue: parseFormattedNumber(row.nbValue || 0),
            fromBranchCode: row.fromBranchCode || "",
            fromBranchName: row.fromBranchName || "",
            toBranchCode: row.toBranchCode || "",
            toBranchName: row.toBranchName || "",
            fromFlocCode: row.fromFlocCode || "",
            fromFlocName: row.fromFlocName || "",
            toFlocCode: row.toFlocCode || "",
            toFlocName: row.toFlocName || "",
            fromRcCode: row.fromRcCode || "",
            fromRcName: row.fromRcName || "",
            toRcCode: row.toRcCode || "",
            toRcName: row.toRcName || "",
            fromEmpCode: row.fromEmpCode || "",
            fromEmpNo: row.fromEmpNo || row.fromEmpCode || "",
            fromEmpName: row.fromEmpName || "",
            toEmpCode: row.toEmpCode || "",
            toEmpNo: row.toEmpNo || row.toEmpCode || "",
            toEmpName: row.toEmpName || "",
            transferReason: row.transferReason || "",
            remarks: row.remarks || "",
          })),

          dt2: glRows.map((entry, index) => ({
            recNo: String(index + 1),
            acctCode: entry.acctCode || "",
            acctName: entry.acctName || "",
            rcCode: entry.rcCode || "",
            rcName: entry.rcName || "",
            rcRequired: entry.rcRequired || "",
            sltypeCode: entry.sltypeCode || "",
            slCode: entry.slCode || "",
            slName: entry.slName || "",
            slRequired: entry.slRequired || "",
            particular: entry.particular || "",
            vatCode: entry.vatCode || "",
            atcCode: entry.atcCode || "",
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
          if (!isGlRequired) {
            setGlRows([]);
            useSwalErrorAlert(
              "General Ledger",
              "General Ledger entries are not required for normal Location-to-Location transfer."
            );
            return;
          }

          try {
            setGlRows([]);
            updateState({ isGeneratingGL: true });

            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildGlData(finalDetailRowsGL)
            );

            setGlRows(newGlEntries && newGlEntries.length > 0 ? newGlEntries : []);
            updateState({ isGeneratingGL: false });
          } catch (error) {
            setGlRows([]);
            updateState({ isGeneratingGL: false });
            console.error(error);
          }
          return;
        }

        if (action === "Upsert") {
          const isValid = await validateTransferRows();
          if (!isValid) return;

          if (!isGlRequired) {
            finalDetailRowsGL = [];
            setGlRows([]);
          } else if (finalDetailRowsGL.length === 0) {
            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildGlData([])
            );

            if (!newGlEntries || newGlEntries.length === 0) {
              console.warn("GL entries generation failed or returned no data.");
              return;
            }

            finalDetailRowsGL = newGlEntries;
            setGlRows(newGlEntries);
          }

          const response = await useTransactionUpsert(
            docType,
            buildGlData(finalDetailRowsGL),
            updateState,
            "fatrId",
            "fatrNo"
          );

          if (response) {
            const responseDocNo = response.data[0].fatrNo;
            const responseDocId = response.data[0].fatrId;

            await fetchTranData(responseDocNo, branchCode);

            const isZero = Number(state.noReprints) === 0;
            const onSaveAndPrint = isZero
              ? () => updateState({ showSignatoryModal: true })
              : () => handleSaveAndPrint(responseDocId);

            useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
            updateState({
              fatrNo: responseDocNo,
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
    useSwalErrorAlert("Post FATR", "Posting procedure is not yet connected for FA Transfer.");
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

  const handleSelectCurrency = async (currCode) => {
    if (!currCode) return;

    const result = await useTopCurrencyRow(currCode);
    if (!result) return;

    const rate = currCode === state.glCurrDefault
      ? state.defaultCurrRate
      : await useTopForexRate(currCode, state.fatrDate);

    updateState({
      currCode: result.currCode,
      currName: result.currName,
      currRate: formatNumber(parseFormattedNumber(rate), 6),
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
        fatrNo: "",
        fatrDate: useGetCurrentDayV2(),
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        noReprints: "0",
        transferType: "FATR01",
        originalTransferType: "FATR01",
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

  const getAssetCode = (row = {}) => String(row.faCode || row.assetNo || row.FA_CODE || "").trim().toUpperCase();

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

  const isSameTransferValue = (left, right) =>
    String(left || "").trim().toUpperCase() === String(right || "").trim().toUpperCase();

  const validateTransferChange = (rows, rowIndexes, updates, compareConfig) => {
    if (!compareConfig) return true;

    const { fromKey, toKey, label } = compareConfig;
    const invalidIndex = rowIndexes.find((rowIndex) => {
      const row = rows[rowIndex] || {};
      return updates[toKey] && isSameTransferValue(updates[toKey], row[fromKey]);
    });

    if (invalidIndex >= 0) {
      useSwalErrorAlert(
        "Invalid Transfer Detail",
        `${label} cannot be the same as From ${label} on line ${invalidIndex + 1}.`
      );
      return false;
    }

    return true;
  };

  const applyDetailTransferChange = async (index, updates, resetUpdates = {}, compareConfig = null) => {
    if (index === null || index === undefined || !detailRows[index]) return false;

    if (!validateTransferChange(detailRows, [index], updates, compareConfig)) return false;

    const applyToAll = index === 0 && detailRows.length > 1
      ? await useSwalProceedConfirm(
          "Apply to all transfer details?",
          "Do you want to apply the same change to the other transfer detail rows?",
          "Yes",
          "No"
      )
      : null;

    const targetIndexes = applyToAll?.isConfirmed
      ? detailRows.map((_, rowIndex) => rowIndex)
      : [index];

    if (!validateTransferChange(detailRows, targetIndexes, updates, compareConfig)) return false;

    setDetailRows((prev) =>
      prev.map((row, rowIndex) => {
        if (targetIndexes.includes(rowIndex)) {
          return { ...row, ...updates, ...resetUpdates };
        }
        return row;
      })
    );
    clearGeneratedGLEntries();
    return true;
  };

  const clearTransferDetailToFields = (transferType = state.transferType) => {
    const forcedLocation = isIntransitTransferType(transferType) ? getIntransitLocationFields() : {};

    setDetailRows((prev) =>
      prev.map((row) => ({
        ...row,
        toBranchCode: "",
        toBranchName: "",
        toFlocCode: "",
        toFlocName: "",
        toRcCode: "",
        toRcName: "",
        toEmpCode: "",
        toEmpNo: "",
        toEmpName: "",
        ...forcedLocation,
      }))
    );
  };

  const handleTransferTypeChange = async (value) => {
    const nextTransferType = value || "FATR01";
    const currentTransferType = state.transferType || "FATR01";
    const originalTransferType = state.originalTransferType || currentTransferType;

    if (nextTransferType === currentTransferType) return;

    if (state.documentID && nextTransferType !== originalTransferType) {
      const confirm = await useSwalProceedConfirm(
        "Change Transfer Type?",
        "Changing the transfer type will clear all To values in Transfer Details and delete the General Ledger entries.",
        "Yes",
        "No"
      );

      if (!confirm?.isConfirmed) return;
    }

    updateState({
      transferType: nextTransferType,
      ...(isIntransitTransferType(nextTransferType)
        ? {
            assetLocationCode: INTRANSIT_LOCATION_CODE,
            assetLocationName: INTRANSIT_LOCATION_NAME,
          }
        : isIntransitTransferType(currentTransferType)
          ? {
              assetLocationCode: "",
              assetLocationName: "",
            }
        : {}),
    });
    clearTransferDetailToFields(nextTransferType);
    clearGeneratedGLEntries();
  };

  const handleAddRow = (index = null) => {
    if (isFormDisabled) return;
    const newRow = applyIntransitLocationToRow(buildTransferDetailRow({
        fromBranchCode: state.branchCode || "",
        fromBranchName: state.branchName || "",
      }));

    setDetailRows((prev) => {
      const updatedRows = [...prev];
      if (index !== null && index >= 0) updatedRows.splice(index + 1, 0, newRow);
      else updatedRows.push(newRow);
      return updatedRows;
    });
    clearGeneratedGLEntries();
    setSelectedRowIndex(index !== null && index >= 0 ? index + 1 : detailRows.length);
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
    filter:  "OpenTransfer",
  });

  const handleOpenFAMastLookup = async (insertIndex = null) => {
    if (isFormDisabled) return;

    try {
      updateState({ isLoading: true });
      setShowSpinner(true);

      const [response, colConfig] = await Promise.all([
        postRequest("lookupFAMast", {
          PARAMS: JSON.stringify({
            json_data: buildFaLookupParams(),
          }),
        }),
        useSelectedHSColConfig("lookupFAMast", state.userCode || currentUserRow?.userCode || ""),
      ]);

      const lookupRows = extractLookupRows(response).map((row, index) => ({
        ...row,
        groupId: row?.groupId || row?.faCode || row?.FA_CODE || String(index + 1),
      }));

      if (lookupRows.length === 0) {
        useSwalErrorAlert("Fixed Asset Lookup", "No fixed assets found for the selected filters.");
        return;
      }

      updateState({
        faLookupRows: lookupRows,
        faLookupColumns: Array.isArray(colConfig) ? colConfig : [],
        faLookupInsertIndex: insertIndex,
        showFAMastLookup: true,
      });
    } catch (error) {
      console.error("Failed to load fixed asset lookup:", error);
      useSwalErrorAlert("Fixed Asset Lookup", "Unable to load fixed asset records.");
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

    const selectedRows = selectedAssets.map((asset) =>
      applyIntransitLocationToRow(buildTransferDetailRow({
        ...asset,
        fromBranchCode: asset.branchCode || state.branchCode || "",
        fromBranchName: asset.branchName || state.branchName || "",
        fromFlocCode: asset.flocCode || "",
        fromFlocName: asset.flocName || "",
        fromRcCode: asset.rcCode || "",
        fromRcName: asset.rcName || "",
        fromEmpCode: asset.empNo || "",
        fromEmpName: asset.empName || "",
      }))
    );

    if (hasDuplicateAssetCode([...detailRows, ...selectedRows])) {
      useSwalErrorAlert("Duplicate Asset", "Duplicate asset code is not allowed in Transfer Details.");
      return;
    }

    setDetailRows((prev) => {
      const updatedRows = [...prev];
      const insertIndex = state.faLookupInsertIndex;

      if (insertIndex !== null && insertIndex >= 0) {
        updatedRows.splice(insertIndex + 1, 0, ...selectedRows);
      } else {
        updatedRows.push(...selectedRows);
      }

      return updatedRows;
    });

    setGlRows([]);
    setSelectedRowIndex(
      state.faLookupInsertIndex !== null && state.faLookupInsertIndex >= 0
        ? state.faLookupInsertIndex + 1
        : detailRows.length
    );


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
      acctName: "",
      rcCode: "",
      rcName: "",
      rcRequired: "",
      sltypeCode: "",
      slCode: "",
      slName: "",
      slRequired: "",
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
      acctName: data?.acctName ?? (field === "acctCode" ? value?.acctName : row.acctName) ?? "",
      rcCode: data?.rcCode ?? (field === "rcCode" ? value?.rcCode : row.rcCode) ?? "",
      rcName: data?.rcName ?? (field === "rcCode" ? value?.rcName : row.rcName) ?? "",
      rcRequired: data?.rcRequired ?? data?.rcReq ?? data?.RCRequired ?? data?.rc_required ?? value?.rcRequired ?? row.rcRequired ?? "",
      sltypeCode: data?.sltypeCode ?? value?.sltypeCode ?? row.sltypeCode ?? "",
      slCode: data?.slCode ?? (field === "slCode" ? value?.slCode : row.slCode) ?? "",
      slName: data?.slName ?? (field === "slCode" ? value?.slName : row.slName) ?? "",
      slRequired: data?.slRequired ?? data?.slReq ?? data?.SLRequired ?? data?.sl_required ?? value?.slRequired ?? row.slRequired ?? "",
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
        state.fatrDate
      );

      if (data) {
        updateGlRow(index, {
          debit: formatNumber(data.debit || 0),
          credit: formatNumber(data.credit || 0),
          debitFx1: formatNumber(data.debitFx1 || 0),
          creditFx1: formatNumber(data.creditFx1 || 0),
          debitFx2: formatNumber(data.debitFx2 || 0),
          creditFx2: formatNumber(data.creditFx2 || 0),
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
      await fetchTranData(state.fatrNo, state.branchCode);
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
    updateState({ showAllTranDocNo: false, fatrNo: data.docNo });
  };

  const cleanUrl = useCallback(() => {
    window.history.replaceState({}, "", window.location.origin);
  }, []);

  const handleHistoryRowPick = useCallback(
    async (row) => {
      const docNo = row?.docNo;
      const pickedBranchCode = row?.branchCode;
      if (!docNo || !pickedBranchCode) return;

      await fetchTranData(docNo, pickedBranchCode);
      setTopTab("details");
      cleanUrl();
    },
    [fetchTranData, cleanUrl]
  );

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") setIsViewDocument(true);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("fatrNo");
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

  const updateDetailRow = (index, updates) => {
    setDetailRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, ...updates } : item));
  };

  const handleOpenHeaderLocationLookup = () => {
    if (isFormDisabled || isIntransitTransferType(state.transferType)) return;
    updateState({ accountModalSource: "headerToFlocCode", showFaLocModal: true });
  };

  const handleOpenHeaderDepartmentLookup = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerToRcCode", showRcModal: true });
  };

  const handleOpenFaCategoryModal = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerFaCategory", showFaCategoryModal: true });
  };

  const handleOpenFaClassModal = () => {
    if (isFormDisabled) return;

    if (!String(state.categCode || "").trim()) {
      useSwalErrorAlert("Sub Category", "Please select a Category first.");
      return;
    }

    updateState({
      accountModalSource: "headerFaClass",
      showFaClassModal: true,
      faClassLookupCategCode: state.categCode || "",
    });
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

  const openDetailLookup = (index, source) => {
    if (isFormDisabled) return;
    if (source === "toFlocCode" && isIntransitTransferType(state.transferType)) return;
    setSelectedRowIndex(index);

    const modalMap = {
      toBranchCode: "branchModalOpen",
      toFlocCode: "showFaLocModal",
      toRcCode: "showRcModal",
      toEmpCode: "payeeModalOpen",
    };

    updateState({ accountModalSource: source, [modalMap[source]]: true });
  };

  const handleCloseBranchModal = async (selectedBranch) => {
    if (selectedBranch) {
      if (state.accountModalSource === "toBranchCode" && selectedRowIndex !== null) {
        await applyDetailTransferChange(
          selectedRowIndex,
          {
            toBranchCode: selectedBranch.branchCode || "",
            toBranchName: selectedBranch.branchName || "",
          },
          {
            ...(isIntransitTransferType(state.transferType)
              ? getIntransitLocationFields()
              : {
                  toFlocCode: "",
                  toFlocName: "",
                }),
          },
          { fromKey: "fromBranchCode", toKey: "toBranchCode", label: "Branch" }
        );
      } else {
        updateState({
          branchCode: selectedBranch.branchCode || "",
          branchName: selectedBranch.branchName || "",
        });
      }
    }
    updateState({ branchModalOpen: false, accountModalSource: null });
  };

  const handleCloseFaLocModal = async (selectedLocation) => {
    if (selectedLocation && isIntransitTransferType(state.transferType)) {
      updateState({ showFaLocModal: false, accountModalSource: null });
      return;
    }

    if (selectedLocation && state.accountModalSource === "headerToFlocCode") {
      const toFlocCode = selectedLocation.code || selectedLocation.flocCode || selectedLocation.floc_code || "";
      const toFlocName = selectedLocation.description || selectedLocation.name || selectedLocation.flocName || "";
      const applied = selectedRowIndex !== null && detailRows[selectedRowIndex]
        ? await applyDetailTransferChange(
          selectedRowIndex,
          { toFlocCode, toFlocName },
          {},
          { fromKey: "fromFlocCode", toKey: "toFlocCode", label: "Location" }
        )
        : true;

      if (applied) {
        updateState({
          assetLocationCode: toFlocCode,
          assetLocationName: toFlocName,
        });
      }
    } else if (selectedLocation && selectedRowIndex !== null) {
      await applyDetailTransferChange(selectedRowIndex, {
        toFlocCode: selectedLocation.code || selectedLocation.flocCode || selectedLocation.floc_code || "",
        toFlocName: selectedLocation.description || selectedLocation.name || selectedLocation.flocName || "",
      }, {}, { fromKey: "fromFlocCode", toKey: "toFlocCode", label: "Location" });
    }
    updateState({ showFaLocModal: false, accountModalSource: null });
  };

  const handleCloseRcModal = async (selectedRc) => {
    if (selectedRc && state.accountModalSource === "glRcCode" && selectedRowIndex !== null) {
      await applyGlLookupChange(selectedRowIndex, "rcCode", selectedRc);
    } else if (selectedRc && state.accountModalSource === "headerToRcCode") {
      const toRcCode = selectedRc.rcCode || selectedRc.rc_code || "";
      const toRcName = selectedRc.rcName || selectedRc.rc_name || selectedRc.description || "";
      const applied = selectedRowIndex !== null && detailRows[selectedRowIndex]
        ? await applyDetailTransferChange(
          selectedRowIndex,
          { toRcCode, toRcName },
          {},
          { fromKey: "fromRcCode", toKey: "toRcCode", label: "Department" }
        )
        : true;

      if (applied) {
        updateState({
          assetDepartmentCode: toRcCode,
          assetDepartmentName: toRcName,
        });
      }
    } else if (selectedRc && selectedRowIndex !== null) {
      await applyDetailTransferChange(selectedRowIndex, {
        toRcCode: selectedRc.rcCode || selectedRc.rc_code || "",
        toRcName: selectedRc.rcName || selectedRc.rc_name || selectedRc.description || "",
      }, {}, { fromKey: "fromRcCode", toKey: "toRcCode", label: "Department" });
    }
    updateState({ showRcModal: false, accountModalSource: null });
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

  const handleClosePayeeModal = async (selectedPayee) => {
    if (selectedPayee && selectedRowIndex !== null) {
      await applyDetailTransferChange(selectedRowIndex, {
        toEmpCode: selectedPayee.vendCode || selectedPayee.vend_code || selectedPayee.empCode || selectedPayee.emp_code || "",
        toEmpName: selectedPayee.vendName || selectedPayee.vend_name || selectedPayee.empName || selectedPayee.emp_name || "",
      }, {}, { fromKey: "fromEmpCode", toKey: "toEmpCode", label: "Employee" });
    }
    updateState({ payeeModalOpen: false, accountModalSource: null });
  };

  const printData = {
    fatr_no: state.fatrNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const getDetailCellDisplayValue = (columnKey, row) => {
    if (columnKey === "fromBranchCode") return row.fromBranchName ? `${row.fromBranchCode || ""} - ${row.fromBranchName}` : row.fromBranchCode || "";
    if (columnKey === "toBranchCode") return row.toBranchName ? `${row.toBranchCode || ""} - ${row.toBranchName}` : row.toBranchCode || "";
    if (columnKey === "fromFlocCode") return row.fromFlocName ? `${row.fromFlocCode || ""} - ${row.fromFlocName}` : row.fromFlocCode || "";
    if (columnKey === "toFlocCode") return row.toFlocName ? `${row.toFlocCode || ""} - ${row.toFlocName}` : row.toFlocCode || "";
    if (columnKey === "fromRcCode") return row.fromRcName ? `${row.fromRcCode || ""} - ${row.fromRcName}` : row.fromRcCode || "";
    if (columnKey === "toRcCode") return row.toRcName ? `${row.toRcCode || ""} - ${row.toRcName}` : row.toRcCode || "";
    if (columnKey === "fromEmpCode") return row.fromEmpName ? `${row.fromEmpCode || ""} - ${row.fromEmpName}` : row.fromEmpCode || "";
    if (columnKey === "toEmpCode") return row.toEmpName ? `${row.toEmpCode || ""} - ${row.toEmpName}` : row.toEmpCode || "";
    return row[columnKey] || "";
  };

  const isToLookupColumn = (columnKey) => ["toBranchCode", "toFlocCode", "toRcCode", "toEmpCode"].includes(columnKey);
  const readOnlyDetailColumns = [
    "faCode",
    "tagNo",
    "assetDescription",
    "categCode",
    "categName",
    "classCode",
    "className",
    "fromBranchCode",
    "fromFlocCode",
    "fromRcCode",
    "fromEmpCode",
    "assetCost",
    "accumDepr",
    "nbValue",
  ];

  const renderDetailCell = (columnKey, row, index) => {
    const columnMeta = visibleDetailColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getDetailColumnStyle(columnKey, columnMeta.width || 120),
      ...getDetailFrozenStyle(columnKey, orderedDetailColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";
    const isForcedIntransitLocation = columnKey === "toFlocCode" && isIntransitTransferType(state.transferType);

    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    if (isToLookupColumn(columnKey)) {
      return (
        <td key={columnKey} style={style} className={`global-tran-td-ui relative ${alignClass}`}>
          <div className="flex items-center">
            <input
              type="text"
              className={`w-full global-tran-td-inputclass-ui pr-6 ${isForcedIntransitLocation || isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"} ${alignClass}`}
              value={getDetailCellDisplayValue(columnKey, row)}
              readOnly
              disabled={isForcedIntransitLocation}
            />
            {!isFormDisabled && !isForcedIntransitLocation && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() => openDetailLookup(index, columnKey)}
                title="Search"
              />
            )}
          </div>
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
                    "Transfer Details Remarks",
                    "remarks",
                    "Enter transfer detail remarks..."
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
                    id="fatrNo"
                    label="FATR No."
                    type="lookup"
                    value={state.fatrNo}
                    disabled={state.isDocNoDisabled || isFormDisabled}
                    readOnly
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                  />
                  <div className="relative w-full">
                    <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                      <DateFormatInput
                        id="fatrDate"
                        className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                        value={state.fatrDate}
                        disabled={isFormDisabled}
                        updateState={(updates) => {
                          if (isFormDisabled) return;
                          updateState({ fatrDate: updates.fatrDate });
                        }}
                      />
                    </div>
                    <label htmlFor="fatrDate" className="global-ref-floating-label global-ref-label-enabled">FATR Date</label>
                  </div>
                  <FieldRenderer
                    id="transferType"
                    label="Transfer Type"
                    required
                    type="select"
                    value={state.transferType || "FATR01"}
                    disabled={isFormDisabled}
                    onChange={handleTransferTypeChange}
                    options={(state.transferTypeList || []).map((type) => ({
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
                    disabled={isFormDisabled || isIntransitTransferType(state.transferType)}
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
                  <FieldRenderer
                    id="referenceNo"
                    label="Reference No."
                    type="text"
                    value={state.referenceNo}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ referenceNo: val })}
                  />
                  <div className="flex space gap-4">
                    <input type="hidden" id="currCode" value={state.currCode || ""} readOnly />

                    <div className="flex-grow w-2/3">
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

                    <div className="flex-grow">
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

        <div id="fatr_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Transfer Details</button>
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
          endpoint="/getFATRHistory"
          cacheKey={`FATR:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="FATR_Summary"
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

      {state.showFaLocModal && (
        <SearchFALoc
          isOpen={state.showFaLocModal}
          onClose={handleCloseFaLocModal}
          branchCode={detailRows[selectedRowIndex]?.toBranchCode || detailRows[selectedRowIndex]?.fromBranchCode || state.branchCode}
          includeIntransit={
            state.accountModalSource === "headerToFlocCode" &&
            String(state.transferType || "").toUpperCase() === "FATR01"
          }
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

      {state.payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeModalOpen}
          onClose={handleClosePayeeModal}
          customParam="Employee"
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
            fieldNo: "fatrNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: state.fatrNo }}
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
            docNo: state.fatrNo,
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

export default FATR;
