/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { faCalculator, faChevronDown, faFilter, faPrint, faSave, faUndo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchPayGroupRef from "@/NAYSA Cloud/Lookup/SearchPayGroupRef.jsx";
import SearchDepartmentRef from "@/NAYSA Cloud/Lookup/SearchDepartmentRef.jsx";
import SearchEmployeeStatusRef from "@/NAYSA Cloud/Lookup/SearchEmployeeStatusRef.jsx";
import SearchLeaveTypeRef from "@/NAYSA Cloud/Lookup/SearchLeaveTypeRef.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalErrorAlertAPI, useSwalSuccessAlert, useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const currentYear = new Date().getFullYear();
const INITIAL_FILTERS = {
  creditYear: String(currentYear), empNo: "", branchCode: "", groupCode: "",
  deptCode: "", statCode: "", leaveType: "",
};
const parseRows = (response) => { const raw = response?.data?.data?.[0]?.result; return raw ? JSON.parse(raw) : []; };
const parseList = (value) => { try { return JSON.parse(value || "[]"); } catch { return []; } };
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-US") : "";
const amountText = (value) => Number(value || 0).toFixed(4);

const LeaveCreditBalance = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [rows, setRows] = useState([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lookupState, setLookupState] = useState({ isOpen: false, key: "", label: "", options: [] });
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const { data: references = {}, isLoading: referencesLoading } = useQuery({
    queryKey: ["leaveCreditBalanceReferences"],
    queryFn: async () => {
      const response = await apiClient.get("/leaveCreditBalance/references");
      const source = response?.data?.data?.[0] || {};
      const creditYears = parseList(source.creditYears);
      if (!creditYears.some((item) => String(item.value) === String(currentYear))) {
        creditYears.unshift({ value: currentYear, label: String(currentYear) });
      }
      return {
        branches: parseList(source.branches), payGroups: parseList(source.payGroups),
        departments: parseList(source.departments), employeeStatuses: parseList(source.employeeStatuses),
        leaveTypes: parseList(source.leaveTypes), creditYears,
      };
    },
  });

  const resultMutation = (mode, title) => useMutation({
    mutationFn: () => apiClient.post(`/leaveCreditBalance/${mode}`, { jsonData: { ...filters, creditYear: Number(filters.creditYear) } }),
    onSuccess: (response) => {
      const result = parseRows(response).map((row) => ({
        ...row,
        beginningBalance: amountText(row.beginningBalance),
        adjustment: amountText(row.adjustment),
      }));
      setRows(result);
      setHasLoaded(true);
      if (!result.length) useSwalValidationAlert({ title: "No Records", message: "No leave credit balances matched the selected filters." });
    },
    onError: (error) => useSwalErrorAlertAPI(title, error),
  });

  const loadMutation = resultMutation("load", "Load Error");
  const recalculateMutation = resultMutation("recalculate", "Recalculation Error");
  const saveMutation = useMutation({
    mutationFn: (jsonData) => apiClient.post("/leaveCreditBalance/save", { jsonData }),
    onSuccess: (response) => {
      useSwalSuccessAlert("Success!", `${response?.data?.data?.[0]?.savedCount || rows.length} leave credit balance records saved.`);
      loadMutation.mutate();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Error", error),
  });

  const validateFilters = () => {
    if (filters.creditYear) return true;
    useSwalValidationAlert({ title: "Required Field", message: "Credit Year is required." });
    return false;
  };
  const loadRows = () => { if (validateFilters()) loadMutation.mutate(); };
  const recalculateRows = () => { if (validateFilters()) recalculateMutation.mutate(); };
  const saveRows = () => {
    if (!hasLoaded || !rows.length) return useSwalValidationAlert({ title: "Nothing to Save", message: "Load the leave credit balances first." });
    saveMutation.mutate(JSON.stringify({ jsonData: { userCode: user?.USER_CODE || "ADMIN", rows } }));
  };
  const reset = () => { setFilters(INITIAL_FILTERS); setRows([]); setHasLoaded(false); };
  const updateAmount = (creditId, key, value) => {
    const cleanValue = String(value).replace(/,/g, "");
    if (cleanValue !== "" && !/^-?\d*(\.\d{0,4})?$/.test(cleanValue)) return;
    setRows((current) => current.map((row) => {
      if (row.creditId !== creditId) return row;
      const next = { ...row, [key]: cleanValue };
      next.endingBalance = Number(next.beginningBalance || 0) + Number(next.generatedCredit || 0)
        + Number(next.adjustment || 0) - Number(next.availed || 0);
      return next;
    }));
  };

  const amountEditor = (key, allowNegative = false) => (row) => <input
    value={row[key] ?? ""}
    onChange={(event) => {
      if (!allowNegative && Number(String(event.target.value).replace(/,/g, "")) < 0) return;
      updateAmount(row.creditId, key, event.target.value);
    }}
    onBlur={(event) => updateAmount(row.creditId, key, Number(String(event.target.value).replace(/,/g, "") || 0).toFixed(4))}
    className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-left text-xs dark:border-slate-600 dark:bg-slate-700"
    inputMode="decimal"
  />;

  const columns = useMemo(() => [
    { key: "empNo", label: "Emp. No", width: 115, requiredVisible: true },
    { key: "empName", label: "Employee Name", width: 240, requiredVisible: true },
    { key: "leaveType", label: "Leave Type", width: 100 },
    { key: "leaveName", label: "Leave Name", width: 170 },
    { key: "beginningBalance", label: "Beginning Balance", width: 135, displayValue: (row) => amountText(row.beginningBalance), render: amountEditor("beginningBalance") },
    { key: "generatedCredit", label: "Generated Credit", width: 130, renderType: "number", roundingOff: 4 },
    { key: "availed", label: "Availed", width: 105, renderType: "number", roundingOff: 4 },
    { key: "adjustment", label: "Adjustment", width: 110, displayValue: (row) => amountText(row.adjustment), render: amountEditor("adjustment", true) },
    { key: "endingBalance", label: "Ending Balance", width: 125, renderType: "number", roundingOff: 4 },
    { key: "startDate", label: "Start Date", width: 110, displayValue: (row) => dateText(row.startDate), render: (row) => dateText(row.startDate) },
    { key: "endDate", label: "End Date", width: 110, displayValue: (row) => dateText(row.endDate), render: (row) => dateText(row.endDate) },
    { key: "branchCode", label: "Branch", width: 90 },
    { key: "groupCode", label: "Pay Group", width: 100 },
    { key: "deptCode", label: "Department", width: 110 },
    { key: "statCode", label: "Emp. Status", width: 110 },
  ], [rows]);

  const lookup = (label, key, source, required = false) => {
    const selected = (source || []).find((item) => String(item.value) === String(filters[key] || ""));
    return <FieldRenderer
      label={label} required={required} type="lookup" readOnly editableLookup
      value={selected ? `(${selected.value}) - ${selected.label}` : ""}
      onLookup={() => setLookupState({ isOpen: true, key, label, options: source || [] })}
      onClear={() => !required && setFilter(key, "")}
    />;
  };
  const busy = referencesLoading || loadMutation.isPending || recalculateMutation.isPending || saveMutation.isPending;
  const headerButtonClass = "flex h-8 w-[88px] items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] text-white disabled:opacity-50";

  return <div className="global-ref-main-div-ui">
    {busy && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3">
      <h1 className="global-ref-headertext-ui text-center md:text-left">Leave Credit Balance</h1><div />
      <div className="flex justify-center md:justify-end"><ButtonBar buttons={[
        { key: "find", label: <span className="ml-1 hidden sm:inline">Find</span>, icon: faFilter, onClick: loadRows, className: headerButtonClass },
        { key: "recalculate", label: <span className="ml-1 hidden sm:inline">Recalc</span>, icon: faCalculator, onClick: recalculateRows, className: headerButtonClass },
        { key: "save", label: <span className="ml-1 hidden sm:inline">Save</span>, icon: faSave, onClick: saveRows, disabled: !rows.length, className: headerButtonClass },
        { key: "reset", label: <span className="ml-1 hidden sm:inline">Reset</span>, icon: faUndo, onClick: reset, className: headerButtonClass },
        { key: "print", label: <span className="ml-1 hidden sm:inline">Print</span>, icon: faPrint, onClick: () => window.print(), disabled: !rows.length, className: headerButtonClass },
      ]} /></div>
    </div></div>

    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <p className="p-1.5 text-[11px] font-semibold text-blue-600 sm:text-[14px]">Select filters to view employee leave credit balances</p>
        <button type="button" onClick={() => setIsFiltersExpanded((expanded) => !expanded)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" aria-expanded={isFiltersExpanded} aria-controls="leave-credit-balance-filters">
          <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`} />
          {isFiltersExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div id="leave-credit-balance-filters" className={`grid grid-cols-1 gap-x-12 gap-y-4 transition-all duration-200 md:grid-cols-3 ${isFiltersExpanded ? "opacity-100" : "hidden"}`}>
        <div className="space-y-2">
          {lookup("Branch", "branchCode", references.branches)}
          {lookup("Pay Group", "groupCode", references.payGroups)}
          {lookup("Department", "deptCode", references.departments)}
        </div>

        <div className="space-y-2">
          {lookup("Employee Status", "statCode", references.employeeStatuses)}
          {lookup("Leave Type", "leaveType", references.leaveTypes)}
          <FieldRenderer label="Employee No." type="text" value={filters.empNo} onChange={(value) => setFilter("empNo", value)} />
        </div>

        <div className="flex items-center">
          {lookup("Credit Year", "creditYear", references.creditYears, true)}
        </div>
      </div>
    </div>

    <div className="global-tran-table-main-div-ui mt-4">
      <SearchGlobalReferenceTable docType="LeaveCreditBalance" columns={columns} data={rows} isLoading={busy} itemsPerPage={50} autoFillGrid="True" onRefresh={loadRows} />
    </div>

    <SearchBranchRef
      isOpen={lookupState.isOpen && lookupState.key === "branchCode"}
      title="Select Branch"
      onClose={(selected) => {
        if (selected) setFilter("branchCode", selected.branchCode || selected.BRANCH_CODE || "");
        setLookupState({ isOpen: false, key: "", label: "", options: [] });
      }}
    />

    <SearchPayGroupRef isOpen={lookupState.isOpen && lookupState.key === "groupCode"} onClose={(selected) => {
      if (selected) setFilter("groupCode", selected.code);
      setLookupState({ isOpen: false, key: "", label: "", options: [] });
    }} />

    <SearchDepartmentRef isOpen={lookupState.isOpen && lookupState.key === "deptCode"} onClose={(selected) => {
      if (selected) setFilter("deptCode", selected.code);
      setLookupState({ isOpen: false, key: "", label: "", options: [] });
    }} />

    <SearchEmployeeStatusRef isOpen={lookupState.isOpen && lookupState.key === "statCode"} onClose={(selected) => {
      if (selected) setFilter("statCode", selected.code);
      setLookupState({ isOpen: false, key: "", label: "", options: [] });
    }} />

    <SearchLeaveTypeRef isOpen={lookupState.isOpen && lookupState.key === "leaveType"} onClose={(selected) => {
      if (selected) setFilter("leaveType", selected.code);
      setLookupState({ isOpen: false, key: "", label: "", options: [] });
    }} />

    <GlobalLookupModalv1
      isOpen={lookupState.isOpen && !["branchCode", "groupCode", "deptCode", "statCode", "leaveType"].includes(lookupState.key)}
      title={`Select ${lookupState.label}`}
      btnCaption="Apply Selection"
      singleSelect
      data={lookupState.options.map((item) => ({ groupId: String(item.value), code: String(item.value), description: String(item.label) }))}
      endpoint={[
        { key: "code", label: "Code", width: 140 },
        { key: "description", label: "Description", width: 320 },
      ]}
      onCancel={() => setLookupState({ isOpen: false, key: "", label: "", options: [] })}
      onClose={(selection) => {
        const selected = selection?.records?.[0];
        if (selected) setFilter(lookupState.key, selected.code);
        setLookupState({ isOpen: false, key: "", label: "", options: [] });
      }}
    />
  </div>;
};

export default LeaveCreditBalance;

