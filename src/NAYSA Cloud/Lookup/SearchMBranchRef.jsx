import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSyncAlt,
  faSort,
  faSearch,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";

// Simple debounce hook to prevent excessive filtering
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const BranchSelectionModal = ({
  isOpen,
  onClose,
  branchData = [],
  selectedBranches = [],
  onApply,
  title = "Select Branches",
  isLoading = false,
  isFetching = false,
  onRefresh,
}) => {
  const [filters, setFilters] = useState({
    branchCode: "",
    branchName: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  const [tempSelected, setTempSelected] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    setTempSelected(Array.isArray(selectedBranches) ? selectedBranches : []);
    setFilters({ branchCode: "", branchName: "" });

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, selectedBranches]);

  const debouncedFilters = useDebounce(filters, 300);

  const normalizedBranchData = useMemo(() => {
    if (!Array.isArray(branchData)) return [];

    return branchData.map((item) => ({
      branchCode: item.branchCode ?? item.value ?? "",
      branchName: item.branchName ?? item.label ?? "",
    }));
  }, [branchData]);

  const filteredAndSorted = useMemo(() => {
    if (!normalizedBranchData.length) return [];

    let result = normalizedBranchData.filter((item) => {
      return (
        String(item.branchCode || "")
          .toLowerCase()
          .includes(debouncedFilters.branchCode.toLowerCase()) &&
        String(item.branchName || "")
          .toLowerCase()
          .includes(debouncedFilters.branchName.toLowerCase())
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
  }, [normalizedBranchData, debouncedFilters, sortConfig]);

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");

  const allFilteredSelected =
    filteredAndSorted.length > 0 &&
    filteredAndSorted.every((item) => tempSelected.includes(item.branchCode));

  const resetFilters = () => setFilters({ branchCode: "", branchName: "" });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleBranch = (branchCode) => {
    setTempSelected((prev) =>
      prev.includes(branchCode)
        ? prev.filter((code) => code !== branchCode)
        : [...prev, branchCode]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredCodes = filteredAndSorted.map((item) => item.branchCode);

    setTempSelected((prev) => {
      if (allFilteredSelected) {
        return prev.filter((code) => !filteredCodes.includes(code));
      }
      return Array.from(new Set([...prev, ...filteredCodes]));
    });
  };

  const handleApply = () => {
    onApply?.(tempSelected);
    onClose?.();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={() => onClose?.()} />

      <div className="relative z-[10001] bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[78vh] flex flex-col overflow-hidden transform animate-scale-in border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h2 className="text-md font-bold text-blue-800 tracking-tight propercase pl-2">
                {title}
              </h2>
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

            {typeof onRefresh === "function" && (
              <button
                onClick={onRefresh}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
              </button>
            )}

            <button
              onClick={() => onClose?.()}
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
              <p className="text-sm">Loading branch data...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  <th className="px-3 py-2 text-center border-b border-slate-200 w-[70px]">
                    <div className="flex items-center justify-center mb-1.5">
                      <label className="block text-[12px] font-semibold text-slate-600 propercase mb-1">
                        Select
                      </label>
                    </div>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected && filteredAndSorted.length > 0}
                        onChange={handleSelectAllFiltered}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </th>

                  {[
                    { label: "Branch Code", key: "branchCode" },
                    { label: "Branch Name", key: "branchName" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left border-b border-slate-200"
                    >
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 cursor-pointer group mb-1.5"
                      >
                        <label className="block text-[12px] font-semibold text-slate-600 propercase mb-1">
                          {col.label}
                        </label>
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
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.length > 0 ? (
                  filteredAndSorted.map((branch, index) => {
                    const checked = tempSelected.includes(branch.branchCode);

                    return (
                      <tr
                        key={branch.branchCode || index}
                        className={`group cursor-pointer transition-colors ${
                          checked ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50"
                        }`}
                        onClick={() => toggleBranch(branch.branchCode)}
                      >
                        <td className="px-3 py-2 text-center w-[70px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBranch(branch.branchCode)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        <td className="px-3 py-2 text-xs text-slate-600 w-[150px]">
                          {branch.branchCode}
                        </td>

                        <td className="px-3 py-2 text-xs text-slate-600">
                          {branch.branchName}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-20 text-center text-slate-400 italic text-sm"
                    >
                      No matching branches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-4 border-t bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[12px] text-slate-500 font-medium">
              Total Records: {filteredAndSorted.length}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">
              Selected: {tempSelected.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="px-4 py-2 text-[12px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-all"
            >
              Apply Selection
            </button>
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
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default BranchSelectionModal;