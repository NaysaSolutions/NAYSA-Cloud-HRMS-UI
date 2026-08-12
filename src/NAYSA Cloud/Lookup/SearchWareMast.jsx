import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSearch,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const WarehouseLookupModal = ({
  isOpen,
  onClose,
  filter = "ActiveAll",
  branchCode = "",
  invType = "",
}) => {
  const [warehouse, setWarehouse] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ whCode: "", whName: "" });
  const [loading, setLoading] = useState(false);
  const hasActiveFilters = Object.values(filters).some((val) => val !== "");
  const resetFilters = () => setFilters({ whCode: "", whName: "" });

  useEffect(() => {
    if (!isOpen) {
      setWarehouse([]);
      setFiltered([]);
      setFilters({ whCode: "", whName: "" });
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: result } = await apiClient.get("warehouse/lookupWarehouse", {
          params: { filter, branchCode, invType },
        });

        const rows =
          Array.isArray(result?.data) && result.data[0]?.result
            ? JSON.parse(result.data[0].result)
            : [];

        if (!alive) return;
        setWarehouse(rows);
        setFiltered(rows);
      } catch (err) {
        console.error("Failed to fetch warehouse:", err);
        if (!alive) return;
        setWarehouse([]);
        setFiltered([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, filter, branchCode, invType]);

  useEffect(() => {
    const newFiltered = warehouse.filter((item) => {
      const code = (item.whCode || "").toLowerCase();
      const name = (item.whName || "").toLowerCase();

      return (
        code.includes((filters.whCode || "").toLowerCase()) &&
        name.includes((filters.whName || "").toLowerCase())
      );
    });

    setFiltered(newFiltered);
  }, [filters, warehouse]);

  const handleApply = (row) => onClose(row);

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">Select Warehouse</h2>
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
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading warehouse data...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 table-fixed">
  <colgroup>
    <col className="w-[120px]" />
    <col className="w-auto" />
  </colgroup>

  <thead className="sticky top-0 z-10 bg-slate-200">
    <tr>
      {[
        { label: "Warehouse Code", key: "whCode" },
        { label: "Warehouse Name", key: "whName" },
      ].map((col) => (
        <th key={col.key} className="global-lookup-th-ui">
          <div className="flex items-center gap-3 mb-1">
            <span className="global-lookup-th-text-ui">{col.label}</span>
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
                {filtered.length > 0 ? (
                  filtered.map((row, index) => (
                    <tr
                      key={index}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleApply(row)}
                    >
                      <td className="global-lookup-td-ui font-bold">{row.whCode}</td>
                      <td className="global-lookup-td-ui">{row.whName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-4 py-20 text-center text-slate-400 italic text-sm">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <div className="flex flex-col">
            <span className="global-lookup-footer-records-text-ui">
              Total Records: {filtered.length}
            </span>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .custom-scrollbar {
          scrollbar-width: auto;
          scrollbar-color: #cbd5e1 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 12px; height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default WarehouseLookupModal;
