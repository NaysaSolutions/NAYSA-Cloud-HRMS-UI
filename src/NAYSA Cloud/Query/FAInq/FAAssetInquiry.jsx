

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
  faUndo,
  faTimes,
  faFilter,
  faDatabase,
  faListOl,
  faHistory,
  faCalculator,
  faChartLine,
  faTableList,
  faSearch,
  faIdCard,
  faTag,
  faCamera,
  faPesoSign,
  faRecycle,
  faScaleBalanced,
} from "@fortawesome/free-solid-svg-icons";

import { fetchData, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useTopUserRow } from "@/NAYSA Cloud/Global/top1RefTable";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

// Lookups
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import SearchFACateg from "@/NAYSA Cloud/Lookup/SearchFACateg.jsx";
import SearchFAClass from "@/NAYSA Cloud/Lookup/SearchFAClass.jsx";
import SearchFALoc from "@/NAYSA Cloud/Lookup/SearchFALoc.jsx";
import SearchCutOffRef from "@/NAYSA Cloud/Lookup/SearchCutOffRef.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import SearchFAFind from "@/NAYSA Cloud/Lookup/SearchFAFind.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import BarcodeQrReaderModal from "@/NAYSA Cloud/Lookup/SearchGlobalQRBarCodeReader.jsx";

const DASHBOARD_AMOUNT_FIELDS = [
  { key: "acqCost", label: "Acq. Cost", icon: faPesoSign, tone: "blue" },
  { key: "deprMonth", label: "Depr. Month", icon: faCalculator, tone: "sky" },
  { key: "accumDepr", label: "Accum. Depr.", icon: faChartLine, tone: "violet" },
  { key: "salvageValue", label: "Salvage Value", icon: faRecycle, tone: "green" },
  { key: "nbValue", label: "NB Value", icon: faScaleBalanced, tone: "navy" },
];

const LAPSING_LABEL_MAP = {
  rowNo: "Row No.",
  ROW_NO: "Row No.",
  faCode: "Asset Code",
  tagNo: "Property Tag No.",
  barCode: "Barcode",
  qrCode: "QR Code",
  faName: "Asset Name",
  faDesc: "Asset Description",
  branchCode: "Branch Code",
  branchName: "Branch Name",
  flocCode: "Location Code",
  flocName: "Location Name",
  rcCode: "Department Code",
  rcName: "Department Name",
  categCode: "Category Code",
  categName: "Category Name",
  classCode: "Sub Category Code",
  className: "Sub Category Name",
  scheduleType: "Schedule Type",
  startingCutoff: "Starting Cut Off",
  endingCutoff: "Ending Cut Off",
  periodStart: "Period Start",
  periodEnd: "Period End",
  acqDate: "Acquisition Date",
  acqCost: "Acquisition Cost",
  deprMonth: "Depreciation Month",
  accumDepr: "Accumulated Depreciation",
  salvageValue: "Salvage Value",
  nbValue: "Net Book Value",
};

const LAPSING_DATE_FIELDS = ["periodStart", "periodEnd", "acqDate"];
const LAPSING_AMOUNT_FIELDS = ["acqCost", "deprMonth", "accumDepr", "salvageValue", "nbValue"];

const FA_STATUS_OPTIONS = [
  { value: "All", label: "All Assets" },
  { value: "A", label: "Active" },
  { value: "M", label: "Merged" },
  { value: "S", label: "Split" },
  { value: "D", label: "Disposed" },
  { value: "H", label: "Hold" },
];

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

const REPORT_TABLE_MIN_HEIGHT = 320;
const REPORT_TABLE_MAX_HEIGHT = 560;
const REPORT_TABLE_BASE_HEIGHT = 170;
const REPORT_TABLE_ROW_HEIGHT = 32;

