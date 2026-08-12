import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faFilter,
  faFileInvoiceDollar,
  faHistory,
  faListOl,
  faMagnifyingGlass,
  faMoneyBillWave,
  faPesoSign,
  faProjectDiagram,
  faRefresh,
  faTimes,
  faTruck,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchCustMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchSalesRepRef from "@/NAYSA Cloud/Lookup/SearchSalesRepRef.jsx";

import SalesTrackerDetailsModal from "./SalesTrackerDetailsModal.jsx";

const SALES_STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "PENDING_DELIVERY", label: "Pending Delivery" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered" },
  { value: "PENDING_INVOICE", label: "Pending Invoice" },
  { value: "PARTIALLY_INVOICED", label: "Partially Invoiced" },
  { value: "PENDING_COLLECTION", label: "Pending Collection" },
  { value: "PARTIALLY_COLLECTED", label: "Partially Collected" },
  { value: "WITH_CM", label: "With Credit Memo" },
  { value: "WITH_DM", label: "With Debit Memo" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DEFAULT_VIEW = { cols: [], rows: [], hasLoaded: false, isEmpty: false, loadedAt: "" };
const REPORT_TABLE_MIN_HEIGHT = 220;
const REPORT_TABLE_MAX_HEIGHT = 560;
const REPORT_TABLE_BASE_HEIGHT = 170;
const REPORT_TABLE_ROW_HEIGHT = 32;

const SUMMARY_COLUMNS = [
  { key: "soNo", label: "SO No" },
  { key: "soDate", label: "SO Date", renderType: "date" },
  { key: "custName", label: "Customer" },
  { key: "salesman", label: "Salesman" },
  { key: "soAmount", label: "SO Amount", renderType: "number" },
  { key: "drCount", label: "DR Count", renderType: "number" },
  { key: "drAmount", label: "DR Amount", renderType: "number" },
  { key: "siCount", label: "SI Count", renderType: "number" },
  { key: "invoiceAmount", label: "Invoiced", renderType: "number" },
  { key: "orCount", label: "OR Count", renderType: "number" },
  { key: "collectionAmount", label: "Collected", renderType: "number" },
  { key: "creditMemoAmount", label: "CM", renderType: "number" },
  { key: "debitMemoAmount", label: "DM", renderType: "number" },
  { key: "balanceAmount", label: "Balance", renderType: "number" },
  { key: "currentStatus", label: "Status" },
  { key: "agingDays", label: "Aging", renderType: "number" },
];

const HISTORY_COLUMNS = [
  { key: "docType", label: "Doc Type" },
  { key: "docNo", label: "Document No." },
  { key: "docDate", label: "Document Date", renderType: "date" },
  { key: "soNo", label: "SO No" },
  { key: "drNo", label: "DR No" },
  { key: "siNo", label: "SI No" },
  { key: "custName", label: "Customer" },
  { key: "amount", label: "Amount", renderType: "number" },
  { key: "appliedAmount", label: "Applied", renderType: "number" },
  { key: "balanceAmount", label: "Balance", renderType: "number" },
  { key: "currentStatus", label: "Status" },
];

const parseResultRows = (response) => {
  const resultStr = response?.data?.[0]?.result;
  if (!resultStr) return [];
  try {
    const parsed = JSON.parse(resultStr);
    return Array.isArray(parsed) ? parsed : parsed?.data || [];
  } catch (error) {
    console.error("Sales Tracker parse error:", error, resultStr);
    return [];
  }
};

const normalizeDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const getDefaultStartDate = () => {
  const dt = new Date();
  dt.setDate(dt.getDate() - 30);
  return dt.toISOString().slice(0, 10);
};

const getDefaultEndDate = () => new Date().toISOString().slice(0, 10);
const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const SalesTracker = () => {
  const { currentUserRow } = useAuth();

  const tabConfigs = useMemo(() => ({
    summary: {
      label: "Sales Summary",
      icon: faChartLine,
      endpoint: "getSalesTrackerSummary",
      filters: ["Branch", "Customer", "Salesman", "Date Range", "Status"],
      fallbackColumns: SUMMARY_COLUMNS,
    },
    delivery: {
      label: "Delivery History",
      icon: faTruck,
      endpoint: "getSalesTrackerDelivery",
      filters: ["Branch", "Customer", "Salesman", "Date Range", "Status"],
      fallbackColumns: HISTORY_COLUMNS,
    },
    invoices: {
      label: "Invoice History",
      icon: faFileInvoiceDollar,
      endpoint: "getSalesTrackerInvoices",
      filters: ["Branch", "Customer", "Salesman", "Date Range", "Status"],
      fallbackColumns: HISTORY_COLUMNS,
    },
    settlements: {
      label: "Settlement History",
      icon: faMoneyBillWave,
      endpoint: "getSalesTrackerSettlements",
      filters: ["Branch", "Customer", "Salesman", "Date Range", "Status"],
      fallbackColumns: HISTORY_COLUMNS,
    },
    timeline: {
      label: "Timeline",
      icon: faHistory,
      endpoint: "getSalesTrackerTimeline",
      filters: ["Branch", "Customer", "Salesman", "Date Range", "Status"],
      fallbackColumns: HISTORY_COLUMNS,
    },
  }), []);

  const defaultFilters = useMemo(() => ({
    branchCode: currentUserRow?.branchCode || currentUserRow?.BRANCH_CODE || "",
    branchName: currentUserRow?.branchName || currentUserRow?.BRANCH_NAME || "",
    custCode: "",
    custName: "",
    salesRepCode: "",
    salesRepName: "",
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    status: "",
  }), [currentUserRow]);

  const [activeTab, setActiveTab] = useState("summary");
  const [filtersByTab, setFiltersByTab] = useState(() => Object.keys(tabConfigs).reduce((acc, key) => {
    acc[key] = { ...defaultFilters };
    return acc;
  }, {}));
  const [views, setViews] = useState(() => Object.keys(tabConfigs).reduce((acc, key) => {
    acc[key] = { ...DEFAULT_VIEW };
    return acc;
  }, {}));
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSalesRow, setSelectedSalesRow] = useState(null);

  useEffect(() => {
    setFiltersByTab(Object.keys(tabConfigs).reduce((acc, key) => {
      acc[key] = { ...defaultFilters };
      return acc;
    }, {}));
  }, [defaultFilters, tabConfigs]);

  const activeFilters = filtersByTab[activeTab] || defaultFilters;
  const activeTabConfig = tabConfigs[activeTab] || tabConfigs.summary;
  const view = views[activeTab] || DEFAULT_VIEW;

  const currentContext = useMemo(() => {
    const parts = [];
    if (activeFilters.branchCode || activeFilters.branchName) parts.push(`Branch: ${activeFilters.branchCode || "All"}${activeFilters.branchName ? ` - ${activeFilters.branchName}` : ""}`);
    if (activeFilters.custCode) parts.push(`Customer: ${activeFilters.custCode}${activeFilters.custName ? ` - ${activeFilters.custName}` : ""}`);
    if (activeFilters.salesRepCode) parts.push(`Salesman: ${activeFilters.salesRepCode}${activeFilters.salesRepName ? ` - ${activeFilters.salesRepName}` : ""}`);
    if (activeFilters.startDate || activeFilters.endDate) parts.push(`Date: ${normalizeDate(activeFilters.startDate)} to ${normalizeDate(activeFilters.endDate)}`);
    if (activeFilters.status) parts.push(`Status: ${SALES_STATUS_OPTIONS.find((x) => x.value === activeFilters.status)?.label || activeFilters.status}`);
    return parts.length ? parts.join(" | ") : "All Sales Transactions";
  }, [activeFilters]);

  const updateActiveFilters = useCallback((patch) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] || defaultFilters), ...patch },
    }));
  }, [activeTab, defaultFilters]);

  const buildJsonData = useCallback((filters, extra = {}) => ({
    branchCode: filters.branchCode || "",
    custCode: filters.custCode || "",
    salesRepCode: filters.salesRepCode || "",
    startDate: normalizeDate(filters.startDate),
    endDate: normalizeDate(filters.endDate),
    status: filters.status || "",
    ...extra,
  }), []);

  const runTabQuery = useCallback(async (tabKey, filters) => {
    const config = tabConfigs[tabKey];
    if (!config) return;

    setIsLoading(true);

    try {
      const [colsResp, rowsResp] = await Promise.all([
        useSelectedHSColConfig(config.endpoint).catch(() => []),
        postRequest(config.endpoint, { json_data: buildJsonData(filters) }),
      ]);

      const rows = parseResultRows(rowsResp);
      const cols = Array.isArray(colsResp) && colsResp.length > 0 ? colsResp : config.fallbackColumns;

      setViews((prev) => ({
        ...prev,
        [tabKey]: { cols, rows, hasLoaded: true, isEmpty: rows.length === 0, loadedAt: new Date().toISOString() },
      }));
    } catch (error) {
      console.error(`Sales Tracker query error [${tabKey}]:`, error);
      setViews((prev) => ({ ...prev, [tabKey]: { ...DEFAULT_VIEW, cols: config.fallbackColumns, hasLoaded: true, isEmpty: true, loadedAt: new Date().toISOString() } }));
    } finally {
      setIsLoading(false);
    }
  }, [buildJsonData, tabConfigs]);

  useEffect(() => {
    const filters = filtersByTab[activeTab] || defaultFilters;
    if (!views[activeTab]?.hasLoaded) runTabQuery(activeTab, filters);
  }, [activeTab, defaultFilters, filtersByTab, runTabQuery, views]);

  const handleTabSelect = (tabKey) => {
    setActiveTab(tabKey);
    const filters = filtersByTab[tabKey] || defaultFilters;
    if (!views[tabKey]?.hasLoaded) runTabQuery(tabKey, filters);
  };

  const handleApplyFilter = (nextFilters = activeFilters) => {
    setShowFilterModal(false);
    runTabQuery(activeTab, nextFilters);
  };

  const handleResetFilter = () => {
    const next = { ...defaultFilters };
    setFiltersByTab((prev) => ({ ...prev, [activeTab]: next }));
    runTabQuery(activeTab, next);
  };

  const handleViewSalesDocument = (row) => {
    setSelectedSalesRow(row);
    setShowDetailsModal(true);
  };

  const handleViewSourceSalesDocument = (row, tabKey = activeTab) => {
    const viewConfig = {
      summary: { path: "/page/SO", param: "soNo", keys: ["soNo", "parentSoNo", "docNo", "documentNo"] },
      delivery: { path: "/page/DR", param: "drNo", keys: ["drNo", "docNo", "documentNo"] },
      invoices: { path: "/page/SI", param: "siNo", keys: ["siNo", "docNo", "documentNo"] },
    }[tabKey];

    if (!viewConfig) return;

    const docNo = viewConfig.keys.map((key) => row?.[key]).find(Boolean) || "";
    const branchCode = row?.branchCode || row?.branch_code || row?.BRANCH_CODE || activeFilters.branchCode || "";

    if (!docNo || !branchCode) {
      console.warn("Cannot open sales document. Missing Document No. or Branch Code.", row);
      return;
    }

    const url =
      `${window.location.origin}${viewConfig.path}` +
      `?${viewConfig.param}=${encodeURIComponent(docNo)}` +
      `&branchCode=${encodeURIComponent(branchCode)}` +
      `&viewDocument=true`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const summaryRows = views.summary?.rows || [];
  const metricCards = useMemo(() => {
    const sourceRows = summaryRows.length > 0 ? summaryRows : view.rows || [];
    const sum = (key) => sourceRows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
    return [
      { label: "Sales Order", value: sum("soAmount"), icon: faPesoSign, tone: "blue", sub: `${sourceRows.length} SO` },
      { label: "Delivery Receipt", value: sum("drAmount"), icon: faTruck, tone: "sky", sub: `${sourceRows.reduce((t, r) => t + Number(r?.drCount || 0), 0)} DR` },
      { label: "Sales Invoice", value: sum("invoiceAmount"), icon: faFileInvoiceDollar, tone: "green", sub: `${sourceRows.reduce((t, r) => t + Number(r?.siCount || 0), 0)} SI` },
      { label: "Collection Receipt", value: sum("collectionAmount"), icon: faMoneyBillWave, tone: "violet", sub: `${sourceRows.reduce((t, r) => t + Number(r?.orCount || 0), 0)} CR` },
      { label: "AR Credit Memo", value: sum("creditMemoAmount"), icon: faUndo, tone: "orange", sub: `${sourceRows.reduce((t, r) => t + Number(r?.creditMemoCount || 0), 0)} CM` },
      { label: "AR Debit Memo", value: sum("debitMemoAmount"), icon: faRefresh, tone: "red", sub: `${sourceRows.reduce((t, r) => t + Number(r?.debitMemoCount || 0), 0)} DM` },
      { label: "Outstanding AR Balance", value: sum("balanceAmount"), icon: faChartLine, tone: "navy", sub: "Balance" },
    ];
  }, [summaryRows, view.rows]);

  return (
    <div className="global-ref-main-div-ui">
      {isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              Sales Tracker
            </h1>
          </div>

          <div className="flex w-full md:w-auto md:justify-end">
            <div className="w-full overflow-visible md:w-auto">
              <div className="flex flex-nowrap items-center justify-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => setHideNav((value) => !value)}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:hidden"
                >
                  <FontAwesomeIcon icon={faBars} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowFilterModal(true)}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  <span className="ml-2 hidden lg:inline">Filter</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faUndo} />
                  <span className="ml-2 hidden lg:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => runTabQuery(activeTab, activeFilters)}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  <span className="ml-2 hidden lg:inline">Load</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHideNav((value) => !value)}
                  className="hidden shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:inline-flex"
                >
                  <FontAwesomeIcon icon={hideNav ? faChevronRight : faChevronLeft} />
                  <span className="ml-2 hidden xl:inline">
                    {hideNav ? "Expand Nav" : "Collapse Nav"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 mt-[8.5rem] px-0 sm:mt-[6.0rem]">
        <div className="flex items-stretch gap-3">
          <aside
            className={`hidden transition-all duration-200 lg:block ${
              hideNav ? "w-[88px]" : "w-[290px]"
            }`}
          >
            <div className="global-tran-tab-div-ui h-full !m-0 !p-4">
              <div className="h-full overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-4 py-4">
                  {!hideNav ? (
                    <>
                      <div className="text-sm font-semibold text-gray-800">
                        Sales Reports
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Select a report, set filters, then load data.
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-[11px] font-semibold text-blue-700">
                      SO
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <ReportNavList
                    activeTab={activeTab}
                    tabConfigs={tabConfigs}
                    onSelect={handleTabSelect}
                    collapsed={hideNav}
                  />
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="global-tran-tab-div-ui !m-0 !p-4">
              <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-base font-semibold text-gray-800">{activeTabConfig.label}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500">{currentContext}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {metricCards.map((card) => <MetricCard key={card.label} {...card} />)}
                  </div>
                </div>
              </div>
            </div>

            <div className="global-tran-tab-div-ui !m-0 !p-4">
              <div className="global-tran-table-main-div-ui">
                <SalesTrackerTable
                  columns={view.cols?.length ? view.cols : activeTabConfig.fallbackColumns}
                  rows={view.rows || []}
                  hasLoaded={view.hasLoaded}
                  isLoading={isLoading}
                  activeTab={activeTab}
                  onViewDocument={handleViewSourceSalesDocument}
                  onViewDetails={handleViewSalesDocument}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <SalesTrackerFilterModal
          isLoading={isLoading}
          filters={activeFilters}
          tabConfig={activeTabConfig}
          updateFilters={updateActiveFilters}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilter}
        />
      )}

      {showDetailsModal && (
        <SalesTrackerDetailsModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} selectedRow={selectedSalesRow} filters={activeFilters} />
      )}
    </div>
  );
};

