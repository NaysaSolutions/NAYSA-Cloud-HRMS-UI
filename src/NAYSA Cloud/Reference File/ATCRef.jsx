import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalInfoAlert,
  useSwalDeleteRecord,
  useSwalDeleteConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "../Lookup/SearchGlobalReferenceTable.jsx";
import SearchCOAMast from "../Lookup/SearchCOAMast.jsx";
import { useReset } from "../Components/ResetContext";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

/* ================= CONSTANTS ================= */

const ATC_LIST_QUERY_KEY = ["ATC", "list"];

const DEFAULT_FORM = {
  atcCode: "",
  atcName: "",
  atcRate: "",
  ewtAcct: "",
  ewtAcctName: "",
  cwtAcct: "",
  cwtAcctName: "",
  clAcct: "",
  clAcctName: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= HELPERS ================= */

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

const extractRows = (payload) => {
  const raw =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data ??
    payload?.data;

  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (typeof raw === "object") {
    if (Array.isArray(raw.result)) return raw.result;
    return [raw];
  }

  return [];
};

const parseResultFlag = (res) => {
  const row0 = res?.data?.data?.[0] || {};
  const raw = row0?.result ?? row0?.[""] ?? '{"result":"0"}';

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return String(parsed?.result) === "1";
  } catch {
    return false;
  }
};

const pickValue = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const getRegistrationValue = (row = {}, keys = []) => {
  const direct = pickValue(row, keys);
  if (direct) return direct;

  // Some controllers / FOR JSON AUTO outputs can wrap aliases under table aliases.
  for (const value of Object.values(row || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = pickValue(value, keys);
      if (nested) return nested;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = pickValue(item, keys);
        if (nested) return nested;
      }
    }
  }

  return "";
};

const mapAtcRow = (row) => ({
  atcCode: row?.atccode ?? row?.ATCCODE ?? row?.atcCode ?? "",
  atcName: row?.atcname ?? row?.ATCNAME ?? row?.atcName ?? "",
  atcRate: String(row?.atcrate ?? row?.ATCRATE ?? row?.atcRate ?? ""),

  ewtAcct: row?.ewtacct ?? row?.EWTACCT ?? row?.ewtAcct ?? "",
  ewtAcctName:
    row?.ewtacctname ??
    row?.EWTACCTNAME ??
    row?.ewtAcctName ??
    row?.ewtAcctname ??
    "",

  cwtAcct: row?.cwtacct ?? row?.CWTACCT ?? row?.cwtAcct ?? "",
  cwtAcctName:
    row?.cwtacctname ??
    row?.CWTACCTNAME ??
    row?.cwtAcctName ??
    row?.cwtAcctname ??
    "",

  clAcct: row?.clacct ?? row?.CLACCT ?? row?.clAcct ?? "",
  clAcctName:
    row?.clacctname ??
    row?.CLACCTNAME ??
    row?.clAcctName ??
    row?.clAcctname ??
    "",

  registeredBy: getRegistrationValue(row, ["registeredBy",]) || "",
  registeredDate: getRegistrationValue(row, ["registeredDate",]) || "",
  lastUpdatedBy:getRegistrationValue(row, ["lastUpdatedBy",]) || "",
  lastUpdatedDate:getRegistrationValue(row, ["lastUpdatedDate",]) || "",
  
  __existing: true,
});

/* ================= API ================= */

const fetchAtcList = async () => {
  const res = await apiClient.post("/atc");

  console.log("ATC raw response:", res?.data);
  console.log("ATC extracted rows:", extractRows(res));

  if (res?.data?.success === false) {
    throw new Error(res?.data?.message || "Failed to load ATC data.");
  }

  return extractRows(res).map(mapAtcRow);
};

const checkDuplicateAtcApi = async (atcCode) => {
  const res = await apiClient.post("/checkDuplicateATC", {
    json_data: { atcCode },
  });

  if (res?.data?.success === false) {
    throw new Error(res?.data?.message || "Failed to check duplicate ATC.");
  }

  return parseResultFlag(res);
};

const checkInUsedAtcApi = async (atcCode) => {
  const res = await apiClient.post("/checkInUsedATC", {
    json_data: { atcCode },
  });

  if (res?.data?.success === false) {
    throw new Error(res?.data?.message || "Failed to validate ATC usage.");
  }

  return parseResultFlag(res);
};

const saveAtcApi = async (payload) => {
  const res = await apiClient.post("/upsertATC", {
    json_data: payload,
  });

  const data = res?.data || {};
  const firstRow = data?.data?.[0] || {};
  const errorCount = Number(firstRow?.errorcount ?? firstRow?.ERRORCOUNT ?? 0);
  const errorMsg = String(
    firstRow?.errormsg ?? firstRow?.ERRORMSG ?? data?.message ?? "",
  );

  if (data?.success === false || errorCount > 0) {
    throw new Error(errorMsg || "Failed to save ATC.");
  }

  return data;
};

const deleteAtcApi = async ({ atcCode }) => {
  const res = await apiClient.post("/deleteATC", {
    json_data: { atcCode },
  });

  const data = res?.data || {};
  const firstRow = data?.data?.[0] || {};
  const errorCount = Number(firstRow?.errorcount ?? firstRow?.ERRORCOUNT ?? 0);
  const errorMsg = String(
    firstRow?.errormsg ?? firstRow?.ERRORMSG ?? data?.message ?? "",
  );

  if (data?.success === false || errorCount > 0) {
    throw new Error(errorMsg || "Failed to delete ATC.");
  }

  return data;
};

/* ================= COMPONENT ================= */

const ATCRef = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setOnSave, setOnReset } = useReset();

  const docType = "ATC";
  const documentTitle = reftables?.[docType] || "Alphanumeric Tax Code";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const atcCodeInputRef = useRef(null);
  const enterValidatedRef = useRef(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDupCode, setIsDupCode] = useState(false);

  const [isEwtAcctModalOpen, setEwtAcctModalOpen] = useState(false);
  const [isCwtAcctModalOpen, setCwtAcctModalOpen] = useState(false);
  const [isClAcctModalOpen, setClAcctModalOpen] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  // --- MOBILE ACTION SHEET STATES ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback((next = DEFAULT_FORM) => {
    setForm(next);
  }, []);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  // --- MOBILE DETECTOR EFFECT ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // --- MOBILE ACTION SHEET HANDLERS ---
  const openMobileActionSheet = useCallback((row) => {
    setSelectedMobileRow(row);
    setIsMobileActionSheetMounted(true);

    requestAnimationFrame(() => {
      setIsMobileActionSheetOpen(true);
    });
  }, []);

  const closeMobileActionSheet = useCallback(() => {
    setIsMobileActionSheetOpen(false);

    setTimeout(() => {
      setIsMobileActionSheetMounted(false);
      setSelectedMobileRow(null);
    }, 300);
  }, []);

  const atcListQuery = useQuery({
    queryKey: ATC_LIST_QUERY_KEY,
    queryFn: fetchAtcList,
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchInterval: 1000 * 30,
  });

  const atcs = useMemo(() => atcListQuery.data || [], [atcListQuery.data]);
  const isInitialLoading = atcListQuery.isLoading;

  const handleReset = useCallback(() => {
    resetForm(DEFAULT_FORM);
    setSelectedRow(null);
    setIsEditing(false);
    setIsDupCode(false);
  }, [resetForm]);

  const saveMutation = useMutation({
    mutationFn: saveAtcApi,
    onSuccess: async (response) => {
      const sqlRow = response?.data?.data?.[0] || {};
      const errorcount = Number(sqlRow.errorcount ?? sqlRow.ERRORCOUNT ?? 0);
      const errormsg = String(sqlRow.errormsg ?? sqlRow.ERRORMSG ?? "");

      if (errorcount > 0) {
        useSwalErrorAlert("Missing Fields", errormsg || "Failed to save ATC.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ATC_LIST_QUERY_KEY });
      useSwalSuccessAlert("Success!", "ATC saved successfully.");
      handleReset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAtcApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ATC_LIST_QUERY_KEY });
      useSwalDeleteRecord("Deleted", "ATC record has been removed.");
      handleReset();
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.message || "Failed to delete ATC.",
      );
    },
  });

  const startNew = useCallback(() => {
    resetForm(DEFAULT_FORM);
    setSelectedRow(null);
    setIsEditing(true);
    setIsDupCode(false);
    setTimeout(() => atcCodeInputRef.current?.focus?.(), 0);
  }, [resetForm]);

  const handleEdit = useCallback(async (row) => {
    try {
      const res = await apiClient.get("/getATC", {
        params: { atcCode: row?.atcCode },
      });

      const freshData = extractRows(res)?.[0];
      console.log("Fresh Data from API:", freshData);
      if (!freshData) {
        useSwalErrorAlert("Error", "Could not fetch details for this record.");
        return;
      }

      const mapped = mapAtcRow(freshData);
      setForm(mapped);
      setSelectedRow(mapped);
      setIsEditing(true);
      setIsDupCode(false);
      closeMobileActionSheet(); // ensure it closes if opened from action sheet
    } catch (error) {
      useSwalErrorAlert(
        "Error",
        error?.message || "Could not fetch details for this record.",
      );
    }
  }, [closeMobileActionSheet]);

  const handleATCCodeValidate = useCallback(
    async (arg) => {
      const isEvent = arg && typeof arg === "object" && "type" in arg;

      if (isEvent && arg.type === "keydown") {
        if (arg.key !== "Enter") return;
        enterValidatedRef.current = true;
      }

      if (isEvent && arg.type === "blur" && enterValidatedRef.current) {
        enterValidatedRef.current = false;
        return;
      }

      const code = String(form.atcCode || "")
        .trim()
        .toUpperCase();
      if (!code || !isEditing || form.__existing) return;

      try {
        const isDuplicate = await checkDuplicateAtcApi(code);

        if (isDuplicate) {
          setIsDupCode(true);
          useSwalErrorAlert(
            "Duplicate Entry",
            `ATC Code "${code}" already exists.`,
          );
          setField("atcCode", "");
          setTimeout(() => atcCodeInputRef.current?.focus?.(), 0);
          return;
        }

        setIsDupCode(false);
        setField("atcCode", code);
      } catch (error) {
        useSwalErrorAlert(
          "Validation Error",
          error?.message || "Failed to validate ATC Code.",
        );
      }
    },
    [form.atcCode, form.__existing, isEditing],
  );

  const handleSave = useCallback(async () => {
    if (!isEditing || saveMutation.isPending) return;

    const code = String(form.atcCode || "")
      .trim()
      .toUpperCase();
    const name = String(form.atcName || "").trim();
    const rate = String(form.atcRate || "").trim();
    const ewtAcct = String(form.ewtAcct || "").trim();
    const cwtAcct = String(form.cwtAcct || "").trim();
    const clAcct = String(form.clAcct || "").trim();

    try {
      if (!form.__existing) {
        const isDuplicate = await checkDuplicateAtcApi(code);

        if (isDuplicate) {
          setIsDupCode(true);
          useSwalErrorAlert(
            "Duplicate Entry",
            `ATC Code "${code}" already exists.`,
          );
          setTimeout(() => atcCodeInputRef.current?.focus?.(), 0);
          return;
        }
      }

      const parsedRate = parseFloat(rate);

      await saveMutation.mutateAsync({
        atcCode: code,
        atcName: name,
        atcRate: Number.isNaN(parsedRate) ? 0 : parsedRate,
        ewtAcct,
        cwtAcct,
        clAcct,
        userCode: user?.USER_CODE || "ADMIN",
      });
    } catch (error) {
      useSwalErrorAlert(
        "System Error",
        error?.message || "Failed to save ATC.",
      );
    }
  }, [form, isEditing, saveMutation, user?.USER_CODE]);

  const handleDelete = useCallback(
    async (row = selectedRow) => {
      const atcCode = String(row?.atcCode || "").trim();

      if (!atcCode) {
        useSwalErrorAlert("Error", "No ATC Code selected.");
        return;
      }

      try {
        const isInUsed = await checkInUsedAtcApi(atcCode);

        if (isInUsed) {
          useSwalErrorAlert(
            "Unable to Delete",
            `ATC "${atcCode}" is already in use.`,
          );
          return;
        }

        const confirm = await useSwalDeleteConfirm(
          "Delete Record?",
          `Are you sure you want to delete ATC "${atcCode}"?`,
          "Yes, delete it",
        );

        if (!confirm?.isConfirmed) return;

        deleteMutation.mutate({ atcCode });
        closeMobileActionSheet(); // ensure it closes if opened from action sheet
      } catch (error) {
        useSwalErrorAlert(
          "System Error",
          error?.message || "Failed to delete record.",
        );
      }
    },
    [selectedRow, deleteMutation, closeMobileActionSheet],
  );

  const handleSaveRef = useRef(null);
  const handleResetRef = useRef(null);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    handleResetRef.current = handleReset;
  }, [handleReset]);

  useEffect(() => {
    setOnSave(() => () => handleSaveRef.current?.());
    setOnReset(() => () => handleResetRef.current?.());

    return () => {
      setOnSave(null);
      setOnReset(null);
    };
  }, [setOnSave, setOnReset]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isEditing && !saveMutation.isPending) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditing, saveMutation.isPending, handleSave]);

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        sortable: false,
        width: 140,
        render: (row) => (
          <div className="flex gap-2 justify-center w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
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
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile) {
                  openMobileActionSheet(row);
                } else {
                  handleDelete(row);
                }
              }}
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      {
        key: "atcCode",
        label: "ATC",
        sortable: true,
        render: (row) => row?.atcCode,
      },
      {
        key: "atcName",
        label: "ATC Name",
        sortable: true,
        render: (row) => row?.atcName,
      },
      {
        key: "atcRate",
        label: "Tax Rate",
        sortable: true,
        render: (row) => `${parseFloat(row?.atcRate || 0).toFixed(2)}%`,
      },
      {
        key: "ewtAcct",
        label: "EWT Account",
        sortable: true,
        render: (row) => row?.ewtAcctName 
          ? `${row.ewtAcct} - ${row.ewtAcctName}` 
          : row?.ewtAcct,
      },
      {
        key: "cwtAcct",
        label: "CWT Account",
        sortable: true,
        render: (row) => row?.cwtAcctName 
          ? `${row.cwtAcct} - ${row.cwtAcctName}` 
          : row?.cwtAcct,
      },
      {
        key: "clAcct",
        label: "CWT Clearing Account",
        sortable: true,
        render: (row) => row?.clAcctName 
          ? `${row.clAcct} - ${row.clAcctName}` 
          : row?.clAcct,
      },
    ],
    [handleEdit, handleDelete, isMobile, openMobileActionSheet],
  );

  const tableData = useMemo(
    () =>
      (Array.isArray(atcs) ? atcs : []).map((row, index) => ({
        ...row,
        __idx: index,
      })),
    [atcs],
  );

  const registrationData = useMemo(
    () => ({
      registeredBy: form?.registeredBy,
      registeredDate: form?.registeredDate,
      lastUpdatedBy: form?.lastUpdatedBy,
      lastUpdatedDate: form?.lastUpdatedDate,
    }),
    [form],
  );

  const showGlobalLoading =
    isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  return (
    <div className="global-ref-main-div-ui mt-16">
      {showGlobalLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <h1 className="global-ref-headertext-ui">{documentTitle}</h1>

        <div className="flex items-center justify-center md:justify-end gap-2 flex-wrap">
          <div className="flex flex-wrap justify-center md:justify-end gap-2">
            <ButtonBar
              buttons={[
                {
                  key: "add",
                  label: <span className="sm:inline ml-1">Add</span>,
                  icon: faPlus,
                  onClick: startNew,
                  className:
                    "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                },
                {
                  key: "save",
                  label: <span className="sm:inline ml-1">Save</span>,
                  icon: faSave,
                  onClick: handleSave,
                  disabled: !isEditing || saveMutation.isPending,
                  className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all
                    ${
                      !isEditing || saveMutation.isPending
                        ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`,
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
          </div>

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

      <div
        className="global-tran-tab-div-ui mt-8 p-6"
        style={{ minHeight: "calc(100vh - 170px)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-9 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4">
              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="ATC"
                  value={form.atcCode}
                  inputRef={atcCodeInputRef}
                  onChange={(val) => {
                    setField("atcCode", val);
                    if (isDupCode) setIsDupCode(false);
                  }}
                  onBlur={handleATCCodeValidate}
                  onKeyDown={handleATCCodeValidate}
                  disabled={!isEditing || form.__existing}
                  required
                />

                <FieldRenderer
                  label="ATC Name"
                  value={form.atcName}
                  onChange={(val) => setField("atcName", val)}
                  disabled={!isEditing}
                  required
                />

                <FieldRenderer
                  label="Tax Rate (%)"
                  type="number"
                  value={form.atcRate}
                  onChange={(val) => {
                    const numericVal = parseFloat(val);
                    if (numericVal < 0) {
                      setField("atcRate", "0");
                    } else {
                      setField("atcRate", val);
                    }
                  }}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="EWT Account"
                  type="lookup"
                  value={
                    form.ewtAcct
                      ? `${form.ewtAcct}${
                          form.ewtAcctName ? ` - ${form.ewtAcctName}` : ""
                        }`
                      : ""
                  }
                  onLookup={() => setEwtAcctModalOpen(true)}
                  disabled={!isEditing}
                  readOnly
                  required
                />

                <FieldRenderer
                  label="CWT Account"
                  type="lookup"
                  value={
                    form.cwtAcct
                      ? `${form.cwtAcct}${
                          form.cwtAcctName ? ` - ${form.cwtAcctName}` : ""
                        }`
                      : ""
                  }
                  onLookup={() => setCwtAcctModalOpen(true)}
                  disabled={!isEditing}
                  readOnly
                  required
                />

                <FieldRenderer
                  label="CWT Clearing Account"
                  type="lookup"
                  value={
                    form.clAcct
                      ? `${form.clAcct}${
                          form.clAcctName ? ` - ${form.clAcctName}` : ""
                        }`
                      : ""
                  }
                  onLookup={() => setClAcctModalOpen(true)}
                  disabled={!isEditing}
                  readOnly
                  required
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <RegistrationInfo data={registrationData} layout="stacked" />
          </div>
        </div>

        <div className="global-tran-table-main-div-ui mt-6 relative border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <SearchGlobalReferenceTable
            docType={docType}
            columns={columns}
            data={tableData}
            itemsPerPage={50}
            showFilters
            onRowDoubleClick={handleEdit}
            selectedRow={selectedRow}
            onRowClick={setSelectedRow}
            pdfLink={pdfLink}
            videoLink={videoLink}
            // ✅ ADDED: Connecting the table to the query for UI feedback
            isLoading={isInitialLoading}
            isFetching={atcListQuery.isFetching}
            onRefresh={() => atcListQuery.refetch()}
            onMobileRowOpen={openMobileActionSheet} // Piped into global table!
          />
        </div>
      </div>

      {/* MOBILE ACTION SHEET COMPONENT */}
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
              <h2 className="text-sm font-bold text-gray-800">ATC Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.atcCode} {selectedMobileRow?.atcName ? `- ${selectedMobileRow.atcName}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleEdit(selectedMobileRow)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-50 text-blue-600 py-3 text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
                Edit
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(selectedMobileRow);
                }}
                className="w-full flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span className="md:hidden">Delete</span>
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

      {isEwtAcctModalOpen && (
        <SearchCOAMast
          isOpen={isEwtAcctModalOpen}
          source="ewtAcct"
          customParam="EWT"
          classCode="EWT"
          title="Select EWT Account"
          onClose={(value) => {
            if (value) {
              setField("ewtAcct", value?.acctCode || "");
              setField("ewtAcctName", value?.acctName || "");
            }
            setEwtAcctModalOpen(false);
          }}
        />
      )}

      {isCwtAcctModalOpen && (
        <SearchCOAMast
          isOpen={isCwtAcctModalOpen}
          source="cwtAcct"
          customParam="CWT"
          classCode="CWT"
          title="Select CWT Account"
          onClose={(value) => {
            if (value) {
              setField("cwtAcct", value?.acctCode || "");
              setField("cwtAcctName", value?.acctName || "");
            }
            setCwtAcctModalOpen(false);
          }}
        />
      )}

      {isClAcctModalOpen && (
        <SearchCOAMast
          isOpen={isClAcctModalOpen}
          source="clAcct"
          customParam="CWTCL"
          classCode="CWTCL"
          title="Select CWT Clearing Account"
          onClose={(value) => {
            if (value) {
              setField("clAcct", value?.acctCode || "");
              setField("clAcctName", value?.acctName || "");
            }
            setClAcctModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ATCRef;
