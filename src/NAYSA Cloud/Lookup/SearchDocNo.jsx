

// // import { useEffect, useRef, useState, useCallback } from "react";
// // import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// // import {
// //   faMagnifyingGlass,
// //   faXmark,
// //   faAnglesLeft,
// //   faArrowLeft,
// //   faArrowRight,
// //   faAnglesRight,
// //   faChevronUp,
// // } from "@fortawesome/free-solid-svg-icons";
// // import { useIsTranExist } from "@/NAYSA Cloud/Global/procedure";
// // import Swal from "sweetalert2";

// // const MARGIN = 10; // viewport margin to keep modal from touching edges

// // const AllTranDocNo = ({
// //   isOpen,
// //   onClose,
// //   source,
// //   params,
// //   docNo,
// //   onRetrieve,
// //   onResponse,
// //   onSelected,
// // }) => {
// //   const [mode, setMode] = useState("retrieve"); // "retrieve" | "use"
// //   const docRef = useRef(null);
// //   const [docNoValue, setDocNoValue] = useState(docNo ?? "");
// //   const [collapsed, setCollapsed] = useState(false);

// //   // ── Viewport tracking (for responsive width & bounds) ────────────────────────
// //   const [vw, setVw] = useState(
// //     typeof window !== "undefined" ? window.innerWidth : 1080
// //   );
// //   const [vh, setVh] = useState(
// //     typeof window !== "undefined" ? window.innerHeight : 720
// //   );

// //   useEffect(() => {
// //     const onResize = () => {
// //       setVw(window.innerWidth);
// //       setVh(window.innerHeight);
// //       // After updating vw/vh, also clamp the modal position to the new bounds
// //       clampPositionToViewport();
// //     };
// //     window.addEventListener("resize", onResize);
// //     return () => window.removeEventListener("resize", onResize);
// //   }, []);

// //   // Compute responsive modal width (height is auto)
// //   const modalWidth = Math.min(520, vw - MARGIN * 2);

// //   // ── Drag logic ───────────────────────────────────────────────────────────────
// //   const modalRef = useRef(null);
// //   const [position, setPosition] = useState({
// //     x: vw / 2 - 260,
// //     y: vh / 2 - 200,
// //   });
// //   const [isDragging, setIsDragging] = useState(false);
// //   const [offset, setOffset] = useState({ x: 0, y: 0 });

// //   const getModalRect = () => {
// //     // Safe rect with fallback when ref not yet measured
// //     const rect = modalRef.current?.getBoundingClientRect();
// //     return rect || { width: modalWidth, height: 300, left: position.x, top: position.y };
// //   };

// //   const getBounds = () => {
// //     const rect = getModalRect();
// //     const maxX = Math.max(MARGIN, vw - rect.width - MARGIN);
// //     const maxY = Math.max(MARGIN, vh - rect.height - MARGIN);
// //     return { minX: MARGIN, minY: MARGIN, maxX, maxY };
// //   };

// //   const clampPosition = (x, y) => {
// //     const { minX, minY, maxX, maxY } = getBounds();
// //     return {
// //       x: Math.max(minX, Math.min(x, maxX)),
// //       y: Math.max(minY, Math.min(y, maxY)),
// //     };
// //   };

// //   const clampPositionToViewport = () => {
// //     setPosition((p) => {
// //       const clamped = clampPosition(p.x, p.y);
// //       return clamped;
// //     });
// //   };

// //   const startDrag = useCallback((e) => {
// //     e.preventDefault();
// //     if (!modalRef.current) return;
// //     const r = modalRef.current.getBoundingClientRect();
// //     setIsDragging(true);
// //     setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
// //   }, []);

// //   const stopDrag = useCallback(() => setIsDragging(false), []);

// //   const handleDrag = useCallback(
// //     (e) => {
// //       if (!isDragging) return;
// //       const nextX = e.clientX - offset.x;
// //       const nextY = e.clientY - offset.y;
// //       setPosition(clampPosition(nextX, nextY));
// //     },
// //     [isDragging, offset]
// //   );

// //   useEffect(() => {
// //     window.addEventListener("mousemove", handleDrag);
// //     window.addEventListener("mouseup", stopDrag);
// //     return () => {
// //       window.removeEventListener("mousemove", handleDrag);
// //       window.removeEventListener("mouseup", stopDrag);
// //     };
// //   }, [handleDrag, stopDrag]);

// //   // ── Prop → state initial sync ────────────────────────────────────────────────
// //   useEffect(() => {
// //     if (!isOpen) return;
// //     setMode("retrieve");
// //     setCollapsed(false);
// //     setDocNoValue(docNo ?? "");

// //     // Center on open using current modal width & viewport
// //     const centered = {
// //       x: Math.round((vw - modalWidth) / 2),
// //       y: Math.round((vh - 400) / 2), // rough guess; will be clamped anyway
// //     };
// //     setPosition(clampPosition(centered.x, centered.y));

// //     setTimeout(() => docRef.current?.focus(), 50);
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [isOpen, docNo, vw, vh, modalWidth]);

// //   // Only update from onResponse if not actively editing and value actually differs
// //   useEffect(() => {
// //     const incoming = onResponse?.documentNo;
// //     if (incoming == null) return;
// //     const activeOnInput = document.activeElement === docRef.current;
// //     if (!activeOnInput && incoming !== docNoValue) {
// //       setDocNoValue(incoming ?? "");
// //     }
// //   }, [onResponse, docNoValue]);

// //   // Helper to get the freshest value (ref first, then state)
// //   const getCurrentDocNo = useCallback(() => {
// //     return (docRef.current?.value ?? docNoValue ?? "").trim();
// //   }, [docNoValue]);

// //   // ── Actions ─────────────────────────────────────────────────────────────────
// //   const RetrieveDocument = useCallback(
// //     (modalClose, key) => {
// //       if (mode !== "retrieve") return;
// //       const current = getCurrentDocNo();
// //       onRetrieve?.({ docNo: current, key, modalClose });
// //       console.log(current)
// //     },
// //     [mode, getCurrentDocNo, onRetrieve]
// //   );

// //   const SelectDocument = useCallback(async () => {
// //     if (mode !== "use") return;
// //     const current = getCurrentDocNo();

// //     if (!current) {
// //       await Swal.fire({
// //         icon: "warning",
// //         title: "No Document No.",
// //         text: "Please enter a document number first.",
// //         timer: 1600,
// //         showConfirmButton: false,
// //       });
// //       return;
// //     }

// //     const response = await useIsTranExist(
// //       current,
// //       params?.branchCode,
// //       params?.docType,
// //       params?.fieldNo
// //     );

// //     if (response == 1) {
// //       await Swal.fire({
// //         icon: "info",
// //         title: "Document Conflict",
// //         text: "This document has already been processed and cannot be selected again.",
// //         timer: 2000,
// //         showConfirmButton: false,
// //       });
// //       return;
// //     }

// //     onSelected?.({ docNo: current, branchCode: params?.branchCode });
// //   }, [mode, getCurrentDocNo, onSelected, params, useIsTranExist]);

// //   // ── Keyboard shortcuts ──────────────────────────────────────────────────────
// //   useEffect(() => {
// //     if (!isOpen) return;

// //     const onKey = async (e) => {
// //       if (e.key === "Escape") {
// //         e.preventDefault();
// //         onClose?.();
// //       }
// //       if (e.key === "F6") {
// //         e.preventDefault();
// //         setMode("retrieve");
// //       }
// //       if (e.key === "F7") {
// //         e.preventDefault();
// //         setMode("use");
// //       }
// //       if (e.key === "F8") {
// //         e.preventDefault();
// //         setCollapsed((c) => !c);
// //       }
// //       if (
// //         e.key === "F5" ||
// //         (e.key === "Enter" && document.activeElement === docRef.current)
// //       ) {
// //         e.preventDefault();
// //         if (mode === "retrieve") {
// //           RetrieveDocument(false, "");
// //         } else {
// //           SelectDocument();
// //         }
// //       }
// //     };

// //     window.addEventListener("keydown", onKey);
// //     return () => window.removeEventListener("keydown", onKey);
// //   }, [isOpen, mode, onClose, RetrieveDocument, SelectDocument]);

// //   // ── Render ──────────────────────────────────────────────────────────────────
// //   if (!isOpen) return null;

// //   return (
// //     <div className="fixed inset-0 z-[100] font-sans">
// //       {/* Backdrop */}
// //       <div className="absolute inset-0 bg-black/50" onClick={onClose} />

// //       {/* Modal */}
// //       <div
// //         ref={modalRef}
// //         className="absolute max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-[#1f4b68]/30 select-none"
// //         style={{
// //           width: modalWidth,
// //           left: `${position.x}px`,
// //           top: `${position.y}px`,
// //         }}
// //       >
// //         {/* Header */}
// //         <div
// //           className="flex items-center justify-between px-4 py-2 bg-[#2c6c95] text-white rounded-t-xl cursor-move"
// //           onMouseDown={startDrag}
// //         >
// //           <div className="text-sm font-semibold">
// //             {params?.documentTitle ?? "Document Lookup"}
// //           </div>
// //           <div className="flex items-center gap-1">
// //             <button
// //               onClick={(e) => {
// //                 e.stopPropagation();
// //                 setCollapsed((c) => !c);
// //                 setMode("retrieve");
// //               }}
// //               className="p-1.5 rounded hover:bg-white/10"
// //               title="Collapse (F8)"
// //             >
// //               <FontAwesomeIcon icon={faChevronUp} />
// //             </button>
// //             <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
// //               <FontAwesomeIcon icon={faXmark} />
// //             </button>
// //           </div>
// //         </div>

// //         {/* Navigation Buttons - Visible only in Retrieve mode */}
// //         {mode === "retrieve" && (
// //           <div
// //             className={`px-4 sm:px-6 py-3 sm:py-4 flex justify-center ${
// //               collapsed ? "rounded-t-xl bg-[#f3f7fa]" : ""
// //             }`}
// //             onMouseDown={collapsed ? startDrag : undefined}
// //           >
// //             <div className="flex flex-wrap justify-center gap-2">
// //               {[
// //                 { icon: faAnglesLeft, label: "First", key: "F" },
// //                 { icon: faArrowLeft, label: "Previous", key: "P" },
// //                 { icon: faArrowRight, label: "Next", key: "N" },
// //                 { icon: faAnglesRight, label: "Last", key: "L" },
// //               ].map((btn) => (
// //                 <button
// //                   key={btn.key}
// //                   className="px-3 py-2 text-xs font-semibold rounded-md bg-[#eaf2f7] text-[#1f4b68] hover:bg-white shadow-sm flex items-center"
// //                   onClick={() => RetrieveDocument(true, btn.key)}
// //                 >
// //                   <FontAwesomeIcon icon={btn.icon} className="mr-1" />
// //                   {btn.label}
// //                 </button>
// //               ))}
// //             </div>
// //           </div>
// //         )}