const FlowLabel = () => (
  <div className="hidden items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 lg:flex">
    <span>SO</span><span>→</span><span>DR</span><span>→</span><span>Billing</span><span>→</span><span>Settlement</span>
  </div>
);

const ReportNavList = ({ activeTab, tabConfigs, onSelect, collapsed }) => (
  <ul className="w-full space-y-2 text-sm">
    {Object.keys(tabConfigs).map((key) => {
      const config = tabConfigs[key];
      return (
        <li key={key} className="w-full">
          <button
            type="button"
            onClick={() => onSelect(key)}
            title={collapsed ? config.label || key : undefined}
            className={`w-full rounded-xl border text-left transition ${
              activeTab === key
                ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            } ${
              collapsed
                ? "flex justify-center px-2 py-3"
                : "flex items-center px-3 py-2.5"
            }`}
          >
            <FontAwesomeIcon icon={config.icon || faListOl} className={`${collapsed ? "" : "mr-2"} text-[13px]`} />
            {!collapsed && (
              <span className="truncate text-xs font-medium sm:text-sm">{config.label}</span>
            )}
          </button>
        </li>
      );
    })}
  </ul>
);

const MetricCard = ({ label, value, icon, tone, sub }) => {
  const toneClass = {
    blue: {
      card: "border-blue-100 border-t-blue-600",
      icon: "bg-blue-50 text-blue-700",
      label: "text-blue-700",
    },
    sky: {
      card: "border-sky-100 border-t-sky-500",
      icon: "bg-sky-50 text-sky-700",
      label: "text-sky-700",
    },
    green: {
      card: "border-emerald-100 border-t-emerald-500",
      icon: "bg-emerald-50 text-emerald-700",
      label: "text-emerald-700",
    },
    violet: {
      card: "border-violet-100 border-t-violet-500",
      icon: "bg-violet-50 text-violet-700",
      label: "text-violet-700",
    },
    orange: {
      card: "border-orange-100 border-t-orange-500",
      icon: "bg-orange-50 text-orange-700",
      label: "text-orange-700",
    },
    red: {
      card: "border-red-100 border-t-red-500",
      icon: "bg-red-50 text-red-700",
      label: "text-red-700",
    },
    navy: {
      card: "border-blue-100 border-t-blue-800",
      icon: "bg-slate-100 text-blue-900",
      label: "text-blue-900",
    },
  }[tone] || {
    card: "border-slate-100 border-t-slate-400",
    icon: "bg-slate-50 text-slate-700",
    label: "text-slate-700",
  };

  return (
    <div className={`flex min-h-[76px] flex-col justify-between rounded-lg border border-t-2 bg-white px-3 py-2 shadow-sm ${toneClass.card}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${toneClass.icon}`}>
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className={`min-w-0 truncate text-right text-[10px] font-bold uppercase ${toneClass.label}`}>{label}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-right text-[15px] font-extrabold tabular-nums text-gray-900">PHP {formatAmount(value)}</div>
        <div className="truncate text-right text-[10px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
};

const getColumnKey = (column) => column?.key || column?.field || column?.dataIndex || column?.column_key || column?.COLUMN_KEY;
const getColumnLabel = (column) => column?.label || column?.header || column?.title || column?.column_label || column?.COLUMN_LABEL || getColumnKey(column);
const isHiddenColumn = (column) => String(column?.hidden ?? column?.isHidden ?? 0) === "1" || column?.hidden === true;
const isAmountColumn = (key = "") => /amount|balance|collected|invoice|debit|credit|delivered|soAmount|drAmount/i.test(key);
const isStatusColumn = (key = "") => /status/i.test(key);

const getStatusIndicator = (value = "") => {
  const status = String(value || "").toUpperCase();

  if (status.includes("CANCEL")) return "🔴";
  if (status.includes("CLOSED") || status.includes("FULLY")) return "🟢";

  if (status.includes("PARTIALLY_COLLECTED") || status.includes("PARTIALLY COLLECTED")) return "🟣";
  if (status.includes("PENDING_COLLECTION") || status.includes("PENDING COLLECTION")) return "🟣";

  if (status.includes("PARTIALLY_INVOICED") || status.includes("PARTIALLY INVOICED")) return "🟠";
  if (status.includes("PENDING_INVOICE") || status.includes("PENDING INVOICE")) return "🟠";

  if (status.includes("PARTIALLY_DELIVERED") || status.includes("PARTIALLY DELIVERED")) return "🔵";
  if (status.includes("PENDING_DELIVERY") || status.includes("PENDING DELIVERY")) return "🔵";

  if (status.includes("CREDIT") || status.includes("CM")) return "🟡";
  if (status.includes("DEBIT") || status.includes("DM")) return "🔴";
  if (status.includes("PENDING")) return "🟡";

  return "⚪";
};

const getStatusPercent = (value = "") => {
  const status = String(value || "").toUpperCase();

  if (status.includes("CANCEL")) return 0;
  if (status.includes("CLOSED") || status.includes("FULLY")) return 100;

  if (status.includes("PARTIALLY_COLLECTED") || status.includes("PARTIALLY COLLECTED")) return 85;
  if (status.includes("PENDING_COLLECTION") || status.includes("PENDING COLLECTION")) return 70;

  if (status.includes("PARTIALLY_INVOICED") || status.includes("PARTIALLY INVOICED")) return 55;
  if (status.includes("PENDING_INVOICE") || status.includes("PENDING INVOICE")) return 40;

  if (status.includes("PARTIALLY_DELIVERED") || status.includes("PARTIALLY DELIVERED")) return 25;
  if (status.includes("PENDING_DELIVERY") || status.includes("PENDING DELIVERY")) return 10;

  if (status.includes("CREDIT") || status.includes("CM")) return 85;
  if (status.includes("DEBIT") || status.includes("DM")) return 85;
  if (status.includes("PENDING")) return 10;

  return 0;
};

const formatStatusDisplay = (value = "") => {
  const label = String(value || "-")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const percent = getStatusPercent(value);

  const percentText = String(percent).padStart(3, "\u00A0");
  const gapAfterPercent = "\u00A0".repeat(8);

  return `${getStatusIndicator(value)}  ${percentText}%${gapAfterPercent}${label}`;
};

const getStatusBarIcon = (value = "") => {
  const status = String(value || "").toUpperCase();
  if (status.includes("CANCEL")) return "X";
  if (status.includes("CLOSED") || status.includes("FULLY")) return "▮▮▮▮▮";
  if (status.includes("COLLECT")) return "▮▮▮▮";
  if (status.includes("INVOICE")) return "▮▮▮";
  if (status.includes("DELIVER")) return "▮▮";
  if (status.includes("CREDIT") || status.includes("CM")) return "-";
  if (status.includes("DEBIT") || status.includes("DM")) return "+";
  if (status.includes("PENDING")) return "▮";
  return "-";
};


const SalesTrackerTable = ({ columns, rows, hasLoaded, isLoading, activeTab, onViewDocument, onViewDetails }) => {
  const reportColumns = normalizeReportColumns(columns);
  const statusKeys = reportColumns.filter((col) => isStatusColumn(col.key)).map((col) => col.key);
  const displayRows = useMemo(
    () => rows.map((row) => {
      if (!statusKeys.length) return row;
      const next = { ...row };
      statusKeys.forEach((key) => {
        next[key] = formatStatusDisplay(row?.[key]);
      });
      return next;
    }),
    [rows, statusKeys],
  );
  const hasDocumentViewAction = ["summary", "delivery", "invoices"].includes(activeTab);
  const visibleRowCount = Math.max(1, Math.min(displayRows?.length || 0, 25));
  const tableViewportHeight = Math.min(
    REPORT_TABLE_MAX_HEIGHT,
    Math.max(
      REPORT_TABLE_MIN_HEIGHT,
      REPORT_TABLE_BASE_HEIGHT + visibleRowCount * REPORT_TABLE_ROW_HEIGHT,
    ),
  );

  if (!hasLoaded && isLoading) return <EmptyState title="Loading report" description="Please wait while Sales Tracker loads the records." />;
  if (!hasLoaded) return <EmptyState title="Loading report" description="Sales Tracker will automatically load using the default filters." />;
  if (!displayRows?.length) return <EmptyState title="No records found" description="Try changing the branch, date range, customer, salesman, or status filter." />;

  return (
    <div
      className="max-h-[560px]"
      style={{ height: `min(${tableViewportHeight}px, calc(100vh - 260px))` }}
    >
      <SearchGlobalReportTable
        key={`${activeTab}-${displayRows.length}-${reportColumns.length}`}
        columns={reportColumns}
        data={displayRows}
        itemsPerPage={50}
        rightActionLabel="View"
        onRowAction={hasDocumentViewAction ? (row) => onViewDocument(row, activeTab) : onViewDetails}
        onRowActionsClick={hasDocumentViewAction ? onViewDetails : undefined}
        actionsIcon={faProjectDiagram}
        actionsTitle="Sales Document Detail"
        docType={`Sales Tracker ${activeTab}`}
        tableSize="Full"
        autoFit
      />
    </div>
  );
};

const normalizeReportColumns = (columns = []) =>
  columns
    .filter((col) => !isHiddenColumn(col))
    .map((col) => {
      const key = getColumnKey(col);
      const label = getColumnLabel(col);
      return {
        ...col,
        key,
        label,
        hidden: false,
        renderType: isStatusColumn(key) ? undefined : col.renderType || getRenderTypeForColumn(key),
        minWidth: col.minWidth || (isAmountColumn(key) ? 130 : 110),
        maxWidth: col.maxWidth || (isAmountColumn(key) ? 180 : 260),
      };
    })
    .filter((col) => col.key && col.renderType !== "actions");

const getRenderTypeForColumn = (key = "") => {
  if (/date/i.test(key)) return "date";
  if (isAmountColumn(key) || /count|agingDays/i.test(key)) return "number";
  return undefined;
};

const renderCell = (row, key, onView) => {
  const value = row?.[key];
  if (key === "soNo" || key === "docNo") {
    return <button type="button" onClick={() => onView(row)} className="font-semibold text-blue-700 hover:underline">{value || "-"}</button>;
  }
  if (/date/i.test(key)) return formatDate(value);
  if (/status/i.test(key)) return <StatusBadge value={value} />;
  if (isAmountColumn(key)) return formatAmount(value);
  return value ?? "";
};

const StatusBadge = ({ value }) => {
  const status = String(value || "").toUpperCase();
  let cls = "bg-slate-100 text-slate-700 border-slate-200";
  if (status.includes("CLOSED") || status.includes("FULLY")) cls = "bg-emerald-50 text-emerald-700 border-emerald-100";
  else if (status.includes("PENDING")) cls = "bg-blue-50 text-blue-700 border-blue-100";
  else if (status.includes("PARTIAL")) cls = "bg-orange-50 text-orange-700 border-orange-100";
  else if (status.includes("CREDIT")) cls = "bg-violet-50 text-violet-700 border-violet-100";
  else if (status.includes("DEBIT") || status.includes("OVERDUE")) cls = "bg-red-50 text-red-700 border-red-100";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cls}`}>{value || "-"}</span>;
};

const EmptyState = ({ title, description }) => (
  <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50 p-8 text-center">
    <div className="text-sm font-semibold text-gray-700">{title}</div>
    <div className="mt-1 text-xs text-gray-500">{description}</div>
  </div>
);

const SalesTrackerFilterModal = ({ isLoading, filters, tabConfig, updateFilters, onClose, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const setLocal = (patch) => setLocalFilters((prev) => ({ ...prev, ...patch }));
  const apply = () => {
    updateFilters(localFilters);
    onApply(localFilters);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-2 backdrop-blur-[1px] sm:p-3"
      onClick={onClose}
    >
      <div
        className="flex max-h-[84vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-4xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-white px-3 py-2.5 sm:px-4 sm:py-3">
          <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-gray-800 sm:text-base">
            <FontAwesomeIcon icon={faFilter} className="text-[13px] text-blue-600 sm:text-sm" />
            <span>Filters - {tabConfig.label}</span>
          </h3>

          <button type="button" className="p-1 text-gray-500 transition hover:text-gray-800" onClick={onClose} disabled={isLoading}>
            <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="space-y-2.5 overflow-y-auto p-2.5 sm:space-y-3 sm:p-4">
          {tabConfig.filters.includes("Branch") && (
            <ModalSection title="Branch">
              <DualLookupInput labelCode="Branch Code" labelName="Branch Name" codeValue={localFilters.branchCode} nameValue={localFilters.branchName} disabled={isLoading} onLookupSelect={(row) => setLocal({ branchCode: row?.branchCode || row?.BRANCH_CODE || "", branchName: row?.branchName || row?.BRANCH_NAME || "" })} LookupComponent={SearchBranchRef} onClear={() => setLocal({ branchCode: "", branchName: "" })} />
            </ModalSection>
          )}

          {tabConfig.filters.includes("Customer") && (
            <ModalSection title="Customer">
              <DualLookupInput labelCode="Customer Code" labelName="Customer Name" codeValue={localFilters.custCode} nameValue={localFilters.custName} disabled={isLoading} onLookupSelect={(row) => setLocal({ custCode: row?.custCode || row?.CUST_CODE || "", custName: row?.custName || row?.CUST_NAME || "" })} LookupComponent={SearchCustMast} onClear={() => setLocal({ custCode: "", custName: "" })} />
            </ModalSection>
          )}

          {tabConfig.filters.includes("Salesman") && (
            <ModalSection title="Salesman">
              <DualLookupInput labelCode="Salesman Code" labelName="Salesman Name" codeValue={localFilters.salesRepCode} nameValue={localFilters.salesRepName} disabled={isLoading} onLookupSelect={(row) => setLocal({ salesRepCode: row?.salesRepCode || row?.SALESREP_CODE || "", salesRepName: row?.salesRepName || row?.SALESREP_NAME || "" })} LookupComponent={SearchSalesRepRef} onClear={() => setLocal({ salesRepCode: "", salesRepName: "" })} />
            </ModalSection>
          )}

          {tabConfig.filters.includes("Date Range") && (
            <ModalSection title="Date Range">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FieldRenderer id="startDate" label="Date From" type="date" value={localFilters.startDate || ""} disabled={isLoading} onChange={(value) => setLocal({ startDate: value })} />
                <FieldRenderer id="endDate" label="Date To" type="date" value={localFilters.endDate || ""} disabled={isLoading} onChange={(value) => setLocal({ endDate: value })} />
              </div>
            </ModalSection>
          )}

          {tabConfig.filters.includes("Status") && (
            <ModalSection title="Status">
              <FieldRenderer id="status" label="Status" type="select" value={localFilters.status || "ALL"} disabled={isLoading} onChange={(value) => setLocal({ status: value === "ALL" ? "" : value })} options={SALES_STATUS_OPTIONS} />
            </ModalSection>
          )}
        </div>

        <div className="border-t bg-gray-50 px-3 py-2.5 sm:px-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={onClose} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 sm:min-w-[110px] sm:w-auto" disabled={isLoading}>
              <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5" /> Close
            </button>
            <button type="button" onClick={apply} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 sm:min-w-[110px] sm:w-auto" disabled={isLoading}>
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5" /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalSection = ({ title, children }) => (
  <div className="rounded-lg border bg-slate-50/60 p-3 shadow-sm">
    <p className="mb-2 text-sm font-semibold text-gray-700">{title}</p>
    <div className="grid grid-cols-1 gap-2">{children}</div>
  </div>
);

const DualLookupInput = ({ labelCode, labelName, codeValue, nameValue, disabled, LookupComponent, onLookupSelect, onClear }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-12">
        <div className="md:col-span-5">
          <FieldRenderer id={labelCode.replace(/\s+/g, "_")} label={labelCode} type="lookup" value={codeValue || ""} disabled={disabled} readOnly editableLookup onLookup={() => setOpen(true)} onClear={onClear} labelClassName="text-[10px] sm:text-xs" />
        </div>
        <div className="md:col-span-7">
          <FieldRenderer id={labelName.replace(/\s+/g, "_")} label={labelName} type="text" value={nameValue || ""} disabled readOnly labelClassName="text-[10px] sm:text-xs" />
        </div>
      </div>

      {open && LookupComponent && (
        <LookupComponent isOpen={open} onClose={() => setOpen(false)} onSelect={(row) => { onLookupSelect(row); setOpen(false); }} />
      )}
    </>
  );
};

export default SalesTracker;
