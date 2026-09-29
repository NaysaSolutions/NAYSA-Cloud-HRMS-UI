// src/NAYSA Cloud/Reference File/RefHoliday.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUndo, faEdit, faTrashAlt, faInfoCircle, faChevronDown, faFilePdf, faVideo } from "@fortawesome/free-solid-svg-icons";
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
const INITIAL_FORM = { holCode: "", holDesc: "", holDate: "", holType: "L", year: "", area: "", tblFieldArray: [] };
const INITIAL_REG = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };

const RefHoliday = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(true);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const isAdding = isEditing && !selectedCode;
  const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

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

      const raw =
        data?.data?.[0]?.result ||
        data?.[0]?.result ||
        data?.result;

      return raw ? JSON.parse(raw) : [];
    },
  });

  const areaOptions = areas
  .filter((row) => String(row.active || "").toUpperCase() === "Y")
  .map((row) => ({
    value: row.areaCode,
    label: `${row.areaName}`,
  }));

  const resetForm = () => {
    setFormData(INITIAL_FORM); setRegistrationInfo(INITIAL_REG); setSelectedCode(null);
    setIsEditing(false); setIsFieldsExpanded(false);
  };
  const startAdd = () => { resetForm(); setIsEditing(true); setIsFieldsExpanded(true); };

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

  const handleEdit = (row) => {
    if (!row) return;
    setSelectedCode(row.holCode ?? null);
    setFormData({ ...INITIAL_FORM, holCode: row.holCode ?? "", holDesc: row.holDesc ?? "", holDate: row.holDate ? String(row.holDate).slice(0, 10) : "", holType: row.holType ?? "L", year: row.year ?? "", area: row.area ?? "" });
    setRegistrationInfo({ registeredBy: row.registeredBy, registeredDate: row.registeredDate, lastUpdatedBy: row.lastUpdatedBy, lastUpdatedDate: row.lastUpdatedDate });
    setIsEditing(true); setIsFieldsExpanded(true);
  };

  const handleSave = () => saveHoliday({
    json_data: JSON.stringify({ json_data: { ...formData, year: formData.holDate ? new Date(`${formData.holDate}T00:00:00`).getFullYear() : formData.year, action: selectedCode ? "EDIT" : "ADD", userCode: user?.USER_CODE || "ADMIN" } }),
  });

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

  useEffect(() => {
    const handleKey = (e) => { if (e.ctrlKey && e.key === "s") { e.preventDefault(); if (isEditing) handleSave(); } };
    const handleClick = (e) => { if (guideRef.current && !guideRef.current.contains(e.target)) setOpenGuide(false); };
    window.addEventListener("keydown", handleKey); document.addEventListener("mousedown", handleClick);
    return () => { window.removeEventListener("keydown", handleKey); document.removeEventListener("mousedown", handleClick); };
  }, [isEditing, formData, selectedCode]);

  useEffect(() => { let mounted = true; (async () => { const res = await useFieldLenghtCheck("REF_HOLIDAY"); if (mounted) setTblFieldArray(res || []); })(); return () => { mounted = false; }; }, []);
  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  const columns = useMemo(() => [
    { key: "__actions", label: "Actions", width: 100, minWidth: 100, render: (row) => <div className="flex gap-2 justify-center"><button onClick={() => handleEdit(row)} className="h-7 px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white" title="Edit"><FontAwesomeIcon icon={faEdit}/></button><button onClick={() => handleDelete(row)} className="h-7 px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white" title="Delete"><FontAwesomeIcon icon={faTrashAlt}/></button></div> },
    { key: "holCode", label: "Holiday Code", sortable: true, width: 120, requiredVisible: true },
    { key: "holDesc", label: "Holiday Description", sortable: true, width: 300, requiredVisible: true },
    { key: "holDate", label: "Holiday Date", sortable: true, width: 130, requiredVisible: true },
    { key: "holTypeName", label: "Holiday Type", sortable: true, width: 230, requiredVisible: true },
    { key: "year", label: "Year", sortable: true, width: 90 },
    { key: "areaName", label: "Area", sortable: true, width: 160, render: (row) => row.areaName || "All Areas / Nationwide" },
  ], [selectedCode]);

  return <div className="global-ref-main-div-ui">
    {(isListLoading || isSaving || isDeleting || isLoading) && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2"><div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center">
      <div><h1 className="global-ref-headertext-ui flex items-center justify-center md:justify-start">{reftables[DOC_TYPE] || "Holiday Reference"}</h1></div><div />
      <div className="flex justify-center md:justify-end gap-2"><ButtonBar buttons={[
        { key:"add", label:<span className="hidden sm:inline ml-1">Add</span>, icon:faPlus, onClick:startAdd, className:"flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white" },
        { key:"save", label:<span className="hidden sm:inline ml-1">Save</span>, icon:faSave, onClick:handleSave, disabled:!isEditing || isSaving || !isFieldsExpanded, className:"flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white disabled:opacity-50" },
        { key:"reset", label:<span className="hidden sm:inline ml-1">Reset</span>, icon:faUndo, onClick:resetForm, className:"flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white" },
      ]}/>


              {/* Info Dropdown */}
              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
                  <span className="hidden sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${
                      isOpenGuide ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden origin-top-right animate-[fadeIn_0.12s_ease-out]">
                    <button
                      onClick={() => {
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!pdfLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />{" "}
                      PDF Guide
                    </button>

                    <button
                      onClick={() => {
                        if (videoLink) window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!videoLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faVideo}
                        className="mr-2 text-blue-500"
                      />{" "}
                      Video Guide
                    </button>
                  </div>
                )}
              </div>

      {/* <div ref={guideRef} className="relative"><button onClick={() => setOpenGuide(v => !v)} className="bg-blue-600 text-white h-8 px-3 rounded-md"><FontAwesomeIcon icon={faInfoCircle}/> <span className="hidden sm:inline">Info</span> <FontAwesomeIcon icon={faChevronDown}/></button>{isOpenGuide && <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white z-[60] overflow-hidden"><button onClick={() => { if(pdfLink) window.open(pdfLink,"_blank"); setOpenGuide(false); }} disabled={!pdfLink} className="block w-full text-left px-4 py-2 text-xs"><FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500"/>PDF Guide</button><button onClick={() => { if(videoLink) window.open(videoLink,"_blank"); setOpenGuide(false); }} disabled={!videoLink} className="block w-full text-left px-4 py-2 text-xs"><FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500"/>Video Guide</button></div>}</div> */}
      </div>
    </div></div>

    <div className="mt-24 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2"><div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700"><p className="text-[11px] sm:text-[14px] p-1.5 text-blue-600 font-semibold">{isEditing ? selectedCode ? `Updating Record - ${selectedCode}` : "Fill in the fields below to add a new holiday" : "Select “Add” or double-click a row to edit"}</p><div className="flex items-center gap-2">{isEditing && <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${isAdding ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{isAdding ? "Adding" : "Editing"}</span>}<button type="button" onClick={() => setIsFieldsExpanded(v => !v)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50"><FontAwesomeIcon icon={faChevronDown} className={isFieldsExpanded ? "rotate-180" : ""}/>{isFieldsExpanded ? "Collapse" : "Expand"}</button></div></div>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ${isFieldsExpanded ? "" : "hidden"}`}>
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
      <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 ${isFieldsExpanded ? "" : "hidden"}`}><RegistrationInfo layout="straight" data={registrationInfo}/></div>
    </div></div>

    <div className="global-tran-table-main-div-ui mt-4"><SearchGlobalReferenceTable docType={DOC_TYPE} columns={columns} data={holidays} isLoading={isListLoading} onRowDoubleClick={handleEdit} itemsPerPage={50} onRefresh={() => queryClient.invalidateQueries({queryKey:["holidayList"]})} autoFillGrid="True"/></div>
  </div>;
};

export default RefHoliday;
