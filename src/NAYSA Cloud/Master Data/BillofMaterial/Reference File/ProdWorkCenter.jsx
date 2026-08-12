import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faEdit,
  faFilePdf,
  faInfoCircle,
  faPlus,
  faSave as faSaveIcon,
  faTrashAlt,
  faUndo,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalDeleteConfirm,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const API_ENDPOINTS = {
  load: "workCenter/load",
  upsert: "workCenter/upsert",
  delete: "workCenter/delete",
  checkDuplicate: "workCenter/checkDuplicate",
  checkInUsed: "workCenter/checkInUsed",
};

const DEFAULT_FORM = {
  wcCode: "",
  wcName: "",
  estRuntime: "",
  stdLabor: "",
  stdOverhead: "",
  active: "Y",
  __existing: false,
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const extractRows = (payload) => {
  const result =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data ??
    payload?.data;

  if (!result) return [];
  if (Array.isArray(result)) return result;

  if (typeof result === "string") {
    try {
      return JSON.parse(result) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const getSqlRow = (response) =>
  response?.data?.data?.[0] ??
  response?.data?.[0] ??
  response?.data?.data ??
  response?.data ??
  {};

const parseSprocResult = (response) => {
  const sqlRow = getSqlRow(response);
  const rawValue = sqlRow?.result ?? Object.values(sqlRow || {})?.[0];

  if (!rawValue) return { result: "0" };
  if (typeof rawValue === "object") return rawValue;

  try {
    return JSON.parse(rawValue);
  } catch {
    return { result: "0" };
  }
};

const toYN = (value, def = "Y") => {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["Y", "YES", "TRUE", "1"].includes(normalized)) return "Y";
  if (["N", "NO", "FALSE", "0"].includes(normalized)) return "N";
  return def;
};

const toFormNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const numericValue = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numericValue)) return "";

  return numericValue.toFixed(DECIMAL_SCALE);
};

const DECIMAL_PRECISION = 18;
const DECIMAL_SCALE = 2;
const DECIMAL_WHOLE_DIGITS = DECIMAL_PRECISION - DECIMAL_SCALE;
const DECIMAL_MAX_LENGTH = DECIMAL_WHOLE_DIGITS + 1 + DECIMAL_SCALE; // decimal(18,2) = 16 digits + dot + 2 decimals

const FIELD_MAX_LENGTH = {
  WC_CODE: 20,
  WC_NAME: 100,
  ACTIVE: 1,
};

const getInputValue = (value) => {
  if (value?.target) return value.target.value;
  return value ?? "";
};

const normalizeDecimalInput = (value, previousValue = "") => {
  const rawValue = String(getInputValue(value));

  // Do not allow negative values or scientific notation. Keep the previous
  // valid value instead of converting pasted values like -10 or 1e5.
  if (/[+\-eE]/.test(rawValue)) return previousValue;

  const cleaned = rawValue.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const [wholePart = "", ...decimalParts] = cleaned.split(".");
  const whole = wholePart.slice(0, DECIMAL_WHOLE_DIGITS);

  if (decimalParts.length === 0) return whole;

  const decimals = decimalParts.join("").slice(0, DECIMAL_SCALE);
  return `${whole}.${decimals}`;
};

const preventInvalidDecimalKey = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const allowedControlKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];

  if (allowedControlKeys.includes(event.key)) return;

  if (!/^[0-9.]$/.test(event.key)) {
    event.preventDefault();
  }
};

const toDecimalPayload = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const numericValue = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numericValue)) return value;
  return numericValue.toFixed(DECIMAL_SCALE);
};

const formatDecimalForDisplay = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const numericValue = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numericValue) || numericValue < 0) return "";

  return numericValue.toFixed(DECIMAL_SCALE);
};

