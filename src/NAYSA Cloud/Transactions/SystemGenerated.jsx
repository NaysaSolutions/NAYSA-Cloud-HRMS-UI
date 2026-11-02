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
import { buildSystemGeneratedPayload, parseSystemGeneratedResult, systemGeneratedNumeric as numeric } from "@/NAYSA Cloud/Global/systemGenerated.js";
import Header from "@/NAYSA Cloud/Components/Header.jsx";
import { transactionActionsCellStyle, transactionActionsHeaderStyle, useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput, {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchSystemGeneratedEmployeeSelection from "@/NAYSA Cloud/Lookup/SearchSystemGeneratedEmployeeSelection.jsx";
import SearchSystemGeneratedRef from "@/NAYSA Cloud/Lookup/SearchSystemGeneratedRef.jsx";
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
const docType = "SG";

const initialHeader = {
  sgId: "",
  sgNo: "",
  sgDate: today,
  cutoffType: "",
  cutoffFrequency: "",
  cutoffCode: "",
  cutoffName: "",
  cutoffStartDate: today,
  cutoffEndDate: today,
  remarks: "",
  documentStatus: "",
  amount: "0.00",
  frequency: "",
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

const formatSystemGeneratedHistory = (history) => {
  if (!history?.rootDataMap) return history;

  const newTabConfigs = { ...history.newTabConfigs };
  const rootDataMap = Object.fromEntries(
    Object.entries(history.rootDataMap).map(([tab, records]) => {
      if (!Array.isArray(records)) return [tab, records];

      const lineNumberKeys = [];
      if (/^SG_(Summary|Details?)$/i.test(tab)) {
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
          const isLineNumber = fields.some((field) => /^(ln|lnno|lnnumber|lineno|linenumber|detaillineno)$/.test(field));
          if (!isEmployeeCount && !isLineNumber) return column;

          if (isLineNumber) lineNumberKeys.push(column.key);
          return {
            ...column,
            key: isLineNumber ? "systemGeneratedLineNumber" : column.key,
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
          displayRow.systemGeneratedLineNumber = row[key];
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

const parseResult = parseSystemGeneratedResult;

const decimal = (value, fractionDigits = 2) =>
  numeric(value).toLocaleString("en-PH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const createRow = (defaults = {}) => ({
  groupId: createGroupId(),
  empNo: "", empName: "", edCode: "", edName: "",
  startDate: defaults.startDate || today,
  endDate: defaults.endDate || today,
  amount: defaults.amount ?? "0.00",
  frequency: defaults.frequency || "",
  holdFlag: "N", branchCode: "", deptCode: "",
});

const isValidNumberEntry = (_field, value) => /^\d*(\.\d{0,2})?$/.test(value);

const normalizeRow = (row, fallbackStart = today, fallbackEnd = today) => ({
  ...createRow(), ...row,
  groupId: row.groupId || createGroupId(),
  startDate: toDisplayDate(row.startDate || fallbackStart),
  endDate: toDisplayDate(row.endDate || fallbackEnd),
  amount: decimal(row.amount),
  frequency: row.frequency || row.edFreq || "",
  holdFlag: row.holdFlag || "N",
});

const sgColumns = [
  ["ed", "LN", 60],
  ["empNo", "Emp No.", 115],
  ["empName", "Employee Name", 210],
  ["edCode", "Code", 105],
  ["edName", "Description", 190],
  ["amount", "Amount", 120],
  ["startDate", "Start Date", 130],
  ["endDate", "End Date", 130],
  ["frequency", "Frequency", 150],
  ["branchCode", "Branch", 90],
  ["deptCode", "Department", 90],
];

const SystemGenerated = () => {
  const { user, companyInfo, refsLoaded } = useAuth();
  const queryClient = useQueryClient();
  // Apply the display selector only to this history view; keep cached API data unchanged.
  const [historyQueryClient] = useState(() => new QueryClient({
    queryCache: queryClient.getQueryCache(),
    defaultOptions: {
      ...queryClient.getDefaultOptions(),
      queries: {
        ...queryClient.getDefaultOptions().queries,
        select: formatSystemGeneratedHistory,
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
  const [lookup, setLookup] = useState({ type: "", index: null });

  const sgColumnDefs = sgColumns.map(([key, label, width]) => ({ key, label, width }));
  const { getColumnStyle, getFrozenColumnStyle, renderResizableHeader, renderHeaderContextMenu } = useResizableTableColumns(sgColumnDefs);
  const frozenKeys = new Set(["ed", "empNo", "empName", "edCode", "edName"]);
  const frozenColumns = sgColumnDefs.map(col => ({ ...col, frozen: frozenKeys.has(col.key) }));
  const columnCellStyle = (key) => ({
    ...getColumnStyle(key, sgColumnDefs.find(col => col.key === key)?.width || 120),
    ...(frozenKeys.has(key) ? getFrozenColumnStyle(key, frozenColumns, undefined, { isHeader: false }) : {}),
  });
  const isReadOnly = !["", "D", "O", "OPEN"].includes(String(header.documentStatus || "").trim().toUpperCase());
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
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...values } : row));

  const refreshHistory = () => queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "all-tran-history"
      && query.queryKey[1]?.endpoint === "/systemGeneratedTransactions/history",
  });

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post("/systemGeneratedTransactions/save",
      buildSystemGeneratedPayload(header, rows, user?.USER_CODE || "ADMIN", formatDateToYYYYMMDD)),

    onSuccess: async (response) => {
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount > 0 || result.errorcount > 0)
        return useSwalErrorAlert(
          "Unable to save",
          result.errorMsg || result.errormsg,
        );
      const saved = parseResult(
        await apiClient.post("/systemGeneratedTransactions/get", {
          jsonData: { sgId: result.sgId },
        }),
      );
      const nextStart = toDisplayDate(saved.cutoffStartDate) || today;
      const nextEnd = toDisplayDate(saved.cutoffEndDate) || today;
      setHeader((prev) => ({
        ...initialHeader,
        ...saved,
        cutoffName: saved.cutoffName || prev.cutoffName || "",
        cutoffType: saved.cutoffType || getCutoffFrequency(saved.cutoffFrequency),
        cutoffFrequency: saved.cutoffFrequency,
        sgDate: toDisplayDate(saved.sgDate),
        cutoffStartDate: nextStart,
        cutoffEndDate: nextEnd,
      }));
      setRows(
        (saved.rows || []).map((r) => normalizeRow(r, nextStart, nextEnd)),
      );
      refreshHistory();
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
          "Unable to save system generated transaction.",
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ mode, password = "", reason = "" }) =>
      apiClient.post(`/systemGeneratedTransactions/${mode}`, {
        userCode: user?.USER_CODE || "ADMIN",
        userPassword: password,
        jsonData: {
          sgId: header.sgId,
          userCode: user?.USER_CODE || "ADMIN",
          remarks: reason,
        },
      }),
    onSuccess: (response, { mode, reason }) => {
      const result = response?.data?.data?.[0] || {};
      if (result.errorCount > 0 || result.errorcount > 0)
        return useSwalErrorAlert(
          "Unable to continue",
          result.errorMsg || result.errormsg,
        );
      updateHeader({
        documentStatus: mode === "post" ? "F" : "X",
        remarks: mode === "cancel" ? reason : header.remarks,
      });
      refreshHistory();
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
    setTopTab("details");
  };

  useEffect(() => {
    if (!refsLoaded || !companyInfo) return;
    setHeader((current) =>
      current.sgId || current.sgNo
        ? current
        : {
            ...current,
            cutoffType:
              current.cutoffType ||
              getCutoffFrequency(companyInfo.cutoffType),
          },
    );
  }, [companyInfo, refsLoaded]);

  const rowDefaults = () => ({
    startDate: header.cutoffStartDate || header.sgDate || today,
    endDate: header.cutoffEndDate || header.sgDate || today,
    amount: decimal(header.amount),
    frequency: header.frequency || header.cutoffType,
  });

  const addSelections = ({ employees, edCodes }) => {
    if (isReadOnly) return;
    setRows((current) => [
      ...current,
      ...employees.flatMap((employee) => edCodes.map((ed) => ({
        ...createRow(rowDefaults()),
        empNo: employee.empNo, empName: employee.empName,
        edCode: ed.edCode, edName: ed.edName,
        branchCode: employee.branchCode || "",
        deptCode: employee.deptCode || "",
      }))),
    ]);
  };

  const insertRowAfter = (index) => {
    if (isReadOnly) return;
    setRows((current) => {
      const next = [...current];
      next.splice(index + 1, 0, createRow(rowDefaults()));
      return next;
    });
  };

  const removeRow = (index) =>
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));

  const validate = () => {
    if (!header.sgDate || !header.cutoffType || !header.cutoffFrequency)
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
    if (!rows.length) return "Add at least one detail row.";

    for (const row of rows) {
      if (!row.empNo || !row.edCode || !row.startDate || !row.endDate)
        return "Complete all required fields (Employee, Code, Start Date, End Date) in every row.";
      if (
        formatDateToYYYYMMDD(row.endDate) < formatDateToYYYYMMDD(row.startDate)
      )
        return `Row End Date cannot be earlier than Start Date for employee ${row.empNo}.`;
      if (row.amount === "" || !Number.isFinite(Number(String(row.amount).replace(/,/g, ""))) || numeric(row.amount) < 0)
        return "Enter a valid nonnegative Amount in every row.";
      if (!["S", "M", "W"].includes(row.frequency))
        return "Select a Frequency for employee " + row.empNo + ".";
    }

    return "";
  };

  const save = () => {
    const message = validate();
    if (message)
      return useSwalErrorAlert("Check System Generated Transaction", message);
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
        header.sgId,
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
      const response = await apiClient.post("/systemGeneratedTransactions/get", {
        jsonData: { sgNo: docNo },
      });
      const record = parseResult(response);
      if (!record?.sgId)
        return useSwalErrorAlert(
          "Unable to load",
          `System generated transaction ${docNo} was not found.`,
        );
      const nextStart = toDisplayDate(record.cutoffStartDate) || today;
      const nextEnd = toDisplayDate(record.cutoffEndDate) || today;
      setHeader({
        ...initialHeader,
        ...record,
        cutoffName: record.cutoffName || "",
        cutoffType: record.cutoffType || getCutoffFrequency(record.cutoffFrequency),
        cutoffFrequency: record.cutoffFrequency,
        sgDate: toDisplayDate(record.sgDate),
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
        });
      }}
    />
  );

  const formatNumberCell = (index, field) => {
    if (isReadOnly) return;
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: decimal(row[field]) } : row));
  };

  const numberCell = (row, index, field) => (
    <input
      ref={(element) => { inputRefs.current[field + "-" + index] = element; }}
      aria-label={"Amount for row " + (index + 1)}
      value={row[field] ?? ""}
      readOnly={isReadOnly}
      inputMode="decimal"
      onChange={(event) => {
        const value = event.target.value.replace(/,/g, "");
        if (!isReadOnly && isValidNumberEntry(field, value)) updateRow(index, { [field]: value });
      }}
      onBlur={() => !isReadOnly && formatNumberCell(index, field)}
      onKeyDown={(event) => {
        if (!isReadOnly && event.key === "Enter") {
          event.preventDefault();
          formatNumberCell(index, field);
          focusNext(index, field);
        }
      }}
      className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-right text-xs"
    />
  );

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
      })),
    );
  };

  const applyHeaderFieldToRows = async (field, label) => {
    if (isReadOnly || !rows.length) return;
    if (header[field] === "" || header[field] == null) {
      return useSwalValidationAlert({
        title: `${label} Required`,
        message: `Enter or select ${label} first.`,
      });
    }
    const value = field === "amount" ? decimal(header.amount) : header.frequency;
    const displayValue = field === "frequency" ? historyFrequencyLabels[value] || value : value;
    const confirmation = await useSwalProceedConfirm(
      `Apply ${label}?`,
      `Apply ${displayValue} to all detail rows?`,
      "Apply to all",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) => current.map((row) => ({ ...row, [field]: value })));
  };

  const lookupCell = (row, index, type) => (
    <div className="relative flex items-center">
      <input
        value={type === "employee" ? row.empNo : row.edCode}
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

  const totals = useMemo(() => ({ amount: rows.reduce((sum, row) => sum + numeric(row.amount), 0) }), [rows]);

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
          isPrintDisabled={!header.sgId || header.documentStatus === "X"}
          isAttachDisabled={!header.sgId || header.documentStatus === "X"}
          isPostDisabled={!header.sgId || isReadOnly}
          isCancelDisabled={!header.sgId || isReadOnly}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">System Generated Transaction</h1>
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
            #system-generated-entry-fields .global-ref-floating-label,
            #system-generated-entry-fields .global-tran-floating-label-remarks {
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

            #system-generated-entry-fields .global-ref-textbox-ui {
              height: 2.5rem !important;
              min-height: 2.5rem !important;
              font-size: 0.75rem !important;
              line-height: 1.25rem !important;
            }

            #system-generated-entry-fields input.global-ref-textbox-ui {
              padding-top: 0.5rem !important;
              padding-bottom: 0.5rem !important;
            }

            #system-generated-entry-fields input.global-ref-textbox-ui[readonly] {
              padding-right: 3rem !important;
            }

            #system-generated-entry-fields button[title="Search"],
            #system-generated-entry-fields .global-ref-textbox-ui ~ .pointer-events-none {
              height: 2.5rem !important;
            }
          `}</style>
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div
            id="system-generated-entry-fields"
            className="grid grid-cols-1 gap-7 p-2 pt-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)]"
          >
            {/* Column 1: Transaction No., Transaction Date, Pay Frequency */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="min-w-0 [&>div]:!mb-0">
                <FieldRenderer
                  label="Transaction No."
                  type="text"
                  value={header.sgNo || "Auto Generated"}
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
                      id="sgDate"
                      className="peer h-full w-full min-w-0 cursor-pointer rounded-lg border-none bg-transparent py-0 pl-2 pr-8 focus:outline-none"
                      value={header.sgDate}
                      disabled={isReadOnly}
                      updateState={(values) =>
                        updateHeader({ sgDate: values.sgDate })
                      }
                    />
                  </div>
                  <label htmlFor="sgDate" className="global-ref-floating-label">
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

            {/* Column 3: Amount and Frequency */}
            <div className="grid min-w-0 auto-rows-[2.5rem] content-start gap-7">
              <div className="flex min-w-0 items-center gap-1.5">
              <div className="min-w-0 flex-1 [&>div]:!mb-0">
                <FieldRenderer
                  id="systemGeneratedAmount"
                  label="Amount"
                  type="amount"
                  value={header.amount}
                  inputMode="decimal"
                  disabled={isReadOnly}
                  hideClearButton
                  onChange={(value) => {
                    const amount = String(value ?? "").replace(/,/g, "");
                    if (isValidNumberEntry("amount", amount)) {
                      updateHeader({ amount });
                    }
                  }}
                  onBlur={() => updateHeader({ amount: decimal(header.amount) })}
                />
              </div>
                <button
                  type="button"
                  title="Apply Amount to all rows"
                  disabled={isReadOnly || !rows.length}
                  onClick={() => applyHeaderFieldToRows("amount", "Amount")}
                  className="global-tran-td-button-add-ui !h-10 !min-h-10 w-[100px] !flex-none whitespace-nowrap px-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} className="mr-1" />
                  Apply to all
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
              <div className="min-w-0 flex-1 [&>div]:!mb-0">
                <FieldRenderer
                  id="systemGeneratedFrequency"
                  label="Frequency"
                  type="select"
                  value={header.frequency}
                  options={[
                    { value: "S", label: "Semi-Monthly" },
                    { value: "M", label: "Monthly" },
                    { value: "W", label: "Weekly" },
                  ]}
                  placeholder="Select Frequency"
                  disabled={isReadOnly}
                  hideClearButton
                  onChange={(value) => updateHeader({ frequency: value })}
                />
              </div>
                <button
                  type="button"
                  title="Apply Frequency to all rows"
                  disabled={isReadOnly || !rows.length || !header.frequency}
                  onClick={() => applyHeaderFieldToRows("frequency", "Frequency")}
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
        <div id="sg_dtl" className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                System Generated Details
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
                    {sgColumnDefs.map(col => renderResizableHeader(col.label, col.key, col.width, { orderedColumns: frozenColumns }))}
                    <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody className="relative">
                  {rows.map((row, index) => (
                    <tr key={row.groupId} className="global-tran-tr-ui">
                      <td style={columnCellStyle("ed")} className="global-tran-td-ui text-center">
                        {String(index + 1).padStart(4, "0")}
                      </td>
                      <td style={columnCellStyle("empNo")} className="global-tran-td-ui">
                        {lookupCell(row, index, "employee")}
                      </td>
                      <td style={columnCellStyle("empName")} className="global-tran-td-ui">{row.empName}</td>
                      <td style={columnCellStyle("edCode")} className="global-tran-td-ui">
                        {lookupCell(row, index, "ed")}
                      </td>
                      <td style={columnCellStyle("edName")} className="global-tran-td-ui">{row.edName}</td>
                      <td style={columnCellStyle("amount")} className="global-tran-td-ui">
                        {numberCell(row, index, "amount")}
                      </td>
                      <td style={columnCellStyle("startDate")} className="global-tran-td-ui">
                        {dateCell(row, index, "startDate")}
                      </td>
                      <td style={columnCellStyle("endDate")} className="global-tran-td-ui">
                        {dateCell(row, index, "endDate")}
                      </td>
                      <td style={columnCellStyle("frequency")} className="global-tran-td-ui">
                        <select
                          aria-label={`Frequency for row ${index + 1}`}
                          value={row.frequency || ""}
                          disabled={isReadOnly}
                          onChange={(event) => updateRow(index, { frequency: event.target.value })}
                          className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-xs"
                        >
                          <option value="">Select Frequency</option>
                          <option value="S">Semi-Monthly</option>
                          <option value="M">Monthly</option>
                          <option value="W">Weekly</option>
                        </select>
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.branchCode || ""}
                      </td>
                      <td className="global-tran-td-ui text-center">
                        {row.deptCode || ""}
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
            endpoint="/systemGeneratedTransactions/history"
            cacheKey="SystemGeneratedHistoryTotals"
            activeTabKey="SG_Summary"
            status="All"
            onRowDoubleClick={loadTransaction}
            historyExportName="System Generated Transaction History"
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
            updateRow(lookup.index, {
              empNo: selected.empNo, empName: selected.empName,
              branchCode: selected.branchCode || "",
              deptCode: selected.deptCode || "",
            });
          }

          setLookup({ type: "", index: null });
        }}
      />
      <SearchSystemGeneratedEmployeeSelection
        isOpen={lookup.type === "employees"}
        payFrequency={header.cutoffType}
        cutoffCode={header.cutoffCode}
        onClose={(selected) => {
          if (selected) addSelections(selected);
          setLookup({ type: "", index: null });
        }}
      />
      <SearchSystemGeneratedRef
        isOpen={lookup.type === "ed"}
        onClose={(selected) => {
          if (selected) {
            updateRow(lookup.index, {
              edCode: selected.edCode,
              edName: selected.edName,
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
            DocumentID: header.sgId,
            DocumentName: "System Generated Transaction",
            DocumentNo: header.sgNo,
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
            documentID: header.sgId,
            docType,
            docNo: header.sgNo,
          }}
          onClose={closeSignatoryModal}
          onCancel={() => setShowSignatoryModal(false)}
        />
      )}
    </div>
  );
};

export default SystemGenerated;
