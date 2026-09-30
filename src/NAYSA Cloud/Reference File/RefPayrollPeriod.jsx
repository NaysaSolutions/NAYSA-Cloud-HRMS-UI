import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RefPayrollPeriod.css";
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
  faFilter,
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

const DOC_TYPE = "RefCutoff";

const getOptionLabel = (options, value) => {
  const text = String(value ?? "").trim();
  return options.find((option) => option.value.toUpperCase() === text.toUpperCase())?.label ?? text;
};

const getFrequencyGroup = (value) => {
  const frequency = String(value ?? "").trim().toUpperCase();
  if (frequency === "S" || /^S(?:[1-4]|2\/3)$/.test(frequency) || frequency.startsWith("SEMI-MONTHLY")) return "Semi-Monthly";
  if (frequency === "W" || /^W(?:[1-7]|2&4|4\/5)$/.test(frequency) || frequency.startsWith("WEEK")) return "Weekly";
  if (frequency === "M" || frequency === "MONTHLY") return "Monthly";
  return "";
};

const getCutoffStatus = (value) => {
  const status = String(value ?? "").trim().toUpperCase();
  if (["O", "OPEN", "ACTIVE"].includes(status)) return "Open";
  if (["C", "CLOSE", "CLOSED", "INACTIVE"].includes(status)) return "Closed";
  return String(value ?? "").trim();
};

const INITIAL_FORM = {
  code: "",
  description: "",
  cutoffType: "",
  year: new Date().getFullYear().toString(),
  cutoffGrp: "",
  cutoffFreq: "",
  cutoffStartDate: "",
  cutoffEndDate: "",
  cutoffDate: "",
  cutoffMonthCode: "",
  cutoffMonthName: "",
  status: "ACTIVE",
  type: "",
  taxTable: "",
  regHrs: 0,
  regDays: 0,
  holDays: 0,
  month: "",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

// Helper to format datetime strings to YYYY-MM-DD for HTML date inputs
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const RefPayrollPeriod = ({ headerTabs, pageTitle, active = true }) => {
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

  // --- FILTER STATES ---
  const currentYear = new Date().getFullYear().toString();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterFreq, setFilterFreq] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const {
    data: frequencyOptions = [],
    isFetching: isLoadingEntryFrequency,
    isError: isEntryFrequencyError,
  } = useQuery({
    queryKey: ["hsDropdown", "FREQ", filterFreq],
    enabled: Boolean(filterFreq),
    queryFn: async () => {
      const { data } = await apiClient.post("/getHSDropdown", {
        json_data: { docCode: filterFreq, dropdownColumn: "FREQ" },
      });
      const raw = data?.data?.[0]?.result ?? data?.[0]?.result ?? data?.result ?? [];
      const rows = Array.isArray(raw) ? raw : JSON.parse(raw);
      return rows.map((row) => ({
        value: String(row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? row.value ?? "").trim(),
        label: String(row.DROPDOWN_NAME ?? row.dropdownName ?? row.description ?? row.label ?? "").trim(),
      })).filter((option) => option.value);
    },
  });

  const {
    data: taxTableOptions = [],
    isFetching: isLoadingTaxTables,
  } = useQuery({
    queryKey: ["hsDropdown", "TAXTBL", "TAXTBL"],
    queryFn: async () => {
      const { data } = await apiClient.post("/getHSDropdown", {
        json_data: { docCode: "TAXTBL", dropdownColumn: "TAXTBL" },
      });
      const raw = data?.data?.[0]?.result ?? data?.[0]?.result ?? data?.result ?? [];
      const rows = Array.isArray(raw) ? raw : JSON.parse(raw);
      return rows.map((row) => ({
        value: String(row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? row.value ?? "").trim(),
        label: String(row.DROPDOWN_NAME ?? row.dropdownName ?? row.description ?? row.label ?? "").trim(),
      })).filter((option) => option.value);
    },
  });

  const {
    data: payrollTypeOptions = [],
    isFetching: isLoadingPayrollTypes,
  } = useQuery({
    queryKey: ["hsDropdown", "CYCLETYPE", "CYCLETYPE"],
    queryFn: async () => {
      const { data } = await apiClient.post("/getHSDropdown", {
        json_data: { docCode: "CYCLETYPE", dropdownColumn: "CYCLETYPE" },
      });
      const raw = data?.data?.[0]?.result ?? data?.[0]?.result ?? data?.result ?? [];
      const rows = Array.isArray(raw) ? raw : JSON.parse(raw);
      return rows.map((row) => ({
        value: String(row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? row.value ?? "").trim(),
        label: String(row.DROPDOWN_NAME ?? row.dropdownName ?? row.description ?? row.label ?? "").trim(),
      })).filter((option) => option.value);
    },
  });

  const handleFrequencyFilter = (frequency) => {
    setFilterFreq(frequency);
    setFormData((previous) => ({
      ...previous,
      cutoffFreq: !frequency || getFrequencyGroup(previous.cutoffFreq) === getFrequencyGroup(frequency)
        ? previous.cutoffFreq
        : "",
    }));
  };

  const isAdding = isEditing && !selectedCode;

  const updateForm = (updates) => setFormData((p) => ({ ...p, ...updates }));

  const getActiveLabel = getCutoffStatus;

  // --- TANSTACK QUERY: LIST ---
  const { data: records = [], isLoading: isListLoading } = useQuery({
    queryKey: ["refCutoffList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/cutOff");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      const rows = Array.isArray(raw) ? raw : raw ? JSON.parse(raw) : [];
      return rows.map((row) => ({
        ...row,
        description: row.description ?? row.name ?? "",
      }));
    },
  });

// --- TANSTACK QUERY: FETCH FREQUENCY DROPDOWN ---
  const { data: filterFreqOptions = [], isLoading: isLoadingFreqOptions } = useQuery({
    queryKey: ["hsDropdown", "PAYFREQ"],
    queryFn: async () => {
      // Load the configured payroll frequency groups.
      const payload = {
        json_data: { 
          docCode: "PAYFREQ", 
          dropdownColumn: "PAYFREQ" 
        }
      };
      const { data } = await apiClient.post("/getHSDropdown", payload);
      
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      const rows = Array.isArray(raw) ? raw : raw ? JSON.parse(raw) : [];
      
      // Based on your image structure (e.g., S -> Semi-Monthly)
      return rows.map((row) => ({
        // Adjust "code" and "description" to match the actual column names returned by your SQL query
        value: row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? row.value ?? "", 
        label: row.DROPDOWN_NAME ?? row.dropdownName ?? row.description ?? row.label ?? ""
      }));
    },
  });





  useEffect(() => {
    if (!filterFreq && filterFreqOptions.length > 0) {
      setFilterFreq(String(filterFreqOptions[0].value));
    }
  }, [filterFreq, filterFreqOptions]);

  // --- DERIVED STATE: FILTERED RECORDS ---
  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const matchYear = !filterYear || String(row.year ?? "").trim() === String(filterYear).trim();
      const matchFreq = !filterFreq || frequencyOptions.some(
        (option) => option.value.toUpperCase() === String(row.cutoffFreq ?? "").trim().toUpperCase(),
      );
      const matchStatus = !filterStatus || getCutoffStatus(row.status) === filterStatus;

      return matchYear && matchFreq && matchStatus;
    });
  }, [records, filterYear, filterFreq, filterStatus, frequencyOptions]);

  // --- MUTATION: UPSERT ---
  const { mutate: saveRecord, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/upsertCutOff", payload),

    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Unable to save", sqlRow?.errormsg || "Failed to save Cutoff.");
        return;
      }

      const status = response?.data?.status ?? response?.data?.data?.status;
      const success = response?.data?.success || status === "success" || !status;

      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message || response?.data?.data?.message || "Failed to save Cutoff."
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["refCutoffList"] });
      useSwalSuccessAlert("Success!", "Payroll Period/Cutoff saved successfully!");
      resetForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
    },
  });

  // --- MUTATION: DELETE ---
  const { mutate: deleteRecord, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteCutOff", payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["refCutoffList"]);
      useSwalDeleteRecord("Deleted!", "The Cutoff has been removed from the system.");
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
      cutoffType: row.cutoffType ?? "",
      year: row.year ?? "",
      cutoffGrp: row.cutoffGrp ?? "",
      cutoffFreq: row.cutoffFreq ?? "",
      cutoffStartDate: formatDateForInput(row.cutoffStartDate),
      cutoffEndDate: formatDateForInput(row.cutoffEndDate),
      cutoffDate: formatDateForInput(row.cutoffDate),
      cutoffMonthCode: row.cutoffMonthCode ?? "",
      cutoffMonthName: row.cutoffMonthName ?? "",
      status: row.status ?? "ACTIVE",
      type: row.type ?? "",
      taxTable: row.taxTable ?? "",
      regHrs: row.regHrs ?? 0,
      regDays: row.regDays ?? 0,
      holDays: row.holDays ?? 0,
      month: row.month ?? "",
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
    const missingFields = [
      [formData.year, "Cut-Off Year"],
      [formData.cutoffGrp, "Cut-Off Group"],
    ].filter(([value]) => !String(value ?? "").trim()).map(([, label]) => label);
    if (missingFields.length > 0) {
      useSwalErrorAlert("Required Fields", `Please fill in: ${missingFields.join(", ")}.`);
      return;
    }
    if (isLoadingEntryFrequency || isEntryFrequencyError || !frequencyOptions.some((option) => option.value === formData.cutoffFreq)) {
      useSwalErrorAlert("Select Frequency", `Please select a ${getFrequencyGroup(filterFreq)} frequency before saving.`);
      return;
    }
    
    const payload = {
      json_data: {
        code: formData.code,
        description: formData.description,
        cutoffType: formData.cutoffType,
        year: formData.year,
        cutoffGrp: formData.cutoffGrp,
        cutoffFreq: formData.cutoffFreq,
        cutoffStartDate: formData.cutoffStartDate || null,
        cutoffEndDate: formData.cutoffEndDate || null,
        cutoffDate: formData.cutoffDate || null,
        cutoffMonthCode: formData.cutoffMonthCode,
        cutoffMonthName: formData.cutoffMonthName,
        status: formData.status || "ACTIVE",
        type: formData.type,
        taxTable: formData.taxTable,
        
        // Ensure numeric fields are ALWAYS sent as valid numbers to prevent SQL conversion errors
        regHrs: Number(formData.regHrs) || 0,
        regDays: Number(formData.regDays) || 0,
        holDays: Number(formData.holDays) || 0,
        
        month: formData.month,
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

      const response = await apiClient.post("/checkInUsedCutOff", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        setIsLoading(false);
        return useSwalErrorAlertAPI(`Cannot Delete Code: ${row.code}`, `Code was already used.`);
      }

      const confirm = await useSwalDeleteConfirm("Confirm Delete", `Are you sure you want to delete Cutoff Code: ${row.code}?`);
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
      const response = await apiClient.post("/checkDuplicateCutOff", payload);

      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        resetForm();
        return useSwalErrorAlertAPI(`Duplicate Code: ${codeValue}`, `Code was already used.`);
      }
    } catch (error) {
      console.error("Duplicate Check Error:", error);
    }
  };

  const handleApplyFilter = () => {
    queryClient.invalidateQueries({ queryKey: ["refCutoffList"] });
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (active && e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (isEditing) handleSave();
      }
    };
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) setOpenGuide(false);
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [active, isEditing, formData, records]);

  // --- MAIN TABLE COLUMNS ---
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
        key: "year",
        label: "Year",
        sortable: true,
        width: 90,
      },
      {
        key: "cutoffGrp",
        label: "Cut-Off Grp",
        sortable: true,
        width: 120,
      },
      {
        key: "code",
        label: "Cut-Off Code",
        sortable: true,
        width: 120,
        minWidth: 100,
        render: (row) => <span className="font-mono text-[12px] font-semibold text-gray-700 dark:text-gray-200">{row.code}</span>,
      },
      {
        key: "description",
        label: "Cut-Off Name",
        sortable: true,
        width: 250,
        minWidth: 150,
      },
      {
        key: "cutoffDate",
        label: "Cut-Off Date",
        sortable: true,
        width: 120,
        render: (row) => formatDateForInput(row.cutoffDate),
      },
      {
        key: "cutoffMonthName",
        label: "Cut-Off Month",
        sortable: true,
        width: 150,
      },
      {
        key: "cutoffFreq",
        label: "Freq",
        sortable: true,
        width: 160,
        render: (row) => getOptionLabel(frequencyOptions, row.cutoffFreq),
        groupDisplayValue: (row) => getOptionLabel(frequencyOptions, row.cutoffFreq),
      },
      {
        key: "cutoffStartDate",
        label: "Start Date",
        sortable: true,
        width: 120,
        render: (row) => formatDateForInput(row.cutoffStartDate),
      },
      {
        key: "cutoffEndDate",
        label: "End Date",
        sortable: true,
        width: 120,
        render: (row) => formatDateForInput(row.cutoffEndDate),
      },
      {
        key: "regDays",
        label: "Reg. Days",
        sortable: true,
        width: 100,
        render: (row) => row.regDays == null ? "" : Number(row.regDays).toFixed(2),
      },
      {
        key: "month",
        label: "Period Month",
        sortable: true,
        width: 150,
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        width: 100,
        render: (row) => getOptionLabel(payrollTypeOptions, row.type),
        groupDisplayValue: (row) => getOptionLabel(payrollTypeOptions, row.type),
      },
      {
        key: "taxTable",
        label: "Tax Table",
        sortable: true,
        width: 130,
        render: (row) => getOptionLabel(taxTableOptions, row.taxTable),
        groupDisplayValue: (row) => getOptionLabel(taxTableOptions, row.taxTable),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: 100,
        render: (row) => {
          const isActive = getCutoffStatus(row.status) === "Open";
          return (
            <span
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${
                isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              <FontAwesomeIcon
                icon={isActive ? faCircleCheck : faCircleXmark}
                className={`text-[10px] ${isActive ? "text-emerald-500" : "text-gray-400"}`}
              />
              {getActiveLabel(row.status)}
            </span>
          );
        },
      },
    ],
    [records, selectedCode, handleDelete, frequencyOptions, taxTableOptions, payrollTypeOptions]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await useFieldLenghtCheck("REF_CUTOFF");
      if (mounted) setTblFieldArray(res || []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => {
    const length = useGetFieldLength(tblFieldArray, col);
    return Number.isInteger(length) && length > 0 ? length : undefined;
  };

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || isDeleting || isLoading) && <LoadingSpinner />}

      {/* HEADER */}
      <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
              {pageTitle || reftables[DOC_TYPE] || "Payroll Period"}
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
                      label: <span className="hidden sm:inline ml-1">Save</span>,
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
                      label: <span className="hidden sm:inline ml-1">Reset</span>,
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
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="hidden sm:inline ml-1 text-[11px] font-medium">Info</span>
                  <FontAwesomeIcon icon={faChevronDown} className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${isOpenGuide ? "rotate-180" : ""}`} />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden origin-top-right animate-[fadeIn_0.12s_ease-out]">
                    <button type="button" onClick={() => { if (pdfLink) window.open(pdfLink, "_blank"); setOpenGuide(false); }} disabled={!pdfLink} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
                      PDF Guide
                    </button>
                    <button type="button" onClick={() => { if (videoLink) window.open(videoLink, "_blank"); setOpenGuide(false); }} disabled={!videoLink} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" />
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${headerTabs ? "mt-40 md:mt-24" : "mt-24"} flex flex-col lg:flex-row lg:items-stretch gap-2`}>
        <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg transition-colors duration-200">
          
          {/* TOP FILTER BAR */}
          <div className="flex flex-wrap items-center gap-4 mb-4 bg-gray-50 p-2.5 rounded-md border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[80px]"
              >
               
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
          <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Frequency</label>
              <select
                value={filterFreq}
                onChange={(e) => handleFrequencyFilter(e.target.value)}
                disabled={isLoadingFreqOptions}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px] disabled:opacity-50"
              >
                {filterFreqOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
              >
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            
            <button
              onClick={handleApplyFilter}
              className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 active:scale-95 transition-all dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faFilter} className="text-[10px] text-gray-500" />
              Filter
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] sm:text-[14px] p-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing ? (selectedCode ? `Updating Record - ${selectedCode}` : "Fill in the fields below to add a new Cutoff Period") : "Select “Add” or double-click a row to edit"}
            </p>

            <div className="flex items-center justify-end gap-2">
              {isEditing && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 ring-inset ${isAdding ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isAdding ? "bg-blue-500" : "bg-amber-500"}`} />
                  {isAdding ? "Adding" : "Editing"}
                </span>
              )}
              <button type="button" onClick={() => setIsFieldsExpanded((expanded) => !expanded)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${isFieldsExpanded ? "rotate-180" : ""}`} />
                {isFieldsExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {/* 3-COLUMN FORM LAYOUT */}
          <div id="ref-cutoff-fields" className={`grid grid-cols-1 md:grid-cols-3 gap-x-6 transition-all duration-200 ${isFieldsExpanded ? "opacity-100" : "hidden"}`}>
            
            {/* Column 1 */}
            <div className="flex flex-col gap-y-4">
              <FieldRenderer
                label="Cut-Off Year"
                required
                type="text"
                value={formData.year}
                disabled={!isEditing}
                onChange={(v) => updateForm({ year: v })}
                maxLength={getMax("YEAR")}
              />
              <FieldRenderer
                label="Cut-Off Group"
                required
                type="text"
                value={formData.cutoffGrp}
                disabled={!isEditing}
                onChange={(v) => updateForm({ cutoffGrp: v })}
                maxLength={getMax("CUTOFF_GRP")}
              />
              <FieldRenderer
                label="Cut-Off Code"
                required
                type="text"
                value={formData.code}
                disabled={!isEditing || !!selectedCode}
                onChange={(v) => updateForm({ code: (v || "").toUpperCase() })}
                onBlur={(e) => handleCheckDuplicate(e.target.value)}
                maxLength={getMax("CUTOFF_CODE")}
              />
              <FieldRenderer
                label="Cut-Off Name"
                required
                type="text"
                value={formData.description}
                disabled={!isEditing}
                onChange={(v) => updateForm({ description: v })}
                maxLength={getMax("CUTOFF_NAME")}
              />
              <FieldRenderer
                label="Cut-Off Date"
                required
                type="date"
                value={formData.cutoffDate}
                disabled={!isEditing}
                onChange={(v) => updateForm({ cutoffDate: v })}
              />
              <FieldRenderer
                label="Cut-Off Month"
                required
                type="text"
                value={formData.cutoffMonthName}
                disabled={!isEditing}
                onChange={(v) => updateForm({ cutoffMonthName: v })}
                maxLength={getMax("CUTOFF_MONTH_NAME")}
              />
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-y-4">
              <FieldRenderer
                label="Frequency"
                required
                type="select"
                value={formData.cutoffFreq}
                placeholder={isLoadingEntryFrequency ? "Loading frequencies..." : "Select Frequency..."}
                disabled={!isEditing || !filterFreq || isLoadingEntryFrequency}
                options={frequencyOptions}
                onChange={(v) => updateForm({ cutoffFreq: v })}
              />
              <FieldRenderer
                label="Start Date"
                required
                type="date"
                value={formData.cutoffStartDate}
                disabled={!isEditing}
                onChange={(v) => updateForm({ cutoffStartDate: v })}
              />
              <FieldRenderer
                label="End Date"
                required
                type="date"
                value={formData.cutoffEndDate}
                disabled={!isEditing}
                onChange={(v) => updateForm({ cutoffEndDate: v })}
              />
              <FieldRenderer
                label="Period Month"
                required
                type="text"
                value={formData.month}
                disabled={!isEditing}
                onChange={(v) => updateForm({ month: v })}
                maxLength={getMax("MONTH")}
              />
              <FieldRenderer
                label="Type"
                type="select"
                value={formData.type}
                placeholder={isLoadingPayrollTypes ? "Loading types..." : "Select Type..."}
                disabled={!isEditing || isLoadingPayrollTypes}
                options={payrollTypeOptions}
                onChange={(v) => updateForm({ type: v })}
              />
            </div>

            {/* Column 3 */}
            <div className="flex flex-col gap-y-4">
              <FieldRenderer
                label="Reg. Hours"
                type="number"
                value={formData.regHrs}
                disabled={!isEditing}
                onChange={(v) => updateForm({ regHrs: v })}
              />
              <FieldRenderer
                label="Reg. Days"
                type="number"
                value={formData.regDays}
                disabled={!isEditing}
                onChange={(v) => updateForm({ regDays: v })}
              />
              <FieldRenderer
                label="Holidays"
                type="number"
                value={formData.holDays}
                disabled={!isEditing}
                onChange={(v) => updateForm({ holDays: v })}
              />
              <FieldRenderer
                label="Tax Table"
                type="select"
                value={formData.taxTable}
                placeholder={isLoadingTaxTables ? "Loading tax tables..." : "Select Tax Table..."}
                disabled={!isEditing || isLoadingTaxTables}
                options={taxTableOptions}
                onChange={(v) => updateForm({ taxTable: v })}
              />
              <FieldRenderer
                label="Status"
                type="select"
                value={getCutoffStatus(formData.status)}
                disabled={!isEditing}
                options={[{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }]}
                onChange={(v) => updateForm({ status: ["O", "C"].includes(String(formData.status).trim().toUpperCase())
                  ? (v === "Closed" ? "C" : "O")
                  : (v === "Closed" ? "INACTIVE" : "ACTIVE") })}
              />
            </div>

          </div>

          <div id="ref-cutoff-registration" className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-200 ${isFieldsExpanded ? "opacity-100" : "hidden"}`}>
            <RegistrationInfo layout="straight" data={registrationInfo} />
          </div>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={DOC_TYPE}
          enableGroupBy={true}
          keepGroupedColumns={true}
          columns={columns}
          data={filteredRecords}
          isLoading={isListLoading}
          onRowDoubleClick={handleEdit}
          itemsPerPage={50}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["refCutoffList"] })}
          autoFillGrid="True"
        />
      </div>
    </div>
  );
};

export default RefPayrollPeriod;
