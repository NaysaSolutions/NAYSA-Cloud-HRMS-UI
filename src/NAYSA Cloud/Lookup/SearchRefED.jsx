/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faTimes, faRotate, faSort } from "@fortawesome/free-solid-svg-icons";

// The parent supplies its cached SelectionReferences / REF_ED records.
// No duplicate API request is required for this single-select lookup.
const columns = [
  { key: "edCode", label: "ED Code", width: "125px" },
  { key: "edName", label: "Description", width: "auto" },
  { key: "code", label: "Classification", width: "170px" },
];
const clean = (value) => String(value ?? "").trim().toLowerCase();
const isActive = (item) => ["Y", "1", "TRUE", "A"].includes(String(item?.active ?? "Y").toUpperCase());

export default function SearchRefED({ isOpen, open, edCodes = [], edType = "EARN", onClose }) {
  const visible = isOpen ?? open ?? false;
  const [columnFilters, setColumnFilters] = useState({});
  const [sort, setSort] = useState({ key: "edCode", direction: "asc" });
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    if (!visible) return;
    setColumnFilters({});
    setSelectedCode("");
    setSort({ key: "edCode", direction: "asc" });
  }, [visible]);

  const filtered = useMemo(() => {
    const targetType = String(edType ?? "").toUpperCase();
    const rows = (Array.isArray(edCodes) ? edCodes : []).filter((item) => {
      if (!isActive(item) || String(item?.edType ?? "").toUpperCase() !== targetType) return false;
      return columns.every(({ key }) => clean(item[key]).includes(clean(columnFilters[key])));
    });
    return rows.sort((a, b) => {
      const order = String(a?.[sort.key] ?? "").localeCompare(String(b?.[sort.key] ?? ""), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? order : -order;
    });
  }, [edCodes, edType, columnFilters, sort]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose?.(null); }
      if (event.key === "Enter" && event.target?.tagName !== "INPUT" && selectedCode) {
        const item = filtered.find((row) => row.edCode === selectedCode);
        if (item) { event.preventDefault(); onClose?.(item); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose, selectedCode, filtered]);

  if (!visible) return null;
  const selected = filtered.find((item) => item.edCode === selectedCode);
  const reset = () => { setColumnFilters({}); setSelectedCode(""); };
  return (
    <div role="dialog" aria-modal="true" aria-label="Select Earning or Deduction Code" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-3 font-sans">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-[15px] font-bold text-[#1e40af] dark:text-blue-300">Select {edType === "DED" ? "Deduction" : "Earning"} Code (REF_ED)</h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-300">{filtered.length} codes</span>
            <button type="button" onClick={reset} title="Clear filters" aria-label="Reset filters" className="text-slate-500 hover:text-blue-600"><FontAwesomeIcon icon={faRotate} /></button>
            <button type="button" onClick={() => onClose?.(null)} aria-label="Close lookup" className="text-slate-500 hover:text-red-600"><FontAwesomeIcon icon={faTimes} /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-slate-900">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
              <tr>{columns.map((column) => <th key={column.key} style={{ width: column.width }} className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                <button type="button" onClick={() => setSort((prev) => ({ key: column.key, direction: prev.key === column.key && prev.direction === "asc" ? "desc" : "asc" }))} className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-200">{column.label} <FontAwesomeIcon icon={faSort} className={sort.key === column.key ? "text-blue-500" : "text-slate-300"} /></button>
                <div className="relative"><FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300" /><input type="text" value={columnFilters[column.key] || ""} onChange={(event) => setColumnFilters((prev) => ({ ...prev, [column.key]: event.target.value }))} placeholder="Filter" aria-label={`Filter ${column.label}`} className="h-7 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 text-[10px] font-normal outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></div>
              </th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => <tr key={item.edCode} tabIndex={0} aria-selected={selectedCode === item.edCode} onClick={() => { setSelectedCode(item.edCode); onClose?.(item); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onClose?.(item); } }} className={`cursor-pointer transition-colors hover:bg-blue-100 dark:hover:bg-slate-800 ${selectedCode === item.edCode ? "bg-blue-50 dark:bg-slate-800" : ""}`}>
                <td className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold text-blue-800 dark:border-slate-800 dark:text-blue-300">{item.edCode}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-700 dark:border-slate-800 dark:text-slate-200">{item.edName}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-700 dark:border-slate-800 dark:text-slate-200">{item.code}</td>
              </tr>)}
              {!filtered.length && <tr><td colSpan={3} className="px-3 py-16 text-center text-xs text-slate-400">No matching active {edType === "DED" ? "deduction" : "earning"} codes found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">Total Records: {filtered.length}</span>
        </div>
      </div>
    </div>
  );
}