const parseDashboardAmount = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDashboardAmount = (value) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatLapsingColumnLabel = (key) => {
  if (LAPSING_LABEL_MAP[key]) return LAPSING_LABEL_MAP[key];

  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const openPathUrlDocument = (row) => {
  if (!row?.pathUrl) return;
  const url = `${window.location.origin}${row.pathUrl}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const FAAssetInquiry = () => {
  const { companyInfo, currentUserRow, user } = useAuth();

  const [activeTab, setActiveTab] = useState("assetQuery");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isSwitchingTab, setIsSwitchingTab] = useState(false);
  const [showFAFindModal, setShowFAFindModal] = useState(false);
  const [faFindTagNo, setFaFindTagNo] = useState("");
  const tabSwitchTimerRef = useRef(null);
  const tabSwitchEndTimerRef = useRef(null);

  // ---------- Tabs Configuration ----------
  const tabConfigs = useMemo(() => ({
    assetQuery: {
      label: "Asset Query",
      icon: faSearch,
      endpoint: "getFAAssetQuery",
      filters: ["Branch", "Location", "Department", "Category", "Sub Category", "Asset Code", "Property Tag No.", "FA Status"]
    },
    assetHistory: {
      label: "Asset History",
      icon: faHistory,
      endpoint: "getFAAssetHistory",
      filters: ["Branch", "Location", "Department", "Category", "Sub Category", "Asset Code", "Property Tag No.", "Start Cut Off", "End Cut Off", "FA Status"]
    },
    deprHistory: {
      label: "Depreciation History",
      icon: faCalculator,
      endpoint: "getFADeprHistory",
      filters: ["Branch", "Location", "Department", "Category", "Sub Category", "Asset Code", "Property Tag No.", "Start Cut Off", "End Cut Off", "FA Status"]
    },
    lapsingSchedule: {
      label: "Lapsing Schedule",
      icon: faTableList,
      endpoint: "getFALapsingSchedule",
      filters: ["Branch", "Location", "Department", "Category", "Sub Category", "Property Tag No.", "Start Cut Off", "End Cut Off", "FA Status"]
    },
  }), []);

  // ---------- Filters (PER TAB) ----------
  const DEFAULT_FILTERS = useMemo(() => ({
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    flocCode: "", flocName: "", // Location
    rcCode: "", rcName: "", // Department
    categCode: "", categName: "", // Category
    classCode: "", className: "", // Sub Category / FA Class
    faCode: "", faName: "",
    tagNo: "",
    cutoffStartCode: companyInfo?.cutoffCode || "",
    cutoffStartName: companyInfo?.cutoffName || "",
    cutoffEndCode: companyInfo?.cutoffCode || "",
    cutoffEndName: companyInfo?.cutoffName || "",
    faStatus: "",
    showLookupModal: false,
    lookupType: "",
    modalType: "",
  }), [companyInfo, currentUserRow]);

  const [filtersByTab, setFiltersByTab] = useState(() => {
    const obj = {};
    Object.keys(tabConfigs).forEach((k) => (obj[k] = { ...DEFAULT_FILTERS }));
    return obj;
  });

  // ---------- View Results PER TAB ----------
  const EMPTY_VIEW = useMemo(() => ({ cols: [], rows: [], hasLoaded: false, isEmpty: false }), []);
  const [views, setViews] = useState(() => {
    const v = {};
    Object.keys(tabConfigs).forEach((k) => (v[k] = { ...EMPTY_VIEW }));
    return v;
  });

  const activeFilters = filtersByTab[activeTab] || DEFAULT_FILTERS;
  const view = views[activeTab] || EMPTY_VIEW;
  const activeTabConfig = tabConfigs[activeTab] || {
    label: "FA Inquiry",
    filters: [],
    icon: faListOl,
  };

  const currentContext = useMemo(() => {
    const contextParts = [];
    if (activeFilters.branchCode || activeFilters.branchName) {
      contextParts.push(
        `Branch: ${activeFilters.branchCode || "All"}${
          activeFilters.branchName ? ` - ${activeFilters.branchName}` : ""
        }`
      );
    }
    if (activeFilters.faCode) contextParts.push(`Asset: ${activeFilters.faCode}`);
    if (activeFilters.tagNo) contextParts.push(`Tag No.: ${activeFilters.tagNo}`);
    if (activeFilters.flocCode) contextParts.push(`Location: ${activeFilters.flocCode}`);
    if (activeFilters.rcCode) contextParts.push(`Department: ${activeFilters.rcCode}`);
    if (activeFilters.categCode) contextParts.push(`Category: ${activeFilters.categCode}`);
    if (activeFilters.classCode) contextParts.push(`Sub Category: ${activeFilters.classCode}`);
    if (activeFilters.faStatus) {
      const statusLabel = FA_STATUS_OPTIONS.find((option) => option.value === activeFilters.faStatus)?.label || activeFilters.faStatus;
      contextParts.push(`FA Status: ${statusLabel}`);
    }
    if (activeFilters.cutoffEndCode) {
      contextParts.push(`Cut Off: ${activeFilters.cutoffEndCode}`);
    }

    return contextParts.length ? contextParts.join(" | ") : "No filters applied yet";
  }, [activeFilters]);

  const dashboardTotals = useMemo(() => {
    const initialTotals = DASHBOARD_AMOUNT_FIELDS.reduce((totals, field) => {
      totals[field.key] = 0;
      return totals;
    }, {});

    if (!view.hasLoaded || !Array.isArray(view.rows)) return initialTotals;

    return view.rows.reduce((totals, row) => {
      DASHBOARD_AMOUNT_FIELDS.forEach((field) => {
        totals[field.key] += parseDashboardAmount(row?.[field.key]);
      });
      return totals;
    }, initialTotals);
  }, [view.hasLoaded, view.rows]);

  const tableViewportHeight = useMemo(() => {
    if (!view.hasLoaded || view.isEmpty) return undefined;

    const visibleRowCount = Math.max(1, Math.min(view.rows.length, 25));
    return Math.min(
      REPORT_TABLE_MAX_HEIGHT,
      Math.max(
        REPORT_TABLE_MIN_HEIGHT,
        REPORT_TABLE_BASE_HEIGHT + visibleRowCount * REPORT_TABLE_ROW_HEIGHT,
      ),
    );
  }, [view.hasLoaded, view.isEmpty, view.rows.length]);

  const updateFilters = useCallback((patch, tabKey = activeTab) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [tabKey]: { ...(prev[tabKey] || DEFAULT_FILTERS), ...patch },
    }));
  }, [activeTab, DEFAULT_FILTERS]);

  const applyToAllTabs = useCallback((patch) => {
    setFiltersByTab((prev) => {
      const next = { ...prev };
      Object.keys(tabConfigs).forEach((k) => {
        next[k] = { ...(next[k] || DEFAULT_FILTERS), ...patch };
      });
      return next;
    });
  }, [tabConfigs, DEFAULT_FILTERS]);

  useEffect(() => {
    setShowSpinner(isLoading);
  }, [isLoading]);

  useEffect(() => () => {
    clearTimeout(tabSwitchTimerRef.current);
    clearTimeout(tabSwitchEndTimerRef.current);
  }, []);

  const handleSelectTab = useCallback((tabKey, options = {}) => {
    if (!tabConfigs[tabKey]) return;
    if (options.closeMobile) setIsMobileNavOpen(false);
    if (tabKey === activeTab) return;

    clearTimeout(tabSwitchTimerRef.current);
    clearTimeout(tabSwitchEndTimerRef.current);
    setIsSwitchingTab(true);

    tabSwitchTimerRef.current = setTimeout(() => {
      setActiveTab(tabKey);
      tabSwitchEndTimerRef.current = setTimeout(() => {
        setIsSwitchingTab(false);
      }, 180);
    }, 50);
  }, [activeTab, tabConfigs]);

  // ---------- Query Logic ----------
  const buildJsonData = (tabKey, f) => {
    const data = { mode: "data", branchCode: f.branchCode };
    const filters = tabConfigs[tabKey].filters;

    if (filters.includes("Location")) data.flocCode = f.flocCode;
    if (filters.includes("Department")) data.rcCode = f.rcCode;
    if (filters.includes("Category")) data.categCode = f.categCode;
    if (filters.includes("Sub Category") || filters.includes("FA Class")) data.classCode = f.classCode;
    if (filters.includes("Asset Code") || filters.includes("Property Tag No.")) data.faCode = f.faCode;
    if (filters.includes("Property Tag No.")) data.tagNo = f.tagNo || "";
    if (filters.includes("Start Cut Off")) data.startingCutoff = f.cutoffStartCode;
    if (filters.includes("End Cut Off")) data.endingCutoff = f.cutoffEndCode;
    if (filters.includes("FA Status")) data.faStatus = f.faStatus || "";

    return data;
  };

  const formatMonthColumnLabel = (key) => {
    const match = String(key || "").match(/^month(\d{4})(\d{2})$/i);
    if (!match) return key;

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return key;

    return new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const parseLapsingAmount = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    const parsed = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const collectRowKeys = (rows) =>
    Array.from(
      rows.reduce((set, row) => {
        if (row && typeof row === "object") {
          Object.keys(row).forEach((key) => set.add(key));
        }
        return set;
      }, new Set()),
    );

  const buildLapsingScheduleView = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { rows: [], cols: [] };
    }

    const allKeys = collectRowKeys(rows);

    const monthKeys = allKeys
      .filter((key) => /^month\d{6}$/i.test(String(key)))
      .sort((a, b) => a.localeCompare(b));
    const monthKeySet = new Set(monthKeys);
    const baseKeys = allKeys.filter((key) => !monthKeySet.has(key));

    const baseCols = baseKeys.map((key) => ({
      key,
      label: formatLapsingColumnLabel(key),
      renderType:
        LAPSING_DATE_FIELDS.includes(key)
          ? "date"
          : LAPSING_AMOUNT_FIELDS.includes(key)
            ? "currency"
            : undefined,
      roundingOff: LAPSING_AMOUNT_FIELDS.includes(key) ? 2 : undefined,
      minWidth: key === "faName" ? 160 : 110,
      maxWidth: key === "faName" ? 240 : 180,
    }));

    const monthCols = monthKeys.map((key) => ({
      key,
      label: formatMonthColumnLabel(key),
      renderType: "currency",
      roundingOff: 2,
      minWidth: 120,
      maxWidth: 150,
    }));

    return {
      rows: rows.map((row) => {
        const normalized = { ...row };
        monthKeys.forEach((key) => {
          normalized[key] = parseLapsingAmount(row?.[key]);
        });
        LAPSING_AMOUNT_FIELDS.forEach((key) => {
          if (key in normalized) {
            normalized[key] = parseLapsingAmount(row?.[key]);
          }
        });
        return normalized;
      }),
      cols: [...baseCols, ...monthCols],
    };
  };

  const runTabQuery = useCallback(async (tabKey, f) => {
    setIsLoading(true);

    const config = tabConfigs[tabKey];
    const endpoint = config.endpoint;
    const isLapsingSchedule = tabKey === "lapsingSchedule";

    try {
      /*
        Lapsing Schedule:
        - Does not use hs_colconfig because its monthYYYYMM columns are dynamic.
        - Columns are generated from the returned result fields.

        Other tabs:
        - Continue using hs_colconfig through useSelectedHSColConfig(endpoint).
      */
      const colConfigPromise = isLapsingSchedule
        ? Promise.resolve([])
        : useSelectedHSColConfig(endpoint);

      const rowsPromise = postRequest(endpoint, {
        json_data: buildJsonData(tabKey, f),
      });

      const [colsResp, rowsResp] = await Promise.all([
        colConfigPromise,
        rowsPromise,
      ]);

      const resultStr = rowsResp?.data?.[0]?.result;
      const rows = resultStr ? JSON.parse(resultStr) : [];
      const finalRows = Array.isArray(rows) ? rows : (rows?.data || []);

      const viewData = isLapsingSchedule
        ? buildLapsingScheduleView(finalRows)
        : {
            rows: finalRows,
            cols: Array.isArray(colsResp) ? colsResp : [],
          };

      setViews((prev) => ({
        ...prev,
        [tabKey]: {
          cols: viewData.cols,
          rows: viewData.rows,
          hasLoaded: true,
          isEmpty: viewData.rows.length === 0,
          loadedAt: new Date().toISOString(),
        },
      }));
    } catch (e) {
      console.error(`FA Query error [${tabKey}]:`, e);
    } finally {
      setIsLoading(false);
    }
  }, [tabConfigs]);

  // ---------- Defaults ----------
  useEffect(() => {
    if (!user?.USER_CODE) return;
    (async () => {
      const [hsCompany, hsUser] = await Promise.all([
        fetchData("/getCompany"), // simplified example
        useTopUserRow(user?.USER_CODE),
      ]);
      if (hsUser) {
        applyToAllTabs({
          branchCode: hsUser.branchCode,
          branchName: hsUser.branchName,
        });
      }
    })();
  }, [user, applyToAllTabs]);

  const handleAction = (id) => {
    if (id === "find") setShowFilterModal(true);
    if (id === "assetFind") {
      setFaFindTagNo("");
      setShowFAFindModal(true);
    }
    if (id === "reset") {
      updateFilters(DEFAULT_FILTERS);
      setViews((prev) => ({ ...prev, [activeTab]: { ...EMPTY_VIEW } }));
    }
  };

  const handleViewAssetQueryRow = useCallback((row = {}) => {
    const selectedTagNo = String(row.tagNo || row.TAG_NO || row.assetTag || row.ASSET_TAG || "").trim();

    if (!selectedTagNo) {
      useSwalErrorAlert("Asset Query", "Property Tag No. is required to view the asset.");
      return;
    }

    setFaFindTagNo(selectedTagNo);
    setShowFAFindModal(true);
  }, []);

  return (
    <div className="global-ref-main-div-ui">
      {(showSpinner || isSwitchingTab) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              FA Inquiry
            </h1>
          </div>

          <div className="flex w-full md:w-auto md:justify-end">
            <div className="w-full overflow-visible md:w-auto">
              <div className="flex flex-nowrap items-center justify-center gap-2 md:justify-end">
                <button
                  onClick={() => setIsMobileNavOpen(true)}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:hidden"
                >
                  <FontAwesomeIcon icon={faBars} />
                </button>

                <button
                  onClick={() => handleAction("find")}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  <span className="ml-2 hidden lg:inline">Filter</span>
                </button>

                <button
                  onClick={() => handleAction("reset")}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faUndo} />
                  <span className="ml-2 hidden lg:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction("assetFind")}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                  title="Asset Finder"
                >
                  <FontAwesomeIcon icon={faIdCard} />
                  <span className="ml-2 hidden lg:inline">Asset Finder</span>
                </button>

                <button
                  onClick={() => setHideNav((v) => !v)}
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

      <div className="mt-32 px-0 sm:mt-24">
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
                        FA Reports
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Select a report, set filters, then load data.
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-[11px] font-semibold text-blue-700">
                      FA
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <ReportNavList
                    activeTab={activeTab}
                    tabConfigs={tabConfigs}
                    handleSelect={handleSelectTab}
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
                      <div className="text-base font-semibold text-gray-800">
                        {activeTabConfig.label}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        {currentContext}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    <SummaryMetricCard
                      label="Records Loaded"
                      value={view.hasLoaded ? view.rows.length.toLocaleString("en-US") : "0"}
                      icon={faDatabase}
                      tone="blue"
                      sub="Records"
                    />
                    {DASHBOARD_AMOUNT_FIELDS.map((field) => (
                      <SummaryMetricCard
                        key={field.key}
                        label={field.label}
                        value={formatDashboardAmount(dashboardTotals[field.key] || 0)}
                        icon={field.icon}
                        tone={field.tone}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="global-tran-tab-div-ui !m-0 !p-4">
              <div className="global-tran-table-main-div-ui">
                {!view.hasLoaded ? (
                  <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faDatabase} className="text-blue-300" />
                    <span>
                      Click <b>Filter</b> then <b>Apply Filters</b> to load{" "}
                      <b>{activeTabConfig.label}</b>.
                    </span>
                  </div>
                ) : view.isEmpty ? (
                  <NoRecordsState
                    title="No records found"
                    subtitle="Try adjusting your filters."
                    hint={`Report: ${activeTabConfig.label}`}
                  />
                ) : (
                  <div
                    className="min-h-[220px] max-h-[560px]"
                    style={{ height: `min(${tableViewportHeight}px, calc(100vh - 260px))` }}
                  >
                    <ActiveTabReportTable
                      activeTab={activeTab}
                      view={view}
                      onAssetQueryView={handleViewAssetQueryRow}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <FilterModal
          tabConfig={activeTabConfig}
          filters={activeFilters}
          onClose={() => setShowFilterModal(false)}
          onApply={(patch = {}) => {
            const nextFilters = { ...activeFilters, ...patch };
            setShowFilterModal(false);
            runTabQuery(activeTab, nextFilters);
          }}
          updateLookupState={updateFilters}
          isLoading={isLoading}
        />
      )}

      <LookupManager filters={activeFilters} updateFilters={updateFilters} />

      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        tabConfigs={tabConfigs}
        handleSelect={(key) => handleSelectTab(key, { closeMobile: true })}
      />

      <SearchFAFind
        isOpen={showFAFindModal}
        onClose={() => setShowFAFindModal(false)}
        initialBranchCode={activeFilters.branchCode}
        initialBranchName={activeFilters.branchName}
        initialTagNo={faFindTagNo}
        endingCutoff={activeFilters.cutoffEndCode}
      />
    </div>
  );
};

const ReportNavList = ({ activeTab, tabConfigs, handleSelect, collapsed }) => (
  <ul className="w-full space-y-2 text-sm">
    {Object.keys(tabConfigs).map((key) => {
      const config = tabConfigs[key];
      if (!config) return null;

      return (
        <li key={key} className="w-full">
          <button
            onClick={() => handleSelect(key)}
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
            <FontAwesomeIcon
              icon={config.icon || faListOl}
              className={`${collapsed ? "" : "mr-2"} text-[13px]`}
            />
            {!collapsed && (
              <span className="truncate text-xs font-medium sm:text-sm">
                {config.label || key}
              </span>
            )}
          </button>
        </li>
      );
    })}
  </ul>
);

const getReportTableKey = (tabKey, view) => `${tabKey}-${view.loadedAt || "idle"}`;

const AssetQueryReportTable = ({ view, onView }) => (
  <SearchGlobalReportTable
    key={getReportTableKey("assetQuery", view)}
    columns={view.cols}
    data={view.rows}
    itemsPerPage={50}
    docType="Asset Query"
    rightActionLabel="View"
    onRowAction={onView}
  />
);

const AssetHistoryReportTable = ({ view }) => (
  <SearchGlobalReportTable
    key={getReportTableKey("assetHistory", view)}
    columns={view.cols}
    data={view.rows}
    itemsPerPage={50}
    docType="Asset History"
    rightActionLabel="View"
    onRowAction={openPathUrlDocument}
  />
);

const DeprHistoryReportTable = ({ view }) => (
  <SearchGlobalReportTable
    key={getReportTableKey("deprHistory", view)}
    columns={view.cols}
    data={view.rows}
    itemsPerPage={50}
    docType="Depreciation History"
  />
);

const LapsingScheduleReportTable = ({ view }) => (
  <SearchGlobalReportTable
    key={getReportTableKey("lapsingSchedule", view)}
    columns={view.cols}
    data={view.rows}
    itemsPerPage={50}
    docType="Lapsing Schedule"
  />
);

const ActiveTabReportTable = ({ activeTab, view, onAssetQueryView }) => {
  switch (activeTab) {
    case "assetHistory":
      return <AssetHistoryReportTable view={view} />;
    case "deprHistory":
      return <DeprHistoryReportTable view={view} />;
    case "lapsingSchedule":
      return <LapsingScheduleReportTable view={view} />;
    case "assetQuery":
    default:
      return <AssetQueryReportTable view={view} onView={onAssetQueryView} />;
  }
};

const SummaryMetricCard = ({ label, value, icon, tone, sub = "" }) => {
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
    <div className={`flex min-h-[72px] min-w-0 flex-col justify-between rounded-lg border border-t-2 bg-white px-3 py-2 shadow-sm ${toneClass.card}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${toneClass.icon}`}>
          <FontAwesomeIcon icon={icon || faDatabase} />
        </div>
        <div className={`min-w-0 truncate text-right text-[10px] font-bold uppercase ${toneClass.label}`} title={label}>
          {label}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-right text-[15px] font-extrabold tabular-nums text-gray-900" title={value}>
          {value}
        </div>
        {sub ? <div className="truncate text-right text-[10px] text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
};

const NoRecordsState = ({ title, subtitle, hint }) => (
  <div className="flex items-center justify-center p-10">
    <div className="w-full max-w-xl rounded-2xl border bg-slate-50/60 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <FontAwesomeIcon icon={faDatabase} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800">{title}</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">{subtitle}</div>
          {hint ? <div className="mt-3 text-[11px] text-gray-500">{hint}</div> : null}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Tip: Open <b>Filter</b> and broaden the range or clear asset, branch,
        location, or department filters.
      </div>
    </div>
  </div>
);

const FilterModal = ({
  tabConfig,
  filters,
  onClose,
  onApply,
  updateLookupState,
  isLoading,
}) => {
  const clearCategoryAndClass = () =>
    updateLookupState({
      categCode: "",
      categName: "",
      classCode: "",
      className: "",
    });

  const hasAssetIdentifiers = tabConfig.filters.some((f) =>
    ["Branch", "Category", "Sub Category", "FA Class", "Asset Code"].includes(f)
  );
  const hasAssignments = tabConfig.filters.some((f) =>
    ["Location", "Department"].includes(f)
  );
  const hasCutoff = tabConfig.filters.some((f) =>
    ["Start Cut Off", "End Cut Off"].includes(f)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-[1px] sm:p-3"
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

          <button
            onClick={onClose}
            className="p-1 text-gray-500 transition hover:text-gray-800"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="space-y-2.5 overflow-y-auto p-2.5 sm:space-y-3 sm:p-4">
          {tabConfig.filters.includes("Property Tag No.") && (
            <ModalSection title="Property Tag Search">
              <div className="mx-auto w-full max-w-md">
                <TagNoSuggestFilter
                  value={filters.tagNo}
                  branchCode={filters.branchCode}
                  disabled={isLoading}
                  onChange={(value) => updateLookupState({ tagNo: value })}
                  onSelect={(row) => {
                    const patch = {
                      tagNo: "",
                      faCode: row?.faCode || row?.assetNo || row?.FA_CODE || filters.faCode || "",
                      faName: row?.faName || row?.assetDescription || row?.FA_NAME || filters.faName || "",
                    };

                    updateLookupState(patch);
                    onApply(patch);
                  }}
                  onClear={() => updateLookupState({ tagNo: "" })}
                />
              </div>
            </ModalSection>
          )}

          {hasAssetIdentifiers && (
            <ModalSection title="Asset Identifiers">
              {tabConfig.filters.includes("Branch") && (
                <DualFilterInput
                  labelCode="Branch Code"
                  labelName="Branch Name"
                  codeValue={filters.branchCode}
                  nameValue={filters.branchName}
                  modalType="branch"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ branchCode: "", branchName: "" })}
                />
              )}

              {tabConfig.filters.includes("Category") && (
                <DualFilterInput
                  labelCode="Category Code"
                  labelName="FA Category"
                  codeValue={filters.categCode}
                  nameValue={filters.categName}
                  modalType="category"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={clearCategoryAndClass}
                />
              )}

              {(tabConfig.filters.includes("Sub Category") ||
                tabConfig.filters.includes("FA Class")) && (
                <DualFilterInput
                  labelCode="Class Code"
                  labelName="Sub Category"
                  codeValue={filters.classCode}
                  nameValue={filters.className}
                  modalType="class"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ classCode: "", className: "" })}
                />
              )}

              {tabConfig.filters.includes("Asset Code") && (
                <DualFilterInput
                  labelCode="Asset Code"
                  labelName="Asset Name"
                  codeValue={filters.faCode}
                  nameValue={filters.faName}
                  modalType="asset"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ faCode: "", faName: "" })}
                  beforeLookup={() => {
                    if (String(filters.categCode || "").trim()) return true;
                    useSwalErrorAlert("Asset Code", "Category Code is required before selecting Asset Code.");
                    return false;
                  }}
                />
              )}

            </ModalSection>
          )}

          {hasAssignments && (
            <ModalSection title="Assignments">
              {tabConfig.filters.includes("Location") && (
                <DualFilterInput
                  labelCode="Location Code"
                  labelName="Location Name"
                  codeValue={filters.flocCode}
                  nameValue={filters.flocName}
                  modalType="location"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ flocCode: "", flocName: "" })}
                />
              )}

              {tabConfig.filters.includes("Department") && (
                <DualFilterInput
                  labelCode="Department Code"
                  labelName="Department Name"
                  codeValue={filters.rcCode}
                  nameValue={filters.rcName}
                  modalType="dept"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ rcCode: "", rcName: "" })}
                />
              )}
            </ModalSection>
          )}

          {hasCutoff && (
            <ModalSection title="Cut Off">
              {tabConfig.filters.includes("Start Cut Off") && (
                <DualFilterInput
                  labelCode="Start Cut Off"
                  labelName="Description"
                  codeValue={filters.cutoffStartCode}
                  nameValue={filters.cutoffStartName}
                  modalType="cutoffStart"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  allowClear={false}
                  onClear={() =>
                    updateLookupState({ cutoffStartCode: "", cutoffStartName: "" })
                  }
                />
              )}

              {tabConfig.filters.includes("End Cut Off") && (
                <DualFilterInput
                  labelCode="End Cut Off"
                  labelName="Description"
                  codeValue={filters.cutoffEndCode}
                  nameValue={filters.cutoffEndName}
                  modalType="cutoffEnd"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  allowClear={false}
                  onClear={() =>
                    updateLookupState({ cutoffEndCode: "", cutoffEndName: "" })
                  }
                />
              )}
            </ModalSection>
          )}

          {tabConfig.filters.includes("FA Status") && (
            <ModalSection title="FA Status">
              <FieldRenderer
                id="faStatus"
                label="FA Status"
                type="select"
                value={filters.faStatus || ""}
                disabled={isLoading}
                onChange={(value) => updateLookupState({ faStatus: value })}
                options={FA_STATUS_OPTIONS}
              />
            </ModalSection>
          )}
        </div>

        <div className="border-t bg-gray-50 px-3 py-2.5 sm:px-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 sm:min-w-[110px] sm:w-auto"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5" />
              Close
            </button>

            <button
              onClick={onApply}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 sm:min-w-[110px] sm:w-auto"
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5" />
              Apply
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

const TagNoSuggestFilter = ({
  value,
  branchCode,
  disabled,
  onChange,
  onSelect,
  onClear,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showQrReader, setShowQrReader] = useState(false);
  const suggestionRowsCacheRef = useRef({});

  const normalizeTagSuggestRow = (row = {}) => ({
    ...row,
    faCode: row?.faCode || row?.assetNo || row?.FA_CODE || "",
    tagNo: row?.tagNo || row?.assetTag || row?.TAG_NO || "",
    faName: row?.faName || row?.assetDescription || row?.FA_NAME || "",
  });

  const findExactTagMatch = (rows = [], tagNo = "") => {
    const lowerTagNo = String(tagNo || "").trim().toLowerCase();

    return rows.find((row) =>
      [row?.tagNo, row?.assetTag, row?.TAG_NO].some(
        (item) => String(item || "").trim().toLowerCase() === lowerTagNo
      )
    );
  };

  useEffect(() => {
    const cleanSearchText = String(value || "").trim();

    if (disabled || cleanSearchText.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setIsSuggestLoading(false);
      return undefined;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      const lowerSearchText = cleanSearchText.toLowerCase();
      const cacheKey = `${branchCode || ""}|${lowerSearchText}`;

      setIsSuggestLoading(true);

      try {
        let rawLookupRows = suggestionRowsCacheRef.current?.[cacheKey];

        if (!Array.isArray(rawLookupRows)) {
          const response = await postRequest("lookupFAMast", {
            PARAMS: JSON.stringify({
              json_data: {
                branchCode: branchCode || "",
                filter: "AutoSuggest",
                search: cleanSearchText,
                searchText: cleanSearchText,
                searchMode: "start",
                faCode: "",
                tagNo: "",
              },
            }),
          });

          rawLookupRows = extractLookupRows(response);
          suggestionRowsCacheRef.current = {
            ...(suggestionRowsCacheRef.current || {}),
            [cacheKey]: rawLookupRows,
          };
        }

        if (!isMounted) return;

        const filteredRows = rawLookupRows
          .filter((row) =>
            [row?.tagNo, row?.assetTag, row?.TAG_NO].some((item) =>
              String(item || "").toLowerCase().includes(lowerSearchText)
            )
          )
          .slice(0, 10)
          .map(normalizeTagSuggestRow);

        setSuggestions(filteredRows);
        setShowSuggestions(filteredRows.length > 0);
        setSelectedSuggestionIndex(filteredRows.length > 0 ? 0 : -1);
      } catch (error) {
        console.error("Property Tag No. suggestions error:", error);
        if (isMounted) {
          setSuggestions([]);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
      } finally {
        if (isMounted) setIsSuggestLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [branchCode, disabled, value]);

  const handleSelect = (row) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
    onSelect?.(row);
  };

  const validateAndSelectTagNo = async () => {
    const cleanTagNo = String(value || "").trim();
    if (!cleanTagNo || disabled || isSuggestLoading) return;

    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    const matchedSuggestion = findExactTagMatch(suggestions, cleanTagNo);
    if (matchedSuggestion) {
      handleSelect(normalizeTagSuggestRow(matchedSuggestion));
      return;
    }

    const cacheRows = Object.values(suggestionRowsCacheRef.current || {}).flat();
    const matchedCachedRow = findExactTagMatch(cacheRows, cleanTagNo);

    if (matchedCachedRow) {
      handleSelect(normalizeTagSuggestRow(matchedCachedRow));
      return;
    }

    setIsSuggestLoading(true);

    try {
      const lowerTagNo = cleanTagNo.toLowerCase();
      const response = await postRequest("lookupFAMast", {
        PARAMS: JSON.stringify({
          json_data: {
            branchCode: branchCode || "",
            filter: "AutoSuggest",
            search: cleanTagNo,
            searchText: cleanTagNo,
            searchMode: "start",
            faCode: "",
            tagNo: "",
          },
        }),
      });

      const matchedRow = findExactTagMatch(extractLookupRows(response), lowerTagNo);

      if (!matchedRow) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        useSwalErrorAlert("Property Tag No.", "Property Tag No. is not valid.");
        return;
      }

      handleSelect(normalizeTagSuggestRow(matchedRow));
    } catch (error) {
      console.error("Property Tag No. validation error:", error);
      useSwalErrorAlert("Property Tag No.", "Unable to validate Property Tag No.");
    } finally {
      setIsSuggestLoading(false);
    }
  };

  const handleQrScan = (scanValue) => {
    const cleanScanValue = String(scanValue || "").trim();
    if (!cleanScanValue) return;

    onChange?.(cleanScanValue);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
    setShowQrReader(false);
  };

  const hasSelectableSuggestions = showSuggestions && !isSuggestLoading && suggestions.length > 0;

  return (
    <div className="relative">
     
      <div className="flex h-10 items-center rounded-md border border-slate-300 bg-white shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <FontAwesomeIcon icon={faTag} className="ml-3 shrink-0 text-[13px] text-slate-400" />
        <input
          id="asset_query_tag_no"
          type="text"
          value={value || ""}
          disabled={disabled}
          autoComplete="off"
          placeholder="Type Property Tag No."
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-xs font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 disabled:text-slate-500"
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && hasSelectableSuggestions) {
              e.preventDefault();
              setSelectedSuggestionIndex((index) =>
                index < 0 ? 0 : (index + 1) % suggestions.length
              );
              return;
            }

            if (e.key === "ArrowUp" && hasSelectableSuggestions) {
              e.preventDefault();
              setSelectedSuggestionIndex((index) =>
                index <= 0 ? suggestions.length - 1 : index - 1
              );
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();
              validateAndSelectTagNo();
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              setShowSuggestions(false);
            }
          }}
        />

        {String(value || "").trim() && (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-red-600 disabled:opacity-50"
            onClick={() => {
              onClear?.();
              setSuggestions([]);
              setShowSuggestions(false);
              setSelectedSuggestionIndex(-1);
            }}
            disabled={disabled}
            title="Clear Property Tag No."
          >
            <FontAwesomeIcon icon={faTimes} className="text-[13px]" />
          </button>
        )}

        <button
          type="button"
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
          onClick={() => setShowQrReader(true)}
          disabled={disabled}
          title="Scan Property Tag"
        >
          <FontAwesomeIcon icon={faCamera} className="text-[13px]" />
        </button>
      </div>

      {(showSuggestions || isSuggestLoading) && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {isSuggestLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent border-t-transparent" />
              Loading suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">No suggestions found.</div>
          ) : (
            <div className="max-h-[220px] overflow-y-auto py-1">
              {suggestions.map((row, index) => (
                <button
                  type="button"
                  key={`${row.tagNo}-${row.faCode}-${index}`}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                    selectedSuggestionIndex === index
                      ? "bg-blue-50 ring-1 ring-inset ring-blue-100"
                      : "hover:bg-blue-50"
                  }`}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(row);
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800">
                      {row.tagNo || row.faCode}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">
                      Asset Code: {row.faCode || "-"}
                    </div>
                    {row.faName && (
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">
                        {row.faName}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                    Tag No.
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showQrReader && (
        <BarcodeQrReaderModal
          isOpen={showQrReader}
          title="Scan Property Tag QR Code"
          scanOnce={true}
          onScan={handleQrScan}
          onClose={() => setShowQrReader(false)}
        />
      )}
    </div>
  );
};

