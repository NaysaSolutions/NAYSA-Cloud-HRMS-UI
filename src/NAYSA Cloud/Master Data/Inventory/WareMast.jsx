import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Undo2 } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import {
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faPlus,
  faSave as faSaveIcon,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalErrorAlertAPI,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

// --- PROCEDURES FOR FIELD LENGTHS ---
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

// 1. IMPORT YOUR EXTERNAL TAB COMPONENTS
import Location from "./Location.jsx";
import WhParameter from "./WhParameter.jsx"; // <-- NEW IMPORT

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
  whCode: "",
  whName: "",
  branchCode: "",
  branchName: "",
  address1: "",
  address2: "",
  invType: "",
  active: "Y",
  __existing: false,
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const toYN = (value, def = "N") => {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["Y", "YES", "TRUE", "1"].includes(normalized)) return "Y";
  if (["N", "NO", "FALSE", "0"].includes(normalized)) return "N";
  return def;
};

const WareMast = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const docType = "WareMast";
  const documentTitle = reftables?.[docType] || "Warehouse";

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[docType] || "#";
  const videoLink = reftablesVideoGuide?.[docType] || "#";

  // 2. SETUP REFS FOR EXTERNAL COMPONENTS & TAB STATE
  const locationRef = useRef(null);
  const parameterRef = useRef(null); // <-- NEW REF
  const [activeTab, setActiveTab] = useState("warehouse");

  // ADDED: State to track child components to trigger re-renders for buttons
  const [childStates, setChildStates] = useState({
    location: { isEditing: false, isSaving: false },
    parameter: { isEditing: false, isSaving: false },
  });

  // --- YOUR EXACT UNTOUCHED STATE ---
  const [form, setForm] = useState(DEFAULT_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isBranchModalOpen, setBranchModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] =
    useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);
  const [mobileHandlers, setMobileHandlers] = useState({});
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const resetForm = (next = DEFAULT_FORM) => setForm(next);

  // load max length metadata
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await useFieldLenghtCheck("WAREHOUSE");
      if (mounted) setTblFieldArray(res || []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  const { data: dropdowns } = useQuery({
    queryKey: ["wareMastDropdowns"],
    queryFn: async () => {
      const [invTypes] = await Promise.all([
        useTopDocDropDown("INVTYPE", "INV_TYPE"),
      ]);
      return { invTypes };
    },
  });

  useEffect(() => {
    document.title = documentTitle;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [documentTitle]);

  // Click outside guide listener
  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target))
        setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // --- YOUR EXACT UNTOUCHED QUERIES ---
  const warehouseListQuery = useQuery({
    queryKey: ["wareMastList"],
    queryFn: async () => {
      const result = await apiClient.get("warehouse/warehouse", {
        params: { filter: "ActiveAll" },
      });
      return extractRows(result);
    },
  });

  const branchLookupQuery = useQuery({
    queryKey: ["branchLookup"],
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupBranch", {
        params: {
          PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 5000 }),
        },
      });
      const rawData = result?.data?.[0]?.result || result?.data || "[]";
      const branches = Array.isArray(rawData) ? rawData : JSON.parse(rawData);
      return branches.map((item) => ({
        branchCode: item.branchCode ?? item.BRANCH_CODE ?? "",
        branchName: item.branchName ?? item.BRANCH_NAME ?? "",
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const branchMap = useMemo(
    () =>
      Object.fromEntries(
        (branchLookupQuery.data || []).map((item) => [
          String(item.branchCode || "").trim(),
          item.branchName || "",
        ]),
      ),
    [branchLookupQuery.data],
  );

  const warehouses = useMemo(() => {
    const allRows = (warehouseListQuery.data || []).map((row) => {
      const bCode = row.branchCode ?? row.BRANCH_CODE ?? "";
      return {
        ...row,
        branchCode: bCode,
        branchName:
          row.branchName ??
          row.BRANCH_NAME ??
          branchMap[String(bCode).trim()] ??
          "",
        whCode: row.whCode ?? row.WHOUSE_CODE ?? "",
        whName: row.whName ?? row.WHOUSE_NAME ?? "",
        address1: row.address1 ?? row.ADDRESS1 ?? "",
        address2: row.address2 ?? row.ADDRESS2 ?? "",
        invType: row.invType ?? row.INV_TYPE ?? "",
        active: row.active ?? row.ACTIVE ?? "Y",
        registeredBy: row.registeredBy ?? row.REGISTERED_BY ?? "",
        registeredDate: row.registeredDate ?? row.REGISTERED_DATE ?? "",
        lastUpdatedBy: row.lastUpdatedBy ?? row.LAST_UPDATED_BY ?? "",
        lastUpdatedDate: row.lastUpdatedDate ?? row.LAST_UPDATED_DATE ?? "",
      };
    });

    if (form.branchCode) {
      return allRows.filter(
        (wh) => String(wh.branchCode).trim() === String(form.branchCode).trim(),
      );
    }
    return allRows;
  }, [warehouseListQuery.data, branchMap, form.branchCode]);

  // --- YOUR EXACT UNTOUCHED MUTATIONS ---
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const requestBody = { json_data: JSON.stringify({ json_data: payload }) };
      return apiClient.post("warehouse/upsertWarehouse", requestBody);
    },
    onSuccess: async (response) => {
      const sqlRow = response?.data?.data?.[0] || {};
      if (Number(sqlRow.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Save Failed",
          sqlRow.errormsg || "Unable to save record.",
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["wareMastList"] });
      useSwalSuccessAlert("Success", "Warehouse saved successfully.");
      handleReset();
    },
    onError: (error) => useSwalErrorAlert("Error", error?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (whCode) =>
      apiClient.post("warehouse/deleteWarehouse", {
        json_data: { whCode },
      }),
    onSuccess: async (response) => {
      const sqlRow = response?.data?.data?.[0] || {};
      if (Number(sqlRow.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Delete Failed",
          sqlRow.errormsg || "Unable to delete record.",
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["wareMastList"] });
      useSwalSuccessAlert("Deleted", "Warehouse record removed successfully.");
      handleReset();
    },
    onError: (error) =>
      useSwalErrorAlert("Error", error?.message || "Failed to delete."),
  });

  // --- YOUR EXACT UNTOUCHED HANDLERS ---
  const handleSave = () => {
    if (!isEditing || saveMutation.isPending) return;
    const whCode = String(form.whCode || "").trim();
    const whName = String(form.whName || "").trim();
    if (!whCode || !whName) {
      return useSwalErrorAlert(
        "Validation Error",
        "Warehouse Code and Name are required.",
      );
    }
    const payload = {
      ...form,
      WHOUSE_CODE: whCode,
      WHOUSE_NAME: whName,
      action: form.__existing ? "EDIT" : "ADD",
      active: toYN(form.active, "Y"),
      userCode: user?.USER_CODE || user?.userCode || "ADMIN",
    };
    saveMutation.mutate(payload);
  };

  const handleEdit = (row) => {
    setForm({ ...row, __existing: true });
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.updatedBy || row.lastUpdatedBy || "",
      lastUpdatedDate: row.updatedDate || row.lastUpdatedDate || "",
    });
    setSelectedRow(row);
    setIsEditing(true);
    if (isMobile) closeMobileActionSheet();
  };

  const handleDelete = async (row) => {
    const whCode = row.whCode || "";
    try {
      const checkResponse = await apiClient.post("warehouse/checkInUsedWH", {
        json_data: { whCode },
      });
      const sqlRow = checkResponse?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');
      if (String(parsedData.result) === "1") {
        return useSwalErrorAlert(
          "Cannot Delete",
          `Warehouse Code ${whCode} is currently in use and cannot be deleted.`,
        );
      }
    } catch (error) {
      console.error("In-use check failed", error);
    }
    const confirm = await useSwalDeleteConfirm(
      "Confirm Delete",
      `Are you sure you want to delete warehouse ${whCode}?`,
    );
    if (confirm?.isConfirmed) {
      deleteMutation.mutate(whCode);
    }
  };

  const handleCheckDuplicate = async (code) => {
    if (form.__existing || !code) return;
    try {
      const payload = { json_data: { whCode: code } };
      const response = await apiClient.post(
        "warehouse/checkDuplicateWH",
        payload,
      );
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');
      if (parsedData.result === "1") {
        setField("whCode", "");
        return useSwalErrorAlert(
          "Duplicate Code",
          `Warehouse Code ${code} is already in use.`,
        );
      }
    } catch (error) {
      console.error("Duplicate check failed", error);
    }
  };

  const handleReset = () => {
    resetForm(DEFAULT_FORM);
    setRegistrationInfo(INITIAL_REG);
    setIsEditing(false);
    setSelectedRow(null);
  };

  // 3. GLOBAL BUTTON ROUTERS (Traffic Cops)
  const handleGlobalAdd = () => {
    if (activeTab === "warehouse") {
      handleReset();
      setIsEditing(true);
    } else if (activeTab === "location" && locationRef.current) {
      locationRef.current.handleAdd();
    } else if (activeTab === "parameter" && parameterRef.current) {
      parameterRef.current.handleAdd();
    }
  };

  const handleGlobalSave = () => {
    if (activeTab === "warehouse") handleSave();
    else if (activeTab === "location" && locationRef.current)
      locationRef.current.handleSave();
    else if (activeTab === "parameter" && parameterRef.current)
      parameterRef.current.handleSave();
  };

  const handleGlobalReset = () => {
    if (activeTab === "warehouse") handleReset();
    else if (activeTab === "location" && locationRef.current)
      locationRef.current.handleReset();
    else if (activeTab === "parameter" && parameterRef.current)
      parameterRef.current.handleReset();
  };

  // UPDATED: Determine button states dynamically using the child state object
  const isCurrentlyEditing =
    activeTab === "warehouse"
      ? isEditing
      : activeTab === "location"
        ? childStates.location.isEditing
        : activeTab === "parameter"
          ? childStates.parameter.isEditing
          : false;

  const isCurrentlySaving =
    activeTab === "warehouse"
      ? saveMutation.isPending
      : activeTab === "location"
        ? childStates.location.isSaving
        : activeTab === "parameter"
          ? childStates.parameter.isSaving
          : false;

  // Modified Mobile Action Sheet to handle all tabs dynamically
  const openMobileActionSheet = (
    row,
    editFn = handleEdit,
    deleteFn = handleDelete,
  ) => {
    setSelectedMobileRow(row);
    setMobileHandlers({ edit: editFn, delete: deleteFn });
    setIsMobileActionSheetMounted(true);
    requestAnimationFrame(() => setIsMobileActionSheetOpen(true));
  };

  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);
    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 120,
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row, handleEdit, handleDelete);
                } else {
                  handleEdit(row);
                }
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors text-xs"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row, handleEdit, handleDelete);
                } else {
                  handleDelete(row);
                }
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
      {
        key: "branchCode",
        label: "Branch Code",
        sortable: true,
        render: (row) =>
          row.branchCode ? `${row.branchCode} - ${row.branchName || ""}` : "",
        width: 120,
      },
      { key: "whCode", label: "Warehouse Code", sortable: true, width: 100 },
      {
        key: "whName",
        label: "Warehouse Name",
        sortable: true,
        width: 250,
        maxWidth: 250,
      },
      {
        key: "invType",
        label: "Inventory Type",
        render: (row) =>
          dropdowns?.invTypes?.find((d) => d.DROPDOWN_CODE === row.invType)
            ?.DROPDOWN_NAME || row.invType,
      },
      { key: "address1", label: "Address 1", sortable: true, width: 350 },
      {
        key: "active",
        label: "Active",
        width: 80,
        render: (row) => (row.active === "Y" ? "Yes" : "No"),
      },
    ],
    [isMobile, dropdowns],
  );

  return (
    <div className="global-ref-main-div-ui">
      {(warehouseListQuery.isLoading ||
        saveMutation.isPending ||
        deleteMutation.isPending) && <LoadingSpinner />}

      {/* 4. TABBED HEADER */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {activeTab === "warehouse" && "Warehouse"}
              {activeTab === "location" && "Location"}
              {activeTab === "parameter" && "Reference Codes"}
            </h1>
          </div>

          <div className="w-full md:justify-center flex">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                {[
                  { id: "warehouse", label: "Warehouse" },
                  { id: "location", label: "Location" },
                  // TEMPORARILY HIDDEN: Uncomment this entry to restore the Reference Codes tab.
                  // { id: "parameter", label: "Reference Codes" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      handleReset();
                    }}
                    className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
                      activeTab === tab.id
                        ? "border-blue-700 text-blue-700 bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: handleGlobalAdd,
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: <span className="sm:inline ml-1">Save</span>,
                      icon: faSaveIcon,
                      onClick: handleGlobalSave,
                      disabled: !isCurrentlyEditing || isCurrentlySaving,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${!isCurrentlyEditing || isCurrentlySaving ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
                    },
                    {
                      key: "reset",
                      label: <span className="sm:inline ml-1">Reset</span>,
                      icon: faUndo,
                      onClick: handleGlobalReset,
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                  ]}
                />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-16 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
                  <span className="sm:inline ml-1 text-[11px] font-medium">
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
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />{" "}
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
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

      <div
        className="mt-40 sm:mt-24"
        style={{ minHeight: "calc(100vh - 170px)" }}
      >
        {/* 5. WAREHOUSE FORM */}
        {activeTab === "warehouse" && (
          <>
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
              <div className="flex-1 rounded-xl border bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-6">
                    <FieldRenderer
                      label="Branch Code"
                      type="lookup"
                      value={
                        form.branchCode
                          ? `${form.branchCode} - ${form.branchName || ""}`
                          : ""
                      }
                      onLookup={() => setBranchModalOpen(true)}
                      disabled={false}
                      required
                    />
                    <FieldRenderer
                      label="Warehouse Code"
                      value={form.whCode}
                      onChange={(val) =>
                        setField("whCode", String(val).toUpperCase())
                      }
                      onBlur={(e) => handleCheckDuplicate(e.target.value)}
                      disabled={!isEditing || form.__existing}
                      required
                      maxLength={getMax("WHOUSE_CODE")}
                    />
                    <FieldRenderer
                      label="Warehouse Name"
                      value={form.whName}
                      onChange={(val) => setField("whName", val)}
                      disabled={!isEditing}
                      required
                      maxLength={getMax("WHOUSE_NAME")}
                    />

                    <FieldRenderer
                      label="Inventory Type"
                      type="select"
                      value={form.invType}
                      disabled={!isEditing}
                      options={dropdowns?.invTypes?.map((d) => ({
                        value: d.DROPDOWN_CODE,
                        label: d.DROPDOWN_NAME,
                      }))}
                      onChange={(v) => setField("invType", v)}
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="hidden md:block h-[33px]"></div>
                    <FieldRenderer
                      label="Address 1"
                      value={form.address1}
                      onChange={(val) => setField("address1", val)}
                      disabled={!isEditing}
                      maxLength={getMax("ADDRESS1")}
                    />

                    <FieldRenderer
                      label="Address 2"
                      value={form.address2}
                      onChange={(val) => setField("address2", val)}
                      disabled={!isEditing}
                      maxLength={getMax("ADDRESS2")}
                    />
                    <FieldRenderer
                      label="Active"
                      type="select"
                      value={form.active}
                      onChange={(val) => setField("active", val)}
                      options={[
                        { value: "Y", label: "Yes" },
                        { value: "N", label: "No" },
                      ]}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[320px]">
                <RegistrationInfo layout="stacked" data={registrationInfo} />
              </div>
            </div>

            <div className="global-tran-table-main-div-ui relative mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType="Warehouse Master"
                columns={columns}
                data={warehouses}
                itemsPerPage={200}
                showFilters
                onRowDoubleClick={handleEdit}
                selectedRow={selectedRow}
                onRowClick={(row) => setSelectedRow(row)}
                isLoading={warehouseListQuery.isLoading}
                onRefresh={() => warehouseListQuery.refetch()}
                onMobileRowOpen={(row) =>
                  openMobileActionSheet(row, handleEdit, handleDelete)
                }
              />
            </div>
          </>
        )}

        {/* 6. LOCATION TAB */}
        {/* ADDED: onStateChange prop to receive state updates from the Location component */}
        {activeTab === "location" && (
          <Location
            ref={locationRef}
            isMobile={isMobile}
            onMobileActionOpen={openMobileActionSheet}
            onStateChange={(state) =>
              setChildStates((prev) => ({ ...prev, location: state }))
            }
          />
        )}

        {/* 7. PARAMETER TAB */}
        {/* ADDED: onStateChange prop to prepare WhParameter to do the same thing */}
        {activeTab === "parameter" && (
          <WhParameter
            ref={parameterRef}
            isMobile={isMobile}
            onMobileActionOpen={openMobileActionSheet}
            onStateChange={(state) =>
              setChildStates((prev) => ({ ...prev, parameter: state }))
            }
          />
        )}
      </div>

      <SearchBranchRef
        isOpen={isBranchModalOpen}
        onClose={(row) => {
          if (row) {
            setField("branchCode", row.branchCode || row.BRANCH_CODE || "");
            setField("branchName", row.branchName || row.BRANCH_NAME || "");
          }
          setBranchModalOpen(false);
        }}
      />

      {/* Dynamic Mobile Action Sheet */}
      {isMobileActionSheetMounted && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              isMobileActionSheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileActionSheet}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 transform transition-transform duration-300 ease-out ${
              isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.whCode} -{" "}
                {selectedMobileRow?.whName || selectedMobileRow?.locName}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => mobileHandlers.edit(selectedMobileRow)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  mobileHandlers.delete(selectedMobileRow);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <FontAwesomeIcon icon={faTrashAlt} /> Delete
              </button>
              <button
                onClick={closeMobileActionSheet}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WareMast;
