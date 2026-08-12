import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCalendarCheck,
  faCalendarDay,
  faChartLine,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const FIXED_COLUMNS = [
  { key: "accountCode", label: "Account Code", width: 120, minWidth: 70, maxWidth: 600 },
  { key: "accountName", label: "Account Name", width: 290, minWidth: 120, maxWidth: 800 },
];
const TOTAL_COLUMN = {
  key: "totalAmount",
  label: "Total",
  renderType: "currency",
  roundingOff: 2,
  minWidth: 145,
  maxWidth: 190,
};
const REPORT_VIEWS = [
  ["perMonth", "Per Month MTD", faCalendarDay],
  ["perMonthYTD", "Per Month YTD", faCalendarCheck],
  ["perRC", "Per RC MTD", faBuilding],
  ["perRCYTD", "Per RC YTD", faChartLine],
];

const ReportViewTabs = ({ activeView, onChange, className = "" }) => (
  <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${className}`}>
    {REPORT_VIEWS.map(([key, label, icon]) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange?.(key)}
        className={`inline-flex w-[108px] items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:w-[116px] ${
          activeView === key
            ? "bg-blue-600 text-white shadow-sm hover:opacity-90"
            : "border border-slate-200 bg-white text-slate-600 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <FontAwesomeIcon icon={icon} className="shrink-0 text-[11px]" />
        {label}
      </button>
    ))}
  </div>
);

const parseResultBlock = (response) => {
  const result = response?.data?.[0]?.result;
  if (!result) return {};
  const parsed = typeof result === "string" ? JSON.parse(result) : result;
  return Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
};

const amountColumns = (dimensions, type) =>
  safeArray(dimensions).map((dimension) => ({
    key: `amount_${dimension.key}`,
    label:
      type === "rc"
        ? dimension.key
          ? `${dimension.key} - ${dimension.label || dimension.key}`
          : dimension.label || "Unassigned"
        : String(dimension.label || dimension.key || "").toUpperCase(),
    renderType: "currency",
    roundingOff: 2,
    minWidth: 135,
    maxWidth: 190,
  }));

const pivotRows = (sourceRows, dimensions) => {
  const rows = new Map();
  safeArray(sourceRows).forEach((source) => {
    const accountCode = String(source?.accountCode ?? "");
    if (!rows.has(accountCode)) {
      rows.set(accountCode, {
        accountCode,
        accountName: String(source?.accountName ?? ""),
        accountGroup: String(source?.accountGroup ?? "").toUpperCase(),
        accountBalance: String(source?.accountBalance ?? "").toUpperCase(),
      });
    }
    rows.get(accountCode)[`amount_${source?.dimensionKey}`] =
      Number(source?.amount) || 0;
  });

  const valueKeys = safeArray(dimensions).map(({ key }) => `amount_${key}`);
  const detailRows = Array.from(rows.values()).map((row) => {
    valueKeys.forEach((key) => {
      if (!(key in row)) row[key] = 0;
    });
    row.totalAmount = valueKeys.reduce(
      (total, key) => total + (Number(row[key]) || 0),
      0,
    );
    return row;
  });

  const summarize = (accountGroup, accountCode, accountName) => {
    const summary = { accountCode, accountName, isSummary: true };
    valueKeys.forEach((key) => {
      summary[key] = detailRows
        .filter((row) => row.accountGroup === accountGroup)
        .reduce((total, row) => {
          const normalBalance =
            (accountGroup === "I" && row.accountBalance === "CR") ||
            (accountGroup === "E" && row.accountBalance === "DR");
          return total + (normalBalance ? 1 : -1) * (Number(row[key]) || 0);
        }, 0);
    });
    summary.totalAmount = valueKeys.reduce(
      (total, key) => total + summary[key],
      0,
    );
    return summary;
  };

  const totalIncome = summarize("I", "", "TOTAL INCOME");
  const totalExpense = summarize("E", "", "TOTAL EXPENSE");
  const netIncome = { accountCode: "", accountName: "NET INCOME", isSummary: true };
  valueKeys.forEach((key) => {
    netIncome[key] = totalIncome[key] - totalExpense[key];
  });
  netIncome.totalAmount = totalIncome.totalAmount - totalExpense.totalAmount;

  return [...detailRows, totalIncome, totalExpense, netIncome];
};

const makeView = (rows, dimensions, type, includeTotal) => ({
  columns: [
    ...FIXED_COLUMNS,
    ...amountColumns(dimensions, type),
    ...(includeTotal ? [TOTAL_COLUMN] : []),
  ],
  rows: pivotRows(rows, dimensions),
});

const parseIncomeExpenseResponse = (response) => {
  const block = parseResultBlock(response);
  const months = safeArray(block.monthColumns);
  const responsibilityCenters = safeArray(block.rcColumns);
  const reportData = {
    perMonth: makeView(block.perMonth, months, "month", true),
    perMonthYTD: makeView(block.perMonthYTD, months, "month", false),
    perRC: makeView(block.perRC, responsibilityCenters, "rc", true),
    perRCYTD: makeView(block.perRCYTD, responsibilityCenters, "rc", false),
  };
  return { ...reportData.perMonth, cols: reportData.perMonth.columns, reportData };
};

