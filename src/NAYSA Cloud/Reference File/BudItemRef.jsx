import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Lookup / Table
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// Icons & Globals
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
  faMagnifyingGlass,
  faTimes,
  faSpinner,
  faSearch,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";
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
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

// UI Helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

const INITIAL_FORM = {
  code: "",
  description: "",
  budgetGroup: "N",
  groupCode: "",
  groupName: "",
  clearanceReq: "N",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const YES_NO_NO_FIRST = [
  { value: "N", label: "No" },
  { value: "Y", label: "Yes" },
];

const YES_NO_YES_FIRST = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const parseSqlJsonResult = (payload, fallback = []) => {
  const row = payload?.data?.data?.[0] || payload?.data?.[0] || payload?.data || payload;
  const raw = row?.result || row?.RESULT || Object.values(row || {})?.[0];

  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const parseResultFlag = (response) => {
  const sqlRow = response?.data?.data?.[0] || response?.data?.[0] || response?.data;
  const raw = sqlRow?.result || sqlRow?.RESULT || Object.values(sqlRow || {})?.[0];

  if (raw === "1" || raw === 1) return "1";
  if (raw === "0" || raw === 0) return "0";

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return String(parsed?.result ?? "0");
  } catch {
    return "0";
  }
};

const yesNoText = (value) => (String(value || "").toUpperCase() === "Y" ? "Yes" : "No");

const SearchBudgetItemGroup = ({
  isOpen,
  onClose,
  rows = [],
  excludeCode = "",
  title = "Search Budget Item Group",
}) => {
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    code: "",
    description: "",
  });

  const normalizedExcludeCode = String(excludeCode || "").trim().toUpperCase();

  const groupRows = useMemo(
    () =>
      (rows || []).filter((row) => {
        const code = String(row?.code || "").trim().toUpperCase();
        const budgetGroup = String(row?.budgetGroup || "").trim().toUpperCase();
        const active = String(row?.active || "").trim().toUpperCase();

        return budgetGroup === "Y" && active === "Y" && code !== normalizedExcludeCode;
      }),
    [rows, normalizedExcludeCode]
  );

  const hasActiveFilters = Object.values(filters).some((val) => val !== "");

  const resetFilters = () =>
    setFilters({
      code: "",
      description: "",
    });

  useEffect(() => {
    if (!isOpen) {
      setFiltered([]);
      resetFilters();
      return;
    }

    setFiltered(groupRows);
  }, [isOpen, groupRows]);

  useEffect(() => {
    const newFiltered = groupRows.filter((item) => {
      const code = String(item?.code || "").toLowerCase();
      const description = String(item?.description || "").toLowerCase();

      return (
        code.includes(String(filters.code || "").toLowerCase()) &&
        description.includes(String(filters.description || "").toLowerCase())
      );
    });

    setFiltered(newFiltered);
  }, [filters, groupRows]);

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
          </div>

          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}

            <button
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {!rows ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <span className="text-sm font-medium">Loading budget item group...</span>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { label: "Group Code", key: "code", width: "w-[150px]" },
                    { label: "Group Name", key: "description" },
                  ].map((col) => (
                    <th key={col.key} className={`global-lookup-th-ui ${col.width || ""}`}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="global-lookup-th-text-ui">{col.label}</span>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={filters[col.key]}
                          onChange={(e) => handleFilterChange(e, col.key)}
                          placeholder="Filter..."
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((row, index) => (
                    <tr
                      key={row.code || index}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => onClose(row)}
                    >
                      <td className="global-lookup-td-ui font-bold">{row.code}</td>
                      <td className="global-lookup-td-ui">{row.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-4 py-20 text-center text-slate-400 italic text-sm">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <div className="flex flex-col">
            <span className="global-lookup-footer-records-text-ui">
              Total Records: {filtered.length}
            </span>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .custom-scrollbar {
          scrollbar-width: auto;
          scrollbar-color: #cbd5e1 transparent;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 12px; height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; border: 3px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

const BudItemRef = () => {
  const queryClient = useQueryClient();
  const { user, currentUserRow } = useAuth();

  const docType = "BudItemRef";
  const documentTitle = reftables?.[docType] || "Budget Codes";
  const guideRef = useRef(null);
  const formTopRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[docType];
  const videoLink = reftablesVideoGuide?.[docType];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const [groupLookupOpen, setGroupLookupOpen] = useState(false);

  // Mobile Action Sheet State
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  const activeUserCode =
    user?.USER_CODE ||
    user?.userCode ||
    currentUserRow?.userCode ||
    currentUserRow?.USER_CODE ||
    "ADMIN";

  const { data: budItemRefs = [], isLoading: isListLoading } = useQuery({
    queryKey: ["budItemRefList"],
    queryFn: async () => {
      const response = await apiClient.get("/budItemRef");
      return parseSqlJsonResult(response, []);
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  const { mutate: saveBudItemRef, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertBudItemRef", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      const errorcount = Number(sqlRow?.errorcount ?? sqlRow?.errorCount ?? 0);
      const errormsg = sqlRow?.errormsg || sqlRow?.errorMsg || "";

      if (errorcount > 0) {
        useSwalErrorAlert("Error", errormsg || "Failed to save Budget Item.");
        return;
      }

      if (response?.data?.success === false) {
        useSwalErrorAlert("Error", response?.data?.message || "Failed to save Budget Item.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["budItemRefList"] });
      useSwalSuccessAlert("Success!", "Budget Item saved successfully!");
      resetForm();
    },
    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
    },
  });

  const { mutate: deleteBudItemRef, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteBudItemRef", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      const errorcount = Number(sqlRow?.errorcount ?? sqlRow?.errorCount ?? response?.data?.errorcount ?? 0);
      const errormsg = sqlRow?.errormsg || sqlRow?.errorMsg || response?.data?.errormsg || response?.data?.message || "";

      if (errorcount > 0 || response?.data?.success === false) {
        useSwalErrorAlert("Delete Error", errormsg || "Failed to delete Budget Item.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["budItemRefList"] });
      useSwalDeleteRecord("Deleted!", "The Budget Item has been successfully removed.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const getMax = (col) => useGetFieldLength(tblFieldArray, col) || 100;

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const getBudgetNameByCode = (code) => {
    const cleanCode = String(code || "").trim().toUpperCase();

    if (!cleanCode) return "";

    return (
      (budItemRefs || []).find(
        (row) => String(row?.code || "").trim().toUpperCase() === cleanCode
      )?.description || ""
    );
  };

  const displayGroupValue = formData.groupCode
    ? `(${formData.groupCode}) - ${formData.groupName || getBudgetNameByCode(formData.groupCode) || ""}`
    : "";

  const openMobileActionSheet = (row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);

    requestAnimationFrame(() => {
      setIsMobileActionSheetOpen(true);
    });
  };

  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);

    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  };

  const handleCheckDuplicate = async (code) => {
    if (selectedCode || !code) return;

    try {
      const clean = String(code || "").trim().toUpperCase();
      if (!clean) return;

      const response = await apiClient.post("/checkBudItemRefDuplicate", {
        json_data: { code: clean },
      });

      if (parseResultFlag(response) === "1") {
        updateForm({ code: "" });
        return useSwalErrorAlertAPI(
          `Duplicate Code: ${clean}`,
          "This code is already in use. Please enter a unique code."
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    }
  };

  const handleBudgetGroupChange = (value) => {
    const cleanValue = String(value || "N").toUpperCase() === "Y" ? "Y" : "N";

    updateForm({
      budgetGroup: cleanValue,
      groupCode: cleanValue === "Y" ? "" : formData.groupCode,
      groupName: cleanValue === "Y" ? "" : formData.groupName,
    });

    if (cleanValue === "Y") {
      setGroupLookupOpen(false);
    }
  };

  const handleGroupLookupClose = (selectedGroup) => {
    if (selectedGroup) {
      updateForm({
        groupCode: selectedGroup.code || "",
        groupName: selectedGroup.description || "",
      });
    }

    setGroupLookupOpen(false);
  };

  const handleSave = async () => {
    const cleanCode = String(formData.code || "").trim().toUpperCase();
    const cleanDescription = String(formData.description || "").trim();
    const cleanBudgetGroup = String(formData.budgetGroup || "N").trim().toUpperCase() === "Y" ? "Y" : "N";
    const cleanGroupCode = cleanBudgetGroup === "Y" ? "" : String(formData.groupCode || "").trim().toUpperCase();
    const cleanClearanceReq = String(formData.clearanceReq || "N").trim().toUpperCase() === "Y" ? "Y" : "N";
    const cleanActive = String(formData.active || "Y").trim().toUpperCase() === "N" ? "N" : "Y";

    if (!cleanCode || !cleanDescription) {
      return useSwalErrorAlert("Validation Error", "Budget Code and Budget Name are required.");
    }

    if (cleanCode.length > getMax("BUDGET_CODE")) {
      return useSwalValidationAlert({
        icon: "warning",
        title: "Length Error",
        message: `Budget Code cannot exceed ${getMax("BUDGET_CODE")} characters.`,
      });
    }

    if (cleanDescription.length > getMax("BUDGET_NAME")) {
      return useSwalValidationAlert({
        icon: "warning",
        title: "Length Error",
        message: `Budget Name cannot exceed ${getMax("BUDGET_NAME")} characters.`,
      });
    }

    if (cleanGroupCode && cleanGroupCode === cleanCode) {
      return useSwalErrorAlert("Validation Error", "Group Code cannot be the same as Budget Code.");
    }

    if (!selectedCode) {
      try {
        setIsLoadingAction(true);
        const checkRes = await apiClient.post("/checkBudItemRefDuplicate", {
          json_data: { code: cleanCode },
        });

        if (parseResultFlag(checkRes) === "1") {
          return useSwalErrorAlert("Duplicate Error", `The Budget Code ${cleanCode} is already used.`);
        }
      } catch (error) {
        console.error("Validation Error:", error);
      } finally {
        setIsLoadingAction(false);
      }
    }

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          code: cleanCode,
          description: cleanDescription,
          budgetGroup: cleanBudgetGroup,
          groupCode: cleanGroupCode,
          clearanceReq: cleanClearanceReq,
          active: cleanActive,
          userCode: activeUserCode,
        },
      }),
    };

    saveBudItemRef(payload);
  };

  const handleDelete = async (row) => {
    try {
      setIsLoadingAction(true);

      const checkResp = await apiClient.post("/checkBudItemRefInUsed", {
        json_data: { code: row.code },
      });

      if (parseResultFlag(checkResp) === "1") {
        return useSwalErrorAlertAPI("Cannot Delete", `Budget Item "${row.code}" is in use.`);
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Budget Item: ${row.code}?`
      );

      if (confirm.isConfirmed) {
        deleteBudItemRef({
          json_data: {
            code: row.code,
            description: row.description || "",
            userCode: activeUserCode,
          },
        });
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setIsEditing(false);
    setSelectedCode(null);
    setGroupLookupOpen(false);

    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleEdit = (row) => {
    const cleanBudgetGroup = String(row.budgetGroup || "N").toUpperCase() === "Y" ? "Y" : "N";
    const cleanGroupCode = cleanBudgetGroup === "Y" ? "" : row.groupCode || "";

    setFormData({
      code: row.code || "",
      description: row.description || "",
      budgetGroup: cleanBudgetGroup,
      groupCode: cleanGroupCode,
      groupName: cleanGroupCode ? getBudgetNameByCode(cleanGroupCode) : "",
      clearanceReq: String(row.clearanceReq || "N").toUpperCase() === "Y" ? "Y" : "N",
      active: String(row.active || "Y").toUpperCase() === "N" ? "N" : "Y",
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });

    setSelectedCode(row.code);
    setIsEditing(true);
    closeMobileActionSheet();

    setTimeout(() => {
      if (formTopRef.current) {
        const yOffset = -80;
        const y = formTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 150);
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 100,
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
                } else {
                  handleEdit(row);
                }
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
                } else {
                  handleDelete(row);
                }
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "code", label: "Budget Code", sortable: true, width: 140, requiredVisible: true },
      { key: "description", label: "Budget Name", sortable: true, width: 300, maxWidth: 400, requiredVisible: true },
      {
        key: "budgetGroup",
        label: "Budget Group",
        sortable: true,
        width: 130,
        render: (row) => yesNoText(row.budgetGroup),
      },
      { key: "groupCode", label: "Group Code", sortable: true, width: 140 },
      {
        key: "clearanceReq",
        label: "Clearance Required",
        sortable: true,
        width: 160,
        render: (row) => yesNoText(row.clearanceReq),
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        render: (row) => yesNoText(row.active),
      },
    ],
    [isMobile, formData, budItemRefs]
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (isEditing && !isSaving && !isLoadingAction) handleSave();
      }
    };

    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [formData, isEditing, isSaving, isLoadingAction]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await useFieldLenghtCheck("BUDITEM_REF");
        if (mounted) setTblFieldArray(res || []);
      } catch (err) {
        console.error("Failed to fetch field lengths:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || isDeleting || isLoadingAction) && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-semibold animate-pulse">
              {isSaving ? "Saving..." : isDeleting ? "Deleting..." : "Loading..."}
            </span>
          </div>
        </div>
      )}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {documentTitle}
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
                      label: <span className="sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: () => {
                        resetForm();
                        setIsEditing(true);
                      },
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: <span className="sm:inline ml-1">Save</span>,
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving || isLoadingAction,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                        ${
                          !isEditing || isSaving || isLoadingAction
                            ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`,
                    },
                    {
                      key: "reset",
                      label: <span className="sm:inline ml-1">Reset</span>,
                      icon: faUndo,
                      onClick: resetForm,
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
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="sm:inline ml-1 text-[11px] font-medium">Info</span>
                  <FontAwesomeIcon icon={faChevronDown} className="hidden sm:inline text-[10px] opacity-80" />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        if (videoLink) window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={formTopRef} className="mt-28 md:mt-24 px-4 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <FieldRenderer
                label="Budget Code"
                required
                value={formData.code}
                disabled={!isEditing || !!selectedCode}
                onChange={(v) => updateForm({ code: (v || "").toUpperCase() })}
                onBlur={(e) => handleCheckDuplicate(e.target.value)}
                maxLength={getMax("BUDGET_CODE")}
              />

              <FieldRenderer
                label="Budget Name"
                required
                value={formData.description}
                disabled={!isEditing}
                onChange={(v) => updateForm({ description: v || "" })}
                maxLength={getMax("BUDGET_NAME")}
              />

              <FieldRenderer
                label="Group Code"
                type="lookup"
                value={displayGroupValue}
                disabled={!isEditing || formData.budgetGroup === "Y"}
                onLookup={() => setGroupLookupOpen(true)}
                readOnly
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FieldRenderer
                  label="Budget Group"
                  required
                  type="select"
                  value={formData.budgetGroup}
                  disabled={!isEditing}
                  options={YES_NO_NO_FIRST}
                  onChange={handleBudgetGroupChange}
                />

                <FieldRenderer
                  label="Clearance Required"
                  required
                  type="select"
                  value={formData.clearanceReq}
                  disabled={!isEditing}
                  options={YES_NO_NO_FIRST}
                  onChange={(v) => updateForm({ clearanceReq: v })}
                />

                <FieldRenderer
                  label="Active"
                  required
                  type="select"
                  value={formData.active}
                  disabled={!isEditing}
                  options={YES_NO_YES_FIRST}
                  onChange={(v) => updateForm({ active: v })}
                />
              </div>

              <FieldRenderer
                label="Group Name"
                value={formData.groupName}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="w-full xl:w-[320px] shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
        </div>

        <div className="global-tran-table-main-div-ui bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <SearchGlobalReferenceTable
            docType={docType}
            columns={columns}
            data={budItemRefs}
            isLoading={isListLoading}
            onRowDoubleClick={handleEdit}
            itemsPerPage={50}
            title="Budget Code Records"
            fileName={`BudgetCodes_Reference_${new Date().toISOString().split("T")[0]}`}
            onMobileRowOpen={openMobileActionSheet}
            autoFillGrid={true}
          />
        </div>
      </div>

      <SearchBudgetItemGroup
        isOpen={groupLookupOpen}
        onClose={handleGroupLookupClose}
        rows={budItemRefs}
        excludeCode={formData.code}
        title="Search Budget Item Group"
      />

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
              <h2 className="text-sm font-bold text-gray-800">Budget Item Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.code} {selectedMobileRow?.description ? `- ${selectedMobileRow.description}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleEdit(selectedMobileRow)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>

              <button
                onClick={() => {
                  handleDelete(selectedMobileRow);
                  closeMobileActionSheet();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 py-3 text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                Delete
              </button>

              <button
                onClick={closeMobileActionSheet}
                className="w-full rounded-lg bg-gray-100 text-gray-700 py-3 text-sm font-medium"
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

export default BudItemRef;
