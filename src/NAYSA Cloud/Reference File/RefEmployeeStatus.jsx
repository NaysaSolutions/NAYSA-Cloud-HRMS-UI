// src/NAYSA Cloud/Reference File/RefEmployeeStatus.jsx
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

const DOC_TYPE = "EmployeeStatus";

const API = {
  list: "/refEmployeeStatus",
  upsert: "/upsertRefEmployeeStatus",
  delete: "/deleteRefEmployeeStatus",
  checkDuplicate: "/checkDuplicateRefEmployeeStatus",
  checkInUsed: "/checkInUsedRefEmployeeStatus",
};

const YES_NO_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const INITIAL_FORM = {
  statCode: "",
  statName: "",
  excludeProcess: "N",
  compCola: "N",
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

const RefEmployeeStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[DOC_TYPE];
  const videoLink = reftablesVideoGuide?.[DOC_TYPE];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

  const [selectedStatCode, setSelectedStatCode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const currentUserCode =
    user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  // ---------------------------------------------------------------------------
  // PERMISSION
  // ---------------------------------------------------------------------------
  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canAdd,
    canEdit,
    canSave,
    canDelete,
  } = usePagePermission({
    componentKey: "RefEmployeeStatus",
    menuName: "Employee Status",
    debug: true,
  });

  const showReadOnlyAlert = async (action = "perform this action") => {
    await useSwalErrorAlert(
      "Read Only",
      `You only have read access. You are not allowed to ${action}.`,
    );
  };

  const isAdding = isEditing && !selectedStatCode;

  const formWritable =
    isEditing &&
    !isReadOnly &&
    isFullAccess &&
    (selectedStatCode ? canEdit : canAdd);

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const getMax = (column) => useGetFieldLength(tblFieldArray, column);

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------
  const {
    data: employeeStatuses = [],
    isLoading: isListLoading,
  } = useQuery({
    queryKey: ["refEmployeeStatusList"],
    queryFn: async () => {
      const { data } = await apiClient.get(API.list);

      const raw =
        data?.data?.[0]?.result ||
        data?.[0]?.result ||
        data?.result;

      if (!raw) return [];

      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Unable to parse Employee Status list:", error);
        return [];
      }
    },
  });

  // ---------------------------------------------------------------------------
  // UPSERT
  // ---------------------------------------------------------------------------
  const { mutate: saveEmployeeStatus, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => apiClient.post(API.upsert, payload),

    onSuccess: (response) => {
      const sqlRow =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      const errorCount = Number(sqlRow?.errorcount ?? 0);
      const errorMessage =
        sqlRow?.errormsg ||
        response?.data?.message ||
        "Failed to save Employee Status.";

      if (errorCount > 0) {
        useSwalErrorAlert("Unable to save", errorMessage);
        return;
      }

      const status =
        response?.data?.status ??
        response?.data?.data?.status;

      const success =
        response?.data?.success === true ||
        status === "success" ||
        (!status && errorCount === 0);

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Employee Status.",
        );
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["refEmployeeStatusList"],
      });

      useSwalSuccessAlert(
        "Success!",
        "Employee Status saved successfully!",
      );

      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.response?.statusText ||
          error?.message ||
          String(error),
      );
    },
  });

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------
  const { mutate: deleteEmployeeStatus, isPending: isDeleting } = useMutation({
    mutationFn: async (payload) => apiClient.post(API.delete, payload),

    onSuccess: (response) => {
      const errorCount = Number(
        response?.data?.errorcount ??
          response?.data?.data?.[0]?.errorcount ??
          0,
      );

      if (errorCount > 0) {
        useSwalErrorAlert(
          "Unable to delete",
          response?.data?.errormsg ||
            response?.data?.data?.[0]?.errormsg ||
            "Unable to delete Employee Status.",
        );
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["refEmployeeStatusList"],
      });

      useSwalDeleteRecord(
        "Deleted!",
        "The Employee Status has been removed from the system.",
      );

      resetForm();
    },

    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // ---------------------------------------------------------------------------
  // FORM ACTIONS
  // ---------------------------------------------------------------------------
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedStatCode(null);
    setIsEditing(false);
    setIsFieldsExpanded(false);
  };

  const startAdd = async () => {
    if (!canAdd) {
      await showReadOnlyAlert("add employee status records");
      return;
    }

    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedStatCode(null);
    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const loadRowIntoForm = (row, allowEdit = false) => {
    if (!row) return;

    setSelectedStatCode(row.statCode ?? null);

    setFormData({
      ...INITIAL_FORM,
      statCode: row.statCode ?? "",
      statName: row.statName ?? "",
      excludeProcess: normalizeYN(row.excludeProcess),
      compCola: normalizeYN(row.compCola),
      active: normalizeYN(row.active, "Y"),
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy ?? "",
      registeredDate: row.registeredDate ?? "",
      lastUpdatedBy: row.lastUpdatedBy ?? row.updatedBy ?? "",
      lastUpdatedDate: row.lastUpdatedDate ?? row.updatedDate ?? "",
    });

    setIsEditing(Boolean(allowEdit && canEdit && isFullAccess));
    setIsFieldsExpanded(true);
  };

  const handleEdit = async (row) => {
    if (!row) return;

    if (!canEdit) {
      await showReadOnlyAlert("edit employee status records");
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

    if (!String(formData.statCode || "").trim()) {
      missing.push("Status Code");
    }

    if (!String(formData.statName || "").trim()) {
      missing.push("Status Name");
    }

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
      await showReadOnlyAlert("save employee status records");
      return;
    }

    if (!selectedStatCode && !canAdd) {
      await showReadOnlyAlert("add employee status records");
      return;
    }

    if (selectedStatCode && !canEdit) {
      await showReadOnlyAlert("edit employee status records");
      return;
    }

    if (!formWritable || !validateForm()) return;

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          statCode: String(formData.statCode || "").trim().toUpperCase(),
          statName: String(formData.statName || "").trim(),
          excludeProcess: normalizeYN(formData.excludeProcess),
          compCola: normalizeYN(formData.compCola),
          active: normalizeYN(formData.active, "Y"),
          action: selectedStatCode ? "EDIT" : "ADD",
          userCode: currentUserCode,
        },
      }),
    };

    saveEmployeeStatus(payload);
  };

  const handleDelete = async (row) => {
    if (!canDelete) {
      await showReadOnlyAlert("delete employee status records");
      return;
    }

    if (!row?.statCode) return;

    try {
      setIsLoading(true);

      const payload = {
        json_data: {
          statCode: row.statCode,
        },
      };

      const response = await apiClient.post(API.checkInUsed, payload);

      const sqlRow = response?.data?.data?.[0] || {};
      const rawJsonString =
        sqlRow?.result ||
        response?.data?.result ||
        Object.values(sqlRow || {})[0];

      let isUsed = response?.data?.isInUsed === true;

      if (!isUsed && rawJsonString) {
        try {
          const parsed =
            typeof rawJsonString === "string"
              ? JSON.parse(rawJsonString)
              : rawJsonString;

          isUsed = String(parsed?.result ?? "0") === "1";
        } catch {
          isUsed = false;
        }
      }

      if (isUsed) {
        return useSwalErrorAlertAPI(
          `Cannot Delete Status Code: ${row.statCode}`,
          "Code was already used.",
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Status Code: ${row.statCode}?`,
      );

      if (confirm?.isConfirmed) {
        deleteEmployeeStatus(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDuplicate = async (statCode) => {
    if (
      !canAdd ||
      isReadOnly ||
      selectedStatCode ||
      !String(statCode || "").trim()
    ) {
      return;
    }

    try {
      const normalizedCode = String(statCode).trim().toUpperCase();

      const payload = {
        json_data: {
          statCode: normalizedCode,
        },
      };

      const response = await apiClient.post(API.checkDuplicate, payload);

      const sqlRow = response?.data?.data?.[0] || {};
      const rawJsonString =
        sqlRow?.result ||
        response?.data?.result ||
        Object.values(sqlRow || {})[0];

      let duplicate = false;

      if (rawJsonString) {
        try {
          const parsed =
            typeof rawJsonString === "string"
              ? JSON.parse(rawJsonString)
              : rawJsonString;

          duplicate = String(parsed?.result ?? "0") === "1";
        } catch {
          duplicate = false;
        }
      }

      if (duplicate) {
        updateForm({ statCode: "" });

        useSwalErrorAlertAPI(
          `Duplicate Status Code: ${normalizedCode}`,
          "Status Code was already used.",
        );
      }
    } catch (error) {
      console.error("Employee Status duplicate check error:", error);
    }
  };

  // ---------------------------------------------------------------------------
  // CTRL+S + INFO DROPDOWN
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKey = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();

        if (isEditing && canSave && formWritable) {
          handleSave();
        }
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
    selectedStatCode,
    canAdd,
    canEdit,
    canSave,
    formWritable,
  ]);

  // ---------------------------------------------------------------------------
  // FIELD LENGTH METADATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      const result = await useFieldLenghtCheck("REF_EMPSTAT");
      if (mounted) {
        setTblFieldArray(result || []);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // TABLE COLUMNS
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
        key: "statCode",
        label: "Status Code",
        sortable: true,
        width: 130,
        minWidth: 130,
        requiredVisible: true,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold tracking-wide text-gray-700 dark:text-gray-200">
            {row.statCode}
          </span>
        ),
      },
      {
        key: "statName",
        label: "Status Name",
        sortable: true,
        width: 280,
        minWidth: 220,
        requiredVisible: true,
      },
      {
        key: "excludeProcess",
        label: "Exclude Process",
        sortable: true,
        width: 130,
        minWidth: 130,
        render: (row) =>
          normalizeYN(row.excludeProcess) === "Y" ? "Yes" : "No",
      },
      {
        key: "compCola",
        label: "Comp. COLA",
        sortable: true,
        width: 120,
        minWidth: 120,
        render: (row) =>
          normalizeYN(row.compCola) === "Y" ? "Yes" : "No",
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 95,
        minWidth: 95,
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
              {reftables?.[DOC_TYPE] || "Employee Status"}
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
                      />
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

      {/* MAIN CONTENT: COLLAPSIBLE FORM | TABLE */}
      <div className="mt-24 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
        {/* LEFT: COLLAPSIBLE FORM PANEL */}
        <div
          className={`relative shrink-0 overflow-hidden bg-white dark:bg-gray-800 rounded-xl border shadow-lg transition-all duration-300 border-gray-100 dark:border-gray-700 ${
            isFieldsExpanded
              ? "w-full lg:w-[420px]"
              : "w-full lg:w-10 min-h-[56px]"
          }`}
        >
          {/* Form content */}
          <div
            className={`transition-all duration-200 ${
              isFieldsExpanded
                ? "opacity-100 p-4 pr-12"
                : "opacity-0 pointer-events-none h-0 lg:h-auto lg:p-0"
            }`}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-[13px] p-1 text-blue-600 font-semibold mt-0.5 truncate">
                  {isEditing
                    ? selectedStatCode
                      ? `Updating Record - ${selectedStatCode}`
                      : "Add New Employee Status"
                    : isReadOnly
                      ? "Read Only"
                      : "Employee Status Details"}
                </p>
              </div>

              {isEditing && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${
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
            </div>

            <div
              id="ref-employee-status-fields"
              className="grid grid-cols-1 gap-y-4"
            >
              <FieldRenderer
                label="Status Code"
                required
                type="text"
                value={formData.statCode}
                disabled={!formWritable || !!selectedStatCode}
                onChange={(value) =>
                  updateForm({
                    statCode: (value || "").toUpperCase(),
                  })
                }
                onBlur={(event) =>
                  handleCheckDuplicate(event.target.value)
                }
                maxLength={getMax("STAT_CODE")}
              />

              <FieldRenderer
                label="Status Name"
                required
                type="text"
                value={formData.statName}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({ statName: value || "" })
                }
                maxLength={getMax("STAT_NAME")}
              />

              <FieldRenderer
                label="Exclude Process"
                type="select"
                value={formData.excludeProcess}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    excludeProcess: normalizeYN(value),
                  })
                }
              />

              <FieldRenderer
                label="Comp. COLA"
                type="select"
                value={formData.compCola}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    compCola: normalizeYN(value),
                  })
                }
              />

              <FieldRenderer
                label="Active"
                type="select"
                value={formData.active}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    active: normalizeYN(value, "Y"),
                  })
                }
              />
            </div>

            <div
              id="ref-employee-status-registration"
              className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
            >
              <RegistrationInfo
                layout="compact"
                data={registrationInfo}
              />
            </div>
          </div>

          {/* COLLAPSE / EXPAND BAR */}
          <button
            type="button"
            onClick={() => setIsFieldsExpanded((expanded) => !expanded)}
            className={`absolute top-0 right-0 bottom-0 z-20 border-l border-blue-100 dark:border-gray-700 bg-blue-50/90 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
              isFieldsExpanded ? "w-9" : "w-full lg:w-10"
            }`}
            aria-expanded={isFieldsExpanded}
            aria-controls="ref-employee-status-fields ref-employee-status-registration"
            title={isFieldsExpanded ? "Collapse" : "Expand"}
          >
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`text-[11px] transition-transform duration-200 ${
                isFieldsExpanded ? "rotate-90" : "-rotate-90"
              }`}
            />
            <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold tracking-wide">
              {isFieldsExpanded ? "Collapse" : "Expand"}
            </span>
          </button>
        </div>

        {/* RIGHT: TABLE */}
        <div className="global-tran-table-main-div-ui flex-1 min-w-0 mt-0">
          <SearchGlobalReferenceTable
            docType={DOC_TYPE}
            columns={columns}
            data={employeeStatuses}
            isLoading={isListLoading}
            onRowDoubleClick={handleRowOpen}

            /* Child permission props */
            isReadOnly={isReadOnly}
            canAdd={canAdd}
            canEdit={canEdit}
            canSave={canSave}
            canDelete={canDelete}

            itemsPerPage={50}
            onRefresh={() =>
              queryClient.invalidateQueries({
                queryKey: ["refEmployeeStatusList"],
              })
            }
            autoFillGrid="True"
          />
        </div>
      </div>
    </div>
  );
};

export default RefEmployeeStatus;