const normalizeWorkCenterRow = (row = {}) => {
  const registeredByCode =
    row.registeredByCode ??
    row.REGISTERED_BY_CODE ??
    row.registered_by_code ??
    row.registeredBy ??
    row.REGISTERED_BY ??
    row.registered_by ??
    "";

  const registeredByName =
    row.registeredByName ??
    row.REGISTERED_BY_NAME ??
    row.registered_by_name ??
    row.registeredName ??
    row.REGISTERED_NAME ??
    row.regFullName ??
    row.REG_FULL_NAME ??
    "";

  const lastUpdatedByCode =
    row.lastUpdatedByCode ??
    row.updatedByCode ??
    row.LAST_UPDATED_BY_CODE ??
    row.UPDATED_BY_CODE ??
    row.lastUpdatedBy ??
    row.updatedBy ??
    row.LAST_UPDATED_BY ??
    row.UPDATED_BY ??
    row.updated_by ??
    "";

  const lastUpdatedByName =
    row.lastUpdatedByName ??
    row.updatedByName ??
    row.LAST_UPDATED_BY_NAME ??
    row.UPDATED_BY_NAME ??
    row.lastUpdatedName ??
    row.updatedName ??
    row.LAST_UPDATED_NAME ??
    row.UPDATED_NAME ??
    "";

  return {
    ...row,
    wcCode: row.wcCode ?? row.WC_CODE ?? row.wc_code ?? "",
    wcName: row.wcName ?? row.WC_NAME ?? row.wc_name ?? "",
    estRuntime: toFormNumber(
      row.estRuntime ?? row.EST_RUNTIME ?? row.est_runtime ?? "",
    ),
    stdLabor: toFormNumber(row.stdLabor ?? row.STD_LABOR ?? row.std_labor ?? ""),
    stdOverhead: toFormNumber(
      row.stdOverhead ?? row.STD_OVERHEAD ?? row.std_overhead ?? "",
    ),
    active: toYN(row.active ?? row.ACTIVE ?? row.Active ?? "Y", "Y"),
    registeredByCode,
    registeredByName,
    registeredBy: registeredByName || registeredByCode,
    registeredDate:
      row.registeredDate ?? row.REGISTERED_DATE ?? row.registered_date ?? "",
    lastUpdatedByCode,
    lastUpdatedByName,
    lastUpdatedBy: lastUpdatedByName || lastUpdatedByCode,
    lastUpdatedDate:
      row.lastUpdatedDate ??
      row.updatedDate ??
      row.LAST_UPDATED_DATE ??
      row.UPDATED_DATE ??
      row.updated_date ??
      "",
  };
};

const getAuthUserCode = (user = {}) =>
  String(
    user?.USER_CODE ??
      user?.userCode ??
      user?.user_code ??
      user?.code ??
      user?.id ??
      "",
  )
    .trim()
    .toUpperCase();

const getAuthUserName = (user = {}) => {
  const fullName = [
    user?.FIRST_NAME ?? user?.firstName ?? user?.first_name,
    user?.MIDDLE_NAME ?? user?.middleName ?? user?.middle_name,
    user?.LAST_NAME ?? user?.lastName ?? user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    user?.USER_NAME ??
    user?.userName ??
    user?.user_name ??
    user?.FULL_NAME ??
    user?.fullName ??
    user?.full_name ??
    user?.NAME ??
    user?.name ??
    fullName ??
    ""
  );
};

const resolveAuditUserName = (name, code, user) => {
  const displayName = String(name || "").trim();
  if (displayName) return displayName;

  const auditCode = String(code || "").trim();
  if (!auditCode) return "";

  if (auditCode.toUpperCase() === getAuthUserCode(user)) {
    return String(getAuthUserName(user) || auditCode).trim();
  }

  return auditCode;
};

const buildSprocBody = (payload) => ({
  json_data: JSON.stringify({ json_data: payload }),
});

