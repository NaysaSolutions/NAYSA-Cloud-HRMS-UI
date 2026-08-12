import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faCaretDown,
  faCaretUp,
  faChartLine,
  faClock,
  faDownload,
  faFileInvoiceDollar,
  faFilter,
  faHandHoldingDollar,
  faLayerGroup,
  faMagnifyingGlass,
  faPesoSign,
  faReceipt,
  faRotateLeft,
  faSackDollar,
  faTriangleExclamation,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_ENDPOINT = "sales-analysis/dashboard";

// Same tone system + palette as SalesTracker's MetricCard, so both reports
// share one visual language (top-border accent, tinted icon badge, tinted label).
const TONE_STYLES = {
  blue: { card: "border-blue-100 border-t-blue-600", icon: "bg-blue-50 text-blue-700", label: "text-blue-700", hex: "#2563eb" },
  green: { card: "border-emerald-100 border-t-emerald-500", icon: "bg-emerald-50 text-emerald-700", label: "text-emerald-700", hex: "#10b981" },
  orange: { card: "border-orange-100 border-t-orange-500", icon: "bg-orange-50 text-orange-700", label: "text-orange-700", hex: "#f59e0b" },
  red: { card: "border-red-100 border-t-red-500", icon: "bg-red-50 text-red-700", label: "text-red-700", hex: "#ef4444" },
  slate: { card: "border-slate-100 border-t-slate-500", icon: "bg-slate-100 text-slate-700", label: "text-slate-700", hex: "#64748b" },
};

const CHART_COLOURS = [TONE_STYLES.blue.hex, "#0ea5e9", TONE_STYLES.green.hex, TONE_STYLES.orange.hex, TONE_STYLES.red.hex, TONE_STYLES.slate.hex];

const createDefaultFilters = () => ({
  branchCode: "",
  custCode: "",
  areaCode: "",
  salesRepCode: "",
  itemCode: "",
  categoryCode: "",
  startDate: dayjs().startOf("month").subtract(5, "month").format("YYYY-MM-DD"),
  endDate: dayjs().format("YYYY-MM-DD"),
  groupBy: "MONTH",
  topN: 10,
});

const emptyDashboard = {
  filters: {
    branches: [],
    customers: [],
    areas: [],
    salesReps: [],
    items: [],
    categories: [],
  },
  kpis: {},
  salesTrend: [],
  byCustomer: [],
  byArea: [],
  bySalesRep: [],
  byItem: [],
  byCategory: [],
  byBranch: [],
  paymentStatus: [],
  invoiceDetails: [],
};

const dimensionConfig = {
  CUSTOMER: { label: "Customer", key: "byCustomer" },
  AREA: { label: "Area", key: "byArea" },
  SALES_REP: { label: "Sales Representative", key: "bySalesRep" },
  ITEM: { label: "Item", key: "byItem" },
  CATEGORY: { label: "Category", key: "byCategory" },
  BRANCH: { label: "Branch", key: "byBranch" },
};

const metricConfig = {
  salesAmount: { label: "Sales Amount", type: "currency" },
  quantity: { label: "Quantity", type: "number" },
  invoiceCount: { label: "Invoice Count", type: "integer" },
  customerCount: { label: "Customer Count", type: "integer" },
};

// Formatting helpers mirror SalesTracker's (₱-with-space, en-US grouping) so
// figures look identical whichever report the user is looking at.
const toNumber = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompactAmount = (value) => {
  const amount = toNumber(value);
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}K`;
  return formatAmount(amount);
};

const formatPesoAmount = (value, compact = false) => `\u20b1 ${compact ? formatCompactAmount(value) : formatAmount(value)}`;
const formatNumber = (value) => toNumber(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
const formatQty = (value) => toNumber(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 });

const formatMetric = (value, type) => {
  if (type === "currency") return formatPesoAmount(value);
  if (type === "integer") return Math.round(toNumber(value)).toLocaleString("en-US");
  return formatNumber(value);
};

const formatCompactMetric = (value, type) => {
  if (type === "currency") return formatPesoAmount(value, true);
  if (type === "integer") return Math.round(toNumber(value)).toLocaleString("en-US");
  return formatCompactAmount(value);
};

const parseDashboardResponse = (response) => {
  let payload = response?.data ?? response ?? {};

  if (payload?.result !== undefined) payload = payload.result;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      throw new Error("Sales Analysis returned invalid JSON.");
    }
  }

  return {
    ...emptyDashboard,
    ...(payload || {}),
    filters: {
      ...emptyDashboard.filters,
      ...(payload?.filters || {}),
    },
  };
};

const escapeCsv = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

// Lightweight replacement for MUI's useMediaQuery so layout/chart sizing can
// still respond to viewport width without pulling in the MUI theme.
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

function HeaderButton({ icon, label, title, onClick, disabled = false, spin = false, labelClassName = "hidden lg:inline" }) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FontAwesomeIcon icon={icon} className={spin ? "animate-spin" : ""} />
      {label ? <span className={`ml-2 ${labelClassName}`}>{label}</span> : null}
    </button>
  );
}

function SelectInput({ label, value, name, options = [], onChange, disabled = false }) {
  const normalizedOptions = options
    .filter((option) => String(option?.code ?? option?.value ?? "") !== "")
    .map((option) => ({
      value: String(option?.code ?? option?.value ?? ""),
      label: option?.name || option?.label || option?.code || option?.value || "Unspecified",
    }));

  return (
    <FieldRenderer
      type="select"
      label={label}
      value={String(value ?? "")}
      placeholder="All"
      disabled={disabled}
      onChange={(nextValue) => onChange?.({ target: { name, value: nextValue } })}
      options={normalizedOptions}
    />
  );
}

function TextInput({ label, name, value, onChange, type = "text", disabled = false }) {
  return (
    <FieldRenderer
      type={type}
      label={label}
      value={value || ""}
      placeholder=" "
      disabled={disabled}
      onChange={(nextValue) => onChange?.({ target: { name, value: nextValue } })}
    />
  );
}

function FilterGroupCard({ title, icon, actions, className = "", children }) {
  return (
    <div className={`flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[11px] text-blue-700 ring-1 ring-blue-100">
            <FontAwesomeIcon icon={icon} />
          </span>
          <div className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-wide text-slate-700">{title}</div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function KpiCard({ title, value, caption, icon, tone = "blue", loading, trend }) {
  const toneClass = TONE_STYLES[tone] || TONE_STYLES.blue;
  const positive = toNumber(trend) >= 0;

  return (
    <div className="sales-summary-card min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{title}</div>
          {loading ? (
            <div className="mt-2 h-6 w-28 animate-pulse rounded bg-slate-200" />
          ) : (
            <div className="mt-1 truncate text-[20px] font-extrabold tabular-nums text-slate-900" title={value}>{value}</div>
          )}
        </div>
        <span className={`sales-summary-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${toneClass.icon}`}>
          <FontAwesomeIcon icon={icon} />
        </span>
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-2 border-t border-slate-100 pt-2">
        {trend !== undefined && trend !== null && (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            <FontAwesomeIcon icon={positive ? faCaretUp : faCaretDown} />
            {`${positive ? "+" : ""}${formatNumber(trend)}%`}
          </span>
        )}
        <span className="min-w-0 truncate text-[10px] font-medium text-slate-500">{caption}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, action, children, minHeight = 0, className = "" }) {
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
      <div className="mb-2 flex min-h-[34px] items-start justify-between gap-3 border-b border-slate-100 pb-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[11px] text-blue-700 ring-1 ring-blue-100">
            <FontAwesomeIcon icon={icon} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-extrabold text-slate-800">{title}</div>
            <div className="truncate text-[10px] text-slate-500">{subtitle}</div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="w-full" style={minHeight ? { minHeight } : undefined}>{children}</div>
    </div>
  );
}

function LeaderboardCard({ title, subtitle, rows, metricKey, metricType }) {
  const rankedRows = (rows || []).slice(0, 5);
  const maximum = Math.max(0, ...rankedRows.map((row) => toNumber(row?.[metricKey])));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 border-b border-slate-100 pb-2">
        <div className="text-[12px] font-extrabold text-slate-800">{title}</div>
        <div className="text-[10px] text-slate-500">{subtitle}</div>
      </div>
      <div className="space-y-2.5">
        {rankedRows.length ? rankedRows.map((row, index) => {
          const value = toNumber(row?.[metricKey]);
          const percent = maximum > 0 ? Math.max(4, (value / maximum) * 100) : 0;
          return (
            <div key={`${row.code || row.chartName}-${index}`} className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-700">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-bold text-slate-700" title={row.chartName}>{row.chartName}</span>
                    <span className="shrink-0 text-[10px] font-extrabold tabular-nums text-slate-900">{formatMetric(value, metricType)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="py-6 text-center text-[11px] text-slate-500">No ranking data available.</div>
        )}
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 260 }) {
  return <div className="w-full animate-pulse rounded-lg bg-slate-100" style={{ height }} />;
}

function EmptyChart({ message = "No sales data found for the selected filters.", height = 240 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ height }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50 text-sm text-blue-600">
        <FontAwesomeIcon icon={faChartLine} />
      </div>
      <div className="max-w-xs text-[11px] font-medium text-slate-500">{message}</div>
    </div>
  );
}

// Themed replacement for Recharts' default tooltip so it matches the
// surrounding card styling (rounded corners, soft shadow, slate palette).
function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label !== undefined && (
        <div className="mb-1 text-[11px] font-extrabold text-slate-800">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const [formattedValue, formattedName] = formatter ? formatter(entry.value, entry.name, entry) : [entry.value, entry.name];
          return (
            <div key={`tooltip-${index}`} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
              <span className="flex-1 truncate font-medium text-slate-500">{formattedName}</span>
              <span className="font-bold tabular-nums text-slate-800">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Renders an enlarged slice for the pie segment currently being hovered.
function ActivePieSlice(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 7} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={6} />;
}

export default function SalesAnalysis({ endpoint = DEFAULT_ENDPOINT }) {
  const isMobile = useIsMobile();

  const [filters, setFilters] = useState(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(createDefaultFilters);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [analysisBy, setAnalysisBy] = useState("CUSTOMER");
  const [metric, setMetric] = useState("salesAmount");
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [activeDimensionPieIndex, setActiveDimensionPieIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(
    async (requestFilters) => {
      setLoading(true);
      setError("");

      try {
        const response = await postRequest(endpoint, {
          ...requestFilters,
          topN: Number(requestFilters.topN || 10),
        });

        setDashboard(parseDashboardResponse(response));
      } catch (requestError) {
        console.error("Sales Analysis load error:", requestError);

        setError(
          requestError?.response?.data?.message ||
            requestError?.response?.data?.error ||
            requestError?.message ||
            "Unable to load Sales Analysis."
        );
        setDashboard(emptyDashboard);
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    loadDashboard(appliedFilters);
  }, [appliedFilters, loadDashboard]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = () => {
    if (!filters.startDate || !filters.endDate) {
      setError("Start Date and End Date are required.");
      return;
    }

    if (dayjs(filters.startDate).isAfter(dayjs(filters.endDate))) {
      setError("Start Date cannot be later than End Date.");
      return;
    }

    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    const defaults = createDefaultFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setAnalysisBy("CUSTOMER");
    setMetric("salesAmount");
  };

  const refreshDashboard = () => {
    loadDashboard(appliedFilters);
  };

  const kpis = dashboard.kpis || {};
  const selectedDimension = dimensionConfig[analysisBy];
  const selectedMetric = metricConfig[metric];

  const trendData = useMemo(
    () =>
      (dashboard.salesTrend || []).map((row) => ({
        ...row,
        periodLabel:
          appliedFilters.groupBy === "DAY"
            ? dayjs(row.periodStart).format("MM-DD-YYYY")
            : appliedFilters.groupBy === "WEEK"
              ? `Week of ${dayjs(row.periodStart).format("MM-DD-YYYY")}`
              : appliedFilters.groupBy === "YEAR"
                ? dayjs(row.periodStart).format("YYYY")
                : appliedFilters.groupBy === "QUARTER"
                  ? `Q${Math.floor(dayjs(row.periodStart).month() / 3) + 1} ${dayjs(row.periodStart).format("YYYY")}`
                  : dayjs(row.periodStart).format("MMM YYYY"),
        salesAmount: toNumber(row.salesAmount),
        netSales: toNumber(row.netSales),
        quantity: toNumber(row.quantity),
        invoiceCount: toNumber(row.invoiceCount),
      })),
    [appliedFilters.groupBy, dashboard.salesTrend]
  );

  const dimensionData = useMemo(() => {
    const rows = dashboard[selectedDimension.key] || [];
    return rows.map((row) => ({
      ...row,
      chartName: row.name || row.code || "Unspecified",
      salesAmount: toNumber(row.salesAmount),
      quantity: toNumber(row.quantity),
      invoiceCount: toNumber(row.invoiceCount),
      customerCount: toNumber(row.customerCount),
    }));
  }, [dashboard, selectedDimension.key]);

  const pieData = useMemo(
    () =>
      (dashboard.paymentStatus || []).map((row) => ({
        ...row,
        name: row.name || "Unspecified",
        invoiceAmount: toNumber(row.invoiceAmount),
        balanceAmount: toNumber(row.balanceAmount),
        invoiceCount: toNumber(row.invoiceCount),
      })),
    [dashboard.paymentStatus]
  );

  const pieTotal = useMemo(() => pieData.reduce((sum, row) => sum + toNumber(row.invoiceAmount), 0), [pieData]);

  const dimensionPieData = useMemo(() => {
    const ranked = dimensionData
      .map((row) => ({
        name: row.chartName,
        value: toNumber(row[metric]),
      }))
      .filter((row) => row.value > 0);

    const primary = ranked.slice(0, 6);
    const otherValue = ranked.slice(6).reduce((sum, row) => sum + row.value, 0);

    return otherValue > 0
      ? [...primary, { name: "Others", value: otherValue }]
      : primary;
  }, [dimensionData, metric]);

  const dimensionPieTotal = useMemo(
    () => dimensionPieData.reduce((sum, row) => sum + row.value, 0),
    [dimensionPieData]
  );

  const exportCsv = () => {
    const rows = dashboard.invoiceDetails || [];
    if (!rows.length) return;

    const columns = [
      ["Branch", "branchName"],
      ["SI Number", "siNo"],
      ["SI Date", "siDate"],
      ["Due Date", "dueDate"],
      ["Customer Code", "custCode"],
      ["Customer", "custName"],
      ["Area", "areaName"],
      ["Sales Representative", "salesRepName"],
      ["Invoice Amount", "invoiceAmount"],
      ["Collection Amount", "collectionAmount"],
      ["Credit Memo", "creditMemoAmount"],
      ["Debit Memo", "debitMemoAmount"],
      ["Balance", "balanceAmount"],
      ["Payment Status", "paymentStatus"],
    ];

    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(","),
      ...rows.map((row) => columns.map(([, key]) => escapeCsv(row[key])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Sales Analysis ${appliedFilters.startDate} to ${appliedFilters.endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const metricTooltipFormatter = (value) => [formatMetric(value, selectedMetric.type), selectedMetric.label];

  const paymentStatusMeta = (name) => {
    const key = String(name || "").toUpperCase();
    if (key.includes("PAID") && !key.includes("PARTIAL")) return { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    if (key.includes("OVERDUE")) return { cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
    if (key.includes("PARTIAL")) return { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
    return { cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  };

  return (
    <div className="global-ref-main-div-ui bg-slate-50/70">
      <style>{`
        @keyframes salesSoftRise {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .sales-soft-rise { animation: salesSoftRise 300ms ease-out both; }
        .sales-summary-card {
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .sales-summary-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.5);
          border-color: rgba(147, 197, 253, 0.9);
        }
      `}</style>

      {loading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="min-w-0">
            <h1 className="global-ref-headertext-ui truncate text-center md:text-left">Sales Analysis</h1>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:justify-end">
            <HeaderButton icon={faMagnifyingGlass} label="Load" onClick={applyFilters} disabled={loading} />
            <HeaderButton icon={faRotateLeft} label="Reset" onClick={resetFilters} disabled={loading} />
            <HeaderButton icon={faArrowsRotate} label="Refresh" onClick={refreshDashboard} disabled={loading} spin={loading} />
            <HeaderButton icon={faDownload} label="Export" onClick={exportCsv} disabled={!dashboard.invoiceDetails?.length || loading} />
          </div>
        </div>
      </div>

      <div className="mb-6 mt-[8.25rem] px-0 sm:mt-[6.25rem]">
        <main className="min-w-0 space-y-3">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-b from-white to-slate-50/70 px-4 py-3">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                  <FilterGroupCard title="Date Coverage" icon={faClock} className="xl:col-span-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
                      <TextInput label="Start Date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} disabled={loading} />
                      <TextInput label="End Date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} disabled={loading} />
                      <SelectInput
                        label="Group Trend By"
                        name="groupBy"
                        value={filters.groupBy}
                        onChange={handleFilterChange}
                        disabled={loading}
                        options={[
                          { code: "DAY", name: "Day" },
                          { code: "WEEK", name: "Week" },
                          { code: "MONTH", name: "Month" },
                          { code: "QUARTER", name: "Quarter" },
                          { code: "YEAR", name: "Year" },
                        ]}
                      />
                    </div>
                  </FilterGroupCard>

                  <FilterGroupCard title="Segment Filters" icon={faFilter} className="xl:col-span-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <SelectInput label="Branch" name="branchCode" value={filters.branchCode} options={dashboard.filters.branches} onChange={handleFilterChange} disabled={loading} />
                      <SelectInput label="Customer" name="custCode" value={filters.custCode} options={dashboard.filters.customers} onChange={handleFilterChange} disabled={loading} />
                      <SelectInput label="Area" name="areaCode" value={filters.areaCode} options={dashboard.filters.areas} onChange={handleFilterChange} disabled={loading} />
                      <SelectInput label="Sales Representative" name="salesRepCode" value={filters.salesRepCode} options={dashboard.filters.salesReps} onChange={handleFilterChange} disabled={loading} />
                      <SelectInput label="Item" name="itemCode" value={filters.itemCode} options={dashboard.filters.items} onChange={handleFilterChange} disabled={loading} />
                      <SelectInput label="Category" name="categoryCode" value={filters.categoryCode} options={dashboard.filters.categories} onChange={handleFilterChange} disabled={loading} />
                    </div>
                  </FilterGroupCard>

                  <FilterGroupCard
                    title="Report Options"
                    icon={faLayerGroup}
                    className="xl:col-span-3"
                    actions={(
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={applyFilters}
                          disabled={loading}
                          className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faMagnifyingGlass} /> Apply
                        </button>
                        <button
                          type="button"
                          onClick={resetFilters}
                          disabled={loading}
                          className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faRotateLeft} /> Reset
                        </button>
                      </div>
                    )}
                  >
                    <SelectInput
                      label="Top Results"
                      name="topN"
                      value={filters.topN}
                      onChange={handleFilterChange}
                      disabled={loading}
                      options={[5, 10, 15, 20, 30, 50].map((value) => ({ code: value, name: `Top ${value}` }))}
                    />
                  </FilterGroupCard>
              </div>
            </div>
          </section>

          {error && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="shrink-0 text-red-500 hover:text-red-700">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Sales"
              value={formatPesoAmount(kpis.salesAmount, true)}
              caption={`Previous: ${formatPesoAmount(kpis.previousSalesAmount, true)}`}
              trend={kpis.growthPercent}
              loading={loading}
              tone="blue"
              icon={faPesoSign}
            />
            <KpiCard
              title="Net Sales"
              value={formatPesoAmount(kpis.netSales, true)}
              caption={`VAT ${formatPesoAmount(kpis.vatAmount, true)} · Discount ${formatPesoAmount(kpis.discountAmount, true)}`}
              loading={loading}
              tone="blue"
              icon={faSackDollar}
            />
            <KpiCard
              title="Invoices"
              value={Math.round(toNumber(kpis.invoiceCount)).toLocaleString("en-US")}
              caption={`Average ${formatPesoAmount(kpis.averageInvoiceValue, true)}`}
              loading={loading}
              tone="orange"
              icon={faFileInvoiceDollar}
            />
            <KpiCard
              title="Collections"
              value={formatPesoAmount(kpis.collectionAmount, true)}
              caption={`${formatNumber(kpis.collectionRate)}% collection rate`}
              loading={loading}
              tone="green"
              icon={faHandHoldingDollar}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="min-w-0 space-y-3 xl:col-span-8">
              <ChartCard
                title="Sales Trend"
                subtitle={`${dayjs(appliedFilters.startDate).format("MMM DD, YYYY")} to ${dayjs(appliedFilters.endDate).format("MMM DD, YYYY")}`}
                icon={faChartLine}
                action={(
                  <div className="w-[145px]">
                    <SelectInput
                      label=""
                      name="trendMetric"
                      value={metric}
                      onChange={(event) => setMetric(event.target.value)}
                      options={[
                        { code: "salesAmount", name: "Sales Amount" },
                        { code: "quantity", name: "Quantity" },
                        { code: "invoiceCount", name: "Invoice Count" },
                      ]}
                    />
                  </div>
                )}
              >
                {loading ? (
                  <ChartSkeleton height={230} />
                ) : trendData.length ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <ComposedChart data={trendData} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={TONE_STYLES.blue.hex} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={TONE_STYLES.blue.hex} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="periodLabel" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} minTickGap={isMobile ? 34 : 16} />
                      <YAxis width={isMobile ? 46 : 60} tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactAmount(value)} />
                      <RechartsTooltip content={<ChartTooltip formatter={metricTooltipFormatter} />} cursor={{ stroke: TONE_STYLES.blue.hex, strokeWidth: 1, strokeDasharray: "4 4" }} />
                      <Area type="monotone" dataKey={metric} name={selectedMetric.label} stroke="none" fill="url(#trendFill)" legendType="none" />
                      <Line type="monotone" dataKey={metric} name={selectedMetric.label} stroke={TONE_STYLES.blue.hex} strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 2, fill: "#ffffff" }} activeDot={{ r: 5 }} animationDuration={500} />
                      {metric === "salesAmount" && (
                        <Line type="monotone" dataKey="netSales" name="Net Sales" stroke={TONE_STYLES.green.hex} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={500} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart height={230} />
                )}
              </ChartCard>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ChartCard title="Payment Status" subtitle="Invoice value by collection status" icon={faReceipt}>
                  {loading ? (
                    <ChartSkeleton height={220} />
                  ) : pieData.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="invoiceAmount"
                          nameKey="name"
                          cx="50%"
                          cy="44%"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={3}
                          cornerRadius={5}
                          activeIndex={activePieIndex}
                          activeShape={ActivePieSlice}
                          onMouseEnter={(_, index) => setActivePieIndex(index)}
                          animationDuration={500}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={CHART_COLOURS[index % CHART_COLOURS.length]} stroke="#ffffff" strokeWidth={2} />
                          ))}
                          <Label
                            position="center"
                            content={({ viewBox }) => {
                              const { cx, cy } = viewBox || {};
                              return (
                                <g>
                                  <text x={cx} y={cy - 5} textAnchor="middle" fontSize={9} fill="#64748b">Total Invoiced</text>
                                  <text x={cx} y={cy + 11} textAnchor="middle" fontSize={13} fontWeight={800} fill="#0f172a">{formatCompactAmount(pieTotal)}</text>
                                </g>
                              );
                            }}
                          />
                        </Pie>
                        <RechartsTooltip content={<ChartTooltip formatter={(value, name) => [formatPesoAmount(value), name]} />} />
                        <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart height={220} />
                  )}
                </ChartCard>

                <ChartCard
                  title={`Sales by ${selectedDimension.label}`}
                  subtitle={`Top ${appliedFilters.topN} by ${selectedMetric.label.toLowerCase()}`}
                  icon={faLayerGroup}
                  action={(
                    <div className="flex gap-1.5">
                      <div className="w-[118px]">
                        <SelectInput
                          label=""
                          name="analysisBy"
                          value={analysisBy}
                          onChange={(event) => setAnalysisBy(event.target.value)}
                          options={Object.entries(dimensionConfig).map(([key, config]) => ({ code: key, name: config.label }))}
                        />
                      </div>
                      <div className="hidden w-[118px] sm:block">
                        <SelectInput
                          label=""
                          name="metric"
                          value={metric}
                          onChange={(event) => setMetric(event.target.value)}
                          options={Object.entries(metricConfig).map(([key, config]) => ({ code: key, name: config.label }))}
                        />
                      </div>
                    </div>
                  )}
                >
                  {loading ? (
                    <ChartSkeleton height={220} />
                  ) : dimensionData.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dimensionData} barCategoryGap="28%" margin={{ top: 8, right: 4, left: -10, bottom: 48 }}>
                        <defs>
                          <linearGradient id="dimensionBarFill" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor={TONE_STYLES.blue.hex} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="chartName"
                          interval={0}
                          height={48}
                          tick={{ fontSize: 8, fill: "#475569" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e2e8f0" }}
                          angle={-25}
                          textAnchor="end"
                          tickFormatter={(value) => {
                            const label = String(value || "");
                            return label.length > 10 ? `${label.slice(0, 10)}…` : label;
                          }}
                        />
                        <YAxis width={46} tick={{ fontSize: 8, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactAmount(value)} />
                        <RechartsTooltip content={<ChartTooltip formatter={metricTooltipFormatter} />} cursor={{ fill: "#eff6ff" }} />
                        <Bar dataKey={metric} name={selectedMetric.label} fill="url(#dimensionBarFill)" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart height={220} />
                  )}
                </ChartCard>
              </div>
            </div>

            <aside className="min-w-0 space-y-3 xl:col-span-4">
              <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 text-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-100">Sales Snapshot</div>
                    <div className="mt-1 text-[22px] font-extrabold tabular-nums">{formatPesoAmount(kpis.salesAmount, true)}</div>
                    <div className="mt-0.5 text-[10px] text-blue-100">Total sales for the selected period</div>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm ring-1 ring-white/20">
                    <FontAwesomeIcon icon={faChartLine} />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["Customers", Math.round(toNumber(kpis.customerCount)).toLocaleString("en-US")],
                    ["Quantity", formatNumber(kpis.quantity)],
                    ["Outstanding", formatPesoAmount(kpis.balanceAmount, true)],
                    ["Collection Rate", `${formatNumber(kpis.collectionRate)}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white/10 px-2.5 py-2 ring-1 ring-white/10">
                      <div className="text-[9px] font-medium text-blue-100">{label}</div>
                      <div className="mt-0.5 truncate text-[12px] font-extrabold tabular-nums">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <ChartCard title={`${selectedDimension.label} Contribution`} subtitle={`Share of ${selectedMetric.label.toLowerCase()}`} icon={faReceipt}>
                {loading ? (
                  <ChartSkeleton height={205} />
                ) : dimensionPieData.length ? (
                  <ResponsiveContainer width="100%" height={205}>
                    <PieChart>
                      <Pie
                        data={dimensionPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="42%"
                        innerRadius={39}
                        outerRadius={64}
                        paddingAngle={2}
                        cornerRadius={5}
                        activeIndex={activeDimensionPieIndex}
                        activeShape={ActivePieSlice}
                        onMouseEnter={(_, index) => setActiveDimensionPieIndex(index)}
                        animationDuration={500}
                      >
                        {dimensionPieData.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={CHART_COLOURS[index % CHART_COLOURS.length]} stroke="#ffffff" strokeWidth={2} />
                        ))}
                        <Label
                          position="center"
                          content={({ viewBox }) => {
                            const { cx, cy } = viewBox || {};
                            return (
                              <g>
                                <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fill="#64748b">Total</text>
                                <text x={cx} y={cy + 11} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0f172a">{formatCompactMetric(dimensionPieTotal, selectedMetric.type)}</text>
                              </g>
                            );
                          }}
                        />
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip formatter={(value, name) => [formatMetric(value, selectedMetric.type), name]} />} />
                      <Legend verticalAlign="bottom" height={26} wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart height={205} message="No contribution data found." />
                )}
              </ChartCard>

              <LeaderboardCard
                title={`Top ${selectedDimension.label}`}
                subtitle={`Ranked by ${selectedMetric.label.toLowerCase()}`}
                rows={dimensionData}
                metricKey={metric}
                metricType={selectedMetric.type}
              />
            </aside>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <FontAwesomeIcon icon={faFileInvoiceDollar} />
                </span>
                <div>
                  <div className="text-[12px] font-extrabold text-slate-800">Invoice Analysis Details</div>
                  <div className="text-[10px] text-slate-500">Latest 500 matching invoices with collection and balance information.</div>
                </div>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">{dashboard.invoiceDetails?.length || 0} records</span>
            </div>

            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-[10px]">
                <thead className="sticky top-0 z-10 bg-blue-50 shadow-sm">
                  <tr>
                    {["Branch", "SI Number", "SI Date", "Customer", "Area", "Sales Representative", "Invoice Amount", "Collections", "Balance", "Status"].map((label, index) => (
                      <th key={label} className={`whitespace-nowrap border-b border-blue-100 px-2.5 py-2 text-[10px] font-bold text-blue-900 ${index >= 6 && index <= 8 ? "text-right" : "text-left"}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-${rowIndex}`}>
                        {Array.from({ length: 10 }).map((__, cellIndex) => (
                          <td key={`skeleton-${rowIndex}-${cellIndex}`} className="border-b border-slate-100 px-2.5 py-2"><div className="h-3 w-full animate-pulse rounded bg-slate-200" /></td>
                        ))}
                      </tr>
                    ))
                  ) : dashboard.invoiceDetails?.length ? (
                    dashboard.invoiceDetails.map((row) => {
                      const statusMeta = paymentStatusMeta(row.paymentStatus);
                      return (
                        <tr key={`${row.branchCode}-${row.siId}-${row.siNo}`} className="border-b border-slate-100 transition-colors hover:bg-blue-50/50">
                          <td className="whitespace-nowrap px-2.5 py-2 font-medium text-slate-700">{row.branchName || row.branchCode}</td>
                          <td className="whitespace-nowrap px-2.5 py-2 font-extrabold text-slate-800">{row.siNo}</td>
                          <td className="whitespace-nowrap px-2.5 py-2 font-semibold text-slate-600">{row.siDate ? dayjs(row.siDate).format("MM-DD-YYYY") : ""}</td>
                          <td className="px-2.5 py-2"><div className="font-semibold text-slate-700">{row.custName}</div><div className="text-[9px] text-slate-500">{row.custCode}</div></td>
                          <td className="whitespace-nowrap px-2.5 py-2 font-medium text-slate-700">{row.areaName || row.areaCode || "—"}</td>
                          <td className="whitespace-nowrap px-2.5 py-2 font-medium text-slate-700">{row.salesRepName || "No Sales Representative"}</td>
                          <td className="whitespace-nowrap px-2.5 py-2 text-right font-bold tabular-nums text-slate-800">{formatPesoAmount(row.invoiceAmount)}</td>
                          <td className="whitespace-nowrap px-2.5 py-2 text-right font-bold tabular-nums text-slate-800">{formatPesoAmount(row.collectionAmount)}</td>
                          <td className="whitespace-nowrap px-2.5 py-2 text-right font-extrabold tabular-nums text-slate-900">{formatPesoAmount(row.balanceAmount)}</td>
                          <td className="whitespace-nowrap px-2.5 py-2">
                            <span className={`inline-flex max-w-[150px] items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${statusMeta.cls}`}>
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusMeta.dot}`} />
                              <span className="truncate">{row.paymentStatus}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-[11px] font-medium text-slate-500">No invoice details found for the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}