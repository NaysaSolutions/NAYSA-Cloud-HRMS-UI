import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare,
  faEraser,
  faSearch,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { fetchData } from "../Configuration/BaseURL";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const columns = [
  { key: "itemCode", label: "Item Code", width: "120px", classNames: "text-left" },
  { key: "itemName", label: "Item Name", width: "250px", classNames: "text-left" },
  { key: "uomCode", label: "UOM", width: "100px", classNames: "text-left" },
  { key: "qtyOnHand", label: "Quantity on Hand", width: "140px", classNames: "text-right" },
  { key: "categCode", label: "Category", width: "110px", classNames: "text-left" },
  // { key: "categDesc", label: "Category Name", width: "200px", classNames: "text-left" },
  { key: "classCode", label: "Classification", width: "110px", classNames: "text-left" },
  // { key: "classDesc", label: "Class Name", width: "220px", classNames: "text-left" },
];

const createFilterObject = () =>
  columns.reduce((acc, col) => {
    acc[col.key] = "";
    return acc;
  }, {});

const MSLookupModal = ({
  isOpen,
  onClose,
  customParam,
  enableMultiSelect = false,
  onGetSelectedItems,
  selectedItems: externalSelectedItems = [],
}) => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(createFilterObject);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [searchMode, setSearchMode] = useState("part");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [internalSelectedItems, setInternalSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedFilters = useDebounce(filters, 300);
  const selectedItems =
    externalSelectedItems?.length > 0 ? externalSelectedItems : internalSelectedItems;

  const getRowUniqueKey = (row) => String(row?.itemCode ?? row?.groupId ?? "");

  const selectedItemKeys = useMemo(() => {
    return new Set((selectedItems || []).map((item) => getRowUniqueKey(item)));
  }, [selectedItems]);

  const fetchMSItems = () => {
    setLoading(true);
    setError(null);

    const params = {
      PARAMS: JSON.stringify({
        search: customParam || "",
        page: 1,
        pageSize: 10,
      }),
    };

    fetchData("lookupMSMast", params)
      .then((result) => {
        if (result.success) {
          const raw = result.data?.[0]?.result || "[]";
          const msData = typeof raw === "string" ? JSON.parse(raw) : raw;
          setItems(Array.isArray(msData) ? msData : []);
          return;
        }

        setError(result.message || "Failed to fetch MS items.");
        setItems([]);
      })
      .catch((err) => {
        console.error("Failed to fetch MS items:", err);
        setError(`Error: ${err.message || "An unexpected error occurred."}`);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setFilters(createFilterObject());
      setSearchTerm("");
      setAppliedSearch("");
      setSearchMode("part");
      setSortConfig({ key: "", direction: "asc" });
      setInternalSelectedItems([]);
      setError(null);
      return;
    }

    setFilters(createFilterObject());
    setSearchTerm("");
    setAppliedSearch("");
    setSortConfig({ key: "", direction: "asc" });
    setInternalSelectedItems([]);
    fetchMSItems();
  }, [isOpen, customParam]);

  const filteredAndSorted = useMemo(() => {
    const toLower = (value) => String(value ?? "").toLowerCase();
    const searchValue = toLower(appliedSearch.trim());

    let result = items.filter((row) => {
      const matchesSearch =
        !searchValue ||
        (searchMode === "start"
          ? toLower(row.itemCode).startsWith(searchValue) ||
            toLower(row.itemName).startsWith(searchValue)
          : toLower(row.itemCode).includes(searchValue) ||
            toLower(row.itemName).includes(searchValue));

      const matchesColumns = columns.every((col) =>
        toLower(row[col.key]).includes(toLower(debouncedFilters[col.key]))
      );

      return matchesSearch && matchesColumns;
    });

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aRaw = a?.[sortConfig.key];
        const bRaw = b?.[sortConfig.key];
        const aNum = Number(aRaw);
        const bNum = Number(bRaw);
        const bothNumeric =
          aRaw !== null &&
          aRaw !== "" &&
          bRaw !== null &&
          bRaw !== "" &&
          !Number.isNaN(aNum) &&
          !Number.isNaN(bNum);

        if (bothNumeric) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        const aVal = String(aRaw ?? "");
        const bVal = String(bRaw ?? "");
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" })
          : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: "base" });
      });
    }

    return result;
  }, [items, appliedSearch, searchMode, debouncedFilters, sortConfig]);

  const allVisibleSelected =
    enableMultiSelect &&
    filteredAndSorted.length > 0 &&
    filteredAndSorted.every((row) => selectedItemKeys.has(getRowUniqueKey(row)));

  const someVisibleSelected =
    enableMultiSelect &&
    filteredAndSorted.some((row) => selectedItemKeys.has(getRowUniqueKey(row)));

  const hasActiveFilters =
    searchTerm !== "" ||
    appliedSearch !== "" ||
    Object.values(filters).some((val) => val !== "");

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearch("");
    setSortConfig({ key: "", direction: "asc" });
    setFilters(createFilterObject());
    setInternalSelectedItems([]);
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(searchTerm);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRowClick = (item) => {
    if (enableMultiSelect) return;
    onClose?.(item);
  };

  const handleToggleItem = (item) => {
    const rowKey = getRowUniqueKey(item);
    if (!rowKey) return;

    setInternalSelectedItems((prevSelected) => {
      const exists = prevSelected.some((x) => getRowUniqueKey(x) === rowKey);
      if (exists) return prevSelected.filter((x) => getRowUniqueKey(x) !== rowKey);
      return [...prevSelected, item];
    });
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setInternalSelectedItems((prev) =>
        prev.filter(
          (selected) =>
            !filteredAndSorted.some((row) => getRowUniqueKey(row) === getRowUniqueKey(selected))
        )
      );
      return;
    }

    setInternalSelectedItems((prev) => {
      const map = new Map(
        prev
          .filter((item) => getRowUniqueKey(item))
          .map((item) => [getRowUniqueKey(item), item])
      );

      filteredAndSorted.forEach((row) => {
        const rowKey = getRowUniqueKey(row);
        if (rowKey) map.set(rowKey, row);
      });

      return Array.from(map.values());
    });
  };

  const handleGetSelectedItems = () => {
    const payload = {
      records: Array.isArray(selectedItems) ? selectedItems : [],
    };

    if (onGetSelectedItems) {
      onGetSelectedItems(payload);
      return;
    }

    onClose?.(payload);
  };

  const formatCellValue = (key, value) => {
    if (value == null || value === "") return "";

    if (key === "qtyHand") {
      const numericValue = Number(value);
      return Number.isNaN(numericValue)
        ? value
        : numericValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          });
    }

    return value;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[80rem] max-h-[85vh] flex flex-col relative overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b">
          <h2 className="text-[16px] font-bold text-[#1e40af]">
            {enableMultiSelect ? "Select Items" : "Select Item"}
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchMSItems}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              type="button"
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            </button>

            <button
              onClick={() => onClose?.(null)}
              className="text-slate-400 hover:text-red-600 transition-colors"
              type="button"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleManualSearch}
          className="px-4 py-3 bg-slate-50 border-b flex items-center gap-6 flex-wrap"
        >
          <div className="flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <FontAwesomeIcon icon={faSearch} size="sm" />
              </span>

              <input
                type="text"
                placeholder="Search by item code or item name..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider"
            >
              {loading ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faSearch} />
              )}
              Filter
            </button>
          </div>

          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
              <input
                type="radio"
                value="start"
                checked={searchMode === "start"}
                onChange={(e) => setSearchMode(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              STARTS WITH
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
              <input
                type="radio"
                value="part"
                checked={searchMode === "part"}
                onChange={(e) => setSearchMode(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              CONTAINS
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-2 text-[10px] font-bold text-blue-600 hover:underline"
              >
                <FontAwesomeIcon icon={faEraser} className="mr-1" />
                CLEAR ALL
              </button>
            )}
          </div>
        </form>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Fetching from server...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 text-sm font-semibold" role="alert">
              {error}
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                <tr>
                  {enableMultiSelect && (
                    <th
                      style={{ width: "10px" }}
                      className="px-4 py-3 text-left border-b border-slate-200 align-top"
                    >
                      <div className="mb-2">
                        <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tighter">
                          Select
                        </span>
                      </div>

                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = !allVisibleSelected && someVisibleSelected;
                            }
                          }}
                          onChange={handleSelectAllVisible}
                          className="w-4 h-4 accent-blue-600"
                        />
                        {/* <span>Select All</span> */}
                      </label>
                    </th>
                  )}

                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width || "180px" }}
                      className="px-4 py-3 text-left border-b border-slate-200"
                    >
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-2 cursor-pointer mb-2 group"
                      >
                        <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tighter">
                          {col.label}
                        </span>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`text-[10px] ${
                            sortConfig.key === col.key ? "text-blue-500" : "opacity-20"
                          }`}
                        />
                      </div>

                      <div className="relative">
                        <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-300">
                          <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                        </span>
                        <input
                          type="text"
                          value={filters[col.key] || ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          placeholder="Filter..."
                          className="w-full pl-7 pr-2 py-1.5 text-[11px] font-normal border border-slate-200 rounded-md bg-white focus:border-blue-400 outline-none"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.length > 0 ? (
                  filteredAndSorted.map((item, idx) => {
                    const rowKey = getRowUniqueKey(item);
                    const isChecked = selectedItemKeys.has(rowKey);

                    return (
                      <tr
                        key={`${rowKey || idx}-${idx}`}
                        onClick={() => handleRowClick(item)}
                        className={`transition-colors group ${
                          enableMultiSelect
                            ? isChecked
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-slate-50"
                            : "hover:bg-blue-50 cursor-pointer"
                        }`}
                      >
                        {enableMultiSelect && (
                          <td className="px-4 py-3 text-[12px] text-slate-700 font-medium">
                            <div
                              className="flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleItem(item)}
                                className="w-4 h-4 accent-blue-600"
                              />
                            </div>
                          </td>
                        )}

                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-[12px] text-slate-700 font-medium ${col.classNames || ""}`}
                          >
                            {col.key === "itemCode" ? (
                              <span className="font-bold">
                                {formatCellValue(col.key, item[col.key])}
                              </span>
                            ) : (
                              formatCellValue(col.key, item[col.key])
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + (enableMultiSelect ? 1 : 0)}
                      className="px-4 py-20 text-center text-slate-400 italic"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Total Records: {filteredAndSorted.length}
            </span>

            {enableMultiSelect && (
              <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">
                Selected: {selectedItems.length}
              </span>
            )}
          </div>

          {enableMultiSelect && (
            <button
              type="button"
              onClick={handleGetSelectedItems}
              className="px-4 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedItems.length === 0}
            >
              <FontAwesomeIcon icon={faCheckSquare} />
              Get Selected Items
            </button>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MSLookupModal;
