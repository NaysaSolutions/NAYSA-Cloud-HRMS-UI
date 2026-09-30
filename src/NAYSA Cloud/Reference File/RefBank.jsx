import React, { useEffect, useMemo, useRef, useState } from "react";
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
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteRecord,
  useSwalDeleteConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import SearchGlobalReferenceTable from "../Lookup/SearchGlobalReferenceTable";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

import {
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import SearchBankRef from "@/NAYSA Cloud/Lookup/SearchBankRef.jsx";
import SearchCOAMast from "../Lookup/SearchCOAMast";

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
  bankCode: "",
  bankName: "",
  acctCode: "",
  acctName: "",
  bankAcctNo: "",
  bankAcctType: "SA",
  autoCk: "Y",
  startCheckNo: "",
  lastCheckNo: "",
  currCode: "",
  currName: "",
  bankTypeCode: "",
  bankTypeName: "",
  bankBranch: "",
  bankContact: "",
  bankAddr1: "",
  bankAddr2: "",
  bankTelNo: "",
  bankPosition: "",
  active: "Y",
  __existing: false,
};

const toYN = (v, def = "N") => {
  const x = String(v ?? "").trim().toUpperCase();
  if (x === "Y" || x === "YES" || x === "TRUE" || x === "1") return "Y";
  if (x === "N" || x === "NO" || x === "FALSE" || x === "0") return "N";
  return def;
};

/* ================= COMPONENT ================= */

