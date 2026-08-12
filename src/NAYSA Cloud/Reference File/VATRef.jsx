import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Import Lookup Modals
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast";

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
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
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
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const INITIAL_FORM = {
  vatCode: "",
  vatName: "",
  vatType: "I",
  vatClass: "G",
  vatRate: "0.00",
  vatCategory: "V",
  acctCode: "",
  acctName: "",
  tblFieldArray: [],
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const VATRef = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const docType = "VATRef";
  const guideRef = useRef(null);
  const formTopRef = useRef(null); // <-- Added ref for smooth scrolling
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVatCode, setSelectedAcctCode] = useState(null);
  const [modals, setModals] = useState({ coaClass: false, guide: false });
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const [vatAcct, setvatAcct] = useState(null);

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

  // --- TANSTACK QUERY: Fetch Dropdowns & List ---
  const { data: dropdowns, isLoading: isDropdownLoading } = useQuery({
    queryKey: ["vatDropdowns"],
    queryFn: async () => {
      const [cat, typ, cls] = await Promise.all([
        useTopDocDropDown("VATREF", "VAT_CATEGORY"),
        useTopDocDropDown("VATREF", "VAT_TYPE"),
        useTopDocDropDown("VATREF", "VAT_CLASS"),
      ]);
      return { cat, typ, cls };
    },
  });

  const { data: accounts = [], isLoading: isListLoading } = useQuery({
    queryKey: ["vatList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/vat");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  // --- Updated Save Mutation ---
  const {
    mutate: saveVAT,
    isLoading: isSavingLegacy,
    isPending: isSavingPending,
  } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertVat", payload),

    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save VAT .");
        return; 
      }
      console.log("Save Response:", response);

      const status = response?.data?.status ?? response?.data?.data?.status;
      const success =
        response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "An error occurred while saving the VAT record.",           
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["vatList"] });
      useSwalSuccessAlert("Success!", "VAT Code saved successfully!");
      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
      resetForm(); // ✅ reset on request error too
    },
  });

  const isSaving = Boolean(isSavingPending || isSavingLegacy);

  // --- UPDATED ACTIONS ---
  const handleSave = () => {
    // if (!formData.vatCode || !formData.vatName || !formData.acctCode) {
    //   return useSwalErrorAlert(
    //     "Validation Error",
    //     "Please fill in all required fields.",
    //   );
    // }

    if (parseFloat(formData.vatRate) < 0) {
      return useSwalErrorAlert("Invalid Rate", "VAT Rate cannot be negative.");
    }

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          vatRate: formData.vatRate || "0.00", 
          action: selectedVatCode ? "EDIT" : "ADD",
          userCode: user?.USER_CODE || "ADMIN",
        },
      }),
    };
    saveVAT(payload);
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedAcctCode(null);
    setIsEditing(false);
    
    // Optional: Also scroll to top on reset
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleEdit = (row) => {
    const classNameFromRow = row.className;

    const classNameFromDropdown =
      dropdowns?.cls?.find((d) => d.DROPDOWN_CODE === row.classCode)
        ?.DROPDOWN_NAME || "";

    setSelectedAcctCode(row.vatCode);

    setFormData({
      ...INITIAL_FORM,
      ...row,
      classCode: row.classCode,
      acctName: row.acctName,
      className: classNameFromRow || classNameFromDropdown, 
      vatRate: row.vatRate !== undefined ? row.vatRate : 0,
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate,
    });

    console.log("Edit Row:", row);
    setIsEditing(true);
    closeMobileActionSheet(); 

    // <-- Added smooth scroll to the form area after a short delay to allow the sheet to close
    // setTimeout(() => {
    //   if (formTopRef.current) {
    //     // Adjust scroll position slightly higher if you have a sticky header
    //     const yOffset = -80; 
    //     const y = formTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
    //     window.scrollTo({ top: y, behavior: 'smooth' });
    //   }
    // }, 150);

    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

  };

  const {
    mutate: deleteVat,
    isLoading: isDeletingLegacy,
    isPending: isDeletingPending,
  } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteVat", payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["vatList"]);
      useSwalDeleteRecord(
        "Deleted!",
        "The VAT has been removed from the system.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });


  const isDeleting = Boolean(isDeletingPending || isDeletingLegacy);
  const handleDelete = async (row) => {
    try {
      setIsLoading(true); 
      const payload = {
        json_data: {
          vatCode: row.vatCode,
        },
      };

      const response = await apiClient.post("/checkInUsedVat", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        setIsLoading(false);
        return useSwalErrorAlertAPI(
          `Cannot Delete VAT Code: ${row.vatCode}`,
          `Code was already used.`,
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Code: ${row.vatCode}?`,
      );

      if (confirm.isConfirmed) {
        deleteVat(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- VALIDATION: Check for Duplicate Code ---
  const handleCheckDuplicate = async (code) => {
    if (selectedVatCode) return;
    if (!code) return;

    try {
      setIsLoading(true);
      const payload = { json_data: { vatCode: code } };
      const response = await apiClient.post("/checkDuplicateVat", payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        updateForm({ vatCode: "" });
        setIsLoading(false);
        return useSwalErrorAlert(
          "Duplicate VAT Code",
          `The VAT Code ${code} is already in use. Please enter a unique code.`,
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    } finally {
      setIsLoading(false);
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
      { key: "vatCode", label: "VAT Code", sortable: true, width: 100, minWidth: 100, requiredVisible: true },
      { key: "vatName", label: "VAT Name", sortable: true, width: 250, minWidth: 180, maxWidth: 300, requiredVisible: true },
      {
        key: "vatType",
        label: "VAT Type",
        sortable: true,
        width: 120,
        minWidth: 100, 
        render: (row) => {
          const match = dropdowns?.typ?.find(
            (d) => d.DROPDOWN_CODE === row.vatType,
          );
          return match ? match.DROPDOWN_NAME : row.vatType;
        },
      },
      {
        key: "vatClass",
        label: "VAT Classification",
        sortable: true,
        width: 150, 
        minWidth: 150, 
        render: (row) => {
          const match = dropdowns?.cls?.find(
            (d) => d.DROPDOWN_CODE === row.vatClass,
          );
          return match ? match.DROPDOWN_NAME : row.vatClass;
        },
      },
      {
        key: "vatRate",
        label: "VAT Rate (%)",
        sortable: true,
        className: "text-right",
        width: 110, 
        minWidth: 110, 
        render: (row) => {
          const rate = parseFloat(row.vatRate || 0);
          return `${rate.toFixed(2)}%`;
        },
      },
      {
        key: "vatCategory",
        label: "VAT Category",
        width: 150, 
        minWidth: 120, 
        sortable: true,
        render: (row) => {
          const match = dropdowns?.cat?.find(
            (d) => d.DROPDOWN_CODE === row.vatCategory,
          );
          return match ? match.DROPDOWN_NAME : row.vatCategory;
        },
      },
      { key: "acctCode", label: "Account Code", sortable: true, width: 120, minWidth: 120 },
      { key: "acctName", label: "Account Name", sortable: true, width: 200, minWidth: 120 },
    ],
    [dropdowns, isMobile], 
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
      const res = await useFieldLenghtCheck("VAT_REF");
      if (mounted) setTblFieldArray(res || []);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  
  const isPageLoading =
    isDropdownLoading ||
    isListLoading ||
    isSaving ||
    isDeleting ||
    isLoading;

  return (
    <div className="global-ref-main-div-ui">
      {isPageLoading && <LoadingSpinner />}

      {/* Header Section */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          
          {/* 1) Title */}
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {reftables[docType] || "VAT Refrence Table"}
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
                      disabled: !isEditing || isSaving,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                        ${
                          !isEditing || isSaving
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
                      onClick={() => {
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />{" "}
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
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

      {/* Main Content */}
      {/* Attached the ref to the top div of the form content so it scrolls properly */}
      <div ref={formTopRef} className="mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
        {/* LEFT DIV: Main Form Fields */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Sub-Column 1 */}
          <div className="space-y-6">
            <FieldRenderer
              label="VAT Code"
              required
              type="text"
              value={formData.vatCode}
              disabled={!isEditing || (isEditing && selectedVatCode)}
              onChange={(v) => updateForm({ vatCode: v })}
              onBlur={(e) => handleCheckDuplicate(e.target.value)}
              maxLength={getMax("VAT_CODE")}
            />

            <FieldRenderer
              label="VAT Name"
              required
              type="text"
              value={formData.vatName}
              disabled={!isEditing}
              onChange={(v) => updateForm({ vatName: v })}
              maxLength={getMax("VAT_NAME")}
            />

            <FieldRenderer
              label="VAT Type"
              required
              type="select"
              value={formData.vatType}
              disabled={!isEditing}
              options={dropdowns?.typ?.map((d) => ({
                value: d.DROPDOWN_CODE,
                label: d.DROPDOWN_NAME,
              }))}
              onChange={(v) => updateForm({ vatType: v })}
            />
            <FieldRenderer
              label="VAT Classification"
              required
              type="select"
              value={formData.vatClass}
              disabled={!isEditing}
              options={dropdowns?.cls?.map((d) => ({
                value: d.DROPDOWN_CODE,
                label: d.DROPDOWN_NAME,
              }))}
              onChange={(v) => updateForm({ vatClass: v })}
            />
          </div>

          {/* Sub-Column 2 */}
          <div className="space-y-6">
            <FieldRenderer
              label="VAT Rate (%)"
              type="number"
              value={formData.vatRate}
              disabled={!isEditing}
              placeholder="0.00"
              step="0.01"
              onChange={(v) => {
                const numericValue = Math.max(0, parseFloat(v) || 0);
                updateForm({ vatRate: v });
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value || 0);
                const sanitized = Math.max(0, val).toFixed(2);
                updateForm({ vatRate: sanitized });
              }}
            />

            <FieldRenderer
              label="VAT Category"
              required
              type="select"
              value={formData.vatCategory}
              disabled={!isEditing}
              options={dropdowns?.cat?.map((d) => ({
                value: d.DROPDOWN_CODE,
                label: d.DROPDOWN_NAME,
              }))}
              onChange={(v) => updateForm({ vatCategory: v })}
            />

            <FieldRenderer
              label="Account Code"
              type="lookup"
              value={
                formData.acctCode
                  ? `(${formData.acctCode}) - ${formData.acctName}`
                  : ""
              }
              onLookup={() => {
                setvatAcct("acctCode");
                toggleModal("coa", true);
              }}
              disabled={!isEditing}
              required
              readOnly
            />
          </div>
        </div>

        {/* RIGHT: Registration Info */}
        <div className="w-full lg:w-[320px]">
          <RegistrationInfo layout="stacked" data={registrationInfo} />
        </div>
      </div>

      {/* Table Section */}
      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={docType}
          columns={columns}
          data={accounts}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["vatList"] })}
          onMobileRowOpen={openMobileActionSheet}
        />
      </div>

      <SearchCOAMast
        isOpen={modals.coa}
        customParam={
          formData.vatType === "I" ? "VATInputAcct" : "VATOutputAcct"
        }
        onClose={(v) => {
          toggleModal("coa", false);
          if (v && vatAcct) {
            updateForm({ acctCode: v.acctCode, acctName: v.acctName });
          }
        }}
      />

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
              <h2 className="text-sm font-bold text-gray-800">VAT Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.vatCode} {selectedMobileRow?.vatName ? `- ${selectedMobileRow.vatName}` : ""}
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

export default VATRef;