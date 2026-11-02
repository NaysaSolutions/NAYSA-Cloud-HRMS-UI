/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalValidationAlert as showValidationAlert,
  useSwalErrorAlertAPI as showErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  parseSystemGeneratedReferences,
  parseSystemGeneratedResult,
} from "@/NAYSA Cloud/Global/systemGenerated.js";

const employeeColumns = [
  ["empNo", "Emp No."],
  ["empName", "Employee Name"],
  ["branchName", "Branch"],
  ["groupName", "Pay Group"],
  ["deptName", "Department"],
  ["posName", "Position"],
  ["statName", "Status"],
];

const codeColumns = [
  ["code", "Code"],
  ["description", "Description"],
];

const normalizeValue = (value) => String(value ?? "").toLowerCase();

const sortRows = (rows, sort) => {
  if (!sort.key) return rows;
  return [...rows].sort((left, right) => {
    const result = normalizeValue(left[sort.key]).localeCompare(normalizeValue(right[sort.key]), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return sort.direction === "desc" ? -result : result;
  });
};

const SearchSystemGeneratedEmployeeSelection = ({ isOpen, payFrequency, cutoffCode, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState({
    branches: [],
    payGroups: [],
    departments: [],
    clients: [], statuses: [], positions: [],
    edCodes: [],
  });

  const [filters, setFilters] = useState({
    groupCode: "",
    branchCode: "",
    deptCode: "",
    clientCode: "", employeeStatus: "", posCode: "",
    employeeNo: "",
  });

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [employeeColumnFilters, setEmployeeColumnFilters] = useState({});
  const [codeColumnFilters, setCodeColumnFilters] = useState({});
  const [employeeSort, setEmployeeSort] = useState({ key: "", direction: "asc" });
  const [codeSort, setCodeSort] = useState({ key: "", direction: "asc" });
  const [employees, setEmployees] = useState([]);
  const [selectedEmpNos, setSelectedEmpNos] = useState(new Set());
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  // Load branches, payGroups, departments, and REF_ED (edCodes)
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setSelectedEmpNos(new Set());
    setSelectedCodes(new Set());
    setEmployees([]);
    setEmployeeSearch("");
    setCodeSearch("");
    setEmployeeColumnFilters({});
    setCodeColumnFilters({});
    setEmployeeSort({ key: "", direction: "asc" });
    setCodeSort({ key: "", direction: "asc" });
    setReferences({ branches: [], payGroups: [], departments: [], clients: [], statuses: [], positions: [], edCodes: [] });

    const fetchReferences = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/systemGeneratedTransactions/selectionReferences", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = parseSystemGeneratedReferences(response);
        setReferences((prev) => ({ ...prev, ...data }));
        setFilters((prev) => ({
          ...prev,
          groupCode: data.payGroups.some((group) => group.value === prev.groupCode)
            ? prev.groupCode : "",
          branchCode: data.branches.some((branch) => branch.value === prev.branchCode)
            ? prev.branchCode : "",
          deptCode: data.departments.some((department) => department.value === prev.deptCode)
            ? prev.deptCode : "",
          // posCode: data.positions.some((position) => position.value === prev.posCode)
          //   ? prev.posCode : "",
        }));
      } catch (error) {
        if (!controller.signal.aborted) {
          showErrorAlert("Reference Load Error", error?.response?.data?.message || error.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchReferences();
    return () => controller.abort();
  }, [isOpen]);

  const handleSearchEmployees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post("/systemGeneratedTransactions/selectionEmployees", {
        jsonData: {
          groupCode: filters.groupCode || null,
          branchCode: filters.branchCode || null,
          deptCode: filters.deptCode || null,
          clientCode: filters.clientCode || null,
          employeeStatus: filters.employeeStatus || null,
          posCode: filters.posCode || null,
          employeeNo: filters.employeeNo || null,
          payFrequency,
          cutoffCode,
        },
      });

      const list = parseSystemGeneratedResult(response);
      if (!Array.isArray(list)) throw new Error("The System Generated service returned an invalid employee list.");
      setEmployees(list);
      setSelectedEmpNos(new Set());
    } catch (error) {
      setEmployees([]);
      setSelectedEmpNos(new Set());
      const validationMessage = Object.values(error?.response?.data?.errors || {}).flat()[0];
      showErrorAlert("Employee Search Error", validationMessage || error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const keyword = employeeSearch.trim().toLowerCase();
    const filtered = employees.filter((employee) => {
      const matchesSearch = !keyword || ["empNo", "empName", "branchName", "groupName", "deptName", "posName"].some((key) =>
        normalizeValue(employee[key]).includes(keyword)
      );
      const matchesColumns = employeeColumns.every(([key]) =>
        normalizeValue(employee[key]).includes(normalizeValue(employeeColumnFilters[key]))
      );
      return matchesSearch && matchesColumns;
    });
    return sortRows(filtered, employeeSort);
  }, [employees, employeeSearch, employeeColumnFilters, employeeSort]);

  const allVisibleEmployeesSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((employee) => selectedEmpNos.has(employee.empNo));

  const filteredCodes = useMemo(() => {
    const keyword = codeSearch.trim().toLowerCase();
    const filtered = references.edCodes.filter((ot) => {
      const matchesSearch = !keyword || ["code", "description"].some((key) =>
        normalizeValue(ot[key]).includes(keyword)
      );
      const matchesColumns = codeColumns.every(([key]) =>
        normalizeValue(ot[key]).includes(normalizeValue(codeColumnFilters[key]))
      );
      return matchesSearch && matchesColumns;
    });
    return sortRows(filtered, codeSort);
  }, [references.edCodes, codeSearch, codeColumnFilters, codeSort]);

  const toggleSort = (setSort, currentSort, key) => {
    setSort({
      key,
      direction: currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
    });
  };

  const sortIndicator = (sort, key) => (sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "");

  const toggleEmployee = (empNo) => {
    setSelectedEmpNos((prev) => {
      const next = new Set(prev);
      next.has(empNo) ? next.delete(empNo) : next.add(empNo);
      return next;
    });
  };

  const toggleAllEmployees = () => {
    setSelectedEmpNos((prev) => {
      const next = new Set(prev);
      const allSelected = filteredEmployees.every((employee) => prev.has(employee.empNo));
      filteredEmployees.forEach((employee) => {
        if (allSelected) next.delete(employee.empNo);
        else next.add(employee.empNo);
      });
      return next;
    });
  };

  const toggleCode = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleAllCodes = () => {
    if (selectedCodes.size === filteredCodes.length && filteredCodes.length > 0) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredCodes.map((ot) => ot.code)));
    }
  };

  const handleConfirm = () => {
    const chosenEmployees = employees.filter((e) => selectedEmpNos.has(e.empNo));
    const chosenCodes = references.edCodes.filter((ot) => selectedCodes.has(ot.code));

    if (!chosenEmployees.length) {
      return showValidationAlert({
        title: "Employee Required",
        message: "Please select at least one employee.",
      });
    }

    if (!chosenCodes.length) {
      return showValidationAlert({
        title: "Code Required",
        message: "Please select at least one Code from REF_ED.",
      });
    }

    onClose({
      employees: chosenEmployees,
      edCodes: chosenCodes,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {loading && <LoadingSpinner />}
      <div className="flex max-h-[90vh] w-full max-w-8xl flex-col rounded-lg bg-white shadow-xl dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-3 py-3 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Select Employees & Codes
          </h2>
          <button
            type="button"
            onClick={() => onClose(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 border-b bg-slate-50 p-4 md:grid-cols-4 xl:grid-cols-8 dark:border-slate-700 dark:bg-slate-800/50">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Payroll Group
            </label>
            <select
              value={filters.groupCode}
              disabled={loading}
              onChange={(e) => setFilters((prev) => ({ ...prev, groupCode: e.target.value }))}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Pay Groups</option>
              {references.payGroups.map((pg) => (
                <option key={pg.value} value={pg.value}>
                  {pg.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Branch
            </label>
            <select
              value={filters.branchCode}
              disabled={loading}
              onChange={(e) => setFilters((prev) => ({ ...prev, branchCode: e.target.value }))}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Branches</option>
              {references.branches.map((br) => (
                <option key={br.value} value={br.value}>
                  {br.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Department
            </label>
            <select
              value={filters.deptCode}
              disabled={loading}
              onChange={(e) => setFilters((prev) => ({ ...prev, deptCode: e.target.value }))}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Departments</option>
              {references.departments.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          {[
            ["clientCode", "Client", references.clients || []],
            ["employeeStatus", "Employee Status", references.statuses || []],
            ["posCode", "Position", references.positions || []],
          ].map(([key, label, options]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
              <select value={filters[key]} disabled={loading}
                onChange={(event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }))}
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <option value="">All {label}s</option>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Employee No.
            </label>
            <input
              type="text"
              value={filters.employeeNo}
              onChange={(e) => setFilters((prev) => ({ ...prev, employeeNo: e.target.value }))}
              placeholder="Search Emp No..."
              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearchEmployees}
              disabled={loading}
              className="flex h-8 w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              Load Employees
            </button>
          </div>
        </div>

        {/* Body: 2 Tables (Employees & Codes from REF_ED) */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[3.5fr_1.5fr]">
          {/* Left: Employees Table */}
          <div className="flex flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Employees ({selectedEmpNos.size} selected)
              </span>
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search ..."
                aria-label="Filter employees by number or name"
                className="h-6 w-48 rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto max-h-80">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="w-8 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleEmployeesSelected}
                        onChange={toggleAllEmployees}
                        disabled={filteredEmployees.length === 0}
                        aria-label="Select all filtered employees"
                      />
                    </th>
                    {employeeColumns.map(([key, label]) => (
                      <th key={key} className="p-2">
                        <button
                          type="button"
                          onClick={() => toggleSort(setEmployeeSort, employeeSort, key)}
                          className="font-semibold hover:text-blue-600"
                          aria-label={`Sort by ${label}`}
                        >
                          {label}{sortIndicator(employeeSort, key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-white dark:bg-slate-800">
                    <th className="p-1" />
                    {employeeColumns.map(([key, label]) => (
                      <th key={key} className="p-1">
                        <input
                          type="text"
                          value={employeeColumnFilters[key] || ""}
                          onChange={(e) =>
                            setEmployeeColumnFilters((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          // placeholder={`Filter ${label}`}
                          placeholder={`Filter ...`}
                          aria-label={`Filter employees by ${label}`}
                          className="h-6 w-full min-w-0 rounded border border-slate-300 bg-white px-1 text-[10px] font-normal dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={employeeColumns.length + 1} className="p-4 text-center text-slate-400">
                        {employees.length === 0
                          ? 'Click "Load Employees" to view records.'
                          : "No matching employees found."}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr
                        key={emp.empNo}
                        onClick={() => toggleEmployee(emp.empNo)}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEmpNos.has(emp.empNo)}
                            onChange={() => toggleEmployee(emp.empNo)}
                          />
                        </td>
                        <td className="p-2">{emp.empNo}</td>
                        <td className="p-2">{emp.empName}</td>
                        <td className="p-2">{emp.branchName}</td>
                        <td className="p-2">{emp.groupName}</td>
                        <td className="p-2">{emp.deptName}</td>
                        <td className="p-2">{emp.posName}</td>
                        <td className="p-2">{emp.statName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Codes Table (REF_ED) */}
          <div className="flex flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Codes ({selectedCodes.size} selected)
              </span>
              <input
                type="text"
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
                // placeholder="Filter Code / Description..."
                placeholder={`Search ...`}
                className="h-6 w-48 rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto max-h-80">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="w-8 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCodes.length > 0 &&
                          selectedCodes.size === filteredCodes.length
                        }
                        onChange={toggleAllCodes}
                      />
                    </th>
                    {codeColumns.map(([key, label]) => (
                      <th key={key} className={key === "code" ? "w-20 p-2" : "p-2"}>
                        <button
                          type="button"
                          onClick={() => toggleSort(setCodeSort, codeSort, key)}
                          className="font-semibold hover:text-blue-600"
                          aria-label={`Sort by ${label}`}
                        >
                          {label}{sortIndicator(codeSort, key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-white dark:bg-slate-800">
                    <th className="p-1" />
                    {codeColumns.map(([key, label]) => (
                      <th key={key} className="p-1">
                        <input
                          type="text"
                          value={codeColumnFilters[key] || ""}
                          onChange={(e) =>
                            setCodeColumnFilters((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          // placeholder={`Filter ${label}`}
                          placeholder={`Filter ...`}
                          aria-label={`Filter codes by ${label}`}
                          className="h-6 w-full min-w-0 rounded border border-slate-300 bg-white px-1 text-[10px] font-normal dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400">
                        No Codes found in REF_ED.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((ot) => (
                      <tr
                        key={ot.code}
                        onClick={() => toggleCode(ot.code)}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCodes.has(ot.code)}
                            onChange={() => toggleCode(ot.code)}
                          />
                        </td>
                        <td className="p-2 font-medium">{ot.code}</td>
                        <td className="p-2">{ot.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t px-6 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose(null)}
              className="rounded border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !selectedEmpNos.size || !selectedCodes.size}
              className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faCheck} />
              Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSystemGeneratedEmployeeSelection;
