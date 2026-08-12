// src/NAYSA Cloud/Lookup/SearchFAProfile.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSearch } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

/* ================= HELPERS ================= */

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "string") {
    try { return JSON.parse(res) || []; } catch { return []; }
  }
  return [];
};

/* ================= COMPONENT ================= */

/**
 * Depreciation Profile lookup modal.
 *
 * Props:
 *  - isOpen:  boolean — controls modal visibility
 *  - onClose: (selected | null) => void — called with the selected row
 *             ({ code, description, methodCode, methodName, factor })
 *             or null when dismissed without a selection.
 */
const SearchFAProfile = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const profileListQuery = useQuery({
    queryKey: ["faProfileLookupList"],
    queryFn: async () => {
      const res = await apiClient.get("/faProfile");
      return extractRows(res);
    },
    enabled: isOpen,
  });

  const profiles  = useMemo(() => profileListQuery.data || [], [profileListQuery.data]);
  const isLoading = profileListQuery.isLoading;

  const rows = useMemo(() => {
    const mapped = profiles.map((row) => ({
      code:        row.code        || row.profileCode || row.profile_code || "",
      description: row.description || row.profileName || row.profile_name || "",
      methodCode:  row.methodCode  || row.method_code  || "",
      methodName:  row.methodName  || row.method_name  || "",
      factor:      row.factor      ?? "",
    }));

    const s = String(search || "").trim().toLowerCase();
    if (!s) return mapped;

    return mapped.filter((row) =>
      String(row.code        || "").toLowerCase().includes(s) ||
      String(row.description || "").toLowerCase().includes(s) ||
      String(row.methodName  || "").toLowerCase().includes(s)
    );
  }, [profiles, search]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setHighlightedIdx(-1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (row) => {
    onClose?.(row);
  };

  const handleDismiss = () => {
    onClose?.(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleDismiss}
    >
      <div
        className="bg-white rounded-md shadow-lg border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-700">
            Select Depreciation Profile
          </h3>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
            />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search profile code, name, or method..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto relative min-h-[200px]">
          {isLoading && <LoadingSpinner />}

          {!isLoading && rows.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm text-slate-400 py-10">
              No depreciation profiles found.
            </div>
          )}

          {!isLoading && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold text-slate-600 px-4 py-2 text-xs">Profile Code</th>
                  <th className="text-left font-semibold text-slate-600 px-4 py-2 text-xs">Profile Name</th>
                  <th className="text-left font-semibold text-slate-600 px-4 py-2 text-xs">Method</th>
                  <th className="text-left font-semibold text-slate-600 px-4 py-2 text-xs">Factor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={`${row.code}-${idx}`}
                    onClick={() => handleSelect(row)}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors ${
                      highlightedIdx === idx ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-2 text-slate-700 font-medium">{row.code}</td>
                    <td className="px-4 py-2 text-slate-700">{row.description}</td>
                    <td className="px-4 py-2 text-slate-600">{row.methodName}</td>
                    <td className="px-4 py-2 text-slate-600">{row.factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchFAProfile;