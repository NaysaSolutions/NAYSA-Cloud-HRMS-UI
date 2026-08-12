import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBroom,
  faBuildingColumns,
  faChevronDown,
  faCheck,
  faCircleNodes,
  faFileExcel,
  faColumns,
  faFileCsv,
  faFileExport,
  faFileInvoiceDollar,
  faFileLines,
  faMoneyBillTransfer,
  faFilePdf,
  faEnvelope,
  faFloppyDisk,
  faEye,
  faMagnifyingGlass,
  faScaleBalanced,
  faPlus,
  faPrint,
  faExpand,
  faCompress,
  faTrashAlt,
  faTimes,
  faUndo,
  faUnlock,
  faUpload,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalProceedConfirm,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";
import { exportGenericHistoryExcel, exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import BankMastLookupModal from "@/NAYSA Cloud/Lookup/SearchBankMast.jsx";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef.jsx";
import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";
import SearchGlobalEmail from "@/NAYSA Cloud/Lookup/SearchGlobalEmail.jsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/*
  BANK RECONCILIATION PAGE WORKFLOW
  ---------------------------------
  1. Header setup
     - User selects Cut-Off and Bank Account.
     - Find/Load retrieves or creates the working Bank Recon record.

  2. Detail review
     - Check Vouchers and Deposits tab controls cleared/outstanding status.
     - Undeposited Receipt and Journal Voucher tabs show supporting book-side records.

  3. Summary generation
     - Generate saves current check/deposit statuses first.
     - Then it builds Bank Recon Summary lines.

  4. Final actions
     - Save stores current tab changes.
     - Post/Unpost require password confirmation.
     - View/Email/Download Report actions use the report preview/export helpers.

  CODE ORGANIZATION GUIDE
  -----------------------
  A. Constants and formatting helpers
  B. Reusable UI components
  C. Main BankReconProcessing1 component
  D. API/loading handlers
  E. Save/Post/Unpost/Clear handlers
  F. Table/export/report/email helpers
  G. Table cell renderers
  H. JSX layout and modals
*/

const ENDPOINT = "/bankRecon";
const DEFAULT_ACTIVE_TAB = "checks";
const VIEW_COLUMN_WIDTH = 58;
const REPORT_FONT_FAMILY = '"Aptos", "Aptos Display", "Segoe UI", Arial, sans-serif';

// =====================================================
// A. Constants, default values, and formatting helpers
// =====================================================

const emptyTotals = {
  totalDepositCL: 0,
  totalDepositOS: 0,
  totalDeposit: 0,
  totalDisbCL: 0,
  totalDisbOS: 0,
  totalDisb: 0,
  totalAdjustment: 0,
  totalUndeposit: 0,
  totalReversed: 0,
  totalDebit: 0,
  totalCredit: 0,
  totalPerBank: 0,
  totalPerBook: 0,
  variance: 0,
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const asDataObject = (payload) => {
  if (!payload) return {};
  if (payload?.data !== undefined) return payload.data || {};
  return payload || {};
};

const toDateInput = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [mm, dd, yyyy] = raw.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toMMDDYYYY = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split("-");
    return `${mm}/${dd}/${yyyy}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy}`;
};

const getCutoffLastDay = (cutOff) => {
  const value = String(cutOff || "");
  if (!/^\d{6}$/.test(value)) return "";
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(month).padStart(2, "0")}/${String(lastDay).padStart(2, "0")}/${year}`;
};

const getCutoffDateRange = (cutOff) => {
  const value = String(cutOff || "");
  if (!/^\d{6}$/.test(value)) return { start: "", end: "" };

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const lastDay = new Date(Number(year), Number(month), 0).getDate();

  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
};

const isDateWithinCutoff = (dateValue, cutOff) => {
  const inputDate = toDateInput(dateValue);
  const { start, end } = getCutoffDateRange(cutOff);

  if (!inputDate || !start || !end) return true;

  return inputDate >= start && inputDate <= end;
};

const formatCutoffMonth = (cutOff) => {
  const value = String(cutOff || "");
  if (!/^\d{6}$/.test(value)) return "the selected cut off";

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });

  return `${monthName} ${year}`;
};

const normalizeNumber = (value) => parseFormattedNumber(value || 0) || 0;

const calculateCheckTotals = (rows = []) => {
  const nextTotals = {
    totalDepositCL: 0,
    totalDepositOS: 0,
    totalDeposit: 0,
    totalDisbCL: 0,
    totalDisbOS: 0,
    totalDisb: 0,
  };

  rows.forEach((row) => {
    const status = String(row?.status || "").toUpperCase();
    const isCleared = status === "CL" || Boolean(row?.selected);
    const isOutstanding = status === "O/S" || (!status && !row?.selected);

    if (!isCleared && !isOutstanding) return;

    const deposit = normalizeNumber(row?.debit);
    const disbursement = normalizeNumber(row?.credit);

    if (isCleared) {
      nextTotals.totalDepositCL += deposit;
      nextTotals.totalDisbCL += disbursement;
    } else {
      nextTotals.totalDepositOS += deposit;
      nextTotals.totalDisbOS += disbursement;
    }
  });

  nextTotals.totalDeposit = nextTotals.totalDepositCL + nextTotals.totalDepositOS;
  nextTotals.totalDisb = nextTotals.totalDisbCL + nextTotals.totalDisbOS;

  return nextTotals;
};

const isUserDefinedSummaryRow = (row) => String(row?.sequence || "").toUpperCase().startsWith("UD");

const renumberUserDefinedSummaryRows = (rows = []) => {
  let nextNumber = 1;

  return rows.map((row) => {
    if (!isUserDefinedSummaryRow(row)) return row;

    const sequence = `UD${String(nextNumber).padStart(3, "0")}`;
    nextNumber += 1;

    return { ...row, sequence };
  });
};

const getNextUserDefinedSequence = (rows = []) => {
  const nextNumber = rows.reduce((max, row) => {
    const match = String(row?.sequence || "").toUpperCase().match(/^UD(\d+)$/);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0) + 1;

  return `UD${String(nextNumber).padStart(3, "0")}`;
};

const createUserDefinedSummaryRow = (rows = []) => ({
  sequence: getNextUserDefinedSequence(rows),
  reconItem: "",
  docType: "",
  docNo: "",
  checkNo: "",
  checkDate: "",
  outDays: 0,
  debit: 0,
  credit: 0,
  perBank: 0,
  perBook: 0,
  variance: 0,
  mode: "ADD",
  stat: "",
});

const pickRowValue = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const documentViewConfig = {
  CV: { path: "/page/CV", param: "cvNo" },
  DS: { path: "/page/ARDS", param: "ardsNo" },
  AR: { path: "/page/AR", param: "arNo" },
  CR: { path: "/page/CR", param: "crNo" },
  JV: { path: "/page/JV", param: "jvNo" },
};

const hasViewableSourceDocument = (row, allowedDocCodes = []) => {
  const docCode = String(pickRowValue(row, ["docCode", "doc_code", "docType", "doc_type", "DOC_CODE", "DOC_TYPE"])).trim().toUpperCase();
  const docNo = pickRowValue(row, ["docNo", "doc_no", "documentNo", "document_no", "DOC_NO"]);

  return Boolean(
    docCode &&
      docNo &&
      documentViewConfig[docCode] &&
      (allowedDocCodes.length === 0 || allowedDocCodes.includes(docCode))
  );
};

const sanitizeFileName = (value) =>
  String(value || "export")
    .trim()
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .substring(0, 120) || "export";

const getDateTimeStamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
};

const keepViewBeforeLineNo = (columns = []) => {
  const priority = { view: 0, ln: 1 };
  return [...columns].sort((a, b) => {
    const aPriority = priority[a.key] ?? 2;
    const bPriority = priority[b.key] ?? 2;
    return aPriority - bPriority;
  });
};

const getSqlError = (payload) => {
  const data = asDataObject(payload);
  const row = Array.isArray(data) ? data[0] : data;
  const errorCount = Number(row?.errorCount ?? row?.errorcount ?? 0);
  const errorMsg = row?.errorMsg ?? row?.errormsg ?? "";

  return errorCount > 0 ? String(errorMsg || "Bank Recon request failed.") : "";
};

const normalizeStatusCode = (status) => {
  const s = String(status || "O/S").trim().toUpperCase();
  if (["O/S", "OS", "O\\S", "OUTSTANDING"].includes(s)) return "O/S";
  return s;
};

const isOutstandingStatus = (status) => normalizeStatusCode(status) === "O/S";

const statusClass = (status) => {
  const s = normalizeStatusCode(status);
  if (s === "CL") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "O/S") return "bg-slate-50 text-slate-700 border-slate-200";
  if (s === "REV") return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "S") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const getStatusLabel = (status) => {
  const s = normalizeStatusCode(status);
  if (s === "CL") return "Cleared";
  if (s === "O/S") return "Outstanding";
  if (s === "REV") return "Reversed";
  if (s === "S") return "S - Staled";
  if (s === "X") return "";
  return status || "";
};

const normalizeCheckRow = (row = {}) => {
  const status = normalizeStatusCode(row.status);

  return {
    ...row,
    status,
    clearDate: isOutstandingStatus(status) ? "" : row.clearDate,
  };
};

const getStickyViewStyle = (baseStyle = {}, { isHeader = false, isFooter = false, backgroundColor } = {}) => ({
  ...baseStyle,

  // Keep the View column fixed at the far-left side while horizontally scrolling.
  position: "sticky",
  left: 0,
  top: isHeader ? 0 : baseStyle.top,
  bottom: isFooter ? 0 : baseStyle.bottom,

  // Header/footer containers create their own stacking contexts, so keep body
  // View cells below those layers to avoid covering the header and total row.
  zIndex: isHeader ? 45 : isFooter ? 40 : 20,

  width: VIEW_COLUMN_WIDTH,
  minWidth: VIEW_COLUMN_WIDTH,
  maxWidth: VIEW_COLUMN_WIDTH,

  backgroundColor: backgroundColor || (isHeader ? "#dbeafe" : isFooter ? "#f1f5f9" : "#ffffff"),
  backgroundClip: "padding-box",
  borderRight: "1px solid rgba(148, 163, 184, 0.55)",
  boxShadow: "2px 0 4px rgba(15, 23, 42, 0.08)",
});

const splitEmailRecipients = (value = "") =>
  String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);

const invalidEmailRecipients = (value = "") => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return splitEmailRecipients(value).filter((email) => !emailRegex.test(email));
};

// =====================================================
// B. Reusable display components
// =====================================================

const Amount = ({ value, className = "" }) => (
  <span className={`tabular-nums ${className}`}>{formatNumber(normalizeNumber(value), 2)}</span>
);

const formatTableValue = (row, column) => {
  const value = row?.[column.key];
  if (column.renderType === "integer") return String(Math.trunc(normalizeNumber(value)));
  if (column.renderType === "number") return formatNumber(normalizeNumber(value), 2);
  if (column.renderType === "date") return toMMDDYYYY(value);
  return value ?? "";
};

const SummaryCard = ({ title, icon, accent = "text-blue-600", rows = [] }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-[12px] font-semibold tracking-[0.08em] uppercase text-blue-600">
      {icon && (
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[11px] ${accent}`}>
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      <span>{title}</span>
    </div>

    <div className="px-4 pb-3 space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center justify-between text-[12px] ${
            row.strong ? "font-bold pt-1 border-t border-slate-100" : ""
          }`}
        >
          <span className="text-slate-600 font-medium">{row.label}</span>
          <Amount value={row.value} className={row.valueClass || (row.strong ? "text-blue-700 font-extrabold" : "text-slate-900 font-semibold")} />
        </div>
      ))}
    </div>
  </div>
);

const ActionButton = ({
  children,
  icon,
  onClick,
  disabled = false,
  variant = "primary",
  title = "",
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-600",
    soft: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-600",
    danger: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-600",
    success: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-600",
    warning: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-600",
  };

  // =====================================================
  // I. Page layout and modal rendering
  // =====================================================

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-w-[36px] flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-1.5 text-[10px] font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-65 lg:h-8 lg:flex-row lg:gap-0 lg:px-3 lg:py-2 lg:text-xs ${variants[variant]}`}
    >
      {icon && <FontAwesomeIcon icon={icon} className="text-[12px]" />}
      {children && (
        <>
          <span className="block text-[8px] leading-none lg:hidden">{children}</span>
          <span className="hidden lg:inline lg:ml-2">{children}</span>
        </>
      )}
    </button>
  );
};


const PasswordConfirmationModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Please enter your password to continue.",
  confirmText = "Confirm",
  confirmClassName = "bg-blue-600 hover:bg-blue-700",
  onClose,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleCancel = () => {
    setPassword("");
    setShowPassword(false);
    onClose?.(null);
  };

  const handleSubmit = () => {
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      useSwalErrorAlert("Required Field", "Password is required.");
      return;
    }

    onClose?.({
      password: trimmedPassword,
    });

    setPassword("");
    setShowPassword(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between bg-white px-6 pb-2 pt-5">
          <h2 className="text-lg font-black tracking-tight text-gray-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-2">
          <div className="flex items-start gap-3 rounded-r-md border-l-4 border-blue-500 bg-blue-50 p-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V8a4 4 0 10-8 0v3m0 0h12m-12 0a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2"
              />
            </svg>
            <p className="text-sm font-medium leading-snug text-blue-800">
              {message}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") handleCancel();
                }}
                autoComplete="one-time-code"
                spellCheck={false}
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className={`rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm ${confirmClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// C. Main page component
// =====================================================

const BankReconProcessing1 = () => {
  const { companyInfo, currentUserRow } = useAuth();

  const [state, setState] = useState({
    bkId: "",
    branchCode: currentUserRow?.branchCode || "",
    cutOff: companyInfo?.cutoffCode || companyInfo?.cutOffCode || companyInfo?.cut_off || "",
    cutOffName: companyInfo?.cutoffName || companyInfo?.cutOffName || companyInfo?.cut_off_name || "",
    bankCode: "",
    acctNo: "",
    acctName: "",
    status: "OPEN",
    posted: false,
    activeTab: DEFAULT_ACTIVE_TAB,
    showActionMenu: false,
    isLoading: false,
    showSpinner: false,
    showBankModal: false,
    showCutoffModal: false,
    header: null,
    checkRows: [],
    receiptRows: [],
    journalRows: [],
    summaryRows: [],
    bankStmtRows: [],
    historyRows: [],
  });
  const [focusedSummaryCell, setFocusedSummaryCell] = useState(null);
  const [defaultClearDateOverride, setDefaultClearDateOverride] = useState("");
  const [showTableActionMenu, setShowTableActionMenu] = useState(false);
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const [columnChooserSearch, setColumnChooserSearch] = useState("");
  const [hiddenColumnsByTab, setHiddenColumnsByTab] = useState({});
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    title: "Export File",
    confirmText: "Export",
    defaultFileName: "",
    type: null,
  });
  const [passwordConfirmModal, setPasswordConfirmModal] = useState({
    isOpen: false,
    action: "",
    title: "",
    message: "",
    confirmText: "",
    confirmClassName: "bg-blue-600 hover:bg-blue-700",
  });
  const [showBankReconReportModal, setShowBankReconReportModal] = useState(false);
  const [isBankReconReportMaximized, setIsBankReconReportMaximized] = useState(false);
  const [showEmailReportModal, setShowEmailReportModal] = useState(false);
  const [isSendingEmailReport, setIsSendingEmailReport] = useState(false);
  const [summaryFieldLengths, setSummaryFieldLengths] = useState([]);

  const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));
  const actionMenuRef = useRef(null);
  const tableActionMenuRef = useRef(null);
  const reportPreviewRef = useRef(null);
  const hiddenReportPreviewRef = useRef(null);

  const {
    bkId,
    branchCode,
    cutOff,
    cutOffName,
    bankCode,
    acctNo,
    acctName,
    status,
    posted,
    activeTab,
    showActionMenu,
    isLoading,
    showSpinner,
    showBankModal,
    showCutoffModal,
    header,
    checkRows,
    receiptRows,
    journalRows,
    summaryRows,
    bankStmtRows,
    historyRows,
  } = state;

  useEffect(() => {
    let isMounted = true;

    const loadSummaryFieldLengths = async () => {
      try {
        const hdtblcol_result = await useFieldLenghtCheck("bk_summary_dt");

        if (isMounted && hdtblcol_result) {
          setSummaryFieldLengths(hdtblcol_result);
        }
      } catch (error) {
        console.error("Error fetching Bank Recon summary field lengths:", error);
      }
    };

    loadSummaryFieldLengths();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showActionMenu) return undefined;

    const handleClickOutsideActionMenu = (event) => {
      if (actionMenuRef.current?.contains(event.target)) return;
      updateState({ showActionMenu: false });
    };

    /*
      Use click instead of mousedown. With mousedown, React onClick can be skipped
      because the menu is removed before the selected action button fires.
    */
    document.addEventListener("click", handleClickOutsideActionMenu);

    return () => {
      document.removeEventListener("click", handleClickOutsideActionMenu);
    };
  }, [showActionMenu]);

  useEffect(() => {
    if (!showTableActionMenu) return undefined;

    const handleClickOutsideTableActionMenu = (event) => {
      if (tableActionMenuRef.current?.contains(event.target)) return;
      setShowTableActionMenu(false);
    };

    document.addEventListener("click", handleClickOutsideTableActionMenu);

    return () => {
      document.removeEventListener("click", handleClickOutsideTableActionMenu);
    };
  }, [showTableActionMenu]);

  const isPosted = posted || String(status || "").toUpperCase() === "POSTED";
  const bankReconDisplayStatus = isPosted ? "POSTED" : "OPEN";
  useEffect(() => {
    setDefaultClearDateOverride(getCutoffLastDay(cutOff));
  }, [cutOff]);

  const defaultClearDate = defaultClearDateOverride || getCutoffLastDay(cutOff);

  useEffect(() => {
    if (cutOff) return;

    const defaultCutOff = companyInfo?.cutoffCode || companyInfo?.cutOffCode || companyInfo?.cut_off || "";
    const defaultCutOffName = companyInfo?.cutoffName || companyInfo?.cutOffName || companyInfo?.cut_off_name || "";

    if (defaultCutOff || defaultCutOffName) {
      updateState({
        cutOff: defaultCutOff,
        cutOffName: defaultCutOffName,
      });
    }
  }, [companyInfo, cutOff]);
  const cutoffDateRange = useMemo(() => getCutoffDateRange(cutOff), [cutOff]);
  const cutoffMonthLabel = useMemo(() => formatCutoffMonth(cutOff), [cutOff]);

  const validateClearDateForCutoff = (dateValue) => {
    if (isDateWithinCutoff(dateValue, cutOff)) return true;

    useSwalErrorAlert(
      "Invalid Clear Date",
      `Clear Date must be within the selected Cut-Off ${cutOff} (${cutoffMonthLabel}).`
    );
    return false;
  };

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // =====================================================
  // D. API helpers
  // =====================================================

  const callBK = useCallback(
    async (mode, extra = {}) => {
      const jsonData = {
        bkId,
        branchCode,
        branch_code: branchCode,
        cutOff,
        bankCode,
        userCode: currentUserRow?.userCode || currentUserRow?.USER_CODE || "",
        userName: currentUserRow?.userName || currentUserRow?.USER_NAME || currentUserRow?.name || "",
        pcName: "WEB",
        macAddress: "",
        dt1: [],
        ...extra,
      };

      const response = await postRequest(ENDPOINT, {
        mode,
        params: {
          json_data: jsonData,
        },
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Bank Recon request failed.");
      }

      const sqlError = getSqlError(response);
      if (sqlError) {
        throw new Error(sqlError);
      }

      return asDataObject(response);
    },
    [bkId, branchCode, cutOff, bankCode, currentUserRow],
  );

  const callBKWithPassword = useCallback(
    async (endpoint, mode, extra = {}) => {
      const userCode = currentUserRow?.userCode || currentUserRow?.USER_CODE || "";
      const userName = currentUserRow?.userName || currentUserRow?.USER_NAME || currentUserRow?.name || "";
      const userPassword = extra.userPassword || extra.password || "";

      const jsonData = {
        bkId,
        branchCode,
        branch_code: branchCode,
        cutOff,
        bankCode,
        userCode,
        userName,
        pcName: "WEB",
        macAddress: "",
        dt1: [],
        ...extra,
      };

      /*
        Same credential payload pattern as useHandleCancel:
        - userPassword at root
        - userCode at root
        - json_data at root

        This is required by posting.credential middleware.
      */
      const response = await postRequest(endpoint, {
        userPassword,
        userCode,
        json_data: jsonData,
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Bank Recon request failed.");
      }

      const sqlError = getSqlError(response);
      if (sqlError) {
        throw new Error(sqlError);
      }

      return asDataObject(response);
    },
    [bkId, branchCode, cutOff, bankCode, currentUserRow],
  );


  const applyLoadedData = useCallback((data) => {
    const nextHeader = data?.header || {};
    const nextBkId = nextHeader?.bkId || data?.bkId || bkId || "";

    updateState({
      bkId: nextBkId,
      branchCode: nextHeader?.branchCode || nextHeader?.branch_code || branchCode || "",
      cutOff: nextHeader?.cutOff || cutOff || "",
      bankCode: nextHeader?.bankCode || bankCode || "",
      acctNo: nextHeader?.acctNo || acctNo || "",
      acctName: nextHeader?.acctName || acctName || "",
      status: nextHeader?.status || status || "OPEN",
      posted: Boolean(nextHeader?.posted),
      header: nextHeader,
      checkRows: toArray(data?.dt1).map(normalizeCheckRow),
      receiptRows: toArray(data?.dt2),
      journalRows: toArray(data?.dt3),
      summaryRows: toArray(data?.dt4),
      bankStmtRows: toArray(data?.dt5),
    });
  }, [acctName, acctNo, bankCode, bkId, branchCode, cutOff, status]);

  const validateHeader = () => {
    const missing = [];
    if (!cutOff) missing.push("- Cut-Off");
    if (!bankCode) missing.push("- Bank Code");

    if (missing.length > 0) {
      useSwalErrorAlert("Required Fields", `The following fields are required:\n${missing.join("\n")}`);
      return false;
    }

    return true;
  };

  // =====================================================
  // E. Load, Get, Reset, and detail editing handlers
  // =====================================================

  const handleLoad = async () => {
    if (!validateHeader()) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Load");
      applyLoadedData(data);
      updateState({ activeTab: "checks" });
      useSwalSuccessAlert("Loaded", "Bank reconciliation records loaded successfully.");
    } catch (error) {
      useSwalErrorAlert("Load Failed", error?.message || "Unable to load bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleGet = async (overrides = {}, options = {}) => {
    const nextCutOff = overrides.cutOff ?? cutOff;
    const nextBankCode = overrides.bankCode ?? bankCode;

    if (!nextCutOff || !nextBankCode) {
      const missing = [];
      if (!nextCutOff) missing.push("- Cut-Off");
      if (!nextBankCode) missing.push("- Bank Code");
      useSwalErrorAlert("Required Fields", `The following fields are required:\n${missing.join("\n")}`);
      return;
    }

    updateState({ isLoading: true });
    try {
      const data = await callBK("Get", overrides);
      if (!data || data?.result === null) {
        useSwalInfoAlert("No Records Found", "Bank reconciliation record does not exist.");
        return;
      }
      applyLoadedData(data);
      updateState({
        activeTab: options.activeTab || "checks",
        ...(overrides.bkId ? { bkId: overrides.bkId } : {}),
        ...(overrides.cutOff ? { cutOff: overrides.cutOff } : {}),
        ...(overrides.bankCode ? { bankCode: overrides.bankCode } : {}),
        ...(overrides.acctNo ? { acctNo: overrides.acctNo } : {}),
        ...(overrides.acctName ? { acctName: overrides.acctName } : {}),
      });
    } catch (error) {
      useSwalErrorAlert("Fetch Failed", error?.message || "Unable to fetch bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleReset = () => {
    updateState({
      bkId: "",
      cutOff: companyInfo?.cutoffCode || companyInfo?.cutOffCode || companyInfo?.cut_off || "",
      cutOffName: companyInfo?.cutoffName || companyInfo?.cutOffName || companyInfo?.cut_off_name || "",
      bankCode: "",
      acctNo: "",
      acctName: "",
      status: "OPEN",
      posted: false,
      activeTab: DEFAULT_ACTIVE_TAB,
      showActionMenu: false,
      header: null,
      checkRows: [],
      receiptRows: [],
      journalRows: [],
      summaryRows: [],
      bankStmtRows: [],
      historyRows: [],
    });
    setDefaultClearDateOverride("");
  };

  const handleCheckFieldChange = (index, field, value) => {
    if (field === "clearDate" && !validateClearDateForCutoff(value)) return;

    updateState({
      checkRows: checkRows.map((row, i) => {
        if (i !== index) return row;

        const next = { ...row, [field]: value };

        if (field === "selected") {
          const checked = Boolean(value);
          next.status = checked ? "CL" : "O/S";
          next.clearDate = checked ? row.clearDate || defaultClearDate : "";
        }

        if (field === "status") {
          const nextStatus = normalizeStatusCode(value);
          next.status = nextStatus;
          next.selected = nextStatus === "CL";
          next.clearDate = isOutstandingStatus(nextStatus) ? "" : row.clearDate || defaultClearDate;
        }

        return next;
      }),
    });
  };

  const handleDefaultClearDateChange = (value) => {
    const nextDate = toMMDDYYYY(value);
    if (!validateClearDateForCutoff(nextDate)) return;
    setDefaultClearDateOverride(nextDate);
  };

  const handleSelectAllChecks = (selected) => {
    updateState({
      checkRows: checkRows.map((row) => {
        const blocked = ["REV", "S", "X"].includes(String(row.status || "").toUpperCase()) || row.stat === "F";
        if (blocked) return row;

        return {
          ...row,
          selected,
          status: selected ? "CL" : "O/S",
          clearDate: selected ? row.clearDate || defaultClearDate : "",
        };
      }),
    });
  };

  const areAllSelectableChecksSelected = useMemo(() => {
    const selectableRows = checkRows.filter((row) =>
      !(["REV", "S", "X"].includes(String(row.status || "").toUpperCase()) || row.stat === "F")
    );

    return selectableRows.length > 0 && selectableRows.every((row) => Boolean(row.selected));
  }, [checkRows]);

  const handleToggleSelectAllChecks = () => {
    handleSelectAllChecks(!areAllSelectableChecksSelected);
  };

  const buildCheckSaveRows = () => checkRows.map((row) => ({
    bkCheckId: row.bkCheckId,
    tranId: row.tranId,
    selected: Boolean(row.selected),
    status: normalizeStatusCode(row.status),
    clearDate: isOutstandingStatus(row.status) ? null : row.clearDate || null,
    docType: row.docType,
    docNo: row.docNo,
    checkNo: row.checkNo,
    debit: normalizeNumber(row.debit),
    credit: normalizeNumber(row.credit),
  }));

  const validateCheckClearDates = () => {
    const invalidRowIndex = checkRows.findIndex((row) =>
      !isOutstandingStatus(row.status) && row.clearDate && !isDateWithinCutoff(row.clearDate, cutOff)
    );
    if (invalidRowIndex === -1) return true;

    useSwalErrorAlert(
      "Invalid Clear Date",
      `Line ${invalidRowIndex + 1} Clear Date must be within the selected Cut-Off ${cutOff} (${cutoffMonthLabel}).`
    );
    return false;
  };

  const saveChecks = async ({ silent = false, refresh = true } = {}) => {
    if (!validateCheckClearDates()) return null;

    const data = await callBK("SaveCheck", { dt1: buildCheckSaveRows() });
    const firstRow = Array.isArray(data) ? data[0] : data;

    if (!silent) {
      useSwalSuccessAlert(
        "Saved",
        firstRow?.message || data?.message || "Check and deposit records saved successfully."
      );
    }

    if (refresh) await handleGet();
    return data;
  };

  const handleSaveCheck = async () => {
    if (!validateHeader()) return;
    if (!bkId) {
      useSwalErrorAlert("No Record", "Please load records first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      await saveChecks();
    } catch (error) {
      useSwalErrorAlert("Save Failed", error?.message || "Unable to save check and deposit records.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleGenerateBankRecon = async () => {
    if (!validateHeader()) return;
    if (!bkId) {
      useSwalErrorAlert("No Record", "Please load records first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const saved = await saveChecks({ silent: true, refresh: false });
      if (!saved) return;

      const data = await callBK("GenerateBankRecon");
      const rows = Array.isArray(data) ? data : toArray(data);

      // After Generate, always move the user to Bank Recon Summary tab.
      updateState({ summaryRows: rows, activeTab: "summary" });

      // Keep the Summary tab active even after refreshing data from the database.
      await handleGet({}, { activeTab: "summary" });

      useSwalSuccessAlert("Generated", "Bank reconciliation summary generated successfully.");
    } catch (error) {
      useSwalErrorAlert("Generate Failed", error?.message || "Unable to generate bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleSummaryFieldChange = (index, field, value) => {
    updateState({
      summaryRows: summaryRows.map((row, i) => {
        if (i !== index) return row;
        if (field !== "perBank" && !isUserDefinedSummaryRow(row)) return row;

        const next = { ...row, [field]: value };
        if (["perBank", "perBook"].includes(field)) {
          next.variance = normalizeNumber(next.perBank) - normalizeNumber(next.perBook);
        }

        return next;
      }),
    });
  };

  const handleAddSummaryRow = (index = null) => {
    const newRow = createUserDefinedSummaryRow(summaryRows);
    const nextRows = [...summaryRows];

    if (Number.isInteger(index)) {
      nextRows.splice(index + 1, 0, newRow);
    } else {
      nextRows.push(newRow);
    }

    updateState({ summaryRows: renumberUserDefinedSummaryRows(nextRows), activeTab: "summary" });
  };

  const handleDeleteSummaryRow = (index) => {
    const row = summaryRows[index];
    if (!isUserDefinedSummaryRow(row)) return;

    const nextRows = [...summaryRows];
    nextRows.splice(index, 1);
    updateState({ summaryRows: renumberUserDefinedSummaryRows(nextRows) });
  };

  const handleSummaryNumberBlur = (index, field, renderType, value) => {
    const parsed = normalizeNumber(value);
    const formattedValue = renderType === "integer"
      ? String(Math.trunc(parsed))
      : formatNumber(parsed, 2);

    handleSummaryFieldChange(index, field, formattedValue);
    setFocusedSummaryCell(null);
  };

  const focusNextSummaryInput = (index, field) => {
    window.setTimeout(() => {
      const nextInput = document.getElementById(`summary-${field}-${index + 1}`);
      if (!nextInput) return;
      nextInput.focus();
      nextInput.select?.();
    }, 0);
  };

  const handleViewHistoryRow = async (row) => {
    if (!row) return;

    const selectedBkId = pickRowValue(row, ["bkId", "bkID", "bk_id", "BK_ID"]);
    const selectedCutOff = pickRowValue(row, ["cutOff", "cutoff", "cut_off", "CUT_OFF"], cutOff);
    const selectedBankCode = pickRowValue(row, ["bankCode", "bank_code", "BANK_CODE"], bankCode);
    const selectedAcctNo = pickRowValue(row, ["acctNo", "acct_no", "bankAcctNo", "bank_acct_no", "ACCT_NO"]);
    const selectedAcctName = pickRowValue(row, ["acctName", "acct_name", "bankAcctName", "bank_acct_name", "ACCT_NAME"]);

    if (!selectedBkId && (!selectedCutOff || !selectedBankCode)) {
      useSwalErrorAlert(
        "Unable to View",
        "Selected history row has no BK ID, Cut-Off, or Bank Code."
      );
      return;
    }

    updateState({
      bkId: selectedBkId,
      cutOff: selectedCutOff,
      bankCode: selectedBankCode,
      acctNo: selectedAcctNo,
      acctName: selectedAcctName,
    });

    await handleGet({
      bkId: selectedBkId,
      cutOff: selectedCutOff,
      bankCode: selectedBankCode,
      acctNo: selectedAcctNo,
      acctName: selectedAcctName,
    });
  };

  const handleSaveBankRecon = async () => {
    if (!validateHeader()) return;
    if (!bkId) {
      useSwalErrorAlert("No Record", "Please load records first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const dt1 = summaryRows.map((row) => ({
        tranId: row.tranId,
        sequence: row.sequence,
        reconItem: row.reconItem,
        docType: row.docType,
        docNo: row.docNo,
        checkNo: row.checkNo,
        checkDate: row.checkDate,
        outDays: normalizeNumber(row.outDays),
        debit: normalizeNumber(row.debit),
        credit: normalizeNumber(row.credit),
        perBank: normalizeNumber(row.perBank),
        perBook: normalizeNumber(row.perBook),
        mode: row.mode,
        stat: row.stat,
      }));

      const data = await callBK("SaveBankRecon", { dt1 });
      useSwalSuccessAlert("Saved", data?.message || "Bank reconciliation summary saved successfully.");
      await handleGet({}, { activeTab: activeTab === "summary" ? "summary" : "checks" });
    } catch (error) {
      useSwalErrorAlert("Save Failed", error?.message || "Unable to save bank reconciliation summary.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  // =====================================================
  // F. Posting, unposting, clear, and document actions
  // =====================================================

  const openPasswordConfirmModal = (config) => {
    setPasswordConfirmModal({
      isOpen: true,
      action: "",
      title: "",
      message: "",
      confirmText: "Confirm",
      confirmClassName: "bg-blue-600 hover:bg-blue-700",
      ...config,
    });
  };

  const closePasswordConfirmModal = () => {
    setPasswordConfirmModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const executePostBankRecon = async (password = "") => {
    updateState({ isLoading: true });
    try {
      const data = await callBKWithPassword("/bankRecon/post", "Post", { userPassword: password });
      useSwalSuccessAlert("Posted", data?.message || "Bank reconciliation posted successfully.");
      await handleGet();
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data || {};
      const code = data?.error || "";
      const message = data?.message || error?.message || "Unable to post bank reconciliation.";

      if (status === 422 && code === "INVALID_CREDENTIALS") {
        useSwalErrorAlert("Incorrect Password", "The password you entered is incorrect. Please try again.");
      } else if (status === 422 && code === "MISSING_CREDENTIALS") {
        useSwalErrorAlert("Password Required", "Please enter your password.");
      } else {
        useSwalErrorAlert("Post Failed", message);
      }
    } finally {
      updateState({ isLoading: false });
    }
  };

  const executeUnpostBankRecon = async (password = "") => {
    updateState({ isLoading: true });
    try {
      const data = await callBKWithPassword("/bankRecon/unpost", "Unpost", { userPassword: password });
      useSwalSuccessAlert("Unposted", data?.message || "Bank reconciliation unposted successfully.");
      await handleGet();
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data || {};
      const code = data?.error || "";
      const message = data?.message || error?.message || "Unable to unpost bank reconciliation.";

      if (status === 422 && code === "INVALID_CREDENTIALS") {
        useSwalErrorAlert("Incorrect Password", "The password you entered is incorrect. Please try again.");
      } else if (status === 422 && code === "MISSING_CREDENTIALS") {
        useSwalErrorAlert("Password Required", "Please enter your password.");
      } else {
        useSwalErrorAlert("Unpost Failed", message);
      }
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handlePasswordConfirmClose = async (result) => {
    const action = passwordConfirmModal.action;
    closePasswordConfirmModal();

    if (!result?.password) return;

    if (action === "Post") {
      await executePostBankRecon(result.password);
      return;
    }

    if (action === "Unpost") {
      await executeUnpostBankRecon(result.password);
    }
  };

  const handlePost = async () => {
    if (!validateHeader()) return;

    const reconcilingAmount = normalizeNumber(totals?.variance);
    if (Math.abs(reconcilingAmount) >= 0.01) {
      useSwalErrorAlert(
        "Cannot Post",
        `Reconciling Amount must be zero before posting. Current Reconciling Amount: ${formatNumber(reconcilingAmount, 2)}`
      );
      return;
    }

    openPasswordConfirmModal({
      action: "Post",
      title: "Post Bank Reconciliation?",
      message: "Posting will finalize the bank reconciliation and update source document clear dates. Enter your password to continue.",
      confirmText: "Post",
      confirmClassName: "bg-blue-600 hover:bg-blue-700",
    });
  };

  const handleUnpost = async () => {
    if (!validateHeader()) return;

    openPasswordConfirmModal({
      action: "Unpost",
      title: "Unpost Bank Reconciliation?",
      message: "This will reopen the bank reconciliation and clear source document bank recon flags. Enter your password to continue.",
      confirmText: "Unpost",
      confirmClassName: "bg-amber-600 hover:bg-amber-700",
    });
  };

  const handleClear = async () => {
    if (!validateHeader()) return;

    const result = await useSwalProceedConfirm(
      "Clear Bank Reconciliation?",
      "This will delete the current working details for this cut-off and bank."
    );

    if (!result?.isConfirmed) return;

    updateState({ isLoading: true });
    try {
      const data = await callBK("Clear");
      useSwalSuccessAlert("Cleared", data?.message || "Bank reconciliation cleared successfully.");
      await handleGet();
    } catch (error) {
      useSwalErrorAlert("Clear Failed", error?.message || "Unable to clear bank reconciliation.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleHistory = async () => {
    if (!cutOff) {
      useSwalErrorAlert("Required Fields", "Please select Cut-Off first.");
      return;
    }

    updateState({ isLoading: true });
    try {
      const data = await callBK("History", { bankCode: "" });
      updateState({ historyRows: toArray(data), activeTab: "history" });
    } catch (error) {
      useSwalErrorAlert("History Failed", error?.message || "Unable to load history.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleViewSourceDocument = (row, allowedDocCodes = []) => {
    const docCode = String(pickRowValue(row, ["docCode", "doc_code", "docType", "doc_type", "DOC_CODE", "DOC_TYPE"])).trim().toUpperCase();
    const docNo = pickRowValue(row, ["docNo", "doc_no", "documentNo", "document_no", "DOC_NO"]);
    const rowBranchCode = pickRowValue(row, ["branchCode", "branch_code", "BRANCH_CODE"], branchCode);
    const config = documentViewConfig[docCode];

    if (!config || (allowedDocCodes.length > 0 && !allowedDocCodes.includes(docCode))) {
      useSwalInfoAlert("View Document", `No view action is configured for ${docCode || "this document type"}.`);
      return;
    }

    if (!docNo || !rowBranchCode) {
      useSwalErrorAlert("Missing Keys", "Cannot determine document number or branch code.");
      return;
    }

    const url =
      `${window.location.origin}${config.path}` +
      `?${config.param}=${encodeURIComponent(docNo)}` +
      `&branchCode=${encodeURIComponent(rowBranchCode)}` +
      `&viewDocument=true`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleBankClose = (bank) => {
    updateState({ showBankModal: false });

    if (!bank) return;

    updateState({
      bankCode: bank.bankCode || "",
      acctNo: bank.bankAcctNo || bank.acctNo || "",
      acctName: bank.acctName || "",
      bkId: "",
      header: null,
      status: "OPEN",
      posted: false,
      checkRows: [],
      receiptRows: [],
      journalRows: [],
      summaryRows: [],
      bankStmtRows: [],
    });
  };

  const handleCutoffClose = (cutoff) => {
    updateState({ showCutoffModal: false });

    if (!cutoff) return;

    updateState({
      cutOff: cutoff.cutoffCode || "",
      cutOffName: cutoff.cutoffName || "",
      bkId: "",
      header: null,
      status: "OPEN",
      posted: false,
      checkRows: [],
      receiptRows: [],
      journalRows: [],
      summaryRows: [],
      bankStmtRows: [],
    });
  };

  const totals = useMemo(() => {
    const baseTotals = header || emptyTotals;
    if (checkRows.length === 0) return baseTotals;

    return {
      ...baseTotals,
      ...calculateCheckTotals(checkRows),
    };
  }, [checkRows, header]);

  const checkColumns = useMemo(
    () => [
      { key: "ln", label: "LN", renderType: "text", width: 70 },
      { key: "view", label: "View", renderType: "action", width: VIEW_COLUMN_WIDTH },
      { key: "selected", label: "Sel", renderType: "checkbox", width: 74 },
      { key: "status", label: "Status", renderType: "select", width: 150 },
      { key: "clearDate", label: "Clear Date", renderType: "dateInput", width: 140 },
      { key: "branchCode", label: "Branch", renderType: "text", width: 90 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 130 },
      { key: "docDate", label: "Document Date", renderType: "date", width: 130 },
      { key: "checkNo", label: "Check / DS No.", renderType: "text", width: 140 },
      { key: "checkDate", label: "Check / DS Date", renderType: "date", width: 140 },
      { key: "refCode", label: "Ref Code", renderType: "text", width: 130 },
      { key: "refName", label: "Ref Name", renderType: "text", width: 220 },
      { key: "particular", label: "Particular", renderType: "text", width: 300 },
      { key: "debit", label: "Debit", renderType: "number", width: 130 },
      { key: "credit", label: "Credit", renderType: "number", width: 130 },
    ],
    [],
  );

  const receiptColumns = useMemo(
    () => [
      { key: "ln", label: "LN", renderType: "text", width: 56 },
      { key: "view", label: "View", renderType: "action", width: VIEW_COLUMN_WIDTH },
      { key: "branchCode", label: "Branch", renderType: "text", width: 90 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 120 },
      { key: "docDate", label: "Document Date", renderType: "date", width: 130 },
      { key: "docAmt", label: "Amount", renderType: "number", width: 130 },
      { key: "refCode", label: "Customer Code", renderType: "text", width: 130 },
      { key: "refName", label: "Customer Name", renderType: "text", width: 220 },
      { key: "particular", label: "Particular", renderType: "text", width: 280 },
    ],
    [],
  );

  const journalColumns = useMemo(
    () => [
      { key: "ln", label: "LN", renderType: "text", width: 56 },
      { key: "view", label: "View", renderType: "action", width: VIEW_COLUMN_WIDTH },
      { key: "branchCode", label: "Branch", renderType: "text", width: 90 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 120 },
      { key: "docDate", label: "Document Date", renderType: "date", width: 130 },
      { key: "jvAmt", label: "JV Amount", renderType: "number", width: 130 },
      { key: "particular", label: "Particular", renderType: "text", width: 320 },
    ],
    [],
  );

  const summaryColumns = useMemo(
    () => [
      { key: "view", label: "View", renderType: "action", width: VIEW_COLUMN_WIDTH },
      { key: "ln", label: "LN", renderType: "text", width: 76 },
      { key: "sequence", label: "Seq", renderType: "text", width: 90 },
      { key: "reconItem", label: "Recon Item", renderType: "text", width: 320 },
      { key: "docType", label: "DT", renderType: "text", width: 70 },
      { key: "docNo", label: "Document No.", renderType: "text", width: 120 },
      { key: "checkNo", label: "Check No.", renderType: "text", width: 120 },
      { key: "checkDate", label: "Check Date", renderType: "date", width: 120 },
      { key: "outDays", label: "Days", renderType: "integer", width: 90 },
      { key: "debit", label: "Debit", renderType: "number", width: 130 },
      { key: "credit", label: "Credit", renderType: "number", width: 130 },
      { key: "perBank", label: "Per Bank", renderType: "number", width: 130 },
      { key: "perBook", label: "Per Book", renderType: "number", width: 130 },
      { key: "variance", label: "Variance", renderType: "number", width: 130 },
    ],
    [],
  );

  const bankStmtColumns = useMemo(
    () => [
      { key: "ln", label: "LN", renderType: "text", width: 56 },
      { key: "tranDate", label: "Date", renderType: "date", width: 120 },
      { key: "checkNo", label: "Check No.", renderType: "text", width: 120 },
      { key: "referenceNo", label: "Reference No.", renderType: "text", width: 150 },
      { key: "branch", label: "Branch", renderType: "text", width: 120 },
      { key: "tranCode", label: "Transaction Code", renderType: "text", width: 160 },
      { key: "tranDesc", label: "Description", renderType: "text", width: 260 },
      { key: "debit", label: "Debit", renderType: "number", width: 130 },
      { key: "credit", label: "Credit", renderType: "number", width: 130 },
      { key: "runningBalance", label: "Running Balance", renderType: "number", width: 150 },
      { key: "referenceCVNo", label: "Reference CV No.", renderType: "text", width: 160 },
    ],
    [],
  );

  const historyColumns = useMemo(
    () => [
      { key: "view", label: "View", renderType: "action", width: VIEW_COLUMN_WIDTH },
      { key: "ln", label: "LN", renderType: "text", width: 56 },
      { key: "cutOff", label: "Cut-Off", renderType: "text", width: 100 },
      { key: "bankCode", label: "Bank Code", renderType: "text", width: 110 },
      { key: "acctName", label: "Bank Account", renderType: "text", width: 260 },
      { key: "acctNo", label: "Account No.", renderType: "text", width: 150 },
      { key: "totalPerBank", label: "Per Bank", renderType: "number", width: 130 },
      { key: "totalPerBook", label: "Per Book", renderType: "number", width: 130 },
      { key: "variance", label: "Variance", renderType: "number", width: 130 },
      { key: "status", label: "Status", renderType: "text", width: 120 },
      { key: "preparedBy", label: "Prepared By", renderType: "text", width: 160 },
      { key: "dateStamp", label: "Date Prepared", renderType: "date", width: 130 },
    ],
    [],
  );

  const {
    getColumnStyle: getCheckColumnStyle,
    getFrozenColumnStyle: getCheckFrozenStyle,
    getOrderedColumns: getOrderedCheckColumns,
    getSortedRows: getSortedCheckRows,
    renderHeaderContextMenu: renderCheckHeaderContextMenu,
    renderResizableHeader: renderCheckHeader,
  } = useResizableTableColumns(checkColumns);
  const orderedCheckColumns = keepViewBeforeLineNo(getOrderedCheckColumns(checkColumns));
  const getCheckFallbackWidth = (key) => checkColumns.find((column) => column.key === key)?.width || 120;
  const getCheckCellStyle = (key, fallbackWidth) => ({
    ...getCheckColumnStyle(key, fallbackWidth),
    ...getCheckFrozenStyle(key, orderedCheckColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedCheckRows = getSortedCheckRows(
    checkRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const {
    getColumnStyle: getReceiptColumnStyle,
    getFrozenColumnStyle: getReceiptFrozenStyle,
    getOrderedColumns: getOrderedReceiptColumns,
    getSortedRows: getSortedReceiptRows,
    renderHeaderContextMenu: renderReceiptHeaderContextMenu,
    renderResizableHeader: renderReceiptHeader,
  } = useResizableTableColumns(receiptColumns);
  const orderedReceiptColumns = keepViewBeforeLineNo(getOrderedReceiptColumns(receiptColumns));
  const getReceiptFallbackWidth = (key) => receiptColumns.find((column) => column.key === key)?.width || 120;
  const getReceiptCellStyle = (key, fallbackWidth) => ({
    ...getReceiptColumnStyle(key, fallbackWidth),
    ...getReceiptFrozenStyle(key, orderedReceiptColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedReceiptRows = getSortedReceiptRows(
    receiptRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const {
    getColumnStyle: getJournalColumnStyle,
    getFrozenColumnStyle: getJournalFrozenStyle,
    getOrderedColumns: getOrderedJournalColumns,
    getSortedRows: getSortedJournalRows,
    renderHeaderContextMenu: renderJournalHeaderContextMenu,
    renderResizableHeader: renderJournalHeader,
  } = useResizableTableColumns(journalColumns);
  const orderedJournalColumns = keepViewBeforeLineNo(getOrderedJournalColumns(journalColumns));
  const getJournalFallbackWidth = (key) => journalColumns.find((column) => column.key === key)?.width || 120;
  const getJournalCellStyle = (key, fallbackWidth) => ({
    ...getJournalColumnStyle(key, fallbackWidth),
    ...getJournalFrozenStyle(key, orderedJournalColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedJournalRows = getSortedJournalRows(
    journalRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const {
    getColumnStyle: getSummaryColumnStyle,
    getFrozenColumnStyle: getSummaryFrozenStyle,
    getOrderedColumns: getOrderedSummaryColumns,
    getSortedRows: getSortedSummaryRows,
    renderHeaderContextMenu: renderSummaryHeaderContextMenu,
    renderResizableHeader: renderSummaryHeader,
  } = useResizableTableColumns(summaryColumns);
  const orderedSummaryColumns = keepViewBeforeLineNo(getOrderedSummaryColumns(summaryColumns));
  const getSummaryFallbackWidth = (key) => summaryColumns.find((column) => column.key === key)?.width || 120;
  const getSummaryCellStyle = (key, fallbackWidth) => ({
    ...getSummaryColumnStyle(key, fallbackWidth),
    ...getSummaryFrozenStyle(key, orderedSummaryColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedSummaryRows = getSortedSummaryRows(
    summaryRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const {
    getColumnStyle: getBankStmtColumnStyle,
    getFrozenColumnStyle: getBankStmtFrozenStyle,
    getOrderedColumns: getOrderedBankStmtColumns,
    getSortedRows: getSortedBankStmtRows,
    renderHeaderContextMenu: renderBankStmtHeaderContextMenu,
    renderResizableHeader: renderBankStmtHeader,
  } = useResizableTableColumns(bankStmtColumns);
  const orderedBankStmtColumns = getOrderedBankStmtColumns(bankStmtColumns);
  const getBankStmtFallbackWidth = (key) => bankStmtColumns.find((column) => column.key === key)?.width || 120;
  const getBankStmtCellStyle = (key, fallbackWidth) => ({
    ...getBankStmtColumnStyle(key, fallbackWidth),
    ...getBankStmtFrozenStyle(key, orderedBankStmtColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedBankStmtRows = getSortedBankStmtRows(
    bankStmtRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const {
    getColumnStyle: getHistoryColumnStyle,
    getFrozenColumnStyle: getHistoryFrozenStyle,
    getOrderedColumns: getOrderedHistoryColumns,
    getSortedRows: getSortedHistoryRows,
    renderHeaderContextMenu: renderHistoryHeaderContextMenu,
    renderResizableHeader: renderHistoryHeader,
  } = useResizableTableColumns(historyColumns);
  const orderedHistoryColumns = keepViewBeforeLineNo(getOrderedHistoryColumns(historyColumns));
  const getHistoryFallbackWidth = (key) => historyColumns.find((column) => column.key === key)?.width || 120;
  const getHistoryCellStyle = (key, fallbackWidth) => ({
    ...getHistoryColumnStyle(key, fallbackWidth),
    ...getHistoryFrozenStyle(key, orderedHistoryColumns, fallbackWidth, { isHeader: false }),
  });
  const sortedHistoryRows = getSortedHistoryRows(
    historyRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) => sortKey === "ln" ? entry.originalIndex + 1 : entry.row?.[sortKey] ?? "",
  );

  const tableConfigs = {
    bankstmt: { title: "Bank Statement", columns: orderedBankStmtColumns, rows: sortedBankStmtRows.map(({ row }) => row) },
    checks: { title: "Check Vouchers and Deposits", columns: orderedCheckColumns, rows: sortedCheckRows.map(({ row }) => row) },
    receipts: { title: "Undeposited Receipt", columns: orderedReceiptColumns, rows: sortedReceiptRows.map(({ row }) => row) },
    jv: { title: "Journal Voucher", columns: orderedJournalColumns, rows: sortedJournalRows.map(({ row }) => row) },
    summary: { title: "Bank Recon Summary", columns: orderedSummaryColumns, rows: sortedSummaryRows.map(({ row }) => row) },
    history: { title: "History", columns: orderedHistoryColumns, rows: sortedHistoryRows.map(({ row }) => row) },
  };
  const activeTableConfig = tableConfigs[activeTab] || tableConfigs.bankstmt;
  const activeHiddenColumns = hiddenColumnsByTab[activeTab] || [];
  const activeTableHasRows = activeTableConfig.rows.length > 0;
  const exportAllHasRows = checkRows.length > 0 || receiptRows.length > 0 || journalRows.length > 0 || summaryRows.length > 0;
  const hasBankReconSummaryRows = summaryRows.length > 0;
  const canPostOrClearBankRecon = bankReconDisplayStatus === "OPEN" && hasBankReconSummaryRows;
  const hasReconVariance = Math.abs(normalizeNumber(totals.variance)) >= 0.01;
  const summaryFieldLengthMap = useMemo(
    () => ({
      reconItem: useGetFieldLength(summaryFieldLengths, "recon_item") || undefined,
      checkNo: useGetFieldLength(summaryFieldLengths, "check_no") || undefined,
      docNo: useGetFieldLength(summaryFieldLengths, "doc_no") || undefined,
      docType: useGetFieldLength(summaryFieldLengths, "doc_type") || undefined,
    }),
    [summaryFieldLengths]
  );
  const activeChooserColumns = activeTableConfig.columns.filter((column) => !["ln", "view"].includes(column.key));
  const filteredChooserColumns = activeChooserColumns.filter((column) => {
    const q = columnChooserSearch.trim().toLowerCase();
    if (!q) return true;
    return `${column.label || ""} ${column.key || ""}`.toLowerCase().includes(q);
  });

  const toggleActiveColumnVisibility = (key, checked) => {
    setHiddenColumnsByTab((prev) => {
      const current = prev[activeTab] || [];
      const next = checked ? current.filter((columnKey) => columnKey !== key) : [...new Set([...current, key])];
      return { ...prev, [activeTab]: next };
    });
  };

  // =====================================================
  // G. Export, report preview, PDF/Excel, and email helpers
  // =====================================================

  const getActiveExportColumns = () =>
    activeTableConfig.columns.filter((column) => !activeHiddenColumns.includes(column.key) && column.key !== "view");

  const getActiveExportRows = () =>
    activeTableConfig.rows.map((row, index) => ({ ...row, ln: index + 1 }));

  const getExportAllDefaultFileName = () =>
    sanitizeFileName(
      [
        "Bank Reconciliation",
        bankCode,
        acctName || acctNo,
        cutOffName || cutOff,
      ].filter(Boolean).join(" ")
    );

  const openExportModal = (type) => {
    if (type === "excel_all") {
      if (!exportAllHasRows) return;
    } else if (!activeTableHasRows) {
      return;
    }

    const titleMap = {
      excel_all: "Export All",
      excel: "Export Excel",
      pdf: "Export PDF",
      csv: "Export CSV",
    };

    setShowTableActionMenu(false);
    updateState({ showActionMenu: false });
    setExportModal({
      isOpen: true,
      title: titleMap[type] || "Export File",
      confirmText: "Export",
      defaultFileName: type === "excel_all"
        ? getExportAllDefaultFileName()
        : sanitizeFileName(`${activeTableConfig.title} ${getDateTimeStamp()}`),
      type,
    });
  };

  const closeExportModal = () => {
    setExportModal({
      isOpen: false,
      title: "Export File",
      confirmText: "Export",
      defaultFileName: "",
      type: null,
    });
  };

  const exportActiveTableCsv = async (safeFileName) => {
    const exportColumns = getActiveExportColumns();
    const exportRows = getActiveExportRows();
    const csvRows = [
      exportColumns.map((column) => `"${String(column.label || column.key).replace(/"/g, '""')}"`).join(","),
      ...exportRows.map((row) =>
        exportColumns
          .map((column) => {
            const value = formatTableValue(row, column);
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${safeFileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportActiveTableExcel = async (safeFileName) => {
    const exportColumns = getActiveExportColumns();
    const exportRows = getActiveExportRows();
    await exportGenericQueryExcel(
      exportRows,
      {},
      exportColumns,
      [],
      activeTableConfig.columns,
      {},
      7,
      safeFileName,
      currentUserRow?.userName,
      companyInfo?.compName,
      companyInfo?.compAddr,
      companyInfo?.telNo,
      activeTableConfig.title,
    );
  };

  const buildBankReconExcelReportData = (safeFileName = "") => {
    const reportName = safeFileName || getExportAllDefaultFileName();
    const sheetConfigs = [
      {
        sheetName: "Check Voucher and Deposit",
        columns: orderedCheckColumns
          .filter((column) => !["view", "selected"].includes(column.key))
          .map((column) => column.key === "clearDate" ? { ...column, renderType: "date" } : column),
        rows: sortedCheckRows.map(({ row }) => ({
          ...row,
          clearDate: isOutstandingStatus(row.status) ? "" : toMMDDYYYY(row.clearDate),
        })),
      },
      {
        sheetName: "Undeposited Receipt",
        columns: orderedReceiptColumns.filter((column) => column.key !== "view"),
        rows: sortedReceiptRows.map(({ row }) => row),
      },
      {
        sheetName: "Journal Voucher",
        columns: orderedJournalColumns.filter((column) => column.key !== "view"),
        rows: sortedJournalRows.map(({ row }) => row),
      },
      {
        sheetName: "Bank Recon Summary",
        columns: orderedSummaryColumns.filter((column) => column.key !== "view"),
        rows: sortedSummaryRows.map(({ row }) => row),
      },
    ];

    const jsonData = { Data: {} };
    const columnConfigsMap = {};

    sheetConfigs.forEach((sheet) => {
      jsonData.Data[sheet.sheetName] = sheet.rows.map((row, index) => ({ ...row, ln: index + 1 }));
      columnConfigsMap[sheet.sheetName] = sheet.columns;
    });

    const reportPayload = {
      ReportName: reportName,
      UserCode: currentUserRow?.userName || currentUserRow?.userCode || "",
      Branch: branchCode,
      JsonData: jsonData,
      companyName: companyInfo?.compName,
      companyAddress: companyInfo?.compAddr,
      companyTelNo: companyInfo?.telNo,
    };

    return {
      reportName,
      sheetConfigs,
      jsonData,
      columnConfigsMap,
      reportPayload,
    };
  };

  const exportAllBankReconExcel = async (safeFileName) => {
    const { reportPayload, columnConfigsMap } = buildBankReconExcelReportData(safeFileName);

    await exportGenericHistoryExcel(
      reportPayload,
      columnConfigsMap,
      []
    );
  };

  const exportActiveTablePdf = async (safeFileName) => {
    const exportColumns = getActiveExportColumns();
    const exportRows = getActiveExportRows();
    const pdf = new jsPDF("l", "mm", "a4");
    const margin = 8;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const rowHeight = 5;
    const colWidth = usableWidth / Math.max(exportColumns.length, 1);
    let y = 12;

    const drawHeader = () => {
      pdf.setFontSize(10);
      pdf.text(activeTableConfig.title, margin, y);
      y += 7;
      pdf.setFontSize(6);
      pdf.setFillColor(235, 241, 255);
      exportColumns.forEach((column, index) => {
        const x = margin + index * colWidth;
        pdf.rect(x, y - 3.5, colWidth, rowHeight, "F");
        pdf.text(String(column.label || column.key), x + 1, y);
      });
      y += rowHeight;
    };

    drawHeader();

    exportRows.forEach((row) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = 12;
        drawHeader();
      }

      exportColumns.forEach((column, colIndex) => {
        const value = formatTableValue(row, column);
        const text = pdf.splitTextToSize(String(value ?? ""), colWidth - 2)[0] || "";
        pdf.text(text, margin + colIndex * colWidth + 1, y);
      });
      y += rowHeight;
    });

    pdf.save(`${safeFileName}.pdf`);
  };

  const handleExportConfirm = async (enteredFileName) => {
    const safeFileName = sanitizeFileName(enteredFileName);
    if (!safeFileName) return;

    try {
      if (exportModal.type === "excel_all") {
        await exportAllBankReconExcel(safeFileName);
      } else if (exportModal.type === "excel") {
        await exportActiveTableExcel(safeFileName);
      } else if (exportModal.type === "pdf") {
        await exportActiveTablePdf(safeFileName);
      } else if (exportModal.type === "csv") {
        await exportActiveTableCsv(safeFileName);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Export failed",
        text: error?.message || "Unable to export file.",
      });
    } finally {
      closeExportModal();
    }
  };

  const reportPeriodLabel = useMemo(() => formatCutoffMonth(cutOff), [cutOff]);

  const getReportRowsByType = useCallback(() => {
    const normalizedCheckRows = checkRows.map(normalizeCheckRow);

    const outstandingChecks = normalizedCheckRows.filter((row) =>
      isOutstandingStatus(row.status) && normalizeNumber(row.credit) > 0
    );

    const depositsInTransit = normalizedCheckRows.filter((row) =>
      isOutstandingStatus(row.status) && normalizeNumber(row.debit) > 0
    );

    const clearedChecksAndDeposits = normalizedCheckRows.filter((row) =>
      normalizeStatusCode(row.status) === "CL"
    );

    const bankAdjustments = summaryRows.filter((row) => {
      const item = String(row.reconItem || "").toUpperCase();
      return item.includes("BANK") || item.includes("SERVICE") || item.includes("CHARGE") || item.includes("INTEREST");
    });

    const bookAdjustments = [
      ...receiptRows.map((row) => ({ ...row, source: "Undeposited Receipt" })),
      ...journalRows.map((row) => ({ ...row, source: "Journal Voucher" })),
    ];

    return {
      outstandingChecks,
      depositsInTransit,
      clearedChecksAndDeposits,
      bankAdjustments,
      bookAdjustments,
    };
  }, [checkRows, summaryRows, receiptRows, journalRows]);

  const formatReportAmount = (value) => formatNumber(normalizeNumber(value), 2);
  const reportRowsByType = useMemo(() => getReportRowsByType(), [getReportRowsByType]);

  // Report Preview must show the complete outstanding lists, not only first 10 rows.
  const outstandingCheckReportRows = useMemo(
    () => reportRowsByType.outstandingChecks,
    [reportRowsByType]
  );
  const outstandingDepositReportRows = useMemo(
    () => reportRowsByType.depositsInTransit,
    [reportRowsByType]
  );
  const outstandingCheckReportTotal = useMemo(
    () => outstandingCheckReportRows.reduce((sum, row) => sum + normalizeNumber(row.credit), 0),
    [outstandingCheckReportRows]
  );
  const outstandingDepositReportTotal = useMemo(
    () => outstandingDepositReportRows.reduce((sum, row) => sum + normalizeNumber(row.debit), 0),
    [outstandingDepositReportRows]
  );

  const buildReportHtml = useCallback(() => {
    const {
      outstandingChecks,
      depositsInTransit,
      clearedChecksAndDeposits,
      bankAdjustments,
      bookAdjustments,
    } = getReportRowsByType();

    const printDate = new Date().toLocaleString("en-US");
    const preparedBy = currentUserRow?.userName || currentUserRow?.USER_NAME || currentUserRow?.name || currentUserRow?.userCode || "";
    const companyName = companyInfo?.compName || companyInfo?.companyName || "NAYSA Financials";
    const companyAddress = companyInfo?.compAddr || companyInfo?.companyAddress || "";
    const bankTitle = [bankCode, acctName].filter(Boolean).join(" - ");
    const accountTitle = acctNo ? `Account No.: ${acctNo}` : "";

    const rowHtml = (rows, type = "check") => {
      if (!rows.length) {
        return `<tr><td colspan="8" class="empty">No records found.</td></tr>`;
      }

      return rows.map((row, index) => {
        const amount = type === "book"
          ? normalizeNumber(row.docAmt || row.jvAmt || row.amount || row.debit || row.credit)
          : Math.max(normalizeNumber(row.debit), normalizeNumber(row.credit));

        return `
          <tr>
            <td class="center">${index + 1}</td>
            <td>${row.docType || row.source || ""}</td>
            <td>${row.docNo || ""}</td>
            <td>${toMMDDYYYY(row.docDate || row.checkDate || row.tranDate || "")}</td>
            <td>${row.checkNo || ""}</td>
            <td>${row.refName || row.custName || row.particular || row.reconItem || ""}</td>
            <td class="right">${formatReportAmount(amount)}</td>
            <td class="center">${type === "check" ? getStatusLabel(row.status) : ""}</td>
          </tr>
        `;
      }).join("");
    };

    const rowsTotalAmount = (rows, type = "check") =>
      rows.reduce((sum, row) => {
        const amount = type === "book"
          ? normalizeNumber(row.docAmt || row.jvAmt || row.amount || row.debit || row.credit)
          : Math.max(normalizeNumber(row.debit), normalizeNumber(row.credit));

        return sum + amount;
      }, 0);

    const detailTotalRow = (rows, type = "check") => rows.length ? `
      <tr class="total-row">
        <td colspan="6" class="right">Total Amount</td>
        <td class="right">${formatReportAmount(rowsTotalAmount(rows, type))}</td>
        <td></td>
      </tr>
    ` : "";

    const summaryRow = (label, value, isTotal = false) => `
      <tr class="${isTotal ? "total-row" : ""}">
        <td>${label}</td>
        <td class="right">${formatReportAmount(value)}</td>
      </tr>
    `;

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bank Reconciliation Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Aptos, "Aptos Display", "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
    .report { width: 100%; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 12px; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-bottom: 10px; }
    .company { font-size: 16px; font-weight: 800; color: #1e3a8a; }
    .address { margin-top: 2px; color: #475569; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 18px; color: #0f172a; }
    .title div { margin-top: 3px; color: #475569; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }
    .info-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; min-height: 42px; }
    .info-label { color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
    .info-value { margin-top: 3px; font-size: 12px; font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
    .card { border: 1px solid #cbd5e1; border-radius: 7px; overflow: hidden; }
    .card-title { background: #eff6ff; color: #1d4ed8; padding: 6px 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; font-size: 10px; }
    table { border-collapse: collapse; width: 100%; }
    .card td { padding: 5px 8px; border-top: 1px solid #e2e8f0; }
    .right { text-align: right; }
    .center { text-align: center; }
    .total-row td { font-weight: 800; border-top: 2px solid #94a3b8; background: #f8fafc; }
    .proof { border: 1px solid ${Math.abs(normalizeNumber(totals.variance)) < 0.01 ? "#86efac" : "#fca5a5"}; background: ${Math.abs(normalizeNumber(totals.variance)) < 0.01 ? "#f0fdf4" : "#fff1f2"}; border-radius: 7px; padding: 8px; margin-bottom: 10px; }
    .proof-title { font-weight: 800; color: ${Math.abs(normalizeNumber(totals.variance)) < 0.01 ? "#047857" : "#be123c"}; }
    .section { margin-top: 10px; page-break-inside: avoid; }
    .section h2 { margin: 0; padding: 6px 8px; background: #1d4ed8; color: white; font-size: 11px; border-radius: 6px 6px 0 0; }
    .detail-table th { background: #dbeafe; color: #0f172a; font-size: 10px; padding: 6px; border: 1px solid #bfdbfe; text-align: left; }
    .detail-table td { padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
    .detail-table tr:nth-child(even) td { background: #f8fafc; }
    .empty { text-align: center; color: #64748b; padding: 12px !important; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 28px; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #334155; padding-top: 5px; text-align: center; font-weight: 700; }
    .sig-label { margin-top: 3px; text-align: center; color: #64748b; font-size: 10px; }
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <div>
        <div class="company">${companyName}</div>
        <div class="address">${companyAddress}</div>
      </div>
      <div class="title">
        <h1>Bank Reconciliation Report</h1>
        <div>For the period ended ${reportPeriodLabel}</div>
        <div>Printed: ${printDate}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="info-label">Bank Account</div><div class="info-value">${bankTitle || "-"}</div></div>
      <div class="info-box"><div class="info-label">Account No.</div><div class="info-value">${accountTitle || "-"}</div></div>
      <div class="info-box"><div class="info-label">Cut-Off</div><div class="info-value">${cutOff} ${cutOffName ? `- ${cutOffName}` : ""}</div></div>
      <div class="info-box"><div class="info-label">Status</div><div class="info-value">${bankReconDisplayStatus}</div></div>
    </div>

    <div class="summary-grid">
      <div class="card">
        <div class="card-title">Bank Side</div>
        <table>
          ${summaryRow("Balance per Bank", totals.totalPerBank)}
          ${summaryRow("Add: Deposits in Transit", totals.totalDepositOS)}
          ${summaryRow("Less: Outstanding Checks", -Math.abs(normalizeNumber(totals.totalDisbOS)))}
          ${summaryRow("Adjusted Bank Balance", normalizeNumber(totals.totalPerBank) + normalizeNumber(totals.totalDepositOS) - normalizeNumber(totals.totalDisbOS), true)}
        </table>
      </div>

      <div class="card">
        <div class="card-title">Book Side</div>
        <table>
          ${summaryRow("Balance per Book", totals.totalPerBook)}
          ${summaryRow("Bank / Book Adjustments", totals.totalAdjustment)}
          ${summaryRow("Undeposited / In-Transit", totals.totalUndeposit)}
          ${summaryRow("Adjusted Book Balance", totals.totalPerBook, true)}
        </table>
      </div>

      <div class="card">
        <div class="card-title">Cleared / Outstanding Totals</div>
        <table>
          ${summaryRow("Cleared Deposits", totals.totalDepositCL)}
          ${summaryRow("Outstanding Deposits", totals.totalDepositOS)}
          ${summaryRow("Cleared Disbursements", totals.totalDisbCL)}
          ${summaryRow("Outstanding Checks", totals.totalDisbOS)}
          ${summaryRow("Reconciling Difference", totals.variance, true)}
        </table>
      </div>
    </div>

    <div class="proof">
      <div class="proof-title">Reconciliation Proof</div>
      <div>Adjusted balances should agree. Current reconciling difference: <strong>${formatReportAmount(totals.variance)}</strong></div>
    </div>

    <div class="section">
      <h2>Outstanding Checks</h2>
      <table class="detail-table">
        <thead><tr><th>No.</th><th>Type</th><th>Document No.</th><th>Date</th><th>Check No.</th><th>Payee / Particular</th><th class="right">Amount</th><th>Status</th></tr></thead>
        <tbody>${rowHtml(outstandingChecks, "check")}${detailTotalRow(outstandingChecks, "check")}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Deposits in Transit</h2>
      <table class="detail-table">
        <thead><tr><th>No.</th><th>Type</th><th>Document No.</th><th>Date</th><th>Ref No.</th><th>Customer / Particular</th><th class="right">Amount</th><th>Status</th></tr></thead>
        <tbody>${rowHtml(depositsInTransit, "check")}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Cleared Checks and Deposits</h2>
      <table class="detail-table">
        <thead><tr><th>No.</th><th>Type</th><th>Document No.</th><th>Date</th><th>Check / DS No.</th><th>Name / Particular</th><th class="right">Amount</th><th>Status</th></tr></thead>
        <tbody>${rowHtml(clearedChecksAndDeposits, "check")}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Bank Recon Summary / Adjustments</h2>
      <table class="detail-table">
        <thead><tr><th>No.</th><th>Seq</th><th>Recon Item</th><th>Doc Type</th><th>Doc No.</th><th>Check No.</th><th class="right">Per Bank</th><th class="right">Per Book</th></tr></thead>
        <tbody>
          ${summaryRows.length ? summaryRows.map((row, index) => `
            <tr>
              <td class="center">${index + 1}</td>
              <td>${row.sequence || ""}</td>
              <td>${row.reconItem || ""}</td>
              <td>${row.docType || ""}</td>
              <td>${row.docNo || ""}</td>
              <td>${row.checkNo || ""}</td>
              <td class="right">${formatReportAmount(row.perBank)}</td>
              <td class="right">${formatReportAmount(row.perBook)}</td>
            </tr>
          `).join("") : `<tr><td colspan="8" class="empty">No records found.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Book Adjustments / Supporting Transactions</h2>
      <table class="detail-table">
        <thead><tr><th>No.</th><th>Source</th><th>Document No.</th><th>Date</th><th>Reference</th><th>Particular</th><th class="right">Amount</th><th></th></tr></thead>
        <tbody>${rowHtml(bookAdjustments, "book")}</tbody>
      </table>
    </div>

    <div class="signatures">
      <div><div class="sig-line">${preparedBy || "&nbsp;"}</div><div class="sig-label">Prepared By</div></div>
      <div><div class="sig-line">&nbsp;</div><div class="sig-label">Reviewed By</div></div>
      <div><div class="sig-line">&nbsp;</div><div class="sig-label">Approved By</div></div>
    </div>
  </div>
</body>
</html>
    `;
  }, [
    getReportRowsByType,
    currentUserRow,
    companyInfo,
    bankCode,
    acctName,
    acctNo,
    cutOff,
    cutOffName,
    bankReconDisplayStatus,
    reportPeriodLabel,
    totals,
    summaryRows,
  ]);

  const createPdfBlobFromReportHtml = useCallback(async ({
    scale = 1.8,
    imageQuality = 0.94,
    imageCompression = "SLOW",
    imageType = "JPEG",
  } = {}) => {
    /*
      Capture the exact Bank Reconciliation Report Preview DOM and fit it into
      one PDF page. The detailed outstanding list is intentionally not shown in
      the preview/PDF so the complete footer/signature section fits cleanly.

      Important:
      Use the visible preview first and capture the real rendered height,
      including the Prepared/Reviewed/Approved footer.
    */
    const sourceElement = reportPreviewRef?.current || hiddenReportPreviewRef?.current;

    if (!sourceElement) {
      throw new Error("Bank Reconciliation Report Preview content was not found.");
    }

    await document.fonts?.ready;
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

    const previousInlineStyles = {
      backgroundColor: sourceElement.style.backgroundColor,
      borderRadius: sourceElement.style.borderRadius,
      boxShadow: sourceElement.style.boxShadow,
      overflow: sourceElement.style.overflow,
      paddingBottom: sourceElement.style.paddingBottom,
    };

    sourceElement.style.backgroundColor = "#ffffff";
    sourceElement.style.borderRadius = "0";
    sourceElement.style.boxShadow = "none";
    sourceElement.style.overflow = "visible";
    sourceElement.style.paddingBottom = "56px";

    const rect = sourceElement.getBoundingClientRect();
    const footerElement = sourceElement.querySelector(".bank-recon-report-footer");
    const footerBottom = footerElement
      ? footerElement.offsetTop + footerElement.offsetHeight
      : 0;

    /*
      Use the actual bottom of the footer as part of the capture height.
      Some browsers return a scrollHeight that does not fully include the
      footer's lower content after temporary style changes.
    */
    const captureWidth = Math.ceil(Math.max(sourceElement.scrollWidth, rect.width));
    const captureHeight = Math.ceil(
      Math.max(
        sourceElement.scrollHeight,
        rect.height,
        footerBottom
      )
    ) + 56;

    let canvas;

    try {
      canvas = await html2canvas(sourceElement, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        removeContainer: true,
        logging: false,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
      });
    } finally {
      sourceElement.style.backgroundColor = previousInlineStyles.backgroundColor;
      sourceElement.style.borderRadius = previousInlineStyles.borderRadius;
      sourceElement.style.boxShadow = previousInlineStyles.boxShadow;
      sourceElement.style.overflow = previousInlineStyles.overflow;
      sourceElement.style.paddingBottom = previousInlineStyles.paddingBottom;
    }

    if (!canvas.width || !canvas.height) {
      throw new Error("Bank Reconciliation Report Preview capture is empty.");
    }

    const pdf = new jsPDF("l", "mm", "a4", true);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    /*
      Small margin gives more vertical room so the full footer/signature block
      stays visible on the one-page PDF.
    */
    const margin = 3;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const naturalHeight = (canvas.height * maxWidth) / canvas.width;
    const fitScale = Math.min(1, maxHeight / naturalHeight);
    const imgWidth = maxWidth * fitScale;
    const imgHeight = naturalHeight * fitScale;
    const x = (pageWidth - imgWidth) / 2;
    const y = margin;

    const normalizedImageType = String(imageType || "JPEG").toUpperCase() === "PNG" ? "PNG" : "JPEG";
    const imgData = normalizedImageType === "PNG"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", imageQuality);

    if (normalizedImageType === "PNG") {
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    } else {
      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight, undefined, imageCompression);
    }

    return pdf.output("blob");
  }, []);

  const handlePrintBankReconReport = useCallback(() => {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!reportWindow) {
      useSwalErrorAlert("Popup Blocked", "Please allow popups to print the Bank Reconciliation report.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(buildReportHtml());
    reportWindow.document.close();
    reportWindow.focus();

    window.setTimeout(() => {
      reportWindow.print();
    }, 500);
  }, [buildReportHtml]);

  const handleDownloadBankReconReportPdf = useCallback(async () => {
    /*
      Manual PDF export must match the one-page Report Preview clarity.
      Use high-resolution PNG capture and show the global LoadingSpinner while waiting.
    */
    updateState({ isLoading: true });

    try {
      const reportName = sanitizeFileName(`Bank Reconciliation ${bankCode} ${cutOff}`);
      const pdfBlob = await createPdfBlobFromReportHtml({
        scale: Math.min((window.devicePixelRatio || 2) * 1.75, 4),
        imageType: "PNG",
        imageQuality: 1,
        imageCompression: "SLOW",
      });
      const link = document.createElement("a");

      link.href = URL.createObjectURL(pdfBlob);
      link.download = `${reportName}.pdf`;
      link.click();

      URL.revokeObjectURL(link.href);
    } catch (error) {
      useSwalErrorAlert("PDF Failed", error?.message || "Unable to generate Bank Reconciliation PDF.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [bankCode, cutOff, createPdfBlobFromReportHtml]);


  const getBankReconReportFileName = (extension = "") =>
    sanitizeFileName(`Bank Reconciliation ${bankCode} ${cutOff}`) + extension;

  const capturePdfDownloadBlob = useCallback(async (downloadCallback) => {
    let capturedBlob = null;

    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
    const originalCreateElement = document.createElement.bind(document);

    URL.createObjectURL = (object) => {
      if (object instanceof Blob) {
        capturedBlob = object;
      }

      return originalCreateObjectURL(object);
    };

    /*
      handleDownloadBankReconReportPdf normally creates an <a> tag and triggers
      click() to download the PDF. For email attachment, use the exact same
      download flow, but suppress only the temporary anchor click.
    */
    document.createElement = (...args) => {
      const element = originalCreateElement(...args);
      const tagName = String(args?.[0] || "").toLowerCase();

      if (tagName === "a") {
        element.click = () => {};
      }

      return element;
    };

    try {
      await downloadCallback();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.createElement = originalCreateElement;
    }

    if (!capturedBlob) {
      throw new Error("Unable to capture the PDF report generated by Download PDF.");
    }

    return capturedBlob;
  }, []);

  const createBankReconReportPdfBlob = useCallback(async () => {
    return await createPdfBlobFromReportHtml({
      scale: 1.25,
      imageType: "JPEG",
      imageQuality: 0.78,
      imageCompression: "MEDIUM",
    });
  }, [createPdfBlobFromReportHtml]);


  const stripBomAndValidateExcelBlob = async (blob) => {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length === 0) {
      throw new Error("Exported Excel file is empty.");
    }

    /*
      Some export responses may contain UTF-8 BOM before the XLSX zip signature.
      XLSX must start with PK. If BOM is left in the attachment, Excel may say
      the workbook is corrupted or needs repair.
    */
    let startIndex = 0;
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      startIndex = 3;
    }

    const firstByte = bytes[startIndex];
    const secondByte = bytes[startIndex + 1];

    if (firstByte === 0x7b || firstByte === 0x5b || firstByte === 0x3c) {
      const responseText = new TextDecoder().decode(bytes);
      throw new Error(responseText.slice(0, 500) || "Export endpoint returned text instead of an Excel file.");
    }

    if (firstByte !== 0x50 || secondByte !== 0x4b) {
      throw new Error("Export endpoint did not return a valid XLSX file.");
    }

    const cleanBytes = startIndex > 0 ? bytes.slice(startIndex) : bytes;

    return new Blob([cleanBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  };

  const captureExcelDownloadBlob = useCallback(async (downloadCallback) => {
    let capturedBlob = null;

    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
    const originalCreateElement = document.createElement.bind(document);

    URL.createObjectURL = (object) => {
      if (object instanceof Blob) {
        capturedBlob = object;
      }

      return originalCreateObjectURL(object);
    };

    /*
      exportGenericHistoryExcel normally creates an <a> tag and triggers click()
      to download the Excel file. For email attachment, we want the same exported
      file but silently, so suppress only the temporary anchor click.
    */
    document.createElement = (...args) => {
      const element = originalCreateElement(...args);
      const tagName = String(args?.[0] || "").toLowerCase();

      if (tagName === "a") {
        element.click = () => {};
      }

      return element;
    };

    try {
      await downloadCallback();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.createElement = originalCreateElement;
    }

    if (!capturedBlob) {
      throw new Error("Unable to capture the Excel report generated by Download Bank Recon Report.");
    }

    return capturedBlob;
  }, []);

  const createBankReconReportExcelBlob = useCallback(async () => {
    /*
      Email Excel attachment must be exactly the same as Action >
      Download Bank Recon Report. Instead of recreating the workbook, call
      exportAllBankReconExcel() silently and capture the generated Blob before
      the browser downloads it.
    */
    const capturedBlob = await captureExcelDownloadBlob(async () => {
      await exportAllBankReconExcel(getExportAllDefaultFileName());
    });

    return await stripBomAndValidateExcelBlob(capturedBlob);
  }, [
    captureExcelDownloadBlob,
    exportAllBankReconExcel,
    getExportAllDefaultFileName,
    stripBomAndValidateExcelBlob,
  ]);

  const emailDefaultSubject = useMemo(
    () => `Bank Reconciliation Report - ${acctName || acctNo || "Bank Acct No"} - ${formatCutoffMonth(cutOff)}`,
    [acctName, acctNo, cutOff]
  );

  const emailDefaultBody = useMemo(
    () => `Good day,\n\nPlease see attached Bank Reconciliation Report.\n\nBank: ${bankCode} ${acctName ? `- ${acctName}` : ""}\nAccount No.: ${acctNo || ""}\nCut-Off: ${cutOff} ${cutOffName ? `- ${cutOffName}` : ""}\n\nAttached files:\n1. PDF Report\n2. Excel Report\n\nThank you.`,
    [bankCode, acctName, acctNo, cutOff, cutOffName]
  );

  const handleSendBankReconReportEmail = async ({ to, cc, subject, body }) => {
    const emailToList = splitEmailRecipients(to);
    const emailCcList = splitEmailRecipients(cc);
    const invalidTo = invalidEmailRecipients(to);
    const invalidCc = invalidEmailRecipients(cc);
    const emailTo = emailToList.join(",");
    const emailCc = emailCcList.join(",");
    const emailSubject = String(subject || emailDefaultSubject || "").trim();
    const emailBody = String(body || emailDefaultBody || "").trim();

    if (emailToList.length === 0) {
      useSwalErrorAlert("Required Field", "Send To email address is required.");
      return;
    }

    if (invalidTo.length > 0 || invalidCc.length > 0) {
      useSwalErrorAlert(
        "Invalid Email",
        `Please check the following email address(es):\n${[...invalidTo, ...invalidCc].join("\n")}`
      );
      return;
    }

    if (!emailSubject) {
      useSwalErrorAlert("Required Field", "Subject is required.");
      return;
    }

    if (!emailBody) {
      useSwalErrorAlert("Required Field", "Body is required.");
      return;
    }

    setIsSendingEmailReport(true);
    updateState({ isLoading: true });

    try {
      /*
        Generate attachments first using the same Download flows:
        1. PDF from Preview PDF button flow
        2. Excel from Download Bank Recon Report flow
      */
      const pdfBlob = await createBankReconReportPdfBlob();
      const excelBlob = await createBankReconReportExcelBlob();

      const maxAttachmentBytes = 7 * 1024 * 1024;
      console.log("Bank Recon email attachment sizes", {
        pdfMB: (pdfBlob.size / 1024 / 1024).toFixed(2),
        excelMB: (excelBlob.size / 1024 / 1024).toFixed(2),
      });

      if (pdfBlob.size > maxAttachmentBytes) {
        throw new Error(`PDF attachment is too large (${(pdfBlob.size / 1024 / 1024).toFixed(2)} MB). Please reduce report content or increase server upload limits.`);
      }

      if (excelBlob.size > maxAttachmentBytes) {
        throw new Error(`Excel attachment is too large (${(excelBlob.size / 1024 / 1024).toFixed(2)} MB). Please reduce report content or increase server upload limits.`);
      }

      const formData = new FormData();

      formData.append("to", emailTo);
      formData.append("cc", emailCc);
      formData.append("subject", emailSubject);
      formData.append("body", emailBody.replace(/\n/g, "<br />"));
      formData.append("attachments[]", pdfBlob, getBankReconReportFileName(".pdf"));
      formData.append("attachments[]", excelBlob, getBankReconReportFileName(".xlsx"));

      /*
        Use apiClient directly for FormData/multipart.
        postRequest is usually JSON-oriented, which can cause Laravel validation
        to receive no uploaded files and return 422.
      */
      const { data: response } = await apiClient.post("/bankRecon/emailReport", formData, {
        timeout: 120000,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response?.success === false) {
        throw new Error(response?.message || "Unable to email Bank Recon report.");
      }

      setShowEmailReportModal(false);
      useSwalSuccessAlert("Email Sent", response?.message || "Bank Reconciliation Report emailed successfully.");
    } catch (error) {
      const responseData = error?.response?.data || {};
      console.error("Bank Recon email failed", {
        status: error?.response?.status,
        data: responseData,
      });
      const validationErrors = responseData?.errors
        ? Object.values(responseData.errors).flat().join("\n")
        : "";

      const networkMessage =
        error?.message === "Network Error"
          ? "Network/CORS error. This usually happens when the upload is rejected by server size limits before Laravel can return CORS headers. Check PDF/Excel size in console and increase post_max_size/upload_max_filesize if needed."
          : "";

      useSwalErrorAlert(
        "Email Failed",
        validationErrors || responseData?.message || networkMessage || error?.message || "Unable to email Bank Reconciliation Report."
      );
    } finally {
      setIsSendingEmailReport(false);
      updateState({ isLoading: false });
    }
  };

  const tabItems = [
    { key: "checks", label: "Check Vouchers and Deposits", icon: faFileInvoiceDollar, onClick: () => updateState({ activeTab: "checks" }) },
    { key: "receipts", label: "Undeposited Receipt", icon: faFileExcel, onClick: () => updateState({ activeTab: "receipts" }) },
    { key: "jv", label: "Journal Voucher", icon: faFileLines, onClick: () => updateState({ activeTab: "jv" }) },
    { key: "summary", label: "Bank Recon Summary", icon: faWandMagicSparkles, onClick: () => updateState({ activeTab: "summary" }) },
    { key: "history", label: "History", icon: faPrint, onClick: handleHistory },
  ];

  const tabButtonClass = (tab) =>
    `inline-flex h-9 items-center justify-center gap-2 rounded-t-md border px-4 text-[12px] font-bold transition ${
      activeTab === tab
        ? "border-slate-200 border-b-white bg-white text-blue-700 shadow-sm"
        : "border-transparent bg-slate-100 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-blue-700"
    }`;

  const runAction = (handler) => {
    updateState({ showActionMenu: false });
    handler();
  };

  // =====================================================
  // H. Table cell renderers
  // =====================================================

  const renderCheckCell = (column, row, originalIndex) => {
    const style = getCheckCellStyle(column.key, getCheckFallbackWidth(column.key));
    const rowLocked = isPosted || row.stat === "F" || ["REV", "S", "X"].includes(String(row.status || "").toUpperCase());
    const rightAligned = column.renderType === "number";
    const centerAligned = ["ln", "selected"].includes(column.key);

    if (column.key === "ln") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={style}>
          {originalIndex + 1}
        </td>
      );
    }

    if (column.key === "view") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={getStickyViewStyle({ ...style, width: VIEW_COLUMN_WIDTH, minWidth: VIEW_COLUMN_WIDTH, maxWidth: VIEW_COLUMN_WIDTH })}>
          <button
            type="button"
            title="View"
            onClick={() => handleViewSourceDocument(row, ["CV", "DS"])}
            className="inline-flex h-5 w-8 items-center justify-center rounded bg-blue-500 text-white shadow-sm hover:bg-blue-600"
          >
            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
          </button>
        </td>
      );
    }

    if (column.key === "selected") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={style}>
          <input
            type="checkbox"
            checked={Boolean(row.selected)}
            disabled={rowLocked}
            onChange={(e) => handleCheckFieldChange(originalIndex, "selected", e.target.checked)}
          />
        </td>
      );
    }

    if (column.key === "status") {
      const highlightedStatus = String(row.status || "").toUpperCase() !== "O/S";
      const statusLabel = getStatusLabel(row.status);

      return (
        <td key={column.key} className={`global-tran-td-ui ${highlightedStatus ? "bg-blue-100/70" : ""}`} style={style}>
          <span
            className={`inline-flex h-7 w-full items-center rounded-md border px-2 text-[11px] font-bold ${statusClass(row.status)}`}
            title={statusLabel}
          >
            {statusLabel}
          </span>
        </td>
      );
    }

    if (column.key === "clearDate") {
      const isOutstanding = isOutstandingStatus(row.status);
      const clearDateValue = isOutstanding ? "" : toDateInput(row.clearDate);

      return (
        <td key={column.key} className="global-tran-td-ui px-2 text-xs" style={style}>
          {isOutstanding ? (
            <span className="block w-full select-none text-slate-400">
              mm/dd/yyyy
            </span>
          ) : (
            <input
              type="date"
              value={clearDateValue}
              min={cutoffDateRange.start}
              max={cutoffDateRange.end}
              disabled={rowLocked}
              onChange={(e) => handleCheckFieldChange(originalIndex, "clearDate", toMMDDYYYY(e.target.value))}
              className="h-6 w-full border-0 bg-transparent px-0 text-xs outline-none focus:ring-0 disabled:cursor-default disabled:text-slate-700"
            />
          )}
        </td>
      );
    }

    const value = formatTableValue(row, column);
    return (
      <td key={column.key} className={`global-tran-td-ui py-1 ${rightAligned ? "text-right" : centerAligned ? "text-center" : "text-left"}`} style={style} title={String(value || "")}>
        {rightAligned ? <Amount value={row?.[column.key]} /> : value}
      </td>
    );
  };

  const renderSourceDocumentCell = (column, row, originalIndex, getCellStyle, getFallbackWidth, allowedDocCodes) => {
    const style = getCellStyle(column.key, getFallbackWidth(column.key));

    if (column.key === "view") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={getStickyViewStyle({ ...style, width: VIEW_COLUMN_WIDTH, minWidth: VIEW_COLUMN_WIDTH, maxWidth: VIEW_COLUMN_WIDTH })}>
          <button
            type="button"
            title="View"
            onClick={() => handleViewSourceDocument(row, allowedDocCodes)}
            className="inline-flex h-5 w-8 items-center justify-center rounded bg-blue-500 text-white shadow-sm hover:bg-blue-600"
          >
            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
          </button>
        </td>
      );
    }

    return renderReadOnlyCell(column, row, originalIndex, getCellStyle, getFallbackWidth);
  };

  const renderReadOnlyCell = (column, row, originalIndex, getCellStyle, getFallbackWidth) => {
    const style = getCellStyle(column.key, getFallbackWidth(column.key));
    const rightAligned = column.renderType === "number";
    const centerAligned = column.key === "ln";
    const value = column.key === "ln" ? originalIndex + 1 : formatTableValue(row, column);

    return (
      <td key={column.key} className={`global-tran-td-ui py-1 ${rightAligned ? "text-right" : centerAligned ? "text-center" : "text-left"}`} style={style} title={String(value || "")}>
        {rightAligned ? <Amount value={row?.[column.key]} /> : value}
      </td>
    );
  };

  const renderSummaryCell = (column, row, originalIndex) => {
    const style = getSummaryCellStyle(column.key, getSummaryFallbackWidth(column.key));
    const rightAligned = ["integer", "number"].includes(column.renderType);
    const isUdRow = isUserDefinedSummaryRow(row);
    const editable = !isPosted && column.key !== "ln" && column.key !== "variance" && (column.key === "perBank" || isUdRow);
    const cellKey = `${originalIndex}-${column.key}`;
    const focused = focusedSummaryCell === cellKey;

    if (column.key === "view") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={getStickyViewStyle(style, { backgroundColor: isUdRow ? "#eff6ff" : "#ffffff" })}>
          {hasViewableSourceDocument(row) && (
            <button
              type="button"
              title="View"
              onClick={() => handleViewSourceDocument(row)}
              className="inline-flex h-5 w-8 items-center justify-center rounded bg-blue-500 text-white shadow-sm hover:bg-blue-600"
            >
              <FontAwesomeIcon icon={faEye} className="text-[10px]" />
            </button>
          )}
        </td>
      );
    }

    if (column.key === "ln") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={style}>
          {originalIndex + 1}
        </td>
      );
    }

    if (editable) {
      const isNumericInput = ["integer", "number"].includes(column.renderType);
      const inputType = column.renderType === "date" ? "date" : "text";
      const rawValue = row?.[column.key] ?? "";
      const value = column.renderType === "date"
        ? toDateInput(rawValue)
        : column.renderType === "integer"
          ? focused ? rawValue : String(Math.trunc(normalizeNumber(rawValue)))
          : column.renderType === "number"
            ? focused ? rawValue : formatNumber(normalizeNumber(rawValue), 2)
            : rawValue;

      return (
        <td key={column.key} className={`global-tran-td-ui py-1 ${rightAligned ? "text-right" : "text-left"}`} style={style}>
          <input
            id={`summary-${column.key}-${originalIndex}`}
            type={inputType}
            inputMode={column.renderType === "integer" ? "numeric" : column.renderType === "number" ? "decimal" : undefined}
            value={value}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (column.renderType === "integer" && !/^-?\d*$/.test(nextValue)) return;
              if (column.renderType === "number" && !/^-?\d*(\.\d{0,2})?$/.test(nextValue.replace(/,/g, ""))) return;

              handleSummaryFieldChange(
                originalIndex,
                column.key,
                column.renderType === "date" ? toMMDDYYYY(nextValue) : nextValue
              );
            }}
            onFocus={() => {
              setFocusedSummaryCell(cellKey);
              if (isNumericInput && normalizeNumber(rawValue) === 0) {
                handleSummaryFieldChange(originalIndex, column.key, "");
              }
            }}
            onBlur={(e) => {
              if (isNumericInput) {
                handleSummaryNumberBlur(originalIndex, column.key, column.renderType, e.target.value);
                return;
              }
              setFocusedSummaryCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || column.renderType !== "number") return;
              e.preventDefault();
              handleSummaryNumberBlur(originalIndex, column.key, column.renderType, e.currentTarget.value);
              focusNextSummaryInput(originalIndex, column.key);
            }}
            className={`block h-full w-full border-0 bg-transparent p-0 text-[11px] leading-[inherit] outline-none focus:bg-transparent focus:ring-0 ${rightAligned ? "text-right" : "text-left"}`}
            style={{ font: "inherit" }}
            maxLength={summaryFieldLengthMap[column.key]}
          />
        </td>
      );
    }

    const value = column.key === "variance" && isUdRow
      ? normalizeNumber(row?.perBank) - normalizeNumber(row?.perBook)
      : formatTableValue(row, column);

    return (
      <td key={column.key} className={`global-tran-td-ui py-1 ${rightAligned ? "text-right" : "text-left"}`} style={style} title={String(value || "")}>
        {column.renderType === "integer" ? value : rightAligned ? <Amount value={value} /> : value}
      </td>
    );
  };

  const renderSummaryActions = (row, originalIndex) => {
    if (isPosted || !isUserDefinedSummaryRow(row)) return null;

    return (
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          className="global-tran-td-button-add-ui"
          title="Insert row"
          onClick={() => handleAddSummaryRow(originalIndex)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
        <button
          type="button"
          className="global-tran-td-button-delete-ui"
          title="Delete row"
          onClick={() => handleDeleteSummaryRow(originalIndex)}
        >
          <FontAwesomeIcon icon={faTrashAlt} />
        </button>
      </div>
    );
  };

  const renderHistoryCell = (column, row, originalIndex) => {
    const style = getHistoryCellStyle(column.key, getHistoryFallbackWidth(column.key));

    if (column.key === "view") {
      return (
        <td key={column.key} className="global-tran-td-ui text-center" style={getStickyViewStyle({ ...style, width: VIEW_COLUMN_WIDTH, minWidth: VIEW_COLUMN_WIDTH, maxWidth: VIEW_COLUMN_WIDTH })}>
          <button
            type="button"
            title="View"
            onClick={() => handleViewHistoryRow(row)}
            className="inline-flex h-5 w-8 items-center justify-center rounded bg-blue-500 text-white shadow-sm hover:bg-blue-600"
          >
            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
          </button>
        </td>
      );
    }

    return renderReadOnlyCell(column, row, originalIndex, getHistoryCellStyle, getHistoryFallbackWidth);
  };

  const renderTableFooter = (columns, rows, getCellStyle, getFallbackWidth, label = "Total") => (
    <tfoot className="sticky bottom-0 z-[35] bg-slate-100 font-bold">
      <tr className="h-8 bg-slate-100">
        {columns.map((column, index) => {
          const isNumeric = ["integer", "number"].includes(column.renderType);
          const style = {
            ...(column.key === "__actions" ? { width: 92, minWidth: 92 } : getCellStyle(column.key, getFallbackWidth(column.key))),
            backgroundColor: "#f1f5f9",
          };
          const cellStyle = column.key === "view"
            ? getStickyViewStyle(style, { isFooter: true, backgroundColor: "#f1f5f9" })
            : style;
          const value = isNumeric
            ? rows.reduce((sum, row) => sum + normalizeNumber(row?.[column.key]), 0)
            : index === 1 || (index === 0 && columns.length === 1)
              ? `${label} (${rows.length} records)`
              : "";

          return (
            <td key={`footer-${column.key}`} className={`global-tran-td-ui py-1 ${isNumeric ? "text-right" : "text-left"}`} style={cellStyle}>
              {column.renderType === "integer" ? Math.trunc(normalizeNumber(value)) : isNumeric ? <Amount value={value} /> : value}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );

  const renderDataTable = ({
    orderedColumns,
    sortedRows,
    rows,
    renderHeader,
    renderHeaderContextMenu,
    renderCell,
    getCellStyle,
    getFallbackWidth,
    emptyText = "No records loaded.",
    onRowDoubleClick,
    renderActions,
    tableClassName = "",
    hiddenColumnKeys = [],
  }) => (
    <div className={`global-tran-table-main-div-ui ${tableClassName}`}>
      <div className="global-tran-table-main-sub-div-ui">
        <table className="min-w-full border-separate border-spacing-0 text-[11px] [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
          <thead className="global-tran-thead-div-ui z-[40]">
            <tr>
              {orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key)).map((column) => {
                const visibleColumns = orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key));

                if (column.key === "view") {
                  return (
                    <th
                      key={column.key}
                      className="global-tran-th-ui select-none text-center"
                      style={getStickyViewStyle(getCellStyle(column.key, VIEW_COLUMN_WIDTH), { isHeader: true })}
                    >
                      {column.label}
                    </th>
                  );
                }

                return renderHeader(column.label, column.key, column.width, {
                  orderedColumns: visibleColumns,
                  extraClassName: column.renderType === "number" ? "text-right" : "",
                });
              })}
              {renderActions && (
                <th className="global-tran-th-ui sticky top-0 right-0 z-30 bg-blue-100 dark:bg-blue-900" style={{ width: 92, minWidth: 92 }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="relative">
            {sortedRows.length === 0 ? (
              <tr className="global-tran-tr-ui">
                <td colSpan={orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key)).length + (renderActions ? 1 : 0)} className="global-tran-td-ui py-12 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedRows.map(({ row, originalIndex }) => {
                const manualRow = isUserDefinedSummaryRow(row);

                return (
                <tr
                  key={`${row?.sequence || row?.tranId || row?.bkCheckId || row?.bkIntransitId || row?.bkId || row?.referenceNo || "row"}-${originalIndex}`}
                  className={`global-tran-tr-ui ${manualRow ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50"}`}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key)).map((column) =>
                    renderCell
                      ? renderCell(column, row, originalIndex)
                      : renderReadOnlyCell(column, row, originalIndex, getCellStyle, getFallbackWidth)
                  )}
                  {renderActions && (
                    <td className={`global-tran-td-ui sticky right-0 text-center dark:bg-black ${manualRow ? "bg-blue-50" : "bg-white"}`} style={{ width: 92, minWidth: 92 }}>
                      {renderActions(row, originalIndex)}
                    </td>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
          {renderTableFooter(
            renderActions
              ? [...orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key)), { key: "__actions", label: "Actions", renderType: "text", width: 92 }]
              : orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key)),
            rows,
            getCellStyle,
            getFallbackWidth
          )}
        </table>
        {renderHeaderContextMenu()}
      </div>
    </div>
  );

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && (
        <div className="fixed inset-0 z-[1000003] flex flex-col items-center justify-center bg-white/45 backdrop-blur-[1px]">
          <LoadingSpinner />
          <div className="mt-3 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow">
            Processing, please wait...
          </div>
        </div>
      )}

      <div className="global-ref-header-ui" style={{ zIndex: 45 }}>
        <div className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <h1 className="global-ref-headertext-ui w-full sm:w-auto truncate text-center sm:text-left">
                Bank Reconciliation
              </h1>
            </div>
          </div>

          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
              <div className="flex h-10 min-w-[112px] flex-col items-center justify-center rounded-md bg-blue-100 px-3 py-1 text-center shadow-sm">
                <span className="text-xs font-bold leading-tight text-slate-600">
                  Transaction Status
                </span>
                <span className={`text-[16px] font-extrabold leading-tight ${isPosted ? "text-blue-700" : "text-slate-900"}`}>
                  {bankReconDisplayStatus}
                </span>
              </div>
              <ActionButton icon={faMagnifyingGlass} onClick={handleLoad} disabled={isLoading || isPosted}>
                Find
              </ActionButton>
              <ActionButton icon={faUndo} onClick={handleReset} disabled={isLoading}>
                Reset
              </ActionButton>
              <ActionButton icon={faFileLines} onClick={handleGenerateBankRecon} disabled={isLoading || isPosted}>
                Generate
              </ActionButton>
              <ActionButton
                icon={faFloppyDisk}
                onClick={activeTab === "checks" ? handleSaveCheck : handleSaveBankRecon}
                disabled={isLoading || isPosted}
              >
                Save
              </ActionButton>

              <div
                className={`relative shrink-0 ${showActionMenu ? "z-[130]" : ""}`}
                ref={actionMenuRef}
                onClick={(event) => event.stopPropagation()}
              >
                <ActionButton
                  icon={faChevronDown}
                  onClick={(event) => {
                    event?.stopPropagation?.();
                    updateState({ showActionMenu: !showActionMenu });
                  }}
                  disabled={isLoading}
                >
                  Action
                </ActionButton>

              {showActionMenu && (
                <div className="absolute right-0 z-[140] mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                        Bank Recon Actions
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                        {bankCode || "No Bank"} {cutOff ? `- ${cutOff}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateState({ showActionMenu: false })}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      title="Close"
                      aria-label="Close actions menu"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-[11px]" />
                    </button>
                  </div>

                  <div className="py-1">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Posting
                    </div>

                    <button
                      type="button"
                      onClick={() => runAction(handlePost)}
                      disabled={!canPostOrClearBankRecon}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                        <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">Post Bank Recon</span>
                        <span className="block text-[10px] font-medium text-slate-400">Finalize this reconciliation</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => runAction(handleUnpost)}
                      disabled={!isPosted}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                        <FontAwesomeIcon icon={faUnlock} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">Unpost Bank Recon</span>
                        <span className="block text-[10px] font-medium text-slate-400">Reopen the posted record</span>
                      </span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Reports
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        updateState({ showActionMenu: false });
                        setIsBankReconReportMaximized(false);
                        setShowBankReconReportModal(true);
                      }}
                      disabled={!bkId || !exportAllHasRows}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                        <FontAwesomeIcon icon={faPrint} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">View Report Preview</span>
                        <span className="block text-[10px] font-medium text-slate-400">Open printable report modal</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        updateState({ showActionMenu: false });
                        setShowEmailReportModal(true);
                      }}
                      disabled={!bkId || !exportAllHasRows}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                        <FontAwesomeIcon icon={faEnvelope} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">Email Report</span>
                        <span className="block text-[10px] font-medium text-slate-400">Attach PDF and Excel</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openExportModal("excel_all")}
                      disabled={!exportAllHasRows}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                        <FontAwesomeIcon icon={faFileExcel} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">Download Excel Report</span>
                        <span className="block text-[10px] font-medium text-slate-400">Export full workbook</span>
                      </span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Maintenance
                    </div>

                    <button
                      type="button"
                      onClick={() => runAction(handleClear)}
                      disabled={!canPostOrClearBankRecon}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 group-disabled:bg-slate-100 group-disabled:text-slate-400">
                        <FontAwesomeIcon icon={faBroom} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">Clear Working Details</span>
                        <span className="block text-[10px] font-medium text-slate-400">Delete current working rows</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 space-y-3 px-1 sm:mt-24">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-[12px] font-semibold tracking-[0.08em] uppercase text-blue-600">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[11px] text-blue-600">
                <FontAwesomeIcon icon={faFileLines} />
              </span>
              <span>Cut-Off Period</span>
            </div>

            <div className="grid grid-cols-1 gap-3 px-4 pt-2 md:grid-cols-2">
              <FieldRenderer
                type="lookup"
                label="Cut-Off"
                required
                value={cutOff}
                onLookup={() => updateState({ showCutoffModal: true })}
                onClear={() => updateState({ cutOff: "", cutOffName: "", bkId: "" })}
                disabled={isLoading}
              />
              <FieldRenderer
                label="Cut-Off Name"
                value={cutOffName}
                readOnly
                disabled
              />
            </div>

            <div className="mx-4 mb-4 mt-3 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between text-[12px] font-bold">
                <span className="text-slate-600">Selected Period</span>
                <span className="text-blue-700">{cutOffName || cutOff || "-"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-[12px] font-semibold tracking-[0.08em] uppercase text-blue-600">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[11px] text-blue-600">
                <FontAwesomeIcon icon={faBuildingColumns} />
              </span>
              <span>Bank Information</span>
            </div>

            <div className="grid grid-cols-1 gap-3 px-4 pt-2 md:grid-cols-2">
              <FieldRenderer
                type="lookup"
                label="Bank Code"
                required
                value={bankCode}
                onLookup={() => updateState({ showBankModal: true })}
                onClear={() => updateState({ bankCode: "", acctNo: "", acctName: "", bkId: "" })}
                disabled={isLoading}
              />
              <FieldRenderer
                label="Bank Account"
                value={acctName || acctNo}
                readOnly
                disabled
              />
            </div>

            <div className="mx-4 mb-4 mt-3 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between text-[12px] font-bold">
                <span className="text-slate-600">Selected Bank</span>
                <span className="text-blue-700">{acctName || acctNo || bankCode || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Deposits"
            icon={faBuildingColumns}
            accent="text-emerald-600"
            rows={[
              { label: "Cleared", value: totals.totalDepositCL },
              { label: "Outstanding", value: totals.totalDepositOS },
              { label: "Total", value: totals.totalDeposit, strong: true, valueClass: "text-blue-700" },
            ]}
          />
          <SummaryCard
            title="Disbursements"
            icon={faMoneyBillTransfer}
            accent="text-blue-600"
            rows={[
              { label: "Cleared", value: totals.totalDisbCL },
              { label: "Outstanding", value: totals.totalDisbOS },
              { label: "Total", value: totals.totalDisb, strong: true, valueClass: "text-blue-700" },
            ]}
          />
          <SummaryCard
            title="Adjustments"
            icon={faCircleNodes}
            accent="text-violet-600"
            rows={[
              { label: "JVs / Adjustments", value: totals.totalAdjustment },
              { label: "Undeposited Receipts", value: totals.totalUndeposit },
              { label: "Reversed / Staled", value: totals.totalReversed },
            ]}
          />
          <SummaryCard
            title="Final Reconciliation"
            icon={faScaleBalanced}
            accent="text-orange-600"
            rows={[
              { label: "Per Bank", value: totals.totalPerBank },
              { label: "Per Book", value: totals.totalPerBook },
              {
                label: "Variance",
                value: totals.variance,
                strong: true,
                valueClass: hasReconVariance ? "text-rose-700 animate-pulse" : "text-blue-700",
              },
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-wrap gap-1 px-3 pt-3">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={tab.onClick}
                  className={tabButtonClass(tab.key)}
                >
                  <FontAwesomeIcon icon={tab.icon} className="text-[12px]" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 px-3 py-2">
              {activeTab === "checks" && (
                <>
                  <ActionButton
                    onClick={handleToggleSelectAllChecks}
                    variant="soft"
                    disabled={isLoading || isPosted || checkRows.length === 0}
                  >
                    {areAllSelectableChecksSelected ? "Unselect All" : "Select All"}
                  </ActionButton>
                  <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600">
                    <span>Default Clear Date:</span>
                    <input
                      type="date"
                      value={toDateInput(defaultClearDate)}
                      min={cutoffDateRange.start}
                      max={cutoffDateRange.end}
                      disabled={isPosted}
                      onChange={(e) => handleDefaultClearDateChange(e.target.value)}
                      className="h-6 rounded border border-slate-200 px-2 text-[11px] disabled:bg-slate-100"
                    />
                  </label>
                </>
              )}
              {activeTab === "bankstmt" && (
                <>
                  <ActionButton icon={faFileExcel} variant="soft" disabled>
                    Download Template
                  </ActionButton>
                  <ActionButton icon={faUpload} variant="soft" disabled>
                    Upload Statement
                  </ActionButton>
                </>
              )}
              <div
                className={`relative ${showTableActionMenu ? "z-[130]" : ""}`}
                ref={tableActionMenuRef}
                onClick={(event) => event.stopPropagation()}
              >
                <ActionButton
                  icon={faFileExport}
                  variant="soft"
                  disabled={!activeTableHasRows}
                  onClick={(event) => {
                    event?.stopPropagation?.();
                    if (!activeTableHasRows) return;
                    setShowTableActionMenu((open) => !open);
                    updateState({ showActionMenu: false });
                  }}
                  title="Columns and Export"
                >
                  Table Tools
                </ActionButton>

                {showTableActionMenu && activeTableHasRows && (
                  <div className="absolute right-0 z-[140] mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                          Table Tools
                        </div>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                          {activeTableConfig.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTableActionMenu(false)}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                        title="Close"
                        aria-label="Close table tools menu"
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-[11px]" />
                      </button>
                    </div>

                    <div className="py-1">
                      <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        Display
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowColumnChooser(true);
                          setShowTableActionMenu(false);
                        }}
                        className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                          <FontAwesomeIcon icon={faColumns} className="text-[11px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block">Manage Columns</span>
                          <span className="block text-[10px] font-medium text-slate-400">Show or hide table fields</span>
                        </span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        Export Current Tab
                      </div>

                      <button
                        type="button"
                        onClick={() => openExportModal("excel")}
                        className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                          <FontAwesomeIcon icon={faFileExcel} className="text-[11px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block">Export Excel</span>
                          <span className="block text-[10px] font-medium text-slate-400">Download current tab as Excel</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openExportModal("pdf")}
                        className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100">
                          <FontAwesomeIcon icon={faFilePdf} className="text-[11px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block">Export PDF</span>
                          <span className="block text-[10px] font-medium text-slate-400">Download current tab as PDF</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openExportModal("csv")}
                        className="group flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-800"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200">
                          <FontAwesomeIcon icon={faFileCsv} className="text-[11px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block">Export CSV</span>
                          <span className="block text-[10px] font-medium text-slate-400">Download current tab as CSV</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showColumnChooser && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-3 py-3">
              <div className="flex max-h-[60vh] w-full max-w-[480px] flex-col overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/10">
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">
                      Manage Columns - {activeTableConfig.title}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Choose the columns to display in the table.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="h-6 w-6 shrink-0 text-slate-500 hover:text-red-600"
                    onClick={() => {
                      setShowColumnChooser(false);
                      setColumnChooserSearch("");
                    }}
                    title="Close"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-sm" />
                  </button>
                </div>

                <div className="border-b border-gray-200 px-3 py-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={columnChooserSearch}
                      onChange={(e) => setColumnChooserSearch(e.target.value)}
                      placeholder="Search columns..."
                      className="h-7 min-w-0 flex-1 rounded-md border border-gray-300 px-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      className="h-7 rounded-md border border-gray-300 px-2 text-[11px] font-medium text-slate-600 hover:bg-gray-50"
                      onClick={() => {
                        setHiddenColumnsByTab((prev) => ({ ...prev, [activeTab]: [] }));
                        setColumnChooserSearch("");
                      }}
                    >
                      Restore
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
                  <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    {filteredChooserColumns.map((column) => (
                      <label
                        key={column.key}
                        className="flex h-7 items-center gap-1.5 rounded border border-gray-200 bg-white px-2 text-[11px] text-slate-800 shadow-sm cursor-pointer select-none hover:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3 shrink-0 accent-blue-600"
                          checked={!activeHiddenColumns.includes(column.key)}
                          onChange={(e) => toggleActiveColumnVisibility(column.key, e.target.checked)}
                        />
                        <span className="min-w-0 flex-1 truncate">{column.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 px-3 py-2">
                  <button
                    type="button"
                    className="h-7 min-w-[72px] rounded-md bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700"
                    onClick={() => {
                      setShowColumnChooser(false);
                      setColumnChooserSearch("");
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-[420px] p-3">
            {activeTab === "checks" && (
              renderDataTable({
                columns: checkColumns,
                orderedColumns: orderedCheckColumns,
                sortedRows: sortedCheckRows,
                rows: checkRows,
                renderHeader: renderCheckHeader,
                renderHeaderContextMenu: renderCheckHeaderContextMenu,
                renderCell: renderCheckCell,
                getCellStyle: getCheckCellStyle,
                getFallbackWidth: getCheckFallbackWidth,
                hiddenColumnKeys: activeHiddenColumns,
              })
            )}

            {activeTab === "receipts" && (
              renderDataTable({
                columns: receiptColumns,
                orderedColumns: orderedReceiptColumns,
                sortedRows: sortedReceiptRows,
                rows: receiptRows,
                renderHeader: renderReceiptHeader,
                renderHeaderContextMenu: renderReceiptHeaderContextMenu,
                renderCell: (column, row, originalIndex) =>
                  renderSourceDocumentCell(column, row, originalIndex, getReceiptCellStyle, getReceiptFallbackWidth, ["AR", "CR"]),
                getCellStyle: getReceiptCellStyle,
                getFallbackWidth: getReceiptFallbackWidth,
                hiddenColumnKeys: activeHiddenColumns,
              })
            )}

            {activeTab === "jv" && (
              renderDataTable({
                columns: journalColumns,
                orderedColumns: orderedJournalColumns,
                sortedRows: sortedJournalRows,
                rows: journalRows,
                renderHeader: renderJournalHeader,
                renderHeaderContextMenu: renderJournalHeaderContextMenu,
                renderCell: (column, row, originalIndex) =>
                  renderSourceDocumentCell(column, row, originalIndex, getJournalCellStyle, getJournalFallbackWidth, ["JV"]),
                getCellStyle: getJournalCellStyle,
                getFallbackWidth: getJournalFallbackWidth,
                hiddenColumnKeys: activeHiddenColumns,
              })
            )}

            {activeTab === "summary" && (
              <>
                {renderDataTable({
                  columns: summaryColumns,
                  orderedColumns: orderedSummaryColumns,
                  sortedRows: sortedSummaryRows,
                  rows: summaryRows,
                  renderHeader: renderSummaryHeader,
                  renderHeaderContextMenu: renderSummaryHeaderContextMenu,
                  renderCell: renderSummaryCell,
                  renderActions: summaryRows.some(isUserDefinedSummaryRow) ? renderSummaryActions : null,
                  getCellStyle: getSummaryCellStyle,
                  getFallbackWidth: getSummaryFallbackWidth,
                  hiddenColumnKeys: activeHiddenColumns,
                })}
                <div className="global-tran-tab-footer-main-div-ui">
                  <div className="global-tran-tab-footer-button-div-ui">
                    <button
                      type="button"
                      onClick={() => handleAddSummaryRow()}
                      className="global-tran-tab-footer-button-add-ui"
                      style={{ visibility: isPosted ? "hidden" : "visible" }}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "bankstmt" && (
              <div className="space-y-3">
                
                {renderDataTable({
                  columns: bankStmtColumns,
                  orderedColumns: orderedBankStmtColumns,
                  sortedRows: sortedBankStmtRows,
                  rows: bankStmtRows,
                  renderHeader: renderBankStmtHeader,
                  renderHeaderContextMenu: renderBankStmtHeaderContextMenu,
                  getCellStyle: getBankStmtCellStyle,
                  getFallbackWidth: getBankStmtFallbackWidth,
                  hiddenColumnKeys: activeHiddenColumns,
                })}
              </div>
            )}

            {activeTab === "history" && (
              renderDataTable({
                columns: historyColumns,
                orderedColumns: orderedHistoryColumns,
                sortedRows: sortedHistoryRows,
                rows: historyRows,
                renderHeader: renderHistoryHeader,
                renderHeaderContextMenu: renderHistoryHeaderContextMenu,
                renderCell: renderHistoryCell,
                getCellStyle: getHistoryCellStyle,
                getFallbackWidth: getHistoryFallbackWidth,
                onRowDoubleClick: handleViewHistoryRow,
                hiddenColumnKeys: activeHiddenColumns,
              })
            )}
          </div>
        </div>
      </div>

      <BankMastLookupModal
        isOpen={showBankModal}
        onClose={handleBankClose}
        title="Select Bank Account"
      />

      <CutoffLookupModal
        isOpen={showCutoffModal}
        onClose={handleCutoffClose}
        source="BK"
        customParam="NonFuture"
        title="Search Cut-Off"
      />

      {showBankReconReportModal && (
        <div className={`fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 ${isBankReconReportMaximized ? "p-0" : "p-4"}`}>
          <div
            className={`flex flex-col overflow-hidden bg-white shadow-2xl transition-all ${
              isBankReconReportMaximized
                ? "h-[100vh] w-[100vw] rounded-none"
                : "h-[88vh] w-[96vw] max-w-7xl rounded-2xl"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Bank Reconciliation Report Preview</h2>
                <p className="text-xs text-slate-500">
                  {bankCode} {acctName ? `- ${acctName}` : ""} / {reportPeriodLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton icon={faPrint} onClick={handlePrintBankReconReport}>
                  Print
                </ActionButton>
                <ActionButton icon={faFilePdf} onClick={handleDownloadBankReconReportPdf} disabled={isLoading}>
                  {isLoading ? "Generating PDF..." : "PDF"}
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setIsBankReconReportMaximized((prev) => !prev)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                  title={isBankReconReportMaximized ? "Restore" : "Maximize"}
                >
                  <FontAwesomeIcon icon={isBankReconReportMaximized ? faCompress : faExpand} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsBankReconReportMaximized(false);
                    setShowBankReconReportModal(false);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  title="Close"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
              <div ref={reportPreviewRef} className="mx-auto w-full max-w-[1180px] rounded-xl bg-white p-6 text-[12px] shadow" style={{ fontFamily: REPORT_FONT_FAMILY }}>
                <div className="flex items-start justify-between border-b-2 border-blue-600 pb-3">
                  <div>
                    <div className="text-lg font-extrabold text-blue-900">{companyInfo?.compName || "NAYSA Financials"}</div>
                    <div className="text-xs text-slate-500">{companyInfo?.compAddr || ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-slate-900">Bank Reconciliation Report</div>
                    <div className="text-xs text-slate-500">For the period ended {reportPeriodLabel}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bank Account</div>
                    <div className="mt-1 font-bold text-slate-900">{bankCode} {acctName ? `- ${acctName}` : ""}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Account No.</div>
                    <div className="mt-1 font-bold text-slate-900">{acctNo || "-"}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cut-Off</div>
                    <div className="mt-1 font-bold text-slate-900">{cutOff} {cutOffName ? `- ${cutOffName}` : ""}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</div>
                    <div className="mt-1 font-bold text-slate-900">{bankReconDisplayStatus}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    title="Deposits"
                    icon={faBuildingColumns}
                    accent="text-emerald-600"
                    rows={[
                      { label: "Cleared", value: totals.totalDepositCL },
                      { label: "Outstanding", value: totals.totalDepositOS },
                      { label: "Total", value: totals.totalDeposit, strong: true, valueClass: "text-blue-700" },
                    ]}
                  />
                  <SummaryCard
                    title="Disbursements"
                    icon={faMoneyBillTransfer}
                    accent="text-blue-600"
                    rows={[
                      { label: "Cleared", value: totals.totalDisbCL },
                      { label: "Outstanding", value: totals.totalDisbOS },
                      { label: "Total", value: totals.totalDisb, strong: true, valueClass: "text-blue-700" },
                    ]}
                  />
                  <SummaryCard
                    title="Adjustments"
                    icon={faCircleNodes}
                    accent="text-violet-600"
                    rows={[
                      { label: "JVs / Adjustments", value: totals.totalAdjustment },
                      { label: "Undeposited Receipts", value: totals.totalUndeposit },
                      { label: "Reversed / Staled", value: totals.totalReversed },
                    ]}
                  />
                  <SummaryCard
                    title="Final Reconciliation"
                    icon={faScaleBalanced}
                    accent="text-orange-600"
                    rows={[
                      { label: "Per Bank", value: totals.totalPerBank },
                      { label: "Per Book", value: totals.totalPerBook },
                      {
                        label: "Variance",
                        value: totals.variance,
                        strong: true,
                        valueClass: hasReconVariance ? "text-rose-700 animate-pulse" : "text-blue-700",
                      },
                    ]}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-[12px] font-semibold tracking-[0.08em] uppercase text-blue-600">
                    Outstanding Summary
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-100 bg-white p-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-slate-600">Outstanding Checks</span>
                        <Amount value={outstandingCheckReportTotal} className="font-extrabold text-blue-700" />
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">
                        {outstandingCheckReportRows.length} record(s)
                      </div>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-white p-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-slate-600">Outstanding Deposits</span>
                        <Amount value={outstandingDepositReportTotal} className="font-extrabold text-blue-700" />
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">
                        {outstandingDepositReportRows.length} record(s)
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-500">
                    Detailed outstanding checks and deposits are available in the Check Vouchers and Deposits tab and Excel report.
                  </div>
                </div>

                <div className="bank-recon-report-footer mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 overflow-visible">
                  <div className="grid gap-3 text-[11px] text-slate-600 md:grid-cols-3">
                    <div>
                      <div className="font-bold uppercase tracking-wide text-slate-700">Prepared By</div>
                      <div className="mt-4 border-t border-slate-300 pt-1 text-center font-semibold text-slate-700">
                        {currentUserRow?.userName || currentUserRow?.USER_NAME || currentUserRow?.name || currentUserRow?.userCode || " "}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase tracking-wide text-slate-700">Reviewed By</div>
                      <div className="mt-4 border-t border-slate-300 pt-1 text-center font-semibold text-slate-700">
                        &nbsp;
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase tracking-wide text-slate-700">Approved By</div>
                      <div className="mt-4 border-t border-slate-300 pt-1 text-center font-semibold text-slate-700">
                        &nbsp;
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
                    <span>Generated from NAYSA Financials Cloud - Bank Reconciliation</span>
                    <span>{new Date().toLocaleString("en-US")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 bg-white"
        style={{ left: "-10000px", width: "1180px" }}
      >
              <div ref={hiddenReportPreviewRef} className="w-[1180px] bg-white p-6 text-[12px]" style={{ fontFamily: REPORT_FONT_FAMILY }}>
                <div className="flex items-start justify-between border-b-2 border-blue-600 pb-3">
                  <div>
                    <div className="text-lg font-extrabold text-blue-900">{companyInfo?.compName || "NAYSA Financials"}</div>
                    <div className="text-xs text-slate-500">{companyInfo?.compAddr || ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-slate-900">Bank Reconciliation Report</div>
                    <div className="text-xs text-slate-500">For the period ended {reportPeriodLabel}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bank Account</div>
                    <div className="mt-1 font-bold text-slate-900">{bankCode} {acctName ? `- ${acctName}` : ""}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Account No.</div>
                    <div className="mt-1 font-bold text-slate-900">{acctNo || "-"}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cut-Off</div>
                    <div className="mt-1 font-bold text-slate-900">{cutOff} {cutOffName ? `- ${cutOffName}` : ""}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</div>
                    <div className="mt-1 font-bold text-slate-900">{bankReconDisplayStatus}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    title="Deposits"
                    icon={faBuildingColumns}
                    accent="text-emerald-600"
                    rows={[
                      { label: "Cleared", value: totals.totalDepositCL },
                      { label: "Outstanding", value: totals.totalDepositOS },
                      { label: "Total", value: totals.totalDeposit, strong: true, valueClass: "text-blue-700" },
                    ]}
                  />
                  <SummaryCard
                    title="Disbursements"
                    icon={faMoneyBillTransfer}
                    accent="text-blue-600"
                    rows={[
                      { label: "Cleared", value: totals.totalDisbCL },
                      { label: "Outstanding", value: totals.totalDisbOS },
                      { label: "Total", value: totals.totalDisb, strong: true, valueClass: "text-blue-700" },
                    ]}
                  />
                  <SummaryCard
                    title="Adjustments"
                    icon={faCircleNodes}
                    accent="text-violet-600"
                    rows={[
                      { label: "JVs / Adjustments", value: totals.totalAdjustment },
                      { label: "Undeposited Receipts", value: totals.totalUndeposit },
                      { label: "Reversed / Staled", value: totals.totalReversed },
                    ]}
                  />
                  <SummaryCard
                    title="Final Reconciliation"
                    icon={faScaleBalanced}
                    accent="text-orange-600"
                    rows={[
                      { label: "Per Bank", value: totals.totalPerBank },
                      { label: "Per Book", value: totals.totalPerBook },
                      {
                        label: "Variance",
                        value: totals.variance,
                        strong: true,
                        valueClass: hasReconVariance ? "text-rose-700 animate-pulse" : "text-blue-700",
                      },
                    ]}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-[12px] font-semibold tracking-[0.08em] uppercase text-blue-600">
                    Outstanding Summary
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-100 bg-white p-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-slate-600">Outstanding Checks</span>
                        <Amount value={outstandingCheckReportTotal} className="font-extrabold text-blue-700" />
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">
                        {outstandingCheckReportRows.length} record(s)
                      </div>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-white p-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-slate-600">Outstanding Deposits</span>
                        <Amount value={outstandingDepositReportTotal} className="font-extrabold text-blue-700" />
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">
                        {outstandingDepositReportRows.length} record(s)
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-500">
                    Detailed outstanding checks and deposits are available in the Check Vouchers and Deposits tab and Excel report.
                  </div>
                </div>

                <div className="bank-recon-report-footer mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 overflow-visible">
                  <div className="grid gap-3 text-[11px] text-slate-600 md:grid-cols-3">
                    <div>
                      <div className="font-bold uppercase tracking-wide text-slate-700">Prepared By</div>
                      <div className="mt-4 border-t border-slate-300 pt-1 text-center font-semibold text-slate-700">
                        {currentUserRow?.userName || currentUserRow?.USER_NAME || currentUserRow?.name || currentUserRow?.userCode || " "}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase tracking-wide text-slate-700">Reviewed By</div>
                      <div className="mt-4 border-t border-slate-300 pt-1 text-center font-semibold text-slate-700">
                        &nbsp;
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase tracking-wide text-slate-700">Approved By</div>
                      <div className="mt-4 border-t border-slate-300 pt-1 text-center font-semibold text-slate-700">
                        &nbsp;
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
                    <span>Generated from NAYSA Financials Cloud - Bank Reconciliation</span>
                    <span>{new Date().toLocaleString("en-US")}</span>
                  </div>
                </div>
              </div>
      </div>

      <SearchGlobalEmail
        isOpen={showEmailReportModal}
        title="Email Bank Recon Report"
        subtitle="PDF and Excel files will be generated and attached automatically."
        attachmentNote="Attachments: Bank Reconciliation PDF and Excel report file will be created after clicking Send Email."
        defaultSubject={emailDefaultSubject}
        defaultBody={emailDefaultBody}
        isSending={isSendingEmailReport}
        onClose={() => setShowEmailReportModal(false)}
        onSend={handleSendBankReconReportEmail}
      />

      <ExportFileNameModal
        isOpen={exportModal.isOpen}
        title={exportModal.title}
        defaultFileName={exportModal.defaultFileName}
        confirmText={exportModal.confirmText}
        onClose={closeExportModal}
        onConfirm={handleExportConfirm}
      />

      <PasswordConfirmationModal
        isOpen={passwordConfirmModal.isOpen}
        title={passwordConfirmModal.title}
        message={passwordConfirmModal.message}
        confirmText={passwordConfirmModal.confirmText}
        confirmClassName={passwordConfirmModal.confirmClassName}
        onClose={handlePasswordConfirmClose}
      />
    </div>
  );
};

export default BankReconProcessing1;
