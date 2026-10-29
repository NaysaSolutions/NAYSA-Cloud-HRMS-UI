/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const parseRows = (response) => {
  const raw = response?.data?.data?.[0]?.result || response?.data?.[0]?.result || "[]";
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || "[]"); } catch { return []; }
};

const SearchTransactionReference = ({ isOpen, onClose, endpoint, queryKey, title, codeKey, nameKey, codeLabel, nameLabel, params = {}, multiSelect = false, extraColumns = [] }) => {
  const columns = useMemo(() => [{ key: codeKey, label: codeLabel }, { key: nameKey, label: nameLabel }, ...extraColumns], [codeKey, nameKey, codeLabel, nameLabel, extraColumns]);
  const [filters, setFilters] = useState({});
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [sort, setSort] = useState({ key: codeKey, direction: "asc" });

  useEffect(() => {
    if (isOpen) { setFilters({}); setSelectedCodes([]); }
  }, [isOpen]);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => parseRows(await apiClient.get(endpoint, { params })),
    enabled: isOpen,
    staleTime: 300000,
    refetchInterval: 1000 * 20,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  const visibleRows = useMemo(() => rows.filter((row) => columns.every((column) =>
    String(row?.[column.key] || "").toLowerCase().includes(String(filters[column.key] || "").toLowerCase())
  )).sort((left, right) => {
    const compared = String(left?.[sort.key] || "").localeCompare(String(right?.[sort.key] || ""), undefined, { numeric: true });
    return sort.direction === "asc" ? compared : -compared;
  }), [rows, columns, filters, sort]);

  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const toggleRow = (row) => {
    const code = String(row?.[codeKey] || "");
    setSelectedCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  };
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedCodes.includes(String(row?.[codeKey] || "")));
  const toggleAll = () => {
    const visibleCodes = visibleRows.map((row) => String(row?.[codeKey] || ""));
    setSelectedCodes((current) => allVisibleSelected ? current.filter((code) => !visibleCodes.includes(code)) : [...new Set([...current, ...visibleCodes])]);
  };

  if (!isOpen) return null;

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
    <div className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ${multiSelect ? "max-w-6xl" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
        <h2 className="global-lookup-headertext-ui pl-3">{title}</h2>
        <div className="flex items-center gap-1">
          {Object.values(filters).some(Boolean) && <button onClick={() => setFilters({})} className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600"><FontAwesomeIcon icon={faEraser} />CLEAR</button>}
          <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600"><FontAwesomeIcon icon={faSyncAlt} spin={isFetching} /></button>
          <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
        </div>
      </div>
      {multiSelect && <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /> Select All Employees <span className="ml-auto">{selectedCodes.length} selected</span></div>}
      <div className="flex-grow overflow-auto bg-white">
        {isLoading ? <div className="flex h-64 items-center justify-center text-blue-500"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div> : <table className="min-w-full table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-slate-200"><tr>{multiSelect && <th className="global-lookup-th-ui w-12" />}{columns.map((column) => <th key={column.key} className="global-lookup-th-ui">
            <div onClick={() => changeSort(column.key)} className="mb-1 flex cursor-pointer items-center gap-3"><span className="global-lookup-th-text-ui">{column.label}</span><FontAwesomeIcon icon={faSort} className="text-[10px] opacity-40" /></div>
            <div className="relative"><input value={filters[column.key] || ""} onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" /><FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" /></div>
          </th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{visibleRows.map((row, index) => {
            const selected = selectedCodes.includes(String(row?.[codeKey] || ""));
            return <tr key={`${row?.[codeKey]}-${index}`} onClick={() => multiSelect ? toggleRow(row) : onClose(row)} className={`cursor-pointer hover:bg-blue-50 ${selected ? "bg-blue-50" : ""}`}>
              {multiSelect && <td className="global-lookup-td-ui text-center"><input type="checkbox" checked={selected} onChange={() => toggleRow(row)} onClick={(event) => event.stopPropagation()} /></td>}
              {columns.map((column, columnIndex) => <td key={column.key} className={`global-lookup-td-ui ${columnIndex === 0 ? "font-bold" : ""}`}>{row?.[column.key]}</td>)}
            </tr>;
          })}</tbody>
        </table>}
      </div>
      <div className="global-lookup-footer-records-div-ui">
        <span className="global-lookup-footer-records-text-ui">Total Records: {visibleRows.length}</span>
        {multiSelect && <button type="button" disabled={!selectedCodes.length} onClick={() => onClose(rows.filter((row) => selectedCodes.includes(String(row?.[codeKey] || ""))))} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><FontAwesomeIcon icon={faCheck} />Apply Selected</button>}
      </div>
    </div>
  </div>;
};

export default SearchTransactionReference;
