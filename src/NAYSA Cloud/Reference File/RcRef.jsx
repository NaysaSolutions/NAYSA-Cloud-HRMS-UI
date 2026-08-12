import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// FIX: Aliased the imports to remove the "use" prefix so React doesn't crash
import {
  useSwalErrorAlert as swalErrorAlert,
  useSwalSuccessAlert as swalSuccessAlert,
  useSwalErrorAlertAPI as swalErrorAlertAPI,
  useSwalDeleteConfirm as swalDeleteConfirm,
  useSwalDeleteRecord as swalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

/* ================= HELPERS ================= */

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;

  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const DEFAULT_FORM = {
  rcTypeCode: "",
  rcTypeName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const RcRef = forwardRef(
  (
    {
      embedded = false,
      activeTab = "rctype",
      setActiveTab = () => {},
      tabs = [],
    },
    ref,
  ) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const docType = "RcType";
    const documentTitle = reftables?.[docType] || "RC Type";
    const pdfLink = reftablesPDFGuide?.[docType];
    const videoLink = reftablesVideoGuide?.[docType];

    const codeInputRef = useRef(null);
    const tableRef = useRef(null);
    const enterValidatedRef = useRef(false);
    const guideRef = useRef(null);
    const formTopRef = useRef(null); 

    const [selectedRow, setSelectedRow] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDupCode, setIsDupCode] = useState(false);
    const [isOpenGuide, setIsOpenGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState(DEFAULT_FORM);

    const [tblFieldArray, setTblFieldArray] = useState([]);

    // --- Mobile Action Sheet State ---
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
    const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
    const [selectedMobileRow, setSelectedMobileRow] = useState(null);

    useEffect(() => {
      const checkMobile = () => window.innerWidth < 768;
      const handleResize = () => setIsMobile(checkMobile());
      setIsMobile(checkMobile());
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

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

    // load max length metadata once
    useEffect(() => {
      let mounted = true;

      (async () => {
        const res = await useFieldLenghtCheck("RCTYPE_REF");
        if (mounted) setTblFieldArray(res || []);
      })();

      return () => { mounted = false; };
    }, []);

    const getMax = (col) => useGetFieldLength(tblFieldArray, col);

    const setField = (key, value) =>
      setForm((prev) => ({ ...prev, [key]: value }));

    const resetForm = useCallback((next = DEFAULT_FORM) => {
      setForm(next);
    }, []);

    useEffect(() => {
      if (!embedded) document.title = documentTitle;
    }, [documentTitle, embedded]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (guideRef.current && !guideRef.current.contains(event.target)) {
          setIsOpenGuide(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- QUERIES ---
    const rcTypeListQuery = useQuery({
      queryKey: ["rcTypeList"],
      queryFn: async () => {
        const res = await apiClient.get("/rcType");
        return extractRows(res);
      },
      enabled: activeTab === "rctype" || !embedded, 
    });

    const rcTypes = useMemo(
      () => rcTypeListQuery.data || [],
      [rcTypeListQuery.data],
    );

    // --- MUTATIONS ---
    const saveMutation = useMutation({
      mutationFn: async (payload) => {
        return apiClient.post("/upsertRcType", {
          json_data: JSON.stringify(payload),
        });
      },
      onSuccess: (response) => {
        const sqlRow = response?.data?.data?.[0] || {};
        const errorcount = Number(sqlRow.errorcount ?? sqlRow.ERRORCOUNT ?? 0);
        const errormsg = String(sqlRow.errormsg ?? sqlRow.ERRORMSG ?? "");

        if (errorcount > 0) {
          swalErrorAlert("Error", errormsg);
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["rcTypeList"] });
        swalSuccessAlert("Success!", "Record saved successfully.");
        handleReset();
      },
      onError: (error) => {
        swalErrorAlertAPI("System Error", error);
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async (rcTypeCode) => {
        return apiClient.post("/deleteRcType", {
          json_data: JSON.stringify({ rcTypeCode }),
        });
      },
      onSuccess: (response) => {
        const sqlRow = response?.data?.data?.[0] || {};
        const errorcount = Number(sqlRow.errorcount ?? sqlRow.ERRORCOUNT ?? 0);

        if (errorcount > 0) {
          swalErrorAlert("Cannot Delete", sqlRow.errormsg);
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["rcTypeList"] });
        swalDeleteRecord("Deleted!", "Record deleted successfully.");
        handleReset();
      },
      onError: (error) => {
        swalErrorAlertAPI("System Error", error);
      },
    });

    // --- ACTIONS ---
    const startNew = useCallback(() => {
      resetForm(DEFAULT_FORM);
      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      setTimeout(() => codeInputRef.current?.focus?.(), 0);

      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, [resetForm]);

    const handleReset = useCallback(() => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);

      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, [resetForm]);

    const checkDuplicate = async (rcTypeCode) => {
      const c = String(rcTypeCode || "").trim();
      if (!c) return false;

      const res = await apiClient.post("/checkDuplicateRcType", {
        json_data: JSON.stringify({ rcTypeCode: c }),
      });

      const row0 = res?.data?.data?.[0] || {};
      const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
      const parsed = JSON.parse(raw);

      return String(parsed?.result) === "1";
    };

    const handleRcTypeCodeValidate = async (arg) => {
      const isEvent = arg && typeof arg === "object" && "type" in arg;

      if (isEvent && arg.type === "keydown") {
        if (arg.key !== "Enter") return;
        enterValidatedRef.current = true;
      }

      if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
        enterValidatedRef.current = false;
        return;
      }

      const code = String(form.rcTypeCode || "").trim();
      if (!code || !isEditing || form.__existing) return;

      const dup = await checkDuplicate(code);

      if (dup) {
        setIsDupCode(true);
        swalErrorAlert(
          "Duplicate Entry",
          `RC Type Code "${code}" is already in use.`,
        );
        setField("rcTypeCode", "");
        setTimeout(() => codeInputRef.current?.focus?.(), 0);
      } else {
        setIsDupCode(false);
      }
    };

    const handleSave = useCallback(() => {
      if (!isEditing || saveMutation.isPending) return;

      const payload = {
        rcTypeCode: String(form.rcTypeCode || "")
          .trim()
          .toUpperCase(),
        rcTypeName: String(form.rcTypeName || "").trim(),
        userCode: user?.USER_CODE || "ADMIN",
        // Enforce the edit flag for the SQL procedure to bypass key constraint re-insertions
        isEdit: form.__existing ? 1 : 0, 
      };

      if (!payload.rcTypeCode || !payload.rcTypeName) {
        swalErrorAlert(
          "Validation",
          "RC Type Code and RC Type Name are required.",
        );
        return;
      }

      saveMutation.mutate(payload);
    }, [form, isEditing, saveMutation, user?.USER_CODE]);

    const handleEdit = useCallback(
      async (row) => {
        try {
          const res = await apiClient.get("/getRcType", {
            params: { rcTypeCode: row.rcTypeCode },
          });

          const record = extractRows(res)?.[0];
          resetForm({ ...DEFAULT_FORM, ...record, __existing: true });
          setIsEditing(true);
          setSelectedRow(row);
          closeMobileActionSheet();

          setTimeout(() => {
            if (formTopRef.current) {
              const yOffset = -80; 
              const y = formTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }, 150);

        } catch (error) {
          swalErrorAlertAPI("Fetch Error", error);
        }
      },
      [resetForm],
    );

    const handleDelete = useCallback(
      async (row) => {
        const code = row?.rcTypeCode ?? "";

        if (!code) {
          return swalErrorAlert("Error", "No record selected.");
        }

        try {
          // 1. Check if used in other tables via SPROC
          const res = await apiClient.post("/checkInUsedRcType", {
            json_data: JSON.stringify({ rcTypeCode: code }),
          });

          const row0 = res?.data?.data?.[0] || {};
          const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
          const parsed = JSON.parse(raw);

          if (String(parsed?.result) === "1") {
            return swalErrorAlert(
              "Cannot Delete",
              `RC Type Code "${code}" is currently in use by other transactions.`,
            );
          }

          // 2. Confirmation
          const confirm = await swalDeleteConfirm(
            "Confirm Delete",
            `Are you sure you want to delete RC Type "${code}"?`,
          );

          if (confirm.isConfirmed) {
            deleteMutation.mutate(code);
          }
        } catch (error) {
          swalErrorAlertAPI("System Error", error);
        }
      },
      [deleteMutation],
    );

    useImperativeHandle(ref, () => ({
      startNew,
      editSelected: () =>
        selectedRow
          ? handleEdit(selectedRow)
          : swalErrorAlert("Info", "Select a record first."),
      deleteSelected: () =>
        selectedRow
          ? handleDelete(selectedRow)
          : swalErrorAlert("Info", "Select a record first."),
      save: handleSave,
      reset: handleReset,
      refresh: () =>
        queryClient.invalidateQueries({ queryKey: ["rcTypeList"] }),
    }));

    const tableColumns = useMemo(
      () => [
        {
          key: "__actions",
          label: <span className="hidden md:inline">Actions</span>,
          sortable: false,
          width: 90,
          render: (row) => (
            <div className="flex gap-2 justify-center w-full">
              <button
                type="button"
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
                type="button"
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
        {
          key: "rcTypeCode",
          label: "RC Type Code",
          width: 200,
          sortable: true,
        },
        {
          key: "rcTypeName",
          label: "RC Type Name",
          width: 450,
          maxWidth: 450,
          sortable: true,
          render: (row) => (
            <div 
              className="whitespace-normal break-words min-w-[150px] max-w-[300px] lg:max-w-[400px]"
              title={row.rcTypeName}
            >
              {row.rcTypeName}
            </div>
          )
        },
      ],
      [handleEdit, handleDelete, isMobile],
    );

    const tableData = useMemo(
      () =>
        (Array.isArray(rcTypes) ? rcTypes : []).map((row, index) => ({
          ...row,
          __idx: index,
        })),
      [rcTypes],
    );

    const registrationData = useMemo(
      () => ({
        registeredBy: form?.registeredBy,
        registeredDate: form?.registeredDate,
        lastUpdatedBy: form?.lastUpdatedBy,
        lastUpdatedDate: form?.lastUpdatedDate,
      }),
      [form],
    );

    const isLoadingState =
      rcTypeListQuery.isLoading ||
      saveMutation.isPending ||
      deleteMutation.isPending ||
      isLoading;

    return (
      <div className={embedded ? "w-full" : ""}>
        {/* Modern Loading Overlay */}
        {isLoadingState && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-sm font-semibold animate-pulse">
                {saveMutation.isPending
                  ? "Saving..."
                  : deleteMutation.isPending
                    ? "Deleting..."
                    : "Loading..."}
              </span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="global-ref-header-ui mb-0">
          <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
            <div className="w-full md:w-auto md:justify-start flex">
              <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
                {documentTitle}
              </h1>
            </div>

            {/* Middle: Tabs centered */}
            <div className="hidden md:flex justify-center items-end gap-4 h-full w-full">
              {!embedded && (
                <>
                  <button
                    onClick={() => setActiveTab("rcMast")}
                    className={`text-[11px] font-bold pb-1 border-b-2 transition-all ${
                      activeTab === "rcMast"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    RC Master Data
                  </button>
                  <button
                    onClick={() => setActiveTab("rctype")}
                    className={`text-[11px] font-bold pb-1 border-b-2 transition-all ${
                      activeTab === "rctype"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    RC Type
                  </button>
                </>
              )}
            </div>

            {/* Right: Buttons + Info */}
            <div className="w-full md:w-auto flex md:justify-end">
              <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
                <div className="flex flex-wrap justify-center md:justify-end gap-2">
                  <ButtonBar
                    buttons={[
                      {
                        key: "add",
                        label: <span className="sm:inline ml-1">Add</span>,
                        icon: faPlus,
                        onClick: startNew,
                        className:
                          "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                      },
                      {
                        key: "save",
                        label: <span className="sm:inline ml-1">Save</span>,
                        icon: faSave,
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
                    onClick={() => setIsOpenGuide((v) => !v)}
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
                      {pdfLink && (
                        <button
                          onClick={() => {
                            window.open(pdfLink, "_blank");
                            setIsOpenGuide(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                        >
                          <FontAwesomeIcon
                            icon={faFilePdf}
                            className="mr-2 text-red-500"
                          />{" "}
                          PDF Guide
                        </button>
                      )}
                      {videoLink && (
                        <button
                          onClick={() => {
                            window.open(videoLink, "_blank");
                            setIsOpenGuide(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                        >
                          <FontAwesomeIcon
                            icon={faVideo}
                            className="mr-2 text-blue-500"
                          />{" "}
                          Video Guide
                        </button>
                      )}
                      {!pdfLink && !videoLink && (
                        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                          No guide available.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Only: Tabs centered (Shown below title/buttons on small screens) */}
            {!embedded && (
              <div className="flex md:hidden justify-center items-end gap-4 w-full mt-2">
                <button
                  onClick={() => setActiveTab("rcMast")}
                  className={`text-[11px] font-bold pb-1 border-b-2 transition-all ${
                    activeTab === "rcMast"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  RC Master Data
                </button>
                <button
                  onClick={() => setActiveTab("rctype")}
                  className={`text-[11px] font-bold pb-1 border-b-2 transition-all ${
                    activeTab === "rctype"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                  RC Type
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area (Left and Right Layout) */}
       <div ref={formTopRef} className="mt-20 md:mt-16 px-4 md:px-9 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row gap-4 h-auto xl:h-[calc(100vh-130px)]">
            
            {/* Left Column: Data Entry & Registration Info */}
            <div className="w-full xl:w-[400px] flex flex-col gap-5 shrink-0 h-fit">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <FieldRenderer
                  label="RC Type Code"
                  required
                  value={form.rcTypeCode}
                  inputRef={codeInputRef}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e ?? "";
                    setField("rcTypeCode", String(val).toUpperCase());
                  }}
                  onBlur={handleRcTypeCodeValidate}
                  onKeyDown={handleRcTypeCodeValidate}
                  disabled={!isEditing || form.__existing}
                  maxLength={getMax("RCTYPE_CODE")} 
                />

                <FieldRenderer
                  label="RC Type Name"
                  required
                  value={form.rcTypeName}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e ?? "";
                    setField("rcTypeName", String(val));
                  }}
                  disabled={!isEditing || saveMutation.isPending}
                  maxLength={getMax("RCTYPE_NAME")} 
                />
              </div>

              <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 xl:mb-0">
                <RegistrationInfo
                  data={registrationData}
                  layout="stacked"
                  showHeader={true}
                />
              </div>
            </div>

            {/* Right Column: Data Table */}
            <div className="flex-1 flex flex-col gap-4 h-[500px] xl:h-full pb-8 xl:pb-0 min-w-0 w-full overflow-hidden">
              <div className="global-tran-table-main-div-ui bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full mt-0 w-full min-w-0 relative z-0">
                <SearchGlobalReferenceTable
                  ref={tableRef}
                  docType="RC Type"
                  columns={tableColumns}
                  data={tableData}
                  itemsPerPage={15}
                  showFilters
                  className="h-full"
                  onRowDoubleClick={handleEdit}
                  selectedRow={selectedRow}
                  onRowClick={(row) => setSelectedRow(row)}
                  tableSize="half"
                  title="RC Types"
                  fileName={`RcType_Reference_${new Date().toISOString().split("T")[0]}`}
                  onMobileRowOpen={isMobile ? openMobileActionSheet : undefined}
                />
              </div>
            </div>

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
                <h2 className="text-sm font-bold text-gray-800">Record Actions</h2>
                <p className="text-xs text-gray-500">
                  {selectedMobileRow?.rcTypeCode} {selectedMobileRow?.rcTypeName ? `- ${selectedMobileRow.rcTypeName}` : ""}
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
  },
);

export default RcRef;