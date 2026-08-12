import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSearch, faTimes, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { Info } from "lucide-react";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchMRCmast from "@/NAYSA Cloud/Lookup/SearchMRCmast";
import UsersLookupModal from "@/NAYSA Cloud/Lookup/SearchUsers";
import { useTopUserRow, useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable.js";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const buildDepartmentDisplay = (departments = []) => {
  if (departments.length <= 1) {
    return { mode: "normal", label: departments };
  }

  return {
    mode: "more",
    visible: departments.slice(0, 1),
    more: departments.length - 1,
    hidden: departments.slice(1),
  };
};

const getNextId = (rows) =>
  rows.reduce((maxId, row) => Math.max(maxId, Number(row.id) || 0), 0) + 1;

const normalizeUserCode = (value) => String(value || "").trim().toUpperCase();
const normalizeDepartmentValue = (value) => String(value || "").trim();

const mapRCToDepartmentOption = (item) => ({
  value: normalizeDepartmentValue(item?.rcCode || item?.RC_CODE || item?.code),
  label: String(item?.rcName || item?.RC_NAME || item?.name || item?.rcCode || "").trim(),
  type: String(item?.rcType || item?.RC_TYPE || "").trim(),
});

// Wrap the component in forwardRef to receive actions from WareMast.jsx
const WhParameter = forwardRef(({ isMobile, onMobileActionOpen, onStateChange }, ref) => {
  const { user, refsLoaded } = useAuth();
  const [docType, setDocType] = useState("");
  const [rows, setRows] = useState([]);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [departmentPicker, setDepartmentPicker] = useState({
    rowId: null,
    draft: [],
  });
  const [modals, setModals] = useState({ user: false });
  const [insertAfterRowId, setInsertAfterRowId] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const parseJsonResult = (rawData) => {
    if (Array.isArray(rawData)) return rawData;
    if (!rawData) return [];
    try {
      return JSON.parse(rawData);
    } catch {
      return [];
    }
  };

  const getProcedureRows = (result) => {
    const rawData =
      result?.data?.[0]?.result ??
      result?.data?.result ??
      result?.result ??
      result?.data ??
      [];
    return parseJsonResult(rawData);
  };

  const splitDepartmentCodes = (value) => {
    if (Array.isArray(value)) return value.map(normalizeDepartmentValue).filter(Boolean);
    if (!value) return [];

    const rawValue = String(value).trim();
    if (!rawValue) return [];

    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) return parsed.map(normalizeDepartmentValue).filter(Boolean);
    } catch {
      // Stored value may be a plain comma-separated RC list.
    }

    return rawValue.split(",").map(normalizeDepartmentValue).filter(Boolean);
  };

  // --- NEW: React Query for Document Types ---
