import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";

import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const DOC_TYPE = "RefDeptGroup";

const INITIAL_FORM = {
  code: "",
  description: "",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const RefGroup = ({ headerTabs, pageTitle, active = true }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

  const [isEditing, setIsEditing] = useState(true);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);

  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const isAdding = isEditing && !selectedCode;

  const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

  const getActiveLabel = (activeYN) =>
    String(activeYN || "").toUpperCase() === "Y" ? "Yes" : "No";

  // --- TANSTACK QUERY: LIST ---
  const { data: records = [], isLoading: isListLoading } = useQuery({
    queryKey: ["refDeptGroupList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/refDeptGroup");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      const rows = raw ? JSON.parse(raw) : [];
      return rows.map((row) => ({
        ...row,
        description: row.description ?? row.name ?? "",
      }));
    },
  });

  // --- MUTATION: UPSERT ---
  const { mutate: saveRecord, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/upsertRefDeptGroup", payload),

    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert(
          "Unable to save",
          sqlRow?.errormsg || "Failed to save Department Group.",
        );
        return;
      }

      const status = response?.data?.status ?? response?.data?.data?.status;
      const success =
        response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Department Group.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["refDeptGroupList"] });
      useSwalSuccessAlert("Success!", "Department Group saved successfully!");
      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status
          ? `HTTP ${error.response.status}`
          : error?.message || String(error),
      );
    },
  });

  // --- MUTATION: DELETE ---
  const { mutate: deleteRecord, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/deleteRefDeptGroup", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["refDeptGroupList"]);
      useSwalDeleteRecord(
        "Deleted!",
        "The Department Group has been removed from the system.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // --- ACTIONS ---
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedCode(null);
    setIsEditing(false);
    setIsFieldsExpanded(true);
  };

  const startAdd = () => {
    resetForm();
    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const handleEdit = (row) => {
    if (!row) return;

    setSelectedCode(row.code ?? null);
    setFormData({
      ...INITIAL_FORM,
      code: row.code ?? "",
      description: row.description ?? "",
      active: String(row.active ?? "Y").toUpperCase() === "Y" ? "Y" : "N",
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });

    setIsEditing(true);
    setIsFieldsExpanded(true);
  };

  const handleSave = () => {
    const payload = {
      json_data: {
        code: formData.code,
        description: formData.description,
        active: formData.active || "Y",
        action: selectedCode ? "EDIT" : "ADD",
        userCode: user?.USER_CODE || "ADMIN",
      },
    };

    saveRecord(payload);
  };

  const handleDelete = async (row) => {
    try {
      setIsLoading(true);
      const payload = { json_data: { code: row.code } };

      const response = await apiClient.post("/checkInUsedRefDeptGroup", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        setIsLoading(false);
        return useSwalErrorAlertAPI(
          `Cannot Delete Group Code: ${row.code}`,
          `Code was already used.`,
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Group Code: ${row.code}?`,
      );

      if (confirm.isConfirmed) {
        deleteRecord(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDuplicate = async (codeValue) => {
    if (isEditing && selectedCode) return;
    if (!codeValue) return;

    try {
      const payload = { json_data: { code: codeValue } };
      const response = await apiClient.post("/checkDuplicateRefDeptGroup", payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        resetForm();
        return useSwalErrorAlertAPI(
          `Duplicate Group Code: ${codeValue}`,
          `Code was already used.`,
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (active && e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (isEditing) handleSave();
      }
    };
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target))
        setOpenGuide(false);
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [active, isEditing, formData, records]);

  // --- TABLE COLUMNS ---
  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 100,
        minWidth: 100,
        render: (row) => (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleEdit(row)}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all text-xs"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "code",
        label: "Group Code",
        sortable: true,
        width: 120,
        minWidth: 120,
        render: (row) => (
          <span className="font-mono text-[12px] font-semibold text-gray-700 dark:text-gray-200">
            {row.code}
          </span>
        ),
      },
      {
        key: "description",
        label: "Group Name",
        sortable: true,
        width: 350,
        minWidth: 250,
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        render: (row) => {
          const isActive = String(row.active || "").toUpperCase() === "Y";
          return (
            <span
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <FontAwesomeIcon
                icon={isActive ? faCircleCheck : faCircleXmark}
                className={`text-[10px] ${isActive ? "text-emerald-500" : "text-gray-400"}`}
              />
              {getActiveLabel(row.active)}
            </span>
          );
        },
      },
    ],
    [records, selectedCode, handleDelete],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await useFieldLenghtCheck("REF_DEPTGROUP");
      if (mounted) setTblFieldArray(res || []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || isDeleting || isLoading) && (
        <LoadingSpinner />
      )}

      {/* HEADER */}
      <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
              {pageTitle || reftables[DOC_TYPE] || "Department Group"}
            </h1>
          </div>

          <div className="flex justify-center w-full min-w-0">{headerTabs}</div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="hidden sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: startAdd,
                      className:
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                    },
                    {
                      key: "save",
                      label: (
                        <span className="hidden sm:inline ml-1">Save</span>
                      ),
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving || !isFieldsExpanded,
                      className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150 ${
                        !isEditing || isSaving || !isFieldsExpanded
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95"
                      }`,
                    },
                    {
                      key: "reset",
                      label: (
                        <span className="hidden sm:inline ml-1">Reset</span>
                      ),
                      icon: faUndo,
                      onClick: resetForm,
                      className:
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150",
                    },
                  ]}
                />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
                  <span className="hidden sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${
                      isOpenGuide ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden origin-top-right animate-[fadeIn_0.12s_ease-out]">
                    <button
                      type="button"
                      onClick={() => {
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!pdfLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />
                      PDF Guide
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (videoLink) window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!videoLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faVideo}
                        className="mr-2 text-blue-500"
                      />
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`${headerTabs ? "mt-40 md:mt-24" : "mt-24"} flex flex-col lg:flex-row lg:items-stretch gap-2`}>
        <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg transition-colors duration-200">
          {/* Status strip */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] sm:text-[14px] p-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing
                ? selectedCode
                  ? `Updating Record - ${selectedCode}`
                  : "Fill in the fields below to add a new Department Group"
                : "Select “Add” or double-click a row to edit"}
            </p>

            <div className="flex items-center justify-end gap-2">
              {isEditing && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 ring-inset ${
                    isAdding
                      ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                      isAdding ? "bg-blue-500" : "bg-amber-500"
                    }`}
                  />
                  {isAdding ? "Adding" : "Editing"}
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsFieldsExpanded((expanded) => !expanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                aria-expanded={isFieldsExpanded}
                aria-controls="ref-group-fields ref-group-registration"
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
            id="ref-group-fields"
            className={`grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            <FieldRenderer
              label="Group Code"
              required
              type="text"
              value={formData.code}
              disabled={!isEditing || !!selectedCode}
              onChange={(v) => updateForm({ code: (v || "").toUpperCase() })}
              onBlur={(e) => handleCheckDuplicate(e.target.value)}
              maxLength={getMax("DEPT_GROUP_CODE")}
            />
            <FieldRenderer
              label="Group Name"
              required
              type="text"
              value={formData.description}
              disabled={!isEditing}
              onChange={(v) => updateForm({ description: v })}
              maxLength={getMax("DEPT_GROUP_NAME")}
            />
            <FieldRenderer
              label="Active"
              type="select"
              value={formData.active === "Y" ? "Yes" : "No"}
              disabled={!isEditing}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              onChange={(v) => updateForm({ active: v === "No" ? "N" : "Y" })}
            />
          </div>

          <div
            id="ref-group-registration"
            className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-200 ${
              isFieldsExpanded ? "opacity-100" : "hidden"
            }`}
          >
            <RegistrationInfo layout="straight" data={registrationInfo} />
          </div>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={records}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["refDeptGroupList"] })
          }
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefGroup;