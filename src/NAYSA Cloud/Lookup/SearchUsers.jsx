import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faSyncAlt, faEraser } from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const UsersLookupModal = ({ isOpen, onClose }) => {
    const [filters, setFilters] = useState({ 
        userCode: '', 
        userName: '', 
        userType: '', 
        department: '' 
    });

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some(val => val !== '');
    
    const resetFilters = () => setFilters({ 
        userCode: '', 
        userName: '', 
        userType: '', 
        department: '' 
    });

    // 1. Fetching Logic
    const { 
        data: users = [], 
        isLoading, 
        isFetching, 
        refetch 
    } = useQuery({
        queryKey: ['lookupUserAll'],
        queryFn: async () => {
            const { data: result } = await apiClient.get("/lookupUserAll");
            const rawData = result?.data?.[0]?.result || "[]";
            return Array.isArray(rawData) ? rawData : JSON.parse(rawData);
        },
        enabled: isOpen,           
        staleTime: 1000 * 5,       
        refetchInterval: 1000 * 10, 
        refetchIntervalInBackground: false,
    });

    // 2. Filtering Logic
    const filtered = useMemo(() => {
        return users.filter(item =>
            (item.userCode || '').toLowerCase().includes(filters.userCode.toLowerCase()) &&
            (item.userName || '').toLowerCase().includes(filters.userName.toLowerCase()) &&
            (item.userType || '').toLowerCase().includes(filters.userType.toLowerCase()) &&
            (item.department || '').toLowerCase().includes(filters.department.toLowerCase())
        );
    }, [filters, users]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Select User</h2>
                            <div className="absolute -top-1 -right-4 flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${isFetching ? 'block' : 'hidden'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 bg-blue-500 ${isFetching ? 'block' : 'hidden'}`}></span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button 
                                onClick={resetFilters}
                                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"
                            >
                                <FontAwesomeIcon icon={faEraser} />
                                CLEAR FILTERS
                            </button>
                        )}
                        <button 
                            onClick={() => refetch()} 
                            className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                            title="Manual Refresh"
                        >
                            <FontAwesomeIcon icon={faSyncAlt} size="sm" spin={isFetching} />
                        </button>
                        <button
                            onClick={() => onClose(null)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-all"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow overflow-hidden flex flex-col">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
                            <p className="text-sm">Fetching users...</p>
                        </div>
                    ) : (
                        <div className="overflow-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-slate-200 border-separate border-spacing-0">
                                <thead className="bg-slate-100 sticky top-0 z-10">
                                    <tr>
                                        {[
                                            { label: 'User Code', key: 'userCode' },
                                            { label: 'User Name', key: 'userName' },
                                            { label: 'User Type', key: 'userType' },
                                            { label: 'Department', key: 'department' }
                                        ].map((col) => (
                                            <th key={col.key} className="px-4 py-3 text-left border-b border-slate-200">
                                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                                    {col.label}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={filters[col.key]}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                                                    placeholder={`Filter ${col.label}...`}
                                                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-normal"
                                                />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.length > 0 ? filtered.map((user, index) => (
                                        <tr 
                                            key={index}
                                            onClick={() => onClose(user)}
                                            className="group hover:bg-blue-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-2 text-xs font-bold text-slate-600">{user.userCode}</td>
                                            <td className="px-4 py-2 text-xs text-slate-600 font-medium">{user.userName}</td>
                                            <td className="px-4 py-2 text-xs text-slate-600">{user.userType}</td>
                                            <td className="px-4 py-2 text-xs text-slate-600">{user.department}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-12 text-center text-slate-400 italic text-sm">
                                                No users found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="p-3 px-4 border-t bg-slate-50 flex justify-between items-center">
                    <span className="text-[12px] text-slate-500 font-medium">
                        {filtered.length} Users Found
                    </span>
                    <div className="flex items-center gap-2">
                        {isFetching && (
                            <span className="text-[10px] text-blue-500 animate-pulse flex items-center gap-1 font-bold uppercase">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Live Syncing...
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersLookupModal;