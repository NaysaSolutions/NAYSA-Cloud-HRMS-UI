/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { faBolt, faChevronDown, faFilter, faSave, faUndo } from "@fortawesome/free-solid-svg-icons";
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
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalErrorAlertAPI, useSwalSuccessAlert, useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const today = new Date().toISOString().slice(0, 10);
const INITIAL_FILTER = { branchCode: "", groupCode: "", deptCode: "", statCode: "", asOfDate: today };
const parseRows = (response) => { const raw = response?.data?.data?.[0]?.result; return raw ? JSON.parse(raw) : []; };
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-US") : "";
const frequencyText = { M: "Month", Q: "Quarter", Y: "Year" };
const creditKey = (leaveId) => `credit_${String(leaveId || "").replace(/[^a-z0-9]/gi, "_")}`;
const sameValue = (left, right) => String(left || "").trim().toUpperCase() === String(right || "").trim().toUpperCase();

const applyEmployeeFilters = (source, selected) => source.filter((row) =>
  (!selected.branchCode || sameValue(row.branchCode, selected.branchCode)) &&
  (!selected.groupCode || sameValue(row.groupCode, selected.groupCode)) &&
  (!selected.deptCode || sameValue(row.deptCode, selected.deptCode)) &&
  (!selected.statCode || sameValue(row.statCode, selected.statCode))
);

