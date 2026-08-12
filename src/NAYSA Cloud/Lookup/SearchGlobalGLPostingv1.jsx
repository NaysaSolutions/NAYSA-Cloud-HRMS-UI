import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faMinus,
  faXmark,
  faFilterCircleXmark,
  faMagnifyingGlass,
  faCircleExclamation,
  faEye,
  faEyeSlash,
  faListCheck,
  faTable,
  faGrip,
} from "@fortawesome/free-solid-svg-icons";
import {
  formatNumber,
  useSwalErrorAlert,
} from "../Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { Maximize2, Minimize2 } from "lucide-react";

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const GlobalGLPostingModalv1 = ({
  data,
  colConfigData,
  title,
  btnCaption,
  onClose,
  onPost,
  onViewDocument,
  remoteLoading = false,
}) => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({});
  const [columnConfig, setColumnConfig] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [showFilters, setShowFilters] = useState(true);
  const [globalQuery, setGlobalQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userPassword, setUserPassword] = useState("");
  const [enableGlobalSearch, setEnableGlobalSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState("card");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const hasPasswordValue = String(userPassword ?? "").length > 0;

  const firstFocusableRef = useRef(null);
  const STICKY_COUNT = 3;
  const selectHeaderRef = useRef(null);
  const viewHeaderRef = useRef(null);
  const columnHeaderRefs = useRef({});
  const [stickyLefts, setStickyLefts] = useState([]);
  const [resizeTick, setResizeTick] = useState(0);
  const ACTION_COL_W = 70;
  const SELECT_COL_W = 54;
  const MIN_DATA_COL_W = 110;
  const MAX_DATA_COL_W = 200;
  const CHAR_WIDTH = 7;

  const getRowId = (row) =>
    row?.rrId ?? row?.rr_id ?? row?.docId ?? row?.groupId ?? row?.tranId ?? row?.__idx;

  const selectedIds = useMemo(() => {
    const s = new Set();
    for (const r of selected) s.add(getRowId(r));
    return s;
  }, [selected]);

  const handleClose = useCallback(() => {
    setIsMinimized(false);
    setIsMaximized(false);
    onClose?.();
  }, [onClose]);

useEffect(() => {
  firstFocusableRef.current?.focus();
  const onKey = (e) => { if (e.key === "Escape") handleClose(); };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [handleClose]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setResizeTick((t) => t + 1);
      if (!mobile) setMobileViewMode("table");
      else setMobileViewMode((prev) => (prev === "table" || prev === "card" ? prev : "card"));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) { setShowFilters(false); setFilters({}); }
  }, [isMobile]);

  useEffect(() => {
    if (hasPasswordValue) {
      setShowFilters(false);
      setFilters({});
    } else if (!isMobile) {
      setShowFilters(true);
    }
  }, [hasPasswordValue, isMobile]);

  useEffect(() => {
    if (selected.length === 0) {
      setUserPassword("");
      setShowPassword(false);
    }
  }, [selected.length]);

  useEffect(() => {
    setSelected([]);
    setSortConfig({ key: null, direction: null });
    setFilters({});
    setGlobalQuery("");
    setColumnConfig(Array.isArray(colConfigData) ? colConfigData : []);
    const rows = Array.isArray(data) ? data.map((row, i) => ({ ...row, __idx: i })) : [];
    setRecords(rows);
  }, [data, colConfigData]);

  const visibleCols = useMemo(() => columnConfig.filter((c) => !c.hidden), [columnConfig]);

  const renderValue = (column, value, decimal = 2) => {
    if (!value && value !== 0) return "";
    switch (column?.renderType) {
      case "number": return formatNumber(value, Number.isFinite(parseInt(decimal, 10)) ? parseInt(decimal, 10) : 2);
      case "date": {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
      }
      default: return value;
    }
  };

  const coerceForSort = (val, type) => {
    if (val == null) return null;
    if (type === "number") {
      const n = Number(String(val).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    if (type === "date") {
      const t = new Date(val).getTime();
      return Number.isNaN(t) ? null : t;
    }
    return String(val).toLowerCase();
  };

  const debouncedFilters = useDebouncedValue(filters, 200);
  const debouncedGlobal = useDebouncedValue(globalQuery, 250);

  useEffect(() => {
    let current = records.slice();
    if (debouncedGlobal?.trim()) {
      const q = debouncedGlobal.trim().toLowerCase();
      const visibleKeys = visibleCols.map((c) => c.key).filter(Boolean);
      current = current.filter((row) => visibleKeys.some((k) => String(row?.[k] ?? "").toLowerCase().includes(q)));
    }
    current = current.filter((item) =>
      Object.entries(debouncedFilters).every(([key, value]) => {
        if (!value) return true;
        return String(item?.[key] ?? "").toLowerCase().replace(/,/g, "").includes(String(value).toLowerCase().replace(/,/g, ""));
      })
    );
    if (sortConfig?.key && sortConfig?.direction) {
      const col = columnConfig.find((c) => c.key === sortConfig.key);
      const type = col?.renderType || "string";
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      current.sort((a, b) => {
        const av = coerceForSort(a?.[sortConfig.key], type);
        const bv = coerceForSort(b?.[sortConfig.key], type);
        if (av === bv) return (a.__idx ?? 0) - (b.__idx ?? 0);
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av < bv ? -1 : 1) * dir;
      });
    }
    setFiltered(current);
  }, [records, debouncedFilters, sortConfig, columnConfig, debouncedGlobal, visibleCols]);

  const displayData = filtered;
  const totalItems = filtered.length;
  const startItem = totalItems > 0 ? 1 : 0;
  const endItem = totalItems;
  const activeFilterChips = Object.entries(filters).filter(([, v]) => v);
  const columnWidths = useMemo(() => {
    return visibleCols.reduce((widths, col) => {
      const values = displayData.map((row) =>
        renderValue(col, row?.[col.key], col.roundingOff),
      );
      const longest = [col.label || col.key || "", ...values]
        .map((value) => String(value ?? "").length)
        .reduce((max, length) => Math.max(max, length), 0);
      const preferredWidth = longest * CHAR_WIDTH + 44;

      widths[col.key] = Math.min(
        MAX_DATA_COL_W,
        Math.max(MIN_DATA_COL_W, preferredWidth),
      );
      return widths;
    }, {});
  }, [displayData, visibleCols]);

  const handleFilterChange = (e, key) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  const clearAllFilters = () => setFilters({});

  const handleGetSelected = async () => {
    if (!selected.length) return useSwalErrorAlert("Please select at least one transaction to post.");
    if (!String(userPassword ?? "").trim()) return useSwalErrorAlert("Password is required.");
    try {
      const result = await onPost?.(selected, userPassword);
      if (result === false || (result?.success === false && /incorrect password/i.test(result?.message || ""))) {
        useSwalErrorAlert("Incorrect password.");
        setUserPassword("");
      }
    } catch (error) {
      useSwalErrorAlert(error?.response?.data?.message || "Failed to post transaction.");
      setUserPassword("");
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
    return <FontAwesomeIcon icon={sortConfig.direction === "asc" ? faSortUp : faSortDown} className="ml-1 text-blue-500" />;
  };

  const toggleSelect = (row) => {
    const id = getRowId(row);
    const isSelected = selectedIds.has(id);
    setSelected((prev) => isSelected
      ? prev.filter((s) => getRowId(s) !== id)
      : [...prev, row]);
  };

  const toggleSelectAll = () => {
    const allIds = filtered.map(getRowId).filter((x) => x != null);
    if (allIds.length > 0 && allIds.every((id) => selectedIds.has(id))) {
      setSelected((prev) => prev.filter((r) => !allIds.includes(getRowId(r))));
    } else {
      setSelected((prev) => {
        const map = new Map(prev.map((r) => [getRowId(r), r]));
        for (const r of filtered) map.set(getRowId(r), r);
        return Array.from(map.values());
      });
    }
  };

  const handleViewRow = (row) => onViewDocument?.(row);
  const isLoading = !!remoteLoading;

  useLayoutEffect(() => {
    const lefts = [];
    let acc = 0;
    if (viewHeaderRef.current) { lefts[0] = 0; acc = viewHeaderRef.current.offsetWidth; }
    if (selectHeaderRef.current) { lefts[1] = acc; acc += selectHeaderRef.current.offsetWidth; }
    visibleCols.forEach((col, idx) => {
      if (idx < STICKY_COUNT - 2) {
        lefts[idx + 2] = acc;
        const hdr = columnHeaderRefs.current[col.key];
        if (hdr) acc += hdr.offsetWidth;
      }
    });
    setStickyLefts(lefts);
  }, [visibleCols, showFilters, resizeTick, filtered.length, columnWidths]);

  const stickyMeta = (idx) => idx < STICKY_COUNT ? { sticky: true, left: stickyLefts[idx] ?? 0 } : { sticky: false };
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(getRowId(r)));

  if (isMinimized) {
    return (
      <div className="fixed inset-0 z-[9999] bg-transparent">
        <div className="absolute bottom-4 right-4 flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-slate-900/25">
          <div className="min-w-0">
            <div className="max-w-[260px] truncate font-semibold text-slate-800">
              {title}
            </div>
            <div className="truncate text-[10px] text-slate-500">
              Select transaction entries to post
            </div>
          </div>

          <div className="ml-2 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="h-7 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Restore
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
              title="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 ${isMaximized ? "p-0" : "p-2 sm:p-4"}`}>
      <div className={`bg-white shadow-2xl flex flex-col relative overflow-hidden border border-slate-200 ${
        isMaximized
          ? "h-screen w-screen rounded-none"
          : "h-[88vh] w-[95vw] max-w-[1440px] rounded-xl"
      }`}>
        
        {/* INLINE LOADING OVERLAY (PREVENTS BLACK BACKGROUND) */}
        {isLoading && (
          <LoadingSpinner />
        )}

        <div className="sticky top-0 z-20">
          <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200 px-3 sm:px-5 py-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="global-lookup-headertext-ui text-[19px] truncate">{title}</h2>
              </div>
              <p className="text-[9px] sm:text-xs text-slate-700 mt-0.5 truncate">Select transaction entries to post and review before proceeding.</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-white/70 text-blue-700 border border-blue-300">
                <FontAwesomeIcon icon={faListCheck} /> {selected.length} selected
              </span>

              <div className="flex items-center gap-1">
                {!isMobile && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      className="p-2 text-slate-400 transition-colors hover:text-blue-600"
                      title="Minimize"
                    >
                      <FontAwesomeIcon icon={faMinus} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMaximized((prev) => !prev)}
                      className="p-2 text-slate-400 transition-colors hover:text-blue-600"
                      title={isMaximized ? "Restore" : "Maximize"}
                    >
                      {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-slate-400 transition-colors hover:text-red-600"
                  title="Close"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 bg-white/95 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2.5 text-gray-400 text-xs" />
              <input key={enableGlobalSearch ? "enabled-search" : "disabled-search"} value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)} placeholder="Global search..." name={enableGlobalSearch ? "gl_posting_search" : "dummy_search_blocker"} autoComplete="off" readOnly={!enableGlobalSearch} onFocus={() => setEnableGlobalSearch(true)} onClick={() => setEnableGlobalSearch(true)} spellCheck={false} className="pl-7 pr-3 py-2 text-xs border rounded-md w-full sm:w-72 focus:ring-2 focus:ring-blue-200" />
            </div>
            {!isMobile && (
              <>
                {!hasPasswordValue && <button onClick={() => setShowFilters((s) => !s)} className="text-xs px-3 py-2 rounded-md border hover:bg-gray-50">{showFilters ? "Hide filters" : "Show filters"}</button>}
                <button onClick={clearAllFilters} disabled={activeFilterChips.length === 0} className="text-xs px-3 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-2"><FontAwesomeIcon icon={faFilterCircleXmark} /> Clear filters</button>
              </>
            )}
            {isMobile && (
              <div className="inline-flex rounded-lg border overflow-hidden">
                <button onClick={() => setMobileViewMode("card")} className={`px-3 py-2 text-xs ${mobileViewMode === "card" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}><FontAwesomeIcon icon={faGrip} /></button>
                <button onClick={() => setMobileViewMode("table")} className={`px-3 py-2 text-xs border-l ${mobileViewMode === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}><FontAwesomeIcon icon={faTable} /></button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-white">
          {isMobile && mobileViewMode === "card" ? (
            <div className="overflow-auto h-full px-3 py-3 space-y-3 custom-scrollbar">
              {displayData.length > 0 ? displayData.map((row, rIdx) => (
                <div key={getRowId(row) ?? rIdx} className="border rounded-2xl bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b">
                    <input type="checkbox" checked={selectedIds.has(getRowId(row))} onChange={() => toggleSelect(row)} className="h-4 w-4 text-blue-600 rounded" />
                    <button onClick={() => handleViewRow(row)} className="px-2 py-0.5 text-[10px] bg-blue-500 text-white rounded-md"><FontAwesomeIcon icon={faEye} className="mr-1" /> View</button>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {visibleCols.map((col) => (
                      <div key={col.key} className="grid grid-cols-[105px_1fr] gap-2 text-[10px]">
                        <div className="font-semibold text-gray-600">{col.label}</div>
                        <div className={`${col.renderType === "number" ? "text-right" : ""} text-gray-800`}>{renderValue(col, row[col.key], col.roundingOff)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <div className="py-10 text-center text-gray-500">No records found.</div>}
            </div>
          ) : (
            <div className="h-full w-full overflow-auto custom-scrollbar">
              <table className="min-w-max border-separate border-spacing-0">
                <thead className="sticky top-0 z-[80] bg-slate-200">
                  <tr className="bg-slate-200 whitespace-nowrap text-[10px] sm:text-[11px]">
                    <th ref={viewHeaderRef} className="sticky left-0 bg-slate-200 z-[70] px-3 py-2 font-bold global-lookup-th-ui border-b border-r" style={{ width: ACTION_COL_W, minWidth: ACTION_COL_W, maxWidth: ACTION_COL_W }}>View</th>
                    <th ref={selectHeaderRef} className="sticky bg-slate-200 z-[70] px-2 py-2 text-center font-bold global-lookup-th-ui border-b" style={{ left: stickyLefts[1], width: SELECT_COL_W, minWidth: SELECT_COL_W, maxWidth: SELECT_COL_W }}>Select</th>
                    {visibleCols.map((col, vIdx) => {
                      const meta = stickyMeta(vIdx + 2);
                      const width = columnWidths[col.key] ?? MIN_DATA_COL_W;
                      return (
                        <th key={col.key} ref={(el) => { if (meta.sticky) columnHeaderRefs.current[col.key] = el; }} onClick={() => handleSort(col.key)} className={`px-3 py-2 font-bold text-black cursor-pointer border-b global-lookup-th-ui ${meta.sticky ? "sticky z-[60] bg-slate-200" : "bg-slate-200"} ${col.renderType === "number" ? "text-right" : ""}`} style={{ left: meta.left, width, minWidth: width, maxWidth: width }}>
                          <span className="inline-flex items-center global-lookup-th-text-ui">{col.label} {renderSortIcon(col.key)}</span>
                        </th>
                      );
                    })}
                  </tr>
                  {!isMobile && showFilters && !hasPasswordValue && (
                    <tr className="bg-slate-200 text-[10px]">
                      <td className="sticky left-0 bg-slate-200 z-[70] border-b border-r"></td>
                      <td className="sticky bg-slate-200 z-[70] border-b" style={{ left: stickyLefts[1], width: SELECT_COL_W, minWidth: SELECT_COL_W, maxWidth: SELECT_COL_W }}></td>
                      {visibleCols.map((col, vIdx) => {
                        const meta = stickyMeta(vIdx + 2);
                        const width = columnWidths[col.key] ?? MIN_DATA_COL_W;
                        return (
                          <td key={col.key} className={`px-2 py-1 border-b ${meta.sticky ? "sticky z-[60] bg-slate-200" : "bg-slate-200"}`} style={{ left: meta.left, width, minWidth: width, maxWidth: width }}>
                            <div className="relative">
                              <input
                                type="text"
                                name={`gl_posting_filter_${col.key}`}
                                value={filters[col.key] || ""}
                                onChange={(e) => handleFilterChange(e, col.key)}
                                placeholder="Filter..."
                                autoComplete="off"
                                data-form-type="other"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                spellCheck={false}
                                className="global-lookup-filter-text-ui"
                              />
                              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white">
                  {displayData.length > 0 ? displayData.map((row, rIdx) => (
                    <tr key={getRowId(row) ?? rIdx} onDoubleClick={() => handleViewRow(row)} className={`text-[10px] sm:text-[11px] hover:bg-blue-50 ${rIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="sticky left-0 z-[30] px-2 py-[6px] text-center border-r bg-inherit" style={{ width: ACTION_COL_W, minWidth: ACTION_COL_W, maxWidth: ACTION_COL_W }}>
                        <button onClick={(e) => { e.stopPropagation(); handleViewRow(row); }} className="px-2 py-0.5 bg-blue-500 text-white rounded"><FontAwesomeIcon icon={faEye} /></button>
                      </td>
                      <td className="sticky z-[30] text-center bg-inherit" style={{ left: stickyLefts[1], width: SELECT_COL_W, minWidth: SELECT_COL_W, maxWidth: SELECT_COL_W }}>
                        <input type="checkbox" checked={selectedIds.has(getRowId(row))} onChange={() => toggleSelect(row)} className="h-4 w-4 text-blue-600 rounded" />
                      </td>
                      {visibleCols.map((col, vIdx) => {
                        const meta = stickyMeta(vIdx + 2);
                        const width = columnWidths[col.key] ?? MIN_DATA_COL_W;
                        return (
                          <td key={col.key} className={`px-3 py-[5px] truncate ${meta.sticky ? "sticky z-[20] bg-inherit" : ""} ${col.renderType === "number" ? "text-right" : ""}`} style={{ left: meta.left, width, minWidth: width, maxWidth: width }}>
                            {renderValue(col, row[col.key], col.roundingOff)}
                          </td>
                        );
                      })}
                    </tr>
                  )) : (
                    <tr><td colSpan={visibleCols.length + 2} className="py-10 text-center text-gray-500">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-3 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-4 w-4 text-blue-600 rounded" /> Select all (filtered)
              </label>
              <div className="flex items-center gap-2">
                <span className="font-medium">Password</span>
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value=""
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
                  />
                  <input
                    ref={firstFocusableRef}
                    type={showPassword ? "text" : "password"}
                    name="gl_posting_authorization"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    autoComplete="new-password"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    disabled={selected.length === 0}
                    spellCheck={false}
                    className="border rounded px-2 py-1.5 text-xs w-full pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button type="button" disabled={selected.length === 0} onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1.5 text-gray-400 disabled:cursor-not-allowed"><FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} /></button>
                </div>
                <button disabled={selected.length === 0} onClick={handleGetSelected} className="px-4 py-1.5 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 transition">{btnCaption} {selected.length ? `(${selected.length})` : ""}</button>
                <button onClick={handleClose} className="px-4 py-1.5 bg-gray-100 text-gray-800 border rounded-md hover:bg-gray-200">Cancel</button>
              </div>
            </div>
            <div className="flex items-start gap-2 max-w-[500px] bg-red-50 p-2 rounded-lg border border-red-100">
              <svg className="w-8 h-8 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
              <div className="text-[13px] leading-snug text-gray-700">
                Before posting, please ensure that all transaction entries are correct. <br /><span className="font-bold"> Once posted, un-posting is not available.</span>
              </div>
            </div>
          </div>
          <div className="global-lookup-footer-records-text-ui mt-2 text-right text-gray-600">
            <div>Total Records: {totalItems} </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalGLPostingModalv1;
