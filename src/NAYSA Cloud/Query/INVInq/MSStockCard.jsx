import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ClipboardList,
  FileBarChart2,
  Package,
  RefreshCcw,
  Search,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Layers,
  Eye,
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
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const formatDateValue = (value) => value || "";
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
    return formatDateFromObject(
      new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth() + 1, 0)
    );
  }

  return startDate;
};
const formatLookupValue = (code, name) => {
  if (!code && !name) return "";
  if (!name) return code || "";
  if (!code) return name;
  return `${code} - ${name}`;
};
const toNumber = (value) => Number(value || 0);
const sumBy = (rows, key) =>
  safeArray(rows).reduce((total, row) => total + toNumber(row?.[key]), 0);

const normalizeTableColumns = (columns = []) =>
  safeArray(columns).map((col) => ({
    ...col,
    label: col.label || col.header || col.name || col.key || "",
    renderType:
      col.renderType ||
      (col.type === "amount" ? "number" : col.type === "date" ? "date" : col.type),
    roundingOff:
      col.roundingOff ??
      (typeof col.decimals === "number" ? col.decimals : undefined),
    className: col.className || col.cellClassName || "",
  }));

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

// ─── Tab Button ──────────────────────────────────────────────────────────────
function TabButton({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-5 py-3 text-[13px] font-semibold transition-all duration-200 mt-2 rounded-t-lg focus:outline-none ${
        active
          ? "text-blue-700 dark:text-blue-400 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/60 dark:to-slate-900 shadow-[inset_0_2px_0_0_#2563eb] border border-b-0 border-slate-200 dark:border-slate-700"
          : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
      }`}
      style={active ? { marginBottom: "-1px", zIndex: 1 } : {}}
    >
      {Icon && (
        <span className={`flex items-center justify-center w-5 h-5 rounded transition-colors duration-150 ${
          active
            ? "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400"
            : "text-slate-400 dark:text-slate-500"
        }`}>
          <Icon size={13} />
        </span>
      )}
      <span>{label}</span>
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
      )}
    </button>
  );
}

// ─── Sub Tab Button ───────────────────────────────────────────────────────────
function SubTabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-150 border ${
        active
          ? "bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-blue-600 dark:hover:text-blue-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarButton({ children, onClick, icon: Icon, variant = "default", className = "" }) {
  const variants = {
    default: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-100 shadow-sm",
    primary: "border-blue-500 dark:border-blue-600 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:border-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900/40",
    ghost: "border-transparent bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={13} />}
      <span>{children}</span>
    </button>
  );
}


// ─── Header Action Button (Bank Recon style) ────────────────────────────────
function HeaderActionButton({ children, onClick, icon: Icon, disabled = false, title = "" }) {
  return (
    <button
      type="button"
      title={title || children}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 rounded-md border border-blue-600 bg-blue-600 px-2 py-1.5 text-[10px] font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65 lg:h-8 lg:flex-row lg:gap-0 lg:px-3 lg:py-2 lg:text-xs"
    >
      {Icon && <Icon size={13} className="lg:mr-2" />}
      {children && (
        <>
          <span className="block text-[8px] leading-none lg:hidden">{children}</span>
          <span className="hidden lg:inline">{children}</span>
        </>
      )}
    </button>
  );
}

function HeaderStatusCard({ label, value }) {
  return (
    <div className="flex h-10 min-w-[112px] flex-col items-center justify-center rounded-md bg-blue-50 px-3 py-1 text-center shadow-sm dark:bg-blue-950/40">
      <span className="text-xs font-bold leading-tight text-slate-600 dark:text-slate-300">{label}</span>
      <span className="text-[16px] font-extrabold leading-tight text-blue-700 dark:text-blue-300">{value || "—"}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accentClass = "text-slate-700", bgClass = "bg-white" }) {
  const iconStyles = {
    "text-emerald-700": "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
    "text-rose-600":    "bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400",
    "text-blue-700":    "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
  };
  const iconClass = iconStyles[accentClass] || "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400";
  const valueClass = accentClass === "text-emerald-700" ? "text-emerald-700 dark:text-emerald-400"
    : accentClass === "text-rose-600" ? "text-rose-600 dark:text-rose-400"
    : accentClass === "text-blue-700" ? "text-blue-700 dark:text-blue-400"
    : "text-slate-700 dark:text-slate-200";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 min-w-[170px] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group">
      {Icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${iconClass}`}>
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold truncate leading-tight">{label}</div>
        <div className={`text-sm font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center gap-2.5 mb-2 px-1">
      <span className="h-4 w-1 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0" />
      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">{title}</span>
      {badge != null && (
        <span className="ml-1 rounded-md bg-blue-600 dark:bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Item Info Strip ──────────────────────────────────────────────────────────
function ItemInfoStrip({ itemCode, itemName, uomCode, quantity, qtyAllocated, qtyAvailable }) {
  if (!itemCode && !itemName && !uomCode) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3.5 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-200/60 dark:bg-slate-700">
          <Package size={13} className="text-slate-400 dark:text-slate-500" />
        </div>
        <span>Select an item from the summary table to view its balance details.</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-stretch gap-0 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 overflow-hidden shadow-sm">
      <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[120px]">
        <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">Item Code</span>
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate mt-0.5">{itemCode || "—"}</span>
      </div>
      <div className="flex flex-col justify-center flex-1 px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[180px]">
        <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">Item Name</span>
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate mt-0.5">{itemName || "—"}</span>
      </div>
      <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[70px]">
        <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">UOM</span>
        <span className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-0.5">{uomCode || "—"}</span>
      </div>
      {quantity != null && (
        <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">On Hand</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums mt-0.5">{quantity}</span>
        </div>
      )}
      {qtyAllocated != null && (
        <div className="flex flex-col justify-center px-5 py-3 border-r border-blue-200 dark:border-blue-900/60 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-widest text-blue-500 dark:text-blue-400 font-bold">Allocated</span>
          <span className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums mt-0.5">{qtyAllocated}</span>
        </div>
      )}
      {qtyAvailable != null && (
        <div className="flex flex-col justify-center px-5 py-3 min-w-[100px]">
          <span className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-500 font-bold">Available</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">{qtyAvailable}</span>
        </div>
      )}
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ children, actions }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors duration-150 focus:outline-none"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 dark:bg-blue-700 shrink-0">
          <Search size={10} className="text-white" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-1 text-left">Filter Criteria</span>
        <span className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      {!collapsed && (
        <div className="p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {children}
          </div>
          {actions && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Table Panel ──────────────────────────────────────────────────────────────
function CalendarField({ id, label, name, value, updateState, disabled = false }) {
  return (
    <div className="relative w-full">
      <div className={`flex items-stretch global-ref-textbox-ui ${disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"}`}>
        <DateFormatInput
          id={id}
          name={name}
          className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
          value={value}
          disabled={disabled}
          updateState={updateState}
        />
      </div>
      <label htmlFor={id} className="global-ref-floating-label">{label}</label>
    </div>
  );
}

function TablePanel({ title, badge, children, toolbar }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 px-2 py-2">
        <SectionHeader title={title} badge={badge} />
        {toolbar && <div className="ml-auto flex items-center gap-1.5 pr-1">{toolbar}</div>}
      </div>
      <div className="">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function MSStockCardQuery() {
  const { companyInfo, currentUserRow, user } = useAuth();
  const defaultBranchCode =
    currentUserRow?.branchCode ||
    user?.branchCode ||
    "";
  const defaultBranchName =
    currentUserRow?.branchName ||
    user?.branchName ||
    "";
  const defaultCutoffCode =
    companyInfo?.cutoffCode ||
    "";
  const defaultCutoffName =
    companyInfo?.cutoffName ||
    "";
  const defaultReferenceDate = useGetCurrentDayV2();
  const defaultReportType = companyInfo?.stockStatusReportType || companyInfo?.reportType || "Daily";
  const defaultInventorySetup = companyInfo?.msinvCosting || "";

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
  const [lookupState, setLookupState] = useState({
    type: "",
    scope: "",
    cutoffTarget: "",
  });

  const handleBalanceRowClick = React.useCallback((row) => {
    setSelectedBalanceItem(row);
  }, []);

  const handleViewStockCardFromBalance = React.useCallback((row) => {
    const itemCode = row?.itemCode || row?.itemNo || "";
    if (!itemCode) return;

    setSelectedBalanceItem(row);
    setStockCardFilters((prev) => ({
      ...prev,
      branchCode: balanceFilters.branchCode || prev.branchCode,
      branchName: balanceFilters.branchName || prev.branchName,
      warehouseCode: balanceFilters.warehouseCode || prev.warehouseCode,
      warehouseName: balanceFilters.warehouseName || prev.warehouseName,
      locationCode: balanceFilters.locationCode || prev.locationCode,
      locationName: balanceFilters.locationName || prev.locationName,
      itemCode,
      itemName: row?.itemName || row?.itemDescription || prev.itemName || "",
    }));
    setActiveMainTab("stockCard");
    setShouldLoadStockCard((prev) => prev + 1);
  }, [balanceFilters]);

  useEffect(() => {
    setBalanceFilters((prev) => ({
      ...prev,
      branchCode: prev.branchCode || defaultBalanceFilters.branchCode,
      branchName: prev.branchName || defaultBalanceFilters.branchName,
      refDate: prev.refDate || defaultBalanceFilters.refDate,
    }));
    setStockCardFilters((prev) => ({
      ...prev,
      branchCode: prev.branchCode || defaultStockCardFilters.branchCode,
      branchName: prev.branchName || defaultStockCardFilters.branchName,
      startingCutoff: prev.startingCutoff || defaultStockCardFilters.startingCutoff,
      startingCutoffName: prev.startingCutoffName || defaultStockCardFilters.startingCutoffName,
      endingCutoff: prev.endingCutoff || defaultStockCardFilters.endingCutoff,
      endingCutoffName: prev.endingCutoffName || defaultStockCardFilters.endingCutoffName,
    }));
    setStockStatusFilters((prev) => ({
      ...prev,
      reportType: prev.reportType || defaultStockStatusFilters.reportType,
      branchCode: prev.branchCode || defaultStockStatusFilters.branchCode,
      branchName: prev.branchName || defaultStockStatusFilters.branchName,
      startDate: prev.startDate || prev.referenceDate || defaultStockStatusFilters.startDate,
      endDate: getStockStatusEndDate(
        prev.reportType || defaultStockStatusFilters.reportType,
        prev.startDate || prev.referenceDate || defaultStockStatusFilters.startDate
      ),
    }));
  }, [defaultBalanceFilters, defaultStockCardFilters, defaultStockStatusFilters]);

  const openLookup = React.useCallback((type, scope, cutoffTarget = "") => {
    setLookupState({ type, scope, cutoffTarget });
  }, []);

  const closeLookup = React.useCallback(() => {
    setLookupState({ type: "", scope: "", cutoffTarget: "" });
  }, []);

  const patchFiltersByScope = React.useCallback((scope, patch) => {
    if (scope === "balance") {
      setBalanceFilters((prev) => ({ ...prev, ...patch }));
      return;
    }
    if (scope === "stockCard") {
      setStockCardFilters((prev) => ({ ...prev, ...patch }));
      return;
    }
    if (scope === "stockStatus") {
      setStockStatusFilters((prev) => ({ ...prev, ...patch }));
    }
  }, []);

  const getFiltersByScope = React.useCallback(
    (scope) => {
      if (scope === "balance") return balanceFilters;
      if (scope === "stockCard") return stockCardFilters;
      if (scope === "stockStatus") return stockStatusFilters;
      return {};
    },
    [balanceFilters, stockCardFilters, stockStatusFilters]
  );

  const handleBranchLookupClose = React.useCallback(
    (row) => {
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
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleItemLookupClose = React.useCallback(
    (payload) => {
      const item = Array.isArray(payload?.records) ? payload.records[0] : payload?.records || payload;
      if (item) {
        patchFiltersByScope(lookupState.scope, {
          itemCode: item.itemCode || item.ItemCode || item.ITEM_CODE || "",
          itemName:
            item.itemName ||
            item.ItemName ||
            item.ITEM_NAME ||
            item.itemDescription ||
            item.description ||
            "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleWarehouseLookupClose = React.useCallback(
    (row) => {
      if (row) {
        patchFiltersByScope(lookupState.scope, {
          warehouseCode: row.whCode || row.warehouseCode || row.WH_CODE || "",
          warehouseName: row.whName || row.warehouseName || row.WH_NAME || "",
          locationCode: "",
          locationName: "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleLocationLookupClose = React.useCallback(
    (row) => {
      if (row) {
        patchFiltersByScope(lookupState.scope, {
          locationCode: row.locCode || row.locationCode || row.LOC_CODE || "",
          locationName: row.locName || row.locationName || row.LOC_NAME || "",
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.scope, patchFiltersByScope]
  );

  const handleCutoffLookupClose = React.useCallback(
    (row) => {
      if (row && lookupState.cutoffTarget) {
        const cutoffCode = row.cutoffCode || row.cutOffCode || row.CutoffCode || "";
        const cutoffName = row.cutoffName || row.cutOffName || row.CutoffName || "";
        const cutoffNameTarget =
          lookupState.cutoffTarget === "startingCutoff"
            ? "startingCutoffName"
            : "endingCutoffName";

        patchFiltersByScope(lookupState.scope, {
          [lookupState.cutoffTarget]: cutoffCode,
          [cutoffNameTarget]: cutoffName,
        });
      }
      closeLookup();
    },
    [closeLookup, lookupState.cutoffTarget, lookupState.scope, patchFiltersByScope]
  );

  useEffect(() => {
    if (defaultInventorySetup && !inventorySetup) {
      setInventorySetup(defaultInventorySetup);
    }
  }, [defaultInventorySetup, inventorySetup]);

  useEffect(() => {
    setActiveMainTab(inventorySetup === "WAC" ? "location" : "fifo");
  }, [inventorySetup]);

  const setupQuery = useQuery({
    queryKey: ["ms-stock-card-setup", defaultInventorySetup],
    queryFn: async () => {
      const response = await apiClient.get("/ms/inventory/stock-card/setup");
      return response?.data?.data || { inventorySetup: defaultInventorySetup };
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (setupQuery.data?.inventorySetup) {
      setInventorySetup(setupQuery.data.inventorySetup);
    }
  }, [setupQuery.data]);

  const balanceEndpoint =
    inventorySetup === "FIFO"
      ? "/ms/inventory/stock-card/fifo-balance"
      : "/ms/inventory/stock-card/location-balance";

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
    queryKey: ["ms-stock-card-balance", inventorySetup, shouldLoadBalance, balanceFilters],
    enabled: shouldLoadBalance > 0,
    queryFn: async () => {
      const response = await apiClient.get(balanceEndpoint, { params: balanceRequestParams });
      return normalizeBalanceResponse(response?.data?.data);
    },
  });

  const stockCardQuery = useQuery({
    queryKey: ["ms-stock-card-movement", shouldLoadStockCard, stockCardFilters],
    enabled: shouldLoadStockCard > 0,
    queryFn: async () => {
      const response = await apiClient.get("/ms/inventory/stock-card/stock-card", {
        params: stockCardRequestParams,
      });
      return response?.data?.data || { rows: [], totals: {} };
    },
  });

  const stockStatusQuery = useQuery({
    queryKey: ["ms-stock-status", shouldLoadStockStatus],
    enabled: shouldLoadStockStatus > 0,
    queryFn: async () => {
      const response = await apiClient.get("/ms/inventory/stock-card/stock-status", {
        params: stockStatusRequestParams,
      });
      return response?.data?.data || { summary: [], perItem: [], perLot: [] };
    },
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
    if (!matchedRow && firstRow) {
      setSelectedBalanceItem(firstRow);
      return;
    }

    if (matchedRow && matchedRow !== selectedBalanceItem) {
      setSelectedBalanceItem(matchedRow);
    }
  }, [balanceSummaryRows, selectedBalanceItem?.itemCode]);

  const selectedItemCode = selectedBalanceItem?.itemCode || "";
  const selectedDetailRows = safeArray(balanceDetailsMap[selectedItemCode]);
  const selectedAllocatedRows = safeArray(balanceAllocatedMap[selectedItemCode]);

  const stockCardRows = safeArray(stockCardQuery.data?.rows);
  const stockCardTotals = useMemo(() => {
    const apiTotals = stockCardQuery.data?.totals || {};
    return {
      beginningBalance: toNumber(apiTotals.beginningBalance),
      totalInbound:
        apiTotals.totalInbound !== undefined
          ? toNumber(apiTotals.totalInbound)
          : sumBy(stockCardRows, "qtyIn"),
      totalOutbound:
        apiTotals.totalOutbound !== undefined
          ? toNumber(apiTotals.totalOutbound)
          : sumBy(stockCardRows, "qtyOut"),
      endingBalance:
        apiTotals.endingBalance !== undefined
          ? toNumber(apiTotals.endingBalance)
          : toNumber(stockCardRows[stockCardRows.length - 1]?.runBal),
    };
  }, [stockCardQuery.data, stockCardRows]);

  const stockStatusRows = safeArray(stockStatusQuery.data?.[stockStatusTab]);

  // ─── Column Definitions ──────────────────────────────────────────────────
  const balanceSummaryColumns = useMemo(
    () => [
      { key: "categName", header: "Category", size: 150, width: 150, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "className", header: "Classification", size: 150, width: 150, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemCode", header: "Item Code", size: 120, width: 120, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 300, width: 300, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 100, width: 100, minWidth: 100, cellClassName: "text-center text-[11px]" },
      { key: "quantity", header: "Quantity", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyAllocated", header: "Allocated", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-blue-700 text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyAvailable", header: "Available", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-emerald-700  text-[11px] font-bold ", type: "amount", decimals: 4 },
    ],
    []
  );

  const fifoDetailColumns = useMemo(
    () => [
      { key: "itemCode", header: "Item Code", size: 120, width: 120, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 300, width: 300, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 100, width: 100, minWidth: 100, cellClassName: "text-center text-[11px]" },
      { key: "rrDate", header: "RR Date", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]", type: "date" },
      { key: "rrNo", header: "RR No", size: 140, width: 140, minWidth: 140, cellClassName: "text-[11px]" },
      { key: "unitCost", header: "Unit Cost", size: 120, width: 120, minWidth: 120, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "qtyIn", header: "Qty In", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 100, width: 100, minWidth: 100, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "whouseCode", header: "Warehouse", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "locCode", header: "Location", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "lotNo", header: "Lot No", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "bbDate", header: "BB Date", size: 110, width: 110, minWidth: 110, cellClassName: "text-center text-[11px]", type: "date" },
      { key: "qcStat", header: "QC Status", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "poNo", header: "PO No", size: 110, width: 110, minWidth: 110, cellClassName: "text-[11px]" },
    ],
    []
  );

  const locationDetailColumns = useMemo(
    () => [
      { key: "itemCode", header: "Item Code", size: 100, width: 100, minWidth: 100, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 280, width: 280, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]" },
      { key: "whouseCode", header: "Warehouse", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "locCode", header: "Location", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "lotNo", header: "Lot No", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "bbDate", header: "BB Date", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]", type: "date" },
      { key: "qcStat", header: "QC Status", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "qtyIn", header: "Qty In", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-emerald-700 text-[11px]", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 100, width: 100, minWidth: 100, cellClassName: "text-right text-rose-600 text-[11px]", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 100, width: 100, minWidth: 100, cellClassName: "text-right font-bold text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );

  const allocationColumns = useMemo(
    () => [
      { key: "docType", header: "Document Type", size: 100, width: 100, minWidth: 100, cellClassName: "text-[11px]" },
      { key: "docNo", header: "Document No", size: 100, width: 100, minWidth: 100, cellClassName: "text-[11px]" },
      { key: "docDate", header: "Document Date", size: 100, width: 100, minWidth: 100, cellClassName: "text-left text-[11px]", type: "date" },
      { key: "itemCode", header: "Item Code", size: 110, width: 110, minWidth: 110, cellClassName: "text-left text-[11px]" },
      { key: "itemName", header: "Item Name", size: 280, width: 280, minWidth: 120, cellClassName: "text-left text-[11px]" },
      { key: "uomCode", header: "UOM", size: 90, width: 90, minWidth: 90, cellClassName: "text-center text-[11px]" },
      { key: "qtyPicked", header: "Qty Picked", size: 130, width: 130, minWidth: 130, cellClassName: "text-right font-semibold text-blue-700 text-[11px]", type: "amount", decimals: 4 },
    ],
    []
  );

  const stockCardColumns = useMemo(
    () => {
      const costingMode = String(inventorySetup || "FIFO").toUpperCase();
      const isWacCosting = costingMode === "WAC";

      return [
      { key: "cutoff", header: "Cut-Off", size: 100 },
      { key: "docType", header: "Type", size: 90 },
      { key: "docNo", header: "Doc No", size: 110, cellClassName: "font-mono text-xs" },
      { key: "docDate", header: "Doc Date", size: 110, type: "date" },
      ...(!isWacCosting
        ? [{ key: "rrNo", header: "RR No", size: 130, cellClassName: "font-mono text-xs" }]
        : []),
      { key: "particular", header: "Particular", size: 260 },
      { key: "itemNo", header: "Item No", size: 120 },
      { key: "itemDescription", header: "Item Desc", size: 120 },
      { key: "warehouse", header: "Warehouse", size: 120 },
      { key: "location", header: "Location", size: 120 },
      { key: "qtyIn", header: "Qty In", size: 110, cellClassName: "text-right text-emerald-700 font-semibold", type: "amount", decimals: 4 },
      { key: "qtyOut", header: "Qty Out", size: 110, cellClassName: "text-right text-rose-600 font-semibold", type: "amount", decimals: 4 },
      { key: "balance", header: "Balance", size: 110, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "runBal", header: "Run Bal", size: 110, cellClassName: "text-right font-bold", type: "amount", decimals: 4 },
      { key: "unitCost", header: "Unit Cost", size: 120, cellClassName: "text-right", type: "amount", decimals: 6 },
      { key: "amount", header: "Amount", size: 130, cellClassName: "text-right font-semibold", type: "amount", decimals: 2 },
      ...(isWacCosting
        ? [{ key: "wac", header: "WAC", size: 120, cellClassName: "text-right", type: "amount", decimals: 6 }]
        : []),
      { key: "stockVal", header: "Stock Value", size: 130, cellClassName: "text-right font-semibold", type: "amount", decimals: 2 },
      { key: "postedBy", header: "Posted By", size: 140 },
      { key: "dateStamp", header: "Date Stamp", size: 120, type: "date" },
      { key: "timeStamp", header: "Time Stamp", size: 110 },
    ];
    },
    [inventorySetup]
  );

  const stockStatusColumnsMap = useMemo(
    () => ({
      summary: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 260 },
        { key: "uom", header: "UOM", size: 80, cellClassName: "text-center" },
        { key: "category", header: "Category", size: 180 },
        { key: "itemClass", header: "Item Class", size: 120 },
        { key: "rrNo", header: "RR No", size: 130, cellClassName: "font-mono text-xs" },
        { key: "beginningBalance", header: "Beg. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
        { key: "inventoryAcct", header: "Inventory Acct", size: 140 },
      ],
      perItem: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 260 },
        { key: "warehouse", header: "Warehouse", size: 120 },
        { key: "location", header: "Location", size: 120 },
        { key: "beginningBalance", header: "Beg. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right" },
        { key: "quantityIn", header: "Qty In", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-emerald-700 font-semibold" },
        { key: "quantityOut", header: "Qty Out", size: 110, type: "amount", decimals: 4, cellClassName: "text-right text-rose-600 font-semibold" },
        { key: "endingBalance", header: "End. Balance", size: 130, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
      perLot: [
        { key: "itemNo", header: "Item No", size: 150, cellClassName: "font-mono text-xs" },
        { key: "itemDescription", header: "Item Description", size: 260 },
        { key: "warehouse", header: "Warehouse", size: 120 },
        { key: "location", header: "Location", size: 120 },
        { key: "lotNo", header: "Lot No", size: 120 },
        { key: "bbDate", header: "BB Date", size: 110, type: "date" },
        { key: "qcStat", header: "QC Status", size: 110 },
        { key: "balance", header: "Balance", size: 120, type: "amount", decimals: 4, cellClassName: "text-right font-bold" },
        { key: "unitCost", header: "Unit Cost", size: 120, type: "amount", decimals: 6, cellClassName: "text-right" },
        { key: "amount", header: "Amount", size: 130, type: "amount", decimals: 2, cellClassName: "text-right font-semibold" },
      ],
    }),
    []
  );


  const balanceSummaryColumnsForTable = useMemo(() => normalizeTableColumns(balanceSummaryColumns), [balanceSummaryColumns]);
  const fifoDetailColumnsForTable = useMemo(() => normalizeTableColumns(fifoDetailColumns), [fifoDetailColumns]);
  const locationDetailColumnsForTable = useMemo(() => normalizeTableColumns(locationDetailColumns), [locationDetailColumns]);
  const allocationColumnsForTable = useMemo(() => normalizeTableColumns(allocationColumns), [allocationColumns]);
  const stockCardColumnsForTable = useMemo(() => normalizeTableColumns(stockCardColumns), [stockCardColumns]);
  const stockStatusColumnsMapForTable = useMemo(() => ({
    summary: normalizeTableColumns(stockStatusColumnsMap.summary),
    perItem: normalizeTableColumns(stockStatusColumnsMap.perItem),
    perLot: normalizeTableColumns(stockStatusColumnsMap.perLot),
  }), [stockStatusColumnsMap]);

  const mainTabs = MAIN_TABS[inventorySetup] || MAIN_TABS.FIFO;

  // const handleExportPlaceholder = () => {
  //   useSwalErrorAlert("Export not ready", "Please connect your export endpoint or export helper.");
  // };

  const fmt4 = (n) => toNumber(n).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  // ─── Balance Tab ─────────────────────────────────────────────────────────
  const renderBalanceTab = () => {
    const detailColumns = inventorySetup === "FIFO" ? fifoDetailColumnsForTable : locationDetailColumnsForTable;
    const tabLabel = inventorySetup === "FIFO" ? "FIFO Balance" : "Location Balance";
    const balanceActionColumns = [
      {
        key: "__actions",
        // label: "View",
        // size: 50,
        width: 50,
        minWidth: 50,
        filterable: false,
        sortable: false,
        className: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleViewStockCardFromBalance(row);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 tracking-wide"
            title="View Stock Card"
          >
            <Eye size={12} />
            {/* View */}
          </button>
        ),
      },
      ...balanceSummaryColumnsForTable,
    ];

    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel
          actions={
            <>
              <ToolbarButton variant="primary" icon={Search} onClick={() => { setSelectedBalanceItem(null); setShouldLoadBalance((p) => p + 1); }}>
                Find
              </ToolbarButton>
              <ToolbarButton
                icon={Layers}
                onClick={() => {
                  setBalanceFilters((prev) => ({ ...prev, warehouseCode: "", warehouseName: "", locationCode: "", locationName: "" }));
                  setSelectedBalanceItem(null);
                  setShouldLoadBalance((p) => p + 1);
                }}
              >
                All Warehouses
              </ToolbarButton>
              <ToolbarButton
                icon={RefreshCcw}
                onClick={() => {
                  setBalanceFilters(defaultBalanceFilters);
                  setSelectedBalanceItem(null);
                }}
              >
                Reset
              </ToolbarButton>
            </>
          }
        >
          <FieldRenderer
            type="lookup"
            label="Branch"
            name="branchCode"
            value={formatLookupValue(balanceFilters.branchCode, balanceFilters.branchName)}
            onLookup={() => openLookup("branch", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                branchCode: "",
                branchName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={formatLookupValue(balanceFilters.warehouseCode, balanceFilters.warehouseName)}
            onLookup={() => openLookup("warehouse", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={formatLookupValue(balanceFilters.locationCode, balanceFilters.locationName)}
            onLookup={() => openLookup("location", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Item"
            name="itemCode"
            value={formatLookupValue(balanceFilters.itemCode, balanceFilters.itemName)}
            onLookup={() => openLookup("item", "balance")}
            editableLookup
            onClear={() =>
              setBalanceFilters((prev) => ({
                ...prev,
                itemCode: "",
                itemName: "",
              }))
            }
          />
          {/* <FieldRenderer
            type="text"
            label="Reference Date"
            name="refDate"
            value={balanceFilters.refDate}
            onChange={(value) => setBalanceFilters((prev) => ({ ...prev, refDate: value }))}
          /> */}



        </FilterPanel>

        {/* Summary + Details side-by-side */}
        <div className="xl:col-span-12 space-y-2">
          {/* Summary Table */}
            <TablePanel title={tabLabel} badge={balanceSummaryRows.length || undefined}>
              
              <SearchGlobalReferenceTable
                columns={balanceActionColumns}
                data={balanceSummaryRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                onRowClick={handleBalanceRowClick}
                selectedRow={selectedBalanceItem}
                showPagination={false}
                autoFillGrid = "true"
                docType={tabLabel}
                // tableSize="Half"
              />
            </TablePanel>

          {/* Right Column */}
          <div className="xl:col-span-12 space-y-2">
            {/* Item Info Strip */}
            <ItemInfoStrip
              itemCode={selectedBalanceItem?.itemCode}
              itemName={selectedBalanceItem?.itemName}
              uomCode={selectedBalanceItem?.uomCode}
              quantity={selectedBalanceItem?.quantity != null ? fmt4(selectedBalanceItem.quantity) : undefined}
              qtyAllocated={selectedBalanceItem?.qtyAllocated != null ? fmt4(selectedBalanceItem.qtyAllocated) : undefined}
              qtyAvailable={selectedBalanceItem?.qtyAvailable != null ? fmt4(selectedBalanceItem.qtyAvailable) : undefined}
            />

            {/* Balance Details */}
            <TablePanel title="Balance Details" badge={selectedDetailRows.length || undefined}>
              <SearchGlobalReferenceTable
                columns={detailColumns}
                data={selectedDetailRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                showPagination={false}
                autoFillGrid = "true"
                docType={tabLabel}
              />
            </TablePanel>

            {/* Allocation Details */}
            <TablePanel title="Allocation Details" badge={selectedAllocatedRows.length || undefined}>
              <SearchGlobalReferenceTable
                columns={allocationColumnsForTable}
                data={selectedAllocatedRows}
                isLoading={balanceQuery.isLoading}
                isFetching={balanceQuery.isFetching}
                showPagination={false}
                autoFillGrid = "true"
                docType={tabLabel}
              />
            </TablePanel>
          </div>
        </div>
      </div>
    );
  };

  // ─── Stock Card Tab ───────────────────────────────────────────────────────
  const renderStockCardTab = () => {
    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel>
          <FieldRenderer
            type="lookup"
            label="Branch"
            name="branchCode"
            value={formatLookupValue(stockCardFilters.branchCode, stockCardFilters.branchName)}
            onLookup={() => openLookup("branch", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                branchCode: "",
                branchName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Warehouse"
            name="warehouseCode"
            value={formatLookupValue(stockCardFilters.warehouseCode, stockCardFilters.warehouseName)}
            onLookup={() => openLookup("warehouse", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Location"
            name="locationCode"
            value={formatLookupValue(stockCardFilters.locationCode, stockCardFilters.locationName)}
            onLookup={() => openLookup("location", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Item"
            name="itemCode"
            value={formatLookupValue(stockCardFilters.itemCode, stockCardFilters.itemName)}
            onLookup={() => openLookup("item", "stockCard")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                itemCode: "",
                itemName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Start Cut-Off"
            name="startingCutoff"
            value={formatLookupValue(stockCardFilters.startingCutoff, stockCardFilters.startingCutoffName)}
            onLookup={() => openLookup("cutoff", "stockCard", "startingCutoff")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                startingCutoff: "",
                startingCutoffName: "",
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="End Cut-Off"
            name="endingCutoff"
            value={formatLookupValue(stockCardFilters.endingCutoff, stockCardFilters.endingCutoffName)}
            onLookup={() => openLookup("cutoff", "stockCard", "endingCutoff")}
            editableLookup
            onClear={() =>
              setStockCardFilters((prev) => ({
                ...prev,
                endingCutoff: "",
                endingCutoffName: "",
              }))
            }
          />
         
        </FilterPanel>

        {/* Toolbar + KPI Row */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
          {/* <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
            <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockCard((p) => p + 1)}>
              Find
            </ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={() => setStockCardFilters(defaultStockCardFilters)}>
              Reset
            </ToolbarButton>
          </div> */}
           {/* Action column inside grid */}
          <div className="flex flex-wrap items-end gap-2">
            <ToolbarButton variant="primary" icon={Search} onClick={() => setShouldLoadStockCard((p) => p + 1)}>
              Find
            </ToolbarButton>
            <ToolbarButton icon={RefreshCcw} onClick={() => setStockCardFilters(defaultStockCardFilters)}>
              Reset
            </ToolbarButton>
          </div>


          {/* KPI Cards */}
          <div className="ml-auto flex flex-wrap gap-2">
            <KpiCard
              label="Beginning Balance"
              value={fmt4(stockCardTotals.beginningBalance)}
              icon={Layers}
              accentClass="text-slate-700"
            />
            <KpiCard
              label="Total Inbound"
              value={fmt4(stockCardTotals.totalInbound)}
              icon={TrendingUp}
              accentClass="text-emerald-700"
            />
            <KpiCard
              label="Total Outbound"
              value={fmt4(stockCardTotals.totalOutbound)}
              icon={TrendingDown}
              accentClass="text-rose-600"
            />
            <KpiCard
              label="Ending Balance"
              value={fmt4(stockCardTotals.endingBalance)}
              icon={ArrowLeftRight}
              accentClass="text-blue-700"
            />
          </div>
        </div>

        {/* Movement Table */}
        <TablePanel
          title="Stock Card Movement"
          badge={stockCardRows.length || undefined}
          // toolbar={
          //   <ToolbarButton icon={Download} onClick={() => window.print()}>
          //     Export
          //   </ToolbarButton>
          // }
        >
          <SearchGlobalReportTable
            columns={stockCardColumnsForTable}
            data={stockCardRows}
            isLoading={stockCardQuery.isLoading}
            isFetching={stockCardQuery.isFetching}
            tableHeight="2000px"
            docType="Stock Card"
            // autoFillGrid
          />
        </TablePanel>
      </div>
    );
  };

  // ─── Stock Status Tab ─────────────────────────────────────────────────────
  const renderStockStatusTab = () => {
    return (
      <div className="space-y-3">
        {/* Filters */}
        <FilterPanel>
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
            onChange={(value) =>
              setStockStatusFilters((prev) => ({
                ...prev,
                reportType: value,
                endDate: getStockStatusEndDate(value, prev.startDate),
              }))
            }
          />
          <FieldRenderer
            type="lookup"
            label="Branch"
            name="branchCode"
            value={formatLookupValue(stockStatusFilters.branchCode, stockStatusFilters.branchName)}
            onLookup={() => openLookup("branch", "stockStatus")}
            editableLookup
            onClear={() =>
              setStockStatusFilters((prev) => ({
                ...prev,
                branchCode: "",
                branchName: "",
                warehouseCode: "",
                warehouseName: "",
                locationCode: "",
                locationName: "",
              }))
            }
          />
          <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-2">
            <FieldRenderer
              type="lookup"
              label="Warehouse"
              name="warehouseCode"
              value={formatLookupValue(stockStatusFilters.warehouseCode, stockStatusFilters.warehouseName)}
              onLookup={() => openLookup("warehouse", "stockStatus")}
              editableLookup
              onClear={() =>
                setStockStatusFilters((prev) => ({
                  ...prev,
                  warehouseCode: "",
                  warehouseName: "",
                  locationCode: "",
                  locationName: "",
                }))
              }
            />
            <FieldRenderer
              type="lookup"
              label="Location"
              name="locationCode"
              value={formatLookupValue(stockStatusFilters.locationCode, stockStatusFilters.locationName)}
              onLookup={() => openLookup("location", "stockStatus")}
              editableLookup
              onClear={() =>
                setStockStatusFilters((prev) => ({
                  ...prev,
                  locationCode: "",
                  locationName: "",
                }))
              }
            />

            <CalendarField
              id="msStockStatusStartDate"
              label="Start Date"
              name="startDate"
              value={stockStatusFilters.startDate}
              updateState={(patch) =>
                setStockStatusFilters((prev) => ({
                  ...prev,
                  ...patch,
                  endDate: getStockStatusEndDate(prev.reportType, patch.startDate ?? prev.startDate),
                }))
              }
            />
            <CalendarField
              id="msStockStatusEndDate"
              label="End Date"
              name="endDate"
              value={stockStatusFilters.endDate}
              disabled
              updateState={(patch) => setStockStatusFilters((prev) => ({ ...prev, ...patch }))}
            />
            
          </div>
          

          {/* Action column inside grid */}
          <div className="flex flex-wrap items-end gap-2">
            <ToolbarButton
              variant="primary"
              icon={Search}
              onClick={() => setShouldLoadStockStatus((p) => p + 1)}
            >
              Load &amp; Process
            </ToolbarButton>
            <ToolbarButton onClick={() => setShouldLoadStockStatus((p) => p + 1)} icon={Layers}>
              All Warehouse
            </ToolbarButton>
            <ToolbarButton
              icon={RefreshCcw}
              onClick={() => setStockStatusFilters(defaultStockStatusFilters)}
            >
              Reset
            </ToolbarButton>
            {/* <ToolbarButton icon={Download} onClick={handleExportPlaceholder}>
              Export
            </ToolbarButton> */}
          </div>
        </FilterPanel>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">View:</span>
          {STOCK_STATUS_SUBTABS.map((tab) => (
            <SubTabButton
              key={tab.key}
              active={stockStatusTab === tab.key}
              label={tab.label}
              onClick={() => setStockStatusTab(tab.key)}
            />
          ))}
          {stockStatusRows.length > 0 && (
            <span className="ml-2 rounded-md bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
              {stockStatusRows.length} record{stockStatusRows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Data Table */}
        <TablePanel title={STOCK_STATUS_SUBTABS.find((t) => t.key === stockStatusTab)?.label || "Stock Status"}>
          <SearchGlobalReportTable
            columns={stockStatusColumnsMapForTable[stockStatusTab] || []}
            data={stockStatusRows}
            isLoading={stockStatusQuery.isLoading}
            isFetching={stockStatusQuery.isFetching}
            docType="Stock Status"
            // autoFillGrid
            // pagination
          />
        </TablePanel>
      </div>
    );
  };

  const activeLoading =
    setupQuery.isLoading ||
    balanceQuery.isLoading ||
    balanceQuery.isFetching ||
    stockCardQuery.isLoading ||
    stockCardQuery.isFetching ||
    stockStatusQuery.isLoading ||
    stockStatusQuery.isFetching;

  const activeTabLabel =
    mainTabs.find((tab) => tab.key === activeMainTab)?.label || "Inventory Inquiry";

  const activeRecordCount =
    activeMainTab === "stockCard"
      ? stockCardRows.length
      : activeMainTab === "stockStatus"
        ? stockStatusRows.length
        : balanceSummaryRows.length;

  const handleHeaderFind = React.useCallback(() => {
    if (activeMainTab === "stockCard") {
      setShouldLoadStockCard((prev) => prev + 1);
      return;
    }

    if (activeMainTab === "stockStatus") {
      setShouldLoadStockStatus((prev) => prev + 1);
      return;
    }

    setSelectedBalanceItem(null);
    setShouldLoadBalance((prev) => prev + 1);
  }, [activeMainTab]);

  const handleHeaderReset = React.useCallback(() => {
    if (activeMainTab === "stockCard") {
      setStockCardFilters(defaultStockCardFilters);
      return;
    }

    if (activeMainTab === "stockStatus") {
      setStockStatusFilters(defaultStockStatusFilters);
      return;
    }

    setBalanceFilters(defaultBalanceFilters);
    setSelectedBalanceItem(null);
  }, [activeMainTab, defaultBalanceFilters, defaultStockCardFilters, defaultStockStatusFilters]);

  // ─── Root ─────────────────────────────────────────────────────────────────
  const activeLookupFilters = getFiltersByScope(lookupState.scope);
  const warehouseLookupFilter = activeLookupFilters?.branchCode
    ? `ByBC${activeLookupFilters.branchCode}`
    : "ActiveAll";
  const locationLookupWarehouse = activeLookupFilters?.warehouseCode || "";

  return (
    <div className="global-ref-main-div-ui mt-24">
      {activeLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui" style={{ zIndex: 45 }}>
        <div className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <h1 className="global-ref-headertext-ui w-full sm:w-auto truncate text-center sm:text-left">
                MS Stock Card Inquiry
              </h1>
            </div>
            <p className="mt-0 ml-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-left">
              View inventory balance, stock card movement, and stock status in one workspace.
            </p>
          </div>

          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
              <HeaderStatusCard label="Costing Setup" value={inventorySetup || "FIFO"} />
              <HeaderStatusCard label="Active View" value={activeTabLabel} />
              <div className="flex h-10 min-w-[96px] flex-col items-center justify-center rounded-md bg-slate-100 px-3 py-1 text-center shadow-sm dark:bg-slate-800">
                <span className="text-xs font-bold leading-tight text-slate-600 dark:text-slate-300">Records</span>
                <span className="text-[16px] font-extrabold leading-tight text-slate-900 dark:text-slate-100">{activeRecordCount}</span>
              </div>
              {/* <HeaderActionButton icon={Search} onClick={handleHeaderFind} disabled={activeLoading}>
                Find
              </HeaderActionButton>
              <HeaderActionButton icon={RefreshCcw} onClick={handleHeaderReset} disabled={activeLoading}>
                Reset
              </HeaderActionButton>
              <HeaderActionButton icon={Printer} onClick={() => window.print()} disabled={activeLoading}>
                Print
              </HeaderActionButton>
              <HeaderActionButton icon={Download} onClick={() => window.print()} disabled={activeLoading}>
                Export
              </HeaderActionButton> */}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-900 mt-2">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-3 pt-0 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900">
          {mainTabs.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeMainTab === tab.key}
              label={tab.label}
              icon={tab.icon}
              onClick={() => setActiveMainTab(tab.key)}
            />
          ))}
        </div>

        <div className="p-3 bg-slate-50/30 dark:bg-slate-800/20">
          {(activeMainTab === "fifo" || activeMainTab === "location") && renderBalanceTab()}
          {activeMainTab === "stockCard" && renderStockCardTab()}
          {activeMainTab === "stockStatus" && renderStockStatusTab()}
        </div>
      </div>

      {lookupState.type === "branch" && (
        <BranchLookupModal
          isOpen
          onClose={handleBranchLookupClose}
          title="Search Branch"
          withPagination
        />
      )}

      {lookupState.type === "item" && (
        <ItemMastLookupModal
          isOpen
          endpoint="getInvLookupMS"
          onClose={handleItemLookupClose}
          onCancel={closeLookup}
          enableMultiSelect={false}
          docType="PRMS"
        />
      )}

      {lookupState.type === "warehouse" && (
        <WarehouseLookupModal
          isOpen
          onClose={handleWarehouseLookupClose}
          filter={warehouseLookupFilter}
          branchCode={activeLookupFilters?.branchCode || ""}
        invType="MS"
        />
      )}

      {lookupState.type === "location" && (
        <LocationLookupModal
          isOpen
          onClose={handleLocationLookupClose}
          filter={locationLookupWarehouse ? `ByWH${locationLookupWarehouse}` : "ActiveAll"}
          whCode={locationLookupWarehouse}
        />
      )}

      {lookupState.type === "cutoff" && (
        <CutoffLookupModal
          isOpen
          onClose={handleCutoffLookupClose}
          title="Search Cut-Off"
          withPagination
        />
      )}
    </div>
  );
}

export default MSStockCardQuery;
