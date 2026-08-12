import React, { useState, useMemo, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSyncAlt,
  faSort,
  faSearch,
  faEraser,
  faChevronLeft,
  faChevronRight,
  faCheckSquare,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// Debounce hook for smooth filtering
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const SearchMRCmast = ({ 
  isOpen, 
  onClose, 
  selectedDepartments = [],
  title = "Select Department(s)",
  withPagination = false 
}) => {
  const [filters, setFilters] = useState({
    rcCode: "",
    rcName: "",
    rcType: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [tempSelected, setTempSelected] = useState([]);
  
  // Standardized page size logic
  const pageSize = withPagination ? 100 : 999999; 

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");

  const resetFilters = () =>
    setFilters({
      rcCode: "",
      rcName: "",
      rcType: "",
    });

  const debouncedFilters = useDebounce(filters, 300);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  // Sync selection when opened
  useEffect(() => {
    if (isOpen) {
      setTempSelected(Array.isArray(selectedDepartments) ? selectedDepartments : []);
    }
  }, [isOpen, selectedDepartments]);

  // Fetching data using TanStack Query
  const {
    data: rcList = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupRCMast", "ActiveAll"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupRCMast", {
        params: {
          PARAMS: "ActiveAll",
        },
      });

      const rawData = result?.data?.[0]?.result || "[]";
      return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  // Client-side Filter and Sort Logic
  const filteredAndSorted = useMemo(() => {
    if (!rcList.length) return [];

    let result = rcList.filter((item) => {
      return (
        (item.rcCode || "").toLowerCase().includes(debouncedFilters.rcCode.toLowerCase()) &&
        (item.rcName || "").toLowerCase().includes(debouncedFilters.rcName.toLowerCase()) &&
        (item.rcType || "").toLowerCase().includes(debouncedFilters.rcType.toLowerCase())
      );
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.key] ?? "");
        const bVal = String(b[sortConfig.key] ?? "");
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal, undefined, { numeric: true })
          : bVal.localeCompare(aVal, undefined, { numeric: true });
      });
    }

    return result;
  }, [rcList, debouncedFilters, sortConfig]);

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleToggle = (code) => {
    setTempSelected(prev => 
        prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    const filteredCodes = filteredAndSorted.map(item => item.rcCode);
    const allIn = filteredCodes.every(code => tempSelected.includes(code));
    
    if (allIn) {
        setTempSelected(prev => prev.filter(code => !filteredCodes.includes(code)));
    } else {
        setTempSelected(prev => Array.from(new Set([...prev, ...filteredCodes])));
    }
  };

  const handleApply = () => {
    onClose(tempSelected);
  };

  if (!isOpen) return null;

  const allFilteredSelected = filteredAndSorted.length > 0 && 
    filteredAndSorted.every(item => tempSelected.includes(item.rcCode));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="global-lookup-headertext-ui">Select Department(s)</h2>
            {isFetching && (
                <div className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button onClick={resetFilters} className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEraser} /> CLEAR
              </button>
            )}
            <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Refresh Data">
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>
            <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  <th className="global-lookup-th-ui w-[50px] text-center">
                    <div className="flex flex-col items-center gap-1.5">
                        <span className="global-lookup-th-text-ui">Select</span>
                        <input type="checkbox" checked={allFilteredSelected} onChange={handleSelectAll} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                    </div>
                  </th>
                  {[{ label: "RC Code", key: "rcCode" }, { label: "Department", key: "rcName" }, { label: "Type", key: "rcType" }].map((col) => (
                    <th key={col.key} className="global-lookup-th-ui">
                      <div onClick={() => handleSort(col.key)} className="flex items-center gap-3 cursor-pointer group mb-1">
                        <span className="global-lookup-th-text-ui">{col.label}</span>
                        <FontAwesomeIcon icon={faSort} className={`mb-2 text-[10px] ${sortConfig.key === col.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`} />
                      </div>
                      <div className="relative">
                        <input type="text" value={filters[col.key]} onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? paginatedData.map((rcItem, index) => {
                    const isChecked = tempSelected.includes(rcItem.rcCode);
                    return (
                        <tr key={rcItem.rcCode || index} onClick={() => handleToggle(rcItem.rcCode)} className={`group hover:bg-blue-50 cursor-pointer transition-colors ${isChecked ? "bg-blue-50/40" : ""}`}>
                          <td className="global-lookup-td-ui text-center">
                            <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                          </td>
                          <td className="global-lookup-td-ui w-[140px] font-bold">{rcItem.rcCode}</td>
                          <td className="global-lookup-td-ui w-[280px]">{rcItem.rcName}</td>
                          <td className="global-lookup-td-ui w-[120px]">{rcItem.rcType}</td>
                        </tr>
                    )
                  }) : (
                  <tr><td colSpan="4" className="px-4 py-20 text-center text-slate-400 italic text-sm">No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Total Records: {filteredAndSorted.length}
            </span>
            <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">
              Selected: {tempSelected.length}
            </span>
            {isFetching && (
              <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase tracking-widest italic">
                Syncing with server...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {withPagination && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
                <span className="text-[11px] font-semibold text-slate-600">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
              </div>
            )}
            <button 
              onClick={handleApply} 
              disabled={tempSelected.length === 0} 
              className="px-4 py-2 bg-[#1e40af] text-white text-[9px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faCheckSquare} /> Get Selected Department
            </button>
          </div>
        </div>
      </div>
      <style jsx="true">{`
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default SearchMRCmast;