import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Import Lookup Modals
import SearchCOAClassRef from "@/NAYSA Cloud/Lookup/SearchCOAClassRef";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// Icons & Globals
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUndo, faEdit, faTrashAlt, faInfoCircle, faChevronDown, faFilePdf, faVideo } from "@fortawesome/free-solid-svg-icons";
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import { useSwalErrorAlert, useSwalSuccessAlert, useSwalErrorAlertAPI, useSwalDeleteConfirm, useSwalDeleteRecord, useSwalProceedConfirm  } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useFieldLenghtCheck, useGetFieldLength,} from '@/NAYSA Cloud/Global/procedure';
import { Plus, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// UI Helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

// Tabs
import FSConso from "@/NAYSA Cloud/Master Data/ChartofAccounts/FSConsolidation.jsx";
import GLFSMatching from "@/NAYSA Cloud/Master Data/ChartofAccounts/GLFSMatching.jsx";

// Initial Form State
const INITIAL_FORM = {
  acctCode: "", acctName: "", classCode: "REG" , className: "Regular Account" ,acctType: "BS", acctGroup: "A",
  acctBalance: "DR", reqSL: "N", reqRC: "N", fsConsoCode: "", fsConsoName: "",
  oldCode: "", active: "Y", contraAccount: "", reqBudget: "N",
  tblFieldArray :[],
};

// Initial Form State for Registration Info
const INITIAL_REG = { registeredBy: "", registeredDate: "", lastUpdatedBy: "", lastUpdatedDate: "" };


// Main Component
const COAMast = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const docType = "COAMast";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];
  
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAcctCode, setSelectedAcctCode] = useState(null);
  const [modals, setModals] = useState({ coaClass: false, guide: false });
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [activeTab, setActiveTab] = useState("coa");
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const formTopRef = useRef(null);
  const allowedDuplicateAcctNameRef = useRef("");

  const coaTabs = [
    { id: "coa", label: "Chart of Accounts" },
    { id: "fsconso", label: "FS Consolidation" },
    { id: "glmatching", label: "GL - FS Matching" },
  ];

  const toggleModal = (name, isOpen) => setModals(prev => ({ ...prev, [name]: isOpen }));

  // --- TANSTACK QUERY: Fetch Dropdowns & List ---
  const { data: dropdowns, isLoading: isDropdownLoading } = useQuery({
    queryKey: ["coaDropdowns"],
    queryFn: async () => {
      const [bal, grp, typ, cls] = await Promise.all([
        useTopDocDropDown("COAMAST", "NBAL"),
        useTopDocDropDown("COAMAST", "ACCT_GRP"),
        useTopDocDropDown("COAMAST", "ACCT_TYPE"),
        useTopDocDropDown("COAMAST", "ACCT_CLASS"),
      ]);
      return { bal, grp, typ, cls };
    }
  });

  const { data: accounts = [], isLoading: isListLoading } = useQuery({
    queryKey: ["coaList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/cOA");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  // --- TANSTACK QUERY: Save Mutation ---
  const { mutate: saveCOA, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertCOA", payload),
  
    // SPROC result (errorcount/errormsg)
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save Branch.");
        resetForm();
        return;
      }
  
      // API status
      const status = response?.data?.status ?? response?.data?.data?.status;
      const success = response?.data?.success || status === "success" || !status;
  
      if (!success) {
        useSwalErrorAlert(
          "Error",
          response?.data?.message ||
            response?.data?.data?.message ||
            "Failed to save Account."
        );
        resetForm();
        return;
      }
  
      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["coaList"] });
      useSwalSuccessAlert("Success!", "Account saved successfully!");
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

  const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

  const findDuplicateAcctName = (acctName = formData.acctName) => {
    const normalizedName = normalizeText(acctName);

    if (!normalizedName) return null;

    return accounts.find((account) => {
      const sameName = normalizeText(account?.acctName) === normalizedName;
      const sameCode = normalizeText(account?.acctCode) === normalizeText(selectedAcctCode || formData.acctCode);

      return sameName && !sameCode;
    });
  };

  const confirmDuplicateAcctName = async (acctName = formData.acctName) => {
    const duplicateRecord = findDuplicateAcctName(acctName);

    if (!duplicateRecord) return true;

    const normalizedName = normalizeText(acctName);

    if (allowedDuplicateAcctNameRef.current === normalizedName) return true;

    const result = await useSwalProceedConfirm(
      "Duplicate Account Name",
      `Account Name ${acctName} already exists in Account Code ${duplicateRecord.acctCode}.\n\nDo you want to proceed?`,
      "Yes, Proceed"
    );

    if (result.isConfirmed) {
      allowedDuplicateAcctNameRef.current = normalizedName;
      return true;
    }

    allowedDuplicateAcctNameRef.current = "";
    updateForm({ acctName: "" });
    return false;
  };

  const handleAcctNameChange = (value) => {
    allowedDuplicateAcctNameRef.current = "";
    updateForm({ acctName: value });
  };

  const handleAcctNameBlur = async () => {
    if (!isEditing || !formData.acctName) return;
    await confirmDuplicateAcctName(formData.acctName);
  };

  // --- ACTIONS ---
  const handleSave = async () => {
    const canProceed = await confirmDuplicateAcctName(formData.acctName);
    if (!canProceed) return;
  
    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          action: selectedAcctCode ? "EDIT" : "ADD",
          userCode: user?.USER_CODE || "ADMIN",
        }
      })
    };
    saveCOA(payload);
  };


  
  // --- MUTATION: UPSERT ---
  

  const resetForm = () => {
    allowedDuplicateAcctNameRef.current = "";
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedAcctCode(null);
    setIsEditing(false);

    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

  };

  const handleEdit = (row) => {
    const classNameFromRow = row.className;

    const classNameFromDropdown =
      dropdowns?.cls?.find(d => d.DROPDOWN_CODE === row.classCode)?.DROPDOWN_NAME || "";

    setSelectedAcctCode(row.acctCode);

    setFormData({
      ...INITIAL_FORM,
      ...row,
      classCode: row.classCode,
      className: classNameFromRow || classNameFromDropdown,
    });

    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate
    });

    console.log("Edit Row:", row);

    setIsEditing(true);
    setIsMobileActionSheetOpen(false); // close sheet after action

    // if (isMobile) {
    //   setTimeout(() => {
    //     formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    //   }, 200);
    // }

    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

  };  


  
