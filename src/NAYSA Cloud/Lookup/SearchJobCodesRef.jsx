import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const JobCodeLookupModal = ({ isOpen, onClose, customParam, activeOnly = true }) => {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ jobCode: "", jobName: "", uomCode: "" });
  const [loading, setLoading] = useState(false);

  const pickCode = (r) => r?.jobCode ?? r?.JobCode ?? r?.JOB_CODE ?? "";
  const pickName = (r) => r?.jobName ?? r?.JobName ?? r?.JOB_NAME ?? "";
  const pickUom = (r) => r?.uomCode ?? r?.UomCode ?? r?.UOM_CODE ?? "";

  const normalizeActive = (value) =>
    String(value ?? "Y").trim().toUpperCase();

  const isActiveJobCode = (r) => {
    const activeValue = normalizeActive(
      r?.active ?? r?.Active ?? r?.ACTIVE ?? r?.status ?? r?.Status ?? r?.STATUS
    );

    return !["N", "NO", "FALSE", "0"].includes(activeValue);
  };

  const parseLookupResult = (result) => {
    const raw =
      result?.data?.[0]?.result ??
      result?.data?.result ??
      result?.result ??
      result;

    if (Array.isArray(raw)) return raw;
    if (!raw) return [];

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Invalid Job Code lookup JSON:", error, raw);
      return [];
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setFilters({ jobCode: "", jobName: "", uomCode: "" });
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const { data: result } = await apiClient.get("/lookupJobCode", {
          params: {
            PARAMS: JSON.stringify({
              search: "",
              page: 1,
              pageSize: 200,
              activeOnly,
              customParam: customParam || "",
            }),
          },
        });

        if (!alive) return;

        const data = parseLookupResult(result);
        const lookupRows = activeOnly ? data.filter(isActiveJobCode) : data;
        setRows(lookupRows);
      } catch (err) {
        console.error("Failed to fetch Job Codes:", err);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, customParam, activeOnly]);

  const filtered = useMemo(() => {
    const codeFilter = filters.jobCode.toLowerCase();
    const nameFilter = filters.jobName.toLowerCase();
    const uomFilter = filters.uomCode.toLowerCase();

    return rows.filter((r) => {
      const code = String(pickCode(r)).toLowerCase();
      const name = String(pickName(r)).toLowerCase();
      const uom = String(pickUom(r)).toLowerCase();

      return (
        code.includes(codeFilter) &&
        name.includes(nameFilter) &&
        uom.includes(uomFilter)
      );
    });
  }, [filters, rows]);

  const handleApply = (row) => onClose(row);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden animate-scale-in">
        <button
          onClick={() => onClose(null)}
          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 p-3 border-b">
          Select Job Code
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-52 text-blue-500">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
            Loading Job Codes...
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">Job Code</th>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">Job Description</th>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">UOM</th>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">Action</th>
                </tr>
                <tr>
                  <th className="px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1 font-normal"
                      placeholder="Filter code..."
                      value={filters.jobCode}
                      onChange={(e) => setFilters((p) => ({ ...p, jobCode: e.target.value }))}
                    />
                  </th>
                  <th className="px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1 font-normal"
                      placeholder="Filter description..."
                      value={filters.jobName}
                      onChange={(e) => setFilters((p) => ({ ...p, jobName: e.target.value }))}
                    />
                  </th>
                  <th className="px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1 font-normal"
                      placeholder="Filter UOM..."
                      value={filters.uomCode}
                      onChange={(e) => setFilters((p) => ({ ...p, uomCode: e.target.value }))}
                    />
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length ? (
                  filtered.map((r, i) => (
                    <tr
                      key={`${pickCode(r)}-${i}`}
                      className="hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleApply(r)}
                    >
                      <td className="px-4 py-1">{pickCode(r)}</td>
                      <td className="px-4 py-1">{pickName(r)}</td>
                      <td className="px-4 py-1">{pickUom(r)}</td>
                      <td className="px-4 py-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(r);
                          }}
                          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 border-t text-xs text-right text-gray-600">
          Showing <b>{filtered.length}</b> of {rows.length}
        </div>
      </div>
    </div>
  );
};

export default JobCodeLookupModal;
