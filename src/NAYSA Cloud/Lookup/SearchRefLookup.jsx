/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const parseRows = (response) => {
  const raw = response?.data?.[0]?.result || response?.[0]?.result || response?.result || [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || "[]"); } catch { return []; }
};

const SearchRefLookup = ({
  isOpen,
  onClose,
  endpoint,
  queryKey,
  codeKey,
  nameKey,
  title,
  codeLabel,
  nameLabel,
  extraKey,
  extraLabel,
}) => {
  const [filters, setFilters] = useState({ code: "", name: "" });
  const [sort, setSort] = useState({ key: "", direction: "asc" });

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoint);
      return parseRows(data).map((row) => ({
        ...row,
        code: String(row?.[codeKey] ?? ""),
        name: String(row?.[nameKey] ?? ""),
        extra: extraKey ? String(row?.[extraKey] ?? "") : "",
      })).filter((row) => row.code);
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const records = useMemo(() => {
    const result = rows.filter((row) => row.code.toLowerCase().includes(filters.code.toLowerCase()) && row.name.toLowerCase().includes(filters.name.toLowerCase()));
    if (sort.key) {
      result.sort((a, b) => {
        const left = String(a[sort.key] ?? "");
        const right = String(b[sort.key] ?? "");
        const comparison = left.localeCompare(right, undefined, { numeric: true });
        return sort.direction === "asc" ? comparison : -comparison;
      });
    }
    return result;
  }, [rows, filters, sort]);

  useEffect(() => {
    if (!isOpen) setFilters({ code: "", name: "" });
  }, [isOpen]);

  const toggleSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2">
          <h2 className="text-sm font-bold text-blue-800">{title}</h2>
          <div className="flex items-center gap-1">
            {(filters.code || filters.name) && <button type="button" onClick={() => setFilters({ code: "", name: "" })} className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600"><FontAwesomeIcon icon={faEraser} />CLEAR</button>}
            <button type="button" onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600" title="Refresh"><FontAwesomeIcon icon={faSyncAlt} spin={isFetching} /></button>
            <button type="button" onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600" title="Close"><FontAwesomeIcon icon={faTimes} /></button>
          </div>
        </div>
        <div className="flex-grow overflow-auto">
          {isLoading ? <div className="flex h-48 items-center justify-center text-blue-500"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div> : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200"><tr>
                {[{ key: "code", label: codeLabel }, { key: "name", label: nameLabel }, ...(extraKey ? [{ key: "extra", label: extraLabel }] : [])].map((column) => (
                  <th key={column.key} className="border-b border-slate-200 px-4 py-2 text-left">
                    <button type="button" onClick={() => toggleSort(column.key)} className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-600">{column.label}<FontAwesomeIcon icon={faSort} className="text-[9px]" /></button>
                    <div className="relative"><input value={filters[column.key === "code" ? "code" : "name"] || ""} onChange={(event) => column.key !== "extra" && setFilters((current) => ({ ...current, [column.key]: event.target.value }))} placeholder="Filter..." className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-normal outline-none focus:border-blue-500" /><FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-300" /></div>
                  </th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {records.length ? records.map((row) => <tr key={row.code} onClick={() => onClose(row)} className="cursor-pointer hover:bg-blue-50"><td className="px-4 py-2 text-xs font-bold text-slate-600">{row.code}</td><td className="px-4 py-2 text-xs text-slate-600">{row.name}</td>{extraKey && <td className="px-4 py-2 text-xs text-slate-600">{row.extra}</td>}</tr>) : <tr><td colSpan={extraKey ? 3 : 2} className="px-4 py-16 text-center text-sm italic text-slate-400">No matching records found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">Total Records: {records.length}</div>
      </div>
    </div>
  );
};

export default SearchRefLookup;
