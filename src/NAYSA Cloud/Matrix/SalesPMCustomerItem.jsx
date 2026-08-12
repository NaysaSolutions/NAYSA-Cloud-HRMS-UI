

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Undo2,
  Search,
  MoreVertical,
  Plus,
  Trash2,
  Pencil,
  Tags,
  PackageSearch,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faCopy,
  faDownload,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import AreaLookupModal from "@/NAYSA Cloud/Lookup/SearchArea";
import CustomerTypeLookupModal from "@/NAYSA Cloud/Lookup/SearchCustType";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast";
import SalesPMCustomerPriority from "./SalesPMCustomerPriority.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import { useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";

const DOC_TYPE = "SalesPMCustomerItem";
const DELETE_ENDPOINT = "/deletePriceMatrix";
const HISTORY_BY_TYPE_ENDPOINT = "/historyPriceMatrix";
const HISTORY_BY_ITEM_ENDPOINT = "/historyPriceMatrixperItem";

const MATRIX_TYPE_OPTIONS = [
  { value: "PMCUST", label: "Per Customer" },
  { value: "PMAREA", label: "Per Area" },
  { value: "PMCHAIN", label: "Per Chain Customer" },
  { value: "PMCTYPE", label: "Per Customer Type" },
];

const TABS = [
  { key: "details", label: "Matrix Details" },
  { key: "history", label: "Matrix History" },
  { key: "priority", label: "Matrix Priority" },
];

const HISTORY_TABS = [
  { key: "historyType", label: "Matrix History per Type", icon: Tags },
  { key: "historyItem", label: "Matrix History per Item", icon: PackageSearch },
];

const MATRIX_TYPE_META = {
  PMCUST: {
    codeLabel: "Customer Code",
    nameLabel: "Customer Name",
    infoTitle: "Customer Information",
    historyTitle: "Customer Matrix History",
    pageTitle: "Price Matrix per Customer",
    entityLabel: "customer",
  },
  PMAREA: {
    codeLabel: "Area Code",
    nameLabel: "Area Name",
    infoTitle: "Area Information",
    historyTitle: "Area Matrix History",
    pageTitle: "Price Matrix per Area",
    entityLabel: "area",
  },
  PMCHAIN: {
    codeLabel: "Chain Customer Code",
    nameLabel: "Chain Customer Name",
    infoTitle: "Chain Customer Information",
    historyTitle: "Chain Customer Matrix History",
    pageTitle: "Price Matrix per Chain Customer",
    entityLabel: "chain customer",
  },
  PMCTYPE: {
    codeLabel: "Customer Type Code",
    nameLabel: "Customer Type Name",
    infoTitle: "Customer Type Information",
    historyTitle: "Customer Type Matrix History",
    pageTitle: "Price Matrix per Customer Type",
    entityLabel: "customer type",
  },
};

const DEFAULT_HEADER = {
  pmId: "",
  pmType: "PMCUST",
  pmCode: "",
  pmName: "",
  effectivityDate: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const DEFAULT_HISTORY_TYPE_FILTER = {
  pmType: "PMCUST",
  pmCode: "",
  pmName: "",
  startDate: "",
  endDate: "",
};

const DEFAULT_HISTORY_ITEM_FILTER = {
  pmType: "PMCUST",
  itemCode: "",
  itemName: "",
  uomCode: "",
  pmCode: "",
  pmName: "",
  startDate: "",
  endDate: "",
};

const PRICE_KEYS = [
  "sellingPrice",
  "discRate1",
  "discRate2",
  "discRate3",
  "discRate4",
  "discRate5",
  "discRate6",
  "discRate7",
  "discRate8",
];

const RATE_KEYS = [
  "discRate1",
  "discRate2",
  "discRate3",
  "discRate4",
  "discRate5",
  "discRate6",
  "discRate7",
  "discRate8",
];

const TEMPLATE_COLUMNS = [
  { key: "categName", label: "Category Name", width: 180 },
  { key: "itemCode", label: "Item Code", width: 130 },
  { key: "itemName", label: "Item Name", width: 240 },
  { key: "uomCode", label: "UOM", width: 90 },
  { key: "sellingPrice", label: "Selling Price", width: 130 },
  { key: "discRate1", label: "Disc. Rate 1", width: 110 },
  { key: "discRate2", label: "Disc. Rate 2", width: 110 },
  { key: "discRate3", label: "Disc. Rate 3", width: 110 },
  { key: "discRate4", label: "Disc. Rate 4", width: 110 },
  { key: "discRate5", label: "Disc. Rate 5", width: 110 },
  { key: "discRate6", label: "Disc. Rate 6", width: 110 },
  { key: "discRate7", label: "Disc. Rate 7", width: 110 },
  { key: "discRate8", label: "Disc. Rate 8", width: 110 },
];

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const safeObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const stripCommas = (value) => String(value ?? "").replace(/,/g, "").trim();
const toNumberText = (value) =>
  value === null || value === undefined ? "" : String(value);

const extractResultPayload = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data?.[0] ??
    response?.data;

  if (!raw) return {};
  return safeObject(raw);
};

const extractResultArray = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data ??
    [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeDecimalInput = (value) => {
  const text = stripCommas(value);
  if (!text) return "";
  if (!/^\d*(\.\d*)?$/.test(text)) return value;
  return text;
};

const isZeroValue = (value) => {
  const text = stripCommas(value);
  if (text === "") return false;
  const num = Number(text);
  return !Number.isNaN(num) && num === 0;
};

const formatNumberWithCommas = (value, decimals = 2) => {
  const text = stripCommas(value);
  const num = Number(text || 0);

  if (Number.isNaN(num)) {
    return Number(0).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatPlainDecimal = (value, decimals = 2) => {
  const text = stripCommas(value);
  const num = Number(text || 0);

  if (Number.isNaN(num)) return Number(0).toFixed(decimals);
  return num.toFixed(decimals);
};

const sanitizeFileName = (name) =>
  String(name ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .substring(0, 120);

const getDateTimeStamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
};

const normalizeHeaderText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toUploadNumber = (value, max = null) => {
  const raw = stripCommas(value);
  if (raw === "") return 0;

  const num = Number(raw);
  if (Number.isNaN(num) || num < 0) return 0;
  if (max !== null && num > max) return max;
  return num;
};

const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true;
  return new Date(startDate) <= new Date(endDate);
};

const formatDateTimeCell = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const mapHistoryRows = (rawRows = [], pmType = "PMCUST") =>
  safeArray(rawRows)
    .map((item, index) => ({
      id:
        item.pmId ||
        item.pm_id ||
        `${item.itemCode || item.item_code || "ROW"}_${index}`,

      pmId: item.pmId || item.pm_id || "",
      pmType: item.pmType || item.pm_type || pmType,
      pmCode: item.pmCode || item.pm_code || "",
      pmName: item.pmName || item.pm_name || "",

      itemCode: item.itemCode || item.item_code || "",
      itemName: item.itemName || item.item_name || "",
      uomCode: item.uomCode || item.uom_code || "",

      sellingPrice:
        item.sellingPrice ?? item.selling_price ?? 0,
      discRate1:
        item.discRate1 ?? item.disc_rate1 ?? 0,
      discRate2:
        item.discRate2 ?? item.disc_rate2 ?? 0,
      discRate3:
        item.discRate3 ?? item.disc_rate3 ?? 0,
      discRate4:
        item.discRate4 ?? item.disc_rate4 ?? 0,
      discRate5:
        item.discRate5 ?? item.disc_rate5 ?? 0,
      discRate6:
        item.discRate6 ?? item.disc_rate6 ?? 0,
      discRate7:
        item.discRate7 ?? item.disc_rate7 ?? 0,
      discRate8:
        item.discRate8 ?? item.disc_rate8 ?? 0,

      effectivityDate: item.effectivityDate || item.effectivity_date || "",
      registeredBy: item.registeredBy || item.registered_by || "",
      registeredDate: item.registeredDate || item.registered_date || "",
      updatedBy: item.updatedBy || item.updated_by || "",
      updatedDate: item.updatedDate || item.updated_date || "",
    }))
    .filter(
      (row) =>
        String(row.pmId || "").trim() !== "" ||
        String(row.itemCode || "").trim() !== "" ||
        String(row.pmCode || "").trim() !== ""
    );

export default function SalesPMCustomerItem() {
  const { currentUserRow, companyInfo } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("details");
  const [activeHistoryTab, setActiveHistoryTab] = useState("historyType");

  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  const [historyTypeFilter, setHistoryTypeFilter] = useState(
    DEFAULT_HISTORY_TYPE_FILTER
  );
  const [historyTypeRows, setHistoryTypeRows] = useState([]);

  const [historyItemFilter, setHistoryItemFilter] = useState(
    DEFAULT_HISTORY_ITEM_FILTER
  );
  const [historyItemRows, setHistoryItemRows] = useState([]);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showChainModal, setShowChainModal] = useState(false);
  const [showCustomerTypeModal, setShowCustomerTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyActionLoading, setHistoryActionLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const inputRefs = useRef({});
  const guideRef = useRef(null);
  const optionsRef = useRef(null);
  const uploadInputRef = useRef(null);
  const priorityTabRef = useRef(null);

  const pdfLink = reftablesPDFGuide?.[DOC_TYPE];
  const videoLink = reftablesVideoGuide?.[DOC_TYPE];
  const documentTitle = reftables?.[DOC_TYPE] || "Price Matrix";

  const sellPriceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
  const rateDecimals = 2;
  const discountLevel = Math.min(
    Math.max(Number(companyInfo?.salesDiscLevel ?? 8), 1),
    8
  );
  const visiblePriceKeys = useMemo(
    () =>
      PRICE_KEYS.filter((key) => {
        if (key === "sellingPrice") return true;

        const rateNo = Number(String(key).replace("discRate", ""));
        return rateNo <= discountLevel;
      }),
    [discountLevel]
  );
  const templateColumns = useMemo(
    () =>
      TEMPLATE_COLUMNS.filter((column) => {
        if (!RATE_KEYS.includes(column.key)) return true;

        const rateNo = Number(String(column.key).replace("discRate", ""));
        return rateNo <= discountLevel;
      }),
    [discountLevel]
  );
  const templateHeaderLabels = useMemo(
    () => templateColumns.map((column) => column.label),
    [templateColumns]
  );
  

  const matrixMeta = MATRIX_TYPE_META[header.pmType] || MATRIX_TYPE_META.PMCUST;
  const historyTypeMeta =
    MATRIX_TYPE_META[historyTypeFilter.pmType] || MATRIX_TYPE_META.PMCUST;
  const historyItemMeta =
    MATRIX_TYPE_META[historyItemFilter.pmType] || MATRIX_TYPE_META.PMCUST;
  const pageHeaderTitle = matrixMeta.pageTitle || documentTitle;
  const isHistoryTabActive = activeTab === "history";
  const isHistoryTypeActive = isHistoryTabActive && activeHistoryTab === "historyType";
  const isHistoryItemActive = isHistoryTabActive && activeHistoryTab === "historyItem";

  useEffect(() => {
    document.title = pageHeaderTitle;
  }, [pageHeaderTitle]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (guideRef.current && !guideRef.current.contains(event.target)) {
        setGuideOpen(false);
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setOptionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setHeaderField = (key, value) => {
    setHeader((prev) => ({ ...prev, [key]: value }));
  };

  const getInputRefKey = (rowId, key) => `${rowId}__${key}`;

  const focusCell = (rowId, key) => {
    const refKey = getInputRefKey(rowId, key);
    setTimeout(() => {
      const input = inputRefs.current[refKey];
      if (input) {
        input.focus();
        input.select?.();
      }
    }, 0);
  };

  const clearDetailTable = () => {
    setRows([]);
    setSelectedRow(null);
    inputRefs.current = {};
  };

  const resetMatrixForType = (pmType = "PMCUST") => {
    setHeader({ ...DEFAULT_HEADER, pmType });
    clearDetailTable();
  };

  const resetHistoryTypeSection = (pmType = historyTypeFilter.pmType || "PMCUST") => {
    setHistoryTypeFilter({
      ...DEFAULT_HISTORY_TYPE_FILTER,
      pmType,
    });
    setHistoryTypeRows([]);
  };

  const resetHistoryItemSection = (pmType = historyItemFilter.pmType || "PMCUST") => {
    setHistoryItemFilter({
      ...DEFAULT_HISTORY_ITEM_FILTER,
      pmType,
    });
    setHistoryItemRows([]);
  };

  const handleReset = () => {
    resetMatrixForType("PMCUST");
  };

  const handleHistoryTypeReset = () => {
    resetHistoryTypeSection(historyTypeFilter.pmType || "PMCUST");
  };

  const handleHistoryItemReset = () => {
    resetHistoryItemSection(historyItemFilter.pmType || "PMCUST");
  };

  const mapDetailRows = (dt1) =>
    safeArray(dt1).map((item, index) => ({
      id: `${item.itemCode || item.item_code || index}`,
      categName: item.categName || item.categ_name || "",
      itemCode: item.itemCode || item.item_code || "",
      itemName: item.itemName || item.item_name || "",
      uomCode: item.uomCode || item.uom_code || "",
      ...item,
      sellingPrice: formatNumberWithCommas(
        toNumberText(item.sellingPrice),
        sellPriceDecimals
      ),
      discRate1: formatPlainDecimal(toNumberText(item.discRate1), rateDecimals),
      discRate2: formatPlainDecimal(toNumberText(item.discRate2), rateDecimals),
      discRate3: formatPlainDecimal(toNumberText(item.discRate3), rateDecimals),
      discRate4: formatPlainDecimal(toNumberText(item.discRate4), rateDecimals),
      discRate5: formatPlainDecimal(toNumberText(item.discRate5), rateDecimals),
      discRate6: formatPlainDecimal(toNumberText(item.discRate6), rateDecimals),
      discRate7: formatPlainDecimal(toNumberText(item.discRate7), rateDecimals),
      discRate8: formatPlainDecimal(toNumberText(item.discRate8), rateDecimals),
    }));

  const fetchMatrix = async (sourceHeader = header) => {
    const params = {
      json_data: {
        pmId: sourceHeader.pmId || "",
        pmCode: sourceHeader.pmCode || "",
        pmName: sourceHeader.pmName || "",
        effectivityDate: sourceHeader.effectivityDate || "",
        pmType: sourceHeader.pmType || "PMCUST",
      },
    };

    const response = await apiClient.get("/getPriceMatrix", { params });
    const parsed = extractResultPayload(response);
    const dt1 = safeArray(parsed?.dt1);

    return {
      pmId: parsed?.pmId || parsed?.pm_id || sourceHeader.pmId || "",
      rows: mapDetailRows(dt1),
      registeredBy: parsed?.registeredBy || parsed?.registered_by || "",
      registeredDate: parsed?.registeredDate || parsed?.registered_date || "",
      lastUpdatedBy:
        parsed?.lastUpdatedBy || parsed?.updatedBy || parsed?.updated_by || "",
      lastUpdatedDate:
        parsed?.lastUpdatedDate || parsed?.updatedDate || parsed?.updated_date || "",
    };
  };

  const detailQuery = useQuery({
    queryKey: [
      "upsertPriceMatrix",
      header.pmId,
      header.pmType,
      header.pmCode,
      header.effectivityDate,
    ],
    enabled: false,
    queryFn: async () => fetchMatrix(header),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        json_data: {
          pmId: header.pmId,
          pmCode: header.pmCode,
          pmType: header.pmType,
          effectivityDate: header.effectivityDate,
          userCode: currentUserRow?.userCode || "ADMIN",
          dt1: rows.map((row) => ({
            categName: row.categName,
            itemCode: row.itemCode,
            itemName: row.itemName,
            uomCode: row.uomCode,
            sellingPrice:
              stripCommas(row.sellingPrice) === ""
                ? 0
                : Number(stripCommas(row.sellingPrice)),
            discRate1:
              stripCommas(row.discRate1) === ""
                ? 0
                : Number(stripCommas(row.discRate1)),
            discRate2:
              stripCommas(row.discRate2) === ""
                ? 0
                : Number(stripCommas(row.discRate2)),
            discRate3:
              stripCommas(row.discRate3) === ""
                ? 0
                : Number(stripCommas(row.discRate3)),
            discRate4:
              stripCommas(row.discRate4) === ""
                ? 0
                : Number(stripCommas(row.discRate4)),
            discRate5:
              stripCommas(row.discRate5) === ""
                ? 0
                : Number(stripCommas(row.discRate5)),
            discRate6:
              stripCommas(row.discRate6) === ""
                ? 0
                : Number(stripCommas(row.discRate6)),
            discRate7:
              stripCommas(row.discRate7) === ""
                ? 0
                : Number(stripCommas(row.discRate7)),
            discRate8:
              stripCommas(row.discRate8) === ""
                ? 0
                : Number(stripCommas(row.discRate8)),
          })),
        },
      };

      const response = await apiClient.post("/upsertPriceMatrix", payload);
      return response.data;
    },
    onSuccess: async (response) => {
      try {
        const rawResult = response?.data?.[0]?.result || "[]";
        const parsedResult = JSON.parse(rawResult);
        const savedRow = Array.isArray(parsedResult) ? parsedResult[0] : null;

        if (savedRow) {
          setHeader((prev) => ({
            ...prev,
            pmId: savedRow.pmId || prev.pmId,
            registeredBy: savedRow.registeredBy || prev.registeredBy,
            registeredDate: savedRow.registeredDate || prev.registeredDate,
            lastUpdatedBy: savedRow.updatedBy || prev.lastUpdatedBy,
            lastUpdatedDate: savedRow.updatedDate || prev.lastUpdatedDate,
          }));
        }

        useSwalSuccessAlert("Success", "Price matrix saved successfully.");
      } catch {
        useSwalSuccessAlert("Success", "Price matrix saved successfully.");
      }

      await queryClient.invalidateQueries({
        queryKey: ["salesPMCustomerItem"],
      });
    },
    onError: (error) => {
      useSwalErrorAlert(
        "Save Failed",
        error?.response?.data?.details ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to save price matrix."
      );
    },
  });

  const visibleRows = useMemo(() => rows, [rows]);

  const canCopy = visibleRows.length > 0;
  const canUpload = Boolean(header.pmCode);
  const canDownload = visibleRows.length > 0;
  const canFind = Boolean(header.pmCode && header.effectivityDate);
  const canSave =
    Boolean(header.pmCode && header.effectivityDate) && visibleRows.length > 0;

  const isPageLoading =
    detailQuery.isLoading ||
    detailQuery.isFetching ||
    saveMutation.isPending ||
    historyLoading ||
    historyActionLoading ||
    uploadLoading ||
    downloadLoading;

  const openReferenceLookup = () => {
    if (header.pmType === "PMCUST") return setShowCustomerModal(true);
    if (header.pmType === "PMAREA") return setShowAreaModal(true);
    if (header.pmType === "PMCHAIN") return setShowChainModal(true);
    if (header.pmType === "PMCTYPE") return setShowCustomerTypeModal(true);
  };

  const openHistoryTypeLookup = () => {
    if (historyTypeFilter.pmType === "PMCUST") return setShowCustomerModal(true);
    if (historyTypeFilter.pmType === "PMAREA") return setShowAreaModal(true);
    if (historyTypeFilter.pmType === "PMCHAIN") return setShowChainModal(true);
    if (historyTypeFilter.pmType === "PMCTYPE") return setShowCustomerTypeModal(true);
  };

  const openHistoryItemReferenceLookup = () => {
    if (historyItemFilter.pmType === "PMCUST") return setShowCustomerModal(true);
    if (historyItemFilter.pmType === "PMAREA") return setShowAreaModal(true);
    if (historyItemFilter.pmType === "PMCHAIN") return setShowChainModal(true);
    if (historyItemFilter.pmType === "PMCTYPE") return setShowCustomerTypeModal(true);
  };

  const openHistoryItemLookup = () => {
    setShowItemModal(true);
  };

  const handleMatrixTypeChange = async (eventOrValue) => {
    const newValue =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue?.target?.value || "PMCUST";

    if (newValue === header.pmType) return;

    const hasExistingData =
      Boolean(header.pmId) ||
      Boolean(header.pmCode) ||
      Boolean(header.pmName) ||
      Boolean(header.effectivityDate) ||
      rows.length > 0;

    if (!hasExistingData) {
      resetMatrixForType(newValue);
      return;
    }

    const result = await Swal.fire({
      title: "Change PM Type?",
      text: "Changing PM Type will clear the current header and detail records.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, change",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    resetMatrixForType(newValue);
  };

  const handleHistoryTypePmTypeChange = (eventOrValue) => {
    const newValue =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue?.target?.value || "PMCUST";

    setHistoryTypeFilter({
      ...DEFAULT_HISTORY_TYPE_FILTER,
      pmType: newValue,
    });
    setHistoryTypeRows([]);
  };

  const handleHistoryItemPmTypeChange = (eventOrValue) => {
    const newValue =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue?.target?.value || "PMCUST";

    setHistoryItemFilter({
      ...DEFAULT_HISTORY_ITEM_FILTER,
      pmType: newValue,
    });
    setHistoryItemRows([]);
  };

  const getLookupCodeAndName = (selected, pmType) => {
    if (pmType === "PMCUST" || pmType === "PMCHAIN") {
      return {
        pmCode:
          selected?.custCode ||
          selected?.cust_code ||
          selected?.chainCode ||
          selected?.chain_code ||
          "",
        pmName:
          selected?.custName ||
          selected?.cust_name ||
          selected?.chainName ||
          selected?.chain_name ||
          "",
      };
    }

    if (pmType === "PMAREA") {
      return {
        pmCode: selected?.areaCode || selected?.area_code || "",
        pmName: selected?.areaName || selected?.area_name || "",
      };
    }

    if (pmType === "PMCTYPE") {
      return {
        pmCode:
          selected?.custTypeCode ||
          selected?.cust_type_code ||
          selected?.typeCode ||
          selected?.type_code ||
          "",
        pmName:
          selected?.custTypeName ||
          selected?.cust_type_name ||
          selected?.typeName ||
          selected?.type_name ||
          "",
      };
    }

    return { pmCode: "", pmName: "" };
  };

  const applyLookupSelection = (selected, pmType) => {
    if (!selected) return;
    const { pmCode, pmName } = getLookupCodeAndName(selected, pmType);

    setHeader((prev) => ({
      ...prev,
      pmType,
      pmId: "",
      pmCode,
      pmName,
      effectivityDate: "",
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    }));
  };

  const applyHistoryTypeLookupSelection = (selected, pmType) => {
    if (!selected) return;
    const { pmCode, pmName } = getLookupCodeAndName(selected, pmType);

    setHistoryTypeFilter((prev) => ({
      ...prev,
      pmType,
      pmCode,
      pmName,
    }));
    setHistoryTypeRows([]);
  };

  const applyHistoryItemReferenceLookupSelection = (selected, pmType) => {
    if (!selected) return;
    const { pmCode, pmName } = getLookupCodeAndName(selected, pmType);

    setHistoryItemFilter((prev) => ({
      ...prev,
      pmType,
      pmCode,
      pmName,
    }));
    setHistoryItemRows([]);
  };

  const applyHistoryItemLookupSelection = (selected) => {
 
    if (!selected) return;

     const itemsArray = Array.isArray(selected.records)
    ? selected.records
    : selected.records ? [selected.records] : [];

     const singleItem = itemsArray[0]


    setHistoryItemFilter((prev) => ({
      ...prev,
      itemCode: singleItem?.itemCode || "",
      itemName: singleItem?.itemName || "",
      uomCode: singleItem?.uomCode ||  "",
    }));
    setHistoryItemRows([]);
  };

  const updateRowField = (rowId, key, value) => {
    if (!PRICE_KEYS.includes(key)) return;

    const normalized = normalizeDecimalInput(value);

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (normalized === value && /-/.test(String(value ?? ""))) return row;
        if (normalized === value && /[^\d.,]/.test(String(value ?? ""))) return row;

        if (normalized === "") return { ...row, [key]: "" };

        const numericValue = Number(normalized);
        if (Number.isNaN(numericValue) || numericValue < 0) return row;

        if (RATE_KEYS.includes(key) && numericValue > 99.99) {
          return { ...row, [key]: "99.99" };
        }

        return { ...row, [key]: normalized };
      })
    );
  };

  const handleInputFocus = (rowId, key) => {
    if (!PRICE_KEYS.includes(key)) return;

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (isZeroValue(row[key])) {
          return { ...row, [key]: "" };
        }

        return { ...row, [key]: stripCommas(row[key]) };
      })
    );
  };

  const handleInputBlur = (rowId, key) => {
    if (!PRICE_KEYS.includes(key)) return;

    const decimals = key === "sellingPrice" ? sellPriceDecimals : rateDecimals;

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        let rawValue = stripCommas(row[key]);
        if (rawValue === "") rawValue = "0";

        let num = Number(rawValue);
        if (Number.isNaN(num) || num < 0) num = 0;
        if (RATE_KEYS.includes(key) && num > 99.99) num = 99.99;

        return {
          ...row,
          [key]:
            key === "sellingPrice"
              ? formatNumberWithCommas(num, decimals)
              : formatPlainDecimal(num, decimals),
        };
      })
    );
  };

  const handleCellEnter = (event, row, key) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    handleInputBlur(row.id, key);

    const currentIndex = visibleRows.findIndex((item) => item.id === row.id);
    if (currentIndex === -1) return;

    const nextRow = visibleRows[currentIndex + 1];
    if (!nextRow) return;

    focusCell(nextRow.id, key);
  };

  const handleFind = async () => {
    if (!header.pmCode || !header.effectivityDate) {
      useSwalErrorAlert(
        "Find",
        `Please select ${matrixMeta.entityLabel} and effectivity date first.`
      );
      return;
    }

    try {
      const result = await detailQuery.refetch();
      const fetched = result?.data;
      if (!fetched) return;

      setHeader((prev) => ({
        ...prev,
        pmId: fetched.pmId || prev.pmId || "",
        registeredBy: fetched.registeredBy || "",
        registeredDate: fetched.registeredDate || "",
        lastUpdatedBy: fetched.lastUpdatedBy || "",
        lastUpdatedDate: fetched.lastUpdatedDate || "",
      }));

      setRows(fetched.rows || []);
      setSelectedRow(null);
    } catch (error) {
      useSwalErrorAlert(
        "Find Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load price matrix."
      );
    }
  };

  const handleCopy = async () => {
    if (!rows.length) return;

    const result = await Swal.fire({
      title: "Copy Matrix?",
      text: "This will clear the current reference and effectivity date but retain the detail rows.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Copy",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setHeader((prev) => ({
      ...prev,
      pmId: "",
      pmCode: "",
      pmName: "",
      effectivityDate: "",
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    }));

    useSwalSuccessAlert(
      "Copied",
      "Matrix copied successfully. You may now select a new reference."
    );
  };

  const handleHistoryTypeFind = async () => {
    if (!validateDateRange(historyTypeFilter.startDate, historyTypeFilter.endDate)) {
      useSwalErrorAlert(
        "Invalid Date Range",
        "Start Date must not be later than End Date."
      );
      return;
    }

    setHistoryLoading(true);

    try {
      const params = {
        json_data: {
          pmType: historyTypeFilter.pmType || "PMCUST",
          pmCode: historyTypeFilter.pmCode || "",
          pmName: historyTypeFilter.pmName || "",
          startDate: historyTypeFilter.startDate || "",
          endDate: historyTypeFilter.endDate || "",
        },
      };

      console.log(JSON.stringify(params))
      const response = await apiClient.get(HISTORY_BY_TYPE_ENDPOINT, { params });
      const mappedRows = mapHistoryRows(
        extractResultArray(response),
        historyTypeFilter.pmType || "PMCUST"
      );

      setHistoryTypeRows(mappedRows);

      if (!mappedRows.length) {
        useSwalErrorAlert("No Records", "No history records found.");
      }
    } catch (error) {
      useSwalErrorAlert(
        "History Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryItemFind = async () => {
    if (!validateDateRange(historyItemFilter.startDate, historyItemFilter.endDate)) {
      useSwalErrorAlert(
        "Invalid Date Range",
        "Start Date must not be later than End Date."
      );
      return;
    }

    setHistoryLoading(true);

    try {
      const params = {
        json_data: {
          pmType: historyItemFilter.pmType || "PMCUST",
          itemCode: historyItemFilter.itemCode || "",
          pmCode: historyItemFilter.pmCode || "",
          pmName: historyItemFilter.pmName || "",
          startDate: historyItemFilter.startDate || "",
          endDate: historyItemFilter.endDate || "",
        },
      };

      console.log(JSON.stringify(params))
      const response = await apiClient.get(HISTORY_BY_ITEM_ENDPOINT, { params });
      const mappedRows = mapHistoryRows(
        extractResultArray(response),
        historyItemFilter.pmType || "PMCUST"
      );

      setHistoryItemRows(mappedRows);

      if (!mappedRows.length) {
        useSwalErrorAlert("No Records", "No history records found.");
      }
    } catch (error) {
      useSwalErrorAlert(
        "History Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryEdit = async (row) => {
    try {
      const selectedHeader = {
        pmId: row.pmId || "",
        pmType: row.pmType || header.pmType || "PMCUST",
        pmCode: row.pmCode || "",
        pmName: row.pmName || "",
        effectivityDate: useformatToDatev2(row.effectivityDate) || "",
        registeredBy: row.registeredBy || "",
        registeredDate: row.registeredDate || "",
        lastUpdatedBy: row.updatedBy || "",
        lastUpdatedDate: row.updatedDate || "",
      };

      const fetched = await fetchMatrix(selectedHeader);

      setHeader((prev) => ({
        ...prev,
        ...selectedHeader,
        pmId: fetched.pmId || selectedHeader.pmId || "",
        registeredBy: fetched.registeredBy || selectedHeader.registeredBy || "",
        registeredDate:
          fetched.registeredDate || selectedHeader.registeredDate || "",
        lastUpdatedBy:
          fetched.lastUpdatedBy || selectedHeader.lastUpdatedBy || "",
        lastUpdatedDate:
          fetched.lastUpdatedDate || selectedHeader.lastUpdatedDate || "",
      }));

      setRows(fetched.rows || []);
      setSelectedRow(null);
      setActiveTab("details");
    } catch (error) {
      useSwalErrorAlert(
        "Retrieve Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to retrieve selected history record."
      );
    }
  };

  const handleHistoryRowRetrieve = async (row) => {
    if (historyActionLoading) return;

    setHistoryActionLoading(true);
    try {
      await handleHistoryEdit(row);
      setActiveTab("details");
    } finally {
      setHistoryActionLoading(false);
    }
  };

  const handleHistoryDelete = async (row, source = "type") => {
    const code = row?.pmCode || "";
    const name = row?.pmName || "";
    const effectivityDate = row?.effectivityDate || "";

    const confirm = await useSwalDeleteConfirm(
      "Delete Record?",
      `Are you sure you want to delete Price Matrix "${code}"${
        name ? ` - ${name}` : ""
      }${effectivityDate ? ` with effectivity date "${effectivityDate}"` : ""}?`,
      "Yes, delete it"
    );

    if (!confirm?.isConfirmed) return;

    setHistoryActionLoading(true);

    try {
      const payload = {
        json_data: {
          pmId: row?.pmId || "",
          pmCode: code,
          pmType: row?.pmType || header.pmType,
          userCode: currentUserRow?.userCode || "ADMIN",
        },
      };

      await apiClient.post(DELETE_ENDPOINT, payload);

      useSwalSuccessAlert("Deleted", "Price matrix deleted successfully.");

      if ((header.pmId || "") === (row?.pmId || "")) {
        resetMatrixForType(header.pmType || "PMCUST");
      }

      if (source === "type") {
        setHistoryTypeRows((prev) =>
          prev.filter((item) => String(item.pmId || "") !== String(row?.pmId || ""))
        );
      } else {
        setHistoryItemRows((prev) =>
          prev.filter((item) => String(item.pmId || "") !== String(row?.pmId || ""))
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["salesPMCustomerItem"],
      });
    } catch (error) {
      useSwalErrorAlert(
        "Delete Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete price matrix."
      );
    } finally {
      setHistoryActionLoading(false);
    }
  };

  const handleCustomExportExcel = async () => {
    if (!visibleRows.length) return;

    const exportData = visibleRows.map((row) => {
      const out = {
        categName: row.categName || "",
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        uomCode: row.uomCode || "",
      };

      visiblePriceKeys.forEach((key) => {
        const raw = stripCommas(row[key]);
        out[key] = raw === "" ? 0 : Number(raw);
      });

      return out;
    });

    const exportCols = templateColumns.map((col) => ({
      ...col,
      renderType:
        col.key === "sellingPrice" || RATE_KEYS.includes(col.key)
          ? "number"
          : undefined,
      roundingOff:
        col.key === "sellingPrice"
          ? sellPriceDecimals
          : RATE_KEYS.includes(col.key)
            ? rateDecimals
            : undefined,
    }));

    const defaultFileName = sanitizeFileName(
      `${pageHeaderTitle} Upload Template_${getDateTimeStamp()}`
    );

    const { value: fileName } = await Swal.fire({
      input: "text",
      inputLabel: "Download Excel File Name:",
      inputValue: defaultFileName,
      width: "400px",
      showCancelButton: true,
      confirmButtonText: "Download",
      inputValidator: (value) =>
        !value || value.trim() === "" ? "File name cannot be empty!" : null,
    });

    if (!fileName) return;

    setDownloadLoading(true);

    try {
      await exportGenericQueryExcel(
        exportData,
        {},
        exportCols,
        [],
        exportCols,
        {},
        7,
        fileName,
        currentUserRow?.userName || currentUserRow?.userCode || "",
        companyInfo?.compName,
        companyInfo?.compAddr,
        companyInfo?.telNo
      );

      useSwalSuccessAlert("Downloaded", "Excel template downloaded successfully.");
    } catch (error) {
      useSwalErrorAlert(
        "Download Failed",
        error?.message || "Failed to download Excel template."
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  const triggerUploadBrowse = () => {
    if (!canUpload) {
      useSwalErrorAlert(
        "Upload",
        `Please select ${matrixMeta.entityLabel} first before uploading the template.`
      );
      return;
    }

    uploadInputRef.current?.click();
  };

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const lowerName = String(file.name || "").toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      useSwalErrorAlert(
        "Invalid File",
        "Please select a valid Excel file (.xlsx or .xls)."
      );
      return;
    }

    setUploadLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) {
        useSwalErrorAlert("Upload Failed", "The selected Excel file has no sheet.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rowsAsArray = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (!rowsAsArray.length) {
        useSwalErrorAlert("Upload Failed", "The selected Excel file is empty.");
        return;
      }

      const headerRowIndex = rowsAsArray.findIndex((row) => {
        const normalized = row.map(normalizeHeaderText);
        return templateHeaderLabels.every(
          (label, idx) =>
            normalizeHeaderText(label) === normalizeHeaderText(normalized[idx])
        );
      });

      if (headerRowIndex === -1) {
        useSwalErrorAlert(
          "Invalid Template",
          "The selected file does not match the required download template format."
        );
        return;
      }

      const headerRow = rowsAsArray[headerRowIndex].map((value) =>
        String(value ?? "").trim()
      );

      const expectedHeadersMatched =
        headerRow.length >= templateHeaderLabels.length &&
        templateHeaderLabels.every(
          (label, idx) =>
            normalizeHeaderText(label) === normalizeHeaderText(headerRow[idx])
        );

      if (!expectedHeadersMatched) {
        useSwalErrorAlert(
          "Invalid Template",
          "The selected file headers do not match the required download format."
        );
        return;
      }

      const dataRows = rowsAsArray
        .slice(headerRowIndex + 1)
        .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));

      if (!dataRows.length) {
        useSwalErrorAlert(
          "No Records",
          "No item records found in the selected Excel file."
        );
        return;
      }

      const headerMap = templateColumns.reduce((acc, col, idx) => {
        acc[col.key] = idx;
        return acc;
      }, {});

      const importedRows = dataRows.map((excelRow, index) => {
        const itemCode = String(excelRow[headerMap.itemCode] ?? "").trim();
        const sellingPriceNum = toUploadNumber(excelRow[headerMap.sellingPrice]);

        const disc1 = toUploadNumber(excelRow[headerMap.discRate1], 99.99);
        const disc2 = toUploadNumber(excelRow[headerMap.discRate2], 99.99);
        const disc3 = toUploadNumber(excelRow[headerMap.discRate3], 99.99);
        const disc4 = toUploadNumber(excelRow[headerMap.discRate4], 99.99);
        const disc5 = toUploadNumber(excelRow[headerMap.discRate5], 99.99);
        const disc6 = toUploadNumber(excelRow[headerMap.discRate6], 99.99);
        const disc7 = toUploadNumber(excelRow[headerMap.discRate7], 99.99);
        const disc8 = toUploadNumber(excelRow[headerMap.discRate8], 99.99);

        return {
          id: itemCode || `UPLOAD_${index}`,
          categName: String(excelRow[headerMap.categName] ?? "").trim(),
          itemCode,
          itemName: String(excelRow[headerMap.itemName] ?? "").trim(),
          uomCode: String(excelRow[headerMap.uomCode] ?? "").trim(),
          sellingPrice: formatNumberWithCommas(sellingPriceNum, sellPriceDecimals),
          discRate1: formatPlainDecimal(disc1, rateDecimals),
          discRate2: formatPlainDecimal(disc2, rateDecimals),
          discRate3: formatPlainDecimal(disc3, rateDecimals),
          discRate4: formatPlainDecimal(disc4, rateDecimals),
          discRate5: formatPlainDecimal(disc5, rateDecimals),
          discRate6: formatPlainDecimal(disc6, rateDecimals),
          discRate7: formatPlainDecimal(disc7, rateDecimals),
          discRate8: formatPlainDecimal(disc8, rateDecimals),
        };
      });

      const mergedRows =
        visibleRows.length > 0
          ? visibleRows.map((existingRow, index) => {
              const matched = importedRows.find(
                (item) =>
                  String(item.itemCode ?? "").trim() ===
                  String(existingRow.itemCode ?? "").trim()
              );

              if (!matched) {
                return {
                  ...existingRow,
                  id: existingRow.id || `${existingRow.itemCode || index}`,
                };
              }

              return {
                ...existingRow,
                categName: matched.categName || existingRow.categName || "",
                itemCode: matched.itemCode || existingRow.itemCode || "",
                itemName: matched.itemName || existingRow.itemName || "",
                uomCode: matched.uomCode || existingRow.uomCode || "",
                sellingPrice: matched.sellingPrice,
                discRate1: matched.discRate1,
                discRate2: matched.discRate2,
                discRate3: matched.discRate3,
                discRate4: matched.discRate4,
                discRate5: matched.discRate5,
                discRate6: matched.discRate6,
                discRate7: matched.discRate7,
                discRate8: matched.discRate8,
                id: existingRow.id || matched.id || `${existingRow.itemCode || index}`,
              };
            })
          : importedRows;

      setRows(mergedRows);
      setSelectedRow(null);
      setOptionsOpen(false);

      useSwalSuccessAlert(
        "Upload Successful",
        `${mergedRows.length} record(s) imported successfully.`
      );
    } catch (error) {
      useSwalErrorAlert(
        "Upload Failed",
        error?.message || "Failed to read the selected Excel file."
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const tableColumns = useMemo(
    () => [
      { key: "categName", label: "Category Name", sortable: true, width: 180 },
      { key: "itemCode", label: "Item Code", sortable: true, width: 130 },
      { key: "itemName", label: "Item Name", sortable: true, width: 240 },
      { key: "uomCode", label: "UOM", sortable: true, width: 90 },
      ...visiblePriceKeys.map((key) => ({
        key,
        label:
          key === "sellingPrice"
            ? "Selling Price"
            : key.replace("discRate", "Disc Rate "),
        sortable: false,
        width: key === "sellingPrice" ? 130 : 110,
        render: (row) => (
          <input
            ref={(element) => {
              const refKey = getInputRefKey(row.id, key);
              if (element) inputRefs.current[refKey] = element;
              else delete inputRefs.current[refKey];
            }}
            type="text"
            value={row[key] ?? ""}
            onChange={(event) => updateRowField(row.id, key, event.target.value)}
            onFocus={() => handleInputFocus(row.id, key)}
            onBlur={() => handleInputBlur(row.id, key)}
            onKeyDown={(event) => handleCellEnter(event, row, key)}
            onClick={(event) => event.stopPropagation()}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none transition focus:border-blue-500"
          />
        ),
      })),
    ],
    [visibleRows, sellPriceDecimals, visiblePriceKeys]
  );

  const buildHistoryColumns = (meta, source) => [
    {
    key: "__actions",
    label: "",
    sortable: false,
    filterable: false,
    width: 60,
    className: "text-left",
    render: (row) => (
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={async (event) => {
            event.stopPropagation();
            await handleHistoryRowRetrieve(row);
          }}
          disabled={historyActionLoading}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
      </div>
    ),
  },
    {
      key: "pmCode",
      label: meta.codeLabel,
      sortable: true,
      width: 160,
    },
    {
      key: "pmName",
      label: meta.nameLabel,
      sortable: true,
      width: 240,
    },
    ...(source === "item"
      ? [
          { key: "itemCode", label: "Item Code", sortable: true, width: 140 },
          { key: "itemName", label: "Item Name", sortable: true, width: 240 },
          { key: "uomCode", label: "UOM", sortable: true, width: 100 },
        ]
      : []),
    {
      key: "effectivityDate",
      label: "Effectivity Date",
      sortable: true,
      width: 140,
    },
    {
      key: "registeredBy",
      label: "Registered By",
      sortable: true,
      width: 140,
    },
    {
      key: "registeredDate",
      label: "Registered Date",
      sortable: true,
      width: 180,
      render: (row) => formatDateTimeCell(row?.registeredDate),
    },
    {
      key: "updatedBy",
      label: "Updated By",
      sortable: true,
      width: 140,
    },
    {
      key: "updatedDate",
      label: "Updated Date",
      sortable: true,
      width: 180,
      render: (row) => formatDateTimeCell(row?.updatedDate),
    },
  ];

 
const historyTypeColumns = useMemo(
  () => [
    {
      key: "__actions",
      label: "Action",
      sortable: false,
      filterable: false,
      width: 120,
      className: "text-left",
      render: (row) => (
        <div className="flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={async (event) => {
              event.stopPropagation();
              await handleHistoryRowRetrieve(row);
            }}
            disabled={historyActionLoading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Edit"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleHistoryDelete(row, "type");
            }}
            disabled={historyActionLoading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
    {
      key: "pmCode",
      label: historyTypeMeta.codeLabel,
      sortable: true,
      width: 150,
    },
    {
      key: "pmName",
      label: historyTypeMeta.nameLabel,
      sortable: true,
      width: 220,
    },
    {
      key: "effectivityDate",
      label: "Effectivity Date",
      sortable: true,
      width: 140,
    },
    {
      key: "registeredBy",
      label: "Registered By",
      sortable: true,
      width: 140,
    },
    {
      key: "registeredDate",
      label: "Registered Date",
      sortable: true,
      width: 180,
      render: (row) => formatDateTimeCell(row?.registeredDate),
    },
    {
      key: "updatedBy",
      label: "Updated By",
      sortable: true,
      width: 140,
    },
    {
      key: "updatedDate",
      label: "Updated Date",
      sortable: true,
      width: 180,
      render: (row) => formatDateTimeCell(row?.updatedDate),
    },
  ],
  [historyActionLoading, historyTypeMeta]
);

const historyItemColumns = useMemo(
  () => [
    {
      key: "__actions",
      label: "Action",
      sortable: false,
      filterable: false,
      width: 80,
      className: "text-left",
      render: (row) => (
        <div className="flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={async (event) => {
              event.stopPropagation();
              await handleHistoryRowRetrieve(row);
            }}
            disabled={historyActionLoading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
   {
      key: "pmType",
      label: "PM Type",
      sortable: true,
      width: 160,
      render: (row) =>
        MATRIX_TYPE_OPTIONS.find(
          (option) => option.value === (row?.pmType || historyItemFilter.pmType || "PMCUST")
        )?.label || "Per Customer",
    },
    {
      key: "itemCode",
      label: "Item Code",
      sortable: true,
      width: 130,
    },
    {
      key: "itemName",
      label: "Item Name",
      sortable: true,
      width: 220,
    },
    {
      key: "uomCode",
      label: "UOM",
      sortable: true,
      width: 90,
    },
    {
      key: "pmCode",
      label: historyItemMeta.codeLabel,
      sortable: true,
      width: 150,
    },
    {
      key: "pmName",
      label: historyItemMeta.nameLabel,
      sortable: true,
      width: 220,
    },
    {
      key: "effectivityDate",
      label: "Effectivity Date",
      sortable: true,
      width: 140,
    },
    {
      key: "sellingPrice",
      label: "Selling Price",
      sortable: true,
      width: 130,
      className: "text-right",
      render: (row) =>
        formatNumberWithCommas(row?.sellingPrice ?? 0, sellPriceDecimals),
    },
    {
      key: "discRate1",
      label: "Disc. Rate 1",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate1 ?? 0, rateDecimals),
    },
    {
      key: "discRate2",
      label: "Disc. Rate 2",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate2 ?? 0, rateDecimals),
    },
    {
      key: "discRate3",
      label: "Disc. Rate 3",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate3 ?? 0, rateDecimals),
    },
    {
      key: "discRate4",
      label: "Disc. Rate 4",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate4 ?? 0, rateDecimals),
    },
    {
      key: "discRate5",
      label: "Disc. Rate 5",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate5 ?? 0, rateDecimals),
    },
    {
      key: "discRate6",
      label: "Disc. Rate 6",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate6 ?? 0, rateDecimals),
    },
    {
      key: "discRate7",
      label: "Disc. Rate 7",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate7 ?? 0, rateDecimals),
    },
    {
      key: "discRate8",
      label: "Disc. Rate 8",
      sortable: true,
      width: 120,
      className: "text-right",
      render: (row) => formatPlainDecimal(row?.discRate8 ?? 0, rateDecimals),
    },
    {
      key: "registeredBy",
      label: "Registered By",
      sortable: true,
      width: 140,
    },
    {
      key: "registeredDate",
      label: "Registered Date",
      sortable: true,
      width: 180,
      render: (row) => formatDateTimeCell(row?.registeredDate),
    },
    {
      key: "updatedBy",
      label: "Updated By",
      sortable: true,
      width: 140,
    },
    {
      key: "updatedDate",
      label: "Updated Date",
      sortable: true,
      width: 180,
      render: (row) => formatDateTimeCell(row?.updatedDate),
    },
  ],
  [historyActionLoading, historyItemMeta, sellPriceDecimals, rateDecimals]
);


  const renderInfoButton = () => (
    <div ref={guideRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setGuideOpen((prev) => !prev)}
        disabled={isPageLoading}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
        title="Info"
      >
        <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
        <span className="ml-1 hidden text-[11px] font-medium sm:inline">
          Info
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="hidden text-[10px] opacity-80 sm:inline"
        />
      </button>

      {guideOpen && (
        <div className="absolute right-0 z-[999] mt-2 w-52 overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-black/10">
          <button
            type="button"
            onClick={() => {
              if (pdfLink) window.open(pdfLink, "_blank");
              setGuideOpen(false);
            }}
            className="block w-full border-b border-gray-100 px-4 py-2 text-left text-xs hover:bg-blue-50"
          >
            <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
            PDF Guide
          </button>
          <button
            type="button"
            onClick={() => {
              if (videoLink) window.open(videoLink, "_blank");
              setGuideOpen(false);
            }}
            className="block w-full px-4 py-2 text-left text-xs hover:bg-blue-50"
          >
            <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" />
            Video Guide
          </button>
        </div>
      )}
    </div>
  );

  const renderActionButtons = () => {
    if (activeTab === "priority") {
      return (
        <div className="flex flex-nowrap items-center justify-end gap-2 text-xs whitespace-nowrap">
          <button
            type="button"
            onClick={() => priorityTabRef.current?.openFind?.()}
            disabled={isPageLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Add"
          >
            <Plus size={14} />
            <span className="ml-1 hidden sm:inline">Add</span>
          </button>

          <button
            type="button"
            onClick={() => priorityTabRef.current?.resetFilters?.()}
            disabled={isPageLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Reset"
          >
            <Undo2 size={14} />
            <span className="ml-1 hidden sm:inline">Reset</span>
          </button>

          {renderInfoButton()}
        </div>
      );
    }

    if (isHistoryTypeActive) {
      return (
        <div className="flex flex-nowrap items-center justify-end gap-2 text-xs whitespace-nowrap">
          <button
            type="button"
            onClick={handleHistoryTypeFind}
            disabled={isPageLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Find"
          >
            <Search size={14} />
            <span className="ml-1 hidden sm:inline">Find</span>
          </button>

          <button
            type="button"
            onClick={handleHistoryTypeReset}
            disabled={isPageLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Reset"
          >
            <Undo2 size={14} />
            <span className="ml-1 hidden sm:inline">Reset</span>
          </button>

          {renderInfoButton()}
        </div>
      );
    }

    if (isHistoryItemActive) {
      return (
        <div className="flex flex-nowrap items-center justify-end gap-2 text-xs whitespace-nowrap">
          <button
            type="button"
            onClick={handleHistoryItemFind}
            disabled={isPageLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Find"
          >
            <Search size={14} />
            <span className="ml-1 hidden sm:inline">Find</span>
          </button>

          <button
            type="button"
            onClick={handleHistoryItemReset}
            disabled={isPageLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Reset"
          >
            <Undo2 size={14} />
            <span className="ml-1 hidden sm:inline">Reset</span>
          </button>

          {renderInfoButton()}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2 text-xs whitespace-nowrap">
        <button
          type="button"
          onClick={handleFind}
          disabled={!canFind || isPageLoading || activeTab !== "details"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
          title="Find"
        >
          <Search size={14} />
          <span className="ml-1 hidden sm:inline">Find</span>
        </button>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || isPageLoading || activeTab !== "details"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
          title="Save"
        >
          <Save size={14} />
          <span className="ml-1 hidden sm:inline">Save</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isPageLoading || activeTab !== "details"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
          title="Reset"
        >
          <Undo2 size={14} />
          <span className="ml-1 hidden sm:inline">Reset</span>
        </button>

        <div ref={optionsRef} className="relative shrink-0 overflow-visible">
          <button
            type="button"
            onClick={() => setOptionsOpen((prev) => !prev)}
            disabled={isPageLoading || activeTab !== "details"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Actions"
          >
            <MoreVertical size={14} />
            <span className="ml-1 hidden text-[11px] font-medium sm:inline">
              Actions
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className="hidden text-[10px] opacity-80 sm:inline"
            />
          </button>

          {optionsOpen && (
            <div className="absolute right-0 z-[99999] mt-2 w-56 overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-black/10">
              <button
                type="button"
                onClick={() => {
                  setOptionsOpen(false);
                  handleCopy();
                }}
                disabled={!canCopy || isPageLoading}
                className="block w-full border-b border-gray-100 px-4 py-2 text-left text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCopy} className="mr-2 text-blue-600" />
                Copy Matrix
              </button>

              <button
                type="button"
                onClick={async () => {
                  setOptionsOpen(false);
                  await handleCustomExportExcel();
                }}
                disabled={!canDownload || isPageLoading}
                className="block w-full border-b border-gray-100 px-4 py-2 text-left text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2 text-green-600" />
                Download Excel Template
              </button>

              <button
                type="button"
                onClick={() => {
                  setOptionsOpen(false);
                  triggerUploadBrowse();
                }}
                disabled={!canUpload || isPageLoading}
                className="block w-full px-4 py-2 text-left text-xs hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faUpload} className="mr-2 text-blue-600" />
                Upload Excel Template
              </button>
            </div>
          )}
        </div>

        {renderInfoButton()}
      </div>
    );
  };

  const renderCenteredHeaderTabs = () => (
    <div className="w-full md:justify-center flex">
      <div className="w-full md:w-auto">
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-blue-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHistoryTabs = () => (
    <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
      {HISTORY_TABS.map((tab) => (
        (() => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveHistoryTab(tab.key)}
              className={`group inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                activeHistoryTab === tab.key
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              <span
                className={`flex h-5.5 w-5.5 items-center justify-center rounded-md transition-colors ${
                  activeHistoryTab === tab.key
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                }`}
              >
                <Icon size={15} />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })()
      ))}
    </div>
  );

  const renderDateField = (id, value, onChange, label) => (
    <div className="relative">
      <div className="global-ref-textbox-ui">
        <DateFormatInput
          id={id}
          name={id}
          value={value || ""}
          updateState={(patch) => {
            const nextValue = patch?.[id] ?? patch?.target?.value ?? "";
            onChange(nextValue);
          }}
          className="peer w-full bg-transparent pr-10 outline-none"
        />
      </div>
      <label htmlFor={id} className="global-ref-floating-label">
        {label}
      </label>
    </div>
  );

  const renderDetailsTab = () => (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-9">
          <div className="mb-3 border-b pb-2">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              {matrixMeta.infoTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FieldRenderer
              label="PM Type"
              type="select"
              value={header.pmType || "PMCUST"}
              onChange={handleMatrixTypeChange}
              options={MATRIX_TYPE_OPTIONS}
              disabled={isPageLoading}
              required
            />

            <FieldRenderer
              label={matrixMeta.codeLabel}
              type="lookup"
              value={header.pmCode || ""}
              onLookup={openReferenceLookup}
              readOnly
              required
            />

            <FieldRenderer
              label={matrixMeta.nameLabel}
              value={header.pmName || ""}
              readOnly
              disabled
            />

            {renderDateField(
              "effectivityDate",
              header.effectivityDate,
              (value) => setHeaderField("effectivityDate", value),
              "Effectivity Date"
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <RegistrationInfo data={header} layout="minimize" />
        </div>
      </div>

      <div className="global-tran-table-main-div-ui relative z-0 mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={tableColumns}
          data={visibleRows}
          itemsPerPage={200}
          showFilters
          selectedRow={selectedRow}
          onRowClick={(row) => setSelectedRow(row)}
          isLoading={detailQuery.isLoading || uploadLoading}
          isFetching={detailQuery.isFetching || uploadLoading}
        />
      </div>
    </>
  );

  const renderHistoryTypeTab = () => (
    <>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 border-b pb-2">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            {historyTypeMeta.historyTitle}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <FieldRenderer
            label="PM Type"
            type="select"
            value={historyTypeFilter.pmType || "PMCUST"}
            onChange={handleHistoryTypePmTypeChange}
            options={MATRIX_TYPE_OPTIONS}
            disabled={isPageLoading}
          />

          <FieldRenderer
            label={historyTypeMeta.codeLabel}
            type="lookup"
            value={historyTypeFilter.pmCode || ""}
            onLookup={openHistoryTypeLookup}
            readOnly
          />

          <FieldRenderer
            label={historyTypeMeta.nameLabel}
            value={historyTypeFilter.pmName || ""}
            readOnly
            disabled
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderDateField(
              "historyTypeStartDate",
              historyTypeFilter.startDate,
              (value) =>
                setHistoryTypeFilter((prev) => ({ ...prev, startDate: value })),
              "Start Date"
            )}

            {renderDateField(
              "historyTypeEndDate",
              historyTypeFilter.endDate,
              (value) =>
                setHistoryTypeFilter((prev) => ({ ...prev, endDate: value })),
              "End Date"
            )}
          </div>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui relative z-0 mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <SearchGlobalReferenceTable
          docType={`${DOC_TYPE}HistoryType`}
          columns={historyTypeColumns}
          data={historyTypeRows}
          itemsPerPage={50}
          initialState={{ autoFillGrid: "True" }}
          showFilters
          showGroupBy={true}
          showGlobalSearch
          selectedRow={null}
          onRowClick={() => {}}
          onRowDoubleClick={handleHistoryRowRetrieve}
          isLoading={historyLoading || historyActionLoading}
          isFetching={historyLoading || historyActionLoading}
        />
      </div>
    </>
  );

  const renderHistoryItemTab = () => (
  <>
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 border-b pb-2">
        <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          {historyItemMeta.historyTitle} per Item
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-3 md:items-start">
        <div className="md:col-start-1 md:row-start-1">
          <FieldRenderer
            label="PM Type"
            type="select"
            value={historyItemFilter.pmType || "PMCUST"}
            onChange={handleHistoryItemPmTypeChange}
            options={MATRIX_TYPE_OPTIONS}
            disabled={isPageLoading}
          />
        </div>

        <div className="md:col-start-2 md:row-start-1">
          <FieldRenderer
            label="Item Code"
            type="lookup"
            value={historyItemFilter.itemCode || ""}
            onLookup={openHistoryItemLookup}
            readOnly
          />
        </div>

        <div className="md:col-start-3 md:row-start-1">
          <FieldRenderer
            label="Customer Code"
            type="lookup"
            value={historyItemFilter.pmCode || ""}
            onLookup={openHistoryItemReferenceLookup}
            readOnly
          />
        </div>

        <div className="md:col-start-4 md:row-start-1">
          {renderDateField(
            "historyItemStartDate",
            historyItemFilter.startDate,
            (value) =>
              setHistoryItemFilter((prev) => ({
                ...prev,
                startDate: value,
              })),
            "Start Date"
          )}
        </div>

        <div className="md:col-start-2 md:row-start-2">
          <FieldRenderer
            label="Item Name"
            value={historyItemFilter.itemName || ""}
            readOnly
            disabled
          />
        </div>

        <div className="md:col-start-3 md:row-start-2">
          <FieldRenderer
            label="Customer Name"
            value={historyItemFilter.pmName || ""}
            readOnly
            disabled
          />
        </div>

        <div className="md:col-start-4 md:row-start-2">
          {renderDateField(
            "historyItemEndDate",
            historyItemFilter.endDate,
            (value) =>
              setHistoryItemFilter((prev) => ({
                ...prev,
                endDate: value,
              })),
            "End Date"
          )}
        </div>

        <div className="md:col-start-2 md:row-start-3">
          <FieldRenderer
            label="UOM"
            value={historyItemFilter.uomCode || ""}
            readOnly
            disabled
          />
        </div>
      </div>
    </div>

    <div className="global-tran-table-main-div-ui relative z-0 mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <SearchGlobalReferenceTable
        docType={`${DOC_TYPE}HistoryItem`}
        columns={historyItemColumns}
        data={historyItemRows}
        itemsPerPage={50}
        showFilters
        showGroupBy={true}
        showGlobalSearch
        selectedRow={null}
        onRowClick={() => {}}
        onRowDoubleClick={handleHistoryRowRetrieve}
        isLoading={historyLoading || historyActionLoading}
        isFetching={historyLoading || historyActionLoading}
      />
    </div>
  </>
);

  const renderHistorySection = () => (
    <>
      {renderHistoryTabs()}
      {activeHistoryTab === "historyType" && renderHistoryTypeTab()}
      {activeHistoryTab === "historyItem" && renderHistoryItemTab()}
    </>
  );
  return (
    <div className="global-ref-main-div-ui">
      <input
        ref={uploadInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleUploadFile}
      />

      {isPageLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {pageHeaderTitle}
            </h1>
          </div>

          {renderCenteredHeaderTabs()}

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </div>

      <div
        className="global-tran-tab-div-ui px-3 pb-4 pt-44 sm:px-4 sm:pb-5 sm:pt-32 md:mt-24 md:p-6"
        style={{ minHeight: "calc(100vh - 150px)" }}
      >
        {activeTab === "details" && renderDetailsTab()}
        {activeTab === "history" && renderHistorySection()}
        {activeTab === "priority" && <SalesPMCustomerPriority ref={priorityTabRef} />}
      </div>

      {showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={showCustomerModal}
          customParam={
            activeTab === "details"
              ? header.pmType === "PMCHAIN"
                ? "ActiveChain"
                : "ActiveNonChain"
              : isHistoryTypeActive
                ? historyTypeFilter.pmType === "PMCHAIN"
                  ? "ActiveChain"
                  : "ActiveNonChain"
                : historyItemFilter.pmType === "PMCHAIN"
                  ? "ActiveChain"
                  : "ActiveNonChain"
          }
          onClose={(selected) => {
            if (selected) {
              if (isHistoryTypeActive) {
                applyHistoryTypeLookupSelection(selected, historyTypeFilter.pmType);
              } else if (isHistoryItemActive) {
                applyHistoryItemReferenceLookupSelection(
                  selected,
                  historyItemFilter.pmType
                );
              } else {
                applyLookupSelection(selected, header.pmType);
              }
            }

            setShowCustomerModal(false);
          }}
        />
      )}

      {showAreaModal && (
        <AreaLookupModal
          isOpen={showAreaModal}
          onClose={(selected) => {
            if (selected) {
              if (isHistoryTypeActive) {
                applyHistoryTypeLookupSelection(selected, historyTypeFilter.pmType);
              } else if (isHistoryItemActive) {
                applyHistoryItemReferenceLookupSelection(
                  selected,
                  historyItemFilter.pmType
                );
              } else {
                applyLookupSelection(selected, header.pmType);
              }
            }

            setShowAreaModal(false);
          }}
        />
      )}

      {showChainModal && (
        <CustomerMastLookupModal
          isOpen={showChainModal}
          customParam="ActiveChain"
          onClose={(selected) => {
            if (selected) {
              if (isHistoryTypeActive) {
                applyHistoryTypeLookupSelection(selected, historyTypeFilter.pmType);
              } else if (isHistoryItemActive) {
                applyHistoryItemReferenceLookupSelection(
                  selected,
                  historyItemFilter.pmType
                );
              } else {
                applyLookupSelection(selected, header.pmType);
              }
            }

            setShowChainModal(false);
          }}
        />
      )}

      {showCustomerTypeModal && (
        <CustomerTypeLookupModal
          isOpen={showCustomerTypeModal}
          onClose={(selected) => {
            if (selected) {
              if (isHistoryTypeActive) {
                applyHistoryTypeLookupSelection(selected, historyTypeFilter.pmType);
              } else if (isHistoryItemActive) {
                applyHistoryItemReferenceLookupSelection(
                  selected,
                  historyItemFilter.pmType
                );
              } else {
                applyLookupSelection(selected, header.pmType);
              }
            }

            setShowCustomerTypeModal(false);
          }}
        />
      )}

      {showItemModal && (
        <ItemMastLookupModal
          isOpen={showItemModal}
          endpoint="getInvLookupFG"
          onClose={(selected) => {
            if (selected) {
              applyHistoryItemLookupSelection(selected);
            }

            setShowItemModal(false);
          }}
          enableMultiSelect={false}
          docType="MATRIX"
        />
      )}
    </div>
  );
}
