/* eslint-disable react/prop-types, react-hooks/rules-of-hooks */
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchPayGroupRef from "@/NAYSA Cloud/Lookup/SearchPayGroupRef.jsx";
import SearchDepartmentRef from "@/NAYSA Cloud/Lookup/SearchDepartmentRef.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result || "[]";
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};
const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || "[]"); } catch { return []; }
};
const formatAmount = (value) => (Number(String(value || "0").replace(/,/g, "")) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SearchLoanEmployeeSelection = ({ isOpen, payFrequency, onClose }) => {
  const [filters, setFilters] = useState({ branchCode: "", groupCode: "", deptCode: "", employeeNo: "" });
  const [filterNames, setFilterNames] = useState({ branchName: "", groupName: "", deptName: "" });
  const [activeLookup, setActiveLookup] = useState("");
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [parameterValues, setParameterValues] = useState({ loanAmount: "0.00", amortizationAmount: "0.00", frequency: "" });
  const [frequencyOptions, setFrequencyOptions] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setFilters({ branchCode: "", groupCode: "", deptCode: "", employeeNo: "" });
    setFilterNames({ branchName: "", groupName: "", deptName: "" });
    setActiveLookup("");
    setEmployees([]);
    setSelectedEmployees([]);
    setSelectedLoans([]);
    setShowParameters(false);
    setGenerating(false);
    setParameterValues({ loanAmount: "0.00", amortizationAmount: "0.00", frequency: "" });
    setFrequencyOptions([]);
    setLoadingReferences(true);
    apiClient.get("/loanTransactions/selectionReferences")
      .then((response) => {
        const source = parseResult(response);
        setLoans(parseList(source.loans));
      })
      .finally(() => setLoadingReferences(false));
  }, [isOpen]);

  const loadEmployees = async () => {
    if (!payFrequency) return useSwalValidationAlert({ title: "Frequency Required", message: "Select the Loan Transaction Frequency before filtering employees." });
    if (!filters.groupCode) return useSwalValidationAlert({ title: "Payroll Group Required", message: "Select a Payroll Group before filtering employees." });
    setLoadingEmployees(true);
    setSelectedEmployees([]);
    try {
      const response = await apiClient.post("/loanTransactions/selectionEmployees", { jsonData: { branchCode: filters.branchCode, groupCode: filters.groupCode, deptCode: filters.deptCode, employeeNo: filters.employeeNo, payFrequency } });
      setEmployees(parseResult(response));
    } finally { setLoadingEmployees(false); }
  };

  const toggle = (setter, code) => setter((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  const allEmployeesSelected = employees.length > 0 && selectedEmployees.length === employees.length;
  const selectedEmployeeRows = useMemo(() => employees.filter((row) => selectedEmployees.includes(row.empNo)), [employees, selectedEmployees]);
  const selectedLoanRows = useMemo(() => loans.filter((row) => selectedLoans.includes(row.code)), [loans, selectedLoans]);
  const apply = async () => {
    if (!selectedEmployeeRows.length || !selectedLoanRows.length) return useSwalValidationAlert({ title: "Selection Required", message: "Select at least one employee and one loan type." });
    setGenerating(true);
    try {
      const employeeFrequencies = [...new Set(selectedEmployeeRows.map((employee) => employee.payFrequency).filter(Boolean))];
      let options = [];
      if (employeeFrequencies.length === 1) {
        const response = await apiClient.post("/getHSDropdown", { json_data: { dropdownColumn: "FREQ", docCode: employeeFrequencies[0] } });
        const raw = response?.data?.data?.[0]?.result || "[]";
        const records = Array.isArray(raw) ? raw : JSON.parse(raw);
        options = records.map((record) => ({ value: record.DROPDOWN_CODE ?? record.dropdownCode ?? record.code ?? "", label: record.DROPDOWN_NAME ?? record.dropdownName ?? record.label ?? "" })).filter((option) => option.value);
      }
      setFrequencyOptions(options);
      setParameterValues({ loanAmount: "0.00", amortizationAmount: "0.00", frequency: options[0]?.value || "" });
      setShowParameters(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } catch {
      setFrequencyOptions([]);
      setParameterValues({ loanAmount: "0.00", amortizationAmount: "0.00", frequency: "" });
      setShowParameters(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } finally {
      setGenerating(false);
    }
  };

  const confirmParameters = () => {
    onClose({ employees: selectedEmployeeRows, loans: selectedLoanRows, ...parameterValues });
  };

  const updateAmount = (field, value) => {
    const normalizedValue = String(value || "").replace(/,/g, "");
    if (/^\d*(\.\d{0,2})?$/.test(normalizedValue)) setParameterValues((current) => ({ ...current, [field]: normalizedValue }));
  };

  const formatParameterAmount = (field) => setParameterValues((current) => ({ ...current, [field]: formatAmount(current[field]) }));

  if (!isOpen) return null;
  const selectClass = "h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none";

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
    {(loadingReferences || loadingEmployees || generating) && <LoadingSpinner />}
    <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b bg-slate-100"><h2 className="global-lookup-headertext-ui pl-3">Select Employees and Loan Types</h2><button onClick={() => onClose(null)} className="p-3 text-slate-400 hover:text-red-600"><FontAwesomeIcon icon={faTimes} size="lg" /></button></div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_380px]">
        <section className="space-y-3 border-r border-slate-200 p-4">
          <h3 className="text-sm font-bold text-blue-700">Filter Options</h3>
          <label className="block text-xs font-semibold text-slate-600">Frequency<input value={{ S: "Semi-Monthly", M: "Monthly", D: "Daily" }[payFrequency] || ""} readOnly className={`${selectClass} mt-1 bg-slate-100`} /></label>
          <FieldRenderer label="Branch" type="lookup" editableLookup value={filters.branchCode ? `(${filters.branchCode}) - ${filterNames.branchName}` : ""} onLookup={() => setActiveLookup("branch")} onClear={() => { setFilters((current) => ({ ...current, branchCode: "" })); setFilterNames((current) => ({ ...current, branchName: "" })); }} />
          <FieldRenderer label="Payroll Group" required type="lookup" editableLookup value={filters.groupCode ? `(${filters.groupCode}) - ${filterNames.groupName}` : ""} onLookup={() => setActiveLookup("group")} onClear={() => { setFilters((current) => ({ ...current, groupCode: "" })); setFilterNames((current) => ({ ...current, groupName: "" })); }} />
          <FieldRenderer label="Department" type="lookup" editableLookup value={filters.deptCode ? `(${filters.deptCode}) - ${filterNames.deptName}` : ""} onLookup={() => setActiveLookup("department")} onClear={() => { setFilters((current) => ({ ...current, deptCode: "" })); setFilterNames((current) => ({ ...current, deptName: "" })); }} />
          <label className="block text-xs font-semibold text-slate-600">Employee No.<div className="relative mt-1"><input value={filters.employeeNo} onChange={(event) => setFilters((current) => ({ ...current, employeeNo: event.target.value }))} className={`${selectClass} pr-8`} placeholder="Contains employee number" />{filters.employeeNo && <button type="button" onClick={() => setFilters((current) => ({ ...current, employeeNo: "" }))} className="absolute right-0 top-0 flex h-9 w-8 items-center justify-center text-slate-400 hover:text-red-600"><FontAwesomeIcon icon={faTimes} /></button>}</div></label>
          <button type="button" disabled={loadingReferences || loadingEmployees} onClick={loadEmployees} className="flex h-9 w-full items-center justify-center gap-2 rounded bg-blue-600 text-xs font-semibold text-white disabled:opacity-50"><FontAwesomeIcon icon={loadingEmployees ? faSpinner : faFilter} spin={loadingEmployees} />Filter</button>
        </section>
        <section className="min-h-[420px] overflow-auto border-r border-slate-200">
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold"><input type="checkbox" disabled={!employees.length} checked={allEmployeesSelected} onChange={() => setSelectedEmployees(allEmployeesSelected ? [] : employees.map((row) => row.empNo))} />Select All Employees<span className="ml-auto">{employees.length} records</span></div>
          <table className="min-w-full border-separate border-spacing-0"><thead className="sticky top-9 bg-slate-200"><tr>{["", "Emp No.", "Employee Name", "Branch", "Pay Group", "Dept."].map((label) => <th key={label} className="global-lookup-th-ui">{label}</th>)}</tr></thead><tbody>{employees.map((row) => <tr key={row.empNo} onClick={() => toggle(setSelectedEmployees, row.empNo)} className="cursor-pointer hover:bg-blue-50 [&>td]:border-b [&>td]:border-slate-200"><td className="global-lookup-td-ui"><input type="checkbox" checked={selectedEmployees.includes(row.empNo)} readOnly /></td><td className="global-lookup-td-ui font-bold">{row.empNo}</td><td className="global-lookup-td-ui">{row.empName}</td><td className="global-lookup-td-ui">{row.branchCode}</td><td className="global-lookup-td-ui">{row.payGroup}</td><td className="global-lookup-td-ui">{row.deptCode}</td></tr>)}</tbody></table>
          {!loadingEmployees && !employees.length && <div className="p-12 text-center text-sm text-slate-400">Choose a Payroll Group, then press Filter.</div>}
        </section>
        <section className="min-h-[420px] overflow-auto"><table className="min-w-full border-separate border-spacing-0"><thead className="sticky top-0 bg-slate-200"><tr><th className="global-lookup-th-ui w-12" /><th className="global-lookup-th-ui">Code</th><th className="global-lookup-th-ui">Description</th></tr></thead><tbody>{loans.map((row) => <tr key={row.code} onClick={() => toggle(setSelectedLoans, row.code)} className="cursor-pointer hover:bg-blue-50 [&>td]:border-b [&>td]:border-slate-200"><td className="global-lookup-td-ui"><input type="checkbox" checked={selectedLoans.includes(row.code)} readOnly /></td><td className="global-lookup-td-ui font-bold">{row.code}</td><td className="global-lookup-td-ui">{row.description}</td></tr>)}</tbody></table></section>
      </div>
      {showParameters && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-blue-700">Apply Loan Information</h3><button type="button" onClick={() => setShowParameters(false)} className="text-slate-400 hover:text-red-600"><FontAwesomeIcon icon={faTimes} /></button></div>
          <div className="space-y-4 p-5">
            <FieldRenderer id="applyLoanAmount" label="Loan Amount" type="amount" value={parameterValues.loanAmount} inputMode="decimal" autoFocus hideClearButton onFocus={(event) => event.target.select()} onChange={(value) => updateAmount("loanAmount", value)} onBlur={() => formatParameterAmount("loanAmount")} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
            <FieldRenderer id="applyLoanAmortization" label="Loan Amortization" type="amount" value={parameterValues.amortizationAmount} inputMode="decimal" hideClearButton onFocus={(event) => event.target.select()} onChange={(value) => updateAmount("amortizationAmount", value)} onBlur={() => formatParameterAmount("amortizationAmount")} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
            <FieldRenderer id="applyLoanFrequency" label="Frequency" type="select" value={parameterValues.frequency} options={frequencyOptions} placeholder="Use employee default" hideClearButton onChange={(value) => setParameterValues((current) => ({ ...current, frequency: value }))} />
            <p className="text-[11px] text-slate-500">These values apply to all selected employee and loan combinations. You may leave them at their defaults and edit each row afterward.</p>
          </div>
          <div className="flex justify-end gap-2 border-t bg-slate-50 px-4 py-3"><button type="button" onClick={() => setShowParameters(false)} className="rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600">Back</button><button type="button" onClick={confirmParameters} className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Apply</button></div>
        </div>
      </div>}
      <div className="global-lookup-footer-records-div-ui"><span className="global-lookup-footer-records-text-ui">{selectedEmployees.length} employee(s), {selectedLoans.length} loan type(s)</span><button type="button" onClick={apply} disabled={generating} className="rounded bg-blue-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Generate</button></div>
    </div>
    <SearchBranchRef isOpen={activeLookup === "branch"} title="Select Branch" onClose={(selected) => { if (selected) { setFilters((current) => ({ ...current, branchCode: selected.branchCode })); setFilterNames((current) => ({ ...current, branchName: selected.branchName })); } setActiveLookup(""); }} />
    <SearchPayGroupRef isOpen={activeLookup === "group"} onClose={(selected) => { if (selected) { setFilters((current) => ({ ...current, groupCode: selected.code })); setFilterNames((current) => ({ ...current, groupName: selected.name })); } setActiveLookup(""); }} />
    <SearchDepartmentRef isOpen={activeLookup === "department"} onClose={(selected) => { if (selected) { setFilters((current) => ({ ...current, deptCode: selected.code })); setFilterNames((current) => ({ ...current, deptName: selected.name })); } setActiveLookup(""); }} />
  </div>;
};

export default SearchLoanEmployeeSelection;


