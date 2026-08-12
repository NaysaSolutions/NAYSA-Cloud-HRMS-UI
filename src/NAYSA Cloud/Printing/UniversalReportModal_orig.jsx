// import React, { useState, useMemo, useEffect } from "react";
// import { useQuery, useMutation } from "@tanstack/react-query";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faMagnifyingGlass,
//   faXmark,
//   faCircleNotch,
//   faBroom,
//   faDownload,
//   faFileExcel,
//   faFileCsv,
//   faFileLines,
//   faChevronLeft,
//   faChevronRight,
//   faFileAlt,
//   faPrint,
// } from "@fortawesome/free-solid-svg-icons";
// import Swal from "sweetalert2";

// // --- Project Imports ---
// import { fetchData, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
// import { useTopUserRow, useTopHSRptRow } from "@/NAYSA Cloud/Global/top1RefTable";
// import {
//   useHandlePrintAPReport,
//   useHandleDownloadExcelAPReport,
//   useHandleDownloadExcelPURReport,
//   useHandlePrintARReport,
//   useHandleDownloadExcelARReport,
//   useHandlePrintGLReport,
//   useHandleDownloadExcelGLReport,
//   useHandleDownloadExcelBIRReport,
//   useHandlePrintFGINVReport,
//   useHandleDownloadExcelFGINVReport,
//   useHandlePrintMSINVReport,
//   useHandleDownloadExcelMSINVReport,
//   useHandlePrintRMINVReport,
//   useHandleDownloadExcelRMINVReport,
//   useHandleDownloadExcelFAReport,
//   useHandleDownloadExcelIMPReport,
//   useHandleDownloadExcelSalesReport,
// } from "@/NAYSA Cloud/Global/report";
// import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
// import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
// import { useGetCurrentDay, useFormatToDate } from "@/NAYSA Cloud/Global/dates";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// // --- Lookup Modals ---
// import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
// import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
// import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
// import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast";
// import SLMastLookupModal from "@/NAYSA Cloud/Lookup/SearchSLMast";
// import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";
// import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
// import FGLookupModal from "@/NAYSA Cloud/Lookup/SearchFGMast";
// import MSLookupModal from "@/NAYSA Cloud/Lookup/SearchMSMast";
// import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
// import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast";
// import LocationLookupModal from "@/NAYSA Cloud/Lookup/SearchLocation";
// import SearchFACateg from "@/NAYSA Cloud/Lookup/SearchFACateg.jsx";
// import SearchFAClass from "@/NAYSA Cloud/Lookup/SearchFAClass.jsx";
// import SearchFALoc from "@/NAYSA Cloud/Lookup/SearchFALoc.jsx";
// import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";

// // ─── MODULE CONFIGURATION ────────────────────────────────────────────────────

// const RMLookupModal = (props) => (
//   <ItemMastLookupModal
//     {...props}
//     endpoint="getInvLookupRM"
//     docType="PRRM"
//     enableMultiSelect={false}
//   />
// );

// const MODULE_DEFS = {
//   AP:  { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelPURReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
//   VI:  { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelAPReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
//   EWT: { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelAPReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
//   PUR: { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelAPReport,    hasExtra: false, hasCutoff: false, hasReportType: false, hasSingleMain: true, hasSingleRc: true, rcLabel: "Department/RC" },
//   AR:  { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport,    excel: useHandleDownloadExcelARReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
//   VO:  { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport,    excel: useHandleDownloadExcelARReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
//   CWT: { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport,    excel: useHandleDownloadExcelARReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
//   GL:  { label: "Account",  lookup: COAMastLookupModal,      print: useHandlePrintGLReport,    excel: useHandleDownloadExcelGLReport,    hasExtra: true,  hasCutoff: false, hasReportType: false },
//   BIR: { label: "",         lookup: null,                    print: useHandlePrintGLReport,    excel: useHandleDownloadExcelBIRReport,   hasExtra: false, hasCutoff: true,  hasReportType: true },
//   FG:  { label: "Item",     lookup: FGLookupModal,           print: useHandlePrintFGINVReport,  excel: useHandleDownloadExcelFGINVReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasInventory: true, hasSingleMain: true },
//   MS:  { label: "Item",     lookup: MSLookupModal,           print: useHandlePrintMSINVReport,  excel: useHandleDownloadExcelMSINVReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasInventory: true, hasSingleMain: true },
//   RM:  { label: "Item",     lookup: RMLookupModal,           print: useHandlePrintRMINVReport,  excel: useHandleDownloadExcelRMINVReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasInventory: true, hasSingleMain: true },
//   FA:  { label: "Asset",    lookup: null,                    print: useHandlePrintGLReport,     excel: useHandleDownloadExcelFAReport,    hasExtra: false, hasCutoff: false, hasReportType: false, hasFA: true, hasSingleMain: true, hasSingleRc: true, rcLabel: "Department/RC" },
//   IMP: { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,     excel: useHandleDownloadExcelIMPReport,   hasExtra: false, hasCutoff: false, hasReportType: false, hasSingleMain: true, hasSingleRc: true, rcLabel: "Department/RC" },
//   OE: { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport, excel: useHandleDownloadExcelSalesReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasSales: true },
// };

// // ─── SYSTEM COLOR THEME (blue) ────────────────────────────────────────────────
// const THEME = {
//   gradient: "bg-blue-600",
//   bgLight:  "bg-blue-50",
//   ring:     "focus:ring-blue-300",
//   selected: "bg-blue-500",
//   btn:      "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
//   text:     "text-blue-600",
// };

// // ─── HELPERS ──────────────────────────────────────────────────────────────────

// const getReportTypeIcon = (type) => {
//   switch (String(type || "").toUpperCase()) {
//     case "EXCEL": return faFileExcel;
//     case "CSV":   return faFileCsv;
//     default:      return faFileLines;
//   }
// };

// const sanitizeFileName = (value = "") =>
//   String(value).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();

// const buildBIRFileName = (reportName, sCutOff, eCutOff, ext) =>
//   [sanitizeFileName(reportName || "BIR Report"), sanitizeFileName(sCutOff || ""), sanitizeFileName(eCutOff || "")]
//     .filter(Boolean).join(" ") + `.${ext}`;

// const downloadBlobFile = (content, fileName, mimeType) => {
//   const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
//   const url = window.URL.createObjectURL(blob);
//   const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
//   document.body.appendChild(a); a.click(); a.remove();
//   window.URL.revokeObjectURL(url);
// };

// const escapeCsvValue = (v) => {
//   if (v == null) return "";
//   const s = String(v);
//   return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
// };

// const convertRowsToCsv = (rows = []) => {
//   if (!rows.length) return "";
//   const h = Object.keys(rows[0]);
//   return [h.map(escapeCsvValue).join(","), ...rows.map(r => h.map(k => escapeCsvValue(r?.[k])).join(","))].join("\r\n");
// };

// const convertRowsToTxt = (rows = []) => {
//   if (!rows.length) return "";
//   const h = Object.keys(rows[0]);
//   return rows.map(r => h.map(k => r?.[k] == null ? "" : String(r[k])).join("\t")).join("\r\n");
// };

// const parseLookupRows = (value) => {
//   if (!value) return [];
//   if (Array.isArray(value)) return value;
//   if (typeof value === "string") {
//     try {
//       return parseLookupRows(JSON.parse(value));
//     } catch {
//       return [];
//     }
//   }
//   if (value?.data) return parseLookupRows(value.data);
//   if (value?.result) return parseLookupRows(value.result);
//   return [];
// };

// const extractLookupRows = (response) => {
//   const resultValue =
//     response?.data?.[0]?.result ??
//     response?.data?.data?.[0]?.result ??
//     response?.data?.result ??
//     response?.data ??
//     response?.result ??
//     response;

//   return parseLookupRows(resultValue);
// };

// // ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────

// /** Labeled lookup input with search button */
// const LookupField = ({ label, value, placeholder, onOpen, ring, btnClass, readOnly = true }) => (
//   <div className="contents">
//     <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
//       {label}
//     </label>
//     <div className="relative min-w-0">
//       <input
//         readOnly={readOnly}
//         value={value}
//         placeholder={placeholder}
//         className={`w-full min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 pr-12 text-xs bg-gray-50 outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
//       />
//       <button
//         type="button"
//         onClick={onOpen}
//         className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${btnClass} text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-sm`}
//       >
//         <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px]" />
//       </button>
//     </div>
//   </div>
// );

// /** Date range row */
// const DateRangeField = ({ startDate, endDate, onStartChange, onEndChange, ring }) => (
//   <div className="contents">
//     <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
//       Date Range
//     </label>
//     <div className="flex flex-col sm:flex-row gap-2 min-w-0">
//       <input
//         type="date"
//         value={startDate}
//         onChange={e => onStartChange(e.target.value)}
//         className={`flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
//       />
//       <span className="hidden sm:flex self-center text-gray-300 text-xs font-bold">—</span>
//       <input
//         type="date"
//         value={endDate}
//         onChange={e => onEndChange(e.target.value)}
//         className={`flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
//       />
//     </div>
//   </div>
// );

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

// const UniversalReportModal = ({ isOpen, onClose, userCode, module = "AP" }) => {
//   const config = MODULE_DEFS[module] || MODULE_DEFS.AP;
//   const today = useGetCurrentDay();
//   const { companyInfo, currentUserRow } = useAuth();

//   const firstDay = useMemo(() =>
//     useFormatToDate(new Date(new Date(today).getFullYear(), new Date(today).getMonth(), 1)),
//     [today]
//   );

//   const accent  = THEME.gradient;
//   const bgLight = THEME.bgLight;
//   const ring    = THEME.ring;
//   const selBg   = THEME.selected;
//   const btnCls  = THEME.btn;
//   const textCls = THEME.text;

//   // UI state
//   const [ui, setUi] = useState({
//     reportQuery: "",
//     branchModal: false,
//     mainLookup: false,
//     salesCustomerModal: false,
//     salesChainModal: false,
//     salesItemModal: false,
//     slModal: false,
//     rcModal: false,
//     warehouseModal: false,
//     locationModal: false,
//     faCategoryModal: false,
//     faClassModal: false,
//     faLocationModal: false,
//     faAssetModal: false,
//     faAssetRows: [],
//     faAssetColumns: [],
//     cutoffModal: false,
//     cutoffLookupMode: "S",
//     selected: { id: 0, name: "" },
//     lookupMode: "S",
//     slLookupMode: "S",
//     rcLookupMode: "S",
//     showPanel: "list", // "list" | "form"  (mobile nav)
//   });

