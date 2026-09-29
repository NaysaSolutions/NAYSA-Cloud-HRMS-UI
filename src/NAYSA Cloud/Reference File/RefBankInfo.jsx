/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faEdit,
  faPlus,
  faSave,
  faTrashAlt,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { reftables } from "@/NAYSA Cloud/Global/reftable";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const DOC_TYPE = "BankInfo";

const RECORD_TYPE_OPTIONS = [
  { value: "A", label: "Automatic" },
  { value: "M", label: "Manual" },
];

const getRecordTypeLabel = (value) =>
  RECORD_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;

const INITIAL_FORM = {
  bankCode: "",
  bankName: "",
  bankAddress: "",
  compCode: "",
  compName: "",
  compAcct: "",
  branchCode: "",
  branchName: "",
  batchNo: "",
  recType: "",
  contact: "",
  position: "",
  docDesc: "",
  signatory1: "",
  signatory1Position: "",
  signatory2: "",
  signatory2Position: "",
  signatory3: "",
  signatory3Position: "",
};

const INITIAL_REGISTRATION = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const RefBankInfo = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REGISTRATION);
  const [selectedKey, setSelectedKey] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const updateForm = (updates) =>
    setFormData((current) => ({ ...current, ...updates }));

  const { data: bankInfoRows = [], isLoading: isListLoading } = useQuery({
    queryKey: ["bankInfoList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/bankInfo");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REGISTRATION);
    setSelectedKey(null);
    setIsEditing(false);
    setIsFieldsExpanded(false);
  }, []);

  const { mutate: saveBankInfo, isPending: isSaving } = useMutation({
    mutationFn: (payload) => apiClient.post("/upsertBankInfo", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorCount > 0 || sqlRow?.errorcount > 0) {
        useSwalErrorAlert(
          "Unable to save",
          sqlRow?.errorMsg || sqlRow?.errormsg || "Failed to save bank information.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["bankInfoList"] });
      useSwalSuccessAlert("Success!", "Bank information saved successfully!");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("System Error", error),
  });

  const { mutate: deleteBankInfo, isPending: isDeleting } = useMutation({
    mutationFn: (payload) => apiClient.post("/deleteBankInfo", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankInfoList"] });
      useSwalDeleteRecord(
        "Deleted!",
        "The bank information has been removed from the system.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const startAdd = () => {
    resetForm();
    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const handleEdit = useCallback((row) => {
    if (!row) return;

    setFormData(
      Object.keys(INITIAL_FORM).reduce(
        (result, key) => ({ ...result, [key]: row[key] ?? "" }),
        {},
      ),
    );
    setSelectedKey({
      bankCode: row.bankCode,
      compCode: row.compCode,
      compAcct: row.compAcct,
    });
    setRegistrationInfo({
      registeredBy: row.registeredBy ?? "",
      registeredDate: row.registeredDate ?? "",
      lastUpdatedBy: row.updatedBy ?? "",
      lastUpdatedDate: row.updatedDate ?? "",
    });
    setIsEditing(true);
    setIsFieldsExpanded(true);
  }, []);

  const validateForm = () => {
    const requiredFields = [
      ["bankCode", "Bank Code"],
      ["bankName", "Bank Name"],
      ["bankAddress", "Bank Address"],
      ["compCode", "Company Code"],
      ["compName", "Company Name"],
      ["compAcct", "Account No"],
    ];
    const missing = requiredFields
      .filter(([key]) => !String(formData[key] || "").trim())
      .map(([, label]) => label);

    if (missing.length) {
      useSwalValidationAlert({
        title: "Required Fields",
        message: `Please provide: ${missing.join(", ")}.`,
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const jsonData = {
      ...formData,
      ...(selectedKey
        ? {
            originalBankCode: selectedKey.bankCode,
            originalCompCode: selectedKey.compCode,
            originalCompAcct: selectedKey.compAcct,
          }
        : {}),
      userCode: user?.USER_CODE || "ADMIN",
    };

    saveBankInfo({ jsonData: JSON.stringify({ jsonData }) });
  };

  const handleDelete = useCallback(
    async (row) => {
      const jsonData = {
        bankCode: row.bankCode,
        compCode: row.compCode,
        compAcct: row.compAcct,
      };

      try {
        setIsChecking(true);
        const usageResponse = await apiClient.post("/checkInUsedBankInfo", {
          jsonData,
        });
        const inUsedCount = Number(
          usageResponse?.data?.data?.[0]?.inUsedCount || 0,
        );

        if (inUsedCount > 0) {
          useSwalErrorAlert(
            "Unable to delete",
            "This bank information is already in use.",
          );
          return;
        }

        const confirmation = await useSwalDeleteConfirm(
          "Confirm Delete",
          `Delete ${row.bankCode} - ${row.compAcct}?`,
        );

        if (confirmation.isConfirmed) deleteBankInfo({ jsonData });
      } catch (error) {
        useSwalErrorAlertAPI("System Error", error);
      } finally {
        setIsChecking(false);
      }
    },
    [deleteBankInfo],
  );

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 100,
        minWidth: 100,
        render: (row) => (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => handleEdit(row)}
              className="flex h-7 items-center justify-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 text-xs text-blue-600 transition-all hover:bg-blue-600 hover:text-white active:scale-95"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="flex h-7 items-center justify-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 text-xs text-red-600 transition-all hover:bg-red-600 hover:text-white active:scale-95"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      { key: "bankCode", label: "Bank Code", sortable: true, width: 110, minWidth: 100, requiredVisible: true },
      { key: "bankName", label: "Bank Name", sortable: true, width: 230, minWidth: 180, requiredVisible: true },
      { key: "bankAddress", label: "Bank Address", sortable: true, width: 260, minWidth: 180 },
      { key: "compCode", label: "Company Code", sortable: true, width: 120, minWidth: 110 },
      { key: "compName", label: "Company Name", sortable: true, width: 230, minWidth: 180 },
      { key: "compAcct", label: "Account No", sortable: true, width: 150, minWidth: 130 },
      { key: "branchCode", label: "Branch Code", sortable: true, width: 120, minWidth: 110 },
      { key: "branchName", label: "Branch Name", sortable: true, width: 180, minWidth: 150 },
      { key: "batchNo", label: "Batch No", sortable: true, width: 100, minWidth: 90 },
      {
        key: "recType",
        label: "Type",
        sortable: true,
        width: 110,
        minWidth: 100,
        render: (row) => getRecordTypeLabel(row.recType),
      },
      { key: "contact", label: "Contact Person", sortable: true, width: 160, minWidth: 130 },
      { key: "position", label: "Position", sortable: true, width: 150, minWidth: 120 },
      { key: "docDesc", label: "Document Title", sortable: true, width: 180, minWidth: 150 },
      { key: "signatory1", label: "Signatory 1", sortable: true, width: 160, minWidth: 130 },
      { key: "signatory2", label: "Signatory 2", sortable: true, width: 160, minWidth: 130 },
      { key: "signatory3", label: "Signatory 3", sortable: true, width: 160, minWidth: 130 },
    ],
    [handleDelete, handleEdit],
  );

  useEffect(() => {
    let mounted = true;
    useFieldLenghtCheck("REF_BANKINFO").then((result) => {
      if (mounted) setTblFieldArray(result || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (isEditing) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const getMax = (column) => useGetFieldLength(tblFieldArray, column);
  const field = (label, key, options = {}) => (
    <FieldRenderer
      label={label}
      type={options.type || "text"}
      required={options.required}
      value={formData[key]}
      disabled={!isEditing}
      options={options.options || []}
      onChange={(value) =>
        updateForm({
          [key]: options.uppercase ? String(value || "").toUpperCase() : value,
        })
      }
      maxLength={getMax(options.column || key)}
    />
  );

  const isBusy = isListLoading || isSaving || isDeleting || isChecking;

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && <LoadingSpinner />}

      <div className="global-ref-header-ui mb-2">
        <div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-3">
          <h1 className="global-ref-headertext-ui text-center md:text-left">
            {reftables[DOC_TYPE] || "Bank Information"}
          </h1>
          <div />
          <div className="flex justify-center md:justify-end">
            <ButtonBar
              buttons={[
                {
                  key: "add",
                  label: <span className="ml-1 hidden sm:inline">Add</span>,
                  icon: faPlus,
                  onClick: startAdd,
                  className: "flex h-8 items-center justify-center gap-1 rounded-md bg-blue-600 px-4 text-[11px] font-medium text-white hover:bg-blue-700",
                },
                {
                  key: "save",
                  label: <span className="ml-1 hidden sm:inline">Save</span>,
                  icon: faSave,
                  onClick: handleSave,
                  disabled: !isEditing || isSaving,
                  className: "flex h-8 items-center justify-center gap-1 rounded-md bg-blue-600 px-4 text-[11px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
                },
                {
                  key: "reset",
                  label: <span className="ml-1 hidden sm:inline">Reset</span>,
                  icon: faUndo,
                  onClick: resetForm,
                  className: "flex h-8 items-center justify-center gap-1 rounded-md bg-blue-600 px-4 text-[11px] font-medium text-white hover:bg-blue-700",
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-24 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
          <p className="p-1.5 text-[14px] text-gray-500">
            {isEditing
              ? selectedKey
                ? `Updating Record - ${selectedKey.bankCode} / ${selectedKey.compAcct}`
                : "Fill in the fields below to add bank information"
              : "Select Add or double-click a row to edit"}
          </p>
          <div className="flex items-center gap-2">
            {isEditing && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${
                  selectedKey
                    ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                    selectedKey ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
                {selectedKey ? "Editing" : "Adding"}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsFieldsExpanded((value) => !value)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              aria-expanded={isFieldsExpanded}
              aria-controls="ref-bank-info-fields"
            >
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`text-[10px] transition-transform duration-200 ${
                  isFieldsExpanded ? "rotate-180" : ""
                }`}
              />
              {isFieldsExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        <div
          id="ref-bank-info-fields"
          className={isFieldsExpanded ? "space-y-6" : "hidden"}
        >
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Bank and Company</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
              {field("Bank Code", "bankCode", { required: true, uppercase: true, column: "BANK_CODE" })}
              {field("Bank Name", "bankName", { required: true, column: "BANK_NAME" })}
              {field("Bank Address", "bankAddress", { required: true, column: "BANK_ADDRESS" })}
              {field("Company Code", "compCode", { required: true, uppercase: true, column: "COMP_CODE" })}
              {field("Company Name", "compName", { required: true, column: "COMP_NAME" })}
              {field("Account No", "compAcct", { required: true, column: "COMP_ACCT" })}
              {field("Branch Code", "branchCode", { uppercase: true, column: "BRANCHCODE" })}
              {field("Branch Name", "branchName", { column: "BRANCHNAME" })}
            </div>
          </section>

          <section className="border-t border-gray-100 pt-5 dark:border-gray-700">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Remittance Information</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
              {field("Batch No", "batchNo", { column: "BATCH_NO" })}
              {field("Type", "recType", { type: "select", options: RECORD_TYPE_OPTIONS, column: "REC_TYPE" })}
              {field("Contact Person", "contact", { column: "CONTACT" })}
              {field("Position", "position", { column: "POSITION" })}
              <div className="md:col-span-2">{field("Document Title", "docDesc", { column: "DOC_DESC" })}</div>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-5 dark:border-gray-700">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Signatories</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-4">
                {field("Signatory 1", "signatory1", { column: "SIGNATORY_1" })}
                {field("Signatory 1 Position", "signatory1Position", { column: "SIGNATORY_1_POSITION" })}
              </div>
              <div className="space-y-4">
                {field("Signatory 2", "signatory2", { column: "SIGNATORY_2" })}
                {field("Signatory 2 Position", "signatory2Position", { column: "SIGNATORY_2_POSITION" })}
              </div>
              <div className="space-y-4">
                {field("Signatory 3", "signatory3", { column: "SIGNATORY_3" })}
                {field("Signatory 3 Position", "signatory3Position", { column: "SIGNATORY_3_POSITION" })}
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
            <RegistrationInfo layout="straight" data={registrationInfo} />
          </div>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={bankInfoRows}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["bankInfoList"] })}
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefBankInfo;
