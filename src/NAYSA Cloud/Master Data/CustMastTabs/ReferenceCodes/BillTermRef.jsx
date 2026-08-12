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
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";

/* ================= HELPERS ================= */

const Card = ({ children }) => (
  <div className="global-tran-textbox-group-div-ui self-start !h-fit w-full">
    {children}
  </div>
);

const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-[10px] font-bold text-slate-500 tracking-widest border-b pb-2 uppercase">
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
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const DEFAULT_FORM = {
  billtermCode: "",
  billtermName: "",
  daysDue: 0,
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const normalizeRecord = (record) => ({
  billtermCode: record?.billtermCode ?? record?.billterm_code ?? record?.code ?? "",
  billtermName: record?.billtermName ?? record?.billterm_name ?? record?.name ?? "",
  daysDue: record?.daysDue ?? record?.days_due ?? record?.dueDays ?? 0,
  registeredBy: record?.registeredBy ?? "",
  registeredDate: record?.registeredDate ?? "",
  lastUpdatedBy: record?.lastUpdatedBy ?? "",
  lastUpdatedDate: record?.lastUpdatedDate ?? "",
  __existing: false,
});

/* ================= COMPONENT ================= */

const BillTermRef = forwardRef(({ onStateChange }, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userCode = user?.USER_CODE || user?.userCode || user?.user_code || user?.code || "ADMIN";

  const docType = "BillTermRef";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const codeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);
  const [search, setSearch] = useState("");

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  /* ================= LOAD LIST ================= */

  const billtermListQuery = useQuery({
    queryKey: ["billtermList"],
    queryFn: async () => {
      const res = await apiClient.get("/billterm");
      const rows = extractRows(res);
      return Array.isArray(rows) ? rows.map(normalizeRecord) : [];
    },
  });

  const billterms = useMemo(() => billtermListQuery.data || [], [billtermListQuery.data]);
  const isInitialLoading = billtermListQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (billtermCode) => {
    const c = String(billtermCode || "").trim();
    if (!c) return false;
    const res = await apiClient.post("/checkDuplicateBillterm", { json_data: { billtermCode: c } });
    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
    const parsed = JSON.parse(raw);
    return String(parsed?.result) === "1";
  };

  const checkInUsed = async (billtermCode) => {
    const c = String(billtermCode || "").trim();
    if (!c) return false;
    try {
      const res = await apiClient.post("/checkInUsedBillterm", { json_data: { billtermCode: c } });
      const raw = res?.data?.data?.[0]?.result ?? '{"result":"0"}';
      return String(JSON.parse(raw)?.result) === "1";
    } catch { return false; }
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
    const code = String(form.billtermCode || "").trim();
    if (!code || !isEditing || form.__existing) return;
    if (await checkDuplicate(code)) {
      setIsDupCode(true);
      await useSwalErrorAlert("Duplicate Entry", `Code "${code}" already exists.`);
      setField("billtermCode", "");
      setTimeout(() => codeInputRef.current?.focus(), 0);
    } else { setIsDupCode(false); }
  };

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertBillterm", {
        json_data: JSON.stringify({
          json_data: {
            billtermCode: payload.billtermCode,
            billtermName: payload.billtermName,
            dueDays: payload.dueDays,
            userCode: payload.userCode,
          },
        }),
      });
    },
    onSuccess: async (response) => {
      const row = response?.data || {};
      if (Number(row?.errorcount ?? 0) > 0) {
        await useSwalErrorAlert("Validation Error", row?.errormsg || "Save failed.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["billtermList"] });
      await useSwalSuccessAlert("Success!", "Billing Term saved.");
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
    },
  });

  const handleSave = useCallback(() => {
    if (!isEditing || saveMutation.isPending) return;
    saveMutation.mutate({
      billtermCode: String(form.billtermCode || "").trim().toUpperCase(),
      billtermName: String(form.billtermName || "").trim(),
      dueDays: form.daysDue === "" ? 0 : Number(form.daysDue),
      userCode,
    });
  }, [form, isEditing, saveMutation, userCode]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => apiClient.post("/deleteBillterm", { json_data: { billtermCode: code, userCode } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billtermList"] });
      useSwalDeleteRecord("Deleted", "Record has been removed.");
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
    },
  });

  const handleDelete = useCallback(async (row) => {
    const code = row?.billtermCode;
    if (!code) return;
    if (await checkInUsed(code)) return useSwalErrorAlert("In Use", "Record is currently in use.");
    const confirm = await useSwalDeleteConfirm("Delete?", `Remove "${code}"?`);
    if (confirm?.isConfirmed) deleteMutation.mutate(code);
  }, [deleteMutation]);

  /* ================= EDIT ================= */

  const handleEdit = async (row) => {
    try {
      const res = await apiClient.get("/getBillterm", { params: { BILLTERM_CODE: row.billtermCode } });
      const record = extractRows(res)?.[0];
      if (!record) return;
      setForm({ ...DEFAULT_FORM, ...normalizeRecord(record), __existing: true });
      setIsEditing(true);
      setSelectedRow(row);
      setIsDupCode(false);
    } catch { Swal.fire("Error", "Could not fetch record", "error"); }
  };

  /* ================= TABLE ================= */

  const tableColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        minWidth: 90,
        render: (row) => (
          <div className="flex items-center justify-center gap-1">

            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
              className="global-ref-td-button-edit-ui"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              className="global-ref-td-button-delete-ui"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>

          </div>
        ),
      },
      {
        key: "billtermCode",
        label: "Bill Term Code",
        sortable: true,
        width: 100, 
        minWidth: 100,
        requiredVisible: true,
      },
      {
        key: "billtermName",
        label: "Bill Term Name",
        sortable: true,
        width: 200, 
        minWidth: 150,
        maxWidth: 200,
        requiredVisible: true,
      },
      {
        key: "daysDue",
        label: "Due Days",
        sortable: true,
        width: 100,
        minWidth: 100,
        className: "text-right",
        render: (row) => <span>{row?.daysDue ?? 0}</span>,
      },
    ],
    [handleEdit, handleDelete]
  );

  const tableData = useMemo(() =>
    billterms.filter(row => {
      const s = search.toLowerCase();
      return String(row?.billtermCode || "").toLowerCase().includes(s) || String(row?.billtermName || "").toLowerCase().includes(s);
    }), [billterms, search]);

  /* ================= STATE & EXPOSURE ================= */

  useEffect(() => {
    if (onStateChange) onStateChange({ isEditing, canSave: isEditing && !isDupCode && !saveMutation.isPending });
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange]);

  useImperativeHandle(ref, () => ({
    add: () => { setIsEditing(true); setSelectedRow(null); setIsDupCode(false); resetForm(DEFAULT_FORM); setTimeout(() => codeInputRef.current?.focus(), 0); },
    save: handleSave,
    reset: () => { resetForm(DEFAULT_FORM); setIsEditing(false); setSelectedRow(null); setIsDupCode(false); },
  }));

  return (
    // Uses a 12-column grid to allow a wider table on the right
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full"> 
      
      {/* LEFT SIDE: FORM (Now taking only 4/12 of the width) */}
      <div className="xl:col-span-4"> 
        <Card>
          <SectionHeader title="Billing Term Information" />
          <div className="space-y-4">
            <FieldRenderer
              label="Billing Term Code"
              required
              value={form.billtermCode}
              inputRef={codeInputRef}
              maxLength={5}
              onChange={(v) => setField("billtermCode", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              onKeyDown={handleCodeValidate}
              disabled={!isEditing || form.__existing}
            />
            <FieldRenderer
              label="Billing Term Name"
              required
              value={form.billtermName}
              maxLength={50}
              onChange={(v) => setField("billtermName", v ?? "")}
              disabled={!isEditing}
            />
            <FieldRenderer
              label="Due Days"
              type="number"
              value={form.daysDue}
              min={0}
              onChange={(v) => {
                const value = v ?? "";
                if (value === "") { setField("daysDue", ""); return; }
                const numValue = Number(value);
                if (numValue < 0) { setField("daysDue", 0); return; }
                setField("daysDue", value);
              }}
              disabled={!isEditing}
            />
            <RegistrationInfo data={form} layout="stacked" />
          </div>
        </Card>
      </div>

      {/* RIGHT SIDE: LIST (Now taking 8/12 of the width - MAXIMUM SIDE-BY-SIDE WIDTH) */}
      <div className="xl:col-span-8 global-tran-table-main-div-ui">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType={docType}
          itemsPerPage={10}
          onRowDoubleClick={handleEdit}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid={true}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["billtermList"] })}
        />
      </div>
    </div>
  );
});

BillTermRef.displayName = "BillTermRef";
export default BillTermRef;