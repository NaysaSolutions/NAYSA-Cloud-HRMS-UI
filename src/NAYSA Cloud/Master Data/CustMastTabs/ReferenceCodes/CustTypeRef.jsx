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

/* ================= HELPERS ================= */

const Card = ({ children }) => (
  <div className="global-tran-textbox-group-div-ui self-start !h-fit">
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
  custTypeCode: "",
  custTypeName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const normalizeRecord = (record) => ({
  custTypeCode: record?.custTypeCode ?? record?.cust_type_code ?? record?.code ?? "",
  custTypeName: record?.custTypeName ?? record?.cust_type_name ?? record?.name ?? "",
  registeredBy: record?.registeredBy ?? "",
  registeredDate: record?.registeredDate ?? "",
  lastUpdatedBy: record?.lastUpdatedBy ?? "",
  lastUpdatedDate: record?.lastUpdatedDate ?? "",
  __existing: false,
});

/* ================= COMPONENT ================= */

const CustTypeRef = forwardRef(({ onStateChange }, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tableSize = "Half";

  const userCode =
    user?.userCode ||
    user?.USER_CODE ||
    user?.user_code ||
    user?.code ||
    "ADMIN";

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

  const listQuery = useQuery({
    queryKey: ["custTypeList"],
    queryFn: async () => {
      const res = await apiClient.get("/custType");
      const rows = extractRows(res);
      return Array.isArray(rows) ? rows.map(normalizeRecord) : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const types = useMemo(() => listQuery.data || [], [listQuery.data]);
  const isInitialLoading = listQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkDuplicateCustType", {
      json_data: { custTypeCode: c },
    });

    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
    const parsed = JSON.parse(raw);

    return String(parsed?.result) === "1";
  };

  const checkInUsed = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    try {
      const res = await apiClient.post("/checkInUsedCustType", {
        json_data: { custTypeCode: c },
      });

      const row0 = res?.data?.data?.[0] || {};
      const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
      const parsed = JSON.parse(raw);

      return String(parsed?.result) === "1";
    } catch {
      return false;
    }
  };

  const handleEdit = useCallback(
    async (row) => {
      const targetRow = row?.custTypeCode ? row : selectedRow;

      if (!targetRow?.custTypeCode) {
        await useSwalErrorAlert(
          "Selection Required",
          "Please select a Customer Type record first."
        );
        return;
      }

      setForm({
        ...normalizeRecord(targetRow),
        __existing: true,
      });

      setSelectedRow(targetRow);
      setIsEditing(true);
      setIsDupCode(false);
    },
    [selectedRow]
  );
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

    const code = String(form.custTypeCode || "").trim();
    if (!code || !isEditing || form.__existing) return;

    const dup = await checkDuplicate(code);

    if (dup) {
      setIsDupCode(true);
      await useSwalErrorAlert(
        "Duplicate Entry",
        `Customer Type Code "${code}" already exists.`
      );
      setField("custTypeCode", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertCustType", {
        json_data: JSON.stringify({
          json_data: {
            custTypeCode: payload.custTypeCode,
            custTypeName: payload.custTypeName,
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

      queryClient.invalidateQueries({ queryKey: ["custTypeList"] });
      await useSwalSuccessAlert("Success!", "Customer Type saved successfully.");
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
    },
  });

  const handleSave = useCallback(() => {
    if (!isEditing || saveMutation.isPending) return;

    const payload = {
      custTypeCode: String(form.custTypeCode || "").trim().toUpperCase(),
      custTypeName: String(form.custTypeName || "").trim(),
      userCode,
    };

    saveMutation.mutate(payload);
  }, [form, isEditing, saveMutation, userCode]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deleteCustType", {
        json_data: { custTypeCode: code, userCode },
      });
    },
    onSuccess: async (response, code) => {
      const sqlRow = response?.data?.data?.[0] || response?.data || {};
      if (Number(sqlRow?.errorcount ?? 0) > 0) {
        await useSwalErrorAlert("Error", sqlRow?.errormsg || "Delete failed.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["custTypeList"] });
      await useSwalDeleteRecord("Deleted", `Customer Type ${code} removed.`);
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      const code = row?.custTypeCode;
      if (!code) return;

      if (await checkInUsed(code)) {
        return useSwalErrorAlert("Cannot Delete", "This Customer Type is currently assigned to records.");
      }

      const confirm = await useSwalDeleteConfirm("Delete?", `Remove "${code}"?`);
      if (confirm?.isConfirmed) deleteMutation.mutate(code);
    },
    [deleteMutation]
  );

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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "custTypeCode", label: "Code", sortable: true, width: 80 },
      { key: "custTypeName", label: "Description", sortable: true, width: 150 },
    ],
    [handleEdit, handleDelete]
  );

  const tableData = useMemo(
    () =>
      types.filter((row) => {
        const s = search.toLowerCase();
        return (
          row.custTypeCode.toLowerCase().includes(s) ||
          row.custTypeName.toLowerCase().includes(s)
        );
      }),
    [types, search]
  );

  /* ================= STATE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: isEditing && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange]);

  /* ================= EXPOSE TO PARENT ================= */

  useImperativeHandle(ref, () => ({
    add: () => {
      setIsEditing(true);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    },
    edit: handleEdit,
    save: handleSave,
    reset: () => {
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
    },
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 w-full">
      <Card>
        <SectionHeader title="Customer Type Information" />
        <FieldRenderer
          label="Customer Type Code"
          required
          value={form.custTypeCode}
          inputRef={codeInputRef}
          maxLength={10}
          onChange={(v) => setField("custTypeCode", String(v ?? "").toUpperCase())}
          onBlur={handleCodeValidate}
          onKeyDown={handleCodeValidate}
          disabled={!isEditing || form.__existing}
        />
        <FieldRenderer
          label="Customer Type Description"
          required
          value={form.custTypeName}
          maxLength={50}
          onChange={(v) => setField("custTypeName", v ?? "")}
          disabled={!isEditing}
        />
        <RegistrationInfo data={form} layout="stacked" />
      </Card>


      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        isLoading={isInitialLoading}
        docType="Customer Types"
        itemsPerPage={10}
        onRowDoubleClick={handleEdit}
        onRowClick={(row) => setSelectedRow(row)}
        showFilters
        tableSize={tableSize}
        autoFillGrid={true}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["custTypeList"] })}
      />

    </div>
  );
});

CustTypeRef.displayName = "CustTypeRef";
export default CustTypeRef;