// // import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
// // import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// // import {
// //   faFileLines,
// //   faMagnifyingGlass,
// //   faPrint,
// //   faFileExport,
// //   faInfoCircle,
// //   faUser,
// //   faCalendarAlt,
// //   faChevronDown,
// //   faFileExcel,
// //   faNoteSticky,
// //   faUndo,
// //   faDatabase,
// // } from "@fortawesome/free-solid-svg-icons";

// // import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// // import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// // import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
// // import {exportGenericHistoryExcel} from "@/NAYSA Cloud/Global/report";
// // import {
// //   useTopCompanyRow,
// //   useTopUserRow,
// //   useTopBranchRow,
// // } from "@/NAYSA Cloud/Global/top1RefTable";
// // import { export1601EQReportExcel, export1604EReportExcel } from "@/NAYSA Cloud/Global/birReport";
// // import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
// // import { formatNumber, parseFormattedNumber } from "@/NAYSA Cloud/Global/behavior.jsx";
// // import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
// // import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
// // import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
// // import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";

// // const ENDPOINT = "getEWTInquiry";
// // const ENDPOINT_Att = "getEWTAtt";

// // export default function EWTINQ() {
// //    const { user,companyInfo, currentUserRow, refsLoaded, refsLoading } = useAuth();

// //   // ----- Layout (fixed header bar) -----
// //   const barRef = useRef(null);
// //   const [headerH, setHeaderH] = useState(48);
// //   const [barH, setBarH] = useState(48);

// //   useLayoutEffect(() => {
// //     if (typeof window === "undefined") return;

// //     const header =
// //       document.querySelector("#appHeader") ||
// //       document.querySelector(".global-app-topbar") ||
// //       document.querySelector("header[role='banner']") ||
// //       document.querySelector("header");

// //     const remeasure = () => {
// //       if (header) {
// //         const rect = header.getBoundingClientRect();
// //         setHeaderH(Math.max(0, Math.round(rect.height)));
// //       }
// //       if (barRef.current) {
// //         const rect = barRef.current.getBoundingClientRect();
// //         setBarH(Math.max(0, Math.round(rect.height)));
// //       }
// //     };

// //     remeasure();
// //     window.addEventListener("resize", remeasure);
// //     const a = requestAnimationFrame(remeasure);
// //     const b = requestAnimationFrame(remeasure);
// //     return () => {
// //       window.removeEventListener("resize", remeasure);
// //       cancelAnimationFrame(a);
// //       cancelAnimationFrame(b);
// //     };
// //   }, []);

// //   // ----- App state -----
// //   const [state, setState] = useState({
// //     branchCode: "",
// //     branchName: "",
// //     vendCode: "",
// //     vendName: "",
// //     startingCutoff: "",
// //     startingCutoffName: "",
// //     endingCutoff: "",
// //     endingCutoffName: "",
// //     rows: [],
// //     originalRows: [], 
// //     rows_Att: [],
// //     cols: [],
// //     cols_Att: [],
// //     tbl1601EQ_dat: [],
// //     tbl1604E_dat: [],
// //     tbl1601EQ_att: [],
// //     tbl1604E_att: [],
// //     tbl1601EQ_fileName: "",
// //     tbl1604E_fileName: "",
// //     baseAmount: "0.00",
// //     atcAmount: "0.00",
// //     showBranchModal: false,
// //     showPayeeModal: false,
// //     showCutoffModal: false,
// //     cutoffModalType: "",
// //     isLoading: false,
// //     showSpinner: false,
// //     guideOpen: false,

// //     // dropdown menus
// //     showExportMenu: false,
// //     showGenerateMenu: false,
// //   });

// //   const updateState = (u) => setState((p) => ({ ...p, ...u }));
// //   const {
// //     branchCode,
// //     branchName,
// //     vendCode,
// //     vendName,
// //     startingCutoff,
// //     startingCutoffName,
// //     endingCutoff,
// //     endingCutoffName,
// //     rows,
// //     originalRows,
// //     rows_Att,
// //     cols,
// //     cols_Att,
// //     tbl1601EQ_dat,
// //     tbl1604E_dat,
// //     tbl1601EQ_att,
// //     tbl1604E_att,
// //     tbl1601EQ_fileName,
// //     tbl1604E_fileName,
// //     baseAmount,
// //     atcAmount,
// //     showBranchModal,
// //     showPayeeModal,
// //     showCutoffModal,
// //     cutoffModalType,
// //     isLoading,
// //     showSpinner,
// //     guideOpen,
// //     showExportMenu,
// //     showGenerateMenu,
// //   } = state;

// //   // Table ref (no persisted state)
// //   const tableRef = useRef(null);

// //   // Spinner smoothing
// //   useEffect(() => {
// //     let t;
// //     if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
// //     else updateState({ showSpinner: false });
// //     return () => clearTimeout(t);
// //   }, [isLoading]);

// //   // Close menus when clicking outside
// //   const exportMenuRef = useRef(null);
// //   const generateMenuRef = useRef(null);
// //   useEffect(() => {
// //     const onDocClick = (e) => {
// //       if (
// //         exportMenuRef.current &&
// //         !exportMenuRef.current.contains(e.target) &&
// //         showExportMenu
// //       ) {
// //         updateState({ showExportMenu: false });
// //       }
// //       if (
// //         generateMenuRef.current &&
// //         !generateMenuRef.current.contains(e.target) &&
// //         showGenerateMenu
// //       ) {
// //         updateState({ showGenerateMenu: false });
// //       }
// //     };
// //     document.addEventListener("mousedown", onDocClick);
// //     return () => document.removeEventListener("mousedown", onDocClick);
// //   }, [showExportMenu, showGenerateMenu]);

// //   // Load column config once
// //   const loadedColsRef = useRef(false);
// //   useEffect(() => {
// //     if (loadedColsRef.current) return;
// //     let alive = true;
// //     (async () => {
// //       try {
// //         const result = await useSelectedHSColConfig(ENDPOINT);
// //         const resultAtt = await useSelectedHSColConfig(ENDPOINT_Att);

// //         if (!alive || !Array.isArray(result)) return;
// //         setState((prev) => ({ ...prev, cols: result.map((c) => ({ ...c })) }));
// //         setState((prev) => ({ ...prev, cols_Att: resultAtt.map((c) => ({ ...c })) }));
// //         loadedColsRef.current = true;
// //       } catch (e) {
// //         console.error("Load column config failed:", e);
// //       }
// //     })();
// //     return () => {
// //       alive = false;
// //     };
// //   }, []);

// //   // Defaults (company + user/branch)
// //   const loadDefaults = useCallback(async () => {
// //     updateState({ showSpinner: true });
// //     try {
// //       const [hsCompany, hsUser] = await Promise.all([
// //         useTopCompanyRow(),
// //         useTopUserRow(user?.USER_CODE),
// //       ]);
// //       if (hsCompany) {
// //         updateState({
// //           startingCutoff: hsCompany.cutoffCode,
// //           startingCutoffName: hsCompany.cutoffName,
// //           endingCutoff: hsCompany.cutoffCode,
// //           endingCutoffName: hsCompany.cutoffName,
// //         });
// //       }
// //       if (hsUser) {
// //         const hsBranch = await useTopBranchRow(hsUser.branchCode);
// //         updateState({
// //           branchCode: hsUser.branchCode,
// //           branchName: hsBranch?.branchName || hsUser.branchName,
// //         });
// //       }
// //     } catch (err) {
// //       console.error("Error loading defaults:", err);
// //     } finally {
// //       updateState({ showSpinner: false });
// //     }
// //   }, [user?.USER_CODE]);



// //   const handleReset = useCallback(() => {
// //     updateState({
// //       vendCode: "",
// //       vendName: "",
// //       rows: [],
// //       originalRows: [], 
// //       rows_Att:[],
// //       tbl1601EQ_dat: [],
// //       tbl1604E_dat: [],
// //       tbl1601EQ_att: [],
// //       tbl1604E_att: [],
// //       baseAmount: "0.00",
// //       atcAmount: "0.00",
// //     });
// //   }, []);

  
// //   function useNormalizeDat(data) {
// //   return data
// //     .map(row => Object.values(row).join(""))
// //     .join("\r\n");
// // }




// //   // Compute summary totals
// //   const computeTotals = useCallback((list = []) => {
// //     if (!Array.isArray(list) || list.length === 0) {
// //       updateState({
// //         atcAmount: "0.00",
// //         baseAmount: "0.00",
// //       });
// //       return;
// //     }
// //     const acc = list.reduce(
// //       (a, r) => {
// //         a.atcAmount += parseFormattedNumber(r.atcAmt) || 0;
// //         a.baseAmount += parseFormattedNumber(r.baseAmt) || 0;
// //         return a;
// //       },
// //       { atcAmount: 0, baseAmount: 0 }
// //     );
// //     updateState({
// //       atcAmount: formatNumber(acc.atcAmount),
// //       baseAmount: formatNumber(acc.baseAmount),
// //     });
// //   }, []);




// //   // Find: load rows
// //   const doFind = useCallback(async () => {
// //     updateState({ isLoading: true });
// //     try {
// //       const resp = await fetchData(ENDPOINT, {
// //         json_data: { json_data: { branchCode, vendCode, startingCutoff, endingCutoff } },
// //       });

