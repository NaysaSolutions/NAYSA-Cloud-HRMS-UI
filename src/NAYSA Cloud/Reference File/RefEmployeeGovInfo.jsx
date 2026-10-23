  import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
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
    faInfoCircle,
    faChevronDown,
    faFilePdf,
    faVideo,
    faBuilding,
    faCircleCheck,
    faIdCard,
    faFileLines,
    faHandshake,
    faHouseUser,
    faClipboardList,
    faTableCells,
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

  import RefEmployeeGovParam from "./RefEmployeeGovParam.jsx";
  const DOC_TYPE = "RefEmployeeGovInfo";

  const BANK_COMP_OPTIONS = [
    { value: "A", label: "Amount" },
    { value: "P", label: "Percentage" },
  ];

  const INFO_FORM = {
      empNo: "",
      empName: "",
      branchCode: "",
      groupCode: "",
      deptCode: "",

      umid: "",
      tin: "",
      sssNo: "",
      hdmfNo: "",
      phNo: "",

      bankCode: "",
      bankName: "",
      bankAcct: "",

      bankCode2: "",
      bankName2: "",
      bankAcct2: "",
      bank2Comp: "",
      bank2: "",
      
      bankCode3: "",
      bankName3: "",
      bankAcct3: "",
      bank3Comp: "",
      bank3: ""
  };

  const INFO_REG = {
      registeredBy: "",
      registeredDate: "",
      updatedBy: "",
      updatedDate: "",
  }

  const RefEmployeeGovInfo = () => {
      const queryClient = useQueryClient();
      const { user } = useAuth();

      // INFO BUTTON
      const guideRef = useRef(null);
      const pdfLink = reftablesPDFGuide[DOC_TYPE];
      const videoLink = reftablesVideoGuide[DOC_TYPE];

      const [formData, setFormData] = useState(INFO_FORM);
      const [registrationInfo, setRegistrationInfo] = useState(INFO_REG);
      
      const [isEditing, setIsEditing] = useState(false); //false to disabled upon expanding without selecting a employee
      const [isFieldsExpanded, setIsFieldsExpanded] = useState(false); // Set to true to expand the form fields section
      const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);

      const [isOpenGuide, setOpenGuide] = useState(false);

      const [isLoading, setIsLoading] = useState(false); // Set to true when loading data from the API

      //lookup for bank codes
      //not sure
      const [isBankLookupOpen, setIsBankLookupOpen] = useState(false);
      const [activeBankField, setActiveBankField] = useState(null);
      // const [tblFieldArray, setTblFieldArray] = useState([]);

      // const isAdding = isEditing && !selectedEmployeeInfo;
      
      const userCode = user?.USER_CODE || "ADMIN";
      
      // tabs
      const [infoHeaderTab, setInfoHeaderTab] = useState("infoHeader"); //header tab
      const [infoSubTab, setInfoSubTab] = useState("infoSub"); //sub tab

      const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }));

      const { data: employeeinfos = [], isLoading: isListLoading } = useQuery({
          queryKey: ["employeeList"],
          queryFn: async () => {
          const { data } = await apiClient.get("/employeeGovInfo");
          const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
          return raw ? JSON.parse(raw) : [];
      },
      });

      const { mutate: saveEmployeeInfo, isLoading: isSaving } = useMutation({
          mutationFn: async (payload) =>
          await apiClient.post("/upsertEmployeeGovInfo", payload),

          onSuccess: (response) => {
              const sqlRow = response?.data?.data?.[0];
              if (sqlRow?.errorcount > 0) {
              useSwalErrorAlert(
                  "Unable to save", sqlRow?.errormsg || "Failed to save Employee ID Number."
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
                  "Failed to save Employee ID Number.",
              );
              return;
          }
          // IF SUCCESS
          queryClient.invalidateQueries({ queryKey: ["employeeList"] });
          useSwalSuccessAlert("Success!", "Employee ID Number saved successfully!");
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

          setSelectedEmployeeInfo(row.empNo ?? null);
          setFormData({
              ...INFO_FORM,
              empNo: row.empNo ?? "",
              empName: row.empName ?? "",
              branchCode: row.branchCode ?? "",
              groupCode: row.groupCode ?? "",
              deptCode: row.deptCode ?? "",

              umid: row.umid ?? "",
              tin: row.tin ?? "",
              sssNo: row.sssNo ?? "",
              hdmfNo: row.hdmfNo ?? "",
              phNo: row.phNo ?? "",

              bankCode: row.bankCode ?? "",
              bankName: row.bankName ?? "",
              bankAcct: row.bankAcct ?? "",

              bankCode2: row.bankCode2 ?? "",
              bankName2: row.bankName2 ?? "",
              bankAcct2: row.bankAcct2 ?? "",
              bank2Comp: row.bank2Comp ?? "",
              bank2: row.bank2 ?? "",
              
              bankCode3: row.bankCode3 ?? "",
              bankName3: row.bankName3 ?? "",
              bankAcct3: row.bankAcct3 ?? "",
              bank3Comp: row.bank3Comp ?? "",
              bank3: row.bank3 ?? "",
              
          });

          setRegistrationInfo({
              registeredBy: row.registeredBy ?? "",
              registeredDate: row.registeredDate ?? "",
              lastUpdatedBy: row.updatedBy ?? "",
              lastUpdatedDate: row.updatedDate ?? "",
          });
          setIsEditing(true);
          setIsFieldsExpanded(true);
      
          setInfoHeaderTab("infoHeader");
          setInfoSubTab("empForm");
      };

      const resetForm = () => {
          setFormData({ ...INFO_FORM });
          setRegistrationInfo(INFO_REG);
          setSelectedEmployeeInfo(null);
          setIsEditing(false);
          setInfoHeaderTab("infoHeader");
          setInfoSubTab("empForm");
      };

      const handleSave = () => {
          const payload = {
              json_data: JSON.stringify({
              json_data: {
                  ...formData,
                  action: selectedEmployeeInfo ? "EDIT" : "ADD",
                  userCode: user?.USER_CODE || "ADMIN",
              },
              }),
          };
          saveEmployeeInfo(payload);
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
      [isEditing, formData, employeeinfos]);

      // Columns
      const columns = useMemo(() => [
        {
          key: "empNo",
          label: "EMP NO",
          sortable: true,
          width: 130,
          requiredVisibile: true,
          render: (row) => (
            <span className="font-mono text-[12px] font-bold text-sky-800 dark:text-sky-300">
              {row.empNo}
            </span>
          ),
        },
        {
          key: "empName",
          label: "EMPLOYEE NAME",
          sortable: true,
          width: 240,
          requiredVisibile: true,
          render: (row) => (
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {row.empName}
            </span>
          ),
        },
        {
          key: "branchCode",
          label: "BRANCH NAME",
          sortable: true,
          width: 150,
          requiredVisible: true,
          render: (row) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
              {row.branchCode}
          </span>
          ),
        },
        {
          key: "groupCode",
          label: "GROUP CODE",
          sortable: true,
          width: 150,
          requiredVisible: true,
          render: (row) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
              {row.groupCode}
          </span>
          ),
        },
        {
            key: "deptCode",
            label: "DEPARTMENT",
            sortable: true,
            width: 150,
            requiredVisible: true,
            render: (row) => (
            <span className="font-semibold text-slate-900 dark:text-slate-100">
                {row.deptCode}
            </span>
            ),
        },
        { key: "tin", label: "TIN", sortable: true, width: 150, requiredVisibile: true },
        { key: "sssNo", label: "SSS NO.", sortable: true, width: 140, requiredVisibile: true },
        { key: "hdmfNo", label: "HDMF / PAG-IBIG", sortable: true, width: 170, requiredVisibile: true },
        { key: "phNo", label: "PHILHEALTH", sortable: true, width: 160, requiredVisibile: true },
        {
          key: "bankAcct",
          label: "PRIMARY BANK",
          sortable: true,
          width: 220,
          requiredVisibile: true,
          displayValue: (row) => `${row.bankCode || ""} ${row.bankAcct || ""}`.trim(),
          render: (row) => (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
              {row.bankCode && (
                <span className="rounded bg-slate-100 px-2 py-1 font-sans text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {row.bankCode}
                </span>
              )}
              {row.bankAcct || "-"}
            </span>
          ),
        },
        {
          key: "bankAcct2",
          label: "SECONDARY BANK",
          sortable: true,
          width: 220,
          requiredVisibile: true,
          displayValue: (row) => `${row.bankCode2 || ""} ${row.bankAcct2 || ""}`.trim(),
          render: (row) => (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
              {row.bankCode2 && (
                <span className="rounded bg-slate-100 px-2 py-1 font-sans text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {row.bankCode2}
                </span>
              )}
              {row.bankAcct2 || "-"}
            </span>
          ),
        },
              {
          key: "bankAcct3",
          label: "TERTIARY BANK",
          sortable: true,
          width: 220,
          requiredVisibile: true,
          displayValue: (row) => `${row.bankCode3 || ""} ${row.bankAcct3 || ""}`.trim(),
          render: (row) => (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
              {row.bankCode3 && (
                <span className="rounded bg-slate-100 px-2 py-1 font-sans text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {row.bankCode3}
                </span>
              )}
              {row.bankAcct3 || "-"}
            </span>
          ),
        },
      ], [handleEdit]);

  return (
      <div className="global-ref-main-div-ui !min-h-0 mt-[130px] md:mt-[85px]">
          {(isListLoading || isSaving ) && <LoadingSpinner />}

          {/* HEADER (same UI pattern as COAMast, no Tabs) */}
          <div className="global-ref-header-ui !p-1 mb-2">
          <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
              {/* Left: Title */}
              <div className="w-full md:w-auto flex md:justify-start">
                  <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left lg:!text-lg">
                  Employee Government ID Number
                  </h1>
              </div>

            {/* 2) MAIN Tabs */}
            <div className="w-full md:justify-center flex">
              <div className="w-full md:w-auto">
                <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">

                  <button
                    type="button"
                    aria-selected={infoHeaderTab === "infoHeader"}
                    onClick={() => setInfoHeaderTab("infoHeader")}
                    className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-1 text-[12px] font-semibold transition-colors sm:px-5 sm:py-1.5 sm:text-[15px] ${
                      infoHeaderTab === "infoHeader"
                        ? "border-blue-700 bg-blue-50 text-blue-700"
                        : "border-transparent text-slate-500 hover:bg-blue-50/60 hover:text-blue-700"
                    }`}
                  >
                    Employee ID Numbers
                  </button>

                  <button
                    type="button"
                    aria-selected={infoHeaderTab === "paramHeader"}
                    onClick={() => setInfoHeaderTab("paramHeader")}
                    className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-1 text-[12px] font-semibold transition-colors sm:px-5 sm:py-1.5 sm:text-[15px] ${
                      infoHeaderTab === "paramHeader"
                        ? "border-blue-700 bg-blue-50 text-blue-700"
                        : "border-transparent text-slate-500 hover:bg-blue-50/60 hover:text-blue-700"
                    }`}
                  >
                    Employee Parameters
                  </button>
                </div>
              </div>
            </div>

              {/* Right: Buttons + Info */}
              <div className="w-full md:w-auto flex md:justify-end">
                  <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
                  <div className="flex flex-wrap justify-center md:justify-end gap-2">
                  
                  {/* Record actions are shown beside the selected employee. */}
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

        {/* ~~~~~~~~~~~~~~~~~~~ */}
        {/* Employee ID Numbers */}
        {/* ~~~~~~~~~~~~~~~~~~~ */}
        {infoHeaderTab === "infoHeader" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div role="tablist" aria-label="Employee ID views" className="flex w-full items-center gap-1 rounded-lg bg-slate-100 p-1 sm:w-auto dark:bg-slate-700">
              
              <button
                type="button"
                role="tab"
                aria-selected={infoSubTab === "infoSub"}
                onClick={() => setInfoSubTab("infoSub")}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium transition-colors sm:flex-none sm:px-4 ${
                  infoSubTab === "infoSub"
                    ? "bg-sky-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faTableCells} />
                Employee Info Table
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={infoSubTab === "empForm"}
                onClick={() => setInfoSubTab("empForm")}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none sm:px-4 ${
                  infoSubTab === "empForm"
                    ? "bg-sky-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faEdit} />
                Update Governemt IDs
              </button>
            </div>
          </div>
        )}
        {infoSubTab === "empForm" && infoHeaderTab === "infoHeader" && (
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
                  disabled={!selectedEmployeeInfo || isEditing || isSaving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 disabled:opacity-100"
                >
                  <FontAwesomeIcon icon={faEdit} /> Edit
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={(!selectedEmployeeInfo && !isEditing) || isSaving}
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
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
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
                  disabled={!isEditing || (isEditing && !!selectedEmployeeInfo)}
                  onChange={(v) =>
                    updateForm({ empNo: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Emp Name."
                  type="text"
                  value={formData.empName}
                  disabled={!isEditing || (isEditing && !!selectedEmployeeInfo)}
                  onChange={(v) =>
                    updateForm({ empName: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Branch"
                  type="text"
                  value={formData.branchCode}
                  disabled={!isEditing || (isEditing && !!selectedEmployeeInfo)}
                  onChange={(v) =>
                    updateForm({ branchCode: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Group Code"
                  type="text"
                  value={formData.groupCode}
                  disabled={!isEditing || (isEditing && !!selectedEmployeeInfo)}
                  onChange={(v) =>
                    updateForm({ groupCode: (v || "").toUpperCase() })
                  }
                />
                <FieldRenderer
                  label="Department"
                  type="text"
                  value={formData.deptCode}
                  disabled={!isEditing || (isEditing && !!selectedEmployeeInfo)}
                  onChange={(v) =>
                    updateForm({ deptCode: (v || "").toUpperCase() })
                  }
                />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_2px_5px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Government Identification
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center">
                    <FontAwesomeIcon icon={faIdCard} aria-hidden="true" className="h-7 w-7 rounded-md bg-blue-100 p-1 text-blue-700" />
                  </span>
                  <FieldRenderer
                    label="UMID"
                    type="text"
                    value={formData.umid}
                    disabled={!isEditing}
                    onChange={(v) =>
                      updateForm({ umid: (v || "").toUpperCase() })
                    }
                  />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center">
                    <FontAwesomeIcon icon={faFileLines} aria-hidden="true" className="h-7 w-7 rounded-md bg-blue-100 p-1 text-blue-700" />
                  </span>
                  <FieldRenderer
                    label="TIN"
                    type="text"
                    required
                    value={formData.tin}
                    disabled={!isEditing}
                    onChange={(v) =>
                      updateForm({ tin: (v || "").toUpperCase() })
                    }
                  />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center">
                    <FontAwesomeIcon icon={faHandshake} aria-hidden="true" className="h-7 w-7 rounded-md bg-blue-100 p-1 text-blue-700" />
                  </span>
                  <FieldRenderer
                    label="SSS Number"
                    type="text"
                    required
                    value={formData.sssNo}
                    disabled={!isEditing}
                    onChange={(v) => updateForm({ sssNo: v })}
                  />
                </div>

                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center">
                    <FontAwesomeIcon icon={faHouseUser} aria-hidden="true" className="h-7 w-7 rounded-md bg-blue-100 p-1 text-blue-700" />
                  </span>
                  <FieldRenderer
                    label="HDMF Number"
                    type="text"
                    required
                    value={formData.hdmfNo}
                    disabled={!isEditing}
                    onChange={(v) =>
                      updateForm({ hdmfNo: (v || "").toUpperCase() })
                    }
                  />
                </div>
                <div className="flex min-w-0 items-start gap-2 [&>div]:!w-auto [&>div]:min-w-0 [&>div]:flex-1">
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center">
                    <FontAwesomeIcon icon={faClipboardList} aria-hidden="true" className="h-7 w-7 rounded-md bg-blue-100 p-1 text-blue-700" />
                  </span>
                  <FieldRenderer
                    label="Philhealth Number"
                    type="text"
                    required
                    value={formData.phNo}
                    disabled={!isEditing}
                    onChange={(v) =>
                      updateForm({ phNo: (v || "").toUpperCase() })
                    }
                  />
                </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <FontAwesomeIcon icon={faBuilding} className="text-blue-700 dark:text-blue-300" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    Payroll Banking Accounts
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <FontAwesomeIcon icon={faCircleCheck} className="text-amber-500" />
                        Primary Bank Account
                      </h4>
                      <span className="shrink-0 rounded bg-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">Required</span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                      <FieldRenderer 
                        label="Bank Code" 
                        readOnly
                        type="lookup" 
                        value={formData.bankCode} 
                        disabled={!isEditing} 
                        onChange={(v) => updateForm({ bankCode: (v || "").toUpperCase() })} 
                      />
                      <FieldRenderer 
                        label="Bank Name" 
                        type="text" 
                        value={formData.bankName} 
                        disabled={!isEditing || !!selectedEmployeeInfo} 
                        onChange={(v) => updateForm({ bankName: (v || "").toUpperCase() })} 
                      />

                      <div className="sm:col-span-2 space-y-2">
                        <FieldRenderer 
                          label="Account Number" 
                          type="text" 
                          value={formData.bankAcct} disabled={!isEditing} 
                          onChange={(v) => updateForm({ bankAcct: (v || "").toUpperCase() })} 
                        />
                      </div>

                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <FontAwesomeIcon icon={faBuilding} className="text-slate-400" />
                        Secondary Bank Account
                      </h4>
                      <span className="shrink-0 rounded bg-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">Optional</span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                      <FieldRenderer 
                        label="Bank Code" 
                        type="text" 
                        value={formData.bankCode2} 
                        disabled={!isEditing} 
                        onChange={(v) => updateForm({ bankCode2: (v || "").toUpperCase() })} 
                      />

                      <FieldRenderer 
                        label="Bank Name" 
                        type="text" 
                        value={formData.bankName2} 
                        disabled={!isEditing || !!selectedEmployeeInfo} 
                        onChange={(v) => updateForm({ bankName2: (v || "").toUpperCase() })} 
                      />

                      <div className="sm:col-span-2 space-y-2">
                        <FieldRenderer 
                          label="Account Number" 
                          type="text" 
                          value={formData.bankAcct2} 
                          disabled={!isEditing} 
                          onChange={(v) => updateForm({ bankAcct2: (v || "").toUpperCase() })} 
                        />
                        <FieldRenderer 
                          label="Bank Computation Method" 
                          type="select" 
                          value={formData.bank2Comp} 
                          disabled={!isEditing} 
                          options={BANK_COMP_OPTIONS}
                          onChange={(v) => updateForm({ bank2Comp: (v || "").toUpperCase() })} 
                        />
                        <FieldRenderer 
                          label="Bank 2 Company" 
                          type="number" 
                          value={formData.bank2}
                          disabled={!isEditing} 
                          onChange={(v) => updateForm({ bank2: (v || "").toUpperCase() })} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <FontAwesomeIcon icon={faBuilding} className="text-slate-400" />
                        Tertiary Bank Account
                      </h4>
                      <span className="shrink-0 rounded bg-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">Optional</span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                      <FieldRenderer 
                        label="Bank Code" 
                        type="text" 
                        value={formData.bankCode3} 
                        disabled={!isEditing} 
                        onChange={(v) => updateForm({ bankCode3: (v || "").toUpperCase() })}  
                      />
                      <FieldRenderer 
                        label="Bank Name" 
                        type="text" 
                        value={formData.bankName3} 
                        disabled={!isEditing || !!selectedEmployeeInfo} 
                        onChange={(v) => updateForm({ bankName3: (v || "").toUpperCase() })} 
                      />
                      <div className="sm:col-span-2 space-y-2">
                        <FieldRenderer 
                          label="Account Number" 
                          type="text" 
                          value={formData.bankAcct3} 
                          disabled={!isEditing} 
                          onChange={(v) => updateForm({ bankAcct3: (v || "").toUpperCase() })} 
                        />
                        <FieldRenderer 
                          label="Bank Computation Method" 
                          type="select" 
                          value={formData.bank3Comp} 
                          disabled={!isEditing} 
                          options={BANK_COMP_OPTIONS}
                          onChange={(v) => updateForm({ bank3Comp: (v || "").toUpperCase() })}  
                        />
                        <FieldRenderer 
                          label="Bank 3 Company" 
                          type="number" 
                          value={formData.bank3} 
                          disabled={!isEditing} 
                          onChange={(v) => updateForm({ bank3: (v || "").toUpperCase() })} />
                      </div>
                    </div>
                  </div>
                </div>
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

        {/* Display the Parameters Tab */}
        {infoHeaderTab === "paramHeader" && <RefEmployeeGovParam />}

        {/* ~~~~~~~~~~~~~~~~~~~ */}
        {/* Employee ID Numbers Table */}
        {/* ~~~~~~~~~~~~~~~~~~~ */}
        {infoHeaderTab === "infoHeader" && infoSubTab === "infoSub" && (
          <div className="global-tran-table-main-div-ui mt-4">
            <SearchGlobalReferenceTable
              docType={DOC_TYPE}
              columns={columns}
              data={employeeinfos}
              isLoading={isListLoading}
              onRowDoubleClick={handleEdit}
              itemsPerPage={50}
              onRefresh={() =>
                queryClient.invalidateQueries({ queryKey: ["employeeList"] })
              }
              autoFillGrid="True"
            />
          </div>
        )}
      </div>
  )
}

  export default RefEmployeeGovInfo;