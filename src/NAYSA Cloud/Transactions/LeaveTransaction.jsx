/* eslint-disable react-hooks/rules-of-hooks */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClone,
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import Header from "@/NAYSA Cloud/Components/Header.jsx";
import { transactionActionsCellStyle, transactionActionsHeaderStyle, useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput, {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchLeaveEmployeeSelection from "@/NAYSA Cloud/Lookup/SearchLeaveEmployeeSelection.jsx";
import SearchLeaveRef from "@/NAYSA Cloud/Lookup/SearchLeaveRef.jsx";
import SearchCutoffRef from "@/NAYSA Cloud/Lookup/SearchRefPayrollPeriod.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import DocumentSignatories from "@/NAYSA Cloud/Lookup/SearchSignatory.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report.js";
import {
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalInfoAlert,
  useSwalProceedConfirm,
  useSwalSuccessAlert,
  useSwalValidationAlert,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const toDisplayDate = (value) => {
  if (!value) return "";
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(value))
    ? String(value)
    : formatDateToMMDDYYYY(value);
};

const createGroupId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const today = formatDateToMMDDYYYY(new Date().toISOString().slice(0, 10));
const docType = "LV";
const LEAVE_HOURS_PER_DAY = 8;

const initialHeader = {
  lvId: "",
  lvNo: "",
  lvDate: today,
  cutoffType: "",
  cutoffFrequency: "",
  cutoffCode: "",
  cutoffName: "",
  cutoffStartDate: today,
  cutoffEndDate: today,
  remarks: "",
  documentStatus: "",
};

const getCutoffFrequency = (cutoffType) => {
  const value = String(cutoffType || "")
    .trim()
    .toUpperCase();
  if (value.startsWith("S")) return "S";
  if (value.startsWith("M")) return "M";
  if (value.startsWith("W")) return "W";
  return "";
};

const historyFrequencyLabels = {
  S1: "Semi-Monthly 1", S2: "Semi-Monthly 2",
  W1: "Weekly 1", W2: "Weekly 2", W3: "Weekly 3", W4: "Weekly 4",
  S: "Semi-Monthly",
  M: "Monthly",
  W: "Weekly / Daily",
};

const historyFrequencyFields = new Set([
  "frequency", "freq", "payfrequency", "payfreq", "cutofffrequency", "cutofffreq",
]);

const formatLeaveHistory = (history) => {
  if (!history?.rootDataMap) return history;

  const newTabConfigs = { ...history.newTabConfigs };
  const rootDataMap = Object.fromEntries(
    Object.entries(history.rootDataMap).map(([tab, records]) => {
      if (!Array.isArray(records)) return [tab, records];

      const lineNumberKeys = [];
      if (/^OT_(Summary|Details?)$/i.test(tab)) {
        const configured = newTabConfigs[tab] || [];
        const columns = configured.length ? configured : Object.keys(records[0] || {}).map((key) => ({
          key,
          label: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          renderType: "text",
          sortable: true,
        }));
        newTabConfigs[tab] = columns.map((column) => {
          const fields = [column.key, column.label].map((value) =>
            String(value ?? "").toLowerCase().replace(/[^a-z]/g, ""),
          );
          const isEmployeeCount = fields.some((field) => /^(employeecount|empcount)$/.test(field));
          const isLineNumber = fields.some((field) => /^(ln|lnno|lnnumber|lineno|linenumber)$/.test(field));
          if (!isEmployeeCount && !isLineNumber) return column;

          if (isLineNumber) lineNumberKeys.push(column.key);
          return {
            ...column,
            key: isLineNumber ? "leaveLineNumber" : column.key,
            label: isLineNumber ? "LN Number" : column.label,
            renderType: "text",
            classNames: isLineNumber ? "text-center" : "text-right",
          };
        });
      }

      return [tab, records.map((row) => {
        const displayRow = { ...row };
        Object.keys(displayRow).forEach((key) => {
          if (historyFrequencyFields.has(key.toLowerCase().replace(/[^a-z]/g, ""))) {
            displayRow[key] = historyFrequencyLabels[String(row[key] ?? "").trim().toUpperCase()] ?? row[key];
          }
        });
        lineNumberKeys.forEach((key) => {
          displayRow.leaveLineNumber = row[key];
        });
        return displayRow;
      })];
    }),
  );

  return {
    ...history,
    rootDataMap,
    newTabConfigs,
  };
};

const createInitialHeader = (companyInfo) => ({
  ...initialHeader,
  cutoffType: getCutoffFrequency(companyInfo?.cutoffType),
});

const parseResult = (response, fallback = []) => {
  try {
    return JSON.parse(
      response?.data?.data?.[0]?.result || JSON.stringify(fallback),
    );
  } catch {
    return fallback;
  }
};

const numeric = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;

const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(`${formatDateToYYYYMMDD(startDate)}T00:00:00`);
  const end = new Date(`${formatDateToYYYYMMDD(endDate)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
};

const decimal = (value, fractionDigits = 2) =>
  numeric(value).toLocaleString("en-PH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const roundToDecimal = (value, decimals = 2) => {
  const num = numeric(value);
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};


const computeLeaveAmount = ({ hourRate, lvHours, lvMinutes, lvRate }) => {
  const hrRate = numeric(hourRate);
  const hours = numeric(lvHours);
  const minutes = numeric(lvMinutes);
  const syncedMinutes = Math.round((hours - Math.floor(hours)) * 60);
  const totalHours = syncedMinutes === Math.round(minutes)
    ? hours
    : hours + minutes / 60;
  
  const rawAmount = hrRate * totalHours;
  const roundedAmount = roundToDecimal(rawAmount, 2);
  return decimal(roundedAmount, 2);
};

const createRow = (headerDates = {}) => ({
  groupId: createGroupId(),
  empNo: "",
  empName: "",
  lvCode: "",
  lvName: "",
  lvDateDetail: headerDates.startDate || today,
  startDate: headerDates.startDate || today,
  endDate: headerDates.endDate || today,
  lvDays: calculateLeaveDays(
    headerDates.startDate || today,
    headerDates.endDate || today,
  ),
  payFrequency: "",
  frequency: "",
  dailyRate: 0,
  hourRate: 0,
  lvHours: "0.00",
  lvMinutes: "0.00",
  lvAmount: "0.00",
  payGroup: "",
  groupCode: "",
  branchCode: "",
  deptCode: "",
  posCode: "",
});

const isValidNumberEntry = (field, value) => {
  if (field === "lvMinutes") {
    return /^\d*(\.0{0,4})?$/.test(value) && Number.isSafeInteger(numeric(value));
  }
  return /^\d*(\.\d{0,4})?$/.test(value);
};

const normalizeLeaveDuration = ({ lvDays, lvHours, lvMinutes }, sourceField = "lvMinutes") => {
  const days = Math.max(0, numeric(lvDays));
  const hours = Math.max(0, numeric(lvHours));
  const minutes = Math.max(0, numeric(lvMinutes));
  const totalHours = sourceField === "lvDays"
    ? days * LEAVE_HOURS_PER_DAY
    : sourceField === "lvHours" ? hours : Math.floor(hours) + minutes / 60;
  const totalMinutes = Math.round(totalHours * 60);

  return {
    lvDays: decimal(totalMinutes / (LEAVE_HOURS_PER_DAY * 60)),
    lvHours: decimal(totalMinutes / 60),
    lvMinutes: decimal(totalMinutes % 60),
  };
};

const normalizeLeaveMinutes = (values) => normalizeLeaveDuration(values, "lvMinutes");

const syncLeaveDuration = (values, sourceField) => {
  const normalized = normalizeLeaveDuration(values, sourceField);
  if (sourceField === "lvDays") {
    return { ...normalized, lvDays: values.lvDays };
  }
  if (sourceField === "lvHours") {
    return { ...normalized, lvHours: values.lvHours };
  }
  return numeric(values.lvMinutes) < 60
    ? { ...normalized, lvMinutes: values.lvMinutes }
    : normalized;
};

const normalizeRow = (row, fallbackStart = today, fallbackEnd = today) => {
  const dailyRate = numeric(row.dailyRate ?? row.daily_rate ?? row.DAILY_RATE);
  const hourRate = numeric(row.hourRate ?? row.hour_rate ?? row.HOUR_RATE);
  const lvHours = decimal(row.lvHours);
  const lvMinutes = decimal(row.lvMinutes);
  const lvRate = decimal(row.lvRate ?? row.ot_rate ?? row.OT_RATE);

  return {
    ...row,
    dailyRate,
    hourRate,
    lvDateDetail: toDisplayDate(
      row.lvDateDetail || row.startDate || fallbackStart,
    ),
    startDate: toDisplayDate(row.startDate || row.lvDateDetail || fallbackStart),
    endDate: toDisplayDate(
      row.endDate || row.startDate || row.lvDateDetail || fallbackEnd,
    ),
    lvDays: row.lvDays ?? calculateLeaveDays(
      row.startDate || row.lvDateDetail || fallbackStart,
      row.endDate || row.startDate || row.lvDateDetail || fallbackEnd,
    ),
    lvHours,
    lvMinutes,
    lvRate,
    lvAmount: computeLeaveAmount({ hourRate, lvHours, lvMinutes, lvRate }),
    payGroup: row.payGroup || row.groupCode || "",
    branchCode: row.branchCode || "",
    deptCode: row.deptCode || "",
    posCode: row.posCode || row.positionCode || "",
  };
};

const otColumns = [
  ["ot", "LN", 60],
  ["empNo", "Emp No.", 115],
  ["empName", "Employee Name", 210],
  ["lvCode", "Leave Code", 105],
  ["lvName", "Leave Description", 190],
  ["startDate", "Start Date", 130],
  ["endDate", "End Date", 130],
  ["lvDays", "Leave Days", 100],
  ["lvHours", "Leave Hrs.", 105],
  ["lvMinutes", "Leave Mins.", 100],
  ["hourRate", "Hour Rate", 110],
  ["lvAmount", "Amount", 120],
  ["payGroup", "Pay Group", 95],
  ["branchCode", "Branch", 90],
  ["deptCode", "Department", 90],
  ["posCode", "Position", 90],
];

const LeaveTransaction = () => {
  const { user, companyInfo, refsLoaded } = useAuth();
  const queryClient = useQueryClient();
  // Apply the display selector only to this history view; keep cached API data unchanged.
  const [historyQueryClient] = useState(() => new QueryClient({
    queryCache: queryClient.getQueryCache(),
    defaultOptions: {
      ...queryClient.getDefaultOptions(),
      queries: {
        ...queryClient.getDefaultOptions().queries,
        select: formatLeaveHistory,
      },
    },
  }));
  const inputRefs = useRef({});
  const [topTab, setTopTab] = useState("details");
  const [header, setHeader] = useState(() => createInitialHeader(companyInfo));
  const [rows, setRows] = useState([]);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showSignatoryModal, setShowSignatoryModal] = useState(false);
  const [noReprints, setNoReprints] = useState(0);
  const [replicateValues, setReplicateValues] = useState({
    lvDays: "1.00",
    lvHours: "0.00",
    lvMinutes: "0.00",
  });
  const [lookup, setLookup] = useState({ type: "", index: null });
  const [otWidths, setOtWidths] = useState(() => ({
    ...Object.fromEntries(otColumns.map(([key, , width]) => [key, width])),
    actions: 80,
  }));

  const otColumnDefs = otColumns.map(([key, label, width]) => ({ key, label, width }));
  const { getColumnStyle, getFrozenColumnStyle, renderResizableHeader, renderHeaderContextMenu } = useResizableTableColumns(otColumnDefs);
  const frozenKeys = new Set(["ot", "empNo", "empName", "lvCode", "lvName"]);
  const frozenColumns = otColumnDefs.map(col => ({ ...col, frozen: frozenKeys.has(col.key) }));
  const columnCellStyle = (key) => ({
    ...getColumnStyle(key, otColumnDefs.find(col => col.key === key)?.width || 120),
    ...(frozenKeys.has(key) ? getFrozenColumnStyle(key, frozenColumns, undefined, { isHeader: false }) : {}),
  });
  const isReadOnly = !["", "O", "OPEN"].includes(String(header.documentStatus || "").trim().toUpperCase());
  const status =
    header.documentStatus === "F"
      ? "FINALIZED"
      : header.documentStatus === "X"
        ? "CANCELLED"
        : "OPEN";
  const statusColor =
    status === "FINALIZED"
      ? "global-tran-stat-text-finalized-ui"
      : status === "CANCELLED"
        ? "global-tran-stat-text-closed-ui"
        : "global-tran-stat-text-open-ui";

  const updateHeader = (values) =>
    setHeader((current) => ({ ...current, ...values }));

  const updateRow = (index, values, timeSource = null, timeBase = null) =>
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextRow = { ...row, ...values };
        if (
          "hourRate" in values ||
          "lvHours" in values ||
          "lvMinutes" in values ||
          "lvRate" in values
        ) {
          const calculationTime = timeSource
            ? normalizeLeaveDuration(timeBase || nextRow, timeSource)
            : nextRow;
          nextRow.lvAmount = computeLeaveAmount({ ...nextRow, ...calculationTime });
        }
        return nextRow;
      }),
    );

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/leave-transaction/save", {
        jsonData: {
          ...header,
          lvId: header.lvId || null,
          lvNo: header.lvNo || null,
          cutoffType: header.cutoffType,
          cutoffFrequency: header.cutoffFrequency,
          lvDate: formatDateToYYYYMMDD(header.lvDate),
          leaveDate: formatDateToYYYYMMDD(header.lvDate),
          cutoffStartDate: formatDateToYYYYMMDD(header.cutoffStartDate),
          cutoffEndDate: formatDateToYYYYMMDD(header.cutoffEndDate),
          userCode: user?.USER_CODE || "ADMIN",
          rows: rows.map((row, index) => {
            const time = normalizeLeaveMinutes(row);
            return {
              ...row,
              lineNo: index + 1,
              lvDateDetail: formatDateToYYYYMMDD(
                row.startDate || row.lvDateDetail || header.cutoffStartDate,
              ),
              startDate: formatDateToYYYYMMDD(
                row.startDate || row.lvDateDetail || header.cutoffStartDate,
              ),
              endDate: formatDateToYYYYMMDD(
                row.endDate || row.startDate || header.cutoffEndDate,
              ),
              lvDays: calculateLeaveDays(row.startDate || row.lvDateDetail, row.endDate || row.startDate),
              dailyRate: numeric(row.dailyRate),
              hourRate: numeric(row.hourRate),
              lvHours: numeric(time.lvHours),
              lvMinutes: numeric(time.lvMinutes),
              lvAmount: numeric(
                computeLeaveAmount({
                  hourRate: row.hourRate,
                  lvHours: time.lvHours,
                  lvMinutes: time.lvMinutes,
                }),
              ),
            };
          }),
        },
      }),
    onSuccess: async (response) => {
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount > 0 || result.errorcount > 0) {
        useSwalErrorAlert("Unable to save", result.errorMsg || result.errormsg);
        return;
      }

      // Save returns a SQL result row with lvId and lvNo, not leaveId/leaveNo.
      const savedId = result.lvId || result.leaveId;
      const savedNo = result.lvNo || result.leaveNo;
      if (!savedId) {
        useSwalErrorAlert("Save response error", "The server did not return the saved transaction ID. Check Transaction History before saving again.");
        return;
      }

      // Preserve the committed identity even if the follow-up Get fails.
      setHeader((prev) => ({ ...prev, lvId: savedId, lvNo: savedNo || prev.lvNo }));

      try {
        const getResponse = await apiClient.post("/leave-transaction/get", {
          jsonData: { lvId: savedId },
        });
        const saved = parseResult(getResponse, null);
        if (!saved?.lvId) throw new Error("Saved transaction could not be loaded.");

        const nextStart = toDisplayDate(saved.cutoffStartDate) || today;
        const nextEnd = toDisplayDate(saved.cutoffEndDate) || today;
        setHeader((prev) => ({
          ...initialHeader,
          ...saved,
          lvId: saved.lvId || savedId,
          lvNo: saved.lvNo || savedNo || "",
          cutoffName: saved.cutoffName || prev.cutoffName || "",
          cutoffType: saved.cutoffType || getCutoffFrequency(saved.cutoffFrequency),
          cutoffFrequency: saved.cutoffFrequency,
          lvDate: toDisplayDate(saved.lvDate || saved.leaveDate),
          cutoffStartDate: nextStart,
          cutoffEndDate: nextEnd,
        }));
        setRows((saved.rows || []).map((r) => normalizeRow(r, nextStart, nextEnd)));
        useSwalshowSaveSuccessDialog(reset, () => setShowSignatoryModal(true), () => {});
      } catch (error) {
        useSwalErrorAlert(
          "Saved — reload failed",
          `Leave transaction ${savedNo || savedId} was saved successfully, but could not be reloaded. Check Transaction History before retrying. ${error?.response?.data?.message || error.message || ""}`,
        );
      }
    },
    onError: (error) => {
      const validationMessage = Object.values(
        error?.response?.data?.errors || {},
      ).flat()[0];
      useSwalErrorAlert(
        "Save Error",
        validationMessage ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save leave transaction.",
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ mode, password = "", reason = "" }) =>
      apiClient.post(`/leave-transaction/${mode}`, {
        userCode: user?.USER_CODE || "ADMIN",
        userPassword: password,
        jsonData: {
          lvId: header.lvId,
          userCode: user?.USER_CODE || "ADMIN",
          remarks: reason,
        },
      }),
    onSuccess: (response, { mode }) => {
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount > 0 || result.errorcount > 0)
        return useSwalErrorAlert(
          "Unable to continue",
          result.errorMsg || result.errormsg,
        );
      updateHeader({
        documentStatus: mode === "post" ? "F" : "X",
        remarks: mode === "cancel" ? result.remarks : header.remarks,
      });
      setShowCancelModal(false);
      useSwalSuccessAlert("Success!", result.message);
    },
    onError: (error) => useSwalErrorAlertAPI("Transaction Error", error),
  });

  const busy =
    saveMutation.isPending || actionMutation.isPending || loadingTransaction;

  const reset = () => {
    setHeader(createInitialHeader(companyInfo));
    setRows([]);
    setNoReprints(0);
    setReplicateValues({
      lvDays: "1.00",
      lvHours: "0.00",
      lvMinutes: "0.00",
    });
    setTopTab("details");
  };

  useEffect(() => {
    if (!refsLoaded || !companyInfo) return;
    setHeader((current) =>
      current.lvId || current.lvNo
        ? current
        : {
            ...current,
            cutoffType:
              current.cutoffType ||
              getCutoffFrequency(companyInfo.cutoffType),
          },
    );
  }, [companyInfo, refsLoaded]);

  const addSelections = ({ employees, leaves, lvHours }) => {
    const defaultStart = header.cutoffStartDate || header.lvDate || today;
    const defaultEnd = header.cutoffEndDate || header.lvDate || today;

    setRows((current) => [
      ...current,
      ...employees.flatMap((employee) =>
        leaves.map((ot) => {
          const dailyRate = numeric(
            employee.dailyRate ?? employee.daily_rate ?? employee.DAILY_RATE,
          );
          const hourRate = numeric(
            employee.hourRate ?? employee.hour_rate ?? employee.HOUR_RATE,
          );
          const lvRate = decimal(ot.lvRate ?? ot.ot_rate ?? ot.OT_RATE ?? 0);
          const formattedHours = decimal(lvHours);

          return {
            ...createRow({ startDate: defaultStart, endDate: defaultEnd }),
            empNo: employee.empNo,
            empName: employee.empName,
            lvCode: ot.code,
            lvName: ot.description,
            payFrequency: employee.payFrequency,
            payGroup: employee.payGroup || employee.groupCode || "",
            groupCode: employee.groupCode || employee.payGroup || "",
            branchCode: employee.branchCode || "",
            deptCode: employee.deptCode || employee.departmentCode || "",
            posCode: employee.posCode || employee.positionCode || employee.POS_CODE || employee.POSITION_CODE || "",
            dailyRate,
            hourRate,
            lvHours: formattedHours,
            lvRate,
            lvAmount: computeLeaveAmount({
              hourRate,
              lvHours: formattedHours,
              lvMinutes: "0.00",
              lvRate,
            }),
          };
        }),
      ),
    ]);
  };

  const insertRowAfter = (index) => {
    if (isReadOnly) return;
    setRows(current => {
      const next = [...current];
      next.splice(index + 1, 0, createRow({ startDate: header.cutoffStartDate, endDate: header.cutoffEndDate }));
      return next;
    });
  };

  const removeRow = (index) =>
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));

  const validate = () => {
    if (!header.lvDate || !header.cutoffType || !header.cutoffFrequency)
      return "Transaction Date and Pay Frequency are required.";
    const allowed = { S: ["S1", "S2"], M: ["M"], W: ["W1", "W2", "W3", "W4"] };
    if (!allowed[header.cutoffType]?.includes(header.cutoffFrequency)) return "Cut-Off Frequency does not match Cut-Off Type.";
    if (!header.cutoffCode) return "Payroll Cut-Off is required.";
    if (!header.cutoffStartDate || !header.cutoffEndDate)
      return "Cut-Off Start Date and End Date are required.";
    if (
      formatDateToYYYYMMDD(header.cutoffEndDate) <
      formatDateToYYYYMMDD(header.cutoffStartDate)
    )
      return "Cut-Off End Date cannot be earlier than Start Date.";
    if (!rows.length) return "Add at least one leave detail row.";

    for (const row of rows) {
      if (!row.empNo || !row.lvCode || !row.startDate || !row.endDate)
        return "Complete all required fields (Employee, Leave Code, Start Date, End Date) in every row.";
      if (
        formatDateToYYYYMMDD(row.endDate) < formatDateToYYYYMMDD(row.startDate)
      )
        return `Row End Date cannot be earlier than Start Date for employee ${row.empNo}.`;
      if (
        numeric(row.lvHours) < 0 ||
        numeric(row.lvMinutes) < 0 ||
        numeric(row.lvAmount) < 0
      )
        return "Enter valid nonnegative values.";
      if (!Number.isSafeInteger(numeric(row.lvMinutes)))
        return `Enter whole-number leave minutes for employee ${row.empNo}.`;
    }
    return "";
  };

  const save = () => {
    const message = validate();
    if (message)
      return useSwalErrorAlert("Check Leave Transaction", message);
    saveMutation.mutate();
  };

  const closeCancelModal = (confirmation) => {
    if (!confirmation) return setShowCancelModal(false);
    actionMutation.mutate({
      mode: "cancel",
      password: confirmation.password,
      reason: confirmation.reason,
    });
  };

  const closeSignatoryModal = async (mode = "Inline") => {
    const printMode =
      typeof mode === "string"
        ? mode
        : mode?.mode || mode?.printMode || "Inline";
    setShowSignatoryModal(false);
    setLoadingTransaction(true);
    if (printMode === "Final") setNoReprints(1);
    try {
      await useHandlePrint(
        header.lvId,
        docType,
        printMode,
        user?.USER_CODE || "ADMIN",
      );
    } finally {
      setLoadingTransaction(false);
    }
  };

  const loadTransaction = async (selected) => {
    setLoadingTransaction(true);
    try {
      const docNo = selected?.docNo || "";
      if (!docNo)
        return useSwalErrorAlert(
          "Unable to load",
          "Transaction No. is missing.",
        );
      const response = await apiClient.post("/leave-transaction/get", {
        jsonData: { lvNo: docNo },
      });
      const record = parseResult(response, {});
      if (!record?.lvId)
        return useSwalErrorAlert(
          "Unable to load",
          `Leave transaction ${docNo} was not found.`,
        );
      const nextStart = toDisplayDate(record.cutoffStartDate) || today;
      const nextEnd = toDisplayDate(record.cutoffEndDate) || today;
      setHeader({
        ...initialHeader,
        ...record,
        lvId: record.lvId || record.leaveId || "",
        lvNo: record.lvNo || record.leaveNo || "",
        cutoffName: record.cutoffName || "",
        cutoffType: record.cutoffType || getCutoffFrequency(record.cutoffFrequency),
        cutoffFrequency: record.cutoffFrequency,
        lvDate: toDisplayDate(record.lvDate || record.leaveDate),
        cutoffStartDate: nextStart,
        cutoffEndDate: nextEnd,
      });
      setRows(
        (record.rows || []).map((r) => normalizeRow(r, nextStart, nextEnd)),
      );
      setTopTab("details");
    } catch (error) {
      useSwalErrorAlertAPI("Load Error", error);
    } finally {
      setLoadingTransaction(false);
    }
  };

  const focusNext = (index, field) =>
    requestAnimationFrame(() =>
      inputRefs.current[`${field}-${index + 1}`]?.focus(),
    );

  const dateCell = (row, index, field) => (
    <DateFormatInput
      id={`${field}${index}`}
      value={row[field] || ""}
      disabled={isReadOnly}
      className="w-full global-tran-td-inputclass-ui text-center pr-7"
      updateState={(values) => {
        const nextDate = values[`${field}${index}`];
        updateRow(index, {
          [field]: nextDate,
          ...(field === "startDate" ? { lvDateDetail: nextDate } : {}),
        });
      }}
    />
  );

  const formatNumberCell = (index, field) => {
    if (isReadOnly) return;
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const updated = {
          ...row,
          ...(field === "lvDays" || field === "lvHours" || field === "lvMinutes"
            ? normalizeLeaveDuration(row, field)
            : { [field]: decimal(row[field]) }),
        };
        updated.lvAmount = computeLeaveAmount(updated);
        return updated;
      }),
    );
  };

  const numberCell = (row, index, field, forceReadOnly = false) => {
    const cellReadOnly = isReadOnly || forceReadOnly;
    return (
      <input
        ref={(element) => {
          inputRefs.current[`${field}-${index}`] = element;
        }}
        value={row[field] ?? ""}
        readOnly={cellReadOnly}
        tabIndex={forceReadOnly ? -1 : undefined}
        inputMode={field === "lvMinutes" ? "numeric" : "decimal"}
        title={
          field === "lvMinutes"
            ? "Whole minutes (0-59). Every 60 minutes carries over to Leave Hrs. when you leave the field or press Enter."
            : undefined
        }
        onFocus={(event) => {
          if (!cellReadOnly)
            event.target.value = String(event.target.value).replace(/,/g, "");
        }}
        onChange={(event) => {
          if (cellReadOnly) return;
          const value = event.target.value.replace(/,/g, "");
          if (isValidNumberEntry(field, value)) {
            const isDurationField = field === "lvDays" || field === "lvHours" || field === "lvMinutes";
            const canSync = isDurationField && value !== "" && !value.endsWith(".");
            const timeBase = { ...row, [field]: value };
            updateRow(
              index,
              canSync ? syncLeaveDuration(timeBase, field) : { [field]: value },
              canSync ? field : null,
              canSync ? timeBase : null,
            );
          }
        }}
        onBlur={() => !cellReadOnly && formatNumberCell(index, field)}
        onKeyDown={(event) => {
          if (!cellReadOnly && event.key === "Enter") {
            event.preventDefault();
            formatNumberCell(index, field);
            focusNext(index, field);
          }
        }}
        className={`global-tran-td-inputclass-ui h-7 w-full bg-transparent text-right text-xs ${
          forceReadOnly ? "cursor-not-allowed text-slate-500" : ""
        }`}
      />
    );
  };

  const updateReplicateValue = (field, value) => {
    const normalized = String(value || "").replace(/,/g, "");
    if (isValidNumberEntry(field, normalized)) {
      const isDurationField = field === "lvDays" || field === "lvHours" || field === "lvMinutes";
      const canSync = isDurationField && normalized !== "" && !normalized.endsWith(".");
      setReplicateValues((current) => ({
        ...current,
        ...(canSync
          ? syncLeaveDuration({ ...current, [field]: normalized }, field)
          : { [field]: normalized }),
      }));
    }
  };

  const formatReplicateTime = (field) => {
    if (isReadOnly || !rows.length) return;
    setReplicateValues((current) => ({
      ...current,
      ...normalizeLeaveDuration(current, field),
    }));
  };

  const formatReplicateMinutes = () => formatReplicateTime("lvMinutes");

  const replicateDateToRows = async (headerField, rowField, labelName) => {
    if (!rows.length)
      return useSwalInfoAlert(
        "Details Required",
        `Add details before applying ${labelName} to all rows.`,
      );
    const dateValue = header[headerField];
    if (!dateValue)
      return useSwalValidationAlert({
        title: `${labelName} Required`,
        message: `Select ${labelName} first.`,
      });
    const confirmation = await useSwalProceedConfirm(
      `Apply ${labelName}?`,
      `Apply ${dateValue} to all detail rows?`,
      "Apply to all",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) =>
      current.map((row) => {
        const nextRow = {
          ...row,
          [rowField]: dateValue,
          ...(rowField === "startDate" ? { lvDateDetail: dateValue } : {}),
        };
        return {
          ...nextRow,
          lvDays: calculateLeaveDays(nextRow.startDate, nextRow.endDate),
        };
      }),
    );
  };

  const replicateLeaveDays = async () => {
    if (!rows.length)
      return useSwalInfoAlert(
        "Details Required",
        "Add details before applying Leave Days.",
      );
    const days = numeric(replicateValues.lvDays);
    const normalizedDuration = normalizeLeaveDuration({ lvDays: days }, "lvDays");
    const confirmation = await useSwalProceedConfirm(
      "Apply Leave Days?",
      `Apply ${days} Leave Days to all rows?`,
      "Apply to all",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) => current.map((row) => {
      const nextRow = { ...row, ...normalizedDuration };
      return { ...nextRow, lvAmount: computeLeaveAmount(nextRow) };
    }));
  };

  const replicateLeaveHoursMins = async () => {
    if (!rows.length)
      return useSwalInfoAlert(
        "Details Required",
        "Add details before applying Leave Hrs./Mins.",
      );
    const normalizedTime = normalizeLeaveDuration(replicateValues, "lvHours");
    const { lvDays: days, lvHours: hrs, lvMinutes: mins } = normalizedTime;
    setReplicateValues((current) => ({ ...current, ...normalizedTime }));
    const confirmation = await useSwalProceedConfirm(
      "Apply Leave Hrs. / Mins.?",
      `Apply ${days} Days (${hrs} Hrs and ${mins} Mins) to all rows?`,
      "Apply to all",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) =>
      current.map((row) => {
        const nextRow = {
          ...row,
          lvDays: days,
          lvHours: hrs,
          lvMinutes: mins,
        };
        return {
          ...nextRow,
          lvAmount: computeLeaveAmount(nextRow),
        };
      }),
    );
  };

  const lookupCell = (row, index, type) => (
    <div className="relative flex items-center">
      <input
        value={type === "employee" ? row.empNo : row.lvCode}
        readOnly
        onClick={() => !isReadOnly && setLookup({ type: type === "ot" ? "lv" : type, index })}
        className="global-tran-td-inputclass-ui h-7 w-full cursor-pointer bg-transparent pr-7 text-xs"
      />
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        onClick={() => !isReadOnly && setLookup({ type: type === "ot" ? "lv" : type, index })}
        className="absolute right-2 cursor-pointer text-xs text-blue-600"
      />
    </div>
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          hours: sum.hours + numeric(row.lvHours),
          amount: sum.amount + numeric(row.lvAmount),
        }),
        { hours: 0, amount: 0 },
      ),
    [rows],
  );

  const startResize = (event, key, widths, setWidths) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widths[key];
    const move = (moveEvent) =>
      setWidths((current) => ({
        ...current,
        [key]: Math.max(60, startWidth + moveEvent.clientX - startX),
      }));
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const resizeHeader = (key, label, widths, setWidths, extraClass = "") => (
    <th
      key={key}
      className={`global-tran-th-ui relative ${extraClass}`}
      style={{ width: widths[key], minWidth: widths[key] }}
    >
      {label}
      <span
        onMouseDown={(event) => startResize(event, key, widths, setWidths)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-blue-500"
      />
    </th>
  );

  return (
    <div className="global-tran-main-div-ui">
      {busy && <LoadingSpinner />}
      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation
          onSave={save}
          onReset={reset}
          onPrint={() => setShowSignatoryModal(true)}
          onPost={() => actionMutation.mutate({ mode: "post" })}
          onCancel={() => setShowCancelModal(true)}
          onAttach={() => setShowAttachModal(true)}
          isSaveDisabled={isReadOnly || !rows.length}
          isPrintDisabled={!header.lvId || header.documentStatus === "X"}
          isAttachDisabled={!header.lvId || header.documentStatus === "X"}
          isPostDisabled={!header.lvId || isReadOnly}
          isCancelDisabled={!header.lvId || isReadOnly}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">Leave Transaction</h1>
          </div>
          <div className="global-tran-headerstat-div-ui flex items-center gap-6">
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1
                className={`global-tran-stat-text-ui uppercase ${statusColor}`}
              >
                {status}
              </h1>
            </div>
          </div>
        </div>

        {/* Header Section: 4 Columns Matching Reference Layout */}
        <div className="global-tran-header-div-ui">
          <style>{`
            #leave-entry-fields .global-ref-floating-label,
            #leave-entry-fields .global-tran-floating-label-remarks {
              top: -1.25rem !important;
              left: 0 !important;
              inset-inline-start: 0 !important;
              transform: none !important;
              padding: 0 !important;
              background: transparent !important;
              font-size: 0.75rem !important;
              line-height: 1rem !important;
              white-space: nowrap !important;
            }

            #leave-entry-fields .global-ref-textbox-ui {
              height: 2.5rem !important;
              min-height: 2.5rem !important;
              font-size: 0.75rem !important;
              line-height: 1.25rem !important;
            }

            #leave-entry-fields input.global-ref-textbox-ui {
              padding-top: 0.5rem !important;
              padding-bottom: 0.5rem !important;
            }

            #leave-entry-fields input.global-ref-textbox-ui[readonly] {
              padding-right: 3rem !important;
            }

            #leave-entry-fields button[title="Search"],
            #leave-entry-fields .global-ref-textbox-ui ~ .pointer-events-none {
              height: 2.5rem !important;
            }
          `}</style>
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div
            id="leave-entry-fields"
            className="grid grid-cols-1 gap-7 p-2 pt-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
          >
            {/* Column 1: Transaction No., Transaction Date, Pay Frequency */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  label="Transaction No."
                  type="text"
                  value={header.lvNo || "Auto Generated"}
                  disabled
                />
              </div>

              <div className="min-w-0">
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui !h-10 !p-0 [&>div]:h-full ${
                      !isReadOnly
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="lvDate"
                      className="peer h-full w-full min-w-0 cursor-pointer rounded-lg border-none bg-transparent py-0 pl-2 pr-8 focus:outline-none"
                      value={header.lvDate}
                      disabled={isReadOnly}
                      updateState={(values) =>
                        updateHeader({ lvDate: values.lvDate })
                      }
                    />
                  </div>
                  <label htmlFor="lvDate" className="global-ref-floating-label">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  id="otFrequency"
                  label="Pay Frequency"
                  required
                  type="select"
                  value={header.cutoffType}
                  options={[
                    { value: "S", label: "Semi-Monthly" },
                    { value: "M", label: "Monthly" },
                    { value: "W", label: "Weekly" },
                  ]}
                  placeholder="Select Pay Frequency"
                  disabled={isReadOnly}
                  hideClearButton
                  onChange={(value) =>
                    updateHeader({
                      cutoffType: value,
                      cutoffFrequency: "",
                      cutoffCode: "",
                      cutoffName: "",
                      cutoffStartDate: today, cutoffEndDate: today,
                    })
                  }
                />
              </div>
            </div>

            {/* Column 2: Payroll Cut-Off (Lookup), Start Date (+ Apply), End Date (+ Apply) */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  id="cutoffCode"
                  label="Payroll Cut-Off"
                  required
                  type="lookup"
                  value={
                    header.cutoffCode
                      ? header.cutoffName
                        ? `${header.cutoffCode} - ${header.cutoffName}`
                        : header.cutoffCode
                      : ""
                  }
                  placeholder="Select Payroll Cut-Off"
                  disabled={isReadOnly}
                  onLookup={() =>
                    !isReadOnly && setLookup({ type: "cutoff", index: null })
                  }
                />
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <div className="relative min-w-0 flex-1">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui !h-10 !p-0 [&>div]:h-full ${
                      !isReadOnly
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="cutoffStartDate"
                      className="peer h-full w-full min-w-0 cursor-pointer rounded-lg border-none bg-transparent py-0 pl-2 pr-8 focus:outline-none"
                      value={header.cutoffStartDate}
                      disabled={isReadOnly}
                      updateState={(values) =>
                        updateHeader({ cutoffStartDate: values.cutoffStartDate })
                      }
                    />
                  </div>
                  <label
                    htmlFor="cutoffStartDate"
                    className="global-ref-floating-label"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                </div>
                <button
                  type="button"
                  title="Apply Start Date to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={() =>
                    replicateDateToRows(
                      "cutoffStartDate",
                      "startDate",
                      "Start Date",
                    )
                  }
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <div className="relative min-w-0 flex-1">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui !h-10 !p-0 [&>div]:h-full ${
                      !isReadOnly
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="cutoffEndDate"
                      className="peer h-full w-full min-w-0 cursor-pointer rounded-lg border-none bg-transparent py-0 pl-2 pr-8 focus:outline-none"
                      value={header.cutoffEndDate}
                      disabled={isReadOnly}
                      updateState={(values) =>
                        updateHeader({ cutoffEndDate: values.cutoffEndDate })
                      }
                    />
                  </div>
                  <label
                    htmlFor="cutoffEndDate"
                    className="global-ref-floating-label"
                  >
                    End Date <span className="text-red-500">*</span>
                  </label>
                </div>
                <button
                  type="button"
                  title="Apply End Date to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={() =>
                    replicateDateToRows("cutoffEndDate", "endDate", "End Date")
                  }
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>

            </div>
          {/* Column 3: Leave Hours and Minutes */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateOtHours"
                    label="Leave Hrs."
                    type="amount"
                    value={replicateValues.lvHours}
                    inputMode="decimal"
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) => updateReplicateValue("lvHours", value)}
                    onBlur={() => formatReplicateTime("lvHours")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        formatReplicateTime("lvHours");
                      }
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateOtMinutes"
                    label="Mins."
                    type="amount"
                    value={replicateValues.lvMinutes}
                    inputMode="numeric"
                    title="Whole minutes (0-59). Every 60 minutes carries over to Leave Hrs. when you leave the field or press Enter."
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) =>
                      updateReplicateValue("lvMinutes", value)
                    }
                    onBlur={formatReplicateMinutes}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        formatReplicateMinutes();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  title="Apply Leave Hrs./Mins. to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={replicateLeaveHoursMins}
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateLvDays"
                    label="Leave Days"
                    type="amount"
                    value={replicateValues.lvDays}
                    inputMode="decimal"
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) => updateReplicateValue("lvDays", value)}
                    onBlur={() => formatReplicateTime("lvDays")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        formatReplicateTime("lvDays");
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  title="Apply Leave Days to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={replicateLeaveDays}
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>

            </div>

            {/* Column 4: Remarks */}
            <div className="flex min-w-0 flex-col">
              <div className="relative h-full min-h-[11rem]">
                <textarea
                  id="remarks"
                  rows={6}
                  className="peer global-tran-textbox-remarks-ui h-full !min-h-[11rem] resize-y pt-2"
                  value={header.remarks}
                  onChange={(event) =>
                    updateHeader({ remarks: event.target.value })
                  }
                  disabled={isReadOnly}
                />
                <label
                  htmlFor="remarks"
                  className="global-tran-floating-label-remarks"
                >
                  Remarks
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Details Table */}
        <div id="ot_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Leave Details
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table
                className="border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l"
                style={{ tableLayout: "fixed", minWidth: "max-content" }}
              >

                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {otColumnDefs.map(col => renderResizableHeader(col.label, col.key, col.width, { orderedColumns: frozenColumns }))}
                    <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody className="relative">
                  {rows.map((row, index) => (
                    <tr key={row.groupId} className="global-tran-tr-ui">
                      <td style={columnCellStyle("ot")} className="global-tran-td-ui text-center">
                        {String(index + 1).padStart(4, "0")}
                      </td>
                      <td style={columnCellStyle("empNo")} className="global-tran-td-ui">
                        {lookupCell(row, index, "employee")}
                      </td>
                      <td style={columnCellStyle("empName")} className="global-tran-td-ui">{row.empName}</td>
                      <td style={columnCellStyle("lvCode")} className="global-tran-td-ui">
                        {lookupCell(row, index, "ot")}
                      </td>
                      <td style={columnCellStyle("lvName")} className="global-tran-td-ui">{row.lvName}</td>
                      <td className="global-tran-td-ui">
                        {dateCell(row, index, "startDate")}
                      </td>
                      <td className="global-tran-td-ui">
                        {dateCell(row, index, "endDate")}
                      </td>
                      <td style={columnCellStyle("lvDays")} className="global-tran-td-ui text-right">
                        {numberCell(row, index, "lvDays")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "lvHours")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "lvMinutes")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "hourRate", true)}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "lvAmount", true)}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.groupCode || ""}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.branchCode || ""}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.deptCode || ""}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.posCode || ""}
                      </td>
                      <td
                        className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                        style={transactionActionsCellStyle}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {!isReadOnly && (<button type="button" onClick={() => insertRowAfter(index)} className="global-tran-td-button-add-ui" title="Insert row below"><FontAwesomeIcon icon={faPlus} /></button>)}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="global-tran-td-button-delete-ui"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderHeaderContextMenu?.()}
            </div>
          </div>

          {/* Footer Buttons & Totals */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() => {
                  if (!header.cutoffType || !header.cutoffFrequency) {
                    return useSwalValidationAlert({
                      title: "Pay Frequency Required",
                      message: "Select Pay Frequency first.",
                    });
                  }
                  if (!header.cutoffCode) {
                    return useSwalValidationAlert({
                      title: "Payroll Cut-Off Required",
                      message: "Select Payroll Cut-Off first.",
                    });
                  }
                  setLookup({ type: "employees", index: null });
                }}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isReadOnly ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ["Total Leave Hours:", totals.hours],
                ["Total Amount:", totals.amount],
              ].map(([label, value]) => (
                <Fragment key={label}>
                  <div className="global-tran-tab-footer-total-label-ui">
                    {label}
                  </div>
                  <div className="global-tran-tab-footer-total-value-ui text-right">
                    {decimal(value)}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Tab */}
      <div className={topTab === "history" ? "" : "hidden"}>
        <QueryClientProvider client={historyQueryClient}>
          <AllTranHistory
            showHeader={false}
            isActive={topTab === "history"}
            endpoint="/leave-transaction/history"
            cacheKey="LeaveTransactionHistoryTotals"
            activeTabKey="LV_Summary"
            status="All"
            onRowDoubleClick={loadTransaction}
            historyExportName="Leave Transaction History"
            amountDecimals={2}
          />
        </QueryClientProvider>
      </div>

      {/* Lookup Modals */}
      <SearchCutoffRef
        isOpen={lookup.type === "cutoff"}
        payFrequency={String(header.cutoffType || "").trim().toUpperCase()}
        onClose={(selected) => {
          if (selected) {
            updateHeader({
              cutoffCode: selected.code,
              cutoffName: selected.description || "",
              cutoffStartDate:
                selected.cutoffStartDate || header.cutoffStartDate || today,
              cutoffEndDate:
                selected.cutoffEndDate || header.cutoffEndDate || today,
              ...(selected.cutoffType
                ? { cutoffType: getCutoffFrequency(selected.cutoffType),
                    cutoffFrequency: selected.cutoffFrequency || selected.cutoffFreq || "" }
                : {}),
            });
          }
          setLookup({ type: "", index: null });
        }}
      />
      <SearchEmployeeRef
        isOpen={lookup.type === "employee"}
        onClose={(selected) => {
          if (selected) {
            const dailyRate = numeric(
              selected.dailyRate ?? selected.daily_rate ?? selected.DAILY_RATE,
            );
            const hourRate = numeric(
              selected.hourRate ?? selected.hour_rate ?? selected.HOUR_RATE,
            );
            updateRow(lookup.index, {
              empNo: selected.empNo,
              empName: selected.empName,
              payGroup: selected.payGroup || selected.groupCode || "",
              groupCode: selected.groupCode || selected.payGroup || "",
              branchCode: selected.branchCode || "",
              deptCode: selected.deptCode || selected.departmentCode || "",
              posCode: selected.posCode || selected.positionCode || "",
              dailyRate,
              hourRate,
            });
          }
          setLookup({ type: "", index: null });
        }}
      />
      <SearchLeaveEmployeeSelection
        isOpen={lookup.type === "employees"}
        payFrequency={header.cutoffType || getCutoffFrequency(header.cutoffFrequency)}
        onClose={(selected) => {
          if (selected) addSelections(selected);
          setLookup({ type: "", index: null });
        }}
      />
      <SearchLeaveRef
        isOpen={lookup.type === "lv"}
        onClose={(selected) => {
          if (selected) {
            const lvRate = decimal(
              selected.lvRate ?? selected.ot_rate ?? selected.OT_RATE ?? 0,
            );
            updateRow(lookup.index, {
              lvCode: selected.code,
              lvName: selected.description,
              lvRate,
            });
          }
          setLookup({ type: "", index: null });
        }}
      />
      {showCancelModal && (
        <CancelTranModal isOpen={showCancelModal} onClose={closeCancelModal} />
      )}
      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: header.lvId,
            DocumentName: "Leave Transaction",
            DocumentNo: header.lvNo,
            viewOnly: header.documentStatus === "X",
          }}
          onClose={() => setShowAttachModal(false)}
        />
      )}
      {showSignatoryModal && (
        <DocumentSignatories
          isOpen={showSignatoryModal}
          params={{
            noReprints,
            documentID: header.lvId,
            docType,
            docNo: header.lvNo,
          }}
          onClose={closeSignatoryModal}
          onCancel={() => setShowSignatoryModal(false)}
        />
      )}
    </div>
  );
};

export default LeaveTransaction;
