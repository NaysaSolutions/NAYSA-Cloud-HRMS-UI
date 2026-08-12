import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSearch,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const INTRANSIT_LOCATION_CODE = "LOC_INT";
const INTRANSIT_LOCATION_NAME = "Intransit Location";

const isIncludeIntransit = (value) =>
  value === true || String(value || "").toUpperCase() === "YES";

const buildIntransitLocationRow = (branchCode = "") => ({
  code: INTRANSIT_LOCATION_CODE,
  description: INTRANSIT_LOCATION_NAME,
  branchCode,
});

const withOptionalIntransitLocation = (rows = [], includeIntransit, branchCode = "") => {
  if (!isIncludeIntransit(includeIntransit)) return rows;

  const withoutDuplicate = rows.filter(
    (row) => String(row?.code || "").toUpperCase() !== INTRANSIT_LOCATION_CODE
  );

  return [buildIntransitLocationRow(branchCode), ...withoutDuplicate];
};

const SearchFALoc = ({
  isOpen,
  onClose,
  branchCode,
  includeIntransit = false,
  title = "Search Fixed Asset Location Codes",
}) => {
  const [locations, setLocations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ code: "", description: "", branchCode: "" });
  const [loading, setLoading] = useState(false);
  const normalizedBranchCode = String(branchCode || "").trim();

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");

  const resetFilters = () => setFilters({ code: "", description: "", branchCode: "" });

  useEffect(() => {
    if (!isOpen) {
      setLocations([]);
      setFiltered([]);
      setFilters({ code: "", description: "", branchCode: "" });
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const params = {
          PARAMS: JSON.stringify({
            json_data: {
              branchCode: normalizedBranchCode,
            },
          }),
        };

        const { data: result } = await apiClient.get("/lookupFALoc", { params });

        const rawData =
          result?.data?.[0]?.result ??
          result?.result ??
          result?.data ??
          "[]";

        const rows = withOptionalIntransitLocation(
          Array.isArray(rawData) ? rawData : JSON.parse(rawData || "[]"),
          includeIntransit,
          normalizedBranchCode
        );

        if (!alive) return;

        setLocations(rows);
        setFiltered(rows);
      } catch (err) {
        console.error("Failed to fetch fixed asset location:", err);

        if (!alive) return;

        setLocations([]);
        setFiltered([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [includeIntransit, isOpen, normalizedBranchCode]);

  useEffect(() => {
    const newFiltered = locations.filter((item) => {
      const c = (item.code || "").toLowerCase();
      const n = (item.description || "").toLowerCase();
      const b = (item.branchCode || "").toLowerCase();

      return (
        c.includes((filters.code || "").toLowerCase()) &&
        n.includes((filters.description || "").toLowerCase()) &&
        b.includes((filters.branchCode || "").toLowerCase())
      );
    });

    setFiltered(newFiltered);
  }, [filters, locations]);

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
            <h2 className="global-lookup-headertext-ui">{title}</h2>
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
              <span className="text-sm font-medium">Loading location...</span>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { label: "Location Code", key: "code", width: "w-[150px]" },
                    { label: "Location Name", key: "description" },
                    { label: "Branch Code", key: "branchCode", width: "w-[150px]" },
                  ].map((col) => (
                    <th key={col.key} className={`global-lookup-th-ui ${col.width || ""}`}>
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
                      key={row.code || index}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleApply(row)}
                    >
                      <td className="global-lookup-td-ui font-bold">{row.code}</td>
                      <td className="global-lookup-td-ui">{row.description}</td>
                      <td className="global-lookup-td-ui">{row.branchCode}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-20 text-center text-slate-400 italic text-sm">
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

export default SearchFALoc;
