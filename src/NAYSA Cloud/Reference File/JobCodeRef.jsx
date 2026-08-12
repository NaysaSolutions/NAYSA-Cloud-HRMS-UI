import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Import Lookup Modals
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast";
import SearchUOM from "@/NAYSA Cloud/Lookup/SearchUOM.jsx";

// Icons & Globals
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
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// UI Helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const INITIAL_FORM = {
  jobCode: "",
  jobName: "",
  uomCode: "",
  acctCode: "",
  acctName: "",
  active: "Y",
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const JobCodeRef = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const docType = "JobCodeRef";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];
  const formTopRef = useRef(null);
  const allowedDuplicateJobNameRef = useRef("");

  // --- 1. STATE DECLARATIONS (Order matters!) ---
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedJobCode, setSelectedJobCode] = useState(null);
  const [modals, setModals] = useState({
    coaMast: false,
    uomMast: false,
    guide: false,
  });
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  // --- 2. MOBILE STATE (Moved up to fix ReferenceError) ---
  const [isMobile, setIsMobile] = useState(false);
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
    setIsMobileActionSheetOpen(true);
  };
  const closeMobileActionSheet = () => {
    setIsMobileActionSheetOpen(false);
    setSelectedMobileRow(null);
  };

  const toggleModal = (name, isOpen) =>
    setModals((prev) => ({ ...prev, [name]: isOpen }));

  // --- 3. FETCH & MUTATIONS ---
  const { data: jobCodes = [], isLoading: isListLoading } = useQuery({
    queryKey: ["jobCodeList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/jobCode");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
    staleTime: 0,
    refetchInterval: 1000 * 20,
  });

  const { mutate: saveJobCode, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) =>
      await apiClient.post("/upsertJobCode", payload),
    onSuccess: (response) => {
      const sqlRow = response?.data?.data?.[0];
      if (sqlRow?.errorcount > 0) {
        useSwalErrorAlert("Error", sqlRow?.errormsg || "Failed to save.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["jobCodeList"] });
      useSwalSuccessAlert("Success!", "Job Code saved successfully!");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("System Error", error),
  });

  // --- 4. VALIDATION LOGIC ---
  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  const findDuplicateJobName = (jobName = formData.jobName) => {
    const normalizedName = normalizeText(jobName);
    if (!normalizedName) return null;

    return jobCodes.find((item) => {
      const sameName = normalizeText(item?.jobName) === normalizedName;
      const sameCode =
        normalizeText(item?.jobCode) ===
        normalizeText(selectedJobCode || formData.jobCode);
      return sameName && !sameCode;
    });
  };

  const confirmDuplicateJobName = async (jobName = formData.jobName) => {
    const duplicateRecord = findDuplicateJobName(jobName);
    if (!duplicateRecord) return true;

    const normalizedName = normalizeText(jobName);
    if (allowedDuplicateJobNameRef.current === normalizedName) return true;

    const result = await useSwalProceedConfirm(
      "Duplicate Job Name",
      `Job Name "${jobName}" already exists in Job Code ${duplicateRecord.jobCode}.\n\nDo you want to proceed?`,
      "Yes, Proceed",
    );

    if (result.isConfirmed) {
      allowedDuplicateJobNameRef.current = normalizedName;
      return true;
    }

    allowedDuplicateJobNameRef.current = "";
    updateForm({ jobName: "" });
    return false;
  };

  const handleJobNameBlur = async () => {
    if (!isEditing || !formData.jobName) return;
    await confirmDuplicateJobName(formData.jobName);
  };

  const handleCheckDuplicateCode = async (code) => {
    if (isEditing && selectedJobCode) return;
    if (!code) return;

    try {
      const payload = { json_data: { jobCode: code } };
      const response = await apiClient.post("/checkDuplicateJobCode", payload);
      const parsedData = JSON.parse(
        response?.data?.data?.[0]?.result || '{"result":"0"}',
      );

      if (parsedData.result === "1") {
        resetForm();
        return useSwalErrorAlertAPI(
          `Duplicate Job Code: ${code}`,
          `This code is already in use.`,
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- 5. COMPONENT ACTIONS ---
  const handleSave = async () => {
    const canProceed = await confirmDuplicateJobName(formData.jobName);
    if (!canProceed) return;

    const payload = {
      json_data: JSON.stringify({
        json_data: { ...formData, userCode: user?.USER_CODE || "ADMIN" },
      }),
    };
    saveJobCode(payload);
  };

  const resetForm = () => {
    allowedDuplicateJobNameRef.current = "";
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setSelectedJobCode(null);
    setIsEditing(false);
    if (formTopRef.current)
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const handleEdit = (row) => {
    setSelectedJobCode(row.jobCode);
    setFormData({ ...INITIAL_FORM, ...row });
    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate,
    });
    setIsEditing(true);
    setIsMobileActionSheetOpen(false);
    if (formTopRef.current)
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const handleDelete = async (row) => {
    try {
      setIsLoading(true);
      const payload = { json_data: { jobCode: row.jobCode } };

      const response = await apiClient.post("/checkInUsedJobCode", payload);
      const parsedData = JSON.parse(
        response?.data?.data?.[0]?.result || '{"result":"0"}',
      );

      if (String(parsedData.result) === "1") {
        return useSwalErrorAlertAPI(
          `Cannot Delete`,
          `Job Code ${row.jobCode} is used in transactions.`,
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Code: ${row.jobCode}?`,
      );
      if (!confirm?.isConfirmed) return;

      await apiClient.post("/deleteJobCode", payload);
      queryClient.invalidateQueries({ queryKey: ["jobCodeList"] });
      useSwalDeleteRecord("Deleted!", "Job Code removed.");
      resetForm();
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  // --- 6. TABLE COLUMNS ---
  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              onClick={() =>
                isMobile ? openMobileActionSheet(row) : handleEdit(row)
              }
              className="global-ref-td-button-edit-ui"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              onClick={() =>
                isMobile ? openMobileActionSheet(row) : handleDelete(row)
              }
              className="global-ref-td-button-delete-ui"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "jobCode",
        label: "Job Code",
        sortable: true,
        width: 120,
        pinned: true,
      },
      { key: "jobName", label: "Job Name", sortable: true, width: 250 },
      { key: "uomCode", label: "UOM", sortable: true, width: 100 },
      { key: "acctCode", label: "Acct Code", sortable: true, width: 120 },
      { key: "acctName", label: "Account Name", sortable: true, width: 250 },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 80,
        render: (row) => (row.active === "Y" ? "Yes" : "No"),
      },
    ],
    [handleDelete, isMobile],
  ); // isMobile added to dependencies

  // --- 7. EFFECTS ---
  useEffect(() => {
    (async () => {
      const res = await useFieldLenghtCheck("jobcode_ref");
      setTblFieldArray(res || []);
    })();
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
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
  }, [formData]);

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || isLoading) && <LoadingSpinner />}

      <SearchCOAMast
        isOpen={modals.coaMast}
        onClose={(v) => {
          toggleModal("coaMast", false);
          if (v) updateForm({ acctCode: v.acctCode, acctName: v.acctName });
        }}
      />

      <SearchUOM
        isOpen={modals.uomMast}
        onClose={(v) => {
          toggleModal("uomMast", false);
          if (v) updateForm({ uomCode: v.uomCode || "" });
        }}
      />

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col md:grid md:grid-cols-2 items-center">
          <h1 className="global-ref-headertext-ui">
            {reftables[docType] || "Job Code Reference"}
          </h1>
          <div className="flex justify-end gap-2 flex-wrap">
            <ButtonBar
              buttons={[
                {
                  key: "add",
                  label: <span className="sm:inline ml-1">Add</span>,
                  icon: faPlus,
                  onClick: () => {
                    resetForm();
                    setIsEditing(true);
                  },
                  className:
                    "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                },
                {
                  key: "save",
                  label: <span className="sm:inline ml-1">Save</span>,
                  icon: faSave,
                  onClick: handleSave,
                  disabled: !isEditing || isSaving,
                  className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                        ${
                          !isEditing || isSaving
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

            {/* Info Dropdown */}
            <div ref={guideRef} className="relative">
              <button
                onClick={() => setOpenGuide((v) => !v)}
                className="bg-blue-600 text-white h-7 w-16 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
              >
                <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
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

      <div ref={formTopRef} className="mt-24 flex flex-col lg:flex-row gap-2">
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FieldRenderer
              label="Job Code"
              required
              value={formData.jobCode}
              disabled={isEditing && selectedJobCode}
              onChange={(v) => updateForm({ jobCode: v })}
              onBlur={(e) => handleCheckDuplicateCode(e.target.value)}
              maxLength={getMax("job_code")}
            />
            <FieldRenderer
              label="Job Name"
              required
              value={formData.jobName}
              disabled={!isEditing}
              onChange={(v) => {
                allowedDuplicateJobNameRef.current = "";
                updateForm({ jobName: v });
              }}
              onBlur={handleJobNameBlur}
              maxLength={getMax("job_name")}
            />
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="UOM"
                required
                type="lookup"
                value={formData.uomCode}
                disabled={!isEditing}
                onLookup={() => toggleModal("uomMast", true)}
                readOnly
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
              label="Account Code"
              required
              type="lookup"
              value={
                formData.acctCode && formData.acctName
                  ? `${formData.acctCode} - ${formData.acctName}`
                  : formData.acctCode
              }
              disabled={!isEditing}
              onLookup={() => toggleModal("coaMast", true)}
              readOnly
            />
          </div>
        </div>
        <div className="w-full lg:w-[320px]">
          <RegistrationInfo layout="stacked" data={registrationInfo} />
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={docType}
          columns={columns}
          data={jobCodes}
          onRowDoubleClick={handleEdit}
          itemsPerPage={200}
          onMobileRowOpen={openMobileActionSheet}
          isLoading={isListLoading}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["jobCodeList"] })
          }
          autoFillGrid={true}
        />
      </div>

      {isMobileActionSheetOpen && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileActionSheet}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-2xl dark:bg-gray-800 transition-transform">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-sm font-bold mb-1">Job Actions</h2>
            <p className="text-xs text-gray-500 mb-4">
              {selectedMobileRow?.jobCode} - {selectedMobileRow?.jobName}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleEdit(selectedMobileRow)}
                className="w-full py-3 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faEdit} /> Edit
              </button>
              <button
                onClick={() => {
                  closeMobileActionSheet();
                  handleDelete(selectedMobileRow);
                }}
                className="w-full py-3 text-sm font-medium bg-red-50 text-red-600 rounded-lg flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faTrashAlt} /> Delete
              </button>
              <button
                onClick={closeMobileActionSheet}
                className="w-full py-3 text-sm font-medium text-gray-500 rounded-lg"
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

export default JobCodeRef;
