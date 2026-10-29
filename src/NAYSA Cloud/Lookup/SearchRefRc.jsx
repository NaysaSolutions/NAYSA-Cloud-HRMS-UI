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
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const SearchRefRC = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState({ code: "", description: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 1000;

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");
  const resetFilters = () => setFilters({ code: "", description: "" });
  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => { setCurrentPage(1); }, [debouncedFilters]);

  const { data: records = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lookupRefRC"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupRefRC", {
        params: { PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 1000 }) },
      });
      const rawData = result?.data?.[0]?.result || "[]";
      return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 20,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  const filteredAndSorted = useMemo(() => {
    if (!records.length) return [];
    let result = records.filter((item) => {
      const c = String(item?.code ?? "").toLowerCase();
      const d = String(item?.description ?? "").toLowerCase();
      return c.includes(debouncedFilters.code.toLowerCase()) && d.includes(debouncedFilters.description.toLowerCase());
    });
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = String(a?.[sortConfig.key] ?? "");
        const bVal = String(b?.[sortConfig.key] ?? "");
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal, undefined, { numeric: true })
          : bVal.localeCompare(aVal, undefined, { numeric: true });
      });
    }
    return result;
  }, [records, debouncedFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] flex flex-col relative overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-2 border-b bg-slate-100">
          <h2 className="text-md font-bold text-blue-800 pl-2">Select Responsibility Center</h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button onClick={resetFilters} className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEraser} /> CLEAR
              </button>
            )}
            <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600">
              <FontAwesomeIcon icon={faSyncAlt} spin={isFetching} />
            </button>
            <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600">
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm">Loading RC...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { label: "RC Code", key: "code" },
                    { label: "RC Name", key: "description" },
                  ].map((col) => (
                    <th key={col.key} className="px-4 py-2 text-left border-b border-slate-200">
                      <div onClick={() => handleSort(col.key)} className="flex items-center gap-1 cursor-pointer mb-1.5">
                        <label className="block text-[12px] font-bold text-slate-600 mb-1">{col.label}</label>
                        <FontAwesomeIcon icon={faSort} className={`text-[9px] ${sortConfig.key === col.key ? "text-blue-500" : "opacity-20"}`} />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={filters[col.key]}
                          onChange={(e) => setFilters((p) => ({ ...p, [col.key]: e.target.value }))}
                          placeholder="Filter..."
                          className="w-full pl-7 pr-2 py-1.5 text-xs font-normal border border-slate-200 rounded"
                        />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[9px]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, index) => (
                    <tr key={row.code || index} onClick={() => onClose(row)} className="group hover:bg-blue-50 cursor-pointer">
                      <td className="px-4 py-2 text-xs font-bold text-slate-600 w-[200px]">{row.code}</td>
                      <td className="px-4 py-2 text-xs text-slate-600 font-medium">{row.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2" className="px-4 py-20 text-center text-slate-400 italic">No matching records found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 px-4 border-t bg-slate-50 flex items-center justify-between">
          <span className="text-[12px] text-slate-500 font-medium">Total Records: {filteredAndSorted.length}</span>
        </div>
      </div>
    </div>
  );
};
export default SearchRefRC;
