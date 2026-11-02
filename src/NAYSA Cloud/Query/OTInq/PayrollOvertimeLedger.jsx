import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsRotate,
  faChevronDown,
  faChevronUp,
  faFileExcel,
  faFilter,
  faMagnifyingGlass,
  faPrint,
  faRotateLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import SearchCutoffRef from "@/NAYSA Cloud/Lookup/SearchRefPayrollPeriod.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchOvertimeRef from "@/NAYSA Cloud/Lookup/SearchOvertimeRef.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

/*
 * NAYSA Cloud HRIS — Payroll Overtime Ledger
 *
 * Uses existing GET /overtimeTransactions/selectionReferences to populate filters.
 * Requires new POST /overtimeTransactions/ledger; see companion SQL/API snippets.
 * The ledger is READ-ONLY: it does not update payroll or overtime records.
 */

const ENDPOINT = "/overtimeTransactions";

const FREQUENCIES = [
  { value: "S", label: "Semi-Monthly" },
  { value: "M", label: "Monthly" },
  { value: "W", label: "Weekly" },
];

const COLUMNS = [
  { key: "cutoffCode", label: "Cut Off", width: 125 },
  { key: "empNo", label: "Emp. No.", width: 120 },
  { key: "empName", label: "Employee Name", width: 230 },
  { key: "otCode", label: "OT Code", width: 110 },
  { key: "otName", label: "OT Description", width: 220 },
  { key: "hourRate", label: "Hour Rate", width: 115, numeric: true },
  { key: "otHours", label: "OT Hrs.", width: 105, numeric: true },
  { key: "otRate", label: "OT Rate (%)", width: 115, numeric: true },
  { key: "otAmount", label: "OT Amount", width: 140, numeric: true },
  { key: "branchCode", label: "Branch", width: 110 },
  { key: "deptCode", label: "Dept.", width: 105 },
  { key: "groupCode", label: "Pay Group", width: 110 },
  { key: "docNo", label: "OT Transaction", width: 145 },
  { key: "documentStatus", label: "Status", width: 115 },
];

const initialFilters = (companyInfo = {}) => ({
  payFrequency: ["S", "M", "W"].includes(String(companyInfo.cutoffType || "").toUpperCase().slice(0, 1))
    ? String(companyInfo.cutoffType).toUpperCase().slice(0, 1)
    : "S",
  beginningCutoff: "",
  beginningCutoffName: "",
  beginningCutoffDate: "",
  endingCutoff: "",
  endingCutoffName: "",
  endingCutoffDate: "",
  branchCode: "",
  groupCode: "",
  deptCode: "",
  employeeNo: "",
  employeeName: "",
  otCode: "",
  otName: "",
  documentStatus: "F",
});

const read = (object, ...names) => {
  for (const name of names) {
    const value = object?.[name];
    if (value !== undefined && value !== null) return value;
  }
  return "";
};

const asNumber = (value) => {
  const number = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(number) ? number : 0;
};

const money = (value, digits = 2) =>
  asNumber(value).toLocaleString("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const unpackResult = (response, fallback) => {
  if (response?.data?.success === false) {
    throw new Error(response.data.message || "Unable to retrieve overtime ledger.");
  }
  const first = response?.data?.data?.[0];
  const raw = first?.result ?? response?.data?.result ?? fallback;
  if (first?.errorCount || first?.errorcount) {
    throw new Error(first.errorMsg || first.errormsg || "The server returned an error.");
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("The server returned invalid ledger JSON.");
    }
  }
  return raw ?? fallback;
};

const normalizeOptions = (items = []) =>
  (Array.isArray(items) ? items : []).map((entry) => ({
    value: String(read(entry, "value", "code", "branchCode", "groupCode", "deptCode")),
    label: String(read(entry, "label", "description", "name", "value", "code")),
  }));

const normalizeRow = (row, index) => {
  const hours = read(row, "otHours", "OT_HRS", "ot_hrs");
  const minutes = read(row, "otMinutes", "OT_MINS", "ot_mins");
  return {
    id: `${read(row, "otId", "OT_ID", "ot_id") || "OT"}-${read(row, "groupId", "GROUP_ID") || index}-${read(row, "lineNo", "LINE_NO") || index}`,
    cutoffCode: String(read(row, "cutoffCode", "CUTOFF_CODE")),
    empNo: String(read(row, "empNo", "employeeNo", "EMP_NO")),
    empName: String(read(row, "empName", "employeeName", "EMP_NAME")),
    otCode: String(read(row, "otCode", "OT_CODE")),
    otName: String(read(row, "otName", "otDescription", "OT_NAME")),
    hourRate: asNumber(read(row, "hourRate", "HOUR_RATE")),
    otHours: asNumber(hours) + asNumber(minutes) / 60,
    otRate: asNumber(read(row, "otRate", "OT_RATE")),
    otAmount: asNumber(read(row, "otAmount", "OT_AMOUNT")),
    branchCode: String(read(row, "branchCode", "BRANCH_CODE")),
    deptCode: String(read(row, "deptCode", "departmentCode", "DEPT_CODE")),
    groupCode: String(read(row, "groupCode", "payGroup", "GROUP_CODE")),
    docNo: String(read(row, "docNo", "otNo", "OT_NO")),
    documentStatus: String(read(row, "documentStatus", "docStatus", "DOC_STATUS")),
  };
};

const statusLabel = (value) => {
  if (value === "F") return "FINALIZED";
  if (value === "X") return "CANCELLED";
  if (value === "D" || value === "") return "OPEN";
  return String(value);
};

