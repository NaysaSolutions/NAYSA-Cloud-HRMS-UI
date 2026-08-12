import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Undo2, Edit, Trash2, Info } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
  useSwalInfoAlert,
  useSwalConfirmAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchRCMast from "../Lookup/SearchRCMast";
import SearchCOAMast from "../Lookup/SearchCOAMast";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

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
  billCode: "",
  billName: "",
  uomCode: "",
  billingClass: "",
  unitPriceRequired: "N",
  rcCode: "",
  rcName: "",
  arAcct: "",
  arName: "",
  salesAcct: "",
  salesName: "",
  vatAcct: "",
  vatName: "",
  advancesAcct: "",
  advancesName: "",
  sDiscAcct: "",
  sDiscName: "",

  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",

  __existing: false,
};

const toYN = (v, def = "N") => {
  const x = String(v ?? "")
    .trim()
    .toUpperCase();
  if (x === "Y" || x === "YES" || x === "TRUE" || x === "1") return "Y";
  if (x === "N" || x === "NO" || x === "FALSE" || x === "0") return "N";
  return def;
};

/* ================= COMPONENT ================= */

const BillCodeRef = React.forwardRef((props, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const docType = "BillCode";
  const documentTitle = reftables?.[docType];
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[docType];
  const videoLink = reftablesVideoGuide?.[docType];

  const billCodeInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isRCModalOpen, setRCModalOpen] = useState(false);
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [activeAccountField, setActiveAccountField] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);

  // --- MOBILE ACTION SHEET STATES ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] =
    useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const resetForm = (next = DEFAULT_FORM) => setForm(next);

  const handleOpenAccountLookup = (fieldName) => {
    setActiveAccountField(fieldName);
    setAccountModalOpen(true);
  };

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

  /* ================= DUPLICATE & USAGE CHECKS ================= */

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

  const checkDuplicate = async (billCode) => {
    const c = String(billCode || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkDuplicatebillCode", {
      json_data: { billCode: c },
    });

    return parseResultFlag(res);
  };

  const checkInUsed = async (billCode) => {
    const c = String(billCode || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkInUsedbillCode", {
      json_data: { billCode: c },
    });

    return parseResultFlag(res);
  };

  const startNew = () => {
    resetForm(DEFAULT_FORM);
    setIsEditing(true);
    setSelectedRow(null);
    setTimeout(() => billCodeInputRef.current?.focus?.(), 0);
  };

  const handleReset = () => {
    resetForm(DEFAULT_FORM);
    setIsEditing(false);
    setSelectedRow(null);
  };

  /* ================= TANSTACK QUERY ================= */

  const billCodeListQuery = useQuery({
    queryKey: ["billCodeList"],
    queryFn: async () => {
      const res = await apiClient.get("/billCode");
      return extractRows(res);
    },
    // ✅ ADDED: Force fresh data on load and auto-sync every 30s
    staleTime: 0,
    refetchInterval: 1000 * 30,
  });

  const billCodes = useMemo(
    () => billCodeListQuery.data || [],
    [billCodeListQuery.data],
  );

  const isInitialLoading = billCodeListQuery.isLoading;

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertbillCode", {
        json_data: payload,
      });
    },
    onSuccess: async (response) => {
      const row0 = response?.data?.data?.[0] || {};
      const errorcount = Number(row0.errorcount ?? row0.ERRORCOUNT ?? 0);
      const errormsg = String(row0.errormsg ?? row0.ERRORMSG ?? "");

      if (errorcount > 0) {
        useSwalErrorAlert(
          "Missing Fields",
          errormsg || "Failed to save Bill Code.",
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["billCodeList"] });
      useSwalSuccessAlert("Success!", "Bill Code saved successfully.");
      setIsEditing(false);
      resetForm(DEFAULT_FORM);
      setSelectedRow(null);
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.response?.data?.message || error?.message || "Save failed.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (billCode) => {
      return apiClient.post("/deletebillCode", {
        json_data: { billCode },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billCodeList"] });
      useSwalDeleteRecord("Deleted!", "Record has been successfully removed.");
      handleReset();
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.response?.data?.message || error?.message || "Delete failed.",
      );
    },
  });

  /* ================= ACTIONS ================= */

  const handleSave = async () => {
    if (!isEditing || saveMutation.isPending) return;

    const billCode = String(form.billCode || "")
      .trim()
      .toUpperCase();
    const billName = String(form.billName || "").trim();
    const uomCode = String(form.uomCode || "").trim();
    const rcCode = String(form.rcCode || "").trim();
    const arAcct = String(form.arAcct || "").trim();
    const salesAcct = String(form.salesAcct || "").trim();
    const vatAcct = String(form.vatAcct || "").trim();

    try {
      if (!form.__existing) {
        const isDup = await checkDuplicate(billCode);
        if (isDup) {
          useSwalErrorAlert("Duplicate Entry", "Bill Code already exists.");
          setField("billCode", "");
          setTimeout(() => billCodeInputRef.current?.focus?.(), 0);
          return;
        }
      }

      const {
        __existing,
        registeredBy,
        registeredDate,
        updatedBy,
        updatedDate,
        ...payload
      } = form;

      saveMutation.mutate({
        ...payload,
        billCode,
        billName,
        uomCode,
        rcCode,
        arAcct,
        salesAcct,
        vatAcct,
        unitPriceRequired: toYN(form.unitPriceRequired, "N"),
        userCode: user?.USER_CODE || "ADMIN",
      });
    } catch (error) {
      useSwalErrorAlert(
        "System Error",
        error?.message || "Failed to save Bill Code.",
      );
    }
  };

  const handleEdit = async (row) => {
    const code = row?.billCode ?? row?.BILLCODE ?? row?.bill_code ?? "";

    if (!String(code).trim()) {
      useSwalErrorAlert("Error", "Selected row has no Bill Code.");
      return;
    }

    try {
      const res = await apiClient.get("/getbillCode", {
        params: { billCode: code },
      });

      const record = extractRows(res)?.[0] || row;

      resetForm({
        ...DEFAULT_FORM,
        ...record,
        __existing: true,
      });

      setIsEditing(true);
      setSelectedRow(row);
      closeMobileActionSheet(); // ensure it closes if opened from action sheet
    } catch (error) {
      useSwalErrorAlert(
        "System Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch record.",
      );
    }
  };

  const handleDelete = async (row) => {
    const code = String(row?.billCode || "").trim();
    const name = String(row?.billName || "").trim();

    if (!code) {
      useSwalErrorAlert("Error", "No Bill Code selected.");
      return;
    }

    try {
      const isUsed = await checkInUsed(code);

      if (isUsed) {
        useSwalErrorAlert(
          "Cannot Delete",
          `Bill Code "${code}" is already in use.`,
        );
        return;
      }

      const confirm = await useSwalDeleteConfirm(
        "Delete Record?",
        `Are you sure you want to delete Bill Code "${code}${name ? ` - ${name}` : ""}"?`,
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
  };

  const handleOpenInfo = async () => {
    const messages = [];

    if (pdfLink) messages.push(`PDF Guide: ${pdfLink}`);
    if (videoLink) messages.push(`Video Guide: ${videoLink}`);

    if (!messages.length) {
      useSwalInfoAlert("Info", "No guide available for this page.");
      return;
    }

    useSwalInfoAlert("Reference Information", messages.join("\n"));
  };

  /* ================= TABLE COLUMNS ================= */

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        sortable: false,
        renderType: "actions",
        width: 100,
        render: (row) => (
          <div className="flex items-center justify-center gap-3">
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors text-xs"
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
        key: "billCode",
        label: "Bill Code",
        sortable: true,
        className: "sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]",
        width: 100, 
        minWidth: 100,
        requiredVisible: true 
      },
      {
        key: "billName",
        label: "Bill Name",
        sortable: true,
        className:
          "sticky left-[120px] z-10 shadow-[1px_0_0_0_#e2e8f0]",
        requiredVisible: true ,
        width: 250, 
        maxWidth: 300, 
        minWidth: 100
      },
      {
        key: "uomCode",
        label: "UOM",
        sortable: true,
        className:
          "sticky left-[300px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
        width: 100, 
        minWidth: 100,
      },
      { key: "billingClass", label: "Billing Class", sortable: true, width: 100, minWidth: 100 },
      {
        key: "unitPriceRequired",
        label: "Unit Price Required?",
        sortable: true,
        render: (row) =>
          String(row.unitPriceRequired).toUpperCase() === "Y" ? "Yes" : "No",
        width: 100, 
        minWidth: 100,
      },
      { key: "rcCode", label: "RC Code", sortable: true, width: 100, minWidth: 100 },
      { key: "arAcct", label: "AR Account", sortable: true, width: 100, minWidth: 100 },
      { key: "salesAcct", label: "Sales Account", sortable: true, width: 100, minWidth: 100 },
      { key: "vatAcct", label: "VAT Account", sortable: true, width: 100, minWidth: 100 },
      { key: "advancesAcct", label: "Advances Account", sortable: true, width: 100, minWidth: 100 },
      { key: "sDiscAcct", label: "Discount Account", sortable: true, width: 100, minWidth: 100 },
    ],
    [handleEdit, handleDelete, isMobile, openMobileActionSheet],
  );

  React.useImperativeHandle(ref, () => ({
    startNew,
    save: handleSave,
    reset: handleReset,
    openInfo: handleOpenInfo,
  }));

  const headerButtons = (
    <div className="flex w-full flex-wrap items-center justify-center gap-1.5 lg:w-auto lg:justify-end">
      <button
        type="button"
        onClick={startNew}
        className={`flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 sm:w-auto sm:px-4 ${
          isEditing ? "cursor-not-allowed opacity-50" : ""
        }`}
        disabled={isEditing}
        title="Add"
      >
        <Plus size={14} />
        <span className="hidden sm:inline ml-1">Add</span>
      </button>

      <button
        type="button"
        onClick={handleSave}
        className={`flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 sm:w-auto sm:px-4 ${
          !isEditing || saveMutation.isPending
            ? "cursor-not-allowed opacity-50"
            : ""
        }`}
        disabled={!isEditing || saveMutation.isPending}
        title="Save"
      >
        <Save size={14} />
        <span className="hidden sm:inline ml-1">Save</span>
      </button>

      <button
        type="button"
        onClick={handleReset}
        className={`flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-blue-600 sm:w-auto sm:px-4 ${
          saveMutation.isPending ? "cursor-not-allowed opacity-50" : ""
        }`}
        disabled={saveMutation.isPending}
        title="Reset"
      >
        <Undo2 size={14} />
        <span className="hidden sm:inline ml-1">Reset</span>
      </button>

      <div ref={guideRef} className="relative z-[60]">
        <button
          type="button"
          onClick={() => setOpenGuide((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 sm:w-auto sm:px-4"
          title="Information"
        >
          <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
          <span className="hidden sm:inline ml-1">Info</span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="hidden sm:inline ml-1 text-[10px] opacity-80"
          />
        </button>

        {isOpenGuide && (
          <div className="absolute right-0 z-[60] mt-2 w-52 overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-black/10 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => {
                window.open(pdfLink, "_blank");
                setOpenGuide(false);
              }}
              className="block w-full border-b border-gray-100 px-4 py-2 text-left text-xs transition-colors hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-900"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
              PDF Guide
            </button>
            <button
              type="button"
              onClick={() => {
                window.open(videoLink, "_blank");
                setOpenGuide(false);
              }}
              className="block w-full px-4 py-2 text-left text-xs transition-colors hover:bg-blue-50 dark:hover:bg-blue-900"
            >
              <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" />
              Video Guide
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="global-ref-main-div-ui">
      {(isInitialLoading ||
        saveMutation.isPending ||
        deleteMutation.isPending) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col items-center justify-between gap-3 lg:flex-row">
          <div className="w-full min-w-0 text-center lg:w-auto lg:text-left">
            <h1 className="global-ref-headertext-ui truncate">
              {documentTitle}
            </h1>
          </div>

          <div className="flex w-full flex-shrink-0 flex-wrap items-center justify-center gap-1.5 lg:w-auto lg:justify-end">
            {headerButtons}
          </div>
        </div>
      </div>

      <div
        className="global-tran-tab-div-ui mt-24 p-6 sm:mt-20"
        style={{ minHeight: "calc(100vh - 170px)" }}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="rounded-xl border bg-white p-6 shadow-sm md:col-span-10">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="Bill Code"
                  value={form.billCode}
                  inputRef={billCodeInputRef}
                  onChange={(val) =>
                    setField("billCode", String(val || "").toUpperCase())
                  }
                  maxLength={10}
                  onBlur={async () => {
                    if (!isEditing || form.__existing) return;
                    const isDup = await checkDuplicate(form.billCode);
                    if (isDup) {
                      useSwalErrorAlert(
                        "Duplicate Entry",
                        "Bill Code already exists.",
                      );
                      setField("billCode", "");
                      setTimeout(() => billCodeInputRef.current?.focus?.(), 0);
                    }
                  }}
                  disabled={!isEditing || form.__existing}
                  required
                />

                <FieldRenderer
                  label="Bill Name"
                  value={form.billName}
                  maxLength={100}
                  onChange={(val) => setField("billName", val)}
                  disabled={!isEditing}
                  required
                />

                <FieldRenderer
                  label="UOM"
                  value={form.uomCode}
                  maxLength={10}
                  onChange={(val) => setField("uomCode", val)}
                  disabled={!isEditing}
                  required
                />

                <FieldRenderer
                  label="Billing Class"
                  value={form.billingClass}
                  maxLength={20}
                  onChange={(val) => setField("billingClass", val)}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="Unit Price Required?"
                  type="select"
                  value={form.unitPriceRequired}
                  maxLength
                  onChange={(val) => setField("unitPriceRequired", val)}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  disabled={!isEditing}
                />

                <FieldRenderer
                  type="lookup"
                  label="RC Code"
                  value={
                    form.rcCode
                      ? `${form.rcCode}${form.rcName ? ` - ${form.rcName}` : ""}`
                      : ""
                  }
                  maxLength={25}
                  onChange={(val) => setField("rcCode", val)}
                  onLookup={() => setRCModalOpen(true)}
                  disabled={!isEditing}
                  required
                />

                <FieldRenderer
                  label="AR Account"
                  type="lookup"
                  value={
                    form.arAcct
                      ? `${form.arAcct}${form.arName ? ` - ${form.arName}` : ""}`
                      : ""
                  }
                  maxLength={25}
                  onChange={(val) => setField("arAcct", val)}
                  onLookup={() => handleOpenAccountLookup("arAcct")}
                  disabled={!isEditing}
                  required
                />

                <FieldRenderer
                  label="Sales Account"
                  type="lookup"
                  value={
                    form.salesAcct
                      ? `${form.salesAcct}${form.salesName ? ` - ${form.salesName}` : ""}`
                      : ""
                  }
                  maxLength={25}
                  onChange={(val) => setField("salesAcct", val)}
                  onLookup={() => handleOpenAccountLookup("salesAcct")}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="VAT Account"
                  type="lookup"
                  value={
                    form.vatAcct
                      ? `${form.vatAcct}${form.vatName ? ` - ${form.vatName}` : ""}`
                      : ""
                  }
                  maxLength={25}
                  onChange={(val) => setField("vatAcct", val)}
                  onLookup={() => handleOpenAccountLookup("vatAcct")}
                  disabled={!isEditing}
                  required
                />

                <FieldRenderer
                  label="Advances Account"
                  type="lookup"
                  value={
                    form.advancesAcct
                      ? `${form.advancesAcct}${form.advancesName ? ` - ${form.advancesName}` : ""}`
                      : ""
                  }
                  maxLength={25}
                  onChange={(val) => setField("advancesAcct", val)}
                  onLookup={() => handleOpenAccountLookup("advancesAcct")}
                  disabled={!isEditing}
                />

                <FieldRenderer
                  label="Discount Account"
                  type="lookup"
                  value={
                    form.sDiscAcct
                      ? `${form.sDiscAcct}${form.sDiscName ? ` - ${form.sDiscName}` : ""}`
                      : ""
                  }
                  maxLength={25}
                  onChange={(val) => setField("sDiscAcct", val)}
                  onLookup={() => handleOpenAccountLookup("sDiscAcct")}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <RegistrationInfo data={form} layout="stacked" />
          </div>
        </div>

        <div className="global-tran-table-main-div-ui relative mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <SearchGlobalReferenceTable
            docType={docType}
            columns={columns}
            data={billCodes}
            itemsPerPage={50}
            showFilters
            onRowDoubleClick={handleEdit}
            selectedRow={selectedRow}
            onRowClick={(row) => setSelectedRow(row)}
            // ✅ ADDED: Connecting the table to the query for UI feedback
            isLoading={isInitialLoading}
            isFetching={billCodeListQuery.isFetching}
            onRefresh={() => billCodeListQuery.refetch()}
            onMobileRowOpen={openMobileActionSheet} // Piped into global table!
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
              <h2 className="text-sm font-bold text-gray-800">
                Bill Code Actions
              </h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.billCode}{" "}
                {selectedMobileRow?.billName
                  ? `- ${selectedMobileRow.billName}`
                  : ""}
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

      <SearchRCMast
        isOpen={isRCModalOpen}
        onClose={(v) => {
          if (v) {
            setField("rcCode", v.rcCode);
            setField("rcName", v.rcName);
          }
          setRCModalOpen(false);
        }}
      />

      <SearchCOAMast
        isOpen={isAccountModalOpen}
        onClose={(v) => {
          if (v && activeAccountField) {
            const code = v.acctCode;
            const name = v.acctName;

            if (activeAccountField === "arAcct") {
              setForm((prev) => ({ ...prev, arAcct: code, arName: name }));
            } else if (activeAccountField === "salesAcct") {
              setForm((prev) => ({
                ...prev,
                salesAcct: code,
                salesName: name,
              }));
            } else if (activeAccountField === "vatAcct") {
              setForm((prev) => ({ ...prev, vatAcct: code, vatName: name }));
            } else if (activeAccountField === "advancesAcct") {
              setForm((prev) => ({
                ...prev,
                advancesAcct: code,
                advancesName: name,
              }));
            } else if (activeAccountField === "sDiscAcct") {
              setForm((prev) => ({
                ...prev,
                sDiscAcct: code,
                sDiscName: name,
              }));
            }
          }
          setAccountModalOpen(false);
          setActiveAccountField(null);
        }}
      />
    </div>
  );
});

export default BillCodeRef;