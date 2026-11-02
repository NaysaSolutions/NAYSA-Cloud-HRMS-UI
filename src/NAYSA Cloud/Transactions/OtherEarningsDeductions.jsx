/* eslint-disable react-hooks/rules-of-hooks */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClone,
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
  faUsers,
  faUserPlus,
  faCalculator,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput, {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchRefED from "@/NAYSA Cloud/Lookup/SearchRefED.jsx";
import SearchSystemGeneratedEmployeeSelection from "@/NAYSA Cloud/Lookup/SearchSystemGeneratedEmployeeSelection.jsx";
import SearchCutoffRef from "@/NAYSA Cloud/Lookup/SearchRefPayrollPeriod.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import DocumentSignatories from "@/NAYSA Cloud/Lookup/SearchSignatory.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report.js";
import {
  useSwalErrorAlertAPI,
  useSwalInfoAlert,
  useSwalProceedConfirm,
  useSwalSuccessAlert,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";

// Use the shared compact information toast for all OED field validations.
// The global useSwalValidationAlert displays a centered modal instead.
const showOEDValidationAlert = ({ title = "Validation", message = "" }) =>
  useSwalInfoAlert(title, message);

// FRONTEND API CONTRACT (Laravel controller / SQL procedure are NOT included here):
// GET  /otherEarningsDeductions/selectionReferences
//      result: { edCodes: [{ edCode, edName, edType, active, code }] }
// POST /otherEarningsDeductions/selectionEmployees
//      jsonData: { payFrequency, cutoffCode, groupCode, branchCode, clientCode,
//                  deptCode, statCode, posCode, search }
//      result: [{ empNo, empName, dailyRate, hourRate, groupCode, branchCode,
//                 clientCode, deptCode, posCode, statCode, ... }]
// POST /otherEarningsDeductions/get       jsonData: { oedId } or { oedNo }
// POST /otherEarningsDeductions/navigate  jsonData: { oedNo, direction, branchCode }
// POST /otherEarningsDeductions/save      jsonData: { header fields, rows: [...] }
// POST /otherEarningsDeductions/post, /cancel
// POST /otherEarningsDeductions/history
// Responses follow Overtime.jsx's data.data[0].result envelope.
// Register docType "OED" with Header/report/history infrastructure as needed.

// OED history configuration: avoids requesting HS column-config rows that are not yet registered.
// Keys match the JSON fields returned by sproc_PHP_Tran_OtherEarningsDeductions/History.
const OED_HISTORY_COLUMN_CONFIGS = {
  OED_Summary: [
    { key: "docNo", label: "Transaction No.", renderType: "text" },
    { key: "oedDate", label: "Transaction Date", renderType: "date" },
    { key: "cutoffCode", label: "Payroll Cut-Off", renderType: "text" },
    { key: "cutoffName", label: "Cut-Off Description", renderType: "text" },
    { key: "cutoffFrequency", label: "Frequency", renderType: "text" },
    { key: "edType", label: "Category", renderType: "text" },
    { key: "tranType", label: "Tran. Type", renderType: "text" },
    { key: "employeeCount", label: "Employees", renderType: "number", roundingOff: 0, classNames: "text-right" },
    { key: "detailCount", label: "Details", renderType: "number", roundingOff: 0, classNames: "text-right" },
    { key: "totalAmount", label: "Total Amount", renderType: "currency", roundingOff: 2, classNames: "text-right" },
    { key: "docStatus", label: "Status", renderType: "text" },
    { key: "remarks", label: "Remarks", renderType: "text" },
  ],
  OED_Details: [
    { key: "docNo", label: "Transaction No.", renderType: "text" },
    { key: "oedDate", label: "Transaction Date", renderType: "date" },
    { key: "employeeNo", label: "Employee No.", renderType: "text" },
    { key: "employeeName", label: "Employee Name", renderType: "text" },
    { key: "edCode", label: "ED Code", renderType: "text" },
    { key: "edDescription", label: "ED Description", renderType: "text" },
    { key: "edType", label: "Category", renderType: "text" },
    { key: "oedDays", label: "Days", renderType: "number", roundingOff: 2, classNames: "text-right" },
    { key: "oedHrs", label: "Hours", renderType: "number", roundingOff: 2, classNames: "text-right" },
    { key: "oedMins", label: "Minutes", renderType: "number", roundingOff: 0, classNames: "text-right" },
    { key: "oedRate", label: "Rate", renderType: "number", roundingOff: 2, classNames: "text-right" },
    { key: "amount", label: "Amount", renderType: "currency", roundingOff: 2, classNames: "text-right" },
    { key: "referenceNo", label: "Reference", renderType: "text" },
    { key: "branchCode", label: "Branch", renderType: "text" },
    { key: "payGroup", label: "Pay Group", renderType: "text" },
    { key: "deptCode", label: "Department", renderType: "text" },
    { key: "startDate", label: "Start Date", renderType: "date" },
    { key: "endDate", label: "End Date", renderType: "date" },
    { key: "payregFlag", label: "Payreg Flag", renderType: "text" },
    { key: "docStatus", label: "Status", renderType: "text" },
    { key: "remarks", label: "Remarks", renderType: "text" },
  ],
};

const apiRoot = "/otherEarningsDeductions";
const docType = "OED";
const dateToday = () => {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => dateParts.find((part) => part.type === type)?.value || "";
  return `${get("month")}/${get("day")}/${get("year")}`;
};
const today = dateToday();
const toDisplayDate = (value) => {
  if (!value) return "";
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(value))
    ? String(value) : formatDateToMMDDYYYY(value);
};
const makeGroupId = () => globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const num = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const fmt = (value, digits = 2) => num(value).toLocaleString("en-PH", {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const raw = (obj, ...keys) => keys.map((key) => obj?.[key]).find((value) => value !== undefined && value !== null);
const textValue = (obj, ...keys) => String(raw(obj, ...keys) ?? "");
const getCutoffType = (value) => {
  const type = String(value ?? "").toUpperCase();
  if (type.startsWith("S")) return "S";
  if (type.startsWith("M")) return "M";
  if (type.startsWith("W") || type.startsWith("D")) return "W";
  return "";
};
const parseResult = (response, fallback = []) => {
  const envelope = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (envelope === undefined || envelope === null) return fallback;
  if (typeof envelope !== "string") return envelope;
  try { return JSON.parse(envelope); } catch { return fallback; }
};
const messageFromError = (error) =>
  Object.values(error?.response?.data?.errors || {}).flat()[0] ||
  error?.response?.data?.message || error?.message || "An unexpected error occurred.";
const assertSuccess = (response) => {
  const result = response?.data?.data?.[0] || {};
  if (num(result.errorCount ?? result.errorcount) > 0) {
    throw new Error(result.errorMsg || result.errormsg || "Transaction was not processed.");
  }
  return result;
};
const initialHeader = {
  oedId: "", oedNo: "", oedDate: today,
  cutoffType: "", cutoffFrequency: "", cutoffCode: "", cutoffName: "",
  cutoffStartDate: today, cutoffEndDate: today,
  tranType: "Regular", edType: "EARN", branchCode: "",
  remarks: "", refOt: "", refLv: "", refTs: "", genCode: "",
  documentStatus: "D",
};
const createInitialHeader = (companyInfo) => ({
  ...initialHeader,
  cutoffType: getCutoffType(companyInfo?.cutoffType),
});

const normalizeEd = (item) => ({
  edCode: textValue(item, "edCode", "ED_CODE", "codeValue", "value"),
  edName: textValue(item, "edName", "ED_NAME", "description", "label"),
  edType: textValue(item, "edType", "ED_TYPE").toUpperCase(),
  code: textValue(item, "code", "CODE"),
  active: textValue(item, "active", "ACTIVE") || "Y",
});
const normalizeEmployee = (employee) => ({
  empNo: textValue(employee, "empNo", "EMP_NO", "employeeNo"),
  empName: textValue(employee, "empName", "EMP_NAME", "employeeName"),
  dailyRate: num(raw(employee, "dailyRate", "DAILY_RATE")),
  hourRate: num(raw(employee, "hourRate", "HOUR_RATE")),
  allowRate: num(raw(employee, "allowRate", "ALLOW_RATE")),
  groupCode: textValue(employee, "groupCode", "GROUP_CODE", "payGroup"),
  branchCode: textValue(employee, "branchCode", "BRANCH_CODE"),
  clientCode: textValue(employee, "clientCode", "CLIENT_CODE"),
  deptCode: textValue(employee, "deptCode", "DEPT_CODE", "departmentCode"),
  posCode: textValue(employee, "posCode", "POS_CODE"),
  statCode: textValue(employee, "statCode", "STAT_CODE", "employeeStatus"),
  compCode: textValue(employee, "compCode", "COMP_CODE"),
  sgCode: textValue(employee, "sgCode", "SG_CODE"),
  shiftCode: textValue(employee, "shiftCode", "SHIFT_CODE"),
  regDaysMonth: num(raw(employee, "regDaysMonth", "REGDAYS_MONTH")),
  payFrequency: textValue(employee, "payFrequency", "PAY_FREQUENCY", "payFreq"),
});
const createRow = (header, employee = {}, ed = {}) => ({
  groupId: makeGroupId(), lineNo: 0,
  empNo: employee.empNo || "", empName: employee.empName || "",
  refCode: ed.code || "", edCode: ed.edCode || "", edName: ed.edName || "",
  edType: ed.edType || header.edType,
  date: header.oedDate,
  startDate: header.cutoffStartDate, endDate: header.cutoffEndDate,
  oedDays: "0.00", oedHrs: "0.00", oedMins: "0.00", oedRate: "0.00",
  amount: "0.00", dailyRate: employee.dailyRate || 0,
  hourRate: employee.hourRate || 0, allowRate: employee.allowRate || 0,
  projAllow: 0, regDaysMonth: employee.regDaysMonth || 0,
  compCode: employee.compCode || "", branchCode: employee.branchCode || header.branchCode || "",
  clientCode: employee.clientCode || "", groupCode: employee.groupCode || "",
  deptCode: employee.deptCode || "", posCode: employee.posCode || "",
  statCode: employee.statCode || "", sgCode: employee.sgCode || "",
  shiftCode: employee.shiftCode || "", genCode: "", status: "",
  refTs: "", refOt: "", refLv: "", refNo: "", refDate: header.oedDate,
  remarks: "", tranType: header.tranType, payregFlag: "Y",
});
const normalizeRow = (row, header) => {
  const source = {
    ...row,
    groupId: textValue(row, "groupId", "GROUP_ID") || makeGroupId(),
    empNo: textValue(row, "empNo", "EMP_NO"),
    empName: textValue(row, "empName", "EMP_NAME"),
    edCode: textValue(row, "edCode", "ED_CODE"),
    edName: textValue(row, "edName", "ED_NAME"),
    edType: textValue(row, "edType", "ED_TYPE") || header.edType,
    refCode: textValue(row, "refCode", "REF_CODE"),
    oedDays: fmt(raw(row, "oedDays", "OED_DAYS")),
    oedHrs: fmt(raw(row, "oedHrs", "OED_HRS")),
    oedMins: fmt(raw(row, "oedMins", "OED_MINS")),
    oedRate: fmt(raw(row, "oedRate", "OED_RATE")),
    amount: fmt(raw(row, "amount", "AMOUNT")),
    dailyRate: num(raw(row, "dailyRate", "DAILY_RATE")),
    hourRate: num(raw(row, "hourRate", "HOUR_RATE")),
    allowRate: num(raw(row, "allowRate", "ALLOW_RATE")),
    projAllow: num(raw(row, "projAllow", "PROJ_ALLOW")),
    regDaysMonth: num(raw(row, "regDaysMonth", "REGDAYS_MONTH")),
    compCode: textValue(row, "compCode", "COMP_CODE"),
    branchCode: textValue(row, "branchCode", "BRANCH_CODE"),
    clientCode: textValue(row, "clientCode", "CLIENT_CODE"),
    groupCode: textValue(row, "groupCode", "GROUP_CODE", "payGroup"),
    deptCode: textValue(row, "deptCode", "DEPT_CODE", "departmentCode"),
    posCode: textValue(row, "posCode", "POS_CODE"),
    statCode: textValue(row, "statCode", "STAT_CODE"),
    sgCode: textValue(row, "sgCode", "SG_CODE"),
    shiftCode: textValue(row, "shiftCode", "SHIFT_CODE"),
    genCode: textValue(row, "genCode", "GEN_CODE"),
    status: textValue(row, "status", "STATUS"),
    refTs: textValue(row, "refTs", "REF_TS"),
    refOt: textValue(row, "refOt", "REF_OT"),
    refLv: textValue(row, "refLv", "REF_LV"),
    refNo: textValue(row, "refNo", "REF_NO"),
    remarks: textValue(row, "remarks", "REMARKS"),
    tranType: textValue(row, "tranType", "TRAN_TYPE") || header.tranType,
    payregFlag: textValue(row, "payregFlag", "PAYREG_FLAG") || "Y",
  };
  return {
    ...source,
    date: toDisplayDate(raw(row, "date", "DATE") || header.oedDate),
    startDate: toDisplayDate(raw(row, "startDate", "START_DATE") || header.cutoffStartDate),
    endDate: toDisplayDate(raw(row, "endDate", "END_DATE") || header.cutoffEndDate),
    refDate: toDisplayDate(raw(row, "refDate", "REF_DATE") || header.oedDate),
  };
};
// A rate is an amount per day OR per hour (not a percentage). If neither unit
// is supplied, AMOUNT is manually encoded; if both are supplied, do not guess.
const calculateAmount = (row) => {
  const days = num(row.oedDays);
  const hours = num(row.oedHrs) + num(row.oedMins) / 60;
  if (days > 0 && hours > 0) return null;
  if (days > 0) return round(days * num(row.oedRate));
  if (hours > 0) return round(hours * num(row.oedRate));
  return null;
};
const inputIsValid = (value) => /^\d*(\.\d{0,4})?$/.test(String(value).replace(/,/g, ""));
const tableColumns = [
  ["ln", "LN", 58], ["empNo", "Emp No.", 115],
  ["empName", "Employee Name", 195], ["edCode", "Code", 105],
  ["edName", "Description", 190], ["oedDays", "Days", 85],
  ["oedHrs", "Hrs.", 85], ["oedMins", "Mins.", 75],
  ["oedRate", "Rate", 110], ["refNo", "Reference", 125],
  ["amount", "Amount", 120], ["payregFlag", "Payreg Flag", 95],
  ["groupCode", "Pay Group", 95], ["branchCode", "Branch", 95],
  ["deptCode", "Dept.", 95], ["remarks", "Remarks", 185],
];
const extraColumns = [
  ["startDate", "Start Date", 125], ["endDate", "End Date", 125],
  ["refDate", "Ref. Date", 125], ["clientCode", "Client", 100],
  ["posCode", "Position", 95],
];
const stickyFields = new Set(["ln", "empNo", "empName", "edCode", "edName"]);


const emptyFilters = {
  groupCode: "", branchCode: "", clientCode: "", deptCode: "",
  statCode: "", posCode: "", search: "",
};
function EmployeeBulkPicker({ open, payFrequency, cutoffCode, onClose }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [employees, setEmployees] = useState([]);
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!open) { setEmployees([]); setChecked({}); setFilters(emptyFilters); setLoadError(""); }
  }, [open]);
  const search = async () => {
    setBusy(true); setLoadError("");
    try {
      const response = await apiClient.post(`${apiRoot}/selectionEmployees`, {
        jsonData: { ...filters, payFrequency, cutoffCode },
      });
      assertSuccess(response);
      const result = parseResult(response, []);
      const list = Array.isArray(result) ? result : result?.employees || result?.rows || [];
      setEmployees(list.map(normalizeEmployee).filter((item) => item.empNo));
      setChecked({});
    } catch (error) {
      setLoadError(messageFromError(error));
      setEmployees([]);
    } finally { setBusy(false); }
  };
  if (!open) return null;
  const selected = employees.filter((employee) => checked[employee.empNo]);
  const allChecked = employees.length > 0 && selected.length === employees.length;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Select multiple employees">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Select Multiple Employees</h2>
          <button type="button" onClick={() => onClose(null)} className="rounded px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">Close</button>
        </div>
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["groupCode", "Payroll Group"], ["branchCode", "Branch"],
            ["clientCode", "Client"], ["deptCode", "Department"],
            ["statCode", "Employee Status"], ["posCode", "Position"],
            ["search", "Employee No. / Name"],
          ].map(([key, label]) => (
            <label key={key} className="text-xs text-slate-600 dark:text-slate-300">
              {label}
              <input className="mt-1 w-full rounded border border-slate-300 p-2 text-sm dark:bg-slate-800" value={filters[key]}
                onChange={(event) => setFilters((previous) => ({ ...previous, [key]: event.target.value }))}
                onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder={`Filter ${label.toLowerCase()}`} />
            </label>
          ))}
          <div className="flex items-end">
            <button type="button" disabled={busy} onClick={search} className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Searching..." : "Load Employees"}</button>
          </div>
        </div>
        {loadError && <p className="mb-2 text-sm text-red-600">{loadError}</p>}
        <div className="min-h-32 flex-1 overflow-auto rounded border dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>
              <th className="p-2"><input type="checkbox" aria-label="Select all employees" checked={allChecked} onChange={(event) =>
                setChecked(Object.fromEntries(employees.map((employee) => [employee.empNo, event.target.checked])))} /></th>
              {[
                "Emp No.", "Employee Name", "Pay Group", "Branch", "Client", "Dept.", "Status", "Position",
              ].map((label) => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}
            </tr></thead>
            <tbody>
              {employees.map((employee) => <tr key={employee.empNo} className="border-t dark:border-slate-700">
                <td className="p-2"><input type="checkbox" checked={!!checked[employee.empNo]} onChange={(event) =>
                  setChecked((prev) => ({ ...prev, [employee.empNo]: event.target.checked }))} /></td>
                {["empNo", "empName", "groupCode", "branchCode", "clientCode", "deptCode", "statCode", "posCode"].map((key) =>
                  <td key={key} className="whitespace-nowrap p-2">{employee[key]}</td>)}
              </tr>)}
              {!employees.length && <tr><td className="p-5 text-center text-slate-500" colSpan={9}>Select filters and click Load Employees.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
          <span>{selected.length} employee(s) selected</span>
          <button type="button" disabled={!selected.length} onClick={() => onClose(selected)} className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50">Add Selected Employees</button>
        </div>
      </div>
    </div>
  );
}

