// src/NAYSA Cloud/Master Data/FAMasterData/ReferenceCodes/FACategoryCodes.jsx

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
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
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
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
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

const parsePossibleJson = (value, fallback = []) => {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "string") return parsePossibleJson(res, []);
  return [];
};

const normalizeAcctCode = (selected = {}) =>
  selected.acctCode || selected.acct_code || selected.code || selected.ACCT_CODE || "";

const normalizeAcctName = (selected = {}) =>
  selected.acctName || selected.acct_name || selected.description || selected.ACCT_NAME || "";

const getInUseResult = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data;

  const parsed = parsePossibleJson(raw, raw);
  return String(parsed?.result ?? parsed ?? "0").trim();
};

/* ================= DEFAULT FORM ================= */

const DEFAULT_FORM = {
  code: "",
  description: "",

  assetAcct: "",
  assetAcctName: "",
  accumAcct: "",
  accumAcctName: "",
  expAcct: "",
  expAcctName: "",
  gainAcct: "",
  gainAcctName: "",
  lossAcct: "",
  lossAcctName: "",
  arAcct: "",
  arAcctName: "",
  salesAcct: "",
  salesAcctName: "",
  clearingAcct: "",
  clearingAcctName: "",

  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const ACCOUNT_FIELDS = [
  {
    key: "asset",
    label: "Asset Account",
    codeField: "assetAcct",
    nameField: "assetAcctName",
    importHeader: "Asset Account",
  },
  {
    key: "accum",
    label: "Accumulated Depreciation Account",
    codeField: "accumAcct",
    nameField: "accumAcctName",
    importHeader: "Accumulated Depreciation Account",
  },
  {
    key: "exp",
    label: "Depreciation Expense Account",
    codeField: "expAcct",
    nameField: "expAcctName",
    importHeader: "Depreciation Expense Account",
  },
  {
    key: "gain",
    label: "Gain Account",
    codeField: "gainAcct",
    nameField: "gainAcctName",
    importHeader: "Gain Account",
  },
  {
    key: "loss",
    label: "Loss Account",
    codeField: "lossAcct",
    nameField: "lossAcctName",
    importHeader: "Loss Account",
  },
  {
    key: "ar",
    label: "AR Account",
    codeField: "arAcct",
    nameField: "arAcctName",
    importHeader: "AR Account",
  },
  {
    key: "sales",
    label: "Sales Account",
    codeField: "salesAcct",
    nameField: "salesAcctName",
    importHeader: "Sales Account",
  },
  {
    key: "clearing",
    label: "Clearing Account",
    codeField: "clearingAcct",
    nameField: "clearingAcctName",
    importHeader: "Clearing Account",
  },
];

/* ================= COMPONENT ================= */

const FACategCodes = forwardRef(
  (
    {
      onStateChange,
      isReadOnly = false,
      canAdd = true,
      canEdit = true,
      canSave = true,
      canDelete = true,
    },
    ref
  ) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

    const codeInputRef = useRef(null);
    const enterValidatedRef = useRef(false);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState(DEFAULT_FORM);
    const [selectedRow, setSelectedRow] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDupCode, setIsDupCode] = useState(false);
    const [search, setSearch] = useState("");

    const [importModal, setImportModal] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [validatedRows, setValidatedRows] = useState([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [importStep, setImportStep] = useState("upload"); // upload | results

    const [isCoaOpen, setIsCoaOpen] = useState(false);
    const [lookupField, setLookupField] = useState("");

    const setField = useCallback((key, value) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const resetForm = useCallback((next = DEFAULT_FORM) => {
      setForm(next);
    }, []);

    const showReadOnlyAlert = useCallback(async (action = "perform this action") => {
      await useSwalErrorAlert("Read Only", `You only have read access. You are not allowed to ${action}.`);
    }, []);

    /* ================= LOAD LIST ================= */

    const categoryListQuery = useQuery({
      queryKey: ["faCategList"],
      queryFn: async () => {
        const res = await apiClient.get("/faCateg");
        return extractRows(res);
      },
    });

    const categories = useMemo(() => categoryListQuery.data || [], [categoryListQuery.data]);
    const isInitialLoading = categoryListQuery.isLoading;

    /* ================= NORMALIZE RECORD ================= */

    const buildRecordFromRow = useCallback((row = {}) => ({
      code: row.code || row.categCode || row.categ_code || row.CATEG_CODE || "",
      description:
        row.description || row.categName || row.categDesc || row.categ_name || row.CATEG_NAME || "",

      assetAcct: row.assetAcct || row.assetacctCode || row.assetacct_code || row.ASSETACCT_CODE || "",
      assetAcctName: row.assetAcctName || row.assetAcct_name || row.asset_acct_name || row.assetAcctDesc || "",

      accumAcct: row.accumAcct || row.accumacctCode || row.accumacct_code || row.ACCUMACCT_CODE || "",
      accumAcctName: row.accumAcctName || row.accum_acct_name || row.accumAcctDesc || "",

      expAcct: row.expAcct || row.expacctCode || row.expacct_code || row.EXPACCT_CODE || "",
      expAcctName: row.expAcctName || row.exp_acct_name || row.expAcctDesc || "",

      gainAcct: row.gainAcct || row.gainacctCode || row.gainacct_code || row.GAINACCT_CODE || "",
      gainAcctName: row.gainAcctName || row.gain_acct_name || row.gainAcctDesc || "",

      lossAcct: row.lossAcct || row.lossacctCode || row.lossacct_code || row.LOSSACCT_CODE || "",
      lossAcctName: row.lossAcctName || row.loss_acct_name || row.lossAcctDesc || "",

      arAcct: row.arAcct || row.aracctCode || row.aracct_code || row.ARACCT_CODE || "",
      arAcctName: row.arAcctName || row.ar_acct_name || row.arAcctDesc || "",

      salesAcct: row.salesAcct || row.salesacctCode || row.salesacct_code || row.SALESACCT_CODE || "",
      salesAcctName: row.salesAcctName || row.sales_acct_name || row.salesAcctDesc || "",

      clearingAcct:
        row.clearingAcct || row.clearingacctCode || row.clearingacct_code || row.CLEARINGACCT_CODE || "",
      clearingAcctName: row.clearingAcctName || row.clearing_acct_name || row.clearingAcctDesc || "",

      registeredBy: row.registeredBy || row.registered_by || row.REGISTERED_BY || "",
      registeredDate: row.registeredDate || row.registered_date || row.REGISTERED_DATE || "",
      lastUpdatedBy:
        row.lastUpdatedBy || row.last_updated_by || row.updatedBy || row.updated_by || row.UPDATED_BY || "",
      lastUpdatedDate:
        row.lastUpdatedDate || row.last_updated_date || row.updatedDate || row.updated_date || row.UPDATED_DATE || "",
    }), []);

    /* ================= DUPLICATE CHECK ================= */

    const checkDuplicate = async (code) => {
      const c = String(code || "").trim();
      if (!c) return false;

      try {
        return categories.some((item) =>
          String(item.code || item.categCode || item.categ_code || "").toUpperCase() === c.toUpperCase()
        );
      } catch {
        return false;
      }
    };

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

    /* ================= TEMPLATE / IMPORT ================= */

    const handleDownloadTemplate = () => {
      const headers = [
        "Category Code",
        "Category Description",
        ...ACCOUNT_FIELDS.map((field) => field.importHeader),
      ];

      const sample = [
        [
          "15009",
          "Sample FA Category",
          "15009",
          "15109",
          "51027",
          "60005",
          "60005",
          "11002",
          "40001",
          "10199",
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
      ws["!cols"] = headers.map((header) => ({ wch: Math.max(18, header.length + 2) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "FA Category Template");
      XLSX.writeFile(wb, "FACategory_ImportTemplate.xlsx");
    };

    const handleFileChange = (e) => {
      if (isReadOnly || !canAdd) {
        e.target.value = "";
        showReadOnlyAlert("import category codes");
        return;
      }

      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

          const mapped = rawRows.map((r, idx) => ({
            _rowNum: idx + 2,
            code: String(r["Category Code"] || "").trim(),
            description: String(r["Category Description"] || "").trim(),
            assetAcct: String(r["Asset Account"] || "").trim(),
            accumAcct: String(r["Accumulated Depreciation Account"] || r["Accum Depr Account"] || "").trim(),
            expAcct: String(r["Depreciation Expense Account"] || r["Depreciation Account"] || "").trim(),
            gainAcct: String(r["Gain Account"] || "").trim(),
            lossAcct: String(r["Loss Account"] || "").trim(),
            arAcct: String(r["AR Account"] || "").trim(),
            salesAcct: String(r["Sales Account"] || "").trim(),
            clearingAcct: String(r["Clearing Account"] || "").trim(),
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

    const handleValidate = async () => {
      if (!importRows.length) return;
      setIsValidating(true);

      try {
        const res = await apiClient.post("/validateFACategBulk", {
          json_data: { rows: importRows },
        });

        const raw =
          res?.data?.data?.[0]?.result ??
          res?.data?.result ??
          res?.data?.data;

        const results = Array.isArray(raw) ? raw : parsePossibleJson(raw, []);

        const merged = importRows.map((row) => {
          const found = results.find((r) => String(r.rowNum || r._rowNum) === String(row._rowNum));
          return {
            ...row,
            status: found?.status ?? "Valid",
            remarks: found?.remarks ?? "Ready for import.",
          };
        });

        setValidatedRows(merged);
        setImportStep("results");
      } catch {
        const localValidated = importRows.map((row) => {
          const missing = [];
          if (!row.code) missing.push("Category Code");
          if (!row.description) missing.push("Category Description");

          return {
            ...row,
            status: missing.length ? "Invalid" : "Valid",
            remarks: missing.length ? `Missing required field(s): ${missing.join(", ")}` : "Ready for import.",
          };
        });

        setValidatedRows(localValidated);
        setImportStep("results");
      } finally {
        setIsValidating(false);
      }
    };

    const buildSaveJson = (payload) => ({
      json_data: JSON.stringify({
        json_data: {
          code: payload.code,
          description: payload.description,
          assetAcct: payload.assetAcct,
          accumAcct: payload.accumAcct,
          expAcct: payload.expAcct,
          gainAcct: payload.gainAcct,
          lossAcct: payload.lossAcct,
          arAcct: payload.arAcct,
          salesAcct: payload.salesAcct,
          clearingAcct: payload.clearingAcct,
          userCode: payload.userCode,
        },
      }),
    });

    const handleBulkImport = async () => {
      if (isReadOnly || !canAdd) {
        await showReadOnlyAlert("import category codes");
        return;
      }

      const toImport = validatedRows.filter((r) => r.status === "Valid");
      if (!toImport.length) return;

      const confirm = await Swal.fire({
        title: "Import Valid Rows?",
        text: `${toImport.length} valid row(s) will be saved as FA Category Codes.`,
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
          const payload = {
            ...row,
            code: String(row.code || "").trim(),
            description: String(row.description || "").trim(),
            assetAcct: String(row.assetAcct || "").trim(),
            accumAcct: String(row.accumAcct || "").trim(),
            expAcct: String(row.expAcct || "").trim(),
            gainAcct: String(row.gainAcct || "").trim(),
            lossAcct: String(row.lossAcct || "").trim(),
            arAcct: String(row.arAcct || "").trim(),
            salesAcct: String(row.salesAcct || "").trim(),
            clearingAcct: String(row.clearingAcct || "").trim(),
            userCode,
          };

          const res = await apiClient.post("/upsertFACateg", buildSaveJson(payload));
          const sqlRow = res?.data?.data?.[0] || res?.data || {};
          const errcount = Number(sqlRow?.errorcount ?? sqlRow?.errorCount ?? 0);

          if (errcount > 0) {
            failCount++;
            setValidatedRows((prev) =>
              prev.map((r) =>
                r._rowNum === row._rowNum
                  ? { ...r, status: "Import Failed", remarks: sqlRow?.errormsg || "Sproc rejected the record." }
                  : r
              )
            );
          } else {
            successCount++;
          }
        } catch {
          failCount++;
          setValidatedRows((prev) =>
            prev.map((r) =>
              r._rowNum === row._rowNum
                ? { ...r, status: "Import Failed", remarks: "Failed to save this row." }
                : r
            )
          );
        }
      }

      setIsBulkSaving(false);
      queryClient.invalidateQueries({ queryKey: ["faCategList"] });

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
      mutationFn: async (payload) => apiClient.post("/upsertFACateg", buildSaveJson(payload)),
      onSuccess: async (response) => {
        const row = response?.data?.data?.[0] || response?.data || {};
        const errorcount = Number(row?.errorcount ?? row?.errorCount ?? 0);
        const errormsg = String(row?.errormsg ?? row?.errorMsg ?? "");

        if (errorcount > 0) {
          await useSwalErrorAlert("Validation Error", errormsg || "Unable to save record.");
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["faCategList"] });
        await useSwalSuccessAlert("Success!", "FA Category Code saved successfully.");

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
          "Failed to save FA category code.";
        await useSwalErrorAlert("Validation Error", msg);
      },
    });

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
        assetAcct: String(form.assetAcct || "").trim(),
        accumAcct: String(form.accumAcct || "").trim(),
        expAcct: String(form.expAcct || "").trim(),
        gainAcct: String(form.gainAcct || "").trim(),
        lossAcct: String(form.lossAcct || "").trim(),
        arAcct: String(form.arAcct || "").trim(),
        salesAcct: String(form.salesAcct || "").trim(),
        clearingAcct: String(form.clearingAcct || "").trim(),
        userCode,
      };

      saveMutation.mutate(payload);
    }, [form, isEditing, saveMutation, userCode, isReadOnly, canSave, showReadOnlyAlert]);

    /* ================= DELETE ================= */

    const deleteMutation = useMutation({
      mutationFn: async (code) => apiClient.post("/deleteFACateg", { json_data: { code, userCode } }),
      onSuccess: async (response, deletedCode) => {
        const sqlRow = response?.data?.data?.[0] || response?.data || {};
        const errorcount = Number(sqlRow.errorcount ?? sqlRow.errorCount ?? 0);
        const errormsg = String(sqlRow.errormsg ?? sqlRow.errorMsg ?? "");

        if (errorcount > 0) {
          await useSwalErrorAlert("Error", errormsg || "Unable to delete record.");
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["faCategList"] });
        await useSwalDeleteRecord("Deleted", `FA Category Code "${deletedCode}" has been successfully removed.`);

        resetForm(DEFAULT_FORM);
        setIsEditing(false);
        setSelectedRow(null);
      },
      onError: async (error) => {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.message ||
          "Failed to delete FA category code.";
        await useSwalErrorAlert("Error", msg);
      },
    });

    const handleDelete = useCallback(async (row) => {
      if (isReadOnly || !canDelete) {
        await showReadOnlyAlert("delete category codes");
        return;
      }

      const code = row?.code || row?.categCode || row?.categ_code;
      if (!code) return;

      try {
        const checkRes = await apiClient.post("/checkInUsedFACateg", {
          json_data: { code },
        });
        const result = getInUseResult(checkRes);

        if (result === "1") {
          await useSwalErrorAlert(
            "Cannot Delete",
            `FA Category Code "${code}" is currently in use and cannot be deleted.`
          );
          return;
        }
      } catch {
        await useSwalErrorAlert("Error", "Failed to check if record is in use.");
        return;
      }

      const confirm = await useSwalDeleteConfirm("Delete Record?", `Are you sure you want to delete "${code}"?`);
      if (!confirm?.isConfirmed) return;

      deleteMutation.mutate(code);
    }, [deleteMutation, isReadOnly, canDelete, showReadOnlyAlert]);

    /* ================= EDIT / RETRIEVE ================= */

    const handleRetrieve = async (row) => {
      try {
        const normalized = buildRecordFromRow(row);
        setForm({ ...DEFAULT_FORM, ...normalized, __existing: true });
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
        const normalized = buildRecordFromRow(row);
        setForm({ ...DEFAULT_FORM, ...normalized, __existing: true });
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

    /* ================= TABLE ================= */

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
      { key: "assetAcct", label: "Asset Acct", sortable: true, width: 120 },
      { key: "accumAcct", label: "Accum Depr Acct", sortable: true, width: 150 },
      { key: "expAcct", label: "Depr Expense Acct", sortable: true, width: 150 },
      { key: "gainAcct", label: "Gain Acct", sortable: true, width: 120 },
      { key: "lossAcct", label: "Loss Acct", sortable: true, width: 120 },
      { key: "arAcct", label: "AR Acct", sortable: true, width: 120 },
      { key: "salesAcct", label: "Sales Acct", sortable: true, width: 120 },
      { key: "clearingAcct", label: "Clearing Acct", sortable: true, width: 130 },
    ], [handleDelete, isReadOnly, canEdit, canDelete]);

    const tableData = useMemo(() => {
      const list = Array.isArray(categories) ? categories : [];
      const mapped = list.map((row, index) => ({
        ...row,
        ...buildRecordFromRow(row),
        __idx: index,
      }));

      return mapped.filter((row) => {
        const s = String(search || "").trim().toLowerCase();
        if (!s) return true;

        return (
          String(row.code || "").toLowerCase().includes(s) ||
          String(row.description || "").toLowerCase().includes(s) ||
          ACCOUNT_FIELDS.some((field) => String(row[field.codeField] || "").toLowerCase().includes(s))
        );
      });
    }, [categories, search, buildRecordFromRow]);

    /* ================= PARENT EVENTS ================= */

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

    const openCoaLookup = (field) => {
      setLookupField(field);
      setIsCoaOpen(true);
    };

    const isLoading = isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

    /* ================= RENDER ================= */

    return (
      <div className="flex flex-col h-full gap-3 w-full relative">
        {isLoading && <LoadingSpinner />}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 shrink-0">
          <Card className="p-4 flex flex-col">
            <SectionHeader title="BASIC INFORMATION" />
            <div className="space-y-3">
              <FieldRenderer
                label="Category Code"
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
                label="Category Description"
                required
                value={form.description}
                maxLength={150}
                onChange={(v) => setField("description", v ?? "")}
                disabled={isReadOnly || !isEditing}
              />
            </div>
          </Card>

          <Card className="p-4 flex flex-col">
            <SectionHeader title="ACCOUNTING INFORMATION" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {ACCOUNT_FIELDS.map((field) => {
                const acctCode = form[field.codeField];
                const acctName = form[field.nameField];

                return (
                  <FieldRenderer
                    key={field.key}
                    label={field.label}
                    type="lookup"
                    value={acctCode ? `${acctCode}${acctName ? ` — ${acctName}` : ""}` : ""}
                    onLookup={() => openCoaLookup(field.key)}
                    onChange={(v) => {
                      setField(field.codeField, v ?? "");
                      if (!v) setField(field.nameField, "");
                    }}
                    disabled={isReadOnly || !isEditing}
                  />
                );
              })}
            </div>
          </Card>

          <RegistrationInfo data={form} layout="stacked" />
        </div>

        <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden min-h-[300px] flex flex-col">
          <SearchGlobalReferenceTable
            columns={tableColumns}
            data={tableData}
            isLoading={isInitialLoading}
            docType="FA Category Codes"
            itemsPerPage={50}
            onRowDoubleClick={handleRowDoubleClick}
            onRowClick={(row) => setSelectedRow(row)}
            showFilters
            autoFillGrid
          />
        </div>

        <SearchCOAMast
          isOpen={isCoaOpen}
          source={lookupField}
          customParam="ActiveAll"
          onClose={(selected, source) => {
            setIsCoaOpen(false);
            if (!selected) return;

            const field = ACCOUNT_FIELDS.find((item) => item.key === source);
            if (!field) return;

            setField(field.codeField, normalizeAcctCode(selected));
            setField(field.nameField, normalizeAcctName(selected));
          }}
        />

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
              className="relative flex w-full max-w-7xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 border border-blue-200">
                    <FileSpreadsheet size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Import FA Category Codes</h2>
                    <p className="text-[11px] text-slate-400">
                      {importStep === "upload"
                        ? `${importRows.length} row(s) parsed — click Validate to check the file`
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
                        {ACCOUNT_FIELDS.map((field) => (
                          <th key={field.key} className="px-3 py-2 text-left font-semibold text-slate-500">
                            {field.label}
                          </th>
                        ))}
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
                        const isValid = row.status === "Valid";
                        const isFailed = row.status === "Import Failed";
                        const rowBg = importStep === "results"
                          ? isValid
                            ? "bg-emerald-50/60"
                            : isFailed
                              ? "bg-red-50/60"
                              : "bg-red-50/40"
                          : "";

                        return (
                          <tr key={row._rowNum} className={`${rowBg} transition`}>
                            <td className="px-3 py-2 text-slate-400 font-mono">{row._rowNum}</td>
                            <td className="px-3 py-2 font-semibold text-slate-700">
                              {row.code || <span className="text-red-400 italic">—</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{row.description}</td>
                            {ACCOUNT_FIELDS.map((field) => (
                              <td key={field.key} className="px-3 py-2 font-mono text-slate-600">
                                {row[field.codeField] || <span className="text-slate-300">—</span>}
                              </td>
                            ))}
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
                                <td className="px-3 py-2 text-slate-500 max-w-[260px]">{row.remarks}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 shrink-0">
                <div className="text-[11px] text-slate-400">
                  {importStep === "results" && (
                    <span>
                      <span className="font-semibold text-emerald-600">
                        {validatedRows.filter((r) => r.status === "Valid").length} valid
                      </span>
                      {" · "}
                      <span className="font-semibold text-red-500">
                        {validatedRows.filter((r) => r.status !== "Valid").length} invalid
                      </span>
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
                        <>
                          <Loader2 size={12} className="animate-spin" /> Validating…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} /> Validate
                        </>
                      )}
                    </button>
                  )}

                  {importStep === "results" && (
                    <>
                      <button
                        type="button"
                        disabled={isValidating || isBulkSaving}
                        onClick={() => {
                          setImportStep("upload");
                          setValidatedRows([]);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        Re-validate
                      </button>
                      <button
                        type="button"
                        disabled={
                          isBulkSaving ||
                          validatedRows.filter((r) => r.status === "Valid").length === 0
                        }
                        onClick={handleBulkImport}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBulkSaving ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> Importing…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} /> Import Valid ({validatedRows.filter((r) => r.status === "Valid").length})
                          </>
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
  }
);

FACategCodes.displayName = "FACategCodes";
export default FACategCodes;