//   // Filter state
//   const [filters, setFilters] = useState({
//     branchCode: currentUserRow.branchCode,
//     branchName: currentUserRow.branchName,
//     startDate: firstDay,
//     endDate: today,
//     sCode: "", sName: "", eCode: "", eName: "",
//     sSlCode: "", sSlName: "", eSlCode: "", eSlName: "",
//     sRcCode: "", sRcName: "", eRcCode: "", eRcName: "",
//     rcCode: "", rcName: "",
//     custCode: "", custName: "",
//     chainCustomer: "", chainCustomerName: "",
//     itemCode: "", itemName: "",
//     whCode: "", whName: "", locCode: "", locName: "",
//     categCode: "", categName: "", classCode: "", className: "",
//     faCode: "", faName: "",
//     userName: currentUserRow.userName,
//     sCutOff: companyInfo.cutoffCode, sCutOffName: companyInfo.cutoffName,
//     eCutOff: companyInfo.cutoffCode, eCutOffName: companyInfo.cutoffName,
//     endingCutoff: companyInfo.cutoffCode,
//     reportType: "TEXT",
//   });

//   const updateUi      = (p) => setUi(prev => ({ ...prev, ...p }));
//   const updateFilters = (p) => setFilters(prev => ({ ...prev, ...p }));

//   // ── Fetch report list ──────────────────────────────────────────────────────
//   const { data, isLoading: isInitialLoading } = useQuery({
//     queryKey: ["reports", module, currentUserRow.userCode],
//     queryFn: async () => {
//       const [rptRes] = await Promise.all([
//         fetchData("hsrpt", { mdl: module, userCode: currentUserRow.userCode }),
//       ]);
//       const list = rptRes?.data?.[0]?.result ? JSON.parse(rptRes.data[0].result) : [];
//       return { list };
//     },
//     enabled: isOpen,
//   });


//   useEffect(() => {
//     if (data?.list?.length > 0 && ui.selected.id === 0) {
//       updateUi({ selected: { id: data.list[0].reportId, name: data.list[0].reportName } });
//     }
//   }, [data]);

//   // ── Generate mutation ──────────────────────────────────────────────────────
//   const generateMutation = useMutation({
//     mutationFn: async () => {
//       const meta = await useTopHSRptRow(ui.selected.id);
//       const params = {
//         reportId: ui.selected.id,
//         branchCode: filters.branchCode,
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         custCode: config.hasSales ? filters.custCode : (filters.custCode || filters.customerCode || filters.sCustCode),
//         chainCustomer: config.hasSales ? filters.chainCustomer : (filters.chainCustomer || filters.chainCode),
//         sPayeeCode: filters.sCode, ePayeeCode: config.hasSingleMain ? filters.sCode : filters.eCode,
//         sCustCode:  filters.sCode, eCustCode:  config.hasSingleMain ? filters.sCode : filters.eCode,
//         sAccCode:   filters.sCode, eAccCode:   config.hasSingleMain ? filters.sCode : filters.eCode,
//         payeeCode: filters.sCode, vendCode: filters.sCode, departmentCode: filters.rcCode,
//         itemCode: config.hasSales ? filters.itemCode : filters.sCode, whCode: filters.whCode, wwhCode: filters.whCode, locCode: filters.locCode,
//         categCode: filters.categCode, classCode: filters.classCode, faCode: filters.faCode,
//         sSLCode: filters.sSlCode, eSLCode: filters.eSlCode,
//         sRcCode: config.hasSingleRc ? filters.rcCode : filters.sRcCode,
//         eRcCode: config.hasSingleRc ? filters.rcCode : filters.eRcCode,
//         slCode: filters.sSlCode, rcCode: config.hasSingleRc ? filters.rcCode : filters.sRcCode,
//         sCutOff: filters.sCutOff, eCutOff: filters.eCutOff,
//         sCutoffCode: filters.sCutOff, eCutoffCode: filters.eCutOff,
//         reportType: filters.reportType, userCode, mode: meta.sprocMode,
//       };

//       const handler  = meta.export === "Y" ? config.excel : config.print;
//       const response = await handler(params);

//       if (module === "BIR") {
//         const rawRows = Array.isArray(response?.data) ? response.data
//           : Array.isArray(response?.data?.data) ? response.data.data : [];
//         const selectedReportName = ui.selected.name || meta.reportName || "BIR_Report";
//         const rTypeUp = String(filters.reportType || "").toUpperCase();

//         if (rTypeUp === "TEXT") {
//           const rows = rawRows.map(({ reportGroup, reportType, ...r }) => r);
//           downloadBlobFile(convertRowsToTxt(rows), buildBIRFileName(selectedReportName, filters.sCutOff, filters.eCutOff, "txt"), "text/plain;charset=utf-8;");
//           return response;
//         }
//         if (rTypeUp === "CSV") {
//           const rows = rawRows.filter(r => r?.reportGroup === "Data")
//             .map(({ reportGroup, reportType, ...r }) =>
//               Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v).trim()])));
//           downloadBlobFile(convertRowsToCsv(rows), buildBIRFileName(selectedReportName, filters.sCutOff, filters.eCutOff, "csv"), "text/csv;charset=utf-8;");
//           return response;
//         }
//         if (rTypeUp === "EXCEL") {
//           const rows = rawRows.filter(r => r?.reportGroup === "Data").map(({ reportGroup, reportType, ...r }) => r);
//           const colConfig  = await useSelectedHSColConfig(meta.sprocMode, userCode);
//           const excelFileName = buildBIRFileName(selectedReportName, filters.sCutOff, filters.eCutOff, "xlsx");
//           await exportGenericHistoryExcel({
//             ReportName: selectedReportName, FileName: excelFileName, UserCode: currentUserRow.userCode,
//             Branch: companyInfo.branchName, JsonData: { Data: { [selectedReportName]: rows } },
//             companyName: companyInfo.compName, companyAddress: companyInfo.compAddr,
//             companyTelNo: companyInfo.telNo, StartDate: filters.startDate, EndDate: filters.endDate,
//           }, { [selectedReportName]: colConfig });
//           return response;
//         }
//         throw new Error("Invalid BIR report type.");
//       }

//       if (meta.export === "Y") {
//         const colConfig = await useSelectedHSColConfig(meta.sprocMode, userCode);
//         await exportGenericHistoryExcel({
//           ReportName: meta.reportName, UserCode: currentUserRow.userCode,
//           Branch: companyInfo.branchName, JsonData: { Data: { [meta.reportName]: response.data } },
//           companyName: companyInfo.compName, companyAddress: companyInfo.compAddr,
//           companyTelNo: companyInfo.telNo, StartDate: filters.startDate, EndDate: filters.endDate,
//         }, { [meta.reportName]: colConfig });
//       }
//       return response;
//     },
//     onError: (e) => Swal.fire("Error", e.message || "Failed to generate report.", "error"),
//   });

//   const filteredReports = useMemo(() =>
//     (data?.list || []).filter(r => r.reportName?.toLowerCase().includes(ui.reportQuery.toLowerCase())),
//     [data?.list, ui.reportQuery]
//   );

//   if (!isOpen) return null;

//   const MainLookupModal = config.lookup;
//   const selectedReport  = data?.list?.find(x => x.reportId === ui.selected.id);
//   const isExport        = selectedReport?.export === "Y";

//   const clearFilters = () => updateFilters({
//     sCode: "", sName: "", eCode: "", eName: "",
//     sSlCode: "", sSlName: "", eSlCode: "", eSlName: "",
//     sRcCode: "", sRcName: "", eRcCode: "", eRcName: "",
//     rcCode: "", rcName: "", custCode: "", custName: "", chainCustomer: "", chainCustomerName: "", itemCode: "", itemName: "",
//     whCode: "", whName: "", locCode: "", locName: "",
//     categCode: "", categName: "", classCode: "", className: "", faCode: "", faName: "",
//     sCutOff: "", sCutOffName: "", eCutOff: "", eCutOffName: "", reportType: "TEXT",
//   });

//   const openFAAssetLookup = async () => {
//     try {
//       const [response, colConfig] = await Promise.all([
//         postRequest("lookupFAMast", {
//           PARAMS: JSON.stringify({
//             json_data: {
//               branchCode: filters.branchCode || "",
//               flocCode: filters.locCode || "",
//               rcCode: filters.rcCode || "",
//               categCode: filters.categCode || "",
//               classCode: filters.classCode || "",
//               filter: "ActiveAll",
//             },
//           }),
//         }),
//         useSelectedHSColConfig("lookupFAMast", userCode || currentUserRow?.userCode || ""),
//       ]);

//       const rows = extractLookupRows(response).map((row, index) => ({
//         ...row,
//         groupId: row?.groupId || row?.faCode || row?.FA_CODE || String(index + 1),
//       }));

//       if (rows.length === 0) {
//         Swal.fire("Fixed Asset Lookup", "No fixed assets found for the selected filters.", "info");
//         return;
//       }

//       updateUi({
//         faAssetRows: rows,
//         faAssetColumns: Array.isArray(colConfig) ? colConfig : [],
//         faAssetModal: true,
//       });
//     } catch (error) {
//       console.error("Failed to load fixed asset lookup:", error);
//       Swal.fire("Fixed Asset Lookup", "Unable to load fixed asset records.", "error");
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
//          style={{ background: "rgba(30,58,100,0.4)", backdropFilter: "blur(6px)" }}>

//       {/* ── MODAL SHELL ─────────────────────────────────────────────────────── */}
//       <div className={`
//         relative w-full bg-white shadow-2xl overflow-hidden flex flex-col
//         rounded-t-3xl sm:rounded-2xl
//         h-[95dvh] sm:h-[82vh]
//         max-w-full sm:max-w-[850px] lg:max-w-[880px]
//         transition-all duration-300
//       `}>

//         {/* ── HEADER ──────────────────────────────────────────────────────── */}
//         <header className={`relative bg-gradient-to-r ${accent} px-4 pt-4 pb-3 flex-shrink-0`}>
//           {/* drag handle (mobile) */}
//           <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/40 sm:hidden" />

//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               {/* Mobile: back button when on form panel */}
//               {ui.showPanel === "form" && (
//                 <button
//                   className="sm:hidden flex items-center gap-1.5 text-white/80 hover:text-white transition text-xs font-medium"
//                   onClick={() => updateUi({ showPanel: "list" })}
//                 >
//                   <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
//                   Reports
//                 </button>
//               )}
//               <div>
//                 <p className="text-blue-100 text-[8px] tracking-[0.2em] uppercase font-semibold leading-none mb-2">
//                   Report Generator
//                 </p>
//                 <h2 className="text-white font-bold text-base leading-tight tracking-tight">
//                   {module} Reports
//                 </h2>
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               {/* Report count badge */}
//               {data?.list?.length > 0 && (
//                 <span className="hidden sm:flex items-center bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
//                   {data.list.length} {data.list.length === 1 ? "report" : "reports"}
//                 </span>
//               )}
//               <button
//                 onClick={onClose}
//                 className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all active:scale-95"
//               >
//                 <FontAwesomeIcon icon={faXmark} className="text-sm" />
//               </button>
//             </div>
//           </div>

