import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faFilter, faPrint, faUndo } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useSwalErrorAlertAPI, useSwalInfoAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchDepartmentRef from "@/NAYSA Cloud/Lookup/SearchDepartmentRef.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchEmployeeStatusRef from "@/NAYSA Cloud/Lookup/SearchEmployeeStatusRef.jsx";
import SearchGlobalLookupv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchPayGroupRef from "@/NAYSA Cloud/Lookup/SearchPayGroupRef.jsx";

const currentYear = new Date().getFullYear();
const parseList = (value) => { try { return JSON.parse(value || "[]"); } catch { return []; } };
const parseRows = (response) => { try { return JSON.parse(response?.data?.data?.[0]?.result || "[]"); } catch { return []; } };

const PayrollYearEndInquiry = ({ config }) => {
  const initialFilters = useMemo(() => ({ branchCode: "", groupCode: "", deptCode: "", statCode: "", empNo: "", empName: "", frequency: "", cutoffCode: "", processYear: String(currentYear), scheduleCode: "" }), []);
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [lookupState, setLookupState] = useState({ isOpen: false, key: "", title: "", options: [] });
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const closeLookup = () => setLookupState({ isOpen: false, key: "", title: "", options: [] });

  const { data: references = {}, isLoading: referencesLoading } = useQuery({
    queryKey: [config.queryKey, "references"],
    queryFn: async () => {
      const response = await apiClient.get(config.referencesEndpoint);
      const source = response?.data?.data?.[0] || {};
      const processYears = parseList(source.processYears);
      if (!processYears.some((item) => String(item.value) === String(currentYear))) processYears.unshift({ value: currentYear, label: String(currentYear) });
      return {
        branches: parseList(source.branches),
        payGroups: parseList(source.payGroups),
        departments: parseList(source.departments),
        employeeStatuses: parseList(source.employeeStatuses),
        frequencies: parseList(source.frequencies),
        cutoffs: parseList(source.cutoffs),
        processYears,
        schedules: parseList(source.schedules),
      };
    },
  });

  const loadMutation = useMutation({
    mutationFn: () => apiClient.post(config.loadEndpoint, { jsonData: { ...filters, processYear: Number(filters.processYear) } }),
    onSuccess: (response) => {
      const result = parseRows(response);
      setRows(result);
      if (!result.length) useSwalInfoAlert("No Records", config.noRecordsMessage);
    },
    onError: (error) => useSwalErrorAlertAPI("Load Error", error),
  });

  const loadRows = () => loadMutation.mutate();
  const reset = () => { setFilters(initialFilters); setRows([]); };
  const selectedText = (key, source) => {
    const selected = (source || []).find((item) => String(item.value) === String(filters[key] || ""));
    return selected ? `(${selected.value}) - ${selected.label}` : "";
  };
  const optionLookup = (label, key, source, required = false) => <FieldRenderer label={label} required={required} type="lookup" readOnly editableLookup value={selectedText(key, source)} onLookup={() => setLookupState({ isOpen: true, key, title: `Select ${label}`, options: source || [] })} onClear={() => !required && setFilter(key, "")} />;
  const standardLookup = (label, key, source) => <FieldRenderer label={label} type="lookup" readOnly editableLookup value={selectedText(key, source)} onLookup={() => setLookupState({ isOpen: true, key, title: `Select ${label}`, options: source || [] })} onClear={() => setFilter(key, "")} />;
  const filterField = (key) => {
    if (key === "branchCode") return standardLookup("Branch", key, references.branches);
    if (key === "groupCode") return standardLookup("Payroll Group", key, references.payGroups);
    if (key === "deptCode") return standardLookup("Department", key, references.departments);
    if (key === "statCode") return standardLookup("Employee Status", key, references.employeeStatuses);
    if (key === "frequency") return optionLookup("Pay Frequency", key, references.frequencies);
    if (key === "cutoffCode") return optionLookup(config.cutoffLabel || "Payroll Cut-Off", key, references.cutoffs);
    if (key === "scheduleCode") return <FieldRenderer label="Alphalist Schedule" type="select" value={filters.scheduleCode} options={references.schedules} placeholder="Select Schedule" onChange={(value) => setFilter("scheduleCode", value)} />;
    if (key === "processYear") return optionLookup(config.yearLabel, key, references.processYears, true);
    if (key === "empNo") return <FieldRenderer label="Employee" type="lookup" readOnly editableLookup value={filters.empNo ? `(${filters.empNo}) - ${filters.empName || filters.empNo}` : ""} onLookup={() => setLookupState({ isOpen: true, key: "empNo", title: "Select Employee", options: [] })} onClear={() => setFilters((current) => ({ ...current, empNo: "", empName: "" }))} />;
    return null;
  };
  const headerButtonClass = "flex h-8 w-[80px] items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] text-white disabled:cursor-not-allowed disabled:opacity-50";
  const busy = referencesLoading || loadMutation.isPending;

  return <div className="global-ref-main-div-ui">
    {busy && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3">
      <h1 className="global-ref-headertext-ui text-center md:text-left">{config.title}</h1><div />
      <div className="flex justify-center md:justify-end"><ButtonBar buttons={[
        { key: "find", label: <span className="ml-1 hidden sm:inline">Find</span>, icon: faFilter, onClick: loadRows, className: headerButtonClass },
        { key: "reset", label: <span className="ml-1 hidden sm:inline">Reset</span>, icon: faUndo, onClick: reset, className: headerButtonClass },
        { key: "print", label: <span className="ml-1 hidden sm:inline">Print</span>, icon: faPrint, onClick: () => window.print(), disabled: !rows.length, className: headerButtonClass },
      ]} /></div>
    </div></div>

    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <p className="p-1.5 text-[11px] font-semibold text-blue-600 sm:text-[14px]">{config.filterCaption}</p>
        <button type="button" onClick={() => setIsFiltersExpanded((expanded) => !expanded)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300" aria-expanded={isFiltersExpanded}>
          <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`} />{isFiltersExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div className={`grid grid-cols-1 gap-x-12 gap-y-4 transition-all duration-200 md:grid-cols-3 ${isFiltersExpanded ? "opacity-100" : "hidden"}`}>
        {config.filterColumns.map((fields, columnIndex) => <div key={columnIndex} className="space-y-2">{fields.map((key) => <div key={key}>{filterField(key)}</div>)}</div>)}
      </div>
    </div>

    <div className="global-tran-table-main-div-ui mt-4"><SearchGlobalReferenceTable docType={config.docType} columns={config.columns} data={rows} isLoading={busy} itemsPerPage={50} autoFillGrid="True" onRefresh={loadRows} /></div>

    <SearchBranchRef isOpen={lookupState.isOpen && lookupState.key === "branchCode"} title="Select Branch" onClose={(selected) => { if (selected) setFilter("branchCode", selected.branchCode || selected.BRANCH_CODE || ""); closeLookup(); }} />
    <SearchPayGroupRef isOpen={lookupState.isOpen && lookupState.key === "groupCode"} referenceEndpoint={config.referencesEndpoint} onClose={(selected) => { if (selected) setFilter("groupCode", selected.code); closeLookup(); }} />
    <SearchDepartmentRef isOpen={lookupState.isOpen && lookupState.key === "deptCode"} referenceEndpoint={config.referencesEndpoint} onClose={(selected) => { if (selected) setFilter("deptCode", selected.code); closeLookup(); }} />
    <SearchEmployeeStatusRef isOpen={lookupState.isOpen && lookupState.key === "statCode"} referenceEndpoint={config.referencesEndpoint} onClose={(selected) => { if (selected) setFilter("statCode", selected.code); closeLookup(); }} />
    <SearchEmployeeRef isOpen={lookupState.isOpen && lookupState.key === "empNo"} onClose={(selected) => { if (selected) setFilters((current) => ({ ...current, empNo: selected.empNo || "", empName: selected.empName || "" })); closeLookup(); }} />
    <SearchGlobalLookupv1 isOpen={lookupState.isOpen && ["processYear", "frequency", "cutoffCode"].includes(lookupState.key)} title={lookupState.title} btnCaption="Apply Selection" singleSelect data={lookupState.options.map((item) => ({ groupId: String(item.value), code: String(item.value), description: String(item.label) }))} endpoint={[{ key: "code", label: "Code", width: 140 }, { key: "description", label: "Description", width: 260 }]} onCancel={closeLookup} onClose={(selection) => { const selected = selection?.records?.[0]; if (selected) setFilter(lookupState.key, selected.code); closeLookup(); }} />
  </div>;
};


const numberColumn = (key, label, width = 140) => ({ key, label, width, renderType: "number", roundingOff: 2 });
const config = {
  title: "BIR Alphalist",
  filterCaption: "Select filters to view prepared BIR Alphalist records",
  noRecordsMessage: "No BIR Alphalist records matched the selected filters.",
  queryKey: "birAlphalist",
  referencesEndpoint: "/birAlphalist/references",
  loadEndpoint: "/birAlphalist/load",
  docType: "BIRAlphalist",
  yearLabel: "Tax Year",
  filterColumns: [["branchCode", "empNo"], ["scheduleCode"], ["processYear"]],
  columns: [
    { key: "sequenceNo", label: "Seq. No.", width: 85, requiredVisible: true },
    { key: "empNo", label: "Employee No.", width: 120, requiredVisible: true },
    { key: "tin", label: "TIN", width: 135 },
    { key: "empName", label: "Employee Name", width: 220, requiredVisible: true },
    numberColumn("grossCompensation", "Gross Compensation", 155),
    numberColumn("nonTaxableBonus", "Non-Tax 13th Month", 155),
    numberColumn("deMinimis", "De Minimis"),
    numberColumn("governmentContributions", "SSS/PHIC/HDMF", 145),
    numberColumn("otherNonTaxable", "Other Non-Taxable", 150),
    numberColumn("totalExempt", "Total Exempt"),
    numberColumn("basicSalary", "Basic Salary"),
    numberColumn("taxableBonus", "Taxable 13th Month", 150),
    numberColumn("otherTaxable", "Other Taxable"),
    numberColumn("totalTaxable", "Total Taxable"),
    numberColumn("netTaxable", "Net Taxable"),
    numberColumn("taxDue", "Tax Due"),
    numberColumn("taxWithheld", "Tax Withheld"),
    numberColumn("decemberAdjustment", "December Adjustment", 160),
    numberColumn("refundedTax", "Refunded Tax"),
    numberColumn("adjustedTaxWithheld", "Adjusted Tax Withheld", 165),
    { key: "status", label: "Status", width: 95 },
  ],
};

const BIRAlphalist = () => <PayrollYearEndInquiry config={config} />;
export default BIRAlphalist;
