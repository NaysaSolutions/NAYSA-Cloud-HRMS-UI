// src/NAYSA Cloud/Reference File/PayTermRef.jsx

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
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUndo, faEdit, faTrashAlt, faInfoCircle, faChevronDown, faFilePdf, faVideo } from "@fortawesome/free-solid-svg-icons";

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

/* ================= HELPERS ================= */

const Card = ({ children }) => (
  <div className="global-tran-textbox-group-div-ui self-start !h-fit">{children}</div>
);

const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-[10px] font-bold text-slate-500 tracking-widest border-b pb-2 uppercase">{title}</div>
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
  paytermCode: "",
  paytermName: "",
  daysDue: 0,
  advances: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

// 1. ADDED onStateChange TO DESTRUCTURED PROPS
const PayTermRef = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
}, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tableSize = "Half";

  const userCode =
    user?.USER_CODE || user?.userCode || user?.code || "ADMIN";

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

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);


  /* ================= LOAD LIST ================= */

  const paytermListQuery = useQuery({
    queryKey: ["paytermList"],
    queryFn: async () => {
      const res = await apiClient.get("/payterm");
      return extractRows(res);
    },
  });

  const payterms = useMemo(
    () => paytermListQuery.data || [],
    [paytermListQuery.data]
  );

  const isInitialLoading = paytermListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (paytermCode) => {
    const c = String(paytermCode || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkDuplicatePayterm", {
      json_data: { paytermCode: c },
    });

    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
    const parsed = JSON.parse(raw);

    return String(parsed?.result) === "1";
  };

  const checkInUsed = async (paytermCode) => {
    const c = String(paytermCode || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkInUsedPayterm", {
      json_data: { paytermCode: c },
    });

    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
    const parsed = JSON.parse(raw);

    return String(parsed?.result) === "1";
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

    const code = String(form.paytermCode || "").trim();
    if (!code || !isEditing || form.__existing) return;

    const dup = await checkDuplicate(code);

    if (dup) {
      setIsDupCode(true);
      await useSwalErrorAlert(
        "Duplicate Entry",
        `Payment Term Code "${code}" already exists.`
      );
      setField("paytermCode", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertPayterm", {
        json_data: {
          paytermCode: payload.paytermCode,
          paytermName: payload.paytermName,
          dueDays: payload.dueDays,
          advances: payload.advances,
          userCode: payload.userCode,
        },
      });
    },
    onSuccess: async (response) => {
      const row = response?.data?.data?.[0] || response?.data || {};

      const errorcount = Number(row?.errorcount ?? 0);
      const errormsg = String(row?.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert(
          "Validation Error",
          errormsg || "Please fill in the required field(s)."
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["paytermList"] });
      await queryClient.invalidateQueries({ queryKey: ["lookupPayterms"] });

      await useSwalSuccessAlert("Success!", "Payment Term saved successfully.");
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
        "Failed to save payment term.";

      await useSwalErrorAlert("Validation Error", msg);
    },
  });

  const handleSave = useCallback(async () => {
    if (!canSave || isReadOnly) {
      await showReadOnlyAlert("save payment terms");
      return;
    }

    if (!isEditing || saveMutation.isPending) return;

    const dueDays = form.daysDue === "" || form.daysDue === null
      ? 0
      : Number(form.daysDue);

    if (dueDays < 0) {
      useSwalErrorAlert(
        "Validation Error",
        "Due Days cannot be negative."
      );
      return;
    }

    const payload = {
      paytermCode: String(form.paytermCode || "").trim().toUpperCase(),
      paytermName: String(form.paytermName || "").trim(),
      dueDays,
      advances: form.advances === "Y" ? "Y" : "",
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode, canSave, isReadOnly, showReadOnlyAlert]);

  /* ================= DELETE ================= */
  const deleteMutation = useMutation({
    mutationFn: async (paytermCode) => {
      return apiClient.post("/deletePayterm", {
        json_data: { paytermCode, userCode },
      });
    },
    onSuccess: async (response, paytermCode) => {
      const sqlRow = response?.data?.data?.[0] || {};
      const errorcount = Number(sqlRow.errorcount ?? 0);
      const errormsg = String(sqlRow.errormsg ?? "");

      if (errorcount > 0) {
        await useSwalErrorAlert("Error", errormsg);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["paytermList"] });
      await queryClient.invalidateQueries({ queryKey: ["lookupPayterms"] });


      await useSwalDeleteRecord(
        "Deleted",
        `Payment Term Code ${paytermCode} has been successfully removed.`
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
        "Failed to delete payment term.";

      await useSwalErrorAlert("Error", msg);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      if (!canDelete || isReadOnly) {
        await showReadOnlyAlert("delete payment terms");
        return;
      }

      const code = row?.paytermCode;
      if (!code) return;

      const used = await checkInUsed(code);

      if (used) {
        return useSwalErrorAlert(
          "Cannot Delete",
          `Payment Term "${code}" is already in use.`
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Delete Record?",
        `Are you sure you want to delete "${code}"?`
      );

      if (!confirm?.isConfirmed) return;

      deleteMutation.mutate(code);
    },
    [deleteMutation, canDelete, isReadOnly, showReadOnlyAlert]
  );

  /* ================= EDIT ================= */

  const loadRecord = useCallback(async (row, editMode = false) => {
    try {
      const res = await apiClient.get("/getPayterm", {
        params: { PAYTERM_CODE: row.paytermCode },
      });

      const record = extractRows(res)?.[0];

      const normalizedRecord = {
        ...record,
        advances: record.advances || record.ADVANCES || "",
        daysDue: record.daysDue || record.DAYS_DUE || record.dueDays || "",
      };

      setForm({ ...DEFAULT_FORM, ...normalizedRecord, __existing: true });
      setIsEditing(Boolean(editMode));
      setSelectedRow(row);
    } catch {
      Swal.fire("Error", "Could not fetch record", "error");
    }
  }, []);

  const handleRetrieve = useCallback(async (row) => {
    await loadRecord(row, false);
  }, [loadRecord]);

  const handleEdit = useCallback(async (row) => {
    if (!canEdit || isReadOnly) {
      await showReadOnlyAlert("edit payment terms");
      return;
    }

    await loadRecord(row, true);
  }, [canEdit, isReadOnly, loadRecord, showReadOnlyAlert]);

  const handleRowDoubleClick = useCallback(async (row) => {
    if (canEdit && !isReadOnly) {
      await loadRecord(row, true);
      return;
    }

    await loadRecord(row, false);
  }, [canEdit, isReadOnly, loadRecord]);

  /* ================= TABLE ================= */

  const tableColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        render: (row) => (
          <div className="flex items-center justify-center gap-2">

            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
              disabled={isReadOnly || !canEdit}
              className={`global-ref-td-button-edit-ui ${
                isReadOnly || !canEdit ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={isReadOnly || !canEdit ? "Read Only" : "Edit"}
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              disabled={isReadOnly || !canDelete}
              className={`global-ref-td-button-delete-ui ${
                isReadOnly || !canDelete ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={isReadOnly || !canDelete ? "Read Only" : "Delete"}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>

          </div>
        ),
      },
      { key: "paytermCode", label: "Payment Term Code", sortable: true, width: 100 },
      { key: "paytermName", label: "Payment Term Name", sortable: true, width: 220 },
      { key: "daysDue", label: "Due Days", sortable: true, width: 90 },
      {
        key: "advances",
        label: "AP Advances",
        sortable: true,
        width: 120,
        render: (row) => (row.advances === "Y" ? "Yes" : "No"),
      },
    ],
    [handleEdit, handleDelete, isReadOnly, canEdit, canDelete]
  );

  const tableData = useMemo(
    () =>
      (Array.isArray(payterms) ? payterms : [])
        .filter((row) => {
          const s = String(search || "").trim().toLowerCase();
          if (!s) return true;

          const advStatus = row.advances === "Y" ? "yes" : "no";

          return (
            String(row?.paytermCode || "").toLowerCase().includes(s) ||
            String(row?.paytermName || "").toLowerCase().includes(s) ||
            String(row?.daysDue || "").toLowerCase().includes(s) ||
            advStatus.includes(s)
          );
        })
        .map((row, index) => ({
          ...row,
          __idx: index,
        })),
    [payterms, search]
  );

  /* ================= EXPOSE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: isEditing && !isDupCode && !saveMutation.isPending && canSave && !isReadOnly,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange, canSave, isReadOnly]);


  // 3. THIS ALLOWS VENDMAST TO CALL THESE FUNCTIONS WHEN BUTTONS ARE CLICKED
  useImperativeHandle(ref, () => ({
    add: async () => {
      if (!canAdd || isReadOnly) {
        await showReadOnlyAlert("add payment terms");
        return;
      }

      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
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

  /* ================= RENDER ================= */
  // 4. REMOVED LOCAL BUTTON BAR UI

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 w-full">
      {/* FORM */}
      <div className="xl:col-span-4">
        <Card>
          <SectionHeader title="Basic Information" />

          <FieldRenderer
            label="Payment Term Code"
            required
            value={form.paytermCode}
            inputRef={codeInputRef}
            maxLength={5}
            onChange={(v) => setField("paytermCode", String(v ?? "").toUpperCase())}
            onBlur={handleCodeValidate}
            onKeyDown={handleCodeValidate}
            disabled={isReadOnly || !isEditing || form.__existing}
          />

          <FieldRenderer
            label="Payment Term Name"
            required
            value={form.paytermName}
            maxLength={50}
            onChange={(v) => setField("paytermName", v ?? "")}
            disabled={isReadOnly || !isEditing}
          />

          <FieldRenderer
            label="Due Days"
            type="number"
            value={form.daysDue}
            min={0}
            onChange={(v) => {
              const value = v ?? "";

              if (value === "") {
                setField("daysDue", "");
                return;
              }

              const numValue = Number(value);

              if (numValue < 0) {
                setField("daysDue", 0);
                return;
              }

              setField("daysDue", value);
            }}
            disabled={isReadOnly || !isEditing}
          />
          <FieldRenderer
            label="AP Advances"
            type="select"
            value={!form.advances || form.advances === "" ? "N" : form.advances}
            onChange={(v) => {
              setField("advances", v === "N" ? "" : "Y");
            }}
            options={[
              { value: "N", label: "No" },
              { value: "Y", label: "Yes" },
            ]}
            disabled={isReadOnly || !isEditing}
          />

          <RegistrationInfo data={form} layout="stacked" />
        </Card>
      </div>

      {/* LIST */}
      <div className="xl:col-span-8">
        <div className="global-tran-table-main-div-ui">
          <SearchGlobalReferenceTable
            columns={tableColumns}
            data={tableData}
            isLoading={isInitialLoading}
            docType="Payment Terms"
            itemsPerPage={10}
            onRowDoubleClick={handleRowDoubleClick}
            onRowClick={(row) => setSelectedRow(row)}
            showFilters
            tableSize={tableSize}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["paytermList"] })}
          />
        </div>
      </div>
    </div>
  );
});

export default PayTermRef;