const BankMast = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const docType = "BankMast";
  const documentTitle = "Bank Codes";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const bankCodeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [isDupCode, setIsDupCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [isBankTypeModalOpen, setBankTypeModalOpen] = useState(false);
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);

  // --- MOBILE ACTION SHEET STATES ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = (next = DEFAULT_FORM) => setForm(next);
  const isAdding = isEditing && !form.__existing;

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  // --- MOBILE DETECTOR EFFECT ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const startNew = () => {
    resetForm(DEFAULT_FORM);
    setIsEditing(true);
    setIsFieldsExpanded(true);
    setSelectedRow(null);
    setIsDupCode(false);
    setTimeout(() => bankCodeInputRef.current?.focus?.(), 0);
  };

  const handleReset = () => {
    resetForm(DEFAULT_FORM);
    setIsEditing(false);
    setIsFieldsExpanded(false);
    setSelectedRow(null);
    setIsDupCode(false);
  };

  // --- MOBILE ACTION SHEET HANDLERS ---
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

  /* ================= TANSTACK QUERY ================= */

  const bankListQuery = useQuery({
    queryKey: ["bankList"],
    queryFn: async () => {
      const res = await apiClient.get("/bank");
      return extractRows(res);
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  const banks = useMemo(() => bankListQuery.data || [], [bankListQuery.data]);
  const isInitialLoading = bankListQuery.isLoading;

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const requestBody = {
        json_data: JSON.stringify({ json_data: payload }),
      };
      return apiClient.post("/upsertBank", requestBody);
    },
    onSuccess: async (response) => {
      const sqlRow = response?.data?.data?.[0] || {};
      const errorcount = Number(sqlRow.errorcount ?? sqlRow.ERRORCOUNT ?? 0);
      const errormsg = String(sqlRow.errormsg ?? sqlRow.ERRORMSG ?? "");

      if (errorcount > 0) {
        useSwalErrorAlert(
          "Missing Fields",
          errormsg || "Failed to save bank record."
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["bankList"] });
      useSwalSuccessAlert("Success!", "Record saved successfully.");
      setIsEditing(false);
      setIsFieldsExpanded(false);
      resetForm(DEFAULT_FORM);
      setSelectedRow(null);
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.message || "Failed to save record."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (bankCode) => {
      return apiClient.post("/deleteBank", { json_data: { bankCode } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bankList"] });
      useSwalDeleteRecord("Deleted!", "Record deleted successfully.");
      handleReset();
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.message || "Failed to delete record."
      );
    },
  });

  /* ================= ACTIONS ================= */

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

  const checkDuplicate = async (bankCode) => {
    const c = String(bankCode || "").trim();
    if (!c) return false;
    const res = await apiClient.post("/checkDuplicateBank", {
      json_data: { bankCode: c },
    });
    return parseResultFlag(res);
  };

  const checkInUsed = async (bankCode) => {
    const c = String(bankCode || "").trim();
    if (!c) return false;
    const res = await apiClient.post("/checkInUsedBank", {
      json_data: { bankCode: c },
    });
    return parseResultFlag(res);
  };

  const handleBankCodeValidate = async (arg) => {
    const isEvent = arg && typeof arg === "object" && "type" in arg;

    if (isEvent && arg.type === "keydown") {
      if (arg.key !== "Enter") return;
      enterValidatedRef.current = true;
    }

    if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
      enterValidatedRef.current = false;
      return;
    }

    const code = String(form.bankCode || "").trim().toUpperCase();
    
    // Original logic from BankRef: Skip if empty, not editing, or already exists in DB (Edit mode)
    if (!code || !isEditing || form.__existing) return;

    try {
      const dup = await checkDuplicate(code);
      if (dup) {
        setIsDupCode(true);
        useSwalErrorAlert("Duplicate Code", `Bank Code "${code}" already exists.`);
        setField("bankCode", "");
        setTimeout(() => bankCodeInputRef.current?.focus?.(), 0);
      } else {
        setIsDupCode(false);
      }
    } catch (error) {
      useSwalErrorAlert("Validation Error", error?.message || "Failed to validate Bank Code.");
    }
  };

  const handleSave = async () => {
    if (!isEditing || saveMutation.isPending) return;

    const bankCode = String(form.bankCode || "").trim().toUpperCase();

    // Skip duplicate check if editing an existing record
    if (!form.__existing) {
      const dup = await checkDuplicate(bankCode);
      if (dup) {
        useSwalErrorAlert("Duplicate Code", `Bank Code "${bankCode}" already exists.`);
        setTimeout(() => bankCodeInputRef.current?.focus?.(), 0);
        return;
      }
    }

    const { __existing, acctName, currName, bankTypeName, ...payload } = form;

    saveMutation.mutate({
      ...payload,
      bankCode,
      autoCk: toYN(form.autoCk, "Y"),
      active: toYN(form.active, "Y"),
      userCode: user?.USER_CODE || "ADMIN",
    });
  };

  const handleEdit = async (row) => {
    try {
      const res = await apiClient.get("/getBank", {
        params: { bankCode: row.bankCode },
      });
      const record = extractRows(res)?.[0];
      resetForm({
        ...DEFAULT_FORM,
        ...record,
        active: toYN(record?.active, "Y"),
        __existing: true,
      });
      setIsEditing(true);
      setIsFieldsExpanded(true);
      setSelectedRow(row);
      setIsDupCode(false);
      closeMobileActionSheet(); // ensure it closes if opened from action sheet
    } catch {
      useSwalErrorAlert("Error", "Could not fetch record");
    }
  };

  const handleDelete = async (row) => {
    const code = row?.bankCode ?? "";
    try {
      const used = await checkInUsed(code);
      if (used) {
        useSwalErrorAlert("Cannot Delete", `Bank Code "${code}" is already in use.`);
        return;
      }
      const result = await useSwalDeleteConfirm(
        "Delete Record?",
        `Are you sure you want to delete Bank "${code}"?`,
        "Yes, delete it"
      );
      if (!result?.isConfirmed) return;
      deleteMutation.mutate(code);
      closeMobileActionSheet(); // ensure it closes if opened from action sheet
    } catch (error) {
      useSwalErrorAlert("System Error", error?.message || "Failed to delete record.");
    }
  };

  /* ================= TABLE COLUMNS ================= */

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        sortable: false,
        width: 100,
        minWidth: 100,
        render: (row) => (
          <div className="flex gap-2 justify-center">
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:shadow-sm active:scale-95 transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white hover:shadow-sm active:scale-95 transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      {
        key: "bankCode",
        label: "Bank Code",
        sortable: true,
        width: 120,
        minWidth: 120,
        requiredVisible: true,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold tracking-wide text-gray-700 dark:text-gray-200">
            {row.bankCode}
          </span>
        ),
      },
      {
        key: "bankName",
        label: "Bank Name",
        sortable: true,
        width: 280,
        minWidth: 280,
        requiredVisible: true,
      },
      {
        key: "acctCode",
        label: "Account Code",
        sortable: true,
        width: 150,
        minWidth: 150,
      },
      {
        key: "acctName",
        label: "Account Name",
        sortable: true,
        width: 250,
        minWidth: 250,
      },
      {
        key: "bankAcctNo",
        label: "Bank Account No.",
        sortable: true,
        width: 170,
        minWidth: 170,
      },
      {
        key: "bankTypeCode",
        label: "Bank Type",
        sortable: true,
        width: 180,
        minWidth: 180,
        render: (row) =>
          row.bankTypeCode
            ? `${row.bankTypeCode}${row.bankTypeName ? ` - ${row.bankTypeName}` : ""}`
            : "",
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        minWidth: 100,
        className: "!px-2",
        render: (row) => {
          const isActive = toYN(row?.active, "Y") === "Y";
          return (
            <span
              className={`flex min-h-[28px] w-full items-center justify-center gap-1.5 rounded-full px-2 py-1 text-center text-[11px] font-medium whitespace-nowrap ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                  : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <FontAwesomeIcon
                icon={isActive ? faCircleCheck : faCircleXmark}
                className={`text-[10px] ${isActive ? "text-emerald-500" : "text-gray-400"}`}
              />
              {isActive ? "Yes" : "No"}
            </span>
          );
        },
      },
    ],
    [isMobile] // Added isMobile to dependencies so the Action button triggers update correctly
  );

  /* ================= DYNAMIC HEADER BUTTONS ================= */

  const bankMastButtons = (
    <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
      <div className="flex flex-wrap justify-center md:justify-end gap-2">
        <ButtonBar
          buttons={[
            {
              key: "add",
              label: <span className="hidden sm:inline ml-1">Add</span>,
              icon: faPlus,
              onClick: startNew,
              disabled: isEditing,
              className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150
                ${isEditing
                  ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                }`,
            },
            {
              key: "save",
              label: <span className="hidden sm:inline ml-1">Save</span>,
              icon: faSave,
              onClick: handleSave,
              disabled: !isEditing || saveMutation.isPending || isDupCode || !isFieldsExpanded,
              className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150
                ${(!isEditing || saveMutation.isPending || isDupCode || !isFieldsExpanded)
                  ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                }`,
            },
            {
              key: "reset",
              label: <span className="hidden sm:inline ml-1">Reset</span>,
              icon: faUndo,
              onClick: handleReset,
              disabled: saveMutation.isPending,
              className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150
                ${saveMutation.isPending
                  ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                }`,
            },
          ]}
        />
      </div>

      <div ref={guideRef} className="relative">
        <button
          type="button"
          onClick={() => setOpenGuide((v) => !v)}
          className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
        >
          <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
          <span className="hidden sm:inline ml-1 text-[11px] font-medium">Info</span>
          <FontAwesomeIcon icon={faChevronDown} className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${isOpenGuide ? "rotate-180" : ""}`} />
        </button>

        {isOpenGuide && (
          <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
            <button
              type="button"
              onClick={() => { if (pdfLink) window.open(pdfLink, "_blank"); setOpenGuide(false); }}
              disabled={!pdfLink}
              className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
            </button>
            <button
              type="button"
              onClick={() => { if (videoLink) window.open(videoLink, "_blank"); setOpenGuide(false); }}
              disabled={!videoLink}
              className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const showGlobalLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  return (
    <div className="global-ref-main-div-ui">
      {showGlobalLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
              {documentTitle}
            </h1>
          </div>

          <div className="hidden md:flex justify-center w-full" />

          <div className="w-full md:w-auto flex md:justify-end">
            {bankMastButtons}
          </div>
        </div>
      </div>

      <div>
            <div className="mt-24 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
              <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg transition-colors duration-200 border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-[11px] sm:text-[14px] p-1.5 text-blue-600 font-semibold mt-0.5">
                      {isEditing
                        ? form.__existing
                          ? `Updating Record - ${form.bankCode}`
                          : "Fill in the fields below to add a new bank"
                        : "Select Add or double-click a row to edit"}
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
                      onClick={() => setIsFieldsExpanded((expanded) => !expanded)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                      aria-expanded={isFieldsExpanded}
                      aria-controls="ref-bank-fields ref-bank-registration"
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
                  id="ref-bank-fields"
                  className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-6 transition-all duration-200 ${
                    isFieldsExpanded ? "opacity-100 max-h-[600px]" : "hidden"
                  }`}
                >
                  <div className="space-y-4">
                    <FieldRenderer
                      label="Bank Code"
                      value={form.bankCode}
                      inputRef={bankCodeInputRef}
                      maxLength={10}
                      onChange={(val) => setField("bankCode", String(val).toUpperCase())}
                      onBlur={handleBankCodeValidate}
                      onKeyDown={handleBankCodeValidate}
                      disabled={!isEditing || form.__existing}
                      required
                    />

                    <FieldRenderer
                      label="Bank Name"
                      value={form.bankName}
                    //   inputRef={bankNameInputRef}
                      maxLength={100}
                      onChange={(val) => setField("bankName", String(val).slice(0, 100))}
                    //   onBlur={handleBankNameValidate}
                    //   onKeyDown={handleBankNameValidate}
                      disabled={!isEditing || form.__existing}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <FieldRenderer
                      label="Account Code"
                      type="lookup"
                      value={form.acctCode}
                      onLookup={() => setAccountModalOpen(true)}
                      disabled={!isEditing}
                      required
                      readOnly
                    />

                    <FieldRenderer label="Account Name" value={form.acctName} readOnly disabled={!isEditing} />
                  </div>

                  <div className="space-y-4">
                    <FieldRenderer
                      label="Bank Account No."
                      value={form.bankAcctNo}
                      maxLength={50}
                      onChange={(val) => setField("bankAcctNo", String(val).replace(/-/g, "").slice(0, 50))}
                      disabled={!isEditing}
                      required
                    />

                    <FieldRenderer
                      label="Bank Type"
                      type="lookup"
                      value={form.bankTypeCode ? `${form.bankTypeCode} - ${form.bankTypeName || ""}` : ""}
                      onLookup={() => setBankTypeModalOpen(true)}
                      disabled={!isEditing}
                      required
                      readOnly
                    /> 
                  </div>

                  <div className="space-y-4">
                    <FieldRenderer
                      label="Active"
                      type="select"
                      value={form.active}
                      onChange={(val) => setField("active", toYN(val, "Y"))}
                      options={[
                        { value: "Y", label: "Yes" },
                        { value: "N", label: "No" },
                      ]}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>

                <div
                  id="ref-bank-registration"
                  className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-200 ${
                    isFieldsExpanded ? "opacity-100" : "hidden"
                  }`}
                >
                  <RegistrationInfo data={form} layout="straight" />
                </div>
              </div>
            </div>

            <div className="global-tran-table-main-div-ui mt-4">
              <SearchGlobalReferenceTable
                docType={docType}
                columns={columns}
                data={banks}
                itemsPerPage={50}
                onRowDoubleClick={handleEdit}
                selectedRow={selectedRow}
                onRowClick={(row) => setSelectedRow(row)}
                isLoading={bankListQuery.isLoading}
                isFetching={bankListQuery.isFetching}
                onRefresh={() => bankListQuery.refetch()}
                onMobileRowOpen={openMobileActionSheet}
                autoFillGrid="True"
              />
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
              <h2 className="text-sm font-bold text-gray-800">Bank Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.bankCode} {selectedMobileRow?.bankTypeName ? `- ${selectedMobileRow.bankTypeName}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleEdit(selectedMobileRow)}
                className="global-ref-td-button-edit-ui-mobile"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(selectedMobileRow);
                }}
                className="global-ref-td-button-delete-ui-mobile"
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span className="md:hidden">Delete</span>
              </button>

              <button
                onClick={closeMobileActionSheet}
                className="global-ref-td-button-cancel-ui-mobile"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SearchBankRef isOpen={isBankTypeModalOpen} onClose={(v) => { if (v) { setField("bankTypeCode", v.bankTypeCode); setField("bankTypeName", v.bankTypeName); } setBankTypeModalOpen(false); }} />
      <SearchCOAMast isOpen={isAccountModalOpen} onClose={(v) => { if (v) { setField("acctCode", v.acctCode); setField("acctName", v.acctName); } setAccountModalOpen(false); }} />
    </div>
  );
};

export default BankMast;
