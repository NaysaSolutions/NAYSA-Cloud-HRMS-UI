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
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput, {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchOvertimeEmployeeSelection from "@/NAYSA Cloud/Lookup/SearchOvertimeEmployeeSelection.jsx";
import SearchOvertimeRef from "@/NAYSA Cloud/Lookup/SearchOvertimeRef.jsx";
import SearchCutoffRef from "@/NAYSA Cloud/Lookup/SearchCutoffRef.jsx";
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
const docType = "OT";

const initialHeader = {
  otId: "",
  otNo: "",
  otDate: today,
  cutoffFrequency: "",
  cutoffCode: "",
  cutoffName: "",
  cutoffStartDate: today,
  cutoffEndDate: today,
  remarks: "",
  documentStatus: "D",
};

const getCutoffFrequency = (cutoffType) => {
  const value = String(cutoffType || "")
    .trim()
    .toUpperCase();
  if (value.startsWith("S")) return "S";
  if (value.startsWith("M")) return "M";
  return value ? "D" : "";
};

const historyFrequencyLabels = {
  S: "Semi-Monthly",
  M: "Monthly",
  D: "Weekly / Daily",
  W: "Weekly",
};

const historyFrequencyFields = new Set([
  "frequency", "freq", "payfrequency", "payfreq", "cutofffrequency", "cutofffreq",
]);

const formatOvertimeHistory = (history) => {
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
            key: isLineNumber ? "overtimeLineNumber" : column.key,
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
          displayRow.overtimeLineNumber = row[key];
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
  cutoffFrequency: getCutoffFrequency(companyInfo?.cutoffType),
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


const computeOtAmount = ({ hourRate, otHours, otMinutes, otRate }) => {
  const hrRate = numeric(hourRate);
  const totalHours = numeric(otHours) + numeric(otMinutes) / 60;
  const rate = numeric(otRate);
  const rawAmount = hrRate * totalHours * (rate / 100);
  const roundedAmount = roundToDecimal(rawAmount, 2);
  return decimal(roundedAmount, 2);
};

const createRow = (headerDates = {}) => ({
  groupId: createGroupId(),
  empNo: "",
  empName: "",
  otCode: "",
  otName: "",
  otDateDetail: headerDates.startDate || today,
  startDate: headerDates.startDate || today,
  endDate: headerDates.endDate || today,
  payFrequency: "",
  frequency: "",
  dailyRate: 0,
  hourRate: 0,
  otHours: "0.00",
  otMinutes: "0.00",
  otRate: "0.00",
  otAmount: "0.00",
  mealAllow: "0.00",
  transpoAllow: "0.00",
  payGroup: "",
  groupCode: "",
  branchCode: "",
  departmentCode: "",
  deptCode: "",
});

const isValidNumberEntry = (field, value) => {
  if (field === "otMinutes") {
    return /^\d*(\.0{0,4})?$/.test(value) && Number.isSafeInteger(numeric(value));
  }
  return /^\d*(\.\d{0,4})?$/.test(value);
};

const normalizeOvertimeMinutes = ({ otHours, otMinutes }) => {
  const minutes = numeric(otMinutes);
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    return { otHours, otMinutes };
  }
  return {
    otHours: decimal(numeric(otHours) + Math.floor(minutes / 60)),
    otMinutes: decimal(minutes % 60),
  };
};

const normalizeRow = (row, fallbackStart = today, fallbackEnd = today) => {
  const dailyRate = numeric(row.dailyRate ?? row.daily_rate ?? row.DAILY_RATE);
  const hourRate = numeric(row.hourRate ?? row.hour_rate ?? row.HOUR_RATE);
  const otHours = decimal(row.otHours);
  const otMinutes = decimal(row.otMinutes);
  const otRate = decimal(row.otRate ?? row.ot_rate ?? row.OT_RATE);

  return {
    ...row,
    dailyRate,
    hourRate,
    otDateDetail: toDisplayDate(
      row.otDateDetail || row.startDate || fallbackStart,
    ),
    startDate: toDisplayDate(row.startDate || row.otDateDetail || fallbackStart),
    endDate: toDisplayDate(
      row.endDate || row.startDate || row.otDateDetail || fallbackEnd,
    ),
    otHours,
    otMinutes,
    otRate,
    otAmount: computeOtAmount({ hourRate, otHours, otMinutes, otRate }),
    mealAllow: decimal(row.mealAllow),
    transpoAllow: decimal(row.transpoAllow),
    payGroup: row.payGroup || row.groupCode || "",
    branchCode: row.branchCode || "",
    departmentCode: row.departmentCode || row.deptCode || "",
  };
};

const otColumns = [
  ["ot", "LN", 60],
  ["empNo", "Emp No.", 115],
  ["empName", "Employee Name", 210],
  ["otCode", "OT Code", 105],
  ["otName", "OT Description", 190],
  ["startDate", "Start Date", 130],
  ["endDate", "End Date", 130],
  ["otHours", "OT Hrs.", 105],
  ["otMinutes", "OT Mins.", 100],
  ["otRate", "Rate", 105],
  ["mealAllow", "Meal Allow.", 115],
  ["transpoAllow", "Transpo Allow.", 120],
  ["otAmount", "Amount", 120],
  ["payGroup", "Pay Group", 95],
  ["branchCode", "Branch", 90],
  ["departmentCode", "Dept.", 90],
];

const OvertimeTransaction = () => {
  const { user, companyInfo, refsLoaded } = useAuth();
  const queryClient = useQueryClient();
  // Apply the display selector only to this history view; keep cached API data unchanged.
  const [historyQueryClient] = useState(() => new QueryClient({
    queryCache: queryClient.getQueryCache(),
    defaultOptions: {
      ...queryClient.getDefaultOptions(),
      queries: {
        ...queryClient.getDefaultOptions().queries,
        select: formatOvertimeHistory,
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
    otHours: "0.00",
    otMinutes: "0.00",
    mealAllow: "0.00",
    transpoAllow: "0.00",
  });
  const [lookup, setLookup] = useState({ type: "", index: null });
  const [otWidths, setOtWidths] = useState(() => ({
    ...Object.fromEntries(otColumns.map(([key, , width]) => [key, width])),
    actions: 80,
  }));

  const isReadOnly = header.documentStatus !== "D";
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

  const updateRow = (index, values) =>
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextRow = { ...row, ...values };
        if (
          "hourRate" in values ||
          "otHours" in values ||
          "otMinutes" in values ||
          "otRate" in values
        ) {
          nextRow.otAmount = computeOtAmount(nextRow);
        }
        return nextRow;
      }),
    );

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.post("/overtimeTransactions/save", {
        jsonData: {
          ...header,
          cutoffFrequency: getCutoffFrequency(
            header.cutoffFrequency || companyInfo?.cutoffType,
          ),
          otDate: formatDateToYYYYMMDD(header.otDate),
          cutoffStartDate: formatDateToYYYYMMDD(header.cutoffStartDate),
          cutoffEndDate: formatDateToYYYYMMDD(header.cutoffEndDate),
          userCode: user?.USER_CODE || "ADMIN",
          rows: rows.map((row, index) => {
            const time = normalizeOvertimeMinutes(row);
            return {
              ...row,
              lineNo: index + 1,
              otDateDetail: formatDateToYYYYMMDD(
                row.startDate || row.otDateDetail || header.cutoffStartDate,
              ),
              startDate: formatDateToYYYYMMDD(
                row.startDate || row.otDateDetail || header.cutoffStartDate,
              ),
              endDate: formatDateToYYYYMMDD(
                row.endDate || row.startDate || header.cutoffEndDate,
              ),
              dailyRate: numeric(row.dailyRate),
              hourRate: numeric(row.hourRate),
              otHours: numeric(time.otHours),
              otMinutes: numeric(time.otMinutes),
              otAmount: numeric(
                computeOtAmount({
                  hourRate: row.hourRate,
                  otHours: time.otHours,
                  otMinutes: time.otMinutes,
                  otRate: row.otRate,
                }),
              ),
              otRate: numeric(row.otRate),
              mealAllow: numeric(row.mealAllow),
              transpoAllow: numeric(row.transpoAllow),
            };
          }),
        },
      }),
    onSuccess: async (response) => {
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount > 0 || result.errorcount > 0)
        return useSwalErrorAlert(
          "Unable to save",
          result.errorMsg || result.errormsg,
        );
      const saved = parseResult(
        await apiClient.post("/overtimeTransactions/get", {
          jsonData: { otId: result.otId },
        }),
        {},
      );
      const nextStart = toDisplayDate(saved.cutoffStartDate) || today;
      const nextEnd = toDisplayDate(saved.cutoffEndDate) || today;
      setHeader((prev) => ({
        ...initialHeader,
        ...saved,
        cutoffName: saved.cutoffName || prev.cutoffName || "",
        cutoffFrequency: getCutoffFrequency(saved.cutoffFrequency),
        otDate: toDisplayDate(saved.otDate),
        cutoffStartDate: nextStart,
        cutoffEndDate: nextEnd,
      }));
      setRows(
        (saved.rows || []).map((r) => normalizeRow(r, nextStart, nextEnd)),
      );
      useSwalshowSaveSuccessDialog(
        reset,
        () => setShowSignatoryModal(true),
        () => {},
      );
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
          "Unable to save overtime transaction.",
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ mode, password = "", reason = "" }) =>
      apiClient.post(`/overtimeTransactions/${mode}`, {
        userCode: user?.USER_CODE || "ADMIN",
        userPassword: password,
        jsonData: {
          otId: header.otId,
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
      otHours: "0.00",
      otMinutes: "0.00",
      mealAllow: "0.00",
      transpoAllow: "0.00",
    });
    setTopTab("details");
  };

  useEffect(() => {
    if (!refsLoaded || !companyInfo) return;
    setHeader((current) =>
      current.otId || current.otNo
        ? current
        : {
            ...current,
            cutoffFrequency:
              current.cutoffFrequency ||
              getCutoffFrequency(companyInfo.cutoffType),
          },
    );
  }, [companyInfo, refsLoaded]);

  const addSelections = ({ employees, overtimes, otHours }) => {
    const defaultStart = header.cutoffStartDate || header.otDate || today;
    const defaultEnd = header.cutoffEndDate || header.otDate || today;

    setRows((current) => [
      ...current,
      ...employees.flatMap((employee) =>
        overtimes.map((ot) => {
          const dailyRate = numeric(
            employee.dailyRate ?? employee.daily_rate ?? employee.DAILY_RATE,
          );
          const hourRate = numeric(
            employee.hourRate ?? employee.hour_rate ?? employee.HOUR_RATE,
          );
          const otRate = decimal(ot.otRate ?? ot.ot_rate ?? ot.OT_RATE ?? 0);
          const formattedHours = decimal(otHours);

          return {
            ...createRow({ startDate: defaultStart, endDate: defaultEnd }),
            empNo: employee.empNo,
            empName: employee.empName,
            otCode: ot.code,
            otName: ot.description,
            payFrequency: employee.payFrequency,
            payGroup: employee.payGroup || employee.groupCode || "",
            groupCode: employee.groupCode || employee.payGroup || "",
            branchCode: employee.branchCode || "",
            departmentCode: employee.departmentCode || employee.deptCode || "",
            deptCode: employee.deptCode || employee.departmentCode || "",
            dailyRate,
            hourRate,
            otHours: formattedHours,
            otRate,
            otAmount: computeOtAmount({
              hourRate,
              otHours: formattedHours,
              otMinutes: "0.00",
              otRate,
            }),
          };
        }),
      ),
    ]);
  };

  const removeRow = (index) =>
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));

  const validate = () => {
    if (!header.otDate || !header.cutoffFrequency)
      return "Transaction Date and Pay Frequency are required.";
    if (!header.cutoffCode) return "Payroll Cut-Off is required.";
    if (!header.cutoffStartDate || !header.cutoffEndDate)
      return "Cut-Off Start Date and End Date are required.";
    if (
      formatDateToYYYYMMDD(header.cutoffEndDate) <
      formatDateToYYYYMMDD(header.cutoffStartDate)
    )
      return "Cut-Off End Date cannot be earlier than Start Date.";
    if (!rows.length) return "Add at least one overtime detail row.";

    for (const row of rows) {
      if (!row.empNo || !row.otCode || !row.startDate || !row.endDate)
        return "Complete all required fields (Employee, OT Code, Start Date, End Date) in every row.";
      if (
        formatDateToYYYYMMDD(row.endDate) < formatDateToYYYYMMDD(row.startDate)
      )
        return `Row End Date cannot be earlier than Start Date for employee ${row.empNo}.`;
      if (
        numeric(row.otHours) < 0 ||
        numeric(row.otMinutes) < 0 ||
        numeric(row.mealAllow) < 0 ||
        numeric(row.transpoAllow) < 0 ||
        numeric(row.otAmount) < 0
      )
        return "Enter valid nonnegative values.";
      if (!Number.isSafeInteger(numeric(row.otMinutes)))
        return `Enter whole-number overtime minutes for employee ${row.empNo}.`;
    }
    return "";
  };

  const save = () => {
    const message = validate();
    if (message)
      return useSwalErrorAlert("Check Overtime Transaction", message);
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
        header.otId,
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
      const response = await apiClient.post("/overtimeTransactions/get", {
        jsonData: { otNo: docNo },
      });
      const record = parseResult(response, {});
      if (!record?.otId)
        return useSwalErrorAlert(
          "Unable to load",
          `Overtime transaction ${docNo} was not found.`,
        );
      const nextStart = toDisplayDate(record.cutoffStartDate) || today;
      const nextEnd = toDisplayDate(record.cutoffEndDate) || today;
      setHeader({
        ...initialHeader,
        ...record,
        cutoffName: record.cutoffName || "",
        cutoffFrequency: getCutoffFrequency(record.cutoffFrequency),
        otDate: toDisplayDate(record.otDate),
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
          ...(field === "startDate" ? { otDateDetail: nextDate } : {}),
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
          ...(field === "otMinutes"
            ? normalizeOvertimeMinutes(row)
            : { [field]: decimal(row[field]) }),
        };
        updated.otAmount = computeOtAmount(updated);
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
        inputMode={field === "otMinutes" ? "numeric" : "decimal"}
        title={
          field === "otMinutes"
            ? "Whole minutes (0-59). Every 60 minutes carries over to OT Hrs. when you leave the field or press Enter."
            : undefined
        }
        onFocus={(event) => {
          if (!cellReadOnly)
            event.target.value = String(event.target.value).replace(/,/g, "");
        }}
        onChange={(event) => {
          if (cellReadOnly) return;
          const value = event.target.value.replace(/,/g, "");
          if (isValidNumberEntry(field, value))
            updateRow(index, { [field]: value });
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
    if (isValidNumberEntry(field, normalized))
      setReplicateValues((current) => ({ ...current, [field]: normalized }));
  };

  const formatReplicateMinutes = () => {
    if (isReadOnly || !rows.length) return;
    setReplicateValues((current) => ({
      ...current,
      ...normalizeOvertimeMinutes(current),
    }));
  };

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
      current.map((row) => ({
        ...row,
        [rowField]: dateValue,
        ...(rowField === "startDate" ? { otDateDetail: dateValue } : {}),
      })),
    );
  };

  const replicateOvertimeHoursMins = async () => {
    if (!rows.length)
      return useSwalInfoAlert(
        "Details Required",
        "Add details before applying Overtime Hrs./Mins.",
      );
    const { otHours: hrs, otMinutes: mins } = normalizeOvertimeMinutes(replicateValues);
    formatReplicateMinutes();
    const confirmation = await useSwalProceedConfirm(
      "Apply Overtime Hrs. / Mins.?",
      `Apply ${hrs} Hrs and ${mins} Mins to all rows?`,
      "Apply to all",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) =>
      current.map((row) => {
        const nextRow = {
          ...row,
          otHours: hrs,
          otMinutes: mins,
        };
        return {
          ...nextRow,
          otAmount: computeOtAmount(nextRow),
        };
      }),
    );
  };

  const replicateField = async (field, labelName) => {
    if (!rows.length)
      return useSwalInfoAlert(
        "Details Required",
        `Add details before applying ${labelName}.`,
      );
    const val = decimal(replicateValues[field]);
    const confirmation = await useSwalProceedConfirm(
      `Apply ${labelName}?`,
      `Apply ${val} to all rows?`,
      "Apply to all",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) => current.map((row) => ({ ...row, [field]: val })));
  };

  const lookupCell = (row, index, type) => (
    <div className="relative flex items-center">
      <input
        value={type === "employee" ? row.empNo : row.otCode}
        readOnly
        onClick={() => !isReadOnly && setLookup({ type, index })}
        className="global-tran-td-inputclass-ui h-7 w-full cursor-pointer bg-transparent pr-7 text-xs"
      />
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        onClick={() => !isReadOnly && setLookup({ type, index })}
        className="absolute right-2 cursor-pointer text-xs text-blue-600"
      />
    </div>
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          hours: sum.hours + numeric(row.otHours),
          mealAllow: sum.mealAllow + numeric(row.mealAllow),
          transpoAllow: sum.transpoAllow + numeric(row.transpoAllow),
          amount: sum.amount + numeric(row.otAmount),
        }),
        { hours: 0, mealAllow: 0, transpoAllow: 0, amount: 0 },
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
          isPrintDisabled={!header.otId || header.documentStatus === "X"}
          isAttachDisabled={!header.otId || header.documentStatus === "X"}
          isPostDisabled={!header.otId || isReadOnly}
          isCancelDisabled={!header.otId || isReadOnly}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">Overtime Transaction</h1>
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
            #overtime-entry-fields .global-ref-floating-label,
            #overtime-entry-fields .global-tran-floating-label-remarks {
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

            #overtime-entry-fields .global-ref-textbox-ui {
              height: 2.5rem !important;
              min-height: 2.5rem !important;
              font-size: 0.75rem !important;
              line-height: 1.25rem !important;
            }

            #overtime-entry-fields input.global-ref-textbox-ui {
              padding-top: 0.5rem !important;
              padding-bottom: 0.5rem !important;
            }

            #overtime-entry-fields input.global-ref-textbox-ui[readonly] {
              padding-right: 3rem !important;
            }

            #overtime-entry-fields button[title="Search"],
            #overtime-entry-fields .global-ref-textbox-ui ~ .pointer-events-none {
              height: 2.5rem !important;
            }
          `}</style>
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div
            id="overtime-entry-fields"
            className="grid grid-cols-1 gap-7 p-2 pt-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
          >
            {/* Column 1: Transaction No., Transaction Date, Pay Frequency */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  label="Transaction No."
                  type="text"
                  value={header.otNo || "Auto Generated"}
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
                      id="otDate"
                      className="peer h-full w-full min-w-0 cursor-pointer rounded-lg border-none bg-transparent py-0 pl-2 pr-8 focus:outline-none"
                      value={header.otDate}
                      disabled={isReadOnly}
                      updateState={(values) =>
                        updateHeader({ otDate: values.otDate })
                      }
                    />
                  </div>
                  <label htmlFor="otDate" className="global-ref-floating-label">
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
                  value={header.cutoffFrequency}
                  options={[
                    { value: "S", label: "Semi-Monthly" },
                    { value: "M", label: "Monthly" },
                    { value: "D", label: "Weekly / Daily" },
                  ]}
                  placeholder="Select Pay Frequency"
                  disabled={isReadOnly}
                  hideClearButton
                  onChange={(value) =>
                    updateHeader({
                      cutoffFrequency: value,
                      cutoffCode: "",
                      cutoffName: "",
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

            {/* Column 3: Overtime Hrs./Mins., Meal Allow., Transpo Allow. (+ Apply to all) */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateOtHours"
                    label="OT Hrs."
                    type="amount"
                    value={replicateValues.otHours}
                    inputMode="decimal"
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) => updateReplicateValue("otHours", value)}
                  />
                </div>
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateOtMinutes"
                    label="Mins."
                    type="amount"
                    value={replicateValues.otMinutes}
                    inputMode="numeric"
                    title="Whole minutes (0-59). Every 60 minutes carries over to OT Hrs. when you leave the field or press Enter."
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) =>
                      updateReplicateValue("otMinutes", value)
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
                  title="Apply Overtime Hrs./Mins. to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={replicateOvertimeHoursMins}
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateMealAllow"
                    label="Meal Allow."
                    type="amount"
                    value={replicateValues.mealAllow}
                    inputMode="decimal"
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) =>
                      updateReplicateValue("mealAllow", value)
                    }
                  />
                </div>
                <button
                  type="button"
                  title="Apply Meal Allowance to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={() => replicateField("mealAllow", "Meal Allowance")}
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1 [&>div]:!mb-0">
                  <FieldRenderer
                    id="replicateTranspoAllow"
                    label="Transpo Allow."
                    type="amount"
                    value={replicateValues.transpoAllow}
                    inputMode="decimal"
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) =>
                      updateReplicateValue("transpoAllow", value)
                    }
                  />
                </div>
                <button
                  type="button"
                  title="Apply Transpo Allowance to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={() =>
                    replicateField("transpoAllow", "Transpo Allowance")
                  }
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
                Overtime Details
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table
                className="border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l"
                style={{
                  tableLayout: "fixed",
                  width: otColumns.reduce(
                    (sum, [key]) => sum + otWidths[key],
                    otWidths.actions,
                  ),
                }}
              >
                <colgroup>
                  {otColumns.map(([key]) => (
                    <col key={key} style={{ width: otWidths[key] }} />
                  ))}
                  <col style={{ width: otWidths.actions }} />
                </colgroup>
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {otColumns.map(([key, label]) =>
                      resizeHeader(key, label, otWidths, setOtWidths),
                    )}
                    {resizeHeader(
                      "actions",
                      "Actions",
                      otWidths,
                      setOtWidths,
                      "sticky top-0 right-0 bg-blue-100 dark:bg-blue-900",
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {rows.map((row, index) => (
                    <tr key={row.groupId} className="global-tran-tr-ui">
                      <td className="global-tran-td-ui text-center">
                        {String(index + 1).padStart(4, "0")}
                      </td>
                      <td className="global-tran-td-ui">
                        {lookupCell(row, index, "employee")}
                      </td>
                      <td className="global-tran-td-ui">{row.empName}</td>
                      <td className="global-tran-td-ui">
                        {lookupCell(row, index, "ot")}
                      </td>
                      <td className="global-tran-td-ui">{row.otName}</td>
                      <td className="global-tran-td-ui">
                        {dateCell(row, index, "startDate")}
                      </td>
                      <td className="global-tran-td-ui">
                        {dateCell(row, index, "endDate")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otHours")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otMinutes")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otRate", true)}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "mealAllow")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "transpoAllow")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otAmount", true)}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.payGroup || row.groupCode || ""}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.branchCode || ""}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.departmentCode || row.deptCode || ""}
                      </td>
                      <td
                        className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black"
                        style={{
                          width: otWidths.actions,
                          minWidth: otWidths.actions,
                        }}
                      >
                        <div className="flex items-center justify-center gap-1">
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
            </div>
          </div>

          {/* Footer Buttons & Totals */}
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() => {
                  if (!header.cutoffFrequency) {
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
                ["Total OT Hours:", totals.hours],
                ["Total Meal Allow.:", totals.mealAllow],
                ["Total Transpo Allow.:", totals.transpoAllow],
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
            endpoint="/overtimeTransactions/history"
            cacheKey="OvertimeTransactionHistoryTotals"
            activeTabKey="OT_Summary"
            status="All"
            onRowDoubleClick={loadTransaction}
            historyExportName="Overtime Transaction History"
            amountDecimals={2}
          />
        </QueryClientProvider>
      </div>

      {/* Lookup Modals */}
      <SearchCutoffRef
        isOpen={lookup.type === "cutoff"}
        payFrequency={header.cutoffFrequency}
        onClose={(selected) => {
          if (selected) {
            updateHeader({
              cutoffCode: selected.code,
              cutoffName: selected.description || "",
              cutoffStartDate:
                selected.cutoffStartDate || header.cutoffStartDate || today,
              cutoffEndDate:
                selected.cutoffEndDate || header.cutoffEndDate || today,
              ...(selected.cutoffFreq
                ? { cutoffFrequency: selected.cutoffFreq }
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
              departmentCode:
                selected.departmentCode || selected.deptCode || "",
              deptCode: selected.deptCode || selected.departmentCode || "",
              dailyRate,
              hourRate,
            });
          }
          setLookup({ type: "", index: null });
        }}
      />
      <SearchOvertimeEmployeeSelection
        isOpen={lookup.type === "employees"}
        payFrequency={header.cutoffFrequency}
        onClose={(selected) => {
          if (selected) addSelections(selected);
          setLookup({ type: "", index: null });
        }}
      />
      <SearchOvertimeRef
        isOpen={lookup.type === "ot"}
        onClose={(selected) => {
          if (selected) {
            const otRate = decimal(
              selected.otRate ?? selected.ot_rate ?? selected.OT_RATE ?? 0,
            );
            updateRow(lookup.index, {
              otCode: selected.code,
              otName: selected.description,
              otRate,
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
            DocumentID: header.otId,
            DocumentName: "Overtime Transaction",
            DocumentNo: header.otNo,
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
            documentID: header.otId,
            docType,
            docNo: header.otNo,
          }}
          onClose={closeSignatoryModal}
          onCancel={() => setShowSignatoryModal(false)}
        />
      )}
    </div>
  );
};

export default OvertimeTransaction;
