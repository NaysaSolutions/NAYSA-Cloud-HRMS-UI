import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Minus,
  Maximize2,
  Package,
  Boxes,
  ClipboardList,
  FileBarChart2,
  Search,
  RefreshCcw,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
} from "lucide-react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useGetCurrentDayV2 } from "@/NAYSA Cloud/Global/dates";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import LocationLookupModal from "@/NAYSA Cloud/Lookup/SearchLocation.jsx";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable";

// ─── Module endpoint registry ───────────────────────────────────────────────
// Same React file, but it calls your existing module-specific Laravel routes.
const MODULE_CONFIG = {
  FG: {
    invType: "FG",
    label: "FG Stock Card",
    icon: Boxes,
    itemLookupEndpoint: "getInvLookupFG",
    itemLookupDocType: "PRFG",
    base: "/fg/inventory/stock-card",
    inventorySetupKeys: ["fginvCosting", "fgInvCosting", "FGINV_COSTING", "fginventorySetup"],
  },
  RM: {
    invType: "RM",
    label: "RM Stock Card",
    icon: Layers,
    itemLookupEndpoint: "getInvLookupRM",
    itemLookupDocType: "PRRM",
    base: "/rm/inventory/stock-card",
    inventorySetupKeys: ["rminvCosting", "rmInvCosting", "RMINV_COSTING", "rminventorySetup"],
  },
  MS: {
    invType: "MS",
    label: "MS Stock Card",
    icon: ClipboardList,
    itemLookupEndpoint: "getInvLookupMS",
    itemLookupDocType: "PRMS",
    base: "/ms/inventory/stock-card",
    inventorySetupKeys: ["msinvCosting", "msInvCosting", "MSINV_COSTING", "msinventorySetup"],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const safeArray = (value) => (Array.isArray(value) ? value : []);
const toNumber = (value) => Number(value || 0);
const sumBy = (rows, key) => safeArray(rows).reduce((total, row) => total + toNumber(row?.[key]), 0);
const fmt4 = (n) => toNumber(n).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

const formatLookupValue = (code, name) => {
  if (!code && !name) return "";
  if (!name) return code || "";
  if (!code) return name;
  return `${code} - ${name}`;
};

const getFirstDefined = (source, keys = [], fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const normalizeModuleKey = (moduleKey = "FG") => {
  const normalized = String(moduleKey || "FG").trim().toUpperCase();
  return MODULE_CONFIG[normalized] ? normalized : "FG";
};

const parseDateValue = (value) => {
  if (!value) return null;
  const parts = String(value).split("/");
  if (parts.length !== 3) return null;
  const [month, day, year] = parts.map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const formatDateFromObject = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const getStockStatusEndDate = (reportType, startDate) => {
  const parsedStartDate = parseDateValue(startDate);
  if (!parsedStartDate) return "";
  if (reportType === "Weekly") {
    const endDate = new Date(parsedStartDate);
    endDate.setDate(endDate.getDate() + 6);
    return formatDateFromObject(endDate);
  }
  if (reportType === "Monthly") {
    return formatDateFromObject(new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth() + 1, 0));
  }
  return startDate;
};

const rowsByItemCode = (value) => {
  if (!value) return {};
  if (!Array.isArray(value) && typeof value === "object") return value;
  return safeArray(value).reduce((map, item) => {
    const itemCode = item?.itemCode || item?.itemNo || item?.ITEM_CODE || "";
    if (itemCode) map[itemCode] = safeArray(item?.rows);
    return map;
  }, {});
};

const normalizeBalanceResponse = (payload) => ({
  summary: safeArray(payload?.summary),
  details: rowsByItemCode(payload?.details),
  allocated: rowsByItemCode(payload?.allocated),
});

const normalizeTableColumns = (columns = []) =>
  safeArray(columns).map((col) => ({
    ...col,
    label: col.label || col.header || col.name || col.key || "",
    renderType: col.renderType || (col.type === "amount" ? "number" : col.type === "date" ? "date" : col.type),
    roundingOff: col.roundingOff ?? (typeof col.decimals === "number" ? col.decimals : undefined),
    className: col.className || col.cellClassName || "",
  }));

const MAIN_TABS = {
  FIFO: [
    { key: "fifo", label: "FIFO Balance", icon: Package },
    { key: "stockCard", label: "Stock Card", icon: ClipboardList },
    { key: "stockStatus", label: "Stock Status", icon: FileBarChart2 },
  ],
  WAC: [
    { key: "location", label: "Location Balance", icon: Boxes },
    { key: "stockCard", label: "Stock Card", icon: ClipboardList },
    { key: "stockStatus", label: "Stock Status", icon: FileBarChart2 },
  ],
};

const STOCK_STATUS_SUBTABS = [
  { key: "summary", label: "Summary" },
  { key: "perItem", label: "Per Item" },
  { key: "perLot", label: "Per Lot / BB / QC" },
];

// ─── Small UI bits ──────────────────────────────────────────────────────────
function TabButton({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11px] sm:text-xs font-semibold rounded-t-md border ${
        active
          ? "text-blue-700 bg-white border-slate-200 border-b-white -mb-px"
          : "text-slate-500 bg-slate-50 border-transparent hover:text-blue-600"
      }`}
    >
      {Icon && <Icon size={13} />}
      {label}
    </button>
  );
}

function SubTabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-md text-[11px] font-semibold border ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarButton({ children, onClick, icon: Icon, variant = "default" }) {
  const variants = {
    default: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${variants[variant]}`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

function KpiCard({ label, value, icon: Icon, accentClass = "text-slate-700" }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:min-w-[140px]">
      {Icon && (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 ${accentClass}`}>
          <Icon size={14} />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold truncate">{label}</div>
        <div className={`text-xs sm:text-sm font-bold tabular-nums truncate ${accentClass}`}>{value}</div>
      </div>
    </div>
  );
}

function ItemInfoStrip({ itemCode, itemName, uomCode, quantity, qtyAllocated, qtyAvailable }) {
  if (!itemCode && !itemName && !uomCode) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
        <Package size={13} />
        Select an item from the summary table to view its balance details.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-stretch gap-0 rounded-md border border-blue-200 bg-blue-50 overflow-hidden">
      <div className="flex flex-col justify-center px-3 py-1.5 border-r border-blue-200 min-w-[100px] sm:px-4 sm:py-2 sm:min-w-[110px]">
        <span className="text-[9px] uppercase text-blue-500 font-bold">Item Code</span>
        <span className="text-sm font-semibold text-blue-700">{itemCode || "—"}</span>
      </div>
      <div className="flex flex-col justify-center flex-1 px-3 py-1.5 border-r border-blue-200 min-w-[140px] sm:px-4 sm:py-2 sm:min-w-[160px]">
        <span className="text-[9px] uppercase text-blue-500 font-bold">Item Name</span>
        <span className="text-sm font-semibold text-blue-700 truncate">{itemName || "—"}</span>
      </div>
      <div className="flex flex-col justify-center px-3 py-1.5 border-r border-blue-200 min-w-[55px] sm:px-4 sm:py-2 sm:min-w-[60px]">
        <span className="text-[9px] uppercase text-blue-500 font-bold">UOM</span>
        <span className="text-sm font-bold text-blue-700">{uomCode || "—"}</span>
      </div>
      {quantity != null && (
        <div className="flex flex-col justify-center px-3 py-1.5 border-r border-blue-200 min-w-[80px] sm:px-4 sm:py-2 sm:min-w-[90px]">
          <span className="text-[9px] uppercase text-blue-500 font-bold">On Hand</span>
          <span className="text-sm font-bold text-slate-700">{quantity}</span>
        </div>
      )}
      {qtyAllocated != null && (
        <div className="flex flex-col justify-center px-3 py-1.5 border-r border-blue-200 min-w-[80px] sm:px-4 sm:py-2 sm:min-w-[90px]">
          <span className="text-[9px] uppercase text-blue-500 font-bold">Allocated</span>
          <span className="text-sm font-bold text-blue-700">{qtyAllocated}</span>
        </div>
      )}
      {qtyAvailable != null && (
        <div className="flex flex-col justify-center px-3 py-1.5 min-w-[80px] sm:px-4 sm:py-2 sm:min-w-[90px]">
          <span className="text-[9px] uppercase text-emerald-600 font-bold">Available</span>
          <span className="text-sm font-bold text-emerald-700">{qtyAvailable}</span>
        </div>
      )}
    </div>
  );
}

function FilterPanel({ children, actions }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2.5 sm:p-3">
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
      {actions && <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 sm:mt-3 sm:pt-3">{actions}</div>}
    </div>
  );
}

function TablePanel({ title, badge, children }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-3.5 w-1 rounded-full bg-blue-600" />
        <span className="text-xs font-bold text-slate-700">{title}</span>
        {badge != null && (
          <span className="ml-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function CalendarField({ id, label, value, updateState, disabled = false }) {
  return (
    <div className="relative w-full">
      <div className={`flex items-stretch global-ref-textbox-ui ${disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"}`}>
        <DateFormatInput id={id} className="peer flex-grow bg-transparent border-none px-3 focus:outline-none" value={value} disabled={disabled} updateState={updateState} />
      </div>
      <label htmlFor={id} className="global-ref-floating-label">{label}</label>
    </div>
  );
}

// ─── Main inquiry body (filters + tabs + tables) ───────────────────────────
function StockCardInquiryBody({ moduleKey }) {
  const activeModuleKey = normalizeModuleKey(moduleKey);
  const config = MODULE_CONFIG[activeModuleKey] || MODULE_CONFIG.FG;
  const { companyInfo, currentUserRow, user } = useAuth();

  const defaultBranchCode = currentUserRow?.branchCode || user?.branchCode || "";
  const defaultBranchName = currentUserRow?.branchName || user?.branchName || "";
  const defaultCutoffCode = companyInfo?.cutoffCode || "";
  const defaultCutoffName = companyInfo?.cutoffName || "";
  const defaultReferenceDate = useGetCurrentDayV2();
  const defaultReportType = companyInfo?.stockStatusReportType || companyInfo?.reportType || "Daily";
  const defaultInventorySetup = String(
    getFirstDefined(companyInfo, config.inventorySetupKeys, companyInfo?.inventorySetup || companyInfo?.costingMethod || "FIFO")
  ).toUpperCase();

  const defaultBalanceFilters = useMemo(
    () => ({
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      warehouseCode: "",
      warehouseName: "",
      locationCode: "",
      locationName: "",
      itemCode: "",
      itemName: "",
      refDate: defaultReferenceDate,
    }),
    [defaultBranchCode, defaultBranchName, defaultReferenceDate]
  );

  const defaultStockCardFilters = useMemo(
    () => ({
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      itemCode: "",
      itemName: "",
      warehouseCode: "",
      warehouseName: "",
      locationCode: "",
      locationName: "",
      startingCutoff: defaultCutoffCode,
      startingCutoffName: defaultCutoffName,
      endingCutoff: defaultCutoffCode,
      endingCutoffName: defaultCutoffName,
    }),
    [defaultBranchCode, defaultBranchName, defaultCutoffCode, defaultCutoffName]
  );

  const defaultStockStatusFilters = useMemo(
    () => ({
      reportType: defaultReportType,
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      warehouseCode: "",
      warehouseName: "",
      locationCode: "",
      locationName: "",
      startDate: defaultReferenceDate,
      endDate: getStockStatusEndDate(defaultReportType, defaultReferenceDate),
    }),
    [defaultBranchCode, defaultBranchName, defaultReferenceDate, defaultReportType]
  );

  const [inventorySetup, setInventorySetup] = useState(defaultInventorySetup);
  const [activeMainTab, setActiveMainTab] = useState("fifo");
  const [stockStatusTab, setStockStatusTab] = useState("summary");

  const [balanceFilters, setBalanceFilters] = useState(defaultBalanceFilters);
  const [stockCardFilters, setStockCardFilters] = useState(defaultStockCardFilters);
  const [stockStatusFilters, setStockStatusFilters] = useState(defaultStockStatusFilters);

  const [selectedBalanceItem, setSelectedBalanceItem] = useState(null);
  const [shouldLoadBalance, setShouldLoadBalance] = useState(0);
  const [shouldLoadStockCard, setShouldLoadStockCard] = useState(0);
  const [shouldLoadStockStatus, setShouldLoadStockStatus] = useState(0);
  const [lookupState, setLookupState] = useState({ type: "", scope: "", cutoffTarget: "" });

  useEffect(() => {
    setInventorySetup(defaultInventorySetup || "FIFO");
    setActiveMainTab((defaultInventorySetup || "FIFO") === "WAC" ? "location" : "fifo");
    setBalanceFilters(defaultBalanceFilters);
    setStockCardFilters(defaultStockCardFilters);
    setStockStatusFilters(defaultStockStatusFilters);
    setSelectedBalanceItem(null);
    setShouldLoadBalance(0);
    setShouldLoadStockCard(0);
    setShouldLoadStockStatus(0);
    setLookupState({ type: "", scope: "", cutoffTarget: "" });
    // Reset only when switching module, not when minimizing/restoring the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleKey]);

  const openLookup = (type, scope, cutoffTarget = "") => setLookupState({ type, scope, cutoffTarget });
  const closeLookup = () => setLookupState({ type: "", scope: "", cutoffTarget: "" });

  const patchFiltersByScope = (scope, patch) => {
    if (scope === "balance") return setBalanceFilters((prev) => ({ ...prev, ...patch }));
    if (scope === "stockCard") return setStockCardFilters((prev) => ({ ...prev, ...patch }));
    if (scope === "stockStatus") return setStockStatusFilters((prev) => ({ ...prev, ...patch }));
  };

  const getFiltersByScope = (scope) => {
    if (scope === "balance") return balanceFilters;
    if (scope === "stockCard") return stockCardFilters;
    if (scope === "stockStatus") return stockStatusFilters;
    return {};
  };

  useEffect(() => {
    if (defaultInventorySetup && !inventorySetup) setInventorySetup(defaultInventorySetup);
  }, [defaultInventorySetup, inventorySetup]);

  useEffect(() => {
    setActiveMainTab(inventorySetup === "WAC" ? "location" : "fifo");
  }, [inventorySetup]);

  // ── Endpoints (module-aware via MODULE_CONFIG.base) ─────────────────────
  const setupQuery = useQuery({
    queryKey: [activeModuleKey, "stock-card-setup"],
    queryFn: async () => {
      const response = await apiClient.get(`${config.base}/setup`);
      return response?.data?.data || { inventorySetup: defaultInventorySetup };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    cacheTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (setupQuery.data?.inventorySetup) setInventorySetup(setupQuery.data.inventorySetup);
  }, [setupQuery.data]);

  const balanceEndpoint = inventorySetup === "FIFO" ? `${config.base}/fifo-balance` : `${config.base}/location-balance`;

  const balanceRequestParams = useMemo(
    () => ({
      branchCode: balanceFilters.branchCode,
      whouseCode: balanceFilters.warehouseCode,
      locCode: balanceFilters.locationCode,
      itemNo: balanceFilters.itemCode,
      dateTo: balanceFilters.refDate,
    }),
    [balanceFilters]
  );

  const stockCardRequestParams = useMemo(
    () => ({
      branchCode: stockCardFilters.branchCode,
      itemNo: stockCardFilters.itemCode,
      whouseCode: stockCardFilters.warehouseCode,
      locCode: stockCardFilters.locationCode,
      cutoffFrom: stockCardFilters.startingCutoff,
      cutoffTo: stockCardFilters.endingCutoff,
    }),
    [stockCardFilters]
  );

  const stockStatusRequestParams = useMemo(
    () => ({
      reportType: stockStatusFilters.reportType,
      branchCode: stockStatusFilters.branchCode,
      whouseCode: stockStatusFilters.warehouseCode,
      locCode: stockStatusFilters.locationCode,
      dateFrom: stockStatusFilters.startDate,
      dateTo: stockStatusFilters.endDate,
    }),
    [stockStatusFilters]
  );

  const balanceQuery = useQuery({
    queryKey: [activeModuleKey, inventorySetup, shouldLoadBalance, balanceFilters],
    enabled: shouldLoadBalance > 0,
    queryFn: async () => {
      const response = await apiClient.get(balanceEndpoint, { params: balanceRequestParams });
      return normalizeBalanceResponse(response?.data?.data);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    cacheTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const stockCardQuery = useQuery({
    queryKey: [activeModuleKey, "stock-card-movement", shouldLoadStockCard, stockCardFilters],
    enabled: shouldLoadStockCard > 0,
    queryFn: async () => {
      const response = await apiClient.get(`${config.base}/stock-card`, { params: stockCardRequestParams });
      return response?.data?.data || { rows: [], totals: {} };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    cacheTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const stockStatusQuery = useQuery({
    queryKey: [activeModuleKey, "stock-status", shouldLoadStockStatus, stockStatusFilters],
    enabled: shouldLoadStockStatus > 0,
    queryFn: async () => {
      const response = await apiClient.get(`${config.base}/stock-status`, { params: stockStatusRequestParams });
      return response?.data?.data || { summary: [], perItem: [], perLot: [] };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    cacheTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const balanceSummaryRows = safeArray(balanceQuery.data?.summary);
  const balanceDetailsMap = balanceQuery.data?.details || {};
  const balanceAllocatedMap = balanceQuery.data?.allocated || {};

  useEffect(() => {
    const firstRow = balanceSummaryRows[0] || null;
    const selectedCode = selectedBalanceItem?.itemCode || "";
    if (!selectedCode) {
      if (firstRow?.itemCode) setSelectedBalanceItem(firstRow);
      return;
    }
    const matchedRow = balanceSummaryRows.find((row) => row.itemCode === selectedCode) || null;
    if (!matchedRow && firstRow) setSelectedBalanceItem(firstRow);
    else if (matchedRow && matchedRow !== selectedBalanceItem) setSelectedBalanceItem(matchedRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceSummaryRows, selectedBalanceItem?.itemCode]);

  const selectedItemCode = selectedBalanceItem?.itemCode || "";
  const selectedDetailRows = safeArray(balanceDetailsMap[selectedItemCode]);
  const selectedAllocatedRows = safeArray(balanceAllocatedMap[selectedItemCode]);

  const stockCardRows = safeArray(stockCardQuery.data?.rows);
  const stockCardTotals = useMemo(() => {
    const apiTotals = stockCardQuery.data?.totals || {};
    return {
      beginningBalance: toNumber(apiTotals.beginningBalance),
      totalInbound: apiTotals.totalInbound !== undefined ? toNumber(apiTotals.totalInbound) : sumBy(stockCardRows, "qtyIn"),
      totalOutbound: apiTotals.totalOutbound !== undefined ? toNumber(apiTotals.totalOutbound) : sumBy(stockCardRows, "qtyOut"),
      endingBalance: apiTotals.endingBalance !== undefined ? toNumber(apiTotals.endingBalance) : toNumber(stockCardRows[stockCardRows.length - 1]?.runBal),
    };
  }, [stockCardQuery.data, stockCardRows]);

  const stockStatusRows = safeArray(stockStatusQuery.data?.[stockStatusTab]);

  // ── Columns (trimmed vs. full page version, same keys) ──────────────────
  const balanceSummaryColumns = useMemo(
    () => [
      { key: "itemCode", header: "Item Code", size: 120, width: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 260, width: 260, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 80, width: 80, cellClassName: "text-center text-[11px]" },
      { key: "quantity", header: "Quantity", size: 100, width: 100, cellClassName: "text-right text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyAllocated", header: "Allocated", size: 100, width: 100, cellClassName: "text-right text-blue-700 text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyAvailable", header: "Available", size: 100, width: 100, cellClassName: "text-right text-emerald-700 font-bold text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );

  const fifoDetailColumns = useMemo(
    () => [
      { key: "rrDate", header: "RR Date", size: 90, width: 90, cellClassName: "text-center text-[11px]", type: "date" },
      { key: "rrNo", header: "RR No", size: 130, width: 130, cellClassName: "text-[11px]" },
      { key: "unitCost", header: "Unit Cost", size: 110, width: 110, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "qtyIn", header: "Qty In", size: 90, width: 90, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 90, width: 90, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 90, width: 90, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "whouseCode", header: "Warehouse", size: 100, width: 100, cellClassName: "text-left text-[11px]" },
      { key: "locCode", header: "Location", size: 100, width: 100, cellClassName: "text-left text-[11px]" },
      { key: "lotNo", header: "Lot No", size: 100, width: 100, cellClassName: "text-left text-[11px]" },
    ],
    []
  );

  const locationDetailColumns = useMemo(
    () => [
      { key: "whouseCode", header: "Warehouse", size: 100, width: 100, cellClassName: "text-left text-[11px]" },
      { key: "locCode", header: "Location", size: 100, width: 100, cellClassName: "text-left text-[11px]" },
      { key: "lotNo", header: "Lot No", size: 100, width: 100, cellClassName: "text-left text-[11px]" },
      { key: "qtyIn", header: "Qty In", size: 90, width: 90, cellClassName: "text-right text-emerald-700 text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 90, width: 90, cellClassName: "text-right text-rose-600 text-[11px]", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 90, width: 90, cellClassName: "text-right font-bold text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );

  const allocationColumns = useMemo(
    () => [
      { key: "docType", header: "Doc Type", size: 90, width: 90, cellClassName: "text-[11px]" },
      { key: "docNo", header: "Doc No", size: 100, width: 100, cellClassName: "text-[11px]" },
      { key: "docDate", header: "Doc Date", size: 90, width: 90, cellClassName: "text-left text-[11px]", type: "date" },
      { key: "qtyPicked", header: "Qty Picked", size: 110, width: 110, cellClassName: "text-right font-semibold text-blue-700 text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );

  const stockCardColumns = useMemo(() => {
    const isWacCosting = String(inventorySetup || "FIFO").toUpperCase() === "WAC";
    return [
      { key: "cutoff", header: "Cut-Off", size: 100 },
      { key: "docType", header: "Type", size: 90 },
      { key: "docNo", header: "Doc No", size: 110, cellClassName: "font-mono text-xs" },
      { key: "docDate", header: "Doc Date", size: 110, type: "date" },
      ...(!isWacCosting ? [{ key: "rrNo", header: "RR No", size: 130, cellClassName: "font-mono text-xs" }] : []),
      { key: "particular", header: "Particular", size: 220 },
      { key: "itemNo", header: "Item No", size: 110 },
      { key: "warehouse", header: "Warehouse", size: 110 },
      { key: "location", header: "Location", size: 110 },
      { key: "qtyIn", header: "Qty In", size: 100, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "runBal", header: "Run Bal", size: 100, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "unitCost", header: "Unit Cost", size: 110, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "amount", header: "Amount", size: 120, cellClassName: "text-right font-semibold", type: "amount", decimals: 2 },
      ...(isWacCosting ? [{ key: "wac", header: "WAC", size: 110, cellClassName: "text-right", type: "amount", decimals: 6 }] : []),
    ];
  }, [inventorySetup]);

  const stockStatusColumnsMap = useMemo(
    () => ({
      summary: [
        { key: "itemNo", header: "Item No", size: 130, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 240 },
        { key: "uom", header: "UOM", size: 70, cellClassName: "text-center" },
        { key: "beginningBalance", header: "Beg. Balance", size: 120, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 100, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 100, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 120, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "amount", header: "Amount", size: 120, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
      perItem: [
        { key: "itemNo", header: "Item No", size: 130, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 240 },
        { key: "warehouse", header: "Warehouse", size: 110 },
        { key: "location", header: "Location", size: 110 },
        { key: "beginningBalance", header: "Beg. Balance", size: 120, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 100, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 100, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 120, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
      ],
      perLot: [
        { key: "itemNo", header: "Item No", size: 130, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 240 },
        { key: "lotNo", header: "Lot No", size: 110 },
        { key: "bbDate", header: "BB Date", size: 100, type: "date" },
        { key: "qcStat", header: "QC Status", size: 100 },
        { key: "balance", header: "Balance", size: 110, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "amount", header: "Amount", size: 120, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
    }),
    []
  );

  const balanceSummaryColumnsForTable = useMemo(() => normalizeTableColumns(balanceSummaryColumns), [balanceSummaryColumns]);
  const fifoDetailColumnsForTable = useMemo(() => normalizeTableColumns(fifoDetailColumns), [fifoDetailColumns]);
  const locationDetailColumnsForTable = useMemo(() => normalizeTableColumns(locationDetailColumns), [locationDetailColumns]);
  const allocationColumnsForTable = useMemo(() => normalizeTableColumns(allocationColumns), [allocationColumns]);
  const stockCardColumnsForTable = useMemo(() => normalizeTableColumns(stockCardColumns), [stockCardColumns]);
  const stockStatusColumnsMapForTable = useMemo(
    () => ({
      summary: normalizeTableColumns(stockStatusColumnsMap.summary),
      perItem: normalizeTableColumns(stockStatusColumnsMap.perItem),
      perLot: normalizeTableColumns(stockStatusColumnsMap.perLot),
    }),
    [stockStatusColumnsMap]
  );

  const mainTabs = MAIN_TABS[inventorySetup] || MAIN_TABS.FIFO;

  const handleBalanceRowClick = (row) => setSelectedBalanceItem(row);

  // ── Lookup close handlers ────────────────────────────────────────────────
  const handleBranchLookupClose = (row) => {
    if (row) {
      patchFiltersByScope(lookupState.scope, {
        branchCode: row.branchCode || row.BranchCode || row.BRANCH_CODE || "",
        branchName: row.branchName || row.BranchName || row.BRANCH_NAME || "",
        warehouseCode: "",
        warehouseName: "",
        locationCode: "",
        locationName: "",
      });
    }
    closeLookup();
  };

  const handleItemLookupClose = (payload) => {
    const item = Array.isArray(payload?.records) ? payload.records[0] : payload?.records || payload;
    if (item) {
      patchFiltersByScope(lookupState.scope, {
        itemCode: item.itemCode || item.ItemCode || item.ITEM_CODE || "",
        itemName: item.itemName || item.ItemName || item.ITEM_NAME || item.itemDescription || item.description || "",
      });
    }
    closeLookup();
  };

  const handleWarehouseLookupClose = (row) => {
    if (row) {
      patchFiltersByScope(lookupState.scope, {
        warehouseCode: row.whCode || row.warehouseCode || row.WH_CODE || "",
        warehouseName: row.whName || row.warehouseName || row.WH_NAME || "",
        locationCode: "",
        locationName: "",
      });
    }
    closeLookup();
  };

  const handleLocationLookupClose = (row) => {
    if (row) {
      patchFiltersByScope(lookupState.scope, {
        locationCode: row.locCode || row.locationCode || row.LOC_CODE || "",
        locationName: row.locName || row.locationName || row.LOC_NAME || "",
      });
    }
    closeLookup();
  };

  const handleCutoffLookupClose = (row) => {
    if (row && lookupState.cutoffTarget) {
      const cutoffCode = row.cutoffCode || row.cutOffCode || row.CutoffCode || "";
      const cutoffName = row.cutoffName || row.cutOffName || row.CutoffName || "";
      const cutoffNameTarget = lookupState.cutoffTarget === "startingCutoff" ? "startingCutoffName" : "endingCutoffName";
      patchFiltersByScope(lookupState.scope, { [lookupState.cutoffTarget]: cutoffCode, [cutoffNameTarget]: cutoffName });
    }
    closeLookup();
  };

  // ── Tab renders ───────────────────────────────────────────────────────────
  const renderBalanceTab = () => {
    const detailColumns = inventorySetup === "FIFO" ? fifoDetailColumnsForTable : locationDetailColumnsForTable;
    const tabLabel = inventorySetup === "FIFO" ? "FIFO Balance" : "Location Balance";

    return (
      <div className="space-y-2">
        <FilterPanel
          actions={
            <>
              <ToolbarButton variant="primary" icon={Search} onClick={() => { setSelectedBalanceItem(null); setShouldLoadBalance((p) => p + 1); }}>
                Find
              </ToolbarButton>
              <ToolbarButton icon={RefreshCcw} onClick={() => { setBalanceFilters(defaultBalanceFilters); setSelectedBalanceItem(null); }}>
                Reset
              </ToolbarButton>
            </>
          }
        >
          <FieldRenderer type="lookup" label="Branch" name="branchCode" value={formatLookupValue(balanceFilters.branchCode, balanceFilters.branchName)} onLookup={() => openLookup("branch", "balance")} editableLookup />
          <FieldRenderer type="lookup" label="Warehouse" name="warehouseCode" value={formatLookupValue(balanceFilters.warehouseCode, balanceFilters.warehouseName)} onLookup={() => openLookup("warehouse", "balance")} editableLookup />
          <FieldRenderer type="lookup" label="Item" name="itemCode" value={formatLookupValue(balanceFilters.itemCode, balanceFilters.itemName)} onLookup={() => openLookup("item", "balance")} editableLookup />
        </FilterPanel>

        <TablePanel title={tabLabel} badge={balanceSummaryRows.length || undefined}>
          <SearchGlobalReferenceTable
            columns={balanceSummaryColumnsForTable}
            data={balanceSummaryRows}
            isLoading={balanceQuery.isLoading}
            isFetching={balanceQuery.isFetching}
            onRowClick={handleBalanceRowClick}
            selectedRow={selectedBalanceItem}
            showPagination={false}
            autoFillGrid="true"
          />
        </TablePanel>

        <ItemInfoStrip
          itemCode={selectedBalanceItem?.itemCode}
          itemName={selectedBalanceItem?.itemName}
          uomCode={selectedBalanceItem?.uomCode}
          quantity={selectedBalanceItem?.quantity != null ? fmt4(selectedBalanceItem.quantity) : undefined}
          qtyAllocated={selectedBalanceItem?.qtyAllocated != null ? fmt4(selectedBalanceItem.qtyAllocated) : undefined}
          qtyAvailable={selectedBalanceItem?.qtyAvailable != null ? fmt4(selectedBalanceItem.qtyAvailable) : undefined}
        />

        <TablePanel title="Balance Details" badge={selectedDetailRows.length || undefined}>
          <SearchGlobalReferenceTable columns={detailColumns} data={selectedDetailRows} isLoading={balanceQuery.isLoading} isFetching={balanceQuery.isFetching} showPagination={false} autoFillGrid="true" />
        </TablePanel>

        <TablePanel title="Allocation Details" badge={selectedAllocatedRows.length || undefined}>
          <SearchGlobalReferenceTable columns={allocationColumnsForTable} data={selectedAllocatedRows} isLoading={balanceQuery.isLoading} isFetching={balanceQuery.isFetching} showPagination={false} autoFillGrid="true" />
        </TablePanel>
      </div>
    );
  };

  const renderStockCardTab = () => (
    <div className="space-y-2">
      <FilterPanel>
        <FieldRenderer type="lookup" label="Branch" name="branchCode" value={formatLookupValue(stockCardFilters.branchCode, stockCardFilters.branchName)} onLookup={() => openLookup("branch", "stockCard")} editableLookup />
        <FieldRenderer type="lookup" label="Warehouse" name="warehouseCode" value={formatLookupValue(stockCardFilters.warehouseCode, stockCardFilters.warehouseName)} onLookup={() => openLookup("warehouse", "stockCard")} editableLookup />
        <FieldRenderer type="lookup" label="Item" name="itemCode" value={formatLookupValue(stockCardFilters.itemCode, stockCardFilters.itemName)} onLookup={() => openLookup("item", "stockCard")} editableLookup />
        <FieldRenderer type="lookup" label="Start Cut-Off" name="startingCutoff" value={formatLookupValue(stockCardFilters.startingCutoff, stockCardFilters.startingCutoffName)} onLookup={() => openLookup("cutoff", "stockCard", "startingCutoff")} editableLookup />
        <FieldRenderer type="lookup" label="End Cut-Off" name="endingCutoff" value={formatLookupValue(stockCardFilters.endingCutoff, stockCardFilters.endingCutoffName)} onLookup={() => openLookup("cutoff", "stockCard", "endingCutoff")} editableLookup />
      </FilterPanel>

      <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-end gap-2">
          <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockCard((p) => p + 1)}>
            Find
          </ToolbarButton>
          <ToolbarButton icon={RefreshCcw} onClick={() => setStockCardFilters(defaultStockCardFilters)}>
            Reset
          </ToolbarButton>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:flex-wrap">
          <KpiCard label="Beginning" value={fmt4(stockCardTotals.beginningBalance)} icon={Layers} />
          <KpiCard label="Total In" value={fmt4(stockCardTotals.totalInbound)} icon={TrendingUp} accentClass="text-emerald-700" />
          <KpiCard label="Total Out" value={fmt4(stockCardTotals.totalOutbound)} icon={TrendingDown} accentClass="text-rose-600" />
          <KpiCard label="Ending" value={fmt4(stockCardTotals.endingBalance)} icon={ArrowLeftRight} accentClass="text-blue-700" />
        </div>
      </div>

      <TablePanel title="Stock Card Movement" badge={stockCardRows.length || undefined}>
        <SearchGlobalReportTable columns={stockCardColumnsForTable} data={stockCardRows} isLoading={stockCardQuery.isLoading} isFetching={stockCardQuery.isFetching} tableHeight="1200px" />
      </TablePanel>
    </div>
  );

  const renderStockStatusTab = () => (
    <div className="space-y-2">
      <FilterPanel
        actions={
          <>
            <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockStatus((p) => p + 1)}>
              Load
            </ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={() => setStockStatusFilters(defaultStockStatusFilters)}>
              Reset
            </ToolbarButton>
          </>
        }
      >
        <FieldRenderer
          type="select"
          label="Report Type"
          name="reportType"
          value={stockStatusFilters.reportType}
          options={[
            { value: "Daily", label: "Daily" },
            { value: "Weekly", label: "Weekly" },
            { value: "Monthly", label: "Monthly" },
          ]}
          onChange={(value) => setStockStatusFilters((prev) => ({ ...prev, reportType: value, endDate: getStockStatusEndDate(value, prev.startDate) }))}
        />
        <FieldRenderer type="lookup" label="Branch" name="branchCode" value={formatLookupValue(stockStatusFilters.branchCode, stockStatusFilters.branchName)} onLookup={() => openLookup("branch", "stockStatus")} editableLookup />
        <FieldRenderer type="lookup" label="Warehouse" name="warehouseCode" value={formatLookupValue(stockStatusFilters.warehouseCode, stockStatusFilters.warehouseName)} onLookup={() => openLookup("warehouse", "stockStatus")} editableLookup />
        <CalendarField
          id="stockStatusStartDate"
          label="Start Date"
          value={stockStatusFilters.startDate}
          updateState={(patch) => setStockStatusFilters((prev) => ({ ...prev, ...patch, endDate: getStockStatusEndDate(prev.reportType, patch.startDate ?? prev.startDate) }))}
        />
        <CalendarField id="stockStatusEndDate" label="End Date" value={stockStatusFilters.endDate} disabled updateState={(patch) => setStockStatusFilters((prev) => ({ ...prev, ...patch }))} />
      </FilterPanel>

      <div className="flex items-center gap-2 overflow-x-auto px-1 py-0.5">
        {STOCK_STATUS_SUBTABS.map((tab) => (
          <SubTabButton key={tab.key} active={stockStatusTab === tab.key} label={tab.label} onClick={() => setStockStatusTab(tab.key)} />
        ))}
      </div>

      <TablePanel title={STOCK_STATUS_SUBTABS.find((t) => t.key === stockStatusTab)?.label || "Stock Status"} badge={stockStatusRows.length || undefined}>
        <SearchGlobalReportTable columns={stockStatusColumnsMapForTable[stockStatusTab] || []} data={stockStatusRows} isLoading={stockStatusQuery.isLoading} isFetching={stockStatusQuery.isFetching} />
      </TablePanel>
    </div>
  );

  const activeLoading = setupQuery.isLoading || balanceQuery.isFetching || stockCardQuery.isFetching || stockStatusQuery.isFetching;
  const activeLookupFilters = getFiltersByScope(lookupState.scope);
  const warehouseLookupFilter = activeLookupFilters?.branchCode ? `ByBC${activeLookupFilters.branchCode}` : "ActiveAll";
  const locationLookupWarehouse = activeLookupFilters?.warehouseCode || "";

  return (
    <div className="space-y-2">
      {activeLoading && <LoadingSpinner />}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-1 scrollbar-thin">{mainTabs.map((tab) => (
          <TabButton key={tab.key} active={activeMainTab === tab.key} label={tab.label} icon={tab.icon} onClick={() => setActiveMainTab(tab.key)} />
        ))}
      </div>

      <div className="p-1">
        {(activeMainTab === "fifo" || activeMainTab === "location") && renderBalanceTab()}
        {activeMainTab === "stockCard" && renderStockCardTab()}
        {activeMainTab === "stockStatus" && renderStockStatusTab()}
      </div>

      {lookupState.type === "branch" && <BranchLookupModal isOpen onClose={handleBranchLookupClose} title="Search Branch" withPagination />}
      {lookupState.type === "item" && (
        <ItemMastLookupModal
          isOpen
          endpoint={config.itemLookupEndpoint}
          onClose={handleItemLookupClose}
          onCancel={closeLookup}
          enableMultiSelect={false}
          docType={config.itemLookupDocType}
        />
      )}
      {lookupState.type === "warehouse" && (
        <WarehouseLookupModal
          isOpen
          onClose={handleWarehouseLookupClose}
          filter={warehouseLookupFilter}
          branchCode={activeLookupFilters?.branchCode || ""}
          invType={activeModule}
        />
      )}
      {lookupState.type === "location" && (
        <LocationLookupModal isOpen onClose={handleLocationLookupClose} filter={locationLookupWarehouse ? `ByWH${locationLookupWarehouse}` : "ActiveAll"} whCode={locationLookupWarehouse} />
      )}
      {lookupState.type === "cutoff" && <CutoffLookupModal isOpen onClose={handleCutoffLookupClose} title="Search Cut-Off" withPagination />}
    </div>
  );
}

// ─── Modal shell (minimizable, keeps loaded queries mounted) ───────────────
const SearchStockCard = ({ isOpen, module = "FG", onClose }) => {
  const activeModule = normalizeModuleKey(module);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (isOpen) setIsMinimized(false);
  }, [isOpen, activeModule]);

  useEffect(() => {
    if (!isOpen || isMinimized) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMinimized, onClose]);

  if (!isOpen) return null;

  const config = MODULE_CONFIG[activeModule] || MODULE_CONFIG.FG;
  const Icon = config.icon;

  return (
    <>
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-lg hover:border-blue-300 hover:shadow-xl"
            title={`Restore ${config.label}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
              <Icon size={13} />
            </span>
            <span className="text-xs font-semibold text-slate-700">{config.label}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-blue-600">
              <Maximize2 size={11} />
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
                onClose?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setIsMinimized(false);
                  onClose?.();
                }
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            >
              <X size={12} />
            </span>
          </button>
        </div>
      )}

      <div
        className={`${isMinimized ? "pointer-events-none invisible opacity-0" : "visible opacity-100"} fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 transition-opacity sm:p-6`}
        aria-hidden={isMinimized}
        onMouseDown={(e) => {
          if (!isMinimized && e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="flex h-full max-h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-none border-0 border-slate-200 bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-lg sm:border">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <Icon size={14} />
            </span>
            <h2 className="flex-1 truncate text-xs font-bold text-slate-700 sm:text-sm">{config.label} Inquiry</h2>

            <button type="button" onClick={() => setIsMinimized(true)} title="Minimize" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700">
              <Minus size={15} />
            </button>
            <button type="button" onClick={() => onClose?.()} title="Close" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-100 hover:text-rose-600">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50 px-2 py-2 sm:px-3">
            <StockCardInquiryBody moduleKey={activeModule} />
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchStockCard;
