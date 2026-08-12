
import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSort, faSortUp, faSortDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { formatNumber } from '../Global/behavior';



const AROpenBalanceLookupModal = ({ isOpen, onClose, onCancel, endpoint,data }) => {

    const [records, setRecords] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [selected, setSelected] = useState([]);
    const [filters, setFilters] = useState({});
    const [columnConfig, setColumnConfig] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {

        if (!isOpen) {
            setRecords([]);
            setFiltered([]);
            setSelected([]);
            setFilters({});
            setColumnConfig([]);
            setSortConfig({ key: '', direction: 'asc' });
            setCurrentPage(1);
            return;
        }
        fetchData();
    }, [data]);




    const fetchData = async () => {
        setLoading(true);
      try {
            setLoading(true);
            if (endpoint) setColumnConfig(endpoint);
            if (data) setRecords(data);
        } catch (error) {
            console.error("Failed to fetch record:", error);
            setRecords([]);
            setColumnConfig([]);
        } finally {
            setLoading(false);
        }
    };





  const renderValue = (column, value,decimal=2) => {
  if (!value && value !== 0) return ""; 
  switch (column.renderType) {
    case "number": {
      const digits = parseInt(decimal, 10);
      const safeDecimal = isNaN(digits) ? 2 : digits;
      return formatNumber(value, safeDecimal); 
    }
    case "date":
        const date = new Date(value);
        const month = String(date.getMonth() + 1).padStart(2, "0"); 
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    default:
      return value;
  }
};





   useEffect(() => {
  let currentFiltered = [...records];

  currentFiltered = currentFiltered.filter(item =>
    Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const itemValue = String(item[key] ?? '').toLowerCase().replace(/,/g, '');
      const filterValue = String(value).toLowerCase().replace(/,/g, '');
      return itemValue.includes(filterValue);
    })
  );


  if (sortConfig?.direction) {
    currentFiltered.sort((a, b) => {
      if (sortConfig.key) {
        const aValue = String(a[sortConfig.key] ?? '').toLowerCase();
        const bValue = String(b[sortConfig.key] ?? '').toLowerCase();

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      } else {
        const aValue = JSON.stringify(Object.values(a)).toLowerCase();
        const bValue = JSON.stringify(Object.values(b)).toLowerCase();
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });
  }

  setFiltered(currentFiltered);
}, [records, filters, sortConfig]);




const handleGetSelected = () => {
  const payload = {
    data: selected.map(item => item.groupId),
  };
  onClose(payload);
  setRecords([]);
  setSelected([]); 
};



const handleFilterChange = (e, key) => {
  setFilters(prev => ({ ...prev, [key]: e.target.value }));
};



const handleSort = (key) => {
  let direction = "asc";
  if (sortConfig.key === key && sortConfig.direction === "asc") {
    direction = "desc";
  }
  setSortConfig({ key, direction });
};



const renderSortIcon = (column) => {
  if (sortConfig.key === column) {
    return sortConfig.direction === "asc"
      ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
      : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
  }
  return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
};


    const toggleSelect = (data) => {
        if (selected.some(s => s.groupId === data.groupId)) {
            setSelected(selected.filter(s => !(s.groupId === data.groupId )));
        } else {
            setSelected([...selected, data]);
        }
    };

    const toggleSelectAll = () => {
        if (selected.length === filtered.length) {
            setSelected([]);
        } else {
            setSelected(filtered);
        }
    };

    const handleNextPage = () => setCurrentPage(prev => prev + 1);
    const handlePrevPage = () => setCurrentPage(prev => prev - 1);

    const getPaginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filtered.slice(startIndex, startIndex + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    if (!isOpen) return null;
    const paginatedData = getPaginatedData;
    const totalItems = filtered.length;
    const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);




    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-8xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onCancel()}
                    className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">Open AR Balance</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading Open AR Balance...</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-160px)] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-blue-900">Select</th>
                                        {columnConfig.map(column => (
                                            // Conditional rendering for the header cell
                                            !column.hidden && (
                                                <th
                                                    key={column.key}
                                                    onClick={() => handleSort(column.key)}
                                                    className={`px-4 py-2 text-xs font-bold text-blue-900 ${column.className} ${column.sortable ? 'cursor-pointer' : ''}`}
                                                >
                                                    {column.label} { renderSortIcon(column.key)}
                                                </th>
                                            )
                                        ))}
                                    </tr>

                                    <tr className="bg-white">
                                        <td></td>
                                        {columnConfig.map(column => (
                                            // Conditionally render the entire td element
                                            !column.hidden && (
                                                <td key={column.key} className="px-2 py-1">
                                                        <input
                                                            type="text"
                                                            value={filters[column.key] || ""}
                                                            onChange={(e) => handleFilterChange(e, column.key)}
                                                            className="w-full border rounded px-2 py-1 text-xs"
                                                            placeholder="Filter..."
                                                        />
                                                </td>
                                            )
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((data, index) => (
                                            <tr key={index} className="hover:bg-blue-50 text-xs">
                                                <td className="px-2 py-1 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.some(s => s.groupId === data.groupId)}
                                                        onChange={() => toggleSelect(data)}
                                                        className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </td>

                                               {columnConfig.map(column => (
                                                !column.hidden && (
                                                    <td key={column.key} className={`px-4 py-1 ${column.classNames}`}>
                                                    {renderValue(column, data[column.key], Number(column.roundingOff))}
                                                    </td>
                                                )
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columnConfig.length + 1} className="px-4 py-6 text-center text-gray-500 text-lg">
                                                No matching records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={selected.length === filtered.length && filtered.length > 0}
                                onChange={toggleSelectAll}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            Select All
                        </label>
                        <button
                            onClick={handleGetSelected}
                            disabled={selected.length === 0}
                            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            Get Selected Invoice
                        </button>
                    </div>

                    <div className="font-semibold">
                        Showing {startItem}-{endItem} of {totalItems} entries
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={endItem >= totalItems}
                            className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AROpenBalanceLookupModal;
