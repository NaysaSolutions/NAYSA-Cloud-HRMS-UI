// import React, {
//   forwardRef,
//   useEffect,
//   useImperativeHandle,
//   useMemo,
//   useRef,
//   useState,
//   useCallback,
// } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

// import Swal from "sweetalert2";

// import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import {
//   useSwalErrorAlert,
//   useSwalSuccessAlert,
//   useSwalDeleteConfirm,
//   useSwalDeleteRecord,
// } from "@/NAYSA Cloud/Global/behavior.jsx";

// import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
// import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
// import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
// import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";

// /* ================= HELPERS ================= */

// const Card = ({ children }) => (
//   <div className="global-tran-textbox-group-div-ui self-start !h-fit">
//     {children}
//   </div>
// );

// const SectionHeader = ({ title }) => (
//   <div className="mb-3">
//     <div className="text-[10px] font-bold text-slate-500 tracking-widest border-b pb-2 uppercase">
//       {title}
//     </div>
//   </div>
// );

// const extractRows = (payload) => {
//   const res =
//     payload?.data?.data?.[0]?.result ??
//     payload?.data?.result ??
//     payload?.data?.data;

//   if (!res) return [];
//   if (Array.isArray(res)) return res;

//   if (typeof res === "string") {
//     try {
//       return JSON.parse(res) || [];
//     } catch {
//       return [];
//     }
//   }

//   return [];
// };

// const DEFAULT_FORM = {
//   salesRepCode: "",
//   salesRepName: "",
//   salesRepType: "SR",
//   salesRepBranch: "HO",
//   registeredBy: "",
//   registeredDate: "",
//   lastUpdatedBy: "",
//   lastUpdatedDate: "",
//   __existing: false,
// };

// const normalizeRecord = (record) => ({
//   salesRepCode: record?.salesRepCode ?? record?.sales_rep_code ?? record?.code ?? "",
//   salesRepName: record?.salesRepName ?? record?.sales_rep_name ?? record?.name ?? "",
//   salesRepType: record?.salesRepType ?? "SR",
//   salesRepBranch: record?.salesRepBranch ?? "HO",
//   registeredBy: record?.registeredBy ?? "",
//   registeredDate: record?.registeredDate ?? "",
//   lastUpdatedBy: record?.lastUpdatedBy ?? "",
//   lastUpdatedDate: record?.lastUpdatedDate ?? "",
//   __existing: false,
// });

// /* ================= COMPONENT ================= */

// const SalesRep = forwardRef(({ onStateChange }, ref) => {
//   const { user } = useAuth();
//   const queryClient = useQueryClient();
//   const tableSize = "Full";

//   const userCode = 
//     user?.userCode || 
//     user?.USER_CODE || 
//     user?.user_code || 
//     user?.code || 
//     "ADMIN";

//   const docType = "AgentRef";
//   const guideRef = useRef(null);
//   const pdfLink = reftablesPDFGuide[docType];
//   const videoLink = reftablesVideoGuide[docType];

//   const codeInputRef = useRef(null);
//   const enterValidatedRef = useRef(false);

//   const [form, setForm] = useState(DEFAULT_FORM);
//   const [selectedRow, setSelectedRow] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);
//   const [isDupCode, setIsDupCode] = useState(false);
//   const [search, setSearch] = useState("");

//   const setField = (key, value) =>
//     setForm((prev) => ({ ...prev, [key]: value }));

//   const resetForm = useCallback((next = DEFAULT_FORM) => {
//     setForm(next);
//   }, []);

//   /* ================= LOAD LIST ================= */

//   const listQuery = useQuery({
//     queryKey: ["salesRepList"],
//     queryFn: async () => {
//       const res = await apiClient.get("/salesRep");
//       const rows = extractRows(res);
//       return Array.isArray(rows) ? rows.map(normalizeRecord) : [];
//     },
//   });

//   const representatives = useMemo(() => listQuery.data || [], [listQuery.data]);
//   const isInitialLoading = listQuery.isLoading;

//   /* ================= DUPLICATE CHECK ================= */

//   const checkDuplicate = async (code) => {
//     const c = String(code || "").trim();
//     if (!c) return false;

//     const res = await apiClient.post("/checkDuplicatesalesRep", {
//       json_data: { salesRepCode: c },
//     });

//     const row0 = res?.data?.data?.[0] || {};
//     const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
//     const parsed = JSON.parse(raw);

//     return String(parsed?.result) === "1";
//   };

//   /* ================= EDIT (Stabilized) ================= */

//   const handleEdit = useCallback(async (row) => {
//     const targetRow = row?.salesRepCode ? row : selectedRow;

//     if (!targetRow || !targetRow.salesRepCode) {
//       await useSwalErrorAlert("Selection Required", "Please select an Agent from the list first.");
//       return;
//     }

//     try {
//       const res = await apiClient.get("/getsalesRep", {
//         params: { salesRepCode: targetRow.salesRepCode },
//       });

//       const record = extractRows(res)?.[0];
//       if (!record) {
//         await useSwalErrorAlert("Error", "Record details could not be found.");
//         return;
//       }

//       setForm({ ...normalizeRecord(record), __existing: true });
//       setIsEditing(true);
//       setSelectedRow(targetRow);
//       setIsDupCode(false);
//     } catch (error) {
//       await useSwalErrorAlert("Fetch Failed", "Could not retrieve record data.");
//     }
//   }, [selectedRow]);

//   /* ================= VALIDATE CODE ================= */

//   const handleCodeValidate = async (arg) => {
//     const isEvent = arg && typeof arg === "object" && "type" in arg;

//     if (isEvent && arg.key === "Enter") enterValidatedRef.current = true;

//     if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
//       enterValidatedRef.current = false;
//       return;
//     }

//     const code = String(form.salesRepCode || "").trim();
//     if (!code || !isEditing || form.__existing) return;

//     if (await checkDuplicate(code)) {
//       setIsDupCode(true);
//       await useSwalErrorAlert("Duplicate Entry", `Agent Code "${code}" already exists.`);
//       setField("salesRepCode", "");
//       setTimeout(() => codeInputRef.current?.focus?.(), 0);
//     } else {
//       setIsDupCode(false);
//     }
//   };

//   /* ================= SAVE ================= */

//   const saveMutation = useMutation({
//     mutationFn: async (payload) => {
//       return apiClient.post("/upsertsalesRep", {
//         json_data: JSON.stringify({
//           json_data: {
//             salesRepCode: payload.salesRepCode,
//             salesRepName: payload.salesRepName,
//             salesRepType: payload.salesRepType,
//             salesRepBranch: payload.salesRepBranch,
//             userCode: payload.userCode,
//           },
//         }),
//       });
//     },
//     onSuccess: async (response) => {
//       const row = response?.data || {};
//       if (Number(row?.errorcount ?? 0) > 0) {
//         await useSwalErrorAlert("Validation Error", row?.errormsg || "Save failed.");
//         return;
//       }

//       queryClient.invalidateQueries({ queryKey: ["salesRepList"] });
//       await useSwalSuccessAlert("Success!", "Agent Code saved successfully.");
//       setIsEditing(false);
//       setSelectedRow(null);
//       setIsDupCode(false);
//       resetForm(DEFAULT_FORM);
//     },
//   });

//   const handleSave = useCallback(() => {
//     if (!isEditing || saveMutation.isPending) return;

//     saveMutation.mutate({
//       salesRepCode: String(form.salesRepCode || "").trim().toUpperCase(),
//       salesRepName: String(form.salesRepName || "").trim(),
//       salesRepType: form.salesRepType,
//       salesRepBranch: form.salesRepBranch,
//       userCode,
//     });
//   }, [form, isEditing, saveMutation, userCode]);

//   /* ================= DELETE ================= */

//   const deleteMutation = useMutation({
//     mutationFn: async (code) => {
//       return apiClient.post("/deletesalesRep", {
//         json_data: { salesRepCode: code, userCode },
//       });
//     },
//     onSuccess: async (response, code) => {
//       queryClient.invalidateQueries({ queryKey: ["salesRepList"] });
//       await useSwalDeleteRecord("Deleted", `Agent ${code} has been removed.`);
//       resetForm(DEFAULT_FORM);
//       setIsEditing(false);
//       setSelectedRow(null);
//     },
//   });

//   const handleDelete = useCallback(
//     async (row) => {
//       const code = row?.salesRepCode;
//       if (!code) return;

//       const confirm = await useSwalDeleteConfirm("Delete?", `Remove Agent "${code}"?`);
//       if (confirm?.isConfirmed) deleteMutation.mutate(code);
//     },
//     [deleteMutation]
//   );

//   /* ================= TABLE ================= */

//   const tableColumns = useMemo(
//     () => [
//       {
//         key: "__actions",
//         label: "Actions",
//         width: 90,
//         minWidth: 90,
//         render: (row) => (
//           <div className="flex gap-2 justify-center w-full">

//             <button
//               onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
//               className="global-ref-td-button-edit-ui"
//               title="Edit"
//             >
//               <FontAwesomeIcon icon={faEdit} />
//               <span className="md:hidden">Edit</span>
//             </button>

//             <button
//               onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
//               className="global-ref-td-button-delete-ui"
//               title="Delete"
//             >
//               <FontAwesomeIcon icon={faTrashAlt} />
//               <span className="md:hidden">Delete</span>
//             </button>

//           </div>
//         ),
//       },
//       { key: "salesRepCode", label: "Agent Code", sortable: true, width: 100, minWidth: 100, requiredVisible: true },
//       { key: "salesRepName", label: "Agent Name", sortable: true, width: 250, minWidth: 150, maxWidth: 250, requiredVisible: true },
//       { key: "salesRepType", label: "Agent Type", sortable: true, width: 100, minWidth: 120},
//       { key: "salesRepBranch", label: "Branch", sortable: true, width: 120, minWidth: 120 },
//     ],
//     [handleEdit, handleDelete]
//   );

//   const tableData = useMemo(
//     () =>
//       representatives.filter((row) => {
//         const s = search.toLowerCase();
//         return (
//           row.salesRepCode.toLowerCase().includes(s) ||
//           row.salesRepName.toLowerCase().includes(s)
//         );
//       }),
//     [representatives, search]
//   );

//   /* ================= STATE TO PARENT ================= */

//   useEffect(() => {
//     if (onStateChange) {
//       onStateChange({
//         isEditing,
//         canSave: isEditing && !isDupCode && !saveMutation.isPending,
//       });
//     }
//   }, [isEditing, isDupCode, saveMutation.isPending, onStateChange]);

//   /* ================= EXPOSE TO PARENT ================= */

//   useImperativeHandle(ref, () => ({
//     add: () => {
//       setIsEditing(true);
//       setSelectedRow(null);
//       setIsDupCode(false);
//       resetForm(DEFAULT_FORM);
//       setTimeout(() => codeInputRef.current?.focus?.(), 0);
//     },
//     edit: handleEdit,
//     save: handleSave,
//     reset: () => {
//       resetForm(DEFAULT_FORM);
//       setIsEditing(false);
//       setSelectedRow(null);
//       setIsDupCode(false);
//     },
//   }));

