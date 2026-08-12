import React, { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPlus,
  faSave,
  faUndo,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalValidationAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

const INITIAL_FORM = {
  qstatCode: "",
  qstatName: "",
  active: "Y",
  __existing: false,
};

const INITIAL_REG = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const parseSprocJsonResult = (rows) => {
  if (!rows) return [];
  const r = rows?.[0]?.result;
  if (typeof r === "string") {
    try {
      return JSON.parse(r);
    } catch {
      return [];
    }
  }
  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object")
    return rows;
  return [];
};

const extractSprocValidation = (axiosResponse) => {
  const payload = axiosResponse?.data ?? axiosResponse;
  const data = payload?.data;
  if (
    Array.isArray(data) &&
    data[0] &&
    (data[0].errorCount !== undefined || data[0].errorcount !== undefined)
  ) {
    return {
      errorCount: Number(data[0].errorCount ?? data[0].errorcount ?? 0),
      errorMsg: String(data[0].errorMsg ?? data[0].errormsg ?? ""),
    };
  }
  return null;
};

const QualityStat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const docType = "QualityStat";
  const formTopRef = useRef(null);
  const guideRef = useRef(null);

  if (!user) {
    return (
      <div className="global-ref-main-div-ui flex items-center justify-center min-h-screen">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access Quality Stat data.</p>
        </div>
      </div>
    );
  }

  if (!localStorage.getItem("companyCode") && !sessionStorage.getItem("companyCode")) {
    return (
      <div className="global-ref-main-div-ui flex items-center justify-center min-h-screen">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-xl font-bold text-orange-600 mb-4">Company Selection Required</h2>
          <p className="text-gray-600">Please select a company to access Quality Stat data.</p>
        </div>
      </div>
    );
  }

  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const [form, setForm] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(INITIAL_REG);
  const [isEditing, setIsEditing] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openMobileActionSheet = (row) => {
    setSelectedMobileRow(row);
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

  const handleCheckDuplicate = async (code) => {
    if (form.__existing || !code) return;
    try {
      const payload = { json_data: { qstatCode: code } };
      const response = await apiClient.post("/checkDuplicateQStat", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (String(parsedData.result) === "1") {
        setField("qstatCode", "");
        return useSwalErrorAlert(
          "Duplicate Code",
          `Quality Stat Code ${code} is already in use.`,
        );
      }
    } catch (error) {
      console.error("Duplicate check failed", error);
    }
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await useFieldLenghtCheck("QualityStat");
      if (mounted) setTblFieldArray(res || []);
    })();
    return () => { mounted = false; };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  const qstatListQuery = useQuery({
    queryKey: ["qstatList"],
    queryFn: async () => {
      try {
        const result = await apiClient.get("/qstat");
        return parseSprocJsonResult(result?.data?.data);
      } catch (error) {
        console.error("❌ QStat API Error:", error.message);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      return failureCount < 3;
    },
  });

  const qualityStats = useMemo(() => {
    return (qstatListQuery.data || []).map((row) => ({
      qstatCode: row?.qstatCode ?? row?.QSTAT_CODE ?? "",
      qstatName: row?.qstatName ?? row?.QSTAT_NAME ?? "",
      active: row?.active ?? row?.ACTIVE ?? "Y",
      registeredBy: row?.registeredBy ?? row?.REGISTERED_BY ?? "",
      registeredDate: row?.registeredDate ?? row?.REGISTERED_DATE ?? "",
      lastUpdatedBy: row?.lastUpdatedBy ?? row?.UPDATED_BY ?? "",
      lastUpdatedDate: row?.lastUpdatedDate ?? row?.UPDATED_DATE ?? "",
    }));
  }, [qstatListQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload) =>
      apiClient.post("/upsertQStat", {
        json_data: payload,
      }),
    onSuccess: async (response) => {
      const sprocValidation = extractSprocValidation(response);
      if (Number(sprocValidation?.errorCount ?? 0) > 0) {
        useSwalErrorAlert("Validation Failed", String(sprocValidation?.errorMsg));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["qstatList"] });
      useSwalSuccessAlert("Success!", "Quality Status Code saved successfully.");
      handleReset();
    },
    onError: (error) => useSwalErrorAlertAPI("Error", error),
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload) =>
      apiClient.post("/deleteQStat", { json_data: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["qstatList"] });
      useSwalDeleteRecord("Deleted!", "Quality Stat record removed successfully.");
      handleReset();
    },
    onError: (error) => useSwalErrorAlertAPI("Error", error),
  });

  const isSaving = saveMutation.isPending || deleteMutation.isPending;
  const isListLoading = qstatListQuery.isLoading;
  const hasError = qstatListQuery.isError;
  const errorMessage = qstatListQuery.error?.message || "Unknown error occurred";

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REG);
    setIsEditing(false);
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const handleSave = async () => {
    if (!isEditing || saveMutation.isPending) return;
    const qstatCode = String(form.qstatCode || "").trim();
    const qstatName = String(form.qstatName || "").trim();

    if (!qstatCode || !qstatName) {
      return useSwalValidationAlert({
        icon: "warning",
        title: "Required Field",
        message: "Quality Stat Code and Name are required.",
      });
    }

    if (!form.__existing) {
      try {
       const checkRes = await apiClient.post("/checkDuplicateQStat", {
          json_data: { qstatCode },
        });
        const sqlRow = checkRes?.data?.data?.[0];
        const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
        const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

        if (String(parsedData.result) === "1") {
      return useSwalErrorAlert(
        "Duplicate Code",
        `Code ${qstatCode} is already in use. Please enter a different code.`
      );
    }
      } catch (error) {
        console.error("Duplicate check on save failed", error);
      }
    }

    saveMutation.mutate({
      qstatCode,
      qstatName,
      active: form.active,
      action: form.__existing ? "EDIT" : "ADD",
      userCode: user?.USER_CODE || "ADMIN",
    });
  };

  const handleEdit = (row) => {
    setForm({ ...INITIAL_FORM, ...row, __existing: true });
    setRegistrationInfo({
      registeredBy: row.registeredBy,
      registeredDate: row.registeredDate,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedDate: row.lastUpdatedDate,
    });
    setIsEditing(true);
    closeMobileActionSheet();

    setTimeout(() => {
      if (formTopRef.current) {
        const yOffset = -80;
        const y = formTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 150);
  };

  const handleDelete = async (row) => {
    try {
      const checkRes = await apiClient.post("/checkInUsedQStat", {
        json_data: { qstatCode: row.qstatCode },
      });

      const sqlRow = checkRes?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (String(parsedData.result) === "1") {
        return useSwalErrorAlert(
          "Cannot Delete",
          `Quality Stat ${row.qstatCode} is currently in use and cannot be deleted.`,
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Delete Quality Stat ${row.qstatCode}?`,
      );
      if (confirm?.isConfirmed) {
        deleteMutation.mutate({ qstatCode: row.qstatCode });
      }
    } catch (error) {
      useSwalErrorAlertAPI("Error", error);
    } finally {
      closeMobileActionSheet();
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
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
  }, [form, isEditing]);

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
                isMobile ? openMobileActionSheet(row) : handleEdit(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span className="md:hidden">Edit</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                isMobile ? openMobileActionSheet(row) : handleDelete(row);
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 px-3 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "qstatCode", label: "Quality Status Code", sortable: true, width: 150 },
      { key: "qstatName", label: "Quality Status Name", sortable: true, width: 450, maxWidth: 450 },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 90,
        render: (row) => (row.active === "Y" ? "Yes" : "No"),
      },
    ],
    [isMobile],
  );

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isSaving || deleteMutation.isPending) && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-semibold animate-pulse">
              {saveMutation.isPending
                ? "Saving..."
                : deleteMutation.isPending
                  ? "Deleting..."
                  : "Loading..."}
            </span>
          </div>
        </div>
      )}

      {hasError && !isListLoading && (
        <div className="fixed top-4 right-4 z-[100] bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <span className="font-bold">API Error</span>
          </div>
          <p className="text-sm">{errorMessage}</p>
          <button
            onClick={() => qstatListQuery.refetch()}
            className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
          >
            Retry
          </button>
        </div>
      )}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {reftables[docType] || "Quality Status Codes"}
            </h1>
          </div>
          <div className="hidden md:flex justify-center w-full" />
          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <ButtonBar
                buttons={[
                  {
                    key: "add",
                    label: <span className="sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: () => {
                      handleReset();
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
                    className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${!isEditing || isSaving ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
                  },
                  {
                    key: "reset",
                    label: <span className="sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: handleReset,
                    className:
                      "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                ]}
              />
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
                      onClick={() => window.open(pdfLink, "_blank")}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
                    </button>
                    <button
                      onClick={() => window.open(videoLink, "_blank")}
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

      <div ref={formTopRef} className="mt-24 flex flex-col xl:flex-row gap-4 px-4 h-auto xl:h-[calc(100vh-130px)]">
        <div className="w-full xl:w-[400px] flex flex-col gap-4 shrink-0">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg">
            <h2 className="text-sm font-bold text-blue-600 mb-6 uppercase tracking-wider border-b pb-2">
              Entry Details
            </h2>
            <div className="space-y-6">
              <FieldRenderer
                label="Quality Status Code"
                required
                type="text"
                value={form.qstatCode}
                disabled={!isEditing || form.__existing}
                onChange={(v) => setField("qstatCode", String(v).toUpperCase())}
                onBlur={(e) => handleCheckDuplicate(e.target.value)}
                maxLength={getMax("QSTAT_CODE") || 20}
              />
              <FieldRenderer
                label="Quality Status Name"
                required
                type="text"
                value={form.qstatName}
                disabled={!isEditing}
                onChange={(v) => setField("qstatName", v)}
                maxLength={getMax("QSTAT_NAME") || 100}
              />
              <FieldRenderer
                label="Active?"
                type="select"
                value={form.active}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
                disabled={!isEditing}
                onChange={(v) => setField("active", v)}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 xl:mb-0">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col">
          <SearchGlobalReferenceTable
            docType="Quality Status"
            columns={columns}
            data={qualityStats}
            onRowDoubleClick={handleEdit}
            itemsPerPage={200}
            onMobileRowOpen={openMobileActionSheet}
            isLoading={qstatListQuery.isLoading}
            onRefresh={() => qstatListQuery.refetch()}
            tableSize="Full"
          />
        </div>
      </div>

      {isMobileActionSheetMounted && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMobileActionSheetOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeMobileActionSheet}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 transform transition-transform duration-300 ease-out ${isMobileActionSheetOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">QStat Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.qstatCode} - {selectedMobileRow?.qstatName}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleEdit(selectedMobileRow)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium"
              >
                <FontAwesomeIcon icon={faEdit} /> Edit
              </button>
              <button
                onClick={() => handleDelete(selectedMobileRow)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 py-3 text-sm font-medium"
              >
                <FontAwesomeIcon icon={faTrashAlt} /> Delete
              </button>
              <button
                onClick={closeMobileActionSheet}
                className="w-full rounded-lg bg-gray-100 text-gray-700 py-3 text-sm font-medium"
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

export default QualityStat;