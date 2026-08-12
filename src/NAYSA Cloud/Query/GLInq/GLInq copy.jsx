import React, { useState, useCallback, useMemo, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
  faFileExport,
  faPrint,
  faUndo,
  faDatabase,
  faTimes,
  faBars,
  faFilter,
  faFileLines,
  faChartSimple,
  faBalanceScale,
  faMoneyBillTrendUp,
  faCalendarDay,
  faReceipt,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";

import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
  useTopCutOffRow,
  useTopRCRow,
  useTopAccountRow,
  useTopSLRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchSLMast from "@/NAYSA Cloud/Lookup/SearchSLMast.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import SearchCutOffRef from "@/NAYSA Cloud/Lookup/SearchCutOffRef.jsx";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import CurrLookupModal from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";

/**
 * GLINQ.jsx
 * ✅ Remembers filter values per tab (filtersByTab)
 * ✅ Shows "No records found" empty card when rows empty
 * ✅ Option A: Loads columns + rows in parallel (Promise.all)
 * ✅ If active tab is slQuery -> jumpToGLQueryFromSL on row action
 * ✅ If active tab is tbQuery -> jumpToGLQueryFromTB on row action
 */
export default function GLINQ() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("glQuery");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const { companyInfo, currentUserRow } = useAuth();

  // ---------- Tabs ----------
  const tabConfigs = useMemo(() => {
    const commonYTD = ["Branch", "Cut Off", "RC Code", "Currency"];
    const commonQuery = [
      "Branch",
      "Account Code",
      "SL Code",
      "RC Code",
      "Start Cut Off",
      "End Cut Off",
    ];
    const slQueryFilters = ["Branch", "Account Code", "Cut Off"];
    const tbQueryFilters = ["Branch", "Cut Off", "RC Code","Currency"];
    const incExpFilters = [
      "Branch",
      "Starting Account",
      "Ending Account",
      "Start Cut Off",
      "End Cut Off",
      "Starting RC",
      "Ending RC",
    ];

   return {
    glQuery: { label: "GL Query", filters: commonQuery, icon: faFileLines },
    slQuery: { label: "SL Query", filters: slQueryFilters, icon: faReceipt },

    tbQuery: { label: "TB Query", filters: tbQueryFilters, icon: faBalanceScale },

    trialBalance: {
      label: "Trial Balance",
      filters: commonYTD,
      icon: faBalanceScale,
    },
    balSheetYTD: {
      label: "Balance Sheet YTD",
      filters: commonYTD,
      icon: faMoneyBillTrendUp,
    },
    incStatementYTD: {
      label: "Income Statement YTD",
      filters: commonYTD,
      icon: faChartSimple,
    },
    isMTD: {
      label: "Income Statement (MTD)",
      filters: ["Branch", "Start Cut Off", "End Cut Off", "Starting RC", "Ending RC", "Currency"],
      icon: faCalendarDay,
    },
    incExp: {
      label: "Income and Expense",
      filters: incExpFilters,
      icon: faWallet,
    },
  };
}, []);

  const TAB_ENDPOINTS = useMemo(
    () => ({
      glQuery: "getGLInquiry",
      slQuery: "getSLInquiry",

      // ✅ Map TB query endpoint (adjust if your API name differs)
      tbQuery: "getTBSummary",

      trialBalance: "getTBSummary",
      balSheetYTD: "getGLINQ_BalSheetYTD",
      incStatementYTD: "getGLINQ_IncomeStmtYTD",
      isMTD: "getGLINQ_IncomeStmtMTD",
      incExp: "getGLINQ_IncomeExpense",
    }),
    []
  );

  const tabKeys = useMemo(() => Object.keys(tabConfigs), [tabConfigs]);
  const currentTabLabel = tabConfigs[activeTab]?.label || "Report";
  const activeTabFilterConfig = tabConfigs[activeTab] || tabConfigs.glQuery;

  // ---------- Filters (PER TAB) ----------
  const DEFAULT_FILTERS = useMemo(
    () => ({
      branchCode: currentUserRow.branchCode,
      branchName: currentUserRow.branchName,

      currCode:companyInfo?.currCode||"",
      currName: companyInfo?.currName||"",

      // account
      accCode: "",
      accName: "",
      accCodeStart: "",
      accNameStart: "",
      accCodeEnd: "",
      accNameEnd: "",

      // sl
      slCode: "",
      slName: "",

      // rc
      rcCode: "",
      rcName: "",
      rcCodeStart: "",
      rcNameStart: "",
      rcCodeEnd: "",
      rcNameEnd: "",

      // cutoff
      cutoffCode: companyInfo.cutoffCode,
      cutoffName:companyInfo.cutoffName,
      cutoffStartCode: companyInfo.cutoffCode,
      cutoffStartName: companyInfo.cutoffName,
      cutoffEndCode: companyInfo.cutoffCode,
      cutoffEndName: companyInfo.cutoffName,

      // lookup
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    }),
    []
  );

  const [filtersByTab, setFiltersByTab] = useState(() => {
    const obj = {};
    Object.keys(tabConfigs).forEach((k) => (obj[k] = { ...DEFAULT_FILTERS }));
    return obj;
  });

  // Ensure any newly-added tabs get default filters
  useEffect(() => {
    setFiltersByTab((prev) => {
      const next = { ...prev };
      Object.keys(tabConfigs).forEach((k) => {
        if (!next[k]) next[k] = { ...DEFAULT_FILTERS };
      });
      return next;
    });
  }, [tabConfigs, DEFAULT_FILTERS]);

  // Active tab filters
  const filters = filtersByTab[activeTab] || DEFAULT_FILTERS;

  // Update active tab filters (or pass tabKey explicitly)
  const updateFilters = useCallback(
    (patch, tabKey = activeTab) => {
      setFiltersByTab((prev) => ({
        ...prev,
        [tabKey]: { ...(prev[tabKey] || DEFAULT_FILTERS), ...patch },
      }));
    },
    [activeTab, DEFAULT_FILTERS]
  );

  // Apply patch to ALL tabs (useful for default branch/cutoff)
  const applyToAllTabs = useCallback(
    (patch) => {
      setFiltersByTab((prev) => {
        const next = { ...prev };
        Object.keys(tabConfigs).forEach((k) => {
          next[k] = { ...(next[k] || DEFAULT_FILTERS), ...patch };
        });
        return next;
      });
    },
    [tabConfigs, DEFAULT_FILTERS]
  );

  // ---------- Loading spinner ----------
  const [isLoading, setIsLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => setShowSpinner(true), 200);
    else setShowSpinner(false);
    return () => clearTimeout(t);
  }, [isLoading]);

  // ---------- View state PER TAB ----------
  const EMPTY_VIEW = useMemo(
    () => ({
      cols: [],
      rows: [],
      rightActionLabel: "View",
      hasLoaded: false,
      appliedFilters: null,
      loadedAt: null,

      // empty-state flags
      isEmpty: false,
      emptyMessage: "",
    }),
    []
  );

  const [views, setViews] = useState(() => {
    const v = {};
    Object.keys(tabConfigs).forEach((k) => (v[k] = { ...EMPTY_VIEW }));
    return v;
  });

  useEffect(() => {
    setViews((prev) => {
      const next = { ...prev };
      Object.keys(tabConfigs).forEach((k) => {
        if (!next[k]) next[k] = { ...EMPTY_VIEW };
      });
      return next;
    });
  }, [tabConfigs, EMPTY_VIEW]);

  // ---------- Helpers ----------
 const buildPayloadForTab = useCallback(
  (tabKey, f) => {
    const needed = tabConfigs?.[tabKey]?.filters || [];
    const has = (name) => needed.includes(name);

    const p = {};
    if (has("Branch")) p.branchCode = f.branchCode || "";

    if (has("Account Code")) p.accCode = f.accCode || "";
    if (has("Starting Account")) p.accCodeStart = f.accCodeStart || "";
    if (has("Ending Account")) p.accCodeEnd = f.accCodeEnd || "";

    if (has("SL Code")) p.slCode = f.slCode || "";

    if (has("RC Code")) p.rcCode = f.rcCode || "";
    if (has("Starting RC")) p.rcCodeStart = f.rcCodeStart || "";
    if (has("Ending RC")) p.rcCodeEnd = f.rcCodeEnd || "";

    if (has("Currency")) p.currCode = f.currCode || "PHP";

    if (has("Cut Off")) p.cutoffCode = f.cutoffCode || "";
    if (has("Start Cut Off")) p.cutoffStart = f.cutoffStartCode || "";
    if (has("End Cut Off")) p.cutoffEnd = f.cutoffEndCode || "";

    return p;
  },
  [tabConfigs]
);



  const normalizeRows = (resp) => {
    const directRows =
      resp?.data?.rows ??
      resp?.data?.data ??
      resp?.data?.data?.rows ??
      resp?.data?.rowsData;

    if (Array.isArray(directRows)) return directRows;

    const jsonText = resp?.data?.[0]?.result;
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      const block = parsed?.[0] || {};
      const rows = block?.dt1 ?? block?.rows ?? block?.data ?? [];
      return Array.isArray(rows) ? rows : [];
    }
    return [];
  };

  const safeRightActionLabel = (maybeColsResp) => {
    if (maybeColsResp?.rightActionLabel) return maybeColsResp.rightActionLabel;
    return "View";
  };

  const buildJsonDataByTab = (tab, payload) => {
  switch (tab) {
    case "glQuery":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        acctCode: payload.accCode || "",
        sLCode: payload.slCode || "",
        rCode: payload.rcCode || "",
        startingCutoff: payload.cutoffStart || "",
        endingCutoff: payload.cutoffEnd || "",
      };

    case "slQuery":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        acctCode: payload.accCode || "",
        cutoffCode: payload.cutoffCode || "",
      };

    case "tbQuery":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        cutoffCode: payload.cutoffCode || "",
        rcCode: payload.rcCode || "",
        currCode: payload.currCode || "PHP",
      };

    case "trialBalance":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        acctCode: payload.accCode || "",
        rcCode: payload.rcCode || "",
        cutoffCode: payload.cutoffCode || "",
        currCode: payload.currCode || "PHP",
      };

    case "balSheetYTD":
    case "incStatementYTD":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        cutoffCode: payload.cutoffCode || "",
        rcCode: payload.rcCode || "",
        currCode: payload.currCode || "PHP",
      };

    case "isMTD":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        cutoffStart: payload.cutoffStart || "",
        cutoffEnd: payload.cutoffEnd || "",
        rcCodeStart: payload.rcCodeStart || "",
        rcCodeEnd: payload.rcCodeEnd || "",
        currCode: payload.currCode || "PHP",
      };

    case "incExp":
      return {
        mode: "data",
        branchCode: payload.branchCode || "",
        accCodeStart: payload.accCodeStart || "",
        accCodeEnd: payload.accCodeEnd || "",
        cutoffStart: payload.cutoffStart || "",
        cutoffEnd: payload.cutoffEnd || "",
        rcCodeStart: payload.rcCodeStart || "",
        rcCodeEnd: payload.rcCodeEnd || "",
      };

    default:
      return { ...payload, mode: "data" };
  }
};

  // -----------------------------
  // RUN QUERY (Option A: parallel header + data)
  // -----------------------------
  const runTabQuery = useCallback(
    async (tabKey, f) => {
      setIsLoading(true);

      const endpoint = TAB_ENDPOINTS[tabKey] || TAB_ENDPOINTS.glQuery;
      const payload = buildPayloadForTab(tabKey, f);
      const startedAt = new Date().toISOString();

      try {
        const [colsResp, rowsResp] = await Promise.all([
          useSelectedHSColConfig(endpoint),
          fetchData(endpoint, {
            json_data: { json_data: buildJsonDataByTab(tabKey, payload) },
          }),
        ]);

        const colsArray = Array.isArray(colsResp) ? colsResp : [];
        const finalRows = normalizeRows(rowsResp);
        const isEmpty = !finalRows || finalRows.length === 0;

        const finalView = {
          cols: colsArray,
          rows: finalRows,
          rightActionLabel: safeRightActionLabel(colsResp),
          hasLoaded: true,
          appliedFilters: payload,
          loadedAt: startedAt,
          isEmpty,
          emptyMessage: isEmpty ? "No records found for the selected filters." : "",
        };

        setViews((prev) => ({ ...prev, [tabKey]: finalView }));
      } catch (e) {
        console.error(`[GLINQ] runTabQuery failed for ${tabKey}:`, e);
        setViews((prev) => ({
          ...prev,
          [tabKey]: {
            ...(prev[tabKey] || EMPTY_VIEW),
            hasLoaded: true,
            isEmpty: true,
            emptyMessage: "Unable to load records. Please try again.",
            loadedAt: new Date().toISOString(),
          },
        }));
      } finally {
        setIsLoading(false);
        setHideNav(true);
      }
    },
    [TAB_ENDPOINTS, buildPayloadForTab, EMPTY_VIEW]
  );

  // -----------------------------
  // Parse GroupId for cross-jumps
  // -----------------------------
  const parseGroupId = useCallback((groupId, tabSource) => {
    if (!groupId) return null;

    // Split by either | or ~ and trim every resulting part
    const parts = String(groupId).split(/[|~]/).map((p) => p.trim());

    if (parts.length <= 1) return null;

    switch (tabSource) {
      case "slQuery": {
        const [branchCode, cutOffCode, acctCode, sltypeCode, slCode] = parts;
        return { branchCode, cutOffCode, acctCode, sltypeCode, slCode };
      }

      case "tbQuery": {
        const [tbCutOff, tbAcct, rcCode] = parts;
        return { cutOffCode: tbCutOff, acctCode: tbAcct, rcCode };
      }

      default:
        return null;
    }
  }, []);

  // -----------------------------
  // Jump from SL -> GL Query
  // -----------------------------
  const jumpToGLQueryFromSL = useCallback(
    async (row) => {
      const decoded = parseGroupId(row?.groupId, "slQuery");
      if (!decoded) return;

      const currentGL = filtersByTab.glQuery || DEFAULT_FILTERS;

      const [fBranch, fAcct, fPeriod, fSL] = await Promise.all([
        useTopBranchRow(decoded?.branchCode),
        useTopAccountRow(decoded?.acctCode),
        useTopCutOffRow(decoded?.cutOffCode),
        useTopSLRow(decoded?.slCode),
      ]);

      const glFilters = {
        ...currentGL,
        branchCode: decoded.branchCode,
        branchName: fBranch?.branchName || "",
        accCode: decoded.acctCode,
        accName: fAcct?.acctName || "",
        slCode: decoded.slCode,
        slName: fSL?.slName || "",
        cutoffStartCode: decoded.cutOffCode,
        cutoffStartName: fPeriod?.cutoffName || "",
        cutoffEndCode: decoded.cutOffCode,
        cutoffEndName: fPeriod?.cutoffName || "",
        rcCode: "",
        rcName: "",
        rcCodeStart: "",
        rcNameStart: "",
        rcCodeEnd: "",
        rcNameEnd: "",
      };

      updateFilters(glFilters, "glQuery");
      setActiveTab("glQuery");
      await runTabQuery("glQuery", glFilters);
    },
    [DEFAULT_FILTERS, filtersByTab, parseGroupId, runTabQuery, updateFilters]
  );

  // -----------------------------
  // Jump from TB -> GL Query
  // -----------------------------
  const jumpToGLQueryFromTB = useCallback(
    async (row) => {
      const decoded = parseGroupId(row?.groupId, "tbQuery");
      if (!decoded) return;

      const currentGL = filtersByTab.glQuery || DEFAULT_FILTERS;

      const [fAcct, fPeriod, fRC] = await Promise.all([
        useTopAccountRow(decoded?.acctCode),
        useTopCutOffRow(decoded?.cutOffCode),
        useTopRCRow(decoded?.rcCode),
      ]);

      const glFilters = {
        ...currentGL,
        branchCode: "",
        branchName: "",
        accCode: decoded.acctCode,
        accName: fAcct?.acctName || "",
        slCode: "",
        slName: "",
        cutoffStartCode: decoded.cutOffCode,
        cutoffStartName: fPeriod?.cutoffName || "",
        cutoffEndCode: decoded.cutOffCode,
        cutoffEndName: fPeriod?.cutoffName || "",
        rcCode: "",
        rcName: "",
        rcCodeStart: "",
        rcNameStart: "",
        rcCodeEnd: "",
        rcNameEnd: "",
      };

      updateFilters(glFilters, "glQuery");
      setActiveTab("glQuery");
      await runTabQuery("glQuery", glFilters);
    },
    [DEFAULT_FILTERS, filtersByTab, parseGroupId, runTabQuery, updateFilters]
  );

  // ---------- Actions ----------
  const handleFind = useCallback(() => setShowFilterModal(true), []);

  const handleApplyFilters = useCallback(async () => {
    setShowFilterModal(false);
    await runTabQuery(activeTab, filters);
  }, [activeTab, filters, runTabQuery]);

  const handleReset = useCallback(() => {
    updateFilters(
      {
        ...DEFAULT_FILTERS,
        branchCode: filters.branchCode,
        branchName: filters.branchName,
        cutoffCode: filters.cutoffCode,
        cutoffName: filters.cutoffName,
        cutoffStartCode: filters.cutoffStartCode,
        cutoffStartName: filters.cutoffStartName,
        cutoffEndCode: filters.cutoffEndCode,
        cutoffEndName: filters.cutoffEndName,
        currCode: companyInfo?.currCode||"",
        currName: companyInfo?.currName||"",
      },
      activeTab
    );

    setViews((prev) => ({ ...prev, [activeTab]: { ...EMPTY_VIEW } }));
  }, [activeTab, DEFAULT_FILTERS, EMPTY_VIEW, filters, updateFilters]);

  const handleExport = useCallback(
    () => alert(`Exporting ${currentTabLabel}`),
    [currentTabLabel]
  );
  const handlePrint = useCallback(() => window.print(), []);

  const onAction = (id) => {
    switch (id) {
      case "find":
        return handleFind();
      case "reset":
        return handleReset();
      case "export":
        return handleExport();
      case "print":
        return handlePrint();
      default:
        return;
    }
  };

  // ---------- Defaults ----------
  const loadDefaults = useCallback(async () => {
    try {
      const [hsCompany, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);

      if (hsCompany) {
        applyToAllTabs({
          cutoffCode: hsCompany.cutoffCode,
          cutoffName: hsCompany.cutoffName,
          cutoffStartCode: hsCompany.cutoffCode,
          cutoffStartName: hsCompany.cutoffName,
          cutoffEndCode: hsCompany.cutoffCode,
          cutoffEndName: hsCompany.cutoffName,
        });
      }

      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        applyToAllTabs({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults:", err);
    }
  }, [applyToAllTabs, user?.USER_CODE]);

  useEffect(() => {
    if (!user?.USER_CODE) return;
    (async () => {
      setViews((prev) => ({ ...prev, [activeTab]: { ...EMPTY_VIEW } }));
      await loadDefaults();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.USER_CODE, loadDefaults, EMPTY_VIEW]);

  const handleNavSelect = (key) => {
    updateFilters({ showLookupModal: false, lookupType: "", cutoffModalType: "" }, activeTab);
    setActiveTab(key);
    setIsMobileNavOpen(false);
  };

  return (
    <div className="global-tran-main-div-ui min-h-screen flex flex-col">
      {showSpinner && <LoadingSpinner />}

      <FixedActionBar
        onAction={onAction}
        tabLabel={currentTabLabel}
        setIsMobileNavOpen={setIsMobileNavOpen}
        hideNav={hideNav}
        setHideNav={setHideNav}
      />

      <div
        className={`flex flex-1 pt-[64px] md:pt-[56px] px-3 sm:px-10 lg:px-1 pb-2 ${
          hideNav ? "gap-2" : "lg:gap-2 gap-3"
        }`}
      >
        {/* Sidebar */}
        <aside
          className={`hidden lg:block flex-shrink-0 transition-all duration-200 ${
            hideNav ? "w-20" : "w-72 xl:w-80"
          }`}
        >
          <div className="global-tran-tab-div-ui h-full">
            <div
              className={`
                global-tran-table-main-div-ui h-full flex flex-col
                ${
                  hideNav
                    ? "bg-slate-50 border border-slate-200 rounded-2xl shadow-sm"
                    : "bg-white border rounded-xl shadow-sm"
                }
              `}
            >
              <div className="flex justify-start px-4 pt-3 pb-1">
                <button
                  onClick={() => setHideNav(!hideNav)}
                  className="w-10 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition"
                >
                  <FontAwesomeIcon icon={hideNav ? faChevronRight : faChevronLeft} />
                </button>
              </div>

              <div className={`border-b ${hideNav ? "hidden" : "px-4 pt-2 pb-2"}`}>
                {!hideNav && (
                  <>
                    <h2 className="text-lg font-bold text-gray-800 mb-1">GL Reports</h2>
                    <p className="text-xs text-gray-500">
                      Select a report then use Filter to apply filters.
                    </p>
                  </>
                )}
              </div>

              <div className={hideNav ? "px-2 py-4 flex-1" : "px-3 py-3 flex-1"}>
                <ReportNavList
                  activeTab={activeTab}
                  handleSelect={handleNavSelect}
                  tabConfigs={tabConfigs}
                  collapsed={hideNav}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Report Area */}
        <main className="flex-1 overflow-hidden transition-all duration-200">
          <div className="global-tran-tab-div-ui h-full">
            <div className="global-tran-table-main-div-ui bg-white rounded-xl shadow-sm border h-full">
              <div className="max-h-[95vh] overflow-y-auto relative">
                {tabKeys.map((tabKey) => {
                  const view = views[tabKey] || EMPTY_VIEW;
                  const tabFilter = filtersByTab[tabKey] || DEFAULT_FILTERS;

                  const shouldAutoGroup =
                    tabKey === "slQuery" && !(tabFilter.accCode || "").trim();
                  const initialState = shouldAutoGroup ? { groupBy: ["acctName"] } : undefined;

                  const tableKey = `${tabKey}-${view.loadedAt || "idle"}-${
                    shouldAutoGroup ? "G1" : "G0"
                  }`;

                  const columnsForTable =
                    tabKey !== "slQuery"
                      ? view.cols
                      : (Array.isArray(view.cols) ? view.cols : []).map((c) => {
                          const key =
                            c.accessorKey || c.accessor || c.field || c.id || "";
                          const headerTxt = String(c.header || c.Header || "")
                            .toLowerCase()
                            .trim();

                          const isGroupId =
                            key === "groupId" ||
                            headerTxt === "groupid" ||
                            headerTxt.includes("group id") ||
                            headerTxt === "group_id";

                          if (!isGroupId) return c;

                          return {
                            ...c,
                            cell: (info) => {
                              const original = info?.row?.original || {};
                              const value =
                                info?.getValue?.() ?? original?.groupId ?? "";

                              return (
                                <button
                                  type="button"
                                  className="text-blue-700 hover:underline font-semibold"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    jumpToGLQueryFromSL(original);
                                  }}
                                  title="Open GL Query using this Group ID"
                                >
                                  {value}
                                </button>
                              );
                            },
                          };
                        });

                  return (
                    <div
                      key={tabKey}
                      className={tabKey === activeTab ? "block" : "hidden"}
                    >
                      {!view.hasLoaded ? (
                        <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
                          <FontAwesomeIcon icon={faDatabase} className="text-blue-300" />
                          <span>
                            Click <b>Filter</b> then <b>Apply Filters</b> to load{" "}
                            <b>{tabConfigs[tabKey]?.label}</b>.
                          </span>
                        </div>
                      ) : view.isEmpty ? (
                        <NoRecordsState
                          title="No records found"
                          subtitle={view.emptyMessage || "Try adjusting your filters."}
                          hint={`Report: ${tabConfigs[tabKey]?.label || ""}`}
                        />
                      ) : (
                        <SearchGlobalReportTable
                          key={tableKey}
                          initialState={initialState}
                          columns={columnsForTable}
                          data={view.rows}
                          itemsPerPage={50}
                          rightActionLabel={view.rightActionLabel || "View"}
                          onRowAction={(row) => {
                            // ✅ YOUR REQUEST: route row action by active tab
                            if (activeTab === "slQuery") return jumpToGLQueryFromSL(row);
                            if (activeTab === "tbQuery") return jumpToGLQueryFromTB(row);

                            if (!row?.pathUrl) return;
                            const url = `${window.location.origin}${row.pathUrl}`;
                            window.open(url, "_blank", "noopener,noreferrer");
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showFilterModal && (
        <FilterModal
          tabConfig={activeTabFilterConfig}
          filters={filters}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilters}
          updateLookupState={updateFilters}
          isLoading={isLoading}
        />
      )}

      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        handleSelect={handleNavSelect}
        tabConfigs={tabConfigs}
      />

      <LookupManager filters={filters} updateFilters={updateFilters} />
    </div>
  );
}

// ------------------------------------------------------------------
// Empty State (No Records)
// ------------------------------------------------------------------
const NoRecordsState = ({ title, subtitle, hint }) => (
  <div className="p-10 flex items-center justify-center">
    <div className="w-full max-w-xl border rounded-xl bg-slate-50/60 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
          <FontAwesomeIcon icon={faDatabase} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800">{title}</div>
          <div className="text-xs text-gray-600 mt-1 leading-5">{subtitle}</div>
          {hint ? <div className="mt-3 text-[11px] text-gray-500">{hint}</div> : null}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Tip: Open <b>Filter</b>, broaden Cut Off range, or clear Account/RC/SL.
      </div>
    </div>
  </div>
);

// ------------------------------------------------------------------
// Navigation list
// ------------------------------------------------------------------
const ReportNavList = ({ activeTab, handleSelect, tabConfigs, collapsed }) => (
  <ul className="space-y-2 text-sm w-full">
    {Object.keys(tabConfigs).map((key) => {
      const config = tabConfigs[key];
      return (
        <NavItem
          key={key}
          label={config.label}
          icon={config.icon}
          isActive={activeTab === key}
          onClick={() => handleSelect(key)}
          collapsed={collapsed}
        />
      );
    })}
  </ul>
);

const NavItem = ({ label, icon, isActive, onClick, collapsed }) => (
  <li className="w-full">
    <button
      onClick={onClick}
      className={`
        flex items-center w-full rounded-lg text-left transition py-1.5
        ${collapsed ? "justify-center px-2" : "px-3"}
        ${
          isActive
            ? "bg-blue-600 text-white shadow"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
        }
      `}
      title={collapsed ? label : undefined}
    >
      <FontAwesomeIcon icon={icon} className={`w-4 h-4 ${collapsed ? "" : "mr-2"}`} />
      <span
        className={`
          text-xs sm:text-sm font-medium transition-all
          ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}
        `}
      >
        {!collapsed && label}
      </span>
    </button>
  </li>
);

// ------------------------------------------------------------------
// Mobile drawer
// ------------------------------------------------------------------
const MobileNavDrawer = ({ isOpen, onClose, activeTab, handleSelect, tabConfigs }) => {
  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-200 lg:hidden ${
        isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div className={`absolute inset-0 bg-black/50 ${isOpen ? "opacity-100" : "opacity-0"}`} />

      <div
        className="absolute right-0 top-0 bottom-0 w-80 bg-white p-4 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <FontAwesomeIcon icon={faBars} className="mr-2 text-blue-600" />
            Navigation
          </h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800">
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        <div className="px-1 mb-6">
          <ReportNavList
            activeTab={activeTab}
            handleSelect={handleSelect}
            tabConfigs={tabConfigs}
          />
        </div>

        <div className="pt-4 border-t mt-4 text-xs text-gray-500">
          <p className="font-semibold mb-1">Hint:</p>
          <p>
            Tap a report, then use the <span className="font-semibold">Filter</span> button at
            the top to set your filters.
          </p>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Fixed Action Bar
// ------------------------------------------------------------------
const ActionButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 text-xs font-medium rounded-md text-white ${
      label === "Filter"
        ? "bg-green-600 hover:bg-green-700"
        : "bg-blue-600 hover:opacity-90"
    }`}
  >
    <FontAwesomeIcon icon={icon} /> <span className="hidden lg:inline ml-2">{label}</span>
  </button>
);

const FixedActionBar = ({ onAction, tabLabel, setIsMobileNavOpen, hideNav, setHideNav }) => (
  <div
    className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur supports-backdrop-blur:bg-white/80 border-b shadow-sm"
    style={{ top: "56px", height: "48px" }}
  >
    <div className="flex justify-between items-center px-4 py-2">
      <div className="flex items-center">
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="p-2 mr-3 lg:hidden text-gray-600 hover:text-blue-600 rounded-lg transition"
        >
          <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
        </button>

        <span className="flex items-center px-3 py-1 rounded-md text-xs md:text-sm font-bold bg-blue-100 text-blue-700">
          <FontAwesomeIcon icon={faDatabase} className="w-4 h-4 mr-2" />
          GL Inquiry: {tabLabel}
        </span>

        <button
          onClick={() => setHideNav(!hideNav)}
          className="hidden lg:inline-flex ml-2 p-2 text-gray-600 hover:text-blue-600 rounded-lg transition"
          title={hideNav ? "Expand Navigation" : "Collapse Navigation"}
        >
          <FontAwesomeIcon icon={hideNav ? faChevronRight : faChevronLeft} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 lg:gap-2">
        <ActionButton icon={faMagnifyingGlass} label="Filter" onClick={() => onAction("find")} />
        <ActionButton icon={faUndo} label="Reset" onClick={() => onAction("reset")} />
        <ActionButton icon={faFileExport} label="Export" onClick={() => onAction("export")} />
        <ActionButton icon={faPrint} label="Print" onClick={() => onAction("print")} />
      </div>
    </div>
  </div>
);

// ------------------------------------------------------------------
// Filter Modal (your exact UI kept)
// ------------------------------------------------------------------
const FilterModal = ({ tabConfig, filters, onClose, onApply, updateLookupState, isLoading }) => {
  const hasBranchAcc = tabConfig.filters.some((f) =>
    ["Branch", "Account Code", "Starting Account", "Ending Account"].includes(f)
  );
  const hasSLRC = tabConfig.filters.some((f) =>
    ["SL Code", "RC Code", "Starting RC", "Ending RC"].includes(f)
  );
  const hasCutoff = tabConfig.filters.some((f) =>
    ["Cut Off", "Start Cut Off", "End Cut Off"].includes(f)
  );
  const hasCurrency = tabConfig.filters.includes("Currency");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <h3 className="text-[15px] sm:text-base font-semibold text-gray-800 flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
            <span className="tracking-wide">Filters – {tabConfig.label}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 p-1.5 transition"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto">
          {hasBranchAcc && (
            <ModalSection title="Branch & Account">
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

              {tabConfig.filters.includes("Account Code") && (
                <DualFilterInput
                  labelCode="Account Code"
                  labelName="Account Name"
                  codeValue={filters.accCode}
                  nameValue={filters.accName}
                  modalType="acc"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ accCode: "", accName: "" })}
                />
              )}

              {tabConfig.filters.includes("Starting Account") && (
                <DualFilterInput
                  labelCode="Starting Account"
                  labelName="Account Name"
                  codeValue={filters.accCodeStart}
                  nameValue={filters.accNameStart}
                  modalType="accStart"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ accCodeStart: "", accNameStart: "" })}
                />
              )}

              {tabConfig.filters.includes("Ending Account") && (
                <DualFilterInput
                  labelCode="Ending Account"
                  labelName="Account Name"
                  codeValue={filters.accCodeEnd}
                  nameValue={filters.accNameEnd}
                  modalType="accEnd"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ accCodeEnd: "", accNameEnd: "" })}
                />
              )}
            </ModalSection>
          )}

          {hasSLRC && (
            <ModalSection title="SL & Responsibility Center">
              {tabConfig.filters.includes("SL Code") && (
                <DualFilterInput
                  labelCode="SL Code"
                  labelName="SL Name"
                  codeValue={filters.slCode}
                  nameValue={filters.slName}
                  modalType="sl"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ slCode: "", slName: "" })}
                />
              )}

              {tabConfig.filters.includes("RC Code") && (
                <DualFilterInput
                  labelCode="RC Code"
                  labelName="RC Name"
                  codeValue={filters.rcCode}
                  nameValue={filters.rcName}
                  modalType="rc"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ rcCode: "", rcName: "" })}
                />
              )}

              {tabConfig.filters.includes("Starting RC") && (
                <DualFilterInput
                  labelCode="Starting RC"
                  labelName="RC Name"
                  codeValue={filters.rcCodeStart}
                  nameValue={filters.rcNameStart}
                  modalType="rcStart"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ rcCodeStart: "", rcNameStart: "" })}
                />
              )}

              {tabConfig.filters.includes("Ending RC") && (
                <DualFilterInput
                  labelCode="Ending RC"
                  labelName="RC Name"
                  codeValue={filters.rcCodeEnd}
                  nameValue={filters.rcNameEnd}
                  modalType="rcEnd"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ rcCodeEnd: "", rcNameEnd: "" })}
                />
              )}
            </ModalSection>
          )}

          {hasCutoff && (
            <ModalSection title="Cut Off Range">
              {tabConfig.filters.includes("Cut Off") && (
                <DualFilterInput
                  labelCode="Cut Off"
                  labelName="Description"
                  codeValue={filters.cutoffCode}
                  nameValue={filters.cutoffName}
                  modalType="cutoffSingle"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ cutoffCode: "", cutoffName: "" })}
                />
              )}

              {tabConfig.filters.includes("Start Cut Off") && (
                <DualFilterInput
                  labelCode="Start Cut Off"
                  labelName="Description"
                  codeValue={filters.cutoffStartCode}
                  nameValue={filters.cutoffStartName}
                  modalType="cutoffStart"
                  updateLookupState={updateLookupState}
                  disabled={isLoading}
                  onClear={() => updateLookupState({ cutoffStartCode: "", cutoffStartName: "" })}
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
                  onClear={() => updateLookupState({ cutoffEndCode: "", cutoffEndName: "" })}
                />
              )}
            </ModalSection>
          )}

          {hasCurrency && (
            <ModalSection title="Currency">
              <DualFilterInput
                labelCode="Currency Code"
                labelName="Currency Name"
                codeValue={filters.currCode}
                nameValue={filters.currName}
                modalType="currency"
                updateLookupState={updateLookupState}
                disabled={isLoading}
                onClear={() =>
                  updateLookupState({
                    currCode: "PHP",
                    currName: "Philippine Peso",
                  })
                }
              />
            </ModalSection>
          )}
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border hover:bg-gray-100 transition"
            disabled={isLoading}
          >
            Close
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition inline-flex items-center gap-1.5 disabled:opacity-60"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="w-4 h-4" />
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalSection = ({ title, children }) => (
  <div className="border rounded-lg p-3 bg-slate-50/60 shadow-sm">
    <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>
    <div className="grid grid-cols-1 gap-2">{children}</div>
  </div>
);

const DualFilterInput = ({
  labelCode,
  labelName,
  codeValue,
  nameValue,
  modalType,
  updateLookupState,
  disabled,
  onClear,
}) => {
  const codeId = `${modalType}_code`;
  const nameId = `${modalType}_name`;

  const hasValue =
    (codeValue ?? "").toString().trim() !== "" || (nameValue ?? "").toString().trim() !== "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
      {/* CODE */}
      <div className="md:col-span-4">
        <div className="relative">
          <input
            type="text"
            id={codeId}
            placeholder=" "
            value={codeValue || ""}
            readOnly
            className="peer global-tran-textbox-ui cursor-pointer py-2 text-xs sm:text-sm pr-[86px]"
            disabled={disabled}
          />
          <label htmlFor={codeId} className="global-tran-floating-label text-[10px] sm:text-xs">
            {labelCode}
          </label>

          <div className="absolute right-0 top-0 bottom-0 flex">
            {/* Search */}
            <button
              type="button"
              className="w-10 flex items-center justify-center bg-blue-600 text-white rounded-r-none hover:bg-blue-700 transition disabled:opacity-60"
              onClick={() =>
                updateLookupState({
                  showLookupModal: true,
                  lookupType: codeId,
                  cutoffModalType: modalType,
                })
              }
              title={`Find ${labelCode}`}
              disabled={disabled}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>

            {/* Clear */}
            <button
              type="button"
              className={`w-10 flex items-center justify-center border-l bg-white text-gray-600 rounded-r-md hover:bg-gray-100 transition disabled:opacity-60 ${
                !hasValue ? "opacity-40 cursor-not-allowed" : ""
              }`}
              onClick={() => hasValue && onClear?.()}
              title={`Clear ${labelCode}`}
              disabled={disabled || !hasValue}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      </div>

      {/* NAME */}
      <div className="md:col-span-8">
        <div className="relative">
          <input
            type="text"
            id={nameId}
            placeholder=" "
            value={nameValue || ""}
            readOnly
            className="peer global-tran-textbox-ui py-2 text-xs sm:text-sm"
            disabled={disabled}
          />
          <label htmlFor={nameId} className="global-tran-floating-label text-[10px] sm:text-xs">
            {labelName}
          </label>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Lookup Manager
// ------------------------------------------------------------------
const LookupManager = ({ filters, updateFilters }) => {
  const { showLookupModal, cutoffModalType } = filters;
  if (!showLookupModal) return null;

  const close = () =>
    updateFilters({
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });

  const handleBranchSelect = (row) => {
    updateFilters({
      branchCode: row.branchCode || row.brCode || row.code,
      branchName: row.branchName || row.brName || row.name,
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
  };

  const handleAccountSelect = (row) => {
    const code = row.acctCode;
    const name = row.acctName;

    if (cutoffModalType === "accStart") updateFilters({ accCodeStart: code, accNameStart: name });
    else if (cutoffModalType === "accEnd") updateFilters({ accCodeEnd: code, accNameEnd: name });
    else updateFilters({ accCode: code, accName: name });

    updateFilters({ showLookupModal: false, lookupType: "", cutoffModalType: "" });
  };

  const handleSLSelect = (row) => {
    updateFilters({
      slCode: row.slCode,
      slName: row.slName,
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
  };

  const handleRCSelect = (row) => {
    const rcCode = row.rcCode || row.rc_code || row.code;
    const rcName = row.rcName || row.rc_name || row.name;

    if (cutoffModalType === "rcEnd") updateFilters({ rcCodeEnd: rcCode, rcNameEnd: rcName });
    else if (cutoffModalType === "rcStart")
      updateFilters({ rcCodeStart: rcCode, rcNameStart: rcName });
    else updateFilters({ rcCode, rcName });

    updateFilters({ showLookupModal: false, lookupType: "", cutoffModalType: "" });
  };

  const handleCutoffSelect = (row) => {
    const cutCode = row.cutoffCode || row.cutOffCode || row.code;
    const cutName = row.cutoffName || row.cutOffName || row.name;

    if (cutoffModalType === "cutoffStart")
      updateFilters({ cutoffStartCode: cutCode, cutoffStartName: cutName });
    else if (cutoffModalType === "cutoffEnd")
      updateFilters({ cutoffEndCode: cutCode, cutoffEndName: cutName });
    else updateFilters({ cutoffCode: cutCode, cutoffName: cutName });

    updateFilters({ showLookupModal: false, lookupType: "", cutoffModalType: "" });
  };

  const handleCurrencySelect = (row) => {
    updateFilters({
      currCode: row.currCode || "PHP",
      currName: row.currName ||  "Philippine Peso",
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
  };

  switch (cutoffModalType) {
    case "branch":
      return <SearchBranchRef isOpen={showLookupModal} onClose={handleBranchSelect} />;

    case "sl":
      return <SearchSLMast isOpen={showLookupModal} onClose={handleSLSelect} context="sl" />;

    case "acc":
    case "accStart":
    case "accEnd":
      return (
        <COAMastLookupModal
          isOpen={showLookupModal}
          onClose={handleAccountSelect}
          context={cutoffModalType}
        />
      );

    case "rc":
    case "rcStart":
    case "rcEnd":
      return <SearchRCMast isOpen={showLookupModal} onClose={handleRCSelect} context="rc" />;

    case "cutoffSingle":
    case "cutoffStart":
    case "cutoffEnd":
      return (
        <SearchCutOffRef
          isOpen={showLookupModal}
          onClose={handleCutoffSelect}
          context={cutoffModalType}
        />
      );

    case "currency":
      return (
        <CurrLookupModal
          isOpen={showLookupModal}
          onClose={handleCurrencySelect}
          context={cutoffModalType}
        />
      );

    default:
      close();
      return null;
  }
};
