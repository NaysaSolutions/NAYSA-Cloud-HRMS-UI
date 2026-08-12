import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalInfoAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";
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
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import SearchCurrencyRef from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";

/* ================= HELPERS ================= */

const extractRows = (payload) => {
  const rawData = payload?.data?.data;

  if (!rawData || !Array.isArray(rawData)) return [];

  const res = rawData[0]?.result ?? rawData[0]?.RESULT;

  if (!res) return [];

  if (Array.isArray(res)) return res;

  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch (e) {
      console.error("JSON Parsing Error:", e);
      return [];
    }
  }

  return [];
};

const getId = (row) => {
  if (!row) return null;
  return row.tranID ?? row.TRAN_ID ?? row.tranId ?? row.id ?? null;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDate = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const pickValue = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const getMonthName = (month) =>
  new Date(2000, month - 1, 1).toLocaleString("en-US", {
    month: "long",
  });

const startOfMonth = (year, month) => new Date(year, month - 1, 1);
const endOfMonth = (year, month) => new Date(year, month, 0);
const maxDate = (a, b) => (a > b ? a : b);
const minDate = (a, b) => (a < b ? a : b);

const mapRowToForm = (row = {}) => ({
  tranID: getId(row) || "",
  fromDate: formatDate(getRawFromDate(row)),
  toDate: formatDate(getRawToDate(row)),
  currCode: row.CURR_CODE ?? row.currCode ?? "",
  fCurrName: row.FCURR_NAME ?? row.fCurrName ?? row.currName ?? "",
  currName: row.CURR_NAME ?? row.currName ?? row.fCurrName ?? "",
  currRate: row.CURR_RATE ?? row.currRate ?? "",
  currCode2: row.CURR_CODE2 ?? row.currCode2 ?? "",
  tCurrName: row.TCURR_NAME ?? row.tCurrName ?? row.currName2 ?? "",
  currName2: row.CURR_NAME2 ?? row.currName2 ?? row.tCurrName ?? "",
  currRate2: row.CURR_RATE2 ?? row.currRate2 ?? "",
  registeredBy: getRegistrationValue(row, ["registeredBy",]) || "",
  registeredDate: getRegistrationValue(row, ["registeredDate",]) || "",
  lastUpdatedBy:getRegistrationValue(row, ["lastUpdatedBy",]) || "",
  lastUpdatedDate:getRegistrationValue(row, ["lastUpdatedDate",]) || "",
  __existing: true,
});

const getRawFromDate = (row = {}) =>
  row.FROM_DATE ?? row.fromDate ?? row.fDate ?? row.dateFrom ?? row.sourceFromDate;

const getRawToDate = (row = {}) =>
  row.TO_DATE ?? row.toDate ?? row.tDate ?? row.dateTo ?? row.sourceToDate;

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

const expandForexRowByMonth = (row = {}) => {
  const sourceFrom = parseDate(getRawFromDate(row));
  const sourceTo = parseDate(getRawToDate(row));
  const expandedRows = [];

  if (!sourceFrom || !sourceTo) return expandedRows;

  sourceFrom.setHours(0, 0, 0, 0);
  sourceTo.setHours(0, 0, 0, 0);

  let year = sourceFrom.getFullYear();
  let month = sourceFrom.getMonth() + 1;

  const lastYear = sourceTo.getFullYear();
  const lastMonth = sourceTo.getMonth() + 1;

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const monthStart = startOfMonth(year, month);
    const monthEnd = endOfMonth(year, month);

    const displayFrom = maxDate(sourceFrom, monthStart);
    const displayTo = minDate(sourceTo, monthEnd);

    if (displayFrom <= displayTo) {
      expandedRows.push({
        ...row,
        rangeKey: `${year}-${String(month).padStart(2, "0")}-${formatDate(
          displayFrom
        )}-${formatDate(displayTo)}`,
        year,
        month,
        monthName: getMonthName(month),
        dateFrom: formatDate(displayFrom),
        dateTo: formatDate(displayTo),
        sourceFromDate: formatDate(sourceFrom),
        sourceToDate: formatDate(sourceTo),
      });
    }

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return expandedRows;
};

const buildSummaryRowsFromForex = (rows = []) => {
  const grouped = new Map();

  rows.forEach((row) => {
    expandForexRowByMonth(row).forEach((expandedRow) => {
      const key = expandedRow.rangeKey;
      const existing = grouped.get(key);
      const tranID = getId(row);

      if (existing) {
        existing.rowCount += 1;
        if (tranID && !existing.tranIDs.includes(tranID)) {
          existing.tranIDs.push(tranID);
        }
        return;
      }

      grouped.set(key, {
        rangeKey: key,
        year: expandedRow.year,
        month: expandedRow.month,
        monthName: expandedRow.monthName,
        dateFrom: expandedRow.dateFrom,
        dateTo: expandedRow.dateTo,
        rowCount: 1,
        tranIDs: tranID ? [tranID] : [],
      });
    });
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    if (a.dateFrom !== b.dateFrom) return String(a.dateFrom).localeCompare(String(b.dateFrom));
    return String(a.dateTo).localeCompare(String(b.dateTo));
  });
};

const DEFAULT_FORM = {
  tranID: "",
  fromDate: "",
  toDate: "",
  currCode: "",
  fCurrName: "",
  currName: "",
  currRate: "",
  currCode2: "",
  tCurrName: "",
  currName2: "",
  currRate2: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __existing: false,
};

/* ================= COMPONENT ================= */

const DForexRef = ({ onSelect }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const docType = "DForexRef";
  const documentTitle = reftables?.[docType] || "Daily Forex";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[docType];
  const videoLink = reftablesVideoGuide?.[docType];

  const fromDateRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedDateRangeRow, setSelectedDateRangeRow] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const [isCurr1ModalOpen, setCurr1ModalOpen] = useState(false);
  const [isCurr2ModalOpen, setCurr2ModalOpen] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  // --- MOBILE ACTION SHEET STATES ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileActionSheetMounted, setIsMobileActionSheetMounted] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [selectedMobileRow, setSelectedMobileRow] = useState(null);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = (next = DEFAULT_FORM) => setForm(next);

  /* ================= EFFECTS ================= */

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isEditing && !saveMutation.isPending) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

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

  /* ================= QUERIES ================= */

  const forexListQuery = useQuery({
    queryKey: ["dforexList"],
    queryFn: async () => {
      const res = await apiClient.get("/DForex");
      return extractRows(res);
    },
    // ✅ ADDED: Auto-sync and manual refresh support
    staleTime: 0,
    refetchInterval: 1000 * 30,
  });

  const forexRows = useMemo(
    () => forexListQuery.data || [],
    [forexListQuery.data]
  );

  const isInitialLoading = forexListQuery.isLoading;

  const dateRangeRows = useMemo(() => {
    return buildSummaryRowsFromForex(forexRows);
  }, [forexRows]);

  const resolveForexRow = (row) => {
    if (!row) return null;

    const directId = getId(row);
    if (directId) {
      return (
        forexRows.find((r) => String(getId(r)) === String(directId)) || row
      );
    }

    return row;
  };

  const filteredForexRows = useMemo(() => {
    if (!selectedDateRangeRow || !forexRows.length) return [];

    return forexRows
      .flatMap((row) => expandForexRowByMonth(row))
      .filter((row) => row.rangeKey === selectedDateRangeRow.rangeKey)
      .sort((a, b) => {
        const aFrom = String(getRawFromDate(a) || "");
        const bFrom = String(getRawFromDate(b) || "");
        if (aFrom !== bFrom) return aFrom.localeCompare(bFrom);
        return String(getId(a) || "").localeCompare(String(getId(b) || ""));
      });
  }, [forexRows, selectedDateRangeRow]);

  /* ================= MUTATIONS ================= */

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/upsertDForex", {
        json_data: payload,
      });
    },
    onSuccess: async (response) => {
      const data = response?.data || {};
      const sqlRow = data?.data?.[0] || {};
      const errorcount = Number(sqlRow.errorcount ?? sqlRow.ERRORCOUNT ?? 0);
      const errormsg = String(sqlRow.errormsg ?? sqlRow.ERRORMSG ?? "");

      if (errorcount > 0) {
        useSwalErrorAlert("Error", errormsg || "Failed to save forex record.");
        return;
      }

      if (data?.success || data?.status === "success") {
        await queryClient.invalidateQueries({ queryKey: ["dforexList"] });
        useSwalSuccessAlert(
          "Success!",
          form.__existing
            ? "Forex record updated successfully."
            : "Forex record saved successfully."
        );
        setIsEditing(false);
        resetForm(DEFAULT_FORM);
        setSelectedRow(null);
        setSelectedDateRangeRow(null);
      } else {
        useSwalErrorAlert("Error", data?.message || "Failed to save forex record.");
      }
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.response?.data?.message ||
          JSON.stringify(error?.response?.data?.errors || {}) ||
          error?.message ||
          "Failed to save forex record."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tranID) => {
      return apiClient.post("/deleteDForex", {
        json_data: { tranID },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dforexList"] });
      useSwalDeleteRecord("Deleted!", "Forex record has been removed.");
      handleReset();
    },
    onError: (error) => {
      useSwalErrorAlert(
        "System Error",
        error?.response?.data?.message || error?.message || "Delete failed."
      );
    },
  });

  const isBusy =
    isInitialLoading || saveMutation.isPending || deleteMutation.isPending;

  /* ================= ACTIONS ================= */

  const startNew = () => {
    resetForm(DEFAULT_FORM);
    setSelectedRow(null);
    setSelectedDateRangeRow(null);
    setIsEditing(true);
    setTimeout(() => fromDateRef.current?.focus?.(), 0);
  };

  const handleReset = () => {
    resetForm(DEFAULT_FORM);
    setSelectedRow(null);
    setSelectedDateRangeRow(null);
    setIsEditing(false);
  };

  const handleEdit = async (row) => {
    if (!row) return;

    const rawRow = resolveForexRow(row);
    const tranID = getId(rawRow);

    if (!tranID) {
      useSwalErrorAlert("Error", "Selected row has no tranID.");
      return;
    }

    try {
      const res = await apiClient.get("/getDForex", {
        params: { tranID },
      });

      const record = extractRows(res)?.[0];
      const finalRecord = record || rawRow;

      resetForm({
        ...DEFAULT_FORM,
        ...mapRowToForm(finalRecord),
        __existing: true,
      });
      setIsEditing(true);
      setSelectedRow(rawRow);
      onSelect?.(finalRecord);
      closeMobileActionSheet(); // ensure it closes if opened from action sheet
    } catch (error) {
      useSwalErrorAlert(
        "Error",
        error?.response?.data?.message || "Could not fetch record"
      );
    }
  };

  const handleDelete = async (row) => {
    if (!row) {
      useSwalErrorAlert("Error", "Please select a forex record to delete.");
      return;
    }

    const rawRow = resolveForexRow(row);
    const tranID = getId(rawRow);

    if (!tranID) {
      useSwalErrorAlert("Error", "Selected row has no tranID.");
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete this forex record?",
      `From ${formatDate(
        rawRow.FROM_DATE ?? rawRow.fromDate ?? rawRow.fDate
      )} to ${formatDate(rawRow.TO_DATE ?? rawRow.toDate ?? rawRow.tDate)}`,
      "Yes, delete it"
    );

    if (!confirm?.isConfirmed) return;

    deleteMutation.mutate(tranID);
    closeMobileActionSheet(); // ensure it closes if opened from action sheet
  };

  const handleRowClick = (row) => {
    const rawRow = resolveForexRow(row);
    setSelectedRow(rawRow);

    if (!isEditing) {
      resetForm({
        ...DEFAULT_FORM,
        ...mapRowToForm(rawRow),
        __existing: true,
      });
    }

    onSelect?.(rawRow);
  };

  const handleDateRangeClick = (row) => {
    setSelectedDateRangeRow(row);
    setSelectedRow(null);

    if (!isEditing) {
      setField("fromDate", row.dateFrom);
      setField("toDate", row.dateTo);
    }
  };

  const handleSave = async () => {
    if (!isEditing || saveMutation.isPending) return;

    const missing = [];
    if (!form.fromDate) missing.push("• Start Date");
    if (!form.toDate) missing.push("• End Date");
    if (!String(form.currCode || "").trim()) missing.push("• Currency");
    if (!String(form.currRate || "").trim()) missing.push("• Currency Rate");
    if (!String(form.currCode2 || "").trim()) missing.push("• Currency 2");
    if (!String(form.currRate2 || "").trim()) missing.push("• Currency Rate 2");

    if (missing.length) {
      useSwalErrorAlert(
        "Error!",
        `Please fill out all required fields:\n${missing.join("\n")}`
      );
      return;
    }

    const payload = {
      tranID: form.__existing ? form.tranID || "" : "",
      fromDate: form.fromDate,
      toDate: form.toDate,
      currCode: String(form.currCode || "").trim().toUpperCase(),
      currRate: String(form.currRate || "").trim(),
      currCode2: String(form.currCode2 || "").trim().toUpperCase(),
      currRate2: String(form.currRate2 || "").trim(),
      userCode: user?.USER_CODE || user?.username || "SYSTEM",
    };

    saveMutation.mutate(payload);
  };

  const handleOpenInfo = () => {
    const messages = [];

    if (pdfLink) messages.push(`PDF Guide: ${pdfLink}`);
    if (videoLink) messages.push(`Video Guide: ${videoLink}`);

    if (!messages.length) {
      useSwalInfoAlert("Info", "No guide available for this page.");
      return;
    }

    useSwalInfoAlert("Reference Information", messages.join("\n"));
  };

  /* ================= TABLE COLUMNS ================= */

  const dateRangeColumns = useMemo(
    () => [
      { key: "year", label: "Year", sortable: true, width: 80, minWidth: 80, requiredVisible: true },
      {
        key: "monthName",
        label: "Month",
        sortable: true,
        width: 80, minWidth: 80, requiredVisible: true ,
        render: (row) => row.monthName || getMonthName(row.month),
      },
      { key: "dateFrom", label: "Date From", sortable: true, width: 80, minWidth: 80, requiredVisible: true  },
      { key: "dateTo", label: "Date To", sortable: true, width: 80, minWidth: 80, requiredVisible: true  },
      { key: "rowCount", label: "Records", sortable: true, width: 80, minWidth: 80},
    ],
    []
  );

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        sortable: false,
        width: 100,
        minWidth: 100,
        render: (row) => (
          <div className="flex items-center justify-center gap-1">
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors text-xs"
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
              className="flex-1 h-7 md:flex-none flex items-center justify-center gap-1 py-2 md:py-2 px-3 md:px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors text-xs"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>
          </div>
        ),
      },
      { key: "year", label: "Year", sortable: true, width: 80, minWidth: 80},
      {
        key: "monthName",
        label: "Month",
        sortable: true,
        render: (row) => row.monthName || getMonthName(row.month),
        width: 80, minWidth: 80
      },
      { key: "dateFrom", label: "Date From", sortable: true, width: 100, minWidth: 80},
      { key: "dateTo", label: "Date To", sortable: true, width: 100, minWidth: 80},
      {
        key: "currCode",
        label: "Currency",
        sortable: true,
        render: (row) => row.currCode || row.CURR_CODE || "",
        width: 80, minWidth: 80, requiredVisible: true 
      },
      {
        key: "fCurrName",
        label: "From Currency",
        sortable: true,
        render: (row) => row.fCurrName ?? row.FCURR_NAME ?? "",
        width: 130, minWidth: 80, requiredVisible: true 
      },
      {
        key: "currRate",
        label: "Curr Rate",
        sortable: true,
        render: (row) => row.currRate ?? row.CURR_RATE ?? "",
        width: 100, minWidth: 80, requiredVisible: true 
      },
      {
        key: "currCode2",
        label: "Currency 2",
        sortable: true,
        render: (row) => row.currCode2 ?? row.CURR_CODE2 ?? "",
        width: 90, minWidth: 80, requiredVisible: true 
      },
      {
        key: "tCurrName",
        label: "To Currency",
        sortable: true,
        render: (row) => row.tCurrName ?? row.TCURR_NAME ?? "",
        width: 130, minWidth: 80, requiredVisible: true 
      },
      {
        key: "currRate2",
        label: "Curr Rate 2",
        sortable: true,
        render: (row) => row.currRate2 ?? row.CURR_RATE2 ?? "",
        width: 100, minWidth: 80, requiredVisible: true 
      },
    ],
    [handleEdit, handleDelete, isMobile, openMobileActionSheet]
  );

  /* ================= RENDER ================= */

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {documentTitle}
            </h1>
          </div>

          <div className="hidden md:flex justify-center w-full" />

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <ButtonBar
                  buttons={[
                    {
                      key: "add",
                      label: <span className="sm:inline ml-1">Add</span>,
                      icon: faPlus,
                      onClick: startNew,
                      disabled: isEditing || isBusy,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${
                        isEditing || isBusy
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`,
                    },
                    {
                      key: "save",
                      label: <span className="sm:inline ml-1">Save</span>,
                      icon: faSave,
                      onClick: handleSave,
                      disabled: !isEditing || saveMutation.isPending || isBusy,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${
                        !isEditing || saveMutation.isPending || isBusy
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`,
                    },
                    {
                      key: "reset",
                      label: <span className="sm:inline ml-1">Reset</span>,
                      icon: faUndo,
                      onClick: handleReset,
                      disabled: isBusy,
                      className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${
                        isBusy
                          ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`,
                    },
                  ]}
                />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  type="button"
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
                      type="button"
                      onClick={() => {
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
                      PDF Guide
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
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

      <div
        className="global-tran-tab-div-ui mt-24 p-6"
        style={{ minHeight: "calc(100vh - 170px)" }}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="rounded-xl border bg-white p-6 shadow-sm md:col-span-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="Start Date"
                  type="date"
                  value={form.fromDate}
                  inputRef={fromDateRef}
                  onChange={(value) => setField("fromDate", value)}
                  disabled={!isEditing || isBusy}
                  required
                />

                <FieldRenderer
                  label="End Date"
                  type="date"
                  value={form.toDate}
                  onChange={(value) => setField("toDate", value)}
                  disabled={!isEditing || isBusy}
                  required
                />

                <FieldRenderer
                  label="Currency"
                  type="lookup"
                  value={
                    form.currCode
                      ? `${form.currCode}${
                          form.currName ? ` - ${form.currName}` : ""
                        }`
                      : ""
                  }
                  onLookup={() => setCurr1ModalOpen(true)}
                  disabled={!isEditing || isBusy}
                  required
                  readOnly
                />

                <FieldRenderer
                  label="Currency Rate"
                  type="number"
                  value={form.currRate}
                  onChange={(value) => setField("currRate", value)}
                  disabled={!isEditing || isBusy}
                  required
                  step="0.000001"
                />
              </div>

              <div className="flex flex-col gap-4">
                <FieldRenderer
                  label="Currency 2"
                  type="lookup"
                  value={
                    form.currCode2
                      ? `${form.currCode2}${
                          form.currName2 ? ` - ${form.currName2}` : ""
                        }`
                      : ""
                  }
                  onLookup={() => setCurr2ModalOpen(true)}
                  disabled={!isEditing || isBusy}
                  required
                  readOnly
                />

                <FieldRenderer
                  label="Currency Rate 2"
                  type="number"
                  value={form.currRate2}
                  onChange={(value) => setField("currRate2", value)}
                  disabled={!isEditing || isBusy}
                  required
                  step="0.000001"
                />
              </div>
            </div>
          </div>

          <div className="flex md:col-span-4 md:justify-end">
            <div className="w-full max-w-[450px]">
              <RegistrationInfo
                data={{
                  registeredBy: form.registeredBy,
                  registeredDate: form.registeredDate,
                  lastUpdatedBy: form.lastUpdatedBy,
                  lastUpdatedDate: form.lastUpdatedDate,
                }}
                layout="minimize"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${docType}_DateRange`}
                columns={dateRangeColumns}
                data={dateRangeRows}
                showFilters
                showGlobalSearch={false}
                showExport={false}
                showColumnChooser={false}
                showAutoFitToggle={true}
                showGroupBy={true}
                initialState={{ groupBy: ["year", "monthName"] }}
                onRowClick={handleDateRangeClick}
                onRowDoubleClick={handleDateRangeClick}
                selectedRow={selectedDateRangeRow}
                isLoading={isInitialLoading} 
                showPagination={false}
                autoFillGrid={true}
                tableSize="Half"
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["dforexList"] })}
              />
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={docType}
                columns={columns}
                data={filteredForexRows}
                showFilters
                isLoading={isInitialLoading}
                onRowDoubleClick={handleEdit}
                selectedRow={selectedRow}
                showGlobalSearch={false}
                onRowClick={handleRowClick}
                showExport={true}
                showColumnChooser={true}
                showAutoFitToggle={true}
                showGroupBy={true}
                initialState={{ groupBy: ["year", "monthName", "dateFrom", "dateTo"] }}
                isFetching={forexListQuery.isFetching}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["dforexList"] })}
                onMobileRowOpen={openMobileActionSheet} // Piped into global table!
                showPagination={false}
                
              />
            </div>
          </div>
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
              <h2 className="text-sm font-bold text-gray-800">Forex Actions</h2>
              <p className="text-xs text-gray-500">
                {selectedMobileRow?.currCode} to {selectedMobileRow?.currCode2}
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

      <SearchCurrencyRef
        isOpen={isCurr1ModalOpen}
        onClose={(value) => {
          if (value) {
            setField("currCode", value.currCode || "");
            setField("currName", value.currName || "");
            setField("fCurrName", value.currName || "");
          }
          setCurr1ModalOpen(false);
        }}
      />

      <SearchCurrencyRef
        isOpen={isCurr2ModalOpen}
        onClose={(value) => {
          if (value) {
            setField("currCode2", value.currCode2 ?? value.currCode ?? "");
            setField("currName2", value.currName2 ?? value.currName ?? "");
            setField("tCurrName", value.currName2 ?? value.currName ?? "");
          }
          setCurr2ModalOpen(false);
        }}
      />
    </div>
  );
};

export default DForexRef;
