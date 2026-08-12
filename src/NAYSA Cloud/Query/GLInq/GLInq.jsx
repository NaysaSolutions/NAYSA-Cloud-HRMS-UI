
// import React, { useState, useCallback, useMemo, useEffect } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faBars,
//   faChevronLeft,
//   faChevronRight,
//   faMagnifyingGlass,
//   faUndo,
//   faPrint,
//   faTimes,
//   faFilter,
//   faDatabase,
//   faListOl,
//   faTable,
//   faThLarge,
// } from "@fortawesome/free-solid-svg-icons";

// import {
//   useTopCompanyRow,
//   useTopUserRow,
//   useTopBranchRow,
//   useTopCutOffRow,
//   useTopAccountRow,
//   useTopSLRow,
// } from "@/NAYSA Cloud/Global/top1RefTable";

// import {
//   useHandlePrintQuery,
// } from '@/NAYSA Cloud/Global/report';

// import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
// import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
// import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
// import SearchSLMast from "@/NAYSA Cloud/Lookup/SearchSLMast.jsx";
// import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
// import SearchCutOffRef from "@/NAYSA Cloud/Lookup/SearchCutOffRef.jsx";
// import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
// import CurrLookupModal from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";

// import GLQueryReport from "./GLQueryReport.jsx";
// import SLQueryReport from "./SLQueryReport.jsx";
// import TBQueryReport from "./TBQueryReport.jsx";
// import TrialBalanceReport from "./TrialBalanceReport.jsx";
// import BalSheetYTDReport from "./BalSheetYTDReport.jsx";
// import IncomeStatementYTDReport from "./IncomeStatementYTDReport.jsx";
// import IncomeStatementMTDReport from "./IncomeStatementMTDReport.jsx";
// import IncomeExpenseReport from "./IncomeExpenseReport.jsx";

// export default function GLINQ() {
//   const { user, companyInfo, currentUserRow } = useAuth();

//   const [activeTab, setActiveTab] = useState("glQuery");
//   const [showFilterModal, setShowFilterModal] = useState(false);
//   const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
//   const [hideNav, setHideNav] = useState(false);

//   const [isMobile, setIsMobile] = useState(false);
//   const [mobileView, setMobileView] = useState("table");
//   const [drilldownExpandedByTab, setDrilldownExpandedByTab] = useState({
//     balSheetYTD: {},
//     incStatementYTD: {},
//   });

//   useEffect(() => {
//     const checkMobile = () => {
//       const mobile = window.innerWidth < 768;
//       setIsMobile(mobile);
//       if (!mobile) setMobileView("table");
//     };

//     checkMobile();
//     window.addEventListener("resize", checkMobile);
//     return () => window.removeEventListener("resize", checkMobile);
//   }, []);

//   const tabRegistry = useMemo(
//     () => ({
//       glQuery: GLQueryReport,
//       slQuery: SLQueryReport,
//       tbQuery: TBQueryReport,
//       trialBalance: TrialBalanceReport,
//       balSheetYTD: BalSheetYTDReport,
//       incStatementYTD: IncomeStatementYTDReport,
//       isMTD: IncomeStatementMTDReport,
//       incExp: IncomeExpenseReport,
//     }),
//     []
//   );

//   const tabConfigs = useMemo(() => {
//     const entries = Object.entries(tabRegistry).map(([key, Report]) => [
//       key,
//       Report?.meta || {
//         label: key,
//         filters: [],
//         icon: faListOl,
//       },
//     ]);

//     return Object.fromEntries(entries);
//   }, [tabRegistry]);

//   const DEFAULT_FILTERS = useMemo(
//     () => ({
//       branchCode: currentUserRow?.branchCode || "",
//       branchName: currentUserRow?.branchName || "",

//       currCode: companyInfo?.currCode || "",
//       currName: companyInfo?.currName || "",

//       accCode: "",
//       accName: "",
//       accCodeStart: "",
//       accNameStart: "",
//       accCodeEnd: "",
//       accNameEnd: "",

//       slCode: "",
//       slName: "",

//       rcCode: "",
//       rcName: "",
//       rcCodeStart: "",
//       rcNameStart: "",
//       rcCodeEnd: "",
//       rcNameEnd: "",

//       cutoffCode: companyInfo?.cutoffCode || "",
//       cutoffName: companyInfo?.cutoffName || "",
//       cutoffStartCode: companyInfo?.cutoffCode || "",
//       cutoffStartName: companyInfo?.cutoffName || "",
//       cutoffEndCode: companyInfo?.cutoffCode || "",
//       cutoffEndName: companyInfo?.cutoffName || "",

//       compareYears: 5,

//       showLookupModal: false,
//       lookupType: "",
//       cutoffModalType: "",
//     }),
//     [companyInfo, currentUserRow]
//   );

//   const [filtersByTab, setFiltersByTab] = useState(() => {
//     const init = {};
//     Object.keys(tabConfigs).forEach((k) => {
//       init[k] = { ...DEFAULT_FILTERS };
//     });
//     return init;
//   });

//   const EMPTY_VIEW = useMemo(
//     () => ({
//       cols: [],
//       rows: [],
//       rightActionLabel: "View",
//       hasLoaded: false,
//       appliedFilters: null,
//       loadedAt: null,
//       isEmpty: false,
//       emptyMessage: "",
//       comparisonPeriods: [],
//       summary: {
//         totalDebit: 0,
//         totalCredit: 0,
//         netBalance: 0,
//         totalAsset: 0,
//         totalLiability: 0,
//         totalIncome: 0,
//         totalExpense: 0,
//         netIncome: 0,
//         totalRows: 0,
//         summaryPeriodCode: "",
//         summaryPeriodLabel: "",
//       },
//     }),
//     []
//   );

//   const [views, setViews] = useState(() => {
//     const init = {};
//     Object.keys(tabConfigs).forEach((k) => {
//       init[k] = { ...EMPTY_VIEW };
//     });
//     return init;
//   });

//   const [isLoading, setIsLoading] = useState(false);
//   const [showSpinner, setShowSpinner] = useState(false);

//   useEffect(() => {
//     let t;
//     if (isLoading) t = setTimeout(() => setShowSpinner(true), 200);
//     else setShowSpinner(false);
//     return () => clearTimeout(t);
//   }, [isLoading]);

//   useEffect(() => {
//     setFiltersByTab((prev) => {
//       const next = { ...prev };
//       Object.keys(tabConfigs).forEach((k) => {
//         if (!next[k]) next[k] = { ...DEFAULT_FILTERS };
//       });
//       return next;
//     });

//     setViews((prev) => {
//       const next = { ...prev };
//       Object.keys(tabConfigs).forEach((k) => {
//         if (!next[k]) next[k] = { ...EMPTY_VIEW };
//       });
//       return next;
//     });
//   }, [tabConfigs, DEFAULT_FILTERS, EMPTY_VIEW]);

//   const filters = filtersByTab[activeTab] || DEFAULT_FILTERS;
//   const view = views[activeTab] || EMPTY_VIEW;
//   const activeTabConfig = tabConfigs[activeTab] || tabConfigs.glQuery || {
//     label: "GL Inquiry",
//     filters: [],
//     icon: faListOl,
//   };

//   const updateFilters = useCallback(
//     (patch, tabKey = activeTab) => {
//       setFiltersByTab((prev) => ({
//         ...prev,
//         [tabKey]: { ...(prev[tabKey] || DEFAULT_FILTERS), ...patch },
//       }));
//     },
//     [activeTab, DEFAULT_FILTERS]
//   );



//   const updateDrilldownExpanded = useCallback((tabKey, updater) => {
//   setDrilldownExpandedByTab((prev) => {
//     const current = prev?.[tabKey] || {};
//     const nextValue =
//       typeof updater === "function" ? updater(current) : updater;

//     return {
//       ...prev,
//       [tabKey]: nextValue || {},
//     };
//   });
// }, []);


  

//   const applyToAllTabs = useCallback(
//     (patch) => {
//       setFiltersByTab((prev) => {
//         const next = { ...prev };
//         Object.keys(tabConfigs).forEach((k) => {
//           next[k] = { ...(next[k] || DEFAULT_FILTERS), ...patch };
//         });
//         return next;
//       });
//     },
//     [tabConfigs, DEFAULT_FILTERS]
//   );


  

//   const normalizeRows = useCallback((resp) => {
//     const directRows =
//       resp?.data?.rows ??
//       resp?.data?.data ??
//       resp?.data?.data?.rows ??
//       resp?.data?.rowsData;

//     if (Array.isArray(directRows)) return directRows;

//     const jsonText = resp?.data?.[0]?.result;
//     if (jsonText) {
//       const parsed = JSON.parse(jsonText);
//       const block = parsed?.[0] || {};
//       const rows = block?.dt1 ?? block?.rows ?? block?.data ?? [];
//       return Array.isArray(rows) ? rows : [];
//     }

//     return [];
//   }, []);

//   const safeRightActionLabel = useCallback((colsResp) => {
//     if (colsResp?.rightActionLabel) return colsResp.rightActionLabel;
//     return "View";
//   }, []);

//   const parseAmount = useCallback((v) => {
//     if (v == null) return 0;
//     if (typeof v === "number") return Number.isFinite(v) ? v : 0;

//     const cleaned = String(v).replace(/,/g, "").trim();
//     const parsed = parseFloat(cleaned);
//     return Number.isFinite(parsed) ? parsed : 0;
//   }, []);

//   const summarizeRows = useCallback(
//     (rows = []) => {
//       let totalDebit = 0;
//       let totalCredit = 0;

//       rows.forEach((row) => {
//         totalDebit += parseAmount(row?.debit ?? 0);
//         totalCredit += parseAmount(row?.credit ?? 0);
//       });

//       return {
//         totalDebit,
//         totalCredit,
//         netBalance: totalDebit - totalCredit,
//         totalAsset: 0,
//         totalLiability: 0,
//         totalIncome: 0,
//         totalExpense: 0,
//         netIncome: 0,
//         totalRows: Array.isArray(rows) ? rows.length : 0,
//         summaryPeriodCode: "",
//         summaryPeriodLabel: "",
//       };
//     },
//     [parseAmount]
//   );

//   const summarizeBalanceSheetRows = useCallback(
//     (rows = [], comparisonPeriods = []) => {
//       const basePeriod = comparisonPeriods?.[0] || "";
//       let totalAsset = 0;
//       let totalLiability = 0;

//       rows.forEach((row) => {
//         const fsType = normalizeFsType(row?.fs_type);
//         if (fsType !== "BS") return;

//         const name = String( row?.fsconso_name ??"")
//           .trim()
//           .toLowerCase();

//         const amount = parseAmount(row?.fs_amount??0
//         );

//         if (name.includes("total asset")) totalAsset = amount;
//         if (name.includes("total liabil")) totalLiability = amount;
//       });

//       return {
//         totalDebit: 0,
//         totalCredit: 0,
//         netBalance: 0,
//         totalAsset,
//         totalLiability,
//         totalIncome: 0,
//         totalExpense: 0,
//         netIncome: 0,
//         totalRows: Array.isArray(rows) ? rows.length : 0,
//         summaryPeriodCode: basePeriod,
//         summaryPeriodLabel: basePeriod ? formatCutoffHeaderLabel(basePeriod) : "",
//       };
//     },
//     [parseAmount]
//   );


//  const summarizeIncomeStatementRows = useCallback(
//     (rows = [], comparisonPeriods = []) => {
//       const basePeriod = comparisonPeriods?.[0] || "";
//       let totalIncome = 0;
//       let totalExpense = 0;

//       rows.forEach((row) => {
//         const fsType = normalizeFsType(row?.fs_type);
//         if (fsType !== "IS") return;

//         const name = String(
//           row?.fsconso_name??
//             ""
//         )
//           .trim()
//           .toLowerCase();

//         const amount = parseAmount(row?.fs_amount ?? 0
            
//         );

//         if (name.includes("net income")) totalIncome = amount;
//         if (name.includes("total expen")) totalExpense = amount;
//       });

//       return {
//         totalDebit: 0,
//         totalCredit: 0,
//         netBalance: 0,
//         totalAsset: 0,
//         totalLiability: 0,
//         totalIncome,
//         totalExpense,
//         netIncome: totalIncome - totalExpense,
//         totalRows: Array.isArray(rows) ? rows.length : 0,
//         summaryPeriodCode: basePeriod,
//         summaryPeriodLabel: basePeriod ? formatCutoffHeaderLabel(basePeriod) : "",
//       };
//     },
//     [parseAmount]
//   );


//   const runSharedFinancialStatementYTD = useCallback(
//     async (f) => {
//       const balReport = tabRegistry.balSheetYTD;
//       const isReport = tabRegistry.incStatementYTD;

//       if (!balReport || !isReport) return;

//       setIsLoading(true);

//       const endpoint = balReport?.meta?.endpoint || "getBSIS_YTD";
//       const compareYears = clampCompareYears(f?.compareYears);
//       const payload = balReport.buildPayload({
//         ...f,
//         compareYears,
//       });
//       const comparisonPeriods = buildComparativeCutoffs(
//         payload.cutoffCode || f.cutoffCode,
//         compareYears
//       );
//       const startedAt = new Date().toISOString();

//       try {
//         const [colsResp, periodResponses] = await Promise.all([
//           useSelectedHSColConfig(endpoint),
//           Promise.all(
//             comparisonPeriods.map((periodCode) => {
//               const requestJson = balReport.buildJsonData({
//                 ...payload,
//                 cutoffCode: periodCode,
//                 compareYears,
//                 userCode:currentUserRow.userCode,
//               });
            
//               return fetchData(endpoint, {
//                 json_data: { json_data: requestJson },
//               });       
//             })
//           ),
//         ]);


//         const colsArray = Array.isArray(colsResp) ? colsResp : [];
//         const rowsByPeriod = {};

//         comparisonPeriods.forEach((periodCode, idx) => {
//           rowsByPeriod[periodCode] = normalizeRows(periodResponses[idx]);
//         });

//         const mergedRows = mergeComparativeFinancialStatementRows(
//           rowsByPeriod,
//           comparisonPeriods
//         );

//         const bsRows = mergedRows.filter(
//           (row) => normalizeFsType(row?.fs_type) === "BS"
//         );
//         const isRows = mergedRows.filter(
//           (row) => normalizeFsType(row?.fs_type) === "IS"
//         );

//         const bsIsEmpty = bsRows.length === 0;
//         const isIsEmpty = isRows.length === 0;

//         setViews((prev) => ({
//           ...prev,
//           balSheetYTD: {
//             cols: colsArray,
//             rows: bsRows,
//             rightActionLabel: safeRightActionLabel(colsResp),
//             hasLoaded: true,
//             appliedFilters: payload,
//             loadedAt: startedAt,
//             isEmpty: bsIsEmpty,
//             emptyMessage: bsIsEmpty
//               ? "No Balance Sheet records found for the selected filters."
//               : "",
//             comparisonPeriods,
//             summary: summarizeBalanceSheetRows(bsRows, comparisonPeriods),
//           },
//           incStatementYTD: {
//             cols: colsArray,
//             rows: isRows,
//             rightActionLabel: safeRightActionLabel(colsResp),
//             hasLoaded: true,
//             appliedFilters: payload,
//             loadedAt: startedAt,
//             isEmpty: isIsEmpty,
//             emptyMessage: isIsEmpty
//               ? "No Income Statement records found for the selected filters."
//               : "",
//             comparisonPeriods,
//             summary: summarizeIncomeStatementRows(isRows, comparisonPeriods),
//           },
//         }));
//       } catch (e) {
//         console.error("[GLINQ] runSharedFinancialStatementYTD failed:", e);

//         const errorView = {
//           hasLoaded: true,
//           isEmpty: true,
//           emptyMessage: "Unable to load records. Please try again.",
//           loadedAt: new Date().toISOString(),
//           comparisonPeriods: [],
//           summary: {
//             totalDebit: 0,
//             totalCredit: 0,
//             netBalance: 0,
//             totalAsset: 0,
//             totalLiability: 0,
//             totalIncome: 0,
//             totalExpense: 0,
//             netIncome: 0,
//             totalRows: 0,
//             summaryPeriodCode: "",
//             summaryPeriodLabel: "",
//           },
//         };

