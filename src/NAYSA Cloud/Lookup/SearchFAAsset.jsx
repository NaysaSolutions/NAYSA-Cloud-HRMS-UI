import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSearch,
  faEraser,
  faQrcode,
  faBarcode,
  faSyncAlt,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { formatNumber } from "@/NAYSA Cloud/Global/behavior.jsx";

const safeText = (value) => (value === null || value === undefined ? "" : String(value));

const SearchFAAsset = ({
  isOpen,
  onClose,
  branchCode = "",
  title = "Asset Finder",
  activeOnly = true,
}) => {
  const scanInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    categCode: "",
    classCode: "",
    flocCode: "",
    rcCode: "",
    status: activeOnly ? "" : "All",
  });

  const hasActiveFilters = Object.values(filters).some((value) => String(value || "").trim() !== "") || activeOnly;

  const resetFilters = () => {
    setFilters({
      search: "",
      categCode: "",
      classCode: "",
      flocCode: "",
      rcCode: "",
      status: activeOnly ? "" : "All",
    });
    window.setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      const params = {
        PARAMS: JSON.stringify({
          json_data: {
            branchCode,
            search: filters.search,
            categCode: filters.categCode,
            classCode: filters.classCode,
            flocCode: filters.flocCode,
            rcCode: filters.rcCode,
            status: activeOnly ? "" : filters.status,
          },
        }),
      };

      const { data } = await apiClient.get("/lookupFAAsset", { params });
      const rawData = data?.data?.[0]?.result ?? data?.result ?? data?.data ?? "[]";
      const parsedRows = Array.isArray(rawData) ? rawData : JSON.parse(rawData || "[]");
      setRows(parsedRows);
    } catch (error) {
      console.error("Failed to fetch fixed asset list:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      return;
    }

    loadAssets();
    window.setTimeout(() => scanInputRef.current?.focus(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, branchCode]);

  const filteredRows = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    const c = filters.categCode.trim().toLowerCase();
    const cl = filters.classCode.trim().toLowerCase();
    const l = filters.flocCode.trim().toLowerCase();
    const r = filters.rcCode.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !s ||
        [row.faCode, row.tagNo, row.barCode, row.faName, row.serialNo, row.brandModel]
          .some((value) => safeText(value).toLowerCase().includes(s));

      return (
        matchesSearch &&
        safeText(row.categCode).toLowerCase().includes(c) &&
        safeText(row.classCode).toLowerCase().includes(cl) &&
        safeText(row.flocCode).toLowerCase().includes(l) &&
        safeText(row.rcCode).toLowerCase().includes(r)
      );
    });
  }, [rows, filters]);

  const handleApply = (row) => onClose?.(row);

  const handleScanKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const value = String(event.target.value || "").trim().toLowerCase();
    if (!value) return;

    const exactRow = rows.find((row) =>
      [row.tagNo, row.barCode, row.faCode].some((field) => safeText(field).toLowerCase() === value)
    );

    if (exactRow) {
      handleApply(exactRow);
      return;
    }

    loadAssets();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[88vh] flex flex-col relative overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
            {loading && (
              <span className="text-[10px] text-blue-600 font-bold animate-pulse">Loading...</span>
            )}
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
              onClick={loadAssets}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Refresh"
            >
              <FontAwesomeIcon icon={faSyncAlt} />
            </button>
            <button
              onClick={() => onClose?.(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="p-3 bg-white border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-5 relative">
              <input
                ref={scanInputRef}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                onKeyDown={handleScanKeyDown}
                placeholder="Input / scan property tag, QR code, barcode, asset no., serial no."
                className="w-full h-9 rounded-lg border border-slate-300 px-9 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-slate-400 text-xs" />
              <div className="absolute right-2 top-2 flex gap-1 text-slate-400">
                <FontAwesomeIcon icon={faQrcode} />
                <FontAwesomeIcon icon={faBarcode} />
              </div>
            </div>
            <input
              value={filters.categCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, categCode: e.target.value }))}
              placeholder="Category"
              className="md:col-span-2 h-9 rounded-lg border border-slate-300 px-2 text-xs"
            />
            <input
              value={filters.classCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, classCode: e.target.value }))}
              placeholder="Class"
              className="md:col-span-2 h-9 rounded-lg border border-slate-300 px-2 text-xs"
            />
            <input
              value={filters.flocCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, flocCode: e.target.value }))}
              placeholder="Location"
              className="md:col-span-2 h-9 rounded-lg border border-slate-300 px-2 text-xs"
            />
            <input
              value={filters.rcCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, rcCode: e.target.value }))}
              placeholder="RC"
              className="md:col-span-1 h-9 rounded-lg border border-slate-300 px-2 text-xs"
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            Press <span className="font-bold">Enter</span> after scanning QR/barcode to auto-select exact matching asset.
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <span className="text-sm font-medium">Loading assets...</span>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    "Asset No.", "Property Tag No.", "Barcode", "Asset Name", "Serial No.", "Category", "Class",
                    "Branch", "Location", "RC", "Custodian", "Cost", "Book Value", "Status"
                  ].map((label) => (
                    <th key={label} className="global-lookup-th-ui whitespace-nowrap">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-12 text-slate-400">No fixed asset found.</td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr
                      key={`${row.faCode}-${index}`}
                      onDoubleClick={() => handleApply(row)}
                      className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer"
                    >
                      <td className="global-lookup-td-ui font-semibold text-blue-700">{row.faCode}</td>
                      <td className="global-lookup-td-ui">{row.tagNo}</td>
                      <td className="global-lookup-td-ui">{row.barCode}</td>
                      <td className="global-lookup-td-ui min-w-[220px]">{row.faName}</td>
                      <td className="global-lookup-td-ui">{row.serialNo}</td>
                      <td className="global-lookup-td-ui">{row.categName || row.categCode}</td>
                      <td className="global-lookup-td-ui">{row.className || row.classCode}</td>
                      <td className="global-lookup-td-ui text-center">{row.branchCode}</td>
                      <td className="global-lookup-td-ui">{row.flocName || row.flocCode}</td>
                      <td className="global-lookup-td-ui text-center">{row.rcCode}</td>
                      <td className="global-lookup-td-ui">{row.empName}</td>
                      <td className="global-lookup-td-ui text-right">{formatNumber(row.acqCost || 0)}</td>
                      <td className="global-lookup-td-ui text-right">{formatNumber(row.nbValue || 0)}</td>
                      <td className="global-lookup-td-ui text-center font-semibold">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t bg-slate-50 text-[11px] text-slate-500">
          <span>{filteredRows.length} asset(s) found</span>
          <span>Double-click an asset to select.</span>
        </div>
      </div>
    </div>
  );
};

export default SearchFAAsset;
