// src/NAYSA Cloud/Reference File/ReferenceCodes/CategoryCodes.jsx

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
import { Upload, Download, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, Loader2 } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
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

// IMPORT LOOKUPS & UTILITIES
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
    <div className="text-[11px] font-bold text-slate-700 tracking-wide border-b border-slate-200 pb-1.5">{title}</div>
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
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const DEFAULT_FORM = {
  code: "",
  description: "",
  uCostFlag: "N",
  invAcct: "", invAcctName: "",
  expAcct: "", expAcctName: "",
  rrAcct: "", rrAcctName: "",
  lcAcct: "", lcAcctName: "",
  rcCode: "", rcName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const CategoryCodes = forwardRef(({
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
      `You only have read access. You are not allowed to ${action}.`
    );
  }, []);

  const codeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);
  const [search, setSearch] = useState("");

  // ── Import / Validate state ───────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);      // parsed from Excel
  const [validatedRows, setValidatedRows] = useState([]); // after sproc validation
  const [isValidating, setIsValidating] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [importStep, setImportStep] = useState("upload"); // "upload" | "results"

  // Lookup States
  const [isCoaOpen, setIsCoaOpen] = useState(false);
  const [isRcOpen, setIsRcOpen] = useState(false);
  const [lookupField, setLookupField] = useState(""); // tracks which field triggered COA

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  /* ================= LOAD LIST ================= */

  const categoryListQuery = useQuery({
    queryKey: ["msCategoryList"],
    queryFn: async () => {
      const res = await apiClient.get("/msCateg");
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
      const exists = categories.some((item) =>
        String(item.code || item.categoryCode || "").toUpperCase() === c.toUpperCase()
      );
      return exists;
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
      await useSwalErrorAlert(
        "Duplicate Entry",
        `Category Code "${code}" already exists.`
      );
      setField("code", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= TEMPLATE DOWNLOAD ================= */
  const handleDownloadTemplate = () => {
    const headers = [
      "Category Code",
      "Category Description",
      "UCost Flag (Y/N)",
      "Inventory Account",
      "Expense Account",
      "RR Account",
      "RC Code",
    ];

    const sample = [
      ["CAT-001", "Sample Category", "N", "1010-001", "5010-001", "2010-001", "RC-001"],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);

    // Column widths
    ws["!cols"] = [
      { wch: 18 }, { wch: 30 }, { wch: 18 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 },
    ];

    // Style the header row (background + bold) — basic xlsx approach
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category Template");
    XLSX.writeFile(wb, "MSCategory_ImportTemplate.xlsx");
  };

  /* ================= FILE PARSE (Excel → rows) ================= */
  const handleFileChange = (e) => {
    if (isReadOnly || !canAdd) {
      e.target.value = "";
      showReadOnlyAlert("import category codes");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so same file can be re-selected
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const mapped = rawRows.map((r, idx) => ({
          _rowNum: idx + 2,                              // Excel row (header = 1)
          code:        String(r["Category Code"]           || "").trim(),
          description: String(r["Category Description"]    || "").trim(),
          uCostFlag:   String(r["UCost Flag (Y/N)"]        || "N").trim().toUpperCase() === "Y" ? "Y" : "N",
          invAcct:     String(r["Inventory Account"]       || "").trim(),
          expAcct:     String(r["Expense Account"]         || "").trim(),
          rrAcct:      String(r["RR Account"]              || "").trim(),
          rcCode:      String(r["RC Code"]                 || "").trim(),
        }));

        setImportRows(mapped);
        setValidatedRows([]);
        setImportStep("upload");
        setImportModal(true);
      } catch {
        Swal.fire("Error", "Failed to parse the Excel file. Make sure it matches the template.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /* ================= VALIDATE via sproc ================= */
  const handleValidate = async () => {
    if (!importRows.length) return;
    setIsValidating(true);

    try {
      const res = await apiClient.post("/validateMSCategBulk", {
        json_data: {
          rows: importRows,
        },
      });

      const raw =
        res?.data?.data?.[0]?.result ??
        res?.data?.result ??
        res?.data?.data;

      let results = [];
      if (typeof raw === "string") {
        try { results = JSON.parse(raw); } catch { results = []; }
      } else if (Array.isArray(raw)) {
        results = raw;
      }

      // Merge sproc results back with original row data
      const merged = importRows.map((row) => {
        const found = results.find((r) => String(r.rowNum) === String(row._rowNum));
        return {
          ...row,
          status:  found?.status  ?? "Invalid",
          remarks: found?.remarks ?? "No response from server.",
        };
      });

      setValidatedRows(merged);
      setImportStep("results");
    } catch (err) {
      Swal.fire("Error", "Validation request failed. Please try again.", "error");
    } finally {
      setIsValidating(false);
    }
  };

  /* ================= BULK IMPORT (valid rows only) ================= */
  const handleBulkImport = async () => {
    if (isReadOnly || !canAdd) {
      await showReadOnlyAlert("import category codes");
      return;
    }

    const toImport = validatedRows.filter((r) => r.status === "Valid");
    if (!toImport.length) return;

    const confirm = await Swal.fire({
      title: "Import Valid Rows?",
      text: `${toImport.length} valid row(s) will be saved as Category Codes.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      confirmButtonText: "Yes, Import",
    });

    if (!confirm.isConfirmed) return;

    setIsBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of toImport) {
      try {
        const res = await apiClient.post("/upsertMSCateg", {
          json_data: JSON.stringify({
            json_data: {
              code:        row.code,
              description: row.description,
              uCostFlag:   row.uCostFlag,
              invAcct:     row.invAcct,
              expAcct:     row.expAcct,
              rrAcct:      row.rrAcct,
              lcAcct:      "",
              rcCode:      row.rcCode,
              userCode,
            },
          }),
        });

        const sqlRow = res?.data?.data?.[0] || res?.data || {};
        const errcount = Number(sqlRow?.errorcount ?? sqlRow?.errorCount ?? 0);

        if (errcount > 0) {
          failCount++;
          // Mark the row as failed in results
          setValidatedRows((prev) =>
            prev.map((r) =>
              r.code === row.code
                ? { ...r, status: "Import Failed", remarks: sqlRow?.errormsg || "Sproc rejected the record." }
                : r
            )
          );
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsBulkSaving(false);
    queryClient.invalidateQueries({ queryKey: ["msCategoryList"] });

    await Swal.fire({
      icon: failCount === 0 ? "success" : "warning",
      title: failCount === 0 ? "Import Complete!" : "Import Partial",
      text: `${successCount} imported successfully${failCount > 0 ? `, ${failCount} failed (see table).` : "."}`,
      confirmButtonColor: "#2563eb",
    });

    if (failCount === 0) {
      setImportModal(false);
      setImportRows([]);
      setValidatedRows([]);
      setImportStep("upload");
    }
  };

  /* ================= SAVE ================= */
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertMSCateg", {
        json_data: JSON.stringify({
          json_data: {
            code: payload.code,
            description: payload.description,
            uCostFlag: payload.uCostFlag,
            invAcct: payload.invAcct,
            expAcct: payload.expAcct,
            rrAcct: payload.rrAcct,
            lcAcct: payload.lcAcct,
            rcCode: payload.rcCode,
            userCode: payload.userCode,
          }
        }),
      });
    },
    onSuccess: async (response) => {
      // Validation is fully handled by the sproc — read errorcount/errormsg from the response
      const row = response?.data?.data?.[0] || response?.data || {};

      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg = String(row?.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Validation Error", errormsg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["msCategoryList"] });
      await useSwalSuccessAlert("Success!", "Category Code saved successfully.");

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
        "Failed to save category code.";

      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  // No hardcoded frontend validation — the sproc handles required field checks
  // and returns errorcount + errormsg which onSuccess processes above.
  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await showReadOnlyAlert("save category codes");
      return;
    }

    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      ...form,
      code: String(form.code || "").trim(),
      description: String(form.description || "").trim(),
      uCostFlag: form.uCostFlag === "Y" ? "Y" : "N",
      invAcct: String(form.invAcct || "").trim(),
      expAcct: String(form.expAcct || "").trim(),
      rrAcct: String(form.rrAcct || "").trim(),
      lcAcct: String(form.lcAcct || "").trim(),
      rcCode: String(form.rcCode || "").trim(),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode, isReadOnly, canSave, showReadOnlyAlert]);

  /* ================= DELETE ================= */
  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteMSCateg", {
        json_data: {
          code: code,
          userCode: userCode
        }
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

      queryClient.invalidateQueries({ queryKey: ["msCategoryList"] });

      await useSwalDeleteRecord(
        "Deleted",
        `Category Code ${deletedCode} has been successfully removed.`
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
        "Failed to delete category code.";

      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      if (isReadOnly || !canDelete) {
        await showReadOnlyAlert("delete category codes");
        return;
      }

      const code = row?.code || row?.categoryCode;
      if (!code) return;

      // Check if in use before confirming delete
      try {
        const checkRes = await apiClient.post("/checkInUsedMSCateg", {
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
            `Category Code "${code}" is currently in use and cannot be deleted.`
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
    },
    [deleteMutation, isReadOnly, canDelete, showReadOnlyAlert]
  );

  /* ================= EDIT ================= */

  const buildRecordFromRow = (row = {}) => ({
    code: row.code || row.categoryCode || "",
    description: row.description || row.categoryDesc || "",
    uCostFlag: row.uCostFlag || row.u_cost_flag || "N",
    invAcct: row.invAcct || row.inv_acct || "",
    invAcctName: row.invAcctName || row.inv_acct_name || "",
    expAcct: row.expAcct || row.exp_acct || "",
    expAcctName: row.expAcctName || row.exp_acct_name || "",
    rrAcct: row.rrAcct || row.rr_acct || "",
    rrAcctName: row.rrAcctName || row.rr_acct_name || "",
    lcAcct: row.lcAcct || row.lc_acct || "",
    lcAcctName: row.lcAcctName || row.lc_acct_name || "",
    rcCode: row.rcCode || row.rc_code || "",
    rcName: row.rcName || row.rc_name || "",
    registeredBy: row.registeredBy || row.registered_by || "",
    registeredDate: row.registeredDate || row.registered_date || "",
    lastUpdatedBy: row.lastUpdatedBy || row.last_updated_by || row.updatedBy || row.updated_by || "",
    lastUpdatedDate: row.lastUpdatedDate || row.last_updated_date || row.updatedDate || row.updated_date || "",
  });

  const handleRetrieve = async (row) => {
    try {
      const normalizedRecord = buildRecordFromRow(row);
      setForm({ ...DEFAULT_FORM, ...normalizedRecord, __existing: true });
      setIsEditing(false);
      setSelectedRow(row);
    } catch {
      Swal.fire("Error", "Could not fetch record", "error");
    }
  };

  const handleEdit = async (row) => {
    if (isReadOnly || !canEdit) {
      await handleRetrieve(row);
      await showReadOnlyAlert("edit category codes");
      return;
    }

    try {
      const normalizedRecord = buildRecordFromRow(row);
      setForm({ ...DEFAULT_FORM, ...normalizedRecord, __existing: true });
      setIsEditing(true);
      setSelectedRow(row);
    } catch {
      Swal.fire("Error", "Could not fetch record", "error");
    }
  };

  const handleRowDoubleClick = async (row) => {
    if (canEdit && !isReadOnly) {
      await handleEdit(row);
      return;
    }

    await handleRetrieve(row);
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
              title="Edit"
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
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "code", label: "Category Code", sortable: true, width: 140 },
      { key: "description", label: "Category Description / Name", sortable: true, width: 280 },
      { key: "invAcct", label: "Inv Acct", sortable: true, width: 120 },
      { key: "expAcct", label: "Expense Acct", sortable: true, width: 120 },
      { key: "rrAcct", label: "RR Acct", sortable: true, width: 120 },
      // { key: "lcAcct", label: "LC Acct", sortable: true, width: 120 },
      { key: "rcCode", label: "RC Code", sortable: true, width: 120 },
      {
        key: "uCostFlag",
        label: "UCost",
        sortable: true,
        width: 100,
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

      const uCostStatus = row.uCostFlag === "Y" ? "y" : "n";

      return (
        String(row.code).toLowerCase().includes(s) ||
        String(row.description).toLowerCase().includes(s) ||
        String(row.invAcct || "").toLowerCase().includes(s) ||
        String(row.expAcct || "").toLowerCase().includes(s) ||
        String(row.rrAcct || "").toLowerCase().includes(s) ||
        // String(row.lcAcct || "").toLowerCase().includes(s) ||
        String(row.rcCode || "").toLowerCase().includes(s) ||
        uCostStatus.includes(s)
      );
    });
  }, [categories, search]);

  /* ================= EXPOSE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: isEditing && canSave && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, canSave, isDupCode, saveMutation.isPending, onStateChange]);

  useImperativeHandle(ref, () => ({
    add: async () => {
      if (isReadOnly || !canAdd) {
        await showReadOnlyAlert("add category codes");
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
    downloadTemplate: handleDownloadTemplate,
    triggerImport: async () => {
      if (isReadOnly || !canAdd) {
        await showReadOnlyAlert("import category codes");
        return;
      }

      fileInputRef.current?.click();
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

      {/* Hidden file input (still needed for triggerImport) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* TOP PANELS — Basic Info narrow | Accounting Info wide | Registration Info */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">

        {/* BOX 1: BASIC INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="BASIC INFORMATION" />
          <div className="space-y-3">
            <FieldRenderer
              label="Category Code"
              required
              value={form.code}
              inputRef={codeInputRef}
              maxLength={10}
              onChange={(v) => setField("code", v ?? "")}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={isReadOnly || !isEditing || form.__existing}
            />

            <FieldRenderer
              label="Category Description"
              required
              value={form.description}
              maxLength={100}
              onChange={(v) => setField("description", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />

            <FieldRenderer
              label="UCost Flag"
              type="select"
              required
              value={!form.uCostFlag || form.uCostFlag === "" ? "N" : form.uCostFlag}
              onChange={(v) => {
                setField("uCostFlag", v === "Y" ? "Y" : "N");
              }}
              options={[
                { value: "Y", label: "Yes" },
                { value: "N", label: "No" },
              ]}
              disabled={isReadOnly || !isEditing}
            />
          </div>
        </Card>

        {/* BOX 2: ACCOUNTING INFORMATION */}
        <Card className="p-4 flex flex-col">
          <SectionHeader title="ACCOUNTING INFORMATION" />
          <div className="space-y-3">

            {/* Inventory Account */}
            <FieldRenderer
              label="Inventory Account"
              type="lookup"
              value={form.invAcct ? `${form.invAcct}${form.invAcctName ? ` — ${form.invAcctName}` : ""}` : ""}
              required
              onLookup={() => openCoaLookup("inv")}
              onChange={(v) => setField("invAcct", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />

            {/* Expense Account */}
            <FieldRenderer
              label="Expense Account"
              type="lookup"
              value={form.expAcct ? `${form.expAcct}${form.expAcctName ? ` — ${form.expAcctName}` : ""}` : ""}
              required
              onLookup={() => openCoaLookup("exp")}
              onChange={(v) => setField("expAcct", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />

            {/* RR Account */}
            <FieldRenderer
              label="RR Account"
              type="lookup"
              value={form.rrAcct ? `${form.rrAcct}${form.rrAcctName ? ` — ${form.rrAcctName}` : ""}` : ""}
              required
              onLookup={() => openCoaLookup("rr")}
              onChange={(v) => setField("rrAcct", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />

            {/* Landed Cost Account
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <FieldRenderer
                  label="Landed Cost Account"
                  type="lookup"
                  value={form.lcAcct}
                  required
                  onLookup={() => openCoaLookup("lc")}
                  onChange={(v) => setField("lcAcct", v ?? "")}
                  disabled={isReadOnly || !isEditing}
                />
              </div>
              <div className="col-span-2">
                <FieldRenderer
                  label=""
                  type="text"
                  value={form.lcAcctName}
                  readOnly
                  disabled
                />
              </div>
            </div> */}

            {/* Responsibility Center */}
            <FieldRenderer
              label="Responsibility Center"
              type="lookup"
              value={form.rcCode ? `${form.rcCode}${form.rcName ? ` — ${form.rcName}` : ""}` : ""}
              onLookup={() => setIsRcOpen(true)}
              onChange={(v) => setField("rcCode", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />
          </div>
        </Card>

        {/* BOX 3: REGISTRATION INFORMATION */}
        <RegistrationInfo data={form} layout="stacked" />

      </div>

      {/* LIST TABLE (Full Width Bottom) */}
      <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType="Category Codes"
          itemsPerPage={50}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid={true}
        />
      </div>

      {/* Lookup Modals */}
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

      {/* ── Import & Validate Modal ── */}
      {importModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: "rgba(15,23,42,0.55)" }}
          onClick={() => {
            if (!isValidating && !isBulkSaving) {
              setImportModal(false);
              setImportRows([]);
              setValidatedRows([]);
              setImportStep("upload");
            }
          }}
        >
          <div
            className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 border border-blue-200">
                  <FileSpreadsheet size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Import Category Codes</h2>
                  <p className="text-[11px] text-slate-400">
                    {importStep === "upload"
                      ? `${importRows.length} row(s) parsed — click Validate to check accounts`
                      : `${validatedRows.filter((r) => r.status === "Valid").length} valid · ${validatedRows.filter((r) => r.status !== "Valid").length} invalid`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isValidating || isBulkSaving}
                onClick={() => {
                  setImportModal(false);
                  setImportRows([]);
                  setValidatedRows([]);
                  setImportStep("upload");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <XCircle size={15} />
              </button>
            </div>

            {/* Body — parsed / validated table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {importRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <AlertTriangle size={32} className="mb-2 text-amber-400" />
                  <p className="text-sm">No rows detected. Make sure the file matches the template.</p>
                </div>
              ) : (
                <table className="min-w-full text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-10">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Category Code</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Description</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-8">UCost</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Inv Acct</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Exp Acct</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">RR Acct</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">RC Code</th>
                      {importStep === "results" && (
                        <>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500 w-20">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Remarks</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(importStep === "results" ? validatedRows : importRows).map((row) => {
                      const isValid   = row.status === "Valid";
                      const isFailed  = row.status === "Import Failed";
                      const rowBg     = importStep === "results"
                        ? isValid   ? "bg-emerald-50/60"
                        : isFailed  ? "bg-red-50/60"
                        :             "bg-red-50/40"
                        : "";

                      return (
                        <tr key={row._rowNum} className={`${rowBg} transition`}>
                          <td className="px-3 py-2 text-slate-400 font-mono">{row._rowNum}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700">{row.code || <span className="text-red-400 italic">—</span>}</td>
                          <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{row.description}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{row.uCostFlag}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{row.invAcct || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{row.expAcct || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{row.rrAcct  || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-slate-600">{row.rcCode || <span className="text-slate-300">—</span>}</td>
                          {importStep === "results" && (
                            <>
                              <td className="px-3 py-2">
                                {isValid ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={10} /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                                    <XCircle size={10} /> {isFailed ? "Failed" : "Invalid"}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-500 max-w-[220px]">{row.remarks}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 shrink-0">
              <div className="text-[11px] text-slate-400">
                {importStep === "results" && (
                  <span>
                    <span className="font-semibold text-emerald-600">{validatedRows.filter((r) => r.status === "Valid").length} valid</span>
                    {" · "}
                    <span className="font-semibold text-red-500">{validatedRows.filter((r) => r.status !== "Valid").length} invalid</span>
                    {" of "}
                    {validatedRows.length} rows
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isValidating || isBulkSaving}
                  onClick={() => {
                    setImportModal(false);
                    setImportRows([]);
                    setValidatedRows([]);
                    setImportStep("upload");
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                {importStep === "upload" && (
                  <button
                    type="button"
                    disabled={isValidating || importRows.length === 0}
                    onClick={handleValidate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isValidating ? (
                      <><Loader2 size={12} className="animate-spin" /> Validating…</>
                    ) : (
                      <><CheckCircle2 size={12} /> Validate</>
                    )}
                  </button>
                )}

                {importStep === "results" && (
                  <>
                    <button
                      type="button"
                      disabled={isValidating || isBulkSaving}
                      onClick={() => { setImportStep("upload"); setValidatedRows([]); }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      Re-validate
                    </button>
                    <button
                      type="button"
                      disabled={isBulkSaving || validatedRows.filter((r) => r.status === "Valid").length === 0}
                      onClick={handleBulkImport}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBulkSaving ? (
                        <><Loader2 size={12} className="animate-spin" /> Importing…</>
                      ) : (
                        <><CheckCircle2 size={12} /> Import Valid ({validatedRows.filter((r) => r.status === "Valid").length})</>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

CategoryCodes.displayName = "CategoryCodes";
export default CategoryCodes;