// src/NAYSA Cloud/Reference File/RefPayGroup.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
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
  faBuilding,
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
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const DOC_TYPE = "PayGroup";

const INITIAL_FORM = {
  groupCode: "",
  groupName: "",
  active: "Y",
  tblFieldArray: [],
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const RefPayGroup = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const guideRef = useRef(null);
    const pdfLink = reftablesPDFGuide[DOC_TYPE];
    const videoLink = reftablesVideoGuide[DOC_TYPE];

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

    const [isEditing, setIsEditing] = useState(true);
    const [isFieldsExpanded, setIsFieldsExpanded] = useState(false);
    const [selectedpayGroup, setSelectedpayGroup] = useState(null);

    const [isOpenGuide, setOpenGuide] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [tblFieldArray, setTblFieldArray] = useState([]);

    const userCode = user?.USER_CODE;

    const isAdding = isEditing && !selectedpayGroup;

    const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

    const getActiveLabel = (active) => 
        String(active || "").toUpperCase() === "Y" ? "Yes" : "No";

    // --- TANSTACK QUERY: LIST ---
    const { data: paygroups = [], isLoading: isListLoading } = useQuery({
        queryKey: ["paygroupList"],
        queryFn: async () => {
        const { data } = await apiClient.get("/paygroup");
        const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
        return raw ? JSON.parse(raw) : [];
        },
    });

    const { mutate: savepayGroup, isLoading: isSaving } = useMutation({
        mutationFn: async (payload) =>
        await apiClient.post("/upsertPayGroup", payload),

        onSuccess: (response) => {
            const sqlRow = response?.data?.data?.[0];
            if (sqlRow?.errorcount > 0) {
            useSwalErrorAlert(
                "Unable to save", sqlRow?.errormsg || "Failed to save Payroll Group."
            );
        return;
      }

        const status = response?.data?.status ?? response?.data?.data?.status;
        const success = response?.data?.success || status === "success" || !status;

        if (!success) {
            useSwalErrorAlert(
                "Error",
                response?.data?.message ||
                response?.data?.data?.message ||
                "Failed to save Payroll Group.",
            );
            return;
        }
        // IF SUCCESS
        queryClient.invalidateQueries({ queryKey: ["paygroupList"] });
        useSwalSuccessAlert("Success!", "Payroll Group saved successfully!");
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

    const { mutate: deletePayGroup, isLoading: isDeleting } = useMutation({
        mutationFn: async (payload) =>
            await apiClient.post("/deletePayGroup", payload),
        onSuccess: (response) => {
            queryClient.invalidateQueries(["paygroupList"]);
            useSwalDeleteRecord(
            "Deleted!",
            "The Payroll Group has been removed from the system.",
            );
            resetForm();
        },
        onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
    });

    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setRegistrationInfo(INITIAL_REG);
        setSelectedpayGroup(null);
        setIsEditing(false);
        setIsFieldsExpanded(false);
    };

    const startAdd = () => {
        resetForm();
        setIsEditing(true);
        setIsFieldsExpanded(true);
    };

    const handleEdit = (row) => {
        if (!row) return;

        setSelectedpayGroup(row.groupCode ?? null);
        setFormData({
            ...INITIAL_FORM,
            groupCode: row.groupCode ?? "",
            groupName: row.groupName ?? "",
            active: String(row.active ?? "Y").toUpperCase() === "Y" ? "Y" : "N",
        });

        setRegistrationInfo({
            registeredBy: row.registeredBy ?? "",
            registeredDate: row.registeredDate ?? "",
            lastUpdatedBy: row.updatedBy ?? "",
            lastUpdatedDate: row.updatedDate ?? "",
        });

        console.log("Edit Row:", row);
        setIsEditing(true);
        setIsFieldsExpanded(true);
    };

    const handleSave = () => {
        const payload = {
            json_data: JSON.stringify({
            json_data: {
                ...formData,
                action: selectedpayGroup ? "EDIT" : "ADD",
                userCode: user?.USER_CODE || "ADMIN",
            },
            }),
        };
        savepayGroup(payload);
    };

    const handleDelete = async (row) => {
    try {
        setIsLoading(true); // Ensure you have a general loading state or use the mutation's state
        const payload = {
        json_data: {
            groupCode: row.groupCode,
        },
        };

      // 1. Check if used in other tables via SPROC
        const response = await apiClient.post("/checkInUsedPayGroup", payload);
        const sqlRow = response?.data?.data?.[0];
        const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
        const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

        if (parsedData.result === "1") {
            setIsLoading(false);
            return useSwalErrorAlertAPI(
                `Cannot Delete Payroll Group Code: ${row.groupCode}`,
                `Code was already used.`,
            );
        }

        const confirm = await useSwalDeleteConfirm(
            "Confirm Delete",
            `Are you sure you want to delete Code: ${row.groupCode}?`,
        );

        if (confirm.isConfirmed) {
            deletePayGroup(payload);
        }
    } catch (error) {
        useSwalErrorAlertAPI("System Error", error);
    } finally {
        setIsLoading(false);
    }
    };

    const handleCheckDuplicate = async (groupCode) => {
        if (isEditing && selectedpayGroup) return;
        if (!groupCode) return;

        try {
            const payload = {
            json_data: {
                groupCode: groupCode,
            },
            };

            const response = await apiClient.post(
            "/checkDuplicatePayGroup",
            payload
            );

            const result = String(
            response?.data?.data?.[0]?.result ?? "0"
            );

            if (result === "1") {
            resetForm();

            return useSwalErrorAlertAPI(
                `Duplicate Payroll Group Code: ${groupCode}`,
                "Code was already used."
            );
            }
        } catch (error) {
            console.error("Duplicate Check Error:", error);
        }
    };

    useEffect(() => {
    const handleKey = (e) => {
        if (e.ctrlKey && e.key === "s") {
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
    }, [isEditing, formData, paygroups]);

    //TABLE COLUMNS
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
                className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:shadow-sm active:scale-95 transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
                title="Edit"
            >
                <FontAwesomeIcon icon={faEdit} />
                <span className="md:hidden">Edit</span>
            </button>

            <button
                onClick={() => handleDelete(row)}
                className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white hover:shadow-sm active:scale-95 transition-all duration-150 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
                title="Delete"
            >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
        },
        {
            key: "groupCode",
            label: "Payroll Group Code",
            sortable: true,
            width: 120,
            minWidth: 120,
            requiredVisible: true,
            render: (row) => (
                <span className="font-mono text-[12px] font-semibold tracking-wide text-gray-700 dark:text-gray-200">
                {row.groupCode}
                </span>
            ),
        },
        {
            key: "groupName",
            label: "Payroll Group Name",
            sortable: true,
            width: 280,
            minWidth: 280,
            requiredVisible: true,
        },
        {
            key: "active",
            label: "Active",
            sortable: true,
            width: 100,
            minWidth: 100,
            className: "!px-2",
            render: (row) => {
            const isActive = String(row.active || "").toUpperCase() === "Y";
            return (
                <span
                className={`flex min-h-[28px] w-full items-center justify-center gap-1.5 rounded-full px-2 py-1 text-center text-[11px] font-medium whitespace-nowrap ${
                    isActive
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
                }`}
                >
                    <FontAwesomeIcon
                        icon={isActive ? faCircleCheck : faCircleXmark}
                        className={`text-[10px] ${
                        isActive ? "text-emerald-500" : "text-gray-400"
                        }`}/>

                {getActiveLabel(row.active)}
                </span>
            );
            },
        },
        ],
        [paygroups, selectedpayGroup, handleDelete],
    );

    useEffect(() => {
        let mounted = true;
        (async () => {
            const res = await useFieldLenghtCheck("REF_PayGroup");
            if (mounted) setTblFieldArray(res || []);
        })();
    return () => {
      mounted = false;
    };
    }, []);

    const getMax = (col) => useGetFieldLength(tblFieldArray, col);

return (
    <div className="global-ref-main-div-ui">
        {(isListLoading || isSaving || isDeleting) && <LoadingSpinner />}

        {/* HEADER (same UI pattern as COAMast, no Tabs) */}
        <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
            {/* Left: Title */}
            <div className="w-full md:w-auto flex md:justify-start">
                <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
                {reftables[DOC_TYPE] || "Payroll Group Reference"}
                </h1>
            </div>

            {/* Middle: spacer (no tabs) */}
            <div className="hidden md:flex justify-center w-full" />

            {/* Right: Buttons + Info */}
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
                      className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all duration-150
                        ${
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

              {/* Info Dropdown */}
              <div ref={guideRef} className="relative">
                <button
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
                      />{" "}
                      PDF Guide
                    </button>

                    <button
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
                      />{" "}
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
      <div className="mt-24 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
        {/* LEFT: Form */}
        <div
          className={`flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg transition-colors duration-200 border-gray-100 dark:border-gray-700"
          }`}
        >
          {/* Form status strip */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-[11px] sm:text-[14px] p-1.5 text-blue-600 font-semibold mt-0.5">
                {isEditing
                  ? selectedpayGroup
                    ? `Updating Record - ${selectedpayGroup}`
                    : "Fill in the fields below to add a new Payroll Group"
                  : "Select \u201cAdd\u201d or double-click a row to edit"}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
            className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 transition-all duration-200 ${
              isFieldsExpanded
                ? "opacity-100 max-h-[600px]"
                : "hidden"
            }`}
          >
            {/* Column 1 */}
            <div className="space-y-4">
              <FieldRenderer
                label="Payroll Group Code"
                required
                type="text"
                value={formData.groupCode}
                disabled={!isEditing || (isEditing && !!selectedpayGroup)}
                onChange={(v) =>
                  updateForm({ groupCode: (v || "").toUpperCase() })
                }
                onBlur={() => handleCheckDuplicate(formData.groupCode)}
                maxLength={getMax("GROUP_CODE")}
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

            {/* Column 2 */}
            <div className="space-y-4">
              <FieldRenderer
                label="Payroll Group Name"
                required
                type="text"
                value={formData.groupName}
                disabled={!isEditing}
                onChange={(v) => updateForm({ groupName: v })}
                maxLength={getMax("GROUP_NAME")}
              />
            </div>
          </div>

          {/* Registration Info */}
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

      {/* TABLE */}
      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={paygroups}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["paygroupList"] })
          }
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefPayGroup;
