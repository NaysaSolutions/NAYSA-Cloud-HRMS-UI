import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faSave, faUndo, faTrashAlt, faEdit, faUser, faBriefcase, faMoneyBillWave,
  faLandmark, faCalendarDays, faShieldHalved, faPeopleGroup, faTriangleExclamation, faAddressCard,
  faList, faCamera, faEnvelope, faPhone, faSearch, faTimes,
} from "@fortawesome/free-solid-svg-icons";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import AreaLookupModal from "@/NAYSA Cloud/Lookup/SearchRefArea";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchRefBranch";
import BankLookupModal from "@/NAYSA Cloud/Lookup/SearchRefBank";
import ClientLookupModal from "@/NAYSA Cloud/Lookup/SearchRefClient";
import DepartmentLookupModal from "@/NAYSA Cloud/Lookup/SearchRefDepartment";
import EmployeeStatusLookupModal from "@/NAYSA Cloud/Lookup/SearchRefEmpStatus";
import PayGroupLookupModal from "@/NAYSA Cloud/Lookup/SearchRefPayGroup";
import PositionLookupModal from "@/NAYSA Cloud/Lookup/SearchRefPosition";
import ShiftLookupModal from "@/NAYSA Cloud/Lookup/SearchRefShift";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert as showErrorAlert,
  useSwalSuccessAlert as showSuccessAlert,
  useSwalErrorAlertAPI as showApiErrorAlert,
  useSwalDeleteConfirm as showDeleteConfirm,
  useSwalDeleteRecord as showDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

/* Shared alert utilities retain historical use* exports but are called as callbacks. */
/* eslint-disable react/prop-types */

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "Personal", icon: faUser },
  { id: "Employment", icon: faBriefcase },
  { id: "Payroll", icon: faMoneyBillWave },
  { id: "Government & Bank", icon: faLandmark },
  { id: "Schedule", icon: faCalendarDays },
  { id: "Access & Approval", icon: faShieldHalved },
  { id: "History & Family", icon: faPeopleGroup },
];

const VIEW_TABS = [
  { id: "employee", label: "Employee", icon: faUser },
  { id: "list", label: "Employee List", icon: faList },
];

const FALLBACK_YN = [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }];
const FALLBACK_GENDER = [{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }];
const FALLBACK_CIVIL = [
  { value: "S", label: "Single" }, { value: "M", label: "Married" },
  { value: "W", label: "Widowed" }, { value: "SEP", label: "Separated" },
];
const YN = FALLBACK_YN;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  .map((x) => ({ value: x, label: x[0] + x.slice(1).toLowerCase() }));

const DROPDOWN_REQUESTS = {
  yn: { dropdownColumn: "YN", docCode: "YN" },
  civilStatus: { dropdownColumn: "CIVILSTAT", docCode: "CIVILSTAT" },
  gender: { dropdownColumn: "GENDER", docCode: "GENDER" },
  payrollFrequency: { dropdownColumn: "PAYCLASS", docCode: "PAYCLASS" },
  frequencyType: { dropdownColumn: "FREQ_TYPE", docCode: "FREQ_TYPE" },
  payMode: { dropdownColumn: "PAYMODE", docCode: "PAYMODE" },
  taxTable: { dropdownColumn: "TAXTBL", docCode: "TAXTBL" },
};
 
const fetchEmployeeDropdown = async ({ dropdownColumn, docCode }) => {
  try {
    const payload = { json_data: { dropdownColumn, docCode } };
    const response = await postRequest("getHSDropdown", JSON.stringify(payload));
    if (!response?.success) return [];
    const raw = response?.data?.[0]?.result;
    if (!raw) return [];
    try { return Array.isArray(raw) ? raw : JSON.parse(raw); } catch { return []; }
  } catch (error) {
    console.error(`Error fetching ${dropdownColumn} dropdown:`, error);
    return [];
  }
};

const mapDropdownOptions = (rows = [], fallback = []) => {
  const mapped = rows.map((row) => ({
    value: row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? "",
    label: row.DROPDOWN_NAME ?? row.DROPDOWN_DESC ?? row.dropdownName ?? row.dropdownDesc ?? row.label ?? row.DROPDOWN_CODE ?? row.dropdownCode ?? "",
  })).filter((option) => option.value !== "");
  return mapped.length ? mapped : fallback;
};

const fetchReferenceOptions = async (endpoint, codeKey, nameKey, params) => {
  const { data } = await apiClient.get(endpoint, params ? { params } : undefined);
  const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result || [];
  let rows = raw;
  if (typeof raw === "string") {
    try { rows = JSON.parse(raw); } catch { rows = []; }
  }
  const readValue = (row, key, fallbackKeys = []) => {
    const normalizedKey = String(key).replace(/([A-Z])/g, "_$1").toUpperCase();
    const candidates = [key, normalizedKey, key.toUpperCase(), ...fallbackKeys];
    const matchingKey = Object.keys(row || {}).find((rowKey) => candidates.includes(rowKey) || rowKey.toUpperCase() === normalizedKey);
    return matchingKey ? row[matchingKey] : "";
  };

  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      value: readValue(row, codeKey, ["code", "CODE"]),
      label: readValue(row, nameKey, [
        "name", "NAME", "description", "DESCRIPTION", "desc", "DESC", "label", "LABEL",
        "branchDesc", "BRANCH_DESC", "branchDescription", "BRANCH_DESCRIPTION",
      ]),
    }))
    .filter((option) => option.value !== "");
};

const isYesValue = (value) => ["Y", "YES", "1", "TRUE"].includes(String(value ?? "").trim().toUpperCase());

/* Required fields, and the tab each one lives on (drives the error dots). */
const REQUIRED = [
  { key: "empNo", label: "Employee No.", tab: "Personal" },
  { key: "lastName", label: "Last Name", tab: "Personal" },
  { key: "firstName", label: "First Name", tab: "Personal" },
];

const blankEmployee = {
  empNo: "", empName: "", lastName: "", firstName: "", middleName: "", employeePhoto: "", address1: "", address2: "", civilStatus: "", gender: "", rdoCode: "", zipCode: "", emailAddress: "", contactNo: "", telNo: "", birthplace: "", contactAddress: "", contactPerson: "", contactRelation: "", contactPhoneno: "",
  yrsService: 0, compCode: "", branchCode: "", clientCode: "", payGroup: "", deptCode: "", posCode: "", statCode: "", sgCode: "", level: "", areaCode: "", sssNo: "", tin: "", hdmfNo: "", phNo: "", umid: "", bankCode: "", bankAcct: "", bank2: "", bankCode2: "", bankAcct2: "", bank2Comp: "", bank3: "", bankCode3: "", bankAcct3: "", bank3Comp: "",
  birthdate: "", dateHired: "", dateRegularized: "", dateResigned: "", dateTerminated: "", endContract: "", payrollFreq: "", freqType: "", payMode: "", compSss: "Y", sssFreq: "", compMed: "Y", medFreq: "", compTax: "Y", taxFreq: "", compHdmf: "Y", hdmfFreq: "", taxTable: "", basic: 0, dailyRate: 0, hourRate: 0, regHrs: 8, regdaysYear: 0, regdaysMonth: 0, rendHrs: 0, cutoffHrs: 0, hdmfEmp: 0, hdmfEmpr: 0, hdmfMax: 0, mpfEmp: 0, taxRate: 0, ecolaRate: 0, cashAllowance: 0, allowHrate: 0, allowDrate: 0, projAllowance: 0, tSalary: 0, tHrate: 0, tDrate: 0,
  shiftCode: "", rd1: "", rd2: "", rd3: "", oldEmpno: "", empCode: "", rehired: "N", askappPin: "", askappPw: "", approver: "N", app1: "", app2: "", app3: "", supervisor: "", manager: "", geofence: "N", hrFlag: "N", managerFlag: "N", supervisorFlag: "N", activePort: "N", browser: "", loginTime: "", active: "Y",
};
const emptyDetails = { education: [], experience: [], family: [], dependents: [] };

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const dateOnly = (v) => (typeof v === "string" ? v.slice(0, 10) : v || "");

