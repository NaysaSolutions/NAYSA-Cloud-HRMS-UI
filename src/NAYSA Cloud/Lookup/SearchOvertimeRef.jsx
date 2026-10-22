/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEraser,
  faSearch,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSwalErrorAlertAPI as showErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { parseOvertimeReferences } from "@/NAYSA Cloud/Global/overtimeSelection.js";

const columns = [
  { key: "code", label: "OT Code" },
  { key: "description", label: "Description" },
  { key: "otRate", label: "Rate" },
];

const SearchOvertimeRef = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [overtimes, setOvertimes] = useState([]);
  const [filters, setFilters] = useState({ code: "", description: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  useEffect(() => {
    if (!isOpen) return;
    setFilters({ code: "", description: "" });
    setSortConfig({ key: "", direction: "asc" });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setOvertimes([]);
    const loadOvertimes = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/overtimeTransactions/selectionReferences", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = parseOvertimeReferences(response);
        setOvertimes(data.overtimes);
      } catch (error) {
        if (!controller.signal.aborted) {
          showErrorAlert("Reference Load Error", error?.response?.data?.message || error.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadOvertimes();
    return () => controller.abort();
  }, [isOpen, refreshVersion]);

  const filtered = useMemo(() => {
    const codeFilter = filters.code.trim().toLowerCase();
    const descriptionFilter = filters.description.trim().toLowerCase();
    const result = overtimes.filter(
      (ot) =>
        String(ot.code ?? "").toLowerCase().includes(codeFilter) &&
        String(ot.description ?? "").toLowerCase().includes(descriptionFilter)
    );

    if (sortConfig.key) {
      result.sort((left, right) => {
        const comparison = String(left[sortConfig.key] ?? "").localeCompare(
          String(right[sortConfig.key] ?? ""),
          undefined,
          { numeric: true }
        );
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [overtimes, filters, sortConfig]);

  const handleSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overtime-lookup-title"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 id="overtime-lookup-title" className="global-lookup-headertext-ui">
              Select Overtime Code
            </h2>
            {loading && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setFilters({ code: "", description: "" })}
                className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-100"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}
            <button
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              disabled={loading}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600 disabled:opacity-40"
              title="Refresh Data"
              aria-label="Refresh overtime data"
            >
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={loading} />
            </button>
            <button
              type="button"
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 transition-colors hover:text-red-600"
              aria-label="Close overtime lookup"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-grow overflow-auto bg-white custom-scrollbar dark:bg-slate-900">
          {loading ? (
            <div role="status" className="flex h-64 flex-col items-center justify-center text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading...</p>
            </div>
          ) : (
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-700">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={sortConfig.key === column.key ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
                      className="global-lookup-th-ui"
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="mb-1 flex w-full items-center gap-3 text-left group"
                      >
                        <span className="global-lookup-th-text-ui">{column.label}</span>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`mb-1 text-[10px] ${sortConfig.key === column.key ? "text-gray-600 dark:text-gray-300" : "opacity-30 group-hover:opacity-100"}`}
                        />
                      </button>
                      <div className="relative">
                        <input
                          type="text"
                          value={filters[column.key]}
                          onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                          placeholder="Filter..."
                          aria-label={`Filter ${column.label}`}
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.length > 0 ? filtered.map((ot) => (
  <tr
    key={ot.code}
    onClick={() => onClose(ot)}
    className="cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-slate-800"
  >
    <td className="global-lookup-td-ui font-bold">{ot.code}</td>
    <td className="global-lookup-td-ui">{ot.description}</td>
    <td className="global-lookup-td-ui text-right">
      {Number(ot.otRate ?? ot.ot_rate ?? 0).toFixed(2)}
    </td>
  </tr>
)) : (
  <tr>
    <td colSpan={3} className="px-4 py-20 text-center text-sm italic text-slate-400">
      No matching records found.
    </td>
  </tr>
)}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui shrink-0 dark:border-slate-700 dark:bg-slate-800">
          <span className="global-lookup-footer-records-text-ui">Total Records: {filtered.length}</span>
        </div>

        <style>{`
          .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
          .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
      </div>
    </div>
  );
};

export default SearchOvertimeRef;
