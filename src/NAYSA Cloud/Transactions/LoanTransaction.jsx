/* eslint-disable react-hooks/rules-of-hooks */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faEye, faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput, { formatDateToMMDDYYYY, formatDateToYYYYMMDD } from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import SearchEmployeeRef from "@/NAYSA Cloud/Lookup/SearchEmployeeRef.jsx";
import SearchLoanEmployeeSelection from "@/NAYSA Cloud/Lookup/SearchLoanEmployeeSelection.jsx";
import SearchLoanRef from "@/NAYSA Cloud/Lookup/SearchLoanRef.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import DocumentSignatories from "@/NAYSA Cloud/Lookup/SearchSignatory.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report.js";
import { useSwalErrorAlert, useSwalErrorAlertAPI, useSwalInfoAlert, useSwalProceedConfirm, useSwalSuccessAlert, useSwalValidationAlert, useSwalshowSaveSuccessDialog } from "@/NAYSA Cloud/Global/behavior.jsx";

const toDisplayDate = (value) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || "")) ? String(value) : formatDateToMMDDYYYY(value);
const createGroupId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = formatDateToMMDDYYYY(new Date().toISOString().slice(0, 10));
const docType = "LN";
const initialHeader = { loanId: "", loanNo: "", transactionDate: today, cutoffFrequency: "", remarks: "", documentStatus: "D" };
const getCutoffFrequency = (cutoffType) => {
  const value = String(cutoffType || "").trim().toUpperCase();
  if (value.startsWith("S")) return "S";
  if (value.startsWith("M")) return "M";
  return value ? "D" : "";
};
const createInitialHeader = (companyInfo) => ({ ...initialHeader, cutoffFrequency: getCutoffFrequency(companyInfo?.cutoffType) });
const createRow = () => ({ groupId: createGroupId(), empNo: "", empName: "", referenceNo: "", voucherNo: "", loanCode: "", loanName: "", dateGranted: today, beginningCutoff: "", endingCutoff: "", deductionStartDate: today, deductionEndDate: "", payFrequency: "", frequency: "", holdFlag: "N", loanAmount: "0.00", amortizationAmount: "0.00", interestAmount: "0.00", outstandingBalance: 0, totalPaid: 0 });
const parseResult = (response, fallback = []) => { try { return JSON.parse(response?.data?.data?.[0]?.result || JSON.stringify(fallback)); } catch { return fallback; } };
const numeric = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const decimal = (value) => numeric(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const normalizeLoanRow = (row) => ({ ...row, dateGranted: toDisplayDate(row.dateGranted), deductionStartDate: toDisplayDate(row.deductionStartDate), deductionEndDate: toDisplayDate(row.deductionEndDate), loanAmount: decimal(row.loanAmount), amortizationAmount: decimal(row.amortizationAmount) });
const getRowBalance = (row) => numeric(row.totalPaid) > 0 ? numeric(row.outstandingBalance) : numeric(row.loanAmount) + numeric(row.interestAmount);
const loanColumns = [["ln", "LN", 70], ["empNo", "Employee No.", 120], ["empName", "Employee Name", 220], ["referenceNo", "Reference No. *", 140], ["loanCode", "Loan Code", 115], ["loanName", "Loan Description", 210], ["dateGranted", "Date Granted", 130], ["deductionStartDate", "Loan Start", 130], ["deductionEndDate", "Loan End", 130], ["frequency", "Frequency", 170], ["holdFlag", "Hold", 75], ["loanAmount", "Loan Amount", 125], ["amortizationAmount", "Amortization *", 125], ["outstandingBalance", "Balance", 125], ["totalPaid", "Total Paid", 115]];
const paymentColumns = [["paymentNo", "LN", 70], ["empName", "Employee Name", 220], ["cutoffCode", "Cut-Off", 100], ["frequency", "Frequency", 90], ["loanName", "Loan Description", 210], ["referenceNo", "Reference No.", 140], ["loanAmount", "Loan Amount", 125], ["paymentAmount", "Payment", 120], ["endingBalance", "Balance", 125], ["totalPaid", "Total Paid", 115], ["previousBalance", "Previous Balance", 130], ["holdFlag", "Hold", 80], ["paymentReferenceNo", "Tran No.", 130]];

const LoanTransaction = () => {
  const { user, companyInfo, refsLoaded } = useAuth();
  const inputRefs = useRef({});
  const [topTab, setTopTab] = useState("details");
  const [detailTab, setDetailTab] = useState("loans");
  const [header, setHeader] = useState(() => createInitialHeader(companyInfo));
  const [rows, setRows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showSignatoryModal, setShowSignatoryModal] = useState(false);
  const [noReprints, setNoReprints] = useState(0);
  const [replicateValues, setReplicateValues] = useState({ loanAmount: "0.00", amortizationAmount: "0.00" });
  const [selectedPaymentGroupId, setSelectedPaymentGroupId] = useState("");
  const [lookup, setLookup] = useState({ type: "", index: null });
  const [loanWidths, setLoanWidths] = useState(() => ({ ...Object.fromEntries(loanColumns.map(([key, , width]) => [key, width])), actions: 90 }));
  const [paymentWidths, setPaymentWidths] = useState(() => Object.fromEntries(paymentColumns.map(([key, , width]) => [key, width])));
  const isReadOnly = header.documentStatus !== "D";
  const status = header.documentStatus === "F" ? "FINALIZED" : header.documentStatus === "X" ? "CANCELLED" : "OPEN";
  const statusColor = status === "FINALIZED" ? "global-tran-stat-text-finalized-ui" : status === "CANCELLED" ? "global-tran-stat-text-closed-ui" : "global-tran-stat-text-open-ui";
  const updateHeader = (values) => setHeader((current) => ({ ...current, ...values }));
  const updateRow = (index, values) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...values } : row));

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post("/loanTransactions/save", { jsonData: { ...header, cutoffFrequency: getCutoffFrequency(header.cutoffType || header.cutoffFrequency || companyInfo?.cutoffType), transactionDate: formatDateToYYYYMMDD(header.transactionDate), userCode: user?.USER_CODE || "ADMIN", rows: rows.map((row, index) => ({ ...row, lineNo: index + 1, dateGranted: formatDateToYYYYMMDD(row.dateGranted), deductionStartDate: formatDateToYYYYMMDD(row.deductionStartDate), deductionEndDate: formatDateToYYYYMMDD(row.deductionEndDate), loanAmount: numeric(row.loanAmount), amortizationAmount: numeric(row.amortizationAmount), interestAmount: numeric(row.interestAmount) })) } }),
    onSuccess: async (response) => { const result = response?.data?.data?.[0] || {}; if (result.errorCount > 0 || result.errorcount > 0) return useSwalErrorAlert("Unable to save", result.errorMsg || result.errormsg); const saved = parseResult(await apiClient.post("/loanTransactions/get", { jsonData: { loanId: result.loanId } }), {}); setHeader({ ...initialHeader, ...saved, cutoffFrequency: getCutoffFrequency(saved.cutoffType || saved.cutoffFrequency), transactionDate: toDisplayDate(saved.transactionDate) }); setRows((saved.rows || []).map(normalizeLoanRow)); useSwalshowSaveSuccessDialog(reset, () => setShowSignatoryModal(true), () => {}); },
    onError: (error) => {
      const validationMessage = Object.values(error?.response?.data?.errors || {}).flat()[0];
      useSwalErrorAlert("Save Error", validationMessage || error?.response?.data?.message || error?.message || "Unable to save the loan transaction.");
    },
  });
  const actionMutation = useMutation({
    mutationFn: ({ mode, password = "", reason = "" }) => apiClient.post(`/loanTransactions/${mode}`, { userCode: user?.USER_CODE || "ADMIN", userPassword: password, jsonData: { loanId: header.loanId, userCode: user?.USER_CODE || "ADMIN", remarks: reason } }),
    onSuccess: (response, { mode }) => { const result = response?.data?.data?.[0] || {}; if (result.errorCount > 0 || result.errorcount > 0) return useSwalErrorAlert("Unable to continue", result.errorMsg || result.errormsg); updateHeader({ documentStatus: mode === "post" ? "F" : "X", remarks: mode === "cancel" ? result.remarks : header.remarks }); setShowCancelModal(false); useSwalSuccessAlert("Success!", result.message); },
    onError: (error) => useSwalErrorAlertAPI("Transaction Error", error),
  });
  const busy = saveMutation.isPending || actionMutation.isPending || loadingTransaction;
  const reset = () => { setHeader(createInitialHeader(companyInfo)); setRows([]); setPayments([]); setSelectedPaymentGroupId(""); setNoReprints(0); setReplicateValues({ loanAmount: "0.00", amortizationAmount: "0.00" }); setTopTab("details"); setDetailTab("loans"); };

  useEffect(() => {
    if (!refsLoaded || !companyInfo) return;
    setHeader((current) => current.loanId || current.loanNo ? current : { ...current, cutoffFrequency: current.cutoffFrequency || getCutoffFrequency(companyInfo.cutoffType) });
  }, [companyInfo, refsLoaded]);
  const addSelections = ({ employees, loans, loanAmount, amortizationAmount, frequency }) => {
    const exceedsBalance = numeric(amortizationAmount) > numeric(loanAmount);
    if (exceedsBalance) useSwalErrorAlert("Invalid Amortization", "Amortization Amount cannot be greater than Balance. It has been reset to 0.00.");
    setRows((current) => [...current, ...employees.flatMap((employee) => loans.map((loan) => ({ ...createRow(), empNo: employee.empNo, empName: employee.empName, loanCode: loan.code, loanName: loan.description, payFrequency: employee.payFrequency, frequency: frequency || "", loanAmount: decimal(loanAmount), amortizationAmount: exceedsBalance ? "0.00" : decimal(amortizationAmount) })))]);
  };
  const removeRow = (index) => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  const validate = () => {
    if (!header.transactionDate || !header.cutoffFrequency) return "Transaction Date and Frequency are required.";
    if (!rows.length) return "Add at least one loan detail row.";
    const loanReferences = new Set();
    for (const row of rows) {
      if (!row.empNo || !row.loanCode || !row.dateGranted || !row.deductionStartDate || !row.frequency) return "Complete all required fields in every loan detail row.";
      if (!String(row.referenceNo || "").trim()) return `Loan Reference is required for ${row.empName || row.empNo}.`;
      const referenceKey = `${row.empNo}|${row.loanCode}|${String(row.referenceNo).trim().toUpperCase()}`;
      if (loanReferences.has(referenceKey)) return `Loan Reference ${row.referenceNo} is duplicated for ${row.empName || row.empNo} and Loan Code ${row.loanCode}.`;
      loanReferences.add(referenceKey);
      if (row.deductionEndDate && formatDateToYYYYMMDD(row.deductionEndDate) < formatDateToYYYYMMDD(row.dateGranted)) return `Loan End cannot be earlier than Date Granted for ${row.empName || row.empNo}.`;
      if (row.deductionEndDate && formatDateToYYYYMMDD(row.deductionEndDate) < formatDateToYYYYMMDD(row.deductionStartDate)) return `Loan End cannot be earlier than Loan Start for ${row.empName || row.empNo}.`;
      if (numeric(row.amortizationAmount) <= 0) return `Amortization is required for ${row.empName || row.empNo}.`;
      if (numeric(row.loanAmount) <= 0 || numeric(row.interestAmount) < 0) return "Enter valid nonnegative amounts.";
      if (numeric(row.amortizationAmount) > getRowBalance(row)) return `Amortization Amount cannot be greater than Balance for ${row.empName || row.empNo}.`;
    }
    return "";
  };
  const save = () => { const message = validate(); if (message) return useSwalErrorAlert("Check Loan Transaction", message); saveMutation.mutate(); };
  const closeCancelModal = (confirmation) => {
    if (!confirmation) return setShowCancelModal(false);
    actionMutation.mutate({ mode: "cancel", password: confirmation.password, reason: confirmation.reason });
  };
  const closeSignatoryModal = async (mode = "Inline") => {
    const printMode = typeof mode === "string" ? mode : mode?.mode || mode?.printMode || "Inline";
    setShowSignatoryModal(false);
    setLoadingTransaction(true);
    if (printMode === "Final") setNoReprints(1);
    try {
      await useHandlePrint(header.loanId, docType, printMode, user?.USER_CODE || "ADMIN");
    } finally {
      setLoadingTransaction(false);
    }
  };
  const loadTransaction = async (selected) => {
    setLoadingTransaction(true);
    try {
      const docNo = selected?.docNo || "";
      if (!docNo) return useSwalErrorAlert("Unable to load", "Transaction No. is missing from the selected history record.");
      const response = await apiClient.post("/loanTransactions/get", { jsonData: { loanNo: docNo } });
      const record = parseResult(response, {});
      if (!record?.loanId) return useSwalErrorAlert("Unable to load", `Loan transaction ${docNo} was not found.`);
      setHeader({ ...initialHeader, ...record, cutoffFrequency: getCutoffFrequency(record.cutoffType || record.cutoffFrequency || companyInfo?.cutoffType), transactionDate: toDisplayDate(record.transactionDate) });
      setRows((record.rows || []).map(normalizeLoanRow));
      setPayments(parseResult(await apiClient.post("/loanTransactions/paymentHistory", { jsonData: { loanId: record.loanId } })));
      setTopTab("details");
    } catch (error) { useSwalErrorAlertAPI("Load Error", error); }
    finally { setLoadingTransaction(false); }
  };
  const focusNext = (index, field) => requestAnimationFrame(() => inputRefs.current[`${field}-${index + 1}`]?.focus());
  const textCell = (row, index, field, align = "") => <input ref={(element) => { inputRefs.current[`${field}-${index}`] = element; }} value={row[field] || ""} readOnly={isReadOnly} onChange={(event) => updateRow(index, { [field]: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); focusNext(index, field); } }} className={`global-tran-td-inputclass-ui h-7 w-full bg-transparent text-xs ${align}`} />;
  const updateRowDate = (row, index, field, value) => {
    if (!value) return updateRow(index, { [field]: value });
    const nextRow = { ...row, [field]: value };
    if (nextRow.deductionEndDate) {
      const loanEnd = formatDateToYYYYMMDD(nextRow.deductionEndDate);
      const dateGranted = formatDateToYYYYMMDD(nextRow.dateGranted);
      const loanStart = formatDateToYYYYMMDD(nextRow.deductionStartDate);
      if (dateGranted && loanEnd < dateGranted) return useSwalErrorAlert("Invalid Loan End", "Loan End cannot be earlier than Date Granted.");
      if (loanStart && loanEnd < loanStart) return useSwalErrorAlert("Invalid Loan End", "Loan End cannot be earlier than Loan Start.");
    }
    updateRow(index, { [field]: value });
  };
  const dateCell = (row, index, field) => <DateFormatInput id={`${field}${index}`} value={row[field] || ""} disabled={isReadOnly} className="w-full global-tran-td-inputclass-ui text-center pr-7" updateState={(values) => updateRowDate(row, index, field, values[`${field}${index}`])} />;
  const frequencyCell = (row, index) => {
    const options = frequencyOptionsByDoc[row.payFrequency] || [];
    return <select value={row.frequency || ""} disabled={isReadOnly || !options.length} onChange={(event) => updateRow(index, { frequency: event.target.value })} className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-xs"><option value="">Select</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  };
  const formatNumberCell = (row, index, field) => {
    const formattedValue = decimal(row[field]);
    const nextRow = { ...row, [field]: formattedValue };
    if (numeric(nextRow.amortizationAmount) > getRowBalance(nextRow)) {
      updateRow(index, { [field]: formattedValue, amortizationAmount: "0.00" });
      useSwalErrorAlert("Invalid Amortization", "Amortization Amount cannot be greater than Balance. It has been reset to 0.00.");
      return false;
    }
    updateRow(index, { [field]: formattedValue });
    return true;
  };
  const numberCell = (row, index, field) => <input ref={(element) => { inputRefs.current[`${field}-${index}`] = element; }} value={row[field] ?? ""} readOnly={isReadOnly} inputMode="decimal" onFocus={(event) => { if (!isReadOnly) event.target.value = String(event.target.value).replace(/,/g, ""); }} onChange={(event) => { const value = event.target.value.replace(/,/g, ""); if (/^\d*(\.\d{0,2})?$/.test(value)) updateRow(index, { [field]: value }); }} onBlur={() => formatNumberCell(row, index, field)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (formatNumberCell(row, index, field)) focusNext(index, field); } }} className="global-tran-td-inputclass-ui h-7 w-full bg-transparent text-right text-xs" />;
  const updateReplicateValue = (field, value) => {
    const normalized = String(value || "").replace(/,/g, "");
    if (/^\d*(\.\d{0,2})?$/.test(normalized)) setReplicateValues((current) => ({ ...current, [field]: normalized }));
  };
  const focusReplicateValue = (field, event) => {
    if (numeric(replicateValues[field]) === 0) {
      setReplicateValues((current) => ({ ...current, [field]: "" }));
      return;
    }
    event.target.select();
  };
  const formatReplicateValue = (field) => {
    if (field === "amortizationAmount" && numeric(replicateValues.amortizationAmount) > numeric(replicateValues.loanAmount)) {
      setReplicateValues((current) => ({ ...current, amortizationAmount: "0.00" }));
      useSwalErrorAlert("Invalid Amortization", "Amortization cannot be greater than Loan Amount. It has been reset to 0.00.");
      return;
    }
    setReplicateValues((current) => ({ ...current, [field]: decimal(current[field]) }));
  };
  const replicateLoanAmount = async () => {
    if (!rows.length) return useSwalInfoAlert("Loan Details Required", "Add loan details before replicating Loan Amount.");
    const loanAmount = numeric(replicateValues.loanAmount);
    const confirmation = await useSwalProceedConfirm("Apply Loan Amount?", "Apply this Loan Amount to all loan details?", "Apply", "Cancel");
    if (!confirmation.isConfirmed) return;
    let resetAmortization = false;
    setRows((current) => current.map((row) => {
      const nextRow = { ...row, loanAmount: decimal(loanAmount) };
      if (numeric(nextRow.amortizationAmount) > getRowBalance(nextRow)) {
        resetAmortization = true;
        nextRow.amortizationAmount = "0.00";
      }
      return nextRow;
    }));
    if (resetAmortization) useSwalErrorAlert("Invalid Amortization", "Amortization Amount exceeding the new Balance was reset to 0.00.");
  };
  const replicateAmortization = async () => {
    if (!rows.length) return useSwalInfoAlert("Loan Details Required", "Add loan details before replicating Amortization.");
    const amortizationAmount = numeric(replicateValues.amortizationAmount);
    if (amortizationAmount > numeric(replicateValues.loanAmount)) {
      setReplicateValues((current) => ({ ...current, amortizationAmount: "0.00" }));
      return useSwalErrorAlert("Invalid Amortization", "Amortization cannot be greater than Loan Amount. It has been reset to 0.00.");
    }
    if (rows.some((row) => amortizationAmount > getRowBalance(row))) {
      setReplicateValues((current) => ({ ...current, amortizationAmount: "0.00" }));
      return useSwalErrorAlert("Invalid Amortization", "Amortization Amount cannot be greater than Balance. It has been reset to 0.00.");
    }
    const confirmation = await useSwalProceedConfirm("Apply Amortization?", "Apply this Amortization to all loan details?", "Apply", "Cancel");
    if (!confirmation.isConfirmed) return;
    setRows((current) => current.map((row) => ({ ...row, amortizationAmount: decimal(amortizationAmount) })));
  };
  const lookupCell = (row, index, type) => <div className="relative flex items-center"><input value={type === "employee" ? row.empNo : row.loanCode} readOnly onClick={() => !isReadOnly && setLookup({ type, index })} className="global-tran-td-inputclass-ui h-7 w-full cursor-pointer bg-transparent pr-7 text-xs" /><FontAwesomeIcon icon={faMagnifyingGlass} onClick={() => !isReadOnly && setLookup({ type, index })} className="absolute right-2 cursor-pointer text-xs text-blue-600" /></div>;
  const payFrequencies = useMemo(() => [...new Set(rows.map((row) => row.payFrequency).filter(Boolean))], [rows]);
  const frequencyQueries = useQueries({ queries: payFrequencies.map((docCode) => ({ queryKey: ["loanFrequency", docCode], queryFn: async () => { const response = await apiClient.post("/getHSDropdown", { json_data: { dropdownColumn: "FREQ", docCode } }); const raw = response?.data?.data?.[0]?.result || "[]"; const records = Array.isArray(raw) ? raw : JSON.parse(raw); return records.map((record) => ({ value: record.DROPDOWN_CODE ?? record.dropdownCode ?? record.code ?? "", label: record.DROPDOWN_NAME ?? record.dropdownName ?? record.label ?? "" })).filter((option) => option.value); }, staleTime: 300000 })) });
  const frequencyOptionsByDoc = useMemo(() => Object.fromEntries(payFrequencies.map((docCode, index) => [docCode, frequencyQueries[index]?.data || []])), [payFrequencies, frequencyQueries]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({ loan: sum.loan + numeric(row.loanAmount), amortization: sum.amortization + numeric(row.amortizationAmount), paid: sum.paid + numeric(row.totalPaid), balance: sum.balance + getRowBalance(row) }), { loan: 0, amortization: 0, paid: 0, balance: 0 }), [rows]);
  const displayedPayments = useMemo(() => selectedPaymentGroupId ? payments.filter((payment) => payment.groupId === selectedPaymentGroupId) : payments, [payments, selectedPaymentGroupId]);
  const startResize = (event, key, widths, setWidths) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widths[key];
    const move = (moveEvent) => setWidths((current) => ({ ...current, [key]: Math.max(60, startWidth + moveEvent.clientX - startX) }));
    const stop = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", stop); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };
  const resizeHeader = (key, label, widths, setWidths, extraClass = "", autoFit = false) => <th key={key} className={`global-tran-th-ui relative ${extraClass}`} style={autoFit ? { width: `${100 / paymentColumns.length}%` } : { width: widths[key], minWidth: widths[key] }}>{label}<span onMouseDown={(event) => startResize(event, key, widths, setWidths)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-blue-500" /></th>;

  return <div className="global-tran-main-div-ui">
    {busy && <LoadingSpinner />}
    <div className="global-tran-headerToolbar-ui"><Header docType={docType} activeTopTab={topTab} showActions={topTab === "details"} showBIRForm={false} showCopyForm={false} onDetails={() => setTopTab("details")} onHistory={() => setTopTab("history")} disableRouteNavigation onSave={save} onReset={reset} onPrint={() => setShowSignatoryModal(true)} onPost={() => actionMutation.mutate({ mode: "post" })} onCancel={() => setShowCancelModal(true)} onAttach={() => setShowAttachModal(true)} isSaveDisabled={isReadOnly || !rows.length} isPrintDisabled={!header.loanId || header.documentStatus === "X"} isAttachDisabled={!header.loanId || header.documentStatus === "X"} isPostDisabled={!header.loanId || isReadOnly} isCancelDisabled={!header.loanId || isReadOnly} /></div>

    <div className={topTab === "details" ? "" : "hidden"}>
      <div className="global-tran-header-ui"><div className="global-tran-headertext-div-ui"><h1 className="global-tran-headertext-ui">Loan Transaction</h1></div><div className="global-tran-headerstat-div-ui flex items-center gap-6"><div><p className="global-tran-headerstat-text-ui">Transaction Status</p><h1 className={`global-tran-stat-text-ui uppercase ${statusColor}`}>{status}</h1></div></div></div>
      <div className="global-tran-header-div-ui"><div className="global-tran-header-tab-div-ui"><button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Basic Information</button></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="global-tran-textbox-group-div-ui"><FieldRenderer label="Transaction No." type="text" value={header.loanNo || "Auto Generated"} disabled /></div>
        <div className="global-tran-textbox-group-div-ui"><div className="relative w-full"><div className={`flex items-stretch global-ref-textbox-ui ${!isReadOnly ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}><DateFormatInput id="transactionDate" className="peer flex-grow cursor-pointer border-none bg-transparent px-3 focus:outline-none" value={header.transactionDate} disabled={isReadOnly} updateState={(values) => updateHeader({ transactionDate: values.transactionDate })} /></div><label htmlFor="transactionDate" className="global-ref-floating-label">Transaction Date <span className="text-red-500">*</span></label></div></div>
        <div className="global-tran-textbox-group-div-ui"><FieldRenderer id="loanFrequency" label="Frequency" required type="select" value={header.cutoffFrequency} options={[{ value: "S", label: "Semi-Monthly" }, { value: "M", label: "Monthly" }, { value: "D", label: "Weekly" }]} placeholder="Select Frequency" disabled={isReadOnly} hideClearButton onChange={(value) => updateHeader({ cutoffFrequency: value })} /></div>
        <div className="flex min-w-0 items-end gap-2 lg:-mt-4 lg:-translate-y-2"><div className="flex min-w-0 flex-1 items-end gap-1"><div className="min-w-0 flex-1"><FieldRenderer id="replicateLoanAmount" label="Loan Amount" type="amount" value={replicateValues.loanAmount} inputMode="decimal" disabled={isReadOnly || !rows.length} hideClearButton onFocus={(event) => focusReplicateValue("loanAmount", event)} onChange={(value) => updateReplicateValue("loanAmount", value)} onBlur={() => formatReplicateValue("loanAmount")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div><button type="button" title="Replicate Loan Amount" disabled={isReadOnly || !rows.length} onClick={replicateLoanAmount} className="global-tran-td-button-add-ui mb-[9px] h-8 w-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"><FontAwesomeIcon icon={faClone} /></button></div><div className="flex min-w-0 flex-1 items-end gap-1"><div className="min-w-0 flex-1"><FieldRenderer id="replicateAmortization" label="Amortization" type="amount" value={replicateValues.amortizationAmount} inputMode="decimal" disabled={isReadOnly || !rows.length} hideClearButton onFocus={(event) => focusReplicateValue("amortizationAmount", event)} onChange={(value) => updateReplicateValue("amortizationAmount", value)} onBlur={() => formatReplicateValue("amortizationAmount")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div><button type="button" title="Replicate Amortization" disabled={isReadOnly || !rows.length} onClick={replicateAmortization} className="global-tran-td-button-add-ui mb-[9px] h-8 w-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"><FontAwesomeIcon icon={faClone} /></button></div></div>
        <div className="col-span-full"><div className="relative p-2"><textarea id="remarks" rows={4} className="peer global-tran-textbox-remarks-ui pt-2" value={header.remarks} onChange={(event) => updateHeader({ remarks: event.target.value })} disabled={isReadOnly} /><label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label></div></div>
      </div></div>

      <div id="loan_dtl" className="global-tran-tab-div-ui"><div className="global-tran-tab-nav-ui"><div className="flex flex-row"><button onClick={() => setDetailTab("loans")} className={`global-tran-tab-padding-ui ${detailTab === "loans" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}>Loan Details</button><button onClick={() => { setSelectedPaymentGroupId(""); setDetailTab("payments"); }} className={`global-tran-tab-padding-ui ${detailTab === "payments" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}>Payment Details</button></div></div>
        {detailTab === "loans" ? <><div className="global-tran-table-main-div-ui"><div className="global-tran-table-main-sub-div-ui"><table className="border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l" style={{ tableLayout: "fixed", width: loanColumns.reduce((sum, [key]) => sum + loanWidths[key], loanWidths.actions) }}><colgroup>{loanColumns.map(([key]) => <col key={key} style={{ width: loanWidths[key] }} />)}<col style={{ width: loanWidths.actions }} /></colgroup><thead className="global-tran-thead-div-ui"><tr>{loanColumns.map(([key, label]) => resizeHeader(key, label, loanWidths, setLoanWidths))}{resizeHeader("actions", "Actions", loanWidths, setLoanWidths, "sticky top-0 right-0 bg-blue-100 dark:bg-blue-900")}</tr></thead><tbody className="relative">{rows.map((row, index) => <tr key={row.groupId} className="global-tran-tr-ui">
          <td className="global-tran-td-ui text-center">{index + 1}</td><td className="global-tran-td-ui">{lookupCell(row, index, "employee")}</td><td className="global-tran-td-ui">{row.empName}</td><td className="global-tran-td-ui">{textCell(row, index, "referenceNo")}</td><td className="global-tran-td-ui">{lookupCell(row, index, "loan")}</td><td className="global-tran-td-ui">{row.loanName}</td><td className="global-tran-td-ui">{dateCell(row, index, "dateGranted")}</td><td className="global-tran-td-ui">{dateCell(row, index, "deductionStartDate")}</td><td className="global-tran-td-ui">{dateCell(row, index, "deductionEndDate")}</td><td className="global-tran-td-ui">{frequencyCell(row, index)}</td>
          <td className="global-tran-td-ui"><button disabled={isReadOnly} onClick={() => updateRow(index, { holdFlag: row.holdFlag === "Y" ? "N" : "Y" })} className={`w-full rounded-full py-1 text-[10px] ${row.holdFlag === "Y" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{row.holdFlag === "Y" ? "Yes" : "No"}</button></td><td className="global-tran-td-ui">{numberCell(row, index, "loanAmount")}</td><td className="global-tran-td-ui">{numberCell(row, index, "amortizationAmount")}</td><td className="global-tran-td-ui text-right">{decimal(getRowBalance(row))}</td><td className="global-tran-td-ui text-right">{decimal(row.totalPaid)}</td><td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={{ width: loanWidths.actions, minWidth: loanWidths.actions }}><div className="flex items-center justify-center gap-1"><button type="button" title="View Payment Details" onClick={() => { if (numeric(row.totalPaid) <= 0) return useSwalErrorAlert("No Payment Details", "No payment details found for this loan."); setSelectedPaymentGroupId(row.groupId); setDetailTab("payments"); }} className="global-tran-td-button-add-ui"><FontAwesomeIcon icon={faEye} /></button>{!isReadOnly && <button type="button" onClick={() => removeRow(index)} className="global-tran-td-button-delete-ui"><FontAwesomeIcon icon={faTrashAlt} /></button>}</div></td>
        </tr>)}</tbody></table></div></div><div className="global-tran-tab-footer-main-div-ui"><div className="global-tran-tab-footer-button-div-ui"><button onClick={() => header.cutoffFrequency ? setLookup({ type: "employees", index: null }) : useSwalValidationAlert({ title: "Frequency Required", message: "Select Frequency before adding employee loans." })} className="global-tran-tab-footer-button-add-ui" style={{ visibility: isReadOnly ? "hidden" : "visible" }}><FontAwesomeIcon icon={faPlus} className="mr-2" />Add</button></div><div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">{[["Total Loan Amount:", totals.loan], ["Total Amortization:", totals.amortization], ["Total Paid:", totals.paid], ["Outstanding Balance:", totals.balance]].map(([label, value]) => <Fragment key={label}><div className="global-tran-tab-footer-total-label-ui">{label}</div><div className="global-tran-tab-footer-total-value-ui text-right">{decimal(value)}</div></Fragment>)}</div></div></> : <div className="global-tran-table-main-div-ui"><div className="global-tran-table-main-sub-div-ui"><table className="border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l" style={{ tableLayout: "fixed", width: displayedPayments.length ? paymentColumns.reduce((sum, [key]) => sum + paymentWidths[key], 0) : "100%" }}><colgroup>{paymentColumns.map(([key]) => <col key={key} style={{ width: displayedPayments.length ? paymentWidths[key] : `${100 / paymentColumns.length}%` }} />)}</colgroup><thead className="global-tran-thead-div-ui"><tr>{paymentColumns.map(([key, label]) => resizeHeader(key, label, paymentWidths, setPaymentWidths, "", !displayedPayments.length))}</tr></thead><tbody className="relative">{displayedPayments.map((row) => <tr key={row.paymentDetailId} className="global-tran-tr-ui"><td className="global-tran-td-ui text-center">{row.paymentNo}</td><td className="global-tran-td-ui">{row.empName}</td><td className="global-tran-td-ui text-center">{row.cutoffCode}</td><td className="global-tran-td-ui text-center">{row.frequency}</td><td className="global-tran-td-ui">{row.loanName}</td><td className="global-tran-td-ui">{row.referenceNo}</td><td className="global-tran-td-ui text-right">{decimal(row.loanAmount)}</td><td className="global-tran-td-ui text-right">{decimal(row.paymentAmount)}</td><td className="global-tran-td-ui text-right">{decimal(row.endingBalance)}</td><td className="global-tran-td-ui text-right">{decimal(row.totalPaid)}</td><td className="global-tran-td-ui text-right">{decimal(row.previousBalance)}</td><td className="global-tran-td-ui text-center">{row.holdFlag === "Y" ? "Yes" : "No"}</td><td className="global-tran-td-ui">{row.paymentReferenceNo}</td></tr>)}</tbody></table></div></div>}
      </div>
    </div>
    <div className={topTab === "history" ? "" : "hidden"}><AllTranHistory showHeader={false} isActive={topTab === "history"} endpoint="/loanTransactions/history" cacheKey="LoanTransactionHistory" activeTabKey="Loan_Summary" status="All" onRowDoubleClick={loadTransaction} historyExportName="Loan Transaction History" amountDecimals={2} /></div>
    <SearchEmployeeRef isOpen={lookup.type === "employee"} onClose={(selected) => { if (selected) updateRow(lookup.index, { empNo: selected.empNo, empName: selected.empName }); setLookup({ type: "", index: null }); }} />
    <SearchLoanEmployeeSelection isOpen={lookup.type === "employees"} payFrequency={header.cutoffFrequency} onClose={(selected) => { if (selected) addSelections(selected); setLookup({ type: "", index: null }); }} />
    <SearchLoanRef isOpen={lookup.type === "loan"} onClose={(selected) => { if (selected) updateRow(lookup.index, { loanCode: selected.code, loanName: selected.description }); setLookup({ type: "", index: null }); }} />
    {showCancelModal && <CancelTranModal isOpen={showCancelModal} onClose={closeCancelModal} />}
    {showAttachModal && <AttachDocumentModal isOpen={showAttachModal} params={{ DocumentID: header.loanId, DocumentName: "Loan Transaction", DocumentNo: header.loanNo, viewOnly: header.documentStatus === "X" }} onClose={() => setShowAttachModal(false)} />}
    {showSignatoryModal && <DocumentSignatories isOpen={showSignatoryModal} params={{ noReprints, documentID: header.loanId, docType, docNo: header.loanNo }} onClose={closeSignatoryModal} onCancel={() => setShowSignatoryModal(false)} />}
  </div>;
};

export default LoanTransaction;






