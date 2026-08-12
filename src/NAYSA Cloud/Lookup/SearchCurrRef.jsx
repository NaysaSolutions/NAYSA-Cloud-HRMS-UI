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

// Simple debounce hook to prevent excessive filtering
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const CurrLookupModal = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState({ currCode: "", currName: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");
  const resetFilters = () => setFilters({ currCode: "", currName: "" });

  const debouncedFilters = useDebounce(filters, 300);

  // 1. Fetching with Polling (Auto-Refresh)
  const {
    data: currency = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupCurrencies"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupCurr", {
        params: {
          PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 1000 }),
        },
      });
      const rawData = result?.data?.[0]?.result || "[]";
      return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30, // 🔄 AUTO-REFRESH: Every 30 seconds
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  // 2. High-Performance Filtering and Sorting
  const filteredAndSorted = useMemo(() => {
    if (!currency.length) return [];

    let result = currency.filter((item) => {
      return (
        (item.currCode || "")
          .toLowerCase()
          .includes(debouncedFilters.currCode.toLowerCase()) &&
        (item.currName || "")
          .toLowerCase()
          .includes(debouncedFilters.currName.toLowerCase())
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
  }, [currency, debouncedFilters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h2 className="text-md font-bold text-blue-800 tracking-tight propercase pl-2">
                Select Currency
              </h2>
              <div className="absolute -top-1 -right-4 flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${isFetching ? "block" : "hidden"}`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 bg-blue-500 ${isFetching ? "block" : "hidden"}`}
                ></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>
            <button
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="2x"
                className="mb-4 text-blue-500"
              />
              <p className="text-sm">Loading currency data...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { label: "Currency Code", key: "currCode" },
                    { label: "Description", key: "currName" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-2 text-left border-b border-slate-200"
                    >
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 cursor-pointer group mb-1.5"
                      >
                        <label className="block text-[12px] font-bold text-slate-600 propercase mb-1">
                          {col.label}
                        </label>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`text-[9px] ${sortConfig.key === col.key ? "text-blue-500" : "opacity-20"}`}
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={filters[col.key]}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          placeholder="Filter..."
                          className="w-full pl-7 pr-2 py-1.5 text-xs font-normal border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[9px]"
                        />
                      </div>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 w-15"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.length > 0 ? (
                  filteredAndSorted.map((curr, index) => (
                    <tr
                      key={curr.currCode || index}
                      onClick={() => onClose(curr)}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2 text-xs font-bold text-slate-600 w-[140px]">
                        {curr.currCode}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600 font-medium">
                        {curr.currName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-20 text-center text-slate-400 italic text-sm"
                    >
                      No matching currencies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-500 font-medium">
              Total Records: {filteredAndSorted.length}
            </span>
            {isFetching && (
              <span className="text-[9px] text-blue-500 animate-pulse font-bold flex items-center gap-1 uppercase">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div> Syncing
                Currencies...
              </span>
            )}
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default CurrLookupModal;