//   return (
//     <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
//       <div className="xl:col-span-4">
//         <Card>
//           <SectionHeader title="Agent Information" />
//           <div className="space-y-4">
//             <FieldRenderer
//               label="Agent Code"
//               required
//               value={form.salesRepCode}
//               inputRef={codeInputRef}
//               maxLength={10}
//               onChange={(v) => setField("salesRepCode", String(v ?? "").toUpperCase())}
//               onBlur={handleCodeValidate}
//               disabled={!isEditing || form.__existing}
//             />
//             <FieldRenderer
//               label="Agent Name"
//               required
//               value={form.salesRepName}
//               maxLength={100}
//               onChange={(v) => setField("salesRepName", v ?? "")}
//               disabled={!isEditing}
//             />
//             <FieldRenderer
//               label="Agent Type"
//               type="select"
//               options={[{ value: "SR", label: "Sales Representative" }]}
//               value={form.salesRepType}
//               onChange={(v) => setField("salesRepType", v)}
//               disabled={!isEditing}
//             />
//             <FieldRenderer
//               label="Branch"
//               type="select"
//               options={[{ value: "HO", label: "Head Office" }]}
//               value={form.salesRepBranch}
//               onChange={(v) => setField("salesRepBranch", v)}
//               disabled={!isEditing}
//             />
//             <RegistrationInfo data={form} layout="stacked" />
//           </div>
//         </Card>
//       </div>

//       <div className="xl:col-span-8 global-tran-table-main-div-ui">
//         <SearchGlobalReferenceTable
//           columns={tableColumns}
//           data={tableData}
//           isLoading={isInitialLoading}
//           docType={docType}
//           itemsPerPage={10}
//           onRowDoubleClick={handleEdit}
//           onRowClick={(row) => setSelectedRow(row)}
//           showFilters
//           autoFillGrid={true}
//         />
//       </div>
//     </div>
//   );
// });

// SalesRep.displayName = "SalesRep";
// export default SalesRep;
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
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";

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
  salesRepCode: "",
  salesRepName: "",
  salesRepType: "SR",
  salesRepBranch: "HO",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

const normalizeRecord = (record) => ({
  salesRepCode: record?.salesRepCode ?? record?.sales_rep_code ?? record?.code ?? "",
  salesRepName: record?.salesRepName ?? record?.sales_rep_name ?? record?.name ?? "",
  salesRepType: record?.salesRepType ?? "SR",
  salesRepBranch: record?.salesRepBranch ?? "HO",
  registeredBy: record?.registeredBy ?? "",
  registeredDate: record?.registeredDate ?? "",
  lastUpdatedBy: record?.lastUpdatedBy ?? "",
  lastUpdatedDate: record?.lastUpdatedDate ?? "",
  __existing: false,
});

/* ================= COMPONENT ================= */

