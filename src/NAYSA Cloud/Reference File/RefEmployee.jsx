import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faSave, faUndo, faTrashAlt, faEdit, faUser, faBriefcase, faMoneyBillWave,
  faLandmark, faCalendarDays, faShieldHalved, faPeopleGroup, faTriangleExclamation, faAddressCard,
} from "@fortawesome/free-solid-svg-icons";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
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

const isYesValue = (value) => ["Y", "YES", "1", "TRUE"].includes(String(value ?? "").trim().toUpperCase());

/* Required fields, and the tab each one lives on (drives the error dots). */
const REQUIRED = [
  { key: "empNo", label: "Employee No.", tab: "Personal" },
  { key: "lastName", label: "Last Name", tab: "Personal" },
  { key: "firstName", label: "First Name", tab: "Personal" },
];

const blankEmployee = {
  empNo: "", empName: "", lastName: "", firstName: "", middleName: "", address1: "", address2: "", civilStatus: "", gender: "", rdoCode: "", zipCode: "", emailAddress: "", contactNo: "", telNo: "", birthplace: "", contactAddress: "", contactPerson: "", contactRelation: "", contactPhoneno: "",
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

const TabButton = ({ active, icon, label, onClick, invalid }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`relative inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active
        ? "border-blue-600 text-blue-600 dark:text-blue-400"
        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    }`}
  >
    <FontAwesomeIcon icon={icon} />
    {label}
    {invalid && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Has missing required fields" />}
  </button>
);

const Fact = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] text-slate-400">{label}</dt>
    <dd className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value || "—"}</dd>
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
  ["Company", "compCode"], ["Branch", "branchCode"], ["Client", "clientCode"], ["Pay Group", "payGroup"],
  ["Department", "deptCode"], ["Position", "posCode"], ["Employment Status", "statCode"],
  ["Salary Grade", "sgCode"], ["Level", "level"],
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
const GOVT_IDS = [
  ["TIN", "tin"], ["RDO Code", "rdoCode"], ["SSS No.", "sssNo"], ["PhilHealth No.", "phNo"], ["HDMF No.", "hdmfNo"], ["UMID", "umid"],
];
const GOVT_COMPUTE = [
  ["Compute SSS", "compSss", { options: YN, type: "select" }], ["Compute PhilHealth", "compMed", { options: YN, type: "select" }],
  ["Compute Tax", "compTax", { options: YN, type: "select" }], ["Compute HDMF", "compHdmf", { options: YN, type: "select" }],
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

  const [tab, setTab] = useState(TABS[0].id);
  const [employee, setEmployee] = useState(blankEmployee);
  const [details, setDetails] = useState(emptyDetails);
  const [selected, setSelected] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const set = useCallback((k, v) => { setEmployee((p) => ({ ...p, [k]: v })); setDirty(true); }, []);
  const setDetail = useCallback((k, v) => { setDetails((p) => ({ ...p, [k]: v })); setDirty(true); }, []);

  const reset = useCallback(() => {
    setEmployee(blankEmployee); setDetails(emptyDetails);
    setSelected(null); setTab(TABS[0].id); setDirty(false); setShowErrors(false);
  }, []);

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
  const invalidTabs = useMemo(() => new Set(showErrors ? missing.map((m) => m.tab) : []), [missing, showErrors]);

  /* ---- save ---- */
  const save = useMutation({
    mutationFn: (p) => apiClient.post("/upsertEmployee", p),
    onSuccess: (r) => {
      const x = r.data;
      if (x.errorcount > 0 || x.success === false) return showErrorAlert("Unable to save", x.errormsg || x.message);
      qc.invalidateQueries({ queryKey: ["employeeList"] });
      showSuccessAlert("Success!", "Employee saved successfully.");
      reset();
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
    if (missing.length) {
      setShowErrors(true);
      setTab(missing[0].tab);
      return showErrorAlert("Missing Required Field(s)", `${missing.map((m) => m.label).join(", ")} ${missing.length > 1 ? "are" : "is"} required.`);
    }
    const empName = employee.empName || fullName(employee);
    save.mutate({
      json_data: JSON.stringify({
        json_data: { employee: { ...employee, empName }, ...details, userCode: user?.USER_CODE || "ADMIN" },
      }),
    });
  }, [missing, employee, details, user, save]);

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

  /* ---- load one record ---- */
  const edit = useCallback(async (row) => {
    try {
      const { data } = await apiClient.get("/getEmployee", { params: { EMP_NO: row.empNo } });
      const raw = data?.data?.[0]?.result;
      if (!raw) return;
      const x = JSON.parse(raw);
      const e = typeof x.employee === "string" ? JSON.parse(x.employee) : x.employee;
      setEmployee({ ...blankEmployee, ...e });
      setDetails({
        education: x.education || [], experience: x.experience || [],
        family: x.family || [], dependents: x.dependents || [],
      });
      setSelected(row.empNo); setTab(TABS[0].id); setDirty(false); setShowErrors(false);
    } catch (err) {
      showApiErrorAlert("Load Employee Error", err);
    }
  }, []);

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

  /* ---- list columns ---- */
  const columns = useMemo(() => [
    {
      key: "__a", label: "Actions", width: 110,
      render: (r) => (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => edit(r)}
            aria-label={`Edit ${r.empNo}`}
            className="flex h-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 px-2 text-xs text-blue-600 transition-all hover:bg-blue-600 hover:text-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} />
            <span className="md:hidden">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(r)}
            aria-label={`Delete ${r.empNo}`}
            className="flex h-7 items-center justify-center rounded-md border border-red-100 bg-red-50 px-2 text-xs text-red-600 transition-all hover:bg-red-600 hover:text-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
            title="Delete"
          >
            <FontAwesomeIcon icon={faTrashAlt} />
            <span className="md:hidden">Delete</span>
          </button>
        </div>
      ),
    },
    { key: "empNo", label: "Employee No.", sortable: true, width: 120, requiredVisible: true },
    { key: "empName", label: "Employee Name", sortable: true, width: 260, requiredVisible: true },
    { key: "branchCode", label: "Branch", width: 100 },
    { key: "deptCode", label: "Department", width: 120 },
    { key: "posCode", label: "Position", width: 120 },
    { key: "statCode", label: "Status", width: 100 },
    { key: "active", label: "Active", width: 90, render: (r) => <StatusPill active={String(r.active).toUpperCase() === "Y"} /> },
  ], [edit, handleDelete]);

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
            <F label="Birthdate" type="date" value={dateOnly(employee.birthdate)} onChange={(v) => set("birthdate", v)} />
            <F label="Birthplace" value={employee.birthplace} onChange={(v) => set("birthplace", v)} />
            <F label="Gender" type="select" options={dropdownOptions.gender} value={employee.gender} onChange={(v) => set("gender", v)} />
            <F label="Civil Status" type="select" options={dropdownOptions.civilStatus} value={employee.civilStatus} onChange={(v) => set("civilStatus", v)} />
          </Grid>
        </Section>
        <Section title="Contact & address" hint="Where and how to reach the employee." icon={faAddressCard}>
          <Grid columns="md:grid-cols-2 xl:grid-cols-3">
            <Fields data={employee} set={set} specs={[
              ["Address 1", "address1"], ["Address 2", "address2"], ["ZIP Code", "zipCode"],
              ["Email Address", "emailAddress"], ["Mobile No.", "contactNo"], ["Telephone No.", "telNo"],
            ]} />
            <Subhead>Emergency contact</Subhead>
            <Fields data={employee} set={set} specs={[
              ["Contact Person", "contactPerson"], ["Relationship", "contactRelation"], ["Contact No.", "contactPhoneno"],
            ]} />
          </Grid>
        </Section>
      </div>
    ),

    Employment: (
      <Section title="Employment details" hint="Assignment, status and key dates." icon={faBriefcase}>
        <Grid>
          <div className="space-y-4"><Fields data={employee} set={set} specs={EMPLOYMENT_LEFT} /></div>
          <div className="space-y-4">
            <F label="Area" type="select" options={areaOptions} value={employee.areaCode} onChange={(v) => set("areaCode", v)} />
            <Fields data={employee} set={set} specs={EMPLOYMENT_DATES} />
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
            <Grid columns="md:grid-cols-2 xl:grid-cols-5"><Fields data={employee} set={set} specs={GOVT_RATES} /></Grid>
          </div>
        </Section>
        <Section title="Bank" icon={faLandmark}>
          <Grid><Fields data={employee} set={set} specs={[["Primary Bank", "bankCode"], ["Primary Account No.", "bankAcct"]]} /></Grid>
        </Section>
      </div>
    ),

    Schedule: (
      <Section title="Work schedule" hint="Default shift, rest days and location rules." icon={faCalendarDays}>
        <Grid columns="md:grid-cols-2 xl:grid-cols-3">
          <F label="Default Shift" value={employee.shiftCode} onChange={(v) => set("shiftCode", v)} />
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
            <F label="PIN" value={employee.askappPin} onChange={(v) => set("askappPin", v)} />
          </Grid>
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
  return (
    <div className="global-ref-main-div-ui">
      {(isLoading || isDropdownLoading || save.isPending || deleteEmployee.isPending) && <LoadingSpinner />}

      {/* Page header */}
      <div className="global-ref-header-ui mb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="global-ref-headertext-ui">Employee Masterdata</h1>
            <p className="mt-1 text-xs text-slate-500">
              Create and maintain employee personal, employment, payroll, and access information.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600" role="status">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Unsaved changes
              </span>
            )}
            <ButtonBar
              buttons={[
                { key: "add", label: "Add", icon: faPlus, onClick: reset },
                { key: "save", label: "Save", icon: faSave, onClick: handleSave, disabled: save.isPending },
                { key: "reset", label: "Reset", icon: faUndo, onClick: reset },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="global-ref-tab-div-ui mt-24 space-y-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
          {/* Record summary */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white"
              >
                {initials(employee)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {name || "New employee"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{selected ? `Employee No. ${employee.empNo}` : "Not yet saved"}</span>
                  <StatusPill active={isActive} />
                </div>
              </div>
            </div>

            <dl className="ml-auto grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              <Fact label="Department" value={employee.deptCode} />
              <Fact label="Position" value={employee.posCode} />
              <Fact label="Date hired" value={dateOnly(employee.dateHired)} />
              <Fact label="Length of service" value={tenureFrom(dateOnly(employee.dateHired))} />
            </dl>
          </div>

          {showErrors && missing.length > 0 && (
            <div role="alert" className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
              <span>Complete the required fields before saving: {missing.map((m) => m.label).join(", ")}.</span>
            </div>
          )}

          {/* Tabs */}
          <div role="tablist" className="sticky top-0 z-10 overflow-x-auto border-y border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-gray-800">
            <div className="flex min-w-max">
              {TABS.map((t) => (
                <TabButton key={t.id} label={t.id} icon={t.icon} active={tab === t.id} invalid={invalidTabs.has(t.id)} onClick={() => setTab(t.id)} />
              ))}
            </div>
          </div>

          <div className="bg-slate-50/60 p-5 dark:bg-gray-900/30">{panels[tab]}</div>

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
      </div>

      {/* List */}
      <div className="global-tran-table-main-div-ui mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Employee list <span className="ml-1 font-normal text-slate-400">({list.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Double-click a row or use the edit action to open a record.</span>
        </div>
        <SearchGlobalReferenceTable
          docType="Employee"
          columns={columns}
          data={list}
          isLoading={isLoading}
          onRowDoubleClick={edit}
          itemsPerPage={50}
          autoFillGrid="True"
        />
      </div>
    </div>
  );
}
