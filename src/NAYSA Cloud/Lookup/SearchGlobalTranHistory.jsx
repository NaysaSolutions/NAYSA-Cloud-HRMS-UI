// SearchGlobalTranHistory.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import { exportGenericHistoryExcel, exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";

import {
  format,
  subDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import Modal from "react-modal";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faPen,
  faCalendarAlt,
  faFilter,
  faDownload,
  faRedo,
  faArrowUp,
  faArrowDown,
  faEye,
  faLayerGroup,
  faChevronRight,
  faChevronDown,
  faTimes,
  faCompressArrowsAlt,
  faExpandArrowsAlt,
  faFileExcel,
  faColumns,
  faFilePdf,
  faFileImage,
  faFileExport,
  faFileCsv,
  faTable,
  faThLarge,
  faBook,
  faSearch,
  faGripVertical,
} from "@fortawesome/free-solid-svg-icons";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import Header, { HeaderSpacer } from "@/NAYSA Cloud/Components/Header";
import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

Modal.setAppElement("#root");

const ACTION_COL_WIDTH = 64;
const MOBILE_MAX_COLUMNS = 100;

const LoadingDots = ({ label = "Loading, please wait...", fullScreen = false }) => {
  const dotSizeClass = fullScreen ? "h-2.5 w-2.5" : "h-1.5 w-1.5";
  const dots = (
    <div className={`flex items-center justify-center ${fullScreen ? "gap-1.5" : "gap-1"}`} aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={`${dotSizeClass} rounded-full bg-blue-600 animate-bounce`}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="flex items-center justify-center h-4 w-8" title={label}>
        {dots}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/10" />
      <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/40 shadow-2xl">
        {dots}
        <div className="text-xs sm:text-sm font-medium text-slate-700 tracking-wide text-center">
          {label}
        </div>
      </div>
    </div>
  );
};

/* ------------------ window-level cache (survives route swaps) ------------------ */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_HISTORY_CACHE__) window.__NAYSA_HISTORY_CACHE__ = {};
    return window.__NAYSA_HISTORY_CACHE__;
  }
  return {};
}

/* ---------------- Formatting helpers ---------------- */
const formatCellValue = (value, config) => {
  if (value === null || value === undefined) return "—";

  switch (config?.renderType) {
    case "date": {
      try {
        const datePart = String(value).split("T")[0];
        return useReturnToDate(datePart);
      } catch {
        return String(value);
      }
    }

    case "currency":
    case "number": {
      const num = Number(String(value).replace(/,/g, ""));
      if (Number.isNaN(num)) return String(value);
      const digits = typeof config?.roundingOff === "number" ? config.roundingOff : 2;
      return num.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    }

    case "status": {
      const map = {
        C: { text: "CLOSED", color: "text-blue-800" },
        F: { text: "FINALIZED", color: "text-blue-800" },
        X: { text: "CANCELLED", color: "text-red-600" },
        AC: { text: "ACCOUNTING CLOSED", color: "text-blue-800" },
        R: { text: "RELEASED", color: "text-blue-800" },
        "": { text: "OPEN", color: "text-black" },
      };
      if (config?.isWoTab) {
        map.AC = { text: "ACCOUNTING CLOSED", color: "text-blue-800" };
        map.R = { text: "RELEASED", color: "text-blue-800" };
      }
      const normalizedValue = String(value ?? "").toUpperCase();
      const sty = map[normalizedValue];
      if (!sty) return String(value);
      return <span className={sty.color + " font-semibold"}>{sty.text}</span>;
    }

    default:
      return String(value);
  }
};

const parseNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
};

const isNumericColumn = (col) =>
  col?.renderType === "number" || col?.renderType === "currency";


/* ============================== Component =============================== */
const AllTranHistory = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state || {};

  const {
    endpoint: endpointProp,
    activeTabKey: activeTabKeyProp,
    branchCode: branchCodeProp,
    startDate: startDateProp,
    endDate: endDateProp,
    status: statusProp,
    statusOptions: statusOptionsProp,
    prefillSearchFields: prefillProp,
    onRowDoubleClick,
    showHeader: showHeaderProp,
    cacheKey: cacheKeyProp,
    historyExportName: historyExportNameProp,
    isActive = true,
    quantityDecimals,
    amountDecimals,
  } = props || {};

  const didInitRef = useRef(false);
  const hydratedFromCacheRef = useRef(false);
  const exportContainerRef = useRef(null);
  const tableScrollRef = useRef(null);
  const resizingRef = useRef(null);
  const wasActiveRef = useRef(isActive);

  const { currentUserRow, companyInfo } = useAuth();

  const endpoint =
    (endpointProp !== undefined && endpointProp) ||
    (navState.endpoint !== undefined && navState.endpoint);

  const baseKey =
    (typeof cacheKeyProp === "string" && cacheKeyProp) ||
    (typeof endpoint === "string" && endpoint) ||
    "HISTORY";

  const backToPath = navState.backToPath;
  const embedded =
    typeof onRowDoubleClick === "function" ||
    endpointProp !== undefined ||
    cacheKeyProp !== undefined;

  const showHeader = showHeaderProp !== undefined ? showHeaderProp : !embedded;

  const [activeTab, setActiveTab] = useState(null);

  const fallbackStatusOptions = [
    { value: "All", label: "All Status" },
    { value: "F", label: "FINALIZED" },
    { value: "C", label: "CLOSED" },
    { value: "", label: "OPEN" },
    { value: "X", label: "CANCELLED" },
    { value: "AC", label: "ACCOUNTING CLOSED" },
    { value: "R", label: "RELEASED" },
  ];

  const restrictedTabs = ["JO_", "PO_", "PR_","SO_","WO_"];
  const isRestricted = restrictedTabs.some((prefix) => activeTab?.includes(prefix));
  const isWoTab = activeTab?.includes("WO_");

  const statusOptions =
    Array.isArray(statusOptionsProp) && statusOptionsProp.length
      ? statusOptionsProp
      : fallbackStatusOptions.filter((opt) => {
          if (["AC", "R"].includes(opt.value) && !isWoTab) return false;
          if (isRestricted) return opt.value !== "F";
          return opt.value !== "C";
        });

  const getColumnConfig = useCallback(
    async (groupId) => {
      try {
        const response = await useSelectedHSColConfig(groupId, currentUserRow?.userCode || "");
        let config = [];

        if (Array.isArray(response)) config = response;
        else if (
          response &&
          response.success &&
          response.data &&
          response.data[0] &&
          response.data[0].result
        ) {
          const parsed = JSON.parse(response.data[0].result || "[]");
          config = Array.isArray(parsed) ? parsed : [];
        } else if (response && Array.isArray(response.data)) {
          config = response.data;
        }

        config = (config || []).map((c) => {
          const label =
            c.label ||
            String(c.key || "")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (ch) => ch.toUpperCase());
          const numericName = `${c.key || ""} ${label}`.toLowerCase();
          const isQuantity = /qty|quantity/.test(numericName);
          const isAmount = /amt|amount|cost/.test(numericName);
          const forcedDecimals =
            isQuantity && typeof quantityDecimals === "number"
              ? quantityDecimals
              : isAmount && typeof amountDecimals === "number"
                ? amountDecimals
                : undefined;

          return {
            key: c.key,
            label,
            classNames: c.classNames || "text-left",
            renderType: forcedDecimals !== undefined ? "number" : c.renderType || "text",
            renderFormat: c.renderFormat || "",
            isWoTab: String(groupId || "").includes("WO_"),
            roundingOff:
              forcedDecimals !== undefined
                ? forcedDecimals
                : typeof c.roundingOff === "number"
                  ? c.roundingOff
                  : undefined,
            sortable: c.sortable !== false,
            hidden: !!c.hidden,
            width: c.width,
          };
        });

        return config;
      } catch (err) {
        console.error("❌ Column config fetch failed for", groupId, err);
        return [];
      }
    },
    [amountDecimals, currentUserRow?.userCode, quantityDecimals]
  );

  const initialDates = useCallback(() => {
    if (startDateProp && endDateProp) return [new Date(startDateProp), new Date(endDateProp)];
    if (navState.startDate && navState.endDate)
      return [new Date(navState.startDate), new Date(navState.endDate)];
    return [startOfMonth(new Date()), endOfMonth(new Date())];
  }, [startDateProp, endDateProp, navState.startDate, navState.endDate]);

  const normalizeStatus = (v) => (v === "" ? "All" : v ?? "All");

  const [dateRangeType, setDateRangeType] = useState(
    (startDateProp && endDateProp) || (navState.startDate && navState.endDate)
      ? "Custom Range": "This Month"
  );

  const [dates, setDates] = useState(initialDates());
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [status, setStatus] = useState(() => normalizeStatus(statusProp));
  const [searchFields, setSearchFields] = useState(prefillProp || navState.prefillSearchFields || {});
  const [tabData, setTabData] = useState({});
  const [tabConfigs, setTabConfigs] = useState({});
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
    tabKey: null,
  });

  const [granularity, setGranularity] = useState("day");

  /* -------- table states -------- */
  const [columnOrderByTab, setColumnOrderByTab] = useState({});
  const [groupByByTab, setGroupByByTab] = useState({});
  const [expandedGroupsByTab, setExpandedGroupsByTab] = useState({});
  const [autoExpandGroupsByTab, setAutoExpandGroupsByTab] = useState({});
  const [draggedCol, setDraggedCol] = useState(null);
  const [colWidthsByTab, setColWidthsByTab] = useState({});
  const [userHiddenColsByTab, setUserHiddenColsByTab] = useState({});
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const [columnChooserSearch, setColumnChooserSearch] = useState("");
  const [columnChooserDraftHidden, setColumnChooserDraftHidden] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // New features mirrored from ReportTable
  const [globalSearch, setGlobalSearch] = useState("");
  const [autoFillGridState, setAutoFillGridState] = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [useCardView, setUseCardView] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const [branchCode, setBranchCode] = useState(
    (branchCodeProp !== undefined && branchCodeProp) ||
      (navState.branchCode !== undefined && navState.branchCode) ||
      ""
  );

  const [appliedFilters, setAppliedFilters] = useState(() => {
    const [startDate, endDate] = initialDates();
    return {
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
      branchCode:
        (branchCodeProp !== undefined && branchCodeProp) ||
        (navState.branchCode !== undefined && navState.branchCode) ||
        "",
    };
  });

  const [exportModal, setExportModal] = useState({
        isOpen: false,
        title: "Export File",
        confirmText: "Export",
        defaultFileName: "",
        type: null,
      });

  // Handle external clicks for menus
  useEffect(() => {
    const onDown = (e) => {
      if (!e.target.closest?.("[data-sgrt-export]")) setShowExportMenu(false);
      if (!e.target.closest?.("[data-sgrt-cols]")) setShowColumnChooser(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setUseCardView(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------------- restore from window cache ---------------- */
  useEffect(() => {
    const cache = getGlobalCache();
    let snap = cache[baseKey];

    const incomingBranch =
      (branchCodeProp !== undefined && branchCodeProp) ||
      (navState.branchCode !== undefined && navState.branchCode) ||
      "";

    if (snap && incomingBranch && snap.branchCode && snap.branchCode !== incomingBranch) {
      delete cache[baseKey];
      snap = undefined;
    }

    if (snap) {
      hydratedFromCacheRef.current = true;
      setDates(snap.dates || initialDates());
      setDateRangeType(snap.dateRangeType || "This Month");

      const desired =
        statusProp !== undefined
          ? normalizeStatus(statusProp)
          : snap.status !== undefined
          ? normalizeStatus(snap.status)
          : "All";

      setStatus(desired);
      setSearchFields(snap.searchFields || {});
      setTabData(snap.tabData || {});
      setTabConfigs(snap.tabConfigs || {});
      setActiveTab(snap.activeTab || null);
      setBranchCode(
        (snap.branchCode !== undefined && snap.branchCode) ||
          incomingBranch ||
          ""
      );
      setColumnOrderByTab(snap.columnOrderByTab || {});
      setGroupByByTab(snap.groupByByTab || {});
      setExpandedGroupsByTab(snap.expandedGroupsByTab || {});
      setAutoExpandGroupsByTab(snap.autoExpandGroupsByTab || {});
      setColWidthsByTab(snap.colWidthsByTab || {});
      setUserHiddenColsByTab(snap.userHiddenColsByTab || {});
    } else {
      if (statusProp !== undefined) setStatus(normalizeStatus(statusProp));
    }
  }, [baseKey, statusProp, branchCodeProp, navState.branchCode, initialDates]);

  useEffect(() => {
    if (branchCodeProp === undefined) return;

    const nextBranchCode = branchCodeProp || "";

    setBranchCode((prev) => {
      if (prev === nextBranchCode) return prev;
      return nextBranchCode;
    });

    setAppliedFilters((prev) => {
      if (!prev) return prev;
      if (prev.branchCode === nextBranchCode) return prev;

      hydratedFromCacheRef.current = false;

      setTabData({});
      setTabConfigs({});
      setActiveTab(null);
      setShowColumnChooser(false);
      setShowExportMenu(false);
      setGroupByByTab({});
      setExpandedGroupsByTab({});
      setAutoExpandGroupsByTab({});
      setColumnOrderByTab({});
      setColWidthsByTab({});
      setUserHiddenColsByTab({});
      setSortConfig({ key: null, direction: "asc", tabKey: null });

      return {
        ...prev,
        branchCode: nextBranchCode,
      };
    });
  }, [branchCodeProp]);

  /* ---------------- keep window cache updated ---------------- */
  useEffect(() => {
    const cache = getGlobalCache();
    cache[baseKey] = {
      dates,
      dateRangeType,
      status,
      searchFields,
      tabData,
      tabConfigs,
      activeTab,
      branchCode,
      columnOrderByTab,
      groupByByTab,
      expandedGroupsByTab,
      autoExpandGroupsByTab,
      colWidthsByTab,
      userHiddenColsByTab,
    };
  }, [
    baseKey,
    dates,
    dateRangeType,
    status,
    searchFields,
    tabData,
    tabConfigs,
    activeTab,
    branchCode,
    columnOrderByTab,
    groupByByTab,
    expandedGroupsByTab,
    autoExpandGroupsByTab,
    colWidthsByTab,
    userHiddenColsByTab,
  ]);

  /* ---------------- date presets ---------------- */
  useEffect(() => {
    const today = new Date();
    if (dateRangeType === "Last 7 Days") {
      setDates([subDays(today, 6), today]);
    } else if (dateRangeType === "Last 30 Days") {
      setDates([subDays(today, 29), today]);
    } else if (dateRangeType === "This Month") {
      setDates([startOfMonth(today), endOfMonth(today)]);
    } else if (dateRangeType === "Custom Range") {
      setDates([null, null]);
    }
  }, [dateRangeType]);

  const formatDateRange = (start, end) =>
    start && end ? `${format(start, "MM/dd/yyyy")} - ${format(end, "MM/dd/yyyy")}` : "";

  /* ---------------- query fetcher ---------------- */
  const fetchHistoryData = useCallback(
    async ({ queryKey }) => {
      const [, params] = queryKey;

      const payload = {
        json_data: {
          startDate: params.startDate,
          endDate: params.endDate,
          branchCode: params.branchCode,
          userCode: params.userCode,
        },
      };

      const dataResponse = await postRequest(params.endpoint, JSON.stringify(payload));
      const raw =
        dataResponse &&
        dataResponse.data &&
        dataResponse.data[0] &&
        dataResponse.data[0].result
          ? dataResponse.data[0].result
          : null;

      let parsed;
      if (raw !== null) {
        try {
          parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (e) {
          console.error("Failed to parse history result", e, raw);
          return { rootDataMap: {}, newTabConfigs: {}, rootKeys: [] };
        }
      } else if (dataResponse?.raw) {
        parsed = dataResponse.raw;
      } else if (dataResponse?.summary || dataResponse?.detail) {
        parsed = {
          WO_Summary: dataResponse.summary || [],
          WO_Detail: dataResponse.detail || [],
        };
      } else {
        parsed = {};
      }

      let rootDataMap = {};
      if (Array.isArray(parsed)) {
        rootDataMap = parsed.reduce((acc, item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(acc, item);
          return acc;
        }, {});
      } else if (parsed && typeof parsed === "object") {
        rootDataMap = parsed;
      }

      Object.keys(rootDataMap).forEach((k) => {
        const v = rootDataMap[k];
        if (v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.rows)) {
          rootDataMap[k] = v.rows;
        }
      });

      const rootKeys = Object.keys(rootDataMap);
      const newTabConfigs = {};
      for (const key of rootKeys) {
        newTabConfigs[key] = await getColumnConfig(key);
      }

      return { rootDataMap, newTabConfigs, rootKeys };
    },
    [getColumnConfig]
  );

  const {
    data: historyQueryData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "all-tran-history",
      {
        endpoint,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        branchCode: appliedFilters.branchCode,
        userCode: currentUserRow?.userCode,
      },
    ],
    queryFn: fetchHistoryData,
    enabled: Boolean(
      endpoint &&
        appliedFilters?.startDate &&
        appliedFilters?.endDate &&
        currentUserRow?.userCode
    ),
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      refetch();
    }
    wasActiveRef.current = isActive;
  }, [isActive, refetch]);

  const loading = isLoading || (isFetching && (!activeTab || Object.keys(tabData).length === 0));
  const refreshing = isFetching && !isLoading;

  /* ---------------- apply query result ---------------- */
  useEffect(() => {
    if (!historyQueryData) return;

    const { rootDataMap, newTabConfigs, rootKeys } = historyQueryData;

    setTabData(rootDataMap);
    setTabConfigs(newTabConfigs);

    const initialTabKey =
      (activeTabKeyProp && rootKeys.includes(activeTabKeyProp) && activeTabKeyProp) ||
      (navState.activeTabKey && rootKeys.includes(navState.activeTabKey) && navState.activeTabKey) ||
      rootKeys[0] ||
      null;

    const initialOrders = {};
    const initialGroups = {};
    const initialExpanded = {};
    const initialWidths = {};
    const initialHidden = {};

    rootKeys.forEach((key) => {
      const cols =
        (newTabConfigs[key] || []).length
          ? newTabConfigs[key].filter((c) => !c.hidden)
          : rootDataMap[key]?.length
          ? Object.keys(rootDataMap[key][0]).map((k) => ({ key: k }))
          : [];

      initialOrders[key] = cols.map((c) => c.key);
      initialGroups[key] = [];
      initialExpanded[key] = {};
      initialWidths[key] = {};
      initialHidden[key] = [];
    });

    setColumnOrderByTab((prev) => {
      if (Object.keys(prev).length) return prev;
      return initialOrders;
    });

    setGroupByByTab((prev) => {
      if (Object.keys(prev).length) return prev;
      return initialGroups;
    });

    setExpandedGroupsByTab((prev) => {
      if (Object.keys(prev).length) return prev;
      return initialExpanded;
    });

    setAutoExpandGroupsByTab((prev) => {
      if (Object.keys(prev).length) return prev;
      return {};
    });

    setColWidthsByTab((prev) => {
      if (Object.keys(prev).length) return prev;
      return initialWidths;
    });

    setUserHiddenColsByTab((prev) => {
      if (Object.keys(prev).length) return prev;
      return initialHidden;
    });

    setActiveTab((prev) => (prev && rootKeys.includes(prev) ? prev : initialTabKey));

    setSearchFields((prev) =>
      Object.keys(prev).length ? prev : prefillProp || navState.prefillSearchFields || {}
    );

    setSortConfig((prev) =>
      prev?.tabKey ? prev : { key: null, direction: "asc", tabKey: initialTabKey }
    );

    hydratedFromCacheRef.current = true;
  }, [
    historyQueryData,
    activeTabKeyProp,
    navState.activeTabKey,
    navState.prefillSearchFields,
    prefillProp,
  ]);

  /* ---------------- columns for a tab ---------------- */
  const getColumnsForTab = useCallback(
    (tabKey) => {
      const dataForTab = tabData[tabKey] || [];
      const configured = tabConfigs[tabKey] || [];
      if (configured.length > 0) return configured.filter((c) => !c.hidden);
      if (dataForTab.length === 0) return [];
      return Object.keys(dataForTab[0]).map((k) => ({
        key: k,
        label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        renderType: "text",
        sortable: true,
      }));
    },
    [tabData, tabConfigs]
  );

  const currentRows = tabData[activeTab] || [];
  const baseColumns = useMemo(() => getColumnsForTab(activeTab), [activeTab, getColumnsForTab]);

  useEffect(() => {
    if (!activeTab || !baseColumns.length) return;

    setColumnOrderByTab((prev) => {
      if (prev[activeTab]?.length) return prev;
      return {
        ...prev,
        [activeTab]: baseColumns.map((c) => c.key),
      };
    });

    setGroupByByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] || [],
    }));

    setExpandedGroupsByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] || {},
    }));

    setColWidthsByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] || {},
    }));

    setUserHiddenColsByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] || [],
    }));
  }, [activeTab, baseColumns]);

  const rawGroupBy = groupByByTab[activeTab] || [];
  const baseColumnKeys = useMemo(
    () => new Set(baseColumns.map((col) => col.key)),
    [baseColumns]
  );
  const groupBy = useMemo(
    () =>
      rawGroupBy.filter(
        (key, index, arr) => baseColumnKeys.has(key) && arr.indexOf(key) === index
      ),
    [rawGroupBy, baseColumnKeys]
  );
  const expandedGroups = expandedGroupsByTab[activeTab] || {};
  const colWidths = colWidthsByTab[activeTab] || {};
  const userHiddenCols = userHiddenColsByTab[activeTab] || [];
  const columnOrder = columnOrderByTab[activeTab] || baseColumns.map((c) => c.key);
  const groupingRenderKey = `${activeTab || "no-tab"}:${groupBy.join("|") || "ungrouped"}`;
  const autoExpandGroups = !!autoExpandGroupsByTab[activeTab];
  const activeTabLabel = useMemo(
    () =>
      activeTab
        ? String(activeTab)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Columns",
    [activeTab]
  );

  const orderedCols = useMemo(() => {
    if (!baseColumns.length) return [];
    if (!columnOrder.length) return baseColumns;
    return columnOrder.map((key) => baseColumns.find((c) => c.key === key)).filter(Boolean);
  }, [baseColumns, columnOrder]);

  const visibleCols = useMemo(() => {
    return orderedCols.filter(
      (c) => !c.hidden && !userHiddenCols.includes(c.key) && !groupBy.includes(c.key)
    );
  }, [orderedCols, userHiddenCols, groupBy]);

  const renderVisibleCols = useMemo(() => {
      return visibleCols;
    }, [visibleCols]);

  const chooserColumns = useMemo(
    () => orderedCols.filter((col) => !col.hidden && !groupBy.includes(col.key)),
    [orderedCols, groupBy]
  );

  const protectedColumnKeys = useMemo(
    () => chooserColumns.slice(0, 2).map((col) => col.key),
    [chooserColumns]
  );

  const draftVisibleChooserColumnCount = useMemo(
    () => chooserColumns.filter((col) => !columnChooserDraftHidden.includes(col.key)).length,
    [chooserColumns, columnChooserDraftHidden]
  );

  const filteredChooserColumns = useMemo(() => {
    const q = String(columnChooserSearch || "").trim().toLowerCase();
    if (!q) return chooserColumns;
    return chooserColumns.filter((col) =>
      String(col.label || col.key || "").toLowerCase().includes(q)
    );
  }, [chooserColumns, columnChooserSearch]);

  useEffect(() => {
    if (!activeTab || protectedColumnKeys.length === 0) return;

    setUserHiddenColsByTab((prev) => {
      const current = prev[activeTab] || [];
      const nextHidden = current.filter((key) => !protectedColumnKeys.includes(key));
      if (nextHidden.length === current.length) return prev;
      return { ...prev, [activeTab]: nextHidden };
    });
  }, [activeTab, protectedColumnKeys]);

  const primaryCardCol = useMemo(() => {
    if (!visibleCols.length) return null;

    const preferredKeys = [
      "docNo",
      "documentNo",
      "DOC_NO",
      "doc_code",
      "code",
      "name",
      "referenceNo",
      "refNo",
    ];

    return (
      visibleCols.find((col) => preferredKeys.includes(col.key)) ||
      visibleCols[0]
    );
  }, [visibleCols]);

  const cardDetailCols = useMemo(() => {
    if (!primaryCardCol) return visibleCols;
    return visibleCols.filter((col) => col.key !== primaryCardCol.key);
  }, [visibleCols, primaryCardCol]);

  /* ---------------- filtered rows ---------------- */

  const filteredData = useMemo(() => {
  const base = currentRows.filter((row) =>
    Object.entries(searchFields).every(([key, value]) => {
      if (!value) return true;

      const col = baseColumns.find((c) => c.key === key);
      const searchValue = String(value).toLowerCase().trim();

      let compareValue = "";

      if (col?.renderType === "date") {
        try {
          const rawDate = row?.[key];
          if (!rawDate) return false;

          const datePart = String(rawDate).split("T")[0];
          compareValue = String(useReturnToDate(datePart)).toLowerCase();
        } catch {
          compareValue = String(row?.[key] ?? "").toLowerCase();
        }
      } else {
        compareValue = String(row?.[key] ?? "").toLowerCase();
      }

      return compareValue.includes(searchValue);
    })
  );

  const statusFiltered = (() => {
    if (status === "All") return base;
    const statusFieldCandidates = ["C", "doc_stat", "docStatus", "status", "stat"];
    return base.filter((row) => {
      const rowStatus =
        statusFieldCandidates
          .map((f) => (row[f] !== undefined ? String(row[f]) : undefined))
          .find((v) => v !== undefined) ?? "";
      return rowStatus === status;
    });
  })();

  let result = statusFiltered;

  const q = String(globalSearch || "").trim().toLowerCase();
  if (q) {
    const keys = baseColumns.map((c) => c.key);
    result = result.filter((row) =>
      keys.some((key) => {
        const col = baseColumns.find((c) => c.key === key);

        let compareValue = "";

        if (col?.renderType === "date") {
          try {
            const rawDate = row?.[key];
            if (!rawDate) return false;

            const datePart = String(rawDate).split("T")[0];
            compareValue = String(useReturnToDate(datePart)).toLowerCase();
          } catch {
            compareValue = String(row?.[key] ?? "").toLowerCase();
          }
        } else {
          compareValue = String(row?.[key] ?? "").toLowerCase();
        }

        return compareValue.includes(q);
      })
    );
  }

  if (!sortConfig.key || sortConfig.tabKey !== activeTab) return result;

  const col = baseColumns.find((c) => c.key === sortConfig.key);
  const isNum = isNumericColumn(col);

  return [...result].sort((a, b) => {
    const valA = a?.[sortConfig.key];
    const valB = b?.[sortConfig.key];

    if (isNum) {
      const numA = parseNumber(valA);
      const numB = parseNumber(valB);
      return sortConfig.direction === "asc" ? numA - numB : numB - numA;
    }

    const sA = String(valA ?? "");
    const sB = String(valB ?? "");
    return sortConfig.direction === "asc" ? sA.localeCompare(sB) : sB.localeCompare(sA);
  });
}, [currentRows, searchFields, status, sortConfig, activeTab, baseColumns, globalSearch]);



  /* ---------------- grouping / totals helpers ---------------- */
  const totalExemptions = ["rate", "percent", "ratio", "id", "code", "lnno"];

  const shouldSumColumn = useCallback((col) => {
    const noTotalKeys = ["unitcost", "currrate", "unitprice", "runbal"];
    if (!col) return false;

    const key = String(col.key ?? "").toLowerCase();
    const label = String(col.label ?? "").toLowerCase();

    if (noTotalKeys.includes(key)) return false;
    if (!isNumericColumn(col)) return false;
    if (totalExemptions.some((ex) => label.includes(ex) || key.includes(ex))) return false;

    return true;
  }, []);

  const calculateAggregates = useCallback(
    (rows) => {
      const sums = {};
      visibleCols.forEach((col) => {
        if (shouldSumColumn(col)) {
          sums[col.key] = rows.reduce((acc, curr) => acc + parseNumber(curr[col.key]), 0);
        }
      });
      return sums;
    },
    [visibleCols, shouldSumColumn]
  );

  const groupData = useCallback(
    (rows, level = 0) => {
      if (level >= groupBy.length) return rows.map((row) => ({ ...row }));

      const groupKey = groupBy[level];
      const groups = {};

      rows.forEach((row) => {
        const val = String(row[groupKey] ?? "(Blank)");
        if (!groups[val]) groups[val] = [];
        groups[val].push(row);
      });

      const result = [];
      Object.keys(groups)
        .sort()
        .forEach((key) => {
          result.push({
            isGroup: true,
            key: groupKey,
            value: key,
            level,
            children: groupData(groups[key], level + 1),
            count: groups[key].length,
            aggregates: calculateAggregates(groups[key]),
          });
        });

      return result;
    },
    [groupBy, calculateAggregates]
  );

  const processRenderList = useCallback(
    (nodes) => {
      let list = [];
      nodes.forEach((node) => {
        if (node.isGroup) {
          list.push(node);
          const uniqueId = `${node.key}-${node.value}-${node.level}`;
          if (autoExpandGroups || expandedGroups[uniqueId]) {
            if (node.level === groupBy.length - 1) list = list.concat(node.children);
            else list = list.concat(processRenderList(node.children));

            list.push({
              isSubtotal: true,
              groupLabel: baseColumns.find((c) => c.key === node.key)?.label,
              groupValue: node.value,
              aggregates: node.aggregates,
              level: node.level,
            });
          }
        } else {
          list.push(node);
        }
      });
      return list;
    },
    [autoExpandGroups, expandedGroups, groupBy.length, baseColumns]
  );

  const groupedStructure = useMemo(() => {
    if (groupBy.length === 0) return [];
    return groupData(filteredData);
  }, [filteredData, groupBy, groupData]);

  const fullRenderRows = useMemo(() => {
    if (groupBy.length === 0) return filteredData;

    const expandAll = (nodes) => {
      let list = [];
      nodes.forEach((node) => {
        if (node.isGroup) {
          list.push(node);
          if (node.level === groupBy.length - 1) list = list.concat(node.children);
          else list = list.concat(expandAll(node.children));

          list.push({
            isSubtotal: true,
            groupLabel: baseColumns.find((c) => c.key === node.key)?.label,
            groupValue: node.value,
            aggregates: node.aggregates,
            level: node.level,
          });
        } else {
          list.push(node);
        }
      });
      return list;
    };

    return expandAll(groupedStructure);
  }, [groupBy, filteredData, groupedStructure, baseColumns]);

  const displayRows = useMemo(() => {
    if (groupBy.length === 0) return filteredData;
    return processRenderList(groupedStructure);
  }, [groupBy, filteredData, processRenderList, groupedStructure]);

  const grandTotals = useMemo(() => calculateAggregates(filteredData), [filteredData, calculateAggregates]);
  const hasGrandTotalColumns = useMemo(
    () => visibleCols.some((col) => grandTotals[col.key] !== undefined),
    [visibleCols, grandTotals]
  );

  const allGroupKeys = useMemo(() => {
    if (!activeTab || groupBy.length === 0) return [];
    const keys = [];
    const traverse = (nodes) => {
        nodes.forEach(n => {
            if (n.isGroup) {
                keys.push(`${n.key}-${n.value}-${n.level}`);
                if (Array.isArray(n.children)) traverse(n.children);
            }
        });
    };
    traverse(groupedStructure);
    return keys;
  }, [activeTab, groupBy, groupedStructure]);

  const allExpanded = groupBy.length > 0 && (autoExpandGroups || (allGroupKeys.length > 0 && allGroupKeys.every(k => expandedGroups[k])));


  /* ---------------- handlers ---------------- */
  const handleSearchChange = (e, key) => {
    const { value } = e.target;
    setSearchFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc" && sortConfig.tabKey === activeTab) {
      direction = "desc";
    }
    setSortConfig({ key, direction, tabKey: activeTab });
  };

  const handleApplyFilter = useCallback(() => {
    if (!dates?.[0] || !dates?.[1]) return;

    const nextFilters = {
      startDate: format(dates[0], "yyyy-MM-dd"),
      endDate: format(dates[1], "yyyy-MM-dd"),
      branchCode,
    };

    const isSameFilter =
      appliedFilters?.startDate === nextFilters.startDate &&
      appliedFilters?.endDate === nextFilters.endDate &&
      appliedFilters?.branchCode === nextFilters.branchCode;

    if (isSameFilter) {
      refetch();
      return;
    }

    hydratedFromCacheRef.current = false;
    setSearchFields(prefillProp || navState.prefillSearchFields || {});
    setTabData({});
    setTabConfigs({});
    setActiveTab(null);
    setShowColumnChooser(false);
    setShowExportMenu(false);
    setGroupByByTab({});
    setExpandedGroupsByTab({});
    setAutoExpandGroupsByTab({});
    setColumnOrderByTab({});
    setColWidthsByTab({});
    setUserHiddenColsByTab({});
    setSortConfig({ key: null, direction: "asc", tabKey: null });

    setAppliedFilters(nextFilters);
  }, [
    dates,
    branchCode,
    appliedFilters,
    refetch,
    prefillProp,
    navState.prefillSearchFields,
  ]);

  const handleResetUI = () => {
    hydratedFromCacheRef.current = false;
    const today = new Date();
    const newDates = [startOfMonth(today), endOfMonth(today)];

    setDateRangeType("This Month");
    setDates(newDates);
    setSearchFields({});
    setStatus("All");
    setGroupByByTab((prev) => ({ ...prev, [activeTab]: [] }));
    setExpandedGroupsByTab((prev) => ({ ...prev, [activeTab]: {} }));
    setAutoExpandGroupsByTab((prev) => ({ ...prev, [activeTab]: false }));
    setUserHiddenColsByTab((prev) => ({ ...prev, [activeTab]: [] }));
    setColWidthsByTab((prev) => ({ ...prev, [activeTab]: {} }));
    setGlobalSearch("");

    if (activeTab) {
      setColumnOrderByTab((prev) => ({
        ...prev,
        [activeTab]: baseColumns.map((c) => c.key),
      }));
    }

    setAppliedFilters({
      startDate: format(newDates[0], "yyyy-MM-dd"),
      endDate: format(newDates[1], "yyyy-MM-dd"),
      branchCode: branchCode || "",
    });

    refetch();
  };

  const getRowClassByStatus = (row) => {
    const statusFieldCandidates = ["C", "doc_stat", "docStatus", "status", "stat","docStat"];
    const rowStatus =
      statusFieldCandidates
        .map((f) => (row[f] !== undefined ? String(row[f]) : undefined))
        .find((v) => v !== undefined) ?? "";

    if (rowStatus === "X" ) return "text-red-600";
    if (rowStatus === "F" || rowStatus === "C") return "text-blue-700";
    return "";
  };

  const handleRowDoubleClick = useCallback(
    (row) => {
      const docNo = row?.docNo ?? row?.documentNo ?? row?.DOC_NO ?? "";
      const bcode = row?.branchCode ?? row?.BRANCH_CODE ?? "";
      if (!docNo) return;

      if (typeof onRowDoubleClick === "function") {
        onRowDoubleClick({ ...row, docNo, branchCode: bcode });
      } else {
        navigate(backToPath, {
          state: { docNo, branchCode: bcode },
          replace: true,
        });
      }
    },
    [onRowDoubleClick, navigate, backToPath]
  );

  /* ---------------- column reorder / group / resize ---------------- */
  const handleColDragStart = (e, key) => {
    setDraggedCol(key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDrop = (e, targetKey, isDropZone = false) => {
    e.preventDefault();
    if (!draggedCol || !activeTab) return;

    if (isDropZone) {
      if (!groupBy.includes(draggedCol)) {
        setGroupByByTab((prev) => {
          const currentGroups = (prev[activeTab] || []).filter(
            (key, index, arr) => baseColumnKeys.has(key) && arr.indexOf(key) === index
          );

          return {
            ...prev,
            [activeTab]: currentGroups.includes(draggedCol)
              ? currentGroups
              : [...currentGroups, draggedCol],
          };
        });
        if (!autoExpandGroups) {
          setExpandedGroupsByTab((prev) => ({ ...prev, [activeTab]: {} }));
        }
      }
    } else {
      if (groupBy.includes(draggedCol)) return;
      if (draggedCol === targetKey) return;

      const newOrder = [...columnOrder];
      const oldIdx = newOrder.indexOf(draggedCol);
      const newIdx = newOrder.indexOf(targetKey);

      if (oldIdx > -1 && newIdx > -1) {
        newOrder.splice(oldIdx, 1);
        newOrder.splice(newIdx, 0, draggedCol);
        setColumnOrderByTab((prev) => ({
          ...prev,
          [activeTab]: newOrder,
        }));
      }
    }

    setDraggedCol(null);
  };

  const toggleGroup = (node) => {
    const uniqueId = `${node.key}-${node.value}-${node.level}`;
    setAutoExpandGroupsByTab((prev) => ({ ...prev, [activeTab]: false }));
    setExpandedGroupsByTab((prev) => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] || {}),
        [uniqueId]: !(prev[activeTab] || {})[uniqueId],
      },
    }));
  };

  const toggleAllGroups = (expand) => {
    if (!activeTab) return;
    setAutoExpandGroupsByTab((prev) => ({ ...prev, [activeTab]: expand }));
    if (!expand) {
      setExpandedGroupsByTab((prev) => ({ ...prev, [activeTab]: {} }));
      return;
    }

    const allKeys = {};
    const traverse = (nodes) => {
      nodes.forEach((n) => {
        if (n.isGroup) {
          allKeys[`${n.key}-${n.value}-${n.level}`] = true;
          if (Array.isArray(n.children) && n.children[0]?.isGroup) traverse(n.children);
        }
      });
    };
    traverse(groupedStructure);

    setExpandedGroupsByTab((prev) => ({
      ...prev,
      [activeTab]: allKeys,
    }));
  };

  const clearActiveGrouping = useCallback(() => {
    if (!activeTab) return;

    setGroupByByTab((prev) => ({
      ...prev,
      [activeTab]: [],
    }));
    if (!autoExpandGroups) {
      setExpandedGroupsByTab((prev) => ({
        ...prev,
        [activeTab]: {},
      }));
    }
    setDraggedCol(null);
  }, [activeTab]);

  const handleRemoveGroupedColumn = (gKey) => {
    if (!activeTab) return;

    setGroupByByTab((prev) => ({
      ...prev,
      [activeTab]: (prev[activeTab] || []).filter((k) => k !== gKey),
    }));

    if (!autoExpandGroups) {
      setExpandedGroupsByTab((prev) => ({
        ...prev,
        [activeTab]: {},
      }));
    }
    setDraggedCol(null);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!resizingRef.current || !activeTab) return;
      const { startX, startWidth, key } = resizingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + delta);

      setColWidthsByTab((prev) => ({
        ...prev,
        [activeTab]: {
          ...(prev[activeTab] || {}),
          [key]: newWidth,
        },
      }));
    },
    [activeTab]
  );

  const handleMouseUp = useCallback(() => {
    if (resizingRef.current) {
      resizingRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
  }, [handleMouseMove]);

  const startResizing = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget?.parentElement;
    const currentWidth =
      th?.offsetWidth ||
      colWidths[key] ||
      Number(baseColumns.find((c) => c.key === key)?.width) ||
      120;

    resizingRef.current = {
      startX: e.clientX,
      startWidth: currentWidth,
      key,
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const stickyPlan = useMemo(() => {
    let left = ACTION_COL_WIDTH;
    const maxStickyCols = groupBy.length > 0 ? 1 : 0;

    return renderVisibleCols.map((col, index) => {
      const resizedWidth = colWidths[col.key];
      const isSticky = index < maxStickyCols;

      if (isSticky) {
        const width = (resizedWidth ?? Number(col.width)) || 140;
        const meta = { sticky: true, left, width };
        left += width;
        return meta;
      }

      return { sticky: false, left: 0, width: resizedWidth || undefined };
    });
  }, [renderVisibleCols, colWidths, groupBy.length]);

  /* ---------------- export helpers ---------------- */
  const tabToSheet = (tabKey) => {
    const cols = getColumnsForTab(tabKey).filter(
      (c) =>
        !(userHiddenColsByTab[tabKey] || []).includes(c.key) &&
        !((groupByByTab[tabKey] || []).includes(c.key))
    );

    const rows = (tabData[tabKey] || []).map((row) => {
      const obj = {};
      cols.forEach((col) => {
        const header = col.label || col.key;
        const val = formatCellValue(row[col.key], col);
        obj[header] = React.isValidElement(val) ? val.props?.children ?? "" : val;
      });
      return obj;
    });

    const sheetName = tabKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 31);

    return { sheetName, rows };
  };

  const buildJsonSheets = () => Object.keys(tabData || {}).map((tabKey) => tabToSheet(tabKey));

  function toTabbedJson(jsonSheets) {
    const data = {};
    for (const tab of jsonSheets || []) {
      const key = tab.sheetName || "Sheet";
      data[key] = Array.isArray(tab.rows) ? tab.rows : [];
    }
    return { Data: data };
  }

  const exportName =
    activeTab ??
    (location.state && location.state.historyExportName) ??
    "Transaction History";

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

  const sanitizeFileName = (name) =>
  String(name ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .substring(0, 120);

const openExportModal = (type) => {
  const defaultFileName = `${exportName} ${getDateTimeStamp()}`;

  const titleMap = {
    excel_all: "Export Excel",
    excel: "Export Excel",
    csv: "Export CSV",
    pdf: "Export PDF",
    image: "Export Image",
  };

  setExportModal({
    isOpen: true,
    title: titleMap[type] || "Export File",
    confirmText: "Export",
    defaultFileName,
    type,
  });
};

const closeExportModal = () => {
  setExportModal({
    isOpen: false,
    title: "Export File",
    confirmText: "Export",
    defaultFileName: "",
    type: null,
  });
};

const handleExportExcel = async (customFileName) => {
  if (!visibleCols.length || !filteredData.length) return;

  try {
    const fileName = sanitizeFileName(customFileName);
    if (!fileName) return;

    const formatMMddyyyyNoSlash = (dateValue) => {
      if (!dateValue) return "";

      // Handle yyyy-MM-dd without UTC date shifting.
      const rawValue = String(dateValue).trim();
      const isoDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const [, yyyy, mm, dd] = isoDateMatch;
        return `${mm}${dd}${yyyy}`;
      }

      const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (Number.isNaN(parsedDate.getTime())) return "";

      return format(parsedDate, "MMddyyyy");
    };

    const baseReportTitle = activeTab
      ? activeTab.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : historyExportNameProp || "Transaction History";

    // Preset ranges always use the applied start and end dates.
    // For Custom Range, do not append dates until both dates are selected.
    const customRangeHasNoCompleteDates =
      dateRangeType === "Custom Range" && (!dates?.[0] || !dates?.[1]);

    const reportStartDate = customRangeHasNoCompleteDates
      ? null
      : appliedFilters?.startDate || dates?.[0];
    const reportEndDate = customRangeHasNoCompleteDates
      ? null
      : appliedFilters?.endDate || dates?.[1];

    const formattedStartDate = formatMMddyyyyNoSlash(reportStartDate);
    const formattedEndDate = formatMMddyyyyNoSlash(reportEndDate);

    const reportTitle = formattedStartDate && formattedEndDate
      ? `${baseReportTitle} ${formattedStartDate} to ${formattedEndDate}`
      : baseReportTitle;

    const exportData = groupBy.length > 0 ? groupedStructure : filteredData;

    await exportGenericQueryExcel(
      exportData,
      grandTotals,
      visibleCols,
      groupBy,
      baseColumns,
      expandedGroups,
      7,
      fileName,
      currentUserRow?.userName,
      companyInfo?.compName,
      companyInfo?.compAddr,
      companyInfo?.telNo,
      reportTitle
    );
  } catch (err) {
    console.error("Error exporting Excel:", err);
  }
};


 const handleExportCsv = async (customFileName) => {
  if (!visibleCols.length || !filteredData.length) return;

  try {
    const fileName = sanitizeFileName(customFileName);
    if (!fileName) return;

    const rowsToExport = filteredData;
    const headerRow = visibleCols
      .map((col) => {
        let header = String(col.label ?? "");
        header = header.replace(/,/g, "");
        header = header.toUpperCase().replace(/\s+/g, "_");
        return `"${header.replace(/"/g, '""')}"`;
      })
      .join(",");

    const csvLines = [headerRow];

    rowsToExport.forEach((row) => {
      const line = visibleCols
        .map((col) => {
          const formatted = formatCellValue(row[col.key], col);
          const noCommas = String(
            React.isValidElement(formatted) ? formatted.props?.children ?? "" : formatted ?? ""
          ).replace(/,/g, "");
          return `"${String(noCommas).replace(/"/g, '""')}"`;
        })
        .join(",");
      csvLines.push(line);
    });

    const blob = new Blob([csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error exporting CSV:", err);
  }
};

const handleExportPdf = async (customFileName) => {
  if (!exportContainerRef.current || !displayRows.length) return;

  try {
    const fileName = sanitizeFileName(customFileName);
    if (!fileName) return;

    const canvas = await html2canvas(exportContainerRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("l", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidthPx, pdfHeight / imgHeightPx);
    const imgWidth = imgWidthPx * ratio;
    const imgHeight = imgHeightPx * ratio;
    const x = (pdfWidth - imgWidth) / 2;
    const y = 5;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`${fileName}.pdf`);
  } catch (err) {
    console.error("Error exporting PDF:", err);
  }
};

const handleExportImage = async (customFileName) => {
  if (!exportContainerRef.current || !displayRows.length) return;

  try {
    const fileName = sanitizeFileName(customFileName);
    if (!fileName) return;

    const canvas = await html2canvas(exportContainerRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = imgData;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Error exporting image:", err);
  }
};

const handleExportConfirm = async (enteredFileName) => {
  try {
    const safeFileName = sanitizeFileName(enteredFileName);
    if (!safeFileName) return;

    if (exportModal.type === "excel") {
      await handleExportExcel(safeFileName);
    } else if (exportModal.type === "csv") {
      await handleExportCsv(safeFileName);
    } else if (exportModal.type === "pdf") {
      await handleExportPdf(safeFileName);
    } else if (exportModal.type === "image") {
      await handleExportImage(safeFileName);
    }
  } finally {
    closeExportModal();
  }
};




  const numberAlignClass = (col) =>
    isNumericColumn(col) || col?.classNames?.includes("text-right")
      ? "text-right tabular-nums"
      : "text-left";

  const commonCellClass = "px-2 py-1 border whitespace-nowrap";

  const allChecked = chooserColumns.every((col) => !columnChooserDraftHidden.includes(col.key));

  const handleToggleColumnChooser = () => {
    if (showColumnChooser) {
      setShowColumnChooser(false);
      return;
    }

    setColumnChooserSearch("");
    setColumnChooserDraftHidden(userHiddenCols);
    setShowColumnChooser(true);
  };

  const handleCloseColumnChooser = () => {
    setShowColumnChooser(false);
    setColumnChooserSearch("");
    setColumnChooserDraftHidden([]);
  };

  const handleToggleAllColumns = (checked) => {
    if (!activeTab) return;

    if (checked) {
      setColumnChooserDraftHidden([]);
      return;
    }

    const protectedKeys = new Set(protectedColumnKeys);
    const nextHidden = chooserColumns
      .filter((col) => !protectedKeys.has(col.key))
      .map((col) => col.key);

    setColumnChooserDraftHidden(nextHidden);
  };

  const handleToggleColumnVisibility = (colKey, checked) => {
    if (!activeTab) return;

    if (!checked && (protectedColumnKeys.includes(colKey) || draftVisibleChooserColumnCount <= 2)) {
      useSwalErrorAlert("Minimum columns required", "Please retain at least 2 columns.");
      return;
    }

    setColumnChooserDraftHidden((current) => {
      if (checked) {
        return current.filter((key) => key !== colKey);
      }

      return current.includes(colKey) ? current : [...current, colKey];
    });
  };

  const handleApplyColumnChooser = () => {
    if (!activeTab) return;
    setUserHiddenColsByTab((prev) => ({ ...prev, [activeTab]: columnChooserDraftHidden }));
    handleCloseColumnChooser();
  };

  const handleResetColumnChooser = () => {
    setColumnChooserDraftHidden(userHiddenCols);
    setColumnChooserSearch("");
  };

  /* ---------------- mobile card renderers ---------------- */
  const renderMobileCard = useCallback(
    (row, idx) => {
      const rowClass = getRowClassByStatus(row);
      const headerCol = primaryCardCol;
      const headerLabel = (headerCol?.label || headerCol?.key || "Record");
      const headerValue = headerCol ? formatCellValue(row?.[headerCol.key], headerCol) : `Record ${idx + 1}`;

      return (
        <div
          key={row.__idx ?? idx}
          className="rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-3 py-2 cursor-pointer active:scale-[0.99] transition"
          onClick={() => handleRowDoubleClick(row)}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 leading-tight">
                {headerLabel}
              </div>
              <div className={`text-[12px] font-bold leading-tight truncate ${rowClass || "text-slate-800"}`}>
                {headerValue}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRowDoubleClick(row);
              }}
              className="h-7 w-7 rounded-md bg-blue-600 text-white hover:bg-blue-700 shrink-0"
              title="View"
            >
              <FontAwesomeIcon icon={faEye} className="text-[11px]" />
            </button>
          </div>

          <div className="space-y-0">
            {cardDetailCols.map((col) => {
              const formatted = formatCellValue(row?.[col.key], col);
              const alignRight =
                isNumericColumn(col) || col?.classNames?.includes("text-right");

              return (
                <div
                  key={col.key}
                  className="grid grid-cols-[110px_1fr] gap-x-2 py-[2px] text-[11px] leading-tight"
                >
                  <div className="font-semibold text-gray-500 dark:text-slate-400">
                    {(col.label || col.key)}
                  </div>
                  <div
                    className={`min-w-0 break-words ${
                      alignRight ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {formatted}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [cardDetailCols, handleRowDoubleClick, primaryCardCol]
  );

  const renderMobileGroupRow = useCallback(
    (row, idx) => {
      const uniqueId = `${row.key}-${row.value}-${row.level}`;
      const isExpanded = autoExpandGroups || expandedGroups[uniqueId];

      return (
        <button
          key={`group-${uniqueId}-${idx}`}
          type="button"
          className="w-full rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-700/60 px-3 py-2 text-left"
          onClick={() => toggleGroup(row)}
        >
          <div className="flex items-center gap-2" style={{ paddingLeft: row.level * 14 }}>
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronRight}
              className="text-[11px] text-gray-500 dark:text-slate-400"
            />
            <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-300">
              {(baseColumns.find((c) => c.key === row.key)?.label || row.key)}:
            </span>
            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300">{row.value}</span>
            <span className="ml-auto rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
              {row.count}
            </span>
          </div>
        </button>
      );
    },
    [autoExpandGroups, expandedGroups, baseColumns]
  );

  const renderMobileSubtotalCard = useCallback(
    (row, idx) => {
      const subtotalCols = visibleCols.filter((col) => row.aggregates[col.key] !== undefined);

      return (
        <div
          key={`subtotal-${idx}`}
          className="rounded-lg border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2"
        >
          <div className="text-[11px] font-bold text-yellow-800 dark:text-yellow-300 leading-tight mb-1">
            Sub Total for {(row.groupLabel)}: {row.groupValue}
          </div>

          <div className="space-y-0">
            {subtotalCols.map((col) => {
              const formatted = formatCellValue(row.aggregates[col.key], col);
              const alignRight =
                isNumericColumn(col) || col?.classNames?.includes("text-right");

              return (
                <div
                  key={col.key}
                  className="grid grid-cols-[110px_1fr] gap-x-2 py-[2px] text-[11px] leading-tight"
                >
                  <div className="font-semibold text-yellow-700 dark:text-yellow-400">
                    {(col.label || col.key)}
                  </div>
                  <div className={alignRight ? "text-right tabular-nums" : "text-left"}>
                    {formatted}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [visibleCols]
  );

  const renderMobileGrandTotalCard = useCallback(() => {
    const totalCols = visibleCols.filter((col) => grandTotals[col.key] !== undefined);

    if (!totalCols.length) return null;

    return (
      <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
        <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 leading-tight mb-1">
          {groupBy.length > 0 ? "Grand Total" : "Total"}
        </div>

        <div className="space-y-0">
          {totalCols.map((col) => {
            const formatted = formatCellValue(grandTotals[col.key], col);
            const alignRight =
              isNumericColumn(col) || col?.classNames?.includes("text-right");

            return (
              <div
                key={col.key}
                className="grid grid-cols-[110px_1fr] gap-x-2 py-[2px] text-[11px] leading-tight"
              >
                <div className="font-semibold text-blue-700 dark:text-blue-400">
                  {(col.label || col.key)}
                </div>
                <div className={alignRight ? "text-right tabular-nums" : "text-left"}>
                  {formatted}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [visibleCols, grandTotals, groupBy.length]);

  return (
    <>
      {showHeader && (
        <>
          <Header
            activeTopTab="history"
            detailsRoute={backToPath}
            historyRoute="/page/AllTranHistory"
            showActions={false}
          />
          <HeaderSpacer />
        </>
      )}

      <div className="fixed top-[55px] left-0 w-full z-30 bg-white dark:bg-slate-800 shadow-md">
        {showHeader && (
          <div className="flex flex-col md:flex-row items-center justify-between px-4 py-2 gap-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap justify-center md:justify-start gap-1 lg:gap-2 w-full md:w-auto">
              <button
                className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group ${
                  location.pathname === "/"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                }`}
                onClick={() => navigate(backToPath)}
              >
                <FontAwesomeIcon icon={faPen} className="w-4 h-3 mr-2" />
                <span className="group-hover:block">Transaction Details</span>
              </button>
              <button
                className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group ${
                  location.pathname === "/"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                }`}
                onClick={() => navigate(backToPath)}
              >
                <FontAwesomeIcon icon={faList} className="w-4 h-4 mr-2" />
                <span className="group-hover:block">Transaction History</span>
              </button>
            </div>
          </div>
        )}

        <style jsx="true">{`
          @keyframes fade-in-down {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.2s ease-out forwards;
          }
        `}</style>

     {isMobile ? (
  <div className="p-3 mt-4">
    <div className="flex items-end gap-1.5 mt-4 overflow-x-auto">
      <div className="min-w-0 flex-1">
        <label className="block text-[10px] font-semibold text-gray-600 dark:text-slate-300 mb-1">
          Date Range
        </label>
        <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-md px-1.5 py-1 bg-white dark:bg-slate-700 h-[36px]">
          <select
            className="w-[92px] min-w-[92px] border-none focus:ring-0 text-[10px] bg-transparent dark:text-slate-100 pr-1"
            value={dateRangeType}
            onChange={(e) => setDateRangeType(e.target.value)}
          >
            <option>This Month</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Custom Range</option>
          </select>

          <div className="flex items-center border-l border-gray-300 dark:border-slate-600 pl-1.5 min-w-0 flex-1">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 dark:text-slate-500 mr-1.5 text-[10px]" />
            <input
              type="text"
              value={formatDateRange(dates[0], dates[1])}
              onClick={() => {
                if (dateRangeType === "Custom Range") setModalIsOpen(true);
              }}
              className="w-full min-w-0 border-none focus:ring-0 text-[10px] bg-transparent text-gray-700 dark:text-slate-200 whitespace-nowrap"
              placeholder="Select"
              readOnly
              title={formatDateRange(dates[0], dates[1])}
            />
          </div>
        </div>
      </div>

      <div className="w-[100px] shrink-0">
        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
          Status
        </label>
        <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-md px-1.5 py-1 bg-white dark:bg-slate-700 h-[36px]">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400 dark:text-slate-500 mr-1.5 text-[10px]" />
          <select
            className="w-full min-w-0 border-none focus:ring-0 text-[10px] bg-transparent dark:text-slate-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-end gap-1 shrink-0">
        <button
          className="flex items-center justify-center bg-blue-600 text-white h-[36px] w-[36px] rounded-md text-[10px] font-semibold hover:bg-blue-700 shadow-md"
          onClick={handleApplyFilter}
          disabled={loading || exporting}
          title="Filter"
          aria-label="Filter"
        >
          <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
        </button>

        {/* <button
          className="flex items-center justify-center bg-green-600 text-white h-[36px] w-[36px] rounded-md text-[10px] font-semibold hover:bg-green-700 shadow-md"
          onClick={handleExportExcel_All}
          disabled={loading || exporting || !filteredData.length}
          title="Export All"
          aria-label="Export All"
        >
          <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
        </button> */}
      </div>
    </div>
  </div>
) : (
          <div className="flex flex-col md:flex-row flex-wrap items-end gap-2 overflow-x-auto p-4 mt-10">
            <div className="flex-shrink-0 sm:min-w-[200px]">
              {/* <label className="block text-sm font-semibold text-gray-600 mb-1">Date Range:</label> */}
              <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700">
                <select
                  className="border-none focus:ring-0 text-sm bg-transparent dark:text-slate-100 pr-2"
                  value={dateRangeType}
                  onChange={(e) => setDateRangeType(e.target.value)}
                >
                  <option>This Month</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Custom Range</option>
                </select>

                <div className="flex items-center border-l border-gray-300 dark:border-slate-600 pl-2 min-w-[200px]">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 dark:text-slate-500 mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    value={formatDateRange(dates[0], dates[1])}
                    onClick={() => {
                      if (dateRangeType === "Custom Range") setModalIsOpen(true);
                    }}
                    className="w-full min-w-0 h-[25px] border-none focus:ring-0 text-sm bg-transparent text-gray-700 dark:text-slate-200 tabular-nums whitespace-nowrap pr-2"
                    placeholder="Select date range"
                    readOnly
                    title={formatDateRange(dates[0], dates[1])}
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 min-w-[200px]">
              {/* <label className="block text-sm font-semibold text-gray-600 mb-1">Status:</label> */}
              <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700">
                <FontAwesomeIcon icon={faFilter} className="text-gray-400 dark:text-slate-500 mr-2" />
                <select
                  className="w-full h-[25px] border-none focus:ring-0 text-sm dark:bg-slate-700 dark:text-slate-100"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto mt-auto">
              <button
                className="inline-flex h-[35px] min-w-[96px] items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium leading-none text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 w-full md:w-auto"
                onClick={handleApplyFilter}
                disabled={loading || exporting}
              >
                <FontAwesomeIcon icon={faFilter} className="text-[13px]" />
                {loading ? "Loading..." : "Filter"}
              </button>
                  <button
                className="inline-flex h-[35px] min-w-[96px] items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium leading-none text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 w-full md:w-auto"
                onClick={handleResetUI}
                disabled={loading || exporting}
              >
                <FontAwesomeIcon icon={faRedo} className="text-[13px]" />
                <span className="truncate">Reset</span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto ml-auto">
            </div>
          </div>
        )}

<div className="px-4">
  <div className="flex items-center justify-between gap-2">
    <div className="flex gap-1 whitespace-nowrap overflow-x-auto min-w-0">
      {Object.keys(tabData).map((tabKey) => {
        const isTabActive = activeTab === tabKey;
        const tabLabel = tabKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const normalizedTabKey = String(tabKey).toLowerCase();
        const tabIcon =
          normalizedTabKey.includes("gl") ||
          normalizedTabKey.includes("ledger") ||
          normalizedTabKey.includes("journal")
            ? faBook
            : normalizedTabKey.includes("detail")
            ? faList
            : faTable;

        return (
          <button
            key={tabKey}
            title={tabLabel}
            aria-label={tabLabel}
            className={`py-1.5 ${isMobile ? "px-1.5 min-w-[60px]" : "px-10"} text-sm text-center border rounded-t-lg transition-all duration-200 ${
              isTabActive
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold shadow-lg shadow-blue-300 dark:shadow-none relative before:absolute before:inset-x-0 before:bottom-0 before:h-[3px] before:bg-blue-700 dark:before:bg-blue-400 before:rounded-t-md"
                : "bg-white dark:bg-slate-700 shadow-lg shadow-blue-50 dark:shadow-none text-gray-600 dark:text-slate-300 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600"
            }`}
            onClick={() => {
              setActiveTab(tabKey);
              setSortConfig({ key: null, direction: "asc", tabKey });
              setShowColumnChooser(false);
              setShowExportMenu(false);
            }}
          >
            <span
              className={`flex w-full items-center justify-center gap-2 ${
                isMobile ? "text-[12px] leading-none" : "text-sm"
              } truncate`}
            >
              <FontAwesomeIcon icon={tabIcon} className={isMobile ? "text-[11px]" : "text-[13px]"} />
              {tabLabel}
            </span>
          </button>
        );
      })}
    </div>

        <div className="flex items-center shrink-0 min-w-[28px] justify-end gap-2">
          {refreshing && (
            <LoadingDots label="Refreshing..." />
          )}
          </div>
        </div>
      </div>

        <div className="bg-white dark:bg-slate-800 shadow-md rounded-md overflow-visible px-2 pt-2 pb-0 mt-0 mb-4 mx-4">
          {activeTab && visibleCols.length > 0  && (
            <div className="p-1 bg-white dark:bg-slate-800 rounded-md flex flex-col md:flex-row md:items-center md:justify-between gap-2 shrink-0 mb-0"
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => handleColDrop(e, null, true)}>
              
              <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0">
                {groupBy.length === 0 && !isMobile && (
                  <div className="text-gray-400 dark:text-slate-500 italic border border-dashed border-gray-300 dark:border-slate-600 rounded text-[10px] sm:text-xs px-8 py-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-1" /> Drag column here to Group
                  </div>
                )}
                {groupBy.map(gKey => (
                  <div key={gKey} className="flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 text-xs px-2 py-1">
                    {baseColumns.find(c => c.key === gKey)?.label}
                    <button type="button" onClick={() => handleRemoveGroupedColumn(gKey)} className="ml-2 text-blue-600 dark:text-blue-400 hover:text-red-500">
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto overflow-visible">
                {groupBy.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="inline-flex items-center cursor-pointer select-none h-8">
                      <input type="checkbox" checked={allExpanded} onChange={() => toggleAllGroups(!allExpanded)} className="sr-only" />
                      <div className={`relative rounded-full transition-colors duration-200 ${allExpanded ? "bg-blue-600 text-white" : "bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-slate-300"} w-24 h-8`}>
                        <span className={`absolute rounded-full bg-white shadow-md transition-all duration-200 ${allExpanded ? "left-[66px]" : "left-[2px]"} top-[2px] w-7 h-7`} />
                        <span className={`absolute inset-0 flex items-center font-medium pointer-events-none text-[11px] ${allExpanded ? "justify-start pl-4" : "justify-end pr-4"}`}>{allExpanded ? "Collapse" : "Expand"}</span>
                      </div>
                    </label>
                    <button type="button" onClick={clearActiveGrouping} className="font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition h-8 text-xs px-3">
                      <FontAwesomeIcon icon={faTimes} className="mr-1" /> Clear Grouping 
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
                  <input type="text" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                         placeholder="Quick Search..." className="w-full min-w-[120px] rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500 outline-none h-8 md:w-48 px-3 text-xs" />
                </div>

                {isMobile && (
                  <div className="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm shrink-0">
                    <button
                      type="button"
                      onClick={() => setUseCardView(false)}
                      className={`h-8 w-8 ${!useCardView ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}
                      title="Table View"
                    >
                      <FontAwesomeIcon icon={faTable} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCardView(true)}
                      className={`h-8 w-8 ${useCardView ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300"}`}
                      title="Card View"
                    >
                      <FontAwesomeIcon icon={faThLarge} />
                    </button>
                  </div>
                )}

                {!isMobile && (
                  <label className="inline-flex items-center cursor-pointer select-none shrink-0 h-8">
                      <input type="checkbox" checked={autoFillGridState} onChange={() => setAutoFillGridState(!autoFillGridState)} className="sr-only" />
                      <div className={`relative rounded-full transition-colors duration-200 ${autoFillGridState ? "bg-blue-600 text-white" : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300"} w-20 h-8`}>
                          <span className={`absolute top-[2px] rounded-full bg-white shadow-md transition-all duration-200 ${autoFillGridState ? "left-[50px]" : "left-[2px]"} w-7 h-7`} />
                          <span className={`absolute inset-0 flex items-center text-[11px] font-medium pointer-events-none transition-all duration-200 ${autoFillGridState ? "justify-start pl-2 text-white" : "justify-end pr-2"}`}>Auto Fit</span>
                      </div>
                  </label>
                )}

                <div className="relative shrink-0" data-sgrt-export>
                  <button type="button" onClick={() => filteredData.length > 0 && setShowExportMenu(!showExportMenu)} disabled={filteredData.length === 0}
                          className="text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center h-8 px-3 whitespace-nowrap">
                    <FontAwesomeIcon icon={faFileExport} className="mr-1" /> Export
                  </button>
                 {showExportMenu && (
                    <div className="absolute right-0 mt-1 min-w-[120px] rounded-lg shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black/10 dark:ring-slate-700 z-[60] overflow-hidden py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          openExportModal("excel");
                        }}
                        className="flex items-center w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" />
                        Excel
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          openExportModal("csv");
                        }}
                        className="flex items-center w-full px-4 py-2 text-xs hover:bg-blue-50 transition-colors"
                      >
                        <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-emerald-600" />
                        CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          openExportModal("pdf");
                        }}
                        className="flex items-center w-full px-4 py-2 text-xs hover:bg-blue-50 transition-colors"
                      >
                        <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                        PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          openExportModal("image");
                        }}
                        className="flex items-center w-full px-4 py-2 text-xs hover:bg-blue-50 transition-colors"
                      >
                        <FontAwesomeIcon icon={faFileImage} className="mr-2 text-blue-600" />
                        Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0" data-sgrt-cols>
                  <button type="button" onClick={handleToggleColumnChooser} className="text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition flex items-center justify-center h-8 px-3 whitespace-nowrap">
                    <FontAwesomeIcon icon={faColumns} className="mr-1" /> Columns
                  </button>
                  {showColumnChooser && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-3 py-3">
                      <div
                        data-sgrt-cols
                        className="flex max-h-[60vh] w-full max-w-[480px] flex-col overflow-hidden rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/10 dark:ring-slate-700"
                      >
                        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-slate-700 px-3 py-2">
                          <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              Manage Columns - {activeTabLabel}
                            </h2>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              Choose the columns to display in the table.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="h-6 w-6 shrink-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            onClick={handleCloseColumnChooser}
                            title="Close"
                          >
                            <FontAwesomeIcon icon={faTimes} className="text-sm" />
                          </button>
                        </div>

                        <div className="border-b border-gray-200 dark:border-slate-700 px-3 py-2">
                          <div className="flex flex-col gap-2">
                            <div className="relative min-w-0 flex-1">
                              <FontAwesomeIcon
                                icon={faSearch}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                              />
                              <input
                                type="text"
                                value={columnChooserSearch}
                                onChange={(e) => setColumnChooserSearch(e.target.value)}
                                placeholder="Search columns..."
                                className="h-7 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 pl-9 pr-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto">
                              <label className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1 text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 accent-blue-600"
                                  checked={allChecked}
                                  onChange={(e) => handleToggleAllColumns(e.target.checked)}
                                />
                                {allChecked ? `UnSelect All (${chooserColumns.length})` : `Select All (${chooserColumns.length})`}
                              </label>
                              <div className="h-5 shrink-0 border-l border-gray-300 dark:border-slate-600" />
                              {/* <button
                                type="button"
                                className="h-7 shrink-0 px-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                                onClick={handleResetColumnChooser}
                              >
                                Reset
                              </button> */}
                              <button
                                type="button"
                                className="h-7 shrink-0 rounded-md border border-gray-300 dark:border-slate-600 px-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                onClick={() => {
                                  setColumnChooserDraftHidden([]);
                                  setColumnChooserSearch("");
                                }}
                              >
                                Restore Default
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto px-3 py-2 custom-scrollbar">
                          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                            {filteredChooserColumns.map((col) => (
                              <label
                                key={col.key}
                                className="flex h-7 items-center gap-1.5 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-[11px] text-slate-800 dark:text-slate-200 shadow-sm cursor-pointer select-none hover:bg-blue-50 dark:hover:bg-slate-600"
                              >
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 shrink-0 accent-blue-600"
                                  checked={!columnChooserDraftHidden.includes(col.key)}
                                  onChange={(e) => handleToggleColumnVisibility(col.key, e.target.checked)}
                                />
                                <span className="min-w-0 flex-1 truncate">{col.label}</span>
                                <FontAwesomeIcon icon={faGripVertical} className="text-[11px] text-slate-300 dark:text-slate-500" />
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-slate-700 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Showing {filteredChooserColumns.length === 0 ? 0 : 1}-{filteredChooserColumns.length} of {chooserColumns.length} columns
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="h-7 min-w-[72px] rounded-md border border-gray-300 dark:border-slate-600 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                              onClick={handleCloseColumnChooser}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="h-7 min-w-[72px] rounded-md bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700"
                              onClick={handleApplyColumnChooser}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div
            ref={tableScrollRef}
            className={`overflow-auto bg-white dark:bg-slate-700 rounded-md max-h-[60vh] relative custom-scrollbar ${autoFillGridState ? "overflow-x-hidden" : ""}`}
          >
            {loading ? (
              <div className="text-center py-6 text-gray-500 dark:text-slate-400">Loading data and configurations...</div>
            ) : !activeTab || visibleCols.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-slate-400">
                Select a date range and click ‘Filter’ to load history.
              </div>
            ) : isMobile && useCardView ? (
              <div className="space-y-2 p-2">
                {displayRows.length > 0 ? (
                  <>
                    {displayRows.map((row, idx) => {
                      if (groupBy.length > 0 && row.isGroup) {
                        return renderMobileGroupRow(row, idx);
                      }

                      if (groupBy.length > 0 && row.isSubtotal) {
                        return renderMobileSubtotalCard(row, idx);
                      }

                      return renderMobileCard(row, idx);
                    })}

                    {filteredData.length > 0 && renderMobileGrandTotalCard()}
                  </>
                ) : (
                  <div className="rounded-md border dark:border-slate-700 py-4 text-center text-gray-500 dark:text-slate-400">
                    No records found matching the filter criteria.
                  </div>
                )}
              </div>
            ) : (
              <>
                {isMobile && visibleCols.length > MOBILE_MAX_COLUMNS && (
                  <div className="mb-2 text-[11px] text-gray-500 dark:text-slate-400">
                    Showing first {MOBILE_MAX_COLUMNS} columns on mobile table view.
                  </div>
                )}

               <table
                    key={groupingRenderKey}
                    className={`global-tran-table-div-ui w-full text-center ${autoFillGridState ? "table-fixed" : "min-w-[1200px] table-auto"}`}
                  >
                  <thead className="text-[11px] font-bold sticky top-0 z-30">
                    <tr className="bg-blue-100 dark:bg-slate-700 text-blue-900 dark:text-slate-100">
                      <th
                        className="sticky left-0 top-0 z-50 px-2 bg-blue-100 dark:bg-slate-700 text-blue-900 dark:text-slate-100 w-[64px]"
                        style={{ minWidth: ACTION_COL_WIDTH, maxWidth: ACTION_COL_WIDTH }}
                      >
                        View
                      </th>

                      {renderVisibleCols.map((col, i) => {
                        const meta = stickyPlan[i];
                        const style = meta.sticky
                          ? {
                              left: meta.left,
                              width: meta.width || 140,
                              minWidth: meta.width || 140,
                              maxWidth: 400,
                            }
                          : {
                              width: meta.width || undefined,
                              minWidth: meta.width || undefined,
                              maxWidth: 400,
                            };

                        return (
                          <th
                            key={col.key}
                            draggable={!groupBy.includes(col.key)}
                            onDragStart={(e) => handleColDragStart(e, col.key)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleColDrop(e, col.key)}
                            onClick={() => col.sortable !== false && handleSort(col.key)}
                            className={`px-2 py-2 select-none relative ${
                              col.sortable !== false ? "cursor-pointer" : ""
                            } ${autoFillGridState ? "whitespace-normal break-words" : "whitespace-nowrap"} ${meta.sticky ? "sticky z-50 bg-blue-100 dark:bg-slate-700" : ""} ${numberAlignClass(col)}`}
                            style={style}
                          >
                            <div className={`flex items-center justify-between gap-2 ${autoFillGridState ? "min-w-0" : ""}`}>
                              <span className={autoFillGridState ? "min-w-0 whitespace-normal break-words leading-tight" : "truncate"}>{col.label}</span>
                              {col.sortable !== false &&
                              sortConfig.key === col.key &&
                              sortConfig.tabKey === activeTab ? (
                                <FontAwesomeIcon
                                  icon={sortConfig.direction === "asc" ? faArrowUp : faArrowDown}
                                  className="opacity-50"
                                />
                              ) : null}
                            </div>

                            <div
                              className="absolute top-0 right-0 h-full w-1 cursor-col-resize select-none"
                              onMouseDown={(e) => startResizing(e, col.key)}
                            />
                          </th>
                        );
                      })}
                    </tr>

                    <tr className="bg-gray-100 dark:bg-slate-700/80 sticky top-[25px] z-20">
                      <td className="sticky left-0 z-40 px-2 py-1 border-r border-b border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/80" />
                      {renderVisibleCols.map((col, i) => {
                        const meta = stickyPlan[i];
                        const style = meta.sticky
                          ? {
                              left: meta.left,
                              width: meta.width || undefined,
                              minWidth: meta.width || undefined,
                            }
                          : {
                              width: meta.width || undefined,
                              minWidth: meta.width || undefined,
                            };

                        return (
                          <td
                            key={col.key}
                            className={`px-1 py-1 border-r border-b border-gray-200 dark:border-slate-600 whitespace-nowrap ${
                              meta.sticky ? "sticky z-30 bg-gray-100 dark:bg-slate-700/80" : ""
                            }`}
                            style={style}
                          >
                            <input
                              type="text"
                              value={searchFields[col.key] || ""}
                              onChange={(e) => handleSearchChange(e, col.key)}
                              placeholder="Filter..."
                              className="w-full px-1.5 py-0.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-500 text-[10px]"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="bg-white dark:bg-slate-700 text-[11px] dark:text-slate-100">
                    {displayRows.length > 0 ? (
                      <>
                        {displayRows.map((row, idx) => {
                          if (groupBy.length > 0 && row.isGroup) {
                            const uniqueId = `${row.key}-${row.value}-${row.level}`;
                            const isExpanded = autoExpandGroups || expandedGroups[uniqueId];
                            return (
                              <tr
                                key={`g-${uniqueId}`}
                                className="bg-gray-100 dark:bg-slate-700/60 hover:bg-gray-200 dark:hover:bg-slate-600/60 cursor-pointer border-b dark:border-slate-600"
                                onClick={() => toggleGroup(row)}
                              >
                                <td
                                  colSpan={renderVisibleCols.length + 1}
                                  className="px-2 py-1 font-bold text-blue-800 dark:text-blue-300 whitespace-nowrap text-left"
                                >
                                  <div className="flex items-center" style={{ paddingLeft: row.level * 20 }}>
                                    <FontAwesomeIcon
                                      icon={isExpanded ? faChevronDown : faChevronRight}
                                      className="mr-2 text-gray-500 dark:text-slate-400"
                                    />
                                    <span className="text-gray-600 dark:text-slate-400 font-normal">
                                      {baseColumns.find((c) => c.key === row.key)?.label}:
                                    </span>
                                    <span className="ml-1">{row.value}</span>
                                    <span className="ml-2 bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] px-2 rounded-full font-normal">
                                      {row.count}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          if (groupBy.length > 0 && row.isSubtotal) {
                            return (
                              <tr
                                key={`sub-${row.groupValue}-${idx}`}
                                className="bg-blue-50 dark:bg-blue-900/20 font-bold border-b dark:border-slate-600 text-[10px]"
                              >
                                <td className="sticky left-0 bg-blue-50 dark:bg-blue-900/20 border-r dark:border-slate-600 z-10" />
                                {renderVisibleCols.map((col, i) => {
                                  const meta = stickyPlan[i];
                                  const val = row.aggregates[col.key];
                                  const style = meta.sticky
                                    ? {
                                        left: meta.left,
                                        width: meta.width || undefined,
                                        minWidth: meta.width || undefined,
                                      }
                                    : {
                                        width: meta.width || undefined,
                                        minWidth: meta.width || undefined,
                                      };

                                  return (
                                    <td
                                      key={col.key}
                                      className={`px-2 py-1 whitespace-nowrap ${numberAlignClass(col)} ${
                                        meta.sticky ? "sticky z-10 bg-blue-50 dark:bg-blue-900/20" : ""
                                      }`}
                                      style={style}
                                    >
                                      {i === 0 && (
                                        <div
                                          className="float-left text-left font-bold"
                                          style={{ paddingLeft: row.level * 20 }}
                                        >
                                          <span className="text-gray-500 dark:text-slate-400 uppercase">Subtotal: {row.groupValue}</span>
                                        </div>
                                      )}
                                      {val !== undefined ? formatCellValue(val, col) : ""}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          }

                          const rowClass = getRowClassByStatus(row);
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors cursor-pointer border-b dark:border-slate-600 group ${rowClass} ${
                                idx % 2 === 0 ? "bg-white dark:bg-slate-700 dark:text-slate-100" : "bg-gray-50 dark:bg-slate-600/60 dark:text-slate-100"
                              }`}
                              onDoubleClick={() => handleRowDoubleClick(row)}
                            >
                              <td className="sticky left-0 z-10 px-2 py-0 border-r border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-slate-600 text-center w-[64px] min-w-[64px]">
                                <div className="flex items-center justify-center h-6">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowDoubleClick(row);
                                    }}
                                    className="px-2 py-0 bg-blue-600 text-white rounded hover:bg-blue-700 transition leading-none"
                                    title="View"
                                  >
                                    <FontAwesomeIcon icon={faEye} className="w-2.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              {renderVisibleCols.map((col, i) => {
                                const meta = stickyPlan[i];
                                const alignRight =
                                  isNumericColumn(col) || col.classNames?.includes("text-right");
                                const style = meta.sticky
                                  ? {
                                      left: meta.left,
                                      width: meta.width || undefined,
                                      minWidth: meta.width || undefined,
                                      maxWidth: 400,
                                    }
                                  : {
                                      width: meta.width || undefined,
                                      minWidth: meta.width || undefined,
                                      maxWidth: 400,
                                    };

                                return (
                                  <td
                                    key={col.key}
                                    className={`px-1.5 py-1 leading-tight whitespace-nowrap ${
                                      alignRight ? "text-right tabular-nums" : col.classNames || "text-left"
                                    } ${meta.sticky ? "sticky z-10 bg-inherit" : ""}`}
                                    title={String(row?.[col.key] ?? "")}
                                    style={style}
                                  >
                                   <div
                                    style={{
                                      maxWidth: isMobile ? "180px" : (autoFillGridState ? "100%" : "420px"),
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {formatCellValue(row?.[col.key], col)}
                                  </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={renderVisibleCols.length + 1} className="text-center text-gray-500 dark:text-slate-400 py-4 border dark:border-slate-700">
                          No records found matching the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {filteredData.length > 0 && hasGrandTotalColumns && (
                    <tfoot className="sticky bottom-0 z-30 shadow-[0_-4px_6px_rgba(0,0,0,0.05)] bg-blue-100 dark:bg-slate-700 font-bold border-t border-blue-400 dark:border-slate-600">
                      <tr>
                        <td className="sticky left-0 bg-blue-100 dark:bg-slate-700 border-r border-gray-300 dark:border-slate-600 z-40" />
                        {renderVisibleCols.map((col, i) => {
                          const meta = stickyPlan[i];
                          const val = grandTotals[col.key];
                          const style = meta.sticky
                            ? {
                                left: meta.left,
                                width: meta.width || undefined,
                                minWidth: meta.width || undefined,
                              }
                            : {
                                width: meta.width || undefined,
                                minWidth: meta.width || undefined,
                              };

                          return (
                            <td
                              key={col.key}
                              className={`px-2 py-1.5 text-[11px] ${numberAlignClass(col)} ${
                                meta.sticky ? "sticky z-30 bg-blue-100 dark:bg-slate-700" : ""
                              }`}
                              style={style}
                            >
                              {i === 0 && (
                                <span className="text-gray-800 dark:text-slate-200 uppercase tracking-wide whitespace-nowrap">
                                  {groupBy.length > 0 ? "Grand Total" : "Grand Total"}
                                </span>
                              )}
                              {val !== undefined ? formatCellValue(val, col) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden export table */}
      {activeTab && filteredData.length > 0 && (
        <div ref={exportContainerRef} style={{ position: "absolute", left: "-99999px", top: 0 }}>
          <table className="border-collapse text-[8px]">
            <thead>
              <tr>
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className="border px-2 py-1 text-left bg-gray-200 align-top"
                    style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(groupBy.length === 0 ? filteredData : fullRenderRows).map((row, idx) => {
                if (groupBy.length > 0 && row.isGroup) {
                  return (
                    <tr key={`exp-g-${row.key}-${row.value}-${row.level}-${idx}`}>
                      <td
                        colSpan={visibleCols.length}
                        className="border px-2 py-1 font-semibold bg-gray-100"
                        style={{ whiteSpace: "normal", wordBreak: "break-word" }}
                      >
                        {baseColumns.find((c) => c.key === row.key)?.label}: {row.value} ({row.count})
                      </td>
                    </tr>
                  );
                }

                if (groupBy.length > 0 && row.isSubtotal) {
                  return (
                    <tr key={`exp-sub-${row.groupValue}-${idx}`}>
                      {visibleCols.map((col, i) => {
                        const val = row.aggregates[col.key];
                        return (
                          <td
                            key={col.key}
                            className="border px-2 py-1 font-semibold bg-yellow-50 align-top"
                            style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                          >
                            {i === 0 && (
                              <>
                                Sub Total for {row.groupLabel}: {row.groupValue}{" "}
                              </>
                            )}
                            {val !== undefined ? formatCellValue(val, col) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }

                return (
                  <tr key={`exp-row-${idx}`}>
                    {visibleCols.map((col) => (
                      <td
                        key={col.key}
                        className="border px-2 py-1 align-top"
                        style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                      >
                        {formatCellValue(row[col.key], col)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>

            {hasGrandTotalColumns && (
              <tfoot>
                <tr>
                  {visibleCols.map((col, i) => (
                    <td
                      key={col.key}
                      className="border px-2 py-1 font-bold bg-gray-100 align-top"
                      style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                    >
                      {i === 0 && (groupBy.length > 0 ? "Grand Total" : "Total")}
                      {grandTotals[col.key] !== undefined ? ` ${formatCellValue(grandTotals[col.key], col)}` : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Date Picker Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        closeTimeoutMS={150}
        className="w-[min(100vw,500px)] sm:w-[min(100vw,500px)] h-[90vh] sm:h-auto sm:max-h-[80vh] mx-auto sm:mt-4 rounded-none sm:rounded-2xl shadow-2xl bg-white dark:bg-slate-800 overflow-hidden outline-none"
        overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      >
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
          <h2 className="text-base font-semibold">Select Custom Date Range</h2>
          <p className="text-xs/relaxed text-white/80">
            Choose a range or use quick presets. Press{" "}
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded">Esc</kbd> to cancel.
          </p>
          <button
            onClick={() => setModalIsOpen(false)}
            className="absolute right-3 top-3 grid place-items-center w-8 h-8 rounded-full hover:bg-white/15 focus:ring-2 focus:ring-white/60"
            aria-label="Close"
            title="Close"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <path
                fill="currentColor"
                d="M11.41 10l4.3-4.29a1 1 0 10-1.42-1.42L10 8.59 5.71 4.29a1 1 0 10-1.42 1.42L8.59 10l-4.3 4.29a1 1 0 101.42 1.42L10 11.41l4.29 4.3a1 1 0 001.42-1.42z"
              />
            </svg>
          </button>
        </div>

        <div className="p-2 sm:p-2 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 h-[calc(90vh-120px)] sm:h-auto overflow-auto">
          <div className="space-y-1 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  setDates([t, t]);
                }}
              >
                Today
              </button>
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  const y = new Date(t);
                  y.setDate(t.getDate() - 1);
                  setDates([y, y]);
                }}
              >
                Yesterday
              </button>
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  setDates([subDays(t, 6), t]);
                }}
              >
                Last 7 Days
              </button>
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  setDates([subDays(t, 29), t]);
                }}
              >
                Last 30 Days
              </button>
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  setDates([startOfMonth(t), endOfMonth(t)]);
                }}
              >
                This Month
              </button>
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  const last = addMonths(t, -1);
                  setDates([startOfMonth(last), endOfMonth(last)]);
                }}
              >
                Last Month
              </button>
              <button
                className="btn-outline text-sm hover:bg-blue-100"
                onClick={() => {
                  const t = new Date();
                  setDates([startOfYear(t), endOfYear(t)]);
                }}
              >
                YTD
              </button>
              <button
                className="btn-ghost text-sm hover:bg-blue-100"
                onClick={() => setDates([null, null])}
                title="Clear selection"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 p-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Selected Range</div>
              {dates?.[0] && dates?.[1] ? (
                <div>
                  {format(dates[0], "MMM dd, yyyy")} — {format(dates[1], "MMM dd, yyyy")}
                </div>
              ) : (
                <div className="italic text-slate-400 dark:text-slate-500">No range selected</div>
              )}
              {granularity !== "day" && (
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Mode: <span className="uppercase">{granularity}</span> (one tap selects entire{" "}
                  {granularity})
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 sm:p-2">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Select by:</span>
              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                {["day", "month", "year"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={`px-3 py-1.5 text-xs capitalize ${
                      granularity === g ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="reactdp-one">
              <DatePicker
                inline
                fixedHeight
                monthsShown={1}
                shouldCloseOnSelect={false}
                selectsRange={granularity === "day"}
                startDate={dates[0]}
                endDate={dates[1]}
                onChange={(update) => {
                  if (granularity === "day") setDates(update);
                }}
                onSelect={(d) => {
                  if (!d) return;
                  if (granularity === "month") setDates([startOfMonth(d), endOfMonth(d)]);
                  else if (granularity === "year") setDates([startOfYear(d), endOfYear(d)]);
                }}
                openToDate={dates?.[1] ?? dates?.[0] ?? new Date()}
                renderCustomHeader={({
                  date,
                  decreaseMonth,
                  increaseMonth,
                  prevMonthButtonDisabled,
                  nextMonthButtonDisabled,
                  changeYear,
                  changeMonth,
                }) => {
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];
                  const currentYear = new Date().getFullYear();
                  const years = Array.from({ length: 16 }, (_, i) => currentYear + 1 - i);

                  return (
                    <div className="flex items-center justify-between gap-2 px-2 py-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={decreaseMonth}
                          disabled={prevMonthButtonDisabled}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 dark:text-slate-200 disabled:opacity-40"
                          title="Previous month"
                          type="button"
                        >
                          ‹
                        </button>
                        <button
                          onClick={increaseMonth}
                          disabled={nextMonthButtonDisabled}
                          className="px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-40"
                          title="Next month"
                          type="button"
                        >
                          ›
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-100"
                          value={date.getMonth()}
                          onChange={(e) => changeMonth(Number(e.target.value))}
                        >
                          {months.map((m, idx) => (
                            <option key={m} value={idx}>
                              {m}
                            </option>
                          ))}
                        </select>

                        <select
                          className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white"
                          value={date.getFullYear()}
                          onChange={(e) => changeYear(Number(e.target.value))}
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>

          <style jsx="true">{`
            .reactdp-one .react-datepicker__header {
              padding-top: 6px;
            }
          `}</style>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-white/95 dark:bg-slate-800/95 border-t border-slate-200 dark:border-slate-700">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Tip: Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded">Enter</kbd> to apply.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModalIsOpen(false)}
              className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (dates?.[0] && dates?.[1]) setModalIsOpen(false);
              }}
              disabled={!dates?.[0] || !dates?.[1]}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium enabled:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>


        </div>

        <style jsx="true">{`
          .btn-outline {
            @apply text-slate-700 border border-slate-300 rounded-md px-1 py-1 text-xs sm:text-xs hover:bg-slate-100 text-left;
            min-height: 30px;
          }
          .btn-ghost {
            @apply text-slate-600 rounded-md px-1 py-1 text-xs sm:text-xs hover:bg-slate-100 text-left;
            min-height: 30px;
          }
          .reactdp-row .react-datepicker {
            display: flex !important;
            flex-wrap: nowrap;
            gap: 8px;
          }
          .reactdp-row .react-datepicker__month-container {
            flex: 0 0 auto;
            width: 290px;
          }
          .reactdp-row .react-datepicker__header {
            padding-top: 6px;
          }
          @media (min-width: 640px) {
            .reactdp-row .react-datepicker__month-container {
              width: 300px;
            }
          }
        `}</style>
      </Modal>


      <ExportFileNameModal
        isOpen={exportModal.isOpen}
        title={exportModal.title}
        defaultFileName={exportModal.defaultFileName}
        confirmText={exportModal.confirmText}
        onClose={closeExportModal}
        onConfirm={handleExportConfirm}
      />

      {(loading || exporting) && (
        <LoadingDots label={exporting ? "Exporting, please wait..." : "Loading, please wait..."} fullScreen />
      )}
    </>
  );
};

export default AllTranHistory;