const fullName = (e) => {
  if (e.empName) return e.empName;
  if (!e.lastName && !e.firstName) return "";
  return `${e.lastName || ""}${e.firstName ? `, ${e.firstName}` : ""}${e.middleName ? ` ${e.middleName}` : ""}`.trim();
};

const initials = (e) =>
  ((e.firstName?.[0] || "") + (e.lastName?.[0] || "")).toUpperCase() || "?";

const ageFrom = (iso) => {
  if (!iso) return "";
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return "";
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a -= 1;
  return a >= 0 ? String(a) : "";
};

const tenureFrom = (iso) => {
  if (!iso) return "—";
  const s = new Date(iso);
  if (Number.isNaN(s.getTime())) return "—";
  const months = (new Date().getFullYear() - s.getFullYear()) * 12 + (new Date().getMonth() - s.getMonth());
  if (months < 0) return "—";
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo`].filter(Boolean).join(" ") || "< 1 mo";
};

const withCurrentOption = (options, value) => {
  if (!value || options.some((option) => String(option.value) === String(value))) return options;
  return [{ value, label: String(value) }, ...options];
};

/* ------------------------------------------------------------------ */
/* Presentational building blocks                                     */
/* ------------------------------------------------------------------ */

const F = ({ label, value, onChange, type = "text", options, disabled = false, required = false }) => (
  <FieldRenderer
    label={label}
    value={value ?? ""}
    onChange={onChange}
    type={type}
    options={options}
    disabled={disabled}
    required={required}
  />
);

const Section = ({ title, hint, icon, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
    <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-700">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <FontAwesomeIcon icon={icon} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    </header>
    <div className="p-5">{children}</div>
  </section>
);

const Grid = ({ children, columns = "md:grid-cols-2" }) => (
  <div className={`grid grid-cols-1 ${columns} gap-x-6 gap-y-4`}>{children}</div>
);

const Subhead = ({ children }) => (
  <p className="mb-3 border-b border-slate-100 pb-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400 md:col-span-full">
    {children}
  </p>
);

/* Renders a list of [label, key, extra] tuples as fields. */
const Fields = ({ specs, data, set }) => (
  <>
    {specs.map(([label, key, extra = {}]) => (
      <F key={key} label={label} value={extra.date ? dateOnly(data[key]) : data[key]} onChange={(v) => set(key, v)} {...extra.props} type={extra.type || (extra.date ? "date" : extra.num ? "number" : "text")} options={extra.options} />
    ))}
  </>
);

const specsWithOptions = (specs, optionsByKey = {}) => specs.map(([label, key, extra = {}]) => [
  label,
  key,
  { ...extra, options: optionsByKey[key] ?? extra.options },
]);

/* DOM-safe id (tab names contain spaces and "&", which break aria-labelledby). */
const tabDomId = (id) => `tab-${String(id).replace(/[^a-z0-9]+/gi, "-")}`;

const TabButton = ({ active, icon, label, onClick, invalid, id, variant = "underline" }) => (
  <button
    type="button"
    role="tab"
    id={id}
    aria-selected={active}
    tabIndex={active ? 0 : -1}
    onClick={onClick}
    className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
      variant === "pill"
        ? `rounded-md px-4 py-2 ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"}`
        : `-mb-px rounded-t-lg border-b-2 px-4 py-3 ${active
          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100"}`
    }`}
  >
    <FontAwesomeIcon icon={icon} className={variant === "pill" ? "" : active ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
    {label}
    {invalid && <span className="h-2 w-2 rounded-full bg-red-500" role="img" aria-label="Has issues to fix" />}
  </button>
);

/* Accessible tab list: arrow keys / Home / End move between tabs. */
const TabList = ({ tabs, value, onChange, label, invalidTabs, className = "", variant = "underline" }) => {
  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === value);
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[n].id);
    requestAnimationFrame(() => document.getElementById(tabDomId(tabs[n].id))?.focus());
  };
  const shell = variant === "pill"
    ? "gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-gray-800"
    : "border-b border-slate-200 dark:border-slate-700";
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={`flex overflow-x-auto ${shell} ${className}`}>
      {tabs.map((t) => (
        <TabButton key={t.id} id={tabDomId(t.id)} variant={variant} label={t.label || t.id} icon={t.icon} active={value === t.id} invalid={invalidTabs?.has(t.id)} onClick={() => onChange(t.id)} />
      ))}
    </div>
  );
};

const Fact = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={value || ""}>{value || "—"}</dd>
  </div>
);

const StatusPill = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
    active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
    {active ? "Active" : "Inactive"}
  </span>
);

/* Editable table for education / experience / family / dependents. */
const DetailGrid = ({ title, rows, setRows, fields, autoAge }) => {
  const add = () => setRows([...rows, Object.fromEntries(fields.map((f) => [f.key, ""]))]);
  const remove = (i) => setRows(rows.filter((_, x) => x !== i));
  const change = (i, k, v) =>
    setRows(rows.map((r, x) => {
      if (x !== i) return r;
      const next = { ...r, [k]: v };
      if (autoAge && k === autoAge.birthKey) next[autoAge.ageKey] = ageFrom(v);
      return next;
    }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {rows.length}
          </span>
        </div>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <FontAwesomeIcon icon={faPlus} /> Add row
        </button>
      </header>

      <div className="max-h-80 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-700">
            <tr>
              {fields.map((f) => (
                <th key={f.key} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-200">
                  {f.label}
                </th>
              ))}
              <th className="w-10 border-b border-slate-200 dark:border-slate-600" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={fields.length + 1} className="px-3 py-8 text-center text-slate-400">
                  No {title.toLowerCase()} records yet. Select <b>Add row</b> to enter one.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 even:bg-slate-50/50 last:border-0 dark:border-slate-700 dark:even:bg-gray-900/20">
                  {fields.map((f) => (
                    <td key={f.key} className="p-1">
                      <input
                        type={f.type || "text"}
                        value={r[f.key] ?? ""}
                        readOnly={f.key === autoAge?.ageKey && !!r[autoAge.birthKey]}
                        aria-label={`${title} ${f.label}, row ${i + 1}`}
                        onChange={(e) => change(i, f.key, e.target.value)}
                        className="w-full min-w-[7rem] rounded border border-transparent bg-transparent px-2 py-1.5 outline-none transition hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 read-only:text-slate-500 dark:hover:border-slate-600 dark:focus:bg-gray-900"
                      />
                    </td>
                  ))}
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove ${title} row ${i + 1}`}
                      className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Field specs                                                        */
/* ------------------------------------------------------------------ */

