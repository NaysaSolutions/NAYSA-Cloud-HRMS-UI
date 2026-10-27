import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useQueries, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlus,
    faSave,
    faUndo,
    faEdit,
    faInfoCircle,
    faChevronDown,
    faFilePdf,
    faVideo,
    faBuilding,
    faCircleCheck,
    faClock,
    faCalendarDays,
    faHandshake,
    faHouseUser,
    faClipboardList,
    faTableCells,
    faCalendarCheck, 
    faIdCardClip,
} from "@fortawesome/free-solid-svg-icons";
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
  
import RefEmployeeGovInfo from "../Reference File/RefEmployeeGovInfo";

const DOC_TYPE = "RefEmployeeGovInfo";

const PARAM_FORM = {
    empNo: "",
    empName: "",
    branchCode: "",
    groupCode: "",
    deptCode: "",

    payFreq: "",
    freqType: "",
    payMode: "",

    compSss: "",
    sssFreq: "",

    compMed: "",
    medFreq: "",

    compTax: "",
    taxFreq: "",

    compHdmf: "",
    hdmfFreq: "",

    taxTable: ""

};

const INITIAL_REG = {
    registeredBy: "",
    registeredDate: "",
    updatedBy: "",
    updatedDate: "",
}

const RefEmployeeGovParam = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // INFO BUTTON
    const guideRef = useRef(null);
    const pdfLink = reftablesPDFGuide[DOC_TYPE];
    const videoLink = reftablesVideoGuide[DOC_TYPE];

    const [formData, setFormData] = useState(PARAM_FORM);
    const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
      
    const [isEditing, setIsEditing] = useState(false); //false to disabled upon expanding without selecting a employee
    const [isFieldsExpanded, setIsFieldsExpanded] = useState(false); // Set to true to expand the form fields section
    const [selectecEmployeeParam, setSelectedEmployeeParam] = useState(null);

    const [isOpenGuide, setOpenGuide] = useState(false);

    const [isLoading, setIsLoading] = useState(false); // Set to true when loading data from the API

    // const [tblFieldArray, setTblFieldArray] = useState([]);

    // const isAdding = isEditing && !selectecEmployeeParam;
      
    const userCode = user?.USER_CODE || "ADMIN";
      
    // tabs
    const [paramSubTab, setParamSubTab] = useState("paramTable");

    const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }));

    const getOptionLabel = (options, value) => {
      const text = String(value ?? "").trim();
      return options.find((option) => option.value.toUpperCase() === text.toUpperCase())?.label ?? text;
    };

    //make an array if you have a diff docCodes
    const docCodes = ["M", "S", "W"];
    const {
        data: govFreqOptions = [],
        isFetching: isLoadingGovFreq,
      } = useQuery({
        queryKey: ["hsDropdown", docCodes, "FREQ"],
        queryFn: async () => {
          const results = await Promise.all(
            docCodes.map(async (docCode) => {
              const { data } = await apiClient.post("/getHSDropdown", {
                json_data: { docCode, dropdownColumn: "FREQ" },
              });
              const raw = data?.data?.[0]?.result ?? data?.[0]?.result ?? data?.result ?? [];
              const rows = Array.isArray(raw) ? raw : JSON.parse(raw);
              return rows.map((row) => ({
                value: String(row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? row.value ?? "").trim(),
                label: String(row.DROPDOWN_NAME ?? row.dropdownName ?? row.description ?? row.label ?? "").trim(),
              })).filter((option) => option.value);
            })
          );
          // .flat
          // since nakaarray yung docCodes magrereturn siya ng hindi multiple aarays
          return results.flat();
        },
      });

    //DROPDOWN 
    //SHORT VERSION FOR DROPDOWN WITH SAME REQUEST
    const fetchHsDropdown = async (docCode) => {
      const { data } = await apiClient.post("/getHSDropdown", {
      json_data: { docCode, dropdownColumn: docCode },
      });

    const raw = data?.data?.[0]?.result ?? data?.[0]?.result ?? data?.result ?? [];
    const rows = Array.isArray(raw) ? raw : JSON.parse(raw);

    return rows
      .map((row) => ({
        value: String(row.DROPDOWN_CODE ?? row.dropdownCode ?? row.code ?? row.value ?? "").trim(),
        label: String(row.DROPDOWN_NAME ?? row.dropdownName ?? row.description ?? row.label ?? "").trim(),
      }))
      .filter(({ value }) => value);
    };

    const dropdownCodes = ["TAXTBL","PAYFREQ", "FREQ_TYPE", "PAYMODE"];

    const [taxTable,payFreqQuery, freqTypeQuery, payModeQuery] = useQueries({
      queries: dropdownCodes.map((code) => ({
      queryKey: ["hsDropdown", code, code],
      queryFn: () => fetchHsDropdown(code),
      })),
    });

    const taxTableOptions = taxTable.data ?? [];
    const payFreqOptions = payFreqQuery.data ?? [];
    const freqTypeOptions = freqTypeQuery.data ?? [];
    const payModeOptions = payModeQuery.data ?? [];

    const { data: employeeParams = [], isLoading: isListLoading } = useQuery({
      queryKey: ["employeeParams"],
      queryFn: async () => {
        const { data } = await apiClient.get("/employeeGovParams");
        const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
        return raw ? JSON.parse(raw) : [];
      },
    });

    const { mutate: saveEmployeeParam, isLoading: isSaving } = useMutation({
        mutationFn: async (payload) =>
        await apiClient.post("/upsertEmployeeGovParams", payload),

        onSuccess: (response) => {
            const sqlRow = response?.data?.data?.[0];
            if (sqlRow?.errorcount > 0) {
            useSwalErrorAlert(
                "Unable to save", sqlRow?.errormsg || "Failed to save Employee Parameter."
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
                "Failed to save Employee Parameter",
            );
        return;
        }

        // IF SUCCESS
        queryClient.invalidateQueries({ queryKey: ["employeeParams"] });
        useSwalSuccessAlert("Success!", "Employee Parameter saved successfully!");
        setIsEditing(false);
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

    const handleEdit = (row) => {
        if (!row) return;

        setSelectedEmployeeParam(row.empNo ?? null);
        setFormData({
            ...PARAM_FORM,
            empNo: row.empNo ?? "",
            empName: row.empName ?? "",
            branchCode: row.branchCode ?? "",
            groupCode: row.groupCode ?? "",
            deptCode: row.deptCode ?? "",

            payFreq: row.payFreq ?? "",
            freqType: row.freqType ?? "",
            payMode: row.payMode ?? "",

            compSss: row.compSss ?? "",
            sssFreq: row.sssFreq ?? "",
            compMed: row.compMed ?? "",
            medFreq: row.medFreq ?? "",
            compTax: row.compTax ?? "",
            taxFreq: row.taxFreq ?? "",

            compHdmf: row.compHdmf ?? "",
            hdmfFreq: row.hdmfFreq ?? "",

            taxTable: row.taxTable ?? "",
              
        });

        setRegistrationInfo({
            registeredBy: row.registeredBy ?? "",
            registeredDate: row.registeredDate ?? "",
            lastUpdatedBy: row.updatedBy ?? "",
            lastUpdatedDate: row.updatedDate ?? "",
        });
        setIsEditing(true);
        setIsFieldsExpanded(true);
        
        setParamSubTab("paramInfo");
    };

    const resetForm = () => {
        setFormData({ ...PARAM_FORM });
        setRegistrationInfo(INITIAL_REG);
        setSelectedEmployeeParam(null);
        setIsEditing(false);
        setParamSubTab("paramInfo");
    };

    const handleSave = () => {
        const payload = {
            json_data: JSON.stringify({
            json_data: {
                ...formData,
                action: selectecEmployeeParam ? "EDIT" : "ADD",
                userCode: user?.USER_CODE || "ADMIN",
            },
            }),
        };
        saveEmployeeParam(payload);
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
    }, 
    [isEditing, formData, employeeParams]);

    // Columns
    const columns = useMemo(() => [
    {
        key: "empNo",
        label: "EMP NO",
        sortable: true,
        width: 130,
        requiredVisible: true,
        render: (row) => (row.empNo),
    },
    {
        key: "empName",
        label: "EMPLOYEE NAME",
        sortable: true,
        width: 240,
        requiredVisible: true,
        render: (row) => (row.empName),
    },
    {
        key: "branchCode",
        label: "BRANCH NAME",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.branchCode),
    },
    {
        key: "groupCode",
        label: "GROUP CODE",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.groupCode),
    },
    {
        key: "deptCode",
        label: "DEPARTMENT",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.deptCode),
    },
    {
        key: "payMode",
        label: "PAY MODE",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(payModeOptions, row.payMode),
    },
    {
        key: "freqType",
        label: "FREQUENCY TYPE",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(freqTypeOptions, row.freqType),
    },
    {
        key: "compSss",
        label: "Calc. SSS",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.compSss === "Y" ? "Yes" : "No"),
    },
    {
        key: "sssFreq",
        label: "SSS Freq.",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(govFreqOptions, row.sssFreq),
    },
    {
        key: "compMed",
        label: "Calc. PhilHealth",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.compMed === "Y" ? "Yes" : "No"),
    },
    {
        key: "medFreq",
        label: "PhilHealth Freq.",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(govFreqOptions, row.medFreq),
    },    
    {
        key: "compTax",
        label: "Calc. WTax",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.compTax === "Y" ? "Yes" : "No"),
    },    
    {
        key: "taxFreq",
        label: "WTax Freq.",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(govFreqOptions, row.taxFreq),
    },    
    {
        key: "compHdmf",
        label: "HDMF Freq.",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => (row.compTax === "Y" ? "Yes" : "No"),
    },    
    {
        key: "hdmfFreq",
        label: "Calc. HDMF",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(govFreqOptions, row.hdmfFreq),
    },    
    {
        key: "taxTable",
        label: "Tax Table",
        sortable: true,
        width: 150,
        requiredVisible: true,
        render: (row) => getOptionLabel(taxTableOptions, row.taxTable),
    },    
    
    ], [handleEdit]);

return (
      <div className="global-ref-main-div-ui !min-h-0 md:mt-[10px]">
          {(isListLoading || isSaving ) && <LoadingSpinner />}

        {/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
        {/* Employee Government Parameters */}
        {/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div role="tablist" aria-label="Employee ID views" className="flex w-full items-center gap-1 rounded-lg bg-slate-100 p-1 sm:w-auto dark:bg-slate-700">
              
              <button
                type="button"
                role="tab"
                aria-selected={paramSubTab === "paramTable"}
                onClick={() => setParamSubTab("paramTable")}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium transition-colors sm:flex-none sm:px-4 ${
                  paramSubTab === "paramTable"
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faTableCells} />
                Employee Parameters Table
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={paramSubTab === "paramInfo"}
                onClick={() => setParamSubTab("paramInfo")}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none sm:px-4 ${
                  paramSubTab === "paramInfo"
                    ? "bg-[#3B82F6] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faEdit} />
                Update Employee Parameters
              </button>
            </div>
          </div>
        {paramSubTab === "paramInfo" && (
          <div className="mt-3 grid grid-cols-1 gap-3">
          {/* LEFT: Form */}
          <div
            className={`min-w-0 flex-1 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm transition-colors duration-200 border-gray-100 dark:border-gray-700"
            }`}
          >
            <div className="mb-4 flex flex-col justify-between gap-3 rounded-lg border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 p-3 sm:flex-row sm:items-center dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm">
                  {String(formData.empName || formData.empNo || "E")
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {formData.empName || "Select an employee"}
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {formData.empNo || "Employee code"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={!selectecEmployeeParam || isEditing || isSaving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 disabled:opacity-100"
                >
                  <FontAwesomeIcon icon={faEdit} /> Edit
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={(!selectecEmployeeParam && !isEditing) || isSaving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 disabled:opacity-100"
                >
                  <FontAwesomeIcon icon={faUndo} /> Reset
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isEditing || isSaving || !formData.empNo.trim()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 disabled:opacity-100"
                >
                  <FontAwesomeIcon icon={faSave} /> Save
                </button>
              </div>
            </div>

            <div
              id="ref-group-fields"
              className="space-y-3"
            >
              <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_2px_5px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <FontAwesomeIcon icon={faIdCardClip} 
                  className="text-blue-700 dark:text-blue-300" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Employee Information</h3>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isEditing ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>
                    {isEditing ? "Editing" : "Read-only"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <FieldRenderer
                  label="Emp No."
                  type="text"
                  value={formData.empNo}
                  disabled={!isEditing || (isEditing && !!selectecEmployeeParam)}
                  onChange={(v) =>
                    updateForm({ empNo: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Emp Name."
                  type="text"
                  value={formData.empName}
                  disabled={!isEditing || (isEditing && !!selectecEmployeeParam)}
                  onChange={(v) =>
                    updateForm({ empName: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Branch"
                  type="text"
                  value={formData.branchCode}
                  disabled={!isEditing || (isEditing && !!selectecEmployeeParam)}
                  onChange={(v) =>
                    updateForm({ branchCode: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Group Code"
                  type="text"
                  value={formData.groupCode}
                  disabled={!isEditing || (isEditing && !!selectecEmployeeParam)}
                  onChange={(v) =>
                    updateForm({ groupCode: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Department"
                  type="text"
                  value={formData.deptCode}
                  disabled={!isEditing || (isEditing && !!selectecEmployeeParam)}
                  onChange={(v) =>
                    updateForm({ deptCode: (v || "").toUpperCase() })
                  }
                />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_2px_5px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <FontAwesomeIcon icon={faCalendarCheck} className="text-blue-700 dark:text-blue-300" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    PAYROLL FREQUENCY & MODE SETTINGS
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <FieldRenderer
                    label="Pay Frequency"
                    type="select"
                    value={formData.payFreq}
                    disabled={!isEditing}
                    options = {payFreqOptions}
                    onChange={(v) =>
                      updateForm({ payFreq: (v || "").toUpperCase() })
                    }
                  />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <FieldRenderer
                    label="Frequency Type"
                    type="select"
                    value={formData.freqType}
                    disabled={!isEditing}
                    options = {freqTypeOptions}
                    onChange={(v) =>
                      updateForm({ freqType: (v || "").toUpperCase() })
                    }
                  />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <FieldRenderer
                    label="Payment Mode"
                    type="select"
                    value={formData.payMode}
                    disabled={!isEditing}
                    options = {payModeOptions}
                    onChange={(v) => updateForm({ payMode: v })}
                  />
                </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <FontAwesomeIcon icon={faBuilding} className="text-blue-700 dark:text-blue-300" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    STATUTORY DEDUCTIONS & CONTRIBUTIONS SETUP
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <FontAwesomeIcon icon={faHandshake} className="text-slate-400" />
                          Social Security (SSS)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                      <FieldRenderer 
                        label="Calc. SSS" 
                        type="select" 
                        value={formData.compSss} 
                        disabled={!isEditing} 
                        options={[
                          { value: "Y", label: "Yes" },
                          { value: "N", label: "No" },
                        ]}
                        onChange={(v) => updateForm({ compSss: (v || "").toUpperCase() })} 
                      />
                      <FieldRenderer 
                        label="SSS Frequency" 
                        type="select" 
                        value={formData.sssFreq} 
                        placeholder={isLoadingGovFreq}
                        disabled={!isEditing || (formData.compSss || "").toUpperCase() != "Y" || isLoadingGovFreq} 
                        options={govFreqOptions}
                        onChange={(v) => updateForm({ sssFreq: (v || "").toUpperCase() })} 
                      />
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <FontAwesomeIcon icon={faClipboardList} className="text-slate-400" />
                        Philhealth (PH)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                      <FieldRenderer 
                        label="Calc. PhilHealth" 
                        type="select" 
                        value={formData.compMed} 
                        disabled={!isEditing} 
                        options={[
                          { value: "Y", label: "Yes" },
                          { value: "N", label: "No" },
                        ]}
                        onChange={(v) => updateForm({ compMed: (v || "").toUpperCase() })} 
                      />
                      <FieldRenderer 
                        label="PhilHealth Frequency" 
                        type="select" 
                        value={formData.medFreq}
                        placeholder={isLoadingGovFreq}
                        disabled={!isEditing || (formData.compMed || "").toUpperCase() != "Y" || isLoadingGovFreq} 
                        options = {govFreqOptions}
                        onChange={(v) => updateForm({ medFreq: (v || "").toUpperCase() })} 
                      />
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <FontAwesomeIcon icon={faHouseUser} className="text-slate-400" />
                        Pag-Ibig (HDMF)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                      <FieldRenderer 
                        label="Calc. Pagibig" 
                        type="select" 
                        value={formData.compHdmf} 
                        disabled={!isEditing} 
                        options={[
                          { value: "Y", label: "Yes" },
                          { value: "N", label: "No" },
                        ]}
                        onChange={(v) => updateForm({ compHdmf: (v || "").toUpperCase() })} 
                      />
                      <FieldRenderer 
                        label="Pag-Ibig Frequency" 
                        type="select" 
                        value={formData.hdmfFreq} 
                        placeholder={isLoadingGovFreq}
                        disabled={!isEditing || (formData.compHdmf || "").toUpperCase() != "Y" || isLoadingGovFreq} 
                        options={govFreqOptions}
                        onChange={(v) => updateForm({ hdmfFreq: (v || "").toUpperCase() })} 
                      />
                    </div>
                  </div>
                </div>
                <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_2px_5px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    WITHHOLDING TAX & EXEMPTION RULES
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <FieldRenderer
                    label="Calc. Wtax"
                    type="select"
                    value={formData.compTax}
                    disabled={!isEditing} 
                    options={[
                          { value: "Y", label: "Yes" },
                          { value: "N", label: "No" },
                        ]}
                    onChange={(v) =>
                      updateForm({ compTax: (v || "").toUpperCase() })
                    }
                  />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                    <FieldRenderer 
                        label="WTax Frequency" 
                        type="select" 
                        value={formData.taxFreq}
                        placeholder={isLoadingGovFreq}
                        disabled={!isEditing || (formData.compTax || "").toUpperCase() != "Y" || isLoadingGovFreq} 
                        options = {govFreqOptions}
                        onChange={(v) => updateForm({ taxFreq: (v || "").toUpperCase() })} 
                      />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <FieldRenderer
                    label="Tax Table"
                    type="select"
                    value={formData.taxTable}
                    disabled={!isEditing}
                    options = {taxTableOptions} // loads the tax table
                    onChange={(v) =>
                      updateForm({ taxTable: (v || "").toUpperCase() })
                    }
                  />
                </div>
                </div>
              </section>
                <div
                  id="ref-group-registration"
                  className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700"
                >
                  <RegistrationInfo layout="straight" data={registrationInfo} />
                </div>
              </section>
            </div>
          </div>
        </div>
        )}

        {/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
        {/* Employee Government Parameters Table */}
        {/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
        {paramSubTab === "paramTable" && (
          <div className="global-tran-table-main-div-ui mt-4">
            <SearchGlobalReferenceTable
              docType={DOC_TYPE}
              columns={columns}
              data={employeeParams}
              isLoading={isListLoading}
              onRowDoubleClick={handleEdit}
              itemsPerPage={50}
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ["employeeParams"] })
              }
              autoFillGrid="True"
            />
          </div>
        )}
      </div>
    )
}

  export default RefEmployeeGovParam;