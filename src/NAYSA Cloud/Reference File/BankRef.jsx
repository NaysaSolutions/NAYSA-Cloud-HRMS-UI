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
import { Edit, Trash2 } from "lucide-react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
  useSwalInfoAlert,
  useSwalDeleteRecord,
  useSwalDeleteConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

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
  bankTypeCode: "",
  bankTypeName: "",
  __existing: false,
};

const BankRef = forwardRef(
  (
    {
      embedded = false,
      activeTab = "banktypes",
      setActiveTab = () => {},
      tabs = [],
    },
    ref,
  ) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const docType = "BankType";
    const documentTitle = reftables?.[docType] || "Bank Type Codes";
    const pdfLink = reftablesPDFGuide?.[docType];
    const videoLink = reftablesVideoGuide?.[docType];

    const codeInputRef = useRef(null);
    const tableRef = useRef(null);
    const enterValidatedRef = useRef(false);

    const [selectedRow, setSelectedRow] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDupCode, setIsDupCode] = useState(false);

    const [form, setForm] = useState(DEFAULT_FORM);

    // --- MOBILE ACTION SHEET STATES ---
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
    const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
    const [selectedMobileRow, setSelectedMobileRow] = useState(null);

    const setField = (key, value) =>
      setForm((prev) => ({ ...prev, [key]: value }));

    const resetForm = useCallback((next = DEFAULT_FORM) => {
      setForm(next);
    }, []);

    useEffect(() => {
      if (!embedded) document.title = documentTitle;
    }, [documentTitle, embedded]);

    // --- MOBILE DETECTOR EFFECT ---
    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // --- MOBILE ACTION SHEET HANDLERS ---
    const openMobileActionSheet = useCallback((row) => {
      setSelectedMobileRow(row);
      setIsMobileActionSheetMounted(true);

      requestAnimationFrame(() => {
        setIsMobileActionSheetOpen(true);
      });
    }, []);

    const closeMobileActionSheet = useCallback(() => {
      setIsMobileActionSheetOpen(false);

      setTimeout(() => {
        setIsMobileActionSheetMounted(false);
        setSelectedMobileRow(null);
      }, 300);
    }, []);

    /* ================= TANSTACK QUERY ================= */

    const bankTypeListQuery = useQuery({
      queryKey: ["bankTypeList"],
      queryFn: async () => {
        const res = await apiClient.get("/bankType");
        return extractRows(res);
      },
      // ✅ ADDED: Force fresh data on load and auto-sync every 20s
      staleTime: 0,
      refetchInterval: 1000 * 20,
    });

    const bankTypes = useMemo(
      () => bankTypeListQuery.data || [],
      [bankTypeListQuery.data],
    );

    const isInitialLoading = bankTypeListQuery.isLoading;

    const saveMutation = useMutation({
      mutationFn: async (payload) => {
        return apiClient.post("/upsertBankType", {
          json_data: JSON.stringify(payload),
        });
      },
      onSuccess: async (response) => {
        const sqlRow = response?.data?.data?.[0] || {};
        const errorcount = Number(sqlRow.errorcount ?? sqlRow.ERRORCOUNT ?? 0);
        const errormsg = String(sqlRow.errormsg ?? sqlRow.ERRORMSG ?? "");

        if (errorcount > 0) {
          useSwalErrorAlert("Error", errormsg || "Failed to save Bank Type.");
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["bankTypeList"] });
        useSwalSuccessAlert("Success!", "Bank Type Code saved successfully.");
        setIsEditing(false);
        setSelectedRow(null);
        setIsDupCode(false);
        resetForm(DEFAULT_FORM);
      },
      onError: (error) => {
        useSwalErrorAlert(
          "System Error",
          error?.message || "Failed to save record.",
        );
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async (bankTypeCode) => {
        return apiClient.post("/deleteBankType", {
          json_data: { bankTypeCode },
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["bankTypeList"] });
        useSwalDeleteRecord("Deleted", "Record deleted successfully.");
        handleReset();
      },
      onError: (error) => {
        useSwalErrorAlert(
          "System Error",
          error?.message || "Failed to delete record.",
        );
      },
    });

    /* ================= ACTIONS ================= */

    const startNew = useCallback(() => {
      resetForm(DEFAULT_FORM);
      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    }, [resetForm]);

    const handleReset = useCallback(() => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    }, [resetForm]);

    const parseResultFlag = (res) => {
      const row0 = res?.data?.data?.[0] || {};
      const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';

      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return String(parsed?.result) === "1";
      } catch {
        return false;
      }
    };

    const checkDuplicate = async (bankTypeCode) => {
      const c = String(bankTypeCode || "").trim();
      if (!c) return false;

      const res = await apiClient.post("/checkDuplicateBankType", {
        json_data: { bankTypeCode: c },
      });

      return parseResultFlag(res);
    };

    const checkInUsed = async (bankTypeCode) => {
      const c = String(bankTypeCode || "").trim();
      if (!c) return false;

      const res = await apiClient.post("/checkInUsedBankType", {
        json_data: { bankTypeCode: c },
      });

      return parseResultFlag(res);
    };

    const handleBankTypeCodeValidate = async (arg) => {
      const isEvent = arg && typeof arg === "object" && "type" in arg;

      if (isEvent && arg.type === "keydown") {
        if (arg.key !== "Enter") return;
        enterValidatedRef.current = true;
      }

      if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
        enterValidatedRef.current = false;
        return;
      }

      const code = String(form.bankTypeCode || "")
        .trim()
        .toUpperCase();
      if (!code || !isEditing || form.__existing) return;

      try {
        const dup = await checkDuplicate(code);

        if (dup) {
          setIsDupCode(true);
          useSwalErrorAlert(
            "Duplicate Entry",
            `Bank Type Code "${code}" already exists.`,
          );
          setField("bankTypeCode", "");
          setTimeout(() => codeInputRef.current?.focus?.(), 0);
        } else {
          setIsDupCode(false);
        }
      } catch (error) {
        useSwalErrorAlert(
          "Validation Error",
          error?.message || "Failed to validate Bank Type Code.",
        );
      }
    };

    const handleSave = useCallback(async () => {
      if (!isEditing || saveMutation.isPending) return;

      const code = String(form.bankTypeCode || "")
        .trim()
        .toUpperCase();
      const name = String(form.bankTypeName || "").trim();

      const missing = [];
      if (!code) missing.push("• Bank Type Code");
      if (!name) missing.push("• Bank Type Name");

      if (missing.length) {
        useSwalErrorAlert(
          "Error!",
          `Please fill in the required field(s):\n${missing.join("\n")}`,
        );
        return;
      }

      try {
        if (!form.__existing) {
          const dup = await checkDuplicate(code);
          if (dup) {
            useSwalErrorAlert(
              "Duplicate Entry",
              `Bank Type Code "${code}" already exists.`,
            );
            setTimeout(() => codeInputRef.current?.focus?.(), 0);
            return;
          }
        }

        const payload = {
          bankTypeCode: code,
          bankTypeName: name,
          userCode: user?.USER_CODE || "ADMIN",
        };

        saveMutation.mutate(payload);
      } catch (error) {
        useSwalErrorAlert(
          "System Error",
          error?.message || "Failed to save Bank Type.",
        );
      }
    }, [form, isEditing, saveMutation, user?.USER_CODE]);

    const handleEdit = async (row) => {
      try {
        const res = await apiClient.get("/getBankType", {
          params: { bankTypeCode: row.bankTypeCode },
        });

        const record = extractRows(res)?.[0];
        resetForm({ ...DEFAULT_FORM, ...record, __existing: true });
        setIsEditing(true);
        setSelectedRow(row);
        closeMobileActionSheet(); // ensure it closes if opened from action sheet
      } catch {
        useSwalErrorAlert("Error", "Could not fetch record");
      }
    };

    const handleDelete = useCallback(
      async (row) => {
        const code = row?.bankTypeCode ?? row?.banktype_code ?? "";

        if (!code) {
          useSwalErrorAlert("Error", "No record selected.");
          return;
        }

        try {
          const used = await checkInUsed(code);

          if (used) {
            useSwalErrorAlert(
              "Cannot Delete",
              `Bank Type Code "${code}" is already in use.`,
            );
            return;
          }

          const confirm = await useSwalDeleteConfirm(
            "Delete Record?",
            `Are you sure you want to delete Bank Type "${code}"?`,
            "Yes, delete it",
          );

          if (!confirm?.isConfirmed) return;

          deleteMutation.mutate(code);
          closeMobileActionSheet(); // ensure it closes if opened from action sheet
        } catch (error) {
          useSwalErrorAlert(
            "System Error",
            error?.message || "Failed to delete record.",
          );
        }
      },
      [deleteMutation, useSwalDeleteConfirm, closeMobileActionSheet],
    );

    const editSelected = useCallback(() => {
      if (!selectedRow) {
        useSwalInfoAlert("Info", "Please select a record first.");
        return;
      }
      handleEdit(selectedRow);
    }, [selectedRow]);

    const deleteSelected = useCallback(async () => {
      if (!selectedRow) {
        useSwalInfoAlert("Info", "Please select a record first.");
        return;
      }
      await handleDelete(selectedRow);
    }, [selectedRow, handleDelete]);

    const exportData = useCallback(() => {
      tableRef.current?.getState?.();
    }, []);

    const openInfo = useCallback(() => {
      const messages = [];

      if (pdfLink) messages.push(`PDF Guide: ${pdfLink}`);
      if (videoLink) messages.push(`Video Guide: ${videoLink}`);

      if (messages.length) {
        useSwalInfoAlert("Guide", messages.join("\n"));
        return;
      }

      useSwalInfoAlert(
        "Guide",
        "No guide or video link is available for this reference.",
      );
    }, [pdfLink, videoLink]);

    useImperativeHandle(ref, () => ({
      startNew,
      edit: editSelected,
      editSelected,
      deleteSelected,
      save: handleSave,
      reset: handleReset,
      refresh: () =>
        queryClient.invalidateQueries({ queryKey: ["bankTypeList"] }),
      exportData,
      openInfo,
    }));

    /* ================= TABLE COLUMNS ================= */

    const tableColumns = useMemo(
      () => [
        {
          key: "__actions",
          label: <span className="hidden md:inline">Actions</span>,
          sortable: false,
          width: 100,
          minWidth: 100, 
          render: (row) => (
            <div className="flex items-center justify-center gap-2">
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
          key: "bankTypeCode",
          label: "Bank Type Code",
          sortable: true,
          width: 150,
          minWidth: 150, 
          requiredVisible: true,
          render: (row) => row?.bankTypeCode,
        },
        {
          key: "bankTypeName",
          label: "Bank Type Name",
          sortable: true,
          width: 300,
          minWidth: 150, 
          requiredVisible: true,
          render: (row) => row?.bankTypeName,
        },
      ],
      [handleDelete, isMobile, openMobileActionSheet],
    );

    const tableData = useMemo(
      () =>
        (Array.isArray(bankTypes) ? bankTypes : []).map((row, index) => ({
          ...row,
          __idx: index,
          bankTypeCode: row?.bankTypeCode,
          bankTypeName: row?.bankTypeName,
        })),
      [bankTypes],
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

    const showGlobalLoading =
      isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

    return (
      <div className={embedded ? "w-full" : "global-ref-main-div-ui mt-24"}>
        {showGlobalLoading && <LoadingSpinner />}

        <div className="mx-auto w-full max-w-[905px] px-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FieldRenderer
                      label="Bank Type Code"
                      required
                      value={form.bankTypeCode}
                      inputRef={codeInputRef}
                      onChange={(val) => setField("bankTypeCode", val)}
                      maxLength={10}
                      onBlur={handleBankTypeCodeValidate}
                      onKeyDown={handleBankTypeCodeValidate}
                      disabled={!isEditing || form.__existing}
                    />

                    <FieldRenderer
                      label="Bank Type Name"
                      required
                      value={form.bankTypeName}
                      onChange={(val) => setField("bankTypeName", val)}
                      maxLength={100}
                      disabled={!isEditing || saveMutation.isPending}
                    />
                  </div>
                </div>

                <RegistrationInfo
                  data={registrationData}
                  layout="stacked"
                  showHeader={true}
                />
              </div>
            </div>

            <div className="flex items-start xl:col-span-8">
              <div className="h-[550px] w-full min-w-0 rounded-lg border p-2 flex flex-col">
                <SearchGlobalReferenceTable
                  ref={tableRef}
                  docType={docType}
                  columns={tableColumns}
                  data={tableData}
                  itemsPerPage={10}
                  showFilters
                  className="h-full"
                  onRowDoubleClick={handleEdit}
                  selectedRow={selectedRow}
                  onRowClick={(row) => setSelectedRow(row)}
                  showGlobalSearch={false}
                  tableSize="Half"
                  // ✅ ADDED: Connecting the table to the query for UI feedback
                  isLoading={isInitialLoading}
                  isFetching={bankTypeListQuery.isFetching}
                  onRefresh={() => bankTypeListQuery.refetch()}
                  onMobileRowOpen={openMobileActionSheet} // Piped into global table!
                />
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE ACTION SHEET COMPONENT */}
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
                <h2 className="text-sm font-bold text-gray-800">Bank Type Actions</h2>
                <p className="text-xs text-gray-500">
                  {selectedMobileRow?.bankTypeCode} {selectedMobileRow?.bankTypeName ? `- ${selectedMobileRow.bankTypeName}` : ""}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedMobileRow);
                  }}
                  className="w-full flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
                  title="Delete"
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                  <span className="md:hidden">Delete</span>
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

export default BankRef;