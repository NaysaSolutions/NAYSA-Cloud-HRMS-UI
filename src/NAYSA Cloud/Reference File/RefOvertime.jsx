// src/NAYSA Cloud/Reference File/RefOvertime.jsx
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

const DOC_TYPE = "OvertimeCode";

const API = {
  list: "/refOvertime",
  upsert: "/upsertRefOvertime",
  delete: "/deleteRefOvertime",
  checkDuplicate: "/checkDuplicateRefOvertime",
  checkInUsed: "/checkInUsedRefOvertime",
};

const YES_NO_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const INITIAL_FORM = {
  otType: "",
  otNo: null,
  otCode: "",
  otName: "",
  otRate: "",
  edCode: "",
  edName: "",
  ndFlag: "N",
  holFlag: "N",
  type: "",
  includeAllow: "N",
  withApp: "Y",
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

const normalizeText = (value) => String(value ?? "").trim();

const RefOvertime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[DOC_TYPE];
  const videoLink = reftablesVideoGuide?.[DOC_TYPE];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

  // OT_TYPE is used as the business/reference key for this setup.
  const [selectedOtType, setSelectedOtType] = useState(null);

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
    componentKey: "RefOvertime",
    menuName: "Overtime Codes",
    debug: true, // change to false after permission testing
  });

  const showReadOnlyAlert = async (action = "perform this action") => {
    await useSwalErrorAlert(
      "Read Only",
      `You only have read access. You are not allowed to ${action}.`,
    );
  };

  const isAdding = isEditing && !selectedOtType;

  const formWritable =
    isEditing &&
    !isReadOnly &&
    isFullAccess &&
    (selectedOtType ? canEdit : canAdd);

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const getMax = (column) => useGetFieldLength(tblFieldArray, column);

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------
  const {
    data: overtimeCodes = [],
    isLoading: isListLoading,
  } = useQuery({
    queryKey: ["refOvertimeList"],
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
        console.error("Unable to parse Overtime Code list:", error);
        return [];
      }
    },
  });

  // ---------------------------------------------------------------------------
  // SAVE / UPSERT
  // ---------------------------------------------------------------------------
  const { mutate: saveOvertime, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => apiClient.post(API.upsert, payload),

    onSuccess: (response) => {
      // Supports both:
      // 1. { data: [{ errormsg, errorcount }] }
      // 2. { errormsg, errorcount }
      const sqlRow =
        response?.data?.data?.[0] ||
        response?.data?.[0] ||
        response?.data ||
        {};

      const errorCount = Number(sqlRow?.errorcount ?? 0);
      const errorMessage =
        sqlRow?.errormsg ||
        response?.data?.message ||
        "Failed to save Overtime Code.";

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
            "Failed to save Overtime Code.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["refOvertimeList"] });
      useSwalSuccessAlert("Success!", "Overtime Code saved successfully!");
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
  const { mutate: deleteOvertime, isPending: isDeleting } = useMutation({
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
            "Unable to delete Overtime Code.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["refOvertimeList"] });
      useSwalDeleteRecord(
        "Deleted!",
        "The Overtime Code has been removed from the system.",
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
    setSelectedOtType(null);
    setIsEditing(false);
    setIsFieldsExpanded(false);
  };

  const startAdd = async () => {
    if (!canAdd) {
      await showReadOnlyAlert("add overtime code records");
      return;
    }

    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedOtType(null);
    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const loadRowIntoForm = (row, allowEdit = false) => {
    if (!row) return;

    setSelectedOtType(row.otType ?? null);

    setFormData({
      ...INITIAL_FORM,
      otType: row.otType ?? "",
      otNo: row.otNo ?? null,
      otCode: row.otCode ?? "",
      otName: row.otName ?? "",
      otRate:
        row.otRate === null || row.otRate === undefined
          ? ""
          : String(row.otRate),
      edCode: row.edCode ?? "",
      edName: row.edName ?? "",
      ndFlag: normalizeYN(row.ndFlag),
      holFlag: normalizeYN(row.holFlag),
      type: row.type ?? "",
      includeAllow: normalizeYN(row.includeAllow),
      withApp: normalizeYN(row.withApp, "Y"),
      active: normalizeYN(row.active, "Y"),
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy ?? "",
      registeredDate: row.registeredDate ?? "",
      lastUpdatedBy: row.lastUpdatedBy ?? row.updatedBy ?? "",
      lastUpdatedDate: row.lastUpdatedDate ?? row.updatedDate ?? "",
    });

    // Read-only users can still retrieve/view the row.
    setIsEditing(Boolean(allowEdit && canEdit && isFullAccess));
    setIsFieldsExpanded(true);
  };

  const handleEdit = async (row) => {
    if (!row) return;

    if (!canEdit) {
      await showReadOnlyAlert("edit overtime code records");
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

    if (!normalizeText(formData.otType)) missing.push("OT Type");
    if (!normalizeText(formData.otCode)) missing.push("OT Code");
    if (!normalizeText(formData.otName)) missing.push("OT Name");

    if (
      formData.otRate === "" ||
      formData.otRate === null ||
      formData.otRate === undefined
    ) {
      missing.push("OT Rate");
    }

    if (missing.length > 0) {
      useSwalErrorAlert(
        "Validation Error",
        `Please fill in: ${missing.join(", ")}`,
      );
      return false;
    }

    const rate = Number(formData.otRate);

    if (!Number.isFinite(rate) || rate < 0) {
      useSwalErrorAlert(
        "Validation Error",
        "OT Rate must be a valid number greater than or equal to zero.",
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    // FUNCTION GUARD
    if (!canSave) {
      await showReadOnlyAlert("save overtime code records");
      return;
    }

    if (!selectedOtType && !canAdd) {
      await showReadOnlyAlert("add overtime code records");
      return;
    }

    if (selectedOtType && !canEdit) {
      await showReadOnlyAlert("edit overtime code records");
      return;
    }

    if (!formWritable || !validateForm()) return;

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          otType: normalizeText(formData.otType).toUpperCase(),
          otCode: normalizeText(formData.otCode).toUpperCase(),
          otName: normalizeText(formData.otName),
          otRate: Number(formData.otRate),
          edCode: normalizeText(formData.edCode).toUpperCase(),
          edName: normalizeText(formData.edName),
          ndFlag: normalizeYN(formData.ndFlag),
          holFlag: normalizeYN(formData.holFlag),
          type: normalizeText(formData.type).toUpperCase(),
          includeAllow: normalizeYN(formData.includeAllow),
          withApp: normalizeYN(formData.withApp, "Y"),
          active: normalizeYN(formData.active, "Y"),
          action: selectedOtType ? "EDIT" : "ADD",
          userCode: currentUserCode,
        },
      }),
    };

    saveOvertime(payload);
  };

  const handleDelete = async (row) => {
    // FUNCTION GUARD
    if (!canDelete) {
      await showReadOnlyAlert("delete overtime code records");
      return;
    }

    if (!row?.otType) return;

    try {
      setIsLoading(true);

      const payload = {
        json_data: {
          otType: row.otType,
          otCode: row.otCode ?? "",
        },
      };

      // Check if this reference has already been used.
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
          `Cannot Delete OT Type: ${row.otType}`,
          "Code was already used.",
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete OT Type: ${row.otType} (${row.otCode || ""})?`,
      );

      if (confirm?.isConfirmed) {
        deleteOvertime(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDuplicate = async (otType) => {
    if (!canAdd || isReadOnly || selectedOtType || !normalizeText(otType)) {
      return;
    }

    try {
      const normalizedOtType = normalizeText(otType).toUpperCase();

      const payload = {
        json_data: {
          otType: normalizedOtType,
          otCode: normalizeText(formData.otCode).toUpperCase(),
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
        updateForm({ otType: "" });

        useSwalErrorAlertAPI(
          `Duplicate OT Type: ${normalizedOtType}`,
          "OT Type was already used.",
        );
      }
    } catch (error) {
      console.error("Overtime duplicate check error:", error);
    }
  };

  // ---------------------------------------------------------------------------
  // CTRL+S / CLOSE INFO DROPDOWN
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
    selectedOtType,
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
      const result = await useFieldLenghtCheck("REF_OT");
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
        key: "otType",
        label: "OT Type",
        sortable: true,
        width: 115,
        minWidth: 115,
        requiredVisible: true,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold tracking-wide text-gray-700 dark:text-gray-200">
            {row.otType}
          </span>
        ),
      },
      {
        key: "otCode",
        label: "OT Code",
        sortable: true,
        width: 110,
        minWidth: 110,
        requiredVisible: true,
      },
      {
        key: "otName",
        label: "OT Name",
        sortable: true,
        width: 260,
        minWidth: 220,
        requiredVisible: true,
      },
      {
        key: "otRate",
        label: "OT Rate",
        sortable: true,
        width: 100,
        minWidth: 100,
        className: "text-right",
        render: (row) => {
          const value = Number(row.otRate ?? 0);

          return (
            <span className="block text-right tabular-nums">
              {Number.isFinite(value)
                ? value.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })
                : row.otRate}
            </span>
          );
        },
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
        key: "ndFlag",
        label: "Night Diff.",
        sortable: true,
        width: 100,
        minWidth: 100,
        className: "!px-2",
        render: (row) => {
          const enabled = normalizeYN(row.ndFlag) === "Y";

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
        key: "holFlag",
        label: "Holiday",
        sortable: true,
        width: 90,
        minWidth: 90,
        render: (row) => yesNoLabel(row.holFlag),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        width: 120,
        minWidth: 120,
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
        key: "withApp",
        label: "With Application",
        sortable: true,
        width: 130,
        minWidth: 130,
        render: (row) => yesNoLabel(row.withApp),
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
              {reftables?.[DOC_TYPE] || "Overtime Codes"}
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

              {/* INFO */}
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

      {/* MAIN CONTENT */}
      <div className="mt-24 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
        <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg transition-colors duration-200 border-gray-100 dark:border-gray-700">
          {/* Status strip */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-[11px] sm:text-[14px] p-1.5 text-blue-600 font-semibold mt-0.5">
                {isEditing
                  ? selectedOtType
                    ? `Updating Record - ${selectedOtType}`
                    : "Fill in the fields below to add a new overtime code"
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
                onClick={() =>
                  setIsFieldsExpanded((expanded) => !expanded)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                aria-expanded={isFieldsExpanded}
                aria-controls="ref-overtime-fields ref-overtime-registration"
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
            id="ref-overtime-fields"
            className={`grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            {/* COLUMN 1 */}
            <div className="space-y-4">

              <FieldRenderer
                label="OT Type"
                required
                type="text"
                value={formData.otType}
                disabled={!formWritable || !!selectedOtType}
                onChange={(value) =>
                  updateForm({
                    otType: (value || "").toUpperCase(),
                  })
                }
                onBlur={(event) =>
                  handleCheckDuplicate(event.target.value)
                }
                maxLength={getMax("OT_TYPE")}
              />

              <FieldRenderer
                label="OT Code"
                required
                type="text"
                value={formData.otCode}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({
                    otCode: (value || "").toUpperCase(),
                  })
                }
                maxLength={getMax("OT_CODE")}
              />

              <FieldRenderer
                label="OT Name"
                required
                type="text"
                value={formData.otName}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({ otName: value || "" })
                }
                maxLength={getMax("OT_NAME")}
              />

              <FieldRenderer
                label="OT Rate"
                required
                type="number"
                value={formData.otRate}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({ otRate: value ?? "" })
                }
              />
            </div>

            {/* COLUMN 2 */}
            <div className="space-y-4">

              <FieldRenderer
                label="E/D Code"
                type="text"
                value={formData.edCode}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({
                    edCode: (value || "").toUpperCase(),
                  })
                }
                maxLength={getMax("ED_CODE")}
              />

              <FieldRenderer
                label="E/D Description"
                type="text"
                value={formData.edName}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({ edName: value || "" })
                }
                maxLength={getMax("ED_NAME")}
              />

              <FieldRenderer
                label="Type"
                type="text"
                value={formData.type}
                disabled={!formWritable}
                onChange={(value) =>
                  updateForm({
                    type: (value || "").toUpperCase(),
                  })
                }
                maxLength={getMax("TYPE")}
              />

              <FieldRenderer
                label="Include Allowance"
                type="select"
                value={formData.includeAllow}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    includeAllow: normalizeYN(value),
                  })
                }
              />
            </div>

            {/* COLUMN 3 */}
            <div className="space-y-4">

              <FieldRenderer
                label="Night Differential"
                type="select"
                value={formData.ndFlag}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    ndFlag: normalizeYN(value),
                  })
                }
              />

              <FieldRenderer
                label="Holiday"
                type="select"
                value={formData.holFlag}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    holFlag: normalizeYN(value),
                  })
                }
              />

              <FieldRenderer
                label="With Application"
                type="select"
                value={formData.withApp}
                disabled={!formWritable}
                options={YES_NO_OPTIONS}
                onChange={(value) =>
                  updateForm({
                    withApp: normalizeYN(value, "Y"),
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
          </div>

          {/* REGISTRATION INFO */}
          <div
            id="ref-overtime-registration"
            className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            <RegistrationInfo
              layout="straight"
              data={registrationInfo}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={overtimeCodes}
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
              queryKey: ["refOvertimeList"],
            })
          }
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefOvertime;