//           {/* Mobile tab bar */}
//           <div className="sm:hidden flex mt-3 gap-1 bg-white/10 p-0.5 rounded-xl">
//             {["list", "form"].map(p => (
//               <button key={p} onClick={() => updateUi({ showPanel: p })}
//                 className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-bold transition-all ${
//                   ui.showPanel === p ? "bg-white text-blue-600 font-bold shadow-sm" : "text-white/70"
//                 }`}>
//                 {p === "list" ? "📋 Reports" : "⚙️ Parameters"}
//               </button>
//             ))}
//           </div>
//         </header>

//         {/* ── BODY ────────────────────────────────────────────────────────── */}
//         <main className="flex-1 flex overflow-hidden min-h-0">

//           {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
//           <aside className={`
//             ${ui.showPanel === "list" ? "flex" : "hidden"} sm:flex
//             w-full sm:w-[260px] lg:w-[280px] flex-col border-r border-gray-100
//             bg-gray-50/60
//           `}>
//             {/* Search */}
//             <div className="p-3 border-b border-gray-100 bg-white flex-shrink-0">
//               <div className="relative">
//                 <FontAwesomeIcon icon={faMagnifyingGlass}
//                   className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[11px]" />
//                 <input
//                   type="text"
//                   placeholder="Search reports…"
//                   value={ui.reportQuery}
//                   onChange={e => updateUi({ reportQuery: e.target.value })}
//                   className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:border-transparent ${ring} transition`}
//                 />
//                 {ui.reportQuery && (
//                   <button onClick={() => updateUi({ reportQuery: "" })}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
//                     <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
//                   </button>
//                 )}
//               </div>
//             </div>

//             {/* Report list */}
//             <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
//               {isInitialLoading ? (
//                 <div className="flex flex-col items-center justify-center h-32 gap-2">
//                   <FontAwesomeIcon icon={faCircleNotch} spin className="text-gray-300 text-xl" />
//                   <p className="text-[10px] text-gray-400">Loading reports…</p>
//                 </div>
//               ) : filteredReports.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center h-32 gap-2">
//                   <FontAwesomeIcon icon={faFileAlt} className="text-gray-200 text-2xl" />
//                   <p className="text-[10px] text-gray-400">No reports found</p>
//                 </div>
//               ) : filteredReports.map((r) => {
//                 const isSelected = ui.selected.id === r.reportId;
//                 return (
//                   <button key={r.reportId}
//                     onClick={() => {
//                       updateUi({ selected: { id: r.reportId, name: r.reportName }, showPanel: "form" });
//                     }}
//                     className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all group flex items-center justify-between gap-2 ${
//                       isSelected
//                         ? `${selBg} text-white shadow-md`
//                         : "hover:bg-white bg-transparent text-gray-700 hover:shadow-sm"
//                     }`}
//                   >
//                     <div className="flex items-center gap-2.5 min-w-0">
//                       <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? "bg-white/60" : "bg-gray-300 group-hover:bg-gray-400"}`} />
//                       <span className="font-medium truncate leading-tight">{r.reportName}</span>
//                     </div>
//                     {r.export === "Y" && (
//                       <FontAwesomeIcon icon={faDownload}
//                         className={`flex-shrink-0 text-[10px] ${isSelected ? "text-white/70" : "text-emerald-400"}`} />
//                     )}
//                   </button>
//                 );
//               })}
//             </div>

//             {/* Sidebar footer */}
//             {filteredReports.length > 0 && (
//               <div className="px-3 py-2 border-t border-gray-100 flex-shrink-0">
//                 <p className="text-[9px] text-gray-300 text-center tracking-wide">
//                   {filteredReports.length} of {data?.list?.length || 0} reports
//                 </p>
//               </div>
//             )}
//           </aside>

//           {/* ── FILTER FORM ─────────────────────────────────────────────── */}
//           <section className={`
//             ${ui.showPanel === "form" ? "flex" : "hidden"} sm:flex
//             flex-1 flex-col min-w-0 overflow-x-hidden bg-white
//           `}>
//             {ui.selected.id === 0 ? (
//               /* Empty state */
//               <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
//                 <div className={`w-16 h-16 ${bgLight} rounded-2xl flex items-center justify-center`}>
//                   <FontAwesomeIcon icon={faFileAlt} className={`text-2xl ${textCls}`} />
//                 </div>
//                 <div>
//                   <p className="text-sm font-semibold text-gray-700">Select a Report</p>
//                   <p className="text-xs text-gray-400 mt-1">Choose a report from the list to configure and generate it.</p>
//                 </div>
//               </div>
//             ) : (
//               <>
//                 {/* Form header */}
//                 <div className={`flex-shrink-0 px-5 py-3 border-b border-gray-100 ${bgLight} flex items-center justify-between gap-3`}>
//                   <div className="min-w-0">
//                     <p className="text-[9px] tracking-widest text-gray-400 uppercase font-semibold leading-none mb-0.5">Selected Report</p>
//                     <h3 className={`text-sm font-bold ${textCls} truncate`}>{ui.selected.name}</h3>
//                   </div>
//                   {isExport && (
//                     <span className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border border-emerald-200">
//                       <FontAwesomeIcon icon={faFileExcel} />
//                       Excel Export
//                     </span>
//                   )}
//                   {!isExport && ui.selected.id > 0 && (
//                     <span className="flex-shrink-0 flex items-center gap-1.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border border-blue-200">
//                       <FontAwesomeIcon icon={faPrint} />
//                       Print Report
//                     </span>
//                   )}
//                 </div>

//                 {/* Scrollable filter area */}
//                 <div className="flex-1 overflow-y-auto">
//                   <div className="p-4">
//                     <div className="grid gap-y-3 gap-x-4"
//                          style={{ gridTemplateColumns: "6rem 1fr" }}>

//                       {/* Branch */}
//                       <LookupField
//                         label="Branch"
//                         value={filters.branchName}
//                         placeholder="Select Branch…"
//                         onOpen={() => updateUi({ branchModal: true })}
//                         ring={ring} btnClass={btnCls}
//                       />

//                       {/* BIR: Cutoff range */}
//                       {config.hasCutoff && (<>
//                         <LookupField label="Start Cutoff" value={filters.sCutOffName || filters.sCutOff}
//                           placeholder="Select Starting Cutoff…"
//                           onOpen={() => updateUi({ cutoffLookupMode: "S", cutoffModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="End Cutoff" value={filters.eCutOffName || filters.eCutOff}
//                           placeholder="Select Ending Cutoff…"
//                           onOpen={() => updateUi({ cutoffLookupMode: "E", cutoffModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                       </>)}

//                       {/* BIR: Report type */}
//                       {config.hasReportType && (
//                         <>
//                           <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
//                             Format
//                           </label>
//                           <div className="relative">
//                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
//                               <FontAwesomeIcon icon={getReportTypeIcon(filters.reportType)} />
//                             </span>
//                             <select value={filters.reportType}
//                               onChange={e => updateFilters({ reportType: e.target.value })}
//                               className={`w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-xs bg-gray-50 outline-none appearance-none focus:ring-2 focus:border-transparent transition ${ring}`}>
//                               <option value="TEXT">Text File (.txt)</option>
//                               <option value="CSV">CSV File (.csv)</option>
//                               <option value="EXCEL">Excel File (.xlsx)</option>
//                             </select>
//                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
//                               <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
//                             </span>
//                           </div>
//                         </>
//                       )}

//                       {/* Date range */}
//                       {!config.hasCutoff && (
//                         <DateRangeField
//                           startDate={filters.startDate} endDate={filters.endDate}
//                           onStartChange={v => updateFilters({ startDate: v })}
//                           onEndChange={v => updateFilters({ endDate: v })}
//                           ring={ring}
//                         />
//                       )}

//                       {/* Sales */}
//                       {config.hasSales && (<>
//                         <LookupField label="Customer"
//                           value={filters.custName || filters.custCode}
//                           placeholder="Select Customer..."
//                           onOpen={() => updateUi({ salesCustomerModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Chain Customer"
//                           value={filters.chainCustomerName || filters.chainCustomer}
//                           placeholder="Select Chain Customer..."
//                           onOpen={() => updateUi({ salesChainModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Item"
//                           value={filters.itemName || filters.itemCode}
//                           placeholder="Select Item..."
//                           onOpen={() => updateUi({ salesItemModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                       </>)}

//                       {/* Main lookup: single or range */}
//                       {!config.hasCutoff && !config.hasInventory && !config.hasFA && !config.hasSales && (
//                         config.hasSingleMain ? (
//                           <LookupField label={config.label}
//                             value={filters.sName} placeholder={`Select ${config.label}…`}
//                             onOpen={() => updateUi({ lookupMode: "S", mainLookup: true })}
//                             ring={ring} btnClass={btnCls} />
//                         ) : (
//                           ["s", "e"].map(dir => (
//                             <LookupField key={dir}
//                               label={`${dir === "s" ? "Start" : "End"} ${config.label}`}
//                               value={filters[`${dir}Name`]} placeholder={`Select ${config.label}…`}
//                               onOpen={() => updateUi({ lookupMode: dir.toUpperCase(), mainLookup: true })}
//                               ring={ring} btnClass={btnCls} />
//                           ))
//                         )
//                       )}

//                       {/* Fixed Assets fields */}
//                       {config.hasFA && (<>
//                         <LookupField label="Category" value={filters.categName || filters.categCode}
//                           placeholder="Select Category..."
//                           onOpen={() => updateUi({ faCategoryModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Sub Category" value={filters.className || filters.classCode}
//                           placeholder="Select Sub Category..."
//                           onOpen={() => {
//                             if (!filters.categCode) {
//                               Swal.fire("Sub Category", "Please select a Category first.", "info");
//                               return;
//                             }
//                             updateUi({ faClassModal: true });
//                           }}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label={config.rcLabel || "Department/RC"} value={filters.rcName || filters.rcCode}
//                           placeholder={`Select ${config.rcLabel || "Department/RC"}...`}
//                           onOpen={() => updateUi({ rcLookupMode: "SINGLE", rcModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Location" value={filters.locName || filters.locCode}
//                           placeholder="Select Location..."
//                           onOpen={() => updateUi({ faLocationModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Asset" value={filters.faName || filters.faCode}
//                           placeholder="Select Fixed Asset..."
//                           onOpen={openFAAssetLookup}
//                           ring={ring} btnClass={btnCls} />
//                       </>)}