// //       const parsed = resp?.data?.[0]?.result ? JSON.parse(resp.data[0].result) : [];
// //       const dt1 = parsed?.[0]?.dt1 ?? [];
// //       const dtF1601EQ = parsed?.[0]?.dtF1601EQ ?? [];
// //       const dtF1604E = parsed?.[0]?.dtF1604E ?? [];
// //       const dtF1601EQ_att = parsed?.[0]?.f1601EQ_att ?? [];
// //       const dtF1604E_att = parsed?.[0]?.f1604E_att ?? [];
// //       const rowsAttData = Array.isArray(dtF1601EQ_att) && dtF1601EQ_att.length > 0
// //             ? dtF1601EQ_att[0].data
// //             : [];

// //       updateState({
// //         rows: Array.isArray(dt1) ? dt1 : [],
// //         originalRows: Array.isArray(dt1) ? dt1 : [], // <-- Save the original data
// //         rows_Att: rowsAttData,
// //         tbl1601EQ_dat: Array.isArray(dtF1601EQ) ? dtF1601EQ : [],
// //         tbl1604E_dat: Array.isArray(dtF1604E) ? dtF1604E : [],
// //         tbl1601EQ_att: Array.isArray(dtF1601EQ_att) ? dtF1601EQ_att : [],
// //         tbl1604E_att: Array.isArray(dtF1604E_att) ? dtF1604E_att : [],
// //         tbl1601EQ_fileName: parsed?.[0]?.f1601EQ_name || "",
// //         tbl1604E_fileName: parsed?.[0]?.f1604E_name || "",
// //       });

// //       computeTotals(dt1);
// //     } catch (e) {
// //       console.error("Find failed:", e);
// //     } finally {
// //       updateState({ isLoading: false });
// //     }
// //   }, [branchCode, vendCode, startingCutoff, endingCutoff, computeTotals]);




// //   // Initial defaults (no persisted state)
// //   useEffect(() => {
// //     if (!user?.USER_CODE) return;
// //     (async () => {
// //       await loadDefaults();
// //       await handleReset();
// //     })();
// //   }, [user?.USER_CODE, loadDefaults, handleReset]);




// // const handleViewTop = useCallback((row) => {
// //       const filteredRows = originalRows.filter(
// //         (r) => r.vendCode === row.vendCode
// //       );
// //     updateState({ 
// //       vendName: row.corpName, 
// //       vendCode: row.vendCode, 
// //       rows: filteredRows 
// //     });  
// //      computeTotals(filteredRows); 
// //   }, [originalRows, computeTotals]);



// //   // Export (base "Export Query")
// //   const doExport = useCallback(async () => {
// //     if (!Array.isArray(rows) || rows.length === 0) return;
// //     try {
// //       updateState({ isLoading: true });
     
     

// //         const exportData = {
// //         "Data" : {
// //           "EWT Inquiry Detailed" : rows,
// //           "EWT Inquiry Summary" : rows_Att
// //         }
// //       }

// //       const columnConfigsMap = {
// //           "EWT Inquiry Detailed" : cols,
// //           "EWT Inquiry Summary" : cols_Att
// //         }
      
// //       const payload = {
// //         ReportName: "EWT Inquiry Report",
// //         UserCode: currentUserRow?.userName,
// //         Branch: branchCode || "",
// //         JsonData: exportData,
// //         companyName:companyInfo?.compName,
// //         companyAddress:companyInfo?.compAddr,
// //         companyTelNo:companyInfo?.telNo
// //       };
    

// //       await exportGenericHistoryExcel(payload, columnConfigsMap);






// //     } catch (e) {
// //       console.error("Export failed:", e);
// //     } finally {
// //       updateState({ isLoading: false });
// //     }
// //   }, [rows, cols, branchCode, user?.USER_CODE]);

// //   // Export attachments
// //   const doExportAttachment = useCallback(
// //     async (kind /* '1601EQ' | '1604E' */) => {
// //       if (!Array.isArray(rows) || rows.length === 0) return;

// //       try {
// //         updateState({ isLoading: true });

// //         const tblAtt = kind === "1601EQ" ? tbl1601EQ_att : tbl1604E_att;
// //         if (!tblAtt || tblAtt.length === 0) {
// //           console.warn(`No attachment data for ${kind}`);
// //           return;
// //         }

// //         const first = tblAtt[0];
// //         const payload = {
// //           title: first.title,
// //           periodText: first.periodText,
// //           tin: first.tin,
// //           agentName: first.agentName,
// //           fileName: first.fileName,
// //           data: first.data,
// //         };

// //         if (kind === "1601EQ") {
// //           export1601EQReportExcel("1601EQ", payload, { slice8to11: false });
// //         } else {
// //           export1604EReportExcel("1604E", payload, { slice8to11: false });
// //         }
// //       } catch (e) {
// //         console.error(`Export ${kind} attachment failed:`, e);
// //       } finally {
// //         updateState({ isLoading: false, showExportMenu: false });
// //       }
// //     },
// //     [rows, tbl1601EQ_att, tbl1604E_att]
// //   );




// //   const doGenerate = useCallback(
// //     (kind /* '1601EQ' | '1604E' */) => {
// //       if (!Array.isArray(rows) || rows.length === 0) return;

// //       try {
// //         updateState({ isLoading: true });

// //         const src = kind === "1601EQ" ? tbl1601EQ_dat : tbl1604E_dat;
// //         const filename = kind === "1601EQ" ? tbl1601EQ_fileName : tbl1604E_fileName;
// //         const datText = useNormalizeDat(src).trim();

// //         if (typeof useDownloadTextFile === "function") {
// //           useDownloadTextFile(filename, datText);
// //         } else {
// //           const blob = new Blob([datText], { type: "text/plain;charset=utf-8" });
// //           const url = URL.createObjectURL(blob);
// //           const a = document.createElement("a");
// //           a.href = url;
// //           a.download = filename;
// //           document.body.appendChild(a);
// //           a.click();
// //           a.remove();
// //           URL.revokeObjectURL(url);
// //         }
// //       } catch (err) {
// //         console.error(`Download ${kind} failed:`, err);
// //         alert(`Failed to download ${kind} file.`);
// //       } finally {
// //         updateState({ isLoading: false, showGenerateMenu: false });
// //       }
// //     },
// //     [rows, tbl1601EQ_dat, tbl1604E_dat, tbl1601EQ_fileName, tbl1604E_fileName]
// //   );

// //   // ----- Action handlers (inline ActionBar) -----
// //   const onAction = (id) => {
// //     switch (id) {
// //       case "find":
// //         return doFind();
// //       case "reset":
// //         return handleReset();
// //       case "print":
// //         return window.print();
// //       case "export-query":
// //         return doExport();
// //       case "export-1601eq-att":
// //         return doExportAttachment("1601EQ");
// //       case "export-1604e-att":
// //         return doExportAttachment("1604E");
// //       case "gen-1601eq":
// //         return doGenerate("1601EQ");
// //       case "gen-1604e":
// //         return doGenerate("1604E");
// //       case "guide":
// //         return updateState({
// //           guideOpen: !guideOpen,
// //           showExportMenu: false,
// //           showGenerateMenu: false,
// //         });
// //       case "pdf":
// //         return window.open("/public/NAYSA EWT Inquiry.pdf", "_blank");
// //       default:
// //         return;
// //     }
// //   };






// //   // ----- Render -----
// //   return (
// //     <div className="global-tran-main-div-ui">
// //       {showSpinner && <LoadingSpinner />}

// //       {/* spacer below fixed bar */}
// //       <div style={{ height: barH }} />

// //       {/* Fixed header bar */}
// //       <div
// //         ref={barRef}
// //         className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur supports-backdrop-blur:bg-white/80 border-b shadow-sm"
// //         style={{ top: headerH }}
// //       >
// //         <div className="flex justify-between items-center px-6 py-2">
// //           {/* Single "tab" label */}
// //           <div className="flex flex-row gap-2">
// //             <span className="flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
// //               <FontAwesomeIcon icon={faDatabase } className="w-4 h-4 mr-2" />
// //               Expanded Witholding Tax Query
// //             </span>
// //           </div>

// //           {/* Inline ActionBar */}
// //           <div className="flex flex-wrap items-center justify-end gap-1 lg:gap-2">
// //             <button
// //               onClick={() => onAction("find")}
// //               className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
// //             >
// //               <FontAwesomeIcon icon={faMagnifyingGlass} />{" "}
// //               <span className="hidden lg:inline ml-2">Find</span>
// //             </button>

// //             <button
// //               onClick={() => onAction("reset")}
// //               className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
// //             >
// //               <FontAwesomeIcon icon={faUndo} />{" "}
// //               <span className="hidden lg:inline ml-2">Reset</span>
// //             </button>

// //             <button
// //               onClick={() => onAction("print")}
// //               className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
// //             >
// //               <FontAwesomeIcon icon={faPrint} />{" "}
// //               <span className="hidden lg:inline ml-2">Print</span>
// //             </button>

