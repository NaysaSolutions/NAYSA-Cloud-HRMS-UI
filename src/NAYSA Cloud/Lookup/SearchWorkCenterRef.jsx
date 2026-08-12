import React, { useState, useMemo, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSyncAlt,
  faChevronLeft,
  faChevronRight,
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

const SearchWorkCenterRef = ({
  isOpen,
  onClose,
  customParam = "",
  title = "Select Work Center",
  withPagination = false,
}) => {
  const [filters, setFilters] = useState({
    wcCode: "",
    wcName: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = withPagination ? 100 : 999999;

  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  // --- FETCHING DATA ---
  const {
    data: workCenters = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupWorkCenter", customParam],
    queryFn: async () => {
      // Pass "Active" if customParam is empty so the stored procedure filters at the DB level
      const { data: result } = await apiClient.get("/lookupWorkCenter", {
        params: { PARAMS: customParam || "Active" },
      });
      const rawData = result?.data?.[0]?.result || "[]";
      return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
    },
    enabled: isOpen,
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    if (!workCenters.length) return [];
    return workCenters.filter((item) => {
      // Frontend fail-safe: explicitly filter out records where active is 'N'
      const isActive = !item.active || item.active.toUpperCase() === "Y";
      
      const matchCode = (item.wcCode || "")
        .toLowerCase()
        .includes(debouncedFilters.wcCode.toLowerCase());
        
      const matchName = (item.wcName || "")
        .toLowerCase()
        .includes(debouncedFilters.wcName.toLowerCase());

      return isActive && matchCode && matchName;
    });
  }, [workCenters, debouncedFilters]);

  // --- PAGINATION LOGIC ---
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 animate-fade-in backdrop-blur-[1px]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        {/* Header Section */}
        <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-md font-bold text-blue-800 dark:text-blue-400 propercase tracking-tight pl-2">
              {title}
            </h2>
            {isFetching && (
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="Manual Refresh"
            >
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>
            <button
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-grow overflow-auto custom-scrollbar bg-white dark:bg-gray-800">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="2x"
                className="mb-4 text-blue-500"
              />
              <p className="text-sm font-medium">Fetching Reference Data...</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-gray-700">
                <tr>
                  {/* Existing WC Code Header */}
                  <th className="px-4 py-2 text-left">
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-gray-300 propercase mb-1">
                      Work Center Code
                    </label>
                    <input
                      type="text"
                      value={filters.wcCode}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, wcCode: e.target.value }))
                      }
                      placeholder="Filter..."
                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </th>
                  {/* Existing WC Name Header */}
                  <th className="px-4 py-2 text-left">
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-gray-300 propercase mb-1">
                      Work Center Name
                    </label>
                    <input
                      type="text"
                      value={filters.wcName}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, wcName: e.target.value }))
                      }
                      placeholder="Filter..."
                      className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </th>
                  {/* NEW: Est Runtime Header */}
                  <th className="px-4 py-2 text-right">
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-gray-300 propercase mb-1">
                      Estimated Runtime{" "}
                      <span className="normal-case">(Mins)</span>
                    </label>
                    <div className="h-[26px]"></div>{" "}
                    {/* Spacer to align with inputs */}
                  </th>
                  {/* NEW: Std Labor Header */}
                  <th className="px-4 py-2 text-right">
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-gray-300 propercase mb-1">
                      Standard Direct Labor Cost
                    </label>
                    <div className="h-[26px]"></div>
                  </th>
                  {/* NEW: Std Overhead Header */}
                  <th className="px-4 py-2 text-right">
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-gray-300 propercase mb-1">
                      Standard Factory Overhead Cost
                    </label>
                    <div className="h-[26px]"></div>
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-gray-800">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => (
                    <tr
                      key={item.wcCode || index}
                      onClick={() => onClose(item)}
                      className="group hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-blue-400 w-[150px]">
                        {item.wcCode}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-gray-300 whitespace-nowrap">
                        {item.wcName}
                      </td>
                      {/* NEW: Est Runtime Cell */}
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-gray-300 text-right whitespace-nowrap">
                        {Number(item.estRuntime || 0).toFixed(2)}
                      </td>
                      {/* NEW: Std Labor Cell */}
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-gray-300 text-right whitespace-nowrap">
                        {Number(item.stdLabor || 0).toFixed(2)}
                      </td>
                      {/* NEW: Std Overhead Cell */}
                      <td className="px-4 py-2 text-xs text-slate-600 dark:text-gray-300 text-right whitespace-nowrap">
                        {Number(item.stdOverhead || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    {/* Updated colSpan from 2 to 5 */}
                    <td
                      colSpan="5"
                      className="px-4 py-16 text-center text-slate-400 italic text-sm"
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Section */}
        <div className="p-2 px-4 border-t bg-slate-50 dark:bg-gray-900 flex justify-between items-center">
          <span className="text-[11px] text-slate-500 font-medium">
            {filteredData.length} Records Found
          </span>

          <div className="flex items-center gap-3">
            {isFetching && (
              <span className="text-[10px] text-blue-500 animate-pulse flex items-center gap-1 font-medium">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                Auto-syncing...
              </span>
            )}

            {withPagination && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-slate-400 disabled:opacity-30 hover:text-blue-600"
                >
                  <FontAwesomeIcon icon={faChevronLeft} size="xs" />
                </button>
                <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1 text-slate-400 disabled:opacity-30 hover:text-blue-600"
                >
                  <FontAwesomeIcon icon={faChevronRight} size="xs" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .animate-fade-in {
          animation: fadeIn 0.1s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.98);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default SearchWorkCenterRef;