//                       {/* Inventory fields */}
//                       {config.hasInventory && !config.hasSales && (<>
//                         <LookupField label="Item Code" value={filters.sName || filters.sCode}
//                           placeholder="Select Item…"
//                           onOpen={() => updateUi({ lookupMode: "S", mainLookup: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Warehouse" value={filters.whName || filters.whCode}
//                           placeholder="Select Warehouse…"
//                           onOpen={() => updateUi({ warehouseModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                         <LookupField label="Location" value={filters.locName || filters.locCode}
//                           placeholder="Select Location…"
//                           onOpen={() => updateUi({ locationModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                       </>)}

//                       {/* PUR: single RC/Dept */}
//                       {config.hasSingleRc && !config.hasFA && (
//                         <LookupField label={config.rcLabel || "Dept/RC"}
//                           value={filters.rcName} placeholder={`Select ${config.rcLabel || "Dept/RC"}…`}
//                           onOpen={() => updateUi({ rcLookupMode: "SINGLE", rcModal: true })}
//                           ring={ring} btnClass={btnCls} />
//                       )}

//                       {/* GL: SL + RC ranges */}
//                       {config.hasExtra && (<>
//                         {/* Divider */}
//                         {/* <div className="col-span-2 pt-1">
//                           <p className="text-[9px] tracking-widest text-gray-300 uppercase font-semibold border-t border-gray-100 pt-3">
//                             Subsidiary Ledger
//                           </p>
//                         </div> */}
//                         <LookupField label="Start SL" value={filters.sSlName} placeholder="Select Starting SL…"
//                           onOpen={() => updateUi({ slLookupMode: "S", slModal: true })} ring={ring} btnClass={btnCls} />
//                         <LookupField label="End SL" value={filters.eSlName} placeholder="Select Ending SL…"
//                           onOpen={() => updateUi({ slLookupMode: "E", slModal: true })} ring={ring} btnClass={btnCls} />

//                         {/* <div className="col-span-2">
//                           <p className="text-[9px] tracking-widest text-gray-300 uppercase font-semibold border-t border-gray-100 pt-3">
//                             Responsibility Center
//                           </p>
//                         </div> */}
//                         <LookupField label="Start RC" value={filters.sRcName} placeholder="Select Starting RC…"
//                           onOpen={() => updateUi({ rcLookupMode: "S", rcModal: true })} ring={ring} btnClass={btnCls} />
//                         <LookupField label="End RC" value={filters.eRcName} placeholder="Select Ending RC…"
//                           onOpen={() => updateUi({ rcLookupMode: "E", rcModal: true })} ring={ring} btnClass={btnCls} />
//                       </>)}

//                     </div>
//                   </div>
//                 </div>

//                 {/* ── ACTION FOOTER ──────────────────────────────────────── */}
//                 <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
//                   <button onClick={clearFilters}
//                     className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 active:scale-95">
//                     <FontAwesomeIcon icon={faBroom} />
//                     Clear
//                   </button>

//                   <button
//                     onClick={() => generateMutation.mutate()}
//                     disabled={generateMutation.isPending || !ui.selected.id}
//                     className={`
//                       flex items-center gap-2 ${btnCls} text-white
//                       px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg
//                       transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
//                     `}
//                   >
//                     {generateMutation.isPending ? (
//                       <>
//                         <FontAwesomeIcon icon={faCircleNotch} spin />
//                         <span>Generating…</span>
//                       </>
//                     ) : (
//                       <>
//                         <FontAwesomeIcon icon={isExport ? faDownload : faPrint} />
//                         <span>{isExport ? "Download Report" : "Generate Report"}</span>
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </>
//             )}
//           </section>
//         </main>

//         {/* Global loading overlay */}
//         {(isInitialLoading || generateMutation.isPending) && <LoadingSpinner />}
//       </div>

//       {/* ── LOOKUP MODALS ─────────────────────────────────────────────────── */}
//       {ui.branchModal && (
//         <BranchLookupModal isOpen onClose={p => {
//           if (p?.branchCode) updateFilters({ branchCode: p.branchCode, branchName: p.branchName });
//           updateUi({ branchModal: false });
//         }} />
//       )}

//       {ui.salesCustomerModal && (
//         <CustomerMastLookupModal
//           isOpen={ui.salesCustomerModal}
//           customParam="ActiveAll"
//           onClose={p => {
//             if (p) updateFilters({ custCode: p.custCode || "", custName: p.custName || "" });
//             updateUi({ salesCustomerModal: false });
//           }}
//         />
//       )}

//       {ui.salesChainModal && (
//         <CustomerMastLookupModal
//           isOpen={ui.salesChainModal}
//           customParam="ActiveChain"
//           onClose={p => {
//             if (p) updateFilters({ chainCustomer: p.custCode || "", chainCustomerName: p.custName || "" });
//             updateUi({ salesChainModal: false });
//           }}
//         />
//       )}

//       {ui.salesItemModal && (
//         <ItemMastLookupModal
//           isOpen={ui.salesItemModal}
//           endpoint="getInvLookupFG"
//           docType="SO"
//           customParam="ActiveAll"
//           onClose={p => {
//             const row = Array.isArray(p?.records) ? p.records[0] : p?.records || p;
//             if (row) {
//               updateFilters({
//                 itemCode: row.itemCode || row.itemNo || row.code || "",
//                 itemName: row.itemName || row.description || row.name || "",
//               });
//             }
//             updateUi({ salesItemModal: false });
//           }}
//         />
//       )}

//       {!config.hasCutoff && ui.mainLookup && MainLookupModal && (
//         <MainLookupModal isOpen onClose={p => {
//           if (p) {
//             const code = p.payeeCode || p.vendCode || p.custCode || p.acctCode || p.itemCode || "";
//             const name = p.payeeName || p.vendName || p.custName || p.acctName || p.itemName || "";
//             if (ui.lookupMode === "S") updateFilters({ sCode: code, sName: name, eCode: code, eName: name });
//             else updateFilters({ eCode: code, eName: name });
//           }
//           updateUi({ mainLookup: false });
//         }} />
//       )}

//       {config.hasFA && ui.faCategoryModal && (
//         <SearchFACateg isOpen={ui.faCategoryModal} onClose={p => {
//           if (p) {
//             const code = p.code || p.categCode || "";
//             const name = p.description || p.categName || p.code || "";
//             updateFilters({ categCode: code, categName: name, classCode: "", className: "", faCode: "", faName: "" });
//           }
//           updateUi({ faCategoryModal: false });
//         }} />
//       )}

//       {config.hasFA && ui.faClassModal && (
//         <SearchFAClass isOpen={ui.faClassModal} categCode={filters.categCode || ""} onClose={p => {
//           if (p) {
//             updateFilters({
//               classCode: p.code || p.classCode || "",
//               className: p.description || p.className || p.code || "",
//               categCode: p.categCode || filters.categCode || "",
//               faCode: "",
//               faName: "",
//             });
//           }
//           updateUi({ faClassModal: false });
//         }} />
//       )}

//       {config.hasFA && ui.faLocationModal && (
//         <SearchFALoc isOpen={ui.faLocationModal} branchCode={filters.branchCode} onClose={p => {
//           if (p) updateFilters({ locCode: p.flocCode || p.code || "", locName: p.flocName || p.description || p.code || "", faCode: "", faName: "" });
//           updateUi({ faLocationModal: false });
//         }} />
//       )}

//       {config.hasFA && ui.faAssetModal && (
//         <GlobalLookupModalv1
//           isOpen={ui.faAssetModal}
//           title="Fixed Asset Master"
//           data={ui.faAssetRows}
//           endpoint={ui.faAssetColumns}
//           btnCaption="Select Asset"
//           idKey="groupId"
//           singleSelect
//           onClose={selectedItems => {
//             const records = selectedItems?.records;
//             const row = Array.isArray(records) ? records[0] : records;
//             if (row) {
//               updateFilters({
//                 faCode: row.faCode || row.FA_CODE || "",
//                 faName: row.faName || row.assetDescription || row.FA_NAME || row.description || row.faCode || "",
//               });
//             }
//             updateUi({ faAssetModal: false, faAssetRows: [], faAssetColumns: [] });
//           }}
//           onCancel={() => updateUi({ faAssetModal: false, faAssetRows: [], faAssetColumns: [] })}
//         />
//       )}

//       {ui.cutoffModal && (
//         <CutoffLookupModal isOpen onClose={p => {
//           if (p) {
//             if (ui.cutoffLookupMode === "S")
//               updateFilters({ sCutOff: p.cutoffCode||"", sCutOffName: p.cutoffName||"", eCutOff: p.cutoffCode||"", eCutOffName: p.cutoffName||"" });
//             else
//               updateFilters({ eCutOff: p.cutoffCode||"", eCutOffName: p.cutoffName||"" });
//           }
//           updateUi({ cutoffModal: false });
//         }} />
//       )}

//       {ui.slModal && (
//         <SLMastLookupModal isOpen onClose={p => {
//           if (p) {
//             if (ui.slLookupMode === "S") updateFilters({ sSlCode: p.slCode||"", sSlName: p.slName||"", eSlCode: p.slCode||"", eSlName: p.slName||"" });
//             else updateFilters({ eSlCode: p.slCode||"", eSlName: p.slName||"" });
//           }
//           updateUi({ slModal: false });
//         }} />
//       )}

//       {ui.rcModal && (
//         <RCLookupModal isOpen onClose={p => {
//           if (p) {
//             if (ui.rcLookupMode === "SINGLE") updateFilters({ rcCode: p.rcCode||"", rcName: p.rcName||"" });
//             else if (ui.rcLookupMode === "S") updateFilters({ sRcCode: p.rcCode||"", sRcName: p.rcName||"", eRcCode: p.rcCode||"", eRcName: p.rcName||"" });
//             else updateFilters({ eRcCode: p.rcCode||"", eRcName: p.rcName||"" });
//           }
//           updateUi({ rcModal: false });
//         }} />
//       )}

//       {config.hasInventory && ui.warehouseModal && (
//         <WarehouseLookupModal isOpen onClose={p => {
//           if (p) updateFilters({ whCode: p.whCode||"", whName: p.whName||"", locCode: "", locName: "" });
//           updateUi({ warehouseModal: false });
//         }} />
//       )}

//       {config.hasInventory && ui.locationModal && (
//         <LocationLookupModal isOpen whCode={filters.whCode} onClose={p => {
//           if (p) updateFilters({ locCode: p.locCode||"", locName: p.locName||"", whCode: p.whCode||filters.whCode });
//           updateUi({ locationModal: false });
//         }} />
//       )}
//     </div>
//   );
// };

// export default UniversalReportModal;



