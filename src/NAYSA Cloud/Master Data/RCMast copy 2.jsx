import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";


// Import Lookup Modals
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
// import SearchRCRef from "@/NAYSA Cloud/Lookup/SearchRCRef";

// Icons & Globals
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUndo, faEdit, faTrashAlt, faInfoCircle, faChevronDown, faFilePdf, faVideo } from "@fortawesome/free-solid-svg-icons";
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import { useSwalErrorAlert, useSwalSuccessAlert, useSwalErrorAlertAPI, useSwalDeleteConfirm, useSwalDeleteRecord } from "@/NAYSA Cloud/Global/behavior";
import { useFieldLenghtCheck, useGetFieldLength,} from '@/NAYSA Cloud/Global/procedure';

// UI Helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";


const INITIAL_FORM = {
  rcCode: "", rcName: "", rcTypeCode: "" , rcGroup: "" ,groupCode: "", active: "Y",
  tblFieldArray :[],
};

const INITIAL_REG = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };

const RCMast = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const docType = "RCMast";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];
  
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRcCode, setSelectedRcCode] = useState(null);
  const [modals, setModals] = useState({ coaClass: false, guide: false });
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [activeTab, setActiveTab] = useState("rcMast");
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const toggleModal = (name, isOpen) => setModals(prev => ({ ...prev, [name]: isOpen }));

  // --- TANSTACK QUERY: Fetch Dropdowns & List ---
// --- TANSTACK QUERY: Fetch Dropdowns ---
const { data: dropdowns, isLoading: isDropdownLoading } = useQuery({
  queryKey: ["rcDropdowns"],
  queryFn: async () => {
    // Replace these strings with the actual Reference Table codes in your DB
    const [typ, grp] = await Promise.all([
      useTopDocDropDown("RCMAST", "RC_TYPE"),
      useTopDocDropDown("RCMAST", "RC_GROUP"),
    ]);
    return { typ, grp };
  },
  // Provide an initial structure to prevent "undefined" errors before data loads
  initialData: { typ: [], grp: [] } 
});

  const { data: accounts = [], isLoading: isListLoading } = useQuery({
    queryKey: ["rcList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/rcMast");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    }
  });

  // --- TANSTACK QUERY: Save Mutation ---
  const { mutate: saveRC, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertRCMast", payload),
  
    onSuccess: (response) => {
      // 1) SPROC row style (errorcount/errormsg)
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save Branch.");
        resetForm(); // ✅ reset on failure
        return;
      }
  
      // 2) API status style
      const status = response?.data?.status ?? response?.data?.data?.status;
      const success = response?.data?.success || status === "success" || !status;
  
      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Account."
        );
        resetForm(); // ✅ reset on failure
        return;
      }
  
      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["rcList"] });
      useSwalSuccessAlert("Success!", "RC saved successfully!");
      resetForm();
    },
  
    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
      resetForm(); // ✅ reset on request error too
    },
  });

  // --- ACTIONS ---
  const handleSave = () => {
  
    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          action: selectedRcCode ? "EDIT" : "ADD",
          userCode: user?.USER_CODE || "ADMIN",
        }
      })
    };
    saveRC(payload);
  };


  
  // --- MUTATION: UPSERT ---
  

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedRcCode(null);
    setIsEditing(false);
  };

  const handleEdit = (row) => {
    const classNameFromRow = row.className;

    const classNameFromDropdown =
      dropdowns?.cls?.find(d => d.DROPDOWN_CODE === row.classCode)?.DROPDOWN_NAME || "";

    setSelectedRcCode(row.rcCode);

    setFormData({
      ...INITIAL_FORM,
      ...row,
      classCode: row.classCode,
      className: classNameFromRow || classNameFromDropdown,  // ✅ important
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate
    });

    setIsEditing(true);
  };  


  
const { mutate: deleteRC, isLoading: isDeleting } = useMutation({
  mutationFn: async (payload) => await apiClient.post("/deleteRCMast", payload),
  onSuccess: (response) => {
    queryClient.invalidateQueries(["rcList"]);
    useSwalDeleteRecord("Deleted!", "The account has been removed from the system.");
    resetForm();
  },
  onError: (error) => useSwalErrorAlertAPI("Delete Error", error)
});



const handleDelete = async (row) => {
  try {
    setIsLoading(true); // Ensure you have a general loading state or use the mutation's state
    const payload = {
      json_data: {
        rcCode: row.rcCode 
      }
    };

    // 1. Check if used in other tables via SPROC
    const response = await apiClient.post("/checkInUsedRCMast", payload);    
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];  
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (parsedData.result === "1") {
      setIsLoading(false);
      return useSwalErrorAlertAPI(
        `Cannot Delete RC Code: ${row.rcCode}`, 
        `Code was already used.`
      );
    }

    // 2. Confirmations
    const confirm = await useSwalDeleteConfirm(
      "Confirm Delete", 
      `Are you sure you want to delete Code: ${row.rcCode}?`
    );

    if (confirm.isConfirmed) {
      deleteRC(payload); 
    }
  } catch (error) {
    useSwalErrorAlertAPI("System Error", error);
  } finally {
    setIsLoading(false);
  }
};


// --- VALIDATION: Check for Duplicate Code ---
const handleCheckDuplicate = async (code) => {
  
  if (isEditing && selectedRcCode) return; 
  if (!code) return;

  try {
    const payload = { json_data: { rcCode: code } };
    const response = await apiClient.post("/checkDuplicateRCMast", payload);
    
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (parsedData.result === "1") {
      setIsLoading(false);
      resetForm();
      return useSwalErrorAlertAPI(
        `Duplicate RC Code: ${code}`, 
        `Code was already used.`
      );
    }

  } catch (error) {
    console.error("Duplicate Check Error:", error);
  }
};


const updateForm = (updates) => setFormData(prev => ({ ...prev, ...updates }));

  // --- TABLE COLUMNS ---
