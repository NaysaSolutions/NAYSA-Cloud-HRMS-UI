


// import React, { useMemo, useCallback, useEffect, useState } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faMoneyBillTrendUp,
//   faChevronRight,
//   faChevronDown,
//   faFolderTree,
//   faBuilding,
//   faAddressBook,
//   faCircleInfo,
//   faArrowUpRightFromSquare,
//   faArrowLeft,
// } from "@fortawesome/free-solid-svg-icons";

// function BalSheetYTDReport({
//   view,
//   tabConfig,
//   NoRecordsState,
//   onJumpToGLInquiry,
//   expandedMap = {},
//   setExpandedMap,
//   isMobile = false,
//   mobileView = "table",
// }) {
//   const [mobilePath, setMobilePath] = useState([]);

//   const periods = useMemo(() => {
//     return Array.isArray(view?.comparisonPeriods) && view.comparisonPeriods.length > 0
//       ? view.comparisonPeriods
//       : [];
//   }, [view?.comparisonPeriods]);

//   const treeData = useMemo(
//     () => buildBalanceSheetTree(view?.rows || [], periods),
//     [view?.rows, periods]
//   );

//   useEffect(() => {
//     setMobilePath([]);
//   }, [view?.rows, view?.comparisonPeriods]);

//   const safePeriods = periods.length > 0 ? periods : ["CURRENT"];

//   const isAllExpanded = useMemo(() => {
//     const expandableIds = [];

//     const walk = (nodes) => {
//       nodes.forEach((node) => {
//         if (Array.isArray(node.children) && node.children.length > 0) {
//           expandableIds.push(node.id);
//           walk(node.children);
//         }
//       });
//     };

//     walk(treeData);

//     if (!expandableIds.length) return false;
//     return expandableIds.every((id) => !!expandedMap[id]);
//   }, [treeData, expandedMap]);

//   const toggleNode = useCallback(
//     (nodeId) => {
//       setExpandedMap((prev) => ({
//         ...prev,
//         [nodeId]: !prev[nodeId],
//       }));
//     },
//     [setExpandedMap]
//   );

//   const setAllExpanded = useCallback(
//     (expand) => {
//       if (!expand) {
//         setExpandedMap({});
//         return;
//       }

//       const allIds = {};
//       const visit = (nodes) => {
//         nodes.forEach((node) => {
//           if (node.children?.length) {
//             allIds[node.id] = true;
//             visit(node.children);
//           }
//         });
//       };

//       visit(treeData);
//       setExpandedMap(allIds);
//     },
//     [treeData, setExpandedMap]
//   );

//   const handleExpandCollapseToggle = useCallback(() => {
//     setAllExpanded(!isAllExpanded);
//   }, [isAllExpanded, setAllExpanded]);

//   const handleJumpToGLInquiry = useCallback(
//     (node) => {
//       if (typeof onJumpToGLInquiry !== "function" || !node?.acctCode) return;

//       const isRC = node.rowType === "detail" && node.detailType === "RC";
//       const isSL = node.rowType === "detail" && node.detailType === "SL";

//       onJumpToGLInquiry({
//         acctCode: node.acctCode,
//         acctName: node.acctName || "",
//         rcCode: isRC ? node.code || "" : "",
//         rcName: isRC ? node.label || "" : "",
//         slCode: isSL ? node.code || "" : "",
//         slName: isSL ? node.label || "" : "",
//         fsCode: node.fsCode || "",
//         label: node.label || "",
//         node,
//       });
//     },
//     [onJumpToGLInquiry]
//   );

//   const gridTemplateColumns = `minmax(360px, 1.9fr) ${safePeriods
//     .map(() => "minmax(140px, 1fr)")
//     .join(" ")}`;

//   const mobileGridTemplateColumns = `minmax(200px, 1.7fr) ${safePeriods
//     .map(() => "minmax(110px, 1fr)")
//     .join(" ")}`;

//   const currentMobileLevelNodes = useMemo(() => {
//     if (!mobilePath.length) return treeData;
//     return mobilePath[mobilePath.length - 1]?.children || [];
//   }, [mobilePath, treeData]);

//   const currentMobileParent = mobilePath.length
//     ? mobilePath[mobilePath.length - 1]
//     : null;

//   const mobileBreadcrumb = useMemo(() => {
//     if (!mobilePath.length) return "Financial Statement";
//     return mobilePath.map((x) => x.label).join(" / ");
//   }, [mobilePath]);

//   const openMobileNode = useCallback((node) => {
//     if (!node?.children?.length) return;
//     setMobilePath((prev) => [...prev, node]);
//   }, []);

//   const goMobileBack = useCallback(() => {
//     setMobilePath((prev) => prev.slice(0, -1));
//   }, []);

//   if (!view?.hasLoaded) {
//     return (
//       <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
//         <FontAwesomeIcon icon={faMoneyBillTrendUp} className="text-blue-300" />
//         <span>
//           Click <b>Filter</b> then <b>Apply Filters</b> to load <b>{tabConfig.label}</b>.
//         </span>
//       </div>
//     );
//   }

//   if (view?.isEmpty) {
//     return (
//       <NoRecordsState
//         title="No records found"
//         subtitle={view.emptyMessage || "Try adjusting your filters."}
//         hint={`Report: ${tabConfig.label}`}
//       />
//     );
//   }

//   return (
//     <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
//       <div className="border-b border-slate-200 bg-white px-4 py-3">
//         <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//           <div>
//             <div className="text-[13px] font-medium text-gray-700">
//               Drilldown Financial Statement
//             </div>
//             <div className="mt-1 text-[11px] text-gray-500">
//               Expand FS groups to view account details, then RC / SL details.
//             </div>
//           </div>

//           {!isMobile ? (
//             <div className="hidden md:flex md:items-center">
//               <button
//                 type="button"
//                 onClick={handleExpandCollapseToggle}
//                 className={`inline-flex items-center rounded-lg border px-3 py-2 text-[11px] font-medium transition ${
//                   isAllExpanded
//                     ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
//                     : "border-slate-200 bg-slate-50 text-gray-700 hover:bg-slate-100"
//                 }`}
//               >
//                 {isAllExpanded ? "Collapse All" : "Expand All"}
//               </button>
//             </div>
//           ) : null}
//         </div>
//       </div>

//       {/* DESKTOP / TABLET */}
//       <div className="hidden md:block">
//         <div className="max-h-[600px] overflow-auto">
//           <div
//             className="min-w-max"
//             style={{ minWidth: `${360 + safePeriods.length * 140}px` }}
//           >
//             <div
//               className="sticky top-0 z-20 grid border-b border-blue-300 bg-blue-100 text-[11px] font-normal text-blue-900 shadow-sm"
//               style={{ gridTemplateColumns }}
//             >
//               <div className="border-r border-blue-200 bg-blue-100 px-4 py-2.5">
//                 Particulars
//               </div>

//               {safePeriods.map((periodCode, idx) => (
//                 <div
//                   key={periodCode}
//                   className={`bg-blue-100 px-4 py-2.5 text-right ${
//                     idx < safePeriods.length - 1 ? "border-r border-blue-200" : ""
//                   }`}
//                 >
//                   {periodCode === "CURRENT"
//                     ? "Amount"
//                     : formatCutoffHeaderLabel(periodCode)}
//                 </div>
//               ))}
//             </div>

