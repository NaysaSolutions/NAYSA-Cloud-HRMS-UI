import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import PostFARS from "./PostFARS.jsx";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
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

const sourceColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "faCode", label: "Asset No.", width: 140 },
  { key: "tagNo", label: "Property Tag", width: 160 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category", width: 200 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 220 },
  { key: "flocCode", label: "Location", width: 140 },
  { key: "flocName", label: "Location Name", width: 220 },
  { key: "rcCode", label: "Department", width: 140 },
  { key: "rcName", label: "Department Name", width: 220 },
  { key: "empNo", label: "Employee", width: 140 },
  { key: "empName", label: "Employee Name", width: 220 },
  { key: "eul", label: "EUL (Months)", width: 120, align: "text-right" },
  { key: "rul", label: "RUL (Months)", width: 120, align: "text-right" },
  { key: "acqCost", label: "Acq. Cost", width: 120, align: "text-right" },
  { key: "deprMonth", label: "Depr. Month", width: 120, align: "text-right" },
  { key: "accumDepr", label: "Accum. Depr", width: 120, align: "text-right" },
  { key: "salvageValue", label: "Salvage Value", width: 130, align: "text-right" },
  { key: "netbookValue", label: "Net Book Value", width: 130, align: "text-right" },
  { key: "remarks", label: "Remarks", width: 180 },
];

const resultColumns = [
  { key: "ln", label: "LN", width: 48, align: "text-center" },
  { key: "faCode", label: "Asset No.", width: 140 },
  { key: "tagNo", label: "Property Tag", width: 160 },
  { key: "assetDescription", label: "Asset Description", width: 260 },
  { key: "categCode", label: "Category Code", width: 130 },
  { key: "categName", label: "Category", width: 200 },
  { key: "classCode", label: "Class Code", width: 130 },
  { key: "className", label: "Sub Category", width: 220 },
  { key: "flocCode", label: "Location", width: 140 },
  { key: "flocName", label: "Location Name", width: 220 },
  { key: "rcCode", label: "Department", width: 140 },
  { key: "rcName", label: "Department Name", width: 220 },
  { key: "empNo", label: "Employee", width: 140 },
  { key: "empName", label: "Employee Name", width: 220 },
  { key: "eul", label: "EUL (Months)", width: 120, align: "text-right" },
  { key: "rul", label: "RUL (Months)", width: 120, align: "text-right" },
  { key: "acqCost", label: "Acq. Cost", width: 120, align: "text-right" },
  { key: "deprMonth", label: "Depr. Month", width: 120, align: "text-right" },
  { key: "accumDepr", label: "Accum. Depr", width: 120, align: "text-right" },
  { key: "salvageValue", label: "Salvage Value", width: 130, align: "text-right" },
  { key: "netbookValue", label: "Net Book Value", width: 130, align: "text-right" },
  { key: "remarks", label: "Remarks", width: 180 },
];



const areDropdownListsEqual = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  return left.every((item, index) =>
    item?.DROPDOWN_CODE === right[index]?.DROPDOWN_CODE &&
    item?.DROPDOWN_NAME === right[index]?.DROPDOWN_NAME
  );
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

