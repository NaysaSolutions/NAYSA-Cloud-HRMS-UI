import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faRotateLeft,
  faList,
  faRoute,
  faPrint,
} from "@fortawesome/free-solid-svg-icons";

import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import MSLookupModal from "@/NAYSA Cloud/Lookup/SearchMSMast.jsx";

import PRInq from "./PRInq";

const ENDPOINT = "getPRInquiry";

const TABS = [
  { key: "inquiry", label: "PR Inquiry", icon: faList },
  { key: "tracker", label: "PR Tracker", icon: faRoute },
];

const safeArray = (value) => (Array.isArray(value) ? value : []);

const joinCodeName = (code, name) => {
  const cleanCode = String(code || "").trim();
  const cleanName = String(name || "").trim();
  if (!cleanCode) return cleanName;
  if (!cleanName || cleanName === cleanCode) return cleanCode;
  return `${cleanCode} - ${cleanName}`;
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getToday = () => toDateInputValue(new Date());
const getThreeMonthsAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return toDateInputValue(date);
};

const dateToCutoff = (dateText) =>
  dateText ? String(dateText).slice(0, 7).replace("-", "") : "";

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);

const formatPrintValue = (value, type) => {
  if (type !== "number") return value ?? "";

  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

// Column Configuration matrix with visibility flags
const defaultPRColumns = [
  { key: "prNo", label: "PR Number", visible: true, type: "text" },
  { key: "prDate", label: "PR Date", visible: true, type: "date" },
  { key: "branch", label: "Branch", visible: true, type: "text" },
  { key: "invType", label: "Type", visible: true, type: "text" },
  { key: "itemCode", label: "Item Code", visible: true, type: "text" },
  { key: "itemName", label: "Item Description", visible: true, type: "text" },
  { key: "status", label: "Status", visible: true, type: "text" },
  { key: "prQuantity", label: "PR Qty", visible: true, type: "number" },
  { key: "poQty", label: "PO/JO Qty", visible: true, type: "number" },
  { key: "poNo", label: "PO/JO Ref No.", visible: true, type: "text" }, // ✅ Added PO/JO Reference Column Mapping
  { key: "rrQty", label: "RR Qty", visible: true, type: "number" },
  { key: "rrNo", label: "RR Ref No.", visible: true, type: "text" },   
  { key: "apvNo", label: "APV Ref No.", visible: true, type: "text" }, 
  { key: "cvNo", label: "CV Ref No.", visible: true, type: "text" },
];

const normalizePRDetailRows = (rows = []) => {
  return safeArray(rows).map((item, index) => ({
    ...item,
    id: `${item.branchCode}-${item.prNo}-${index}`,
    prDate: formatDateDisplay(item.prDate),
    branch: item.branchCode || "",
    invType: item.invType || "N/A",
    status: item.prStatusDesc || "Open",
    itemCode: item.itemCode || "", 
    itemName: item.itemName || "", 
    prQuantity: Number(item.prQuantity || 0),
    poQty: Number(item.poQty || 0),
    rrQty: Number(item.rrQty || 0),
    // Replaces raw CHAR(10) newlines from SQL with clean comma separators for clean text visibility
    poNo: (item.poNo || "").trim().replace(/\n/g, ", "), // ✅ Added PO/JO Dynamic Newline Sanitizer Map
    rrNo: (item.rrNo || "").trim().replace(/\n/g, ", "),
    apvNo: (item.apvNo || "").trim().replace(/\n/g, ", "),
    cvNo: (item.cvNo || "").trim().replace(/\n/g, ", "),
  }));
};

const parseJsonValue = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Supports both controller response formats:
// 1. { success: true, data: [{ dt1: [...] }] }
// 2. { success: true, data: [{ result: '[{"dt1":[...]}]' }] }
const extractPRDetailRows = (response) => {
  const candidates = [
    response?.data,
    response?.data?.data,
    response,
  ];

  for (const candidate of candidates) {
    const parsedCandidate = parseJsonValue(candidate);
    const firstRow = Array.isArray(parsedCandidate)
      ? parsedCandidate[0]
      : parsedCandidate;
    const parsedResult = parseJsonValue(firstRow?.result);
    const container = parsedResult || firstRow;

    if (Array.isArray(container?.dt1)) return container.dt1;
    if (Array.isArray(container?.[0]?.dt1)) return container[0].dt1;
  }

  return [];
};

export default function PRInquiry() {
  const navigate = useNavigate();
  const { currentUserRow } = useAuth();

  const [activeTab, setActiveTab] = useState("inquiry");
  const [showLookup, setShowLookup] = useState(null);

  const [state, setState] = useState(() => ({
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "Head Office",
    statusFilter: "All",
    invType: "All",
    selectedItems: [], 
    rcCode: "",
    rcName: "",
    fromDate: getThreeMonthsAgo(),
    toDate: getToday(),
    prInquiryData: [],
    isLoading: false,
  }));

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  useEffect(() => {
    const userBranchCode = currentUserRow?.branchCode || "";
    const userBranchName = currentUserRow?.branchName || "";

    if (!userBranchCode) return;

    setState((previous) => {
      if (previous.branchCode) return previous;

      return {
        ...previous,
        branchCode: userBranchCode,
        branchName: userBranchName || previous.branchName,
      };
    });
  }, [currentUserRow]);

  const getItemsDisplayText = () => {
    if (state.selectedItems.length === 0) return "";
    if (state.selectedItems.length === 1) {
      return joinCodeName(state.selectedItems[0].code, state.selectedItems[0].name);
    }
    return `${state.selectedItems.length} Items Selected`;
  };

  const fetchRecord = useCallback(async () => {
    if (!state.fromDate || !state.toDate) {
      window.alert("Please select both From and To dates.");
      return;
    }

    if (state.fromDate > state.toDate) {
      window.alert("From Date must not be later than To Date.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const statusMap = { "All": "", "Open": "O", "Closed": "C", "Cancelled": "X" };
      const itemCodesStr = state.selectedItems.map(i => i.code).join(',');

      const response = await fetchData(ENDPOINT, {
        json_data: {
          branchCode: state.branchCode,
          itemCode: itemCodesStr, 
          prStatus: statusMap[state.statusFilter] || "", 
          startingDate: state.fromDate,
          endingDate: state.toDate,
          // Retained for compatibility with older deployed procedures.
          startingCutoff: dateToCutoff(state.fromDate),
          endingCutoff: dateToCutoff(state.toDate),
          rcCode: state.rcCode,
          invType: state.invType === "All" ? "" : state.invType,
        },
      });

      if (response?.success === false || response?.data?.success === false) {
        throw new Error(response?.message || response?.data?.message || "Unable to load PR Inquiry.");
      }

      const rows = extractPRDetailRows(response);
      updateState({ prInquiryData: normalizePRDetailRows(rows) });
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [state]);

  const handleReset = () => {
    updateState({
      selectedItems: [], rcCode: "", rcName: "",
      statusFilter: "All", invType: "All",
      fromDate: getThreeMonthsAgo(), toDate: getToday(),
      prInquiryData: []
    });
  };

  const handlePrint = () => {
    if (state.prInquiryData.length === 0) {
      window.alert("No PR Inquiry data to print. Please click Find first.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1400,height=900");

    if (!printWindow) {
      window.alert("The print window was blocked. Please allow pop-ups and try again.");
      return;
    }

    const visibleColumns = defaultPRColumns.filter((column) => column.visible);
    const numericColumns = visibleColumns.filter((column) => column.type === "number");
    const totals = numericColumns.reduce((summary, column) => {
      summary[column.key] = state.prInquiryData.reduce(
        (total, row) => total + Number(row[column.key] || 0),
        0
      );
      return summary;
    }, {});

    const headerCells = visibleColumns
      .map((column) => `<th>${escapeHtml(column.label)}</th>`)
      .join("");

    const detailRows = state.prInquiryData
      .map((row) => `
        <tr>
          ${visibleColumns.map((column) => `
            <td class="${column.type === "number" ? "number" : ""}">
              ${escapeHtml(formatPrintValue(row[column.key], column.type))}
            </td>
          `).join("")}
        </tr>
      `)
      .join("");

    const totalCells = visibleColumns
      .map((column, index) => {
        if (index === 0) return '<td class="total-label">TOTAL</td>';
        if (column.type === "number") {
          return `<td class="number total-value">${escapeHtml(formatPrintValue(totals[column.key], "number"))}</td>`;
        }
        return "<td></td>";
      })
      .join("");

    const branch = joinCodeName(state.branchCode, state.branchName) || "All Branches";
    const department = joinCodeName(state.rcCode, state.rcName) || "All Departments";
    const item = getItemsDisplayText() || "All Items";
    const period = `${formatDateDisplay(state.fromDate)} to ${formatDateDisplay(state.toDate)}`;
    const generatedAt = new Date().toLocaleString("en-PH", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>PR Inquiry</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; font-size: 9px; }
            h1 { text-align: center; font-size: 18px; margin: 0 0 4px; }
            .subtitle { text-align: center; color: #4b5563; margin-bottom: 12px; }
            .filters { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .filters td { border: 0; padding: 2px 8px 2px 0; vertical-align: top; }
            .filter-label { color: #4b5563; font-weight: 700; white-space: nowrap; }
            .report { width: 100%; border-collapse: collapse; table-layout: auto; }
            .report th, .report td { border: 1px solid #9ca3af; padding: 4px; vertical-align: top; }
            .report th { background: #dbeafe; font-weight: 700; text-align: center; white-space: nowrap; }
            .report td { overflow-wrap: anywhere; }
            .report .number { text-align: right; white-space: nowrap; }
            .report tfoot td { background: #eff6ff; font-weight: 700; }
            .total-label { text-align: left; }
            .total-value { color: #1d4ed8; }
            thead { display: table-header-group; }
            tfoot { display: table-row-group; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            .footer { margin-top: 8px; display: flex; justify-content: space-between; color: #4b5563; }
          </style>
        </head>
        <body>
          <h1>Purchase Request Inquiry</h1>
          <div class="subtitle">NAYSA Financials</div>

          <table class="filters">
            <tr>
              <td><span class="filter-label">Branch:</span> ${escapeHtml(branch)}</td>
              <td><span class="filter-label">Department:</span> ${escapeHtml(department)}</td>
              <td><span class="filter-label">Period:</span> ${escapeHtml(period)}</td>
            </tr>
            <tr>
              <td><span class="filter-label">Status:</span> ${escapeHtml(state.statusFilter)}</td>
              <td><span class="filter-label">Inventory Type:</span> ${escapeHtml(state.invType === "All" ? "All Types" : state.invType)}</td>
              <td><span class="filter-label">Item:</span> ${escapeHtml(item)}</td>
            </tr>
          </table>

          <table class="report">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${detailRows}</tbody>
            <tfoot><tr>${totalCells}</tr></tfoot>
          </table>

          <div class="footer">
            <span>Total Records: ${state.prInquiryData.length}</span>
            <span>Generated: ${escapeHtml(generatedAt)}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const handleViewDocument = (row) => {
    navigate(`/page/PR?prNo=${encodeURIComponent(row.prNo)}&branchCode=${encodeURIComponent(row.branchCode)}&viewOnly=Y`);
  };

  return (
    <div className="global-ref-main-div-ui">
      {state.isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center">
          <h1 className="global-ref-headertext-ui truncate">
            {TABS.find(t => t.key === activeTab)?.label}
          </h1>

          <div className="flex justify-center">
            <div className="flex border-b border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                    activeTab === tab.key ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {activeTab === "inquiry" && (
              <>
                <button onClick={fetchRecord} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs font-medium">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" /> Find
                </button>
                <button onClick={handlePrint} className="bg-emerald-600 text-white px-4 py-2 rounded-md text-xs font-medium">
                  <FontAwesomeIcon icon={faPrint} className="mr-2" /> Print
                </button>
                <button onClick={handleReset} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-xs font-medium border">
                  <FontAwesomeIcon icon={faRotateLeft} className="mr-2" /> Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-44 sm:mt-24 px-0">
        {activeTab === "inquiry" ? (
          <>
            <div className="global-tran-tab-div-ui">
              <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <FieldRenderer type="lookup" label="Branch" value={state.branchName} onLookup={() => setShowLookup("branch")} />
                  </div>
                  <div className="md:col-span-4"> 
                    <FieldRenderer type="lookup" label="Department" value={joinCodeName(state.rcCode, state.rcName)} onLookup={() => setShowLookup("rc")} />
                  </div>
                  <div className="md:col-span-2 relative">
                    <select value={state.invType} onChange={(e) => updateState({ invType: e.target.value })} className="peer global-tran-textbox-ui">
                      <option value="All">All Types</option>
                      <option value="FG">FG</option>
                      <option value="MS">MS</option>
                      <option value="RM">RM</option>
                      <option value="JO">JO</option>
                    </select>
                    <label className="global-tran-floating-label">Inv Type</label>
                  </div>
                  <div className="md:col-span-3">
                    <div className="relative">
                      <input
                        id="pr-inquiry-from-date"
                        type="date"
                        value={state.fromDate}
                        onChange={(e) => updateState({ fromDate: e.target.value })}
                        className="peer global-tran-textbox-ui"
                      />
                      <label htmlFor="pr-inquiry-from-date" className="global-tran-floating-label">
                        From
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-2 relative">
                    <select value={state.statusFilter} onChange={(e) => updateState({ statusFilter: e.target.value })} className="peer global-tran-textbox-ui">
                      <option value="All">All Status</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <label className="global-tran-floating-label">Status</label>
                  </div>

                  <div className="md:col-span-7">
                    <FieldRenderer type="lookup" label="Item" value={getItemsDisplayText()} onLookup={() => setShowLookup("item")} />
                  </div>

                  <div className="md:col-span-3">
                    <div className="relative">
                      <input
                        id="pr-inquiry-to-date"
                        type="date"
                        value={state.toDate}
                        onChange={(e) => updateState({ toDate: e.target.value })}
                        className="peer global-tran-textbox-ui"
                      />
                      <label htmlFor="pr-inquiry-to-date" className="global-tran-floating-label">
                        To
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="global-tran-tab-div-ui mt-4">
              <div className="global-tran-table-main-div-ui overflow-x-auto">
                <SearchGlobalReportTable 
                  columns={defaultPRColumns} 
                  data={state.prInquiryData} 
                  onRowAction={handleViewDocument} 
                  rightActionLabel="View" 
                />
              </div>
            </div>
          </>
        ) : (
          <PRInq />
        )}
      </div>

      {showLookup === "branch" && <BranchLookupModal isOpen onClose={(b) => { if (b) updateState({ branchCode: b.branchCode, branchName: b.branchName }); setShowLookup(null); }} />}
      {showLookup === "rc" && <RCLookupModal isOpen onClose={(r) => { if (r) updateState({ rcCode: r.rcCode, rcName: r.rcName }); setShowLookup(null); }} />}
      {showLookup === "item" && (
        <MSLookupModal 
          isOpen 
          onClose={(selected) => { 
            if (selected) {
              const items = Array.isArray(selected) ? selected : [selected];
              const normalizedItems = items.map(i => ({
                code: i.itemCode || i.item_code || "",
                name: i.itemDesc || i.item_name || i.itemName || ""
              }));
              updateState({ selectedItems: normalizedItems }); 
            }
            setShowLookup(null); 
          }} 
        />
      )}
    </div>
  );
}
