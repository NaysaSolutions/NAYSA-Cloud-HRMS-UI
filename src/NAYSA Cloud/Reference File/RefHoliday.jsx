// src/NAYSA Cloud/Reference File/RefHoliday.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faSave, faUndo, faEdit, faTrashAlt, faInfoCircle, faChevronDown, faFilePdf, faVideo,
  faChevronLeft, faChevronRight, faCalendarAlt, faList, faTimes, faCalendarDay, faCopy,
} from "@fortawesome/free-solid-svg-icons";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";
import { useSwalErrorAlert, useSwalSuccessAlert, useSwalErrorAlertAPI, useSwalDeleteConfirm, useSwalDeleteRecord } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";

const DOC_TYPE = "Holiday";
const HOLIDAY_TYPE_OPTIONS = [
  { value: "L", label: "Legal Holiday" },
  { value: "SNW", label: "Special Non Working Holiday" },
  { value: "PSNW", label: "Provincial Non Working Holiday" },
  { value: "SW", label: "Special Working Holiday" },
];
// Tailwind needs literal class names, so every colour is spelled out here.
const TYPE_META = {
  L:    { short: "Legal",           chip: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",             dot: "bg-red-500" },
  SNW:  { short: "Special non-work", chip: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  PSNW: { short: "Provincial",      chip: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800", dot: "bg-violet-500" },
  SW:   { short: "Special working", chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
};
const typeMeta = (t) => TYPE_META[t] || TYPE_META.L;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const INITIAL_FORM = { holCode: "", holDesc: "", holDate: "", holType: "L", year: "", area: "", tblFieldArray: [] };
const INITIAL_REG = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };

const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const normDate = (v) => (v ? String(v).slice(0, 10) : "");
const prettyDate = (key) => {
  if (!key) return "";
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const RefHoliday = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];

  const today = new Date();
  const todayKey = toKey(today);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(true);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  // Calendar state
  const [view, setView] = useState("list"); // "list" | "calendar"
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState({ L: true, SNW: true, PSNW: true, SW: true });
  const [areaFilter, setAreaFilter] = useState("");
  const [dragCode, setDragCode] = useState(null);
  const [dropKey, setDropKey] = useState(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState(today.getFullYear());
  const [copyTargetYear, setCopyTargetYear] = useState(today.getFullYear() + 1);

  const isAdding = isEditing && !selectedCode;
  const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

  /* ------------------------------ Data ------------------------------ */
  const { data: holidays = [], isLoading: isListLoading } = useQuery({
    queryKey: ["holidayList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/holiday");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  // Area reference. Change endpoint only if your RefArea API uses a different route.
  const { data: areas = [] } = useQuery({
    queryKey: ["areaListForHoliday"],
    queryFn: async () => {
      const { data } = await apiClient.get("/area");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  const areaOptions = areas
    .filter((row) => String(row.active || "").toUpperCase() === "Y")
    .map((row) => ({ value: row.areaCode, label: `${row.areaName}` }));

  /* --------------------------- Form actions --------------------------- */
  const resetForm = () => {
    setFormData(INITIAL_FORM); setRegistrationInfo(INITIAL_REG); setSelectedCode(null);
    setIsEditing(false); setIsFieldsExpanded(false); setModalOpen(false);
  };

  // dateKey (optional) lets the calendar pre-fill the clicked day.
  const startAdd = (dateKey) => {
    resetForm();
    const d = typeof dateKey === "string" ? dateKey : "";
    if (d) setFormData({ ...INITIAL_FORM, holDate: d, year: d.slice(0, 4) });
    setIsEditing(true); setIsFieldsExpanded(true); setModalOpen(view === "calendar");
  };

  const buildPayload = (data, action) => ({
    json_data: JSON.stringify({
      json_data: {
        ...data,
        year: data.holDate ? new Date(`${data.holDate}T00:00:00`).getFullYear() : data.year,
        action,
        userCode: user?.USER_CODE || "ADMIN",
      },
    }),
  });

  const { mutate: saveHoliday, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => apiClient.post("/upsertHoliday", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) return useSwalErrorAlert("Unable to save", sqlRow?.errormsg || "Failed to save Holiday.");
      const status = response?.data?.status ?? response?.data?.data?.status;
      if (!(response?.data?.success || status === "success" || !status)) return useSwalErrorAlert("Error", response?.data?.message || "Failed to save Holiday.");
      queryClient.invalidateQueries({ queryKey: ["holidayList"] });
      useSwalSuccessAlert("Success!", "Holiday saved successfully!"); resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("System Error", error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)),
  });

  const { mutate: deleteHoliday, isPending: isDeleting } = useMutation({
    mutationFn: async (payload) => apiClient.post("/deleteHoliday", payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["holidayList"] }); useSwalDeleteRecord("Deleted!", "The holiday has been removed from the system."); resetForm(); },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const { mutate: copyHolidays, isPending: isCopying } = useMutation({
    mutationFn: async ({ sourceYear, targetYear }) => apiClient.post("/upsertHoliday", {
      json_data: JSON.stringify({
        json_data: {
          action: "COPY",
          sourceYear,
          targetYear,
          userCode: user?.USER_CODE || "ADMIN",
        },
      }),
    }),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) return useSwalErrorAlert("Unable to copy", sqlRow?.errormsg || "Failed to copy holidays.");
      const status = response?.data?.status ?? response?.data?.data?.status;
      if (!(response?.data?.success || status === "success" || !status)) return useSwalErrorAlert("Error", response?.data?.message || "Failed to copy holidays.");
      queryClient.invalidateQueries({ queryKey: ["holidayList"] });
      setCopyModalOpen(false);
      useSwalSuccessAlert("Success!", `Holidays copied from ${copySourceYear} to ${copyTargetYear}.`);
    },
    onError: (error) => useSwalErrorAlertAPI("Copy Error", error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)),
  });

  const handleEdit = (row) => {
    if (!row) return;
    setSelectedCode(row.holCode ?? null);
    setFormData({ ...INITIAL_FORM, holCode: row.holCode ?? "", holDesc: row.holDesc ?? "", holDate: normDate(row.holDate), holType: row.holType ?? "L", year: row.year ?? "", area: row.area ?? "" });
    setRegistrationInfo({ registeredBy: row.registeredBy, registeredDate: row.registeredDate, lastUpdatedBy: row.lastUpdatedBy, lastUpdatedDate: row.lastUpdatedDate });
    setIsEditing(true); setIsFieldsExpanded(true); setModalOpen(view === "calendar");
  };

  const handleSave = () => saveHoliday(buildPayload(formData, selectedCode ? "EDIT" : "ADD"));

  // Drag a holiday onto another day to change its date.
  const moveHoliday = (code, newKey) => {
    const row = holidays.find((h) => h.holCode === code);
    if (!row || normDate(row.holDate) === newKey) return;
    saveHoliday(buildPayload({
      ...INITIAL_FORM, holCode: row.holCode, holDesc: row.holDesc ?? "", holDate: newKey,
      holType: row.holType ?? "L", area: row.area ?? "",
    }, "EDIT"));
  };

  const handleDelete = async (row) => {
    try {
      setIsLoading(true);
      const payload = { json_data: { holCode: row.holCode } };
      const response = await apiClient.post("/checkInUsedHoliday", payload);
      const sqlRow = response?.data?.data?.[0];
      const parsed = JSON.parse(sqlRow?.result || Object.values(sqlRow || {})[0] || '{"result":"0"}');
      if (parsed.result === "1") return useSwalErrorAlertAPI(`Cannot Delete Holiday Code: ${row.holCode}`, "Code was already used.");
      const confirm = await useSwalDeleteConfirm("Confirm Delete", `Are you sure you want to delete Code: ${row.holCode}?`);
      if (confirm.isConfirmed) deleteHoliday(payload);
    } catch (error) { useSwalErrorAlertAPI("System Error", error); }
    finally { setIsLoading(false); }
  };

  const handleCheckDuplicate = async (code) => {
    if ((isEditing && selectedCode) || !code) return;
    try {
      const response = await apiClient.post("/checkDuplicateHoliday", { json_data: { holCode: code } });
      const sqlRow = response?.data?.data?.[0];
      const parsed = JSON.parse(sqlRow?.result || Object.values(sqlRow || {})[0] || '{"result":"0"}');
      if (parsed.result === "1") { resetForm(); return useSwalErrorAlertAPI(`Duplicate Holiday Code: ${code}`, "Code was already used."); }
    } catch (error) { console.error("Duplicate Check Error:", error); }
  };

  /* ------------------------------ Effects ------------------------------ */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); if (isEditing) handleSave(); }
      if (e.key === "Escape" && modalOpen) resetForm();
    };
    const handleClick = (e) => { if (guideRef.current && !guideRef.current.contains(e.target)) setOpenGuide(false); };
    window.addEventListener("keydown", handleKey); document.addEventListener("mousedown", handleClick);
    return () => { window.removeEventListener("keydown", handleKey); document.removeEventListener("mousedown", handleClick); };
  }, [isEditing, formData, selectedCode, modalOpen]);

  useEffect(() => { let mounted = true; (async () => { const res = await useFieldLenghtCheck("REF_HOLIDAY"); if (mounted) setTblFieldArray(res || []); })(); return () => { mounted = false; }; }, []);
  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  // Leaving calendar view while the modal is open should not leave a stray modal behind.
  useEffect(() => { if (view !== "calendar") setModalOpen(false); }, [view]);

  /* ----------------------------- Derived data ----------------------------- */
  const stats = useMemo(() => {
    const byType = { L: 0, SNW: 0, PSNW: 0, SW: 0 };
    holidays.forEach((h) => { if (byType[h.holType] !== undefined) byType[h.holType] += 1; });
    const next = holidays
      .filter((h) => normDate(h.holDate) >= todayKey)
      .sort((a, b) => normDate(a.holDate).localeCompare(normDate(b.holDate)))[0];
    return { total: holidays.length, byType, next };
  }, [holidays, todayKey]);

  const visibleHolidays = useMemo(() => holidays.filter((h) => {
    if (typeFilter[h.holType] === false) return false;
    if (areaFilter && h.area && h.area !== areaFilter) return false; // blank area = nationwide, always shown
    return true;
  }), [holidays, typeFilter, areaFilter]);

  const holidaysByDate = useMemo(() => {
    const map = {};
    visibleHolidays.forEach((h) => { const k = normDate(h.holDate); if (k) (map[k] ||= []).push(h); });
    return map;
  }, [visibleHolidays]);

  const monthCells = useMemo(() => {
    const offset = new Date(calYear, calMonth, 1).getDay();
    const days = new Date(calYear, calMonth + 1, 0).getDate();
    const total = Math.ceil((offset + days) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(calYear, calMonth, i - offset + 1);
      return { key: toKey(d), day: d.getDate(), inMonth: d.getMonth() === calMonth, weekday: d.getDay() };
    });
  }, [calYear, calMonth]);

  const monthList = useMemo(() => visibleHolidays
    .filter((h) => { const k = normDate(h.holDate); return k.startsWith(`${calYear}-${pad(calMonth + 1)}`); })
    .sort((a, b) => normDate(a.holDate).localeCompare(normDate(b.holDate))), [visibleHolidays, calYear, calMonth]);

  const yearOptions = useMemo(() => {
    const ys = new Set([today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1, calYear]);
    holidays.forEach((h) => { const y = parseInt(normDate(h.holDate).slice(0, 4), 10); if (y) ys.add(y); });
    return [...ys].sort((a, b) => a - b);
  }, [holidays, calYear]);

  const shiftMonth = (delta) => {
    const d = new Date(calYear, calMonth + delta, 1);
    setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
  };
  const goToday = () => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); };
  const toggleType = (t) => setTypeFilter((p) => ({ ...p, [t]: !p[t] }));
  const openCopyModal = () => {
    setCopySourceYear(calYear);
    setCopyTargetYear(calYear + 1);
    setCopyModalOpen(true);
  };
  const handleCopyHolidays = () => {
    if (copySourceYear === copyTargetYear) return useSwalErrorAlert("Invalid years", "Choose different source and target years.");
    copyHolidays({ sourceYear: copySourceYear, targetYear: copyTargetYear });
  };

  /* ------------------------------- Columns ------------------------------- */
  const columns = useMemo(() => [
    { key: "__actions", label: "Actions", width: 100, minWidth: 100, render: (row) => <div className="flex gap-2 justify-center"><button onClick={() => handleEdit(row)} className="h-7 px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white" title="Edit"><FontAwesomeIcon icon={faEdit}/></button><button onClick={() => handleDelete(row)} className="h-7 px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white" title="Delete"><FontAwesomeIcon icon={faTrashAlt}/></button></div> },
    { key: "holCode", label: "Holiday Code", sortable: true, width: 120, requiredVisible: true },
    { key: "holDesc", label: "Holiday Description", sortable: true, width: 300, requiredVisible: true },
    { key: "holDate", label: "Holiday Date", sortable: true, width: 130, requiredVisible: true, render: (row) => normDate(row.holDate) },
    { key: "holTypeName", label: "Holiday Type", sortable: true, width: 230, requiredVisible: true, render: (row) => (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${typeMeta(row.holType).chip}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${typeMeta(row.holType).dot}`} />{row.holTypeName || typeMeta(row.holType).short}
      </span>
    ) },
    { key: "year", label: "Year", sortable: true, width: 90 },
    { key: "areaName", label: "Area", sortable: true, width: 160, render: (row) => row.areaName || "All Areas / Nationwide" },
  ], [selectedCode]);

  /* ------------------------------ Form fields ------------------------------ */
  const renderFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      <div className="space-y-4">
        <FieldRenderer label="Holiday Code" required type="text" value={formData.holCode} disabled={!isEditing || !!selectedCode} onChange={(v) => updateForm({holCode:(v||"").toUpperCase()})} onBlur={(e) => handleCheckDuplicate(e.target.value)} maxLength={getMax("HOL_CODE")}/>
        <FieldRenderer label="Holiday Description" required type="text" value={formData.holDesc} disabled={!isEditing} onChange={(v) => updateForm({holDesc:v})} maxLength={getMax("HOL_DESC")}/>
        <FieldRenderer label="Holiday Date" required type="date" value={formData.holDate} disabled={!isEditing} onChange={(v) => { const d = v || ""; updateForm({holDate:d, year:d ? d.slice(0,4) : ""}); }}/>
      </div>
      <div className="space-y-4">
        <FieldRenderer label="Holiday Type" required type="select" value={formData.holType} disabled={!isEditing} options={HOLIDAY_TYPE_OPTIONS} onChange={(v) => updateForm({holType:v})}/>
        <FieldRenderer label="Year" type="text" value={formData.year} disabled={true}/>
        <FieldRenderer label="Area" type="select" value={formData.area} disabled={!isEditing} options={areaOptions} onChange={(v) => updateForm({area:v})}/>
      </div>
    </div>
  );

  const btnBase = "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white";

  /* -------------------------------- Render -------------------------------- */
  return <div className="global-ref-main-div-ui">
    {(isListLoading || isSaving || isDeleting || isCopying || isLoading) && <LoadingSpinner />}

    {/* Header */}
    <div className="global-ref-header-ui mb-2"><div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center">
      <div><h1 className="global-ref-headertext-ui flex items-center justify-center md:justify-start">{reftables[DOC_TYPE] || "Holiday Reference"}</h1></div><div />
      <div className="flex justify-center md:justify-end gap-2">
        <ButtonBar buttons={[
          { key:"add", label:<span className="hidden sm:inline ml-1">Add</span>, icon:faPlus, onClick:() => startAdd(), className:btnBase },
          { key:"save", label:<span className="hidden sm:inline ml-1">Save</span>, icon:faSave, onClick:handleSave, disabled:!isEditing || isSaving || !isFieldsExpanded, className:`${btnBase} disabled:opacity-50` },
          { key:"reset", label:<span className="hidden sm:inline ml-1">Reset</span>, icon:faUndo, onClick:resetForm, className:btnBase },
        ]}/>

        {/* Info Dropdown */}
        <div ref={guideRef} className="relative">
          <button onClick={() => setOpenGuide((v) => !v)} className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150">
            <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
            <span className="hidden sm:inline ml-1 text-[11px] font-medium">Info</span>
            <FontAwesomeIcon icon={faChevronDown} className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${isOpenGuide ? "rotate-180" : ""}`} />
          </button>
          {isOpenGuide && (
            <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden origin-top-right animate-[fadeIn_0.12s_ease-out]">
              <button onClick={() => { if (pdfLink) window.open(pdfLink, "_blank"); setOpenGuide(false); }} disabled={!pdfLink} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
              </button>
              <button onClick={() => { if (videoLink) window.open(videoLink, "_blank"); setOpenGuide(false); }} disabled={!videoLink} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
              </button>
            </div>
          )}
        </div>
      </div>
    </div></div>

    <div className="mt-24 sm:mt-24 flex flex-col gap-2">

      {/* Summary + view switch */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-[12px]">
            <span className="text-gray-500">Total </span><span className="font-semibold text-gray-800 dark:text-gray-100">{stats.total}</span>
          </div>
          {Object.entries(TYPE_META).map(([k, m]) => (
            <div key={k} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-[12px] flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${m.dot}`} />
              <span className="text-gray-500">{m.short}</span>
              <span className="font-semibold text-gray-800 dark:text-gray-100">{stats.byType[k]}</span>
            </div>
          ))}
          {stats.next && (
            <button type="button" onClick={() => { const k = normDate(stats.next.holDate); setCalYear(+k.slice(0,4)); setCalMonth(+k.slice(5,7) - 1); handleEdit(stats.next); }}
              className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[12px] hover:bg-blue-100 transition-colors text-left">
              Next: <span className="font-semibold">{stats.next.holDesc}</span> · {prettyDate(normDate(stats.next.holDate))}
            </button>
          )}
        </div>

        <div className="inline-flex self-start lg:self-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 shadow-sm" role="tablist" aria-label="Holiday view">
          {[{ id: "list", label: "List", icon: faList }, { id: "calendar", label: "Calendar", icon: faCalendarAlt }].map((t) => (
            <button key={t.id} role="tab" aria-selected={view === t.id} onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === t.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
              <FontAwesomeIcon icon={t.icon} className="text-[11px]" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------ LIST VIEW ------------------------------ */}
      {view === "list" && <>
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-2"><div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] sm:text-[14px] p-1.5 text-blue-600 font-semibold">{isEditing ? selectedCode ? `Updating Record - ${selectedCode}` : "Fill in the fields below to add a new holiday" : "Select “Add” or double-click a row to edit"}</p>
            <div className="flex items-center gap-2">
              {isEditing && <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${isAdding ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{isAdding ? "Adding" : "Editing"}</span>}
              <button type="button" onClick={() => setIsFieldsExpanded(v => !v)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"><FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${isFieldsExpanded ? "rotate-180" : ""}`}/>{isFieldsExpanded ? "Collapse" : "Expand"}</button>
            </div>
          </div>
          <div className={isFieldsExpanded ? "" : "hidden"}>{renderFields()}</div>
          <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 ${isFieldsExpanded ? "" : "hidden"}`}><RegistrationInfo layout="straight" data={registrationInfo}/></div>
        </div></div>

        <div className="global-tran-table-main-div-ui mt-2"><SearchGlobalReferenceTable docType={DOC_TYPE} columns={columns} data={holidays} isLoading={isListLoading} onRowDoubleClick={handleEdit} itemsPerPage={50} onRefresh={() => queryClient.invalidateQueries({queryKey:["holidayList"]})} autoFillGrid="True"/></div>
      </>}

      {/* ---------------------------- CALENDAR VIEW ---------------------------- */}
      {view === "calendar" && (
        <div className="flex flex-col xl:flex-row gap-2">
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl border shadow-lg border-gray-100 dark:border-gray-700 p-3 sm:p-4">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="h-8 w-8 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><FontAwesomeIcon icon={faChevronLeft} className="text-[11px]"/></button>
                <button onClick={() => shiftMonth(1)} aria-label="Next month" className="h-8 w-8 rounded-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><FontAwesomeIcon icon={faChevronRight} className="text-[11px]"/></button>
              </div>
              <select value={calMonth} onChange={(e) => setCalMonth(+e.target.value)} className="h-8 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[13px] font-semibold px-2 text-gray-800 dark:text-gray-100">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={calYear} onChange={(e) => setCalYear(+e.target.value)} className="h-8 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[13px] font-semibold px-2 text-gray-800 dark:text-gray-100">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={goToday} className="h-8 px-3 rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 text-[12px] font-medium flex items-center gap-1.5"><FontAwesomeIcon icon={faCalendarDay} className="text-[11px]"/>Today</button>
              <button onClick={openCopyModal} className="h-8 px-3 rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 text-[12px] font-medium flex items-center gap-1.5"><FontAwesomeIcon icon={faCopy} className="text-[11px]"/>Copy year</button>
              <div className="ml-auto flex items-center gap-2">
                <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="h-8 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[12px] px-2 text-gray-700 dark:text-gray-200" aria-label="Filter by area">
                  <option value="">All areas</option>
                  {areaOptions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>

            {/* Type filters double as the legend */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(TYPE_META).map(([k, m]) => (
                <button key={k} onClick={() => toggleType(k)} aria-pressed={typeFilter[k]}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-opacity ${m.chip} ${typeFilter[k] ? "" : "opacity-40 line-through"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.short}
                </button>
              ))}
              <span className="text-[11px] text-gray-400 self-center ml-1 hidden sm:inline">Click a day to add · click a holiday to edit · drag it to move</span>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
                  {WEEKDAYS.map((w, i) => (
                    <div key={w} className={`py-1.5 text-center text-[12px] font-semibold ${i === 0 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 border-l border-gray-100 dark:border-gray-700">
                  {monthCells.map((c) => {
                    const items = holidaysByDate[c.key] || [];
                    const isToday = c.key === todayKey;
                    const isDrop = dropKey === c.key && dragCode;
                    return (
                      <div key={c.key}
                        onClick={() => startAdd(c.key)}
                        onDragOver={(e) => { if (dragCode) { e.preventDefault(); setDropKey(c.key); } }}
                        onDragLeave={() => setDropKey((k) => (k === c.key ? null : k))}
                        onDrop={(e) => { e.preventDefault(); setDropKey(null); if (dragCode) moveHoliday(dragCode, c.key); setDragCode(null); }}
                        className={`group relative min-h-[88px] sm:min-h-[104px] border-r border-b border-gray-100 dark:border-gray-700 p-1 cursor-pointer transition-colors
                          ${c.inMonth ? "bg-white dark:bg-gray-800" : "bg-gray-50/70 dark:bg-gray-900/40"}
                          ${isDrop ? "!bg-blue-50 ring-2 ring-inset ring-blue-400" : "hover:bg-blue-50/40 dark:hover:bg-gray-700/40"}`}>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full text-[12px] font-medium
                            ${isToday ? "bg-blue-600 text-white" : c.inMonth ? (c.weekday === 0 ? "text-red-500" : "text-gray-700 dark:text-gray-200") : "text-gray-300 dark:text-gray-600"}`}>{c.day}</span>
                          <FontAwesomeIcon icon={faPlus} className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {items.map((h) => (
                            <button key={h.holCode} type="button" draggable
                              onDragStart={(e) => { e.stopPropagation(); setDragCode(h.holCode); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", h.holCode); }}
                              onDragEnd={() => { setDragCode(null); setDropKey(null); }}
                              onClick={(e) => { e.stopPropagation(); handleEdit(h); }}
                              title={`${h.holDesc} — ${h.holTypeName || typeMeta(h.holType).short}${h.areaName ? ` · ${h.areaName}` : " · Nationwide"}`}
                              className={`w-full text-left truncate px-1.5 py-0.5 rounded border text-[10.5px] sm:text-[11px] font-medium cursor-grab active:cursor-grabbing hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${typeMeta(h.holType).chip} ${selectedCode === h.holCode ? "ring-2 ring-blue-500" : ""}`}>
                              {h.holDesc}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Month agenda */}
          <aside className="xl:w-80 bg-white dark:bg-gray-800 rounded-xl border shadow-lg border-gray-100 dark:border-gray-700 p-4">
            <h2 className="text-[14px] font-semibold text-gray-800 dark:text-gray-100">{MONTHS[calMonth]} {calYear}</h2>
            <p className="text-[12px] text-gray-500 mb-3">{monthList.length ? `${monthList.length} holiday${monthList.length > 1 ? "s" : ""} this month` : "No holidays this month"}</p>
            {monthList.length === 0 ? (
              <button onClick={() => startAdd(toKey(new Date(calYear, calMonth, 1)))} className="w-full py-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-[12px] text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                Add a holiday for {MONTHS[calMonth]}
              </button>
            ) : (
              <ul className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {monthList.map((h) => {
                  const k = normDate(h.holDate);
                  return (
                    <li key={h.holCode} className="flex items-stretch gap-1">
                      <button onClick={() => handleEdit(h)} className="flex-1 min-w-0 flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <span className={`h-9 w-1 rounded-full shrink-0 ${typeMeta(h.holType).dot}`} />
                        <span className="w-9 text-center shrink-0 leading-tight">
                          <span className="block text-[15px] font-semibold text-gray-800 dark:text-gray-100">{k.slice(8, 10)}</span>
                          <span className="block text-[10px] text-gray-500">{WEEKDAYS[new Date(`${k}T00:00:00`).getDay()]}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium text-gray-800 dark:text-gray-100">{h.holDesc}</span>
                          <span className="block truncate text-[11px] text-gray-500">{h.holTypeName || typeMeta(h.holType).short} · {h.areaName || "Nationwide"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>

    {/* --------------------- Calendar edit / add modal --------------------- */}
    {modalOpen && view === "calendar" && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) resetForm(); }} role="dialog" aria-modal="true" aria-label={isAdding ? "Add holiday" : "Edit holiday"}>
        <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">{isAdding ? "Add holiday" : `Edit holiday · ${selectedCode}`}</h3>
              {formData.holDate && <p className="text-[12px] text-gray-500">{prettyDate(formData.holDate)}</p>}
            </div>
            <button onClick={resetForm} aria-label="Close" className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><FontAwesomeIcon icon={faTimes}/></button>
          </div>
          <div className="p-5">
            {renderFields()}
            {!isAdding && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"><RegistrationInfo layout="straight" data={registrationInfo}/></div>}
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
            <div>
              {!isAdding && <button onClick={() => handleDelete({ holCode: selectedCode })} className="h-8 px-3 rounded-md bg-red-50 border border-red-100 text-red-600 text-[12px] font-medium hover:bg-red-600 hover:text-white transition-colors"><FontAwesomeIcon icon={faTrashAlt} className="mr-1.5"/>Delete</button>}
            </div>
            <div className="flex gap-2">
              <button onClick={resetForm} className="h-8 px-4 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="h-8 px-4 rounded-md bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 disabled:opacity-50"><FontAwesomeIcon icon={faSave} className="mr-1.5"/>Save changes</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {copyModalOpen && view === "calendar" && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) setCopyModalOpen(false); }} role="dialog" aria-modal="true" aria-label="Copy holidays">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Copy holidays by year</h3>
            <button onClick={() => setCopyModalOpen(false)} aria-label="Close" className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><FontAwesomeIcon icon={faTimes}/></button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[12px] text-gray-500">Copy all holidays, including their types and areas, to another year.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-[12px] font-medium text-gray-700 dark:text-gray-200">From year
                <select value={copySourceYear} onChange={(e) => setCopySourceYear(+e.target.value)} className="mt-1 w-full h-9 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-[13px]">
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="text-[12px] font-medium text-gray-700 dark:text-gray-200">To year
                <select value={copyTargetYear} onChange={(e) => setCopyTargetYear(+e.target.value)} className="mt-1 w-full h-9 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-[13px]">
                  {[...new Set([...yearOptions, copyTargetYear])].sort((a, b) => a - b).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setCopyModalOpen(false)} className="h-8 px-4 rounded-md border border-gray-200 dark:border-gray-600 text-[12px] font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleCopyHolidays} disabled={isCopying || copySourceYear === copyTargetYear} className="h-8 px-4 rounded-md bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 disabled:opacity-50"><FontAwesomeIcon icon={faCopy} className="mr-1.5"/>Copy holidays</button>
          </div>
        </div>
      </div>
    )}
  </div>;
};

export default RefHoliday;
