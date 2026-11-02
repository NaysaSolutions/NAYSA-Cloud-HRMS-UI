import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUndo, faEdit, faTrashAlt, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert as showError,
  useSwalErrorAlertAPI as showAPIError,
  useSwalSuccessAlert as showSuccess,
  useSwalDeleteConfirm as confirmDelete,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  ED_FIELDS, ED_INITIAL_FORM, normalizeEDForm, parseEDResult, parseEDFlag, validateEDForm, buildEDPayload,
} from "@/NAYSA Cloud/Global/refEDCodes.js";

const API = {
  list: "/refED", upsert: "/upsertRefED", delete: "/deleteRefED",
  checkDuplicate: "/checkDuplicateRefED", checkInUsed: "/checkInUsedRefED",
};
const FLAGS = [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }];
const CATEGORIES = [{ value: "EARN", label: "Earnings" }, { value: "DED", label: "Deductions" }];
const LIST_KEY = ["refEDCodesList"];
const FORM_COLUMNS = [
  ["edCode", "edName", "ctrp", "edType", "code"],
  ["reportField", "reportHdr", "taxable", "taxablePercent", "taxableAmount"],
  ["order", "tax2316", "ntax2316", "compSss", "compPh"],
  ["compHdmf", "includeMp13", "includeBonexamt", "deminimis", "active"],
];
const FORM_FIELDS = {
  ...Object.fromEntries(ED_FIELDS.map((field) => [field.key, field])),
  taxablePercent: { key: "taxablePercent", label: "Taxable %", type: "amount", pendingMapping: true },
  taxableAmount: { key: "taxableAmount", label: "Taxable Amount", type: "amount", pendingMapping: true },
};

