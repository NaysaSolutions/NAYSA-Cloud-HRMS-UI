import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useFieldLenghtCheck, useGetFieldLength,} from '@/NAYSA Cloud/Global/procedure';

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
  faEye,
} from "@fortawesome/free-solid-svg-icons";

import {
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior";

const DOC_TYPE = "SLMast";

const INITIAL_SL_FORM = {
  slTypeCode: "",
  slTypeName: "",
  slCode: "",
  slName: "",
  slAddress1: "",
  slAddress2: "",
  slAddress3: "",
  slTin: "",
  slActive: "Y",
  tblFieldArraySLMast :[],
};

const INITIAL_SLTYPE_FORM = {
  slTypeCode: "",
  slTypeName: "",
  slTypeActive: "Y",
  slTypeIncSu: "N",
  slTypeIncCu: "N",
  tblFieldArraySLType :[],
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

export default function SLMast() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("slmaster");
  const [selectedSLTypeCode, setSelectedSLTypeCode] = useState("");
  const [selectedSLCode, setSelectedSLCode] = useState(null);
  const [selectedSLTypeRow, setSelectedSLTypeRow] = useState(null);

  const [slForm, setSLForm] = useState(INITIAL_SL_FORM);
  const [slTypeForm, setSLTypeForm] = useState(INITIAL_SLTYPE_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);

  const [isEditingSL, setIsEditingSL] = useState(false);
  const [isEditingSLType, setIsEditingSLType] = useState(false);

  const [selectedGLAccounts, setSelectedGLAccounts] = useState([]);
  const [isGLMatchingLoaded, setIsGLMatchingLoaded] = useState(false);

  const [isOpenGuide, setOpenGuide] = useState(false);
  const guideRef = useRef(null);

  const pdfLink = reftablesPDFGuide?.[DOC_TYPE];
  const videoLink = reftablesVideoGuide?.[DOC_TYPE];

  const [tblFieldArraySLMast, setTblFieldArraySLMast] = useState([]);
  const [tblFieldArraySLType, setTblFieldArraySLType] = useState([]);

  const { data: slTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ["slTypeList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/slType");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  const { data: slMasterList = [], isLoading: isLoadingSL } = useQuery({
    queryKey: ["slMasterList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sLMast");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  const { data: slCoaList = [], isLoading: isLoadingSLCoa } = useQuery({
    queryKey: ["slCoaList", selectedSLTypeCode, isGLMatchingLoaded],
    enabled: !!selectedSLTypeCode && isGLMatchingLoaded,
    queryFn: async () => {
      const { data } = await apiClient.get("/sLCoa", {
        params: {
          mode: "Load_slCoa",
          slTypeCode: selectedSLTypeCode,
        },
      });

      const raw = data?.data?.[0]?.result ?? data?.result;
      return raw ? JSON.parse(raw) : [];
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  const selectedSLType = useMemo(() => {
    return slTypes.find((x) => x.slTypeCode === selectedSLTypeCode) || null;
  }, [slTypes, selectedSLTypeCode]);

  const filteredSLMasterList = useMemo(() => {
    if (!selectedSLTypeCode) return [];
    return slMasterList.filter((x) => x.slTypeCode === selectedSLTypeCode);
  }, [slMasterList, selectedSLTypeCode]);

  const matchedGLAccounts = useMemo(() => {
    if (!isGLMatchingLoaded) return [];
    return slCoaList.filter(
      (x) => String(x.value).toLowerCase() === "true"
    );
  }, [slCoaList, isGLMatchingLoaded]);

  useEffect(() => {
    setSelectedGLAccounts(matchedGLAccounts.map((x) => x.acctCode));
  }, [matchedGLAccounts]);

  const canAddSL = useMemo(() => {
    if (!selectedSLType) return false;
    return selectedSLType.slTypeIncCu !== "Y" && selectedSLType.slTypeIncSu !== "Y";
  }, [selectedSLType]);

  const canDeleteSL = useMemo(() => {
    if (!selectedSLType) return false;
    return !(selectedSLType.slTypeIncCu === "Y" || selectedSLType.slTypeIncSu === "Y");
  }, [selectedSLType]);

  const displayedSLCoaList = useMemo(() => {
    return isGLMatchingLoaded ? slCoaList : [];
  }, [slCoaList, isGLMatchingLoaded]);

  const allGLAccountCodes = useMemo(() => {
    return displayedSLCoaList.map((x) => x.acctCode);
  }, [displayedSLCoaList]);

  const isAllSelected = useMemo(() => {
    if (!allGLAccountCodes.length) return false;
    return allGLAccountCodes.every((code) =>
      selectedGLAccounts.includes(code)
    );
  }, [allGLAccountCodes, selectedGLAccounts]);



// --- VALIDATION: Check for Duplicate Code ---
const handleCheckDuplicateSLMast = async (code) => {
  
  if (isEditingSL && selectedSLCode) return; 
  if (!code) return;

  try {
    const payload = { json_data: { slCode: code } };
    const response = await apiClient.post("/checkDuplicateSLMast", payload);
    
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (parsedData.result === "1") {
      resetSLForm();
      return useSwalErrorAlertAPI(
        `Duplicate SL Code: ${code}`, 
        `Code was already used.`
      );
    }

  } catch (error) {
    console.error("Duplicate Check Error:", error);
  }
};

// --- VALIDATION: Check for Duplicate Code ---
const handleCheckDuplicateSLType = async (code) => {
  
  if (isEditingSLType && selectedSLTypeCode) return; 
  if (!code) return;

  try {
    const payload = { json_data: { slTypeCode: code } };
    const response = await apiClient.post("/checkDuplicateSLType", payload);
    
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    if (parsedData.result === "1") {
      resetSLTypeForm();
      return useSwalErrorAlertAPI(
        `Duplicate SL Type Code: ${code}`, 
        `Code was already used.`
      );
    }

  } catch (error) {
    console.error("Duplicate Check Error:", error);
  }
};


  const updateSLForm = (updates) =>
    setSLForm((prev) => ({ ...prev, ...updates }));

  const updateSLTypeForm = (updates) =>
    setSLTypeForm((prev) => ({ ...prev, ...updates }));

  const resetSLForm = () => {
    setSLForm({
      ...INITIAL_SL_FORM,
      slTypeCode: selectedSLType?.slTypeCode || "",
      slTypeName: selectedSLType?.slTypeName || "",
    });
    setSelectedSLCode(null);
    setIsEditingSL(false);
    setRegistrationInfo(INITIAL_REG);
  };

  const resetSLTypeForm = () => {
    setSLTypeForm(INITIAL_SLTYPE_FORM);
    setSelectedSLTypeRow(null);
    setIsEditingSLType(false);
    setIsGLMatchingLoaded(false);
    setSelectedGLAccounts([]);
  };

  const handleEditSL = (row) => {
    setSelectedSLCode(row.slCode);
    setSLForm({
      slTypeCode: row.slTypeCode || "",
      slTypeName: row.slTypeName || "",
      slCode: row.slCode || "",
      slName: row.slName || "",
      slAddress1: row.slAddress1 || "",
      slAddress2: row.slAddress2 || "",
      slAddress3: row.slAddress3 || "",
      slTin: row.slTin || "",
      slActive: row.slActive || "Y",
    });
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });
    setIsEditingSL(true);
  };

  const handleEditSLType = (row) => {
    setSelectedSLTypeRow(row);
    setSLTypeForm({
      slTypeCode: row.slTypeCode || "",
      slTypeName: row.slTypeName || "",
      slTypeActive: row.slTypeActive || "Y",
      slTypeIncSu: row.slTypeIncSu || "N",
      slTypeIncCu: row.slTypeIncCu || "N",
    });
    setSelectedSLTypeCode(row.slTypeCode || "");
    setIsEditingSLType(true);
    setIsGLMatchingLoaded(false);
    setSelectedGLAccounts([]);
  };

  const handleViewGLMatching = (row) => {
    setSelectedSLTypeCode(row.slTypeCode || "");
    setSelectedSLTypeRow(row);
    setSLTypeForm({
      slTypeCode: row.slTypeCode || "",
      slTypeName: row.slTypeName || "",
      slTypeActive: row.slTypeActive || "Y",
      slTypeIncSu: row.slTypeIncSu || "N",
      slTypeIncCu: row.slTypeIncCu || "N",
    });
    setIsGLMatchingLoaded(true);
    setIsEditingSLType(false);
  };

  // --- MUTATION: UPSERT ---
  const { mutate: saveSL, isLoading: isSavingSL } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertSLMast", payload),

    onSuccess: (response) => {
      // 1) SPROC row style (errorcount/errormsg)
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save SL Code.");
        resetSLForm(); // ✅ reset on failure
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
            "Failed to save SL Code."
        );
        resetSLForm(); // ✅ reset on failure
        return;
      }

      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["slMasterList"] });
      useSwalSuccessAlert("Success!", "Record saved successfully!");
      resetSLForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
      resetSLForm(); // ✅ reset on request error too
    },
  });

  const { mutate: deleteSL, isLoading: isDeletingSL } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteSLMast", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slMasterList"] });
      useSwalDeleteRecord("Deleted!", "Record deleted successfully");
      resetSLForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  // --- MUTATION: UPSERT ---
  const { mutate: saveSLType, isLoading: isSavingSLType } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertSLType", payload),

    onSuccess: (response) => {
      // 1) SPROC row style (errorcount/errormsg)
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save SL Type.");
        resetSLTypeForm(); // ✅ reset on failure
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
            "Failed to save SL Type."
        );
        resetSLTypeForm(); // ✅ reset on failure
        return;
      }

      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["slTypeList"] });
      useSwalSuccessAlert("Success!", "Record saved successfully!");
      resetSLTypeForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
      resetSLTypeForm(); // ✅ reset on request error too
    },
  });

    // --- MUTATION: DELETE ---
    const { mutate: deleteSLType, isLoading: isDeletingSLType } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteSLType", payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["slTypeList"] });
      queryClient.invalidateQueries({ queryKey: ["slCoaList"] });
      useSwalDeleteRecord("Deleted!", "Record deleted successfully.");
      resetSLTypeForm();
      setSelectedSLTypeCode("");
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error)
  });

  // --- MUTATION: UPSERT ---
  const { mutate: saveMatching, isLoading: isSavingMatching } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/upsertSLTypeGLMatching", payload),

    onSuccess: (response) => {
      // 1) SPROC row style (errorcount/errormsg)
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save SL - GL Matching.");
        // resetSLTypeForm(); // ✅ reset on failure
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
            "Failed to save SL - GL Matching."
        );
        // resetSLTypeForm(); // ✅ reset on failure
        return;
      }

      // ✅ success path
      queryClient.invalidateQueries({ queryKey: ["slCoaList"] });
      useSwalSuccessAlert("Success!", "Record saved successfully!");
      // resetSLTypeForm();
    },

    onError: (error) => {
      useSwalErrorAlertAPI(
        "System Error",
        error?.response?.status ? `HTTP ${error.response.status}` : error?.message || String(error)
      );
      // resetSLTypeForm(); // ✅ reset on request error too
    },
  });

  const handleSaveSL = () => {

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...slForm,
          action: selectedSLCode ? "EDIT" : "ADD",
          userCode: user?.USER_CODE || "ADMIN",
        },
      }),
    };

    saveSL(payload);
    console.log("Save SL Mast:",payload)
  };


  const handleDeleteSL = async (row) => {
    // 1. Initial restriction check based on SL Type
    if (!canDeleteSL) {
      return useSwalErrorAlert(
        "Delete Restricted",
        "Delete is not allowed for SL Type Payee and Customer."
      );
    }

    try {
      // 2. API Check: Is the SL Code used in any transaction tables?
      // We send the data in the format the SPROC expects: { json_data: { slCode: '...' } }
      const checkRes = await apiClient.post("/checkInUsedSLMast", {
        json_data: { slCode: row.slCode }
      });

      // 3. Parse the SPROC result
      const sqlRow = checkRes?.data?.data?.[0];
      const parsedData = JSON.parse(sqlRow?.result || '{"result":"0"}');

      // 4. If result is "1", the SL is used in tables like apv_dt1, cv_dt1, etc.
      if (parsedData.result === "1") {
        return useSwalErrorAlert(
          "Cannot Delete",
          `SL Code "${row.slCode}" is currently used in transactions and cannot be removed.`
        );
      }

      // 5. Proceed to confirmation if NOT in use
      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete SL Code: ${row.slCode}?`
      );

      if (!confirm?.isConfirmed) return;

      // 6. Execute actual deletion
      deleteSL({
        json_data: {
          slTypeCode: row.slTypeCode,
          slCode: row.slCode,
        },
      });

    } catch (error) {
      console.error("In-Use Check Error:", error);
      useSwalErrorAlert("System Error", "Failed to verify if record is in use.");
    }
  };

  const handleSaveSLType = () => {
 
    const payload = {
      json_data: JSON.stringify({
        json_data: {
          ...slTypeForm,
          action: isEditingSLType ? "EDIT" : "ADD",
          userCode: user?.USER_CODE || "ADMIN",
        },
      }),
    };

    saveSLType(payload);

    console.log("Save SL Type:",payload)
  };

const handleDeleteSLType = async (row) => {
    try {
      // 1. API Check: Is this SL Type linked to any Master records?
      // Matches SPROC @mode = 'CheckInUsedSLType'
      const checkRes = await apiClient.post("/checkInUsedSLType", { 
        json_data: { slTypeCode: row.slTypeCode } 
      });
      
      // 2. Parse the stringified JSON result from the SPROC
      const sqlRow = checkRes?.data?.data?.[0];
      const parsedData = JSON.parse(sqlRow?.result || '{"result":"0"}');

      // 3. If result is "1", it exists in sl_mast, cust_mast, or vend_mast
      if (parsedData.result === "1") {
        return useSwalErrorAlert(
        `Cannot Delete Account Code: ${row.slTypeCode}`,
        "Code was already used."
      );
      }

      // 4. Proceed to confirmation if NOT in use
      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete SL Type: ${row.slTypeCode}?`
      );

      if (!confirm?.isConfirmed) return;

      // 5. Execute actual deletion
      deleteSLType({
        json_data: {
          slTypeCode: row.slTypeCode,
        },
      });
      
    } catch (error) {
      console.error("In-Use Check Error:", error);
      useSwalErrorAlert("System Error", "Failed to verify if SL Type is in use.");
    }
  };

  const handleSaveMatching = () => {
    if (!selectedSLTypeCode) {
      return useSwalErrorAlert("Validation Error", "Please select an SL Type.");
    }

    if (!isGLMatchingLoaded) {
      return useSwalErrorAlert(
        "Validation Error",
        "Please click View GL Matching first."
      );
    }

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          slTypeCode: selectedSLTypeCode,
          acctCodes: selectedGLAccounts,
          userCode: user?.USER_CODE || "ADMIN",
        },
      }),
    };

    saveMatching(payload);
    console.log("Save SL-GL Matching:",payload)
  };

  const toggleGLSelection = (acctCode) => {
    setSelectedGLAccounts((prev) =>
      prev.includes(acctCode)
        ? prev.filter((x) => x !== acctCode)
        : [...prev, acctCode]
    );
  };

  const handleToggleSelectAllGL = () => {
    setSelectedGLAccounts((prev) =>
      isAllSelected ? [] : allGLAccountCodes
    );
  };

  const handleSelectAllGL = () => {
    setSelectedGLAccounts(allGLAccountCodes);
  };

  const handleClearAllGL = () => {
    setSelectedGLAccounts([]);
  };

  const slMasterColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        sortable: false,
        width: 90,
        minWidth: 90,
        render: (row) => (
          <div className="flex gap-1 justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditSL(row);
              }}
              disabled={!canDeleteSL}
              className={`py-1 px-2 rounded-md transition-colors ${
                canDeleteSL
                  ? "bg-blue-100 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                  : "bg-gray-100 border border-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSL(row);
              }}
              disabled={!canDeleteSL}
              className={`py-1 px-2 rounded-md transition-colors ${
                canDeleteSL
                  ? "bg-red-100 border-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                  : "bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      { key: "slTypeCode", label: "SL Type Code", sortable: true },
      { key: "slTypeName", label: "SL Type Name", sortable: true },
      { key: "slCode", label: "SL Code", sortable: true },
      { key: "slName", label: "SL Name", sortable: true },
      { key: "slAddress1", label: "Address 1", sortable: true },
      { key: "slAddress2", label: "Address 2", sortable: true },
      { key: "slAddress3", label: "Address 3", sortable: true },
      { key: "slTin", label: "TIN", sortable: true },
      {
        key: "slActive",
        label: "Active",
        sortable: true,
        render: (row) => (row.slActive === "Y" ? "Y" : "N"),
      },
    ],
    [canDeleteSL]
  );

  const slTypeColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        sortable: false,
        width: 120,
        minWidth: 120,
        render: (row) => (
          <div className="flex gap-1 justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditSLType(row);
              }}
              className="py-1 px-2 bg-blue-100 text-blue-600 border border-blue-100 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSLType(row);
              }}
              className="py-1 px-2 bg-red-100 text-red-600 border border-red-100 rounded-md hover:bg-red-600 hover:text-white transition-colors"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewGLMatching(row);
              }}
              className="py-1 px-2 bg-blue-100 text-blue-600 border border-blue-100 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
              title="View GL Matching"
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
          </div>
        ),
      },
      { key: "slTypeCode", label: "SL Type Code", sortable: true, width: 120, minWidth: 120 },
      { key: "slTypeName", label: "SL Type Name", sortable: true, width: 200, minWidth: 200 },
      { key: "slTypeActive", label: "Active", sortable: true, width: 80, minWidth: 80 },
      { key: "slTypeIncSu", label: "Payee", sortable: true, width: 80, minWidth: 80 },
      { key: "slTypeIncCu", label: "Customer", sortable: true, width: 85, minWidth: 85 },
    ],
    []
  );

  const slCoaColumns = useMemo(
    () => [
      {
        key: "__check",
        label: (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleSelectAllGL}
              className="h-4 w-4 accent-blue-600"
              title={isAllSelected ? "Deselect All" : "Select All"}
            />
          </div>
        ),
        sortable: true,
        width: 30,
        minWidth: 30,
        
        render: (row) => (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={selectedGLAccounts.includes(row.acctCode)}
              onChange={() => toggleGLSelection(row.acctCode)}
              className="h-5 w-4 accent-blue-600"
            />
          </div>
        ),
      },
      {
        key: "acctCode",
        label: "Account Code",
        sortable: true,
        width: 120,  
        minWidth: 120,
      },
      {
        key: "acctName",
        label: "Account Name",
        sortable: true,
        width: 350,  
        minWidth: 350,
      },
    ],
    [selectedGLAccounts, isAllSelected]
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

      // load max length metadata once
      useEffect(() => {
        let mounted = true;
  
        (async () => {
          const resSLMast = await useFieldLenghtCheck("SL_MAST");
          if (mounted) setTblFieldArraySLMast(resSLMast || []);
          
          const resSLType = await useFieldLenghtCheck("SL_TYPE");
          if (mounted) setTblFieldArraySLType(resSLType || []);
        })();
  
        return () => { mounted = false; };
      }, []);
  
      const getMaxSLMast = (col) => useGetFieldLength(tblFieldArraySLMast, col);
      const getMaxSLType = (col) => useGetFieldLength(tblFieldArraySLType, col);
  

  return (
    <div className="global-ref-main-div-ui">
      {(isLoadingTypes ||
        isLoadingSL ||
        isLoadingSLCoa ||
        isSavingSL ||
        isDeletingSL ||
        isSavingSLType ||
        isDeletingSLType ||
        isSavingMatching) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              SL Master Data
            </h1>
          </div>

          <div className="w-full md:justify-center flex">
            <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
              {[
                { id: "slmaster", label: "SL Master Data" },
                { id: "sltype", label: "SL Type and SL-GL Matching" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-14 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
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
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        if (videoLink) window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
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

      {activeTab === "slmaster" && (
        <div className="mt-24 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="w-full lg:w-[320px]">
                <FieldRenderer
                  label="SL Type Filtering"
                  type="select"
                  value={selectedSLTypeCode}
                  options={slTypes.map((x) => ({
                    value: x.slTypeCode,
                    label: `${x.slTypeCode} - ${x.slTypeName}`,
                  }))}
                  onChange={(v) => {
                    const row = slTypes.find((x) => x.slTypeCode === v);

                    setSelectedSLTypeCode(v);
                    setSLForm({
                      ...INITIAL_SL_FORM,
                      slTypeCode: row?.slTypeCode || "",
                      slTypeName: row?.slTypeName || "",
                    });
                    setSelectedSLCode(null);
                    setRegistrationInfo(INITIAL_REG);
                    setIsEditingSL(false);
                  }}
                />
              </div>

              <ButtonBar
                buttons={[
                  {
                    key: "add",
                    label: <span className="sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: () => {
                      if (!canAddSL) {
                        return useSwalErrorAlert(
                          "Add Restricted",
                          "Adding is not allowed for SL Types Payee and Customer."
                        );
                      }

                      setIsEditingSL(true);
                      setSLForm({
                        ...INITIAL_SL_FORM,
                        slTypeCode: selectedSLType?.slTypeCode || "",
                        slTypeName: selectedSLType?.slTypeName || "",
                      });
                      setSelectedSLCode(null);
                    },
                    className:
                      "flex items-center justify-center h-8 px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                  {
                    key: "save",
                    label: <span className="sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: () => {
                      if (!canAddSL) {
                        return useSwalErrorAlert(
                          "Add Restricted",
                          "Saving is not allowed for SL Types Payee and Customer."
                        );
                      }

                      return handleSaveSL();
                    },
                    className:
                      "flex items-center justify-center h-8 px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                  {
                    key: "reset",
                    label: <span className="sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: resetSLForm,
                    className:
                      "flex items-center justify-center h-8 px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                ]}
              />
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <FieldRenderer
                label="SL Type Code"
                type="text"
                value={slForm.slTypeCode}
                disabled
                required
                maxLength={getMaxSLMast("SLTYPE_CODE")}
              />
              <FieldRenderer
                label="SL Type Name"
                type="text"
                value={slForm.slTypeName}
                disabled
                required
              />

              <FieldRenderer
                label="SL Code"
                type="text"
                value={slForm.slCode}
                disabled={!isEditingSL || !!selectedSLCode}
                onChange={(v) => updateSLForm({ slCode: v })}
                required
                maxLength={getMaxSLMast("SL_CODE")}
                onBlur={(e) => handleCheckDuplicateSLMast(e.target.value)} 
              />
              <FieldRenderer
                label="SL Name"
                type="text"
                value={slForm.slName}
                disabled={!isEditingSL || !canDeleteSL}
                onChange={(v) => updateSLForm({ slName: v })}
                required
                maxLength={getMaxSLMast("SL_NAME")}
              />

              <FieldRenderer
                label="Address 1"
                type="text"
                value={slForm.slAddress1}
                disabled={!isEditingSL || !canDeleteSL}
                onChange={(v) => updateSLForm({ slAddress1: v })}
                maxLength={getMaxSLMast("ADDRESS1")}
              />
              <FieldRenderer
                label="Address 2"
                type="text"
                value={slForm.slAddress2}
                disabled={!isEditingSL || !canDeleteSL}
                onChange={(v) => updateSLForm({ slAddress2: v })}
                maxLength={getMaxSLMast("ADDRESS2")}
              />

              <FieldRenderer
                label="Address 3"
                type="text"
                value={slForm.slAddress3}
                disabled={!isEditingSL || !canDeleteSL}
                onChange={(v) => updateSLForm({ slAddress3: v })}
                maxLength={getMaxSLMast("ADDRESS3")}
              />
              <FieldRenderer
                label="TIN"
                type="text"
                value={slForm.slTin}
                disabled={!isEditingSL || !canDeleteSL}
                onChange={(v) => updateSLForm({ slTin: v })}
                maxLength={getMaxSLMast("TIN")}
              />

              <FieldRenderer
                label="Active"
                type="select"
                value={slForm.slActive}
                disabled={!isEditingSL || !canDeleteSL}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
                onChange={(v) => updateSLForm({ slActive: v })}
              />
            </div>

            <div className="w-full xl:w-[320px]">
              <RegistrationInfo layout="stacked" data={registrationInfo} />
            </div>
          </div>

          <SearchGlobalReferenceTable
            // docType={`${DOC_TYPE}_MASTER`}
            docType={`SL Master Data`}
            columns={slMasterColumns}
            data={filteredSLMasterList}
            itemsPerPage={200}
            showPagination={false}
            onRowDoubleClick={handleEditSL}
            // autoFillGrid="True"         
            isLoading={filteredSLMasterList.isLoading}
            isFetching={filteredSLMasterList.isFetching}
            onRefresh={() => filteredSLMasterList.refetch()}
            showGlobalSearch = {false}
          />
        </div>
      )}

      {activeTab === "sltype" && (
        <div className="mt-24 grid grid-cols-1 xl:grid-cols-[2.5fr_1.5fr] gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-blue-700">
                SL Types
              </div>
              <ButtonBar
                buttons={[
                  {
                    key: "add",
                    label: <span className="sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: () => {
                      resetSLTypeForm();
                      setIsEditingSLType(true);
                    },
                    className:
                      "flex items-center justify-center h-8 px-3 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                  {
                    key: "save",
                    label: <span className="sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: handleSaveSLType,
                    className:
                      "flex items-center justify-center h-8 px-3 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                  {
                    key: "reset",
                    label: <span className="sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: resetSLTypeForm,
                    className:
                      "flex items-center justify-center h-8 px-3 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                ]}
              />
            </div>

            <div className="space-y-4 mb-4">
              <FieldRenderer
                label="SL Type Code"
                type="text"
                value={slTypeForm.slTypeCode}
                disabled={!isEditingSLType || !!selectedSLTypeRow}
                onChange={(v) => updateSLTypeForm({ slTypeCode: v })}
                required
                maxLength={getMaxSLType("SLTYPE_CODE")}
                onBlur={(e) => handleCheckDuplicateSLType(e.target.value)} 
              />
              <FieldRenderer
                label="SL Type Name"
                type="text"
                value={slTypeForm.slTypeName}
                disabled={!isEditingSLType}
                onChange={(v) => updateSLTypeForm({ slTypeName: v })}
                required
                maxLength={getMaxSLType("SLTYPE_NAME")}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <FieldRenderer
                  label="Active"
                  type="select"
                  value={slTypeForm.slTypeActive}
                  disabled={!isEditingSLType}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  onChange={(v) => updateSLTypeForm({ slTypeActive: v })}
                />
                <FieldRenderer
                  label="Payee"
                  type="select"
                  value={slTypeForm.slTypeIncSu}
                  disabled={!isEditingSLType}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  onChange={(v) => updateSLTypeForm({ slTypeIncSu: v })}
                />
                <FieldRenderer
                  label="Customer"
                  type="select"
                  value={slTypeForm.slTypeIncCu}
                  disabled={!isEditingSLType}
                  options={[
                    { value: "Y", label: "Yes" },
                    { value: "N", label: "No" },
                  ]}
                  onChange={(v) => updateSLTypeForm({ slTypeIncCu: v })}
                />
              </div>
            </div>

            <SearchGlobalReferenceTable
              docType={`SL Types`}
              columns={slTypeColumns}
              data={slTypes}
              itemsPerPage={100}
              showPagination={false}
              onRowClick={(row) => {handleEditSLType(row);}}
              onRowDoubleClick={handleEditSLType}
              tableSize="Half"
              // autoFillGrid="True"
              isLoading={slTypes.isLoading}
              isFetching={slTypes.isFetching}
              onRefresh={() => slTypes.refetch()}
              showGroupBy = {false}
              showGlobalSearch = {false}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border shadow-lg">
            <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-lg font-semibold text-blue-800 p-1">
                        GL Matching
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* <button
                  type="button"
                  onClick={handleSelectAllGL}
                  disabled={!isGLMatchingLoaded || !displayedSLCoaList.length}
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                    !isGLMatchingLoaded || !displayedSLCoaList.length
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white"
                  }`}
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={handleClearAllGL}
                  disabled={!isGLMatchingLoaded || !displayedSLCoaList.length}
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                    !isGLMatchingLoaded || !displayedSLCoaList.length
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-600 hover:text-white"
                  }`}
                >
                  Clear
                </button> */}

                <button
                  onClick={handleSaveMatching}
                  disabled={!isGLMatchingLoaded}
                  className={`mr-3 h-8 px-4 rounded-md text-xs font-medium transition-all ${
                    !isGLMatchingLoaded
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Save Matching
                </button>
              </div>

              
            </div>
            

              <div className="text-sm font-semibold text-blue-800 mb-2">
                  <span className="block text-sm font-extrabold text-blue-800 bg-blue-100 px-2 py-1.5 rounded-md">
                    SL Type - {selectedSLType?.slTypeName || "No SL Type Selected"}
                  </span>
              </div>


            <SearchGlobalReferenceTable
              docType={`SLGL Matching`}
              columns={slCoaColumns}
              data={displayedSLCoaList}
              itemsPerPage={300}
              tableSize="Half"
              // autoFillGrid="True"            
              isLoading={displayedSLCoaList.isLoading}
              isFetching={displayedSLCoaList.isFetching}
              onRefresh={() => displayedSLCoaList.refetch()}
              showGroupBy = {false}
              showPagination={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}