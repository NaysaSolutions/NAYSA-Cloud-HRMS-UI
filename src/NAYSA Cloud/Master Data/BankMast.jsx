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
import BankRef from "../Reference File/BankRef";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import SearchBankRef from "@/NAYSA Cloud/Lookup/SearchBankRef.jsx";
import SearchCOAMast from "../Lookup/SearchCOAMast";
import SearchCurrencyRef from "../Lookup/SearchCurrRef";

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
  const documentTitle = reftables?.[docType] || "Bank Master";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const bankRefTabRef = useRef(null);
  const bankCodeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [isDupCode, setIsDupCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [isBankTypeModalOpen, setBankTypeModalOpen] = useState(false);
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [isCurrencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [activeTab, setActiveTab] = useState("bamast");
  const [form, setForm] = useState(DEFAULT_FORM);

  // --- MOBILE ACTION SHEET STATES ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = (next = DEFAULT_FORM) => setForm(next);

  const tabs = useMemo(
    () => [
      { id: "bamast", label: "Bank Master Data" },
      { id: "banktypes", label: "Bank Types" },
    ],
    []
  );

  const activeHeaderTitle =
    activeTab === "banktypes" ? "Bank Type Codes" : "Bank Master Data";

  useEffect(() => {
    document.title = activeHeaderTitle || documentTitle;
  }, [activeHeaderTitle, documentTitle]);

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
    setSelectedRow(null);
    setIsDupCode(false);
    setTimeout(() => bankCodeInputRef.current?.focus?.(), 0);
  };

  const handleReset = () => {
    resetForm(DEFAULT_FORM);
    setIsEditing(false);
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
      userCode: user?.USER_CODE || "ADMIN",
    });
  };

  const handleEdit = async (row) => {
    try {
      const res = await apiClient.get("/getBank", {
        params: { bankCode: row.bankCode },
      });
      const record = extractRows(res)?.[0];
      resetForm({ ...DEFAULT_FORM, ...record, __existing: true });
      setIsEditing(true);
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
        label: <span className="hidden md:inline">Actions</span>,
        sortable: false,
        width: 100,
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
              className="global-ref-td-button-edit-ui"
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
              className="global-ref-td-button-delete-ui"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "bankCode", label: "Bank Code", sortable: true, width: 100, minWidth: 100, requiredVisible: true },
      { key: "bankTypeCode", label: "Bank Type", sortable: true, width: 150, minWidth: 150, requiredVisible: true },
      { key: "acctCode", label: "Account Code", sortable: true, width: 150, minWidth: 150 },
      { key: "acctName", label: "Account Name", sortable: true, width: 150, minWidth: 150, maxWidth: 300 },
      { key: "bankAcctNo", label: "Bank Account No.", sortable: true, width: 150, minWidth: 150 },
      { key: "bankAcctType", label: "Account Type", sortable: true, width: 150, minWidth: 150 },
      { key: "autoCk", label: "Auto Generated", sortable: true, width: 150, minWidth: 150},
      { key: "startCheckNo", label: "Start Check No.", sortable: true, width: 150, minWidth: 150 },
      { key: "lastCheckNo", label: "Last Check No.", sortable: true, width: 150, minWidth: 150 },
      { key: "currCode", label: "Currency", sortable: true, width: 100, minWidth: 100 },
      { key: "bankBranch", label: "Branch", sortable: true, width: 80, minWidth: 80 },
      {
        key: "fullAddress",
        label: "Address",
        sortable: false,
        render: (row) => `${row.bankAddr1 || ""} ${row.bankAddr2 || ""}`.trim(),
        width: 250,
        minWidth: 100
      },
      { key: "bankContact", label: "Contact Person", sortable: true, width: 150, minWidth: 150 },
      { key: "bankTelNo", label: "Contact No.", sortable: true, width: 120, minWidth: 120 },
      { key: "bankPosition", label: "Position", sortable: true, width: 100, minWidth: 100 },
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
              label: <span className="sm:inline ml-1">Add</span>,
              icon: faPlus,
              onClick: startNew,
              disabled: isEditing,
              className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                ${isEditing
                  ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                }`,
            },
            {
              key: "save",
              label: <span className="sm:inline ml-1">Save</span>,
              icon: faSave,
              onClick: handleSave,
              disabled: !isEditing || saveMutation.isPending || isDupCode,
              className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                ${(!isEditing || saveMutation.isPending || isDupCode)
                  ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                }`,
            },
            {
              key: "reset",
              label: <span className="sm:inline ml-1">Reset</span>,
              icon: faUndo,
              onClick: handleReset,
              disabled: saveMutation.isPending,
              className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                ${saveMutation.isPending
                  ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                }`,
            },
          ]}
        />
      </div>

      <div ref={guideRef} className="relative">
        <button
          type="button"
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
              type="button"
              onClick={() => { window.open(pdfLink, "_blank"); setOpenGuide(false); }}
              className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
            </button>
            <button
              type="button"
              onClick={() => { window.open(videoLink, "_blank"); setOpenGuide(false); }}
              className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
            >
              <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const bankTypeButtons = (
    <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
      <div className="flex flex-wrap justify-center md:justify-end gap-2">
        <ButtonBar
          buttons={[
            {
              key: "add",
              label: <span className="sm:inline ml-1">Add</span>,
              icon: faPlus,
              onClick: () => bankRefTabRef.current?.startNew?.(),
              className:
                "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
            },
            {
              key: "save",
              label: <span className="sm:inline ml-1">Save</span>,
              icon: faSave,
              onClick: () => bankRefTabRef.current?.save?.(),
              className:
                "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
            },
            {
              key: "reset",
              label: <span className="sm:inline ml-1">Reset</span>,
              icon: faUndo,
              onClick: () => bankRefTabRef.current?.reset?.(),
              className:
                "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
            },
          ]}
        />
      </div>
    </div>
  );

  const activeHeaderButtons = activeTab === "banktypes" ? bankTypeButtons : bankMastButtons;
  const showGlobalLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  return (
    <div className="global-ref-main-div-ui mt-16">
      {showGlobalLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <h1 className="global-ref-headertext-ui">{activeHeaderTitle}</h1>
        <div className="flex flex-wrap gap-1 overflow-x-hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`mr-1 flex items-center rounded-md px-3 py-2 text-xs font-bold transition-colors duration-200 md:text-sm ${activeTab === t.id ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"}`}
            >
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>
        {activeHeaderButtons}
      </div>

      <div className="global-tran-tab-div-ui mt-8 p-6" style={{ minHeight: "calc(100vh - 170px)" }}>
        {activeTab === "banktypes" ? (
          <BankRef ref={bankRefTabRef} embedded activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <div className="rounded-xl border bg-white p-6 shadow-sm md:col-span-10">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  <div className="flex flex-col gap-4">
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
                      label="Account Code"
                      type="lookup"
                      value={form.acctCode}
                      onLookup={() => setAccountModalOpen(true)}
                      disabled={!isEditing}
                      required
                      readOnly
                    />

                    <FieldRenderer label="Account Name" value={form.acctName} readOnly disabled={!isEditing} />

                    <FieldRenderer
                      label="Bank Account No."
                      value={form.bankAcctNo}
                      maxLength={50}
                      onChange={(val) => setField("bankAcctNo", String(val).replace(/-/g, "").slice(0, 50))}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <FieldRenderer
                      label="Bank Account Type"
                      type="select"
                      value={form.bankAcctType}
                      onChange={(val) => setField("bankAcctType", val)}
                      options={[{ value: "SA", label: "Savings Account" }, { value: "CA", label: "Current Account" }]}
                      disabled={!isEditing}
                      required
                    />

                    <FieldRenderer
                      label="Auto Generated?"
                      type="select"
                      value={form.autoCk}
                      onChange={(val) => setField("autoCk", val)}
                      options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
                      disabled={!isEditing}
                    />

                    <FieldRenderer
                      label="Start Check No."
                      value={form.startCheckNo}
                      maxLength={30}
                      onChange={(val) => setField("startCheckNo", String(val).replace(/-/g, "").slice(0, 30))}
                      disabled={!isEditing || form.autoCk === "N"}
                    />

                    <FieldRenderer
                      label="Last Check No."
                      value={form.lastCheckNo}
                      maxLength={30}
                      onChange={(val) => setField("lastCheckNo", String(val).replace(/-/g, "").slice(0, 30))}
                      disabled={!isEditing || form.autoCk === "N"}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <FieldRenderer
                      label="Currency"
                      type="lookup"
                      value={form.currCode ? `${form.currCode} - ${form.currName || ""}` : ""}
                      onLookup={() => setCurrencyModalOpen(true)}
                      disabled={!isEditing}
                      required
                      readOnly
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

                    <FieldRenderer
                      label="Bank Branch"
                      value={form.bankBranch}
                      maxLength={100}
                      onChange={(val) => setField("bankBranch", String(val).slice(0, 100))}
                      disabled={!isEditing}
                    />

                    <FieldRenderer
                      label="Contact Person"
                      value={form.bankContact}
                      maxLength={100}
                      onChange={(val) => setField("bankContact", String(val).slice(0, 100))}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <FieldRenderer
                      label="Address 1"
                      value={form.bankAddr1}
                      maxLength={100}
                      onChange={(val) => setField("bankAddr1", String(val).slice(0, 100))}
                      disabled={!isEditing}
                    />
                    <FieldRenderer
                      label="Address 2"
                      value={form.bankAddr2}
                      maxLength={100}
                      onChange={(val) => setField("bankAddr2", String(val).slice(0, 100))}
                      disabled={!isEditing}
                    />
                    <FieldRenderer
                      label="Contact No."
                      value={form.bankTelNo}
                      maxLength={20}
                      onChange={(val) => setField("bankTelNo", String(val).slice(0, 20))}
                      disabled={!isEditing}
                    />
                    <FieldRenderer
                      label="Position"
                      value={form.bankPosition}
                      maxLength={20}
                      onChange={(val) => setField("bankPosition", String(val).slice(0, 20))}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2"><RegistrationInfo data={form} layout="stacked" /></div>
            </div>

            <div className="global-tran-table-main-div-ui relative mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={docType}
                columns={columns}
                data={banks}
                itemsPerPage={200}
                showFilters
                onRowDoubleClick={handleEdit}
                selectedRow={selectedRow}
                onRowClick={(row) => setSelectedRow(row)}
                isLoading={bankListQuery.isLoading}
                isFetching={bankListQuery.isFetching}
                onRefresh={() => bankListQuery.refetch()}
                onMobileRowOpen={openMobileActionSheet}
              />
            </div>
          </>
        )}
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
      <SearchCurrencyRef isOpen={isCurrencyModalOpen} onClose={(v) => { if (v) { setField("currCode", v.currCode); setField("currName", v.currName); } setCurrencyModalOpen(false); }} />
    </div>
  );
};

export default BankMast;