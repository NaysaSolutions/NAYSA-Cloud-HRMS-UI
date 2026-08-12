// src/NAYSA Cloud/Master Data/FAMasterData/ReferenceCodes/FALocationCodes.jsx

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
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

/* ================= HELPERS ================= */

const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-sm border border-slate-200 rounded-md flex flex-col ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-[11px] font-bold text-slate-700 tracking-wide border-b border-slate-200 pb-1.5">
      {title}
    </div>
  </div>
);

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "string") {
    try { return JSON.parse(res) || []; } catch { return []; }
  }
  return [];
};

const normalizeRecord = (record = {}) => ({
  code:            record.code ?? record.locCode ?? record.loc_code ?? record.LOC_CODE ?? "",
  description:     record.description ?? record.locName ?? record.loc_name ?? record.locDesc ?? record.loc_description ?? record.LOC_NAME ?? "",
  branchCode:      record.branchCode ?? record.branch_code ?? record.BRANCH_CODE ?? "",
  branchName:      record.branchName ?? record.branch_name ?? record.BRANCH_NAME ?? "",
  registeredBy:    record.registeredBy ?? record.registered_by ?? "",
  registeredDate:  record.registeredDate ?? record.registered_date ?? "",
  lastUpdatedBy:   record.lastUpdatedBy ?? record.updatedBy ?? record.updated_by ?? "",
  lastUpdatedDate: record.lastUpdatedDate ?? record.updatedDate ?? record.updated_date ?? "",
  __existing:      Boolean(record.__existing),
});

/* ================= DEFAULT FORM ================= */

