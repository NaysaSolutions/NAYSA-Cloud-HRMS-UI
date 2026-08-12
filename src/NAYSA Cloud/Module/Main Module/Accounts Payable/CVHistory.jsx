import React, { useState, useEffect } from "react";
import Swal from 'sweetalert2';
import { subDays, format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Modal from "react-modal";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faList,
  faPen,
  faCalendarAlt,
  faFilter,
  faFileAlt,
  faDownload,
  faRedo,
  faArrowUp,
  faArrowDown,
  faEye
} from "@fortawesome/free-solid-svg-icons";

import {
  useFetchTranData
} from '@/NAYSA Cloud/Global/procedure';

Modal.setAppElement("#root");

// ✅ Use your centralized API
import apiClient, {
  fetchData,
  fetchDataJson,
  // fetchDataJsonLookup,
  postRequest,
  postPdfRequest,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";


// Centralized Status Styles
const statusStyles = {
  F: { text: "FINALIZED", color: "text-blue-600" },
  C: { text: "CANCELLED", color: "text-red-600" },
  P: { text: "POSTED", color: "text-blue-600" },
  "": { text: "OPEN", color: "text-black" },
};

const CVHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dates, setDates] = useState([null, null]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [dateRangeType, setDateRangeType] = useState("Last 7 Days");
  const [status, setStatus] = useState("All");
  const [data, setData] = useState([]);
  const [branchCode] = useState("HO");
  const [searchFields, setSearchFields] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const today = new Date();
    if (dateRangeType === "Last 7 Days") {
      setDates([subDays(today, 6), today]);
    } else if (dateRangeType === "Last 30 Days") {
      setDates([subDays(today, 29), today]);
    } else if (dateRangeType === "Custom Range") {
      setDates([null, null]);
    }
  }, [dateRangeType]);

  
const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    if (!dates?.[0] || !dates?.[1]) {
      setError("Start and end dates must be selected.");
      return; // finally will still run
    }

    const [startDate, endDate] = dates;
    const formattedStartDate = format(startDate, "yyyy-MM-dd");
    const formattedEndDate = format(endDate, "yyyy-MM-dd");

    const payload = {
      json_data: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        branchCode,
        status, // include only if your backend expects/uses it
      },
    };

    // ✅ centralized POST (BaseUrl.jsx)
    const res = await postRequest("/load-CVhistory", payload);

    // normalize common shapes: { data: [...] } or plain array
    const rows =
      Array.isArray(res) ? res :
      Array.isArray(res?.data) ? res.data :
      res?.data?.data ?? [];

    setData(rows);
  } catch (err) {
    console.error("Error fetching data:", err);
    // Optional: detect missing-tenant flagged by interceptor
    if (err?.tenantRequired) {
      setError("Please select a company (tenant) first.");
    } else {
      setError(err?.response?.data?.message || "Failed to fetch data. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};

  const handleRowClick = async (row) => {
    // ... same as your existing function
  };

  const handleReset = () => {
    const today = new Date();
    setDateRangeType("Last 7 Days");
    setDates([subDays(today, 6), today]);
    setStatus("All");
    setSearchFields({});
    setData([]);
  };

  const formatDateRange = (start, end) => {
    if (start && end) {
      return `${format(start, "MM/dd/yyyy")} - ${format(end, "MM/dd/yyyy")}`;
    }
    return "";
  };

  const handleExport = () => {
    const exportData = filteredData.map((row) => {
      const exportRow = {};
      columns.forEach(({ key, label }) => {
        exportRow[label] = row[key];
      });
      return exportRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CV History");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, "CV_History.xlsx");
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      if (key === "cvNo") {
        const numA = parseInt(a[key] || "0", 10);
        const numB = parseInt(b[key] || "0", 10);
        return direction === "asc" ? numA - numB : numB - numA;
      }

      if (a[key] === null) return 1;
      if (b[key] === null) return -1;
      if (a[key] === b[key]) return 0;

      return direction === "asc"
        ? a[key] > b[key]
          ? 1
          : -1
        : a[key] < b[key]
        ? 1
        : -1;
    });
    setData(sortedData);
  };


  
  const fetchTranData = async (documentNo, branchCode) => {
    const resetState = () => {
      updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
      updateTotals([]);
    };
  
    updateState({ isLoading: true });
  
    try {
      const data = await useFetchTranData(documentNo, branchCode,docType,"cvNo");
  
      if (!data?.cvId) {
        Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
        return resetState();
      }
  
      // Format header date
      let cvDateForHeader = '';
      if (data.cvDate) {
        const d = new Date(data.cvDate);
        cvDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
      }
  
      // Format header date
      let checkDateForHeader = '';
      if (data.checkDate) {
        const d = new Date(data.checkDate);
        checkDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
      }
  
      // Format rows
      const retrievedDetailRows = (data.dt1 || []).map(item => ({
        ...item,
        origAmount: formatNumber(item.origAmount),
        currRate: formatNumber(item.currRate),
        siAmount: formatNumber(item.siAmount),
        appliedAmount: formatNumber(item.appliedAmount),
        unappliedAmount: formatNumber(item.unappliedAmount),
        balance: formatNumber(item.balance),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
        amountDue: formatNumber(item.amountDue),
      }));
  
      const formattedGLRows = (data.dt2 || []).map(glRow => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
      }));
  
    
      // Update state with fetched data
      updateState({
        documentStatus: data.cvStatus,
        status: data.docStatus,
        documentID: data.cvId,
        documentNo: data.cvNo,
        branchCode: data.branchCode,
        header: { cv_date: cvDateForHeader },
        header: { ck_date: checkDateForHeader },
        selectedCvType: data.cvtranType,
        selectedWithAPV: data.withAPV,
        selectedPayType: data.payType,
        vendCode: data.vendCode,
        vendName: data.vendName,
        bankCode: data.bankCode,
        bankAcctNo: data.bankAcctNo,
        checkNo: data.checkNo,
        refDocNo1: data.refDocNo1,
        refDocNo2: data.refDocNo2,
        currAmount: formatNumber(data.currAmount, 6),
        currRate: formatNumber(data.currRate, 6),
        currCode: data.currCode,
        currName: data.currName,
        amount: formatNumber(data.amount, 6),
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
  
     
      updateTotals(retrievedDetailRows);
  
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Add this function inside your CVHistory component
const handleViewClick = (row) => {
  const documentNo = row.cvNo;
  const branchCode = row.branchCode; // Assuming your data has a branchCode field
 navigate("/tran-ap-cvtran");
  // You will need to import and use the fetchTranData from your CVForm component
  // Or, you can re-implement the necessary logic here.
  // For simplicity, let's assume we implement the logic here directly.

  // Simulate calling the external fetch function
  // fetchTranData(documentNo, branchCode);
  
  // Navigate to the transaction details page
  navigate("/tran-ap-cvtran");
};

const columns = [
{
  key: "actions",
  label: "View",
  sortable: false,
  format: (value, row) => (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevents the row's onClick from firing

        // Correct way to log the value before navigating
        console.log("Selected CV Number:", row.cvNo);

        navigate("/tran-ap-cvtran", {
          state: {
            cvNo: row.cvNo,
            branchCode: row.branchCode,
          },
        });
      }}
      className="px-2 py-0 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      <FontAwesomeIcon icon={faEye} className="w-4 h-3" />
    </button>
  ),
},

  { key: "branchCode", label: "Branch" },
  { key: "cvNo", label: "CV No", sortable: true },
  {
    key: "cvDate",
    label: "CV Date",
    format: (value) => (value ? format(new Date(value), "MM/dd/yyyy") : "—"),
  },
  { key: "vendCode", label: "Payee Code" },
  { key: "vendName", label: "Payee Name" },
  { key: "cvtranType", label: "CV Type" },
  { key: "cvType", label: "Payment Type" },
  {
      key: "currAmount",
      label: "CV Amount",
      numeric: true, // Add this property
      format: (value) => {
        const cleanedValue = String(value).replace(/[^0-9.-]/g, '');
        const numValue = parseFloat(cleanedValue);
        return !isNaN(numValue)
          ? numValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "—";
      },
    },
    { key: "currCode", label: "Currency Code" },
    {
      key: "currRate",
      label: "Currency Rate",
      numeric: true, // Add this property
      format: (value) => {
        const cleanedValue = String(value).replace(/[^0-9.-]/g, '');
        const numValue = parseFloat(cleanedValue);
        return !isNaN(numValue)
          ? numValue.toLocaleString("en-US", {
              minimumFractionDigits: 6,
              maximumFractionDigits: 6,
            })
          : "—";
      },
    },
    { key: "remarks", label: "Particular" },
    {
      key: "cvStatus",
      label: "Status",
      format: (value) => {
        const status = statusStyles[value] || statusStyles[""];
        return <span className={status.color}>{status.text}</span>;
      },
    },
    { key: "preparedBy", label: "Prepared By" },
    {
      key: "dateStamp",
      label: "Date Stamp",
      format: (value) => (value ? format(new Date(value), "MM/dd/yyyy") : "—"),
    },
    { key: "timeStamp", label: "Time Stamp" },
];

  const handleSearchChange = (e, key) => {
    const { value } = e.target;
    setSearchFields((prev) => ({ ...prev, [key]: value }));
  };

  const filteredData = data.filter((row) =>
    Object.entries(searchFields).every(([key, value]) =>
      row[key]?.toString().toLowerCase().includes(value.toLowerCase())
    )
  );

  return (
    <div className="fixed top-[55px] left-0 w-full z-30 bg-white shadow-md dark:bg-gray-800">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-2 gap-2 border-b border-gray-200 dark:border-gray-700">
        {/* Header Tabs */}
        <div className="flex flex-wrap justify-center md:justify-start gap-1 lg:gap-2 w-full md:w-auto">
          {/* ... transaction details button */}
          <button
            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group ${
              location.pathname === "/"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
            }`}
            onClick={() => navigate("/tran-ap-cvtran")}
          >
            <FontAwesomeIcon icon={faPen} className="w-4 h-3 mr-2" />
            <span className="group-hover:block">Transaction Details</span>
          </button>
          <button
            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group ${
              location.pathname === "/CVhistory"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
            }`}
            onClick={() => navigate("/CVhistory")}
          >
            <FontAwesomeIcon icon={faList} className="w-4 h-4 mr-2" />
            <span className="group-hover:block">Transaction History</span>
          </button>
        </div>
      </div>

      {/* Tailwind CSS Animations */}
      <style jsx="true">{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out forwards;
        }
      `}</style>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row flex-wrap items-end gap-2 mb-2 overflow-x-auto p-4">
  {/* Date Range Filter */}
  <div className="flex-shrink-0 min-w-[350px]">
    <label className="block text-sm font-medium text-gray-600 mb-1">
      Date Range:
    </label>
    <div className="flex items-center border border-gray-300 rounded-md px-2 py-1 bg-white">
      <select
        className="border-none focus:ring-0 text-sm bg-transparent pr-2"
        value={dateRangeType}
        onChange={(e) => setDateRangeType(e.target.value)}
      >
        <option>Last 7 Days</option>
        <option>Last 30 Days</option>
        <option>Custom Range</option>
      </select>
      <div className="flex items-center border-l border-gray-300 pl-2">
        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2" />
        <input
          type="text"
          value={formatDateRange(dates[0], dates[1])}
          onClick={() => {
            if (dateRangeType === "Custom Range") setModalIsOpen(true);
          }}
          className="w-full h-[25px] border-none focus:ring-0 text-sm bg-transparent text-gray-500 cursor-pointer"
          placeholder="Select date range"
          readOnly
        />
      </div>
    </div>
  </div>

  {/* Status Filter */}
  <div className="flex-shrink-0 min-w-[200px]">
    <label className="block text-sm font-medium text-gray-600 mb-1">
      Status:
    </label>
    <div className="flex items-center border border-gray-300 rounded-md px-2 py-1 bg-white">
      <FontAwesomeIcon icon={faFilter} className="text-gray-400 mr-2" />
      <select
        className="w-full h-[25px] border-none focus:ring-0 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="All">All Statuses</option>
        <option value="F">FINALIZED</option>
        <option value="">OPEN</option>
        <option value="C">CANCELLED</option>
        {/* <option value="P">POSTED</option> */}
      </select>
    </div>
  </div>

  {/* Document Number Range Filter */}
  {/* <div className="flex-shrink-0 w-full md:w-auto min-w-[250px]">
    <label className="block text-sm font-medium text-gray-600 mb-1">
      Document Number Range:
    </label>
    <div className="flex items-center border border-gray-300 rounded-md px-2 py-1 bg-white">
      <FontAwesomeIcon icon={faFileAlt} className="text-gray-400 mr-2" />
      <input
        type="text"
        placeholder="00000001 - 00000010"
        className="w-full h-[25px] border-none bg-white text-sm text-gray-500"
      />
    </div>
  </div> */}
  
  {/* Search Button (now in the correct position) */}
  <div className="flex-shrink-0 w-full md:w-auto mt-auto flex-shrink-0">
    <button
      className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-md w-full"
      onClick={fetchData}
    >
      <FontAwesomeIcon icon={faFilter} className="mr-2"/>
      Filter
    </button>
  </div>
  
  {/* Export and Reset Buttons */}
  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto ml-auto">
    <button
      className="flex items-center justify-center bg-green-500 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-green-600 shadow-md w-full"
      onClick={handleExport}
    >
      <FontAwesomeIcon icon={faDownload} className="mr-2" />
      <span className="truncate">Export</span>
    </button>
    <button
      className="flex items-center justify-center bg-blue-500 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-blue-600 shadow-md w-full"
      onClick={handleReset}
    >
      <FontAwesomeIcon icon={faRedo} className="mr-2" />
      <span className="truncate">Reset</span>
    </button>
  </div>
</div>

      {/* Table Display */}
      <div className="mt-0 bg-white shadow-md rounded-xl overflow-hidden p-4">
        <div className="overflow-x-auto bg-white rounded-xl max-h-[55vh]">
          {loading ? (
            <div className="text-center py-0">
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <table className="min-w-[1800px] text-[12px] text-center border-collapse border border-gray-300">
              <thead className="text-[12px]">
                {/* Header row for column labels */}
                <tr className="bg-blue-700 text-white sticky top-0 z-30">
                  {columns.map(({ key, label, sortable }) => (
                    <th
                      key={key}
                      onClick={() => sortable && handleSort(key)}
                      className={`px-3 py-2 border whitespace-nowrap ${
                        sortable ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {label}
                        {sortable && (
                          <FontAwesomeIcon
                            icon={
                              sortConfig.key === key &&
                              sortConfig.direction === "asc"
                                ? faArrowUp
                                : faArrowDown
                            }
                            className="text-xs"
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Filter row */}
                <tr className="bg-gray-100 sticky top-[36px] z-20">
                  {columns.map(({ key }) => (
                    <td key={key} className="px-2 py-1 border whitespace-nowrap">
                      {key !== "actions" && ( // Add this conditional check
                        <input
                          type="text"
                          value={searchFields[key] || ""}
                          onChange={(e) => handleSearchChange(e, key)}
                          placeholder="Filter"
                          className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 text-[10px]"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-[10px]">
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => {
                    const status = statusStyles[row.cvStatus] || statusStyles[""];

                    return (
                      <tr
                        key={index}
                        className={`hover:bg-blue-50 transition cursor-pointer ${status.color}`}
                        onClick={() => handleRowClick(row)}
                      >
                        {columns.map(({ key, format, numeric }) => {
                          const displayValue = format ? format(row[key]) : row[key] || "—";
                          
                          // Build the class name conditionally
                          const cellClass = `px-2 py-1 border whitespace-nowrap ${numeric ? 'text-right' : 'text-left'}`;

                          return (
                            <td
                              key={key}
                              className={cellClass}
                              title={row[key]}
                            >
                              {displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="text-center text-gray-500 py-4 border"
                    >
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Date Picker Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        className="bg-white rounded-lg p-6 max-w-md mx-auto mt-20 border border-gray-300 shadow-lg outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      >
        <h2 className="text-lg font-semibold mb-2">Select Custom Date Range</h2>
        <DatePicker
          selectsRange
          startDate={dates[0]}
          endDate={dates[1]}
          onChange={(update) => {
            setDates(update);
          }}
          inline
        />
        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={() => setModalIsOpen(false)}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-sm rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (dates[0] && dates[1]) {
                setModalIsOpen(false);
                fetchData();
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
          >
            Apply
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CVHistory;