// //         {/* Body */}
// //         {!collapsed && (
// //           <div className="px-4 sm:px-6 pb-5 pt-2">
// //             {/* Branch */}
// //             <div className="mb-4">
// //               <label className="text-xs text-slate-600 mb-1 block">Branch</label>
// //               <div className="flex items-center rounded-md h-12 px-3 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
// //                 <span className="flex-1 text-2xl sm:text-3xl font-bold text-[#1f4b68]">
// //                   {params?.branchName ?? ""}
// //                 </span>
// //                 <FontAwesomeIcon
// //                   icon={faMagnifyingGlass}
// //                   className="ml-3 opacity-0 pointer-events-none"
// //                 />
// //               </div>
// //             </div>

// //             {/* Document No */}
// //             <div className="mb-6">
// //               <label className="text-xs text-slate-600 mb-1 block">
// //                 Document No.
// //               </label>
// //               <input
// //                 ref={docRef}
// //                 value={docNoValue}
// //                 onChange={(e) => setDocNoValue(e.target.value)}
// //                 className="peer global-tran-textbox-ui !h-16 !py-4 text-2xl sm:text-3xl font-bold tracking-[0.25em] text-center text-[#1f4b68] bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-[#2c6c95]/60 w-full"
// //                 placeholder="00000000"
// //               />
// //             </div>

// //             {/* Primary Button */}
// //             <div className="flex justify-center">
// //               <button
// //                 onClick={() => {
// //                   if (mode === "retrieve") {
// //                     RetrieveDocument(false, "");
// //                   } else {
// //                     SelectDocument();
// //                   }
// //                 }}
// //                 className={`px-6 py-2.5 rounded-md font-semibold text-sm shadow-md transition ${
// //                   mode === "retrieve"
// //                     ? "bg-[#eaf2f7] text-[#1f4b68] hover:bg-white"
// //                     : "bg-[#d1e4f2] text-[#1f4b68] hover:bg-white"
// //                 }`}
// //               >
// //                 {mode === "retrieve"
// //                   ? "Find and Retrieve (F5)"
// //                   : "Apply Document No (F5)"}
// //               </button>
// //             </div>
// //           </div>
// //         )}

// //         {/* Footer Tabs */}
// //         {!collapsed && (
// //           <div className="flex items-center justify-between px-4 py-2 bg-[#eaf2f7] border-t border-slate-200 rounded-b-xl text-[#1f4b68] font-semibold text-xs">
// //             <button
// //               onClick={() => setMode("retrieve")}
// //               className={`px-3 py-1 rounded-md transition ${
// //                 mode === "retrieve"
// //                   ? "bg-[#2c6c95] text-white shadow-sm"
// //                   : "hover:bg-[#d6e5ef]"
// //               }`}
// //             >
// //               Retrieve Selected Document (F6)
// //             </button>
// //             <button
// //               onClick={() => setMode("use")}
// //               className={`px-3 py-1 rounded-md transition ${
// //                 mode === "use"
// //                   ? "bg-[#2c6c95] text-white shadow-sm"
// //                   : "hover:bg-[#d6e5ef]"
// //               }`}
// //             >
// //               Use Selected Document (F7)
// //             </button>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default AllTranDocNo;



// import { useEffect, useRef, useState, useCallback } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faMagnifyingGlass,
//   faXmark,
//   faAnglesLeft,
//   faArrowLeft,
//   faArrowRight,
//   faAnglesRight,
//   faChevronUp,
// } from "@fortawesome/free-solid-svg-icons";
// import { useIsTranExist } from "@/NAYSA Cloud/Global/procedure";
// import Swal from "sweetalert2";

// const MARGIN = 10;

// const AllTranDocNo = ({
//   isOpen,
//   onClose,
//   source,
//   params,
//   docNo,
//   onRetrieve,
//   onResponse,
//   onSelected,
// }) => {
//   const docRef = useRef(null);
//   const modalRef = useRef(null);

//   const [mode, setMode] = useState("retrieve");
//   const [docNoValue, setDocNoValue] = useState(docNo ?? "");
//   const [collapsed, setCollapsed] = useState(false);

//   const [vw, setVw] = useState(
//     typeof window !== "undefined" ? window.innerWidth : 1080
//   );
//   const [vh, setVh] = useState(
//     typeof window !== "undefined" ? window.innerHeight : 720
//   );

//   const [position, setPosition] = useState({
//     x: vw / 2 - 260,
//     y: vh / 2 - 180,
//   });
//   const [isDragging, setIsDragging] = useState(false);
//   const [offset, setOffset] = useState({ x: 0, y: 0 });

//   const isMobile = vw < 640;

//   useEffect(() => {
//     const onResize = () => {
//       setVw(window.innerWidth);
//       setVh(window.innerHeight);
//       clampPositionToViewport();
//     };

//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);

//   const modalWidth = isMobile
//     ? Math.min(340, vw - MARGIN * 2)
//     : Math.min(380, vw - MARGIN * 2);

//   const getModalRect = () => {
//     const rect = modalRef.current?.getBoundingClientRect();
//     return (
//       rect || {
//         width: modalWidth,
//         height: isMobile ? 250 : 300,
//         left: position.x,
//         top: position.y,
//       }
//     );
//   };

//   const getBounds = () => {
//     const rect = getModalRect();
//     const maxX = Math.max(MARGIN, vw - rect.width - MARGIN);
//     const maxY = Math.max(MARGIN, vh - rect.height - MARGIN);
//     return { minX: MARGIN, minY: MARGIN, maxX, maxY };
//   };

//   const clampPosition = useCallback(
//     (x, y) => {
//       const { minX, minY, maxX, maxY } = getBounds();
//       return {
//         x: Math.max(minX, Math.min(x, maxX)),
//         y: Math.max(minY, Math.min(y, maxY)),
//       };
//     },
//     [vw, vh, modalWidth, position.x, position.y]
//   );

//   const clampPositionToViewport = useCallback(() => {
//     setPosition((p) => clampPosition(p.x, p.y));
//   }, [clampPosition]);

//   const startDrag = useCallback((e) => {
//     e.preventDefault();
//     if (!modalRef.current) return;
//     const r = modalRef.current.getBoundingClientRect();
//     setIsDragging(true);
//     setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
//   }, []);

//   const stopDrag = useCallback(() => setIsDragging(false), []);

//   const handleDrag = useCallback(
//     (e) => {
//       if (!isDragging) return;
//       const nextX = e.clientX - offset.x;
//       const nextY = e.clientY - offset.y;
//       setPosition(clampPosition(nextX, nextY));
//     },
//     [isDragging, offset, clampPosition]
//   );

//   useEffect(() => {
//     window.addEventListener("mousemove", handleDrag);
//     window.addEventListener("mouseup", stopDrag);
//     return () => {
//       window.removeEventListener("mousemove", handleDrag);
//       window.removeEventListener("mouseup", stopDrag);
//     };
//   }, [handleDrag, stopDrag]);

//   useEffect(() => {
//     if (!isOpen) return;

//     setMode("retrieve");
//     setCollapsed(false);
//     setDocNoValue(docNo ?? "");

//     const centered = {
//       x: Math.round((vw - modalWidth) / 2),
//       y: Math.round((vh - (isMobile ? 300 : 380)) / 2),
//     };

//     setPosition(clampPosition(centered.x, centered.y));
//   }, [isOpen, docNo, vw, vh, modalWidth, isMobile, clampPosition]);

//   useEffect(() => {
//     const incoming = onResponse?.documentNo;
//     if (incoming == null) return;

//     const activeOnInput = document.activeElement === docRef.current;
//     if (!activeOnInput && incoming !== docNoValue) {
//       setDocNoValue(incoming ?? "");
//     }
//   }, [onResponse, docNoValue]);

//   const getCurrentDocNo = useCallback(() => {
//     return (docRef.current?.value ?? docNoValue ?? "").trim();
//   }, [docNoValue]);

//   const RetrieveDocument = useCallback(
//     (modalClose, key) => {
//       if (mode !== "retrieve") return;
//       const current = getCurrentDocNo();

//       const fetchedDocumentNo = String(onResponse?.documentNo ?? "").trim();
//       const isManualRetrieve = !key;

//       if (isManualRetrieve && current && current === fetchedDocumentNo) {
//         onClose?.();
//         return;
//       }

//       onRetrieve?.({ docNo: current, key, modalClose });
//       console.log(current);
//     },
//     [mode, getCurrentDocNo, onRetrieve, onResponse, onClose]
//   );

//   const SelectDocument = useCallback(async () => {
//     if (mode !== "use") return;

//     const current = getCurrentDocNo();

//     if (!current) {
//       await Swal.fire({
//         icon: "warning",
//         title: "No Document No.",
//         text: "Please enter a document number first.",
//         timer: 1600,
//         showConfirmButton: false,
//       });
//       return;
//     }

//     const response = await useIsTranExist(
//       current,
//       params?.branchCode,
//       params?.docType,
//       params?.fieldNo
//     );

//     if (response == 1) {
//       await Swal.fire({
//         icon: "info",
//         title: "Document Conflict",
//         text: "This document has already been processed and cannot be selected again.",
//         timer: 2000,
//         showConfirmButton: false,
//       });
//       return;
//     }

//     onSelected?.({ docNo: current, branchCode: params?.branchCode });
//   }, [mode, getCurrentDocNo, onSelected, params]);

//   useEffect(() => {
//     if (!isOpen) return;

//     const onKey = async (e) => {
//       if (e.key === "Escape") {
//         e.preventDefault();
//         onClose?.();
//       }
//       if (e.key === "F6") {
//         e.preventDefault();
//         setMode("retrieve");
//       }
//       if (e.key === "F7") {
//         e.preventDefault();
//         setMode("use");
//       }
//       if (e.key === "F8") {
//         e.preventDefault();
//         setCollapsed((c) => !c);
//       }
//       if (
//         e.key === "F5" ||
//         (e.key === "Enter" && document.activeElement === docRef.current)
//       ) {
//         e.preventDefault();
//         if (mode === "retrieve") {
//           RetrieveDocument(false, "");
//         } else {
//           SelectDocument();
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [isOpen, mode, onClose, RetrieveDocument, SelectDocument]);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[100] font-sans">
//       <div className="absolute inset-0 bg-black/50" onClick={onClose} />