const DualFilterInput = ({
  labelCode,
  labelName,
  codeValue,
  nameValue,
  modalType,
  updateLookupState,
  disabled,
  onClear,
  allowClear = true,
  beforeLookup,
}) => {
  const codeId = `${modalType}_code`;
  const nameId = `${modalType}_name`;

  const openLookup = () => {
    if (disabled) return;
    if (beforeLookup && !beforeLookup()) return;
    updateLookupState({
      showLookupModal: true,
      lookupType: codeId,
      modalType,
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-12">
      <div className="md:col-span-4">
        <FieldRenderer
          id={codeId}
          label={labelCode}
          type="lookup"
          value={codeValue || ""}
          disabled={disabled}
          readOnly
          editableLookup={allowClear}
          onLookup={openLookup}
          onClear={allowClear ? onClear : undefined}
          labelClassName="text-[10px] sm:text-xs"
        />
      </div>

      <div className="md:col-span-8">
        <FieldRenderer
          id={nameId}
          label={labelName}
          type="text"
          value={nameValue || ""}
          disabled
          readOnly
          labelClassName="text-[10px] sm:text-xs"
        />
      </div>
    </div>
  );
};

const LookupManager = ({ filters, updateFilters }) => {
  const { showLookupModal, modalType } = filters;
  const { currentUserRow } = useAuth();
  const [faLookupRows, setFaLookupRows] = useState([]);
  const [faLookupColumns, setFaLookupColumns] = useState([]);
  const [isFaLookupLoading, setIsFaLookupLoading] = useState(false);

  useEffect(() => {
    if (!showLookupModal || modalType !== "asset") return;

    let isMounted = true;

    const loadAssetLookup = async () => {
      setIsFaLookupLoading(true);
      try {
        const lookupParams = {
          branchCode: filters.branchCode || "",
          flocCode: filters.flocCode || "",
          rcCode: filters.rcCode || "",
          categCode: filters.categCode || "",
          classCode: filters.classCode || "",
          filter: "",
        };

        const [response, colConfig] = await Promise.all([
          postRequest("lookupFAMast", {
            PARAMS: JSON.stringify({
              json_data: lookupParams,
            }),
          }),
          useSelectedHSColConfig("lookupFAMast", currentUserRow?.userCode || ""),
        ]);

        if (!isMounted) return;

        const lookupRows = extractLookupRows(response).map((row, index) => ({
          ...row,
          groupId: row?.groupId || row?.faCode || row?.FA_CODE || String(index + 1),
        }));

        if (lookupRows.length === 0) {
          useSwalErrorAlert("Fixed Asset Lookup", "No fixed assets found for the selected filters.");
        }

        setFaLookupRows(lookupRows);
        setFaLookupColumns(Array.isArray(colConfig) ? colConfig : []);
      } catch (error) {
        console.error("Failed to load fixed asset lookup:", error);
        if (isMounted) {
          setFaLookupRows([]);
          setFaLookupColumns([]);
          useSwalErrorAlert("Fixed Asset Lookup", "Unable to load fixed asset records.");
        }
      } finally {
        if (isMounted) setIsFaLookupLoading(false);
      }
    };

    loadAssetLookup();

    return () => {
      isMounted = false;
    };
  }, [
    currentUserRow?.userCode,
    filters.branchCode,
    filters.categCode,
    filters.classCode,
    filters.flocCode,
    filters.rcCode,
    modalType,
    showLookupModal,
  ]);

  if (!showLookupModal) return null;

  const close = () => {
    setFaLookupRows([]);
    setFaLookupColumns([]);
    updateFilters({ showLookupModal: false, modalType: "" });
  };

  switch (modalType) {
    case "branch":
      return <SearchBranchRef isOpen={showLookupModal} onClose={(row) => {
        if (row) updateFilters({ branchCode: row.branchCode, branchName: row.branchName });
        close();
      }} />;
    case "asset":
      return (
        <>
          {isFaLookupLoading && <LoadingSpinner />}
          <GlobalLookupModalv1
            isOpen={showLookupModal && !isFaLookupLoading}
            title="Fixed Asset Master"
            data={faLookupRows}
            endpoint={faLookupColumns}
            btnCaption="Get Selected Asset"
            onClose={(selectedItems) => {
              const selectedRow = Array.isArray(selectedItems?.records)
                ? selectedItems.records[0]
                : selectedItems?.records;

              if (selectedRow) {
                updateFilters({
                  faCode: selectedRow.faCode || selectedRow.FA_CODE || "",
                  faName: selectedRow.faName || selectedRow.assetDescription || selectedRow.FA_NAME || "",
                });
              }
              close();
            }}
            onCancel={close}
            singleSelect
          />
        </>
      );
    case "category":
      return <SearchFACateg isOpen={showLookupModal} onClose={(row) => {
        if (row) {
          updateFilters({
            categCode: row.code || row.categCode || row.categoryCode || "",
            categName: row.description || row.categName || row.categoryName || "",
            classCode: "",
            className: "",
          });
        }
        close();
      }} />;
    case "class":
      return (
        <SearchFAClass
          isOpen={showLookupModal}
          categCode={filters.categCode}
          onClose={(row) => {
            if (row) {
              updateFilters({
                classCode: row.code || row.classCode || "",
                className: row.description || row.className || row.assetSubCategory || "",
                categCode: row.categCode || row.categ_code || row.categoryCode || filters.categCode,
              });
            }
            close();
          }}
        />
      );
    case "dept":
      return <SearchRCMast isOpen={showLookupModal} onClose={(row) => {
        if (row) updateFilters({ rcCode: row.rcCode, rcName: row.rcName });
        close();
      }} />;
    case "location":
      return <SearchFALoc isOpen={showLookupModal} branchCode={filters.branchCode} onClose={(row) => {
        if (row) {
          updateFilters({
            flocCode: row.code || row.flocCode || row.floc_code || "",
            flocName: row.description || row.flocName || row.floc_name || "",
          });
        }
        close();
      }} />;
    case "cutoffStart":
    case "cutoffEnd":
      return <SearchCutOffRef isOpen={showLookupModal} onClose={(row) => {
        if (row) {
          const patch = modalType === "cutoffStart"
            ? { cutoffStartCode: row.cutoffCode, cutoffStartName: row.cutoffName }
            : { cutoffEndCode: row.cutoffCode, cutoffEndName: row.cutoffName };
          updateFilters(patch);
        }
        close();
      }} />;
    default:
      close(); return null;
  }
};

const MobileNavDrawer = ({ isOpen, onClose, activeTab, tabConfigs, handleSelect }) => (
  <div
    className={`fixed inset-0 z-50 transition-all duration-200 lg:hidden ${
      isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
    }`}
    onClick={onClose}
  >
    <div className={`absolute inset-0 bg-black/40 ${isOpen ? "opacity-100" : "opacity-0"}`} />

    <div
      className="absolute bottom-0 right-0 top-0 w-80 overflow-y-auto bg-white p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">FA Reports</h3>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <ReportNavList
        activeTab={activeTab}
        tabConfigs={tabConfigs}
        handleSelect={handleSelect}
        collapsed={false}
      />
    </div>
  </div>
);

export default FAAssetInquiry;