const csvCell = (value) => {
  const text = String(value ?? "");
  // Prevent spreadsheet formula execution when a CSV is opened in Excel.
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

const LedgerField = ({ label, children }) => (
  <div className="min-w-0 space-y-1.5">
    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
    {children}
  </div>
);

const PayrollOvertimeLedger = () => {
  const { companyInfo, currentUserRow, user } = useAuth();
  const [filters, setFilters] = useState(() => initialFilters(companyInfo));
  const [references, setReferences] = useState({ branches: [], payGroups: [], departments: [] });
  const [lookup, setLookup] = useState("");
  const [rows, setRows] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sort, setSort] = useState({ key: "empNo", direction: "asc" });
  const [groupBy, setGroupBy] = useState("");

  const updateFilters = useCallback((patch) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    setGenerated(false);
    setRows([]);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const response = await apiClient.get(`${ENDPOINT}/selectionReferences`);
        const result = unpackResult(response, {});
        if (!live) return;
        setReferences({
          branches: normalizeOptions(result.branches),
          payGroups: normalizeOptions(result.payGroups),
          departments: normalizeOptions(result.departments),
        });
      } catch (error) {
        if (live) console.error("Overtime ledger reference loading failed:", error);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const reset = () => {
    setFilters(initialFilters(companyInfo));
    setLookup("");
    setRows([]);
    setGenerated(false);
    setQuickSearch("");
    setColumnFilters({});
    setGroupBy("");
    setSort({ key: "empNo", direction: "asc" });
  };

  const onCutoffSelected = (side, value) => {
    if (!value) return setLookup("");
    const prefix = side === "beginning" ? "beginningCutoff" : "endingCutoff";
    const date = side === "beginning"
      ? read(value, "cutoffStartDate", "startDate", "CUTOFF_STARTDATE")
      : read(value, "cutoffEndDate", "endDate", "CUTOFF_ENDDATE");
    updateFilters({
      [prefix]: String(read(value, "code", "cutoffCode", "value")),
      [`${prefix}Name`]: String(read(value, "description", "cutoffName", "label")),
      [`${prefix}Date`]: String(date || ""),
    });
    setLookup("");
  };

  const generate = async () => {
    if (!filters.payFrequency || !filters.beginningCutoff || !filters.endingCutoff) {
      useSwalErrorAlert("Required Filters", "Select Pay Frequency, Beginning Cut-Off and Ending Cut-Off.");
      return;
    }
    const firstDate = filters.beginningCutoffDate;
    const lastDate = filters.endingCutoffDate;
    if (firstDate && lastDate && Number.isFinite(Date.parse(firstDate)) && Number.isFinite(Date.parse(lastDate)) && new Date(firstDate) > new Date(lastDate)) {
      useSwalErrorAlert("Invalid Cut-Off Range", "Beginning Cut-Off cannot be later than Ending Cut-Off.");
      return;
    }

    setIsLoading(true);
    setGenerated(false);
    try {
      const response = await apiClient.post(`${ENDPOINT}/ledger`, {
        jsonData: {
          payFrequency: filters.payFrequency,
          beginningCutoff: filters.beginningCutoff,
          endingCutoff: filters.endingCutoff,
          branchCode: filters.branchCode || null,
          groupCode: filters.groupCode || null,
          deptCode: filters.deptCode || null,
          employeeNo: filters.employeeNo || null,
          employeeName: filters.employeeName || null,
          otCode: filters.otCode || null,
          documentStatus: filters.documentStatus || null,
          userCode: currentUserRow?.userCode || user?.USER_CODE || "",
        },
      });
      const result = unpackResult(response, []);
      const records = Array.isArray(result) ? result : result.rows;
      if (!Array.isArray(records)) throw new Error("Unexpected ledger response format.");
      setRows(records.map(normalizeRow));
      setGenerated(true);
    } catch (error) {
      setRows([]);
      const message = error?.response?.data?.message || error?.message || "Unable to generate overtime ledger.";
      useSwalErrorAlert("Overtime Ledger", message);
    } finally {
      setIsLoading(false);
    }
  };

  const visibleRows = useMemo(() => {
    const search = quickSearch.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (search && !COLUMNS.some(({ key }) => String(key === "documentStatus" ? statusLabel(row[key]) : row[key]).toLowerCase().includes(search))) {
        return false;
      }
      return Object.entries(columnFilters).every(([key, term]) =>
        !term || String(key === "documentStatus" ? statusLabel(row[key]) : row[key]).toLowerCase().includes(term.toLowerCase()),
      );
    });
    const column = COLUMNS.find(({ key }) => key === sort.key);
    return [...filtered].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const compared = column?.numeric
        ? asNumber(left) - asNumber(right)
        : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? compared : -compared;
    });
  }, [rows, quickSearch, columnFilters, sort]);

  const groups = useMemo(() => {
    if (!groupBy) return [{ label: "", data: visibleRows }];
    const map = new Map();
    visibleRows.forEach((row) => {
      const key = String(row[groupBy] || "(Blank)");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()].map(([label, data]) => ({ label, data }));
  }, [visibleRows, groupBy]);

  const totals = useMemo(() => visibleRows.reduce((sum, row) => ({
    employees: sum.employees.add(row.empNo),
    hours: sum.hours + row.otHours,
    amount: sum.amount + row.otAmount,
  }), { employees: new Set(), hours: 0, amount: 0 }), [visibleRows]);

  const toggleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const exportCsv = () => {
    if (!visibleRows.length) return;
    const csv = [
      COLUMNS.map((col) => csvCell(col.label)).join(","),
      ...visibleRows.map((row) => COLUMNS.map(({ key }) =>
        csvCell(key === "documentStatus" ? statusLabel(row[key]) : row[key]),
      ).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payroll_Overtime_Ledger_${filters.beginningCutoff}_${filters.endingCutoff}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printLedger = () => {
    if (visibleRows.length) window.print();
  };

  const displayCell = (row, col) => col.key === "documentStatus"
    ? statusLabel(row[col.key])
    : col.numeric ? money(row[col.key]) : row[col.key];

  const selectClass = "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const inputClass = `${selectClass} pr-10`;
  const actionButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  const cutoffValue = (side) => {
    const prefix = side === "beginning" ? "beginningCutoff" : "endingCutoff";
    const code = filters[prefix];
    return code ? `${code}${filters[`${prefix}Name`] ? ` - ${filters[`${prefix}Name`]}` : ""}` : "";
  };

  return (
    <div id="payroll-overtime-ledger" className="global-tran-main-div-ui min-h-full space-y-4 px-2 pb-5 sm:px-4">
      <style>{`
        @media print {
          @page { size: landscape; margin: 9mm; }
          body * { visibility: hidden !important; }
          #payroll-overtime-ledger, #payroll-overtime-ledger * { visibility: visible !important; }
          #payroll-overtime-ledger { position: absolute; inset: 0; width: 100%; padding: 0; background: white !important; color: black !important; }
          #payroll-overtime-ledger .ledger-no-print { display: none !important; }
          #payroll-overtime-ledger .ledger-print-header { display: block !important; }
          #payroll-overtime-ledger .ledger-scroll { overflow: visible !important; }
          #payroll-overtime-ledger table { width: 100% !important; min-width: 0 !important; table-layout: auto !important; font-size: 8px !important; }
          #payroll-overtime-ledger th, #payroll-overtime-ledger td { padding: 3px !important; white-space: normal !important; }
          #payroll-overtime-ledger thead { display: table-header-group !important; }
        }
      `}</style>
      {isLoading && <LoadingSpinner />}

      <div className="rounded-lg bg-gradient-to-r from-blue-200 to-blue-100 px-4 py-3 shadow-sm dark:from-blue-950 dark:to-slate-900">
        <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100">Payroll Overtime Ledger</h1>
        <p className="text-xs text-blue-700 dark:text-blue-300">Overtime records by payroll cut-off, employee and overtime classification</p>
      </div>

      <section className="ledger-no-print rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-5 border-b border-slate-200 pb-2 text-sm font-semibold text-blue-600 dark:border-slate-800 dark:text-blue-400">Filter Information</h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="grid content-start gap-4">
            <LedgerField label="Pay Frequency *">
              <select className={selectClass} value={filters.payFrequency} onChange={(e) => updateFilters({
                payFrequency: e.target.value,
                beginningCutoff: "", beginningCutoffName: "", beginningCutoffDate: "",
                endingCutoff: "", endingCutoffName: "", endingCutoffDate: "",
              })}>
                {FREQUENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LedgerField>
            {(["beginning", "ending"]).map((side) => <LedgerField key={side} label={`${side === "beginning" ? "Beginning" : "Ending"} Cut-Off *`}>
              <div className="relative">
                <input className={inputClass} value={cutoffValue(side)} placeholder={`Select ${side} cut-off`} onClick={() => setLookup(side)} readOnly />
                <button type="button" aria-label={`Look up ${side} payroll cut-off`} onClick={() => setLookup(side)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg border-l border-slate-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800">
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
              </div>
            </LedgerField>)}
          </div>

          <div className="grid content-start gap-4">
            {[
              ["branchCode", "Branch", references.branches],
              ["groupCode", "Payroll Group", references.payGroups],
              ["deptCode", "Department", references.departments],
            ].map(([key, label, options]) => <LedgerField key={key} label={label}>
              <select className={selectClass} value={filters[key]} onChange={(e) => updateFilters({ [key]: e.target.value })}>
                <option value="">All {label}s</option>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LedgerField>)}
          </div>

          <div className="grid content-start gap-4">
            <LedgerField label="Emp. No.">
              <div className="relative">
                <input className={inputClass} value={filters.employeeNo} placeholder="All employees" onChange={(e) => updateFilters({ employeeNo: e.target.value })} />
                <button type="button" aria-label="Look up employee" onClick={() => setLookup("employee")} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg border-l border-slate-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
              </div>
            </LedgerField>
            <LedgerField label="Emp. Name">
              <input className={selectClass} placeholder="Search employee name" value={filters.employeeName} onChange={(e) => updateFilters({ employeeName: e.target.value })} />
            </LedgerField>
            <LedgerField label="OT Description">
              <div className="relative">
                <input className={inputClass} placeholder="All overtime types" value={filters.otName || filters.otCode} readOnly onClick={() => setLookup("ot")} />
                <button type="button" aria-label="Look up overtime type" onClick={() => setLookup("ot")} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg border-l border-slate-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
                {filters.otCode && <button type="button" title="Clear OT Type" aria-label="Clear overtime type" onClick={() => updateFilters({ otCode: "", otName: "" })} className="absolute inset-y-0 right-10 px-2 text-slate-500 hover:text-red-500"><FontAwesomeIcon icon={faXmark} /></button>}
              </div>
            </LedgerField>
          </div>

          <div className="flex flex-col gap-4 xl:min-w-[190px]">
            <LedgerField label="Document Status">
              <select className={selectClass} value={filters.documentStatus} onChange={(e) => updateFilters({ documentStatus: e.target.value })}>
                <option value="F">Finalized</option>
                <option value="D">Open</option>
                <option value="X">Cancelled</option>
                <option value="">All Status</option>
              </select>
            </LedgerField>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={generate} disabled={isLoading} className={`${actionButton} bg-blue-600 text-white hover:bg-blue-700`}><FontAwesomeIcon icon={faFilter} />Generate</button>
              <button type="button" onClick={reset} disabled={isLoading} className={`${actionButton} border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300`}><FontAwesomeIcon icon={faRotateLeft} />Reset</button>
              <button type="button" onClick={printLedger} disabled={!visibleRows.length || isLoading} className={`${actionButton} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200`}><FontAwesomeIcon icon={faPrint} />Print</button>
              <button type="button" onClick={exportCsv} disabled={!visibleRows.length || isLoading} className={`${actionButton} bg-emerald-600 text-white hover:bg-emerald-700`}><FontAwesomeIcon icon={faFileExcel} />Export</button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="ledger-print-header hidden pb-3">
          <h2 className="text-lg font-bold">Payroll Overtime Ledger</h2>
          <p className="text-xs">Cut-Off: {filters.beginningCutoff} to {filters.endingCutoff}</p>
        </div>
        <div className="ledger-no-print mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Overtime Ledger Details</h2>
            <p className="text-xs text-slate-500">{generated ? `${visibleRows.length.toLocaleString("en-PH")} of ${rows.length.toLocaleString("en-PH")} records` : "Select filters and click Generate"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3 top-3 text-xs text-slate-400" />
              <input className="h-9 w-48 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 sm:w-64" value={quickSearch} placeholder="Quick Search..." onChange={(e) => setQuickSearch(e.target.value)} />
            </div>
            <button type="button" title="Clear grid filters" onClick={() => { setQuickSearch(""); setColumnFilters({}); setGroupBy(""); }} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><FontAwesomeIcon icon={faArrowsRotate} />Clear</button>
          </div>
        </div>

        <div className="ledger-no-print mb-3 flex min-h-9 items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const key = e.dataTransfer.getData("text/plain"); if (COLUMNS.some((col) => col.key === key)) setGroupBy(key); }}>
          <span>Drag a column here to group by this column</span>
          {groupBy && <button type="button" onClick={() => setGroupBy("")} className="inline-flex items-center gap-2 rounded-md bg-blue-100 px-2 py-1 font-medium text-blue-700">{COLUMNS.find((col) => col.key === groupBy)?.label}<FontAwesomeIcon icon={faXmark} /></button>}
        </div>

        <div className="ledger-scroll max-h-[560px] min-h-[250px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-separate border-spacing-0 text-xs" style={{ minWidth: COLUMNS.reduce((width, col) => width + col.width, 0) }}>
            <colgroup>{COLUMNS.map((col) => <col key={col.key} style={{ width: col.width }} />)}</colgroup>
            <thead className="sticky top-0 z-10 bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100">
              <tr>{COLUMNS.map((col) => <th key={col.key} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", col.key)} onClick={() => toggleSort(col.key)} title="Click to sort, drag to group" className={`cursor-pointer whitespace-nowrap border-b border-r border-blue-200 px-2 py-2 font-semibold dark:border-blue-900 ${col.numeric ? "text-right" : "text-left"}`}>
                <span className="inline-flex items-center gap-1">{col.label}{sort.key === col.key && <FontAwesomeIcon icon={sort.direction === "asc" ? faChevronUp : faChevronDown} className="text-[10px] text-blue-600" />}</span>
              </th>)}</tr>
              <tr className="ledger-no-print bg-white dark:bg-slate-900">{COLUMNS.map((col) => <th key={`${col.key}-filter`} className="border-b border-r border-slate-200 px-1 py-1 dark:border-slate-700">
                <input className="h-7 w-full min-w-0 rounded border border-slate-200 px-2 text-[11px] font-normal text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="Contains..." value={columnFilters[col.key] || ""} onChange={(e) => setColumnFilters((previous) => ({ ...previous, [col.key]: e.target.value }))} />
              </th>)}</tr>
            </thead>
            <tbody>
              {!visibleRows.length && <tr><td colSpan={COLUMNS.length} className="py-20 text-center text-sm text-slate-500">{generated ? "No overtime records match the selected filters." : "No records loaded. Select a cut-off range, then click Generate."}</td></tr>}
              {groups.map((group, groupIndex) => <Fragment key={`group-${groupIndex}`}><tr className={groupBy ? "bg-slate-100 font-semibold text-blue-900 dark:bg-slate-800 dark:text-blue-200" : "hidden"}><td colSpan={COLUMNS.length} className="px-3 py-2">{COLUMNS.find((col) => col.key === groupBy)?.label}: {group.label} ({group.data.length}) · OT Hrs. {money(group.data.reduce((sum, r) => sum + r.otHours, 0))} · Amount {money(group.data.reduce((sum, r) => sum + r.otAmount, 0))}</td></tr>
                {group.data.map((row) => <tr key={row.id} className="even:bg-slate-50 hover:bg-blue-50 dark:even:bg-slate-900 dark:hover:bg-blue-950">{COLUMNS.map((col) => <td key={col.key} className={`border-b border-r border-slate-100 px-2 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-200 ${col.numeric ? "text-right tabular-nums" : "text-left"}`}>{displayCell(row, col)}</td>)}</tr>)}
              </Fragment>)}
            </tbody>
            {visibleRows.length > 0 && <tfoot className="bg-blue-50 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100"><tr>{COLUMNS.map((col, index) => <td key={col.key} className={`border-t border-blue-200 px-2 py-2 ${col.numeric ? "text-right" : ""}`}>{index === 0 ? "TOTAL" : col.key === "otHours" ? money(totals.hours) : col.key === "otAmount" ? money(totals.amount) : ""}</td>)}</tr></tfoot>}
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-8 gap-y-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
          <span>Employees: <strong className="text-slate-900 dark:text-white">{totals.employees.size}</strong></span>
          <span>Total OT Hrs.: <strong className="text-slate-900 dark:text-white">{money(totals.hours)}</strong></span>
          <span>Total OT Amount: <strong className="text-slate-900 dark:text-white">{money(totals.amount)}</strong></span>
        </div>
      </section>

      <SearchCutoffRef isOpen={lookup === "beginning"} payFrequency={filters.payFrequency} onClose={(selected) => onCutoffSelected("beginning", selected)} />
      <SearchCutoffRef isOpen={lookup === "ending"} payFrequency={filters.payFrequency} onClose={(selected) => onCutoffSelected("ending", selected)} />
      <SearchEmployeeRef isOpen={lookup === "employee"} onClose={(selected) => { if (selected) updateFilters({ employeeNo: String(read(selected, "empNo", "emp_no", "EMP_NO")), employeeName: "" }); setLookup(""); }} />
      <SearchOvertimeRef isOpen={lookup === "ot"} onClose={(selected) => { if (selected) updateFilters({ otCode: String(read(selected, "code", "otCode")), otName: String(read(selected, "description", "otName")) }); setLookup(""); }} />
    </div>
  );
};

export default PayrollOvertimeLedger;