const ProdWorkCenter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const docType = "ProdWorkCenter";
  const documentTitle = reftables?.[docType] || "Work Center";

  const guideRef = useRef(null);
  const formFieldsRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[docType] || "#";
  const videoLink = reftablesVideoGuide?.[docType] || "#";

  const [form, setForm] = useState(DEFAULT_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] =
    useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setDecimalField = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: normalizeDecimalInput(value, prev[key]),
    }));

  const formatDecimalField = (key) =>
    setForm((prev) => ({
      ...prev,
      [key]: formatDecimalForDisplay(prev[key]),
    }));

  const resetForm = (next = DEFAULT_FORM) => setForm(next);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await useFieldLenghtCheck("WORKCENTER_REF");
      if (mounted) setTblFieldArray(res || []);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => {
    const configuredMax = Number(useGetFieldLength(tblFieldArray, col));
    if (Number.isFinite(configuredMax) && configuredMax > 0) return configuredMax;
    return FIELD_MAX_LENGTH[col] || undefined;
  };

  const getDecimalMax = () => DECIMAL_MAX_LENGTH;

  const handleEnterToNextField = (event) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    const tagName = target?.tagName?.toLowerCase();
    const isInputField = ["input", "select", "textarea"].includes(tagName);
    const isCustomSelect = target?.getAttribute?.("role") === "combobox";

    if (!isInputField && !isCustomSelect) return;
    if (tagName === "textarea") return;

    const container = formFieldsRef.current;
    if (!container) return;

    const fields = Array.from(
      container.querySelectorAll(
        'input:not([type="hidden"]), select, textarea, [role="combobox"]',
      ),
    ).filter((el) => {
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    });

    const currentIndex = fields.findIndex((el) => el === target || el.contains(target));
    const nextField = fields[currentIndex + 1];

    if (nextField) {
      event.preventDefault();
      nextField.focus();
    }
  };

  useEffect(() => {
    document.title = documentTitle;

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [documentTitle]);

  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const workCenterListQuery = useQuery({
    queryKey: ["prodWorkCenterList"],
    queryFn: async () => {
      const result = await apiClient.get(API_ENDPOINTS.load, {
        params: {
          filter: "ActiveAll",
        },
      });

      return extractRows(result).map(normalizeWorkCenterRow);
    },
  });

  const workCenters = useMemo(
    () => (workCenterListQuery.data || []).map(normalizeWorkCenterRow),
    [workCenterListQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: async (payload) =>
      apiClient.post(API_ENDPOINTS.upsert, buildSprocBody(payload)),
    onSuccess: async (response) => {
      const sqlRow = getSqlRow(response);

      if (Number(sqlRow?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Save Failed",
          sqlRow?.errormsg || "Unable to save Work Center.",
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["prodWorkCenterList"] });
      useSwalSuccessAlert("Success", "Work Center saved successfully.");
      handleReset();
    },
    onError: (error) =>
      useSwalErrorAlert(
        "Error",
        error?.response?.data?.message || error?.message || "Save failed.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (wcCode) =>
      apiClient.post(
        API_ENDPOINTS.delete,
        buildSprocBody({
          wcCode,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        }),
      ),
    onSuccess: async (response) => {
      const sqlRow = getSqlRow(response);

      if (Number(sqlRow?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Delete Failed",
          sqlRow?.errormsg || "Unable to delete Work Center.",
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["prodWorkCenterList"] });
      useSwalSuccessAlert("Deleted", "Work Center removed successfully.");
      handleReset();
    },
    onError: (error) =>
      useSwalErrorAlert(
        "Error",
        error?.response?.data?.message || error?.message || "Delete failed.",
      ),
  });

  const handleSave = () => {
    if (!isEditing || saveMutation.isPending) return;

    const wcCode = String(form.wcCode || "")
      .trim()
      .toUpperCase();
    const wcName = String(form.wcName || "").trim();
    const estRuntime = String(form.estRuntime || "").trim();
    const stdLabor = String(form.stdLabor || "").trim();
    const stdOverhead = String(form.stdOverhead || "").trim();

    if (!wcCode || !wcName || !estRuntime || !stdLabor || !stdOverhead) {
      return useSwalErrorAlert(
        "Validation Error",
        "WC Code, WC Name, Estimated Runtime (Mins), Standard Direct Labor Cost, and Standard Factory Overhead Cost are required.",
      );
    }

    const numericValues = [
      { label: "Estimated Runtime (Mins)", value: estRuntime },
      { label: "Standard Direct Labor Cost", value: stdLabor },
      { label: "Standard Factory Overhead Cost", value: stdOverhead },
    ];

    const invalidNumeric = numericValues.find(({ value }) => {
      const numberValue = Number(value);
      return !Number.isFinite(numberValue) || numberValue < 0;
    });

    if (invalidNumeric) {
      return useSwalErrorAlert(
        "Validation Error",
        `${invalidNumeric.label} must be a valid non-negative amount.`,
      );
    }

    const payload = {
      wcCode,
      wcName,
      estRuntime: toDecimalPayload(estRuntime),
      stdLabor: toDecimalPayload(stdLabor),
      stdOverhead: toDecimalPayload(stdOverhead),
      active: toYN(form.active, "Y"),
      action: form.__existing ? "EDIT" : "ADD",
      userCode: user?.USER_CODE || user?.userCode || "ADMIN",
    };

    saveMutation.mutate(payload);
  };

  const handleAdd = () => {
    handleReset();
    setIsEditing(true);
  };

  const handleEdit = (row) => {
    const normalizedRow = normalizeWorkCenterRow(row);

    setForm({
      ...DEFAULT_FORM,
      ...normalizedRow,
      __existing: true,
    });
    setRegistrationInfo({
      registeredBy: resolveAuditUserName(
        normalizedRow.registeredByName,
        normalizedRow.registeredByCode || normalizedRow.registeredBy,
        user,
      ),
      registeredDate: normalizedRow.registeredDate || "",
      lastUpdatedBy: resolveAuditUserName(
        normalizedRow.lastUpdatedByName,
        normalizedRow.lastUpdatedByCode || normalizedRow.lastUpdatedBy,
        user,
      ),
      lastUpdatedDate: normalizedRow.lastUpdatedDate || "",
    });
    setSelectedRow(normalizedRow);
    setIsEditing(true);

    if (isMobile) closeMobileActionSheet();
  };

  const handleDelete = async (row) => {
    const wcCode = String(row?.wcCode || "").trim();

    if (!wcCode) return;

    try {
      const checkResponse = await apiClient.post(
        API_ENDPOINTS.checkInUsed,
        buildSprocBody({ wcCode }),
      );
      const parsedData = parseSprocResult(checkResponse);

      if (String(parsedData?.result) === "1") {
        return useSwalErrorAlert(
          "Cannot Delete",
          `WC Code ${wcCode} is currently in use and cannot be deleted.`,
        );
      }
    } catch (error) {
      console.error("Work Center in-use check failed", error);
      return useSwalErrorAlert(
        "Cannot Verify Usage",
        "Unable to verify if this Work Center is already in use. Delete was cancelled for safety.",
      );
    }

    const confirm = await useSwalDeleteConfirm(
      "Confirm Delete",
      `Are you sure you want to delete Work Center ${wcCode}?`,
    );

    if (confirm?.isConfirmed) {
      deleteMutation.mutate(wcCode);
    }
  };

  const handleCheckDuplicate = async (code) => {
    const wcCode = String(code || "")
      .trim()
      .toUpperCase();

    if (form.__existing || !wcCode) return;

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.checkDuplicate,
        buildSprocBody({ wcCode }),
      );
      const parsedData = parseSprocResult(response);

      if (String(parsedData?.result) === "1") {
        setField("wcCode", "");
        return useSwalErrorAlert(
          "Duplicate Code",
          `WC Code ${wcCode} already exists.`,
        );
      }
    } catch (error) {
      console.error("Work Center duplicate check failed", error);
    }
  };

  const handleReset = () => {
    resetForm(DEFAULT_FORM);
    setRegistrationInfo(INITIAL_REG);
    setIsEditing(false);
    setSelectedRow(null);
  };

  const openMobileActionSheet = (row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);
    requestAnimationFrame(() => setIsMobileActionSheetOpen(true));
  };

  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);
    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 120,
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) openMobileActionSheet(row);
                else handleEdit(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
              title="Edit"
              type="button"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) openMobileActionSheet(row);
                else handleDelete(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
              title="Delete"
              type="button"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      {
        key: "wcCode",
        label: "WC Code",
        sortable: true,
        width: 110,
      },
      {
        key: "wcName",
        label: "WC Name",
        sortable: true,
        width: 260,
        maxWidth: 260,
      },
      {
        key: "estRuntime",
        label: "Estimated Runtime (Mins)",
        sortable: true,
        width: 150,
        render: (row) => Number(row.estRuntime || 0).toFixed(2),
      },
      {
        key: "stdLabor",
        label: "Standard Direct Labor Cost",
        sortable: true,
        width: 160,
        render: (row) => Number(row.stdLabor || 0).toFixed(2),
      },
      {
        key: "stdOverhead",
        label: "Standard Factory Overhead Cost",
        sortable: true,
        width: 160,
        render: (row) => Number(row.stdOverhead || 0).toFixed(2),
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 80,
        render: (row) => (toYN(row.active, "Y") === "Y" ? "Yes" : "No"),
      },
    ],
    [isMobile],
  );

  return (
    <div className="global-ref-main-div-ui">
      {(workCenterListQuery.isLoading ||
        saveMutation.isPending ||
        deleteMutation.isPending) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-2 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              Work Center
            </h1>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: handleAdd,
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: <span className="sm:inline ml-1">Save</span>,
                      icon: faSaveIcon,
                      onClick: handleSave,
                      disabled: !isEditing || saveMutation.isPending,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${
                        !isEditing || saveMutation.isPending
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`,
                    },
                    {
                      key: "reset",
                      label: <span className="sm:inline ml-1">Reset</span>,
                      icon: faUndo,
                      onClick: handleReset,
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                  ]}
                />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-16 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                  type="button"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="hidden sm:inline text-[10px] opacity-80"
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                      type="button"
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

      <div
        className="mt-40 sm:mt-24"
        style={{ minHeight: "calc(100vh - 170px)" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
          <div
            ref={formFieldsRef}
            onKeyDownCapture={handleEnterToNextField}
            className="flex-1 rounded-xl border bg-white p-6 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-6">
                <FieldRenderer
                  label="WC Code"
                  value={form.wcCode}
                  onChange={(val) => setField("wcCode", String(val).toUpperCase())}
                  onBlur={(e) => handleCheckDuplicate(e.target.value)}
                  disabled={!isEditing || form.__existing}
                  required
                  maxLength={getMax("WC_CODE")}
                />
                <FieldRenderer
                  label="WC Name"
                  value={form.wcName}
                  onChange={(val) => setField("wcName", val)}
                  disabled={!isEditing}
                  required
                  maxLength={getMax("WC_NAME")}
                />
                <FieldRenderer
                  label="Active"
                  type="select"
                  value={form.active}
                  onChange={(val) => setField("active", val)}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="space-y-6">
                <FieldRenderer
                  label="Estimated Runtime (Mins)"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={form.estRuntime}
                  onChange={(val) => setDecimalField("estRuntime", val)}
                  onBlur={() => formatDecimalField("estRuntime")}
                  onKeyDown={preventInvalidDecimalKey}
                  disabled={!isEditing}
                  required
                  maxLength={getDecimalMax()}
                />
                <FieldRenderer
                  label="Standard Direct Labor Cost"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={form.stdLabor}
                  onChange={(val) => setDecimalField("stdLabor", val)}
                  onBlur={() => formatDecimalField("stdLabor")}
                  onKeyDown={preventInvalidDecimalKey}
                  disabled={!isEditing}
                  required
                  maxLength={getDecimalMax()}
                />
                <FieldRenderer
                  label="Standard  Factory Overhead"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={form.stdOverhead}
                  onChange={(val) => setDecimalField("stdOverhead", val)}
                  onBlur={() => formatDecimalField("stdOverhead")}
                  onKeyDown={preventInvalidDecimalKey}
                  disabled={!isEditing}
                  required
                  maxLength={getDecimalMax()}
                />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[320px]">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
        </div>

        <div className="global-tran-table-main-div-ui relative mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <SearchGlobalReferenceTable
            docType="Work Center"
            columns={columns}
            data={workCenters}
            itemsPerPage={200}
            showFilters
            onRowDoubleClick={handleEdit}
            selectedRow={selectedRow}
            onRowClick={(row) => setSelectedRow(row)}
            isLoading={workCenterListQuery.isLoading}
            onRefresh={() => workCenterListQuery.refetch()}
            onMobileRowOpen={openMobileActionSheet}
          />
        </div>
      </div>

      {isMobileActionSheetMounted && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              isMobileActionSheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileActionSheet}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 transform transition-transform duration-300 ease-out ${
              isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.wcCode} - {selectedMobileRow?.wcName}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleEdit(selectedMobileRow)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                type="button"
              >
                <FontAwesomeIcon icon={faEdit} /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(selectedMobileRow);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                type="button"
              >
                <FontAwesomeIcon icon={faTrashAlt} /> Delete
              </button>
              <button
                onClick={closeMobileActionSheet}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors mt-2"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdWorkCenter;
