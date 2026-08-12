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
  cutoffCode: "",
  cutoffName: "",
  fromDate: "",
  toDate: "",
  status: "O",
  tblFieldArray: [],
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const CutoffRef = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const docType = "CutoffRef";
  const guideRef = useRef(null);
  const formTopRef = useRef(null); // <-- Added for smooth scroll
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCutoffCode, setSelectedCutoffCode] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(), // Defaults to current year (e.g., "2026")
  );

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


  const toggleModal = (name, isOpen) =>
    setModals((prev) => ({ ...prev, [name]: isOpen }));

  const { data: accounts = [], isLoading: isListLoading } = useQuery({
    queryKey: ["cutoffList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/cutOff");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

const handleCodeChange = (v) => {
    // 1. Strictly enforce 6-digit limit during typing
    if (v.length > 6) return;

    const updates = { cutoffCode: v };

    if (/^\d{6}$/.test(v)) {
      const yearStr = v.substring(0, 4);
      const monthStr = v.substring(4, 6);
      
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1;

      // Local formatting helper to avoid UTC timezone shifts
      const formatLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      // --- NEW: Handle Period 13 ---
      if (monthStr === "13") {
        updates.cutoffName = `MONTH 13 ${year}`; // Feel free to change this label
        updates.fromDate = `${yearStr}-12-31`;
        updates.toDate = `${yearStr}-12-31`;
      } 
      // --- Existing logic for Months 01 to 12 ---
      else if (month >= 0 && month <= 11) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const monthName = startDate
          .toLocaleString("default", { month: "long" })
          .toUpperCase();
        updates.cutoffName = `${monthName} ${year}`;
        updates.fromDate = formatLocal(startDate); 
        updates.toDate = formatLocal(endDate); 
      }
    }
    updateForm(updates);
  };

  const filteredAccounts = useMemo(() => {
    if (!selectedYear) return accounts; // Show all if input is cleared
    return accounts.filter((item) => {
      // Matches the start of the cutoffCode with your typed year
      return item.cutoffCode?.startsWith(selectedYear);
    });
  }, [accounts, selectedYear]);

  const yearOptions = useMemo(() => {
    // Extract the first 4 digits from all available cutoffCodes
    const yearsInData = accounts.map((item) =>
      item.cutoffCode?.substring(0, 4),
    );

    // Create a unique, sorted list of years
    const uniqueYears = [...new Set(yearsInData)]
      .filter((year) => year && year.length === 4)
      .sort((a, b) => b - a);

    return uniqueYears.map((year) => ({
      value: year,
      label: year,
    }));
  }, [accounts]);

  // --- TANSTACK QUERY: Save Mutation ---
  const { mutate: saveCutOff, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/upsertCutOff", payload),

    onSuccess: (response) => {
      // 1) SPROC row style (errorcount/errormsg)
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert(
          "Error",
          sqlRow?.errormsg || "Failed to save Cutt Off.",
        );
        resetForm(); // ✅ reset on failure
        return;
      }

      // 2) API status style
      const status = response?.data?.status ?? response?.data?.data?.status;
      const success =
        response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Cut Off.",
        );
        resetForm(); // ✅ reset on failure
        return;
      }
      console.log("Save Payload:", sqlRow);

      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["cutoffList"] });
      useSwalSuccessAlert("Success!", "Cut Off saved successfully!");
      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status
          ? `HTTP ${error.response.status}`
          : error?.message || String(error),
      );
      resetForm(); // ✅ reset on request error too
    },
  });

  // --- ACTIONS ---
  const handleSave = async () => {
    // 1. Basic Validations
    if (!formData.cutoffCode || !formData.fromDate || !formData.toDate) {
      return useSwalErrorAlert("Validation Error", "All fields are required.");
    }

    // --- DATE MATCHING VALIDATION ---
    // Extract Years
    const codeYear = formData.cutoffCode.substring(0, 4);
    const startYear = formData.fromDate.substring(0, 4);
    const endYear = formData.toDate.substring(0, 4);

    // Extract Months (YYYYMM for code, YYYY-MM-DD for dates)
    const codeMonth = formData.cutoffCode.substring(4, 6);
    const startMonth = formData.fromDate.substring(5, 7);
    const endMonth = formData.toDate.substring(5, 7);

    // Validate Year
    if (codeYear !== startYear || codeYear !== endYear) {
      return useSwalErrorAlert(
        "Invalid Dates",
        `The Start and End Date years must match the first 4 digits of the Cut Off Code (${codeYear}).`
      );
    }

 const isPeriod13Valid = codeMonth === "13" && startMonth === "12" && endMonth === "12";
    
    if (!isPeriod13Valid && (codeMonth !== startMonth || codeMonth !== endMonth)) {
      return useSwalErrorAlert(
        "Invalid Dates",
        `The Start and End Date months must match the last 2 digits of the Cut Off Code (${codeMonth}), except for Period 13 which uses December (12).`
      );
    }
    // --------------------------------

    // 2. Date Range Validation
    const start = new Date(formData.fromDate);
    const end = new Date(formData.toDate);
    if (start > end) {
      return useSwalErrorAlert(
        "Invalid Date Range",
        "Start Date cannot be later than End Date.",
      );
    }

    // 3. Final Duplicate Check for New Records
    if (!selectedCutoffCode) {
      try {
        setIsLoading(true);
        const payloadCheck = { json_data: { cutoffCode: formData.cutoffCode } };
        const checkRes = await apiClient.post(
          "/checkDuplicateCutOff",
          payloadCheck,
        );

        const sqlRow = checkRes?.data?.data?.[0];
        const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
        const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

        if (parsedData.result === "1") {
          setIsLoading(false);
          return useSwalErrorAlert(
            "Duplicate Error",
            `The Cut Off Code ${formData.cutoffCode} is already used.`,
          );
        }
      } catch (error) {
        console.error("Validation Error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // 4. Proceed with Save
    const payload = {
      json_data: {
        cutoffCode: formData.cutoffCode,
        cutoffName: formData.cutoffName,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        status: formData.status,
        userCode: user?.USER_CODE || "ADMIN",
      },
    };

    saveCutOff(payload);
  };


  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setIsEditing(false);
    setSelectedCutoffCode(null); 

    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleEdit = (row) => {
    // Clean dates for HTML5 input (YYYY-MM-DD)
    const formattedFromDate = row.fromDate ? row.fromDate.substring(0, 10) : "";
    const formattedToDate = row.toDate ? row.toDate.substring(0, 10) : "";

    setFormData({
      ...INITIAL_FORM,
      ...row, 
      fromDate: formattedFromDate,
      toDate: formattedToDate,
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate,
    });

    setSelectedCutoffCode(row.cutoffCode);
    setIsEditing(true);
    closeMobileActionSheet(); 

    // Smooth scroll to form
    setTimeout(() => {
      if (formTopRef.current) {
        const yOffset = -80; 
        const y = formTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 150);

    //    if (formTopRef.current) {
    //   formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // }

  };

  const { mutate: deleteCutoff, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/deleteCutOff", payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["cutoffList"]);
      useSwalDeleteRecord(
        "Cut Off Deleted!",
        "The cut off code has been successfully removed.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const handleDelete = async (row) => {
  if (row.status === "C") {
    return useSwalErrorAlert(
      "Cannot Delete",
      `Cut Off Code ${row.cutoffCode} is currently CLOSED and cannot be deleted.`,
    );
  }

  try {
    setIsLoading(true);

    const payload = {
      json_data: {
        cutoffCode: row.cutoffCode,
      },
    };

    const response = await apiClient.post("/checkInUsedCutOff", payload);

    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (parsedData.result === "1") {
      return useSwalErrorAlert(
        "Cannot Delete",
        `Cut Off Code ${row.cutoffCode} was already used.`,
      );
    }

    const confirm = await useSwalDeleteConfirm(
      "Confirm Delete",
      `Are you sure you want to delete Code: ${row.cutoffCode}?`,
    );

    if (confirm.isConfirmed) {
      deleteCutoff(payload);
    }
  } catch (error) {
    useSwalErrorAlertAPI(
      "System Error",
      error?.response?.data?.message || error?.message || "Delete check failed.",
    );
  } finally {
    setIsLoading(false);
  }
};

  // --- VALIDATION: Check for Duplicate Code ---
  const handleCheckDuplicate = async (code) => {
    if (selectedCutoffCode) return;
    if (!code) return;

    try {
      const payload = { json_data: { cutoffCode: code } };
      const response = await apiClient.post("/checkDuplicateCutOff", payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        updateForm({ cutoffCode: "" });
        setIsLoading(false);
        return useSwalErrorAlertAPI(
          `Duplicate Cut off Code: ${code}`,
          `This code is already in use. Please enter a unique code.`,
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = (updates) =>
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));

  // --- TABLE COLUMNS ---
  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 90,
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
      { key: "cutoffCode", label: "Cut Off Code", sortable: true, width: 120, requiredVisible: true },
      { key: "cutoffName", label: "Cut Off Name", sortable: true, width: 185, maxWidth: 185, requiredVisible: true },
      {
        key: "fromDate",
        label: "Start Date",
        sortable: true,
        render: (row) => {
          if (!row.fromDate) return "";
          const [year, month, day] = row.fromDate.substring(0, 10).split("-");
          return `${month}/${day}/${year}`;
        },
      },
      {
        key: "toDate",
        label: "End Date",
        sortable: true,
        render: (row) => {
          if (!row.toDate) return "";
          const [year, month, day] = row.toDate.substring(0, 10).split("-");
          return `${month}/${day}/${year}`;
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (row) => {
          const statusMap = {
            O: <span className="text-blue-600 font-medium">Open</span>,
            C: <span className="text-red-600 font-medium">Closed</span>,
          };
          return statusMap[row.status] || row.status;
        },
      },
    ],
    [isMobile],
  );


  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
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
  }, [formData]);

  // load max length metadata once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await useFieldLenghtCheck("CUTOFF_REF");
      if (mounted) setTblFieldArray(res || []);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || isDeleting) && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-semibold animate-pulse">
              {isSaving
                ? "Saving..."
                : isDeleting
                  ? "Deleting..."
                  : "Loading..."}
            </span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {reftables[docType] || "Cut Off Codes"}
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

                        // 1. Find the highest existing Cut Off Code
                        if (accounts.length > 0) {
                          const maxCode = Math.max(
                            ...accounts.map((item) => parseInt(item.cutoffCode)),
                          );
                          const codeStr = maxCode.toString();

                          let year = parseInt(codeStr.substring(0, 4));
                          let month = parseInt(codeStr.substring(4, 6));

                          // 2. Increment Month logic
                          if (month === 12) {
                            month = 1;
                            year += 1;
                          } else {
                            month += 1;
                          }

                          // 3. Format back to YYYYMM (with leading zero for month)
                          const nextCode = `${year}${String(month).padStart(2, "0")}`;

                          // 4. Trigger handleCodeChange to auto-fill Name and Dates
                          handleCodeChange(nextCode);
                        }
                      },
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: <span className="sm:inline ml-1">Save</span>,
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${!isEditing || isSaving ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
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
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
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
                      onClick={() => window.open(pdfLink, "_blank")}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />{" "}
                      PDF Guide
                    </button>
                    <button
                      onClick={() => window.open(videoLink, "_blank")}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
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
            </div>
          </div>
        </div>
      </div>

      {/* SIDE-BY-SIDE LAYOUT */}
      <div ref={formTopRef} className="mt-24 flex flex-col xl:flex-row gap-4 px-4 h-auto xl:h-[calc(100vh-130px)]">
        <div className="w-full xl:w-[400px] flex flex-col gap-4 h-fit shrink-0">
          
          {/* Entry Details Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
            <h2 className="text-sm font-bold text-blue-600 mb-6 uppercase tracking-wider border-b pb-2 flex justify-between items-center">
              Entry Details
              <div className="flex items-center gap-2">
                <div className="w-28 relative">
                  <FieldRenderer
                    type="text"
                    placeholder="Search Year..."
                    value={selectedYear}
                    onChange={(v) => {
                      // Allow only numbers and limit to 4 digits
                      const numericValue = v.replace(/\D/g, "").slice(0, 4);
                      setSelectedYear(numericValue);
                    }}
                    className="!h-8 !text-[12px] border-blue-600 focus:ring-blue-500 rounded-md pr-6 font-bold"
                  />
                  {/* {selectedYear && (
                    <button
                      onClick={() => setSelectedYear("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-[10px]"
                    >
                      ✕
                    </button>
                  )} */}
                </div>
              </div>
            </h2>

            <div className="space-y-6">
              <FieldRenderer
                label="Cut Off Code"
                required
                type="text"
                value={formData.cutoffCode || ""}
                disabled={!isEditing || !!selectedCutoffCode} // Field is locked during edit
                onChange={(v) => handleCodeChange(v)}
                onBlur={(e) => handleCheckDuplicate(e.target.value)} 
                maxLength={getMax("CUTOFF_CODE")}
              />
              <FieldRenderer
                label="Cut Off Name"
                required
                type="text"
                value={formData.cutoffName || ""}
                disabled={!isEditing}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, cutoffName: v }))
                }
                maxLength={getMax("CUTOFF_NAME")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRenderer
                  label="Start Date"
                  required
                  type="date"
                  value={formData.fromDate || ""}
                  disabled={!isEditing}
                  max="9999-12-31" 
                  onChange={(v) => {
                    if (v && v.split('-')[0].length > 4) return;
                    updateForm({ fromDate: v });
                  }}
                  maxLength={getMax("FROM_DATE")}
                />
                <FieldRenderer
                  label="End Date"
                  required
                  type="date"
                  value={formData.toDate || ""}
                  disabled={!isEditing}
                  max="9999-12-31" 
                  onChange={(v) => {
                    if (v && v.split('-')[0].length > 4) return;
                    updateForm({ toDate: v });
                  }}
                  maxLength={getMax("TO_DATE")}
                />
              </div>
              <FieldRenderer
                label="Status"
                required
                type="select"
                value={formData.status || ""}
                disabled={!isEditing}
                onChange={(v) => updateForm({ status: v })}
                options={[
                  { value: "O", label: "Open" },
                  { value: "C", label: "Closed" },
                ]}
              />
            </div>
          </div>

          {/* Registration Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 xl:mb-0">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
        </div>

        {/* RIGHT SIDE: Global Reference Table */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col mt-0">
          <SearchGlobalReferenceTable
            columns={columns}
            data={filteredAccounts}
            isLoading={isListLoading}
            docType="Cut Off Codes"
            fileName={`Cutoff_Reference_${selectedYear}_${new Date().toISOString().split("T")[0]}`}
            title="Cut off Reference Records"
            tableSize="Full"
            onRowDoubleClick={handleEdit}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["cutoffList"] })}
            onMobileRowOpen={openMobileActionSheet}
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
              <h2 className="text-sm font-bold text-gray-800">Cut Off Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.cutoffCode} {selectedMobileRow?.cutoffName ? `- ${selectedMobileRow.cutoffName}` : ""}
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

export default CutoffRef;