import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faXmark,
  faCircleNotch,
  faBroom,
  faDownload,
  faFileExcel,
  faFileCsv,
  faFileLines,
  faChevronLeft,
  faChevronRight,
  faFileAlt,
  faPrint,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

// --- Project Imports ---
import { fetchData, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import { useTopUserRow, useTopHSRptRow } from "@/NAYSA Cloud/Global/top1RefTable";
import {
  useHandlePrintAPReport,
  useHandleDownloadExcelAPReport,
  useHandleDownloadExcelPURReport,
  useHandlePrintARReport,
  useHandleDownloadExcelARReport,
  useHandlePrintGLReport,
  useHandleDownloadExcelGLReport,
  useHandleDownloadExcelBIRReport,
  useHandlePrintFGINVReport,
  useHandleDownloadExcelFGINVReport,
  useHandlePrintMSINVReport,
  useHandleDownloadExcelMSINVReport,
  useHandlePrintRMINVReport,
  useHandleDownloadExcelRMINVReport,
  useHandleDownloadExcelFAReport,
  useHandlePrintFAReport,
  useHandleDownloadExcelIMPReport,
  useHandleDownloadExcelBUDReport,
  useHandleDownloadExcelSalesReport,
  useHandlePrintSalesReport,
  useHandlePrintBUDReport,
} from "@/NAYSA Cloud/Global/report";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import { useGetCurrentDay, useFormatToDate } from "@/NAYSA Cloud/Global/dates";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// --- Lookup Modals ---
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast";
import SLMastLookupModal from "@/NAYSA Cloud/Lookup/SearchSLMast";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import FGLookupModal from "@/NAYSA Cloud/Lookup/SearchFGMast";
import MSLookupModal from "@/NAYSA Cloud/Lookup/SearchMSMast";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast";
import LocationLookupModal from "@/NAYSA Cloud/Lookup/SearchLocation";
import SearchFACateg from "@/NAYSA Cloud/Lookup/SearchFACateg.jsx";
import SearchFAClass from "@/NAYSA Cloud/Lookup/SearchFAClass.jsx";
import SearchFALoc from "@/NAYSA Cloud/Lookup/SearchFALoc.jsx";
import SearchBudItemRef from "@/NAYSA Cloud/Lookup/SearchBudItemRef.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";

// ─── MODULE CONFIGURATION ────────────────────────────────────────────────────

const RMLookupModal = (props) => (
  <ItemMastLookupModal
    {...props}
    endpoint="getInvLookupRM"
    docType="PRRM"
    enableMultiSelect={false}
  />
);

const MODULE_DEFS = {
  AP:  { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelPURReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
  VI:  { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelAPReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
  EWT: { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelAPReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
  PUR: { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,    excel: useHandleDownloadExcelAPReport,    hasExtra: false, hasCutoff: false, hasReportType: false, hasSingleMain: true, hasSingleRc: true, rcLabel: "Department/RC" },
  AR:  { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport,    excel: useHandleDownloadExcelARReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
  VO:  { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport,    excel: useHandleDownloadExcelARReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
  CWT: { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintARReport,    excel: useHandleDownloadExcelARReport,    hasExtra: false, hasCutoff: false, hasReportType: false },
  GL:  { label: "Account",  lookup: COAMastLookupModal,      print: useHandlePrintGLReport,    excel: useHandleDownloadExcelGLReport,    hasExtra: true,  hasCutoff: false, hasReportType: false },
  BIR: { label: "",         lookup: null,                    print: useHandlePrintGLReport,    excel: useHandleDownloadExcelBIRReport,   hasExtra: false, hasCutoff: true,  hasReportType: true },
  FG:  { label: "Item",     lookup: FGLookupModal,           print: useHandlePrintFGINVReport,  excel: useHandleDownloadExcelFGINVReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasInventory: true, hasSingleMain: true },
  MS:  { label: "Item",     lookup: MSLookupModal,           print: useHandlePrintMSINVReport,  excel: useHandleDownloadExcelMSINVReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasInventory: true, hasSingleMain: true },
  RM:  { label: "Item",     lookup: RMLookupModal,           print: useHandlePrintRMINVReport,  excel: useHandleDownloadExcelRMINVReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasInventory: true, hasSingleMain: true },
  FA:  { label: "Asset",    lookup: null,                    print: useHandlePrintFAReport,     excel: useHandleDownloadExcelFAReport,    hasExtra: false, hasCutoff: false, hasReportType: false, hasFA: true, hasSingleMain: true, hasSingleRc: true, rcLabel: "Department/RC" },
  IMP: { label: "Payee",    lookup: PayeeMastLookupModal,    print: useHandlePrintAPReport,     excel: useHandleDownloadExcelIMPReport,   hasExtra: false, hasCutoff: false, hasReportType: false, hasSingleMain: true, hasSingleRc: true, rcLabel: "Department/RC" },
  BUD: { label: "Budget",   lookup: null,                    print: useHandlePrintBUDReport,    excel: useHandleDownloadExcelBUDReport,   hasExtra: false, hasCutoff: false, hasReportType: false, hasBudget: true, hasSingleRc: true, rcLabel: "Department/RC" },
  OE: { label: "Customer", lookup: CustomerMastLookupModal, print: useHandlePrintSalesReport, excel: useHandleDownloadExcelSalesReport, hasExtra: false, hasCutoff: false, hasReportType: false, hasSales: true },
};

// ─── SYSTEM COLOR THEME (blue) ────────────────────────────────────────────────
const THEME = {
  gradient: "bg-blue-600",
  bgLight:  "bg-blue-50",
  ring:     "focus:ring-blue-300",
  selected: "bg-blue-500",
  btn:      "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
  text:     "text-blue-600",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const getReportTypeIcon = (type) => {
  switch (String(type || "").toUpperCase()) {
    case "EXCEL": return faFileExcel;
    case "CSV":   return faFileCsv;
    default:      return faFileLines;
  }
};

const sanitizeFileName = (value = "") =>
  String(value).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();

const buildBIRFileName = (reportName, sCutOff, eCutOff, ext) =>
  [sanitizeFileName(reportName || "BIR Report"), sanitizeFileName(sCutOff || ""), sanitizeFileName(eCutOff || "")]
    .filter(Boolean).join(" ") + `.${ext}`;

const downloadBlobFile = (content, fileName, mimeType) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

const escapeCsvValue = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const convertRowsToCsv = (rows = []) => {
  if (!rows.length) return "";
  const h = Object.keys(rows[0]);
  return [h.map(escapeCsvValue).join(","), ...rows.map(r => h.map(k => escapeCsvValue(r?.[k])).join(","))].join("\r\n");
};

const convertRowsToTxt = (rows = []) => {
  if (!rows.length) return "";
  const h = Object.keys(rows[0]);
  return rows.map(r => h.map(k => r?.[k] == null ? "" : String(r[k])).join("\t")).join("\r\n");
};

const parseLookupRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return parseLookupRows(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (value?.data) return parseLookupRows(value.data);
  if (value?.result) return parseLookupRows(value.result);
  return [];
};

const extractLookupRows = (response) => {
  const resultValue =
    response?.data?.[0]?.result ??
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data ??
    response?.result ??
    response;

  return parseLookupRows(resultValue);
};

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────

/** Labeled lookup input with search button */
const LookupField = ({ label, value, placeholder, onOpen, ring, btnClass, readOnly = true }) => (
  <div className="contents">
    <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
      {label}
    </label>
    <div className="relative min-w-0">
      <input
        readOnly={readOnly}
        value={value}
        placeholder={placeholder}
        className={`w-full min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 pr-12 text-xs bg-gray-50 outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
      />
      <button
        type="button"
        onClick={onOpen}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${btnClass} text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-sm`}
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px]" />
      </button>
    </div>
  </div>
);

/** Date range row */
const DateRangeField = ({ startDate, endDate, onStartChange, onEndChange, ring }) => (
  <div className="contents">
    <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
      Date Range
    </label>
    <div className="flex flex-col sm:flex-row gap-2 min-w-0">
      <input
        type="date"
        value={startDate}
        onChange={e => onStartChange(e.target.value)}
        className={`flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
      />
      <span className="hidden sm:flex self-center text-gray-300 text-xs font-bold">—</span>
      <input
        type="date"
        value={endDate}
        onChange={e => onEndChange(e.target.value)}
        className={`flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
      />
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const UniversalReportModal = ({ isOpen, onClose, userCode, module = "AP" }) => {
  const config = MODULE_DEFS[module] || MODULE_DEFS.AP;
  const today = useGetCurrentDay();
  const { companyInfo, currentUserRow } = useAuth();

  const firstDay = useMemo(() =>
    useFormatToDate(new Date(new Date(today).getFullYear(), new Date(today).getMonth(), 1)),
    [today]
  );

  const accent  = THEME.gradient;
  const bgLight = THEME.bgLight;
  const ring    = THEME.ring;
  const selBg   = THEME.selected;
  const btnCls  = THEME.btn;
  const textCls = THEME.text;

  // UI state
  const [ui, setUi] = useState({
    reportQuery: "",
    branchModal: false,
    mainLookup: false,
    salesCustomerModal: false,
    salesChainModal: false,
    salesItemModal: false,
    slModal: false,
    rcModal: false,
    warehouseModal: false,
    locationModal: false,
    faCategoryModal: false,
    faClassModal: false,
    faLocationModal: false,
    faAssetModal: false,
    budgetItemModal: false,
    budgetAccountModal: false,
    faAssetRows: [],
    faAssetColumns: [],
    cutoffModal: false,
    cutoffLookupMode: "S",
    selected: { id: 0, name: "" },
    lookupMode: "S",
    slLookupMode: "S",
    rcLookupMode: "S",
    showPanel: "list", // "list" | "form"  (mobile nav)
  });

  // Filter state
  const [filters, setFilters] = useState({
    branchCode: currentUserRow.branchCode,
    branchName: currentUserRow.branchName,
    startDate: firstDay,
    endDate: today,
    sCode: "", sName: "", eCode: "", eName: "",
    sSlCode: "", sSlName: "", eSlCode: "", eSlName: "",
    sRcCode: "", sRcName: "", eRcCode: "", eRcName: "",
    rcCode: "", rcName: "",
    custCode: "", custName: "",
    chainCustomer: "", chainCustomerName: "",
    itemCode: "", itemName: "",
    whCode: "", whName: "", locCode: "", locName: "",
    categCode: "", categName: "", classCode: "", className: "",
    faCode: "", faName: "",
    userName: currentUserRow.userName,
    sCutOff: companyInfo.cutoffCode, sCutOffName: companyInfo.cutoffName,
    eCutOff: companyInfo.cutoffCode, eCutOffName: companyInfo.cutoffName,
    endingCutoff: companyInfo.cutoffCode,
    reportType: "TEXT",
    budgetYear: String(new Date(today).getFullYear()),
    cutoffCode: companyInfo.cutoffCode,
    cutoffName: companyInfo.cutoffName,
    budgetCode: "",
    budgetName: "",
    acctCode: "",
    acctName: "",
    groupBy: "ACCOUNT_RC",
    monthlyView: "BUDGET",
  });

  const updateUi      = (p) => setUi(prev => ({ ...prev, ...p }));
  const updateFilters = (p) => setFilters(prev => ({ ...prev, ...p }));

  // ── Fetch report list ──────────────────────────────────────────────────────
  const { data, isLoading: isInitialLoading } = useQuery({
    queryKey: ["reports", module, currentUserRow.userCode],
    queryFn: async () => {
      const [rptRes] = await Promise.all([
        fetchData("hsrpt", { mdl: module, userCode: currentUserRow.userCode }),
      ]);
      const list = rptRes?.data?.[0]?.result ? JSON.parse(rptRes.data[0].result) : [];
      return { list };
    },
    enabled: isOpen,
  });


  useEffect(() => {
    if (data?.list?.length > 0 && ui.selected.id === 0) {
      updateUi({ selected: { id: data.list[0].reportId, name: data.list[0].reportName } });
    }
  }, [data]);

  // ── Generate mutation ──────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      const meta = await useTopHSRptRow(ui.selected.id);
      const params = {
        reportId: ui.selected.id,
        branchCode: filters.branchCode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        custCode: config.hasSales ? filters.custCode : (filters.custCode || filters.customerCode || filters.sCustCode),
        chainCustomer: config.hasSales ? filters.chainCustomer : (filters.chainCustomer || filters.chainCode),
        sPayeeCode: filters.sCode, ePayeeCode: config.hasSingleMain ? filters.sCode : filters.eCode,
        sCustCode:  filters.sCode, eCustCode:  config.hasSingleMain ? filters.sCode : filters.eCode,
        sAccCode:   filters.sCode, eAccCode:   config.hasSingleMain ? filters.sCode : filters.eCode,
        payeeCode: filters.sCode, vendCode: filters.sCode, departmentCode: filters.rcCode,
        itemCode: config.hasSales ? filters.itemCode : filters.sCode, whCode: filters.whCode, wwhCode: filters.whCode, locCode: filters.locCode,
        categCode: filters.categCode, classCode: filters.classCode, faCode: filters.faCode,
        sSLCode: filters.sSlCode, eSLCode: filters.eSlCode,
        sRcCode: config.hasSingleRc ? filters.rcCode : filters.sRcCode,
        eRcCode: config.hasSingleRc ? filters.rcCode : filters.eRcCode,
        slCode: filters.sSlCode, rcCode: config.hasSingleRc ? filters.rcCode : filters.sRcCode,
        sCutOff: filters.sCutOff, eCutOff: filters.eCutOff,
        sCutoffCode: filters.sCutOff, eCutoffCode: filters.eCutOff,
        reportType: filters.reportType,
        budgetYear: filters.budgetYear,
        cutoffCode: filters.cutoffCode,
        budgetCode: filters.budgetCode,
        acctCode: filters.acctCode,
        groupBy: filters.groupBy || "ACCOUNT_RC",
        monthlyView: filters.monthlyView || "BUDGET",
        userCode,
        mode: meta.sprocMode,
      };

      const handler  = meta.export === "Y" ? config.excel : config.print;
      const response = await handler(params);

      if (module === "BIR") {
        const rawRows = Array.isArray(response?.data) ? response.data
          : Array.isArray(response?.data?.data) ? response.data.data : [];
        const selectedReportName = ui.selected.name || meta.reportName || "BIR_Report";
        const rTypeUp = String(filters.reportType || "").toUpperCase();

        if (rTypeUp === "TEXT") {
          const rows = rawRows.map(({ reportGroup, reportType, ...r }) => r);
          downloadBlobFile(convertRowsToTxt(rows), buildBIRFileName(selectedReportName, filters.sCutOff, filters.eCutOff, "txt"), "text/plain;charset=utf-8;");
          return response;
        }
        if (rTypeUp === "CSV") {
          const rows = rawRows.filter(r => r?.reportGroup === "Data")
            .map(({ reportGroup, reportType, ...r }) =>
              Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v).trim()])));
          downloadBlobFile(convertRowsToCsv(rows), buildBIRFileName(selectedReportName, filters.sCutOff, filters.eCutOff, "csv"), "text/csv;charset=utf-8;");
          return response;
        }
        if (rTypeUp === "EXCEL") {
          const rows = rawRows.filter(r => r?.reportGroup === "Data").map(({ reportGroup, reportType, ...r }) => r);
          const colConfig  = await useSelectedHSColConfig(meta.sprocMode, userCode);
          const excelFileName = buildBIRFileName(selectedReportName, filters.sCutOff, filters.eCutOff, "xlsx");
          await exportGenericHistoryExcel({
            ReportName: selectedReportName, FileName: excelFileName, UserCode: currentUserRow.userCode,
            Branch: companyInfo.branchName, JsonData: { Data: { [selectedReportName]: rows } },
            companyName: companyInfo.compName, companyAddress: companyInfo.compAddr,
            companyTelNo: companyInfo.telNo, StartDate: filters.startDate, EndDate: filters.endDate,
          }, { [selectedReportName]: colConfig });
          return response;
        }
        throw new Error("Invalid BIR report type.");
      }

      if (meta.export === "Y") {
        const colConfig = await useSelectedHSColConfig(meta.sprocMode, userCode);
        await exportGenericHistoryExcel({
          ReportName: meta.reportName, UserCode: currentUserRow.userCode,
          Branch: companyInfo.branchName, JsonData: { Data: { [meta.reportName]: response.data } },
          companyName: companyInfo.compName, companyAddress: companyInfo.compAddr,
          companyTelNo: companyInfo.telNo, StartDate: filters.startDate, EndDate: filters.endDate,
        }, { [meta.reportName]: colConfig });
      }
      return response;
    },
    onError: (e) => Swal.fire("Error", e.message || "Failed to generate report.", "error"),
  });

  const filteredReports = useMemo(() =>
    (data?.list || []).filter(r => r.reportName?.toLowerCase().includes(ui.reportQuery.toLowerCase())),
    [data?.list, ui.reportQuery]
  );

  if (!isOpen) return null;

  const MainLookupModal = config.lookup;
  const selectedReport  = data?.list?.find(x => x.reportId === ui.selected.id);
  const isExport        = selectedReport?.export === "Y";

  const clearFilters = () => updateFilters({
    sCode: "", sName: "", eCode: "", eName: "",
    sSlCode: "", sSlName: "", eSlCode: "", eSlName: "",
    sRcCode: "", sRcName: "", eRcCode: "", eRcName: "",
    rcCode: "", rcName: "", custCode: "", custName: "", chainCustomer: "", chainCustomerName: "", itemCode: "", itemName: "",
    whCode: "", whName: "", locCode: "", locName: "",
    categCode: "", categName: "", classCode: "", className: "", faCode: "", faName: "",
    sCutOff: "", sCutOffName: "", eCutOff: "", eCutOffName: "", reportType: "TEXT",
    budgetYear: String(new Date(today).getFullYear()), cutoffCode: "", cutoffName: "",
    budgetCode: "", budgetName: "", acctCode: "", acctName: "", groupBy: "ACCOUNT_RC", monthlyView: "BUDGET",
  });

  const openFAAssetLookup = async () => {
    try {
      const [response, colConfig] = await Promise.all([
        postRequest("lookupFAMast", {
          PARAMS: JSON.stringify({
            json_data: {
              branchCode: filters.branchCode || "",
              flocCode: filters.locCode || "",
              rcCode: filters.rcCode || "",
              categCode: filters.categCode || "",
              classCode: filters.classCode || "",
              filter: "ActiveAll",
            },
          }),
        }),
        useSelectedHSColConfig("lookupFAMast", userCode || currentUserRow?.userCode || ""),
      ]);

      const rows = extractLookupRows(response).map((row, index) => ({
        ...row,
        groupId: row?.groupId || row?.faCode || row?.FA_CODE || String(index + 1),
      }));

      if (rows.length === 0) {
        Swal.fire("Fixed Asset Lookup", "No fixed assets found for the selected filters.", "info");
        return;
      }

      updateUi({
        faAssetRows: rows,
        faAssetColumns: Array.isArray(colConfig) ? colConfig : [],
        faAssetModal: true,
      });
    } catch (error) {
      console.error("Failed to load fixed asset lookup:", error);
      Swal.fire("Fixed Asset Lookup", "Unable to load fixed asset records.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: "rgba(30,58,100,0.4)", backdropFilter: "blur(6px)" }}>

      {/* ── MODAL SHELL ─────────────────────────────────────────────────────── */}
      <div className={`
        relative w-full bg-white shadow-2xl overflow-hidden flex flex-col
        rounded-t-3xl sm:rounded-2xl
        h-[95dvh] sm:h-[82vh]
        max-w-full sm:max-w-[850px] lg:max-w-[880px]
        transition-all duration-300
      `}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className={`relative bg-gradient-to-r ${accent} px-4 pt-4 pb-3 flex-shrink-0`}>
          {/* drag handle (mobile) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/40 sm:hidden" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile: back button when on form panel */}
              {ui.showPanel === "form" && (
                <button
                  className="sm:hidden flex items-center gap-1.5 text-white/80 hover:text-white transition text-xs font-medium"
                  onClick={() => updateUi({ showPanel: "list" })}
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                  Reports
                </button>
              )}
              <div>
                <p className="text-blue-100 text-[8px] tracking-[0.2em] uppercase font-semibold leading-none mb-2">
                  Report Generator
                </p>
                <h2 className="text-white font-bold text-base leading-tight tracking-tight">
                  {module} Reports
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Report count badge */}
              {data?.list?.length > 0 && (
                <span className="hidden sm:flex items-center bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                  {data.list.length} {data.list.length === 1 ? "report" : "reports"}
                </span>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all active:scale-95"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>
          </div>

          {/* Mobile tab bar */}
          <div className="sm:hidden flex mt-3 gap-1 bg-white/10 p-0.5 rounded-xl">
            {["list", "form"].map(p => (
              <button key={p} onClick={() => updateUi({ showPanel: p })}
                className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-bold transition-all ${
                  ui.showPanel === p ? "bg-white text-blue-600 font-bold shadow-sm" : "text-white/70"
                }`}>
                {p === "list" ? "📋 Reports" : "⚙️ Parameters"}
              </button>
            ))}
          </div>
        </header>

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex overflow-hidden min-h-0">

          {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
          <aside className={`
            ${ui.showPanel === "list" ? "flex" : "hidden"} sm:flex
            w-full sm:w-[260px] lg:w-[280px] flex-col border-r border-gray-100
            bg-gray-50/60
          `}>
            {/* Search */}
            <div className="p-3 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="relative">
                <FontAwesomeIcon icon={faMagnifyingGlass}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[11px]" />
                <input
                  type="text"
                  placeholder="Search reports…"
                  value={ui.reportQuery}
                  onChange={e => updateUi({ reportQuery: e.target.value })}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:border-transparent ${ring} transition`}
                />
                {ui.reportQuery && (
                  <button onClick={() => updateUi({ reportQuery: "" })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                    <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                  </button>
                )}
              </div>
            </div>

            {/* Report list */}
            <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
              {isInitialLoading ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <FontAwesomeIcon icon={faCircleNotch} spin className="text-gray-300 text-xl" />
                  <p className="text-[10px] text-gray-400">Loading reports…</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <FontAwesomeIcon icon={faFileAlt} className="text-gray-200 text-2xl" />
                  <p className="text-[10px] text-gray-400">No reports found</p>
                </div>
              ) : filteredReports.map((r) => {
                const isSelected = ui.selected.id === r.reportId;
                return (
                  <button key={r.reportId}
                    onClick={() => {
                      updateUi({ selected: { id: r.reportId, name: r.reportName }, showPanel: "form" });
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all group flex items-center justify-between gap-2 ${
                      isSelected
                        ? `${selBg} text-white shadow-md`
                        : "hover:bg-white bg-transparent text-gray-700 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? "bg-white/60" : "bg-gray-300 group-hover:bg-gray-400"}`} />
                      <span className="font-medium truncate leading-tight">{r.reportName}</span>
                    </div>
                    {r.export === "Y" && (
                      <FontAwesomeIcon icon={faDownload}
                        className={`flex-shrink-0 text-[10px] ${isSelected ? "text-white/70" : "text-emerald-400"}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar footer */}
            {filteredReports.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-100 flex-shrink-0">
                <p className="text-[9px] text-gray-300 text-center tracking-wide">
                  {filteredReports.length} of {data?.list?.length || 0} reports
                </p>
              </div>
            )}
          </aside>

          {/* ── FILTER FORM ─────────────────────────────────────────────── */}
          <section className={`
            ${ui.showPanel === "form" ? "flex" : "hidden"} sm:flex
            flex-1 flex-col min-w-0 overflow-x-hidden bg-white
          `}>
            {ui.selected.id === 0 ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                <div className={`w-16 h-16 ${bgLight} rounded-2xl flex items-center justify-center`}>
                  <FontAwesomeIcon icon={faFileAlt} className={`text-2xl ${textCls}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Select a Report</p>
                  <p className="text-xs text-gray-400 mt-1">Choose a report from the list to configure and generate it.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Form header */}
                <div className={`flex-shrink-0 px-5 py-3 border-b border-gray-100 ${bgLight} flex items-center justify-between gap-3`}>
                  <div className="min-w-0">
                    <p className="text-[9px] tracking-widest text-gray-400 uppercase font-semibold leading-none mb-0.5">Selected Report</p>
                    <h3 className={`text-sm font-bold ${textCls} truncate`}>{ui.selected.name}</h3>
                  </div>
                  {isExport && (
                    <span className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border border-emerald-200">
                      <FontAwesomeIcon icon={faFileExcel} />
                      Excel Export
                    </span>
                  )}
                  {!isExport && ui.selected.id > 0 && (
                    <span className="flex-shrink-0 flex items-center gap-1.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider border border-blue-200">
                      <FontAwesomeIcon icon={faPrint} />
                      Print Report
                    </span>
                  )}
                </div>

                {/* Scrollable filter area */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <div className="grid gap-y-3 gap-x-4"
                         style={{ gridTemplateColumns: "6rem 1fr" }}>

                      {/* Branch */}
                      <LookupField
                        label="Branch"
                        value={filters.branchName}
                        placeholder="Select Branch…"
                        onOpen={() => updateUi({ branchModal: true })}
                        ring={ring} btnClass={btnCls}
                      />

                      {/* BIR: Cutoff range */}
                      {config.hasCutoff && (<>
                        <LookupField label="Start Cutoff" value={filters.sCutOffName || filters.sCutOff}
                          placeholder="Select Starting Cutoff…"
                          onOpen={() => updateUi({ cutoffLookupMode: "S", cutoffModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="End Cutoff" value={filters.eCutOffName || filters.eCutOff}
                          placeholder="Select Ending Cutoff…"
                          onOpen={() => updateUi({ cutoffLookupMode: "E", cutoffModal: true })}
                          ring={ring} btnClass={btnCls} />
                      </>)}

                      {/* BIR: Report type */}
                      {config.hasReportType && (
                        <>
                          <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
                            Format
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                              <FontAwesomeIcon icon={getReportTypeIcon(filters.reportType)} />
                            </span>
                            <select value={filters.reportType}
                              onChange={e => updateFilters({ reportType: e.target.value })}
                              className={`w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-xs bg-gray-50 outline-none appearance-none focus:ring-2 focus:border-transparent transition ${ring}`}>
                              <option value="TEXT">Text File (.txt)</option>
                              <option value="CSV">CSV File (.csv)</option>
                              <option value="EXCEL">Excel File (.xlsx)</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                              <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                            </span>
                          </div>
                        </>
                      )}

                      {/* Date range */}
                      {!config.hasCutoff && (
                        <DateRangeField
                          startDate={filters.startDate} endDate={filters.endDate}
                          onStartChange={v => updateFilters({ startDate: v })}
                          onEndChange={v => updateFilters({ endDate: v })}
                          ring={ring}
                        />
                      )}

                      {/* Budget fields */}
                      {config.hasBudget && (<>
                        <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
                          Budget Year
                        </label>
                        <input
                          type="number"
                          value={filters.budgetYear}
                          onChange={e => updateFilters({ budgetYear: e.target.value })}
                          className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
                          placeholder="YYYY"
                        />

                        <LookupField label="Cutoff" value={filters.cutoffName || filters.cutoffCode}
                          placeholder="Select Cutoff…"
                          onOpen={() => updateUi({ cutoffLookupMode: "BUD", cutoffModal: true })}
                          ring={ring} btnClass={btnCls} />

                        <LookupField label="Budget Code" value={filters.budgetName || filters.budgetCode}
                          placeholder="Select Budget Code…"
                          onOpen={() => updateUi({ budgetItemModal: true })}
                          ring={ring} btnClass={btnCls} />

                        <LookupField label="Account" value={filters.acctName || filters.acctCode}
                          placeholder="Select Account…"
                          onOpen={() => updateUi({ budgetAccountModal: true })}
                          ring={ring} btnClass={btnCls} />

                        <LookupField label={config.rcLabel || "Department/RC"} value={filters.rcName || filters.rcCode}
                          placeholder={`Select ${config.rcLabel || "Department/RC"}…`}
                          onOpen={() => updateUi({ rcLookupMode: "SINGLE", rcModal: true })}
                          ring={ring} btnClass={btnCls} />

                        <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
                          Group By
                        </label>
                        <select
                          value={filters.groupBy}
                          onChange={e => updateFilters({ groupBy: e.target.value })}
                          className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
                        >
                          <option value="ACCOUNT_RC">Account per RC</option>
                          <option value="ACCOUNT">Per Account</option>
                          <option value="RC">Per RC</option>
                        </select>

                        <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase self-center">
                          Monthly View
                        </label>
                        <select
                          value={filters.monthlyView}
                          onChange={e => updateFilters({ monthlyView: e.target.value })}
                          className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 outline-none transition focus:ring-2 focus:border-transparent ${ring}`}
                        >
                          <option value="BUDGET">Budget</option>
                          <option value="ACTUAL">Actual</option>
                          <option value="VARIANCE">Variance</option>
                          <option value="USED_PCT">% Used</option>
                        </select>
                      </>)}

                      {/* Sales */}
                      {config.hasSales && (<>
                        <LookupField label="Customer"
                          value={filters.custName || filters.custCode}
                          placeholder="Select Customer..."
                          onOpen={() => updateUi({ salesCustomerModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Chain Customer"
                          value={filters.chainCustomerName || filters.chainCustomer}
                          placeholder="Select Chain Customer..."
                          onOpen={() => updateUi({ salesChainModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Item"
                          value={filters.itemName || filters.itemCode}
                          placeholder="Select Item..."
                          onOpen={() => updateUi({ salesItemModal: true })}
                          ring={ring} btnClass={btnCls} />
                      </>)}

                      {/* Main lookup: single or range */}
                      {!config.hasCutoff && !config.hasInventory && !config.hasFA && !config.hasSales && !config.hasBudget && (
                        config.hasSingleMain ? (
                          <LookupField label={config.label}
                            value={filters.sName} placeholder={`Select ${config.label}…`}
                            onOpen={() => updateUi({ lookupMode: "S", mainLookup: true })}
                            ring={ring} btnClass={btnCls} />
                        ) : (
                          ["s", "e"].map(dir => (
                            <LookupField key={dir}
                              label={`${dir === "s" ? "Start" : "End"} ${config.label}`}
                              value={filters[`${dir}Name`]} placeholder={`Select ${config.label}…`}
                              onOpen={() => updateUi({ lookupMode: dir.toUpperCase(), mainLookup: true })}
                              ring={ring} btnClass={btnCls} />
                          ))
                        )
                      )}

                      {/* Fixed Assets fields */}
                      {config.hasFA && (<>
                        <LookupField label="Category" value={filters.categName || filters.categCode}
                          placeholder="Select Category..."
                          onOpen={() => updateUi({ faCategoryModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Sub Category" value={filters.className || filters.classCode}
                          placeholder="Select Sub Category..."
                          onOpen={() => {
                            if (!filters.categCode) {
                              Swal.fire("Sub Category", "Please select a Category first.", "info");
                              return;
                            }
                            updateUi({ faClassModal: true });
                          }}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label={config.rcLabel || "Department/RC"} value={filters.rcName || filters.rcCode}
                          placeholder={`Select ${config.rcLabel || "Department/RC"}...`}
                          onOpen={() => updateUi({ rcLookupMode: "SINGLE", rcModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Location" value={filters.locName || filters.locCode}
                          placeholder="Select Location..."
                          onOpen={() => updateUi({ faLocationModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Asset" value={filters.faName || filters.faCode}
                          placeholder="Select Fixed Asset..."
                          onOpen={openFAAssetLookup}
                          ring={ring} btnClass={btnCls} />
                      </>)}

                      {/* Inventory fields */}
                      {config.hasInventory && !config.hasSales && (<>
                        <LookupField label="Item Code" value={filters.sName || filters.sCode}
                          placeholder="Select Item…"
                          onOpen={() => updateUi({ lookupMode: "S", mainLookup: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Warehouse" value={filters.whName || filters.whCode}
                          placeholder="Select Warehouse…"
                          onOpen={() => updateUi({ warehouseModal: true })}
                          ring={ring} btnClass={btnCls} />
                        <LookupField label="Location" value={filters.locName || filters.locCode}
                          placeholder="Select Location…"
                          onOpen={() => updateUi({ locationModal: true })}
                          ring={ring} btnClass={btnCls} />
                      </>)}

                      {/* PUR: single RC/Dept */}
                      {config.hasSingleRc && !config.hasFA && !config.hasBudget && (
                        <LookupField label={config.rcLabel || "Dept/RC"}
                          value={filters.rcName} placeholder={`Select ${config.rcLabel || "Dept/RC"}…`}
                          onOpen={() => updateUi({ rcLookupMode: "SINGLE", rcModal: true })}
                          ring={ring} btnClass={btnCls} />
                      )}

                      {/* GL: SL + RC ranges */}
                      {config.hasExtra && (<>
                        {/* Divider */}
                        {/* <div className="col-span-2 pt-1">
                          <p className="text-[9px] tracking-widest text-gray-300 uppercase font-semibold border-t border-gray-100 pt-3">
                            Subsidiary Ledger
                          </p>
                        </div> */}
                        <LookupField label="Start SL" value={filters.sSlName} placeholder="Select Starting SL…"
                          onOpen={() => updateUi({ slLookupMode: "S", slModal: true })} ring={ring} btnClass={btnCls} />
                        <LookupField label="End SL" value={filters.eSlName} placeholder="Select Ending SL…"
                          onOpen={() => updateUi({ slLookupMode: "E", slModal: true })} ring={ring} btnClass={btnCls} />

                        {/* <div className="col-span-2">
                          <p className="text-[9px] tracking-widest text-gray-300 uppercase font-semibold border-t border-gray-100 pt-3">
                            Responsibility Center
                          </p>
                        </div> */}
                        <LookupField label="Start RC" value={filters.sRcName} placeholder="Select Starting RC…"
                          onOpen={() => updateUi({ rcLookupMode: "S", rcModal: true })} ring={ring} btnClass={btnCls} />
                        <LookupField label="End RC" value={filters.eRcName} placeholder="Select Ending RC…"
                          onOpen={() => updateUi({ rcLookupMode: "E", rcModal: true })} ring={ring} btnClass={btnCls} />
                      </>)}

                    </div>
                  </div>
                </div>

                {/* ── ACTION FOOTER ──────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
                  <button onClick={clearFilters}
                    className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 active:scale-95">
                    <FontAwesomeIcon icon={faBroom} />
                    Clear
                  </button>

                  <button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending || !ui.selected.id}
                    className={`
                      flex items-center gap-2 ${btnCls} text-white
                      px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg
                      transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                    `}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <FontAwesomeIcon icon={faCircleNotch} spin />
                        <span>Generating…</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={isExport ? faDownload : faPrint} />
                        <span>{isExport ? "Download Report" : "Generate Report"}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </section>
        </main>

        {/* Global loading overlay */}
        {(isInitialLoading || generateMutation.isPending) && <LoadingSpinner />}
      </div>

      {/* ── LOOKUP MODALS ─────────────────────────────────────────────────── */}
      {ui.branchModal && (
        <BranchLookupModal isOpen onClose={p => {
          if (p?.branchCode) updateFilters({ branchCode: p.branchCode, branchName: p.branchName });
          updateUi({ branchModal: false });
        }} />
      )}

      {ui.salesCustomerModal && (
        <CustomerMastLookupModal
          isOpen={ui.salesCustomerModal}
          customParam="ActiveAll"
          onClose={p => {
            if (p) updateFilters({ custCode: p.custCode || "", custName: p.custName || "" });
            updateUi({ salesCustomerModal: false });
          }}
        />
      )}

      {ui.salesChainModal && (
        <CustomerMastLookupModal
          isOpen={ui.salesChainModal}
          customParam="ActiveChain"
          onClose={p => {
            if (p) updateFilters({ chainCustomer: p.custCode || "", chainCustomerName: p.custName || "" });
            updateUi({ salesChainModal: false });
          }}
        />
      )}

      {ui.salesItemModal && (
        <ItemMastLookupModal
          isOpen={ui.salesItemModal}
          endpoint="getInvLookupFG"
          docType="SO"
          customParam="ActiveAll"
          onClose={p => {
            const row = Array.isArray(p?.records) ? p.records[0] : p?.records || p;
            if (row) {
              updateFilters({
                itemCode: row.itemCode || row.itemNo || row.code || "",
                itemName: row.itemName || row.description || row.name || "",
              });
            }
            updateUi({ salesItemModal: false });
          }}
        />
      )}

      {!config.hasCutoff && ui.mainLookup && MainLookupModal && (
        <MainLookupModal isOpen onClose={p => {
          if (p) {
            const code = p.payeeCode || p.vendCode || p.custCode || p.acctCode || p.itemCode || "";
            const name = p.payeeName || p.vendName || p.custName || p.acctName || p.itemName || "";
            if (ui.lookupMode === "S") updateFilters({ sCode: code, sName: name, eCode: code, eName: name });
            else updateFilters({ eCode: code, eName: name });
          }
          updateUi({ mainLookup: false });
        }} />
      )}

      {config.hasFA && ui.faCategoryModal && (
        <SearchFACateg isOpen={ui.faCategoryModal} onClose={p => {
          if (p) {
            const code = p.code || p.categCode || "";
            const name = p.description || p.categName || p.code || "";
            updateFilters({ categCode: code, categName: name, classCode: "", className: "", faCode: "", faName: "" });
          }
          updateUi({ faCategoryModal: false });
        }} />
      )}

      {config.hasFA && ui.faClassModal && (
        <SearchFAClass isOpen={ui.faClassModal} categCode={filters.categCode || ""} onClose={p => {
          if (p) {
            updateFilters({
              classCode: p.code || p.classCode || "",
              className: p.description || p.className || p.code || "",
              categCode: p.categCode || filters.categCode || "",
              faCode: "",
              faName: "",
            });
          }
          updateUi({ faClassModal: false });
        }} />
      )}

      {config.hasFA && ui.faLocationModal && (
        <SearchFALoc isOpen={ui.faLocationModal} branchCode={filters.branchCode} onClose={p => {
          if (p) updateFilters({ locCode: p.flocCode || p.code || "", locName: p.flocName || p.description || p.code || "", faCode: "", faName: "" });
          updateUi({ faLocationModal: false });
        }} />
      )}

      {config.hasFA && ui.faAssetModal && (
        <GlobalLookupModalv1
          isOpen={ui.faAssetModal}
          title="Fixed Asset Master"
          data={ui.faAssetRows}
          endpoint={ui.faAssetColumns}
          btnCaption="Select Asset"
          idKey="groupId"
          singleSelect
          onClose={selectedItems => {
            const records = selectedItems?.records;
            const row = Array.isArray(records) ? records[0] : records;
            if (row) {
              updateFilters({
                faCode: row.faCode || row.FA_CODE || "",
                faName: row.faName || row.assetDescription || row.FA_NAME || row.description || row.faCode || "",
              });
            }
            updateUi({ faAssetModal: false, faAssetRows: [], faAssetColumns: [] });
          }}
          onCancel={() => updateUi({ faAssetModal: false, faAssetRows: [], faAssetColumns: [] })}
        />
      )}


      {config.hasBudget && ui.budgetItemModal && (
        <SearchBudItemRef isOpen={ui.budgetItemModal} customParam="NonGroup" onClose={p => {
          if (p) {
            updateFilters({
              budgetCode: p.budgetCode || p.code || "",
              budgetName: p.budgetName || p.description || p.name || p.budgetCode || p.code || "",
            });
          }
          updateUi({ budgetItemModal: false });
        }} />
      )}

      {config.hasBudget && ui.budgetAccountModal && (
        <COAMastLookupModal isOpen onClose={p => {
          if (p) {
            updateFilters({
              acctCode: p.acctCode || p.code || "",
              acctName: p.acctName || p.description || p.name || p.acctCode || p.code || "",
            });
          }
          updateUi({ budgetAccountModal: false });
        }} />
      )}

      {ui.cutoffModal && (
        <CutoffLookupModal isOpen onClose={p => {
          if (p) {
            if (ui.cutoffLookupMode === "BUD")
              updateFilters({ cutoffCode: p.cutoffCode||"", cutoffName: p.cutoffName||"" });
            else if (ui.cutoffLookupMode === "S")
              updateFilters({ sCutOff: p.cutoffCode||"", sCutOffName: p.cutoffName||"", eCutOff: p.cutoffCode||"", eCutOffName: p.cutoffName||"" });
            else
              updateFilters({ eCutOff: p.cutoffCode||"", eCutOffName: p.cutoffName||"" });
          }
          updateUi({ cutoffModal: false });
        }} />
      )}

      {ui.slModal && (
        <SLMastLookupModal isOpen onClose={p => {
          if (p) {
            if (ui.slLookupMode === "S") updateFilters({ sSlCode: p.slCode||"", sSlName: p.slName||"", eSlCode: p.slCode||"", eSlName: p.slName||"" });
            else updateFilters({ eSlCode: p.slCode||"", eSlName: p.slName||"" });
          }
          updateUi({ slModal: false });
        }} />
      )}

      {ui.rcModal && (
        <RCLookupModal isOpen onClose={p => {
          if (p) {
            if (ui.rcLookupMode === "SINGLE") updateFilters({ rcCode: p.rcCode||"", rcName: p.rcName||"" });
            else if (ui.rcLookupMode === "S") updateFilters({ sRcCode: p.rcCode||"", sRcName: p.rcName||"", eRcCode: p.rcCode||"", eRcName: p.rcName||"" });
            else updateFilters({ eRcCode: p.rcCode||"", eRcName: p.rcName||"" });
          }
          updateUi({ rcModal: false });
        }} />
      )}

      {config.hasInventory && ui.warehouseModal && (
        <WarehouseLookupModal isOpen onClose={p => {
          if (p) updateFilters({ whCode: p.whCode||"", whName: p.whName||"", locCode: "", locName: "" });
          updateUi({ warehouseModal: false });
        }} branchCode={filters.branchCode || ""} />
      )}

      {config.hasInventory && ui.locationModal && (
        <LocationLookupModal isOpen whCode={filters.whCode} onClose={p => {
          if (p) updateFilters({ locCode: p.locCode||"", locName: p.locName||"", whCode: p.whCode||filters.whCode });
          updateUi({ locationModal: false });
        }} />
      )}
    </div>
  );
};

export default UniversalReportModal;