const GenerateLeaveCredits = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState(INITIAL_FILTER);
  const [rows, setRows] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [lookupState, setLookupState] = useState({ isOpen: false, key: "", label: "", options: [] });
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const { data: references = {}, isLoading: referencesLoading } = useQuery({
    queryKey: ["generateLeaveCreditReferences"],
    queryFn: async () => {
      const response = await apiClient.get("/generateLeaveCredits/references");
      const source = response?.data?.data?.[0] || {};
      return {
        branches: JSON.parse(source.branches || "[]"), payGroups: JSON.parse(source.payGroups || "[]"),
        departments: JSON.parse(source.departments || "[]"), employeeStatuses: JSON.parse(source.employeeStatuses || "[]"),
      };
    },
  });

  const { mutate: generate, isPending: generating } = useMutation({
    mutationFn: (jsonData) => apiClient.post("/generateLeaveCredits/preview", { jsonData }),
    onSuccess: (response) => {
      const result = applyEmployeeFilters(parseRows(response), filters);
      setRows(result);
      setHasGenerated(true);
      if (!result.length) useSwalValidationAlert({ title: "No Records", message: "No eligible employees matched the selected filters." });
    },
    onError: (error) => useSwalErrorAlertAPI("Generate Error", error),
  });
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (jsonData) => apiClient.post("/generateLeaveCredits/save", { jsonData }),
    onSuccess: (response) => useSwalSuccessAlert("Success!", `${response?.data?.data?.[0]?.savedCount || rows.length} leave credit records saved.`),
    onError: (error) => useSwalErrorAlertAPI("Save Error", error),
  });

  const runGenerate = () => {
    if (!filters.asOfDate) return useSwalValidationAlert({ title: "Required Field", message: "As Of Date is required." });
    generate({ ...filters, creditYear: Number(filters.asOfDate.slice(0, 4)) });
  };
  const saveRows = () => {
    if (!hasGenerated || !rows.length) return useSwalValidationAlert({ title: "Nothing to Save", message: "Generate the leave credits first." });
    save(JSON.stringify({ jsonData: { ...filters, creditYear: Number(filters.asOfDate.slice(0, 4)), userCode: user?.USER_CODE || "ADMIN", rows } }));
  };
  const reset = () => { setFilters(INITIAL_FILTER); setRows([]); setHasGenerated(false); };

  const creditRules = useMemo(() => {
    const uniqueRules = new Map();
    rows.forEach((row) => {
      if (row.leaveId && !uniqueRules.has(row.leaveId)) uniqueRules.set(row.leaveId, row);
    });
    return [...uniqueRules.values()];
  }, [rows]);

  const employeeRows = useMemo(() => {
    const employees = new Map();
    rows.forEach((row) => {
      const employeeKey = `${row.compCode || ""}|${row.empNo || ""}`;
      if (!employees.has(employeeKey)) {
        employees.set(employeeKey, {
          empNo: row.empNo,
          empName: row.empName,
          yearsService: row.yearsService,
          dateHired: row.dateHired,
          branchCode: row.branchCode,
          groupCode: row.groupCode,
          deptCode: row.deptCode,
          statCode: row.statCode,
        });
      }
      employees.get(employeeKey)[creditKey(row.leaveId)] = Number(row.generatedCredit || 0);
    });
    return [...employees.values()];
  }, [rows]);

  const columns = useMemo(() => {
    const leaveColumns = creditRules.map((rule) => {
      const period = rule.method === "AC" ? frequencyText[rule.incrementFreq] : "Year";
      const label = `${rule.leaveType || rule.leaveId}${period ? ` per ${period}` : ""} (Days)`;
      return {
        key: creditKey(rule.leaveId),
        label,
        sortable: true,
        width: 125,
        minWidth: 110,
        renderType: "number",
        roundingOff: 4,
      };
    });

    return [
      { key: "empNo", label: "Emp. No", sortable: true, width: 110, requiredVisible: true },
      { key: "empName", label: "Employee Name", sortable: true, width: 240, requiredVisible: true },
      ...leaveColumns,
      { key: "yearsService", label: "Yrs. of Service", sortable: true, width: 125, renderType: "number", roundingOff: 4 },
      { key: "dateHired", label: "Date Hired", sortable: true, width: 115, displayValue: (row) => dateText(row.dateHired), render: (row) => dateText(row.dateHired) },
      { key: "branchCode", label: "Branch", sortable: true, width: 90 },
      { key: "groupCode", label: "Pay Group", sortable: true, width: 100 },
      { key: "deptCode", label: "Department", sortable: true, width: 110 },
      { key: "statCode", label: "Emp. Status", sortable: true, width: 110 },
    ];
  }, [creditRules]);

  const lookup = (label, key, source) => {
    const selected = (source || []).find((item) => String(item.value) === String(filters[key] || ""));
    return <FieldRenderer
      label={label} type="lookup" readOnly editableLookup
      value={selected ? `(${selected.value}) - ${selected.label}` : ""}
      onLookup={() => setLookupState({ isOpen: true, key, label, options: source || [] })}
      onClear={() => setFilter(key, "")}
    />;
  };
  const busy = referencesLoading || generating || saving;
  const headerButtonClass = "flex h-8 w-[88px] items-center justify-center gap-1 rounded-md bg-blue-600 px-2 text-[11px] text-white disabled:opacity-50";

  return <div className="global-ref-main-div-ui">
    {busy && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3"><h1 className="global-ref-headertext-ui text-center md:text-left">Generate Leave Credits</h1><div /><div className="flex justify-center md:justify-end"><ButtonBar buttons={[
      { key: "filter", label: <span className="ml-1 hidden sm:inline">Filter</span>, icon: faFilter, onClick: runGenerate, className: headerButtonClass },
      { key: "generate", label: <span className="ml-1 hidden sm:inline">Generate</span>, icon: faBolt, onClick: runGenerate, className: headerButtonClass },
      { key: "save", label: <span className="ml-1 hidden sm:inline">Save</span>, icon: faSave, onClick: saveRows, disabled: !rows.length || saving, className: headerButtonClass },
      { key: "reset", label: <span className="ml-1 hidden sm:inline">Reset</span>, icon: faUndo, onClick: reset, className: headerButtonClass },
    ]} /></div></div></div>

    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <p className="p-1.5 text-[11px] font-semibold text-blue-600 sm:text-[14px]">Select filters to generate employee leave credits</p>
        <button type="button" onClick={() => setIsFiltersExpanded((expanded) => !expanded)} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" aria-expanded={isFiltersExpanded} aria-controls="generate-leave-credit-filters">
          <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`} />
          {isFiltersExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div id="generate-leave-credit-filters" className={`grid grid-cols-1 gap-x-12 gap-y-4 transition-all duration-200 md:grid-cols-3 ${isFiltersExpanded ? "opacity-100" : "hidden"}`}>
        <div className="space-y-2">
          {lookup("Branch", "branchCode", references.branches)}
          {lookup("Pay Group", "groupCode", references.payGroups)}
          {lookup("Department", "deptCode", references.departments)}
        </div>

        <div className="space-y-2">
          {lookup("Employee Status", "statCode", references.employeeStatuses)}
          <FieldRenderer label="As Of Date" required type="date" value={filters.asOfDate} onChange={(value) => setFilter("asOfDate", value)} />
        </div>

        <div />
      </div>
    </div>

    <div className="global-tran-table-main-div-ui mt-4"><SearchGlobalReferenceTable docType="GenerateLeaveCredits" columns={columns} data={employeeRows} isLoading={generating} itemsPerPage={50} autoFillGrid="True" onRefresh={runGenerate} /></div>

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
  </div>;
};

export default GenerateLeaveCredits;