function IncomeExpenseReport({
  view,
  tabConfig,
  SearchGlobalReportTable,
  NoRecordsState,
  activeView = "perMonth",
  onActiveViewChange,
}) {
  const reportViews = useMemo(
    () =>
      view?.reportData || {
        perMonth: { columns: [], rows: [] },
        perMonthYTD: { columns: [], rows: [] },
        perRC: { columns: [], rows: [] },
        perRCYTD: { columns: [], rows: [] },
      },
    [view?.reportData],
  );

  if (!view.hasLoaded) {
    return (
      <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
        <FontAwesomeIcon icon={faWallet} className="text-blue-300" />
        <span>Click <b>Filter</b> then <b>Apply Filters</b> to load <b>{tabConfig.label}</b>.</span>
      </div>
    );
  }

  const selectedView = reportViews[activeView] || { columns: [], rows: [] };
  if (!selectedView.rows.length) {
    return (
      <NoRecordsState
        title="No records found"
        subtitle={view.emptyMessage || "Try adjusting your filters."}
        hint={`Report: ${tabConfig.label}`}
      />
    );
  }

  return (
    <div className="income-expense-scope relative flex min-h-0 flex-1 flex-col">
      <style>{`
        .income-expense-table { background: transparent !important; border-radius: 0 !important; box-shadow: none !important; }
        .income-expense-table > .global-tran-table-main-sub-div-ui { background: white !important; border: 1px solid rgb(229 231 235) !important; border-radius: 0.5rem !important; }
        .income-expense-table table { border-collapse: separate !important; border-spacing: 0 !important; }
        @media (min-width: 769px) {
          .income-expense-table .global-tran-table-main-sub-div-ui > div.relative.isolate.flex-1.h-0::before {
            display: none;
          }
          .income-expense-table table thead { position: static !important; }
          .income-expense-table table thead tr:first-child > th { position: sticky !important; top: 0 !important; z-index: 21 !important; background: rgb(219 234 254) !important; }
          .income-expense-table table thead tr:nth-child(2) > th { position: sticky !important; top: 31px !important; z-index: 20 !important; background: rgb(243 244 246) !important; }
          .income-expense-table table tbody tr > td { border-bottom: 1px solid rgb(229 231 235) !important; }
          .income-expense-table table tbody tr:nth-last-child(-n+3) > td { background: rgb(248 250 252); font-weight: 700; }
          .income-expense-table table tbody tr:last-child > td { position: sticky !important; bottom: 0 !important; z-index: 7; background: rgb(239 246 255); box-shadow: 0 -3px 6px rgb(15 23 42 / 12%); }
          .income-expense-table table tbody tr:last-child > :nth-child(1) { z-index: 20 !important; background: rgb(239 246 255); }
          .income-expense-table table tbody tr:last-child > :nth-child(2) { z-index: 19 !important; background: rgb(239 246 255); }
        }
      `}</style>
      <ReportViewTabs activeView={activeView} onChange={onActiveViewChange} className="mb-2 xl:hidden" />
      <ReportViewTabs activeView={activeView} onChange={onActiveViewChange} className="absolute left-0 top-2 z-30 hidden xl:grid" />
      <div className="min-h-0 flex-1">
        <SearchGlobalReportTable
          key={`incExp-${activeView}-${view.loadedAt || "idle"}`}
          columns={selectedView.columns}
          data={selectedView.rows}
          itemsPerPage={50}
          showGroupBy={false}
          rightActionLabel={null}
          className="income-expense-table"
          totalExemptions={selectedView.columns
            .filter((column) => ["number", "currency"].includes(column.renderType))
            .map((column) => String(column.key).toLowerCase())}
          docType={`Income and Expense - ${REPORT_VIEWS.find(([key]) => key === activeView)?.[1] || "Per Month MTD"}`}
        />
      </div>
    </div>
  );
}

IncomeExpenseReport.meta = {
  key: "incExp",
  label: "Income and Expense",
  icon: faWallet,
  filters: ["Branch", "Starting Account", "Ending Account", "Start Cut Off", "End Cut Off", "Starting RC", "Ending RC", "Currency"],
  endpoint: "getGLINQ_IncomeExpense",
  dynamicColumns: true,
};

IncomeExpenseReport.buildPayload = (f) => ({
  branchCode: f.branchCode || "",
  accCodeStart: f.accCodeStart || "",
  accCodeEnd: f.accCodeEnd || "",
  cutoffStart: f.cutoffStartCode || "",
  cutoffEnd: f.cutoffEndCode || "",
  rcCodeStart: f.rcCodeStart || "",
  rcCodeEnd: f.rcCodeEnd || "",
  currCode: f.currCode || "PHP",
});
IncomeExpenseReport.buildJsonData = (payload) => ({ ...payload });
IncomeExpenseReport.parseResponse = parseIncomeExpenseResponse;

export default IncomeExpenseReport;
