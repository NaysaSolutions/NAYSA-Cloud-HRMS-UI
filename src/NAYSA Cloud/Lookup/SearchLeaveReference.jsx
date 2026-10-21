import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faEraser, faSearch, faSort, faSpinner, faSyncAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || "[]"); } catch { return []; }
};

const SearchLeaveReference = ({ isOpen, onClose, sourceKey, queryKey, title, codeLabel, nameLabel, referenceEndpoint = "/generateLeaveCredits/references", withPagination = false }) => {
  const [filters, setFilters] = useState({ code: "", name: "" });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = withPagination ? 100 : 999999;
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const { data: records = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey, referenceEndpoint],
    queryFn: async () => {
      const response = await apiClient.get(referenceEndpoint);
      return parseList(response?.data?.data?.[0]?.[sourceKey]).map((item) => ({
        code: String(item.value ?? ""),
        name: String(item.label ?? ""),
      }));
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  useEffect(() => setCurrentPage(1), [filters]);

  const filteredRecords = useMemo(() => {
    const codeFilter = filters.code.toLowerCase();
    const nameFilter = filters.name.toLowerCase();
    const result = records.filter((item) =>
      item.code.toLowerCase().includes(codeFilter) && item.name.toLowerCase().includes(nameFilter)
    );

    if (sortConfig.key) {
      result.sort((left, right) => {
        const comparison = left[sortConfig.key].localeCompare(right[sortConfig.key], undefined, { numeric: true });
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [filters, records, sortConfig]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const handleSort = (key) => setSortConfig((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  if (!isOpen) return null;

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
    <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100">
        <div className="flex items-center gap-2 pl-2 sm:pl-3">
          <h2 className="global-lookup-headertext-ui">{title}</h2>
          {isFetching && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" /></span>}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && <button onClick={() => setFilters({ code: "", name: "" })} className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100"><FontAwesomeIcon icon={faEraser} />CLEAR</button>}
          <button onClick={() => refetch()} className="p-2 text-slate-400 hover:text-blue-600" title="Refresh Data"><FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} /></button>
          <button onClick={() => onClose(null)} className="p-2 text-slate-400 hover:text-red-600"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-white custom-scrollbar">
        {isLoading ? <div className="flex h-64 flex-col items-center justify-center text-slate-400"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" /><p className="text-sm font-medium">Loading...</p></div> :
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-slate-200"><tr>
              {[{ key: "code", label: codeLabel }, { key: "name", label: nameLabel }].map((column) => <th key={column.key} className="global-lookup-th-ui">
                <div onClick={() => handleSort(column.key)} className="mb-1 flex cursor-pointer items-center gap-3 group"><span className="global-lookup-th-text-ui">{column.label}</span><FontAwesomeIcon icon={faSort} className={`mb-1 text-[10px] ${sortConfig.key === column.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`} /></div>
                <div className="relative"><input value={filters[column.key]} onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))} placeholder="Filter..." className="global-lookup-filter-text-ui" /><FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" /></div>
              </th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record) => <tr key={record.code} onClick={() => onClose(record)} className="cursor-pointer transition-colors hover:bg-blue-50 group"><td className="global-lookup-td-ui font-bold">{record.code}</td><td className="global-lookup-td-ui">{record.name}</td></tr>) :
                <tr><td colSpan="2" className="px-4 py-20 text-center text-sm italic text-slate-400">No matching records found.</td></tr>}
            </tbody>
          </table>}
      </div>

      <div className="global-lookup-footer-records-div-ui">
        <div className="flex flex-col"><span className="global-lookup-footer-records-text-ui">Total Records: {filteredRecords.length}</span></div>
        {withPagination && totalPages > 1 && <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
          <span className="text-[11px] font-semibold text-slate-600">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
        </div>}
      </div>

      <style jsx="true">{`
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  </div>;
};

export default SearchLeaveReference;
