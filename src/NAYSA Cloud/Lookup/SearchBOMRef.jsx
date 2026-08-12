import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const columnConfig = [
  { label: "Type", key: "invType", width: "w-[80px]" },
  { label: "Item Code", key: "itemCode", width: "w-[130px]" },
  { label: "Item Name", key: "itemName" },
  { label: "UOM", key: "uomCode", width: "w-[90px]" },
  { label: "BOM Code", key: "bomCode", width: "w-[130px]" },
  { label: "BOM Date", key: "bomDate", width: "w-[120px]" },
  { label: "BOM Qty", key: "bomQty", width: "w-[110px]" },
  { label: "WC Code", key: "wcCode", width: "w-[110px]" },
  { label: "WC Name", key: "wcName", width: "w-[150px]" },
  { label: "Route Code", key: "routeCode", width: "w-[120px]" },
];

const emptyFilters = columnConfig.reduce(
  (acc, column) => ({ ...acc, [column.key]: "" }),
  {}
);

const formatBOMDate = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOnly)) return dateOnly;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split("-");
    return `${month}/${day}/${year}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
};

const BOMReferenceLookupModal = ({
  isOpen,
  onClose,
  title = "Select BOM Reference",
}) => {
  const [filters, setFilters] = useState(emptyFilters);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");
  const debouncedFilters = useDebounce(filters, 300);

  const resetFilters = () => setFilters(emptyFilters);

  const {
    data: boms = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupBOM"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupBOM", {
        params: {
          PARAMS: JSON.stringify({
            json_data: {
              invType: "",
              itemCode: "",
              itemName: "",
              uomCode: "",
              bomCode: "",
              bomDate: "",
              bomQty: "",
              wcCode: "",
              wcName: "",
              routeCode: "",
            },
          }),
        },
      });

      const rawData = result?.data?.[0]?.result || "[]";
      return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  const filteredAndSorted = useMemo(() => {
    if (!boms.length) return [];

    const result = boms.filter((item) =>
      columnConfig.every((column) =>
        String(item[column.key] ?? "")
          .toLowerCase()
          .includes(String(debouncedFilters[column.key] ?? "").toLowerCase())
      )
    );

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
  }, [boms, debouncedFilters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
            {isFetching && (
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}

            {isFetching && (
              <span className="text-[9px] text-blue-500 animate-pulse font-bold flex items-center gap-1 uppercase mt-0.5">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                Syncing...
              </span>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Refresh Data"
            >
              <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
            </button>

            <button
              type="button"
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
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
              <p className="text-sm font-medium">Loading BOM references...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {columnConfig.map((col) => (
                    <th
                      key={col.key}
                      className={`global-lookup-th-ui ${col.width || ""}`}
                    >
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-3 cursor-pointer group mb-1"
                      >
                        <span className="global-lookup-th-text-ui">{col.label}</span>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`mb-1 text-[10px] ${
                            sortConfig.key === col.key
                              ? "text-gray-600"
                              : "opacity-30 group-hover:opacity-100"
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
                {filteredAndSorted.length > 0 ? (
                  filteredAndSorted.map((bom, index) => (
                    <tr
                      key={`${bom.bomCode || ""}-${bom.itemCode || ""}-${index}`}
                      onClick={() => onClose(bom)}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="global-lookup-td-ui">{bom.invType}</td>
                      <td className="global-lookup-td-ui font-bold">{bom.itemCode}</td>
                      <td className="global-lookup-td-ui">{bom.itemName}</td>
                      <td className="global-lookup-td-ui">{bom.uomCode}</td>
                      <td className="global-lookup-td-ui font-bold">{bom.bomCode}</td>
                      <td className="global-lookup-td-ui">{formatBOMDate(bom.bomDate)}</td>
                      <td className="global-lookup-td-ui text-right">{bom.bomQty}</td>
                      <td className="global-lookup-td-ui">{bom.wcCode}</td>
                      <td className="global-lookup-td-ui">{bom.wcName}</td>
                      <td className="global-lookup-td-ui">{bom.routeCode}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columnConfig.length}
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

        <div className="global-lookup-footer-records-div-ui">
          <div className="flex flex-col">
            <span className="global-lookup-footer-records-text-ui">
              Total Records: {filteredAndSorted.length}
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

export default BOMReferenceLookupModal;
