/* eslint-disable react/prop-types */
import { useCallback, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCalculator,
  faChartLine,
  faChevronLeft,
  faChevronRight,
  faDatabase,
  faFilter,
  faMagnifyingGlass,
  faPesoSign,
  faRotateLeft,
  faScaleBalanced,
  faTableList,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSwalErrorAlert as showErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchBudItemRef from "@/NAYSA Cloud/Lookup/SearchBudItemRef.jsx";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchCutOffRef from "@/NAYSA Cloud/Lookup/SearchCutOffRef.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";

const currentYear = String(new Date().getFullYear());

const mainTabs = {
  budgetQuery: {
    label: "Budget Query",
    icon: faChartLine,
    endpoint: "getBUDBudgetQuery",
  },
  monthlyComparative: {
    label: "Budget Monthly Comparative",
    icon: faTableList,
    endpoint: "getBUDBudgetMonthlyComparative",
  },
};

const reportGroups = {
  accountRc: { label: "Per Account per RC", groupBy: "ACCOUNT_RC" },
  account: { label: "Per Account", groupBy: "ACCOUNT" },
  rc: { label: "Per RC", groupBy: "RC" },
};

const createEmptyGroupRows = () =>
  Object.keys(reportGroups).reduce((groups, key) => ({ ...groups, [key]: [] }), {});

const createEmptyView = () => ({
  rowsByGroup: createEmptyGroupRows(),
  hasLoaded: false,
  loadedAt: "",
});

const createInitialViews = () =>
  Object.keys(mainTabs).reduce((views, key) => ({ ...views, [key]: createEmptyView() }), {});

const amountColumns = [
  { key: "uploaded", label: "Uploaded", renderType: "currency", roundingOff: 2 },
  { key: "realigned", label: "Realigned", renderType: "currency", roundingOff: 2 },
  { key: "augmented", label: "Augmented", renderType: "currency", roundingOff: 2 },
  { key: "totalBudget", label: "Total Budget", renderType: "currency", roundingOff: 2 },
  { key: "actualDebit", label: "Actual Debit", renderType: "currency", roundingOff: 2 },
  { key: "actualCredit", label: "Actual Credit", renderType: "currency", roundingOff: 2 },
  { key: "actualEnd", label: "Actual End", renderType: "currency", roundingOff: 2 },
  { key: "remaining", label: "Remaining", renderType: "currency", roundingOff: 2 },
  { key: "usedPercent", label: "% Used", renderType: "number", roundingOff: 2 },
];

const monthColumns = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "total",
].map((key) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  renderType: "currency",
  roundingOff: 2,
  minWidth: 120,
  maxWidth: 160,
}));

const summaryFields = [
  { key: "uploaded", label: "Uploaded", icon: faDatabase, tone: "blue" },
  { key: "realigned", label: "Realigned", icon: faScaleBalanced, tone: "sky" },
  { key: "augmented", label: "Augmented", icon: faChartLine, tone: "violet" },
  { key: "totalBudget", label: "Total Budget", icon: faPesoSign, tone: "navy" },
  { key: "actualEnd", label: "Actual End", icon: faCalculator, tone: "green" },
  { key: "remaining", label: "Remaining", icon: faScaleBalanced, tone: "blue" },
];

const parseRows = (value) => {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      return parseRows(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.dt1)) return value.dt1;
  if (value?.result) return parseRows(value.result);
  if (typeof value === "object" && Object.keys(value).length > 0) return [value];
  return [];
};

const extractRows = (response) =>
  parseRows(
    response?.data?.[0]?.result ??
      response?.data?.[0]?.RESULT ??
      response?.data?.result ??
      response?.data?.RESULT ??
      response?.result ??
      response?.RESULT ??
      response?.data ??
      response,
  );

const toNumber = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const createDefaultFilters = (currentUserRow, companyInfo) => ({
  budgetYear: currentYear,
  cutoffCode: companyInfo?.cutoffCode || "",
  cutoffName: companyInfo?.cutoffName || "",
  branchCode: currentUserRow?.branchCode || "",
  branchName: currentUserRow?.branchName || "",
  rcCode: "",
  rcName: "",
  acctCode: "",
  acctName: "",
  budgetCode: "",
  budgetName: "",
  monthlyView: "BUDGET",
  showLookupModal: false,
  modalType: "",
});

const getVisibleColumns = (reportType, groupBy) => {
  const columns = [
    { key: "rowNo", label: "Row No.", minWidth: 105, maxWidth: 150 },
  ];

  if (groupBy === "ACCOUNT_RC" || groupBy === "ACCOUNT") {
    columns.push(
      { key: "acctCode", label: "Account Code", minWidth: 115, maxWidth: 150 },
      { key: "acctName", label: "Account Name", minWidth: 200, maxWidth: 280 },
    );
  }
  if (groupBy === "ACCOUNT_RC" || groupBy === "RC") {
    columns.push(
      { key: "rcCode", label: "RC Code", minWidth: 100, maxWidth: 140 },
      { key: "rcName", label: "RC Name", minWidth: 180, maxWidth: 240 },
    );
  }

  return reportType === "budgetQuery"
    ? [...columns, ...amountColumns]
    : [...columns, ...monthColumns];
};

const getTableHeight = (rowCount) =>
  Math.min(560, Math.max(320, 170 + Math.min(rowCount, 25) * 32));

const BudgetInquiry = () => {
  const { companyInfo, currentUserRow } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState("budgetQuery");
  const [hideNav, setHideNav] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewsByTab, setViewsByTab] = useState(createInitialViews);
  const [filters, setFilters] = useState(() => createDefaultFilters(currentUserRow, companyInfo));

  const activeMain = mainTabs[activeMainTab];
  const activeView = viewsByTab[activeMainTab] || createEmptyView();

  const updateFilters = useCallback((patch) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  const reportRowsByTab = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(viewsByTab).map(([tabKey, view]) => [
          tabKey,
          Object.fromEntries(
            Object.entries(view.rowsByGroup).map(([groupKey, rows]) => [
              groupKey,
              rows.map((row, index) => ({ ...row, rowNo: row.rowNo || index + 1 })),
            ]),
          ),
        ]),
      ),
    [viewsByTab],
  );

  const summary = useMemo(
    () =>
      activeView.rowsByGroup.accountRc.reduce(
        (totals, row) => {
          summaryFields.forEach(({ key }) => {
            totals[key] += toNumber(row?.[key]);
          });
          return totals;
        },
        summaryFields.reduce((totals, { key }) => ({ ...totals, [key]: 0 }), {}),
      ),
    [activeView.rowsByGroup.accountRc],
  );

  const currentContext = useMemo(() => {
    const context = [
      `Year: ${filters.budgetYear || currentYear}`,
      `As of Period: ${filters.cutoffCode || "All"}${filters.cutoffName ? ` - ${filters.cutoffName}` : ""}`,
      `Branch: ${filters.branchCode || "All"}${filters.branchName ? ` - ${filters.branchName}` : ""}`,
    ];
    if (filters.rcCode) context.push(`RC: ${filters.rcCode}`);
    if (filters.acctCode) context.push(`Account: ${filters.acctCode}`);
    if (filters.budgetCode) context.push(`Budget: ${filters.budgetCode}`);
    if (activeMainTab === "monthlyComparative") context.push(`View: ${filters.monthlyView}`);
    return context.join(" | ");
  }, [activeMainTab, filters]);

  const clearActiveResults = useCallback(() => {
    setViewsByTab((previous) => ({
      ...previous,
      [activeMainTab]: createEmptyView(),
    }));
  }, [activeMainTab]);

  const selectMainTab = useCallback((key) => {
    setActiveMainTab(key);
  }, []);

  const runQuery = useCallback(
    async (filterValues = filters) => {
      const cleanYear = String(filterValues.budgetYear || "").trim();
      if (!/^\d{4}$/.test(cleanYear)) {
        showErrorAlert("Budget Year", "Enter a valid four-digit budget year.");
        return;
      }

      const reportTab = activeMainTab;
      const endpoint = mainTabs[reportTab].endpoint;
      setIsLoading(true);
      try {
        const commonParams = {
          budgetYear: cleanYear,
          cutoffCode: filterValues.cutoffCode || "",
          branchCode: filterValues.branchCode || "",
          rcCode: filterValues.rcCode || "",
          acctCode: filterValues.acctCode || "",
          budgetCode: filterValues.budgetCode || "",
          monthlyView: filterValues.monthlyView || "BUDGET",
        };
        const groupResults = await Promise.all(
          Object.entries(reportGroups).map(async ([key, group]) => {
            const response = await postRequest(endpoint, {
              json_data: { ...commonParams, groupBy: group.groupBy },
            });
            return [key, extractRows(response)];
          }),
        );

        setViewsByTab((previous) => ({
          ...previous,
          [reportTab]: {
            rowsByGroup: Object.fromEntries(groupResults),
            loadedAt: new Date().toISOString(),
            hasLoaded: true,
          },
        }));
      } catch (error) {
        console.error("Budget Inquiry query failed", error);
        setViewsByTab((previous) => ({
          ...previous,
          [reportTab]: {
            rowsByGroup: createEmptyGroupRows(),
            loadedAt: new Date().toISOString(),
            hasLoaded: true,
          },
        }));
        showErrorAlert("Budget Inquiry", "Unable to load the selected budget report.");
      } finally {
        setIsLoading(false);
      }
    },
    [activeMainTab, filters],
  );

  const resetFilters = useCallback(() => {
    setFilters(createDefaultFilters(currentUserRow, companyInfo));
    clearActiveResults();
  }, [clearActiveResults, companyInfo, currentUserRow]);

  return (
    <div className="global-ref-main-div-ui">
      {isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              Budget Inquiry
            </h1>
          </div>

          <div className="flex w-full flex-nowrap items-center justify-center gap-2 md:w-auto md:justify-end">
            <HeaderButton icon={faBars} title="Reports" className="lg:hidden" onClick={() => setShowMobileNav(true)} />
            <HeaderButton icon={faFilter} label="Filter" onClick={() => setShowFilterModal(true)} />
            <HeaderButton icon={faMagnifyingGlass} label="Apply" onClick={() => runQuery()} />
            <HeaderButton icon={faRotateLeft} label="Reset" onClick={resetFilters} />
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

      <div className="mt-32 px-0 sm:mt-24">
        <div className="flex items-stretch gap-3">
          <aside className={`hidden transition-all duration-200 lg:block ${hideNav ? "w-[88px]" : "w-[290px]"}`}>
            <div className="global-tran-tab-div-ui h-full !m-0 !p-4">
              <div className="h-full overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-4 py-4">
                  {hideNav ? (
                    <div className="text-center text-[11px] font-semibold text-blue-700">BUD</div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-800">Budget Reports</div>
                      <div className="mt-1 text-xs text-gray-500">Select a report, set filters, then load data.</div>
                    </>
                  )}
                </div>
                <div className="p-3">
                  <MainTabList activeMainTab={activeMainTab} collapsed={hideNav} onSelect={selectMainTab} />
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="global-tran-tab-div-ui !m-0 !p-4">
              <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
                        <FontAwesomeIcon icon={activeMain.icon} className="text-blue-600" />
                        <span>{activeMain.label}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-gray-500" title={currentContext}>
                        {currentContext}
                      </div>
                    </div>
                  </div>
                </div>

                {activeMainTab === "budgetQuery" && (
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                      {summaryFields.map((field) => (
                        <SummaryMetricCard
                          key={field.key}
                          label={field.label}
                          value={formatAmount(summary[field.key])}
                          icon={field.icon}
                          tone={field.tone}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {Object.entries(mainTabs).map(([tabKey, tab]) => {
              const tabView = viewsByTab[tabKey] || createEmptyView();
              const tabRows = reportRowsByTab[tabKey] || createEmptyGroupRows();

              return (
                <div
                  key={tabKey}
                  className={activeMainTab === tabKey ? "flex flex-col gap-3" : "hidden"}
                >
                  {!tabView.hasLoaded ? (
                    <div className="global-tran-tab-div-ui !m-0 !p-4">
                      <div className="global-tran-table-main-div-ui">
                        <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
                          <FontAwesomeIcon icon={faDatabase} className="text-blue-300" />
                          <span>
                            Click <b>Filter</b> then <b>Apply</b> to load all <b>{tab.label}</b> tables.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    Object.entries(reportGroups).map(([key, group]) => (
                      <ReportTableSection
                        key={`${tabKey}-${key}-${tabView.loadedAt}`}
                        title={group.label}
                        reportLabel={tab.label}
                        columns={getVisibleColumns(tabKey, group.groupBy)}
                        rows={tabRows[key] || []}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </main>
        </div>
      </div>

      {showFilterModal && (
        <FilterModal
          filters={filters}
          setFilters={updateFilters}
          activeMainTab={activeMainTab}
          reportLabel={activeMain.label}
          isLoading={isLoading}
          onClose={() => setShowFilterModal(false)}
          onApply={() => {
            setShowFilterModal(false);
            runQuery(filters);
          }}
        />
      )}
      <LookupManager filters={filters} setFilters={updateFilters} />
      <MobileNav
        isOpen={showMobileNav}
        activeMainTab={activeMainTab}
        onClose={() => setShowMobileNav(false)}
        onSelect={(key) => {
          selectMainTab(key);
          setShowMobileNav(false);
        }}
      />
    </div>
  );
};

const HeaderButton = ({ icon, label, title, onClick, className = "", labelClassName = "hidden lg:inline" }) => (
  <button
    type="button"
    title={title || label}
    onClick={onClick}
    className={`shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 ${className}`}
  >
    <FontAwesomeIcon icon={icon} />
    {label ? <span className={`ml-2 ${labelClassName}`}>{label}</span> : null}
  </button>
);

const MainTabList = ({ activeMainTab, onSelect, collapsed }) => (
  <ul className="w-full space-y-2 text-sm">
    {Object.entries(mainTabs).map(([key, tab]) => (
      <li key={key} className="w-full">
        <button
          type="button"
          title={collapsed ? tab.label : undefined}
          onClick={() => onSelect(key)}
          className={`w-full rounded-xl border text-left transition ${
            activeMainTab === key
              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${collapsed ? "flex justify-center px-2 py-3" : "flex items-center px-3 py-2.5"}`}
        >
          <FontAwesomeIcon icon={tab.icon} className={`${collapsed ? "" : "mr-2"} text-[13px]`} />
          {!collapsed && <span className="truncate text-xs font-medium sm:text-sm">{tab.label}</span>}
        </button>
      </li>
    ))}
  </ul>
);

const ReportTableSection = ({ title, reportLabel, columns, rows }) => (
  <section className="global-tran-tab-div-ui !m-0 !p-4">
    <div className="global-tran-table-main-div-ui overflow-hidden">
      <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FontAwesomeIcon icon={faTableList} className="text-blue-600" />
          <span>{title}</span>
          <span className="ml-auto rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
            {rows.length.toLocaleString("en-US")} records
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <NoRecordsState reportLabel={`${reportLabel} - ${title}`} />
      ) : (
        <div
          className="min-h-[320px] max-h-[560px]"
          style={{ height: `${getTableHeight(rows.length)}px` }}
        >
          <SearchGlobalReportTable
            columns={columns}
            data={rows}
            itemsPerPage={50}
            docType={`${reportLabel} - ${title}`}
            totalExemptions={["rowNo", "acctCode", "rcCode", "usedPercent"]}
          />
        </div>
      )}
    </div>
  </section>
);

const SummaryMetricCard = ({ label, value, icon, tone }) => {
  const toneClass = {
    blue: { card: "border-blue-100 border-t-blue-600", icon: "bg-blue-50 text-blue-700", label: "text-blue-700" },
    sky: { card: "border-sky-100 border-t-sky-500", icon: "bg-sky-50 text-sky-700", label: "text-sky-700" },
    green: { card: "border-emerald-100 border-t-emerald-500", icon: "bg-emerald-50 text-emerald-700", label: "text-emerald-700" },
    violet: { card: "border-violet-100 border-t-violet-500", icon: "bg-violet-50 text-violet-700", label: "text-violet-700" },
    navy: { card: "border-blue-100 border-t-blue-800", icon: "bg-slate-100 text-blue-900", label: "text-blue-900" },
  }[tone];

  return (
    <div className={`flex min-h-[72px] min-w-0 flex-col justify-between rounded-lg border border-t-2 bg-white px-3 py-2 shadow-sm ${toneClass.card}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${toneClass.icon}`}>
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className={`min-w-0 truncate text-right text-[10px] font-bold uppercase ${toneClass.label}`} title={label}>
          {label}
        </div>
      </div>
      <div className="truncate text-right text-[15px] font-extrabold tabular-nums text-gray-900" title={value}>
        {value}
      </div>
    </div>
  );
};

const FilterModal = ({ filters, setFilters, activeMainTab, reportLabel, isLoading, onClose, onApply }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-[1px] sm:p-3"
    onClick={onClose}
  >
    <div
      className="flex max-h-[84vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-4xl sm:rounded-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-white px-3 py-2.5 sm:px-4 sm:py-3">
        <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-gray-800 sm:text-base">
          <FontAwesomeIcon icon={faFilter} className="text-[13px] text-blue-600 sm:text-sm" />
          <span>Filters - {reportLabel}</span>
        </h3>
        <button type="button" onClick={onClose} className="p-1 text-gray-500 transition hover:text-gray-800" disabled={isLoading}>
          <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      <div className="space-y-2.5 overflow-y-auto p-2.5 sm:space-y-3 sm:p-4">
        <ModalSection title="Budget Period">
          <FieldRenderer
            id="budgetYear"
            label="Budget Year"
            type="number"
            value={filters.budgetYear || currentYear}
            disabled={isLoading}
            onChange={(value) => setFilters({ budgetYear: String(value || "").slice(0, 4) })}
          />
          <DualLookup
            label="As of Period"
            nameLabel="Period Name"
            codeValue={filters.cutoffCode}
            nameValue={filters.cutoffName}
            modalType="cutoff"
            setFilters={setFilters}
            disabled={isLoading}
            onClear={() => setFilters({ cutoffCode: "", cutoffName: "" })}
          />
          {activeMainTab === "monthlyComparative" && (
            <FieldRenderer
              id="monthlyView"
              label="Monthly View"
              type="select"
              value={filters.monthlyView || "BUDGET"}
              disabled={isLoading}
              options={[
                { value: "BUDGET", label: "Budget" },
                { value: "ACTUAL", label: "Actual" },
                { value: "VARIANCE", label: "Variance" },
                { value: "USED_PCT", label: "% Used" },
              ]}
              onChange={(value) => setFilters({ monthlyView: value || "BUDGET" })}
            />
          )}
        </ModalSection>

        <ModalSection title="Budget Identifiers">
          <DualLookup
            label="Branch Code"
            nameLabel="Branch Name"
            codeValue={filters.branchCode}
            nameValue={filters.branchName}
            modalType="branch"
            setFilters={setFilters}
            disabled={isLoading}
            onClear={() => setFilters({ branchCode: "", branchName: "" })}
          />
          <DualLookup
            label="RC Code"
            nameLabel="RC Name"
            codeValue={filters.rcCode}
            nameValue={filters.rcName}
            modalType="rc"
            setFilters={setFilters}
            disabled={isLoading}
            onClear={() => setFilters({ rcCode: "", rcName: "" })}
          />
          <DualLookup
            label="Account Code"
            nameLabel="Account Name"
            codeValue={filters.acctCode}
            nameValue={filters.acctName}
            modalType="account"
            setFilters={setFilters}
            disabled={isLoading}
            onClear={() => setFilters({ acctCode: "", acctName: "" })}
          />
          <DualLookup
            label="Budget Code"
            nameLabel="Budget Item Name"
            codeValue={filters.budgetCode}
            nameValue={filters.budgetName}
            modalType="budgetItem"
            setFilters={setFilters}
            disabled={isLoading}
            onClear={() => setFilters({ budgetCode: "", budgetName: "" })}
          />
        </ModalSection>
      </div>

      <div className="border-t bg-gray-50 px-3 py-2.5 sm:px-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 sm:w-auto sm:min-w-[110px]"
          >
            <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5" />
            Close
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:min-w-[110px]"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ModalSection = ({ title, children }) => (
  <div className="rounded-lg border bg-slate-50/60 p-3 shadow-sm">
    <p className="mb-2 text-sm font-semibold text-gray-700">{title}</p>
    <div className="grid grid-cols-1 gap-2">{children}</div>
  </div>
);

const DualLookup = ({ label, nameLabel, codeValue, nameValue, modalType, setFilters, disabled, onClear }) => (
  <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-12">
    <div className="md:col-span-4">
      <FieldRenderer
        id={`${modalType}Code`}
        label={label}
        type="lookup"
        value={codeValue || ""}
        disabled={disabled}
        readOnly
        editableLookup
        onLookup={() => setFilters({ showLookupModal: true, modalType })}
        onClear={onClear}
        labelClassName="text-[10px] sm:text-xs"
      />
    </div>
    <div className="md:col-span-8">
      <FieldRenderer
        id={`${modalType}Name`}
        label={nameLabel}
        type="text"
        value={nameValue || ""}
        disabled
        readOnly
        labelClassName="text-[10px] sm:text-xs"
      />
    </div>
  </div>
);

const LookupManager = ({ filters, setFilters }) => {
  if (!filters.showLookupModal) return null;

  const close = () => setFilters({ showLookupModal: false, modalType: "" });

  if (filters.modalType === "branch") {
    return (
      <SearchBranchRef
        isOpen={filters.showLookupModal}
        onClose={(row) => {
          if (row) {
            setFilters({
              branchCode: row.branchCode || row.BRANCH_CODE || "",
              branchName: row.branchName || row.BRANCH_NAME || "",
            });
          }
          close();
        }}
      />
    );
  }

  if (filters.modalType === "rc") {
    return (
      <SearchRCMast
        isOpen={filters.showLookupModal}
        onClose={(row) => {
          if (row) {
            setFilters({
              rcCode: row.rcCode || row.RC_CODE || "",
              rcName: row.rcName || row.RC_NAME || "",
            });
          }
          close();
        }}
      />
    );
  }

  if (filters.modalType === "account") {
    return (
      <SearchCOAMast
        isOpen={filters.showLookupModal}
        title="Select Account Code"
        customParam="REQ_BUDGET"
        onClose={(row) => {
          if (row) {
            setFilters({
              acctCode: row.acctCode || row.code || "",
              acctName: row.acctName || row.description || "",
            });
          }
          close();
        }}
      />
    );
  }

  if (filters.modalType === "budgetItem") {
    return (
      <SearchBudItemRef
        isOpen={filters.showLookupModal}
        title="Search Budget Codes"
        groupOnly={false}
        customParam="NonGroup"
        onClose={(row) => {
          if (row) {
            setFilters({
              budgetCode: row.code || row.budgetCode || row.budget_code || "",
              budgetName:
                row.description || row.budgetName || row.budget_name || row.name || "",
            });
          }
          close();
        }}
      />
    );
  }

  if (filters.modalType === "cutoff") {
    return (
      <SearchCutOffRef
        isOpen={filters.showLookupModal}
        title="Select As of Period"
        customParam="All"
        onClose={(row) => {
          if (row) {
            setFilters({
              cutoffCode: row.cutoffCode || row.cutOffCode || row.code || "",
              cutoffName: row.cutoffName || row.cutOffName || row.name || "",
            });
          }
          close();
        }}
      />
    );
  }

  close();
  return null;
};

const MobileNav = ({ isOpen, activeMainTab, onClose, onSelect }) => (
  <div
    className={`fixed inset-0 z-50 transition-all duration-200 lg:hidden ${
      isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
    }`}
    onClick={onClose}
  >
    <div className={`absolute inset-0 bg-black/40 ${isOpen ? "opacity-100" : "opacity-0"}`} />
    <div className="absolute bottom-0 right-0 top-0 w-80 overflow-y-auto bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Budget Reports</h3>
        <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <MainTabList activeMainTab={activeMainTab} collapsed={false} onSelect={onSelect} />
    </div>
  </div>
);

const NoRecordsState = ({ reportLabel }) => (
  <div className="flex items-center justify-center p-10">
    <div className="w-full max-w-xl rounded-2xl border bg-slate-50/60 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <FontAwesomeIcon icon={faDatabase} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800">No records found</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">Try adjusting your filters.</div>
          <div className="mt-3 text-[11px] text-gray-500">Report: {reportLabel}</div>
        </div>
      </div>
      <div className="mt-4 text-xs text-gray-600">
        Tip: Open <b>Filter</b> and broaden the year, branch, RC, account, or budget selections.
      </div>
    </div>
  </div>
);

export default BudgetInquiry;
