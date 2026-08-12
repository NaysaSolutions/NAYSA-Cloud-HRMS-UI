import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Lookup / Table
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";

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
  acctCode: "",
  acctName: "",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

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

const LCRef = () => {
  const queryClient = useQueryClient();
  const { user, currentUserRow } = useAuth();
  const docType = "LCRef";
  const documentTitle = reftables?.[docType] || "Shipment Cost Codes";
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
  const [coaLookupOpen, setCoaLookupOpen] = useState(false);

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

  // Fetch List
  const { data: lcRefs = [], isLoading: isListLoading } = useQuery({
    queryKey: ["lcRefList"],
    queryFn: async () => {
      const response = await apiClient.get("/lcRef");
      return parseSqlJsonResult(response, []);
    },
  });

  // Save Mutation
  const { mutate: saveLCRef, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertLCRef", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      const errorcount = Number(sqlRow?.errorcount ?? sqlRow?.errorCount ?? 0);
      const errormsg = sqlRow?.errormsg || sqlRow?.errorMsg || "";

      if (errorcount > 0) {
        useSwalErrorAlert("Error", errormsg || "Failed to save Shipment Cost Code.");
        return;
      }

      if (response?.data?.success === false) {
        useSwalErrorAlert("Error", response?.data?.message || "Failed to save Shipment Cost Code.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["lcRefList"] });
      useSwalSuccessAlert("Success!", "Shipment Cost Code saved successfully!");
      resetForm();
    },
    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
    },
  });

  // Delete Mutation
  const { mutate: deleteLCRef, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteLCRef", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lcRefList"] });
      useSwalDeleteRecord("Deleted!", "The Shipment Cost Code has been successfully removed.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const getMax = (col) => useGetFieldLength(tblFieldArray, col) || 100;

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

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

  const handleCheckDuplicate = async (code) => {
    if (selectedCode || !code) return;

    try {
      const clean = String(code || "").trim().toUpperCase();
      if (!clean) return;

      const response = await apiClient.post("/checkDuplicateLCRef", {
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

  const handleSave = async () => {
    const cleanCode = String(formData.code || "").trim().toUpperCase();
    const cleanDescription = String(formData.description || "").trim();

    if (!cleanCode || !cleanDescription) {
      return useSwalErrorAlert("Validation Error", "SC Code and SC Name are required.");
    }

    if (cleanCode.length > getMax("LC_CODE")) {
      return useSwalValidationAlert({
        icon: "warning",
        title: "Length Error",
        message: `Code cannot exceed ${getMax("LC_CODE")} characters.`,
      });
    }

    if (cleanDescription.length > getMax("LC_NAME")) {
      return useSwalValidationAlert({
        icon: "warning",
        title: "Length Error",
        message: `Description cannot exceed ${getMax("LC_NAME")} characters.`,
      });
    }

    if (!selectedCode) {
      try {
        setIsLoadingAction(true);
        const checkRes = await apiClient.post("/checkDuplicateLCRef", {
          json_data: { code: cleanCode },
        });

        if (parseResultFlag(checkRes) === "1") {
          return useSwalErrorAlert("Duplicate Error", `The Code ${cleanCode} is already used.`);
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
          acctCode: formData.acctCode || "",
          userCode: activeUserCode,
        },
      }),
    };

    saveLCRef(payload);
  };

  const handleDelete = async (row) => {
    try {
      setIsLoadingAction(true);

      const checkResp = await apiClient.post("/checkInUsedLCRef", {
        json_data: { code: row.code },
      });

      if (parseResultFlag(checkResp) === "1") {
        return useSwalErrorAlertAPI("Cannot Delete", `Shipment Cost Code "${row.code}" is in use.`);
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Shipment Cost Code: ${row.code}?`
      );

      if (confirm.isConfirmed) {
        deleteLCRef({
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
    setCoaLookupOpen(false);

    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleEdit = (row) => {
    setFormData({
      code: row.code || "",
      description: row.description || "",
      acctCode: row.acctCode || "",
      acctName: row.acctName || "",
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

  const handleCloseCOA = (selectedAccount) => {
    if (selectedAccount) {
      updateForm({
        acctCode: selectedAccount.acctCode || "",
        acctName: selectedAccount.acctName || "",
      });
    }

    setCoaLookupOpen(false);
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
      { key: "code", label: "SC Code", sortable: true, width: 120, requiredVisible: true },
      { key: "description", label: "SC Name", sortable: true, width: 300, maxWidth: 400, requiredVisible: true },
      { key: "acctCode", label: "Account Code", sortable: true, width: 130 },
      { key: "acctName", label: "Account Name", sortable: true, width: 300 },
    ],
    [isMobile, formData]
  );

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
        const res = await useFieldLenghtCheck("LC_REF");
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

      <div ref={formTopRef} className="mt-24 flex flex-col xl:flex-row gap-4 px-4 h-auto xl:h-[calc(100vh-130px)]">
        <div className="w-full xl:w-[400px] flex flex-col gap-4 h-fit shrink-0">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg flex flex-col justify-center">
            <h2 className="text-sm font-bold text-blue-600 mb-6 uppercase tracking-wider border-b pb-2">
              Entry Details
            </h2>
            <div className="space-y-6">
              <FieldRenderer
                label="SC Code"
                required
                type="text"
                value={formData.code}
                disabled={!isEditing || !!selectedCode}
                onChange={(v) => updateForm({ code: (v || "").toUpperCase() })}
                onBlur={(e) => handleCheckDuplicate(e.target.value)}
                maxLength={getMax("LC_CODE")}
              />

              <FieldRenderer
                label="SC Name"
                required
                type="text"
                value={formData.description}
                disabled={!isEditing}
                onChange={(v) => updateForm({ description: v || "" })}
                maxLength={getMax("LC_NAME")}
              />

              <div className="relative">
                <FieldRenderer
                  label="Account Code"
                  type="text"
                  value={formData.acctCode}
                  disabled
                  readOnly
                  maxLength={getMax("ACCT_CODE")}
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setCoaLookupOpen(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
                    title="Search Account Code"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                )}
              </div>

              <FieldRenderer
                label="Account Name"
                type="text"
                value={formData.acctName}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col global-tran-table-main-div-ui mt-0">
          <SearchGlobalReferenceTable
            docType={docType}
            columns={columns}
            data={lcRefs}
            isLoading={isListLoading}
            onRowDoubleClick={handleEdit}
            itemsPerPage={50}
            onMobileRowOpen={openMobileActionSheet}
            autoFillGrid={true}
          />
        </div>
      </div>

      {coaLookupOpen && (
        <COAMastLookupModal
          isOpen={coaLookupOpen}
          title="Select Account Code"
          customParam="ActiveAll"
          onClose={handleCloseCOA}
        />
      )}

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
              <h2 className="text-sm font-bold text-gray-800">Shipment Cost Code Actions</h2>
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

export default LCRef;