//             <div className="divide-y divide-slate-200">
//               {treeData.map((node) => (
//                 <BalanceSheetNodeRowDesktop
//                   key={node.id}
//                   node={node}
//                   level={0}
//                   periods={safePeriods}
//                   gridTemplateColumns={gridTemplateColumns}
//                   expandedMap={expandedMap}
//                   onToggle={toggleNode}
//                   onJumpToGLInquiry={handleJumpToGLInquiry}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* MOBILE */}
//       <div className="block overflow-x-hidden md:hidden">
//         <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
//           <div className="flex items-center justify-between gap-3">
//             <div className="min-w-0">
//               <div className="text-[10px] uppercase tracking-wide text-slate-400">
//                 Mobile View
//               </div>
//               <div className="truncate text-[11px] text-slate-600">{mobileBreadcrumb}</div>
//             </div>
//           </div>

//           {mobilePath.length > 0 ? (
//             <div className="mt-2">
//               <button
//                 type="button"
//                 onClick={goMobileBack}
//                 className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
//               >
//                 <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
//                 Back
//               </button>
//             </div>
//           ) : null}
//         </div>

//         <div className="overflow-x-hidden bg-slate-50/50 p-3">
//           {mobileView === "card" ? (
//             <div className="space-y-2">
//               {currentMobileLevelNodes.map((node) => (
//                 <BalanceSheetNodeRowMobileCard
//                   key={node.id}
//                   node={node}
//                   periods={safePeriods}
//                   onOpenNode={openMobileNode}
//                   onJumpToGLInquiry={handleJumpToGLInquiry}
//                   currentParent={currentMobileParent}
//                 />
//               ))}
//             </div>
//           ) : (
//             <BalanceSheetMobileTableView
//               nodes={currentMobileLevelNodes}
//               periods={safePeriods}
//               onOpenNode={openMobileNode}
//               onJumpToGLInquiry={handleJumpToGLInquiry}
//               gridTemplateColumns={mobileGridTemplateColumns}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function BalanceSheetNodeRowDesktop({
//   node,
//   level,
//   periods,
//   gridTemplateColumns,
//   expandedMap,
//   onToggle,
//   onJumpToGLInquiry,
// }) {
//   const isExpanded = !!expandedMap[node.id];
//   const hasChildren = Array.isArray(node.children) && node.children.length > 0;
//   const paddingLeft = 14 + level * 20;

//   const canJumpToGL = node.rowType === "account" && !!node.acctCode;
//   const canJumpToRC =
//     node.rowType === "detail" &&
//     node.detailType === "RC" &&
//     !!node.acctCode &&
//     !!node.code;
//   const canJumpToSL =
//     node.rowType === "detail" &&
//     node.detailType === "SL" &&
//     !!node.acctCode &&
//     !!node.code;

//   const isClickableLabel =
//     (canJumpToGL || canJumpToRC || canJumpToSL) &&
//     typeof onJumpToGLInquiry === "function";

//   const rowClass =
//     node.rowType === "fs"
//       ? "bg-slate-50/70 text-gray-700"
//       : node.rowType === "account"
//       ? "bg-white text-gray-700"
//       : "bg-white text-gray-600";

//   const handleRowJump = () => {
//     if (!isClickableLabel) return;
//     onJumpToGLInquiry(node);
//   };

//   return (
//     <>
//       <div
//         className={`grid items-center border-b border-slate-100 ${rowClass} transition hover:bg-blue-50/20`}
//         style={{ gridTemplateColumns }}
//       >
//         <div
//           className="border-r border-slate-100 px-4 py-2"
//           style={{ paddingLeft: `${paddingLeft}px` }}
//         >
//           <div className="group flex min-h-[26px] items-center gap-3">
//             {hasChildren ? (
//               <button
//                 type="button"
//                 onClick={() => onToggle(node.id)}
//                 className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-white text-gray-500 hover:bg-slate-100"
//               >
//                 <FontAwesomeIcon
//                   icon={isExpanded ? faChevronDown : faChevronRight}
//                   className="text-[9px]"
//                 />
//               </button>
//             ) : (
//               <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-300">
//                 <span className="text-[9px]">•</span>
//               </div>
//             )}

//             <div className="min-w-0 flex-1">
//               <div className="flex min-w-0 items-center gap-2">
//                 <button
//                   type="button"
//                   onClick={handleRowJump}
//                   className={`min-w-0 flex-1 text-left leading-5 ${
//                     node.rowType === "fs"
//                       ? "text-[12px] font-normal"
//                       : node.rowType === "account"
//                       ? "text-[11.5px] font-normal"
//                       : "text-[11px] font-normal"
//                   } ${
//                     isClickableLabel
//                       ? "cursor-pointer text-blue-700 transition hover:text-blue-800 hover:underline"
//                       : "cursor-default text-gray-700"
//                   }`}
//                   title={node.label}
//                 >
//                   <span className="block truncate group-hover:pr-2 group-hover:truncate">
//                     {node.label}
//                   </span>
//                 </button>

//                 {canJumpToGL || canJumpToRC || canJumpToSL ? (
//                   <button
//                     type="button"
//                     onClick={handleRowJump}
//                     className="hidden shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 transition hover:bg-blue-100 group-hover:inline-flex"
//                     title={
//                       canJumpToGL
//                         ? `Open GL Inquiry for ${node.acctCode}`
//                         : `Open GL Inquiry for ${node.acctCode} / ${node.code}`
//                     }
//                   >
//                     <span className="flex items-center gap-1">
//                       <FontAwesomeIcon
//                         icon={faArrowUpRightFromSquare}
//                         className="text-[9px]"
//                       />
//                       {canJumpToRC ? "RC Inquiry" : canJumpToSL ? "SL Inquiry" : "GL Inquiry"}
//                     </span>
//                   </button>
//                 ) : null}
//               </div>

//               {node.subLabel ? (
//                 <div className="truncate text-[10px] leading-4 text-gray-400">
//                   {node.subLabel}
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         </div>

//         {periods.map((periodCode, idx) => {
//           const rawAmount = toNumber(node.amounts?.[periodCode]);
//           const displayAmount =
//             node.rowType === "fs" && hasChildren && isExpanded ? 0 : rawAmount;

//           return (
//             <div
//               key={`${node.id}-${periodCode}`}
//               className={`px-4 py-2 text-right tabular-nums ${
//                 idx < periods.length - 1 ? "border-r border-slate-100" : ""
//               }`}
//             >
//               <span className={getAmountClassDesktop(displayAmount, node.rowType)}>
//                 {formatNumberDisplay(displayAmount)}
//               </span>
//             </div>
//           );
//         })}
//       </div>

//       {hasChildren && isExpanded
//         ? node.children.map((child) => (
//             <BalanceSheetNodeRowDesktop
//               key={child.id}
//               node={child}
//               level={level + 1}
//               periods={periods}
//               gridTemplateColumns={gridTemplateColumns}
//               expandedMap={expandedMap}
//               onToggle={onToggle}
//               onJumpToGLInquiry={onJumpToGLInquiry}
//             />
//           ))
//         : null}
//     </>
//   );
// }

// function BalanceSheetNodeRowMobileCard({
//   node,
//   periods,
//   onOpenNode,
//   onJumpToGLInquiry,
//   currentParent,
// }) {
//   const hasChildren = Array.isArray(node.children) && node.children.length > 0;
//   const typeMeta = getTypeMeta(node);
//   const compactAmounts = periods.length > 1;

//   const canJumpToGL = node.rowType === "account" && !!node.acctCode;
//   const canJumpToRC =
//     node.rowType === "detail" &&
//     node.detailType === "RC" &&
//     !!node.acctCode &&
//     !!node.code;
//   const canJumpToSL =
//     node.rowType === "detail" &&
//     node.detailType === "SL" &&
//     !!node.acctCode &&
//     !!node.code;