const { mutate: deleteCOA, isLoading: isDeleting } = useMutation({
  mutationFn: async (payload) => await apiClient.post("/deleteCOA", payload),
  onSuccess: (response) => {
    queryClient.invalidateQueries(["coaList"]);
    useSwalDeleteRecord("Deleted!", "The account has been removed from the system.");
    resetForm();
  },
  onError: (error) => useSwalErrorAlertAPI("Delete Error", error)
});



const handleDelete = async (row) => {
  try {
    if (!row?.acctCode) {
      return useSwalErrorAlertAPI("Delete Error", "No account code found.");
    }

    setIsLoading(true);

    const payload = {
      json_data: {
        acctCode: row.acctCode,
      },
    };

    // 1. Check if used in other tables via SPROC
    const response = await apiClient.post("/checkInUsedCOA", payload);
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (String(parsedData.result) === "1") {
      return useSwalErrorAlertAPI(
        `Cannot Delete Account Code: ${row.acctCode}`,
        "Code was already used."
      );
    }

    // 2. Confirmation
    const confirm = await useSwalDeleteConfirm(
      "Confirm Delete",
      `Are you sure you want to delete Code: ${row.acctCode}?`
    );

    if (!confirm?.isConfirmed) return;

    // 3. Delete
    await apiClient.post("/deleteCOA", payload);

    await queryClient.invalidateQueries({ queryKey: ["coaList"] });

    await useSwalDeleteRecord(
      "Deleted!",
      "The account has been removed from the system."
    );

    resetForm();
  } catch (error) {
    useSwalErrorAlertAPI(
      "System Error",
      error?.response?.data?.message || error?.message || "Delete failed."
    );
  } finally {
    setIsLoading(false);
  }
};


