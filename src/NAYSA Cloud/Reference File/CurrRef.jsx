import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Import Lookup Modals
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
  currCode: "",
  currName: "",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const CurrRef = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const docType = "Currency"; 
  const guideRef = useRef(null);
  const formTopRef = useRef(null); 
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCurrCode, setSelectedCurrCode] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  // --- Mobile Action Sheet State ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // --- TANSTACK QUERY: Fetch List ---
  const { data: accounts = [], isLoading: isListLoading } = useQuery({
    queryKey: ["currencyList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/curr");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  // --- TANSTACK QUERY: Save Mutation ---
  const { mutate: saveCurrency, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertCurr", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save Currency.");
        resetForm();
        return;
      }

      const status = response?.data?.status ?? response?.data?.data?.status;
      const success = response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message || response?.data?.data?.message || "Failed to save Currency."
        );
        resetForm();
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["currencyList"] });
      useSwalSuccessAlert("Success!", "Currency Code saved successfully!");
      resetForm();
    },
    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
      resetForm();
    },
  });

  // --- TANSTACK QUERY: Delete Mutation ---
  const { mutate: deleteCurrency, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteCurr", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["currencyList"]);
      useSwalDeleteRecord("Deleted!", "The currency has been successfully removed.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // --- ACTIONS ---
  const handleSave = async () => {
    // 1. Basic Validations
    if (!formData.currCode || !formData.currName) {
      return useSwalErrorAlert("Validation Error", "All fields are required.");
    }

    if (formData.currCode.length > getMax("CURR_CODE")) {
        return useSwalValidationAlert("Length Error", `Code cannot exceed ${getMax("CURR_CODE")} characters.`);
    }

    // 2. Final Duplicate Check for New Records
    if (!selectedCurrCode) {
      try {
        // setIsLoadingAction(true);
        const checkRes = await apiClient.post("/checkDuplicateCurr", {
          json_data: { currCode: formData.currCode },
        });

        const sqlRow = checkRes?.data?.data?.[0] || checkRes?.data;
        const parsedData = typeof sqlRow?.result === 'string' ? JSON.parse(sqlRow?.result) : sqlRow;
        
        if (parsedData?.result === "1" || sqlRow?.result === "1") {
          setIsLoadingAction(false);
          return useSwalErrorAlert("Duplicate Error", `The Code ${formData.currCode} is already used.`);
        }
      } catch (error) {
        console.error("Validation Error:", error);
      } finally {
        setIsLoadingAction(false);
      }
    }

    // 3. Proceed with Save
    const payload = {
      json_data: {
        currCode: formData.currCode,
        currName: formData.currName,
        active: formData.active || "Y",
        userCode: user?.USER_CODE || "ADMIN",
      },
    };

    saveCurrency(payload);
  };

  const handleDelete = async (row) => {
    try {
      setIsLoadingAction(true);
      
      // 1. Check if in use
      const checkResp = await apiClient.post("/checkInUsedCurr", { 
        json_data: { currCode: row.currCode } 
      });
      
      const sqlRow = checkResp?.data?.data?.[0] || checkResp?.data;
      if (sqlRow?.isInUsed || sqlRow?.result === "1" || JSON.parse(sqlRow?.result || '{"result":"0"}').result === "1") {
        setIsLoadingAction(false);
        return useSwalErrorAlertAPI("Cannot Delete", `Currency "${row.currCode}" is in use.`);
      }

      // 2. Confirmations
      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Currency: ${row.currCode}?`
      );

      if (confirm.isConfirmed) {
        deleteCurrency({
          json_data: { currCode: row.currCode, userCode: user?.USER_CODE || "ADMIN" },
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
    setSelectedCurrCode(null);

    // Optional: Also scroll to top on reset
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleEdit = (row) => {
    setFormData({
      currCode: row.currCode || "",
      currName: row.currName || "",
      active: row.active || "Y",
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate,
    });

    setSelectedCurrCode(row.currCode);
    setIsEditing(true);
    closeMobileActionSheet(); 

    // Smooth scroll to the form area after a short delay to allow the sheet to close
    setTimeout(() => {
      if (formTopRef.current) {
        const yOffset = -80; 
        const y = formTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 150);
  };

  // --- VALIDATION: Check for Duplicate Code ---
  const handleCheckDuplicate = async (code) => {
    if (selectedCurrCode || !code) return;

    try {
      // setIsLoadingAction(true);
      const clean = code.trim().toUpperCase();
      const response = await apiClient.post("/checkDuplicateCurr", {
        json_data: { currCode: clean },
      });

      const sqlRow = response?.data?.data?.[0] || response?.data;
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = typeof rawJsonString === 'string' ? JSON.parse(rawJsonString) : rawJsonString;

      if (parsedData?.result === "1" || sqlRow?.result === "1") {
        updateForm({ currCode: "" });
        setIsLoadingAction(false);
        return useSwalErrorAlertAPI(
          `Duplicate Code: ${clean}`,
          `This code is already in use. Please enter a unique code.`
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  // --- TABLE COLUMNS ---
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
      { key: "currCode", label: "Currency Code", sortable: true, width: 100, requiredVisible: true },
      { key: "currName", label: "Currency Name", sortable: true, width: 400, maxWidth: 400, requiredVisible: true  },
    ],
    [isMobile]
  );

  // --- EFFECTS ---
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (isEditing && !isSaving && !isLoadingAction) handleSave();
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
  }, [formData, isEditing, isSaving, isLoadingAction]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await useFieldLenghtCheck("CURR_REF"); 
        if (mounted) setTblFieldArray(res || []);
      } catch (err) {
        console.error("Failed to fetch field lengths:", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col) || 100;

  return (
    <div className="global-ref-main-div-ui">
      {/* Loading Overlay */}
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

      {/* Header Section */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          
          {/* 1) Title */}
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {reftables[docType] || "Currency Reference"}
            </h1>
          </div>
          
          {/* Middle: spacer */}
          <div className="hidden md:flex justify-center w-full" />

          {/* 3) Buttons + Info */}
          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              
              {/* ButtonBar: allow wrapping on mobile */}
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

              {/* Info Dropdown */}
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
                      onClick={() => { window.open(pdfLink, "_blank"); setOpenGuide(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
                    </button>
                    <button
                      onClick={() => { window.open(videoLink, "_blank"); setOpenGuide(false); }}
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

      {/* Main Content Layout: Left (Form) / Right (Table) on large screens */}
      <div ref={formTopRef} className="mt-24 flex flex-col xl:flex-row gap-4 px-4 h-auto xl:h-[calc(100vh-130px)]">
        
        {/* LEFT PANEL: Form & Registration Info */}
        <div className="w-full xl:w-[400px] flex flex-col gap-4 h-fit shrink-0">
          
          {/* Form Fields */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg flex flex-col justify-center">
            <h2 className="text-sm font-bold text-blue-600 mb-6 uppercase tracking-wider border-b pb-2">
              Entry Details
            </h2>
            <div className="space-y-6">
              <FieldRenderer
                label="Currency Code"
                required
                type="text"
                value={formData.currCode}
                disabled={!isEditing || !!selectedCurrCode} 
                onChange={(v) => updateForm({ currCode: (v || "").toUpperCase() })}
                onBlur={(e) => handleCheckDuplicate(e.target.value)}
                maxLength={getMax("CURR_CODE")}
              />
              <FieldRenderer
                label="Currency Name"
                required
                type="text"
                value={formData.currName}
                disabled={!isEditing}
                onChange={(v) => updateForm({ currName: v || "" })}
                maxLength={getMax("CURR_NAME")}
              />
            </div>
          </div>

          {/* Registration Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
          
        </div>

        {/* RIGHT PANEL: Table */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col global-tran-table-main-div-ui mt-0">
          <SearchGlobalReferenceTable
            docType={docType}
            columns={columns}
            data={accounts}
            isLoading={isListLoading}
            onRowDoubleClick={handleEdit}
            itemsPerPage={50}
            onMobileRowOpen={openMobileActionSheet}
            autoFillGrid={true}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["currList"] })}
          />
        </div>

      </div>

      {/* Mobile Action Sheet Overlay */}
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
              <h2 className="text-sm font-bold text-gray-800">Currency Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.currCode} {selectedMobileRow?.currName ? `- ${selectedMobileRow.currName}` : ""}
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

export default CurrRef;