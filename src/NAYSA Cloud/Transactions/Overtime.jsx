/* eslint-disable react-hooks/rules-of-hooks */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
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
import SearchOvertimeEmployeeSelection from "@/NAYSA Cloud/Lookup/SearchOvertimeEmployeeSelection.jsx"; // Can adapt lookup name if needed
import SearchOvertimeRef from "@/NAYSA Cloud/Lookup/SearchOvertimeRef.jsx";
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

const toDisplayDate = (value) =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || ""))
    ? String(value)
    : formatDateToMMDDYYYY(value);
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
const createInitialHeader = (companyInfo) => ({
  ...initialHeader,
  cutoffFrequency: getCutoffFrequency(companyInfo?.cutoffType),
});
const createRow = () => ({
  groupId: createGroupId(),
  empNo: "",
  empName: "",
  otCode: "",
  otName: "",
  otDateDetail: today,
  startDate: today,
  endDate: today,
  payFrequency: "",
  frequency: "",
  otHours: "0.00",
  otMinutes: "0.00",
  otRate: "0.00",
  otAmount: "0.00",
  mealAllow: "0.00",
  transpoAllow: "0.00",
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
const decimal = (value) =>
  numeric(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const normalizeRow = (row) => ({
  ...row,
  otDateDetail: toDisplayDate(row.otDateDetail),
  startDate: toDisplayDate(row.startDate || row.otDateDetail),
  endDate: toDisplayDate(row.endDate || row.otDateDetail),
  otHours: decimal(row.otHours),
  otRate: decimal(row.otRate),
  otAmount: decimal(row.otAmount),
  mealAllow: decimal(row.mealAllow),
  transpoAllow: decimal(row.transpoAllow),
});

const otColumns = [
  ["ot", "OT", 70],
  ["empNo", "Employee No.", 120],
  ["empName", "Employee Name", 220],
  ["otCode", "OT Code", 115],
  ["otName", "OT Description", 210],
  ["otDateDetail", "OT Date", 130],
  ["otHours", "OT Hours", 115],
  ["otRate", "Rate", 115],
  ["otAmount", "OT Amount", 125],
  ["mealAllow", "Meal Allow.", 120],
  ["transpoAllow", "Transpo Allow.", 120],
];

const OvertimeTransaction = () => {
  const { user, companyInfo, refsLoaded } = useAuth();
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
    otAmount: "0.00",
  });
  const [lookup, setLookup] = useState({ type: "", index: null });
  const [otWidths, setOtWidths] = useState(() => ({
    ...Object.fromEntries(otColumns.map(([key, , width]) => [key, width])),
    actions: 90,
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
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...values } : row,
      ),
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
          userCode: user?.USER_CODE || "ADMIN",
rows: rows.map((row, index) => ({
  ...row,
  lineNo: index + 1,
  otDateDetail: formatDateToYYYYMMDD(row.otDateDetail),
  startDate: formatDateToYYYYMMDD(row.startDate || row.otDateDetail),
  endDate: formatDateToYYYYMMDD(row.endDate || row.otDateDetail),
  otHours: numeric(row.otHours),
  otAmount: numeric(row.otAmount),
  otRate: numeric(row.otRate),
  mealAllow: numeric(row.mealAllow),
  transpoAllow: numeric(row.transpoAllow),
})),
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
      setHeader({
        ...initialHeader,
        ...saved,
        cutoffFrequency: getCutoffFrequency(saved.cutoffFrequency),
        otDate: toDisplayDate(saved.otDate),
      });
      setRows((saved.rows || []).map(normalizeRow));
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
    setReplicateValues({ otHours: "0.00", otAmount: "0.00" });
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
    setRows((current) => [
      ...current,
      ...employees.flatMap((employee) =>
        overtimes.map((ot) => ({
          ...createRow(),
          empNo: employee.empNo,
          empName: employee.empName,
          otCode: ot.code,
          otName: ot.description,
          payFrequency: employee.payFrequency,
          otHours: decimal(otHours),
        })),
      ),
    ]);
  };
  const removeRow = (index) =>
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  const validate = () => {
    if (!header.otDate || !header.cutoffFrequency)
      return "Transaction Date and Frequency are required.";
    if (!rows.length) return "Add at least one overtime detail row.";
    for (const row of rows) {
      if (!row.empNo || !row.otCode || !row.otDateDetail)
        return "Complete all required fields in every row.";
      if (numeric(row.otHours) < 0 || numeric(row.otAmount) < 0)
        return "Enter valid nonnegative values.";
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
      setHeader({
        ...initialHeader,
        ...record,
        cutoffFrequency: getCutoffFrequency(record.cutoffFrequency),
        otDate: toDisplayDate(record.otDate),
      });
      setRows((record.rows || []).map(normalizeRow));
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
      updateState={(values) =>
        updateRow(index, { [field]: values[`${field}${index}`] })
      }
    />
  );
  const formatNumberCell = (row, index, field) => {
    updateRow(index, { [field]: decimal(row[field]) });
  };
  const numberCell = (row, index, field) => (
    <input
      ref={(element) => {
        inputRefs.current[`${field}-${index}`] = element;
      }}
      value={row[field] ?? ""}
      readOnly={isReadOnly}
      inputMode="decimal"
      onFocus={(event) => {
        if (!isReadOnly)
          event.target.value = String(event.target.value).replace(/,/g, "");
      }}
      onChange={(event) => {
        const value = event.target.value.replace(/,/g, "");
        if (/^\d*(\.\d{0,2})?$/.test(value))
          updateRow(index, { [field]: value });
      }}
      onBlur={() => formatNumberCell(row, index, field)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          formatNumberCell(row, index, field);
          focusNext(index, field);
        }
      }}
      className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-right text-xs"
    />
  );
  const updateReplicateValue = (field, value) => {
    const normalized = String(value || "").replace(/,/g, "");
    if (/^\d*(\.\d{0,2})?$/.test(normalized))
      setReplicateValues((current) => ({ ...current, [field]: normalized }));
  };
  const replicateField = async (field, labelName) => {
    if (!rows.length)
      return useSwalInfoAlert(
        "Details Required",
        `Add details before replicating ${labelName}.`,
      );
    const val = numeric(replicateValues[field]);
    const confirmation = await useSwalProceedConfirm(
      `Apply ${labelName}?`,
      `Apply this value to all rows?`,
      "Apply",
      "Cancel",
    );
    if (!confirmation.isConfirmed) return;
    setRows((current) =>
      current.map((row) => ({ ...row, [field]: decimal(val) })),
    );
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
          amount: sum.amount + numeric(row.otAmount),
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
        <div className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                label="Transaction No."
                type="text"
                value={header.otNo || "Auto Generated"}
                disabled
              />
            </div>
            <div className="global-tran-textbox-group-div-ui">
              <div className="relative w-full">
                <div
                  className={`flex items-stretch global-ref-textbox-ui ${!isReadOnly ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                >
                  <DateFormatInput
                    id="otDate"
                    className="peer flex-grow cursor-pointer border-none bg-transparent px-3 focus:outline-none"
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
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="otFrequency"
                label="Frequency"
                required
                type="select"
                value={header.cutoffFrequency}
                options={[
                  { value: "S", label: "Semi-Monthly" },
                  { value: "M", label: "Monthly" },
                  { value: "D", label: "Weekly" },
                ]}
                placeholder="Select Frequency"
                disabled={isReadOnly}
                hideClearButton
                onChange={(value) => updateHeader({ cutoffFrequency: value })}
              />
            </div>
            <div className="flex min-w-0 items-end gap-2 lg:-mt-4 lg:-translate-y-2">
              <div className="flex min-w-0 flex-1 items-end gap-1">
                <div className="min-w-0 flex-1">
                  <FieldRenderer
                    id="replicateOtHours"
                    label="OT Hours"
                    type="amount"
                    value={replicateValues.otHours}
                    inputMode="decimal"
                    disabled={isReadOnly || !rows.length}
                    hideClearButton
                    onChange={(value) => updateReplicateValue("otHours", value)}
                  />
                </div>
                <button
                  type="button"
                  title="Replicate Hours"
                  disabled={isReadOnly || !rows.length}
                  onClick={() => replicateField("otHours", "OT Hours")}
                  className="global-tran-td-button-add-ui mb-[9px] h-8 w-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faClone} />
                </button>
              </div>
            </div>
            <div className="col-span-full">
              <div className="relative p-2">
                <textarea
                  id="remarks"
                  rows={4}
                  className="peer global-tran-textbox-remarks-ui pt-2"
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
                        {index + 1}
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
                        {dateCell(row, index, "otDateDetail")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otHours")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otRate")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "otAmount")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "mealAllow")}
                      </td>
                      <td className="global-tran-td-ui">
                        {numberCell(row, index, "transpoAllow")}
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
          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                onClick={() =>
                  header.cutoffFrequency
                    ? setLookup({ type: "employees", index: null })
                    : useSwalValidationAlert({
                        title: "Frequency Required",
                        message: "Select Frequency first.",
                      })
                }
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isReadOnly ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">
              {[
                ["Total Hours:", totals.hours],
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
      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/overtimeTransactions/history"
          cacheKey="OvertimeTransactionHistory"
          activeTabKey="OT_Summary"
          status="All"
          onRowDoubleClick={loadTransaction}
          historyExportName="Overtime Transaction History"
          amountDecimals={2}
        />
      </div>
      <SearchEmployeeRef
        isOpen={lookup.type === "employee"}
        onClose={(selected) => {
          if (selected)
            updateRow(lookup.index, {
              empNo: selected.empNo,
              empName: selected.empName,
            });
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
          if (selected)
            updateRow(lookup.index, {
              otCode: selected.code,
              otName: selected.description,
            });
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