const { data: dropdowns, isLoading: isDropdownLoading } = useQuery({
    queryKey: ["whParameterDropdowns"],
    queryFn: async () => {
      const [docTypes] = await Promise.all([
        // Check these two strings! They must match your DB exactly.
        useTopDocDropDown("ACTUAL_DB_CODE", "ACTUAL_DB_TYPE"), 
      ]);
      return { docTypes };
    },
  });

  const docTypeOptions = useMemo(() => {
    // ADD THIS LOG to see what your API is actually returning
    console.log("Document Types API Response:", dropdowns?.docTypes);

    return (dropdowns?.docTypes || []).map((d) => {
      // If your API returns docCode instead of DROPDOWN_CODE, change this below:
      const value = String(d.DROPDOWN_CODE || d.docCode || d.DOC_CODE || "").trim();
      const name = String(d.DROPDOWN_NAME || d.docName || d.DOC_NAME || value).trim();
      
      return {
        value,
        label: value && name && value !== name ? `${value} - ${name}` : name || value,
      };
    }).filter((doc) => doc.value && doc.label);
  }, [dropdowns?.docTypes]);
  useEffect(() => {
    if (!docTypeOptions.length) {
      setDocType("");
      return;
    }
    setDocType((current) =>
      docTypeOptions.some((option) => option.value === current)
        ? current
        : docTypeOptions[0].value
    );
  }, [docTypeOptions]);

  const {
    data: rcDepartmentOptions = [],
    isLoading: isDepartmentLoading,
    isFetching: isDepartmentFetching,
    refetch: refetchDepartments,
  } = useQuery({
    queryKey: ["approvalMatrixDepartments", "ActiveAll"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupRCMast", {
        params: { PARAMS: "ActiveAll" },
      });
      return getProcedureRows(result)
        .map(mapRCToDepartmentOption)
        .filter((item) => item.value && item.label);
    },
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: approvalRows,
    isLoading: isApprovalLoading,
    isFetching: isApprovalFetching,
    isError: isApprovalError,
    error: approvalError,
    refetch: refetchApprovalRows,
  } = useQuery({
    queryKey: ["approvalMatrixRows", docType],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/allTranApproval", {
        params: { "json_data[docCode]": docType },
      });

      return getProcedureRows(result)
        .filter((item) => normalizeUserCode(item?.userCode || item?.user_code))
        .map((item, index) => ({
          id: index + 1,
          branch: item?.branchCode || item?.branch || "",
          userDepartment: item?.userDepartment || "",
          userCode: item?.userCode || item?.user_code || "",
          userName: item?.userName || "",
          position: item?.position || "",
          appLevel: item?.appLevel || "",
          departments: splitDepartmentCodes(item?.departments || item?.rcCode || item?.rc_code),
        }));
    },
    enabled: Boolean(docType),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!isApprovalError) return;
    useSwalValidationAlert({
      icon: "error",
      title: "Load Failed",
      message:
        approvalError?.response?.data?.message ||
        approvalError?.response?.data?.details ||
        "Unable to load approval matrix records.",
    });
  }, [approvalError, isApprovalError]);

  useEffect(() => {
    if (approvalRows) {
      setRows(approvalRows);
      setDepartmentPicker({ rowId: null, draft: [] });
      setInsertAfterRowId(null);
    }
  }, [approvalRows]);

  const selectedDocTypeLabel = useMemo(
    () => docTypeOptions.find((type) => type.value === docType)?.label || docType,
    [docType, docTypeOptions]
  );

  const departmentOptionsByValue = useMemo(() => {
    const map = new Map();
    rcDepartmentOptions.forEach((department) => {
      map.set(department.value, department);
      map.set(department.label, department);
    });
    return map;
  }, [rcDepartmentOptions]);

  const updateRow = (rowId, updates) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
    );
  };

  const handleAppLevelChange = (rowId, value) => {
    if (value === "") {
      updateRow(rowId, { appLevel: "" });
      return;
    }

    const appLevel = Number(value);
    if (appLevel > 4) {
      useSwalErrorAlert("Invalid Approver's Level", "Approver's Level maximum is 4.");
      updateRow(rowId, { appLevel: 4 });
      return;
    }
    if (appLevel < 1) {
      useSwalErrorAlert("Invalid Approver's Level", "Approver's Level minimum is 1.");
      updateRow(rowId, { appLevel: 1 });
      return;
    }
    updateRow(rowId, { appLevel: value });
  };

  const handleUserSelected = async (selectedUser) => {
    setModals((prev) => ({ ...prev, user: false }));
    if (!selectedUser) {
      setInsertAfterRowId(null);
      return;
    }

    const userCode = normalizeUserCode(selectedUser.userCode);
    const exists = rows.some((row) => normalizeUserCode(row.userCode) === userCode);

    if (exists) {
      useSwalErrorAlert("Duplicate User", `${selectedUser.userCode} is already in the approval matrix.`);
      setInsertAfterRowId(null);
      return;
    }

    setIsLoadingUser(true);
    const userRow = await useTopUserRow(userCode);
    setIsLoadingUser(false);

    if (!userRow) {
      useSwalErrorAlert("User Lookup Failed", `Unable to load details for ${selectedUser.userCode}.`);
      setInsertAfterRowId(null);
      return;
    }

    const nextRow = {
      id: getNextId(rows),
      branch: userRow.branchCode || selectedUser.branch || selectedUser.branchCode || "",
      userDepartment: userRow.rcName || "",
      userCode: userRow.userCode || selectedUser.userCode || "",
      userName: userRow.userName || selectedUser.userName || "",
      position: userRow.position || "",
      appLevel: 0,
      departments: [],
    };

    setRows((prev) => {
      if (!insertAfterRowId) return [...prev, nextRow];
      const insertIndex = prev.findIndex((row) => row.id === insertAfterRowId);
      if (insertIndex < 0) return [...prev, nextRow];
      return [...prev.slice(0, insertIndex + 1), nextRow, ...prev.slice(insertIndex + 1)];
    });

    setInsertAfterRowId(null);
  };

  const handleInsertUser = (rowId = null) => {
    setInsertAfterRowId(rowId);
    setModals((prev) => ({ ...prev, user: true }));
  };

  const removeRow = async (row) => {
    const confirm = await useSwalDeleteConfirm(
      "Confirm Delete",
      `Remove approver ${row.userCode || ""}${row.userName ? ` - ${row.userName}` : ""}?`
    );

    try {
      if (!confirm?.isConfirmed) return;
      setIsDeleting(true);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      if (departmentPicker.rowId === row.id) {
        setDepartmentPicker({ rowId: null, draft: [] });
      }
      useSwalDeleteRecord("Deleted!", "Approver removed from the matrix.");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetRows = () => {
    setRows(approvalRows || []);
    setRegistrationInfo(INITIAL_REG);
    setDepartmentPicker({ rowId: null, draft: [] });
    setInsertAfterRowId(null);
  };

  const openDepartmentPicker = (rowId) => {
    const row = rows.find((item) => item.id === rowId);
    setDepartmentPicker({
      rowId,
      draft: [...(row?.departments || [])],
    });
  };

  const closeDepartmentPicker = () => {
    setDepartmentPicker({ rowId: null, draft: [] });
  };

  const clearDepartments = (rowId) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, departments: [] } : row))
    );
  };

  const validateRows = () => {
    if (!docType) {
      useSwalErrorAlert("Required Fields", "Document Type is required.");
      return false;
    }
    if (!rows.length) {
      useSwalErrorAlert("Required Fields", "At least one approver is required.");
      return false;
    }

    const invalidRows = rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          !row.userCode || !row.userName || !row.appLevel || Number(row.appLevel) < 1 || Number(row.appLevel) > 4
      );

    if (invalidRows.length) {
      const rowNumbers = invalidRows.map(({ index }) => `Row ${index + 1}`).join(", ");
      useSwalErrorAlert("Invalid Approver's Level", `${rowNumbers}: Valid Approver's Level is 1 to 4 only.`);
      return false;
    }

    const existingLevels = [
      ...new Set(rows.map((row) => Number(row.appLevel)).filter((level) => level >= 1 && level <= 4)),
    ].sort((a, b) => a - b);

    const maxLevel = Math.max(...existingLevels);
    const missingLevels = [];
    for (let level = 1; level <= maxLevel; level += 1) {
      if (!existingLevels.includes(level)) {
        missingLevels.push(level);
      }
    }

    if (missingLevels.length) {
      useSwalErrorAlert(
        "Invalid Approver's Level Sequence",
        `Approver's Levels must be sequential.\nMissing Level ${missingLevels.join(", ")}.\nYou cannot save Level 4 without Level 3.\nYou cannot save Level 3 without Level 2.`
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateRows()) return;

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const userCode = user?.USER_CODE || user?.userCode || "ADMIN";
    const payloadRows = rows.map((row) => ({
      userCode: normalizeUserCode(row.userCode),
      appLevel: Number(row.appLevel),
      rcCode: (row.departments || []).map(normalizeDepartmentValue).filter(Boolean).join(","),
    }));

    try {
      setIsSaving(true);
      const payload = {
        json_data: {
          docCode: docType,
          userCode,
          dt1: payloadRows,
        },
      };

      await apiClient.post("/upsertAllTranApproval", payload);
      await refetchApprovalRows();

      setRegistrationInfo((prev) => ({
        registeredBy: prev.registeredBy || userCode,
        registeredDate: prev.registeredDate || now,
        lastUpdatedBy: userCode,
        lastUpdatedDate: now,
      }));

      useSwalSuccessAlert("Success!", `${selectedDocTypeLabel} approval matrix saved successfully.`);
    } catch (error) {
      useSwalValidationAlert({
        icon: "error",
        title: "Save Failed",
        message:
          error?.response?.data?.message ||
          error?.response?.data?.details ||
          "Unable to save approval matrix.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    setIsFetching(true);
    setDepartmentPicker({ rowId: null, draft: [] });
    Promise.all([refetchDepartments(), refetchApprovalRows()]).finally(() => setIsFetching(false));
  };

  // Derive master spinner state
  const showSpinner =
    !refsLoaded ||
    isDropdownLoading || // <-- New Dropdown loading state included here
    isDepartmentLoading ||
    isDepartmentFetching ||
    isApprovalLoading ||
    isApprovalFetching ||
    isFetching ||
    isSaving ||
    isDeleting ||
    isLoadingUser;

  // Reactively send the current state back to the parent (WareMast)
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ 
        isEditing: Boolean(docType), // Allows saving as long as a Doc Type is selected
        isSaving: showSpinner 
      });
    }
  }, [docType, showSpinner, onStateChange]);

  // Expose methods to the parent wrapper using forwardRef
  useImperativeHandle(ref, () => ({
    handleAdd: () => handleInsertUser(null),
    handleSave,
    handleReset: resetRows,
    isEditing: Boolean(docType),
    isSaving: showSpinner,
  }));

  const renderDepartmentDisplay = (departments = []) => {
    if (!departments.length) {
      return <span className="text-[10px] text-slate-400 whitespace-nowrap">Select Department</span>;
    }

    const displayDepartments = departments.map(
      (department) => departmentOptionsByValue.get(department)?.label || department
    );
    const display = buildDepartmentDisplay(displayDepartments);

    if (display.mode === "normal") {
      return (
        <div className="flex flex-nowrap gap-1 overflow-hidden">
          {display.label.map((department) => (
            <span
              key={department}
              className="max-w-[110px] truncate rounded-md bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700 whitespace-nowrap"
            >
              {department}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
        {display.visible.map((department) => (
          <span
            key={department}
            className="max-w-[100px] truncate rounded-md bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700 whitespace-nowrap"
          >
            {department}
          </span>
        ))}
        <span className="text-[10px] font-semibold text-blue-600 whitespace-nowrap shrink-0">
          +{display.more} More
        </span>
        <div className="group relative">
          <Info size={14} className="cursor-pointer text-slate-400" />
          <div className="invisible absolute left-5 top-0 z-50 w-52 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
            <div className="mb-2 text-[12px] font-bold text-blue-600">More Departments</div>
            <ul className="space-y-1 text-[12px] text-slate-700">
              {display.hidden.map((department) => (
                <li key={department}>{department}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const tableRows = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((row, index) => ({
      ...row,
      lineNo: index + 1,
      departmentsText:
        row.departments
          ?.map((department) => departmentOptionsByValue.get(department)?.label || department)
          .join(", ") || "",
    }));
  }, [departmentOptionsByValue, rows]);

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 95,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full justify-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleInsertUser(row.__insertRow ? null : row.id);
              }}
              className="global-ref-td-button-edit-ui"
              title="Insert User"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            {!row.__insertRow && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeRow(row);
                }}
                className="global-ref-td-button-delete-ui"
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </button>
            )}
          </div>
        ),
      },
      {
        key: "lineNo",
        label: "#",
        width: 60,
        sortable: false,
        render: (row) => row.lineNo,
      },
      {
        key: "branch",
        label: "Branch",
        width: 110,
        render: (row) =>
          row.__insertRow ? "" : (
            <span className="block w-full truncate text-[11px] text-slate-700">{row.branch}</span>
          ),
      },
      {
        key: "userDepartment",
        label: "Department",
        width: 170,
        render: (row) =>
          row.__insertRow ? "" : (
            <span className="block w-full truncate text-[11px] text-slate-700">{row.userDepartment}</span>
          ),
      },
      {
        key: "userCode",
        label: "User Code",
        width: 130,
        requiredVisible: true,
        render: (row) => <span className="font-bold text-slate-800">{row.userCode}</span>,
      },
      {
        key: "userName",
        label: "User Name",
        width: 220,
        render: (row) =>
          row.__insertRow ? (
            <span className="text-[11px] italic text-slate-400">Use the action button to insert a user</span>
          ) : (
            row.userName
          ),
      },
      {
        key: "position",
        label: "Position",
        width: 180,
        render: (row) =>
          row.__insertRow ? "" : (
            <span className="block w-full truncate text-[11px] text-slate-700">{row.position || ""}</span>
          ),
      },
      {
        key: "appLevel",
        label: "Approver's Level",
        width: 120,
        render: (row) =>
          row.__insertRow ? "" : (
            <input
              type="number"
              min="1"
              max="4"
              value={row.appLevel}
              onChange={(event) => handleAppLevelChange(row.id, event.target.value)}
              className="h-7 w-full bg-transparent px-2 text-[11px] outline-none border border-slate-200 rounded"
            />
          ),
      },
      {
        key: "departmentsText",
        label: "Department Assign",
        width: 300,
        requiredVisible: true,
        autoWidthValue: (row) => row.departments?.join(", ") || "",
        render: (row) =>
          row.__insertRow ? "" : (
            <div className="relative flex min-h-8 w-full max-w-full items-center overflow-hidden bg-transparent py-1 pr-14 text-left">
              <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                {renderDepartmentDisplay(row.departments)}
              </div>
              {!!row.departments?.length && (
                <FontAwesomeIcon
                  icon={faTimes}
                  className="absolute right-8 text-slate-400 text-sm cursor-pointer hover:text-red-600"
                  title="Clear Department"
                  onClick={(event) => {
                    event.stopPropagation();
                    clearDepartments(row.id);
                  }}
                />
              )}
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                title="Select Department"
                onClick={(event) => {
                  event.stopPropagation();
                  openDepartmentPicker(row.id);
                }}
              />
            </div>
          ),
      },
    ],
    [departmentOptionsByValue, departmentPicker.rowId, rows]
  );

  const selectedDepartmentRow = rows.find((row) => row.id === departmentPicker.rowId);

  return (
    <div className="flex flex-col w-full h-auto gap-4">
      {showSpinner && <LoadingSpinner />}

      <UsersLookupModal isOpen={modals.user} onClose={handleUserSelected} />

      <SearchMRCmast
        isOpen={Boolean(departmentPicker.rowId)}
        selectedDepartments={departmentPicker.draft}
        title={`Assign Department(s) to ${selectedDepartmentRow?.userName || "Approver"}`}
        onClose={(selected) => {
          if (selected) {
            setRows((prev) =>
              prev.map((row) =>
                row.id === departmentPicker.rowId ? { ...row, departments: selected } : row
              )
            );
          }
          closeDepartmentPicker();
        }}
      />

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
        {/* Document Setup Panel */}
        <div className="flex-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Document Setup
          </h3>
          <div className="max-w-[420px]">
            <FieldRenderer
              label="Document Type"
              required
              type="select"
              value={docType}
              options={docTypeOptions}
              onChange={setDocType}
            />
          </div>
        </div>

        {/* Registration Info Panel */}
        <div className="w-full lg:w-[400px]">
          <RegistrationInfo layout="stacked" data={registrationInfo} />
        </div>
      </div>

      {/* Global Reference Table */}
      <div className="global-tran-table-main-div-ui flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <SearchGlobalReferenceTable
          docType="ApprovalMatrixModal"
          columns={columns}
          data={tableRows}
          itemsPerPage={200}
          showGroupBy={true}
          autoFillGrid={false}
          autoFit={true}
          isFetching={isFetching || isApprovalFetching}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
});

export default WhParameter;