const parseWholeMonths = (value) => {
  const parsed = parseFormattedNumber(value || 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const isPositiveWholeMonth = (value) => {
  const rawValue = String(value ?? "").replace(/,/g, "").trim();
  return /^[1-9]\d*$/.test(rawValue);
};

const formatAssetRow = (item = {}) => ({
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
  flocCode: item.flocCode || item.locationCode || "",
  flocName: item.flocName || item.locationName || "",
  rcCode: item.rcCode || item.departmentCode || "",
  rcName: item.rcName || item.departmentName || "",
  empNo: item.empNo || item.empCode || item.employeeCode || "",
  empName: item.empName || item.empFullName || item.employeeName || "",
  acqCost: formatNumber(item.acqCost || 0),
  deprMonth: formatNumber(item.deprMonth || 0),
  eul: String(parseWholeMonths(item.eul ?? item.EUL ?? item.eulMonths ?? item.eulMonth ?? 0)),
  rul: String(parseWholeMonths(item.rul ?? item.RUL ?? item.rulMonths ?? item.rulMonth ?? 0)),
  accumDepr: formatNumber(item.accumDepr || 0),
  salvageValue: formatNumber(item.salvageValue || 0),
  netbookValue: formatNumber(item.netbookValue || item.netBookValue || item.nbValue || 0),
  remarks: item.remarks || "",
});

const buildResultRowFromSource = (source = {}) => ({
  faCode: "",
  tagNo: "",
  assetDescription: source.assetDescription || source.faName || "",
  categCode: source.categCode || "",
  categName: source.categName || "",
  classCode: source.classCode || "",
  className: source.className || "",
  flocCode: source.flocCode || "",
  flocName: source.flocName || "",
  rcCode: source.rcCode || "",
  rcName: source.rcName || "",
  empNo: source.empNo || "",
  empName: source.empName || "",
  acqCost: source.acqCost || "0.00",
  deprMonth: source.deprMonth || "0.00",
  eul: source.eul || "0",
  rul: source.rul || "0",
  accumDepr: source.accumDepr || "0.00",
  salvageValue: source.salvageValue || "0.00",
  netbookValue: source.netbookValue || source.nbValue || "0.00",
  remarks: "",
});

const buildSplitResultRowFromSource = (source = {}) => ({
  ...buildResultRowFromSource(source),
  acqCost: "0.00",
  deprMonth: "0.00",
  accumDepr: "0.00",
  salvageValue: "0.00",
  netbookValue: "0.00",
});

const buildReclassResultRowFromSource = (source = {}) => ({
  ...buildResultRowFromSource(source),
  faCode: source.faCode || "",
  tagNo: source.tagNo || "",
  categCode: "",
  categName: "",
  classCode: "",
  className: "",
});

const buildCapitalizationAdjustmentResultRowFromSource = (source = {}) => ({
  ...buildResultRowFromSource(source),
  faCode: source.faCode || "",
  tagNo: source.tagNo || "",
});

const mirrorReclassResultRows = (sourceRows = [], currentRows = []) => {
  const currentByAssetCode = new Map(
    currentRows
      .filter((row) => String(row.faCode || "").trim())
      .map((row) => [String(row.faCode || "").trim().toUpperCase(), row])
  );

  return sourceRows.map((source, index) => {
    const sourceAssetCode = String(source.faCode || "").trim().toUpperCase();
    const current = currentByAssetCode.get(sourceAssetCode) || currentRows[index] || {};

    return {
      ...buildReclassResultRowFromSource(source),
      ...current,
      faCode: source.faCode || "",
      tagNo: source.tagNo || "",
      assetDescription: source.assetDescription || source.faName || current.assetDescription || "",
      categCode: current.categCode || "",
      categName: current.categName || "",
      classCode: current.classCode || "",
      className: current.className || "",
      acqCost: source.acqCost || current.acqCost || "0.00",
      deprMonth: source.deprMonth || current.deprMonth || "0.00",
      accumDepr: source.accumDepr || current.accumDepr || "0.00",
      salvageValue: source.salvageValue || current.salvageValue || "0.00",
      netbookValue: source.netbookValue || source.nbValue || current.netbookValue || "0.00",
    };
  });
};

const mirrorCapitalizationAdjustmentResultRows = (sourceRows = [], currentRows = []) => {
  const currentByAssetCode = new Map(
    currentRows
      .filter((row) => String(row.faCode || "").trim())
      .map((row) => [String(row.faCode || "").trim().toUpperCase(), row])
  );

  return sourceRows.map((source, index) => {
    const sourceAssetCode = String(source.faCode || "").trim().toUpperCase();
    const current = currentByAssetCode.get(sourceAssetCode) || currentRows[index] || {};

    return {
      ...buildCapitalizationAdjustmentResultRowFromSource(source),
      ...current,
      faCode: source.faCode || "",
      tagNo: source.tagNo || "",
      assetDescription: source.assetDescription || source.faName || current.assetDescription || "",
      categCode: source.categCode || current.categCode || "",
      categName: source.categName || current.categName || "",
      classCode: source.classCode || current.classCode || "",
      className: source.className || current.className || "",
      flocCode: source.flocCode || current.flocCode || "",
      flocName: source.flocName || current.flocName || "",
      rcCode: source.rcCode || current.rcCode || "",
      rcName: source.rcName || current.rcName || "",
      empNo: source.empNo || current.empNo || "",
      empName: source.empName || current.empName || "",
    };
  });
};

const amountKeys = ["acqCost", "deprMonth", "accumDepr", "salvageValue", "netbookValue"];
const capitalizationAdjustmentColumnKeys = new Set(["eul", "rul"]);
const amountTotalLabels = {
  acqCost: "Total Acq. Cost",
  deprMonth: "Total Depr. Month",
  accumDepr: "Total Accum. Depr",
  salvageValue: "Total Salvage Value",
  netbookValue: "Total NB Value",
};

const formatAmountRowValues = (row = {}) =>
  amountKeys.reduce((acc, key) => {
    acc[key] = formatNumber(row[key] || 0);
    return acc;
  }, {});

const sumAssetAmounts = (rows = []) =>
  amountKeys.reduce((totals, key) => {
    totals[key] = rows.reduce((sum, row) => sum + (parseFormattedNumber(row[key]) || 0), 0);
    return totals;
  }, {});

const computeCapitalizationAdjustmentAmounts = (row = {}, updates = {}) => {
  const nextRow = { ...row, ...updates };
  const acqCost = Math.max(0, parseFormattedNumber(nextRow.acqCost || 0) || 0);
  const accumDepr = Math.max(0, parseFormattedNumber(nextRow.accumDepr || 0) || 0);
  const salvageValue = Math.max(0, parseFormattedNumber(nextRow.salvageValue || 0) || 0);
  const rul = parseWholeMonths(nextRow.rul);
  const netbookValue = acqCost - accumDepr;
  const depreciableValue = netbookValue - salvageValue;

  return {
    netbookValue: formatNumber(netbookValue),
    nbValue: formatNumber(netbookValue),
    deprMonth: formatNumber(rul > 0 ? depreciableValue / rul : 0),
  };
};

const computeComponentizationDeprMonth = (row = {}, updates = {}) => {
  const nextRow = { ...row, ...updates };
  const netbookValue = Math.max(0, parseFormattedNumber(nextRow.netbookValue || nextRow.nbValue || 0) || 0);
  const salvageValue = Math.max(0, parseFormattedNumber(nextRow.salvageValue || 0) || 0);
  const rul = parseWholeMonths(nextRow.rul);
  const depreciableValue = netbookValue - salvageValue;

  return {
    deprMonth: formatNumber(rul > 0 ? depreciableValue / rul : 0),
  };
};

const computeValueCorrectionAmounts = (row = {}, updates = {}) => {
  const nextRow = { ...row, ...updates };
  const acqCost = Math.max(0, parseFormattedNumber(nextRow.acqCost || 0) || 0);
  const accumDepr = Math.max(0, parseFormattedNumber(nextRow.accumDepr || 0) || 0);
  const salvageValue = Math.max(0, parseFormattedNumber(nextRow.salvageValue || 0) || 0);
  const rul = parseWholeMonths(nextRow.rul);
  const netbookValue = acqCost - accumDepr;
  const depreciableValue = netbookValue - salvageValue;

  const updatesToApply = {
    netbookValue: formatNumber(netbookValue),
    nbValue: formatNumber(netbookValue),
  };

  if (rul > 0) {
    updatesToApply.deprMonth = formatNumber(depreciableValue / rul);
  }

  return updatesToApply;
};

const computeValueCorrectionRul = (row = {}, updates = {}) => {
  const nextRow = { ...row, ...updates };
  const netbookValue = Math.max(0, parseFormattedNumber(nextRow.netbookValue || nextRow.nbValue || 0) || 0);
  const salvageValue = Math.max(0, parseFormattedNumber(nextRow.salvageValue || 0) || 0);
  const deprMonth = Math.max(0, parseFormattedNumber(nextRow.deprMonth || 0) || 0);
  const depreciableValue = netbookValue - salvageValue;

  return {
    rul: String(deprMonth > 0 && depreciableValue > 0
      ? Math.max(1, Math.floor(depreciableValue / deprMonth))
      : parseWholeMonths(nextRow.rul)),
  };
};

const splitAllocatedAmountKeys = ["deprMonth", "accumDepr", "salvageValue", "netbookValue"];

const getSplitAllocatedAmounts = (sourceTotals = {}, acqCostValue = 0) => {
  const sourceAcqCost = parseFormattedNumber(sourceTotals.acqCost || 0) || 0;
  const acqCost = Math.max(0, parseFormattedNumber(acqCostValue || 0) || 0);
  const ratio = sourceAcqCost > 0 ? acqCost / sourceAcqCost : 0;

  return splitAllocatedAmountKeys.reduce((updates, key) => {
    updates[key] = formatNumber((sourceTotals[key] || 0) * ratio);
    return updates;
  }, {});
};

const applySplitAllocatedAmounts = (rows = [], sourceRows = []) => {
  const sourceTotals = sumAssetAmounts(sourceRows);

  return rows.map((row) => ({
    ...row,
    ...getSplitAllocatedAmounts(sourceTotals, row.acqCost),
  }));
};

const buildMergedResultRow = (sourceRows = [], current = {}) => {
  const firstSource = sourceRows[0] || {};
  return {
    ...buildResultRowFromSource(firstSource),
    ...current,
    faCode: current.faCode || "",
    tagNo: current.tagNo || "",
    categCode: firstSource.categCode || current.categCode || "",
    categName: firstSource.categName || current.categName || "",
    classCode: firstSource.classCode || current.classCode || "",
    className: firstSource.className || current.className || "",
    ...formatAmountRowValues(sumAssetAmounts(sourceRows)),
  };
};

const hasDuplicateAssetCode = (rows = []) => {
  const seen = new Set();
  return rows.some((row) => {
    const key = String(row.faCode || "").trim().toUpperCase();
    if (!key) return false;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
};

const FARS = () => {
  const {
    companyInfo,
    currentUserRow,
    getAllDropDown,
    refsLoaded,
    getAllTopHSDocRow,
  } = useAuth();

  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const docType = "FARS";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const pdfLink = docTypePDFGuide[docType] || "";
  const videoLink = docTypeVideoGuide[docType] || "";
  const documentTitle = `${hsDoc?.docName || "FA Restructuring"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [detailTab, setDetailTab] = useState("source");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isViewDocument, setIsViewDocument] = useState(false);
  const [sourceRows, setSourceRows] = useState([]);
  const [resultRows, setResultRows] = useState([]);
  const [glRows, setGlRows] = useState([]);

  const [state, setState] = useState({
    branchCode: currentUserRow?.branchCode || "HO",
    branchName: currentUserRow?.branchName || "HO - Head Office",
    farsNo: "",
    farsDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: "0",
    userCode: currentUserRow?.userCode || "",
    documentID: "",
    restructuringType: "FARS01",
    restructuringTypeList: [],
    referenceNo: "",
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
    showPostModal: false,
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
  const restructuringTypeCode = String(state.restructuringType || "").toUpperCase();
  const isSplitType = restructuringTypeCode === "FARS02";
  const isMergeType = restructuringTypeCode === "FARS01";
  const isReclassType = restructuringTypeCode === "FARS03";
  const isCapitalizationAdjustmentType = restructuringTypeCode === "FARS04";
  const isComponentizationType = restructuringTypeCode === "FARS05";
  const isValueCorrectionType = restructuringTypeCode === "FARS06";
  const isSplitLikeType = isSplitType || isComponentizationType;
  const isOriginalNewValueType = isCapitalizationAdjustmentType || isValueCorrectionType;
  const isMirroredResultType = isReclassType || isOriginalNewValueType;
  const resultAllowsMultiple = isSplitLikeType || isReclassType;
  const showGeneralLedgerSection = !isMergeType && !isSplitType;
  const hasSourceAssets = (sourceRows?.length || 0) > 0;
  const hasAssetDetails = (sourceRows?.length || 0) > 0 || (resultRows?.length || 0) > 0;
  const canAddResultRow = hasSourceAssets && !isMirroredResultType && (isSplitLikeType || (resultRows?.length || 0) === 0);
  const hideAssetDeleteActions = !isOriginalNewValueType && sourceRows.length === 3 && resultRows.length === 3;

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

  const visibleSourceColumns = useMemo(
    () => sourceColumns
      .filter((column) => !capitalizationAdjustmentColumnKeys.has(column.key))
      .filter((column) => withCostAmount || !amountKeys.includes(column.key))
      .map((column) => {
        if (!isOriginalNewValueType) return column;
        if (column.key === "acqCost") return { ...column, label: "Original Acq Cost" };
        if (column.key === "deprMonth") return { ...column, label: "Original Depr. Month" };
        if (column.key === "accumDepr") return { ...column, label: "Original Accum. Depr" };
        if (column.key === "salvageValue") return { ...column, label: "Original Salvage Value" };
        if (column.key === "netbookValue") return { ...column, label: "Original Net Book Value" };
        return column;
      }),
    [isOriginalNewValueType, withCostAmount]
  );
  const visibleResultColumns = useMemo(
    () => resultColumns
      .filter((column) =>
        isOriginalNewValueType ||
        (isComponentizationType && column.key === "rul") ||
        !capitalizationAdjustmentColumnKeys.has(column.key)
      )
      .filter((column) => withCostAmount || (!amountKeys.includes(column.key) && !capitalizationAdjustmentColumnKeys.has(column.key)))
      .map((column) => {
        if (!isOriginalNewValueType) return column;
        if (column.key === "acqCost") return { ...column, label: "New Acq Cost" };
        if (column.key === "deprMonth") return { ...column, label: "New Depr. Month" };
        if (column.key === "accumDepr") return { ...column, label: "New Accum. Depr" };
        if (column.key === "salvageValue") return { ...column, label: "New Salvage Value" };
        if (column.key === "netbookValue") return { ...column, label: "New Net Book Value" };
        return column;
      }),
    [isComponentizationType, isOriginalNewValueType, withCostAmount]
  );

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
    getColumnStyle: getSourceColumnStyle,
    getFrozenColumnStyle: getSourceFrozenStyle,
    getOrderedColumns: getOrderedSourceColumns,
    getSortedRows: getSortedSourceRows,
    setColumnOrder: setSourceColumnOrder,
    clearAllSorting: clearSourceSorting,
    renderResizableHeader: renderSourceHeader,
    renderHeaderContextMenu: renderSourceHeaderContextMenu,
  } = useResizableTableColumns(visibleSourceColumns);

  const {
    getColumnStyle: getResultColumnStyle,
    getFrozenColumnStyle: getResultFrozenStyle,
    getOrderedColumns: getOrderedResultColumns,
    getSortedRows: getSortedResultRows,
    setColumnOrder: setResultColumnOrder,
    clearAllSorting: clearResultSorting,
    renderResizableHeader: renderResultHeader,
    renderHeaderContextMenu: renderResultHeaderContextMenu,
  } = useResizableTableColumns(visibleResultColumns);

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

  const orderedSourceColumns = getOrderedSourceColumns(visibleSourceColumns);
  const orderedResultColumns = getOrderedResultColumns(visibleResultColumns);
  const orderedGlColumns = getOrderedGlColumns(glColumns);

  useEffect(() => {
    setSourceColumnOrder(visibleSourceColumns.map((column) => column.key));
  }, [setSourceColumnOrder, visibleSourceColumns]);

  useEffect(() => {
    setResultColumnOrder(visibleResultColumns.map((column) => column.key));
  }, [setResultColumnOrder, visibleResultColumns]);

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

  const sortedSourceRows = getSortedSourceRows(
    sourceRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? ""
  );

  const sortedResultRows = getSortedResultRows(
    resultRows.map((row, originalIndex) => ({ row, originalIndex })),
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

  const sourceTotals = useMemo(
    () => formatAmountRowValues(sumAssetAmounts(sourceRows)),
    [sourceRows]
  );

  const resultTotals = useMemo(
    () => formatAmountRowValues(sumAssetAmounts(resultRows)),
    [resultRows]
  );

  useEffect(() => {
    if (!isMergeType || sourceRows.length === 0) return;

    setResultRows((prev) => {
      if (prev.length === 0) return prev;
      return [buildMergedResultRow(sourceRows, prev[0])];
    });
  }, [isMergeType, sourceRows]);

  useEffect(() => {
    if (!isReclassType || sourceRows.length === 0) return;

    setResultRows((prev) => {
      return mirrorReclassResultRows(sourceRows, prev);
    });
  }, [isReclassType, sourceRows]);

  useEffect(() => {
    if (!isOriginalNewValueType || sourceRows.length === 0) return;

    setResultRows((prev) => {
      return mirrorCapitalizationAdjustmentResultRows(sourceRows, prev);
    });
  }, [isOriginalNewValueType, sourceRows]);

  useEffect(() => {
    if (showGeneralLedgerSection || glRows.length === 0) return;
    setGlRows([]);
  }, [showGeneralLedgerSection, glRows.length]);

  useEffect(() => {
    if (!refsLoaded) return;
    const filteredTypes = getAllDropDown?.("FARSTRAN_TYPE", docType) || [];
    const fallbackTypes = [
      { DROPDOWN_CODE: "FARS05", DROPDOWN_NAME: "Componentization" },
      { DROPDOWN_CODE: "FARS06", DROPDOWN_NAME: "Value Correction" },
    ];
    const farsTypes = fallbackTypes.reduce((types, fallbackType) => {
      const hasType = types.some((type) =>
        String(type?.DROPDOWN_CODE || "").toUpperCase() === fallbackType.DROPDOWN_CODE
      );
      return hasType ? types : [...types, fallbackType];
    }, filteredTypes);
    updateState((prev) => {
      const nextType = prev.restructuringType || farsTypes[0]?.DROPDOWN_CODE || "";
      if (
        prev.restructuringType === nextType &&
        areDropdownListsEqual(prev.restructuringTypeList || [], farsTypes)
      ) {
        return null;
      }

      return {
        restructuringTypeList: farsTypes,
        restructuringType: nextType,
      };
    });
  }, [docType, getAllDropDown, refsLoaded, updateState]);

  const loadCompanyData = async () => {
    updateState({ isLoading: true });

    try {
      const hdtblcolResult = await fieldLenghtCheck("fars_hd,fars_dt1,fars_dt2,fars_dt3");
      if (hdtblcolResult) updateState({ tblFieldArray: hdtblcolResult });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const clearGeneratedGLEntries = () => setGlRows([]);

  const fetchTranData = async (documentNo, branchCode, direction = "") => {
    const resetState = () => {
      updateState({ farsNo: "", documentID: "", isDocNoDisabled: false, isFetchDisabled: false });
      setSourceRows([]);
      setResultRows([]);
      setGlRows([]);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(documentNo, branchCode, docType, "farsNo", direction);

      if (!data?.farsId) {
        useSwalErrorAlert("No Records Found", "Transaction does not exist.");
        return resetState();
      }

      const formattedGLRows = (data.dt2 || data.glEntries || []).map((glRow) => ({
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
        documentStatus: data.farsHStatus || "",
        status: data.status || "OPEN",
        noReprints: data.noReprints || "0",
        documentID: data.farsId || "",
        farsNo: data.farsNo || "",
        branchCode: data.branchCode || "",
        branchName: data.branchName || "",
        farsDate: useformatToDatev2(data.farsDate || ""),
        restructuringType: data.restructuringType || data.farsType || "FARS01",
        referenceNo: data.referenceNo || "",
        currCode: data.currCode || companyInfo?.currCode || "",
        currName: data.currName || companyInfo?.currName || "",
        currRate: formatNumber(data.currRate || companyInfo?.currRate || 1, 6),
        defaultCurrRate: formatNumber(companyInfo?.currRate || 1, 6),
        glCurrMode: data.glCurrMode || companyInfo?.glCurrMode || "",
        glCurrDefault: data.glCurrDefault || companyInfo?.currCode || "",
        glCurrGlobal1: data.glCurrGlobal1 || companyInfo?.glCurrGlobal1 || "",
        glCurrGlobal2: data.glCurrGlobal2 || companyInfo?.glCurrGlobal2 || "",
        glCurrGlobal3: data.glCurrGlobal3 || companyInfo?.glCurrGlobal3 || "",
        assetLocationCode: data.assetLocationCode || data.flocCode || "",
        assetLocationName: data.assetLocationName || data.flocName || "",
        assetDepartmentCode: data.assetDepartmentCode || data.rcCode || "",
        assetDepartmentName: data.assetDepartmentName || data.rcName || "",
        categCode: data.categCode || "",
        categName: data.categName || "",
        classCode: data.classCode || "",
        className: data.className || "",
        remarks: data.remarks || "",
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });

      setSourceRows((data.dt1 || data.sourceAssets || []).map(formatAssetRow));
      setResultRows((data.dt3 || data.resultAssets || []).map(formatAssetRow));
      setGlRows(formattedGLRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      useSwalErrorAlert("Fetch Error", error.message);
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const buildTransactionPayload = (nextGlRows = glRows) => ({
    branchCode: state.branchCode || "",
    branchName: state.branchName || "",
    farsNo: state.farsNo || "",
    farsId: state.documentID || "",
    documentID: state.documentID || "",
    farsDate: state.farsDate || "",
    restructuringType: state.restructuringType || "FARS01",
    farsType: state.restructuringType || "FARS01",
    referenceNo: state.referenceNo || "",
    currCode: state.currCode || companyInfo?.currCode || "",
    currName: state.currName || companyInfo?.currName || "",
    currRate: parseFormattedNumber(state.currRate || 1),
    glCurrMode: state.glCurrMode || companyInfo?.glCurrMode || "",
    glCurrDefault: state.glCurrDefault || companyInfo?.currCode || "",
    glCurrGlobal1: state.glCurrGlobal1 || companyInfo?.glCurrGlobal1 || "",
    glCurrGlobal2: state.glCurrGlobal2 || companyInfo?.glCurrGlobal2 || "",
    glCurrGlobal3: state.glCurrGlobal3 || companyInfo?.glCurrGlobal3 || "",
    assetLocationCode: state.assetLocationCode || "",
    assetLocationName: state.assetLocationName || "",
    assetDepartmentCode: state.assetDepartmentCode || "",
    assetDepartmentName: state.assetDepartmentName || "",
    categCode: state.categCode || "",
    categName: state.categName || "",
    classCode: state.classCode || "",
    className: state.className || "",
    remarks: state.remarks || "",
    noReprints: parseFormattedNumber(state.noReprints || 0),
    userCode: state.userCode || currentUserRow?.userCode || "",
    userName: currentUserRow?.userName || "",
    dt1: sourceRows.map((row, index) => ({
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
      flocCode: row.flocCode || "",
      flocName: row.flocName || "",
      rcCode: row.rcCode || "",
      rcName: row.rcName || "",
      empCode: row.empCode || row.empNo || "",
      empNo: row.empNo || "",
      empName: row.empName || "",
      acqDate: row.acqDate || "",
      acqCost: parseFormattedNumber(row.acqCost || 0),
      deprMonth: parseFormattedNumber(row.deprMonth || 0),
      eul: parseWholeMonths(row.eul),
      rul: parseWholeMonths(row.rul),
      accumDepr: parseFormattedNumber(row.accumDepr || 0),
      salvageValue: parseFormattedNumber(row.salvageValue || 0),
      netbookValue: parseFormattedNumber(row.netbookValue || row.nbValue || 0),
      nbValue: parseFormattedNumber(row.nbValue || row.netbookValue || 0),
      remarks: row.remarks || "",
    })),
    dt2: nextGlRows.map((entry, index) => ({
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
    dt3: resultRows.map((row, index) => ({
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
      flocCode: row.flocCode || "",
      flocName: row.flocName || "",
      rcCode: row.rcCode || "",
      rcName: row.rcName || "",
      empCode: row.empCode || row.empNo || "",
      empNo: row.empNo || "",
      empName: row.empName || "",
      acqDate: row.acqDate || "",
      acqCost: parseFormattedNumber(row.acqCost || 0),
      deprMonth: parseFormattedNumber(row.deprMonth || 0),
      eul: parseWholeMonths(row.eul),
      rul: parseWholeMonths(row.rul),
      accumDepr: parseFormattedNumber(row.accumDepr || 0),
      salvageValue: parseFormattedNumber(row.salvageValue || 0),
      netbookValue: parseFormattedNumber(row.netbookValue || row.nbValue || 0),
      nbValue: parseFormattedNumber(row.nbValue || row.netbookValue || 0),
      remarks: row.remarks || "",
    })),
  });

  const validateBeforeSave = async () => {
    if ((sourceRows?.length || 0) === 0) {
      useSwalErrorAlert("Save FARS", "Please add at least one Source Asset.");
      return false;
    }

    if ((resultRows?.length || 0) === 0) {
      useSwalErrorAlert("Save FARS", "Please add at least one Result Asset.");
      return false;
    }

    if (isMergeType && resultRows.length > 1) {
      useSwalErrorAlert("Save FARS", "Merge can only have one Result Asset.");
      return false;
    }

    if (isReclassType && sourceRows.length !== resultRows.length) {
      useSwalErrorAlert("Save FARS", "Reclass Result Assets must match the number of Source Assets.");
      return false;
    }

    if (isComponentizationType && sourceRows.length !== 1) {
      useSwalErrorAlert("Save FARS", "Componentization allows only one Source Asset.");
      return false;
    }

    if (isOriginalNewValueType && sourceRows.length !== resultRows.length) {
      const valueTypeName = isValueCorrectionType ? "Value Correction" : "Capitalization Adjustment";
      useSwalErrorAlert("Save FARS", `${valueTypeName} Result Assets must match the number of Source Assets.`);
      return false;
    }

    if (isReclassType) {
      const invalidReclassIndex = resultRows.findIndex((row) => hasSameSourceCategoryClass(row));
      if (invalidReclassIndex >= 0) {
        useSwalErrorAlert(
          "Save FARS",
          `Result Asset category and sub category cannot be the same as Source Asset on line ${invalidReclassIndex + 1}.`
        );
        return false;
      }
    }

    if (hasDuplicateAssetCode(sourceRows)) {
      useSwalErrorAlert("Save FARS", "Duplicate Source Asset is not allowed.");
      return false;
    }

    const missingSourceIndex = sourceRows.findIndex((row) => !String(row.faCode || "").trim());
    if (missingSourceIndex >= 0) {
      useSwalErrorAlert("Save FARS", `Source Asset No. is required on line ${missingSourceIndex + 1}.`);
      return false;
    }

    const missingResultIndex = resultRows.findIndex((row) =>
      !String(row.assetDescription || "").trim() ||
      !String(row.categCode || "").trim() ||
      !String(row.classCode || "").trim() ||
      !String(row.flocCode || "").trim()
    );
    if (missingResultIndex >= 0) {
      useSwalErrorAlert(
        "Save FARS",
        `Result Asset description, category, sub category, and location are required on line ${missingResultIndex + 1}.`
      );
      return false;
    }

    const sourceAcqCost = sourceRows.reduce((sum, row) => sum + (parseFormattedNumber(row.acqCost || 0) || 0), 0);
    const resultAcqCost = resultRows.reduce((sum, row) => sum + (parseFormattedNumber(row.acqCost || 0) || 0), 0);
    const negativeResultIndex = resultRows.findIndex((row) => (parseFormattedNumber(row.acqCost || 0) || 0) < 0);

    if (negativeResultIndex >= 0) {
      useSwalErrorAlert("Save FARS", `Result Asset Acq. Cost must not be negative on line ${negativeResultIndex + 1}.`);
      return false;
    }

    if (isCapitalizationAdjustmentType) {
      const mismatchedAssetIndex = resultRows.findIndex((row, index) => {
        const source = sourceRows[index] || {};
        const sourceFaCode = String(source.faCode || "").trim().toUpperCase();
        const resultFaCode = String(row.faCode || "").trim().toUpperCase();
        const sourceTagNo = String(source.tagNo || "").trim().toUpperCase();
        const resultTagNo = String(row.tagNo || "").trim().toUpperCase();
        return sourceFaCode !== resultFaCode || sourceTagNo !== resultTagNo;
      });
      if (mismatchedAssetIndex >= 0) {
        useSwalErrorAlert("Save FARS", `Result Asset No. and Property Tag must match Source Asset on line ${mismatchedAssetIndex + 1}.`);
        return false;
      }

      const invalidRulIndex = resultRows.findIndex((row) => !isPositiveWholeMonth(row.rul));
      if (invalidRulIndex >= 0) {
        useSwalErrorAlert("Save FARS", `RUL (Months) must be a whole number greater than zero on line ${invalidRulIndex + 1}.`);
        return false;
      }

      const invalidDeprMonthIndex = resultRows.findIndex((row) => {
        const deprMonth = Math.max(0, parseFormattedNumber(row.deprMonth || 0) || 0);
        const acqCost = Math.max(0, parseFormattedNumber(row.acqCost || 0) || 0);
        const netbookValue = Math.max(0, parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0);
        return deprMonth > Math.min(acqCost, netbookValue);
      });
      if (invalidDeprMonthIndex >= 0) {
        useSwalErrorAlert("Save FARS", `New Depr. Month must not exceed New Acq Cost or New Net Book Value on line ${invalidDeprMonthIndex + 1}.`);
        return false;
      }
    }

    if (isValueCorrectionType) {
      const mismatchedAssetIndex = resultRows.findIndex((row, index) => {
        const source = sourceRows[index] || {};
        const sourceFaCode = String(source.faCode || "").trim().toUpperCase();
        const resultFaCode = String(row.faCode || "").trim().toUpperCase();
        const sourceTagNo = String(source.tagNo || "").trim().toUpperCase();
        const resultTagNo = String(row.tagNo || "").trim().toUpperCase();
        return sourceFaCode !== resultFaCode || sourceTagNo !== resultTagNo;
      });
      if (mismatchedAssetIndex >= 0) {
        useSwalErrorAlert("Save FARS", `Result Asset No. and Property Tag must match Source Asset on line ${mismatchedAssetIndex + 1}.`);
        return false;
      }

      const invalidRulIndex = resultRows.findIndex((row) => !isPositiveWholeMonth(row.rul));
      if (invalidRulIndex >= 0) {
        useSwalErrorAlert("Save FARS", `RUL (Months) must be a whole number greater than zero on line ${invalidRulIndex + 1}.`);
        return false;
      }

      const invalidAccumDeprIndex = resultRows.findIndex((row) => {
        const accumDepr = Math.max(0, parseFormattedNumber(row.accumDepr || 0) || 0);
        const netbookValue = Math.max(0, parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0);
        return accumDepr > netbookValue;
      });
      if (invalidAccumDeprIndex >= 0) {
        useSwalErrorAlert("Save FARS", `New Accum. Depr must not exceed New Net Book Value on line ${invalidAccumDeprIndex + 1}.`);
        return false;
      }

      const invalidSalvageIndex = resultRows.findIndex((row) => {
        const salvageValue = Math.max(0, parseFormattedNumber(row.salvageValue || 0) || 0);
        const netbookValue = Math.max(0, parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0);
        return salvageValue > netbookValue;
      });
      if (invalidSalvageIndex >= 0) {
        useSwalErrorAlert("Save FARS", `New Salvage Value must not exceed New Net Book Value on line ${invalidSalvageIndex + 1}.`);
        return false;
      }
    }

    if (isComponentizationType) {
      const invalidRulIndex = resultRows.findIndex((row) => !isPositiveWholeMonth(row.rul));
      if (invalidRulIndex >= 0) {
        useSwalErrorAlert("Save FARS", `RUL (Months) must be a whole number greater than zero on line ${invalidRulIndex + 1}.`);
        return false;
      }

      if (Math.abs(resultAcqCost - sourceAcqCost) > 0.01) {
        useSwalErrorAlert("Save FARS", "Total Result Asset Acq. Cost must be equal to total Source Asset Acq. Cost.");
        return false;
      }
    }

    if (!isOriginalNewValueType && !isComponentizationType && resultAcqCost - sourceAcqCost > 0.01) {
      useSwalErrorAlert("Save FARS", "Total Result Asset Acq. Cost must not exceed total Source Asset Acq. Cost.");
      return false;
    }

    if (isMergeType) {
      const sourceTotals = sumAssetAmounts(sourceRows);
      const resultRow = resultRows[0] || {};
      const mismatchKey = amountKeys.find((key) =>
        Math.abs((parseFormattedNumber(resultRow[key] || 0) || 0) - (sourceTotals[key] || 0)) > 0.01
      );

      if (mismatchKey) {
        useSwalErrorAlert("Save FARS", "Merge Result Asset amounts must be equal to the Source Asset totals.");
        return false;
      }
    }

    const requiredFields = {
      Branch: state.branchCode,
      "FARS Date": state.farsDate,
      "FARS Type": state.restructuringType,
      "Reference No.": state.referenceNo,
    };

    return validateRequiredFields(requiredFields, "Save FARS");
  };


 const handleActivityOption = async (action) => {
  if (isFormDisabled) return;
  if (action === "GenerateGL" && !showGeneralLedgerSection) return;

  try {
    let finalGlRows = showGeneralLedgerSection ? [...glRows] : [];

    if (action === "GenerateGL") {
      updateState({ isLoading: true, isGeneratingGL: true });

      try {
        setGlRows([]);
        const newGlEntries = await useGenerateGLEntries(
          docType,
          buildTransactionPayload([])
        );

        setGlRows(newGlEntries && newGlEntries.length > 0 ? newGlEntries : []);
      } finally {
        updateState({ isLoading: false, isGeneratingGL: false });
      }

      return;
    }

    if (action === "Upsert") {
      /*
        Validate first before showing the global spinner.
        This prevents the spinner from staying visible while
        validation alerts like missing Reference No. are displayed.
      */
      const isValid = await validateBeforeSave();
      if (!isValid) {
        updateState({ isLoading: false, isGeneratingGL: false });
        return;
      }

      updateState({ isLoading: true });

      try {
        if (showGeneralLedgerSection && finalGlRows.length === 0) {
          const newGlEntries = await useGenerateGLEntries(
            docType,
            buildTransactionPayload([])
          );

          if (newGlEntries && newGlEntries.length > 0) {
            finalGlRows = newGlEntries;
            setGlRows(newGlEntries);
          }
        }

        const response = await useTransactionUpsert(
          docType,
          buildTransactionPayload(finalGlRows),
          updateState,
          "farsId",
          "farsNo"
        );

        if (response) {
          const responseDocNo = response.data[0].farsNo;
          const responseDocId = response.data[0].farsId;

          await fetchTranData(responseDocNo, state.branchCode);

          const isZero = Number(state.noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

          updateState({
            farsNo: responseDocNo,
            documentID: responseDocId,
            isDocNoDisabled: true,
            isFetchDisabled: true,
          });
        }
      } finally {
        updateState({ isLoading: false, isGeneratingGL: false });
      }
    }
  } catch (error) {
    console.error(`Error during ${action}:`, error);
    updateState({ isLoading: false, isGeneratingGL: false });
  }
};
  
  const handleSave = () => handleActivityOption("Upsert");
  const handleGenerateGL = () => handleActivityOption("GenerateGL");

  const handlePrint = async () => {
    if (state.documentID) updateState({ showSignatoryModal: true });
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
    updateState({ showPostModal: true });
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
      : await useTopForexRate(currCode, state.farsDate);

    updateState({
      currCode: result.currCode,
      currName: result.currName,
      currRate: formatNumber(parseFormattedNumber(rate), 6),
    });
  };

  const handleReset = () => {
    clearSourceSorting();
    clearResultSorting();
    clearGlSorting();
    setShowSpinner(true);
    setTimeout(() => {
      setSourceRows([]);
      setResultRows([]);
      setGlRows([]);
      setSelectedRowIndex(0);
      setSelectedResultIndex(0);
      setDetailTab("source");
      updateState({
        branchCode: currentUserRow?.branchCode || "HO",
        branchName: currentUserRow?.branchName || "HO - Head Office",
        userCode: currentUserRow?.userCode || "",
        farsNo: "",
        farsDate: useGetCurrentDayV2(),
        documentID: "",
        documentStatus: "",
        status: "OPEN",
        noReprints: "0",
        restructuringType: "FARS01",
        referenceNo: "",
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
        remarks: "",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
      });
      setShowSpinner(false);
    }, 250);
  };

  const handleRestructuringTypeChange = (value) => {
    if (hasAssetDetails) return;

    const nextType = value || state.restructuringTypeList?.[0]?.DROPDOWN_CODE || "";
    if (!nextType) return;
    updateState({ restructuringType: nextType });
    clearGeneratedGLEntries();
    if (!["FARS02", "FARS05"].includes(nextType)) {
      setResultRows((prev) => prev.slice(0, 1));
      setSelectedResultIndex(0);
    }
  };

  const buildFaLookupParams = () => ({
    branchCode: state.branchCode || "",
    flocCode: state.assetLocationCode || "",
    rcCode: state.assetDepartmentCode || "",
    categCode: state.categCode || "",
    classCode: state.classCode || "",
    filter: "OpenRestructuring",
  });

  const handleOpenFAMastLookup = async (insertIndex = null) => {
    if (isFormDisabled) return;

    const fieldsToCheck = {
      "Header : Asset Category": state.categCode,
    };
    const isValid = await validateRequiredFields(fieldsToCheck, "Add Asset");
    if (!isValid) return;

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
        useSwalErrorAlert("Fixed Asset Lookup", "No fixed assets found.");
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

    const rawSelectedAssets = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : [selectedItems.records];
    const selectedAssets = isSplitLikeType ? rawSelectedAssets.slice(0, 1) : rawSelectedAssets;

    const selectedRows = selectedAssets.map(formatAssetRow);

    if (!isSplitLikeType && hasDuplicateAssetCode([...sourceRows, ...selectedRows])) {
      useSwalErrorAlert("Duplicate Asset", "Duplicate asset code is not allowed in Source Assets.");
      return;
    }

    if (isSplitLikeType) {
      setSourceRows(selectedRows);
      setResultRows((prev) => {
        const source = selectedRows[0] || {};
        const baseRows = prev.length > 0 ? prev : [buildSplitResultRowFromSource(source)];

        const nextRows = baseRows.map((row) => ({
          ...row,
          assetDescription: row.assetDescription || source.assetDescription || source.faName || "",
          categCode: isComponentizationType ? row.categCode || source.categCode || "" : source.categCode || row.categCode || "",
          categName: isComponentizationType ? row.categName || source.categName || "" : source.categName || row.categName || "",
          classCode: isComponentizationType ? row.classCode || source.classCode || "" : source.classCode || row.classCode || "",
          className: isComponentizationType ? row.className || source.className || "" : source.className || row.className || "",
          flocCode: source.flocCode || row.flocCode || "",
          flocName: source.flocName || row.flocName || "",
          rcCode: source.rcCode || row.rcCode || "",
          rcName: source.rcName || row.rcName || "",
          empNo: source.empNo || row.empNo || "",
          empName: source.empName || row.empName || "",
        }));

        const allocatedRows = applySplitAllocatedAmounts(nextRows, selectedRows);
        if (!isComponentizationType) return allocatedRows;

        return allocatedRows.map((row) => ({
          ...row,
          ...computeComponentizationDeprMonth(row),
        }));
      });
    } else {
      const buildNextSourceRows = (rows = []) => {
        const updatedRows = [...rows];
        const insertIndex = state.faLookupInsertIndex;

        if (insertIndex !== null && insertIndex >= 0) {
          updatedRows.splice(insertIndex + 1, 0, ...selectedRows);
        } else {
          updatedRows.push(...selectedRows);
        }

        return updatedRows;
      };
      const nextSourceRows = buildNextSourceRows(sourceRows);

      setSourceRows(nextSourceRows);

      if (isReclassType) {
        setResultRows((prev) => mirrorReclassResultRows(nextSourceRows, prev));
      } else if (isOriginalNewValueType) {
        setResultRows((prev) => mirrorCapitalizationAdjustmentResultRows(nextSourceRows, prev));
      }
    }

    if (!isSplitLikeType && !isMirroredResultType) {
      setResultRows((prev) => {
        if (prev.length > 0) return prev;
        return [
          buildResultRowFromSource(selectedRows[0] || {})
        ];
      });
    }

    clearGeneratedGLEntries();
    setSelectedRowIndex(
      isSplitLikeType
        ? 0
        : state.faLookupInsertIndex !== null && state.faLookupInsertIndex >= 0
        ? state.faLookupInsertIndex + 1
        : sourceRows.length
    );

    updateState({
      showFAMastLookup: false,
      faLookupInsertIndex: null,
    });
  };

  const handleDeleteSourceRow = (index) => {
    if (isFormDisabled) return;
    const nextSourceRows = sourceRows.filter((_, rowIndex) => rowIndex !== index);
    setSourceRows(nextSourceRows);
    if (isReclassType) {
      setResultRows((prev) => mirrorReclassResultRows(nextSourceRows, prev));
    } else if (isOriginalNewValueType) {
      setResultRows((prev) => mirrorCapitalizationAdjustmentResultRows(nextSourceRows, prev));
    } else if (isComponentizationType) {
      setResultRows([]);
    }
    clearGeneratedGLEntries();
    setSelectedRowIndex((prev) => Math.max(0, Math.min(prev, sourceRows.length - 2)));
  };

  const handleAddResultRow = (index = null) => {
    if (isFormDisabled) return;
    if (isMirroredResultType) {
      useSwalErrorAlert("Result Assets", "Result Assets are copied from Source Assets.");
      return;
    }
    if ((sourceRows?.length || 0) === 0) {
      useSwalErrorAlert("Result Assets", "Please add at least one Source Asset before adding Result Assets.");
      return;
    }

    if (!resultAllowsMultiple && resultRows.length >= 1) {
      useSwalErrorAlert("Result Assets", "Merge can only have one Result Asset.");
      return;
    }

    const source = sourceRows[0] || {};
    const newRow = isSplitLikeType
      ? buildSplitResultRowFromSource(source)
      : buildResultRowFromSource(source);

    setResultRows((prev) => {
      const updatedRows = [...prev];
      if (index !== null && index >= 0) updatedRows.splice(index + 1, 0, newRow);
      else updatedRows.push(newRow);
      return updatedRows;
    });
    clearGeneratedGLEntries();
    setSelectedResultIndex(index !== null && index >= 0 ? index + 1 : resultRows.length);
  };

  const handleDeleteResultRow = (index) => {
    if (isFormDisabled) return;

    if (isOriginalNewValueType) {
      const resultRow = resultRows[index] || {};
      const resultAssetCode = String(resultRow.faCode || "").trim().toUpperCase();
      const matchedSourceIndex = resultAssetCode
        ? sourceRows.findIndex((row) => String(row.faCode || "").trim().toUpperCase() === resultAssetCode)
        : -1;
      const sourceIndexToDelete = matchedSourceIndex >= 0 ? matchedSourceIndex : index;
      const nextSourceRows = sourceRows.filter((_, rowIndex) => rowIndex !== sourceIndexToDelete);

      setSourceRows(nextSourceRows);
      setResultRows((prev) =>
        mirrorCapitalizationAdjustmentResultRows(
          nextSourceRows,
          prev.filter((_, rowIndex) => rowIndex !== index)
        )
      );
      clearGeneratedGLEntries();
      setSelectedRowIndex((prev) => Math.max(0, Math.min(prev, nextSourceRows.length - 1)));
      setSelectedResultIndex((prev) => Math.max(0, Math.min(prev, nextSourceRows.length - 1)));
      return;
    }

    if (isReclassType) {
      useSwalErrorAlert("Result Assets", "Remove the Source Asset to remove the copied Result Asset.");
      return;
    }
    setResultRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    clearGeneratedGLEntries();
    setSelectedResultIndex((prev) => Math.max(0, Math.min(prev, resultRows.length - 2)));
  };

  const updateResultRow = (index, updates) => {
    setResultRows((prev) => prev.map((item, rowIndex) => rowIndex === index ? { ...item, ...updates } : item));
    clearGeneratedGLEntries();
  };

  const getSourceRowForResultRow = (resultRow = {}) => {
    const assetCode = String(resultRow.faCode || "").trim().toUpperCase();
    if (!assetCode) return {};
    return sourceRows.find((row) => String(row.faCode || "").trim().toUpperCase() === assetCode) || {};
  };

  const hasSameSourceCategoryClass = (resultRow = {}, updates = {}) => {
    if (!isReclassType) return false;
    const source = getSourceRowForResultRow(resultRow);
    const nextCategCode = String(updates.categCode ?? resultRow.categCode ?? "").trim().toUpperCase();
    const nextClassCode = String(updates.classCode ?? resultRow.classCode ?? "").trim().toUpperCase();
    const sourceCategCode = String(source.categCode || "").trim().toUpperCase();
    const sourceClassCode = String(source.classCode || "").trim().toUpperCase();

    return Boolean(nextCategCode && nextClassCode && nextCategCode === sourceCategCode && nextClassCode === sourceClassCode);
  };

  const validateReclassResultChange = (targetIndexes = [], updates = {}) => {
    if (!isReclassType) return true;

    const invalidIndex = targetIndexes.findIndex((rowIndex) =>
      hasSameSourceCategoryClass(resultRows[rowIndex] || {}, updates)
    );

    if (invalidIndex >= 0) {
      const rowIndex = targetIndexes[invalidIndex];
      useSwalErrorAlert(
        "Result Assets",
        `Result Asset category and sub category cannot be the same as Source Asset on line ${rowIndex + 1}.`
      );
      return false;
    }

    return true;
  };

  const applyResultRowsChange = (targetIndexes = [], updates = {}) => {
    setResultRows((prev) =>
      prev.map((row, rowIndex) =>
        targetIndexes.includes(rowIndex) ? { ...row, ...updates } : row
      )
    );
    clearGeneratedGLEntries();
  };

  const getReclassTargetIndexes = async (index, title, message) => {
    if (!isReclassType || index !== 0 || resultRows.length <= 1) return [index];

    const confirm = await useSwalProceedConfirm(title, message, "Yes", "No");
    return confirm?.isConfirmed ? resultRows.map((_, rowIndex) => rowIndex) : [index];
  };

  const focusResultCell = (index, columnKey) => {
    setSelectedResultIndex(Math.max(0, Math.min(index, resultRows.length - 1)));
    setTimeout(() => {
      const input = document.getElementById(`result-${columnKey}-${index}`);
      input?.focus();
      input?.select?.();
    }, 0);
  };

  const moveToNextResultCell = (index, columnKey) => {
    if (index + 1 >= resultRows.length) return;
    focusResultCell(index + 1, columnKey);
  };

  const commitResultAcqCost = (index, value, { moveNext = false } = {}) => {
    const amount = Math.max(0, parseFormattedNumber(value || 0) || 0);
    const updates = { acqCost: formatNumber(amount) };

    if (isSplitLikeType) {
      Object.assign(updates, getSplitAllocatedAmounts(sumAssetAmounts(sourceRows), amount));
      if (isComponentizationType) {
        Object.assign(updates, computeComponentizationDeprMonth(resultRows[index] || {}, updates));
      }
    }

    if (isCapitalizationAdjustmentType) {
      Object.assign(updates, computeCapitalizationAdjustmentAmounts(resultRows[index] || {}, updates));
    }

    if (isValueCorrectionType) {
      Object.assign(updates, computeValueCorrectionAmounts(resultRows[index] || {}, updates));
    }

    updateResultRow(index, updates);

    if (moveNext) moveToNextResultCell(index, "acqCost");
  };

  const commitCapitalizationAdjustmentMonth = (index, columnKey, value, { moveNext = false } = {}) => {
    const months = parseWholeMonths(value);
    if (columnKey === "rul" && months <= 0) {
      useSwalErrorAlert("Result Assets", "RUL (Months) must be greater than zero.");
      updateResultRow(index, { rul: "1", ...computeCapitalizationAdjustmentAmounts(resultRows[index] || {}, { rul: "1" }) });
      return;
    }

    const updates = { [columnKey]: String(months) };
    if (columnKey === "rul") {
      Object.assign(updates, computeCapitalizationAdjustmentAmounts(resultRows[index] || {}, updates));
    }
    updateResultRow(index, updates);
    if (moveNext) moveToNextResultCell(index, columnKey);
  };

  const commitComponentizationRul = (index, value, { moveNext = false } = {}) => {
    const months = parseWholeMonths(value);
    if (months <= 0) {
      useSwalErrorAlert("Result Assets", "RUL (Months) must be greater than zero.");
      updateResultRow(index, {
        rul: "1",
        ...computeComponentizationDeprMonth(resultRows[index] || {}, { rul: "1" }),
      });
      return;
    }

    const updates = {
      rul: String(months),
      ...computeComponentizationDeprMonth(resultRows[index] || {}, { rul: String(months) }),
    };
    updateResultRow(index, updates);
    if (moveNext) moveToNextResultCell(index, "rul");
  };

  const commitCapitalizationAdjustmentAmount = (index, columnKey, value, { moveNext = false } = {}) => {
    const amount = Math.max(0, parseFormattedNumber(value || 0) || 0);
    const updates = {
      [columnKey]: formatNumber(amount),
      ...computeCapitalizationAdjustmentAmounts(resultRows[index] || {}, { [columnKey]: formatNumber(amount) }),
    };

    updateResultRow(index, updates);
    if (moveNext) moveToNextResultCell(index, columnKey);
  };

  const commitValueCorrectionAmount = (index, columnKey, value, { moveNext = false } = {}) => {
    const row = resultRows[index] || {};
    const source = getSourceRowForResultRow(row) || sourceRows[index] || {};
    const amount = Math.max(0, parseFormattedNumber(value || 0) || 0);
    const updates = { [columnKey]: formatNumber(amount) };

    if (columnKey === "accumDepr") {
      const netbookValue = Math.max(0, parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0);
      if (amount > netbookValue) {
        useSwalErrorAlert("Result Assets", "New Accum. Depr must not exceed New Net Book Value.");
        const originalAccumDepr = formatNumber(source.accumDepr || 0);
        Object.assign(updates, {
          accumDepr: originalAccumDepr,
          ...computeValueCorrectionAmounts(row, { accumDepr: originalAccumDepr }),
        });
        updateResultRow(index, updates);
        if (moveNext) moveToNextResultCell(index, columnKey);
        return;
      }
    }

    if (["acqCost", "accumDepr"].includes(columnKey)) {
      Object.assign(updates, computeValueCorrectionAmounts(row, updates));
    }

    if (columnKey === "salvageValue") {
      const netbookValue = Math.max(0, parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0);
      if (amount > netbookValue) {
        useSwalErrorAlert("Result Assets", "New Salvage Value must not exceed New Net Book Value.");
        const originalSalvageValue = formatNumber(source.salvageValue || 0);
        updates.salvageValue = originalSalvageValue;
        Object.assign(updates, computeValueCorrectionAmounts(row, { salvageValue: originalSalvageValue }));
      } else {
        Object.assign(updates, computeValueCorrectionAmounts(row, updates));
      }
    }

    if (columnKey === "deprMonth") {
      Object.assign(updates, computeValueCorrectionRul(row, updates));
    }

    updateResultRow(index, updates);
    if (moveNext) moveToNextResultCell(index, columnKey);
  };

  const commitValueCorrectionRul = (index, value, { moveNext = false } = {}) => {
    const months = parseWholeMonths(value);
    if (months <= 0) {
      useSwalErrorAlert("Result Assets", "RUL (Months) must be greater than zero.");
      const originalRul = String(parseWholeMonths(getSourceRowForResultRow(resultRows[index] || {}).rul || resultRows[index]?.rul || 1) || 1);
      updateResultRow(index, {
        rul: originalRul,
        ...computeValueCorrectionAmounts(resultRows[index] || {}, { rul: originalRul }),
      });
      return;
    }

    const updates = {
      rul: String(months),
      ...computeValueCorrectionAmounts(resultRows[index] || {}, { rul: String(months) }),
    };
    updateResultRow(index, updates);
    if (moveNext) moveToNextResultCell(index, "rul");
  };

  const getCapitalizationAdjustmentMaxDeprMonth = (row = {}) => {
    const acqCost = Math.max(0, parseFormattedNumber(row.acqCost || 0) || 0);
    const netbookValue = Math.max(0, parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0);
    return Math.min(acqCost, netbookValue);
  };

  const commitCapitalizationAdjustmentDeprMonth = (index, value, { moveNext = false } = {}) => {
    const row = resultRows[index] || {};
    const amount = Math.max(0, parseFormattedNumber(value || 0) || 0);
    const maxDeprMonth = getCapitalizationAdjustmentMaxDeprMonth(row);
    const nextAmount = Math.min(amount, maxDeprMonth);
    const netbookValue = parseFormattedNumber(row.netbookValue || row.nbValue || 0) || 0;
    const salvageValue = parseFormattedNumber(row.salvageValue || 0) || 0;
    const depreciableValue = netbookValue - salvageValue;
    const nextRul = nextAmount > 0 && depreciableValue > 0
      ? Math.max(1, Math.floor(depreciableValue / nextAmount))
      : parseWholeMonths(row.rul);

    if (amount > maxDeprMonth) {
      useSwalErrorAlert("Result Assets", "New Depr. Month must not exceed New Acq Cost or New Net Book Value.");
    }

    updateResultRow(index, {
      deprMonth: formatNumber(nextAmount),
      rul: String(nextRul),
    });
    if (moveNext) moveToNextResultCell(index, "deprMonth");
  };

  const handleAddRowGL = (index = null) => {
    if (isFormDisabled) return;
    if ((sourceRows?.length || 0) === 0 && (resultRows?.length || 0) === 0) {
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
        state.farsDate
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

  const handleCancel = () => {
    if (!state.documentID || isFormDisabled) return;
    updateState({ showCancelModal: true });
  };

  const handleCloseCancel = async (cancelReason) => {
    updateState({ showCancelModal: false });
    if (!cancelReason) return;
    const success = await useHandleCancel(
      docType,
      state.documentID,
      state.farsNo,
      state.branchCode,
      state.userCode || currentUserRow?.userCode || "",
      cancelReason
    );
    if (success) await fetchTranData(state.farsNo, state.branchCode);
  };

  const handleAttach = () => {
    if (!state.documentID) return;
    updateState({ showAttachModal: true });
  };

  const handleTranDocNoRetrieval = async (payload) => {
    await fetchTranData(payload?.docNo || state.farsNo, state.branchCode, payload?.key || "");
  };

  const handleTranDocNoSelection = async (payload) => {
    updateState({ showAllTranDocNo: false });
    await fetchTranData(payload?.docNo, payload?.branchCode || state.branchCode);
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
    [cleanUrl]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("viewDocument") === "true") setIsViewDocument(true);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("farsNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      handleHistoryRowPick({ docNo, branchCode });
    }
  }, [location.search, handleHistoryRowPick]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "F1") {
        event.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [updateState]);

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode || "",
        branchName: selectedBranch.branchName || "",
      });
    }
    updateState({ branchModalOpen: false, accountModalSource: null });
  };

  const handleOpenHeaderLocationLookup = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerLocation", showFaLocModal: true });
  };

  const handleOpenHeaderDepartmentLookup = () => {
    if (isFormDisabled) return;
    updateState({ accountModalSource: "headerDepartment", showRcModal: true });
  };

  const handleOpenFaCategoryModal = () => {
    if (isFormDisabled || hasSourceAssets) return;
    updateState({ accountModalSource: "headerCategory", showFaCategoryModal: true });
  };

  const handleOpenFaClassModal = () => {
    if (isFormDisabled || hasSourceAssets) return;

    if (!String(state.categCode || "").trim()) {
      useSwalErrorAlert("Sub Category", "Please select a Category first.");
      return;
    }

    updateState({
      accountModalSource: "headerClass",
      showFaClassModal: true,
      faClassLookupCategCode: state.categCode || "",
    });
  };

  const openResultLookup = (index, source) => {
    if (isFormDisabled) return;
    setSelectedResultIndex(index);

    const modalMap = {
      resultCategory: "showFaCategoryModal",
      resultClass: "showFaClassModal",
      resultLocation: "showFaLocModal",
      resultDepartment: "showRcModal",
      resultEmployee: "payeeModalOpen",
    };

    if (source === "resultClass" && !String(resultRows[index]?.categCode || "").trim()) {
      useSwalErrorAlert("Sub Category", "Please select a Category first.");
      return;
    }

    updateState({
      accountModalSource: source,
      faClassLookupCategCode: resultRows[index]?.categCode || "",
      [modalMap[source]]: true,
    });
  };

  const handleCloseFaCategoryModal = async (selectedCategory) => {
    if (selectedCategory && state.accountModalSource === "headerCategory") {
      const categCode = selectedCategory.code || selectedCategory.categCode || "";
      const categName = selectedCategory.description || selectedCategory.categName || selectedCategory.code || "";
      updateState({
        categCode,
        categName,
        classCode: "",
        className: "",
        showFaCategoryModal: false,
        showFaClassModal: true,
        accountModalSource: "headerClass",
        faClassLookupCategCode: categCode,
      });
      return;
    }

    if (selectedCategory && state.accountModalSource === "resultCategory") {
      const categCode = selectedCategory.code || selectedCategory.categCode || "";
      const categName = selectedCategory.description || selectedCategory.categName || selectedCategory.code || "";
      const updates = {
        categCode,
        categName,
        classCode: "",
        className: "",
      };
      const targetIndexes = await getReclassTargetIndexes(
        selectedResultIndex,
        "Copy Category?",
        "Do you want to copy the selected Category to the other Result Asset rows?"
      );

      if (!validateReclassResultChange(targetIndexes, updates)) return;

      applyResultRowsChange(targetIndexes, updates);
      updateState({
        showFaCategoryModal: false,
        showFaClassModal: true,
        accountModalSource: "resultClass",
        faClassLookupCategCode: categCode,
      });
      return;
    }

    updateState({ showFaCategoryModal: false, accountModalSource: null });
  };

  const handleCloseFaClassModal = async (selectedClass) => {
    if (selectedClass && state.accountModalSource === "headerClass") {
      updateState({
        classCode: selectedClass.code || selectedClass.classCode || "",
        className: selectedClass.description || selectedClass.className || selectedClass.code || "",
        categCode: selectedClass.categCode || state.categCode || "",
      });
    }

    if (selectedClass && state.accountModalSource === "resultClass") {
      const selectedRow = resultRows[selectedResultIndex] || {};
      const updates = {
        classCode: selectedClass.code || selectedClass.classCode || "",
        className: selectedClass.description || selectedClass.className || selectedClass.code || "",
        categCode: selectedClass.categCode || selectedRow.categCode || "",
        categName: selectedClass.categName || selectedRow.categName || "",
      };
      const targetIndexes = await getReclassTargetIndexes(
        selectedResultIndex,
        "Copy Sub Category?",
        "Do you want to copy the selected Category and Sub Category to the other Result Asset rows?"
      );

      if (!validateReclassResultChange(targetIndexes, updates)) return;

      applyResultRowsChange(targetIndexes, updates);
    }
    updateState({ showFaClassModal: false, faClassLookupCategCode: "", accountModalSource: null });
  };

  const handleCloseFaLocModal = (selectedLocation) => {
    if (selectedLocation && state.accountModalSource === "headerLocation") {
      updateState({
        assetLocationCode: selectedLocation.code || selectedLocation.flocCode || selectedLocation.floc_code || "",
        assetLocationName: selectedLocation.description || selectedLocation.name || selectedLocation.flocName || "",
      });
    }

    if (selectedLocation && state.accountModalSource === "resultLocation") {
      updateResultRow(selectedResultIndex, {
        flocCode: selectedLocation.code || selectedLocation.flocCode || selectedLocation.floc_code || "",
        flocName: selectedLocation.description || selectedLocation.name || selectedLocation.flocName || "",
      });
    }
    updateState({ showFaLocModal: false, accountModalSource: null });
  };

  const handleCloseRcModal = async (selectedRc) => {
    if (selectedRc && state.accountModalSource === "headerDepartment") {
      updateState({
        assetDepartmentCode: selectedRc.rcCode || selectedRc.rc_code || "",
        assetDepartmentName: selectedRc.rcName || selectedRc.rc_name || selectedRc.description || "",
      });
    }

    if (selectedRc && state.accountModalSource === "glRcCode" && selectedRowIndex !== null) {
      await applyGlLookupChange(selectedRowIndex, "rcCode", selectedRc);
    }

    if (selectedRc && state.accountModalSource === "resultDepartment") {
      updateResultRow(selectedResultIndex, {
        rcCode: selectedRc.rcCode || selectedRc.rc_code || "",
        rcName: selectedRc.rcName || selectedRc.rc_name || selectedRc.description || "",
      });
    }

    updateState({ showRcModal: false, accountModalSource: null });
  };

  const handleClosePayeeModal = (selectedPayee) => {
    if (selectedPayee && state.accountModalSource === "resultEmployee") {
      updateResultRow(selectedResultIndex, {
        empNo: selectedPayee.vendCode || selectedPayee.empNo || "",
        empName: selectedPayee.vendName || selectedPayee.empName || "",
      });
    }
    updateState({ payeeModalOpen: false, accountModalSource: null });
  };

  const handleCloseAccountModal = async (selectedAccount) => {
    if (selectedAccount && state.accountModalSource === "glAcctCode" && selectedRowIndex !== null) {
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
    fars_no: state.farsNo,
    branch: state.branchCode,
    doc_id: docType,
  };

  const renderSourceCell = (columnKey, row, index) => {
    const columnMeta = sourceColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getSourceColumnStyle(columnKey, columnMeta.width || 120),
      ...getSourceFrozenStyle(columnKey, orderedSourceColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";
    const amountFields = ["acqCost", "deprMonth", "eul", "rul", "accumDepr", "salvageValue", "netbookValue"];

    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    if (amountFields.includes(columnKey)) {
      return (
        <td key={columnKey} style={style} className="global-tran-td-ui text-right">
          <input
            type="text"
            id={`source-${columnKey}-${index}`}
            className="w-full global-tran-td-inputclass-ui text-right"
            value={row[columnKey] || ""}
            disabled
            readOnly
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
              id={`source-${columnKey}-${index}`}
              className={`w-full global-tran-td-inputclass-ui pr-8 ${alignClass}`}
              value={row[columnKey] || ""}
              disabled={isFormDisabled}
              readOnly
            />
            {!isFormDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() =>
                  useSwalHandleOpenSpecsModal(
                    index,
                    sourceRows,
                    (rowIndex, field, value) =>
                      setSourceRows((prev) =>
                        prev.map((item, i) => (i === rowIndex ? { ...item, [field]: value } : item))
                      ),
                    row.remarks,
                    "Source Assets Remarks",
                    "remarks",
                    "Enter source asset remarks..."
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
          type="text"
          className={`w-full global-tran-td-inputclass-ui ${alignClass}`}
          value={row[columnKey] || ""}
          disabled
          readOnly
        />
      </td>
    );
  };

  const renderResultCell = (columnKey, row, index) => {
    const columnMeta = resultColumns.find((column) => column.key === columnKey) || {};
    const style = {
      ...getResultColumnStyle(columnKey, columnMeta.width || 120),
      ...getResultFrozenStyle(columnKey, orderedResultColumns, columnMeta.width || 120, { isHeader: false }),
    };
    const alignClass = columnMeta.align || "text-left";
    const amountFields = ["acqCost", "deprMonth", "eul", "rul", "accumDepr", "salvageValue", "netbookValue"];

    if (columnKey === "ln") {
      return <td key={columnKey} style={style} className={`global-tran-td-ui ${alignClass}`}>{index + 1}</td>;
    }

    if (columnKey === "assetDescription") {
      const isEditable = (isSplitType || isMergeType) && !isFormDisabled;
      return (
        <td key={columnKey} style={style} className="global-tran-td-ui relative">
          <div className="relative flex items-center">
            <input
              type="text"
              id={`result-assetDescription-${index}`}
              className={`w-full global-tran-td-inputclass-ui pr-8 ${alignClass}`}
              value={row.assetDescription || ""}
              disabled={!isEditable}
              readOnly
            />
            {isEditable && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() =>
                  useSwalHandleOpenSpecsModal(
                    index,
                    resultRows,
                    (rowIndex, field, value) => updateResultRow(rowIndex, { [field]: value }),
                    row.assetDescription,
                    "Asset Description",
                    "assetDescription",
                    "Enter asset description..."
                  )
                }
              />
            )}
          </div>
        </td>
      );
    }

    const lookupConfig = {
      categName: { source: "resultCategory", valueKey: "categName" },
      className: { source: "resultClass", valueKey: "className" },
    }[columnKey];

    if (lookupConfig) {
      const isMergeCategoryOrClass = isMergeType && ["categName", "className"].includes(columnKey);
      const isOriginalNewValueCategoryClass = isOriginalNewValueType && ["categName", "className"].includes(columnKey);
      const isLookupDisabled = isFormDisabled || isSplitType || isMergeCategoryOrClass || isOriginalNewValueCategoryClass;
      return (
        <td key={columnKey} className="global-tran-td-ui" style={style}>
          <div className="relative w-full">
            <input
              type="text"
              id={`${columnKey}-${index}`}
              className={`w-full pr-6 global-tran-td-inputclass-ui cursor-pointer ${alignClass}`}
              value={row[lookupConfig.valueKey] || ""}
              readOnly
              disabled={isLookupDisabled}
            />
            {!isLookupDisabled && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() => openResultLookup(index, lookupConfig.source)}
              />
            )}
          </div>
        </td>
      );
    }

    const readOnlyGenerated = columnKey === "faCode" || columnKey === "tagNo";
    const readOnlyMergeCategoryClass = isMergeType && ["categCode", "categName", "classCode", "className"].includes(columnKey);
    const readOnlyReclassCategoryClassCodes = isReclassType && ["categCode", "classCode"].includes(columnKey);
    const readOnlyOriginalNewValueCategoryClass = isOriginalNewValueType && ["categCode", "classCode"].includes(columnKey);
    const readOnlyAssignmentFields = ["flocCode", "flocName", "rcCode", "rcName", "empNo", "empName"].includes(columnKey);
    const isReadOnly = isFormDisabled || readOnlyGenerated || readOnlyMergeCategoryClass || readOnlyReclassCategoryClassCodes || readOnlyOriginalNewValueCategoryClass || readOnlyAssignmentFields;

    if (amountFields.includes(columnKey)) {
      const isAmountReadOnly =
        isFormDisabled ||
        isMergeType ||
        (isSplitLikeType && columnKey !== "acqCost" && !(isComponentizationType && columnKey === "rul")) ||
        (isCapitalizationAdjustmentType && ["eul", "netbookValue"].includes(columnKey)) ||
        (isValueCorrectionType && ["eul", "netbookValue"].includes(columnKey));
      const isWholeMonthField =
        (isCapitalizationAdjustmentType && ["eul", "rul"].includes(columnKey)) ||
        ((isComponentizationType || isValueCorrectionType) && columnKey === "rul");

      return (
        <td key={columnKey} style={style} className="global-tran-td-ui text-right">
          <input
            type="text"
            id={`result-${columnKey}-${index}`}
            className="w-full global-tran-td-inputclass-ui text-right"
            value={row[columnKey] || ""}
            readOnly={isAmountReadOnly}
            disabled={isAmountReadOnly}
            onChange={(event) => {
              if (isAmountReadOnly) return;
              if (isWholeMonthField) {
                const nextValue = event.target.value;
                if (/^\d*$/.test(nextValue)) {
                  const updates = { [columnKey]: nextValue };
                  if (isComponentizationType && columnKey === "rul" && parseWholeMonths(nextValue) > 0) {
                    Object.assign(updates, computeComponentizationDeprMonth(resultRows[index] || {}, updates));
                  }
                  if (isValueCorrectionType && columnKey === "rul" && parseWholeMonths(nextValue) > 0) {
                    Object.assign(updates, computeValueCorrectionAmounts(resultRows[index] || {}, updates));
                  }
                  updateResultRow(index, updates);
                }
                return;
              }
              const sanitizedValue = event.target.value.replace(/[^0-9.]/g, "");
              if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                const updates = { [columnKey]: sanitizedValue };
                if (isSplitLikeType && columnKey === "acqCost") {
                  Object.assign(updates, getSplitAllocatedAmounts(sumAssetAmounts(sourceRows), sanitizedValue));
                  if (isComponentizationType) {
                    Object.assign(updates, computeComponentizationDeprMonth(resultRows[index] || {}, updates));
                  }
                }
                if (isCapitalizationAdjustmentType && ["acqCost", "accumDepr", "salvageValue"].includes(columnKey)) {
                  Object.assign(updates, computeCapitalizationAdjustmentAmounts(resultRows[index] || {}, updates));
                }
                if (isValueCorrectionType && ["acqCost", "accumDepr"].includes(columnKey)) {
                  Object.assign(updates, computeValueCorrectionAmounts(resultRows[index] || {}, updates));
                }
                if (isValueCorrectionType && columnKey === "salvageValue") {
                  const netbookValue = Math.max(0, parseFormattedNumber(resultRows[index]?.netbookValue || resultRows[index]?.nbValue || 0) || 0);
                  if ((parseFormattedNumber(sanitizedValue || 0) || 0) > netbookValue) return;
                  Object.assign(updates, computeValueCorrectionAmounts(resultRows[index] || {}, updates));
                }
                if (isValueCorrectionType && columnKey === "deprMonth") {
                  Object.assign(updates, computeValueCorrectionRul(resultRows[index] || {}, updates));
                }
                if (isCapitalizationAdjustmentType && columnKey === "deprMonth") {
                  const maxDeprMonth = getCapitalizationAdjustmentMaxDeprMonth(resultRows[index] || {});
                  if ((parseFormattedNumber(sanitizedValue || 0) || 0) > maxDeprMonth) return;
                }
                updateResultRow(index, updates);
              }
            }}
            onFocus={(event) => {
              if (!isAmountReadOnly && parseFormattedNumber(event.target.value || 0) === 0) {
                const updates = { [columnKey]: "" };
                if (isSplitLikeType && columnKey === "acqCost") {
                  Object.assign(updates, getSplitAllocatedAmounts(sumAssetAmounts(sourceRows), 0));
                  if (isComponentizationType) {
                    Object.assign(updates, computeComponentizationDeprMonth(resultRows[index] || {}, updates));
                  }
                }
                if ((isCapitalizationAdjustmentType || isComponentizationType || isValueCorrectionType) && columnKey === "rul") {
                  updateResultRow(index, { rul: "" });
                  return;
                }
                if (isCapitalizationAdjustmentType && ["acqCost", "accumDepr", "salvageValue"].includes(columnKey)) {
                  Object.assign(updates, computeCapitalizationAdjustmentAmounts(resultRows[index] || {}, updates));
                }
                if (isValueCorrectionType && ["acqCost", "accumDepr"].includes(columnKey)) {
                  Object.assign(updates, computeValueCorrectionAmounts(resultRows[index] || {}, updates));
                }
                updateResultRow(index, updates);
              }
            }}
            onBlur={(event) => {
              if (isAmountReadOnly) return;
              if (isCapitalizationAdjustmentType && columnKey === "rul") {
                commitCapitalizationAdjustmentMonth(index, columnKey, event.target.value, { moveNext: true });
                return;
              }
              if (isComponentizationType && columnKey === "rul") {
                commitComponentizationRul(index, event.target.value, { moveNext: true });
                return;
              }
              if (isValueCorrectionType && columnKey === "rul") {
                commitValueCorrectionRul(index, event.target.value, { moveNext: true });
                return;
              }
              if (isCapitalizationAdjustmentType && ["accumDepr", "salvageValue"].includes(columnKey)) {
                commitCapitalizationAdjustmentAmount(index, columnKey, event.target.value, { moveNext: true });
                return;
              }
              if (isValueCorrectionType && ["accumDepr", "salvageValue", "deprMonth"].includes(columnKey)) {
                commitValueCorrectionAmount(index, columnKey, event.target.value, { moveNext: true });
                return;
              }
              if (isCapitalizationAdjustmentType && columnKey === "deprMonth") {
                commitCapitalizationAdjustmentDeprMonth(index, event.target.value, { moveNext: true });
                return;
              }
              if (columnKey === "acqCost") {
                commitResultAcqCost(index, event.target.value, { moveNext: true });
                return;
              }
              updateResultRow(index, { [columnKey]: formatNumber(event.target.value || 0) });
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || isAmountReadOnly) return;
              if (!["acqCost", "rul", "deprMonth", "accumDepr", "salvageValue"].includes(columnKey)) return;
              event.preventDefault();
              if (isCapitalizationAdjustmentType && columnKey === "rul") {
                commitCapitalizationAdjustmentMonth(index, columnKey, event.currentTarget.value, { moveNext: true });
                return;
              }
              if (isComponentizationType && columnKey === "rul") {
                commitComponentizationRul(index, event.currentTarget.value, { moveNext: true });
                return;
              }
              if (isValueCorrectionType && columnKey === "rul") {
                commitValueCorrectionRul(index, event.currentTarget.value, { moveNext: true });
                return;
              }
              if (isCapitalizationAdjustmentType && ["accumDepr", "salvageValue"].includes(columnKey)) {
                commitCapitalizationAdjustmentAmount(index, columnKey, event.currentTarget.value, { moveNext: true });
                return;
              }
              if (isValueCorrectionType && ["accumDepr", "salvageValue", "deprMonth"].includes(columnKey)) {
                commitValueCorrectionAmount(index, columnKey, event.currentTarget.value, { moveNext: true });
                return;
              }
              if (isCapitalizationAdjustmentType && columnKey === "deprMonth") {
                commitCapitalizationAdjustmentDeprMonth(index, event.currentTarget.value, { moveNext: true });
                return;
              }
              commitResultAcqCost(index, event.currentTarget.value, { moveNext: true });
            }}
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
              id={`result-${columnKey}-${index}`}
              className={`w-full global-tran-td-inputclass-ui pr-8 ${alignClass}`}
              value={row[columnKey] || ""}
              disabled={isReadOnly}
              readOnly
            />
            {!isReadOnly && (
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                onClick={() =>
                  useSwalHandleOpenSpecsModal(
                    index,
                    resultRows,
                    (rowIndex, field, value) =>
                      setResultRows((prev) =>
                        prev.map((item, i) => (i === rowIndex ? { ...item, [field]: value } : item))
                      ),
                    row.remarks,
                    detailTab === "source" ? "Source Assets Remarks" : "Result Assets Remarks",
                    "remarks",
                    detailTab === "source"
                      ? "Enter source asset remarks..."
                      : "Enter result asset remarks..."
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
          type="text"
          id={`result-${columnKey}-${index}`}
          className={`w-full global-tran-td-inputclass-ui ${alignClass}`}
          value={row[columnKey] || ""}
          disabled={isReadOnly}
          readOnly={isReadOnly}
          onChange={(event) => updateResultRow(index, { [columnKey]: event.target.value })}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || isReadOnly || columnKey !== "remarks") return;
            event.preventDefault();
            moveToNextResultCell(index, "remarks");
          }}
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

  const renderAssetTotals = (totals) => {
    if (!withCostAmount) return null;

    return (
      <div className="global-tran-tab-footer-total-main-div-ui grid gap-1 grid-cols-[auto_auto]">
        {amountKeys.map((key) => (
          <Fragment key={key}>
            <div className="global-tran-tab-footer-total-label-ui">{amountTotalLabels[key]}:</div>
            <div className="global-tran-tab-footer-total-value-ui">{totals[key]}</div>
          </Fragment>
        ))}
      </div>
    );
  };

  const renderSourceTable = () => (
    <>
      <div className="global-tran-table-main-div-ui">
        <div className="global-tran-table-main-sub-div-ui">
          <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
            <thead className="global-tran-thead-div-ui">
              <tr>
                {orderedSourceColumns.map((column) =>
                  renderSourceHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedSourceColumns,
                  })
                )}
                {!isFormDisabled && (
                  <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {sortedSourceRows.map((entry) => {
                const row = entry.row;
                const originalIndex = entry.originalIndex;
                return (
                  <tr key={originalIndex} className="global-tran-tr-ui">
                    {orderedSourceColumns.map((column) => renderSourceCell(column.key, row, originalIndex))}
                    {!isFormDisabled && (
                      <td style={transactionActionsCellStyle} className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleOpenFAMastLookup(originalIndex)}>
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                          {!hideAssetDeleteActions && (
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteSourceRow(originalIndex)}>
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {renderSourceHeaderContextMenu()}
        </div>
      </div>
      <div className="global-tran-tab-footer-main-div-ui">
        <div className="global-tran-tab-footer-button-div-ui">
          <button type="button" className="global-tran-tab-footer-button-add-ui" onClick={() => handleOpenFAMastLookup()} disabled={isFormDisabled} style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
          </button>
        </div>
        {renderAssetTotals(sourceTotals)}
      </div>
    </>
  );

  const renderResultTable = () => (
    <>
      <div className="global-tran-table-main-div-ui">
        <div className="global-tran-table-main-sub-div-ui">
          <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
            <thead className="global-tran-thead-div-ui">
              <tr>
                {orderedResultColumns.map((column) =>
                  renderResultHeader(column.label, column.key, column.width, {
                    orderedColumns: orderedResultColumns,
                  })
                )}
                {!isFormDisabled && (
                  <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="relative">
              {sortedResultRows.map((entry) => {
                const row = entry.row;
                const originalIndex = entry.originalIndex;
                return (
                  <tr key={originalIndex} className="global-tran-tr-ui">
                    {orderedResultColumns.map((column) => renderResultCell(column.key, row, originalIndex))}
                    {!isFormDisabled && (
                      <td style={transactionActionsCellStyle} className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black">
                        <div className="flex items-center justify-center gap-1">
                          {canAddResultRow && (
                            <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddResultRow(originalIndex)}>
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                          )}
                          {!hideAssetDeleteActions && !isReclassType && (
                            <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteResultRow(originalIndex)}>
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {renderResultHeaderContextMenu()}
        </div>
      </div>
      <div className="global-tran-tab-footer-main-div-ui">
        <div className="global-tran-tab-footer-button-div-ui">
          <button type="button" className="global-tran-tab-footer-button-add-ui" onClick={() => handleAddResultRow()} disabled={isFormDisabled || !canAddResultRow} style={{ visibility: isFormDisabled || !canAddResultRow ? "hidden" : "visible" }}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
          </button>
        </div>
        {renderAssetTotals(resultTotals)}
      </div>
    </>
  );

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
          isSaveDisabled={state.isSaveDisabled || isFormDisabled || (sourceRows.length === 0 && resultRows.length === 0)}
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
                    onLookup={() => updateState({ branchModalOpen: true })}
                  />
                  <FieldRenderer
                    id="farsNo"
                    label="FARS No."
                    type="lookup"
                    value={state.farsNo}
                    disabled={state.isDocNoDisabled || isFormDisabled}
                    readOnly
                    editableLookup
                    onLookup={() => updateState({ showAllTranDocNo: true })}
                  />
                  <div className="relative w-full">
                    <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                      <DateFormatInput
                        id="farsDate"
                        className={`peer flex-grow bg-transparent border-none px-3 focus:outline-none ${isFormDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                        value={state.farsDate}
                        disabled={isFormDisabled}
                        updateState={(updates) => {
                          if (isFormDisabled) return;
                          updateState({ farsDate: updates.farsDate });
                        }}
                      />
                    </div>
                    <label htmlFor="farsDate" className="global-ref-floating-label global-ref-label-enabled">FARS Date</label>
                  </div>
                  <FieldRenderer
                    id="restructuringType"
                    label="FARS Type"
                    required
                    type="select"
                    value={state.restructuringType || "FARS01"}
                    disabled={isFormDisabled || hasAssetDetails}
                    onChange={handleRestructuringTypeChange}
                    options={(state.restructuringTypeList || []).map((type) => ({
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
                    disabled={isFormDisabled || hasSourceAssets}
                    readOnly
                    editableLookup
                    onLookup={handleOpenFaCategoryModal}
                    onClear={() => {
                      if (hasSourceAssets) return;
                      updateState({ categCode: "", categName: "", classCode: "", className: "" });
                    }}
                  />
                  <input type="hidden" id="classCode" value={state.classCode || ""} readOnly />
                  <FieldRenderer
                    id="className"
                    label="Asset Sub Category"
                    type="lookup"
                    value={state.className}
                    disabled={isFormDisabled || hasSourceAssets}
                    readOnly
                    editableLookup
                    onLookup={handleOpenFaClassModal}
                    onClear={() => {
                      if (hasSourceAssets) return;
                      updateState({ classCode: "", className: "" });
                    }}
                  />
                </div>

                <div className="global-tran-textbox-group-div-ui min-w-0">
                  <FieldRenderer
                    id="referenceNo"
                    label="Reference No."
                    required
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
                        value={state.currCode ? `${state.currCode}${state.currName ? ` - ${state.currName}` : ""}` : ""}
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
                    onChange={(event) => updateState({ remarks: event.target.value })}
                  />
                  <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button
                className={`global-tran-tab-padding-ui ${detailTab === "source" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                onClick={() => setDetailTab("source")}
              >
                Source Assets
              </button>
              <button
                className={`global-tran-tab-padding-ui ${detailTab === "result" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                onClick={() => setDetailTab("result")}
              >
                Result Assets
              </button>
            </div>
          </div>
          {detailTab === "source" ? renderSourceTable() : renderResultTable()}
        </div>

        {showGeneralLedgerSection && (
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
                      <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>
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
                          <td style={transactionActionsCellStyle} className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" className="global-tran-td-button-add-ui" onClick={() => handleAddRowGL(originalIndex)} title="Add">
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button type="button" className="global-tran-td-button-delete-ui" onClick={() => handleDeleteRowGL(originalIndex)} title="Delete">
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
              <button type="button" className="global-tran-tab-footer-button-add-ui" onClick={() => handleAddRowGL()} disabled={isFormDisabled} style={{ visibility: isFormDisabled ? "hidden" : "visible" }}>
                <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
              </button>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">Total Debit ({state.glCurrDefault}):</label>
                <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">{glTotals.totalDebit}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">Total Credit ({state.glCurrDefault}):</label>
                <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">{glTotals.totalCredit}</label>
              </div>
              {state.glCurrDefault !== state.currCode && (
                <div className="global-tran-tab-footer-total-main-div-ui">
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">Total Debit ({state.currCode}):</label>
                    <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">{glTotals.totalDebitFx1}</label>
                  </div>
                  <div className="global-tran-tab-footer-total-div-ui">
                    <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">Total Credit ({state.currCode}):</label>
                    <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">{glTotals.totalCreditFx1}</label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getFARSHistory"
          cacheKey={`FARS:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
          activeTabKey="FARS_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal isOpen={state.branchModalOpen} onClose={handleCloseBranchModal} />
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
          singleSelect={isSplitLikeType}
        />
      )}

      {state.showFaCategoryModal && (
        <SearchFACateg isOpen={state.showFaCategoryModal} onClose={handleCloseFaCategoryModal} />
      )}

      {state.showFaClassModal && (
        <SearchFAClass
          isOpen={state.showFaClassModal}
          onClose={handleCloseFaClassModal}
          categCode={state.faClassLookupCategCode || ""}
        />
      )}

      {state.showFaLocModal && (
        <SearchFALoc
          isOpen={state.showFaLocModal}
          onClose={handleCloseFaLocModal}
          branchCode={state.branchCode}
        />
      )}

      {state.showRcModal && (
        <RCLookupModal isOpen={state.showRcModal} onClose={handleCloseRcModal} source={state.accountModalSource} />
      )}

      {state.showAccountModal && (
        <COAMastLookupModal isOpen={state.showAccountModal} onClose={handleCloseAccountModal} source={state.accountModalSource} />
      )}

      {state.showSlModal && (
        <SLMastLookupModal isOpen={state.showSlModal} onClose={handleCloseSlModal} customParam={glRows[selectedRowIndex]?.sltypeCode || ""} />
      )}

      {state.payeeModalOpen && (
        <PayeeMastLookupModal isOpen={state.payeeModalOpen} onClose={handleClosePayeeModal} customParam="Employee" />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType,
            documentTitle,
            fieldNo: "farsNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo: state.farsNo }}
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
            docNo: state.farsNo,
          }}
        />
      )}

      {state.showCancelModal && (
        <CancelTranModal isOpen={state.showCancelModal} onClose={handleCloseCancel} />
      )}

      {state.showPostModal && (
        <PostFARS
          isOpen={state.showPostModal}
          onClose={() => updateState({ showPostModal: false })}
          userCode={state.userCode || currentUserRow?.userCode || ""}
        />
      )}
    </div>
  );
};

export default FARS;
