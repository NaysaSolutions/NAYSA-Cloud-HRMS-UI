// src/NAYSA Cloud/Reference File/RefLeave.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

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

const DOC_TYPE = "LeaveCode";

// Keep all API paths in one place so they are easy to align with your Laravel routes.
const API = {
  list: "/refLeave",
  upsert: "/upsertRefLeave",
  delete: "/deleteRefLeave",
  checkDuplicate: "/checkDuplicateRefLeave",
  checkInUsed: "/checkInUsedRefLeave",
};

const YES_NO_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const INITIAL_FORM = {
  lvNo: null,
  lvCode: "",
  lvName: "",
  edCode: "",
  edName: "",
  monitorBalance: "N",
  lvCreditCode: "",
  includeAllow: "N",
  paid: "N",
  withApp: "Y",
  tsData: "N",
  edCodeConv: "",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const normalizeYN = (value, fallback = "N") =>
  String(value ?? fallback).trim().toUpperCase() === "Y" ? "Y" : "N";

const yesNoLabel = (value) => (normalizeYN(value) === "Y" ? "Yes" : "No");

const RefLeave = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[DOC_TYPE];
  const videoLink = reftablesVideoGuide?.[DOC_TYPE];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [selectedLeaveCode, setSelectedLeaveCode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const currentUserCode =
    user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canAdd,
    canEdit,
    canSave,
    canDelete,
  } = usePagePermission({
    componentKey: "RefLeave",
    menuName: "Leave Codes",
    debug: true, // change to false after permission testing
  });

  const showReadOnlyAlert = async (action = "perform this action") => {
    await useSwalErrorAlert(
      "Read Only",
      `You only have read access. You are not allowed to ${action}.`,
    );
  };

  const isAdding = isEditing && !selectedLeaveCode;
  const formWritable =
    isEditing &&
    !isReadOnly &&
    isFullAccess &&
    (selectedLeaveCode ? canEdit : canAdd);

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const getMax = (column) => useGetFieldLength(tblFieldArray, column);

  // ---------------------------------------------------------------------------
  // Load leave codes
  // ---------------------------------------------------------------------------
  const {
    data: leaveCodes = [],
    isLoading: isListLoading,
  } = useQuery({
    queryKey: ["refLeaveList"],
    queryFn: async () => {
      const { data } = await apiClient.get(API.list);
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const { mutate: saveLeave, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => apiClient.post(API.upsert, payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (Number(sqlRow?.errorcount ?? 0) > 0) {
        useSwalErrorAlert(
          "Unable to save",
          sqlRow?.errormsg || "Failed to save Leave Code.",
        );
        return;
      }

      const status = response?.data?.status ?? response?.data?.data?.status;
      const success =
        response?.data?.success === true || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Leave Code.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["refLeaveList"] });
      useSwalSuccessAlert("Success!", "Leave Code saved successfully!");
      resetForm();
    },
    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.data?.message ||
          error?.response?.statusText ||
          error?.message ||
          String(error),
      );
    },
  });

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const { mutate: deleteLeave, isPending: isDeleting } = useMutation({
    mutationFn: async (payload) => apiClient.post(API.delete, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refLeaveList"] });
      useSwalDeleteRecord(
        "Deleted!",
        "The Leave Code has been removed from the system.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // ---------------------------------------------------------------------------
  // Form actions
  // ---------------------------------------------------------------------------
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedLeaveCode(null);
    setIsEditing(false);
    setIsFieldsExpanded(false);
  };

  const startAdd = async () => {
    if (!canAdd) {
      await showReadOnlyAlert("add leave code records");
      return;
    }

    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedLeaveCode(null);
    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const loadRowIntoForm = (row, allowEdit = false) => {
    if (!row) return;

    setSelectedLeaveCode(row.lvCode ?? null);
    setFormData({
      ...INITIAL_FORM,
      lvNo: row.lvNo ?? null,
      lvCode: row.lvCode ?? "",
      lvName: row.lvName ?? "",
      edCode: row.edCode ?? "",
      edName: row.edName ?? "",
      monitorBalance: normalizeYN(row.monitorBalance),
      lvCreditCode: row.lvCreditCode ?? "",
      includeAllow: normalizeYN(row.includeAllow),
      paid: normalizeYN(row.paid),
      withApp: normalizeYN(row.withApp, "Y"),
      tsData: normalizeYN(row.tsData),
      edCodeConv: row.edCodeConv ?? "",
      active: normalizeYN(row.active, "Y"),
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy ?? "",
      registeredDate: row.registeredDate ?? "",
      lastUpdatedBy: row.lastUpdatedBy ?? row.updatedBy ?? "",
      lastUpdatedDate: row.lastUpdatedDate ?? row.updatedDate ?? "",
    });

    // READ ONLY users may still retrieve/view a record.
    // FULL access users enter edit mode when requested.
    setIsEditing(Boolean(allowEdit && canEdit && isFullAccess));
    setIsFieldsExpanded(true);
  };

  const handleEdit = async (row) => {
    if (!row) return;

    if (!canEdit) {
      await showReadOnlyAlert("edit leave code records");
      loadRowIntoForm(row, false);
      return;
    }

    loadRowIntoForm(row, true);
  };

  const handleRowOpen = (row) => {
    if (!row) return;
    loadRowIntoForm(row, canEdit);
  };

  const validateForm = () => {
    const missing = [];

    if (!formData.lvCode.trim()) missing.push("Leave Code");
    if (!formData.lvName.trim()) missing.push("Leave Description");
    if (!formData.edCode.trim()) missing.push("E/D Code");
    if (!formData.edName.trim()) missing.push("E/D Description");

    if (missing.length > 0) {
      useSwalErrorAlert(
        "Validation Error",
        `Please fill in: ${missing.join(", ")}`,
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!canSave) {
      await showReadOnlyAlert("save leave code records");
      return;
    }

    if (!selectedLeaveCode && !canAdd) {
      await showReadOnlyAlert("add leave code records");
      return;
    }

    if (selectedLeaveCode && !canEdit) {
      await showReadOnlyAlert("edit leave code records");
      return;
    }

    if (!formWritable || !validateForm()) return;

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          lvCode: formData.lvCode.trim().toUpperCase(),
          lvName: formData.lvName.trim(),
          edCode: formData.edCode.trim().toUpperCase(),
          edName: formData.edName.trim(),
          lvCreditCode:
            formData.monitorBalance === "Y"
              ? formData.lvCreditCode.trim().toUpperCase()
              : "",
          edCodeConv: formData.edCodeConv.trim().toUpperCase(),
          action: selectedLeaveCode ? "EDIT" : "ADD",
          userCode: currentUserCode,
        },
      }),
    };

    saveLeave(payload);
  };

  const handleDelete = async (row) => {
    if (!canDelete) {
      await showReadOnlyAlert("delete leave code records");
      return;
    }

    if (!row?.lvCode) return;

    try {
      setIsLoading(true);

      const payload = {
        json_data: {
          lvCode: row.lvCode,
        },
      };

      const response = await apiClient.post(API.checkInUsed, payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsed = JSON.parse(rawJsonString || '{"result":"0"}');

      if (String(parsed?.result) === "1") {
        return useSwalErrorAlertAPI(
          `Cannot Delete Leave Code: ${row.lvCode}`,
          "Code was already used.",
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Leave Code: ${row.lvCode}?`,
      );

      if (confirm?.isConfirmed) {
        deleteLeave(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDuplicate = async (code) => {
    if (!canAdd || isReadOnly || selectedLeaveCode || !code?.trim()) return;

    try {
      const normalizedCode = code.trim().toUpperCase();
      const payload = { json_data: { lvCode: normalizedCode } };
      const response = await apiClient.post(API.checkDuplicate, payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsed = JSON.parse(rawJsonString || '{"result":"0"}');

      if (String(parsed?.result) === "1") {
        updateForm({ lvCode: "" });
        useSwalErrorAlertAPI(
          `Duplicate Leave Code: ${normalizedCode}`,
          "Code was already used.",
        );
      }
    } catch (error) {
      console.error("Leave Code duplicate check error:", error);
    }
  };

  // ---------------------------------------------------------------------------
  // Ctrl+S + close Info dropdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKey = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (isEditing && canSave && formWritable) handleSave();
      }
    };

    const handleClick = (event) => {
      if (guideRef.current && !guideRef.current.contains(event.target)) {
        setOpenGuide(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [
    isEditing,
    formData,
    selectedLeaveCode,
    canAdd,
    canEdit,
    canSave,
    formWritable,
  ]);

  // ---------------------------------------------------------------------------
  // Field-length metadata
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      const result = await useFieldLenghtCheck("REF_LV");
      if (mounted) setTblFieldArray(result || []);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------
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
              onClick={(event) => {
                event.stopPropagation();
                handleEdit(row);
              }}
              disabled={!canEdit}
              className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 border rounded-md transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                !canEdit
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-sm active:scale-95"
              }`}
              title={canEdit ? "Edit" : "Read Only"}
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(row);
              }}
              disabled={!canDelete}
              className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 border rounded-md transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 ${
                !canDelete
                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:shadow-sm active:scale-95"
              }`}
              title={canDelete ? "Delete" : "Read Only"}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      {
        key: "lvCode",
        label: "Leave Code",
        sortable: true,
        width: 110,
        minWidth: 110,
        requiredVisible: true,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold tracking-wide text-gray-700 dark:text-gray-200">
            {row.lvCode}
          </span>
        ),
      },
      {
        key: "lvName",
        label: "Description",
        sortable: true,
        width: 240,
        minWidth: 200,
        requiredVisible: true,
      },
      {
        key: "edCode",
        label: "E/D Code",
        sortable: true,
        width: 100,
        minWidth: 100,
      },
      {
        key: "edName",
        label: "E/D Description",
        sortable: true,
        width: 220,
        minWidth: 180,
      },
      {
        key: "monitorBalance",
        label: "Monitor Balance",
        sortable: true,
        width: 120,
        minWidth: 120,
        className: "!px-2",
        render: (row) => {
          const enabled = normalizeYN(row.monitorBalance) === "Y";
          return (
            <span
              className={`flex min-h-[28px] w-full items-center justify-center gap-1.5 rounded-full px-2 py-1 text-center text-[11px] font-medium whitespace-nowrap ${
                enabled
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                  : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <FontAwesomeIcon
                icon={enabled ? faCircleCheck : faCircleXmark}
                className={enabled ? "text-emerald-500" : "text-gray-400"}
              />
              {enabled ? "Yes" : "No"}
            </span>
          );
        },
      },
      {
        key: "lvCreditCode",
        label: "Leave Credit",
        sortable: true,
        width: 115,
        minWidth: 115,
      },
      {
        key: "includeAllow",
        label: "Inc. Allowance",
        sortable: true,
        width: 115,
        minWidth: 115,
        render: (row) => yesNoLabel(row.includeAllow),
      },
      {
        key: "paid",
        label: "Paid",
        sortable: true,
        width: 80,
        minWidth: 80,
        render: (row) => yesNoLabel(row.paid),
      },
      {
        key: "withApp",
        label: "With Application",
        sortable: true,
        width: 130,
        minWidth: 130,
        render: (row) => yesNoLabel(row.withApp),
      },
      {
        key: "tsData",
        label: "TS Data",
        sortable: true,
        width: 90,
        minWidth: 90,
        render: (row) => yesNoLabel(row.tsData),
      },
      {
        key: "edCodeConv",
        label: "E/D Code Conversion",
        sortable: true,
        width: 150,
        minWidth: 150,
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 90,
        minWidth: 90,
        className: "!px-2",
        render: (row) => {
          const enabled = normalizeYN(row.active, "Y") === "Y";
          return (
            <span
              className={`flex min-h-[28px] w-full items-center justify-center gap-1.5 rounded-full px-2 py-1 text-center text-[11px] font-medium whitespace-nowrap ${
                enabled
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                  : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <FontAwesomeIcon
                icon={enabled ? faCircleCheck : faCircleXmark}
                className={enabled ? "text-emerald-500" : "text-gray-400"}
              />
              {enabled ? "Yes" : "No"}
            </span>
          );
        },
      },
    ],
    [canEdit, canDelete],
  );

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
              {reftables?.[DOC_TYPE] || "Leave Codes"}
            </h1>
          </div>

          <div className="hidden md:flex justify-center w-full" />

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <PermissionBadge
                variant="reference"
                permission={pagePermission}
                isReadOnly={isReadOnly}
                isFullAccess={isFullAccess}
              />

              <ButtonBar
                buttons={[
                  {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: startAdd,
                    disabled: !canAdd,
                    className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150 ${
                      !canAdd
                        ? "bg-blue-400 opacity-50 cursor-not-allowed text-white"
                        : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                    }`,
                  },
                  {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: handleSave,
                    disabled:
                      !formWritable ||
                      !canSave ||
                      isSaving ||
                      !isFieldsExpanded,
                    className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150 ${
                      !formWritable || !canSave || isSaving || !isFieldsExpanded
                        ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                        : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                    }`,
                  },
                  {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: resetForm,
                    className:
                      "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                  },
                ]}
              />

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((value) => !value)}
                  className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
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
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
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
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" />
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
        <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg transition-colors duration-200 border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-[11px] sm:text-[14px] p-1.5 text-blue-600 font-semibold mt-0.5">
                {isEditing
                  ? selectedLeaveCode
                    ? `Updating Record - ${selectedLeaveCode}`
                    : "Fill in the fields below to add a new leave code"
                  : isReadOnly
                    ? "Read Only - double-click a row to view"
                    : "Select “Add” or double-click a row to edit"}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                aria-controls="ref-leave-fields ref-leave-registration"
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

          <div
            id="ref-leave-fields"
            className={`grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            {/* Column 1: Leave Information */}
            <div className="space-y-4">

              <FieldRenderer
                label="Leave Code"
                required
                type="text"
                value={formData.lvCode}
                disabled={!formWritable || !!selectedLeaveCode}
                onChange={(value) =>
                  updateForm({ lvCode: (value || "").toUpperCase() })
                }
                onBlur={(event) => handleCheckDuplicate(event.target.value)}
                maxLength={getMax("LV_CODE")}
              />

              <FieldRenderer
                label="Leave Description"
                required
                type="text"
                value={formData.lvName}
                disabled={!formWritable}
                onChange={(value) => updateForm({ lvName: value || "" })}
                maxLength={getMax("LV_NAME")}
              />

              <FieldRenderer
                label="E/D Code"
                required
                type="text"
                value={formData.edCode}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({ edCode: (value || "").toUpperCase() })
                }
                maxLength={getMax("ED_CODE")}
              />

              <FieldRenderer
                label="E/D Description"
                required
                type="text"
                value={formData.edName}
                disabled={!formWritable}
                onChange={(value) => updateForm({ edName: value || "" })}
                maxLength={getMax("ED_NAME")}
              />
            </div>

            {/* Column 2: Leave Rules */}
            <div className="space-y-4">

              <FieldRenderer
                label="Monitor Balance"
                type="select"
                value={formData.monitorBalance}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    monitorBalance: normalizeYN(value),
                    ...(normalizeYN(value) === "N" ? { lvCreditCode: "" } : {}),
                  })
                }
              />

              <FieldRenderer
                label="Leave Credit Code"
                type="text"
                value={formData.lvCreditCode}
                disabled={!formWritable || formData.monitorBalance !== "Y"}
                onChange={(value) =>
                  updateForm({ lvCreditCode: (value || "").toUpperCase() })
                }
                maxLength={getMax("LV_CREDIT_CODE")}
              />

              <FieldRenderer
                label="Include Allowance"
                type="select"
                value={formData.includeAllow}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) => updateForm({ includeAllow: normalizeYN(value) })}
              />

              <FieldRenderer
                label="Paid"
                type="select"
                value={formData.paid}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) => updateForm({ paid: normalizeYN(value) })}
              />
            </div>

            {/* Column 3: Processing */}
            <div className="space-y-4">

              <FieldRenderer
                label="With Application"
                type="select"
                value={formData.withApp}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) => updateForm({ withApp: normalizeYN(value) })}
              />

              <FieldRenderer
                label="TS Data"
                type="select"
                value={formData.tsData}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) => updateForm({ tsData: normalizeYN(value) })}
              />

              <FieldRenderer
                label="E/D Code Conversion"
                type="text"
                value={formData.edCodeConv}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({ edCodeConv: (value || "").toUpperCase() })
                }
                maxLength={getMax("ED_CODE_CONV")}
              />

              <FieldRenderer
                label="Active"
                type="select"
                value={formData.active}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) => updateForm({ active: normalizeYN(value, "Y") })}
              />
            </div>
          </div>

          {/* Registration Info */}
          <div
            id="ref-leave-registration"
            className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            <RegistrationInfo layout="straight" data={registrationInfo} />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={leaveCodes}
          isLoading={isListLoading}
          onRowDoubleClick={handleRowOpen}
          isReadOnly={isReadOnly}
          canAdd={canAdd}
          canEdit={canEdit}
          canSave={canSave}
          canDelete={canDelete}
          itemsPerPage={50}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["refLeaveList"] })
          }
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefLeave;