// //             {/* EXPORT: dropdown */}
// //             <div className="relative" ref={exportMenuRef}>
// //               <button
// //                 onClick={() =>
// //                   updateState({
// //                     showExportMenu: !showExportMenu,
// //                     showGenerateMenu: false,
// //                     guideOpen: false,
// //                   })
// //                 }
// //                 className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
// //               >
// //                 <FontAwesomeIcon icon={faFileExport} />
// //                 <span className="hidden lg:inline ml-2">Export</span>
// //                 <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
// //               </button>

// //               {showExportMenu && (
// //                 <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600 z-50">
// //                   <button
// //                     onClick={() => onAction("export-query")}
// //                     className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
// //                   >
// //                     <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
// //                     <span>Export Query</span>
// //                   </button>
// //                   <button
// //                     onClick={() => onAction("export-1601eq-att")}
// //                     className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
// //                   >
// //                     <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
// //                     <span>Export 1601EQ Attachment</span>
// //                   </button>
// //                   <button
// //                     onClick={() => onAction("export-1604e-att")}
// //                     className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
// //                   >
// //                     <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
// //                     <span>Export 1604E Attachment</span>
// //                   </button>
// //                 </div>
// //               )}
// //             </div>

// //             {/* GENERATE: dropdown (after Export) */}
// //             <div className="relative" ref={generateMenuRef}>
// //               <button
// //                 onClick={() =>
// //                   updateState({
// //                     showGenerateMenu: !showGenerateMenu,
// //                     showExportMenu: false,
// //                     guideOpen: false,
// //                   })
// //                 }
// //                 className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
// //               >
// //                 <FontAwesomeIcon icon={faFileLines} />
// //                 <span className="hidden lg:inline ml-2">Generate</span>
// //                 <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
// //               </button>

// //               {showGenerateMenu && (
// //                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600 z-50">
// //                   <button
// //                     onClick={() => onAction("gen-1601eq")}
// //                     className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
// //                   >
// //                     <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
// //                     <span>Generate 1601EQ</span>
// //                   </button>
// //                   <button
// //                     onClick={() => onAction("gen-1604e")}
// //                     className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
// //                   >
// //                     <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
// //                     <span>Generate 1604E</span>
// //                   </button>
// //                 </div>
// //               )}
// //             </div>

// //             {/* Guide dropdown */}
// //             <div className="relative">
// //               <button
// //                 onClick={() => onAction("guide")}
// //                 className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
// //               >
// //                 <FontAwesomeIcon icon={faInfoCircle} />{" "}
// //                 <span className="hidden lg:inline ml-2">Guide</span>
// //               </button>
// //               {guideOpen && (
// //                 <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
// //                   <button
// //                     onClick={() => onAction("pdf")}
// //                     className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
// //                   >
// //                     <FontAwesomeIcon icon={faFileLines} className="mr-2" />
// //                     PDF Guide
// //                   </button>
// //                 </div>
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Filters + Summary */}
// //       <div id="summary" className="global-tran-tab-div-ui">
// //         <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
// //           <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
// //             {/* Payee Details */}
// //             <section className="p-5">
// //               <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
// //                 <FontAwesomeIcon className="text-blue-600" icon={faUser} />
// //                 Payee Details
// //               </h3>

// //               {/* Branch */}
// //               <div className="global-tran-textbox-group-div-ui">
// //                 <div className="relative">
// //                   <input
// //                     type="text"
// //                     id="branchName"
// //                     placeholder=" "
// //                     value={branchName}
// //                     readOnly
// //                     className="peer global-tran-textbox-ui cursor-pointer"
// //                   />
// //                   <label htmlFor="branchName" className="global-tran-floating-label">
// //                     Branch
// //                   </label>
// //                   <button
// //                     type="button"
// //                     className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
// //                     onClick={() => updateState({ showBranchModal: true })}
// //                     disabled={isLoading}
// //                     aria-label="Find Branch"
// //                     title="Find Branch"
// //                   >
// //                     <FontAwesomeIcon icon={faMagnifyingGlass} />
// //                   </button>
// //                 </div>
// //               </div>

// //               {/* Payee Code */}
// //               <div className="global-tran-textbox-group-div-ui">
// //                 <div className="relative">
// //                   <input
// //                     type="text"
// //                     id="vendCode"
// //                     placeholder=" "
// //                     value={vendCode}
// //                     onChange={(e) => updateState({ vendCode: e.target.value })}
// //                     className="peer global-tran-textbox-ui"
// //                     disabled={isLoading}
// //                   />
// //                   <label htmlFor="vendCode" className="global-tran-floating-label">
// //                     Payee Code
// //                   </label>
// //                   <button
// //                     type="button"
// //                     className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
// //                     onClick={() => updateState({ showPayeeModal: true })}
// //                     disabled={isLoading}
// //                     aria-label="Find Payee"
// //                     title="Find Payee"
// //                   >
// //                     <FontAwesomeIcon icon={faMagnifyingGlass} />
// //                   </button>
// //                 </div>
// //               </div>

// //               {/* Payee Name */}
// //               <div className="global-tran-textbox-group-div-ui">
// //                 <div className="relative">
// //                   <input
// //                     type="text"
// //                     id="vendName"
// //                     placeholder=" "
// //                     value={vendName}
// //                     readOnly
// //                     className="peer global-tran-textbox-ui"
// //                   />
// //                   <label htmlFor="vendName" className="global-tran-floating-label">
// //                     Payee Name
// //                   </label>
// //                 </div>
// //               </div>
// //             </section>

// //             {/* Date Range */}
// //             <section className="p-5">
// //               <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
// //                 <FontAwesomeIcon className="text-blue-600" icon={faCalendarAlt} />
// //                 Date Range
// //               </h3>

// //               {/* Starting Cut-off */}
// //               <div className="global-tran-textbox-group-div-ui">
// //                 <div className="relative">
// //                   <input
// //                     type="text"
// //                     id="startingCutoffName"
// //                     placeholder=" "
// //                     value={startingCutoffName}
// //                     readOnly
// //                     className="peer global-tran-textbox-ui cursor-pointer"
// //                   />
// //                   <label htmlFor="startingCutoffName" className="global-tran-floating-label">
// //                     Starting Cut-off
// //                   </label>
// //                   <button
// //                     type="button"
// //                     className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
// //                     onClick={() =>
// //                       updateState({
// //                         showCutoffModal: true,
// //                         cutoffModalType: "starting",
// //                       })
// //                     }
// //                     disabled={isLoading}
// //                     aria-label="Find Start Cut-off"
// //                     title="Find Start Cut-off"
// //                   >
// //                     <FontAwesomeIcon icon={faMagnifyingGlass} />
// //                   </button>
// //                 </div>
// //               </div>

// //               {/* Ending Cut-off */}
// //               <div className="global-tran-textbox-group-div-ui">
// //                 <div className="relative">
// //                   <input
// //                     type="text"
// //                     id="endingCutoffName"
// //                     placeholder=" "
// //                     value={endingCutoffName}
// //                     readOnly
// //                     className="peer global-tran-textbox-ui cursor-pointer"
// //                   />
// //                   <label htmlFor="endingCutoffName" className="global-tran-floating-label">
// //                     Ending Cut-off
// //                   </label>
// //                   <button
// //                     type="button"
// //                     className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
// //                     onClick={() =>
// //                       updateState({
// //                         showCutoffModal: true,
// //                         cutoffModalType: "ending",
// //                       })
// //                     }
// //                     disabled={isLoading}
// //                     aria-label="Find End Cut-off"
// //                     title="Find End Cut-off"
// //                   >
// //                     <FontAwesomeIcon icon={faMagnifyingGlass} />
// //                   </button>
// //                 </div>
// //               </div>
// //             </section>

// //             {/* Summary Totals */}
// //             <section className="p-5">
// //               <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
// //                 <FontAwesomeIcon className="text-blue-600" icon={faFileLines} />
// //                 Summary
// //               </h3>

// //               <div className="grid grid-cols-2 gap-3">
// //                 <div>
// //                   <div className="text-xs text-gray-500">Base Amount</div>
// //                   <div className="font-semibold">{baseAmount}</div>
// //                 </div>
// //                 <div>
// //                   <div className="text-xs text-gray-500">ATC Amount</div>
// //                   <div className="font-semibold">{atcAmount}</div>
// //                 </div>
// //               </div>
// //             </section>
// //           </div>
// //         </div>
// //       </div>



// //        <div className="global-tran-tab-div-ui">
// //         <div className="global-tran-tab-nav-ui">
// //           <div className="flex flex-row sm:flex-row">
// //             <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Summary</button>
// //           </div>
// //         </div>

// //         <div className="global-tran-table-main-div-ui">
// //           <div className="max-h-[600px] overflow-y-auto relative">
// //             <SearchGlobalReportTable
// //               ref={tableRef}
// //               columns={cols_Att}
// //               data={rows_Att}
// //               itemsPerPage={50}
// //               rightActionLabel="View"
// //               onRowAction={handleViewTop} // This action now filters the top table
// //             />
// //           </div>
// //         </div>
// //       </div>




