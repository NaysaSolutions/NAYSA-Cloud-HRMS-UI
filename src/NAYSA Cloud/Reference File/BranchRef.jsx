// src/NAYSA Cloud/Reference File/BranchRef.jsx
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

const DOC_TYPE = "Branch";

const BRANCH_TYPE_OPTIONS = [
  { value: "Main", label: "Main" },
  { value: "Branch", label: "Branch" },
  { value: "Company Store", label: "Company Store" },
  { value: "Franchisee", label: "Franchisee" },
];

const normalizeBranchType = (value) => {
  const v = String(value || "").trim().toUpperCase();

  if (v === "MAIN") return "Main";
  if (v === "COMPANY STORE" || v === "COMPANYSTORE" || v === "COMPANY") {
    return "Company Store";
  }
  if (v === "FRANCHISEE" || v === "FRANCHISE") return "Franchisee";

  return "Branch";
};

const INITIAL_FORM = {
  branchCode: "",
  branchName: "",
  branchAddr1: "",
  branchAddr2: "",
  branchAddr3: "",
  branchTin: "",
  telNo: "",
  zipCode: "",
  main: "Branch", // Main / Branch / Company Store / Franchisee
  active: "Y", // Y/N
  tblFieldArray: [],
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const BranchRef = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedBranchCode, setSelectedBranchCode] = useState(null);

  const [isOpenGuide, setOpenGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const userCode =
    user?.USER_CODE || user?.username || user?.userCode || "SYSTEM";

  const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

  const getAddress = useCallback((row) => {
    return [row?.branchAddr1, row?.branchAddr2, row?.branchAddr3]
      .filter(Boolean)
      .join(", ");
  }, []);

  const getBranchTypeLabel = (branchType) => normalizeBranchType(branchType);

  const getActiveLabel = (activeYN) =>
    String(activeYN || "").toUpperCase() === "Y" ? "Yes" : "No";

  // --- TANSTACK QUERY: LIST ---
  const { data: branches = [], isLoading: isListLoading } = useQuery({
    queryKey: ["branchList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/branch");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  // --- MUTATION: UPSERT ---
  const { mutate: saveBranch, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/upsertBranch", payload),

    onSuccess: (response) => {
      // 1) SPROC row style (errorcount/errormsg)
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert(
          "Error",
          sqlRow?.errormsg || "Failed to save Branch.",
        );
        resetForm(); // ✅ reset on failure
        return;
      }

      // 2) API status style
      const status = response?.data?.status ?? response?.data?.data?.status;
      const success =
        response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Branch.",
        );
        resetForm(); // ✅ reset on failure
        return;
      }

      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["branchList"] });
      useSwalSuccessAlert("Success!", "Branch saved successfully!");
      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status
          ? `HTTP ${error.response.status}`
          : error?.message || String(error),
      );
      resetForm(); // ✅ reset on request error too
    },
  });

  // --- MUTATION: DELETE ---
  const { mutate: deleteBranch, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/deleteBranch", payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["branchList"]);
      useSwalDeleteRecord(
        "Deleted!",
        "The branch has been removed from the system.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // --- ACTIONS ---
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedBranchCode(null);
    setIsEditing(false);
  };

  const startAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEdit = (row) => {
    if (!row) return;

    setSelectedBranchCode(row.branchCode ?? null);
    setFormData({
      ...INITIAL_FORM,
      branchCode: row.branchCode ?? "",
      branchName: row.branchName ?? "",
      branchAddr1: row.branchAddr1 ?? "",
      branchAddr2: row.branchAddr2 ?? "",
      branchAddr3: row.branchAddr3 ?? "",
      branchTin: row.branchTin ?? "",
      telNo: row.telNo ?? "",
      zipCode: row.zipCode ?? "",
      main: normalizeBranchType(row.main),
      active: String(row.active ?? "Y").toUpperCase() === "Y" ? "Y" : "N",
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate,
    });

    console.log("Edit Row:", row);
    setIsEditing(true);
  };

  // --- ACTIONS ---
  const handleSave = () => {
    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          action: selectedBranchCode ? "EDIT" : "ADD",
          userCode: user?.USER_CODE || "ADMIN",
        },
      }),
    };
    saveBranch(payload);
  };

  const handleDelete = async (row) => {
    try {
      setIsLoading(true); // Ensure you have a general loading state or use the mutation's state
      const payload = {
        json_data: {
          branchCode: row.branchCode,
        },
      };

      // 1. Check if used in other tables via SPROC
      const response = await apiClient.post("/checkInUsedBranch", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        setIsLoading(false);
        return useSwalErrorAlertAPI(
          `Cannot Delete Branch Code: ${row.branchCode}`,
          `Code was already used.`,
        );
      }

      // 2. Confirmations
      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Code: ${row.branchCode}?`,
      );

      if (confirm.isConfirmed) {
        deleteBranch(payload);
      }
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- DUPLICATE CHECK (Add mode only) ---
  const handleCheckDuplicate = async (code) => {
    if (isEditing && selectedBranchCode) return;
    if (!code) return;

    try {
      const payload = { json_data: { branchCode: code } };
      const response = await apiClient.post("/checkDuplicateBranch", payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        setIsLoading(false);
        resetForm();
        return useSwalErrorAlertAPI(
          `Duplicate Branch Code: ${code}`,
          `Code was already used.`,
        );
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    }
  };

  // Ctrl+S save + click outside dropdown
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
  }, [isEditing, formData, branches]);

  // --- TABLE COLUMNS (SearchGlobalReferenceTable style) ---
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors text-xs"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={() => handleDelete(row)}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },

      {
        key: "branchCode",
        label: "Branch Code",
        sortable: true,
        width: 120,
        minWidth: 120,
        requiredVisible: true,
      },
      {
        key: "branchName",
        label: "Branch Name",
        sortable: true,
        width: 280,
        minWidth: 280,
        requiredVisible: true,
      },
      {
        key: "address",
        label: "Address",
        sortable: true,
        width: 350,
        minWidth: 100,
        render: (row) => getAddress(row),
      },
      {
        key: "zipCode",
        label: "Zip Code",
        sortable: true,
        width: 100,
        minWidth: 100,
      },
      {
        key: "branchTin",
        label: "TIN",
        sortable: true,
        width: 150,
        minWidth: 100,
      },
      {
        key: "telNo",
        label: "Contact No.",
        sortable: true,
        width: 150,
        minWidth: 100,
      },
      {
        key: "main",
        label: "Branch Type",
        sortable: true,
        width: 100,
        minWidth: 100,
        render: (row) => getBranchTypeLabel(row.main),
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        minWidth: 100,
        render: (row) => getActiveLabel(row.active),
      },
    ],
    [getAddress, branches, selectedBranchCode, handleDelete],
  );

  // load max length metadata once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await useFieldLenghtCheck("BRANCH_REF");
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
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {reftables[DOC_TYPE] || "Branch Reference"}
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
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: (
                        <span className="hidden sm:inline ml-1">Save</span>
                      ),
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving,
                      className: `flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                        ${
                          !isEditing || isSaving
                            ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                            : "bg-blue-600 text-white hover:bg-blue-700"
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
                        "flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                  ]}
                />
              </div>

              {/* Info Dropdown */}
              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
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
                    className="hidden sm:inline text-[10px] opacity-80"
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      disabled={!pdfLink}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Column 1 */}
          <div className="space-y-4">
            <FieldRenderer
              label="Branch Code"
              required
              type="text"
              value={formData.branchCode}
              disabled={!isEditing || (isEditing && !!selectedBranchCode)}
              onChange={(v) =>
                updateForm({ branchCode: (v || "").toUpperCase() })
              }
              onBlur={(e) => handleCheckDuplicate(e.target.value)}
              maxLength={getMax("BRANCH_CODE")}
            />

            <FieldRenderer
              label="Branch Name"
              required
              type="text"
              value={formData.branchName}
              disabled={!isEditing}
              onChange={(v) => updateForm({ branchName: v })}
              maxLength={getMax("BRANCH_NAME")}
            />

            <FieldRenderer
              label="Address 1"
              required
              type="text"
              value={formData.branchAddr1}
              disabled={!isEditing}
              onChange={(v) => updateForm({ branchAddr1: v })}
              maxLength={getMax("BRANCH_ADDR1")}
            />

            <FieldRenderer
              label="Address 2"
              type="text"
              value={formData.branchAddr2}
              disabled={!isEditing}
              onChange={(v) => updateForm({ branchAddr2: v })}
              maxLength={getMax("BRANCH_ADDR2")}
            />

            <FieldRenderer
              label="Address 3"
              type="text"
              value={formData.branchAddr3}
              disabled={!isEditing}
              onChange={(v) => updateForm({ branchAddr3: v })}
              maxLength={getMax("BRANCH_ADDR3")}
            />
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <FieldRenderer
              label="TIN"
              required
              type="text"
              value={formData.branchTin}
              disabled={!isEditing}
              onChange={(v) => updateForm({ branchTin: v })}
              maxLength={getMax("BRANCH_TIN")}
            />

            <FieldRenderer
              label="Contact No."
              type="text"
              value={formData.telNo}
              disabled={!isEditing}
              onChange={(v) => updateForm({ telNo: v })}
              maxLength={getMax("TEL_NO")}
            />

            <FieldRenderer
              label="Zip Code"
              type="text"
              value={formData.zipCode}
              disabled={!isEditing}
              onChange={(v) => updateForm({ zipCode: v })}
              maxLength={getMax("ZIP_CODE")}
            />

            <FieldRenderer
              label="Branch Type"
              type="select"
              value={normalizeBranchType(formData.main)}
              disabled={!isEditing}
              options={BRANCH_TYPE_OPTIONS}
              onChange={(v) => updateForm({ main: normalizeBranchType(v) })}
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
        </div>

        {/* RIGHT: Registration Info */}
        <div className="w-full lg:w-[320px]">
          <RegistrationInfo layout="stacked" data={registrationInfo} />
        </div>
      </div>

      {/* TABLE */}
      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          columns={columns}
          data={branches}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["branchList"] })}

          // autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default BranchRef;