// --- VALIDATION: Check for Duplicate Code ---
const handleCheckDuplicate = async (code) => {
  
  if (isEditing && selectedAcctCode) return; 
  if (!code) return;

  try {
    const payload = { json_data: { acctCode: code } };
    const response = await apiClient.post("/checkDuplicateCOA", payload);
    
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (parsedData.result === "1") {
      setIsLoading(false);
      resetForm();
      return useSwalErrorAlertAPI(
        `Duplicate Account Code: ${code}`, 
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
    {
  key: "__actions",
  label: <span className="hidden md:inline">Actions</span>,
  width: 90,
  minWidth: 90,
  render: (row) => (
    <div className="flex gap-2 justify-center w-full">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isMobile) {
            openMobileActionSheet(row);
          } else {
            handleEdit(row);
          }
        }}
        className="global-ref-td-button-edit-ui"
        title="Edit"
      >
        <FontAwesomeIcon icon={faEdit} />
        <span className="md:hidden">Edit</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isMobile) {
            openMobileActionSheet(row);
          } else {
            handleDelete(row);
          }
        }}
        className="global-ref-td-button-delete-ui"
        title="Delete"
      >
        <FontAwesomeIcon icon={faTrashAlt} />
        <span className="md:hidden">Delete</span>
      </button>
    </div>
  ),
},

  { key: "acctCode", label: "Account Code", sortable: true, width: 120, pinned: true, requiredVisible: true },
  { key: "acctName", label: "Account Name", sortable: true, width: 250, maxWidth: 300, requiredVisible: true },

  {
    key: "acctType",
    label: "Account Type",
    sortable: true,
    width: 130 ,
    render: (row) => {
      const match = dropdowns?.typ?.find((d) => d.DROPDOWN_CODE === row.acctType);
      return match ? match.DROPDOWN_NAME : row.acctType;
    },
  },

  {
    key: "acctGroup",
    label: "Account Group",
    sortable: true,
    width: 130 ,
    render: (row) => {
      const match = dropdowns?.grp?.find((d) => d.DROPDOWN_CODE === row.acctGroup);
      return match ? match.DROPDOWN_NAME : row.acctGroup;
    },
  },

  {
    key: "acctBalance",
    label: "Normal Balance",
    sortable: true,
    width: 130 ,
    render: (row) => {
      const match = dropdowns?.bal?.find((d) => d.DROPDOWN_CODE === row.acctBalance);
      return match ? match.DROPDOWN_NAME : row.acctBalance;
    },
  },

  { 
    key: "reqSL", 
    label: "SL Required", 
    width: 110 ,
    sortable: true,
    render: (row) => (row.reqSL === "Y" ? "Yes" : "No") 
  },

  { 
    key: "reqRC", 
    label: "RC Required", 
    width: 110 ,
    sortable: true,
    render: (row) => (row.reqRC === "Y" ? "Yes" : "No") 
  },

  {
    key: "classCode",
    label: "Classification",
    width: 170 ,
    sortable: true,
    render: (row) => {
      const match = dropdowns?.cls?.find((d) => d.DROPDOWN_CODE === row.classCode);
      return match ? match.DROPDOWN_NAME : row.classCode;
    },
  },

  { key: "oldCode", label: "Old Code", sortable: true, width: 100 },

  { 
    key: "active", 
    label: "Active", 
    sortable: true,
    width: 100 ,
    render: (row) => (row.active === "Y" ? "Yes" : "No") 
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
        const res = await useFieldLenghtCheck("COA_MAST");
        if (mounted) setTblFieldArray(res || []);
      })();

      return () => { mounted = false; };
    }, []);

    const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openMobileActionSheet = (row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);

    requestAnimationFrame(() => {
      setIsMobileActionSheetOpen(true);
    });
  };

  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);

    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  };

  return (
    <div className="global-ref-main-div-ui">
      
          {/* {(isDropdownLoading || isListLoading || isDeleting) && <LoadingSpinner />} */}
    {(isDropdownLoading || isListLoading || isSaving || isDeleting) && <LoadingSpinner />}
    

      {/* Lookup Modals */}
      <SearchCOAClassRef isOpen={modals.coaClass} onClose={(v) => { toggleModal("coaClass", false); if(v) updateForm({ classCode: v.classCode, className: v.className }) }} />
      
      {/* Header Section */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">

          {/* 1) Title */}
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {activeTab === "coa" && "Chart of Accounts"}
              {activeTab === "fsconso" && "FS Consolidation"}
              {activeTab === "glmatching" && "GL Account - FS Matching"}
            </h1>
          </div>

          {/* 2) Tabs */}
          <div className="w-full md:justify-center flex">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                {[
                  { id: "coa", label: "Chart of Accounts" },
                  { id: "fsconso", label: "FS Consolidation" },
                  { id: "glmatching", label: "GL - FS Matching" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2  rounded-md
                      ${activeTab === tab.id
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

          {/* 3) Buttons + Info */}
          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">

              {/* ButtonBar: allow wrapping on mobile */}
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: () => { resetForm(); setIsEditing(true); },
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                    {
                      key: "save",
                      label: <span className="sm:inline ml-1">Save</span>,
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || isSaving || activeTab !== "coa",
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                        ${(!isEditing || isSaving || activeTab !== "coa")
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                        }`,
                    },
                    {
                      key: "reset",
                      label: <span className="sm:inline ml-1">Reset</span>,
                      icon: faUndo,
                      onClick: resetForm,
                      className:
                        "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                    },
                  ]}
                />
              </div>

              {/* Info Dropdown */}
              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-16 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="sm:inline ml-1 text-[11px] font-medium">Info</span>
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
      {activeTab === "coa" && (
        <>
          <div ref={formTopRef} className="mt-40 sm:mt-24 flex flex-col lg:flex-row lg:items-stretch gap-2">
           
            {/* LEFT DIV: Main Form Fields (Takes 75% of width on large screens) */}
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
             
              {/* Sub-Column 1 (Internal Grid) */}
              <div className="space-y-6">
                
                <div className="grid grid-cols-2 gap-3">
                  <FieldRenderer
                    label="Account Code"
                    required
                    type="text"
                    value={formData.acctCode}
                    disabled={!isEditing || (isEditing && selectedAcctCode)}
                    onChange={(v) => updateForm({ acctCode: v })}
                    onBlur={(e) => handleCheckDuplicate(e.target.value)} 
                    maxLength={getMax("ACCT_CODE")}
                  />
                  <FieldRenderer
                    label="Old Code"
                    type="text"
                    value={formData.oldCode}
                    disabled={!isEditing}
                    onChange={(v) => updateForm({ oldCode: v })}
                    maxLength={getMax("OLD_CODE")}
                  />
                </div>

                <FieldRenderer
                  label="Account Name"
                  required
                  type="text"
                  value={formData.acctName}
                  disabled={!isEditing}
                  onChange={handleAcctNameChange}
                  onBlur={handleAcctNameBlur}
                  maxLength={getMax("ACCT_NAME")}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FieldRenderer
                    label="Account Type"
                    required
                    type="select"
                    value={formData.acctType}
                    disabled={!isEditing}
                    options={dropdowns?.typ?.map((d) => ({
                      value: d.DROPDOWN_CODE,
                      label: d.DROPDOWN_NAME,
                    }))}
                    onChange={(v) => updateForm({ acctType: v })}
                  />
                  <FieldRenderer
                    label="Account Group"
                    required
                    type="select"
                    value={formData.acctGroup}
                    disabled={!isEditing}
                    options={dropdowns?.grp?.map((d) => ({
                      value: d.DROPDOWN_CODE,
                      label: d.DROPDOWN_NAME,
                    }))}
                    onChange={(v) => updateForm({ acctGroup: v })}
                  />
                </div>
              </div>

              {/* Sub-Column 2 (Internal Grid) */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <FieldRenderer
                    label="Normal Balance"
                    required
                    type="select"
                    value={formData.acctBalance}
                    disabled={!isEditing}
                    options={dropdowns?.bal?.map((d) => ({
                      value: d.DROPDOWN_CODE,
                      label: d.DROPDOWN_NAME,
                    }))}
                    onChange={(v) => updateForm({ acctBalance: v })}
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

                <FieldRenderer
                  label="Classification"
                  required
                  type="lookup"
                  value={formData.className || formData.classCode}
                  disabled={!isEditing}
                  onLookup={() => toggleModal("coaClass", true)}
                  readOnly
                />

                <div className="grid grid-cols-2 gap-3">
                  <FieldRenderer
                    label="SL Req."
                    required
                    type="select"
                    value={formData.reqSL}
                    disabled={!isEditing}
                    options={[
                      { value: "Y", label: "Yes" },
                      { value: "N", label: "No" },
                    ]}
                    onChange={(v) => updateForm({ reqSL: v })}
                  />
                  <FieldRenderer
                    label="RC Req."
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
              onRowDoubleClick={handleEdit}
              itemsPerPage={200}
              onMobileRowOpen={openMobileActionSheet}
              isLoading={accounts.isLoading}
              isFetching={accounts.isFetching}
              onRefresh={() => accounts.refetch()}
            />
          </div>
        </>
      )}


        {activeTab === "fsconso" && (
          <div className="mt-4">
            <FSConso
              embedded={true}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabs={coaTabs}
            />
          </div>
        )}

        {activeTab === "glmatching" && (
          <div className="mt-4">
            <GLFSMatching
              embedded={true}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabs={coaTabs}
            />
          </div>
        )}

        
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
        <h2 className="text-sm font-bold text-gray-800">Account Actions</h2>
        <p className="text-xs text-gray-500">
          {selectedMobileRow?.acctCode} {selectedMobileRow?.acctName ? `- ${selectedMobileRow.acctName}` : ""}
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleEdit(selectedMobileRow)}
          className="global-ref-td-button-edit-ui-mobile"
        >
          <FontAwesomeIcon icon={faEdit} />
          Edit
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile) {
              closeMobileActionSheet();
              handleDelete(selectedMobileRow);
            } else {
              handleDelete(selectedMobileRow);
            }
          }}
          className="global-ref-td-button-delete-ui-mobile"
          title="Delete"
        >
          <FontAwesomeIcon icon={faTrashAlt} />
          <span className="md:hidden">Delete</span>
        </button>

        <button
          onClick={closeMobileActionSheet}
          className="global-ref-td-button-cancel-ui-mobile"
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

export default COAMast;