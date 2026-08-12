
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
//     : Math.min(500, vw - MARGIN * 2);

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
//       onRetrieve?.({ docNo: current, key, modalClose });
//       console.log(current);
//     },
//     [mode, getCurrentDocNo, onRetrieve]
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
//           className="flex items-center justify-between px-3 sm:px-4 py-2 bg-blue-200 text-slate-800 cursor-move"
//           onMouseDown={startDrag}
//         >
//           <div className="text-xs sm:text-sm font-semibold truncate pr-2">
//             {params?.documentTitle ?? "Document Lookup"}
//           </div>

//           <div className="flex items-center gap-1 shrink-0">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setCollapsed((c) => !c);
//                 setMode("retrieve");
//               }}
//               className="p-1.5 rounded hover:bg-blue-300 transition"
//               title="Collapse (F8)"
//             >
//               <FontAwesomeIcon icon={faChevronUp} className="text-xs" />
//             </button>
//             <button
//               onClick={onClose}
//               className="p-1.5 rounded hover:bg-blue-300 transition"
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
//               className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-md bg-blue-50 text-sky-900 hover:bg-blue-100 shadow-sm flex items-center justify-center whitespace-nowrap min-w-0"
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
//           <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-2">
//             {/* Branch */}
//             <div className="mb-3 sm:mb-4">
//               <label className="text-[11px] sm:text-xs text-slate-600 mb-1 block">
//                 Branch
//               </label>
//               <div className="flex items-center rounded-md h-10 sm:h-12 px-3 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
//                 <span className="flex-1 text-lg sm:text-3xl font-bold text-sky-900 truncate">
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
//                 className="peer global-tran-textbox-ui !h-12 sm:!h-16 !py-2 sm:!py-4 text-lg sm:text-3xl font-bold tracking-[0.12em] sm:tracking-[0.25em] text-center text-sky-900 bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-blue-300 w-full"
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
//                   className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-semibold text-xs sm:text-sm shadow-md transition ${
//                     mode === "retrieve"
//                       ? "bg-blue-100 text-sky-900 hover:bg-blue-200"
//                       : "bg-blue-200 text-sky-900 hover:bg-blue-300"
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
//          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-blue-200 border-t border-blue-300 text-sky-900 font-semibold text-[11px] sm:text-xs">
//             <button
//               type="button"
//               onClick={() => setMode("retrieve")}
//               className={`px-3 py-2 rounded-md transition text-center ${
//                 mode === "retrieve"
//                   ? "bg-white text-sky-900 shadow-sm"
//                   : "hover:bg-blue-300"
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
//                   : "hover:bg-blue-300"
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
  faChevronUp,
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

  const [mode, setMode] = useState("retrieve");
  const [docNoValue, setDocNoValue] = useState(docNo ?? "");
  const [collapsed, setCollapsed] = useState(false);

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

  // NEW: track if current displayed document was already retrieved by nav
  const [lastRetrievedDocNo, setLastRetrievedDocNo] = useState("");
  const [docWasRetrievedByNav, setDocWasRetrievedByNav] = useState(false);

  // NEW: track pending request source
  const pendingRetrieveTypeRef = useRef(null); // "nav" | "manual" | null

  const isMobile = vw < 640;

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      clampPositionToViewport();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const modalWidth = isMobile
    ? Math.min(340, vw - MARGIN * 2)
    : Math.min(500, vw - MARGIN * 2);

  const getModalRect = () => {
    const rect = modalRef.current?.getBoundingClientRect();
    return (
      rect || {
        width: modalWidth,
        height: isMobile ? 250 : 300,
        left: position.x,
        top: position.y,
      }
    );
  };

  const getBounds = () => {
    const rect = getModalRect();
    const maxX = Math.max(MARGIN, vw - rect.width - MARGIN);
    const maxY = Math.max(MARGIN, vh - rect.height - MARGIN);
    return { minX: MARGIN, minY: MARGIN, maxX, maxY };
  };

  const clampPosition = useCallback(
    (x, y) => {
      const { minX, minY, maxX, maxY } = getBounds();
      return {
        x: Math.max(minX, Math.min(x, maxX)),
        y: Math.max(minY, Math.min(y, maxY)),
      };
    },
    [vw, vh, modalWidth, position.x, position.y]
  );

  const clampPositionToViewport = useCallback(() => {
    setPosition((p) => clampPosition(p.x, p.y));
  }, [clampPosition]);

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

  useEffect(() => {
    if (!isOpen) return;

    setMode("retrieve");
    setCollapsed(false);
    setDocNoValue(docNo ?? "");
    setLastRetrievedDocNo(docNo ?? "");
    setDocWasRetrievedByNav(false);
    pendingRetrieveTypeRef.current = null;

    const centered = {
      x: Math.round((vw - modalWidth) / 2),
      y: Math.round((vh - (isMobile ? 300 : 380)) / 2),
    };

    setPosition(clampPosition(centered.x, centered.y));
  }, [isOpen, docNo, vw, vh, modalWidth, isMobile, clampPosition]);

  useEffect(() => {
    const incoming = onResponse?.documentNo;
    if (incoming == null) return;

    const normalizedIncoming = String(incoming ?? "").trim();
    const activeOnInput = document.activeElement === docRef.current;

    if (!activeOnInput && normalizedIncoming !== docNoValue) {
      setDocNoValue(normalizedIncoming);
    }

    if (pendingRetrieveTypeRef.current === "nav") {
      setLastRetrievedDocNo(normalizedIncoming);
      setDocWasRetrievedByNav(true);
    } else if (pendingRetrieveTypeRef.current === "manual") {
      setLastRetrievedDocNo(normalizedIncoming);
      setDocWasRetrievedByNav(false);
    }

    pendingRetrieveTypeRef.current = null;
  }, [onResponse, docNoValue]);

  const getCurrentDocNo = useCallback(() => {
    return (docRef.current?.value ?? docNoValue ?? "").trim();
  }, [docNoValue]);

  const performRetrieve = useCallback(
    (modalClose, key, retrieveType = "manual") => {
      if (mode !== "retrieve") return;

      const current = getCurrentDocNo();

      pendingRetrieveTypeRef.current = retrieveType;
      onRetrieve?.({ docNo: current, key, modalClose });
    },
    [mode, getCurrentDocNo, onRetrieve]
  );

  const handlePrimaryRetrieve = useCallback(() => {
    const current = getCurrentDocNo();

    // if nav already retrieved this exact doc and user did not manually change it,
    // just close the modal instead of retrieving again
    if (
      docWasRetrievedByNav &&
      current &&
      current === lastRetrievedDocNo
    ) {
      onClose?.();
      return;
    }

    performRetrieve(false, "", "manual");
  }, [
    getCurrentDocNo,
    docWasRetrievedByNav,
    lastRetrievedDocNo,
    onClose,
    performRetrieve,
  ]);

  const handleNavigationRetrieve = useCallback(
    (key) => {
      performRetrieve(true, key, "nav");
    },
    [performRetrieve]
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
        setCollapsed((c) => !c);
      }
      if (
        e.key === "F5" ||
        (e.key === "Enter" && document.activeElement === docRef.current)
      ) {
        e.preventDefault();
        if (mode === "retrieve") {
          handlePrimaryRetrieve();
        } else {
          SelectDocument();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, mode, onClose, handlePrimaryRetrieve, SelectDocument]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] font-sans">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={modalRef}
        className="absolute max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-blue-300 select-none overflow-hidden"
        style={{
          width: modalWidth,
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          className="flex items-center justify-between px-3 sm:px-4 py-2 bg-blue-200 text-slate-800 cursor-move"
          onMouseDown={startDrag}
        >
          <div className="text-xs sm:text-sm font-semibold truncate pr-2">
            {params?.documentTitle ?? "Document Lookup"}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => !c);
                setMode("retrieve");
              }}
              className="p-1.5 rounded hover:bg-blue-300 transition"
              title="Collapse (F8)"
            >
              <FontAwesomeIcon icon={faChevronUp} className="text-xs" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-blue-300 transition"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        </div>

        {mode === "retrieve" && (
          <div
            className={`px-3 sm:px-4 py-2 sm:py-3 flex justify-center ${
              collapsed ? "bg-slate-50" : ""
            }`}
            onMouseDown={collapsed ? startDrag : undefined}
          >
            <div className="flex w-full sm:w-auto sm:mx-auto gap-1 sm:gap-2">
              {[
                { icon: faAnglesLeft, label: "First", key: "F" },
                { icon: faArrowLeft, label: "Previous", key: "P" },
                { icon: faArrowRight, label: "Next", key: "N" },
                { icon: faAnglesRight, label: "Last", key: "L" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-md bg-blue-50 text-sky-900 hover:bg-blue-100 shadow-sm flex items-center justify-center whitespace-nowrap min-w-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleNavigationRetrieve(btn.key)}
                >
                  <FontAwesomeIcon icon={btn.icon} className="mr-1" />
                  <span className="truncate">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-2">
            <div className="mb-3 sm:mb-4">
              <label className="text-[11px] sm:text-xs text-slate-600 mb-1 block">
                Branch
              </label>
              <div className="flex items-center rounded-md h-10 sm:h-12 px-3 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
                <span className="flex-1 text-lg sm:text-3xl font-bold text-sky-900 truncate">
                  {params?.branchName ?? ""}
                </span>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="ml-3 opacity-0 pointer-events-none"
                />
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <label className="text-[11px] sm:text-xs text-slate-600 mb-1 block">
                Document No.
              </label>
              <input
                ref={docRef}
                value={docNoValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setDocNoValue(value);

                  // once user manually edits, it is no longer "already retrieved by nav"
                  if (value.trim() !== lastRetrievedDocNo) {
                    setDocWasRetrievedByNav(false);
                  }
                }}
                className="peer global-tran-textbox-ui !h-12 sm:!h-16 !py-2 sm:!py-4 text-lg sm:text-3xl font-bold tracking-[0.12em] sm:tracking-[0.25em] text-center text-sky-900 bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-blue-300 w-full"
                placeholder="00000000"
              />
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (mode === "retrieve") {
                    handlePrimaryRetrieve();
                  } else {
                    SelectDocument();
                  }
                }}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-semibold text-xs sm:text-sm shadow-md transition ${
                  mode === "retrieve"
                    ? "bg-blue-100 text-sky-900 hover:bg-blue-200"
                    : "bg-blue-200 text-sky-900 hover:bg-blue-300"
                }`}
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
        )}

        {!collapsed && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-blue-200 border-t border-blue-300 text-sky-900 font-semibold text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => setMode("retrieve")}
              className={`px-3 py-2 rounded-md transition text-center ${
                mode === "retrieve"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "hover:bg-blue-300"
              }`}
            >
              {isMobile
                ? "Retrieve Selected Document"
                : "Retrieve Selected Document (F6)"}
            </button>

            <button
              type="button"
              onClick={() => setMode("use")}
              className={`px-3 py-2 rounded-md transition text-center ${
                mode === "use"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "hover:bg-blue-300"
              }`}
            >
              {isMobile
                ? "Use Selected Document"
                : "Use Selected Document (F7)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllTranDocNo;

