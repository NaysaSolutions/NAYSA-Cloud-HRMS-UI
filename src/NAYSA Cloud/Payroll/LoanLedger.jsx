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
import SearchCutoffRef from "@/NAYSA Cloud/Lookup/SearchCutoffRef.jsx";
import SearchDepartmentRef from "@/NAYSA Cloud/Lookup/SearchDepartmentRef.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchLoanRef from "@/NAYSA Cloud/Lookup/SearchLoanRef.jsx";
import SearchPayGroupRef from "@/NAYSA Cloud/Lookup/SearchPayGroupRef.jsx";

const INITIAL_FILTERS = { branchCode: "", branchName: "", groupCode: "", groupName: "", deptCode: "", deptName: "", employeeNo: "", employeeName: "", frequency: "", cutoffCode: "", cutoffName: "", loanCode: "", loanName: "" };
const parseList = (value) => { try { return JSON.parse(value || "[]"); } catch { return []; } };
const parseRows = (response) => { const value = response?.data?.data?.[0]?.result; return value ? JSON.parse(value) : []; };
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-US") : "";

const LoanLedger = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [rows, setRows] = useState([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [lookupState, setLookupState] = useState({ isOpen: false, key: "", label: "", options: [] });
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const closeLookup = () => setLookupState({ isOpen: false, key: "", label: "", options: [] });

  const { data: references = {}, isLoading: referencesLoading } = useQuery({
    queryKey: ["loanLedgerReferences"],
    queryFn: async () => {
      const response = await apiClient.get("/loanTransactions/ledgerReferences");
      const source = response?.data?.data?.[0] || {};
      return {
        branches: parseList(source.branches),
        payGroups: parseList(source.payGroups),
        departments: parseList(source.departments),
        cutoffs: parseList(source.cutoffs),
        loanTypes: parseList(source.loanTypes),
      };
    },
  });

  const loadMutation = useMutation({
    mutationFn: () => apiClient.post("/loanTransactions/ledger", { jsonData: filters }),
    onSuccess: (response) => {
      const result = parseRows(response);
      setRows(result);
      if (!result.length) useSwalValidationAlert({ title: "No Records", message: "No employee loan ledger records matched the selected filters." });
    },
    onError: (error) => useSwalErrorAlertAPI("Load Error", error),
  });

  const loadRows = () => {
    if (!filters.frequency) return useSwalValidationAlert({ title: "Required Field", message: "Pay Frequency is required." });
    if (!filters.cutoffCode) return useSwalValidationAlert({ title: "Required Field", message: "As of Cut-Off is required." });
    loadMutation.mutate();
  };

  const reset = () => { setFilters(INITIAL_FILTERS); setRows([]); };
  const busy = referencesLoading || loadMutation.isPending;

  const columns = useMemo(() => [
    { key: "loanNo", label: "Transaction No.", width: 125, requiredVisible: true },
    { key: "transactionDate", label: "Transaction Date", width: 125, render: (row) => dateText(row.transactionDate), displayValue: (row) => dateText(row.transactionDate) },
    { key: "empNo", label: "Emp. No.", width: 110, requiredVisible: true },
    { key: "empName", label: "Employee Name", width: 220, requiredVisible: true },
    { key: "referenceNo", label: "Reference No.", width: 140 },
    { key: "loanCode", label: "Loan Code", width: 105 },
    { key: "loanDescription", label: "Loan Description", width: 190 },
    { key: "dateGranted", label: "Date Granted", width: 115, render: (row) => dateText(row.dateGranted), displayValue: (row) => dateText(row.dateGranted) },
    { key: "loanStart", label: "Loan Start", width: 110, render: (row) => dateText(row.loanStart), displayValue: (row) => dateText(row.loanStart) },
    { key: "loanEnd", label: "Loan End", width: 110, render: (row) => dateText(row.loanEnd), displayValue: (row) => dateText(row.loanEnd) },
    { key: "frequency", label: "Frequency", width: 95 },
    { key: "holdFlag", label: "Hold", width: 75 },
    { key: "loanAmount", label: "Loan Amount", width: 120, renderType: "number", roundingOff: 2 },
    { key: "amortization", label: "Amortization", width: 120, renderType: "number", roundingOff: 2 },
    { key: "balance", label: "Balance", width: 120, renderType: "number", roundingOff: 2 },
    { key: "totalPaid", label: "Total Paid", width: 120, renderType: "number", roundingOff: 2 },
    { key: "branchCode", label: "Branch", width: 90 },
    { key: "groupCode", label: "Pay Group", width: 100 },
    { key: "deptCode", label: "Department", width: 110 },
    { key: "status", label: "Status", width: 95 },
  ], []);

  const selectedLabel = (code, name) => code ? `(${code}) - ${name || code}` : "";
  const lookup = (label, key, source, required = false) => {
    const selected = (source || []).find((item) => String(item.value) === String(filters[key] || ""));
    return <FieldRenderer label={label} required={required} type="lookup" readOnly editableLookup value={selected ? selectedLabel(selected.value, selected.label) : ""} onLookup={() => setLookupState({ isOpen: true, key, label, options: source || [] })} onClear={() => !required && setFilter(key, "")} />;
  };

  const headerButtonClass = "flex h-8 w-[80px] items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] text-white disabled:opacity-50";

  return <div className="global-ref-main-div-ui">
    {busy && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3">
      <h1 className="global-ref-headertext-ui text-center md:text-left">Employee Loan Ledger</h1><div />
      <div className="flex justify-center md:justify-end"><ButtonBar buttons={[
        { key: "find", label: <span className="ml-1 hidden sm:inline">Find</span>, icon: faFilter, onClick: loadRows, className: headerButtonClass },
        { key: "reset", label: <span className="ml-1 hidden sm:inline">Reset</span>, icon: faUndo, onClick: reset, className: headerButtonClass },
        { key: "print", label: <span className="ml-1 hidden sm:inline">Print</span>, icon: faPrint, onClick: () => window.print(), disabled: !rows.length, className: headerButtonClass },
      ]} /></div>
    </div></div>

    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <p className="p-1.5 text-[11px] font-semibold text-blue-600 sm:text-[14px]">Select filters to view employee loan balances and payment totals</p>
        <button type="button" onClick={() => setIsFiltersExpanded((expanded) => !expanded)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" aria-expanded={isFiltersExpanded} aria-controls="employee-loan-ledger-filters">
          <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`} />{isFiltersExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div id="employee-loan-ledger-filters" className={`grid grid-cols-1 gap-x-12 gap-y-4 transition-all duration-200 md:grid-cols-3 ${isFiltersExpanded ? "opacity-100" : "hidden"}`}>
        <div className="space-y-2"><FieldRenderer label="Department" type="lookup" readOnly editableLookup value={selectedLabel(filters.deptCode, filters.deptName)} onLookup={() => setLookupState({ isOpen: true, key: "deptCode", label: "Department", options: [] })} onClear={() => setFilters((current) => ({ ...current, deptCode: "", deptName: "" }))} /><FieldRenderer label="Branch" type="lookup" readOnly editableLookup value={selectedLabel(filters.branchCode, filters.branchName)} onLookup={() => setLookupState({ isOpen: true, key: "branchCode", label: "Branch", options: [] })} onClear={() => setFilters((current) => ({ ...current, branchCode: "", branchName: "" }))} /><FieldRenderer label="Payroll Group" type="lookup" readOnly editableLookup value={selectedLabel(filters.groupCode, filters.groupName)} onLookup={() => setLookupState({ isOpen: true, key: "groupCode", label: "Payroll Group", options: [] })} onClear={() => setFilters((current) => ({ ...current, groupCode: "", groupName: "" }))} /></div>
        <div className="space-y-2"><FieldRenderer label="Employee" type="lookup" readOnly editableLookup value={selectedLabel(filters.employeeNo, filters.employeeName)} onLookup={() => setLookupState({ isOpen: true, key: "employeeNo", label: "Employee", options: [] })} onClear={() => setFilters((current) => ({ ...current, employeeNo: "", employeeName: "" }))} /><FieldRenderer label="Pay Frequency" required type="select" value={filters.frequency} options={[{ value: "S", label: "Semi-Monthly" }, { value: "M", label: "Monthly" }, { value: "D", label: "Weekly" }]} placeholder="Select Frequency" hideClearButton onChange={(value) => setFilters((current) => ({ ...current, frequency: value, cutoffCode: "", cutoffName: "" }))} /><FieldRenderer label="As of Cut-Off" required type="lookup" readOnly editableLookup value={selectedLabel(filters.cutoffCode, filters.cutoffName)} onLookup={() => setLookupState({ isOpen: true, key: "cutoffCode", label: "As of Cut-Off", options: [] })} /></div>
        <div className="space-y-2"><FieldRenderer label="Loan Type" type="lookup" readOnly editableLookup value={selectedLabel(filters.loanCode, filters.loanName)} onLookup={() => setLookupState({ isOpen: true, key: "loanCode", label: "Loan Type", options: [] })} onClear={() => setFilters((current) => ({ ...current, loanCode: "", loanName: "" }))} /></div>
      </div>
    </div>

    <div className="global-tran-table-main-div-ui mt-4"><SearchGlobalReferenceTable docType="EmployeeLoanLedger" columns={columns} data={rows} isLoading={busy} itemsPerPage={50} autoFillGrid="True" onRefresh={loadRows} /></div>

    <SearchBranchRef isOpen={lookupState.isOpen && lookupState.key === "branchCode"} title="Select Branch" onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, branchCode: selected.branchCode || selected.BRANCH_CODE || selected.code || selected.value || "", branchName: selected.branchName || selected.BRANCH_NAME || selected.name || selected.label || "" })); closeLookup(); }} />
    <SearchPayGroupRef isOpen={lookupState.isOpen && lookupState.key === "groupCode"} referenceEndpoint="/loanTransactions/ledgerReferences" onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, groupCode: selected.code || selected.value || "", groupName: selected.name || selected.label || "" })); closeLookup(); }} />
    <SearchDepartmentRef isOpen={lookupState.isOpen && lookupState.key === "deptCode"} referenceEndpoint="/loanTransactions/ledgerReferences" onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, deptCode: selected.code || selected.value || "", deptName: selected.name || selected.label || "" })); closeLookup(); }} />
    <SearchEmployeeRef isOpen={lookupState.isOpen && lookupState.key === "employeeNo"} onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, employeeNo: selected.empNo || "", employeeName: selected.empName || "" })); closeLookup(); }} />
    <SearchCutoffRef isOpen={lookupState.isOpen && lookupState.key === "cutoffCode"} customParam={filters.frequency || "All"} onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, cutoffCode: selected.cutoffCode || "", cutoffName: selected.cutoffName || "" })); closeLookup(); }} />
    <SearchLoanRef isOpen={lookupState.isOpen && lookupState.key === "loanCode"} onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, loanCode: selected.code || "", loanName: selected.description || "" })); closeLookup(); }} />
  </div>;
};

export default LoanLedger;
