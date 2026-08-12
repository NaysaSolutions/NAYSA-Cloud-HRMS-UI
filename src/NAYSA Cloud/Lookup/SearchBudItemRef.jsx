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

const yesNoText = (value) =>
  String(value || "").toUpperCase() === "Y" ? "Yes" : "No";

const SearchBudItemRef = ({
  isOpen,
  onClose,
  title = "Search Budget Codes",
  groupOnly = false,
  excludeCode = "",
  customParam = "",
}) => {
  const [filters, setFilters] = useState({
    code: "",
    description: "",
    budgetGroup: "",
    groupCode: "",
    clearanceReq: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 1000;

  const normalizedExcludeCode = String(excludeCode || "")
    .trim()
    .toUpperCase();

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");

  const resetFilters = () =>
    setFilters({
      code: "",
      description: "",
      budgetGroup: "",
      groupCode: "",
      clearanceReq: "",
    });

  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  const {
    data: budgetItems = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupBudItemRef", customParam],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupBudItemRef", {
        params: {
          PARAMS: JSON.stringify({
            search: customParam || "",
            page: 1,
            pageSize: 1000,
          }),
        },
      });

      const budgetData =
        Array.isArray(result?.data) && result.data[0]?.result
          ? JSON.parse(result.data[0].result)
          : [];

      return budgetData.map((x) => ({
        ...x,
        code: x.code ?? x.budgetCode ?? x.budget_code ?? "",
        description:
          x.description ?? x.budgetName ?? x.budget_name ?? x.name ?? "",
        budgetGroup: x.budgetGroup ?? x.budget_group ?? x.BUDGET_GROUP ?? "N",
        groupCode: x.groupCode ?? x.group_code ?? x.GROUP_CODE ?? "",
        clearanceReq:
          x.clearanceReq ?? x.clearance_req ?? x.CLEARANCE_REQ ?? "N",
        active: x.active ?? x.ACTIVE ?? "",
      }));
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  const filteredAndSorted = useMemo(() => {
    if (!budgetItems.length) return [];

    let result = budgetItems.filter((item) => {
      const code = String(item?.code ?? "").trim().toUpperCase();
      const budgetGroup = String(item?.budgetGroup ?? "")
        .trim()
        .toUpperCase();

      if (normalizedExcludeCode && code === normalizedExcludeCode) {
        return false;
      }

      if (groupOnly && budgetGroup !== "Y") {
        return false;
      }

      const codeText = String(item?.code ?? "").toLowerCase();
      const descriptionText = String(item?.description ?? "").toLowerCase();

      const budgetGroupText = yesNoText(item?.budgetGroup).toLowerCase();
      const budgetGroupRaw = String(item?.budgetGroup ?? "").toLowerCase();

      const groupCodeText = String(item?.groupCode ?? "").toLowerCase();

      const clearanceReqText = yesNoText(item?.clearanceReq).toLowerCase();
      const clearanceReqRaw = String(item?.clearanceReq ?? "").toLowerCase();

      return (
        codeText.includes(String(debouncedFilters.code || "").toLowerCase()) &&
        descriptionText.includes(
          String(debouncedFilters.description || "").toLowerCase()
        ) &&
        (budgetGroupText.includes(
          String(debouncedFilters.budgetGroup || "").toLowerCase()
        ) ||
          budgetGroupRaw.includes(
            String(debouncedFilters.budgetGroup || "").toLowerCase()
          )) &&
        groupCodeText.includes(
          String(debouncedFilters.groupCode || "").toLowerCase()
        ) &&
        (clearanceReqText.includes(
          String(debouncedFilters.clearanceReq || "").toLowerCase()
        ) ||
          clearanceReqRaw.includes(
            String(debouncedFilters.clearanceReq || "").toLowerCase()
          ))
      );
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
  }, [
    budgetItems,
    debouncedFilters,
    groupOnly,
    normalizedExcludeCode,
    sortConfig,
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

  const handleApply = (row) => {
    onClose(row);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3 relative">
            <h2 className="global-lookup-headertext-ui">{title}</h2>

            <div className="absolute -top-1 -right-4 flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${
                  isFetching ? "block" : "hidden"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 bg-blue-500 ${
                  isFetching ? "block" : "hidden"
                }`}
              ></span>
            </div>
          </div>

          <div className="flex items-center gap-1">
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
              aria-label="Refresh budget codes"
            >
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>

            <button
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="2x"
                className="mb-4 text-blue-500"
              />
              <span className="text-sm font-medium">
                Loading budget codes...
              </span>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    {
                      label: "Budget Code",
                      key: "code",
                      width: "w-[150px]",
                    },
                    {
                      label: "Budget Name",
                      key: "description",
                      width: "min-w-[260px]",
                    },
                    {
                      label: "Budget Group",
                      key: "budgetGroup",
                      width: "w-[140px]",
                    },
                    {
                      label: "Group Code",
                      key: "groupCode",
                      width: "w-[150px]",
                    },
                    {
                      label: "Clearance Required",
                      key: "clearanceReq",
                      width: "w-[170px]",
                    },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`global-lookup-th-ui ${col.width || ""}`}
                    >
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 cursor-pointer group mb-1"
                      >
                        <span className="global-lookup-th-text-ui">
                          {col.label}
                        </span>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`text-[9px] ${
                            sortConfig.key === col.key
                              ? "text-blue-500"
                              : "opacity-20"
                          }`}
                        />
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={filters[col.key]}
                          onChange={(e) => handleFilterChange(e, col.key)}
                          placeholder="Filter..."
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, index) => (
                    <tr
                      key={row.code || index}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleApply(row)}
                    >
                      <td className="global-lookup-td-ui font-bold">
                        {row.code}
                      </td>
                      <td className="global-lookup-td-ui">
                        {row.description}
                      </td>
                      <td className="global-lookup-td-ui">
                        {yesNoText(row.budgetGroup)}
                      </td>
                      <td className="global-lookup-td-ui">
                        {row.groupCode}
                      </td>
                      <td className="global-lookup-td-ui">
                        {yesNoText(row.clearanceReq)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-20 text-center text-slate-400 italic text-sm"
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui flex items-center justify-between">
          <div className="flex flex-col">
            <span className="global-lookup-footer-records-text-ui">
              Total Records: {filteredAndSorted.length}
            </span>

            {isFetching && (
              <span className="text-[9px] text-blue-500 animate-pulse font-bold flex items-center gap-1 uppercase">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                Syncing budget codes...
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="text-[11px] text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
          )}
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .custom-scrollbar {
          scrollbar-width: auto;
          scrollbar-color: #cbd5e1 transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
          border: 3px solid transparent;
          background-clip: content-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default SearchBudItemRef;
