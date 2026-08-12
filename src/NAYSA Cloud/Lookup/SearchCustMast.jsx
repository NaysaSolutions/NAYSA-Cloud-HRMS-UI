import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, faSpinner, faSyncAlt, faSort, 
    faSearch, faEraser 
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// Custom hook for debouncing client-side column filters
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const CustomerMastLookupModal = ({ isOpen, onClose, customParam }) => {
    const columnConfig = [
        { key: 'custCode', label: 'Customer Code', width: '120px' },
        { key: 'custName', label: 'Customer Name', width: '350px' },
        { key: 'source',   label: 'Source',        width: '85px' },
        { key: 'custTin',  label: 'TIN',           width: '150px' },
        { key: 'atcCode',  label: 'ATC',           width: '85px' },
        { key: 'vatCode',  label: 'VAT',           width: '85px' },
        { key: 'addr',     label: 'Address',       width: 'auto'  }
    ];

    const [searchTerm, setSearchTerm] = useState("");
    const [finalSearch, setFinalSearch] = useState(""); // Triggers the API call
    const [searchMode, setSearchMode] = useState("part");
    const [filters, setFilters] = useState(columnConfig.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {}));
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

    const debouncedColumnFilters = useDebounce(filters, 300);
    const hasActiveFilters = searchTerm !== "" || Object.values(filters).some(val => val !== '');
    
    const resetFilters = () => {
        setSearchTerm("");
        setFinalSearch("");
        setFilters(columnConfig.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {}));
    };

    // TanStack Query for Server-Side Fetching
    const { data: customers = [], isLoading, isFetching, refetch } = useQuery({
        queryKey: ['lookupCustomer', finalSearch, searchMode, customParam],
        queryFn: async () => {
            // THE FIX: Wrapping the parameters inside 'json_data' for SQL Server JSON_VALUE extraction
            const payload = {
                json_data: {
                    search: finalSearch.trim() || null,
                    filter: customParam || "ActiveAll",
                    searchMode: searchMode,
                }
            };
            const { data: result } = await apiClient.get("/lookupCustomer", {
                params: { json_data: JSON.stringify(payload) },
            });
            
            const rawData = result?.data?.[0]?.result;
            return rawData ? JSON.parse(rawData) : [];
        },
        enabled: isOpen,
        staleTime: 0, // Always fetch fresh data on manual search
        placeholderData: keepPreviousData,
    });

    const handleManualSearch = (e) => {
        e.preventDefault();
        setFinalSearch(searchTerm); // Updates the queryKey, firing the request
    };

    // Client-Side Filtering and Sorting for the returned data
    const filteredAndSorted = useMemo(() => {
        let result = customers.filter(item => {
            return columnConfig.every(col => {
                const itemValue = String(item[col.key] || '').toLowerCase();
                const filterValue = debouncedColumnFilters[col.key].toLowerCase();
                return itemValue.includes(filterValue);
            });
        });
        
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] ?? '');
                const bVal = String(b[sortConfig.key] ?? '');
                return sortConfig.direction === 'asc' 
                    ? aVal.localeCompare(bVal, undefined, { numeric: true }) 
                    : bVal.localeCompare(aVal, undefined, { numeric: true });
            });
        }
        return result;
    }, [customers, debouncedColumnFilters, sortConfig]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col relative overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b">
                    <h2 className="text-[16px] font-bold text-[#1e40af]">Select Customer</h2>
                          
                    <div className="flex items-center gap-4">
                        {isFetching && <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase tracking-widest italic">Syncing...</span>}
                        <button onClick={() => refetch()} className="text-slate-400 hover:text-blue-600 transition-colors">
                            <FontAwesomeIcon icon={faSyncAlt} spin={isFetching} />
                        </button>
                        <button onClick={() => onClose(null)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                    </div>
                    
               </div>

                {/* Main Search Bar */}
                <form onSubmit={handleManualSearch} className="px-4 py-2 bg-slate-50 border-b flex items-center gap-6">
                    <div className="flex items-center gap-2 w-full max-w-xl">
                        <div className="relative flex-grow">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <FontAwesomeIcon icon={faSearch} size="sm" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="px-4 py-1.5 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider">
                            {isFetching ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSearch} />}
                            Filter
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
                            <input type="radio" value="start" checked={searchMode === "start"} onChange={(e) => setSearchMode(e.target.value)} className="w-4 h-4 text-blue-600" />
                            STARTS WITH
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
                            <input type="radio" value="part" checked={searchMode === "part"} onChange={(e) => setSearchMode(e.target.value)} className="w-4 h-4 text-blue-600" />
                            CONTAINS
                        </label>
                        {hasActiveFilters && (
                            <button type="button" onClick={resetFilters} className="ml-2 text-[10px] font-bold text-blue-600 hover:underline">
                                <FontAwesomeIcon icon={faEraser} className="mr-1" /> CLEAR ALL
                            </button>
                        )}
                    </div>
                </form>

                {/* Data Table */}
                <div className="flex-grow overflow-auto custom-scrollbar bg-white">
                    {isLoading && customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
                            <p className="text-sm font-medium">Fetching from server...</p>
                        </div>
                    ) : (
                        <table className="min-w-full border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                                <tr>
                                    {columnConfig.map((col) => (
                                        <th key={col.key} style={{ width: col.width }} className="px-3 py-2 text-left border-b border-slate-200">
                                            <div onClick={() => setSortConfig(prev => ({ key: col.key, direction: prev.key === col.key && prev.direction === 'asc' ? 'desc' : 'asc' }))} className="flex items-center gap-2 cursor-pointer mb-2 group">
                                                <span className="text-[12px] font-semibold text-slate-600 tracking-tighter">{col.label}</span>
                                                <FontAwesomeIcon icon={faSort} className={`text-[10px] ${sortConfig.key === col.key ? 'text-blue-500' : 'opacity-20'}`} />
                                            </div>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-300">
                                                    <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                                                </span>
                                                <input 
                                                    type="text" 
                                                    value={filters[col.key]} 
                                                    onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))} 
                                                    placeholder="Filter" 
                                                    className="w-full pl-6 pr-0 py-1.5 text-[10px] font-normal border border-slate-200 rounded-md bg-white focus:border-blue-400 outline-none" 
                                                />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAndSorted.length > 0 ? filteredAndSorted.map((cust, idx) => (
                                    <tr key={idx} onClick={() => onClose(cust)} className="hover:bg-blue-100 cursor-pointer transition-colors group">
                                        {columnConfig.map(col => (
                                            <td key={col.key} className="px-3 py-1.5 text-[11px] text-slate-700">
                                                {col.key === "custCode" ? <span className="font-bold">{cust[col.key]}</span> : cust[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={columnConfig.length} className="px-3 py-20 text-center text-slate-400 italic">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t bg-slate-50 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Records: {filteredAndSorted.length}</span>
                </div>
            </div>
            
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; } 
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; } 
                @keyframes fade-in { 
                    from { opacity: 0; transform: translateY(-10px); } 
                    to { opacity: 1; transform: translateY(0); } 
                } 
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default CustomerMastLookupModal;