//       <div
//         ref={modalRef}
//         className="absolute max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-blue-300 select-none overflow-hidden"
//         style={{
//           width: modalWidth,
//           left: `${position.x}px`,
//           top: `${position.y}px`,
//         }}
//       >
//         {/* Header */}
//         <div
//           className="flex items-center justify-between px-3 sm:px-3 bg-blue-100 text-slate-800 cursor-move"
//           onMouseDown={startDrag}
//         >
//           <div className="text-xs sm:text-sm font-semibold truncate pr-2 text-blue-900">
//             {params?.documentTitle ?? "Document Lookup"}
//           </div>

//           <div className="flex items-center gap-1 shrink-0">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setCollapsed((c) => !c);
//                 setMode("retrieve");
//               }}
//               className="p-1.5 rounded hover:bg-blue-200 transition"
//               title="Collapse (F8)"
//             >
//               <FontAwesomeIcon icon={faChevronUp} className="text-xs" />
//             </button>
//             <button
//               onClick={onClose}
//               className="p-1.5 rounded hover:bg-blue-200 transition"
//             >
//               <FontAwesomeIcon icon={faXmark} className="text-xs" />
//             </button>
//           </div>
//         </div>

//         {/* Navigation */}
//        {mode === "retrieve" && (
//         <div
//           className={`px-3 sm:px-4 py-2 sm:py-3 flex justify-center ${
//             collapsed ? "bg-slate-50" : ""
//           }`}
//           onMouseDown={collapsed ? startDrag : undefined}
//         >
//        <div className="flex w-full sm:w-auto sm:mx-auto gap-1 sm:gap-2">
//           {[
//             { icon: faAnglesLeft, label: "First", key: "F" },
//             { icon: faArrowLeft, label: "Previous", key: "P" },
//             { icon: faArrowRight, label: "Next", key: "N" },
//             { icon: faAnglesRight, label: "Last", key: "L" },
//           ].map((btn) => (
//             <button
//               key={btn.key}
//               type="button"
//               className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-semibold rounded-md bg-blue-50 text-sky-900 hover:bg-blue-100 shadow-md flex items-center justify-center whitespace-nowrap min-w-0"
//               onMouseDown={(e) => e.preventDefault()}
//               onClick={() => RetrieveDocument(true, btn.key)}
//             >
//               <FontAwesomeIcon icon={btn.icon} className="mr-1" />
//               <span className="truncate">{btn.label}</span>
//             </button>
//           ))}
//         </div>
//         </div>
//       )}

//         {!collapsed && (
//           <div className="px-3 sm:px-4 pb-4 sm:pb-5 pt-2">
//             {/* Branch */}
//             <div className="mb-3 sm:mb-2">
//               <label className="text-[11px] sm:text-xs text-slate-600 mb-1 block">
//                 Branch
//               </label>
//               <div className="flex items-center rounded-md h-10 sm:h-10 px-2 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
//                 <span className="flex-1 text-sm sm:text-base font-bold text-sky-900 truncate">
//                   {params?.branchName ?? ""}
//                 </span>
//                 <FontAwesomeIcon
//                   icon={faMagnifyingGlass}
//                   className="ml-3 opacity-0 pointer-events-none"
//                 />
//               </div>
//             </div>

//             {/* Document No */}
//             <div className="mb-4 sm:mb-6">
//               <label className="text-[11px] sm:text-xs text-slate-600 mb-1 block">
//                 Document No.
//               </label>
//               <input
//                 ref={docRef}
//                 value={docNoValue}
//                 onChange={(e) => setDocNoValue(e.target.value)}
//                 className="peer global-tran-textbox-ui !h-10 sm:!h-10 !py-2 sm:!py-4 text-sm sm:text-xl font-bold tracking-[0.12em] sm:tracking-[0.25em] text-center text-sky-900 bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-blue-300 w-full"
//                 placeholder="00000000"
//               />
//             </div>

//             {/* Primary Button */}
//             <div className="flex justify-center">
//              <button
//                   type="button"
//                   onMouseDown={(e) => e.preventDefault()}
//                   onClick={() => {
//                     if (mode === "retrieve") {
//                       RetrieveDocument(false, "");
//                     } else {
//                       SelectDocument();
//                     }
//                   }}
//                   className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-semibold text-xs sm:text-[11px] shadow-md transition ${
//                     mode === "retrieve"
//                       ? "bg-blue-50 text-sky-900 hover:bg-blue-100"
//                       : "bg-blue-50 text-sky-900 hover:bg-blue-100"
//                   }`}
//                 >
//                   {mode === "retrieve"
//                     ? isMobile
//                       ? "Find and Retrieve"
//                       : "Find and Retrieve (F5)"
//                     : isMobile
//                       ? "Apply Document No"
//                       : "Apply Document No (F5)"}
//                 </button>
//             </div>
//           </div>
//         )}

//         {/* Footer Tabs */}
//         {!collapsed && (
//          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-blue-100 border-t border-blue-300 text-sky-900 font-semibold text-[11px] sm:text-[10px]">
//             <button
//               type="button"
//               onClick={() => setMode("retrieve")}
//               className={`px-3 py-2 rounded-md transition text-center ${
//                 mode === "retrieve"
//                   ? "bg-white text-sky-900 shadow-sm"
//                   : "hover:bg-blue-200"
//               }`}
//             >
//               {isMobile ? "Retrieve Selected Document" : "Retrieve Selected Document (F6)"}
//             </button>

//             <button
//               type="button"
//               onClick={() => setMode("use")}
//               className={`px-3 py-2 rounded-md transition text-center ${
//                 mode === "use"
//                   ? "bg-white text-sky-900 shadow-sm"
//                   : "hover:bg-blue-200"
//               }`}
//             >
//               {isMobile ? "Use Selected Document" : "Use Selected Document (F7)"}
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AllTranDocNo;


import { useEffect, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faXmark,
  faAnglesLeft,
  faArrowLeft,
  faArrowRight,
  faAnglesRight,
  faWindowMinimize,
  faWindowRestore,
} from "@fortawesome/free-solid-svg-icons";
import { useIsTranExist } from "@/NAYSA Cloud/Global/procedure";
import Swal from "sweetalert2";

const MARGIN = 10;

