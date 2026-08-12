import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, faSpinner, faSyncAlt, faEraser, faSort, 
    faSearch, faChevronLeft, faChevronRight 
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// Debounce hook for smooth filtering
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const BillCodeLookupModal = ({ 
    isOpen, 
    onClose, 
    title = "Select Bill Code",
    withPagination = false 
}) => {
    const [filters, setFilters] = useState({ billCode: '', billName: '', uomCode: '' });
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = withPagination ? 100 : 999999;
    const debouncedFilters = useDebounce(filters, 300);
    const hasActiveFilters = Object.values(filters).some(val => val !== '');

    const resetFilters = () => setFilters({ billCode: '', billName: '', uomCode: '' });

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedFilters]);

    const { 
        data: billCodes = [], 
        isLoading, 
        isFetching, 
        refetch 
    } = useQuery({
        queryKey: ['lookupBillCode'],
        queryFn: async () => {
            const { data: result } = await apiClient.get("/lookupBillCode", {
                params: {
                    PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 5000 }),
                },
            });
            const rawData = result?.data?.[0]?.result || "[]";
            return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
        },
        enabled: isOpen,           
        staleTime: 1000 * 60 * 5,
        placeholderData: keepPreviousData,
    });

    const filteredAndSorted = useMemo(() => {
        let result = [...billCodes].filter(item =>
            (item.billCode || '').toLowerCase().includes(debouncedFilters.billCode.toLowerCase()) &&
            (item.billName || '').toLowerCase().includes(debouncedFilters.billName.toLowerCase()) &&
            (item.uomCode || '').toLowerCase().includes(debouncedFilters.uomCode.toLowerCase())
        );

        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] ?? "");
                const bVal = String(b[sortConfig.key] ?? "");
                return sortConfig.direction === "asc"
                  ? aVal.localeCompare(bVal, undefined, { numeric: true })
                  : bVal.localeCompare(aVal, undefined, { numeric: true });
            });
        }
        return result;
    }, [billCodes, debouncedFilters, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredAndSorted.slice(startIndex, startIndex + pageSize);
    }, [filteredAndSorted, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
                
                {/* Header */}
                <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
                    <div className="flex items-center gap-2 pl-2 sm:pl-3">
                        <h2 className="global-lookup-headertext-ui">{title}</h2>
                        {isFetching && (
                            <div className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </div>
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
                            onClick={() => refetch()} 
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Refresh Data"
                        >
                            <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
                        </button>
                        <button
                            onClick={() => onClose(null)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-grow overflow-auto custom-scrollbar bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
                            <p className="text-sm font-medium">Loading...</p>
                        </div>
                    ) : (
                        <table className="min-w-full border-separate border-spacing-0 table-fixed">
                            <thead className="sticky top-0 z-10 bg-slate-200">
                                <tr>
                                    {[
                                        { label: "Bill Code", key: "billCode", width: "w-[120px]" },
                                        { label: "Description", key: "billName", width: "w-auto" },
                                        { label: "UOM", key: "uomCode", width: "w-[120px]" },
                                    ].map((col) => (
                                        <th key={col.key} className={`global-lookup-th-ui ${col.width}`}>
                                            <div
                                                onClick={() => handleSort(col.key)}
                                                className="flex items-center gap-2 cursor-pointer group mb-1"
                                            >
                                                <span className="global-lookup-th-text-ui">{col.label}</span>
                                                <FontAwesomeIcon
                                                    icon={faSort}
                                                    className={`text-[10px] ${sortConfig.key === col.key ? "text-gray-600" : "opacity-30 group-hover:opacity-100"}`}
                                                />
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={filters[col.key]}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                                                    placeholder="Filter..."
                                                    className="global-lookup-filter-text-ui"
                                                />
                                                <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedData.length > 0 ? paginatedData.map((item, index) => (
                                    <tr 
                                        key={item.billCode || index}
                                        onClick={() => onClose(item)}
                                        className="group hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <td className="global-lookup-td-ui font-bold">{item.billCode}</td>
                                        <td className="global-lookup-td-ui">{item.billName}</td>
                                        <td className="global-lookup-td-ui text-slate-500">{item.uomCode}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-20 text-center text-slate-400 italic text-sm">
                                            No matching records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="global-lookup-footer-records-div-ui">
                    <span className="global-lookup-footer-records-text-ui">
                        Total Records: {filteredAndSorted.length}
                    </span>

                    {withPagination && totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                            </button>
                            <span className="text-[11px] font-semibold text-slate-600">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                            >
                                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                            </button>
                        </div>
                    )}
                </div>
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
    );
};

export default BillCodeLookupModal;