// src/NAYSA Cloud/Master Data/FAMasterData/ReferenceCodes/FAClassCodes.jsx

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
import SearchFACateg from "@/NAYSA Cloud/Lookup/SearchFACateg.jsx";
// import SearchFAProfile from "@/NAYSA Cloud/Lookup/SearchFAProfile.jsx";

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

/* ================= DEFAULT FORM ================= */

const DEFAULT_FORM = {
  code:            "",
  description:     "",
  categCode:       "",
  categName:       "",
  eul:             "",
  profileCode:     "",
  profileName:     "",
  salvagePercent:  "",
  registeredBy:    "",
  registeredDate:  "",
  lastUpdatedBy:   "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const FAClassCodes = forwardRef(({
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
  const [isCategOpen, setIsCategOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => { setForm(next); }, []);

  const showReadOnlyAlert = useCallback(async (action = "perform this action") => {
    await useSwalErrorAlert("Read Only", `You are not allowed to ${action}.`);
  }, []);

  /* ================= LOAD LIST ================= */

  const classListQuery = useQuery({
    queryKey: ["faClassList"],
    queryFn: async () => {
      const res = await apiClient.get("/faClass");
      return extractRows(res);
    },
  });

  const classifications  = useMemo(() => classListQuery.data || [], [classListQuery.data]);
  const isInitialLoading = classListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;
    try {
      return classifications.some((item) =>
        String(item.code || item.classCode || "").toUpperCase() === c.toUpperCase()
      );
    } catch { return false; }
  };

  /* ================= VALIDATE CODE (Enter / Blur) ================= */

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
      await useSwalErrorAlert("Duplicate Entry", `Sub Category Code "${code}" already exists.`);
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertFAClass", {
        json_data: JSON.stringify({
          json_data: {
            code:           payload.code,
            description:    payload.description,
            categCode:      payload.categCode,
            eul:            payload.eul,
            profileCode:    payload.profileCode,
            salvagePercent: payload.salvagePercent,
            userCode:       payload.userCode,
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

      queryClient.invalidateQueries({ queryKey: ["faClassList"] });
      await useSwalSuccessAlert("Success!", "Sub Category Code saved successfully.");

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
        "Failed to save Sub Category code.";
      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await showReadOnlyAlert("save sub category codes");
      return;
    }
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code:           String(form.code        || "").trim(),
      description:    String(form.description || "").trim(),
      categCode:      String(form.categCode   || "").trim(),
      eul:            form.eul === "" || form.eul === null ? 0 : Number(form.eul),
      profileCode:    String(form.profileCode || "").trim(),
      salvagePercent: form.salvagePercent === "" || form.salvagePercent === null ? 0 : Number(form.salvagePercent),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode, isReadOnly, canSave, showReadOnlyAlert]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteFAClass", {
        json_data: { code, userCode },
      });
    },
    onSuccess: async (_, deletedCode) => {
      queryClient.invalidateQueries({ queryKey: ["faClassList"] });
      await useSwalDeleteRecord(
        "Deleted",
        `Sub Category Code "${deletedCode}" has been successfully removed.`
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
        "Failed to delete Sub Category code.";
      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(async (row) => {
    if (isReadOnly || !canDelete) {
      await showReadOnlyAlert("delete sub category codes");
      return;
    }

    const code = row?.code || row?.classCode;
    if (!code) return;

    try {
      const checkRes = await apiClient.post("/checkInUsedFAClass", {
        json_data: { code },
      });
      const result = String(
        checkRes?.data?.data?.[0]?.result ??
        checkRes?.data?.[0]?.result ??
        "0"
      ).trim();

      if (result === "1") {
        await useSwalErrorAlert(
          "Cannot Delete",
          `Sub Category Code "${code}" is currently in use and cannot be deleted.`
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
    setForm({
      code:            row.code        || row.classCode   || "",
      description:     row.description || row.classDesc   || row.className || "",
      categCode:       row.categCode   || row.categ_code  || "",
      categName:       row.categName   || row.categ_name  || "",
      eul:             row.eul ?? "",
      profileCode:     row.profileCode || row.profile_code || "",
      profileName:     row.profileName || row.profile_name || "",
      salvagePercent:  row.salvagePercent ?? row.salvage_percent ?? "",
      registeredBy:    row.registeredBy    || "",
      registeredDate:  row.registeredDate  || "",
      lastUpdatedBy:   row.lastUpdatedBy   || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
      __existing: true,
    });
    setSelectedRow(row);
    setIsDupCode(false);
  }, []);

  const handleRetrieve = useCallback((row) => {
    fillFormFromRow(row);
    setIsEditing(false);
  }, [fillFormFromRow]);

  const handleEdit = useCallback(async (row) => {
    if (isReadOnly || !canEdit) {
      await showReadOnlyAlert("edit sub category codes");
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
    { key: "code",            label: "Sub Category Code",               sortable: true, width: 150 },
    { key: "description",     label: "Sub Category Description / Name", sortable: true, width: 240 },
    { key: "categCode",       label: "Category Code",                   sortable: true, width: 120 },
    { key: "categName",       label: "Category Description",            sortable: true, width: 180 },
    // { key: "profileCode",     label: "Profile Code",                    sortable: true, width: 120 },
    // { key: "profileName",     label: "Profile Name",                    sortable: true, width: 180 },
    { key: "eul",             label: "EUL",                             sortable: true, width: 80 },
    { key: "salvagePercent",  label: "Salvage Value",                   sortable: true, width: 120 },
  ], [handleEdit, handleDelete, isReadOnly, canEdit, canDelete]);

  /* ================= TABLE DATA ================= */

  const tableData = useMemo(() => {
    const list = Array.isArray(classifications) ? classifications : [];

    const mapped = list.map((row, index) => ({
      ...row,
      code:           row.code           || row.classCode    || "",
      description:    row.description    || row.classDesc    || row.className || "",
      categCode:      row.categCode      || row.categ_code   || "",
      categName:      row.categName      || row.categ_name   || "",
      profileCode:    row.profileCode    || row.profile_code || "",
      profileName:    row.profileName    || row.profile_name || "",
      eul:            row.eul ?? "",
      salvagePercent: row.salvagePercent ?? row.salvage_percent ?? "",
      __idx: index,
    }));

    return mapped.filter((row) => {
      const s = String(search || "").trim().toLowerCase();
      if (!s) return true;
      return (
        String(row.code           || "").toLowerCase().includes(s) ||
        String(row.description    || "").toLowerCase().includes(s) ||
        String(row.categCode      || "").toLowerCase().includes(s) ||
        String(row.categName      || "").toLowerCase().includes(s) ||
        String(row.profileCode    || "").toLowerCase().includes(s) ||
        String(row.profileName    || "").toLowerCase().includes(s) ||
        String(row.eul             ?? "").toLowerCase().includes(s) ||
        String(row.salvagePercent  ?? "").toLowerCase().includes(s)
      );
    });
  }, [classifications, search]);

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
        await showReadOnlyAlert("add sub category codes");
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

      {/* Loading spinner */}
      {isLoading && <LoadingSpinner />}

      {/* ── TOP PANELS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 shrink-0">

        {/* BOX 1: BASIC INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">

            <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="Sub Category Code"
                required
                value={form.code}
                inputRef={codeInputRef}
                maxLength={20}
                onChange={(v) => setField("code", v ?? "")}
                onBlur={handleCodeValidate}
                onKeyDown={handleCodeValidate}
                disabled={isReadOnly || !isEditing || form.__existing}
              />

              <FieldRenderer
                label="Sub Category Description"
                required
                value={form.description}
                maxLength={150}
                onChange={(v) => setField("description", v ?? "")}
                disabled={isReadOnly || !isEditing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="Category Code"
                type="lookup"
                value={form.categCode || ""}
                onLookup={() => {
                  if (isReadOnly || !isEditing) return;
                  setIsCategOpen(true);
                }}
                onChange={(v) => {
                  setField("categCode", String(v ?? "").toUpperCase());
                  setField("categName", "");
                }}
                disabled={isReadOnly || !isEditing}
              />

              <FieldRenderer
                label="Category Description"
                value={form.categName}
                readOnly
                disabled
              />
            </div>

            {/* <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="Profile Code"
                type="lookup"
                required={Number(form.eul) > 0}
                value={form.profileCode || ""}
                onLookup={() => {
                  if (isReadOnly || !isEditing) return;
                  if (!(Number(form.eul) > 0)) return;
                  setIsProfileOpen(true);
                }}
                onChange={(v) => {
                  setField("profileCode", String(v ?? "").toUpperCase());
                  setField("profileName", "");
                }}
                disabled={isReadOnly || !isEditing || !(Number(form.eul) > 0)}
              />

              <FieldRenderer
                label="Profile Name"
                value={form.profileName}
                readOnly
                disabled
              />
            </div> */}

            <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="EUL"
                type="number"
                value={form.eul}
                min={0}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                onChange={(v) => {
                  const n = v === "" || v === null ? "" : Math.max(0, Math.trunc(Number(v)));
                  setField("eul", Number.isNaN(n) ? "" : n);
                  if (Number(n) === 0) {
                    setField("profileCode", "");
                    setField("profileName", "");
                  }
                }}
                disabled={isReadOnly || !isEditing}
              />

              <FieldRenderer
                label="Salvage Value"
                type="number"
                value={form.salvagePercent}
                min={0}
                max={100}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                onChange={(v) => {
                  if (v === "" || v === null) { setField("salvagePercent", ""); return; }
                  const n = Math.min(100, Math.max(0, Number(v)));
                  setField("salvagePercent", Number.isNaN(n) ? "" : n);
                }}
                disabled={isReadOnly || !isEditing}
              />
            </div>

          </div>
        </Card>

        {/* BOX 2: REGISTRATION INFORMATION */}
        <RegistrationInfo data={form} layout="stacked" />

      </div>

      {/* ── LIST TABLE ── */}
      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="Sub Category Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid
        />
      </div>

      {/* ── FA Category Lookup Modal ── */}
      <SearchFACateg
        isOpen={isCategOpen}
        onClose={(selected) => {
          setIsCategOpen(false);
          if (selected) {
            setField("categCode", selected.code || selected.categCode || "");
            setField("categName", selected.description || selected.categName || "");
          }
        }}
      />

      {/* ── FA Depreciation Profile Lookup Modal ──
      <SearchFAProfile
        isOpen={isProfileOpen}
        onClose={(selected) => {
          setIsProfileOpen(false);
          if (selected) {
            setField("profileCode", selected.code || selected.profileCode || "");
            setField("profileName", selected.description || selected.profileName || "");
          }
        }}
      /> */}

    </div>
  );
});

FAClassCodes.displayName = "FAClassCodes";
export default FAClassCodes;