//         setViews((prev) => ({
//           ...prev,
//           balSheetYTD: {
//             ...(prev.balSheetYTD || EMPTY_VIEW),
//             ...errorView,
//           },
//           incStatementYTD: {
//             ...(prev.incStatementYTD || EMPTY_VIEW),
//             ...errorView,
//           },
//         }));
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [
//       tabRegistry,
//       normalizeRows,
//       safeRightActionLabel,
//       summarizeBalanceSheetRows,
//       summarizeIncomeStatementRows,
//       EMPTY_VIEW,
//     ]
//   );

//   const runTabQuery = useCallback(
//     async (tabKey, f) => {
//       if (tabKey === "balSheetYTD" || tabKey === "incStatementYTD") {
//         await runSharedFinancialStatementYTD(f);
//         return;
//       }

//       const Report = tabRegistry[tabKey];
//       if (!Report) return;

//       setIsLoading(true);

//       const endpoint = Report?.meta?.endpoint;
//       if (
//         !endpoint ||
//         typeof Report?.buildPayload !== "function" ||
//         typeof Report?.buildJsonData !== "function"
//       ) {
//         console.error(`[GLINQ] Missing meta/builders for tab: ${tabKey}`);
//         setIsLoading(false);
//         return;
//       }

//       const payload = Report.buildPayload(f);
//       const startedAt = new Date().toISOString();

//       try {
//         const jsonData = Report.buildJsonData(payload);

//         const [colsResp, rowsResp] = await Promise.all([
//           useSelectedHSColConfig(endpoint),
//           fetchData(endpoint, { json_data: { json_data: jsonData } }),
//         ]);

//         const colsArray = Array.isArray(colsResp) ? colsResp : [];
//         const finalRows = normalizeRows(rowsResp);
//         const isEmpty = !finalRows || finalRows.length === 0;

//         setViews((prev) => ({
//           ...prev,
//           [tabKey]: {
//             cols: colsArray,
//             rows: finalRows,
//             rightActionLabel: safeRightActionLabel(colsResp),
//             hasLoaded: true,
//             appliedFilters: payload,
//             loadedAt: startedAt,
//             isEmpty,
//             emptyMessage: isEmpty
//               ? "No records found for the selected filters."
//               : "",
//             comparisonPeriods: [],
//             summary: summarizeRows(finalRows),
//           },
//         }));
//       } catch (e) {
//         console.error(`[GLINQ] runTabQuery failed for ${tabKey}:`, e);
//         setViews((prev) => ({
//           ...prev,
//           [tabKey]: {
//             ...(prev[tabKey] || EMPTY_VIEW),
//             hasLoaded: true,
//             isEmpty: true,
//             emptyMessage: "Unable to load records. Please try again.",
//             loadedAt: new Date().toISOString(),
//             comparisonPeriods: [],
//             summary: {
//               totalDebit: 0,
//               totalCredit: 0,
//               netBalance: 0,
//               totalAsset: 0,
//               totalLiability: 0,
//               totalIncome: 0,
//               totalExpense: 0,
//               netIncome: 0,
//               totalRows: 0,
//               summaryPeriodCode: "",
//               summaryPeriodLabel: "",
//             },
//           },
//         }));
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [
//       tabRegistry,
//       normalizeRows,
//       safeRightActionLabel,
//       summarizeRows,
//       EMPTY_VIEW,
//       runSharedFinancialStatementYTD,
//     ]
//   );

//   const parseGroupId = useCallback((groupId, tabSource) => {
//     if (!groupId) return null;

//     const parts = String(groupId)
//       .split(/[|~]/)
//       .map((p) => p.trim());

//     if (parts.length <= 1) return null;

//     switch (tabSource) {
//       case "slQuery": {
//         const [branchCode, cutOffCode, acctCode, sltypeCode, slCode] = parts;
//         return { branchCode, cutOffCode, acctCode, sltypeCode, slCode };
//       }
//       case "tbQuery": {
//         const [tbCutOff, tbAcct, rcCode] = parts;
//         return { cutOffCode: tbCutOff, acctCode: tbAcct, rcCode };
//       }
//       default:
//         return null;
//     }
//   }, []);

//   const jumpToGLQueryFromSL = useCallback(
//     async (row) => {
//       const decoded = parseGroupId(row?.groupId, "slQuery");
//       if (!decoded) return;

//       const currentGL = filtersByTab.glQuery || DEFAULT_FILTERS;

//       const [fBranch, fAcct, fPeriod, fSL] = await Promise.all([
//         useTopBranchRow(decoded?.branchCode),
//         useTopAccountRow(decoded?.acctCode),
//         useTopCutOffRow(decoded?.cutOffCode),
//         useTopSLRow(decoded?.slCode),
//       ]);

//       const glFilters = {
//         ...currentGL,
//         branchCode: decoded.branchCode,
//         branchName: fBranch?.branchName || "",
//         accCode: decoded.acctCode,
//         accName: fAcct?.acctName || "",
//         slCode: decoded.slCode,
//         slName: fSL?.slName || "",
//         cutoffStartCode: decoded.cutOffCode,
//         cutoffStartName: fPeriod?.cutoffName || "",
//         cutoffEndCode: decoded.cutOffCode,
//         cutoffEndName: fPeriod?.cutoffName || "",
//         rcCode: "",
//         rcName: "",
//         rcCodeStart: "",
//         rcNameStart: "",
//         rcCodeEnd: "",
//         rcNameEnd: "",
//       };

//       updateFilters(glFilters, "glQuery");
//       setActiveTab("glQuery");
//       await runTabQuery("glQuery", glFilters);
//     },
//     [parseGroupId, filtersByTab, DEFAULT_FILTERS, updateFilters, runTabQuery]
//   );

//   const jumpToGLQueryFromTB = useCallback(
//     async (row) => {
//       const decoded = parseGroupId(row?.groupId, "tbQuery");
//       if (!decoded) return;

//       const currentGL = filtersByTab.glQuery || DEFAULT_FILTERS;

//       const [fAcct, fPeriod] = await Promise.all([
//         useTopAccountRow(decoded?.acctCode),
//         useTopCutOffRow(decoded?.cutOffCode),
//       ]);

//       const glFilters = {
//         ...currentGL,
//         branchCode: "",
//         branchName: "",
//         accCode: decoded.acctCode,
//         accName: fAcct?.acctName || "",
//         slCode: "",
//         slName: "",
//         cutoffStartCode: decoded.cutOffCode,
//         cutoffStartName: fPeriod?.cutoffName || "",
//         cutoffEndCode: decoded.cutOffCode,
//         cutoffEndName: fPeriod?.cutoffName || "",
//         rcCode: "",
//         rcName: "",
//         rcCodeStart: "",
//         rcNameStart: "",
//         rcCodeEnd: "",
//         rcNameEnd: "",
//       };

//       updateFilters(glFilters, "glQuery");
//       setActiveTab("glQuery");
//       await runTabQuery("glQuery", glFilters);
//     },
//     [parseGroupId, filtersByTab, DEFAULT_FILTERS, updateFilters, runTabQuery]
//   );





// const jumpToGLInquiryFromBS = useCallback(
//   async ({ acctCode, acctName, rcCode = "", rcName = "", slCode = "", slName = "" }) => {
//     const currentGL = filtersByTab.glQuery || DEFAULT_FILTERS;

//     const fAcct = acctCode ? await useTopAccountRow(acctCode) : null;

//     const glFilters = {
//       ...currentGL,
//       accCode: acctCode || "",
//       accName: acctName || fAcct?.acctName || "",
//       rcCode: rcCode || "",
//       rcName: rcName || "",
//       slCode: slCode || "",
//       slName: slName || "",
//       rcCodeStart: "",
//       rcNameStart: "",
//       rcCodeEnd: "",
//       rcNameEnd: "",
//     };

//     updateFilters(glFilters, "glQuery");
//     setActiveTab("glQuery");
//     await runTabQuery("glQuery", glFilters);
//   },
//   [filtersByTab, DEFAULT_FILTERS, updateFilters, runTabQuery]
// );





//   const loadDefaults = useCallback(async () => {
//     try {
//       const [hsCompany, hsUser] = await Promise.all([
//         useTopCompanyRow(),
//         useTopUserRow(user?.USER_CODE),
//       ]);

//       if (hsCompany) {
//         applyToAllTabs({
//           cutoffCode: hsCompany.cutoffCode,
//           cutoffName: hsCompany.cutoffName,
//           cutoffStartCode: hsCompany.cutoffCode,
//           cutoffStartName: hsCompany.cutoffName,
//           cutoffEndCode: hsCompany.cutoffCode,
//           cutoffEndName: hsCompany.cutoffName,
//           currCode: hsCompany.currCode || companyInfo?.currCode || "",
//           currName: hsCompany.currName || companyInfo?.currName || "",
//           compareYears: 5,
//         });
//       }

//       if (hsUser) {
//         const hsBranch = await useTopBranchRow(hsUser.branchCode);
//         applyToAllTabs({
//           branchCode: hsUser.branchCode,
//           branchName: hsBranch?.branchName || hsUser.branchName,
//         });
//       }
//     } catch (err) {
//       console.error("Error loading defaults:", err);
//     }
//   }, [applyToAllTabs, user?.USER_CODE, companyInfo]);

//   useEffect(() => {
//     if (!user?.USER_CODE) return;
//     loadDefaults();
//   }, [user?.USER_CODE, loadDefaults]);

//   const handleReset = useCallback(() => {
//     updateFilters(
//       {
//         ...DEFAULT_FILTERS,
//         branchCode: filters.branchCode,
//         branchName: filters.branchName,
//         cutoffCode: filters.cutoffCode,
//         cutoffName: filters.cutoffName,
//         cutoffStartCode: filters.cutoffStartCode,
//         cutoffStartName: filters.cutoffStartName,
//         cutoffEndCode: filters.cutoffEndCode,
//         cutoffEndName: filters.cutoffEndName,
//         currCode: filters.currCode,
//         currName: filters.currName,
//         compareYears: 1,
//       },
//       activeTab
//     );

//     setViews((prev) => {
//       if (activeTab === "balSheetYTD" || activeTab === "incStatementYTD") {
//         return {
//           ...prev,
//           balSheetYTD: { ...EMPTY_VIEW },
//           incStatementYTD: { ...EMPTY_VIEW },
//         };
//       }

//       return {
//         ...prev,
//         [activeTab]: { ...EMPTY_VIEW },
//       };
//     });
//   }, [updateFilters, DEFAULT_FILTERS, filters, activeTab, EMPTY_VIEW]);

//   const handleNavSelect = useCallback((tabKey) => {
//     setActiveTab(tabKey);
//     setIsMobileNavOpen(false);
//   }, []);

 

//   const handlePrint = useCallback(() => {
    
//     const { cutoffCode, currCode, rcCode } = filters;


//     if (activeTab === "balSheetYTD") {
      
//       const params = `cutoffCode:${cutoffCode}|currCode:${currCode}|rcCode:${rcCode}`;
//       useHandlePrintQuery("BSYTD.rpt", currentUserRow?.userCode, params);
//       return;
//     }

//     if (activeTab === "incStatementYTD") {
//       const params = `cutoffCode:${cutoffCode}|currCode:${currCode}|rcCode:${rcCode}`;
//       useHandlePrintQuery("ISYTD.rpt", currentUserRow?.userCode,params);
//       return;
//     }

//     window.print();
//   }, [activeTab, currentUserRow?.userCode]);




  
//   const handleFind = useCallback(() => setShowFilterModal(true), []);
//   const handleApplyFilters = useCallback(async () => {
//     setShowFilterModal(false);
//     await runTabQuery(activeTab, filters);
//   }, [activeTab, filters, runTabQuery]);

//   const ActiveReport = tabRegistry[activeTab];
//   const currentContext = buildContextText(filters, activeTab);

//   return (
//     <div className="global-ref-main-div-ui">
//       {showSpinner && <LoadingSpinner />}

//       <div className="global-ref-header-ui">
//         <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
//           <div className="flex w-full md:w-auto md:justify-start">
//             <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
//               GL Inquiry
//             </h1>
//           </div>

//           <div className="flex w-full md:w-auto md:justify-end">
//             <div className="w-full overflow-visible md:w-auto">
//               <div className="flex flex-nowrap items-center justify-center gap-2 md:justify-end">
//                 <button
//                   onClick={() => setIsMobileNavOpen(true)}
//                   className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:hidden"
//                 >
//                   <FontAwesomeIcon icon={faBars} />
//                 </button>

//                 <button
//                   onClick={handleFind}
//                   className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
//                 >
//                   <FontAwesomeIcon icon={faMagnifyingGlass} />
//                   <span className="ml-2 hidden lg:inline">Filter</span>
//                 </button>

//                 <button
//                   onClick={handleReset}
//                   className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
//                 >
//                   <FontAwesomeIcon icon={faUndo} />
//                   <span className="ml-2 hidden lg:inline">Reset</span>
//                 </button>

//                 <button
//                   onClick={handlePrint}
//                   className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
//                 >
//                   <FontAwesomeIcon icon={faPrint} />
//                   <span className="ml-2 hidden lg:inline">Print</span>
//                 </button>

//                 <button
//                   onClick={() => setHideNav((v) => !v)}
//                   className="hidden shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:inline-flex"
//                 >
//                   <FontAwesomeIcon
//                     icon={hideNav ? faChevronRight : faChevronLeft}
//                   />
//                   <span className="ml-2 hidden xl:inline">
//                     {hideNav ? "Expand Nav" : "Collapse Nav"}
//                   </span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="mt-32 px-0 sm:mt-24">
//         <div className="flex gap-3">
//           <aside
//             className={`hidden transition-all duration-200 lg:block ${
//               hideNav ? "w-[88px]" : "w-[290px]"
//             }`}
//           >
//             <div className="global-tran-tab-div-ui h-full">
//               <div className="h-full overflow-hidden rounded-2xl border bg-white shadow-sm">
//                 <div className="border-b px-4 py-4">
//                   {!hideNav ? (
//                     <>
//                       <div className="text-sm font-semibold text-gray-800">
//                         GL Reports
//                       </div>
//                       <div className="mt-1 text-xs text-gray-500">
//                         Select a report, set filters, then load data.
//                       </div>
//                     </>
//                   ) : (
//                     <div className="text-center text-[11px] font-semibold text-blue-700">
//                       GL
//                     </div>
//                   )}
//                 </div>

//                 <div className="p-3">
//                   <ReportNavList
//                     activeTab={activeTab}
//                     tabConfigs={tabConfigs}
//                     handleSelect={handleNavSelect}
//                     collapsed={hideNav}
//                   />
//                 </div>
//               </div>
//             </div>
//           </aside>

//           <div className="min-w-0 flex-1">
//             <div className="global-tran-tab-div-ui">
//               <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
//                 <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
//                   <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
//                     <div>
//                       <div className="text-base font-semibold text-gray-800">
//                         {activeTabConfig.label}
//                       </div>
//                       <div className="mt-0.5 text-[11px] text-gray-500">
//                         Review balances, movements, and drilldown results using your
//                         selected filters.
//                       </div>
//                     </div>

//                     <div className="text-[10px] leading-4 text-gray-600 md:text-right">
//                       {currentContext}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="p-4">
//                   <ContextCards summary={view.summary} activeTab={activeTab} />
//                 </div>
//               </div>
//             </div>

//             <div className="global-tran-tab-div-ui">
//               <div className="global-tran-tab-nav-ui">
//                 <div className="flex flex-wrap items-center justify-between gap-2">
//                   <div className="flex items-center gap-2">
//                     <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
//                       {activeTabConfig.label}
//                     </button>
//                   </div>

//                   {isMobile && (
//                     <div className="inline-flex overflow-hidden rounded-md border border-gray-300 bg-white">
//                       <button
//                         type="button"
//                         onClick={() => setMobileView("table")}
//                         className={`flex h-8 items-center gap-1 px-3 text-[11px] font-medium ${
//                           mobileView === "table"
//                             ? "bg-blue-600 text-white"
//                             : "bg-white text-gray-600"
//                         }`}
//                       >
//                         <FontAwesomeIcon icon={faTable} />
//                         Table
//                       </button>

//                       <button
//                         type="button"
//                         onClick={() => setMobileView("card")}
//                         className={`flex h-8 items-center gap-1 px-3 text-[11px] font-medium ${
//                           mobileView === "card"
//                             ? "bg-blue-600 text-white"
//                             : "bg-white text-gray-600"
//                         }`}
//                       >
//                         <FontAwesomeIcon icon={faThLarge} />
//                         Card
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="global-tran-table-main-div-ui">
             
//                   <ActiveReport
//                     view={view}
//                     filters={filters}
//                     tabConfig={activeTabConfig}
//                     isMobile={isMobile}
//                     mobileView={mobileView}
//                     onJumpToGLFromSL={jumpToGLQueryFromSL}
//                     onJumpToGLFromTB={jumpToGLQueryFromTB}
//                     onJumpToGLInquiry={jumpToGLInquiryFromBS}
//                     expandedMap={drilldownExpandedByTab[activeTab] || {}}
//                     setExpandedMap={(updater) => updateDrilldownExpanded(activeTab, updater)}
//                     SearchGlobalReportTable={SearchGlobalReportTable}
//                     NoRecordsState={NoRecordsState}
//                   />
//                 </div>
            
//             </div>
//           </div>
//         </div>
//       </div>

//       {showFilterModal && (
//         <FilterModal
//           tabConfig={activeTabConfig}
//           filters={filters}
//           onClose={() => setShowFilterModal(false)}
//           onApply={handleApplyFilters}
//           updateLookupState={updateFilters}
//           isLoading={isLoading}
//         />
//       )}

//       <MobileNavDrawer
//         isOpen={isMobileNavOpen}
//         onClose={() => setIsMobileNavOpen(false)}
//         activeTab={activeTab}
//         tabConfigs={tabConfigs}
//         handleSelect={handleNavSelect}
//       />

//       <LookupManager filters={filters} updateFilters={updateFilters} />
//     </div>
//   );
// }
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
  faUndo,
  faPrint,
  faTimes,
  faFilter,
  faDatabase,
  faListOl,
} from "@fortawesome/free-solid-svg-icons";

import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
  useTopCutOffRow,
  useTopAccountRow,
  useTopSLRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import { useHandlePrintQuery } from "@/NAYSA Cloud/Global/report";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchSLMast from "@/NAYSA Cloud/Lookup/SearchSLMast.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import SearchCutOffRef from "@/NAYSA Cloud/Lookup/SearchCutOffRef.jsx";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import CurrLookupModal from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";

import GLQueryReport from "./GLQueryReport.jsx";
import SLQueryReport from "./SLQueryReport.jsx";
import TrialBalanceReport from "./TrialBalanceReport.jsx";
import BalSheetYTDReport from "./BalSheetYTDReport.jsx";
import IncomeStatementYTDReport from "./IncomeStatementYTDReport.jsx";
import IncomeStatementMTDReport from "./IncomeStatementMTDReport.jsx";
import IncomeExpenseReport from "./IncomeExpenseReport.jsx";

export default function GLINQ({
  pageTitle = "GL Query",
  sourceMode = "GL_QUERY",
}) {
  const { user, companyInfo, currentUserRow } = useAuth();

  const [activeTab, setActiveTab] = useState("glQuery");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [hideNav, setHideNav] = useState(false);
  const [incomeStatementMTDView, setIncomeStatementMTDView] =
    useState("perMonth");
  const [incomeExpenseView, setIncomeExpenseView] = useState("perMonth");

  const [drilldownExpandedByTab, setDrilldownExpandedByTab] = useState({
    balSheetYTD: {},
    incStatementYTD: {},
  });

  const tabRegistry = useMemo(
    () => ({
      glQuery: GLQueryReport,
      slQuery: SLQueryReport,
      trialBalance: TrialBalanceReport,
      balSheetYTD: BalSheetYTDReport,
      incStatementYTD: IncomeStatementYTDReport,
      isMTD: IncomeStatementMTDReport,
      incExp: IncomeExpenseReport,
    }),
    []
  );

  const tabConfigs = useMemo(() => {
    const entries = Object.entries(tabRegistry).map(([key, Report]) => [
      key,
      Report?.meta || {
        label: key,
        filters: [],
        icon: faListOl,
      },
    ]);

    return Object.fromEntries(entries);
  }, [tabRegistry]);

  const DEFAULT_FILTERS = useMemo(
    () => ({
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",

      currCode: companyInfo?.currCode || "",
      currName: companyInfo?.currName || "",

      accCode: "",
      accName: "",
      accCodeStart: "",
      accNameStart: "",
      accCodeEnd: "",
      accNameEnd: "",

      slCode: "",
      slName: "",

      rcCode: "",
      rcName: "",
      rcCodeStart: "",
      rcNameStart: "",
      rcCodeEnd: "",
      rcNameEnd: "",

      cutoffCode: companyInfo?.cutoffCode || "",
      cutoffName: companyInfo?.cutoffName || "",
      cutoffStartCode: companyInfo?.cutoffCode || "",
      cutoffStartName: companyInfo?.cutoffName || "",
      cutoffEndCode: companyInfo?.cutoffCode || "",
      cutoffEndName: companyInfo?.cutoffName || "",

      compareYears: 5,

      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    }),
    [companyInfo, currentUserRow]
  );

  const [filtersByTab, setFiltersByTab] = useState(() => {
    const init = {};
    Object.keys(tabConfigs).forEach((k) => {
      init[k] = { ...DEFAULT_FILTERS };
    });
    return init;
  });

  const EMPTY_VIEW = useMemo(
    () => ({
      cols: [],
      rows: [],
      rightActionLabel: "View",
      hasLoaded: false,
      appliedFilters: null,
      loadedAt: null,
      isEmpty: false,
      emptyMessage: "",
      comparisonPeriods: [],
      reportData: null,
      summary: {
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        totalAsset: 0,
        totalLiability: 0,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        totalRows: 0,
        summaryPeriodCode: "",
        summaryPeriodLabel: "",
      },
    }),
    []
  );

  const [views, setViews] = useState(() => {
    const init = {};
    Object.keys(tabConfigs).forEach((k) => {
      init[k] = { ...EMPTY_VIEW };
    });
    return init;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => setShowSpinner(true), 200);
    else setShowSpinner(false);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    setFiltersByTab((prev) => {
      const next = { ...prev };
      Object.keys(tabConfigs).forEach((k) => {
        if (!next[k]) next[k] = { ...DEFAULT_FILTERS };
      });
      return next;
    });

    setViews((prev) => {
      const next = { ...prev };
      Object.keys(tabConfigs).forEach((k) => {
        if (!next[k]) next[k] = { ...EMPTY_VIEW };
      });
      return next;
    });
  }, [tabConfigs, DEFAULT_FILTERS, EMPTY_VIEW]);

  const filters = filtersByTab[activeTab] || DEFAULT_FILTERS;
  const view = views[activeTab] || EMPTY_VIEW;
  const activeTabConfig = tabConfigs[activeTab] || tabConfigs.glQuery || {
    label: "GL Inquiry",
    filters: [],
    icon: faListOl,
  };

  const updateFilters = useCallback(
    (patch, tabKey = activeTab) => {
      setFiltersByTab((prev) => ({
        ...prev,
        [tabKey]: { ...(prev[tabKey] || DEFAULT_FILTERS), ...patch },
      }));
    },
    [activeTab, DEFAULT_FILTERS]
  );

  const updateDrilldownExpanded = useCallback((tabKey, updater) => {
    setDrilldownExpandedByTab((prev) => {
      const current = prev?.[tabKey] || {};
      const nextValue =
        typeof updater === "function" ? updater(current) : updater;

      return {
        ...prev,
        [tabKey]: nextValue || {},
      };
    });
  }, []);

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

  const normalizeRows = useCallback((resp) => {
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
  }, []);

  const safeRightActionLabel = useCallback((colsResp) => {
    if (colsResp?.rightActionLabel) return colsResp.rightActionLabel;
    return "View";
  }, []);

  const parseAmount = useCallback((v) => {
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;

    const cleaned = String(v).replace(/,/g, "").trim();
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const summarizeRows = useCallback(
    (rows = []) => {
      let totalDebit = 0;
      let totalCredit = 0;

      rows.forEach((row) => {
        totalDebit += parseAmount(row?.debit ?? 0);
        totalCredit += parseAmount(row?.credit ?? 0);
      });

      return {
        totalDebit,
        totalCredit,
        netBalance: totalDebit - totalCredit,
        totalAsset: 0,
        totalLiability: 0,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        totalRows: Array.isArray(rows) ? rows.length : 0,
        summaryPeriodCode: "",
        summaryPeriodLabel: "",
      };
    },
    [parseAmount]
  );

  const summarizeBalanceSheetRows = useCallback(
    (rows = [], comparisonPeriods = []) => {
      const basePeriod = comparisonPeriods?.[0] || "";
      let totalAsset = 0;
      let totalLiability = 0;

      rows.forEach((row) => {
        const fsType = normalizeFsType(row?.fs_type);
        if (fsType !== "BS") return;

        const name = String(row?.fsconso_name ?? "")
          .trim()
          .toLowerCase();

        const amount = parseAmount(row?.fs_amount ?? 0);

        if (name.includes("total asset")) totalAsset = amount;
        if (name.includes("total liabil")) totalLiability = amount;
      });

      return {
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        totalAsset,
        totalLiability,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        totalRows: Array.isArray(rows) ? rows.length : 0,
        summaryPeriodCode: basePeriod,
        summaryPeriodLabel: basePeriod ? formatCutoffHeaderLabel(basePeriod) : "",
      };
    },
    [parseAmount]
  );

  const summarizeIncomeStatementRows = useCallback(
    (rows = [], comparisonPeriods = []) => {
      const basePeriod = comparisonPeriods?.[0] || "";
      let totalIncome = 0;
      let totalExpense = 0;

      rows.forEach((row) => {
        const fsType = normalizeFsType(row?.fs_type);
        if (fsType !== "IS") return;

        const name = String(row?.fsconso_name ?? "")
          .trim()
          .toLowerCase();

        const amount = parseAmount(row?.fs_amount ?? 0);

        if (name.includes("net income")) totalIncome = amount;
        if (name.includes("total expen")) totalExpense = amount;
      });

      return {
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        totalAsset: 0,
        totalLiability: 0,
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        totalRows: Array.isArray(rows) ? rows.length : 0,
        summaryPeriodCode: basePeriod,
        summaryPeriodLabel: basePeriod ? formatCutoffHeaderLabel(basePeriod) : "",
      };
    },
    [parseAmount]
  );

  const runSharedFinancialStatementYTD = useCallback(
    async (f) => {
      const balReport = tabRegistry.balSheetYTD;
      const isReport = tabRegistry.incStatementYTD;

      if (!balReport || !isReport) return;

      setIsLoading(true);

      const endpoint = balReport?.meta?.endpoint || "getBSIS_YTD";
      const compareYears = clampCompareYears(f?.compareYears);
      const payload = balReport.buildPayload({
        ...f,
        compareYears,
      });
      const comparisonPeriods = buildComparativeCutoffs(
        payload.cutoffCode || f.cutoffCode,
        compareYears
      );
      const startedAt = new Date().toISOString();

      try {
        const [colsResp, periodResponses] = await Promise.all([
          useSelectedHSColConfig(endpoint),
          Promise.all(
            comparisonPeriods.map((periodCode) => {
              const requestJson = balReport.buildJsonData({
                ...payload,
                cutoffCode: periodCode,
                compareYears,
                userCode: currentUserRow.userCode,
              });

              requestJson.sourceMode = sourceMode;

              return fetchData(endpoint, {
                json_data: { json_data: requestJson },
              });
            })
          ),
        ]);

        const colsArray = Array.isArray(colsResp) ? colsResp : [];
        const rowsByPeriod = {};

        comparisonPeriods.forEach((periodCode, idx) => {
          rowsByPeriod[periodCode] = normalizeRows(periodResponses[idx]);
        });

        const mergedRows = mergeComparativeFinancialStatementRows(
          rowsByPeriod,
          comparisonPeriods
        );

        const bsRows = mergedRows.filter(
          (row) => normalizeFsType(row?.fs_type) === "BS"
        );
        const isRows = mergedRows.filter(
          (row) => normalizeFsType(row?.fs_type) === "IS"
        );

        const bsIsEmpty = bsRows.length === 0;
        const isIsEmpty = isRows.length === 0;

        setViews((prev) => ({
          ...prev,
          balSheetYTD: {
            cols: colsArray,
            rows: bsRows,
            rightActionLabel: safeRightActionLabel(colsResp),
            hasLoaded: true,
            appliedFilters: payload,
            loadedAt: startedAt,
            isEmpty: bsIsEmpty,
            emptyMessage: bsIsEmpty
              ? "No Balance Sheet records found for the selected filters."
              : "",
            comparisonPeriods,
            summary: summarizeBalanceSheetRows(bsRows, comparisonPeriods),
          },
          incStatementYTD: {
            cols: colsArray,
            rows: isRows,
            rightActionLabel: safeRightActionLabel(colsResp),
            hasLoaded: true,
            appliedFilters: payload,
            loadedAt: startedAt,
            isEmpty: isIsEmpty,
            emptyMessage: isIsEmpty
              ? "No Income Statement records found for the selected filters."
              : "",
            comparisonPeriods,
            summary: summarizeIncomeStatementRows(isRows, comparisonPeriods),
          },
        }));
      } catch (e) {
        console.error("[GLINQ] runSharedFinancialStatementYTD failed:", e);

        const errorView = {
          hasLoaded: true,
          isEmpty: true,
          emptyMessage: "Unable to load records. Please try again.",
          loadedAt: new Date().toISOString(),
          comparisonPeriods: [],
          summary: {
            totalDebit: 0,
            totalCredit: 0,
            netBalance: 0,
            totalAsset: 0,
            totalLiability: 0,
            totalIncome: 0,
            totalExpense: 0,
            netIncome: 0,
            totalRows: 0,
            summaryPeriodCode: "",
            summaryPeriodLabel: "",
          },
        };

        setViews((prev) => ({
          ...prev,
          balSheetYTD: {
            ...(prev.balSheetYTD || EMPTY_VIEW),
            ...errorView,
          },
          incStatementYTD: {
            ...(prev.incStatementYTD || EMPTY_VIEW),
            ...errorView,
          },
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [
      tabRegistry,
      normalizeRows,
      safeRightActionLabel,
      summarizeBalanceSheetRows,
      summarizeIncomeStatementRows,
      EMPTY_VIEW,
      currentUserRow?.userCode,
      sourceMode,
    ]
  );

  const runTabQuery = useCallback(
    async (tabKey, f) => {
      if (tabKey === "balSheetYTD" || tabKey === "incStatementYTD") {
        await runSharedFinancialStatementYTD(f);
        return;
      }

      const Report = tabRegistry[tabKey];
      if (!Report) return;

      setIsLoading(true);

      const endpoint = Report?.meta?.endpoint;
      if (
        !endpoint ||
        typeof Report?.buildPayload !== "function" ||
        typeof Report?.buildJsonData !== "function"
      ) {
        console.error(`[GLINQ] Missing meta/builders for tab: ${tabKey}`);
        setIsLoading(false);
        return;
      }

      const payload = Report.buildPayload(f);
      const startedAt = new Date().toISOString();

      try {
        const jsonData = {
          ...Report.buildJsonData(payload),
          sourceMode,
        };
        const usesDynamicColumns = Report?.meta?.dynamicColumns === true;

        let colsResp = [];
        let rowsResp;

        if (usesDynamicColumns) {
          rowsResp = await fetchData(endpoint, {
            json_data: { json_data: jsonData },
          });
        } else {
          [colsResp, rowsResp] = await Promise.all([
            useSelectedHSColConfig(endpoint),
            fetchData(endpoint, { json_data: { json_data: jsonData } }),
          ]);
        }

        const parsedReport =
          typeof Report?.parseResponse === "function"
            ? Report.parseResponse(rowsResp)
            : null;
        const colsArray = parsedReport?.cols ??
          (Array.isArray(colsResp) ? colsResp : []);
        const finalRows = parsedReport?.rows ?? normalizeRows(rowsResp);
        const isEmpty = !finalRows || finalRows.length === 0;

        setViews((prev) => ({
          ...prev,
          [tabKey]: {
            cols: colsArray,
            rows: finalRows,
            rightActionLabel: safeRightActionLabel(colsResp),
            hasLoaded: true,
            appliedFilters: payload,
            loadedAt: startedAt,
            isEmpty,
            emptyMessage: isEmpty
              ? "No records found for the selected filters."
              : "",
            comparisonPeriods: [],
            reportData: parsedReport?.reportData ?? null,
            summary: summarizeRows(finalRows),
          },
        }));
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
            comparisonPeriods: [],
            summary: {
              totalDebit: 0,
              totalCredit: 0,
              netBalance: 0,
              totalAsset: 0,
              totalLiability: 0,
              totalIncome: 0,
              totalExpense: 0,
              netIncome: 0,
              totalRows: 0,
              summaryPeriodCode: "",
              summaryPeriodLabel: "",
            },
          },
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [
      tabRegistry,
      normalizeRows,
      safeRightActionLabel,
      summarizeRows,
      EMPTY_VIEW,
      runSharedFinancialStatementYTD,
      sourceMode,
    ]
  );

  const parseGroupId = useCallback((groupId, tabSource) => {
    if (!groupId) return null;

    const parts = String(groupId)
      .split(/[|~]/)
      .map((p) => p.trim());

    if (parts.length <= 1) return null;

    switch (tabSource) {
      case "slQuery": {
        const [branchCode, cutOffCode, acctCode, sltypeCode, slCode] = parts;
        return { branchCode, cutOffCode, acctCode, sltypeCode, slCode };
      }
      default:
        return null;
    }
  }, []);

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
    [parseGroupId, filtersByTab, DEFAULT_FILTERS, updateFilters, runTabQuery]
  );

  const jumpToGLInquiryFromBS = useCallback(
    async ({ acctCode, acctName, rcCode = "", rcName = "", slCode = "", slName = "" }) => {
      const currentGL = filtersByTab.glQuery || DEFAULT_FILTERS;
      const fAcct = acctCode ? await useTopAccountRow(acctCode) : null;

      const glFilters = {
        ...currentGL,
        accCode: acctCode || "",
        accName: acctName || fAcct?.acctName || "",
        rcCode: rcCode || "",
        rcName: rcName || "",
        slCode: slCode || "",
        slName: slName || "",
        rcCodeStart: "",
        rcNameStart: "",
        rcCodeEnd: "",
        rcNameEnd: "",
      };

      updateFilters(glFilters, "glQuery");
      setActiveTab("glQuery");
      await runTabQuery("glQuery", glFilters);
    },
    [filtersByTab, DEFAULT_FILTERS, updateFilters, runTabQuery]
  );

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
          currCode: hsCompany.currCode || companyInfo?.currCode || "",
          currName: hsCompany.currName || companyInfo?.currName || "",
          compareYears: 5,
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
  }, [applyToAllTabs, user?.USER_CODE, companyInfo]);

  useEffect(() => {
    if (!user?.USER_CODE) return;
    loadDefaults();
  }, [user?.USER_CODE, loadDefaults]);

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
        currCode: filters.currCode,
        currName: filters.currName,
        compareYears: 1,
      },
      activeTab
    );

    setViews((prev) => {
      if (activeTab === "balSheetYTD" || activeTab === "incStatementYTD") {
        return {
          ...prev,
          balSheetYTD: { ...EMPTY_VIEW },
          incStatementYTD: { ...EMPTY_VIEW },
        };
      }

      return {
        ...prev,
        [activeTab]: { ...EMPTY_VIEW },
      };
    });
  }, [updateFilters, DEFAULT_FILTERS, filters, activeTab, EMPTY_VIEW]);

  const handleNavSelect = useCallback((tabKey) => {
    setActiveTab(tabKey);
    setIsMobileNavOpen(false);
  }, []);

  const handlePrint = useCallback(async () => {
    const { cutoffCode, currCode, rcCode } = filters;

    if (activeTab === "balSheetYTD" || activeTab === "incStatementYTD") {
      const formName = activeTab === "balSheetYTD" ? "BSYTD.rpt" : "ISYTD.rpt";
      const params = `cutoffCode:${cutoffCode}|currCode:${currCode}|rcCode:${rcCode}`;

      setIsPrinting(true);
      try {
        await useHandlePrintQuery(formName, currentUserRow?.userCode, params);
      } finally {
        setIsPrinting(false);
      }
      return;
    }

    window.print();
  }, [activeTab, filters, currentUserRow?.userCode]);

  const handleFind = useCallback(() => setShowFilterModal(true), []);
  const handleApplyFilters = useCallback(async () => {
    setShowFilterModal(false);
    await runTabQuery(activeTab, filters);
  }, [activeTab, filters, runTabQuery]);

  const ActiveReport = tabRegistry[activeTab];
  const currentContext = buildContextText(filters, activeTab);

  return (
    <div className="global-ref-main-div-ui">
      {(showSpinner || isPrinting) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between lg:min-h-[40px]">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              {pageTitle}
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
                  onClick={handleFind}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  <span className="ml-2 hidden lg:inline">Filter</span>
                </button>

                <button
                  onClick={handleReset}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faUndo} />
                  <span className="ml-2 hidden lg:inline">Reset</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faPrint} />
                  <span className="ml-2 hidden lg:inline">Print</span>
                </button>

                <button
                  onClick={() => setHideNav((v) => !v)}
                  className="hidden shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:inline-flex"
                >
                  <FontAwesomeIcon
                    icon={hideNav ? faChevronRight : faChevronLeft}
                  />
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
                        {pageTitle}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Select a report, set filters, then load data.
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-[11px] font-semibold text-blue-700">
                      GL
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <ReportNavList
                    activeTab={activeTab}
                    tabConfigs={tabConfigs}
                    handleSelect={handleNavSelect}
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

                {!['isMTD', 'incStatementYTD', 'incExp'].includes(activeTab) && (
                  <div className="p-4">
                    <ContextCards summary={view.summary} activeTab={activeTab} />
                  </div>
                )}
              </div>
            </div>

            <div className="global-tran-tab-div-ui !m-0 !p-4">
              <div
                className={
                  ["isMTD", "incExp"].includes(activeTab)
                    ? "min-h-0 overflow-hidden"
                    : "global-tran-table-main-div-ui"
                }
              >
                <ActiveReport
                  view={view}
                  filters={filters}
                  tabConfig={activeTabConfig}
                  onJumpToGLFromSL={jumpToGLQueryFromSL}
                  onJumpToGLInquiry={jumpToGLInquiryFromBS}
                  expandedMap={drilldownExpandedByTab[activeTab] || {}}
                  setExpandedMap={(updater) =>
                    updateDrilldownExpanded(activeTab, updater)
                  }
                  SearchGlobalReportTable={SearchGlobalReportTable}
                  NoRecordsState={NoRecordsState}
                  activeView={
                    activeTab === "incExp"
                      ? incomeExpenseView
                      : incomeStatementMTDView
                  }
                  onActiveViewChange={
                    activeTab === "incExp"
                      ? setIncomeExpenseView
                      : setIncomeStatementMTDView
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <FilterModal
          pageTitle={pageTitle}
          tabConfig={activeTabConfig}
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
        pageTitle={pageTitle}
        activeTab={activeTab}
        tabConfigs={tabConfigs}
        handleSelect={handleNavSelect}
      />

      <LookupManager filters={filters} updateFilters={updateFilters} />
    </div>
  );
}


function buildContextText(filters, activeTab) {
  const branch = filters?.branchName || filters?.branchCode || "All Branches";
  const currency = filters?.currName || filters?.currCode || "Default Currency";

  const cutoff =
    filters?.cutoffName ||
    [filters?.cutoffStartName, filters?.cutoffEndName]
      .filter(Boolean)
      .join(" → ") ||
    [filters?.cutoffStartCode, filters?.cutoffEndCode]
      .filter(Boolean)
      .join(" → ") ||
    "No Cut Off";

  const yearText =
    activeTab === "balSheetYTD" || activeTab === "incStatementYTD"
      ? ` | Compare: ${clampCompareYears(filters?.compareYears)} Year(s)`
      : "";

  return `Branch: ${branch} | Period: ${cutoff} | Currency: ${currency}${yearText}`;
}

function formatNumberDisplay(v) {
  const num = Number(v || 0);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sanitize(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeFsType(value) {
  return sanitize(value).toUpperCase();
}

function clampCompareYears(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(5, parsed));
}

function buildComparativeCutoffs(baseCutoff, compareYears = 1) {
  const safe = sanitize(baseCutoff);
  if (!/^\d{6}$/.test(safe)) return safe ? [safe] : [];

  const year = Number(safe.slice(0, 4));
  const month = safe.slice(4, 6);
  const total = clampCompareYears(compareYears);

  return Array.from({ length: total }, (_, index) => `${year - index}${month}`);
}

function formatCutoffHeaderLabel(cutoffCode) {
  const safe = sanitize(cutoffCode);
  if (!/^\d{6}$/.test(safe)) return safe;

  const year = Number(safe.slice(0, 4));
  const month = Number(safe.slice(4, 6));

  const date = new Date(year, month - 1, 1);

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toSafeNumber(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFinancialStatementRowKey(row) {
  const fsType = normalizeFsType(row?.fs_type);
  const fsCode = sanitize(row?.fsconso_code);
  const acctCode = sanitize(row?.acct_code);
  const rcCode = sanitize(row?.rc_code);
  const slCode = sanitize(row?.sl_code);

  if (slCode) return `${fsType}|SL|${fsCode}|${acctCode}|${rcCode}|${slCode}`;
  if (rcCode) return `${fsType}|RC|${fsCode}|${acctCode}|${rcCode}`;
  if (acctCode) return `${fsType}|ACCT|${fsCode}|${acctCode}`;
  return `${fsType}|FS|${fsCode}`;
}

function mergeComparativeFinancialStatementRows(
  rowsByPeriod = {},
  comparisonPeriods = []
) {
  const rowMap = new Map();

  comparisonPeriods.forEach((periodCode) => {
    const periodRows = Array.isArray(rowsByPeriod?.[periodCode])
      ? rowsByPeriod[periodCode]
      : [];

    periodRows.forEach((row, index) => {
      const key = getFinancialStatementRowKey(row);

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          ...row,
          periodAmounts: {},
          periodFsAmounts: {},
          periodGlAmounts: {},
          periodRcAmounts: {},
          periodSlAmounts: {},
          sortIndex: index,
        });
      }

      const existing = rowMap.get(key);

      const fsAmount = toSafeNumber(row?.fs_amount);
      const glAmount = toSafeNumber(row?.gl_amount);
      const rcAmount = toSafeNumber(row?.rc_amount);
      const slAmount = toSafeNumber(row?.sl_amount);

      existing.periodFsAmounts[periodCode] = fsAmount;
      existing.periodGlAmounts[periodCode] = glAmount;
      existing.periodRcAmounts[periodCode] = rcAmount;
      existing.periodSlAmounts[periodCode] = slAmount;

      if (slAmount !== 0) {
        existing.periodAmounts[periodCode] = slAmount;
      } else if (rcAmount !== 0) {
        existing.periodAmounts[periodCode] = rcAmount;
      } else if (glAmount !== 0) {
        existing.periodAmounts[periodCode] = glAmount;
      } else {
        existing.periodAmounts[periodCode] = fsAmount;
      }

      if (!sanitize(existing.fsconso_name) && sanitize(row?.fsconso_name)) {
        existing.fsconso_name = row.fsconso_name;
      }
      if (!sanitize(existing.acct_name) && sanitize(row?.acct_name)) {
        existing.acct_name = row.acct_name;
      }
      if (!sanitize(existing.rc_name) && sanitize(row?.rc_name)) {
        existing.rc_name = row.rc_name;
      }
      if (!sanitize(existing.sl_name) && sanitize(row?.sl_name)) {
        existing.sl_name = row.sl_name;
      }
      if (!sanitize(existing.acct_code) && sanitize(row?.acct_code)) {
        existing.acct_code = row.acct_code;
      }
      if (!sanitize(existing.rc_code) && sanitize(row?.rc_code)) {
        existing.rc_code = row.rc_code;
      }
      if (!sanitize(existing.sl_code) && sanitize(row?.sl_code)) {
        existing.sl_code = row.sl_code;
      }
      if (!sanitize(existing.fsconso_code) && sanitize(row?.fsconso_code)) {
        existing.fsconso_code = row.fsconso_code;
      }
      if (!sanitize(existing.fs_type) && sanitize(row?.fs_type)) {
        existing.fs_type = row.fs_type;
      }

      if ((existing.sortIndex ?? Number.MAX_SAFE_INTEGER) > index) {
        existing.sortIndex = index;
      }
    });
  });

  const mergedRows = Array.from(rowMap.values()).sort(
    (a, b) => (a.sortIndex || 0) - (b.sortIndex || 0)
  );

  mergedRows.forEach((row) => {
    const periods = {};
    const fsPeriods = {};
    const glPeriods = {};
    const rcPeriods = {};
    const slPeriods = {};

    comparisonPeriods.forEach((periodCode) => {
      periods[periodCode] = row?.periodAmounts?.[periodCode] ?? 0;
      fsPeriods[periodCode] = row?.periodFsAmounts?.[periodCode] ?? 0;
      glPeriods[periodCode] = row?.periodGlAmounts?.[periodCode] ?? 0;
      rcPeriods[periodCode] = row?.periodRcAmounts?.[periodCode] ?? 0;
      slPeriods[periodCode] = row?.periodSlAmounts?.[periodCode] ?? 0;
    });

    row.periodAmounts = periods;
    row.periodFsAmounts = fsPeriods;
    row.periodGlAmounts = glPeriods;
    row.periodRcAmounts = rcPeriods;
    row.periodSlAmounts = slPeriods;
  });

  return mergedRows;
}

const ContextCards = ({ summary, activeTab }) => {
  let totals = [];

  if (activeTab === "balSheetYTD") {
    totals = [
      {
        label: `Total Assets`,
        value: formatNumberDisplay(summary?.totalAsset),
      },
      {
        label: `Total Liabilities & Stockholder's Equity`,
        value: formatNumberDisplay(summary?.totalLiability),
      },
    ];
  } else if (activeTab === "incStatementYTD") {
    totals = [
      {
        label: `Total Income`,
        value: formatNumberDisplay(summary?.totalIncome),
      },
      {
        label: `Total Expense`,
        value: formatNumberDisplay(summary?.totalExpense),
      },
    ];
  } else {
    totals = [
      {
        label: "Total Debit",
        value: formatNumberDisplay(summary?.totalDebit),
      },
      {
        label: "Total Credit",
        value: formatNumberDisplay(summary?.totalCredit),
      },
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="grid w-full grid-cols-1 gap-3 md:w-auto md:grid-cols-2">
          {totals.map((item) => (
            <div
              key={item.label}
              className="min-w-[260px] rounded-xl border bg-white px-4 py-3 shadow-sm"
            >
              <div className="text-xs text-gray-500">{item.label}</div>
              <div className="mt-1 text-right text-base font-semibold text-gray-800">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
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

const MobileNavDrawer = ({
  isOpen,
  onClose,
  pageTitle,
  activeTab,
  tabConfigs,
  handleSelect,
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-200 lg:hidden ${
        isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      onClick={onClose}
    >
      <div
        className={`absolute inset-0 bg-black/40 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className="absolute bottom-0 right-0 top-0 w-80 overflow-y-auto bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-800">{pageTitle}</h3>
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
        Tip: Open <b>Filter</b> and broaden the range or clear account / SL / RC
        filters.
      </div>
    </div>
  </div>
);

const FilterModal = ({
  pageTitle,
  tabConfig,
  filters,
  onClose,
  onApply,
  updateLookupState,
  isLoading,
}) => {
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
  const hasCompareYears = tabConfig.filters.includes("Compare Years");

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
            <FontAwesomeIcon
              icon={faFilter}
              className="text-[13px] text-blue-600 sm:text-sm"
            />
            <span>Filters - {pageTitle}</span>
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
                  onClear={() =>
                    updateLookupState({ accCodeStart: "", accNameStart: "" })
                  }
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
                  onClear={() =>
                    updateLookupState({ accCodeEnd: "", accNameEnd: "" })
                  }
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
                  onClear={() =>
                    updateLookupState({ rcCodeStart: "", rcNameStart: "" })
                  }
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
            <ModalSection title="Cut Off">
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
                  onClear={() =>
                    updateLookupState({ cutoffEndCode: "", cutoffEndName: "" })
                  }
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

          {hasCompareYears && (
            <ModalSection title="Comparison">
              <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-12">
                <div className="md:col-span-4">
                  <FieldRenderer
                    id="compareYears"
                    label="Compare Years"
                    type="select"
                    value={String(clampCompareYears(filters.compareYears))}
                    disabled={isLoading}
                    onChange={(value) =>
                      updateLookupState({
                        compareYears: clampCompareYears(value),
                      })
                    }
                    options={[
                      { value: "1", label: "1 Year" },
                      { value: "2", label: "2 Years" },
                      { value: "3", label: "3 Years" },
                      { value: "4", label: "4 Years" },
                      { value: "5", label: "5 Years" },
                    ]}
                    labelClassName="text-[10px] sm:text-xs"
                  />
                </div>

                <div className="md:col-span-8">
                  <FieldRenderer
                    id="compareYearsNote"
                    label="Notes"
                    type="text"
                    value="Maximum 5 years. Same month as selected cut off."
                    disabled
                    readOnly
                    labelClassName="text-[10px] sm:text-xs"
                  />
                </div>
              </div>
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

  const openLookup = () => {
    if (disabled) return;
    updateLookupState({
      showLookupModal: true,
      lookupType: codeId,
      cutoffModalType: modalType,
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
          editableLookup
          onLookup={openLookup}
          onClear={onClear}
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

    if (cutoffModalType === "accStart") {
      updateFilters({ accCodeStart: code, accNameStart: name });
    } else if (cutoffModalType === "accEnd") {
      updateFilters({ accCodeEnd: code, accNameEnd: name });
    } else {
      updateFilters({ accCode: code, accName: name });
    }

    updateFilters({
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
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

    if (cutoffModalType === "rcStart") {
      updateFilters({ rcCodeStart: rcCode, rcNameStart: rcName });
    } else if (cutoffModalType === "rcEnd") {
      updateFilters({ rcCodeEnd: rcCode, rcNameEnd: rcName });
    } else {
      updateFilters({ rcCode, rcName });
    }

    updateFilters({
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
  };

  const handleCutoffSelect = (row) => {
    const cutCode = row.cutoffCode || row.cutOffCode || row.code;
    const cutName = row.cutoffName || row.cutOffName || row.name;

    if (cutoffModalType === "cutoffStart") {
      updateFilters({ cutoffStartCode: cutCode, cutoffStartName: cutName });
    } else if (cutoffModalType === "cutoffEnd") {
      updateFilters({ cutoffEndCode: cutCode, cutoffEndName: cutName });
    } else {
      updateFilters({ cutoffCode: cutCode, cutoffName: cutName });
    }

    updateFilters({
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
  };

  const handleCurrencySelect = (row) => {
    updateFilters({
      currCode: row.currCode || "PHP",
      currName: row.currName || "Philippine Peso",
      showLookupModal: false,
      lookupType: "",
      cutoffModalType: "",
    });
  };

  switch (cutoffModalType) {
    case "branch":
      return (
        <SearchBranchRef isOpen={showLookupModal} onClose={handleBranchSelect} />
      );
    case "sl":
      return (
        <SearchSLMast
          isOpen={showLookupModal}
          onClose={handleSLSelect}
          context="sl"
        />
      );
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
      return (
        <SearchRCMast
          isOpen={showLookupModal}
          onClose={handleRCSelect}
          context="rc"
        />
      );
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