const DEFAULT_FORM = {
  code:            "",
  description:     "",
  branchCode:      "",
  branchName:      "",
  registeredBy:    "",
  registeredDate:  "",
  lastUpdatedBy:   "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const FALocationCodes = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd     = true,
  canEdit    = true,
  canSave    = true,
  canDelete  = true,
}, ref) => {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  const codeInputRef      = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm]               = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing]     = useState(false);
  const [isDupCode, setIsDupCode]     = useState(false);
  const [search, setSearch]           = useState("");

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const resetForm = useCallback((next = DEFAULT_FORM) => { setForm(next); }, []);

  const showReadOnlyAlert = useCallback(async (action = "perform this action") => {
    await useSwalErrorAlert("Read Only", `You are not allowed to ${action}.`);
  }, []);

  /* ================= LOAD LIST ================= */

  const locListQuery = useQuery({
    queryKey: ["faLocList"],
    queryFn: async () => {
      const res = await apiClient.get("/faLoc");
      return extractRows(res).map(normalizeRecord);
    },
  });

  const locations        = useMemo(() => locListQuery.data || [], [locListQuery.data]);
  const isInitialLoading = locListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    try {
      const res = await apiClient.post("/checkDuplicateFALoc", {
        json_data: { code: c },
      });

      const row0 = res?.data?.data?.[0] || res?.data?.[0] || {};
      const raw = row0?.result ?? row0?.[""] ?? "0";

      if (typeof raw === "string" && raw.trim().startsWith("{")) {
        return String(JSON.parse(raw)?.result ?? "0") === "1";
      }

      return String(raw).trim() === "1";
    } catch {
      return locations.some((item) =>
        String(item.code || "").toUpperCase() === c.toUpperCase()
      );
    }
  };

  /* ================= VALIDATE CODE ================= */

  const handleCodeValidate = async (arg) => {
    const isEvent = arg && typeof arg === "object" && "type" in arg;

    if (isEvent && arg.type === "keydown") {
      if (arg.key !== "Enter") return;
      enterValidatedRef.current = true;
    }

    if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
      enterValidatedRef.current = false;
      return;
    }

    const code = String(form.code || "").trim();
    if (!code || !isEditing || form.__existing) return;

    const dup = await checkDuplicate(code);
    if (dup) {
      setIsDupCode(true);
      await useSwalErrorAlert("Duplicate Entry", `Location Code "${code}" already exists.`);
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertFALoc", {
        json_data: JSON.stringify({
          json_data: {
            code:        payload.code,
            description: payload.description,
            branchCode:  payload.branchCode,
            userCode:    payload.userCode,
          },
        }),
      });
    },
    onSuccess: async (response) => {
      const row        = response?.data?.data?.[0] || response?.data || {};
      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg   = String(row?.errormsg   ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Validation Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["faLocList"] });
      await useSwalSuccessAlert("Success!", "Location Code saved successfully.");

      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
    },
    onError: async (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errormsg ||
        error?.message ||
        "Failed to save Location code.";
      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await showReadOnlyAlert("save location codes");
      return;
    }
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code:        String(form.code        || "").trim().toUpperCase(),
      description: String(form.description || "").trim(),
      branchCode:  String(form.branchCode  || "").trim().toUpperCase(),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode, isReadOnly, canSave, showReadOnlyAlert]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteFALoc", {
        json_data: { code, userCode },
      });
    },
    onSuccess: async (_, deletedCode) => {
      queryClient.invalidateQueries({ queryKey: ["faLocList"] });
      await useSwalDeleteRecord(
        "Deleted",
        `Location Code "${deletedCode}" has been successfully removed.`
      );
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
    },
    onError: async (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errormsg ||
        error?.message ||
        "Failed to delete Location code.";
      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(async (row) => {
    if (isReadOnly || !canDelete) {
      await showReadOnlyAlert("delete location codes");
      return;
    }

    const code = row?.code || row?.locCode;
    if (!code) return;

    try {
      const checkRes = await apiClient.post("/checkInUsedFALoc", {
        json_data: { code },
      });
      const rawResult = String(
        checkRes?.data?.data?.[0]?.result ??
        checkRes?.data?.[0]?.result ??
        "0"
      ).trim();
      const result = rawResult.startsWith("{")
        ? String(JSON.parse(rawResult)?.result ?? "0")
        : rawResult;

      if (result === "1") {
        await useSwalErrorAlert(
          "Cannot Delete",
          `Location Code "${code}" is currently in use and cannot be deleted.`
        );
        return;
      }
    } catch {
      await useSwalErrorAlert("Error", "Failed to check if record is in use.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete Record?",
      `Are you sure you want to delete "${code}"?`
    );
    if (!confirm?.isConfirmed) return;

    deleteMutation.mutate(code);
  }, [deleteMutation, isReadOnly, canDelete, showReadOnlyAlert]);

  /* ================= EDIT / RETRIEVE ================= */

  const fillFormFromRow = useCallback((row) => {
    if (!row) return;
    setForm({ ...normalizeRecord(row), __existing: true });
    setSelectedRow(row);
    setIsDupCode(false);
  }, []);

  const handleRetrieve = useCallback((row) => {
    fillFormFromRow(row);
    setIsEditing(false);
  }, [fillFormFromRow]);

  const handleEdit = useCallback(async (row) => {
    if (isReadOnly || !canEdit) {
      await showReadOnlyAlert("edit location codes");
      return;
    }
    fillFormFromRow(row);
    setIsEditing(true);
  }, [isReadOnly, canEdit, showReadOnlyAlert, fillFormFromRow]);

  const handleRowDoubleClick = useCallback((row) => {
    if (isReadOnly || !canEdit) {
      handleRetrieve(row);
      return;
    }
    fillFormFromRow(row);
    setIsEditing(true);
  }, [isReadOnly, canEdit, handleRetrieve, fillFormFromRow]);

  /* ================= LOADING ================= */

  const isLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  /* ================= TABLE COLUMNS ================= */

  const tableColumns = useMemo(() => [
    {
      key: "__actions",
      label: <span className="hidden md:inline">Actions</span>,
      width: 90,
      render: (row) => (
        <div className="flex gap-2 justify-center w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            disabled={isReadOnly || !canEdit}
            className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
              isReadOnly || !canEdit
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
            }`}
            title={isReadOnly || !canEdit ? "Read only" : "Edit"}
          >
            <FontAwesomeIcon icon={faEdit} />
            <span className="md:hidden">Edit</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            disabled={isReadOnly || !canDelete}
            className={`flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 rounded-md border transition-colors text-xs ${
              isReadOnly || !canDelete
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
            }`}
            title={isReadOnly || !canDelete ? "Read only" : "Delete"}
          >
            <FontAwesomeIcon icon={faTrashAlt} />
            <span className="md:hidden">Delete</span>
          </button>
        </div>
      ),
    },
    { key: "code",        label: "Location Code",               sortable: true, width: 150 },
    { key: "description", label: "Location Description / Name", sortable: true, width: 280 },
    { key: "branchCode",  label: "Branch Code",                 sortable: true, width: 120 },
    { key: "branchName",  label: "Branch Name",                 sortable: true, width: 200 },
  ], [handleEdit, handleDelete, isReadOnly, canEdit, canDelete]);

  /* ================= TABLE DATA ================= */

  const tableData = useMemo(() => {
    const list = Array.isArray(locations) ? locations : [];

    const mapped = list.map((row, index) => ({
      ...normalizeRecord(row),
      ...row,
      code:        row.code        || row.locCode || row.loc_code || "",
      description: row.description || row.locName || row.loc_name || row.locDesc || row.loc_description || "",
      branchCode:  row.branchCode  || row.branch_code || "",
      branchName:  row.branchName  || row.branch_name || "",
      __idx: index,
    }));

    return mapped.filter((row) => {
      const s = String(search || "").trim().toLowerCase();
      if (!s) return true;
      return (
        String(row.code        || "").toLowerCase().includes(s) ||
        String(row.description || "").toLowerCase().includes(s) ||
        String(row.branchCode  || "").toLowerCase().includes(s) ||
        String(row.branchName  || "").toLowerCase().includes(s)
      );
    });
  }, [locations, search]);

  /* ================= EXPOSE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: !isReadOnly && canSave && isEditing && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange, isReadOnly, canSave]);

  useImperativeHandle(ref, () => ({
    add: async () => {
      if (isReadOnly || !canAdd) {
        await showReadOnlyAlert("add location codes");
        return;
      }
      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm({ ...DEFAULT_FORM, __existing: false });
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    },
    save:  handleSave,
    reset: () => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
  }), [isReadOnly, canAdd, handleSave, resetForm, showReadOnlyAlert]);

  /* ================= RENDER ================= */

  return (
    <div className="flex flex-col h-full gap-3 w-full relative">

      {isLoading && <LoadingSpinner />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 shrink-0">
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">
            <FieldRenderer
              label="Location Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              maxLength={20}
              onChange={(v) => setField("code", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={isReadOnly || !isEditing || form.__existing}
            />

            <FieldRenderer
              label="Location Description"
              required
              value={form.description}
              maxLength={150}
              onChange={(v) => setField("description", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />

            <FieldRenderer
              label="Branch Code"
              required
              value={form.branchCode}
              maxLength={10}
              onChange={(v) => {
                setField("branchCode", String(v ?? "").toUpperCase());
                setField("branchName", "");
              }}
              disabled={isReadOnly || !isEditing}
            />

            <FieldRenderer
              label="Branch Name"
              value={form.branchName}
              readOnly
              disabled
            />
          </div>
        </Card>

        <RegistrationInfo data={form} layout="stacked" />
      </div>

      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="Location Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid
        />
      </div>
    </div>
  );
});

FALocationCodes.displayName = "FALocationCodes";
export default FALocationCodes;
