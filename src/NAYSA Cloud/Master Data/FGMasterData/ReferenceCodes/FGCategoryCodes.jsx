// src/NAYSA Cloud/Reference File/FG/FGCategoryCodes.jsx

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
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
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

const DEFAULT_FORM = {
  code: "",
  description: "",
  uCostFlag: "N",
  invAcct: "",  invAcctName: "",
  arAcct: "",   arAcctName: "",
  salesAcct: "", salesAcctName: "",
  sdiscAcct: "", sdiscAcctName: "",
  wipAcct: "",  wipAcctName: "",
  rrAcct: "",   rrAcctName: "",
  sretAcct: "", sretAcctName: "",
  cosAcct: "",  cosAcctName: "",
  expAcct: "",  expAcctName: "",
  rcCode: "",   rcName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const FGCategoryCodes = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
}, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

  const showReadOnlyAlert = useCallback(async (action = "perform this action") => {
    await useSwalErrorAlert(
      "Read Only",
      `You are not allowed to ${action}.`
    );
  }, []);

  const codeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);
  const [search, setSearch] = useState("");

  // Lookup states
  const [isCoaOpen, setIsCoaOpen] = useState(false);
  const [isRcOpen, setIsRcOpen] = useState(false);
  const [lookupField, setLookupField] = useState("");

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  /* ================= LOAD LIST ================= */

  const categoryListQuery = useQuery({
    queryKey: ["fgCategoryList"],
    queryFn: async () => {
      const res = await apiClient.get("/fgCateg");
      return extractRows(res);
    },
  });

  const categories = useMemo(
    () => categoryListQuery.data || [],
    [categoryListQuery.data]
  );

  const isInitialLoading = categoryListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;
    try {
      return categories.some((item) =>
        String(item.code || item.categoryCode || "").toUpperCase() === c.toUpperCase()
      );
    } catch {
      return false;
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
      await useSwalErrorAlert("Duplicate Entry", `Category Code "${code}" already exists.`);
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertFGCateg", {
        json_data: JSON.stringify({
          json_data: {
            code:        payload.code,
            description: payload.description,
            uCostFlag:   payload.uCostFlag,
            invAcct:     payload.invAcct,
            arAcct:      payload.arAcct,
            salesAcct:   payload.salesAcct,
            sdiscAcct:   payload.sdiscAcct,
            wipAcct:     payload.wipAcct,
            rrAcct:      payload.rrAcct,
            sretAcct:    payload.sretAcct,
            cosAcct:     payload.cosAcct,
            expAcct:     payload.expAcct,
            rcCode:      payload.rcCode,
            userCode:    payload.userCode,
          },
        }),
      });
    },
    onSuccess: async (response) => {
      const row = response?.data?.data?.[0] || response?.data || {};
      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg = String(row?.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Validation Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["fgCategoryList"] });
      await useSwalSuccessAlert("Success!", "FG Category Code saved successfully.");

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
        "Failed to save FG category code.";
      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await showReadOnlyAlert("save FG category codes");
      return;
    }

    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code:        String(form.code        || "").trim().toUpperCase(),
      description: String(form.description || "").trim(),
      uCostFlag:   form.uCostFlag === "Y" ? "Y" : "N",
      invAcct:     String(form.invAcct     || "").trim(),
      arAcct:      String(form.arAcct      || "").trim(),
      salesAcct:   String(form.salesAcct   || "").trim(),
      sdiscAcct:   String(form.sdiscAcct   || "").trim(),
      wipAcct:     String(form.wipAcct     || "").trim(),
      rrAcct:      String(form.rrAcct      || "").trim(),
      sretAcct:    String(form.sretAcct    || "").trim(),
      cosAcct:     String(form.cosAcct     || "").trim(),
      expAcct:     String(form.expAcct     || "").trim(),
      rcCode:      String(form.rcCode      || "").trim(),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode, isReadOnly, canSave, showReadOnlyAlert]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteFGCateg", {
        json_data: {
          code: code,
          userCode: userCode,
        },
      });
    },
    onSuccess: async (response, deletedCode) => {
      const sqlRow = response?.data?.data?.[0] || {};
      const errorcount = Number(sqlRow.errorcount ?? 0);
      const errormsg = String(sqlRow.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["fgCategoryList"] });
      await useSwalDeleteRecord(
        "Deleted",
        `FG Category Code ${deletedCode} has been successfully removed.`
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
        "Failed to delete FG category code.";
      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      if (isReadOnly || !canDelete) {
        await showReadOnlyAlert("delete FG category codes");
        return;
      }

      const code = row?.code || row?.categoryCode;
      if (!code) return;

      const confirm = await useSwalDeleteConfirm(
        "Delete Record?",
        `Are you sure you want to delete "${code}"?`
      );
      if (!confirm?.isConfirmed) return;

      deleteMutation.mutate(code);
    },
    [deleteMutation, isReadOnly, canDelete, showReadOnlyAlert]
  );

  /* ================= EDIT / RETRIEVE ================= */

  const mapRowToForm = (row = {}) => ({
        code:           row.code           || row.categoryCode    || "",
        description:    row.description    || row.categoryDesc    || "",
        uCostFlag:      row.uCostFlag      || row.u_cost_flag     || "N",
        invAcct:        row.invAcct        || row.inv_acct        || "",
        invAcctName:    row.invAcctName    || row.inv_acct_name   || "",
        arAcct:         row.arAcct         || row.ar_acct         || "",
        arAcctName:     row.arAcctName     || row.ar_acct_name    || "",
        salesAcct:      row.salesAcct      || row.sales_acct      || "",
        salesAcctName:  row.salesAcctName  || row.sales_acct_name || "",
        sdiscAcct:      row.sdiscAcct      || row.sdisc_acct      || "",
        sdiscAcctName:  row.sdiscAcctName  || row.sdisc_acct_name || "",
        wipAcct:        row.wipAcct        || row.wip_acct        || "",
        wipAcctName:    row.wipAcctName    || row.wip_acct_name   || "",
        rrAcct:         row.rrAcct         || row.rr_acct         || "",
        rrAcctName:     row.rrAcctName     || row.rr_acct_name    || "",
        sretAcct:       row.sretAcct       || row.sret_acct       || "",
        sretAcctName:   row.sretAcctName   || row.sret_acct_name  || "",
        cosAcct:        row.cosAcct        || row.cos_acct        || "",
        cosAcctName:    row.cosAcctName    || row.cos_acct_name   || "",
        expAcct:        row.expAcct        || row.exp_acct        || "",
        expAcctName:    row.expAcctName    || row.exp_acct_name   || "",
        rcCode:         row.rcCode         || row.rc_code         || "",
        rcName:         row.rcName         || row.rc_name         || "",
        registeredBy:     row.registeredBy     || row.registered_by     || "",
        registeredDate:   row.registeredDate   || row.registered_date   || "",
        lastUpdatedBy:    row.lastUpdatedBy    || row.last_updated_by   || row.updatedBy    || row.updated_by    || "",
        lastUpdatedDate:  row.lastUpdatedDate  || row.last_updated_date || row.updatedDate  || row.updated_date  || "",
      });

  const handleRetrieve = async (row) => {
    try {
      const normalizedRecord = mapRowToForm(row);
      setForm({ ...DEFAULT_FORM, ...normalizedRecord, __existing: true });
      setIsEditing(false);
      setSelectedRow(row);
    } catch {
      Swal.fire("Error", "Could not load record.", "error");
    }
  };

  const handleEdit = async (row) => {
    if (isReadOnly || !canEdit) {
      await handleRetrieve(row);
      return;
    }

    try {
      const normalizedRecord = {
        code:           row.code           || row.categoryCode    || "",
        description:    row.description    || row.categoryDesc    || "",
        uCostFlag:      row.uCostFlag      || row.u_cost_flag     || "N",
        invAcct:        row.invAcct        || row.inv_acct        || "",
        invAcctName:    row.invAcctName    || row.inv_acct_name   || "",
        arAcct:         row.arAcct         || row.ar_acct         || "",
        arAcctName:     row.arAcctName     || row.ar_acct_name    || "",
        salesAcct:      row.salesAcct      || row.sales_acct      || "",
        salesAcctName:  row.salesAcctName  || row.sales_acct_name || "",
        sdiscAcct:      row.sdiscAcct      || row.sdisc_acct      || "",
        sdiscAcctName:  row.sdiscAcctName  || row.sdisc_acct_name || "",
        wipAcct:        row.wipAcct        || row.wip_acct        || "",
        wipAcctName:    row.wipAcctName    || row.wip_acct_name   || "",
        rrAcct:         row.rrAcct         || row.rr_acct         || "",
        rrAcctName:     row.rrAcctName     || row.rr_acct_name    || "",
        sretAcct:       row.sretAcct       || row.sret_acct       || "",
        sretAcctName:   row.sretAcctName   || row.sret_acct_name  || "",
        cosAcct:        row.cosAcct        || row.cos_acct        || "",
        cosAcctName:    row.cosAcctName    || row.cos_acct_name   || "",
        expAcct:        row.expAcct        || row.exp_acct        || "",
        expAcctName:    row.expAcctName    || row.exp_acct_name   || "",
        rcCode:         row.rcCode         || row.rc_code         || "",
        rcName:         row.rcName         || row.rc_name         || "",
        registeredBy:     row.registeredBy     || row.registered_by     || "",
        registeredDate:   row.registeredDate   || row.registered_date   || "",
        lastUpdatedBy:    row.lastUpdatedBy    || row.last_updated_by   || row.updatedBy    || row.updated_by    || "",
        lastUpdatedDate:  row.lastUpdatedDate  || row.last_updated_date || row.updatedDate  || row.updated_date  || "",
      };

      setForm({ ...DEFAULT_FORM, ...normalizedRecord, __existing: true });
      setIsEditing(true);
      setSelectedRow(row);
    } catch {
      Swal.fire("Error", "Could not load record.", "error");
    }
  };

  const handleRowDoubleClick = async (row) => {
    if (canEdit && !isReadOnly) {
      await handleEdit(row);
    } else {
      await handleRetrieve(row);
    }
  };

  /* ================= COMBINED LOADING STATE ================= */

  const isLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  /* ================= TABLE ================= */

  const tableColumns = useMemo(
    () => [
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
      { key: "code",        label: "Category Code",             sortable: true, width: 130 },
      { key: "description", label: "Category Description / Name", sortable: true, width: 240 },
      { key: "invAcct",     label: "Inv Acct",                   sortable: true, width: 100 },
      { key: "arAcct",      label: "AR Acct",                    sortable: true, width: 100 },
      { key: "salesAcct",   label: "Sales Acct",                 sortable: true, width: 100 },
      { key: "sdiscAcct",   label: "SDisc Acct",                 sortable: true, width: 100 },
      { key: "wipAcct",     label: "WIP Acct",                   sortable: true, width: 100 },
      { key: "rrAcct",      label: "RR Acct",                    sortable: true, width: 100 },
      { key: "sretAcct",    label: "SRet Acct",                  sortable: true, width: 100 },
      { key: "cosAcct",     label: "COS Acct",                   sortable: true, width: 100 },
      { key: "expAcct",     label: "Exp Acct",                   sortable: true, width: 100 },
      { key: "rcCode",      label: "RC Code",                    sortable: true, width: 100 },
      {
        key: "uCostFlag",
        label: "UCost",
        sortable: true,
        width: 80,
        render: (row) => (row.uCostFlag === "Y" ? "Y" : "N"),
      },
    ],
    [handleEdit, handleDelete, isReadOnly, canEdit, canDelete]
  );

  const tableData = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];

    const mapped = list.map((row, index) => ({
      ...row,
      code: row.code || row.categoryCode || "",
      description: row.description || row.categoryDesc || "",
      __idx: index,
    }));

    return mapped.filter((row) => {
      const s = String(search || "").trim().toLowerCase();
      if (!s) return true;

      return (
        String(row.code).toLowerCase().includes(s) ||
        String(row.description).toLowerCase().includes(s) ||
        String(row.invAcct    || "").toLowerCase().includes(s) ||
        String(row.arAcct     || "").toLowerCase().includes(s) ||
        String(row.salesAcct  || "").toLowerCase().includes(s) ||
        String(row.sdiscAcct  || "").toLowerCase().includes(s) ||
        String(row.wipAcct    || "").toLowerCase().includes(s) ||
        String(row.rrAcct     || "").toLowerCase().includes(s) ||
        String(row.sretAcct   || "").toLowerCase().includes(s) ||
        String(row.cosAcct    || "").toLowerCase().includes(s) ||
        String(row.expAcct    || "").toLowerCase().includes(s) ||
        String(row.rcCode     || "").toLowerCase().includes(s) ||
        (row.uCostFlag === "Y" ? "y" : "n").includes(s)
      );
    });
  }, [categories, search]);

  /* ================= EXPOSE STATE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: !isReadOnly && canSave && isEditing && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange, isReadOnly, canSave]);

  /* ================= EXPOSE METHODS TO PARENT REF ================= */

  useImperativeHandle(ref, () => ({
    add: async () => {
      if (isReadOnly || !canAdd) {
        await showReadOnlyAlert("add FG category codes");
        return;
      }

      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm({ ...DEFAULT_FORM, __existing: false });
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    },
    save: handleSave,
    reset: () => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
  }));

  /* ================= LOOKUP HANDLERS ================= */

  const openCoaLookup = (field) => {
    setLookupField(field);
    setIsCoaOpen(true);
  };

  /* ================= RENDER ================= */

  return (
    <div className="flex flex-col h-full gap-3 w-full relative">

      {/* LOADING SPINNER */}
      {isLoading && <LoadingSpinner />}

      {/* TOP PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_280px] gap-3 shrink-0">

        {/* BOX 1: BASIC INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">
            <FieldRenderer
              label="Category Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              maxLength={20}
              onChange={(v) => setField("code", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={!isEditing || form.__existing}
            />

            <FieldRenderer
              label="Category Description"
              required
              value={form.description}
              maxLength={150}
              onChange={(v) => setField("description", v ?? "")}
              disabled={!isEditing || isReadOnly}
            />

            <FieldRenderer
              label="UCost Flag"
              type="select"
              required
              value={!form.uCostFlag || form.uCostFlag === "" ? "N" : form.uCostFlag}
              onChange={(v) => setField("uCostFlag", v === "Y" ? "Y" : "N")}
              options={[
                { value: "Y", label: "Yes" },
                { value: "N", label: "No" },
              ]}
              disabled={!isEditing || isReadOnly}
            />
          </div>
        </Card>

        {/* BOX 2: ACCOUNTING INFORMATION — 3 sub-columns: 4 | 4 | 3 fields */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="ACCOUNTING INFORMATION" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">

            {/* ── Column 1 (4 fields) ── */}
            <div className="space-y-3">
              {/* Inventory Account */}
              <FieldRenderer label="Inventory Acct" type="lookup" required labelClassName="text-xs"
                value={form.invAcct ? `${form.invAcct}${form.invAcctName ? ` — ${form.invAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("inv")} onChange={(v) => setField("invAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* AR Account */}
              <FieldRenderer label="AR Account" type="lookup" required labelClassName="text-xs"
                value={form.arAcct ? `${form.arAcct}${form.arAcctName ? ` — ${form.arAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("ar")} onChange={(v) => setField("arAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* Sales Account */}
              <FieldRenderer label="Sales Account" type="lookup" required labelClassName="text-xs"
                value={form.salesAcct ? `${form.salesAcct}${form.salesAcctName ? ` — ${form.salesAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("sales")} onChange={(v) => setField("salesAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* SDiscount Account */}
              <FieldRenderer label="SDiscount Acct" type="lookup" required labelClassName="text-xs"
                value={form.sdiscAcct ? `${form.sdiscAcct}${form.sdiscAcctName ? ` — ${form.sdiscAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("sdisc")} onChange={(v) => setField("sdiscAcct", v ?? "")} disabled={!isEditing || isReadOnly} />
            </div>

            {/* ── Column 2 (4 fields) ── */}
            <div className="space-y-3">
              {/* WIP Account */}
              <FieldRenderer label="WIP Account" type="lookup" required labelClassName="text-xs"
                value={form.wipAcct ? `${form.wipAcct}${form.wipAcctName ? ` — ${form.wipAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("wip")} onChange={(v) => setField("wipAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* RR Account */}
              <FieldRenderer label="RR Account" type="lookup" required labelClassName="text-xs"
                value={form.rrAcct ? `${form.rrAcct}${form.rrAcctName ? ` — ${form.rrAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("rr")} onChange={(v) => setField("rrAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* SRet Account */}
              <FieldRenderer label="SRet Account" type="lookup" required labelClassName="text-xs"
                value={form.sretAcct ? `${form.sretAcct}${form.sretAcctName ? ` — ${form.sretAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("sret")} onChange={(v) => setField("sretAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* COS Account */}
              <FieldRenderer label="COS Account" type="lookup" required labelClassName="text-xs"
                value={form.cosAcct ? `${form.cosAcct}${form.cosAcctName ? ` — ${form.cosAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("cos")} onChange={(v) => setField("cosAcct", v ?? "")} disabled={!isEditing || isReadOnly} />
            </div>

            {/* ── Column 3 (3 fields) ── */}
            <div className="space-y-3">
              {/* Expense Account */}
              <FieldRenderer label="Expense Acct" type="lookup" required labelClassName="text-xs"
                value={form.expAcct ? `${form.expAcct}${form.expAcctName ? ` — ${form.expAcctName}` : ""}` : ""}
                onLookup={() => openCoaLookup("exp")} onChange={(v) => setField("expAcct", v ?? "")} disabled={!isEditing || isReadOnly} />

              {/* RC Code */}
              <FieldRenderer label="RC Code" type="lookup" required labelClassName="text-xs"
                value={form.rcCode ? `${form.rcCode}${form.rcName ? ` — ${form.rcName}` : ""}` : ""}
                onLookup={() => setIsRcOpen(true)} onChange={(v) => setField("rcCode", v ?? "")} disabled={!isEditing || isReadOnly} />
            </div>

          </div>
        </Card>

        {/* BOX 3: REGISTRATION INFORMATION */}
        <RegistrationInfo data={form} layout="stacked" />

      </div>

      {/* LIST TABLE */}
      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="FG Category Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid={true}
        />
      </div>

      {/* LOOKUP MODALS */}
      <SearchCOAMast
        isOpen={isCoaOpen}
        source={lookupField}
        customParam="ActiveAll"
        onClose={(selected, source) => {
          setIsCoaOpen(false);
          if (selected) {
            setField(`${source}Acct`, selected.acctCode);
            setField(`${source}AcctName`, selected.acctName);
          }
        }}
      />

      <SearchRCMast
        isOpen={isRcOpen}
        customParam="ActiveAll"
        onClose={(selected) => {
          setIsRcOpen(false);
          if (selected) {
            setField("rcCode", selected.rcCode);
            setField("rcName", selected.rcName);
          }
        }}
      />

    </div>
  );
});

FGCategoryCodes.displayName = "FGCategoryCodes";
export default FGCategoryCodes;