const columns = useMemo(() => [
  { key: "rcCode", label: "RC Code", sortable: true },
  { key: "rcName", label: "RC", sortable: true },

  {
    key: "rcTypeCode",
    label: "RC Type",
    sortable: true,
    render: (row) => {
      const match = dropdowns?.typ?.find((d) => d.DROPDOWN_CODE === row.rcTypeCode);
      return match ? match.DROPDOWN_NAME : row.rcTypeCode;
    },
  },

  { 
    key: "rcGroup", 
    label: "RC Group", 
    sortable: true,
    render: (row) => (row.reqSL === "Y" ? "Yes" : "No") 
  },

{
    key: "rcTypeCode",
    label: "RC Type",
    sortable: true,
    render: (row) => {
      const match = dropdowns?.typ?.find((d) => d.DROPDOWN_CODE === row.acctType);
      return match ? match.DROPDOWN_NAME : row.acctType;
    },
  },

  { 
    key: "active", 
    label: "Active", 
    sortable: true,
    render: (row) => (row.active === "Y" ? "Yes" : "No") 
  },

  {
    key: "__actions",
    label: "Actions",
    render: (row) => (
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => handleEdit(row)}
          className="py-1 px-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          title="Edit"
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>

        <button
          onClick={() => handleDelete(row)}
          className="py-1 px-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          title="Delete"
        >
          <FontAwesomeIcon icon={faTrashAlt} />
        </button>
      </div>
    ),
  },
], [dropdowns, handleDelete]);

  useEffect(() => {
    const handleKey = (e) => { if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); } };
    const handleClick = (e) => { if (guideRef.current && !guideRef.current.contains(e.target)) setOpenGuide(false); };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => { window.removeEventListener("keydown", handleKey); document.removeEventListener("mousedown", handleClick); };
  }, [formData]);

  
    // load max length metadata once
    useEffect(() => {
      let mounted = true;

      (async () => {
        const res = await useFieldLenghtCheck("RC_MAST");
        if (mounted) setTblFieldArray(res || []);
      })();

      return () => { mounted = false; };
    }, []);

    const getMax = (col) => useGetFieldLength(tblFieldArray, col);


  return (
    <div className="global-ref-main-div-ui">
      {(isDropdownLoading || isListLoading || isSaving || isDeleting)  && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-semibold animate-pulse">{isSaving ? "Saving..." : isDeleting ? "Deleting..." : "Loading..."}</span>
          </div>
        </div>
      )}

      {/* Lookup Modals */}
      {/* <SearchCOAClassRef isOpen={modals.coaClass} onClose={(v) => { toggleModal("coaClass", false); if(v) updateForm({ classCode: v.classCode, className: v.className }) }} /> */}
      
      {/* Header Section */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">

          {/* 1) Title */}
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {activeTab === "coa" && "Chart of Accounts"}
              {activeTab === "rctype" && "RC Reference Type"}
            </h1>
          </div>

          {/* 2) Tabs */}
          <div className="w-full md:justify-center flex">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
                {[
                  { id: "coa", label: "Chart of Accounts" },
                  { id: "rctype", label: "RC Reference Type" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 whitespace-nowrap px-3 py-2 text-[12px] sm:text-[12px] font-bold transition-all border-b-2
                      ${activeTab === tab.id
                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3) Buttons + Info */}
          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">

              {/* ButtonBar: allow wrapping on mobile */}
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="hidden sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: () => { resetForm(); setIsEditing(true); },
                      className:
                        "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: <span className="hidden sm:inline ml-1">Save</span>,
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving || activeTab !== "coa",
                      className: `flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                        ${(!isEditing || isSaving || activeTab !== "coa")
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                        }`,
                    },
                    {
                      key: "reset",
                      label: <span className="hidden sm:inline ml-1">Reset</span>,
                      icon: faUndo,
                      onClick: resetForm,
                      className:
                        "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                  ]}
                />
              </div>

              {/* Info Dropdown */}
              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="hidden sm:inline ml-1 text-[11px] font-medium">Info</span>
                  <FontAwesomeIcon icon={faChevronDown} className="hidden sm:inline text-[10px] opacity-80" />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => { window.open(pdfLink, "_blank"); setOpenGuide(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
                    </button>
                    <button
                      onClick={() => { window.open(videoLink, "_blank"); setOpenGuide(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>


      {/* Main Content */}
      {activeTab === "rcmast" && (
        <>
          <div className="mt-44 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
            
            {/* LEFT DIV: Main Form Fields (Takes 75% of width on large screens) */}
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              {/* Sub-Column 1 (Internal Grid) */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <FieldRenderer
                      label="RC Code"
                      required
                      type="text"
                      value={formData.rcCode}
                      disabled={!isEditing || (isEditing && selectedRcCode)}
                      onChange={(v) => updateForm({ rcCode: v })}
                      onBlur={(e) => handleCheckDuplicate(e.target.value)} 
                      maxLength={getMax("RC_CODE")}
                    />

                      <FieldRenderer
                        label="RC Name"
                        required
                        type="text"
                        value={formData.rcName}
                        disabled={!isEditing}
                        onChange={(v) => updateForm({ rcName: v })}
                        maxLength={getMax("RC_NAME")}
                      />


                    <FieldRenderer
                      label="RC TYpe"
                      required
                      type="text"
                      value={formData.rcTypeCode}
                      disabled={!isEditing}
                      onChange={(v) => updateForm({ rcTypeCode: v })}
                      maxLength={getMax("RCTYPE_CODE")}
                    />

                  <FieldRenderer
                    label="RC Group"
                    required
                    type="select"
                    value={formData.rcGroup}
                    disabled={!isEditing}
                    options={[
                      { value: "Y", label: "Yes" },
                      { value: "N", label: "No" },
                    ]}
                    onChange={(v) => updateForm({ rcGroup: v })}
                  />
                   <FieldRenderer
                    label="Group Code"
                    required
                    type="select"
                    value={formData.reqRC}
                    disabled={!isEditing}
                    options={[
                      { value: "Y", label: "Yes" },
                      { value: "N", label: "No" },
                    ]}
                    onChange={(v) => updateForm({ reqRC: v })}
                  />

                   <FieldRenderer
                    label="Active"
                    type="select"
                    value={formData.active}
                    disabled={!isEditing}
                    options={[
                      { value: "Y", label: "Yes" },
                      { value: "N", label: "No" },
                    ]}
                    onChange={(v) => updateForm({ active: v })}
                  />

                 </div>
              </div>

            </div>
            
            {/* RIGHT: Registration Info */}
            <div className="w-full lg:w-[320px]">
              <RegistrationInfo layout="stacked" data={registrationInfo} />
            </div>

          </div>

          {/* Table Section */}
          <div className="global-tran-table-main-div-ui mt-4">
            <SearchGlobalReferenceTable
              docType={docType}
              columns={columns}
              data={accounts}
              isLoading={isListLoading}
              onRowDoubleClick={handleEdit}
              itemsPerPage={50}
            />
          </div>
        </>
      )}



    </div>
  );
};

export default RCMast;