// src/NAYSA Cloud/Reference File/RefShift.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";

import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const DOC_TYPE = "Shift";

const SHIFT_TYPE_OPTIONS = [
  { value: "DS", label: "Day Shift" },
  { value: "MS", label: "Mid Shift" },
  { value: "NS", label: "Night Shift" },
];

const INITIAL_FORM = {
  code: "",
  description: "",
  shiftStart: "",
  shiftEnd: "",
  breakStart: "",
  breakEnd: "",
  breakMins: "",
  ShiftType: "DS",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

// =====================================================================
// CUSTOM TIME PICKER
// =====================================================================
const TimeField = ({ label, value, onChange, disabled, required }) => (
  <div className="relative w-full">
    <input
      type="time"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full min-h-[38px] px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors dark:border-gray-600 dark:text-gray-200"
    />
    <label className="absolute -top-2 left-2 px-1 bg-white dark:bg-gray-800 text-[11px] font-medium text-gray-600 dark:text-gray-400">
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}
    </label>
  </div>
);

// =====================================================================
// CUSTOM MINUTES PICKER (Para naka-align sa Time Picker)
// =====================================================================
const MinutesField = ({ label, value, onChange, disabled }) => (
  <div className="relative w-full">
    <input
      type="number"
      min="0"
      step="1"
      placeholder="0"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full min-h-[38px] px-3 py-1.5 text-[13px] text-gray-700 bg-transparent border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors dark:border-gray-600 dark:text-gray-200"
    />
    <label className="absolute -top-2 left-2 px-1 bg-white dark:bg-gray-800 text-[11px] font-medium text-gray-600 dark:text-gray-400">
      {label}
    </label>
    <div className="absolute right-8 top-2.5 text-[11px] font-medium text-gray-400 pointer-events-none">
      mins
    </div>
  </div>
);
// =====================================================================

const RefShift = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

  const [isEditing, setIsEditing] = useState(true);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);

  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const isAdding = isEditing && !selectedCode;

  const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

  const getActiveLabel = (activeYN) =>
    String(activeYN || "").toUpperCase() === "Y" ? "Yes" : "No";

  // --- AM/PM FORMATTER (Para sa Data Table) ---
  const formatTimeAMPM = (timeString) => {
    if (!timeString) return "";
    const [hourString, minutePart] = timeString.split(":");
    if (!hourString || !minutePart) return timeString;

    let hour = parseInt(hourString, 10);
    const cleanMinute = minutePart.substring(0, 2);

    const isAlreadyPM = timeString.toUpperCase().includes("PM");
    const isAlreadyAM = timeString.toUpperCase().includes("AM");

    let ampm = hour >= 12 ? "PM" : "AM";
    if (isAlreadyPM) ampm = "PM";
    if (isAlreadyAM) ampm = "AM";

    hour = hour % 12 || 12;

    const formattedHour = hour.toString().padStart(2, "0");
    return `${formattedHour}:${cleanMinute} ${ampm}`;
  };

  // --- TANSTACK QUERY: LIST ---
  const { data: shifts = [], isLoading: isListLoading } = useQuery({
    queryKey: ["shiftList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/shift");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      const rows = raw ? JSON.parse(raw) : [];
      return rows.map((row) => ({
        ...row,
        description: row.description ?? row.name ?? "",
        shiftStart: row.shiftStart ?? row.shift_start ?? "",
        shiftEnd: row.shiftEnd ?? row.shift_end ?? "",
        breakStart: row.breakStart ?? row.break_start ?? "",
        breakEnd: row.breakEnd ?? row.break_end ?? "",
        breakMins: row.breakMins ?? row.break_mins ?? "",
        ShiftType: row.ShiftType ?? row.shift_type ?? "DS",
      }));
    },
  });

  // --- MUTATION: UPSERT ---
  const { mutate: saveShift, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/upsertShift", payload),

    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert(
          "Unable to save",
          sqlRow?.errormsg || "Failed to save Shift.",
        );
        return;
      }

      const status = response?.data?.status ?? response?.data?.data?.status;
      const success =
        response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Shift.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["shiftList"] });
      useSwalSuccessAlert("Success!", "Shift saved successfully!");
      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status
          ? `HTTP ${error.response.status}`
          : error?.message || String(error),
      );
    },
  });

  // --- MUTATION: DELETE ---
  const { mutate: deleteShift, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/deleteShift", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["shiftList"]);
      useSwalDeleteRecord(
        "Deleted!",
        "The shift has been removed from the system.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // --- ACTIONS ---
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedCode(null);
    setIsEditing(false);
    setIsFieldsExpanded(true);
  };

  const startAdd = () => {
    resetForm();
    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const handleEdit = (row) => {
    if (!row) return;

    setSelectedCode(row.code ?? null);
    setFormData({
      ...INITIAL_FORM,
      code: row.code ?? "",
      description: row.description ?? "",
      shiftStart: row.shiftStart ?? "",
      shiftEnd: row.shiftEnd ?? "",
      breakStart: row.breakStart ?? "",
      breakEnd: row.breakEnd ?? "",
      breakMins: row.breakMins ?? "",
      ShiftType: row.ShiftType ?? "DS",
      active: String(row.active ?? "Y").toUpperCase() === "Y" ? "Y" : "N",
    });

   setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",      
      lastUpdatedDate: row.lastUpdatedDate || "", 
    });

    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

const handleSave = () => {
    const payload = {
      json_data: {
        code: formData.code,
        description: formData.description,
        shiftStart: formData.shiftStart || "",
        shiftEnd: formData.shiftEnd || "",
        breakStart: formData.breakStart || "",
        breakEnd: formData.breakEnd || "",
        breakMins: formData.breakMins || "0",
        ShiftType: formData.ShiftType || "DS",
        active: formData.active || "Y",
        action: selectedCode ? "EDIT" : "ADD",
        userCode: user?.USER_CODE || "ADMIN",
      }
    };
    
    saveShift(payload);
  };

  const handleDelete = async (row) => {
    try {
      setIsLoading(true);
      const payload = { json_data: { code: row.code } };

      const response = await apiClient.post("/checkInUsedShift", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        setIsLoading(false);
        return useSwalErrorAlertAPI(
          `Cannot Delete Shift Code: ${row.code}`,
          `Code was already used.`,
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Code: ${row.code}?`,
      );

      if (confirm.isConfirmed) {
        deleteShift(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDuplicate = async (codeValue) => {
    if (isEditing && selectedCode) return;
    if (!codeValue) return;

    try {
      const payload = { json_data: { code: codeValue } };
      const response = await apiClient.post("/checkDuplicateShift", payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        resetForm();
        return useSwalErrorAlertAPI(
          `Duplicate Shift Code: ${codeValue}`,
          `Code was already used.`,
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (isEditing) handleSave();
      }
    };
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target))
        setOpenGuide(false);
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isEditing, formData, shifts]);

  // --- TABLE COLUMNS ---
  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 100,
        minWidth: 100,
        render: (row) => (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleEdit(row)}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all text-xs"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "code",
        label: "Shift Code",
        sortable: true,
        width: 120,
        minWidth: 120,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold text-gray-700 dark:text-gray-200">
            {row.code}
          </span>
        ),
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        width: 250,
        minWidth: 220,
      },
      {
        key: "shiftStart",
        label: "Start Time",
        sortable: true,
        width: 120,
        minWidth: 110,
        render: (row) => formatTimeAMPM(row.shiftStart),
      },
      {
        key: "shiftEnd",
        label: "End Time",
        sortable: true,
        width: 120,
        minWidth: 110,
        render: (row) => formatTimeAMPM(row.shiftEnd),
      },
      {
        key: "breakStart",
        label: "Break Start",
        sortable: true,
        width: 120,
        minWidth: 110,
        render: (row) => formatTimeAMPM(row.breakStart),
      },
      {
        key: "breakEnd",
        label: "Break End",
        sortable: true,
        width: 120,
        minWidth: 110,
        render: (row) => formatTimeAMPM(row.breakEnd),
      },
      {
        key: "breakMins",
        label: "Break Mins",
        sortable: true,
        width: 100,
        minWidth: 100,
      },
      {
        key: "ShiftType",
        label: "Shift Type",
        sortable: true,
        width: 100,
        render: (row) => (
          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-[11px] font-medium">
            {row.ShiftType}
          </span>
        ),
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        render: (row) => {
          const isActive = String(row.active || "").toUpperCase() === "Y";
          return (
            <span
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <FontAwesomeIcon
                icon={isActive ? faCircleCheck : faCircleXmark}
                className={`text-[10px] ${isActive ? "text-emerald-500" : "text-gray-400"}`}
              />
              {getActiveLabel(row.active)}
            </span>
          );
        },
      },
    ],
    [shifts, selectedCode, handleDelete],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await useFieldLenghtCheck("REF_SHIFT");
      if (mounted) setTblFieldArray(res || []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || isDeleting || isLoading) && (
        <LoadingSpinner />
      )}

      {/* HEADER */}
      <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
              {reftables[DOC_TYPE] || "Shift Reference"}
            </h1>
          </div>

          <div className="hidden md:flex justify-center w-full" />

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="hidden sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: startAdd,
                      className:
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                    },
                    {
                      key: "save",
                      label: (
                        <span className="hidden sm:inline ml-1">Save</span>
                      ),
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving || !isFieldsExpanded,
                      className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150 ${
                        !isEditing || isSaving || !isFieldsExpanded
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                      }`,
                    },
                    {
                      key: "reset",
                      label: (
                        <span className="hidden sm:inline ml-1">Reset</span>
                      ),
                      icon: faUndo,
                      onClick: resetForm,
                      className:
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                    },
                  ]}
                />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  type="button"
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
                      type="button"
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
                      />
                      PDF Guide
                    </button>

                    <button
                      type="button"
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
                      />
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mt-24 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
        <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg transition-colors duration-200">
          {/* Status strip */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] sm:text-[14px] p-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing
                ? selectedCode
                  ? `Updating Record - ${selectedCode}`
                  : "Fill in the fields below to add a new shift"
                : "Select “Add” or double-click a row to edit"}
            </p>

            <div className="flex items-center justify-end gap-2">
              {isEditing && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 ring-inset ${
                    isAdding
                      ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                      isAdding ? "bg-blue-500" : "bg-amber-500"
                    }`}
                  />
                  {isAdding ? "Adding" : "Editing"}
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsFieldsExpanded((expanded) => !expanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                aria-expanded={isFieldsExpanded}
                aria-controls="ref-shift-fields ref-shift-registration"
              >
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-[10px] transition-transform duration-200 ${
                    isFieldsExpanded ? "rotate-180" : ""
                  }`}
                />
                {isFieldsExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {/* 3x3 Grid Layout */}
          <div
            id="ref-shift-fields"
            className={`grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            {/* ROW 1 */}
            <FieldRenderer
              label="Shift Code"
              required
              type="text"
              value={formData.code}
              disabled={!isEditing || !!selectedCode}
              onChange={(v) => updateForm({ code: (v || "").toUpperCase() })}
              onBlur={(e) => handleCheckDuplicate(e.target.value)}
              maxLength={getMax("SHIFT_CODE")}
            />
            <FieldRenderer
              label="Description"
              required
              type="text"
              value={formData.description}
              disabled={!isEditing}
              onChange={(v) => updateForm({ description: v })}
              maxLength={getMax("SHIFT_DESC")}
            />
            <FieldRenderer
              label="Shift Type"
              type="select"
              value={formData.ShiftType}
              disabled={!isEditing}
              options={SHIFT_TYPE_OPTIONS}
              onChange={(v) => updateForm({ ShiftType: v })}
            />

            {/* ROW 2 */}
            <TimeField
              label="Shift Start"
              required
              value={formData.shiftStart}
              disabled={!isEditing}
              onChange={(v) => updateForm({ shiftStart: v })}
            />
            <TimeField
              label="Shift End"
              required
              value={formData.shiftEnd}
              disabled={!isEditing}
              onChange={(v) => updateForm({ shiftEnd: v })}
            />
            <FieldRenderer
              label="Active"
              type="select"
              value={formData.active === "Y" ? "Yes" : "No"}
              disabled={!isEditing}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              onChange={(v) => updateForm({ active: v === "No" ? "N" : "Y" })}
            />

            {/* ROW 3 - GINAGAMIT NA ANG CUSTOM <MinutesField /> */}
            <TimeField
              label="Break Start"
              value={formData.breakStart}
              disabled={!isEditing}
              onChange={(v) => updateForm({ breakStart: v })}
            />
            <TimeField
              label="Break End"
              value={formData.breakEnd}
              disabled={!isEditing}
              onChange={(v) => updateForm({ breakEnd: v })}
            />
            <MinutesField
              label="Break Mins"
              value={formData.breakMins}
              disabled={!isEditing}
              onChange={(v) => updateForm({ breakMins: v })}
            />
          </div>

          <div
            id="ref-shift-registration"
            className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            <RegistrationInfo layout="straight" data={registrationInfo} />
          </div>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={shifts}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["shiftList"] })
          }
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefShift;
