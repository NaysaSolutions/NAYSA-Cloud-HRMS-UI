import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faColumns,
  faClock,
  faDownload,
  faEye,
  faArrowUpRightFromSquare,
  faFileCsv,
  faFileExcel,
  faFileExport,
  faFileImage,
  faFileInvoiceDollar,
  faFilePdf,
  faFilter,
  faLayerGroup,
  faMagnifyingGlass,
  faMoneyBillWave,
  faPesoSign,
  faProjectDiagram,
  faReceipt,
  faRotateLeft,
  faSort,
  faSortDown,
  faSortUp,
  faTimes,
  faTruck,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";

import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchCustMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchSalesRepRef from "@/NAYSA Cloud/Lookup/SearchSalesRepRef.jsx";

import SalesTrackerDetailsModal from "./SalesTrackerDetailsModal.jsx";

const PAGE_CONFIGS = {
  lifecycle: {
    title: "Sales Lifecycle Tracker",
    endpoint: "getSalesLifecycleTracker",
    icon: faProjectDiagram,
    empty: "No sales lifecycle records found.",
  },
  itemFlow: {
    title: "Sales Item Flow Tracker",
    endpoint: "getSalesItemFlowTracker",
    icon: faLayerGroup,
    empty: "No item flow records found.",
  },
  performance: {
    title: "Sales Performance Analysis",
    endpoint: "getSalesPerformanceAnalysis",
    icon: faChartLine,
    empty: "No sales performance records found.",
  },
};

const NAV_ITEMS = [
  { key: "lifecycle", label: "Lifecycle Tracker", icon: faProjectDiagram },
  { key: "itemFlow", label: "Item Flow Tracker", icon: faLayerGroup },
  { key: "performance", label: "Sales Performance", icon: faChartLine },
];

const SALES_PERFORMANCE_GROUP_OPTIONS = [
  { value: "SALES_REP", label: "Sales Rep" },
  { value: "BRANCH", label: "Branch" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "CHAIN", label: "Chain Customer" },
  { value: "AREA", label: "Area" },
  { value: "ZONE", label: "Zone" },
  { value: "CUSTOMER_TYPE", label: "Customer Type" },
  { value: "ITEM", label: "Item" },
];

const SALES_PERFORMANCE_GROUP_LABELS = {
  SALES_REP: { code: "Sales Rep Code", name: "Sales Rep Name" },
  BRANCH: { code: "Branch Code", name: "Branch Name" },
  CUSTOMER: { code: "Customer Code", name: "Customer Name" },
  CHAIN: { code: "Chain Code", name: "Chain Customer" },
  AREA: { code: "Area Code", name: "Area Name" },
  ZONE: { code: "Zone Code", name: "Zone Name" },
  CUSTOMER_TYPE: { code: "Customer Type Code", name: "Customer Type" },
  ITEM: { code: "Item Code", name: "Item Name" },
};

const SALES_STATUS_OPTIONS = [
  { value: "PENDING_DELIVERY", label: "Pending Delivery" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered" },
  { value: "PENDING_INVOICE", label: "Pending Invoice" },
  { value: "PARTIALLY_INVOICED", label: "Partially Invoiced" },
  { value: "PENDING_COLLECTION", label: "Pending Collection" },
  { value: "PARTIALLY_COLLECTED", label: "Partially Collected" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DATE_BASIS_OPTIONS = [
  { value: "SO_DATE", label: "SO Date" },
  { value: "DR_DATE", label: "DR Date" },
  { value: "SI_DATE", label: "SI Date" },
  { value: "DUE_DATE", label: "Due Date" },
  { value: "COLLECTION_DATE", label: "Collection Date" },
];

const LIFECYCLE_ACTION_WIDTH = 74;
const LIFECYCLE_STATUS_WIDTH = 160;
const LIFECYCLE_FLOW_WIDTH = 170;
const LIFECYCLE_DOCUMENT_NO_WIDTH = 100;

const LIFECYCLE_COLUMNS = [
  { key: "currentStatus", label: "Lifecycle Status", type: "status", minWidth: LIFECYCLE_STATUS_WIDTH },
  { key: "flow", label: "Flow", type: "flow", minWidth: LIFECYCLE_FLOW_WIDTH },
  { key: "branchCode", label: "Branch", minWidth: 90 },
  { key: "soNo", label: "SO No", type: "link", minWidth: LIFECYCLE_DOCUMENT_NO_WIDTH },
  { key: "soDate", label: "SO Date", type: "date", minWidth: 100 },
  { key: "custPO", label: "Cust PO No.", minWidth: 100 },
  { key: "custCode", label: "Customer Code", minWidth: 100 },
  { key: "custName", label: "Customer Name", minWidth: 190 },
  { key: "shipToAddr", label: "Ship to Address", minWidth: 260 },
  { key: "salesRepName", label: "Salesman", minWidth: 155 },
  { key: "soQuantity", label: "SO Quantity", type: "qty", align: "right", minWidth: 95 },
  { key: "soAmount", label: "SO Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "drNos", label: "DR No", minWidth: LIFECYCLE_DOCUMENT_NO_WIDTH },
  { key: "lastDrDate", label: "Last DR Date", type: "date", minWidth: 100 },
  { key: "drQuantity", label: "DR Quantity", type: "qty", align: "right", minWidth: 115 },
  { key: "siNos", label: "SI No", minWidth: LIFECYCLE_DOCUMENT_NO_WIDTH },
  { key: "lastSiDate", label: "Last SI Date", type: "date", minWidth: 100 },
  { key: "siGrossAmount", label: "Gross Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "siDiscountAmount", label: "Discount Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "siVatAmount", label: "VAT Amount", type: "amount", align: "right", minWidth: 120 },
  { key: "siAtcAmount", label: "ATC Amount", type: "amount", align: "right", minWidth: 120 },
  { key: "amountToBePaid", label: "Amount to be Paid", type: "amount", align: "right", minWidth: 145 },
  { key: "arcmNos", label: "ARCM No", minWidth: LIFECYCLE_DOCUMENT_NO_WIDTH },
  { key: "arcmAmount", label: "ARCM Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "ardmNos", label: "ARDM No", minWidth: LIFECYCLE_DOCUMENT_NO_WIDTH },
  { key: "ardmAmount", label: "ARDM Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "crNos", label: "CR No", minWidth: LIFECYCLE_DOCUMENT_NO_WIDTH },
  { key: "lastCrDate", label: "Last CR Date", type: "date", minWidth: 100 },
  { key: "crAppliedAmount", label: "CR Applied", type: "amount", align: "right", minWidth: 125 },
  { key: "balanceAmount", label: "AR Balance", type: "amount", align: "right", minWidth: 125 },
];

const NORMAL_WEIGHT_COLUMN_KEYS = new Set(["branchCode", "soNo"]);

const ITEM_FLOW_COLUMNS = [
  { key: "branchCode", label: "Branch", minWidth: 90 },
  { key: "soNo", label: "SO No", minWidth: 100 },
  { key: "soDate", label: "SO Date", type: "date", minWidth: 100 },
  { key: "custPoNo", label: "Cust PO No", minWidth: 110 },
  { key: "custCode", label: "Customer Code", minWidth: 115 },
  { key: "custName", label: "Customer Name", minWidth: 190 },
  { key: "shipToName", label: "Ship to Customer Name", minWidth: 190 },
  { key: "shipToAddr", label: "Ship to Address", minWidth: 240 },
  { key: "contactPerson", label: "Contact Person", minWidth: 150 },
  { key: "billingTerm", label: "Billing Term", minWidth: 150 },
  { key: "salesRepName", label: "Sales Rep", minWidth: 155 },
  { key: "responsibilityCenter", label: "Responsibility Center", minWidth: 180 },
  { key: "deliveryDate", label: "Delivery Date", type: "date", minWidth: 105 },
  { key: "soRemarks", label: "SO Remarks", minWidth: 220 },
  { key: "soLineNo", label: "SO LN", minWidth: 80 },
  { key: "lineStatus", label: "Line Status", minWidth: 105 },
  { key: "itemCode", label: "Item Code", minWidth: 120 },
  { key: "itemName", label: "Item Name", minWidth: 220 },
  { key: "uom", label: "UOM", minWidth: 80 },
  { key: "soQuantity", label: "SO Qty", type: "qty", align: "right", minWidth: 105 },
  { key: "soSellingPrice", label: "Selling Price", type: "price", align: "right", minWidth: 120 },
  { key: "soGrossAmount", label: "SO Gross Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "soDiscountAmount", label: "SO Discount Amount", type: "amount", align: "right", minWidth: 145 },
  { key: "soNetAmount", label: "SO Net Amount", type: "amount", align: "right", minWidth: 130 },
  { key: "drNos", label: "DR No", minWidth: 100 },
  { key: "lastDrDate", label: "Last DR Date", type: "date", minWidth: 105 },
  { key: "drQuantity", label: "DR Quantity", type: "qty", align: "right", minWidth: 115 },
  { key: "siNos", label: "SI No", minWidth: 100 },
  { key: "lastSiDate", label: "Last SI Date", type: "date", minWidth: 105 },
  { key: "siQuantity", label: "SI Qty", type: "qty", align: "right", minWidth: 105 },
  { key: "siSellingPrice", label: "SI Sell Price", type: "price", align: "right", minWidth: 120 },
  { key: "siGrossAmount", label: "SI Gross Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "siDiscountAmount", label: "SI Discount Amount", type: "amount", align: "right", minWidth: 145 },
  { key: "siVatAmount", label: "SI VAT Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "siAtcAmount", label: "SI ATC Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "siSalesAmount", label: "SI Sales Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "siAmountToBePaid", label: "SI Amount to be Paid", type: "amount", align: "right", minWidth: 155 },
];

const PERFORMANCE_COLUMNS = [
  { key: "groupCode", label: "Group Code", minWidth: 120 },
  { key: "groupName", label: "Group Name", minWidth: 210 },
  { key: "customerCount", label: "Customers", type: "number", align: "right", minWidth: 100 },
  { key: "soCount", label: "SO Count", type: "number", align: "right", minWidth: 90 },
  { key: "soQuantity", label: "SO Quantity", type: "qty", align: "right", minWidth: 115 },
  { key: "soNetAmount", label: "SO Net Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "drQuantity", label: "DR Quantity", type: "qty", align: "right", minWidth: 115 },
  { key: "deliveryRate", label: "Delivery %", type: "percent", align: "right", minWidth: 105 },
  { key: "siGrossAmount", label: "SI Gross Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "siDiscountAmount", label: "SI Discount Amount", type: "amount", align: "right", minWidth: 145 },
  { key: "siVatAmount", label: "SI VAT Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "siAtcAmount", label: "SI ATC Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "siSalesAmount", label: "SI Sales Amount", type: "amount", align: "right", minWidth: 135 },
  { key: "siAmountToBePaid", label: "SI Amount to be Paid", type: "amount", align: "right", minWidth: 155 },
  { key: "salesConversionRate", label: "Sales Conversion %", type: "percent", align: "right", minWidth: 145 },
  { key: "crAppliedAmount", label: "CR Applied", type: "amount", align: "right", minWidth: 125 },
  { key: "collectionRate", label: "Collection %", type: "percent", align: "right", minWidth: 115 },
  { key: "arcmAmount", label: "ARCM Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "ardmAmount", label: "ARDM Amount", type: "amount", align: "right", minWidth: 125 },
  { key: "arBalance", label: "AR Balance", type: "amount", align: "right", minWidth: 125 },
  { key: "averageSalesPerSo", label: "Average Sales / SO", type: "amount", align: "right", minWidth: 145 },
  { key: "pendingCount", label: "Pending", type: "number", align: "right", minWidth: 95 },
  { key: "closedCount", label: "Closed", type: "number", align: "right", minWidth: 90 },
];

const getPerformanceColumns = (groupBy) => {
  const labels = SALES_PERFORMANCE_GROUP_LABELS[groupBy] || SALES_PERFORMANCE_GROUP_LABELS.SALES_REP;
  return PERFORMANCE_COLUMNS.map((column) => {
    if (column.key === "groupCode") return { ...column, label: labels.code };
    if (column.key === "groupName") return { ...column, label: labels.name };
    return column;
  });
};

const COLUMNS_BY_PAGE = {
  lifecycle: LIFECYCLE_COLUMNS,
  itemFlow: ITEM_FLOW_COLUMNS,
  performance: PERFORMANCE_COLUMNS,
};

const getDefaultStartDate = () => {
  const dt = new Date();
  dt.setDate(dt.getDate() - 30);
  return dt.toISOString().slice(0, 10);
};

const getDefaultEndDate = () => new Date().toISOString().slice(0, 10);

const normalizeDate = (value) => (value ? String(value).slice(0, 10) : "");
const toNumber = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatAmount = (value) => toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatCompactAmount = (value) => {
  const amount = toNumber(value);
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}K`;
  return formatAmount(amount);
};
const formatPesoAmount = (value, compact = false) => `₱ ${compact ? formatCompactAmount(value) : formatAmount(value)}`;
const normalizeDecimalPlaces = (value, fallback = 2) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(8, Math.max(0, Math.trunc(parsed))) : fallback;
};
const formatQty = (value, decimals = 4) => toNumber(value).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const formatPrice = (value, decimals = 2) => toNumber(value).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");
const formatPercent = (value) => `${toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const TABLE_HEADER_ACRONYMS = new Set([
  "AR",
  "ARCM",
  "ARDM",
  "ATC",
  "CR",
  "DR",
  "ID",
  "PO",
  "SI",
  "SO",
  "UOM",
  "VAT",
]);
const toProperCase = (value = "") =>
  String(value)
    .split(/(\s+|\/)/)
    .map((part) => {
      const upperPart = part.toUpperCase();
      if (TABLE_HEADER_ACRONYMS.has(upperPart)) return upperPart;
      return part.replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    })
    .join("");

const parseResultRows = (response) => {
  const resultStr = response?.data?.[0]?.result;
  if (!resultStr) return [];

  try {
    const parsed = JSON.parse(resultStr);
    return Array.isArray(parsed) ? parsed : parsed?.data || [];
  } catch (error) {
    console.error("Sales Query parse error:", error, resultStr);
    return [];
  }
};

const getStatusKey = (value = "") => String(value || "").toUpperCase().replace(/\s+/g, "_");

const getStatusMeta = (value = "") => {
  const status = getStatusKey(value);

  if (status.includes("CANCEL")) return { label: "Cancelled", pct: 0, cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  if (status.includes("CLOSED") || status.includes("FULLY")) return { label: value || "Closed", pct: 100, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  if (status.includes("OVERDUE")) return { label: value || "Overdue", pct: 80, cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
  if (status.includes("COLLECT")) return { label: value || "Pending Collection", pct: status.includes("PARTIAL") ? 85 : 70, cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" };
  if (status.includes("INVOICE")) return { label: value || "Pending Invoice", pct: status.includes("PARTIAL") ? 55 : 45, cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  if (status.includes("DELIVER")) return { label: value || "Pending Delivery", pct: status.includes("PARTIAL") ? 30 : 10, cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };

  return { label: value || "No Status", pct: 0, cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
};


const createEmptyPageRows = () =>
  Object.keys(PAGE_CONFIGS).reduce((acc, key) => ({ ...acc, [key]: [] }), {});

const SalesTracker = () => {
  const { currentUserRow, companyInfo } = useAuth();
  const sellingPriceDecimals = normalizeDecimalPlaces(companyInfo?.item_decsellprice, 2);
  const quantityDecimals = normalizeDecimalPlaces(companyInfo?.itemDescQtyFG, 2);

  const defaultFilters = useMemo(() => ({
    branchCode: currentUserRow?.branchCode || currentUserRow?.BRANCH_CODE || "",
    branchName: currentUserRow?.branchName || currentUserRow?.BRANCH_NAME || "",
    custCode: "",
    custName: "",
    salesRepCode: "",
    salesRepName: "",
    dateBasis: "SO_DATE",
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    status: "",
    searchText: "",
    performanceGroupBy: "SALES_REP",
    itemFlowGroupBy: "",
    itemFlowGroupCode: "",
  }), [currentUserRow]);

  const [activePage, setActivePage] = useState("lifecycle");
  const [filters, setFilters] = useState(defaultFilters);
  const [pageRows, setPageRows] = useState(() => createEmptyPageRows());
  const [loadedPages, setLoadedPages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [selectedSalesRow, setSelectedSalesRow] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [tableSearchText, setTableSearchText] = useState("");

  useEffect(() => {
    setFilters(defaultFilters);
    setLoadedPages({});
    setPageRows(createEmptyPageRows());
    setColumnFilters({});
    setSortConfig({ key: null, direction: null });
    setTableSearchText("");
  }, [defaultFilters]);

  const activeConfig = PAGE_CONFIGS[activePage];
  const rows = pageRows[activePage] || [];
  const columns = useMemo(
    () => activePage === "performance"
      ? getPerformanceColumns(filters.performanceGroupBy)
      : COLUMNS_BY_PAGE[activePage] || LIFECYCLE_COLUMNS,
    [activePage, filters.performanceGroupBy]
  );
  const usesCustomSalesTable = activePage === "lifecycle" || activePage === "itemFlow";

  const buildPayload = useCallback((nextFilters = filters, pageKey = activePage) => ({
    json_data: {
      branchCode: nextFilters.branchCode || "",
      custCode: nextFilters.custCode || "",
      salesRepCode: nextFilters.salesRepCode || "",
      dateBasis: nextFilters.dateBasis || "SO_DATE",
      startDate: normalizeDate(nextFilters.startDate),
      endDate: normalizeDate(nextFilters.endDate),
      status: nextFilters.status || "",
      searchText: nextFilters.searchText || "",
      groupBy: pageKey === "itemFlow" && nextFilters.itemFlowGroupCode
        ? nextFilters.itemFlowGroupBy || ""
        : nextFilters.performanceGroupBy || "SALES_REP",
      groupCode: nextFilters.itemFlowGroupCode || "",
    },
  }), [activePage, filters]);

  const loadPage = useCallback(async (pageKey = activePage, nextFilters = filters) => {
    const config = PAGE_CONFIGS[pageKey];
    if (!config) return;

    setIsLoading(true);
    try {
      const response = await postRequest(config.endpoint, buildPayload(nextFilters, pageKey));
      const nextRows = parseResultRows(response);
      setPageRows((prev) => ({ ...prev, [pageKey]: nextRows }));
      setLoadedPages((prev) => ({ ...prev, [pageKey]: true }));
    } catch (error) {
      console.error(`Sales Query load error [${pageKey}]:`, error);
      setPageRows((prev) => ({ ...prev, [pageKey]: [] }));
      setLoadedPages((prev) => ({ ...prev, [pageKey]: true }));
    } finally {
      setIsLoading(false);
    }
  }, [activePage, buildPayload, filters]);

  const handleNavSelect = (pageKey) => {
    if (pageKey === "itemFlow") {
      setFilters((prev) => ({ ...prev, itemFlowGroupBy: "", itemFlowGroupCode: "" }));
    }
    setActivePage(pageKey);
  };

  const applyFilters = (nextFilters) => {
    const appliedFilters = nextFilters?.performanceGroupBy ? nextFilters : filters;
    setLoadedPages({});
    loadPage(activePage, appliedFilters);
  };

  const resetFilters = () => {
    const next = { ...defaultFilters };
    setFilters(next);
    setLoadedPages({});
    setPageRows(createEmptyPageRows());
    setColumnFilters({});
    setSortConfig({ key: null, direction: null });
    setTableSearchText("");
  };

  const handleViewDetails = (row) => {
    const soNo = row?.soNo || row?.parentSoNo;
    if (!soNo) return;
    setSelectedSalesRow(row);
    setShowDetailsModal(true);
  };

  const handleOpenSource = (row) => {
    const docNo = row?.soNo || row?.docNo;
    const branchCode = row?.branchCode || filters.branchCode || "";
    if (!docNo || !branchCode) return;

    const url = `${window.location.origin}/page/SO?soNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleViewPerformanceItems = (row) => {
    const groupCode = String(row?.groupCode || "").trim();
    if (!groupCode) return;

    const nextFilters = {
      ...filters,
      itemFlowGroupBy: filters.performanceGroupBy || "SALES_REP",
      itemFlowGroupCode: groupCode,
    };
    setFilters(nextFilters);
    setActivePage("itemFlow");
    setPageRows((prev) => ({ ...prev, itemFlow: [] }));
    setLoadedPages((prev) => ({ ...prev, itemFlow: false }));
    loadPage("itemFlow", nextFilters);
  };

  const filteredRows = useMemo(() => {
    const searchedRows = filterRowsForSearch(
      filterRowsForSearch(rows, filters.searchText),
      usesCustomSalesTable ? tableSearchText : ""
    );
    return usesCustomSalesTable
      ? applyLifecycleTableState(searchedRows, columns, columnFilters, sortConfig)
      : searchedRows;
  }, [usesCustomSalesTable, rows, columns, filters.searchText, tableSearchText, columnFilters, sortConfig]);

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  };

  const handleColumnSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const exportCsv = () => {
    const filename = `${activeConfig.title.replace(/\s+/g, "_")}_${normalizeDate(new Date().toISOString())}.csv`;
    downloadCsv(filename, columns, filteredRows);
  };

  const exportReport = async (format, exportColumns = columns, requestedFileName = "") => {
    const filename = sanitizeExportFileName(requestedFileName) || `${activeConfig.title.replace(/\s+/g, "_")}_${normalizeDate(new Date().toISOString())}`;

    if (format === "excel") {
      const reportColumns = exportColumns.map((column) => ({
        ...column,
        label: toProperCase(column.label),
        width: columnWidthsToExportWidth(column.minWidth),
        renderType: ["amount", "price"].includes(column.type) ? "currency" : column.type === "date" ? "date" : ["qty", "number", "percent"].includes(column.type) ? "number" : undefined,
        roundingOff: column.type === "qty" ? quantityDecimals : column.type === "price" ? sellingPriceDecimals : column.type === "number" ? 0 : ["amount", "percent"].includes(column.type) ? 2 : undefined,
      }));
      const excelRows = filteredRows.map((row) => ({ ...row, flow: row?.currentStatus }));
      await exportGenericQueryExcel(
        excelRows,
        {},
        reportColumns,
        [],
        reportColumns,
        {},
        7,
        filename,
        currentUserRow?.userName,
        companyInfo?.compName,
        companyInfo?.compAddr,
        companyInfo?.telNo,
        activeConfig.title,
        false
      );
      return;
    }

    await exportSalesQuery(format, filename, exportColumns, filteredRows);
  };

  return (
    <div className="global-ref-main-div-ui bg-slate-50/70">
      <style>{`
        @keyframes salesSoftRise {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes salesBarFill {
          from { width: 0%; }
          to { width: var(--sales-percent); }
        }
        @keyframes salesDonutBreathe {
          0%, 100% { transform: scale(1); box-shadow: 0 14px 32px -24px rgba(37, 99, 235, 0.5); }
          50% { transform: scale(1.025); box-shadow: 0 18px 38px -22px rgba(37, 99, 235, 0.65); }
        }
        @keyframes salesIconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .sales-soft-rise {
          animation: salesSoftRise 360ms ease-out both;
        }
        .sales-summary-card {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease;
        }
        .sales-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px -22px rgba(15, 23, 42, 0.45);
          border-color: rgba(147, 197, 253, 0.9);
          background-color: rgba(248, 250, 252, 0.9);
        }
        .sales-summary-card:hover .sales-summary-icon {
          animation: salesIconFloat 900ms ease-in-out infinite;
        }
        .sales-summary-bar {
          animation: salesBarFill 650ms ease-out both;
        }
        .sales-donut-breathe {
          animation: salesDonutBreathe 3.2s ease-in-out infinite;
        }
        .sales-performance-table table thead tr > th:nth-child(2) {
          position: sticky;
          left: 80px;
          z-index: 30;
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        .sales-performance-table table thead tr > th:nth-child(3) {
          position: sticky;
          left: 200px;
          z-index: 30;
          width: 210px !important;
          min-width: 210px !important;
          max-width: 210px !important;
          box-shadow: 1px 0 0 #dbeafe;
        }
        .sales-performance-table table tbody tr > td:not([colspan]):nth-child(2) {
          position: sticky;
          left: 80px;
          z-index: 5;
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
          background: #fff;
        }
        .sales-performance-table table tbody tr > td:not([colspan]):nth-child(3) {
          position: sticky;
          left: 200px;
          z-index: 5;
          width: 210px !important;
          min-width: 210px !important;
          max-width: 210px !important;
          background: #fff;
          box-shadow: 1px 0 0 #e2e8f0;
        }
        .sales-performance-table table tbody tr:hover > td:not([colspan]):nth-child(2),
        .sales-performance-table table tbody tr:hover > td:not([colspan]):nth-child(3),
        .sales-performance-table table tbody tr.bg-blue-50 > td:not([colspan]):nth-child(2),
        .sales-performance-table table tbody tr.bg-blue-50 > td:not([colspan]):nth-child(3) {
          background: #eff6ff;
        }
        .sales-performance-table table tfoot tr > td:nth-child(2) {
          position: sticky;
          left: 80px;
          z-index: 15;
          width: 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
          background: #dbeafe;
        }
        .sales-performance-table table tfoot tr > td:nth-child(3) {
          position: sticky;
          left: 200px;
          z-index: 15;
          width: 210px !important;
          min-width: 210px !important;
          max-width: 210px !important;
          background: #dbeafe;
          box-shadow: 1px 0 0 #bfdbfe;
        }
      `}</style>
      {isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="min-w-0">
            <h1 className="global-ref-headertext-ui truncate text-center md:text-left">{activeConfig.title}</h1>
          </div>

          <div className="flex w-full flex-nowrap items-center justify-center gap-2 md:w-auto md:justify-end">
            <HeaderButton icon={faBars} title="Reports" className="lg:hidden" onClick={() => setHideNav((value) => !value)} />
            <HeaderButton icon={faMagnifyingGlass} label="Load" onClick={applyFilters} disabled={isLoading} />
            <HeaderButton icon={faRotateLeft} label="Reset" onClick={resetFilters} disabled={isLoading} />
            <HeaderButton icon={faDownload} label="Export" onClick={exportCsv} disabled={!filteredRows.length} />
            <HeaderButton
              icon={hideNav ? faChevronRight : faChevronLeft}
              label={hideNav ? "Expand Nav" : "Collapse Nav"}
              className="hidden lg:inline-flex"
              labelClassName="hidden xl:inline"
              onClick={() => setHideNav((value) => !value)}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 mt-[8.25rem] px-0 sm:mt-[6.25rem]">
        <div className="flex gap-4">
          <aside className={`hidden shrink-0 transition-all duration-200 lg:block ${hideNav ? "w-[68px]" : "w-[290px]"}`}>
            <div className={`global-tran-tab-div-ui h-full !m-0 ${hideNav ? "!p-1.5" : "!p-4"}`}>
              <div className={`h-full overflow-hidden border bg-white shadow-sm ${hideNav ? "rounded-xl" : "rounded-2xl"}`}>
                {!hideNav && (
                  <div className="border-b px-4 py-4">
                    <div className="text-sm font-semibold text-gray-800">Sales Query</div>
                  </div>
                )}
                <div className={hideNav ? "p-1.5" : "p-3"}>
                  <SalesQueryNav activePage={activePage} collapsed={hideNav} onSelect={handleNavSelect} />
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <FilterPanel activePage={activePage} filters={filters} setFilters={setFilters} setLookup={setLookup} onApply={applyFilters} onReset={resetFilters} />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">Records</div>
                  <div className="text-[11px] text-slate-500">Showing {getShownRange(filteredRows.length)} of {filteredRows.length} entries</div>
                </div>
              </div>

              <ReportGrid
                columns={columns}
                rows={filteredRows}
                activePage={activePage}
                activeTitle={activeConfig.title}
                hasLoaded={!!loadedPages[activePage]}
                isLoading={isLoading}
                emptyMessage={activeConfig.empty}
                onViewDetails={handleViewDetails}
                onOpenSource={handleOpenSource}
                onViewPerformanceItems={handleViewPerformanceItems}
                columnFilters={columnFilters}
                sortConfig={sortConfig}
                onColumnFilterChange={handleColumnFilterChange}
                onSort={handleColumnSort}
                tableSearchText={tableSearchText}
                onTableSearchChange={setTableSearchText}
                onExport={exportReport}
                quantityDecimals={quantityDecimals}
                sellingPriceDecimals={sellingPriceDecimals}
              />

            </section>
          </main>
        </div>
      </div>

      {showDetailsModal && (
        <SalesTrackerDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          selectedRow={selectedSalesRow}
          filters={filters}
        />
      )}

      {lookup === "branch" && (
        <SearchBranchRef
          isOpen
          onClose={() => setLookup(null)}
          onSelect={(row) => {
            setFilters((prev) => ({ ...prev, branchCode: row?.branchCode || row?.BRANCH_CODE || "", branchName: row?.branchName || row?.BRANCH_NAME || "" }));
            setLookup(null);
          }}
        />
      )}

      {lookup === "customer" && (
        <SearchCustMast
          isOpen
          onClose={() => setLookup(null)}
          onSelect={(row) => {
            setFilters((prev) => ({ ...prev, custCode: row?.custCode || row?.CUST_CODE || "", custName: row?.custName || row?.CUST_NAME || "" }));
            setLookup(null);
          }}
        />
      )}

      {lookup === "salesman" && (
        <SearchSalesRepRef
          isOpen
          onClose={() => setLookup(null)}
          onSelect={(row) => {
            setFilters((prev) => ({ ...prev, salesRepCode: row?.salesRepCode || row?.SALESREP_CODE || "", salesRepName: row?.salesRepName || row?.SALESREP_NAME || "" }));
            setLookup(null);
          }}
        />
      )}
    </div>
  );
};

const HeaderButton = ({ icon, label, title, onClick, disabled = false, className = "", labelClassName = "hidden lg:inline" }) => (
  <button
    type="button"
    title={title || label}
    onClick={onClick}
    disabled={disabled}
    className={`shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    <FontAwesomeIcon icon={icon} />
    {label ? <span className={`ml-2 ${labelClassName}`}>{label}</span> : null}
  </button>
);

const SalesQueryNav = ({ activePage, collapsed, onSelect }) => (
  <ul className={`w-full text-sm ${collapsed ? "space-y-1.5" : "space-y-2"}`}>
    {NAV_ITEMS.map((item) => (
      <li key={item.key} className="w-full">
        <button
          type="button"
          onClick={() => onSelect(item.key)}
          title={collapsed ? item.label : undefined}
          className={`w-full border text-left transition ${
            activePage === item.key
              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
              : collapsed
                ? "border-transparent bg-transparent text-gray-700 hover:border-slate-200 hover:bg-slate-50"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${collapsed ? "flex h-11 items-center justify-center rounded-lg p-1" : "flex items-center gap-3 rounded-xl px-3 py-2.5"}`}
        >
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activePage === item.key ? "bg-blue-100 text-blue-700" : collapsed ? "bg-transparent text-slate-500" : "bg-slate-100 text-slate-500"}`}>
            <FontAwesomeIcon icon={item.icon} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{item.label}</span>
            </span>
          )}
        </button>
      </li>
    ))}
  </ul>
);

const FilterPanel = ({ activePage, filters, setFilters, setLookup, onApply, onReset }) => {
  const setField = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const setPerformanceGroup = (value) => {
    const nextFilters = { ...filters, performanceGroupBy: value };
    setFilters(nextFilters);
    onApply(nextFilters);
  };

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/70 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <FilterGroupCard
          title="Customer / Scope"
          icon={faLayerGroup}
          className="xl:col-span-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <CompactLookup label="Branch" code={filters.branchCode} name={filters.branchName} onLookup={() => setLookup("branch")} onClear={() => setFilters((prev) => ({ ...prev, branchCode: "", branchName: "" }))} />
            <CompactLookup label="Customer" code={filters.custCode} name={filters.custName} onLookup={() => setLookup("customer")} onClear={() => setFilters((prev) => ({ ...prev, custCode: "", custName: "" }))} />
            <CompactLookup label="Salesman" code={filters.salesRepCode} name={filters.salesRepName} onLookup={() => setLookup("salesman")} onClear={() => setFilters((prev) => ({ ...prev, salesRepCode: "", salesRepName: "" }))} />
          </div>
        </FilterGroupCard>

        <FilterGroupCard
          title="Date Coverage"
          icon={faClock}
          className="xl:col-span-3"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1">
            <SelectInput label="Date Basis" value={filters.dateBasis} onChange={(value) => setField("dateBasis", value)} options={DATE_BASIS_OPTIONS} />
            <TextInput label="Date From" type="date" value={filters.startDate || ""} onChange={(value) => setField("startDate", value)} />
            <TextInput label="Date To" type="date" value={filters.endDate || ""} onChange={(value) => setField("endDate", value)} />
          </div>
        </FilterGroupCard>

        <FilterGroupCard
          title={activePage === "performance" ? "Performance Grouping" : "Document Filter"}
          icon={faFilter}
          className="xl:col-span-4"
          actions={(
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onApply} className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700">
                <FontAwesomeIcon icon={faMagnifyingGlass} /> Apply
              </button>
              <button type="button" onClick={onReset} className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                <FontAwesomeIcon icon={faUndo} /> Reset
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[220px_minmax(0,1fr)]">
            {activePage === "performance" ? (
              <SelectInput label="Analyze By" value={filters.performanceGroupBy || "SALES_REP"} onChange={setPerformanceGroup} options={SALES_PERFORMANCE_GROUP_OPTIONS} />
            ) : (
              <SelectInput label="Lifecycle Status" value={filters.status || ""} onChange={(value) => setField("status", value)} options={SALES_STATUS_OPTIONS} />
            )}
            <TextInput label="Document No." value={filters.searchText || ""} onChange={(value) => setField("searchText", value)} />
          </div>
        </FilterGroupCard>
      </div>
    </div>
  );
};

const FilterGroupCard = ({ title, icon, actions, className = "", children }) => (
  <div className={`flex min-h-[142px] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
    <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <FontAwesomeIcon icon={icon} />
        </span>
        <div className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wide text-blue-700">{title}</div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const CompactLookup = ({ label, code, name, onLookup, onClear }) => (
  <FieldRenderer
    type="lookup"
    label={label}
    value={code ? `${code}${name ? ` - ${name}` : ""}` : ""}
    placeholder=" "
    editableLookup
    onLookup={onLookup}
    onClear={onClear}
  />
);

const TextInput = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <FieldRenderer type={type} label={label} value={value || ""} placeholder={placeholder || " "} onChange={onChange} />
);

const SelectInput = ({ label, value, onChange, options = [] }) => {
  return (
    <FieldRenderer
      type="select"
      label={label}
      value={value || ""}
      placeholder=" "
      onChange={onChange}
      options={options.filter((option) => option.value !== "")}
    />
  );
};

const MetricCard = ({ metric }) => {
  const toneClass = {
    blue: { card: "border-blue-100 border-t-blue-600", icon: "bg-blue-50 text-blue-700", label: "text-blue-700" },
    green: { card: "border-emerald-100 border-t-emerald-500", icon: "bg-emerald-50 text-emerald-700", label: "text-emerald-700" },
    purple: { card: "border-violet-100 border-t-violet-500", icon: "bg-violet-50 text-violet-700", label: "text-violet-700" },
    orange: { card: "border-orange-100 border-t-orange-500", icon: "bg-orange-50 text-orange-700", label: "text-orange-700" },
    red: { card: "border-red-100 border-t-red-500", icon: "bg-red-50 text-red-700", label: "text-red-700" },
    slate: { card: "border-slate-100 border-t-slate-500", icon: "bg-slate-100 text-slate-700", label: "text-slate-700" },
  }[metric.tone] || { card: "border-blue-100 border-t-blue-600", icon: "bg-blue-50 text-blue-700", label: "text-blue-700" };

  return (
    <div className={`flex min-h-[82px] min-w-0 flex-col justify-between rounded-lg border border-t-2 bg-white px-3 py-2 shadow-sm ${toneClass.card}`} title={metric.fullDisplay || metric.display}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${toneClass.icon}`}>
          <FontAwesomeIcon icon={metric.icon} />
        </div>
        <div className={`min-w-0 truncate text-right text-[10px] font-bold uppercase ${toneClass.label}`} title={metric.label}>
          {metric.label}
        </div>
      </div>
      <div className="truncate text-right text-[16px] font-extrabold tabular-nums text-gray-900">
        {metric.display}
      </div>
      <div className="truncate text-right text-[10px] font-medium text-slate-500">
        {metric.sub}
      </div>
    </div>
  );
};

const LifecycleStatusSummary = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const gradient = buildDonutGradient(items, total);
  const toneMap = {
    "bg-blue-500": "bg-blue-500 from-blue-500 to-blue-600",
    "bg-amber-500": "bg-amber-500 from-amber-500 to-orange-500",
    "bg-violet-500": "bg-violet-500 from-violet-500 to-purple-600",
    "bg-red-500": "bg-red-500 from-red-500 to-rose-600",
    "bg-emerald-500": "bg-emerald-500 from-emerald-500 to-teal-600",
  };

  return (
    <div className="sales-soft-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((item, index) => {
            const percentValue = Number(item.percent || 0);
            const toneClass = toneMap[item.dot] || "bg-blue-500 from-blue-500 to-blue-600";

            return (
              <div
                key={item.key}
                className="sales-summary-card sales-soft-rise overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`sales-summary-icon flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${toneClass} text-white shadow-sm`}>
                    <FontAwesomeIcon icon={item.icon} />
                  </span>
                  <span className="text-right text-[11px] font-bold tabular-nums text-slate-500">{item.percent}%</span>
                </div>

                <div className="mt-3 text-xs font-bold text-slate-700">{item.label}</div>
                <div className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">{item.count}</div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`sales-summary-bar h-full rounded-full bg-gradient-to-r ${toneClass}`}
                    style={{
                      "--sales-percent": `${Math.max(0, Math.min(100, percentValue))}%`,
                      width: `${Math.max(0, Math.min(100, percentValue))}%`,
                      animationDelay: `${180 + index * 90}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex w-full justify-center lg:w-[180px]">
          <div className="sales-soft-rise relative flex h-32 w-32 items-center justify-center" style={{ animationDelay: "380ms" }}>
            <div className="sales-donut-breathe absolute inset-0 rounded-full bg-slate-100" />
            <div className="absolute inset-2 rounded-full transition-transform duration-300" style={{ background: gradient }} />
            <div className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-xl font-extrabold tabular-nums text-slate-900">{total}</span>
              <span className="text-[10px] font-semibold text-slate-500">Total SO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArBalanceSummary = ({ summary }) => (
  <div className="sales-soft-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="text-sm font-extrabold text-slate-800">AR Balance Summary</div>
    <div className="mt-4 space-y-3 text-xs">
      <BalanceLine label="Total AR Balance" value={summary.balanceAmount} />
      <BalanceLine label="Overdue Balance" value={summary.overdueAmount} danger />
      <BalanceLine label="Current Balance" value={summary.currentAmount} success />
    </div>
  </div>
);

const BalanceLine = ({ label, value, danger, success }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
    <span className="font-semibold text-slate-500">{label}</span>
    <span className={`font-extrabold tabular-nums ${danger ? "text-red-600" : success ? "text-emerald-600" : "text-slate-900"}`}>{formatPesoAmount(value)}</span>
  </div>
);

const AnalysisSummary = ({ activePage, rows }) => {
  const title = {
    itemFlow: "Item fulfillment is quantity-based. Ordered, delivered, and invoiced quantities are compared per item.",
    aging: "Aging is based on SI due date and remaining balance.",
    performance: "Performance summarizes SO amount, SI amount, collection, and balance by group.",
    collection: "Collection analysis includes CR/AR collections, ARCM, and ARDM applications.",
  }[activePage];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-bold text-slate-700">{title}</div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{rows.length} records loaded</div>
      </div>
    </div>
  );
};

const ReportGrid = ({ columns, rows, activePage, activeTitle, hasLoaded, isLoading, emptyMessage, onViewDetails, onOpenSource, onViewPerformanceItems, columnFilters, sortConfig, onColumnFilterChange, onSort, tableSearchText, onTableSearchChange, onExport, quantityDecimals, sellingPriceDecimals }) => {
  if (activePage === "lifecycle" || activePage === "itemFlow") {
    return (
      <ModernDataTable
        columns={columns}
        rows={rows}
        activePage={activePage}
        hasLoaded={hasLoaded}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onViewDetails={onViewDetails}
        onOpenSource={onOpenSource}
        columnFilters={columnFilters}
        sortConfig={sortConfig}
        onColumnFilterChange={onColumnFilterChange}
        onSort={onSort}
        tableSearchText={tableSearchText}
        onTableSearchChange={onTableSearchChange}
        onExport={onExport}
        quantityDecimals={quantityDecimals}
        sellingPriceDecimals={sellingPriceDecimals}
      />
    );
  }

  const globalRows = rows;
  const globalColumns = toGlobalColumns(columns, quantityDecimals, sellingPriceDecimals);

  return (
    <div className="sales-performance-table min-h-[340px]" style={{ height: `${getTableHeight(globalRows.length)}px` }}>
      <SearchGlobalReportTable
        columns={globalColumns}
        data={globalRows}
        itemsPerPage={50}
        docType={activeTitle}
        rightActionLabel="Action"
        onRowAction={onViewPerformanceItems}
        totalExemptions={["groupCode", "groupName", "branchCode", "soNo", "soDate", "custCode", "custName", "salesRepCode", "salesRepName", "custPoNo", "shipToName", "shipToAddr", "contactPerson", "billingTerm", "responsibilityCenter", "deliveryDate", "soRemarks", "soLineNo", "lineStatus", "groupId", "itemCode", "itemName", "itemDescription", "itemSpecs", "uom", "drNos", "lastDrDate", "siNos", "lastSiDate", "itemStatus", "docType", "docNo", "siNo", "balanceEffect", "remarks"]}
      />
    </div>
  );
};

const toGlobalColumns = (columns = [], quantityDecimals = 2, sellingPriceDecimals = 2) => [
  ...columns
    .filter((column) => column.key !== "flow")
    .map((column) => ({
      key: column.key,
      label: column.label,
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
      renderType: column.type === "amount" || column.type === "price" ? "currency" : column.type === "date" ? "date" : column.type === "qty" || column.type === "number" || column.type === "percent" ? "number" : undefined,
      roundingOff: column.type === "qty" ? quantityDecimals : column.type === "price" ? sellingPriceDecimals : column.type === "number" ? 0 : column.type === "amount" || column.type === "percent" ? 2 : undefined,
    })),
];

const getTableHeight = (rowCount) => Math.min(620, Math.max(340, 170 + Math.min(rowCount, 25) * 32));

const getShownRange = (totalRows) => {
  if (!totalRows) return "0 to 0";
  return `1 to ${totalRows.toLocaleString("en-US")}`;
};

const ModernDataTable = ({ columns, rows, activePage, hasLoaded, isLoading, emptyMessage, onViewDetails, onOpenSource, columnFilters, sortConfig, onColumnFilterChange, onSort, tableSearchText, onTableSearchChange, onExport, quantityDecimals, sellingPriceDecimals }) => {
  const [columnWidths, setColumnWidths] = useState({});
  const [groupByKey, setGroupByKey] = useState(null);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [showColumns, setShowColumns] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    title: "Export File",
    confirmText: "Export",
    defaultFileName: "",
    type: null,
  });
  const [columnChooserSearch, setColumnChooserSearch] = useState("");
  const [autoFit, setAutoFit] = useState(false);
  const hasActiveColumnFilters = Object.values(columnFilters || {}).some((value) => String(value || "").trim() !== "");
  const showColumnFilters = rows.length > 0 || hasActiveColumnFilters;
  const pinnedColumnKeys = new Set(activePage === "lifecycle" ? ["currentStatus", "flow", "branchCode", "soNo"] : ["branchCode", "soNo"]);
  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column.key));

  const getColumnWidth = (column) => columnWidths[column.key] || column.minWidth || 110;
  const tableWidth = visibleColumns.reduce((total, column) => total + getColumnWidth(column), LIFECYCLE_ACTION_WIDTH);
  const startColumnResize = (event, column) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(column);
    const onMouseMove = (moveEvent) => {
      const nextWidth = Math.max(70, startWidth + moveEvent.clientX - startX);
      setColumnWidths((current) => ({ ...current, [column.key]: nextWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleAutoFit = () => {
    if (autoFit) {
      setColumnWidths({});
      setAutoFit(false);
      return;
    }

    const fittedWidths = {};
    visibleColumns.forEach((column) => {
      const longestValue = rows.reduce((longest, row) => {
        const value = column.key === "flow" ? row?.currentStatus : row?.[column.key];
        return Math.max(longest, String(value ?? "").length);
      }, String(column.label || "").length);
      fittedWidths[column.key] = Math.min(320, Math.max(column.minWidth || 70, longestValue * 7 + 34));
    });
    setColumnWidths(fittedWidths);
    setAutoFit(true);
  };

  const toggleColumn = (key) => {
    if (pinnedColumnKeys.has(key)) return;
    setHiddenColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const renderedRows = groupByKey
    ? Object.entries(rows.reduce((groups, row) => {
        const rawGroupValue = groupByKey === "flow" ? row?.currentStatus : row?.[groupByKey];
        const groupValue = String(rawGroupValue ?? "(Blank)");
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(row);
        return groups;
      }, {})).flatMap(([groupValue, groupRows]) => [
        { __group: true, groupValue, groupCount: groupRows.length },
        ...groupRows,
      ])
    : rows;

  const openExportModal = (type) => {
    const titleMap = { excel: "Export Excel", csv: "Export CSV", pdf: "Export PDF", image: "Export Image" };
    setShowExportMenu(false);
    setExportModal({
      isOpen: true,
      title: titleMap[type] || "Export File",
      confirmText: "Export",
      defaultFileName: sanitizeExportFileName(`${PAGE_CONFIGS[activePage]?.title || "Sales Query"} ${getExportDateTimeStamp()}`),
      type,
    });
  };

  const closeExportModal = () => {
    setExportModal({ isOpen: false, title: "Export File", confirmText: "Export", defaultFileName: "", type: null });
  };

  const handleExportConfirm = async (enteredFileName) => {
    const safeFileName = sanitizeExportFileName(enteredFileName);
    if (!safeFileName) return;
    try {
      await onExport(exportModal.type, visibleColumns, safeFileName);
    } finally {
      closeExportModal();
    }
  };

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-b-2xl bg-white">
      <div className="relative flex flex-col gap-2 border-b border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const key = event.dataTransfer.getData("text/plain");
            if (columns.some((column) => column.key === key)) setGroupByKey(key);
          }}
          className="flex min-h-9 min-w-[280px] items-center rounded border border-dashed border-slate-300 px-4 text-xs italic text-slate-400"
        >
          <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
          {groupByKey ? (
            <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-1 font-medium not-italic text-blue-700">
              {columns.find((column) => column.key === groupByKey)?.label}
              <button type="button" onClick={() => setGroupByKey(null)} className="ml-2 text-blue-500 hover:text-red-600" aria-label="Remove grouping">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </span>
          ) : "Drag column here to Group"}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <input
              type="text"
              value={tableSearchText || ""}
              onChange={(event) => onTableSearchChange(event.target.value)}
              placeholder="Quick Search..."
              className="h-8 w-48 rounded-md border border-slate-300 bg-white px-3 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
            {tableSearchText && (
              <button type="button" onClick={() => onTableSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600" aria-label="Clear Quick Search">
                <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
              </button>
            )}
          </div>

          <label className="inline-flex h-8 shrink-0 cursor-pointer select-none items-center">
            <input type="checkbox" checked={autoFit} onChange={handleAutoFit} className="sr-only" />
            <div className={`relative h-8 w-20 rounded-full transition-colors duration-200 ${autoFit ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"}`}>
              <span className={`absolute top-[2px] h-7 w-7 rounded-full bg-white shadow-md transition-all duration-200 ${autoFit ? "left-[50px]" : "left-[2px]"}`} />
              <span className={`pointer-events-none absolute inset-0 flex items-center text-[11px] font-medium transition-all duration-200 ${autoFit ? "justify-start pl-2 text-white" : "justify-end pr-2"}`}>
                Auto Fit
              </span>
            </div>
          </label>
          <div className="relative">
            <button type="button" onClick={() => rows.length > 0 && setShowExportMenu((value) => !value)} disabled={!rows.length} className="flex h-8 items-center justify-center rounded-md bg-green-600 px-3 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50">
              <FontAwesomeIcon icon={faFileExport} className="mr-1" /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 z-[60] mt-1 min-w-[120px] overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10">
                {[
                  { format: "excel", label: "Excel", icon: faFileExcel, color: "text-green-600" },
                  { format: "csv", label: "CSV", icon: faFileCsv, color: "text-emerald-600" },
                  { format: "pdf", label: "PDF", icon: faFilePdf, color: "text-red-600" },
                  { format: "image", label: "Image", icon: faFileImage, color: "text-blue-600" },
                ].map((item) => (
                  <button
                    key={item.format}
                    type="button"
                    onClick={() => openExportModal(item.format)}
                    className="flex w-full items-center px-4 py-2 text-xs transition-colors hover:bg-blue-50"
                  >
                    <FontAwesomeIcon icon={item.icon} className={`mr-2 ${item.color}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" disabled={!rows.length} onClick={() => { setShowColumns(true); setColumnChooserSearch(""); }} className="flex h-8 items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <FontAwesomeIcon icon={faColumns} className="mr-1" /> Columns
          </button>
        </div>
      </div>

      {showColumns && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-3 py-3">
          <div className="flex max-h-[60vh] w-full max-w-[480px] flex-col overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-3 py-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">Manage Columns - {PAGE_CONFIGS[activePage]?.title || "Sales Query"}</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Choose the columns to display in the table.</p>
              </div>
              <button type="button" className="h-6 w-6 shrink-0 text-slate-500 hover:text-red-600" onClick={() => setShowColumns(false)} title="Close">
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>

            <div className="border-b border-gray-200 px-3 py-2">
              <div className="flex flex-col gap-2">
                <div className="relative min-w-0 flex-1">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                  <input type="text" value={columnChooserSearch} onChange={(event) => setColumnChooserSearch(event.target.value)} placeholder="Search columns..." className="h-7 w-full rounded-md border border-gray-300 pl-9 pr-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button type="button" className="h-7 shrink-0 px-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-700" onClick={() => setHiddenColumns([])}>Show All</button>
                  <button type="button" className="h-7 shrink-0 rounded-md border border-gray-300 px-2 text-[11px] font-medium text-slate-600 hover:bg-gray-50" onClick={() => setHiddenColumns(columns.filter((column) => !pinnedColumnKeys.has(column.key)).map((column) => column.key))}>Hide Optional</button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {columns.filter((column) => toProperCase(column.label).toLowerCase().includes(columnChooserSearch.trim().toLowerCase())).map((column) => {
                  const pinned = pinnedColumnKeys.has(column.key);
                  return (
                    <label key={column.key} className={`flex h-7 items-center gap-1.5 rounded border border-gray-200 bg-white px-2 text-[11px] shadow-sm select-none ${pinned ? "cursor-default text-slate-400" : "cursor-pointer text-slate-800 hover:bg-blue-50"}`}>
                      <input type="checkbox" className="h-3 w-3 shrink-0 accent-blue-600" checked={!hiddenColumns.includes(column.key)} disabled={pinned} onChange={() => toggleColumn(column.key)} />
                      <span className="min-w-0 flex-1 truncate">{toProperCase(column.label)}</span>
                      {pinned && <span className="text-[9px] uppercase">Pinned</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2">
              <div className="text-[11px] text-slate-500">{visibleColumns.length} of {columns.length} columns visible</div>
              <button type="button" className="h-7 min-w-[72px] rounded-md bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700" onClick={() => setShowColumns(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}
      <ExportFileNameModal
        isOpen={exportModal.isOpen}
        title={exportModal.title}
        defaultFileName={exportModal.defaultFileName}
        confirmText={exportModal.confirmText}
        onClose={closeExportModal}
        onConfirm={handleExportConfirm}
      />
      <div className="max-h-[66vh] overflow-auto sales-lifecycle-grid-scroll">
        <table style={{ width: tableWidth, minWidth: "100%" }} className="table-fixed border-separate border-spacing-0 text-[11px]">
          <thead className="bg-blue-100 shadow-sm">
            <tr>
              <th
                style={{ width: LIFECYCLE_ACTION_WIDTH, minWidth: LIFECYCLE_ACTION_WIDTH, maxWidth: LIFECYCLE_ACTION_WIDTH }}
                className={`sticky left-0 top-0 z-50 h-[30px] border-b border-blue-200 bg-blue-100 px-2 py-1.5 text-center text-[11px] font-bold text-blue-900 ${activePage === "lifecycle" ? "border-r shadow-[10px_0_18px_-15px_rgba(15,23,42,0.95)]" : ""}`}
              >
                Actions
              </th>
              {visibleColumns.map((column) => {
                const columnWidth = getColumnWidth(column);
                const sticky = getSalesTableStickyStyle(activePage, column.key, columnWidths);
                return (
                  <th
                    key={column.key}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", column.key)}
                    style={{ minWidth: columnWidth, width: columnWidth, maxWidth: columnWidth, ...sticky.style }}
                    onClick={() => onSort(column.key)}
                    className={`sticky top-0 z-30 h-[30px] cursor-pointer select-none border-b border-blue-200 bg-blue-100 px-2 py-1.5 text-[11px] font-bold text-blue-900 ${column.align === "right" ? "text-right" : "text-left"} ${sticky.headerClassName || ""}`}
                  >
                    <div className={`flex items-center gap-2 overflow-hidden ${column.align === "right" ? "justify-end" : "justify-between"}`} title={toProperCase(column.label)}>
                      <span className="truncate whitespace-nowrap">{toProperCase(column.label)}</span>
                      <FontAwesomeIcon
                        icon={sortConfig?.key === column.key ? (sortConfig.direction === "asc" ? faSortUp : faSortDown) : faSort}
                        className={`shrink-0 text-[9px] ${sortConfig?.key === column.key ? "opacity-100" : "opacity-30"}`}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Resize ${toProperCase(column.label)} column`}
                      title="Drag to resize column"
                      onMouseDown={(event) => startColumnResize(event, column)}
                      className="absolute -right-1 top-0 z-[60] h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 hover:bg-blue-400/40"
                    />
                  </th>
                );
              })}
            </tr>
            {showColumnFilters && <tr className="bg-slate-100">
              <th
                style={{ width: LIFECYCLE_ACTION_WIDTH, minWidth: LIFECYCLE_ACTION_WIDTH, maxWidth: LIFECYCLE_ACTION_WIDTH }}
                className={`sticky left-0 top-[30px] z-50 h-9 border-b border-slate-200 bg-slate-100 ${activePage === "lifecycle" ? "border-r" : ""}`}
              />
              {visibleColumns.map((column) => {
                const columnWidth = getColumnWidth(column);
                const sticky = getSalesTableStickyStyle(activePage, column.key, columnWidths);
                return (
                  <th
                    key={`filter-${column.key}`}
                    style={{ minWidth: columnWidth, width: columnWidth, maxWidth: columnWidth, ...sticky.style }}
                    className={`sticky top-[30px] z-30 border-b border-slate-200 bg-slate-100 px-1 py-1 ${sticky.isSticky ? "z-40 border-r border-slate-200" : ""}`}
                  >
                    <input
                      type="text"
                      value={columnFilters?.[column.key] || ""}
                      onChange={(event) => onColumnFilterChange(column.key, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Filter..."
                      aria-label={`Filter ${toProperCase(column.label)}`}
                      className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-normal text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    />
                  </th>
                );
              })}
            </tr>}
          </thead>
          <tbody className="bg-white">
            {!rows.length && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="h-28 border-b border-slate-100 px-4 text-center text-xs font-medium text-slate-500"
                >
                  {!hasLoaded && isLoading
                    ? "Loading records..."
                    : !hasLoaded
                      ? "Ready to load"
                      : emptyMessage || "No records found"}
                </td>
              </tr>
            )}
            {renderedRows.map((row, rowIndex) => {
              if (row.__group) {
                return (
                  <tr key={`group-${row.groupValue}`} className="bg-slate-100">
                    <td colSpan={visibleColumns.length + 1} className="border-b border-slate-200 px-3 py-2 text-xs font-bold text-blue-800">
                      {columns.find((column) => column.key === groupByKey)?.label}: {row.groupValue} ({row.groupCount})
                    </td>
                  </tr>
                );
              }
              const rowTone = getLifecycleRowTone(row?.currentStatus);
              const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40";
              const stickyBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50";
              return (
                <tr key={`${row.soId || row.soNo || row.docNo || rowIndex}-${rowIndex}`} className={`group border-b border-slate-100 transition-colors ${rowBg} hover:bg-blue-50`}>
                  <td
                    style={{ width: LIFECYCLE_ACTION_WIDTH, minWidth: LIFECYCLE_ACTION_WIDTH, maxWidth: LIFECYCLE_ACTION_WIDTH }}
                    className={`sticky left-0 z-30 border-b border-slate-200 px-1.5 py-1 text-center ${activePage === "lifecycle" ? "border-r shadow-[10px_0_18px_-15px_rgba(15,23,42,0.95)]" : ""} ${stickyBg} group-hover:bg-blue-50`}
                  >
                    <div className="flex h-6 items-center justify-center gap-1">
                      {activePage === "lifecycle" ? (
                        <>
                          <ActionIconButton title="View document flow" icon={faArrowUpRightFromSquare} onClick={() => onViewDetails(row)} tone="primary" />
                          <ActionIconButton title="Open Sales Order" icon={faEye} onClick={() => onOpenSource(row)} tone="primary" />
                        </>
                      ) : (
                        <ActionIconButton title="View Sales Order" icon={faEye} onClick={() => onOpenSource(row)} tone="primary" />
                      )}
                    </div>
                  </td>
                  {visibleColumns.map((column, columnIndex) => {
                    const columnWidth = getColumnWidth(column);
                    const sticky = getSalesTableStickyStyle(activePage, column.key, columnWidths);
                    return (
                      <td
                        key={column.key}
                        style={{ minWidth: columnWidth, width: columnWidth, maxWidth: columnWidth, ...sticky.style }}
                        className={`overflow-hidden border-b border-slate-100 px-1.5 py-1 text-[11px] leading-tight whitespace-nowrap align-middle ${activePage === "lifecycle" && columnIndex === 0 ? `border-l-4 ${rowTone.border}` : columnIndex === 0 ? "" : "border-l border-slate-100/70"} ${column.align === "right" ? "text-right tabular-nums" : "text-left"} ${sticky.className} ${sticky.isSticky ? `${stickyBg} group-hover:bg-blue-50` : ""}`}
                      >
                        <div className="min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={String(row?.[column.key] ?? "")}>
                          <CellRenderer column={column} row={row} onViewDetails={onViewDetails} isSticky={activePage === "lifecycle" && sticky.isSticky} quantityDecimals={quantityDecimals} sellingPriceDecimals={sellingPriceDecimals} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getSalesTableStickyStyle = (activePage, key, columnWidths = {}) => {
  if (activePage === "itemFlow") {
    const branchWidth = columnWidths.branchCode || 90;

    if (key === "branchCode") {
      return {
        isSticky: true,
        style: {
          left: LIFECYCLE_ACTION_WIDTH,
          width: branchWidth,
          minWidth: branchWidth,
          maxWidth: branchWidth,
        },
        headerClassName: "sticky z-40 border-r border-blue-200 bg-blue-100",
        className: "sticky z-20 border-r border-slate-200",
      };
    }

    if (key === "soNo") {
      return {
        isSticky: true,
        style: { left: LIFECYCLE_ACTION_WIDTH + branchWidth },
        headerClassName: "sticky z-40 border-r border-blue-200 bg-blue-100 shadow-[10px_0_18px_-15px_rgba(15,23,42,0.95)]",
        className: "sticky z-20 border-r border-slate-200 shadow-[10px_0_18px_-15px_rgba(15,23,42,0.95)]",
      };
    }

    return { isSticky: false, style: {}, className: "", headerClassName: "" };
  }

  const flowWidth = columnWidths.flow || LIFECYCLE_FLOW_WIDTH;
  const statusWidth = columnWidths.currentStatus || LIFECYCLE_STATUS_WIDTH;
  const branchWidth = columnWidths.branchCode || 90;

  if (key === "currentStatus") {
    return {
      isSticky: true,
      style: {
        left: LIFECYCLE_ACTION_WIDTH,
        width: statusWidth,
        minWidth: statusWidth,
        maxWidth: statusWidth,
      },
      headerClassName: "sticky z-40 border-r border-blue-200 bg-blue-100",
      className: "sticky z-20 border-r border-slate-200",
    };
  }

  if (key === "flow") {
    return {
      isSticky: true,
      style: {
        left: LIFECYCLE_ACTION_WIDTH + statusWidth,
        width: flowWidth,
        minWidth: flowWidth,
        maxWidth: flowWidth,
      },
      headerClassName: "sticky z-40 border-r border-blue-200 bg-blue-100",
      className: "sticky z-20 border-r border-slate-200",
    };
  }

  if (key === "branchCode") {
    return {
      isSticky: true,
      style: {
        left: LIFECYCLE_ACTION_WIDTH + statusWidth + flowWidth,
        width: branchWidth,
        minWidth: branchWidth,
        maxWidth: branchWidth,
      },
      headerClassName: "sticky z-40 border-r border-blue-200 bg-blue-100",
      className: "sticky z-20 border-r border-slate-200",
    };
  }

  if (key === "soNo") {
    return {
      isSticky: true,
      style: {
        left: LIFECYCLE_ACTION_WIDTH + statusWidth + flowWidth + branchWidth,
      },
      headerClassName: "sticky z-40 border-r border-blue-200 bg-blue-100 shadow-[10px_0_18px_-15px_rgba(15,23,42,0.95)]",
      className: "sticky z-20 border-r border-slate-200 shadow-[10px_0_18px_-15px_rgba(15,23,42,0.95)]",
    };
  }

  return { isSticky: false, style: {}, className: "", headerClassName: "" };
};

const ActionIconButton = ({ title, icon, onClick, tone = "secondary" }) => {
  const cls = tone === "primary"
    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-[22px] min-h-[22px] w-[22px] items-center justify-center rounded border text-[9px] shadow-sm transition ${cls}`}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
};

const getLifecycleRowTone = (status) => {
  const key = getStatusKey(status);
  if (key.includes("CANCEL")) return { border: "border-l-slate-300" };
  if (key.includes("CLOSED") || key.includes("FULLY")) return { border: "border-l-emerald-400" };
  if (key.includes("OVERDUE")) return { border: "border-l-red-400" };
  if (key.includes("COLLECT")) return { border: "border-l-violet-400" };
  if (key.includes("INVOICE")) return { border: "border-l-amber-400" };
  if (key.includes("DELIVER")) return { border: "border-l-blue-400" };
  return { border: "border-l-slate-300" };
};

const CellRenderer = ({ column, row, onViewDetails, isSticky = false, quantityDecimals = 2, sellingPriceDecimals = 2 }) => {
  const value = row?.[column.key];
  const weightClass = isSticky && !NORMAL_WEIGHT_COLUMN_KEYS.has(column.key)
    ? "font-bold"
    : "font-normal";

  if (column.type === "link") {
    return (
      <button type="button" onClick={() => onViewDetails(row)} className={`inline-flex max-w-full truncate text-[11px] text-slate-700 transition hover:text-slate-700 ${weightClass}`}>
        {value || "-"}
      </button>
    );
  }

  if (column.type === "date") return <span className={`${weightClass} text-slate-600`}>{formatDate(value)}</span>;
  if (column.type === "amount") return <span className={`${weightClass} tabular-nums text-slate-800`}>{formatAmount(value)}</span>;
  if (column.type === "price") return <span className={`${weightClass} tabular-nums text-slate-800`}>{formatPrice(value, sellingPriceDecimals)}</span>;
  if (column.type === "qty") return <span className={`${weightClass} tabular-nums text-slate-800`}>{formatQty(value, quantityDecimals)}</span>;
  if (column.type === "number") return <span className={`${weightClass} tabular-nums text-slate-800`}>{toNumber(value).toLocaleString()}</span>;
  if (column.type === "percent") return <span className={`${weightClass} tabular-nums text-slate-800`}>{formatPercent(value)}</span>;
  if (column.type === "status") return <StatusBadge value={value} isSticky={isSticky} />;
  if (column.type === "flow") return <FlowProgress status={row?.currentStatus || row?.itemStatus} />;
  if (column.type === "docBadge") return <DocTypeBadge value={value} />;

  return <span className={`${weightClass} text-slate-700`}>{value ?? ""}</span>;
};

const StatusBadge = ({ value, isSticky = false }) => {
  const meta = getStatusMeta(value);
  return (
    <span className={`inline-flex max-w-[150px] items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${isSticky ? "font-bold" : "font-normal"} ${meta.cls}`} title={meta.label}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="truncate">{meta.label}</span>
    </span>
  );
};

const DocTypeBadge = ({ value }) => {
  const type = String(value || "").toUpperCase();
  const cls = type === "ARDM"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : type === "ARCM"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-normal ${cls}`}>{type || "DOC"}</span>;
};

const FlowProgress = ({ status }) => {
  const meta = getStatusMeta(status);
  const stages = ["SO", "DR", "SI", "AR", "CR"];
  const activeIndex = Math.min(stages.length - 1, Math.max(0, Math.round((meta.pct / 100) * (stages.length - 1))));

  return (
    <div className="min-w-[145px] max-w-[160px]">
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => (
          <React.Fragment key={stage}>
            <span title={stage} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ring-2 ring-white ${index <= activeIndex ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
              {stage[0]}
            </span>
            {index < stages.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${index < activeIndex ? "bg-blue-500" : "bg-slate-200"}`} />}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-bold text-slate-400">
        {stages.map((stage) => <span key={stage}>{stage}</span>)}
      </div>
    </div>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 text-blue-600">
      <FontAwesomeIcon icon={faMagnifyingGlass} />
    </div>
    <div className="mt-3 text-sm font-extrabold text-slate-700">{title}</div>
    <div className="mt-1 text-xs text-slate-500">{description}</div>
  </div>
);

const buildMetrics = (activePage, rows, lifecycleRows) => {
  const source = activePage === "lifecycle" ? rows : lifecycleRows;
  const sum = (list, key) => list.reduce((total, row) => total + toNumber(row?.[key]), 0);

  if (activePage === "itemFlow") {
    return [
      { key: "items", label: "Total Items", display: rows.length.toLocaleString(), sub: "SO item rows", icon: faLayerGroup, tone: "blue" },
      { key: "soQty", label: "SO Quantity", display: formatQty(sum(rows, "soQuantity")), sub: "Ordered quantity", icon: faProjectDiagram, tone: "green" },
      { key: "drQty", label: "Delivered Quantity", display: formatQty(sum(rows, "drQuantity")), sub: "DR quantity only", icon: faTruck, tone: "purple" },
      { key: "siQty", label: "Invoiced Quantity", display: formatQty(sum(rows, "siQuantity")), sub: "SI quantity", icon: faFileInvoiceDollar, tone: "orange" },
      { key: "undelivered", label: "Undelivered Qty", display: formatQty(sum(rows, "undeliveredQuantity")), sub: "SO less DR", icon: faClock, tone: "red" },
      { key: "uninvoiced", label: "Uninvoiced Qty", display: formatQty(sum(rows, "uninvoicedQuantity")), sub: "DR less SI", icon: faReceipt, tone: "slate" },
      { key: "invoiceAmt", label: "SI Amount", display: formatPesoAmount(sum(rows, "invoiceAmount"), true), sub: "Item invoices", icon: faPesoSign, tone: "blue" },
      { key: "record", label: "Records", display: rows.length.toLocaleString(), sub: "Loaded rows", icon: faLayerGroup, tone: "slate" },
    ];
  }

  if (activePage === "aging") {
    return [
      { key: "balance", label: "Total AR Balance", display: formatPesoAmount(sum(rows, "balanceAmount"), true), sub: "Open receivables", icon: faPesoSign, tone: "blue" },
      { key: "current", label: "Current", display: formatPesoAmount(sum(rows, "currentAmount"), true), sub: "Not overdue", icon: faClock, tone: "green" },
      { key: "d30", label: "1-30 Days", display: formatPesoAmount(sum(rows, "days1To30"), true), sub: "Overdue bucket", icon: faClock, tone: "orange" },
      { key: "d60", label: "31-60 Days", display: formatPesoAmount(sum(rows, "days31To60"), true), sub: "Overdue bucket", icon: faClock, tone: "orange" },
      { key: "d90", label: "61-90 Days", display: formatPesoAmount(sum(rows, "days61To90"), true), sub: "Overdue bucket", icon: faClock, tone: "red" },
      { key: "over90", label: "Over 90 Days", display: formatPesoAmount(sum(rows, "over90Days"), true), sub: "Critical overdue", icon: faClock, tone: "red" },
      { key: "invoiceCount", label: "Open SI", display: sum(rows, "invoiceCount").toLocaleString(), sub: "Open invoices", icon: faFileInvoiceDollar, tone: "purple" },
      { key: "customerCount", label: "Customers", display: rows.length.toLocaleString(), sub: "With balance", icon: faLayerGroup, tone: "slate" },
    ];
  }

  if (activePage === "collection") {
    return [
      { key: "cr", label: "Collections", display: formatPesoAmount(sum(rows.filter((r) => ["AR", "CR"].includes(String(r.docType).toUpperCase())), "appliedAmount"), true), sub: "AR / CR", icon: faReceipt, tone: "green" },
      { key: "cm", label: "Credit Memo", display: formatPesoAmount(sum(rows.filter((r) => String(r.docType).toUpperCase() === "ARCM"), "appliedAmount"), true), sub: "ARCM", icon: faUndo, tone: "purple" },
      { key: "dm", label: "Debit Memo", display: formatPesoAmount(sum(rows.filter((r) => String(r.docType).toUpperCase() === "ARDM"), "appliedAmount"), true), sub: "ARDM", icon: faFileInvoiceDollar, tone: "orange" },
      { key: "net", label: "Net Effect", display: formatPesoAmount(sum(rows, "netCollectionAmount"), true), sub: "Less/add balance", icon: faMoneyBillWave, tone: "blue" },
      { key: "records", label: "Transactions", display: rows.length.toLocaleString(), sub: "Loaded documents", icon: faLayerGroup, tone: "slate" },
      { key: "balance", label: "AR Balance", display: formatPesoAmount(sum(source, "balanceAmount"), true), sub: "Lifecycle balance", icon: faChartLine, tone: "red" },
      { key: "invoice", label: "SI Amount", display: formatPesoAmount(sum(source, "invoiceAmount"), true), sub: "From lifecycle", icon: faFileInvoiceDollar, tone: "purple" },
      { key: "so", label: "SO Amount", display: formatPesoAmount(sum(source, "soAmount"), true), sub: "From lifecycle", icon: faPesoSign, tone: "blue" },
    ];
  }

  if (activePage === "performance") {
    return [
      { key: "so", label: "SO Amount", display: formatPesoAmount(sum(rows, "soAmount"), true), sub: "Total booked", icon: faPesoSign, tone: "blue" },
      { key: "si", label: "SI Amount", display: formatPesoAmount(sum(rows, "invoiceAmount"), true), sub: "Total invoiced", icon: faFileInvoiceDollar, tone: "purple" },
      { key: "collection", label: "Collected", display: formatPesoAmount(sum(rows, "collectionAmount"), true), sub: "Total collected", icon: faMoneyBillWave, tone: "green" },
      { key: "balance", label: "AR Balance", display: formatPesoAmount(sum(rows, "balanceAmount"), true), sub: "Remaining", icon: faChartLine, tone: "red" },
      { key: "count", label: "SO Count", display: sum(rows, "soCount").toLocaleString(), sub: "Transactions", icon: faProjectDiagram, tone: "blue" },
      { key: "pending", label: "Pending", display: sum(rows, "pendingCount").toLocaleString(), sub: "Open lifecycle", icon: faClock, tone: "orange" },
      { key: "closed", label: "Closed", display: sum(rows, "closedCount").toLocaleString(), sub: "Closed SO", icon: faReceipt, tone: "green" },
      { key: "groups", label: "Groups", display: rows.length.toLocaleString(), sub: "Analysis rows", icon: faLayerGroup, tone: "slate" },
    ];
  }

  return [
    { key: "so", label: "SO Amount", display: formatPesoAmount(sum(rows, "soAmount"), true), sub: `${rows.length.toLocaleString()} SO`, icon: faPesoSign, tone: "blue" },
    { key: "soQty", label: "SO Qty", display: formatQty(sum(rows, "soQuantity")), sub: "Ordered quantity", icon: faProjectDiagram, tone: "green" },
    { key: "drQty", label: "DR QUANTITY", display: formatQty(sum(rows, "drQuantity")), sub: "Delivered quantity", icon: faTruck, tone: "purple" },
    { key: "si", label: "SI Amount", display: formatPesoAmount(sum(rows, "invoiceAmount"), true), sub: `${sum(rows, "siCount").toLocaleString()} SI`, icon: faFileInvoiceDollar, tone: "blue" },
    { key: "collection", label: "Collected Amount", display: formatPesoAmount(sum(rows, "collectionAmount"), true), sub: `${sum(rows, "collectionCount").toLocaleString()} CR/AR`, icon: faMoneyBillWave, tone: "green" },
    { key: "balance", label: "AR Balance", display: formatPesoAmount(sum(rows, "balanceAmount"), true), sub: "Outstanding", icon: faChartLine, tone: "orange" },
    { key: "overdue", label: "Overdue Balance", display: formatPesoAmount(sum(rows, "overdueAmount"), true), sub: "Past due", icon: faClock, tone: "red" },
    { key: "open", label: "Open Transactions", display: rows.filter((row) => !["Closed", "Cancelled"].includes(row?.currentStatus)).length.toLocaleString(), sub: "Needs action", icon: faReceipt, tone: "slate" },
  ];
};

const buildLifecycleSummary = (rows) => {
  const defs = [
    { key: "PENDING_DELIVERY", label: "Pending Delivery", icon: faTruck, dot: "bg-blue-500" },
    { key: "PENDING_INVOICE", label: "Pending Invoice", icon: faFileInvoiceDollar, dot: "bg-amber-500" },
    { key: "PENDING_COLLECTION", label: "Pending Collection", icon: faMoneyBillWave, dot: "bg-violet-500" },
    { key: "OVERDUE", label: "Overdue", icon: faClock, dot: "bg-red-500" },
    { key: "CLOSED", label: "Closed", icon: faReceipt, dot: "bg-emerald-500" },
  ];
  const total = Math.max(1, rows.length);
  return defs.map((def) => {
    const count = rows.filter((row) => getStatusKey(row.currentStatus).includes(def.key) || (def.key === "PENDING_COLLECTION" && getStatusKey(row.currentStatus).includes("COLLECT"))).length;
    return { ...def, count, percent: ((count / total) * 100).toFixed(2) };
  });
};

const buildArSummary = (rows) => {
  const balanceAmount = rows.reduce((sum, row) => sum + toNumber(row.balanceAmount), 0);
  const overdueAmount = rows.reduce((sum, row) => sum + toNumber(row.overdueAmount), 0);
  return { balanceAmount, overdueAmount, currentAmount: Math.max(0, balanceAmount - overdueAmount) };
};

const buildDonutGradient = (items, total) => {
  if (!total) return "conic-gradient(#e2e8f0 0deg 360deg)";
  const colors = ["#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981"];
  let cursor = 0;
  const stops = items.map((item, index) => {
    const span = (item.count / total) * 360;
    const start = cursor;
    cursor += span;
    return `${colors[index]} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
};

const applyLifecycleTableState = (rows, columns, columnFilters, sortConfig) => {
  const getCellValue = (row, key) => key === "flow" ? row?.currentStatus : row?.[key];
  const activeFilters = Object.entries(columnFilters || {}).filter(([, value]) => String(value || "").trim() !== "");

  const filtered = activeFilters.length
    ? rows.filter((row) => activeFilters.every(([key, filterValue]) =>
        String(getCellValue(row, key) ?? "").toLowerCase().includes(String(filterValue).trim().toLowerCase())
      ))
    : rows;

  if (!sortConfig?.key || !sortConfig?.direction) return filtered;

  const column = columns.find((item) => item.key === sortConfig.key);
  const numericType = ["amount", "price", "qty", "number", "percent"].includes(column?.type);
  const direction = sortConfig.direction === "desc" ? -1 : 1;

  return [...filtered].sort((leftRow, rightRow) => {
    const leftValue = getCellValue(leftRow, sortConfig.key);
    const rightValue = getCellValue(rightRow, sortConfig.key);

    if (numericType) return (toNumber(leftValue) - toNumber(rightValue)) * direction;
    if (column?.type === "date") {
      const leftDate = Date.parse(leftValue || "") || 0;
      const rightDate = Date.parse(rightValue || "") || 0;
      return (leftDate - rightDate) * direction;
    }

    return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), undefined, { numeric: true, sensitivity: "base" }) * direction;
  });
};

const filterRowsForSearch = (rows, searchText) => {
  const value = String(searchText || "").trim().toLowerCase();
  if (!value) return rows;
  return rows.filter((row) => Object.values(row || {}).some((cell) => String(cell ?? "").toLowerCase().includes(value)));
};

const sanitizeExportFileName = (name) => String(name ?? "")
  .trim()
  .replace(/[\\/:*?"<>|]/g, "")
  .replace(/\s+/g, " ")
  .substring(0, 120);

const getExportDateTimeStamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
};

const columnWidthsToExportWidth = (minWidth) => Number(minWidth || 100);

const exportSalesQuery = async (format, filename, columns, rows) => {
  const getValue = (row, column) => column.key === "flow" ? row?.currentStatus : row?.[column.key];
  const headers = columns.map((column) => toProperCase(column.label));
  const body = rows.map((row) => columns.map((column) => getValue(row, column) ?? ""));

  if (format === "csv") {
    downloadCsv(`${filename}.csv`, columns, rows);
    return;
  }

  if (format === "pdf") {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const documentPdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const autoTable = autoTableModule.default || autoTableModule.autoTable;
    documentPdf.text(filename.replace(/_/g, " "), 28, 24);
    autoTable(documentPdf, {
      head: [headers],
      body,
      startY: 34,
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175] },
    });
    documentPdf.save(`${filename}.pdf`);
    return;
  }

  if (format === "image") {
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-100000px;top:0;background:#fff;padding:16px;font:11px Arial;color:#1e293b;";
    const title = document.createElement("h2");
    title.textContent = filename.replace(/_/g, " ");
    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse;white-space:nowrap;";
    const headerRow = table.insertRow();
    headers.forEach((header) => {
      const cell = document.createElement("th");
      cell.textContent = header;
      cell.style.cssText = "border:1px solid #bfdbfe;background:#dbeafe;padding:5px;text-align:left;";
      headerRow.appendChild(cell);
    });
    body.forEach((row) => {
      const tableRow = table.insertRow();
      row.forEach((value) => {
        const cell = tableRow.insertCell();
        cell.textContent = String(value ?? "");
        cell.style.cssText = "border:1px solid #e2e8f0;padding:4px;";
      });
    });
    container.append(title, table);
    document.body.appendChild(container);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 1 });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      document.body.removeChild(container);
    }
  }
};

const downloadCsv = (filename, columns, rows) => {
  const headers = columns.map((column) => column.label);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(columns.map((column) => csvValue(column.key === "flow" ? row?.currentStatus : row?.[column.key])).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const csvValue = (value) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};

export default SalesTracker;
