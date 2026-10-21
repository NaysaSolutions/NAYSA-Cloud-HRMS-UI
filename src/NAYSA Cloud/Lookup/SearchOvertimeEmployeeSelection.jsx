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
  parseOvertimeReferences,
  parseOvertimeSelectionResult,
} from "@/NAYSA Cloud/Global/overtimeSelection.js";

const SearchOvertimeEmployeeSelection = ({ isOpen, payFrequency, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState({
    branches: [],
    payGroups: [],
    departments: [],
    overtimes: [],
  });

  const [filters, setFilters] = useState({
    groupCode: "",
    branchCode: "",
    deptCode: "",
    employeeNo: "",
  });

  const [otSearch, setOtSearch] = useState("");
  const [defaultOtHours, setDefaultOtHours] = useState("0.00");
  const [employees, setEmployees] = useState([]);
  const [selectedEmpNos, setSelectedEmpNos] = useState(new Set());
  const [selectedOtCodes, setSelectedOtCodes] = useState(new Set());

  // Load branches, payGroups, departments, and ref_ot (overtimes)
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setSelectedEmpNos(new Set());
    setSelectedOtCodes(new Set());
    setEmployees([]);
    setDefaultOtHours("0.00");
    setOtSearch("");
    setReferences({ branches: [], payGroups: [], departments: [], overtimes: [] });

    const fetchReferences = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/overtimeTransactions/selectionReferences", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = parseOvertimeReferences(response);
        setReferences(data);
        setFilters((prev) => ({
          ...prev,
          groupCode: data.payGroups.some((group) => group.value === prev.groupCode)
            ? prev.groupCode : data.payGroups[0]?.value || "",
          branchCode: data.branches.some((branch) => branch.value === prev.branchCode)
            ? prev.branchCode : "",
          deptCode: data.departments.some((department) => department.value === prev.deptCode)
            ? prev.deptCode : "",
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
    if (!filters.groupCode) {
      return showValidationAlert({
        title: "Payroll Group Required",
        message: "Please select a Payroll Group first.",
      });
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/overtimeTransactions/selectionEmployees", {
        jsonData: {
          groupCode: filters.groupCode,
          branchCode: filters.branchCode || null,
          deptCode: filters.deptCode || null,
          employeeNo: filters.employeeNo || null,
          payFrequency: payFrequency,
        },
      });
      const list = parseOvertimeSelectionResult(response);
      if (!Array.isArray(list)) throw new Error("The overtime service returned an invalid employee list.");
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

  const filteredOvertimes = useMemo(() => {
    const keyword = otSearch.trim().toLowerCase();
    if (!keyword) return references.overtimes;
    return references.overtimes.filter(
      (ot) =>
        String(ot.code || "").toLowerCase().includes(keyword) ||
        String(ot.description || "").toLowerCase().includes(keyword)
    );
  }, [references.overtimes, otSearch]);

  const toggleEmployee = (empNo) => {
    setSelectedEmpNos((prev) => {
      const next = new Set(prev);
      next.has(empNo) ? next.delete(empNo) : next.add(empNo);
      return next;
    });
  };

  const toggleAllEmployees = () => {
    if (selectedEmpNos.size === employees.length && employees.length > 0) {
      setSelectedEmpNos(new Set());
    } else {
      setSelectedEmpNos(new Set(employees.map((e) => e.empNo)));
    }
  };

  const toggleOvertime = (code) => {
    setSelectedOtCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleAllOvertimes = () => {
    if (selectedOtCodes.size === filteredOvertimes.length && filteredOvertimes.length > 0) {
      setSelectedOtCodes(new Set());
    } else {
      setSelectedOtCodes(new Set(filteredOvertimes.map((ot) => ot.code)));
    }
  };

  const handleConfirm = () => {
    const chosenEmployees = employees.filter((e) => selectedEmpNos.has(e.empNo));
    const chosenOvertimes = references.overtimes.filter((ot) => selectedOtCodes.has(ot.code));

    if (!chosenEmployees.length) {
      return showValidationAlert({
        title: "Employee Required",
        message: "Please select at least one employee.",
      });
    }

    if (!chosenOvertimes.length) {
      return showValidationAlert({
        title: "Overtime Type Required",
        message: "Please select at least one Overtime Code from ref_ot.",
      });
    }

    onClose({
      employees: chosenEmployees,
      overtimes: chosenOvertimes,
      otHours: defaultOtHours,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {loading && <LoadingSpinner />}
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Select Employees & Overtime Types
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
        <div className="grid grid-cols-1 gap-3 border-b bg-slate-50 p-4 md:grid-cols-5 dark:border-slate-700 dark:bg-slate-800/50">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Payroll Group <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.groupCode}
              disabled={loading}
              onChange={(e) => setFilters((prev) => ({ ...prev, groupCode: e.target.value }))}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select Group</option>
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
              disabled={loading || !references.payGroups.some((group) => group.value === filters.groupCode)}
              className="flex h-8 w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              Load Employees
            </button>
          </div>
        </div>

        {/* Body: 2 Tables (Employees & Overtime Types from ref_ot) */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
          {/* Left: Employees Table */}
          <div className="flex flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Employees ({selectedEmpNos.size} selected)
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-80">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="w-8 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={employees.length > 0 && selectedEmpNos.size === employees.length}
                        onChange={toggleAllEmployees}
                      />
                    </th>
                    <th className="p-2">Emp No.</th>
                    <th className="p-2">Employee Name</th>
                    <th className="p-2">Branch</th>
                    <th className="p-2">Dept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        Click &quot;Load Employees&quot; to view records.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
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
                        <td className="p-2 font-medium">{emp.empNo}</td>
                        <td className="p-2">{emp.empName}</td>
                        <td className="p-2">{emp.branchCode}</td>
                        <td className="p-2">{emp.deptCode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Overtime Types Table (ref_ot) */}
          <div className="flex flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Overtime Types - ref_ot ({selectedOtCodes.size} selected)
              </span>
              <input
                type="text"
                value={otSearch}
                onChange={(e) => setOtSearch(e.target.value)}
                placeholder="Filter OT Code / Description..."
                className="h-6 w-48 rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto max-h-80">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="w-8 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredOvertimes.length > 0 &&
                          selectedOtCodes.size === filteredOvertimes.length
                        }
                        onChange={toggleAllOvertimes}
                      />
                    </th>
                    <th className="w-32 p-2">OT Code</th>
                    <th className="p-2">OT Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredOvertimes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400">
                        No Overtime Types found in ref_ot.
                      </td>
                    </tr>
                  ) : (
                    filteredOvertimes.map((ot) => (
                      <tr
                        key={ot.code}
                        onClick={() => toggleOvertime(ot.code)}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOtCodes.has(ot.code)}
                            onChange={() => toggleOvertime(ot.code)}
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
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Default OT Hours:
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={defaultOtHours}
              onChange={(e) => {
                const val = e.target.value.replace(/,/g, "");
                if (/^\d*(\.\d{0,2})?$/.test(val)) setDefaultOtHours(val);
              }}
              className="h-8 w-28 rounded border border-slate-300 px-2 text-right text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

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
              disabled={loading || !selectedEmpNos.size || !selectedOtCodes.size}
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

export default SearchOvertimeEmployeeSelection;