const RefEDCodes = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const permissions = usePagePermission({ componentKey: "RefEDCode", menuName: "Earning & Deduction Codes" });
  const { pagePermission, isReadOnly, isFullAccess, canAdd, canEdit, canSave, canDelete } = permissions;
  const [form, setForm] = useState(ED_INITIAL_FORM);
  const [registration, setRegistration] = useState({});
  const [selectedCode, setSelectedCode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  const currentUserCode = user?.USER_CODE || user?.userCode || user?.code || "ADMIN";
  const writable = isEditing && !isReadOnly && (selectedCode ? canEdit : canAdd);

  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const result = parseEDResult(await apiClient.get(API.list));
      if (!Array.isArray(result)) throw new Error("The E/D code service returned an invalid list.");
      return result;
    },
  });

  const reset = useCallback(() => {
    setForm(ED_INITIAL_FORM);
    setRegistration({});
    setSelectedCode(null);
    setIsEditing(false);
    setExpanded(false);
  }, []);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    // Existing overtime/loan lookups and SG selections also use REF_ED.
    queryClient.invalidateQueries({ queryKey: ["lookupRefED"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(API.upsert, payload);
      parseEDResult(response);
      return response;
    },
    onSuccess: () => { refresh(); reset(); showSuccess("Saved", "E/D Code saved successfully."); },
    onError: (saveError) => showAPIError("Save Error", saveError),
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(API.delete, payload);
      parseEDResult(response);
      return response;
    },
    onSuccess: () => { refresh(); reset(); showSuccess("Deleted", "E/D Code deleted successfully."); },
    onError: (deleteError) => showAPIError("Delete Error", deleteError),
  });

  const busy = checking || saveMutation.isPending || deleteMutation.isPending;

  const openRecord = useCallback((row, edit = canEdit) => {
    if (busy) return;
    setSelectedCode(row.edCode);
    setForm(normalizeEDForm(row));
    setRegistration({
      registeredBy: row.registeredBy, registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy ?? row.updatedBy,
      lastUpdatedDate: row.lastUpdatedDate ?? row.updatedDate,
    });
    setIsEditing(Boolean(edit && canEdit));
    setExpanded(true);
  }, [busy, canEdit]);

  const handleSave = useCallback(async () => {
    if (!writable || !canSave || busy) return;
    const validation = validateEDForm(form);
    if (validation) return showError("Validation Error", validation);
    const payload = buildEDPayload(form, currentUserCode, selectedCode ? "EDIT" : "ADD");
    setChecking(true);
    try {
      if (!selectedCode && parseEDFlag(await apiClient.post(API.checkDuplicate, { json_data: { edCode: payload.json_data.edCode } }))) {
        return showError("Duplicate Code", "This E/D Code already exists.");
      }
      saveMutation.mutate(payload);
    } catch (saveError) {
      showAPIError("Save Error", saveError);
    } finally {
      setChecking(false);
    }
  }, [writable, canSave, busy, form, currentUserCode, selectedCode, saveMutation]);

  const handleDelete = useCallback(async (row) => {
    if (!canDelete || busy) return;
    const payload = { json_data: { edCode: row.edCode, userCode: currentUserCode } };
    setChecking(true);
    try {
      if (parseEDFlag(await apiClient.post(API.checkInUsed, payload))) {
        return showError("Cannot Delete", "This E/D Code is already used by another record.");
      }
      const confirmation = await confirmDelete("Confirm Delete", `Delete E/D Code ${row.edCode} (${row.edName})?`);
      if (confirmation?.isConfirmed) deleteMutation.mutate(payload);
    } catch (deleteError) {
      showAPIError("Delete Error", deleteError);
    } finally {
      setChecking(false);
    }
  }, [canDelete, busy, currentUserCode, deleteMutation]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave]);

  const columns = useMemo(() => [
    {
      key: "__actions", label: "Actions", width: 100, minWidth: 100,
      render: (row) => <div className="flex justify-center gap-2">
        <button type="button" title="Edit" disabled={!canEdit || busy}
          onClick={(event) => { event.stopPropagation(); openRecord(row, true); }}
          className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-blue-600 disabled:opacity-40">
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button type="button" title="Delete" disabled={!canDelete || busy}
          onClick={(event) => { event.stopPropagation(); handleDelete(row); }}
          className="rounded border border-red-100 bg-red-50 px-2 py-1 text-red-600 disabled:opacity-40">
          <FontAwesomeIcon icon={faTrashAlt} />
        </button>
      </div>,
    },
    ...ED_FIELDS.map((field) => ({
      key: field.key, label: field.label, sortable: true,
      width: field.max >= 200 ? 240 : 140, minWidth: field.max >= 200 ? 200 : 110,
      requiredVisible: ["edCode", "edName", "edType"].includes(field.key),
      ...(field.type === "flag" ? { render: (row) => row[field.key] === "Y" ? "Yes" : row[field.key] === "N" ? "No" : "" } : {}),
      ...(field.type === "category" ? { render: (row) => CATEGORIES.find((item) => item.value === row.edType)?.label || row.edType } : {}),
    })),
  ], [canEdit, canDelete, busy, openRecord, handleDelete]);

  return <div className="global-ref-main-div-ui">
    {(isLoading || busy) && <LoadingSpinner />}
    <div className="global-ref-header-ui mb-2">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <h1 className="global-ref-headertext-ui">Earnings / Deduction Codes</h1>
        <div className="flex items-center gap-2">
          <PermissionBadge variant="reference" permission={pagePermission} isReadOnly={isReadOnly} isFullAccess={isFullAccess} />
          <ButtonBar buttons={[
            { key: "add", label: "Add", icon: faPlus, disabled: !canAdd || busy,
              onClick: () => { if (canAdd && !busy) { reset(); setIsEditing(true); setExpanded(true); } } },
            { key: "save", label: "Save", icon: faSave, disabled: !writable || !canSave || busy, onClick: handleSave },
            { key: "reset", label: "Reset", icon: faUndo, disabled: busy, onClick: reset },
          ].map((button) => ({ ...button, className: "flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-40" }))} />
        </div>
      </div>
    </div>
    <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <p className="text-sm font-semibold text-blue-600">
          {isEditing ? selectedCode ? `Updating Record - ${selectedCode}` : "Fill in the fields below to add an E/D Code" : "Double-click a row to view or edit"}
        </p>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="ref-ed-fields"
          className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          <FontAwesomeIcon icon={faChevronDown} className={expanded ? "mr-2 rotate-180" : "mr-2"} />
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div id="ref-ed-fields" className={expanded ? "grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-4" : "hidden"}>
        {FORM_COLUMNS.map((keys, columnIndex) => <div key={columnIndex} className="flex min-w-0 flex-col gap-5">
          {keys.map((key) => {
            const field = FORM_FIELDS[key];
            return <FieldRenderer key={field.key} id={`ed_${field.key}`}
              label={field.label} required={field.required} value={form[field.key] ?? ""}
              type={field.type === "flag" || field.type === "category" ? "select" : field.type === "amount" ? "amount" : "text"}
              options={field.type === "category" ? CATEGORIES : FLAGS}
              placeholder=" "
              title={field.pendingMapping ? "Database field mapping is pending." : undefined}
              maxLength={field.max} disabled={field.pendingMapping || !writable || busy || (field.key === "edCode" && Boolean(selectedCode))}
              onChange={(value) => setForm((current) => ({ ...current, [field.key]: field.key === "edCode" ? String(value || "").toUpperCase() : value ?? "" }))}
            />;
          })}
        </div>)}
      </div>
      {expanded && <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700"><RegistrationInfo layout="straight" data={registration} /></div>}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error.message} <button type="button" onClick={() => refetch()} className="underline">Retry</button></p>}
    <div className="global-tran-table-main-div-ui mt-4">
      <SearchGlobalReferenceTable docType="EDCodes" columns={columns} data={records} isLoading={isLoading}
        onRowDoubleClick={(row) => openRecord(row)} isReadOnly={isReadOnly} canAdd={canAdd} canEdit={canEdit}
        canSave={canSave} canDelete={canDelete} itemsPerPage={50} onRefresh={refetch} autoFillGrid="True" />
    </div>
  </div>;
};

export default RefEDCodes;