//   const isClickableLabel =
//     (canJumpToGL || canJumpToRC || canJumpToSL) &&
//     typeof onJumpToGLInquiry === "function";

//   const handleRowJump = () => {
//     if (!isClickableLabel) return;
//     onJumpToGLInquiry(node);
//   };

//   const containerClass =
//     node.rowType === "fs"
//       ? "border-blue-200 bg-blue-50/70"
//       : "border-slate-200 bg-white";

//   const firstAmount = periods[0] ? toNumber(node.amounts?.[periods[0]]) : 0;
//   const allowNextPage = hasChildren && (node.rowType !== "fs" || firstAmount > 0);

//   return (
//     <div className={`overflow-hidden rounded-xl border shadow-sm ${containerClass}`}>
//       <div className={`${compactAmounts ? "p-2.5" : "p-3"}`}>
//         <div className="flex items-start justify-between gap-2">
//           <div className="min-w-0 flex-1">
//             <div className="flex items-start gap-2">
//               <div
//                 className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${typeMeta.badgeClass}`}
//               >
//                 <FontAwesomeIcon icon={typeMeta.icon} className={typeMeta.iconClass} />
//                 <span>{typeMeta.label}</span>
//               </div>

//               <div className="min-w-0 flex-1">
//                 <button
//                   type="button"
//                   onClick={handleRowJump}
//                   className={`block min-w-0 text-left leading-5 ${
//                     compactAmounts
//                       ? "text-[12px] font-normal text-slate-700"
//                       : "text-[12.5px] font-normal text-slate-700"
//                   } ${
//                     isClickableLabel
//                       ? "cursor-pointer text-blue-700 hover:underline"
//                       : "cursor-default"
//                   }`}
//                   title={node.label}
//                 >
//                   <span className="break-words">{node.label}</span>
//                 </button>

//                 {node.subLabel ? (
//                   <div className="mt-0.5 text-[10px] text-slate-400">{node.subLabel}</div>
//                 ) : currentParent?.rowType === "fs" && node.acctCode ? (
//                   <div className="mt-0.5 text-[10px] text-slate-400">{node.acctCode}</div>
//                 ) : null}
//               </div>
//             </div>
//           </div>

//           {allowNextPage ? (
//             <button
//               type="button"
//               onClick={() => onOpenNode(node)}
//               className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
//               title={`Open ${node.label}`}
//             >
//               Next
//               <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
//             </button>
//           ) : null}
//         </div>

//         {(canJumpToGL || canJumpToRC || canJumpToSL) && (
//           <div className={`${compactAmounts ? "mt-2" : "mt-2.5"}`}>
//             <button
//               type="button"
//               onClick={handleRowJump}
//               className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
//             >
//               <FontAwesomeIcon
//                 icon={faArrowUpRightFromSquare}
//                 className="text-[9px]"
//               />
//               {canJumpToRC ? "RC Inquiry" : canJumpToSL ? "SL Inquiry" : "GL Inquiry"}
//             </button>
//           </div>
//         )}

//         <div className={`${compactAmounts ? "mt-2 space-y-1" : "mt-3 space-y-1.5"}`}>
//           {periods.map((periodCode) => {
//             const rawAmount = toNumber(node.amounts?.[periodCode]);

//             return (
//               <div
//                 key={`${node.id}-${periodCode}`}
//                 className={`flex items-center justify-between gap-2 rounded-md bg-slate-50 ${
//                   compactAmounts ? "px-2 py-1.5" : "px-2.5 py-2"
//                 }`}
//               >
//                 <div className="text-[10px] uppercase tracking-wide text-slate-500">
//                   {periodCode === "CURRENT"
//                     ? "Amount"
//                     : formatCutoffHeaderLabel(periodCode)}
//                 </div>

//                 <div className={getAmountClassMobile(rawAmount, node.rowType, compactAmounts)}>
//                   {formatNumberDisplay(rawAmount)}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

// function BalanceSheetMobileTableView({
//   nodes,
//   periods,
//   onOpenNode,
//   onJumpToGLInquiry,
//   gridTemplateColumns,
// }) {
//   const compact = periods.length > 1;

//   return (
//     <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
//       <div className="overflow-x-auto">
//         <div
//           className="min-w-max"
//           style={{ minWidth: `${200 + periods.length * 110}px` }}
//         >
//           <div
//             className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-100 text-[10px] font-normal text-slate-600"
//             style={{ gridTemplateColumns }}
//           >
//             <div className="border-r border-slate-200 bg-slate-100 px-3 py-2">
//               Particulars
//             </div>
//             {periods.map((periodCode, idx) => (
//               <div
//                 key={periodCode}
//                 className={`bg-slate-100 px-3 py-2 text-right ${
//                   idx < periods.length - 1 ? "border-r border-slate-200" : ""
//                 }`}
//               >
//                 {periodCode === "CURRENT"
//                   ? "Amount"
//                   : formatCutoffHeaderLabel(periodCode)}
//               </div>
//             ))}
//           </div>

//           <div className="divide-y divide-slate-100">
//             {nodes.map((node) => {
//               const hasChildren = Array.isArray(node.children) && node.children.length > 0;

//               const canJumpToGL = node.rowType === "account" && !!node.acctCode;
//               const canJumpToRC =
//                 node.rowType === "detail" &&
//                 node.detailType === "RC" &&
//                 !!node.acctCode &&
//                 !!node.code;
//               const canJumpToSL =
//                 node.rowType === "detail" &&
//                 node.detailType === "SL" &&
//                 !!node.acctCode &&
//                 !!node.code;

//               const isClickableLabel =
//                 (canJumpToGL || canJumpToRC || canJumpToSL) &&
//                 typeof onJumpToGLInquiry === "function";

//               const firstAmount = periods[0]
//                 ? toNumber(node.amounts?.[periods[0]])
//                 : 0;

//               const allowNextPage =
//                 hasChildren && (node.rowType !== "fs" || firstAmount > 0);

//               return (
//                 <div
//                   key={node.id}
//                   className="grid items-center text-[11px]"
//                   style={{ gridTemplateColumns }}
//                 >
//                   <div className="border-r border-slate-100 px-3 py-2">
//                     <div className="flex items-center justify-between gap-2">
//                       <button
//                         type="button"
//                         onClick={() => {
//                           if (isClickableLabel) onJumpToGLInquiry(node);
//                         }}
//                         className={`min-w-0 truncate text-left ${
//                           isClickableLabel
//                             ? "text-blue-700 hover:underline"
//                             : "text-slate-700"
//                         } font-normal`}
//                         title={node.label}
//                       >
//                         {node.label}
//                       </button>

//                       {allowNextPage ? (
//                         <button
//                           type="button"
//                           onClick={() => onOpenNode(node)}
//                           className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
//                         >
//                           Next
//                           <FontAwesomeIcon icon={faChevronRight} className="text-[8px]" />
//                         </button>
//                       ) : null}
//                     </div>
//                   </div>

//                   {periods.map((periodCode, idx) => {
//                     const amount = toNumber(node.amounts?.[periodCode]);
//                     return (
//                       <div
//                         key={`${node.id}-${periodCode}`}
//                         className={`px-3 py-2 text-right tabular-nums ${
//                           idx < periods.length - 1 ? "border-r border-slate-100" : ""
//                         }`}
//                       >
//                         <span className={getAmountClassMobile(amount, node.rowType, compact)}>
//                           {formatNumberDisplay(amount)}
//                         </span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function buildBalanceSheetTree(rows, periods) {
//   if (!Array.isArray(rows) || rows.length === 0) return [];