const EMPLOYMENT_LEFT = [
  ["Company", "compCode"], ["Salary Grade", "sgCode"], ["Level", "level"],
];
const EMPLOYMENT_DATES = [
  ["Date Hired", "dateHired", { date: true }], ["Date Regularized", "dateRegularized", { date: true }],
  ["End of Contract", "endContract", { date: true }], ["Date Resigned", "dateResigned", { date: true }],
  ["Date Terminated", "dateTerminated", { date: true }],
];
const PAYROLL_SETUP = [
  ["Payroll Frequency", "payrollFreq", { type: "select" }],
  ["Frequency Type", "freqType", { type: "select" }],
  ["Pay Mode", "payMode", { type: "select" }],
  ["Tax Table", "taxTable", { type: "select" }],
];
const PAYROLL_RATES = [
  ["Basic Salary", "basic", { num: true }], ["Daily Rate", "dailyRate", { num: true }], ["Hourly Rate", "hourRate", { num: true }],
  ["Regular Hours", "regHrs", { num: true }], ["Regular Days / Year", "regdaysYear", { num: true }], ["Regular Days / Month", "regdaysMonth", { num: true }],
  ["Rendered Hours", "rendHrs", { num: true }], ["Cutoff Hours", "cutoffHrs", { num: true }],
];
const PAYROLL_ALLOW = [
  ["ECOLA Rate", "ecolaRate", { num: true }], ["Cash Allowance", "cashAllowance", { num: true }],
  ["Allowance Hourly Rate", "allowHrate", { num: true }], ["Allowance Daily Rate", "allowDrate", { num: true }],
  ["Project Allowance", "projAllowance", { num: true }],
];
const PAYROLL_TOTALS = [
  ["Total Salary", "tSalary", { num: true }], ["Total Hourly Rate", "tHrate", { num: true }], ["Total Daily Rate", "tDrate", { num: true }],
];
const GOVT_IDS = [
  ["TIN", "tin"], ["RDO Code", "rdoCode"], ["SSS No.", "sssNo"], ["PhilHealth No.", "phNo"], ["HDMF No.", "hdmfNo"], ["UMID", "umid"],
];
const GOVT_COMPUTE = [
  ["Compute SSS", "compSss", { options: YN, type: "select" }], ["Compute PhilHealth", "compMed", { options: YN, type: "select" }],
  ["Compute Tax", "compTax", { options: YN, type: "select" }], ["Compute HDMF", "compHdmf", { options: YN, type: "select" }],
];
const GOVT_FREQ = [
  ["SSS Frequency", "sssFreq", { type: "select" }], ["PhilHealth Frequency", "medFreq", { type: "select" }],
  ["Tax Frequency", "taxFreq", { type: "select" }], ["HDMF Frequency", "hdmfFreq", { type: "select" }],
];
const BANK_EXTRA = [
  ["Secondary Bank", "bank2"], ["Secondary Bank Code", "bankCode2"], ["Secondary Account No.", "bankAcct2"], ["Secondary Bank Company", "bank2Comp"],
  ["Tertiary Bank", "bank3"], ["Tertiary Bank Code", "bankCode3"], ["Tertiary Account No.", "bankAcct3"], ["Tertiary Bank Company", "bank3Comp"],
];
const GOVT_RATES = [
  ["HDMF Employee", "hdmfEmp", { num: true }], ["HDMF Employer", "hdmfEmpr", { num: true }], ["HDMF Maximum", "hdmfMax", { num: true }],
  ["MPF Employee", "mpfEmp", { num: true }], ["Tax Rate", "taxRate", { num: true }],
];
const ACCESS_FLAGS = [
  ["Portal Active", "activePort", { options: YN, type: "select" }], ["HR", "hrFlag", { options: YN, type: "select" }],
  ["Approver Flag", "approver", { options: YN, type: "select" }],
  ["Supervisor Flag", "supervisorFlag", { options: YN, type: "select" }], ["Manager Flag", "managerFlag", { options: YN, type: "select" }],
];
const relationFields = (p) => [
  { key: `${p}Name`, label: "Name" },
  { key: `${p}Relation`, label: "Relationship" },
  { key: `${p}Birthdate`, label: "Birthdate", type: "date" },
  { key: `${p}Age`, label: "Age" },
  { key: `${p}Address`, label: "Address" },
  { key: `${p}Contact`, label: "Contact" },
  { key: `${p}Occupation`, label: "Occupation" },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */


export default function RefEmployee() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [viewTab, setViewTab] = useState("employee");
  const [tab, setTab] = useState(TABS[0].id);
  const [employee, setEmployee] = useState(blankEmployee);
  const [details, setDetails] = useState(emptyDetails);
  const [selected, setSelected] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showEmployeeStatusModal, setShowEmployeeStatusModal] = useState(false);
  const [showPayGroupModal, setShowPayGroupModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [lookupNames, setLookupNames] = useState({});
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("ALL");
  const [listEmployeeStatus, setListEmployeeStatus] = useState("ALL");
  const [listBranch, setListBranch] = useState("ALL");
  const [listPayGroup, setListPayGroup] = useState("ALL");
  const [listDepartment, setListDepartment] = useState("ALL");
  const [listPosition, setListPosition] = useState("ALL");
  const [brokenPhoto, setBrokenPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoInputRef = useRef(null);

  const set = useCallback((k, v) => { setEmployee((p) => ({ ...p, [k]: v })); setDirty(true); }, []);
  const setDetail = useCallback((k, v) => { setDetails((p) => ({ ...p, [k]: v })); setDirty(true); }, []);

  const reset = useCallback(() => {
    setEmployee(blankEmployee); setDetails(emptyDetails);
    setSelected(null); setTab(TABS[0].id); setDirty(false); setShowErrors(false);
    setLookupNames({});
    setPhotoFile(null); setPhotoPreview("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, []);

  /* Guard against silently losing edits. */
  const confirmDiscard = useCallback(
    () => !dirty || window.confirm("You have unsaved changes. Discard them?"),
    [dirty],
  );

  const photoUrl = useCallback((value) => {
    if (!value) return "";
    if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
    const base = (apiClient.defaults.baseURL || "").replace(/\/$/, "").replace(/\/api(?:\/index\.php)?$/i, "");
    return `${base}/${String(value).replace(/^\//, "")}`;
  }, []);

  const handlePhotoChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showErrorAlert("Invalid photo", "Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("Photo is too large", "Please select an image up to 5 MB.");
      event.target.value = "";
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setDirty(true);
  }, []);

  useEffect(() => () => {
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const chooseLookup = useCallback((codeKey, nameKey, row) => {
    const code = row?.code ?? row?.[codeKey] ?? "";
    const name = row?.name ?? row?.[nameKey] ?? "";
    set(codeKey, code);
    setLookupNames((current) => ({ ...current, [nameKey]: name }));
  }, [set]);

  const clearLookup = useCallback((codeKey, nameKey) => {
    set(codeKey, "");
    setLookupNames((current) => ({ ...current, [nameKey]: "" }));
  }, [set]);

  /* ---- data ---- */
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["employeeList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/employee");
      const raw = data?.data?.[0]?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["employeeAreas"],
    queryFn: async () => {
      const { data } = await apiClient.get("/area");
      const raw = data?.data?.[0]?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });
  const areaOptions = useMemo(
    () => areas.filter((x) => String(x.active).toUpperCase() === "Y")
      .map((x) => ({ value: x.areaCode, label: `${x.areaCode} - ${x.areaName}` })),
    [areas],
  );

  const { data: referenceOptions = {} } = useQuery({
    queryKey: ["employeeReferenceLookups", "v2"],
    queryFn: async () => Object.fromEntries(await Promise.all([
      ["branchCode", "/lookupBranch", "branchCode", "branchName", { PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 5000 }) }],
      ["bankCode", "/bank", "bankCode", "bankName"],
      ["clientCode", "/client", "clientCode", "clientName"],
      ["deptCode", "/refDepartment", "deptCode", "deptName"],
      ["statCode", "/refEmployeeStatus", "statCode", "statName"],
      ["payGroup", "/paygroup", "groupCode", "groupName"],
      ["posCode", "/pos", "posCode", "posName"],
      ["shiftCode", "/shift", "shiftCode", "shiftName"],
    ].map(async ([key, endpoint, codeKey, nameKey, params]) => {
      const options = await fetchReferenceOptions(endpoint, codeKey, nameKey, params).catch(() => []);
      if (key === "branchCode" && (!options.length || options.every((option) => !option.label))) {
        return [key, await fetchReferenceOptions("/branch", codeKey, nameKey).catch(() => options)];
      }
      return [key, options];
    }))),
    staleTime: 5 * 60 * 1000,
  });

  const displayLookup = useCallback((codeKey, nameKey) => {
    const code = employee[codeKey] || "";
    const option = (referenceOptions[codeKey] || []).find((item) => String(item.value) === String(code));
    const name = lookupNames[nameKey] || employee[nameKey] || option?.label || "";
    return code ? `${code}${name ? ` - ${name}` : ""}` : "";
  }, [employee, lookupNames, referenceOptions]);

  /* Name only (falls back to the code) - used by the summary card. */
  const lookupName = useCallback((codeKey, nameKey) => {
    const code = employee[codeKey] || "";
    if (!code) return "";
    const option = (referenceOptions[codeKey] || []).find((item) => String(item.value) === String(code));
    return lookupNames[nameKey] || employee[nameKey] || option?.label || code;
  }, [employee, lookupNames, referenceOptions]);

  const areaDisplayValue = useMemo(() => {
    const selectedArea = areaOptions.find((option) => String(option.value) === String(employee.areaCode));
    return selectedArea?.label || displayLookup("areaCode", "areaName");
  }, [areaOptions, displayLookup, employee.areaCode]);

  const { data: dropdownRows = {}, isLoading: isDropdownLoading } = useQuery({
    queryKey: ["employeeDropdowns"],
    queryFn: async () => Object.fromEntries(await Promise.all(
      Object.entries(DROPDOWN_REQUESTS).map(async ([key, request]) => [key, await fetchEmployeeDropdown(request)]),
    )),
    staleTime: 5 * 60 * 1000,
  });
  const dropdownOptions = useMemo(() => ({
    yn: mapDropdownOptions(dropdownRows.yn, FALLBACK_YN),
    civilStatus: mapDropdownOptions(dropdownRows.civilStatus, FALLBACK_CIVIL),
    gender: mapDropdownOptions(dropdownRows.gender, FALLBACK_GENDER),
    payrollFrequency: mapDropdownOptions(dropdownRows.payrollFrequency),
    frequencyType: mapDropdownOptions(dropdownRows.frequencyType),
    payMode: mapDropdownOptions(dropdownRows.payMode),
    taxTable: mapDropdownOptions(dropdownRows.taxTable),
  }), [dropdownRows]);
  const ynOptions = dropdownOptions.yn;

  const employeeOptionList = useMemo(() => {
    const toEmployeeOption = (row) => ({
      value: row.empNo ?? row.employeeNo ?? row.empCode ?? "",
      label: `${row.empNo ?? row.employeeNo ?? row.empCode ?? ""} - ${row.empName || fullName(row)}`.replace(/^ - /, ""),
    });
    const eligible = (flag) => list.filter((row) => isYesValue(row[flag])).map(toEmployeeOption).filter((option) => option.value);
    return {
      approvers: eligible("approver").length ? eligible("approver") : eligible("approverFlag"),
      supervisors: eligible("supervisorFlag"),
      managers: eligible("managerFlag"),
    };
  }, [list]);

  // Extract necessary fields to prevent full re-renders of the dropdown options on every typing event
  const { app1, app2, app3, supervisor, manager } = employee;
  const approvalOptions = useMemo(() => ({
    app1: withCurrentOption(employeeOptionList.approvers, app1),
    app2: withCurrentOption(employeeOptionList.approvers, app2),
    app3: withCurrentOption(employeeOptionList.approvers, app3),
    supervisor: withCurrentOption(employeeOptionList.supervisors, supervisor),
    manager: withCurrentOption(employeeOptionList.managers, manager),
  }), [app1, app2, app3, supervisor, manager, employeeOptionList]);

  /* ---- validation ---- */
  const missing = useMemo(() => REQUIRED.filter((r) => !String(employee[r.key] ?? "").trim()), [employee]);
  const issues = useMemo(() => {
    const out = missing.map((m) => ({ tab: m.tab, message: `${m.label} is required` }));
    const email = String(employee.emailAddress || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.push({ tab: "Personal", message: "Email Address is not valid" });
    const empNo = String(employee.empNo || "").trim().toUpperCase();
    if (!selected && empNo && list.some((r) => String(r.empNo || "").toUpperCase() === empNo)) {
      out.push({ tab: "Personal", message: `Employee No. ${empNo} already exists` });
    }
    const today = new Date().toISOString().slice(0, 10);
    const birth = dateOnly(employee.birthdate);
    if (birth && birth > today) out.push({ tab: "Personal", message: "Birthdate cannot be in the future" });
    const hired = dateOnly(employee.dateHired);
    [["dateRegularized", "Date Regularized"], ["endContract", "End of Contract"], ["dateResigned", "Date Resigned"], ["dateTerminated", "Date Terminated"]]
      .forEach(([key, label]) => {
        const d = dateOnly(employee[key]);
        if (hired && d && d < hired) out.push({ tab: "Employment", message: `${label} cannot be earlier than Date Hired` });
      });
    return out;
  }, [missing, employee, list, selected]);
  const invalidTabs = useMemo(() => new Set(showErrors ? issues.map((i) => i.tab) : []), [issues, showErrors]);

  /* ---- save ---- */
  const save = useMutation({
    mutationFn: (p) => apiClient.post("/upsertEmployee", p),
    onSuccess: (r) => {
      const x = r.data;
      if (x.errorcount > 0 || x.success === false) return showErrorAlert("Unable to save", x.errormsg || x.message);
      qc.invalidateQueries({ queryKey: ["employeeList"] });
      const savedEmployeeNo = employee.empNo;
      const finish = () => { showSuccessAlert("Success!", "Employee saved successfully."); reset(); };
      if (!photoFile || !savedEmployeeNo) return finish();
      const formData = new FormData();
      formData.append("EMP_NO", savedEmployeeNo);
      formData.append("EMP_PHOTO", photoFile);
      apiClient.post("/uploadEmployeePhoto", formData, { headers: { "Content-Type": "multipart/form-data" } })
        .then(finish)
        .catch((error) => showApiErrorAlert("Photo Upload Error", error));
    },
    onError: (e) => showApiErrorAlert("System Error", e),
  });

  const deleteEmployee = useMutation({
    mutationFn: (payload) => apiClient.post("/deleteEmployee", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0] || response?.data;
      if (Number(result?.errorcount || 0) > 0 || result?.success === false) {
        return showErrorAlert("Unable to delete", result?.errormsg || result?.message || "Employee could not be deleted.");
      }
      qc.invalidateQueries({ queryKey: ["employeeList"] });
      showDeleteRecord("Deleted!", "The employee has been removed from the system.");
      reset();
    },
    onError: (error) => showApiErrorAlert("Delete Error", error),
  });

  const handleSave = useCallback(() => {
    if (viewTab !== "employee") return; /* Ctrl+S on the list view must not save the blank form. */
    if (issues.length) {
      setShowErrors(true);
      setTab(issues[0].tab);
      return showErrorAlert("Please fix the following", issues.map((i) => i.message).join("; ") + ".");
    }
    const empName = employee.empName || fullName(employee);
    save.mutate({
      json_data: JSON.stringify({
        json_data: { employee: { ...employee, empName }, ...details, userCode: user?.USER_CODE || "ADMIN" },
      }),
    });
  }, [issues, employee, details, user, save, viewTab]);

  /* Ctrl/Cmd + S saves. The ref keeps the listener from re-binding on every keystroke. */
  const saveRef = useRef(handleSave);
  useEffect(() => { saveRef.current = handleSave; }, [handleSave]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Warn before closing the tab with unsaved edits. */
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /* ---- load one record ---- */
  const edit = useCallback(async (row) => {
    if (!confirmDiscard()) return;
    try {
      const { data } = await apiClient.get("/getEmployee", { params: { EMP_NO: row.empNo } });
      const raw = data?.data?.[0]?.result;
      if (!raw) return;
      const x = JSON.parse(raw);
      const e = typeof x.employee === "string" ? JSON.parse(x.employee) : x.employee;
      setEmployee({ ...blankEmployee, ...e });
      const photoResponse = await apiClient.get("/getEmployeePhoto", { params: { EMP_NO: row.empNo } }).catch(() => null);
      const photoPayload = photoResponse?.data?.data?.[0]?.result || photoResponse?.data?.data || photoResponse?.data?.result || photoResponse?.data;
      let photoRecord = photoPayload;
      if (typeof photoRecord === "string") {
        try { photoRecord = JSON.parse(photoRecord); } catch { /* use the employee payload below */ }
      }
      const retrievedPhoto = e.employeePhoto || e.photoPath || e.photoUrl || e.empPhoto || e.EMP_PHOTO
        || photoRecord?.employeePhoto || photoRecord?.photoPath || photoRecord?.photoUrl || photoRecord?.EMP_PHOTO || "";
      setPhotoPreview(photoUrl(retrievedPhoto));
      setPhotoFile(null);
      setLookupNames({
        areaName: e.areaName || "", bankName: e.bankName || "", branchName: e.branchName || "",
        clientName: e.clientName || "", deptName: e.deptName || "", statName: e.statName || "",
        groupName: e.groupName || e.payGroupName || "", posName: e.posName || "", shiftName: e.shiftName || "",
      });
      setDetails({
        education: x.education || [], experience: x.experience || [],
        family: x.family || [], dependents: x.dependents || [],
      });
      setSelected(row.empNo); setViewTab("employee"); setTab(TABS[0].id); setDirty(false); setShowErrors(false);
    } catch (err) {
      showApiErrorAlert("Load Employee Error", err);
    }
  }, [photoUrl, confirmDiscard]);

  const handleDelete = useCallback(async (row) => {
    if (!row?.empNo) return;
    const confirm = await showDeleteConfirm(
      "Confirm Delete",
      `Are you sure you want to delete Employee No. ${row.empNo}?`,
    );
    if (!confirm?.isConfirmed) return;
    deleteEmployee.mutate({
      json_data: {
        empNo: row.empNo,
        userCode: user?.USER_CODE || "ADMIN",
      },
    });
  }, [deleteEmployee, user]);

  /* ---- employee directory ---- */
  const columns = useMemo(() => [
    { key: "photo", label: "Photo", render: (r) => (
      <span className="flex h-15 w-15 items-center justify-center overflow-hidden rounded-lg bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
        {(r.employeePhoto || r.photoPath || r.photoUrl)
          ? <img src={photoUrl(r.employeePhoto || r.photoPath || r.photoUrl)} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          : initials(r)}
      </span>
    ) },
    { key: "empNo", label: "Employee No." },
    { key: "empName", label: "Employee Name", render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-100">{r.empName || fullName(r) || "—"}</span> },
    { key: "lastName", label: "Last Name" },
    { key: "firstName", label: "First Name" },
    { key: "middleName", label: "Middle Name" },
    { key: "address1", label: "Address1" },
    { key: "address2", label: "Address2" },
    { key: "civilStatus", label: "Civil Status" },
    { key: "gender", label: "Gender" },
    { key: "rdoCode", label: "Rdo Code" },
    { key: "zipCode", label: "Zip Code" },
    { key: "emailAddress", label: "Email Address" },
    { key: "contactNo", label: "Contact No" },
    { key: "telNo", label: "Tel No" },
    { key: "birthplace", label: "Birthplace" },
    { key: "contactAddress", label: "Contact Address" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "contactRelation", label: "Contact Relation" },
    { key: "contactPhoneno", label: "Contact Phoneno" },
    { key: "yrsService", label: "Years of Service" },
    // { key: "compCode", label: "Comp Code" },
    // { key: "branchCode", label: "Branch Code" },
    { key: "branchName", label: "Branch Name" },
    // { key: "clientCode", label: "Client Code" },
    { key: "clientName", label: "Client Name" },
    // { key: "payGroup", label: "Pay Group" },
    { key: "payGroupName", label: "Pay Group Name" },
    // { key: "deptCode", label: "Dept Code" },
    { key: "deptName", label: "Department Name" },
    // { key: "posCode", label: "Pos Code" },
    { key: "posName", label: "Position Name" },
    // { key: "statCode", label: "Stat Code" },
    { key: "statName", label: "Employment Status" },
    { key: "sgCode", label: "Sg Code" },
    { key: "level", label: "Level" },
    { key: "areaCode", label: "Area Code" },
    { key: "bankCode", label: "Bank Code" },
    { key: "bank2", label: "Bank2" },
    { key: "bankCode2", label: "Bank Code2" },
    { key: "bank2Comp", label: "Bank2 Comp" },
    { key: "bank3", label: "Bank3" },
    { key: "bankCode3", label: "Bank Code3" },
    { key: "bank3Comp", label: "Bank3 Comp" },
    { key: "birthdate", label: "Birthdate", render: (r) => dateOnly(r.birthdate) || "—" },
    { key: "dateHired", label: "Date Hired", render: (r) => dateOnly(r.dateHired) || "—" },
    { key: "dateRegularized", label: "Date Regularized", render: (r) => dateOnly(r.dateRegularized) || "—" },
    { key: "dateResigned", label: "Date Resigned", render: (r) => dateOnly(r.dateResigned) || "—" },
    { key: "dateTerminated", label: "Date Terminated", render: (r) => dateOnly(r.dateTerminated) || "—" },
    { key: "endContract", label: "End Contract", render: (r) => dateOnly(r.endContract) || "—" },
    { key: "payrollFreq", label: "Payroll Frequency" },
    { key: "freqType", label: "Freq Type" },
    { key: "payMode", label: "Pay Mode" },
    { key: "compSss", label: "Comp Sss" },
    { key: "sssFreq", label: "Sss Freq" },
    { key: "compMed", label: "Comp Med" },
    { key: "medFreq", label: "Med Freq" },
    { key: "compTax", label: "Comp Tax" },
    { key: "taxFreq", label: "Tax Freq" },
    { key: "compHdmf", label: "Comp Hdmf" },
    { key: "hdmfFreq", label: "Hdmf Freq" },
    { key: "taxTable", label: "Tax Table" },
    { key: "regHrs", label: "Reg Hrs" },
    { key: "regdaysYear", label: "Regdays Year" },
    { key: "regdaysMonth", label: "Regdays Month" },
    { key: "rendHrs", label: "Rend Hrs" },
    { key: "cutoffHrs", label: "Cutoff Hrs" },
    { key: "hdmfEmp", label: "Hdmf Emp" },
    { key: "hdmfEmpr", label: "Hdmf Empr" },
    { key: "hdmfMax", label: "Hdmf Max" },
    { key: "mpfEmp", label: "Mpf Emp" },
    { key: "ecolaRate", label: "Ecola Rate" },
    { key: "shiftCode", label: "Shift Code" },
    { key: "rd1", label: "Rd1" },
    { key: "rd2", label: "Rd2" },
    { key: "rd3", label: "Rd3" },
    { key: "oldEmpno", label: "Old Empno" },
    { key: "empCode", label: "Emp Code" },
    { key: "rehired", label: "Rehired" },
    { key: "approver", label: "Approver" },
    { key: "app1", label: "App1" },
    { key: "app2", label: "App2" },
    { key: "app3", label: "App3" },
    { key: "supervisor", label: "Supervisor" },
    { key: "manager", label: "Manager" },
    { key: "geofence", label: "Geofence" },
    { key: "hrFlag", label: "Hr Flag" },
    { key: "managerFlag", label: "Manager Flag" },
    { key: "supervisorFlag", label: "Supervisor Flag" },
    { key: "activePort", label: "Active Port" },
    { key: "browser", label: "Browser" },
    { key: "loginTime", label: "Login Time" },
    { key: "active", label: "Record Status", render: (r) => <StatusPill active={isYesValue(r.active)} /> },
    { key: "registeredBy", label: "Registered By" },
    { key: "registeredDate", label: "Registered Date", render: (r) => dateOnly(r.registeredDate) || "—" },
    { key: "updatedBy", label: "Updated By" },
    { key: "updatedDate", label: "Updated Date", render: (r) => dateOnly(r.updatedDate) || "—" },
    { key: "idUpdatedBy", label: "Id Updated By" },
    { key: "idUpdatedDate", label: "Id Updated Date", render: (r) => dateOnly(r.idUpdatedDate) || "—" },
    { key: "srUpdatedBy", label: "Sr Updated By" },
    { key: "srUpdatedDate", label: "Sr Updated Date", render: (r) => dateOnly(r.srUpdatedDate) || "—" },
  ], [photoUrl]);

  const tableColumns = useMemo(() => [
    { key: "__actions", label: "Actions", width: 110, render: (r) => (
      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={() => edit(r)} title="Edit employee" aria-label={`Edit ${r.empNo}`}
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><FontAwesomeIcon icon={faEdit} /></button>
        <button type="button" onClick={() => handleDelete(r)} title="Delete employee" aria-label={`Delete ${r.empNo}`}
          className="rounded-md bg-red-600 px-2.5 py-1.5 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><FontAwesomeIcon icon={faTrashAlt} /></button>
      </div>
    ) },
    ...columns.map((col) => ({
      ...col,
      sortable: !col.render && col.key !== "photo",
      width: col.key === "photo" ? 80 : col.key === "empName" ? 250 : col.key === "emailAddress" ? 220 : col.key === "address1" ? 250: col.key === "address2" ? 250 :col.key === "contactAddress" ? 250: 150,
      minWidth: col.key === "emailAddress" ? 220 : col.minWidth,
    })),
  ], [columns, edit, handleDelete]);

  const directoryOptions = useCallback((valueKey, labelKey) => {
    const options = new Map();
    list.forEach((row) => {
      const value = String(row[valueKey] || "").trim();
      if (!value) return;
      const label = String(row[labelKey] || value).trim();
      if (!options.has(value)) options.set(value, { value, label });
    });
    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [list]);
  const directoryBranches = useMemo(() => directoryOptions("branchCode", "branchName"), [directoryOptions]);
  const directoryPayGroups = useMemo(() => directoryOptions("payGroup", "payGroupName"), [directoryOptions]);
  const directoryDepartments = useMemo(() => directoryOptions("deptCode", "deptName"), [directoryOptions]);
  const directoryPositions = useMemo(() => directoryOptions("posCode", "posName"), [directoryOptions]);
  const directoryEmployeeStatuses = useMemo(() => directoryOptions("statCode", "statName"), [directoryOptions]);
  const filteredEmployees = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return list.filter((r) => {
      if (listStatus !== "ALL" && (isYesValue(r.active) ? "ACTIVE" : "INACTIVE") !== listStatus) return false;
      if (listBranch !== "ALL" && String(r.branchCode || "") !== listBranch) return false;
      if (listPayGroup !== "ALL" && String(r.payGroup || "") !== listPayGroup) return false;
      if (listDepartment !== "ALL" && String(r.deptCode || "") !== listDepartment) return false;
      if (listPosition !== "ALL" && String(r.posCode || "") !== listPosition) return false;
      if (listEmployeeStatus !== "ALL" && String(r.statCode || "") !== listEmployeeStatus) return false;
      return !query || [...Object.values(r), fullName(r)]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [list, listSearch, listStatus, listEmployeeStatus, listBranch, listPayGroup, listDepartment, listPosition]);
  const hasListFilters = listSearch.trim() !== "" || [listStatus, listEmployeeStatus, listBranch, listPayGroup, listDepartment, listPosition].some((value) => value !== "ALL");

  /* ---- tab content ---- */
  const isActive = employee.active === "Y";
  const name = fullName(employee);

  const panels = {
    Personal: (
      <div className="space-y-5">
        <Section title="Identity" hint="Name, birth details and civil status." icon={faUser}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3">
            <F label="Employee No." required value={employee.empNo} disabled={!!selected} onChange={(v) => set("empNo", (v || "").toUpperCase())} />
            <F label="Last Name" required value={employee.lastName} onChange={(v) => set("lastName", v)} />
            <F label="First Name" required value={employee.firstName} onChange={(v) => set("firstName", v)} />
            <F label="Middle Name" value={employee.middleName} onChange={(v) => set("middleName", v)} />
            <F label={`Birthdate${ageFrom(dateOnly(employee.birthdate)) ? ` (Age ${ageFrom(dateOnly(employee.birthdate))})` : ""}`} type="date" value={dateOnly(employee.birthdate)} onChange={(v) => set("birthdate", v)} />
            <F label="Birthplace" value={employee.birthplace} onChange={(v) => set("birthplace", v)} />
            <F label="Gender" type="select" options={dropdownOptions.gender} value={employee.gender} onChange={(v) => set("gender", v)} />
            <F label="Civil Status" type="select" options={dropdownOptions.civilStatus} value={employee.civilStatus} onChange={(v) => set("civilStatus", v)} />
          </Grid>
        </Section>
        <Section title="Contact & address" hint="Where and how to reach the employee." icon={faAddressCard}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3">
            <Fields data={employee} set={set} specs={[
              ["Address 1", "address1"],
              ["Address 2", "address2"],
              ["ZIP Code", "zipCode"],
              ["Email Address", "emailAddress"],
              ["Mobile No.", "contactNo"],
              ["Telephone No.", "telNo"],
            ]} />
            <Subhead>Emergency contact</Subhead>
            <Fields data={employee} set={set} specs={[
              ["Contact Person", "contactPerson"],
              ["Relationship", "contactRelation"],
              ["Contact No.", "contactPhoneno"],
              ["Contact Address", "contactAddress"],
            ]} />
          </Grid>
        </Section>
      </div>
    ),

    Employment: (
      <Section title="Employment details" hint="Assignment, status and key dates." icon={faBriefcase}>
        <Grid>
          <div className="space-y-6">
            <FieldRenderer label="Branch" type="lookup" readOnly editableLookup value={displayLookup("branchCode", "branchName")} onLookup={() => setShowBranchModal(true)} onClear={() => clearLookup("branchCode", "branchName")} />
            <FieldRenderer label="Client" type="lookup" readOnly editableLookup value={displayLookup("clientCode", "clientName")} onLookup={() => setShowClientModal(true)} onClear={() => clearLookup("clientCode", "clientName")} />
            <FieldRenderer label="Department" type="lookup" readOnly editableLookup value={displayLookup("deptCode", "deptName")} onLookup={() => setShowDepartmentModal(true)} onClear={() => clearLookup("deptCode", "deptName")} />
            <FieldRenderer label="Position" type="lookup" readOnly editableLookup value={displayLookup("posCode", "posName")} onLookup={() => setShowPositionModal(true)} onClear={() => clearLookup("posCode", "posName")} />
            <FieldRenderer label="Employment Status" type="lookup" readOnly editableLookup value={displayLookup("statCode", "statName")} onLookup={() => setShowEmployeeStatusModal(true)} onClear={() => clearLookup("statCode", "statName")} />
            <FieldRenderer label="Pay Group" type="lookup" readOnly editableLookup value={displayLookup("payGroup", "groupName")} onLookup={() => setShowPayGroupModal(true)} onClear={() => clearLookup("payGroup", "groupName")} />
            <Fields data={employee} set={set} specs={EMPLOYMENT_LEFT} />
          </div>
          <div className="space-y-6">
            <FieldRenderer
              label="Area"
              type="lookup"
              readOnly
              editableLookup
              value={areaDisplayValue}
              onLookup={() => setShowAreaModal(true)}
              onClear={() => clearLookup("areaCode", "areaName")}
            />
            <Fields data={employee} set={set} specs={EMPLOYMENT_DATES} />
            <F label="Years of Service" value={employee.yrsService} disabled onChange={() => {}} />
            <F label="Old Employee No." value={employee.oldEmpno} onChange={(v) => set("oldEmpno", v)} />
            <F label="Rehired" type="select" options={ynOptions} value={employee.rehired} onChange={(v) => set("rehired", v)} />
            <F label="Active" type="select" options={ynOptions} value={employee.active} onChange={(v) => set("active", v)} />
          </div>
        </Grid>
      </Section>
    ),

    Payroll: (
      <div className="space-y-5">
        <Section title="Payroll setup" icon={faMoneyBillWave}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-4"><Fields data={employee} set={set} specs={specsWithOptions(PAYROLL_SETUP, { payrollFreq: dropdownOptions.payrollFrequency, freqType: dropdownOptions.frequencyType, payMode: dropdownOptions.payMode, taxTable: dropdownOptions.taxTable })} /></Grid>
        </Section>
        <Section title="Rates & hours" icon={faMoneyBillWave}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-4"><Fields data={employee} set={set} specs={PAYROLL_RATES} /></Grid>
        </Section>
        <Section title="Allowances" icon={faMoneyBillWave}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3"><Fields data={employee} set={set} specs={PAYROLL_ALLOW} /></Grid>
        </Section>
        <Section title="Total package" hint="Salary plus allowances." icon={faMoneyBillWave}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3"><Fields data={employee} set={set} specs={PAYROLL_TOTALS} /></Grid>
        </Section>
      </div>
    ),

    "Government & Bank": (
      <div className="space-y-5">
        <Section title="Government IDs" icon={faLandmark}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3"><Fields data={employee} set={set} specs={GOVT_IDS} /></Grid>
        </Section>
        <Section title="Contributions & tax" hint="Choose which deductions are computed for this employee." icon={faLandmark}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-4"><Fields data={employee} set={set} specs={specsWithOptions(GOVT_COMPUTE, { compSss: ynOptions, compMed: ynOptions, compTax: ynOptions, compHdmf: ynOptions })} /></Grid>
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Subhead>Deduction frequency</Subhead>
            <Grid columns="md:grid-cols-2 xl:grid-cols-4"><Fields data={employee} set={set} specs={specsWithOptions(GOVT_FREQ, {
              sssFreq: withCurrentOption(dropdownOptions.frequencyType, employee.sssFreq),
              medFreq: withCurrentOption(dropdownOptions.frequencyType, employee.medFreq),
              taxFreq: withCurrentOption(dropdownOptions.frequencyType, employee.taxFreq),
              hdmfFreq: withCurrentOption(dropdownOptions.frequencyType, employee.hdmfFreq),
            })} /></Grid>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Subhead>Contribution amounts & rates</Subhead>
            <Grid columns="md:grid-cols-2 xl:grid-cols-5"><Fields data={employee} set={set} specs={GOVT_RATES} /></Grid>
          </div>
        </Section>
        <Section title="Bank" icon={faLandmark}>
          <Grid>
            <FieldRenderer label="Primary Bank" type="lookup" readOnly editableLookup value={displayLookup("bankCode", "bankName")} onLookup={() => setShowBankModal(true)} onClear={() => clearLookup("bankCode", "bankName")} />
            <F label="Primary Account No." value={employee.bankAcct} onChange={(v) => set("bankAcct", v)} />
          </Grid>
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Subhead>Additional bank accounts</Subhead>
            <Grid columns="md:grid-cols-2 xl:grid-cols-4"><Fields data={employee} set={set} specs={BANK_EXTRA} /></Grid>
          </div>
        </Section>
      </div>
    ),

    Schedule: (
      <Section title="Work schedule" hint="Default shift, rest days and location rules." icon={faCalendarDays}>
        <Grid columns="md:grid-cols-2 xl:grid-cols-3">
          <FieldRenderer label="Default Shift" type="lookup" readOnly editableLookup value={displayLookup("shiftCode", "shiftName")} onLookup={() => setShowShiftModal(true)} onClear={() => clearLookup("shiftCode", "shiftName")} />
          <F label="Geofence Required" type="select" options={ynOptions} value={employee.geofence} onChange={(v) => set("geofence", v)} />
          <span className="hidden xl:block" />
          <F label="Rest Day 1" type="select" options={DAYS} value={employee.rd1} onChange={(v) => set("rd1", v)} />
          <F label="Rest Day 2" type="select" options={DAYS} value={employee.rd2} onChange={(v) => set("rd2", v)} />
          <F label="Rest Day 3" type="select" options={DAYS} value={employee.rd3} onChange={(v) => set("rd3", v)} />
        </Grid>
      </Section>
    ),

    "Access & Approval": (
      <div className="space-y-5">
        <Section title="Portal access" icon={faShieldHalved}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3">
            <Fields data={employee} set={set} specs={specsWithOptions(ACCESS_FLAGS, { activePort: ynOptions, hrFlag: ynOptions, approver: ynOptions, supervisorFlag: ynOptions, managerFlag: ynOptions })} />
            <F label="Employee Portal Code" value={employee.empCode} onChange={(v) => set("empCode", v)} />
            <F label="PIN" type="password" value={employee.askappPin} onChange={(v) => set("askappPin", v)} />
            <F label="Portal Password" type="password" value={employee.askappPw} onChange={(v) => set("askappPw", v)} />
          </Grid>
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Subhead>Last portal session (read-only)</Subhead>
            <Grid columns="md:grid-cols-2 xl:grid-cols-3">
              <F label="Browser" value={employee.browser} disabled onChange={() => {}} />
              <F label="Last Login" value={employee.loginTime} disabled onChange={() => {}} />
            </Grid>
          </div>
        </Section>
        <Section title="Approval chain" icon={faShieldHalved}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3"><Fields data={employee} set={set} specs={[
            ["Approver 1", "app1", { type: "select", options: approvalOptions.app1 }],
            ["Approver 2", "app2", { type: "select", options: approvalOptions.app2 }],
            ["Approver 3", "app3", { type: "select", options: approvalOptions.app3 }],
            ["Supervisor", "supervisor", { type: "select", options: approvalOptions.supervisor }],
            ["Manager", "manager", { type: "select", options: approvalOptions.manager }],
          ]} /></Grid>
        </Section>
      </div>
    ),

    "History & Family": (
      <div className="space-y-5">
        <DetailGrid title="Education" rows={details.education} setRows={(v) => setDetail("education", v)}
          fields={[{ key: "level", label: "Level" }, { key: "school", label: "School" }, { key: "from", label: "From" }, { key: "to", label: "To" }, { key: "degree", label: "Degree" }, { key: "remarks", label: "Remarks" }]} />
        <DetailGrid title="Employment experience" rows={details.experience} setRows={(v) => setDetail("experience", v)}
          fields={[{ key: "company", label: "Company" }, { key: "position", label: "Position" }, { key: "from", label: "From" }, { key: "to", label: "To" }, { key: "leaveReason", label: "Leave Reason" }, { key: "remarks", label: "Remarks" }]} />
        <DetailGrid title="Family" rows={details.family} setRows={(v) => setDetail("family", v)}
          fields={relationFields("family")} autoAge={{ birthKey: "familyBirthdate", ageKey: "familyAge" }} />
        <DetailGrid title="Dependents" rows={details.dependents} setRows={(v) => setDetail("dependents", v)}
          fields={relationFields("dependent")} autoAge={{ birthKey: "dependentBirthdate", ageKey: "dependentAge" }} />
      </div>
    ),
  };

  /* ---- render ---- */
  const photoSrc = photoPreview || photoUrl(employee.employeePhoto);
  const showPhoto = !!photoSrc && brokenPhoto !== photoSrc;
  const inputCls = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-100";

  return (
    <div className="global-ref-main-div-ui">
      {(isLoading || isDropdownLoading || save.isPending || deleteEmployee.isPending) && <LoadingSpinner />}

      {/* Page header: title left, view tabs center, actions right. */}
      <div className="global-ref-header-ui mb-4">
        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)]">
          <div className="min-w-0">
            <h1 className="global-ref-headertext-ui">Employee Masterdata</h1>
          </div>
          <div className="flex justify-center lg:justify-self-center">
            <TabList tabs={VIEW_TABS} value={viewTab} onChange={setViewTab} label="Employee views" variant="pill" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 lg:justify-self-end">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600" role="status">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Unsaved changes
              </span>
            )}
            <ButtonBar buttons={[
              { key: "add", label: "Add", icon: faPlus, onClick: () => { if (!confirmDiscard()) return; reset(); setViewTab("employee"); } },
              { key: "save", label: "Save", icon: faSave, onClick: handleSave, disabled: save.isPending || viewTab !== "employee" },
              { key: "reset", label: "Reset", icon: faUndo, onClick: () => { if (confirmDiscard()) reset(); }, disabled: viewTab !== "employee" },
              ...(selected && viewTab === "employee" ? [{ key: "delete", label: "Delete", icon: faTrashAlt, onClick: () => handleDelete({ empNo: employee.empNo }), disabled: deleteEmployee.isPending }] : []),
            ]} />
          </div>
        </div>
      </div>

      {viewTab === "employee" && <div className="global-ref-tab-div-ui space-y-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
          {/* Photo panel and record summary */}
          <div className="grid gap-4 p-4 lg:grid-cols-[245px_minmax(0,1fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Employee Photo</h2>
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-6xl font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Upload or change employee photo" aria-label="Upload or change employee photo">
                {showPhoto
                  ? <img src={photoSrc} alt={`${name || "Employee"} photo`} className="h-full w-full object-cover" onError={() => setBrokenPhoto(photoSrc)} />
                  : initials(employee)}
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <FontAwesomeIcon icon={faCamera} className="mr-1" /> Change photo
                </span>
              </button>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} aria-label="Upload employee photo" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <FontAwesomeIcon icon={faCamera} className="mr-1.5" /> {showPhoto ? "Change Photo" : "Upload Photo"}
                </button>
                {photoFile && (
                  <button type="button" title="Discard unsaved photo selection"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(selected ? photoUrl(employee.employeePhoto) : ""); if (photoInputRef.current) photoInputRef.current.value = ""; }}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                    <FontAwesomeIcon icon={faTimes} className="mr-1" /> Discard
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">JPG, PNG, or WebP · Max 5 MB</p>
              {photoFile && <p className="mt-1 truncate text-center text-[11px] text-blue-600" title={photoFile.name}>{photoFile.name} (pending save)</p>}
            </section>

            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="truncate text-xl font-bold text-slate-800 dark:text-slate-100">{name || "New employee"}</h2>
                <StatusPill active={isActive} />
                {employee.rehired === "Y" && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Rehired</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">{selected ? `Employee No. ${employee.empNo}` : "Complete the employee information below."}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Fact label="Department" value={lookupName("deptCode", "deptName")} />
                <Fact label="Position" value={lookupName("posCode", "posName")} />
                <Fact label="Employment status" value={lookupName("statCode", "statName")} />
                <Fact label="Branch" value={lookupName("branchCode", "branchName")} />
                <Fact label="Date hired" value={dateOnly(employee.dateHired)} />
                <Fact label="Length of service" value={tenureFrom(dateOnly(employee.dateHired))} />
              </dl>
              {(employee.emailAddress || employee.contactNo) && (
                <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
                  {employee.emailAddress && <a href={`mailto:${employee.emailAddress}`} className="hover:text-blue-600"><FontAwesomeIcon icon={faEnvelope} className="mr-1.5" />{employee.emailAddress}</a>}
                  {employee.contactNo && <a href={`tel:${employee.contactNo}`} className="hover:text-blue-600"><FontAwesomeIcon icon={faPhone} className="mr-1.5" />{employee.contactNo}</a>}
                </div>
              )}
            </section>
          </div>

          {showErrors && issues.length > 0 && (
            <div role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
              <div>
                <p className="font-semibold">Fix the following before saving:</p>
                <ul className="mt-1 list-disc pl-4">
                  {issues.map((i) => <li key={`${i.tab}-${i.message}`}><button type="button" className="underline-offset-2 hover:underline" onClick={() => setTab(i.tab)}>{i.message}</button> <span className="opacity-60">({i.tab})</span></li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Section tabs */}
          <TabList tabs={TABS} value={tab} onChange={setTab} label="Employee sections" invalidTabs={invalidTabs}
            className="sticky top-0 z-10 border-t bg-white px-6 py-1 dark:bg-gray-800" />

          <div role="tabpanel" aria-labelledby={tabDomId(tab)} className="bg-slate-50/60 p-5 dark:bg-gray-900/30">{panels[tab]}</div>

          <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-700">
            <RegistrationInfo
              layout="straight"
              data={{
                registeredBy: employee.registeredBy,
                registeredDate: employee.registeredDate,
                lastUpdatedBy: employee.updatedBy,
                lastUpdatedDate: employee.updatedDate,
              }}
            />
          </div>
        </div>
      </div>}

      {/* Employee directory */}
      {viewTab === "list" && (
        <section className="mt-28 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-gray-800">
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Search any employee information…"
                aria-label="Search employees" className={`${inputCls} w-full pl-9`} />
            </div>
            <select value={listStatus} onChange={(e) => setListStatus(e.target.value)} aria-label="Filter by record status" className={inputCls}>
              <option value="ALL">All record statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select value={listBranch} onChange={(e) => setListBranch(e.target.value)} aria-label="Filter by branch" className={inputCls}>
              <option value="ALL">All branches</option>
              {directoryBranches.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={listPayGroup} onChange={(e) => setListPayGroup(e.target.value)} aria-label="Filter by payroll group" className={inputCls}>
              <option value="ALL">All payroll groups</option>
              {directoryPayGroups.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={listDepartment} onChange={(e) => setListDepartment(e.target.value)} aria-label="Filter by department" className={inputCls}>
              <option value="ALL">All departments</option>
              {directoryDepartments.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={listPosition} onChange={(e) => setListPosition(e.target.value)} aria-label="Filter by position" className={inputCls}>
              <option value="ALL">All positions</option>
              {directoryPositions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={listEmployeeStatus} onChange={(e) => setListEmployeeStatus(e.target.value)} aria-label="Filter by employee status" className={inputCls}>
              <option value="ALL">All employee statuses</option>
              {directoryEmployeeStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {hasListFilters && (
              <button type="button" onClick={() => { setListSearch(""); setListStatus("ALL"); setListEmployeeStatus("ALL"); setListBranch("ALL"); setListPayGroup("ALL"); setListDepartment("ALL"); setListPosition("ALL"); }}
                className="text-xs font-medium text-blue-600 hover:underline">Clear filters</button>
            )}
            <span className="text-xs text-slate-500" role="status">
              {filteredEmployees.length === list.length ? `${list.length} employees` : `${filteredEmployees.length} of ${list.length} employees`}
            </span>

          </div>

          <SearchGlobalReferenceTable
            docType="Employee"
            columns={tableColumns}
            data={filteredEmployees}
            isLoading={isLoading}
            onRowDoubleClick={edit}
            itemsPerPage={500}
            autoFillGrid="True"
            tableHeight="calc(100vh - 340px)"
            recordPadding="8px 8px"
            recordSpacing="0px"
          />
        </section>
      )}

      <AreaLookupModal
        isOpen={showAreaModal}
        onClose={(area) => {
          if (area) chooseLookup("areaCode", "areaName", area);
          setShowAreaModal(false);
        }}
      />
      <BranchLookupModal
        isOpen={showBranchModal}
        onClose={(branch) => {
          if (branch) chooseLookup("branchCode", "branchName", branch);
          setShowBranchModal(false);
        }}
      />
      <BankLookupModal isOpen={showBankModal} onClose={(row) => { if (row) chooseLookup("bankCode", "bankName", row); setShowBankModal(false); }} />
      <ClientLookupModal isOpen={showClientModal} onClose={(row) => { if (row) chooseLookup("clientCode", "clientName", row); setShowClientModal(false); }} />
      <DepartmentLookupModal isOpen={showDepartmentModal} onClose={(row) => { if (row) chooseLookup("deptCode", "deptName", row); setShowDepartmentModal(false); }} />
      <EmployeeStatusLookupModal isOpen={showEmployeeStatusModal} onClose={(row) => { if (row) chooseLookup("statCode", "statName", row); setShowEmployeeStatusModal(false); }} />
      <PayGroupLookupModal isOpen={showPayGroupModal} onClose={(row) => { if (row) chooseLookup("payGroup", "groupName", row); setShowPayGroupModal(false); }} />
      <PositionLookupModal isOpen={showPositionModal} onClose={(row) => { if (row) chooseLookup("posCode", "posName", row); setShowPositionModal(false); }} />
      <ShiftLookupModal isOpen={showShiftModal} onClose={(row) => { if (row) chooseLookup("shiftCode", "shiftName", row); setShowShiftModal(false); }} />
    </div>
  );
}
