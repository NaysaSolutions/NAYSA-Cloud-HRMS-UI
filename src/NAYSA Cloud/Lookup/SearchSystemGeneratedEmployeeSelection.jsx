/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faEraser,
  faMagnifyingGlass,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalValidationAlert as showValidationAlert,
  useSwalErrorAlert as showErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  parseSystemGeneratedReferences,
  parseSystemGeneratedResult,
} from "@/NAYSA Cloud/Global/systemGenerated.js";

/*
  Same API and selection contract as SearchSystemGeneratedEmployeeSelection.jsx;
  both API calls are cached using TanStack Query:
    GET  /systemGeneratedTransactions/selectionReferences
    POST /systemGeneratedTransactions/selectionEmployees
    onClose({ employees, edCodes })

  UI based on SearchVendMast.jsx.
  allowedEdCodes is optional; OED uses it to restrict the right-hand code table
  to active REF_ED codes matching the selected header category (EARN/DED).
*/

const EMPLOYEE_COLUMNS = [
  { key: "empNo", label: "Emp No.", width: "115px" },
  { key: "empName", label: "Employee Name", width: "230px" },
  { key: "branchName", label: "Branch", width: "135px" },
  { key: "groupName", label: "Payroll Group", width: "135px" },
  { key: "deptName", label: "Department", width: "145px" },
  { key: "posName", label: "Position", width: "135px" },
  { key: "statName", label: "Employee Status", width: "125px" },
];
const CODE_COLUMNS = [
  { key: "code", label: "ED Code", width: "115px" },
  { key: "description", label: "Description", width: "230px" },
];
const EMPTY_FILTERS = {
  groupCode: "", branchCode: "", deptCode: "", clientCode: "",
  employeeStatus: "", posCode: "", employeeNo: "",
};
const EMPTY_REFERENCES = {
  branches: [], payGroups: [], departments: [], clients: [],
  statuses: [], positions: [], edCodes: [],
};
const normalized = (value) => String(value ?? "").trim().toLowerCase();
const matches = (value, search, mode = "part") => {
  const q = normalized(search);
  if (!q) return true;
  const data = normalized(value);
  return mode === "start" ? data.startsWith(q) : data.includes(q);
};
const sortList = (items, sort) => {
  if (!sort.key) return items;
  return [...items].sort((a, b) => {
    const result = String(a[sort.key] ?? "").localeCompare(
      String(b[sort.key] ?? ""), undefined, { numeric: true, sensitivity: "base" },
    );
    return sort.direction === "desc" ? -result : result;
  });
};

