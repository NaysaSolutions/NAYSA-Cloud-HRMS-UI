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

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

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
  roleCode: "",
  roleName: "",
  active: "Y",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const UsersTab = forwardRef(
  ({ roles = [], fetchRoles, user, saving, setSaving }, ref) => {
    const queryClient = useQueryClient();
    const codeInputRef = useRef(null);
    const enterValidatedRef = useRef(false);
    const tableSize = "Half";

    const userCode =
      user?.USER_CODE || user?.USERCODE || user?.userCode || user?.code || "ADMIN";

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

    const isEditingExisting = !!form.__existing;

    useEffect(() => {
      const onKey = (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (!saveMutation.isPending && isEditing) {
            handleSave();
          }
        }
      };

      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [isEditing, form]);

    /* ================= LOAD LIST ================= */

    const roleListQuery = useQuery({
      queryKey: ["accessRightsRoleList"],
      queryFn: async () => {
        if (Array.isArray(roles) && roles.length > 0) {
          return roles;
        }

        if (typeof fetchRoles === "function") {
          const result = await fetchRoles();
          return Array.isArray(result) ? result : [];
        }

        return [];
      },
      initialData: Array.isArray(roles) ? roles : [],
      enabled: !Array.isArray(roles) || roles.length === 0,
    });

    const roleList = useMemo(() => {
      return Array.isArray(roles) && roles.length > 0 ? roles : [];
    }, [roles]);

    /* ================= DUPLICATE CHECK ================= */

    const checkDuplicate = async (roleCode) => {
      const c = String(roleCode || "").trim();
      if (!c) return false;

      const res = await apiClient.get("/checkDuplicateRole", {
        params: { ROLE_CODE: c },
      });

      const raw =
        res?.data?.data?.raw?.[0]?.result ??
        `{"result":"${res?.data?.data?.result ?? "0"}"}`;

      let parsed = { result: "0" };
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        parsed = { result: String(res?.data?.data?.result ?? "0") };
      }

      return String(parsed?.result) === "1";
    };

    const checkInUsed = async (roleCode) => {
      const c = String(roleCode || "").trim();
      if (!c) return false;

      const res = await apiClient.get("/checkInUsedRole", {
        params: { ROLE_CODE: c },
      });

      const raw =
        res?.data?.data?.raw?.[0]?.result ??
        `{"result":"${res?.data?.data?.result ?? "0"}"}`;

      let parsed = { result: "0" };
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        parsed = { result: String(res?.data?.data?.result ?? "0") };
      }

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

      const code = String(form.roleCode || "").trim();
      if (!code || !isEditing || form.__existing) return;

      const dup = await checkDuplicate(code);

      if (dup) {
        setIsDupCode(true);
        await useSwalErrorAlert(
          "Duplicate Entry",
          `Role Code "${code}" already exists.`
        );
        setField("roleCode", "");
        setTimeout(() => codeInputRef.current?.focus?.(), 0);
      } else {
        setIsDupCode(false);
      }
    };

    /* ================= SAVE ================= */

    const saveMutation = useMutation({
      mutationFn: async (payload) => {
        return apiClient.post("/upsertRole", {
          json_data: {
            roleCode: payload.roleCode,
            roleName: payload.roleName,
            active: payload.active,
            userCode: payload.userCode,
          },
        });
      },
      onSuccess: async (response) => {
        const row = response?.data?.data || {};
        const errorcount = Number(row?.errorcount ?? 0);
        const errormsg = String(row?.errormsg ?? "");

        if (errorcount > 0) {
          await useSwalErrorAlert(
            "Validation Error",
            errormsg || "Please fill in the required field(s)."
          );
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["accessRightsRoleList"] });
        if (typeof fetchRoles === "function") {
          await fetchRoles();
        }

        await useSwalSuccessAlert("Success!", "Role saved successfully.");

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
          "Failed to save role.";

        await useSwalErrorAlert("Validation Error", msg);
      },
    });

    const handleSave = useCallback(() => {
      if (!isEditing || saveMutation.isPending || isDupCode) return;

      const payload = {
        roleCode: String(form.roleCode || "").trim().toUpperCase(),
        roleName: String(form.roleName || "").trim(),
        active: form.active === "N" ? "N" : "Y",
        userCode,
      };

      saveMutation.mutate(payload);
    }, [form, isEditing, saveMutation, isDupCode, userCode]);

    /* ================= DELETE ================= */

    const deleteMutation = useMutation({
      mutationFn: async (role) => {
        return apiClient.post("/deleteRole", {
          json_data: {
            roleCode: role.roleCode,
            roleName: role.roleName || "",
            userCode,
          },
        });
      },
      onSuccess: async (response) => {
        const sqlRow = response?.data?.data?.[0] || {};
        const errorcount = Number(sqlRow.errorcount ?? 0);
        const errormsg = String(sqlRow.errormsg ?? "");

        if (errorcount > 0) {
          await useSwalErrorAlert("Error", errormsg);
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["accessRightsRoleList"] });
        if (typeof fetchRoles === "function") {
          await fetchRoles();
        }

        await useSwalDeleteRecord("Deleted");

        resetForm(DEFAULT_FORM);
        setIsEditing(false);
        setSelectedRow(null);
      },
      onError: async (error) => {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.errormsg ||
          error?.message ||
          "Failed to delete role.";

        await useSwalErrorAlert("Error", msg);
      },
    });

    const handleDelete = useCallback(
      async (row) => {
        const code = row?.roleCode;
        if (!code) return;

        const used = await checkInUsed(code);

        if (used) {
          return useSwalErrorAlert(
            "Cannot Delete",
            `Role Code "${code}" is already in use.`
          );
        }

        const confirm = await useSwalDeleteConfirm(
          "Delete Record?",
          `Are you sure you want to delete "${code}"?`
        );

        if (!confirm?.isConfirmed) return;

        deleteMutation.mutate(row);
      },
      [deleteMutation]
    );

    /* ================= EDIT ================= */

    const handleEdit = async (row) => {
      try {
        const res = await apiClient.get("/getRole", {
          params: { ROLE_CODE: row.roleCode },
        });

        const record = extractRows(res)?.[0];
        setForm({ ...DEFAULT_FORM, ...record, __existing: true });
        setIsEditing(true);
        setSelectedRow(row);
      } catch {
        await useSwalErrorAlert("Error", "Could not fetch record.");
      }
    };

    /* ================= TABLE ================= */

    const tableColumns = useMemo(
      () => [
        {
          key: "__actions",
          label: "Actions",
          sortable: false,
          filterable: false,
          width: 100, // Reduced from 160 as the buttons are small
          render: (row) => (
            <div className="flex items-center justify-center gap-2 py-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
                className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
                className="p-1 rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ),
        },
        {
          key: "roleCode",
          label: "Role Code",
          sortable: true,
          width: 150, // Standardized for codes like 'ACCTG', 'ADM'
        },
        {
          key: "roleName",
          label: "Role Name",
          sortable: true,
          width: 350, // Reduced from 620 to prevent pushing other columns out
        },
        {
          key: "active",
          label: "Active?",
          sortable: true,
          width: 120, // Tightened for "Yes/No" values
          render: (row) => (row?.active === "Y" ? "Yes" : "No"),
        },
      ],
      [handleEdit, handleDelete]
    );
    const tableData = useMemo(
      () =>
        (Array.isArray(roleList) ? roleList : [])
          .filter((row) => {
            const s = String(search || "").trim().toLowerCase();
            if (!s) return true;

            return (
              String(row?.roleCode || "").toLowerCase().includes(s) ||
              String(row?.roleName || "").toLowerCase().includes(s) ||
              String(row?.active || "").toLowerCase().includes(s)
            );
          })
          .map((row, index) => ({
            ...row,
            __idx: index,
          })),
      [roleList, search]
    );

    /* ================= EXPOSE TO PARENT ================= */

    useImperativeHandle(ref, () => ({
      add: () => {
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

    return (
      <div className="w-full md: pt-10">
        <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-3">
          {/* FORM COLUMN */}
          <div className="w-full xl:w-[380px] xl:flex-shrink-0">
            <div className="w-full bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
              <div className="space-y-4">

                <FieldRenderer
                  label="Role Code"
                  required
                  type="text"
                  inputRef={codeInputRef}
                  value={form.roleCode}
                  onChange={(v) =>
                    setField("roleCode", String(v ?? "").toUpperCase())
                  }
                  onBlur={handleCodeValidate}
                  onKeyDown={handleCodeValidate}
                  disabled={!isEditing || form.__existing}
                  maxLength={10} // Add this limit based on your DB schema
                />


                <FieldRenderer
                  label="Role Name"
                  required
                  type="text"
                  value={form.roleName}
                  onChange={(v) => setField("roleName", v ?? "")}
                  disabled={!isEditing}
                  maxLength={100} // Add this limit based on your DB schema
                />

                <FieldRenderer
                  label="Active?"
                  type="select"
                  value={form.active}
                  onChange={(v) => setField("active", v ?? "")}
                  disabled={!isEditing}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                />

              </div>
            </div>
          </div>

          {/* TABLE COLUMN */}
          <div className="w-full xl:flex-1 min-w-0 flex xl:justify-center">
            <div className="w-full xl:w-[900px]">
              <SearchGlobalReferenceTable
                docType="UserAccRight"
                columns={tableColumns}
                data={tableData}
                itemsPerPage={50}
                showFilters={true}
                isLoading={roleListQuery.isLoading}
                onRowDoubleClick={handleEdit}
                onRowClick={(row) => setSelectedRow(row)}
                className="h-full"
                tablesize={tableSize}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default UsersTab;