const AllTranDocNo = ({
  isOpen,
  onClose,
  source,
  params,
  docNo,
  onRetrieve,
  onResponse,
  onSelected,
}) => {
  const docRef = useRef(null);
  const modalRef = useRef(null);
  const minimizedRef = useRef(null);

  const [mode, setMode] = useState("retrieve");
  const [docNoValue, setDocNoValue] = useState(docNo ?? "");
  const [minimized, setMinimized] = useState(false);

  const [vw, setVw] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1080
  );
  const [vh, setVh] = useState(
    typeof window !== "undefined" ? window.innerHeight : 720
  );

  const [position, setPosition] = useState({
    x: vw / 2 - 260,
    y: vh / 2 - 180,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [minimizedPosition, setMinimizedPosition] = useState({ x: 0, y: 0 });
  const [isMinimizedDragging, setIsMinimizedDragging] = useState(false);
  const [minimizedOffset, setMinimizedOffset] = useState({ x: 0, y: 0 });

  const isMobile = vw < 640;
  const modalWidth = isMobile
    ? Math.min(340, vw - MARGIN * 2)
    : Math.min(380, vw - MARGIN * 2);

  const minimizedWidth = isMobile
    ? Math.min(260, vw - MARGIN * 2)
    : Math.min(360, vw - MARGIN * 2);

  const getDefaultMinimizedPosition = useCallback(() => ({
    x: Math.max(MARGIN, vw - minimizedWidth - 16),
    y: Math.max(MARGIN, vh - (isMobile ? 92 : 118) - 16),
  }), [isMobile, minimizedWidth, vh, vw]);

  const clampMinimizedPosition = useCallback((x, y) => {
    const rect = minimizedRef.current?.getBoundingClientRect();
    const width = rect?.width || minimizedWidth;
    const height = rect?.height || (isMobile ? 92 : 118);
    const maxX = Math.max(MARGIN, vw - width - MARGIN);
    const maxY = Math.max(MARGIN, vh - height - MARGIN);
    return {
      x: Math.max(MARGIN, Math.min(x, maxX)),
      y: Math.max(MARGIN, Math.min(y, maxY)),
    };
  }, [isMobile, minimizedWidth, vh, vw]);

  const getModalRect = useCallback(() => {
    const rect = modalRef.current?.getBoundingClientRect();
    return (
      rect || {
        width: modalWidth,
        height: isMobile ? 250 : 300,
        left: position.x,
        top: position.y,
      }
    );
  }, [isMobile, modalWidth, position.x, position.y]);

  const getBounds = useCallback(() => {
    const rect = getModalRect();
    const maxX = Math.max(MARGIN, vw - rect.width - MARGIN);
    const maxY = Math.max(MARGIN, vh - rect.height - MARGIN);
    return { minX: MARGIN, minY: MARGIN, maxX, maxY };
  }, [getModalRect, vw, vh]);

  const clampPosition = useCallback(
    (x, y) => {
      const { minX, minY, maxX, maxY } = getBounds();
      return {
        x: Math.max(minX, Math.min(x, maxX)),
        y: Math.max(minY, Math.min(y, maxY)),
      };
    },
    [getBounds]
  );

  const clampPositionToViewport = useCallback(() => {
    setPosition((p) => clampPosition(p.x, p.y));
  }, [clampPosition]);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      clampPositionToViewport();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPositionToViewport]);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    if (!modalRef.current) return;
    const r = modalRef.current.getBoundingClientRect();
    setIsDragging(true);
    setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);

  const stopDrag = useCallback(() => setIsDragging(false), []);

  const handleDrag = useCallback(
    (e) => {
      if (!isDragging) return;
      const nextX = e.clientX - offset.x;
      const nextY = e.clientY - offset.y;
      setPosition(clampPosition(nextX, nextY));
    },
    [isDragging, offset, clampPosition]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [handleDrag, stopDrag]);

  const startMinimizedDrag = useCallback((e) => {
    e.preventDefault();
    if (!minimizedRef.current) return;
    const rect = minimizedRef.current.getBoundingClientRect();
    setIsMinimizedDragging(true);
    setMinimizedOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const stopMinimizedDrag = useCallback(() => setIsMinimizedDragging(false), []);

  const handleMinimizedDrag = useCallback((e) => {
    if (!isMinimizedDragging) return;
    setMinimizedPosition(
      clampMinimizedPosition(e.clientX - minimizedOffset.x, e.clientY - minimizedOffset.y)
    );
  }, [clampMinimizedPosition, isMinimizedDragging, minimizedOffset]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMinimizedDrag);
    window.addEventListener("mouseup", stopMinimizedDrag);
    return () => {
      window.removeEventListener("mousemove", handleMinimizedDrag);
      window.removeEventListener("mouseup", stopMinimizedDrag);
    };
  }, [handleMinimizedDrag, stopMinimizedDrag]);

  useEffect(() => {
    if (!isOpen) return;

    setMode("retrieve");
    setMinimized(false);
    setDocNoValue(docNo ?? "");
    setMinimizedPosition(getDefaultMinimizedPosition());

    const centered = {
      x: Math.round((vw - modalWidth) / 2),
      y: Math.round((vh - (isMobile ? 300 : 380)) / 2),
    };

    setPosition(clampPosition(centered.x, centered.y));
  }, [isOpen, docNo, vw, vh, modalWidth, isMobile, clampPosition, getDefaultMinimizedPosition]);

  useEffect(() => {
    const incoming = onResponse?.documentNo;
    if (incoming == null) return;

    const activeOnInput = document.activeElement === docRef.current;
    if (!activeOnInput && incoming !== docNoValue) {
      setDocNoValue(incoming ?? "");
    }
  }, [onResponse, docNoValue]);

  const getCurrentDocNo = useCallback(() => {
    return (docRef.current?.value ?? docNoValue ?? "").trim();
  }, [docNoValue]);

  const getDisplayDocumentNo = useCallback(() => {
    const current = getCurrentDocNo();
    const responseDocNo = String(onResponse?.documentNo ?? "").trim();
    return current || responseDocNo || docNo || "No document selected";
  }, [getCurrentDocNo, onResponse?.documentNo, docNo]);

  const RetrieveDocument = useCallback(
    (modalClose, key) => {
      if (mode !== "retrieve") return;
      const current = getCurrentDocNo();

      const fetchedDocumentNo = String(onResponse?.documentNo ?? "").trim();
      const isManualRetrieve = !key;

      if (isManualRetrieve && current && current === fetchedDocumentNo) {
        onClose?.();
        return;
      }

      onRetrieve?.({ docNo: current, key, modalClose });
    },
    [mode, getCurrentDocNo, onRetrieve, onResponse, onClose]
  );

  const SelectDocument = useCallback(async () => {
    if (mode !== "use") return;

    const current = getCurrentDocNo();

    if (!current) {
      await Swal.fire({
        icon: "warning",
        title: "No Document No.",
        text: "Please enter a document number first.",
        timer: 1600,
        showConfirmButton: false,
      });
      return;
    }

    const response = await useIsTranExist(
      current,
      params?.branchCode,
      params?.docType,
      params?.fieldNo
    );

    if (response == 1) {
      await Swal.fire({
        icon: "info",
        title: "Document Conflict",
        text: "This document has already been processed and cannot be selected again.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    onSelected?.({ docNo: current, branchCode: params?.branchCode });
  }, [mode, getCurrentDocNo, onSelected, params]);

  const navigationButtons = [
    { icon: faAnglesLeft, label: "First", key: "F" },
    { icon: faArrowLeft, label: "Previous", key: "P" },
    { icon: faArrowRight, label: "Next", key: "N" },
    { icon: faAnglesRight, label: "Last", key: "L" },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const onKey = async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "F6") {
        e.preventDefault();
        setMode("retrieve");
      }
      if (e.key === "F7") {
        e.preventDefault();
        setMode("use");
      }
      if (e.key === "F8") {
        e.preventDefault();
        setMinimized((value) => !value);
      }
      if (
        e.key === "F5" ||
        (e.key === "Enter" && document.activeElement === docRef.current)
      ) {
        e.preventDefault();
        if (mode === "retrieve") {
          RetrieveDocument(false, "");
        } else {
          SelectDocument();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, mode, onClose, RetrieveDocument, SelectDocument]);

  useEffect(() => {
    if (!isOpen || !minimized) return;
    setMinimizedPosition((position) =>
      clampMinimizedPosition(position.x, position.y)
    );
  }, [clampMinimizedPosition, isOpen, minimized, vw, vh]);

  if (!isOpen) return null;

  if (minimized) {
    return (
      <div
        ref={minimizedRef}
        className="fixed z-[100] overflow-hidden rounded-xl border border-blue-300 bg-white font-sans text-slate-800 shadow-2xl"
        style={{
          width: minimizedWidth,
          left: `${minimizedPosition.x}px`,
          top: `${minimizedPosition.y}px`,
        }}
      >
        <div
          className="flex cursor-move items-center justify-between gap-2 border-b border-blue-200 bg-blue-100 px-2 py-1.5 sm:px-3 sm:py-2"
          onMouseDown={startMinimizedDrag}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold text-blue-900 sm:text-[11px]">
              {params?.documentTitle ?? "Document Lookup"}
            </div>
            <div className="truncate text-[11px] font-bold tracking-wide text-sky-900 sm:text-xs">
              {getDisplayDocumentNo()}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="rounded p-1 text-sky-900 transition hover:bg-blue-200 sm:p-1.5"
              title="Restore"
            >
              <FontAwesomeIcon icon={faWindowRestore} className="text-xs" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-sky-900 transition hover:bg-blue-200 sm:p-1.5"
              title="Close"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-white p-1.5 sm:p-2">
          {navigationButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              className="flex min-w-0 items-center justify-center gap-1 rounded-md bg-blue-50 px-1 py-1.5 text-[9px] font-semibold text-sky-900 shadow-sm transition hover:bg-blue-100 sm:px-2 sm:py-2 sm:text-[10px]"
              onClick={() => {
                setMode("retrieve");
                RetrieveDocument(true, btn.key);
              }}
              title={btn.label}
            >
              <FontAwesomeIcon icon={btn.icon} />
              <span className="truncate">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] font-sans">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={modalRef}
        className="absolute max-w-[92vw] select-none overflow-hidden rounded-xl border border-blue-300 bg-white text-slate-800 shadow-2xl"
        style={{
          width: modalWidth,
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          className="flex cursor-move items-center justify-between bg-blue-100 px-3 text-slate-800 sm:px-3"
          onMouseDown={startDrag}
        >
          <div className="truncate pr-2 text-xs font-semibold text-blue-900 sm:text-sm">
            {params?.documentTitle ?? "Document Lookup"}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMinimizedPosition(getDefaultMinimizedPosition());
                setMinimized(true);
                setMode("retrieve");
              }}
              className="rounded p-1.5 transition hover:bg-blue-200"
              title="Minimize (F8)"
            >
              <FontAwesomeIcon icon={faWindowMinimize} className="text-xs" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 transition hover:bg-blue-200"
              title="Close"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        </div>

        {mode === "retrieve" && (
          <div className="flex justify-center px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex w-full gap-1 sm:mx-auto sm:w-auto sm:gap-2">
              {navigationButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-blue-50 px-2 py-1.5 text-[10px] font-semibold text-sky-900 shadow-md transition hover:bg-blue-100 sm:flex-none sm:px-3 sm:py-2 sm:text-[11px]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => RetrieveDocument(true, btn.key)}
                >
                  <FontAwesomeIcon icon={btn.icon} className="mr-1" />
                  <span className="truncate">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-3 pb-4 pt-2 sm:px-4 sm:pb-5">
          <div className="mb-3 sm:mb-2">
            <label className="mb-1 block text-[11px] text-slate-600 sm:text-xs">
              Branch
            </label>
            <div className="flex h-10 cursor-not-allowed items-center rounded-md border border-slate-200 bg-slate-100 px-2 shadow-sm sm:h-10">
              <span className="flex-1 truncate text-sm font-bold text-sky-900 sm:text-base">
                {params?.branchName ?? ""}
              </span>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="ml-3 opacity-0 pointer-events-none"
              />
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="mb-1 block text-[11px] text-slate-600 sm:text-xs">
              Document No.
            </label>
            <input
              ref={docRef}
              value={docNoValue}
              onChange={(e) => setDocNoValue(e.target.value)}
              className="peer global-tran-textbox-ui !h-10 w-full border border-slate-200 bg-white !py-2 text-center text-sm font-bold tracking-[0.12em] text-sky-900 shadow-inner focus:ring-2 focus:ring-blue-300 sm:!h-10 sm:!py-4 sm:text-xl sm:tracking-[0.25em]"
              placeholder="00000000"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (mode === "retrieve") {
                  RetrieveDocument(false, "");
                } else {
                  SelectDocument();
                }
              }}
              className="rounded-md bg-blue-50 px-4 py-2 text-xs font-semibold text-sky-900 shadow-md transition hover:bg-blue-100 sm:px-6 sm:py-2.5 sm:text-[11px]"
            >
              {mode === "retrieve"
                ? isMobile
                  ? "Find and Retrieve"
                  : "Find and Retrieve (F5)"
                : isMobile
                  ? "Apply Document No"
                  : "Apply Document No (F5)"}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-2 border-t border-blue-300 bg-blue-100 px-3 py-2 text-[11px] font-semibold text-sky-900 sm:flex-row sm:items-center sm:px-4 sm:text-[10px]">
          <button
            type="button"
            onClick={() => setMode("retrieve")}
            className={`rounded-md px-3 py-2 text-center transition ${
              mode === "retrieve" ? "bg-white text-sky-900 shadow-sm" : "hover:bg-blue-200"
            }`}
          >
            {isMobile ? "Retrieve Selected Document" : "Retrieve Selected Document (F6)"}
          </button>

          <button
            type="button"
            onClick={() => setMode("use")}
            className={`rounded-md px-3 py-2 text-center transition ${
              mode === "use" ? "bg-white text-sky-900 shadow-sm" : "hover:bg-blue-200"
            }`}
          >
            {isMobile ? "Use Selected Document" : "Use Selected Document (F7)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllTranDocNo;