const FilterField = ({ label, value, options, onChange, disabled }) => (
  <label className="block min-w-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
    <span className="mb-1 block">{label}</span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
    >
      <option value="">All {label === "Payroll Group" ? "Payroll Groups" : label === "Employee Status" ? "Employee Statuses" : `${label}s`}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const SearchSystemGeneratedEmployeeSelection = ({
  isOpen,
  payFrequency,
  cutoffCode,
  onClose,
  allowedEdCodes,
}) => {
  const { user, currentUserRow, companyInfo } = useAuth();
  // Keep the cached lookups separate for each signed-in user / company.
  const cacheScope = [
    String(companyInfo?.compCode ?? companyInfo?.COMP_CODE ?? companyInfo?.companyCode ?? ""),
    String(user?.USER_CODE ?? user?.userCode ?? currentUserRow?.userCode ?? ""),
  ];
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // UI controls are draft values until the user presses Load Employees.
  // This preserves the original server-side filtering behavior.
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedEmpNos, setSelectedEmpNos] = useState(new Set());
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [searchMode, setSearchMode] = useState("part");
  const [employeeColumnFilters, setEmployeeColumnFilters] = useState({});
  const [codeColumnFilters, setCodeColumnFilters] = useState({});
  const [employeeSort, setEmployeeSort] = useState({ key: "empNo", direction: "asc" });
  const [codeSort, setCodeSort] = useState({ key: "code", direction: "asc" });
  const lastAlertRef = useRef({ references: 0, employees: 0 });

  // Cached across modal close/reopen, with no API call while cache is fresh.
  const referencesQuery = useQuery({
    queryKey: ["systemGeneratedTransactions", "selectionReferences", ...cacheScope],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get(
        "/systemGeneratedTransactions/selectionReferences",
        { signal },
      );
      return { ...EMPTY_REFERENCES, ...parseSystemGeneratedReferences(response) };
    },
    enabled: Boolean(isOpen),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const employeesQuery = useQuery({
    queryKey: [
      "systemGeneratedTransactions", "selectionEmployees", ...cacheScope,
      payFrequency || "", cutoffCode || "", appliedFilters,
    ],
    queryFn: async ({ signal }) => {
      const response = await apiClient.post(
        "/systemGeneratedTransactions/selectionEmployees",
        {
          jsonData: {
            groupCode: appliedFilters.groupCode || null,
            branchCode: appliedFilters.branchCode || null,
            deptCode: appliedFilters.deptCode || null,
            clientCode: appliedFilters.clientCode || null,
            employeeStatus: appliedFilters.employeeStatus || null,
            posCode: appliedFilters.posCode || null,
            employeeNo: appliedFilters.employeeNo || null,
            payFrequency,
            cutoffCode,
          },
        },
        { signal },
      );
      const list = parseSystemGeneratedResult(response);
      if (!Array.isArray(list)) {
        throw new Error("The System Generated service returned an invalid employee list.");
      }
      return list;
    },
    enabled: Boolean(isOpen && payFrequency && cutoffCode),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const references = referencesQuery.data ?? EMPTY_REFERENCES;
  const employees = employeesQuery.data ?? [];
  const loadingReferences = referencesQuery.isFetching;
  const loadingEmployees = employeesQuery.isFetching;
  const busy = loadingReferences || loadingEmployees;
  const loadError = referencesQuery.error?.response?.data?.message
    || referencesQuery.error?.message
    || Object.values(employeesQuery.error?.response?.data?.errors || {}).flat()[0]
    || employeesQuery.error?.response?.data?.message
    || employeesQuery.error?.message
    || "";

  const allowedSet = useMemo(
    () => Array.isArray(allowedEdCodes)
      ? new Set(allowedEdCodes.map((code) => normalized(code)))
      : null,
    [allowedEdCodes],
  );

  useEffect(() => {
    if (!isOpen) return;
    // Reset the modal selection, not TanStack's cached API data.
    setSelectedEmpNos(new Set());
    setSelectedCodes(new Set());
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setEmployeeSearch("");
    setCodeSearch("");
    setEmployeeColumnFilters({});
    setCodeColumnFilters({});
    setEmployeeSort({ key: "empNo", direction: "asc" });
    setCodeSort({ key: "code", direction: "asc" });
    setSearchMode("part");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !referencesQuery.isError || !referencesQuery.errorUpdatedAt
        || lastAlertRef.current.references === referencesQuery.errorUpdatedAt) return;
    lastAlertRef.current.references = referencesQuery.errorUpdatedAt;
    showErrorAlert("Reference Load Error", referencesQuery.error?.response?.data?.message
      || referencesQuery.error?.message || "Unable to load reference codes.");
  }, [isOpen, referencesQuery.isError, referencesQuery.errorUpdatedAt, referencesQuery.error]);

  useEffect(() => {
    if (!isOpen || !employeesQuery.isError || !employeesQuery.errorUpdatedAt
        || lastAlertRef.current.employees === employeesQuery.errorUpdatedAt) return;
    lastAlertRef.current.employees = employeesQuery.errorUpdatedAt;
    const validationMessage = Object.values(employeesQuery.error?.response?.data?.errors || {}).flat()[0];
    showErrorAlert("Employee Search Error", validationMessage
      || employeesQuery.error?.response?.data?.message
      || employeesQuery.error?.message || "Unable to load employees.");
  }, [isOpen, employeesQuery.isError, employeesQuery.errorUpdatedAt, employeesQuery.error]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const loadEmployees = (event) => {
    event?.preventDefault?.();
    if (!payFrequency || !cutoffCode) {
      showValidationAlert({
        title: "Payroll Cut-Off Required",
        message: "Select Pay Frequency and Payroll Cut-Off before loading employees.",
      });
      return;
    }
    const nextFilters = { ...filters };
    setSelectedEmpNos(new Set());
    // A new server-side filter triggers its own cached query. The same
    // filter explicitly refetches so the Load button also works as Refresh.
    if (Object.keys(EMPTY_FILTERS).every((key) => nextFilters[key] === appliedFilters[key])) {
      void employeesQuery.refetch();
    } else {
      setAppliedFilters(nextFilters);
    }
  };

  const refreshLookup = () => {
    if (busy) return;
    void referencesQuery.refetch();
    if (payFrequency && cutoffCode) void employeesQuery.refetch();
  };

  const availableCodes = useMemo(() => references.edCodes.filter((item) =>
    !allowedSet || allowedSet.has(normalized(item.code)),
  ), [references.edCodes, allowedSet]);

  const filteredEmployees = useMemo(() => sortList(employees.filter((employee) =>
    (matches(employee.empNo, employeeSearch, searchMode) ||
      matches(employee.empName, employeeSearch, searchMode) ||
      ["branchName", "groupName", "deptName", "posName", "statName"].some((key) =>
        matches(employee[key], employeeSearch, searchMode))) &&
    EMPLOYEE_COLUMNS.every(({ key }) => matches(employee[key], employeeColumnFilters[key])),
  ), employeeSort), [employees, employeeSearch, searchMode, employeeColumnFilters, employeeSort]);

  const filteredCodes = useMemo(() => sortList(availableCodes.filter((code) =>
    (matches(code.code, codeSearch, searchMode) ||
      matches(code.description, codeSearch, searchMode)) &&
    CODE_COLUMNS.every(({ key }) => matches(code[key], codeColumnFilters[key])),
  ), codeSort), [availableCodes, codeSearch, searchMode, codeColumnFilters, codeSort]);

  const allVisibleEmployeesSelected = filteredEmployees.length > 0 &&
    filteredEmployees.every((item) => selectedEmpNos.has(item.empNo));
  const allVisibleCodesSelected = filteredCodes.length > 0 &&
    filteredCodes.every((item) => selectedCodes.has(item.code));

  const toggleEmployee = (empNo) => {
    setSelectedEmpNos((previous) => {
      const next = new Set(previous);
      if (next.has(empNo)) next.delete(empNo);
      else next.add(empNo);
      return next;
    });
  };
  const toggleCode = (code) => {
    setSelectedCodes((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };
  const toggleAllEmployees = () => {
    setSelectedEmpNos((previous) => {
      const next = new Set(previous);
      const shouldDeselect = filteredEmployees.length > 0 &&
        filteredEmployees.every((item) => previous.has(item.empNo));
      filteredEmployees.forEach((item) => {
        if (shouldDeselect) next.delete(item.empNo);
        else next.add(item.empNo);
      });
      return next;
    });
  };
  const toggleAllCodes = () => {
    setSelectedCodes((previous) => {
      const next = new Set(previous);
      const shouldDeselect = filteredCodes.length > 0 &&
        filteredCodes.every((item) => previous.has(item.code));
      filteredCodes.forEach((item) => {
        if (shouldDeselect) next.delete(item.code);
        else next.add(item.code);
      });
      return next;
    });
  };
  const toggleSort = (setSort, key) => {
    setSort((previous) => ({
      key,
      direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  };
  const clearFilters = () => {
    setEmployeeSearch("");
    setCodeSearch("");
    setEmployeeColumnFilters({});
    setCodeColumnFilters({});
    setFilters(EMPTY_FILTERS);
    // Restore the cached unfiltered employees (or fetch them if not cached).
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedEmpNos(new Set());
  };
  const confirmSelection = () => {
    const selectedEmployees = employees.filter((employee) => selectedEmpNos.has(employee.empNo));
    const selectedEdCodes = availableCodes.filter((code) => selectedCodes.has(code.code));
    if (!selectedEmployees.length) {
      showValidationAlert({ title: "Employee Required", message: "Please select at least one employee." });
      return;
    }
    if (!selectedEdCodes.length) {
      showValidationAlert({ title: "Code Required", message: "Please select at least one Code from REF_ED." });
      return;
    }
    onClose({ employees: selectedEmployees, edCodes: selectedEdCodes });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-2 font-sans sm:p-4" role="dialog" aria-modal="true" aria-label="Select Multiple Employees and Earnings/Deductions Codes">
      <div className="flex max-h-[94vh] min-h-[550px] w-full max-w-[1450px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* SearchVendMast-style modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} className="text-blue-700 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-blue-800 dark:text-blue-300">Select Multiple Employees</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Select employees and earnings/deductions codes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {busy && <span className="text-[10px] font-semibold text-blue-600">Syncing...</span>}
            <button type="button" onClick={refreshLookup} disabled={busy} title="Refresh employees and REF_ED codes" className="text-slate-500 hover:text-blue-600 disabled:opacity-40">
              <FontAwesomeIcon icon={faSyncAlt} spin={loadingEmployees} />
            </button>
            <button type="button" onClick={() => onClose(null)} title="Close" className="text-slate-500 hover:text-red-600">
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        {/* Server-side filters keep the original SearchSystemGenerated behavior */}
        <form onSubmit={loadEmployees} className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Employee Filters</span>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={searchMode === "start"} onChange={() => setSearchMode("start")} /> STARTS WITH</label>
              <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={searchMode === "part"} onChange={() => setSearchMode("part")} /> CONTAINS</label>
              <button type="button" onClick={clearFilters} className="font-bold text-blue-700 hover:underline dark:text-blue-400">
                <FontAwesomeIcon icon={faEraser} className="mr-1" /> CLEAR FILTERS
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {[
              ["groupCode", "Payroll Group", references.payGroups],
              ["branchCode", "Branch", references.branches],
              ["deptCode", "Department", references.departments],
              ["clientCode", "Client", references.clients],
              ["employeeStatus", "Employee Status", references.statuses],
              ["posCode", "Position", references.positions],
            ].map(([key, label, options]) => (
              <FilterField key={key} label={label} value={filters[key]} options={options || []}
                onChange={(value) => setFilters((previous) => ({ ...previous, [key]: value }))} disabled={busy} />
            ))}
            <label className="block min-w-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span className="mb-1 block">Employee No.</span>
              <input type="text" value={filters.employeeNo}
                onChange={(event) => setFilters((previous) => ({ ...previous, employeeNo: event.target.value }))}
                placeholder="Employee No." className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </label>
            <button type="submit" disabled={busy || !payFrequency || !cutoffCode}
              className="flex h-9 items-center justify-center gap-2 self-end rounded-lg bg-blue-700 px-3 text-[11px] font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              <FontAwesomeIcon icon={busy ? faSpinner : faMagnifyingGlass} spin={busy} />
              LOAD EMPLOYEES
            </button>
          </div>
          {loadError && <p role="alert" className="mt-2 text-xs text-red-600">{loadError}</p>}
        </form>

        {/* Two independently searchable, sortable, multi-select lookup tables */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:overflow-hidden">
          <section className="flex min-h-[210px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-white">
                Employees <span className="ml-1 text-blue-600">({selectedEmpNos.size} selected / {filteredEmployees.length} shown)</span>
              </div>
              <div className="relative w-full max-w-[260px]">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-2.5 text-[10px] text-slate-400" />
                <input type="text" value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder="Search name, employee no., branch..." aria-label="Search loaded employees"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-slate-900">
              <table className="min-w-full border-separate border-spacing-0 text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <tr>
                    <th className="w-10 border-b px-2 py-2 text-center dark:border-slate-700">
                      <input type="checkbox" checked={allVisibleEmployeesSelected}
                        disabled={!filteredEmployees.length} onChange={toggleAllEmployees} title="Select all filtered employees" />
                    </th>
                    {EMPLOYEE_COLUMNS.map(({ key, label, width }) => (
                      <th key={key} style={{ minWidth: width }} className="border-b px-2 py-2 dark:border-slate-700">
                        <button type="button" onClick={() => toggleSort(setEmployeeSort, key)} className="flex items-center gap-1 font-bold hover:text-blue-700">
                          {label} <FontAwesomeIcon icon={faSort} className={employeeSort.key === key ? "text-blue-600" : "text-slate-300"} />
                        </button>
                        <div className="relative mt-1">
                          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2 text-[9px] text-slate-300" />
                          <input type="text" value={employeeColumnFilters[key] || ""}
                            onChange={(event) => setEmployeeColumnFilters((prev) => ({ ...prev, [key]: event.target.value }))}
                            placeholder="Filter..." aria-label={`Filter ${label}`}
                            className="h-7 w-full rounded-md border border-slate-200 bg-white pl-6 pr-1 text-[10px] font-normal outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.empNo} onClick={() => toggleEmployee(employee.empNo)}
                      className={`cursor-pointer border-b border-slate-100 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800 ${selectedEmpNos.has(employee.empNo) ? "bg-blue-50/80 dark:bg-blue-950/40" : ""}`}>
                      <td className="border-b border-slate-100 px-2 py-2 text-center dark:border-slate-800" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={selectedEmpNos.has(employee.empNo)} onChange={() => toggleEmployee(employee.empNo)} />
                      </td>
                      {EMPLOYEE_COLUMNS.map(({ key }) => (
                        <td key={key} className="border-b border-slate-100 px-2 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                          <span className={key === "empNo" ? "font-bold" : ""}>{employee[key] || "—"}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!filteredEmployees.length && <tr><td colSpan={EMPLOYEE_COLUMNS.length + 1} className="px-3 py-14 text-center text-xs text-slate-400">
                    {loadingEmployees ? "Loading employees..." : employees.length ? "No matching employees. Try clearing filters." : "No eligible employees found for this payroll cut-off."}
                  </td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex min-h-[210px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-white">
                REF_ED Codes <span className="ml-1 text-blue-600">({selectedCodes.size} selected)</span>
              </div>
              <div className="relative w-full max-w-[215px]">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-2.5 text-[10px] text-slate-400" />
                <input type="text" value={codeSearch} onChange={(event) => setCodeSearch(event.target.value)}
                  placeholder="Search code or description..." aria-label="Search REF_ED codes"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-slate-900">
              <table className="min-w-full border-separate border-spacing-0 text-left text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <tr>
                    <th className="w-10 border-b px-2 py-2 text-center dark:border-slate-700">
                      <input type="checkbox" checked={allVisibleCodesSelected} disabled={!filteredCodes.length}
                        onChange={toggleAllCodes} title="Select all filtered codes" />
                    </th>
                    {CODE_COLUMNS.map(({ key, label, width }) => (
                      <th key={key} style={{ minWidth: width }} className="border-b px-2 py-2 dark:border-slate-700">
                        <button type="button" onClick={() => toggleSort(setCodeSort, key)} className="flex items-center gap-1 font-bold hover:text-blue-700">
                          {label} <FontAwesomeIcon icon={faSort} className={codeSort.key === key ? "text-blue-600" : "text-slate-300"} />
                        </button>
                        <div className="relative mt-1">
                          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2 text-[9px] text-slate-300" />
                          <input type="text" value={codeColumnFilters[key] || ""}
                            onChange={(event) => setCodeColumnFilters((prev) => ({ ...prev, [key]: event.target.value }))}
                            placeholder="Filter..." aria-label={`Filter ${label}`}
                            className="h-7 w-full rounded-md border border-slate-200 bg-white pl-6 pr-1 text-[10px] font-normal outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code) => (
                    <tr key={code.code} onClick={() => toggleCode(code.code)}
                      className={`cursor-pointer border-b border-slate-100 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800 ${selectedCodes.has(code.code) ? "bg-blue-50/80 dark:bg-blue-950/40" : ""}`}>
                      <td className="border-b border-slate-100 px-2 py-2 text-center dark:border-slate-800" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={selectedCodes.has(code.code)} onChange={() => toggleCode(code.code)} />
                      </td>
                      {CODE_COLUMNS.map(({ key }) => (
                        <td key={key} className="border-b border-slate-100 px-2 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                          <span className={key === "code" ? "font-bold" : ""}>{code[key] || "—"}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!filteredCodes.length && <tr><td colSpan={CODE_COLUMNS.length + 1} className="px-3 py-14 text-center text-xs text-slate-400">
                    {loadingReferences ? "Loading REF_ED codes..." : !availableCodes.length ? "No matching REF_ED codes are available for this category." : "No matching codes. Try clearing filters."}
                  </td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            {selectedEmpNos.size} employee(s) · {selectedCodes.size} code(s) selected
            {selectedEmpNos.size > 0 && selectedCodes.size > 0 && (
              <span className="ml-2 font-normal text-slate-500">({selectedEmpNos.size * selectedCodes.size} employee/code combinations)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onClose(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">Cancel</button>
            <button type="button" onClick={confirmSelection}
              disabled={busy || !payFrequency || !cutoffCode || !selectedEmpNos.size || !selectedCodes.size}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              <FontAwesomeIcon icon={faCheck} /> Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSystemGeneratedEmployeeSelection;
