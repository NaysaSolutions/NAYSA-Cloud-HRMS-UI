/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faEdit, faPlus, faSave, faTrashAlt, faUndo } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { reftables } from "@/NAYSA Cloud/Global/reftable";
import { useSwalDeleteConfirm, useSwalDeleteRecord, useSwalErrorAlertAPI, useSwalSuccessAlert, useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const DOC_TYPE = "LeaveCredit";
const GROUPS = { leaveType: "LV_LVTYPE", method: "LV_METHOD", incrementFreq: "LV_INCREMENT_FREQ", grantTiming: "LV_GRANT", prorateBasis: "LV_PRORATEBASIS", carryForward: "LV_CARRYFORWARD" };
const INITIAL = { leaveId: "", leaveType: "", method: "", initialLc: "0.0000", maxLc: "0.0000", incrementDays: "0.0000", incrementHrs: "0.0000", incrementFreq: "", grantTiming: "", prorateBasis: "", carryForward: "N", carryForwardLimit: "0.0000" };
const EMPTY_REG = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };
const parseRows = (response) => { const raw = response?.data?.data?.[0]?.result; return raw ? JSON.parse(raw) : []; };
const numberText = (value) => Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

const RefLeaveCredit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [registration, setRegistration] = useState(EMPTY_REG);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["leaveCreditList"], queryFn: async () => parseRows(await apiClient.get("/leaveCredit")) });
  const { data: options = {}, isLoading: dropdownLoading } = useQuery({
    queryKey: ["leaveCreditDropdowns"],
    queryFn: async () => Object.fromEntries(await Promise.all(Object.entries(GROUPS).map(async ([key, dropdownColumn]) => {
      const response = await apiClient.post("/getHSDropdown", { json_data: { dropdownColumn, docCode: "LEAVE_CREDIT" } });
      return [key, parseRows(response)
        .map((row) => ({ value: String(row.DROPDOWN_CODE ?? "").trim(), label: row.DROPDOWN_NAME ?? "" }))
        .filter((option) => option.value !== "")];
    }))),
  });

  const reset = useCallback(() => { setForm(INITIAL); setRegistration(EMPTY_REG); setSelectedId(null); setEditing(false); setExpanded(false); }, []);
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload) => apiClient.post("/upsertLeaveCredit", payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leaveCreditList"] }); useSwalSuccessAlert("Success!", "Leave credit saved successfully!"); reset(); },
    onError: (error) => useSwalErrorAlertAPI("System Error", error),
  });
  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (payload) => apiClient.post("/deleteLeaveCredit", payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leaveCreditList"] }); useSwalDeleteRecord("Deleted!", "The leave credit has been removed."); reset(); },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const add = () => { reset(); setEditing(true); setExpanded(true); };
  const edit = useCallback((row) => {
    setForm(Object.fromEntries(Object.keys(INITIAL).map((key) => [key, ["initialLc", "maxLc", "incrementDays", "incrementHrs", "carryForwardLimit"].includes(key) ? Number(row[key] || 0).toFixed(4) : row[key] ?? ""])));
    setRegistration({ registeredBy: row.registeredBy ?? "", registeredDate: row.registeredDate ?? "", lastUpdatedBy: row.updatedBy ?? "", lastUpdatedDate: row.updatedDate ?? "" });
    setSelectedId(row.leaveId); setEditing(true); setExpanded(true);
  }, []);
  const submit = () => {
    if (["leaveId", "leaveType", "method", "incrementFreq", "grantTiming", "carryForward"].some((key) => !String(form[key] ?? "").trim())) return useSwalValidationAlert({ title: "Required Fields", message: "Please complete all required fields." });
    if (["initialLc", "maxLc", "incrementDays", "incrementHrs", "carryForwardLimit"].some((key) => Number(form[key]) < 0 || Number.isNaN(Number(form[key])))) return useSwalValidationAlert({ title: "Invalid Value", message: "Numeric values must not be negative." });
    if (Number(form.maxLc) < Number(form.initialLc)) return useSwalValidationAlert({ title: "Invalid Credits", message: "Maximum credits must be at least the initial credits." });
    const jsonData = { ...form, ...(selectedId ? { originalLeaveId: selectedId } : {}), userCode: user?.USER_CODE || "ADMIN" };
    save({ jsonData: JSON.stringify({ jsonData }) });
  };
  const deleteRow = useCallback(async (row) => {
    try { setChecking(true); const payload = { jsonData: { leaveId: row.leaveId } }; const confirm = await useSwalDeleteConfirm("Confirm Delete", `Delete Leave Code ${row.leaveId}?`); if (confirm.isConfirmed) remove(payload); }
    catch (error) { useSwalErrorAlertAPI("System Error", error); } finally { setChecking(false); }
  }, [remove]);
  const label = useCallback((group, value) => options[group]?.find((item) => item.value === value)?.label || value, [options]);

  const columns = useMemo(() => [
    { key: "__actions", label: "Actions", width: 100, render: (row) => <div className="flex justify-center gap-2"><button onClick={() => edit(row)} className="h-7 rounded-md border border-blue-100 bg-blue-50 px-2 text-blue-600 hover:bg-blue-600 hover:text-white"><FontAwesomeIcon icon={faEdit} /></button><button onClick={() => deleteRow(row)} className="h-7 rounded-md border border-red-100 bg-red-50 px-2 text-red-600 hover:bg-red-600 hover:text-white"><FontAwesomeIcon icon={faTrashAlt} /></button></div> },
    { key: "leaveId", label: "Leave Code", sortable: true, width: 100 },
    { key: "leaveType", label: "Leave Type", sortable: true, width: 170, render: (row) => label("leaveType", row.leaveType) },
    { key: "method", label: "Method", sortable: true, width: 110, render: (row) => label("method", row.method) },
    ...[["initialLc", "Initial Credits"], ["maxLc", "Max Credits"], ["incrementDays", "Increment Days"], ["incrementHrs", "Increment Hrs"]].map(([key, title]) => ({ key, label: title, sortable: true, width: 125, render: (row) => numberText(row[key]) })),
    { key: "incrementFreq", label: "Frequency", sortable: true, width: 120, render: (row) => label("incrementFreq", row.incrementFreq) },
    { key: "grantTiming", label: "Grant Timing", sortable: true, width: 150, render: (row) => label("grantTiming", row.grantTiming) },
    { key: "prorateBasis", label: "Pro-rated Basis", sortable: true, width: 140, render: (row) => label("prorateBasis", row.prorateBasis) },
    { key: "carryForward", label: "Carry Forward", sortable: true, width: 130, render: (row) => label("carryForward", row.carryForward) },
    { key: "carryForwardLimit", label: "Carry Forward Limit", sortable: true, width: 155, render: (row) => numberText(row.carryForwardLimit) },
  ], [deleteRow, edit, label]);

  const select = (title, key, required = false) => <FieldRenderer label={title} required={required} type="select" value={form[key]} disabled={!editing} options={options[key] || []} onChange={(value) => set(key, value)} />;
  const numeric = (title, key) => <FieldRenderer label={title} type="number" value={form[key]} disabled={!editing} min="0" step="0.0001" onChange={(value) => set(key, value)} onBlur={() => set(key, Number(form[key] || 0).toFixed(4))} />;

  return <div className="global-ref-main-div-ui">
    {(isLoading || dropdownLoading || saving || deleting || checking) && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3"><h1 className="global-ref-headertext-ui text-center md:text-left">{reftables[DOC_TYPE] || "Leave Credit Table"}</h1><div /><div className="flex justify-center md:justify-end"><ButtonBar buttons={[
      { key: "add", label: <span className="ml-1 hidden sm:inline">Add</span>, icon: faPlus, onClick: add, className: "flex h-8 items-center gap-1 rounded-md bg-blue-600 px-4 text-[11px] text-white" },
      { key: "save", label: <span className="ml-1 hidden sm:inline">Save</span>, icon: faSave, onClick: submit, disabled: !editing || saving, className: "flex h-8 items-center gap-1 rounded-md bg-blue-600 px-4 text-[11px] text-white disabled:opacity-50" },
      { key: "reset", label: <span className="ml-1 hidden sm:inline">Reset</span>, icon: faUndo, onClick: reset, className: "flex h-8 items-center gap-1 rounded-md bg-blue-600 px-4 text-[11px] text-white" },
    ]} /></div></div></div>
    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b pb-3"><p className="p-1.5 text-[14px] text-gray-500">{editing ? selectedId ? `Updating Record - ${selectedId}` : "Fill in the fields below to add a leave credit" : "Select Add or double-click a row to edit"}</p><div className="flex gap-2">{editing && <span className={`rounded-full px-2.5 py-1 text-[12px] ring-1 ${selectedId ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{selectedId ? "Editing" : "Adding"}</span>}<button onClick={() => setExpanded((value) => !value)} className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] text-blue-600"><FontAwesomeIcon icon={faChevronDown} className={expanded ? "rotate-180" : ""} />{expanded ? "Collapse" : "Expand"}</button></div></div>
      <div className={expanded ? "space-y-5" : "hidden"}><div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
        <FieldRenderer label="Leave Code" required value={form.leaveId} disabled={!editing || Boolean(selectedId)} maxLength={20} onChange={(value) => set("leaveId", String(value || "").toUpperCase())} />
        {select("Leave Type", "leaveType", true)}{select("Method", "method", true)}{numeric("Initial Credits", "initialLc")}{numeric("Max Credits", "maxLc")}{numeric("Increment Days", "incrementDays")}{numeric("Increment Hours", "incrementHrs")}{select("Increment Frequency", "incrementFreq", true)}{select("Grant Timing", "grantTiming", true)}{select("Pro-rated Basis", "prorateBasis")}{select("Carry Forward", "carryForward", true)}{numeric("Carry Forward Limit", "carryForwardLimit")}
      </div><div className="border-t pt-4"><RegistrationInfo layout="straight" data={registration} /></div></div>
    </div>
    <div className="global-tran-table-main-div-ui mt-4"><SearchGlobalReferenceTable docType={DOC_TYPE} columns={columns} data={rows} isLoading={isLoading} onRowDoubleClick={edit} itemsPerPage={50} autoFillGrid="True" onRefresh={() => queryClient.invalidateQueries({ queryKey: ["leaveCreditList"] })} /></div>
  </div>;
};

export default RefLeaveCredit;