const SalesRep = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
}, ref) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tableSize = "Full";

  const userCode = 
    user?.userCode || 
    user?.USER_CODE || 
    user?.user_code || 
    user?.code || 
    "ADMIN";

  const docType = "AgentRef";
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

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  /* ================= LOAD LIST ================= */

  const listQuery = useQuery({
    queryKey: ["salesRepList"],
    queryFn: async () => {
      const res = await apiClient.get("/salesRep");
      const rows = extractRows(res);
      return Array.isArray(rows) ? rows.map(normalizeRecord) : [];
    },
  });

  const representatives = useMemo(() => listQuery.data || [], [listQuery.data]);
  const isInitialLoading = listQuery.isLoading;

  /* ================= DUPLICATE CHECK ================= */

  const checkDuplicate = async (code) => {
    const c = String(code || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkDuplicatesalesRep", {
      json_data: { salesRepCode: c },
    });

    const row0 = res?.data?.data?.[0] || {};
    const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';
    const parsed = JSON.parse(raw);

    return String(parsed?.result) === "1";
  };

  /* ================= RETRIEVE / VIEW ================= */

  const handleRetrieve = useCallback(async (row) => {
    const targetRow = row?.salesRepCode ? row : selectedRow;

    if (!targetRow || !targetRow.salesRepCode) {
      await useSwalErrorAlert("Selection Required", "Please select an Agent from the list first.");
      return;
    }

    try {
      const res = await apiClient.get("/getsalesRep", {
        params: { salesRepCode: targetRow.salesRepCode },
      });

      const record = extractRows(res)?.[0];
      if (!record) {
        await useSwalErrorAlert("Error", "Record details could not be found.");
        return;
      }

      setForm({ ...normalizeRecord(record), __existing: true });
      setIsEditing(false);
      setSelectedRow(targetRow);
      setIsDupCode(false);
    } catch (error) {
      await useSwalErrorAlert("Fetch Failed", "Could not retrieve record data.");
    }
  }, [selectedRow]);

  /* ================= EDIT (Stabilized) ================= */

  const handleEdit = useCallback(async (row) => {
    if (isReadOnly || !canEdit) {
      await useSwalErrorAlert("Read Only", "You are not allowed to edit reference codes.");
      return;
    }

    const targetRow = row?.salesRepCode ? row : selectedRow;

    if (!targetRow || !targetRow.salesRepCode) {
      await useSwalErrorAlert("Selection Required", "Please select an Agent from the list first.");
      return;
    }

    try {
      const res = await apiClient.get("/getsalesRep", {
        params: { salesRepCode: targetRow.salesRepCode },
      });

      const record = extractRows(res)?.[0];
      if (!record) {
        await useSwalErrorAlert("Error", "Record details could not be found.");
        return;
      }

      setForm({ ...normalizeRecord(record), __existing: true });
      setIsEditing(true);
      setSelectedRow(targetRow);
      setIsDupCode(false);
    } catch (error) {
      await useSwalErrorAlert("Fetch Failed", "Could not retrieve record data.");
    }
  }, [selectedRow, isReadOnly, canEdit]);

  const handleRowDoubleClick = useCallback(async (row) => {
    if (canEdit && !isReadOnly) {
      await handleEdit(row);
      return;
    }

    await handleRetrieve(row);
  }, [canEdit, isReadOnly, handleEdit, handleRetrieve]);

  /* ================= VALIDATE CODE ================= */

  const handleCodeValidate = async (arg) => {
    const isEvent = arg && typeof arg === "object" && "type" in arg;

    if (isEvent && arg.key === "Enter") enterValidatedRef.current = true;

    if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
      enterValidatedRef.current = false;
      return;
    }

    const code = String(form.salesRepCode || "").trim();
    if (!code || !isEditing || form.__existing) return;

    if (await checkDuplicate(code)) {
      setIsDupCode(true);
      await useSwalErrorAlert("Duplicate Entry", `Agent Code "${code}" already exists.`);
      setField("salesRepCode", "");
      setTimeout(() => codeInputRef.current?.focus?.(), 0);
    } else {
      setIsDupCode(false);
    }
  };

  /* ================= SAVE ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertsalesRep", {
        json_data: JSON.stringify({
          json_data: {
            salesRepCode: payload.salesRepCode,
            salesRepName: payload.salesRepName,
            salesRepType: payload.salesRepType,
            salesRepBranch: payload.salesRepBranch,
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

      queryClient.invalidateQueries({ queryKey: ["salesRepList"] });
      await useSwalSuccessAlert("Success!", "Agent Code saved successfully.");
      setIsEditing(false);
      setSelectedRow(null);
      setIsDupCode(false);
      resetForm(DEFAULT_FORM);
    },
  });

  const handleSave = useCallback(async () => {
    if (isReadOnly || !canSave) {
      await useSwalErrorAlert("Read Only", "You are not allowed to save reference codes.");
      return;
    }

    if (!isEditing || saveMutation.isPending) return;

    saveMutation.mutate({
      salesRepCode: String(form.salesRepCode || "").trim().toUpperCase(),
      salesRepName: String(form.salesRepName || "").trim(),
      salesRepType: form.salesRepType,
      salesRepBranch: form.salesRepBranch,
      userCode,
    });
  }, [form, isEditing, saveMutation, userCode, isReadOnly, canSave]);

  /* ================= DELETE ================= */

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      return apiClient.post("/deletesalesRep", {
        json_data: { salesRepCode: code, userCode },
      });
    },
    onSuccess: async (response, code) => {
      queryClient.invalidateQueries({ queryKey: ["salesRepList"] });
      await useSwalDeleteRecord("Deleted", `Agent ${code} has been removed.`);
      resetForm(DEFAULT_FORM);
      setIsEditing(false);
      setSelectedRow(null);
    },
  });

  const handleDelete = useCallback(
    async (row) => {
      if (isReadOnly || !canDelete) {
        await useSwalErrorAlert("Read Only", "You are not allowed to delete reference codes.");
        return;
      }

      const code = row?.salesRepCode;
      if (!code) return;

      const confirm = await useSwalDeleteConfirm("Delete?", `Remove Agent "${code}"?`);
      if (confirm?.isConfirmed) deleteMutation.mutate(code);
    },
    [deleteMutation, isReadOnly, canDelete]
  );

  /* ================= TABLE ================= */

  const tableColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 90,
        minWidth: 90,
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
              title={isReadOnly || !canEdit ? "Read Only" : "Edit"}
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
              title={isReadOnly || !canDelete ? "Read Only" : "Delete"}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "salesRepCode", label: "Agent Code", sortable: true, width: 100, minWidth: 100, requiredVisible: true },
      { key: "salesRepName", label: "Agent Name", sortable: true, width: 250, minWidth: 150, maxWidth: 250, requiredVisible: true },
      { key: "salesRepType", label: "Agent Type", sortable: true, width: 100, minWidth: 120},
      { key: "salesRepBranch", label: "Branch", sortable: true, width: 120, minWidth: 120 },
    ],
    [handleEdit, handleDelete, isReadOnly, canEdit, canDelete]
  );

  const tableData = useMemo(
    () =>
      representatives.filter((row) => {
        const s = search.toLowerCase();
        return (
          row.salesRepCode.toLowerCase().includes(s) ||
          row.salesRepName.toLowerCase().includes(s)
        );
      }),
    [representatives, search]
  );

  /* ================= STATE TO PARENT ================= */

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEditing,
        canSave: canSave && isEditing && !isDupCode && !saveMutation.isPending,
      });
    }
  }, [isEditing, isDupCode, saveMutation.isPending, onStateChange, canSave]);

  /* ================= EXPOSE TO PARENT ================= */

  useImperativeHandle(ref, () => ({
    add: async () => {
      if (isReadOnly || !canAdd) {
        await useSwalErrorAlert("Read Only", "You are not allowed to add reference codes.");
        return;
      }

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
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
      <div className="xl:col-span-4">
        <Card>
          <SectionHeader title="Agent Information" />
          <div className="space-y-4">
            <FieldRenderer
              label="Agent Code"
              required
              value={form.salesRepCode}
              inputRef={codeInputRef}
              maxLength={10}
              onChange={(v) => setField("salesRepCode", String(v ?? "").toUpperCase())}
              onBlur={handleCodeValidate}
              disabled={isReadOnly || !isEditing || form.__existing}
            />
            <FieldRenderer
              label="Agent Name"
              required
              value={form.salesRepName}
              maxLength={100}
              onChange={(v) => setField("salesRepName", v ?? "")}
              disabled={isReadOnly || !isEditing}
            />
            <FieldRenderer
              label="Agent Type"
              type="select"
              options={[{ value: "SR", label: "Sales Representative" }]}
              value={form.salesRepType}
              onChange={(v) => setField("salesRepType", v)}
              disabled={isReadOnly || !isEditing}
            />
            <FieldRenderer
              label="Branch"
              type="select"
              options={[{ value: "HO", label: "Head Office" }]}
              value={form.salesRepBranch}
              onChange={(v) => setField("salesRepBranch", v)}
              disabled={isReadOnly || !isEditing}
            />
            <RegistrationInfo data={form} layout="stacked" />
          </div>
        </Card>
      </div>

      <div className="xl:col-span-8 global-tran-table-main-div-ui">
        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={tableData}
          isLoading={isInitialLoading}
          docType={docType}
          itemsPerPage={10}
          onRowDoubleClick={handleRowDoubleClick}
          onRowClick={(row) => setSelectedRow(row)}
          showFilters
          autoFillGrid={true}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["salesRepList"] })}
        />
      </div>
    </div>
  );
});

SalesRep.displayName = "SalesRep";
export default SalesRep;