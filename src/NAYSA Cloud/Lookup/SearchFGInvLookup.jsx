// SearchFGInvLookup.jsx
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "../Configuration/BaseURL"; // adjust path if needed

const FGInvLookup = ({
  isOpen,
  onClose,
  userCode = "",
  docType  = "FG",
  debug    = true,
}) => {
  const [rows,       setRows]       = useState([]);
  const [modalReady, setModalReady] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // per-column filters
  const [filters, setFilters] = useState({
    itemCode:  "",
    itemName:  "",
    uom:       "",
    categCode: "",
    classCode: "",
  });

  // multi-select
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const log   = (...args) => debug && console.log(...args);
  const close = (payload = null) => onClose?.(payload);

  // -------------------------
  // Load data
  // -------------------------
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      setError("");
      setRows([]);
      setSelectedKeys(new Set());

      const payload = {
        docType:  docType  || "FG",
        userCode: userCode || "",
      };

      try {
        log("FGInvLookup → API payload:", payload);

        const endpoint = "/fgLookup";
        log("FGInvLookup → POST", endpoint);

        const res  = await postRequest(endpoint, payload);
        const body = res?.data ?? res;

        log("FGInvLookup ← BODY:", body);

        const list = Array.isArray(body?.result) ? body.result : [];

        if (isMounted) {
          setRows(list);
          setModalReady(true);
        }
      } catch (e) {
        console.error("FGInvLookup ❌ error:", e?.response?.status, e?.response?.data || e?.message);
        if (isMounted) {
          setError(
            e?.response?.data?.message ||
            e?.message ||
            "Failed to load FG inventory lookup."
          );
          setRows([]);
          setModalReady(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, userCode, docType]);

  // -------------------------
  // Helpers
  // -------------------------
  const rowKey = (r) => r?.itemCode || "";

  const fmtQty = (v) => {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleFilterChange = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const filtered = useMemo(() => {
    const toLower = (v) => (v ?? "").toString().toLowerCase();
    const f = {
      itemCode:  toLower(filters.itemCode),
      itemName:  toLower(filters.itemName),
      uom:       toLower(filters.uom),
      categCode: toLower(filters.categCode),
      classCode: toLower(filters.classCode),
    };

    return (rows || []).filter((r) =>
      toLower(r.itemCode).includes(f.itemCode)   &&
      toLower(r.itemName).includes(f.itemName)   &&
      toLower(r.uom).includes(f.uom)             &&
      toLower(r.categCode).includes(f.categCode) &&
      toLower(r.classCode).includes(f.classCode)
    );
  }, [rows, filters]);

  const isAllChecked = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every((r) => selectedKeys.has(rowKey(r)));
  }, [filtered, selectedKeys]);

  const toggleRow = (r) => {
    const k = rowKey(r);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys((prev) => {
      const next       = new Set(prev);
      const all        = filtered.map(rowKey);
      const shouldSelectAll = !filtered.every((r) => next.has(rowKey(r)));
      if (shouldSelectAll) all.forEach((k) => next.add(k));
      else                 all.forEach((k) => next.delete(k));
      return next;
    });
  };

  const applySelected = () => {
    const selected = filtered.filter((r) => selectedKeys.has(rowKey(r)));
    close(selected); // returns array
  };

  if (!isOpen) return null;

  return (
    <>
      {modalReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col relative overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <div className="text-sm font-semibold text-blue-800">
                FG Inventory Lookup (Multi-select)
              </div>

              <button
                type="button"
                onClick={() => close(null)}
                className="text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>

            {/* Error banner */}
            {error ? (
              <div className="p-3 text-sm bg-red-100 border-b border-red-200 text-red-700">
                {error}
              </div>
            ) : null}

            {/* Table */}
            <div className="overflow-auto max-h-[calc(90vh-150px)] custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-100 table-fixed">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">

                  {/* Column header row */}
                  <tr>
                    {/* Checkbox column */}
                    <th className="w-10 px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isAllChecked}
                        onChange={toggleAll}
                        className="h-4 w-4"
                        title="Select all"
                      />
                    </th>

                    <th className="w-32  px-3 py-2 text-left text-xs font-bold text-blue-900">Item Code</th>
                    <th className="w-72  px-3 py-2 text-left text-xs font-bold text-blue-900">Item Name</th>
                    <th className="w-20  px-3 py-2 text-left text-xs font-bold text-blue-900">UOM</th>
                    <th className="w-28  px-3 py-2 text-right text-xs font-bold text-blue-900">Qty on Hand</th>
                    <th className="w-32  px-3 py-2 text-left text-xs font-bold text-blue-900">Category</th>
                    <th className="w-48  px-3 py-2 text-left text-xs font-bold text-blue-900">Category Desc</th>
                    <th className="w-32  px-3 py-2 text-left text-xs font-bold text-blue-900">Class</th>
                    <th className="w-48  px-3 py-2 text-left text-xs font-bold text-blue-900">Class Desc</th>
                  </tr>

                  {/* Filter row */}
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1" />

                    <th className="px-2 py-1">
                      <input
                        value={filters.itemCode}
                        onChange={(e) => handleFilterChange("itemCode", e.target.value)}
                        placeholder="Filter"
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </th>
                    <th className="px-2 py-1">
                      <input
                        value={filters.itemName}
                        onChange={(e) => handleFilterChange("itemName", e.target.value)}
                        placeholder="Filter"
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </th>
                    <th className="px-2 py-1">
                      <input
                        value={filters.uom}
                        onChange={(e) => handleFilterChange("uom", e.target.value)}
                        placeholder="Filter"
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </th>
                    <th className="px-2 py-1" /> {/* Qty on Hand — no filter */}
                    <th className="px-2 py-1">
                      <input
                        value={filters.categCode}
                        onChange={(e) => handleFilterChange("categCode", e.target.value)}
                        placeholder="Filter"
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </th>
                    <th className="px-2 py-1" /> {/* Category Desc — no filter */}
                    <th className="px-2 py-1">
                      <input
                        value={filters.classCode}
                        onChange={(e) => handleFilterChange("classCode", e.target.value)}
                        placeholder="Filter"
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </th>
                    <th className="px-2 py-1" /> {/* Class Desc — no filter */}
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 text-xs">
                  {filtered.length > 0 ? (
                    filtered.map((r, idx) => {
                      const k       = rowKey(r);
                      const checked = selectedKeys.has(k);

                      return (
                        <tr
                          key={k + "|" + idx}
                          className={`hover:bg-blue-50 transition-colors duration-150 ${
                            checked ? "bg-blue-50" : ""
                          }`}
                          onClick={() => toggleRow(r)}
                        >
                          <td className="px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(r)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                          </td>

                          <td className="px-3 py-1">
                            <div className="truncate" title={r.itemCode}>{r.itemCode}</div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="truncate" title={r.itemName}>{r.itemName}</div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="truncate" title={r.uom}>{r.uom}</div>
                          </td>
                          <td className="px-3 py-1 text-right">
                            <div className="truncate" title={String(r.qtyHand)}>{fmtQty(r.qtyHand)}</div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="truncate" title={r.categCode}>{r.categCode}</div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="truncate" title={r.categDesc}>{r.categDesc}</div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="truncate" title={r.classCode}>{r.classCode}</div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="truncate" title={r.classDesc}>{r.classDesc}</div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No matching records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-600 font-semibold">
                Showing <strong>{filtered.length}</strong> of {rows.length} entries
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => close(null)}
                  className="px-4 py-1 text-xs font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={applySelected}
                  disabled={selectedKeys.size === 0}
                  className={`px-4 py-1 text-xs font-medium rounded-md text-white ${
                    selectedKeys.size === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Apply Selected
                </button>
              </div>
            </div>

            <style jsx="true">{`
              .custom-scrollbar::-webkit-scrollbar       { width: 8px; height: 8px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
          </div>
        </div>
      )}

      {/* Spinner overlay */}
      {ReactDOM.createPortal(
        loading ? (
          <div className="global-tran-spinner-main-div-ui">
            <div className="global-tran-spinner-sub-div-ui">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
              <p>Please wait...</p>
            </div>
          </div>
        ) : null,
        document.body
      )}
    </>
  );
};

export default FGInvLookup;