//   const safePeriods = periods.length > 0 ? periods : ["CURRENT"];
//   const fsMap = new Map();
//   const acctMap = new Map();

//   rows.forEach((row, index) => {
//     const fsCode = sanitize(row?.fsconso_code);
//     const fsName = sanitize(row?.fsconso_name);
//     const acctCode = sanitize(row?.acct_code);
//     const acctName = sanitize(row?.acct_name);
//     const rcCode = sanitize(row?.rc_code);
//     const rcName = sanitize(row?.rc_name);
//     const slCode = sanitize(row?.sl_code);
//     const slName = sanitize(row?.sl_name);

//     if (!fsCode) return;

//     if (!fsMap.has(fsCode)) {
//       fsMap.set(fsCode, {
//         id: `fs-${fsCode}`,
//         rowType: "fs",
//         code: fsCode,
//         label: fsName || fsCode,
//         subLabel: "",
//         amounts: buildAmountsByType(row, safePeriods, "fs"),
//         sortIndex: index,
//         children: [],
//       });
//     } else {
//       const existingFs = fsMap.get(fsCode);
//       mergeAmounts(
//         existingFs.amounts,
//         buildAmountsByType(row, safePeriods, "fs"),
//         safePeriods
//       );

//       if (!existingFs.label && fsName) {
//         existingFs.label = fsName;
//       }
//     }

//     if (!acctCode) return;

//     const acctKey = `${fsCode}|${acctCode}`;

//     if (!acctMap.has(acctKey)) {
//       const accountNode = {
//         id: `acct-${fsCode}-${acctCode}`,
//         rowType: "account",
//         fsCode,
//         acctCode,
//         acctName,
//         label: `${acctCode}${acctName ? ` - ${acctName}` : ""}`,
//         subLabel: "",
//         amounts: buildAmountsByType(row, safePeriods, "account"),
//         sortIndex: index,
//         children: [],
//       };

//       acctMap.set(acctKey, accountNode);
//       fsMap.get(fsCode).children.push(accountNode);
//     } else {
//       const existingAcct = acctMap.get(acctKey);
//       mergeAmounts(
//         existingAcct.amounts,
//         buildAmountsByType(row, safePeriods, "account"),
//         safePeriods
//       );

//       if (!existingAcct.label && acctCode) {
//         existingAcct.label = `${acctCode}${acctName ? ` - ${acctName}` : ""}`;
//       }

//       if (!existingAcct.acctName && acctName) {
//         existingAcct.acctName = acctName;
//       }
//     }

//     if (slCode) {
//       const slNode = {
//         id: `sl-${fsCode}-${acctCode}-${slCode}-${index}`,
//         rowType: "detail",
//         detailType: "SL",
//         fsCode,
//         acctCode,
//         acctName,
//         code: slCode,
//         label: slName || slCode,
//         subLabel: slCode,
//         amounts: buildAmountsByType(row, safePeriods, "sl"),
//         sortIndex: index,
//         children: [],
//       };

//       acctMap.get(acctKey).children.push(slNode);
//       return;
//     }

//     if (rcCode) {
//       const rcNode = {
//         id: `rc-${fsCode}-${acctCode}-${rcCode}-${index}`,
//         rowType: "detail",
//         detailType: "RC",
//         fsCode,
//         acctCode,
//         acctName,
//         code: rcCode,
//         label: rcName || rcCode,
//         subLabel: rcCode,
//         amounts: buildAmountsByType(row, safePeriods, "rc"),
//         sortIndex: index,
//         children: [],
//       };

//       acctMap.get(acctKey).children.push(rcNode);
//     }
//   });

//   const fsNodes = Array.from(fsMap.values()).sort(
//     (a, b) => (a.sortIndex || 0) - (b.sortIndex || 0)
//   );

//   fsNodes.forEach((fsNode) => {
//     fsNode.children.sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0));
//     fsNode.children.forEach((acctNode) => {
//       acctNode.children.sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0));
//     });
//   });

//   return fsNodes;
// }

// function buildAmountsByType(row, periods, mode) {
//   const amounts = {};

//   periods.forEach((periodCode) => {
//     if (periodCode === "CURRENT") {
//       if (mode === "fs") {
//         amounts[periodCode] = toNumber(row?.fs_amount);
//       } else if (mode === "account") {
//         amounts[periodCode] = toNumber(row?.gl_amount);
//       } else if (mode === "rc") {
//         amounts[periodCode] = toNumber(row?.rc_amount);
//       } else if (mode === "sl") {
//         amounts[periodCode] = toNumber(row?.sl_amount);
//       } else {
//         amounts[periodCode] = 0;
//       }
//       return;
//     }

//     if (mode === "fs") {
//       amounts[periodCode] = toNumber(row?.periodFsAmounts?.[periodCode]);
//     } else if (mode === "account") {
//       amounts[periodCode] = toNumber(row?.periodGlAmounts?.[periodCode]);
//     } else if (mode === "rc") {
//       amounts[periodCode] = toNumber(row?.periodRcAmounts?.[periodCode]);
//     } else if (mode === "sl") {
//       amounts[periodCode] = toNumber(row?.periodSlAmounts?.[periodCode]);
//     } else {
//       amounts[periodCode] = toNumber(row?.periodAmounts?.[periodCode]);
//     }
//   });

//   return amounts;
// }

// function mergeAmounts(target, source, periods) {
//   periods.forEach((periodCode) => {
//     const current = toNumber(target?.[periodCode]);
//     const next = toNumber(source?.[periodCode]);

//     if (current === 0 && next !== 0) {
//       target[periodCode] = next;
//     }
//   });
// }

// function sanitize(value) {
//   if (value == null) return "";
//   return String(value).trim();
// }

// function toNumber(value) {
//   if (value == null || value === "") return 0;
//   if (typeof value === "number") return Number.isFinite(value) ? value : 0;

//   const parsed = Number(String(value).replace(/,/g, "").trim());
//   return Number.isFinite(parsed) ? parsed : 0;
// }

// function formatNumberDisplay(value) {
//   const num = toNumber(value);
//   return num.toLocaleString("en-US", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
// }

// function formatCutoffHeaderLabel(cutoffCode) {
//   const safe = sanitize(cutoffCode);
//   if (!/^\d{6}$/.test(safe)) return safe;

//   const year = Number(safe.slice(0, 4));
//   const month = Number(safe.slice(4, 6));
//   const date = new Date(year, month - 1, 1);

//   return date.toLocaleString("en-US", {
//     month: "short",
//     year: "numeric",
//   });
// }

// function getAmountClassDesktop(value, rowType) {
//   const num = toNumber(value);

//   if (num < 0) {
//     return rowType === "fs"
//       ? "text-[12px] font-normal text-red-600"
//       : "text-[11px] font-normal text-red-600";
//   }

//   if (num > 0) {
//     return rowType === "fs"
//       ? "text-[12px] font-normal text-gray-700"
//       : "text-[11px] font-normal text-gray-700";
//   }

//   return "text-[11px] font-normal text-gray-400";
// }

// function getAmountClassMobile(value, rowType, compact = false) {
//   const num = toNumber(value);
//   const sizeClass =
//     rowType === "fs"
//       ? compact
//         ? "text-[11px]"
//         : "text-[11.5px]"
//       : compact
//       ? "text-[10.5px]"
//       : "text-[11px]";

//   if (num < 0) return `${sizeClass} font-normal text-red-600 tabular-nums`;
//   if (num > 0) return `${sizeClass} font-normal text-slate-700 tabular-nums`;
//   return `${sizeClass} font-normal text-slate-400 tabular-nums`;
// }

