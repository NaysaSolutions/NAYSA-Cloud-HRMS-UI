import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faFilter, faPrint, faUndo } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useSwalErrorAlertAPI, useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchDepartmentRef from "@/NAYSA Cloud/Lookup/SearchDepartmentRef.jsx";
import SearchEmployeeStatusRef from "@/NAYSA Cloud/Lookup/SearchEmployeeStatusRef.jsx";
import SearchGlobalLookupv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchLeaveTypeRef from "@/NAYSA Cloud/Lookup/SearchLeaveTypeRef.jsx";
import SearchPayGroupRef from "@/NAYSA Cloud/Lookup/SearchPayGroupRef.jsx";

const currentYear = new Date().getFullYear();
const INITIAL_FILTERS = { branchCode: "", groupCode: "", deptCode: "", statCode: "", leaveType: "", empNo: "", creditYear: String(currentYear) };
const parseList = (value) => { try { return JSON.parse(value || "[]"); } catch { return []; } };
const parseRows = (response) => { const value = response?.data?.data?.[0]?.result; return value ? JSON.parse(value) : []; };
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-US") : "";

const LeaveLedger = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [rows, setRows] = useState([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [lookupState, setLookupState] = useState({ isOpen: false, key: "", label: "", options: [] });
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const closeLookup = () => setLookupState({ isOpen: false, key: "", label: "", options: [] });

  const { data: references = {}, isLoading: referencesLoading } = useQuery({
    queryKey: ["leaveLedgerReferences"],
    queryFn: async () => {
      const response = await apiClient.get("/leaveLedger/references");
      const source = response?.data?.data?.[0] || {};
      const creditYears = parseList(source.creditYears);
      if (!creditYears.some((item) => String(item.value) === String(currentYear))) creditYears.unshift({ value: currentYear, label: String(currentYear) });
      return {
        branches: parseList(source.branches), payGroups: parseList(source.payGroups),
        departments: parseList(source.departments), employeeStatuses: parseList(source.employeeStatuses),
        leaveTypes: parseList(source.leaveTypes), creditYears,
      };
    },
  });

  const loadMutation = useMutation({
    mutationFn: () => apiClient.post("/leaveLedger/load", { jsonData: { ...filters, creditYear: Number(filters.creditYear) } }),
    onSuccess: (response) => {
      const result = parseRows(response);
      setRows(result);
      if (!result.length) useSwalValidationAlert({ title: "No Records", message: "No employee leave ledger records matched the selected filters." });
    },
    onError: (error) => useSwalErrorAlertAPI("Load Error", error),
  });

  const loadRows = () => {
    if (!filters.creditYear) return useSwalValidationAlert({ title: "Required Field", message: "Credit Year is required." });
    loadMutation.mutate();
  };
  const reset = () => { setFilters(INITIAL_FILTERS); setRows([]); };

  const columns = useMemo(() => [
    { key: "empNo", label: "Emp. No", width: 115, requiredVisible: true },
    { key: "empName", label: "Employee Name", width: 220, requiredVisible: true },
    { key: "leaveType", label: "Leave Type", width: 100 },
    { key: "leaveName", label: "Leave Name", width: 160 },
    { key: "transactionDate", label: "Transaction Date", width: 125, displayValue: (row) => dateText(row.transactionDate), render: (row) => dateText(row.transactionDate) },
    { key: "referenceNo", label: "Reference No.", width: 130 },
    { key: "transactionType", label: "Transaction", width: 145 },
    { key: "credit", label: "Credit", width: 100, renderType: "number", roundingOff: 4 },
    { key: "debit", label: "Debit", width: 100, renderType: "number", roundingOff: 4 },
    { key: "runningBalance", label: "Balance", width: 110, renderType: "number", roundingOff: 4 },
    { key: "status", label: "Status", width: 100 },
    { key: "branchCode", label: "Branch", width: 90 },
    { key: "groupCode", label: "Pay Group", width: 100 },
    { key: "deptCode", label: "Department", width: 110 },
    { key: "statCode", label: "Emp. Status", width: 110 },
  ], []);

  const lookup = (label, key, source, required = false) => {
    const selected = (source || []).find((item) => String(item.value) === String(filters[key] || ""));
    return <FieldRenderer label={label} required={required} type="lookup" readOnly editableLookup value={selected ? `(${selected.value}) - ${selected.label}` : ""} onLookup={() => setLookupState({ isOpen: true, key, label, options: source || [] })} onClear={() => !required && setFilter(key, "")} />;
  };

  const headerButtonClass = "flex h-8 w-[80px] items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] text-white disabled:opacity-50";
  const busy = referencesLoading || loadMutation.isPending;

  return <div className="global-ref-main-div-ui">
    {busy && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3">
      <h1 className="global-ref-headertext-ui text-center md:text-left">Employee Leave Ledger</h1><div />
      <div className="flex justify-center md:justify-end"><ButtonBar buttons={[
        { key: "find", label: <span className="ml-1 hidden sm:inline">Find</span>, icon: faFilter, onClick: loadRows, className: headerButtonClass },
        { key: "reset", label: <span className="ml-1 hidden sm:inline">Reset</span>, icon: faUndo, onClick: reset, className: headerButtonClass },
        { key: "print", label: <span className="ml-1 hidden sm:inline">Print</span>, icon: faPrint, onClick: () => window.print(), disabled: !rows.length, className: headerButtonClass },
      ]} /></div>
    </div></div>

    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <p className="p-1.5 text-[11px] font-semibold text-blue-600 sm:text-[14px]">Select filters to view employee leave ledger transactions</p>
        <button type="button" onClick={() => setIsFiltersExpanded((expanded) => !expanded)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" aria-expanded={isFiltersExpanded} aria-controls="employee-leave-ledger-filters">
          <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`} />{isFiltersExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div id="employee-leave-ledger-filters" className={`grid grid-cols-1 gap-x-12 gap-y-4 transition-all duration-200 md:grid-cols-3 ${isFiltersExpanded ? "opacity-100" : "hidden"}`}>
        <div className="space-y-2">{lookup("Branch", "branchCode", references.branches)}{lookup("Pay Group", "groupCode", references.payGroups)}{lookup("Department", "deptCode", references.departments)}</div>
        <div className="space-y-2">{lookup("Employee Status", "statCode", references.employeeStatuses)}{lookup("Leave Type", "leaveType", references.leaveTypes)}<FieldRenderer label="Employee No." type="text" value={filters.empNo} onChange={(value) => setFilter("empNo", value)} /></div>
        <div className="flex items-center">{lookup("Credit Year", "creditYear", references.creditYears, true)}</div>
      </div>
    </div>

    <div className="global-tran-table-main-div-ui mt-4"><SearchGlobalReferenceTable docType="EmployeeLeaveLedger" columns={columns} data={rows} isLoading={busy} itemsPerPage={50} autoFillGrid="True" onRefresh={loadRows} /></div>

    <SearchBranchRef isOpen={lookupState.isOpen && lookupState.key === "branchCode"} title="Select Branch" onClose={(selected) => { if (selected) setFilter("branchCode", selected.branchCode || selected.BRANCH_CODE || ""); closeLookup(); }} />
    <SearchPayGroupRef isOpen={lookupState.isOpen && lookupState.key === "groupCode"} onClose={(selected) => { if (selected) setFilter("groupCode", selected.code); closeLookup(); }} />
    <SearchDepartmentRef isOpen={lookupState.isOpen && lookupState.key === "deptCode"} onClose={(selected) => { if (selected) setFilter("deptCode", selected.code); closeLookup(); }} />
    <SearchEmployeeStatusRef isOpen={lookupState.isOpen && lookupState.key === "statCode"} onClose={(selected) => { if (selected) setFilter("statCode", selected.code); closeLookup(); }} />
    <SearchLeaveTypeRef isOpen={lookupState.isOpen && lookupState.key === "leaveType"} onClose={(selected) => { if (selected) setFilter("leaveType", selected.code); closeLookup(); }} />
    <SearchGlobalLookupv1 isOpen={lookupState.isOpen && lookupState.key === "creditYear"} title="Select Credit Year" btnCaption="Apply Selection" singleSelect data={lookupState.options.map((item) => ({ groupId: String(item.value), code: String(item.value), description: String(item.label) }))} endpoint={[{ key: "code", label: "Year", width: 180 }]} onCancel={closeLookup} onClose={(selection) => { const selected = selection?.records?.[0]; if (selected) setFilter("creditYear", selected.code); closeLookup(); }} />
  </div>;
};

export default LeaveLedger;