// //          <div className="global-tran-tab-div-ui">
// //         <div className="global-tran-tab-nav-ui">
// //           <div className="flex flex-row sm:flex-row">
// //             <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Detailed</button>
// //           </div>
// //         </div>

// //         <div className="global-tran-table-main-div-ui">
// //           <div className="max-h-[600px] overflow-y-auto relative">
// //             <SearchGlobalReportTable
// //               ref={tableRef}
// //               columns={cols}
// //               data={rows}
// //               itemsPerPage={50}
// //               rightActionLabel="View"
// //               onRowAction={(row) => {
// //                 const url = `${window.location.origin}${row.pathUrl}`;
// //                 window.open(url, "_blank", "noopener,noreferrer");
// //               }}
// //             />
// //           </div>
// //         </div>
// //       </div>
             



// //       {/* Modals */}
// //       {showBranchModal && (
// //         <BranchLookupModal
// //           isOpen={showBranchModal}
// //           onClose={(selectedBranch) => {
// //             if (selectedBranch) {
// //               updateState({
// //                 branchCode: selectedBranch.branchCode,
// //                 branchName: selectedBranch.branchName,
// //               });
// //             }
// //             updateState({ showBranchModal: false });
// //           }}
// //         />
// //       )}
// //       {showPayeeModal && (
// //         <PayeeMastLookupModal
// //           isOpen={showPayeeModal}
// //           onClose={(selectedPayee) => {
// //             if (selectedPayee) {
// //               updateState({
// //                 vendCode: selectedPayee.vendCode,
// //                 vendName: selectedPayee.vendName,
// //                 baseAmount: "0.00",
// //                 atcAmount: "0.00",
// //               });
// //             }
// //             updateState({ showPayeeModal: false });
// //           }}
// //         />
// //       )}
// //       {showCutoffModal && (
// //         <CutoffLookupModal
// //           isOpen={showCutoffModal}
// //           onClose={(selectedCutoff) => {
// //             if (selectedCutoff) {
// //               if (cutoffModalType === "starting") {
// //                 updateState({
// //                   startingCutoff: selectedCutoff.cutoffCode,
// //                   startingCutoffName: selectedCutoff.cutoffName,
// //                 });
// //               } else if (cutoffModalType === "ending") {
// //                 updateState({
// //                   endingCutoff: selectedCutoff.cutoffCode,
// //                   endingCutoffName: selectedCutoff.cutoffName,
// //                 });
// //               }
// //             }
// //             updateState({ showCutoffModal: false, cutoffModalType: "" });
// //           }}
// //         />
// //       )}
// //     </div>
// //   );
// // }


// import { useState, useEffect, useCallback, useRef } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faFileLines,
//   faMagnifyingGlass,
//   faPrint,
//   faFileExport,
//   faInfoCircle,
//   faUser,
//   faCalendarAlt,
//   faChevronDown,
//   faFileExcel,
//   faNoteSticky,
//   faUndo,
// } from "@fortawesome/free-solid-svg-icons";

// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
// import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
// import {
//   useTopCompanyRow,
//   useTopUserRow,
//   useTopBranchRow,
// } from "@/NAYSA Cloud/Global/top1RefTable";
// import {
//   export1601EQReportExcel,
//   export1604EReportExcel,
// } from "@/NAYSA Cloud/Global/birReport";
// import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
// import { formatNumber, parseFormattedNumber } from "@/NAYSA Cloud/Global/behavior.jsx";
// import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
// import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
// import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
// import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";

// const ENDPOINT = "getEWTInquiry";
// const ENDPOINT_Att = "getEWTAtt";

// export default function EWTINQ() {
//   const { user, companyInfo, currentUserRow } = useAuth();

//   const [state, setState] = useState({
//     branchCode: "",
//     branchName: "",
//     vendCode: "",
//     vendName: "",
//     startingCutoff: "",
//     startingCutoffName: "",
//     endingCutoff: "",
//     endingCutoffName: "",
//     rows: [],
//     originalRows: [],
//     rows_Att: [],
//     cols: [],
//     cols_Att: [],
//     tbl1601EQ_dat: [],
//     tbl1604E_dat: [],
//     tbl1601EQ_att: [],
//     tbl1604E_att: [],
//     tbl1601EQ_fileName: "",
//     tbl1604E_fileName: "",
//     baseAmount: "0.00",
//     atcAmount: "0.00",
//     showBranchModal: false,
//     showPayeeModal: false,
//     showCutoffModal: false,
//     cutoffModalType: "",
//     isLoading: false,
//     showSpinner: false,
//     guideOpen: false,
//     showExportMenu: false,
//     showGenerateMenu: false,
//   });

//   const updateState = (u) => setState((p) => ({ ...p, ...u }));

//   const {
//     branchCode,
//     branchName,
//     vendCode,
//     vendName,
//     startingCutoff,
//     startingCutoffName,
//     endingCutoff,
//     endingCutoffName,
//     rows,
//     originalRows,
//     rows_Att,
//     cols,
//     cols_Att,
//     tbl1601EQ_dat,
//     tbl1604E_dat,
//     tbl1601EQ_att,
//     tbl1604E_att,
//     tbl1601EQ_fileName,
//     tbl1604E_fileName,
//     baseAmount,
//     atcAmount,
//     showBranchModal,
//     showPayeeModal,
//     showCutoffModal,
//     cutoffModalType,
//     isLoading,
//     showSpinner,
//     guideOpen,
//     showExportMenu,
//     showGenerateMenu,
//   } = state;

//   const tableRef = useRef(null);
//   const exportMenuRef = useRef(null);
//   const generateMenuRef = useRef(null);

//   useEffect(() => {
//     let t;
//     if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
//     else updateState({ showSpinner: false });
//     return () => clearTimeout(t);
//   }, [isLoading]);

//   useEffect(() => {
//     const onDocClick = (e) => {
//       if (
//         exportMenuRef.current &&
//         !exportMenuRef.current.contains(e.target) &&
//         showExportMenu
//       ) {
//         updateState({ showExportMenu: false });
//       }
//       if (
//         generateMenuRef.current &&
//         !generateMenuRef.current.contains(e.target) &&
//         showGenerateMenu
//       ) {
//         updateState({ showGenerateMenu: false });
//       }
//     };

//     document.addEventListener("mousedown", onDocClick);
//     return () => document.removeEventListener("mousedown", onDocClick);
//   }, [showExportMenu, showGenerateMenu]);

//   const loadedColsRef = useRef(false);
//   useEffect(() => {
//     if (loadedColsRef.current) return;

//     let alive = true;
//     (async () => {
//       try {
//         const result = await useSelectedHSColConfig(ENDPOINT);
//         const resultAtt = await useSelectedHSColConfig(ENDPOINT_Att);

//         if (!alive) return;

//         updateState({
//           cols: Array.isArray(result) ? result.map((c) => ({ ...c })) : [],
//           cols_Att: Array.isArray(resultAtt) ? resultAtt.map((c) => ({ ...c })) : [],
//         });

//         loadedColsRef.current = true;
//       } catch (e) {
//         console.error("Load column config failed:", e);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, []);

//   const loadDefaults = useCallback(async () => {
//     updateState({ showSpinner: true });
//     try {
//       const [hsCompany, hsUser] = await Promise.all([
//         useTopCompanyRow(),
//         useTopUserRow(user?.USER_CODE),
//       ]);

//       if (hsCompany) {
//         updateState({
//           startingCutoff: hsCompany.cutoffCode,
//           startingCutoffName: hsCompany.cutoffName,
//           endingCutoff: hsCompany.cutoffCode,
//           endingCutoffName: hsCompany.cutoffName,
//         });
//       }

//       if (hsUser) {
//         const hsBranch = await useTopBranchRow(hsUser.branchCode);
//         updateState({
//           branchCode: hsUser.branchCode,
//           branchName: hsBranch?.branchName || hsUser.branchName,
//         });
//       }
//     } catch (err) {
//       console.error("Error loading defaults:", err);
//     } finally {
//       updateState({ showSpinner: false });
//     }
//   }, [user?.USER_CODE]);

//   const handleReset = useCallback(() => {
//     updateState({
//       vendCode: "",
//       vendName: "",
//       rows: [],
//       originalRows: [],
//       rows_Att: [],
//       tbl1601EQ_dat: [],
//       tbl1604E_dat: [],
//       tbl1601EQ_att: [],
//       tbl1604E_att: [],
//       baseAmount: "0.00",
//       atcAmount: "0.00",
//     });
//   }, []);

//   function useNormalizeDat(data) {
//     return data.map((row) => Object.values(row).join("")).join("\r\n");
//   }

//   const computeTotals = useCallback((list = []) => {
//     if (!Array.isArray(list) || list.length === 0) {
//       updateState({
//         atcAmount: "0.00",
//         baseAmount: "0.00",
//       });
//       return;
//     }

//     const acc = list.reduce(
//       (a, r) => {
//         a.atcAmount += parseFormattedNumber(r.atcAmt) || 0;
//         a.baseAmount += parseFormattedNumber(r.baseAmt) || 0;
//         return a;
//       },
//       { atcAmount: 0, baseAmount: 0 }
//     );

//     updateState({
//       atcAmount: formatNumber(acc.atcAmount),
//       baseAmount: formatNumber(acc.baseAmount),
//     });
//   }, []);

//   const doFind = useCallback(async () => {
//     updateState({ isLoading: true });
//     try {
//       const resp = await fetchData(ENDPOINT, {
//         json_data: { json_data: { branchCode, vendCode, startingCutoff, endingCutoff } },
//       });

//       const parsed = resp?.data?.[0]?.result ? JSON.parse(resp.data[0].result) : [];
//       const dt1 = parsed?.[0]?.dt1 ?? [];
//       const dtF1601EQ = parsed?.[0]?.dtF1601EQ ?? [];
//       const dtF1604E = parsed?.[0]?.dtF1604E ?? [];
//       const dtF1601EQ_att = parsed?.[0]?.f1601EQ_att ?? [];
//       const dtF1604E_att = parsed?.[0]?.f1604E_att ?? [];
//       const rowsAttData =
//         Array.isArray(dtF1601EQ_att) && dtF1601EQ_att.length > 0
//           ? dtF1601EQ_att[0].data
//           : [];

//       updateState({
//         rows: Array.isArray(dt1) ? dt1 : [],
//         originalRows: Array.isArray(dt1) ? dt1 : [],
//         rows_Att: rowsAttData,
//         tbl1601EQ_dat: Array.isArray(dtF1601EQ) ? dtF1601EQ : [],
//         tbl1604E_dat: Array.isArray(dtF1604E) ? dtF1604E : [],
//         tbl1601EQ_att: Array.isArray(dtF1601EQ_att) ? dtF1601EQ_att : [],
//         tbl1604E_att: Array.isArray(dtF1604E_att) ? dtF1604E_att : [],
//         tbl1601EQ_fileName: parsed?.[0]?.f1601EQ_name || "",
//         tbl1604E_fileName: parsed?.[0]?.f1604E_name || "",
//       });

//       computeTotals(dt1);
//     } catch (e) {
//       console.error("Find failed:", e);
//     } finally {
//       updateState({ isLoading: false });
//     }
//   }, [branchCode, vendCode, startingCutoff, endingCutoff, computeTotals]);

//   useEffect(() => {
//     if (!user?.USER_CODE) return;
//     (async () => {
//       await loadDefaults();
//       await handleReset();
//     })();
//   }, [user?.USER_CODE, loadDefaults, handleReset]);

//   const handleViewTop = useCallback(
//     (row) => {
//       const filteredRows = originalRows.filter((r) => r.vendCode === row.vendCode);

//       updateState({
//         vendName: row.corpName,
//         vendCode: row.vendCode,
//         rows: filteredRows,
//       });

//       computeTotals(filteredRows);
//     },
//     [originalRows, computeTotals]
//   );

//   const doExport = useCallback(async () => {
//     if (!Array.isArray(rows) || rows.length === 0) return;

//     try {
//       updateState({ isLoading: true });

//       const exportData = {
//         Data: {
//           "EWT Inquiry Detailed": rows,
//           "EWT Inquiry Summary": rows_Att,
//         },
//       };

//       const columnConfigsMap = {
//         "EWT Inquiry Detailed": cols,
//         "EWT Inquiry Summary": cols_Att,
//       };

//       const payload = {
//         ReportName: "EWT Inquiry Report",
//         UserCode: currentUserRow?.userName,
//         Branch: branchCode || "",
//         JsonData: exportData,
//         companyName: companyInfo?.compName,
//         companyAddress: companyInfo?.compAddr,
//         companyTelNo: companyInfo?.telNo,
//       };

//       await exportGenericHistoryExcel(payload, columnConfigsMap);
//     } catch (e) {
//       console.error("Export failed:", e);
//     } finally {
//       updateState({ isLoading: false });
//     }
//   }, [rows, rows_Att, cols, cols_Att, branchCode, currentUserRow?.userName, companyInfo]);

//   const doExportAttachment = useCallback(
//     async (kind) => {
//       if (!Array.isArray(rows) || rows.length === 0) return;

//       try {
//         updateState({ isLoading: true });

//         const tblAtt = kind === "1601EQ" ? tbl1601EQ_att : tbl1604E_att;
//         if (!tblAtt || tblAtt.length === 0) {
//           console.warn(`No attachment data for ${kind}`);
//           return;
//         }

//         const first = tblAtt[0];
//         const payload = {
//           title: first.title,
//           periodText: first.periodText,
//           tin: first.tin,
//           agentName: first.agentName,
//           fileName: first.fileName,
//           data: first.data,
//         };

//         if (kind === "1601EQ") {
//           export1601EQReportExcel("1601EQ", payload, { slice8to11: false });
//         } else {
//           export1604EReportExcel("1604E", payload, { slice8to11: false });
//         }
//       } catch (e) {
//         console.error(`Export ${kind} attachment failed:`, e);
//       } finally {
//         updateState({ isLoading: false, showExportMenu: false });
//       }
//     },
//     [rows, tbl1601EQ_att, tbl1604E_att]
//   );

//   const doGenerate = useCallback(
//     (kind) => {
//       if (!Array.isArray(rows) || rows.length === 0) return;

//       try {
//         updateState({ isLoading: true });

//         const src = kind === "1601EQ" ? tbl1601EQ_dat : tbl1604E_dat;
//         const filename = kind === "1601EQ" ? tbl1601EQ_fileName : tbl1604E_fileName;
//         const datText = useNormalizeDat(src).trim();

//         const blob = new Blob([datText], { type: "text/plain;charset=utf-8" });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = filename;
//         document.body.appendChild(a);
//         a.click();
//         a.remove();
//         URL.revokeObjectURL(url);
//       } catch (err) {
//         console.error(`Download ${kind} failed:`, err);
//         alert(`Failed to download ${kind} file.`);
//       } finally {
//         updateState({ isLoading: false, showGenerateMenu: false });
//       }
//     },
//     [rows, tbl1601EQ_dat, tbl1604E_dat, tbl1601EQ_fileName, tbl1604E_fileName]
//   );

//   const onAction = (id) => {
//     switch (id) {
//       case "find":
//         return doFind();
//       case "reset":
//         return handleReset();
//       case "print":
//         return window.print();
//       case "export-query":
//         return doExport();
//       case "export-1601eq-att":
//         return doExportAttachment("1601EQ");
//       case "export-1604e-att":
//         return doExportAttachment("1604E");
//       case "gen-1601eq":
//         return doGenerate("1601EQ");
//       case "gen-1604e":
//         return doGenerate("1604E");
//       case "guide":
//         return updateState({
//           guideOpen: !guideOpen,
//           showExportMenu: false,
//           showGenerateMenu: false,
//         });
//       case "pdf":
//         return window.open("/public/NAYSA EWT Inquiry.pdf", "_blank");
//       default:
//         return;
//     }
//   };

//   return (
//     <div className="global-ref-main-div-ui">
//       {showSpinner && <LoadingSpinner />}

//       {/* HEADER SECTION */}
//       <div className="global-ref-header-ui">
//         <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//           {/* Title */}
//           <div className="w-full md:w-auto flex md:justify-start">
//             <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
//               Expanded Withholding Tax Query
//             </h1>
//           </div>

//           {/* Buttons - one line only */}
//           <div className="w-full md:w-auto flex md:justify-end">
//             <div className="w-full md:w-auto overflow-visible">
//               <div className="flex flex-nowrap items-center justify-center md:justify-end gap-2">
//                 <button
//                   onClick={() => onAction("find")}
//                   className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
//                 >
//                   <FontAwesomeIcon icon={faMagnifyingGlass} />
//                   <span className="hidden lg:inline ml-2">Find</span>
//                 </button>

//                 <button
//                   onClick={() => onAction("reset")}
//                   className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
//                 >
//                   <FontAwesomeIcon icon={faUndo} />
//                   <span className="hidden lg:inline ml-2">Reset</span>
//                 </button>

//                 <button
//                   onClick={() => onAction("print")}
//                   className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
//                 >
//                   <FontAwesomeIcon icon={faPrint} />
//                   <span className="hidden lg:inline ml-2">Print</span>
//                 </button>

//                 <div className="relative shrink-0" ref={exportMenuRef}>
//                   <button
//                     onClick={() =>
//                       updateState({
//                         showExportMenu: !showExportMenu,
//                         showGenerateMenu: false,
//                         guideOpen: false,
//                       })
//                     }
//                     className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
//                   >
//                     <FontAwesomeIcon icon={faFileExport} />
//                     <span className="hidden lg:inline ml-2">Export</span>
//                     <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
//                   </button>

//                   {showExportMenu && (
//                     <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-[9999]">
//                       <button
//                         onClick={() => onAction("export-query")}
//                         className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
//                       >
//                         <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
//                         <span>Export Query</span>
//                       </button>
//                       <button
//                         onClick={() => onAction("export-1601eq-att")}
//                         className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
//                       >
//                         <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
//                         <span>Export 1601EQ Attachment</span>
//                       </button>
//                       <button
//                         onClick={() => onAction("export-1604e-att")}
//                         className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
//                       >
//                         <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
//                         <span>Export 1604E Attachment</span>
//                       </button>
//                     </div>
//                   )}
//                 </div>

