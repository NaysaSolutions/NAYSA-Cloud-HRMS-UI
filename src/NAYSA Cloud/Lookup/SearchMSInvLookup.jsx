// SearchMSInvLookup.jsx
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "../Configuration/BaseURL"; // adjust path if needed

const MSInvLookup = ({
  isOpen,
  onClose,
  userCode   = "",
  whouseCode = "",
  locCode    = "",
  docType    = "MSIS",
  tranType   = "",
  debug      = true,
}) => {
  const [rows,       setRows]       = useState([]);
  const [modalReady, setModalReady] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // per-column filters
  const [filters, setFilters] = useState({
    itemCode:   "",
    itemName:   "",
    uomCode:    "",
    lotNo:      "",
    qstatCode:  "",
    whouseCode: "",
    locCode:    "",
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
        whouseCode: whouseCode || "",
        locCode:    locCode    || "",
        docType:    docType    || "MSIS",
        userCode:   userCode   || "",
      };

      try {
        log("MSInvLookup → API payload:", payload);

        const endpoint = "/msLookup";
        log("MSInvLookup → POST", endpoint);

        const res  = await postRequest(endpoint, payload);
        const body = res?.data ?? res;

        log("MSInvLookup ← BODY:", body);

        const list = Array.isArray(body?.result) ? body.result : [];

        if (isMounted) {
          setRows(list);
          setModalReady(true);
        }
      } catch (e) {
        console.error("MSInvLookup ❌ error:", e?.response?.status, e?.response?.data || e?.message);
        if (isMounted) {
          setError(
            e?.response?.data?.message ||
            e?.message ||
            "Failed to load MS inventory lookup."
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
  }, [isOpen, whouseCode, locCode, userCode, docType, tranType]);

  // -------------------------
  // Helpers
  // -------------------------
  const rowKey = (r) =>
    (r?.uniqueKey && `${r.itemCode}|${r.uniqueKey}`) ||
    `${r.itemCode}|${r.lotNo || ""}|${r.bbDate || ""}|${r.qstatCode || ""}|${r.whouseCode || ""}|${r.locCode || ""}`;

  const fmtQty = (v) => {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtCost = (v) => {
    const n = Number(v ?? 0);
    if (Number.isNaN(n)) return "0.000000";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const fmtDate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  };

  const handleFilterChange = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const filtered = useMemo(() => {
    const toLower = (v) => (v ?? "").toString().toLowerCase();
    const f = {
      itemCode:   toLower(filters.itemCode),
      itemName:   toLower(filters.itemName),
      uomCode:    toLower(filters.uomCode),
      lotNo:      toLower(filters.lotNo),
      qstatCode:  toLower(filters.qstatCode),
      whouseCode: toLower(filters.whouseCode),
      locCode:    toLower(filters.locCode),
    };

    return (rows || []).filter((r) =>
      toLower(r.itemCode).includes(f.itemCode)     &&
      toLower(r.itemName).includes(f.itemName)     &&
      toLower(r.uomCode).includes(f.uomCode)       &&
      toLower(r.lotNo).includes(f.lotNo)           &&
      toLower(r.qstatCode).includes(f.qstatCode)   &&
      toLower(r.whouseCode).includes(f.whouseCode) &&
      toLower(r.locCode).includes(f.locCode)
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
      const next            = new Set(prev);
      const all             = filtered.map(rowKey);
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
                MS Inventory Lookup (Multi-select)
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
                    <th className="w-32  px-3 py-2 text-left  text-xs font-bold text-blue-900">Item Code</th>
                    <th className="w-72  px-3 py-2 text-left  text-xs font-bold text-blue-900">Item Name</th>
                    <th className="w-20  px-3 py-2 text-left  text-xs font-bold text-blue-900">UOM</th>
                    <th className="w-28  px-3 py-2 text-right text-xs font-bold text-blue-900">On Hand</th>
                    <th className="w-28  px-3 py-2 text-right text-xs font-bold text-blue-900">Unit Cost</th>
                    <th className="w-32  px-3 py-2 text-left  text-xs font-bold text-blue-900">Lot No</th>
                    <th className="w-28  px-3 py-2 text-left  text-xs font-bold text-blue-900">BB Date</th>
                    <th className="w-32  px-3 py-2 text-left  text-xs font-bold text-blue-900">Quality</th>
                    <th className="w-28  px-3 py-2 text-left  text-xs font-bold text-blue-900">Warehouse</th>
                    <th className="w-28  px-3 py-2 text-left  text-xs font-bold text-blue-900">Location</th>
                  </tr>

                  {/* Filter row */}
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1" />
                    <th className="px-2 py-1">
                      <input value={filters.itemCode}   onChange={(e) => handleFilterChange("itemCode",   e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
                    <th className="px-2 py-1">
                      <input value={filters.itemName}   onChange={(e) => handleFilterChange("itemName",   e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
                    <th className="px-2 py-1">
                      <input value={filters.uomCode}    onChange={(e) => handleFilterChange("uomCode",    e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
                    <th className="px-2 py-1" /> {/* On Hand — no filter */}
                    <th className="px-2 py-1" /> {/* Unit Cost — no filter */}
                    <th className="px-2 py-1">
                      <input value={filters.lotNo}      onChange={(e) => handleFilterChange("lotNo",      e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
                    <th className="px-2 py-1" /> {/* BB Date — no filter */}
                    <th className="px-2 py-1">
                      <input value={filters.qstatCode}  onChange={(e) => handleFilterChange("qstatCode",  e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
                    <th className="px-2 py-1">
                      <input value={filters.whouseCode} onChange={(e) => handleFilterChange("whouseCode", e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
                    <th className="px-2 py-1">
                      <input value={filters.locCode}    onChange={(e) => handleFilterChange("locCode",    e.target.value)} placeholder="Filter" className="w-full px-2 py-1 text-xs border rounded" />
                    </th>
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
                          className={`hover:bg-blue-50 transition-colors duration-150 ${checked ? "bg-blue-50" : ""}`}
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
                          <td className="px-3 py-1"><div className="truncate" title={r.itemCode}>{r.itemCode}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.itemName}>{r.itemName}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.uomCode}>{r.uomCode}</div></td>
                          <td className="px-3 py-1 text-right"><div className="truncate" title={String(r.qtyHand)}>{fmtQty(r.qtyHand)}</div></td>
                          <td className="px-3 py-1 text-right"><div className="truncate" title={String(r.unitCost)}>{fmtCost(r.unitCost)}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.lotNo}>{r.lotNo}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.bbDate}>{fmtDate(r.bbDate)}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.qstatCode}>{r.qstatCode}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.whouseCode}>{r.whouseCode}</div></td>
                          <td className="px-3 py-1"><div className="truncate" title={r.locCode}>{r.locCode}</div></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-6 text-center text-gray-500 text-sm">
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
                    selectedKeys.size === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
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

export default MSInvLookup;