const OtherEarningsDeductions = () => {
  const { user, companyInfo, refsLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [historyClient] = useState(() => new QueryClient({
    queryCache: queryClient.getQueryCache(), defaultOptions: queryClient.getDefaultOptions(),
  }));
  const inputs = useRef({});
  const [topTab, setTopTab] = useState("details");
  const [header, setHeader] = useState(() => createInitialHeader(companyInfo));
  const [rows, setRows] = useState([]);
  const [enableCopyFunction, setEnableCopyFunction] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lookup, setLookup] = useState({ type: "", index: null });
  const [selectedEd, setSelectedEd] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSignatory, setShowSignatory] = useState(false);
  const [showDocNoLookup, setShowDocNoLookup] = useState(false);
  const snapshotRef = useRef(null);
  const [noReprints, setNoReprints] = useState(0);
  const [apply, setApply] = useState({
    oedDays: "0.00", oedHrs: "0.00", oedRate: "0.00", amount: "0.00",
  });
  const [widths, setWidths] = useState(() => Object.fromEntries(
    [...tableColumns, ...extraColumns, ["actions", "Actions", 112]].map(([key, , width]) => [key, width]),
  ));
  const shownColumns = [...tableColumns, ...extraColumns];
  const isReadOnly = !["D", "OPEN", "O", ""].includes(String(header.documentStatus || "D").toUpperCase());
  const status = ["F", "FINALIZED", "POSTED"].includes(String(header.documentStatus).toUpperCase())
    ? "FINALIZED" : ["X", "CANCELLED"].includes(String(header.documentStatus).toUpperCase()) ? "CANCELLED" : "OPEN";
  const statusColor = status === "FINALIZED" ? "global-tran-stat-text-finalized-ui"
    : status === "CANCELLED" ? "global-tran-stat-text-closed-ui" : "global-tran-stat-text-open-ui";
  const updateHeader = (values) => setHeader((old) => ({ ...old, ...values }));
  const updateRow = (index, values) => setRows((old) => old.map((item, i) => i === index ? ({ ...item, ...values }) : item));
  const reset = () => {
    const emptyHeader = createInitialHeader(companyInfo);
    snapshotRef.current = JSON.stringify({ header: emptyHeader, rows: [] });
    setHeader(emptyHeader); setRows([]); setSelectedEd(null);
    setShowDocNoLookup(false);
    setNoReprints(0); setTopTab("details");
    setApply({ oedDays: "0.00", oedHrs: "0.00", oedRate: "0.00", amount: "0.00" });
  };

  useEffect(() => {
    if (!refsLoaded || !companyInfo) return;
    setHeader((old) => old.oedId || old.oedNo ? old : ({
      ...old, cutoffType: old.cutoffType || getCutoffType(companyInfo.cutoffType),
    }));
  }, [companyInfo, refsLoaded]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiClient.get(`${apiRoot}/selectionReferences`);
        assertSuccess(response);
        const record = parseResult(response, {});
        const items = Array.isArray(record) ? record : record?.edCodes || record?.earningsDeductions || [];
        if (active) { setCatalog(items.map(normalizeEd)); setCatalogError(""); }
      } catch (error) {
        if (active) setCatalogError(messageFromError(error));
      }
    })();
    return () => { active = false; };
  }, []);

  const selectEd = (ed, index = null) => {
    if (!ed) return;
    if (index === null) setSelectedEd(ed);
    else updateRow(index, { edCode: ed.edCode, edName: ed.edName, edType: ed.edType, refCode: ed.code });
  };
  const addBlankRow = (index = null) => {
    if (isReadOnly) return;
    const value = createRow(header, {}, selectedEd || {});
    setRows((old) => {
      const next = [...old];
      next.splice(index === null ? next.length : index + 1, 0, value);
      return next;
    });
  };
  const copyDetailRow = (index) => {
    if (isReadOnly || !enableCopyFunction) return;
    setRows((current) => {
      const source = current[index];
      if (!source) return current;
      const copied = {
        ...source,
        groupId: makeGroupId(),
        lineNo: 0,
      };
      const next = [...current];
      next.splice(index + 1, 0, copied);
      return next;
    });
  };
  const addEmployees = (employees) => {
    if (!selectedEd) {
      showOEDValidationAlert({ title: "Earning / Deduction Required", message: "Select an Earning / Deduction Code first." });
      return;
    }
    setRows((old) => {
      const keys = new Set(old.map((row) => `${row.empNo}\u0000${row.edCode}`));
      const additions = [];
      employees.forEach((employee) => {
        const key = `${employee.empNo}\u0000${selectedEd.edCode}`;
        if (keys.has(key)) return;
        keys.add(key);
        additions.push(createRow(header, employee, selectedEd));
      });
      return [...old, ...additions];
    });
  };
  // System Generated multi-selection returns both employees and REF_ED codes.
  // Preserve current rows, match the selected header category and avoid duplicate
  // employee/code pairs (the same behavior used by Add / Generate).
  const addSystemGeneratedSelection = (selection) => {
    if (!selection || isReadOnly) return;

    const employees = (selection.employees || [])
      .map(normalizeEmployee)
      .filter((employee) => employee.empNo);
    const requestedCodes = [...new Set((selection.edCodes || [])
      .map((item) => textValue(item, "code", "edCode", "ED_CODE", "value").trim())
      .filter(Boolean))];

    if (!employees.length || !requestedCodes.length) {
      return showOEDValidationAlert({
        title: "Selection Required",
        message: "Select at least one employee and one earnings/deductions code.",
      });
    }

    const codes = requestedCodes.map((code) =>
      catalog.find((item) => item.edCode.toUpperCase() === code.toUpperCase()),
    );
    const invalidCodes = requestedCodes.filter((code, i) =>
      !codes[i] || codes[i].edType !== header.edType ||
      !["Y", "1", "TRUE", "A"].includes(codes[i].active.toUpperCase()),
    );
    if (invalidCodes.length) {
      return showOEDValidationAlert({
        title: "Invalid Earning / Deduction Code",
        message: `The selected codes are unavailable or do not match the ${header.edType === "EARN" ? "Earnings" : "Deductions"} category: ${invalidCodes.join(", ")}.`,
      });
    }

    setRows((current) => {
      const keys = new Set(current.filter((row) => row.empNo && row.edCode)
        .map((row) => `${row.empNo.toUpperCase()}\u0000${row.edCode.toUpperCase()}`));
      const additions = [];
      for (const employee of employees) {
        for (const ed of codes) {
          const key = `${employee.empNo.toUpperCase()}\u0000${ed.edCode.toUpperCase()}`;
          if (keys.has(key)) continue;
          keys.add(key);
          additions.push(createRow(header, employee, ed));
        }
      }
      return additions.length ? [...current, ...additions] : current;
    });
  };
  const generate = () => {
    if (!selectedEd) return showOEDValidationAlert({ title: "Code Required", message: "Select an Earning / Deduction Code from REF_ED." });
    if (!header.cutoffCode) return showOEDValidationAlert({ title: "Payroll Cut-Off Required", message: "Select a Payroll Cut-Off before generating details." });
    if (!rows.some((row) => row.empNo)) return setLookup({ type: "employees", index: null });
    const employees = [...new Map(rows.filter((row) => row.empNo).map((row) => [row.empNo, row])).values()];
    addEmployees(employees);
  };
  const total = useMemo(() => rows.reduce((s, row) => s + num(row.amount), 0), [rows]);

  const validate = () => {
    if (!header.oedDate || !header.cutoffType || !header.cutoffCode || !header.cutoffFrequency)
      return "Complete Transaction Date, Pay Frequency and Payroll Cut-Off.";
    if (!header.cutoffStartDate || !header.cutoffEndDate) return "Payroll Cut-Off dates are required.";
    if (formatDateToYYYYMMDD(header.cutoffEndDate) < formatDateToYYYYMMDD(header.cutoffStartDate))
      return "Payroll Cut-Off End Date cannot precede Start Date.";
    if (!rows.length) return "Add at least one employee detail.";
    const duplicates = new Set();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.empNo || !row.edCode) return `Row ${i + 1}: Employee and Earning / Deduction Code are required.`;
      if (row.edType !== header.edType) return `Row ${i + 1}: Code type must match the selected Earning / Deduction category.`;
      if (!row.startDate || !row.endDate || formatDateToYYYYMMDD(row.endDate) < formatDateToYYYYMMDD(row.startDate))
        return `Row ${i + 1}: Enter a valid date range.`;
      for (const key of ["oedDays", "oedHrs", "oedMins", "oedRate", "amount"]) {
        if (!Number.isFinite(Number(String(row[key] ?? "").replace(/,/g, ""))) || num(row[key]) < 0)
          return `Row ${i + 1}: ${key} must be a valid nonnegative number.`;
      }
      if (!Number.isInteger(num(row.oedMins)) || num(row.oedMins) >= 60)
        return `Row ${i + 1}: Minutes must be a whole number between 0 and 59.`;
      if (num(row.oedDays) > 0 && (num(row.oedHrs) > 0 || num(row.oedMins) > 0))
        return `Row ${i + 1}: Enter Days or Hours / Minutes, not both. This avoids an ambiguous calculation.`;
      const unique = [row.empNo, row.edCode, row.refNo || "", row.startDate, row.endDate].join("|");
      if (duplicates.has(unique)) return `Row ${i + 1}: Duplicate employee, code, reference and date range.`;
      duplicates.add(unique);
    }
    return "";
  };

  const toPayload = () => ({
    ...header,
    oedDate: formatDateToYYYYMMDD(header.oedDate),
    cutoffStartDate: formatDateToYYYYMMDD(header.cutoffStartDate),
    cutoffEndDate: formatDateToYYYYMMDD(header.cutoffEndDate),
    userCode: user?.USER_CODE || "ADMIN",
    rows: rows.map((row, index) => ({
      ...row,
      lineNo: index + 1,
      oedDate: formatDateToYYYYMMDD(header.oedDate),
      cutoffFrequency: header.cutoffFrequency,
      cutoffCode: header.cutoffCode,
      date: formatDateToYYYYMMDD(row.date || header.oedDate),
      startDate: formatDateToYYYYMMDD(row.startDate),
      endDate: formatDateToYYYYMMDD(row.endDate),
      refDate: formatDateToYYYYMMDD(row.refDate || header.oedDate),
      oedDays: num(row.oedDays), oedHrs: num(row.oedHrs),
      oedMins: num(row.oedMins), oedRate: num(row.oedRate),
      amount: num(row.amount), dailyRate: num(row.dailyRate),
      hourRate: num(row.hourRate), allowRate: num(row.allowRate),
      projAllow: num(row.projAllow), regDaysMonth: num(row.regDaysMonth),
      tranType: header.tranType,
    })),
  });

  const applyLoaded = (record) => {
    const next = {
      ...createInitialHeader(companyInfo), ...record,
      oedId: textValue(record, "oedId", "OED_ID"),
      oedNo: textValue(record, "oedNo", "OED_NO"),
      oedDate: toDisplayDate(raw(record, "oedDate", "OED_DATE") || today),
      cutoffFrequency: textValue(record, "cutoffFrequency", "CUTOFF_FREQ"),
      cutoffCode: textValue(record, "cutoffCode", "CUTOFF_CODE"),
      cutoffName: textValue(record, "cutoffName", "CUTOFF_NAME"),
      cutoffStartDate: toDisplayDate(raw(record, "cutoffStartDate", "CUTOFF_STARTDATE") || today),
      cutoffEndDate: toDisplayDate(raw(record, "cutoffEndDate", "CUTOFF_ENDDATE") || today),
      edType: textValue(record, "edType", "ED_TYPE") || "EARN",
      tranType: textValue(record, "tranType", "TRAN_TYPE") || "Regular",
      documentStatus: textValue(record, "documentStatus", "DOC_STATUS") || "D",
      remarks: textValue(record, "remarks", "REMARKS"),
    };
    next.cutoffType = getCutoffType(raw(record, "cutoffType", "CUTOFF_TYPE") || next.cutoffFrequency);
    const loadedRows = (record?.rows || record?.details || []).map((row) => normalizeRow(row, next));
    snapshotRef.current = JSON.stringify({ header: next, rows: loadedRows });
    setHeader(next);
    setRows(loadedRows);
    setSelectedEd(null);
    setTopTab("details");
  };
  const saveMutation = useMutation({
    mutationFn: () => apiClient.post(`${apiRoot}/save`, { jsonData: toPayload() }),
    onSuccess: async (response) => {
      try {
        const result = assertSuccess(response);
        const id = result.oedId ?? result.OED_ID ?? header.oedId;
        const number = result.oedNo ?? result.OED_NO ?? header.oedNo;
        if (id || number) {
          const record = parseResult(await apiClient.post(`${apiRoot}/get`, {
            jsonData: id ? { oedId: id } : { oedNo: number },
          }), {});
          if (record && (record.oedId || record.oedNo || record.OED_ID || record.OED_NO)) applyLoaded(record);
          else updateHeader({ oedId: id, oedNo: number });
        }
        useSwalshowSaveSuccessDialog(reset, () => setShowSignatory(true), () => {});
      } catch (error) { useSwalErrorAlertAPI("OED Save Error", error); }
    },
    onError: (error) => useSwalErrorAlertAPI("OED Save Error", error),
  });
  const actionMutation = useMutation({
    mutationFn: ({ mode, password = "", reason = "" }) => apiClient.post(`${apiRoot}/${mode}`, {
      userCode: user?.USER_CODE || "ADMIN", userPassword: password,
      jsonData: { oedId: header.oedId, oedNo: header.oedNo, userCode: user?.USER_CODE || "ADMIN", remarks: reason },
    }),
    onSuccess: (response, { mode }) => {
      try {
        const result = assertSuccess(response);
        updateHeader({ documentStatus: mode === "post" ? "F" : "X" });
        setShowCancel(false);
        useSwalSuccessAlert(mode === "post" ? "OED Posted" : "OED Cancelled", result.message || (mode === "post" ? "The transaction was successfully posted." : "The transaction was cancelled."));
      } catch (error) { useSwalErrorAlertAPI("OED Transaction Error", error); }
    },
    onError: (error) => useSwalErrorAlertAPI("Transaction Error", error),
  });
  const save = () => {
    const error = validate();
    if (error) return showOEDValidationAlert({ title: "OED Validation", message: error });
    saveMutation.mutate();
  };
  const loadTransaction = async (selected) => {
    const oedNo = selected?.docNo || selected?.oedNo || "";
    const oedId = selected?.oedId || "";
    if (!oedNo && !oedId) return showOEDValidationAlert({ title: "Transaction No. Required", message: "Select a transaction to retrieve." });
    setIsLoading(true);
    try {
      const response = await apiClient.post(`${apiRoot}/get`, { jsonData: oedId ? { oedId } : { oedNo } });
      assertSuccess(response);
      const record = parseResult(response, {});
      if (!record || !(record.oedId || record.oedNo || record.OED_ID || record.OED_NO))
        return useSwalInfoAlert("OED Retrieval", "The selected transaction was not found.");
      applyLoaded(record);
    } catch (error) { useSwalErrorAlertAPI("Load Error", error); }
    finally { setIsLoading(false); }
  };
  const busy = isLoading || saveMutation.isPending || actionMutation.isPending;

  // F1 document lookup — same SearchDocNo interface as PO. The existing
  // DOC_SIGN function cannot navigate OED unless OED is registered there.
  // The Navigate stored-procedure mode uses TRN_OED_HD as its source instead.
  const openDocNoLookup = () => {
    if (topTab !== "details" || busy || showDocNoLookup || showCancel || showAttach || showSignatory || lookup.type) return;
    setShowDocNoLookup(true);
  };

  useEffect(() => {
    const onF1 = (event) => {
      if (event.key !== "F1" || event.altKey || event.ctrlKey || event.metaKey) return;
      if (topTab !== "details" || showDocNoLookup || showCancel || showAttach || showSignatory || lookup.type) return;
      event.preventDefault();
      if (!busy) setShowDocNoLookup(true);
    };
    window.addEventListener("keydown", onF1);
    return () => window.removeEventListener("keydown", onF1);
  }, [busy, lookup.type, showAttach, showCancel, showDocNoLookup, showSignatory, topTab]);

  const normalizeLookupNo = (value) => {
    const text = String(value || "").trim().toUpperCase();
    if (/^\d{1,8}$/.test(text)) return `OED${text.padStart(8, "0")}`;
    const match = /^OED(\d{1,8})$/.exec(text);
    return match ? `OED${match[1].padStart(8, "0")}` : text;
  };

  const retrieveOedFromLookup = async ({ docNo = "", key = "", direction = "", modalClose = false } = {}) => {
    if (busy) return;
    const navigation = String(key || direction || "").trim().toUpperCase();
    const requestedNo = normalizeLookupNo(docNo || (navigation ? header.oedNo : ""));
    // Warn before replacing an edited or an unsaved entry. Initial records
    // are only treated as changed when they contain detail rows.
    const hasUncommittedDetails = rows.length > 0 &&
      (!snapshotRef.current || snapshotRef.current !== JSON.stringify({ header, rows }));
    if (hasUncommittedDetails) {
      const confirm = await useSwalProceedConfirm(
        "Discard Unsaved Changes?",
        "Retrieving another OED transaction will replace your unsaved details. Continue?",
        "Continue", "Stay",
      );
      if (!confirm?.isConfirmed) return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post(`${apiRoot}/navigate`, {
        jsonData: {
          oedNo: requestedNo || null,
          direction: navigation || (requestedNo ? "" : "F"),
          branchCode: header.branchCode || null,
        },
      });
      assertSuccess(response);
      const destination = parseResult(response, {});
      if (!destination?.oedId && !destination?.oedNo) {
        useSwalInfoAlert("OED Retrieval", navigation ? "No further transaction was found." : "Transaction No. was not found.");
        return;
      }
      const fetched = await apiClient.post(`${apiRoot}/get`, {
        jsonData: destination.oedId ? { oedId: destination.oedId } : { oedNo: destination.oedNo },
      });
      assertSuccess(fetched);
      const record = parseResult(fetched, {});
      if (!record?.oedId && !record?.oedNo) throw new Error("The selected transaction could not be loaded.");
      applyLoaded(record);
      // SearchDocNo: navigation buttons pass modalClose=true to keep it open.
      // Manual retrieval (Enter/F5) passes false, so close on success.
      if (!modalClose) setShowDocNoLookup(false);
    } catch (error) {
      useSwalErrorAlertAPI("OED Retrieval Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const print = async (mode = "Inline") => {
    const printMode = typeof mode === "string" ? mode : mode?.mode || mode?.printMode || "Inline";
    setShowSignatory(false);
    if (!header.oedId) return useSwalInfoAlert("OED Print", "Save the transaction before printing.");
    setIsLoading(true);
    try {
      if (printMode === "Final") setNoReprints(1);
      await useHandlePrint(header.oedId, docType, printMode, user?.USER_CODE || "ADMIN");
    } catch (error) { useSwalErrorAlertAPI("OED Print Error", error); }
    finally { setIsLoading(false); }
  };

  const replicate = async (fields, label) => {
    if (!rows.length) return useSwalInfoAlert("Details Required", "Add employees before applying values to all.");
    const confirmation = await useSwalProceedConfirm(`Apply ${label}?`, `Apply ${label} to ${rows.length} detail row(s)?`, "Apply to all", "Cancel");
    if (!confirmation?.isConfirmed) return;
    setRows((previous) => previous.map((row) => ({ ...row, ...fields })));
  };
  const recalculate = () => {
    let skipped = 0;
    const recalculated = rows.map((row) => {
      const computed = calculateAmount(row);
      if (computed === null) { skipped += 1; return row; }
      return { ...row, amount: fmt(computed) };
    });
    setRows(recalculated);
    if (skipped) useSwalInfoAlert("Re-compute Details", `${skipped} row(s) retained their manually entered amount because Days / Hours were empty or ambiguous.`);
  };
  const formatRowNumber = (index, field) => {
    if (isReadOnly) return;
    setRows((old) => old.map((row, i) => i === index ? { ...row, [field]: fmt(row[field]) } : row));
  };
  const numberCell = (row, index, field) => (
    <input
      ref={(el) => { inputs.current[`${field}-${index}`] = el; }}
      className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-right text-xs"
      inputMode="decimal" readOnly={isReadOnly} value={row[field] ?? ""}
      onChange={(event) => {
        const value = event.target.value.replace(/,/g, "");
        if (inputIsValid(value)) updateRow(index, { [field]: value });
      }}
      onBlur={() => formatRowNumber(index, field)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault(); formatRowNumber(index, field);
          inputs.current[`${field}-${index + 1}`]?.focus();
        }
      }}
    />
  );
  const simpleCell = (row, index, field) => (
    <input value={row[field] || ""} readOnly={isReadOnly}
      className="global-tran-td-inputclass-ui h-7 w-full bg-transparent px-1 text-xs"
      onChange={(event) => updateRow(index, { [field]: event.target.value })} />
  );
  const lookupCell = (value, action, disabled = false) => (
    <div className="relative flex items-center">
      <input value={value || ""} readOnly className="global-tran-td-inputclass-ui h-7 w-full cursor-pointer bg-transparent pr-6 text-xs"
        onClick={() => !isReadOnly && !disabled && action()} />
      <button type="button" disabled={isReadOnly || disabled} onClick={action} aria-label="Lookup"
        className="absolute right-1.5 text-blue-600 disabled:opacity-40"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
    </div>
  );
  const startResize = (event, key) => {
    event.preventDefault();
    const x = event.clientX;
    const initial = widths[key];
    const move = (e) => setWidths((old) => ({ ...old, [key]: Math.max(56, initial + e.clientX - x) }));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  const stickyLeft = (key) => {
    let left = 0;
    for (const [name] of tableColumns) {
      if (name === key) break;
      if (stickyFields.has(name)) left += widths[name];
    }
    return left;
  };
  const renderHeader = (key, label) => (
    <th key={key} className={`global-tran-th-ui relative whitespace-nowrap ${stickyFields.has(key) ? "sticky z-20 bg-blue-100 dark:bg-blue-900" : ""}`}
      style={{ width: widths[key], minWidth: widths[key], ...(stickyFields.has(key) ? { left: stickyLeft(key) } : {}) }}>
      {label}
      <span aria-hidden="true" onMouseDown={(event) => startResize(event, key)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500" />
    </th>
  );
  const renderCell = (row, index, key) => {
    switch (key) {
      case "ln": return String(index + 1).padStart(4, "0");
      case "empNo": return lookupCell(row.empNo, () => setLookup({ type: "employee", index }));
      case "edCode": return lookupCell(row.edCode, () => setLookup({ type: "ed", index }));
      case "empName": case "edName": case "groupCode": case "branchCode":
      case "deptCode": case "clientCode": case "posCode": return row[key] || "";
      case "oedDays": case "oedHrs": case "oedMins": case "oedRate":
      case "amount": return numberCell(row, index, key);
      case "payregFlag": return (
        <select disabled={isReadOnly} value={row.payregFlag || "Y"}
          onChange={(event) => updateRow(index, { payregFlag: event.target.value })}
          className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-center text-xs">
          <option value="Y">Yes</option><option value="N">No</option>
        </select>
      );
      case "startDate": case "endDate": case "refDate": return (
        <DateFormatInput id={`${key}${index}`} value={row[key] || ""} disabled={isReadOnly}
          className="global-tran-td-inputclass-ui w-full bg-transparent text-center text-xs"
          updateState={(values) => updateRow(index, { [key]: values[`${key}${index}`] })} />
      );
      default: return simpleCell(row, index, key);
    }
  };
  const headerDate = (key, label, required = false) => (
    <div className="relative w-full min-w-0">
      <div
        className={`flex items-stretch global-ref-textbox-ui !h-10 !p-0 [&>div]:h-full ${
          !isReadOnly ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
        }`}
      >
        <DateFormatInput
          id={key}
          className="peer h-full w-full min-w-0 cursor-pointer rounded-lg border-none bg-transparent py-0 pl-2 pr-8 focus:outline-none"
          value={header[key]}
          disabled={isReadOnly}
          updateState={(values) => updateHeader({ [key]: values[key] })}
        />
      </div>
      <label htmlFor={key} className="global-ref-floating-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
  const applyButton = (label, onClick, disabled = false) => (
    <button type="button" onClick={onClick} disabled={isReadOnly || disabled || !rows.length}
      className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[98px] flex-none whitespace-nowrap px-2 text-xs disabled:opacity-50">
      <FontAwesomeIcon icon={faClone} className="mr-1" /> Apply to all
    </button>
  );
  const replicateInput = (key, label) => (
    <div className="min-w-0 flex-1 [&>div]:!mb-0">
      <FieldRenderer id={`replicate${key}`} label={label} type="amount"
        value={apply[key]} disabled={isReadOnly || !rows.length}
        onChange={(value) => {
          if (inputIsValid(value)) setApply((previous) => ({ ...previous, [key]: value }));
        }} />
    </div>
  );

  return (
    <div className="global-tran-main-div-ui">
      {busy && <LoadingSpinner />}
      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType} activeTopTab={topTab} showActions={topTab === "details"}
          showBIRForm={false} showCopyForm={false} disableRouteNavigation
          onDetails={() => setTopTab("details")} onHistory={() => setTopTab("history")}
          onSave={save} onReset={reset} onPrint={() => setShowSignatory(true)}
          onPost={async () => {
            if (busy || !header.oedId || isReadOnly) return;
            const result = await useSwalProceedConfirm(
              "Post OED Transaction?",
              `Post transaction ${header.oedNo || ""}? Once posted, its details can no longer be edited.`,
              "Yes, Post", "Cancel"
            );
            if (result?.isConfirmed) actionMutation.mutate({ mode: "post" });
          }}
          onCancel={() => setShowCancel(true)} onAttach={() => setShowAttach(true)}
          isSaveDisabled={isReadOnly || !rows.length || busy}
          isPrintDisabled={!header.oedId || status === "CANCELLED"}
          isAttachDisabled={!header.oedId || status === "CANCELLED"}
          isPostDisabled={!header.oedId || isReadOnly || busy}
          isCancelDisabled={!header.oedId || isReadOnly || busy}
        />
      </div>
      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">
              Other Earnings and Deductions Transaction
            </h1>
          </div>
          <div className="global-tran-headerstat-div-ui flex items-center gap-6">
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>
                {status}
              </h1>
            </div>
          </div>
        </div>

        {/* Header: Overtime-style four-column layout; narrower cut-off column reserves room for ED controls and Remarks. */}
        <div className="global-tran-header-div-ui">
          <style>{`
            #oed-entry-fields .global-ref-floating-label,
            #oed-entry-fields .global-tran-floating-label-remarks {
              top: -1.25rem !important;
              left: 0 !important;
              inset-inline-start: 0 !important;
              transform: none !important;
              padding: 0 !important;
              background: transparent !important;
              font-size: 0.75rem !important;
              line-height: 1rem !important;
              white-space: nowrap !important;
            }
            #oed-entry-fields .global-ref-textbox-ui {
              height: 2.5rem !important;
              min-height: 2.5rem !important;
              font-size: 0.75rem !important;
              line-height: 1.25rem !important;
            }
            #oed-entry-fields input.global-ref-textbox-ui {
              padding-top: 0.5rem !important;
              padding-bottom: 0.5rem !important;
            }
            #oed-entry-fields input.global-ref-textbox-ui[readonly] {
              padding-right: 3rem !important;
            }
            #oed-entry-fields button[title="Search"],
            #oed-entry-fields .global-ref-textbox-ui ~ .pointer-events-none {
              height: 2.5rem !important;
            }
          `}</style>
          <div className="global-tran-header-tab-div-ui">
            <button
              type="button"
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            >
              Basic Information
            </button>
          </div>
          <div
            id="oed-entry-fields"
            className="grid grid-cols-1 gap-7 p-2 pt-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.45fr)_minmax(0,1.1fr)]"
          >
            {/* Column 1: Transaction No., Transaction Date, Pay Frequency */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="relative min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  label="Transaction No."
                  type="text"
                  value={header.oedNo || "Auto Generated"}
                  disabled
                />
                <button
                  type="button"
                  onClick={openDocNoLookup}
                  disabled={busy}
                  title="Retrieve Other Earnings/Deductions (F1)"
                  aria-label="Retrieve OED transaction (F1)"
                  className="absolute right-1 top-0 flex h-10 w-10 items-center justify-center rounded-r-md border-l border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
              </div>
              {headerDate("oedDate", "Transaction Date", true)}
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  id="oedFrequency"
                  label="Pay Frequency"
                  type="select"
                  required
                  value={header.cutoffType}
                  options={[
                    { value: "S", label: "Semi-Monthly" },
                    { value: "M", label: "Monthly" },
                    { value: "W", label: "Weekly" },
                  ]}
                  placeholder="Select Pay Frequency"
                  disabled={isReadOnly || rows.length > 0}
                  hideClearButton
                  onChange={(value) =>
                    updateHeader({
                      cutoffType: value,
                      cutoffFrequency: "",
                      cutoffCode: "",
                      cutoffName: "",
                    })
                  }
                />
              </div>
            </div>

            {/* Column 2: Payroll Cut-Off, Tran. Type, Branch */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  id="oedCutoffCode"
                  label="Payroll Cut-Off"
                  required
                  type="lookup"
                  value={header.cutoffCode
                    ? `${header.cutoffCode}${header.cutoffName ? ` - ${header.cutoffName}` : ""}`
                    : ""}
                  placeholder="Select Payroll Cut-Off"
                  disabled={isReadOnly || rows.length > 0}
                  onLookup={() => setLookup({ type: "cutoff", index: null })}
                />
              </div>
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  id="oedTranType"
                  label="Tran. Type"
                  type="text"
                  value={header.tranType}
                  disabled={isReadOnly}
                  onChange={(value) => updateHeader({ tranType: value })}
                />
              </div>
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  id="oedBranchCode"
                  label="Branch"
                  type="text"
                  value={header.branchCode}
                  disabled={isReadOnly}
                  onChange={(value) => updateHeader({ branchCode: value })}
                />
              </div>
            </div>

            {/* Column 3: REF_ED classification, selected code, and bulk entry */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-[0_0_31%] [&>div]:!mb-0">
                  <FieldRenderer
                    id="oedCategory"
                    label="Category"
                    type="select"
                    value={header.edType}
                    options={[
                      { value: "EARN", label: "Earnings" },
                      { value: "DED", label: "Deductions" },
                    ]}
                    disabled={isReadOnly || rows.length > 0}
                    hideClearButton
                    onChange={(value) => {
                      updateHeader({ edType: value });
                      setSelectedEd(null);
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="oedEdCode"
                    label="ED Code"
                    type="lookup"
                    value={selectedEd
                      ? `${selectedEd.edCode} - ${selectedEd.edName}`
                      : ""}
                    placeholder="Select ED Code"
                    disabled={isReadOnly}
                    onLookup={() => setLookup({ type: "ed", index: null })}
                  />
                </div>
                <button
                  type="button"
                  onClick={generate}
                  disabled={isReadOnly}
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                {replicateInput("oedDays", "Days")}
                {replicateInput("oedHrs", "Hrs.")}
                {applyButton("Days / Hours", () =>
                  replicate({
                    oedDays: fmt(apply.oedDays),
                    oedHrs: fmt(apply.oedHrs),
                  }, "Days / Hours"))}
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                {replicateInput("oedRate", "Rate")}
                {replicateInput("amount", "Amount")}
                {applyButton("Rate / Amount", () =>
                  replicate({
                    oedRate: fmt(apply.oedRate),
                    amount: fmt(apply.amount),
                  }, "Rate / Amount"))}
              </div>
            </div>

            {/* Column 4: Remarks, same height as Overtime */}
            <div className="flex min-w-0 flex-col">
              <div className="relative h-full min-h-[11rem]">
                <textarea
                  id="oedRemarks"
                  rows={6}
                  value={header.remarks}
                  disabled={isReadOnly}
                  onChange={(event) => updateHeader({ remarks: event.target.value })}
                  className="peer global-tran-textbox-remarks-ui h-full !min-h-[11rem] resize-y pt-2"
                />
                <label htmlFor="oedRemarks" className="global-tran-floating-label-remarks">
                  Remarks
                </label>
              </div>
            </div>
          </div>
        </div>

        <div id="oed_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row">
              <button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Other Earnings and Deductions Details
              </button>
            </div>
          </div>
          {catalogError && <p className="px-3 pb-2 text-xs text-red-600">REF_ED lookup: {catalogError}</p>}
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l"
                style={{ tableLayout: "fixed", width: shownColumns.reduce((sum, [key]) => sum + widths[key], widths.actions) }}>
                <colgroup>{shownColumns.map(([key]) => <col key={key} style={{ width: widths[key] }} />)}<col style={{ width: widths.actions }} /></colgroup>
                <thead className="global-tran-thead-div-ui"><tr>
                  {shownColumns.map(([key, label]) => renderHeader(key, label))}
                  <th className="global-tran-th-ui sticky right-0 z-20 bg-blue-100 dark:bg-blue-900" style={{ minWidth: widths.actions }}>Actions</th>
                </tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.groupId} className="global-tran-tr-ui">
                      {shownColumns.map(([key]) => (
                        <td key={key} className={`global-tran-td-ui text-xs ${stickyFields.has(key) ? "sticky z-10 bg-white dark:bg-slate-950" : ""} ${key === "ln" ? "text-center" : ""}`}
                          style={stickyFields.has(key) ? { left: stickyLeft(key) } : undefined}>
                          {renderCell(row, index, key)}
                        </td>
                      ))}
                      <td className="global-tran-td-ui sticky right-0 z-10 bg-white text-center dark:bg-slate-950">
                        {!isReadOnly && <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => addBlankRow(index)} title="Insert row below" className="global-tran-td-button-add-ui"><FontAwesomeIcon icon={faPlus} /></button>
                          {enableCopyFunction && (
                            <button type="button" onClick={() => copyDetailRow(index)} title="Copy this row below (edit duplicate details before saving)" aria-label={`Copy row ${index + 1}`} className="global-tran-td-button-add-ui"><FontAwesomeIcon icon={faClone} /></button>
                          )}
                          <button type="button" onClick={() => setRows((old) => old.filter((_, i) => i !== index))} title="Delete row" className="global-tran-td-button-delete-ui"><FontAwesomeIcon icon={faTrashAlt} /></button>
                        </div>}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={shownColumns.length + 1} className="p-8 text-center text-sm text-slate-500">Select an earning/deduction code, then add or generate employee details.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="global-tran-tab-footer-main-div-ui flex-wrap gap-3">
            <div className="global-tran-tab-footer-button-div-ui flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="global-tran-tab-footer-button-add-ui"
                disabled={isReadOnly}
                title="Select employees and REF_ED codes using the System Generated lookup"
                onClick={() => {
                  if (!header.cutoffType) return showOEDValidationAlert({
                    title: "Pay Frequency Required", message: "Select Pay Frequency first.",
                  });
                  if (!header.cutoffCode) return showOEDValidationAlert({
                    title: "Payroll Cut-Off Required", message: "Select Payroll Cut-Off first.",
                  });
                  if (!catalog.some((item) => item.edType === header.edType &&
                    ["Y", "1", "TRUE", "A"].includes(item.active.toUpperCase()))) {
                    return showOEDValidationAlert({
                      title: "Reference Codes Not Available",
                      message: "No active REF_ED codes are available for the selected category.",
                    });
                  }
                  setLookup({ type: "systemEmployees", index: null });
                }}
              >
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                Select Multiple Employees
              </button>
              <button
                type="button"
                className="global-tran-tab-footer-button-add-ui"
                disabled={isReadOnly}
                onClick={() => addBlankRow()}
                title="Add a blank detail row for manual employee selection"
              >
                <FontAwesomeIcon icon={faUsers} className="mr-2" />
                New Row
              </button>
              <button
                type="button"
                className="global-tran-tab-footer-button-add-ui"
                disabled={isReadOnly || !rows.length}
                onClick={recalculate}
              >
                <FontAwesomeIcon icon={faCalculator} className="mr-2" />
                Re-Compute Details
              </button>
              <label className="ml-2 inline-flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={enableCopyFunction}
                  onChange={(event) => setEnableCopyFunction(event.target.checked)}
                  disabled={isReadOnly}
                  className="h-4 w-4 accent-blue-600"
                />
                Enable Copy Function
              </label>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ["Total Employees:", new Set(rows.map((row) => row.empNo).filter(Boolean)).size, false],
                ["Total Days:", rows.reduce((sum, row) => sum + num(row.oedDays), 0), true],
                ["Total Hours:", rows.reduce((sum, row) => sum + num(row.oedHrs) + num(row.oedMins) / 60, 0), true],
                [header.edType === "DED" ? "Total Deductions:" : "Total Earnings:", total, true],
              ].map(([label, value, isAmount]) => (
                <Fragment key={label}>
                  <div className="global-tran-tab-footer-total-label-ui">{label}</div>
                  <div className="global-tran-tab-footer-total-value-ui text-right">
                    {isAmount ? fmt(value) : value}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={topTab === "history" ? "" : "hidden"}>
        <QueryClientProvider client={historyClient}>
          <AllTranHistory showHeader={false} isActive={topTab === "history"}
            endpoint={`${apiRoot}/history`} cacheKey="OtherEarningsDeductionsHistory"
            activeTabKey="OED_Summary" status="All"
            onRowDoubleClick={loadTransaction} historyExportName="Other Earnings and Deductions"
            amountDecimals={2} columnConfigOverrides={OED_HISTORY_COLUMN_CONFIGS} />
        </QueryClientProvider>
      </div>
      <SearchCutoffRef isOpen={lookup.type === "cutoff"} payFrequency={header.cutoffType}
        onClose={(selected) => {
          if (selected) updateHeader({
            cutoffCode: selected.code || selected.cutoffCode || "",
            cutoffName: selected.description || selected.cutoffName || "",
            cutoffStartDate: toDisplayDate(selected.cutoffStartDate || header.cutoffStartDate),
            cutoffEndDate: toDisplayDate(selected.cutoffEndDate || header.cutoffEndDate),
            cutoffFrequency: selected.cutoffFreq || selected.cutoffFrequency || "",
            cutoffType: getCutoffType(selected.cutoffType || selected.cutoffFreq || header.cutoffType),
          });
          setLookup({ type: "", index: null });
        }} />
      <SearchEmployeeRef isOpen={lookup.type === "employee"} onClose={(selected) => {
        if (selected && lookup.index !== null) {
          const employee = normalizeEmployee(selected);
          updateRow(lookup.index, { ...employee, branchCode: employee.branchCode || header.branchCode });
        }
        setLookup({ type: "", index: null });
      }} />
      <SearchRefED isOpen={lookup.type === "ed"} edCodes={catalog} edType={header.edType}
        onClose={(selected) => { selectEd(selected, lookup.index); setLookup({ type: "", index: null }); }} />
      <SearchSystemGeneratedEmployeeSelection
        isOpen={lookup.type === "systemEmployees"}
        payFrequency={header.cutoffType}
        cutoffCode={header.cutoffCode}
        allowedEdCodes={catalog
          .filter((item) => item.edType === header.edType &&
            ["Y", "1", "TRUE", "A"].includes(item.active.toUpperCase()))
          .map((item) => item.edCode)}
        onClose={(selection) => {
          if (selection) addSystemGeneratedSelection(selection);
          setLookup({ type: "", index: null });
        }}
      />
      <EmployeeBulkPicker open={lookup.type === "employees"} payFrequency={header.cutoffType}
        cutoffCode={header.cutoffCode} onClose={(selected) => {
          if (selected) addEmployees(selected);
          setLookup({ type: "", index: null });
        }} />
      {showCancel && <CancelTranModal isOpen={showCancel} onClose={(confirmation) => {
        if (!confirmation) return setShowCancel(false);
        actionMutation.mutate({ mode: "cancel", password: confirmation.password, reason: confirmation.reason });
      }} />}
      {showAttach && <AttachDocumentModal isOpen={showAttach} params={{
        DocumentID: header.oedId, DocumentName: "Other Earnings & Deductions",
        DocumentNo: header.oedNo, viewOnly: status === "CANCELLED",
      }} onClose={() => setShowAttach(false)} />}
      {showDocNoLookup && (
        <AllTranDocNo
          isOpen={showDocNoLookup}
          docNo={header.oedNo || ""}
          params={{
            docType,
            documentTitle: "Other Earnings and Deductions",
            branchCode: header.branchCode || "",
            branchName: header.branchCode || "All Branches",
            fieldNo: "oedNo",
            retrieveOnly: true,
          }}
          onRetrieve={retrieveOedFromLookup}
          onResponse={{ documentNo: header.oedNo || "" }}
          onClose={() => setShowDocNoLookup(false)}
        />
      )}
      {showSignatory && <DocumentSignatories isOpen={showSignatory} params={{
        noReprints, documentID: header.oedId, docType, docNo: header.oedNo,
      }} onClose={print} onCancel={() => setShowSignatory(false)} />}
    </div>
  );
};
export default OtherEarningsDeductions;