//                 <div className="relative shrink-0" ref={generateMenuRef}>
//                   <button
//                     onClick={() =>
//                       updateState({
//                         showGenerateMenu: !showGenerateMenu,
//                         showExportMenu: false,
//                         guideOpen: false,
//                       })
//                     }
//                     className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
//                   >
//                     <FontAwesomeIcon icon={faFileLines} />
//                     <span className="hidden lg:inline ml-2">Generate</span>
//                     <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
//                   </button>

//                   {showGenerateMenu && (
//                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-[9999]">
//                       <button
//                         onClick={() => onAction("gen-1601eq")}
//                         className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
//                       >
//                         <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
//                         <span>Generate 1601EQ</span>
//                       </button>
//                       <button
//                         onClick={() => onAction("gen-1604e")}
//                         className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
//                       >
//                         <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
//                         <span>Generate 1604E</span>
//                       </button>
//                     </div>
//                   )}
//                 </div>

//                 <div className="relative shrink-0">
//                   <button
//                     onClick={() => onAction("guide")}
//                     className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
//                   >
//                     <FontAwesomeIcon icon={faInfoCircle} />
//                     <span className="hidden lg:inline ml-2">Guide</span>
//                   </button>

//                   {guideOpen && (
//                     <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-[9999]">
//                       <button
//                         onClick={() => onAction("pdf")}
//                         className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
//                       >
//                         <FontAwesomeIcon icon={faFileLines} className="mr-2" />
//                         PDF Guide
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mt-32 sm:mt-24 px-0">
//         {/* Filters + Summary */}
//         <div id="summary" className="global-tran-tab-div-ui">
//           <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
//             <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
//               <section className="p-5">
//                 <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
//                   <FontAwesomeIcon className="text-blue-600" icon={faUser} />
//                   Payee Details
//                 </h3>

//                 <div className="global-tran-textbox-group-div-ui">
//                   <div className="relative">
//                     <input
//                       type="text"
//                       id="branchName"
//                       placeholder=" "
//                       value={branchName}
//                       readOnly
//                       className="peer global-tran-textbox-ui cursor-pointer"
//                     />
//                     <label htmlFor="branchName" className="global-tran-floating-label">
//                       Branch
//                     </label>
//                     <button
//                       type="button"
//                       className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
//                       onClick={() => updateState({ showBranchModal: true })}
//                       disabled={isLoading}
//                       aria-label="Find Branch"
//                       title="Find Branch"
//                     >
//                       <FontAwesomeIcon icon={faMagnifyingGlass} />
//                     </button>
//                   </div>
//                 </div>

//                 <div className="global-tran-textbox-group-div-ui">
//                   <div className="relative">
//                     <input
//                       type="text"
//                       id="vendCode"
//                       placeholder=" "
//                       value={vendCode}
//                       onChange={(e) => updateState({ vendCode: e.target.value })}
//                       className="peer global-tran-textbox-ui"
//                       disabled={isLoading}
//                     />
//                     <label htmlFor="vendCode" className="global-tran-floating-label">
//                       Payee Code
//                     </label>
//                     <button
//                       type="button"
//                       className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
//                       onClick={() => updateState({ showPayeeModal: true })}
//                       disabled={isLoading}
//                       aria-label="Find Payee"
//                       title="Find Payee"
//                     >
//                       <FontAwesomeIcon icon={faMagnifyingGlass} />
//                     </button>
//                   </div>
//                 </div>

//                 <div className="global-tran-textbox-group-div-ui">
//                   <div className="relative">
//                     <input
//                       type="text"
//                       id="vendName"
//                       placeholder=" "
//                       value={vendName}
//                       readOnly
//                       className="peer global-tran-textbox-ui"
//                     />
//                     <label htmlFor="vendName" className="global-tran-floating-label">
//                       Payee Name
//                     </label>
//                   </div>
//                 </div>
//               </section>

//               <section className="p-5">
//                 <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
//                   <FontAwesomeIcon className="text-blue-600" icon={faCalendarAlt} />
//                   Date Range
//                 </h3>

//                 <div className="global-tran-textbox-group-div-ui">
//                   <div className="relative">
//                     <input
//                       type="text"
//                       id="startingCutoffName"
//                       placeholder=" "
//                       value={startingCutoffName}
//                       readOnly
//                       className="peer global-tran-textbox-ui cursor-pointer"
//                     />
//                     <label htmlFor="startingCutoffName" className="global-tran-floating-label">
//                       Starting Cut-off
//                     </label>
//                     <button
//                       type="button"
//                       className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
//                       onClick={() =>
//                         updateState({
//                           showCutoffModal: true,
//                           cutoffModalType: "starting",
//                         })
//                       }
//                       disabled={isLoading}
//                       aria-label="Find Start Cut-off"
//                       title="Find Start Cut-off"
//                     >
//                       <FontAwesomeIcon icon={faMagnifyingGlass} />
//                     </button>
//                   </div>
//                 </div>

//                 <div className="global-tran-textbox-group-div-ui">
//                   <div className="relative">
//                     <input
//                       type="text"
//                       id="endingCutoffName"
//                       placeholder=" "
//                       value={endingCutoffName}
//                       readOnly
//                       className="peer global-tran-textbox-ui cursor-pointer"
//                     />
//                     <label htmlFor="endingCutoffName" className="global-tran-floating-label">
//                       Ending Cut-off
//                     </label>
//                     <button
//                       type="button"
//                       className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
//                       onClick={() =>
//                         updateState({
//                           showCutoffModal: true,
//                           cutoffModalType: "ending",
//                         })
//                       }
//                       disabled={isLoading}
//                       aria-label="Find End Cut-off"
//                       title="Find End Cut-off"
//                     >
//                       <FontAwesomeIcon icon={faMagnifyingGlass} />
//                     </button>
//                   </div>
//                 </div>
//               </section>

//               <section className="p-5">
//                 <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
//                   <FontAwesomeIcon className="text-blue-600" icon={faFileLines} />
//                   Summary
//                 </h3>

//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <div className="text-xs text-gray-500">Base Amount</div>
//                     <div className="font-semibold">{baseAmount}</div>
//                   </div>
//                   <div>
//                     <div className="text-xs text-gray-500">ATC Amount</div>
//                     <div className="font-semibold">{atcAmount}</div>
//                   </div>
//                 </div>
//               </section>
//             </div>
//           </div>
//         </div>

//         <div className="global-tran-tab-div-ui">
//           <div className="global-tran-tab-nav-ui">
//             <div className="flex flex-row sm:flex-row">
//               <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
//                 Summary
//               </button>
//             </div>
//           </div>

//           <div className="global-tran-table-main-div-ui">
//               <SearchGlobalReportTable
//                 ref={tableRef}
//                 columns={cols_Att}
//                 data={rows_Att}
//                 itemsPerPage={50}
//                 rightActionLabel="View"
//                 onRowAction={handleViewTop}
//               />
//             </div>
//         </div>

//         <div className="global-tran-tab-div-ui">
//           <div className="global-tran-tab-nav-ui">
//             <div className="flex flex-row sm:flex-row">
//               <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
//                 Detailed
//               </button>
//             </div>
//           </div>

//           <div className="global-tran-table-main-div-ui">
//               <SearchGlobalReportTable
//                 ref={tableRef}
//                 columns={cols}
//                 data={rows}
//                 itemsPerPage={50}
//                 rightActionLabel="View"
//                 onRowAction={(row) => {
//                   const url = `${window.location.origin}${row.pathUrl}`;
//                   window.open(url, "_blank", "noopener,noreferrer");
//                 }}
//               />
//             </div>
//           </div>
//       </div>

//       {/* Modals */}
//       {showBranchModal && (
//         <BranchLookupModal
//           isOpen={showBranchModal}
//           onClose={(selectedBranch) => {
//             if (selectedBranch) {
//               updateState({
//                 branchCode: selectedBranch.branchCode,
//                 branchName: selectedBranch.branchName,
//               });
//             }
//             updateState({ showBranchModal: false });
//           }}
//         />
//       )}

//       {showPayeeModal && (
//         <PayeeMastLookupModal
//           isOpen={showPayeeModal}
//           onClose={(selectedPayee) => {
//             if (selectedPayee) {
//               updateState({
//                 vendCode: selectedPayee.vendCode,
//                 vendName: selectedPayee.vendName,
//                 baseAmount: "0.00",
//                 atcAmount: "0.00",
//               });
//             }
//             updateState({ showPayeeModal: false });
//           }}
//         />
//       )}

//       {showCutoffModal && (
//         <CutoffLookupModal
//           isOpen={showCutoffModal}
//           onClose={(selectedCutoff) => {
//             if (selectedCutoff) {
//               if (cutoffModalType === "starting") {
//                 updateState({
//                   startingCutoff: selectedCutoff.cutoffCode,
//                   startingCutoffName: selectedCutoff.cutoffName,
//                 });
//               } else if (cutoffModalType === "ending") {
//                 updateState({
//                   endingCutoff: selectedCutoff.cutoffCode,
//                   endingCutoffName: selectedCutoff.cutoffName,
//                 });
//               }
//             }
//             updateState({ showCutoffModal: false, cutoffModalType: "" });
//           }}
//         />
//       )}
//     </div>
//   );
// }


import { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faPrint,
  faFileExport,
  faInfoCircle,
  faUser,
  faCalendarAlt,
  faChevronDown,
  faFileExcel,
  faNoteSticky,
  faUndo,
  faChartLine,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import {
  export1601EQReportExcel,
  export1604EReportExcel,
} from "@/NAYSA Cloud/Global/birReport";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const ENDPOINT = "getEWTInquiry";
const ENDPOINT_Att = "getEWTAtt";

export default function EWTINQ() {
  const { user, companyInfo, currentUserRow } = useAuth();

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    vendCode: "",
    vendName: "",
    startingCutoff: "",
    startingCutoffName: "",
    endingCutoff: "",
    endingCutoffName: "",
    rows: [],
    originalRows: [],
    rows_Att: [],
    cols: [],
    cols_Att: [],
    tbl1601EQ_dat: [],
    tbl1604E_dat: [],
    tbl1601EQ_att: [],
    tbl1604E_att: [],
    tbl1601EQ_fileName: "",
    tbl1604E_fileName: "",
    baseAmount: "0.00",
    atcAmount: "0.00",
    showBranchModal: false,
    showPayeeModal: false,
    showCutoffModal: false,
    cutoffModalType: "",
    isLoading: false,
    showSpinner: false,
    guideOpen: false,
    showExportMenu: false,
    showGenerateMenu: false,
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    vendCode,
    vendName,
    startingCutoff,
    startingCutoffName,
    endingCutoff,
    endingCutoffName,
    rows,
    originalRows,
    rows_Att,
    cols,
    cols_Att,
    tbl1601EQ_dat,
    tbl1604E_dat,
    tbl1601EQ_att,
    tbl1604E_att,
    tbl1601EQ_fileName,
    tbl1604E_fileName,
    baseAmount,
    atcAmount,
    showBranchModal,
    showPayeeModal,
    showCutoffModal,
    cutoffModalType,
    isLoading,
    showSpinner,
    guideOpen,
    showExportMenu,
    showGenerateMenu,
  } = state;

  const summaryTableRef = useRef(null);
  const detailedTableRef = useRef(null);
  const detailedSectionRef = useRef(null);
  const exportMenuRef = useRef(null);
  const generateMenuRef = useRef(null);

  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });

    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target) &&
        showExportMenu
      ) {
        updateState({ showExportMenu: false });
      }

      if (
        generateMenuRef.current &&
        !generateMenuRef.current.contains(e.target) &&
        showGenerateMenu
      ) {
        updateState({ showGenerateMenu: false });
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showExportMenu, showGenerateMenu]);

  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;

    let alive = true;
    (async () => {
      try {
        const result = await useSelectedHSColConfig(ENDPOINT);
        const resultAtt = await useSelectedHSColConfig(ENDPOINT_Att);

        if (!alive) return;

        updateState({
          cols: Array.isArray(result) ? result.map((c) => ({ ...c })) : [],
          cols_Att: Array.isArray(resultAtt) ? resultAtt.map((c) => ({ ...c })) : [],
        });

        loadedColsRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filterReset = useCallback(() => {
    updateState({
      rows: [],
      originalRows: [],
      rows_Att: [],
      tbl1601EQ_dat: [],
      tbl1604E_dat: [],
      tbl1601EQ_att: [],
      tbl1604E_att: [],
      tbl1601EQ_fileName: "",
      tbl1604E_fileName: "",
      baseAmount: "0.00",
      atcAmount: "0.00",
    });
  }, []);

  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const [hsCompany, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);

      if (hsCompany) {
        updateState({
          startingCutoff: hsCompany.cutoffCode,
          startingCutoffName: hsCompany.cutoffName,
          endingCutoff: hsCompany.cutoffCode,
          endingCutoffName: hsCompany.cutoffName,
        });
      }

      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        updateState({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults:", err);
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);

  const handleReset = useCallback(() => {
    updateState({
      vendCode: "",
      vendName: "",
      startingCutoff: companyInfo?.cutoffCode || "",
      startingCutoffName: companyInfo?.cutoffName || "",
      endingCutoff: companyInfo?.cutoffCode || "",
      endingCutoffName: companyInfo?.cutoffName || "",
    });

    filterReset();
    summaryTableRef.current?.clearAllState();
    detailedTableRef.current?.clearAllState();
  }, [companyInfo, filterReset]);

  const normalizeDat = useCallback((data = []) => {
    return data.map((row) => Object.values(row).join("")).join("\r\n");
  }, []);

  const computeTotals = useCallback((list = []) => {
    if (!Array.isArray(list) || list.length === 0) {
      updateState({
        atcAmount: "0.00",
        baseAmount: "0.00",
      });
      return;
    }

    const acc = list.reduce(
      (a, r) => {
        a.atcAmount += parseFormattedNumber(r.atcAmt) || 0;
        a.baseAmount += parseFormattedNumber(r.baseAmt) || 0;
        return a;
      },
      { atcAmount: 0, baseAmount: 0 }
    );

    updateState({
      atcAmount: formatNumber(acc.atcAmount),
      baseAmount: formatNumber(acc.baseAmount),
    });
  }, []);

  const doFind = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const resp = await fetchData(ENDPOINT, {
        json_data: {
          json_data: { branchCode, vendCode, startingCutoff, endingCutoff },
        },
      });

      const parsed = resp?.data?.[0]?.result ? JSON.parse(resp.data[0].result) : [];
      const dt1 = parsed?.[0]?.dt1 ?? [];
      const dtF1601EQ = parsed?.[0]?.dtF1601EQ ?? [];
      const dtF1604E = parsed?.[0]?.dtF1604E ?? [];
      const dtF1601EQ_att = parsed?.[0]?.f1601EQ_att ?? [];
      const dtF1604E_att = parsed?.[0]?.f1604E_att ?? [];

      const rowsAttData =
        Array.isArray(dtF1601EQ_att) && dtF1601EQ_att.length > 0
          ? dtF1601EQ_att[0].data
          : [];

      const safeRows = Array.isArray(dt1) ? dt1 : [];
      const safeRowsAtt = Array.isArray(rowsAttData) ? rowsAttData : [];

      if (safeRows.length === 0 && safeRowsAtt.length === 0) {
        filterReset();
        updateState({
          vendCode: "",
          vendName: "",
        });
        useSwalErrorAlert("Expanded Withholding Tax Query", "No records found.");
        return;
      }

      updateState({
        rows: safeRows,
        originalRows: safeRows,
        rows_Att: safeRowsAtt,
        tbl1601EQ_dat: Array.isArray(dtF1601EQ) ? dtF1601EQ : [],
        tbl1604E_dat: Array.isArray(dtF1604E) ? dtF1604E : [],
        tbl1601EQ_att: Array.isArray(dtF1601EQ_att) ? dtF1601EQ_att : [],
        tbl1604E_att: Array.isArray(dtF1604E_att) ? dtF1604E_att : [],
        tbl1601EQ_fileName: parsed?.[0]?.f1601EQ_name || "",
        tbl1604E_fileName: parsed?.[0]?.f1604E_name || "",
      });

      computeTotals(safeRows);
    } catch (e) {
      console.error("Find failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, vendCode, startingCutoff, endingCutoff, computeTotals, filterReset]);

  useEffect(() => {
    if (!user?.USER_CODE) return;
    (async () => {
      await loadDefaults();
      handleReset();
    })();
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  const handleViewTop = useCallback(
    (row) => {
      const filteredRows = originalRows.filter((r) => r.vendCode === row.vendCode);

      updateState({
        vendName: row.corpName,
        vendCode: row.vendCode,
        rows: filteredRows,
      });

      computeTotals(filteredRows);

      requestAnimationFrame(() => {
        detailedSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [originalRows, computeTotals]
  );

  const doExport = useCallback(async () => {
    if (!Array.isArray(rows) || rows.length === 0) {
      useSwalErrorAlert("Expanded Withholding Tax Query", "No data available.");
      return;
    }

    try {
      updateState({ isLoading: true });

      const exportData = {
        Data: {
          "EWT Inquiry Detailed": rows,
          "EWT Inquiry Summary": rows_Att,
        },
      };

      const columnConfigsMap = {
        "EWT Inquiry Detailed": cols,
        "EWT Inquiry Summary": cols_Att,
      };

      const payload = {
        ReportName: "EWT Inquiry Report",
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName: companyInfo?.compName,
        companyAddress: companyInfo?.compAddr,
        companyTelNo: companyInfo?.telNo,
      };

      await exportGenericHistoryExcel(payload, columnConfigsMap);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [rows, rows_Att, cols, cols_Att, branchCode, currentUserRow?.userName, companyInfo]);

  const doExportAttachment = useCallback(
    async (kind) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        useSwalErrorAlert("Expanded Withholding Tax Query", "No data available.");
        return;
      }

      try {
        updateState({ isLoading: true });

        const tblAtt = kind === "1601EQ" ? tbl1601EQ_att : tbl1604E_att;
        if (!tblAtt || tblAtt.length === 0) {
          useSwalErrorAlert(
            "Expanded Withholding Tax Query",
            `No ${kind} attachment data found.`
          );
          return;
        }

        const first = tblAtt[0];
        const payload = {
          title: first.title,
          periodText: first.periodText,
          tin: first.tin,
          agentName: first.agentName,
          fileName: first.fileName,
          data: first.data,
        };

        if (kind === "1601EQ") {
          export1601EQReportExcel("1601EQ", payload, { slice8to11: false });
        } else {
          export1604EReportExcel("1604E", payload, { slice8to11: false });
        }
      } catch (e) {
        console.error(`Export ${kind} attachment failed:`, e);
      } finally {
        updateState({ isLoading: false, showExportMenu: false });
      }
    },
    [rows, tbl1601EQ_att, tbl1604E_att]
  );

  const doGenerate = useCallback(
    (kind) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        useSwalErrorAlert("Expanded Withholding Tax Query", "No data available.");
        return;
      }

      try {
        updateState({ isLoading: true });

        const src = kind === "1601EQ" ? tbl1601EQ_dat : tbl1604E_dat;
        const filename = kind === "1601EQ" ? tbl1601EQ_fileName : tbl1604E_fileName;
        const datText = normalizeDat(src).trim();

        if (!datText) {
          useSwalErrorAlert(
            "Expanded Withholding Tax Query",
            `No ${kind} file data found.`
          );
          return;
        }

        const blob = new Blob([datText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `${kind}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Download ${kind} failed:`, err);
        useSwalErrorAlert(
          "Expanded Withholding Tax Query",
          `Failed to generate ${kind} file.`
        );
      } finally {
        updateState({ isLoading: false, showGenerateMenu: false });
      }
    },
    [rows, tbl1601EQ_dat, tbl1604E_dat, tbl1601EQ_fileName, tbl1604E_fileName, normalizeDat]
  );

  const onAction = (id) => {
    switch (id) {
      case "find":
        return doFind();
      case "reset":
        return handleReset();
      case "print":
        return window.print();
      case "export-query":
        return doExport();
      case "export-1601eq-att":
        return doExportAttachment("1601EQ");
      case "export-1604e-att":
        return doExportAttachment("1604E");
      case "gen-1601eq":
        return doGenerate("1601EQ");
      case "gen-1604e":
        return doGenerate("1604E");
      case "guide":
        return updateState({
          guideOpen: !guideOpen,
          showExportMenu: false,
          showGenerateMenu: false,
        });
      case "pdf":
        return window.open("/public/NAYSA EWT Inquiry.pdf", "_blank");
      default:
        return;
    }
  };

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              Expanded Withholding Tax Query
            </h1>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto overflow-visible">
              <div className="flex flex-nowrap items-center justify-center md:justify-end gap-2">
                <button
                  onClick={() => onAction("find")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  <span className="hidden lg:inline ml-2">Find</span>
                </button>

                <button
                  onClick={() => onAction("reset")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faUndo} />
                  <span className="hidden lg:inline ml-2">Reset</span>
                </button>

                <button
                  onClick={() => onAction("print")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faPrint} />
                  <span className="hidden lg:inline ml-2">Print</span>
                </button>

                <div className="relative shrink-0" ref={exportMenuRef}>
                  <button
                    onClick={() =>
                      updateState({
                        showExportMenu: !showExportMenu,
                        showGenerateMenu: false,
                        guideOpen: false,
                      })
                    }
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
                  >
                    <FontAwesomeIcon icon={faFileExport} />
                    <span className="hidden lg:inline ml-2">Export</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <button
                        onClick={() => onAction("export-query")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        <span>Export Query</span>
                      </button>
                      <button
                        onClick={() => onAction("export-1601eq-att")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        <span>Export 1601EQ Attachment</span>
                      </button>
                      <button
                        onClick={() => onAction("export-1604e-att")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        <span>Export 1604E Attachment</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0" ref={generateMenuRef}>
                  <button
                    onClick={() =>
                      updateState({
                        showGenerateMenu: !showGenerateMenu,
                        showExportMenu: false,
                        guideOpen: false,
                      })
                    }
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
                  >
                    <FontAwesomeIcon icon={faFileLines} />
                    <span className="hidden lg:inline ml-2">Generate</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
                  </button>

                  {showGenerateMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <button
                        onClick={() => onAction("gen-1601eq")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
                        <span>Generate 1601EQ</span>
                      </button>
                      <button
                        onClick={() => onAction("gen-1604e")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
                        <span>Generate 1604E</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0">
                  <button
                    onClick={() => onAction("guide")}
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="hidden lg:inline ml-2">Guide</span>
                  </button>

                  {guideOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <button
                        onClick={() => onAction("pdf")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                      >
                        <FontAwesomeIcon icon={faFileLines} className="mr-2" />
                        PDF Guide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 sm:mt-24 px-1">
        <div id="summary" className="global-tran-tab-div-ui">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              <section className="p-5">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                  Payee Details
                </h3>

                <div className="space-y-3">
                  <FieldRenderer
                    type="lookup"
                    id="branchName"
                    name="branchName"
                    label="Branch"
                    value={branchName}
                    readOnly
                    disabled={isLoading}
                    onLookup={() => updateState({ showBranchModal: true })}
                  />

                  <FieldRenderer
                    type="lookup"
                    id="vendCode"
                    name="vendCode"
                    label="Payee Code"
                    value={vendCode}
                    disabled={isLoading}
                    onChange={(e) => {
                      updateState({
                        vendCode: e.target.value,
                        vendName: "",
                      });
                      filterReset();
                    }}
                    onLookup={() => updateState({ showPayeeModal: true })}
                  />

                  <FieldRenderer
                    type="text"
                    id="vendName"
                    name="vendName"
                    label="Payee Name"
                    value={vendName}
                    readOnly
                    disabled
                  />
                </div>
              </section>

              <section className="p-5">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faCalendarAlt} />
                  Date Range
                </h3>

                <div className="space-y-3">
                  <FieldRenderer
                    type="lookup"
                    id="startingCutoffName"
                    name="startingCutoffName"
                    label="Starting Cut-off"
                    value={startingCutoffName}
                    readOnly
                    disabled={isLoading}
                    onLookup={() =>
                      updateState({
                        showCutoffModal: true,
                        cutoffModalType: "starting",
                      })
                    }
                  />

                  <FieldRenderer
                    type="lookup"
                    id="endingCutoffName"
                    name="endingCutoffName"
                    label="Ending Cut-off"
                    value={endingCutoffName}
                    readOnly
                    disabled={isLoading}
                    onLookup={() =>
                      updateState({
                        showCutoffModal: true,
                        cutoffModalType: "ending",
                      })
                    }
                  />
                </div>
              </section>

              <aside className="p-5 bg-gray-50">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faChartLine} />
                  EWT Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span className="font-semibold text-gray-800">{baseAmount}</span>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-gray-700">ATC Amount:</span>
                    <span className="font-bold text-blue-600">{atcAmount}</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Summary
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={summaryTableRef}
              columns={cols_Att}
              data={rows_Att}
              itemsPerPage={50}
              docType="EWT Summary"
              rightActionLabel="View"
              onRowAction={handleViewTop}
            />
          </div>
        </div>

        <div
          ref={detailedSectionRef}
          className="global-tran-tab-div-ui scroll-mt-24 sm:scroll-mt-20"
        >
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Detailed
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={detailedTableRef}
              columns={cols}
              data={rows}
              itemsPerPage={50}
              docType="EWT Detailed"
              rightActionLabel="View"
              onRowAction={(row) => {
                const url = `${window.location.origin}${row.pathUrl}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
          </div>
        </div>
      </div>

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
                vendCode: "",
                vendName: "",
              });
              filterReset();
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showPayeeModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeModal}
          onClose={(selectedPayee) => {
            if (selectedPayee) {
              updateState({
                vendCode: selectedPayee.vendCode,
                vendName: selectedPayee.vendName,
              });
              filterReset();
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}

      {showCutoffModal && (
        <CutoffLookupModal
          isOpen={showCutoffModal}
          onClose={(selectedCutoff) => {
            if (selectedCutoff) {
              if (cutoffModalType === "starting") {
                filterReset();
                updateState({
                  startingCutoff: selectedCutoff.cutoffCode,
                  startingCutoffName: selectedCutoff.cutoffName,
                  endingCutoff: selectedCutoff.cutoffCode,
                  endingCutoffName: selectedCutoff.cutoffName,
                });
              } else {
                if (selectedCutoff.cutoffCode < startingCutoff) {
                  useSwalErrorAlert("", "", "endingCutoff");
                  filterReset();
                  updateState({
                    endingCutoff: startingCutoff,
                    endingCutoffName: startingCutoffName,
                  });
                  updateState({ showCutoffModal: false, cutoffModalType: "" });
                  return;
                }

                filterReset();
                updateState({
                  endingCutoff: selectedCutoff.cutoffCode,
                  endingCutoffName: selectedCutoff.cutoffName,
                });
              }
            }
            updateState({ showCutoffModal: false, cutoffModalType: "" });
          }}
        />
      )}
    </div>
  );
}