// function getTypeMeta(node) {
//   if (node.rowType === "detail" && node.detailType === "RC") {
//     return {
//       label: "RC",
//       icon: faBuilding,
//       iconClass: "text-[10px]",
//       badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
//     };
//   }

//   if (node.rowType === "detail" && node.detailType === "SL") {
//     return {
//       label: "SL",
//       icon: faAddressBook,
//       iconClass: "text-[10px]",
//       badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
//     };
//   }

//   if (node.rowType === "account") {
//     return {
//       label: "GL",
//       icon: faCircleInfo,
//       iconClass: "text-[10px]",
//       badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
//     };
//   }

//   return {
//     label: "FS",
//     icon: faFolderTree,
//     iconClass: "text-[10px]",
//     badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
//   };
// }

// BalSheetYTDReport.meta = {
//   key: "balSheetYTD",
//   label: "Balance Sheet YTD",
//   icon: faMoneyBillTrendUp,
//   filters: ["Branch", "Cut Off", "RC Code", "Currency", "Compare Years"],
//   endpoint: "getBSIS_YTD",
// };

// BalSheetYTDReport.buildPayload = (f) => ({
//   branchCode: f.branchCode || "",
//   cutoffCode: f.cutoffCode || "",
//   rcCode: f.rcCode || "",
//   currCode: f.currCode || "PHP",
//   compareYears: f.compareYears || 1,
// });

// BalSheetYTDReport.buildJsonData = (payload) => ({
//   mode: "data",
//   branchCode: payload.branchCode || "",
//   cutoffCode: payload.cutoffCode || "",
//   rcCode: payload.rcCode || "",
//   currCode: payload.currCode || "PHP",
// });

// export default BalSheetYTDReport;

import React, { useMemo, useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillTrendUp,
  faChevronRight,
  faChevronDown,
  faFolderTree,
  faBuilding,
  faAddressBook,
  faCircleInfo,
  faArrowUpRightFromSquare,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

function BalSheetYTDReport({
  view,
  tabConfig,
  NoRecordsState,
  onJumpToGLInquiry,
  expandedMap = {},
  setExpandedMap,
  isMobile = false,
  mobileView = "table",
}) {
  const [mobilePath, setMobilePath] = useState([]);
  const [mobileAnimKey, setMobileAnimKey] = useState(0);
  const [mobileAnimDirection, setMobileAnimDirection] = useState("forward");

  const periods = useMemo(() => {
    return Array.isArray(view?.comparisonPeriods) && view.comparisonPeriods.length > 0
      ? view.comparisonPeriods
      : [];
  }, [view?.comparisonPeriods]);

  const treeData = useMemo(
    () => buildBalanceSheetTree(view?.rows || [], periods),
    [view?.rows, periods]
  );

  useEffect(() => {
    setMobilePath([]);
    setMobileAnimKey((prev) => prev + 1);
    setMobileAnimDirection("forward");
  }, [view?.rows, view?.comparisonPeriods]);

  const safePeriods = periods.length > 0 ? periods : ["CURRENT"];

  const isAllExpanded = useMemo(() => {
    const expandableIds = [];

    const walk = (nodes) => {
      nodes.forEach((node) => {
        if (Array.isArray(node.children) && node.children.length > 0) {
          expandableIds.push(node.id);
          walk(node.children);
        }
      });
    };

    walk(treeData);

    if (!expandableIds.length) return false;
    return expandableIds.every((id) => !!expandedMap[id]);
  }, [treeData, expandedMap]);

  const toggleNode = useCallback(
    (nodeId) => {
      setExpandedMap((prev) => ({
        ...prev,
        [nodeId]: !prev[nodeId],
      }));
    },
    [setExpandedMap]
  );

  const setAllExpanded = useCallback(
    (expand) => {
      if (!expand) {
        setExpandedMap({});
        return;
      }

      const allIds = {};
      const visit = (nodes) => {
        nodes.forEach((node) => {
          if (node.children?.length) {
            allIds[node.id] = true;
            visit(node.children);
          }
        });
      };

      visit(treeData);
      setExpandedMap(allIds);
    },
    [treeData, setExpandedMap]
  );

  const handleExpandCollapseToggle = useCallback(() => {
    setAllExpanded(!isAllExpanded);
  }, [isAllExpanded, setAllExpanded]);

  const handleJumpToGLInquiry = useCallback(
    (node) => {
      if (typeof onJumpToGLInquiry !== "function" || !node?.acctCode) return;

      const isRC = node.rowType === "detail" && node.detailType === "RC";
      const isSL = node.rowType === "detail" && node.detailType === "SL";

      onJumpToGLInquiry({
        acctCode: node.acctCode,
        acctName: node.acctName || "",
        rcCode: isRC ? node.code || "" : "",
        rcName: isRC ? node.label || "" : "",
        slCode: isSL ? node.code || "" : "",
        slName: isSL ? node.label || "" : "",
        fsCode: node.fsCode || "",
        label: node.label || "",
        node,
      });
    },
    [onJumpToGLInquiry]
  );

  const gridTemplateColumns = `minmax(360px, 1.9fr) ${safePeriods
    .map(() => "minmax(140px, 1fr)")
    .join(" ")}`;

  const mobileGridTemplateColumns = `minmax(200px, 1.7fr) ${safePeriods
    .map(() => "minmax(110px, 1fr)")
    .join(" ")}`;

  const currentMobileLevelNodes = useMemo(() => {
    if (!mobilePath.length) return treeData;
    return mobilePath[mobilePath.length - 1]?.children || [];
  }, [mobilePath, treeData]);

  const currentMobileParent = mobilePath.length
    ? mobilePath[mobilePath.length - 1]
    : null;

  const mobileBreadcrumb = useMemo(() => {
    if (!mobilePath.length) return "Financial Statement";
    return mobilePath.map((x) => x.label).join(" / ");
  }, [mobilePath]);

  const openMobileNode = useCallback((node) => {
    if (!node?.children?.length) return;
    setMobileAnimDirection("forward");
    setMobilePath((prev) => [...prev, node]);
    setMobileAnimKey((prev) => prev + 1);
  }, []);

  const goMobileBack = useCallback(() => {
    setMobileAnimDirection("back");
    setMobilePath((prev) => prev.slice(0, -1));
    setMobileAnimKey((prev) => prev + 1);
  }, []);

  if (!view?.hasLoaded) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
        <BSAnimationStyles />
        <FontAwesomeIcon icon={faMoneyBillTrendUp} className="text-blue-300" />
        <span>
          Click <b>Filter</b> then <b>Apply Filters</b> to load <b>{tabConfig.label}</b>.
        </span>
      </div>
    );
  }

  if (view?.isEmpty) {
    return (
      <>
        <BSAnimationStyles />
        <NoRecordsState
          title="No records found"
          subtitle={view.emptyMessage || "Try adjusting your filters."}
          hint={`Report: ${tabConfig.label}`}
        />
      </>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      <BSAnimationStyles />

      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[13px] font-medium text-gray-700">
              Drilldown Financial Statement
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              Expand FS groups to view account details, then RC / SL details.
            </div>
          </div>

          {!isMobile ? (
            <div className="hidden md:flex md:items-center">
              <button
                type="button"
                onClick={handleExpandCollapseToggle}
                className={`inline-flex items-center rounded-lg border px-3 py-2 text-[11px] font-medium transition ${
                  isAllExpanded
                    ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-slate-200 bg-slate-50 text-gray-700 hover:bg-slate-100"
                }`}
              >
                {isAllExpanded ? "Collapse All" : "Expand All"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* DESKTOP / TABLET */}
      <div className="hidden md:block">
        <div className="max-h-[600px] overflow-auto">
          <div
            className="min-w-max"
            style={{ minWidth: `${360 + safePeriods.length * 140}px` }}
          >
            <div
              className="sticky top-0 z-20 grid border-b border-blue-300 bg-blue-100 text-[11px] font-normal text-blue-900 shadow-sm"
              style={{ gridTemplateColumns }}
            >
              <div className="border-r border-blue-200 bg-blue-100 px-4 py-2.5">
                Particulars
              </div>

              {safePeriods.map((periodCode, idx) => (
                <div
                  key={periodCode}
                  className={`bg-blue-100 px-4 py-2.5 text-right ${
                    idx < safePeriods.length - 1 ? "border-r border-blue-200" : ""
                  }`}
                >
                  {periodCode === "CURRENT"
                    ? "Amount"
                    : formatCutoffHeaderLabel(periodCode)}
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-200">
              {treeData.map((node) => (
                <BalanceSheetNodeRowDesktop
                  key={node.id}
                  node={node}
                  level={0}
                  periods={safePeriods}
                  gridTemplateColumns={gridTemplateColumns}
                  expandedMap={expandedMap}
                  onToggle={toggleNode}
                  onJumpToGLInquiry={handleJumpToGLInquiry}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="block overflow-x-hidden md:hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Mobile View
              </div>
              <div className="truncate text-[11px] text-slate-600">{mobileBreadcrumb}</div>
            </div>
          </div>

          {mobilePath.length > 0 ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={goMobileBack}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                Back
              </button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-hidden bg-slate-50/50 p-3">
          <div
            key={mobileAnimKey}
            className={
              mobileAnimDirection === "back"
                ? "bs-mobile-slide-back"
                : "bs-mobile-slide-forward"
            }
          >
            {mobileView === "card" ? (
              <div className="space-y-2">
                {currentMobileLevelNodes.map((node) => (
                  <BalanceSheetNodeRowMobileCard
                    key={node.id}
                    node={node}
                    periods={safePeriods}
                    onOpenNode={openMobileNode}
                    onJumpToGLInquiry={handleJumpToGLInquiry}
                    currentParent={currentMobileParent}
                  />
                ))}
              </div>
            ) : (
              <BalanceSheetMobileTableView
                nodes={currentMobileLevelNodes}
                periods={safePeriods}
                onOpenNode={openMobileNode}
                onJumpToGLInquiry={handleJumpToGLInquiry}
                gridTemplateColumns={mobileGridTemplateColumns}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetNodeRowDesktop({
  node,
  level,
  periods,
  gridTemplateColumns,
  expandedMap,
  onToggle,
  onJumpToGLInquiry,
}) {
  const isExpanded = !!expandedMap[node.id];
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const paddingLeft = 14 + level * 20;

  const canJumpToGL = node.rowType === "account" && !!node.acctCode;
  const canJumpToRC =
    node.rowType === "detail" &&
    node.detailType === "RC" &&
    !!node.acctCode &&
    !!node.code;
  const canJumpToSL =
    node.rowType === "detail" &&
    node.detailType === "SL" &&
    !!node.acctCode &&
    !!node.code;

  const isClickableLabel =
    (canJumpToGL || canJumpToRC || canJumpToSL) &&
    typeof onJumpToGLInquiry === "function";

  const rowClass =
    node.rowType === "fs"
      ? "bg-slate-50/70 text-gray-700"
      : node.rowType === "account"
      ? "bg-white text-gray-700"
      : "bg-white text-gray-600";

  const handleRowJump = () => {
    if (!isClickableLabel) return;
    onJumpToGLInquiry(node);
  };

  return (
    <>
      <div
        className={`grid items-center border-b border-slate-100 ${rowClass} transition hover:bg-blue-50/20`}
        style={{ gridTemplateColumns }}
      >
        <div
          className="border-r border-slate-100 px-4 py-2"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <div className="group flex min-h-[26px] items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-white text-gray-500 transition-transform duration-200 hover:bg-slate-100"
              >
                <FontAwesomeIcon
                  icon={isExpanded ? faChevronDown : faChevronRight}
                  className="text-[9px]"
                />
              </button>
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-300">
                <span className="text-[9px]">•</span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleRowJump}
                  className={`min-w-0 flex-1 text-left leading-5 ${
                    node.rowType === "fs"
                      ? "text-[12px] font-normal"
                      : node.rowType === "account"
                      ? "text-[11.5px] font-normal"
                      : "text-[11px] font-normal"
                  } ${
                    isClickableLabel
                      ? "cursor-pointer text-blue-700 transition hover:text-blue-800 hover:underline"
                      : "cursor-default text-gray-700"
                  }`}
                  title={node.label}
                >
                  <span className="block truncate group-hover:pr-2 group-hover:truncate">
                    {node.label}
                  </span>
                </button>

                {canJumpToGL || canJumpToRC || canJumpToSL ? (
                  <button
                    type="button"
                    onClick={handleRowJump}
                    className="hidden shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 transition hover:bg-blue-100 group-hover:inline-flex"
                    title={
                      canJumpToGL
                        ? `Open GL Inquiry for ${node.acctCode}`
                        : `Open GL Inquiry for ${node.acctCode} / ${node.code}`
                    }
                  >
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon
                        icon={faArrowUpRightFromSquare}
                        className="text-[9px]"
                      />
                      {canJumpToRC ? "RC Inquiry" : canJumpToSL ? "SL Inquiry" : "GL Inquiry"}
                    </span>
                  </button>
                ) : null}
              </div>

              {node.subLabel ? (
                <div className="truncate text-[10px] leading-4 text-gray-400">
                  {node.subLabel}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {periods.map((periodCode, idx) => {
          const rawAmount = toNumber(node.amounts?.[periodCode]);
          const displayAmount =
            node.rowType === "fs" && hasChildren && isExpanded ? 0 : rawAmount;

          return (
            <div
              key={`${node.id}-${periodCode}`}
              className={`px-4 py-2 text-right tabular-nums ${
                idx < periods.length - 1 ? "border-r border-slate-100" : ""
              }`}
            >
              <span className={getAmountClassDesktop(displayAmount, node.rowType)}>
                {formatNumberDisplay(displayAmount)}
              </span>
            </div>
          );
        })}
      </div>

      {hasChildren && isExpanded ? (
        <div className="bs-desktop-expand">
          {node.children.map((child) => (
            <BalanceSheetNodeRowDesktop
              key={child.id}
              node={child}
              level={level + 1}
              periods={periods}
              gridTemplateColumns={gridTemplateColumns}
              expandedMap={expandedMap}
              onToggle={onToggle}
              onJumpToGLInquiry={onJumpToGLInquiry}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function BalanceSheetNodeRowMobileCard({
  node,
  periods,
  onOpenNode,
  onJumpToGLInquiry,
  currentParent,
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const typeMeta = getTypeMeta(node);
  const compactAmounts = periods.length > 1;

  const canJumpToGL = node.rowType === "account" && !!node.acctCode;
  const canJumpToRC =
    node.rowType === "detail" &&
    node.detailType === "RC" &&
    !!node.acctCode &&
    !!node.code;
  const canJumpToSL =
    node.rowType === "detail" &&
    node.detailType === "SL" &&
    !!node.acctCode &&
    !!node.code;

  const isClickableLabel =
    (canJumpToGL || canJumpToRC || canJumpToSL) &&
    typeof onJumpToGLInquiry === "function";

  const handleRowJump = () => {
    if (!isClickableLabel) return;
    onJumpToGLInquiry(node);
  };

  const containerClass =
    node.rowType === "fs"
      ? "border-blue-200 bg-blue-50/70"
      : "border-slate-200 bg-white";

  const firstAmount = periods[0] ? toNumber(node.amounts?.[periods[0]]) : 0;
  const allowNextPage = hasChildren && (node.rowType !== "fs" || firstAmount > 0);

  return (
    <div className={`overflow-hidden rounded-xl border shadow-sm ${containerClass}`}>
      <div className={`${compactAmounts ? "p-2.5" : "p-3"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${typeMeta.badgeClass}`}
              >
                <FontAwesomeIcon icon={typeMeta.icon} className={typeMeta.iconClass} />
                <span>{typeMeta.label}</span>
              </div>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleRowJump}
                  className={`block min-w-0 text-left leading-5 ${
                    compactAmounts
                      ? "text-[12px] font-normal text-slate-700"
                      : "text-[12.5px] font-normal text-slate-700"
                  } ${
                    isClickableLabel
                      ? "cursor-pointer text-blue-700 hover:underline"
                      : "cursor-default"
                  }`}
                  title={node.label}
                >
                  <span className="break-words">{node.label}</span>
                </button>

                {node.subLabel ? (
                  <div className="mt-0.5 text-[10px] text-slate-400">{node.subLabel}</div>
                ) : currentParent?.rowType === "fs" && node.acctCode ? (
                  <div className="mt-0.5 text-[10px] text-slate-400">{node.acctCode}</div>
                ) : null}
              </div>
            </div>
          </div>

          {allowNextPage ? (
            <button
              type="button"
              onClick={() => onOpenNode(node)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 active:scale-[0.98]"
              title={`Open ${node.label}`}
            >
              Next
              <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
            </button>
          ) : null}
        </div>

        {(canJumpToGL || canJumpToRC || canJumpToSL) && (
          <div className={`${compactAmounts ? "mt-2" : "mt-2.5"}`}>
            <button
              type="button"
              onClick={handleRowJump}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
            >
              <FontAwesomeIcon
                icon={faArrowUpRightFromSquare}
                className="text-[9px]"
              />
              {canJumpToRC ? "RC Inquiry" : canJumpToSL ? "SL Inquiry" : "GL Inquiry"}
            </button>
          </div>
        )}

        <div className={`${compactAmounts ? "mt-2 space-y-1" : "mt-3 space-y-1.5"}`}>
          {periods.map((periodCode) => {
            const rawAmount = toNumber(node.amounts?.[periodCode]);

            return (
              <div
                key={`${node.id}-${periodCode}`}
                className={`flex items-center justify-between gap-2 rounded-md bg-slate-50 ${
                  compactAmounts ? "px-2 py-1.5" : "px-2.5 py-2"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  {periodCode === "CURRENT"
                    ? "Amount"
                    : formatCutoffHeaderLabel(periodCode)}
                </div>

                <div className={getAmountClassMobile(rawAmount, node.rowType, compactAmounts)}>
                  {formatNumberDisplay(rawAmount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BalanceSheetMobileTableView({
  nodes,
  periods,
  onOpenNode,
  onJumpToGLInquiry,
  gridTemplateColumns,
}) {
  const compact = periods.length > 1;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div
          className="min-w-max"
          style={{ minWidth: `${200 + periods.length * 110}px` }}
        >
          <div
            className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-100 text-[10px] font-normal text-slate-600"
            style={{ gridTemplateColumns }}
          >
            <div className="border-r border-slate-200 bg-slate-100 px-3 py-2">
              Particulars
            </div>
            {periods.map((periodCode, idx) => (
              <div
                key={periodCode}
                className={`bg-slate-100 px-3 py-2 text-right ${
                  idx < periods.length - 1 ? "border-r border-slate-200" : ""
                }`}
              >
                {periodCode === "CURRENT"
                  ? "Amount"
                  : formatCutoffHeaderLabel(periodCode)}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {nodes.map((node) => {
              const hasChildren = Array.isArray(node.children) && node.children.length > 0;

              const canJumpToGL = node.rowType === "account" && !!node.acctCode;
              const canJumpToRC =
                node.rowType === "detail" &&
                node.detailType === "RC" &&
                !!node.acctCode &&
                !!node.code;
              const canJumpToSL =
                node.rowType === "detail" &&
                node.detailType === "SL" &&
                !!node.acctCode &&
                !!node.code;

              const isClickableLabel =
                (canJumpToGL || canJumpToRC || canJumpToSL) &&
                typeof onJumpToGLInquiry === "function";

              const firstAmount = periods[0]
                ? toNumber(node.amounts?.[periods[0]])
                : 0;

              const allowNextPage =
                hasChildren && (node.rowType !== "fs" || firstAmount > 0);

              return (
                <div
                  key={node.id}
                  className="grid items-center text-[11px]"
                  style={{ gridTemplateColumns }}
                >
                  <div className="border-r border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isClickableLabel) onJumpToGLInquiry(node);
                        }}
                        className={`min-w-0 truncate text-left ${
                          isClickableLabel
                            ? "text-blue-700 hover:underline"
                            : "text-slate-700"
                        } font-normal`}
                        title={node.label}
                      >
                        {node.label}
                      </button>

                      {allowNextPage ? (
                        <button
                          type="button"
                          onClick={() => onOpenNode(node)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 active:scale-[0.98]"
                        >
                          Next
                          <FontAwesomeIcon icon={faChevronRight} className="text-[8px]" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {periods.map((periodCode, idx) => {
                    const amount = toNumber(node.amounts?.[periodCode]);
                    return (
                      <div
                        key={`${node.id}-${periodCode}`}
                        className={`px-3 py-2 text-right tabular-nums ${
                          idx < periods.length - 1 ? "border-r border-slate-100" : ""
                        }`}
                      >
                        <span className={getAmountClassMobile(amount, node.rowType, compact)}>
                          {formatNumberDisplay(amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildBalanceSheetTree(rows, periods) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const safePeriods = periods.length > 0 ? periods : ["CURRENT"];
  const fsMap = new Map();
  const acctMap = new Map();

  rows.forEach((row, index) => {
    const fsCode = sanitize(row?.fsconso_code);
    const fsName = sanitize(row?.fsconso_name);
    const acctCode = sanitize(row?.acct_code);
    const acctName = sanitize(row?.acct_name);
    const rcCode = sanitize(row?.rc_code);
    const rcName = sanitize(row?.rc_name);
    const slCode = sanitize(row?.sl_code);
    const slName = sanitize(row?.sl_name);

    if (!fsCode) return;

    if (!fsMap.has(fsCode)) {
      fsMap.set(fsCode, {
        id: `fs-${fsCode}`,
        rowType: "fs",
        code: fsCode,
        label: fsName || fsCode,
        subLabel: "",
        amounts: buildAmountsByType(row, safePeriods, "fs"),
        sortIndex: index,
        children: [],
      });
    } else {
      const existingFs = fsMap.get(fsCode);
      mergeAmounts(
        existingFs.amounts,
        buildAmountsByType(row, safePeriods, "fs"),
        safePeriods
      );

      if (!existingFs.label && fsName) {
        existingFs.label = fsName;
      }
    }

    if (!acctCode) return;

    const acctKey = `${fsCode}|${acctCode}`;

    if (!acctMap.has(acctKey)) {
      const accountNode = {
        id: `acct-${fsCode}-${acctCode}`,
        rowType: "account",
        fsCode,
        acctCode,
        acctName,
        label: `${acctCode}${acctName ? ` - ${acctName}` : ""}`,
        subLabel: "",
        amounts: buildAmountsByType(row, safePeriods, "account"),
        sortIndex: index,
        children: [],
      };

      acctMap.set(acctKey, accountNode);
      fsMap.get(fsCode).children.push(accountNode);
    } else {
      const existingAcct = acctMap.get(acctKey);
      mergeAmounts(
        existingAcct.amounts,
        buildAmountsByType(row, safePeriods, "account"),
        safePeriods
      );

      if (!existingAcct.label && acctCode) {
        existingAcct.label = `${acctCode}${acctName ? ` - ${acctName}` : ""}`;
      }

      if (!existingAcct.acctName && acctName) {
        existingAcct.acctName = acctName;
      }
    }

    if (slCode) {
      const slNode = {
        id: `sl-${fsCode}-${acctCode}-${slCode}-${index}`,
        rowType: "detail",
        detailType: "SL",
        fsCode,
        acctCode,
        acctName,
        code: slCode,
        label: slName || slCode,
        subLabel: slCode,
        amounts: buildAmountsByType(row, safePeriods, "sl"),
        sortIndex: index,
        children: [],
      };

      acctMap.get(acctKey).children.push(slNode);
      return;
    }

    if (rcCode) {
      const rcNode = {
        id: `rc-${fsCode}-${acctCode}-${rcCode}-${index}`,
        rowType: "detail",
        detailType: "RC",
        fsCode,
        acctCode,
        acctName,
        code: rcCode,
        label: rcName || rcCode,
        subLabel: rcCode,
        amounts: buildAmountsByType(row, safePeriods, "rc"),
        sortIndex: index,
        children: [],
      };

      acctMap.get(acctKey).children.push(rcNode);
    }
  });

  const fsNodes = Array.from(fsMap.values()).sort(
    (a, b) => (a.sortIndex || 0) - (b.sortIndex || 0)
  );

  fsNodes.forEach((fsNode) => {
    fsNode.children.sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0));
    fsNode.children.forEach((acctNode) => {
      acctNode.children.sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0));
    });
  });

  return fsNodes;
}

function buildAmountsByType(row, periods, mode) {
  const amounts = {};

  periods.forEach((periodCode) => {
    if (periodCode === "CURRENT") {
      if (mode === "fs") {
        amounts[periodCode] = toNumber(row?.fs_amount);
      } else if (mode === "account") {
        amounts[periodCode] = toNumber(row?.gl_amount);
      } else if (mode === "rc") {
        amounts[periodCode] = toNumber(row?.rc_amount);
      } else if (mode === "sl") {
        amounts[periodCode] = toNumber(row?.sl_amount);
      } else {
        amounts[periodCode] = 0;
      }
      return;
    }

    if (mode === "fs") {
      amounts[periodCode] = toNumber(row?.periodFsAmounts?.[periodCode]);
    } else if (mode === "account") {
      amounts[periodCode] = toNumber(row?.periodGlAmounts?.[periodCode]);
    } else if (mode === "rc") {
      amounts[periodCode] = toNumber(row?.periodRcAmounts?.[periodCode]);
    } else if (mode === "sl") {
      amounts[periodCode] = toNumber(row?.periodSlAmounts?.[periodCode]);
    } else {
      amounts[periodCode] = toNumber(row?.periodAmounts?.[periodCode]);
    }
  });

  return amounts;
}

function mergeAmounts(target, source, periods) {
  periods.forEach((periodCode) => {
    const current = toNumber(target?.[periodCode]);
    const next = toNumber(source?.[periodCode]);

    if (current === 0 && next !== 0) {
      target[periodCode] = next;
    }
  });
}

function sanitize(value) {
  if (value == null) return "";
  return String(value).trim();
}

function toNumber(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumberDisplay(value) {
  const num = toNumber(value);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCutoffHeaderLabel(cutoffCode) {
  const safe = sanitize(cutoffCode);
  if (!/^\d{6}$/.test(safe)) return safe;

  const year = Number(safe.slice(0, 4));
  const month = Number(safe.slice(4, 6));
  const date = new Date(year, month - 1, 1);

  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getAmountClassDesktop(value, rowType) {
  const num = toNumber(value);

  if (num < 0) {
    return rowType === "fs"
      ? "text-[12px] font-normal text-red-600"
      : "text-[11px] font-normal text-red-600";
  }

  if (num > 0) {
    return rowType === "fs"
      ? "text-[12px] font-normal text-gray-700"
      : "text-[11px] font-normal text-gray-700";
  }

  return "text-[11px] font-normal text-gray-400";
}

function getAmountClassMobile(value, rowType, compact = false) {
  const num = toNumber(value);
  const sizeClass =
    rowType === "fs"
      ? compact
        ? "text-[11px]"
        : "text-[11.5px]"
      : compact
      ? "text-[10.5px]"
      : "text-[11px]";

  if (num < 0) return `${sizeClass} font-normal text-red-600 tabular-nums`;
  if (num > 0) return `${sizeClass} font-normal text-slate-700 tabular-nums`;
  return `${sizeClass} font-normal text-slate-400 tabular-nums`;
}

function getTypeMeta(node) {
  if (node.rowType === "detail" && node.detailType === "RC") {
    return {
      label: "RC",
      icon: faBuilding,
      iconClass: "text-[10px]",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (node.rowType === "detail" && node.detailType === "SL") {
    return {
      label: "SL",
      icon: faAddressBook,
      iconClass: "text-[10px]",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (node.rowType === "account") {
    return {
      label: "GL",
      icon: faCircleInfo,
      iconClass: "text-[10px]",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "FS",
    icon: faFolderTree,
    iconClass: "text-[10px]",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
  };
}

function BSAnimationStyles() {
  return (
    <style>{`
      @keyframes bsDesktopExpand {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bsMobileSlideForward {
        from {
          opacity: 0;
          transform: translateX(22px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes bsMobileSlideBack {
        from {
          opacity: 0;
          transform: translateX(-22px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .bs-desktop-expand {
        animation: bsDesktopExpand 180ms ease-out;
      }

      .bs-mobile-slide-forward {
        animation: bsMobileSlideForward 220ms ease-out;
        will-change: transform, opacity;
      }

      .bs-mobile-slide-back {
        animation: bsMobileSlideBack 220ms ease-out;
        will-change: transform, opacity;
      }

      @media (prefers-reduced-motion: reduce) {
        .bs-desktop-expand,
        .bs-mobile-slide-forward,
        .bs-mobile-slide-back {
          animation: none !important;
        }
      }
    `}</style>
  );
}

BalSheetYTDReport.meta = {
  key: "balSheetYTD",
  label: "Balance Sheet YTD",
  icon: faMoneyBillTrendUp,
  filters: ["Branch", "Cut Off", "RC Code", "Currency", "Compare Years"],
  endpoint: "getBSIS_YTD",
};

BalSheetYTDReport.buildPayload = (f) => ({
  branchCode: f.branchCode || "",
  cutoffCode: f.cutoffCode || "",
  rcCode: f.rcCode || "",
  currCode: f.currCode || "PHP",
  compareYears: f.compareYears || 1,
  userCode: f.userCode || "",
});

BalSheetYTDReport.buildJsonData = (payload) => ({
  mode: "data",
  branchCode: payload.branchCode || "",
  cutoffCode: payload.cutoffCode || "",
  rcCode: payload.rcCode || "",
  currCode: payload.currCode || "PHP",
  userCode: payload.userCode || "",
});

export default BalSheetYTDReport;